import * as React from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CRMKpiTileProps {
  label: string;
  value?: string | number | null;
  isLoading?: boolean;
  isError?: boolean;
  errorHint?: string;
  hint?: string;
  badge?: {
    text: string;
    variant?: 'neutral' | 'positive' | 'warning' | 'negative' | 'info';
  };
  onClick?: () => void;
  isActive?: boolean;
  className?: string;
}

export function CRMKpiTile({
  label,
  value,
  isLoading,
  isError,
  errorHint = 'Unavailable',
  hint,
  badge,
  onClick,
  isActive,
  className,
}: CRMKpiTileProps) {
  const Component = onClick ? 'button' : 'div';

  const badgeVariant = badge?.variant || 'neutral';

  return (
    <Component
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'p-3.5 sm:p-4 rounded-xl border transition-all text-left flex flex-col justify-between min-h-[96px]',
        isActive
          ? 'border-primary bg-primary/10 shadow-xs'
          : 'border-border/80 bg-card/60 hover:bg-muted/30',
        onClick && 'cursor-pointer',
        className
      )}
    >
      <div className="flex items-start justify-between gap-1 min-w-0 w-full">
        <span
          className="text-[11px] font-semibold uppercase tracking-normal text-muted-foreground leading-tight line-clamp-2 min-w-0 flex-1 break-words"
          title={label}
        >
          {label}
        </span>
        {badge && (
          <span
            className={cn(
              'text-[9px] font-semibold px-1.5 py-0.5 rounded shrink-0 whitespace-nowrap ml-1',
              badgeVariant === 'positive' && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
              badgeVariant === 'warning' && 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
              badgeVariant === 'negative' && 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
              badgeVariant === 'info' && 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
              badgeVariant === 'neutral' && 'bg-muted text-muted-foreground'
            )}
          >
            {badge.text}
          </span>
        )}
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        {isLoading ? (
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground font-medium">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
            Loading...
          </span>
        ) : isError ? (
          <span className="flex items-center gap-1 text-xs font-medium text-destructive">
            <AlertCircle className="w-3.5 h-3.5" />
            {errorHint}
          </span>
        ) : (
          <span className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            {value !== undefined && value !== null ? value : 0}
          </span>
        )}
      </div>

      {hint && (
        <span className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-tight" title={hint}>
          {hint}
        </span>
      )}
    </Component>
  );
}
