// Проверка интерактива реальными действиями мыши/клавиатуры: node tools/interact.mjs [--w 1440]
import { chromium } from 'playwright-core';
import os from 'node:os'; import path from 'node:path'; import fs from 'node:fs';
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i === -1 ? d : process.argv[i + 1]; };
const W = +arg('w', 1440), H = W < 700 ? 844 : 900;
const ctx = await chromium.launchPersistentContext(path.join(os.tmpdir(), 'territoriya-int-' + W), {
  channel: 'chrome', headless: true, viewport: { width: W, height: H }, locale: 'ru-RU', isMobile: W < 700, hasTouch: W < 700,
});
const page = ctx.pages()[0] || (await ctx.newPage());
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
const res = [];
const ok = (name, cond, extra) => { res.push(`${cond ? '✓' : '✗'} ${name}${extra ? ' — ' + extra : ''}`); };
const sleep = (ms) => page.waitForTimeout(ms);
const goTo = async (sel, dy = 0) => {
  const y = await page.evaluate(([s, dy]) => { const el = document.querySelector(s); const p = el.closest('.pin-spacer') || el; return p.getBoundingClientRect().top + scrollY + dy; }, [sel, dy]);
  await page.evaluate((v) => window.__tm.lenis ? window.__tm.lenis.scrollTo(v, { immediate: true, force: true }) : scrollTo(0, v), y);
  await sleep(900);
};
fs.mkdirSync('raw/shots', { recursive: true });

// 1. прелоадер (первый визит)
await page.goto(process.env.URL || 'http://localhost:8390/', { waitUntil: 'domcontentloaded' });
await sleep(500);
const introOn = await page.evaluate(() => !!document.querySelector('#intro.is-running'));
await page.screenshot({ path: `raw/shots/int-intro-${W}.png` });
await sleep(2000);
const introGone = await page.evaluate(() => !document.querySelector('#intro') && /intro-done/.test(document.documentElement.dataset.boot));
ok('прелоадер запустился', introOn); ok('прелоадер ушёл ≤2.5 с', introGone);

// 2. тумблер аудитории
const before = await page.textContent('.hero-lead');
await page.click('[data-set-aud="kid"]'); await sleep(900);
const after = await page.textContent('.hero-lead');
const saved = await page.evaluate(() => localStorage.getItem('tm-aud'));
ok('тумблер меняет тексты', before !== after && /услышат/.test(after), after.trim());
ok('выбор сохранён', saved === 'kid');
await page.click('[data-set-aud="parent"]'); await sleep(700);

// 3. компас
await page.click('.compass-btn'); await sleep(700);
const open = await page.evaluate(() => document.querySelector('#compass').classList.contains('is-open'));
await page.screenshot({ path: `raw/shots/int-compass-${W}.png` });
await page.click('.compass-menu a[href="#faq"]'); await sleep(2000);
const faqTop = await page.evaluate(() => document.querySelector('#faq').getBoundingClientRect().top);
ok('компас открывается', open); ok('якорь из компаса доезжает', Math.abs(faqTop) < 120, 'top=' + Math.round(faqTop));

// 4. аккордеон
await page.click('#q3b'); await sleep(900);
const accH = await page.evaluate(() => document.querySelector('#q3').getBoundingClientRect().height);
ok('аккордеон раскрывается', accH > 40, 'h=' + Math.round(accH));
await page.keyboard.press('Enter'); await sleep(700);
const accClosed = await page.evaluate(() => document.querySelector('#q3').hidden);
ok('аккордеон закрывается с клавиатуры', accClosed);

// 5. отзывы
await goTo('#voices', 100);
await page.click('.vq-marks button[data-q="2"]'); await sleep(1500);
const q = await page.textContent('.vq-text');
ok('цитата переключается', /семья/.test(q));

