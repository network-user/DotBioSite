#!/usr/bin/env bash
# =============================================================================
# DotBioSite: деплой портфолио за общим фронт-Caddy (Docker-стек DotSound).
#
# Модель: сайт - статика (Astro SSG). Собираем dist/ на хосте и поднимаем
# лёгкий контейнер caddy:2-alpine, который отдаёт dist/ ВНУТРИ docker-сети
# dotsound. Наружу порты не публикуются; TLS и маршрутизацию доменов делает
# фронт-Caddy DotSound (он проксирует на portfolio:80). 80/443 хоста не
# трогаются - конфликта с DotSound нет.
#
# Предусловия:
#   - Docker + docker compose установлены (их ставит стек DotSound).
#   - Стек DotSound запущен (существует сеть dotsound).
#   - В Caddyfile DotSound добавлен site-блок с reverse_proxy на portfolio:80
#     (см. deploy/README.md -> "Подключить к фронт-Caddy DotSound").
#
# Запуск:
#   sudo bash deploy/setup.sh me.example.com
#   (поддомен можно не указывать, скрипт спросит)
# =============================================================================
set -euo pipefail

NODE_MAJOR=20
# Имя внешней docker-сети DotSound. Проверь: docker network ls | grep dotsound
DOTSOUND_NETWORK="${DOTSOUND_NETWORK:-dotsoundbackend_dotsound}"

# --- root -------------------------------------------------------------------
if [ "$(id -u)" -ne 0 ]; then
	echo "Нужны root-права, перезапускаю через sudo..."
	exec sudo -E bash "$0" "$@"
fi

# --- пути --------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DIST_DIR="$REPO_DIR/dist"
ENV_FILE="$REPO_DIR/.env"

# --- поддомен ----------------------------------------------------------------
# Нужен для PUBLIC_DOMAIN (site URL, OG в сборке). Маршрут поддомена на
# контейнер прописывается в Caddyfile DotSound, не здесь.
DOMAIN="${1:-${DOMAIN:-}}"
if [ -z "$DOMAIN" ]; then
	read -rp "Поддомен портфолио (например, me.example.com): " DOMAIN
fi
DOMAIN="${DOMAIN#http://}"
DOMAIN="${DOMAIN#https://}"
DOMAIN="${DOMAIN%%/*}"
if [ -z "$DOMAIN" ]; then
	echo "Ошибка: поддомен обязателен." >&2
	exit 1
fi
if ! printf '%s' "$DOMAIN" | grep -qE '^[A-Za-z0-9.-]+$'; then
	echo "Ошибка: недопустимый домен '$DOMAIN' (разрешены буквы, цифры, точка, дефис)." >&2
	exit 1
fi
echo "==> Поддомен: $DOMAIN"

# --- проверки окружения ------------------------------------------------------
if ! command -v docker >/dev/null 2>&1; then
	echo "Ошибка: docker не найден. Он должен быть установлен стеком DotSound." >&2
	exit 1
fi
if ! docker network inspect "$DOTSOUND_NETWORK" >/dev/null 2>&1; then
	echo "Ошибка: docker-сеть '$DOTSOUND_NETWORK' не найдена." >&2
	echo "  Проверь имя: docker network ls | grep dotsound" >&2
	echo "  и передай верное: DOTSOUND_NETWORK=<имя> sudo bash deploy/setup.sh $DOMAIN" >&2
	exit 1
fi

export DEBIAN_FRONTEND=noninteractive

# --- базовые пакеты ----------------------------------------------------------
echo "==> Базовые пакеты (curl, gnupg, git)..."
apt-get update -qq
apt-get install -y -qq curl ca-certificates gnupg git >/dev/null

# --- Node 20 (только для сборки) ---------------------------------------------
need_node=1
if command -v node >/dev/null 2>&1; then
	cur="$(node -v | sed 's/v\([0-9]*\).*/\1/')"
	[ "$cur" -ge "$NODE_MAJOR" ] && need_node=0
