# Security Audit · Onyx Sentinel · 2026-07-02

| Поле    | Значение             |
| ------- | -------------------- |
| Статус  | PASSED               |
| Прогон  | onyx-sentinel        |
| Уровень | full                 |
| Охват   | leaks + code         |
| Модель  | Claude Opus 4.8 (1M) |
| Дата    | 2026-07-02           |

Финальный полный аудит после того, как деплой устаканился на модель **Caddy + pull-based CI** (миграция с черновых Cloudflare/nginx-вариантов свёрнута: `nginx.conf` удалён как redundant, серверный конфиг один - `Caddyfile.tmpl`). Оба трека, веер подагентов по измерениям + adversarial-проверка эскалации привилегий в CI/деплое. Прогон по текущему рабочему дереву (57 коммитов + незакоммиченные `Contact.astro`/`SectionHeader.astro`). Supersedes снимок `2026-07-01-iron-quill.md` (был PASSED WITH WARNINGS до ремедиации и до финализации деплоя).

## Сводка

| Измерение                    | Находки                                                           |
| ---------------------------- | ---------------------------------------------------------------- |
| Трек A · Секреты/ключи       | 0                                                                |
| Трек A · PII/экспозиция      | 0 (email автора - base64-обфускация, намеренно публичный)        |
| Трек A · История git         | 0 (57 коммитов; 3 новых с прошлого прогона чисты)                |
| Трек B · Инъекции/exec/XSS   | 0 эксплуатируемых (`<`-escaping в JSON-островах применён)         |
| Трек B · Деплой/CI (Caddy)   | 0 Crit/High (adversarial: claim holds) · 2 Low + 2 Info          |
| Трек B · Заголовки/TLS       | Caddy: полный набор + HSTS, строгий CSP `script-src 'self'`, `-Server` |
| Трек B · Зависимости         | dev/build-only advisory → Low (не в проде); `deps_changed=false` |

**Severity:** Crit 0 · High 0 · Med 0 · Low 6 · Info ~9
**Готовность:** 9/10
**Вердикт:** PASSED

Гейт пройден: ни одного Critical/High/Medium. `npm audit` показывает 2 high / 6 moderate, но все advisory - на dev/build-путях (dev-сервер vite/esbuild, SSR/server-islands astro, yaml в type-check). Задеплоенный `dist/` - статика, отдаётся Caddy; `astro build` не поднимает dev-сервер и не исполняет SSR-код, поэтому уязвимых прод-путей нет. Единственный прошлый Medium (vite/esbuild) переклассифицирован в Low: реальная уязвимость, но dev/build-only, нулевой прод-эксплойт; полное закрытие = мажор astro 4→6 (несоразмерно, отложено).

### Ремедиация этого цикла (закрыто)

- `AgentsBridge.astro:383`, `WorkShifts.astro:499`: `.replace(/</g, "<")` в `<script type="application/json">` - закрыт `</script>`-breakout (зеркало `BaseLayout`). Сборка зелёная (14 страниц).
- `deploy/setup.sh:127`: `chmod 600 "$ENV_FILE"` - `.env` на сервере читаем только root (`ci-deploy` его не прочитает).
- `.github/workflows/deploy.yml`: все секреты (`DEPLOY_SSH_KEY`/`DEPLOY_HOST`/`DEPLOY_USER`/`DEPLOY_REPO_PATH`/`PUBLIC_DOMAIN`) через `env:` + `"$VAR"`, не интерполяцией `${{ }}` в текст скрипта - закрыт антипаттерн secret-handling. Build-gate вообще без `.env` (Zod-дефолты) → PR-сборка untrusted-кода без единого секрета.
- `nginx.conf` удалён: Caddy применяет `header {}` глобально, грабли наследования заголовков (как в nginx `add_header` в location) неактуальны.

### CI/деплой: adversarial-verify (эскалация / fork-PR / утечка ключа)

Модель: CI на push в main по SSH запускает `sudo /bin/bash $REPO_PATH/deploy/update.sh` под узким пользователем `ci-deploy` (sudoers NOPASSWD только на этот скрипт). Все 5 векторов - refuted:

