// Одноразовая подстановка: контур РТ и отпечатки архива в index.html
import fs from 'node:fs';
const m = JSON.parse(fs.readFileSync('raw/manifest.json', 'utf8'));
let html = fs.readFileSync('index.html', 'utf8');
const d = fs.readFileSync('raw/tatarstan-path.txt', 'utf8');
html = html.split('{{TATARSTAN}}').join(d);
const items = [];
for (let i = 1; i <= 18; i++) {
  const n = String(i).padStart(2, '0'), t = m[`arch-${n}-t`], f = m[`arch-${n}`];
  const alt = t.alt.replace(/"/g, '&quot;');
  items.push(`<li class="print"><button type="button" class="print-btn" data-i="${i - 1}" data-full="assets/img/arch-${n}.webp" data-fw="${f.w}" data-fh="${f.h}" aria-label="Открыть фото: ${alt}" data-cursor="тащи"><img src="assets/img/arch-${n}-t.webp" width="${t.w}" height="${t.h}" loading="lazy" decoding="async" alt="${alt}" draggable="false"><span class="print-no mono" aria-hidden="true">${n}</span></button></li>`);
}
html = html.replace('{{ARCHIVE}}', items.join('\n      '));
fs.writeFileSync('index.html', html);
console.log('ok', html.length);
