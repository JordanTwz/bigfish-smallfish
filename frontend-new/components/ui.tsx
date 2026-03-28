import type { ButtonHTMLAttributes, ReactNode } from "react";

import { classNames } from "@/lib/workspaces";

export function PagePanel({
  title,
  kicker,
  aside,
  children,
}: {
  title: string;
  kicker: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-[var(--line)] bg-white/45 p-5 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--muted-soft)]">{kicker}</p>
          <h3 className="mt-2 font-display text-3xl leading-none">{title}</h3>
        </div>
        {aside}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function Button({
  children,
  variant = "secondary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "soft";
}) {
  const variantClassName =
    variant === "primary"
      ? "bg-[var(--accent)] text-white hover:bg-[var(--accent-deep)]"
      : variant === "soft"
        ? "bg-[var(--accent-soft)] text-[var(--accent-deep)] hover:bg-[rgba(196,106,47,0.2)]"
        : "border border-[var(--line)] bg-white/65 text-[var(--ink)] hover:bg-white";

  return (
    <button
      className={classNames(
        "rounded-full px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        variantClassName,
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-[24px] border border-[var(--line)] bg-white/55 px-4 py-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted-soft)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold leading-none capitalize">{value}</p>
      <p className="mt-2 text-sm text-[var(--muted)]">{detail}</p>
    </div>
  );
}

export function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted-soft)]">{label}</span>
      <span className="text-sm leading-6">{value}</span>
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const tone =
    normalized === "completed"
      ? "bg-[rgba(47,106,79,0.12)] text-[var(--success)]"
      : normalized === "failed"
        ? "bg-[rgba(142,61,49,0.12)] text-[var(--danger)]"
        : "bg-[var(--accent-soft)] text-[var(--accent-deep)]";
  return <span className={classNames("rounded-full px-3 py-1 text-xs font-medium capitalize", tone)}>{status}</span>;
}

export function Token({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-[var(--accent-soft)] px-4 py-2 text-sm">{children}</span>;
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-[22px] border border-dashed border-[var(--line)] px-4 py-5 text-sm leading-6 text-[var(--muted)]">
      {message}
    </div>
  );
}

export function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-medium text-[var(--muted)]">{label}</span>
      <input
        className="rounded-2xl border border-[var(--line)] bg-white/65 px-4 py-3 outline-none transition focus:border-[var(--line-strong)]"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

export function TextField({
  label,
  value,
  rows,
  onChange,
}: {
  label: string;
  value: string;
  rows: number;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-medium text-[var(--muted)]">{label}</span>
      <textarea
        className="rounded-2xl border border-[var(--line)] bg-white/65 px-4 py-3 outline-none transition focus:border-[var(--line-strong)]"
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        value={value}
      />
    </label>
  );
}
