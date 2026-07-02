#!/usr/bin/env bash
# DotBioSite: доступ для GitHub Actions к уже развёрнутому серверу.
#
# Запускать ПОСЛЕ deploy/setup.sh (репозиторий уже должен лежать на сервере,
# сайт уже поднят). Создаёт отдельного пользователя ci-deploy с узкой
# sudo-привилегией: без пароля можно выполнить ТОЛЬКО deploy/update.sh в
# этом репозитории, ничего больше. Ключ этого пользователя живёт только в
# GitHub Secrets, руками им никто не пользуется.
#
# Запуск:
#   sudo bash deploy/ci-setup.sh
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
	echo "Нужны root-права, перезапускаю через sudo..."
	exec sudo -E bash "$0" "$@"
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CI_USER="ci-deploy"

echo "==> Пользователь $CI_USER"
if ! id -u "$CI_USER" >/dev/null 2>&1; then
	useradd --create-home --shell /bin/bash "$CI_USER"
fi
install -d -m 700 -o "$CI_USER" -g "$CI_USER" "/home/$CI_USER/.ssh"
touch "/home/$CI_USER/.ssh/authorized_keys"
chown "$CI_USER:$CI_USER" "/home/$CI_USER/.ssh/authorized_keys"
chmod 600 "/home/$CI_USER/.ssh/authorized_keys"

echo "==> sudo-правило: только $REPO_DIR/deploy/update.sh, без пароля"
# Узкая привилегия: этому пользователю НИЧЕГО больше нельзя, даже sudo bash
# с другим аргументом: sudoers матчит команду с аргументами буквально.
cat > /etc/sudoers.d/ci-deploy <<EOF
$CI_USER ALL=(root) NOPASSWD: /bin/bash $REPO_DIR/deploy/update.sh
EOF
chmod 440 /etc/sudoers.d/ci-deploy
visudo -cf /etc/sudoers.d/ci-deploy

cat <<MSG

==> Готово. Осталось (см. deploy/README.md → "Автодеплой из GitHub"):
  1. На своей машине: ssh-keygen -t ed25519 -C "github-actions" -f dotbio_ci_key -N ""
  2. Публичный ключ (dotbio_ci_key.pub) в /home/$CI_USER/.ssh/authorized_keys
  3. В GitHub → Settings → Secrets and variables → Actions добавить:
       DEPLOY_SSH_KEY       содержимое dotbio_ci_key (приватный ключ целиком)
       DEPLOY_HOST          IP или домен сервера
       DEPLOY_USER          $CI_USER
       DEPLOY_REPO_PATH     $REPO_DIR

MSG
