# AGENTS.md

> Инструкции для AI coding agents. Человеческий обзор - в [README.md](README.md).
> Перегенерировано скиллом `generate-readme`. Источник правды - код репозитория.

## Профиль проекта

- **Тип:** web-app (Astro SSG, персональный портфолио-сайт)
- **Аудитория:** internal (личный сайт под брендом DotCore)
- **Runtime:** Node.js >=20 (`.nvmrc` = 20)
- **Монорепо:** нет

## Быстрый старт

```bash
nvm use            # Node 20 LTS
npm install
cp .env.example .env   # опционально: без .env работают дефолты Zod
npm run dev        # http://localhost:4321
```

## Сборка и проверки

| Действие  | Команда                                               |
| --------- | ----------------------------------------------------- |
| Установка | `npm install` (CI: `npm ci`)                          |
| Dev       | `npm run dev` (`:4321`)                               |
| Тесты     | нет тестов в репо                                     |
| Lint      | `npm run lint` (ESLint, fail на warning)              |
| Typecheck | `npm run type-check` (`astro check` + `tsc --noEmit`) |
| Format    | `npm run format` / `npm run format:check` (Prettier)  |
| Build     | `npm run build` → `dist/`                             |
| Preview   | `npm run preview`                                     |

Команды - только из `package.json`. Тестового раннера в проекте нет; quality-gate - `lint` + `type-check` (так же гоняет CI перед билдом).

## Структура репозитория

```
src/
├── pages/        # роутинг: index, /en, /projects/[slug], robots.txt.ts, sitemap.xml.ts
├── layouts/      # BaseLayout.astro
├── components/   # .astro: hero/projects/about + case/*, diagram/*, illustration/*
├── content/
│   ├── projects/ # 5 JSON-описаний проектов
│   └── i18n/     # ru.json / en.json
├── styles/       # tokens.css, global.css, glass.css
└── lib/          # config (Zod), i18n, projects, contacts
public/           # favicon, OG, manifest, _headers, public/projects/<slug>/
scripts/          # parse-lh.cjs (разбор Lighthouse JSON)
.github/workflows/deploy.yml   # Cloudflare Pages
astro.config.mjs
```

## Соглашения

- **Язык документации:** русский (README и этот файл).
- **Бренд в UI:** только `.core` (EN) / `.ядро` (RU). Строка «DotCore» допустима лишь в коде, репо и метаданных, не в видимом UI.
- **Стиль кода:** TypeScript strict; ESLint 9 (`eslint-plugin-astro`, `jsx-a11y`) + Prettier (`prettier-plugin-astro`). Двойные кавычки, форматирование - Prettier, не вручную.
- **Стили:** чистый CSS + custom properties в `src/styles/tokens.css`. Без Tailwind. Монохром.
- **Static-first:** `integrations: []` - не добавляй UI-фреймворк в рантайм без запроса. Интерактив - точечный vanilla-JS, обязательно под `prefers-reduced-motion`.
- **Контент:** новый проект - JSON в `src/content/projects/<slug>.json` (тип `Project` в `src/lib/projects.ts`) + обложка `public/projects/<slug>/`; порядок витрины - `FEATURED_ORDER`.
- **i18n:** строки - в `src/content/i18n/{ru,en}.json`; добавляешь в один - добавь в оба.

## Переменные окружения

Имена - из Zod-схемы `src/lib/config.ts`. Значения не читать, `.env` не открывать.

| Переменная                                                              | Назначение                                                      |
| ----------------------------------------------------------------------- | --------------------------------------------------------------- |
| `PUBLIC_DOMAIN`                                                         | канонический домен (site URL, OG)                               |
| `PUBLIC_GITHUB_USER` / `PUBLIC_GITHUB_REPO`                             | сборка ссылок на репозитории проектов                           |
| `PUBLIC_AUTHOR_NAME_RU` / `PUBLIC_AUTHOR_NAME_EN`                       | имя автора по локали                                            |
| `PUBLIC_AUTHOR_PHOTO` / `PUBLIC_AUTHOR_BIO_RU` / `PUBLIC_AUTHOR_BIO_EN` | фото и био (опц.)                                               |
| `PUBLIC_SOCIAL_GITHUB/TELEGRAM/LINKEDIN/X/VK`                           | соцссылки (пустые не рендерятся)                                |
| `AUTHOR_EMAIL`                                                          | без префикса; кодируется в base64 на билде, в bundle не утекает |

`PUBLIC_*` попадают в клиентский bundle (видны посетителю). На CI значения материализуются из GitHub Actions secrets. Не коммить секреты и `.env`.

## Что делать агенту

- Перед правками прочитай затронутые файлы и соседний код.
- После изменений запусти `npm run lint` и `npm run type-check`.
- **README-sync:** при глобальных изменениях (новые/удалённые команды или скрипты, новый/убранный модуль или проект-кейс, смена зависимостей/стека, архитектуры или runtime) обнови `README.md` и `AGENTS.md` через скилл `generate-readme`, включая пересчёт LoC. Мелкие правки (опечатки, внутренний рефактор, багфикс без смены API/команд) README не трогают.
- Не латай разметку README вручную - перегенерируй скиллом.
- Минимальный diff: не рефактори несвязанный код.
- Числа, пути, версии, env-имена - только из репозитория.

## Чего не делать

- Не выдумывать команды, зависимости, env, маршруты.
- Не писать «DotCore» в видимом UI - только `.core` / `.ядро`.
- Не добавлять `<details>`, centered hero, emoji в README.
- Не менять `docs/cover.svg` без регенерации обложки скиллом.
- Не менять `LICENSE` и текст лицензии без явного запроса пользователя.
- Не читать/коммитить `.env`, токены, секреты; приватное фото - в gitignored `public/people/`.
- Не удалять маркеры `<!-- loc:start -->` / `<!-- loc:end -->` в README.
- Не добавлять рантайм UI-фреймворк (React и т.п.) без явного запроса - проект static-first.

## Документация

- [README.md](README.md) - запуск, команды, стек, конфигурация, деплой, архитектура
- `TODO.md` - дорожная карта витрины и технических задач

## DotCore

Проект следует стандарту DotCore: плоский технический README, SVG-обложка, LoC-бейдж, монохром. При запросе «обнови README» используй скилл `generate-readme`.
