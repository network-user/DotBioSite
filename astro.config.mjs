import { defineConfig } from "astro/config";
import react from "@astrojs/react";

// https://astro.build/config
export default defineConfig({
  site: process.env.PUBLIC_DOMAIN || "https://dotcore.pages.dev",
  // "ignore" — оба варианта URL валидны (`/en` и `/en/`). С "never" Astro отдавал
  // 404 на `/en/` в dev-режиме, что ломало UX. Cloudflare Pages самостоятельно
  // нормализует URL в проде, так что "ignore" здесь безопасно.
  trailingSlash: "ignore",
  prefetch: {
    prefetchAll: true,
    defaultStrategy: "viewport",
  },
  i18n: {
    defaultLocale: "ru",
    locales: ["ru", "en"],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  integrations: [
    react({
      include: ["**/components/react/**", "**/*.island.tsx"],
    }),
  ],
  build: {
    inlineStylesheets: "auto",
    assets: "_assets",
  },
  compressHTML: true,
});
