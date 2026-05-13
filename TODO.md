# TODO

Дорожная карта `.core` / `.ядро`.

## Новые проекты на витрину

- [ ] **DotAgents** — Telegram‑мост для AI coding‑агентов (Cursor, Claude Code, cursor‑agent).
  - Repo: <https://github.com/network-user/DotAgents>
  - Стек: Python 3.12 + aiogram 3 + FastAPI + SQLite, CLI `dotagents`, MIT
  - Статус апстрима: working beta, Stage 1+2 готовы, Stage 3 (MCP, voice→Whisper, ACP) в roadmap
  - Что нужно: добавить `src/content/projects/dotagents.json` + обложку
    в `public/projects/dotagents/cover.webp`

- [ ] **DotWorkBot** («Гусь работа») — Telegram‑бот для подбора разовой рабочей силы.
  - Repo: <https://github.com/network-user/DotWorkBot>
  - Стек: Python 3.11 + aiogram 3 + PostgreSQL + Redis + taskiq + Alembic, Docker, CI/CD
  - Статус: готовый к продакшену MVP, 62 теста, скрипты деплоя на VPS
  - Что нужно: `src/content/projects/dotworkbot.json` + обложка

## Контент

- [ ] Заменить плейсхолдеры в `.env` реальными значениями (имя, фото, email, соцсети, домен).
- [ ] Сделать реальные обложки проектов в `public/projects/{slug}/cover.webp` (1600×900, монохром,
      Liquid Glass треатмент в духе DotSound).
- [ ] Снять/нарисовать OG‑image 1200×630 для соцсетей.
- [ ] Перевести все строки на английский (`src/content/i18n/en.json`).
- [ ] Добавить детальные case‑страницы под все проекты (`src/pages/projects/*.astro`).

## Технические

- [x] ~~Заменить Google Fonts `@import` на selfhosted~~ — сделано через
      `@fontsource-variable/inter` (npm), шрифт попадает в bundle при билде.
- [ ] Добавить PWA manifest + service worker для offline‑кеша главной страницы.
- [ ] Подключить self‑hosted Plausible или Umami (без cookies, GDPR‑friendly).
- [ ] Настроить custom domain в Cloudflare Pages (`dotcore.app` или другое).
- [ ] Sitemap.xml + robots.txt.

## Возможные расширения

- [ ] Blog / Devlog раздел (Astro Content Collections + Markdown).
- [ ] RSS‑фид.
- [ ] Light theme (опционально, сейчас принципиально только dark — как DotSound).
- [ ] Контактная форма через Cloudflare Pages Functions / Workers (POST → Telegram / Email).
- [ ] Page transitions через Astro View Transitions API.

## Безопасность

- [ ] Включить CSP‑заголовки через `_headers` файл для Cloudflare Pages.
- [ ] Subresource integrity для внешних шрифтов (если останутся).
- [ ] Rate‑limit на форму обратной связи (если появится).
