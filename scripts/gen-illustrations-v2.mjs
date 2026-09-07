import fs from "fs";
import path from "path";
import { Resvg } from "@resvg/resvg-js";

const OUT = "C:\\Users\\User\\PycharmProjects\\untitled\\data";
fs.mkdirSync(OUT, { recursive: true });

const bgDefs = (id) => `
  <defs>
    <linearGradient id="${id}-bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0a0b0d"/>
      <stop offset="0.5" stop-color="#14161a"/>
      <stop offset="1" stop-color="#0b0c0e"/>
    </linearGradient>
    <radialGradient id="${id}-glow" cx="50%" cy="35%" r="60%">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.12"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1600" height="900" fill="url(#${id}-bg)"/>
  <rect width="1600" height="900" fill="url(#${id}-glow)"/>
  <g opacity="0.05" stroke="#ffffff" stroke-width="1">
    <path d="M0 225 H1600 M0 450 H1600 M0 675 H1600 M400 0 V900 M800 0 V900 M1200 0 V900"/>
  </g>`;

function roleChip(x, y, w, label) {
  return `
  <g>
    <rect x="${x}" y="${y}" width="${w}" height="48" rx="10" fill="#ffffff" fill-opacity="0.08" stroke="#ffffff" stroke-opacity="0.55" stroke-width="2"/>
    <text x="${x + w / 2}" y="${y + 31}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="700" fill="#f3f3f1">${label}</text>
  </g>`;
}

