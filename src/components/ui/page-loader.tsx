'use client';

import Lottie from 'lottie-react';
import { cn } from '@/lib/utils';

interface PageLoaderProps {
  lottieData: object;
  text?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'w-32 h-32',
  md: 'w-48 h-48',
  lg: 'w-64 h-64',
};

export function PageLoader({
  lottieData,
  text = 'Loading...',
  className,
  size = 'md',
}: PageLoaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center min-h-[400px] w-full',
        className
      )}
    >
      <Lottie
        animationData={lottieData}
        loop
        autoplay
        className={sizeClasses[size]}
      />
      <p className="mt-4 text-sm text-muted-foreground animate-pulse">{text}</p>
    </div>
  );
}
