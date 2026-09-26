/**
 * Phase 03 — Deterministic Itinerary Feasibility & Phase 04 Geo-Intelligence Service
 *
 * Implements 100% deterministic, AI-independent spatial and temporal feasibility
 * evaluation for transitions, multi-stop itineraries, candidate insertions,
 * replacement impacts, and candidate route-matrix comparisons.
 */

import type {
  GeoLocation,
  GeoCoordinateInput,
  RoutingProvider,
  TravelModeInput,
  FeasibilityConfig,
  FeasibilityEvaluation,
  FeasibilityReasonCode,
  CandidateInsertionEvaluation,
  ReplacementImpactEvaluation,
  RouteResult,
} from '../types';
import { GeoServiceFactory } from '../providers';
import { env } from '../../../config/env';
import { validateCoordinate, normalizeTravelMode } from '../normalization';
import { mapProviderErrorToDomainError } from '../geo-error';

export const DEFAULT_TRANSFER_BUFFER_MINUTES =
  env.defaultTransferBufferMinutes ?? 15;

export interface TimedItineraryStop {
  id: string;
  title: string;
  startTime: string | Date;
  endTime: string | Date;
  location: GeoLocation | GeoCoordinateInput;
}

export interface MultiStopFeasibilitySummary {
  overallFeasible: boolean;
  totalDistanceMeters: number;
  totalTravelDurationMinutes: number;
  route: RouteResult | null;
  transitions: Array<{
    fromItemId: string;
    fromTitle: string;
    toItemId: string;
    toTitle: string;
    evaluation: FeasibilityEvaluation;
  }>;
  infeasibleDownstreamItemIds: string[];
}

export interface CandidateMatrixComparisonItem {
  candidateId: string;
  candidateName: string;
  targetName: string;
  distanceMeters: number;
  durationSeconds: number;
  durationMinutes: number;
  travelMode: string;
  isDemoData: boolean;
}

function parseTimestampMs(value: string | Date): number {
  if (value instanceof Date) {
    return value.getTime();
  }
  const parsed = Date.parse(value);
  if (!Number.isNaN(parsed)) {
    return parsed;
  }
  // Support HH:mm format on a canonical reference day
  const hmMatch = /^(\d{1,2}):(\d{2})$/.exec((value || '').trim());
  if (hmMatch) {
    const hours = Number.parseInt(hmMatch[1], 10);
    const mins = Number.parseInt(hmMatch[2], 10);
    return Date.UTC(2026, 4, 13, hours, mins, 0);
  }
  return Number.NaN;
}

export class ItineraryFeasibilityService {
  private readonly routingProvider: RoutingProvider;

  constructor(routingProvider?: RoutingProvider) {
    this.routingProvider =
      routingProvider || GeoServiceFactory.getRoutingProvider();
  }

