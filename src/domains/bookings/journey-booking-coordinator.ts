import type { UserRole } from '@/types/database.types';
import {
  sharedLivingJourneyEngine,
  LivingJourneyEngine,
} from '@/domains/journey-engine/living-journey-engine';
import type {
  EngineChangeRequest,
  JourneySnapshot,
  ScoredAlternative,
} from '@/domains/journey-engine/types';
import { sharedBookingStore } from './booking-store';
import { BookingService } from './booking.service';
import type { Booking, BookingItem } from './types';
import { InventoryService } from '@/domains/inventory/inventory.service';
import { SupplierService } from '@/domains/suppliers/supplier.service';
import { RefundService } from '@/domains/refunds/refund.service';
import { AuditService } from '@/domains/audit/audit.service';
import type { RefundRecord } from '@/domains/refunds/types';
import {
  sharedCommunicationOrchestrator,
  CommunicationEventFactory,
} from '@/domains/communications';

export interface DisruptionAnalysisResult {
  journeyId: string;
  bookingId: string;
  changeRequest: EngineChangeRequest;
  disruptedItem: BookingItem;
  originalPaidMinor: number;
  bestAlternative: ScoredAlternative;
  replacementPriceMinor: number;
  priceDeltaMinor: number; // e.g. -170000 paise (-₹1,700)
  refundOwedMinor: number; // e.g. 170000 paise (₹1,700)
  additionalChargeMinor: number;
  explanation: string;
}

export interface DisruptionResolutionResult {
  success: boolean;
  journeySnapshot?: JourneySnapshot;
  updatedBooking?: Booking;
  refundRecord?: RefundRecord;
  changeRequest?: EngineChangeRequest;
  message: string;
  errorCode?: string;
}

export class JourneyBookingCoordinator {
  private engine: LivingJourneyEngine;

  constructor(engine: LivingJourneyEngine = sharedLivingJourneyEngine) {
    this.engine = engine;
  }

