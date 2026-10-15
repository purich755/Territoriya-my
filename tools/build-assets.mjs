// Сборка картинок сайта из raw/ в assets/img/ (WebP, ≤300 КБ, понятные имена).
//   node tools/build-assets.mjs
// ya### — галерея Яндекс.Карт (raw/photos), p<пост>-<n> — фото из t.me/s/tmvkadre (raw/tg/img или raw/tg/sel).
import sharp from 'sharp';
import fs from 'node:fs';

const src = (id) => {
  if (id.startsWith('ya')) return `raw/photos/${id}.jpg`;
  for (const d of ['raw/tg/sel', 'raw/tg/img']) if (fs.existsSync(`${d}/${id}.jpg`)) return `${d}/${id}.jpg`;
  throw new Error('нет ' + id);
};
const OUT = 'assets/img';
fs.mkdirSync(OUT, { recursive: true });

// [имя, источник, { w, h, position } | { long }, alt]
const PLAN = [
  ['hero-stage', 'ya004', { w: 760, h: 520 }, 'Отряды на большой сцене на фоне экрана с надписью «Территория МЫ»'],
  ['hero-laugh', 'ya010', { w: 560, h: 700, position: 'attention' }, 'Ребята смеются на вечернем мероприятии'],
  ['hero-light', 'p12711-6', { w: 560, h: 560 }, 'Участница в оранжевом световом кольце на мастер-классе по световой живописи'],
  ['hero-dance', 'ya008', { w: 640, h: 480 }, 'Весь лагерь танцует на улице'],

  ['base-regina', 'p12130-0', { w: 900, h: 640 }, 'Большой круг участников перед корпусом ГК «Регина»'],

  ['atlas-krug', 'p8973-8', { w: 720, h: 480 }, 'Отряд стоит в кругу, держась за руки'],
  ['atlas-vecherka', 'ya012', { w: 720, h: 480 }, 'Отряд в одинаковых футболках выступает на вечерней сцене'],
  ['atlas-vizitki', 'p12370-7', { w: 720, h: 480 }, 'Отряд показывает визитку на сцене'],
  ['atlas-quest', 'p12130-5', { w: 720, h: 480, position: 'attention' }, 'Участники в плащах и масках — вечерняя мистерия'],
  ['atlas-kvn', 'ya019', { w: 720, h: 480 }, 'Отряд смеётся на сцене во время выступления с микрофоном'],
  ['atlas-pautinka', 'p13866-3', { w: 720, h: 480 }, 'Ребята пробираются через натянутые верёвки «Паутинки»'],
  ['atlas-turnir', 'p11805-0', { w: 720, h: 480 }, 'Команды после турнира с воздушными шарами'],

  ['shift-quest', 'ya015', { w: 1200, h: 1400, position: 'attention' }, 'Участники в костюмах: пиджак, корона, бабочка — сюжетная игра'],
  ['shift-quest-sm', 'ya015', { w: 720, h: 760, position: 'attention' }, ''],
  ['shift-mir', 'ya017', { w: 1200, h: 1400, position: 'attention' }, 'Девочки смеются, обнимаются и снимают друг друга на телефон'],
  ['shift-mir-sm', 'ya017', { w: 720, h: 760, position: 'attention' }, ''],
  ['shift-prof', 'ya009', { w: 1200, h: 1400, position: 'centre' }, 'Съёмка с профессиональной видеокамерой на открытом воздухе'],
  ['shift-prof-sm', 'ya009', { w: 720, h: 760, position: 'centre' }, ''],
  ['shift-fest', 'ya001', { w: 1200, h: 1400, position: 'attention' }, 'Ребята бегут через спортивную площадку во время игры'],
  ['shift-fest-sm', 'ya001', { w: 720, h: 760, position: 'attention' }, ''],

  ['day-morning', 'ya003', { w: 1100, h: 820 }, 'Утро: отряд позирует на улице'],
  ['day-day', 'ya016', { w: 1100, h: 820, position: 'attention' }, 'День: игра на площадке, ребята склонились над заданием'],
  ['day-evening', 'ya006', { w: 1100, h: 820 }, 'Вечер: весь лагерь в зале после шоу'],
  ['day-night', 'ya011', { w: 1100, h: 820 }, 'Ночь: танцы на корте под фонарями'],
];

// Полевой архив: миниатюра (по длинной стороне 560) + кадр для лайтбокса (до 1800)
const ARCHIVE = [
  ['ya014', 'Отряд вручает подарок, все в красных галстуках'],
  ['p11140-8', 'Театр теней: силуэты на подсвеченном полотне'],
  ['p11657-1', 'Объятия на зимней смене'],
  ['p11317-5', 'Песни под две гитары'],
  ['p12711-2', 'Буквы «ТМ», нарисованные светом'],
  ['p6727-4', 'Ночной танцевальный баттл с красками Холи'],
  ['p13011-3', 'Фотомарафон: костюмы среди поля'],
  ['p12604-2', 'Подруги обнимаются в первый день смены'],
  ['p11149-1', 'Разговор в кругу на пенках'],
  ['p13011-8', 'Грим на фотомарафоне'],
  ['p11317-7', 'Руки в центр — отряд в сборе'],
  ['p9193-0', 'Костюм для фотомарафона «Успеть за 22 минуты»'],
  ['p11538-4', 'Победный крик на турнире'],
  ['p6736-5', 'Последний день смены: общее фото'],
  ['p11666-2', 'Зимний вечер на улице'],
  ['p12130-8', 'Прыжок на сцене'],
  ['ya007', 'Командное задание на полу'],
  ['ya023', 'Игра на улице: шапки, шляпы и хоровод'],
];
ARCHIVE.forEach(([id, alt], i) => {
  const n = String(i + 1).padStart(2, '0');
  PLAN.push([`arch-${n}-t`, id, { long: 560 }, alt]);
  PLAN.push([`arch-${n}`, id, { long: 1800 }, alt]);
});

async function encode(pipe, name) {
  for (const q of [80, 74, 68, 62, 56, 50]) {
    const buf = await pipe.clone().webp({ quality: q, effort: 5 }).toBuffer();
    if (buf.length <= 300 * 1024 || q === 50) { fs.writeFileSync(`${OUT}/${name}.webp`, buf); return [buf.length, q]; }
  }
}

const manifest = {};
for (const [name, id, m, alt] of PLAN) {
  let p = sharp(src(id)).rotate();
  if (m.long) p = p.resize(m.long, m.long, { fit: 'inside', withoutEnlargement: true });
  else p = p.resize(m.w, m.h, { fit: 'cover', position: m.position || 'centre', kernel: 'lanczos3' });
  const [size, q] = await encode(p, name);
  const meta = await sharp(`${OUT}/${name}.webp`).metadata();
  manifest[name] = { src: id, w: meta.width, h: meta.height, kb: Math.round(size / 1024), q, alt };
  console.log(name.padEnd(18), id.padEnd(10), `${meta.width}x${meta.height}`, `${Math.round(size / 1024)}КБ q${q}`);
}
fs.writeFileSync('raw/manifest.json', JSON.stringify(manifest, null, 1));
