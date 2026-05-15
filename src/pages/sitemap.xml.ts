import type { APIRoute } from "astro";
import { config } from "../lib/config";
import { projects } from "../lib/projects";

interface UrlEntry {
  ru: string;
  en: string;
  priority: string;
}

const entries: UrlEntry[] = [
  { ru: "/", en: "/en", priority: "1.0" },
  ...projects
    .filter((p) => !p.comingSoon)
    .map((p) => ({
      ru: `/projects/${p.slug}`,
      en: `/en/projects/${p.slug}`,
      priority: "0.8",
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
): string {
  const alternateLocale = locale === "ru" ? "en" : "ru";
  return `  <url>
    <loc>${escapeXml(absolute(path))}</loc>
    <xhtml:link rel="alternate" hreflang="${locale}" href="${escapeXml(absolute(path))}" />
    <xhtml:link rel="alternate" hreflang="${alternateLocale}" href="${escapeXml(absolute(alternatePath))}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(absolute(locale === "ru" ? path : alternatePath))}" />
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

export const GET: APIRoute = () => {
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries
  .flatMap((entry) => [
    urlNode(entry.ru, entry.en, "ru", entry.priority),
    urlNode(entry.en, entry.ru, "en", entry.priority),
  ])
  .join("\n")}
</urlset>
`;

  return new Response(body, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};
