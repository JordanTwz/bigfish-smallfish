import type {
  BlogDraftJobCreate,
  BlogDraftJobResponse,
  BlogDraftResponse,
  MonitorEventResponse,
  MonitorJobCreate,
  MonitorJobResponse,
  OpportunityJobResponse,
  OpportunityResponse,
  ResearchJobCreate,
  ResearchJobResponse,
  RunCreate,
  RunResponse,
  SourceCandidateResponse,
} from "./types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
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

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export async function getHealth() {
  return request<{ status: string }>("/health");
}

export async function listRuns() {
  return request<RunResponse[]>("/runs");
}

export async function createRun(payload: RunCreate) {
  return request<RunResponse>("/runs", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getRun(runId: string) {
  return request<RunResponse>(`/runs/${runId}`);
}

export async function createResearchJob(payload: ResearchJobCreate) {
  return request<ResearchJobResponse>("/research-jobs", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getResearchJob(jobId: string) {
  return request<ResearchJobResponse>(`/research-jobs/${jobId}`);
}

export async function listResearchSources(jobId: string) {
  return request<SourceCandidateResponse[]>(`/research-jobs/${jobId}/sources`);
}

export async function refreshResearchJob(jobId: string) {
  return request<ResearchJobResponse>(`/research-jobs/${jobId}/refresh`, {
    method: "POST",
  });
}

export async function createOpportunityJob(jobId: string) {
  return request<OpportunityJobResponse>(`/research-jobs/${jobId}/opportunities`, {
    method: "POST",
  });
}

export async function getOpportunityJob(jobId: string) {
  return request<OpportunityJobResponse>(`/opportunity-jobs/${jobId}`);
}

export async function listOpportunityItems(jobId: string) {
  return request<OpportunityResponse[]>(`/opportunity-jobs/${jobId}/items`);
}

export async function createMonitorJob(jobId: string, payload: MonitorJobCreate) {
  return request<MonitorJobResponse>(`/research-jobs/${jobId}/monitor`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getMonitorJob(jobId: string) {
  return request<MonitorJobResponse>(`/monitor-jobs/${jobId}`);
}

export async function listMonitorEvents(jobId: string) {
  return request<MonitorEventResponse[]>(`/monitor-jobs/${jobId}/events`);
}

export async function refreshMonitorJob(jobId: string) {
  return request<MonitorJobResponse>(`/monitor-jobs/${jobId}/refresh`, {
    method: "POST",
  });
}

export async function createBlogDraftJob(jobId: string, payload: BlogDraftJobCreate) {
  return request<BlogDraftJobResponse>(`/research-jobs/${jobId}/blog-drafts`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getBlogDraftJob(jobId: string) {
  return request<BlogDraftJobResponse>(`/blog-draft-jobs/${jobId}`);
}

export async function listBlogDrafts(jobId: string) {
  return request<BlogDraftResponse[]>(`/blog-draft-jobs/${jobId}/drafts`);
}

export async function refreshBlogDraftJob(jobId: string) {
  return request<BlogDraftJobResponse>(`/blog-draft-jobs/${jobId}/refresh`, {
    method: "POST",
  });
}

export async function createPersonaPostJob(jobId: string, payload: BlogDraftJobCreate) {
  return request<BlogDraftJobResponse>(`/research-jobs/${jobId}/persona-post-jobs`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getPersonaPostJob(jobId: string) {
  return request<BlogDraftJobResponse>(`/persona-post-jobs/${jobId}`);
}

export async function listPersonaPostDrafts(jobId: string) {
  return request<BlogDraftResponse[]>(`/persona-post-jobs/${jobId}/drafts`);
}

export async function refreshPersonaPostJob(jobId: string) {
  return request<BlogDraftJobResponse>(`/persona-post-jobs/${jobId}/refresh`, {
    method: "POST",
  });
}
