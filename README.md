# .core / .ядро

> кузница проектов.

Персональный портфолио‑сайт под зонтиком бренда **DotCore** — точка сбора и витрина всех моих
проектов: [DotSound](https://github.com/network-user/DotSoundBackend),
[DotMathBot](https://github.com/network-user/DotMathBot) и других.

В UI бренд **никогда** не пишется как «DotCore»: только `.core` (EN) или `.ядро` (RU).
`DotCore` живёт только в коде, репозитории и метаданных.

## Стек

- **Фреймворк:** [Astro 4](https://astro.build) + React 18 islands (статика для скорости/SEO,
  React только для интерактивных компонентов)
- **Язык:** TypeScript strict
- **Стили:** чистый CSS + custom properties в `src/styles/tokens.css` (без Tailwind, как в DotSound),
  Liquid Glass / Frutiger‑Aero блики
- **Анимации:** `framer-motion` + `lenis` (smooth scroll); полное уважение `prefers-reduced-motion`
- **i18n:** встроенный Astro i18n, авто‑детект `navigator.language` → `localStorage` → toggle
- **Шрифты:** Inter Variable (selfhosted в `/public/fonts/`) + system‑ui cascade (SF Pro / Roboto)
- **Конфиг:** `.env` + Zod‑валидация на build‑time, обфускация email на клиенте
- **Деплой:** Cloudflare Pages, CI/CD через GitHub Actions

## Айдентика

Палитра монохромная, токены копируются один в один из DotSound:

| Токен | Значение | Назначение |
|-------|----------|-----------|
| `--bg` | `#0A0A0A` | основной фон |
| `--surface` | `#1A1A1A` | поверхности |
| `--text` | `#FFFFFF` | основной текст |
| `--text-secondary` | `#A0A0A0` | вторичный текст |
| `--accent` | `#FFFFFF` | акцент = белый |

Подробности — [`src/styles/tokens.css`](src/styles/tokens.css).

## Запуск

```bash
nvm use            # Node 20 LTS
npm install
cp .env.example .env   # отредактируй своими данными
npm run dev        # http://localhost:4321
```

### Команды

| Скрипт | Что делает |
|--------|------------|
| `npm run dev` | dev‑сервер с HMR |
| `npm run build` | production‑билд в `dist/` |
| `npm run preview` | локальный preview production‑билда |
| `npm run type-check` | `astro check` + `tsc --noEmit` |
| `npm run lint` | ESLint, fail on warnings |
| `npm run lint:fix` | ESLint с авто‑фиксом |
| `npm run format` | Prettier write |

## Конфигурация и секреты

Все личные данные (имя, email, соцсети, фото, домен) живут в `.env`, который **никогда не
коммитится**. См. `.env.example` для шаблона.

- `PUBLIC_*` — попадают в HTML/JS и видны любому посетителю продакшен‑сайта (по дизайну).
- Без префикса — только server / build‑time, никогда не появляются в bundle.
- `AUTHOR_EMAIL` — обфусцируется на клиенте (base64), отсутствует в plain HTML.
- Приватные ассеты (фото) — папка `public/people/` в `.gitignore`.

На CI значения из `.env` материализуются из **GitHub Actions secrets** перед билдом.

## Структура

```
src/
├─ pages/              # Astro-страницы (роутинг)
├─ layouts/            # базовый layout
├─ components/         # .astro + React-острова
├─ content/
│   ├─ projects/       # JSON-описания проектов
│   └─ i18n/           # ru.json / en.json
├─ styles/             # tokens.css, global.css, glass.css
└─ lib/                # config (Zod), i18n, motion, contacts
```

## Лицензия

MIT — см. [LICENSE](LICENSE).
