import type { BlogDraftJobCreate, ResearchJobCreate } from "./types";
import {
  defaultDraftForm,
  initialIntake,
  normalizeNullable,
  splitCsv,
  type DraftForm,
  type IntakeForm,
  type WorkspaceSummary,
} from "./workspaces";

export function buildClientProfile(input: {
  clientRole: string;
  clientInterests: string;
  clientStrengths: string;
}) {
  return {
    current_role: normalizeNullable(input.clientRole),
    interests: splitCsv(input.clientInterests),
    strengths: splitCsv(input.clientStrengths),
  };
}

export function buildResearchPayload(form: IntakeForm): ResearchJobCreate {
  return {
    candidate_name: form.candidateName.trim(),
    company_name: normalizeNullable(form.companyName),
    company_domain: normalizeNullable(form.companyDomain),
    role_title: normalizeNullable(form.roleTitle),
    search_context: normalizeNullable(form.searchContext),
    client_name: normalizeNullable(form.clientName),
    client_profile: buildClientProfile(form),
  };
}

export function buildDraftPayload(form: DraftForm, workspace: WorkspaceSummary): BlogDraftJobCreate {
  return {
    goal: form.goal.trim() || defaultDraftForm.goal,
    draft_count: Number.parseInt(form.draftCount, 10) || 2,
    target_length: form.targetLength,
    style_constraints: normalizeNullable(form.styleConstraints),
    persona_constraints: normalizeNullable(form.personaConstraints),
    client_name: normalizeNullable(workspace.clientName),
    client_profile: buildClientProfile({
      ...initialIntake,
      clientRole: workspace.clientRole,
      clientInterests: workspace.clientInterests,
      clientStrengths: workspace.clientStrengths,
    }),
    requested_angles: splitCsv(form.requestedAngles),
  };
}