const solo = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900" role="img" aria-label="Solo developer with AI agent">
  <title>Illustration 1 · solo + agent</title>
  ${bgDefs("s1")}
  <circle cx="800" cy="420" r="340" fill="#ffffff" fill-opacity="0.035"/>

  <!-- orbit -->
  <circle cx="800" cy="430" r="300" fill="none" stroke="#ffffff" stroke-opacity="0.12" stroke-width="2" stroke-dasharray="6 12"/>

  <!-- roles -->
  ${roleChip(680, 70, 240, "product")}
  ${roleChip(180, 180, 200, "backend")}
  ${roleChip(1220, 180, 210, "frontend")}
  ${roleChip(140, 430, 180, "DevOps")}
  ${roleChip(1280, 430, 140, "QA")}

  <!-- connectors -->
  <g fill="none" stroke="#ffffff" stroke-opacity="0.18" stroke-width="1.5" stroke-dasharray="4 8">
    <path d="M800 118 L800 230"/>
    <path d="M280 228 L560 320"/>
    <path d="M1320 228 L1040 320"/>
    <path d="M230 454 L520 430"/>
    <path d="M1350 454 L1080 430"/>
  </g>

  <!-- IDE -->
  <g>
    <rect x="500" y="200" width="600" height="340" rx="14" fill="#0c0d10" stroke="#f3f3f1" stroke-width="2.5"/>
    <rect x="500" y="200" width="600" height="42" rx="14" fill="#ffffff" fill-opacity="0.08"/>
    <rect x="500" y="230" width="600" height="12" fill="#ffffff" fill-opacity="0.08"/>
    <circle cx="528" cy="221" r="6" fill="#f3f3f1" fill-opacity="0.45"/>
    <circle cx="550" cy="221" r="6" fill="#f3f3f1" fill-opacity="0.28"/>
    <circle cx="572" cy="221" r="6" fill="#f3f3f1" fill-opacity="0.16"/>
    <text x="800" y="227" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="700" fill="#f3f3f1">IDE · agent</text>

    <!-- sidebar -->
    <rect x="516" y="256" width="100" height="268" rx="6" fill="#ffffff" fill-opacity="0.04" stroke="#ffffff" stroke-opacity="0.2" stroke-width="1.5"/>
    <g stroke="#ffffff" stroke-opacity="0.35" stroke-width="2" stroke-linecap="round">
      <path d="M534 290 H592"/>
      <path d="M534 318 H580"/>
      <path d="M534 346 H598"/>
      <path d="M534 374 H570"/>
      <path d="M534 402 H588"/>
      <path d="M534 430 H576"/>
    </g>

    <!-- code -->
    <g font-family="Consolas, monospace" font-size="15" fill="#f3f3f1">
      <text x="640" y="295" fill-opacity="0.75">async def claim_job():</text>
      <text x="640" y="325" fill-opacity="0.55">    job = await queue.pull()</text>
      <text x="640" y="355" fill-opacity="0.6">    await hmac.verify(job)</text>
      <text x="640" y="385" fill-opacity="0.5">    return worker.run(job)</text>
      <rect x="640" y="402" width="10" height="16" fill="#f3f3f1" fill-opacity="0.75"/>
    </g>

    <!-- agent panel -->
    <rect x="960" y="256" width="124" height="268" rx="6" fill="#ffffff" fill-opacity="0.06" stroke="#ffffff" stroke-opacity="0.35" stroke-width="2"/>
    <text x="1022" y="286" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="15" font-weight="700" fill="#f3f3f1">agent</text>
    <rect x="974" y="304" width="96" height="48" rx="8" fill="#ffffff" fill-opacity="0.12"/>
    <text x="1022" y="325" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="12" font-weight="700" fill="#f3f3f1">draft API</text>
    <text x="1022" y="343" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="12" font-weight="700" fill="#d0d1d4">+ tests</text>
    <rect x="974" y="366" width="96" height="48" rx="8" fill="#ffffff" fill-opacity="0.08" stroke="#ffffff" stroke-opacity="0.25" stroke-width="1.5"/>
    <text x="1022" y="387" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="12" font-weight="700" fill="#f3f3f1">review</text>
    <text x="1022" y="405" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="12" font-weight="700" fill="#d0d1d4">ship PR</text>
    <circle cx="1022" cy="480" r="14" fill="none" stroke="#f3f3f1" stroke-width="2.2"/>
    <circle cx="1022" cy="480" r="5" fill="#f3f3f1"/>
  </g>

  <!-- stand + desk + person -->
  <g fill="none" stroke="#f3f3f1" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M800 540 V565"/>
    <path d="M760 565 H840"/>
    <path d="M420 660 H1180"/>
    <path d="M470 660 V740"/>
    <path d="M1130 660 V740"/>
    <path d="M450 740 H560"/>
    <path d="M1040 740 H1150"/>
    <circle cx="800" cy="600" r="26"/>
    <path d="M800 626 V648"/>
    <path d="M735 660 Q800 632 865 660"/>
    <path d="M760 640 Q730 655 705 668"/>
    <path d="M840 640 Q870 655 895 668"/>
  </g>
  <rect x="700" y="668" width="200" height="16" rx="4" fill="#ffffff" fill-opacity="0.08" stroke="#f3f3f1" stroke-width="2"/>

  <text x="800" y="810" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="700" fill="#f3f3f1">\u043E\u0434\u0438\u043D \u0447\u0435\u043B\u043E\u0432\u0435\u043A \u00B7 \u0440\u043E\u043B\u0438 \u0432\u043E\u043A\u0440\u0443\u0433 \u00B7 \u0430\u0433\u0435\u043D\u0442 \u0432 IDE</text>
  <text x="800" y="855" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" fill="#a6a7ab">.\u044F\u0434\u0440\u043E</text>
