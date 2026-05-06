import { Agent, Order, Point, Priority } from "./types";

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function randInt(min: number, max: number, rnd: () => number) {
  return Math.floor(rnd() * (max - min + 1)) + min;
}

function makeRng(seed: number) {
  // Simple deterministic PRNG (linear congruential generator).
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

export const GRID_SIZE = 10; // coordinates 0..9

export function makeInitialAgents(): Agent[] {
  // A small set for dashboard clarity (expand as needed).
  const agents: Agent[] = [
    { agent_id: "A001", rating: 4.8, baseLocation: { x: 0, y: 0 }, position: { x: 0, y: 0 }, tasks: [], cumulativeAssignments: 0 },
    { agent_id: "A002", rating: 4.5, baseLocation: { x: 1, y: 1 }, position: { x: 1, y: 1 }, tasks: [], cumulativeAssignments: 0 },
    { agent_id: "A003", rating: 4.9, baseLocation: { x: 2, y: 2 }, position: { x: 2, y: 2 }, tasks: [], cumulativeAssignments: 0 },
    { agent_id: "A004", rating: 4.2, baseLocation: { x: 3, y: 3 }, position: { x: 3, y: 3 }, tasks: [], cumulativeAssignments: 0 },
    { agent_id: "A005", rating: 4.7, baseLocation: { x: 4, y: 4 }, position: { x: 4, y: 4 }, tasks: [], cumulativeAssignments: 0 },
    { agent_id: "A006", rating: 4.6, baseLocation: { x: 5, y: 5 }, position: { x: 5, y: 5 }, tasks: [], cumulativeAssignments: 0 }
  ];
  return agents;
}

export function makeStreamingOrders(): Array<Pick<Order, "order_id" | "priority" | "createdAtMs" | "prepTimeMs" | "slaMinutes" | "deliveryBufferMs" | "location">> {
  const rnd = makeRng(7);
  const priorities: Priority[] = ["low", "normal", "high"];

  const orders: Array<Pick<Order, "order_id" | "priority" | "createdAtMs" | "prepTimeMs" | "slaMinutes" | "deliveryBufferMs" | "location">> = [];

  // Stream starts at t=0. Each order arrives 10..35s apart to keep it interactive.
  let t = 0;
  const count = 40;
  for (let i = 1; i <= count; i++) {
    t += randInt(10_000, 35_000, rnd); // 10s..35s

    const priority = (() => {
      const p = rnd();
      if (p < 0.3) return "low";
      if (p < 0.65) return "normal";
      return "high";
    })();

    const prepTimeMinutes = randInt(6, 15, rnd);
    const prepTimeMs = prepTimeMinutes * 60_000;

    const slaMinutes = randInt(38, 60, rnd);
    const deliveryBufferMs = 10 * 60_000; // match backend buffer concept

    const location: Point = {
      x: randInt(0, GRID_SIZE - 1, rnd),
      y: randInt(0, GRID_SIZE - 1, rnd)
    };

    orders.push({
      order_id: `O${String(i).padStart(3, "0")}`,
      priority,
      createdAtMs: t,
      location,
      prepTimeMs,
      slaMinutes,
      deliveryBufferMs
    });
  }

  return orders;
}

export function priorityToNumber(priority: Priority) {
  switch (priority) {
    case "high":
      return 3;
    case "normal":
      return 2;
    case "low":
      return 1;
    default:
      return 2;
  }
}

export function normalizeLocation(loc: Point): Point {
  return { x: clamp(loc.x, 0, GRID_SIZE - 1), y: clamp(loc.y, 0, GRID_SIZE - 1) };
}

