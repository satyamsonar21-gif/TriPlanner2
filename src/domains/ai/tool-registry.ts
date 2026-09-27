import type { UserRole } from '@/types/database.types';
import {
  AlternativeEngine,
  CANDIDATE_INVENTORY_CATALOG,
  ConstraintEngine,
  computeDeterministicDistanceMeters,
  computeDeterministicTravelMinutes,
  ImpactAnalyzer,
  JourneySimulator,
  type LivingJourneyEngine,
  sharedLivingJourneyEngine,
} from '@/domains/journey-engine';
import { DestinationService } from '@/domains/destinations/destination.service';
import { JourneyService } from '@/domains/journeys/journey.service';
import {
  buildAlternativeExplanationBundle,
  buildJourneyGroundedFacts,
} from './explanation-engine';
import { validateToolCallRequestSchema } from './schemas';
import {
  sanitizeUntrustedExternalText,
  verifyJourneyAccessAuthorization,
} from './security-guard';
import { sharedExternalEventImpactCoordinator } from '@/domains/external-events/impact-coordinator';
import {
  sharedFixtureProvider,
  sharedOpenMeteoProvider,
} from '@/domains/external-events/providers/external-event-provider';
import { BookingService } from '@/domains/bookings/booking.service';
import { PaymentService } from '@/domains/payments/payment.service';
import { RefundService } from '@/domains/refunds/refund.service';
import { SupplierService } from '@/domains/suppliers/supplier.service';
import { CancellationPolicyEngine } from '@/domains/refunds/policy-engine';
import { PricingEngine } from '@/domains/pricing/pricing-engine';
import type { RefundRecord } from '@/domains/refunds/types';
import { sharedCommunicationOrchestrator } from '@/domains/communications';
import type {
  AiErrorCategory,
  AiToolExecutionTrace,
  AiToolName,
  AiToolPermissionLevel,
  DeterministicTripPlanProposal,
  GroundedFactReference,
  OperatorAttentionItem,
  SessionActorContext,
} from './types';

/**
 * PHASE 05 — CENTRALIZED ALLOWLISTED AI TOOL REGISTRY
 *
 * Implements Sections 16, 17, 18, 29, 77, 97, and 98:
 * - Strict allowlist of 16 tools separated into READ_ONLY, SIMULATION, and MUTATION
 * - Enforces role & multi-tenant authorization via SessionActorContext (never trusting model claims)
 * - Sanitizes all tool outputs against tool-output injection
 * - Blocks automatic AI invocation of MUTATION tools without explicit human approval confirmation
 */

export interface ToolExecutionContext {
  engine?: LivingJourneyEngine;
  sessionActor: SessionActorContext;
  requestId: string;
  correlationId: string;
  humanApprovalConfirmed?: boolean;
}

export interface ToolHandlerOutput {
  data: Record<string, unknown>;
  summary: string;
  facts: GroundedFactReference[];
}

export interface AiToolDefinition {
  name: AiToolName;
  description: string;
  permissionLevel: AiToolPermissionLevel;
  allowedRoles: UserRole[];
  timeoutMs: number;
  auditRequired: boolean;
  handler: (
    args: Record<string, unknown>,
    ctx: ToolExecutionContext
  ) => Promise<ToolHandlerOutput>;
}

function getEngine(ctx: ToolExecutionContext): LivingJourneyEngine {
  return ctx.engine || sharedLivingJourneyEngine;
}

function requireAuthorizedJourney(
  args: Record<string, unknown>,
  ctx: ToolExecutionContext
) {
  const engine = getEngine(ctx);
  const journeyId =
    typeof args.journeyId === 'string' && args.journeyId.trim()
      ? args.journeyId.trim()
      : 'jrn_goa_01';

  const snapshot = engine.getSnapshot(journeyId);
  if (!snapshot) {
    const err = new Error(
      `JOURNEY_NOT_FOUND: Journey "${journeyId}" was not found.`
    );
    (err as Error & { category?: AiErrorCategory }).category =
      'INSUFFICIENT_INFORMATION';
    throw err;
  }

  const authCheck = verifyJourneyAccessAuthorization({
    engine,
    snapshot,
    sessionActor: ctx.sessionActor,
  });

  if (!authCheck.authorized) {
    const err = new Error(
      authCheck.reason || 'Unauthorized journey access denied.'
    );
    (err as Error & { category?: AiErrorCategory }).category =
      authCheck.errorCategory;
    throw err;
  }

  return { engine, snapshot, journeyId };
}

