/* Chronocyclegraph plate: ambient light traces plus a live trace of the visitor's own cursor.
   Nothing leaves the browser. Also: pinned horizontal process (GSAP). */
(() => {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const section = document.querySelector('.plate');
  const canvas = document.getElementById('plate');
  if (!section || !canvas) return;
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = section.clientWidth; H = section.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  }

  // Three "hands": smooth looping paths, like the repeated motions in a Gilbreth photograph.
  const hands = [
    { cx: .62, cy: .34, ax: .20, ay: .14, fx: 1.0, fy: 2.0, sp: .55, ph: 0.0 },
    { cx: .78, cy: .52, ax: .13, ay: .20, fx: 3.0, fy: 2.0, sp: .38, ph: 1.7 },
    { cx: .45, cy: .22, ax: .26, ay: .09, fx: 2.0, fy: 3.0, sp: .44, ph: 3.1 }
  ].map(h => ({ ...h, last: null, tick: 0 }));

  function handPos(h, t) {
    const drift = Math.sin(t * .07 + h.ph) * .03;
    return [
      (h.cx + drift + h.ax * Math.sin(h.fx * t * h.sp + h.ph)) * W,
      (h.cy + h.ay * Math.sin(h.fy * t * h.sp)) * H
    ];
  }

  function stroke(a, b, alpha, wide) {
    ctx.strokeStyle = `rgba(255,170,60,${alpha * .22})`; ctx.lineWidth = wide * 3.5;
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    ctx.strokeStyle = `rgba(255,226,170,${alpha})`; ctx.lineWidth = wide;
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
  }

  function stepHands(t, live) {
    for (const h of hands) {
      const p = handPos(h, t);
      h.tick++;
      if (live && !moved && h.last) ambient(h, p);
      // Interrupted light: on for 5 frames, off for 3, like the flashing lamps in a chronocyclegraph.
      if (h.last && h.tick % 8 < 5) stroke(h.last, p, .8, 1.8);
      if (h.tick % 40 === 0) { ctx.fillStyle = 'rgba(255,242,212,.9)'; ctx.beginPath(); ctx.arc(p[0], p[1], 2.2, 0, 7); ctx.fill(); }
      h.last = p;
    }
  }

  // Visitor trace and readout
  const rMoves = document.getElementById('r-moves'), rHolds = document.getElementById('r-holds'), rPath = document.getElementById('r-path'), rHint = document.getElementById('r-hint');
  const rTitle = document.getElementById('r-title');
  let me = null, moves = 0, holds = 0, path = 0, sinceCount = 0, holdTimer = 0, moved = false;
  const PX_PER_M = 3780; // CSS pixels per metre at 96 dpi

  // Until the visitor moves, the readout counts the plate's own "hands", so it never sits at zero.
  let aMoves = 0, aHolds = 0, aPath = 0, aSince = 0, aFrame = 0;
  function ambient(h, p) {
    const d = Math.hypot(p[0] - h.last[0], p[1] - h.last[1]);
    aPath += d; aSince += d;
    if (aSince > 60) { aMoves++; aSince = 0; }
    if (h.tick % 40 === 0) aHolds++;
    if (++aFrame % 6) return;
    rMoves.textContent = aMoves; rHolds.textContent = aHolds; rPath.textContent = (aPath / PX_PER_M).toFixed(1) + ' m';
  }

  function onMove(e) {
    const r = canvas.getBoundingClientRect();
    const p = [e.clientX - r.left, e.clientY - r.top];
    if (me) {
      const d = Math.hypot(p[0] - me[0], p[1] - me[1]);
      if (d > 0) {
        ctx.globalCompositeOperation = 'lighter';
        stroke(me, p, .95, 2.4);
        ctx.globalCompositeOperation = 'source-over';
        path += d; sinceCount += d;
        if (sinceCount > 60) { moves++; sinceCount = 0; }
        rMoves.textContent = moves; rPath.textContent = (path / PX_PER_M).toFixed(1) + ' m';
        if (!moved) { moved = true; if (rTitle) rTitle.textContent = 'Your motion study, live'; rHolds.textContent = holds; rHint.textContent = 'Every stop becomes a pause. Every line, a motion. That is what Therblig measures.'; }
      }
    }
    me = p;
    clearTimeout(holdTimer);
    holdTimer = setTimeout(() => {
      if (!me) return;
      holds++; rHolds.textContent = holds;
      ctx.strokeStyle = 'rgba(255,210,122,.9)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(me[0], me[1], 9, 0, 7); ctx.stroke();
    }, 550);
  }
  section.addEventListener('pointermove', onMove, { passive: true });
  section.addEventListener('pointerleave', () => { me = null; clearTimeout(holdTimer); });

  // Animation loop: slow fade (a long exposure that keeps the last few seconds)
  let running = false, raf = 0, t0 = performance.now();
  function frame(now) {
    const t = (now - t0) / 1000;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0,0,0,.022)'; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    stepHands(t, true);
    ctx.globalCompositeOperation = 'source-over';
    if (running) raf = requestAnimationFrame(frame);
  }
  function start() { if (!running && !reduce) { running = true; raf = requestAnimationFrame(frame); } }
  function stop() { running = false; cancelAnimationFrame(raf); }

  function staticExposure() {
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 900; i++) stepHands(i / 60, true);
    ctx.globalCompositeOperation = 'source-over';
  }

  resize();
  // Pre-expose a few seconds so the plate is never empty on first paint.
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 240; i++) stepHands(i / 60 - 4);
  ctx.globalCompositeOperation = 'source-over';
  t0 = performance.now() - 0;
  if (reduce) staticExposure();

  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { resize(); hands.forEach(h => h.last = null); if (reduce) staticExposure(); }, 150); });

  new IntersectionObserver(([e]) => {
    if (e.isIntersecting) start(); else stop();
  }, { threshold: [0, .12, .5] }).observe(section);
  document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());

  // Pinned horizontal process on wide screens
  addEventListener('load', () => {
    if (!window.gsap || !window.ScrollTrigger || reduce) return;
    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia();
    mm.add('(min-width: 981px)', () => {
      const track = document.querySelector('.track');
      const dist = () => Math.max(0, track.scrollWidth - innerWidth);
      gsap.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: '.process', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: .6, invalidateOnRefresh: true } });
    });
    gsap.from('.hero h1', { y: 30, autoAlpha: 0, duration: 1, ease: 'power3.out' });
  });
})();
