"use client";

import {
  FormEvent,
  ReactNode,
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  createBlogDraftJob,
  createMonitorJob,
  createOpportunityJob,
  createPersonaPostJob,
  createResearchJob,
  createRun,
  getApiBaseUrl,
  getBlogDraftJob,
  getHealth,
  getMonitorJob,
  getOpportunityJob,
  getPersonaPostJob,
  getResearchJob,
  listBlogDrafts,
  listMonitorEvents,
  listOpportunityItems,
  listPersonaPostDrafts,
  listResearchSources,
  listRuns,
  refreshBlogDraftJob,
  refreshMonitorJob,
  refreshPersonaPostJob,
  refreshResearchJob,
} from "../lib/api";
import type {
  BlogDraftJobCreate,
  BlogDraftJobResponse,
  BlogDraftResponse,
  MonitorEventResponse,
  MonitorJobResponse,
  OpportunityJobResponse,
  OpportunityResponse,
  ResearchJobCreate,
  ResearchJobResponse,
  RunResponse,
  SourceCandidateResponse,
} from "../lib/types";

const STORAGE_KEY = "bigfish-ops-console-v1";
const API_BASE_URL = getApiBaseUrl();

const researchActiveStatuses = new Set(["queued", "discovering", "extracting", "scoring"]);
const asyncActiveStatuses = new Set(["queued", "ranking", "profiling", "outlining", "drafting", "checking"]);
const researchTerminalStatuses = new Set(["completed", "partial", "failed"]);
const workspaceTabs = ["overview", "research", "opportunities", "monitoring", "blog", "persona"] as const;
const appModes = ["operations", "profiles"] as const;

type WorkspaceTab = (typeof workspaceTabs)[number];
type AppMode = (typeof appModes)[number];
type BackendHealth = "checking" | "healthy" | "unreachable";
type ActionKey =
  | "researchRefresh"
  | "opportunitiesCreate"
  | "monitorCreate"
  | "monitorRefresh"
  | "blogCreate"
  | "blogRefresh"
  | "personaCreate"
  | "personaRefresh";

type MissionComposerState = {
  selectedProfileId: string;
  candidateName: string;
  companyName: string;
  companyDomain: string;
  roleTitle: string;
  searchContext: string;
};

type ClientProfile = {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  company: string;
  roleTitle: string;
  summary: string;
  interestsText: string;
  strengthsText: string;
  goalsText: string;
  proofPointsText: string;
  constraintsText: string;
  profileNotes: string;
};

type ClientProfileFormState = {
  name: string;
  company: string;
  roleTitle: string;
  summary: string;
  interestsText: string;
  strengthsText: string;
  goalsText: string;
  proofPointsText: string;
  constraintsText: string;
  profileNotes: string;
};

type DraftFormState = {
  goal: string;
  draftCount: string;
  targetLength: string;
  styleConstraints: string;
  personaConstraints: string;
  clientName: string;
  clientProfileText: string;
  requestedAnglesText: string;
};

type MonitorFormState = {
  cadence: string;
};

type RunFormState = {
  sourceUrl: string;
  goal: string;
};

type Workspace = {
  id: string;
  createdAt: string;
  clientProfileId: string | null;
  clientName: string;
  clientProfileJson: Record<string, unknown> | null;
  candidateName: string;
  companyName: string;
  companyDomain: string;
  roleTitle: string;
  searchContext: string;
  researchJobId: string | null;
  researchJob: ResearchJobResponse | null;
  sources: SourceCandidateResponse[];
  opportunityJobId: string | null;
  opportunityJob: OpportunityJobResponse | null;
  opportunities: OpportunityResponse[];
  monitorJobId: string | null;
  monitorJob: MonitorJobResponse | null;
  monitorEvents: MonitorEventResponse[];
  blogDraftForm: DraftFormState;
  blogDraftJobId: string | null;
  blogDraftJob: BlogDraftJobResponse | null;
  blogDrafts: BlogDraftResponse[];
  personaForm: DraftFormState;
  personaJobId: string | null;
  personaJob: BlogDraftJobResponse | null;
  personaDrafts: BlogDraftResponse[];
  monitorForm: MonitorFormState;
  actions: Partial<Record<ActionKey, boolean>>;
  lastError: string | null;
};

type PersistedState = {
  clientProfiles: ClientProfile[];
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  activeTab: WorkspaceTab;
  appMode: AppMode;
};

const initialComposer: MissionComposerState = {
  selectedProfileId: "",
  candidateName: "Jane Doe",
  companyName: "ExampleCo",
  companyDomain: "example.com",
  roleTitle: "Software Engineer Intern",
  searchContext: "Technical screen for a backend or platform role.",
};

const initialClientProfileForm: ClientProfileFormState = {
  name: "Northstar Ventures",
  company: "Northstar Ventures",
  roleTitle: "Platform advisory partner",
  summary: "Hands-on technical advisor with a public point of view in platform engineering and AI operations.",
  interestsText: "platform engineering, AI operations, observability",
  strengthsText: "systems thinking, technical writing, engineering leadership",
  goalsText: "build credibility with senior engineering leaders, publish thoughtful public writing",
  proofPointsText: "led platform migrations, scaled developer tooling, writes architecture reviews",
  constraintsText: "avoid hype, avoid generic thought leadership, stay grounded in direct experience",
  profileNotes: "Prefers practical, operator-focused angles with explicit tradeoff analysis.",
};

const defaultMonitorForm: MonitorFormState = {
  cadence: "manual",
};

const defaultDraftForm = (clientName: string, clientProfileJson: Record<string, unknown> | null): DraftFormState => ({
  goal: "resonance",
  draftCount: "3",
  targetLength: "medium",
  styleConstraints: "Technical, specific, and evidence-led.",
  personaConstraints: "Do not imitate or impersonate the target.",
  clientName,
  clientProfileText: JSON.stringify(
    clientProfileJson ?? {
      current_role: "Engineering leader",
      interests: ["platform engineering", "AI operations"],
    },
    null,
    2,
  ),
  requestedAnglesText: "client_voice, expert_commentary",
});

const initialRunForm: RunFormState = {
  sourceUrl: "https://example.com",
  goal: "Inspect this source and return a structured extraction result.",
};

function makeWorkspaceId() {
  return `workspace-${Math.random().toString(36).slice(2, 10)}`;
}