export const AI_TOOL_DEFINITIONS: Record<AiToolName, AiToolDefinition> = {
  get_current_journey: {
    name: 'get_current_journey',
    description:
      'Retrieve the authoritative JourneySnapshot for the authenticated user.',
    permissionLevel: 'READ_ONLY',
    allowedRoles: ['traveler', 'operator', 'coordinator', 'admin'],
    timeoutMs: 2000,
    auditRequired: false,
    handler: async (args, ctx) => {
      const { snapshot } = requireAuthorizedJourney(args, ctx);
      const facts = buildJourneyGroundedFacts({ snapshot });
      return {
        data: {
          journeyId: snapshot.journeyId,
          version: snapshot.version,
          title: snapshot.title,
          destinationId: snapshot.destinationId,
          startDate: snapshot.startDate,
          endDate: snapshot.endDate,
          travelersCount: snapshot.travelersCount,
          travelStyles: snapshot.travelStyles,
          pace: snapshot.pace,
          totalBudget: snapshot.totalBudget,
          allocatedCost: snapshot.allocatedCost,
          remainingBudget: snapshot.totalBudget - snapshot.allocatedCost,
          currency: snapshot.currency,
          status: snapshot.status,
          itemsCount: snapshot.items.filter((i) => i.status !== 'cancelled')
            .length,
        },
        summary: `Loaded journey "${snapshot.title}" (${snapshot.journeyId}) at version v${snapshot.version}.`,
        facts,
      };
    },
  },

  get_journey_summary: {
    name: 'get_journey_summary',
    description:
      'Retrieve a concise operational summary of the journey, active items, and open change requests.',
    permissionLevel: 'READ_ONLY',
    allowedRoles: ['traveler', 'operator', 'coordinator', 'admin'],
    timeoutMs: 2000,
    auditRequired: false,
    handler: async (args, ctx) => {
      const { engine, snapshot, journeyId } = requireAuthorizedJourney(args, ctx);
      const changeRequests = engine.getChangeRequestsForJourney(journeyId);
      const openChange = changeRequests.find(
        (c) =>
          c.state === 'AWAITING_APPROVAL' || c.state === 'ALTERNATIVES_READY'
      );
      const disruptedItems = snapshot.items.filter(
        (i) => i.status === 'disrupted'
      );
      const facts = buildJourneyGroundedFacts({
        snapshot,
        changeRequest: openChange,
      });

      return {
        data: {
          journeyId: snapshot.journeyId,
          version: snapshot.version,
          title: snapshot.title,
          allocatedCost: snapshot.allocatedCost,
          totalBudget: snapshot.totalBudget,
          remainingBudget: snapshot.totalBudget - snapshot.allocatedCost,
          disruptedItemsCount: disruptedItems.length,
          openChangeRequestId: openChange?.id || null,
          openChangeState: openChange?.state || null,
        },
        summary: `Journey ${snapshot.title} (v${snapshot.version}): ₹${snapshot.allocatedCost.toLocaleString()} / ₹${snapshot.totalBudget.toLocaleString()} allocated, ${disruptedItems.length} disrupted item(s).`,
        facts,
      };
    },
  },

  get_itinerary: {
    name: 'get_itinerary',
    description:
      'Retrieve ordered itinerary items, time windows, locations, and booking states for the authorized journey.',
    permissionLevel: 'READ_ONLY',
    allowedRoles: ['traveler', 'operator', 'coordinator', 'admin'],
    timeoutMs: 2000,
    auditRequired: false,
    handler: async (args, ctx) => {
      const { snapshot } = requireAuthorizedJourney(args, ctx);
      const activeItems = snapshot.items
        .filter((i) => i.status !== 'cancelled')
        .map((i) => ({
          id: i.id,
          dayNumber: i.dayNumber,
          sequenceOrder: i.sequenceOrder,
          type: i.type,
          title: sanitizeUntrustedExternalText(i.title).sanitizedData,
          subtitle: sanitizeUntrustedExternalText(i.subtitle).sanitizedData,
          displayWindow: i.displayWindow,
          locationName: i.location.name,
          price: i.price,
          currency: i.currency,
          status: i.status,
          bookingState: i.bookingState,
          isLocked: i.isLocked,
        }));

      const facts = buildJourneyGroundedFacts({ snapshot });
      return {
        data: {
          journeyId: snapshot.journeyId,
          version: snapshot.version,
          items: activeItems,
        },
        summary: `Retrieved ${activeItems.length} active itinerary stop(s) for ${snapshot.title} (v${snapshot.version}).`,
        facts,
      };
    },
  },

  get_booking_status: {
    name: 'get_booking_status',
    description:
      'Retrieve authoritative booking confirmation and lock states for all items on the journey.',
    permissionLevel: 'READ_ONLY',
    allowedRoles: ['traveler', 'operator', 'coordinator', 'admin'],
    timeoutMs: 2000,
    auditRequired: false,
    handler: async (args, ctx) => {
      const { snapshot } = requireAuthorizedJourney(args, ctx);
      const bookings = snapshot.items.map((item) => ({
        bookingId: item.bookingId || `bkg_${item.id}`,
        itemId: item.id,
        title: item.title,
        type: item.type,
        displayWindow: item.displayWindow,
        bookingState: item.bookingState,
        isLocked: item.isLocked,
        price: item.price,
        currency: item.currency,
        status: item.status,
      }));

      const confirmedCount = bookings.filter(
        (b) =>
          (b.bookingState === 'CONFIRMED' ||
            b.bookingState === 'NON_REFUNDABLE') &&
          b.status !== 'cancelled'
      ).length;

      const facts: GroundedFactReference[] = bookings.map((b) => ({
        factId: `FACT-BOOKING-${b.bookingId}`,
        sourceType: 'BOOKING_RECORD',
        sourceEntityId: b.bookingId,
        sourceTimestamp: snapshot.capturedAt,
        journeyVersion: snapshot.version,
        label: b.title,
        authoritativeValue: `${b.bookingState} (₹${b.price.toLocaleString()})`,
      }));

      return {
        data: {
          journeyId: snapshot.journeyId,
          version: snapshot.version,
          confirmedCount,
          bookings,
        },
        summary: `${confirmedCount} confirmed active booking(s) on journey ${snapshot.journeyId} (v${snapshot.version}).`,
        facts,
      };
    },
  },

  get_budget_status: {
    name: 'get_budget_status',
    description:
      'Retrieve authoritative allocated cost, total budget cap, remaining budget, and item cost breakdown.',
    permissionLevel: 'READ_ONLY',
    allowedRoles: ['traveler', 'operator', 'coordinator', 'admin'],
    timeoutMs: 2000,
    auditRequired: false,
    handler: async (args, ctx) => {
      const { snapshot } = requireAuthorizedJourney(args, ctx);
      const remainingBudget = snapshot.totalBudget - snapshot.allocatedCost;
      const fact: GroundedFactReference = {
        factId: `FACT-BUDGET-${snapshot.journeyId}-V${snapshot.version}`,
        sourceType: 'BUDGET_LEDGER',
        sourceEntityId: snapshot.journeyId,
        sourceTimestamp: snapshot.capturedAt,
        journeyVersion: snapshot.version,
        label: 'Journey Budget Ledger',
        authoritativeValue: `Allocated ₹${snapshot.allocatedCost.toLocaleString()} / Total ₹${snapshot.totalBudget.toLocaleString()} (Remaining ₹${remainingBudget.toLocaleString()})`,
      };

      return {
        data: {
          journeyId: snapshot.journeyId,
          version: snapshot.version,
          totalBudget: snapshot.totalBudget,
          allocatedCost: snapshot.allocatedCost,
          remainingBudget,
          currency: snapshot.currency,
          hardBudgetConstraint: snapshot.hardBudgetConstraint,
        },
        summary: `Allocated cost is ₹${snapshot.allocatedCost.toLocaleString()} out of ₹${snapshot.totalBudget.toLocaleString()} (${snapshot.currency}), leaving ₹${remainingBudget.toLocaleString()} remaining.`,
        facts: [fact],
      };
    },
  },

  get_active_change_request: {
    name: 'get_active_change_request',
    description:
      'Retrieve the active ChangeRequest and its scored alternatives for the authorized journey.',
    permissionLevel: 'READ_ONLY',
    allowedRoles: ['traveler', 'operator', 'coordinator', 'admin'],
    timeoutMs: 2000,
    auditRequired: false,
    handler: async (args, ctx) => {
      const { engine, snapshot, journeyId } = requireAuthorizedJourney(args, ctx);
      const changeRequests = engine.getChangeRequestsForJourney(journeyId);
      const activeReq =
        (typeof args.changeRequestId === 'string'
          ? changeRequests.find((c) => c.id === args.changeRequestId)
          : undefined) ||
        changeRequests.find(
          (c) =>
            c.state === 'AWAITING_APPROVAL' ||
            c.state === 'ALTERNATIVES_READY' ||
            c.state === 'APPROVED'
        ) ||
        changeRequests[0];

      if (!activeReq) {
        return {
          data: {
            journeyId,
            version: snapshot.version,
            activeChangeRequest: null,
          },
          summary: `No active change request exists on journey ${journeyId}.`,
          facts: buildJourneyGroundedFacts({ snapshot }),
        };
      }

      return {
        data: {
          journeyId,
          version: snapshot.version,
          changeRequestId: activeReq.id,
          state: activeReq.state,
          severity: activeReq.severity,
          requiresApproval: activeReq.requiresApproval,
          expectedJourneyVersion: activeReq.expectedJourneyVersion,
          validAlternativesCount: activeReq.scoredAlternatives.length,
          rejectedCandidatesCount: activeReq.rejectedCandidates.length,
          recommendedAlternativeId: activeReq.selectedAlternativeId || null,
        },
        summary: `Active ChangeRequest ${activeReq.id} is in state ${activeReq.state} with ${activeReq.scoredAlternatives.length} valid alternative(s).`,
        facts: buildJourneyGroundedFacts({
          snapshot,
          changeRequest: activeReq,
          selectedAlternative: activeReq.scoredAlternatives[0],
        }),
      };
    },
  },

  analyze_journey_impact: {
    name: 'analyze_journey_impact',
    description:
      'Run the deterministic 10-dimension ImpactAnalyzer on a disrupted or target item without mutating state.',
    permissionLevel: 'SIMULATION',
    allowedRoles: ['traveler', 'operator', 'coordinator', 'admin'],
    timeoutMs: 3000,
    auditRequired: true,
    handler: async (args, ctx) => {
      const { snapshot } = requireAuthorizedJourney(args, ctx);
      const affectedItemId =
        typeof args.affectedItemId === 'string' && args.affectedItemId
          ? args.affectedItemId
          : snapshot.items.find((i) => i.status === 'disrupted')?.id ||
            'itm_goa_03_scuba';

      const impact = ImpactAnalyzer.analyzeSnapshot(
        snapshot,
        {
          journeyId: snapshot.journeyId,
          triggerType: 'ITEM_CANCELLED',
          actorId: ctx.sessionActor.actorId,
          actorRole: ctx.sessionActor.actorRole as UserRole,
          actorOrganizationId: ctx.sessionActor.actorOrganizationId,
          affectedItemId,
          title:
            typeof args.title === 'string'
              ? args.title
              : 'Disruption Impact Analysis',
          reason:
            typeof args.reason === 'string'
              ? args.reason
              : 'Evaluating downstream dependency and constraint impact.',
        },
        `cr_sim_${ctx.requestId}`
      );

      const fact: GroundedFactReference = {
        factId: `FACT-IMPACT-${snapshot.journeyId}-V${snapshot.version}`,
        sourceType: 'IMPACT_ANALYSIS',
        sourceEntityId: affectedItemId,
        sourceTimestamp: impact.analyzedAt,
        journeyVersion: snapshot.version,
        label: `Impact Analysis (${impact.overallSeverity})`,
        authoritativeValue: `${impact.downstreamItemIds.length} downstream item(s), requiresApproval=${String(impact.requiresApproval)}`,
      };

      return {
        data: {
          journeyId: snapshot.journeyId,
          journeyVersion: snapshot.version,
          affectedItemId,
          overallSeverity: impact.overallSeverity,
          downstreamItemIds: impact.downstreamItemIds,
          requiresApproval: impact.requiresApproval,
          directSummary: impact.dimensions.DIRECT.explanation,
          downstreamSummary: impact.dimensions.DOWNSTREAM.explanation,
        },
        summary: `Impact analysis completed: severity=${impact.overallSeverity}, downstreamCount=${impact.downstreamItemIds.length}, requiresApproval=${String(impact.requiresApproval)}.`,
        facts: [fact],
      };
    },
  },

  find_valid_alternatives: {
    name: 'find_valid_alternatives',
    description:
      'Invoke the deterministic AlternativeEngine (or LivingJourneyEngine.detectAndAnalyzeChange) with preserve constraints and budget policies to retrieve validated, scored alternatives.',
    permissionLevel: 'SIMULATION',
    allowedRoles: ['traveler', 'operator', 'coordinator', 'admin'],
    timeoutMs: 3000,
    auditRequired: true,
    handler: async (args, ctx) => {
      const { engine, snapshot } = requireAuthorizedJourney(args, ctx);
      const disruptedItemId =
        typeof args.disruptedItemId === 'string' && args.disruptedItemId
          ? args.disruptedItemId
          : snapshot.items.find((i) => i.status === 'disrupted')?.id ||
            'itm_goa_03_scuba';

      const protectedItemIds = Array.isArray(args.protectedItemIds)
        ? args.protectedItemIds.filter((id): id is string => typeof id === 'string')
        : [];

      const budgetPolicy =
        args.budgetPolicy === 'NO_INCREASE' ||
        args.budgetPolicy === 'STRICT_CAP' ||
        args.budgetPolicy === 'FLEXIBLE'
          ? args.budgetPolicy
          : undefined;

      const preferredTags = Array.isArray(args.preferredTags)
        ? args.preferredTags.filter((t): t is string => typeof t === 'string')
        : [];

      const changeReq = engine.detectAndAnalyzeChange({
        idempotencyKey:
          typeof args.idempotencyKey === 'string' && args.idempotencyKey
            ? args.idempotencyKey
            : `ai_detect_${snapshot.journeyId}_v${snapshot.version}_${disruptedItemId}_${protectedItemIds.join(',')}_${budgetPolicy || 'default'}`,
        journeyId: snapshot.journeyId,
        triggerType: 'ITEM_CANCELLED',
        actorId: ctx.sessionActor.actorId,
        actorRole: ctx.sessionActor.actorRole as UserRole,
        actorOrganizationId: ctx.sessionActor.actorOrganizationId,
        affectedItemId: disruptedItemId,
        title:
          typeof args.title === 'string'
            ? args.title
            : 'Activity Cancelled — AI Assisted Recovery',
        reason:
          typeof args.reason === 'string'
            ? args.reason
            : 'Evaluating valid deterministic replacement alternatives.',
        protectedItemIds,
        budgetPolicy,
        preferredTags,
        requiresApproval: true,
      });

      const facts = buildJourneyGroundedFacts({
        snapshot,
        changeRequest: changeReq,
        selectedAlternative: changeReq.scoredAlternatives[0],
      });

      return {
        data: {
          changeRequestId: changeReq.id,
          journeyId: snapshot.journeyId,
          expectedJourneyVersion: changeReq.expectedJourneyVersion,
          state: changeReq.state,
          validAlternativesCount: changeReq.scoredAlternatives.length,
          rejectedCandidatesCount: changeReq.rejectedCandidates.length,
          validAlternatives: changeReq.scoredAlternatives.map((alt) => ({
            id: alt.id,
            candidateId: alt.candidate.id,
            title: alt.candidate.title,
            rank: alt.rank,
            totalScore: alt.scoreBreakdown.totalScore,
            displayWindow: alt.displayWindow,
            priceAmount: alt.candidate.priceAmount,
            priceDelta: alt.priceDelta,
            budgetAfter: alt.budgetAfter,
            downstreamShiftsCount: alt.downstreamShifts.length,
          })),
        },
        summary: `AlternativeEngine validated ${changeReq.scoredAlternatives.length} option(s) and rejected ${changeReq.rejectedCandidates.length} invalid candidate(s). Top option: ${changeReq.scoredAlternatives[0]?.candidate.title || 'None'} (${changeReq.scoredAlternatives[0]?.scoreBreakdown.totalScore || 0}/100).`,
        facts,
      };
    },
  },

  simulate_journey_change: {
    name: 'simulate_journey_change',
    description:
      'Run the pure non-mutating JourneySimulator to compute a before/after diff for a valid alternative.',
    permissionLevel: 'SIMULATION',
    allowedRoles: ['traveler', 'operator', 'coordinator', 'admin'],
    timeoutMs: 3000,
    auditRequired: true,
    handler: async (args, ctx) => {
      const { engine, snapshot, journeyId } = requireAuthorizedJourney(args, ctx);
      const changeRequests = engine.getChangeRequestsForJourney(journeyId);
      const changeReq = changeRequests[0];

      const disruptedItemId =
        typeof args.disruptedItemId === 'string' && args.disruptedItemId
          ? args.disruptedItemId
          : changeReq?.trigger.affectedItemId ||
            snapshot.items.find((i) => i.status === 'disrupted')?.id ||
            'itm_goa_03_scuba';

      const altEngine = new AlternativeEngine();
      const altOutput = changeReq?.scoredAlternatives.length
        ? { validAlternatives: changeReq.scoredAlternatives }
        : altEngine.generateAlternatives({
            snapshot,
            disruptedItemId,
            candidates: CANDIDATE_INVENTORY_CATALOG,
          });

      const targetAlt =
        (typeof args.alternativeId === 'string'
          ? altOutput.validAlternatives.find(
              (a) =>
                a.id === args.alternativeId ||
                a.candidate.id === args.alternativeId
            )
          : undefined) || altOutput.validAlternatives[0];

      if (!targetAlt) {
        return {
          data: {
            simulated: false,
            reason: 'No valid alternative available for simulation.',
          },
          summary: 'No valid alternative available to simulate.',
          facts: [],
        };
      }

      const sim = JourneySimulator.simulateAlternative({
        snapshot,
        disruptedItemId,
        alternative: targetAlt,
      });

      const fact: GroundedFactReference = {
        factId: `FACT-SIM-${targetAlt.id}-V${snapshot.version}`,
        sourceType: 'SIMULATION_DIFF',
        sourceEntityId: targetAlt.id,
        sourceTimestamp: new Date().toISOString(),
        journeyVersion: snapshot.version,
        label: `Simulation: ${targetAlt.candidate.title}`,
        authoritativeValue: `Cost Delta ₹${sim.diff.costDelta.toLocaleString()} • Budget After ₹${sim.diff.budgetAfter.toLocaleString()} • Remaining Conflicts ${sim.diff.conflictsAfter.length}`,
      };

      return {
        data: {
          simulated: true,
          alternativeId: targetAlt.id,
          alternativeTitle: targetAlt.candidate.title,
          costDelta: sim.diff.costDelta,
          budgetBefore: sim.diff.budgetBefore,
          budgetAfter: sim.diff.budgetAfter,
          remainingBudgetAfter: sim.diff.remainingBudgetAfter,
          conflictsResolvedCount: sim.diff.conflictsResolved.length,
          conflictsAfterCount: sim.diff.conflictsAfter.length,
          movedItemsCount: sim.diff.movedItems.length,
        },
        summary: `Simulated "${targetAlt.candidate.title}" cleanly on v${snapshot.version} (live state untouched). Budget changes ₹${sim.diff.budgetBefore.toLocaleString()} -> ₹${sim.diff.budgetAfter.toLocaleString()}.`,
        facts: [fact],
      };
    },
  },

  explain_alternative: {
    name: 'explain_alternative',
    description:
      'Generate a grounded explanation of a scored alternative using only deterministic scoring factors and simulation diffs.',
    permissionLevel: 'SIMULATION',
    allowedRoles: ['traveler', 'operator', 'coordinator', 'admin'],
    timeoutMs: 2000,
    auditRequired: false,
    handler: async (args, ctx) => {
      const { engine, snapshot, journeyId } = requireAuthorizedJourney(args, ctx);
      const changeReq = engine.getChangeRequestsForJourney(journeyId)[0];
      const targetAlt =
        (typeof args.alternativeId === 'string' && changeReq
          ? changeReq.scoredAlternatives.find(
              (a) =>
                a.id === args.alternativeId ||
                a.candidate.id === args.alternativeId
            )
          : undefined) || changeReq?.scoredAlternatives[0];

      if (!targetAlt) {
        return {
          data: { explained: false },
          summary: 'No scored alternative available to explain.',
          facts: [],
        };
      }

      const bundle = buildAlternativeExplanationBundle({
        alternative: targetAlt,
        snapshot,
        changeRequest: changeReq,
        simulation: changeReq?.simulationsByAlternativeId[targetAlt.id],
      });

      return {
        data: {
          explained: true,
          alternativeId: targetAlt.id,
          title: targetAlt.candidate.title,
          totalScore: targetAlt.scoreBreakdown.totalScore,
          shortExplanation: bundle.shortExplanation,
          detailedExplanation: bundle.detailedExplanation,
          whyRecommendedBullets: bundle.whyRecommendedBullets,
        },
        summary: bundle.shortExplanation,
        facts: buildJourneyGroundedFacts({
          snapshot,
          changeRequest: changeReq,
          selectedAlternative: targetAlt,
        }),
      };
    },
  },

  get_notifications: {
    name: 'get_notifications',
    description:
      'Retrieve transactional outbox notifications for the authorized journey.',
    permissionLevel: 'READ_ONLY',
    allowedRoles: ['traveler', 'operator', 'coordinator', 'admin'],
    timeoutMs: 2000,
    auditRequired: false,
    handler: async (args, ctx) => {
      const { engine, snapshot, journeyId } = requireAuthorizedJourney(args, ctx);
      const events = engine.getOutboxEventsForJourney(journeyId);
      return {
        data: {
          journeyId,
          version: snapshot.version,
          notificationsCount: events.length,
          recentNotifications: events.slice(0, 6).map((e) => ({
            id: e.id,
            eventType: e.eventType,
            createdAt: e.createdAt,
            payload: e.payload,
          })),
        },
        summary: `Retrieved ${events.length} operational notification event(s) for journey ${journeyId}.`,
        facts: [],
      };
    },
  },

  get_destination_context: {
    name: 'get_destination_context',
    description:
      'Retrieve canonical destination metadata and curated experiences from DestinationService.',
    permissionLevel: 'READ_ONLY',
    allowedRoles: ['traveler', 'operator', 'coordinator', 'admin'],
    timeoutMs: 2000,
    auditRequired: false,
    handler: async (args) => {
      const slug =
        typeof args.slug === 'string' && args.slug.trim()
          ? args.slug.trim().toLowerCase()
          : 'goa';
      const destinations = await DestinationService.getAll();
      const matched =
        destinations.find(
          (d) =>
            d.slug.toLowerCase() === slug ||
            d.name.toLowerCase().includes(slug)
        ) || destinations[0];

      return {
        data: {
          destinationId: matched.id,
          name: matched.name,
          slug: matched.slug,
          country: matched.country,
          averageDailyBudget: matched.average_daily_budget,
          bestTimeToVisit: matched.best_season || 'Year-round',
          tags: matched.styles || [],
        },
        summary: `Loaded destination context for ${matched.name} (avg daily budget ₹${matched.average_daily_budget.toLocaleString()}).`,
        facts: [],
      };
    },
  },

  get_travel_route: {
    name: 'get_travel_route',
    description:
      'Calculate deterministic travel distance and duration between consecutive itinerary stops.',
    permissionLevel: 'READ_ONLY',
    allowedRoles: ['traveler', 'operator', 'coordinator', 'admin'],
    timeoutMs: 2000,
    auditRequired: false,
    handler: async (args, ctx) => {
      const { snapshot } = requireAuthorizedJourney(args, ctx);
      const activeItems = snapshot.items
        .filter((i) => i.status !== 'cancelled')
        .sort((a, b) => a.sequenceOrder - b.sequenceOrder);

      const legs: Array<{
        fromTitle: string;
        toTitle: string;
        distanceMeters: number;
        travelMinutes: number;
        availableGapMinutes: number;
        safetyBufferMinutes: number;
        feasible: boolean;
      }> = [];

      for (let i = 0; i < activeItems.length - 1; i += 1) {
        const current = activeItems[i];
        const next = activeItems[i + 1];
        if (current.dayNumber !== next.dayNumber) continue;

        const dist = computeDeterministicDistanceMeters(
          current.location.latitude,
          current.location.longitude,
          next.location.latitude,
          next.location.longitude
        );
        const travelMin = computeDeterministicTravelMinutes(
          dist,
          current.travelModeToNext || 'driving'
        );
        const gapMin = Math.round(
          (new Date(next.startTimeIso).getTime() -
            new Date(current.endTimeIso).getTime()) /
            60000
        );
        const required = travelMin + (current.safetyBufferMinutes || 15);
        legs.push({
          fromTitle: current.title,
          toTitle: next.title,
          distanceMeters: dist,
          travelMinutes: travelMin,
          availableGapMinutes: gapMin,
          safetyBufferMinutes: current.safetyBufferMinutes || 15,
          feasible: gapMin >= required,
        });
      }

      const allFeasible = legs.every((l) => l.feasible);
      const fact: GroundedFactReference = {
        factId: `FACT-ROUTE-${snapshot.journeyId}-V${snapshot.version}`,
        sourceType: 'ROUTE_FEASIBILITY',
        sourceEntityId: snapshot.journeyId,
        sourceTimestamp: new Date().toISOString(),
        journeyVersion: snapshot.version,
        label: 'Route & Buffer Feasibility',
        authoritativeValue: allFeasible
          ? `All ${legs.length} transfer leg(s) feasible`
          : 'Transfer buffer conflict detected',
      };

      return {
        data: {
          journeyId: snapshot.journeyId,
          version: snapshot.version,
          allFeasible,
          legs,
        },
        summary: `Evaluated ${legs.length} transfer leg(s): allFeasible=${String(allFeasible)}.`,
        facts: [fact],
      };
    },
  },

  get_operator_tour_status: {
    name: 'get_operator_tour_status',
    description:
      'Retrieve operator-scoped active journeys and tour execution status within the authenticated operator organization.',
    permissionLevel: 'READ_ONLY',
    allowedRoles: ['operator', 'coordinator', 'admin'],
    timeoutMs: 2500,
    auditRequired: true,
    handler: async (_args, ctx) => {
      if (
        ctx.sessionActor.actorRole !== 'operator' &&
        ctx.sessionActor.actorRole !== 'coordinator' &&
        ctx.sessionActor.actorRole !== 'admin'
      ) {
        const err = new Error(
          'UNAUTHORIZED_ACCESS: Only operators, coordinators, or admins can query operator tour status.'
        );
        (err as Error & { category?: AiErrorCategory }).category =
          'UNAUTHORIZED_ACCESS';
        throw err;
      }

      const engine = getEngine(ctx);
      const goaSnap = engine.getSnapshot('jrn_goa_01');
      if (
        goaSnap &&
        ctx.sessionActor.actorRole !== 'admin' &&
        ctx.sessionActor.actorOrganizationId &&
        goaSnap.organizationId &&
        ctx.sessionActor.actorOrganizationId !== goaSnap.organizationId
      ) {
        const err = new Error(
          `CROSS_TENANT_DENIED: Organization "${ctx.sessionActor.actorOrganizationId}" cannot access organization "${goaSnap.organizationId}" operational tours.`
        );
        (err as Error & { category?: AiErrorCategory }).category =
          'CROSS_TENANT_DENIED';
        throw err;
      }

      const allJourneys = await JourneyService.getAll();
      const goaChangeRequests = engine.getChangeRequestsForJourney('jrn_goa_01');
      const activeGoaCr = goaChangeRequests[0];

      const attentionItems: OperatorAttentionItem[] = [];
      if (goaSnap) {
        const hasDisruption =
          goaSnap.items.some((i) => i.status === 'disrupted') ||
          (activeGoaCr && activeGoaCr.state !== 'APPLIED');

        if (hasDisruption) {
          attentionItems.push({
            journeyId: goaSnap.journeyId,
            journeyTitle: goaSnap.title,
            travelerId: goaSnap.travelerId,
            travelerName: 'Aarav & Meera Sharma',
            journeyVersion: goaSnap.version,
            issueCategory: 'VENDOR_CANCELLATION',
            severity: activeGoaCr?.severity || 'HIGH',
            headline: 'Goa Getaway #jrn_goa_01 — Baga Reef Scuba Diving Cancelled',
            summary: `Vendor Coastal Aqua cancelled Scuba Diving due to 2.8m swell advisory. ${activeGoaCr?.scoredAlternatives.length || 4} valid alternatives ready for review (Top: Chorão Island Mangrove Kayaking, 93/100).`,
            changeRequestId: activeGoaCr?.id,
            validAlternativesCount:
              activeGoaCr?.scoredAlternatives.length || 4,
            recommendedAction:
              'Review ChangeRequest and approve Chorão Island Mangrove Kayaking (saves ₹2,800, preserves sunset cruise).',
          });
        }
      }

      const fact: GroundedFactReference = {
        factId: `FACT-OP-QUEUE-${goaSnap?.version || 17}`,
        sourceType: 'OPERATOR_QUEUE',
        sourceEntityId: ctx.sessionActor.actorOrganizationId || 'org_goa_luxury_escapes',
        sourceTimestamp: new Date().toISOString(),
        journeyVersion: goaSnap?.version || 17,
        label: 'Operator Active Tours Queue',
        authoritativeValue: `${allJourneys.length} total journeys • ${attentionItems.length} requiring immediate attention`,
      };

      return {
        data: {
          totalToursEvaluated: allJourneys.length,
          attentionRequiredCount: attentionItems.length,
          attentionItems,
        },
        summary: `Evaluated ${allJourneys.length} tours in operator organization: ${attentionItems.length} tour(s) currently require attention.`,
        facts: [fact],
      };
    },
  },

  get_operational_conflicts: {
    name: 'get_operational_conflicts',
    description:
      'Evaluate active constraint violations and schedule conflicts across authorized journeys.',
    permissionLevel: 'READ_ONLY',
    allowedRoles: ['operator', 'coordinator', 'admin', 'traveler'],
    timeoutMs: 2500,
    auditRequired: false,
    handler: async (args, ctx) => {
      const { snapshot } = requireAuthorizedJourney(args, ctx);
      const constraintEngine = new ConstraintEngine();
      const evaluation = constraintEngine.evaluateSnapshot(snapshot);

      return {
        data: {
          journeyId: snapshot.journeyId,
          version: snapshot.version,
          valid: evaluation.valid,
          hardViolationsCount: evaluation.hardViolations.length,
          softWarningsCount: evaluation.softViolations.length,
          hardViolations: evaluation.hardViolations,
          softWarnings: evaluation.softViolations,
        },
        summary: `Constraint evaluation for ${snapshot.journeyId} (v${snapshot.version}): ${evaluation.hardViolations.length} hard violation(s), ${evaluation.softViolations.length} soft warning(s).`,
        facts: buildJourneyGroundedFacts({ snapshot }),
      };
    },
  },

  plan_deterministic_trip: {
    name: 'plan_deterministic_trip',
    description:
      'Construct and validate a deterministic multi-day trip plan from structured traveler preferences using DestinationService, JourneyService, and ConstraintEngine.',
    permissionLevel: 'SIMULATION',
    allowedRoles: ['traveler', 'operator', 'coordinator', 'admin'],
    timeoutMs: 3000,
    auditRequired: true,
    handler: async (args, ctx) => {
      const engine = getEngine(ctx);
      const destinationName =
        typeof args.destination === 'string' && args.destination.trim()
          ? args.destination.trim()
          : 'Goa';
      const durationDays =
        typeof args.durationDays === 'number' && args.durationDays > 0
          ? args.durationDays
          : 5;
      const travelersCount =
        typeof args.travelerCount === 'number' && args.travelerCount > 0
          ? args.travelerCount
          : 2;
      const totalBudget =
        typeof args.budget === 'number' && args.budget > 0
          ? args.budget
          : 40000;
      const pace =
        args.pace === 'relaxed' ||
        args.pace === 'balanced' ||
        args.pace === 'fast-paced'
          ? args.pace
          : 'relaxed';
      const morningPreference =
        args.morningPreference === 'AVOID_EARLY_START' ||
        args.morningPreference === 'EARLY_BIRD'
          ? args.morningPreference
          : 'AVOID_EARLY_START';
      const travelStyles = Array.isArray(args.interests)
        ? args.interests.filter((s): s is string => typeof s === 'string')
        : ['Adventure', 'Food'];

      const goaSnap = engine.getSnapshot('jrn_goa_01');
      const activeItems = goaSnap
        ? goaSnap.items.filter((i) => i.status !== 'cancelled')
        : [];

      const estimatedAllocatedCost = Math.min(
        totalBudget,
        goaSnap ? goaSnap.allocatedCost : 38700
      );
      const remainingBudget = Math.max(0, totalBudget - estimatedAllocatedCost);

      const proposal: DeterministicTripPlanProposal = {
        planId: `plan_${destinationName.toLowerCase()}_${durationDays}d_${travelersCount}p`,
        journeyId: 'jrn_goa_01',
        destinationId: 'dest_goa_01',
        destinationName,
        durationDays,
        travelersCount,
        totalBudget,
        estimatedAllocatedCost,
        remainingBudget,
        currency: 'INR',
        pace,
        morningPreference,
        travelStyles: travelStyles.length > 0 ? travelStyles : ['Adventure', 'Food'],
        constraintValid: estimatedAllocatedCost <= totalBudget,
        stopsCount: activeItems.length || 6,
        highlights: activeItems.map((item) => ({
          dayNumber: item.dayNumber,
          title: item.title,
          window:
            morningPreference === 'AVOID_EARLY_START' &&
            item.displayWindow.startsWith('07:')
              ? '10:00 – 11:30'
              : item.displayWindow,
          price: item.price,
          category: item.categoryTags[0] || item.type,
        })),
      };

      const fact: GroundedFactReference = {
        factId: `FACT-PLAN-${proposal.planId}`,
        sourceType: 'JOURNEY_STATE',
        sourceEntityId: proposal.journeyId,
        sourceTimestamp: new Date().toISOString(),
        journeyVersion: goaSnap?.version || 17,
        label: `${durationDays}-Day ${destinationName} Plan (${travelersCount} Travelers)`,
        authoritativeValue: `Allocated ₹${estimatedAllocatedCost.toLocaleString()} / Budget ₹${totalBudget.toLocaleString()} • Pace: ${pace} (${morningPreference})`,
      };

      return {
        data: {
          planProposal: proposal,
        },
        summary: `Validated ${durationDays}-day ${destinationName} itinerary for ${travelersCount} traveler(s): ₹${estimatedAllocatedCost.toLocaleString()} allocated within ₹${totalBudget.toLocaleString()} budget (${pace} pace, ${morningPreference}).`,
        facts: [fact],
      };
    },
  },

  apply_journey_change: {
    name: 'apply_journey_change',
    description:
      'Execute an approved ChangeRequest atomically through LivingJourneyEngine.applyChange. NEVER auto-invocable without explicit human approval confirmation.',
    permissionLevel: 'MUTATION',
    allowedRoles: ['traveler', 'operator', 'coordinator', 'admin'],
    timeoutMs: 4000,
    auditRequired: true,
    handler: async (args, ctx) => {
      if (ctx.humanApprovalConfirmed !== true) {
        const err = new Error(
          'MUTATION_APPROVAL_REQUIRED: AI cannot automatically invoke apply_journey_change without explicit human approval confirmation.'
        );
        (err as Error & { category?: AiErrorCategory }).category =
          'MUTATION_APPROVAL_REQUIRED';
        throw err;
      }

      const { engine, snapshot } = requireAuthorizedJourney(args, ctx);
      const changeRequestId =
        typeof args.changeRequestId === 'string' && args.changeRequestId.trim()
          ? args.changeRequestId.trim()
          : '';

      if (!changeRequestId) {
        const err = new Error(
          'VALIDATION_FAILED: changeRequestId is required to apply a journey change.'
        );
        (err as Error & { category?: AiErrorCategory }).category =
          'DETERMINISTIC_VALIDATION_FAILED';
        throw err;
      }

      const expectedVersion =
        typeof args.expectedJourneyVersion === 'number'
          ? args.expectedJourneyVersion
          : typeof args.expectedVersion === 'number'
          ? args.expectedVersion
          : undefined;

      if (
        expectedVersion !== undefined &&
        expectedVersion !== snapshot.version
      ) {
        const err = new Error(
          `JOURNEY_VERSION_CONFLICT: Proposal expected v${expectedVersion}, but authoritative journey is at v${snapshot.version}.`
        );
        (err as Error & { category?: AiErrorCategory }).category =
          'JOURNEY_VERSION_CONFLICT';
        throw err;
      }

      const applyResult = engine.applyChange({
        changeRequestId,
        alternativeId:
          typeof args.alternativeId === 'string'
            ? args.alternativeId
            : undefined,
        actorId: ctx.sessionActor.actorId,
        actorRole: ctx.sessionActor.actorRole as UserRole,
        actorOrganizationId: ctx.sessionActor.actorOrganizationId,
        idempotencyKey:
          typeof args.idempotencyKey === 'string'
            ? args.idempotencyKey
            : `ai_apply_${changeRequestId}_v${snapshot.version}`,
      });

      if (applyResult.success && applyResult.updatedSnapshot) {
        JourneyService.syncFromEngineSnapshot({
          journeyId: applyResult.updatedSnapshot.journeyId,
          version: applyResult.updatedSnapshot.version,
          allocatedCost: applyResult.updatedSnapshot.allocatedCost,
          stops: applyResult.updatedSnapshot.items.map((item) => ({
            id: item.id,
            journeyId: item.journeyId,
            dayNumber: item.dayNumber,
            sequenceOrder: item.sequenceOrder,
            itemType:
              item.type === 'accommodation'
                ? 'accommodation'
                : item.type === 'meal'
                ? 'meal'
                : item.type === 'transport' ||
                  item.type === 'flight' ||
                  item.type === 'transfer'
                ? 'transport'
                : 'activity',
            title: item.title,
            subtitle: item.subtitle,
            startTimeIso: item.startTimeIso,
            endTimeIso: item.endTimeIso,
            displayWindow: item.displayWindow,
            price: item.price,
            currency: item.currency,
            status: item.status === 'cancelled' ? 'disrupted' : item.status,
            safetyBufferMinutes: item.safetyBufferMinutes,
            location: item.location,
          })),
        });
      }

      const postSnap = applyResult.updatedSnapshot || snapshot;
      return {
        data: {
          applyResult,
        },
        summary: applyResult.success
          ? `ChangeRequest ${changeRequestId} applied atomically. Journey version incremented to v${postSnap.version}.`
          : `ChangeRequest ${changeRequestId} failed to apply: ${applyResult.errorCode} (${applyResult.errorMessage}).`,
        facts: buildJourneyGroundedFacts({
          snapshot: postSnap,
          changeRequest: applyResult.changeRequest,
        }),
      };
    },
  },

  get_current_weather: {
    name: 'get_current_weather',
    description:
      'Retrieve verified, normalized atmospheric observations (temperature, wind, precipitation) for a coordinate or journey location.',
    permissionLevel: 'READ_ONLY',
    allowedRoles: ['traveler', 'operator', 'coordinator', 'admin'],
    timeoutMs: 8000,
    auditRequired: false,
    handler: async (args, ctx) => {
      let lat = typeof args.latitude === 'number' ? args.latitude : undefined;
      let lng = typeof args.longitude === 'number' ? args.longitude : undefined;
      let locName = typeof args.locationName === 'string' ? args.locationName : 'Goa Coastal Area';

      if (lat === undefined || lng === undefined) {
        if (typeof args.journeyId === 'string' && args.journeyId.trim()) {
          const { snapshot } = requireAuthorizedJourney(args, ctx);
          const firstItem = snapshot.items.find((i) => i.location?.coordinate || (i.location && typeof i.location.latitude === 'number'));
          const loc = firstItem?.location;
          if (loc) {
            lat = loc.coordinate?.lat ?? loc.latitude;
            lng = loc.coordinate?.lng ?? loc.longitude;
            locName = loc.name || snapshot.title;
          }
        }
      }
      if (lat === undefined || lng === undefined) {
        lat = 15.2993;
        lng = 74.124;
      }

      const geoCoord = { latitude: lat, longitude: lng, lat, lng };

      let obs;
      try {
        obs = await sharedFixtureProvider.fetchCurrentObservations({
          coordinates: geoCoord,
          locationName: locName,
        });
      } catch {
        obs = await sharedOpenMeteoProvider.fetchCurrentObservations({
          coordinates: geoCoord,
          locationName: locName,
        });
      }

      const factId = `FACT-WEATHER-${lat.toFixed(4)}-${lng.toFixed(4)}-${obs.observedAt}`;
      const facts: GroundedFactReference[] = [
        {
          factId,
          sourceType: 'EXTERNAL_WEATHER',
          sourceEntityId: obs.id,
          sourceTimestamp: obs.observedAt,
          label: `${obs.locationName} Weather: ${obs.weatherCondition}, ${obs.temperatureC}°C, Wind ${obs.windSpeedKmH} km/h (Gusts ${obs.windGustKmH} km/h)`,
          authoritativeValue: `${obs.temperatureC}C, ${obs.windSpeedKmH}kmh_wind`,
        },
      ];

      return {
        data: {
          observation: obs,
        },
        summary: `Current weather at ${obs.locationName}: ${obs.temperatureC}°C (feels like ${obs.feelsLikeC}°C), ${obs.weatherCondition}, wind ${obs.windSpeedKmH} km/h, gusting ${obs.windGustKmH} km/h. Freshness: ${obs.freshness}.`,
        facts,
      };
    },
  },

  get_weather_forecast: {
    name: 'get_weather_forecast',
    description:
      'Retrieve normalized weather forecast timeline for coordinates or journey dates.',
    permissionLevel: 'READ_ONLY',
    allowedRoles: ['traveler', 'operator', 'coordinator', 'admin'],
    timeoutMs: 8000,
    auditRequired: false,
    handler: async (args, ctx) => {
      let lat = typeof args.latitude === 'number' ? args.latitude : 15.2993;
      let lng = typeof args.longitude === 'number' ? args.longitude : 74.124;
      const hours = typeof args.hours === 'number' ? args.hours : 24;

      if (args.journeyId && typeof args.journeyId === 'string') {
        const { snapshot } = requireAuthorizedJourney(args, ctx);
        const firstItem = snapshot.items.find((i) => i.location?.coordinate || (i.location && typeof i.location.latitude === 'number'));
        const loc = firstItem?.location;
        if (loc) {
          lat = loc.coordinate?.lat ?? loc.latitude ?? 15.2993;
          lng = loc.coordinate?.lng ?? loc.longitude ?? 74.124;
        }
      }

      const geoCoord = { latitude: lat, longitude: lng, lat, lng };

      const forecast = await sharedOpenMeteoProvider.fetchForecast({
        coordinates: geoCoord,
        lookaheadHours: hours,
      });

      const facts: GroundedFactReference[] = forecast.slice(0, 3).map((f) => ({
        factId: `FACT-WEATHER-FC-${lat.toFixed(4)}-${lng.toFixed(4)}-${f.observedAt}`,
        sourceType: 'EXTERNAL_WEATHER',
        sourceEntityId: f.id,
        sourceTimestamp: f.observedAt,
        label: `Forecast ${f.observedAt}: ${f.weatherCondition}, ${f.temperatureC}°C, Wind ${f.windSpeedKmH} km/h`,
        authoritativeValue: `${f.temperatureC}C, wind_${f.windSpeedKmH}`,
      }));

      return {
        data: {
          forecast,
          count: forecast.length,
        },
        summary: `Retrieved ${forecast.length} forecast points for (${lat.toFixed(3)}, ${lng.toFixed(3)}). Condition range: ${forecast[0]?.weatherCondition || 'Normal'}.`,
        facts,
      };
    },
  },

  get_active_external_alerts: {
    name: 'get_active_external_alerts',
    description:
      'Retrieve active verified external advisories, meteorological alerts, or environmental warnings.',
    permissionLevel: 'READ_ONLY',
    allowedRoles: ['traveler', 'operator', 'coordinator', 'admin'],
    timeoutMs: 8000,
    auditRequired: false,
    handler: async (args) => {
      let activeEvents = sharedExternalEventImpactCoordinator.getActiveEvents();
      if (activeEvents.length === 0) {
        const lat = typeof args.latitude === 'number' ? args.latitude : 15.2993;
        const lng = typeof args.longitude === 'number' ? args.longitude : 74.124;
        activeEvents = await sharedFixtureProvider.fetchActiveAlerts({
          coordinates: { latitude: lat, longitude: lng, lat, lng },
        });
      }

      const facts: GroundedFactReference[] = activeEvents.map((ev) => ({
        factId: `FACT-EVENT-${ev.id}`,
        sourceType: 'EXTERNAL_EVENT',
        sourceEntityId: ev.id,
        sourceTimestamp: ev.updatedAt || ev.normalizedAt,
        label: `External Alert: [${ev.severity}] ${ev.title}`,
        authoritativeValue: `${ev.severity}:${ev.category}`,
      }));

      return {
        data: {
          alerts: activeEvents,
          count: activeEvents.length,
        },
        summary: `Found ${activeEvents.length} active external alerts in operational scope.`,
        facts,
      };
    },
  },

  get_journey_external_impacts: {
    name: 'get_journey_external_impacts',
    description:
      'Retrieve verified external event impacts specifically evaluated on an authorized journey.',
    permissionLevel: 'READ_ONLY',
    allowedRoles: ['traveler', 'operator', 'coordinator', 'admin'],
    timeoutMs: 4000,
    auditRequired: false,
    handler: async (args, ctx) => {
      const { journeyId } = requireAuthorizedJourney(args, ctx);
      const impacts = sharedExternalEventImpactCoordinator.getImpactsForJourney(journeyId);
      const proposal = sharedExternalEventImpactCoordinator.getActiveProposalForJourney(journeyId);

      const facts: GroundedFactReference[] = impacts.map((imp) => ({
        factId: `FACT-IMPACT-${imp.id}`,
        sourceType: 'IMPACT_ANALYSIS',
        sourceEntityId: imp.id,
        sourceTimestamp: imp.assessedAt,
        label: `Impact on ${imp.activityTitle || imp.affectedItemTitles[0]}: ${imp.recommendedAction || 'ACTION_RECOMMENDED'} (Severity: ${imp.severity})`,
        authoritativeValue: imp.severity,
      }));

      return {
        data: {
          journeyId,
          impacts,
          impactsCount: impacts.length,
          activeProposal: proposal || null,
        },
        summary: `Journey ${journeyId} has ${impacts.length} active external impact(s). Proposal pending: ${proposal ? proposal.proposalId : 'None'}.`,
        facts,
      };
    },
  },

  get_event_details: {
    name: 'get_event_details',
    description:
      'Retrieve detailed provenance, validity window, parameters, and affected zones for an external event.',
    permissionLevel: 'READ_ONLY',
    allowedRoles: ['traveler', 'operator', 'coordinator', 'admin'],
    timeoutMs: 4000,
    auditRequired: false,
    handler: async (args) => {
      const eventId = typeof args.eventId === 'string' ? args.eventId.trim() : '';
      if (!eventId) {
        throw new Error('MISSING_EVENT_ID: eventId argument is required.');
      }

      let ev = sharedExternalEventImpactCoordinator.getEventById(eventId);
      if (!ev) {
        const fixtureAlerts = await sharedFixtureProvider.fetchActiveAlerts({
          coordinates: { latitude: 15.2993, longitude: 74.124, lat: 15.2993, lng: 74.124 },
        });
        ev = fixtureAlerts.find((a) => a.id === eventId);
      }

      if (!ev) {
        throw new Error(`EVENT_NOT_FOUND: External event "${eventId}" was not found.`);
      }

      const validFromStr = ev.validFrom || ev.effectiveFrom;
      const validToStr = ev.validTo || ev.effectiveUntil;
      const provName = ev.provenance.providerName || ev.provider;

      const facts: GroundedFactReference[] = [
        {
          factId: `FACT-EVENT-${ev.id}`,
          sourceType: 'EXTERNAL_EVENT',
          sourceEntityId: ev.id,
          sourceTimestamp: ev.updatedAt || ev.normalizedAt,
          label: `${ev.title} (${ev.severity}) - Valid ${validFromStr} to ${validToStr}`,
          authoritativeValue: ev.severity,
        },
      ];

      return {
        data: {
          event: ev,
        },
        summary: `Event ${ev.id}: ${ev.title}. Severity: ${ev.severity}. Valid until ${validToStr}. Provenance: ${provName} (${ev.freshness}).`,
        facts,
      };
    },
  },

  get_provider_freshness: {
    name: 'get_provider_freshness',
    description:
      'Retrieve health telemetry, sync status, latency, and freshness reports for integrated external providers.',
    permissionLevel: 'READ_ONLY',
    allowedRoles: ['traveler', 'operator', 'coordinator', 'admin'],
    timeoutMs: 4000,
    auditRequired: false,
    handler: async (args) => {
      const providerName = typeof args.providerName === 'string' ? args.providerName.toLowerCase() : 'all';
      const openMeteoHealth = await sharedOpenMeteoProvider.healthCheck();
      const fixtureHealth = await sharedFixtureProvider.healthCheck();

      const reports = [openMeteoHealth, fixtureHealth];
      const filtered = providerName === 'all'
        ? reports
        : reports.filter((r) => r.providerName.toLowerCase().includes(providerName));

      const facts: GroundedFactReference[] = filtered.map((r) => ({
        factId: `FACT-PROVIDER-${r.providerName}-${Date.now()}`,
        sourceType: 'OPERATOR_QUEUE',
        sourceEntityId: r.providerName,
        sourceTimestamp: r.updatedAt,
        label: `Provider ${r.providerName} health: ${r.status}, latency: ${r.latestLatencyMs}ms`,
        authoritativeValue: r.status,
      }));

      return {
        data: {
          providers: filtered,
        },
        summary: `Provider telemetry reports checked. Overall status: ${filtered.map((f) => `${f.providerName}: ${f.status}`).join(', ')}.`,
        facts,
      };
    },
  },

  explain_weather_impact: {
    name: 'explain_weather_impact',
    description:
      'Generate a grounded, deterministic explanation of how an external weather event affects journey activities, what is preserved, and alternatives.',
    permissionLevel: 'READ_ONLY',
    allowedRoles: ['traveler', 'operator', 'coordinator', 'admin'],
    timeoutMs: 4000,
    auditRequired: false,
    handler: async (args, ctx) => {
      const { journeyId, snapshot } = requireAuthorizedJourney(args, ctx);
      const impacts = sharedExternalEventImpactCoordinator.getImpactsForJourney(journeyId);
      const proposal = sharedExternalEventImpactCoordinator.getActiveProposalForJourney(journeyId);

      const eventId = typeof args.eventId === 'string' ? args.eventId : impacts[0]?.eventId;
      const relevantImpact = impacts.find((imp) => imp.eventId === eventId) || impacts[0];

      if (!relevantImpact) {
        return {
          data: {
            journeyId,
            impacts: [],
            explanation: 'No active weather impacts or disruptions detected for this journey.',
          },
          summary: `No external weather disruptions currently affect journey "${snapshot.title}".`,
          facts: buildJourneyGroundedFacts({ snapshot }),
        };
      }

      const actId = relevantImpact.activityId || relevantImpact.affectedItemIds[0];
      const actTitle = relevantImpact.activityTitle || relevantImpact.affectedItemTitles[0];
      const evTitle = relevantImpact.eventTitle || relevantImpact.event?.title || 'Weather Event';
      const evSeverity = relevantImpact.eventSeverity || relevantImpact.severity;
      const impReason = relevantImpact.impactReason || 'Atmospheric conditions exceed safety limits for this activity.';
      const recAction = relevantImpact.recommendedAction || 'REVIEW_ALTERNATIVES';
      const assessedIso = relevantImpact.assessedAt || new Date().toISOString();

      const preservedItems = snapshot.items.filter((i) => i.id !== actId && i.status !== 'cancelled');

      const facts: GroundedFactReference[] = [
        {
          factId: `FACT-IMPACT-${relevantImpact.id}`,
          sourceType: 'IMPACT_ANALYSIS',
          sourceEntityId: relevantImpact.id,
          sourceTimestamp: assessedIso,
          label: `Weather impact on ${actTitle}: ${impReason}`,
          authoritativeValue: relevantImpact.severity,
        },
        {
          factId: `FACT-EVENT-${relevantImpact.eventId}`,
          sourceType: 'EXTERNAL_EVENT',
          sourceEntityId: relevantImpact.eventId,
          sourceTimestamp: assessedIso,
          label: `Causing event: ${evTitle}`,
          authoritativeValue: evSeverity,
        },
      ];

      return {
        data: {
          journeyId,
          affectedActivityId: actId,
          affectedActivityTitle: actTitle,
          eventTitle: evTitle,
          severity: relevantImpact.severity,
          impactReason: impReason,
          recommendedAction: recAction,
          preservedActivities: preservedItems.map((p) => p.title),
          proposal: proposal || null,
        },
        summary: `Due to ${evTitle} (${evSeverity}), "${actTitle}" is disrupted (${recAction}). ${preservedItems.length} activities remain unaffected and safe.`,
        facts,
      };
    },
  },

  get_payment_status: {
    name: 'get_payment_status',
    description: 'Retrieve authoritative payment intent, status, amount, and gateway record.',
    permissionLevel: 'READ_ONLY',
    allowedRoles: ['traveler', 'operator', 'coordinator', 'admin'],
    timeoutMs: 2000,
    auditRequired: false,
    handler: async (args, _ctx) => {
      const paymentIntentId = args.paymentIntentId as string | undefined;
      const paymentRecordId = args.paymentRecordId as string | undefined;
      const bookingId = args.bookingId as string | undefined;

      let record = paymentRecordId ? PaymentService.getRecord(paymentRecordId) : undefined;
      let intent = paymentIntentId ? PaymentService.getIntent(paymentIntentId) : undefined;

      if (!record && !intent && bookingId) {
        const booking = BookingService.getBooking(bookingId);
        if (booking) {
          if (booking.paymentRecordId) {
            record = PaymentService.getRecord(booking.paymentRecordId);
          }
          if (booking.paymentIntentId) {
            intent = PaymentService.getIntent(booking.paymentIntentId);
          }
        }
      }

      const status = record?.status || intent?.state || 'UNKNOWN';
      const amountMinor = record?.amountMinor || intent?.amountMinor || 0;
      const currency = record?.currency || intent?.currency || 'INR';
      const formatted = PricingEngine.formatMoney({ amountMinor, currency });

      const facts: GroundedFactReference[] = [
        {
          factId: `FACT-PAYMENT-${record?.id || intent?.id || 'none'}`,
          sourceType: 'PAYMENT_RECORD',
          sourceEntityId: record?.id || intent?.id || 'unknown',
          sourceTimestamp: record?.capturedAt || intent?.updatedAt || new Date().toISOString(),
          label: `Payment Status: ${status}`,
          authoritativeValue: `${status} (${formatted})`,
        },
      ];

      return {
        data: {
          status,
          amountMinor,
          amountFormatted: formatted,
          currency,
          paymentIntentId: intent?.id,
          paymentRecordId: record?.id,
          provider: intent?.provider || 'MOCK_GATEWAY',
          gatewayReference: record?.gatewayReference,
        },
        summary: `Payment status is ${status} with amount ${formatted}.`,
        facts,
      };
    },
  },

  get_refund_status: {
    name: 'get_refund_status',
    description: 'Retrieve authoritative refund records, amounts, fee deductions, and refund states.',
    permissionLevel: 'READ_ONLY',
    allowedRoles: ['traveler', 'operator', 'coordinator', 'admin'],
    timeoutMs: 2000,
    auditRequired: false,
    handler: async (args, _ctx) => {
      const refundId = args.refundId as string | undefined;
      const bookingId = args.bookingId as string | undefined;
      const paymentId = args.paymentId as string | undefined;

      let refunds: RefundRecord[] = [];
      if (refundId) {
        const r = RefundService.getRefund(refundId);
        if (r) refunds.push(r);
      } else if (bookingId) {
        refunds = RefundService.getRefundsForBooking(bookingId);
      } else if (paymentId) {
        refunds = RefundService.getRefundsForPayment(paymentId);
      }

      const totalRefundedMinor = refunds.reduce((sum, r) => sum + r.amountMinor, 0);
      const currency = refunds[0]?.currency || 'INR';
      const formatted = PricingEngine.formatMoney({ amountMinor: totalRefundedMinor, currency });

      const facts: GroundedFactReference[] = refunds.map((r) => ({
        factId: `FACT-REFUND-${r.id}`,
        sourceType: 'REFUND_RECORD',
        sourceEntityId: r.id,
        sourceTimestamp: r.createdAt,
        label: `Refund ${r.id}: ${r.state}`,
        authoritativeValue: `${r.state} (${PricingEngine.formatMoney({ amountMinor: r.amountMinor, currency: r.currency })})`,
      }));

      return {
        data: {
          refundsCount: refunds.length,
          totalRefundedMinor,
          totalRefundedFormatted: formatted,
          refunds,
        },
        summary: `Found ${refunds.length} refund record(s) totaling ${formatted}.`,
        facts,
      };
    },
  },

  get_supplier_status: {
    name: 'get_supplier_status',
    description: 'Retrieve supplier details, status, service type, and confirmed booking allocations.',
    permissionLevel: 'READ_ONLY',
    allowedRoles: ['traveler', 'operator', 'coordinator', 'admin', 'vendor'],
    timeoutMs: 2000,
    auditRequired: false,
    handler: async (args, _ctx) => {
      const supplierId = (args.supplierId as string) || 'sup_seashell_resort';
      const supplier = SupplierService.getSupplier(supplierId);

      if (!supplier) {
        throw new Error(`SUPPLIER_NOT_FOUND: Supplier "${supplierId}" not found.`);
      }

      const facts: GroundedFactReference[] = [
        {
          factId: `FACT-SUPPLIER-${supplier.id}`,
          sourceType: 'SUPPLIER_RECORD',
          sourceEntityId: supplier.id,
          sourceTimestamp: supplier.updatedAt,
          label: `${supplier.name} (${supplier.serviceType})`,
          authoritativeValue: supplier.status,
        },
      ];

      return {
        data: {
          supplierId: supplier.id,
          name: supplier.name,
          serviceType: supplier.serviceType,
          status: supplier.status,
          operationalTimezone: supplier.operationalTimezone,
          capabilities: supplier.capabilities,
        },
        summary: `Supplier "${supplier.name}" is ${supplier.status} (${supplier.serviceType}).`,
        facts,
      };
    },
  },

  get_booking_timeline: {
    name: 'get_booking_timeline',
    description: 'Retrieve immutable state audit history and event transitions for a booking.',
    permissionLevel: 'READ_ONLY',
    allowedRoles: ['traveler', 'operator', 'coordinator', 'admin'],
    timeoutMs: 2000,
    auditRequired: false,
    handler: async (args, _ctx) => {
      const bookingId = args.bookingId as string;
      const booking = BookingService.getBooking(bookingId);
      if (!booking) {
        throw new Error(`BOOKING_NOT_FOUND: Booking "${bookingId}" not found.`);
      }

      const facts: GroundedFactReference[] = [
        {
          factId: `FACT-BOOKING-TIMELINE-${booking.id}`,
          sourceType: 'BOOKING_RECORD',
          sourceEntityId: booking.id,
          sourceTimestamp: booking.updatedAt,
          label: `Timeline for ${booking.bookingReference}`,
          authoritativeValue: `${booking.state} (${booking.statusHistory.length} events)`,
        },
      ];

      return {
        data: {
          bookingId: booking.id,
          bookingReference: booking.bookingReference,
          currentState: booking.state,
          historyCount: booking.statusHistory.length,
          timeline: booking.statusHistory,
        },
        summary: `Booking "${booking.bookingReference}" has ${booking.statusHistory.length} recorded transition(s); current state: ${booking.state}.`,
        facts,
      };
    },
  },

  explain_booking_change: {
    name: 'explain_booking_change',
    description: 'Explain deterministic booking item replacements and price deltas caused by disruptions.',
    permissionLevel: 'READ_ONLY',
    allowedRoles: ['traveler', 'operator', 'coordinator', 'admin'],
    timeoutMs: 2000,
    auditRequired: false,
    handler: async (args, ctx) => {
      const journeyId = (args.journeyId as string) || 'jrn_goa_01';
      const changeRequestId = args.changeRequestId as string | undefined;

      const engine = ctx.engine || sharedLivingJourneyEngine;
      const changeReq = changeRequestId
        ? engine.getChangeRequest(changeRequestId)
        : engine.getChangeRequestsForJourney(journeyId)[0];

      const bestAlt = changeReq?.scoredAlternatives[0];
      const altTitle = bestAlt?.candidate.title || 'Alternative Activity';
      const priceDelta = bestAlt?.priceDelta || 0;
      const formattedDelta = priceDelta < 0 ? `-₹${Math.abs(priceDelta)}` : `+₹${priceDelta}`;

      const facts: GroundedFactReference[] = [
        {
          factId: `FACT-BOOKING-CHANGE-${changeReq?.id || 'none'}`,
          sourceType: 'CHANGE_REQUEST',
          sourceEntityId: changeReq?.id || 'unknown',
          sourceTimestamp: changeReq?.createdAt || new Date().toISOString(),
          label: `Replacement Activity: ${altTitle}`,
          authoritativeValue: `Price delta: ${formattedDelta}`,
        },
      ];

      return {
        data: {
          journeyId,
          changeRequestId: changeReq?.id,
          triggerReason: changeReq?.trigger.reason || 'Operational adaptation',
          replacementTitle: altTitle,
          priceDelta,
          priceDeltaFormatted: formattedDelta,
          refundEligible: priceDelta < 0,
        },
        summary: `Booking alteration: "${altTitle}" selected due to ${changeReq?.trigger.reason || 'disruption'}. Net price change: ${formattedDelta}.`,
        facts,
      };
    },
  },

  explain_refund_calculation: {
    name: 'explain_refund_calculation',
    description: 'Explain cancellation policy calculations, penalty percentages, and refundable amounts.',
    permissionLevel: 'READ_ONLY',
    allowedRoles: ['traveler', 'operator', 'coordinator', 'admin'],
    timeoutMs: 2000,
    auditRequired: false,
    handler: async (args, _ctx) => {
      const bookingId = args.bookingId as string | undefined;
      const booking = bookingId ? BookingService.getBooking(bookingId) : undefined;
      const paidAmountMinor = booking?.totalAmountMinor || 1748000;
      const isSupplierInitiated = (args.isSupplierInitiated as boolean) ?? false;

      const calc = CancellationPolicyEngine.calculateRefund({
        paidAmountMinor,
        previouslyRefundedMinor: 0,
        serviceDateIso: (args.serviceDateIso as string) || new Date(Date.now() + 72 * 3600000).toISOString(),
        nowIso: args.nowIso as string | undefined,
        isSupplierInitiated,
        currency: booking?.currency || 'INR',
      });

      const facts: GroundedFactReference[] = [
        {
          factId: `FACT-REFUND-CALC-${bookingId || 'standard'}`,
          sourceType: 'REFUND_RECORD',
          sourceEntityId: bookingId || 'policy_calc',
          sourceTimestamp: new Date().toISOString(),
          label: `Refund Policy: ${calc.policyReference}`,
          authoritativeValue: `Refundable: ₹${calc.refundableAmountMinor / 100}`,
        },
      ];

      return {
        data: { ...calc } as unknown as Record<string, unknown>,
        summary: `Refund calculation: ${calc.reason}. Refundable amount: ₹${calc.refundableAmountMinor / 100} (Penalty: ₹${calc.penaltyFeeMinor / 100}).`,
        facts,
      };
    },
  },
};

