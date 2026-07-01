> Последний прогон. Снимок: [2026-07-01.md](2026-07-01.md) · история: [docs/audit/](.)

# Security Audit - 2026-07-01

| Поле   | Значение                  |
| ------ | ------------------------- |
| Статус | PASSED WITH WARNINGS      |
| Уровень | full                     |
| Охват  | leaks + code              |
| Модель | Claude Opus 4.8 (1M)      |
| Дата   | 2026-07-01                |

Полный аудит перед сменой видимости на public. Оба трека, веер из 8 подагентов по измерениям (secrets, history, pii, web-xss, deploy-scripts, ci, deps, headers) + adversarial-проверка спорных находок.

## Сводка

| Измерение                       | Находки                                  |
| ------------------------------- | ---------------------------------------- |
| Трек A · Секреты/ключи          | 0                                        |
| Трек A · PII/экспозиция         | 3 (Info, намеренные)                     |
| Трек A · История git            | 0 (46 коммитов чисто)                    |
| Трек B · Инъекции/exec/XSS      | 0 (источники авторские, недоверенного пути нет) |
| Трек B · Деплой-скрипты         | 1 Low + 2 Info → исправлено              |
| Трек B · CI (GitHub Actions)    | 1 Low / 1 Info                           |
| Трек B · Заголовки/CSP          | Info (строгий CSP, `script-src 'self'`)  |
| Трек B · Зависимости            | 2 Medium → 1 закрыт, 1 открыт (dev-only) |

**Severity (после ремедиации):** Crit 0 · High 0 · Med 1 · Low 3 · Info ~15
**Готовность:** 9/10
**Вердикт:** PASSED WITH WARNINGS

Гейт пройден: ни одного Critical/High. `npm audit` показывал 2 high на `astro` (server islands XSS, неэкранированное имя slot) - adversarial-проверка подтвердила, что в статической сборке (output static, нет SSR-адаптера, `integrations:[]`, нет `server:defer`/`define:vars`/`prerender=false`) уязвимые рантайм-пути не исполняются; `exploitable_path: null`. Задеплоенный `dist/` чист.

История git проверена вручную (`gitleaks` локально не установлен); в CI `security.yml` gitleaks гоняется с `fetch-depth: 0`. Переписывание истории 2026-06-26 подтверждено - удалённых чувствительных файлов в текущем графе нет.

### Ремедиация в этом прогоне

- `package-lock.json`: integrity 98/690 → **696/696** (`resolved`+`integrity`); закрыт supply-chain Medium, сборка зелёная.
- `deploy/setup.sh`: regex-валидация `$DOMAIN` перед `sed` (хост `^[A-Za-z0-9.-]+$`).
- `deploy/harden.sh`: числовая валидация `RATE`/`BURST` перед подстановкой в nft-правила.

## Находки

| Severity        | Категория              | Файл:строка                      | Описание                                                                                          | Рекомендация                                                                                  |
| --------------- | ---------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Medium (open)   | known-vuln (dev)       | `package-lock.json`              | `vite@5.4.21` + `esbuild@0.21.5`: advisory dev-сервера (CSWSH, обход `server.fs.deny`, Windows UNC NTLM). Только машина разработчика, не в `dist/` | Не держать `astro dev` при заходе на недоверенные сайты; dev-сервер на `127.0.0.1`. Полное закрытие - мажор astro 4→5 (тянет пересбор CSP), отложено |
| Medium (fixed)  | supply-chain-integrity | `package-lock.json`              | `resolved`+`integrity` были только у 98/690 пакетов - `npm ci` не верифицировал хеши               | ЗАКРЫТО: чистая регенерация (`rm -rf node_modules package-lock.json && npm install`), 696/696 |
| Low (open)      | known-vuln (dev/SSR)   | `package.json:27`                | `astro@4.16.19`: 14 advisory на SSR/dev-путях, не задействованных статической сборкой              | Плановая миграция astro 4→5+ отдельной задачей одновременно с переносом CSP на хеши            |
| Low (open)      | known-vuln (dev)       | `package-lock.json`              | `@astrojs/check` → `yaml`/`js-yaml` DoS, только локальный `type-check`                             | Принять: форвард-фикса нет (latest 0.9.9 уязвим), downgrade до 0.9.2 теряет возможности         |
| Low (fixed)     | command-injection      | `deploy/setup.sh:48`             | `$DOMAIN` (ввод оператора) подставлялся в `sed` без валидации формата/экранирования `\|`            | ЗАКРЫТО: regex-валидация хоста перед подстановкой                                              |
| Low (open)      | secret-handling        | `.github/workflows/deploy.yml:43`| Секреты интерполируются в quoted-heredoc (`<<'EOF'`) - не инъекция, антипаттерн                    | Опц.: пробрасывать каждый секрет через `env:` и писать в `.env` из переменных окружения        |
| Info (fixed)    | input-validation       | `deploy/harden.sh:32`            | `RATE`/`BURST` из env шли в текст nft-правил без проверки, что это числа                            | ЗАКРЫТО: numeric guard, выход с ошибкой на нечисловом значении                                 |
| Info            | pii (intentional)      | `src/content/projects/dotsound.json` | Имя «PrivateCore» в нарративе кейса, без ссылки на репозиторий                                 | Без изменений - политика приватности соблюдена                                                |
| Info            | weak-csp               | `public/_headers:9`              | `style-src 'unsafe-inline'` (нужен Astro для inline-CSS при `inlineStylesheets:'always'`)          | Приемлемо; `script-src` остаётся строгим `'self'`                                             |

Улики маскированы; значения секретов не приводятся. Полный набор security-заголовков (CSP, HSTS, X-Frame-Options DENY, COOP/CORP, Permissions-Policy) задублирован в `public/_headers` и `deploy/Caddyfile.tmpl`.

### Заметка (вне аудита безопасности)

`npm run type-check` даёт ~7 пре-существующих ошибок (`src/components/case/signature/SoundFlow.astro` и др., строгий `noUncheckedIndexedAccess`), которые `astro build` не ловит. Не относится к безопасности; вероятно, шаг `type-check` в CI красный.
