import { defineConfig } from "astro/config";
import react from "@astrojs/react";

// https://astro.build/config
export default defineConfig({
  site: process.env.PUBLIC_DOMAIN || "https://dotcore.pages.dev",
  trailingSlash: "never",
  prefetch: {
    prefetchAll: true,
    defaultStrategy: "viewport",
  },
  i18n: {
    defaultLocale: "ru",
    locales: ["ru", "en"],
    routing: {
      prefixDefaultLocale: false,
      redirectToDefaultLocale: false,
    },
    fallback: {
      en: "ru",
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
