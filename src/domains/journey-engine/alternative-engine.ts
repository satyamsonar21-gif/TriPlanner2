import { normalizeGeoLocation } from '@/domains/geo';
import {
  ConstraintEngine,
  computeDeterministicDistanceMeters,
  computeDeterministicTravelMinutes,
} from './constraint-engine';
import type {
  AlternativeGenerationOutput,
  AlternativeScoreBreakdown,
  CandidateActivity,
  DownstreamShiftRecord,
  JourneySnapshot,
  JourneySnapshotItem,
  RejectedCandidateRecord,
  ScoredAlternative,
  ScoringWeights,
} from './types';

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  preferenceMatch: 30,
  timeFit: 20,
  locationProximity: 15,
  budgetFit: 15,
  dependencyCompatibility: 10,
  availabilityConfidence: 10,
};

function findGoaLocation(
  id: string,
  name: string,
  lat: number,
  lng: number
) {
  return normalizeGeoLocation({
    id,
    name,
    latitude: lat,
    longitude: lng,
    formattedAddress: `${name}, North Goa, India`,
    city: 'Panjim',
    region: 'Goa',
    country: 'India',
    countryCode: 'IN',
    provider: 'mock',
    locationType: 'activity',
    isDemoFixture: true,
  });
}

/**
 * Authoritative Candidate Activity Inventory for Goa & Multi-Destination Journeys.
 * Includes valid candidates across diverse categories, prices, and locations, as well
 * as explicitly constrained/unavailable candidates to prove deterministic filtering.
 */
