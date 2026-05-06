import { Agent, Order, Weights } from "./types";

const GRID_MINUTES_PER_UNIT = 3.0; // mirror backend approximation

function euclidean(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function estimateTravelMinutes(agent: Agent, order: Order, nowMs: number, dynamicDelay: boolean) {
  const baseMinutes = euclidean(agent.position, order.location) * GRID_MINUTES_PER_UNIT;
  if (!dynamicDelay) return baseMinutes;

  const now = new Date(nowMs);
  const rushHours = new Set([9, 10, 11, 18, 19]);
  const peakFactor = rushHours.has(now.getHours()) ? 1.25 : 1.0;

  // Small deterministic-ish perturbation based on coordinates.
  const seedish = Math.floor(agent.agent_id.charCodeAt(1) * 97 + order.order_id.charCodeAt(1) * 31);
  const frac = (Math.sin(seedish) + 1.0) / 2.0; // 0..1
  const stochastic = 1.0 + frac * 0.25;

  const distanceFactor = 1.0 + Math.min(baseMinutes / 60.0, 0.15);
  return baseMinutes * peakFactor * stochastic * distanceFactor;
}

export function orderDeadlineMs(order: Order) {
  // deadline = created + prep + sla + buffer
  return (
    order.createdAtMs +
    order.prepTimeMs +
    order.slaMinutes * 60_000 +
    order.deliveryBufferMs
  );
}

export function scoreCandidate(
  order: Order,
  agent: Agent,
  weights: Weights,
  nowMs: number,
  dynamicDelay: boolean
): { score: number; travelMinutes: number; slackMinutes: number } {
  const travelMinutes = estimateTravelMinutes(agent, order, nowMs, dynamicDelay);
  const projectedDeliveryMs = nowMs + order.prepTimeMs + travelMinutes * 60_000;

  const slackMs = orderDeadlineMs(order) - projectedDeliveryMs;
  const slackMinutes = slackMs / 60_000;

  let slaUrgency = 1.0 / (1.0 + Math.max(slackMinutes, 0));
  if (slackMinutes < 0) {
    slaUrgency += Math.abs(slackMinutes) / 10.0;
  }

  const workloadRatio = agent.tasks.length / Math.max(2, 1);
  const avgAssignments = 4; // used as baseline to avoid needing global mean in scoring fn
  const fairnessPressure = agent.cumulativeAssignments / (avgAssignments + 1);
  const workloadPenalty = 0.7 * workloadRatio + 0.3 * fairnessPressure;

  const priorityBoost = order.priority === "high" ? 1.5 : order.priority === "low" ? 0.8 : 1.0;
  const ratingBoost = agent.rating / 5.0;

  // Keep relative meanings, but allow tuning via two sliders.
  const wTravel = weights.distanceWeight;
  const wPriority = weights.priorityWeight;
  const wWorkload = 0.20;
  const wSla = 0.25;
  const wRating = 0.05;

  const wTravelNorm = wTravel / (wTravel + wPriority + wWorkload + wSla + wRating);
  const wPriorityNorm = wPriority / (wTravel + wPriority + wWorkload + wSla + wRating);
  const wWorkloadNorm = wWorkload / (wTravel + wPriority + wWorkload + wSla + wRating);
  const wSlaNorm = wSla / (wTravel + wPriority + wWorkload + wSla + wRating);
  const wRatingNorm = wRating / (wTravel + wPriority + wWorkload + wSla + wRating);

  const score =
    wTravelNorm * travelMinutes +
    wWorkloadNorm * workloadPenalty +
    wSlaNorm * slaUrgency * 10 -
    wPriorityNorm * priorityBoost * 4 -
    wRatingNorm * ratingBoost * 2;

  return { score, travelMinutes, slackMinutes: slackMinutes };
}