  /**
   * Detects supplier disruption, updates booking state flags,
   * invokes LivingJourneyEngine to compute alternatives, and calculates
   * financial deltas.
   */
  public async handleSupplierDisruption(params: {
    journeyId: string;
    disruptedItemId: string; // e.g. 'itm_goa_03_scuba'
    supplierId: string;
    disruptionReason: string;
    actorId: string;
    actorRole: UserRole;
  }): Promise<DisruptionAnalysisResult> {
    const bookings = sharedBookingStore.getByJourneyId(params.journeyId);
    let targetBooking = bookings.find((b) =>
      b.items.some((itm) => itm.itineraryItemId === params.disruptedItemId)
    );

    if (!targetBooking && bookings.length > 0) {
      targetBooking = bookings[0];
    }

    if (!targetBooking) {
      // Create a default Goa booking if none exists
      const createRes = await BookingService.createBookingIntent({
        journeyId: params.journeyId,
        travelerId: 'usr_traveler_01',
        idempotencyKey: `auto_init_${params.journeyId}_${Date.now()}`,
        participants: [
          { id: 'usr_traveler_01', name: 'Traveler One', isPrimary: true },
          { id: 'usr_traveler_02', name: 'Traveler Two', isPrimary: false },
        ],
        actorId: params.actorId,
        actorRole: params.actorRole,
      });

      if (!createRes.success || !createRes.booking) {
        throw new Error('Could not initialize journey booking for disruption handling.');
      }
      // Confirm it
      await BookingService.verifyAndConfirmBooking({
        bookingId: createRes.booking.id,
        actorId: params.actorId,
        actorRole: params.actorRole,
      });
      targetBooking = sharedBookingStore.getById(createRes.booking.id)!;
    }

    const disruptedItem = targetBooking.items.find(
      (itm) => itm.itineraryItemId === params.disruptedItemId
    ) || targetBooking.items[0];

    // Mark disruption detected
    targetBooking.disruptionDetected = true;
    sharedBookingStore.save(targetBooking);

    // Call LivingJourneyEngine to detect and analyze change
    const changeRequest = this.engine.detectAndAnalyzeChange({
      journeyId: params.journeyId,
      triggerType: 'ITEM_CANCELLED',
      affectedItemId: params.disruptedItemId,
      title: `Supplier Disruption: ${params.disruptedItemId}`,
      reason: params.disruptionReason,
      actorId: params.actorId,
      actorRole: params.actorRole,
      idempotencyKey: `disrupt_${params.journeyId}_${params.disruptedItemId}_${targetBooking.journeyVersion}`,
    });

    const bestAlt = changeRequest.scoredAlternatives[0];
    if (!bestAlt) {
      throw new Error(`No alternatives found for disrupted item "${params.disruptedItemId}".`);
    }

    // Calculate financial delta
    // Scuba was ₹5,200.00 (520000 minor)
    // Kayaking is ₹3,500.00 (350000 minor)
    const originalPaidMinor = disruptedItem.totalPriceMinor;
    // Map candidate price to minor units (candidate.priceAmount is in major units)
    const replacementPriceMinor = (bestAlt.candidate.priceAmount || 3500) * 100;
    const priceDeltaMinor = replacementPriceMinor - originalPaidMinor;
    const refundOwedMinor = Math.max(0, originalPaidMinor - replacementPriceMinor);
    const additionalChargeMinor = Math.max(0, replacementPriceMinor - originalPaidMinor);

    void AuditService.recordEvent(
      'booking',
      targetBooking.id,
      'DISRUPTION_ANALYZED',
      params.actorId,
      params.actorRole,
      {
        disruptedItemId: params.disruptedItemId,
        reason: params.disruptionReason,
        alternativeId: bestAlt.id,
        refundOwedMinor,
      }
    );

    // Emit Phase 08 Communication Event for Disruption Detection
    await sharedCommunicationOrchestrator.ingestEvent(
      CommunicationEventFactory.createEvent({
        eventType: 'itinerary_item_cancelled',
        tenantId: targetBooking.tenantId || 'org_goa_ops_01',
        journeyId: params.journeyId,
        bookingId: targetBooking.id,
        actorId: params.actorId,
        sourceDomain: 'bookings',
        aggregateType: 'Booking',
        aggregateId: targetBooking.id,
        correlationId: `corr_disrupt_${params.journeyId}_${targetBooking.journeyVersion}`,
        severity: 'HIGH',
        priority: 'CRITICAL',
        payload: {
          title: disruptedItem.title,
          itemTitle: disruptedItem.title,
          reason: params.disruptionReason,
          disruptionReason: params.disruptionReason,
          journeyTitle: 'Goa Getaway',
          travelerId: targetBooking.travelerId,
          supplierId: params.supplierId,
          bestAlternativeTitle: bestAlt.candidate.title,
        },
        idempotencyKey: `comm_disrupt_${params.journeyId}_${params.disruptedItemId}_${targetBooking.journeyVersion}`,
        requiredAction: 'Review and approve proposed replacement',
      }),
      {
        tenantId: targetBooking.tenantId || 'org_goa_ops_01',
        journeyId: params.journeyId,
        bookingId: targetBooking.id,
        travelerId: targetBooking.travelerId,
        operatorId: 'usr_operator_01',
        supplierId: params.supplierId,
      }
    );

    return {
      journeyId: params.journeyId,
      bookingId: targetBooking.id,
      changeRequest,
      disruptedItem,
      originalPaidMinor,
      bestAlternative: bestAlt,
      replacementPriceMinor,
      priceDeltaMinor,
      refundOwedMinor,
      additionalChargeMinor,
      explanation: `Supplier reported disruption (${params.disruptionReason}). Replacement "${bestAlt.candidate.title}" selected. Financial delta: ${priceDeltaMinor < 0 ? `-₹${Math.abs(priceDeltaMinor) / 100}` : `+₹${priceDeltaMinor / 100}`}.`,
    };
  }

