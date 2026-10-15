/* Территория МЫ — сборка страницы: Lenis + ScrollTrigger, прелоадер, тумблер аудитории,
   пины (манифест, смены, сутки), появления, компас, курсор, магниты. */
(function () {
  'use strict';
  const TM = window.TM;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const root = document.documentElement;
  const boot = (flag) => root.setAttribute('data-boot', (root.getAttribute('data-boot') || '') + ' ' + flag);

  const ok = !!(window.gsap && window.ScrollTrigger);
  if (!ok) { boot('intro-done'); $('#intro') && $('#intro').remove(); return; }

  gsap.registerPlugin(ScrollTrigger, Draggable, InertiaPlugin, Flip);
  gsap.defaults({ ease: 'power3.out', duration: 1 });
  const RM = TM.reduced;
  const mobile = TM.mobile();

  /* ================= Lenis ================= */
  let lenis = null;
  if (!RM && window.Lenis) {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true, wheelMultiplier: 1 });
    TM.lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    ScrollTrigger.addEventListener('refresh', () => lenis.resize());
  }
  const scrollToEl = (el) => {
    if (lenis) lenis.scrollTo(el, { duration: 1.4, easing: (t) => 1 - Math.pow(1 - t, 4) });
    else el.scrollIntoView({ behavior: RM ? 'auto' : 'smooth' });
  };
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    const el = id.length > 1 && document.querySelector(id);
    if (!el) return;
    e.preventDefault(); scrollToEl(el);
    if (id !== '#main') history.replaceState(null, '', id);
  });

  /* ================= тумблер аудитории ================= */
  const audBtns = $$('[data-set-aud]');
  const audTexts = $$('[data-aud-text]');
  let aud = root.getAttribute('data-aud') === 'kid' ? 'kid' : 'parent';
  const splits = new Map(); // span → SplitType (для заголовков)
  function applyAud(next, animate) {
    aud = next;
    if (next === 'kid') root.setAttribute('data-aud', 'kid'); else root.removeAttribute('data-aud');
    audBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.setAud === next)));
    try { localStorage.setItem('tm-aud', next); } catch (e) {}
    audTexts.forEach((el, i) => {
      const txt = el.getAttribute(next === 'kid' ? 'data-kid' : 'data-parent');
      if (el.textContent.trim() === txt) return;
      const set = () => {
        el.textContent = txt;
        if (splits.has(el)) {
          const s = makeSplit(el);
          if (animate && !RM) gsap.from(s.words, { yPercent: 110, duration: .9, ease: 'expo.out', stagger: .03 });
        }
      };
      if (!animate || RM) return set();
      el.classList.add('is-swapping');
      setTimeout(() => { set(); el.classList.remove('is-swapping'); }, 320 + i * 25);
    });
    if (animate) setTimeout(() => ScrollTrigger.refresh(), 700);
  }
  audBtns.forEach((b) => b.addEventListener('click', () => applyAud(b.dataset.setAud, true)));
  if (aud === 'kid') applyAud('kid', false);

  /* ================= заголовки: строки/слова с маской ================= */
  function makeSplit(el) {
    if (!window.SplitType) return { words: [el] };
    const old = splits.get(el); if (old && old.revert) old.revert();
    const s = new SplitType(el, { types: 'lines,words', tagName: 'span' });
    splits.set(el, s);
    return s;
  }
  const heads = [];
  $$('.h2, .final-title').forEach((h) => {
    const target = h.querySelector('[data-aud-text]') || h;
    target.classList.add('split');
    heads.push(target);
  });

  /* ================= прелоадер ================= */
  const intro = $('#intro');
  function runIntro() {
    if (!intro || getComputedStyle(intro).display === 'none') { boot('intro-done'); intro && intro.remove(); return; }
    intro.classList.add('is-running');
    if (lenis) lenis.stop();
    const field = $('.intro-field', intro), word = $('.intro-word', intro), rings = $('.intro-rings', intro);
    const rnd = TM.rng(7), N = 40, vw = innerWidth, vh = innerHeight;
    const ys = [];
    for (let i = 0; i < N; i++) {
      const s = document.createElement('span'); s.textContent = 'я';
      s.style.setProperty('--s', Math.round(12 + rnd() * 34) + 'px');
      field.appendChild(s); ys.push(s);
      gsap.set(s, { x: (rnd() - .5) * vw * .9, y: (rnd() - .5) * vh * .85, rotation: (rnd() - .5) * 40, opacity: 0, xPercent: -50, yPercent: -50 });
    }
    // горизонтали, которые разойдутся от центра
    const NSs = 'http://www.w3.org/2000/svg', rp = [];
    for (let k = 0; k < 8; k++) {
      const p = document.createElementNS(NSs, 'path'), pts = [];
      for (let i = 0; i < 40; i++) {
        const th = (i / 40) * Math.PI * 2, r = 60 * (1 + TM.noise3(Math.cos(th), Math.sin(th), k * .7) * .22);
        pts.push([Math.cos(th) * r, Math.sin(th) * r]);
      }
      p.setAttribute('d', TM.smoothPath(pts, true));
      if (k % 3 === 0) p.style.stroke = '#F2353B';
      rings.appendChild(p); rp.push(p);
    }
    gsap.set(rp, { scale: 0, opacity: 0, transformOrigin: '0 0' });
    const tl = gsap.timeline({ onComplete: endIntro });
    tl.to(ys, { opacity: 1, duration: .25, stagger: { each: .006, from: 'random' }, ease: 'none' })
      .to(ys, { x: (i) => (i % 2 ? .18 : -.18) * Math.min(vw, 900) * .5, y: 0, rotation: 0, scale: .4, opacity: 0, duration: .62, ease: 'power3.in', stagger: { each: .008, from: 'edges' } }, .22)
      .to($$('span', word), { opacity: 1, duration: .01, stagger: .06 }, .74)
      .from($$('span', word), { scale: .4, yPercent: 30, duration: .5, ease: 'back.out(2.2)', stagger: .06 }, .74)
      .to(rp, { scale: (i) => 8 + i * 4.5, opacity: (i) => 1 - i * .06, duration: .75, ease: 'expo.out', stagger: .035 }, 1.02)
      .to(intro, { '--hole': Math.hypot(vw, vh) / 2 + 60 + 'px', duration: .7, ease: 'power2.in' }, 1.1)
      .to(word, { scale: 1.6, opacity: 0, duration: .5, ease: 'power2.in' }, 1.22);
  }
  function endIntro() {
    try { sessionStorage.setItem('tm-intro', '1'); } catch (e) {}
    boot('intro-done');
    intro.remove();
    if (lenis) lenis.start();
  }

  /* ================= шапка ================= */
  const hdr = $('#hdr');
  let lastY = 0, hdrTick = false;
  function headerTone() {
    hdrTick = false;
    const y = window.scrollY;
    hdr.classList.toggle('is-solid', y > 80);
    if (y > lastY + 4 && y > 240 && !compass.classList.contains('is-open')) hdr.classList.add('is-hidden');
    else if (y < lastY - 4 || y < 240) hdr.classList.remove('is-hidden');
    lastY = y;
    // какой фон под шапкой — чтобы текст не терялся
    const hit = document.elementsFromPoint(innerWidth / 2, (TM.mobile() ? 64 : 72) - 2).find((n) => !hdr.contains(n));
    let paper = false;
    if (hit) {
      const sheet = hit.closest('.sheet');
      const day = hit.closest('.day');
      if (sheet) paper = !sheet.classList.contains('sheet--3');
      else if (day) paper = !day.classList.contains('is-dark');
      else paper = !!hit.closest('.tone-paper');
    }
    hdr.classList.toggle('on-paper', paper);
  }
  const onScroll = () => { if (!hdrTick) { hdrTick = true; requestAnimationFrame(headerTone); } };

  /* ================= компас ================= */
  const compass = $('#compass'), cBtn = $('.compass-btn', compass), cItems = $$('.compass-menu li', compass);
  const prog = $('.compass-prog', compass), needle = $('.compass-needle', compass);
  cItems.forEach((li, i) => {
    // пункты ложатся дугой над компасом: ближний к кнопке — «Связь»
    const k = cItems.length - 1 - i, n = cItems.length - 1;
    const tx = -(46 + Math.sin((Math.PI * k) / n) * 70), ty = -(62 + k * 38);
    li.style.setProperty('--tx', tx + 'px'); li.style.setProperty('--ty', ty + 'px'); li.style.setProperty('--i', k);
  });
  const setCompass = (open) => {
    compass.classList.toggle('is-open', open);
    cBtn.setAttribute('aria-expanded', String(open));
    cBtn.setAttribute('aria-label', open ? 'Закрыть карту разделов' : 'Открыть карту разделов');
    cItems.forEach((li) => { const a = li.querySelector('a'); a.tabIndex = open ? 0 : -1; });
    if (open) setTimeout(() => cItems[0].querySelector('a').focus({ preventScroll: true }), 60);
  };
  setCompass(false);
  cBtn.addEventListener('click', () => setCompass(!compass.classList.contains('is-open')));
  compass.addEventListener('click', (e) => { if (e.target === compass || e.target.closest('.compass-menu a')) setCompass(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && compass.classList.contains('is-open')) { setCompass(false); cBtn.focus(); } });
  function compassProgress() {
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? window.scrollY / max : 0;
    prog.style.strokeDashoffset = String(1 - p);
    needle.style.transform = `rotate(${p * 720}deg)`;
  }

  /* ================= волнистые границы ================= */
  const edges = TM.buildEdges();
  const visEdges = new Set();
  edges.forEach((e) => TM.watch(e, (v) => (v ? visEdges.add(e) : visEdges.delete(e)), '0px'));
  let edgeTick = false;
  function edgeFlow() {
    edgeTick = false;
    const ph = window.scrollY * 0.0009;
    visEdges.forEach((e) => e._draw(ph));
  }
  TM.noiseReady.then(() => edges.forEach((e) => e._draw(window.scrollY * 0.0009)));

  if (lenis) lenis.on('scroll', () => { onScroll(); compassProgress(); if (!edgeTick && !RM) { edgeTick = true; requestAnimationFrame(edgeFlow); } });
  else window.addEventListener('scroll', () => { onScroll(); compassProgress(); if (!edgeTick && !RM) { edgeTick = true; requestAnimationFrame(edgeFlow); } }, { passive: true });

  /* ================= герой ================= */
  const hero = $('#hero');
  const topo = TM.heroTopo($('.hero-topo', hero));
  if (TM.fine && !RM) {
    const pins = $$('.pin', hero).map((p) => ({ d: +p.dataset.depth, x: gsap.quickTo(p, 'x', { duration: 1.1, ease: 'power3' }), y: gsap.quickTo(p, 'y', { duration: 1.1, ease: 'power3' }) }));
    hero.addEventListener('pointermove', (e) => {
      const nx = e.clientX / innerWidth - .5, ny = e.clientY / innerHeight - .5;
      pins.forEach((p) => { p.x(-nx * 34 * p.d); p.y(-ny * 26 * p.d); });
    });
  }

  /* ================= ПИНЫ (создаются раньше остальных триггеров) ================= */
  const desktopPins = !RM && !mobile;

  // --- 02 · манифест ---
  const mWords = $('.manifest-words');
  (function splitManifest() {
    // ручная разбивка на слова, чтобы &nbsp; и <b> остались на месте
    const walk = (node) => {
      [...node.childNodes].forEach((c) => {
        if (c.nodeType === 3) {
          const parts = c.textContent.split(/([ \t\n\r]+)/);
          const frag = document.createDocumentFragment();
          parts.forEach((t) => { if (!t) return; if (/^[ \t\n\r]+$/.test(t)) frag.append(t); else { const s = document.createElement('span'); s.className = 'w'; s.textContent = t; frag.append(s); } });
          c.replaceWith(frag);
        } else if (c.nodeType === 1 && c.tagName === 'B') { c.classList.add('w'); }
        else if (c.nodeType === 1) walk(c);
      });
    };
    walk(mWords);
  })();
  const words = $$('.w', mWords);
  const yaMan = TM.YaParticles($('.manifest .ya-canvas'), { word: 'МЫ', max: 480 });
  const mCount = $('.manifest-count');
  const manifestUpdate = (p) => {
    const wp = TM.clamp(p / .7, 0, 1);
    words.forEach((w, i) => { const k = TM.clamp(wp * words.length - i, 0, 1); w.style.opacity = String(.14 + .86 * k); });
    yaMan.set(TM.clamp((p - .12) / .78, 0, 1));
    const n = yaMan.count;
    if (n) mCount.innerHTML = p < .85 ? `<b>${n}</b> × я` : `<b>${n}</b> × я → <b>МЫ</b>`;
  };
  // слова гаснут, пока секция ещё за экраном снизу — при загрузке текст полный (контраст)
  if (!RM) ScrollTrigger.create({ trigger: '.manifest', start: 'top bottom', onEnter: () => manifestUpdate(0) });
  if (RM) { words.forEach((w) => (w.style.opacity = 1)); setTimeout(() => yaMan.set(1), 400); }
  else if (desktopPins) {
    ScrollTrigger.create({ trigger: '.manifest', start: 'top top', end: '+=120%', pin: true, scrub: true, onUpdate: (s) => manifestUpdate(s.progress) });
  } else {
    ScrollTrigger.create({ trigger: '.manifest', start: 'top 75%', end: 'bottom 70%', scrub: true, onUpdate: (s) => manifestUpdate(s.progress) });
  }

  // --- 05 · смены: горизонтальный пин ---
  const track = $('.shifts-track'), sheets = $$('.sheet');
  const routeFg = $('.route-fg'), routeDots = $$('.route i'), shiftsTop = $('.shifts-top');
  // свой «лист карты» у каждой смены — топография на фоне
  TM.noiseReady.then(() => sheets.forEach((s, i) => {
    const c = document.createElement('canvas');
    const dark = s.classList.contains('sheet--3');
    TM.drawTopo(c, { w: 900, h: 640, seed: 20 + i * 5, scale: .004, levels: 12, cell: 8, color: dark ? 'rgba(157,178,163,.22)' : 'rgba(16,35,28,.16)', strong: dark ? 'rgba(157,178,163,.4)' : 'rgba(16,35,28,.3)' });
    s.style.setProperty('--topo', `url(${c.toDataURL('image/png')})`);
  }));
  if (desktopPins) {
    const dist = () => track.scrollWidth - innerWidth;
    const hTween = gsap.to(track, { x: () => -dist(), ease: 'none' });
    ScrollTrigger.create({
      trigger: '.shifts', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 1, animation: hTween, invalidateOnRefresh: true,
      onUpdate: (s) => {
        routeFg.style.strokeDashoffset = String(1 - s.progress);
        const idx = Math.round(s.progress * 3);
        shiftsTop.classList.toggle('on-dark', idx === 2); shiftsTop.classList.toggle('on-flame', idx === 3);
        routeDots.forEach((d, i) => d.classList.toggle('is-on', s.progress >= i / 3 - .02));
      },
    });
    sheets.forEach((s) => {
      ScrollTrigger.create({ trigger: s, containerAnimation: hTween, start: 'left 55%', end: 'right 45%', toggleClass: 'is-lit' });
      const ph = $('.sheet-photo img', s);
      gsap.fromTo(ph, { scale: 1.15 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: s, containerAnimation: hTween, start: 'left right', end: 'left left', scrub: true } });
      gsap.from($$('.sheet-body > *', s), { y: 50, opacity: 0, stagger: .07, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: s, containerAnimation: hTween, start: 'left 70%', toggleActions: 'play none none reverse' } });
    });
  } else {
    sheets.forEach((s) => ScrollTrigger.create({ trigger: s, start: 'top 60%', end: 'bottom 40%', toggleClass: 'is-lit' }));
  }

  // --- 06 · сутки ---
  const day = $('.day'), phases = $$('.phase', day), dImgs = $$('.day-photos img', day);
  const dNeedle = $('.dial-needle', day), ticks = $('.dial-ticks', day);
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2, r1 = 182, r2 = i % 12 === 0 ? 166 : i % 4 === 0 ? 172 : 176;
    const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    l.setAttribute('x1', Math.sin(a) * r1); l.setAttribute('y1', -Math.cos(a) * r1); l.setAttribute('x2', Math.sin(a) * r2); l.setAttribute('y2', -Math.cos(a) * r2);
    ticks.appendChild(l);
  }
  // на телефоне фото фаз — прямо в карточках
  phases.forEach((ph, i) => {
    const f = document.createElement('figure'); f.className = 'phase-photo';
    f.innerHTML = `<img src="${dImgs[i].getAttribute('src')}" width="1100" height="820" alt="" loading="lazy">`;
    ph.prepend(f);
  });
  const sky = gsap.utils.interpolate(['#E8ECE2', '#EEE6C9', '#C46A4A', '#3A2A2C', '#10231C']);
  const stars = $('.day-stars', day);
  let starsDrawn = false;
  function drawStars() {
    const s = TM.fitCanvas(stars, 1.5), c = stars.getContext('2d'), r = TM.rng(9);
    c.setTransform(s.dpr, 0, 0, s.dpr, 0, 0); c.clearRect(0, 0, s.w, s.h);
    for (let i = 0; i < 170; i++) { c.globalAlpha = .25 + r() * .75; c.fillStyle = r() > .9 ? '#FFD23F' : '#E8ECE2'; c.beginPath(); c.arc(r() * s.w, r() * s.h * .8, r() * 1.4 + .3, 0, 6.29); c.fill(); }
    starsDrawn = true;
  }
  let curPhase = -1;
  function dayUpdate(p) {
    day.style.setProperty('--sky', sky(p));
    const dark = p > .52;
    day.classList.toggle('is-dark', dark);
    day.style.setProperty('--fg', dark ? '#E8ECE2' : '#10231C');
    stars.style.opacity = String(TM.clamp((p - .55) / .3, 0, 1));
    if (p > .5 && !starsDrawn) drawStars();
    const ang = -28 + p * 316;
    if (dNeedle) dNeedle.style.transform = `rotate(${ang}deg)`;
    const idx = TM.clamp(Math.round(ang / 90), 0, 3);
    if (idx !== curPhase) {
      curPhase = idx;
      phases.forEach((ph, i) => ph.classList.toggle('is-on', i === idx));
      dImgs.forEach((im, i) => im.classList.toggle('is-on', i === idx));
    }
  }
  if (desktopPins) {
    ScrollTrigger.create({ trigger: day, start: 'top top', end: '+=300%', pin: true, scrub: true, onUpdate: (s) => dayUpdate(s.progress), onRefresh: (s) => dayUpdate(s.progress) });
  } else if (!RM) {
    ScrollTrigger.create({ trigger: day, start: 'top 60%', end: 'bottom 60%', scrub: true, onUpdate: (s) => {
      day.style.setProperty('--sky', sky(s.progress));
      const dark = s.progress > .52; day.classList.toggle('is-dark', dark); day.style.setProperty('--fg', dark ? '#E8ECE2' : '#10231C');
      stars.style.opacity = String(TM.clamp((s.progress - .55) / .3, 0, 1)); if (s.progress > .5 && !starsDrawn) drawStars();
    } });
  }

  /* ================= остальные триггеры ================= */
  // герой уезжает чуть медленнее скролла, горизонтали «текут»
  if (!RM) {
    ScrollTrigger.create({ trigger: hero, start: 'top top', end: 'bottom top', scrub: true, onUpdate: (s) => topo.setScroll(s.progress) });
    gsap.to('.hero-in', { yPercent: 14, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
  }

  // заголовки
  function revealHeads() {
    heads.forEach((h) => {
      const s = makeSplit(h);
      if (RM) return;
      gsap.from(s.words, { yPercent: 110, duration: 1.15, ease: 'expo.out', stagger: .045, scrollTrigger: { trigger: h, start: 'clamp(top 88%)', once: true } });
    });
  }
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => { revealHeads(); ScrollTrigger.refresh(); });

  // картинки: шторка + лёгкий scale
  if (!RM) {
    $$('.reveal-img').forEach((el) => {
      const img = $('img', el);
      gsap.timeline({ scrollTrigger: { trigger: el, start: 'clamp(top 85%)', once: true } })
        .to(el, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, ease: 'expo.out' })
        .to(img, { scale: 1, duration: 1.6, ease: 'expo.out' }, 0);
    });
    // общий мягкий вход блоков
    $$('.moved-text, .plates, .atlas-map, .atlas-card, .facts, .stage-all, .signs, .addr, .acc, .vq-marks').forEach((el) => {
      gsap.from(el, { y: 40, opacity: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'clamp(top 88%)', once: true } });
    });
  } else $$('.reveal-img').forEach((el) => { el.style.clipPath = 'none'; $('img', el).style.transform = 'none'; });

  // счётчики
  $$('.count').forEach((el) => {
    const to = +el.dataset.to, suf = el.dataset.suffix || '';
    if (RM) return;
    const o = { v: 0 };
    el.textContent = '0' + suf;
    ScrollTrigger.create({ trigger: el, start: 'clamp(top 90%)', once: true, onEnter: () => gsap.to(o, { v: to, duration: to > 3 ? 1.6 : .9, ease: 'power2.out', onUpdate: () => (el.textContent = Math.round(o.v) + suf) }) });
  });

  // 03 · штриховка внутри контура РТ и прорисовка маршрута
  (function moved() {
    const g = $('.rt-hatch');
    TM.noiseReady.then(() => {
      // горизонтали «рельефа» республики — из того же шума, в SVG
      const cv = document.createElement('canvas');
      const NSs = 'http://www.w3.org/2000/svg';
      const W = 1000, H = 678, cell = 14, cols = Math.ceil(W / cell), rows = Math.ceil(H / cell), f = new Float32Array((cols + 1) * (rows + 1));
      for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) f[j * (cols + 1) + i] = TM.noise3(i * cell * .0034, j * cell * .0034, 4.4);
      for (let l = 0; l < 9; l++) {
        let d = '';
        const fake = { moveTo: (x, y) => (d += `M${x.toFixed(0)},${y.toFixed(0)}`), lineTo: (x, y) => (d += `L${x.toFixed(0)},${y.toFixed(0)}`) };
        TM.isoline(fake, f, cols, rows, cell, -0.7 + l * 0.17);
        const p = document.createElementNS(NSs, 'path'); p.setAttribute('d', d); g.appendChild(p);
      }
      void cv;
    });
    const route = $('.rt-route');
    if (!RM) gsap.fromTo(route, { strokeDashoffset: 400 }, { strokeDashoffset: 0, duration: 2.4, ease: 'power2.inOut', scrollTrigger: { trigger: '.moved-map', start: 'top 70%', once: true } });
  })();

  // 04 · атлас
  const atlas = TM.atlas($('#atlas'));
  if (!RM) {
    const o = { p: 0 };
    ScrollTrigger.create({ trigger: '.atlas-map', start: 'top 70%', once: true, onEnter: () => gsap.to(o, { p: 1, duration: 2.6, ease: 'power2.inOut', onUpdate: () => atlas.drawRoute(o.p) }) });
  }

  // 07 · переписка
  (function chat() {
    const msgs = $$('.chat .msg'), typing = $('.chat .typing');
    if (RM) return;
    gsap.set(msgs, { autoAlpha: 0, y: 14, scale: .96 });
    msgs.forEach((m) => (m.style.display = 'none'));
    const tl = gsap.timeline({ paused: true });
    msgs.forEach((m, i) => {
      const incoming = m.classList.contains('msg--in');
      if (incoming) {
        tl.call(() => { typing.style.display = ''; m.parentNode.appendChild(typing); }, null, '+=0.25')
          .to(typing, { autoAlpha: 1, duration: .2 })
          .to({}, { duration: 1.1 })
          .to(typing, { autoAlpha: 0, duration: .15 })
          .call(() => { typing.style.display = 'none'; });
      }
      tl.call(() => { m.style.display = ''; typing.parentNode.appendChild(typing); })
        .to(m, { autoAlpha: 1, y: 0, scale: 1, duration: .45, ease: 'back.out(1.8)' }, incoming ? '+=0.05' : '+=0.6');
    });
    ScrollTrigger.create({ trigger: '.phone', start: 'top 65%', once: true, onEnter: () => tl.play() });
  })();

  // 08 · путь: линия рисуется скроллом, станции вспыхивают
  (function path() {
    const fg = $('.path-line--fg'), sts = $$('.st'), svg = $('.path-svg');
    const len = fg.getTotalLength();
    fg.style.strokeDasharray = len; fg.style.strokeDashoffset = RM ? 0 : len;
    // на какой длине линия проходит уровень каждой станции
    const vb = 1200, marks = sts.map((s) => {
      const y = parseFloat(s.style.getPropertyValue('--y')) / 100 * vb + 30;
      let best = 0; for (let l = 0; l <= len; l += 8) { if (fg.getPointAtLength(l).y <= y) best = l; else break; }
      return best / len;
    });
    if (RM) { sts.forEach((s) => s.classList.add('is-on')); return; }
    ScrollTrigger.create({ trigger: '.path-map', start: 'top 65%', end: 'bottom 75%', scrub: .6, onUpdate: (s) => {
      fg.style.strokeDashoffset = String(len * (1 - s.progress));
      sts.forEach((st, i) => st.classList.toggle('is-on', s.progress >= marks[i] - .01));
    } });
    void svg;
  })();

  // 09 · архив
  TM.archive($('#archive'));

  // 10 · голоса
  (function voices() {
    const Q = [
      { t: 'Многие возвращаются отсюда новыми людьми, более готовыми ко взрослой жизни.', w: '<b>Егор&nbsp;В.</b> · выпускник, отдал лагерю много лет' },
      { t: 'Дежурные созвоны бывали очень короткими: «мам, у меня всё хорошо, ты прости, я побежал».', w: '<b>А.&nbsp;А.</b> · мама трёх участников' },
      { t: 'Действительно то место, где тебя ценят и где ты раскрываешься с новых сторон. Территория МЫ — настоящая семья.', w: '<b>Ксения&nbsp;И.</b> · участница' },
      { t: 'Счастье видеть радостных детей, которым некогда общаться, а в конце смены они просят вернуть их обратно.', w: '<b>Анастасия</b> · мама участника' },
      { t: 'Езжу сюда уже больше пяти лет — и хочу возвращаться вновь и вновь.', w: '<b>Юлиана&nbsp;Г.</b> · участница, 5+ лет' },
      { t: 'Все дети раскрываются и не боятся показывать свои сильные стороны.', w: '<b>Артур&nbsp;Ш.</b> · родитель' },
    ];
    const box = $('.vq'), text = $('.vq-text'), who = $('.vq-who'), tabs = $$('.vq-marks button');
    const wrapWords = (s) => s.split(' ').map((w) => `<span class="wm"><span class="w">${w}</span></span>`).join(' ');
    let cur = 0, busy = false;
    function go(i) {
      if (i === cur || busy) return;
      busy = true;
      tabs.forEach((t, k) => { t.setAttribute('aria-selected', String(k === i)); t.tabIndex = k === i ? 0 : -1; });
      const out = $$('.w', text);
      const swap = () => {
        cur = i; text.innerHTML = wrapWords(Q[i].t); who.innerHTML = Q[i].w;
        if (RM) { busy = false; return; }
        gsap.from($$('.w', text), { yPercent: 110, duration: .9, ease: 'expo.out', stagger: .025, onComplete: () => (busy = false) });
        gsap.from(who, { opacity: 0, y: 10, duration: .6, delay: .3 });
      };
      if (RM || !out.length) return swap();
      gsap.to(out, { yPercent: -110, duration: .35, ease: 'power2.in', stagger: .01, onComplete: swap });
    }
    text.innerHTML = wrapWords(Q[0].t);
    tabs.forEach((t, k) => {
      t.tabIndex = k === 0 ? 0 : -1;
      t.addEventListener('click', () => go(k));
      t.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        const n = (k + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
        tabs[n].focus(); go(n);
      });
    });
    void box;
    // огромные кавычки из горизонталей
    const qc = $('.voices-quote');
    TM.watch(qc, (v) => {
      if (!v || qc.dataset.done) return; qc.dataset.done = 1;
      Promise.all([TM.noiseReady, document.fonts ? document.fonts.load('400 100px "Dela Gothic One"', '«') : 0]).then(() =>
        TM.contourText(qc, '«', { levels: 10, blur: 14, fitW: .9, maxH: 1.3, color: (l, n) => (l > n - 3 ? 'rgba(242,53,59,.5)' : 'rgba(157,178,163,.28)'), wobble: .05 }));
    }, '300px');
  })();

  // 11 · аккордеон: плавная высота + дорисовка линии
  $$('.acc-btn').forEach((b) => {
    const panel = document.getElementById(b.getAttribute('aria-controls'));
    const line = $('.acc-line path', panel);
    b.addEventListener('click', () => {
      const open = b.getAttribute('aria-expanded') !== 'true';
      b.setAttribute('aria-expanded', String(open));
      if (open) {
        panel.hidden = false;
        if (RM) return;
        gsap.fromTo(panel, { height: 0 }, { height: 'auto', duration: .7, ease: 'expo.out', onComplete: () => ScrollTrigger.refresh() });
        gsap.fromTo(line, { strokeDasharray: 700, strokeDashoffset: 700 }, { strokeDashoffset: 0, duration: 1.1, ease: 'power2.out' });
        gsap.from($('p', panel), { y: 14, opacity: 0, duration: .6, delay: .1 });
      } else {
        if (RM) { panel.hidden = true; return; }
        gsap.to(panel, { height: 0, duration: .45, ease: 'power3.inOut', onComplete: () => { panel.hidden = true; gsap.set(panel, { clearProps: 'height' }); ScrollTrigger.refresh(); } });
      }
    });
  });

  // 12 · финал: снова «я я я → МЫ», только огромное
  const yaFin = TM.YaParticles($('.ya-canvas--final'), { word: 'МЫ', max: 620, fit: TM.mobile() ? .92 : .7 });
  if (RM) setTimeout(() => yaFin.set(1), 400);
  else ScrollTrigger.create({ trigger: '.final', start: 'top 85%', end: 'top 15%', scrub: true, onUpdate: (s) => yaFin.set(s.progress) });

  // подвал: «МЫ» из горизонталей, обрезанное снизу
  const fm = $('.ftr-my');
  TM.watch(fm, (v) => {
    if (!v || fm.dataset.done) return; fm.dataset.done = 1;
    Promise.all([TM.noiseReady, document.fonts ? document.fonts.load('400 100px "Dela Gothic One"', 'МЫ') : 0]).then(() =>
      TM.contourText(fm, 'МЫ', { levels: 11, blur: 9, fitW: .98, baseline: 'bottom', maxH: 2, color: (l, n) => (l >= n - 2 ? 'rgba(242,53,59,.85)' : 'rgba(157,178,163,.42)') }));
  }, '400px');

  /* ================= курсор и магниты ================= */
  if (TM.fine && !RM) {
    document.body.classList.add('has-cursor');
    const cur = $('.cursor'), label = $('.cursor-label');
    const qx = gsap.quickTo(cur, 'x', { duration: .25, ease: 'power3' }), qy = gsap.quickTo(cur, 'y', { duration: .25, ease: 'power3' });
    let lastT = null;
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      qx(e.clientX); qy(e.clientY);
      cur.classList.toggle('is-left', e.clientX > innerWidth - 170);
      const t = e.target.closest('[data-cursor], .a-hill, a, button, [role="button"]');
      if (t === lastT) return; lastT = t;
      if (!t) { cur.classList.remove('is-pin'); return; }
      let txt = t.getAttribute('data-cursor');
      if (!txt) txt = t.closest('.a-hill') ? 'смотреть' : t.tagName === 'A' ? 'открыть' : 'нажать';
      if (t.closest('.print') && t.closest('.prints') && !$('#desk').querySelector('.is-drag')) txt = 'тащи · клик';
      label.textContent = txt; cur.classList.add('is-pin');
    });
    document.addEventListener('pointerleave', () => cur.classList.remove('is-pin'));

    $$('.magnet').forEach((m) => {
      const qx2 = gsap.quickTo(m, 'x', { duration: .6, ease: 'elastic.out(1,.4)' }), qy2 = gsap.quickTo(m, 'y', { duration: .6, ease: 'elastic.out(1,.4)' });
      const inner = $('span', m), ix = gsap.quickTo(inner, 'x', { duration: .6, ease: 'power3' }), iy = gsap.quickTo(inner, 'y', { duration: .6, ease: 'power3' });
      m.addEventListener('pointermove', (e) => {
        const r = m.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        qx2(dx * .35); qy2(dy * .45); ix(dx * .12); iy(dy * .12);
      });
      m.addEventListener('pointerleave', () => { qx2(0); qy2(0); ix(0); iy(0); });
    });
  }

  /* ================= старт ================= */
  window.addEventListener('load', () => ScrollTrigger.refresh());
  if ('ResizeObserver' in window && lenis) new ResizeObserver(() => lenis.resize()).observe(document.body);
  headerTone(); compassProgress();
  runIntro();
  window.__tm = { lenis, ScrollTrigger };
})();
