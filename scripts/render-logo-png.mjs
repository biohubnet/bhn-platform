/* Re-render public/biohubnet-logo.png from public/biohubnet-logo.svg.
 *
 * The PNG is the asset the public showcase pages embed (<img
 * src="/biohubnet-logo.png">), so whenever the SVG lockup changes the
 * PNG must be regenerated to match. Renders via headless Chromium
 * (Playwright is already a dev dependency) at 2× so text stays crisp,
 * with a transparent background.
 *
 * Run: node scripts/render-logo-png.mjs
 */
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const svg = readFileSync(path.join(root, "public/biohubnet-logo.svg"), "utf8");

// Match the SVG's 1140×310 viewBox at 2× density.
const WIDTH = 1140;
const HEIGHT = 310;

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: WIDTH, height: HEIGHT },
  deviceScaleFactor: 2,
});
await page.setContent(
  `<!doctype html><html><body style="margin:0">${svg.replace(
    "<svg ",
    `<svg width="${WIDTH}" height="${HEIGHT}" `,
  )}</body></html>`,
);
await page.screenshot({
  path: path.join(root, "public/biohubnet-logo.png"),
  omitBackground: true,
});
await browser.close();
console.log(`public/biohubnet-logo.png — ${WIDTH * 2}×${HEIGHT * 2} rendered.`);
