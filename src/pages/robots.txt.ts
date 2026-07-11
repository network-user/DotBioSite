import type { APIRoute } from "astro";
import { config } from "../lib/config";

/**
 * robots.txt: generated at build so the sitemap URL is absolute.
 * Lighthouse SEO audit rejects relative sitemap paths.
 */

/** AI-краулеры, которым явно разрешён обход (маркер разрешения для LLM-индексации). */
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
];

export const GET: APIRoute = () => {
  const sitemap = new URL("/sitemap.xml", config.PUBLIC_DOMAIN).toString();
  const aiGroups = AI_CRAWLERS.map((ua) => `User-agent: ${ua}\nAllow: /`).join("\n\n");
  const body = `User-agent: *
Allow: /

${aiGroups}

Sitemap: ${sitemap}
`;
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
