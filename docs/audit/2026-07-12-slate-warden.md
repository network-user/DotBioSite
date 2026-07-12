# Security Audit · Slate Warden · 2026-07-12

| Поле    | Значение              |
| ------- | --------------------- |
| Статус  | PASSED                |
| Прогон  | slate-warden          |
| Уровень | medium                |
| Охват   | leaks + code (дельта) |
| Модель  | Claude Fable 5        |
| Дата    | 2026-07-12            |

Повторный аудит после SEO-слоя (дельта 53e136e..HEAD): эндпоинты `llms.txt.ts`/`llms-full.txt.ts`/`robots.txt.ts`, `sitemap.xml.ts` с git-датами, `404.astro`, PNG-пайплайн OG (`scripts/render-og.mjs`, `og-jobs.mjs`, devDependency `@resvg/resvg-js`), CI-чеки (`check-og-fresh.mjs`, `seo-smoke.mjs`, шаг `seo:check` в deploy.yml), правки `BaseLayout.astro` (JSON-LD, мета) и `astro.config.mjs` (loadEnv). Уровень средний: трек A по всему working tree, трек B семантически по дельте + скрипты/CI/зависимости, веер из 3 подагентов. История git не перегонялась: полный скан был 2026-07-02 (onyx-sentinel), gitleaks в CI сканирует полную историю на каждом push. Supersedes снимок `2026-07-02-onyx-sentinel.md`.

## Сводка

| Измерение                  | Находки                                                                       |
| -------------------------- | ----------------------------------------------------------------------------- |
| Трек A · Секреты/ключи     | 0 (единственный grep-match: сами паттерны детектора в pre-commit хуке)        |
| Трек A · .env/gitignore    | 0 (в git только `.env.example`; `.env*`, `public/people/` игнорируются)       |
| Трек A · PII/machine-paths | 0 (email обфусцирован server-side, IP в кейсе DotTraceIP: демо/RFC 5737)      |
| Трек B · Инъекции/exec/XSS | 0 эксплуатируемых; shell-вызов в sitemap закрыт в этом же цикле (см. ниже)    |
| Трек B · Эндпоинты SEO     | 0 (ld+json `<`-escaping достаточен, Astro авто-экранирует атрибуты)           |
| Трек B · Скрипты/CI        | 0 Crit/High (SHA-пины подлинны, permissions минимальны, fork-PR без секретов) |
| Трек B · Зависимости       | lock 709/709 integrity + npmjs.org; advisories только dev/build-пути → Low    |

**Severity:** Crit 0 · High 0 · Med 0 · Low 5 · Info ~9
**Готовность:** 9/10
**Вердикт:** PASSED

Гейт пройден: ни одного Critical/High/Medium. `npm audit` формально показывает 2 high / 5 moderate (astro/vite/esbuild/yaml), но все advisory лежат на dev-сервере и SSR-путях; прод отдаёт статический `dist/` через Caddy, уязвимые пути не исполняются. Классификация Low сохранена с прошлого прогона.

### Ремедиация этого цикла (закрыто)

- `src/pages/sitemap.xml.ts`: build-time `execSync` с интерполяцией путей в shell-строку заменён на `execFileSync("git", [...paths])` с массивом аргументов; путь от slug больше не проходит через shell даже теоретически. Ambient-типы `src/env.d.ts` обновлены. Коммит `d4b320f`, все гейты (lint/type-check/build/seo:check) зелёные.

## Находки

| Severity | Категория         | Файл:строка                                                                            | Описание                                                                                                                              | Рекомендация                                                                                                  |
| -------- | ----------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Low      | known-vuln (dev)  | `package-lock.json` (astro/vite/esbuild/yaml)                                          | Advisories 2 high / 5 moderate: dev-сервер, SSR, type-check; в статическом `dist/` кода нет                                           | Не гонять `astro dev`/`preview` на публичных интерфейсах; закрытие astro-ветки = мажор 4→6, отдельной задачей |
| Low      | network / TOFU    | `.github/workflows/deploy.yml:72`                                                      | `ssh-keyscan` при каждом деплое доверяет ключу хоста (MITM между раннером и VPS не детектируется)                                     | Пинить host key секретом `DEPLOY_HOST_KEY` и писать в known_hosts вместо live-скана                           |
| Low      | pattern-gap       | `.githooks/pre-commit:17`                                                              | Шаблоны `.env`, `.env.*` без `*/` матчат только корень: `deploy/.env` прошёл бы файловый фильтр (страхуют контентный grep и gitleaks) | Добавить `*/.env`, `*/.env.*` в case                                                                          |
| Low      | weak-csp          | `public/_headers`, `deploy/Caddyfile.*`                                                | `style-src 'unsafe-inline'` (вынужденно из-за `inlineStylesheets: "always"`) и широкий `img-src https:`                               | Приемлемо для статики; при желании nonce/hash для стилей и сужение img-src                                    |
| Low      | least-priv        | `deploy/update.sh:28`                                                                  | `npm ci` + `build` на VPS от root (перенос с прошлого прогона; смягчено integrity-lock)                                               | Собирать под непривилегированным пользователем                                                                |
| Info     | robustness        | `.github/workflows/deploy.yml:13`                                                      | `cancel-in-progress: true` может оборвать SSH-шаг посреди удалённой пересборки                                                        | Исключить cancel для push или принять (bind-mount отдаёт старый dist)                                         |
| Info     | cache-policy      | `public/_headers` vs `deploy/Caddyfile.*`                                              | `_headers` кэширует `/llms*.txt`, `@shortcache` в Caddy их не перечисляет: расхождение путей деплоя                                   | Синхронизировать список @shortcache                                                                           |
| Info     | error-handling    | `scripts/parse-lh.cjs:2`, `scripts/seo-smoke.mjs:354`, `scripts/check-og-fresh.mjs:28` | Голые стектрейсы на битом вводе; exit code ненулевой, для CI корректно                                                                | Опционально: usage-сообщение, `icon?.src`                                                                     |
| Info     | demo-data         | `src/components/case/signature/TraceScan.astro`                                        | IP-адреса в кейсе DotTraceIP: заготовленные демо-данные (в т.ч. RFC 5737 TEST-NET)                                                    | Без изменений                                                                                                 |
| Info     | pii (intentional) | `src/lib/contacts.ts`                                                                  | Email: base64 от перевёрнутой строки, server-side (`AUTHOR_EMAIL` без `PUBLIC_`), намеренно публичный контакт                         | Без изменений                                                                                                 |

Улики маскированы; значения секретов не приводятся. Незакоммиченные на момент прогона правки пользователя (`Hero.astro`, `global.css`) проверены: чистое удаление декоративной анимации, секретов/PII нет.
