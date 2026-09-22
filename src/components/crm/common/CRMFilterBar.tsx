import * as React from 'react';
import { Search, Filter, RotateCcw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CRMFilterBarProps {
  search?: string;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  children?: React.ReactNode;
  secondaryFilters?: React.ReactNode;
  activeFiltersCount?: number;
  hasActiveFilters?: boolean;
  onReset?: () => void;
  onResetFilters?: () => void;
  className?: string;
}

export function CRMFilterBar({
  search,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  children,
  secondaryFilters,
  activeFiltersCount = 0,
  hasActiveFilters,
  onReset,
  onResetFilters,
  className,
}: CRMFilterBarProps) {
  const currentSearch = searchValue !== undefined ? searchValue : search || '';
  const resetHandler = onResetFilters || onReset;
  const showReset = Boolean(
    resetHandler && (hasActiveFilters || activeFiltersCount > 0 || currentSearch.length > 0)
  );

  return (
    <div
      className={cn(
        'p-3.5 sm:p-4 rounded-xl border border-border/80 bg-card/60 backdrop-blur-xs space-y-3 shadow-xs',
        className
      )}
    >
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        {onSearchChange !== undefined && (
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder={searchPlaceholder}
              value={currentSearch}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 h-9 text-xs sm:text-sm bg-background border-input"
            />
          </div>
        )}

        {(children || secondaryFilters) && (
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            {children}
            {secondaryFilters}
          </div>
        )}
      </div>

      {showReset && (
        <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs text-muted-foreground">
          <span>
            {activeFiltersCount > 0
              ? `${activeFiltersCount} filter${activeFiltersCount > 1 ? 's' : ''} applied`
              : 'Filters active'}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetHandler}
            className="h-6 px-2 text-xs text-primary hover:text-primary gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset filters</span>
          </Button>
        </div>
      )}
    </div>
  );
}
