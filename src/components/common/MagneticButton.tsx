import { useRef, type ReactNode } from 'react';
import gsap from 'gsap';

// Botón con efecto magnético GSAP — el contenido sigue al cursor
export default function MagneticButton({
  children,
  className = '',
  strength = 0.35,
}: {
  children: ReactNode;
  className?: string;
  strength?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    gsap.to(el, { x: dx * strength, y: dy * strength, duration: 0.3, ease: 'power2.out' });
    gsap.to(inner.current, { x: dx * strength * 0.4, y: dy * strength * 0.4, duration: 0.3, ease: 'power2.out' });
  };

  const onLeave = () => {
    gsap.to(ref.current, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.5)' });
    gsap.to(inner.current, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.5)' });
  };

  return (
    <div ref={ref} className={`inline-flex ${className}`} onMouseMove={onMove} onMouseLeave={onLeave}>
      <div ref={inner}>{children}</div>
    </div>
  );
}