function makeClientProfileId() {
  return `client-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeNullable(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeResearchPayload(
  form: MissionComposerState,
  clientProfile: ClientProfile | null,
): ResearchJobCreate {
  return {
    candidate_name: form.candidateName.trim(),
    company_name: normalizeNullable(form.companyName),
    company_domain: normalizeNullable(form.companyDomain),
    role_title: normalizeNullable(form.roleTitle),
    search_context: normalizeNullable(form.searchContext),
    client_name: clientProfile?.name ? normalizeNullable(clientProfile.name) : null,
    client_profile: clientProfile ? buildClientProfileJson(clientProfile) : null,
  };
}

function parseCommaList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildClientProfileJson(profile: ClientProfile | ClientProfileFormState) {
  return {
    company: normalizeNullable(profile.company),
    current_role: normalizeNullable(profile.roleTitle),
    summary: normalizeNullable(profile.summary),
    interests: parseCommaList(profile.interestsText),
    strengths: parseCommaList(profile.strengthsText),
    goals: parseCommaList(profile.goalsText),
    proof_points: parseCommaList(profile.proofPointsText),
    constraints: parseCommaList(profile.constraintsText),
    notes: normalizeNullable(profile.profileNotes),
  } as Record<string, unknown>;
}

function createClientProfile(form: ClientProfileFormState): ClientProfile {
  const now = new Date().toISOString();
  return {
    id: makeClientProfileId(),
    createdAt: now,
    updatedAt: now,
    ...form,
  };
}

function parseJsonText(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return JSON.parse(trimmed) as Record<string, unknown>;
}

function parseRequestedAngles(value: string) {
  const items = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length > 0 ? items : null;
}

function buildDraftPayload(form: DraftFormState): BlogDraftJobCreate {
  return {
    goal: form.goal.trim() || "resonance",
    draft_count: Math.max(Number.parseInt(form.draftCount, 10) || 1, 1),
    target_length: form.targetLength.trim() || "medium",
    style_constraints: normalizeNullable(form.styleConstraints),
    persona_constraints: normalizeNullable(form.personaConstraints),
    client_name: normalizeNullable(form.clientName),
    client_profile: parseJsonText(form.clientProfileText),
    requested_angles: parseRequestedAngles(form.requestedAnglesText),
  };
}

function createWorkspaceShell(
  form: MissionComposerState,
  researchJob: ResearchJobResponse,
  clientProfile: ClientProfile,
): Workspace {
  const clientProfileJson = buildClientProfileJson(clientProfile);
  return {
    id: makeWorkspaceId(),
    createdAt: new Date().toISOString(),
    clientProfileId: clientProfile.id,
    clientName: clientProfile.name.trim() || "Unnamed client",
    clientProfileJson,
    candidateName: form.candidateName.trim(),
    companyName: form.companyName.trim(),
    companyDomain: form.companyDomain.trim(),
    roleTitle: form.roleTitle.trim(),
    searchContext: form.searchContext.trim(),
    researchJobId: researchJob.id,
    researchJob,
    sources: [],
    opportunityJobId: null,
    opportunityJob: null,
    opportunities: [],
    monitorJobId: null,
    monitorJob: null,
    monitorEvents: [],
    blogDraftForm: defaultDraftForm(clientProfile.name.trim() || "Unnamed client", clientProfileJson),
    blogDraftJobId: null,
    blogDraftJob: null,
    blogDrafts: [],
    personaForm: {
      ...defaultDraftForm(clientProfile.name.trim() || "Unnamed client", clientProfileJson),
      goal: "credibility",
      draftCount: "2",
    },
    personaJobId: null,
    personaJob: null,
    personaDrafts: [],
    monitorForm: defaultMonitorForm,
    actions: {},
    lastError: null,
  };
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function compactObject(value: unknown) {
  return value ? JSON.stringify(value, null, 2) : "No data available.";
}

function asRecord(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function getDiscoveryInsights(job: ResearchJobResponse | null) {
  return asRecord(asRecord(job?.final_brief_jsonb)?.discovery_insights);
}

function getClientProfileSummary(profile: Record<string, unknown> | null) {
  const summary = profile?.summary;
  return typeof summary === "string" && summary.trim() ? summary : null;
}

function getResearchSummaryStatus(workspace: Workspace) {
  return workspace.researchJob?.status ?? "idle";
}

function isResearchSettled(workspace: Workspace) {
  const status = workspace.researchJob?.status;
  return status ? researchTerminalStatuses.has(status) : false;
}

function isOpportunityActive(workspace: Workspace) {
  return workspace.opportunityJob?.status ? asyncActiveStatuses.has(workspace.opportunityJob.status) : false;
}

function isMonitorActive(workspace: Workspace) {
  return workspace.monitorJob?.status === "checking";
}

function isDraftJobActive(job: BlogDraftJobResponse | null) {
  return job?.status ? asyncActiveStatuses.has(job.status) : false;
}

function formatPercent(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return "n/a";
  }
  return `${Math.round(value * 100)}%`;
}

function describeWorkspace(workspace: Workspace) {
  const company = workspace.companyName || workspace.researchJob?.company_name || "Independent";
  return `${workspace.clientName} / ${workspace.candidateName} / ${company}`;
}

function deriveWorkspaceSignal(workspace: Workspace) {
  const researchStatus = workspace.researchJob?.status;
  if (researchStatus === "failed") {
    return "risk";
  }
  if (researchStatus === "partial") {
    return "warning";
  }
  if (researchStatus === "completed") {
    return "good";
  }
  if (researchStatus) {
    return "active";
  }
  return "neutral";
}

function toPersistedState(
  clientProfiles: ClientProfile[],
  workspaces: Workspace[],
  activeWorkspaceId: string | null,
  activeTab: WorkspaceTab,
  appMode: AppMode,
): PersistedState {
  return {
    clientProfiles,
    workspaces: workspaces.map((workspace) => ({
      ...workspace,
      actions: {},
    })),
    activeWorkspaceId,
    activeTab,
    appMode,
  };
}

function parsePersistedState(raw: string | null): PersistedState | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as PersistedState;
    if (!Array.isArray(parsed.workspaces)) {
      return null;
    }
    return {
      clientProfiles: Array.isArray(parsed.clientProfiles) ? parsed.clientProfiles : [],
      workspaces: parsed.workspaces.map((workspace) => ({
        ...workspace,
        clientProfileId: workspace.clientProfileId ?? null,
        clientProfileJson: workspace.clientProfileJson ?? null,
        actions: {},
        blogDraftForm:
          workspace.blogDraftForm ?? defaultDraftForm(workspace.clientName, workspace.clientProfileJson ?? null),
        personaForm:
          workspace.personaForm ??
          ({
            ...defaultDraftForm(workspace.clientName, workspace.clientProfileJson ?? null),
            goal: "credibility",
            draftCount: "2",
          } as DraftFormState),
        monitorForm: workspace.monitorForm ?? defaultMonitorForm,
        lastError: workspace.lastError ?? null,
      })),
      activeWorkspaceId: parsed.activeWorkspaceId ?? null,
      activeTab: parsed.activeTab ?? "overview",
      appMode: parsed.appMode ?? "operations",
    };
  } catch {
    return null;
  }
}

function JsonBlock({ title, value }: { title: string; value: unknown }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel-2)]">
      <div className="border-b border-[var(--line)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
        {title}
      </div>
      <pre className="max-h-96 overflow-auto px-4 py-4 text-xs leading-6 text-[var(--text)]">
        {compactObject(value)}
      </pre>
    </div>
  );
}

function StatusPill({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "good" | "warning" | "risk" | "active" }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
        tone === "good"
          ? "border-emerald-400/35 bg-emerald-400/10 text-emerald-200"
          : tone === "warning"
            ? "border-amber-400/35 bg-amber-400/10 text-amber-200"
            : tone === "risk"
              ? "border-rose-400/35 bg-rose-400/10 text-rose-200"
              : tone === "active"
                ? "border-cyan-400/35 bg-cyan-400/10 text-cyan-200"
                : "border-[var(--line-strong)] bg-[var(--panel-3)] text-[var(--muted-strong)]"
      }`}
    >
      {label}
    </span>
  );
}

