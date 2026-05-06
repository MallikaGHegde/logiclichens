export type Priority = "low" | "normal" | "high";

export type OrderStatus = "unassigned" | "assigned" | "delivered";

export interface Point {
  x: number;
  y: number;
}

export interface Order {
  order_id: string;
  priority: Priority;
  createdAtMs: number;
  location: Point;
  prepTimeMs: number;
  slaMinutes: number; // SLA window in minutes
  deliveryBufferMs: number; // extra buffer in minutes

  // Mutable simulation fields
  status: OrderStatus;
  assignedAgentId?: string;
  assignedAtMs?: number;
  deliveredAtMs?: number;
}

export type TaskPhase = "waiting" | "travel";

export interface DeliveryTask {
  orderId: string;
  from: Point;
  to: Point;

  waitUntilMs: number; // when "prep_time" completes
  travelStartMs: number;
  travelEndMs: number;
  travelDelayFactor: number;
  travelMs: number;

  // For visualization
  phase: TaskPhase;
}

export interface Agent {
  agent_id: string;
  rating: number;
  baseLocation: Point;

  // Mutable simulation fields
  position: Point;
  tasks: DeliveryTask[]; // max 2 tasks, consistent with capacity
  cumulativeAssignments: number;
}

export interface MetricsSnapshot {
  totalCompleted: number;
  averageDeliveryMinutes: number;
  slaViolations: number;
  slaViolationRatePercent: number;
  loadVariance: number;
}

export interface Weights {
  distanceWeight: number; // importance of travel time
  priorityWeight: number; // importance of priority handling
}

