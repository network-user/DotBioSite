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
  /** OG-картинка для соцсетей (логотип-локап). Если не задана — берётся `cover`. */
  ogImage?: string;
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

/**
 * Кураторский порядок проектов в сетке на главной. Первый = «featured».
 * Слаги вне списка попадают в конец и сортируются по `year` (новые выше).
 * Это единственное место, где задаётся порядок витрины — Timeline и YearStrip
 * имеют собственную сортировку по году и от этого списка не зависят.
 */
const FEATURED_ORDER: ReadonlyArray<string> = [
  "dotsound", // .звук — флагман, featured-карточка
  "dotlearn", // .учёба — новый, full-stack TS платформа
  "dotagents", // .агенты
  "dotworkbot", // .работа
  "dotmathbot", // .матем
];

const orderIndex = (slug: string): number => {
  const i = FEATURED_ORDER.indexOf(slug);
  return i === -1 ? FEATURED_ORDER.length : i;
};

/** Все проекты в кураторском порядке витрины (см. `FEATURED_ORDER`). */
export const projects: ReadonlyArray<Project> = Object.values(modules)
  .map((m) => m.default)
  .filter((p): p is Project => Boolean(p && p.slug))
  .sort((a, b) => {
    const oa = orderIndex(a.slug);
    const ob = orderIndex(b.slug);
    if (oa !== ob) return oa - ob;
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

/**
 * «Дата старта» проекта для таймлайна и eyebrow — берётся из первой вехи
 * `timeline` (например, «Sep 2025»). Если timeline пуст — fallback на `year`.
 * Это единственный источник правды для месяца запуска, чтобы eyebrow на
 * case-странице и главный Timeline не расходились.
 */
export function projectStartDate(p: Project): string {
  const first = p.timeline?.[0];
  if (first) return first.date;
  return p.year ? String(p.year) : "";
}

const MONTH_INDEX: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

/**
 * Сортировочный ключ для строк дат вида «Mon YYYY» или «YYYY».
 * Возвращает `year * 100 + month` — больше = новее. Парсинг устойчив к регистру.
 */
export function timelineDateSortKey(date: string): number {
  const withMonth = date.match(/([A-Za-z]{3,})\s+(\d{4})/);
  if (withMonth && withMonth[1] && withMonth[2]) {
    const month = MONTH_INDEX[withMonth[1].slice(0, 3).toLowerCase()] ?? 1;
    return Number(withMonth[2]) * 100 + month;
  }
  const yearOnly = date.match(/(\d{4})/);
  return yearOnly && yearOnly[1] ? Number(yearOnly[1]) * 100 : 0;
}

/**
 * ISO-дата старта проекта («2025-09» или «2025») для structuredData.dateCreated.
 * Берётся из `projectStartDate`, поэтому SEO-дата совпадает с тем, что видно
 * в eyebrow и в таймлайне. Возвращает undefined, если дату распарсить нельзя.
 */
export function projectStartISO(p: Project): string | undefined {
  const start = projectStartDate(p);
  if (!start) return undefined;
  const key = timelineDateSortKey(start);
  if (key === 0) return undefined;
  const year = Math.floor(key / 100);
  const month = key % 100;
  return month > 0 ? `${year}-${String(month).padStart(2, "0")}` : String(year);
}
