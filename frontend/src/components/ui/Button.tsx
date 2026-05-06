import React from "react";

export function Button({
  variant,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" }) {
  const cls =
    variant === "secondary"
      ? "bg-slate-900/5 hover:bg-slate-900/10 text-slate-900 dark:text-slate-100 ring-1 ring-inset ring-slate-300/40 dark:ring-slate-700/70"
      : variant === "ghost"
        ? "bg-transparent hover:bg-slate-900/5 text-slate-900 dark:text-slate-100"
        : "bg-slate-900 text-white hover:bg-slate-800 dark:bg-white/10 dark:hover:bg-white/15";

  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${cls} disabled:opacity-50 disabled:cursor-not-allowed ${props.className ?? ""}`}
    />
  );
}

