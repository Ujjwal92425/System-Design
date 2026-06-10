'use client';

import { useEffect, useState } from 'react';

interface ProgressBarProps {
  /** Optional: target scroll element. Defaults to document */
  targetId?: string;
  /** Called with 0‒100 as the user scrolls. Debounced to ~200ms */
  onProgressChange?: (percent: number) => void;
}

export function ProgressBar({ targetId, onProgressChange }: ProgressBarProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout>;

    const calculateProgress = () => {
      let scrollTop: number;
      let scrollHeight: number;
      let clientHeight: number;

      if (targetId) {
        const el = document.getElementById(targetId);
        if (!el) return;
        scrollTop = el.scrollTop;
        scrollHeight = el.scrollHeight;
        clientHeight = el.clientHeight;
      } else {
        scrollTop = window.scrollY;
        scrollHeight = document.documentElement.scrollHeight;
        clientHeight = window.innerHeight;
      }

      const scrollable = scrollHeight - clientHeight;
      if (scrollable <= 0) {
        setProgress(100);
        onProgressChange?.(100);
        return;
      }

      const pct = Math.min(100, Math.max(0, (scrollTop / scrollable) * 100));
      setProgress(pct);

      // Debounced callback for saving scroll state
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        onProgressChange?.(pct);
      }, 200);
    };

    const target = targetId ? document.getElementById(targetId) : window;
    if (!target) return;

    target.addEventListener('scroll', calculateProgress, { passive: true });
    calculateProgress(); // Initial read

    return () => {
      target.removeEventListener('scroll', calculateProgress);
      clearTimeout(debounceTimer);
    };
  }, [targetId, onProgressChange]);

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '2px',
        zIndex: 100,
        background: 'transparent',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${progress}%`,
          background: 'linear-gradient(90deg, #4D7FFF 0%, #E8A045 100%)',
          transition: 'width 80ms linear',
          boxShadow: '0 0 6px rgba(77,127,255,0.6)',
        }}
      />
    </div>
  );
}
