import Link from "next/link";

export default function HomePage() {
  return (
    <div className="rounded-[32px] border border-[var(--line)] bg-[var(--paper)] p-8 shadow-[var(--shadow)]">
      <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--muted-soft)]">Workspace app</p>
      <h2 className="mt-3 font-display text-5xl leading-none">Route-based target dossiers.</h2>
      <p className="mt-5 max-w-3xl text-sm leading-7 text-[var(--muted)]">
        This UI is now organized as separate pages per target and per workflow section. Use the left sidebar to jump between targets, or create a new target workspace to begin a research run.
      </p>
      <div className="mt-8 flex gap-3">
        <Link className="rounded-full bg-[var(--ink)] px-5 py-3 text-sm text-white hover:bg-[var(--accent-deep)]" href="/workspaces/new">
          Create target
        </Link>
      </div>
    </div>
  );
}
