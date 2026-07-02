# Деплой портфолио за Cloudflare Tunnel

Сайт - статика (Astro SSG). На сервере он собирается в `dist/` и отдаётся
лёгким Caddy, который слушает **только `127.0.0.1`** и наружу не смотрит.
Публичный HTTPS на поддомене даёт **Cloudflare**, а `cloudflared` держит
исходящий туннель от сервера к Cloudflare и проксирует поддомен на локальный
Caddy.

Зачем так: на сервере уже есть другой сервис, который держит порты **80/443**
(например, Docker-стек соседнего проекта). Два процесса не могут слушать 443 на
одном IP. Cloudflare Tunnel решает это без единого открытого порта - портфолио
не трогает 80/443 и не пересекается с соседним сервисом ничем: ни портами, ни
файлами, ни конфигами.

```
браузер ──HTTPS──> Cloudflare ──(исходящий туннель)──> cloudflared ─HTTP─> Caddy(127.0.0.1:8787) ─> dist/
                                                          сосед: Docker-стек остаётся на :80/:443, не тронут
```

## Что окажется на диске после деплоя

| Что                                | Примерно                            |
| ---------------------------------- | ----------------------------------- |
| Бинарь Caddy                       | ~40 МБ                              |
| Бинарь cloudflared                 | ~25 МБ                             |
| Node 20 (для будущих пересборок)   | ~120 МБ                            |
| Исходники репозитория              | несколько МБ                        |
| Готовый `dist/` (то, что отдаётся) | несколько МБ                        |
| `node_modules`, npm/apt-кэш        | **0** - чистится сразу после сборки |

Пиковый расход диска - только во время `npm ci` (на время сборки появляется
`node_modules` ~300-500 МБ, потом удаляется).

## Предусловия

1. Сервер на **Ubuntu/Debian**, доступ по SSH с `sudo`/root.
2. Домен добавлен в **Cloudflare** (NS переключены на Cloudflare). Бесплатного
   тарифа достаточно.
3. Порты открывать **не нужно** - туннель исходящий. Даже 80/443 не требуются.

## Шаг 1. Создать туннель в Cloudflare (один раз)

1. Cloudflare Zero Trust (dash.cloudflare.com → Zero Trust) → **Networks →
   Tunnels → Create a tunnel** → тип **Cloudflared**, дай имя (например
   `dotbio`).
2. На шаге **Install connector** скопируй **токен** туннеля (длинная строка
   `eyJ...`). Он понадобится в шаге 2. Токен секретный, в git не клади.
3. Вкладка **Public Hostname → Add a public hostname**:
   - **Subdomain/Domain**: твой поддомен (например `me` + `example.com`).
   - **Service**: **HTTP** → `localhost:8787`.
   - Сохрани. Cloudflare сам создаст нужную DNS-запись поддомена (CNAME на
     туннель, Proxied) и выпустит TLS.

## Шаг 2. Развернуть на сервере - одна команда

```bash
# git, если его нет
sudo apt-get update && sudo apt-get install -y git

# склонировать репозиторий (рекомендуемый путь - /srv)
sudo git clone <URL_РЕПОЗИТОРИЯ> /srv/dotcore
cd /srv/dotcore

# установка + сборка + туннель (токен из шага 1)
sudo TUNNEL_TOKEN='eyJ...' bash deploy/setup.sh me.example.com
```

Скрипт поставит Node, Caddy и cloudflared, соберёт статику, почистит за собой,
поднимет Caddy на `127.0.0.1:8787` и подключит `cloudflared` к твоему туннелю.
Через несколько секунд - `https://me.example.com`.

> Поддомен можно не передавать аргументом (скрипт спросит). Токен можно не
> задавать переменной - тогда скрипт спросит его интерактивно; пусто =
> установить cloudflared, но туннель подключить позже
> (`sudo cloudflared service install <TOKEN>`).
>
> Порт Caddy по умолчанию `8787`. Если он локально занят - задай свой и укажи
> тот же в public hostname туннеля: `PORT=8790 sudo TUNNEL_TOKEN=... bash
> deploy/setup.sh me.example.com`.

## Обновить сайт

После изменений в репозитории:

```bash
cd /srv/dotcore
sudo bash deploy/update.sh
```

`git pull` → пересборка статики → чистка `node_modules` → reload Caddy. Node,
Caddy, cloudflared и туннель не трогаются. Новые файлы `dist/` Caddy начинает
отдавать сразу.

## Настроить контент (имя, соцсети, фото, email)

По умолчанию сайт собирается на дефолтах. Чтобы появились ссылки на репозитории,
соцсети, фото и кнопка email, отредактируй `.env` в корне репозитория и
пересобери:

```bash
cd /srv/dotcore
sudo nano .env          # заполни PUBLIC_GITHUB_USER, соцсети, AUTHOR_EMAIL и т.д.
sudo bash deploy/update.sh
```

