import type {
  ItineraryItem,
  DisruptionSeverity,
  JourneyStatus,
  UserRole,
} from '@/types/database.types';
import type { GeoLocation, TravelMode } from '@/domains/geo';

// ============================================================================
// LEGACY / BACKWARD-COMPATIBLE TYPES (PHASE 00 - 03)
// ============================================================================

export interface DisruptionEvent {
  id: string;
  journey_id: string;
  affected_item_id: string;
  source:
    | 'flight_delay'
    | 'weather_alert'
    | 'vendor_cancellation'
    | 'traveler_request'
    | 'traffic_delay';
  time_delta_minutes?: number;
  new_location_name?: string;
  description: string;
  timestamp: string;
}

export interface DependencyNode {
  itemId: string;
  item: ItineraryItem;
  dependents: DependencyNode[];
  prerequisites: DependencyNode[];
  bufferMinutes: number;
}

export interface ImpactReport {
  change_request_id: string;
  journey_id: string;
  disruption: DisruptionEvent;
  affected_items_count: number;
  cascading_item_ids: string[];
  has_critical_conflict: boolean;
  impact_details: Array<{
    item_id: string;
    item_title: string;
    type: 'time_overlap' | 'missed_connection' | 'venue_closed' | 'budget_overflow';
    severity: DisruptionSeverity;
    explanation: string;
  }>;
}

export interface AlternativeProposal {
  id: string;
  option_title: string;
  description: string;
  compatibility_score: number; // 0 to 100
  price_delta: number;
  time_shift_minutes: number;
  is_recommended: boolean;
  explanation: string;
  replacement_items: ItineraryItem[];
}

export interface SimulationResult {
  journey_id: string;
  proposal_id: string;
  original_itinerary: ItineraryItem[];
  proposed_itinerary: ItineraryItem[];
  budget_before: number;
  budget_after: number;
  resolved_conflicts_count: number;
  remaining_unresolved_count: number;
}

// ============================================================================
// PHASE 04 CANONICAL LIVING JOURNEY ENGINE™ TYPES
// ============================================================================

/**
 * 6-level deterministic impact & conflict severity scale
 */
export type EngineSeverity =
  | 'NONE'
  | 'INFO'
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'CRITICAL';

/**
 * Supported directed dependency edge types between itinerary items
 */
export type DependencyEdgeType =
  | 'PRECEDES'
  | 'REQUIRES_COMPLETION_OF'
  | 'TRANSFERS_TO'
  | 'REQUIRES_CHECKIN_AT'
  | 'REQUIRES_CHECKOUT_BEFORE'
  | 'SHARES_BOOKING_WITH'
  | 'SAME_VENDOR_AS'
  | 'WITHIN_DAY_WINDOW';

export interface DependencyEdge {
  id: string;
  journeyId: string;
  fromItemId: string;
  toItemId: string;
  type: DependencyEdgeType;
  minBufferMinutes: number;
  isHardConstraint: boolean;
}

/**
 * 10 mandatory dimensions of impact analysis
 */
export type ImpactDimension =
  | 'DIRECT'
  | 'DOWNSTREAM'
  | 'TEMPORAL'
  | 'SPATIAL'
  | 'BOOKING'
  | 'BUDGET'
  | 'CAPACITY'
  | 'TRAVELER'
  | 'OPERATIONAL'
  | 'NOTIFICATION';

export interface DimensionImpact {
  dimension: ImpactDimension;
  severity: EngineSeverity;
  affectedItemIds: string[];
  conflictCode: string;
  explanation: string;
  metrics?: Record<string, number | string | boolean>;
}

/**
 * 11 deterministic constraint evaluation categories
 */
export type ConstraintCategory =
  | 'TEMPORAL'
  | 'SPATIAL'
  | 'TRANSFER_BUFFER'
  | 'SEQUENCE'
  | 'BOOKING_STATE'
  | 'AVAILABILITY'
  | 'CAPACITY'
  | 'BUDGET'
  | 'TRAVELER_PREFERENCE'
  | 'RESOURCE'
  | 'DEPENDENCY';

export interface ConstraintViolation {
  category: ConstraintCategory;
  code: string;
  severity: EngineSeverity;
  isHardConstraint: boolean;
  itemId?: string;
  itemTitle?: string;
  relatedItemId?: string;
  relatedItemTitle?: string;
  deficitMinutes?: number;
  excessCostAmount?: number;
  explanation: string;
}

export interface ConstraintEvaluationResult {
  valid: boolean;
  hardViolations: ConstraintViolation[];
  softViolations: ConstraintViolation[];
  allViolations: ConstraintViolation[];
}

