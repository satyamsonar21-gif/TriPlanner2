import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  MapPin,
  Compass,
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { HeroJourneyCard } from '@/components/signature/HeroJourneyCard';
import { MapView, PlacesSearchInput } from '@/components/geo';
import { DestinationService } from '@/domains/destinations/destination.service';
import { JourneyService } from '@/domains/journeys/journey.service';
import { type GeoLocation, DEMO_LOCATION_FIXTURES } from '@/domains/geo';
import type { Destination } from '@/types/database.types';
import {
  sharedAiOrchestrator,
  type StructuredAiResponse,
} from '@/domains/ai';

export const PlanJourneyPage: React.FC = () => {
  const [searchParams] = useSearchParams();

  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [selectedDestinationSlug, setSelectedDestinationSlug] = useState<string>('goa');
  const [selectedGeoLocation, setSelectedGeoLocation] = useState<GeoLocation>(
    DEMO_LOCATION_FIXTURES[0]
  );
  const [locationConfirmed, setLocationConfirmed] = useState<boolean>(true);
  const [selectedPace, setSelectedPace] = useState<'relaxed' | 'balanced' | 'fast-paced'>('balanced');
  const [selectedStyles, setSelectedStyles] = useState<string[]>(['Adventure', 'Food']);
  const [durationDays, setDurationDays] = useState<number>(5);
  const [budgetPerDay, setBudgetPerDay] = useState<number>(4000);
  const [generationStep, setGenerationStep] = useState<string | null>(null);
  const [generatedPassReady, setGeneratedPassReady] = useState(false);
  const [createdJourneyId, setCreatedJourneyId] = useState<string>('jrn_goa_01');
  const [aiPlanningPrompt, setAiPlanningPrompt] = useState<string>(
    'Plan a 5-day Goa trip for 2 under ₹42,000 with adventure, beaches and good food, not too rushed in the morning'
  );
  const [aiPlanningResponse, setAiPlanningResponse] =
    useState<StructuredAiResponse | null>(null);
  const [isAiExtracting, setIsAiExtracting] = useState<boolean>(false);

  useEffect(() => {
    DestinationService.getAll().then((data) => {
      setDestinations(data);
      const queryDest = searchParams.get('destination');
      const matched = data.find((d) => d.slug === queryDest) || data[0];
      if (matched) {
        setSelectedDestinationSlug(matched.slug);
        setSelectedGeoLocation(DestinationService.getCanonicalLocation(matched));
        setBudgetPerDay(matched.average_daily_budget || 4000);
      }
    });
  }, [searchParams]);

  const currentDestination = useMemo(
    () =>
      destinations.find((d) => d.slug === selectedDestinationSlug) ||
      destinations[0],
    [destinations, selectedDestinationSlug]
  );

  const previewMarkers = useMemo(() => {
    if (currentDestination && currentDestination.name.toLowerCase() === selectedGeoLocation.name.toLowerCase()) {
      const nearby = DestinationService.getNearbyExperiences(currentDestination);
      return [
        {
          id: selectedGeoLocation.id,
          position: selectedGeoLocation.coordinate,
          title: selectedGeoLocation.name,
          sequenceNumber: 1,
        },
        ...nearby.slice(0, 3).map((loc, idx) => ({
          id: loc.id,
          position: loc.coordinate,
          title: loc.name,
          sequenceNumber: idx + 2,
        })),
      ];
    }

    return [
      {
        id: selectedGeoLocation.id,
        position: selectedGeoLocation.coordinate,
        title: selectedGeoLocation.name,
        sequenceNumber: 1,
      },
    ];
  }, [currentDestination, selectedGeoLocation]);

  const estimatedTotalBudget = durationDays * budgetPerDay;

  const handlePlaceSearchSelect = (place: GeoLocation) => {
    setSelectedGeoLocation(place);
    setLocationConfirmed(true);
    setGeneratedPassReady(false);

    const catalogMatch = destinations.find(
      (d) =>
        d.name.toLowerCase() === place.name.toLowerCase() ||
        d.id === place.id
    );
    if (catalogMatch) {
      setSelectedDestinationSlug(catalogMatch.slug);
      setBudgetPerDay(catalogMatch.average_daily_budget || 4000);
    }
  };

  const toggleStyle = (style: string) => {
    if (selectedStyles.includes(style)) {
      if (selectedStyles.length > 1) {
        setSelectedStyles(selectedStyles.filter((s) => s !== style));
      }
    } else {
      setSelectedStyles([...selectedStyles, style]);
    }
  };

  const handleAiNaturalLanguagePlan = async () => {
    const trimmed = aiPlanningPrompt.trim();
    if (!trimmed || isAiExtracting) return;
    setIsAiExtracting(true);
    try {
      const res = await sharedAiOrchestrator.processRequest({
        userPrompt: trimmed,
        journeyId: 'jrn_goa_01',
        actorId: 'usr_traveler_01',
        actorRole: 'traveler',
      });
      setAiPlanningResponse(res);

      const prefs = res.extractedPreferences;
      if (prefs) {
        if (prefs.durationDays?.value) {
          setDurationDays(prefs.durationDays.value);
        }
        if (prefs.budgetAmount?.value) {
          const days = prefs.durationDays?.value || durationDays;
          setBudgetPerDay(
            Math.max(2500, Math.round(prefs.budgetAmount.value / days / 500) * 500)
          );
        }
        if (prefs.pace?.value) {
          setSelectedPace(prefs.pace.value);
        }
        if (prefs.interests.length > 0) {
          const mapped = prefs.interests.map(
            (i) => i.value.charAt(0).toUpperCase() + i.value.slice(1)
          );
          setSelectedStyles(mapped.slice(0, 3));
        }
        if (prefs.destination?.value) {
          const destMatch = destinations.find(
            (d) =>
              d.name.toLowerCase() === prefs.destination!.value.toLowerCase() ||
              d.slug.toLowerCase() === prefs.destination!.value.toLowerCase()
          );
          if (destMatch) {
            setSelectedDestinationSlug(destMatch.slug);
            setSelectedGeoLocation(
              DestinationService.getCanonicalLocation(destMatch)
            );
            setLocationConfirmed(true);
          }
        }
      }
    } finally {
      setIsAiExtracting(false);
    }
  };

  const handleGenerateJourney = () => {
    const steps = [
      `Resolving canonical coordinates for ${selectedGeoLocation.name}...`,
      'Checking regional route availability & travel times...',
      'Building your living dependency graph...',
      'Verifying transfer safety buffers & opening hours...',
      'Preparing proactive location-aware alternatives...',
    ];

    let current = 0;
    setGenerationStep(steps[current]);

    const interval = setInterval(() => {
      current++;
      if (current < steps.length) {
        setGenerationStep(steps[current]);
      } else {
        clearInterval(interval);
        const created = JourneyService.createPlannedJourney({
          destinationLocation: selectedGeoLocation,
          durationDays,
          budgetPerDay,
          styles: selectedStyles,
          pace: selectedPace,
          heroImage: currentDestination?.hero_image,
        });
        setCreatedJourneyId(created.id);
        setGenerationStep(null);
        setGeneratedPassReady(true);
      }
    }, 350);
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
            Search and confirm your destination, rhythm, style, and budget. The Living Journey Engine constructs a geographically verified itinerary passport that adapts dynamically if reality shifts.
          </p>
        </div>
      </section>

      {/* Main Builder & Real-Time Passport Preview */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 pt-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* LEFT: Configuration Options */}
          <div className="lg:col-span-7 space-y-8 bg-soft-ivory border border-espresso/20 p-6 sm:p-8 shadow-xs">
            {/* PHASE 05: NATURAL-LANGUAGE AI TRIP PLANNING ASSISTANT */}
            <div
              data-testid="ai-natural-language-planner"
              className="p-4 rounded-xl bg-parchment/80 border border-terracotta/35 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-xs uppercase tracking-wider text-deep-slate font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-terracotta" />
                  <span>00 / AI NATURAL-LANGUAGE PREFERENCE EXTRACTION</span>
                </span>
                <span className="font-mono text-[9px] uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold">
                  GROUNDED INTENT PARSER
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  data-testid="ai-natural-language-input"
                  value={aiPlanningPrompt}
                  onChange={(e) => setAiPlanningPrompt(e.target.value)}
                  placeholder="Describe your trip in plain language..."
                  className="flex-1 px-3.5 py-2 rounded-lg bg-white border border-espresso/20 text-xs text-deep-slate focus:outline-none focus:ring-2 focus:ring-terracotta"
                />
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  data-testid="ai-extract-preferences-button"
                  onClick={() => void handleAiNaturalLanguagePlan()}
                  disabled={isAiExtracting}
                  className="bg-terracotta hover:bg-terracotta-hover text-white font-mono text-[10px] uppercase tracking-wider shrink-0"
                >
                  {isAiExtracting ? 'EXTRACTING...' : 'EXTRACT & PREVIEW'}
                </Button>
              </div>

              {aiPlanningResponse?.extractedPreferences && (
                <div
                  data-testid="ai-extracted-preferences-card"
                  className="p-3 rounded-lg bg-white border border-espresso/15 space-y-2 text-xs"
                >
                  <p className="text-[#1C1410] leading-snug">
                    {aiPlanningResponse.assistantMessage}
                  </p>
                  <div className="flex flex-wrap gap-1.5 font-mono text-[10px]">
                    {aiPlanningResponse.extractedPreferences.destination && (
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-900 border border-emerald-200">
                        Dest: {aiPlanningResponse.extractedPreferences.destination.value} [
                        {aiPlanningResponse.extractedPreferences.destination.source}]
                      </span>
                    )}
                    {aiPlanningResponse.extractedPreferences.durationDays && (
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-900 border border-emerald-200">
                        Duration: {aiPlanningResponse.extractedPreferences.durationDays.value}d [
                        {aiPlanningResponse.extractedPreferences.durationDays.source}]
                      </span>
                    )}
                    {aiPlanningResponse.extractedPreferences.budgetAmount && (
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-900 border border-emerald-200">
                        Cap: ₹
                        {aiPlanningResponse.extractedPreferences.budgetAmount.value.toLocaleString()}{' '}
                        [{aiPlanningResponse.extractedPreferences.budgetAmount.source}]
                      </span>
                    )}
                    {aiPlanningResponse.extractedPreferences.morningPreference && (
                      <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200">
                        Mornings:{' '}
                        {aiPlanningResponse.extractedPreferences.morningPreference.value} [
                        {aiPlanningResponse.extractedPreferences.morningPreference.source}]
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 1. Destination Search & Selector */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="font-mono text-xs uppercase tracking-wider text-deep-slate font-semibold block">
                  01 / SEARCH OR SELECT DESTINATION
                </label>
                {locationConfirmed && (
                  <span className="inline-flex items-center gap-1 font-mono text-[10px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                    <CheckCircle2 className="w-3 h-3" />
                    Location Confirmed
                  </span>
                )}
              </div>

              {/* Normalized Location Search Input */}
              <PlacesSearchInput
                initialValue={selectedGeoLocation.name}
                onPlaceSelected={handlePlaceSearchSelect}
                placeholder="Search destination (e.g., Goa, Jaipur, Kerala, Istanbul)..."
              />

              {/* Selected Canonical Location Details Banner */}
              <div
                data-testid="selected-location-summary"
                className="p-3.5 rounded-lg bg-parchment/70 border border-espresso/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-terracotta shrink-0 mt-0.5" />
                  <div>
                    <span className="font-display text-sm font-semibold text-deep-slate block">
                      {selectedGeoLocation.name}
                    </span>
                    <span className="text-[11px] text-stone-gray block">
                      {selectedGeoLocation.formattedAddress}
                    </span>
                  </div>
                </div>
                <div className="font-mono text-[10px] text-espresso sm:text-right space-y-0.5">
                  <span className="block">
                    LAT {selectedGeoLocation.latitude.toFixed(4)}° · LNG{' '}
                    {selectedGeoLocation.longitude.toFixed(4)}°
                  </span>
                  <span className="block text-stone-gray uppercase">
                    REF: {selectedGeoLocation.providerPlaceId || selectedGeoLocation.id}
                  </span>
                </div>
              </div>

              {/* Quick Curated Destination Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                {destinations.map((dest) => {
                  const isSelected =
                    selectedGeoLocation.name.toLowerCase() ===
                    dest.name.toLowerCase();
                  return (
                    <button
                      key={dest.id}
                      type="button"
                      onClick={() => {
                        setSelectedDestinationSlug(dest.slug);
                        setSelectedGeoLocation(
                          DestinationService.getCanonicalLocation(dest)
                        );
                        setLocationConfirmed(true);
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
                03 / TRAVEL PACE & TRANSIT SAFETY BUFFERS
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    id: 'relaxed',
                    title: 'Relaxed Pace',
                    desc: '1-2 key stops/day with 25m transfer safety buffers.',
                  },
                  {
                    id: 'balanced',
                    title: 'Balanced Pace',
                    desc: '2-3 stops/day with 15m transfer safety buffers.',
                  },
                  {
                    id: 'fast-paced',
                    title: 'Deep Exploration',
                    desc: '3-4 stops/day with 10m transfer safety buffers.',
                  },
                ].map((pace) => {
                  const isSelected = selectedPace === pace.id;
                  return (
                    <div
                      key={pace.id}
                      onClick={() =>
                        setSelectedPace(
                          pace.id as 'relaxed' | 'balanced' | 'fast-paced'
                        )
                      }
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
                  <p className="font-mono text-xs text-espresso font-medium">
                    {generationStep}
                  </p>
                </div>
              ) : generatedPassReady ? (
                <div className="p-4 bg-emerald-50 border border-emerald-300 text-center space-y-3">
                  <div className="flex items-center justify-center gap-2 text-emerald-800 font-semibold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>Living Journey Pass Successfully Architected!</span>
                  </div>
                  <p className="text-xs text-stone-gray max-w-md mx-auto">
                    Your itinerary route graph for{' '}
                    <strong>{selectedGeoLocation.name}</strong> has been compiled
                    with verified transfer buffers and proactive alternative routing.
                  </p>
                  <div className="flex flex-wrap justify-center gap-3 pt-1">
                    <Link
                      to={`/journeys/${createdJourneyId}`}
                      className={buttonVariants({
                        variant: 'primary',
                        size: 'sm',
                        className: 'bg-terracotta font-mono text-xs uppercase',
                      })}
                    >
                      Inspect Route & Feasibility Blueprint
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

          {/* RIGHT: Live Synchronized Passport & Spatial Map Preview */}
          <div className="lg:col-span-5 space-y-5">
            <div className="flex items-center justify-between text-xs font-mono text-stone-gray px-1">
              <span>LIVE DOCUMENT & SPATIAL PREVIEW</span>
              <span className="text-terracotta font-semibold">SYNCHRONIZING</span>
            </div>

            <HeroJourneyCard
              destination={selectedGeoLocation.name.toUpperCase()}
              duration={`${durationDays} DAYS`}
              style={selectedStyles.join(' + ').toUpperCase()}
              budget={`₹${estimatedTotalBudget.toLocaleString()}`}
              status={generatedPassReady ? 'ACTIVE & MONITORED' : 'CONFIGURING'}
            />

            {/* Spatial Map Preview using Normalized Coordinates */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-stone-gray px-1">
                <span className="flex items-center gap-1 text-deep-slate font-semibold">
                  <Compass className="w-3.5 h-3.5 text-terracotta" />
                  <span>CANONICAL DESTINATION MAP</span>
                </span>
                <span>{previewMarkers.length} Stops Indexed</span>
              </div>
              <MapView
                center={selectedGeoLocation.coordinate}
                zoom={11}
                markers={previewMarkers}
                showRoutePolyline={previewMarkers.length > 1}
                isDemoData={Boolean(selectedGeoLocation.isDemoFixture)}
                ariaLabel={`Destination map preview for ${selectedGeoLocation.name}`}
                className="w-full h-64 rounded-xl"
              />
            </div>

            <div className="p-4 bg-parchment/60 border border-espresso/15 text-xs text-stone-gray space-y-2">
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-terracotta shrink-0 mt-0.5" />
                <p>
                  <strong className="text-deep-slate font-medium">
                    Deterministic Spatial Guard:
                  </strong>{' '}
                  All transit intervals between activities in{' '}
                  {selectedGeoLocation.name} are validated against route travel
                  times and configured safety buffers.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
