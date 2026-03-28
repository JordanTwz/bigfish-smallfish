"use client";

import { startTransition, useEffect, useEffectEvent, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { api } from "@/lib/api";
import type {
  BlogDraft,
  BlogDraftJob,
  MonitorEvent,
  MonitorJob,
  Opportunity,
  OpportunityJob,
  ResearchJob,
  ResearchJobCreatePayload,
  SourceCandidate,
} from "@/lib/types";

const EMPTY_RESEARCH_FORM: ResearchJobCreatePayload = {
  client_name: "",
  candidate_name: "",
  company_name: "",
  company_domain: "",
  role_title: "",
  search_context: "Public professional profile search",
};

const EMPTY_CLIENT_PROFILE = `{
  "current_role": "",
  "interests": []
}`;

type AsyncBlock<T> = {
  items: T[];
  loading: boolean;
  error: string | null;
};

export function AppShell() {
  const [jobs, setJobs] = useState<ResearchJob[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<ResearchJob | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);
  const [sources, setSources] = useState<AsyncBlock<SourceCandidate>>({
    items: [],
    loading: false,
    error: null,
  });
  const [opportunityJobs, setOpportunityJobs] = useState<AsyncBlock<OpportunityJob>>({
    items: [],
    loading: false,
    error: null,
  });
  const [monitorJobs, setMonitorJobs] = useState<AsyncBlock<MonitorJob>>({
    items: [],
    loading: false,
    error: null,
  });
  const [draftJobs, setDraftJobs] = useState<AsyncBlock<BlogDraftJob>>({
    items: [],
    loading: false,
    error: null,
  });
  const [opportunities, setOpportunities] = useState<AsyncBlock<Opportunity>>({
    items: [],
    loading: false,
    error: null,
  });
  const [monitorEvents, setMonitorEvents] = useState<AsyncBlock<MonitorEvent>>({
    items: [],
    loading: false,
    error: null,
  });
  const [drafts, setDrafts] = useState<AsyncBlock<BlogDraft>>({
    items: [],
    loading: false,
    error: null,
  });
  const [researchForm, setResearchForm] = useState(EMPTY_RESEARCH_FORM);
  const [clientProfileText, setClientProfileText] = useState(EMPTY_CLIENT_PROFILE);
  const [createError, setCreateError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selectedOpportunityJob = opportunityJobs.items[0] ?? null;
  const selectedMonitorJob = monitorJobs.items[0] ?? null;
  const selectedDraftJob = draftJobs.items[0] ?? null;

  const activeStatuses = useMemo(
    () =>
      new Set([
        "queued",
        "discovering",
        "extracting",
        "scoring",
        "profiling",
        "outlining",
        "drafting",
        "running",
      ]),
    [],
  );

  const hydrateSelectedJobEvent = useEffectEvent((jobId: string, options?: { silent?: boolean }) => {
    void hydrateSelectedJob(jobId, options);
  });

  useEffect(() => {
    const remembered = window.localStorage.getItem("frontend-newest:selected-job-id");
    void loadJobs(remembered);
  }, []);

  useEffect(() => {
    if (!selectedJobId) {
      return;
    }

    window.localStorage.setItem("frontend-newest:selected-job-id", selectedJobId);
  }, [selectedJobId]);

  useEffect(() => {
    if (!selectedJobId) {
      setSelectedJob(null);
      return;
    }

    hydrateSelectedJobEvent(selectedJobId);
  }, [selectedJobId]);

  useEffect(() => {
    if (!selectedJobId) {
      return;
    }

    const statuses = [
      selectedJob?.status,
      selectedOpportunityJob?.status,
      selectedMonitorJob?.status,
      selectedDraftJob?.status,
    ].filter(Boolean);

    if (!statuses.some((status) => activeStatuses.has(status as string))) {
      return;
    }

    const timer = window.setInterval(() => {
      hydrateSelectedJobEvent(selectedJobId, { silent: true });
      void loadJobs(selectedJobId);
    }, 7000);

    return () => window.clearInterval(timer);
  }, [
    activeStatuses,
    selectedDraftJob?.status,
    selectedJob?.status,
    selectedJobId,
    selectedMonitorJob?.status,
    selectedOpportunityJob?.status,
  ]);

  async function loadJobs(preferredJobId?: string | null) {
    setJobsLoading(true);
    setJobsError(null);

    try {
      const nextJobs = await api.listResearchJobs();
      setJobs(nextJobs);

      startTransition(() => {
        setSelectedJobId((current) => {
          if (current && nextJobs.some((job) => job.id === current)) {
            return current;
          }

          if (preferredJobId && nextJobs.some((job) => job.id === preferredJobId)) {
            return preferredJobId;
          }

          return nextJobs[0]?.id ?? null;
        });
      });
    } catch (error) {
      setJobsError(getErrorMessage(error));
    } finally {
      setJobsLoading(false);
    }
  }

  async function hydrateSelectedJob(jobId: string, options?: { silent?: boolean }) {
    if (!options?.silent) {
      setJobError(null);
      setSources((current) => ({ ...current, loading: true, error: null }));
      setOpportunityJobs((current) => ({ ...current, loading: true, error: null }));
      setMonitorJobs((current) => ({ ...current, loading: true, error: null }));
      setDraftJobs((current) => ({ ...current, loading: true, error: null }));
    }

    try {
      const [job, sourceItems, opportunityJobItems, monitorJobItems, draftJobItems] = await Promise.all([
        api.getResearchJob(jobId),
        api.listSources(jobId),
        api.listOpportunityJobs(jobId),
        api.listMonitorJobs(jobId),
        api.listBlogDraftJobs(jobId),
      ]);

      setSelectedJob(job);
      setSources({ items: sourceItems, loading: false, error: null });
      setOpportunityJobs({ items: opportunityJobItems, loading: false, error: null });
      setMonitorJobs({ items: monitorJobItems, loading: false, error: null });
      setDraftJobs({ items: draftJobItems, loading: false, error: null });

      await Promise.all([
        hydrateOpportunities(opportunityJobItems[0]?.id ?? null),
        hydrateMonitorEvents(monitorJobItems[0]?.id ?? null),
        hydrateDrafts(draftJobItems[0] ?? null),
      ]);
    } catch (error) {
      setJobError(getErrorMessage(error));
      setSources((current) => ({ ...current, loading: false }));
      setOpportunityJobs((current) => ({ ...current, loading: false }));
      setMonitorJobs((current) => ({ ...current, loading: false }));
      setDraftJobs((current) => ({ ...current, loading: false }));
    }
  }

  async function hydrateOpportunities(opportunityJobId: string | null) {
    if (!opportunityJobId) {
      setOpportunities({ items: [], loading: false, error: null });
      return;
    }

    setOpportunities((current) => ({ ...current, loading: true, error: null }));

    try {
      const items = await api.listOpportunities(opportunityJobId);
      setOpportunities({ items, loading: false, error: null });
    } catch (error) {
      setOpportunities({
        items: [],
        loading: false,
        error: getErrorMessage(error),
      });
    }
  }

  async function hydrateMonitorEvents(monitorJobId: string | null) {
    if (!monitorJobId) {
      setMonitorEvents({ items: [], loading: false, error: null });
      return;
    }

    setMonitorEvents((current) => ({ ...current, loading: true, error: null }));

    try {
      const items = await api.listMonitorEvents(monitorJobId);
      setMonitorEvents({ items, loading: false, error: null });
    } catch (error) {
      setMonitorEvents({
        items: [],
        loading: false,
        error: getErrorMessage(error),
      });
    }
  }

  async function hydrateDrafts(draftJob: BlogDraftJob | null) {
    if (!draftJob) {
      setDrafts({ items: [], loading: false, error: null });
      return;
    }

    setDrafts((current) => ({ ...current, loading: true, error: null }));

    try {
      const items = await api.listBlogDrafts(draftJob.id);
      setDrafts({ items, loading: false, error: null });
    } catch (error) {
      setDrafts({
        items: [],
        loading: false,
        error: getErrorMessage(error),
      });
    }
  }

  async function handleCreateResearchJob(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setCreateError(null);
    setActionMessage(null);

    try {
      const clientProfile = parseJsonRecord(clientProfileText);
      const payload: ResearchJobCreatePayload = {
        candidate_name: researchForm.candidate_name?.trim() ?? "",
        client_name: toOptional(researchForm.client_name),
        company_name: toOptional(researchForm.company_name),
        company_domain: toOptional(researchForm.company_domain),
        role_title: toOptional(researchForm.role_title),
        search_context: toOptional(researchForm.search_context),
        client_profile: clientProfile,
      };

      if (!payload.candidate_name) {
        throw new Error("Candidate name is required");
      }

      const job = await api.createResearchJob(payload);
      setResearchForm(EMPTY_RESEARCH_FORM);
      setClientProfileText(EMPTY_CLIENT_PROFILE);
      setActionMessage("Research job created and queued.");
      await loadJobs(job.id);
    } catch (error) {
      setCreateError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function runAction(action: () => Promise<void>, successMessage: string) {
    setActionMessage(null);
    setCreateError(null);

    try {
      await action();
      setActionMessage(successMessage);
    } catch (error) {
      setCreateError(getErrorMessage(error));
    }
  }

  const currentClientLabel = selectedJob?.client_name || "No client selected";
  const currentTargetLabel = selectedJob?.candidate_name || "Choose a target";

  return (
    <main className="app-frame">
      <aside className="sidebar">
        <div className="sidebar-panel sidebar-panel-hero">
          <p className="eyebrow">Current client</p>
          <h1>{currentClientLabel}</h1>
          <p className="sidebar-target-label">Target</p>
          <p className="sidebar-target-value">{currentTargetLabel}</p>
          <p className="sidebar-copy">
            Select a research job to inspect the live backend state for that client and target.
          </p>
        </div>

        <form className="sidebar-panel form-panel" onSubmit={handleCreateResearchJob}>
          <div className="panel-heading">
            <h2>New client target</h2>
            <span className="pill">Research</span>
          </div>

          <label>
            Client
            <input
              value={researchForm.client_name ?? ""}
              onChange={(event) =>
                setResearchForm((current) => ({ ...current, client_name: event.target.value }))
              }
              placeholder="Jane Smith"
            />
          </label>

          <label>
            Target
            <input
              value={researchForm.candidate_name ?? ""}
              onChange={(event) =>
                setResearchForm((current) => ({ ...current, candidate_name: event.target.value }))
              }
              placeholder="Guido van Rossum"
              required
            />
          </label>

          <label>
            Company
            <input
              value={researchForm.company_name ?? ""}
              onChange={(event) =>
                setResearchForm((current) => ({ ...current, company_name: event.target.value }))
              }
              placeholder="Microsoft"
            />
          </label>

          <label>
            Role title
            <input
              value={researchForm.role_title ?? ""}
              onChange={(event) =>
                setResearchForm((current) => ({ ...current, role_title: event.target.value }))
              }
              placeholder="Distinguished Engineer"
            />
          </label>

          <label>
            Company domain
            <input
              value={researchForm.company_domain ?? ""}
              onChange={(event) =>
                setResearchForm((current) => ({ ...current, company_domain: event.target.value }))
              }
              placeholder="microsoft.com"
            />
          </label>

          <label>
            Search context
            <textarea
              value={researchForm.search_context ?? ""}
              onChange={(event) =>
                setResearchForm((current) => ({ ...current, search_context: event.target.value }))
              }
              rows={3}
            />
          </label>

          <label>
            Client profile JSON
            <textarea
              value={clientProfileText}
              onChange={(event) => setClientProfileText(event.target.value)}
              rows={6}
              className="font-mono"
            />
          </label>

          <button className="primary-button" disabled={submitting} type="submit">
            {submitting ? "Creating..." : "Create research job"}
          </button>
        </form>

        <section className="sidebar-panel workspace-panel">
          <div className="panel-heading">
            <h2>Workspace index</h2>
            <button className="ghost-button" onClick={() => void loadJobs(selectedJobId)} type="button">
              Refresh
            </button>
          </div>

          {jobsLoading ? <p className="muted">Loading research jobs...</p> : null}
          {jobsError ? <p className="error-text">{jobsError}</p> : null}

          <div className="workspace-list">
            {jobs.map((job) => {
              const isSelected = job.id === selectedJobId;

              return (
                <button
                  key={job.id}
                  className={`workspace-card${isSelected ? " workspace-card-active" : ""}`}
                  onClick={() => setSelectedJobId(job.id)}
                  type="button"
                >
                  <span className="workspace-client">{job.client_name || "Unassigned client"}</span>
                  <strong>{job.candidate_name}</strong>
                  <span className="workspace-meta">
                    {[job.role_title, job.company_name].filter(Boolean).join(" at ") || "Research target"}
                  </span>
                  <span className={`status-badge status-${normalizeStatus(job.status)}`}>{job.status}</span>
                </button>
              );
            })}
          </div>
        </section>
      </aside>

      <section className="main-panel">
        <div className="toolbar">
          <div>
            <p className="eyebrow">Selected workspace</p>
            <h2>{selectedJob ? `${selectedJob.client_name || "Unknown client"} / ${selectedJob.candidate_name}` : "No target selected"}</h2>
            <p className="muted">
              {selectedJob
                ? [selectedJob.role_title, selectedJob.company_name, selectedJob.company_domain]
                    .filter(Boolean)
                    .join(" • ") || "Target profile"
                : "Choose a research job from the left sidebar."}
            </p>
          </div>

          {selectedJob ? (
            <div className="action-strip">
              <button
                className="ghost-button"
                onClick={() =>
                  void runAction(async () => {
                    await api.refreshResearchJob(selectedJob.id);
                    await hydrateSelectedJob(selectedJob.id);
                    await loadJobs(selectedJob.id);
                  }, "Research refresh queued.")
                }
                type="button"
              >
                Refresh research
              </button>
              <button
                className="ghost-button"
                onClick={() =>
                  void runAction(async () => {
                    await api.createOpportunityJob(selectedJob.id);
                    await hydrateSelectedJob(selectedJob.id);
                  }, "Opportunity generation queued.")
                }
                type="button"
              >
                Generate opportunities
              </button>
              <button
                className="ghost-button"
                onClick={() =>
                  void runAction(async () => {
                    await api.createMonitorJob(selectedJob.id);
                    await hydrateSelectedJob(selectedJob.id);
                  }, "Monitor snapshot created.")
                }
                type="button"
              >
                Start monitor
              </button>
              <button
                className="ghost-button"
                onClick={() =>
                  void runAction(async () => {
                    await api.createBlogDraftJob(selectedJob.id, {
                      goal: "resonance",
                      draft_count: 2,
                      target_length: "medium",
                      client_name: selectedJob.client_name ?? undefined,
                      client_profile: selectedJob.client_profile_jsonb ?? undefined,
                      style_constraints: "Specific and technical.",
                      persona_constraints: "Do not imitate the target.",
                    });
                    await hydrateSelectedJob(selectedJob.id);
                  }, "Blog draft generation queued.")
                }
                type="button"
              >
                Generate blog drafts
              </button>
              <button
                className="ghost-button"
                onClick={() =>
                  void runAction(async () => {
                    await api.createPersonaPostJob(selectedJob.id, {
                      goal: "credibility",
                      draft_count: 2,
                      target_length: "medium",
                      client_name: selectedJob.client_name ?? undefined,
                      client_profile: selectedJob.client_profile_jsonb ?? undefined,
                      requested_angles: ["client_voice", "expert_commentary"],
                      style_constraints: "Technical and clear.",
                      persona_constraints: "Do not impersonate a real authority.",
                    });
                    await hydrateSelectedJob(selectedJob.id);
                  }, "Persona post generation queued.")
                }
                type="button"
              >
                Generate persona posts
              </button>
            </div>
          ) : null}
        </div>

        {actionMessage ? <div className="notice success">{actionMessage}</div> : null}
        {createError ? <div className="notice error">{createError}</div> : null}
        {jobError ? <div className="notice error">{jobError}</div> : null}

        {selectedJob ? (
          <div className="content-grid">
            <section className="surface surface-hero">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Research brief</p>
                  <h3>{selectedJob.candidate_name}</h3>
                </div>
                <span className={`status-badge status-${normalizeStatus(selectedJob.status)}`}>
                  {selectedJob.status}
                </span>
              </div>

              <div className="detail-grid">
                <Detail label="Client" value={selectedJob.client_name} />
                <Detail label="Target" value={selectedJob.candidate_name} />
                <Detail label="Role" value={selectedJob.role_title} />
                <Detail label="Company" value={selectedJob.company_name} />
                <Detail label="Updated" value={formatDateTime(selectedJob.updated_at)} />
                <Detail label="Context" value={selectedJob.search_context} />
              </div>

              <JsonPreview data={selectedJob.final_brief_jsonb} emptyLabel="No final brief yet." />
            </section>

            <section className="surface">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Sources</p>
                  <h3>Evidence trail</h3>
                </div>
                <span className="pill">{sources.items.length}</span>
              </div>
              <DataState loading={sources.loading} error={sources.error} empty={!sources.items.length}>
                <div className="stack-list">
                  {sources.items.map((source) => (
                    <article className="stack-card" key={source.id}>
                      <div className="row-between">
                        <strong>{source.title || source.url}</strong>
                        <span className="pill">{source.stage}</span>
                      </div>
                      <p className="muted small">{source.url}</p>
                      <p className="small">
                        {[source.source_type, formatScore(source.confidence, "confidence"), formatScore(source.ranking_score, "rank")].filter(Boolean).join(" • ")}
                      </p>
                    </article>
                  ))}
                </div>
              </DataState>
            </section>

            <section className="surface">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Opportunities</p>
                  <h3>{selectedOpportunityJob ? "Latest ranked actions" : "No opportunity job yet"}</h3>
                </div>
                {selectedOpportunityJob ? (
                  <span className={`status-badge status-${normalizeStatus(selectedOpportunityJob.status)}`}>
                    {selectedOpportunityJob.status}
                  </span>
                ) : null}
              </div>
              <DataState loading={opportunities.loading || opportunityJobs.loading} error={opportunities.error || opportunityJobs.error} empty={!opportunities.items.length}>
                <div className="stack-list">
                  {opportunities.items.map((item) => (
                    <article className="stack-card" key={item.id}>
                      <div className="row-between">
                        <strong>{item.title}</strong>
                        <span className="pill">{item.type}</span>
                      </div>
                      <p>{item.description}</p>
                      <p className="small muted">
                        {[item.theme, formatScore(item.priority_score, "priority"), formatScore(item.confidence, "confidence")].filter(Boolean).join(" • ")}
                      </p>
                      {item.why_now ? <p className="small">Why now: {item.why_now}</p> : null}
                    </article>
                  ))}
                </div>
              </DataState>
            </section>

            <section className="surface">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Monitoring</p>
                  <h3>{selectedMonitorJob ? "Signal changes" : "No monitor job yet"}</h3>
                </div>
                <div className="row-inline">
                  {selectedMonitorJob ? (
                    <span className={`status-badge status-${normalizeStatus(selectedMonitorJob.status)}`}>
                      {selectedMonitorJob.status}
                    </span>
                  ) : null}
                  {selectedMonitorJob ? (
                    <button
                      className="ghost-button"
                      onClick={() =>
                        void runAction(async () => {
                          await api.refreshMonitorJob(selectedMonitorJob.id);
                          await hydrateSelectedJob(selectedJob.id);
                        }, "Monitor refresh queued.")
                      }
                      type="button"
                    >
                      Refresh monitor
                    </button>
                  ) : null}
                </div>
              </div>
              <DataState loading={monitorEvents.loading || monitorJobs.loading} error={monitorEvents.error || monitorJobs.error} empty={!monitorEvents.items.length}>
                <div className="stack-list">
                  {monitorEvents.items.map((event) => (
                    <article className="stack-card" key={event.id}>
                      <div className="row-between">
                        <strong>{event.event_type}</strong>
                        <span className="pill">{formatDateTime(event.created_at)}</span>
                      </div>
                      <p>{event.change_summary}</p>
                      {event.recommended_followup ? (
                        <p className="small">Recommended follow-up: {event.recommended_followup}</p>
                      ) : null}
                    </article>
                  ))}
                </div>
              </DataState>
            </section>

            <section className="surface surface-wide">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Drafts</p>
                  <h3>{selectedDraftJob ? "Latest generated drafts" : "No draft job yet"}</h3>
                </div>
                {selectedDraftJob ? (
                  <span className={`status-badge status-${normalizeStatus(selectedDraftJob.status)}`}>
                    {selectedDraftJob.status}
                  </span>
                ) : null}
              </div>
              <DataState loading={drafts.loading || draftJobs.loading} error={drafts.error || draftJobs.error} empty={!drafts.items.length}>
                <div className="draft-list">
                  {drafts.items.map((draft) => (
                    <article className="draft-card" key={draft.id}>
                      <div className="row-between">
                        <div>
                          <p className="eyebrow">{draft.angle}</p>
                          <h4>{draft.title}</h4>
                        </div>
                        <span className="pill">{draft.author_mode}</span>
                      </div>
                      <p>{draft.summary}</p>
                      <p className="small muted">{draft.audience_fit_rationale}</p>
                      <pre className="markdown-block">{draft.body_markdown}</pre>
                    </article>
                  ))}
                </div>
              </DataState>
            </section>
          </div>
        ) : (
          <div className="empty-state">
            <p className="eyebrow">No selection</p>
            <h3>Create or choose a client target</h3>
            <p>The left sidebar owns the current client and target. The main body becomes a dedicated workspace for that selection.</p>
          </div>
        )}
      </section>
    </main>
  );
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="detail-card">
      <span>{label}</span>
      <strong>{value || "Not set"}</strong>
    </div>
  );
}

function JsonPreview({
  data,
  emptyLabel,
}: {
  data: unknown;
  emptyLabel: string;
}) {
  if (!data) {
    return <p className="muted">{emptyLabel}</p>;
  }

  return <pre className="json-preview">{JSON.stringify(data, null, 2)}</pre>;
}

function DataState({
  children,
  empty,
  error,
  loading,
}: {
  children: ReactNode;
  empty: boolean;
  error: string | null;
  loading: boolean;
}) {
  if (loading) {
    return <p className="muted">Loading...</p>;
  }

  if (error) {
    return <p className="error-text">{error}</p>;
  }

  if (empty) {
    return <p className="muted">Nothing to show yet.</p>;
  }

  return <>{children}</>;
}

function parseJsonRecord(input: string) {
  const trimmed = input.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = JSON.parse(trimmed) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Client profile JSON must be an object");
  }

  return parsed as Record<string, unknown>;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong.";
}

function toOptional(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatScore(value: number | null, label: string) {
  if (value === null || value === undefined) {
    return null;
  }

  return `${label} ${value.toFixed(2)}`;
}

function normalizeStatus(status: string) {
  return status.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}
