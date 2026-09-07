import type { APIRoute } from "astro";
import { config } from "../lib/config";

/**
 * robots.txt: generated at build so the sitemap URL is absolute.
 * Lighthouse SEO audit rejects relative sitemap paths.
 */

/** AI-краулеры, которым явно разрешён обход (маркер разрешения для LLM-индексации).
 *  `User-agent: *` уже покрывает всех; отдельные группы - intent policy. */
const AI_CRAWLERS: ReadonlyArray<string> = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-Web",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "GoogleOther",
  "Applebot",
  "Applebot-Extended",
  "CCBot",
  "meta-externalagent",
  "FacebookBot",
  "Amazonbot",
  "Bytespider",
  "cohere-ai",
  "YouBot",
  "DuckAssistBot",
  "AI2Bot",
  "Diffbot",
  "TikTokSpider",
];

export const GET: APIRoute = () => {
  const sitemap = new URL("/sitemap.xml", config.PUBLIC_DOMAIN).toString();
  const llms = new URL("/llms.txt", config.PUBLIC_DOMAIN).toString();
  const llmsFull = new URL("/llms-full.txt", config.PUBLIC_DOMAIN).toString();
  const aiGroups = AI_CRAWLERS.map((ua) => `User-agent: ${ua}\nAllow: /`).join("\n\n");
  const body = `# DotCore portfolio
# LLM index: ${llms}
# Full dossier: ${llmsFull}

User-agent: *
Allow: /

${aiGroups}

Sitemap: ${sitemap}
`;
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
