/**
 * Shared discovery of SVG -> PNG rasterization jobs, used by both
 * render-og.mjs (renders PNGs + writes scripts/og-sources.json) and
 * check-og-fresh.mjs (verifies the manifest against the current SVGs).
 * Keeping this in one place means both scripts always agree on the same
 * set of source/output pairs.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const rootDir = path.resolve(__dirname, "..");
export const publicDir = path.join(rootDir, "public");
export const projectsDir = path.join(publicDir, "projects");

function listProjectSlugs() {
  return readdirSync(projectsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((slug) => existsSync(path.join(projectsDir, slug, "og.svg")))
    .sort();
}

/**
 * @typedef {object} OgJob
 * @property {string} label human-readable name for logs
 * @property {string} svg absolute path to the source SVG
 * @property {string} png absolute path to the rendered PNG
 * @property {number} [width]
 * @property {string} [background]
 * @property {number} [checkMinBytes]
 */

/** @returns {OgJob[]} every SVG source rasterized to a PNG counterpart. */
export function listOgJobs() {
  // A 1200x630 og image with real rendered text is well above this size.
  // A near-empty canvas (text failed to render) stays well below it.
  const MIN_OG_BYTES = 10 * 1024;

  const jobs = [
    {
      label: "og-image.png",
      svg: path.join(publicDir, "og-image.svg"),
      png: path.join(publicDir, "og-image.png"),
      width: 1200,
      checkMinBytes: MIN_OG_BYTES,
    },
  ];

  for (const slug of listProjectSlugs()) {
    jobs.push({
      label: `projects/${slug}/og.png`,
      svg: path.join(projectsDir, slug, "og.svg"),
      png: path.join(projectsDir, slug, "og.png"),
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
      svg: path.join(publicDir, "icon-192.svg"),
      png: path.join(publicDir, "apple-touch-icon.png"),
      width: 180,
      background: iconBackground,
    },
    {
      label: "icon-192.png",
      svg: path.join(publicDir, "icon-192.svg"),
      png: path.join(publicDir, "icon-192.png"),
      width: 192,
      background: iconBackground,
    },
    {
      label: "icon-512.png",
      svg: path.join(publicDir, "icon-512.svg"),
      png: path.join(publicDir, "icon-512.png"),
      width: 512,
      background: iconBackground,
    },
  );

  return jobs;
}

/** Converts an absolute path to a repo-relative, forward-slash path. */
export function toRelPath(absPath) {
  return path.relative(rootDir, absPath).split(path.sep).join("/");
}

/**
 * SHA-256 of a source SVG, normalized to LF line endings.
 * Windows checkouts often expand to CRLF; CI (Linux) keeps LF. Hashing the
 * raw working-tree bytes would make `og:render` / `seo:check` disagree
 * across platforms even when git content is identical.
 */
export function sha256SourceFile(absPath) {
  const normalized = readFileSync(absPath).toString("utf8").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  return createHash("sha256").update(normalized, "utf8").digest("hex");
}
