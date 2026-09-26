import type { UserRole } from '@/types/database.types';
import type {
  ApplyChangeResult,
  EngineChangeRequest,
  EngineSeverity,
  FullSimulationOutput,
  ImpactAnalysisResult,
  JourneySnapshot,
  Phase05AiBoundaryContract,
  ScoredAlternative,
} from '@/domains/journey-engine/types';

/**
 * PHASE 05 — AI INTELLIGENCE LAYER DOMAIN CONTRACTS
 *
 * Source-of-Truth Hierarchy:
 * 1. Database / authoritative domain state
 * 2. Deterministic domain services (LivingJourneyEngine, ConstraintEngine, GeoService)
 * 3. Validated simulation (JourneySimulator)
 * 4. AI structured interpretation
 * 5. AI-generated natural-language explanation
 */

export const AI_SCHEMA_VERSION = '1.0' as const;

export type AiIntentCategory =
  | 'PLAN_TRIP'
  | 'UPDATE_PREFERENCES'
  | 'CHANGE_BUDGET'
  | 'CHANGE_TRAVEL_STYLE'
  | 'ADD_INTEREST'
  | 'REMOVE_INTEREST'
  | 'FIND_DESTINATION'
  | 'FIND_ACTIVITY'
  | 'ADAPT_JOURNEY'
  | 'EXPLAIN_CHANGE'
  | 'EXPLAIN_ALTERNATIVE'
  | 'SHOW_IMPACT'
  | 'SUMMARIZE_JOURNEY'
  | 'ASK_BOOKING_STATUS'
  | 'ASK_PAYMENT_STATUS'
  | 'ASK_OPERATION_STATUS'
  | 'ASK_ITINERARY'
  | 'ASK_SUPPORT'
  | 'UNKNOWN';

export type AiResponseType =
  | 'ANSWER'
  | 'CLARIFICATION_REQUIRED'
  | 'RECOMMENDATION'
  | 'IMPACT_EXPLANATION'
  | 'CHANGE_PROPOSAL'
  | 'ACTION_REQUIRES_APPROVAL'
  | 'ACTION_COMPLETED'
  | 'ACTION_FAILED'
  | 'UNAVAILABLE'
  | 'UNAUTHORIZED'
  | 'ERROR';

export type PreferenceSource = 'EXPLICIT' | 'INFERRED';

export interface ExtractedPreferenceField<T> {
  value: T;
  source: PreferenceSource;
  confidence: number;
  requiresUserConfirmation: boolean;
  rationale?: string;
}

export type MorningPreferenceType =
  | 'AVOID_EARLY_START'
  | 'EARLY_BIRD'
  | 'FLEXIBLE';

export type EveningPreferenceType =
  | 'PROTECT_DINNER_EVENING'
  | 'LATE_NIGHT_ACTIVE'
  | 'QUIET_EVENINGS'
  | 'FLEXIBLE';

export type BudgetPolicyType =
  | 'NO_INCREASE'
  | 'STRICT_CAP'
  | 'FLEXIBLE'
  | 'UNSPECIFIED';

export type TimeFlexibilityType = 'STRICT' | 'MODERATE' | 'FLEXIBLE';

export type ActivityIntensityType = 'LOW' | 'MODERATE' | 'HIGH';

export interface ExtractedTravelerPreferences {
  destination?: ExtractedPreferenceField<string>;
  startDate?: ExtractedPreferenceField<string>;
  endDate?: ExtractedPreferenceField<string>;
  durationDays?: ExtractedPreferenceField<number>;
  travelerCount?: ExtractedPreferenceField<number>;
  budget?: ExtractedPreferenceField<number>;
  currency?: ExtractedPreferenceField<string>;
  accommodationPreference?: ExtractedPreferenceField<string>;
  transportPreference?: ExtractedPreferenceField<string>;
  interests: Array<ExtractedPreferenceField<string>>;
  removedInterests: string[];
  activities: Array<ExtractedPreferenceField<string>>;
  foodPreference?: ExtractedPreferenceField<string>;
  travelStyle?: ExtractedPreferenceField<string>;
  pace?: ExtractedPreferenceField<'relaxed' | 'balanced' | 'fast-paced'>;
  morningPreference?: ExtractedPreferenceField<MorningPreferenceType>;
  eveningPreference?: ExtractedPreferenceField<EveningPreferenceType>;
  mobilityConstraints?: ExtractedPreferenceField<string>;
  avoidances: string[];
  specialRequests: string[];
  budgetPolicy: BudgetPolicyType;
  budgetFlexibilityPct?: number;
  timeFlexibility: TimeFlexibilityType;
  activityIntensity?: ExtractedPreferenceField<ActivityIntensityType>;
  preserveTargets: string[];
}