fi
if [ "$need_node" -eq 1 ]; then
	echo "==> Установка Node ${NODE_MAJOR} (NodeSource, подписанный keyring)..."
	curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
		| gpg --batch --yes --dearmor -o /usr/share/keyrings/nodesource.gpg
	echo "deb [signed-by=/usr/share/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${NODE_MAJOR}.x nodistro main" \
		> /etc/apt/sources.list.d/nodesource.list
	apt-get update -qq
	apt-get install -y -qq nodejs >/dev/null
else
	echo "==> Node уже есть: $(node -v)"
fi

# --- .env --------------------------------------------------------------------
if [ ! -f "$ENV_FILE" ]; then
	echo "==> Создаю .env"
	cat > "$ENV_FILE" <<EOF
PUBLIC_DOMAIN=https://$DOMAIN
PUBLIC_GITHUB_USER=
PUBLIC_GITHUB_REPO=
PUBLIC_AUTHOR_PHOTO=
PUBLIC_AUTHOR_BIO_RU=
PUBLIC_AUTHOR_BIO_EN=
PUBLIC_SOCIAL_GITHUB=
PUBLIC_SOCIAL_TELEGRAM=
PUBLIC_SOCIAL_LINKEDIN=
PUBLIC_SOCIAL_X=
PUBLIC_SOCIAL_VK=
AUTHOR_EMAIL=
EOF
else
	echo "==> .env уже есть, обновляю только PUBLIC_DOMAIN"
	if grep -q '^PUBLIC_DOMAIN=' "$ENV_FILE"; then
		sed -i "s|^PUBLIC_DOMAIN=.*|PUBLIC_DOMAIN=https://$DOMAIN|" "$ENV_FILE"
	else
		echo "PUBLIC_DOMAIN=https://$DOMAIN" >> "$ENV_FILE"
	fi
fi
chmod 600 "$ENV_FILE"

# --- сборка ------------------------------------------------------------------
echo "==> Сборка статики (самый ёмкий по диску шаг, потом чистим)..."
cd "$REPO_DIR"
npm ci --no-audit --no-fund
NODE_ENV=production npm run build

echo "==> Чищу временные артефакты сборки..."
rm -rf node_modules .astro
npm cache clean --force >/dev/null 2>&1 || true

if [ ! -d "$DIST_DIR" ] || [ -z "$(ls -A "$DIST_DIR" 2>/dev/null)" ]; then
	echo "Ошибка: dist/ пустой, сборка не удалась." >&2
	exit 1
fi
# Контейнер читает dist по bind-mount; даём доступ на чтение всем.
chmod -R a+rX "$DIST_DIR"

# --- поднимаем контейнер -----------------------------------------------------
echo "==> Поднимаю контейнер portfolio в сети $DOTSOUND_NETWORK..."
export DOTSOUND_NETWORK
docker compose -f "$SCRIPT_DIR/docker-compose.yml" --project-directory "$REPO_DIR" up -d

# --- итог --------------------------------------------------------------------
echo
echo "================================================================"
echo " Готово. Контейнер portfolio отдаёт статику в сети dotsound."
echo "----------------------------------------------------------------"
echo " Осталось (один раз) в стеке DotSound - задать поддомен в его .env:"
echo "   PORTFOLIO_DOMAIN=$DOMAIN"
echo " и перезагрузить фронт-Caddy DotSound:"
echo "   docker compose -f docker-compose.yml -f docker-compose.prod.yml exec caddy caddy reload --config /etc/caddy/Caddyfile"
echo " (site-блок уже в Caddyfile DotSound; детали - в deploy/README.md)"
echo "----------------------------------------------------------------"
echo " Размер dist/: $(du -sh "$DIST_DIR" 2>/dev/null | cut -f1)"
echo " Обновить сайт позже:  sudo bash deploy/update.sh"
echo " Логи контейнера:      docker logs -f portfolio"
echo "================================================================"
