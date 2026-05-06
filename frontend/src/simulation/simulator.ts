import { Agent, MetricsSnapshot, Order, Point, Weights, DeliveryTask, TaskPhase } from "./types";
import { GRID_SIZE, makeStreamingOrders, normalizeLocation } from "./mockData";
import { scoreCandidate, estimateTravelMinutes, orderDeadlineMs } from "./scoring";

const GRID_MINUTES_PER_UNIT = 3.0;
const DELIVERY_BUFFER_MS = 10 * 60_000;

type OrderLike = Pick<Order, "order_id" | "priority" | "createdAtMs" | "prepTimeMs" | "slaMinutes" | "deliveryBufferMs" | "location">;

function clonePoint(p: Point): Point {
  return { x: p.x, y: p.y };
}

function euclidean(a: Point, b: Point) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function travelDelayFactor(agentId: string, orderId: string, nowMs: number) {
  // Deterministic-ish factor: stable between runs for the same IDs, with time perturbation.
  const seedish = (agentId.charCodeAt(agentId.length - 1) * 997 + orderId.charCodeAt(orderId.length - 1) * 491) % 1000;
  const base = 1.0 + (seedish / 1000) * 0.25;
  const rush = new Set([9, 10, 11, 18, 19]);
  const peak = rush.has(new Date(nowMs).getHours()) ? 1.25 : 1.0;
  return base * peak;
}

class PendingOrdersHeap {
  // Higher priority first: high > normal > low. FIFO within same priority.
  private heap: Array<{ priority: number; createdAtMs: number; orderId: string }> = [];

  constructor(private readonly getPriority: (orderId: string) => number) {}

  private less(i: number, j: number) {
    // return true if heap[i] should be above heap[j]
    const a = this.heap[i];
    const b = this.heap[j];
    if (a.priority !== b.priority) return a.priority > b.priority;
    return a.createdAtMs < b.createdAtMs;
  }

  push(orderId: string, priority: number, createdAtMs: number) {
    this.heap.push({ orderId, priority, createdAtMs });
    this.bubbleUp(this.heap.length - 1);
  }

  pop(): string | undefined {
    if (!this.heap.length) return undefined;
    const top = this.heap[0];
    const last = this.heap.pop()!;
    if (this.heap.length) {
      this.heap[0] = last;
      this.bubbleDown(0);
    }
    return top.orderId;
  }

  size() {
    return this.heap.length;
  }

  private bubbleUp(idx: number) {
    let i = idx;
    while (i > 0) {
      const p = Math.floor((i - 1) / 2);
      if (!this.less(i, p)) break;
      const tmp = this.heap[i];
      this.heap[i] = this.heap[p];
      this.heap[p] = tmp;
      i = p;
    }
  }

  private bubbleDown(idx: number) {
    let i = idx;
    while (true) {
      const left = i * 2 + 1;
      const right = i * 2 + 2;
      let best = i;

      if (left < this.heap.length && this.less(left, best)) best = left;
      if (right < this.heap.length && this.less(right, best)) best = right;

      if (best === i) break;
      const tmp = this.heap[i];
      this.heap[i] = this.heap[best];
      this.heap[best] = tmp;
      i = best;
    }
  }
}

export interface SimulatorSnapshot {
  simNowMs: number;
  orders: Order[];
  agents: Agent[];
  assignmentLog: Array<{ tsMs: number; message: string }>;
  pendingCount: number;
  metrics: MetricsSnapshot;
}

export class SimulatorEngine {
  private simNowMs: number;

  private ordersStream: Array<Order>;
  private ordersById: Map<string, Order> = new Map();
  private pendingHeap: PendingOrdersHeap;
  private pendingSet: Set<string> = new Set();

  private agents: Agent[];
  private assignmentLog: Array<{ tsMs: number; message: string }> = [];

