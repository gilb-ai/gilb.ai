/* One orchestrated moment (the motion study trace) plus one scroll-linked chart. Uses GSAP 3 + ScrollTrigger. */
(() => {
  if (!window.gsap) return;
  gsap.registerPlugin(ScrollTrigger);
  const mm = gsap.matchMedia();
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const trace = document.getElementById('trace');
    const glow = document.querySelector('.trace-glow');
    if (trace) {
      const len = trace.getTotalLength();
      gsap.set([trace, glow], { strokeDasharray: len, strokeDashoffset: len });
      const stops = gsap.utils.toArray('.stop');
      gsap.set(stops.map(s => s.querySelector('.dot')), { scale: 0, transformOrigin: 'center', transformBox: 'fill-box' });
      gsap.set(stops.map(s => s.querySelector('.tag-g')), { autoAlpha: 0, y: 4 });
      const counters = gsap.utils.toArray('[data-count]');
      const D = 3.4;
      const tl = gsap.timeline({ delay: 0.35 });
      tl.to([trace, glow], { strokeDashoffset: 0, duration: D, ease: 'power2.inOut' }, 0);
      stops.forEach(s => {
        const at = parseFloat(s.dataset.at) * D;
        tl.to(s.querySelector('.dot'), { scale: 1, duration: 0.25, ease: 'back.out(3)' }, at)
          .to(s.querySelector('.tag-g'), { autoAlpha: 1, y: 0, duration: 0.3, ease: 'power1.out' }, at + 0.05);
      });
      counters.forEach(el => {
        const n = { v: 0 }, end = +el.dataset.count, suf = el.dataset.suffix || '';
        tl.to(n, { v: end, duration: D, ease: 'power2.inOut', onUpdate: () => { el.textContent = Math.round(n.v) + suf; } }, 0);
      });
    }
    const rail = document.querySelector('.chart-rail');
    if (rail) {
      gsap.fromTo(rail, { scaleX: 0 }, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: '.chart', start: 'top 75%', end: 'top 35%', scrub: 0.6 } });
      gsap.from('.chart li', { y: 18, autoAlpha: 0, duration: 0.5, stagger: 0.15, ease: 'power2.out', scrollTrigger: { trigger: '.chart', start: 'top 80%' } });
    }
  });
})();
