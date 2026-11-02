// Runs Lighthouse against a running production server.
//
//   ENABLE_DEV_UI=true npm run build
//   ENABLE_DEV_UI=true npm run start -- -p 3100
//   npm run lighthouse -- http://localhost:3100/dev/ui
//
// Checks accessibility (minimum 95) and performance (minimum 85).

import { chromium } from "@playwright/test";
import * as chromeLauncher from "chrome-launcher";
import lighthouse, { desktopConfig } from "lighthouse";

const url = process.argv[2] ?? "http://localhost:3100/dev/ui";
const MINIMUMS = { accessibility: 95, performance: 85 };

const chrome = await chromeLauncher.launch({
  chromePath: chromium.executablePath(),
  chromeFlags: ["--headless=new", "--no-sandbox"],
});

let failed = false;

try {
  for (const formFactor of ["mobile", "desktop"]) {
    const result = await lighthouse(
      url,
      {
        port: chrome.port,
        logLevel: "error",
        output: "json",
        onlyCategories: ["accessibility", "performance"],
      },
      formFactor === "desktop" ? desktopConfig : undefined,
    );

    for (const [category, minimum] of Object.entries(MINIMUMS)) {
      const score = Math.round((result.lhr.categories[category].score ?? 0) * 100);
      console.log(`${formFactor} ${category}: ${score}`);
      if (score < minimum) failed = true;
    }

    const lcp = result.lhr.audits["largest-contentful-paint"];
    console.log(`${formFactor} LCP: ${lcp.displayValue}`);
    if (process.env.LH_DEBUG) {
      const d = result.lhr.audits["lcp-breakdown-insight"]?.details?.items ?? result.lhr.audits["largest-contentful-paint-element"]?.details?.items;
      console.log(JSON.stringify(d)?.slice(0, 900));
      console.log("TBT", result.lhr.audits["total-blocking-time"].displayValue, "FCP", result.lhr.audits["first-contentful-paint"].displayValue, "SI", result.lhr.audits["speed-index"].displayValue);
    }

    for (const ref of result.lhr.categories.accessibility.auditRefs) {
      const audit = result.lhr.audits[ref.id];
      if (ref.weight > 0 && audit.score !== null && audit.score < 1) {
        console.log(`  accessibility issue: ${audit.id}`);
      }
    }
  }
} finally {
  await chrome.kill();
}

if (failed) {
  console.error("Below the minimum scores.");
  process.exit(1);
}