  constructor(params: {
    agents: Agent[];
    streamedOrders?: Array<OrderLike>;
    nowStartMs?: number;
    dynamicDelay?: boolean;
    weights: Weights;
  }) {
    const dynamicDelay = params.dynamicDelay ?? true;
    const nowStartMs = params.nowStartMs ?? (params.streamedOrders?.[0]?.createdAtMs ?? Date.now());

    this.agents = params.agents.map((a) => ({
      ...a,
      position: clonePoint(a.baseLocation),
      tasks: [],
      cumulativeAssignments: a.cumulativeAssignments ?? 0
    }));

    const rawOrders = params.streamedOrders ?? makeStreamingOrders();
    // Map to full Order objects used in simulation.
    const orders: Order[] = rawOrders.map((o) => {
      const slaMinutes = (o as any).slaMinutes as number;
      const deliveryBufferMs = (o as any).deliveryBufferMs ?? DELIVERY_BUFFER_MS;
      return {
        order_id: o.order_id,
        priority: o.priority as any,
        createdAtMs: o.createdAtMs,
        prepTimeMs: o.prepTimeMs,
        location: normalizeLocation(o.location),
        slaMinutes,
        deliveryBufferMs,
        status: "unassigned"
      };
    });

    // Ensure createdAtMs sorted (streaming).
    orders.sort((a, b) => a.createdAtMs - b.createdAtMs);
    this.ordersStream = orders;
    this.ordersStream.forEach((o) => this.ordersById.set(o.order_id, o));

    this.simNowMs = nowStartMs;
    // Index into streaming orders that haven't been enqueued.
    this.nextOrderIndex = 0;
    while (this.nextOrderIndex < this.ordersStream.length && this.ordersStream[this.nextOrderIndex].createdAtMs < this.simNowMs) {
      // If we start after some arrivals, enqueue them immediately.
      this.enqueueOrderIfNeeded(this.ordersStream[this.nextOrderIndex]);
      this.nextOrderIndex++;
    }

    this.pendingHeap = new PendingOrdersHeap((orderId) => {
      const order = this.ordersById.get(orderId)!;
      return order.priority === "high" ? 3 : order.priority === "low" ? 1 : 2;
    });

    this.dynamicDelay = dynamicDelay;
    this.weights = params.weights;
  }

  private nextOrderIndex: number;
  private dynamicDelay: boolean;
  private weights: Weights;

  setWeights(weights: Weights) {
    this.weights = weights;
  }

  setDynamicDelay(dynamicDelay: boolean) {
    this.dynamicDelay = dynamicDelay;
  }

  private enqueueOrderIfNeeded(order: Order) {
    if (order.status !== "unassigned") return;
    if (this.pendingSet.has(order.order_id)) return;

    const priority = order.priority === "high" ? 3 : order.priority === "low" ? 1 : 2;
    this.pendingHeap.push(order.order_id, priority, order.createdAtMs);
    this.pendingSet.add(order.order_id);
  }

  private updateTasksAndPositions(nowMs: number) {
    for (const agent of this.agents) {
      // Remove completed tasks and deliver orders at their travel end time.
      // We'll handle delivery in a separate loop that checks task travelEndMs.
      let activePosition: Point | null = null;

      if (agent.tasks.length) {
        // Choose the earliest finishing traveling task to position the agent.
        const travelingTasks = agent.tasks.filter((t) => nowMs >= t.travelStartMs && nowMs < t.travelEndMs);
        if (travelingTasks.length) {
          travelingTasks.sort((a, b) => a.travelEndMs - b.travelEndMs);
          const t = travelingTasks[0];
          const p = (nowMs - t.travelStartMs) / Math.max(1, t.travelMs);
          const clamped = Math.max(0, Math.min(1, p));
          activePosition = { x: t.from.x + (t.to.x - t.from.x) * clamped, y: t.from.y + (t.to.y - t.from.y) * clamped };
        } else {
          // Not currently traveling: agent stays at its last known position.
          activePosition = null;
        }
      }

      if (activePosition) agent.position = activePosition;
    }
  }

  private deliverDueOrders(nowMs: number) {
    for (const agent of this.agents) {
      const remainingTasks: DeliveryTask[] = [];
      for (const task of agent.tasks) {
        if (nowMs >= task.travelEndMs) {
          const order = this.ordersById.get(task.orderId);
          if (order && order.status !== "delivered") {
            order.status = "delivered";
            order.deliveredAtMs = task.travelEndMs;
            this.assignmentLog.push({
              tsMs: task.travelEndMs,
              message: `Delivered ${order.order_id} by ${agent.agent_id}`
            });
          }
          // Agent position jumps to destination at delivery.
          agent.position = { x: task.to.x, y: task.to.y };
        } else {
          remainingTasks.push(task);
        }
      }
      agent.tasks = remainingTasks;
    }
  }

