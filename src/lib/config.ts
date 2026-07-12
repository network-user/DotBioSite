/**
 * config.ts: типизированный парсинг и валидация переменных окружения.
 *
 * Стратегия:
 *   1) `import.meta.env` доступен и в Astro pages (build-time), и в React-островах
 *      (через PUBLIC_-префикс).
 *   2) Zod-схема выполняется ОДИН РАЗ при импорте модуля. Если обязательная
 *      переменная отсутствует, билд падает с понятной ошибкой.
 *   3) Все опциональные поля имеют дефолты с graceful fallback в UI:
 *      пустая соцсеть → ссылка не рендерится, пустое фото → монограмма и т.д.
 *
 * NB: переменные БЕЗ префикса PUBLIC_ (AUTHOR_EMAIL) недоступны в клиентском
 *     bundle: Vite заменит их на `undefined`. Поэтому email декодируется на
 *     этапе билда через emailB64 (контакт-кнопка получает base64-строку).
 */

import { z } from "zod";

const emptyUrl = z.literal("");
const urlOrEmpty = z.string().url().or(emptyUrl);

const schema = z.object({
  PUBLIC_DOMAIN: z.string().url().default("https://dotcore.pages.dev"),
  // Пустые дефолты: сайт работает как шаблон, не привязанный к конкретному
  // GitHub-аккаунту. Заполни в .env, чтобы появились ссылки на репозиторий
  // в футере и автоматически собрались URL'ы репо проектов в карточках.
  PUBLIC_GITHUB_USER: z.string().default(""),
  PUBLIC_GITHUB_REPO: z.string().default(""),

  PUBLIC_AUTHOR_NAME_RU: z.string().min(1).default(".ядро"),
  PUBLIC_AUTHOR_NAME_EN: z.string().min(1).default(".core"),
  PUBLIC_AUTHOR_PHOTO: z.string().default(""),
  PUBLIC_AUTHOR_BIO_RU: z.string().default(""),
  PUBLIC_AUTHOR_BIO_EN: z.string().default(""),

  PUBLIC_SOCIAL_GITHUB: urlOrEmpty.default(""),
  PUBLIC_SOCIAL_TELEGRAM: urlOrEmpty.default(""),
  PUBLIC_SOCIAL_LINKEDIN: urlOrEmpty.default(""),
  PUBLIC_SOCIAL_X: urlOrEmpty.default(""),
  PUBLIC_SOCIAL_VK: urlOrEmpty.default(""),

  AUTHOR_EMAIL: z.string().email().or(emptyUrl).default(""),

  // Аналитика (Umami, self-hosted). Пустой website id → трекер не подключается
  // (локальная разработка, preview, CI). Значение получаешь в дашборде Umami
  // (Settings → Websites → Website ID) и кладёшь в .env на проде.
  PUBLIC_UMAMI_WEBSITE_ID: z.string().default(""),
  // URL трекер-скрипта. По умолчанию first-party путь через Caddy контейнера
  // (deploy/Caddyfile.container): /stats/script.js и /stats/api/send идут на
  // контейнер umami, поэтому CSP не ослабляется (script/connect остаются 'self')
  // и ad-block реже режет запрос. Можно указать абсолютный URL поддомена.
  PUBLIC_UMAMI_SRC: z.string().default("/stats/script.js"),
});

