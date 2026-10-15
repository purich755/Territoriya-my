// Качает фото Яндекс.Карт в raw/photos/ (самый крупный доступный размер).
import fs from 'node:fs'; import path from 'node:path';
const SIZES = ['orig', 'XXXL', 'XXL', 'XL', 'L'];
const list = JSON.parse(fs.readFileSync('raw/ya-photos.json', 'utf8'));
fs.mkdirSync('raw/photos', { recursive: true });
let n = 0, ok = 0;
for (const p of list) {
  const id = `ya${String(++n).padStart(3, '0')}`;
  const dest = path.join('raw/photos', `${id}.jpg`);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 20000) { ok++; continue; }
  let best = null;
  for (const s of SIZES) {
    try {
      const r = await fetch(p.base + s, { headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://yandex.ru/' } });
      if (!r.ok) continue;
      const b = Buffer.from(await r.arrayBuffer());
      if (b.length < 20000) continue;
      best = { b, s }; break;
    } catch {}
  }
  if (best) { fs.writeFileSync(dest, best.b); ok++; console.log(`${id} ✓ ${best.s} ${(best.b.length / 1024).toFixed(0)}КБ`); }
  else console.log(`${id} ✗`);
}
console.log(`Готово: ${ok}/${list.length}`);
