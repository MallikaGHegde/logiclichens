import React, { useMemo } from "react";

function formatSimSeconds(ms: number) {
  const sec = Math.floor(ms / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (h > 0) return `${h}:${String(mm).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${mm}:${String(s).padStart(2, "0")}`;
}

export function AssignmentLog({
  entries,
  limit = 200
}: {
  entries: Array<{ tsMs: number; message: string }>;
  limit?: number;
}) {
  const shown = useMemo(() => entries.slice(-limit), [entries, limit]);

  return (
    <div className="rounded-xl bg-white/70 dark:bg-slate-900/40 shadow-soft ring-1 ring-slate-200/70 dark:ring-slate-800/60 p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Assignment Log</div>
          <div className="text-xs text-slate-600 dark:text-slate-300">Real-time decisions from the dispatcher</div>
        </div>
        <div className="text-xs text-slate-600 dark:text-slate-300">{shown.length} entries</div>
      </div>

      <div className="space-y-2 max-h-[260px] overflow-auto pr-1">
        {shown.map((e, idx) => (
          <div
            key={`${e.tsMs}-${idx}`}
            className="flex items-start justify-between gap-3 rounded-lg bg-white/40 dark:bg-slate-950/30 ring-1 ring-slate-200/70 dark:ring-slate-800/60 px-3 py-2"
          >
            <div className="text-xs tabular-nums text-slate-600 dark:text-slate-300">{formatSimSeconds(e.tsMs)}</div>
            <div className="text-xs text-slate-900 dark:text-slate-100 font-medium">{e.message}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

