/* Общие инструменты: случайность с зерном, шум, marching squares, контуры текста, волнистые границы. */
(function () {
  'use strict';
  const TM = (window.TM = window.TM || {});

  TM.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  TM.mobile = () => window.innerWidth < 861;
  TM.fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  TM.dpr = () => Math.min(window.devicePixelRatio || 1, 2);
  TM.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  TM.lerp = (a, b, t) => a + (b - a) * t;

  // mulberry32 — детерминированный rng, чтобы карта рисовалась одинаково
  TM.rng = function (seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  /* --- simplex 3D. Основной источник — пакет simplex-noise с CDN;
         пока он грузится (или если CDN недоступен) работает своя реализация того же алгоритма. --- */
  function makeSimplex3(random) {
    const grad = [[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]];
    const p = new Uint8Array(256); for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) { const r = Math.floor(random() * (i + 1)); const t = p[i]; p[i] = p[r]; p[r] = t; }
    const perm = new Uint8Array(512), pm12 = new Uint8Array(512);
    for (let i = 0; i < 512; i++) { perm[i] = p[i & 255]; pm12[i] = perm[i] % 12; }
    const F3 = 1 / 3, G3 = 1 / 6;
    return function (x, y, z) {
      const s = (x + y + z) * F3, i = Math.floor(x + s), j = Math.floor(y + s), k = Math.floor(z + s);
      const t = (i + j + k) * G3, x0 = x - i + t, y0 = y - j + t, z0 = z - k + t;
      let i1, j1, k1, i2, j2, k2;
      if (x0 >= y0) { if (y0 >= z0) { i1=1;j1=0;k1=0;i2=1;j2=1;k2=0; } else if (x0 >= z0) { i1=1;j1=0;k1=0;i2=1;j2=0;k2=1; } else { i1=0;j1=0;k1=1;i2=1;j2=0;k2=1; } }
      else { if (y0 < z0) { i1=0;j1=0;k1=1;i2=0;j2=1;k2=1; } else if (x0 < z0) { i1=0;j1=1;k1=0;i2=0;j2=1;k2=1; } else { i1=0;j1=1;k1=0;i2=1;j2=1;k2=0; } }
      const x1 = x0 - i1 + G3, y1 = y0 - j1 + G3, z1 = z0 - k1 + G3;
      const x2 = x0 - i2 + 2 * G3, y2 = y0 - j2 + 2 * G3, z2 = z0 - k2 + 2 * G3;
      const x3 = x0 - 1 + 3 * G3, y3 = y0 - 1 + 3 * G3, z3 = z0 - 1 + 3 * G3;
      const ii = i & 255, jj = j & 255, kk = k & 255;
      let n = 0, tt, g;
      tt = .6 - x0*x0 - y0*y0 - z0*z0; if (tt > 0) { g = grad[pm12[ii + perm[jj + perm[kk]]]]; tt *= tt; n += tt * tt * (g[0]*x0 + g[1]*y0 + g[2]*z0); }
      tt = .6 - x1*x1 - y1*y1 - z1*z1; if (tt > 0) { g = grad[pm12[ii + i1 + perm[jj + j1 + perm[kk + k1]]]]; tt *= tt; n += tt * tt * (g[0]*x1 + g[1]*y1 + g[2]*z1); }
      tt = .6 - x2*x2 - y2*y2 - z2*z2; if (tt > 0) { g = grad[pm12[ii + i2 + perm[jj + j2 + perm[kk + k2]]]]; tt *= tt; n += tt * tt * (g[0]*x2 + g[1]*y2 + g[2]*z2); }
      tt = .6 - x3*x3 - y3*y3 - z3*z3; if (tt > 0) { g = grad[pm12[ii + 1 + perm[jj + 1 + perm[kk + 1]]]]; tt *= tt; n += tt * tt * (g[0]*x3 + g[1]*y3 + g[2]*z3); }
      return 32 * n;
    };
  }
  TM.noise3 = makeSimplex3(TM.rng(1999));
  TM.noiseReady = import('https://cdn.jsdelivr.net/npm/simplex-noise@4.0.3/+esm')
    .then((m) => { TM.noise3 = m.createNoise3D(TM.rng(1999)); return true; })
    .catch(() => false);

  /* --- marching squares: рисует изолинии уровня по сетке значений прямо в контекст ---
     f — Float32Array (cols+1)*(rows+1), cell — шаг сетки в px */
  TM.isoline = function (ctx, f, cols, rows, cell, level, ox, oy) {
    ox = ox || 0; oy = oy || 0;
    const W = cols + 1;
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const a = f[j * W + i], b = f[j * W + i + 1], c = f[(j + 1) * W + i + 1], d = f[(j + 1) * W + i];
        let idx = 0;
        if (a > level) idx |= 8; if (b > level) idx |= 4; if (c > level) idx |= 2; if (d > level) idx |= 1;
        if (idx === 0 || idx === 15) continue;
        const x = ox + i * cell, y = oy + j * cell;
        // точки на рёбрах: верх, право, низ, лево
        const tX = x + cell * ((level - a) / (b - a)), rY = y + cell * ((level - b) / (c - b));
        const bX = x + cell * ((level - d) / (c - d)), lY = y + cell * ((level - a) / (d - a));
        switch (idx) {
          case 1: case 14: ctx.moveTo(x, lY); ctx.lineTo(bX, y + cell); break;
          case 2: case 13: ctx.moveTo(bX, y + cell); ctx.lineTo(x + cell, rY); break;
          case 3: case 12: ctx.moveTo(x, lY); ctx.lineTo(x + cell, rY); break;
          case 4: case 11: ctx.moveTo(tX, y); ctx.lineTo(x + cell, rY); break;
          case 5: ctx.moveTo(x, lY); ctx.lineTo(tX, y); ctx.moveTo(bX, y + cell); ctx.lineTo(x + cell, rY); break;
          case 6: case 9: ctx.moveTo(tX, y); ctx.lineTo(bX, y + cell); break;
          case 7: case 8: ctx.moveTo(x, lY); ctx.lineTo(tX, y); break;
          case 10: ctx.moveTo(tX, y); ctx.lineTo(x + cell, rY); ctx.moveTo(x, lY); ctx.lineTo(bX, y + cell); break;
        }
      }
    }
  };

  // подогнать canvas под CSS-размер с учётом DPR (≤ 2)
  TM.fitCanvas = function (cv, dprMax) {
    const r = cv.getBoundingClientRect();
    const dpr = Math.min(TM.dpr(), dprMax || 2);
    const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    return { w: r.width, h: r.height, dpr };
  };

  /* --- статичная топография (стол архива, листы смен) --- */
  TM.drawTopo = function (cv, o) {
    o = Object.assign({ seed: 7, scale: 0.0042, levels: 14, color: 'rgba(16,35,28,.16)', strong: 'rgba(16,35,28,.3)', cell: 9, w: null, h: null, z: 0 }, o || {});
    const ctx = cv.getContext('2d');
    let w = o.w, h = o.h, dpr = 1;
    if (!w) { const s = TM.fitCanvas(cv, 1.5); w = s.w; h = s.h; dpr = s.dpr; } else { cv.width = w; cv.height = h; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    const cols = Math.ceil(w / o.cell), rows = Math.ceil(h / o.cell), W = cols + 1;
    const f = new Float32Array(W * (rows + 1));
    const n = TM.noise3, sc = o.scale, z = o.seed * 3.1 + o.z;
    for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) {
      const x = i * o.cell, y = j * o.cell;
      f[j * W + i] = n(x * sc, y * sc, z) * .75 + n(x * sc * 2.3, y * sc * 2.3, z + 9) * .25;
    }
    ctx.lineWidth = 1;
    for (let l = 0; l < o.levels; l++) {
      const lv = -0.9 + (1.8 * (l + 0.5)) / o.levels;
      ctx.beginPath(); TM.isoline(ctx, f, cols, rows, o.cell, lv);
      ctx.strokeStyle = l % 5 === 2 ? o.strong : o.color; ctx.stroke();
    }
    return cv;
  };

  /* --- контуры текста: слово как гора из горизонталей (подвал, кавычки) --- */
  TM.contourText = function (cv, text, o) {
    o = Object.assign({ font: '400 100px "Dela Gothic One"', levels: 9, color: '#9DB2A3', fill: null, blur: 10, align: 'center', baseline: 'alphabetic', fitW: .96, yShift: 0, lineWidth: 1.1, wobble: 0.06, seed: 3 }, o || {});
    const s = TM.fitCanvas(cv, 2), ctx = cv.getContext('2d');
    // поле считаем в низком разрешении
    const k = Math.min(1, 520 / s.w), fw = Math.max(40, Math.round(s.w * k)), fh = Math.max(30, Math.round(s.h * k));
    const off = document.createElement('canvas'); off.width = fw; off.height = fh;
    const oc = off.getContext('2d');
    oc.fillStyle = '#fff'; oc.textAlign = 'center'; oc.textBaseline = 'alphabetic';
    oc.font = o.font.replace(/\d+px/, '100px');
    const m = oc.measureText(text);
    const fs = Math.min((fw * o.fitW) / m.width * 100, o.maxH ? fh * o.maxH : 1e9);
    oc.font = o.font.replace(/\d+px/, fs + 'px');
    const asc = (m.actualBoundingBoxAscent || 72) * fs / 100;
    const y = o.baseline === 'bottom' ? fh + asc * 0.32 + o.yShift * fh : fh / 2 + asc / 2 + o.yShift * fh;
    oc.fillText(text, fw / 2, y);
    const img = oc.getImageData(0, 0, fw, fh).data;
    let a = new Float32Array(fw * fh);
    for (let i = 0; i < a.length; i++) a[i] = img[i * 4 + 3] / 255;
    // три прохода box blur — гладкие склоны
    const r = Math.max(1, Math.round(o.blur * k * (s.w / 520 > 1 ? 1 : 1)));
    const tmp = new Float32Array(a.length);
    for (let pass = 0; pass < 3; pass++) {
      for (let yy = 0; yy < fh; yy++) { let acc = 0; for (let xx = -r; xx <= r; xx++) acc += a[yy * fw + TM.clamp(xx, 0, fw - 1)];
        for (let xx = 0; xx < fw; xx++) { tmp[yy * fw + xx] = acc / (2 * r + 1); acc += a[yy * fw + TM.clamp(xx + r + 1, 0, fw - 1)] - a[yy * fw + TM.clamp(xx - r, 0, fw - 1)]; } }
      for (let xx = 0; xx < fw; xx++) { let acc = 0; for (let yy = -r; yy <= r; yy++) acc += tmp[TM.clamp(yy, 0, fh - 1) * fw + xx];
        for (let yy = 0; yy < fh; yy++) { a[yy * fw + xx] = acc / (2 * r + 1); acc += tmp[TM.clamp(yy + r + 1, 0, fh - 1) * fw + xx] - tmp[TM.clamp(yy - r, 0, fh - 1) * fw + xx]; } }
    }
    // лёгкий шум — склоны «неровные», как на настоящей карте
    const n = TM.noise3;
    for (let yy = 0; yy < fh; yy++) for (let xx = 0; xx < fw; xx++) a[yy * fw + xx] += n(xx * .045, yy * .045, o.seed) * o.wobble;
    ctx.setTransform(s.dpr / k, 0, 0, s.dpr / k, 0, 0);
    ctx.clearRect(0, 0, fw, fh);
    ctx.lineWidth = o.lineWidth * k; ctx.lineJoin = 'round';
    for (let l = 0; l < o.levels; l++) {
      const lv = 0.06 + (0.88 * l) / (o.levels - 1);
      ctx.beginPath(); TM.isoline(ctx, a, fw - 1, fh - 1, 1, lv);
      ctx.strokeStyle = typeof o.color === 'function' ? o.color(l, o.levels) : o.color; ctx.stroke();
    }
  };

  /* --- волнистая граница секций: заливка цветом секции + 2 горизонтали над ней --- */
  TM.edgePath = function (w, h, seed, phase, amp, off) {
    const n = TM.noise3, pts = [], steps = 28;
    for (let i = 0; i <= steps; i++) {
      const x = (w * i) / steps;
      const y = h * (0.55 + off) + amp * h * (n(i * 0.21, seed, phase) * 0.8 + Math.sin(i * 0.5 + seed + phase * 2) * 0.2);
      pts.push([x, y]);
    }
    return TM.smoothPath(pts);
  };
  TM.smoothPath = function (pts, closed) {
    // Catmull-Rom → кубические Безье
    const p = pts, n = p.length;
    if (n < 2) return '';
    let d = `M${p[0][0].toFixed(1)},${p[0][1].toFixed(1)}`;
    const len = closed ? n : n - 1;
    for (let i = 0; i < len; i++) {
      const p0 = p[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], p1 = p[i], p2 = p[(i + 1) % n], p3 = p[closed ? (i + 2) % n : Math.min(n - 1, i + 2)];
      const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
      const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += `C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
    }
    return closed ? d + 'Z' : d;
  };

  TM.buildEdges = function () {
    const NS = 'http://www.w3.org/2000/svg';
    const edges = [...document.querySelectorAll('.edge')];
    edges.forEach((el, k) => {
      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('viewBox', '0 0 1000 100'); svg.setAttribute('preserveAspectRatio', 'none');
      const fill = document.createElementNS(NS, 'path'); fill.setAttribute('class', 'e-fill');
      const l1 = document.createElementNS(NS, 'path'); l1.setAttribute('class', 'e-line');
      const l2 = document.createElementNS(NS, 'path'); l2.setAttribute('class', 'e-line');
      svg.append(l2, l1, fill); el.appendChild(svg);
      const seed = 11 + k * 7.3;
      el._draw = (phase) => {
        const top = TM.edgePath(1000, 100, seed, phase, 0.32, 0);
        fill.setAttribute('d', top + 'L1000,101L0,101Z');
        l1.setAttribute('d', TM.edgePath(1000, 100, seed + .4, phase * 1.15, 0.32, -0.2));
        l2.setAttribute('d', TM.edgePath(1000, 100, seed + .8, phase * 1.3, 0.3, -0.4));
      };
      el._draw(0);
    });
    return edges;
  };

  // IntersectionObserver-хелпер: колбэк получает видимость
  TM.watch = function (el, cb, margin) {
    const io = new IntersectionObserver((es) => es.forEach((e) => cb(e.isIntersecting, e)), { rootMargin: margin || '120px 0px' });
    io.observe(el); return io;
  };
})();
