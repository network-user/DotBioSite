#!/usr/bin/env node
/**
 * Rasterizes OG images and PWA icons from source SVGs to PNG.
 *
 * Social networks do not render SVG og:image, so every og.svg needs a PNG
 * counterpart. This script uses @resvg/resvg-js (no headless browser needed)
 * and is idempotent: it overwrites existing PNGs on every run.
 *
 * After a successful render it writes scripts/og-sources.json, a manifest of
 * each source SVG's sha256 + the PNG(s) it produced. `npm run seo:check`
 * (via check-og-fresh.mjs) uses that manifest to fail CI if an SVG was
 * edited without re-running this script.
 *
 * Run via `npm run og:render`.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";
import { listOgJobs, rootDir, toRelPath } from "./og-jobs.mjs";

const FONT_OPTIONS = {
  loadSystemFonts: true,
  defaultFontFamily: "Arial",
};

const manifestPath = path.join(rootDir, "scripts", "og-sources.json");

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

function sha256File(absPath) {
  return createHash("sha256").update(readFileSync(absPath)).digest("hex");
}

/**
 * Builds scripts/og-sources.json: one entry per source SVG, keyed by its
 * repo-relative path. A single SVG can render into more than one PNG (the
 * two PWA icon sizes both come from icon-192.svg), so `png` is a sorted list
 * rather than a single path.
 */
function writeManifest(jobs) {
  const manifest = {};

  for (const job of jobs) {
    const relSvg = toRelPath(job.svg);
    const relPng = toRelPath(job.png);
    const entry = manifest[relSvg] ?? { sha256: sha256File(job.svg), png: [] };
    if (!entry.png.includes(relPng)) entry.png.push(relPng);
    manifest[relSvg] = entry;
  }

  const sortedKeys = Object.keys(manifest).sort();
  const sorted = {};
  for (const key of sortedKeys) {
    manifest[key].png.sort();
    sorted[key] = manifest[key];
  }

  writeFileSync(manifestPath, `${JSON.stringify(sorted, null, 2)}\n`);
  console.log(`  wrote ${toRelPath(manifestPath)}`);
}

function main() {
  const jobs = listOgJobs();
  console.log(`Rendering ${jobs.length} PNG(s) via resvg...`);

  for (const job of jobs) {
    const bytes = renderToPng(job.svg, job.png, {
      width: job.width,
      background: job.background,
    });
    if (job.checkMinBytes) {
      assertMinSize(job.label, bytes, job.checkMinBytes);
    }
    console.log(`  ${job.label} -> ${formatKb(bytes)}`);
  }

  writeManifest(jobs);

  console.log("Done.");
}

try {
  main();
} catch (error) {
  console.error("og:render failed:", error.message);
  process.exitCode = 1;
}
