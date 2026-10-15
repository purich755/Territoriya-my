// Скачивает все фото (и превью видео) из raw/tg/posts.json в raw/tg/img/.
// Имя файла: p<номер поста>-<n>.jpg / v<номер поста>-<n>.jpg — по нему потом ищем текст поста.
import fs from 'node:fs';

const posts = Object.values(JSON.parse(fs.readFileSync('raw/tg/posts.json', 'utf8')));
fs.mkdirSync('raw/tg/img', { recursive: true });
const jobs = [];
for (const p of posts) {
  p.photos.forEach((u, i) => jobs.push([u, `raw/tg/img/p${String(p.id).padStart(3, '0')}-${i}.jpg`]));
  if (process.argv.includes("--thumbs")) p.thumbs.forEach((u, i) => jobs.push([u, `raw/tg/img/v${String(p.id).padStart(3, '0')}-${i}.jpg`]));
}
let ok = 0, fail = 0;
const worker = async () => {
  while (jobs.length) {
    const [u, f] = jobs.shift();
    if (fs.existsSync(f)) { ok++; continue; }
    try {
      const r = await fetch(u);
      if (!r.ok) throw new Error(r.status);
      fs.writeFileSync(f, Buffer.from(await r.arrayBuffer()));
      ok++;
    } catch (e) { fail++; console.log('fail', f, e.message); }
  }
};
await Promise.all(Array.from({ length: 8 }, worker));
console.log('ok', ok, 'fail', fail);
