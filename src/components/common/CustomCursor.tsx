import { useEffect, useRef } from 'react';

export default function CustomCursor() {
  const dotRef  = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) return;

    const dot  = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    document.body.style.cursor = 'none';

    let mx = 0, my = 0;
    let rx = 0, ry = 0;
    let rafId = 0;

    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
    };

    const tick = () => {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    const onEnterLink = () => { ring.style.scale = '2.2'; ring.style.opacity = '0.4'; dot.style.scale = '0.4'; };
    const onLeaveLink = () => { ring.style.scale = '1';   ring.style.opacity = '0.7'; dot.style.scale = '1'; };
    const onDown = () => { ring.style.scale = '0.8'; };
    const onUp   = () => { ring.style.scale = '1'; };

    const addHover = () => {
      document.querySelectorAll('a, button, [role="button"], input, textarea, select').forEach((el) => {
        el.addEventListener('mouseenter', onEnterLink);
        el.addEventListener('mouseleave', onLeaveLink);
      });
    };
    addHover();

    const observer = new MutationObserver(addHover);
    observer.observe(document.body, { childList: true, subtree: true });

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup',   onUp);

    return () => {
      document.body.style.cursor = '';
      cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup',   onUp);
      observer.disconnect();
    };
  }, []);

  return (
    <>
      <div ref={dotRef}
        className="fixed top-0 left-0 z-[9999] w-2 h-2 bg-emerald-500 rounded-full pointer-events-none mix-blend-difference [transition:scale_0.25s]"
        aria-hidden="true"
      />
      <div ref={ringRef}
        className="fixed top-0 left-0 z-[9998] w-8 h-8 border-2 border-emerald-500 rounded-full pointer-events-none opacity-70 [transition:scale_0.25s,opacity_0.25s]"
        aria-hidden="true"
      />
    </>
  );
}
