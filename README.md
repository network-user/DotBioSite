# .core / .ядро

<p>
  <img src="https://img.shields.io/badge/Node.js-20%2B-339933?style=flat" alt="Node.js" />
  <img src="https://img.shields.io/badge/Platform-Web-555?style=flat" alt="Platform" />
  <img src="https://img.shields.io/badge/Category-Portfolio-orange?style=flat" alt="Category" />
  <!-- loc:start --><img src="https://img.shields.io/badge/lines_of_code-30879-lightgrey?style=flat" alt="30879 lines of code" /><!-- loc:end -->
</p>

<img src="docs/cover.svg" width="720" alt=".ядро" />

<!-- audit:start -->
<p>
  <a href="docs/audit/latest.md"><img src="https://img.shields.io/badge/security_audit-passed_with_warnings-dbab09?style=flat" alt="security audit passed with warnings - full, leaks + code" /></a>
  <a href="docs/audit/2026-07-01-iron-quill.md"><img src="https://img.shields.io/badge/date-2026--07--01-555?style=flat" alt="audit date" /></a>
</p>
<!-- audit:end -->

Персональный портфолио-сайт под брендом **DotCore**: витрина продуктов, которые автор доводит от идеи до продакшена (DotSound, DotLearn, DotAgents, DotWorkBot, DotMathBot). Сайт статический (Astro SSG, ноль рантайм-фреймворков): интерактив - точечный vanilla-JS, всё уважает `prefers-reduced-motion`. Личные данные не лежат в репозитории - они приходят из `.env` с Zod-валидацией на build-time, а на CI материализуются из GitHub Actions secrets.

В UI бренд **никогда** не пишется как «DotCore»: только `.core` (EN) или `.ядро` (RU). `DotCore` живёт лишь в коде, репозитории и метаданных.

## Что внутри

- **5 проектов на витрине**: dotsound, dotlearn, dotagents, dotworkbot, dotmathbot. Каждый - JSON в `src/content/projects/`, порядок задаёт `FEATURED_ORDER` в `src/lib/projects.ts`.
- **Case-страницы**: у каждого проекта детальная страница (`/projects/<slug>`) с интерактивной signature-визуализацией, диаграммой архитектуры, таймлайном и разбором инженерных решений.
- **Две локали**: русский (дефолт, без префикса) и английский (`/en`), зеркальные маршруты, авто-детект `navigator.language` → `localStorage` → toggle.
- **Монохромная система**: токены в `src/styles/tokens.css`, near-black + лента серых + off-white, единственный «акцент» - белый свет.
- **Конфиг как контракт**: Zod-схема в `src/lib/config.ts` валидирует env на билде; отсутствие обязательной переменной валит сборку, опциональные деградируют в UI (нет фото - монограмма, пустая соцсеть - ссылка не рендерится).

## Запуск

```bash
nvm use            # Node 20 LTS (.nvmrc)
npm install
git config core.hooksPath .githooks   # secret-guard перед коммитом
cp .env.example .env   # заполни своими данными
npm run dev        # http://localhost:4321
```

Сайт работает и без `.env`: Zod-схема подставит дефолты, UI плавно деградирует. Заполни переменные, чтобы появились имя, фото, соцсети и ссылки на репозитории проектов.

## Команды

| Команда                | Назначение                                   |
| ---------------------- | -------------------------------------------- |
| `npm run dev`          | dev-сервер Astro с HMR (`:4321`)             |
| `npm run build`        | production-билд в `dist/`                    |
| `npm run preview`      | локальный preview собранного `dist/`         |
| `npm run type-check`   | `astro check` + `tsc --noEmit`               |
| `npm run lint`         | ESLint, падает на любом warning              |
| `npm run lint:fix`     | ESLint с авто-фиксом                         |
| `npm run format`       | Prettier write по `ts/tsx/astro/css/json/md` |
| `npm run format:check` | Prettier check без записи                    |

## Стек

<p>
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Astro-BC52EE?style=for-the-badge&logo=astro&logoColor=white" alt="Astro" />
  <img src="https://img.shields.io/badge/Zod-3E67B1?style=for-the-badge" alt="Zod" />
  <img src="https://img.shields.io/badge/ESLint-4B32C3?style=for-the-badge&logo=eslint&logoColor=white" alt="ESLint" />
  <img src="https://img.shields.io/badge/Prettier-F7B93E?style=for-the-badge&logo=prettier&logoColor=black" alt="Prettier" />
  <img src="https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white" alt="GitHub Actions" />
  <img src="https://img.shields.io/badge/Caddy-1F88C0?style=for-the-badge" alt="Caddy" />
