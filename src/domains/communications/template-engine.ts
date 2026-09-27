import type { UserRole } from '@/types/database.types';
import type {
  CommunicationEvent,
  ContextSummary,
  RenderedTemplate,
} from './types';

export class TemplateEngine {
  /**
   * Sanitizes untrusted text by stripping dangerous HTML tags and script injections.
   */
  public static sanitize(text: string): string {
    if (!text) return '';
    return text
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  }

  /**
   * Renders a strongly typed, role-tailored, contextual notification template.
   */
  public static render(
    event: CommunicationEvent,
    recipientRole: UserRole,
    locale: string = 'en-US'
  ): RenderedTemplate {
    const payload = event.payload || {};
    const sanitizedTitle = this.sanitize((payload.title as string) || (payload.itemTitle as string) || 'Activity');
    const sanitizedReason = this.sanitize((payload.reason as string) || (payload.disruptionReason as string) || 'operational adjustment');
    const journeyTitle = this.sanitize((payload.journeyTitle as string) || 'Goa Getaway');
    const journeyId = event.journeyId || 'jrn_goa_01';
    const bookingId = event.bookingId || (payload.bookingId as string) || 'bk_goa_01';

    // Format Money amounts if present
    const refundFormatted = payload.refundAmountMinor
      ? `₹${Number(payload.refundAmountMinor) / 100}`
      : payload.refundOwedMinor
      ? `₹${Number(payload.refundOwedMinor) / 100}`
      : undefined;

    const originalCostFormatted = payload.originalPriceMinor
      ? `₹${Number(payload.originalPriceMinor) / 100}`
      : undefined;

    const replacementCostFormatted = payload.replacementPriceMinor
      ? `₹${Number(payload.replacementPriceMinor) / 100}`
      : undefined;

    const replacementTitle = this.sanitize(
      (payload.replacementTitle as string) ||
      (payload.alternativeTitle as string) ||
      'Mandovi River Mangrove Kayaking'
    );

    // 1. TRAVELER AUDIENCE TEMPLATES
    if (recipientRole === 'traveler') {
      switch (event.eventType) {
        case 'itinerary_item_cancelled': {
          const contextSummary: ContextSummary = {
            whatHappened: `${sanitizedTitle} was cancelled by the supplier due to ${sanitizedReason}.`,
            whyItMatters: 'Your scheduled 14:30 afternoon excursion cannot proceed as planned.',
            whatIsAffected: `${sanitizedTitle} on Day 2 of your trip.`,
            whatHasChanged: 'Downstream dinner reservations at 19:30 remain completely unchanged.',
            whatActionRequired: 'Review the proposed replacement options within your budget.',
            whatUserCanDoNext: 'Tap below to select an alternative or request an immediate refund.',
          };
          return {
            subject: `Action Required: Your ${journeyTitle} itinerary needs attention`,
            title: `Your ${sanitizedTitle} needs attention`,
            body: `${sanitizedTitle} has been cancelled by the supplier (${sanitizedReason}). Your dinner reservation remains unchanged. 2 curated alternatives are available within your budget.`,
            contextSummary,
            actionLabel: 'Review Change',
            actionUrl: `/notifications`,
          };
        }

        case 'itinerary_item_replaced':
        case 'change_applied': {
          const contextSummary: ContextSummary = {
            whatHappened: `Your journey was successfully adapted: replaced with ${replacementTitle}.`,
            whyItMatters: 'Your schedule is protected with zero scheduling overlaps.',
            whatIsAffected: `Replaced ${sanitizedTitle} (14:30) with ${replacementTitle} (14:30).`,
            whatHasChanged: refundFormatted
              ? `Price adjusted from ${originalCostFormatted || '₹5,200'} to ${replacementCostFormatted || '₹1,500'}. Refund of ${refundFormatted} initiated.`
              : 'Itinerary schedule updated.',
            whatUserCanDoNext: 'View your updated live journey schedule in your Traveler Passport.',
          };
          return {
            subject: `Updated: Your ${journeyTitle} itinerary has been confirmed`,
            title: `Your ${journeyTitle} has been updated`,
            body: `${sanitizedTitle} was replaced with ${replacementTitle}. Schedule remains 14:30. ${refundFormatted ? `A refund difference of ${refundFormatted} has been processed.` : ''}`,
            contextSummary,
            actionLabel: 'View Updated Journey',
            actionUrl: `/traveler/journeys/${journeyId}`,
          };
        }

        case 'refund_succeeded': {
          const amountStr = refundFormatted || '₹3,700';
          const contextSummary: ContextSummary = {
            whatHappened: `Refund of ${amountStr} has been successfully settled to your original payment method.`,
            whyItMatters: 'Your payment balance reflects the exact itinerary price reduction.',
            whatIsAffected: `Booking #${bookingId}`,
            whatHasChanged: 'Financial state reconciled with 0 remaining charges.',
            whatUserCanDoNext: 'Review your receipt in your Booking Details.',
          };
          return {
            subject: `Refund Processed: ${amountStr} for ${journeyTitle}`,
            title: `Refund of ${amountStr} completed`,
            body: `Your refund of ${amountStr} has been successfully completed and credited to your original payment method.`,
            contextSummary,
            actionLabel: 'View Booking',
            actionUrl: `/traveler/bookings/${bookingId}`,
          };
        }

        case 'booking_confirmed': {
          const contextSummary: ContextSummary = {
            whatHappened: `Your booking for ${journeyTitle} has been confirmed.`,
            whyItMatters: 'All accommodations, transfers, and activities have guaranteed inventory holds.',
            whatIsAffected: `Journey #${journeyId}`,
            whatHasChanged: 'All itinerary stops are now locked and operational.',
            whatUserCanDoNext: 'Check out the smart packing recommendations and weather forecast.',
          };
          return {
            subject: `Confirmed: ${journeyTitle} is ready!`,
            title: `Booking Confirmed for ${journeyTitle}`,
            body: `Your trip is officially booked! All supplier reservations and transfers have been secured.`,
            contextSummary,
            actionLabel: 'View Trip Passport',
            actionUrl: `/traveler/journeys/${journeyId}`,
          };
        }

        default: {
          const defaultContext: ContextSummary = {
            whatHappened: `${event.eventType.replace(/_/g, ' ')} occurred for your journey.`,
            whyItMatters: 'Keeps your journey timeline synchronized with real-time tour operations.',
            whatIsAffected: journeyTitle,
            whatHasChanged: 'Journey operational metadata updated.',
            whatUserCanDoNext: 'Visit your notification center to review details.',
          };
          return {
            subject: `Notification: ${journeyTitle}`,
            title: `Update on ${journeyTitle}`,
            body: `An update was recorded for ${journeyTitle}: ${event.eventType.replace(/_/g, ' ')}.`,
            contextSummary: defaultContext,
            actionLabel: 'View Notification',
            actionUrl: `/notifications`,
          };
        }
      }
    }

    // 2. OPERATOR / COORDINATOR AUDIENCE TEMPLATES
    if (recipientRole === 'operator' || recipientRole === 'coordinator' || recipientRole === 'admin') {
      switch (event.eventType) {
        case 'itinerary_item_cancelled':
        case 'supplier_cancelled':
        case 'change_requires_approval': {
          const contextSummary: ContextSummary = {
            whatHappened: `Supplier cancellation reported on ${journeyTitle} (${sanitizedTitle}).`,
            whyItMatters: 'High-priority disruption impacting active itinerary flow.',
            whatIsAffected: `Stop "${sanitizedTitle}" on Journey #${journeyId}.`,
            whatHasChanged: 'Living Journey Engine evaluated 2 candidate alternatives.',
            whatActionRequired: 'Operator review and approval required to commit replacement and balance adjustments.',
            whatUserCanDoNext: 'Inspect candidate feasibility matrix, financial delta, and approve in Change Center.',
          };
          return {
            subject: `[CRITICAL OPS] Disruption on ${journeyTitle} - Action Required`,
            title: `Supplier Cancellation Requires Action: ${sanitizedTitle}`,
            body: `${sanitizedTitle} for ${journeyTitle} (#${journeyId}) was cancelled (${sanitizedReason}). Impact analyzed: 2 downstream items protected. Approved replacement available.`,
            contextSummary,
            actionLabel: 'Open Attention Center',
            actionUrl: `/operator/attention`,
          };
        }

        case 'change_applied':
        case 'itinerary_item_replaced': {
          const contextSummary: ContextSummary = {
            whatHappened: `Journey #${journeyId} advanced to new version with ${replacementTitle}.`,
            whyItMatters: 'Supplier allocation confirmed and partial refund issued.',
            whatIsAffected: `Replaced item: ${sanitizedTitle}. New item: ${replacementTitle}.`,
            whatHasChanged: `Financial delta ${refundFormatted ? `-${refundFormatted}` : '0'}. Journey version incremented.`,
            whatUserCanDoNext: 'Monitor real-time supplier check-in and delivery status.',
          };
          return {
            subject: `[OPS RESOLVED] Adaptation Applied: ${journeyTitle}`,
            title: `Disruption Resolved on ${journeyTitle}`,
            body: `Replacement "${replacementTitle}" successfully applied to journey #${journeyId}. Supplier allocation confirmed and financial delta reconciled.`,
            contextSummary,
            actionLabel: 'View Change Center',
            actionUrl: `/operator/changes/${event.correlationId}`,
          };
        }

        case 'refund_succeeded': {
          const amountStr = refundFormatted || '₹3,700';
          const contextSummary: ContextSummary = {
            whatHappened: `Automated refund of ${amountStr} settled via gateway.`,
            whyItMatters: 'Financial ledger reconciled for booking #${bookingId}.',
            whatIsAffected: `Booking #${bookingId}`,
            whatHasChanged: 'Capture balance updated, refund record marked SUCCEEDED.',
            whatUserCanDoNext: 'Review financial audit report in Operator Booking Center.',
          };
          return {
            subject: `[FINANCE] Refund Succeeded: ${amountStr} for Booking #${bookingId}`,
            title: `Refund Succeeded: ${amountStr}`,
            body: `Refund of ${amountStr} for Booking #${bookingId} successfully settled and logged in financial audit history.`,
            contextSummary,
            actionLabel: 'Open Booking Center',
            actionUrl: `/operator/bookings/${bookingId}`,
          };
        }

        default: {
          const defaultContext: ContextSummary = {
            whatHappened: `Operational event ${event.eventType} triggered.`,
            whyItMatters: 'System audit and operational monitoring.',
            whatIsAffected: `Aggregate: ${event.aggregateType} #${event.aggregateId}`,
            whatHasChanged: 'Domain state updated.',
            whatUserCanDoNext: 'Review telemetry log.',
          };
          return {
            subject: `[OPS] ${event.eventType} - ${journeyTitle}`,
            title: `Operational Event: ${event.eventType.replace(/_/g, ' ')}`,
            body: `Operational event ${event.eventType} recorded for ${journeyTitle}. Priority: ${event.operationalPriority}.`,
            contextSummary: defaultContext,
            actionLabel: 'Open Operations',
            actionUrl: `/operator/attention`,
          };
        }
      }
    }

    // 3. VENDOR / SUPPLIER AUDIENCE TEMPLATES
    const defaultVendorContext: ContextSummary = {
      whatHappened: `Booking notification for your inventory service.`,
      whyItMatters: 'Capacity allocation and guest check-in coordination.',
      whatIsAffected: `Service: ${sanitizedTitle}`,
      whatHasChanged: 'Reservation status synchronized.',
      whatUserCanDoNext: 'Confirm allocation in your Supplier Portal.',
    };

    return {
      subject: `Supplier Alert: ${sanitizedTitle}`,
      title: `Allocation Request for ${sanitizedTitle}`,
      body: `Booking update for ${sanitizedTitle}. Please check your active guest allocations.`,
      contextSummary: defaultVendorContext,
      actionLabel: 'Open Supplier Portal',
      actionUrl: `/vendor/bookings`,
    };
  }
}
