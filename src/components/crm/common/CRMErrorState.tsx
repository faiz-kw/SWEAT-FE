import * as React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CRMErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function CRMErrorState({
  title = 'Unable to Load Data',
  message = 'There was an issue communicating with the server. Please verify network access or try again.',
  onRetry,
}: CRMErrorStateProps) {
  return (
    <div className="py-16 px-4 text-center flex flex-col items-center justify-center space-y-3">
      <div className="p-3 rounded-full bg-rose-500/10 text-rose-500">
        <AlertCircle className="w-8 h-8" />
      </div>
      <div className="space-y-1 max-w-md">
        <h3 className="font-semibold text-foreground text-sm sm:text-base">{title}</h3>
        <p className="text-xs sm:text-sm text-muted-foreground">{message}</p>
      </div>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="mt-2 h-8 gap-1.5 text-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </Button>
      )}
    </div>
  );
}
