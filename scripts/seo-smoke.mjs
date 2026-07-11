#!/usr/bin/env node
/**
 * SEO smoke test over the built `dist/` output: canonical/hreflang/OG tags,
 * structured data, meta robots, sitemap.xml, robots.txt, llms(.full).txt and
 * the PWA manifest. HTML is deterministic (built by Astro), so parsing is
 * done with regexes rather than a full HTML parser. No dependencies beyond
 * node:fs/path/url.
 *
 * Part of `npm run seo:check`. Run `npm run build` first.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, URL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");

const errors = [];
let checkCount = 0;

function fail(file, message) {
  errors.push(`${file}: ${message}`);
}

/** Runs `assertion`, recording a failure under `file` if it returns falsy. Always counts as one check. */
function check(file, message, assertion) {
  checkCount++;
  if (!assertion) fail(file, message);
}

function relDist(absPath) {
  return path.relative(distDir, absPath).split(path.sep).join("/");
}

function walkHtml(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkHtml(full));
    else if (entry.isFile() && entry.name.endsWith(".html")) out.push(full);
  }
  return out;
}

/** Maps a URL pathname to the dist file it should resolve to, per Astro's static output layout. */
function distFileForPathname(pathname) {
  const trimmed = pathname.replace(/^\/+/, "").replace(/\/+$/, "");
  if (trimmed === "") return path.join(distDir, "index.html");
  const candidates = [
    path.join(distDir, trimmed, "index.html"),
    path.join(distDir, `${trimmed}.html`),
  ];
  return candidates.find((p) => existsSync(p)) ?? null;
}

function matchAll(re, text) {
  return Array.from(text.matchAll(re));
}

// ---------------------------------------------------------------------------

if (!existsSync(distDir)) {
  console.error("dist/ not found, run npm run build first");
  process.exit(1);
}

const htmlFiles = walkHtml(distDir).sort();

// ---------------------------------------------------------------------------
// Per-page checks
// ---------------------------------------------------------------------------

for (const file of htmlFiles) {
  const rel = relDist(file);
  const html = readFileSync(file, "utf-8");
  const isNotFound = path.basename(file) === "404.html";

  // canonical: exactly one, absolute http(s), no trailing slash unless it's the site root.
  const canonicalMatches = matchAll(/<link\s+rel="canonical"\s+href="([^"]*)"\s*\/?>/g, html);
  check(rel, 'expected exactly one <link rel="canonical">', canonicalMatches.length === 1);
  if (canonicalMatches.length === 1) {
    const href = canonicalMatches[0][1];
    let url = null;
    try {
      url = new URL(href);
    } catch {
      url = null;
    }
    check(
      rel,
      `canonical href "${href}" is not an absolute http(s) URL`,
      url !== null && /^https?:$/.test(url.protocol),
    );
    if (url) {
      const isRoot = url.pathname === "/";
      check(
        rel,
        `canonical href "${href}" has a trailing slash on a non-root page`,
        isRoot || !url.pathname.endsWith("/"),
      );
    }
  }

  // hreflang: ru, en, x-default must all be present.
  const hreflangMatches = matchAll(
    /<link\s+rel="alternate"\s+hreflang="([^"]+)"\s+href="[^"]+"\s*\/?>/g,
    html,
  );
  const hreflangs = new Set(hreflangMatches.map((m) => m[1]));
  for (const expected of ["ru", "en", "x-default"]) {
    check(rel, `missing <link rel="alternate" hreflang="${expected}">`, hreflangs.has(expected));
  }

  // og:image: present, ends with .png, and the referenced file exists in dist.
  const ogImageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]*)"\s*\/?>/);
  check(rel, 'missing <meta property="og:image">', Boolean(ogImageMatch));
  if (ogImageMatch) {
    const ogImageUrl = ogImageMatch[1];
    check(rel, `og:image "${ogImageUrl}" does not end with .png`, ogImageUrl.endsWith(".png"));
    let pathname = null;
    try {
      pathname = new URL(ogImageUrl).pathname;
    } catch {
      pathname = null;
    }
    const ogImageFile = pathname ? path.join(distDir, pathname) : null;
    check(
      rel,
      `og:image "${ogImageUrl}" has no matching file in dist`,
      Boolean(ogImageFile && existsSync(ogImageFile)),
    );
  }

  check(
    rel,
    'missing <meta property="og:image:width">',
    /<meta\s+property="og:image:width"\s+content="[^"]+"\s*\/?>/.test(html),
  );
  check(
    rel,
    'missing <meta property="og:image:height">',
    /<meta\s+property="og:image:height"\s+content="[^"]+"\s*\/?>/.test(html),
  );

  // description + title
  const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]*)"\s*\/?>/);
  check(
    rel,
    'missing or empty <meta name="description">',
    Boolean(descMatch && descMatch[1].trim().length > 0),
  );

  const titleMatch = html.match(/<title>([^<]*)<\/title>/);
  check(rel, "missing or empty <title>", Boolean(titleMatch && titleMatch[1].trim().length > 0));

  // JSON-LD: every application/ld+json script must parse.
  const ldScripts = matchAll(
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g,
    html,
  );
  check(rel, 'no <script type="application/ld+json"> found', ldScripts.length > 0);
  ldScripts.forEach((m, i) => {
    try {
      JSON.parse(m[1]);
      checkCount++;
    } catch (error) {
      fail(rel, `ld+json script #${i + 1} failed to parse: ${error.message}`);
    }
  });

  // meta robots
  const robotsMatch = html.match(/<meta\s+name="robots"\s+content="([^"]*)"\s*\/?>/);
  check(rel, 'missing <meta name="robots">', Boolean(robotsMatch));
  if (robotsMatch) {
    const content = robotsMatch[1];
    if (isNotFound) {
      check(rel, `expected robots content="noindex", got "${content}"`, content === "noindex");
    } else {
      check(
        rel,
        `expected robots content to start with "index", got "${content}"`,
        content.startsWith("index"),
      );
    }
  }

  // <html lang>
  const langMatch = html.match(/<html[^>]*\slang="([^"]*)"/);
  check(rel, "missing or empty <html lang>", Boolean(langMatch && langMatch[1].trim().length > 0));
}

