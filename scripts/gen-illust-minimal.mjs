import fs from "fs";
import path from "path";
import { Resvg } from "@resvg/resvg-js";

const OUT = "C:\\Users\\User\\PycharmProjects\\untitled\\data";
fs.mkdirSync(OUT, { recursive: true });

function frame(id) {
  return `
  <defs>
    <linearGradient id="${id}-bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0a0b0d"/>
      <stop offset="0.5" stop-color="#14161a"/>
      <stop offset="1" stop-color="#0b0c0e"/>
    </linearGradient>
    <radialGradient id="${id}-glow" cx="50%" cy="32%" r="58%">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.12"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1600" height="900" fill="url(#${id}-bg)"/>
  <rect width="1600" height="900" fill="url(#${id}-glow)"/>
  <g opacity="0.045" stroke="#ffffff" stroke-width="1">
    <path d="M0 225 H1600 M0 450 H1600 M0 675 H1600 M400 0 V900 M800 0 V900 M1200 0 V900"/>
  </g>`;
}

// Illustration 1 — almost no text: roles as faint glyphs, IDE as pure geometry
const solo = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900" role="img" aria-label="Solo + agent">
  <title>illust-1 minimal</title>
  ${frame("m1")}
  <circle cx="800" cy="400" r="320" fill="#ffffff" fill-opacity="0.03"/>
  <circle cx="800" cy="400" r="280" fill="none" stroke="#ffffff" stroke-opacity="0.07" stroke-width="1" stroke-dasharray="4 10"/>

  <!-- role nodes: dots only, no words -->
  <g fill="#f3f3f1">
    <circle cx="800" cy="120" r="5" fill-opacity="0.55"/>
    <circle cx="430" cy="220" r="5" fill-opacity="0.4"/>
    <circle cx="1170" cy="220" r="5" fill-opacity="0.4"/>
    <circle cx="320" cy="430" r="5" fill-opacity="0.35"/>
    <circle cx="1280" cy="430" r="5" fill-opacity="0.35"/>
  </g>
  <g fill="none" stroke="#ffffff" stroke-opacity="0.12" stroke-width="1" stroke-dasharray="3 8">
    <path d="M800 125 L800 250"/>
    <path d="M430 220 L560 320"/>
    <path d="M1170 220 L1040 320"/>
    <path d="M320 430 L520 400"/>
    <path d="M1280 430 L1080 400"/>
  </g>

  <!-- IDE window: geometry only -->
  <rect x="560" y="230" width="480" height="280" rx="12" fill="#0c0d10" stroke="#f3f3f1" stroke-width="2"/>
  <rect x="560" y="230" width="480" height="34" rx="12" fill="#ffffff" fill-opacity="0.06"/>
  <rect x="560" y="252" width="480" height="12" fill="#ffffff" fill-opacity="0.06"/>
  <circle cx="582" cy="247" r="4" fill="#f3f3f1" fill-opacity="0.35"/>
  <circle cx="598" cy="247" r="4" fill="#f3f3f1" fill-opacity="0.22"/>
  <circle cx="614" cy="247" r="4" fill="#f3f3f1" fill-opacity="0.12"/>

  <!-- panes -->
  <rect x="576" y="278" width="78" height="214" rx="4" fill="#ffffff" fill-opacity="0.03" stroke="#ffffff" stroke-opacity="0.12"/>
  <g stroke="#ffffff" stroke-opacity="0.18" stroke-width="1.5" stroke-linecap="round">
    <path d="M592 304 H636"/><path d="M592 328 H628"/><path d="M592 352 H640"/><path d="M592 376 H622"/>
  </g>
  <g stroke="#ffffff" stroke-opacity="0.22" stroke-width="1.5" stroke-linecap="round">
    <path d="M680 310 H900"/><path d="M680 338 H860"/><path d="M680 366 H880"/><path d="M680 394 H840"/>
    <rect x="680" y="416" width="8" height="12" fill="#f3f3f1" fill-opacity="0.45" stroke="none"/>
  </g>
  <!-- agent pane: pulse only -->
  <rect x="920" y="278" width="100" height="214" rx="4" fill="#ffffff" fill-opacity="0.04" stroke="#ffffff" stroke-opacity="0.22"/>
  <circle cx="970" cy="385" r="12" fill="none" stroke="#f3f3f1" stroke-opacity="0.55" stroke-width="1.8"/>
  <circle cx="970" cy="385" r="4" fill="#f3f3f1" fill-opacity="0.75"/>

  <!-- stand + desk + person -->
  <g fill="none" stroke="#f3f3f1" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M800 510 V540"/><path d="M760 540 H840"/>
    <path d="M480 640 H1120"/><path d="M520 640 V720"/><path d="M1080 640 V720"/>
    <circle cx="800" cy="575" r="24"/>
    <path d="M800 599 V620"/>
    <path d="M740 640 Q800 615 860 640"/>
    <path d="M760 622 Q735 638 710 652"/><path d="M840 622 Q865 638 890 652"/>
  </g>

  <text x="800" y="820" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="700" fill="#5a5c63">.\u044F\u0434\u0440\u043E</text>
