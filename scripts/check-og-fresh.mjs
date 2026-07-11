#!/usr/bin/env node
/**
 * Verifies scripts/og-sources.json (written by render-og.mjs) is still fresh:
 * every source SVG's hash matches the manifest and its rendered PNG(s) exist.
 * Catches an SVG edited without a follow-up `npm run og:render`.
 *
 * Part of `npm run seo:check`. No dependencies beyond node:crypto/fs/path.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { listOgJobs, rootDir, toRelPath } from "./og-jobs.mjs";

const manifestPath = path.join(rootDir, "scripts", "og-sources.json");
const manifestRel = toRelPath(manifestPath);

function sha256File(absPath) {
  return createHash("sha256").update(readFileSync(absPath)).digest("hex");
}

function loadManifest() {
  if (!existsSync(manifestPath)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(manifestPath, "utf-8"));
  } catch (error) {
    throw new Error(`${manifestRel} is not valid JSON: ${error.message}`);
  }
}

function main() {
  const problems = [];
  const manifest = loadManifest();

  if (!manifest) {
    console.error(
      `og freshness check failed:\n  - ${manifestRel}: missing. Run "npm run og:render" to generate it.`,
    );
    process.exitCode = 1;
    return;
  }

  const jobs = listOgJobs();

  // Group jobs by source SVG: one SVG (e.g. icon-192.svg) can render into
  // more than one PNG, and the hash only needs checking once per SVG.
  const bySvg = new Map();
  for (const job of jobs) {
    const relSvg = toRelPath(job.svg);
    const pngs = bySvg.get(relSvg) ?? [];
    pngs.push({ abs: job.png, rel: toRelPath(job.png) });
    bySvg.set(relSvg, pngs);
  }

  for (const [relSvg, pngs] of bySvg) {
    const svgAbs = path.join(rootDir, relSvg);
    const entry = manifest[relSvg];

    if (!entry) {
      problems.push(`${relSvg}: no manifest entry. Run "npm run og:render".`);
      continue;
    }

    if (!existsSync(svgAbs)) {
      problems.push(`${relSvg}: listed in manifest but source SVG is missing on disk.`);
      continue;
    }

    const actualHash = sha256File(svgAbs);
    if (actualHash !== entry.sha256) {
      problems.push(
        `${relSvg}: hash mismatch (edited without "npm run og:render"). ` +
          `manifest=${entry.sha256.slice(0, 12)} actual=${actualHash.slice(0, 12)}`,
      );
      continue;
    }

    const manifestPngs = Array.isArray(entry.png) ? entry.png : [entry.png];
    for (const { abs, rel } of pngs) {
      if (!manifestPngs.includes(rel)) {
        problems.push(
          `${relSvg}: manifest does not list ${rel} as an output. Run "npm run og:render".`,
        );
        continue;
      }
      if (!existsSync(abs)) {
        problems.push(`${rel}: missing on disk (manifest says it was rendered from ${relSvg}).`);
      }
    }
  }

  const seenSvgs = new Set(bySvg.keys());

  for (const relSvg of Object.keys(manifest)) {
    if (!seenSvgs.has(relSvg)) {
      problems.push(
        `${relSvg}: manifest entry for a source that no longer exists. Run "npm run og:render" to regenerate the manifest.`,
      );
    }
  }

  if (problems.length > 0) {
    console.error(
      `og freshness check failed (${problems.length}):\n${problems.map((p) => `  - ${p}`).join("\n")}`,
    );
    process.exitCode = 1;
    return;
  }

  console.log(`og freshness check passed: ${jobs.length} source(s) match ${manifestRel}.`);
}

main();
