// Runs Lighthouse against a running production server.
//
//   ENABLE_DEV_UI=true npm run build
//   ENABLE_DEV_UI=true npm run start -- -p 3100
//   npm run lighthouse -- http://localhost:3100/dev/ui
//
// The optional second argument is the minimum accessibility score (default 95).

import { chromium } from "@playwright/test";
import * as chromeLauncher from "chrome-launcher";
import lighthouse from "lighthouse";

const url = process.argv[2] ?? "http://localhost:3100/dev/ui";
const minimumScore = Number(process.argv[3] ?? 95);

const chrome = await chromeLauncher.launch({
  chromePath: chromium.executablePath(),
  chromeFlags: ["--headless=new", "--no-sandbox"],
});

let accessibility = 0;

try {
  for (const formFactor of ["mobile", "desktop"]) {
    const result = await lighthouse(url, {
      port: chrome.port,
      logLevel: "error",
      output: "json",
      onlyCategories: ["accessibility"],
      formFactor,
      screenEmulation:
        formFactor === "desktop"
          ? { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false }
          : undefined,
    });

    const score = Math.round((result.lhr.categories.accessibility.score ?? 0) * 100);
    console.log(`${formFactor}: accessibility ${score}`);

    for (const audit of Object.values(result.lhr.audits)) {
      if (audit.score !== null && audit.score < 1 && audit.scoreDisplayMode !== "notApplicable") {
        console.log(`  failed: ${audit.id}: ${audit.title}`);
      }
    }

    accessibility = accessibility === 0 ? score : Math.min(accessibility, score);
  }
} finally {
  await chrome.kill();
}

if (accessibility < minimumScore) {
  console.error(`Accessibility ${accessibility} is below ${minimumScore}.`);
  process.exit(1);
}
