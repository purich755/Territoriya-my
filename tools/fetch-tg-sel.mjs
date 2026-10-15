// Качает фото только из выбранных постов: node tools/fetch-tg-sel.mjs id id ...
import fs from 'node:fs';
const posts = JSON.parse(fs.readFileSync('raw/tg/posts.json', 'utf8'));
const ids = process.argv.slice(2).map(Number);
const jobs = [];
for (const id of ids) (posts[id]?.photos || []).forEach((u, i) => jobs.push([u, `raw/tg/sel/p${id}-${i}.jpg`]));
fs.mkdirSync('raw/tg/sel', { recursive: true });
let ok = 0;
const worker = async () => { while (jobs.length) { const [u, f] = jobs.shift(); if (fs.existsSync(f)) { ok++; continue; }
  try { const r = await fetch(u); if (!r.ok) throw new Error(r.status); fs.writeFileSync(f, Buffer.from(await r.arrayBuffer())); ok++; } catch (e) { console.log('fail', f, e.message); } } };
await Promise.all(Array.from({ length: 8 }, worker));
console.log('ok', ok);
