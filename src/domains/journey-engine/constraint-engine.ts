import {
  ItineraryFeasibilityService,
  type TravelMode,
  validateCoordinate,
} from '@/domains/geo';
import { DependencyGraph } from './dependency-graph';
import type {
  CandidateActivity,
  ConstraintEvaluationResult,
  ConstraintViolation,
  JourneySnapshot,
  JourneySnapshotItem,
} from './types';

/**
 * Deterministic haversine distance in meters between two lat/lng points
 * for synchronous constraint checks when async route providers are not awaited.
 */
export function computeDeterministicDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  // Multiply by 1.28 road-winding factor to match Phase 03 deterministic routing
  return Math.round(R * c * 1.28);
}

/**
 * Deterministic travel duration in minutes given distance and mode.
 */
export function computeDeterministicTravelMinutes(
  distanceMeters: number,
  mode: TravelMode = 'driving'
): number {
  if (distanceMeters <= 50) return 2;
  const speedsKmh: Record<TravelMode, number> = {
    driving: 34,
    transit: 26,
    bicycling: 15,
    walking: 4.8,
  };
  const speedMetersPerMin = ((speedsKmh[mode] || 34) * 1000) / 60;
  return Math.max(3, Math.round(distanceMeters / speedMetersPerMin));
}

/**
 * Converts an ISO timestamp or HH:mm string into minutes from midnight UTC.
 */
