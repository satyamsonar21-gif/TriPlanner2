import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "We Couldn't Complete This Operation",
  message = "Your itinerary and current booking status remain safe and unchanged. Please verify your connection or try again.",
  onRetry,
  className = '',
}) => {
  return (
    <div
      className={`w-full p-6 bg-burnt-clay/5 border border-burnt-clay/30 font-body text-deep-slate ${className}`}
    >
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 border border-burnt-clay/40 bg-burnt-clay/10 flex items-center justify-center text-burnt-clay shrink-0">
          <AlertCircle className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h4 className="font-display text-lg text-deep-slate mb-1">{title}</h4>
          <p className="text-xs text-stone-gray leading-relaxed mb-4">{message}</p>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
              <RefreshCw className="w-3.5 h-3.5" />
              RETRY OPERATION
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
