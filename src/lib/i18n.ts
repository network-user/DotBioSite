/**
 * i18n.ts — резолвер локалей и translator.
 *
 * Стратегия определения локали (повторяет DotSound):
 *   1) Явный URL-префикс (`/en/...` → en, иначе `ru`).
 *   2) Клиентский авто-детект для редиректа: localStorage → navigator.language.
 *      Применяется только если URL-префикса нет и пользователь зашёл впервые.
 *
 * Серверный код (Astro pages, layouts) использует resolveLocale(url) +
 * useTranslations(locale). Клиентские острова получают t() через пропсы.
 */

import ruDict from "../content/i18n/ru.json";
import enDict from "../content/i18n/en.json";

export const LOCALES = ["ru", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "ru";

const DICTS: Record<Locale, unknown> = {
  ru: ruDict,
  en: enDict,
};

/** Извлекает локаль из Astro `URL` или path. */
export function resolveLocale(input: URL | string): Locale {
  const path = typeof input === "string" ? input : input.pathname;
  if (path.startsWith("/en/") || path === "/en") return "en";
  return "ru";
}

/** Префикс URL для локали: `""` для default, `"/en"` иначе. */
export function localePrefix(locale: Locale): string {
  return locale === DEFAULT_LOCALE ? "" : `/${locale}`;
}

/** Альтернативный URL для второй локали (для language toggle). */
export function alternateUrl(currentUrl: URL, targetLocale: Locale): string {
  const path = currentUrl.pathname;
  const stripped = path.startsWith("/en/")
    ? path.slice(3)
    : path === "/en"
      ? "/"
      : path;
  return `${localePrefix(targetLocale)}${stripped}` || "/";
}

/** Возвращает значение по dotted-path: `"hero.title"` → строка/объект. */
function getByPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

export type Translator = <T = string>(key: string, fallback?: T) => T;

/** Возвращает t-функцию, забинженную к словарю выбранной локали. */
export function useTranslations(locale: Locale): Translator {
  const dict = DICTS[locale] ?? DICTS[DEFAULT_LOCALE];
  return <T = string>(key: string, fallback?: T): T => {
    const v = getByPath(dict, key);
    if (v === undefined || v === null) {
      return (fallback ?? (key as unknown as T)) as T;
    }
    return v as T;
  };
}

/** Полный словарь для текущей локали (для передачи в React-острова целиком). */
export function getDict(locale: Locale): Record<string, unknown> {
  return (DICTS[locale] ?? DICTS[DEFAULT_LOCALE]) as Record<string, unknown>;
}
