#!/bin/sh
# Одноразовая инициализация админ-аккаунта Umami из .env.
#
# Umami при первом старте создаёт дефолтного админа admin/umami. Этот скрипт
# ждёт появления записи, ставит твой логин и bcrypt-хэш пароля напрямую в БД и
# помечает готовность флагом в томе /seed.
#
# Идемпотентно: повторный запуск (redeploy) ничего не делает, если уже
# инициализировано, - значит смену пароля в UI мы не перетираем.
# НЕ фатально: любая ошибка логируется, скрипт выходит с кодом 0, чтобы не
# блокировать стек. В этом случае войдёшь дефолтным admin/umami и сменишь пароль
# в интерфейсе вручную.
set -u

FLAG=/seed/.admin-initialized
log() { echo "[umami-init] $*"; }

if [ -f "$FLAG" ]; then
	log "уже инициализировано, пропускаю"
	exit 0
fi

PW="${UMAMI_ADMIN_PASSWORD:-}"
USER_NAME="${UMAMI_ADMIN_USERNAME:-admin}"
if [ -z "$PW" ]; then
	log "UMAMI_ADMIN_PASSWORD пуст, оставляю дефолтный admin/umami"
	exit 0
fi

# htpasswd (bcrypt) из apache2-utils; psql уже есть в образе postgres.
if ! command -v htpasswd >/dev/null 2>&1; then
	log "ставлю apache2-utils для bcrypt"
	apk add --no-cache apache2-utils >/dev/null 2>&1 || {
		log "apk add не удался, пропускаю (войди admin/umami, смени пароль в UI)"
		exit 0
	}
fi

# Ждём, пока umami прогонит миграции и создаст дефолтного админа (до ~120с).
i=0
until psql -tAc "SELECT 1 FROM \"user\" WHERE role='admin' LIMIT 1" 2>/dev/null | grep -q 1; do
	i=$((i + 1))
	if [ "$i" -gt 60 ]; then
		log "не дождался схемы umami за 120с, пропускаю (войди admin/umami, смени пароль в UI)"
		exit 0
	fi
	sleep 2
done

# bcrypt-хэш; нормализуем префикс $2y$ -> $2b$ для bcryptjs, который использует
# umami для сравнения пароля.
HASH=$(printf '%s' "$PW" | htpasswd -niBC 10 x 2>/dev/null | cut -d: -f2 | sed 's/^\$2y\$/\$2b\$/')
if [ -z "$HASH" ]; then
	log "не удалось посчитать bcrypt, пропускаю (войди admin/umami, смени пароль в UI)"
	exit 0
fi

if psql -v ON_ERROR_STOP=1 -q <<SQL 2>/dev/null
UPDATE "user"
   SET username = '${USER_NAME}',
       password = '${HASH}',
       updated_at = now()
 WHERE role = 'admin';
SQL
then
	mkdir -p /seed && touch "$FLAG"
	log "готово: админ '${USER_NAME}' инициализирован из .env"
else
	log "UPDATE не прошёл (возможно, изменилась схема umami), пропускаю; войди admin/umami, смени пароль в UI"
fi
exit 0
