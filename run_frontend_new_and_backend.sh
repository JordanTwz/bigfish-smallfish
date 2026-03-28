#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend-new"
LOG_DIR="$ROOT_DIR/logs"
FRONTEND_LOG="$LOG_DIR/frontend-new.log"
FRONTEND_PID_FILE="$LOG_DIR/frontend-new.pid"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
BACKEND_PORT="${BACKEND_PORT:-8000}"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

docker_compose() {
  if docker compose version >/dev/null 2>&1; then
    docker compose "$@"
    return
  fi

  if command -v docker-compose >/dev/null 2>&1; then
    docker-compose "$@"
    return
  fi

  echo "Docker Compose is not installed. Run ./install_docker_if_missing.sh first." >&2
  exit 1
}

ensure_node() {
  if command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1; then
    return
  fi

  echo "Node.js/npm not found. Installing Node.js 20..."

  if command -v apt-get >/dev/null 2>&1; then
    sudo apt-get update
    sudo apt-get install -y ca-certificates curl gnupg
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" | sudo tee /etc/apt/sources.list.d/nodesource.list >/dev/null
    sudo apt-get update
    sudo apt-get install -y nodejs
    return
  fi

  if command -v dnf >/dev/null 2>&1; then
    curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
    sudo dnf install -y nodejs
    return
  fi

  if command -v yum >/dev/null 2>&1; then
    curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
    sudo yum install -y nodejs
    return
  fi

  echo "Unsupported package manager for automatic Node.js installation." >&2
  exit 1
}

frontend_running() {
  if [[ ! -f "$FRONTEND_PID_FILE" ]]; then
    return 1
  fi

  local pid
  pid="$(cat "$FRONTEND_PID_FILE")"
  kill -0 "$pid" >/dev/null 2>&1
}

mkdir -p "$LOG_DIR"

require_command curl
require_command sudo
require_command docker
ensure_node

if [[ ! -d "$BACKEND_DIR" || ! -d "$FRONTEND_DIR" ]]; then
  echo "Expected backend/ and frontend-new/ under $ROOT_DIR." >&2
  exit 1
fi

if [[ ! -f "$BACKEND_DIR/.env" ]]; then
  if [[ -f "$BACKEND_DIR/.env.example" ]]; then
    cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
    echo "Created backend/.env from backend/.env.example. Fill in API keys if needed."
  else
    echo "Missing backend/.env and backend/.env.example." >&2
    exit 1
  fi
fi

echo "Starting backend on port $BACKEND_PORT..."
(
  cd "$BACKEND_DIR"
  docker_compose up -d --build
  docker_compose run --rm api alembic upgrade head
)

echo "Installing frontend dependencies..."
(
  cd "$FRONTEND_DIR"
  npm ci
)

echo "Building frontend-new..."
(
  cd "$FRONTEND_DIR"
  npm run build
)

if frontend_running; then
  echo "frontend-new is already running with PID $(cat "$FRONTEND_PID_FILE")."
else
  echo "Starting frontend-new on port $FRONTEND_PORT..."
  (
    cd "$FRONTEND_DIR"
    nohup npm run start -- --hostname 0.0.0.0 --port "$FRONTEND_PORT" >"$FRONTEND_LOG" 2>&1 &
    echo $! >"$FRONTEND_PID_FILE"
  )
fi

echo
echo "Backend:  http://0.0.0.0:$BACKEND_PORT"
echo "Frontend: http://0.0.0.0:$FRONTEND_PORT"
echo "Frontend log: $FRONTEND_LOG"
