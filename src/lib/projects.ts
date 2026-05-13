/**
 * projects.ts — загрузка и типизация проектов из `content/projects/*.json`.
 *
 * Используем `import.meta.glob` от Vite для статического импорта всех JSON.
 * Это работает и в SSR (Astro pages), и в островах при необходимости.
 */

import type { Locale } from "./i18n";

export interface ProjectRepo {
  name: string;
  url: string;
  role?: string;
  description?: { ru: string; en: string };
}

export interface ProjectLinks {
  domain?: string;
  docs?: string;
  telegram?: string;
}

export type ProjectCategory = "platform" | "bot" | "tool" | "site" | "library";
export type ProjectStatus = "active" | "wip" | "beta" | "archived";

export interface Project {
  id: string;
  slug: string;
  name: { ru: string; en: string };
  brand: { ru: string; en: string };
  tagline: { ru: string; en: string };
  description: { ru: string; en: string };
  stack: ReadonlyArray<string>;
  category: ProjectCategory;
  status: ProjectStatus;
  /** Год запуска (для timeline). */
  year?: number;
  repos: ReadonlyArray<ProjectRepo>;
  links?: ProjectLinks;
  /** Путь к обложке, относительный (`/projects/<slug>/cover.webp`) или абсолютный URL. */
  cover?: string;
  /** Если true — проект показывается в TODO разделе как «скоро». */
  comingSoon?: boolean;
}

const modules = import.meta.glob<{ default: Project }>(
  "../content/projects/*.json",
  { eager: true },
);

/** Все проекты, отсортированные по `year` (новые сверху), затем по `slug`. */
export const projects: ReadonlyArray<Project> = Object.values(modules)
  .map((m) => m.default)
  .filter((p): p is Project => Boolean(p && p.slug))
  .sort((a, b) => {
    const ay = a.year ?? 0;
    const by = b.year ?? 0;
    if (by !== ay) return by - ay;
    return a.slug.localeCompare(b.slug);
  });

export function findProject(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug);
}

export function projectName(p: Project, locale: Locale): string {
  return p.name[locale] ?? p.name.ru;
}

export function projectBrand(p: Project, locale: Locale): string {
  return p.brand[locale] ?? p.brand.ru;
}

export function projectTagline(p: Project, locale: Locale): string {
  return p.tagline[locale] ?? p.tagline.ru;
}

export function projectDescription(p: Project, locale: Locale): string {
  return p.description[locale] ?? p.description.ru;
}
