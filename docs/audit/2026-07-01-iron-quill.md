# Security Audit · Iron Quill · 2026-07-01

| Поле    | Значение             |
| ------- | -------------------- |
| Статус  | PASSED WITH WARNINGS |
| Прогон  | iron-quill           |
| Уровень | full                 |
| Охват   | leaks + code         |
| Модель  | Claude Opus 4.8 (1M) |
| Дата    | 2026-07-01           |

Повторный полный аудит после переработки кейсов (5 коммитов после снимка `2026-07-01.md`: dotlearn/dotmath/dottraceip/dotagents) и с незакоммиченными правками рабочего дерева (`.env.example`, `config.ts`, `projects.ts`, `WorkShifts.astro`, `dotworkbot.json` и др.). Оба трека, веер из 8 подагентов по измерениям (secrets, history, pii, frontend-xss, code-exec, deploy, ci, deps) + отдельная adversarial-проверка CI на утечку секретов/инъекцию. Аудит гонялся по текущему рабочему дереву (то, что готовится к деплою).

## Сводка

| Измерение                    | Находки                                                     |
| ---------------------------- | ---------------------------------------------------------- |
| Трек A · Секреты/ключи       | 0                                                          |
| Трек A · PII/экспозиция      | 0 (localhost/PrivateCore в копирайте, намеренно)          |
| Трек A · История git         | 0 (54 коммита чисто; purge settings.local.json подтверждён)|
| Трек B · Инъекции/exec/XSS   | 0 эксплуатируемых (источники авторские, недоверенного пути нет) |
| Трек B · Деплой-скрипты      | 2 Low                                                     |
| Трек B · CI (GitHub Actions) | 0 Crit/High (adversarial-verify: claim holds) + 1 Low     |
| Трек B · Заголовки/CSP       | Info (строгий `script-src 'self'`)                        |
| Трек B · Зависимости         | 1 Medium + 3 Low (все dev/build-only, не в `dist/`)       |

**Severity:** Crit 0 · High 0 · Med 1 · Low 6 · Info ~14
**Готовность:** 9/10
**Вердикт:** PASSED WITH WARNINGS

Гейт пройден: ни одного Critical/High. `npm audit` показывает 0 critical / 2 high / 6 moderate, но метки npm отражают сырой скор advisory. Для этой полностью статической сборки (output static, нет SSR-адаптера, `integrations:[]`, нет middleware/server-islands/define:vars) все advisory лежат на dev/build/CI-путях, которых нет в задеплоенном `dist/`; adversarial-проверка подтвердила `exploitable_path: null` в проде. Единственный Medium (dev-сервер vite/esbuild) реален для машины разработчика при `astro dev`, поэтому не понижен до Low несмотря на отсутствие прод-пути.

### Проверка предыдущей ремедиации (снимок 2026-07-01)

- `package-lock.json`: integrity **696/696** (100%), все `resolved`+`integrity`, источник: registry.npmjs.org. Держится.
- `deploy/setup.sh`: regex-валидация `$DOMAIN` (`^[A-Za-z0-9.-]+$`) перед `sed`/heredoc присутствует, не обходится.
- `deploy/harden.sh`: числовой guard `RATE`/`BURST` перед nft-правилами присутствует, корректен.
- История git: переписывание 2026-06-26 подтверждено, `settings.local.json` отсутствует во всех деревьях всех 54 коммитов.

### CI: adversarial-verify (утечка секретов / инъекция)

Отдельный агент пытался опровергнуть «в CI нет High». Все 6 векторов refuted: (1) форк-PR не получают секретов, т.к. `pull_request`, а не `pull_request_target`; (2) недоверенный `github.event.*` в `run:` не течёт; (3) heredoc-секреты контролирует только владелец (self-attack ≠ уязвимость); (4) publish защищён guard'ом `head.repo.full_name == github.repository` + пустыми секретами на форке; (5) untrusted build в одном job с `.env`, но на форке `.env` пустой; (6) нет self-hosted runner, нет upload-artifact, все actions SHA-pinned. Claim holds.

## Находки

