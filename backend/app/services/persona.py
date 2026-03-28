from collections import Counter

from app.models import ResearchJob, SourceCandidate


def build_seed_profile(job: ResearchJob, sources: list[SourceCandidate]) -> dict:
    themes = Counter()
    source_types = Counter()

    for source in sources:
        if source.source_type:
            source_types[source.source_type] += 1
        evidence = source.evidence_jsonb or {}
        nested_evidence = evidence.get("evidence") or {}
        for theme in nested_evidence.get("expertise_themes") or []:
            if isinstance(theme, str) and theme.strip():
                themes[theme.strip()] += 1

    top_themes = [theme for theme, _count in themes.most_common(5)]
    if not top_themes:
        top_themes = _fallback_themes(job, sources)

    dominant_source_types = [source_type for source_type, _count in source_types.most_common(4)]

    tone_preferences = ["rigorous", "specific", "evidence-backed"]
    if any("github" == source_type for source_type in dominant_source_types):
        tone_preferences.append("builder-oriented")
    if any(source_type in {"talk", "article", "podcast"} for source_type in dominant_source_types):
        tone_preferences.append("thoughtful")

    return {
        "candidate_name": job.candidate_name,
        "company_name": job.company_name,
        "client_name": job.client_name,
        "client_profile": job.client_profile_jsonb,
        "top_themes": top_themes,
        "dominant_source_types": dominant_source_types,
        "technical_depth": "high" if len(top_themes) >= 3 else "medium",
        "tone_preferences": tone_preferences,
        "resonance_signals": [
            "depth over breadth",
            "clear tradeoff analysis",
            "evidence-backed claims",
            "practical engineering insight",
        ],
        "avoid": [
            "generic career advice",
            "invented personal anecdotes",
            "shallow trend commentary",
            "performative praise",
        ],
    }


def build_evidence_summary(sources: list[SourceCandidate], limit: int = 8) -> list[dict]:
    summaries: list[dict] = []
    for source in sorted(sources, key=lambda item: (item.ranking_score or item.confidence or 0.0), reverse=True)[:limit]:
        evidence = source.evidence_jsonb or {}
        nested_evidence = evidence.get("evidence") or {}
        summaries.append(
            {
                "source_id": str(source.id),
                "title": source.title,
                "url": source.url,
                "source_type": source.source_type,
                "confidence": source.confidence,
                "ranking_score": source.ranking_score,
                "themes": nested_evidence.get("expertise_themes") or [],
                "projects": nested_evidence.get("notable_projects") or [],
                "leadership_signals": nested_evidence.get("leadership_signals") or [],
                "technical_depth_signals": nested_evidence.get("technical_depth_signals") or [],
            }
        )
    return summaries


def _fallback_themes(job: ResearchJob, sources: list[SourceCandidate]) -> list[str]:
    text = " ".join(
        filter(
            None,
            [
                job.role_title or "",
                job.search_context or "",
                " ".join((source.title or "") for source in sources[:5]),
            ],
        )
    ).lower()

    themes = []
    if "backend" in text or "distributed" in text:
        themes.append("distributed systems")
    if "research" in text:
        themes.append("research depth")
    if "student" in text or "academic" in text:
        themes.append("technical learning")
    if "manager" in text or "lead" in text:
        themes.append("engineering leadership")
    if not themes:
        themes.append("software engineering craftsmanship")
    return themes