- **Эскалация**: `ci-deploy` не может перезаписать `update.sh`, подсунуть git-hook (`.git/hooks/*` исполняется root'ом при `git pull`) или подменить файл (TOCTOU) - репо клонируется root'ом в `/srv` (README), всё `root:root`. Его максимум - «передеплой текущего main».
- **Fork-PR**: триггер `pull_request` (не `_target`), build-gate без секретов, deploy-шаги гейтированы `!= pull_request`.
- **Утечка CI-ключа**: даёт только low-priv shell `ci-deploy` + запуск `update.sh`; не root, `.env` (600, root) не читается.
- **Secret-handling / actions**: секреты через `env:`, ключ `chmod 600`, все actions запинены на SHA, gitleaks с полной историей.

Оговорка (Low ниже): защита от эскалации держится на **ops-flow** (root-owned клон в `/srv`), а не на коде - `ci-setup.sh` владельца не проверяет.

## Находки

| Severity | Категория | Файл:строка | Описание | Рекомендация |
| -------- | --------- | ----------- | -------- | ------------ |
| Low | known-vuln (dev) | `package-lock.json` (vite/esbuild) | Dev-сервер advisory (CSWSH/SSRF, обход `server.fs.deny`, Windows NTLM). `astro build` dev-сервер не поднимает; в `dist/` кода нет | Не запускать `astro dev` в недоверенной сети. Полное закрытие - мажор astro 4→6 |
| Low | known-vuln (dev/SSR) | `package.json:27` astro@4.16.x | SSR/server-island/middleware/define:vars advisory - фичи не задействованы (static, `integrations:[]`) | Плановая миграция astro 4→6 отдельной задачей |
| Low | known-vuln (dev) | `@astrojs/check`→yaml | ReDoS/stack-overflow, только локальный `type-check` | Принять (fix = downgrade); перенести `@astrojs/check` в devDependencies |
| Low | supply-chain / least-priv | `deploy/update.sh:28` | `npm ci` + `build` идут **от root** на сервере; install/build-скрипты зависимостей исполнятся root'ом | Собирать под непривилегированным юзером (`runuser`/`sudo -u`), root - только `reload caddy`. Сейчас смягчено pinned-integrity lockfile |
| Low | privilege / ops-hardening | `deploy/ci-setup.sh:36` | Защита узкого sudo от эскалации держится на root-owned клоне в `/srv`; код это не проверяет | Перед записью sudoers проверять, что `update.sh` root-owned и не writable для `ci-deploy`; предупреждать, если репо вне `/srv`\|`/var/www` |
| Low | command-injection | `deploy/setup.sh:149` | `$DIST_DIR` (путь чекаута) в `sed` с разделителем `\|` без экранирования; `$DOMAIN` рядом валидируется | Локальный путь, риск низкий; экранировать замену или подавать путь через env |
| Info | weak-csp | `deploy/Caddyfile.tmpl:40` | `style-src 'unsafe-inline'` (нужен Astro при inline-CSS); `script-src` строгий `'self'` | Приемлемо |
| Info | network / TOFU | `.github/workflows/deploy.yml:69` | `ssh-keyscan` доверяет ключу хоста при первом подключении (TOFU) | Пинить host key секретом `DEPLOY_KNOWN_HOSTS` вместо live-скана |
| Info | quoting | `.github/workflows/deploy.yml:72` | `$DEPLOY_REPO_PATH` без кавычек в remote-команде | Не эксплуатируется (owner-секрет + sudoers пинит путь); закавычить для defense-in-depth |
| Info | pii (intentional) | `src/components/Contact.astro` | Email автора - base64 от перевёрнутой строки (`data-e`), намеренно публичный контакт | Без изменений |
| Info | dev-tool | `scripts/parse-lh.cjs:3` | `JSON.parse(fs.readFileSync(argv[2]))` без валидации пути - dev-only, не в build/CI | Приемлемо |

Улики маскированы; значения секретов не приводятся. Серверный конфиг единый - `Caddyfile.tmpl` (полный набор security-заголовков включая HSTS `max-age=31536000; includeSubDomains`, строгий CSP `script-src 'self'`, `-Server`, анти-slowloris таймауты, лимит тела). Валидация ввода в `setup.sh` (`$DOMAIN` regex) и `harden.sh` (`RATE`/`BURST` numeric) на месте. `package-lock.json`: integrity 696/696.

### Заметка (вне аудита безопасности)

`npm run type-check` может давать пре-существующие ошибки строгого `noUncheckedIndexedAccess`, которые `astro build` не ловит; шаг `type-check` в CI из-за этого может быть красным. К безопасности не относится.
