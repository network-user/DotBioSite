#!/usr/bin/env bash
# =============================================================================
# DotBioSite: лёгкая защита от флуда на уровне ядра (nftables).
#
# Что делает:
#   - Создаёт ОТДЕЛЬНУЮ таблицу nftables `ddos_guard` с политикой accept:
#     она НИЧЕГО не закрывает (SSH/ufw/docker не трогаются), а только ДРОПАЕТ
#     флуд. Залочиться этим скриптом нельзя.
#   - Ограничивает скорость НОВЫХ TCP-соединений на 80/443 ПО КАЖДОМУ IP:
#     один источник, бьющий быстрее порога, отсекается; обычные посетители нет
#     (браузеры переиспользуют соединения по HTTP/2, новых открывают мало).
#   - Ставит systemd-юнит, чтобы правила пережили перезагрузку.
#
# Это НЕ защита от мощного объёмного DDoS: для этого нужен внешний CDN/скрабинг
# (см. deploy/README.md → Cloudflare). Это поднимает планку против простых
# флудов и одиночных «долбящих» источников при near-zero расходе диска и RAM.
#
# ВНИМАНИЕ. Правила висят на портах 80/443 ВСЕГО хоста. При деплое портфолио
# за Cloudflare Tunnel эти порты портфолио не использует - зато их может
# держать другой сервис (например Docker-стек соседнего проекта). Тогда лимит
# заденет ЧУЖОЙ трафик. В конфигурации с Cloudflare Tunnel этот скрипт не нужен
# (наружу портов нет, от флуда защищает Cloudflare) - не запускай его, чтобы
# не пересекаться с соседним сервисом. Скрипт сам остановится, если увидит на
# 80/443 стороннего слушателя; осознанный запуск - через FORCE=1.
#
# Запуск:  sudo bash deploy/harden.sh
# Тюнинг:  RATE=80 BURST=160 sudo bash deploy/harden.sh   (порог нов.соед/с на IP)
# Снять:   sudo systemctl disable --now ddos-guard.service
# =============================================================================
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
	echo "Нужны root-права, перезапускаю через sudo..."
	exec sudo -E bash "$0" "$@"
fi

# --- защита от пересечения с соседним сервисом на 80/443 ---------------------
# Если на 80/443 кто-то уже слушает, правило заденет и его трафик. При деплое
# за Cloudflare Tunnel это почти наверняка чужой сервис - не трогаем без FORCE=1.
if [ "${FORCE:-0}" != "1" ] && command -v ss >/dev/null 2>&1 \
	&& ss -tlnH '( sport = :80 or sport = :443 )' 2>/dev/null | grep -q .; then
	echo "Отказ: на портах 80/443 уже есть слушатель (вероятно, соседний сервис)." >&2
	echo "Правила nftables заденут его трафик. При Cloudflare Tunnel harden не нужен." >&2
	echo "Если всё же уверен и это твой единственный сервис на этих портах:" >&2
	echo "  FORCE=1 sudo bash deploy/harden.sh" >&2
	exit 1
fi

# Порог НОВЫХ соединений в секунду на один IP; BURST: кратковременный запас.
RATE="${RATE:-50}"
BURST="${BURST:-100}"
# RATE/BURST подставляются в текст nft-правил; пускаем только целые числа,
# чтобы env-значение не внесло в конфиг ничего, кроме порога.
case "$RATE" in "" | *[!0-9]*) echo "Ошибка: RATE должен быть целым числом." >&2; exit 1 ;; esac
case "$BURST" in "" | *[!0-9]*) echo "Ошибка: BURST должен быть целым числом." >&2; exit 1 ;; esac

RULES_DIR="/etc/nftables.d"
RULES_FILE="$RULES_DIR/ddos-guard.nft"
UNIT="/etc/systemd/system/ddos-guard.service"

export DEBIAN_FRONTEND=noninteractive
if ! command -v nft >/dev/null 2>&1; then
	echo "==> Установка nftables..."
	apt-get update -qq
	apt-get install -y -qq nftables >/dev/null
	apt-get clean
	rm -rf /var/lib/apt/lists/*
fi

echo "==> Правила ddos_guard (порог: $RATE нов.соед/с на IP, burst $BURST)..."
mkdir -p "$RULES_DIR"
cat > "$RULES_FILE" <<EOF
#!/usr/sbin/nft -f
# Отдельная таблица: policy accept, ничего не закрываем, только дропаем флуд.
# Остальной firewall (ufw/docker/SSH) не затрагивается. Пересоздаётся идемпотентно.
add table inet ddos_guard
delete table inet ddos_guard
table inet ddos_guard {
	set flood4 {
		type ipv4_addr
		size 65535
		flags dynamic
		timeout 1m
	}
	set flood6 {
		type ipv6_addr
		size 65535
		flags dynamic
		timeout 1m
	}
	chain input {
		# priority -10: раньше основной таблицы; policy accept, не локаем себя
		type filter hook input priority -10; policy accept;

		ct state established,related accept

		# По каждому IP: не больше $RATE новых соединений/с (burst $BURST), иначе drop.
		tcp dport { 80, 443 } ct state new add @flood4 { ip saddr limit rate over $RATE/second burst $BURST packets } drop
		tcp dport { 80, 443 } ct state new add @flood6 { ip6 saddr limit rate over $RATE/second burst $BURST packets } drop
	}
}
EOF

echo "==> Проверка синтаксиса..."
nft -c -f "$RULES_FILE"

echo "==> Применяю правила..."
nft -f "$RULES_FILE"

echo "==> systemd-юнит для автозагрузки после ребута..."
cat > "$UNIT" <<EOF
[Unit]
Description=DotBioSite ddos_guard (nftables anti-flood)
After=network-pre.target
Before=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/sbin/nft -f $RULES_FILE
ExecStop=/usr/sbin/nft delete table inet ddos_guard
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable ddos-guard.service >/dev/null 2>&1 || true

echo
echo "================================================================"
echo " Готово. Активная таблица ddos_guard:"
nft list table inet ddos_guard | sed 's/^/   /'
echo "----------------------------------------------------------------"
echo " Поднять/опустить порог:  RATE=80 BURST=160 sudo bash deploy/harden.sh"
echo " Снять защиту:            sudo systemctl disable --now ddos-guard.service"
echo "================================================================"