Список и назначение переменных - в `AGENTS.md` (раздел «Переменные окружения»).
Поля `PUBLIC_AUTHOR_NAME_RU/EN` оставляй либо непустыми, либо вовсе убери из
`.env` (пустая строка уронит сборку - сработает дефолт `.ядро`/`.core`).

## Автодеплой из GitHub (CI)

`update.sh` можно дёргать автоматически при каждом push в main - GitHub Actions
(`.github/workflows/deploy.yml`) сначала гоняет lint/type-check/build как gate
(без реального `.env`), а затем по SSH выполняет на сервере тот же
`sudo bash deploy/update.sh`. Pull request'ы деплой не триггерят, только gate.

Настройка (один раз, после `deploy/setup.sh`):

```bash
cd /srv/dotcore
sudo bash deploy/ci-setup.sh
```

Скрипт создаёт отдельного пользователя `ci-deploy` с узкой sudo-привилегией -
ему разрешено запускать без пароля только `deploy/update.sh`, ничего больше.
В конце выводит, какой SSH-ключ сгенерировать и какие секреты добавить в GitHub:

| Секрет             | Значение                                            |
| ------------------ | --------------------------------------------------- |
| `DEPLOY_SSH_KEY`   | приватный ключ CI целиком                            |
| `DEPLOY_HOST`      | IP или hostname сервера для SSH                      |
| `DEPLOY_USER`      | `ci-deploy`                                          |
| `DEPLOY_REPO_PATH` | `/srv/dotcore` (точно, без слэша на конце)           |
| `PUBLIC_DOMAIN`    | `https://me.example.com` (для health-check в конце)  |

`PUBLIC_DOMAIN` в выводе `ci-setup.sh` не упоминается - добавь его вручную,
иначе финальный health-check в workflow упадёт.

Ручной запуск `sudo bash deploy/update.sh` работает и после настройки CI - оба
пути используют один и тот же скрипт.

## Про защиту от флуда

За Cloudflare Tunnel сервер **не имеет открытых веб-портов** - напрямую по IP
сайт не достать, весь трафик идёт через сеть Cloudflare, которая и режет флуд.
Это сильнее, чем что-либо на одиночном сервере.

`deploy/harden.sh` (nftables per-IP лимит) в этой конфигурации **не нужен и не
запускается по умолчанию**: его правила висят на портах 80/443 всего хоста, а их
держит соседний сервис - harden заденет чужой трафик. Скрипт сам откажется
стартовать, если увидит на 80/443 стороннего слушателя.

## Если что-то не так

- **Сайт не открывается / 502 от Cloudflare.** Проверь туннель и Caddy:
  `systemctl status cloudflared caddy`, логи `journalctl -u cloudflared -f`.
  Убедись, что public hostname туннеля указывает на `localhost:8787` (тот же
  порт, что слушает Caddy: `ss -tlnp | grep 8787`).
- **Caddy не стартует.** Проверь конфиг: `caddy validate --config
  /etc/caddy/Caddyfile`. Порт занят локально - смени `PORT` (см. выше) и
  обнови public hostname в дашборде.
- **403 / Forbidden.** Caddy (пользователь `caddy`) не может прочитать `dist/`.
  `setup.sh` делает `chmod -R a+rX dist`, но если репозиторий под `/root`
  (права `700`), Caddy не пройдёт по пути. Держи репозиторий в `/srv`.
- **Сборка падает по нехватке диска.** Освободи место (`df -h /`), удали старый
  `node_modules`/кэш: `rm -rf node_modules .astro && npm cache clean --force`.
- **Перезапустить:** `sudo systemctl restart caddy` / `sudo systemctl restart
  cloudflared`.

## Как это устроено

| Файл                    | Назначение                                                                              |
| ----------------------- | --------------------------------------------------------------------------------------- |
| `deploy/setup.sh`       | Первичная установка + первый деплой (Node/Caddy/cloudflared, туннель по токену)          |
| `deploy/update.sh`      | Пересборка и редеплой уже развёрнутого сайта (reload loopback-Caddy)                     |
| `deploy/ci-setup.sh`    | Доступ для GitHub Actions - пользователь `ci-deploy` + узкий sudo только на `update.sh`  |
| `deploy/harden.sh`      | Анти-флуд на 80/443 (в конфигурации с Tunnel НЕ используется, под gate)                  |
| `deploy/Caddyfile.tmpl` | Шаблон конфига Caddy: loopback-only, security-заголовки, кэш, без домена и ACME          |

Security-заголовки и правила кэширования перенесены из `public/_headers`
(синтаксис Cloudflare Pages, который обычный веб-сервер игнорирует) в
`Caddyfile.tmpl`. Меняешь политику заголовков - правь шаблон и перезапусти
`setup.sh`.
