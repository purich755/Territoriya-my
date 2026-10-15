// Контактный лист: сетка превью с подписями-номерами.
//   node tools/contact-sheet.mjs <dir> <out-prefix> [cols] [cell]
import sharp from 'sharp'; import fs from 'node:fs'; import path from 'node:path';
const dir = process.argv[2] || 'raw/photos';
const prefix = process.argv[3] || 'raw/sheet';
const COLS = parseInt(process.argv[4] || '6', 10);
const CELL = parseInt(process.argv[5] || '300', 10);
const PER = COLS * Number(process.argv[6] || 5);
const files = fs.readdirSync(dir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort();
for (let page = 0; page * PER < files.length; page++) {
  const chunk = files.slice(page * PER, (page + 1) * PER);
  const rows = Math.ceil(chunk.length / COLS);
  const comps = [];
  for (let i = 0; i < chunk.length; i++) {
    const buf = await sharp(path.join(dir, chunk[i])).resize(CELL, CELL, { fit: 'contain', background: '#222' }).jpeg({ quality: 72 }).toBuffer();
    comps.push({ input: buf, left: (i % COLS) * CELL, top: Math.floor(i / COLS) * (CELL + 22) + 22 });
    const label = Buffer.from(`<svg width="${CELL}" height="22"><rect width="${CELL}" height="22" fill="#111"/><text x="4" y="16" font-family="monospace" font-size="14" fill="#0f0">${chunk[i]}</text></svg>`);
    comps.push({ input: label, left: (i % COLS) * CELL, top: Math.floor(i / COLS) * (CELL + 22) });
  }
  const out = `${prefix}-${page + 1}.jpg`;
  await sharp({ create: { width: COLS * CELL, height: rows * (CELL + 22), channels: 3, background: '#000' } })
    .composite(comps).jpeg({ quality: 74 }).toFile(out);
  console.log('✓', out, chunk.length);
}
