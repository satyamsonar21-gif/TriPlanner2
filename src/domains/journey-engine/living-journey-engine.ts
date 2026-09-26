import type { UserRole } from '@/types/database.types';
import { DEMO_LOCATION_FIXTURES, normalizeGeoLocation } from '@/domains/geo';
import { AuditService } from '@/domains/audit/audit.service';
import { ImpactAnalyzer } from './impact-analyzer';
import {
  AlternativeEngine,
  CANDIDATE_INVENTORY_CATALOG,
} from './alternative-engine';
import { ConstraintEngine } from './constraint-engine';
import { JourneySimulator } from './simulator';
import type {
  ApplyChangeResult,
  CandidateActivity,
  ChangePlan,
  ChangeRequestState,
  ChangeSet,
  ChangeTriggerInput,
  DomainOutboxEvent,
  EngineChangeRequest,
  FullSimulationOutput,
  ImpactAnalysisResult,
  JourneySnapshot,
  Phase05AiBoundaryContract,
  Phase06EventBoundaryContract,
  ScoredAlternative,
} from './types';

/**
 * Valid deterministic state transitions for the 12-state ChangeRequest lifecycle
 */
export const VALID_CHANGE_STATE_TRANSITIONS: Record<
  ChangeRequestState,
  ChangeRequestState[]
> = {
  DRAFT: ['ANALYZING', 'CANCELLED', 'SUPERSEDED'],
  ANALYZING: [
    'ALTERNATIVES_READY',
    'AWAITING_APPROVAL',
    'FAILED',
    'CANCELLED',
    'SUPERSEDED',
  ],
  ALTERNATIVES_READY: [
    'AWAITING_APPROVAL',
    'APPROVED',
    'REJECTED',
    'EXPIRED',
    'CANCELLED',
    'SUPERSEDED',
  ],
  AWAITING_APPROVAL: [
    'APPROVED',
    'REJECTED',
    'EXPIRED',
    'CANCELLED',
    'SUPERSEDED',
  ],
  APPROVED: ['APPLYING', 'EXPIRED', 'CANCELLED', 'SUPERSEDED'],
  APPLYING: ['APPLIED', 'FAILED'],
  APPLIED: [],
  REJECTED: [],
  EXPIRED: [],
  FAILED: [],
  CANCELLED: [],
  SUPERSEDED: [],
};

export function isValidChangeStateTransition(
  from: ChangeRequestState,
  to: ChangeRequestState
): boolean {
  return VALID_CHANGE_STATE_TRANSITIONS[from]?.includes(to) ?? false;
}

function findGoaDemoLoc(
  id: string,
  name: string,
  lat: number,
  lng: number
) {
  const found = DEMO_LOCATION_FIXTURES.find((f) => f.id === id);
  if (found) return found;
  return normalizeGeoLocation({
    id,
    name,
    latitude: lat,
    longitude: lng,
    formattedAddress: `${name}, Goa, India`,
    city: 'Panjim',
    region: 'Goa',
    country: 'India',
    countryCode: 'IN',
    provider: 'mock',
    locationType: 'attraction',
    isDemoFixture: true,
  });
}

/**
 * Builds the canonical Goa Killer Demo JourneySnapshot:
 * - Journey: Goa Getaway (`jrn_goa_01`)
 * - Version: 17
 * - Travelers: 2
 * - Preferences: Adventure, Beaches, Food
 * - Total Budget: ₹40,000
 * - Current Allocated Cost: ₹38,700
 * - Day 2 Schedule:
 *   09:00 Breakfast at Seashell Beach Resort
 *   11:00 Fort Aguada Heritage Visit
 *   14:00 Baga Reef Scuba Diving (₹3,200)
 *   16:30 Fontainhas Beachside Café Bodega (₹1,600)
 *   19:00 Mum's Kitchen Portuguese Dinner (₹4,800)
 */
