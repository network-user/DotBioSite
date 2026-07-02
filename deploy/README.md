# Деплой портфолио за общим фронт-Caddy (co-hosting с DotSound)

На сервере уже работает Docker-стек **DotSound**, чей Caddy держит порты
**80/443** и терминирует TLS. Портфолио (и DotLearn) не могут занять те же
порты, поэтому они деплоятся как лёгкие контейнеры в **той же docker-сети
`dotsound`**, а Caddy DotSound проксирует на них по имени контейнера. Это
временное решение (общий фронт), пока проекты живут на одном IP без Cloudflare
и без второго IP.

```
                              ┌─ {$DOMAIN}       → frontend:80        (DotSound)
браузер ─HTTPS→ Caddy DotSound ┼─ portfolio-домен → portfolio:80      (этот проект, статика)
        (порты 80/443, TLS)   └─ learn-домен     → dotlearn-web:8080 (DotLearn, свой nginx→api:3000)
                                 все контейнеры в сети dotsound; лишние порты наружу не публикуются
```

Портфолио - статика (Astro SSG). Собираем `dist/` на хосте, отдаём контейнером
`caddy:2-alpine` (тот же образ, что у DotSound - доп. места под образ нет).

## Предусловия

1. Стек DotSound развёрнут и запущен (существует сеть `dotsound`).
2. Docker + docker compose установлены (их ставит DotSound).
3. **DNS:** A-запись поддомена портфолио (и поддомена DotLearn) указывает на IP
   сервера. TLS для них Caddy DotSound выпустит автоматически (порты у него
   открыты).
4. Порты дополнительно открывать **не нужно**.

## Важно про имя сети

Внешняя сеть в `deploy/docker-compose.yml` по умолчанию - `dotsoundbackend_dotsound`
(имя = каталог compose-проекта DotSound + сеть). Проверь реальное:

```bash
docker network ls | grep dotsound
```

Если отличается - передавай его всем командам через `DOTSOUND_NETWORK=<имя>`.

## Шаг 1. Развернуть портфолио

```bash
# склонировать (пример пути)
sudo git clone <URL_РЕПОЗИТОРИЯ> /srv/dotcore
cd /srv/dotcore

# собрать статику и поднять контейнер в сети dotsound
sudo bash deploy/setup.sh me.example.com
# при нестандартном имени сети:
# sudo DOTSOUND_NETWORK=<имя> bash deploy/setup.sh me.example.com
```

`setup.sh` поставит Node (только для сборки), соберёт `dist/`, почистит
`node_modules` и поднимет контейнер `portfolio`. Наружу он не смотрит - ждёт
проксирования от Caddy DotSound (шаг 3).

## Шаг 2. Развернуть DotLearn

DotLearn - монорепо (статический web + опциональный API). Его штатный
`scripts/deploy.sh` ставит СВОЙ Caddy на 80/443 - его **не используем** (конфликт
с DotSound). Поднимаем контейнерами; правки для сети уже внесены в его
`docker-compose.yml` (сервис `web` = контейнер `dotlearn-web`, подключён к
`dotsound`).

```bash
sudo git clone <URL_DOTLEARN> /srv/dotlearn
cd /srv/dotlearn

# web собирается с зашитым адресом API (нужно для формы /submit и админки).
# Если форма/админка не нужны - можно оставить пустым, SPA работает автономно.
echo "VITE_API_BASE=https://learn.example.com" | sudo tee -a .env

sudo docker compose up -d --build
# при нестандартном имени сети: sudo DOTSOUND_NETWORK=<имя> docker compose up -d --build
```

Поднимутся `dotlearn-web` (nginx :8080, сам проксирует `/api` на `api:3000`) и
`api` (NestJS :3000, loopback). Elasticsearch по умолчанию выключен.

## Шаг 3. Подключить к фронт-Caddy DotSound (один раз)

В репозитории DotSound уже добавлены два site-блока в `Caddyfile` (секция
"Co-hosted sites"). Осталось:

1. **Заменить домены-плейсхолдеры** `portfolio.example.com` и `learn.example.com`
   на свои реальные поддомены.
2. **Закоммитить в git DotSound (origin/main).** Это обязательно: `deploy.sh`
   DotSound делает `git reset --hard origin/main`, и только-локальные правки
   Caddyfile сотрутся при следующем его деплое.
