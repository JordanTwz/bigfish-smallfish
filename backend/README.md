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
