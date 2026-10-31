/* Header: transparent over the dark hero, tinted while scrolling inside it, light once the hero is gone. */
(() => {
  const header = document.getElementById('top');
  const hero = document.querySelector('[data-hero]');
  if (!header) return;
  const onScroll = () => {
    const y = scrollY;
    const heroEnd = hero ? hero.offsetTop + hero.offsetHeight - header.offsetHeight : 0;
    header.classList.toggle('scrolled', y > 30);
    header.classList.toggle('solid', !hero || y > heroEnd);
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();
})();

/* Tagline reveal: each word moves from a muted tone to full colour as it crosses a line in the viewport.
   rAF-throttled; once a word is lit it stays lit. */
(() => {
  const el = document.querySelector('[data-reveal]');
  if (!el) return;
  // Split each line (or the whole element) into word spans, keeping the authored line breaks.
  const spans = [];
  for (const box of el.querySelector('.line') ? el.querySelectorAll('.line') : [el]) {
    const words = box.textContent.trim().split(/\s+/);
    box.textContent = '';
    words.forEach((w, i) => {
      const s = document.createElement('span');
      s.className = 'w'; s.textContent = w;
      box.append(s, i < words.length - 1 ? ' ' : '');
      spans.push(s);
    });
  }
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { spans.forEach(s => s.classList.add('on')); return; }
  let lit = 0, queued = false;
  const update = () => {
    queued = false;
    const r = el.getBoundingClientRect(), vh = innerHeight;
    const progress = Math.min(1, Math.max(0, (vh * .8 - r.top) / (r.height + vh * .3)));
    const target = Math.round(progress * spans.length);
    while (lit < target) spans[lit++].classList.add('on');
    if (lit >= spans.length) removeEventListener('scroll', onScroll);
  };
  const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
  addEventListener('scroll', onScroll, { passive: true });
  update();
})();
