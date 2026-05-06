import React, { useMemo } from "react";
import { Agent, Order } from "../simulation/types";
import { GRID_SIZE } from "../simulation/mockData";

function tokenPositionPercent(x: number) {
  // Place token at cell center.
  return ((x + 0.5) / GRID_SIZE) * 100;
}

function orderColor(order: Order) {
  if (order.status === "delivered") return "bg-violet-500/40 ring-violet-400/60";
  // Unassigned/assigned: reflect priority color; use opacity to show urgency vs assignment.
  if (order.priority === "high") return "bg-orange-500/95 ring-orange-400/90";
  return order.priority === "low" ? "bg-rose-500/90 ring-rose-400/80" : "bg-amber-500/90 ring-amber-400/80";
}

function agentColor(agent: Agent) {
  return agent.tasks.length >= 1 ? "bg-red-500 ring-red-400" : "bg-emerald-500 ring-emerald-400";
}

export function MapView({ agents, orders }: { agents: Agent[]; orders: Order[] }) {
  const pendingOrders = orders.filter((o) => o.status === "unassigned");
  const nonPendingOrders = useMemo(() => orders.filter((o) => o.status !== "unassigned"), [orders]);

  return (
    <div className="rounded-xl bg-white/70 dark:bg-slate-900/40 shadow-soft ring-1 ring-slate-200/70 dark:ring-slate-800/60 p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Live Grid Map</div>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 ring-1 ring-emerald-400" />
            <span className="text-slate-600 dark:text-slate-300">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500 ring-1 ring-red-400" />
            <span className="text-slate-600 dark:text-slate-300">Busy</span>
          </div>
        </div>
      </div>

      <div className="relative w-full">
        {/* Background grid */}
        <div
          className="aspect-square w-full rounded-lg bg-slate-50 dark:bg-slate-950 ring-1 ring-slate-200/60 dark:ring-slate-800/70 overflow-hidden"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(148,163,184,0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.18) 1px, transparent 1px)`,
            backgroundSize: `${100 / GRID_SIZE}% ${100 / GRID_SIZE}%`
          }}
        />

        {/* Overlays */}
        <div className="absolute inset-0">
          {/* Orders */}
          {pendingOrders.map((o) => {
            const left = tokenPositionPercent(o.location.x);
            const top = tokenPositionPercent(o.location.y);
            return (
              <div
                key={o.order_id}
                className={`absolute -translate-x-1/2 -translate-y-1/2 ${orderColor(o)} ring-2`}
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                  width: 10,
                  height: 10,
                  transition: "left 200ms linear, top 200ms linear, opacity 200ms linear"
                }}
                title={`${o.order_id} (${o.priority})`}
              />
            );
          })}

          {nonPendingOrders
            .map((o) => {
              const left = tokenPositionPercent(o.location.x);
              const top = tokenPositionPercent(o.location.y);
              return (
                <div
                  key={o.order_id}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 ${orderColor(o)} ring-2`}
                  style={{
                    left: `${left}%`,
                    top: `${top}%`,
                    width: 12,
                    height: 12,
                    transition: "left 200ms linear, top 200ms linear, opacity 200ms linear",
                    opacity: o.status === "delivered" ? 0.5 : 0.95
                  }}
                  title={`${o.order_id} (${o.priority})`}
                />
              );
            })}

          {/* Agents */}
          {agents.map((a) => {
            const left = tokenPositionPercent(a.position.x);
            const top = tokenPositionPercent(a.position.y);
            return (
              <div
                key={a.agent_id}
                className={`absolute -translate-x-1/2 -translate-y-1/2 ${agentColor(a)} ring-2`}
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                  width: 16,
                  height: 16,
                  transition: "left 180ms linear, top 180ms linear"
                }}
                title={`${a.agent_id} (rating ${a.rating.toFixed(1)})`}
              >
                <div className="sr-only">{a.agent_id}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

