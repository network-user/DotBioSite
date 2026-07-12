# Аналитика портфолио (Umami, self-hosted)

Анонимная cookieless-аналитика на своём VPS: онлайн в реальном времени,
посещения, уникальные, топ страниц и проектов, источники переходов и события
кликов (`data-umami-event`). Данные никуда наружу не уходят, живут в Postgres
рядом с сайтом. Дашборд - на отдельном поддомене под встроенным логином Umami.

```
                            /stats/script.js, /stats/api/send (first-party)
браузер ─HTTPS→ Caddy DotSound ─┬─ portfolio-домен  → portfolio:80 ──proxy──┐
        (80/443, TLS)           └─ analytics-домен  → umami:3000            │
                                                         ▲                  │
                                        (дашборд, логин) └── umami:3000 ◀────┘
                                   umami ── internal ── umami-db (Postgres, приватно)
```

Трекер-скрипт и приём событий проксируются через Caddy контейнера `portfolio`
(`deploy/Caddyfile.container`), то есть отдаются с ОСНОВНОГО домена. Поэтому CSP
сайта не ослабляется (`script-src`/`connect-src` остаются `'self'`) и ad-block
реже режет статистику. Дашборд Umami открывается только на поддомене.

## Что нужно один раз

1. Стек DotSound развёрнут, существует сеть `dotsound` (та же схема, что у
   портфолио - см. `deploy/README.md`).
2. **DNS:** A-запись `analytics.<домен>` указывает на IP сервера. TLS выпустит
   фронт-Caddy DotSound автоматически.
3. Порты дополнительно открывать не нужно (весь трафик через фронт-Caddy).

## Шаг 1. Поднять Umami

```bash
cd /srv/dotcore
sudo bash deploy/analytics/setup.sh analytics.example.com
# при нестандартном имени сети dotsound:
# sudo DOTSOUND_NETWORK=<имя> bash deploy/analytics/setup.sh analytics.example.com
```

`setup.sh` сам:

- сгенерит все секреты в `deploy/analytics/.env` (пароль БД, `APP_SECRET`,
  разовый пароль админа) - файл `chmod 600`, в git не идёт;
- поднимет `umami`, `umami-db`, одноразовый `umami-init`;
- `umami-init` пропишет твой логин и пароль админа из `.env` (идемпотентно, не
  фатально: при сбое остаётся дефолт `admin`/`umami`, сменишь пароль в UI);
- напечатает логин/пароль и что делать дальше.

Секреты можно задать заранее самому: создай `deploy/analytics/.env` с нужными
`UMAMI_ADMIN_USERNAME` / `UMAMI_ADMIN_PASSWORD` и т.д. до первого `setup.sh` -
он уважает существующий файл и ничего не перегенерирует.

## Шаг 2. Проверить, что контейнеры живы

```bash
docker ps | grep -E 'umami|umami-db'
docker logs umami-init      # строка "готово: админ ... инициализирован"
```

Изнутри сети дашборд уже отвечает на `umami:3000`, но наружу его ещё не видно -
это делает шаг 3.

## Шаг 3. Подключить поддомен к фронт-Caddy DotSound (один раз)

