'use client';

/**
 * KPICard Component
 *
 * Displays a key performance indicator with trend information.
 * Updated to match reference app section-cards styling.
 */

import {
  TrendingUp,
  TrendingDown,
  Minus,
  Eye,
  Users,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  BarChart,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

// Map of icon names to icon components
const iconMap = {
  eye: Eye,
  users: Users,
  activity: Activity,
  'alert-triangle': AlertTriangle,
  'check-circle': CheckCircle,
  clock: Clock,
  target: Target,
  'bar-chart': BarChart,
} as const;

type IconName = keyof typeof iconMap;

interface KPICardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon?: IconName;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'stable';
    label?: string;
  };
  color?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export function KPICard({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = 'default',
  size = 'default',
  className,
}: KPICardProps) {
  const isPositive = trend ? trend.direction === 'up' : false;
  const isNegative = trend ? trend.direction === 'down' : false;
  const TrendIcon = trend
    ? trend.direction === 'up'
      ? TrendingUp
      : trend.direction === 'down'
      ? TrendingDown
      : Minus
    : null;

  // Get the icon component from the map
  const Icon = icon ? iconMap[icon] : null;

  // Determine trend label based on direction
  const getTrendLabel = () => {
    if (!trend) return '';
    if (trend.label) return trend.label;
    if (trend.direction === 'up') return 'Trending up';
    if (trend.direction === 'down') return 'Trending down';
    return 'Stable';
  };

  return (
    <Card className={cn('@container/card', className)}>
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </CardTitle>
        {trend && TrendIcon && (
          <CardAction>
            <Badge variant="outline">
              <TrendIcon className="size-3" />
              {isPositive ? '+' : ''}
              {trend.value}%
            </Badge>
          </CardAction>
        )}
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1.5 text-sm">
        {trend && TrendIcon && (
          <div className="line-clamp-1 flex gap-2 font-medium">
            {getTrendLabel()} <TrendIcon className="size-4" />
          </div>
        )}
        {subtitle && (
          <div className="text-muted-foreground">{subtitle}</div>
        )}
      </CardFooter>
    </Card>
  );
}

/**
 * KPICardSkeleton Component
 *
 * Loading skeleton for KPI cards.
 */
export function KPICardSkeleton({
  className,
}: {
  className?: string;
}) {
  return (
    <Card className={cn('@container/card', className)}>
      <CardHeader>
        <div className="h-4 w-24 bg-muted animate-pulse rounded" />
        <div className="h-8 w-16 bg-muted animate-pulse rounded" />
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1.5">
        <div className="h-4 w-32 bg-muted animate-pulse rounded" />
        <div className="h-3 w-20 bg-muted animate-pulse rounded" />
      </CardFooter>
    </Card>
  );
}
