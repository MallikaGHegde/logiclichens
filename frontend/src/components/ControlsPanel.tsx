import React from "react";
import { DashboardWeights } from "../context/DashboardContext";
import { Button } from "./ui/Button";
import { RangeSlider } from "./ui/RangeSlider";

export function ControlsPanel({
  running,
  pendingCount,
  weights,
  onStart,
  onStop,
  onReset,
  onChangeWeights
}: {
  running: boolean;
  pendingCount: number;
  weights: DashboardWeights;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
  onChangeWeights: (w: DashboardWeights) => void;
}) {
  return (
    <div className="rounded-xl bg-white/70 dark:bg-slate-900/40 shadow-soft ring-1 ring-slate-200/70 dark:ring-slate-800/60 p-4">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Simulation Controls</div>
          <div className="text-xs text-slate-600 dark:text-slate-300">Streaming orders + dynamic assignment scoring</div>
        </div>
        <div className="text-xs text-slate-600 dark:text-slate-300 tabular-nums">Pending: {pendingCount}</div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {!running ? (
          <Button variant="primary" onClick={onStart}>
            Start
          </Button>
        ) : (
          <Button variant="secondary" onClick={onStop}>
            Stop
          </Button>
        )}
        <Button variant="ghost" onClick={onReset}>
          Reset
        </Button>
      </div>

      <div className="space-y-4">
        <RangeSlider
          label="Distance importance"
          value={weights.distanceWeight}
          min={0.05}
          max={0.95}
          step={0.05}
          onChange={(v) => onChangeWeights({ ...weights, distanceWeight: v })}
        />
        <RangeSlider
          label="Priority weight"
          value={weights.priorityWeight}
          min={0.05}
          max={0.95}
          step={0.05}
          onChange={(v) => onChangeWeights({ ...weights, priorityWeight: v })}
        />
      </div>
    </div>
  );
}

