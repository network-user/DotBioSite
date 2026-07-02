#!/usr/bin/env bash
# =============================================================================
# DotBioSite: обновление уже развёрнутого сайта.
# Подтягивает изменения, пересобирает статику, чистит за собой и
# перезагружает Caddy. Toolchain (Node/Caddy) и .env не трогает.
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
	echo "Ошибка: dist/ пустой, сборка не удалась, Caddy не трогаю." >&2
	exit 1
fi
chmod -R a+rX "$DIST_DIR"

echo "==> Перезагрузка Caddy..."
systemctl reload caddy 2>/dev/null || systemctl restart caddy

echo "Готово. dist/: $(du -sh "$DIST_DIR" 2>/dev/null | cut -f1), свободно: $(df -h / | awk 'NR==2{print $4}')"
