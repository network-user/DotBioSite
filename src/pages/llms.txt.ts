import type { APIRoute } from "astro";
import { config } from "../lib/config";
import { projects, infraProjects, projectName, projectTagline, repoUrl } from "../lib/projects";
import { useTranslations } from "../lib/i18n";

/**
 * llms.txt (спека llmstxt.org): краткая карта сайта для LLM-краулеров и
 * агентов. Полное досье с метриками/капабилити/таймлайном - в /llms-full.txt.
 */

function absolute(path: string): string {
  return new URL(path, config.PUBLIC_DOMAIN).toString();
}

export const GET: APIRoute = () => {
  const t = useTranslations("en");
  const visible = projects.filter((p) => !p.comingSoon);
  const infra = infraProjects.filter((p) => !p.comingSoon);

  const enProjects = visible
    .map(
      (p) =>
        `- [${projectName(p, "en")}](${absolute(`/en/projects/${p.slug}`)}): ${projectTagline(p, "en")}`,
    )
    .join("\n");

  const ruProjects = visible
    .map(
      (p) =>
        `- [${projectName(p, "ru")}](${absolute(`/projects/${p.slug}`)}): ${projectTagline(p, "ru")}`,
    )
    .join("\n");

  const ecosystem = infra
    .map((p) => {
      const repo = p.repos[0];
      const url = repo ? repoUrl(repo) : "";
      const label = projectName(p, "en");
      return url
        ? `- [${label}](${url}): ${projectTagline(p, "en")}`
        : `- ${label}: ${projectTagline(p, "en")}`;
    })
    .join("\n");

  const body = `# DotCore

> ${t("meta.description")}

DotCore is a portfolio of independent products and tools shipped under one brand. Each project below has a full case study: architecture, stack, metrics, and a timeline.

Default human locale is Russian (\`/\`). English mirror lives under \`/en\`. Machine-readable full dossier: \`/llms-full.txt\`.

## Projects (EN)
${enProjects}

## Проекты (RU)
${ruProjects}

## DotCore ecosystem
${ecosystem}

## Optional
- [Full project dossier](${absolute("/llms-full.txt")}): complete case studies for every project, EN and RU
- [English site](${absolute("/en")}): human-facing homepage, English
- [Russian site](${absolute("/")}): human-facing homepage, Russian (default locale)
- [XML sitemap](${absolute("/sitemap.xml")}): full URL list for crawlers
- [robots.txt](${absolute("/robots.txt")}): crawl policy, including explicit AI crawler allow groups
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
