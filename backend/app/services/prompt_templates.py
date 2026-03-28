from urllib.parse import quote_plus

from app.models import ResearchJob


def _format_client_context(job: ResearchJob) -> str:
    return f"""
Client context:
- Client name: {job.client_name}
- Client profile: {job.client_profile_jsonb}
""".strip()


def build_discovery_targets(job: ResearchJob) -> list[dict[str, str]]:
    company = job.company_name or ""
    domain = job.company_domain or ""
    base_query = " ".join(part for part in [job.candidate_name, company, job.role_title or ""] if part).strip()

    targets = [
        {
            "url": f"https://www.bing.com/search?q={quote_plus(base_query + ' linkedin')}",
            "goal": build_discovery_goal(job, "linkedin"),
        },
        {
            "url": f"https://www.bing.com/search?q={quote_plus(base_query + ' github OR personal site')}",
            "goal": build_discovery_goal(job, "github_personal"),
        },
        {
            "url": f"https://www.bing.com/search?q={quote_plus(base_query + ' talk OR podcast OR article')}",
            "goal": build_discovery_goal(job, "talks_articles"),
        },
    ]

    if domain:
        targets.append(
            {
                "url": f"https://www.bing.com/search?q={quote_plus(base_query + ' site:' + domain)}",
                "goal": build_discovery_goal(job, "company_site"),
            }
        )

    return targets


def build_discovery_goal(job: ResearchJob, search_type: str) -> str:
    company = job.company_name or "the target company"
    return f"""
Find public professional pages about {job.candidate_name} related to {company}.
Search focus: {search_type}.
{_format_client_context(job)}
Prioritize evidence that would help personalize advice, positioning, and content ideas for this specific client.
Return JSON:
{{
  "matches": [
    {{
      "title": "string",
      "url": "string",
      "source_type": "company_bio | linkedin | github | talk | article | podcast | other",
      "confidence": 0.0
    }}
  ],
  "notes": "string",
  "success": true
}}
Stop when:
- 5 likely matches are found
- or the page has no more relevant results
If blocked or incomplete, return:
{{
  "success": false,
  "error_type": "timeout | blocked | not_found",
  "partial_results": []
}}
""".strip()


def build_extraction_goal(job: ResearchJob, page_url: str) -> str:
    company = job.company_name or "the target company"
    return f"""
Extract public professional information about {job.candidate_name} related to {company} from this page: {page_url}.
{_format_client_context(job)}
Favor extracting themes and signals that can help tailor recommendations and drafts to the client context.
Return JSON:
{{
  "person": {{
    "name": "string",
    "current_role": "string",
    "company": "string"
  }},
  "source": {{
    "url": "string",
    "source_type": "company_bio | linkedin | github | talk | article | podcast | other",
    "published_at": "string | null",
    "is_primary_source": true
  }},
  "evidence": {{
    "expertise_themes": ["string"],
    "notable_projects": ["string"],
    "quotes_or_claims": ["string"],
    "leadership_signals": ["string"],
    "technical_depth_signals": ["string"]
  }},
  "confidence": 0.0,
  "success": true
}}
Stop when:
- the page no longer contains relevant information
- or the structured fields above are filled
If blocked or incomplete, return:
{{
  "success": false,
  "error_type": "timeout | blocked | not_found",
  "partial_results": []
}}
""".strip()


def build_resonance_profile_prompts(
    *,
    candidate_name: str,
    company_name: str | None,
    goal: str,
    seed_profile: dict,
    evidence_summary: list[dict],
    discovery_insights: dict | None,
    style_constraints: str | None,
    persona_constraints: str | None,
) -> tuple[str, str]:
    system_prompt = """
You create audience resonance profiles for technical blog drafting.
Output only valid JSON.
Do not invent personal history or private information.
Use only the supplied evidence.
""".strip()

    user_prompt = f"""
Create a resonance profile for blog drafts intended to resonate with this target.

Target:
- Name: {candidate_name}
- Company: {company_name}
- Goal: {goal}

Seed profile:
{seed_profile}

Evidence summary:
{evidence_summary}

Discovery insights:
{discovery_insights}

Style constraints:
{style_constraints}

Persona constraints:
{persona_constraints}

Return JSON with:
{{
  "top_themes": ["string"],
  "preferred_content_formats": ["string"],
  "tone_preferences": ["string"],
  "technical_depth": "medium | high",
  "resonance_signals": ["string"],
  "avoid": ["string"],
  "summary": "string"
}}
""".strip()
    return system_prompt, user_prompt


