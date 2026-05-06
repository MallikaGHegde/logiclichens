import React from "react";

export function RangeSlider({
  label,
  value,
  min,
  max,
  step,
  onChange
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{label}</div>
        <div className="text-sm tabular-nums text-slate-600 dark:text-slate-300">{value.toFixed(2)}</div>
      </div>
      <input
        type="range"
        className="w-full accent-slate-900 dark:accent-slate-100"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