  private assignPendingOrders(nowMs: number) {
    // Greedy: repeatedly assign best-scoring (order, agent) using scoring.
    // We assign as many as capacity allows at this time instant.
    let safety = 10_000;
    while (safety-- > 0) {
      const nextOrderId = this.pendingHeap.pop();
      if (!nextOrderId) break;

      const order = this.ordersById.get(nextOrderId);
      if (!order || order.status !== "unassigned") continue;

      const availableAgents = this.agents.filter((a) => a.tasks.length < 2);
      if (!availableAgents.length) {
        // No capacity right now: put the order back and stop assigning this tick.
        this.pendingHeap.push(order.order_id, order.priority === "high" ? 3 : order.priority === "low" ? 1 : 2, order.createdAtMs);
        break;
      }

      let bestAgent = availableAgents[0];
      let bestScore = Number.POSITIVE_INFINITY;
      let bestTravel = Number.POSITIVE_INFINITY;

      for (const agent of availableAgents) {
        const { score, travelMinutes } = scoreCandidate(order, agent as Agent, this.weights, nowMs, this.dynamicDelay);
        if (score < bestScore) {
          bestScore = score;
          bestAgent = agent;
          bestTravel = travelMinutes;
        } else if (Math.abs(score - bestScore) < 1e-9) {
          // Tie-breaker: fewer tasks, then higher rating.
          if (agent.tasks.length < bestAgent.tasks.length) {
            bestAgent = agent;
            bestTravel = travelMinutes;
          } else if (agent.tasks.length === bestAgent.tasks.length && agent.rating > bestAgent.rating) {
            bestAgent = agent;
            bestTravel = travelMinutes;
          }
        }
      }

      // Apply assignment.
      order.status = "assigned";
      order.assignedAgentId = bestAgent.agent_id;
      order.assignedAtMs = nowMs;

      const waitUntilMs = nowMs + order.prepTimeMs;
      const travelDelay = travelDelayFactor(bestAgent.agent_id, order.order_id, nowMs);
      const travelMinutes = estimateTravelMinutes(bestAgent as Agent, order as Order, nowMs, this.dynamicDelay) * (travelDelay / 1.0);
      const travelMs = travelMinutes * 60_000;

      const task: DeliveryTask = {
        orderId: order.order_id,
        from: clonePoint(bestAgent.position),
        to: clonePoint(order.location),
        waitUntilMs,
        travelStartMs: waitUntilMs,
        travelEndMs: waitUntilMs + travelMs,
        travelDelayFactor: travelDelay,
        travelMs,
        phase: "waiting"
      };

      bestAgent.tasks.push(task);
      bestAgent.cumulativeAssignments += 1;

      this.pendingSet.delete(order.order_id);
      this.assignmentLog.push({
        tsMs: nowMs,
        message: `Agent ${bestAgent.agent_id} assigned to Order ${order.order_id}`
      });
    }
  }

  private stepInternal(nowMs: number) {
    this.simNowMs = nowMs;

    // 1) Enqueue newly arrived orders.
    while (this.nextOrderIndex < this.ordersStream.length && this.ordersStream[this.nextOrderIndex].createdAtMs <= nowMs) {
      const order = this.ordersStream[this.nextOrderIndex];
      this.enqueueOrderIfNeeded(order);
      this.nextOrderIndex++;
    }

    // 2) Deliver tasks that are due.
    this.deliverDueOrders(nowMs);

    // 3) Move agents for visualization.
    this.updateTasksAndPositions(nowMs);

    // 4) Assign pending orders greedily.
    this.assignPendingOrders(nowMs);
  }

  tick(deltaMs: number) {
    const newNow = this.simNowMs + deltaMs;
    this.stepInternal(newNow);
  }