export type FactSourceType =
  | 'JOURNEY_STATE'
  | 'ITINERARY_ITEM'
  | 'BOOKING_RECORD'
  | 'BUDGET_LEDGER'
  | 'CHANGE_REQUEST'
  | 'IMPACT_ANALYSIS'
  | 'SCORED_ALTERNATIVE'
  | 'SIMULATION_DIFF'
  | 'ROUTE_FEASIBILITY'
  | 'OPERATOR_QUEUE';

export interface GroundedFactReference {
  factId: string;
  sourceType: FactSourceType;
  sourceEntityId: string;
  sourceTimestamp: string;
  journeyVersion?: number;
  label: string;
  authoritativeValue: string | number | boolean;
}

export type AiToolPermissionLevel = 'READ_ONLY' | 'SIMULATION' | 'MUTATION';

export type AiToolName =
  | 'get_current_journey'
  | 'get_journey_summary'
  | 'get_itinerary'
  | 'get_booking_status'
  | 'get_budget_status'
  | 'get_active_change_request'
  | 'analyze_journey_impact'
  | 'find_valid_alternatives'
  | 'simulate_journey_change'
  | 'explain_alternative'
  | 'get_notifications'
  | 'get_destination_context'
  | 'get_travel_route'
  | 'get_operator_tour_status'
  | 'get_operational_conflicts'
  | 'plan_deterministic_trip'
  | 'apply_journey_change';

export interface AiToolCallRequest {
  toolName: AiToolName;
  arguments: Record<string, unknown>;
}

export interface AiToolExecutionTrace {
  toolName: AiToolName;
  permissionLevel: AiToolPermissionLevel;
  allowed: boolean;
  authorized: boolean;
  executed: boolean;
  latencyMs: number;
  status: 'SUCCESS' | 'DENIED' | 'VALIDATION_ERROR' | 'EXECUTION_ERROR';
  summary: string;
  factIdsProduced: string[];
  errorCode?: string;
}

export interface AiExplanationBundle {
  shortExplanation: string;
  detailedExplanation: string;
  whyRecommendedBullets: string[];
  whatChangedSummary: string;
  whatIsAffectedSummary: string;
  whatIsPreservedSummary: string;
  budgetImpactSummary: string;
  scheduleImpactSummary: string;
  groundedFactIds: string[];
}

export interface AiChangeProposal {
  proposalId: string;
  requestId: string;
  correlationId: string;
  idempotencyKey: string;
  journeyId: string;
  expectedJourneyVersion: number;
  generatedAt: string;
  changeRequestId: string;
  disruptedItemId?: string;
  disruptedItemTitle?: string;
  recommendedAlternativeId: string;
  recommendedAlternativeTitle: string;
  recommendedScore: number;
  validAlternativesCount: number;
  rejectedCandidatesCount: number;
  priceDelta: number;
  budgetBefore: number;
  budgetAfter: number;
  totalBudgetLimit: number;
  remainingBudgetAfter: number;
  currency: string;
  preservedItemIds: string[];
  preservedItemTitles: string[];
  downstreamShiftsCount: number;
  requiresHumanApproval: boolean;
  approvalState: 'AWAITING_HUMAN_APPROVAL' | 'APPROVED' | 'APPLIED' | 'REJECTED' | 'STALE';
  simulationSummary?: {
    beforeWindow: string;
    afterWindow: string;
    conflictsResolved: number;
    conflictsRemaining: number;
  };
}

export interface DeterministicTripPlanProposal {
  planId: string;
  journeyId: string;
  destinationId: string;
  destinationName: string;
  durationDays: number;
  travelersCount: number;
  totalBudget: number;
  estimatedAllocatedCost: number;
  remainingBudget: number;
  currency: string;
  pace: 'relaxed' | 'balanced' | 'fast-paced';
  morningPreference: MorningPreferenceType;
  travelStyles: string[];
  constraintValid: boolean;
  stopsCount: number;
  highlights: Array<{
    dayNumber: number;
    title: string;
    window: string;
    price: number;
    category: string;
  }>;
}

export interface OperatorAttentionItem {
  journeyId: string;
  journeyTitle: string;
  travelerId: string;
  travelerName: string;
  journeyVersion: number;
  issueCategory: 'VENDOR_CANCELLATION' | 'TRANSFER_CONFLICT' | 'BUDGET_ALERT' | 'PAYMENT_PENDING';
  severity: EngineSeverity;
  headline: string;
  summary: string;
  changeRequestId?: string;
  validAlternativesCount: number;
  recommendedAction: string;
}

export interface CustomerCommunicationDraft {
  draftId: string;
  journeyId: string;
  journeyVersion: number;
  changeRequestId?: string;
  recipientName: string;
  subject: string;
  body: string;
  groundedFactIds: string[];
  requiresOperatorReview: boolean;
  status: 'DRAFT_FOR_REVIEW' | 'APPROVED_TO_SEND';
}