function SectionCard({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-[var(--line)] bg-[var(--panel)] shadow-[0_24px_80px_rgba(2,6,23,0.32)]">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--line)] px-5 py-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
            {title}
          </p>
          {subtitle ? <p className="mt-2 text-sm text-[var(--muted-strong)]">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      <div className="px-5 py-5">{children}</div>
    </section>
  );
}

export default function Home() {
  const [appMode, setAppMode] = useState<AppMode>("operations");
  const [clientProfiles, setClientProfiles] = useState<ClientProfile[]>([]);
  const [clientProfileForm, setClientProfileForm] = useState<ClientProfileFormState>(initialClientProfileForm);
  const [editingClientProfileId, setEditingClientProfileId] = useState<string | null>(null);
  const [composer, setComposer] = useState<MissionComposerState>(initialComposer);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("overview");
  const [workspaceQuery, setWorkspaceQuery] = useState("");
  const deferredWorkspaceQuery = useDeferredValue(workspaceQuery);
  const [isBootstrapped, setIsBootstrapped] = useState(false);
  const [hasHydratedPersistedWorkspaces, setHasHydratedPersistedWorkspaces] = useState(false);
  const [launchingWorkspace, setLaunchingWorkspace] = useState(false);
  const [health, setHealth] = useState<BackendHealth>("checking");
  const [runs, setRuns] = useState<RunResponse[]>([]);
  const [runForm, setRunForm] = useState<RunFormState>(initialRunForm);
  const [runError, setRunError] = useState<string | null>(null);
  const [runSubmitting, setRunSubmitting] = useState(false);

  const selectedClientProfile = useMemo(
    () => clientProfiles.find((profile) => profile.id === composer.selectedProfileId) ?? null,
    [clientProfiles, composer.selectedProfileId],
  );

  const activeWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === activeWorkspaceId) ?? null,
    [workspaces, activeWorkspaceId],
  );

  const filteredWorkspaces = useMemo(() => {
    const query = deferredWorkspaceQuery.trim().toLowerCase();
    if (!query) {
      return workspaces;
    }

    return workspaces.filter((workspace) => describeWorkspace(workspace).toLowerCase().includes(query));
  }, [deferredWorkspaceQuery, workspaces]);

  const globalCounts = useMemo(
    () => ({
      total: workspaces.length,
      activeResearch: workspaces.filter((workspace) => workspace.researchJob?.status && researchActiveStatuses.has(workspace.researchJob.status)).length,
      monitored: workspaces.filter((workspace) => workspace.monitorJobId).length,
      drafting: workspaces.filter((workspace) => isDraftJobActive(workspace.blogDraftJob) || isDraftJobActive(workspace.personaJob)).length,
    }),
    [workspaces],
  );

  const mergeWorkspace = useCallback((workspaceId: string, updater: (workspace: Workspace) => Workspace) => {
    setWorkspaces((current) =>
      current.map((workspace) => (workspace.id === workspaceId ? updater(workspace) : workspace)),
    );
  }, []);

  const setWorkspaceAction = useCallback(
    (workspaceId: string, action: ActionKey, active: boolean) => {
      mergeWorkspace(workspaceId, (workspace) => ({
        ...workspace,
        actions: {
          ...workspace.actions,
          [action]: active,
        },
      }));
    },
    [mergeWorkspace],
  );

  const refreshOperations = useCallback(async () => {
    try {
      await getHealth();
      setHealth("healthy");
    } catch {
      setHealth("unreachable");
    }

    try {
      const nextRuns = await listRuns();
      setRuns(nextRuns.slice(0, 12));
    } catch {
      setRuns([]);
    }
  }, []);

  const refreshWorkspace = useCallback(async (workspace: Workspace) => {
    const nextState: Partial<Workspace> = {};

    try {
      if (workspace.researchJobId) {
        const [researchJob, sources] = await Promise.all([
          getResearchJob(workspace.researchJobId),
          listResearchSources(workspace.researchJobId),
        ]);
        nextState.researchJob = researchJob;
        nextState.sources = sources;
        nextState.clientName = researchJob.client_name ?? workspace.clientName;
        nextState.clientProfileJson = researchJob.client_profile_jsonb ?? workspace.clientProfileJson;
      }

      if (workspace.opportunityJobId) {
        const [opportunityJob, opportunities] = await Promise.all([
          getOpportunityJob(workspace.opportunityJobId),
          listOpportunityItems(workspace.opportunityJobId),
        ]);
        nextState.opportunityJob = opportunityJob;
        nextState.opportunities = opportunities;
      }

      if (workspace.monitorJobId) {
        const [monitorJob, monitorEvents] = await Promise.all([
          getMonitorJob(workspace.monitorJobId),
          listMonitorEvents(workspace.monitorJobId),
        ]);
        nextState.monitorJob = monitorJob;
        nextState.monitorEvents = monitorEvents;
      }

      if (workspace.blogDraftJobId) {
        const [blogDraftJob, blogDrafts] = await Promise.all([
          getBlogDraftJob(workspace.blogDraftJobId),
          listBlogDrafts(workspace.blogDraftJobId),
        ]);
        nextState.blogDraftJob = blogDraftJob;
        nextState.blogDrafts = blogDrafts;
      }

      if (workspace.personaJobId) {
        const [personaJob, personaDrafts] = await Promise.all([
          getPersonaPostJob(workspace.personaJobId),
          listPersonaPostDrafts(workspace.personaJobId),
        ]);
        nextState.personaJob = personaJob;
        nextState.personaDrafts = personaDrafts;
      }

      mergeWorkspace(workspace.id, (current) => ({
        ...current,
        ...nextState,
        lastError: null,
      }));
    } catch (error) {
      mergeWorkspace(workspace.id, (current) => ({
        ...current,
        lastError: error instanceof Error ? error.message : "Failed to refresh workspace state.",
      }));
    }
  }, [mergeWorkspace]);

  const pollLiveWorkspaces = useCallback(async () => {
    await Promise.all(
      workspaces.map(async (workspace) => {
        const shouldPoll =
          (workspace.researchJob?.status && researchActiveStatuses.has(workspace.researchJob.status)) ||
          isOpportunityActive(workspace) ||
          isMonitorActive(workspace) ||
          isDraftJobActive(workspace.blogDraftJob) ||
          isDraftJobActive(workspace.personaJob);

        if (shouldPoll) {
          await refreshWorkspace(workspace);
        }
      }),
    );
  }, [refreshWorkspace, workspaces]);

  useEffect(() => {
    const stored = parsePersistedState(window.localStorage.getItem(STORAGE_KEY));
    if (stored) {
      setClientProfiles(
        stored.clientProfiles.length > 0
          ? stored.clientProfiles
          : [createClientProfile(initialClientProfileForm)],
      );
      setWorkspaces(stored.workspaces);
      setActiveWorkspaceId(stored.activeWorkspaceId ?? stored.workspaces[0]?.id ?? null);
      setActiveTab(stored.activeTab);
      setAppMode(stored.appMode);
    } else {
      const seedProfile = createClientProfile(initialClientProfileForm);
      setClientProfiles([seedProfile]);
      setComposer((current) => ({
        ...current,
        selectedProfileId: seedProfile.id,
      }));
    }
    setIsBootstrapped(true);
  }, []);

  useEffect(() => {
    if (!clientProfiles.length) {
      return;
    }
    if (!composer.selectedProfileId || !clientProfiles.some((profile) => profile.id === composer.selectedProfileId)) {
      setComposer((current) => ({
        ...current,
        selectedProfileId: clientProfiles[0].id,
      }));
    }
  }, [clientProfiles, composer.selectedProfileId]);

  useEffect(() => {
    if (!isBootstrapped) {
      return;
    }

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(toPersistedState(clientProfiles, workspaces, activeWorkspaceId, activeTab, appMode)),
    );
  }, [activeTab, activeWorkspaceId, appMode, clientProfiles, isBootstrapped, workspaces]);

  useEffect(() => {
    if (!isBootstrapped || hasHydratedPersistedWorkspaces) {
      return;
    }

    setHasHydratedPersistedWorkspaces(true);
    void refreshOperations();
    void Promise.all(workspaces.map((workspace) => refreshWorkspace(workspace)));
  }, [hasHydratedPersistedWorkspaces, isBootstrapped, refreshOperations, refreshWorkspace, workspaces]);

  useEffect(() => {
    if (!isBootstrapped) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void pollLiveWorkspaces();
      void refreshOperations();
    }, 4000);

    return () => window.clearInterval(intervalId);
  }, [isBootstrapped, pollLiveWorkspaces, refreshOperations]);

  async function handleLaunchWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLaunchingWorkspace(true);

    try {
      if (!selectedClientProfile) {
        throw new Error("Select a client profile before launching a workspace.");
      }

      const payload = normalizeResearchPayload(composer, selectedClientProfile);
      if (!payload.candidate_name) {
        throw new Error("Candidate name is required.");
      }

      const researchJob = await createResearchJob(payload);
      const workspace = createWorkspaceShell(composer, researchJob, selectedClientProfile);
      setWorkspaces((current) => [workspace, ...current]);
      startTransition(() => {
        setActiveWorkspaceId(workspace.id);
        setActiveTab("overview");
      });
      await refreshWorkspace(workspace);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to launch research workspace.";
      window.alert(message);
    } finally {
      setLaunchingWorkspace(false);
    }
  }

  async function handleResearchRefresh(workspaceId: string, researchJobId: string) {
    setWorkspaceAction(workspaceId, "researchRefresh", true);
    try {
      await refreshResearchJob(researchJobId);
      const workspace = workspaces.find((item) => item.id === workspaceId);
      if (workspace) {
        await refreshWorkspace(workspace);
      }
    } catch (error) {
      mergeWorkspace(workspaceId, (workspace) => ({
        ...workspace,
        lastError: error instanceof Error ? error.message : "Failed to refresh research job.",
      }));
    } finally {
      setWorkspaceAction(workspaceId, "researchRefresh", false);
    }
  }

  async function handleOpportunityCreate(workspace: Workspace) {
    if (!workspace.researchJobId) {
      return;
    }

    setWorkspaceAction(workspace.id, "opportunitiesCreate", true);
    try {
      const opportunityJob = await createOpportunityJob(workspace.researchJobId);
      mergeWorkspace(workspace.id, (current) => ({
        ...current,
        opportunityJobId: opportunityJob.id,
        opportunityJob,
        opportunities: [],
        lastError: null,
      }));
      await refreshWorkspace({
        ...workspace,
        opportunityJobId: opportunityJob.id,
      });
    } catch (error) {
      mergeWorkspace(workspace.id, (current) => ({
        ...current,
        lastError: error instanceof Error ? error.message : "Failed to create opportunity job.",
      }));
    } finally {
      setWorkspaceAction(workspace.id, "opportunitiesCreate", false);
    }
  }

  async function handleMonitorCreate(workspace: Workspace) {
    if (!workspace.researchJobId) {
      return;
    }

    setWorkspaceAction(workspace.id, "monitorCreate", true);
    try {
      const monitorJob = await createMonitorJob(workspace.researchJobId, workspace.monitorForm);
      mergeWorkspace(workspace.id, (current) => ({
        ...current,
        monitorJobId: monitorJob.id,
        monitorJob,
        monitorEvents: [],
        lastError: null,
      }));
      await refreshWorkspace({
        ...workspace,
        monitorJobId: monitorJob.id,
      });
    } catch (error) {
      mergeWorkspace(workspace.id, (current) => ({
        ...current,
        lastError: error instanceof Error ? error.message : "Failed to create monitor job.",
      }));
    } finally {
      setWorkspaceAction(workspace.id, "monitorCreate", false);
    }
  }

  async function handleMonitorRefresh(workspace: Workspace) {
    if (!workspace.monitorJobId) {
      return;
    }

    setWorkspaceAction(workspace.id, "monitorRefresh", true);
    try {
      await refreshMonitorJob(workspace.monitorJobId);
      await refreshWorkspace(workspace);
    } catch (error) {
      mergeWorkspace(workspace.id, (current) => ({
        ...current,
        lastError: error instanceof Error ? error.message : "Failed to refresh monitor job.",
      }));
    } finally {
      setWorkspaceAction(workspace.id, "monitorRefresh", false);
    }
  }

  async function handleBlogDraftCreate(workspace: Workspace) {
    if (!workspace.researchJobId) {
      return;
    }

    setWorkspaceAction(workspace.id, "blogCreate", true);
    try {
      const payload = buildDraftPayload(workspace.blogDraftForm);
      const blogDraftJob = await createBlogDraftJob(workspace.researchJobId, payload);
      mergeWorkspace(workspace.id, (current) => ({
        ...current,
        blogDraftJobId: blogDraftJob.id,
        blogDraftJob,
        blogDrafts: [],
        lastError: null,
      }));
      await refreshWorkspace({
        ...workspace,
        blogDraftJobId: blogDraftJob.id,
      });
    } catch (error) {
      mergeWorkspace(workspace.id, (current) => ({
        ...current,
        lastError: error instanceof Error ? error.message : "Failed to create blog draft job.",
      }));
    } finally {
      setWorkspaceAction(workspace.id, "blogCreate", false);
    }
  }

  async function handleBlogDraftRefresh(workspace: Workspace) {
    if (!workspace.blogDraftJobId) {
      return;
    }

    setWorkspaceAction(workspace.id, "blogRefresh", true);
    try {
      await refreshBlogDraftJob(workspace.blogDraftJobId);
      await refreshWorkspace(workspace);
    } catch (error) {
      mergeWorkspace(workspace.id, (current) => ({
        ...current,
        lastError: error instanceof Error ? error.message : "Failed to refresh blog draft job.",
      }));
    } finally {
      setWorkspaceAction(workspace.id, "blogRefresh", false);
    }
  }

  async function handlePersonaCreate(workspace: Workspace) {
    if (!workspace.researchJobId) {
      return;
    }

    setWorkspaceAction(workspace.id, "personaCreate", true);
    try {
      const payload = buildDraftPayload(workspace.personaForm);
      const personaJob = await createPersonaPostJob(workspace.researchJobId, payload);
      mergeWorkspace(workspace.id, (current) => ({
        ...current,
        personaJobId: personaJob.id,
        personaJob,
        personaDrafts: [],
        lastError: null,
      }));
      await refreshWorkspace({
        ...workspace,
        personaJobId: personaJob.id,
      });
    } catch (error) {
      mergeWorkspace(workspace.id, (current) => ({
        ...current,
        lastError: error instanceof Error ? error.message : "Failed to create persona post job.",
      }));
    } finally {
      setWorkspaceAction(workspace.id, "personaCreate", false);
    }
  }

  async function handlePersonaRefresh(workspace: Workspace) {
    if (!workspace.personaJobId) {
      return;
    }

    setWorkspaceAction(workspace.id, "personaRefresh", true);
    try {
      await refreshPersonaPostJob(workspace.personaJobId);
      await refreshWorkspace(workspace);
    } catch (error) {
      mergeWorkspace(workspace.id, (current) => ({
        ...current,
        lastError: error instanceof Error ? error.message : "Failed to refresh persona post job.",
      }));
    } finally {
      setWorkspaceAction(workspace.id, "personaRefresh", false);
    }
  }

  async function handleCreateRun(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRunSubmitting(true);
    setRunError(null);

    try {
      await createRun({
        source_url: runForm.sourceUrl.trim(),
        goal: runForm.goal.trim(),
      });
      await refreshOperations();
    } catch (error) {
      setRunError(error instanceof Error ? error.message : "Failed to create run.");
    } finally {
      setRunSubmitting(false);
    }
  }

  function handleSaveClientProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!clientProfileForm.name.trim()) {
      window.alert("Client profile name is required.");
      return;
    }

    if (editingClientProfileId) {
      setClientProfiles((current) =>
        current.map((profile) =>
          profile.id === editingClientProfileId
            ? {
                ...profile,
                ...clientProfileForm,
                updatedAt: new Date().toISOString(),
              }
            : profile,
        ),
      );
    } else {
      const created = createClientProfile(clientProfileForm);
      setClientProfiles((current) => [created, ...current]);
      setComposer((current) => ({
        ...current,
        selectedProfileId: created.id,
      }));
    }

    setEditingClientProfileId(null);
    setClientProfileForm(initialClientProfileForm);
    setAppMode("operations");
  }

  function handleEditClientProfile(profile: ClientProfile) {
    setEditingClientProfileId(profile.id);
    setClientProfileForm({
      name: profile.name,
      company: profile.company,
      roleTitle: profile.roleTitle,
      summary: profile.summary,
      interestsText: profile.interestsText,
      strengthsText: profile.strengthsText,
      goalsText: profile.goalsText,
      proofPointsText: profile.proofPointsText,
      constraintsText: profile.constraintsText,
      profileNotes: profile.profileNotes,
    });
    setAppMode("profiles");
  }

  function handleDeleteClientProfile(profileId: string) {
    if (clientProfiles.length <= 1) {
      window.alert("At least one client profile must remain in the registry.");
      return;
    }
    setClientProfiles((current) => current.filter((profile) => profile.id !== profileId));
    if (composer.selectedProfileId === profileId) {
      setComposer((current) => ({
        ...current,
        selectedProfileId: "",
      }));
    }
    if (editingClientProfileId === profileId) {
      setEditingClientProfileId(null);
      setClientProfileForm(initialClientProfileForm);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.16),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(34,197,94,0.09),_transparent_22%),linear-gradient(180deg,_#06101f_0%,_#081423_36%,_#0b1524_100%)] text-[var(--text)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1760px] flex-col gap-6 px-4 py-5 sm:px-6 xl:px-8">
        <header className="rounded-[32px] border border-[var(--line)] bg-[linear-gradient(135deg,rgba(9,19,33,0.98),rgba(7,15,27,0.9))] px-6 py-5 shadow-[0_28px_120px_rgba(2,6,23,0.48)]">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                Big Fish / Small Fish
              </p>
              <h1 className="mt-3 font-display text-4xl tracking-[-0.05em] text-white sm:text-5xl">
                Target Operations Console
              </h1>
              <p className="mt-3 max-w-4xl text-sm leading-7 text-[var(--muted-strong)]">
                Multi-client, multi-target mission control for research, opportunity ranking,
                monitoring, long-form drafts, persona posts, health checks, and low-level TinyFish runs.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel-2)] px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">Workspaces</p>
                <p className="mt-2 text-2xl font-semibold text-white">{globalCounts.total}</p>
              </div>
              <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel-2)] px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">Live research</p>
                <p className="mt-2 text-2xl font-semibold text-white">{globalCounts.activeResearch}</p>
              </div>
              <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel-2)] px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">Monitors</p>
                <p className="mt-2 text-2xl font-semibold text-white">{globalCounts.monitored}</p>
              </div>
              <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel-2)] px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">Draft jobs</p>
                <p className="mt-2 text-2xl font-semibold text-white">{globalCounts.drafting}</p>
              </div>
            </div>
          </div>
        </header>

        <div className="flex flex-wrap gap-3">
          {appModes.map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setAppMode(mode)}
              className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                appMode === mode
                  ? "border-cyan-400/40 bg-cyan-400/12 text-cyan-100"
                  : "border-[var(--line)] bg-[var(--panel-2)] text-[var(--muted-strong)] hover:border-[var(--line-strong)]"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        {appMode === "operations" ? (
        <div className="grid flex-1 gap-6 xl:grid-cols-[340px_minmax(0,1fr)_340px]">
          <aside className="space-y-6">
            <SectionCard
              title="New Mission"
              subtitle="Launch a fresh client-target workspace. Each workspace persists locally and polls its own backend jobs."
            >
              <form className="space-y-4" onSubmit={handleLaunchWorkspace}>
                <Select
                  label="Client profile"
                  value={composer.selectedProfileId}
                  onChange={(value) => setComposer((current) => ({ ...current, selectedProfileId: value }))}
                  options={clientProfiles.map((profile) => ({
                    value: profile.id,
                    label: profile.name,
                  }))}
                />
                {selectedClientProfile ? (
                  <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel-2)] px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                      Selected profile
                    </p>
                    <h3 className="mt-2 text-base font-semibold text-white">{selectedClientProfile.name}</h3>
                    <p className="mt-2 text-sm text-[var(--muted-strong)]">
                      {selectedClientProfile.roleTitle}
                      {selectedClientProfile.company ? ` · ${selectedClientProfile.company}` : ""}
                    </p>
                    <p className="mt-3 text-sm leading-7 text-[var(--muted-strong)]">
                      {selectedClientProfile.summary}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-[var(--line-strong)] bg-[var(--panel-2)] px-4 py-4 text-sm leading-7 text-[var(--muted-strong)]">
                    Create a client profile in the Profiles tab, then select it here before launching work.
                  </div>
                )}
                <Input
                  label="Target"
                  value={composer.candidateName}
                  onChange={(value) => setComposer((current) => ({ ...current, candidateName: value }))}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Company"
                    value={composer.companyName}
                    onChange={(value) => setComposer((current) => ({ ...current, companyName: value }))}
                  />
                  <Input
                    label="Domain"
                    value={composer.companyDomain}
                    onChange={(value) => setComposer((current) => ({ ...current, companyDomain: value }))}
                  />
                </div>
                <Input
                  label="Role"
                  value={composer.roleTitle}
                  onChange={(value) => setComposer((current) => ({ ...current, roleTitle: value }))}
                />
                <TextArea
                  label="Search context"
                  rows={4}
                  value={composer.searchContext}
                  onChange={(value) => setComposer((current) => ({ ...current, searchContext: value }))}
                />
                <button
                  type="submit"
                  disabled={launchingWorkspace || !selectedClientProfile}
                  className="w-full rounded-2xl border border-cyan-400/40 bg-cyan-400/12 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/18 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {launchingWorkspace ? "Launching..." : "Launch Research Workspace"}
                </button>
              </form>
            </SectionCard>

            <SectionCard
              title="Workspace Registry"
              subtitle="Filter and switch between simultaneous client-target missions."
              action={<StatusPill label={`${filteredWorkspaces.length} visible`} tone="active" />}
            >
              <div className="space-y-4">
                <Input label="Filter" value={workspaceQuery} onChange={setWorkspaceQuery} />
                <div className="space-y-3">
                  {filteredWorkspaces.length > 0 ? (
                    filteredWorkspaces.map((workspace) => (
                      <button
                        key={workspace.id}
                        type="button"
                        onClick={() =>
                          startTransition(() => {
                            setActiveWorkspaceId(workspace.id);
                          })
                        }
                        className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                          activeWorkspaceId === workspace.id
                            ? "border-cyan-400/40 bg-cyan-400/10"
                            : "border-[var(--line)] bg-[var(--panel-2)] hover:border-[var(--line-strong)]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                              {workspace.clientName}
                            </p>
                            <h2 className="mt-2 text-base font-semibold text-white">{workspace.candidateName}</h2>
                            <p className="mt-1 text-sm text-[var(--muted-strong)]">
                              {workspace.companyName || "Independent"} {workspace.roleTitle ? `· ${workspace.roleTitle}` : ""}
                            </p>
                          </div>
                          <StatusPill
                            label={getResearchSummaryStatus(workspace)}
                            tone={deriveWorkspaceSignal(workspace)}
                          />
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {workspace.opportunityJobId ? <StatusPill label="opps" tone="active" /> : null}
                          {workspace.monitorJobId ? <StatusPill label="monitor" tone="good" /> : null}
                          {workspace.blogDraftJobId ? <StatusPill label="blog" tone="warning" /> : null}
                          {workspace.personaJobId ? <StatusPill label="persona" tone="warning" /> : null}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-[var(--line-strong)] bg-[var(--panel-2)] px-4 py-5 text-sm leading-7 text-[var(--muted-strong)]">
                      No workspaces match the current filter.
                    </div>
                  )}
                </div>
              </div>
            </SectionCard>
          </aside>

          <section className="space-y-6">
            {activeWorkspace ? (
              <>
                <SectionCard
                  title="Active Mission"
                  subtitle={describeWorkspace(activeWorkspace)}
                  action={
                    <div className="flex flex-wrap gap-2">
                      <StatusPill label={activeWorkspace.clientName} tone="neutral" />
                      <StatusPill
                        label={activeWorkspace.researchJob?.status ?? "idle"}
                        tone={deriveWorkspaceSignal(activeWorkspace)}
                      />
                    </div>
                  }
                >
                  <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                    <div className="rounded-3xl border border-[var(--line)] bg-[var(--panel-2)] p-5">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">Target brief</p>
                      <h2 className="mt-2 font-display text-3xl tracking-[-0.04em] text-white">
                        {activeWorkspace.candidateName}
                      </h2>
                      <p className="mt-2 text-sm text-[var(--muted-strong)]">
                        {activeWorkspace.roleTitle || "Role not specified"}
                        {activeWorkspace.companyName ? ` at ${activeWorkspace.companyName}` : ""}
                      </p>
                      <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--muted-strong)]">
                        {activeWorkspace.searchContext || "No additional search context supplied."}
                      </p>
                      {getClientProfileSummary(activeWorkspace.clientProfileJson) ? (
                        <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--muted-strong)]">
                          Client profile context: {getClientProfileSummary(activeWorkspace.clientProfileJson)}
                        </p>
                      ) : null}
                      <div className="mt-5 flex flex-wrap gap-2">
                        <StatusPill label={`job ${activeWorkspace.researchJobId?.slice(0, 8) ?? "pending"}`} tone="active" />
                        <StatusPill label={`${activeWorkspace.sources.length} sources`} tone="neutral" />
                        <StatusPill label={`created ${formatDate(activeWorkspace.createdAt)}`} tone="neutral" />
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-1">
                      <SignalCard label="Research" value={activeWorkspace.researchJob?.status ?? "idle"} />
                      <SignalCard label="Opportunity items" value={String(activeWorkspace.opportunities.length)} />
                      <SignalCard label="Monitor events" value={String(activeWorkspace.monitorEvents.length)} />
                      <SignalCard
                        label="Draft outputs"
                        value={String(activeWorkspace.blogDrafts.length + activeWorkspace.personaDrafts.length)}
                      />
                    </div>
                  </div>

                  {activeWorkspace.lastError ? (
                    <div className="mt-5 rounded-2xl border border-rose-400/30 bg-rose-400/8 px-4 py-3 text-sm text-rose-100">
                      {activeWorkspace.lastError}
                    </div>
                  ) : null}

                  <div className="mt-5 flex flex-wrap gap-3 border-t border-[var(--line)] pt-5">
                    {workspaceTabs.map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveTab(tab)}
                        className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                          activeTab === tab
                            ? "border-cyan-400/40 bg-cyan-400/12 text-cyan-100"
                            : "border-[var(--line)] bg-[var(--panel-2)] text-[var(--muted-strong)] hover:border-[var(--line-strong)]"
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </SectionCard>

                {activeTab === "overview" ? (
                  <div className="grid gap-6 2xl:grid-cols-2">
                    <SectionCard
                      title="Control Plane"
                      subtitle="Use these actions to move the active workspace through each backend workflow."
                    >
                      <div className="grid gap-3 md:grid-cols-2">
                        <ActionButton
                          label="Refresh Research"
                          detail="POST /research-jobs/:id/refresh"
                          disabled={!activeWorkspace.researchJobId || Boolean(activeWorkspace.actions.researchRefresh)}
                          onClick={() =>
                            activeWorkspace.researchJobId
                              ? handleResearchRefresh(activeWorkspace.id, activeWorkspace.researchJobId)
                              : undefined
                          }
                        />
                        <ActionButton
                          label="Generate Opportunities"
                          detail="POST /research-jobs/:id/opportunities"
                          disabled={!isResearchSettled(activeWorkspace) || Boolean(activeWorkspace.actions.opportunitiesCreate)}
                          onClick={() => handleOpportunityCreate(activeWorkspace)}
                        />
                        <ActionButton
                          label="Create Monitor"
                          detail="POST /research-jobs/:id/monitor"
                          disabled={!isResearchSettled(activeWorkspace) || Boolean(activeWorkspace.actions.monitorCreate)}
                          onClick={() => handleMonitorCreate(activeWorkspace)}
                        />
                        <ActionButton
                          label="Refresh Monitor"
                          detail="POST /monitor-jobs/:id/refresh"
                          disabled={!activeWorkspace.monitorJobId || Boolean(activeWorkspace.actions.monitorRefresh)}
                          onClick={() => handleMonitorRefresh(activeWorkspace)}
                        />
                        <ActionButton
                          label="Create Blog Drafts"
                          detail="POST /research-jobs/:id/blog-drafts"
                          disabled={!isResearchSettled(activeWorkspace) || Boolean(activeWorkspace.actions.blogCreate)}
                          onClick={() => handleBlogDraftCreate(activeWorkspace)}
                        />
                        <ActionButton
                          label="Create Persona Posts"
                          detail="POST /research-jobs/:id/persona-post-jobs"
                          disabled={!isResearchSettled(activeWorkspace) || Boolean(activeWorkspace.actions.personaCreate)}
                          onClick={() => handlePersonaCreate(activeWorkspace)}
                        />
                      </div>
                    </SectionCard>

                    <SectionCard
                      title="Brief Highlights"
                      subtitle="The frontend now breaks out the structured research outputs instead of only showing raw JSON."
                    >
                      <div className="grid gap-4">
                        <InsightGroup
                          title="Expertise Themes"
                          items={asStringList(asRecord(activeWorkspace.researchJob?.final_brief_jsonb)?.expertise_themes)}
                        />
                        <InsightGroup
                          title="Public Interest Signals"
                          items={asNamedList(
                            getDiscoveryInsights(activeWorkspace.researchJob),
                            "public_interest_signals",
                            "interest",
                          )}
                        />
                        <InsightGroup
                          title="Safe Content Angles"
                          items={asNamedList(
                            getDiscoveryInsights(activeWorkspace.researchJob),
                            "safe_content_angles",
                            "angle",
                          )}
                        />
                        <InsightGroup
                          title="Guardrails"
                          items={asStringList(getDiscoveryInsights(activeWorkspace.researchJob)?.guardrails)}
                        />
                      </div>
                    </SectionCard>
                  </div>
                ) : null}

                {activeTab === "research" ? (
                  <div className="space-y-6">
                    <SectionCard
                      title="Research Output"
                      subtitle="Structured job metadata, final brief, source evidence, and failure payloads."
                      action={
                        <button
                          type="button"
                          onClick={() =>
                            activeWorkspace.researchJobId
                              ? handleResearchRefresh(activeWorkspace.id, activeWorkspace.researchJobId)
                              : undefined
                          }
                          disabled={!activeWorkspace.researchJobId || Boolean(activeWorkspace.actions.researchRefresh)}
                          className="rounded-2xl border border-[var(--line-strong)] bg-[var(--panel-2)] px-4 py-2 text-sm font-semibold text-[var(--muted-strong)] transition hover:border-cyan-400/35 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {activeWorkspace.actions.researchRefresh ? "Refreshing..." : "Refresh Research"}
                        </button>
                      }
                    >
                      <div className="grid gap-4 xl:grid-cols-2">
                        <JsonBlock title="Final Brief JSON" value={activeWorkspace.researchJob?.final_brief_jsonb} />
                        <JsonBlock title="Error JSON" value={activeWorkspace.researchJob?.error_jsonb} />
                      </div>
                    </SectionCard>

                    <SectionCard
                      title="Source Matrix"
                      subtitle="Every discovered or extracted source stays attached to the workspace."
                    >
                      <div className="space-y-4">
                        {activeWorkspace.sources.length > 0 ? (
                          activeWorkspace.sources.map((source) => (
                            <article
                              key={source.id}
                              className="rounded-3xl border border-[var(--line)] bg-[var(--panel-2)] p-5"
                            >
                              <div className="flex flex-wrap items-start justify-between gap-4">
                                <div>
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                                    {source.source_type ?? source.stage}
                                  </p>
                                  <h3 className="mt-2 text-lg font-semibold text-white">
                                    {source.title ?? source.normalized_url ?? source.url}
                                  </h3>
                                  <p className="mt-2 break-all text-sm text-[var(--muted-strong)]">{source.url}</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <StatusPill label={`confidence ${formatPercent(source.confidence)}`} tone="active" />
                                  <StatusPill label={`rank ${formatPercent(source.ranking_score)}`} tone="neutral" />
                                  <StatusPill label={source.stage} tone="neutral" />
                                </div>
                              </div>
                              {source.evidence_jsonb ? (
                                <pre className="mt-4 overflow-auto rounded-2xl border border-[var(--line)] bg-[var(--panel-3)] px-4 py-4 text-xs leading-6 text-[var(--muted-strong)]">
                                  {JSON.stringify(source.evidence_jsonb, null, 2)}
                                </pre>
                              ) : null}
                            </article>
                          ))
                        ) : (
                          <EmptyState message="No source evidence has arrived yet for this workspace." />
                        )}
                      </div>
                    </SectionCard>
                  </div>
                ) : null}

                {activeTab === "opportunities" ? (
                  <div className="space-y-6">
                    <SectionCard
                      title="Opportunity Engine"
                      subtitle="Rank next-best actions for the client from current public evidence."
                      action={
                        <button
                          type="button"
                          onClick={() => handleOpportunityCreate(activeWorkspace)}
                          disabled={!isResearchSettled(activeWorkspace) || Boolean(activeWorkspace.actions.opportunitiesCreate)}
                          className="rounded-2xl border border-emerald-400/35 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/16 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {activeWorkspace.actions.opportunitiesCreate ? "Generating..." : "Generate Opportunity Run"}
                        </button>
                      }
                    >
                      <div className="grid gap-4 xl:grid-cols-2">
                        <JsonBlock title="Job Summary" value={activeWorkspace.opportunityJob?.summary_jsonb} />
                        <JsonBlock title="Job Error" value={activeWorkspace.opportunityJob?.error_jsonb} />
                      </div>
                    </SectionCard>

                    <div className="grid gap-4">
                      {activeWorkspace.opportunities.length > 0 ? (
                        activeWorkspace.opportunities.map((opportunity) => (
                          <article
                            key={opportunity.id}
                            className="rounded-3xl border border-[var(--line)] bg-[var(--panel)] p-5"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-4">
                              <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                                  {opportunity.type.replaceAll("_", " ")}
                                </p>
                                <h3 className="mt-2 text-xl font-semibold text-white">{opportunity.title}</h3>
                                <p className="mt-3 max-w-4xl text-sm leading-7 text-[var(--muted-strong)]">
                                  {opportunity.description}
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <StatusPill label={`priority ${formatPercent(opportunity.priority_score)}`} tone="good" />
                                <StatusPill label={`impact ${formatPercent(opportunity.estimated_impact)}`} tone="active" />
                                <StatusPill label={`effort ${formatPercent(opportunity.estimated_effort)}`} tone="warning" />
                              </div>
                            </div>
                            <div className="mt-4 grid gap-4 lg:grid-cols-3">
                              <MiniDatum label="Theme" value={opportunity.theme ?? "n/a"} />
                              <MiniDatum label="Recommended asset" value={opportunity.recommended_asset_type ?? "n/a"} />
                              <MiniDatum label="Target URL" value={opportunity.target_url ?? "No direct surface"} />
                            </div>
                            {opportunity.why_now ? (
                              <p className="mt-4 text-sm leading-7 text-[var(--muted-strong)]">{opportunity.why_now}</p>
                            ) : null}
                          </article>
                        ))
                      ) : (
                        <EmptyState message="No opportunity items yet. Generate an opportunity run after research settles." />
                      )}
                    </div>
                  </div>
                ) : null}

                {activeTab === "monitoring" ? (
                  <div className="space-y-6">
                    <SectionCard
                      title="Monitoring"
                      subtitle="Track deltas against a research snapshot and surface new follow-up actions."
                      action={
                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => handleMonitorCreate(activeWorkspace)}
                            disabled={!isResearchSettled(activeWorkspace) || Boolean(activeWorkspace.actions.monitorCreate)}
                            className="rounded-2xl border border-cyan-400/35 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/16 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {activeWorkspace.actions.monitorCreate ? "Creating..." : "Capture Monitor Baseline"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMonitorRefresh(activeWorkspace)}
                            disabled={!activeWorkspace.monitorJobId || Boolean(activeWorkspace.actions.monitorRefresh)}
                            className="rounded-2xl border border-[var(--line-strong)] bg-[var(--panel-2)] px-4 py-2 text-sm font-semibold text-[var(--muted-strong)] transition hover:border-cyan-400/35 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {activeWorkspace.actions.monitorRefresh ? "Refreshing..." : "Run Monitor Refresh"}
                          </button>
                        </div>
                      }
                    >
                      <div className="grid gap-4 lg:grid-cols-2">
                        <div className="space-y-4">
                          <Input
                            label="Cadence"
                            value={activeWorkspace.monitorForm.cadence}
                            onChange={(value) =>
                              mergeWorkspace(activeWorkspace.id, (workspace) => ({
                                ...workspace,
                                monitorForm: {
                                  ...workspace.monitorForm,
                                  cadence: value,
                                },
                              }))
                            }
                          />
                          <div className="grid gap-3 md:grid-cols-2">
                            <SignalCard label="Status" value={activeWorkspace.monitorJob?.status ?? "idle"} />
                            <SignalCard label="Last checked" value={formatDate(activeWorkspace.monitorJob?.last_checked_at ?? null)} />
                          </div>
                        </div>
                        <JsonBlock title="Monitor Summary" value={activeWorkspace.monitorJob?.summary_jsonb} />
                      </div>
                    </SectionCard>

                    <SectionCard title="Event Timeline" subtitle="Detected changes and recommended follow-up actions.">
                      <div className="space-y-4">
                        {activeWorkspace.monitorEvents.length > 0 ? (
                          activeWorkspace.monitorEvents.map((event) => (
                            <article
                              key={event.id}
                              className="rounded-3xl border border-[var(--line)] bg-[var(--panel-2)] p-5"
                            >
                              <div className="flex flex-wrap items-start justify-between gap-4">
                                <div>
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                                    {event.event_type.replaceAll("_", " ")}
                                  </p>
                                  <p className="mt-2 text-base font-semibold text-white">{event.change_summary}</p>
                                </div>
                                <StatusPill label={`confidence ${formatPercent(event.confidence)}`} tone="active" />
                              </div>
                              {event.recommended_followup ? (
                                <p className="mt-3 text-sm leading-7 text-[var(--muted-strong)]">
                                  {event.recommended_followup}
                                </p>
                              ) : null}
                              {event.source_url ? (
                                <p className="mt-3 break-all text-xs text-[var(--muted)]">{event.source_url}</p>
                              ) : null}
                            </article>
                          ))
                        ) : (
                          <EmptyState message="No monitor events yet. Capture a baseline, then refresh to detect changes." />
                        )}
                      </div>
                    </SectionCard>
                  </div>
                ) : null}

                {activeTab === "blog" ? (
                  <div className="space-y-6">
                    <SectionCard
                      title="Blog Draft Generator"
                      subtitle="Configure and generate reviewable long-form content tied to a research workspace."
                      action={
                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => handleBlogDraftCreate(activeWorkspace)}
                            disabled={!isResearchSettled(activeWorkspace) || Boolean(activeWorkspace.actions.blogCreate)}
                            className="rounded-2xl border border-amber-400/35 bg-amber-400/10 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:bg-amber-400/16 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {activeWorkspace.actions.blogCreate ? "Creating..." : "Generate Blog Draft Job"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleBlogDraftRefresh(activeWorkspace)}
                            disabled={!activeWorkspace.blogDraftJobId || Boolean(activeWorkspace.actions.blogRefresh)}
                            className="rounded-2xl border border-[var(--line-strong)] bg-[var(--panel-2)] px-4 py-2 text-sm font-semibold text-[var(--muted-strong)] transition hover:border-amber-400/35 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {activeWorkspace.actions.blogRefresh ? "Refreshing..." : "Refresh Draft Job"}
                          </button>
                        </div>
                      }
                    >
                      <DraftConfigurator
                        form={activeWorkspace.blogDraftForm}
                        onChange={(updater) =>
                          mergeWorkspace(activeWorkspace.id, (workspace) => ({
                            ...workspace,
                            blogDraftForm: updater(workspace.blogDraftForm),
                          }))
                        }
                      />
                    </SectionCard>

                    <DraftResults
                      title="Blog Draft Outputs"
                      drafts={activeWorkspace.blogDrafts}
                      job={activeWorkspace.blogDraftJob}
                    />
                  </div>
                ) : null}

                {activeTab === "persona" ? (
                  <div className="space-y-6">
                    <SectionCard
                      title="Persona Posts"
                      subtitle="Generate client-voice and expert-commentary drafts without impersonation."
                      action={
                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => handlePersonaCreate(activeWorkspace)}
                            disabled={!isResearchSettled(activeWorkspace) || Boolean(activeWorkspace.actions.personaCreate)}
                            className="rounded-2xl border border-violet-400/35 bg-violet-400/10 px-4 py-2 text-sm font-semibold text-violet-100 transition hover:bg-violet-400/16 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {activeWorkspace.actions.personaCreate ? "Creating..." : "Generate Persona Post Job"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePersonaRefresh(activeWorkspace)}
                            disabled={!activeWorkspace.personaJobId || Boolean(activeWorkspace.actions.personaRefresh)}
                            className="rounded-2xl border border-[var(--line-strong)] bg-[var(--panel-2)] px-4 py-2 text-sm font-semibold text-[var(--muted-strong)] transition hover:border-violet-400/35 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {activeWorkspace.actions.personaRefresh ? "Refreshing..." : "Refresh Persona Job"}
                          </button>
                        </div>
                      }
                    >
                      <DraftConfigurator
                        form={activeWorkspace.personaForm}
                        onChange={(updater) =>
                          mergeWorkspace(activeWorkspace.id, (workspace) => ({
                            ...workspace,
                            personaForm: updater(workspace.personaForm),
                          }))
                        }
                      />
                    </SectionCard>

                    <DraftResults
                      title="Persona Draft Outputs"
                      drafts={activeWorkspace.personaDrafts}
                      job={activeWorkspace.personaJob}
                    />
                  </div>
                ) : null}
              </>
            ) : (
              <SectionCard
                title="Workspace Detail"
                subtitle="Launch or select a mission from the left rail to inspect research and downstream jobs."
              >
                <EmptyState message="No active workspace selected." />
              </SectionCard>
            )}
          </section>

          <aside className="space-y-6">
            <SectionCard
              title="Backend Operations"
              subtitle="Health, API routing, and low-level TinyFish run inspection."
              action={
                <StatusPill
                  label={health === "healthy" ? "healthy" : health === "checking" ? "checking" : "unreachable"}
                  tone={health === "healthy" ? "good" : health === "checking" ? "active" : "risk"}
                />
              }
            >
              <div className="space-y-4">
                <MiniDatum label="API base" value={API_BASE_URL} />
                <button
                  type="button"
                  onClick={() => void refreshOperations()}
                  className="w-full rounded-2xl border border-[var(--line-strong)] bg-[var(--panel-2)] px-4 py-3 text-sm font-semibold text-[var(--muted-strong)] transition hover:border-cyan-400/35 hover:text-white"
                >
                  Refresh Backend Telemetry
                </button>
              </div>
            </SectionCard>

            <SectionCard title="Create Run" subtitle="Expose the backend `/runs` debug endpoint directly from the UI.">
              <form className="space-y-4" onSubmit={handleCreateRun}>
                <Input label="Source URL" value={runForm.sourceUrl} onChange={(value) => setRunForm((current) => ({ ...current, sourceUrl: value }))} />
                <TextArea label="Goal" rows={4} value={runForm.goal} onChange={(value) => setRunForm((current) => ({ ...current, goal: value }))} />
                <button
                  type="submit"
                  disabled={runSubmitting}
                  className="w-full rounded-2xl border border-cyan-400/35 bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/16 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {runSubmitting ? "Submitting..." : "Create Debug Run"}
                </button>
                {runError ? (
                  <div className="rounded-2xl border border-rose-400/30 bg-rose-400/8 px-4 py-3 text-sm text-rose-100">
                    {runError}
                  </div>
                ) : null}
              </form>
            </SectionCard>

            <SectionCard title="Recent Runs" subtitle="Latest responses from `GET /runs`.">
              <div className="space-y-3">
                {runs.length > 0 ? (
                  runs.map((run) => (
                    <article key={run.id} className="rounded-2xl border border-[var(--line)] bg-[var(--panel-2)] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                            {run.status}
                          </p>
                          <p className="mt-2 text-sm font-semibold text-white">{run.id.slice(0, 12)}</p>
                        </div>
                        <StatusPill label={run.tinyfish_run_id ? "attached" : "queued"} tone="active" />
                      </div>
                      <p className="mt-3 break-all text-xs leading-6 text-[var(--muted-strong)]">
                        {run.source_url}
                      </p>
                      <p className="mt-3 text-xs leading-6 text-[var(--muted)]">{run.goal}</p>
                    </article>
                  ))
                ) : (
                  <EmptyState message="No debug runs available." />
                )}
              </div>
            </SectionCard>
          </aside>
        </div>
        ) : (
          <div className="grid flex-1 gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
            <SectionCard
              title="Client Profiles"
              subtitle="Create reusable client identities so every research run, opportunity set, and draft can be tailored from the same source of truth."
            >
              <form className="space-y-4" onSubmit={handleSaveClientProfile}>
                <Input
                  label="Profile name"
                  value={clientProfileForm.name}
                  onChange={(value) => setClientProfileForm((current) => ({ ...current, name: value }))}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Company"
                    value={clientProfileForm.company}
                    onChange={(value) => setClientProfileForm((current) => ({ ...current, company: value }))}
                  />
                  <Input
                    label="Role"
                    value={clientProfileForm.roleTitle}
                    onChange={(value) => setClientProfileForm((current) => ({ ...current, roleTitle: value }))}
                  />
                </div>
                <TextArea
                  label="Summary"
                  rows={4}
                  value={clientProfileForm.summary}
                  onChange={(value) => setClientProfileForm((current) => ({ ...current, summary: value }))}
                />
                <TextArea
                  label="Interests"
                  rows={3}
                  value={clientProfileForm.interestsText}
                  onChange={(value) => setClientProfileForm((current) => ({ ...current, interestsText: value }))}
                />
                <TextArea
                  label="Strengths"
                  rows={3}
                  value={clientProfileForm.strengthsText}
                  onChange={(value) => setClientProfileForm((current) => ({ ...current, strengthsText: value }))}
                />
                <TextArea
                  label="Goals"
                  rows={3}
                  value={clientProfileForm.goalsText}
                  onChange={(value) => setClientProfileForm((current) => ({ ...current, goalsText: value }))}
                />
                <TextArea
                  label="Proof points"
                  rows={3}
                  value={clientProfileForm.proofPointsText}
                  onChange={(value) => setClientProfileForm((current) => ({ ...current, proofPointsText: value }))}
                />
                <TextArea
                  label="Constraints"
                  rows={3}
                  value={clientProfileForm.constraintsText}
                  onChange={(value) => setClientProfileForm((current) => ({ ...current, constraintsText: value }))}
                />
                <TextArea
                  label="Operator notes"
                  rows={4}
                  value={clientProfileForm.profileNotes}
                  onChange={(value) => setClientProfileForm((current) => ({ ...current, profileNotes: value }))}
                />
                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    className="rounded-2xl border border-cyan-400/40 bg-cyan-400/12 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/18"
                  >
                    {editingClientProfileId ? "Update Profile" : "Create Profile"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingClientProfileId(null);
                      setClientProfileForm(initialClientProfileForm);
                    }}
                    className="rounded-2xl border border-[var(--line-strong)] bg-[var(--panel-2)] px-4 py-3 text-sm font-semibold text-[var(--muted-strong)] transition hover:border-cyan-400/35 hover:text-white"
                  >
                    Reset
                  </button>
                </div>
              </form>
            </SectionCard>

            <div className="space-y-6">
              <SectionCard
                title="Profile Registry"
                subtitle="Pick the profile to use in Operations, or edit the source profile directly here."
                action={<StatusPill label={`${clientProfiles.length} profiles`} tone="active" />}
              >
                <div className="space-y-4">
                  {clientProfiles.map((profile) => (
                    <article key={profile.id} className="rounded-3xl border border-[var(--line)] bg-[var(--panel-2)] p-5">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                            {profile.company || "Client profile"}
                          </p>
                          <h2 className="mt-2 text-xl font-semibold text-white">{profile.name}</h2>
                          <p className="mt-2 text-sm text-[var(--muted-strong)]">{profile.roleTitle}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {composer.selectedProfileId === profile.id ? <StatusPill label="selected" tone="good" /> : null}
                          <StatusPill label={`updated ${formatDate(profile.updatedAt)}`} tone="neutral" />
                        </div>
                      </div>
                      <p className="mt-4 text-sm leading-7 text-[var(--muted-strong)]">{profile.summary}</p>
                      <div className="mt-4 grid gap-4 xl:grid-cols-2">
                        <JsonBlock title="Structured Profile" value={buildClientProfileJson(profile)} />
                        <div className="space-y-3">
                          <MiniDatum label="Interests" value={profile.interestsText || "n/a"} />
                          <MiniDatum label="Strengths" value={profile.strengthsText || "n/a"} />
                          <MiniDatum label="Goals" value={profile.goalsText || "n/a"} />
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setComposer((current) => ({ ...current, selectedProfileId: profile.id }));
                            setAppMode("operations");
                          }}
                          className="rounded-2xl border border-emerald-400/35 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/16"
                        >
                          Use In Operations
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEditClientProfile(profile)}
                          className="rounded-2xl border border-[var(--line-strong)] bg-[var(--panel-2)] px-4 py-2 text-sm font-semibold text-[var(--muted-strong)] transition hover:border-cyan-400/35 hover:text-white"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteClientProfile(profile.id)}
                          className="rounded-2xl border border-rose-400/35 bg-rose-400/10 px-4 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-400/16"
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </SectionCard>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function DraftConfigurator({
  form,
  onChange,
}: {
  form: DraftFormState;
  onChange: (updater: (current: DraftFormState) => DraftFormState) => void;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label="Goal"
            value={form.goal}
            onChange={(value) => onChange((current) => ({ ...current, goal: value }))}
          />
          <Input
            label="Draft count"
            value={form.draftCount}
            onChange={(value) => onChange((current) => ({ ...current, draftCount: value }))}
          />
          <Input
            label="Length"
            value={form.targetLength}
            onChange={(value) => onChange((current) => ({ ...current, targetLength: value }))}
          />
        </div>
        <Input
          label="Client name"
          value={form.clientName}
          onChange={(value) => onChange((current) => ({ ...current, clientName: value }))}
        />
        <TextArea
          label="Style constraints"
          rows={4}
          value={form.styleConstraints}
          onChange={(value) => onChange((current) => ({ ...current, styleConstraints: value }))}
        />
        <TextArea
          label="Persona constraints"
          rows={4}
          value={form.personaConstraints}
          onChange={(value) => onChange((current) => ({ ...current, personaConstraints: value }))}
        />
      </div>
      <div className="space-y-4">
        <Input
          label="Requested angles"
          value={form.requestedAnglesText}
          onChange={(value) => onChange((current) => ({ ...current, requestedAnglesText: value }))}
        />
        <TextArea
          label="Client profile JSON"
          rows={12}
          value={form.clientProfileText}
          onChange={(value) => onChange((current) => ({ ...current, clientProfileText: value }))}
        />
      </div>
    </div>
  );
}

