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
/**
 * Тир проекта в витрине:
 *   - "product" (по умолчанию) — флагманский продукт: featured-карточка, case-
 *     страница, веха в таймлайне.
 *   - "infra" — инструмент/инфраструктура экосистемы DotCore: лёгкая карточка
 *     со ссылкой прямо в репозиторий, без отдельной case-страницы и без вехи в
 *     таймлайне. Рендерится отдельной подсекцией «Экосистема DotCore».
 */
export type ProjectTier = "product" | "infra";

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
  label: string;
  icon?: ProjectArchitectureNodeIcon;
  width?: number;
  height?: number;
  emphasis?: "default" | "strong";
  /** Слоистая раскладка (предпочтительно): `col` — колонка слева направо (стадия
   *  потока), `row` — порядок внутри колонки сверху вниз. Компонент сам считает
   *  ровные, выровненные координаты. См. Architecture.astro. */
  col?: number;
  row?: number;
  /** Явные координаты центра капсулы (legacy). Используются, только если у узлов
   *  не задан `col`. */
  x?: number;
  y?: number;
  /** Короткое двуязычное пояснение роли узла — раскрывается по клику на капсулу
   *  в диаграмме (см. Architecture.astro, слой «клик → пояснение»). */
  desc?: { ru: string; en: string };
}

export type ProjectArchitectureEdgeKind = "sync" | "async" | "data";

export interface ProjectArchitectureEdge {
  from: string;
  to: string;
  kind?: ProjectArchitectureEdgeKind;
  label?: string;
  bend?: number;
  /** Принудительно односторонний поток (без ответного пакета в анимации) — для
   *  записей-стоков: отчёт на диск, нотификация, отгрузка в очередь. По умолчанию
   *  односторонними считаются только `async`-рёбра; `sync`/`data` — round-trip. */
  oneway?: boolean;
}

export interface ProjectCluster {
  label: string;
  /** Id узлов кластера — рамка считается как их общий bounding box + отступ
   *  (предпочтительно при слоистой раскладке). */
  members?: ReadonlyArray<string>;
  /** Явные координаты рамки (legacy) — используются, если не заданы `members`. */
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface ProjectCapability {
  icon: ProjectArchitectureNodeIcon;
  title: { ru: string; en: string };
  description: { ru: string; en: string };
  /** Опциональная конкретика, раскрываемая по клику (число, механизм, пример).
   *  Нет — карточка статична; есть — появляется кнопка раскрытия. */
  detail?: { ru: string; en: string };
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
  /** Тир витрины. Без поля считается "product". См. {@link ProjectTier}. */
  tier?: ProjectTier;
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
  "dotlearn", // .учёба — new, full-stack TS платформа
  "dotschet", // .счёт — тренажёр устного счёта
  "dotagents", // .агенты
  "dotworkbot", // .работа
  "dottraceip", // .след — async CLI для массового анализа IP
];

const orderIndex = (slug: string): number => {
  const i = FEATURED_ORDER.indexOf(slug);
  return i === -1 ? FEATURED_ORDER.length : i;
};

/** Все загруженные проекты в кураторском порядке витрины (см. `FEATURED_ORDER`). */
const allProjects: ReadonlyArray<Project> = Object.values(modules)
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

/**
 * Продукты-флагманы (тир "product"). Это единственный список, который питает
 * витрину, таймлайн, case-страницы и sitemap — infra-инструменты сюда не
 * попадают, поэтому для них не генерируются пустые case-страницы и они не
 * становятся вехами в таймлайне.
 */
export const projects: ReadonlyArray<Project> = allProjects.filter((p) => p.tier !== "infra");

/**
 * Инструменты/инфраструктура экосистемы DotCore (тир "infra"). Рендерятся
 * отдельной лёгкой подсекцией; ссылка ведёт в репозиторий, не на case-страницу.
 */
export const infraProjects: ReadonlyArray<Project> = allProjects.filter((p) => p.tier === "infra");

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
