import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Compass,
  ShieldCheck,
  Clock,
  AlertCircle,
  FileCheck,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { HeroJourneyCard } from '@/components/signature/HeroJourneyCard';
import { JourneyThread, type ThreadStep } from '@/components/signature/JourneyThread';
import { DestinationCard } from '@/components/public/DestinationCard';
import { LivingEngineDemo } from '@/components/public/LivingEngineDemo';
import { OperatorPreviewCard } from '@/components/public/OperatorPreviewCard';
import { HeroImageCarousel } from '@/components/public/HeroImageCarousel';
import { DestinationStrip } from '@/components/public/DestinationStrip';
import { DestinationShowcase } from '@/components/public/DestinationShowcase';
import {
  CompassRose,
  FloatingParticles,
  TravelStamps,
  DottedFlightPath,
  PaperAirplane,
  ScrollProgressCompass,
} from '@/components/public/TravelDecorations';
import { DestinationService } from '@/domains/destinations/destination.service';
import type { Destination } from '@/types/database.types';

export const HomePage: React.FC = () => {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [selectedStyleFilter, setSelectedStyleFilter] = useState<string>('all');
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);

  useEffect(() => {
    DestinationService.getAll().then((data) => {
      setDestinations(data);
    });
  }, []);

  const filteredDestinations = destinations.filter((dest) => {
    if (selectedStyleFilter === 'all') return true;
    return dest.styles?.some((s) => s.toLowerCase() === selectedStyleFilter.toLowerCase());
  });

  const planningSteps = [
    {
      id: 'step_discover',
      stepNumber: '01',
      title: 'DISCOVER',
      headline: 'Find destinations and experiences that fit you.',
      description:
        'Explore authentic regions, seasonal highlights, and handpicked local activities vetted for pacing, culture, and travel rhythm.',
      type: 'discover' as const,
      status: 'completed' as const,
    },
    {
      id: 'step_personalize',
      stepNumber: '02',
      title: 'PERSONALIZE',
      headline: 'Tell us your budget, interests, pace and travel style.',
      description:
        'Whether you seek slow coastal mornings or high-altitude treks, your preferences set the rules for transit buffers and stay types.',
      type: 'destination' as const,
      status: 'completed' as const,
    },
    {
      id: 'step_plan',
      stepNumber: '03',
      title: 'PLAN',
      headline: 'Build a complete journey across stays, transport and experiences.',
      description:
        'The Living Journey Engine constructs a deterministic dependency graph ensuring zero overlapping schedules or missed connections.',
      type: 'stay' as const,
      status: 'current' as const,
    },
    {
      id: 'step_book',
      stepNumber: '04',
      title: 'BOOK',
      headline: 'Keep your reservations and itinerary together.',
      description:
        'Unify flights, boutique stays, chauffeur transfers, and activity vouchers in a single living travel passport with full pricing clarity.',
      type: 'experience' as const,
      status: 'upcoming' as const,
    },
    {
      id: 'step_adapt',
      stepNumber: '05',
      title: 'ADAPT',
      headline: 'When reality changes, your journey changes with it.',
      description:
        'Weather alerts or vendor delays trigger immediate downstream impact analysis and generate curated, scored alternative proposals in seconds.',
      type: 'complete' as const,
      status: 'upcoming' as const,
    },
  ];

  const threadSteps: ThreadStep[] = planningSteps.map((step, idx) => ({
    id: step.id,
    type: step.type,
    title: step.title,
    subtitle: `Step 0${idx + 1}`,
    status: idx === activeStepIndex ? 'current' : idx < activeStepIndex ? 'completed' : 'upcoming',
  }));

  return (
    <div className="bg-background text-foreground font-body overflow-hidden">
      {/* Scroll-tracking compass in bottom-right corner */}
      <ScrollProgressCompass />

      {/* ============================================================ */}
      {/* 1. HERO SECTION (WITH ANIMATED CAROUSEL + DECORATIONS)       */}
      {/* ============================================================ */}
      <section
        className="relative pt-6 pb-20 md:py-24 px-6 lg:px-8 border-b border-espresso/15 bg-gradient-to-b from-[#F3E8DC]/40 via-background to-background"
        aria-label="Hero Introduction"
      >
        {/* Ambient decorations — compass rose & particles */}
        <CompassRose className="absolute -top-6 -right-8 lg:right-12 opacity-60" size={140} />
        <FloatingParticles count={8} className="z-0" />
        <TravelStamps />
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* LEFT COLUMN: Editorial Typography & CTAs */}
            <div className="lg:col-span-6 space-y-6 sm:space-y-8 z-10">
              {/* Editorial Eyebrow */}
              <div className="inline-flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-terracotta" />
                <span className="font-mono text-xs uppercase tracking-widest text-terracotta font-semibold">
                  PLAN LESS. TRAVEL BETTER.
                </span>
              </div>

              {/* Main Headline */}
              <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-normal text-deep-slate leading-[1.08] tracking-tight">
                Your Journey <br />
                Built Around <br />
                <span className="text-terracotta italic font-normal">You.</span>
              </h1>

              {/* Supporting Copy */}
              <p className="text-stone-gray text-base sm:text-lg max-w-xl leading-relaxed font-body">
                Plan destinations, stays, experiences and transfers around the way you actually travel — then adapt your journey when reality changes.
              </p>

              {/* Actions & Microcopy */}
              <div className="space-y-4 pt-2">
                <div className="flex flex-wrap items-center gap-4">
                  <Link
                    to="/plan"
                    className={buttonVariants({
                      variant: 'primary',
                      size: 'lg',
                      className: 'bg-terracotta hover:bg-terracotta-hover text-soft-ivory text-xs uppercase tracking-widest font-mono font-medium px-7 py-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 gap-2',
                    })}
                  >
                    <span>Build My Journey</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>

                  <Link
                    to="/explore"
                    className={buttonVariants({
                      variant: 'outline',
                      size: 'lg',
                      className: 'border-espresso/30 text-espresso hover:bg-parchment/80 text-xs uppercase tracking-widest font-mono font-medium px-6 py-4 transition-colors',
                    })}
                  >
                    Explore Destinations
                  </Link>
                </div>

                <p className="font-mono text-[11px] text-stone-gray tracking-wide">
                  Personalized planning. Smarter alternatives. One living journey.
                </p>
              </div>
            </div>

            {/* RIGHT COLUMN: Asymmetric Destination Composition & Signature Card */}
            <div className="lg:col-span-6 relative mt-4 lg:mt-0">
              {/* Background Architectural/Destination Visual Container */}
              <div className="relative mx-auto max-w-md lg:max-w-none">
                {/* ROTATING HERO IMAGE CAROUSEL — Real destination photos with Ken Burns + crossfade */}
                <HeroImageCarousel />

                {/* Overlaid Physical "Journey Card / Journey Passport" */}
                <div className="mt-6 sm:mt-0 sm:absolute sm:-bottom-10 sm:-left-8 sm:max-w-sm md:max-w-md w-full z-20 transition-transform duration-300 hover:scale-[1.01]">
                  <HeroJourneyCard
                    destination="GOA"
                    duration="5 DAYS"
                    style="ADVENTURE + COASTAL FOOD"
                    budget="₹40,000"
                    status="PERSONALIZED"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* LOWER HERO: Trust Indicators / Travel Statistics */}
          <div className="mt-16 sm:mt-24 pt-8 border-t border-espresso/15 grid grid-cols-2 md:grid-cols-4 gap-6 text-center sm:text-left">
            <div className="space-y-1">
              <span className="font-display text-3xl sm:text-4xl text-deep-slate font-medium block">
                DAG
              </span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-stone-gray block">
                Graph-Based Dependency Modeling
              </span>
            </div>

            <div className="space-y-1">
              <span className="font-display text-3xl sm:text-4xl text-terracotta font-medium block">
                8+
              </span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-stone-gray block">
                Curated Demo Destinations
              </span>
            </div>

            <div className="space-y-1">
              <span className="font-display text-3xl sm:text-4xl text-deep-slate font-medium block">
                Real-Time
              </span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-stone-gray block">
                Automated Disruption Analysis
              </span>
            </div>

            <div className="space-y-1">
              <span className="font-display text-3xl sm:text-4xl text-deep-slate font-medium block">
                100%
              </span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-stone-gray block">
                Deterministic Conflict Detection
              </span>
            </div>
          </div>
        </div>

        {/* Dotted flight path decoration between hero and content */}
        <div className="absolute bottom-0 left-0 right-0 h-16 overflow-hidden pointer-events-none">
          <DottedFlightPath className="w-full h-full" />
        </div>
      </section>

      {/* ============================================================ */}
      {/* 1B. DESTINATION IMAGE STRIP — Infinite scrolling marquee     */}
      {/* ============================================================ */}
      <DestinationStrip />

      {/* ============================================================ */}
      {/* 2. SECTION: HOW PERSONALIZED PLANNING WORKS                  */}
      {/* ============================================================ */}
      <section
        id="how-it-works"
        className="py-20 px-6 lg:px-8 border-b border-espresso/15 bg-parchment/30"
        aria-label="How Triplanner Works"
      >
        <div className="max-w-7xl mx-auto space-y-12">
          {/* Section Header */}
          <div className="max-w-2xl">
            <span className="font-mono text-xs uppercase tracking-widest text-terracotta block mb-2">
              THE TRAVEL PLANNING PROGRESSION
            </span>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl text-deep-slate font-normal tracking-tight">
              From inspiration to live on-trip adaptation.
            </h2>
            <p className="text-stone-gray text-sm sm:text-base mt-4 leading-relaxed">
              Most platforms stop when the checkout is done. Triplanner maintains a continuous thread between your desires, your itinerary constraints, and real-world operations.
            </p>
          </div>

          {/* Interactive JourneyThread Progression */}
          <div className="bg-soft-ivory border border-espresso/20 p-6 sm:p-8 shadow-xs">
            <JourneyThread
              steps={threadSteps}
              onStepClick={(step) => {
                const idx = planningSteps.findIndex((s) => s.id === step.id);
                if (idx !== -1) setActiveStepIndex(idx);
              }}
            />

            {/* Active Step Narrative Spotlight */}
            <div className="mt-8 pt-6 border-t border-espresso/15 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-3">
                <span className="font-mono text-2xl text-terracotta font-bold">
                  {planningSteps[activeStepIndex].stepNumber}
                </span>
                <span className="font-mono text-xs uppercase tracking-widest text-deep-slate font-semibold block mt-1">
                  {planningSteps[activeStepIndex].title} PHASE
                </span>
              </div>
              <div className="md:col-span-9 space-y-2">
                <h4 className="font-display text-xl text-deep-slate font-medium">
                  {planningSteps[activeStepIndex].headline}
                </h4>
                <p className="text-stone-gray text-xs sm:text-sm leading-relaxed">
                  {planningSteps[activeStepIndex].description}
                </p>
              </div>
            </div>
          </div>

          {/* 5-Step Narrative Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {planningSteps.map((step, idx) => (
              <div
                key={step.id}
                onClick={() => setActiveStepIndex(idx)}
                className={`p-5 border transition-all cursor-pointer ${
                  activeStepIndex === idx
                    ? 'bg-soft-ivory border-terracotta shadow-xs ring-1 ring-terracotta/20'
                    : 'bg-parchment/60 border-espresso/15 hover:border-espresso/30'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-xs font-semibold text-terracotta">
                    {step.stepNumber}
                  </span>
                  <span className="font-mono text-[9px] uppercase tracking-wider text-stone-gray">
                    {step.title}
                  </span>
                </div>
                <h5 className="font-display text-sm font-medium text-deep-slate leading-snug">
                  {step.headline}
                </h5>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 3. SECTION: DESTINATION DISCOVERY CATALOG                   */}
      {/* ============================================================ */}
      <section
        id="experiences"
        className="py-20 px-6 lg:px-8 border-b border-espresso/15 bg-background"
        aria-label="Explore Destinations"
      >
        <div className="max-w-7xl mx-auto space-y-10">
          {/* Header & Filter Controls */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-espresso/15">
            <div>
              <span className="font-mono text-xs uppercase tracking-widest text-terracotta block mb-2">
                CURATED DESTINATIONS
              </span>
              <h2 className="font-display text-3xl sm:text-4xl text-deep-slate font-normal tracking-tight">
                Handcrafted Journeys, Ready to Personalize.
              </h2>
              <p className="text-stone-gray text-xs sm:text-sm mt-2 max-w-xl">
                Explore destinations where every stay, transfer, and excursion is architected with realistic transit buffers and verified local partners.
              </p>
            </div>

            {/* Travel Style Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 self-start md:self-end">
              {['all', 'Adventure', 'Culture', 'Relaxed', 'Nature', 'Food'].map((style) => (
                <button
                  key={style}
                  type="button"
                  onClick={() => setSelectedStyleFilter(style)}
                  className={`font-mono text-[10px] uppercase tracking-wider px-3 py-1.5 border transition-all ${
                    selectedStyleFilter.toLowerCase() === style.toLowerCase()
                      ? 'bg-terracotta text-soft-ivory border-terracotta'
                      : 'bg-parchment/60 text-espresso border-espresso/20 hover:border-espresso/40'
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          {/* Varied Editorial Composition Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {filteredDestinations.slice(0, 5).map((dest, idx) => (
              <DestinationCard
                key={dest.id}
                destination={dest}
                variant={idx === 0 ? 'featured' : 'standard'}
              />
            ))}
          </div>

          {/* Explore All CTA Bar */}
          <div className="p-6 bg-parchment/60 border border-espresso/20 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="font-display text-lg text-deep-slate font-medium">
                Seeking a bespoke route or multi-city voyage?
              </h4>
              <p className="text-stone-gray text-xs mt-0.5">
                Explore all 8 curated destinations or configure your own itinerary from scratch.
              </p>
            </div>
            <Link
              to="/explore"
              className={buttonVariants({
                variant: 'outline',
                size: 'md',
                className: 'border-espresso text-espresso hover:bg-espresso hover:text-soft-ivory font-mono text-xs uppercase tracking-wider gap-2 shrink-0',
              })}
            >
              <span>View All Destinations</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 3B. DESTINATION SHOWCASE — Immersive parallax gallery        */}
      {/* ============================================================ */}
      <DestinationShowcase />

      {/* ============================================================ */}
      {/* 4. SECTION: THE LIVING JOURNEY ENGINE (CORE DEMONSTRATION)   */}
      {/* ============================================================ */}
      <section
        className="py-20 px-6 lg:px-8 border-b border-espresso/15 bg-gradient-to-b from-[#F3E8DC]/40 to-background"
        aria-label="The Living Journey Engine Showcase"
      >
        <div className="max-w-7xl mx-auto space-y-12">
          {/* Conceptual Editorial Header */}
          <div className="max-w-3xl">
            <span className="font-mono text-xs uppercase tracking-widest text-terracotta block mb-2">
              THE CORE CONCEPTUAL DIFFERENTIATOR
            </span>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl text-deep-slate font-normal tracking-tight">
              Don’t just plan the trip. <br />
              <span className="text-terracotta italic">Keep it alive when reality changes.</span>
            </h2>
            <p className="text-stone-gray text-sm sm:text-base mt-4 leading-relaxed font-body">
              Traditional travel apps hand you a static PDF or isolated bookings. When a boat is delayed or a monsoon swells the bay, your itinerary collapses into chaos.
              Triplanner treats your journey as an active dependency graph. It detects changes, recalculates downstream impacts, and presents vetted alternatives before your vacation loses momentum.
            </p>
          </div>

          {/* Signature Interactive Adaptation Showcase */}
          <LivingEngineDemo />
        </div>
      </section>

      {/* ============================================================ */}
      {/* 5. SECTION: TRAVELER BENEFITS (EDITORIAL & MEANINGFUL)       */}
      {/* ============================================================ */}
      <section
        className="py-20 px-6 lg:px-8 border-b border-espresso/15 bg-background"
        aria-label="Traveler Benefits"
      >
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="max-w-2xl">
            <span className="font-mono text-xs uppercase tracking-widest text-terracotta block mb-2">
              TRAVELER ADVANTAGES
            </span>
            <h2 className="font-display text-3xl sm:text-4xl text-deep-slate font-normal tracking-tight">
              Designed around your autonomy and peace of mind.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            <div className="p-6 bg-soft-ivory border border-espresso/20 space-y-3">
              <span className="font-mono text-xs font-bold text-terracotta block">01 / PERSONALIZED</span>
              <h4 className="font-display text-lg text-deep-slate font-medium">Your preferences lead.</h4>
              <p className="text-stone-gray text-xs leading-relaxed">
                Your selected pace, dietary requirements, and style direct every recommendation — not sponsored hotel listings.
              </p>
            </div>

            <div className="p-6 bg-soft-ivory border border-espresso/20 space-y-3">
              <span className="font-mono text-xs font-bold text-terracotta block">02 / TRANSPARENT</span>
              <h4 className="font-display text-lg text-deep-slate font-medium">Full trade-off clarity.</h4>
              <p className="text-stone-gray text-xs leading-relaxed">
                See exact transit buffers, opening hours, and net cost deltas before confirming any alteration to your plan.
              </p>
            </div>

            <div className="p-6 bg-soft-ivory border border-espresso/20 space-y-3">
              <span className="font-mono text-xs font-bold text-terracotta block">03 / CONNECTED</span>
              <h4 className="font-display text-lg text-deep-slate font-medium">Unified travel document.</h4>
              <p className="text-stone-gray text-xs leading-relaxed">
                Stays, transport, activities, and local coordinator contacts stay synchronized inside one master living pass.
              </p>
            </div>

            <div className="p-6 bg-soft-ivory border border-espresso/20 space-y-3">
              <span className="font-mono text-xs font-bold text-terracotta block">04 / ADAPTIVE</span>
              <h4 className="font-display text-lg text-deep-slate font-medium">Responsive to delays.</h4>
              <p className="text-stone-gray text-xs leading-relaxed">
                When weather or flight delays strike, the engine highlights affected nodes and ranks viable alternatives immediately.
              </p>
            </div>

            <div className="p-6 bg-soft-ivory border border-espresso/20 space-y-3">
              <span className="font-mono text-xs font-bold text-terracotta block">05 / RELIABLE</span>
              <h4 className="font-display text-lg text-deep-slate font-medium">Structured verified data.</h4>
              <p className="text-stone-gray text-xs leading-relaxed">
                Travel information is anchored in verified operator inventories, real geographical coordinates, and validated schedules.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 6. SECTION: TRUST / RELIABILITY STANDARDS                    */}
      {/* ============================================================ */}
      <section
        id="trust-principles"
        className="py-20 px-6 lg:px-8 border-b border-espresso/15 bg-parchment/40"
        aria-label="Trust and Reliability"
      >
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="max-w-2xl">
            <span className="font-mono text-xs uppercase tracking-widest text-terracotta block mb-2">
              RELIABILITY BY DESIGN
            </span>
            <h2 className="font-display text-3xl sm:text-4xl text-deep-slate font-normal tracking-tight">
              Travel information should earn your trust.
            </h2>
            <p className="text-stone-gray text-xs sm:text-sm mt-3 leading-relaxed">
              We avoid unsubstantiated marketing claims. Instead, we adhere to five structural standards that make travel planning dependable.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 bg-soft-ivory border border-espresso/20 flex items-start gap-4">
              <FileCheck className="w-6 h-6 text-terracotta shrink-0 mt-0.5" />
              <div>
                <h4 className="font-display text-base text-deep-slate font-semibold">Verified Data Sources</h4>
                <p className="text-stone-gray text-xs mt-1 leading-relaxed">
                  Structured provider information with clear update timestamps and vendor verification status.
                </p>
              </div>
            </div>

            <div className="p-6 bg-soft-ivory border border-espresso/20 flex items-start gap-4">
              <Clock className="w-6 h-6 text-terracotta shrink-0 mt-0.5" />
              <div>
                <h4 className="font-display text-base text-deep-slate font-semibold">Logical Itineraries</h4>
                <p className="text-stone-gray text-xs mt-1 leading-relaxed">
                  Real transit distances, realistic buffer times, and operating schedules are mathematically validated.
                </p>
              </div>
            </div>

            <div className="p-6 bg-soft-ivory border border-espresso/20 flex items-start gap-4">
              <ShieldCheck className="w-6 h-6 text-antique-brass shrink-0 mt-0.5" />
              <div>
                <h4 className="font-display text-base text-deep-slate font-semibold">Transparent Pricing</h4>
                <p className="text-stone-gray text-xs mt-1 leading-relaxed">
                  Itemized pricing and net adjustment estimates are shown upfront — before you commit to changes.
                </p>
              </div>
            </div>

            <div className="p-6 bg-soft-ivory border border-espresso/20 flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-burnt-clay shrink-0 mt-0.5" />
              <div>
                <h4 className="font-display text-base text-deep-slate font-semibold">Clear Cancellation Policies</h4>
                <p className="text-stone-gray text-xs mt-1 leading-relaxed">
                  Cancellation terms, refund windows, and vendor rules are explicitly highlighted before booking.
                </p>
              </div>
            </div>

            <div className="p-6 bg-soft-ivory border border-espresso/20 flex items-start gap-4">
              <Layers className="w-6 h-6 text-espresso shrink-0 mt-0.5" />
              <div>
                <h4 className="font-display text-base text-deep-slate font-semibold">Single Living Journey View</h4>
                <p className="text-stone-gray text-xs mt-1 leading-relaxed">
                  Keep your entire party, coordinator, and travel vouchers aligned on the exact same real-time itinerary state.
                </p>
              </div>
            </div>

            <div className="p-6 bg-soft-ivory border border-espresso/20 flex items-start gap-4">
              <Compass className="w-6 h-6 text-terracotta shrink-0 mt-0.5" />
              <div>
                <h4 className="font-display text-base text-deep-slate font-semibold">Human-in-the-Loop Control</h4>
                <p className="text-stone-gray text-xs mt-1 leading-relaxed">
                  Automation computes options, but you and your coordinator maintain final approval over any modification.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 7. SECTION: OPERATOR EXPERIENCE PREVIEW                      */}
      {/* ============================================================ */}
      <section
        id="operator-intelligence"
        className="py-20 px-6 lg:px-8 border-b border-espresso/15 bg-background"
        aria-label="Operator Experience Preview"
      >
        <div className="max-w-7xl mx-auto space-y-10">
          <OperatorPreviewCard />
        </div>
      </section>

      {/* ============================================================ */}
      {/* 8. SECTION: CLOSING FINAL CTA (with floating decorations)    */}
      {/* ============================================================ */}
      <section
        className="py-24 px-6 lg:px-8 bg-parchment text-espresso text-center relative overflow-hidden"
        aria-label="Build Your Journey Call to Action"
      >
        {/* Subtle Watermark Decoration */}
        <div
          className="absolute inset-0 pointer-events-none opacity-10"
          style={{
            backgroundImage: 'radial-gradient(var(--espresso) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />
        {/* Floating compass in CTA section */}
        <CompassRose className="absolute -bottom-12 -left-12 opacity-30" size={160} />
        <PaperAirplane className="absolute top-8 left-0" />
        <FloatingParticles count={6} className="z-0" />

        <div className="max-w-3xl mx-auto space-y-8 relative z-10">
          <div className="w-12 h-12 border border-espresso mx-auto bg-soft-ivory flex items-center justify-center font-display font-bold text-lg text-terracotta shadow-xs">
            TP
          </div>

          <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl text-deep-slate font-normal tracking-tight">
            Your next journey should feel like yours.
          </h2>

          <p className="text-stone-gray text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Build a trip around your interests, your pace and your budget — and keep it adaptable when plans change.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link
              to="/plan"
              className={buttonVariants({
                variant: 'primary',
                size: 'lg',
                className: 'bg-terracotta hover:bg-terracotta-hover text-soft-ivory text-xs uppercase tracking-widest font-mono font-medium px-8 py-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 gap-2',
              })}
            >
              <span>Build My Journey</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/explore"
              className={buttonVariants({
                variant: 'outline',
                size: 'lg',
                className: 'border-espresso/40 text-espresso hover:bg-soft-ivory text-xs uppercase tracking-widest font-mono font-medium px-7 py-4',
              })}
            >
              Explore Destinations
            </Link>
          </div>

          <div className="pt-6">
            <span className="font-mono text-[9px] uppercase tracking-widest text-stone-gray border-t border-espresso/20 pt-4 inline-block">
              OFFICIAL LIVING PASS GENERATION • TRIPLANNER LIVING ENGINE™
            </span>
          </div>
        </div>
      </section>
    </div>
  );
};
