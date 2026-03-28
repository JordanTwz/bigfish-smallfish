"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

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
  listResearchSources,
  refreshBlogDraftJob,
  refreshMonitorJob,
  refreshPersonaPostJob,
  refreshResearchJob,
} from "@/lib/api";
import type { BlogDraftJobCreate, ResearchJobCreate } from "@/lib/types";
import {
  isWorkspaceBusy,
  makeWorkspaceId,
  STORAGE_KEY,
  type WorkspaceSummary,
} from "@/lib/workspaces";

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

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [ready, setReady] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

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

  const getWorkspace = useCallback(
    (workspaceId: string) => workspaces.find((item) => item.id === workspaceId) ?? null,
    [workspaces],
  );

  const refreshWorkspace = useCallback(
    async (workspaceId: string) => {
      const workspace = workspaces.find((item) => item.id === workspaceId);
      if (!workspace) {
        return;
      }

      try {
        const researchPromise = workspace.researchJobId ? getResearchJob(workspace.researchJobId) : Promise.resolve(null);
        const sourcesPromise = workspace.researchJobId ? listResearchSources(workspace.researchJobId) : Promise.resolve([]);
        const opportunityJobPromise = workspace.opportunityJobId
          ? getOpportunityJob(workspace.opportunityJobId)
          : Promise.resolve(null);
        const opportunityItemsPromise = workspace.opportunityJobId
          ? listOpportunityItems(workspace.opportunityJobId)
          : Promise.resolve([]);
        const monitorJobPromise = workspace.monitorJobId ? getMonitorJob(workspace.monitorJobId) : Promise.resolve(null);
        const monitorEventsPromise = workspace.monitorJobId
          ? listMonitorEvents(workspace.monitorJobId)
          : Promise.resolve([]);
        const blogJobPromise = workspace.blogJobId ? getBlogDraftJob(workspace.blogJobId) : Promise.resolve(null);
        const blogDraftsPromise = workspace.blogJobId ? listBlogDrafts(workspace.blogJobId) : Promise.resolve([]);
        const personaJobPromise = workspace.personaJobId
          ? getPersonaPostJob(workspace.personaJobId)
          : Promise.resolve(null);
        const personaDraftsPromise = workspace.personaJobId
          ? listPersonaPostDrafts(workspace.personaJobId)
          : Promise.resolve([]);

        const [
          researchJob,
          sources,
          opportunityJob,
          opportunities,
          monitorJob,
          monitorEvents,
          blogJob,
          blogDrafts,
          personaJob,
          personaDrafts,
        ] = await Promise.all([
          researchPromise,
          sourcesPromise,
          opportunityJobPromise,
          opportunityItemsPromise,
          monitorJobPromise,
          monitorEventsPromise,
          blogJobPromise,
          blogDraftsPromise,
          personaJobPromise,
          personaDraftsPromise,
        ]);

        setWorkspaces((current) =>
          current.map((item) =>
            item.id === workspaceId
              ? {
                  ...item,
                  researchJob,
                  sources,
                  opportunityJob,
                  opportunities,
                  monitorJob,
                  monitorEvents,
                  blogJob,
                  blogDrafts,
                  personaJob,
                  personaDrafts,
                  lastError: null,
                }
              : item,
          ),
        );
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
      const workspaceId = makeWorkspaceId();
      const workspace: WorkspaceSummary = {
        id: workspaceId,
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
        opportunityJobId: null,
        opportunityJob: null,
        opportunities: [],
        monitorJobId: null,
        monitorJob: null,
        monitorEvents: [],
        blogJobId: null,
        blogJob: null,
        blogDrafts: [],
        personaJobId: null,
        personaJob: null,
        personaDrafts: [],
        lastError: null,
      };
      setWorkspaces((current) => [workspace, ...current]);
      await refreshWorkspace(workspaceId);
      return workspaceId;
    },
    [refreshWorkspace],
  );

  const refreshResearch = useCallback(
    async (workspaceId: string) => {
      const workspace = getWorkspace(workspaceId);
      if (!workspace?.researchJobId) {
        return;
      }
      await runAction("refresh-research", () => refreshResearchJob(workspace.researchJobId!));
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
      const job = await runAction("create-opportunities", () => createOpportunityJob(workspace.researchJobId!));
      setWorkspaces((current) =>
        current.map((item) => (item.id === workspaceId ? { ...item, opportunityJobId: job.id, opportunityJob: job } : item)),
      );
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
      const job = await runAction("create-monitor", () => createMonitorJob(workspace.researchJobId!, { cadence: "manual" }));
      setWorkspaces((current) =>
        current.map((item) => (item.id === workspaceId ? { ...item, monitorJobId: job.id, monitorJob: job } : item)),
      );
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
      await runAction("refresh-monitor", () => refreshMonitorJob(workspace.monitorJobId!));
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
      const job = await runAction("create-blog", () => createBlogDraftJob(workspace.researchJobId!, payload));
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
      await runAction("refresh-blog", () => refreshBlogDraftJob(workspace.blogJobId!));
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
      const job = await runAction("create-persona", () => createPersonaPostJob(workspace.researchJobId!, payload));
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
      await runAction("refresh-persona", () => refreshPersonaPostJob(workspace.personaJobId!));
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
