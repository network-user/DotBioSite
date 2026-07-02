#!/usr/bin/env bash
# =============================================================================
# DotBioSite: первичная настройка и деплой портфолио ЗА Cloudflare Tunnel
# (Ubuntu/Debian). Изолированный вариант: не открывает наружу ни одного порта
# и НЕ трогает 80/443 хоста, поэтому спокойно сосуществует с другим сервисом
# (например, Docker-стеком, который уже держит 80/443) - пересечений нет.
#
# Что делает (идемпотентно, можно гонять повторно):
#   1. Ставит Node 20 (NodeSource), Caddy и cloudflared, если их нет.
#   2. Спрашивает/принимает поддомен, создаёт .env (если его ещё нет).
#   3. Собирает статику (npm ci -> build) и СРАЗУ чистит node_modules,
#      .astro и npm-кэш; на диске остаётся только готовый dist/.
#   4. Генерирует /etc/caddy/Caddyfile из шаблона: Caddy слушает ТОЛЬКО
#      127.0.0.1:$PORT по HTTP, наружу не смотрит.
#   5. Устанавливает cloudflared и подключает туннель по токену. Публичный
#      HTTPS на поддомене выдаёт Cloudflare, трафик идёт через туннель на
#      локальный Caddy. Порты 80/443 хоста не используются.
#
# Запуск:
#   sudo bash deploy/setup.sh me.example.com
#   (поддомен можно не указывать, скрипт спросит)
#   Токен туннеля - через переменную окружения или интерактивно:
#   sudo TUNNEL_TOKEN='eyJ...' bash deploy/setup.sh me.example.com
# =============================================================================
set -euo pipefail

NODE_MAJOR=20
# Локальный порт Caddy (только loopback, наружу не публикуется). Поменять при
# конфликте с чем-то локальным: PORT=8790 sudo bash deploy/setup.sh ...
PORT="${PORT:-8787}"

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
CADDYFILE="/etc/caddy/Caddyfile"
TEMPLATE="$SCRIPT_DIR/Caddyfile.tmpl"

# --- порт: только целое число (уходит в конфиг Caddy) ------------------------
case "$PORT" in "" | *[!0-9]*) echo "Ошибка: PORT должен быть целым числом." >&2; exit 1 ;; esac

# --- поддомен ----------------------------------------------------------------
# Нужен для PUBLIC_DOMAIN (site URL, OG в сборке). Сам маршрут поддомена на
# туннель задаётся в дашборде Cloudflare, не здесь.
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
# Валидация: только буквы, цифры, точка и дефис (имя хоста).
if ! printf '%s' "$DOMAIN" | grep -qE '^[A-Za-z0-9.-]+$'; then
	echo "Ошибка: недопустимый домен '$DOMAIN' (разрешены буквы, цифры, точка, дефис)." >&2
	exit 1
fi
echo "==> Поддомен: $DOMAIN"
echo "==> Локальный порт Caddy (loopback): $PORT"

export DEBIAN_FRONTEND=noninteractive

# --- базовые пакеты ----------------------------------------------------------
echo "==> Базовые пакеты (curl, gnupg, git)..."
apt-get update -qq
apt-get install -y -qq curl ca-certificates gnupg git >/dev/null

# --- Node 20 -----------------------------------------------------------------
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

# --- Caddy -------------------------------------------------------------------
if ! command -v caddy >/dev/null 2>&1; then
	echo "==> Установка Caddy..."
	apt-get install -y -qq debian-keyring debian-archive-keyring apt-transport-https >/dev/null
	curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
		| gpg --batch --yes --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
	curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
		> /etc/apt/sources.list.d/caddy-stable.list
	apt-get update -qq
	apt-get install -y -qq caddy >/dev/null
else
	echo "==> Caddy уже есть: $(caddy version)"
fi

