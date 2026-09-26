import type {
  ApplyChangeResult,
  EngineChangeRequest,
  FullSimulationOutput,
  ImpactAnalysisResult,
  JourneySnapshot,
  ScoredAlternative,
} from '@/domains/journey-engine/types';
import type {
  AiExplanationBundle,
  GroundedFactReference,
} from './types';

/**
 * PHASE 05 — FACT-GROUNDED EXPLANATION ENGINE
 *
 * Implements Sections 13, 14, 15, 20, 21, 22, 56, and 99:
 * - Builds internal `FACT-*` grounding references from authoritative application data
 * - Explains why an alternative is recommended using ONLY deterministic scores,
 *   prices, time windows, buffers, and downstream effects
 * - Explains disruption impacts across direct, downstream, budget, and preserved items
 * - Explains failed change applications (version conflict, locked booking, etc.)
 *   accurately without generic "Something went wrong" messages
 */

export function buildJourneyGroundedFacts(params: {
  snapshot: JourneySnapshot;
  changeRequest?: EngineChangeRequest;
  selectedAlternative?: ScoredAlternative;
}): GroundedFactReference[] {
  const { snapshot, changeRequest, selectedAlternative } = params;
  const nowIso = new Date().toISOString();
  const facts: GroundedFactReference[] = [
    {
      factId: `FACT-JOURNEY-${snapshot.journeyId}-V${snapshot.version}`,
      sourceType: 'JOURNEY_STATE',
      sourceEntityId: snapshot.journeyId,
      sourceTimestamp: snapshot.capturedAt || nowIso,
      journeyVersion: snapshot.version,
      label: `${snapshot.title} (Version v${snapshot.version})`,
      authoritativeValue: `v${snapshot.version}`,
    },
    {
      factId: `FACT-BUDGET-${snapshot.journeyId}-V${snapshot.version}`,
      sourceType: 'BUDGET_LEDGER',
      sourceEntityId: snapshot.journeyId,
      sourceTimestamp: snapshot.capturedAt || nowIso,
      journeyVersion: snapshot.version,
      label: 'Allocated Cost / Total Budget',
      authoritativeValue: `₹${snapshot.allocatedCost.toLocaleString()} / ₹${snapshot.totalBudget.toLocaleString()} (${snapshot.currency})`,
    },
  ];

  for (const item of snapshot.items) {
    facts.push({
      factId: `FACT-ITINERARY-${item.id}`,
      sourceType: 'ITINERARY_ITEM',
      sourceEntityId: item.id,
      sourceTimestamp: snapshot.capturedAt || nowIso,
      journeyVersion: snapshot.version,
      label: `${item.title} (${item.displayWindow})`,
      authoritativeValue: `${item.status.toUpperCase()} • ₹${item.price.toLocaleString()} • Booking: ${item.bookingState}`,
    });
  }

  if (changeRequest) {
    facts.push({
      factId: `FACT-CHANGE-${changeRequest.id}`,
      sourceType: 'CHANGE_REQUEST',
      sourceEntityId: changeRequest.id,
      sourceTimestamp: changeRequest.updatedAt || nowIso,
      journeyVersion: changeRequest.expectedJourneyVersion,
      label: `Change Request ${changeRequest.id}`,
      authoritativeValue: `State: ${changeRequest.state} • Severity: ${changeRequest.severity} • Valid Options: ${changeRequest.scoredAlternatives.length}`,
    });
  }

  if (selectedAlternative) {
    facts.push({
      factId: `FACT-ALT-${selectedAlternative.id}`,
      sourceType: 'SCORED_ALTERNATIVE',
      sourceEntityId: selectedAlternative.candidate.id,
      sourceTimestamp: nowIso,
      journeyVersion: snapshot.version,
      label: `Candidate ${selectedAlternative.candidate.title}`,
      authoritativeValue: `Score: ${selectedAlternative.scoreBreakdown.totalScore}/100 • Price: ₹${selectedAlternative.candidate.priceAmount.toLocaleString()} • Delta: ₹${selectedAlternative.priceDelta.toLocaleString()}`,
    });
  }

  return facts;
}

/**
 * Reusable "Why This Recommendation?" Explanation Pipeline (Sections 20 & 21)
 */
