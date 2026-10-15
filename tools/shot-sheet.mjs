// Склейка скриншотов в листы для быстрого просмотра: node tools/shot-sheet.mjs <prefix> [cols] [cellW] [perSheet]
import sharp from 'sharp'; import fs from 'node:fs';
const pre = process.argv[2] || '1440-', COLS = +(process.argv[3] || 2), CW = +(process.argv[4] || 720), PER = +(process.argv[5] || 6);
const files = fs.readdirSync('raw/shots').filter((f) => f.startsWith(pre) && f.endsWith('.png')).sort();
for (let p = 0; p * PER < files.length; p++) {
  const chunk = files.slice(p * PER, (p + 1) * PER);
  const m = await sharp('raw/shots/' + chunk[0]).metadata();
  const CH = Math.round(CW * m.height / m.width);
  const comps = [];
  for (let i = 0; i < chunk.length; i++) {
    comps.push({ input: await sharp('raw/shots/' + chunk[i]).resize(CW, CH).toBuffer(), left: (i % COLS) * (CW + 6), top: Math.floor(i / COLS) * (CH + 26) + 20 });
    comps.push({ input: Buffer.from(`<svg width="${CW}" height="20"><text x="4" y="15" font-family="monospace" font-size="14" fill="#0f0">${chunk[i]}</text></svg>`), left: (i % COLS) * (CW + 6), top: Math.floor(i / COLS) * (CH + 26) });
  }
  const rows = Math.ceil(chunk.length / COLS);
  const out = `raw/sheet-${pre}${p + 1}.jpg`;
  await sharp({ create: { width: COLS * (CW + 6), height: rows * (CH + 26), channels: 3, background: '#333' } }).composite(comps).jpeg({ quality: 80 }).toFile(out);
  console.log(out);
}
