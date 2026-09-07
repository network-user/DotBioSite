import fs from "fs";
import path from "path";
import sharp from "sharp";
import { Resvg } from "@resvg/resvg-js";

const OUT = "C:\\Users\\User\\PycharmProjects\\untitled\\data";
const RES = path.join(OUT, "resur");
const W = 1200;
const H = 900;

function bgSvg() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0a0b0d"/>
      <stop offset="0.5" stop-color="#14161a"/>
      <stop offset="1" stop-color="#0b0c0e"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="40%" r="55%">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.12"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <g opacity="0.05" stroke="#ffffff" stroke-width="1">
    <path d="M0 300 H${W} M0 600 H${W} M400 0 V${H} M800 0 V${H}"/>
  </g>
  <circle cx="600" cy="420" r="300" fill="#ffffff" fill-opacity="0.03"/>
  <text x="600" y="840" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" fill="#5a5c63">.\u044F\u0434\u0440\u043E</text>
</svg>`;
}

async function makeCard({ outName, logoPath, maxW, maxH, plate = true }) {
  const bgPng = new Resvg(Buffer.from(bgSvg(), "utf8"), {
    fitTo: { mode: "width", value: W },
  })
    .render()
    .asPng();

  let logo = sharp(logoPath).ensureAlpha();
  const meta = await logo.metadata();

  // scale logo into max box
  const scale = Math.min(maxW / meta.width, maxH / meta.height, 1);
  const tw = Math.round(meta.width * scale);
  const th = Math.round(meta.height * scale);
  const logoBuf = await sharp(logoPath)
    .ensureAlpha()
    .resize(tw, th, { fit: "inside" })
    .png()
    .toBuffer();

  const left = Math.round((W - tw) / 2);
  const top = Math.round((H - th) / 2) - 20;

  const composites = [];

  if (plate) {
    const padX = 48;
    const padY = 40;
    const pw = tw + padX * 2;
    const ph = th + padY * 2;
    const px = left - padX;
    const py = top - padY;
    const plateSvg = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="18"
    fill="#ffffff" fill-opacity="0.04"
    stroke="#ffffff" stroke-opacity="0.16" stroke-width="1.5"/>
</svg>`);
    const platePng = new Resvg(plateSvg, { fitTo: { mode: "width", value: W } })
      .render()
      .asPng();
    composites.push({ input: platePng, left: 0, top: 0 });
  }

  composites.push({ input: logoBuf, left, top });

  await sharp(bgPng).composite(composites).png().toFile(path.join(OUT, outName));
  console.log("ok", outName, `${tw}x${th}`);
}

async function main() {
  const jobs = [
    {
      outName: "cursor.png",
      logoPath: path.join(RES, "anysphere-cursor-ai.png"),
      maxW: 820,
      maxH: 320,
      plate: false, // already black
    },
    {
      outName: "claude-code.png",
      logoPath: path.join(RES, "claude.png"),
      maxW: 780,
      maxH: 280,
      plate: true,
    },
    {
      outName: "claude-code-banner.png",
      logoPath: path.join(RES, "Claude-Code-2120x848.webp"),
      maxW: 900,
      maxH: 360,
      plate: true,
    },
    {
      outName: "antigravity.png",
      logoPath: path.join(RES, "antigravity-cover.png"),
      maxW: 520,
      maxH: 520,
      plate: true,
    },
    {
      outName: "grok-build.png",
      logoPath: path.join(RES, "grok-build.jpg"),
      maxW: 780,
      maxH: 280,
      plate: true,
    },
  ];

  for (const job of jobs) {
    if (!fs.existsSync(job.logoPath)) {
      console.warn("missing", job.logoPath);
      continue;
    }
    await makeCard(job);
  }

  // remove old invented glyph cards svg if present - keep only framed originals
  console.log("done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
