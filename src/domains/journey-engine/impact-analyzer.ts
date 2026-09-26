import type {
  ItineraryItem,
  ItineraryDependency,
  DisruptionSeverity,
} from '@/types/database.types';
import type {
  ChangeTriggerInput,
  DimensionImpact,
  DisruptionEvent,
  EngineSeverity,
  ImpactAnalysisResult,
  ImpactDimension,
  ImpactReport,
  JourneySnapshot,
} from './types';
import { DependencyGraph } from './dependency-graph';
import {
  ConstraintEngine,
  computeDeterministicDistanceMeters,
  computeDeterministicTravelMinutes,
} from './constraint-engine';

const SEVERITY_ORDER: Record<EngineSeverity, number> = {
  NONE: 0,
  INFO: 1,
  LOW: 2,
  MEDIUM: 3,
  HIGH: 4,
  CRITICAL: 5,
};

export function maxEngineSeverity(
  a: EngineSeverity,
  b: EngineSeverity
): EngineSeverity {
  return SEVERITY_ORDER[a] >= SEVERITY_ORDER[b] ? a : b;
}

export class ImpactAnalyzer {
  /**
   * Legacy Phase 00-03 analyzer method (preserved for backward compatibility)
   */
  public static analyze(
    disruption: DisruptionEvent,
    itineraryItems: ItineraryItem[],
    dependencies: ItineraryDependency[]
  ): ImpactReport {
    const graph = new DependencyGraph(itineraryItems, dependencies);
    const affectedItems = graph.getDownstreamItems(disruption.affected_item_id);
    const cascadingIds = affectedItems.map((item) => item.id);

    const impactDetails: ImpactReport['impact_details'] = [];
    let hasCritical = false;

    const primaryItem = itineraryItems.find(
      (i) => i.id === disruption.affected_item_id
    );

    affectedItems.forEach((item) => {
      if (item.id === disruption.affected_item_id) {
        const isCancellation =
          disruption.source === 'vendor_cancellation' ||
          disruption.description.toLowerCase().includes('cancel') ||
          disruption.description.toLowerCase().includes('unavailable');

        const severity: DisruptionSeverity = isCancellation
          ? 'critical'
          : 'high';
        if (severity === 'critical') hasCritical = true;

        impactDetails.push({
          item_id: item.id,
          item_title: item.title,
          type: 'time_overlap',
          severity,
          explanation: `Primary disruption detected: ${disruption.description}`,
        });
      } else {
        let severity: DisruptionSeverity = 'medium';

        if (item.item_type === 'transport') {
          severity = 'critical';
          hasCritical = true;
        } else if (item.item_type === 'accommodation') {
          severity = 'high';
        } else if (
          disruption.time_delta_minutes &&
          disruption.time_delta_minutes > 90
        ) {
          severity = 'high';
        } else if (
          disruption.time_delta_minutes &&
          disruption.time_delta_minutes < 20
        ) {
          severity = 'low';
        }

        const upstreamTitle = primaryItem?.title || 'upstream stop';

        impactDetails.push({
          item_id: item.id,
          item_title: item.title,
          type: 'missed_connection',
          severity,
          explanation: `Dependent sequence constraint breached due to disruption in ${upstreamTitle}. Expected impact: ${severity.toUpperCase()} priority rescheduling needed.`,
        });
      }
    });

    return {
      change_request_id: `cr_${Date.now()}`,
      journey_id: disruption.journey_id,
      disruption,
      affected_items_count: affectedItems.length,
      cascading_item_ids: cascadingIds,
      has_critical_conflict: hasCritical,
      impact_details: impactDetails,
    };
  }

