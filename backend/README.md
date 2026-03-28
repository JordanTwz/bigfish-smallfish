# FastAPI Backend

## Run With Docker

```bash
cp .env.example .env
docker compose up --build api
```

Run migrations in a separate terminal:

```bash
docker compose run --rm api alembic upgrade head
```

The API is available at `http://localhost:8000` and Postgres is available at `localhost:5432`.

After backend code changes, rebuild the API container:

```bash
docker compose up -d --build --force-recreate api
```

## Install Locally

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e .
```

## Configure

```bash
cp .env.example .env
```

Required environment variables in `.env`:

```env
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/bigfish_smallfish
TINYFISH_API_KEY=your_tinyfish_key_here
OPENAI_API_KEY=your_openai_key_here
```

## Start Postgres

```bash
docker compose up -d db
```

## Run Migrations

```bash
alembic upgrade head
```

## Run API

```bash
uvicorn app.main:app --reload
```

## End-to-End Flow

1. Configure `.env` with:

```env
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/bigfish_smallfish
TINYFISH_API_KEY=your_tinyfish_key_here
OPENAI_API_KEY=your_openai_key_here
```

2. Rebuild and run the API container:

```bash
docker compose up -d --build --force-recreate api
```

3. Apply migrations:

```bash
docker compose run --rm api alembic upgrade head
```

4. Create a research job for the target:

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

5. Poll the research job until it is `completed` or `partial`:

```bash
curl http://localhost:8000/research-jobs/<job_id>
```

6. Inspect the sources found for that target:

```bash
curl http://localhost:8000/research-jobs/<job_id>/sources
```

7. Generate resonance-oriented blog drafts:

```bash
curl -X POST http://localhost:8000/research-jobs/<job_id>/blog-drafts \
  -H "Content-Type: application/json" \
  -d '{
    "goal": "resonance",
    "draft_count": 3,
    "target_length": "medium",
    "style_constraints": "Write with technical rigor and specificity. Avoid generic leadership platitudes.",
    "persona_constraints": "Do not mimic the target. Optimize for depth, clarity, and authentic engineering curiosity."
  }'
```

8. Poll the blog draft job and fetch the generated drafts:

```bash
curl http://localhost:8000/blog-draft-jobs/<blog_draft_job_id>
curl http://localhost:8000/blog-draft-jobs/<blog_draft_job_id>/drafts
```

9. Generate persona-building posts for the client using the same research job:

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
      "interests": ["distributed systems", "observability", "developer tooling"],
      "voice_notes": ["technical", "clear", "curious"]
    },
    "requested_angles": ["client_voice", "expert_commentary"],
    "style_constraints": "Write with technical depth and specificity. Avoid hype.",
    "persona_constraints": "Do not impersonate a real authority or fabricate endorsement."
  }'
```

10. Poll the persona post job and fetch the drafts:

```bash
curl http://localhost:8000/persona-post-jobs/<persona_post_job_id>
curl http://localhost:8000/persona-post-jobs/<persona_post_job_id>/drafts
```

The overall lifecycle is:

- `research-jobs` gather structured evidence about the target with TinyFish
- `blog-draft-jobs` turn that evidence into reviewable technical article drafts with OpenAI
- `persona-post-jobs` turn that evidence into client-facing and expert-commentary style persona drafts with OpenAI

## Debug Run API

These endpoints are still useful for low-level debugging, but the product flow should use the research job endpoints below.

Health check:

```bash
curl http://localhost:8000/health
```

List runs:

```bash
curl http://localhost:8000/runs
```

Create a run:

```bash
curl -X POST http://localhost:8000/runs \
  -H "Content-Type: application/json" \
  -d '{
    "source_url": "https://scrapeme.live/shop",
    "goal": "Extract the first 2 product names and prices"
  }'
```

Get a run by ID:

```bash
curl http://localhost:8000/runs/<run_id>
```

## Test Tinyfish Directly

Add your Tinyfish API key to `.env`:

```env
TINYFISH_API_KEY=your_real_key_here
OPENAI_API_KEY=your_real_key_here
```

Then export it in your shell and start an async Tinyfish run:

```bash
export TINYFISH_API_KEY='your_real_key_here'

curl --request POST \
  --url https://agent.tinyfish.ai/v1/automation/run-async \
  --header "Content-Type: application/json" \
  --header "X-API-Key: $TINYFISH_API_KEY" \
  --data '{
    "url": "https://scrapeme.live/shop",
    "goal": "Extract the first 2 product names and prices",
    "browser_profile": "lite"
  }'
```

Fetch the Tinyfish run result:

```bash
curl --request GET \
  --url https://agent.tinyfish.ai/v1/runs/<tinyfish_run_id> \
  --header "X-API-Key: $TINYFISH_API_KEY"
```

