'use client';

import { startTransition, useEffect, useRef, useState } from 'react';

/**
 * Mounts children only when the placeholder nears the viewport.
 * Keeps below-fold homepage sections from competing with LCP.
 */
export default function LazyMount({
  children,
  rootMargin = '400px 0px',
  minHeight = 1,
  fallback = null,
  once = true,
}) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible && once) return undefined;
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      startTransition(() => setVisible(true));
      return undefined;
    }

    const show = () => {
      startTransition(() => setVisible(true));
    };

    // If already near the viewport on mount, show immediately (no blank gray gap).
    const rect = node.getBoundingClientRect();
    const viewportH = window.innerHeight || 0;
    const marginPx = Number.parseInt(String(rootMargin), 10);
    const expand = Number.isFinite(marginPx) ? Math.abs(marginPx) : 400;
    if (rect.top < viewportH + expand && rect.bottom > -expand) {
      show();
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          show();
          if (once) observer.disconnect();
        }
      },
      { rootMargin, threshold: 0.01 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [once, rootMargin, visible]);

  return (
    <div
      ref={ref}
      style={
        visible
          ? undefined
          : { minHeight }
      }
    >
      {visible ? children : fallback}
    </div>
  );
}
