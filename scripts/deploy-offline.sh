#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="8080"

if ss -ltn "sport = :${PORT}" | tail -n +2 | grep -q .; then
  existing="$(docker ps --filter name='^/echo-frontend$' --format '{{.Names}}' 2>/dev/null || true)"
  if [[ "${existing}" != "echo-frontend" ]]; then
    echo "Port ${PORT} is already owned by another process; refusing deployment." >&2
    exit 1
  fi
fi

cd "${APP_DIR}"
previous_image="$(docker inspect echo-frontend --format '{{.Image}}' 2>/dev/null || true)"
if [[ -n "${previous_image}" ]]; then
  docker image tag "${previous_image}" echo-frontend:rollback
fi

docker compose build --pull
docker compose up -d

healthy=0
for _ in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:${PORT}/healthz" >/dev/null && \
     curl -fsS "http://127.0.0.1:${PORT}/" | grep -q '时光回响'; then
    healthy=1
    break
  fi
  sleep 1
done

if [[ "${healthy}" -ne 1 ]]; then
  echo "Deployment smoke test failed." >&2
  docker logs --tail 100 echo-frontend >&2 || true
  if docker image inspect echo-frontend:rollback >/dev/null 2>&1; then
    docker rm -f echo-frontend >/dev/null 2>&1 || true
    docker run -d --name echo-frontend --restart unless-stopped -p "${PORT}:80" echo-frontend:rollback
    echo "Rolled back to the previous image." >&2
  fi
  exit 1
fi

docker ps --filter name='^/echo-frontend$' --format 'container={{.Names}} status={{.Status}} ports={{.Ports}} image={{.Image}}'
echo "source=offline-release"
echo "health_url=http://127.0.0.1:${PORT}/healthz"