export function buildAlternativeExplanationBundle(params: {
  alternative: ScoredAlternative;
  snapshot: JourneySnapshot;
  changeRequest?: EngineChangeRequest;
  simulation?: FullSimulationOutput;
  preservedItemTitles?: string[];
}): AiExplanationBundle {
  const {
    alternative,
    snapshot,
    changeRequest,
    simulation,
    preservedItemTitles = [],
  } = params;

  const cand = alternative.candidate;
  const breakdown = alternative.scoreBreakdown;
  const priceDeltaAbs = Math.abs(alternative.priceDelta);
  const priceDeltaPhrase =
    alternative.priceDelta < 0
      ? `reduces the allocated trip cost by ₹${priceDeltaAbs.toLocaleString()} (from ₹${alternative.budgetBefore.toLocaleString()} to ₹${alternative.budgetAfter.toLocaleString()})`
      : alternative.priceDelta === 0
      ? `keeps the allocated trip cost unchanged at ₹${alternative.budgetAfter.toLocaleString()}`
      : `adds ₹${priceDeltaAbs.toLocaleString()} while remaining within the ₹${snapshot.totalBudget.toLocaleString()} budget cap`;

  const lockedItems = snapshot.items.filter(
    (i) => i.isLocked && i.status !== 'cancelled'
  );
  const allPreservedNames = Array.from(
    new Set([
      ...preservedItemTitles,
      ...lockedItems.map((i) => i.title),
    ])
  );

  const preservedPhrase =
    allPreservedNames.length > 0
      ? `preserves protected/locked items (${allPreservedNames.join(', ')})`
      : 'preserves downstream locked bookings';

  const downstreamPhrase =
    alternative.downstreamShifts.length === 0
      ? 'avoids creating any downstream schedule shift'
      : `requires a validated ${alternative.downstreamShifts
          .map((s) => `+${s.shiftMinutes} min adjustment to ${s.itemTitle}`)
          .join(', ')} without breaching any locked reservation`;

  const shortExplanation = `${cand.title} (${breakdown.totalScore}/100) fits your ${cand.category} preference, is confirmed ${cand.availabilityStatus.toLowerCase()} for ${alternative.displayWindow}, ${priceDeltaPhrase}, and ${downstreamPhrase}.`;

  const disruptedTitle =
    changeRequest?.trigger.affectedItemId
      ? snapshot.items.find((i) => i.id === changeRequest.trigger.affectedItemId)
          ?.title || changeRequest.trigger.title
      : 'the disrupted activity';

  const detailedExplanation = [
    `${cand.title} is ranked #${alternative.rank} with an authoritative deterministic score of ${breakdown.totalScore}/100`,
    `(Preference Match: ${breakdown.preferenceMatch}/30, Time Fit: ${breakdown.timeFit}/20, Proximity: ${breakdown.locationProximity}/15, Budget Fit: ${breakdown.budgetFit}/15, Dependency Compatibility: ${breakdown.dependencyCompatibility}/10, Availability: ${breakdown.availabilityConfidence}/10).`,
    `Replacing ${disruptedTitle} with ${cand.title} (${alternative.displayWindow}, ₹${cand.priceAmount.toLocaleString()}) ${priceDeltaPhrase},`,
    `leaving ₹${(snapshot.totalBudget - alternative.budgetAfter).toLocaleString()} in remaining budget.`,
    `It ${downstreamPhrase} and ${preservedPhrase}.`,
  ].join(' ');

  const whyRecommendedBullets: string[] = [
    `Preference Fit (${breakdown.preferenceMatch}/30): Matches ${cand.tags.join(', ')} against journey styles (${snapshot.travelStyles.join(', ')}).`,
    `Schedule & Dependency Fit (${breakdown.timeFit}/20 time, ${breakdown.dependencyCompatibility}/10 dependency): Operates ${alternative.displayWindow} with ${alternative.travelTimeFromPreviousMinutes} min incoming transfer and ${alternative.travelTimeToNextMinutes} min outgoing transfer.`,
    `Financial Fit (${breakdown.budgetFit}/15): Costs ₹${cand.priceAmount.toLocaleString()} (${
      alternative.priceDelta <= 0
        ? `saves ₹${priceDeltaAbs.toLocaleString()}`
        : `+₹${priceDeltaAbs.toLocaleString()}`
    }), bringing allocated cost to ₹${alternative.budgetAfter.toLocaleString()} / ₹${snapshot.totalBudget.toLocaleString()}.`,
    `Inventory & Capacity (${breakdown.availabilityConfidence}/10): ${cand.availabilityStatus} via ${cand.vendorName || 'verified partner'} (${cand.remainingCapacity} spots available for party of ${snapshot.travelersCount}).`,
    `Protected Schedule Integrity: ${
      allPreservedNames.length > 0
        ? `Leaves ${allPreservedNames.join(' and ')} completely undisturbed.`
        : 'All hard temporal, transfer buffer, and booking-lock constraints pass.'
    }`,
  ];

  const groundedFactIds: string[] = [
    `FACT-JOURNEY-${snapshot.journeyId}-V${snapshot.version}`,
    `FACT-BUDGET-${snapshot.journeyId}-V${snapshot.version}`,
    `FACT-ALT-${alternative.id}`,
  ];
  if (changeRequest) {
    groundedFactIds.push(`FACT-CHANGE-${changeRequest.id}`);
  }

  return {
    shortExplanation,
    detailedExplanation,
    whyRecommendedBullets,
    whatChangedSummary: simulation
      ? `Replaces ${disruptedTitle} with ${cand.title} (${alternative.displayWindow}).`
      : `Proposed replacement of ${disruptedTitle} with ${cand.title}.`,
    whatIsAffectedSummary:
      alternative.downstreamShifts.length === 0
        ? 'Zero downstream activities require rescheduling.'
        : `Adjusts ${alternative.downstreamShifts
            .map(
              (s) =>
                `${s.itemTitle} (${s.previousDisplayWindow} -> ${s.newDisplayWindow})`
            )
            .join('; ')}.`,
    whatIsPreservedSummary:
      allPreservedNames.length > 0
        ? `Preserves ${allPreservedNames.join(', ')} at their exact confirmed times.`
        : 'Preserves all non-disrupted confirmed bookings.',
    budgetImpactSummary: `Allocated cost changes from ₹${alternative.budgetBefore.toLocaleString()} to ₹${alternative.budgetAfter.toLocaleString()} (delta: ${
      alternative.priceDelta <= 0
        ? `-₹${priceDeltaAbs.toLocaleString()}`
        : `+₹${priceDeltaAbs.toLocaleString()}`
    }; remaining budget: ₹${(
      snapshot.totalBudget - alternative.budgetAfter
    ).toLocaleString()}).`,
    scheduleImpactSummary: `Time window ${alternative.displayWindow}; resolves ${alternative.conflictsResolvedCount} conflict(s) with ${alternative.conflictsRemainingCount} remaining hard violations.`,
    groundedFactIds,
  };
}