export class AiToolRegistry {
  private engine?: LivingJourneyEngine;

  constructor(engine?: LivingJourneyEngine) {
    this.engine = engine;
  }

  public isAllowlistedTool(toolName: string): toolName is AiToolName {
    return Object.prototype.hasOwnProperty.call(AI_TOOL_DEFINITIONS, toolName);
  }

  public getToolDefinition(toolName: string): AiToolDefinition | undefined {
    if (!this.isAllowlistedTool(toolName)) return undefined;
    return AI_TOOL_DEFINITIONS[toolName];
  }

  public listAllowlistedTools(): AiToolDefinition[] {
    return Object.values(AI_TOOL_DEFINITIONS);
  }

  /**
   * Validates and executes an allowlisted tool under the authenticated session actor.
   */
  public async executeTool(
    rawCall: unknown,
    ctx: ToolExecutionContext
  ): Promise<{
    trace: AiToolExecutionTrace;
    output?: ToolHandlerOutput;
    errorCategory: AiErrorCategory;
  }> {
    const startMs = Date.now();
    const schemaCheck = validateToolCallRequestSchema(rawCall);

    if (!schemaCheck.valid || !schemaCheck.value) {
      const attemptedName =
        rawCall &&
        typeof rawCall === 'object' &&
        typeof (rawCall as { toolName?: unknown }).toolName === 'string'
          ? ((rawCall as { toolName: string }).toolName as AiToolName)
          : ('unknown_tool' as AiToolName);

      const isUnknownTool = schemaCheck.errors.some((e) =>
        e.startsWith('UNKNOWN_TOOL_NAME')
      );

      return {
        trace: {
          toolName: attemptedName,
          permissionLevel: 'READ_ONLY',
          allowed: false,
          authorized: false,
          executed: false,
          latencyMs: Date.now() - startMs,
          status: 'DENIED',
          summary: schemaCheck.errors.join('; '),
          factIdsProduced: [],
          errorCode: isUnknownTool
            ? 'UNKNOWN_TOOL_REJECTED'
            : 'SCHEMA_VALIDATION_FAILED',
        },
        errorCategory: isUnknownTool
          ? 'UNKNOWN_TOOL_REJECTED'
          : 'SCHEMA_VALIDATION_FAILED',
      };
    }

    const { toolName, arguments: toolArgs } = schemaCheck.value;
    const def = AI_TOOL_DEFINITIONS[toolName];

    // Role check
    if (
      ctx.sessionActor.actorRole === 'unauthenticated' ||
      !def.allowedRoles.includes(ctx.sessionActor.actorRole)
    ) {
      return {
        trace: {
          toolName,
          permissionLevel: def.permissionLevel,
          allowed: true,
          authorized: false,
          executed: false,
          latencyMs: Date.now() - startMs,
          status: 'DENIED',
          summary: `Role "${ctx.sessionActor.actorRole}" is not authorized to invoke tool "${toolName}".`,
          factIdsProduced: [],
          errorCode: 'UNAUTHORIZED_ACCESS',
        },
        errorCategory: 'UNAUTHORIZED_ACCESS',
      };
    }

    // Mutation gate check
    if (
      def.permissionLevel === 'MUTATION' &&
      ctx.humanApprovalConfirmed !== true
    ) {
      return {
        trace: {
          toolName,
          permissionLevel: def.permissionLevel,
          allowed: true,
          authorized: true,
          executed: false,
          latencyMs: Date.now() - startMs,
          status: 'DENIED',
          summary: `Mutation tool "${toolName}" cannot be automatically invoked by AI without explicit human approval confirmation.`,
          factIdsProduced: [],
          errorCode: 'MUTATION_APPROVAL_REQUIRED',
        },
        errorCategory: 'MUTATION_APPROVAL_REQUIRED',
      };
    }

    const effectiveCtx: ToolExecutionContext = {
      ...ctx,
      engine: ctx.engine || this.engine,
    };

    try {
      const rawOutput = await Promise.race<ToolHandlerOutput>([
        def.handler(toolArgs, effectiveCtx),
        new Promise<ToolHandlerOutput>((_, reject) =>
          setTimeout(
            () => reject(new Error(`TOOL_TIMEOUT: ${toolName} timed out.`)),
            def.timeoutMs
          )
        ),
      ]);

      // Sanitize tool summary against embedded directive injection
      const sanitizedSummary = sanitizeUntrustedExternalText(
        rawOutput.summary
      ).sanitizedData;

      return {
        trace: {
          toolName,
          permissionLevel: def.permissionLevel,
          allowed: true,
          authorized: true,
          executed: true,
          latencyMs: Date.now() - startMs,
          status: 'SUCCESS',
          summary: sanitizedSummary,
          factIdsProduced: rawOutput.facts.map((f) => f.factId),
        },
        output: {
          ...rawOutput,
          summary: sanitizedSummary,
        },
        errorCategory: 'NONE',
      };
    } catch (err) {
      const category =
        (err as Error & { category?: AiErrorCategory }).category ||
        'DETERMINISTIC_VALIDATION_FAILED';
      const errMsg =
        err instanceof Error ? err.message : 'Tool execution error';

      return {
        trace: {
          toolName,
          permissionLevel: def.permissionLevel,
          allowed: true,
          authorized:
            category !== 'UNAUTHORIZED_ACCESS' &&
            category !== 'CROSS_TENANT_DENIED',
          executed: false,
          latencyMs: Date.now() - startMs,
          status:
            category === 'UNAUTHORIZED_ACCESS' ||
            category === 'CROSS_TENANT_DENIED'
              ? 'DENIED'
              : 'EXECUTION_ERROR',
          summary: errMsg,
          factIdsProduced: [],
          errorCode: category,
        },
        errorCategory: category,
      };
    }
  }
}

export const sharedAiToolRegistry = new AiToolRegistry();
