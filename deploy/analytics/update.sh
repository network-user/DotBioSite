#!/usr/bin/env bash
# Обновить стек аналитики: подтянуть свежий образ Umami и пересоздать контейнеры.
# Данные (том umami-db-data) и секреты (.env) сохраняются.
#
#   sudo bash deploy/analytics/update.sh
#   sudo DOTSOUND_NETWORK=<имя> bash deploy/analytics/update.sh
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -f .env ]; then
	echo "нет deploy/analytics/.env - сначала запусти setup.sh" >&2
	exit 1
fi

docker compose --env-file .env pull
docker compose --env-file .env up -d --remove-orphans
echo "Umami обновлён."
