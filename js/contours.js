/* Герой: живые горизонтали. simplex-noise → marching squares, 14 уровней,
   медленно дышат и прогибаются «холмом» вокруг курсора. */
(function () {
  'use strict';
  const TM = window.TM;

  TM.heroTopo = function (cv) {
    const ctx = cv.getContext('2d');
    const LEVELS = 14;
    let w = 0, h = 0, dpr = 1, cell = 12, cols = 0, rows = 0, f = null;
    let running = false, raf = 0, last = 0, t = Math.random() * 10;
    // курсор: целевая и сглаженная позиция + сила холма
    const m = { x: -9999, y: -9999, sx: -9999, sy: -9999, k: 0, tk: 0 };
    let scrollK = 0;

    function resize() {
      const s = TM.fitCanvas(cv, TM.mobile() ? 1.5 : 2);
      w = s.w; h = s.h; dpr = s.dpr;
      cell = TM.mobile() ? 20 : 12; // на мобайле плотность вдвое ниже
      cols = Math.ceil(w / cell); rows = Math.ceil(h / cell);
      f = new Float32Array((cols + 1) * (rows + 1));
      draw();
    }

    function field() {
      const n = TM.noise3, sc = 0.0021, W = cols + 1;
      const z = t * 0.05;
      const r2 = Math.pow(Math.min(w, h) * 0.17, 2);
      const drift = scrollK * 0.6;
      for (let j = 0; j <= rows; j++) {
        const y = j * cell;
        for (let i = 0; i <= cols; i++) {
          const x = i * cell;
          let v = n(x * sc, y * sc + drift, z) * 0.78 + n(x * sc * 2.4, y * sc * 2.4, z + 7.3) * 0.22;
          if (m.k > 0.002) {
            const dx = x - m.sx, dy = y - m.sy;
            v += m.k * 0.9 * Math.exp(-(dx * dx + dy * dy) / r2);
          }
          f[j * W + i] = v;
        }
      }
    }

    function draw() {
      if (!f) return;
      field();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 1;
      for (let l = 0; l < LEVELS; l++) {
        const lv = -0.95 + (2.1 * (l + 0.5)) / LEVELS;
        ctx.beginPath();
        TM.isoline(ctx, f, cols, rows, cell, lv);
        // каждая пятая — «утолщённая» горизонталь, верхние уровни — тёплые
        const top = l >= LEVELS - 2;
        ctx.strokeStyle = top ? 'rgba(242,53,59,.55)' : l % 5 === 3 ? 'rgba(157,178,163,.5)' : 'rgba(157,178,163,.2)';
        ctx.lineWidth = l % 5 === 3 ? 1.3 : 1;
        ctx.stroke();
      }
    }

    function loop(now) {
      raf = requestAnimationFrame(loop);
      // ~30 к/с — линиям не нужно больше, а батарее легче
      if (now - last < 33) return;
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      t += dt;
      m.sx += (m.x - m.sx) * 0.12; m.sy += (m.y - m.sy) * 0.12;
      m.k += (m.tk - m.k) * 0.06;
      draw();
    }
    function start() { if (running || TM.reduced) return; running = true; last = performance.now(); raf = requestAnimationFrame(loop); }
    function stop() { running = false; cancelAnimationFrame(raf); }

    const host = cv.parentElement;
    host.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const r = cv.getBoundingClientRect();
      m.x = e.clientX - r.left; m.y = e.clientY - r.top;
      if (m.sx < -999) { m.sx = m.x; m.sy = m.y; }
      m.tk = 1;
    });
    host.addEventListener('pointerleave', () => { m.tk = 0; });

    TM.watch(cv, (vis) => (vis ? start() : stop()), '0px');
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : TM.isVisible(cv) && start()));
    let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 150); });
    TM.noiseReady.then(() => draw());
    resize();
    return { setScroll(v) { scrollK = v; if (!running) draw(); } };
  };

  TM.isVisible = (el) => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; };
})();