function DraftResults({
  title,
  drafts,
  job,
}: {
  title: string;
  drafts: BlogDraftResponse[];
  job: BlogDraftJobResponse | null;
}) {
  return (
    <SectionCard title={title} subtitle="Generated outputs, resonance metadata, and evidence references.">
      <div className="grid gap-4 xl:grid-cols-2">
        <JsonBlock title="Job" value={job} />
        <JsonBlock title="Resonance Profile" value={job?.resonance_profile_jsonb} />
      </div>

      <div className="mt-5 space-y-4">
        {drafts.length > 0 ? (
          drafts.map((draft) => (
            <article key={draft.id} className="rounded-3xl border border-[var(--line)] bg-[var(--panel-2)] p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                    {draft.author_mode.replaceAll("_", " ")}
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-white">{draft.title}</h3>
                  <p className="mt-3 max-w-4xl text-sm leading-7 text-[var(--muted-strong)]">{draft.summary}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusPill label={draft.angle} tone="active" />
                  <StatusPill label={draft.slug_suggestion ?? "no slug"} tone="neutral" />
                </div>
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <JsonBlock title="Outline" value={draft.outline_jsonb} />
                <JsonBlock title="Quality" value={draft.quality_jsonb} />
              </div>
              <div className="mt-4 rounded-2xl border border-[var(--line)] bg-[var(--panel-3)] px-4 py-4 text-sm leading-7 text-[var(--text)] whitespace-pre-wrap">
                {draft.body_markdown}
              </div>
            </article>
          ))
        ) : (
          <EmptyState message="No generated drafts yet for this job." />
        )}
      </div>
    </SectionCard>
  );
}

