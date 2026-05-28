import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import gsap from 'gsap';

// Transición suave entre páginas del panel con GSAP
export function usePageTransition() {
  const location = useLocation();

  useEffect(() => {
    const el = document.querySelector('#page-content') as HTMLElement | null;
    if (!el) return;

    // Fade in desde abajo al entrar
    gsap.fromTo(
      el,
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out', clearProps: 'all' },
    );
  }, [location.pathname]);
}