Site-блок аналитики уже добавлен в `Caddyfile` DotSound (секция "Co-hosted
sites", рядом с портфолио и DotLearn) и закоммичен - он читает домен из
переменной и падает на безопасный дефолт `analytics.localhost`, пока она пуста:

```caddy
{$ANALYTICS_DOMAIN:analytics.localhost} {
	encode zstd gzip
	reverse_proxy umami:3000 {
		header_up X-Forwarded-Proto {scheme}
		header_up X-Real-IP {remote_host}
	}
}
```

Тебе остаётся только задать домен в `.env` DotSound
(`/opt/dotsound/DotSoundBackend/.env`), голым хостнеймом без `https://`:

```
ANALYTICS_DOMAIN=analytics.example.com
```

`.env` не в git, поэтому домен не раскрывается в репозитории и переживает
`git reset --hard` в `deploy.sh`. Сам site-блок уже в origin/main, стереться не
может (не забудь `git pull` DotSound на сервере, чтобы блок туда приехал).

Перезагрузи фронт-Caddy без даунтайма:

```bash
cd /opt/dotsound/DotSoundBackend
docker compose -f docker-compose.yml -f docker-compose.prod.yml \
  exec caddy caddy reload --config /etc/caddy/Caddyfile
```

Через несколько секунд `https://analytics.example.com` отвечает страницей входа
Umami (сертификат Caddy выпустит сам).

## Шаг 4. Создать website и связать с сайтом

1. Войди в дашборд логином/паролем из шага 1.
2. Settings -> Websites -> Add website. Name - любое, Domain - домен портфолио
   (например `example.com`).
3. Скопируй **Website ID** (Settings -> Websites -> `</>` или Edit).
4. Пропиши его в `.env` **САЙТА** (`/srv/dotcore/.env`, не в `deploy/analytics/.env`):
   ```
   PUBLIC_UMAMI_WEBSITE_ID=<uuid-из-umami>
   ```
5. Пересобери статику, чтобы трекер попал в бандл:
   ```bash
   sudo bash deploy/update.sh
   ```

Готово. Открой сайт, потом в дашборде увидишь себя в Realtime.

`PUBLIC_UMAMI_SRC` менять не нужно: по умолчанию `/stats/script.js` -
first-party путь через Caddy портфолио. Абсолютный URL поддомена туда стоит
класть, только если решишь не проксировать трекер (тогда придётся ослабить CSP).

## Обновление

```bash
cd /srv/dotcore
sudo bash deploy/analytics/update.sh   # подтянуть свежий образ Umami
```

Пин версии образа: раскомментируй `UMAMI_IMAGE=...` в `deploy/analytics/.env`.

## Приватность

- Umami не ставит cookie и не хранит IP в открытом виде; трекинг анонимный и
  агрегатный, персональных профилей и «журналов по конкретному человеку» нет.
- `data-domains` в трекере ограничивает отправку продакшн-хостом: локальная
  сборка и preview статистику не засоряют.
- `DISABLE_TELEMETRY=1` - Umami не шлёт свою анонимную телеметрию апстриму.

## Если что-то не так

- **502 на поддомене.** Контейнер не поднят или не в сети dotsound:
  `docker ps | grep umami`, `docker network inspect <сеть> | grep umami`.
  Имя в site-блоке должно быть `umami:3000`.
- **Поддомен пропал после деплоя DotSound.** Site-блок не в git DotSound -
  `git reset --hard` его стёр. Закоммить в origin/main.
- **События/просмотры не идут.** Проверь, что `PUBLIC_UMAMI_WEBSITE_ID` задан в
  `.env` сайта и сайт пересобран; что `location.hostname` совпадает с
  `data-domains`; что `https://<домен>/stats/script.js` отдаёт JS (а не 404/502).
- **Забыл пароль админа.** Он в `deploy/analytics/.env` (`UMAMI_ADMIN_PASSWORD`).
  Меняется в UI: Settings -> Profile.
- **Хочу переинициализировать админа из .env заново.** Удали флаг в томе:
  `docker run --rm -v portfolio-analytics_umami-seed:/seed alpine rm -f /seed/.admin-initialized`
  и подними стек снова.

## Файлы

| Файл                                  | Назначение                                                |
| ------------------------------------- | --------------------------------------------------------- |
| `deploy/analytics/docker-compose.yml` | Umami + Postgres + одноразовый umami-init в сети dotsound |
| `deploy/analytics/seed-admin.sh`      | Инициализация админа из .env (bcrypt в БД, идемпотентно)  |
| `deploy/analytics/setup.sh`           | Генерация секретов + подъём стека одной командой          |
| `deploy/analytics/update.sh`          | Обновление образа Umami                                   |
