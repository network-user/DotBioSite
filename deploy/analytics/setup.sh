#!/usr/bin/env bash
# Поднять стек аналитики (Umami + Postgres) одной командой.
#
# Первый запуск: генерит секреты в deploy/analytics/.env (в git НЕ идёт),
# поднимает контейнеры, umami-init инициализирует админа. Повторный запуск:
# просто up -d (секреты и данные сохраняются).
#
#   sudo bash deploy/analytics/setup.sh analytics.example.com
#   # при нестандартном имени сети dotsound:
#   sudo DOTSOUND_NETWORK=<имя> bash deploy/analytics/setup.sh analytics.example.com
#
# Домен здесь нужен только чтобы напечатать адрес дашборда и положить его в .env
# для памяти. Реальную маршрутизацию поддомена делает фронт-Caddy DotSound
# (см. deploy/analytics/README.md, шаг 3).
set -euo pipefail
cd "$(dirname "$0")"

ANALYTICS_DOMAIN="${1:-${ANALYTICS_DOMAIN:-}}"
ENV_FILE=".env"

rand() {
	if command -v openssl >/dev/null 2>&1; then
		openssl rand -hex "$1"
	else
		head -c "$1" /dev/urandom | od -An -tx1 | tr -d ' \n'
	fi
}

if [ ! -f "$ENV_FILE" ]; then
	echo "-> генерирую секреты в deploy/analytics/$ENV_FILE"
	umask 077
	cat >"$ENV_FILE" <<EOF
# Автогенерировано deploy/analytics/setup.sh. СЕКРЕТЫ - не коммить, не показывать.
ANALYTICS_DOMAIN=${ANALYTICS_DOMAIN}
UMAMI_DB_PASSWORD=$(rand 24)
UMAMI_APP_SECRET=$(rand 32)
UMAMI_ADMIN_USERNAME=admin
UMAMI_ADMIN_PASSWORD=$(rand 12)
# Пин версии образа (по желанию):
# UMAMI_IMAGE=ghcr.io/umami-software/umami:postgresql-vX.Y.Z
EOF
fi

# Если домен передали аргументом, а в .env он пуст - подставим.
if [ -n "$ANALYTICS_DOMAIN" ] && grep -q '^ANALYTICS_DOMAIN=$' "$ENV_FILE"; then
	sed -i "s|^ANALYTICS_DOMAIN=$|ANALYTICS_DOMAIN=${ANALYTICS_DOMAIN}|" "$ENV_FILE"
fi

docker compose --env-file "$ENV_FILE" up -d --remove-orphans

ADMIN_U=$(grep '^UMAMI_ADMIN_USERNAME=' "$ENV_FILE" | cut -d= -f2-)
ADMIN_P=$(grep '^UMAMI_ADMIN_PASSWORD=' "$ENV_FILE" | cut -d= -f2-)
DOMAIN_SHOW=$(grep '^ANALYTICS_DOMAIN=' "$ENV_FILE" | cut -d= -f2-)

cat <<MSG

Umami поднят.
  Логин:   ${ADMIN_U}
  Пароль:  ${ADMIN_P}
  Дашборд: https://${DOMAIN_SHOW:-<analytics-домен>}
           (подключи поддомен к фронт-Caddy DotSound - README, шаг 3)

Дальше:
  1) Войди в дашборд, Settings -> Websites -> Add website (домен портфолио).
  2) Скопируй Website ID и пропиши в .env САЙТА (не здесь):
        PUBLIC_UMAMI_WEBSITE_ID=<uuid>
  3) Пересобери сайт: sudo bash deploy/update.sh
MSG
