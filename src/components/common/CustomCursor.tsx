import { useEffect, useRef } from 'react';
import gsap from 'gsap';

// Cursor personalizado con seguimiento suave — solo visible en desktop
export default function CustomCursor() {
  const dotRef  = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Solo en dispositivos con puntero fino (desktop)
    if (window.matchMedia('(pointer: coarse)').matches) return;

    const dot  = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    // Ocultar cursor nativo
    document.body.style.cursor = 'none';

    const onMove = (e: MouseEvent) => {
      // Punto: instantáneo
      gsap.set(dot, { x: e.clientX, y: e.clientY });
      // Anillo: suavizado con lag
      gsap.to(ring, { x: e.clientX, y: e.clientY, duration: 0.18, ease: 'power2.out' });
    };

    const onEnterLink = () => {
      gsap.to(ring, { scale: 2.2, opacity: 0.4, duration: 0.25, ease: 'power2.out' });
      gsap.to(dot,  { scale: 0.4, duration: 0.25 });
    };

    const onLeaveLink = () => {
      gsap.to(ring, { scale: 1, opacity: 0.7, duration: 0.3, ease: 'power2.out' });
      gsap.to(dot,  { scale: 1, duration: 0.3 });
    };

    const onDown = () => gsap.to(ring, { scale: 0.8, duration: 0.1 });
    const onUp   = () => gsap.to(ring, { scale: 1,   duration: 0.2, ease: 'back.out(2)' });

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup',   onUp);

    // Ampliar en hover de links y botones
    const addHover = () => {
      document.querySelectorAll('a, button, [role="button"], input, textarea, select').forEach((el) => {
        el.addEventListener('mouseenter', onEnterLink);
        el.addEventListener('mouseleave', onLeaveLink);
      });
    };
    addHover();

    // Re-aplicar en cambios del DOM
    const observer = new MutationObserver(addHover);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup',   onUp);
      observer.disconnect();
    };
  }, []);

  return (
    <>
      {/* Punto central */}
      <div
        ref={dotRef}
        className="fixed top-0 left-0 z-[9999] w-2 h-2 bg-emerald-500 rounded-full pointer-events-none -translate-x-1/2 -translate-y-1/2 mix-blend-difference"
        aria-hidden="true"
      />
      {/* Anillo exterior */}
      <div
        ref={ringRef}
        className="fixed top-0 left-0 z-[9998] w-8 h-8 border-2 border-emerald-500 rounded-full pointer-events-none -translate-x-1/2 -translate-y-1/2 opacity-70"
        aria-hidden="true"
      />
    </>
  );
}
