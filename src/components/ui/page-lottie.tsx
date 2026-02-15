'use client';

import { ReactNode, useEffect, useState } from 'react';
import Lottie from 'lottie-react';
import { cn } from '@/lib/utils';

interface PageLottieProps {
  name: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function PageLottie({
  name,
  description,
  action,
  className,
}: PageLottieProps) {
  const [animationData, setAnimationData] = useState<object | null>(null);

  useEffect(() => {
    let cancelled = false;

    import(`../../../public/lotties/${name}.json`)
      .then((mod) => {
        if (!cancelled) {
          setAnimationData(mod.default ?? mod);
        }
      })
      .catch(() => {
        // JSON not found — silently ignore
      });

    return () => {
      cancelled = true;
    };
  }, [name]);

  if (!animationData) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex flex-1 flex-col items-center justify-center gap-2',
        className,
      )}
    >
      <div className="w-full max-w-[250px]">
        <Lottie animationData={animationData} loop autoplay />
      </div>

      <p className="text-center text-sm text-muted-foreground">
        {description}
      </p>

      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