/**
 * Availability states: UNKNOWN, STALE, and EXPIRED are NEVER treated as AVAILABLE
 */
export type AvailabilityState =
  | 'AVAILABLE'
  | 'LIMITED'
  | 'UNAVAILABLE'
  | 'UNKNOWN'
  | 'STALE'
  | 'EXPIRED';

export type BookingLockState =
  | 'NONE'
  | 'PENDING'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'NON_REFUNDABLE'
  | 'MODIFIABLE'
  | 'CANCELLED';

export type JourneyNodeVisualState =
  | 'NORMAL'
  | 'ATTENTION'
  | 'CHANGED'
  | 'CANCELLED'
  | 'RESOLVED';

/**
 * Coherent item state inside an immutable JourneySnapshot
 */
export interface JourneySnapshotItem {
  id: string;
  journeyId: string;
  dayNumber: number;
  sequenceOrder: number;
  type:
    | 'accommodation'
    | 'activity'
    | 'transport'
    | 'meal'
    | 'flight'
    | 'transfer'
    | 'free_time';
  title: string;
  subtitle: string;
  startTimeIso: string;
  endTimeIso: string;
  displayWindow: string;
  location: GeoLocation;
  price: number;
  currency: string;
  status: 'confirmed' | 'pending' | 'disrupted' | 'modifying' | 'cancelled';
  visualState?: JourneyNodeVisualState;
  bookingId?: string;
  bookingState: BookingLockState;
  isLocked: boolean;
  partySize: number;
  maxCapacity?: number;
  safetyBufferMinutes: number;
  travelModeToNext: TravelMode;
  categoryTags: string[];
  openingTimeLocal?: string; // HH:mm
  closingTimeLocal?: string; // HH:mm
  vendorId?: string;
  disruptionNote?: string;
}

/**
 * Coherent, immutable JourneySnapshot input for all Living Journey Engine operations
 */
export interface JourneySnapshot {
  journeyId: string;
  version: number;
  title: string;
  destinationId: string;
  startDate: string;
  endDate: string;
  travelersCount: number;
  travelStyles: string[];
  pace: 'relaxed' | 'balanced' | 'fast-paced';
  totalBudget: number;
  allocatedCost: number;
  currency: string;
  hardBudgetConstraint: boolean;
  softBudgetTolerancePct: number;
  status: JourneyStatus;
  travelerId: string;
  operatorId?: string;
  coordinatorId?: string;
  organizationId?: string;
  passportReferenceCode: string;
  items: JourneySnapshotItem[];
  dependencies: DependencyEdge[];
  capturedAt: string;
}

/**
 * 13 supported change trigger types
 */
export type ChangeTriggerType =
  | 'ITEM_CANCELLED'
  | 'ITEM_DELAYED'
  | 'TIME_SHIFTED'
  | 'LOCATION_CHANGED'
  | 'DURATION_CHANGED'
  | 'TRAVEL_MODE_CHANGED'
  | 'BOOKING_UNAVAILABLE'
  | 'BUDGET_CHANGED'
  | 'PARTY_SIZE_CHANGED'
  | 'PREFERENCE_UPDATED'
  | 'ITEM_SWAPPED'
  | 'MANUAL_EDIT'
  | 'OPERATOR_OVERRIDE';

export interface ChangeTriggerInput {
  idempotencyKey?: string;
  journeyId: string;
  triggerType: ChangeTriggerType;
  actorId: string;
  actorRole: UserRole | 'system';
  actorOrganizationId?: string;
  affectedItemId?: string;
  title: string;
  reason: string;
  timeDeltaMinutes?: number;
  newStartTimeIso?: string;
  newEndTimeIso?: string;
  newLocation?: GeoLocation;
  newTravelMode?: TravelMode;
  newTotalBudget?: number;
  newPartySize?: number;
  newStyles?: string[];
  replacementCandidateId?: string;
  requiresApproval?: boolean;
  expiresAtIso?: string;
}

export interface ImpactAnalysisResult {
  changeRequestId: string;
  journeyId: string;
  journeyVersion: number;
  trigger: ChangeTriggerInput;
  directItemIds: string[];
  downstreamItemIds: string[];
  upstreamItemIds: string[];
  dependencyPaths: Record<string, string[]>;
  overallSeverity: EngineSeverity;
  dimensions: Record<ImpactDimension, DimensionImpact>;
  impactsList: DimensionImpact[];
  constraintEvaluation: ConstraintEvaluationResult;
  requiresApproval: boolean;
  requiresImmediateAttention: boolean;
  analyzedAt: string;
}

/**
 * Candidate activity from the inventory repository
 */