/**
 * Impact Explanation Pipeline (Section 22)
 */
export function buildImpactExplanationBundle(params: {
  impact: ImpactAnalysisResult;
  snapshot: JourneySnapshot;
  validAlternativesCount: number;
  rejectedCandidatesCount?: number;
}): AiExplanationBundle {
  const {
    impact,
    snapshot,
    validAlternativesCount,
    rejectedCandidatesCount = 0,
  } = params;

  const affectedItem = snapshot.items.find(
    (i) => i.id === impact.trigger.affectedItemId
  );
  const downstreamTitles = impact.downstreamItemIds
    .map((id) => snapshot.items.find((i) => i.id === id)?.title || id)
    .filter(Boolean);

  const preservedLockedTitles = snapshot.items
    .filter(
      (i) =>
        i.id !== impact.trigger.affectedItemId &&
        (i.isLocked || i.bookingState === 'CONFIRMED' || i.bookingState === 'NON_REFUNDABLE')
    )
    .map((i) => `${i.title} (${i.displayWindow})`);

  const totalEvaluated = validAlternativesCount + rejectedCandidatesCount;

  const shortExplanation = `${
    affectedItem ? affectedItem.title : impact.trigger.title
  } triggered a ${impact.overallSeverity} severity impact across ${
    impact.downstreamItemIds.length
  } downstream dependency item(s). ${validAlternativesCount} valid replacement option(s) passed all deterministic constraints${
    impact.requiresApproval ? ' and await your review and approval.' : '.'
  }`;

  const detailedExplanation = [
    `${impact.trigger.title}: ${impact.trigger.reason}`,
    `The deterministic ImpactAnalyzer evaluated journey ${snapshot.journeyId} (v${impact.journeyVersion}) and identified ${impact.downstreamItemIds.length} downstream dependent item(s)${
      downstreamTitles.length > 0 ? ` (${downstreamTitles.join(', ')})` : ''
    }.`,
    preservedLockedTitles.length > 0
      ? `Confirmed/locked reservations (${preservedLockedTitles.join(', ')}) are protected against invalid mutation.`
      : '',
    totalEvaluated > 0
      ? `${totalEvaluated} replacement candidate(s) were evaluated against availability, transfer buffers, capacity, and the ₹${snapshot.totalBudget.toLocaleString()} budget cap; ${validAlternativesCount} passed and ${rejectedCandidatesCount} were rejected.`
      : '',
    impact.requiresApproval
      ? 'Human approval is required before any itinerary or booking change is applied.'
      : 'No human approval gate was triggered.',
  ]
    .filter(Boolean)
    .join(' ');

  return {
    shortExplanation,
    detailedExplanation,
    whyRecommendedBullets: [
      `Direct Impact: ${impact.dimensions.DIRECT.explanation}`,
      `Downstream Chain: ${impact.dimensions.DOWNSTREAM.explanation}`,
      `Budget Status: ${impact.dimensions.BUDGET.explanation}`,
      `Approval Requirement: ${
        impact.requiresApproval
          ? `Mandatory human approval required (severity: ${impact.overallSeverity}).`
          : 'Auto-resolvable.'
      }`,
    ],
    whatChangedSummary: `${
      affectedItem ? `${affectedItem.title} (${affectedItem.displayWindow})` : impact.trigger.title
    } experienced ${impact.trigger.triggerType}.`,
    whatIsAffectedSummary:
      downstreamTitles.length > 0
        ? `Downstream dependency chain includes: ${downstreamTitles.join(' -> ')}.`
        : 'No downstream dependent stops are linked to this item.',
    whatIsPreservedSummary:
      preservedLockedTitles.length > 0
        ? `Protected bookings: ${preservedLockedTitles.join(', ')}.`
        : 'All other confirmed stops remain intact.',
    budgetImpactSummary: `Current allocated cost is ₹${snapshot.allocatedCost.toLocaleString()} of ₹${snapshot.totalBudget.toLocaleString()} (${snapshot.currency}).`,
    scheduleImpactSummary: `${impact.constraintEvaluation.hardViolations.length} hard violation(s) and ${impact.constraintEvaluation.softViolations.length} soft warning(s) detected on baseline state.`,
    groundedFactIds: [
      `FACT-JOURNEY-${snapshot.journeyId}-V${snapshot.version}`,
      `FACT-CHANGE-${impact.changeRequestId}`,
    ],
  };
}

