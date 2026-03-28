"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { getApiBaseUrl } from "@/lib/api";
import {
  classNames,
  formatDate,
  type WorkspaceSection,
  workspaceSections,
  workspaceStatus,
} from "@/lib/workspaces";
import { useWorkspaceStore } from "./workspace-provider";
import { KeyValue, StatusPill } from "./ui";

const API_BASE_URL = getApiBaseUrl();

const labels: Record<WorkspaceSection, string> = {
  brief: "Brief",
  evidence: "Evidence",
  opportunities: "Opportunities",
  monitoring: "Monitoring",
  drafts: "Drafts",
};

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { globalError, ready, workspaces } = useWorkspaceStore();

  const currentWorkspaceId = pathname?.split("/")[2] ?? null;

  return (
    <main className="min-h-screen px-4 py-5 text-[15px] text-foreground md:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-5 lg:flex-row">
        <aside className="lg:sticky lg:top-5 lg:h-[calc(100vh-2.5rem)] lg:w-[320px] lg:flex-none">
          <div className="flex h-full flex-col overflow-hidden rounded-[28px] border border-[var(--line)] bg-[var(--paper)] shadow-[var(--shadow)] backdrop-blur">
            <div className="border-b border-[var(--line)] px-6 py-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--muted-soft)]">
                Big Fish Small Fish
              </p>
              <h1 className="mt-3 font-display text-3xl leading-none">Target Index</h1>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                Every target lives here. Open one dossier at a time through dedicated routes, not tab state.
              </p>
              <div className="mt-5 flex gap-2">
                <Link className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--accent-deep)]" href="/workspaces/new">
                  New target
                </Link>
                <Link className="rounded-full border border-[var(--line)] bg-white/65 px-4 py-2 text-sm font-medium text-[var(--ink)] transition hover:bg-white" href="/">
                  Home
                </Link>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto px-3 py-3">
              <div className="mb-3 flex items-center justify-between px-3">
                <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--muted-soft)]">
                  Targets
                </span>
                <span className="text-xs text-[var(--muted)]">{workspaces.length}</span>
              </div>
              <div className="grid gap-2">
                {!ready ? (
                  <div className="rounded-[22px] border border-dashed border-[var(--line)] px-4 py-5 text-sm text-[var(--muted)]">
                    Loading local workspace index...
                  </div>
                ) : null}
                {workspaces.map((workspace) => (
                  <div
                    key={workspace.id}
                    className={classNames(
                      "rounded-[22px] border px-4 py-4 transition",
                      workspace.id === currentWorkspaceId
                        ? "border-[var(--line-strong)] bg-[var(--paper-strong)]"
                        : "border-transparent bg-transparent hover:border-[var(--line)] hover:bg-white/45",
                    )}
                  >
                    <Link className="block" href={`/workspaces/${workspace.id}/brief`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-display text-xl leading-none">{workspace.title}</p>
                          <p className="mt-2 text-sm text-[var(--muted)]">
                            {workspace.candidateName}
                            {workspace.companyName ? ` · ${workspace.companyName}` : ""}
                          </p>
                        </div>
                        <StatusPill status={workspaceStatus(workspace)} />
                      </div>
                      <p className="mt-3 text-xs text-[var(--muted)]">{formatDate(workspace.createdAt)}</p>
                    </Link>
                    {workspace.id === currentWorkspaceId ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {workspaceSections.map((section) => (
                          <Link
                            key={section}
                            className={classNames(
                              "rounded-full px-3 py-1.5 text-xs transition",
                              pathname?.endsWith(`/${section}`)
                                ? "bg-[var(--accent)] text-white"
                                : "bg-white/65 text-[var(--muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--ink)]",
                            )}
                            href={`/workspaces/${workspace.id}/${section}`}
                          >
                            {labels[section]}
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
                {ready && !workspaces.length ? (
                  <div className="rounded-[22px] border border-dashed border-[var(--line)] px-4 py-5 text-sm leading-6 text-[var(--muted)]">
                    No targets yet. Create one to start a route-based workspace.
                  </div>
                ) : null}
              </div>
            </div>

            <div className="border-t border-[var(--line)] px-6 py-5">
              <div className="grid gap-2 text-sm text-[var(--muted)]">
                <KeyValue label="API base" value={API_BASE_URL} />
                <KeyValue label="Architecture" value="App Router + local workspace index" />
              </div>
            </div>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          {globalError ? (
            <div className="mb-5 rounded-[20px] border border-[rgba(142,61,49,0.2)] bg-[rgba(142,61,49,0.08)] px-4 py-3 text-sm text-[var(--danger)]">
              {globalError}
            </div>
          ) : null}
          {children}
        </section>
      </div>
    </main>
  );
}
