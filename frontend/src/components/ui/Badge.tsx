import React from "react";

const base =
  "inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ring-1 ring-inset";

export function Badge({
  variant,
  children
}: {
  variant: "neutral" | "success" | "warning" | "danger" | "info";
  children: React.ReactNode;
}) {
  const cls =
    variant === "success"
      ? "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30"
      : variant === "warning"
        ? "bg-amber-500/15 text-amber-300 ring-amber-400/30"
        : variant === "danger"
          ? "bg-rose-500/15 text-rose-300 ring-rose-400/30"
          : variant === "info"
            ? "bg-sky-500/15 text-sky-300 ring-sky-400/30"
            : "bg-slate-500/15 text-slate-300 ring-slate-400/30";

  return <span className={`${base} ${cls}`}>{children}</span>;
}

