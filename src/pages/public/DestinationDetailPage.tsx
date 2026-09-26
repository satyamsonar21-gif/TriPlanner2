import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Compass,
  Sparkles,
  ArrowRight,
  SunMedium,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DestinationService } from '@/domains/destinations/destination.service';
import type { Destination } from '@/types/database.types';

export const DestinationDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [destination, setDestination] = useState<Destination | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      DestinationService.getBySlug(slug).then((data) => {
        setDestination(data);
        setLoading(false);
      });
    }
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center font-mono text-xs text-stone-gray">
        Retrieving living destination specifications...
      </div>
    );
  }

  if (!destination) {
    return (
      <div className="min-h-screen bg-background py-20 px-6 max-w-xl mx-auto text-center space-y-4">
        <Compass className="w-10 h-10 text-stone-gray mx-auto" />
        <h2 className="font-display text-2xl text-deep-slate font-medium">Destination Not Found</h2>
        <p className="text-xs text-stone-gray">
          The requested destination catalog entry does not exist or has been relocated.
        </p>
        <Link to="/explore">
          <Button variant="outline" size="sm" className="font-mono text-xs uppercase">
            Return to Destinations
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-background text-foreground font-body min-h-screen pb-24">
      {/* Top Back Navigation Bar */}
      <div className="bg-parchment/60 border-b border-espresso/15 py-3 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link
            to="/explore"
            className="inline-flex items-center gap-1.5 font-mono text-xs text-stone-gray hover:text-terracotta uppercase tracking-wider transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>All Destinations</span>
          </Link>
          <span className="font-mono text-[10px] text-stone-gray uppercase tracking-widest hidden sm:inline">
            PASSPORT REF: TP-{destination.slug.toUpperCase()}-2026
          </span>
        </div>
      </div>

      {/* Destination Hero Banner */}
      <section className="relative border-b border-espresso/20 bg-deep-slate text-soft-ivory overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={destination.hero_image}
            alt={destination.name}
            className="w-full h-full object-cover object-center opacity-45 filter brightness-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-deep-slate via-deep-slate/60 to-transparent" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-20 sm:py-28 space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-widest bg-terracotta text-soft-ivory px-3 py-1 font-semibold">
              {destination.region} · {destination.country}
            </span>
            <span className="font-mono text-xs uppercase tracking-wider bg-soft-ivory/20 backdrop-blur-xs text-soft-ivory px-3 py-1">
              {destination.duration_days || 5} Days Suggested
            </span>
          </div>

          <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-normal tracking-tight text-soft-ivory">
            {destination.name}
          </h1>

          <p className="text-soft-ivory/80 text-sm sm:text-base max-w-2xl leading-relaxed font-body">
            {destination.description}
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-4">
            <Link to={`/plan?destination=${destination.slug}`}>
              <Button
                variant="primary"
                size="lg"
                className="bg-terracotta hover:bg-terracotta-hover text-soft-ivory font-mono text-xs uppercase tracking-widest px-7 py-3.5 shadow-sm gap-2"
              >
                <span>Customize This Journey</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <div className="font-mono text-xs text-soft-ivory/90 bg-black/40 backdrop-blur-xs border border-white/20 px-4 py-3">
              Starting from{' '}
              <strong className="text-terracotta font-bold text-sm">
                ₹{destination.starting_price?.toLocaleString() || '18,500'}
              </strong>{' '}
              per traveler
            </div>
          </div>
        </div>
      </section>

      {/* Main Details Body */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 pt-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left / Main Column */}
          <div className="lg:col-span-8 space-y-12">
            {/* Highlights Grid */}
            <div className="space-y-4">
              <span className="font-mono text-xs uppercase tracking-widest text-terracotta block">
                CURATED HIGHLIGHTS
              </span>
              <h2 className="font-display text-2xl sm:text-3xl text-deep-slate font-medium">
                Vetted Experiences & Stays
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {destination.curated_highlights.map((highlight, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-soft-ivory border border-espresso/20 flex items-start gap-3 shadow-2xs"
                  >
                    <Sparkles className="w-4 h-4 text-terracotta shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-deep-slate text-sm">{highlight}</h4>
                      <span className="text-[11px] text-stone-gray font-mono mt-0.5 block">
                        Verified Operator Route
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sample 3-Day Living Itinerary Blueprint */}
            {destination.sample_itinerary && (
              <div className="space-y-6 pt-4 border-t border-espresso/15">
                <div>
                  <span className="font-mono text-xs uppercase tracking-widest text-terracotta block">
                    SAMPLE BLUEPRINT
                  </span>
                  <h2 className="font-display text-2xl sm:text-3xl text-deep-slate font-medium mt-1">
                    Living Itinerary Framework
                  </h2>
                  <p className="text-stone-gray text-xs sm:text-sm mt-1">
                    Every day is structured with comfortable transit intervals, opening hours buffers, and optional alternatives.
                  </p>
                </div>

                <div className="space-y-4">
                  {destination.sample_itinerary.map((day) => (
                    <div
                      key={day.day}
                      className="p-6 bg-parchment/60 border border-espresso/20 space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-espresso/15 pb-2">
                        <span className="font-mono text-xs font-bold text-terracotta uppercase tracking-wider">
                          DAY 0{day.day}
                        </span>
                        <span className="font-display text-base text-deep-slate font-medium">
                          {day.title}
                        </span>
                      </div>
                      <ul className="space-y-2 pt-1">
                        {day.items.map((item, i) => (
                          <li key={i} className="flex items-center gap-2 text-xs text-espresso/90">
                            <CheckCircle2 className="w-3.5 h-3.5 text-stone-gray shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Climate & Seasonality */}
            <div className="p-6 bg-soft-ivory border border-espresso/20 space-y-3">
              <div className="flex items-center gap-2">
                <SunMedium className="w-5 h-5 text-antique-brass" />
                <h3 className="font-display text-lg text-deep-slate font-medium">
                  Seasonal & Climate Guidance
                </h3>
              </div>
              <p className="text-stone-gray text-xs sm:text-sm leading-relaxed">
                {destination.climate_summary}
              </p>
              <div className="pt-2 font-mono text-xs text-espresso">
                <strong>Recommended Visiting Window:</strong> {destination.best_season || 'October through March'}
              </div>
            </div>
          </div>

          {/* Right / Sticky Passport Card Column */}
          <div className="lg:col-span-4 space-y-6">
            <div className="sticky top-28 bg-[#F3E8DC] border-2 border-espresso/35 p-6 shadow-md space-y-5">
              <div className="flex items-center justify-between border-b border-espresso/20 pb-3">
                <span className="font-mono text-[9px] uppercase tracking-widest text-stone-gray">
                  PASSPORT SPECIFICATION
                </span>
                <span className="font-mono text-[9px] bg-terracotta/10 text-terracotta font-semibold px-2 py-0.5 border border-terracotta/20">
                  READY TO BUILD
                </span>
              </div>

              <div>
                <h3 className="font-display text-2xl text-deep-slate font-medium">
                  {destination.name} Journey Pass
                </h3>
                <span className="font-mono text-xs text-stone-gray block mt-0.5">
                  5-Day Living Blueprint
                </span>
              </div>

              <div className="space-y-2 text-xs font-mono border-t border-b border-espresso/15 py-3">
                <div className="flex justify-between">
                  <span className="text-stone-gray">STARTING BUDGET:</span>
                  <span className="text-terracotta font-bold">
                    ₹{destination.starting_price?.toLocaleString() || '18,500'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-gray">DAILY AVERAGE:</span>
                  <span className="text-espresso">
                    ₹{destination.average_daily_budget.toLocaleString()} / day
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-gray">COORDINATES:</span>
                  <span className="text-espresso">
                    {destination.coordinates.lat.toFixed(2)}° N, {destination.coordinates.lng.toFixed(2)}° E
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-gray">DYNAMIC RECALCULATION:</span>
                  <span className="text-emerald-700 font-semibold">Enabled</span>
                </div>
              </div>

              <Link to={`/plan?destination=${destination.slug}`} className="block">
                <Button
                  variant="primary"
                  className="w-full justify-center bg-terracotta hover:bg-terracotta-hover text-soft-ivory font-mono text-xs uppercase tracking-wider py-3.5 shadow-sm"
                >
                  Personalize This Trip
                </Button>
              </Link>

              <p className="text-[11px] text-stone-gray text-center font-body">
                Customize your travel style, pace, stays, and budget flexibility in seconds.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
