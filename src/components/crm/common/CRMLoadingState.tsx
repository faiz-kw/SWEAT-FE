import * as React from 'react';
import { Loader2 } from 'lucide-react';

interface CRMLoadingStateProps {
  message?: string;
}

export function CRMLoadingState({ message = 'Loading real CRM records...' }: CRMLoadingStateProps) {
  return (
    <div className="py-20 px-4 text-center flex flex-col items-center justify-center space-y-3">
      <Loader2 className="w-7 h-7 animate-spin text-primary" />
      <p className="text-xs sm:text-sm text-muted-foreground font-medium">{message}</p>
    </div>
  );
}
