"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import {
  createBlogDraftJob,
  createMonitorJob,
  createOpportunityJob,
  createPersonaPostJob,
  createResearchJob,
  getBlogDraftJob,
  getMonitorJob,
  getOpportunityJob,
  getPersonaPostJob,
  getResearchJob,
  listBlogDrafts,
  listMonitorEvents,
  listOpportunityItems,
  listPersonaPostDrafts,
  listResearchBlogDraftJobs,
  listResearchJobs,
  listResearchMonitorJobs,
  listResearchOpportunityJobs,
  listResearchSources,
  refreshBlogDraftJob,
  refreshMonitorJob,
  refreshPersonaPostJob,
  refreshResearchJob,
} from "@/lib/api";
import type {
  BlogDraftJobCreate,
  ResearchJobCreate,
  ResearchJobResponse,
} from "@/lib/types";
import { isWorkspaceBusy, makeWorkspaceId, STORAGE_KEY, type WorkspaceSummary } from "@/lib/workspaces";

type WorkspaceContextValue = {
  workspaces: WorkspaceSummary[];
  ready: boolean;
  globalError: string | null;
  pendingAction: string | null;
  createWorkspace: (input: {
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
    payload: ResearchJobCreate;
  }) => Promise<string>;
  getWorkspace: (workspaceId: string) => WorkspaceSummary | null;
  refreshWorkspace: (workspaceId: string) => Promise<void>;
  refreshResearch: (workspaceId: string) => Promise<void>;
  createOpportunityRun: (workspaceId: string) => Promise<void>;
  createMonitorRun: (workspaceId: string) => Promise<void>;
  refreshMonitorRun: (workspaceId: string) => Promise<void>;
  createBlogRun: (workspaceId: string, payload: BlogDraftJobCreate) => Promise<void>;
  refreshBlogRun: (workspaceId: string) => Promise<void>;
  createPersonaRun: (workspaceId: string, payload: BlogDraftJobCreate) => Promise<void>;
  refreshPersonaRun: (workspaceId: string) => Promise<void>;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

function latestItem<T extends { created_at: string }>(items: T[]) {
  return items[0] ?? null;
}

function createWorkspaceSkeleton(
  researchJob: ResearchJobResponse,
  existing?: WorkspaceSummary | null,
): WorkspaceSummary {
  return {
    id: existing?.id ?? makeWorkspaceId(),
    createdAt: existing?.createdAt ?? researchJob.created_at,
    title:
      existing?.title ??
      [researchJob.candidate_name, researchJob.company_name].filter(Boolean).join(" · ") ??
      researchJob.candidate_name,
    candidateName: researchJob.candidate_name,
    companyName: researchJob.company_name ?? "",
    companyDomain: researchJob.company_domain ?? "",
    roleTitle: researchJob.role_title ?? "",
    searchContext: researchJob.search_context ?? "",
    clientName: researchJob.client_name ?? existing?.clientName ?? "",
    clientRole:
      existing?.clientRole ??
      (typeof researchJob.client_profile_jsonb?.current_role === "string"
        ? researchJob.client_profile_jsonb.current_role
        : ""),
    clientInterests:
      existing?.clientInterests ??
      ((researchJob.client_profile_jsonb?.interests as string[] | undefined)?.join(", ") ?? ""),
    clientStrengths:
      existing?.clientStrengths ??
      ((researchJob.client_profile_jsonb?.strengths as string[] | undefined)?.join(", ") ?? ""),
    researchJobId: researchJob.id,
    researchJob,
    sources: existing?.sources ?? [],
    opportunityJobsHistory: existing?.opportunityJobsHistory ?? [],
    opportunityJobId: existing?.opportunityJobId ?? null,
    opportunityJob: existing?.opportunityJob ?? null,
    opportunities: existing?.opportunities ?? [],
    monitorJobsHistory: existing?.monitorJobsHistory ?? [],
    monitorJobId: existing?.monitorJobId ?? null,
    monitorJob: existing?.monitorJob ?? null,
    monitorEvents: existing?.monitorEvents ?? [],
    draftJobsHistory: existing?.draftJobsHistory ?? [],
    blogJobId: existing?.blogJobId ?? null,
    blogJob: existing?.blogJob ?? null,
    blogDrafts: existing?.blogDrafts ?? [],
    personaJobId: existing?.personaJobId ?? null,
    personaJob: existing?.personaJob ?? null,
    personaDrafts: existing?.personaDrafts ?? [],
    lastError: existing?.lastError ?? null,
  };
}

async function hydrateWorkspace(
  researchJob: ResearchJobResponse,
  existing?: WorkspaceSummary | null,
): Promise<WorkspaceSummary> {
  const base = createWorkspaceSkeleton(researchJob, existing);
  const [sources, opportunityJobsHistory, monitorJobsHistory, draftJobsHistory] = await Promise.all([
    listResearchSources(researchJob.id),
    listResearchOpportunityJobs(researchJob.id),
    listResearchMonitorJobs(researchJob.id),
    listResearchBlogDraftJobs(researchJob.id),
  ]);

  const latestOpportunity = latestItem(opportunityJobsHistory);
  const latestMonitor = latestItem(monitorJobsHistory);
  const latestDraftJob = latestItem(draftJobsHistory);

  const [opportunityJob, opportunities, monitorJob, monitorEvents, blogJob, blogDrafts, personaJob, personaDrafts] =
    await Promise.all([
      latestOpportunity ? getOpportunityJob(latestOpportunity.id) : Promise.resolve(null),
      latestOpportunity ? listOpportunityItems(latestOpportunity.id) : Promise.resolve([]),
      latestMonitor ? getMonitorJob(latestMonitor.id) : Promise.resolve(null),
      latestMonitor ? listMonitorEvents(latestMonitor.id) : Promise.resolve([]),
      base.blogJobId ? getBlogDraftJob(base.blogJobId) : latestDraftJob ? getBlogDraftJob(latestDraftJob.id) : Promise.resolve(null),
      base.blogJobId ? listBlogDrafts(base.blogJobId) : latestDraftJob ? listBlogDrafts(latestDraftJob.id) : Promise.resolve([]),
      base.personaJobId ? getPersonaPostJob(base.personaJobId) : Promise.resolve(null),
      base.personaJobId ? listPersonaPostDrafts(base.personaJobId) : Promise.resolve([]),
    ]);

  return {
    ...base,
    sources,
    opportunityJobsHistory,
    opportunityJobId: latestOpportunity?.id ?? null,
    opportunityJob,
    opportunities,
    monitorJobsHistory,
    monitorJobId: latestMonitor?.id ?? null,
    monitorJob,
    monitorEvents,
    draftJobsHistory,
    blogJobId: base.blogJobId ?? latestDraftJob?.id ?? null,
    blogJob,
    blogDrafts,
    personaJob: personaJob ?? base.personaJob,
    personaDrafts,
    lastError: null,
  };
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [ready, setReady] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const workspacesRef = useRef<WorkspaceSummary[]>([]);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { workspaces?: WorkspaceSummary[] };
        if (Array.isArray(parsed.workspaces)) {
          setWorkspaces(parsed.workspaces);
        }
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ workspaces }));
  }, [ready, workspaces]);

  useEffect(() => {
    workspacesRef.current = workspaces;
  }, [workspaces]);

  useEffect(() => {
    if (!ready) {
      return;
    }

    let cancelled = false;

    async function syncFromBackend() {
      try {
        const researchJobs = await listResearchJobs();
        if (cancelled) {
          return;
        }

        const hydrated = await Promise.all(
          researchJobs.map((researchJob) => {
            const existing = workspacesRef.current.find((item) => item.researchJobId === researchJob.id) ?? null;
            return hydrateWorkspace(researchJob, existing);
          }),
        );

        if (!cancelled) {
          setWorkspaces(hydrated);
        }
      } catch (error) {
        if (!cancelled) {
          setGlobalError(error instanceof Error ? error.message : "Failed to load workspaces from backend");
        }
      }
    }

    void syncFromBackend();

    return () => {
      cancelled = true;
    };
  }, [ready]);

  const getWorkspace = useCallback(
    (workspaceId: string) => workspaces.find((item) => item.id === workspaceId) ?? null,
    [workspaces],
  );

  const refreshWorkspace = useCallback(
    async (workspaceId: string) => {
      const workspace = workspaces.find((item) => item.id === workspaceId);
      if (!workspace?.researchJobId) {
        return;
      }

      try {
        const researchJob = await getResearchJob(workspace.researchJobId);
        const hydrated = await hydrateWorkspace(researchJob, workspace);
        setWorkspaces((current) => current.map((item) => (item.id === workspaceId ? hydrated : item)));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown refresh error";
        setGlobalError(message);
        setWorkspaces((current) =>
          current.map((item) => (item.id === workspaceId ? { ...item, lastError: message } : item)),
        );
      }
    },
    [workspaces],
  );

  useEffect(() => {
    if (!ready) {
      return;
    }
    const activeIds = workspaces.filter(isWorkspaceBusy).map((item) => item.id);
    if (!activeIds.length) {
      return;
    }
    const timer = window.setInterval(() => {
      activeIds.forEach((workspaceId) => {
        void refreshWorkspace(workspaceId);
      });
    }, 4000);
    return () => window.clearInterval(timer);
  }, [ready, refreshWorkspace, workspaces]);

  async function runAction<T>(action: string, runner: () => Promise<T>) {
    setPendingAction(action);
    setGlobalError(null);
    try {
      return await runner();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Action failed";
      setGlobalError(message);
      throw error;
    } finally {
      setPendingAction(null);
    }
  }

  const createWorkspace = useCallback(
    async (input: {
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
      payload: ResearchJobCreate;
    }) => {
      const researchJob = await runAction("create-workspace", () => createResearchJob(input.payload));
      const localWorkspace = createWorkspaceSkeleton(researchJob, {
        id: makeWorkspaceId(),
        createdAt: new Date().toISOString(),
        title: input.title,
        candidateName: input.candidateName,
        companyName: input.companyName,
        companyDomain: input.companyDomain,
        roleTitle: input.roleTitle,
        searchContext: input.searchContext,
        clientName: input.clientName,
        clientRole: input.clientRole,
        clientInterests: input.clientInterests,
        clientStrengths: input.clientStrengths,
        researchJobId: researchJob.id,
        researchJob,
        sources: [],
        opportunityJobsHistory: [],
        opportunityJobId: null,
        opportunityJob: null,
        opportunities: [],
        monitorJobsHistory: [],
        monitorJobId: null,
        monitorJob: null,
        monitorEvents: [],
        draftJobsHistory: [],
        blogJobId: null,
        blogJob: null,
        blogDrafts: [],
        personaJobId: null,
        personaJob: null,
        personaDrafts: [],
        lastError: null,
      });
      setWorkspaces((current) => [localWorkspace, ...current]);
      await refreshWorkspace(localWorkspace.id);
      return localWorkspace.id;
    },
    [refreshWorkspace],
  );

  const refreshResearch = useCallback(
    async (workspaceId: string) => {
      const workspace = getWorkspace(workspaceId);
      if (!workspace?.researchJobId) {
        return;
      }
      await runAction("refresh-research", () => refreshResearchJob(workspace.researchJobId));
      await refreshWorkspace(workspaceId);
    },
    [getWorkspace, refreshWorkspace],
  );

  const createOpportunityRun = useCallback(
    async (workspaceId: string) => {
      const workspace = getWorkspace(workspaceId);
      if (!workspace?.researchJobId) {
        return;
      }
      await runAction("create-opportunities", () => createOpportunityJob(workspace.researchJobId));
      await refreshWorkspace(workspaceId);
    },
    [getWorkspace, refreshWorkspace],
  );

  const createMonitorRun = useCallback(
    async (workspaceId: string) => {
      const workspace = getWorkspace(workspaceId);
      if (!workspace?.researchJobId) {
        return;
      }
      await runAction("create-monitor", () => createMonitorJob(workspace.researchJobId, { cadence: "manual" }));
      await refreshWorkspace(workspaceId);
    },
    [getWorkspace, refreshWorkspace],
  );

  const refreshMonitorRun = useCallback(
    async (workspaceId: string) => {
      const workspace = getWorkspace(workspaceId);
      if (!workspace?.monitorJobId) {
        return;
      }
      await runAction("refresh-monitor", () => refreshMonitorJob(workspace.monitorJobId));
      await refreshWorkspace(workspaceId);
    },
    [getWorkspace, refreshWorkspace],
  );

  const createBlogRun = useCallback(
    async (workspaceId: string, payload: BlogDraftJobCreate) => {
      const workspace = getWorkspace(workspaceId);
      if (!workspace?.researchJobId) {
        return;
      }
      const job = await runAction("create-blog", () => createBlogDraftJob(workspace.researchJobId, payload));
      setWorkspaces((current) =>
        current.map((item) => (item.id === workspaceId ? { ...item, blogJobId: job.id, blogJob: job } : item)),
      );
      await refreshWorkspace(workspaceId);
    },
    [getWorkspace, refreshWorkspace],
  );

  const refreshBlogRun = useCallback(
    async (workspaceId: string) => {
      const workspace = getWorkspace(workspaceId);
      if (!workspace?.blogJobId) {
        return;
      }
      await runAction("refresh-blog", () => refreshBlogDraftJob(workspace.blogJobId));
      await refreshWorkspace(workspaceId);
    },
    [getWorkspace, refreshWorkspace],
  );

  const createPersonaRun = useCallback(
    async (workspaceId: string, payload: BlogDraftJobCreate) => {
      const workspace = getWorkspace(workspaceId);
      if (!workspace?.researchJobId) {
        return;
      }
      const job = await runAction("create-persona", () => createPersonaPostJob(workspace.researchJobId, payload));
      setWorkspaces((current) =>
        current.map((item) => (item.id === workspaceId ? { ...item, personaJobId: job.id, personaJob: job } : item)),
      );
      await refreshWorkspace(workspaceId);
    },
    [getWorkspace, refreshWorkspace],
  );

  const refreshPersonaRun = useCallback(
    async (workspaceId: string) => {
      const workspace = getWorkspace(workspaceId);
      if (!workspace?.personaJobId) {
        return;
      }
      await runAction("refresh-persona", () => refreshPersonaPostJob(workspace.personaJobId));
      await refreshWorkspace(workspaceId);
    },
    [getWorkspace, refreshWorkspace],
  );

  const value = useMemo(
    () => ({
      workspaces,
      ready,
      globalError,
      pendingAction,
      createWorkspace,
      getWorkspace,
      refreshWorkspace,
      refreshResearch,
      createOpportunityRun,
      createMonitorRun,
      refreshMonitorRun,
      createBlogRun,
      refreshBlogRun,
      createPersonaRun,
      refreshPersonaRun,
    }),
    [
      createBlogRun,
      createMonitorRun,
      createOpportunityRun,
      createPersonaRun,
      createWorkspace,
      getWorkspace,
      globalError,
      pendingAction,
      ready,
      refreshBlogRun,
      refreshMonitorRun,
      refreshPersonaRun,
      refreshResearch,
      refreshWorkspace,
      workspaces,
    ],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspaceStore() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspaceStore must be used within WorkspaceProvider");
  }
  return context;
}