</svg>`;

const beforeAfter = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900" role="img" aria-label="Before and after AI agents">
  <title>Illustration 2 · before / after</title>
  ${bgDefs("ba")}

  <line x1="800" y1="90" x2="800" y2="740" stroke="#ffffff" stroke-opacity="0.2" stroke-width="2" stroke-dasharray="8 10"/>

  <!-- headers -->
  <rect x="250" y="70" width="300" height="52" rx="10" fill="#ffffff" fill-opacity="0.06" stroke="#ffffff" stroke-opacity="0.35" stroke-width="2"/>
  <text x="400" y="105" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="700" fill="#c8c9cc">\u0414\u041E</text>
  <rect x="1050" y="70" width="300" height="52" rx="10" fill="#ffffff" fill-opacity="0.1" stroke="#f3f3f1" stroke-width="2.2"/>
  <text x="1200" y="105" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="700" fill="#f3f3f1">\u041F\u041E\u0421\u041B\u0415</text>

  <!-- BEFORE -->
  <g>
    <rect x="120" y="160" width="560" height="210" rx="12" fill="#0c0d10" stroke="#ffffff" stroke-opacity="0.4" stroke-width="2"/>
    <rect x="120" y="160" width="560" height="40" rx="12" fill="#ffffff" fill-opacity="0.07"/>
    <rect x="120" y="188" width="560" height="12" fill="#ffffff" fill-opacity="0.07"/>
    <text x="400" y="187" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="700" fill="#f3f3f1">chat · browser</text>
    <rect x="148" y="220" width="240" height="56" rx="8" fill="#ffffff" fill-opacity="0.07" stroke="#ffffff" stroke-opacity="0.2" stroke-width="1.5"/>
    <text x="160" y="244" font-family="Arial, Helvetica, sans-serif" font-size="15" font-weight="700" fill="#f3f3f1">how do I fix CORS?</text>
    <text x="160" y="266" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="600" fill="#a6a7ab">paste stacktrace...</text>
    <rect x="360" y="250" width="290" height="90" rx="8" fill="#ffffff" fill-opacity="0.1"/>
    <text x="376" y="280" font-family="Arial, Helvetica, sans-serif" font-size="15" font-weight="700" fill="#f3f3f1">here is some code...</text>
    <text x="376" y="304" font-family="Consolas, monospace" font-size="13" font-weight="700" fill="#d0d1d4">Access-Control-Allow-...</text>
    <text x="376" y="326" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="700" fill="#f3f3f1">[ Select All ]  [ Copy ]</text>

    <g fill="none" stroke="#f3f3f1" stroke-width="2.4" stroke-linecap="round">
      <path d="M400 380 V420"/>
      <path d="M388 408 L400 420 L412 408"/>
    </g>
    <text x="470" y="410" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="700" fill="#f3f3f1">copy / paste</text>

    <rect x="120" y="440" width="560" height="190" rx="12" fill="#0c0d10" stroke="#ffffff" stroke-opacity="0.35" stroke-width="2"/>
    <rect x="120" y="440" width="560" height="40" rx="12" fill="#ffffff" fill-opacity="0.06"/>
    <rect x="120" y="468" width="560" height="12" fill="#ffffff" fill-opacity="0.06"/>
    <text x="400" y="467" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="700" fill="#f3f3f1">editor</text>
    <text x="160" y="530" font-family="Consolas, monospace" font-size="16" font-weight="700" fill="#f3f3f1" fill-opacity="0.7">def handler(req):</text>
    <text x="160" y="560" font-family="Consolas, monospace" font-size="16" font-weight="700" fill="#f3f3f1" fill-opacity="0.55">    # TODO: paste here</text>
    <text x="160" y="590" font-family="Consolas, monospace" font-size="16" font-weight="700" fill="#f3f3f1" fill-opacity="0.4">    pass</text>

    <text x="400" y="690" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" fill="#d0d1d4">\u0441\u043E\u0431\u0440\u0430\u0442\u044C \u043A\u043E\u043D\u0442\u0435\u043A\u0441\u0442 \u00B7 \u0432\u0441\u0442\u0430\u0432\u0438\u0442\u044C \u00B7 \u0447\u0438\u043D\u0438\u0442\u044C \u0440\u0443\u043A\u0430\u043C\u0438</text>
  </g>

  <!-- AFTER -->
  <g>
    <rect x="920" y="160" width="560" height="470" rx="14" fill="#0c0d10" stroke="#f3f3f1" stroke-width="2.6"/>
    <rect x="920" y="160" width="560" height="44" rx="14" fill="#ffffff" fill-opacity="0.1"/>
    <rect x="920" y="192" width="560" height="12" fill="#ffffff" fill-opacity="0.1"/>
    <circle cx="946" cy="182" r="6" fill="#f3f3f1" fill-opacity="0.5"/>
    <circle cx="968" cy="182" r="6" fill="#f3f3f1" fill-opacity="0.3"/>
    <circle cx="990" cy="182" r="6" fill="#f3f3f1" fill-opacity="0.18"/>
    <text x="1200" y="188" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="17" font-weight="700" fill="#f3f3f1">Cursor · agent</text>

    <rect x="940" y="220" width="90" height="390" rx="6" fill="#ffffff" fill-opacity="0.04" stroke="#ffffff" stroke-opacity="0.2" stroke-width="1.5"/>
    <g stroke="#ffffff" stroke-opacity="0.35" stroke-width="2" stroke-linecap="round">
      <path d="M956 260 H1008"/>
      <path d="M956 292 H996"/>
      <path d="M956 324 H1012"/>
      <path d="M956 356 H990"/>
      <path d="M956 388 H1004"/>
    </g>

    <g font-family="Consolas, monospace" font-size="15" fill="#f3f3f1">
      <text x="1050" y="265" fill-opacity="0.8">@router.post("/jobs/claim")</text>
      <text x="1050" y="295" fill-opacity="0.65">async def claim(job_id):</text>
      <text x="1050" y="325" fill-opacity="0.55">    await hmac.verify(...)</text>
      <text x="1050" y="355" fill-opacity="0.5">    return await worker.run()</text>
      <rect x="1050" y="372" width="10" height="16" fill="#f3f3f1" fill-opacity="0.8"/>
    </g>

    <rect x="1280" y="220" width="180" height="390" rx="8" fill="#ffffff" fill-opacity="0.06" stroke="#ffffff" stroke-opacity="0.4" stroke-width="2"/>
    <text x="1370" y="255" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="700" fill="#f3f3f1">agent</text>

    <rect x="1296" y="278" width="148" height="64" rx="8" fill="#ffffff" fill-opacity="0.12"/>
    <text x="1370" y="305" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="700" fill="#f3f3f1">reads the repo</text>
    <text x="1370" y="326" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="700" fill="#d0d1d4">builds context</text>

    <rect x="1296" y="360" width="148" height="64" rx="8" fill="#ffffff" fill-opacity="0.09" stroke="#ffffff" stroke-opacity="0.25" stroke-width="1.5"/>
    <text x="1370" y="387" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="700" fill="#f3f3f1">edits files</text>
    <text x="1370" y="408" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="700" fill="#d0d1d4">runs tests</text>

    <rect x="1296" y="442" width="148" height="64" rx="8" fill="#ffffff" fill-opacity="0.12"/>
    <text x="1370" y="469" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="700" fill="#f3f3f1">opens PR</text>
    <text x="1370" y="490" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="700" fill="#d0d1d4">iterates</text>

    <circle cx="1370" cy="560" r="16" fill="none" stroke="#f3f3f1" stroke-width="2.4"/>
    <circle cx="1370" cy="560" r="6" fill="#f3f3f1"/>

    <text x="1200" y="690" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" fill="#f3f3f1">\u0430\u0433\u0435\u043D\u0442 \u0432 IDE \u00B7 \u043A\u043E\u043D\u0442\u0435\u043A\u0441\u0442 \u0441\u0430\u043C \u00B7 \u0441\u043A\u043E\u0440\u043E\u0441\u0442\u044C \u0440\u0430\u0441\u0442\u0451\u0442</text>
  </g>

  <text x="800" y="800" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="700" fill="#f3f3f1">\u043A\u043E\u043F\u0438\u043F\u0430\u0441\u0442 \u0438\u0437 \u0447\u0430\u0442\u0430  \u2192  \u0430\u0433\u0435\u043D\u0442\u043D\u0430\u044F \u0440\u0430\u0437\u0440\u0430\u0431\u043E\u0442\u043A\u0430 \u0432 Cursor</text>
  <text x="800" y="850" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" fill="#a6a7ab">.\u044F\u0434\u0440\u043E</text>
</svg>`;

function writeBoth(name, svg) {
  const svgPath = path.join(OUT, `${name}.svg`);
  const pngPath = path.join(OUT, `${name}.png`);
  fs.writeFileSync(svgPath, svg, "utf8");
  const png = new Resvg(Buffer.from(svg, "utf8"), {
    fitTo: { mode: "width", value: 1400 },
  })
    .render()
    .asPng();
  fs.writeFileSync(pngPath, png);
  console.log(name, png.length);
}

writeBoth("illust-1-solo-agent-svg", solo);
writeBoth("illust-2-before-after-svg", beforeAfter);
