import type {
  BlogDraft,
  BlogDraftJob,
  BlogDraftJobCreatePayload,
  MonitorEvent,
  MonitorJob,
  Opportunity,
  OpportunityJob,
  ResearchJob,
  ResearchJobCreatePayload,
  SourceCandidate,
} from "@/lib/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await readError(response);
    throw new Error(detail);
  }

  return (await response.json()) as T;
}

async function readError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { detail?: string };
    if (payload.detail) {
      return payload.detail;
    }
  } catch {
    return `${response.status} ${response.statusText}`;
  }

  return `${response.status} ${response.statusText}`;
}

export const api = {
  listResearchJobs() {
    return request<ResearchJob[]>("/research-jobs");
  },
  getResearchJob(jobId: string) {
    return request<ResearchJob>(`/research-jobs/${jobId}`);
  },
  createResearchJob(payload: ResearchJobCreatePayload) {
    return request<ResearchJob>("/research-jobs", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  refreshResearchJob(jobId: string) {
    return request<ResearchJob>(`/research-jobs/${jobId}/refresh`, {
      method: "POST",
    });
  },
  listSources(jobId: string) {
    return request<SourceCandidate[]>(`/research-jobs/${jobId}/sources`);
  },
  listOpportunityJobs(jobId: string) {
    return request<OpportunityJob[]>(`/research-jobs/${jobId}/opportunity-jobs`);
  },
  createOpportunityJob(jobId: string) {
    return request<OpportunityJob>(`/research-jobs/${jobId}/opportunities`, {
      method: "POST",
    });
  },
  listOpportunities(opportunityJobId: string) {
    return request<Opportunity[]>(`/opportunity-jobs/${opportunityJobId}/items`);
  },
  listMonitorJobs(jobId: string) {
    return request<MonitorJob[]>(`/research-jobs/${jobId}/monitor-jobs`);
  },
  createMonitorJob(jobId: string) {
    return request<MonitorJob>(`/research-jobs/${jobId}/monitor`, {
      method: "POST",
      body: JSON.stringify({ cadence: "manual" }),
    });
  },
  refreshMonitorJob(monitorJobId: string) {
    return request<MonitorJob>(`/monitor-jobs/${monitorJobId}/refresh`, {
      method: "POST",
    });
  },
  listMonitorEvents(monitorJobId: string) {
    return request<MonitorEvent[]>(`/monitor-jobs/${monitorJobId}/events`);
  },
  listBlogDraftJobs(jobId: string) {
    return request<BlogDraftJob[]>(`/research-jobs/${jobId}/blog-draft-jobs`);
  },
  createBlogDraftJob(jobId: string, payload: BlogDraftJobCreatePayload) {
    return request<BlogDraftJob>(`/research-jobs/${jobId}/blog-drafts`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  createPersonaPostJob(jobId: string, payload: BlogDraftJobCreatePayload) {
    return request<BlogDraftJob>(`/research-jobs/${jobId}/persona-post-jobs`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  listBlogDrafts(blogDraftJobId: string) {
    return request<BlogDraft[]>(`/blog-draft-jobs/${blogDraftJobId}/drafts`);
  },
  listPersonaDrafts(blogDraftJobId: string) {
    return request<BlogDraft[]>(`/persona-post-jobs/${blogDraftJobId}/drafts`);
  },
};
