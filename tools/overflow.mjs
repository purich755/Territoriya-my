// Горизонтальный скролл и ошибки на разных ширинах: node tools/overflow.mjs
import { chromium } from 'playwright-core';
const b = await chromium.launch({ channel: 'chrome', headless: true });
for (const w of [360, 375, 768, 1024, 1440, 1920]) {
  const ctx = await b.newContext({ viewport: { width: w, height: w < 700 ? 780 : 900 }, isMobile: w < 700, hasTouch: w < 700 });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await p.addInitScript(() => sessionStorage.setItem('tm-intro', '1'));
  await p.goto('http://localhost:8390/', { waitUntil: 'load' }); await p.waitForTimeout(1500);
  const H = await p.evaluate(() => document.documentElement.scrollHeight);
  let worst = 0, at = 0;
  for (let y = 0; y < H; y += 600) {
    await p.evaluate((y) => window.__tm.lenis ? window.__tm.lenis.scrollTo(y, { immediate: true, force: true }) : scrollTo(0, y), y); await p.waitForTimeout(60);
    const sw = await p.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth);
    if (sw > worst) { worst = sw; at = y; }
  }
  const wide = await p.evaluate(() => [...document.querySelectorAll('main *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width && r.right > innerWidth + 2 && !e.closest('.shifts-track, .atlas-swipe, .legend-run, .hero-pins, .edge, .desk, .moved-map, .voices-quote, .intro'); }).slice(0, 5).map((e) => (typeof e.className === 'string' ? e.className : e.tagName)));
  console.log(w, 'лишняя ширина', worst, worst ? 'на y=' + at : '', 'высота', H, wide.length ? 'вылезают: ' + wide.join(', ') : '', errs.length ? 'ОШИБКИ ' + errs.join(' | ') : '');
  await ctx.close();
}
await b.close();