  stepTo(nowMs: number) {
    if (nowMs < this.simNowMs) return;
    this.stepInternal(nowMs);
  }

  getPendingCount() {
    return this.pendingSet.size;
  }

  manualAssign(orderId: string, agentId: string) {
    const order = this.ordersById.get(orderId);
    const agent = this.agents.find((a) => a.agent_id === agentId);
    if (!order || !agent) return false;
    if (order.status !== "unassigned") return false;
    if (order.createdAtMs > this.simNowMs) return false;
    if (agent.tasks.length >= 2) return false;

    // Remove from pending set/heap: simplest approach rebuild heap.
    this.pendingSet.delete(orderId);
    // Rebuild pending heap by pushing remaining orders.
    this.pendingHeap = new PendingOrdersHeap((oid) => {
      const o = this.ordersById.get(oid)!;
      return o.priority === "high" ? 3 : o.priority === "low" ? 1 : 2;
    });
    for (const o of this.ordersStream) {
      if (o.status === "unassigned" && this.pendingSet.has(o.order_id)) {
        const priority = o.priority === "high" ? 3 : o.priority === "low" ? 1 : 2;
        this.pendingHeap.push(o.order_id, priority, o.createdAtMs);
      }
    }

    order.status = "assigned";
    order.assignedAgentId = agent.agent_id;
    order.assignedAtMs = this.simNowMs;

    const waitUntilMs = this.simNowMs + order.prepTimeMs;
    const travelDelay = travelDelayFactor(agent.agent_id, order.order_id, this.simNowMs);
    const travelMinutes = estimateTravelMinutes(agent, order, this.simNowMs, this.dynamicDelay) * (travelDelay / 1.0);
    const travelMs = travelMinutes * 60_000;

    const task: DeliveryTask = {
      orderId: order.order_id,
      from: clonePoint(agent.position),
      to: clonePoint(order.location),
      waitUntilMs,
      travelStartMs: waitUntilMs,
      travelEndMs: waitUntilMs + travelMs,
      travelDelayFactor: travelDelay,
      travelMs,
      phase: "waiting"
    };
    agent.tasks.push(task);
    agent.cumulativeAssignments += 1;

    this.assignmentLog.push({
      tsMs: this.simNowMs,
      message: `Manual: Agent ${agent.agent_id} assigned to Order ${order.order_id}`
    });

    return true;
  }

  getSnapshot(): SimulatorSnapshot {
    const orders = Array.from(this.ordersById.values()).sort((a, b) => a.createdAtMs - b.createdAtMs);
    const agentsSnapshot = this.agents.map((a) => ({
      ...a,
      position: clonePoint(a.position),
      tasks: [...a.tasks]
    }));

    const completed = orders.filter((o) => o.status === "delivered" && typeof o.deliveredAtMs === "number");
    const totalCompleted = completed.length;

    const avgDeliveryMinutes =
      totalCompleted === 0
        ? 0
        : completed.reduce((acc, o) => acc + ((o.deliveredAtMs! - o.createdAtMs) / 60_000), 0) / totalCompleted;

    const slaViolations = completed.filter((o) => (o.deliveredAtMs ?? Infinity) > orderDeadlineMs(o)).length;
    const slaViolationRatePercent = totalCompleted ? (slaViolations / totalCompleted) * 100 : 0;

    const assignmentCounts = agentsSnapshot.map((a) => a.cumulativeAssignments);
    const avg = assignmentCounts.length ? assignmentCounts.reduce((s, x) => s + x, 0) / assignmentCounts.length : 0;
    // variance (population variance)
    const loadVariance = assignmentCounts.length
      ? assignmentCounts.reduce((acc, x) => acc + Math.pow(x - avg, 2), 0) / assignmentCounts.length
      : 0;

    return {
      simNowMs: this.simNowMs,
      orders,
      agents: agentsSnapshot,
      assignmentLog: [...this.assignmentLog],
      pendingCount: this.getPendingCount(),
      metrics: {
        totalCompleted,
        averageDeliveryMinutes: avgDeliveryMinutes,
        slaViolations,
        slaViolationRatePercent,
        loadVariance
      }
    };
  }
}

