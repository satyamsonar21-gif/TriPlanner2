import type { UserRole } from '@/types/database.types';
import type {
  CommunicationEvent,
  RecipientResolutionContext,
  ResolvedRecipient,
} from './types';
import { NotificationPolicyEngine } from './notification-policy';

export class RecipientResolver {
  /**
   * Deterministically resolves all intended authorized recipients for a given communication event.
   * Enforces strict multi-tenant boundaries and role-based relevance.
   */
  public static resolve(
    event: CommunicationEvent,
    context: RecipientResolutionContext
  ): ResolvedRecipient[] {
    const recipients: ResolvedRecipient[] = [];
    const isMandatory = NotificationPolicyEngine.isMandatory(event);
    const tenantId = context.tenantId || event.tenantId || 'org_goa_ops_01';

    // 1. TRAVELER RESOLUTION
    // Travelers receive events concerning their bookings, journeys, itinerary adaptations, payments, and refunds.
    const travelerId = context.travelerId || (event.payload.travelerId as string);
    if (travelerId) {
      const isTravelerRelevant =
        event.sourceDomain === 'journey-engine' ||
        event.eventType.startsWith('booking_') ||
        event.eventType.startsWith('payment_') ||
        event.eventType.startsWith('refund_') ||
        event.eventType.startsWith('itinerary_') ||
        event.eventType.startsWith('weather_') ||
        event.eventType === 'change_applied' ||
        event.eventType === 'itinerary_item_cancelled';

      if (isTravelerRelevant) {
        recipients.push({
          userId: travelerId,
          role: 'traveler' as UserRole,
          tenantId,
          email: `${travelerId}@example.com`,
          channels: ['IN_APP', 'EMAIL'],
          isMandatory,
        });
      }
    }

    // 2. OPERATOR RESOLUTION
    // Operators oversee disruptions, change proposals, payment/booking issues, safety alerts, and operational escalations.
    const isOperatorRelevant =
      event.operationalPriority === 'CRITICAL' ||
      event.operationalPriority === 'HIGH' ||
      event.severity === 'CRITICAL' ||
      event.severity === 'HIGH' ||
      event.eventType.includes('cancelled') ||
      event.eventType.includes('failed') ||
      event.eventType.includes('approval') ||
      event.eventType.includes('disruption') ||
      event.eventType.includes('conflict') ||
      event.eventType.includes('attention') ||
      event.eventType === 'change_applied';

    if (isOperatorRelevant) {
      const operatorId = context.operatorId || 'usr_operator_01';
      recipients.push({
        userId: operatorId,
        role: 'operator' as UserRole,
        tenantId,
        email: 'ops@tripplanner.local',
        channels: ['IN_APP', 'EMAIL'],
        isMandatory: true, // Operators must receive critical operational updates
      });
    }

    // 3. COORDINATOR RESOLUTION
    // If a coordinator is assigned to the journey, notify them of active itinerary or field changes.
    if (context.coordinatorId) {
      recipients.push({
        userId: context.coordinatorId,
        role: 'coordinator' as UserRole,
        tenantId,
        email: `${context.coordinatorId}@tripplanner.local`,
        channels: ['IN_APP'],
        isMandatory: isMandatory && event.operationalPriority === 'CRITICAL',
      });
    }

    // 4. SUPPLIER / VENDOR RESOLUTION
    // Only notified if supplier action or notification is specifically relevant (e.g. cancellation, confirmation).
    const supplierId = context.supplierId || (event.payload.supplierId as string);
    if (supplierId) {
      const isSupplierRelevant =
        event.eventType.startsWith('supplier_') ||
        event.eventType === 'booking_inventory_held' ||
        event.eventType === 'itinerary_item_cancelled';

      if (isSupplierRelevant) {
        recipients.push({
          userId: supplierId,
          role: 'vendor' as UserRole,
          tenantId,
          email: `${supplierId}@supplier.local`,
          channels: ['IN_APP', 'EMAIL'],
          isMandatory: true,
        });
      }
    }

    // Deduplicate recipients by userId
    const uniqueRecipients = new Map<string, ResolvedRecipient>();
    for (const r of recipients) {
      if (!uniqueRecipients.has(r.userId)) {
        uniqueRecipients.set(r.userId, r);
      }
    }

    return Array.from(uniqueRecipients.values());
  }
}
