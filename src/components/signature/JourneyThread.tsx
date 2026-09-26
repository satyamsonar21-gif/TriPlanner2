import React from 'react';
import {
  Compass,
  MapPin,
  Bed,
  Sparkles,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import type { JourneyNodeVisualState } from '@/domains/journey-engine';

export type ThreadStepStatus =
  | 'completed'
  | 'current'
  | 'upcoming'
  | 'disrupted'
  | 'NORMAL'
  | 'ATTENTION'
  | 'CHANGED'
  | 'CANCELLED'
  | 'RESOLVED';

export interface ThreadStep {
  id: string;
  type:
    | 'discover'
    | 'destination'
    | 'stay'
    | 'experience'
    | 'transfer'
    | 'complete';
  title: string;
  subtitle?: string;
  status: ThreadStepStatus;
  visualState?: JourneyNodeVisualState;
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
          const vState = step.visualState || step.status;
          const isAttention =
            vState === 'disrupted' || vState === 'ATTENTION';
          const isCancelled = vState === 'CANCELLED';
          const isChanged = vState === 'CHANGED';
          const isResolved = vState === 'RESOLVED';
          const isCompleted = step.status === 'completed' || isResolved;
          const isCurrent = step.status === 'current' || isChanged;

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
                  isAttention
                    ? 'bg-burnt-clay text-soft-ivory border-burnt-clay animate-pulse'
                    : isCancelled
                    ? 'bg-stone-300 text-stone-600 border-stone-400'
                    : isResolved
                    ? 'bg-emerald-700 text-white border-emerald-800'
                    : isChanged
                    ? 'bg-terracotta text-soft-ivory border-terracotta ring-4 ring-terracotta/20'
                    : isCompleted
                    ? 'bg-espresso text-soft-ivory border-espresso'
                    : isCurrent
                    ? 'bg-terracotta text-soft-ivory border-terracotta ring-4 ring-terracotta/20'
                    : 'bg-soft-ivory text-stone-gray border-espresso/30'
                }`}
              >
                {isAttention ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : isCancelled ? (
                  <XCircle className="w-5 h-5" />
                ) : isChanged ? (
                  <RefreshCw className="w-4 h-4" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>

              {/* Step Title & Details */}
              <div className="mt-3 text-center max-w-[125px]">
                <span className="font-mono text-[9px] uppercase tracking-widest text-stone-gray block">
                  {step.visualState || step.type}
                </span>
                <span
                  className={`text-xs font-medium block leading-snug mt-0.5 ${
                    isAttention
                      ? 'text-burnt-clay font-bold'
                      : isCancelled
                      ? 'line-through text-stone-500'
                      : isResolved
                      ? 'text-emerald-800 font-semibold'
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
                {(isAttention || isResolved) && step.disruptionNote && (
                  <span
                    className={`inline-block mt-1 px-1.5 py-0.5 text-[9px] font-mono border ${
                      isResolved
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-burnt-clay/10 text-burnt-clay border-burnt-clay/30'
                    }`}
                  >
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
