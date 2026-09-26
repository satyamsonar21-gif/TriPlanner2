import React from 'react';
import { Compass, MapPin, Bed, Sparkles, Navigation, CheckCircle2, AlertTriangle } from 'lucide-react';

export type ThreadStepStatus = 'completed' | 'current' | 'upcoming' | 'disrupted';

export interface ThreadStep {
  id: string;
  type: 'discover' | 'destination' | 'stay' | 'experience' | 'transfer' | 'complete';
  title: string;
  subtitle?: string;
  status: ThreadStepStatus;
  time?: string;
  disruptionNote?: string;
}

interface JourneyThreadProps {
  steps: ThreadStep[];
  onStepClick?: (step: ThreadStep) => void;
  className?: string;
}

const STEP_ICONS = {
  discover: Compass,
  destination: MapPin,
  stay: Bed,
  experience: Sparkles,
  transfer: Navigation,
  complete: CheckCircle2,
};

export const JourneyThread: React.FC<JourneyThreadProps> = ({
  steps,
  onStepClick,
  className = '',
}) => {
  return (
    <div className={`w-full py-4 font-body ${className}`}>
      <div className="flex items-center justify-between relative">
        {/* Background Connecting Line */}
        <div className="absolute top-5 left-6 right-6 h-0.5 bg-espresso/20 -z-0" />

        {steps.map((step, index) => {
          const Icon = STEP_ICONS[step.type] || MapPin;
          const isDisrupted = step.status === 'disrupted';
          const isCompleted = step.status === 'completed';
          const isCurrent = step.status === 'current';

          return (
            <div
              key={step.id || index}
              onClick={() => onStepClick?.(step)}
              className={`relative z-10 flex flex-col items-center group cursor-pointer transition-transform duration-200 ${
                isCurrent ? 'scale-105' : 'hover:scale-102'
              }`}
            >
              {/* Icon Circle Node */}
              <div
                className={`w-10 h-10 rounded-none border flex items-center justify-center transition-all duration-200 ${
                  isDisrupted
                    ? 'bg-burnt-clay text-soft-ivory border-burnt-clay animate-pulse'
                    : isCompleted
                    ? 'bg-espresso text-soft-ivory border-espresso'
                    : isCurrent
                    ? 'bg-terracotta text-soft-ivory border-terracotta ring-4 ring-terracotta/20'
                    : 'bg-soft-ivory text-stone-gray border-espresso/30'
                }`}
              >
                {isDisrupted ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>

              {/* Step Title & Details */}
              <div className="mt-3 text-center max-w-[120px]">
                <span className="font-mono text-[9px] uppercase tracking-widest text-stone-gray block">
                  {step.type}
                </span>
                <span
                  className={`text-xs font-medium block leading-snug mt-0.5 ${
                    isDisrupted
                      ? 'text-burnt-clay font-bold'
                      : isCurrent
                      ? 'text-terracotta font-semibold'
                      : 'text-deep-slate'
                  }`}
                >
                  {step.title}
                </span>
                {step.time && (
                  <span className="font-mono text-[10px] text-stone-gray block mt-0.5">
                    {step.time}
                  </span>
                )}
                {isDisrupted && step.disruptionNote && (
                  <span className="inline-block mt-1 px-1.5 py-0.5 bg-burnt-clay/10 text-burnt-clay text-[9px] font-mono border border-burnt-clay/30">
                    {step.disruptionNote}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