export const CANDIDATE_INVENTORY_CATALOG: CandidateActivity[] = [
  {
    id: 'cand_goa_kayaking',
    destinationId: 'dest_goa_01',
    title: 'Mandovi Backwater Mangrove Kayaking',
    subtitle: 'Guided Sheltered Estuary & Birding Paddle',
    category: 'Adventure',
    tags: ['Adventure', 'Beaches', 'Nature', 'Water Sports'],
    durationMinutes: 120, // 14:30 -> 16:30 (shifts 16:30 Café by +30m to 17:00 -> 18:15)
    priceAmount: 1500,
    currency: 'INR',
    location: findGoaLocation(
      'loc_goa_mandovi_kayak',
      'Mandovi Backwater Kayaking Sanctuary',
      15.5012,
      73.8185
    ),
    availabilityStatus: 'AVAILABLE',
    maxCapacity: 10,
    remainingCapacity: 8,
    openingTimeLocal: '07:00',
    closingTimeLocal: '18:30',
    availableWindowStartIso: '2026-05-13T14:30:00Z',
    availableWindowEndIso: '2026-05-13T16:30:00Z',
    vendorId: 'vnd_goa_kayak_01',
    vendorName: 'Konkan Estuarine Expeditions',
    indoorSafe: true,
  },
  {
    id: 'cand_goa_sunset_cruise',
    destinationId: 'dest_goa_01',
    title: 'Mandovi River Boutique Catamaran Cruise',
    subtitle: 'Sheltered River Deck & Live Acoustic Fado',
    category: 'Beaches',
    tags: ['Beaches', 'Leisure', 'Culture'],
    durationMinutes: 90, // 14:30 -> 16:00
    priceAmount: 2400,
    currency: 'INR',
    location: findGoaLocation(
      'loc_goa_panjim_jetty',
      'Panjim Santa Monica River Jetty',
      15.5008,
      73.8272
    ),
    availabilityStatus: 'AVAILABLE',
    maxCapacity: 20,
    remainingCapacity: 6,
    openingTimeLocal: '09:00',
    closingTimeLocal: '20:00',
    availableWindowStartIso: '2026-05-13T14:30:00Z',
    availableWindowEndIso: '2026-05-13T16:00:00Z',
    vendorId: 'vnd_goa_cruise_02',
    vendorName: 'Mandovi Maritime Club',
    indoorSafe: true,
  },
  {
    id: 'cand_goa_cooking_class',
    destinationId: 'dest_goa_01',
    title: 'Goan Saraswat Culinary & Spice Workshop',
    subtitle: 'Hands-on Coastal Curry & Bebinca Masterclass',
    category: 'Food',
    tags: ['Food', 'Culture', 'Indoor'],
    durationMinutes: 105, // 14:15 -> 16:00
    priceAmount: 2100,
    currency: 'INR',
    location: findGoaLocation(
      'loc_goa_fontainhas_kitchen',
      'Fontainhas Culinary Atelier',
      15.4955,
      73.8305
    ),
    availabilityStatus: 'LIMITED',
    maxCapacity: 8,
    remainingCapacity: 4,
    openingTimeLocal: '10:00',
    closingTimeLocal: '19:00',
    availableWindowStartIso: '2026-05-13T14:15:00Z',
    availableWindowEndIso: '2026-05-13T16:00:00Z',
    vendorId: 'vnd_goa_culinary_03',
    vendorName: 'Casa Goa Culinary Studio',
    indoorSafe: true,
  },
  {
    id: 'cand_goa_beach_visit',
    destinationId: 'dest_goa_01',
    title: 'Sinquerim Coastal Promenade & Cove Walk',
    subtitle: 'Self-Guided Shoreline & Lighthouse Viewpoint',
    category: 'Beaches',
    tags: ['Beaches', 'Relaxation'],
    durationMinutes: 90, // 14:15 -> 15:45
    priceAmount: 0,
    currency: 'INR',
    location: findGoaLocation(
      'loc_goa_sinquerim_beach',
      'Sinquerim Cove Promenade',
      15.4988,
      73.7689
    ),
    availabilityStatus: 'AVAILABLE',
    maxCapacity: 50,
    remainingCapacity: 50,
    openingTimeLocal: '06:00',
    closingTimeLocal: '21:00',
    availableWindowStartIso: '2026-05-13T14:15:00Z',
    availableWindowEndIso: '2026-05-13T15:45:00Z',
    vendorId: 'vnd_goa_public_04',
    vendorName: 'Goa Heritage Coast Trust',
    indoorSafe: false,
  },
  // Explicitly Invalid Candidates to verify deterministic filtering before ranking:
  {
    id: 'cand_goa_unavailable_charter',
    destinationId: 'dest_goa_01',
    title: 'Offshore Grande Island Deep-Sea Dive',
    subtitle: 'Closed due to Coast Guard Swell Advisory',
    category: 'Adventure',
    tags: ['Adventure', 'Beaches'],
    durationMinutes: 120,
    priceAmount: 3500,
    currency: 'INR',
    location: findGoaLocation(
      'loc_goa_baga_scuba',
      'Baga Reef Scuba Diving Center',
      15.5553,
      73.7517
    ),
    availabilityStatus: 'UNAVAILABLE',
    maxCapacity: 12,
    remainingCapacity: 0,
    openingTimeLocal: '08:00',
    closingTimeLocal: '17:00',
  },
  {
    id: 'cand_goa_unknown_parasail',
    destinationId: 'dest_goa_01',
    title: 'Calangute Open-Sea Parasailing',
    subtitle: 'Unverified Third-Party Operator',
    category: 'Adventure',
    tags: ['Adventure', 'Beaches'],
    durationMinutes: 60,
    priceAmount: 1800,
    currency: 'INR',
    location: findGoaLocation(
      'loc_goa_calangute',
      'Calangute Beach Slipway',
      15.5439,
      73.7553
    ),
    availabilityStatus: 'UNKNOWN',
    maxCapacity: 4,
    remainingCapacity: 2,
    openingTimeLocal: '09:00',
    closingTimeLocal: '17:00',
  },
  {
    id: 'cand_goa_low_capacity_jetski',
    destinationId: 'dest_goa_01',
    title: 'Solo Sprint Jet-Ski Trial',
    subtitle: 'Single-Rider Craft Only',
    category: 'Adventure',
    tags: ['Adventure'],
    durationMinutes: 60,
    priceAmount: 1400,
    currency: 'INR',
    location: findGoaLocation(
      'loc_goa_candolim_jetty',
      'Candolim Watersports Slipway',
      15.5181,
      73.7626
    ),
    availabilityStatus: 'AVAILABLE',
    maxCapacity: 1,
    remainingCapacity: 1,
    openingTimeLocal: '09:00',
    closingTimeLocal: '17:00',
  },
  {
    id: 'cand_goa_over_budget_yacht',
    destinationId: 'dest_goa_01',
    title: 'Private Luxury Motor Yacht Charter',
    subtitle: 'Exclusive 55ft Sunseeker Charter',
    category: 'Luxury',
    tags: ['Beaches', 'Luxury'],
    durationMinutes: 120,
    priceAmount: 9500,
    currency: 'INR',
    location: findGoaLocation(
      'loc_goa_panjim_jetty',
      'Panjim Santa Monica River Jetty',
      15.5008,
      73.8272
    ),
    availabilityStatus: 'AVAILABLE',
    maxCapacity: 8,
    remainingCapacity: 8,
    openingTimeLocal: '09:00',
    closingTimeLocal: '20:00',
  },
];

