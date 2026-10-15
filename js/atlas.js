/* Атлас традиций: остров, на котором вместо холмов — традиции.
   Каждая традиция — «высота» из неровных горизонталей; маршрут отряда — пунктир --river. */
(function () {
  'use strict';
  const TM = window.TM;
  const NS = 'http://www.w3.org/2000/svg';

  // порядок — как в легенде; route — порядок по маршруту смены
  const DATA = [
    { id: 'krug', name: 'Орлятский круг', x: 850, y: 268, r: 72, route: 6, side: 'l', lx: 10, ly: 6, img: 'atlas-krug',
      text: 'В конце дня отряд встаёт в круг: что получилось, что нет, кто сегодня удивил. Потом — любимые песни под гитару, и поют даже те, кто «не поёт».' },
    { id: 'vecherka', name: 'Вечёрка', x: 728, y: 430, r: 82, route: 5, img: 'atlas-vecherka',
      text: 'Вечерняя сцена, на которую выходят отряды. Днём репетиция, вечером премьера — и аплодисменты от всего лагеря.' },
    { id: 'vizitki', name: 'Визитки', x: 175, y: 300, r: 80, route: 0, img: 'atlas-vizitki',
      text: 'Первые дни смены: отряд придумывает себя с нуля — имя, характер, номер. Так незнакомые люди становятся командой.' },
    { id: 'quest', name: 'Квесты и мистерии', x: 300, y: 505, r: 94, route: 1, side: 'l', lx: -10, ly: 175, img: 'atlas-quest',
      text: 'Сюжет, в котором ты не зритель. Загадки, роли, костюмы, вечерние тайны — и решение, от которого зависит финал.' },
    { id: 'kvn', name: 'Психологический КВН', x: 520, y: 478, r: 84, route: 3, side: 'r', ly: 150, img: 'atlas-kvn',
      text: 'Смешно — про важное. Шутки о дружбе, страхах и отношениях, после которых об этом легче говорить всерьёз.' },
    { id: 'pautinka', name: '«Паутинка»', x: 410, y: 268, r: 78, route: 2, side: 'l', img: 'atlas-pautinka',
      text: 'Натянутые верёвки и одна задача: перебраться на ту сторону всем отрядом. В одиночку не пройти — в этом и смысл.' },
    { id: 'turnir', name: 'Турнир дружеских компаний', x: 622, y: 228, r: 86, route: 4, side: 'l', lx: 40, ly: -8, img: 'atlas-turnir',
      text: 'Друзья выступают одной командой. Выигрывает не самый сильный, а самая сыгранная компания.' },
    { id: 'svechka', name: 'Свечка', x: 838, y: 590, r: 62, route: 7, side: 'l', ly: 120, img: null,
      text: 'Тихий вечерний разговор отрядом при свече. Без сцены и без зрителей — только честно.' },
  ];
  TM.ATLAS = DATA;

  const el = (tag, attrs, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };

  // неровное кольцо вокруг (cx,cy): вытянутое, повёрнутое, с «заливами» от гармоник и шума.
  // Чем выше горизонталь (k), тем она спокойнее — как у настоящего холма.
  function ring(cx, cy, R, seed, k) {
    const rnd = TM.rng(seed), pts = [], N = 44;
    const e = .6 + rnd() * .3, rot = rnd() * Math.PI;
    const a1 = .1 + rnd() * .1, a2 = .05 + rnd() * .08, a3 = .03 + rnd() * .05, f1 = rnd() * 6.28, f2 = rnd() * 6.28, f3 = rnd() * 6.28;
    const calm = 1 - Math.min(k, 6) * .09;
    for (let i = 0; i < N; i++) {
      const th = (i / N) * Math.PI * 2;
      const rr = R * (1 + calm * (a1 * Math.sin(2 * th + f1) + a2 * Math.sin(3 * th + f2) + a3 * Math.sin(5 * th + f3))
        + TM.noise3(Math.cos(th) * 1.6, Math.sin(th) * 1.6, seed * .37 + k * .13) * .16 * calm);
      const lx = Math.cos(th) * rr, ly = Math.sin(th) * rr * e;
      pts.push([cx + lx * Math.cos(rot) - ly * Math.sin(rot), cy + lx * Math.sin(rot) + ly * Math.cos(rot)]);
    }
    return TM.smoothPath(pts, true);
  }

  function coast(seed) {
    const cx = 515, cy = 405, pts = [], N = 72;
    for (let i = 0; i < N; i++) {
      const th = (i / N) * Math.PI * 2, c = Math.cos(th), s = Math.sin(th);
      let r = 1 / Math.sqrt((c * c) / (455 * 455) + (s * s) / (305 * 305));
      r *= 1 + TM.noise3(c * 1.6, s * 1.6, seed) * .16 + TM.noise3(c * 4, s * 4, seed + 3) * .06;
      // остров должен накрыть все высоты с запасом
      for (const d of DATA) {
        const dx = d.x - cx, dy = d.y - cy, dist = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
        let da = Math.abs(ang - th); da = Math.min(da, Math.PI * 2 - da);
        const need = dist * Math.cos(da) + d.r * 1.25;
        if (da < 1.1 && need > r) r = need;
      }
      pts.push([cx + c * r, cy + s * r]);
    }
    return pts;
  }

  TM.atlas = function (root) {
    const svg = root.querySelector('.atlas-svg');
    const card = root.querySelector('.atlas-card');
    const listBtns = [...root.querySelectorAll('.atlas-list [data-region]')];
    const swipe = root.querySelector('.atlas-swipe');

    // --- море, сетка, остров ---
    const defs = el('defs', {}, svg);
    const gGrid = el('g', {}, svg);
    for (let x = 100; x < 1000; x += 100) el('line', { x1: x, y1: 0, x2: x, y2: 720, class: 'a-grid', 'stroke-dasharray': '2 6' }, gGrid);
    for (let y = 90; y < 720; y += 90) el('line', { x1: 0, y1: y, x2: 1000, y2: y, class: 'a-grid', 'stroke-dasharray': '2 6' }, gGrid);
    const cpts = coast(4.2);
    const cx = 515, cy = 405;
    const gSea = el('g', {}, svg);
    [1.05, 1.11, 1.19, 1.3].forEach((s, i) => {
      const p = cpts.map(([x, y], k) => {
        const j = TM.noise3(k * .3, i * 2.1, 9) * 8;
        return [cx + (x - cx) * s + j, cy + (y - cy) * s + j * .6];
      });
      el('path', { d: TM.smoothPath(p, true), class: 'a-sea', style: `opacity:${.75 - i * .15}` }, gSea);
    });
    el('path', { d: TM.smoothPath(cpts.map(([x, y]) => [x + 7, y + 9]), true), fill: 'rgba(16,35,28,.12)' }, svg);
    el('path', { d: TM.smoothPath(cpts, true), class: 'a-coast' }, svg);
    el('path', { d: TM.smoothPath(cpts.map(([x, y]) => [cx + (x - cx) * .965, cy + (y - cy) * .965]), true), class: 'a-coast-2' }, svg);

    // подписи полей карты
    const gTxt = el('g', { class: 'a-marg' }, svg);
    const mono = 'font: 500 13px var(--f-mono); letter-spacing: .12em; fill: #4b6455; text-transform: uppercase';
    [['55°47′', 4, 95], ['55°45′', 4, 365], ['55°43′', 4, 635]].forEach(([t, x, y]) => el('text', { x, y, style: mono }, gTxt).textContent = t);
    [['49°06′', 300, 714], ['49°08′', 700, 714]].forEach(([t, x, y]) => el('text', { x, y, style: mono, 'text-anchor': 'middle' }, gTxt).textContent = t);
    const cart = el('g', { transform: 'translate(985 40)' }, svg);
    el('text', { x: 0, y: 0, 'text-anchor': 'end', style: 'font: 400 26px var(--f-display); fill: var(--ink)' }, cart).textContent = 'ОСТРОВ МЫ';
    el('text', { x: 0, y: 22, 'text-anchor': 'end', style: mono }, cart).textContent = 'атлас традиций · лист 04';
    const sc = el('g', { transform: 'translate(70 690)' }, svg);
    el('path', { d: 'M0,0 H160 M0,-6 V6 M80,-4 V4 M160,-6 V6', stroke: 'var(--ink)', 'stroke-width': 1.4, fill: 'none' }, sc);
    el('text', { x: 0, y: -12, style: mono }, sc).textContent = '0';
    el('text', { x: 160, y: -12, style: mono, 'text-anchor': 'end' }, sc).textContent = '1 отряд';

    // --- маршрут: от высоты к высоте по порядку смены ---
    const order = DATA.slice().sort((a, b) => a.route - b.route);
    const rpts = order.map((d) => [d.x - d.r * .05, d.y - d.r * .1]);
    const routeD = TM.smoothPath(rpts);
    const mask = el('mask', { id: 'route-mask', maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: 1000, height: 720 }, defs);
    const mPath = el('path', { d: routeD, fill: 'none', stroke: '#fff', 'stroke-width': 14, pathLength: 1, 'stroke-dasharray': 1, 'stroke-dashoffset': TM.reduced ? 0 : 1 }, mask);

    // --- высоты ---
    const hills = {};
    DATA.forEach((d, idx) => {
      const g = el('g', { class: 'a-hill', 'data-id': d.id, tabindex: 0, role: 'button', 'aria-label': d.name }, svg);
      const seed = 31 + idx * 13;
      const base = ring(d.x, d.y, d.r, seed, 0);
      el('path', { d: base, class: 'a-shadow' }, g);
      const lift = el('g', { class: 'lift' }, g);
      el('path', { d: base, class: 'base' }, lift);
      const rr2 = TM.rng(seed + 99), N = 7, dx = (rr2() - .5) * d.r * .7, dy = (rr2() - .65) * d.r * .45;
      for (let k = 1; k < N; k++) {
        const t = k / N;
        el('path', { d: ring(d.x + dx * Math.pow(t, .8), d.y + dy * Math.pow(t, .8), d.r * (1 - Math.pow(t, .9) * .88), seed, k), class: 'ring' }, lift);
        // промежуточные горизонтали: проявляются при наведении — линии «сгущаются»
        const t2 = (k - .5) / N;
        el('path', { d: ring(d.x + dx * Math.pow(t2, .8), d.y + dy * Math.pow(t2, .8), d.r * (1 - Math.pow(t2, .9) * .88), seed, k + .5), class: 'ring ring--extra' }, lift);
      }
      const px = d.x + dx, py = d.y + dy;
      el('path', { d: `M${px},${py - 7} L${px + 6},${py + 4} L${px - 6},${py + 4} Z`, class: 'peak' }, lift);
      // подпись на выноске
      const right = d.side ? d.side === 'r' : d.x < 640;
      const lx = px + (right ? d.r * .5 : -d.r * .5) + (d.lx || 0), ly = py - d.r * .72 - 14 + (d.ly || 0);
      el('line', { x1: px, y1: py - 8, x2: lx, y2: ly + 12, class: 'leader' }, lift);
      const lbg = el('rect', { class: 'lbl-bg', rx: 4, height: 26 }, lift);
      const t = el('text', { class: 'lbl-t', y: ly + 5 }, lift);
      t.textContent = d.name;
      hills[d.id] = { g, lbg, t, lx, ly, right };
      g.addEventListener('mouseenter', () => !TM.mobile() && setActive(d.id));
      g.addEventListener('focus', () => setActive(d.id));
      g.addEventListener('click', () => { setActive(d.id); if (TM.mobile()) scrollCard(d.id); });
      g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActive(d.id); } });
    });
    // маршрут поверх островов, но под подписями
    const routeG = el('g', { mask: 'url(#route-mask)' }, svg);
    el('path', { d: routeD, class: 'a-route' }, routeG);
    // старт и финиш
    const s0 = rpts[0], s1 = rpts[rpts.length - 1];
    el('circle', { cx: s0[0], cy: s0[1], r: 7, fill: 'var(--river)' }, routeG);
    el('circle', { cx: s1[0], cy: s1[1], r: 9, fill: 'none', stroke: 'var(--river)', 'stroke-width': 2 }, routeG);
    // подписи — самым верхним слоем
    Object.values(hills).forEach((hh) => svg.appendChild(hh.g));
    svg.appendChild(routeG);
    // ширина подписи — после вставки в DOM и после загрузки моно-шрифта
    const layoutLabels = () => Object.values(hills).forEach((hh) => {
      const len = hh.t.getComputedTextLength ? hh.t.getComputedTextLength() : hh.t.textContent.length * 9.5;
      const w = len + 22;
      const x0 = hh.right ? hh.lx : hh.lx - w;
      hh.lbg.setAttribute('x', x0); hh.lbg.setAttribute('y', hh.ly - 13); hh.lbg.setAttribute('width', w);
      hh.t.setAttribute('x', x0 + 11);
    });
    layoutLabels();
    if (document.fonts) document.fonts.load('500 15px "JetBrains Mono"', 'АБВ').then(() => document.fonts.ready).then(layoutLabels);
    // подписи поверх маршрута
    const labels = el('g', {}, svg);
    Object.values(hills).forEach((hh) => {
      // переносим rect+text в отдельный слой, сохраняя связь наведения
      const lift = hh.g.querySelector('.lift');
      const clone = el('g', { class: 'a-hill a-label', 'data-for': hh.g.dataset.id, 'aria-hidden': 'true' }, labels);
      const lg = el('g', { class: 'lift' }, clone);
      lg.appendChild(hh.lbg); lg.appendChild(hh.t);
      clone.addEventListener('mouseenter', () => !TM.mobile() && setActive(hh.g.dataset.id));
      clone.addEventListener('click', () => setActive(hh.g.dataset.id));
      hh.label = clone;
      void lift;
    });

    // --- карточка ---
    const cNo = card.querySelector('.ac-no span'), cTitle = card.querySelector('.ac-title'), cText = card.querySelector('.ac-text');
    const cPhoto = card.querySelector('.ac-photo');
    function photoHTML(d) {
      if (!d.img) return '<div class="ac-candle" role="img" aria-label="Нарисованная свеча"><b></b><i></i><em>тихо. только свои.</em></div>';
      return `<img src="assets/img/${d.img}.webp" width="720" height="480" alt="" loading="lazy">`;
    }
    let active = null;
    function setActive(id) {
      if (id === active) return;
      active = id;
      const d = DATA.find((x) => x.id === id), i = DATA.indexOf(d);
      Object.values(hills).forEach((hh) => { const on = hh.g.dataset.id === id; hh.g.classList.toggle('is-on', on); hh.label.classList.toggle('is-on', on); });
      listBtns.forEach((b) => b.classList.toggle('is-on', b.dataset.region === id));
      swipe.querySelectorAll('.swipe-card').forEach((c) => c.classList.toggle('is-on', c.dataset.id === id));
      const swap = () => {
        cNo.textContent = String(i + 1).padStart(2, '0');
        cTitle.textContent = d.name; cText.textContent = d.text; cPhoto.innerHTML = photoHTML(d);
        const im = cPhoto.querySelector('img'); if (im) im.alt = d.name;
      };
      if (window.gsap && !TM.reduced && !TM.mobile()) {
        const inner = card.querySelector('.ac-inner');
        gsap.killTweensOf(inner);
        gsap.to(inner, { x: 26, opacity: 0, duration: .18, ease: 'power2.in', onComplete: () => {
          swap(); gsap.fromTo(inner, { x: -18, opacity: 0 }, { x: 0, opacity: 1, duration: .5, ease: 'expo.out' });
        } });
      } else swap();
    }
    listBtns.forEach((b) => {
      b.addEventListener('click', () => setActive(b.dataset.region));
      b.addEventListener('mouseenter', () => setActive(b.dataset.region));
    });

    // --- мобайл: свайп-карточки, синхронные с подсветкой высоты ---
    swipe.innerHTML = DATA.map((d, i) => `<article class="swipe-card" data-id="${d.id}"><div class="ac-photo">${d.img ? `<img src="assets/img/${d.img}.webp" width="720" height="480" alt="${d.name}" loading="lazy">` : photoHTML(d)}</div><p class="mono">${String(i + 1).padStart(2, '0')} / 08</p><h3>${d.name}</h3><p>${d.text}</p></article>`).join('');
    const sio = new IntersectionObserver((es) => {
      if (!TM.mobile()) return;
      es.forEach((e) => { if (e.isIntersecting) setActive(e.target.dataset.id); });
    }, { root: swipe, threshold: .6 });
    swipe.querySelectorAll('.swipe-card').forEach((c) => sio.observe(c));
    function scrollCard(id) {
      const c = swipe.querySelector(`[data-id="${id}"]`);
      if (c) swipe.scrollTo({ left: c.offsetLeft - parseFloat(getComputedStyle(swipe).paddingLeft), behavior: TM.reduced ? 'auto' : 'smooth' });
    }

    setActive('krug');

    return {
      drawRoute(p) { mPath.setAttribute('stroke-dashoffset', String(1 - p)); },
    };
  };
})();
