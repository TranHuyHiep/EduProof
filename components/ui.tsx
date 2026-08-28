"use client";
import React from "react";

type Tone = "neutral" | "success" | "danger" | "warning" | "brand";

const TONES: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-700 ring-slate-200",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  danger: "bg-rose-50 text-rose-700 ring-rose-200",
  warning: "bg-amber-50 text-amber-700 ring-amber-200",
  brand: "bg-brand-50 text-brand-700 ring-brand-200",
};

export function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`panel ${className}`}>{children}</section>;
}

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${TONES[tone]}`}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const tone: Tone = status === "active" ? "success" : status === "graduated" ? "brand" : "danger";
  return <Badge tone={tone}>{status}</Badge>;
}

export function Button({
  children, onClick, type = "button", variant = "primary", disabled, className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
  className?: string;
}) {
  const styles: Record<string, string> = {
    primary:
      "bg-brand-600 text-white hover:bg-brand-700 disabled:bg-slate-200 disabled:text-slate-400",
    secondary:
      "bg-white text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50 disabled:text-slate-400",
    ghost:
      "text-slate-600 hover:bg-slate-100 disabled:text-slate-300",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`focusable rounded-xl px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Field({ label, value, hidden }: { label: string; value: string; hidden?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className={`mt-1 text-sm ${hidden ? "select-none text-slate-400 blur-[5px]" : "text-slate-900"}`}>
        {value}
      </dd>
    </div>
  );
}

export function Steps({ current, labels }: { current: number; labels: string[] }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-5 gap-y-2">
      {labels.map((l, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={l} className="flex items-center gap-2">
            <span
              className={`grid h-6 w-6 place-items-center rounded-full text-xs font-semibold ring-1 ${
                done
                  ? "bg-brand-600 text-white ring-brand-600"
                  : active
                    ? "bg-white text-brand-700 ring-brand-500"
                    : "bg-white text-slate-400 ring-slate-200"
              }`}
            >
              {done ? "✓" : i + 1}
            </span>
            <span className={`text-xs ${done || active ? "text-slate-800" : "text-slate-400"}`}>{l}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`shimmer rounded ${className}`} />;
}

export function EmptyState({
  icon, title, body, action,
}: { icon: string; title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="px-6 py-14 text-center">
      <div className="text-3xl">{icon}</div>
      <h2 className="mt-3 text-base font-semibold text-slate-900">{title}</h2>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-slate-500">{body}</p>
      {action && <div className="mt-6 flex justify-center gap-3">{action}</div>}
    </div>
  );
}
