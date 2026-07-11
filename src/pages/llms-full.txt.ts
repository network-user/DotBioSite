import type { APIRoute } from "astro";
import { config } from "../lib/config";
import {
  projects,
  infraProjects,
  projectName,
  projectBrand,
  projectCaseDescription,
  projectDescription,
  projectStartDate,
  repoUrl,
  type Project,
} from "../lib/projects";
import { useTranslations } from "../lib/i18n";

/**
 * llms-full.txt: полное досье по каждому продукту (EN + RU в одной секции) для
 * LLM-краулеров и агентов. Компактная карта сайта - в /llms.txt.
 */

function absolute(path: string): string {
  return new URL(path, config.PUBLIC_DOMAIN).toString();
}

function localeBlock(p: Project, locale: "ru" | "en"): string {
  const url = absolute(`${locale === "en" ? "/en" : ""}/projects/${p.slug}`);
  const repos = p.repos
    .map((r) => {
      const link = repoUrl(r);
      const role = r.role ? ` (${r.role})` : "";
      return `${r.name}${role}: ${link || "n/a"}`;
    })
    .join("; ");

  const lines: string[] = [
    `### ${projectName(p, locale)} (${projectBrand(p, locale)})`,
    `URL: ${url}`,
    `Status: ${p.status} · Category: ${p.category} · Started: ${projectStartDate(p)}`,
    `Repos: ${repos}`,
    `Stack: ${p.stack.join(", ")}`,
    "",
    projectCaseDescription(p, locale),
  ];

  const overview = p.overview?.[locale] ?? [];
  if (overview.length > 0) {
    lines.push("", "Overview:", overview.join("\n"));
  }

  if (p.metrics && p.metrics.length > 0) {
    lines.push(
      "",
      "Metrics:",
      p.metrics
        .map((m) => `${m.value}${m.unit ? ` ${m.unit}` : ""}: ${m.label[locale]}`)
        .join("\n"),
    );
  }

  if (p.capabilities && p.capabilities.length > 0) {
    lines.push(
      "",
      "Capabilities:",
      p.capabilities.map((c) => `- ${c.title[locale]}: ${c.description[locale]}`).join("\n"),
    );
  }

  if (p.timeline && p.timeline.length > 0) {
    lines.push(
      "",
      "Timeline:",
      p.timeline.map((entry) => `- ${entry.date}: ${entry.title[locale]}`).join("\n"),
    );
  }

  return lines.join("\n");
}

function projectSection(p: Project): string {
  return `## ${projectName(p, "en")}\n\n${localeBlock(p, "en")}\n\n${localeBlock(p, "ru")}`;
}

function infraSection(p: Project): string {
  const repo = p.repos[0];
  const link = repo ? repoUrl(repo) : "";
  return [
    `### ${projectName(p, "en")} (${projectBrand(p, "en")})`,
    `Repo: ${link || "n/a"}`,
    `Stack: ${p.stack.join(", ")}`,
    "",
    projectDescription(p, "en"),
    "",
    projectDescription(p, "ru"),
  ].join("\n");
}

export const GET: APIRoute = () => {
  const t = useTranslations("en");
  const visible = projects.filter((p) => !p.comingSoon);
  const infra = infraProjects.filter((p) => !p.comingSoon);

  const body = `# DotCore, full project dossier

> ${t("meta.description")}

${visible.map(projectSection).join("\n\n")}

# DotCore ecosystem (infrastructure)

${infra.map(infraSection).join("\n\n")}
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
