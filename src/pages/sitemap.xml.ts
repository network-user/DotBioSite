import type { APIRoute } from "astro";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { config } from "../lib/config";
import { projects } from "../lib/projects";

interface UrlEntry {
  ru: string;
  en: string;
  priority: string;
  lastmod: string;
}

const repoRoot = fileURLToPath(new URL("../../", import.meta.url));

/**
 * Дата последнего git-коммита набора путей (кэш по набору, один вызов git на
 * уникальный ключ). Выполняется только на билде (SSG), в рантайм не попадает.
 * Fallback на дату билда, если git недоступен или история пуста.
 * execFileSync с массивом аргументов: пути не проходят через shell, инъекция
 * через slug исключена даже теоретически.
 */
const lastmodCache = new Map<string, string>();

function gitLastmod(paths: string[]): string {
  const key = paths.join("|");
  const cached = lastmodCache.get(key);
  if (cached) return cached;

  let result = "";
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%cI", "--", ...paths], {
      cwd: repoRoot,
      encoding: "utf-8",
    }).trim();
    if (out) result = out.slice(0, 10);
  } catch {
    result = "";
  }
  if (!result) result = new Date().toISOString().slice(0, 10);

  lastmodCache.set(key, result);
  return result;
}

const HOME_SOURCES = ["src/pages/index.astro", "src/content/i18n", "src/components"];

function caseSources(slug: string): string[] {
  return [`src/content/projects/${slug}.json`, "src/pages/projects/[slug].astro"];
}

const entries: UrlEntry[] = [
  { ru: "/", en: "/en", priority: "1.0", lastmod: gitLastmod(HOME_SOURCES) },
  ...projects
    .filter((p) => !p.comingSoon)
    .map((p) => ({
      ru: `/projects/${p.slug}`,
      en: `/en/projects/${p.slug}`,
      priority: "0.8",
      lastmod: gitLastmod(caseSources(p.slug)),
    })),
];

function absolute(path: string): string {
  return new URL(path, config.PUBLIC_DOMAIN).toString();
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function urlNode(
  path: string,
  alternatePath: string,
  locale: "ru" | "en",
  priority: string,
  lastmod: string,
): string {
  const alternateLocale = locale === "ru" ? "en" : "ru";
  return `  <url>
    <loc>${escapeXml(absolute(path))}</loc>
    <xhtml:link rel="alternate" hreflang="${locale}" href="${escapeXml(absolute(path))}" />
    <xhtml:link rel="alternate" hreflang="${alternateLocale}" href="${escapeXml(absolute(alternatePath))}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(absolute(locale === "ru" ? path : alternatePath))}" />
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

export const GET: APIRoute = () => {
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries
  .flatMap((entry) => [
    urlNode(entry.ru, entry.en, "ru", entry.priority, entry.lastmod),
    urlNode(entry.en, entry.ru, "en", entry.priority, entry.lastmod),
  ])
  .join("\n")}
</urlset>
`;

  return new Response(body, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};
