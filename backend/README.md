# FastAPI Backend

## Install

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
docker compose up -d
```

## Run Migrations

```bash
alembic upgrade head
```

## Run API

```bash
uvicorn app.main:app --reload
```