  /**
   * Phase 04 Authoritative 10-Dimension Impact Analyzer
   * Evaluates DIRECT, DOWNSTREAM, TEMPORAL, SPATIAL, BOOKING, BUDGET, CAPACITY,
   * TRAVELER, OPERATIONAL, and NOTIFICATION impacts with explicit severity classification.
   */
  public static analyzeSnapshot(
    snapshot: JourneySnapshot,
    trigger: ChangeTriggerInput,
    changeRequestId = `cr_${snapshot.journeyId}_v${snapshot.version}`
  ): ImpactAnalysisResult {
    const graph = DependencyGraph.fromSnapshot(snapshot);
    const constraintEngine = new ConstraintEngine();

    // Mutate a temporary working clone of snapshot to reflect the incoming trigger before evaluating constraints
    const workingSnapshot: JourneySnapshot = structuredClone(snapshot);
    const primaryItem = workingSnapshot.items.find(
      (i) => i.id === trigger.affectedItemId
    );

    if (primaryItem) {
      if (
        trigger.triggerType === 'ITEM_CANCELLED' ||
        trigger.triggerType === 'BOOKING_UNAVAILABLE'
      ) {
        primaryItem.status = 'disrupted';
        primaryItem.disruptionNote = trigger.reason;
      } else if (
        trigger.triggerType === 'ITEM_DELAYED' ||
        trigger.triggerType === 'TIME_SHIFTED'
      ) {
        if (trigger.newStartTimeIso && trigger.newEndTimeIso) {
          primaryItem.startTimeIso = trigger.newStartTimeIso;
          primaryItem.endTimeIso = trigger.newEndTimeIso;
        } else if (trigger.timeDeltaMinutes) {
          const shiftMs = trigger.timeDeltaMinutes * 60 * 1000;
          primaryItem.startTimeIso = new Date(
            new Date(primaryItem.startTimeIso).getTime() + shiftMs
          ).toISOString();
          primaryItem.endTimeIso = new Date(
            new Date(primaryItem.endTimeIso).getTime() + shiftMs
          ).toISOString();
        }
      } else if (
        trigger.triggerType === 'LOCATION_CHANGED' &&
        trigger.newLocation
      ) {
        primaryItem.location = trigger.newLocation;
      } else if (
        trigger.triggerType === 'TRAVEL_MODE_CHANGED' &&
        trigger.newTravelMode
      ) {
        primaryItem.travelModeToNext = trigger.newTravelMode;
      }
    }

    if (
      trigger.triggerType === 'BUDGET_CHANGED' &&
      trigger.newTotalBudget !== undefined
    ) {
      workingSnapshot.totalBudget = trigger.newTotalBudget;
    }

    if (
      trigger.triggerType === 'PARTY_SIZE_CHANGED' &&
      trigger.newPartySize !== undefined
    ) {
      workingSnapshot.travelersCount = trigger.newPartySize;
      workingSnapshot.items.forEach((item) => {
        item.partySize = trigger.newPartySize!;
      });
    }

    if (
      trigger.triggerType === 'PREFERENCE_UPDATED' &&
      trigger.newStyles !== undefined
    ) {
      workingSnapshot.travelStyles = [...trigger.newStyles];
    }

    const constraintEvaluation =
      constraintEngine.evaluateSnapshot(workingSnapshot);

    const directItemIds = primaryItem ? [primaryItem.id] : [];
    const downstreamItemIds = primaryItem
      ? graph.getDownstreamNodes(primaryItem.id, false)
      : [];
    const upstreamItemIds = primaryItem
      ? graph.getUpstreamNodes(primaryItem.id, false)
      : [];

    const dependencyPaths: Record<string, string[]> = {};
    if (primaryItem) {
      downstreamItemIds.forEach((downId) => {
        dependencyPaths[downId] = graph.getDependencyPath(
          primaryItem.id,
          downId
        );
      });
    }

    const downstreamTitles = downstreamItemIds
      .map(
        (id) =>
          workingSnapshot.items.find((i) => i.id === id)?.title || id
      )
      .join(', ');

    // 1. DIRECT IMPACT
    const isCancellation =
      trigger.triggerType === 'ITEM_CANCELLED' ||
      trigger.triggerType === 'BOOKING_UNAVAILABLE';
    const directSeverity: EngineSeverity = isCancellation
      ? 'CRITICAL'
      : trigger.triggerType === 'PREFERENCE_UPDATED'
      ? 'INFO'
      : trigger.timeDeltaMinutes && Math.abs(trigger.timeDeltaMinutes) <= 15
      ? 'LOW'
      : 'HIGH';

    const directImpact: DimensionImpact = {
      dimension: 'DIRECT',
      severity: directSeverity,
      affectedItemIds: directItemIds,
      conflictCode: isCancellation
        ? 'PRIMARY_ACTIVITY_UNAVAILABLE'
        : `DIRECT_${trigger.triggerType}`,
      explanation: primaryItem
        ? `Direct impact on "${primaryItem.title}" (${primaryItem.displayWindow}): ${trigger.reason}`
        : `Journey-level trigger (${trigger.triggerType}): ${trigger.reason}`,
      metrics: {
        triggerType: trigger.triggerType,
        originalPrice: primaryItem?.price ?? 0,
      },
    };

    // 2. DOWNSTREAM IMPACT
    const downstreamSeverity: EngineSeverity =
      downstreamItemIds.length === 0
        ? 'NONE'
        : downstreamItemIds.some((id) => {
            const it = workingSnapshot.items.find((x) => x.id === id);
            return (
              it?.type === 'flight' ||
              it?.type === 'accommodation' ||
              it?.isLocked
            );
          })
        ? 'CRITICAL'
        : isCancellation
        ? 'HIGH'
        : 'MEDIUM';

    const downstreamImpact: DimensionImpact = {
      dimension: 'DOWNSTREAM',
      severity: downstreamSeverity,
      affectedItemIds: downstreamItemIds,
      conflictCode:
        downstreamItemIds.length > 0
          ? 'DOWNSTREAM_DEPENDENCY_CASCADE'
          : 'NO_DOWNSTREAM_DEPENDENTS',
      explanation:
        downstreamItemIds.length > 0
          ? `${downstreamItemIds.length} downstream stop(s) depend on "${
              primaryItem?.title || 'root stop'
            }": ${downstreamTitles}.`
          : 'No downstream stops depend on this item.',
      metrics: {
        downstreamCount: downstreamItemIds.length,
      },
    };

    // 3. TEMPORAL IMPACT
    const temporalViolations = constraintEvaluation.allViolations.filter(
      (v) => v.category === 'TEMPORAL' || v.category === 'TRANSFER_BUFFER'
    );
    const temporalSeverity: EngineSeverity =
      temporalViolations.some((v) => v.code === 'ITEM_TIME_OVERLAP')
        ? 'CRITICAL'
        : temporalViolations.length > 0
        ? 'HIGH'
        : trigger.timeDeltaMinutes
        ? Math.abs(trigger.timeDeltaMinutes) > 30
          ? 'MEDIUM'
          : 'LOW'
        : isCancellation
        ? 'MEDIUM'
        : 'NONE';

    const temporalImpact: DimensionImpact = {
      dimension: 'TEMPORAL',
      severity: temporalSeverity,
      affectedItemIds: [
        ...new Set([
          ...directItemIds,
          ...temporalViolations
            .map((v) => v.itemId)
            .filter((x): x is string => Boolean(x)),
        ]),
      ],
      conflictCode:
        temporalViolations[0]?.code ||
        (isCancellation ? 'VACATED_TIME_SLOT' : 'SCHEDULE_INTACT'),
      explanation:
        temporalViolations.length > 0
          ? temporalViolations.map((v) => v.explanation).join(' ')
          : isCancellation && primaryItem
          ? `Time window ${primaryItem.displayWindow} is vacated and open for replacement.`
          : 'All day time windows remain chronologically ordered without overlap.',
      metrics: {
        timeDeltaMinutes: trigger.timeDeltaMinutes ?? 0,
        temporalViolationsCount: temporalViolations.length,
      },
    };

    // 4. SPATIAL IMPACT
    const spatialViolations = constraintEvaluation.allViolations.filter(
      (v) => v.category === 'SPATIAL'
    );
    let legDistanceMeters = 0;
    let legTravelMinutes = 0;
    if (primaryItem && downstreamItemIds.length > 0) {
      const firstDownstream = workingSnapshot.items.find(
        (i) => i.id === downstreamItemIds[0]
      );
      if (firstDownstream) {
        legDistanceMeters = computeDeterministicDistanceMeters(
          primaryItem.location.latitude,
          primaryItem.location.longitude,
          firstDownstream.location.latitude,
          firstDownstream.location.longitude
        );
        legTravelMinutes = computeDeterministicTravelMinutes(
          legDistanceMeters,
          primaryItem.travelModeToNext
        );
      }
    }

    const spatialSeverity: EngineSeverity =
      spatialViolations.length > 0
        ? 'CRITICAL'
        : isCancellation || trigger.triggerType === 'LOCATION_CHANGED'
        ? 'MEDIUM'
        : 'LOW';

    const spatialImpact: DimensionImpact = {
      dimension: 'SPATIAL',
      severity: spatialSeverity,
      affectedItemIds: directItemIds,
      conflictCode:
        spatialViolations[0]?.code || 'ROUTE_CORRIDOR_RECALCULATION',
      explanation:
        spatialViolations.length > 0
          ? spatialViolations.map((v) => v.explanation).join(' ')
          : primaryItem
          ? `Route corridor through "${primaryItem.location.name}" requires re-evaluation (${(
              legDistanceMeters / 1000
            ).toFixed(1)} km / ${legTravelMinutes} min transit leg).`
          : 'Route geometry unchanged.',
      metrics: {
        legDistanceMeters,
        legTravelMinutes,
      },
    };

    // 5. BOOKING IMPACT
    const bookingSeverity: EngineSeverity =
      primaryItem?.bookingState === 'CONFIRMED' && isCancellation
        ? 'HIGH'
        : primaryItem?.bookingState === 'NON_REFUNDABLE'
        ? 'CRITICAL'
        : primaryItem?.bookingId
        ? 'MEDIUM'
        : 'LOW';

    const bookingImpact: DimensionImpact = {
      dimension: 'BOOKING',
      severity: bookingSeverity,
      affectedItemIds: directItemIds,
      conflictCode:
        primaryItem?.bookingState === 'CONFIRMED' && isCancellation
          ? 'CONFIRMED_BOOKING_CANCELLATION'
          : 'BOOKING_STATUS_CHECK',
      explanation: primaryItem
        ? `Booking state for "${primaryItem.title}" is ${primaryItem.bookingState}${
            isCancellation
              ? `; vendor credit/refund of ${workingSnapshot.currency} ${primaryItem.price.toLocaleString()} triggered.`
              : '.'
          }`
        : 'No individual booking record directly mutated.',
      metrics: {
        bookingState: primaryItem?.bookingState || 'NONE',
        refundableAmount: isCancellation ? primaryItem?.price ?? 0 : 0,
      },
    };

    // 6. BUDGET IMPACT
    const budgetViolations = constraintEvaluation.allViolations.filter(
      (v) => v.category === 'BUDGET'
    );
    const budgetSeverity: EngineSeverity = budgetViolations.some(
      (v) => v.isHardConstraint
    )
      ? 'HIGH'
      : budgetViolations.length > 0
      ? 'LOW'
      : isCancellation
      ? 'INFO'
      : 'NONE';

    const budgetImpact: DimensionImpact = {
      dimension: 'BUDGET',
      severity: budgetSeverity,
      affectedItemIds: directItemIds,
      conflictCode:
        budgetViolations[0]?.code ||
        (isCancellation ? 'CREDIT_AVAILABLE_FOR_REPLACEMENT' : 'WITHIN_BUDGET'),
      explanation:
        budgetViolations.length > 0
          ? budgetViolations.map((v) => v.explanation).join(' ')
          : isCancellation && primaryItem
          ? `Cancelling "${primaryItem.title}" releases ${workingSnapshot.currency} ${primaryItem.price.toLocaleString()} from current allocated cost of ${workingSnapshot.currency} ${workingSnapshot.allocatedCost.toLocaleString()} (Budget cap: ${workingSnapshot.currency} ${workingSnapshot.totalBudget.toLocaleString()}).`
          : `Allocated cost ${workingSnapshot.currency} ${workingSnapshot.allocatedCost.toLocaleString()} is within budget ${workingSnapshot.currency} ${workingSnapshot.totalBudget.toLocaleString()}.`,
      metrics: {
        allocatedCost: workingSnapshot.allocatedCost,
        totalBudget: workingSnapshot.totalBudget,
        releasedAmount: isCancellation ? primaryItem?.price ?? 0 : 0,
      },
    };

    // 7. CAPACITY IMPACT
    const capacityViolations = constraintEvaluation.allViolations.filter(
      (v) => v.category === 'CAPACITY'
    );
    const capacitySeverity: EngineSeverity =
      capacityViolations.length > 0
        ? 'HIGH'
        : trigger.triggerType === 'PARTY_SIZE_CHANGED'
        ? 'MEDIUM'
        : 'NONE';

    const capacityImpact: DimensionImpact = {
      dimension: 'CAPACITY',
      severity: capacitySeverity,
      affectedItemIds: capacityViolations
        .map((v) => v.itemId)
        .filter((x): x is string => Boolean(x)),
      conflictCode:
        capacityViolations[0]?.code || 'PARTY_CAPACITY_VERIFIED',
      explanation:
        capacityViolations.length > 0
          ? capacityViolations.map((v) => v.explanation).join(' ')
          : `All replacement candidates must support ${workingSnapshot.travelersCount} traveler(s).`,
      metrics: {
        travelersCount: workingSnapshot.travelersCount,
      },
    };

    // 8. TRAVELER IMPACT
    const travelerSeverity: EngineSeverity = isCancellation
      ? 'HIGH'
      : temporalViolations.length > 0
      ? 'MEDIUM'
      : 'LOW';

    const travelerImpact: DimensionImpact = {
      dimension: 'TRAVELER',
      severity: travelerSeverity,
      affectedItemIds: [...directItemIds, ...downstreamItemIds],
      conflictCode: isCancellation
        ? 'EXPERIENCE_REPLACEMENT_NEEDED'
        : 'SCHEDULE_ADJUSTMENT',
      explanation: `Traveler preferences (${workingSnapshot.travelStyles.join(
        ', '
      )} • ${workingSnapshot.pace} pace) will be used to rank replacement options.`,
    };

    // 9. OPERATIONAL IMPACT
    const operationalSeverity: EngineSeverity =
      isCancellation || temporalViolations.length > 0 ? 'HIGH' : 'LOW';

    const operationalImpact: DimensionImpact = {
      dimension: 'OPERATIONAL',
      severity: operationalSeverity,
      affectedItemIds: [...directItemIds, ...downstreamItemIds],
      conflictCode: isCancellation
        ? 'OPERATOR_REBOOKING_REQUIRED'
        : 'ROUTINE_OPERATIONAL_UPDATE',
      explanation: isCancellation
        ? 'Operator/Coordinator must reallocate activity voucher and confirm downstream transfer timing.'
        : 'Operational schedule telemetry updated.',
    };

    // 10. NOTIFICATION IMPACT
    const notificationSeverity: EngineSeverity =
      isCancellation || temporalViolations.length > 0 ? 'HIGH' : 'INFO';

    const notificationImpact: DimensionImpact = {
      dimension: 'NOTIFICATION',
      severity: notificationSeverity,
      affectedItemIds: directItemIds,
      conflictCode: 'STAKEHOLDER_ALERT_REQUIRED',
      explanation: `Notifications queued for Traveler (${workingSnapshot.travelerId}) and Operator (${
        workingSnapshot.operatorId || 'ops_team'
      }).`,
    };

    const dimensions: Record<ImpactDimension, DimensionImpact> = {
      DIRECT: directImpact,
      DOWNSTREAM: downstreamImpact,
      TEMPORAL: temporalImpact,
      SPATIAL: spatialImpact,
      BOOKING: bookingImpact,
      BUDGET: budgetImpact,
      CAPACITY: capacityImpact,
      TRAVELER: travelerImpact,
      OPERATIONAL: operationalImpact,
      NOTIFICATION: notificationImpact,
    };

    const impactsList = Object.values(dimensions);
    let overallSeverity: EngineSeverity = 'NONE';
    impactsList.forEach((imp) => {
      overallSeverity = maxEngineSeverity(overallSeverity, imp.severity);
    });

    // Security invariant: Caller can request approval on LOW/INFO severity changes,
    // but can NEVER bypass approval when severity is MEDIUM, HIGH, or CRITICAL.
    const requiresApproval =
      SEVERITY_ORDER[overallSeverity] >= SEVERITY_ORDER.MEDIUM ||
      Boolean(trigger.requiresApproval);

    const requiresImmediateAttention =
      SEVERITY_ORDER[overallSeverity] >= SEVERITY_ORDER.HIGH;

    return {
      changeRequestId,
      journeyId: snapshot.journeyId,
      journeyVersion: snapshot.version,
      trigger,
      directItemIds,
      downstreamItemIds,
      upstreamItemIds,
      dependencyPaths,
      overallSeverity,
      dimensions,
      impactsList,
      constraintEvaluation,
      requiresApproval,
      requiresImmediateAttention,
      analyzedAt: new Date().toISOString(),
    };
  }
}