def build_blog_draft_prompts(
    *,
    candidate_name: str,
    company_name: str | None,
    goal: str,
    draft_count: int,
    target_length: str,
    resonance_profile: dict,
    evidence_summary: list[dict],
    discovery_insights: dict | None,
    style_constraints: str | None,
    persona_constraints: str | None,
    client_name: str | None,
    client_profile: dict | None,
    requested_angles: list[str] | None,
) -> tuple[str, str]:
    system_prompt = """
You write reviewable technical blog drafts for a human author.
Output only valid JSON.
Do not imitate the target's voice.
Do not invent credentials, projects, or personal anecdotes.
Write with technical depth, specificity, and sincere curiosity.
Do not impersonate a real authority or fabricate endorsement from a real person.
When asked for expert-style commentary, write it as a clearly non-attributed editorial perspective.
""".strip()

    user_prompt = f"""
Generate {draft_count} distinct blog post drafts for a human author who wants to publish thoughtful online writing that would resonate with this target audience.

Audience target:
- Name: {candidate_name}
- Company: {company_name}
- Goal: {goal}
- Target length: {target_length}

Resonance profile:
{resonance_profile}

Evidence summary:
{evidence_summary}

Discovery insights:
{discovery_insights}

Style constraints:
{style_constraints}

Persona constraints:
{persona_constraints}

Client context:
- Client name: {client_name}
- Client profile: {client_profile}
- Requested angles: {requested_angles}

Return JSON with:
{{
  "drafts": [
    {{
      "angle": "client_voice | expert_commentary",
      "author_mode": "client_voice | expert_commentary",
      "title": "string",
      "slug_suggestion": "string",
      "summary": "string",
      "audience_fit_rationale": "string",
      "discovery_alignment": {{
        "used_interest_signals": ["string"],
        "used_content_angles": ["string"],
        "used_credibility_opportunities": ["string"]
      }},
      "outline": {{
        "sections": ["string"]
      }},
      "body_markdown": "string",
      "disclosure_note": "string",
      "key_takeaways": ["string"],
      "tags": ["string"],
      "evidence_references": [
        {{
          "source_url": "string",
          "source_type": "string",
          "reason": "string"
        }}
      ],
      "quality": {{
        "depth_score": 0.0,
        "specificity_score": 0.0,
        "resonance_fit_score": 0.0,
        "warning_flags": ["string"]
      }}
    }}
  ]
}}
""".strip()
    return system_prompt, user_prompt


def build_discovery_insights_prompts(
    *,
    candidate_name: str,
    company_name: str | None,
    role_title: str | None,
    search_context: str | None,
    client_name: str | None,
    client_profile: dict | None,
    seed_profile: dict,
    evidence_summary: list[dict],
    heuristic_insights: dict,
) -> tuple[str, str]:
    system_prompt = """
You analyze public-professional evidence about a target and return safe discovery insights.
Output only valid JSON.
Only use publicly visible, professionally relevant interests.
Do not infer private life details, sensitive traits, or non-public personal information.
Avoid creepy or manipulative recommendations.
""".strip()

    user_prompt = f"""
Create safe discovery insights for a backend system.

Target:
- Name: {candidate_name}
- Company: {company_name}
- Role: {role_title}
- Search context: {search_context}

Client context:
- Client name: {client_name}
- Client profile: {client_profile}

Seed profile:
{seed_profile}

Evidence summary:
{evidence_summary}

Heuristic insights:
{heuristic_insights}

Return JSON with:
{{
  "public_interest_signals": [
    {{
      "interest": "string",
      "evidence_strength": "low | medium | high",
      "visibility": "public",
      "safe_use": "string"
    }}
  ],
  "safe_content_angles": [
    {{
      "angle": "string",
      "why_it_resonates": "string",
      "client_fit_note": "string"
    }}
  ],
  "engagement_opportunities": [
    {{
      "type": "commentary | talk_followup | open_source_engagement | community_participation",
      "description": "string",
      "candidate_urls": ["string"]
    }}
  ],
  "contribution_opportunities": [
    {{
      "theme": "string",
      "suggestion": "string",
      "client_fit_note": "string"
    }}
  ],
  "credibility_opportunities": ["string"],
  "guardrails": ["string"],
  "source_type_distribution": {{}}
}}
""".strip()
    return system_prompt, user_prompt
