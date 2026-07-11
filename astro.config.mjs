import { defineConfig } from "astro/config";
import { loadEnv } from "vite";

// loadEnv читает .env тем же способом, что и Vite в рантайме (import.meta.env в
// src/lib/config.ts): без этого astro.config видел PUBLIC_DOMAIN только если он
// был экспортирован в окружение процесса, а не просто задан в .env-файле.
const env = loadEnv(process.env.NODE_ENV ?? "production", process.cwd(), "PUBLIC_");

// https://astro.build/config
export default defineConfig({
  site: env.PUBLIC_DOMAIN || process.env.PUBLIC_DOMAIN || "https://dotcore.pages.dev",
  // "ignore": оба варианта URL валидны (`/en` и `/en/`). С "never" Astro отдавал
  // 404 на `/en/` в dev-режиме, что ломало UX. Cloudflare Pages самостоятельно
  // нормализует URL в проде, так что "ignore" здесь безопасно.
  trailingSlash: "ignore",
  devToolbar: {
    enabled: false,
  },
  prefetch: {
    prefetchAll: true,
    // "viewport" префетчил КАЖДУЮ ссылку, попавшую в кадр при скролле: десятки
    // фоновых fetch+parse конкурировали со скроллом. "hover" грузит страницу по
    // наведению/фокусу/touchstart (за миг до клика), навигация так же мгновенна,
    // но во время прокрутки фоновой работы нет.
    defaultStrategy: "hover",
  },
  i18n: {
    defaultLocale: "ru",
    locales: ["ru", "en"],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  integrations: [],
  build: {
    inlineStylesheets: "always",
    assets: "_assets",
  },
  compressHTML: true,
});