export interface CandidateActivity {
  id: string;
  destinationId: string;
  title: string;
  subtitle: string;
  category: string;
  tags: string[];
  durationMinutes: number;
  priceAmount: number;
  currency: string;
  location: GeoLocation;
  availabilityStatus: AvailabilityState;
  maxCapacity: number;
  remainingCapacity: number;
  openingTimeLocal: string; // HH:mm
  closingTimeLocal: string; // HH:mm
  availableWindowStartIso?: string;
  availableWindowEndIso?: string;
  vendorId?: string;
  vendorName?: string;
  indoorSafe?: boolean;
}

export interface ScoringWeights {
  preferenceMatch: number; // default 30
  timeFit: number; // default 20
  locationProximity: number; // default 15
  budgetFit: number; // default 15
  dependencyCompatibility: number; // default 10
  availabilityConfidence: number; // default 10
}

export interface AlternativeScoreBreakdown {
  preferenceMatch: number; // 0..30
  timeFit: number; // 0..20
  locationProximity: number; // 0..15
  budgetFit: number; // 0..15
  dependencyCompatibility: number; // 0..10
  availabilityConfidence: number; // 0..10
  totalScore: number; // 0..100
}

export interface DownstreamShiftRecord {
  itemId: string;
  itemTitle: string;
  previousStartIso: string;
  newStartIso: string;
  previousEndIso: string;
  newEndIso: string;
  previousDisplayWindow: string;
  newDisplayWindow: string;
  shiftMinutes: number;
}

export interface ScoredAlternative {
  id: string;
  candidate: CandidateActivity;
  rank: number;
  isRecommended: boolean;
  isValid: boolean;
  scoreBreakdown: AlternativeScoreBreakdown;
  proposedStartTimeIso: string;
  proposedEndTimeIso: string;
  displayWindow: string;
  priceDelta: number;
  budgetBefore: number;
  budgetAfter: number;
  timeShiftMinutes: number;
  distanceToPreviousMeters: number;
  travelTimeFromPreviousMinutes: number;
  distanceToNextMeters: number;
  travelTimeToNextMinutes: number;
  downstreamShifts: DownstreamShiftRecord[];
  explanationReasons: string[];
  conflictsResolvedCount: number;
  conflictsRemainingCount: number;
}

export interface RejectedCandidateRecord {
  candidateId: string;
  title: string;
  rejectionReasons: ConstraintViolation[];
}

export interface AlternativeGenerationOutput {
  validAlternatives: ScoredAlternative[];
  rejectedCandidates: RejectedCandidateRecord[];
}

/**
 * Structured Simulation Diff (Before vs Proposed After)
 */
export interface SimulationItemChange {
  itemId: string;
  beforeTitle: string;
  afterTitle: string;
  beforeWindow: string;
  afterWindow: string;
  beforeLocationName: string;
  afterLocationName: string;
  beforePrice: number;
  afterPrice: number;
  changeType: 'REPLACED' | 'RESCHEDULED' | 'CANCELLED' | 'ADDED' | 'UNCHANGED';
}

export interface SimulationDiff {
  alternativeId: string;
  alternativeTitle: string;
  changedItems: SimulationItemChange[];
  addedItems: JourneySnapshotItem[];
  removedItems: JourneySnapshotItem[];
  movedItems: DownstreamShiftRecord[];
  timeDeltaMinutes: number;
  travelDistanceDeltaMeters: number;
  costDelta: number;
  budgetBefore: number;
  budgetAfter: number;
  totalBudgetLimit: number;
  remainingBudgetAfter: number;
  conflictsBefore: ConstraintViolation[];
  conflictsAfter: ConstraintViolation[];
  conflictsResolved: ConstraintViolation[];
  conflictsIntroduced: ConstraintViolation[];
  bookingChanges: Array<{
    bookingId: string;
    itemId: string;
    itemTitle: string;
    previousStatus: BookingLockState;
    newStatus: BookingLockState;
    financialImpact: number;
  }>;
  notificationPayloads: Array<{
    recipientRole: UserRole;
    title: string;
    message: string;
  }>;
}

export interface FullSimulationOutput {
  journeyId: string;
  alternativeId: string;
  beforeSnapshot: JourneySnapshot;
  afterSnapshot: JourneySnapshot;
  diff: SimulationDiff;
  afterConstraintEvaluation: ConstraintEvaluationResult;
}

/**
 * 12-state ChangeRequest state machine
 */
export type ChangeRequestState =
  | 'DRAFT'
  | 'ANALYZING'
  | 'ALTERNATIVES_READY'
  | 'AWAITING_APPROVAL'
  | 'APPROVED'
  | 'APPLYING'
  | 'APPLIED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'FAILED'
  | 'CANCELLED'
  | 'SUPERSEDED';

