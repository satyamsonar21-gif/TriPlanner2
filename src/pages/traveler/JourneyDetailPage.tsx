import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Navigation,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Car,
  Footprints,
  Bike,
  Train,
  ShieldCheck,
  Sparkles,
  MapPin,
} from 'lucide-react';
import { MapView } from '@/components/geo';
import {
  JourneyService,
  type JourneyItineraryStop,
} from '@/domains/journeys/journey.service';
import {
  ItineraryFeasibilityService,
  type MultiStopFeasibilitySummary,
  type CandidateMatrixComparisonItem,
  type CandidateInsertionEvaluation,
  type TravelMode,
  formatDistance,
  formatDuration,
} from '@/domains/geo';
import type { TripJourney } from '@/types/database.types';
import { DestinationWeatherWidget } from '@/components/traveler/DestinationWeatherWidget';

export const JourneyDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const journeyId = id || 'jrn_goa_01';

  const [journey, setJourney] = useState<TripJourney | null>(null);
  const [stops, setStops] = useState<JourneyItineraryStop[]>([]);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [travelMode, setTravelMode] = useState<TravelMode>('driving');
  const [safetyBufferMinutes, setSafetyBufferMinutes] = useState<number>(15);
  const [routeSummary, setRouteSummary] =
    useState<MultiStopFeasibilitySummary | null>(null);
  const [matrixComparisons, setMatrixComparisons] = useState<
    CandidateMatrixComparisonItem[]
  >([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>(
    'loc_goa_mandovi_kayak'
  );
  const [candidateEval, setCandidateEval] =
    useState<CandidateInsertionEvaluation | null>(null);
  const [isCalculating, setIsCalculating] = useState<boolean>(true);
  const [routeError, setRouteError] = useState<string | null>(null);

  const feasibilityService = useMemo(
    () => new ItineraryFeasibilityService(),
    []
  );

  useEffect(() => {
    let active = true;
    JourneyService.getById(journeyId).then((found) => {
      if (!active) return;
      const resolved = found || {
        id: journeyId,
        traveler_id: 'usr_traveler_01',
        title: 'Goa Getaway',
        destination_ids: ['dest_goa_01'],
        start_date: '12 May 2026',
        end_date: '16 May 2026',
        duration_days: 5,
        duration_nights: 4,
        travelers_count: 2,
        total_budget: 40000,
        currency: 'INR',
        status: 'active',
        current_location: 'Candolim & Panjim, North Goa',
        passport_reference_code: 'GOA260512<<5D4N<<ADVENTURE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setJourney(resolved);
      const journeyStops = JourneyService.getItineraryStopsForJourney(
        resolved.id
      );
      setStops(journeyStops);
      if (journeyStops.length > 0) {
        setSelectedStopId(journeyStops[0].id);
        setSafetyBufferMinutes(journeyStops[0].safetyBufferMinutes || 15);
      }
    });

    return () => {
      active = false;
    };
  }, [journeyId]);

  // Calculate Multi-Stop Route, Leg Feasibility, and Candidate Matrix whenever stops, mode, or safety buffer change
  useEffect(() => {
    if (stops.length === 0) return;

    let cancelled = false;
    setIsCalculating(true);
    setRouteError(null);

    const runCalculations = async () => {
      try {
        const timedStops = stops.map((s) => ({
          id: s.id,
          title: s.title,
          startTime: s.startTimeIso,
          endTime: s.endTimeIso,
          location: s.location,
        }));

        const summary = await feasibilityService.evaluateMultiStopItinerary(
          timedStops,
          {
            travelMode,
            safetyBufferMinutes,
          }
        );

        const candidates =
          JourneyService.getCandidateLocationsForJourney(journeyId);
        // Compare candidates against Stop 4 (Fontainhas Café) or the last stop
        const targetStop =
          stops[3]?.location || stops[stops.length - 1].location;
        const matrixList =
          await feasibilityService.compareCandidatesToNextStop(
            candidates,
            targetStop,
            travelMode
          );

        // Evaluate candidate insertion between Stop 2 (Fort Aguada) and Stop 4 (Fontainhas Café)
        const prevStop = timedStops[1] || timedStops[0];
        const nextStop = timedStops[3] || timedStops[timedStops.length - 1];
        const activeCandidate =
          candidates.find((c) => c.id === selectedCandidateId) || candidates[0];

        let insertionResult: CandidateInsertionEvaluation | null = null;
        if (prevStop && nextStop && activeCandidate) {
          insertionResult =
            await feasibilityService.evaluateCandidateInsertion({
              previousItem: prevStop,
              candidateLocation: activeCandidate,
              candidateStartTime: '2026-05-13T14:15:00Z',
              candidateEndTime: '2026-05-13T16:00:00Z',
              nextItem: nextStop,
              travelMode,
              safetyBufferMinutes,
            });
        }

        if (!cancelled) {
          setRouteSummary(summary);
          setMatrixComparisons(matrixList);
          setCandidateEval(insertionResult);
        }
      } catch (err) {
        if (!cancelled) {
          setRouteError(
            err instanceof Error
              ? err.message
              : "We couldn't calculate this route right now. Your itinerary has not been changed."
          );
        }
      } finally {
        if (!cancelled) {
          setIsCalculating(false);
        }
      }
    };

    runCalculations();

    return () => {
      cancelled = true;
    };
  }, [stops, travelMode, safetyBufferMinutes, selectedCandidateId, journeyId, feasibilityService]);

  const mapMarkers = useMemo(
    () =>
      stops.map((s, idx) => ({
        id: s.id,
        position: s.location.coordinate,
        title: s.title,
        subtitle: s.location.formattedAddress,
        sequenceNumber: idx + 1,
        status:
          s.status === 'disrupted'
            ? ('disrupted' as const)
            : ('confirmed' as const),
      })),
    [stops]
  );

  const selectedStop = useMemo(
    () => stops.find((s) => s.id === selectedStopId) || stops[0],
    [stops, selectedStopId]
  );

  return (
    <div className="space-y-8 font-body pb-16">
      {/* Top Breadcrumb & Journey Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#33231E]/15">
        <div className="space-y-1">
          <Link
            to="/journeys"
            className="inline-flex items-center gap-1.5 font-mono text-xs text-[#8A7B75] hover:text-terracotta uppercase tracking-wider"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to My Journeys</span>
          </Link>
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#1C1410]">
              {journey?.title || 'Goa Getaway'} — Route & Spatial Blueprint
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#F4E8DC] text-terracotta font-mono text-[10px] font-bold uppercase tracking-wider border border-terracotta/25">
              {journey?.current_location || 'Goa, India'}
            </span>
          </div>
          <p className="text-xs text-[#8A7B75] flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-terracotta" />
              {journey?.start_date} – {journey?.end_date}
            </span>
            <span>•</span>
            <span>{stops.length} Ordered Itinerary Stops</span>
          </p>
        </div>

        {/* Travel Mode & Safety Buffer Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Select travel mode"
            className="inline-flex rounded-lg bg-[#FFF9F3] border border-[#33231E]/20 p-1"
          >
            {(
              [
                { mode: 'driving', label: 'Car', icon: Car },
                { mode: 'walking', label: 'Walk', icon: Footprints },
                { mode: 'bicycling', label: 'Bike', icon: Bike },
                { mode: 'transit', label: 'Transit', icon: Train },
              ] as const
            ).map(({ mode, label, icon: Icon }) => {
              const active = travelMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setTravelMode(mode)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono uppercase transition-colors ${
                    active
                      ? 'bg-terracotta text-white font-semibold'
                      : 'text-[#554742] hover:bg-[#33231E]/5'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FFF9F3] border border-[#33231E]/20 text-xs font-mono">
            <span className="text-[#8A7B75]">SAFETY BUFFER:</span>
            <select
              aria-label="Safety buffer minutes"
              value={safetyBufferMinutes}
              onChange={(e) => setSafetyBufferMinutes(Number(e.target.value))}
              className="bg-transparent font-bold text-terracotta focus:outline-none cursor-pointer"
            >
              <option value={10}>10 min</option>
              <option value={15}>15 min</option>
              <option value={25}>25 min</option>
              <option value={45}>45 min</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#FFF9F3] border border-[#33231E]/15 rounded-xl p-4">
          <span className="font-mono text-[10px] uppercase text-[#8A7B75] block">
            TOTAL ROUTE DISTANCE
          </span>
          <span
            data-testid="total-route-distance"
            className="font-display text-2xl font-bold text-[#1C1410] mt-0.5 block"
          >
            {routeSummary
              ? formatDistance(routeSummary.totalDistanceMeters)
              : '—'}
          </span>
          <span className="text-[10px] font-mono text-[#8A7B75]">
            Across {Math.max(0, stops.length - 1)} Route Legs
          </span>
        </div>

        <div className="bg-[#FFF9F3] border border-[#33231E]/15 rounded-xl p-4">
          <span className="font-mono text-[10px] uppercase text-[#8A7B75] block">
            ESTIMATED TRANSIT TIME
          </span>
          <span
            data-testid="total-route-duration"
            className="font-display text-2xl font-bold text-[#1C1410] mt-0.5 block"
          >
            {routeSummary
              ? formatDuration(routeSummary.totalTravelDurationMinutes * 60)
              : '—'}
          </span>
          <span className="text-[10px] font-mono text-terracotta uppercase">
            Mode: {travelMode}
          </span>
        </div>

        <div className="bg-[#FFF9F3] border border-[#33231E]/15 rounded-xl p-4">
          <span className="font-mono text-[10px] uppercase text-[#8A7B75] block">
            SEQUENCE FEASIBILITY
          </span>
          <div
            data-testid="itinerary-feasibility-status"
            className="flex items-center gap-1.5 mt-1"
          >
            {routeSummary?.overallFeasible ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                <span className="font-display text-lg font-bold text-emerald-800">
                  Feasible
                </span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-5 h-5 text-burnt-clay" />
                <span className="font-display text-lg font-bold text-burnt-clay">
                  Buffer Conflict
                </span>
              </>
            )}
          </div>
          <span className="text-[10px] font-mono text-[#8A7B75] block mt-0.5">
            Min Buffer: {safetyBufferMinutes}m per transfer
          </span>
        </div>

        <div className="bg-[#FFF9F3] border border-[#33231E]/15 rounded-xl p-4">
          <span className="font-mono text-[10px] uppercase text-[#8A7B75] block">
            SELECTED STOP COORDINATES
          </span>
          <span className="font-mono text-sm font-bold text-[#1C1410] mt-1 block">
            {selectedStop
              ? `${selectedStop.location.latitude.toFixed(4)}° N, ${selectedStop.location.longitude.toFixed(4)}° E`
              : '—'}
          </span>
          <span className="text-[10px] font-mono text-[#8A7B75] truncate block mt-0.5">
            {selectedStop?.location.name}
          </span>
        </div>
      </div>

      {/* Main 2-Column Layout: Ordered Itinerary Route Sequence + Interactive Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN (6 cols): Ordered Stops & Leg-by-Leg Route Sequence */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold text-[#1C1410]">
              Ordered Itinerary Route Sequence
            </h2>
            <span className="font-mono text-[10px] uppercase text-[#8A7B75]">
              Click any stop to focus map marker
            </span>
          </div>

          {routeError && (
            <div
              role="alert"
              className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900"
            >
              {routeError}
            </div>
          )}

          <div className="space-y-2">
            {stops.map((stop, index) => {
              const isSelected = stop.id === selectedStopId;
              const transitionAfter = routeSummary?.transitions[index];

              return (
                <React.Fragment key={stop.id}>
                  {/* Stop Card */}
                  <div
                    data-testid={`itinerary-stop-${stop.id}`}
                    onClick={() => setSelectedStopId(stop.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedStopId(stop.id);
                      }
                    }}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#F4E8DC] border-terracotta shadow-xs ring-1 ring-terracotta/30'
                        : 'bg-[#FFF9F3] border-[#33231E]/15 hover:border-[#33231E]/35'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs font-bold shrink-0 mt-0.5 ${
                            stop.status === 'disrupted'
                              ? 'bg-red-700 text-white'
                              : isSelected
                              ? 'bg-[#1C1410] text-white'
                              : 'bg-terracotta text-white'
                          }`}
                        >
                          {index + 1}
                        </span>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-display text-base font-semibold text-[#1C1410]">
                              {stop.title}
                            </h3>
                            {stop.status === 'disrupted' && (
                              <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 font-mono text-[9px] font-bold uppercase">
                                Weather Risk
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#8A7B75] mt-0.5">
                            {stop.subtitle}
                          </p>
                          <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] font-mono text-[#554742]">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3 h-3 text-terracotta" />
                              {stop.displayWindow}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-terracotta" />
                              {stop.location.city || stop.location.region},{' '}
                              {stop.location.country}
                            </span>
                          </div>
                        </div>
                      </div>

                      <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded bg-white/80 border border-[#33231E]/15 text-[#554742]">
                        {stop.location.locationType}
                      </span>
                    </div>

                    {stop.disruptionNote && (
                      <div className="mt-3 p-2.5 rounded-lg bg-red-50/90 border border-red-200 text-[11px] text-red-900 flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-700 shrink-0" />
                        <span>{stop.disruptionNote}</span>
                      </div>
                    )}
                  </div>

                  {/* Connector Leg Between Stop[i] and Stop[i+1] */}
                  {transitionAfter && (
                    <div
                      data-testid={`route-leg-${index}`}
                      className="ml-6 pl-5 py-2 border-l-2 border-dashed border-terracotta/50 flex flex-wrap items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2 font-mono text-[#1C1410]">
                        <Navigation className="w-3.5 h-3.5 text-terracotta" />
                        <span className="font-semibold">
                          ↓{' '}
                          {formatDistance(
                            transitionAfter.evaluation.distanceMeters
                          )}{' '}
                          · {transitionAfter.evaluation.travelTimeMinutes} min
                        </span>
                        <span className="text-[#8A7B75] text-[10px] uppercase">
                          by {transitionAfter.evaluation.travelMode}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 font-mono text-[10px]">
                        <span className="text-[#8A7B75]">
                          Window: {transitionAfter.evaluation.availableBufferMinutes}m
                          (Buffer: {transitionAfter.evaluation.safetyBufferMinutes}m)
                        </span>
                        {transitionAfter.evaluation.feasible ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                            FEASIBLE
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 font-semibold">
                            DEFICIT -{transitionAfter.evaluation.deficitMinutes}m
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN (6 cols): Interactive Route Map & Candidate Route Matrix */}
        <div className="lg:col-span-6 space-y-6 lg:sticky lg:top-24">
          {/* Map Container */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-display text-xl font-semibold text-[#1C1410]">
                Interactive Route Map
              </span>
              <span className="font-mono text-[10px] text-[#8A7B75] uppercase">
                Synchronized with selected stop
              </span>
            </div>

            <MapView
              center={
                selectedStop
                  ? selectedStop.location.coordinate
                  : { lat: 15.5181, lng: 73.7626 }
              }
              zoom={12}
              markers={mapMarkers}
              selectedMarkerId={selectedStopId}
              onSelectMarker={(markerId) => setSelectedStopId(markerId)}
              showRoutePolyline={true}
              loading={isCalculating && !routeSummary}
              ariaLabel={`Route map for ${journey?.title || 'Goa Getaway'}`}
              className="w-full h-80 sm:h-96 rounded-2xl shadow-xs"
            />
          </div>

          {/* Phase 04 Readiness: Candidate Location Route Matrix & Insertion Feasibility */}
          <div className="bg-[#FFF9F3] border border-[#33231E]/20 rounded-2xl p-5 space-y-4 shadow-2xs">
            <div className="flex items-start justify-between gap-2 border-b border-[#33231E]/10 pb-3">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-terracotta font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  LOCATION-AWARE ALTERNATIVE MATRIX (PHASE 04 FOUNDATION)
                </span>
                <h3 className="font-display text-lg font-semibold text-[#1C1410] mt-0.5">
                  Candidate Comparison → {stops[3]?.title || 'Next Stop'}
                </h3>
                <p className="text-xs text-[#8A7B75]">
                  Evaluates whether candidate locations can replace Stop 3 (14:15–16:00) between{' '}
                  <strong>{stops[1]?.title}</strong> and{' '}
                  <strong>{stops[3]?.title}</strong>.
                </p>
              </div>
            </div>

            {/* Matrix Comparison Rows */}
            <div className="space-y-2">
              {matrixComparisons.map((item) => {
                const isSelected = item.candidateId === selectedCandidateId;
                return (
                  <button
                    key={item.candidateId}
                    type="button"
                    onClick={() => setSelectedCandidateId(item.candidateId)}
                    className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-[#F4E8DC] border-terracotta ring-1 ring-terracotta/30'
                        : 'bg-soft-ivory border-[#33231E]/15 hover:border-[#33231E]/30'
                    }`}
                  >
                    <div>
                      <span className="font-display text-sm font-semibold text-[#1C1410] block">
                        {item.candidateName}
                      </span>
                      <span className="font-mono text-[10px] text-[#8A7B75]">
                        To {item.targetName}: {formatDistance(item.distanceMeters)}
                      </span>
                    </div>
                    <div className="text-right font-mono">
                      <span className="text-xs font-bold text-terracotta block">
                        {item.durationMinutes} min
                      </span>
                      <span className="text-[9px] text-[#8A7B75] uppercase">
                        by {item.travelMode}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Candidate Insertion Feasibility Result */}
            {candidateEval && (
              <div
                data-testid="candidate-feasibility-card"
                className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                  candidateEval.feasible
                    ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
                    : 'bg-amber-50 border-amber-300 text-amber-950'
                }`}
              >
                <div className="flex items-center justify-between font-mono text-[10px] uppercase font-bold">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Insertion Feasibility Check
                  </span>
                  <span>
                    {candidateEval.feasible
                      ? 'FEASIBLE FIT'
                      : candidateEval.conflictReason}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  {candidateEval.explanation}
                </p>
                <div className="pt-1 flex flex-wrap gap-3 font-mono text-[10px] opacity-85">
                  <span>
                    Prev Leg: {candidateEval.previousTravelTimeMinutes}m
                  </span>
                  <span>•</span>
                  <span>Next Leg: {candidateEval.nextTravelTimeMinutes}m</span>
                  <span>•</span>
                  <span>
                    Total Distance:{' '}
                    {formatDistance(candidateEval.geographicDistanceMeters)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Real-Time Destination Environmental Telemetry & Itinerary Advisory */}
      {journey && (
        <div className="pt-6 border-t border-[#33231E]/10">
          <DestinationWeatherWidget
            initialDestinationId={journey.destination_ids?.[0] || 'dest_goa_01'}
          />
        </div>
      )}
    </div>
  );
};
