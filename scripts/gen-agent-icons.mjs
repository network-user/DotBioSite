import fs from "fs";
import path from "path";
import { Resvg } from "@resvg/resvg-js";

const OUT = "C:\\Users\\User\\PycharmProjects\\untitled\\data";

const glyphs = {
  cursor: `
    <path d="M14 8 L14 36 L22 30 L28 40 L32 38 L26 28 L36 28 Z"/>
  `,
  claude: `
    <rect x="8" y="10" width="32" height="26" rx="3"/>
    <path d="M8 18 H40"/>
    <circle cx="14" cy="14" r="1.4" fill="#f3f3f1" stroke="none"/>
    <circle cx="19" cy="14" r="1.4" fill="#f3f3f1" stroke="none"/>
    <circle cx="24" cy="14" r="1.4" fill="#f3f3f1" stroke="none"/>
    <path d="M16 28 H28"/>
    <path d="M16 33 H24"/>
  `,
  codex: `
    <path d="M18 14 L12 24 L18 34"/>
    <path d="M30 14 L36 24 L30 34"/>
    <path d="M22 36 L26 12"/>
  `,
  antigravity: `
    <circle cx="24" cy="28" r="8"/>
    <path d="M24 8 V16"/>
    <path d="M24 8 L20 14"/>
    <path d="M24 8 L28 14"/>
    <path d="M14 22 L10 18"/>
    <path d="M34 22 L38 18"/>
    <path d="M16 36 L12 40"/>
    <path d="M32 36 L36 40"/>
  `,
  grok: `
    <path d="M24 8 L28 18 L38 20 L30 28 L32 38 L24 32 L16 38 L18 28 L10 20 L20 18 Z"/>
    <path d="M24 20 V28"/>
    <path d="M20 24 H28"/>
  `,
};

function card({ id, brand, name, tagline, glyph }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900" width="1200" height="900" role="img" aria-label="${name}">
  <title>${name}</title>
  <defs>
    <linearGradient id="${id}-bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0a0b0d"/>
      <stop offset="0.5" stop-color="#14161a"/>
      <stop offset="1" stop-color="#0b0c0e"/>
    </linearGradient>
    <radialGradient id="${id}-glow" cx="50%" cy="30%" r="58%">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.13"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="${id}-halo" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.08"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="900" fill="url(#${id}-bg)"/>
  <rect width="1200" height="900" fill="url(#${id}-glow)"/>
  <g opacity="0.045" stroke="#ffffff" stroke-width="1">
    <path d="M0 300 H1200 M0 600 H1200 M400 0 V900 M800 0 V900"/>
  </g>
  <circle cx="600" cy="400" r="280" fill="url(#${id}-halo)"/>

  <svg x="420" y="180" width="360" height="360" viewBox="0 0 48 48">
    <g opacity="0.08" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
      ${glyph}
    </g>
  </svg>

  <svg x="528" y="220" width="144" height="144" viewBox="0 0 48 48">
    <g fill="none" stroke="#f3f3f1" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
      ${glyph}
    </g>
  </svg>

  <text x="600" y="480" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="72" font-weight="700" fill="#f3f3f1" letter-spacing="-1.5">${brand}</text>
  <text x="600" y="545" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="600" fill="#a6a7ab">${tagline}</text>
  <text x="600" y="820" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="600" fill="#5a5c63">.ядро</text>
</svg>`;
}

const items = [
  {
    file: "cursor",
    id: "cur",
    brand: "Cursor",
    name: "Cursor",
    tagline: "agentic IDE",
    glyph: glyphs.cursor,
  },
  {
    file: "claude-code",
    id: "clc",
    brand: "Claude Code",
    name: "Claude Code",
    tagline: "CLI coding agent",
    glyph: glyphs.claude,
  },
  {
    file: "codex",
    id: "cdx",
    brand: "Codex",
    name: "Codex",
    tagline: "code agent",
    glyph: glyphs.codex,
  },
  {
    file: "antigravity",
    id: "agv",
    brand: "Antigravity",
    name: "Antigravity",
    tagline: "agent runtime",
    glyph: glyphs.antigravity,
  },
  {
    file: "grok-build",
    id: "grk",
    brand: "Grok Build",
    name: "Grok Build",
    tagline: "build agent",
    glyph: glyphs.grok,
  },
];

fs.mkdirSync(OUT, { recursive: true });

for (const item of items) {
  // brand text uses unicode for .ядро via escape in template - fix footer
  const svg = card(item).replace(
    ".ядро",
    ".\u044F\u0434\u0440\u043E",
  );
  const svgPath = path.join(OUT, `${item.file}.svg`);
  const pngPath = path.join(OUT, `${item.file}.png`);
  fs.writeFileSync(svgPath, svg, "utf8");
  const png = new Resvg(Buffer.from(svg, "utf8"), {
    fitTo: { mode: "width", value: 1000 },
  })
    .render()
    .asPng();
  fs.writeFileSync(pngPath, png);
  console.log(item.file, "ok");
}