</svg>`;

// Illustration 2 — ДО / ПОСЛЕ as geometry, almost no copy
const beforeAfter = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900" role="img" aria-label="Before / after">
  <title>illust-2 minimal</title>
  ${frame("m2")}
  <line x1="800" y1="140" x2="800" y2="720" stroke="#ffffff" stroke-opacity="0.14" stroke-width="1.5" stroke-dasharray="6 10"/>

  <text x="400" y="120" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="700" fill="#8a8b90" letter-spacing="4">\u0414\u041E</text>
  <text x="1200" y="120" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="700" fill="#f3f3f1" letter-spacing="4">\u041F\u041E\u0421\u041B\u0415</text>

  <!-- BEFORE: two stacked windows + arrow -->
  <g opacity="0.75">
    <rect x="200" y="180" width="400" height="180" rx="10" fill="#0c0d10" stroke="#ffffff" stroke-opacity="0.3" stroke-width="1.8"/>
    <rect x="200" y="180" width="400" height="28" rx="10" fill="#ffffff" fill-opacity="0.05"/>
    <rect x="200" y="198" width="400" height="10" fill="#ffffff" fill-opacity="0.05"/>
    <rect x="228" y="230" width="160" height="40" rx="6" fill="#ffffff" fill-opacity="0.06"/>
    <rect x="360" y="280" width="200" height="50" rx="6" fill="#ffffff" fill-opacity="0.09"/>

    <g fill="none" stroke="#f3f3f1" stroke-width="2" stroke-linecap="round" opacity="0.45">
      <path d="M400 375 V415"/><path d="M390 405 L400 415 L410 405"/>
    </g>

    <rect x="200" y="440" width="400" height="180" rx="10" fill="#0c0d10" stroke="#ffffff" stroke-opacity="0.25" stroke-width="1.8"/>
    <rect x="200" y="440" width="400" height="28" rx="10" fill="#ffffff" fill-opacity="0.04"/>
    <rect x="200" y="458" width="400" height="10" fill="#ffffff" fill-opacity="0.04"/>
    <g stroke="#ffffff" stroke-opacity="0.2" stroke-width="1.5" stroke-linecap="round">
      <path d="M240 520 H480"/><path d="M240 550 H420"/><path d="M240 580 H400"/>
    </g>
  </g>

  <!-- AFTER: one IDE + agent pulse -->
  <g>
    <rect x="1000" y="180" width="400" height="440" rx="12" fill="#0c0d10" stroke="#f3f3f1" stroke-width="2"/>
    <rect x="1000" y="180" width="400" height="32" rx="12" fill="#ffffff" fill-opacity="0.07"/>
    <rect x="1000" y="200" width="400" height="12" fill="#ffffff" fill-opacity="0.07"/>
    <circle cx="1024" cy="196" r="4" fill="#f3f3f1" fill-opacity="0.4"/>
    <circle cx="1040" cy="196" r="4" fill="#f3f3f1" fill-opacity="0.25"/>
    <circle cx="1056" cy="196" r="4" fill="#f3f3f1" fill-opacity="0.14"/>

    <rect x="1020" y="230" width="70" height="370" rx="4" fill="#ffffff" fill-opacity="0.03" stroke="#ffffff" stroke-opacity="0.12"/>
    <g stroke="#ffffff" stroke-opacity="0.2" stroke-width="1.5" stroke-linecap="round">
      <path d="M1110 270 H1280"/><path d="M1110 300 H1250"/><path d="M1110 330 H1270"/><path d="M1110 360 H1230"/>
      <rect x="1110" y="382" width="7" height="12" fill="#f3f3f1" fill-opacity="0.5" stroke="none"/>
    </g>
    <rect x="1300" y="230" width="80" height="370" rx="4" fill="#ffffff" fill-opacity="0.05" stroke="#ffffff" stroke-opacity="0.25"/>
    <circle cx="1340" cy="420" r="14" fill="none" stroke="#f3f3f1" stroke-opacity="0.55" stroke-width="1.8"/>
    <circle cx="1340" cy="420" r="5" fill="#f3f3f1" fill-opacity="0.8"/>
  </g>

  <text x="800" y="820" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="700" fill="#5a5c63">.\u044F\u0434\u0440\u043E</text>
</svg>`;

function write(name, svg) {
  fs.writeFileSync(path.join(OUT, `${name}.svg`), svg, "utf8");
  const png = new Resvg(Buffer.from(svg, "utf8"), {
    fitTo: { mode: "width", value: 1400 },
  })
    .render()
    .asPng();
  fs.writeFileSync(path.join(OUT, `${name}.png`), png);
  console.log(name, "ok");
}

write("illust-1-solo-min-svg", solo);
write("illust-2-before-after-min-svg", beforeAfter);
