// Точечный скриншот секции: node tools/spot.mjs --sel "#atlas" [--w 1440] [--dy 0] [--name atlas] [--hover ".a-hill[data-id=quest]"] [--click sel] [--wait 1500] [--full]
import { chromium } from 'playwright-core';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i === -1 ? d : process.argv[i + 1]; };
const W = +arg('w', 1440), H = +arg('h', W < 700 ? 844 : 900), sel = arg('sel', 'body'), dy = +arg('dy', 0), name = arg('name', 'spot');
const reduced = process.argv.includes('--reduced');
const ctx = await chromium.launchPersistentContext(path.join(os.tmpdir(), 'territoriya-spot'), {
  channel: 'chrome', headless: true, viewport: { width: W, height: H }, deviceScaleFactor: 1, locale: 'ru-RU',
  isMobile: W < 700, hasTouch: W < 700, reducedMotion: reduced ? 'reduce' : 'no-preference',
});
const page = ctx.pages()[0] || (await ctx.newPage());
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
if (!process.argv.includes('--intro')) await page.addInitScript(() => { try { sessionStorage.setItem('tm-intro', '1'); } catch (e) {} });
await page.goto(arg('url', 'http://localhost:8390/'), { waitUntil: 'load' });
await page.waitForTimeout(1200);
const sleep = (ms) => page.waitForTimeout(ms);
const y = await page.evaluate(([s, dy]) => { const el = document.querySelector(s); const pin = el.closest('.pin-spacer') || el; return pin.getBoundingClientRect().top + scrollY + dy; }, [sel, dy]);
// разбудить lazy по пути
for (let yy = 0; yy < y; yy += 800) { await page.evaluate((v) => { const l = window.__tm && window.__tm.lenis; l ? l.scrollTo(v, { immediate: true, force: true }) : scrollTo(0, v); }, yy); await sleep(40); }
await page.evaluate((v) => { const l = window.__tm && window.__tm.lenis; l ? l.scrollTo(v, { immediate: true, force: true }) : scrollTo(0, v); }, y);
await sleep(+arg('wait', 1600));
const hv = arg('hover', null);
if (hv) { const b = await page.locator(hv).first().boundingBox(); if (b) await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await sleep(900); }
const ck = arg('click', null);
if (ck) { await page.locator(ck).first().click(); await sleep(+arg('after', 1200)); }
fs.mkdirSync('raw/shots', { recursive: true });
await page.screenshot({ path: `raw/shots/spot-${name}-${W}.png`, fullPage: process.argv.includes('--full') });
console.log(`raw/shots/spot-${name}-${W}.png`, errors.length ? '\nОШИБКИ: ' + errors.join('\n') : '');
await ctx.close();
