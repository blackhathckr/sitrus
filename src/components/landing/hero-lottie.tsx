'use client';

import { useEffect, useState } from 'react';
import Lottie from 'lottie-react';

/**
 * Hero section Lottie animation.
 *
 * Loads `/lotties/hero.json` and renders it at a larger size
 * than the standard PageLottie component. Replace the JSON
 * with a real Lottie animation (e.g. creator illustration).
 */
export function HeroLottie() {
  const [animationData, setAnimationData] = useState<object | null>(null);

  useEffect(() => {
    let cancelled = false;

    import('../../../public/lotties/hero.json')
      .then((mod) => {
        if (!cancelled) {
          setAnimationData(mod.default ?? mod);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  if (!animationData) {
    // Placeholder skeleton while loading
    return (
      <div className="flex size-80 items-center justify-center rounded-full bg-primary/5 lg:size-96">
        <div className="size-32 animate-pulse rounded-full bg-primary/10" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-md lg:max-w-lg">
      <Lottie animationData={animationData} loop autoplay />
    </div>
  );
}