| Severity      | Категория              | Файл:строка                        | Описание                                                                                                                                                        | Рекомендация                                                                                                                            |
| ------------- | ---------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Medium (open) | known-vuln (dev)       | `package-lock.json` (vite/esbuild) | `vite@5.4.21` + `esbuild@0.21.5`: dev-сервер advisory (CSWSH/SSRF, обход `server.fs.deny`, Windows UNC NTLM-leak). Только `astro dev` на машине разработчика; в `dist/` уязвимого кода нет | Не держать `astro dev` в недоверенной сети; dev-сервер на localhost. Полное закрытие: мажор astro 4→5 (тянет пересбор CSP), отложено |
| Low (open)    | known-vuln (dev/SSR)   | `package.json:27`                  | `astro@4.16.19`: 13 advisory на SSR/server-island/middleware/define:vars, пути не задействованы статической сборкой                                            | Плановая миграция astro 4→5+ отдельной задачей; для текущей архитектуры не блокер                                                     |
| Low (open)    | known-vuln (dev)       | `package-lock.json` (@astrojs/check) | `yaml@2.7.1` (ReDoS/stack-overflow) через yaml-language-server, только локальный `type-check`                                                                  | Форвард-фикса нет (fix = downgrade). Принять; перенести `@astrojs/check` в devDependencies (корректность)                             |
| Low (open)    | install-script         | `package-lock.json`                | `sharp`/`esbuild`/`fsevents` с lifecycle-скриптами; integrity проверена, официальные native-модули                                                             | Деплой через `npm ci`; опц. `--ignore-scripts` при отдельном кэше бинарников                                                          |
| Low (open)    | unsafe-default         | `deploy/setup.sh:104`              | `.env` создаётся с umask по умолчанию (0644, world-readable), без `chmod 600`. Сейчас только `PUBLIC_*` + пустой `AUTHOR_EMAIL`                                | `chmod 600 "$ENV_FILE"` сразу после создания, критично, как только в `.env` попадёт реальный секрет                                  |
| Low (open)    | command-injection      | `deploy/setup.sh:147`              | `$DIST_DIR` (путь чекаута) подставляется в `sed` с разделителем `\|` без экранирования; `$DOMAIN` рядом валидируется, `$DIST_DIR` нет                         | Локальный путь, риск низкий; экранировать замену или подавать путь через env                                                          |
| Low (open)    | secret-handling        | `.github/workflows/deploy.yml:43`  | Секреты `${{ secrets.* }}` подставляются шаблонизатором в текст quoted-heredoc, а не через `env:`+`$VAR`. Не инъекция (значения владельца), но антипаттерн       | Пробрасывать каждый секрет через `env:` и писать `.env` из переменных окружения (как в avatar-шаге 65-72)                             |
| Info          | script-breakout (hard) | `AgentsBridge.astro:379`, `WorkShifts.astro:495` | `<script type="application/json">...JSON.stringify(x)...` не экранирует `<` (в отличие от `BaseLayout:126`). Данные авторские, не эксплуатируется                  | Defense-in-depth: тот же `.replace(/</g,'<')`, чтобы будущая строка с `</script` не сломала тег                                  |
| Info          | ci-hardening           | `.github/workflows/deploy.yml:41,89` | Материализация `.env` и untrusted build в одном job; безопасно только потому что триггер `pull_request` (не `pull_request_target`)                            | Зафиксировать инвариант комментарием / разнести build и deploy; опц. `github.event_name != 'pull_request'` на publish + `persist-credentials:false` |
| Info          | weak-csp               | `public/_headers`, `deploy/Caddyfile.tmpl` | `style-src 'unsafe-inline'` (нужен Astro при `inlineStylesheets:'always'`); `script-src` остаётся строгим `'self'`                                              | Приемлемо                                                                                                                              |
| Info          | pii (intentional)      | `src/content/projects/*.json`      | Бренд «PrivateCore» в нарративе без ссылки на репо; `localhost` в описании архитектуры                                                                          | Без изменений, политика приватности соблюдена                                                                                        |
| Info          | dev-tool               | `scripts/parse-lh.cjs:3`           | `JSON.parse(fs.readFileSync(argv[2]))` без валидации пути: dev-only утилита, не вызывается build/CI                                                            | Приемлемо; при интеграции в автоматизацию валидировать путь + try/catch                                                            |

Улики маскированы; значения секретов не приводятся. Полный набор security-заголовков (CSP, HSTS, X-Frame-Options DENY, X-Content-Type-Options, Referrer-Policy, COOP/CORP, Permissions-Policy) задублирован в `public/_headers` и `deploy/Caddyfile.tmpl` и идентичен.

### Заметка (вне аудита безопасности)

`npm run type-check` может давать пре-существующие ошибки строгого `noUncheckedIndexedAccess`, которые `astro build` не ловит; шаг `type-check` в CI из-за этого может быть красным. К безопасности не относится.
