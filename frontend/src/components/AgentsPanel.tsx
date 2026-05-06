import React, { useMemo } from "react";
import { Agent } from "../simulation/types";
import { Badge } from "./ui/Badge";

export function AgentsPanel({
  agents,
  selectedAgentId,
  onSelectAgent
}: {
  agents: Agent[];
  selectedAgentId?: string;
  onSelectAgent: (agentId: string) => void;
}) {
  const ordered = useMemo(() => [...agents].sort((a, b) => a.agent_id.localeCompare(b.agent_id)), [agents]);

  return (
    <div className="rounded-xl bg-white/70 dark:bg-slate-900/40 shadow-soft ring-1 ring-slate-200/70 dark:ring-slate-800/60 p-4">
      <div className="mb-3">
        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Agents</div>
        <div className="text-xs text-slate-600 dark:text-slate-300">Workload, rating, and availability</div>
      </div>

      <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
        {ordered.map((a) => {
          const workload = a.tasks.length; // 0..2
          const isBusy = workload > 0;
          const canSelect = workload < 2;
          const selected = selectedAgentId === a.agent_id;

          const statusBadge = isBusy ? <Badge variant="danger">Busy</Badge> : <Badge variant="success">Available</Badge>;

          return (
            <button
              key={a.agent_id}
              onClick={() => onSelectAgent(a.agent_id)}
              disabled={!canSelect}
              className={`w-full text-left rounded-lg p-3 ring-1 ring-inset transition ${
                selected
                  ? "bg-slate-900 text-white ring-slate-900"
                  : "bg-white/80 hover:bg-white text-slate-900 ring-slate-200/70 dark:bg-slate-800/30 dark:hover:bg-slate-800/45 dark:text-slate-100"
              } ${!canSelect ? "opacity-60 cursor-not-allowed" : ""}`}
              title={canSelect ? "Select for manual assignment testing" : "Capacity full"}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="font-semibold">{a.agent_id}</div>
                <div className="flex items-center gap-2">
                  {statusBadge}
                  <span className="text-xs text-slate-600 dark:text-slate-300 tabular-nums">Load: {workload}/2</span>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-slate-600 dark:text-slate-300">Rating</span>
                <span className="text-xs font-semibold tabular-nums">{a.rating.toFixed(1)}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