/** Безопасно парсим: собираем только нужные ключи, остальные игнорируем. */
function pickEnv(): Record<string, string> {
  const env = import.meta.env as unknown as Record<string, string | undefined>;
  const keys = Object.keys(schema.shape);
  const out: Record<string, string> = {};
  for (const k of keys) {
    const v = env[k];
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

const parsed = schema.safeParse(pickEnv());

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
  throw new Error(
    `[.core/config] Invalid environment variables:\n${issues}\n\n` +
      `Hint: copy .env.example to .env and fill in the values.`,
  );
}

export const config = parsed.data;
export type Config = typeof config;

/**
 * Полный объект переменных окружения (build-time). В отличие от `config` с
 * фиксированной Zod-схемой, здесь читаем динамические ключи `PUBLIC_REPO_*`:
 * по одному URL на репозиторий проекта. Доступ по ключу безопасен: сайт
 * собирается статически, и Vite кладёт все PUBLIC_-переменные в `import.meta.env`.
 */
const rawEnv = import.meta.env as unknown as Record<string, string | undefined>;

/**
 * Имя env-переменной с URL репозитория по его GitHub-идентификатору
 * (`repo.repo ?? repo.name`): верхний регистр, не-буквенно-цифровые → `_`,
 * крайние `_` срезаются. Схема обязана совпадать с ключами в `.env.example`.
 * Примеры: «DotSoundBackend» → `PUBLIC_REPO_DOTSOUNDBACKEND`,
 *          «dotcore-skills» → `PUBLIC_REPO_DOTCORE_SKILLS`.
 */
export function repoEnvKey(repoIdent: string): string {
  const slug = repoIdent
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `PUBLIC_REPO_${slug}`;
}

/**
 * URL репозитория из env по его идентификатору. Пустая строка, если переменная
 * не задана, тогда `repoUrl()` падает дальше на сборку из `PUBLIC_GITHUB_USER`.
 */
export function repoUrlOverride(repoIdent: string): string {
  const v = rawEnv[repoEnvKey(repoIdent)];
  return typeof v === "string" ? v : "";
}

export type ProjectLinkKind = "domain" | "telegram";

/**
 * Имя env-переменной с явной ссылкой проекта (сайт/telegram-бот) по её типу и
 * project slug. Тот же принцип, что и `repoEnvKey`, но ключ: сам slug проекта
 * (он уже стабилен и уникален), а не производное от репозитория.
 * Пример: ("domain", "dotsound") → `PUBLIC_LINK_DOMAIN_DOTSOUND`.
 */
export function projectLinkEnvKey(kind: ProjectLinkKind, slug: string): string {
  const slugKey = slug
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `PUBLIC_LINK_${kind.toUpperCase()}_${slugKey}`;
}

/**
 * Ссылка проекта (сайт/telegram) из env. Пустая строка, если не задана, тогда
 * компонент падает на `project.links?.[kind]` из JSON.
 */
export function projectLinkOverride(kind: ProjectLinkKind, slug: string): string {
  const v = rawEnv[projectLinkEnvKey(kind, slug)];
  return typeof v === "string" ? v : "";
}

/** Все соцсети в фиксированном порядке, включая незаполненные (url: ""). */
export const allSocials: ReadonlyArray<{ id: SocialId; url: string }> = (
  [
    ["github", config.PUBLIC_SOCIAL_GITHUB],
    ["telegram", config.PUBLIC_SOCIAL_TELEGRAM],
    ["linkedin", config.PUBLIC_SOCIAL_LINKEDIN],
    ["x", config.PUBLIC_SOCIAL_X],
    ["vk", config.PUBLIC_SOCIAL_VK],
  ] as const
).map(([id, url]) => ({ id, url }));

/** Только заполненные соцсети - для реальных ссылок (JSON-LD sameAs, портрет). */
export const socials: ReadonlyArray<{ id: SocialId; url: string }> = allSocials.filter(
  (s) => s.url.length > 0,
);

export type SocialId = "github" | "telegram" | "linkedin" | "x" | "vk";

/** Имя автора по локали с graceful fallback. */
export function authorName(locale: "ru" | "en"): string {
  return locale === "ru" ? config.PUBLIC_AUTHOR_NAME_RU : config.PUBLIC_AUTHOR_NAME_EN;
}

/**
 * Вордмарк сайта (".ядро" / ".core") для Hero. Не читает PUBLIC_AUTHOR_NAME_*,
 * поэтому не переопределяется env-значениями, заданными для имени автора
 * (About/JSON-LD) - на главной всегда одно и то же слово.
 */
export function siteBrand(locale: "ru" | "en"): string {
  return locale === "ru" ? ".ядро" : ".core";
}

/** Био по локали (может быть пустым). */
export function authorBio(locale: "ru" | "en"): string {
  return locale === "ru" ? config.PUBLIC_AUTHOR_BIO_RU : config.PUBLIC_AUTHOR_BIO_EN;
}

/** Монограмма из имени (для случая, когда фото не задано). */
export function authorMonogram(locale: "ru" | "en"): string {
  const name = authorName(locale);
  const words = name
    .replace(/^[^\p{L}]+/u, "")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "·";
  if (words.length === 1) return (words[0]?.slice(0, 2) ?? "").toUpperCase();
  return ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? "")).toUpperCase();
}

/** Конфиг трекера Umami для вставки в <head>. */
export interface UmamiConfig {
  websiteId: string;
  src: string;
  hostUrl: string;
  domains: string;
}

/**
 * Конфиг трекера Umami или null, когда website id не задан (локальная разработка,
 * preview, CI): скрипт не рендерится, событий нет.
 *
 * hostUrl = каталог трекер-скрипта на нашем домене, чтобы события уходили на тот
 * же first-party путь (`${hostUrl}/api/send` через прокси Caddy), а не на голый
 * origin, где ручки нет. Для абсолютного src берётся его директория как есть.
 * domains ограничивает отправку продакшн-хостом: даже с заданным id локальная
 * сборка и preview не засоряют статистику чужими событиями.
 */
export function umami(): UmamiConfig | null {
  const websiteId = config.PUBLIC_UMAMI_WEBSITE_ID.trim();
  if (!websiteId) return null;
  const src = config.PUBLIC_UMAMI_SRC.trim() || "/stats/script.js";
  const dir = src.replace(/\/[^/]*$/, "") || "/";
  const hostUrl = new URL(dir, config.PUBLIC_DOMAIN).toString().replace(/\/$/, "");
  const domains = new URL(config.PUBLIC_DOMAIN).host;
  return { websiteId, src, hostUrl, domains };
}
