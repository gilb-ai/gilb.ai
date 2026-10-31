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