// ---------------------------------------------------------------------------
// robots.txt
// ---------------------------------------------------------------------------

const robotsPath = path.join(distDir, "robots.txt");
let siteOrigin = null;

check("robots.txt", "file is missing", existsSync(robotsPath));
if (existsSync(robotsPath)) {
  const robotsTxt = readFileSync(robotsPath, "utf-8");
  check("robots.txt", 'missing "User-agent: *"', robotsTxt.includes("User-agent: *"));

  const sitemapLine = robotsTxt.match(/^Sitemap:\s*(\S+)$/m);
  check("robots.txt", 'missing "Sitemap: " line', Boolean(sitemapLine));
  if (sitemapLine) {
    const sitemapUrl = sitemapLine[1];
    let url = null;
    try {
      url = new URL(sitemapUrl);
    } catch {
      url = null;
    }
    check(
      "robots.txt",
      `Sitemap URL "${sitemapUrl}" is not absolute http(s)`,
      url !== null && /^https?:$/.test(url.protocol),
    );
    if (url) siteOrigin = url.origin;
  }
}

// ---------------------------------------------------------------------------
// sitemap.xml
// ---------------------------------------------------------------------------

const sitemapPath = path.join(distDir, "sitemap.xml");
check("sitemap.xml", "file is missing", existsSync(sitemapPath));

if (existsSync(sitemapPath)) {
  const sitemapXml = readFileSync(sitemapPath, "utf-8");
  const urlBlocks = matchAll(/<url>([\s\S]*?)<\/url>/g, sitemapXml);
  check("sitemap.xml", "no <url> entries found", urlBlocks.length > 0);

  for (const [, block] of urlBlocks) {
    const locMatch = block.match(/<loc>([^<]+)<\/loc>/);
    check("sitemap.xml", `<url> entry missing <loc>: ${block.slice(0, 80)}`, Boolean(locMatch));
    if (!locMatch) continue;
    const loc = locMatch[1];

    let url = null;
    try {
      url = new URL(loc);
    } catch {
      url = null;
    }
    check("sitemap.xml", `<loc>${loc}</loc> is not an absolute URL`, url !== null);
    if (url && siteOrigin) {
      check(
        "sitemap.xml",
        `<loc>${loc}</loc> origin does not match robots.txt Sitemap origin`,
        url.origin === siteOrigin,
      );
    }
    if (url) {
      const target = distFileForPathname(url.pathname);
      check("sitemap.xml", `<loc>${loc}</loc> has no matching page in dist`, Boolean(target));
    }

    const lastmodMatch = block.match(/<lastmod>([^<]+)<\/lastmod>/);
    check("sitemap.xml", `<loc>${loc}</loc>: missing <lastmod>`, Boolean(lastmodMatch));
    if (lastmodMatch) {
      const lastmod = lastmodMatch[1];
      const isDate = /^\d{4}-\d{2}-\d{2}$/.test(lastmod);
      const isIso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
        lastmod,
      );
      check(
        "sitemap.xml",
        `<lastmod>${lastmod}</lastmod> is not YYYY-MM-DD or full ISO`,
        isDate || isIso,
      );
    }
  }

  const indexedHtmlCount = htmlFiles.filter((f) => path.basename(f) !== "404.html").length;
  check(
    "sitemap.xml",
    `<url> count (${urlBlocks.length}) does not match indexed dist pages (${indexedHtmlCount})`,
    urlBlocks.length === indexedHtmlCount,
  );
}

