import type {
  EngineChangeRequest,
  JourneySnapshot,
  LivingJourneyEngine,
  ScoredAlternative,
} from '@/domains/journey-engine/types';
import { sharedLivingJourneyEngine } from '@/domains/journey-engine';
import { JourneyRelevanceEngine } from './relevance-engine';
import type {
  ExternalEvent,
  ExternalEventJourneyImpact,
  WeatherEventChangeProposal,
} from './types';
import { calculateDataFreshness, computeEventFingerprint } from './normalization';

export interface WeatherNotificationRecord {
  id: string;
  deduplicationKey: string;
  journeyId: string;
  eventId: string;
  severity: string;
  title: string;
  message: string;
  affectedActivityTitle: string;
  actionUrl?: string;
  createdAt: string;
}

/**
 * PHASE 06 — EXTERNAL EVENT & WEATHER IMPACT COORDINATOR
 * Connects verified external events to the deterministic LivingJourneyEngine
 */
export class ExternalEventImpactCoordinator {
  private engine: LivingJourneyEngine;
  private knownEventsByFingerprint = new Map<string, ExternalEvent>();
  private activeEventsById = new Map<string, ExternalEvent>();
  private activeImpactsByJourney = new Map<string, ExternalEventJourneyImpact[]>();
  private activeProposalsByJourney = new Map<string, WeatherEventChangeProposal>();
  private dispatchedNotifications = new Map<string, WeatherNotificationRecord>();

  constructor(engine?: LivingJourneyEngine) {
    this.engine = engine || sharedLivingJourneyEngine;
  }

  public getActiveEvents(): ExternalEvent[] {
    return Array.from(this.activeEventsById.values());
  }

  public getEventById(eventId: string): ExternalEvent | undefined {
    return this.activeEventsById.get(eventId);
  }

  public getImpactsForJourney(journeyId: string): ExternalEventJourneyImpact[] {
    return this.activeImpactsByJourney.get(journeyId) || [];
  }

  public getActiveProposalForJourney(journeyId: string): WeatherEventChangeProposal | undefined {
    return this.activeProposalsByJourney.get(journeyId);
  }

  public getDispatchedNotifications(): WeatherNotificationRecord[] {
    return Array.from(this.dispatchedNotifications.values());
  }

  public clear(): void {
    this.knownEventsByFingerprint.clear();
    this.activeEventsById.clear();
    this.activeImpactsByJourney.clear();
    this.activeProposalsByJourney.clear();
    this.dispatchedNotifications.clear();
  }