# --- cloudflared -------------------------------------------------------------
# Ставим из официального .deb с GitHub (тянет нужную арх., подхватывает
# apt-зависимости). Сам туннель подключаем ниже по токену.
if ! command -v cloudflared >/dev/null 2>&1; then
	echo "==> Установка cloudflared..."
	ARCH="$(dpkg --print-architecture)"
	curl -fsSL "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${ARCH}.deb" \
		-o /tmp/cloudflared.deb
	apt-get install -y -qq /tmp/cloudflared.deb >/dev/null
	rm -f /tmp/cloudflared.deb
else
	echo "==> cloudflared уже есть: $(cloudflared --version 2>/dev/null | head -n1)"
fi

# --- .env --------------------------------------------------------------------
# Создаём только если файла ещё нет, чтобы не затирать ручные правки. Поля
# имени НЕ пишем (Zod применит дефолты .ядро/.core; пустые уронили бы сборку).
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
# .env может содержать приватные значения (AUTHOR_EMAIL): доступ только root.
chmod 600 "$ENV_FILE"

# --- сборка ------------------------------------------------------------------
echo "==> Сборка статики (это самый ёмкий по диску шаг, потом всё чистится)..."
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
# Caddy работает под пользователем caddy, даём доступ на чтение статики
chmod -R a+rX "$DIST_DIR"

# --- Caddyfile (loopback, без домена и ACME) ---------------------------------
echo "==> Конфиг Caddy (loopback 127.0.0.1:$PORT)..."
mkdir -p /etc/caddy
sed -e "s|{{ROOT}}|$DIST_DIR|g" -e "s|{{PORT}}|$PORT|g" "$TEMPLATE" > "$CADDYFILE"
caddy validate --config "$CADDYFILE" --adapter caddyfile
systemctl enable --now caddy >/dev/null 2>&1 || true
systemctl reload caddy 2>/dev/null || systemctl restart caddy

# --- Cloudflare Tunnel -------------------------------------------------------
# cloudflared держит исходящее соединение к Cloudflare и туннелит поддомен на
# 127.0.0.1:$PORT. Наружу порты не открываются. Маршрут (public hostname
# поддомен -> http://localhost:$PORT) задаётся в дашборде Cloudflare при
# создании туннеля; сюда нужен только его токен (секрет, в git не хранить).
if systemctl is-active --quiet cloudflared 2>/dev/null; then
	echo "==> cloudflared уже запущен, туннель не трогаю"
else
	TOKEN="${TUNNEL_TOKEN:-}"
	if [ -z "$TOKEN" ]; then
		echo
		echo "Вставь Tunnel token из Cloudflare Zero Trust:"
		echo "  Networks -> Tunnels -> (создать/выбрать туннель) -> Install connector,"
		echo "  скопируй строку токена (eyJ...). Пусто = пропустить, подключишь позже."
		read -rsp "TUNNEL_TOKEN: " TOKEN; echo
	fi
	if [ -n "$TOKEN" ]; then
		echo "==> Подключаю cloudflared к туннелю..."
		cloudflared service install "$TOKEN"
		systemctl enable --now cloudflared >/dev/null 2>&1 || true
	else
		echo "==> Токен не задан. cloudflared установлен, туннель НЕ подключён."
		echo "    Подключить позже: sudo cloudflared service install <TOKEN>"
	fi
fi

# --- чистим кэш пакетного менеджера ------------------------------------------
apt-get clean
rm -rf /var/lib/apt/lists/*

# --- итог --------------------------------------------------------------------
echo
echo "================================================================"
echo " Готово. Сайт: https://$DOMAIN"
echo "----------------------------------------------------------------"
echo " В дашборде Cloudflare у туннеля должен быть public hostname:"
echo "   $DOMAIN  ->  HTTP  ->  localhost:$PORT"
echo " Порты 80/443 хоста НЕ используются (их можно не открывать)."
echo "----------------------------------------------------------------"
echo " Размер dist/: $(du -sh "$DIST_DIR" 2>/dev/null | cut -f1)"
echo " Свободно на диске:"
df -h / | sed 's/^/   /'
echo "================================================================"
echo " Обновить сайт позже:  sudo bash deploy/update.sh"
echo " Логи Caddy:           journalctl -u caddy -f"
echo " Логи туннеля:         journalctl -u cloudflared -f"
echo "================================================================"
