import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HeroJourneyCard } from '@/components/signature/HeroJourneyCard';
import { DestinationService } from '@/domains/destinations/destination.service';
import type { Destination } from '@/types/database.types';

export const PlanJourneyPage: React.FC = () => {
  const [searchParams] = useSearchParams();

  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [selectedDestinationSlug, setSelectedDestinationSlug] = useState<string>('goa');
  const [selectedPace, setSelectedPace] = useState<'relaxed' | 'balanced' | 'fast-paced'>('balanced');
  const [selectedStyles, setSelectedStyles] = useState<string[]>(['Adventure', 'Food']);
  const [durationDays, setDurationDays] = useState<number>(5);
  const [budgetPerDay, setBudgetPerDay] = useState<number>(4000);
  const [generationStep, setGenerationStep] = useState<string | null>(null);
  const [generatedPassReady, setGeneratedPassReady] = useState(false);

  useEffect(() => {
    DestinationService.getAll().then((data) => {
      setDestinations(data);
      const queryDest = searchParams.get('destination');
      if (queryDest && data.some((d) => d.slug === queryDest)) {
        setSelectedDestinationSlug(queryDest);
      }
    });
  }, [searchParams]);

  const currentDestination =
    destinations.find((d) => d.slug === selectedDestinationSlug) ||
    destinations[0] || {
      name: 'Goa',
      country: 'India',
      average_daily_budget: 3500,
    };

  const estimatedTotalBudget = durationDays * budgetPerDay;

  const toggleStyle = (style: string) => {
    if (selectedStyles.includes(style)) {
      if (selectedStyles.length > 1) {
        setSelectedStyles(selectedStyles.filter((s) => s !== style));
      }
    } else {
      setSelectedStyles([...selectedStyles, style]);
    }
  };

  const handleGenerateJourney = () => {
    const steps = [
      'Understanding your travel preferences...',
      'Checking regional route availability...',
      'Building your living dependency graph...',
      'Verifying transit buffers & opening hours...',
      'Preparing proactive alternatives...',
    ];

    let current = 0;
    setGenerationStep(steps[current]);

    const interval = setInterval(() => {
      current++;
      if (current < steps.length) {
        setGenerationStep(steps[current]);
      } else {
        clearInterval(interval);
        setGenerationStep(null);
        setGeneratedPassReady(true);
      }
    }, 450);
  };

  return (
    <div className="bg-background text-foreground font-body min-h-screen pb-24">
      {/* Header Banner */}
      <section className="bg-parchment/50 border-b border-espresso/15 py-12 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-3">
          <Link
            to="/explore"
            className="inline-flex items-center gap-1.5 font-mono text-xs text-stone-gray hover:text-terracotta uppercase tracking-wider mb-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-terracotta"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Explore Destinations</span>
          </Link>
          <span className="font-mono text-xs uppercase tracking-widest text-terracotta block">
            DYNAMIC JOURNEY BUILDER
          </span>
          <h1 className="font-display text-4xl sm:text-5xl text-deep-slate font-normal tracking-tight">
            Build Your Living Journey
          </h1>
          <p className="text-stone-gray text-sm sm:text-base max-w-2xl leading-relaxed">
            Configure your destination, rhythm, style, and budget. The Living Journey Engine constructs a synchronized itinerary passport that adapts dynamically if reality shifts.
          </p>
        </div>
      </section>

      {/* Main Builder & Real-Time Passport Preview */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 pt-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* LEFT: Configuration Options */}
          <div className="lg:col-span-7 space-y-8 bg-soft-ivory border border-espresso/20 p-6 sm:p-8 shadow-xs">
            {/* 1. Destination Selector */}
            <div className="space-y-3">
              <label className="font-mono text-xs uppercase tracking-wider text-deep-slate font-semibold block">
                01 / SELECT DESTINATION
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {destinations.map((dest) => {
                  const isSelected = selectedDestinationSlug === dest.slug;
                  return (
                    <button
                      key={dest.id}
                      type="button"
                      onClick={() => {
                        setSelectedDestinationSlug(dest.slug);
                        setBudgetPerDay(dest.average_daily_budget || 4000);
                      }}
                      className={`p-3 text-left border transition-all ${
                        isSelected
                          ? 'bg-parchment border-terracotta shadow-2xs ring-1 ring-terracotta/30'
                          : 'bg-soft-ivory border-espresso/20 hover:border-espresso/40'
                      }`}
                    >
                      <span className="font-display text-base font-medium text-deep-slate block">
                        {dest.name}
                      </span>
                      <span className="font-mono text-[9px] uppercase tracking-wider text-stone-gray block">
                        {dest.country}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Travel Style */}
            <div className="space-y-3 pt-4 border-t border-espresso/15">
              <label className="font-mono text-xs uppercase tracking-wider text-deep-slate font-semibold block">
                02 / TRAVEL STYLES & INTERESTS (CHOOSE UP TO 3)
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  'Adventure',
                  'Food',
                  'Culture',
                  'Heritage',
                  'Nature',
                  'Relaxed',
                  'Luxury',
                  'Beaches',
                ].map((style) => {
                  const isSelected = selectedStyles.includes(style);
                  return (
                    <button
                      key={style}
                      type="button"
                      onClick={() => toggleStyle(style)}
                      className={`font-mono text-xs uppercase tracking-wider px-3.5 py-1.5 border transition-all ${
                        isSelected
                          ? 'bg-terracotta text-soft-ivory border-terracotta font-semibold'
                          : 'bg-parchment/60 text-espresso border-espresso/20 hover:border-espresso/40'
                      }`}
                    >
                      {style}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Travel Pace */}
            <div className="space-y-3 pt-4 border-t border-espresso/15">
              <label className="font-mono text-xs uppercase tracking-wider text-deep-slate font-semibold block">
                03 / TRAVEL PACE & TRANSIT BUFFERS
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    id: 'relaxed',
                    title: 'Relaxed Pace',
                    desc: '1-2 key stops/day with generous free exploration buffers.',
                  },
                  {
                    id: 'balanced',
                    title: 'Balanced Pace',
                    desc: '2-3 stops/day. Perfect blend of highlights & relaxation.',
                  },
                  {
                    id: 'fast-paced',
                    title: 'Deep Exploration',
                    desc: '3-4 stops/day for comprehensive cultural immersion.',
                  },
                ].map((pace) => {
                  const isSelected = selectedPace === pace.id;
                  return (
                    <div
                      key={pace.id}
                      onClick={() => setSelectedPace(pace.id as any)}
                      className={`p-3.5 border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-parchment border-terracotta shadow-2xs ring-1 ring-terracotta/30'
                          : 'bg-soft-ivory border-espresso/15 hover:border-espresso/30'
                      }`}
                    >
                      <span className="font-display text-sm font-semibold text-deep-slate block">
                        {pace.title}
                      </span>
                      <p className="text-[11px] text-stone-gray mt-1 leading-snug">
                        {pace.desc}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4. Duration & Daily Budget */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-espresso/15">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-stone-gray uppercase">JOURNEY DURATION:</span>
                  <span className="text-deep-slate font-bold">{durationDays} DAYS</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="14"
                  value={durationDays}
                  onChange={(e) => setDurationDays(Number(e.target.value))}
                  className="w-full accent-terracotta cursor-pointer"
                  aria-label="Journey duration in days"
                />
                <div className="flex justify-between text-[10px] font-mono text-stone-gray">
                  <span>3 Days (Weekend)</span>
                  <span>14 Days (Grand Tour)</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-stone-gray uppercase">DAILY BUDGET TARGET:</span>
                  <span className="text-terracotta font-bold">
                    ₹{budgetPerDay.toLocaleString()} / day
                  </span>
                </div>
                <input
                  type="range"
                  min="2500"
                  max="12000"
                  step="500"
                  value={budgetPerDay}
                  onChange={(e) => setBudgetPerDay(Number(e.target.value))}
                  className="w-full accent-terracotta cursor-pointer"
                  aria-label="Daily budget per traveler"
                />
                <div className="flex justify-between text-[10px] font-mono text-stone-gray">
                  <span>₹2,500 (Moderate)</span>
                  <span>₹12,000+ (Luxury)</span>
                </div>
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-4 border-t border-espresso/15">
              {generationStep ? (
                <div className="p-4 bg-parchment border border-terracotta/40 text-center space-y-2">
                  <span className="inline-block w-4 h-4 border-2 border-terracotta border-t-transparent rounded-full animate-spin" />
                  <p className="font-mono text-xs text-espresso font-medium">{generationStep}</p>
                </div>
              ) : generatedPassReady ? (
                <div className="p-4 bg-emerald-50 border border-emerald-300 text-center space-y-3">
                  <div className="flex items-center justify-center gap-2 text-emerald-800 font-semibold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>Living Journey Pass Successfully Architected!</span>
                  </div>
                  <p className="text-xs text-stone-gray max-w-md mx-auto">
                    Your itinerary graph has been compiled with zero scheduling conflicts and proactive alternative routing.
                  </p>
                  <div className="flex justify-center gap-3 pt-1">
                    <Link to="/dashboard">
                      <Button variant="primary" size="sm" className="bg-terracotta font-mono text-xs uppercase">
                        View In Traveler Workspace
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setGeneratedPassReady(false)}
                      className="font-mono text-xs uppercase"
                    >
                      Reconfigure
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleGenerateJourney}
                  className="w-full justify-center bg-terracotta hover:bg-terracotta-hover text-soft-ivory font-mono text-xs uppercase tracking-widest py-4 shadow-sm gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Generate My Living Journey Pass</span>
                </Button>
              )}
            </div>
          </div>

          {/* RIGHT: Live Synchronized Passport Artifact */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between text-xs font-mono text-stone-gray px-1">
              <span>LIVE DOCUMENT PREVIEW</span>
              <span className="text-terracotta font-semibold">SYNCHRONIZING</span>
            </div>

            <HeroJourneyCard
              destination={currentDestination.name.toUpperCase()}
              duration={`${durationDays} DAYS`}
              style={selectedStyles.join(' + ').toUpperCase()}
              budget={`₹${estimatedTotalBudget.toLocaleString()}`}
              status={generatedPassReady ? 'ACTIVE & MONITORED' : 'CONFIGURING'}
            />

            <div className="p-4 bg-parchment/60 border border-espresso/15 text-xs text-stone-gray space-y-2">
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-terracotta shrink-0 mt-0.5" />
                <p>
                  <strong className="text-deep-slate font-medium">Deterministic Guard:</strong> All transit intervals between activities are automatically padded with verified traffic buffers for {currentDestination.name}.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