  /**
   * Ingests, validates, deduplicates, and evaluates an external event across a journey.
   * Enforces:
   * 1. Exact event deduplication
   * 2. Freshness check (stale data warns and abstains from high-impact disruption)
   * 3. Relevance engine evaluation
   * 4. Idempotent change request registration on LivingJourneyEngine
   * 5. Notification deduplication
   */
  public async processExternalEventOnJourney(params: {
    event: ExternalEvent;
    journeyId: string;
    actorId: string;
    actorRole: 'traveler' | 'operator' | 'admin' | 'system';
    actorOrganizationId?: string;
    protectedItemIds?: string[];
  }): Promise<{
    eventProcessed: boolean;
    isDuplicate: boolean;
    isStale: boolean;
    impacts: ExternalEventJourneyImpact[];
    changeRequest?: EngineChangeRequest;
    proposal?: WeatherEventChangeProposal;
    notification?: WeatherNotificationRecord;
  }> {
    const { event, journeyId, actorId, actorRole, actorOrganizationId, protectedItemIds } = params;

    // 1. Check Event Deduplication Fingerprint
    const fingerprint = computeEventFingerprint({
      provider: event.provider,
      providerEventId: event.providerEventId,
      category: event.category,
      effectiveFrom: event.effectiveFrom,
      effectiveUntil: event.effectiveUntil,
      latitude: event.latitude,
      longitude: event.longitude,
    });

    const existingEvent = this.knownEventsByFingerprint.get(fingerprint);
    if (existingEvent && existingEvent.version >= event.version) {
      // Duplicate exact event already processed
      return {
        eventProcessed: true,
        isDuplicate: true,
        isStale: event.freshness === 'STALE' || event.freshness === 'EXPIRED',
        impacts: this.getImpactsForJourney(journeyId),
        proposal: this.activeProposalsByJourney.get(journeyId),
      };
    }

    this.knownEventsByFingerprint.set(fingerprint, event);
    this.activeEventsById.set(event.id, event);

    // 2. Freshness Invariant: Stale data safety check
    const isStale = event.freshness === 'STALE' || event.freshness === 'EXPIRED';

    const snapshot = this.engine.getSnapshot(journeyId);
    if (!snapshot) {
      return {
        eventProcessed: false,
        isDuplicate: false,
        isStale,
        impacts: [],
      };
    }

    // 3. Deterministic Relevance & Spatial/Temporal Evaluation
    const impacts = JourneyRelevanceEngine.evaluateJourneyEventImpacts({
      event,
      snapshot,
    });

    this.activeImpactsByJourney.set(journeyId, impacts);

    // Filter to actionable impacts (HIGH or CRITICAL)
    const actionableImpacts = impacts.filter(
      (imp) => imp.disruptionRisk === 'HIGH' || imp.disruptionRisk === 'CRITICAL'
    );

    if (actionableImpacts.length === 0 || isStale) {
      // Informational or stale; no operational mutation or change request created
      return {
        eventProcessed: true,
        isDuplicate: false,
        isStale,
        impacts,
      };
    }

    const primaryImpact = actionableImpacts[0];
    const affectedItemId = primaryImpact.affectedItemIds[0];
    const affectedItem = snapshot.items.find((i) => i.id === affectedItemId);

    if (!affectedItem) {
      return {
        eventProcessed: true,
        isDuplicate: false,
        isStale,
        impacts,
      };
    }

    // 4. Register Disruption on LivingJourneyEngine
    const idempotencyKey = `idem_ext_${event.id}_v${snapshot.version}_${affectedItemId}`;
    const changeReq = this.engine.detectAndAnalyzeChange({
      idempotencyKey,
      journeyId,
      triggerType: primaryImpact.recommendedTrigger,
      actorId,
      actorRole,
      actorOrganizationId,
      affectedItemId,
      title: `${affectedItem.title} Attention (${event.title})`,
      reason: `Authoritative ${event.provider} advisory (${event.category}): ${event.description}`,
      protectedItemIds: protectedItemIds || [],
      requiresApproval: true,
    });

    primaryImpact.changeRequestId = changeReq.id;

    // 5. Build Structured Weather Change Proposal if valid alternatives exist
    let proposal: WeatherEventChangeProposal | undefined;
    const topAlt: ScoredAlternative | undefined = changeReq.scoredAlternatives[0];

    if (topAlt) {
      const proposalId = `prop_wx_${event.id}_v${snapshot.version}_${topAlt.id}`;
      proposal = {
        proposalId,
        requestId: `req_${Date.now()}`,
        correlationId: `corr_wx_${event.id}`,
        idempotencyKey: `idem_apply_wx_${changeReq.id}_v${snapshot.version}_${topAlt.id}`,
        journeyId: snapshot.journeyId,
        journeyVersion: snapshot.version,
        expectedJourneyVersion: snapshot.version,
        changeRequestId: changeReq.id,
        disruptedItemId: affectedItem.id,
        disruptedItemTitle: affectedItem.title,
        recommendedAlternativeId: topAlt.id,
        recommendedAlternativeTitle: topAlt.candidate.title,
        recommendedScore: topAlt.scoreBreakdown.totalScore,
        validAlternativesCount: changeReq.scoredAlternatives.length,
        rejectedCandidatesCount: changeReq.rejectedCandidates.length,
        priceDelta: topAlt.priceDelta,
        budgetBefore: topAlt.budgetBefore,
        budgetAfter: topAlt.budgetAfter,
        totalBudgetLimit: snapshot.totalBudget,
        remainingBudgetAfter: snapshot.totalBudget - topAlt.budgetAfter,
        currency: snapshot.currency,
        preservedItemIds: protectedItemIds || [],
        preservedItemTitles: (protectedItemIds || []).map(
          (pid) => snapshot.items.find((i) => i.id === pid)?.title || pid
        ),
        downstreamShiftsCount: topAlt.downstreamShifts.length,
        requiresHumanApproval: true,
        approvalState: 'AWAITING_HUMAN_APPROVAL',
        simulationSummary: {
          beforeWindow: affectedItem.displayWindow,
          afterWindow: topAlt.displayWindow,
          conflictsResolved: topAlt.conflictsResolvedCount,
          conflictsRemaining: topAlt.conflictsRemainingCount,
        },
        sourceEventId: event.id,
        sourceProvider: event.provider,
        sourceProviderEventId: event.providerEventId,
        eventSeverity: event.severity,
        eventTitle: event.title,
        activityWeatherSensitivity: primaryImpact.activitySensitivity,
        downstreamShiftSummary:
          topAlt.downstreamShifts.length > 0
            ? `${topAlt.downstreamShifts.length} downstream stops shifted safely`
            : 'No downstream shifts',
      } as WeatherEventChangeProposal;

      this.activeProposalsByJourney.set(journeyId, proposal);
      primaryImpact.proposalGenerated = true;
      primaryImpact.proposalId = proposalId;
    }

    // 6. Notification Deduplication Dispatch
    const notificationKey = `notif_${event.id}_${journeyId}_${event.severity}`;
    let notification: WeatherNotificationRecord | undefined;

    if (!this.dispatchedNotifications.has(notificationKey)) {
      notification = {
        id: `notif_${Date.now()}`,
        deduplicationKey: notificationKey,
        journeyId,
        eventId: event.id,
        severity: event.severity,
        title: `Weather Alert: ${affectedItem.title}`,
        message: `${event.title} may affect your ${affectedItem.displayWindow} ${affectedItem.title} activity. TripPlanner evaluated ${changeReq.scoredAlternatives.length} valid alternatives.`,
        affectedActivityTitle: affectedItem.title,
        actionUrl: `/journey/${journeyId}/changes`,
        createdAt: new Date().toISOString(),
      };
      this.dispatchedNotifications.set(notificationKey, notification);
    }

    return {
      eventProcessed: true,
      isDuplicate: false,
      isStale: false,
      impacts,
      changeRequest: changeReq,
      proposal,
      notification,
    };
  }

  /**
   * Resolves an external event when the atmospheric condition passes.
   * Enforces:
   * 1. Event status becomes 'RESOLVED'
   * 2. Active impacts are cleared
   * 3. NO AUTOMATIC ROLLBACK: Approved itinerary changes remain intact!
   */
  public resolveExternalEvent(eventId: string): {
    resolved: boolean;
    event?: ExternalEvent;
  } {
    const event = this.activeEventsById.get(eventId);
    if (!event) return { resolved: false };

    event.status = 'RESOLVED';
    event.version++;

    // Clear active impacts for this resolved event
    for (const [jId, impacts] of this.activeImpactsByJourney.entries()) {
      const remaining = impacts.filter((imp) => imp.eventId !== eventId);
      this.activeImpactsByJourney.set(jId, remaining);
    }

    return { resolved: true, event };
  }
}

export const sharedExternalEventImpactCoordinator =
  new ExternalEventImpactCoordinator(sharedLivingJourneyEngine);