export interface ChangeSet {
  journeyId: string;
  changeRequestId: string;
  previousVersion: number;
  newVersion: number;
  replacedItemIds: string[];
  rescheduledItemIds: string[];
  updatedItemIds: string[];
  affectedBookingIds: string[];
  financialDelta: number;
  allocatedCostBefore: number;
  allocatedCostAfter: number;
  summaryText: string;
}

export interface ChangePlan {
  id: string;
  changeRequestId: string;
  journeyId: string;
  expectedJourneyVersion: number;
  selectedAlternativeId: string;
  beforeSnapshot: JourneySnapshot;
  afterSnapshot: JourneySnapshot;
  simulationDiff: SimulationDiff;
  changeSet: ChangeSet;
  validationResult: ConstraintEvaluationResult;
  createdAt: string;
}

export interface DomainOutboxEvent {
  id: string;
  idempotencyKey: string;
  journeyId: string;
  changeRequestId: string;
  eventType:
    | 'CHANGE_DETECTED'
    | 'IMPACT_ANALYZED'
    | 'ALTERNATIVES_GENERATED'
    | 'CHANGE_SIMULATED'
    | 'CHANGE_AWAITING_APPROVAL'
    | 'CHANGE_APPROVED'
    | 'CHANGE_APPLIED'
    | 'CHANGE_REJECTED'
    | 'CHANGE_FAILED'
    | 'BOOKING_REALLOCATED'
    | 'BUDGET_UPDATED';
  recipientRoles: UserRole[];
  payload: Record<string, unknown>;
  status: 'PENDING' | 'PUBLISHED' | 'PROCESSED' | 'FAILED';
  createdAt: string;
}

export interface StateTransitionLog {
  fromState: ChangeRequestState | 'INITIAL';
  toState: ChangeRequestState;
  actorId: string;
  actorRole: UserRole | 'system';
  reason: string;
  timestamp: string;
}

export interface EngineChangeRequest {
  id: string;
  idempotencyKey: string;
  journeyId: string;
  expectedJourneyVersion: number;
  appliedJourneyVersion?: number;
  state: ChangeRequestState;
  trigger: ChangeTriggerInput;
  severity: EngineSeverity;
  requiresApproval: boolean;
  impactAnalysis?: ImpactAnalysisResult;
  scoredAlternatives: ScoredAlternative[];
  rejectedCandidates: RejectedCandidateRecord[];
  simulationsByAlternativeId: Record<string, FullSimulationOutput>;
  selectedAlternativeId?: string;
  changePlan?: ChangePlan;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  expiresAt?: string;
  failureCode?: string;
  failureReason?: string;
  supersededByChangeId?: string;
  stateHistory: StateTransitionLog[];
  createdAt: string;
  updatedAt: string;
}

export interface ApplyChangeResult {
  success: boolean;
  idempotentReplay: boolean;
  errorCode?:
    | 'JOURNEY_VERSION_CONFLICT'
    | 'CHANGE_REQUIRES_RECALCULATION'
    | 'INVALID_STATE_TRANSITION'
    | 'CHANGE_EXPIRED'
    | 'UNAUTHORIZED_ACTOR'
    | 'VALIDATION_FAILED'
    | 'ROLLBACK_EXECUTED'
    | 'IDEMPOTENCY_KEY_PAYLOAD_MISMATCH';
  errorMessage?: string;
  changeRequest: EngineChangeRequest;
  updatedSnapshot?: JourneySnapshot;
  changeSet?: ChangeSet;
  outboxEvents: DomainOutboxEvent[];
}

// ============================================================================
// PHASE 05 (AI BOUNDARY) & PHASE 06 (EVENT DISRUPTION BOUNDARY) CONTRACTS
// ============================================================================

/**
 * Phase 05 AI Integration Boundary Contract:
 * AI may rank valid alternatives or generate natural-language summaries,
 * but AI NEVER bypasses ConstraintEngine or mutates journeys directly.
 */
export interface Phase05AiBoundaryContract {
  summarizeChangeImpact(impact: ImpactAnalysisResult): Promise<string>;
  enhanceAlternativeExplanations(
    validAlternatives: ScoredAlternative[],
    snapshot: JourneySnapshot
  ): Promise<ScoredAlternative[]>;
}

/**
 * Phase 06 Real-Time Event & Disruption Ingestion Boundary Contract:
 * External alerts (flights, weather, vendors) normalize into ChangeTriggerInput
 * with an idempotencyKey and feed into LivingJourneyEngine.
 */
export interface Phase06EventBoundaryContract {
  ingestExternalDisruption(event: {
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
  }): Promise<EngineChangeRequest>;
}
