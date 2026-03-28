export type JsonRecord = Record<string, unknown>;

export type ResearchJob = {
  id: string;
  status: string;
  candidate_name: string;
  company_name: string | null;
  company_domain: string | null;
  role_title: string | null;
  search_context: string | null;
  client_name: string | null;
  client_profile_jsonb: JsonRecord | null;
  final_brief_jsonb: JsonRecord | null;
  error_jsonb: JsonRecord | null;
  created_at: string;
  updated_at: string;
  finished_at: string | null;
};

export type SourceCandidate = {
  id: string;
  research_job_id: string;
  url: string;
  normalized_url: string | null;
  title: string | null;
  source_type: string | null;
  stage: string;
  confidence: number | null;
  ranking_score: number | null;
  evidence_jsonb: JsonRecord | null;
  created_at: string;
  updated_at: string;
};

export type OpportunityJob = {
  id: string;
  research_job_id: string;
  status: string;
  summary_jsonb: JsonRecord | null;
  error_jsonb: JsonRecord | null;
  created_at: string;
  updated_at: string;
  finished_at: string | null;
};

export type Opportunity = {
  id: string;
  opportunity_job_id: string;
  type: string;
  title: string;
  description: string;
  target_url: string | null;
  theme: string | null;
  estimated_impact: number | null;
  estimated_effort: number | null;
  confidence: number | null;
  why_now: string | null;
  supporting_sources_jsonb: JsonRecord[] | null;
  recommended_asset_type: string | null;
  priority_score: number | null;
  created_at: string;
};

export type MonitorJob = {
  id: string;
  research_job_id: string;
  status: string;
  cadence: string;
  active: boolean;
  snapshot_jsonb: JsonRecord | null;
  summary_jsonb: JsonRecord | null;
  error_jsonb: JsonRecord | null;
  last_checked_at: string | null;
  next_check_at: string | null;
  created_at: string;
  updated_at: string;
};

export type MonitorEvent = {
  id: string;
  monitor_job_id: string;
  event_type: string;
  source_url: string | null;
  change_summary: string;
  confidence: number | null;
  recommended_followup: string | null;
  payload_jsonb: JsonRecord | null;
  created_at: string;
};

export type BlogDraftJob = {
  id: string;
  research_job_id: string;
  status: string;
  goal: string;
  draft_count: number;
  target_length: string;
  style_constraints: string | null;
  persona_constraints: string | null;
  client_name: string | null;
  client_profile_jsonb: JsonRecord | null;
  requested_angles_jsonb: string[] | null;
  resonance_profile_jsonb: JsonRecord | null;
  error_jsonb: JsonRecord | null;
  created_at: string;
  updated_at: string;
  finished_at: string | null;
};

export type BlogDraft = {
  id: string;
  blog_draft_job_id: string;
  title: string;
  angle: string;
  author_mode: string;
  slug_suggestion: string | null;
  summary: string;
  audience_fit_rationale: string;
  outline_jsonb: JsonRecord;
  body_markdown: string;
  disclosure_note: string | null;
  key_takeaways_jsonb: string[] | null;
  tags_jsonb: string[] | null;
  evidence_references_jsonb: JsonRecord[] | null;
  quality_jsonb: JsonRecord | null;
  created_at: string;
  updated_at: string;
};

export type ResearchJobCreatePayload = {
  candidate_name: string;
  company_name?: string;
  company_domain?: string;
  role_title?: string;
  search_context?: string;
  client_name?: string;
  client_profile?: JsonRecord;
};

export type BlogDraftJobCreatePayload = {
  goal: string;
  draft_count: number;
  target_length: string;
  style_constraints?: string;
  persona_constraints?: string;
  client_name?: string;
  client_profile?: JsonRecord;
  requested_angles?: string[];
};
