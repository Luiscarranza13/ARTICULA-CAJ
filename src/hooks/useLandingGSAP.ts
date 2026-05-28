import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Opciones base que evitan que GSAP oculte los elementos antes de animar
const BASE: gsap.TweenVars = {
  immediateRender: false, // no aplica el estado inicial hasta que el trigger dispara
  duration: 0.7,
  ease: 'power3.out',
};

function stScroll(trigger: string, start = 'top 82%'): gsap.TweenVars {
  return {
    scrollTrigger: {
      trigger,
      start,
      toggleActions: 'play none none none',
      once: true,
    },
  };
}

export function useLandingGSAP() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Espera un tick para que React termine de montar el DOM
    const timer = setTimeout(() => {
      const ctx = gsap.context(() => {

        // ── Hero ─────────────────────────────────────────────────────────────
        gsap.from('.hero-badge', {
          ...BASE, y: -16, opacity: 0, duration: 0.5, delay: 0.1,
        });
        gsap.from('.hero-line', {
          ...BASE, y: 50, opacity: 0, duration: 0.8, stagger: 0.14, delay: 0.25,
        });
        gsap.from('.hero-sub', {
          ...BASE, y: 24, opacity: 0, duration: 0.7, delay: 0.7,
        });
        gsap.from('.hero-cta', {
          ...BASE, y: 16, opacity: 0, scale: 0.96, duration: 0.55, stagger: 0.1, delay: 0.9,
        });

        // ── Stats bar ─────────────────────────────────────────────────────────
        gsap.from('.stat-item', {
          ...BASE, ...stScroll('.stats-bar'),
          y: 32, opacity: 0, stagger: 0.1,
        });

        // ── Cadenas ───────────────────────────────────────────────────────────
        gsap.from('.cadena-card', {
          ...BASE, ...stScroll('.cadenas-section'),
          y: 40, opacity: 0, stagger: 0.09,
        });

        // ── Beneficios ────────────────────────────────────────────────────────
        gsap.from('.benefit-card', {
          ...BASE, ...stScroll('.benefits-section'),
          y: 32, opacity: 0, scale: 0.96, stagger: 0.07,
        });

        // ── Contenidos tabs ───────────────────────────────────────────────────
        gsap.from('.content-tab-btn', {
          ...BASE, ...stScroll('.content-section'),
          y: 18, opacity: 0, stagger: 0.09, duration: 0.45,
        });

        // ── Nosotros ──────────────────────────────────────────────────────────
        gsap.from('.mision-card', {
          ...BASE, ...stScroll('.nosotros-section'),
          x: -50, opacity: 0,
        });
        gsap.from('.vision-card', {
          ...BASE, ...stScroll('.nosotros-section'),
          x: 50, opacity: 0, delay: 0.1,
        });
        gsap.from('.valor-card', {
          ...BASE, ...stScroll('.valores-section'),
          y: 24, opacity: 0, stagger: 0.07, duration: 0.5,
        });

        // ── Cómo funciona ─────────────────────────────────────────────────────
        gsap.from('.paso-item', {
          ...BASE, ...stScroll('.como-funciona-section'),
          y: 40, opacity: 0, stagger: 0.13,
        });

        // ── Partners ──────────────────────────────────────────────────────────
        gsap.from('.partners-section', {
          ...BASE, ...stScroll('.partners-section'),
          opacity: 0, duration: 0.6,
        });

        ScrollTrigger.refresh();
      });

      return () => ctx.revert();
    }, 200);

    return () => {
      clearTimeout(timer);
      ScrollTrigger.getAll().forEach((t) => t.kill());
      initialized.current = false;
    };
  }, []);
}