/**
 * Specific Explanation of Failed Changes (Section 56 & Section 73)
 */
export function explainFailedChangeResult(params: {
  applyResult: ApplyChangeResult;
  currentSnapshot: JourneySnapshot;
}): {
  headline: string;
  message: string;
} {
  const { applyResult, currentSnapshot } = params;

  switch (applyResult.errorCode) {
    case 'JOURNEY_VERSION_CONFLICT':
    case 'CHANGE_REQUIRES_RECALCULATION':
      return {
        headline: 'Stale Proposal Rejected — Journey Has Updated',
        message: `This proposal is based on an older version of your journey (v${applyResult.changeRequest.expectedJourneyVersion}), but your live journey is now at v${currentSnapshot.version}. Your current journey (v${currentSnapshot.version}, allocated cost ₹${currentSnapshot.allocatedCost.toLocaleString()}) remains unchanged, and I did not apply the stale change. I have refreshed your journey context so you can review the latest state.`,
      };

    case 'UNAUTHORIZED_ACTOR':
      return {
        headline: 'Authorization Denied — Journey Unchanged',
        message: `The change could not be applied because your current session role is not authorized to modify journey ${currentSnapshot.journeyId}. Your live journey (v${currentSnapshot.version}) remains untouched.`,
      };

    case 'CHANGE_EXPIRED':
      return {
        headline: 'Change Proposal Expired — Journey Unchanged',
        message: `This change proposal expired at ${applyResult.changeRequest.expiresAt || 'its deadline'} before execution. Your live journey (v${currentSnapshot.version}) remains unchanged; please request a fresh availability evaluation.`,
      };

    case 'VALIDATION_FAILED':
      return {
        headline: 'Pre-Apply Constraint Validation Failed — Journey Unchanged',
        message: `The change could not be applied because pre-apply deterministic validation detected a constraint conflict: ${applyResult.errorMessage || 'schedule or budget violation'}. Your live journey (v${currentSnapshot.version}) remains unchanged.`,
      };

    case 'ROLLBACK_EXECUTED':
      return {
        headline: 'Transaction Rolled Back Safely — Journey Unchanged',
        message: `A mid-transaction error occurred while applying the change, so the engine executed a full atomic rollback. Your live journey remains intact at v${currentSnapshot.version} (₹${currentSnapshot.allocatedCost.toLocaleString()} allocated).`,
      };

    case 'IDEMPOTENCY_KEY_PAYLOAD_MISMATCH':
      return {
        headline: 'Idempotency Key Conflict — Journey Unchanged',
        message: `The request reused an existing idempotency key with a different change payload and was safely rejected. Your live journey (v${currentSnapshot.version}) remains unchanged.`,
      };

    case 'INVALID_STATE_TRANSITION':
    default:
      return {
        headline: 'Change Could Not Be Applied — Journey Unchanged',
        message: `The change request is currently in state "${applyResult.changeRequest.state}" and cannot transition to APPLIED (${applyResult.errorMessage || 'invalid state'}). Your live journey (v${currentSnapshot.version}) remains unchanged.`,
      };
  }
}