export function createGoaDemoJourneySnapshot(): JourneySnapshot {
  return {
    journeyId: 'jrn_goa_01',
    version: 17,
    title: 'Goa Getaway',
    destinationId: 'dest_goa_01',
    startDate: '2026-05-12',
    endDate: '2026-05-16',
    travelersCount: 2,
    travelStyles: ['Adventure', 'Beaches', 'Food'],
    pace: 'balanced',
    totalBudget: 40000,
    allocatedCost: 38700,
    currency: 'INR',
    hardBudgetConstraint: true,
    softBudgetTolerancePct: 5,
    status: 'active',
    travelerId: 'usr_traveler_01',
    operatorId: 'usr_operator_01',
    coordinatorId: 'usr_coord_01',
    organizationId: 'org_goa_ops_01',
    passportReferenceCode: 'GOA260512<<5D4N<<ADVENTURE',
    capturedAt: '2026-05-13T08:00:00Z',
    items: [
      {
        id: 'itm_goa_01_hotel',
        journeyId: 'jrn_goa_01',
        dayNumber: 2,
        sequenceOrder: 1,
        type: 'accommodation',
        title: 'Seashell Beach Resort Breakfast & Briefing',
        subtitle: 'Candolim Beachfront Terrace',
        startTimeIso: '2026-05-13T09:00:00Z',
        endTimeIso: '2026-05-13T10:15:00Z',
        displayWindow: '09:00 – 10:15',
        location: findGoaDemoLoc(
          'loc_goa_hotel_candolim',
          'Seashell Beach Resort & Spa',
          15.5181,
          73.7626
        ),
        price: 12280,
        currency: 'INR',
        status: 'confirmed',
        visualState: 'NORMAL',
        bookingId: 'bkg_goa_hotel_01',
        bookingState: 'NON_REFUNDABLE',
        isLocked: true,
        partySize: 2,
        maxCapacity: 4,
        safetyBufferMinutes: 15,
        travelModeToNext: 'driving',
        categoryTags: ['Beaches', 'Relaxation'],
        openingTimeLocal: '06:00',
        closingTimeLocal: '23:00',
      },
      {
        id: 'itm_goa_02_fort',
        journeyId: 'jrn_goa_01',
        dayNumber: 2,
        sequenceOrder: 2,
        type: 'activity',
        title: 'Fort Aguada Visit',
        subtitle: '17th-Century Portuguese Lighthouse & Bastion',
        startTimeIso: '2026-05-13T11:00:00Z',
        endTimeIso: '2026-05-13T13:15:00Z',
        displayWindow: '11:00 – 13:15',
        location: findGoaDemoLoc(
          'loc_goa_fort_aguada',
          'Fort Aguada',
          15.4924,
          73.7737
        ),
        price: 1200,
        currency: 'INR',
        status: 'confirmed',
        visualState: 'NORMAL',
        bookingId: 'bkg_goa_fort_02',
        bookingState: 'CONFIRMED',
        isLocked: false,
        partySize: 2,
        maxCapacity: 20,
        safetyBufferMinutes: 15,
        travelModeToNext: 'driving',
        categoryTags: ['Heritage', 'Beaches'],
        openingTimeLocal: '08:30',
        closingTimeLocal: '17:30',
      },
      {
        id: 'itm_goa_03_scuba',
        journeyId: 'jrn_goa_01',
        dayNumber: 2,
        sequenceOrder: 3,
        type: 'activity',
        title: 'Baga Reef Scuba Diving',
        subtitle: 'Guided Coral Sanctuary Dive',
        startTimeIso: '2026-05-13T14:00:00Z',
        endTimeIso: '2026-05-13T15:45:00Z',
        displayWindow: '14:00 – 15:45',
        location: findGoaDemoLoc(
          'loc_goa_baga_scuba',
          'Baga Reef Scuba Diving Center',
          15.5553,
          73.7517
        ),
        price: 3200,
        currency: 'INR',
        status: 'confirmed',
        visualState: 'NORMAL',
        bookingId: 'bkg_goa_scuba_03',
        bookingState: 'CONFIRMED',
        isLocked: false,
        partySize: 2,
        maxCapacity: 10,
        safetyBufferMinutes: 15,
        travelModeToNext: 'driving',
        categoryTags: ['Adventure', 'Beaches'],
        openingTimeLocal: '08:00',
        closingTimeLocal: '17:00',
      },
      {
        id: 'itm_goa_04_cafe',
        journeyId: 'jrn_goa_01',
        dayNumber: 2,
        sequenceOrder: 4,
        type: 'meal',
        title: 'Fontainhas Beachside Café Bodega',
        subtitle: 'Artisan Courtyard Espresso & Pastries',
        startTimeIso: '2026-05-13T16:30:00Z',
        endTimeIso: '2026-05-13T17:45:00Z',
        displayWindow: '16:30 – 17:45',
        location: findGoaDemoLoc(
          'loc_goa_fontainhas_cafe',
          'Fontainhas Heritage Quarter & Café Bodega',
          15.4961,
          73.8313
        ),
        price: 1600,
        currency: 'INR',
        status: 'confirmed',
        visualState: 'NORMAL',
        bookingId: 'bkg_goa_cafe_04',
        bookingState: 'MODIFIABLE',
        isLocked: false,
        partySize: 2,
        maxCapacity: 16,
        safetyBufferMinutes: 15,
        travelModeToNext: 'driving',
        categoryTags: ['Food', 'Culture'],
        openingTimeLocal: '10:00',
        closingTimeLocal: '20:30',
      },
      {
        id: 'itm_goa_05_dinner',
        journeyId: 'jrn_goa_01',
        dayNumber: 2,
        sequenceOrder: 5,
        type: 'meal',
        title: "Mum's Kitchen Portuguese Dinner",
        subtitle: '7-Course Coastal Tasting Menu',
        startTimeIso: '2026-05-13T19:00:00Z',
        endTimeIso: '2026-05-13T21:00:00Z',
        displayWindow: '19:00 – 21:00',
        location: findGoaDemoLoc(
          'loc_goa_dinner_panjim',
          "Mum's Kitchen Portuguese Supper Club",
          15.4909,
          73.8278
        ),
        price: 4800,
        currency: 'INR',
        status: 'confirmed',
        visualState: 'NORMAL',
        bookingId: 'bkg_goa_dinner_05',
        bookingState: 'CONFIRMED',
        isLocked: true,
        partySize: 2,
        maxCapacity: 12,
        safetyBufferMinutes: 15,
        travelModeToNext: 'driving',
        categoryTags: ['Food', 'Culture'],
        openingTimeLocal: '18:00',
        closingTimeLocal: '23:00',
      },
    ],
    dependencies: [
      {
        id: 'dep_goa_1_to_2',
        journeyId: 'jrn_goa_01',
        fromItemId: 'itm_goa_01_hotel',
        toItemId: 'itm_goa_02_fort',
        type: 'REQUIRES_CHECKIN_AT',
        minBufferMinutes: 15,
        isHardConstraint: true,
      },
      {
        id: 'dep_goa_2_to_3',
        journeyId: 'jrn_goa_01',
        fromItemId: 'itm_goa_02_fort',
        toItemId: 'itm_goa_03_scuba',
        type: 'PRECEDES',
        minBufferMinutes: 15,
        isHardConstraint: true,
      },
      {
        id: 'dep_goa_3_to_4',
        journeyId: 'jrn_goa_01',
        fromItemId: 'itm_goa_03_scuba',
        toItemId: 'itm_goa_04_cafe',
        type: 'TRANSFERS_TO',
        minBufferMinutes: 15,
        isHardConstraint: true,
      },
      {
        id: 'dep_goa_4_to_5',
        journeyId: 'jrn_goa_01',
        fromItemId: 'itm_goa_04_cafe',
        toItemId: 'itm_goa_05_dinner',
        type: 'PRECEDES',
        minBufferMinutes: 15,
        isHardConstraint: true,
      },
    ],
  };
}

/**
 * Authoritative Living Journey Engine™ Orchestrator
 * Implements the full deterministic lifecycle:
 * PLAN → BOOK → MONITOR → DETECT → UNDERSTAND → IMPACT → ALTERNATIVES →
 * SIMULATE → APPROVE → APPLY → PROPAGATE → NOTIFY → AUDIT → CONTINUE
 */
