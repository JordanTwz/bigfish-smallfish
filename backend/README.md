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
docker compose up -d db
```

## Run Migrations

```bash
alembic upgrade head
```

## Run Migrations In Docker

```bash
docker compose run --rm api alembic upgrade head
```

## Run API

```bash
uvicorn app.main:app --reload
```

## Run API In Docker

```bash
docker compose up --build api
```
