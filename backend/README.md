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