export class LivingJourneyEngine
  implements Phase05AiBoundaryContract, Phase06EventBoundaryContract
{
  private snapshotsByJourneyId: Map<string, JourneySnapshot> = new Map();
  private changeRequestsById: Map<string, EngineChangeRequest> = new Map();
  private changeRequestByIdempotencyKey: Map<string, string> = new Map();
  private triggerFingerprintByIdempotencyKey: Map<string, string> = new Map();
  private applyResultByIdempotencyKey: Map<string, ApplyChangeResult> =
    new Map();
  private applyFingerprintByIdempotencyKey: Map<string, string> = new Map();
  private outboxEvents: DomainOutboxEvent[] = [];

  private constraintEngine: ConstraintEngine;
  private alternativeEngine: AlternativeEngine;

  constructor(initialSnapshots: JourneySnapshot[] = []) {
    this.constraintEngine = new ConstraintEngine();
    this.alternativeEngine = new AlternativeEngine({}, this.constraintEngine);

    const goaSnapshot = createGoaDemoJourneySnapshot();
    this.snapshotsByJourneyId.set(
      goaSnapshot.journeyId,
      structuredClone(goaSnapshot)
    );

    initialSnapshots.forEach((snap) => {
      this.snapshotsByJourneyId.set(snap.journeyId, structuredClone(snap));
    });
  }

  public registerSnapshot(snapshot: JourneySnapshot): void {
    this.snapshotsByJourneyId.set(
      snapshot.journeyId,
      structuredClone(snapshot)
    );
  }

  public getSnapshot(journeyId: string): JourneySnapshot | null {
    const snap = this.snapshotsByJourneyId.get(journeyId);
    return snap ? structuredClone(snap) : null;
  }

  public getChangeRequest(changeRequestId: string): EngineChangeRequest | null {
    const req = this.changeRequestsById.get(changeRequestId);
    return req ? structuredClone(req) : null;
  }

  public getChangeRequestsForJourney(journeyId: string): EngineChangeRequest[] {
    const list: EngineChangeRequest[] = [];
    this.changeRequestsById.forEach((req) => {
      if (req.journeyId === journeyId) {
        list.push(structuredClone(req));
      }
    });
    return list.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public getOutboxEventsForJourney(journeyId: string): DomainOutboxEvent[] {
    return this.outboxEvents
      .filter((e) => e.journeyId === journeyId)
      .map((e) => structuredClone(e));
  }

  private computeTriggerFingerprint(trigger: ChangeTriggerInput): string {
    return JSON.stringify({
      journeyId: trigger.journeyId,
      triggerType: trigger.triggerType,
      affectedItemId: trigger.affectedItemId || null,
      timeDeltaMinutes: trigger.timeDeltaMinutes ?? null,
      newStartTimeIso: trigger.newStartTimeIso ?? null,
      newEndTimeIso: trigger.newEndTimeIso ?? null,
      newTotalBudget: trigger.newTotalBudget ?? null,
      newPartySize: trigger.newPartySize ?? null,
    });
  }

  /**
   * STEP 1-4: DETECT -> UNDERSTAND -> IMPACT -> ALTERNATIVES -> SIMULATE -> AWAITING_APPROVAL
   * Idempotent: If called with an existing `idempotencyKey` and identical payload, returns the existing ChangeRequest.
   * Rejects with IDEMPOTENCY_KEY_PAYLOAD_MISMATCH if the key is reused with a different payload.
   */
  public detectAndAnalyzeChange(
    trigger: ChangeTriggerInput,
    customCandidates?: CandidateActivity[]
  ): EngineChangeRequest {
    const idempotencyKey =
      trigger.idempotencyKey ||
      `idem_${trigger.journeyId}_${trigger.triggerType}_${
        trigger.affectedItemId || 'root'
      }`;

    const triggerFingerprint = this.computeTriggerFingerprint(trigger);

    // Idempotency guard: duplicate event protection + payload collision check
    if (this.changeRequestByIdempotencyKey.has(idempotencyKey)) {
      const existingFingerprint =
        this.triggerFingerprintByIdempotencyKey.get(idempotencyKey);
      if (existingFingerprint && existingFingerprint !== triggerFingerprint) {
        throw new Error(
          `IDEMPOTENCY_KEY_PAYLOAD_MISMATCH: Idempotency key "${idempotencyKey}" was already used with a different trigger payload.`
        );
      }
      const existingId =
        this.changeRequestByIdempotencyKey.get(idempotencyKey)!;
      const existing = this.changeRequestsById.get(existingId);
      if (existing) {
        return structuredClone(existing);
      }
    }

    const snapshot = this.snapshotsByJourneyId.get(trigger.journeyId);
    if (!snapshot) {
      throw new Error(
        `JOURNEY_NOT_FOUND: Journey "${trigger.journeyId}" is not registered in LivingJourneyEngine.`
      );
    }

    // RBAC & Tenant Authorization check on trigger initiation
    if (
      !this.isActorAuthorized(
        snapshot,
        trigger.actorId,
        trigger.actorRole,
        trigger.actorOrganizationId
      ) ||
      (trigger.triggerType === 'OPERATOR_OVERRIDE' &&
        trigger.actorRole === 'traveler')
    ) {
      throw new Error(
        `UNAUTHORIZED_ACTOR: Actor "${trigger.actorId}" (${trigger.actorRole}) is not authorized to trigger "${trigger.triggerType}" for journey "${trigger.journeyId}".`
      );
    }

    // Reflect disruption alert status on the live snapshot item so UI shows ATTENTION
    const liveItem = snapshot.items.find(
      (i) => i.id === trigger.affectedItemId
    );
    if (
      liveItem &&
      (trigger.triggerType === 'ITEM_CANCELLED' ||
        trigger.triggerType === 'BOOKING_UNAVAILABLE')
    ) {
      liveItem.status = 'disrupted';
      liveItem.visualState = 'ATTENTION';
      liveItem.disruptionNote = trigger.reason;
      snapshot.status = 'disrupted';
    }

    const nowIso = new Date().toISOString();
    const changeRequestId = `cr_${trigger.journeyId}_v${snapshot.version}_${
      this.changeRequestsById.size + 1
    }`;

    const changeRequest: EngineChangeRequest = {
      id: changeRequestId,
      idempotencyKey,
      journeyId: snapshot.journeyId,
      expectedJourneyVersion: snapshot.version,
      state: 'DRAFT',
      trigger,
      severity: 'MEDIUM',
      requiresApproval: trigger.requiresApproval ?? true,
      scoredAlternatives: [],
      rejectedCandidates: [],
      simulationsByAlternativeId: {},
      expiresAt: trigger.expiresAtIso,
      stateHistory: [
        {
          fromState: 'INITIAL',
          toState: 'DRAFT',
          actorId: trigger.actorId,
          actorRole: trigger.actorRole,
          reason: `Change detected: ${trigger.title}`,
          timestamp: nowIso,
        },
      ],
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    this.emitOutboxEvent({
      idempotencyKey: `evt_detect_${idempotencyKey}`,
      journeyId: snapshot.journeyId,
      changeRequestId,
      eventType: 'CHANGE_DETECTED',
      recipientRoles: ['traveler', 'operator'],
      payload: {
        title: trigger.title,
        reason: trigger.reason,
        triggerType: trigger.triggerType,
        affectedItemId: trigger.affectedItemId,
      },
    });

    // Transition DRAFT -> ANALYZING
    this.transitionState(
      changeRequest,
      'ANALYZING',
      trigger.actorId,
      trigger.actorRole,
      'Running 10-dimension impact analysis and dependency traversal.'
    );

    const impactAnalysis = ImpactAnalyzer.analyzeSnapshot(
      snapshot,
      trigger,
      changeRequestId
    );
    changeRequest.impactAnalysis = impactAnalysis;
    changeRequest.severity = impactAnalysis.overallSeverity;
    changeRequest.requiresApproval = impactAnalysis.requiresApproval;

    this.emitOutboxEvent({
      idempotencyKey: `evt_impact_${idempotencyKey}`,
      journeyId: snapshot.journeyId,
      changeRequestId,
      eventType: 'IMPACT_ANALYZED',
      recipientRoles: ['traveler', 'operator'],
      payload: {
        overallSeverity: impactAnalysis.overallSeverity,
        downstreamCount: impactAnalysis.downstreamItemIds.length,
        requiresApproval: impactAnalysis.requiresApproval,
      },
    });

    // Generate & score alternatives if an item is affected
    if (trigger.affectedItemId) {
      const altOutput = this.alternativeEngine.generateAlternatives({
        snapshot,
        disruptedItemId: trigger.affectedItemId,
        candidates: customCandidates || CANDIDATE_INVENTORY_CATALOG,
      });

      changeRequest.scoredAlternatives = altOutput.validAlternatives;
      changeRequest.rejectedCandidates = altOutput.rejectedCandidates;

      // Simulate every valid alternative
      for (const alt of altOutput.validAlternatives) {
        const simOutput = JourneySimulator.simulateAlternative({
          snapshot,
          disruptedItemId: trigger.affectedItemId,
          alternative: alt,
        });
        changeRequest.simulationsByAlternativeId[alt.id] = simOutput;
      }

      if (altOutput.validAlternatives.length > 0) {
        const topAlt = altOutput.validAlternatives[0];
        changeRequest.selectedAlternativeId = topAlt.id;
        changeRequest.changePlan = this.buildChangePlan(
          changeRequest,
          topAlt,
          changeRequest.simulationsByAlternativeId[topAlt.id]
        );
      }
    }

    // Transition ANALYZING -> ALTERNATIVES_READY -> AWAITING_APPROVAL
    this.transitionState(
      changeRequest,
      'ALTERNATIVES_READY',
      'system',
      'system',
      `Synthesized ${changeRequest.scoredAlternatives.length} valid alternative(s); filtered out ${changeRequest.rejectedCandidates.length} invalid candidate(s).`
    );

    this.emitOutboxEvent({
      idempotencyKey: `evt_alts_${idempotencyKey}`,
      journeyId: snapshot.journeyId,
      changeRequestId,
      eventType: 'ALTERNATIVES_GENERATED',
      recipientRoles: ['traveler', 'operator'],
      payload: {
        validCount: changeRequest.scoredAlternatives.length,
        rejectedCount: changeRequest.rejectedCandidates.length,
        recommendedAlternativeId: changeRequest.selectedAlternativeId,
      },
    });

    if (changeRequest.requiresApproval) {
      this.transitionState(
        changeRequest,
        'AWAITING_APPROVAL',
        'system',
        'system',
        'Awaiting traveler or operator approval before mutating live journey state.'
      );

      this.emitOutboxEvent({
        idempotencyKey: `evt_await_${idempotencyKey}`,
        journeyId: snapshot.journeyId,
        changeRequestId,
        eventType: 'CHANGE_AWAITING_APPROVAL',
        recipientRoles: ['traveler', 'operator'],
        payload: {
          changeRequestId,
          recommendedAlternativeId: changeRequest.selectedAlternativeId,
        },
      });
    }

    this.changeRequestsById.set(changeRequestId, changeRequest);
    this.changeRequestByIdempotencyKey.set(idempotencyKey, changeRequestId);
    this.triggerFingerprintByIdempotencyKey.set(
      idempotencyKey,
      triggerFingerprint
    );

    void AuditService.recordEvent(
      'journey',
      snapshot.journeyId,
      'CHANGE_DETECTED_AND_ANALYZED',
      trigger.actorId,
      trigger.actorRole === 'system' ? 'operator' : trigger.actorRole,
      {
        changeRequestId,
        triggerType: trigger.triggerType,
        severity: changeRequest.severity,
        alternativesCount: changeRequest.scoredAlternatives.length,
      }
    );

    return structuredClone(changeRequest);
  }

  /**
   * Selects a different valid alternative for simulation & change planning before approval.
   */
  public selectAlternative(params: {
    changeRequestId: string;
    alternativeId: string;
    actorId: string;
    actorRole: UserRole;
    actorOrganizationId?: string;
  }): EngineChangeRequest {
    const req = this.changeRequestsById.get(params.changeRequestId);
    if (!req) {
      throw new Error(
        `CHANGE_REQUEST_NOT_FOUND: "${params.changeRequestId}" does not exist.`
      );
    }

    const snapshot = this.snapshotsByJourneyId.get(req.journeyId);
    if (!snapshot) {
      throw new Error(`JOURNEY_NOT_FOUND: "${req.journeyId}" does not exist.`);
    }

    if (
      !this.isActorAuthorized(
        snapshot,
        params.actorId,
        params.actorRole,
        params.actorOrganizationId
      )
    ) {
      throw new Error(
        `UNAUTHORIZED_ACTOR: Actor "${params.actorId}" (${params.actorRole}) is not authorized to select alternatives for journey "${req.journeyId}".`
      );
    }

    if (
      req.state !== 'ALTERNATIVES_READY' &&
      req.state !== 'AWAITING_APPROVAL'
    ) {
      throw new Error(
        `INVALID_STATE_TRANSITION: Cannot select alternative while in state ${req.state}.`
      );
    }

    const alt = req.scoredAlternatives.find(
      (a) => a.id === params.alternativeId
    );
    if (!alt) {
      throw new Error(
        `ALTERNATIVE_NOT_FOUND: "${params.alternativeId}" is not a valid scored alternative.`
      );
    }

    const sim = req.simulationsByAlternativeId[alt.id];
    req.selectedAlternativeId = alt.id;
    if (sim) {
      req.changePlan = this.buildChangePlan(req, alt, sim);
    }
    req.updatedAt = new Date().toISOString();

    return structuredClone(req);
  }

  /**
   * Approves a ChangeRequest (`AWAITING_APPROVAL` | `ALTERNATIVES_READY` -> `APPROVED`)
   */
  public approveChangeRequest(params: {
    changeRequestId: string;
    alternativeId?: string;
    actorId: string;
    actorRole: UserRole;
    actorOrganizationId?: string;
  }): EngineChangeRequest {
    const req = this.changeRequestsById.get(params.changeRequestId);
    if (!req) {
      throw new Error(
        `CHANGE_REQUEST_NOT_FOUND: "${params.changeRequestId}" does not exist.`
      );
    }

    const snapshot = this.snapshotsByJourneyId.get(req.journeyId);
    if (!snapshot) {
      throw new Error(`JOURNEY_NOT_FOUND: "${req.journeyId}" does not exist.`);
    }

    if (
      !this.isActorAuthorized(
        snapshot,
        params.actorId,
        params.actorRole,
        params.actorOrganizationId
      )
    ) {
      throw new Error(
        `UNAUTHORIZED_ACTOR: Actor "${params.actorId}" (${params.actorRole}) is not authorized to approve changes for journey "${req.journeyId}".`
      );
    }

    // Check expiration before approving
    if (
      req.expiresAt &&
      new Date(req.expiresAt).getTime() < Date.now()
    ) {
      this.transitionState(
        req,
        'EXPIRED',
        params.actorId,
        params.actorRole,
        'ChangeRequest expired prior to approval.'
      );
      throw new Error(
        `CHANGE_EXPIRED: ChangeRequest "${req.id}" expired at ${req.expiresAt}.`
      );
    }

    if (params.alternativeId) {
      const alt = req.scoredAlternatives.find(
        (a) => a.id === params.alternativeId
      );
      if (!alt) {
        throw new Error(
          `ALTERNATIVE_NOT_FOUND: "${params.alternativeId}" is not a valid alternative.`
        );
      }
      req.selectedAlternativeId = alt.id;
      const sim = req.simulationsByAlternativeId[alt.id];
      if (sim) {
        req.changePlan = this.buildChangePlan(req, alt, sim);
      }
    }

    this.transitionState(
      req,
      'APPROVED',
      params.actorId,
      params.actorRole,
      `Approved with alternative ${req.selectedAlternativeId || 'default'}.`
    );
    req.approvedBy = params.actorId;
    req.approvedAt = new Date().toISOString();

    this.emitOutboxEvent({
      idempotencyKey: `evt_approve_${req.id}`,
      journeyId: req.journeyId,
      changeRequestId: req.id,
      eventType: 'CHANGE_APPROVED',
      recipientRoles: ['traveler', 'operator'],
      payload: {
        approvedBy: params.actorId,
        selectedAlternativeId: req.selectedAlternativeId,
      },
    });

    void AuditService.recordEvent(
      'journey',
      req.journeyId,
      'CHANGE_REQUEST_APPROVED',
      params.actorId,
      params.actorRole,
      {
        changeRequestId: req.id,
        selectedAlternativeId: req.selectedAlternativeId,
      }
    );

    return structuredClone(req);
  }

  /**
   * Rejects a ChangeRequest (`AWAITING_APPROVAL` | `ALTERNATIVES_READY` -> `REJECTED`)
   * Preserves live journey state without applying any candidate mutation.
   */
  public rejectChangeRequest(params: {
    changeRequestId: string;
    actorId: string;
    actorRole: UserRole;
    actorOrganizationId?: string;
    reason: string;
  }): EngineChangeRequest {
    const req = this.changeRequestsById.get(params.changeRequestId);
    if (!req) {
      throw new Error(
        `CHANGE_REQUEST_NOT_FOUND: "${params.changeRequestId}" does not exist.`
      );
    }

    const snapshot = this.snapshotsByJourneyId.get(req.journeyId);
    if (!snapshot) {
      throw new Error(`JOURNEY_NOT_FOUND: "${req.journeyId}" does not exist.`);
    }

    if (
      !this.isActorAuthorized(
        snapshot,
        params.actorId,
        params.actorRole,
        params.actorOrganizationId
      )
    ) {
      throw new Error(
        `UNAUTHORIZED_ACTOR: Actor "${params.actorId}" (${params.actorRole}) is not authorized to reject changes for journey "${req.journeyId}".`
      );
    }

    this.transitionState(
      req,
      'REJECTED',
      params.actorId,
      params.actorRole,
      params.reason
    );
    req.rejectedBy = params.actorId;
    req.rejectedAt = new Date().toISOString();
    req.rejectionReason = params.reason;

    this.emitOutboxEvent({
      idempotencyKey: `evt_reject_${req.id}`,
      journeyId: req.journeyId,
      changeRequestId: req.id,
      eventType: 'CHANGE_REJECTED',
      recipientRoles: ['traveler', 'operator'],
      payload: {
        rejectedBy: params.actorId,
        reason: params.reason,
      },
    });

    void AuditService.recordEvent(
      'journey',
      req.journeyId,
      'CHANGE_REQUEST_REJECTED',
      params.actorId,
      params.actorRole,
      {
        changeRequestId: req.id,
        reason: params.reason,
      }
    );

    return structuredClone(req);
  }

  /**
   * STEP 9-14: VALIDATE -> APPLY ATOMICALLY -> PROPAGATE -> NOTIFY -> AUDIT
   * Enforces:
   * - Idempotency (`idempotencyKey` + payload fingerprint collision detection)
   * - RBAC & Tenant authorization
   * - Expiration guard (`CHANGE_EXPIRED`)
   * - State machine guard (`INVALID_STATE_TRANSITION` if REJECTED/EXPIRED/CANCELLED/SUPERSEDED)
   * - Optimistic concurrency (`JOURNEY_VERSION_CONFLICT` / `CHANGE_REQUIRES_RECALCULATION`)
   * - Mandatory pre-apply constraint revalidation (`VALIDATION_FAILED`)
   * - Atomic rollback on mid-apply failure (`ROLLBACK_EXECUTED`)
   */
  public applyChange(params: {
    changeRequestId: string;
    actorId: string;
    actorRole: UserRole;
    actorOrganizationId?: string;
    idempotencyKey?: string;
    alternativeId?: string;
    simulateMidApplyFailure?: boolean;
  }): ApplyChangeResult {
    const req = this.changeRequestsById.get(params.changeRequestId);
    if (!req) {
      throw new Error(
        `CHANGE_REQUEST_NOT_FOUND: "${params.changeRequestId}" does not exist.`
      );
    }

    const applyIdemKey =
      params.idempotencyKey || `apply_${req.id}_v${req.expectedJourneyVersion}`;
    const targetAltForFp =
      params.alternativeId || req.selectedAlternativeId || 'default';
    const applyFingerprint = `${params.changeRequestId}:${targetAltForFp}`;

    // 1. Idempotency check + payload collision protection
    if (this.applyResultByIdempotencyKey.has(applyIdemKey)) {
      const existingFp = this.applyFingerprintByIdempotencyKey.get(applyIdemKey);
      if (existingFp && existingFp !== applyFingerprint) {
        return {
          success: false,
          idempotentReplay: false,
          errorCode: 'IDEMPOTENCY_KEY_PAYLOAD_MISMATCH',
          errorMessage: `IDEMPOTENCY_KEY_PAYLOAD_MISMATCH: Idempotency key "${applyIdemKey}" was already used for a different change request or alternative payload (${existingFp} vs ${applyFingerprint}).`,
          changeRequest: structuredClone(req),
          outboxEvents: [],
        };
      }
      const cached = this.applyResultByIdempotencyKey.get(applyIdemKey)!;
      return {
        ...structuredClone(cached),
        idempotentReplay: true,
      };
    }

    const currentSnapshot = this.snapshotsByJourneyId.get(req.journeyId);
    if (!currentSnapshot) {
      throw new Error(`JOURNEY_NOT_FOUND: "${req.journeyId}" does not exist.`);
    }

    // 2. Authorization check
    if (
      !this.isActorAuthorized(
        currentSnapshot,
        params.actorId,
        params.actorRole,
        params.actorOrganizationId
      )
    ) {
      return {
        success: false,
        idempotentReplay: false,
        errorCode: 'UNAUTHORIZED_ACTOR',
        errorMessage: `Actor "${params.actorId}" (${params.actorRole}) is not authorized to apply changes to journey "${req.journeyId}".`,
        changeRequest: structuredClone(req),
        outboxEvents: [],
      };
    }

    // 3. Expiration check
    if (
      req.expiresAt &&
      new Date(req.expiresAt).getTime() < Date.now()
    ) {
      if (isValidChangeStateTransition(req.state, 'EXPIRED')) {
        this.transitionState(
          req,
          'EXPIRED',
          params.actorId,
          params.actorRole,
          'ChangeRequest expired before execution.'
        );
      }
      return {
        success: false,
        idempotentReplay: false,
        errorCode: 'CHANGE_EXPIRED',
        errorMessage: `ChangeRequest "${req.id}" expired at ${req.expiresAt} and cannot be applied.`,
        changeRequest: structuredClone(req),
        outboxEvents: [],
      };
    }

    // 4. Terminal / Invalid state guard (except SUPERSEDED caused by version advance, checked next)
    if (
      req.state === 'DRAFT' ||
      req.state === 'ANALYZING' ||
      req.state === 'REJECTED' ||
      req.state === 'EXPIRED' ||
      req.state === 'CANCELLED' ||
      req.state === 'FAILED'
    ) {
      return {
        success: false,
        idempotentReplay: false,
        errorCode: 'INVALID_STATE_TRANSITION',
        errorMessage: `Cannot apply ChangeRequest in state "${req.state}".`,
        changeRequest: structuredClone(req),
        outboxEvents: [],
      };
    }

    // 5. Optimistic Concurrency Check (Version Conflict Detection)
    if (
      currentSnapshot.version !== req.expectedJourneyVersion ||
      req.state === 'SUPERSEDED'
    ) {
      return {
        success: false,
        idempotentReplay: false,
        errorCode: 'JOURNEY_VERSION_CONFLICT',
        errorMessage: `JOURNEY_VERSION_CONFLICT: Expected journey version ${req.expectedJourneyVersion}, but current live version is ${currentSnapshot.version}. CHANGE_REQUIRES_RECALCULATION.`,
        changeRequest: structuredClone(req),
        outboxEvents: [],
      };
    }

    const outboxBackupLength = this.outboxEvents.length;

    // Auto-approve if called from AWAITING_APPROVAL or ALTERNATIVES_READY by an authorized actor
    if (
      req.state === 'AWAITING_APPROVAL' ||
      req.state === 'ALTERNATIVES_READY'
    ) {
      this.approveChangeRequest({
        changeRequestId: req.id,
        alternativeId: params.alternativeId,
        actorId: params.actorId,
        actorRole: params.actorRole,
        actorOrganizationId: params.actorOrganizationId,
      });
    }

    const chosenAltId = params.alternativeId || req.selectedAlternativeId;
    const chosenAlt = req.scoredAlternatives.find((a) => a.id === chosenAltId);
    const chosenSim = chosenAltId
      ? req.simulationsByAlternativeId[chosenAltId]
      : undefined;

    if (!chosenAlt || !chosenSim) {
      this.outboxEvents.length = outboxBackupLength;
      return {
        success: false,
        idempotentReplay: false,
        errorCode: 'VALIDATION_FAILED',
        errorMessage:
          'No valid alternative simulation available to construct ChangePlan.',
        changeRequest: structuredClone(req),
        outboxEvents: [],
      };
    }

    // 6. Mandatory Pre-Apply Revalidation against current live snapshot
    const revalidation = this.constraintEngine.evaluateSnapshot(
      chosenSim.afterSnapshot,
      currentSnapshot
    );
    if (!revalidation.valid) {
      this.outboxEvents.length = outboxBackupLength;
      return {
        success: false,
        idempotentReplay: false,
        errorCode: 'VALIDATION_FAILED',
        errorMessage: `Pre-apply validation failed: ${revalidation.hardViolations
          .map((v) => v.explanation)
          .join('; ')}`,
        changeRequest: structuredClone(req),
        outboxEvents: [],
      };
    }

    // 7. Begin Atomic Execution ( Backup Snapshot for Rollback Safety )
    const rollbackBackup: JourneySnapshot = structuredClone(currentSnapshot);

    try {
      this.transitionState(
        req,
        'APPLYING',
        params.actorId,
        params.actorRole,
        'Executing atomic journey state transition.'
      );

      if (params.simulateMidApplyFailure) {
        throw new Error(
          'SIMULATED_ATOMIC_COMMIT_FAILURE: Database write interrupted mid-transaction.'
        );
      }

      const nextVersion = currentSnapshot.version + 1;
      const updatedSnapshot: JourneySnapshot = structuredClone(
        chosenSim.afterSnapshot
      );
      updatedSnapshot.version = nextVersion;
      updatedSnapshot.status = 'booked';
      updatedSnapshot.capturedAt = new Date().toISOString();

      // Mark resolved visual state on updated items
      updatedSnapshot.items.forEach((item) => {
        if (item.visualState === 'CHANGED') {
          item.visualState = 'RESOLVED';
        }
      });

      const changePlan = this.buildChangePlan(req, chosenAlt, chosenSim);
      changePlan.changeSet.newVersion = nextVersion;
      req.changePlan = changePlan;

      // Commit new snapshot
      this.snapshotsByJourneyId.set(req.journeyId, updatedSnapshot);

      // Transition APPLYING -> APPLIED
      this.transitionState(
        req,
        'APPLIED',
        params.actorId,
        params.actorRole,
        `Applied alternative "${chosenAlt.candidate.title}" cleanly. Journey version incremented ${currentSnapshot.version} -> ${nextVersion}.`
      );
      req.appliedJourneyVersion = nextVersion;

      // Supersede any other open change requests on the old version
      this.changeRequestsById.forEach((otherReq) => {
        if (
          otherReq.journeyId === req.journeyId &&
          otherReq.id !== req.id &&
          isValidChangeStateTransition(otherReq.state, 'SUPERSEDED')
        ) {
          this.transitionState(
            otherReq,
            'SUPERSEDED',
            'system',
            'system',
            `Superseded by applied ChangeRequest ${req.id} (version ${nextVersion}).`
          );
          otherReq.supersededByChangeId = req.id;
        }
      });

      // Emit Outbox Events for Apply, Booking Reallocation, and Budget Update
      const emittedEvents: DomainOutboxEvent[] = [];
      emittedEvents.push(
        this.emitOutboxEvent({
          idempotencyKey: `evt_applied_${applyIdemKey}`,
          journeyId: req.journeyId,
          changeRequestId: req.id,
          eventType: 'CHANGE_APPLIED',
          recipientRoles: ['traveler', 'operator'],
          payload: {
            previousVersion: currentSnapshot.version,
            newVersion: nextVersion,
            alternativeTitle: chosenAlt.candidate.title,
            costDelta: chosenAlt.priceDelta,
            allocatedCostAfter: updatedSnapshot.allocatedCost,
          },
        })
      );

      emittedEvents.push(
        this.emitOutboxEvent({
          idempotencyKey: `evt_booking_${applyIdemKey}`,
          journeyId: req.journeyId,
          changeRequestId: req.id,
          eventType: 'BOOKING_REALLOCATED',
          recipientRoles: ['traveler', 'operator'],
          payload: {
            replacedItemId: req.trigger.affectedItemId,
            newBookingId: `bkg_${chosenAlt.candidate.id}`,
            vendorName: chosenAlt.candidate.vendorName,
          },
        })
      );

      emittedEvents.push(
        this.emitOutboxEvent({
          idempotencyKey: `evt_budget_${applyIdemKey}`,
          journeyId: req.journeyId,
          changeRequestId: req.id,
          eventType: 'BUDGET_UPDATED',
          recipientRoles: ['traveler', 'operator'],
          payload: {
            budgetBefore: currentSnapshot.allocatedCost,
            budgetAfter: updatedSnapshot.allocatedCost,
            priceDelta: chosenAlt.priceDelta,
            remainingBudget:
              updatedSnapshot.totalBudget - updatedSnapshot.allocatedCost,
          },
        })
      );

      void AuditService.recordEvent(
        'journey',
        req.journeyId,
        'LIVING_JOURNEY_CHANGE_APPLIED',
        params.actorId,
        params.actorRole,
        {
          changeRequestId: req.id,
          previousVersion: currentSnapshot.version,
          newVersion: nextVersion,
          alternativeId: chosenAlt.id,
          alternativeTitle: chosenAlt.candidate.title,
          budgetBefore: currentSnapshot.allocatedCost,
          budgetAfter: updatedSnapshot.allocatedCost,
          priceDelta: chosenAlt.priceDelta,
          rescheduledItems: changePlan.changeSet.rescheduledItemIds,
        }
      );

      const result: ApplyChangeResult = {
        success: true,
        idempotentReplay: false,
        changeRequest: structuredClone(req),
        updatedSnapshot: structuredClone(updatedSnapshot),
        changeSet: structuredClone(changePlan.changeSet),
        outboxEvents: emittedEvents,
      };

      this.applyResultByIdempotencyKey.set(applyIdemKey, result);
      this.applyFingerprintByIdempotencyKey.set(
        applyIdemKey,
        applyFingerprint
      );
      return structuredClone(result);
    } catch (err) {
      // ATOMIC ROLLBACK: Restore exact pre-apply snapshot, outbox state, & mark failure details
      this.snapshotsByJourneyId.set(
        req.journeyId,
        structuredClone(rollbackBackup)
      );
      this.outboxEvents.length = outboxBackupLength;
      if (isValidChangeStateTransition(req.state, 'FAILED')) {
        this.transitionState(
          req,
          'FAILED',
          params.actorId,
          params.actorRole,
          err instanceof Error ? err.message : 'Atomic apply rolled back.'
        );
      } else {
        req.state = 'FAILED';
      }
      req.failureCode = 'ROLLBACK_EXECUTED';
      req.failureReason =
        err instanceof Error ? err.message : 'Unknown atomic apply error';

      return {
        success: false,
        idempotentReplay: false,
        errorCode: 'ROLLBACK_EXECUTED',
        errorMessage: req.failureReason,
        changeRequest: structuredClone(req),
        updatedSnapshot: structuredClone(rollbackBackup),
        outboxEvents: [],
      };
    }
  }

  // ==========================================================================
  // PHASE 05 AI BOUNDARY IMPLEMENTATION
  // ==========================================================================

  public async summarizeChangeImpact(
    impact: ImpactAnalysisResult
  ): Promise<string> {
    return `[Deterministic Engine Summary]: ${impact.dimensions.DIRECT.explanation} (${impact.downstreamItemIds.length} downstream items evaluated; overall severity: ${impact.overallSeverity}).`;
  }

  public async enhanceAlternativeExplanations(
    validAlternatives: ScoredAlternative[],
    _snapshot: JourneySnapshot
  ): Promise<ScoredAlternative[]> {
    // AI boundary never introduces unvalidated candidates or mutates scores/constraints
    return structuredClone(validAlternatives);
  }

  // ==========================================================================
  // PHASE 06 REAL-TIME DISRUPTION EVENT BOUNDARY IMPLEMENTATION
  // ==========================================================================

  public async ingestExternalDisruption(event: {
    externalEventId: string;
    journeyId: string;
    affectedItemId: string;
    eventType:
      | 'FLIGHT_DELAY'
      | 'WEATHER_CLOSURE'
      | 'VENDOR_CANCELLATION'
      | 'TRAFFIC_CONGESTION';
    delayMinutes?: number;
    description: string;
  }): Promise<EngineChangeRequest> {
    const triggerType =
      event.eventType === 'FLIGHT_DELAY' ||
      event.eventType === 'TRAFFIC_CONGESTION'
        ? 'ITEM_DELAYED'
        : 'ITEM_CANCELLED';

    return this.detectAndAnalyzeChange({
      idempotencyKey: `ext_${event.externalEventId}`,
      journeyId: event.journeyId,
      triggerType,
      actorId: 'system_event_bus',
      actorRole: 'system',
      affectedItemId: event.affectedItemId,
      title: `External Alert: ${event.eventType}`,
      reason: event.description,
      timeDeltaMinutes: event.delayMinutes,
      requiresApproval: true,
    });
  }

  // ==========================================================================
  // INTERNAL HELPERS
  // ==========================================================================

  /**
   * Strict RBAC & Multi-Tenant Authorization check:
   * - Rejects unauthenticated (`!actorId`) and `vendor` roles
   * - Rejects cross-organization access when `snapshot.organizationId` and `actorOrganizationId` mismatch
   * - Enforces exact `actorId === snapshot.travelerId` for travelers (no wildcard prefix bypass)
   * - Enforces exact `actorId === snapshot.operatorId || actorId === snapshot.coordinatorId` for operators/coordinators
   */
  public isActorAuthorized(
    snapshot: JourneySnapshot,
    actorId: string,
    actorRole: UserRole | 'system',
    actorOrganizationId?: string
  ): boolean {
    if (!actorId || typeof actorId !== 'string' || actorId.trim() === '') {
      return false;
    }
    if (actorRole === 'vendor') {
      return false;
    }
    if (
      snapshot.organizationId &&
      actorOrganizationId &&
      snapshot.organizationId !== actorOrganizationId &&
      actorRole !== 'admin' &&
      actorRole !== 'system'
    ) {
      return false;
    }
    if (actorRole === 'admin' || actorRole === 'system') {
      return true;
    }
    if (actorRole === 'traveler') {
      return actorId === snapshot.travelerId;
    }
    if (actorRole === 'operator' || actorRole === 'coordinator') {
      return (
        actorId === snapshot.operatorId || actorId === snapshot.coordinatorId
      );
    }
    return false;
  }

  private transitionState(
    req: EngineChangeRequest,
    toState: ChangeRequestState,
    actorId: string,
    actorRole: UserRole | 'system',
    reason: string
  ): void {
    if (!isValidChangeStateTransition(req.state, toState)) {
      throw new Error(
        `INVALID_STATE_TRANSITION: Cannot transition ChangeRequest "${req.id}" from "${req.state}" to "${toState}".`
      );
    }
    const prev = req.state;
    req.state = toState;
    req.updatedAt = new Date().toISOString();
    req.stateHistory.push({
      fromState: prev,
      toState,
      actorId,
      actorRole,
      reason,
      timestamp: req.updatedAt,
    });
  }

  private buildChangePlan(
    req: EngineChangeRequest,
    alt: ScoredAlternative,
    sim: FullSimulationOutput
  ): ChangePlan {
    const replacedItemIds = req.trigger.affectedItemId
      ? [req.trigger.affectedItemId]
      : [];
    const rescheduledItemIds = alt.downstreamShifts.map((s) => s.itemId);
    const updatedItemIds = [...replacedItemIds, ...rescheduledItemIds];

    const changeSet: ChangeSet = {
      journeyId: req.journeyId,
      changeRequestId: req.id,
      previousVersion: req.expectedJourneyVersion,
      newVersion: req.expectedJourneyVersion + 1,
      replacedItemIds,
      rescheduledItemIds,
      updatedItemIds,
      affectedBookingIds: sim.diff.bookingChanges.map((b) => b.bookingId),
      financialDelta: alt.priceDelta,
      allocatedCostBefore: sim.diff.budgetBefore,
      allocatedCostAfter: sim.diff.budgetAfter,
      summaryText: `Replaced ${
        sim.diff.removedItems[0]?.title || 'disrupted stop'
      } with ${alt.candidate.title} (${alt.displayWindow})${
        alt.downstreamShifts.length > 0
          ? `; shifted ${alt.downstreamShifts
              .map((s) => `${s.itemTitle} to ${s.newDisplayWindow}`)
              .join(', ')}`
          : ''
      }.`,
    };

    return {
      id: `plan_${req.id}_${alt.id}`,
      changeRequestId: req.id,
      journeyId: req.journeyId,
      expectedJourneyVersion: req.expectedJourneyVersion,
      selectedAlternativeId: alt.id,
      beforeSnapshot: sim.beforeSnapshot,
      afterSnapshot: sim.afterSnapshot,
      simulationDiff: sim.diff,
      changeSet,
      validationResult: sim.afterConstraintEvaluation,
      createdAt: new Date().toISOString(),
    };
  }

  private emitOutboxEvent(params: {
    idempotencyKey: string;
    journeyId: string;
    changeRequestId: string;
    eventType: DomainOutboxEvent['eventType'];
    recipientRoles: UserRole[];
    payload: Record<string, unknown>;
  }): DomainOutboxEvent {
    const existing = this.outboxEvents.find(
      (e) => e.idempotencyKey === params.idempotencyKey
    );
    if (existing) return existing;

    const event: DomainOutboxEvent = {
      id: `outbox_${this.outboxEvents.length + 1}_${Date.now()}`,
      idempotencyKey: params.idempotencyKey,
      journeyId: params.journeyId,
      changeRequestId: params.changeRequestId,
      eventType: params.eventType,
      recipientRoles: params.recipientRoles,
      payload: params.payload,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };
    this.outboxEvents.push(event);
    return event;
  }
}

/**
 * Shared singleton instance for Traveler & Operator UI workflows
 */
export const sharedLivingJourneyEngine = new LivingJourneyEngine();

/**
 * Initializes or retrieves the canonical Goa Scuba Disruption ChangeRequest
 * on the shared engine so Traveler & Operator screens share live, deterministic state.
 */
export function ensureGoaDemoChangeRequest(): EngineChangeRequest {
  const existing =
    sharedLivingJourneyEngine.getChangeRequestsForJourney('jrn_goa_01');
  if (existing.length > 0) {
    return existing[0];
  }

  return sharedLivingJourneyEngine.detectAndAnalyzeChange({
    idempotencyKey: 'idem_goa_day2_scuba_cancellation_v17',
    journeyId: 'jrn_goa_01',
    triggerType: 'ITEM_CANCELLED',
    actorId: 'usr_operator_01',
    actorRole: 'operator',
    affectedItemId: 'itm_goa_03_scuba',
    title: 'Baga Reef Scuba Diving Cancelled (2.8m Coastal Swell Advisory)',
    reason:
      'Coast Guard & vendor Coastal Aqua cancelled 14:00 Baga Reef Scuba Diving due to 2.8m offshore swells.',
    requiresApproval: true,
  });
}
