# .core / .ядро

> кузница проектов.

Персональный портфолио‑сайт под зонтиком бренда **DotCore** — витрина продуктов, которые я довожу
от идеи до продакшена: [DotSound](https://github.com/network-user/DotSoundBackend),
DotLearn, DotAgents, [DotMathBot](https://github.com/network-user/DotMathBot), DotWorkBot.

В UI бренд **никогда** не пишется как «DotCore»: только `.core` (EN) или `.ядро` (RU).
`DotCore` живёт только в коде, репозитории и метаданных.

## Стек

- **Фреймворк:** [Astro 4](https://astro.build) + React 18 islands (статика для скорости/SEO,
  React только для интерактивных компонентов)
- **Язык:** TypeScript strict
- **Стили:** чистый CSS + custom properties в `src/styles/tokens.css` (без Tailwind, как в DotSound),
  мягкие frosted‑стекла поверх монохромного светового поля
- **Анимации:** только CSS + точечный vanilla‑JS (scroll‑reveal, tilt, курсорный свет); полное уважение `prefers-reduced-motion`
- **i18n:** встроенный Astro i18n, авто‑детект `navigator.language` → `localStorage` → toggle
- **Шрифты:** Bricolage Grotesque Variable (display) + Inter Variable (body), selfhosted через `@fontsource`
- **Конфиг:** `.env` + Zod‑валидация на build‑time, обфускация email на клиенте
- **Деплой:** Cloudflare Pages, CI/CD через GitHub Actions

## Айдентика

Палитра строго монохромная: мягкий near‑black, лента серых и off‑white. Цвета нет как приёма;
единственный «акцент» — белый свет, который проявляет структуру.

| Токен              | Значение  | Назначение         |
| ------------------ | --------- | ------------------ |
| `--bg`             | `#0C0D0F` | мягкий near‑black  |
| `--surface`        | `#181A1E` | поверхности        |
| `--text`           | `#F3F3F1` | off‑white текст    |
| `--text-secondary` | `#A6A7AB` | вторичный текст    |
| `--accent`         | `#FFFFFF` | белый свет/акцент  |

Подробности — [`src/styles/tokens.css`](src/styles/tokens.css).

## Запуск

```bash
nvm use            # Node 20 LTS
npm install
cp .env.example .env   # отредактируй своими данными
npm run dev        # http://localhost:4321
```

### Команды

| Скрипт               | Что делает                         |
| -------------------- | ---------------------------------- |
| `npm run dev`        | dev‑сервер с HMR                   |
| `npm run build`      | production‑билд в `dist/`          |
| `npm run preview`    | локальный preview production‑билда |
| `npm run type-check` | `astro check` + `tsc --noEmit`     |
| `npm run lint`       | ESLint, fail on warnings           |
| `npm run lint:fix`   | ESLint с авто‑фиксом               |
| `npm run format`     | Prettier write                     |

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