3. Перезагрузить фронт-Caddy без даунтайма:

```bash
cd /opt/dotsound/DotSoundBackend
docker compose -f docker-compose.yml -f docker-compose.prod.yml \
  exec caddy caddy reload --config /etc/caddy/Caddyfile
```

Через несколько секунд оба поддомена отвечают по HTTPS (Caddy выпустит для них
сертификаты). Существующий сайт DotSound при `reload` не прерывается.

## Обновить сайты

**Портфолио:**
```bash
cd /srv/dotcore
sudo bash deploy/update.sh
```
`git pull` → пересборка → контейнер сразу отдаёт свежий `dist/` (bind-mount).

**DotLearn:**
```bash
cd /srv/dotlearn
sudo git pull
sudo docker compose up -d --build
```

Фронт-Caddy DotSound при обновлении сайтов трогать не нужно - он проксирует по
имени контейнера.

## Настроить контент портфолио (.env)

```bash
cd /srv/dotcore
sudo nano .env          # PUBLIC_GITHUB_USER, PUBLIC_SOCIAL_*, AUTHOR_EMAIL и т.д.
sudo bash deploy/update.sh
```
Список переменных - в `AGENTS.md` (раздел "Переменные окружения"). Поля
`PUBLIC_AUTHOR_NAME_RU/EN` оставляй непустыми или убери из `.env`.

## Автодеплой портфолио из GitHub (CI, опционально)

`.github/workflows/deploy.yml` при push в main гоняет lint/type-check/build и по
SSH выполняет на сервере `sudo bash deploy/update.sh`. Настройка:

```bash
cd /srv/dotcore
sudo bash deploy/ci-setup.sh   # пользователь ci-deploy + узкий sudo на update.sh
```

Секреты в GitHub: `DEPLOY_SSH_KEY`, `DEPLOY_HOST`, `DEPLOY_USER` (`ci-deploy`),
`DEPLOY_REPO_PATH` (`/srv/dotcore`), `PUBLIC_DOMAIN` (`https://me.example.com`,
для health-check).

## Про защиту от флуда

Порты наружу не открываются, весь внешний трафик проходит через фронт-Caddy
DotSound. `deploy/harden.sh` в этой схеме **не нужен и не запускается** (его
nftables-правила на 80/443 задели бы DotSound; скрипт сам откажется стартовать,
если увидит там стороннего слушателя).

## Если что-то не так

- **502 от Caddy DotSound на поддомене.** Контейнер не поднят или не в сети:
  `docker ps | grep -E 'portfolio|dotlearn'`, `docker network inspect <имя_сети>`.
  Проверь, что имена в Caddyfile (`portfolio:80`, `dotlearn-web:8080`) совпадают
  с `container_name`.
- **Сеть не найдена при `up`.** Неверное `DOTSOUND_NETWORK` - сверь
  `docker network ls | grep dotsound`.
- **Сертификат не выпускается.** Поддомен не указывает на сервер (`dig +short
  поддомен`) или не закоммичен site-блок. Логи: `docker logs <caddy DotSound>`.
- **Поддомен пропал после деплоя DotSound.** Site-блок не в git DotSound -
  `git reset --hard` его стёр. Закоммить в origin/main.

## Как это устроено

| Файл                         | Назначение                                                        |
| ---------------------------- | ----------------------------------------------------------------- |
| `deploy/docker-compose.yml`  | Контейнер portfolio (caddy:2-alpine) в внешней сети dotsound       |
| `deploy/Caddyfile.container` | Внутренний конфиг Caddy контейнера: :80, file_server, заголовки    |
| `deploy/setup.sh`            | Сборка статики на хосте + подъём контейнера                        |
| `deploy/update.sh`           | Пересборка и обновление (bind-mount, без пересоздания контейнера)  |
| `deploy/ci-setup.sh`         | Доступ для GitHub Actions (ci-deploy + узкий sudo на update.sh)    |
| `deploy/harden.sh`           | Анти-флуд на 80/443 - в этой схеме НЕ используется (под gate)      |

`deploy/Caddyfile.tmpl` от прежней схемы (свой Caddy на хосте) больше не
используется - его можно удалить.
