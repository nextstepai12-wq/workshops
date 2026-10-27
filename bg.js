// خلفية تقنية متحركة: شبكة عقد متصلة تتفاعل مع المؤشر
(() => {
  const c = document.getElementById('net'), x = c.getContext('2d');
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let w, h, dpr, pts = [], mouse = { x: -999, y: -999 }, raf;
  const size = () => {
    dpr = Math.min(devicePixelRatio || 1, 2); w = innerWidth; h = innerHeight;
    c.width = w * dpr; c.height = h * dpr; x.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.min(90, Math.round(w * h / 15000));
    pts = Array.from({ length: n }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - .5) * .28, vy: (Math.random() - .5) * .28, r: Math.random() * 1.6 + .8 }));
  };
  const D = 150;
  const draw = () => {
    x.clearRect(0, 0, w, h);
    for (const p of pts) {
      if (!still) { p.x += p.vx; p.y += p.vy; if (p.x < 0 || p.x > w) p.vx *= -1; if (p.y < 0 || p.y > h) p.vy *= -1; }
      const dx = p.x - mouse.x, dy = p.y - mouse.y, d = Math.hypot(dx, dy);
      if (d < 120 && !still) { p.x += dx / d * .6; p.y += dy / d * .6; }
    }
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      for (let j = i + 1; j < pts.length; j++) {
        const b = pts[j], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < D) { x.strokeStyle = `rgba(37,99,235,${(1 - d / D) * .22})`; x.lineWidth = 1; x.beginPath(); x.moveTo(a.x, a.y); x.lineTo(b.x, b.y); x.stroke(); }
      }
      const m = Math.hypot(a.x - mouse.x, a.y - mouse.y);
      if (m < 190) { x.strokeStyle = `rgba(6,182,212,${(1 - m / 190) * .5})`; x.beginPath(); x.moveTo(a.x, a.y); x.lineTo(mouse.x, mouse.y); x.stroke(); }
      x.fillStyle = i % 5 ? 'rgba(37,99,235,.55)' : 'rgba(6,182,212,.75)'; x.beginPath(); x.arc(a.x, a.y, a.r, 0, 7); x.fill();
    }
    if (!still) raf = requestAnimationFrame(draw);
  };
  addEventListener('pointermove', e => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
  addEventListener('pointerleave', () => { mouse.x = mouse.y = -999; });
  addEventListener('resize', () => { size(); if (still) draw(); });
  document.addEventListener('visibilitychange', () => { cancelAnimationFrame(raf); if (!document.hidden && !still) draw(); });
  size(); draw();
})();
