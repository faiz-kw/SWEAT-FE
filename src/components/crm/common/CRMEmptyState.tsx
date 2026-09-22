import * as React from 'react';
import { Button } from '@/components/ui/button';

interface CRMEmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  canAction?: boolean;
}

export function CRMEmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  canAction = true,
}: CRMEmptyStateProps) {
  return (
    <div className="py-16 px-4 text-center flex flex-col items-center justify-center space-y-3">
      <div className="p-3 rounded-full bg-muted/60 text-muted-foreground">
        <Icon className="w-8 h-8" />
      </div>
      <div className="space-y-1 max-w-sm">
        <h3 className="font-semibold text-foreground text-sm sm:text-base">{title}</h3>
        <p className="text-xs sm:text-sm text-muted-foreground">{description}</p>
      </div>
      {actionLabel && onAction && canAction && (
        <Button
          size="sm"
          onClick={onAction}
          className="mt-2 h-9 font-semibold shadow-xs"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
