// Выкачка публичной ленты Telegram-канала (t.me/s/<канал>) в raw/tg/posts.json.
//   node tools/dump-tg.mjs [pages=40]
// Идём вглубь через ?before=<id>, из каждого поста берём текст, фото и видео.
import fs from 'node:fs';

const CH = 'tmvkadre';
const PAGES = Number(process.argv[2] || 40);
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36';
const out = 'raw/tg/posts.json';
const posts = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : {};

const decode = (s) => s
  .replace(/<br\s*\/?>/g, '\n').replace(/<[^>]+>/g, '')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');

let before = process.argv[3] || '';
for (let p = 0; p < PAGES; p++) {
  const url = `https://t.me/s/${CH}${before ? '?before=' + before : ''}`;
  const html = await (await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'ru' } })).text();
  // делим по обёрткам сообщений
  const chunks = html.split('<div class="tgme_widget_message_wrap').slice(1);
  if (!chunks.length) { console.log('пусто на', url); break; }
  let minId = Infinity;
  for (const c of chunks) {
    const idm = c.match(/data-post="[^/]+\/(\d+)"/);
    if (!idm) continue;
    const id = Number(idm[1]);
    minId = Math.min(minId, id);
    const txt = c.match(/<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/);
    const photos = [...c.matchAll(/tgme_widget_message_photo_wrap[^"]*"[^>]*background-image:url\('([^']+)'\)/g)].map((m) => m[1]);
    const videos = [...c.matchAll(/<video[^>]+src="([^"]+)"/g)].map((m) => m[1]);
    const thumbs = [...c.matchAll(/tgme_widget_message_video_thumb"[^>]*background-image:url\('([^']+)'\)/g)].map((m) => m[1]);
    const date = (c.match(/datetime="([^"]+)"/) || [])[1];
    posts[id] = { id, date, text: txt ? decode(txt[1]).trim() : '', photos, videos, thumbs };
  }
  console.log(p, url, chunks.length, 'min', minId);
  if (!isFinite(minId) || String(minId) === before) break;
  before = String(minId);
  await new Promise((r) => setTimeout(r, 400));
}
fs.writeFileSync(out, JSON.stringify(posts, null, 1));
const list = Object.values(posts);
console.log('постов', list.length, 'фото', list.reduce((a, p) => a + p.photos.length, 0), 'видео', list.reduce((a, p) => a + p.videos.length, 0));
