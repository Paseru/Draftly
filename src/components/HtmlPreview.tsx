'use client';

import React, { useEffect, useRef, useState } from 'react';

type HtmlPreviewProps = {
  html?: string;
  title: string;
  scale?: number;
  className?: string;
};

/**
 * Lightweight, lazy HTML preview used for project cards.
 * - Mounts the iframe only once it nears the viewport (IntersectionObserver).
 * - Defers actual rendering until the browser is idle to avoid jank when many cards exist.
 * - Scales the document down instead of rasterizing it to an image.
 */
const HtmlPreview: React.FC<HtmlPreviewProps> = ({ html = '', title, scale = 0.22, className }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [shouldRenderFrame, setShouldRenderFrame] = useState(false);

  const isIntersectionObserverAvailable =
    typeof window !== 'undefined' && typeof IntersectionObserver !== 'undefined';

  // Detect when the preview enters the viewport (with generous margin)
  useEffect(() => {
    if (!isIntersectionObserverAvailable) return;

    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: '300px', threshold: 0.05 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [isIntersectionObserverAvailable]);

  // Defer iframe rendering until the browser is idle to reduce main-thread contention
  useEffect(() => {
    const effectiveInView = isIntersectionObserverAvailable ? isInView : true;
    if (!effectiveInView || shouldRenderFrame) return;

    let canceled = false;
    const onIdle = () => {
      if (!canceled) setShouldRenderFrame(true);
    };

    // requestIdleCallback is optional; bind if available so we avoid an `any` cast
    const requestIdle = typeof window !== 'undefined'
      ? (window as Window & {
          requestIdleCallback?: (cb: IdleRequestCallback, opts?: { timeout?: number }) => number;
          cancelIdleCallback?: (handle: number) => void;
        }).requestIdleCallback
      : undefined;
    const cancelIdle = typeof window !== 'undefined'
      ? (window as Window & {
          requestIdleCallback?: (cb: IdleRequestCallback, opts?: { timeout?: number }) => number;
          cancelIdleCallback?: (handle: number) => void;
        }).cancelIdleCallback
      : undefined;

    if (typeof requestIdle === 'function') {
      const id = requestIdle(onIdle, { timeout: 150 });
      return () => {
        canceled = true;
        cancelIdle?.(id);
      };
    }

    const timeoutId = window.setTimeout(onIdle, 50);
    return () => {
      canceled = true;
      window.clearTimeout(timeoutId);
    };
  }, [isInView, shouldRenderFrame, isIntersectionObserverAvailable]);

  const hasHtml = !!html && html.trim().length > 0;
  const outerClass = className ? `relative w-full h-full ${className}` : 'relative w-full h-full';

  return (
    <div ref={containerRef} className={outerClass}>
      {shouldRenderFrame && hasHtml ? (
        <div
          className="absolute inset-0 origin-top-left"
          style={{
            transform: `scale(${scale})`,
            width: `${100 / scale}%`,
            height: `${100 / scale}%`,
          }}
        >
          <iframe
            srcDoc={html}
            title={title}
            className="w-full h-full border-0 pointer-events-none"
            sandbox="allow-scripts allow-same-origin"
            loading="lazy"
          />
        </div>
      ) : shouldRenderFrame ? (
        <div className="absolute inset-0 bg-[#111] text-[10px] text-zinc-600 flex items-center justify-center">
          No preview
        </div>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#111] via-[#0d0d0f] to-[#111] animate-pulse" />
      )}
    </div>
  );
};

export default HtmlPreview;
