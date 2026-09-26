import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowRight, MessageSquare, Check, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const OperatorPreviewCard: React.FC = () => {
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const handleAction = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 4000);
  };

  return (
    <div className="bg-soft-ivory border-2 border-espresso/25 shadow-md p-6 sm:p-10 font-body">
      {/* Editorial Eyebrow & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-espresso/20 gap-4">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-terracotta block">
            FOR TOUR OPERATORS & AGENCIES
          </span>
          <h3 className="font-display text-2xl sm:text-3xl text-deep-slate font-medium mt-1">
            Run the journey, not just the booking.
          </h3>
          <p className="text-stone-gray text-xs sm:text-sm mt-1 max-w-xl">
            Coordinators and field managers monitor live journey threads, receive automated conflict notifications, and approve alternative options with one click.
          </p>
        </div>

        <Link to="/operator/dashboard" className="self-start sm:self-center shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="border-espresso/30 text-espresso hover:border-terracotta hover:text-terracotta font-mono text-xs uppercase tracking-wider gap-1.5"
          >
            <span>Enter Operator Portal</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </div>

      {/* Control Center Telemetry Strip */}
      <div className="py-6 border-b border-espresso/15">
        <span className="font-mono text-[9px] uppercase tracking-widest text-stone-gray block mb-3">
          LIVE OPERATIONAL TELEMETRY
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-parchment/70 border border-espresso/15 p-3 text-center">
            <span className="font-display text-2xl text-deep-slate font-semibold block">12</span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-stone-gray block mt-0.5">
              Active Tours
            </span>
          </div>
          <div className="bg-parchment/70 border border-espresso/15 p-3 text-center">
            <span className="font-display text-2xl text-deep-slate font-semibold block">8</span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-stone-gray block mt-0.5">
              Today&apos;s Ops
            </span>
          </div>
          <div className="bg-parchment/70 border border-espresso/15 p-3 text-center">
            <span className="font-display text-2xl text-burnt-clay font-semibold block">4</span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-stone-gray block mt-0.5">
              Pending Actions
            </span>
          </div>
          <div className="bg-parchment/70 border border-espresso/15 p-3 text-center">
            <span className="font-display text-2xl text-terracotta font-semibold block">2</span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-terracotta block mt-0.5 font-semibold">
              Conflicts
            </span>
          </div>
          <div className="bg-parchment/70 border border-espresso/15 p-3 text-center col-span-2 sm:col-span-1">
            <span className="font-display text-2xl text-stone-gray font-semibold block">1</span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-stone-gray block mt-0.5">
              Payment Issue
            </span>
          </div>
        </div>
      </div>

      {/* Change Alert Preview Card */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-[10px] uppercase tracking-wider text-stone-gray">
            ACTIVE REAL-TIME DISRUPTION ALERT
          </span>
          <span className="font-mono text-[10px] text-terracotta font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-terracotta animate-ping" />
            URGENT RESOLUTION REQUIRED
          </span>
        </div>

        <div className="bg-parchment/50 border border-burnt-clay/40 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-espresso/10 pb-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-deep-slate bg-soft-ivory border border-espresso/20 px-2 py-0.5">
                GOA JOURNEY #204
              </span>
              <span className="text-xs text-stone-gray font-medium">Traveler: Elena Rostova</span>
            </div>
            <span className="font-mono text-[10px] text-stone-gray">Detected 12m ago</span>
          </div>

          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-burnt-clay shrink-0 mt-0.5" />
            <div>
              <h4 className="font-display text-base text-deep-slate font-medium">
                Scuba Diving cancelled by vendor due to sea conditions.
              </h4>
              <p className="text-xs text-stone-gray mt-1 leading-relaxed">
                Coastal Aqua flagged severe swell. Living Engine verified:
                <strong className="text-espresso font-semibold"> 1 itinerary item affected</strong>,
                <strong className="text-espresso font-semibold"> 0 downstream conflicts</strong>,
                <strong className="text-espresso font-semibold"> 3 alternatives available</strong>.
              </p>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between pt-2 gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleAction('Opening proposal review modal for Journey #204...')}
                className="bg-terracotta hover:bg-terracotta-hover text-soft-ivory font-mono text-xs uppercase tracking-wider gap-1.5"
              >
                <span>Review Alternatives</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAction('Dispatching secure alert to traveler Elena Rostova...')}
                className="border-espresso/30 text-espresso hover:bg-parchment font-mono text-xs uppercase tracking-wider gap-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5 text-stone-gray" />
                <span>Contact Traveler</span>
              </Button>
            </div>

            <span className="font-mono text-[10px] text-stone-gray italic">
              Estimated resolution time: &lt; 2 minutes
            </span>
          </div>

          {/* Feedback notice if button clicked */}
          {actionNotice && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-300 text-xs font-mono text-emerald-800 flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{actionNotice}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
