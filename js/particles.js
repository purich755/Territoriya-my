/* «я → МЫ»: сотни маленьких «я» собираются в слово. Цели берутся из пикселей слова,
   нарисованного на offscreen-canvas. Прогресс задаёт ScrollTrigger (scrub). */
(function () {
  'use strict';
  const TM = window.TM;

  TM.YaParticles = function (cv, opts) {
    const o = Object.assign({ word: 'МЫ', max: 720, color: [157, 178, 163], to: [242, 53, 59], fit: 0.92, glyph: 'я' }, opts || {});
    const ctx = cv.getContext('2d');
    let w = 0, h = 0, dpr = 1, parts = [], progress = 0, shown = 0, t = 0;
    let running = false, raf = 0, dirty = true;
    const sprites = {};

    // спрайт «я» нужного цвета — drawImage дешевле сотен fillText
    function sprite(rgb) {
      const key = rgb.join(',');
      if (sprites[key]) return sprites[key];
      const s = document.createElement('canvas'), S = 64; s.width = S; s.height = S;
      const c = s.getContext('2d');
      c.fillStyle = `rgb(${key})`; c.font = '500 52px "Golos Text", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(o.glyph, S / 2, S / 2 + 2);
      return (sprites[key] = s);
    }

    function build() {
      const s = TM.fitCanvas(cv, 2); w = s.w; h = s.h; dpr = s.dpr;
      if (w < 10 || h < 10) return;
      // слово на offscreen: подгоняем кегль по ширине и высоте
      const off = document.createElement('canvas'); const ow = Math.round(w), oh = Math.round(h);
      off.width = ow; off.height = oh;
      const oc = off.getContext('2d');
      oc.font = '400 100px "Dela Gothic One", sans-serif';
      const mw = oc.measureText(o.word).width;
      const fs = Math.min((ow * o.fit) / mw * 100, oh * 0.9);
      oc.font = `400 ${fs}px "Dela Gothic One", sans-serif`;
      oc.textAlign = 'center'; oc.textBaseline = 'middle'; oc.fillStyle = '#000';
      oc.fillText(o.word, ow / 2, oh / 2 + fs * 0.06);
      const data = oc.getImageData(0, 0, ow, oh).data;
      // шаг сетки выбираем так, чтобы точек было не больше max
      let filled = 0; for (let i = 3; i < data.length; i += 16) if (data[i] > 128) filled++;
      filled *= 4;
      const max = TM.mobile() ? Math.round(o.max / 2) : o.max;
      const step = Math.max(4, Math.sqrt(filled / max));
      const targets = [];
      const rnd = TM.rng(42);
      for (let y = step / 2; y < oh; y += step) for (let x = step / 2; x < ow; x += step) {
        const jx = x + (rnd() - .5) * step * .5, jy = y + (rnd() - .5) * step * .5;
        if (data[(Math.round(jy) * ow + Math.round(jx)) * 4 + 3] > 128) targets.push([jx, jy]);
      }
      parts = targets.map(([tx, ty], i) => {
        const a = rnd() * Math.PI * 2, rad = (0.25 + rnd() * 0.75) * Math.max(w, h) * 0.62;
        return {
          sx: w / 2 + Math.cos(a) * rad, sy: h / 2 + Math.sin(a) * rad * 0.8,
          tx, ty, s0: 9 + rnd() * 16, s1: step * (1.22 + rnd() * .2),
          r0: (rnd() - .5) * 1.2, ph: rnd() * 6.28, sp: .4 + rnd() * .8,
          // задержка: дальние прилетают позже
          d: rnd() * 0.45,
        };
      });
      dirty = true; render();
    }

    const ease = (x) => 1 - Math.pow(1 - x, 3);
    function render() {
      if (!w) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const sa = sprite(o.color), sb = sprite(o.to);
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        const k = ease(TM.clamp((progress - p.d) / 0.55, 0, 1));
        const wob = (1 - k) * 10;
        const x = TM.lerp(p.sx, p.tx, k) + Math.sin(t * p.sp + p.ph) * wob;
        const y = TM.lerp(p.sy, p.ty, k) + Math.cos(t * p.sp * .8 + p.ph) * wob;
        const s = TM.lerp(p.s0, p.s1, k), r = p.r0 * (1 - k);
        ctx.save(); ctx.translate(x, y); if (r) ctx.rotate(r);
        if (k < 1) { ctx.globalAlpha = (1 - k) * 0.9; ctx.drawImage(sa, -s / 2, -s / 2, s, s); }
        if (k > 0) { ctx.globalAlpha = k; ctx.drawImage(sb, -s / 2, -s / 2, s, s); }
        ctx.restore();
      }
      ctx.globalAlpha = 1; dirty = false;
    }

    function loop() {
      raf = requestAnimationFrame(loop);
      t += 0.016;
      // пока слово не собрано — «я» чуть плавают; собранное слово стоит спокойно
      if (progress < 0.999 || dirty) render();
    }
    function start() { if (running) return; running = true; raf = requestAnimationFrame(loop); }
    function stop() { running = false; cancelAnimationFrame(raf); }

    TM.watch(cv, (v) => (v && !TM.reduced ? start() : stop()), '50px');
    let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(build, 200); });
    (document.fonts ? document.fonts.load('400 100px "Dela Gothic One"', o.word).then(() => document.fonts.ready) : Promise.resolve()).then(build);

    return {
      set(p) { progress = TM.clamp(p, 0, 1); dirty = true; if (!running) render(); },
      get count() { return parts.length; },
    };
  };
})();
