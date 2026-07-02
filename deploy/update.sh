#!/usr/bin/env bash
# =============================================================================
# DotBioSite: обновление уже развёрнутого сайта (контейнер за фронт-Caddy).
# git pull -> пересборка статики -> чистка. Контейнер читает dist/ по
# bind-mount, поэтому свежие файлы отдаются сразу, пересоздавать его не нужно.
#
# Запуск:  sudo bash deploy/update.sh
# =============================================================================
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
	echo "Нужны root-права, перезапускаю через sudo..."
	exec sudo -E bash "$0" "$@"
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DIST_DIR="$REPO_DIR/dist"
DOTSOUND_NETWORK="${DOTSOUND_NETWORK:-dotsoundbackend_dotsound}"

cd "$REPO_DIR"

if [ -d .git ]; then
	echo "==> git pull..."
	git pull --ff-only || echo "  (pull пропущен: нет апстрима или есть локальные правки)"
fi

echo "==> Пересборка..."
npm ci --no-audit --no-fund
NODE_ENV=production npm run build

echo "==> Чистка артефактов сборки..."
rm -rf node_modules .astro
npm cache clean --force >/dev/null 2>&1 || true

if [ ! -d "$DIST_DIR" ] || [ -z "$(ls -A "$DIST_DIR" 2>/dev/null)" ]; then
	echo "Ошибка: dist/ пустой, сборка не удалась, контейнер не трогаю." >&2
	exit 1
fi
chmod -R a+rX "$DIST_DIR"

# Убеждаемся, что контейнер поднят (idempotent). Свежий dist уже примонтирован.
echo "==> Проверяю контейнер portfolio..."
export DOTSOUND_NETWORK
docker compose -f "$SCRIPT_DIR/docker-compose.yml" --project-directory "$REPO_DIR" up -d

echo "Готово. dist/: $(du -sh "$DIST_DIR" 2>/dev/null | cut -f1), свободно: $(df -h / | awk 'NR==2{print $4}')"