  /**
   * Evaluates whether traveling from `origin` (ending at `originEndTime`) to
   * `destination` (starting at `destinationStartTime`) is feasible with the
   * configured safety buffer.
   */
  async checkFeasibility(
    origin: GeoLocation | GeoCoordinateInput,
    destination: GeoLocation | GeoCoordinateInput,
    originEndTime: Date | string,
    destinationStartTime: Date | string,
    mode: TravelModeInput = 'driving',
    config?: FeasibilityConfig
  ): Promise<FeasibilityEvaluation> {
    const safetyBufferMinutes =
      config?.safetyBufferMinutes ??
      config?.minBufferMinutes ??
      DEFAULT_TRANSFER_BUFFER_MINUTES;

    let normalizedMode: ReturnType<typeof normalizeTravelMode> = 'driving';
    try {
      normalizedMode = normalizeTravelMode(config?.travelMode ?? mode);
    } catch {
      return {
        feasible: false,
        isFeasible: false,
        travelTimeMinutes: 0,
        travelDurationMinutes: 0,
        distanceMeters: 0,
        availableBufferMinutes: 0,
        safetyBufferMinutes,
        requiredTotalMinutes: safetyBufferMinutes,
        deficitMinutes: safetyBufferMinutes,
        bufferDeficitMinutes: safetyBufferMinutes,
        reason: 'UNSUPPORTED_TRAVEL_MODE',
        reasoning: `Unsupported travel mode: ${String(config?.travelMode ?? mode)}`,
        travelMode: 'driving',
        provider: this.routingProvider.providerId,
        isDemoData: this.routingProvider.providerId === 'mock',
      };
    }

    try {
      validateCoordinate(origin);
      validateCoordinate(destination);
    } catch (coordErr) {
      const domainErr = mapProviderErrorToDomainError(coordErr, 'routing');
      return {
        feasible: false,
        isFeasible: false,
        travelTimeMinutes: 0,
        travelDurationMinutes: 0,
        distanceMeters: 0,
        availableBufferMinutes: 0,
        safetyBufferMinutes,
        requiredTotalMinutes: safetyBufferMinutes,
        deficitMinutes: safetyBufferMinutes,
        bufferDeficitMinutes: safetyBufferMinutes,
        reason: 'INVALID_COORDINATES',
        reasoning: domainErr.userMessage,
        travelMode: normalizedMode,
        provider: this.routingProvider.providerId,
        isDemoData: this.routingProvider.providerId === 'mock',
      };
    }

    const startMs = parseTimestampMs(originEndTime);
    const endMs = parseTimestampMs(destinationStartTime);

    if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
      return {
        feasible: false,
        isFeasible: false,
        travelTimeMinutes: 0,
        travelDurationMinutes: 0,
        distanceMeters: 0,
        availableBufferMinutes: 0,
        safetyBufferMinutes,
        requiredTotalMinutes: safetyBufferMinutes,
        deficitMinutes: safetyBufferMinutes,
        bufferDeficitMinutes: safetyBufferMinutes,
        reason: 'INVALID_ITEM_TIME_WINDOW',
        reasoning: 'Invalid start or end timestamp provided for transition.',
        travelMode: normalizedMode,
        provider: this.routingProvider.providerId,
        isDemoData: this.routingProvider.providerId === 'mock',
      };
    }

    const availableBufferMinutes = Math.round((endMs - startMs) / (1000 * 60));