export function parseMinutesOfDay(isoOrTime: string): number {
  if (/^\d{2}:\d{2}$/.test(isoOrTime)) {
    const [h, m] = isoOrTime.split(':').map(Number);
    return h * 60 + m;
  }
  const d = new Date(isoOrTime);
  if (isNaN(d.getTime())) return 0;
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

/**
 * Deterministic Constraint Engine for Phase 04 Living Journey Engine™.
 * Evaluates all 11 constraint categories across a JourneySnapshot or candidate replacement.
 */
export class ConstraintEngine {
  private feasibilityService: ItineraryFeasibilityService;

  constructor(feasibilityService?: ItineraryFeasibilityService) {
    this.feasibilityService =
      feasibilityService || new ItineraryFeasibilityService();
  }

  /**
   * Synchronously evaluates all constraints on a JourneySnapshot.
   */
  public evaluateSnapshot(
    snapshot: JourneySnapshot,
    previousSnapshot?: JourneySnapshot
  ): ConstraintEvaluationResult {
    const violations: ConstraintViolation[] = [];

    // 1. Structural & Dependency Graph Constraints
    const graph = DependencyGraph.fromSnapshot(snapshot);
    const structuralIssues = graph.validateStructuralIssues();

    structuralIssues.forEach((issue) => {
      violations.push({
        category: 'DEPENDENCY',
        code: issue.code,
        severity: 'CRITICAL',
        isHardConstraint: true,
        itemId: issue.fromItemId,
        relatedItemId: issue.toItemId,
        explanation: issue.message,
      });
    });

    // 2. Per-item temporal, spatial, capacity, and booking state constraints
    const activeItems = snapshot.items.filter((i) => i.status !== 'cancelled');

    snapshot.items.forEach((item) => {
      // 2a. Valid time window check (startTime < endTime)
      const startMs = new Date(item.startTimeIso).getTime();
      const endMs = new Date(item.endTimeIso).getTime();
      if (isNaN(startMs) || isNaN(endMs) || endMs <= startMs) {
        violations.push({
          category: 'TEMPORAL',
          code: 'INVALID_TIME_WINDOW',
          severity: 'CRITICAL',
          isHardConstraint: true,
          itemId: item.id,
          itemTitle: item.title,
          explanation: `Item "${item.title}" has an invalid time range (${item.startTimeIso} to ${item.endTimeIso}): end time must be strictly after start time.`,
        });
      }

      // 2b. Coordinate validity check (null-safe)
      try {
        if (
          !item.location ||
          typeof item.location.latitude !== 'number' ||
          typeof item.location.longitude !== 'number'
        ) {
          throw new Error('Missing or non-numeric latitude/longitude');
        }
        validateCoordinate({
          latitude: item.location.latitude,
          longitude: item.location.longitude,
        });
      } catch (err) {
        violations.push({
          category: 'SPATIAL',
          code: 'INVALID_COORDINATES',
          severity: 'HIGH',
          isHardConstraint: true,
          itemId: item.id,
          itemTitle: item.title,
          explanation: `Item "${item.title}" has invalid geographic coordinates: ${
            err instanceof Error ? err.message : 'invalid range'
          }.`,
        });
      }

      // 2b-ii. Negative or NaN cost check
      if (typeof item.price !== 'number' || isNaN(item.price) || item.price < 0) {
        violations.push({
          category: 'BUDGET',
          code: 'INVALID_NEGATIVE_COST',
          severity: 'CRITICAL',
          isHardConstraint: true,
          itemId: item.id,
          itemTitle: item.title,
          explanation: `Item "${item.title}" has an invalid or negative price (${item.price}).`,
        });
      }

      // 2c. Disrupted or cancelled active dependency root check
      if (item.status === 'disrupted') {
        violations.push({
          category: 'AVAILABILITY',
          code: 'ITEM_DISRUPTED',
          severity: 'CRITICAL',
          isHardConstraint: true,
          itemId: item.id,
          itemTitle: item.title,
          explanation: `Item "${item.title}" is currently disrupted (${
            item.disruptionNote || 'unavailable'
          }) and requires replacement or rescheduling.`,
        });
      }

      // 2d. Opening hours check if configured
      if (
        item.status !== 'cancelled' &&
        item.openingTimeLocal &&
        item.closingTimeLocal
      ) {
        const startMins = parseMinutesOfDay(item.startTimeIso);
        const endMins = parseMinutesOfDay(item.endTimeIso);
        const openMins = parseMinutesOfDay(item.openingTimeLocal);
        const closeMins = parseMinutesOfDay(item.closingTimeLocal);

        if (startMins < openMins || endMins > closeMins) {
          violations.push({
            category: 'TEMPORAL',
            code: 'OUTSIDE_OPENING_HOURS',
            severity: 'HIGH',
            isHardConstraint: true,
            itemId: item.id,
            itemTitle: item.title,
            explanation: `Item "${item.title}" (${item.displayWindow}) falls outside operating hours (${item.openingTimeLocal}–${item.closingTimeLocal}).`,
          });
        }
      }

      // 2e. Capacity check
      const requiredParty = item.partySize || snapshot.travelersCount;
      if (
        item.maxCapacity !== undefined &&
        requiredParty > item.maxCapacity
      ) {
        violations.push({
          category: 'CAPACITY',
          code: 'INSUFFICIENT_CAPACITY',
          severity: 'HIGH',
          isHardConstraint: true,
          itemId: item.id,
          itemTitle: item.title,
          explanation: `Item "${item.title}" supports max capacity ${item.maxCapacity}, which is insufficient for ${requiredParty} travelers.`,
        });
      }
    });

    // 3. Locked / Non-Refundable / Completed Booking State Protection when comparing against previousSnapshot
    if (previousSnapshot) {
      previousSnapshot.items.forEach((prevItem) => {
        const nextItem = snapshot.items.find((i) => i.id === prevItem.id);
        const wasMutated =
          !nextItem ||
          nextItem.status === 'cancelled' ||
          nextItem.title !== prevItem.title ||
          nextItem.startTimeIso !== prevItem.startTimeIso ||
          nextItem.endTimeIso !== prevItem.endTimeIso;

        if (prevItem.bookingState === 'COMPLETED' && wasMutated) {
          violations.push({
            category: 'BOOKING_STATE',
            code: 'COMPLETED_BOOKING_IMMUTABLE',
            severity: 'CRITICAL',
            isHardConstraint: true,
            itemId: prevItem.id,
            itemTitle: prevItem.title,
            explanation: `Cannot modify or replace already completed booking "${prevItem.title}".`,
          });
        } else if (
          (prevItem.isLocked || prevItem.bookingState === 'NON_REFUNDABLE') &&
          wasMutated
        ) {
          violations.push({
            category: 'BOOKING_STATE',
            code: 'LOCKED_BOOKING_MUTATION',
            severity: 'CRITICAL',
            isHardConstraint: true,
            itemId: prevItem.id,
            itemTitle: prevItem.title,
            explanation: `Cannot modify or cancel locked/non-refundable booking "${prevItem.title}".`,
          });
        }
      });
    }

    // 4. Sequential Same-Day Temporal Overlap & Spatial Transfer Buffer Checks
    const itemsByDay = new Map<number, JourneySnapshotItem[]>();
    activeItems.forEach((item) => {
      const list = itemsByDay.get(item.dayNumber) || [];
      list.push(item);
      itemsByDay.set(item.dayNumber, list);
    });

    itemsByDay.forEach((dayItems) => {
      const sorted = [...dayItems].sort(
        (a, b) => a.sequenceOrder - b.sequenceOrder
      );

      for (let i = 0; i < sorted.length - 1; i++) {
        const current = sorted[i];
        const next = sorted[i + 1];

        const currentEndMs = new Date(current.endTimeIso).getTime();
        const nextStartMs = new Date(next.startTimeIso).getTime();
        if (isNaN(currentEndMs) || isNaN(nextStartMs)) continue;
        if (!current.location || !next.location) continue;

        const gapMinutes = Math.round(
          (nextStartMs - currentEndMs) / (1000 * 60)
        );

        const distanceMeters = computeDeterministicDistanceMeters(
          current.location.latitude,
          current.location.longitude,
          next.location.latitude,
          next.location.longitude
        );
        const travelMinutes = computeDeterministicTravelMinutes(
          distanceMeters,
          current.travelModeToNext || 'driving'
        );

        const edge = graph.getEdge(current.id, next.id);
        const safetyBuffer =
          edge?.minBufferMinutes ?? current.safetyBufferMinutes ?? 15;
        const requiredGapMinutes = travelMinutes + safetyBuffer;

        if (gapMinutes < 0) {
          violations.push({
            category: 'TEMPORAL',
            code: 'ITEM_TIME_OVERLAP',
            severity: 'CRITICAL',
            isHardConstraint: true,
            itemId: next.id,
            itemTitle: next.title,
            relatedItemId: current.id,
            relatedItemTitle: current.title,
            deficitMinutes: Math.abs(gapMinutes),
            explanation: `Temporal overlap: "${next.title}" starts ${Math.abs(
              gapMinutes
            )} minutes before "${current.title}" ends.`,
          });
        } else if (gapMinutes < travelMinutes) {
          const deficit = travelMinutes - gapMinutes;
          violations.push({
            category: 'SPATIAL',
            code: 'IMPOSSIBLE_TRAVEL_TRANSITION',
            severity: 'CRITICAL',
            isHardConstraint: true,
            itemId: next.id,
            itemTitle: next.title,
            relatedItemId: current.id,
            relatedItemTitle: current.title,
            deficitMinutes: deficit,
            explanation: `Spatial conflict: Travel from "${current.title}" to "${next.title}" requires ${travelMinutes} min (${(
              distanceMeters / 1000
            ).toFixed(1)} km), but only ${gapMinutes} min is available.`,
          });
        } else if (gapMinutes < requiredGapMinutes) {
          const deficit = requiredGapMinutes - gapMinutes;
          violations.push({
            category: 'TRANSFER_BUFFER',
            code: 'INSUFFICIENT_TRANSFER_BUFFER',
            severity: deficit >= 25 ? 'HIGH' : 'MEDIUM',
            isHardConstraint: true,
            itemId: next.id,
            itemTitle: next.title,
            relatedItemId: current.id,
            relatedItemTitle: current.title,
            deficitMinutes: deficit,
            explanation: `Transfer buffer breach between "${current.title}" and "${next.title}": requires ${travelMinutes}m transit + ${safetyBuffer}m buffer (${requiredGapMinutes}m total), but only ${gapMinutes}m is available (-${deficit}m deficit).`,
          });
        }
      }
    });

    // 5. Explicit Dependency Edge Constraint Checks
    snapshot.dependencies.forEach((edge) => {
      const fromItem = snapshot.items.find((i) => i.id === edge.fromItemId);
      const toItem = snapshot.items.find((i) => i.id === edge.toItemId);

      if (!fromItem || !toItem) return;

      if (
        (fromItem.status === 'cancelled' || fromItem.status === 'disrupted') &&
        toItem.status !== 'cancelled'
      ) {
        violations.push({
          category: 'DEPENDENCY',
          code: 'UPSTREAM_PREREQUISITE_BROKEN',
          severity: edge.isHardConstraint ? 'CRITICAL' : 'MEDIUM',
          isHardConstraint: edge.isHardConstraint,
          itemId: toItem.id,
          itemTitle: toItem.title,
          relatedItemId: fromItem.id,
          relatedItemTitle: fromItem.title,
          explanation: `Dependent item "${toItem.title}" requires "${fromItem.title}" (${edge.type}), which is currently ${fromItem.status}.`,
        });
      }

      if (edge.type === 'REQUIRES_CHECKIN_AT') {
        const checkinEnd = new Date(fromItem.endTimeIso).getTime();
        const actStart = new Date(toItem.startTimeIso).getTime();
        if (actStart < checkinEnd) {
          violations.push({
            category: 'SEQUENCE',
            code: 'CHECKIN_SEQUENCE_VIOLATION',
            severity: 'HIGH',
            isHardConstraint: true,
            itemId: toItem.id,
            itemTitle: toItem.title,
            relatedItemId: fromItem.id,
            relatedItemTitle: fromItem.title,
            explanation: `"${toItem.title}" is scheduled before hotel check-in at "${fromItem.title}" completes.`,
          });
        }
      }

      if (edge.type === 'REQUIRES_CHECKOUT_BEFORE') {
        const checkoutEnd = new Date(fromItem.endTimeIso).getTime();
        const departStart = new Date(toItem.startTimeIso).getTime();
        if (departStart < checkoutEnd) {
          violations.push({
            category: 'SEQUENCE',
            code: 'CHECKOUT_SEQUENCE_VIOLATION',
            severity: 'CRITICAL',
            isHardConstraint: true,
            itemId: toItem.id,
            itemTitle: toItem.title,
            relatedItemId: fromItem.id,
            relatedItemTitle: fromItem.title,
            explanation: `Departure "${toItem.title}" is scheduled before hotel check-out at "${fromItem.title}" completes.`,
          });
        }
      }
    });

    // 6. Budget Constraint Evaluation (Hard vs Soft)
    const computedCost = snapshot.allocatedCost;
    if (typeof computedCost !== 'number' || isNaN(computedCost) || computedCost < 0) {
      violations.push({
        category: 'BUDGET',
        code: 'INVALID_NEGATIVE_COST',
        severity: 'CRITICAL',
        isHardConstraint: true,
        explanation: `Journey allocated cost (${computedCost}) cannot be negative or NaN.`,
      });
    } else if (snapshot.totalBudget > 0 && computedCost > snapshot.totalBudget) {
      const excess = computedCost - snapshot.totalBudget;
      const softLimit =
        snapshot.totalBudget * (1 + snapshot.softBudgetTolerancePct / 100);

      if (snapshot.hardBudgetConstraint || computedCost > softLimit) {
        violations.push({
          category: 'BUDGET',
          code: 'HARD_BUDGET_EXCEEDED',
          severity: 'HIGH',
          isHardConstraint: true,
          excessCostAmount: excess,
          explanation: `Allocated journey cost (${snapshot.currency} ${computedCost.toLocaleString()}) exceeds hard budget limit (${snapshot.currency} ${snapshot.totalBudget.toLocaleString()}) by ${snapshot.currency} ${excess.toLocaleString()}.`,
        });
      } else {
        violations.push({
          category: 'BUDGET',
          code: 'SOFT_BUDGET_WARNING',
          severity: 'LOW',
          isHardConstraint: false,
          excessCostAmount: excess,
          explanation: `Allocated journey cost (${snapshot.currency} ${computedCost.toLocaleString()}) is slightly above target budget (${snapshot.currency} ${snapshot.totalBudget.toLocaleString()}) within the ${snapshot.softBudgetTolerancePct}% soft tolerance.`,
        });
      }
    }

    const hardViolations = violations.filter((v) => v.isHardConstraint);
    const softViolations = violations.filter((v) => !v.isHardConstraint);

    return {
      valid: hardViolations.length === 0,
      hardViolations,
      softViolations,
      allViolations: violations,
    };
  }

  /**
   * Evaluates whether a specific CandidateActivity can validly replace `disruptedItem`
   * inside `snapshot` at `[proposedStartIso, proposedEndIso]`.
   * Rejects candidates that are UNAVAILABLE, UNKNOWN/STALE/EXPIRED/null availability,
   * under-capacity, outside opening hours, over hard budget, negative cost, zero duration,
   * or impossible to reach in time.
   */
  public evaluateCandidateReplacement(params: {
    snapshot: JourneySnapshot;
    disruptedItem: JourneySnapshotItem;
    candidate: CandidateActivity;
    proposedStartIso: string;
    proposedEndIso: string;
    allowDownstreamReschedule?: boolean;
  }): {
    valid: boolean;
    violations: ConstraintViolation[];
    distanceFromPrevMeters: number;
    travelTimeFromPrevMinutes: number;
    distanceToNextMeters: number;
    travelTimeToNextMinutes: number;
    requiredNextStopShiftMinutes: number;
  } {
    const {
      snapshot,
      disruptedItem,
      candidate,
      proposedStartIso,
      proposedEndIso,
      allowDownstreamReschedule = true,
    } = params;

    const violations: ConstraintViolation[] = [];

    // 0. Disrupted Item Booking State Check (Completed or Locked items cannot be replaced)
    if (disruptedItem.bookingState === 'COMPLETED') {
      violations.push({
        category: 'BOOKING_STATE',
        code: 'COMPLETED_BOOKING_IMMUTABLE',
        severity: 'CRITICAL',
        isHardConstraint: true,
        itemId: disruptedItem.id,
        itemTitle: disruptedItem.title,
        explanation: `Cannot replace "${disruptedItem.title}" because its booking is already COMPLETED.`,
      });
    } else if (
      disruptedItem.isLocked ||
      disruptedItem.bookingState === 'NON_REFUNDABLE'
    ) {
      violations.push({
        category: 'BOOKING_STATE',
        code: 'LOCKED_BOOKING_MUTATION',
        severity: 'CRITICAL',
        isHardConstraint: true,
        itemId: disruptedItem.id,
        itemTitle: disruptedItem.title,
        explanation: `Cannot replace locked/non-refundable booking "${disruptedItem.title}".`,
      });
    }

    // 1. Availability Check (UNKNOWN, STALE, EXPIRED, NULL are NEVER treated as AVAILABLE)
    if (!candidate.availabilityStatus || candidate.availabilityStatus === 'UNKNOWN') {
      violations.push({
        category: 'AVAILABILITY',
        code: 'CANDIDATE_AVAILABILITY_UNKNOWN',
        severity: 'HIGH',
        isHardConstraint: true,
        itemId: candidate.id,
        itemTitle: candidate.title,
        explanation: `Candidate "${candidate.title}" has UNKNOWN or missing availability and cannot be verified for immediate confirmation.`,
      });
    } else if (candidate.availabilityStatus === 'UNAVAILABLE') {
      violations.push({
        category: 'AVAILABILITY',
        code: 'CANDIDATE_UNAVAILABLE',
        severity: 'CRITICAL',
        isHardConstraint: true,
        itemId: candidate.id,
        itemTitle: candidate.title,
        explanation: `Candidate "${candidate.title}" is currently UNAVAILABLE.`,
      });
    } else if (
      candidate.availabilityStatus === 'STALE' ||
      candidate.availabilityStatus === 'EXPIRED'
    ) {
      violations.push({
        category: 'AVAILABILITY',
        code: 'CANDIDATE_AVAILABILITY_STALE',
        severity: 'HIGH',
        isHardConstraint: true,
        itemId: candidate.id,
        itemTitle: candidate.title,
        explanation: `Candidate "${candidate.title}" has ${candidate.availabilityStatus} availability telemetry and cannot be safely booked.`,
      });
    }

    // 1b. Candidate Duration, Price, Currency, Destination, & Coordinate Sanity Checks
    if (
      typeof candidate.durationMinutes !== 'number' ||
      isNaN(candidate.durationMinutes) ||
      candidate.durationMinutes <= 0
    ) {
      violations.push({
        category: 'TEMPORAL',
        code: 'INVALID_DURATION',
        severity: 'CRITICAL',
        isHardConstraint: true,
        itemId: candidate.id,
        itemTitle: candidate.title,
        explanation: `Candidate "${candidate.title}" has an invalid or non-positive duration (${candidate.durationMinutes} min).`,
      });
    }

    if (
      typeof candidate.priceAmount !== 'number' ||
      isNaN(candidate.priceAmount) ||
      candidate.priceAmount < 0
    ) {
      violations.push({
        category: 'BUDGET',
        code: 'INVALID_NEGATIVE_COST',
        severity: 'CRITICAL',
        isHardConstraint: true,
        itemId: candidate.id,
        itemTitle: candidate.title,
        explanation: `Candidate "${candidate.title}" has a negative or invalid price (${candidate.priceAmount}).`,
      });
    }

    if (
      candidate.currency &&
      snapshot.currency &&
      candidate.currency !== snapshot.currency
    ) {
      violations.push({
        category: 'BUDGET',
        code: 'CURRENCY_MISMATCH',
        severity: 'HIGH',
        isHardConstraint: true,
        itemId: candidate.id,
        itemTitle: candidate.title,
        explanation: `Candidate currency (${candidate.currency}) does not match journey currency (${snapshot.currency}).`,
      });
    }

    if (
      candidate.destinationId &&
      snapshot.destinationId &&
      candidate.destinationId !== snapshot.destinationId
    ) {
      violations.push({
        category: 'SPATIAL',
        code: 'DESTINATION_MISMATCH',
        severity: 'HIGH',
        isHardConstraint: true,
        itemId: candidate.id,
        itemTitle: candidate.title,
        explanation: `Candidate destination (${candidate.destinationId}) does not match journey destination (${snapshot.destinationId}).`,
      });
    }

    let candidateCoordsValid = true;
    try {
      if (
        !candidate.location ||
        typeof candidate.location.latitude !== 'number' ||
        typeof candidate.location.longitude !== 'number'
      ) {
        throw new Error('Missing or non-numeric candidate coordinates');
      }
      validateCoordinate({
        latitude: candidate.location.latitude,
        longitude: candidate.location.longitude,
      });
    } catch (err) {
      candidateCoordsValid = false;
      violations.push({
        category: 'SPATIAL',
        code: 'INVALID_COORDINATES',
        severity: 'CRITICAL',
        isHardConstraint: true,
        itemId: candidate.id,
        itemTitle: candidate.title,
        explanation: `Candidate "${candidate.title}" has invalid coordinates: ${
          err instanceof Error ? err.message : 'invalid range'
        }.`,
      });
    }

    // 2. Capacity Check
    const requiredTravelers =
      disruptedItem.partySize || snapshot.travelersCount || 2;
    if (
      candidate.remainingCapacity < requiredTravelers ||
      candidate.maxCapacity < requiredTravelers
    ) {
      violations.push({
        category: 'CAPACITY',
        code: 'INSUFFICIENT_CAPACITY',
        severity: 'HIGH',
        isHardConstraint: true,
        itemId: candidate.id,
        itemTitle: candidate.title,
        explanation: `Candidate "${candidate.title}" only has ${candidate.remainingCapacity} remaining spots (requires ${requiredTravelers} travelers).`,
      });
    }

    // 3. Time Window Validity & Opening Hours Check
    const startMs = new Date(proposedStartIso).getTime();
    const endMs = new Date(proposedEndIso).getTime();
    if (isNaN(startMs) || isNaN(endMs) || endMs <= startMs) {
      violations.push({
        category: 'TEMPORAL',
        code: 'INVALID_TIME_WINDOW',
        severity: 'CRITICAL',
        isHardConstraint: true,
        itemId: candidate.id,
        itemTitle: candidate.title,
        explanation: `Candidate "${candidate.title}" proposed window (${proposedStartIso} – ${proposedEndIso}) is invalid.`,
      });
    } else {
      const startMins = parseMinutesOfDay(proposedStartIso);
      const endMins = parseMinutesOfDay(proposedEndIso);
      const openMins = parseMinutesOfDay(candidate.openingTimeLocal);
      const closeMins = parseMinutesOfDay(candidate.closingTimeLocal);

      if (startMins < openMins || endMins > closeMins) {
        violations.push({
          category: 'TEMPORAL',
          code: 'OUTSIDE_OPENING_HOURS',
          severity: 'HIGH',
          isHardConstraint: true,
          itemId: candidate.id,
          itemTitle: candidate.title,
          explanation: `Candidate "${candidate.title}" operating hours (${candidate.openingTimeLocal}–${candidate.closingTimeLocal}) do not cover the proposed window.`,
        });
      }

      if (candidate.availableWindowStartIso && candidate.availableWindowEndIso) {
        const availStart = new Date(candidate.availableWindowStartIso).getTime();
        const availEnd = new Date(candidate.availableWindowEndIso).getTime();
        if (startMs < availStart || endMs > availEnd) {
          violations.push({
            category: 'AVAILABILITY',
            code: 'OUTSIDE_AVAILABILITY_WINDOW',
            severity: 'HIGH',
            isHardConstraint: true,
            itemId: candidate.id,
            itemTitle: candidate.title,
            explanation: `Candidate "${candidate.title}" slot is outside its available inventory window.`,
          });
        }
      }
    }

    // 4. Budget Check
    const priceDelta = candidate.priceAmount - disruptedItem.price;
    const projectedCost = snapshot.allocatedCost + priceDelta;
    if (
      snapshot.totalBudget > 0 &&
      projectedCost > snapshot.totalBudget &&
      snapshot.hardBudgetConstraint
    ) {
      const excess = projectedCost - snapshot.totalBudget;
      violations.push({
        category: 'BUDGET',
        code: 'HARD_BUDGET_EXCEEDED',
        severity: 'HIGH',
        isHardConstraint: true,
        itemId: candidate.id,
        itemTitle: candidate.title,
        excessCostAmount: excess,
        explanation: `Selecting "${candidate.title}" (${snapshot.currency} ${candidate.priceAmount.toLocaleString()}) increases total cost to ${snapshot.currency} ${projectedCost.toLocaleString()}, exceeding hard budget of ${snapshot.currency} ${snapshot.totalBudget.toLocaleString()}.`,
      });
    }

    // 5. Spatial & Transfer Buffer Evaluation against Preceding and Succeeding Day Items
    const sameDayItems = snapshot.items
      .filter(
        (i) =>
          i.dayNumber === disruptedItem.dayNumber && i.status !== 'cancelled'
      )
      .sort((a, b) => a.sequenceOrder - b.sequenceOrder);

    const disruptedIdx = sameDayItems.findIndex(
      (i) => i.id === disruptedItem.id
    );
    const prevItem =
      disruptedIdx > 0 ? sameDayItems[disruptedIdx - 1] : undefined;
    const nextItem =
      disruptedIdx >= 0 && disruptedIdx < sameDayItems.length - 1
        ? sameDayItems[disruptedIdx + 1]
        : undefined;

    let distanceFromPrevMeters = 0;
    let travelTimeFromPrevMinutes = 0;
    let distanceToNextMeters = 0;
    let travelTimeToNextMinutes = 0;
    let requiredNextStopShiftMinutes = 0;

    if (prevItem && candidateCoordsValid && prevItem.location) {
      distanceFromPrevMeters = computeDeterministicDistanceMeters(
        prevItem.location.latitude,
        prevItem.location.longitude,
        candidate.location.latitude,
        candidate.location.longitude
      );
      travelTimeFromPrevMinutes = computeDeterministicTravelMinutes(
        distanceFromPrevMeters,
        prevItem.travelModeToNext || 'driving'
      );

      const prevEndMs = new Date(prevItem.endTimeIso).getTime();
      const gapFromPrev = Math.round((startMs - prevEndMs) / (1000 * 60));
      const requiredFromPrev =
        travelTimeFromPrevMinutes + (prevItem.safetyBufferMinutes || 15);

      if (gapFromPrev < requiredFromPrev) {
        violations.push({
          category: 'TRANSFER_BUFFER',
          code: 'PREVIOUS_LEG_BUFFER_DEFICIT',
          severity: 'HIGH',
          isHardConstraint: true,
          itemId: candidate.id,
          itemTitle: candidate.title,
          relatedItemId: prevItem.id,
          relatedItemTitle: prevItem.title,
          deficitMinutes: requiredFromPrev - gapFromPrev,
          explanation: `Cannot reach "${candidate.title}" from "${prevItem.title}" in time: requires ${requiredFromPrev}m (${travelTimeFromPrevMinutes}m transit + buffer), only ${gapFromPrev}m available.`,
        });
      }
    }

    if (nextItem && candidateCoordsValid && nextItem.location) {
      distanceToNextMeters = computeDeterministicDistanceMeters(
        candidate.location.latitude,
        candidate.location.longitude,
        nextItem.location.latitude,
        nextItem.location.longitude
      );
      travelTimeToNextMinutes = computeDeterministicTravelMinutes(
        distanceToNextMeters,
        disruptedItem.travelModeToNext || 'driving'
      );

      const nextStartMs = new Date(nextItem.startTimeIso).getTime();
      const gapToNext = Math.round((nextStartMs - endMs) / (1000 * 60));
      const safetyBuffer = disruptedItem.safetyBufferMinutes || 15;
      const requiredToNext = travelTimeToNextMinutes + safetyBuffer;

      if (gapToNext < requiredToNext) {
        const deficit = requiredToNext - gapToNext;
        // Check if nextItem can be smoothly shifted within the day without breaking locked items
        if (
          allowDownstreamReschedule &&
          !nextItem.isLocked &&
          nextItem.bookingState !== 'NON_REFUNDABLE' &&
          nextItem.bookingState !== 'COMPLETED'
        ) {
          requiredNextStopShiftMinutes = Math.ceil(deficit / 15) * 15;
        } else {
          violations.push({
            category: 'TRANSFER_BUFFER',
            code: 'NEXT_LEG_BUFFER_DEFICIT',
            severity: 'HIGH',
            isHardConstraint: true,
            itemId: candidate.id,
            itemTitle: candidate.title,
            relatedItemId: nextItem.id,
            relatedItemTitle: nextItem.title,
            deficitMinutes: deficit,
            explanation: `Cannot reach locked stop "${nextItem.title}" from "${candidate.title}": requires ${requiredToNext}m (${travelTimeToNextMinutes}m transit + ${safetyBuffer}m buffer), only ${gapToNext}m available.`,
          });
        }
      }
    }

    return {
      valid: violations.filter((v) => v.isHardConstraint).length === 0,
      violations,
      distanceFromPrevMeters,
      travelTimeFromPrevMinutes,
      distanceToNextMeters,
      travelTimeToNextMinutes,
      requiredNextStopShiftMinutes,
    };
  }

  public getFeasibilityService(): ItineraryFeasibilityService {
    return this.feasibilityService;
  }
}
