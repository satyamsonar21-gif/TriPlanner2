import type {
  ItineraryItem,
  ItineraryDependency,
} from '@/types/database.types';
import type {
  AlternativeProposal,
  FullSimulationOutput,
  JourneySnapshot,
  ScoredAlternative,
  SimulationDiff,
  SimulationItemChange,
  SimulationResult,
} from './types';
import { DependencyGraph } from './dependency-graph';
import {
  ConstraintEngine,
  computeDeterministicDistanceMeters,
} from './constraint-engine';

function calculateSnapshotRouteDistance(snapshot: JourneySnapshot): number {
  const active = snapshot.items
    .filter((i) => i.status !== 'cancelled')
    .sort(
      (a, b) => a.dayNumber - b.dayNumber || a.sequenceOrder - b.sequenceOrder
    );
  let total = 0;
  for (let i = 0; i < active.length - 1; i++) {
    if (active[i].dayNumber === active[i + 1].dayNumber) {
      total += computeDeterministicDistanceMeters(
        active[i].location.latitude,
        active[i].location.longitude,
        active[i + 1].location.latitude,
        active[i + 1].location.longitude
      );
    }
  }
  return total;
}

export class JourneySimulator {
  /**
   * Legacy Phase 00-03 simulator method (preserved for backward compatibility)
   */
  public static simulate(
    journeyId: string,
    currentItinerary: ItineraryItem[],
    proposal: AlternativeProposal,
    currentBudget: number,
    dependencies: ItineraryDependency[] = []
  ): SimulationResult {
    const proposedItinerary: ItineraryItem[] =
      structuredClone(currentItinerary);

    const graphBefore = new DependencyGraph(currentItinerary, dependencies);
    const conflictsBefore = graphBefore.detectConflicts();

    proposal.replacement_items.forEach((newItem) => {
      const idx = proposedItinerary.findIndex((item) => item.id === newItem.id);
      if (idx !== -1) {
        proposedItinerary[idx] = { ...proposedItinerary[idx], ...newItem };
      } else {
        proposedItinerary.push(newItem);
      }
    });

    const graphAfter = new DependencyGraph(proposedItinerary, dependencies);
    const conflictsAfter = graphAfter.detectConflicts();

    const remainingUnresolved = conflictsAfter.length;
    const resolvedCount = Math.max(
      0,
      conflictsBefore.length - conflictsAfter.length
    );

    const budgetAfter = currentBudget + proposal.price_delta;

    return {
      journey_id: journeyId,
      proposal_id: proposal.id,
      original_itinerary: currentItinerary,
      proposed_itinerary: proposedItinerary,
      budget_before: currentBudget,
      budget_after: budgetAfter,
      resolved_conflicts_count: resolvedCount,
      remaining_unresolved_count: remainingUnresolved,
    };
  }

