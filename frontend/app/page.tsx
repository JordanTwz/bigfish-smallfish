"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type ResearchJobCreate = {
  candidate_name: string;
  company_name: string | null;
  company_domain: string | null;
  role_title: string | null;
  search_context: string | null;
};

type ResearchJobResponse = {
  id: string;
  status: string;
  candidate_name: string;
  company_name: string | null;
  company_domain: string | null;
  role_title: string | null;
  search_context: string | null;
  final_brief_jsonb: Record<string, unknown> | null;
  error_jsonb: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  finished_at: string | null;
};

type SourceCandidateResponse = {
  id: string;
  research_job_id: string;
  url: string;
  normalized_url: string | null;
  title: string | null;
  source_type: string | null;
  stage: string;
  confidence: number | null;
  ranking_score: number | null;
  evidence_jsonb: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type IntakeState = {
  candidateName: string;
  companyName: string;
  companyDomain: string;
  roleTitle: string;
  searchContext: string;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

const initialForm: IntakeState = {
  candidateName: "Jane Doe",
  companyName: "ExampleCo",
  companyDomain: "example.com",
  roleTitle: "Software Engineer Intern",
  searchContext: "Technical screen for a backend/platform role",
};

const activeStatuses = new Set(["queued", "discovering", "extracting", "scoring"]);
const terminalStatuses = new Set(["completed", "partial", "failed"]);

const pipelineDefinitions = [
  {
    name: "Queued",
    detail: "The backend has accepted the request and is waiting to dispatch discovery work.",
    matches: ["queued"],
  },
  {
    name: "Discovery",
    detail: "TinyFish fans out targeted searches to identify likely public profiles and references.",
    matches: ["discovering"],
  },
  {
    name: "Extraction",
    detail: "High-confidence pages are revisited to pull structured facts and evidence.",
    matches: ["extracting"],
  },
  {
    name: "Scoring",
    detail: "The backend reconciles signals across pages and ranks source confidence.",
    matches: ["scoring"],
  },
  {
    name: "Complete",
    detail: "The final brief is available, or the run has ended with a partial or failed state.",
    matches: ["completed", "partial", "failed"],
  },
] as const;

function compactObject(value: Record<string, unknown> | null) {
  return value ? JSON.stringify(value, null, 2) : null;
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not finished";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function normalizePayload(form: IntakeState): ResearchJobCreate {
  const toNullable = (value: string) => {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  return {
    candidate_name: form.candidateName.trim(),
    company_name: toNullable(form.companyName),
    company_domain: toNullable(form.companyDomain),
    role_title: toNullable(form.roleTitle),
    search_context: toNullable(form.searchContext),
  };
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export default function Home() {
  const [form, setForm] = useState<IntakeState>(initialForm);
  const [job, setJob] = useState<ResearchJobResponse | null>(null);
  const [sources, setSources] = useState<SourceCandidateResponse[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!job || !activeStatuses.has(job.status)) {
      return;
    }

    const intervalId = window.setInterval(async () => {
      try {
        const [nextJob, nextSources] = await Promise.all([
          apiRequest<ResearchJobResponse>(`/research-jobs/${job.id}`),
          apiRequest<SourceCandidateResponse[]>(`/research-jobs/${job.id}/sources`),
        ]);

        setJob(nextJob);
        setSources(nextSources);
      } catch (pollError) {
        setError(
          pollError instanceof Error ? pollError.message : "Failed to refresh job state.",
        );
      }
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, [job]);

  const briefJson = useMemo(() => compactObject(job?.final_brief_jsonb ?? null), [job]);
  const errorJson = useMemo(() => compactObject(job?.error_jsonb ?? null), [job]);

  const pipelineSteps = useMemo(() => {
    const status = job?.status ?? "idle";

    return pipelineDefinitions.map((step) => {
      let state = "Queued";
      const matchesCurrentStatus = step.matches.some((match) => match === status);

      if (matchesCurrentStatus) {
        state = terminalStatuses.has(status) && status !== "completed" ? status : "Running";
      } else {
        const stepIndex = pipelineDefinitions.findIndex((item) => item.name === step.name);
        const activeIndex = pipelineDefinitions.findIndex((item) =>
          item.matches.some((match) => match === status),
        );
        if (activeIndex > stepIndex || (status === "completed" && step.name !== "Complete")) {
          state = "Complete";
        }
      }

      if (status === "completed" && step.name === "Complete") {
        state = "Complete";
      }

      return { ...step, state };
    });
  }, [job]);

  async function hydrateJob(jobId: string) {
    const [nextJob, nextSources] = await Promise.all([
      apiRequest<ResearchJobResponse>(`/research-jobs/${jobId}`),
      apiRequest<SourceCandidateResponse[]>(`/research-jobs/${jobId}/sources`),
    ]);

    setJob(nextJob);
    setSources(nextSources);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSources([]);

    try {
      const payload = normalizePayload(form);
      if (!payload.candidate_name) {
        throw new Error("Candidate name is required.");
      }

      const createdJob = await apiRequest<ResearchJobResponse>("/research-jobs", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setJob(createdJob);
      await hydrateJob(createdJob.id);
    } catch (submitError) {
      setJob(null);
      setError(
        submitError instanceof Error ? submitError.message : "Failed to create research job.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRefresh() {
    if (!job) {
      return;
    }

    setRefreshing(true);
    setError(null);

    try {
      const refreshedJob = await apiRequest<ResearchJobResponse>(
        `/research-jobs/${job.id}/refresh`,
        { method: "POST" },
      );
      setJob(refreshedJob);
      await hydrateJob(refreshedJob.id);
    } catch (refreshError) {
      setError(
        refreshError instanceof Error ? refreshError.message : "Failed to refresh job.",
      );
    } finally {
      setRefreshing(false);
    }
  }

  const sourceCount = sources.length;
  const completedSources = sources.filter((source) => source.stage === "extracted").length;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(252,192,116,0.35),_transparent_36%),radial-gradient(circle_at_82%_18%,_rgba(81,112,255,0.2),_transparent_28%),linear-gradient(180deg,_#f5efe6_0%,_#f3f7fb_50%,_#eef2f6_100%)] text-slate-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[32px] border border-white/70 bg-[linear-gradient(135deg,_rgba(16,24,40,0.96),_rgba(24,37,57,0.92))] px-6 py-8 text-white shadow-[0_30px_80px_rgba(15,23,42,0.18)] sm:px-8 lg:px-10">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-6">
              <div className="inline-flex items-center rounded-full border border-white/15 bg-white/8 px-3 py-1 text-xs font-medium tracking-[0.2em] text-white/72 uppercase">
                AI Interviewer Research Agent
              </div>
              <div className="space-y-4">
                <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.04em] sm:text-5xl lg:text-6xl">
                  Prep for the person behind the interview, not just the role.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-200 sm:text-lg">
                  The frontend now submits real research jobs to the FastAPI backend and
                  streams the state back into this dashboard.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-3xl border border-white/12 bg-white/6 p-4 backdrop-blur">
                  <p className="text-sm text-slate-300">Discovered sources</p>
                  <p className="mt-3 text-3xl font-semibold">{sourceCount}</p>
                  <p className="mt-2 text-sm text-slate-400">
                    Live count from `GET /research-jobs/:id/sources`.
                  </p>
                </div>
                <div className="rounded-3xl border border-white/12 bg-white/6 p-4 backdrop-blur">
                  <p className="text-sm text-slate-300">Extracted sources</p>
                  <p className="mt-3 text-3xl font-semibold">{completedSources}</p>
                  <p className="mt-2 text-sm text-slate-400">
                    Sources with extracted evidence ready for scoring.
                  </p>
                </div>
                <div className="rounded-3xl border border-white/12 bg-white/6 p-4 backdrop-blur">
                  <p className="text-sm text-slate-300">Job status</p>
                  <p className="mt-3 text-3xl font-semibold capitalize">
                    {job?.status ?? "idle"}
                  </p>
                  <p className="mt-2 text-sm text-slate-400">
                    Polls every 3 seconds while the backend is still working.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/12 bg-white/8 p-5 backdrop-blur-xl">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-200">Live job view</p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">
                    Research status
                  </h2>
                </div>
                <span className="rounded-full bg-emerald-400/18 px-3 py-1 text-xs font-medium text-emerald-200">
                  {job ? job.id.slice(0, 8) : "No job"}
                </span>
              </div>
              <div className="mt-5 space-y-4">
                {pipelineSteps.map((step, index) => (
                  <div
                    key={step.name}
                    className="rounded-2xl border border-white/10 bg-slate-950/18 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-slate-100">
                            {index + 1}
                          </span>
                          <h3 className="text-base font-semibold text-white">{step.name}</h3>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-slate-300">
                          {step.detail}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                          step.state === "Complete"
                            ? "bg-emerald-300/20 text-emerald-100"
                            : step.state === "Running"
                              ? "bg-amber-300/18 text-amber-100"
                              : step.state === "failed"
                                ? "bg-rose-300/20 text-rose-100"
                                : "bg-white/10 text-slate-200"
                        }`}
                      >
                        {step.state}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <form
            onSubmit={handleSubmit}
            className="rounded-[28px] border border-slate-200/80 bg-white/82 p-6 shadow-[0_24px_60px_rgba(148,163,184,0.16)] backdrop-blur sm:p-7"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">Input form</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">
                  Research request
                </h2>
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isSubmitting ? "Submitting..." : "Run research"}
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <span className="text-sm font-medium text-slate-700">Candidate name</span>
                <input
                  required
                  value={form.candidateName}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, candidateName: event.target.value }))
                  }
                  className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none"
                />
                <span className="text-xs leading-5 text-slate-500">
                  Required. This maps to `candidate_name`.
                </span>
              </label>

              <label className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <span className="text-sm font-medium text-slate-700">Company name</span>
                <input
                  value={form.companyName}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, companyName: event.target.value }))
                  }
                  className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none"
                />
                <span className="text-xs leading-5 text-slate-500">
                  Optional, but it improves identity resolution.
                </span>
              </label>

              <label className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <span className="text-sm font-medium text-slate-700">Company domain</span>
                <input
                  value={form.companyDomain}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, companyDomain: event.target.value }))
                  }
                  className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none"
                />
                <span className="text-xs leading-5 text-slate-500">
                  Optional. Example: `example.com`.
                </span>
              </label>

              <label className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <span className="text-sm font-medium text-slate-700">Role title</span>
                <input
                  value={form.roleTitle}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, roleTitle: event.target.value }))
                  }
                  className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none"
                />
                <span className="text-xs leading-5 text-slate-500">
                  Optional. Helps infer the likely interview angle.
                </span>
              </label>
            </div>

            <label className="mt-4 flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <span className="text-sm font-medium text-slate-700">Search context</span>
              <textarea
                value={form.searchContext}
                onChange={(event) =>
                  setForm((current) => ({ ...current, searchContext: event.target.value }))
                }
                rows={5}
                className="resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm leading-6 text-slate-900 outline-none"
              />
              <span className="text-xs leading-5 text-slate-500">
                Optional context that the backend can use to shape the research.
              </span>
            </label>

            <div className="mt-6 grid gap-3 rounded-3xl bg-slate-950 p-5 text-slate-50">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-lg font-semibold">API configuration</h3>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">
                  Browser client
                </span>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-slate-300">
                {API_BASE_URL}
              </div>
              <p className="text-sm leading-6 text-slate-300">
                Override with `NEXT_PUBLIC_API_BASE_URL` if your backend is not on
                `http://localhost:8000`.
              </p>
            </div>

            {error ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                {error}
              </div>
            ) : null}
          </form>

          <div className="space-y-8">
            <section className="rounded-[28px] border border-slate-200/80 bg-white/84 p-6 shadow-[0_24px_60px_rgba(148,163,184,0.16)] backdrop-blur sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">MVP output</p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">
                    Interviewer prep brief
                  </h2>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleRefresh}
                    disabled={!job || refreshing}
                    className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {refreshing ? "Refreshing..." : "Requeue / Refresh"}
                  </button>
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                    Finished: <span className="font-semibold">{formatDate(job?.finished_at ?? null)}</span>
                  </div>
                </div>
              </div>

              {job ? (
                <div className="mt-6 space-y-6">
                  <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
                    <div className="rounded-3xl bg-slate-950 p-5 text-slate-50">
                      <p className="text-sm text-slate-400">Job subject</p>
                      <h3 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
                        {job.candidate_name}
                      </h3>
                      <p className="mt-2 text-lg text-slate-200">
                        {job.role_title ?? "Role not provided"}
                        {job.company_name ? ` at ${job.company_name}` : ""}
                      </p>
                      <p className="mt-4 text-sm leading-6 text-slate-300">
                        {job.search_context ?? "No extra search context was provided."}
                      </p>
                      <div className="mt-5 flex flex-wrap gap-2">
                        {[job.status, job.company_domain ?? "no-domain", job.id.slice(0, 8)].map(
                          (tag) => (
                            <span
                              key={tag}
                              className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-slate-100"
                            >
                              {tag}
                            </span>
                          ),
                        )}
                      </div>
                    </div>

                    <div className="grid gap-3">
                      {[
                        { label: "Status", value: job.status },
                        { label: "Created", value: formatDate(job.created_at) },
                        { label: "Updated", value: formatDate(job.updated_at) },
                        { label: "Sources", value: String(sourceCount) },
                      ].map((signal) => (
                        <div
                          key={signal.label}
                          className="rounded-3xl border border-slate-200 bg-slate-50/90 p-4"
                        >
                          <p className="text-sm text-slate-500">{signal.label}</p>
                          <p className="mt-3 text-lg font-semibold text-slate-900 capitalize">
                            {signal.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-6 xl:grid-cols-2">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-950">Final brief JSON</h3>
                      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-950 p-4 text-sm leading-6 text-slate-100">
                        <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono">
                          {briefJson ?? "No final brief returned yet."}
                        </pre>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-slate-950">Error JSON</h3>
                      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700 shadow-sm">
                        <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono">
                          {errorJson ?? "No backend error payload."}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50/80 p-6 text-sm leading-6 text-slate-600">
                  Submit a research request to create a backend job and populate this panel.
                </div>
              )}
            </section>

            <section className="rounded-[28px] border border-slate-200/80 bg-white/84 p-6 shadow-[0_24px_60px_rgba(148,163,184,0.16)] backdrop-blur sm:p-7">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">Evidence cards</p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">
                    Source review
                  </h2>
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                  Live backend data
                </span>
              </div>
              <div className="mt-6 space-y-4">
                {sources.length > 0 ? (
                  sources.map((source) => (
                    <article
                      key={source.id}
                      className="rounded-3xl border border-slate-200 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(248,250,252,0.98))] p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-medium tracking-[0.16em] text-slate-500 uppercase">
                            {source.source_type ?? source.stage}
                          </p>
                          <h3 className="mt-2 text-xl font-semibold text-slate-950">
                            {source.title ?? source.normalized_url ?? source.url}
                          </h3>
                        </div>
                        <div className="rounded-2xl bg-slate-950 px-4 py-2 text-sm text-white">
                          Confidence {source.confidence?.toFixed(2) ?? "n/a"}
                        </div>
                      </div>
                      <p className="mt-4 break-all text-sm leading-6 text-slate-600">
                        {source.url}
                      </p>
                      <div className="mt-5 flex flex-wrap gap-3">
                        <div className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">
                          Stage: {source.stage}
                        </div>
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border border-slate-950 bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                        >
                          Open source
                        </a>
                      </div>
                      {source.evidence_jsonb ? (
                        <pre className="mt-4 overflow-x-auto rounded-2xl bg-slate-50 p-4 font-mono text-xs leading-5 text-slate-700">
                          {JSON.stringify(source.evidence_jsonb, null, 2)}
                        </pre>
                      ) : null}
                    </article>
                  ))
                ) : (
                  <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/80 p-6 text-sm leading-6 text-slate-600">
                    No sources yet. They will appear here as the backend progresses through discovery and extraction.
                  </div>
                )}
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
