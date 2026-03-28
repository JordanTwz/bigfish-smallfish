# FastAPI Backend

## Setup

Copy the env template:

```bash
cp .env.example .env
```

Set these values in `.env`:

```env
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/bigfish_smallfish
TINYFISH_API_KEY=your_tinyfish_key_here
OPENAI_API_KEY=your_openai_key_here
MATAROA_USERNAME=your_mataroa_username
MATAROA_PASSWORD=your_mataroa_password
```

Start the API and database:

```bash
docker compose up -d --build
```

Run migrations:

```bash
docker compose run --rm api alembic upgrade head
```

After backend code changes:

```bash
docker compose up -d --build --force-recreate api
```

The API runs at `http://localhost:8000`.

## Health Check

```bash
curl http://localhost:8000/health
```

## Example Story

A client wants to build real public credibility with a specific target, such as an engineer, founder, researcher, or hiring manager they want to be noticed by. The backend starts by researching the target's public professional footprint with TinyFish, then extracts themes, interests, and safe content angles that are visible from public sources.

From there, the client can use the opportunity engine to decide what to do next: publish a relevant technical post, strengthen a weak profile signal, contribute in a nearby technical community, or leave a thoughtful comment on a public surface the target is likely to respect. The monitoring flow keeps watching for new public signals, such as a new article, repo, or interest area, so the client can react at the right time instead of publishing blindly.

The content-generation endpoints then turn those insights into reviewable drafts. The goal is not imitation or fake familiarity. The goal is to help the client show visible depth, aligned interests, and authentic technical taste in places the target might naturally encounter.

## Main Flow

### 1. Create a research job

```bash
curl -X POST http://localhost:8000/research-jobs \
  -H "Content-Type: application/json" \
  -d '{
    "candidate_name": "Guido van Rossum",
    "company_name": "Microsoft",
    "company_domain": "microsoft.com",
    "role_title": "Distinguished Engineer",
    "search_context": "Public professional profile search"
  }'
```

### 2. Poll the research job

```bash
curl http://localhost:8000/research-jobs/<job_id>
```

When the job is done, the response includes:
- ranked sources
- a final brief
- `discovery_insights` with public interest signals, safe content angles, and credibility opportunities

### 3. Inspect sources

```bash
curl http://localhost:8000/research-jobs/<job_id>/sources
```

## Opportunities

Create ranked next-best actions from a completed research job:

```bash
curl -X POST http://localhost:8000/research-jobs/<job_id>/opportunities
```

Poll the opportunity job:

```bash
curl http://localhost:8000/opportunity-jobs/<opportunity_job_id>
```

Fetch the ranked items:

```bash
curl http://localhost:8000/opportunity-jobs/<opportunity_job_id>/items
```

These can include content ideas, profile updates, public engagement opportunities, and contribution ideas.

## Monitoring

Capture a baseline snapshot for a target:

```bash
curl -X POST http://localhost:8000/research-jobs/<job_id>/monitor \
  -H "Content-Type: application/json" \
  -d '{"cadence":"manual"}'
```

Check the monitor job:

```bash
curl http://localhost:8000/monitor-jobs/<monitor_job_id>
```

Run a refresh:

```bash
curl -X POST http://localhost:8000/monitor-jobs/<monitor_job_id>/refresh
```

Fetch detected changes:

```bash
curl http://localhost:8000/monitor-jobs/<monitor_job_id>/events
```

## Blog Drafts

Create reviewable blog drafts from a completed research job:

```bash
curl -X POST http://localhost:8000/research-jobs/<job_id>/blog-drafts \
  -H "Content-Type: application/json" \
  -d '{
    "goal": "resonance",
    "draft_count": 2,
    "target_length": "medium",
    "style_constraints": "Technical and specific.",
    "persona_constraints": "Do not mimic the target."
  }'
```

Poll the draft job:

```bash
curl http://localhost:8000/blog-draft-jobs/<blog_draft_job_id>
```

Fetch the drafts:

```bash
curl http://localhost:8000/blog-draft-jobs/<blog_draft_job_id>/drafts
```

## Persona Posts

Create persona-building drafts from two safe angles:
- `client_voice`
- `expert_commentary`

```bash
curl -X POST http://localhost:8000/research-jobs/<job_id>/persona-post-jobs \
  -H "Content-Type: application/json" \
  -d '{
    "goal": "credibility",
    "draft_count": 2,
    "target_length": "medium",
    "client_name": "Jane Smith",
    "client_profile": {
      "current_role": "Backend engineer",
      "interests": ["distributed systems", "observability"]
    },
    "requested_angles": ["client_voice", "expert_commentary"],
    "style_constraints": "Technical and clear.",
    "persona_constraints": "Do not impersonate a real authority."
  }'
```

Poll the persona post job:

```bash
curl http://localhost:8000/persona-post-jobs/<persona_post_job_id>
```

Fetch the drafts:

```bash
curl http://localhost:8000/persona-post-jobs/<persona_post_job_id>/drafts
```

`expert_commentary` is non-attributed editorial commentary, not a fake endorsement.

## Mataroa Publish

Fetch the latest generated blog draft and publish it to Mataroa with TinyFish:

```bash
curl http://localhost:8000/blog-drafts/latest
curl -X POST http://localhost:8000/blog-drafts/latest/publish
```

## Debug Endpoints

These are mostly for low-level debugging:

```bash
curl http://localhost:8000/runs
curl http://localhost:8000/runs/<run_id>
```
