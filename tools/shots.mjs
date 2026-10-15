// Сплошной проход по странице кадрами в экран + ошибки консоли.
//   node tools/shots.mjs [--w 1440] [--reduced] [--step 0.8] [--from 0] [--to 99] [--intro]
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i === -1 ? d : process.argv[i + 1]; };
const W = parseInt(arg('w', '1440'), 10);
const H = parseInt(arg('h', W < 700 ? '844' : '900'), 10);
const STEP = parseFloat(arg('step', '0.8'));
const FROM = parseInt(arg('from', '0'), 10), TO = parseInt(arg('to', '999'), 10);
const reduced = process.argv.includes('--reduced');
const intro = process.argv.includes('--intro');
const URL = arg('url', 'http://localhost:8390/');
const outDir = 'raw/shots';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ctx = await chromium.launchPersistentContext(path.join(os.tmpdir(), 'territoriya-shot-profile'), {
  channel: 'chrome', headless: true, viewport: { width: W, height: H }, deviceScaleFactor: 1, locale: 'ru-RU',
  isMobile: W < 700, hasTouch: W < 700, reducedMotion: reduced ? 'reduce' : 'no-preference',
});
const page = ctx.pages()[0] || (await ctx.newPage());
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
page.on('response', (r) => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
if (!intro) await page.addInitScript(() => { try { sessionStorage.setItem('tm-intro', '1'); } catch (e) {} });

fs.mkdirSync(outDir, { recursive: true });
for (const f of fs.readdirSync(outDir)) if (f.startsWith(`${W}${reduced ? 'rm' : ''}-`)) fs.unlinkSync(path.join(outDir, f));
await page.goto(URL, { waitUntil: 'load', timeout: 60000 });
const tag = `${W}${reduced ? 'rm' : ''}`;
if (intro) {
  let last = 0;
  for (const t of [150, 450, 700, 950, 1200, 1500, 2200]) { await sleep(t - last); last = t; await page.screenshot({ path: `${outDir}/${tag}-intro-${t}.png` }); }
}
await sleep(1800);
const scrollTo = (y) => page.evaluate((y) => { const l = window.__tm && window.__tm.lenis; if (l) l.scrollTo(y, { immediate: true, force: true }); else window.scrollTo(0, y); }, y);
// разбудить lazy-картинки
const total = await page.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y < total; y += 700) { await scrollTo(y); await sleep(60); }
await scrollTo(0); await sleep(1200);
const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
let i = 0;
const ys = []; for (let y = 0; y < max; y += Math.round(H * STEP)) ys.push(y); ys.push(max);
for (const y of ys) {
  if (i >= FROM && i <= TO) {
    await scrollTo(Math.min(y, max));
    await sleep(1100);
    await page.screenshot({ path: `${outDir}/${tag}-${String(i).padStart(2, '0')}.png` });
  }
  i++;
}
const info = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth, h: document.documentElement.scrollHeight }));
console.log(`кадров: ${i}, высота ${info.h}, scrollWidth ${info.sw} / innerWidth ${info.iw}`);
console.log(errors.length ? 'ОШИБКИ:\n' + [...new Set(errors)].join('\n') : 'ошибок нет');
await ctx.close();
