#!/usr/bin/env node
/**
 * Rasterizes OG images and PWA icons from source SVGs to PNG.
 *
 * Social networks do not render SVG og:image, so every og.svg needs a PNG
 * counterpart. This script uses @resvg/resvg-js (no headless browser needed)
 * and is idempotent: it overwrites existing PNGs on every run.
 *
 * Run via `npm run og:render`.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const publicDir = path.join(rootDir, "public");
const projectsDir = path.join(publicDir, "projects");

const FONT_OPTIONS = {
  loadSystemFonts: true,
  defaultFontFamily: "Arial",
};

// A 1200x630 og image with real rendered text is well above this size.
// A near-empty canvas (text failed to render) stays well below it.
const MIN_OG_BYTES = 10 * 1024;

/**
 * @param {string} svgPath absolute path to the source SVG
 * @param {string} outPath absolute path for the output PNG
 * @param {{ width?: number, background?: string }} [options]
 * @returns {number} size in bytes of the written PNG
 */
function renderToPng(svgPath, outPath, options = {}) {
  if (!existsSync(svgPath)) {
    throw new Error(`Source SVG not found: ${svgPath}`);
  }

  const svg = readFileSync(svgPath, "utf-8");
  const resvg = new Resvg(svg, {
    fitTo: options.width ? { mode: "width", value: options.width } : { mode: "original" },
    font: FONT_OPTIONS,
    background: options.background,
  });

  const rendered = resvg.render();
  const png = rendered.asPng();

  mkdirSync(path.dirname(outPath), { recursive: true });
  writeFileSync(outPath, png);

  return png.length;
}

function formatKb(bytes) {
  return `${(bytes / 1024).toFixed(1)}KB`;
}

function assertMinSize(label, bytes, min) {
  if (bytes < min) {
    throw new Error(
      `${label} is only ${formatKb(bytes)} (min ${formatKb(min)}), text likely failed to render`,
    );
  }
}

function listProjectSlugs() {
  return readdirSync(projectsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((slug) => existsSync(path.join(projectsDir, slug, "og.svg")))
    .sort();
}

function buildJobs() {
  const jobs = [
    {
      label: "og-image.png",
      src: path.join(publicDir, "og-image.svg"),
      out: path.join(publicDir, "og-image.png"),
      width: 1200,
      checkMinBytes: MIN_OG_BYTES,
    },
  ];

  for (const slug of listProjectSlugs()) {
    jobs.push({
      label: `projects/${slug}/og.png`,
      src: path.join(projectsDir, slug, "og.svg"),
      out: path.join(projectsDir, slug, "og.png"),
      width: 1200,
      checkMinBytes: MIN_OG_BYTES,
    });
  }

  // Opaque background fallback in case a source icon SVG has transparent
  // areas outside its drawn shape (touch icons must not show a checkerboard).
  const iconBackground = "#0c0d0f";

  jobs.push(
    {
      label: "apple-touch-icon.png",
      src: path.join(publicDir, "icon-192.svg"),
      out: path.join(publicDir, "apple-touch-icon.png"),
      width: 180,
      background: iconBackground,
    },
    {
      label: "icon-192.png",
      src: path.join(publicDir, "icon-192.svg"),
      out: path.join(publicDir, "icon-192.png"),
      width: 192,
      background: iconBackground,
    },
    {
      label: "icon-512.png",
      src: path.join(publicDir, "icon-512.svg"),
      out: path.join(publicDir, "icon-512.png"),
      width: 512,
      background: iconBackground,
    },
  );

  return jobs;
}

function main() {
  const jobs = buildJobs();
  console.log(`Rendering ${jobs.length} PNG(s) via resvg...`);

  for (const job of jobs) {
    const bytes = renderToPng(job.src, job.out, {
      width: job.width,
      background: job.background,
    });
    if (job.checkMinBytes) {
      assertMinSize(job.label, bytes, job.checkMinBytes);
    }
    console.log(`  ${job.label} -> ${formatKb(bytes)}`);
  }

  console.log("Done.");
}

try {
  main();
} catch (error) {
  console.error("og:render failed:", error.message);
  process.exitCode = 1;
}
