import type {
  BlogDraftJobResponse,
  BlogDraftResponse,
  MonitorEventResponse,
  MonitorJobResponse,
  OpportunityJobResponse,
  OpportunityResponse,
  ResearchJobResponse,
  SourceCandidateResponse,
} from "./types";

export const STORAGE_KEY = "bigfish-smallfish-workspace-v3";
export const RESEARCH_ACTIVE = new Set(["queued", "discovering", "extracting", "scoring"]);
export const ASYNC_ACTIVE = new Set(["queued", "ranking", "profiling", "outlining", "drafting", "checking"]);
export const workspaceSections = ["brief", "evidence", "opportunities", "monitoring", "drafts"] as const;

export type WorkspaceSection = (typeof workspaceSections)[number];

export type WorkspaceSummary = {
  id: string;
  createdAt: string;
  title: string;
  candidateName: string;
  companyName: string;
  companyDomain: string;
  roleTitle: string;
  searchContext: string;
  clientName: string;
  clientRole: string;
  clientInterests: string;
  clientStrengths: string;
  researchJobId: string | null;
  researchJob: ResearchJobResponse | null;
  sources: SourceCandidateResponse[];
  opportunityJobId: string | null;
  opportunityJob: OpportunityJobResponse | null;
  opportunities: OpportunityResponse[];
  monitorJobId: string | null;
  monitorJob: MonitorJobResponse | null;
  monitorEvents: MonitorEventResponse[];
  blogJobId: string | null;
  blogJob: BlogDraftJobResponse | null;
  blogDrafts: BlogDraftResponse[];
  personaJobId: string | null;
  personaJob: BlogDraftJobResponse | null;
  personaDrafts: BlogDraftResponse[];
  lastError: string | null;
};

export type IntakeForm = {
  title: string;
  candidateName: string;
  companyName: string;
  companyDomain: string;
  roleTitle: string;
  searchContext: string;
  clientName: string;
  clientRole: string;
  clientInterests: string;
  clientStrengths: string;
};

export type DraftForm = {
  goal: string;
  draftCount: string;
  targetLength: string;
  styleConstraints: string;
  personaConstraints: string;
  requestedAngles: string;
};

export const initialIntake: IntakeForm = {
  title: "Distributed systems target",
  candidateName: "Guido van Rossum",
  companyName: "Microsoft",
  companyDomain: "microsoft.com",
  roleTitle: "Distinguished Engineer",
  searchContext: "Public professional profile research for credibility-building and tailored writing.",
  clientName: "Kenneth",
  clientRole: "Backend engineer",
  clientInterests: "distributed systems, observability, developer tools",
  clientStrengths: "systems thinking, technical writing, backend implementation",
};

export const defaultDraftForm: DraftForm = {
  goal: "credibility",
  draftCount: "2",
  targetLength: "medium",
  styleConstraints: "Technical, specific, and grounded in concrete engineering detail.",
  personaConstraints: "Do not imitate the target. Do not invent credentials or endorsements.",
  requestedAngles: "client_voice, expert_commentary",
};

export function makeWorkspaceId() {
  return `ws-${Math.random().toString(36).slice(2, 10)}`;
}

export function normalizeNullable(value: string) {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export function splitCsv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function workspaceStatus(workspace: WorkspaceSummary) {
  return workspace.researchJob?.status ?? "not started";
}

export function isWorkspaceBusy(workspace: WorkspaceSummary) {
  return (
    (workspace.researchJob && RESEARCH_ACTIVE.has(workspace.researchJob.status)) ||
    (workspace.opportunityJob && ASYNC_ACTIVE.has(workspace.opportunityJob.status)) ||
    (workspace.monitorJob && ASYNC_ACTIVE.has(workspace.monitorJob.status)) ||
    (workspace.blogJob && ASYNC_ACTIVE.has(workspace.blogJob.status)) ||
    (workspace.personaJob && ASYNC_ACTIVE.has(workspace.personaJob.status))
  );
}

export function readStringList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

export function readRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function scoreText(value: number | null | undefined) {
  if (typeof value !== "number") {
    return "n/a";
  }
  return `${Math.round(value * 100)}%`;
}

export function formatDate(value: string | null | undefined) {
  if (!value) {
    return "n/a";
  }
  return new Date(value).toLocaleString();
}

export function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}