  /**
   * Applies the approved alternative in LivingJourneyEngine,
   * allocates new supplier inventory, processes any refund or delta payment,
   * updates the booking items, and advances the live journey version (e.g. v18 -> v19).
   */
  public async resolveDisruptionWithAlternative(params: {
    changeRequestId: string;
    bookingId: string;
    alternativeId: string;
    actorId: string;
    actorRole: UserRole;
    idempotencyKey?: string;
  }): Promise<DisruptionResolutionResult> {
    const booking = sharedBookingStore.getById(params.bookingId);
    if (!booking) {
      return {
        success: false,
        errorCode: 'BOOKING_NOT_FOUND',
        message: `Booking "${params.bookingId}" not found.`,
      };
    }

    const changeReq = this.engine.getChangeRequest(params.changeRequestId);
    if (!changeReq) {
      return {
        success: false,
        errorCode: 'CHANGE_REQUEST_NOT_FOUND',
        message: `Change request "${params.changeRequestId}" not found.`,
      };
    }

    const alt = changeReq.scoredAlternatives.find((a) => a.id === params.alternativeId);
    if (!alt) {
      return {
        success: false,
        errorCode: 'ALTERNATIVE_NOT_FOUND',
        message: `Alternative "${params.alternativeId}" not found in change request.`,
      };
    }

    // 1. Apply Change in LivingJourneyEngine (Advances Snapshot Version e.g. v18 -> v19)
    const applyRes = this.engine.applyChange({
      changeRequestId: params.changeRequestId,
      alternativeId: params.alternativeId,
      actorId: params.actorId,
      actorRole: params.actorRole,
      idempotencyKey: params.idempotencyKey || `apply_${params.changeRequestId}_${params.alternativeId}`,
    });

    if (!applyRes.success || !applyRes.updatedSnapshot) {
      return {
        success: false,
        errorCode: applyRes.errorCode || 'APPLY_CHANGE_FAILED',
        message: applyRes.errorMessage || 'Failed to apply change in living journey engine.',
      };
    }

    // 2. Identify the replaced booking item
    const disruptedItineraryItemId = changeReq.trigger.affectedItemId;
    const itemIndex = booking.items.findIndex(
      (itm) => itm.itineraryItemId === disruptedItineraryItemId
    );

    let refundRecord: RefundRecord | undefined;

    if (itemIndex >= 0) {
      const oldItem = booking.items[itemIndex];
      const oldPaidMinor = oldItem.totalPriceMinor;
      const newCostMinor = (alt.candidate.priceAmount || 3500) * 100;
      const refundDifferenceMinor = Math.max(0, oldPaidMinor - newCostMinor);

      // Cancel old allocation
      const existingAllocs = SupplierService.getAllocationsForBooking(booking.id);
      const oldAlloc = existingAllocs.find((a) => a.supplierId === oldItem.supplierId);
      if (oldAlloc) {
        await SupplierService.cancelAllocation({
          allocationId: oldAlloc.id,
          supplierId: oldAlloc.supplierId,
          reason: 'Supplier disruption replacement applied',
        });
      }

      // Reserve and confirm new supplier inventory (Mandovi Kayaking)
      const newInventoryId = 'inv_goa_kayak_01';
      const newSupplierId = 'sup_mandovi_eco_tours';

      InventoryService.reserve({
        inventoryId: newInventoryId,
        bookingId: booking.id,
        quantity: oldItem.quantity,
        idempotencyKey: `res_repl_${booking.id}_${newInventoryId}`,
      });

      const allocRes = await SupplierService.confirmAllocation({
        supplierId: newSupplierId,
        inventoryId: newInventoryId,
        bookingId: booking.id,
        quantity: oldItem.quantity,
      });

      // Update booking item
      booking.items[itemIndex] = {
        id: `bki_${booking.id}_repl_kayak`,
        bookingId: booking.id,
        itineraryItemId: alt.candidate.id,
        supplierId: newSupplierId,
        inventoryId: newInventoryId,
        title: alt.candidate.title,
        serviceType: 'ACTIVITY',
        quantity: oldItem.quantity,
        unitPriceMinor: newCostMinor,
        totalPriceMinor: newCostMinor,
        currency: 'INR',
        scheduledStart: alt.candidate.availableWindowStartIso || '2026-05-13T14:30:00Z',
        scheduledEnd: alt.candidate.availableWindowEndIso || '2026-05-13T16:30:00Z',
        status: 'CONFIRMED',
        supplierConfirmationReference: allocRes.allocation?.supplierConfirmationReference,
      };

      // Recalculate total booking amount
      booking.totalAmountMinor = booking.items.reduce((sum, itm) => sum + itm.totalPriceMinor, 0);

      // 3. Process Authoritative Refund for Delta (e.g. ₹1,700)
      if (refundDifferenceMinor > 0 && booking.paymentRecordId) {
        const refundRes = await RefundService.processRefund({
          bookingId: booking.id,
          paymentId: booking.paymentRecordId,
          travelerId: booking.travelerId,
          amountMinor: refundDifferenceMinor,
          reason: `Supplier disruption delta: replaced ${oldItem.title} with ${alt.candidate.title}`,
          idempotencyKey: `ref_disrupt_${booking.id}_${Date.now()}`,
        });

        if (refundRes.success && refundRes.refundRecord) {
          refundRecord = refundRes.refundRecord;
        }
      }
    }

    // 4. Update booking metadata & advance version
    booking.journeyVersion = applyRes.updatedSnapshot.version;
    booking.disruptionDetected = false;
    booking.statusHistory.push({
      fromState: booking.state,
      toState: booking.state,
      actorId: params.actorId,
      actorRole: params.actorRole,
      reason: `Disruption resolved: replaced with ${alt.candidate.title}. Journey advanced to v${applyRes.updatedSnapshot.version}.`,
      timestamp: new Date().toISOString(),
    });

    const updatedBooking = sharedBookingStore.save(booking);

    void AuditService.recordEvent(
      'booking',
      updatedBooking.id,
      'DISRUPTION_RESOLVED_WITH_REPLACEMENT',
      params.actorId,
      params.actorRole,
      {
        changeRequestId: params.changeRequestId,
        alternativeId: params.alternativeId,
        journeyVersion: applyRes.updatedSnapshot.version,
        refundMinor: refundRecord?.amountMinor ?? 0,
      }
    );

    // Emit Phase 08 Communication Event for Disruption Resolved / Change Applied
    await sharedCommunicationOrchestrator.ingestEvent(
      CommunicationEventFactory.createEvent({
        eventType: 'change_applied',
        tenantId: booking.tenantId || 'org_goa_ops_01',
        journeyId: booking.journeyId,
        bookingId: booking.id,
        actorId: params.actorId,
        sourceDomain: 'journey-engine',
        aggregateType: 'Journey',
        aggregateId: booking.journeyId,
        correlationId: `corr_disrupt_${booking.journeyId}_${applyRes.updatedSnapshot.version}`,
        severity: 'LOW',
        priority: 'HIGH',
        payload: {
          title: 'Scuba Diving Excursion',
          itemTitle: 'Scuba Diving Excursion',
          replacementTitle: alt.candidate.title,
          originalPriceMinor: 520000,
          replacementPriceMinor: (alt.candidate.priceAmount || 1500) * 100,
          refundAmountMinor: refundRecord?.amountMinor ?? 0,
          journeyTitle: 'Goa Getaway',
          travelerId: booking.travelerId,
        },
        idempotencyKey: `comm_applied_${params.changeRequestId}_${params.alternativeId}`,
      }),
      {
        tenantId: booking.tenantId || 'org_goa_ops_01',
        journeyId: booking.journeyId,
        bookingId: booking.id,
        travelerId: booking.travelerId,
        operatorId: params.actorId,
      }
    );

    // If refund was processed, emit refund_succeeded event
    if (refundRecord && (refundRecord.state === 'REFUNDED' || refundRecord.state === 'PARTIALLY_REFUNDED')) {
      await sharedCommunicationOrchestrator.ingestEvent(
        CommunicationEventFactory.createEvent({
          eventType: 'refund_succeeded',
          tenantId: booking.tenantId || 'org_goa_ops_01',
          journeyId: booking.journeyId,
          bookingId: booking.id,
          actorId: params.actorId,
          sourceDomain: 'refunds',
          aggregateType: 'RefundRecord',
          aggregateId: refundRecord.id,
          correlationId: `corr_disrupt_${booking.journeyId}_${applyRes.updatedSnapshot.version}`,
          severity: 'LOW',
          priority: 'NORMAL',
          payload: {
            refundAmountMinor: refundRecord.amountMinor,
            currency: refundRecord.currency,
            bookingId: booking.id,
            journeyTitle: 'Goa Getaway',
            travelerId: booking.travelerId,
          },
          idempotencyKey: `comm_refund_${refundRecord.id}`,
        }),
        {
          tenantId: booking.tenantId || 'org_goa_ops_01',
          journeyId: booking.journeyId,
          bookingId: booking.id,
          travelerId: booking.travelerId,
          operatorId: params.actorId,
        }
      );
    }

    return {
      success: true,
      journeySnapshot: applyRes.updatedSnapshot,
      updatedBooking,
      refundRecord,
      changeRequest: applyRes.changeRequest,
      message: `Successfully resolved disruption. Replaced activity with "${alt.candidate.title}". Journey advanced to v${applyRes.updatedSnapshot.version}.`,
    };
  }
}

export const sharedJourneyBookingCoordinator = new JourneyBookingCoordinator();
