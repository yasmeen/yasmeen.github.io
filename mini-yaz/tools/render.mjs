// Renders Mini Yaz to transparent images with a headless Chromium (Playwright), using stage.html.
//   node mini-yaz/tools/render.mjs <jobs.json> [base url, default http://localhost:8130]
// Needs the repo served locally by any static server, e.g. `npx http-server -p 8130`.
// jobs.json (paths are relative to the repo root):
//   [{ "name": "art-run", "w": 360,                       // layout box width in px (the box is 292:343)
//      "opts": { "stance": "idle", "props": ["shoes"], "posed": { "aRx": -0.6 } },   // createMiniYaz options
//      "steps": [{ "start": "wave" }, { "ms": 900 }],      // actions to start and time to advance
//      "crop": [-0.06, -0.22, 1.16, 1.22],                 // x, y, width, height in box units (default: whole canvas)
//      "out": "assets/img/art-run.webp", "quality": 0.9 }]
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const [,, jobsFile, base = 'http://localhost:8130'] = process.argv;
const jobs = JSON.parse(readFileSync(jobsFile, 'utf8'));
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM || undefined,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
});
for (const job of jobs) {
  const w = job.w || 583, h = w * 343 / 292;
  const page = await browser.newPage({ viewport: { width: Math.ceil(w * 1.4), height: Math.ceil(h * 1.3) }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${base}/mini-yaz/tools/stage.html#${encodeURIComponent(JSON.stringify({ w, opts: job.opts || {} }))}`);
  await page.waitForFunction(() => window.ready === true, null, { timeout: 60000 });
  for (const s of job.steps || [{ ms: 700 }]) {
    if (s.start) await page.evaluate((k) => window.yaz.startNow(k), s.start);
    if (s.point) await page.evaluate((p) => window.yaz.pointAt(p[0], p[1]), s.point);
    if (s.ms) await page.evaluate((ms) => window.yaz.step(ms), s.ms);
  }
  const type = job.out.endsWith('.png') ? 'image/png' : 'image/webp';
  const url = await page.evaluate(([crop, w, h, type, q]) => {
    const c = window.yaz.canvas;
    const r = crop ? [0.2 * w + crop[0] * w, 0.3 * h + crop[1] * h, crop[2] * w, crop[3] * h] : [0, 0, c.width, c.height];
    const o = document.createElement('canvas');
    o.width = Math.round(r[2]); o.height = Math.round(r[3]);
    o.getContext('2d').drawImage(c, r[0], r[1], r[2], r[3], 0, 0, o.width, o.height);
    return o.toDataURL(type, q);
  }, [job.crop || null, w, h, type, job.quality ?? 0.9]);
  writeFileSync(job.out, Buffer.from(url.split(',')[1], 'base64'));
  console.log(job.name, '->', job.out, errors.length ? errors : '');
  await page.close();
}
await browser.close();
