import React, { useMemo } from "react";
import { MetricsSnapshot, Agent } from "../simulation/types";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export function MetricsPanel({
  metrics,
  agents
}: {
  metrics: MetricsSnapshot;
  agents: Agent[];
}) {
  const loadData = useMemo(() => {
    return agents
      .slice()
      .sort((a, b) => a.agent_id.localeCompare(b.agent_id))
      .map((a) => ({
        agent: a.agent_id,
        load: a.cumulativeAssignments
      }));
  }, [agents]);

  return (
    <div className="rounded-xl bg-white/70 dark:bg-slate-900/40 shadow-soft ring-1 ring-slate-200/70 dark:ring-slate-800/60 p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Metrics Dashboard</div>
          <div className="text-xs text-slate-600 dark:text-slate-300">Delivery time, SLA compliance, and workload balance</div>
        </div>
        <div className="text-xs text-slate-600 dark:text-slate-300 tabular-nums">Completed: {metrics.totalCompleted}</div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="rounded-lg bg-white/50 dark:bg-slate-950/40 ring-1 ring-slate-200/70 dark:ring-slate-800/60 p-3">
          <div className="text-xs text-slate-600 dark:text-slate-300">Avg delivery time</div>
          <div className="text-lg font-semibold tabular-nums text-slate-900 dark:text-slate-100">
            {metrics.averageDeliveryMinutes.toFixed(2)} min
          </div>
        </div>
        <div className="rounded-lg bg-white/50 dark:bg-slate-950/40 ring-1 ring-slate-200/70 dark:ring-slate-800/60 p-3">
          <div className="text-xs text-slate-600 dark:text-slate-300">SLA violations</div>
          <div className="text-lg font-semibold tabular-nums text-slate-900 dark:text-slate-100">
            {metrics.slaViolations}
          </div>
        </div>
        <div className="rounded-lg bg-white/50 dark:bg-slate-950/40 ring-1 ring-slate-200/70 dark:ring-slate-800/60 p-3">
          <div className="text-xs text-slate-600 dark:text-slate-300">Violation rate</div>
          <div className="text-lg font-semibold tabular-nums text-slate-900 dark:text-slate-100">
            {metrics.slaViolationRatePercent.toFixed(2)}%
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">Load distribution</div>
          <div className="text-xs text-slate-600 dark:text-slate-300 tabular-nums">Variance: {metrics.loadVariance.toFixed(2)}</div>
        </div>

        <div className="h-[220px] rounded-lg bg-white/50 dark:bg-slate-950/40 ring-1 ring-slate-200/70 dark:ring-slate-800/60 p-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={loadData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.25)" />
              <XAxis dataKey="agent" tick={{ fontSize: 12 }} interval={0} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="load" fill="rgb(249,115,22)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