  /**
   * Phase 04 Pure, Immutable Before/After Journey Simulator.
   * Never mutates live state (`snapshot`). Returns full `beforeSnapshot`, `afterSnapshot`,
   * structured `SimulationDiff`, and post-simulation `ConstraintEvaluationResult`.
   */
  public static simulateAlternative(params: {
    snapshot: JourneySnapshot;
    disruptedItemId: string;
    alternative: ScoredAlternative;
  }): FullSimulationOutput {
    const { snapshot, disruptedItemId, alternative } = params;
    const constraintEngine = new ConstraintEngine();

    // 1. Deep-clone snapshots to guarantee zero mutation of live state
    const beforeSnapshot: JourneySnapshot = structuredClone(snapshot);
    const afterSnapshot: JourneySnapshot = structuredClone(snapshot);

    // Ensure disrupted item in beforeSnapshot is marked disrupted for baseline conflict check
    const beforeDisrupted = beforeSnapshot.items.find(
      (i) => i.id === disruptedItemId
    );
    if (beforeDisrupted && beforeDisrupted.status === 'confirmed') {
      beforeDisrupted.status = 'disrupted';
    }

    const beforeEval = constraintEngine.evaluateSnapshot(beforeSnapshot);
    const conflictsBefore = beforeEval.allViolations;

    // 2. Apply candidate replacement on afterSnapshot
    const targetIdx = afterSnapshot.items.findIndex(
      (i) => i.id === disruptedItemId
    );
    const originalItem =
      targetIdx !== -1 ? beforeSnapshot.items[targetIdx] : undefined;

    const changedItems: SimulationItemChange[] = [];
    const bookingChanges: SimulationDiff['bookingChanges'] = [];

    if (targetIdx !== -1 && originalItem) {
      const cand = alternative.candidate;
      afterSnapshot.items[targetIdx] = {
        ...afterSnapshot.items[targetIdx],
        title: cand.title,
        subtitle: cand.subtitle,
        startTimeIso: alternative.proposedStartTimeIso,
        endTimeIso: alternative.proposedEndTimeIso,
        displayWindow: alternative.displayWindow,
        location: cand.location,
        price: cand.priceAmount,
        currency: cand.currency,
        status: 'confirmed',
        visualState: 'CHANGED',
        bookingId: `bkg_${cand.id}`,
        bookingState: 'CONFIRMED',
        maxCapacity: cand.maxCapacity,
        categoryTags: cand.tags,
        openingTimeLocal: cand.openingTimeLocal,
        closingTimeLocal: cand.closingTimeLocal,
        vendorId: cand.vendorId,
        disruptionNote: undefined,
      };

      bookingChanges.push({
        bookingId: originalItem.bookingId || `bkg_${originalItem.id}`,
        itemId: originalItem.id,
        itemTitle: `${originalItem.title} → ${cand.title}`,
        previousStatus: originalItem.bookingState,
        newStatus: 'CONFIRMED',
        financialImpact: alternative.priceDelta,
      });
    }

    // 3. Apply any downstream schedule shifts (e.g., shifting Beachside Café from 16:30 to 17:00)
    alternative.downstreamShifts.forEach((shift) => {
      const idx = afterSnapshot.items.findIndex((i) => i.id === shift.itemId);
      if (idx !== -1) {
        afterSnapshot.items[idx] = {
          ...afterSnapshot.items[idx],
          startTimeIso: shift.newStartIso,
          endTimeIso: shift.newEndIso,
          displayWindow: shift.newDisplayWindow,
          status: 'confirmed',
          visualState: 'CHANGED',
        };
      }
    });

    // 4. Update allocated cost on afterSnapshot
    const budgetBefore = beforeSnapshot.allocatedCost;
    const budgetAfter = budgetBefore + alternative.priceDelta;
    afterSnapshot.allocatedCost = budgetAfter;
    afterSnapshot.status = 'booked';

    // 5. Build item-by-item comparison table
    beforeSnapshot.items.forEach((bItem, idx) => {
      const aItem = afterSnapshot.items[idx];
      if (!aItem) return;

      let changeType: SimulationItemChange['changeType'] = 'UNCHANGED';
      if (bItem.id === disruptedItemId) {
        changeType = 'REPLACED';
      } else if (
        bItem.startTimeIso !== aItem.startTimeIso ||
        bItem.endTimeIso !== aItem.endTimeIso
      ) {
        changeType = 'RESCHEDULED';
      }

      changedItems.push({
        itemId: bItem.id,
        beforeTitle: bItem.title,
        afterTitle: aItem.title,
        beforeWindow: bItem.displayWindow,
        afterWindow: aItem.displayWindow,
        beforeLocationName: bItem.location.name,
        afterLocationName: aItem.location.name,
        beforePrice: bItem.price,
        afterPrice: aItem.price,
        changeType,
      });
    });

    // 6. Re-evaluate constraints on afterSnapshot
    const afterConstraintEvaluation = constraintEngine.evaluateSnapshot(
      afterSnapshot,
      beforeSnapshot
    );
    const conflictsAfter = afterConstraintEvaluation.allViolations;

    const conflictsResolved = conflictsBefore.filter(
      (cb) =>
        !conflictsAfter.some(
          (ca) => ca.code === cb.code && ca.itemId === cb.itemId
        )
    );
    const conflictsIntroduced = conflictsAfter.filter(
      (ca) =>
        !conflictsBefore.some(
          (cb) => cb.code === ca.code && cb.itemId === ca.itemId
        )
    );

    const distBefore = calculateSnapshotRouteDistance(beforeSnapshot);
    const distAfter = calculateSnapshotRouteDistance(afterSnapshot);

    const diff: SimulationDiff = {
      alternativeId: alternative.id,
      alternativeTitle: alternative.candidate.title,
      changedItems,
      addedItems:
        targetIdx !== -1 ? [afterSnapshot.items[targetIdx]] : [],
      removedItems: originalItem ? [originalItem] : [],
      movedItems: alternative.downstreamShifts,
      timeDeltaMinutes: alternative.timeShiftMinutes,
      travelDistanceDeltaMeters: distAfter - distBefore,
      costDelta: alternative.priceDelta,
      budgetBefore,
      budgetAfter,
      totalBudgetLimit: afterSnapshot.totalBudget,
      remainingBudgetAfter: afterSnapshot.totalBudget - budgetAfter,
      conflictsBefore,
      conflictsAfter,
      conflictsResolved,
      conflictsIntroduced,
      bookingChanges,
      notificationPayloads: [
        {
          recipientRole: 'traveler',
          title: `Journey Updated: ${alternative.candidate.title} Confirmed`,
          message: `Replaced ${
            originalItem?.title || 'disrupted stop'
          } with ${alternative.candidate.title} (${
            alternative.displayWindow
          }). Net cost change: ${
            alternative.priceDelta <= 0
              ? `-${afterSnapshot.currency} ${Math.abs(
                  alternative.priceDelta
                ).toLocaleString()}`
              : `+${afterSnapshot.currency} ${alternative.priceDelta.toLocaleString()}`
          }.`,
        },
        {
          recipientRole: 'operator',
          title: `Operational Voucher Reallocated (${afterSnapshot.journeyId})`,
          message: `Voucher switched to ${
            alternative.candidate.vendorName || alternative.candidate.title
          }. All downstream buffers verified.`,
        },
      ],
    };

    return {
      journeyId: snapshot.journeyId,
      alternativeId: alternative.id,
      beforeSnapshot,
      afterSnapshot,
      diff,
      afterConstraintEvaluation,
    };
  }
}
