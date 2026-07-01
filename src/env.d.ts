/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_DOMAIN?: string;
  readonly PUBLIC_GITHUB_USER?: string;
  readonly PUBLIC_GITHUB_REPO?: string;

  readonly PUBLIC_AUTHOR_NAME_RU?: string;
  readonly PUBLIC_AUTHOR_NAME_EN?: string;
  readonly PUBLIC_AUTHOR_PHOTO?: string;
  readonly PUBLIC_AUTHOR_BIO_RU?: string;
  readonly PUBLIC_AUTHOR_BIO_EN?: string;

  readonly PUBLIC_SOCIAL_GITHUB?: string;
  readonly PUBLIC_SOCIAL_TELEGRAM?: string;
  readonly PUBLIC_SOCIAL_LINKEDIN?: string;
  readonly PUBLIC_SOCIAL_X?: string;
  readonly PUBLIC_SOCIAL_VK?: string;

  readonly AUTHOR_EMAIL?: string;

  /** Явный URL репозитория проекта — один ключ на репо (см. config.repoEnvKey).
   *  Напр. PUBLIC_REPO_DOTSOUNDBACKEND, PUBLIC_REPO_DOTCORE_SKILLS. */
  readonly [key: `PUBLIC_REPO_${string}`]: string | undefined;

  /** Явная ссылка проекта (сайт/telegram) — один ключ на проект+тип ссылки
   *  (см. config.projectLinkEnvKey). Напр. PUBLIC_LINK_DOMAIN_DOTSOUND,
   *  PUBLIC_LINK_TELEGRAM_DOTMATH. */
  readonly [key: `PUBLIC_LINK_${string}`]: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
