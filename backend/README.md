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

## Use The API

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