// 6. архив
await goTo('#archive', 60);
if (W >= 861) {
  const pr = page.locator('.print').nth(3);
  const b0 = await pr.boundingBox();
  await page.mouse.move(b0.x + b0.width / 2, b0.y + b0.height / 2); await page.mouse.down();
  for (let i = 1; i <= 10; i++) { await page.mouse.move(b0.x + b0.width / 2 + i * 18, b0.y + b0.height / 2 + i * 8); await sleep(16); }
  await page.mouse.up(); await sleep(1400);
  const b1 = await pr.boundingBox();
  ok('фото перетаскивается', Math.hypot(b1.x - b0.x, b1.y - b0.y) > 100, `сдвиг ${Math.round(b1.x - b0.x)},${Math.round(b1.y - b0.y)}`);
  const lbBefore = await page.evaluate(() => document.querySelector('#lb').hidden);
  const b2 = await page.locator('.print').nth(7).boundingBox();
  // клик в видимую точку (верхнюю карточку под курсором)
  const pt = await page.evaluate(() => { const b = document.querySelectorAll('.print')[7].getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height * .4 }; });
  void b2;
  await page.mouse.click(pt.x, pt.y); await sleep(1200);
  const lbOpen = await page.evaluate(() => !document.querySelector('#lb').hidden);
  await page.screenshot({ path: `raw/shots/int-lb-${W}.png` });
  ok('клик открывает лайтбокс', lbBefore && lbOpen);
  const c1 = await page.textContent('.lb-n');
  await page.keyboard.press('ArrowRight'); await sleep(700);
  const c2 = await page.textContent('.lb-n');
  ok('стрелка листает', c1 !== c2, `${c1} → ${c2}`);
  await page.keyboard.press('Escape'); await sleep(900);
  ok('Esc закрывает', await page.evaluate(() => document.querySelector('#lb').hidden));
  await page.click('#arrange'); await sleep(1700);
  const rots = await page.evaluate(() => [...document.querySelectorAll('.print')].map((p) => Math.round(gsap.getProperty(p, 'rotation'))));
  await page.screenshot({ path: `raw/shots/int-grid-${W}.png` });
  ok('«Разложить по порядку» выравнивает', rots.every((r) => r === 0), rots.join(','));
  await page.click('#arrange'); await sleep(1500);
} else {
  const topIdx = await page.evaluate(() => [...document.querySelectorAll('.print')].findIndex((p) => p.style.zIndex === '100'));
  const b = await page.locator('.print').nth(topIdx).boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down();
  for (let i = 1; i <= 10; i++) { await page.mouse.move(b.x + b.width / 2 - i * 20, b.y + b.height / 2); await sleep(16); }
  await page.mouse.up(); await sleep(1200);
  const topIdx2 = await page.evaluate(() => [...document.querySelectorAll('.print')].findIndex((p) => p.style.zIndex === '100'));
  ok('свайп снимает верхнее фото', topIdx2 !== topIdx, `${topIdx} → ${topIdx2}`);
  const b2 = await page.locator('.print').nth(topIdx2).boundingBox();
  await page.mouse.click(b2.x + b2.width / 2, b2.y + b2.height / 2); await sleep(1200);
  ok('тап открывает лайтбокс', await page.evaluate(() => !document.querySelector('#lb').hidden));
  await page.screenshot({ path: `raw/shots/int-lb-${W}.png` });
  await page.click('.lb-close'); await sleep(900);
}

// 7. переполнение по ширине
const ov = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth }));
ok('нет горизонтального скролла', ov.sw <= ov.iw, `${ov.sw}/${ov.iw}`);
// 8. подвал виден после прокрутки до конца
await page.evaluate(() => window.__tm.lenis ? window.__tm.lenis.scrollTo(1e6, { immediate: true, force: true }) : scrollTo(0, 1e6)); await sleep(1500);
const ftrOp = await page.evaluate(() => getComputedStyle(document.querySelector('.signs')).opacity);
ok('блок связи виден в конце', +ftrOp > .9, ftrOp);

console.log(res.join('\n'));
console.log(errors.length ? 'ОШИБКИ:\n' + [...new Set(errors)].join('\n') : 'ошибок консоли нет');
await ctx.close();
