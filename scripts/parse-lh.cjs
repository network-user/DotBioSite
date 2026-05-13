const fs = require("fs");
const path = process.argv[2];
const lh = JSON.parse(fs.readFileSync(path, "utf-8"));
const c = lh.categories;
const a = lh.audits;
const pct = (s) => (s == null ? "n/a" : Math.round(s * 100));
console.log("URL:            ", lh.finalDisplayedUrl || lh.requestedUrl);
console.log("Performance:    ", pct(c.performance?.score));
console.log("Accessibility:  ", pct(c.accessibility?.score));
console.log("Best practices: ", pct(c["best-practices"]?.score));
console.log("SEO:            ", pct(c.seo?.score));
console.log("---");
console.log("LCP:", a["largest-contentful-paint"]?.displayValue);
console.log("CLS:", a["cumulative-layout-shift"]?.displayValue);
console.log("TBT:", a["total-blocking-time"]?.displayValue);
console.log("Speed Index:", a["speed-index"]?.displayValue);
console.log("FCP:", a["first-contentful-paint"]?.displayValue);
console.log("---");
const watchCats = ["accessibility", "best-practices", "seo"];
for (const cat of watchCats) {
  const refs = c[cat]?.auditRefs ?? [];
  for (const r of refs) {
    const x = a[r.id];
    if (!x) continue;
    if (x.score !== null && x.score < 1 && x.scoreDisplayMode !== "notApplicable") {
      console.log(`\n[${cat}] ${x.id}: ${x.title}`);
      console.log("   →", x.description?.split("\n")[0] || "");
      const items = x.details?.items ?? [];
      items.slice(0, 5).forEach((it, i) => {
        const node = it.node;
        if (node) {
          console.log(
            `   • node ${i + 1}: ${node.selector || node.snippet?.slice(0, 100) || node.path || ""}`
          );
          if (node.explanation) console.log(`        ${node.explanation.slice(0, 200)}`);
        } else {
          console.log(`   • ${JSON.stringify(it).slice(0, 200)}`);
        }
      });
    }
  }
}
