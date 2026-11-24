import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';

interface NonEquivalentProtocolWarningProps {
  testTitle: string;
  previousVariation?: string | null | undefined;
  currentVariation: string;
  comparisonNote?: string | undefined;
  className?: string | undefined;
}

export const NonEquivalentProtocolWarning: React.FC<NonEquivalentProtocolWarningProps> = ({
  testTitle,
  previousVariation,
  currentVariation,
  comparisonNote,
  className = '',
}) => {
  return (
    <div
      className={`rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-200 backdrop-blur-sm ${className}`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-lg bg-amber-500/20 p-1.5 text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="flex-1 space-y-1.5">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold tracking-wide text-amber-300">
              Different test — not directly comparable
            </h4>
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] font-medium text-amber-300 border border-amber-500/30">
              {testTitle}
            </span>
          </div>

          <p className="text-xs leading-relaxed text-amber-200/90">
            {comparisonNote || (
              <>
                The baseline was evaluated using <strong className="text-foreground font-medium">{previousVariation || 'Unknown'}</strong>,
                while the current assessment progressed to <strong className="text-foreground font-medium">{currentVariation}</strong>.
                Rep and load changes are hidden, because the two tests are not the same test.
              </>
            )}
          </p>

          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400/80">
            <Info className="h-3.5 w-3.5 shrink-0" />
            <span>Progress is tracked under Progressions instead.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
