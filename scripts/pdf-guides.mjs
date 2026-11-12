// Optional export: npm run guides first, then node scripts/pdf-guides.mjs.
import { chromium } from "@playwright/test";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
const browser = await chromium.launch({
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
    (process.env.CI ? undefined : "/usr/bin/chromium"),
  args: process.env.CI ? [] : ["--no-sandbox"],
});
try {
  const page = await browser.newPage();
  await page.route("https://**/*", (route) => route.abort());
  const files = (await readdir("release/guides")).filter((f) =>
    f.endsWith(".html"),
  );
  for (const file of files) {
    await page.setContent(
      await readFile(resolve("release/guides", file), "utf8"),
    );
    await page.pdf({
      path: resolve("release/guides", file.replace(".html", ".pdf")),
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      outline: true,
      tagged: true,
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate:
        '<div style="font-size:9px;width:100%;text-align:center;color:#526357">Spanish321 · <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
    });
  }
  console.log(
    `Printed ${files.length} unit, course and assessment PDF guides from the generated HTML; no external media was loaded.`,
  );
} finally {
  await browser.close();
}
