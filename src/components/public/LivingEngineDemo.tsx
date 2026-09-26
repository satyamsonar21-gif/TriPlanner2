import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Sparkles,
  MapPin,
  Check,
} from 'lucide-react';
import { JourneyThread, type ThreadStep } from '@/components/signature/JourneyThread';
import { Button } from '@/components/ui/button';

interface AlternativeItem {
  id: string;
  title: string;
  time: string;
  duration: string;
  price: number;
  priceDelta: string;
  score: number;
  location: string;
  isRecommended: boolean;
  matchReasons: string[];
}

export const LivingEngineDemo: React.FC = () => {
  const [simulationState, setSimulationState] = useState<'normal' | 'disrupted' | 'resolved'>('normal');
  const [selectedAlternativeId, setSelectedAlternativeId] = useState<string>('alt_kayak');

  const alternatives: AlternativeItem[] = [
    {
      id: 'alt_kayak',
      title: 'Backwater Kayaking & Mangrove Trail',
      time: '14:30 — 16:00',
      duration: '90 mins',
      price: 1800,
      priceDelta: '-₹2,400 refund',
      score: 96,
      location: 'Chorão Island Sanctuary',
      isRecommended: true,
      matchReasons: ['Adventure + Nature match', 'Leaves 30m buffer for Café', 'Safe water conditions'],
    },
    {
      id: 'alt_catamaran',
      title: 'Mandovi River Sunset Catamaran',
      time: '15:30 — 17:00',
      duration: '90 mins',
      price: 2400,
      priceDelta: '-₹1,800 refund',
      score: 89,
      location: 'Panjim Jetty',
      isRecommended: false,
      matchReasons: ['Water activity match', 'Minor 15m delay to Café', 'Scenic sunset view'],
    },
    {
      id: 'alt_heritage',
      title: 'Anjuna Art & Heritage Village Walk',
      time: '15:00 — 16:30',
      duration: '90 mins',
      price: 0,
      priceDelta: '-₹4,200 full refund',
      score: 82,
      location: 'North Goa Heritage Zone',
      isRecommended: false,
      matchReasons: ['Zero additional cost', 'Fits Portuguese culture style', 'Zero conflict'],
    },
  ];

  const selectedAlternative = alternatives.find((a) => a.id === selectedAlternativeId) || alternatives[0];

  // JourneyThread steps reflecting current state
  const threadSteps: ThreadStep[] = [
    {
      id: 'step_1',
      type: 'discover',
      title: 'Panjim Walk',
      subtitle: 'Old Latin Quarter',
      status: 'completed',
      time: '10:00 AM',
    },
    {
      id: 'step_2',
      type: 'experience',
      title: simulationState === 'resolved' ? selectedAlternative.title : 'Scuba Diving',
      subtitle: simulationState === 'disrupted' ? 'High Swell Alert' : 'Baga Reef',
      status: simulationState === 'disrupted' ? 'disrupted' : simulationState === 'resolved' ? 'current' : 'current',
      time: simulationState === 'resolved' ? '14:30 PM' : '14:00 PM',
      disruptionNote: simulationState === 'disrupted' ? 'Vendor Cancelled' : undefined,
    },
    {
      id: 'step_3',
      type: 'stay',
      title: 'Chapora Café',
      subtitle: 'Sunset Viewpoint',
      status: 'upcoming',
      time: simulationState === 'resolved' ? '17:00 PM' : '16:30 PM',
    },
    {
      id: 'step_4',
      type: 'experience',
      title: 'Heritage Dinner',
      subtitle: 'Portuguese Table',
      status: 'upcoming',
      time: '19:00 PM',
    },
  ];

  const handleSimulateDisruption = () => {
    setSimulationState('disrupted');
  };

  const handleApplyAdaptation = () => {
    setSimulationState('resolved');
  };

  const handleReset = () => {
    setSimulationState('normal');
    setSelectedAlternativeId('alt_kayak');
  };

  return (
    <div className="bg-soft-ivory border-2 border-espresso/25 shadow-md p-6 sm:p-10 font-body">
      {/* Top Controller Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-espresso/20 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-terracotta" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-stone-gray">
              REAL-TIME ADAPTATION SIMULATOR
            </span>
          </div>
          <h3 className="font-display text-2xl text-deep-slate font-medium mt-1">
            Day 2 in Goa: Active Operation View
          </h3>
        </div>

        <div className="flex items-center gap-2 sm:self-center">
          {simulationState === 'normal' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSimulateDisruption}
              className="border-burnt-clay text-burnt-clay hover:bg-burnt-clay/10 font-mono text-xs uppercase tracking-wider gap-2"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Simulate Disruption
            </Button>
          )}

          {simulationState === 'disrupted' && (
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={handleApplyAdaptation}
                className="bg-terracotta hover:bg-terracotta-hover text-soft-ivory font-mono text-xs uppercase tracking-wider gap-2 shadow-xs"
              >
                <Check className="w-3.5 h-3.5" />
                Apply Living Adjustment
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="text-stone-gray text-xs font-mono"
              >
                Reset
              </Button>
            </div>
          )}

          {simulationState === 'resolved' && (
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-emerald-800 font-semibold flex items-center gap-1.5 bg-emerald-100/70 border border-emerald-300 px-3 py-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                Journey Re-stabilized
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="font-mono text-xs text-stone-gray hover:text-espresso gap-1.5"
              >
                <RefreshCw className="w-3 h-3" />
                Replay Demo
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Signature JourneyThread Timeline Display */}
      <div className="py-6 border-b border-espresso/15">
        <JourneyThread steps={threadSteps} />
      </div>

      {/* Main Interactive Work Area */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Itinerary State Breakdown */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-stone-gray">
              {simulationState === 'resolved' ? 'UPDATED LIVING ITINERARY' : 'ORIGINAL SCHEDULED ITINERARY'}
            </span>
            <span className="font-mono text-[10px] text-espresso/70">
              {simulationState === 'resolved' ? '4/4 Items Intact' : '4 Scheduled Stops'}
            </span>
          </div>

          {/* Schedule Item 1: Walk */}
          <div className="p-3.5 bg-parchment/60 border border-espresso/15 flex items-start justify-between">
            <div>
              <span className="font-mono text-[10px] text-stone-gray block">10:00 — 12:30</span>
              <h4 className="font-medium text-deep-slate text-sm">Panjim Old Latin Quarter Walk</h4>
              <p className="text-[11px] text-stone-gray mt-0.5">Fontainhas historic district & café tasting</p>
            </div>
            <span className="font-mono text-[9px] bg-stone-gray/10 text-stone-gray px-2 py-0.5 border border-stone-gray/20">
              COMPLETED
            </span>
          </div>

          {/* Schedule Item 2: The Disrupted / Adapted Item */}
          <div
            className={`p-4 border transition-all duration-300 ${
              simulationState === 'disrupted'
                ? 'bg-burnt-clay/10 border-burnt-clay ring-2 ring-burnt-clay/20'
                : simulationState === 'resolved'
                ? 'bg-emerald-50 border-emerald-600/40 ring-2 ring-emerald-500/10'
                : 'bg-parchment/60 border-espresso/25'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono text-[10px] font-semibold text-espresso block">
                  {simulationState === 'resolved' ? selectedAlternative.time : '14:00 — 16:00'}
                </span>
                <h4 className="font-display text-base text-deep-slate font-medium">
                  {simulationState === 'resolved' ? selectedAlternative.title : 'Baga Reef Marine Scuba Diving'}
                </h4>
                <p className="text-xs text-stone-gray mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-terracotta" />
                  {simulationState === 'resolved' ? selectedAlternative.location : 'North Goa Coastal Sanctuary'}
                </p>
              </div>

              {simulationState === 'normal' && (
                <span className="font-mono text-[9px] bg-emerald-100 text-emerald-800 px-2 py-0.5 border border-emerald-300">
                  CONFIRMED
                </span>
              )}
              {simulationState === 'disrupted' && (
                <span className="font-mono text-[9px] bg-burnt-clay text-soft-ivory px-2 py-0.5 font-bold uppercase tracking-wider flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  CANCELLED
                </span>
              )}
              {simulationState === 'resolved' && (
                <span className="font-mono text-[9px] bg-emerald-700 text-soft-ivory px-2 py-0.5 font-semibold uppercase tracking-wider">
                  ADAPTED & ACTIVE
                </span>
              )}
            </div>

            {simulationState === 'disrupted' && (
              <div className="mt-3 pt-3 border-t border-burnt-clay/20 text-xs text-burnt-clay">
                <p className="font-semibold">Reason: 2.8m ocean swell advisory from coastal authority.</p>
                <p className="text-[11px] text-espresso/70 mt-0.5">
                  Vendor Coastal Aqua initiated automatic cancellation with full deposit credit.
                </p>
              </div>
            )}
          </div>

          {/* Schedule Item 3: Sunset Café */}
          <div className="p-3.5 bg-parchment/60 border border-espresso/15 flex items-start justify-between">
            <div>
              <span className="font-mono text-[10px] text-stone-gray block">
                {simulationState === 'resolved' ? '17:00 — 18:30' : '16:30 — 18:00'}
              </span>
              <h4 className="font-medium text-deep-slate text-sm">Chapora Cliffside Sunset Café</h4>
              <p className="text-[11px] text-stone-gray mt-0.5">Panoramic sea-cliff views & cold brew</p>
            </div>
            <span className="font-mono text-[9px] bg-stone-gray/10 text-stone-gray px-2 py-0.5 border border-stone-gray/20">
              RESERVED
            </span>
          </div>

          {/* Schedule Item 4: Heritage Dinner */}
          <div className="p-3.5 bg-parchment/60 border border-espresso/15 flex items-start justify-between">
            <div>
              <span className="font-mono text-[10px] text-stone-gray block">19:00 — 21:30</span>
              <h4 className="font-medium text-deep-slate text-sm">Portuguese Table Tasting Dinner</h4>
              <p className="text-[11px] text-stone-gray mt-0.5">Historic colonial manor culinary table</p>
            </div>
            <span className="font-mono text-[9px] bg-stone-gray/10 text-stone-gray px-2 py-0.5 border border-stone-gray/20">
              CONFIRMED
            </span>
          </div>
        </div>

        {/* Right Column: Engine Analysis & Score-Matched Alternatives */}
        <div className="lg:col-span-7 space-y-6">
          {simulationState === 'normal' && (
            <div className="bg-parchment/50 border border-espresso/20 p-6 flex flex-col items-center justify-center text-center space-y-3 min-h-[360px]">
              <div className="w-12 h-12 bg-terracotta/10 border border-terracotta/30 flex items-center justify-center text-terracotta">
                <Sparkles className="w-6 h-6" />
              </div>
              <h4 className="font-display text-xl text-deep-slate font-medium">
                Living Journey Engine Standing By
              </h4>
              <p className="text-stone-gray text-xs max-w-md leading-relaxed">
                The deterministic dependency graph continuously cross-checks weather forecasts, vendor inventory, and transit buffers across your itinerary.
              </p>
              <div className="pt-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSimulateDisruption}
                  className="bg-terracotta hover:bg-terracotta-hover text-soft-ivory font-mono text-xs uppercase tracking-wider"
                >
                  Click &apos;Simulate Disruption&apos; to test adaptation
                </Button>
              </div>
            </div>
          )}

          {(simulationState === 'disrupted' || simulationState === 'resolved') && (
            <div className="space-y-5 animate-in fade-in duration-300">
              {/* Impact Detection Banner */}
              <div className="bg-parchment border-l-4 border-burnt-clay p-4 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase font-bold text-burnt-clay tracking-wider">
                    IMPACT DETECTED • DEPENDENCY GRAPH ANALYSIS
                  </span>
                  <span className="font-mono text-[10px] text-stone-gray">1 affected · 0 conflicts</span>
                </div>
                <p className="text-deep-slate font-medium mt-1">
                  1 itinerary item disrupted (14:00 Scuba). Downstream reservations preserved. Buffer to 16:30 Café maintained with 3 alternative slots.
                </p>
              </div>

              {/* Score-Matched Alternatives */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-stone-gray">
                    SCORE-MATCHED ALTERNATIVES (SELECT ONE)
                  </span>
                  <span className="font-mono text-[10px] text-terracotta font-semibold">
                    Ranked by preference match & time buffer
                  </span>
                </div>

                <div className="space-y-3">
                  {alternatives.map((alt) => {
                    const isSelected = selectedAlternativeId === alt.id;
                    return (
                      <div
                        key={alt.id}
                        onClick={() => setSelectedAlternativeId(alt.id)}
                        className={`p-4 border transition-all cursor-pointer relative ${
                          isSelected
                            ? 'bg-soft-ivory border-terracotta shadow-sm ring-1 ring-terracotta/30'
                            : 'bg-parchment/40 border-espresso/15 hover:border-espresso/30'
                        }`}
                        role="radio"
                        aria-checked={isSelected}
                        tabIndex={0}
                      >
                        {alt.isRecommended && (
                          <span className="absolute -top-2.5 right-4 font-mono text-[9px] bg-terracotta text-soft-ivory uppercase tracking-wider px-2 py-0.5 font-bold">
                            RECOMMENDED
                          </span>
                        )}

                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h5 className="font-display text-base text-deep-slate font-medium">
                                {alt.title}
                              </h5>
                              <span className="font-mono text-[10px] text-stone-gray">
                                ({alt.duration})
                              </span>
                            </div>

                            <p className="text-xs text-stone-gray flex items-center gap-1.5">
                              <Clock className="w-3 h-3 text-stone-gray" />
                              {alt.time} · {alt.location}
                            </p>

                            <div className="flex flex-wrap gap-1.5 pt-1.5">
                              {alt.matchReasons.map((reason) => (
                                <span
                                  key={reason}
                                  className="font-mono text-[9px] bg-espresso/5 text-espresso/80 px-2 py-0.5"
                                >
                                  {reason}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="font-mono text-xs font-bold text-terracotta block">
                              {alt.price === 0 ? 'FREE' : `₹${alt.price.toLocaleString()}`}
                            </span>
                            <span className="font-mono text-[10px] text-emerald-700 block">
                              {alt.priceDelta}
                            </span>
                            <span className="font-mono text-[9px] text-stone-gray block mt-1">
                              Match: {alt.score}%
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Before vs After Journey Comparison */}
              <div className="bg-parchment border border-espresso/20 p-4">
                <span className="font-mono text-[10px] uppercase tracking-widest text-stone-gray block mb-3">
                  BEFORE VS. AFTER JOURNEY IMPACT
                </span>

                <div className="grid grid-cols-2 gap-4 text-xs font-mono border-t border-espresso/15 pt-3">
                  <div>
                    <span className="text-[10px] text-stone-gray block uppercase">CURRENT PLAN</span>
                    <p className="text-espresso mt-0.5 font-medium">14:00 Scuba (Unavailable)</p>
                    <p className="text-espresso/70 text-[11px] mt-0.5">Total Budget: ₹40,200</p>
                    <span className="inline-block text-[10px] text-burnt-clay font-bold mt-1">
                      1 Break in Schedule
                    </span>
                  </div>

                  <div className="border-l border-espresso/15 pl-4">
                    <span className="text-[10px] text-terracotta block uppercase font-bold">
                      PROPOSED LIVING PLAN
                    </span>
                    <p className="text-deep-slate mt-0.5 font-medium">{selectedAlternative.title}</p>
                    <p className="text-emerald-800 text-[11px] mt-0.5 font-bold">
                      Total Budget: ₹37,800 (-₹2,400)
                    </p>
                    <span className="inline-block text-[10px] text-emerald-700 font-semibold mt-1">
                      0 Downstream Conflicts
                    </span>
                  </div>
                </div>

                {simulationState === 'disrupted' && (
                  <div className="mt-4 pt-3 border-t border-espresso/15 flex items-center justify-between">
                    <span className="text-xs text-stone-gray font-body">
                      Ready to propagate this change across your travel documents?
                    </span>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleApplyAdaptation}
                      className="bg-terracotta hover:bg-terracotta-hover text-soft-ivory font-mono text-xs uppercase tracking-wider"
                    >
                      Apply Living Adjustment
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
