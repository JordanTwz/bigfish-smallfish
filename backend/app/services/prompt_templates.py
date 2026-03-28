from urllib.parse import quote_plus

from app.models import ResearchJob


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
