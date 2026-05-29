/* ===== CRÉATIS — Animations légères (IntersectionObserver + CSS) ===== */

(function () {
  'use strict';

  /* ── Hero — fade simple au chargement ── */
  const heroEls = [
    document.querySelector('.hero-badge'),
    document.querySelector('.hero h1'),
    document.querySelector('.hero-sous-titre'),
    document.querySelector('.hero-cta')
  ].filter(Boolean);

  heroEls.forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transition = `opacity 0.6s ease ${i * 0.12}s`;
  });

  requestAnimationFrame(() => requestAnimationFrame(() => {
    heroEls.forEach(el => { el.style.opacity = '1'; });
  }));

  /* ── Fade-in au scroll (opacity seulement — pas de translateY) ── */
  const style = document.createElement('style');
  style.textContent = '.anim-ready{opacity:0;transition:opacity .55s ease}.anim-ready.anim-in{opacity:1}';
  document.head.appendChild(style);

  const TARGETS = '.section-entete,.stat-item,.agent-carte,.etape,.showcase-item,.carte-tarif,.cta-final';

  document.querySelectorAll(TARGETS).forEach(el => el.classList.add('anim-ready'));

  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('anim-in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.anim-ready').forEach(el => io.observe(el));

  /* ── Compteurs animés ── */
  document.querySelectorAll('.stat-item h3').forEach(el => {
    const raw = el.textContent.trim();
    const match = raw.match(/^([+~]?)(\d[\d\s]*)([x%s]?)(.*)$/);
    if (!match) return;
    const prefix = match[1] || '';
    const num    = parseInt(match[2].replace(/\s/g, ''));
    const suffix = match[3] || '';
    const rest   = match[4] || '';
    if (isNaN(num) || num <= 1) return;

    const counter = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        counter.unobserve(el);
        const start = performance.now();
        const dur = 1400;
        function step(now) {
          const p = Math.min((now - start) / dur, 1);
          const ease = 1 - Math.pow(1 - p, 3);
          const v = Math.round(ease * num);
          el.textContent = prefix + (v >= 1000 ? v.toLocaleString('fr-FR') : v) + suffix + rest;
          if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      });
    }, { threshold: 0.5 });
    counter.observe(el);
  });

})();
