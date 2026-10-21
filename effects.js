// Progressive enhancement: content remains visible if JavaScript or motion is disabled.
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const activeAnimations = new Set();
  let observer;
  const seenCards = new Set();

  function arrow() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    for (const [name, value] of Object.entries({ viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', class: 'link-arrow' })) svg.setAttribute(name, value);
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M7 17 17 7M7 7h10v10'); svg.append(path);
    return svg;
  }

  function watchReveal(node, index = 0) {
    if (!(node instanceof HTMLElement) || node.closest('#hero') || node.dataset.motionObserved) return;
    node.dataset.motionObserved = 'true';
    const cardId = node.classList.contains('game-card') ? node.dataset.placeId : null;
    const bounds = node.getBoundingClientRect();
    if (reduced.matches || (cardId && seenCards.has(cardId)) || bounds.top < innerHeight && bounds.bottom > 0) {
      if (cardId) seenCards.add(cardId);
      return;
    }
    node.style.setProperty('--reveal-delay', `${Math.min(index % 4, 3) * 45}ms`);
    node.classList.add('motion-pending'); observer.observe(node);
  }

  function setupReveals() {
    if (!('IntersectionObserver' in window) || reduced.matches) return;
    observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('motion-revealed');
        if (entry.target.dataset.placeId) seenCards.add(entry.target.dataset.placeId);
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.08, rootMargin: '0px 0px -28px 0px' });
    document.querySelectorAll('.section-header, .game-card, .studio-story, .value-card, .contact-cards, .contact-profile-card, .role-details, .apply-card, .policy-section').forEach(watchReveal);
    // API refreshes replace cards; keep already-seen games steady, reveal new ones.
    const updates = new MutationObserver(records => {
      for (const record of records) {
        record.removedNodes.forEach(node => { if (node instanceof HTMLElement) observer.unobserve(node); });
        [...record.addedNodes].forEach((node, index) => {
          if (node instanceof HTMLElement && node.matches('.game-card')) watchReveal(node, index);
        });
      }
    });
    document.querySelectorAll('.games-grid').forEach(grid => updates.observe(grid, { childList: true }));
  }

  function setupHero() {
    const hero = document.getElementById('hero');
    if (!hero || reduced.matches || !hero.animate || hero.getBoundingClientRect().bottom <= 0 || scrollY > 100) return;
    const parts = [
      ['.hero-title', 2.45, 0, -34], ['.hero-subtitle', 1.9, 100, -15],
      ['.hero-actions', 1.7, 200, 16], ['.hero-stats', 1.55, 300, 24]
    ];
    for (const [selector, scale, delay, offset] of parts) {
      const node = hero.querySelector(selector); if (!node) continue;
      const animation = node.animate([
        { opacity: 0, transform: `translateY(${offset}px) scale(${scale})`, filter: 'blur(7px)' },
        { opacity: 1, offset: 0.25, filter: 'blur(0px)' },
        { opacity: 1, transform: 'translateY(0) scale(1)', filter: 'blur(0px)' }
      ], { duration: 1500, delay, easing: 'cubic-bezier(.16, 1, .3, 1)', fill: 'backwards' });
      activeAnimations.add(animation);
      animation.finished.then(() => activeAnimations.delete(animation), () => activeAnimations.delete(animation));
    }
  }

  function setupHeroBackground() {
    const hero = document.getElementById('hero');
    if (!hero || reduced.matches) return;
    const backdrop = document.createElement('div');
    backdrop.className = 'hero-backdrop'; backdrop.setAttribute('aria-hidden', 'true');
    const image = document.createElement('div');
    image.className = 'hero-backdrop-image';
    image.style.backgroundImage = getComputedStyle(hero).backgroundImage;
    backdrop.append(image); hero.prepend(backdrop); hero.classList.add('has-parallax');

    // A separate layer keeps the slow background move independent of the UI intro.
    if (image.animate && hero.getBoundingClientRect().bottom > 0 && scrollY <= 100) {
      const animation = image.animate([
        { transform: 'translateY(-10px) scale(1.12)' },
        { transform: 'translateY(0) scale(1)' }
      ], { duration: 2300, easing: 'cubic-bezier(.16, 1, .3, 1)', fill: 'backwards' });
      activeAnimations.add(animation);
      animation.finished.then(() => activeAnimations.delete(animation), () => activeAnimations.delete(animation));
    }
    let frame = 0;
    function update() {
      frame = 0;
      if (reduced.matches || document.hidden) return;
      const bounds = hero.getBoundingClientRect();
      if (bounds.bottom <= 0 || bounds.top >= innerHeight) return;
      const limit = innerWidth <= 800 ? 32 : 56;
      const shift = Math.min(limit, Math.max(0, scrollY) * 0.1);
      backdrop.style.setProperty('--hero-shift', `${shift}px`);
    }
    function schedule() { if (!frame) frame = requestAnimationFrame(update); }
    addEventListener('scroll', schedule, { passive: true });
    addEventListener('resize', schedule, { passive: true });
    reduced.addEventListener('change', () => {
      if (reduced.matches) {
        cancelAnimationFrame(frame); frame = 0;
        backdrop.style.setProperty('--hero-shift', '0px');
      } else schedule();
    });
    update();
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.btn-primary, .text-link').forEach(link => { if (!link.querySelector('.link-arrow')) link.append(arrow()); });
    const header = document.querySelector('.site-header');
    const measureHeader = () => document.documentElement.style.setProperty('--site-header-height', `${header?.getBoundingClientRect().height || 0}px`);
    measureHeader();
    if (header && 'ResizeObserver' in window) new ResizeObserver(measureHeader).observe(header);
    setupReveals(); setupHero(); setupHeroBackground();
  });
  reduced.addEventListener('change', () => {
    if (!reduced.matches) return;
    for (const animation of activeAnimations) animation.cancel();
    observer?.disconnect();
    document.querySelectorAll('.motion-pending').forEach(node => node.classList.add('motion-revealed'));
  });
})();
