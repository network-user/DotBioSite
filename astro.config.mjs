import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  site: process.env.PUBLIC_DOMAIN || "https://dotcore.pages.dev",
  // "ignore" — оба варианта URL валидны (`/en` и `/en/`). С "never" Astro отдавал
  // 404 на `/en/` в dev-режиме, что ломало UX. Cloudflare Pages самостоятельно
  // нормализует URL в проде, так что "ignore" здесь безопасно.
  trailingSlash: "ignore",
  devToolbar: {
    enabled: false,
  },
  prefetch: {
    prefetchAll: true,
    // "viewport" префетчил КАЖДУЮ ссылку, попавшую в кадр при скролле — десятки
    // фоновых fetch+parse конкурировали со скроллом. "hover" грузит страницу по
    // наведению/фокусу/touchstart (за миг до клика) — навигация так же мгновенна,
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
