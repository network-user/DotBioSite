import fs from "fs";
import { Resvg } from "@resvg/resvg-js";

/** @param {string[]} lines */
function labelLines(cx, y, lines) {
  return lines
    .map(
      (line, i) =>
        `<tspan x="${cx}" dy="${i === 0 ? 0 : 20}">${line}</tspan>`,
    )
    .join("");
}

function metric(x, y, w, h, value, unit, labels) {
  const cx = x + w / 2;
  const unitTspan = unit
    ? `<tspan font-size="24" font-weight="700" fill="#e8e8e6"> ${unit}</tspan>`
    : "";
  const labelY = labels.length > 1 ? y + 100 : y + 110;
  return `
  <g>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="#ffffff" fill-opacity="0.05" stroke="#ffffff" stroke-opacity="0.2" stroke-width="1.4"/>
    <text x="${cx}" y="${y + 50}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="44" font-weight="700" fill="#f3f3f1" letter-spacing="-1">${value}${unitTspan}</text>
    <line x1="${x + 24}" y1="${y + 70}" x2="${x + w - 24}" y2="${y + 70}" stroke="#ffffff" stroke-opacity="0.28" stroke-width="1.6"/>
    <text x="${cx}" y="${labelY}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="700" fill="#f3f3f1" stroke="#f3f3f1" stroke-width="0.45" paint-order="stroke fill">${labelLines(cx, labelY, labels)}</text>
  </g>`;
}

