import * as React from 'react';
import { CRMPageHeader } from './CRMPageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRouter } from '@tanstack/react-router';

interface CRMUnconfiguredViewProps {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeText?: string;
  heading: string;
  description: string;
  note?: string;
  actionText?: string;
  actionTo?: string;
}

export function CRMUnconfiguredView({
  title,
  subtitle,
  icon: Icon,
  badgeText = 'Setup Required',
  heading,
  description,
  note,
  actionText,
  actionTo,
}: CRMUnconfiguredViewProps) {
  const router = useRouter();

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <CRMPageHeader
        title={title}
        subtitle={subtitle}
        icon={Icon}
        badgeText={badgeText}
      />

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-12 flex items-center justify-center">
        <div className="max-w-lg w-full p-6 sm:p-8 rounded-2xl border border-border/80 bg-card/60 shadow-xs text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <Icon className="w-6 h-6" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">{heading}</h2>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {description}
            </p>
          </div>

          {note && (
            <div className="p-3 rounded-xl bg-muted/50 border border-border/60 text-xs text-muted-foreground text-left">
              <strong>Notice:</strong> {note}
            </div>
          )}

          {actionText && actionTo && (
            <div className="pt-2">
              <Button
                size="sm"
                onClick={() => router.navigate({ to: actionTo as any })}
                className="font-semibold shadow-xs"
              >
                {actionText}
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
