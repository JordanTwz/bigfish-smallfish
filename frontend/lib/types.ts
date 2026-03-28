export type ResearchJobCreate = {
  candidate_name: string;
  company_name: string | null;
  company_domain: string | null;
  role_title: string | null;
  search_context: string | null;
  client_name: string | null;
  client_profile: Record<string, unknown> | null;
};

export type ResearchJobResponse = {
  id: string;
  status: string;
  candidate_name: string;
  company_name: string | null;
  company_domain: string | null;
  role_title: string | null;
  search_context: string | null;
  client_name: string | null;
  client_profile_jsonb: Record<string, unknown> | null;
  final_brief_jsonb: Record<string, unknown> | null;
  error_jsonb: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  finished_at: string | null;
};

export type SourceCandidateResponse = {
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

export type OpportunityJobResponse = {
  id: string;
  research_job_id: string;
  status: string;
  summary_jsonb: Record<string, unknown> | null;
  error_jsonb: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  finished_at: string | null;
};

export type OpportunityResponse = {
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
  supporting_sources_jsonb: Array<Record<string, unknown>> | null;
  recommended_asset_type: string | null;
  priority_score: number | null;
  created_at: string;
};

export type MonitorJobCreate = {
  cadence: string;
};

export type MonitorJobResponse = {
  id: string;
  research_job_id: string;
  status: string;
  cadence: string;
  active: boolean;
  snapshot_jsonb: Record<string, unknown> | null;
  summary_jsonb: Record<string, unknown> | null;
  error_jsonb: Record<string, unknown> | null;
  last_checked_at: string | null;
  next_check_at: string | null;
  created_at: string;
  updated_at: string;
};

export type MonitorEventResponse = {
  id: string;
  monitor_job_id: string;
  event_type: string;
  source_url: string | null;
  change_summary: string;
  confidence: number | null;
  recommended_followup: string | null;
  payload_jsonb: Record<string, unknown> | null;
  created_at: string;
};

export type BlogDraftJobCreate = {
  goal: string;
  draft_count: number;
  target_length: string;
  style_constraints: string | null;
  persona_constraints: string | null;
  client_name: string | null;
  client_profile: Record<string, unknown> | null;
  requested_angles: string[] | null;
};

export type BlogDraftJobResponse = {
  id: string;
  research_job_id: string;
  status: string;
  goal: string;
  draft_count: number;
  target_length: string;
  style_constraints: string | null;
  persona_constraints: string | null;
  client_name: string | null;
  client_profile_jsonb: Record<string, unknown> | null;
  requested_angles_jsonb: string[] | null;
  resonance_profile_jsonb: Record<string, unknown> | null;
  error_jsonb: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  finished_at: string | null;
};

export type BlogDraftResponse = {
  id: string;
  blog_draft_job_id: string;
  title: string;
  angle: string;
  author_mode: string;
  slug_suggestion: string | null;
  summary: string;
  audience_fit_rationale: string;
  outline_jsonb: Record<string, unknown>;
  body_markdown: string;
  disclosure_note: string | null;
  key_takeaways_jsonb: string[] | null;
  tags_jsonb: string[] | null;
  evidence_references_jsonb: Array<Record<string, unknown>> | null;
  quality_jsonb: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type RunResponse = {
  id: string;
  tinyfish_run_id: string | null;
  status: string;
  source_url: string;
  goal: string;
  result_jsonb: Record<string, unknown> | null;
  error_jsonb: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  finished_at: string | null;
};

export type RunCreate = {
  source_url: string;
  goal: string;
};