function card({ prefix, brand, name, tagline, glyph, metrics, stack }) {
  const gap = 16;
  const padX = 72;
  const row1 = metrics.slice(0, Math.ceil(metrics.length / 2));
  const row2 = metrics.slice(Math.ceil(metrics.length / 2));
  const mw1 = (1200 - padX * 2 - gap * (row1.length - 1)) / row1.length;
  const mw2 = (1200 - padX * 2 - gap * (row2.length - 1)) / row2.length;
  const mh = 148;
  const y1 = 350;
  const y2 = y1 + mh + gap;

  let grid = "";
  row1.forEach((m, i) => {
    grid += metric(padX + i * (mw1 + gap), y1, mw1, mh, m.value, m.unit || "", m.labels);
  });
  row2.forEach((m, i) => {
    grid += metric(padX + i * (mw2 + gap), y2, mw2, mh, m.value, m.unit || "", m.labels);
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 920" width="1200" height="920" role="img" aria-label="${name}">
  <title>${name}</title>
  <defs>
    <linearGradient id="${prefix}-bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0a0b0d"/>
      <stop offset="0.5" stop-color="#14161a"/>
      <stop offset="1" stop-color="#0b0c0e"/>
    </linearGradient>
    <radialGradient id="${prefix}-glow" cx="50%" cy="20%" r="55%">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.12"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="920" fill="url(#${prefix}-bg)"/>
  <rect width="1200" height="920" fill="url(#${prefix}-glow)"/>
  <g opacity="0.045" stroke="#ffffff" stroke-width="1">
    <path d="M0 300 H1200 M0 600 H1200 M400 0 V920 M800 0 V920"/>
  </g>
  ${glyph}
  <text x="600" y="230" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="88" font-weight="700" fill="#f3f3f1" letter-spacing="-2">${brand}</text>
  <text x="600" y="274" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="700" fill="#f3f3f1">${name}</text>
  <text x="600" y="312" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="600" fill="#c8c9cc">${tagline}</text>
  ${grid}
  <text x="600" y="860" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="17" font-weight="700" fill="#b0b1b5">${stack}</text>
</svg>`;
}

const dsGlyph = `
  <svg x="548" y="58" width="104" height="104" viewBox="0 0 48 48">
    <g fill="none" stroke="#f3f3f1" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
      <path d="M8 28 V22 M16 32 V16 M24 35 V13 M32 32 V16 M40 28 V22"/>
    </g>
  </svg>`;

const dlGlyph = `
  <svg x="548" y="58" width="104" height="104" viewBox="0 0 48 48">
    <g fill="none" stroke="#f3f3f1" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
      <path d="M5 19 L24 10 L43 19 L24 28 Z"/>
      <path d="M13 22.5 V31 q11 6 22 0 V22.5"/>
      <path d="M43 19 V29"/>
      <circle cx="43" cy="31.5" r="1.6" fill="#f3f3f1" stroke="none"/>
    </g>
  </svg>`;

const ds = card({
  prefix: "dsf",
  brand: ".\u0437\u0432\u0443\u043A",
  name: "DotSound",
  tagline: "\u043C\u0443\u0437\u044B\u043A\u0430\u043B\u044C\u043D\u0430\u044F \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u0430: HLS, \u043B\u0438\u0440\u0438\u043A\u0430, \u043F\u043E\u0434\u0431\u043E\u0440\u043A\u0438, \u0438\u043C\u043F\u043E\u0440\u0442 \u0441\u043E \u0441\u0442\u0440\u0438\u043C\u0438\u043D\u0433\u043E\u0432",
  glyph: dsGlyph,
  metrics: [
    { value: "~3", unit: "\u043C\u0435\u0441", labels: ["\u0434\u043E \u0440\u0430\u0431\u043E\u0447\u0435\u0433\u043E", "\u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0430"] },
    { value: "395k+", labels: ["\u0441\u0442\u0440\u043E\u043A \u043A\u043E\u0434\u0430", "\u0432 4 \u0440\u0435\u043F\u043E\u0437\u0438\u0442\u043E\u0440\u0438\u044F\u0445"] },
    { value: "543", labels: ["API-", "\u044D\u043D\u0434\u043F\u043E\u0438\u043D\u0442\u043E\u0432"] },
    { value: "3.3k", labels: ["\u0430\u0432\u0442\u043E\u0442\u0435\u0441\u0442\u043E\u0432", "\u0432 \u044D\u043A\u043E\u0441\u0438\u0441\u0442\u0435\u043C\u0435"] },
    { value: "4", labels: ["\u0441\u0435\u0440\u0432\u0438\u0441\u0430:", "API, bot, GPU, core"] },
    { value: "17", labels: ["\u0442\u0438\u043F\u043E\u0432 GPU-", "\u0437\u0430\u0434\u0430\u0447 (ASR)"] },
    { value: "241", labels: ["\u043C\u0438\u0433\u0440\u0430\u0446\u0438\u0439", "PostgreSQL"] },
  ],
  stack: "Python / FastAPI · PostgreSQL · Elasticsearch · Redis · React · Taskiq · MinIO",
});

const dl = card({
  prefix: "dlf",
  brand: ".\u0443\u0447\u0451\u0431\u0430",
  name: "DotLearn",
  tagline: "local-first \u043E\u0431\u0443\u0447\u0435\u043D\u0438\u0435: AI \u043F\u0438\u0448\u0435\u0442 \u0443\u0440\u043E\u043A\u0438, \u043A\u043E\u0434 \u0431\u0435\u0436\u0438\u0442 \u0432 \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0435",
  glyph: dlGlyph,
  metrics: [
    { value: "~3", unit: "\u043D\u0435\u0434", labels: ["\u0434\u043E hardened", "production"] },
    { value: "62", labels: ["\u0433\u043E\u0442\u043E\u0432\u044B\u0445", "\u0443\u0447\u0435\u0431\u043D\u044B\u0445 \u0442\u0435\u043C"] },
    { value: "1449", labels: ["\u0432\u043E\u043F\u0440\u043E\u0441\u043E\u0432 \u0441", "\u0441\u043E\u0431\u0435\u0441\u0435\u0434\u043E\u0432\u0430\u043D\u0438\u0439"] },
    { value: "7", labels: ["\u0442\u0438\u043F\u043E\u0432 \u0443\u043F\u0440\u0430\u0436\u043D\u0435\u043D\u0438\u0439", "\u0432 \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0435"] },
    { value: "79k+", labels: ["\u0441\u0442\u0440\u043E\u043A \u043A\u043E\u0434\u0430", "\u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u044B"] },
    { value: "267k+", labels: ["\u0441\u0442\u0440\u043E\u043A \u0443\u0447\u0435\u0431\u043D\u043E\u0433\u043E", "\u043A\u043E\u043D\u0442\u0435\u043D\u0442\u0430"] },
  ],
  stack: "TypeScript · React · Vite · NestJS · Zod · Monaco · sql.js · Pyodide",
});

for (const [slug, svg] of [
  ["dotsound", ds],
  ["dotlearn", dl],
]) {
  fs.writeFileSync(`public/projects/${slug}/facts.svg`, svg, "utf8");
  const png = new Resvg(Buffer.from(svg, "utf8"), {
    fitTo: { mode: "width", value: 1000 },
  })
    .render()
    .asPng();
  fs.writeFileSync(`public/projects/${slug}/facts.png`, png);
  console.log(slug, "ok");
}