## Research Job API

Create a research job:

```bash
curl -X POST http://localhost:8000/research-jobs \
  -H "Content-Type: application/json" \
  -d '{
    "candidate_name": "Jane Doe",
    "company_name": "ExampleCo",
    "company_domain": "example.com",
    "role_title": "Engineering Manager",
    "search_context": "Interview loop for senior backend engineer"
  }'
```

Create a research job for a known public-profile subject:

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

Create a research job for an academic/student subject:

```bash
curl -X POST http://localhost:8000/research-jobs \
  -H "Content-Type: application/json" \
  -d '{
    "candidate_name": "Kenneth Gao",
    "company_name": "National University of Singapore",
    "company_domain": "nus.edu.sg",
    "role_title": "Student",
    "search_context": "Public academic and professional profile search"
  }'
```

Get the current job state:

```bash
curl http://localhost:8000/research-jobs/<job_id>
```

Example:

```bash
curl http://localhost:8000/research-jobs/4902aa08-4894-4986-8dbb-0edb5e936d63
```

Get the discovered and extracted sources for a job:

```bash
curl http://localhost:8000/research-jobs/<job_id>/sources
```

Requeue a job manually:

```bash
curl -X POST http://localhost:8000/research-jobs/<job_id>/refresh
```

Typical status flow:

- `queued`
- `discovering`
- `extracting`
- `scoring`
- `completed`

Possible non-success states:

- `partial`
- `failed`

## Blog Draft API

The blog-draft workflow depends on a completed or partial research job with usable sources.

Create a blog draft job:

```bash
curl -X POST http://localhost:8000/research-jobs/<research_job_id>/blog-drafts \
  -H "Content-Type: application/json" \
  -d '{
    "goal": "resonance",
    "draft_count": 3,
    "target_length": "medium",
    "style_constraints": "Write with technical rigor and specificity. Avoid generic leadership platitudes.",
    "persona_constraints": "Do not mimic the target. Optimize for depth, clarity, and authentic engineering curiosity."
  }'
```

Sample flow using a public-profile research job:

```bash
curl -X POST http://localhost:8000/research-jobs/f20ef9c9-bd04-4446-b6a6-4b7f49a6aecb/blog-drafts \
  -H "Content-Type: application/json" \
  -d '{
    "goal": "resonance",
    "draft_count": 2,
    "target_length": "medium",
    "style_constraints": "Focus on deep technical tradeoffs and practical engineering judgment.",
    "persona_constraints": "Avoid exaggerated claims and invented personal experience."
  }'
```

Get the current blog draft job state:

```bash
curl http://localhost:8000/blog-draft-jobs/<blog_draft_job_id>
```

Get the generated drafts:

```bash
curl http://localhost:8000/blog-draft-jobs/<blog_draft_job_id>/drafts
```

Requeue a blog draft job manually:

```bash
curl -X POST http://localhost:8000/blog-draft-jobs/<blog_draft_job_id>/refresh
```

Typical blog draft status flow:

- `queued`
- `profiling`
- `outlining`
- `drafting`
- `completed`

Possible non-success states:

- `partial`
- `failed`

## Persona Post API

This workflow generates two safe angles for persona-building content:

- `client_voice`: a first-person draft from the client's perspective about what they care about and have learned
- `expert_commentary`: a non-attributed expert-style commentary draft that highlights the client's technical depth without impersonating any real authority

Create a persona post job:

```bash
curl -X POST http://localhost:8000/research-jobs/<research_job_id>/persona-post-jobs \
  -H "Content-Type: application/json" \
  -d '{
    "goal": "credibility",
    "draft_count": 2,
    "target_length": "medium",
    "client_name": "Jane Smith",
    "client_profile": {
      "current_role": "Backend engineer",
      "interests": ["distributed systems", "observability", "developer tooling"],
      "voice_notes": ["technical", "clear", "curious"]
    },
    "requested_angles": ["client_voice", "expert_commentary"],
    "style_constraints": "Write with technical depth and specificity. Avoid hype.",
    "persona_constraints": "Do not impersonate a real authority or fabricate endorsement."
  }'
```

Get the current persona post job state:

```bash
curl http://localhost:8000/persona-post-jobs/<persona_post_job_id>
```

Get the generated persona post drafts:

```bash
curl http://localhost:8000/persona-post-jobs/<persona_post_job_id>/drafts
```

Requeue a persona post job manually:

```bash
curl -X POST http://localhost:8000/persona-post-jobs/<persona_post_job_id>/refresh
```

Notes:

- The returned drafts include `angle`, `author_mode`, and `disclosure_note`.
- `expert_commentary` drafts are explicitly marked as non-attributed editorial commentary.