// ---------------------------------------------------------------------------
// llms.txt
// ---------------------------------------------------------------------------

const llmsPath = path.join(distDir, "llms.txt");
check("llms.txt", "file is missing", existsSync(llmsPath));

if (existsSync(llmsPath)) {
  const llmsTxt = readFileSync(llmsPath, "utf-8");
  check("llms.txt", 'must start with "# DotCore"', llmsTxt.startsWith("# DotCore"));
  check("llms.txt", 'missing a blockquote line ("> ...")', /^> .+/m.test(llmsTxt));

  function linksInSection(heading) {
    const headingIndex = llmsTxt.indexOf(heading);
    if (headingIndex === -1) return null;
    const rest = llmsTxt.slice(headingIndex + heading.length);
    const nextHeadingIndex = rest.search(/^## /m);
    const section = nextHeadingIndex === -1 ? rest : rest.slice(0, nextHeadingIndex);
    return matchAll(/\[[^\]]+\]\((https?:\/\/[^)]+)\)/g, section);
  }

  for (const heading of ["## Projects (EN)", "## Проекты (RU)"]) {
    const links = linksInSection(heading);
    check("llms.txt", `missing section "${heading}"`, links !== null);
    if (links) {
      check(
        "llms.txt",
        `section "${heading}" has ${links.length} links, expected at least 6`,
        links.length >= 6,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// llms-full.txt
// ---------------------------------------------------------------------------

const llmsFullPath = path.join(distDir, "llms-full.txt");
check("llms-full.txt", "file is missing", existsSync(llmsFullPath));

if (existsSync(llmsFullPath)) {
  const llmsFullTxt = readFileSync(llmsFullPath, "utf-8");
  check("llms-full.txt", 'must start with "# DotCore"', llmsFullTxt.startsWith("# DotCore"));
  const size = statSync(llmsFullPath).size;
  check("llms-full.txt", `file is only ${size} bytes, expected > 10KB`, size > 10 * 1024);
  const sectionCount = (llmsFullTxt.match(/^## /gm) ?? []).length;
  check(
    "llms-full.txt",
    `found ${sectionCount} "## " sections, expected at least 6`,
    sectionCount >= 6,
  );
}

// ---------------------------------------------------------------------------
// PWA / static assets
// ---------------------------------------------------------------------------

for (const asset of ["apple-touch-icon.png", "og-image.png", "manifest.webmanifest"]) {
  check(asset, "file is missing from dist", existsSync(path.join(distDir, asset)));
}

const manifestPath = path.join(distDir, "manifest.webmanifest");
if (existsSync(manifestPath)) {
  try {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
    const icons = Array.isArray(manifest.icons) ? manifest.icons : [];
    check("manifest.webmanifest", "no icons listed", icons.length > 0);
    for (const icon of icons) {
      const iconFile = path.join(distDir, icon.src.replace(/^\/+/, ""));
      check(
        "manifest.webmanifest",
        `icon "${icon.src}" has no matching file in dist`,
        existsSync(iconFile),
      );
    }
  } catch (error) {
    fail("manifest.webmanifest", `failed to parse JSON: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------

if (errors.length > 0) {
  console.error(`seo-smoke failed (${errors.length} problem(s) across ${checkCount} checks):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exitCode = 1;
} else {
  console.log(`seo-smoke passed: ${htmlFiles.length} page(s), ${checkCount} check(s), all green.`);
}
