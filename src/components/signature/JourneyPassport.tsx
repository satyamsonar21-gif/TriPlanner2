import React from 'react';
import type {
  TripJourney,
  TravelerProfile,
  JourneyStatus,
} from '@/types/database.types';
import { Badge } from '@/components/ui/badge';

interface JourneyPassportProps {
  journey: TripJourney;
  traveler?: TravelerProfile | null;
  destinationName: string;
  progressPercentage?: number;
  confirmedBookingsCount?: number;
  totalBookingsCount?: number;
  className?: string;
}

const STATUS_VARIANTS: Record<
  JourneyStatus,
  'default' | 'active' | 'disrupted' | 'confirmed' | 'brass'
> = {
  draft: 'default',
  planning: 'brass',
  booked: 'confirmed',
  active: 'active',
  disrupted: 'disrupted',
  modifying: 'disrupted',
  completed: 'default',
  cancelled: 'default',
};

export const JourneyPassport: React.FC<JourneyPassportProps> = ({
  journey,
  traveler,
  destinationName,
  progressPercentage = 65,
  confirmedBookingsCount = 4,
  totalBookingsCount = 5,
  className = '',
}) => {
  const version = journey.version ?? 17;
  const allocatedCost = journey.allocated_cost ?? journey.total_budget;

  return (
    <div
      className={`relative bg-parchment border-2 border-espresso/25 p-8 max-w-xl mx-auto shadow-md font-body ${className}`}
      style={{
        backgroundImage:
          'radial-gradient(var(--espresso) 0.3px, transparent 0.3px)',
        backgroundSize: '16px 16px',
        backgroundColor: '#F3E8DC',
      }}
    >
      {/* Passport Corner Stamps / Security Watermarks */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <Badge variant={STATUS_VARIANTS[journey.status]}>
          {journey.status.toUpperCase()}
        </Badge>
        <span className="font-mono text-[10px] text-terracotta font-bold uppercase tracking-widest border border-terracotta/30 bg-soft-ivory px-2 py-0.5">
          VER: v{version}
        </span>
        <span className="font-mono text-[10px] text-stone-gray uppercase tracking-widest border border-stone-gray/30 px-2 py-0.5">
          REF: {journey.passport_reference_code}
        </span>
      </div>

      {/* Header Seal */}
      <div className="flex items-center gap-3 pb-6 border-b border-espresso/20 mb-6">
        <div className="w-10 h-10 border border-espresso flex items-center justify-center font-display text-lg font-bold text-terracotta bg-soft-ivory">
          TP
        </div>
        <div>
          <span className="font-mono text-[9px] uppercase tracking-widest text-stone-gray block">
            OFFICIAL TRAVEL DOCUMENT • LIVING JOURNEY PASS (v{version})
          </span>
          <h2 className="font-display text-2xl text-deep-slate tracking-tight">
            {journey.title}
          </h2>
        </div>
      </div>

      {/* Grid Information */}
      <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-xs mb-6">
        <div>
          <span className="font-mono text-[10px] uppercase text-stone-gray block mb-0.5">
            PRIMARY DESTINATION
          </span>
          <p className="font-display text-base text-deep-slate font-medium">
            {destinationName}
          </p>
        </div>

        <div>
          <span className="font-mono text-[10px] uppercase text-stone-gray block mb-0.5">
            TRAVEL DATES
          </span>
          <p className="font-mono text-xs text-espresso font-semibold">
            {journey.start_date} — {journey.end_date}
          </p>
        </div>

        <div>
          <span className="font-mono text-[10px] uppercase text-stone-gray block mb-0.5">
            PASSPORT HOLDER
          </span>
          <p className="font-body text-xs text-espresso font-medium">
            {traveler?.user_id || 'Elena Rostova'}
          </p>
        </div>

        <div>
          <span className="font-mono text-[10px] uppercase text-stone-gray block mb-0.5">
            ALLOCATED / TOTAL BUDGET
          </span>
          <p className="font-mono text-xs text-terracotta font-bold">
            {allocatedCost.toLocaleString()} / {journey.total_budget.toLocaleString()}{' '}
            {journey.currency}
          </p>
        </div>
      </div>

      {/* Progress & Booking Integrity Bar */}
      <div className="border-t border-espresso/20 pt-4 mt-2">
        <div className="flex items-center justify-between text-[11px] font-mono text-stone-gray mb-1.5">
          <span>JOURNEY EXECUTION PROGRESS</span>
          <span className="text-espresso font-semibold">
            {progressPercentage}%
          </span>
        </div>
        <div className="w-full bg-espresso/10 h-1.5 relative overflow-hidden mb-3">
          <div
            className="bg-terracotta h-full transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[10px] font-mono text-stone-gray">
          <span>BOOKING STATUS:</span>
          <span className="text-espresso">
            {confirmedBookingsCount} OF {totalBookingsCount} CONFIRMED • SNAPSHOT v{version}
          </span>
        </div>
      </div>

      {/* Bottom Passport Machine-Readable Zone Visual */}
      <div className="mt-6 pt-4 border-t border-dashed border-espresso/30 font-mono text-[9px] text-stone-gray tracking-widest break-all opacity-70">
        P&lt;TRIP&lt;&lt;ROSTOVA&lt;&lt;ELENA&lt;&lt;V{version}&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;
        <br />
        {journey.passport_reference_code}3IST890722M2609300LIVINGENGINE01
      </div>
    </div>
  );
};
