/* Полевой архив: стол с отпечатками. Draggable + Inertia, «Разложить по порядку» через Flip,
   лайтбокс открывается из позиции миниатюры. На телефоне — стопка, свайп снимает верхнюю. */
(function () {
  'use strict';
  const TM = window.TM;

  TM.archive = function (root) {
    const desk = root.querySelector('#desk');
    const list = desk.querySelector('.prints');
    const prints = [...list.querySelectorAll('.print')];
    const btns = prints.map((p) => p.querySelector('.print-btn'));
    const arrangeBtn = root.querySelector('#arrange');
    const rnd = TM.rng(2026);
    const rot = prints.map(() => (rnd() - .5) * 16);
    let z = 10, grid = false, drags = [], mode = null;

    /* ---------- стол (десктоп) ---------- */
    function scatter() {
      const W = desk.clientWidth, H = desk.clientHeight;
      const cols = 6, rows = 3, cw = W / cols, ch = H / rows;
      const pw = Math.min(250, W / 5.2);
      prints.forEach((p, i) => {
        const big = i % 5 === 0;
        p.style.setProperty('--w', (big ? pw * 1.18 : pw * (0.86 + rnd() * .2)) + 'px');
        const c = i % cols, r = Math.floor(i / cols) % rows;
        const x = c * cw + cw * (0.5 + (rnd() - .5) * .55) - pw / 2;
        const y = r * ch + ch * (0.5 + (rnd() - .5) * .5) - pw * .4;
        p.style.left = TM.clamp(x, -20, W - pw + 10) + 'px';
        p.style.top = TM.clamp(y, -10, H - pw * .7) + 'px';
        gsap.set(p, { x: 0, y: 0, rotation: rot[i] });
      });
    }
    function gridLayout() {
      const W = desk.clientWidth, pad = 30, cols = 6, gap = 18;
      const cw = (W - pad * 2 - gap * (cols - 1)) / cols;
      prints.forEach((p, i) => {
        p.style.setProperty('--w', cw + 'px');
        const c = i % cols, r = Math.floor(i / cols);
        p.style.left = pad + c * (cw + gap) + 'px';
        // в сетке все кадры 3:2 — ряды ровные
        p.style.top = pad + r * ((cw - 16) * 2 / 3 + 38 + gap) + 'px';
        gsap.set(p, { x: 0, y: 0, rotation: 0 });
      });
    }

    function initDesk() {
      mode = 'desk';
      scatter();
      drags = prints.map((p, i) => Draggable.create(p, {
        type: 'x,y', bounds: desk, inertia: true, edgeResistance: .8, zIndexBoost: false,
        dragClickables: true, minimumMovement: 4,
        onPress() { p.style.zIndex = ++z; },
        onDragStart() { p.classList.add('is-drag'); gsap.to(p, { scale: 1.04, rotation: rot[i] * .4, duration: .3 }); },
        onRelease() { p.classList.remove('is-drag'); gsap.to(p, { scale: 1, rotation: grid ? 0 : rot[i], duration: .5, ease: 'power3.out' }); },
        onClick() { openLb(i); },
      })[0]);
      // клавиатура: Enter/пробел — открыть (Draggable глушит click)
      btns.forEach((b, i) => b.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLb(i); } }));
    }

    function arrange() {
      const state = Flip.getState(prints);
      grid = !grid;
      desk.classList.toggle('is-grid', grid);
      if (grid) { const cw = (desk.clientWidth - 60 - 90) / 6; desk.style.height = (60 + 3 * ((cw - 16) * 2 / 3 + 38 + 18)) + 'px'; gridLayout(); }
      else { desk.style.height = ''; scatter(); }
      arrangeBtn.setAttribute('aria-pressed', String(grid));
      arrangeBtn.querySelector('span').textContent = grid ? 'Рассыпать обратно' : 'Разложить по порядку';
      Flip.from(state, { duration: 1, ease: 'expo.inOut', stagger: .025, absolute: false });
      setTimeout(() => ScrollTrigger.refresh(), 1100);
    }
    arrangeBtn.addEventListener('click', arrange);

    /* ---------- стопка (телефон) ---------- */
    let order = prints.map((_, i) => i), stackDrag = null;
    function layoutStack(animate) {
      order.forEach((idx, k) => {
        const p = prints[idx];
        p.style.left = '0px'; p.style.top = '0px'; p.style.zIndex = 100 - k;
        const vis = k < 5;
        const v = { x: 0, y: k * 7, rotation: k === 0 ? 0 : rot[idx] * .5, scale: 1 - k * .03, opacity: vis ? 1 : 0 };
        animate ? gsap.to(p, Object.assign({ duration: .5, ease: 'power3.out' }, v)) : gsap.set(p, v);
      });
      if (stackDrag) stackDrag.kill();
      const top = prints[order[0]];
      stackDrag = Draggable.create(top, {
        type: 'x', minimumMovement: 6, dragClickables: true,
        onDrag() { gsap.set(top, { rotation: this.x / 18 }); },
        onRelease() {
          if (Math.abs(this.x) > 90) {
            const dir = Math.sign(this.x);
            gsap.to(top, { x: dir * innerWidth, rotation: dir * 30, duration: .35, ease: 'power2.in', onComplete() {
              order.push(order.shift()); gsap.set(top, { x: 0 }); layoutStack(true);
            } });
          } else gsap.to(top, { x: 0, rotation: 0, duration: .4, ease: 'back.out(2)' });
        },
        onClick() { openLb(order[0]); },
      })[0];
    }
    function initStack() {
      mode = 'stack';
      drags.forEach((d) => d.kill()); drags = [];
      prints.forEach((p) => p.style.removeProperty('--w'));
      layoutStack(false);
      btns.forEach((b, i) => b.addEventListener('click', (e) => { if (mode === 'stack' && !e.detail) openLb(i); }));
    }

    function setup() {
      const want = TM.mobile() ? 'stack' : 'desk';
      if (want === mode) { if (mode === 'desk' && !grid) scatter(); return; }
      if (stackDrag) { stackDrag.kill(); stackDrag = null; }
      prints.forEach((p) => gsap.set(p, { clearProps: 'all' }));
      if (want === 'desk') initDesk(); else initStack();
    }
    setup();
    let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(setup, 220); });

    // топография под фото
    const topo = desk.querySelector('.desk-topo');
    if (topo) TM.watch(topo, (v) => { if (v && !topo.dataset.done) { topo.dataset.done = 1; TM.noiseReady.then(() => TM.drawTopo(topo, { seed: 5, scale: .0032, levels: 16, cell: 10 })); } }, '300px');

    /* ---------- лайтбокс ---------- */
    const lb = document.getElementById('lb');
    const img = lb.querySelector('.lb-img'), cap = lb.querySelector('.lb-cap');
    const nEl = lb.querySelector('.lb-n'); lb.querySelector('.lb-t').textContent = String(prints.length).padStart(2, '0');
    let cur = 0, lastFocus = null;

    function show(i, dir) {
      cur = (i + prints.length) % prints.length;
      const b = btns[cur], th = b.querySelector('img');
      nEl.textContent = String(cur + 1).padStart(2, '0');
      cap.textContent = th.alt;
      img.alt = th.alt;
      img.width = +b.dataset.fw; img.height = +b.dataset.fh;
      img.src = th.currentSrc || th.src; // сразу миниатюра, потом полный кадр
      const full = new Image(); full.src = b.dataset.full;
      full.onload = () => { if (cur === i % prints.length || cur === (i + prints.length) % prints.length) img.src = full.src; };
      if (dir && !TM.reduced) gsap.fromTo(img, { x: dir * 60, opacity: 0 }, { x: 0, opacity: 1, duration: .5, ease: 'expo.out' });
    }
    function openLb(i) {
      lastFocus = document.activeElement;
      lb.hidden = false; document.body.style.overflow = 'hidden';
      if (TM.lenis) TM.lenis.stop();
      show(i);
      const th = btns[i].querySelector('img');
      if (!TM.reduced) {
        // Flip-открытие: картинка вылетает из позиции миниатюры
        requestAnimationFrame(() => {
          const a = th.getBoundingClientRect(), b = img.getBoundingClientRect();
          gsap.fromTo(img, { x: a.left + a.width / 2 - (b.left + b.width / 2), y: a.top + a.height / 2 - (b.top + b.height / 2), scale: a.width / b.width, rotation: gsap.getProperty(prints[i], 'rotation') || 0 },
            { x: 0, y: 0, scale: 1, rotation: 0, duration: .75, ease: 'expo.out' });
          gsap.fromTo(lb.querySelector('.lb-bg'), { opacity: 0 }, { opacity: 1, duration: .4 });
          gsap.fromTo([cap, lb.querySelector('.lb-count'), ...lb.querySelectorAll('.lb-btn')], { opacity: 0 }, { opacity: 1, duration: .4, delay: .25 });
        });
      }
      lb.querySelector('.lb-close').focus({ preventScroll: true });
    }
    function closeLb() {
      const done = () => { lb.hidden = true; document.body.style.overflow = ''; if (TM.lenis) TM.lenis.start(); if (lastFocus) lastFocus.focus({ preventScroll: true }); };
      if (TM.reduced) return done();
      const th = btns[cur].querySelector('img'), a = th.getBoundingClientRect(), b = img.getBoundingClientRect();
      gsap.to(img, { x: a.left + a.width / 2 - (b.left + b.width / 2), y: a.top + a.height / 2 - (b.top + b.height / 2), scale: a.width / b.width, duration: .5, ease: 'power3.inOut' });
      gsap.to(lb.querySelector('.lb-bg'), { opacity: 0, duration: .45, onComplete() { gsap.set(img, { clearProps: 'transform' }); done(); } });
    }
    lb.querySelector('.lb-close').addEventListener('click', closeLb);
    lb.querySelector('.lb-bg').addEventListener('click', closeLb);
    lb.querySelector('.lb-prev').addEventListener('click', () => show(cur - 1, -1));
    lb.querySelector('.lb-next').addEventListener('click', () => show(cur + 1, 1));
    document.addEventListener('keydown', (e) => {
      if (lb.hidden) return;
      if (e.key === 'Escape') closeLb();
      else if (e.key === 'ArrowLeft') show(cur - 1, -1);
      else if (e.key === 'ArrowRight') show(cur + 1, 1);
      else if (e.key === 'Tab') {
        // фокус не выходит из диалога
        const f = [...lb.querySelectorAll('button')], first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    // свайп в лайтбоксе
    let sx = null;
    lb.addEventListener('pointerdown', (e) => { sx = e.clientX; });
    lb.addEventListener('pointerup', (e) => {
      if (sx == null) return; const dx = e.clientX - sx; sx = null;
      if (Math.abs(dx) > 50) show(cur + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
    });
  };
})();
