#!/usr/bin/env bash
# DotBioSite - разовая настройка чистого Ubuntu-сервера под self-hosted деплой.
#
# Использование (копируешь всю папку deploy/ на сервер и запускаешь оттуда,
# от root или через sudo - см. DEPLOY.txt):
#   sudo ./server-setup.sh <домен> [deploy_path]
#
# Пример:
#   sudo ./server-setup.sh example.ru /var/www/dotbio
#
# Идемпотентен - безопасно запускать повторно (например, после сбоя на
# середине). Что делает: ставит nginx/certbot/ufw/fail2ban, создаёт
# пользователя deploy и структуру релизов (releases/<id> + симлинк current),
# пишет activate.sh, включает сайт в nginx.
#
# Что НЕ делает (осознанно, зависит от состояния вне этого сервера):
#   - не добавляет SSH-ключ CI в authorized_keys - см. DEPLOY.txt
#   - не выпускает TLS-сертификат - выпускается отдельно через certbot,
#     после того как DNS реально указывает на этот сервер
#   - не трогает sshd_config (root/password login) - hardening описан в
#     DEPLOY.txt отдельным шагом, чтобы не закрыть себе доступ по SSH

set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Запусти от root: sudo $0 <домен> [deploy_path]" >&2
  exit 1
fi

DOMAIN="${1:?usage: $0 <домен> [deploy_path]}"
DEPLOY_PATH="${2:-/var/www/dotbio}"
DEPLOY_USER="deploy"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==> Пакеты"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
apt-get install -y nginx certbot python3-certbot-nginx ufw fail2ban rsync unattended-upgrades

echo "==> Автообновления безопасности (unattended-upgrades)"
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'APTCONF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APTCONF

echo "==> Пользователь $DEPLOY_USER"
if ! id -u "$DEPLOY_USER" >/dev/null 2>&1; then
  useradd --create-home --shell /bin/bash "$DEPLOY_USER"
fi

echo "==> Структура релизов в $DEPLOY_PATH"
mkdir -p "$DEPLOY_PATH/releases"
if [ ! -e "$DEPLOY_PATH/current" ]; then
  INIT_RELEASE="$DEPLOY_PATH/releases/0-init"
  mkdir -p "$INIT_RELEASE"
  cat > "$INIT_RELEASE/index.html" <<'HTML'
<!doctype html>
<meta charset="utf-8">
<title>DotBioSite</title>
<p>Сервер настроен, ждём первый деплой из GitHub Actions.</p>
HTML
  ln -sfn "$INIT_RELEASE" "$DEPLOY_PATH/current"
fi
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$DEPLOY_PATH"
chmod 755 "$DEPLOY_PATH"

echo "==> activate.sh (переключение релиза + чистка старых)"
cat > "$DEPLOY_PATH/activate.sh" <<'ACTIVATE'
#!/usr/bin/env bash
set -euo pipefail

DEPLOY_PATH="__DEPLOY_PATH__"
RELEASES_DIR="$DEPLOY_PATH/releases"
KEEP=5

RELEASE_ID="${1:?usage: activate.sh <release_id>}"
RELEASE_DIR="$RELEASES_DIR/$RELEASE_ID"

if [ ! -d "$RELEASE_DIR" ] || [ -z "$(ls -A "$RELEASE_DIR" 2>/dev/null)" ]; then
  echo "activate.sh: релиз '$RELEASE_ID' не найден или пуст ($RELEASE_DIR)" >&2
  exit 1
fi

ln -sfn "$RELEASE_DIR" "$DEPLOY_PATH/current"
echo "activate.sh: current -> $RELEASE_ID"

# Храним последние $KEEP релизов. Сортировка по имени = по времени, т.к.
# имя релиза начинается с UTC-таймстампа (см. workflow). Активный релиз
# защищён отдельно, на случай если он всё же выпал за пределы $KEEP.
cd "$RELEASES_DIR"
mapfile -t all_releases < <(ls -1 | sort)
keep_count=${#all_releases[@]}
if [ "$keep_count" -gt "$KEEP" ]; then
  to_delete=$((keep_count - KEEP))
  for dir in "${all_releases[@]:0:$to_delete}"; do
    if [ "$dir" != "$RELEASE_ID" ]; then
      rm -rf -- "${RELEASES_DIR:?}/$dir"
      echo "activate.sh: удалён старый релиз $dir"
    fi
  done
fi
ACTIVATE
sed -i "s#__DEPLOY_PATH__#$DEPLOY_PATH#g" "$DEPLOY_PATH/activate.sh"
chmod 750 "$DEPLOY_PATH/activate.sh"
chown "$DEPLOY_USER:$DEPLOY_USER" "$DEPLOY_PATH/activate.sh"

echo "==> Nginx"
cp "$SCRIPT_DIR/nginx.conf" /etc/nginx/sites-available/dotbio
sed -i "s#__DOMAIN__#$DOMAIN#g; s#__DEPLOY_PATH__#$DEPLOY_PATH#g" /etc/nginx/sites-available/dotbio
ln -sf /etc/nginx/sites-available/dotbio /etc/nginx/sites-enabled/dotbio
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
systemctl enable nginx

echo "==> UFW"
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo "==> fail2ban"
systemctl enable --now fail2ban

SERVER_IP="$(curl -fsS ifconfig.me || echo '<IP этого сервера>')"
cat <<MSG

==> Базовая настройка готова. Осталось руками (по шагам - см. DEPLOY.txt):
  1. Добавить публичный SSH-ключ CI в /home/$DEPLOY_USER/.ssh/authorized_keys
  2. Направить DNS A-запись $DOMAIN -> $SERVER_IP (и www.$DOMAIN -> $SERVER_IP)
  3. Когда DNS реально резолвится - выпустить сертификат:
       certbot --nginx -d $DOMAIN -d www.$DOMAIN
  4. Добавить секреты в GitHub -> Settings -> Secrets and variables -> Actions
  5. Запушить в main - CI соберёт и задеплоит автоматически

MSG
