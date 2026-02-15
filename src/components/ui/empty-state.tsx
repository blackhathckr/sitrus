'use client';

import Lottie from 'lottie-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  lottieData: object;
  title: string;
  description?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  action?: React.ReactNode;
}

const sizeClasses = {
  sm: 'w-32 h-32',
  md: 'w-48 h-48',
  lg: 'w-64 h-64',
};

export function EmptyState({
  lottieData,
  title,
  description,
  className,
  size = 'md',
  action,
}: EmptyStateProps) {
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
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      {description && (
        <p className="mt-2 text-sm text-muted-foreground text-center max-w-md">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