function InsightGroup({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel-2)] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">{title}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.length > 0 ? (
          items.map((item) => <StatusPill key={item} label={item} tone="neutral" />)
        ) : (
          <p className="text-sm text-[var(--muted-strong)]">No signals yet.</p>
        )}
      </div>
    </div>
  );
}

function ActionButton({
  label,
  detail,
  disabled,
  onClick,
}: {
  label: string;
  detail: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-2xl border border-[var(--line)] bg-[var(--panel-2)] p-4 text-left transition hover:border-cyan-400/30 hover:bg-[var(--panel-3)] disabled:cursor-not-allowed disabled:opacity-50"
    >
      <p className="text-sm font-semibold text-white">{label}</p>
      <p className="mt-2 text-xs leading-6 text-[var(--muted)]">{detail}</p>
    </button>
  );
}

function SignalCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-[var(--line)] bg-[var(--panel)] px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function MiniDatum({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel-2)] px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">{label}</p>
      <p className="mt-2 break-words text-sm text-[var(--muted-strong)]">{value}</p>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-[var(--line)] bg-[var(--panel-3)] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40"
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-[var(--line)] bg-[var(--panel-3)] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40"
      >
        <option value="">Select a profile</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows: number;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
        {label}
      </span>
      <textarea
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full resize-y rounded-2xl border border-[var(--line)] bg-[var(--panel-3)] px-4 py-3 text-sm leading-7 text-white outline-none transition focus:border-cyan-400/40"
      />
    </label>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-[var(--line-strong)] bg-[var(--panel-2)] px-5 py-6 text-sm leading-7 text-[var(--muted-strong)]">
      {message}
    </div>
  );
}

function asStringList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function asNamedList(collection: unknown, key: string, field: string) {
  if (!collection || typeof collection !== "object") {
    return [];
  }

  const items = (collection as Record<string, unknown>)[key];
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const value = (item as Record<string, unknown>)[field];
      return typeof value === "string" ? value : null;
    })
    .filter((item): item is string => Boolean(item));
}
