import { useEffect, useRef } from 'react';

/**
 * A thin bar under the header showing how far down a long page the visitor is (FR-64).
 * Decoration only, so hidden from screen readers. The width is set through the CSSOM, which
 * the Content Security Policy allows, unlike inline style attributes.
 */
export function ScrollProgress() {
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;
    function update() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const scrollable = document.documentElement.scrollHeight - window.innerHeight;
        const progress = scrollable > 0 ? Math.min(1, window.scrollY / scrollable) : 0;
        bar.current?.style.setProperty('--progress', String(progress));
      });
    }
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return <div className="scroll-progress" ref={bar} aria-hidden="true" />;
}
