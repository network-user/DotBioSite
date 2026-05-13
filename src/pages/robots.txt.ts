import type { APIRoute } from "astro";
import { config } from "../lib/config";

/**
 * robots.txt — generated at build so the sitemap URL is absolute.
 * Lighthouse SEO audit rejects relative sitemap paths.
 */
export const GET: APIRoute = () => {
  const sitemap = new URL("/sitemap.xml", config.PUBLIC_DOMAIN).toString();
  const body = `User-agent: *
Allow: /

Sitemap: ${sitemap}
`;
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
