from collections import Counter

from app.config import settings
from app.models import ResearchJob, SourceCandidate
from app.services.openai_content import OpenAIContentClient, OpenAIContentError
from app.services.persona import build_evidence_summary, build_seed_profile
from app.services.prompt_templates import build_discovery_insights_prompts


def build_discovery_insights(job: ResearchJob, sources: list[SourceCandidate]) -> dict:
    heuristic_insights = _build_heuristic_insights(job, sources)
    if not settings.openai_api_key:
        return heuristic_insights

    try:
        client = OpenAIContentClient()
        evidence_summary = build_evidence_summary(sources)
        seed_profile = build_seed_profile(job, sources)
        system_prompt, user_prompt = build_discovery_insights_prompts(
            candidate_name=job.candidate_name,
            company_name=job.company_name,
            role_title=job.role_title,
            search_context=job.search_context,
            client_name=job.client_name,
            client_profile=job.client_profile_jsonb,
            seed_profile=seed_profile,
            evidence_summary=evidence_summary,
            heuristic_insights=heuristic_insights,
        )
        insights = client.generate_json(system_prompt=system_prompt, user_prompt=user_prompt)
        if isinstance(insights, dict):
            return insights
    except OpenAIContentError:
        pass

    return heuristic_insights


def _build_heuristic_insights(job: ResearchJob, sources: list[SourceCandidate]) -> dict:
    theme_counter: Counter = Counter()
    source_type_counter: Counter = Counter()
    github_urls = []
    article_urls = []
    talk_urls = []

    for source in sources:
        if source.source_type:
            source_type_counter[source.source_type] += 1
        evidence = source.evidence_jsonb or {}
        nested_evidence = evidence.get("evidence") or {}
        for theme in nested_evidence.get("expertise_themes") or []:
            if isinstance(theme, str) and theme.strip():
                theme_counter[theme.strip()] += 1

        if source.source_type == "github":
            github_urls.append(source.url)
        elif source.source_type in {"article", "podcast"}:
            article_urls.append(source.url)
        elif source.source_type == "talk":
            talk_urls.append(source.url)

    top_themes = [theme for theme, _count in theme_counter.most_common(5)]
    if not top_themes:
        top_themes = build_seed_profile(job, sources).get("top_themes", [])

    client_profile = job.client_profile_jsonb or {}
    client_interests = [
        interest.strip()
        for interest in client_profile.get("interests", []) if isinstance(interest, str) and interest.strip()
    ] if isinstance(client_profile, dict) else []
    client_strengths = [
        strength.strip()
        for strength in client_profile.get("strengths", []) if isinstance(strength, str) and strength.strip()
    ] if isinstance(client_profile, dict) else []

    public_interest_signals = [
        {
            "interest": theme,
            "evidence_strength": "high" if count >= 2 else "medium",
            "visibility": "public",
            "safe_use": "Use this as a professional interest signal, not as a personal-life claim.",
            "client_overlap": theme in client_interests,
        }
        for theme, count in theme_counter.most_common(5)
    ]

    safe_content_angles = [
        {
            "angle": f"What {theme} taught me about building reliable systems",
            "why_it_resonates": f"Matches the target's visible interest in {theme}.",
            "client_fit_note": _client_fit_note(theme, client_interests, client_strengths),
        }
        for theme in top_themes[:3]
    ]

    engagement_opportunities = []
    if article_urls:
        engagement_opportunities.append(
            {
                "type": "commentary",
                "description": "Respond to articles or podcasts in the target's interest area with technical follow-up observations.",
                "candidate_urls": article_urls[:3],
            }
        )
    if talk_urls:
        engagement_opportunities.append(
            {
                "type": "talk_followup",
                "description": "Publish concise reflections or practical takeaways from talks related to the target's themes.",
                "candidate_urls": talk_urls[:3],
            }
        )
    if github_urls:
        engagement_opportunities.append(
            {
                "type": "open_source_engagement",
                "description": "Engage in adjacent GitHub repos through issues, discussions, or small contribution notes.",
                "candidate_urls": github_urls[:3],
            }
        )

    contribution_opportunities = [
        {
            "theme": theme,
            "suggestion": f"Contribute code comments, issue analysis, or technical notes in public spaces related to {theme}.",
            "client_fit_note": _client_fit_note(theme, client_interests, client_strengths),
        }
        for theme in top_themes[:3]
    ]

    credibility_opportunities = [
        "Publish short technical reflections tied to visible target themes.",
        "Strengthen GitHub/profile signals around the top evidence themes.",
        "Reference real projects, code, or experiments instead of generic opinions.",
    ]

    guardrails = [
        "Only use public, professionally relevant interests.",
        "Do not infer private life details or sensitive traits.",
        "Do not overfit to weak or one-off signals.",
        "Do not present speculation as fact.",
        "Keep recommendations relevant to technical or public-facing interests.",
    ]

    return {
        "public_interest_signals": public_interest_signals,
        "safe_content_angles": safe_content_angles,
        "engagement_opportunities": engagement_opportunities,
        "contribution_opportunities": contribution_opportunities,
        "credibility_opportunities": credibility_opportunities,
        "guardrails": guardrails,
        "source_type_distribution": dict(source_type_counter),
        "client_alignment_summary": {
            "client_name": job.client_name,
            "known_interests": client_interests,
            "known_strengths": client_strengths,
        },
    }


def _client_fit_note(theme: str, client_interests: list[str], client_strengths: list[str]) -> str:
    if theme in client_interests:
        return f"This theme already overlaps with the client's stated interests in {theme}."
    if client_strengths:
        return f"Connect this theme to one of the client's strengths: {', '.join(client_strengths[:2])}."
    if client_interests:
        return f"Bridge this theme to adjacent client interests such as {', '.join(client_interests[:2])}."
    return "Tailor the angle to the client's real experience before publishing."
