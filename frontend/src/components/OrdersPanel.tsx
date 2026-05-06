import React, { useMemo } from "react";
import { Order } from "../simulation/types";
import { Badge } from "./ui/Badge";
import { GRID_SIZE } from "../simulation/mockData";

function formatMsAsCountdown(ms: number) {
  const sign = ms < 0 ? "-" : "";
  const abs = Math.abs(ms);
  const totalSec = Math.floor(abs / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${sign}${m}:${String(s).padStart(2, "0")}`;
}

function deadlineMs(o: Order) {
  return o.createdAtMs + o.prepTimeMs + o.slaMinutes * 60_000 + o.deliveryBufferMs;
}

function priorityBadgeVariant(p: Order["priority"]) {
  if (p === "high") return "warning";
  if (p === "low") return "info";
  return "neutral";
}

export function OrdersPanel({
  orders,
  simNowMs,
  selectedOrderId,
  onSelectOrder
}: {
  orders: Order[];
  simNowMs: number;
  selectedOrderId?: string;
  onSelectOrder: (orderId: string) => void;
}) {
  const ordered = useMemo(() => [...orders].sort((a, b) => a.createdAtMs - b.createdAtMs).slice(-60), [orders]);

  return (
    <div className="rounded-xl bg-white/70 dark:bg-slate-900/40 shadow-soft ring-1 ring-slate-200/70 dark:ring-slate-800/60 p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Incoming Orders</div>
          <div className="text-xs text-slate-600 dark:text-slate-300">
            Priority, SLA countdown, and assignment status
          </div>
        </div>
        <div className="text-xs text-slate-600 dark:text-slate-300">{ordered.length} shown</div>
      </div>

      <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
        {ordered.map((o) => {
          const dl = deadlineMs(o);
          const countdownMs = dl - simNowMs;

          const statusBadge =
            o.status === "unassigned" ? (
              <Badge variant="neutral">Unassigned</Badge>
            ) : o.status === "assigned" ? (
              <Badge variant="info">Assigned</Badge>
            ) : (
              <Badge variant="success">Delivered</Badge>
            );

          const prBadge = <Badge variant={priorityBadgeVariant(o.priority)}>{o.priority.toUpperCase()}</Badge>;
          const selected = selectedOrderId === o.order_id;

          const canSelect = o.status === "unassigned";

          return (
            <button
              key={o.order_id}
              onClick={() => onSelectOrder(o.order_id)}
              disabled={!canSelect}
              className={`w-full text-left rounded-lg p-3 ring-1 ring-inset transition ${
                selected
                  ? "bg-slate-900 text-white ring-slate-900"
                  : o.status === "delivered"
                    ? "bg-slate-900/5 text-slate-500 ring-slate-200/70 dark:bg-white/5 dark:ring-white/10"
                    : "bg-white/80 hover:bg-white text-slate-900 ring-slate-200/70 dark:bg-slate-800/30 dark:hover:bg-slate-800/45 dark:text-slate-100"
              } ${!canSelect ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="font-semibold text-sm">{o.order_id}</div>
                <div className="flex items-center gap-2">{prBadge}</div>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                {statusBadge}
                <span className="text-xs text-slate-600 dark:text-slate-300">
                  SLA: <span className={countdownMs < 0 ? "text-rose-600 dark:text-rose-400 font-semibold" : ""}>{formatMsAsCountdown(countdownMs)}</span>
                </span>
                <span className="text-xs text-slate-600 dark:text-slate-300">
                  Loc: ({o.location.x},{o.location.y})
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

