"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { publishLatestBlogDraft } from "@/lib/api";
import type {
  BlogDraftPublishResponse,
  BlogDraftResponse,
  MonitorEventResponse,
  OpportunityResponse,
  SourceCandidateResponse,
} from "@/lib/types";
import { buildDraftPayload } from "@/lib/workspace-builders";
import {
  defaultDraftForm,
  formatDate,
  readRecord,
  readStringList,
  scoreText,
  type DraftForm,
  type WorkspaceSection,
} from "@/lib/workspaces";
import { useWorkspaceStore } from "./workspace-provider";
import { Button, EmptyState, Field, KeyValue, MetricCard, PagePanel, StatusPill, TextField, Token } from "./ui";

export function WorkspacePage({
  workspaceId,
  section,
}: {
  workspaceId: string;
  section: WorkspaceSection;
}) {
  const router = useRouter();
  const {
    getWorkspace,
    pendingAction,
    ready,
    refreshWorkspace,
    refreshResearch,
    createOpportunityRun,
    createMonitorRun,
    refreshMonitorRun,
    createBlogRun,
    refreshBlogRun,
    createPersonaRun,
    refreshPersonaRun,
  } = useWorkspaceStore();
  const workspace = getWorkspace(workspaceId);
  const [blogForm, setBlogForm] = useState<DraftForm>(defaultDraftForm);
  const [personaForm, setPersonaForm] = useState<DraftForm>(defaultDraftForm);
  const [publishResult, setPublishResult] = useState<BlogDraftPublishResponse | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (!ready) {
      return;
    }
    if (!workspace) {
      router.replace("/workspaces/new");
      return;
    }
    void refreshWorkspace(workspaceId);
  }, [ready, refreshWorkspace, router, workspace, workspaceId]);

  const finalBrief = readRecord(workspace?.researchJob?.final_brief_jsonb);
  const discoveryInsights = readRecord(finalBrief?.discovery_insights);
  const expertiseThemes = readStringList(finalBrief?.expertise_themes);
  const topSources = Array.isArray(finalBrief?.top_sources)
    ? (finalBrief?.top_sources as Array<Record<string, unknown>>)
    : [];
  const publicSignals = Array.isArray(discoveryInsights?.public_interest_signals)
    ? (discoveryInsights?.public_interest_signals as Array<Record<string, unknown>>)
    : [];
  const safeAngles = Array.isArray(discoveryInsights?.safe_content_angles)
    ? (discoveryInsights?.safe_content_angles as Array<Record<string, unknown>>)
    : [];
  const draftReadinessIssue = getDraftReadinessIssue(workspace);
  const blogJobError = readJobError(workspace?.blogJob?.error_jsonb);
  const personaJobError = readJobError(workspace?.personaJob?.error_jsonb);

  if (!ready) {
    return (
      <div className="rounded-[32px] border border-[var(--line)] bg-[var(--paper)] p-8 shadow-[var(--shadow)]">
        <p className="text-sm text-[var(--muted)]">Loading workspace...</p>
      </div>
    );
  }

  if (!workspace) {
    return null;
  }

  const headerMetrics = [
    {
      label: "Research",
      value: workspace.researchJob?.status ?? "queued",
      detail: workspace.researchJob ? formatDate(workspace.researchJob.updated_at) : "Pending",
    },
    {
      label: "Sources",
      value: String(workspace.sources.length),
      detail: `${workspace.sources.filter((item) => item.stage === "extraction").length} enriched`,
    },
    {
      label: "Opportunities",
      value: String(workspace.opportunities.length),
      detail: workspace.opportunityJob?.status ?? "Not started",
    },
    {
      label: "Monitor events",
      value: String(workspace.monitorEvents.length),
      detail: workspace.monitorJob?.status ?? "Not started",
    },
    {
      label: "Drafts",
      value: String(workspace.blogDrafts.length + workspace.personaDrafts.length),
      detail: `${workspace.blogJob?.status ?? "blog idle"} · ${workspace.personaJob?.status ?? "persona idle"}`,
    },
  ];

  return (
    <div className="rounded-[32px] border border-[var(--line)] bg-[var(--paper)] shadow-[var(--shadow)] backdrop-blur">
      <div className="border-b border-[var(--line)] px-6 py-6 md:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--muted-soft)]">Target dossier</p>
            <h2 className="mt-3 font-display text-4xl leading-none md:text-5xl">{workspace.title}</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--muted)]">
              {workspace.clientName || "Client"} is researching {workspace.candidateName} to extract public evidence, rank opportunities, and generate reviewable drafts from a route-based workspace.
            </p>
          </div>
          <div className="grid gap-2 text-sm text-[var(--muted)]">
            <KeyValue label="Target" value={workspace.candidateName} />
            <KeyValue label="Company" value={workspace.companyName || "n/a"} />
            <KeyValue label="Client" value={workspace.clientName || "n/a"} />
          </div>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {headerMetrics.map((metric) => (
            <MetricCard key={metric.label} {...metric} />
          ))}
        </div>
      </div>

      <div className="px-6 py-6 md:px-8">
        {section === "brief" ? (
          <div className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
            <PagePanel
              title="Mission Brief"
              kicker="Research"
              aside={
                <Button
                  disabled={!workspace.researchJobId || pendingAction === "refresh-research"}
                  onClick={() => void refreshResearch(workspaceId)}
                  type="button"
                  variant="secondary"
                >
                  {pendingAction === "refresh-research" ? "Refreshing..." : "Refresh Research"}
                </Button>
              }
            >
              <div className="grid gap-4 md:grid-cols-2">
                <KeyValue label="Target" value={workspace.candidateName} />
                <KeyValue label="Company" value={workspace.companyName || "n/a"} />
                <KeyValue label="Role" value={workspace.roleTitle || "n/a"} />
                <KeyValue label="Client" value={workspace.clientName || "n/a"} />
              </div>
              <p className="mt-5 text-sm leading-7 text-[var(--muted)]">
                {typeof finalBrief?.summary === "string" ? finalBrief.summary : workspace.searchContext}
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {expertiseThemes.length ? expertiseThemes.map((theme) => <Token key={theme}>{theme}</Token>) : <p className="text-sm text-[var(--muted)]">No extracted themes yet.</p>}
              </div>
              <div className="mt-8 grid gap-4">
                <h4 className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--muted-soft)]">Top sources</h4>
                {topSources.length ? topSources.map((source, index) => <SourcePreviewCard key={`${source.url}-${index}`} source={source} />) : <EmptyState message="Research is still running, so no ranked sources are available yet." />}
              </div>
            </PagePanel>

            <div className="grid gap-6">
              <PagePanel title="Public Signals" kicker="Discovery">
                <div className="grid gap-3">
                  {publicSignals.length ? publicSignals.map((item, index) => <SignalCard key={`${item.interest}-${index}`} item={item} />) : <EmptyState message="Signals will appear after discovery insights are generated." />}
                </div>
              </PagePanel>
              <PagePanel title="Safe Angles" kicker="Writing">
                <div className="grid gap-3">
                  {safeAngles.length ? safeAngles.map((item, index) => <AngleCard key={`${item.angle}-${index}`} item={item} />) : <EmptyState message="No safe angles yet. Complete research first." />}
                </div>
              </PagePanel>
            </div>
          </div>
        ) : null}

        {section === "evidence" ? (
          <PagePanel title="Evidence Map" kicker="Sources">
            <div className="grid gap-4 xl:grid-cols-2">
              {workspace.sources.length ? workspace.sources.map((source) => <EvidenceCard key={source.id} source={source} />) : <EmptyState message="No sources captured yet. Wait for discovery or refresh the research job." />}
            </div>
          </PagePanel>
        ) : null}

        {section === "opportunities" ? (
          <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
            <PagePanel
              title="Action Engine"
              kicker="Opportunities"
              aside={
                <Button
                  disabled={!workspace.researchJobId || pendingAction === "create-opportunities"}
                  onClick={() => void createOpportunityRun(workspaceId)}
                  type="button"
                  variant="primary"
                >
                  {pendingAction === "create-opportunities" ? "Ranking..." : "Generate Opportunities"}
                </Button>
              }
            >
              <p className="text-sm leading-7 text-[var(--muted)]">
                This route turns research evidence into ranked content, profile, contribution, and engagement moves.
              </p>
              <div className="mt-5 rounded-[22px] border border-[var(--line)] bg-white/55 px-4 py-4 text-sm text-[var(--muted)]">
                {workspace.opportunityJobsHistory.length} opportunity job
                {workspace.opportunityJobsHistory.length === 1 ? "" : "s"} recorded for this target.
              </div>
              <div className="mt-6 grid gap-3">
                <MetricCard label="Job status" value={workspace.opportunityJob?.status ?? "idle"} detail={formatDate(workspace.opportunityJob?.updated_at)} />
                <MetricCard label="Generated" value={String(workspace.opportunities.length)} detail="Stored opportunity rows" />
              </div>
            </PagePanel>
            <PagePanel title="Ranked Actions" kicker="Queue">
              <div className="grid gap-3">
                {workspace.opportunities.length ? workspace.opportunities.map((item) => <OpportunityCard key={item.id} item={item} />) : <EmptyState message="No opportunities yet. Trigger the opportunity job once research is completed." />}
              </div>
            </PagePanel>
          </div>
        ) : null}

        {section === "monitoring" ? (
          <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
            <PagePanel
              title="Monitor Control"
              kicker="Change detection"
              aside={
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={!workspace.researchJobId || pendingAction === "create-monitor"}
                    onClick={() => void createMonitorRun(workspaceId)}
                    type="button"
                    variant="secondary"
                  >
                    {pendingAction === "create-monitor" ? "Creating..." : "Capture Baseline"}
                  </Button>
                  <Button
                    disabled={!workspace.monitorJobId || pendingAction === "refresh-monitor"}
                    onClick={() => void refreshMonitorRun(workspaceId)}
                    type="button"
                    variant="primary"
                  >
                    {pendingAction === "refresh-monitor" ? "Checking..." : "Refresh Monitor"}
                  </Button>
                </div>
              }
            >
              <div className="grid gap-3">
                <KeyValue label="Status" value={workspace.monitorJob?.status ?? "idle"} />
                <KeyValue label="Cadence" value={workspace.monitorJob?.cadence ?? "manual"} />
                <KeyValue label="Last checked" value={formatDate(workspace.monitorJob?.last_checked_at)} />
              </div>
              <div className="mt-5 rounded-[22px] border border-[var(--line)] bg-white/55 px-4 py-4 text-sm text-[var(--muted)]">
                {workspace.monitorJobsHistory.length} monitor job
                {workspace.monitorJobsHistory.length === 1 ? "" : "s"} recorded for this target.
              </div>
              <p className="mt-5 text-sm leading-7 text-[var(--muted)]">
                Monitor refresh re-runs target research, diffs the new snapshot against the stored baseline, and records new sources, themes, or angles as monitor events.
              </p>
            </PagePanel>
            <PagePanel title="Event Feed" kicker="Diff output">
              <div className="grid gap-3">
                {workspace.monitorEvents.length ? workspace.monitorEvents.map((eventItem) => <MonitorEventCard key={eventItem.id} item={eventItem} />) : <EmptyState message="No events yet. Capture a baseline, then refresh the monitor job to detect changes." />}
              </div>
            </PagePanel>
          </div>
        ) : null}

        {section === "drafts" ? (
          <div className="grid gap-6">
            <div className="grid gap-6 xl:grid-cols-2">
              <PagePanel
                title="Blog Drafts"
                kicker="Long form"
                aside={
                  <div className="flex gap-2">
                    <Button
                      disabled={!workspace.blogDrafts.length || publishing}
                      onClick={async () => {
                        setPublishError(null);
                        setPublishResult(null);
                        setPublishing(true);
                        try {
                          const result = await publishLatestBlogDraft();
                          setPublishResult(result);
                        } catch (error) {
                          setPublishError(error instanceof Error ? error.message : "Failed to publish latest blog draft");
                        } finally {
                          setPublishing(false);
                        }
                      }}
                      type="button"
                      variant="soft"
                    >
                      {publishing ? "Publishing..." : "Publish Latest to Mataroa"}
                    </Button>
                    <Button
                      disabled={!workspace.blogJobId || pendingAction === "refresh-blog"}
                      onClick={() => void refreshBlogRun(workspaceId)}
                      type="button"
                      variant="secondary"
                    >
                      Refresh
                    </Button>
                    <Button
                      disabled={!workspace.researchJobId || Boolean(draftReadinessIssue) || pendingAction === "create-blog"}
                      onClick={() => void createBlogRun(workspaceId, buildDraftPayload(blogForm, workspace))}
                      type="button"
                      variant="primary"
                    >
                      {pendingAction === "create-blog" ? "Generating..." : "Generate Blog Drafts"}
                    </Button>
                  </div>
                }
              >
                {draftReadinessIssue ? (
                  <div className="mb-5 rounded-[20px] border border-[rgba(196,106,47,0.18)] bg-[rgba(196,106,47,0.08)] px-4 py-3 text-sm leading-6 text-[var(--accent-deep)]">
                    {draftReadinessIssue}
                  </div>
                ) : null}
                {blogJobError ? (
                  <div className="mb-5 rounded-[20px] border border-[rgba(142,61,49,0.2)] bg-[rgba(142,61,49,0.08)] px-4 py-3 text-sm leading-6 text-[var(--danger)]">
                    {blogJobError}
                  </div>
                ) : null}
                {publishError ? (
                  <div className="mb-5 rounded-[20px] border border-[rgba(142,61,49,0.2)] bg-[rgba(142,61,49,0.08)] px-4 py-3 text-sm leading-6 text-[var(--danger)]">
                    {publishError}
                  </div>
                ) : null}
                {publishResult ? (
                  <div className="mb-5 rounded-[20px] border border-[rgba(47,106,79,0.2)] bg-[rgba(47,106,79,0.08)] px-4 py-3 text-sm leading-6 text-[var(--success)]">
                    Publish status: {publishResult.status}
                    {publishResult.published_url ? ` · ${publishResult.published_url}` : ""}
                  </div>
                ) : null}
                <div className="mb-5 rounded-[22px] border border-[var(--line)] bg-white/55 px-4 py-4 text-sm text-[var(--muted)]">
                  {workspace.draftJobsHistory.length} draft job
                  {workspace.draftJobsHistory.length === 1 ? "" : "s"} recorded for this target.
                </div>
                <DraftControls form={blogForm} setForm={setBlogForm} />
                <div className="mt-6 grid gap-3">
                  {workspace.blogDrafts.length ? workspace.blogDrafts.map((draft) => <DraftCard key={draft.id} item={draft} />) : <EmptyState message="No blog drafts yet. Create a draft job after research completes." />}
                </div>
              </PagePanel>

              <PagePanel
                title="Persona Posts"
                kicker="Short form"
                aside={
                  <div className="flex gap-2">
                    <Button
                      disabled={!workspace.personaJobId || pendingAction === "refresh-persona"}
                      onClick={() => void refreshPersonaRun(workspaceId)}
                      type="button"
                      variant="secondary"
                    >
                      Refresh
                    </Button>
                    <Button
                      disabled={!workspace.researchJobId || Boolean(draftReadinessIssue) || pendingAction === "create-persona"}
                      onClick={() => void createPersonaRun(workspaceId, buildDraftPayload(personaForm, workspace))}
                      type="button"
                      variant="primary"
                    >
                      {pendingAction === "create-persona" ? "Generating..." : "Generate Persona Posts"}
                    </Button>
                  </div>
                }
              >
                {draftReadinessIssue ? (
                  <div className="mb-5 rounded-[20px] border border-[rgba(196,106,47,0.18)] bg-[rgba(196,106,47,0.08)] px-4 py-3 text-sm leading-6 text-[var(--accent-deep)]">
                    {draftReadinessIssue}
                  </div>
                ) : null}
                {personaJobError ? (
                  <div className="mb-5 rounded-[20px] border border-[rgba(142,61,49,0.2)] bg-[rgba(142,61,49,0.08)] px-4 py-3 text-sm leading-6 text-[var(--danger)]">
                    {personaJobError}
                  </div>
                ) : null}
                <DraftControls form={personaForm} setForm={setPersonaForm} />
                <div className="mt-6 grid gap-3">
                  {workspace.personaDrafts.length ? workspace.personaDrafts.map((draft) => <DraftCard key={draft.id} item={draft} />) : <EmptyState message="No persona posts yet. This endpoint currently reuses the blog draft backend flow." />}
                </div>
              </PagePanel>
            </div>

            {[...workspace.blogDrafts, ...workspace.personaDrafts].length ? (
              <PagePanel title="Draft Reader" kicker="Preview">
                <div className="grid gap-5 xl:grid-cols-2">
                  {[...workspace.blogDrafts, ...workspace.personaDrafts].map((draft) => (
                    <article key={draft.id} className="rounded-[24px] border border-[var(--line)] bg-white/55 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-display text-2xl leading-tight">{draft.title}</h3>
                          <p className="mt-2 text-sm text-[var(--muted)]">{draft.summary}</p>
                        </div>
                        <StatusPill status={draft.angle} />
                      </div>
                      <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[var(--ink)]">{draft.body_markdown}</p>
                    </article>
                  ))}
                </div>
              </PagePanel>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SourcePreviewCard({ source }: { source: Record<string, unknown> }) {
  return (
    <article className="rounded-[22px] border border-[var(--line)] bg-white/55 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-base font-medium leading-6">{String(source.title ?? "Untitled source")}</h4>
          <p className="mt-1 text-sm text-[var(--muted)]">{String(source.url ?? "")}</p>
        </div>
        <div className="text-right text-xs text-[var(--muted)]">
          <p>{String(source.source_type ?? "other")}</p>
          <p>{scoreText(Number(source.ranking_score ?? source.confidence ?? 0))}</p>
        </div>
      </div>
    </article>
  );
}

function SignalCard({ item }: { item: Record<string, unknown> }) {
  return (
    <article className="rounded-[22px] border border-[var(--line)] bg-white/55 p-4">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-base font-medium">{String(item.interest ?? "Signal")}</h4>
        <StatusPill status={String(item.evidence_strength ?? "medium")} />
      </div>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{String(item.safe_use ?? "")}</p>
    </article>
  );
}

function AngleCard({ item }: { item: Record<string, unknown> }) {
  return (
    <article className="rounded-[22px] border border-[var(--line)] bg-white/55 p-4">
      <h4 className="text-base font-medium">{String(item.angle ?? "Angle")}</h4>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{String(item.why_it_resonates ?? "")}</p>
      <p className="mt-3 text-sm leading-6 text-[var(--ink)]">{String(item.client_fit_note ?? "")}</p>
    </article>
  );
}

function EvidenceCard({ source }: { source: SourceCandidateResponse }) {
  const evidence = readRecord(source.evidence_jsonb);
  const nestedEvidence = readRecord(evidence?.evidence);
  return (
    <article className="rounded-[24px] border border-[var(--line)] bg-white/55 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-lg font-medium leading-6">{source.title || "Untitled source"}</h4>
          <p className="mt-2 break-all text-sm text-[var(--muted)]">{source.url}</p>
        </div>
        <div className="text-right">
          <StatusPill status={source.stage} />
          <p className="mt-2 text-xs text-[var(--muted)]">conf {scoreText(source.confidence)} · rank {scoreText(source.ranking_score)}</p>
        </div>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <EvidenceList title="Themes" items={readStringList(nestedEvidence?.expertise_themes)} />
        <EvidenceList title="Projects" items={readStringList(nestedEvidence?.notable_projects)} />
        <EvidenceList title="Leadership" items={readStringList(nestedEvidence?.leadership_signals)} />
        <EvidenceList title="Depth" items={readStringList(nestedEvidence?.technical_depth_signals)} />
      </div>
    </article>
  );
}

function EvidenceList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted-soft)]">{title}</p>
      {items.length ? (
        <ul className="mt-2 grid gap-2 text-sm leading-6 text-[var(--muted)]">
          {items.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-[var(--muted)]">No extracted evidence.</p>
      )}
    </div>
  );
}

function OpportunityCard({ item }: { item: OpportunityResponse }) {
  return (
    <article className="rounded-[24px] border border-[var(--line)] bg-white/55 p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--muted-soft)]">{item.type}</p>
          <h4 className="mt-2 text-xl font-medium leading-7">{item.title}</h4>
        </div>
        <div className="grid gap-1 text-right text-xs text-[var(--muted)]">
          <span>priority {scoreText(item.priority_score)}</span>
          <span>impact {scoreText(item.estimated_impact)}</span>
        </div>
      </div>
      <p className="mt-4 text-sm leading-7 text-[var(--muted)]">{item.description}</p>
      <div className="mt-4 grid gap-2 md:grid-cols-2">
        <KeyValue label="Theme" value={item.theme || "n/a"} />
        <KeyValue label="Asset" value={item.recommended_asset_type || "n/a"} />
      </div>
    </article>
  );
}

function MonitorEventCard({ item }: { item: MonitorEventResponse }) {
  return (
    <article className="rounded-[24px] border border-[var(--line)] bg-white/55 p-5">
      <div className="flex items-center justify-between gap-3">
        <StatusPill status={item.event_type} />
        <span className="text-xs text-[var(--muted)]">{formatDate(item.created_at)}</span>
      </div>
      <p className="mt-3 text-base leading-7">{item.change_summary}</p>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{item.recommended_followup || "No follow-up note."}</p>
    </article>
  );
}

function DraftControls({
  form,
  setForm,
}: {
  form: DraftForm;
  setForm: React.Dispatch<React.SetStateAction<DraftForm>>;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Field label="Goal" value={form.goal} onChange={(value) => setForm((current) => ({ ...current, goal: value }))} />
      <Field label="Draft count" value={form.draftCount} onChange={(value) => setForm((current) => ({ ...current, draftCount: value }))} />
      <Field label="Target length" value={form.targetLength} onChange={(value) => setForm((current) => ({ ...current, targetLength: value }))} />
      <Field label="Requested angles" value={form.requestedAngles} onChange={(value) => setForm((current) => ({ ...current, requestedAngles: value }))} />
      <TextField label="Style constraints" rows={3} value={form.styleConstraints} onChange={(value) => setForm((current) => ({ ...current, styleConstraints: value }))} />
      <TextField label="Persona constraints" rows={3} value={form.personaConstraints} onChange={(value) => setForm((current) => ({ ...current, personaConstraints: value }))} />
    </div>
  );
}

function DraftCard({ item }: { item: BlogDraftResponse }) {
  return (
    <article className="rounded-[24px] border border-[var(--line)] bg-white/55 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-xl font-medium leading-7">{item.title}</h4>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.summary}</p>
        </div>
        <StatusPill status={item.author_mode} />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <KeyValue label="Angle" value={item.angle} />
        <KeyValue label="Updated" value={formatDate(item.updated_at)} />
      </div>
      {item.disclosure_note ? <p className="mt-4 text-sm leading-6 text-[var(--muted)]">{item.disclosure_note}</p> : null}
    </article>
  );
}

function getDraftReadinessIssue(workspace: {
  researchJob: { status: string } | null;
  sources: Array<unknown>;
}) {
  const status = workspace.researchJob?.status;
  if (!status) {
    return "Run target research first before generating drafts.";
  }
  if (!["completed", "partial"].includes(status)) {
    return `Draft generation unlocks after research finishes. Current research status: ${status}.`;
  }
  if (!workspace.sources.length) {
    return "Draft generation requires at least one discovered source.";
  }
  return null;
}

function readJobError(value: unknown) {
  const record = readRecord(value);
  if (!record) {
    return null;
  }
  const stage = typeof record.stage === "string" ? record.stage : null;
  const message = typeof record.message === "string" ? record.message : null;
  if (!stage && !message) {
    return null;
  }
  return [stage, message].filter(Boolean).join(": ");
}
