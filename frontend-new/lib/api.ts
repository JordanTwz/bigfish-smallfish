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
  SourceCandidateResponse,
} from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown network error";
    throw new Error(`Could not reach the backend at ${API_BASE_URL}. ${message}`);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export function createResearchJob(payload: ResearchJobCreate) {
  return request<ResearchJobResponse>("/research-jobs", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getResearchJob(jobId: string) {
  return request<ResearchJobResponse>(`/research-jobs/${jobId}`);
}

export function listResearchSources(jobId: string) {
  return request<SourceCandidateResponse[]>(`/research-jobs/${jobId}/sources`);
}

export function refreshResearchJob(jobId: string) {
  return request<ResearchJobResponse>(`/research-jobs/${jobId}/refresh`, {
    method: "POST",
  });
}

export function createOpportunityJob(jobId: string) {
  return request<OpportunityJobResponse>(`/research-jobs/${jobId}/opportunities`, {
    method: "POST",
  });
}

export function getOpportunityJob(jobId: string) {
  return request<OpportunityJobResponse>(`/opportunity-jobs/${jobId}`);
}

export function listOpportunityItems(jobId: string) {
  return request<OpportunityResponse[]>(`/opportunity-jobs/${jobId}/items`);
}

export function createMonitorJob(jobId: string, payload: MonitorJobCreate) {
  return request<MonitorJobResponse>(`/research-jobs/${jobId}/monitor`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getMonitorJob(jobId: string) {
  return request<MonitorJobResponse>(`/monitor-jobs/${jobId}`);
}

export function listMonitorEvents(jobId: string) {
  return request<MonitorEventResponse[]>(`/monitor-jobs/${jobId}/events`);
}

export function refreshMonitorJob(jobId: string) {
  return request<MonitorJobResponse>(`/monitor-jobs/${jobId}/refresh`, {
    method: "POST",
  });
}

export function createBlogDraftJob(jobId: string, payload: BlogDraftJobCreate) {
  return request<BlogDraftJobResponse>(`/research-jobs/${jobId}/blog-drafts`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getBlogDraftJob(jobId: string) {
  return request<BlogDraftJobResponse>(`/blog-draft-jobs/${jobId}`);
}

export function listBlogDrafts(jobId: string) {
  return request<BlogDraftResponse[]>(`/blog-draft-jobs/${jobId}/drafts`);
}

export function refreshBlogDraftJob(jobId: string) {
  return request<BlogDraftJobResponse>(`/blog-draft-jobs/${jobId}/refresh`, {
    method: "POST",
  });
}

export function createPersonaPostJob(jobId: string, payload: BlogDraftJobCreate) {
  return request<BlogDraftJobResponse>(`/research-jobs/${jobId}/persona-post-jobs`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getPersonaPostJob(jobId: string) {
  return request<BlogDraftJobResponse>(`/persona-post-jobs/${jobId}`);
}

export function listPersonaPostDrafts(jobId: string) {
  return request<BlogDraftResponse[]>(`/persona-post-jobs/${jobId}/drafts`);
}

export function refreshPersonaPostJob(jobId: string) {
  return request<BlogDraftJobResponse>(`/persona-post-jobs/${jobId}/refresh`, {
    method: "POST",
  });
}