export type AiOperationType =
  | 'traveler_assistant'
  | 'operator_copilot'
  | 'trip_planning'
  | 'change_explanation'
  | 'mutation_assistance';

export type AiErrorCategory =
  | 'NONE'
  | 'PROMPT_INJECTION_BLOCKED'
  | 'TOOL_INJECTION_BLOCKED'
  | 'UNAUTHORIZED_ACCESS'
  | 'CROSS_TENANT_DENIED'
  | 'SCHEMA_VALIDATION_FAILED'
  | 'UNKNOWN_TOOL_REJECTED'
  | 'MUTATION_APPROVAL_REQUIRED'
  | 'TOOL_LOOP_LIMIT_EXCEEDED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'PROVIDER_TIMEOUT'
  | 'PROVIDER_UNAVAILABLE'
  | 'JOURNEY_VERSION_CONFLICT'
  | 'DETERMINISTIC_VALIDATION_FAILED'
  | 'FEATURE_DISABLED'
  | 'INSUFFICIENT_INFORMATION';

export interface AiObservabilityRecord {
  requestId: string;
  correlationId: string;
  timestamp: string;
  actorId: string;
  actorRole: UserRole | 'unauthenticated';
  organizationId?: string;
  operationType: AiOperationType;
  provider: string;
  model: string;
  promptId: string;
  promptVersion: string;
  latencyMs: number;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  toolCallsCount: number;
  toolNames: AiToolName[];
  schemaValidationPassed: boolean;
  deterministicValidationPassed: boolean;
  abstained: boolean;
  journeyId?: string;
  journeyVersion?: number;
  changeRequestId?: string;
  proposalId?: string;
  responseType: AiResponseType;
  intent: AiIntentCategory;
  errorCategory: AiErrorCategory;
  piiRedactedCount: number;
  injectionDetected: boolean;
}

export interface SessionActorContext {
  actorId: string;
  actorRole: UserRole | 'unauthenticated';
  actorOrganizationId?: string;
  travelerDisplayName?: string;
}

export interface AiAssistantRequest {
  requestId?: string;
  correlationId?: string;
  idempotencyKey?: string;
  operationType: AiOperationType;
  userMessage: string;
  sessionActor: SessionActorContext;
  journeyId?: string;
  changeRequestId?: string;
  selectedAlternativeId?: string;
  untrustedExternalContext?: Record<string, string>;
  /**
   * Model-supplied identity fields (if any) are captured ONLY to verify
   * that the security layer ignores them in favor of `sessionActor`.
   */
  untrustedModelClaimedActorId?: string;
  untrustedModelClaimedRole?: string;
  untrustedModelClaimedOrgId?: string;
}

export interface StructuredAiResponse {
  schemaVersion: typeof AI_SCHEMA_VERSION;
  requestId: string;
  correlationId: string;
  intent: AiIntentCategory;
  responseType: AiResponseType;
  confidence: number;
  requiresDeterministicValidation: boolean;
  requiresHumanApproval: boolean;
  abstained: boolean;
  abstentionReason?: string;
  headline: string;
  message: string;
  clarificationQuestion?: string;
  extractedPreferences?: ExtractedTravelerPreferences;
  explanation?: AiExplanationBundle;
  changeProposal?: AiChangeProposal;
  tripPlanProposal?: DeterministicTripPlanProposal;
  operatorSummary?: {
    totalToursEvaluated: number;
    attentionRequiredCount: number;
    attentionItems: OperatorAttentionItem[];
    communicationDraft?: CustomerCommunicationDraft;
  };
  applyResult?: ApplyChangeResult;
  groundedFacts: GroundedFactReference[];
  warnings: string[];
  toolTrace: AiToolExecutionTrace[];
  telemetry: AiObservabilityRecord;
}

export interface ConversationTurn {
  turnId: string;
  requestId: string;
  journeyId?: string;
  journeyVersionAtTurn?: number;
  actorId: string;
  role: 'user' | 'assistant';
  content: string;
  intent?: AiIntentCategory;
  responseType?: AiResponseType;
  timestamp: string;
}

export interface ExtendedPhase05AiBoundary extends Phase05AiBoundaryContract {
  explainAlternativeRecommendation(params: {
    alternative: ScoredAlternative;
    snapshot: JourneySnapshot;
    changeRequest?: EngineChangeRequest;
    simulation?: FullSimulationOutput;
    preservedItemTitles?: string[];
  }): AiExplanationBundle;
  explainImpactAnalysis(params: {
    impact: ImpactAnalysisResult;
    snapshot: JourneySnapshot;
    validAlternativesCount: number;
  }): AiExplanationBundle;
}