</p>

Без UI-фреймворка в рантайме (`integrations: []`): только `.astro` + точечный vanilla-JS. Шрифты selfhosted через `@fontsource-variable` (Bricolage Grotesque + Inter).

## Конфигурация

Все личные данные живут в `.env` (gitignored). Имена переменных - в Zod-схеме `src/lib/config.ts`.

- `PUBLIC_*` (`PUBLIC_DOMAIN`, `PUBLIC_GITHUB_USER`, `PUBLIC_AUTHOR_NAME_RU/EN`, `PUBLIC_SOCIAL_*` и др.) попадают в bundle и видны посетителю - по дизайну.
- `AUTHOR_EMAIL` - без префикса, поэтому не уходит в bundle как plain-text `mailto:`/строка. На билде кодируется в base64 от перевёрнутой строки (атрибут `data-e`) и декодируется на клиенте по клику. Это обфускация от наивных скраперов, а не сокрытие: адрес тривиально восстановим в браузере, считай его фактически публичным.
- Приватное фото кладётся в `public/people/` (gitignored); на CI подтягивается из секрета по URL.

Не коммить `.env`. Шаблон переменных - в `.env.example`.

## Деплой

Self-hosted сервер: сборка происходит прямо на нём (`git pull` → `npm run build`), раздаёт готовый `dist/` **Caddy** с авто-HTTPS - см. `deploy/README.md`. `deploy/setup.sh` - разовая установка сервера, `deploy/update.sh` - пересборка и редеплой. GitHub Actions (`.github/workflows/deploy.yml`) на `push` в `main`: gate (`lint` → `type-check` → `build`), затем по SSH запускает `deploy/update.sh` на сервере (доступ настраивается один раз через `deploy/ci-setup.sh`). `pull_request` - только gate, без деплоя.

## Архитектура

Статический сайт на Astro: контент-driven, без рантайм-фреймворков. Страницы и компоненты - `.astro`; данные проектов и переводы - типизированный JSON, загружаемый через Vite `import.meta.glob`. Конфигурация валидируется Zod один раз при импорте модуля, поэтому невалидная среда роняет билд, а не прод.

```
DotBioSite/
├── src/
│   ├── pages/              # роутинг: index + /en + /projects/[slug] + robots/sitemap
│   ├── layouts/            # BaseLayout
│   ├── components/         # .astro: hero, projects, case/*, diagram/*, illustration/*
│   ├── content/
│   │   ├── projects/       # 5 JSON-описаний проектов
│   │   └── i18n/           # ru.json / en.json
│   ├── styles/             # tokens.css, global.css, glass.css
│   └── lib/                # config (Zod), i18n, projects, contacts
├── public/                 # favicon, OG, manifest, _headers, обложки проектов
├── scripts/                # parse-lh.cjs (разбор Lighthouse-отчёта)
├── deploy/                 # setup.sh/update.sh/ci-setup.sh/harden.sh, Caddyfile.tmpl
├── .github/workflows/      # deploy.yml (gate + SSH-триггер update.sh) + security.yml
└── astro.config.mjs
```

- **Бренд в UI** - только `.core` / `.ядро`, никогда «DotCore».
- **Static-first**: `integrations: []`, ноль рантайм-фреймворков; интерактив - vanilla-JS, всё под `prefers-reduced-motion`.
- **Конфиг через Zod**: обязательная env отсутствует → билд падает; опциональная → graceful fallback в UI.
- **Контент - данные**: проекты и переводы в `src/content/*`, типы и порядок витрины в `src/lib/projects.ts`.
- **i18n**: `ru` (дефолт, без префикса) + `en` (`/en`), зеркальные страницы.
- **Секреты**: только в `.env` / GitHub Actions secrets; приватные ассеты в gitignored `public/people/`.

## Лицензия

© 2026 DotCore. Все права защищены.

Проприетарный код. Использование, копирование, изменение и распространение запрещены без письменного разрешения автора. Исходный код открыт только для ознакомления. См. [LICENSE](LICENSE).
