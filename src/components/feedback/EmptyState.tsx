import React from 'react';
import { Compass, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Compass,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`w-full flex flex-col items-center justify-center text-center p-12 bg-soft-ivory border border-espresso/15 font-body ${className}`}
    >
      <div className="w-12 h-12 border border-espresso/25 bg-parchment flex items-center justify-center text-terracotta mb-4">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="font-display text-2xl text-deep-slate mb-2">{title}</h3>
      <p className="text-xs text-stone-gray max-w-md leading-relaxed mb-6">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button variant="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
