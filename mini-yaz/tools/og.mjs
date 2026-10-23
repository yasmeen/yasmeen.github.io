// Renders the link preview image: node mini-yaz/tools/og.mjs [base url]  ->  assets/img/og.png
import { chromium } from 'playwright';
const base = process.argv[2] || 'http://localhost:8130';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.goto(base + '/mini-yaz/tools/og.html');
await page.waitForFunction(() => window.ready === true, null, { timeout: 60000 });
await page.evaluate(() => { window.yaz.step(300); window.yaz.startNow('wave'); window.yaz.step(1150); });
await page.screenshot({ path: 'assets/img/og.png' });
await browser.close();
console.log('wrote assets/img/og.png');
