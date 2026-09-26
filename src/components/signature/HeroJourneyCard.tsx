import React from 'react';
import { Sparkles, CheckCircle2, ShieldCheck } from 'lucide-react';

interface HeroJourneyCardProps {
  destination?: string;
  duration?: string;
  style?: string;
  budget?: string;
  status?: string;
  className?: string;
}

export const HeroJourneyCard: React.FC<HeroJourneyCardProps> = ({
  destination = 'GOA',
  duration = '5 DAYS',
  style = 'ADVENTURE + COASTAL FOOD',
  budget = '₹40,000',
  status = 'PERSONALIZED',
  className = '',
}) => {
  return (
    <div
      className={`relative bg-[#F3E8DC] text-espresso border-2 border-espresso/35 p-6 sm:p-7 shadow-xl select-none font-body ${className}`}
      style={{
        backgroundImage: 'radial-gradient(rgba(51, 35, 30, 0.15) 0.75px, transparent 0.75px)',
        backgroundSize: '14px 14px',
      }}
      role="region"
      aria-label="Personalized Living Journey Pass Sample"
    >
      {/* Corner Technical Registration Marks */}
      <span className="absolute top-1.5 left-1.5 font-mono text-[9px] text-espresso/40 leading-none">+</span>
      <span className="absolute top-1.5 right-1.5 font-mono text-[9px] text-espresso/40 leading-none">+</span>
      <span className="absolute bottom-1.5 left-1.5 font-mono text-[9px] text-espresso/40 leading-none">+</span>
      <span className="absolute bottom-1.5 right-1.5 font-mono text-[9px] text-espresso/40 leading-none">+</span>

      {/* Top Document Header */}
      <div className="flex items-start justify-between border-b border-espresso/25 pb-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 border border-espresso/80 bg-soft-ivory flex items-center justify-center font-display font-bold text-base text-terracotta shadow-xs">
            TP
          </div>
          <div>
            <span className="font-mono text-[8px] uppercase tracking-widest text-stone-gray block">
              OFFICIAL TRAVEL DOCUMENT
            </span>
            <span className="font-mono text-[10px] font-semibold text-deep-slate uppercase tracking-wider block">
              LIVING JOURNEY PASS
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end">
          <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest bg-terracotta/10 text-terracotta border border-terracotta/30 px-2 py-0.5 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-terracotta animate-pulse" />
            {status}
          </span>
          <span className="font-mono text-[9px] text-stone-gray mt-1">
            REF: TP-GOA-26
          </span>
        </div>
      </div>

      {/* Main Spec Grid */}
      <div className="space-y-4 mb-5">
        <div>
          <span className="font-mono text-[9px] uppercase tracking-widest text-stone-gray block mb-0.5">
            YOUR JOURNEY SPECIFICATION
          </span>
          <div className="flex items-baseline justify-between flex-wrap gap-2">
            <h3 className="font-display text-2xl sm:text-3xl text-deep-slate tracking-tight font-medium">
              {destination} <span className="text-stone-gray/60 font-sans text-xl font-light">·</span> {duration}
            </h3>
            <span className="font-mono text-xs font-bold text-terracotta bg-terracotta/5 border border-terracotta/20 px-2 py-1">
              EST. {budget}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-espresso/15 text-xs">
          <div>
            <span className="font-mono text-[9px] uppercase tracking-wider text-stone-gray block">
              TRAVEL STYLE
            </span>
            <p className="font-medium text-deep-slate mt-0.5">
              {style}
            </p>
          </div>
          <div>
            <span className="font-mono text-[9px] uppercase tracking-wider text-stone-gray block">
              TRAVEL PACE
            </span>
            <p className="font-medium text-deep-slate mt-0.5 flex items-center gap-1">
              Balanced (2-3 stops/day)
            </p>
          </div>
        </div>

        {/* Journey Components Blueprint */}
        <div className="bg-soft-ivory/80 border border-espresso/20 p-3 space-y-1.5 text-[11px]">
          <div className="flex items-center justify-between text-espresso/90">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-terracotta" />
              Panjim Heritage Quinta Villa
            </span>
            <span className="font-mono text-[10px] text-stone-gray">4 Nights</span>
          </div>
          <div className="flex items-center justify-between text-espresso/90">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-antique-brass" />
              Baga Dive & Backwater Kayak
            </span>
            <span className="font-mono text-[10px] text-stone-gray">2 Experiences</span>
          </div>
          <div className="flex items-center justify-between text-espresso/90">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-stone-gray" />
              Living Engine Disruption Guard
            </span>
            <span className="font-mono text-[10px] text-emerald-700 font-semibold">Active</span>
          </div>
        </div>
      </div>

      {/* Passport Machine-Readable Zone (Physical artifact detailing) */}
      <div className="pt-3 border-t border-dashed border-espresso/30 font-mono text-[8px] sm:text-[9px] text-stone-gray/80 tracking-widest break-all select-none leading-relaxed">
        P&lt;IND&lt;&lt;TRIPLANNER&lt;&lt;GOA&lt;ADVENTURE&lt;FOOD&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;
        <br />
        TP94028472M2609280LIVINGENGINE01&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;
      </div>
    </div>
  );
};