function formatIsoToDisplayWindow(startIso: string, endIso: string): string {
  const s = new Date(startIso);
  const e = new Date(endIso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(s.getUTCHours())}:${pad(s.getUTCMinutes())} – ${pad(
    e.getUTCHours()
  )}:${pad(e.getUTCMinutes())}`;
}

/**
 * Deterministic Alternative Generator, Filter, and Explainable Scorer
 */
export class AlternativeEngine {
  private constraintEngine: ConstraintEngine;
  private weights: ScoringWeights;

  constructor(
    weights: Partial<ScoringWeights> = {},
    constraintEngine?: ConstraintEngine
  ) {
    this.weights = { ...DEFAULT_SCORING_WEIGHTS, ...weights };
    this.constraintEngine = constraintEngine || new ConstraintEngine();
  }

  public getWeights(): ScoringWeights {
    return { ...this.weights };
  }

  /**
   * Generates, filters, scores, and ranks candidate alternatives for a disrupted item
   * inside `snapshot`. Invalid candidates are strictly filtered out before ranking.
   */
  public generateAlternatives(params: {
    snapshot: JourneySnapshot;
    disruptedItemId: string;
    candidates?: CandidateActivity[];
    protectedItemIds?: string[];
    budgetPolicy?: 'NO_INCREASE' | 'STRICT_CAP' | 'FLEXIBLE';
    preferredTags?: string[];
  }): AlternativeGenerationOutput {
    const {
      snapshot: rawSnapshot,
      disruptedItemId,
      candidates = CANDIDATE_INVENTORY_CATALOG,
      protectedItemIds = [],
      budgetPolicy,
      preferredTags = [],
    } = params;

    // Apply protectedItemIds and preferredTags onto a working copy of snapshot
    const snapshot: JourneySnapshot =
      protectedItemIds.length > 0 || preferredTags.length > 0
        ? {
            ...structuredClone(rawSnapshot),
            travelStyles:
              preferredTags.length > 0
                ? Array.from(new Set([...preferredTags, ...rawSnapshot.travelStyles]))
                : rawSnapshot.travelStyles,
            items: rawSnapshot.items.map((item) =>
              protectedItemIds.includes(item.id)
                ? { ...structuredClone(item), isLocked: true }
                : structuredClone(item)
            ),
          }
        : rawSnapshot;

    const disruptedItem = snapshot.items.find((i) => i.id === disruptedItemId);
    if (!disruptedItem) {
      return { validAlternatives: [], rejectedCandidates: [] };
    }

    const validAlternatives: ScoredAlternative[] = [];
    const rejectedCandidates: RejectedCandidateRecord[] = [];

    const sameDayItems = snapshot.items
      .filter(
        (i) =>
          i.dayNumber === disruptedItem.dayNumber && i.status !== 'cancelled'
      )
      .sort((a, b) => a.sequenceOrder - b.sequenceOrder);

    const disruptedIdx = sameDayItems.findIndex(
      (i) => i.id === disruptedItem.id
    );
    const nextItem: JourneySnapshotItem | undefined =
      disruptedIdx >= 0 && disruptedIdx < sameDayItems.length - 1
        ? sameDayItems[disruptedIdx + 1]
        : undefined;
    const itemAfterNext: JourneySnapshotItem | undefined =
      disruptedIdx >= 0 && disruptedIdx < sameDayItems.length - 2
        ? sameDayItems[disruptedIdx + 2]
        : undefined;

    for (const candidate of candidates) {
      if (
        budgetPolicy === 'NO_INCREASE' &&
        candidate.priceAmount > disruptedItem.price
      ) {
        rejectedCandidates.push({
          candidateId: candidate.id,
          title: candidate.title,
          rejectionReasons: [
            {
              category: 'BUDGET',
              code: 'BUDGET_HARD_CAP_EXCEEDED',
              severity: 'HIGH',
              isHardConstraint: true,
              itemId: candidate.id,
              itemTitle: candidate.title,
              explanation: `Candidate "${candidate.title}" (₹${candidate.priceAmount.toLocaleString()}) exceeds the replaced item cost (₹${disruptedItem.price.toLocaleString()}) under explicit NO_INCREASE budget policy.`,
            },
          ],
        });
        continue;
      }

      const proposedStartIso =
        candidate.availableWindowStartIso || disruptedItem.startTimeIso;
      const proposedEndIso =
        candidate.availableWindowEndIso ||
        new Date(
          new Date(proposedStartIso).getTime() +
            candidate.durationMinutes * 60 * 1000
        ).toISOString();

      const evaluation = this.constraintEngine.evaluateCandidateReplacement({
        snapshot,
        disruptedItem,
        candidate,
        proposedStartIso,
        proposedEndIso,
        allowDownstreamReschedule: true,
      });

      if (!evaluation.valid) {
        rejectedCandidates.push({
          candidateId: candidate.id,
          title: candidate.title,
          rejectionReasons: evaluation.violations,
        });
        continue;
      }

      if (
        nextItem &&
        evaluation.requiredNextStopShiftMinutes > 0 &&
        protectedItemIds.includes(nextItem.id)
      ) {
        rejectedCandidates.push({
          candidateId: candidate.id,
          title: candidate.title,
          rejectionReasons: [
            {
              category: 'BOOKING_STATE',
              code: 'LOCKED_BOOKING_CONFLICT',
              severity: 'CRITICAL',
              isHardConstraint: true,
              itemId: candidate.id,
              itemTitle: candidate.title,
              relatedItemId: nextItem.id,
              relatedItemTitle: nextItem.title,
              explanation: `Candidate "${candidate.title}" would shift protected item "${nextItem.title}" by +${evaluation.requiredNextStopShiftMinutes} min, violating explicit preserve constraint.`,
            },
          ],
        });
        continue;
      }

      // Compute downstream shifts if needed (e.g. Kayaking 14:30-16:30 shifts Beachside Café from 16:30 to 17:00)
      const downstreamShifts: DownstreamShiftRecord[] = [];
      if (nextItem && evaluation.requiredNextStopShiftMinutes > 0) {
        const nextOrigStartMs = new Date(nextItem.startTimeIso).getTime();
        const nextOrigEndMs = new Date(nextItem.endTimeIso).getTime();
        const nextDurationMs = Math.max(
          15 * 60 * 1000,
          nextOrigEndMs - nextOrigStartMs
        );
        const shiftMs = evaluation.requiredNextStopShiftMinutes * 60 * 1000;
        const newNextStartIso = new Date(nextOrigStartMs + shiftMs).toISOString();
        const newNextEndIso = new Date(
          nextOrigStartMs + shiftMs + nextDurationMs
        ).toISOString();

        // Check that shifting nextItem does not violate itemAfterNext (e.g., Dinner at 19:00)
        if (itemAfterNext) {
          const distNextToAfter = computeDeterministicDistanceMeters(
            nextItem.location.latitude,
            nextItem.location.longitude,
            itemAfterNext.location.latitude,
            itemAfterNext.location.longitude
          );
          const travelNextToAfter = computeDeterministicTravelMinutes(
            distNextToAfter,
            nextItem.travelModeToNext || 'driving'
          );
          const availableToAfter = Math.round(
            (new Date(itemAfterNext.startTimeIso).getTime() -
              new Date(newNextEndIso).getTime()) /
              (1000 * 60)
          );
          if (
            availableToAfter <
            travelNextToAfter + (nextItem.safetyBufferMinutes || 15)
          ) {
            rejectedCandidates.push({
              candidateId: candidate.id,
              title: candidate.title,
              rejectionReasons: [
                {
                  category: 'DEPENDENCY',
                  code: 'DOWNSTREAM_CASCADE_CONFLICT',
                  severity: 'HIGH',
                  isHardConstraint: true,
                  itemId: candidate.id,
                  itemTitle: candidate.title,
                  relatedItemId: itemAfterNext.id,
                  relatedItemTitle: itemAfterNext.title,
                  explanation: `Shifting "${nextItem.title}" would breach buffer for "${itemAfterNext.title}".`,
                },
              ],
            });
            continue;
          }
        }

        downstreamShifts.push({
          itemId: nextItem.id,
          itemTitle: nextItem.title,
          previousStartIso: nextItem.startTimeIso,
          newStartIso: newNextStartIso,
          previousEndIso: nextItem.endTimeIso,
          newEndIso: newNextEndIso,
          previousDisplayWindow: nextItem.displayWindow,
          newDisplayWindow: formatIsoToDisplayWindow(
            newNextStartIso,
            newNextEndIso
          ),
          shiftMinutes: evaluation.requiredNextStopShiftMinutes,
        });
      }

      // Compute real conflict resolution counts from baseline vs post-replacement snapshot evaluation
      const baselineSnapshot: JourneySnapshot = structuredClone(snapshot);
      const baselineTarget = baselineSnapshot.items.find(
        (i) => i.id === disruptedItem.id
      );
      if (baselineTarget && baselineTarget.status === 'confirmed') {
        baselineTarget.status = 'disrupted';
      }
      const baselineEval =
        this.constraintEngine.evaluateSnapshot(baselineSnapshot);

      const postCandidateSnapshot: JourneySnapshot = structuredClone(snapshot);
      const postTargetIdx = postCandidateSnapshot.items.findIndex(
        (i) => i.id === disruptedItem.id
      );
      if (postTargetIdx !== -1) {
        postCandidateSnapshot.items[postTargetIdx] = {
          ...postCandidateSnapshot.items[postTargetIdx],
          title: candidate.title,
          subtitle: candidate.subtitle,
          startTimeIso: proposedStartIso,
          endTimeIso: proposedEndIso,
          displayWindow: formatIsoToDisplayWindow(
            proposedStartIso,
            proposedEndIso
          ),
          location: candidate.location,
          price: candidate.priceAmount,
          currency: candidate.currency,
          status: 'confirmed',
          maxCapacity: candidate.maxCapacity,
          openingTimeLocal: candidate.openingTimeLocal,
          closingTimeLocal: candidate.closingTimeLocal,
          disruptionNote: undefined,
        };
      }
      downstreamShifts.forEach((shift) => {
        const sIdx = postCandidateSnapshot.items.findIndex(
          (i) => i.id === shift.itemId
        );
        if (sIdx !== -1) {
          postCandidateSnapshot.items[sIdx] = {
            ...postCandidateSnapshot.items[sIdx],
            startTimeIso: shift.newStartIso,
            endTimeIso: shift.newEndIso,
            displayWindow: shift.newDisplayWindow,
            status: 'confirmed',
          };
        }
      });
      const priceDelta = candidate.priceAmount - disruptedItem.price;
      const budgetBefore = snapshot.allocatedCost;
      const budgetAfter = snapshot.allocatedCost + priceDelta;
      postCandidateSnapshot.allocatedCost = budgetAfter;

      const postEval = this.constraintEngine.evaluateSnapshot(
        postCandidateSnapshot,
        baselineSnapshot
      );
      if (!postEval.valid) {
        rejectedCandidates.push({
          candidateId: candidate.id,
          title: candidate.title,
          rejectionReasons: postEval.hardViolations,
        });
        continue;
      }

      const conflictsRemainingCount = postEval.hardViolations.length;
      const conflictsResolvedCount = Math.max(
        0,
        baselineEval.hardViolations.length - conflictsRemainingCount
      );

      // Compute deterministic factor-by-factor score
      const scoreBreakdown = this.scoreCandidate({
        snapshot,
        disruptedItem,
        candidate,
        proposedStartIso,
        distanceToNextMeters: evaluation.distanceToNextMeters,
        travelTimeToNextMinutes: evaluation.travelTimeToNextMinutes,
        downstreamShiftsCount: downstreamShifts.length,
      });

      const timeShiftMinutes = Math.round(
        (new Date(proposedStartIso).getTime() -
          new Date(disruptedItem.startTimeIso).getTime()) /
          (1000 * 60)
      );

      // Build structured factual explanation (no fake AI filler)
      const explanationReasons = this.buildStructuredExplanation({
        snapshot,
        disruptedItem,
        candidate,
        scoreBreakdown,
        priceDelta,
        budgetAfter,
        travelTimeToNextMinutes: evaluation.travelTimeToNextMinutes,
        distanceToNextMeters: evaluation.distanceToNextMeters,
        downstreamShifts,
      });

      validAlternatives.push({
        id: `alt_${candidate.id}`,
        candidate,
        rank: 0, // Assigned after deterministic sorting
        isRecommended: false,
        isValid: true,
        scoreBreakdown,
        proposedStartTimeIso: proposedStartIso,
        proposedEndTimeIso: proposedEndIso,
        displayWindow: formatIsoToDisplayWindow(
          proposedStartIso,
          proposedEndIso
        ),
        priceDelta,
        budgetBefore,
        budgetAfter,
        timeShiftMinutes,
        distanceToPreviousMeters: evaluation.distanceFromPrevMeters,
        travelTimeFromPreviousMinutes: evaluation.travelTimeFromPrevMinutes,
        distanceToNextMeters: evaluation.distanceToNextMeters,
        travelTimeToNextMinutes: evaluation.travelTimeToNextMinutes,
        downstreamShifts,
        explanationReasons,
        conflictsResolvedCount,
        conflictsRemainingCount,
      });
    }

    // Deterministic sorting: primary by totalScore DESC, tie-breaker by lower priceAmount ASC, then id ASC
    validAlternatives.sort((a, b) => {
      if (b.scoreBreakdown.totalScore !== a.scoreBreakdown.totalScore) {
        return b.scoreBreakdown.totalScore - a.scoreBreakdown.totalScore;
      }
      if (a.candidate.priceAmount !== b.candidate.priceAmount) {
        return a.candidate.priceAmount - b.candidate.priceAmount;
      }
      return a.id.localeCompare(b.id);
    });

    validAlternatives.forEach((alt, idx) => {
      alt.rank = idx + 1;
      alt.isRecommended = idx === 0;
    });

    return {
      validAlternatives,
      rejectedCandidates,
    };
  }

  /**
   * Deterministic Multi-Factor Scorer (0–100 total score across 6 weighted dimensions)
   */
  public scoreCandidate(params: {
    snapshot: JourneySnapshot;
    disruptedItem: JourneySnapshotItem;
    candidate: CandidateActivity;
    proposedStartIso: string;
    distanceToNextMeters: number;
    travelTimeToNextMinutes: number;
    downstreamShiftsCount: number;
  }): AlternativeScoreBreakdown {
    const {
      snapshot,
      disruptedItem,
      candidate,
      proposedStartIso,
      distanceToNextMeters,
      downstreamShiftsCount,
    } = params;

    const w = this.weights;

    // 1. Preference Match (Max: w.preferenceMatch, default 30)
    const stylesLower = snapshot.travelStyles.map((s) => s.toLowerCase());
    const candidateTagsLower = [
      candidate.category,
      ...candidate.tags,
    ].map((t) => t.toLowerCase());

    const matchedTags = stylesLower.filter((style) =>
      candidateTagsLower.some((t) => t.includes(style) || style.includes(t))
    );
    const primaryDisruptedCategory =
      disruptedItem.categoryTags[0]?.toLowerCase() || '';
    const samePrimaryCategory =
      primaryDisruptedCategory === candidate.category.toLowerCase();

    let preferenceRatio = 0.5;
    if (matchedTags.length >= 2 && samePrimaryCategory) {
      preferenceRatio = 0.9; // 27 / 30
    } else if (matchedTags.length >= 1 && samePrimaryCategory) {
      preferenceRatio = 0.85;
    } else if (matchedTags.length >= 1) {
      preferenceRatio = 0.75;
    }
    const preferenceMatch = Math.round(w.preferenceMatch * preferenceRatio);

    // 2. Time Window Fit (Max: w.timeFit, default 20)
    const startShiftMins = Math.abs(
      Math.round(
        (new Date(proposedStartIso).getTime() -
          new Date(disruptedItem.startTimeIso).getTime()) /
          (1000 * 60)
      )
    );
    let timeRatio = 1.0;
    if (startShiftMins === 0) {
      timeRatio = 0.95;
    } else if (startShiftMins <= 30) {
      timeRatio = 0.9; // 18 / 20
    } else if (startShiftMins <= 60) {
      timeRatio = 0.75;
    } else {
      timeRatio = 0.55;
    }
    const timeFit = Math.round(w.timeFit * timeRatio);

    // 3. Location Proximity (Max: w.locationProximity, default 15)
    let locRatio = 0.6;
    if (distanceToNextMeters <= 3000) {
      locRatio = 0.9334; // 14 / 15
    } else if (distanceToNextMeters <= 7000) {
      locRatio = 0.8; // 12 / 15
    } else if (distanceToNextMeters <= 12000) {
      locRatio = 0.67; // 10 / 15
    } else {
      locRatio = 0.45;
    }
    const locationProximity = Math.round(w.locationProximity * locRatio);

    // 4. Budget Fit (Max: w.budgetFit, default 15)
    const priceDelta = candidate.priceAmount - disruptedItem.price;
    let budgetRatio = 0.7;
    if (priceDelta < 0 && candidate.priceAmount > 0) {
      // Paid curated experience that saves money vs disrupted item
      budgetRatio = 1.0; // 15 / 15
    } else if (candidate.priceAmount === 0) {
      // Free experience saves money but has lower curated value than a paid replacement
      budgetRatio = 0.8; // 12 / 15
    } else if (priceDelta === 0) {
      budgetRatio = 0.9;
    } else {
      budgetRatio = 0.6;
    }
    const budgetFit = Math.round(w.budgetFit * budgetRatio);

    // 5. Dependency Compatibility (Max: w.dependencyCompatibility, default 10)
    let depRatio = 0.9;
    if (downstreamShiftsCount <= 1) {
      depRatio = 0.9; // 9 / 10 when 0 shifts or 1 clean minor shift of modifiable stop
    } else if (downstreamShiftsCount === 2) {
      depRatio = 0.6; // 6 / 10 when 2 downstream stops require shifting
    } else {
      depRatio = 0.3; // 3 / 10 when 3+ downstream stops require shifting
    }
    const dependencyCompatibility = Math.round(
      w.dependencyCompatibility * depRatio
    );

    // 6. Availability Confidence (Max: w.availabilityConfidence, default 10)
    const availRatio =
      candidate.availabilityStatus === 'AVAILABLE'
        ? 1.0 // 10 / 10
        : candidate.availabilityStatus === 'LIMITED'
        ? 0.7 // 7 / 10
        : 0;
    const availabilityConfidence = Math.round(
      w.availabilityConfidence * availRatio
    );

    const totalScore = Math.min(
      100,
      preferenceMatch +
        timeFit +
        locationProximity +
        budgetFit +
        dependencyCompatibility +
        availabilityConfidence
    );

    return {
      preferenceMatch,
      timeFit,
      locationProximity,
      budgetFit,
      dependencyCompatibility,
      availabilityConfidence,
      totalScore,
    };
  }

  private buildStructuredExplanation(params: {
    snapshot: JourneySnapshot;
    disruptedItem: JourneySnapshotItem;
    candidate: CandidateActivity;
    scoreBreakdown: AlternativeScoreBreakdown;
    priceDelta: number;
    budgetAfter: number;
    travelTimeToNextMinutes: number;
    distanceToNextMeters: number;
    downstreamShifts: DownstreamShiftRecord[];
  }): string[] {
    const {
      snapshot,
      disruptedItem,
      candidate,
      scoreBreakdown,
      priceDelta,
      budgetAfter,
      travelTimeToNextMinutes,
      distanceToNextMeters,
      downstreamShifts,
    } = params;

    const reasons: string[] = [
      `Preference Match (+${scoreBreakdown.preferenceMatch}/${this.weights.preferenceMatch}): Aligns with traveler styles (${snapshot.travelStyles.join(
        ', '
      )}) via [${candidate.tags.join(', ')}].`,
      `Time Window Fit (+${scoreBreakdown.timeFit}/${this.weights.timeFit}): Fits afternoon slot (${candidate.durationMinutes} min duration) within operating hours (${candidate.openingTimeLocal}–${candidate.closingTimeLocal}).`,
      `Location Proximity (+${scoreBreakdown.locationProximity}/${this.weights.locationProximity}): ${(
        distanceToNextMeters / 1000
      ).toFixed(1)} km (${travelTimeToNextMinutes} min drive) to next stop.`,
      `Budget Fit (+${scoreBreakdown.budgetFit}/${this.weights.budgetFit}): Costs ${snapshot.currency} ${candidate.priceAmount.toLocaleString()} (${
        priceDelta <= 0
          ? `saves ${snapshot.currency} ${Math.abs(priceDelta).toLocaleString()} vs ${disruptedItem.title}`
          : `+${snapshot.currency} ${priceDelta.toLocaleString()}`
      }; new total ${snapshot.currency} ${budgetAfter.toLocaleString()} / ${snapshot.currency} ${snapshot.totalBudget.toLocaleString()}).`,
      `Dependency Compatibility (+${scoreBreakdown.dependencyCompatibility}/${this.weights.dependencyCompatibility}): ${
        downstreamShifts.length > 0
          ? `Smoothly shifts ${downstreamShifts
              .map((s) => `${s.itemTitle} to ${s.newDisplayWindow}`)
              .join(', ')} while keeping evening Dinner intact.`
          : 'Zero downstream schedule shifts required.'
      }`,
      `Availability Confidence (+${scoreBreakdown.availabilityConfidence}/${this.weights.availabilityConfidence}): ${candidate.availabilityStatus} (${candidate.remainingCapacity} spots open for ${snapshot.travelersCount} travelers).`,
    ];

    return reasons;
  }
}
