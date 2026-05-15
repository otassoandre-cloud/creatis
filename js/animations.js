/* ===== CRÉATIS — Animations GSAP ===== */

gsap.registerPlugin(ScrollTrigger);

(function () {
  'use strict';

  // Recalcule les positions après chargement complet (images, fonts)
  window.addEventListener('load', () => ScrollTrigger.refresh());

  // ── Utilitaires ────────────────────────────────────────────────────────────
  function splitWords(el) {
    const text = el.textContent;
    el.innerHTML = text.trim().split(/\s+/).map(w =>
      `<span style="overflow:hidden;display:inline-block;"><span class="word" style="display:inline-block;">${w}</span></span>`
    ).join(' ');
    return el.querySelectorAll('.word');
  }

  // ── Hero — fade-up mot par mot ─────────────────────────────────────────────
  const heroTitle = document.querySelector('.hero h1');
  const heroBadge = document.querySelector('.hero-badge');
  const heroSub   = document.querySelector('.hero-sous-titre');
  const heroCta   = document.querySelector('.hero-cta');

  if (heroTitle) {
    const words = splitWords(heroTitle);
    const tl = gsap.timeline({ delay: 0.15 });
    if (heroBadge) tl.from(heroBadge, { opacity: 0, y: 12, duration: 0.45, ease: 'power2.out' });
    tl.from(words, { opacity: 0, y: 28, duration: 0.55, stagger: 0.04, ease: 'power3.out' }, '-=0.15');
    if (heroSub) tl.from(heroSub, { opacity: 0, y: 16, duration: 0.45, ease: 'power2.out' }, '-=0.25');
    if (heroCta) tl.from(heroCta, { opacity: 0, y: 12, duration: 0.4,  ease: 'power2.out' }, '-=0.2');
  }

  // ── Section entêtes ────────────────────────────────────────────────────────
  gsap.utils.toArray('.section-entete').forEach(el => {
    gsap.from(el, {
      opacity: 0, y: 30, duration: 0.7, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top bottom', once: true }
    });
  });

  // ── Stats barre — chaque item se déclenche lui-même ────────────────────────
  gsap.utils.toArray('.stat-item').forEach((el, i) => {
    gsap.from(el, {
      opacity: 0, y: 20, duration: 0.5, delay: i * 0.08, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top bottom', once: true }
    });
  });

  // ── Stats — compteurs animés ────────────────────────────────────────────────
  document.querySelectorAll('.stat-item h3').forEach(el => {
    const raw   = el.textContent.trim();
    const match = raw.match(/^([+~]?)(\d[\d\s]*)([x%s]?)(.*)$/);
    if (!match) return;
    const prefix = match[1] || '';
    const num    = parseInt(match[2].replace(/\s/g, ''));
    const suffix = match[3] || '';
    const rest   = match[4] || '';
    if (isNaN(num) || num <= 1) return;
    const obj = { val: 0 };
    ScrollTrigger.create({
      trigger: el, start: 'top bottom', once: true,
      onEnter() {
        gsap.to(obj, {
          val: num, duration: 1.6, ease: 'power2.out',
          onUpdate() {
            const v = Math.round(obj.val);
            el.textContent = prefix + (v >= 1000 ? v.toLocaleString('fr-FR') : v) + suffix + rest;
          }
        });
      }
    });
  });

  // ── Agent cards — chaque carte se déclenche elle-même ─────────────────────
  gsap.utils.toArray('.agent-carte').forEach((el, i) => {
    gsap.from(el, {
      opacity: 0, y: 40, scale: 0.97, duration: 0.55,
      delay: (i % 4) * 0.08,
      ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top bottom', once: true }
    });
  });

  // ── Étapes ────────────────────────────────────────────────────────────────
  gsap.utils.toArray('.etape').forEach((el, i) => {
    gsap.from(el, {
      opacity: 0, y: 30, duration: 0.6, delay: i * 0.12, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top bottom', once: true }
    });
  });

  // ── Showcase miniatures — chaque image se déclenche elle-même ─────────────
  gsap.utils.toArray('.showcase-item').forEach((el, i) => {
    gsap.from(el, {
      opacity: 0, scale: 0.94, y: 24, duration: 0.65,
      delay: i * 0.1,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top bottom', once: true }
    });
  });

  // ── Pricing cards — chaque carte se déclenche elle-même ───────────────────
  gsap.utils.toArray('.carte-tarif').forEach((el, i) => {
    gsap.from(el, {
      opacity: 0, y: 50, scale: 0.96, duration: 0.7,
      delay: i * 0.1,
      ease: 'back.out(1.4)',
      scrollTrigger: { trigger: el, start: 'top bottom', once: true }
    });
  });

  // ── CTA final ──────────────────────────────────────────────────────────────
  const ctaFinal = document.querySelector('.cta-final');
  if (ctaFinal) {
    gsap.from(ctaFinal, {
      opacity: 0, y: 30, duration: 0.7, ease: 'power2.out',
      scrollTrigger: { trigger: ctaFinal, start: 'top bottom', once: true }
    });
  }

})();