    try {
      const route = await this.routingProvider.getRoute({
        origin,
        destination,
        travelMode: normalizedMode,
        departureTime: new Date(startMs),
      });

      if (route.status !== 'OK') {
        const reason: FeasibilityReasonCode =
          route.status === 'NOT_FOUND' || route.status === 'ZERO_RESULTS'
            ? 'ROUTE_NOT_FOUND'
            : 'ROUTE_UNAVAILABLE';
        return {
          feasible: false,
          isFeasible: false,
          travelTimeMinutes: 0,
          travelDurationMinutes: 0,
          distanceMeters: 0,
          availableBufferMinutes,
          safetyBufferMinutes,
          requiredTotalMinutes: safetyBufferMinutes,
          deficitMinutes: safetyBufferMinutes,
          bufferDeficitMinutes: safetyBufferMinutes,
          reason,
          reasoning:
            route.errorMessage ||
            `Routing failed with status: ${route.status}`,
          travelMode: normalizedMode,
          provider: route.provider,
          isDemoData: route.isDemoData,
        };
      }

      const travelTimeMinutes =
        route.durationSeconds === 0
          ? 0
          : Math.max(1, Math.ceil(route.durationSeconds / 60));
      const requiredTotalMinutes = travelTimeMinutes + safetyBufferMinutes;

      if (availableBufferMinutes < 0) {
        const deficitMinutes = requiredTotalMinutes - availableBufferMinutes;
        return {
          feasible: false,
          isFeasible: false,
          travelTimeMinutes,
          travelDurationMinutes: travelTimeMinutes,
          distanceMeters: route.distanceMeters,
          availableBufferMinutes,
          safetyBufferMinutes,
          requiredTotalMinutes,
          deficitMinutes,
          bufferDeficitMinutes: deficitMinutes,
          reason: 'TEMPORAL_OVERLAP',
          reasoning: `Schedule overlap of ${Math.abs(
            availableBufferMinutes
          )}m plus ${travelTimeMinutes}m travel and ${safetyBufferMinutes}m safety buffer (deficit: ${deficitMinutes}m).`,
          travelMode: normalizedMode,
          provider: route.provider,
          isDemoData: route.isDemoData,
        };
      }

      const feasible = availableBufferMinutes >= requiredTotalMinutes;
      const deficitMinutes = feasible
        ? 0
        : requiredTotalMinutes - availableBufferMinutes;
      const reason: FeasibilityReasonCode = feasible
        ? 'FEASIBLE'
        : 'INSUFFICIENT_TRANSFER_TIME';

      return {
        feasible,
        isFeasible: feasible,
        travelTimeMinutes,
        travelDurationMinutes: travelTimeMinutes,
        distanceMeters: route.distanceMeters,
        availableBufferMinutes,
        safetyBufferMinutes,
        requiredTotalMinutes,
        deficitMinutes,
        bufferDeficitMinutes: deficitMinutes,
        reason,
        reasoning: feasible
          ? `Feasible: ${travelTimeMinutes}m travel + ${safetyBufferMinutes}m safety buffer fits within ${availableBufferMinutes}m available window.`
          : `Insufficient transfer time: requires ${travelTimeMinutes}m travel + ${safetyBufferMinutes}m safety buffer (${requiredTotalMinutes}m total), but only ${availableBufferMinutes}m available (deficit: ${deficitMinutes}m).`,
        travelMode: normalizedMode,
        provider: route.provider,
        isDemoData: route.isDemoData,
      };
    } catch (error) {
      const domainErr = mapProviderErrorToDomainError(error, 'routing');
      const reason: FeasibilityReasonCode =
        domainErr.code === 'ROUTE_NOT_FOUND'
          ? 'ROUTE_NOT_FOUND'
          : domainErr.code === 'INVALID_COORDINATES'
          ? 'INVALID_COORDINATES'
          : domainErr.code === 'UNSUPPORTED_TRAVEL_MODE'
          ? 'UNSUPPORTED_TRAVEL_MODE'
          : 'ROUTE_UNAVAILABLE';

      return {
        feasible: false,
        isFeasible: false,
        travelTimeMinutes: 0,
        travelDurationMinutes: 0,
        distanceMeters: 0,
        availableBufferMinutes,
        safetyBufferMinutes,
        requiredTotalMinutes: safetyBufferMinutes,
        deficitMinutes: safetyBufferMinutes,
        bufferDeficitMinutes: safetyBufferMinutes,
        reason,
        reasoning: domainErr.userMessage,
        travelMode: normalizedMode,
        provider: this.routingProvider.providerId,
        isDemoData: this.routingProvider.providerId === 'mock',
      };
    }
  }

  /**
   * Phase 04 Contract:
   * "Can candidate location X fit between itinerary items A and B?"
   */
  async evaluateCandidateInsertion(params: {
    previousItem: TimedItineraryStop;
    candidateLocation: GeoLocation | GeoCoordinateInput;
    candidateStartTime: string | Date;
    candidateEndTime: string | Date;
    nextItem: TimedItineraryStop;
    travelMode?: TravelModeInput;
    safetyBufferMinutes?: number;
  }): Promise<CandidateInsertionEvaluation> {
    const mode = normalizeTravelMode(params.travelMode ?? 'driving');
    const safetyBuffer =
      params.safetyBufferMinutes ?? DEFAULT_TRANSFER_BUFFER_MINUTES;

    const prevEndMs = parseTimestampMs(params.previousItem.endTime);
    const candStartMs = parseTimestampMs(params.candidateStartTime);
    const candEndMs = parseTimestampMs(params.candidateEndTime);
    const nextStartMs = parseTimestampMs(params.nextItem.startTime);

    const availableWindowMinutes = Math.round(
      (nextStartMs - prevEndMs) / (1000 * 60)
    );
    const candidateDurationMinutes = Math.max(
      0,
      Math.round((candEndMs - candStartMs) / (1000 * 60))
    );

    const leg1Eval = await this.checkFeasibility(
      params.previousItem.location,
      params.candidateLocation,
      new Date(prevEndMs),
      new Date(candStartMs),
      mode,
      { safetyBufferMinutes: safetyBuffer }
    );

    const leg2Eval = await this.checkFeasibility(
      params.candidateLocation,
      params.nextItem.location,
      new Date(candEndMs),
      new Date(nextStartMs),
      mode,
      { safetyBufferMinutes: safetyBuffer }
    );

    // Direct baseline route A -> B to compute additional travel delta
    let directTravelMinutes = 0;
    try {
      const directRoute = await this.routingProvider.getRoute({
        origin: params.previousItem.location,
        destination: params.nextItem.location,
        travelMode: mode,
      });
      if (directRoute.status === 'OK') {
        directTravelMinutes = Math.ceil(directRoute.durationSeconds / 60);
      }
    } catch {
      directTravelMinutes = 0;
    }

    const previousTravelTimeMinutes = leg1Eval.travelTimeMinutes;
    const nextTravelTimeMinutes = leg2Eval.travelTimeMinutes;
    const requiredBufferMinutes = safetyBuffer * 2;
    const totalRequiredMinutes =
      previousTravelTimeMinutes +
      candidateDurationMinutes +
      nextTravelTimeMinutes +
      requiredBufferMinutes;

    const feasible = leg1Eval.feasible && leg2Eval.feasible;
    const deficitMinutes = feasible
      ? 0
      : Math.max(
          leg1Eval.deficitMinutes + leg2Eval.deficitMinutes,
          Math.max(0, totalRequiredMinutes - availableWindowMinutes)
        );

    let conflictReason: FeasibilityReasonCode | null = null;
    if (!feasible) {
      conflictReason = !leg1Eval.feasible ? leg1Eval.reason : leg2Eval.reason;
    }

    const totalAdditionalTravelMinutes =
      previousTravelTimeMinutes + nextTravelTimeMinutes - directTravelMinutes;
    const geographicDistanceMeters =
      leg1Eval.distanceMeters + leg2Eval.distanceMeters;

    return {
      feasible,
      previousTravelTimeMinutes,
      nextTravelTimeMinutes,
      availableWindowMinutes,
      candidateDurationMinutes,
      requiredBufferMinutes,
      totalRequiredMinutes,
      deficitMinutes,
      conflictReason,
      explanation: feasible
        ? `Candidate fits smoothly: ${previousTravelTimeMinutes}m from ${params.previousItem.title} and ${nextTravelTimeMinutes}m to ${params.nextItem.title} with ${safetyBuffer}m safety buffers on both legs.`
        : `Candidate conflicts with window: ${!leg1Eval.feasible ? leg1Eval.reasoning : leg2Eval.reasoning}`,
      totalAdditionalTravelMinutes,
      geographicDistanceMeters,
      previousLegDistanceMeters: leg1Eval.distanceMeters,
      nextLegDistanceMeters: leg2Eval.distanceMeters,
      provider: leg1Eval.provider,
      isDemoData: leg1Eval.isDemoData || leg2Eval.isDemoData,
    };
  }

  /**
   * Phase 04 Contract:
   * "What is the travel impact of replacing B with C?"
   */
  async evaluateReplacementImpact(params: {
    previousItem: TimedItineraryStop;
    originalItem: TimedItineraryStop;
    candidateItem: TimedItineraryStop;
    nextItem: TimedItineraryStop;
    travelMode?: TravelModeInput;
    safetyBufferMinutes?: number;
  }): Promise<ReplacementImpactEvaluation> {
    const originalEval = await this.evaluateCandidateInsertion({
      previousItem: params.previousItem,
      candidateLocation: params.originalItem.location,
      candidateStartTime: params.originalItem.startTime,
      candidateEndTime: params.originalItem.endTime,
      nextItem: params.nextItem,
      travelMode: params.travelMode,
      safetyBufferMinutes: params.safetyBufferMinutes,
    });

    const candidateEval = await this.evaluateCandidateInsertion({
      previousItem: params.previousItem,
      candidateLocation: params.candidateItem.location,
      candidateStartTime: params.candidateItem.startTime,
      candidateEndTime: params.candidateItem.endTime,
      nextItem: params.nextItem,
      travelMode: params.travelMode,
      safetyBufferMinutes: params.safetyBufferMinutes,
    });

    const originalTotalTravelMinutes =
      originalEval.previousTravelTimeMinutes +
      originalEval.nextTravelTimeMinutes;
    const replacementTotalTravelMinutes =
      candidateEval.previousTravelTimeMinutes +
      candidateEval.nextTravelTimeMinutes;

    return {
      originalItemTitle: params.originalItem.title,
      candidateItemTitle: params.candidateItem.title,
      feasible: candidateEval.feasible,
      originalTotalTravelMinutes,
      replacementTotalTravelMinutes,
      travelTimeDeltaMinutes:
        replacementTotalTravelMinutes - originalTotalTravelMinutes,
      originalTotalDistanceMeters: originalEval.geographicDistanceMeters,
      replacementTotalDistanceMeters: candidateEval.geographicDistanceMeters,
      distanceDeltaMeters:
        candidateEval.geographicDistanceMeters -
        originalEval.geographicDistanceMeters,
      conflictReason: candidateEval.conflictReason,
      explanation: candidateEval.explanation,
    };
  }

  /**
   * Evaluates a complete ordered multi-stop itinerary sequence and identifies
   * any infeasible transitions and downstream affected items.
   */
  async evaluateMultiStopItinerary(
    stops: TimedItineraryStop[],
    options?: FeasibilityConfig
  ): Promise<MultiStopFeasibilitySummary> {
    if (stops.length < 2) {
      return {
        overallFeasible: true,
        totalDistanceMeters: 0,
        totalTravelDurationMinutes: 0,
        route: null,
        transitions: [],
        infeasibleDownstreamItemIds: [],
      };
    }

    const mode = normalizeTravelMode(options?.travelMode ?? 'driving');
    const transitions: MultiStopFeasibilitySummary['transitions'] = [];
    const infeasibleDownstreamItemIds: string[] = [];

    for (let i = 0; i < stops.length - 1; i++) {
      const fromStop = stops[i];
      const toStop = stops[i + 1];
      const evaluation = await this.checkFeasibility(
        fromStop.location,
        toStop.location,
        fromStop.endTime,
        toStop.startTime,
        mode,
        options
      );

      transitions.push({
        fromItemId: fromStop.id,
        fromTitle: fromStop.title,
        toItemId: toStop.id,
        toTitle: toStop.title,
        evaluation,
      });

      if (!evaluation.feasible) {
        for (let k = i + 1; k < stops.length; k++) {
          if (!infeasibleDownstreamItemIds.includes(stops[k].id)) {
            infeasibleDownstreamItemIds.push(stops[k].id);
          }
        }
      }
    }

    let multiStopRoute: RouteResult | null = null;
    try {
      multiStopRoute = await this.routingProvider.getRoute({
        origin: stops[0].location,
        destination: stops[stops.length - 1].location,
        waypoints: stops.slice(1, -1).map((s) => s.location),
        travelMode: mode,
      });
    } catch {
      multiStopRoute = null;
    }

    const totalDistanceMeters =
      multiStopRoute?.distanceMeters ??
      transitions.reduce((sum, t) => sum + t.evaluation.distanceMeters, 0);
    const totalTravelDurationMinutes =
      multiStopRoute && multiStopRoute.durationSeconds > 0
        ? Math.ceil(multiStopRoute.durationSeconds / 60)
        : transitions.reduce(
            (sum, t) => sum + t.evaluation.travelTimeMinutes,
            0
          );

    return {
      overallFeasible: transitions.every((t) => t.evaluation.feasible),
      totalDistanceMeters,
      totalTravelDurationMinutes,
      route: multiStopRoute,
      transitions,
      infeasibleDownstreamItemIds,
    };
  }

  /**
   * Route Matrix Use Case:
   * Compares multiple candidate locations against a fixed next itinerary stop.
   */
  async compareCandidatesToNextStop(
    candidates: GeoLocation[],
    nextStop: GeoLocation,
    travelMode: TravelModeInput = 'driving'
  ): Promise<CandidateMatrixComparisonItem[]> {
    if (candidates.length === 0) return [];

    const mode = normalizeTravelMode(travelMode);
    const matrix = await this.routingProvider.getTravelTimeMatrix({
      origins: candidates,
      destinations: [nextStop],
      travelMode: mode,
    });

    return candidates
      .map((candidate, idx) => {
        const cell = matrix.cells[idx]?.[0];
        return {
          candidateId: candidate.id,
          candidateName: candidate.name,
          targetName: nextStop.name,
          distanceMeters: cell?.distanceMeters ?? 0,
          durationSeconds: cell?.durationSeconds ?? 0,
          durationMinutes: cell?.durationMinutes ?? 0,
          travelMode: mode,
          isDemoData: matrix.isDemoData,
        };
      })
      .sort((a, b) => a.durationSeconds - b.durationSeconds);
  }
}
