"use client";
import React from "react";
import { IconBuilding, IconCheck, IconX } from "./icons";

/* Building blocks for a document-styled interface.
 *
 * The rules that hold it together:
 *   • sheets sit on the page (hairline border, no shadow)
 *   • sections are separated by rules, not by gaps between floating cards
 *   • the serif is reserved for titles and figures that carry authority
 *   • one accent — the seal red — and it is used sparingly
 */

/** A sheet of paper. */
export function Sheet({
  children, className = "",
}: { children: React.ReactNode; className?: string }) {
  return <div className={`sheet ${className}`}>{children}</div>;
}

/** A labelled section of a document. */
export function Section({
  title, aside, children, className = "",
}: {
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      <div className="rule flex items-baseline justify-between gap-4 pb-2">
        <h2 className="eyebrow">{title}</h2>
        {aside}
      </div>
      <div className="pt-4">{children}</div>
    </section>
  );
}

type Tone = "neutral" | "proven" | "failed" | "caution" | "seal";

const TONES: Record<Tone, string> = {
  neutral: "border-rule text-ink-soft bg-paper-deep",
  proven: "border-proven/25 text-proven bg-proven-bg",
  failed: "border-failed/25 text-failed bg-failed-bg",
  caution: "border-caution/25 text-caution bg-caution-bg",
  seal: "border-seal-200 text-seal-600 bg-seal-50",
};

export function Tag({
  tone = "neutral", children,
}: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 border px-2 py-0.5 text-[11px] font-medium tracking-wide ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}

export function StatusTag({ status }: { status: string }) {
  const tone: Tone =
    status === "active" ? "proven" : status === "suspended" ? "failed" : "neutral";
  return <Tag tone={tone}>{status}</Tag>;
}

export function Button({
  children, onClick, type = "button", variant = "primary", disabled, className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "primary" | "secondary" | "quiet";
  disabled?: boolean;
  className?: string;
}) {
  const styles: Record<string, string> = {
    primary:
      "bg-ink text-paper hover:bg-seal-700 disabled:bg-rule disabled:text-ink-faint",
    secondary:
      "border border-rule bg-surface text-ink hover:border-ink-faint disabled:text-ink-faint",
    quiet:
      "text-ink-soft hover:text-ink disabled:text-ink-faint",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`focusable px-5 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

/** A labelled value, as printed on a record. */
export function Entry({
  label, value, redacted, mono,
}: { label: string; value: React.ReactNode; redacted?: boolean; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-6 py-2.5">
      <dt className="shrink-0 text-sm text-ink-faint">{label}</dt>
      <dd
        className={`text-right text-sm ${mono ? "mono text-xs" : ""} ${
          redacted ? "select-none text-ink-faint blur-[5px]" : "text-ink"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

/** Progress through the issuing flow, set as a printed sequence. */
export function Steps({ current, labels }: { current: number; labels: string[] }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] tracking-wide">
      {labels.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex items-center gap-3">
            {i > 0 && <span className="text-rule">·</span>}
            <span
              className={`uppercase ${
                active ? "font-semibold text-seal-600" : done ? "text-ink-soft" : "text-ink-faint"
              }`}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`shimmer ${className}`} />;
}

export function EmptyState({
  icon, title, body, action,
}: { icon?: React.ReactNode; title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="px-6 py-16 text-center">
      {icon && (
        <div className="mx-auto mb-4 grid h-10 w-10 place-items-center border border-rule text-ink-faint [&>svg]:h-4 [&>svg]:w-4">
          {icon}
        </div>
      )}
      <h2 className="title text-lg">{title}</h2>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-soft">{body}</p>
      {action && <div className="mt-6 flex justify-center gap-3">{action}</div>}
    </div>
  );
}

/** A claim outcome, as one line of a record. */
export function ClaimLine({
  label, satisfied, note,
}: { label: string; satisfied: boolean; note?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="flex items-start gap-2.5">
        <span className={satisfied ? "text-proven" : "text-failed"}>
          {satisfied ? <IconCheck size={1.05} /> : <IconX size={1.05} />}
        </span>
        <span className="text-[15px] leading-snug text-ink">{label}</span>
      </div>
      <span
        className={`shrink-0 pt-0.5 text-[11px] uppercase tracking-wider ${
          satisfied ? "text-proven" : "text-failed"
        }`}
      >
        {note ?? (satisfied ? "proven" : "not proven")}
      </span>
    </div>
  );
}

/**
 * Marks data that came from the school's own system, not from EduProof.
 *
 * The demo hosts the school's endpoint inside this app so it deploys as one
 * project, which blurs a boundary that matters: the institution is a separate
 * vendor, and EduProof never holds these records. Since the deployment no
 * longer shows that, the interface says it.
 */
export function SchoolBoundaryNote({ endpoint }: { endpoint?: string }) {
  const target = endpoint ?? process.env.NEXT_PUBLIC_SCHOOL_API ?? "/api/school/graphql";
  const external = /^https?:\/\//.test(target);

  return (
    <p className="flex flex-wrap items-center gap-1.5 text-xs text-ink-faint">
      <IconBuilding size={1.05} />
      <span>
        Fetched from the institution&rsquo;s own system
        {external ? " at " : ", simulated at "}
        <code className="mono text-[11px] text-ink-soft">{target}</code>. EduProof keeps no copy.
      </span>
    </p>
  );
}
