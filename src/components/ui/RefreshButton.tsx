import React, { useState } from 'react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface RefreshButtonProps extends Omit<ButtonProps, 'onClick'> {
  onRefresh: () => Promise<any> | void;
  isRefreshing?: boolean;
  label?: string;
  iconClassName?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

export const RefreshButton: React.FC<RefreshButtonProps> = ({
  onRefresh,
  isRefreshing: controlledRefreshing,
  label = 'Refresh',
  className,
  iconClassName,
  disabled,
  size = 'sm',
  variant = 'outline',
  title,
  ...props
}) => {
  const [localRefreshing, setLocalRefreshing] = useState(false);
  const activeRefreshing = controlledRefreshing !== undefined ? (controlledRefreshing || localRefreshing) : localRefreshing;

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (activeRefreshing) return;

    setLocalRefreshing(true);
    const start = Date.now();
    try {
      if (props.onClick) {
        props.onClick(e);
      }
      await onRefresh();
    } finally {
      // Ensure smooth circular rotation animation is visibly perceptible (at least 450ms)
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 450 - elapsed);
      setTimeout(() => {
        setLocalRefreshing(false);
      }, remaining);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={disabled || activeRefreshing}
      className={cn('gap-1.5 h-9 select-none', className)}
      title={title || `${label} data`}
      {...props}
    >
      <RefreshCw
        className={cn(
          'w-3.5 h-3.5 shrink-0 transition-transform',
          activeRefreshing && 'animate-spin',
          iconClassName
        )}
      />
      {label && <span className="hidden sm:inline">{label}</span>}
    </Button>
  );
};
