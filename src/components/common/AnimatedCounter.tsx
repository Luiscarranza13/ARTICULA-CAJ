import { useEffect, useRef, useState } from 'react';

interface Props {
  end: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

export default function AnimatedCounter({ end, duration = 1800, prefix = '', suffix = '', decimals = 0 }: Props) {
   const [count, setCount] = useState(end === 0 ? 0 : 0);
   const rafRef = useRef<number | null>(null);

   useEffect(() => {
     if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);

     if (end === 0) return;

    const startTime = performance.now();
    const from = 0;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      setCount(from + eased * (end - from));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setCount(end);
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [end, duration]);

  const formatted = count.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return <span>{prefix}{formatted}{suffix}</span>;
}
