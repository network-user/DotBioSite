#!/usr/bin/env bash
# =============================================================================
# DotBioSite: первичная настройка и деплой на сервер (Ubuntu/Debian).
#
# Что делает (идемпотентно, можно гонять повторно):
#   1. Ставит Node 20 (NodeSource) и Caddy, если их нет.
#   2. Спрашивает/принимает домен, создаёт .env (если его ещё нет).
#   3. Собирает статику (npm ci → build) и СРАЗУ чистит node_modules,
#      .astro и npm-кэш; на диске остаётся только готовый dist/.
#   4. Генерирует /etc/caddy/Caddyfile из шаблона и перезапускает Caddy.
#      Caddy сам получит TLS-сертификат Let's Encrypt (домен + порты 80/443).
#
# Запуск:
#   sudo bash deploy/setup.sh example.com
#   (домен можно не указывать, скрипт спросит)
# =============================================================================
set -euo pipefail

NODE_MAJOR=20

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

# --- домен -------------------------------------------------------------------
DOMAIN="${1:-${DOMAIN:-}}"
if [ -z "$DOMAIN" ]; then
	read -rp "Домен (например, example.com): " DOMAIN
fi
# отрезаем протокол и хвост, если ввели целиком
DOMAIN="${DOMAIN#http://}"
DOMAIN="${DOMAIN#https://}"
DOMAIN="${DOMAIN%%/*}"
if [ -z "$DOMAIN" ]; then
	echo "Ошибка: домен обязателен." >&2
	exit 1
fi
# Валидация: только буквы, цифры, точка и дефис (имя хоста). Закрывает попадание
# спецсимволов в sed-подстановку Caddyfile ('|', '&') и мусора в сам конфиг.
if ! printf '%s' "$DOMAIN" | grep -qE '^[A-Za-z0-9.-]+$'; then
	echo "Ошибка: недопустимый домен '$DOMAIN' (разрешены буквы, цифры, точка, дефис)." >&2
	exit 1
fi
echo "==> Домен: $DOMAIN"

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
	# Не пайпим установочный скрипт NodeSource в bash от root: добавляем
	# подписанный apt-репозиторий вручную (как для Caddy ниже), чтобы apt
	# проверял GPG-подпись пакетов и MITM/компрометация CDN не давала RCE.
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

# --- .env --------------------------------------------------------------------
# Создаём только если файла ещё нет, чтобы не затирать ручные правки при
# повторных запусках. Поля имени НЕ пишем (Zod применит дефолты .ядро/.core;
# пустые значения тут уронили бы сборку из-за min(1)).
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

# --- Caddyfile ---------------------------------------------------------------
echo "==> Конфиг Caddy для $DOMAIN..."
mkdir -p /etc/caddy
sed -e "s|{{DOMAIN}}|$DOMAIN|g" -e "s|{{ROOT}}|$DIST_DIR|g" "$TEMPLATE" > "$CADDYFILE"
caddy validate --config "$CADDYFILE" --adapter caddyfile
systemctl enable --now caddy >/dev/null 2>&1 || true
systemctl reload caddy 2>/dev/null || systemctl restart caddy

# --- чистим кэш пакетного менеджера ------------------------------------------
apt-get clean
rm -rf /var/lib/apt/lists/*

# --- итог --------------------------------------------------------------------
echo
echo "================================================================"
echo " Готово. Сайт: https://$DOMAIN"
echo " (первый запрос может секунду подождать выпуск TLS-сертификата)"
echo "----------------------------------------------------------------"
echo " Размер dist/: $(du -sh "$DIST_DIR" 2>/dev/null | cut -f1)"
echo " Свободно на диске:"
df -h / | sed 's/^/   /'
echo "================================================================"
echo " Обновить сайт позже:  sudo bash deploy/update.sh"
echo " Защита от флуда:      sudo bash deploy/harden.sh"
echo " Логи Caddy:           journalctl -u caddy -f"
echo "================================================================"
