import * as React from 'react';
import { Badge } from '@/components/ui/badge';

interface CRMPageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  badgeText?: string;
  badgeVariant?: 'default' | 'outline' | 'secondary';
  actions?: React.ReactNode;
}

export function CRMPageHeader({
  title,
  subtitle,
  icon: Icon,
  badgeText,
  badgeVariant = 'outline',
  actions,
}: CRMPageHeaderProps) {
  return (
    <header className="border-b border-border/60 bg-card/40 backdrop-blur-md px-4 sm:px-6 py-4 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {Icon && (
              <span className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
                <Icon className="w-5 h-5" />
              </span>
            )}
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{title}</h1>
            {badgeText && (
              <Badge
                variant={badgeVariant}
                className="text-xs bg-primary/10 text-primary border-primary/20 shrink-0"
              >
                {badgeText}
              </Badge>
            )}
          </div>
          {subtitle && (
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-3xl leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap shrink-0 w-full lg:w-auto justify-start lg:justify-end">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
