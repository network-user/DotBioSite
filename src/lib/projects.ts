/**
 * projects.ts — загрузка и типизация проектов из `content/projects/*.json`.
 *
 * Используем `import.meta.glob` от Vite для статического импорта всех JSON.
 * Это работает и в SSR (Astro pages), и в островах при необходимости.
 */

import type { Locale } from "./i18n";
import { config } from "./config";

export interface ProjectRepo {
  /** Короткое отображаемое имя в карточке (например, "Backend"). */
  name: string;
  /**
   * Имя GitHub-репозитория. Если не задано — берётся `name`. URL собирается
   * как `https://github.com/<PUBLIC_GITHUB_USER>/<repo>`. Указывай явно,
   * когда отображаемое имя отличается от имени репо (например, "Backend" в
   * UI, но `DotSoundBackend` в GitHub).
   */
  repo?: string;
  /**
   * Явный URL репозитория. Перекрывает авто-сборку из `repo`/`name` — полезно
   * для репозиториев под чужим аккаунтом/организацией.
   */
  url?: string;
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

/** Краткая метрика для секции Metrics на case-study странице. */
export interface ProjectMetric {
  value: string;
  unit?: string;
  label: { ru: string; en: string };
}

/** Compact proof points rendered on project cards. */
export interface ProjectHighlight {
  value: string;
  label: { ru: string; en: string };
}

export type ProjectStackGroupKey = "language" | "framework" | "data" | "infra" | "client" | "ml";
export type ProjectStackGroups = Partial<Record<ProjectStackGroupKey, ReadonlyArray<string>>>;

export type ProjectArchitectureNodeIcon =
  | "code"
  | "stack"
  | "rocket"
  | "spark"
  | "telegram"
  | "globe"
  | "user"
  | "dot";

export interface ProjectArchitectureNode {
  id: string;
  x: number;
  y: number;
  label: string;
  icon?: ProjectArchitectureNodeIcon;
  width?: number;
  height?: number;
  emphasis?: "default" | "strong";
}

export type ProjectArchitectureEdgeKind = "sync" | "async" | "data";

export interface ProjectArchitectureEdge {
  from: string;
  to: string;
  kind?: ProjectArchitectureEdgeKind;
  label?: string;
  bend?: number;
}

export interface ProjectCluster {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
}

export interface ProjectCapability {
  icon: ProjectArchitectureNodeIcon;
  title: { ru: string; en: string };
  description: { ru: string; en: string };
}

export interface ProjectEngineeringChoice {
  question: { ru: string; en: string };
  answer: { ru: string; en: string };
}

export interface ProjectTimelineEntry {
  date: string;
  title: { ru: string; en: string };
  description?: { ru: string; en: string };
}

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
  /** Project accent color used for card borders, media glow, and hero treatment. */
  accent?: string;
  /** Short measurable proof points for the project card. */
  highlights?: ReadonlyArray<ProjectHighlight>;
  /** Если true — проект показывается в TODO разделе как «скоро». */
  comingSoon?: boolean;

  // ---------- Расширения для case-study страницы (все опциональны) ----------
  overview?: { ru: ReadonlyArray<string>; en: ReadonlyArray<string> };
  metrics?: ReadonlyArray<ProjectMetric>;
  stackGroups?: ProjectStackGroups;
  architectureNodes?: ReadonlyArray<ProjectArchitectureNode>;
  architectureEdges?: ReadonlyArray<ProjectArchitectureEdge>;
  clusters?: ReadonlyArray<ProjectCluster>;
  capabilities?: ReadonlyArray<ProjectCapability>;
  engineeringChoices?: ReadonlyArray<ProjectEngineeringChoice>;
  timeline?: ReadonlyArray<ProjectTimelineEntry>;
}

const modules = import.meta.glob<{ default: Project }>("../content/projects/*.json", {
  eager: true,
});

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

/**
 * URL репозитория с graceful fallback:
 *   1) если в JSON явно задан `repo.url` — берём его (например, репо в чужой org);
 *   2) если задан `PUBLIC_GITHUB_USER` — собираем `https://github.com/<user>/<name>`;
 *   3) иначе возвращаем пустую строку — компоненты не рендерят ссылку.
 *
 * Это позволяет держать JSON-ы проектов без захардкоженного username и
 * шарить репозиторий как шаблон.
 */
export function repoUrl(repo: ProjectRepo): string {
  if (repo.url && repo.url.length > 0) return repo.url;
  const user = config.PUBLIC_GITHUB_USER;
  if (!user) return "";
  return `https://github.com/${user}/${repo.repo ?? repo.name}`;
}
