import type {
  CommunicationEvent,
  CommunicationEventType,
  NotificationCategory,
  NotificationPriority,
  NotificationSeverity,
} from './types';
import type { DomainOutboxEvent } from '@/domains/journey-engine/types';

export interface EventDefinition {
  type: CommunicationEventType;
  category: NotificationCategory;
  defaultSeverity: NotificationSeverity;
  defaultPriority: NotificationPriority;
  isMandatory: boolean;
  requiresAction: boolean;
}

export const EVENT_CATALOG: Record<CommunicationEventType, EventDefinition> = {
  // JOURNEY
  journey_created: {
    type: 'journey_created',
    category: 'ITINERARY',
    defaultSeverity: 'LOW',
    defaultPriority: 'NORMAL',
    isMandatory: false,
    requiresAction: false,
  },
  journey_updated: {
    type: 'journey_updated',
    category: 'ITINERARY',
    defaultSeverity: 'LOW',
    defaultPriority: 'NORMAL',
    isMandatory: false,
    requiresAction: false,
  },
  journey_date_changed: {
    type: 'journey_date_changed',
    category: 'ITINERARY',
    defaultSeverity: 'MEDIUM',
    defaultPriority: 'HIGH',
    isMandatory: true,
    requiresAction: true,
  },
  itinerary_updated: {
    type: 'itinerary_updated',
    category: 'ITINERARY',
    defaultSeverity: 'LOW',
    defaultPriority: 'NORMAL',
    isMandatory: false,
    requiresAction: false,
  },
  itinerary_item_changed: {
    type: 'itinerary_item_changed',
    category: 'ITINERARY',
    defaultSeverity: 'MEDIUM',
    defaultPriority: 'NORMAL',
    isMandatory: false,
    requiresAction: false,
  },
  itinerary_item_cancelled: {
    type: 'itinerary_item_cancelled',
    category: 'DISRUPTION',
    defaultSeverity: 'HIGH',
    defaultPriority: 'CRITICAL',
    isMandatory: true,
    requiresAction: true,
  },
  itinerary_item_replaced: {
    type: 'itinerary_item_replaced',
    category: 'ITINERARY',
    defaultSeverity: 'MEDIUM',
    defaultPriority: 'HIGH',
    isMandatory: true,
    requiresAction: false,
  },
  journey_completed: {
    type: 'journey_completed',
    category: 'ITINERARY',
    defaultSeverity: 'LOW',
    defaultPriority: 'LOW',
    isMandatory: false,
    requiresAction: false,
  },

  // BOOKING
  booking_created: {
    type: 'booking_created',
    category: 'BOOKING',
    defaultSeverity: 'LOW',
    defaultPriority: 'NORMAL',
    isMandatory: false,
    requiresAction: false,
  },
  booking_price_updated: {
    type: 'booking_price_updated',
    category: 'BOOKING',
    defaultSeverity: 'MEDIUM',
    defaultPriority: 'NORMAL',
    isMandatory: true,
    requiresAction: false,
  },
  booking_inventory_held: {
    type: 'booking_inventory_held',
    category: 'BOOKING',
    defaultSeverity: 'LOW',
    defaultPriority: 'NORMAL',
    isMandatory: false,
    requiresAction: false,
  },
  booking_payment_required: {
    type: 'booking_payment_required',
    category: 'PAYMENT',
    defaultSeverity: 'HIGH',
    defaultPriority: 'HIGH',
    isMandatory: true,
    requiresAction: true,
  },
  booking_payment_authorized: {
    type: 'booking_payment_authorized',
    category: 'PAYMENT',
    defaultSeverity: 'LOW',
    defaultPriority: 'NORMAL',
    isMandatory: true,
    requiresAction: false,
  },
  booking_payment_captured: {
    type: 'booking_payment_captured',
    category: 'PAYMENT',
    defaultSeverity: 'LOW',
    defaultPriority: 'NORMAL',
    isMandatory: true,
    requiresAction: false,
  },
  booking_confirmed: {
    type: 'booking_confirmed',
    category: 'BOOKING',
    defaultSeverity: 'LOW',
    defaultPriority: 'NORMAL',
    isMandatory: true,
    requiresAction: false,
  },
  booking_failed: {
    type: 'booking_failed',
    category: 'BOOKING',
    defaultSeverity: 'HIGH',
    defaultPriority: 'HIGH',
    isMandatory: true,
    requiresAction: true,
  },
  booking_amendment_requested: {
    type: 'booking_amendment_requested',
    category: 'BOOKING',
    defaultSeverity: 'MEDIUM',
    defaultPriority: 'HIGH',
    isMandatory: true,
    requiresAction: true,
  },
  booking_cancelled: {
    type: 'booking_cancelled',
    category: 'BOOKING',
    defaultSeverity: 'HIGH',
    defaultPriority: 'HIGH',
    isMandatory: true,
    requiresAction: false,
  },
  booking_completed: {
    type: 'booking_completed',
    category: 'BOOKING',
    defaultSeverity: 'LOW',
    defaultPriority: 'LOW',
    isMandatory: false,
    requiresAction: false,
  },

  // PAYMENT
  payment_pending: {
    type: 'payment_pending',
    category: 'PAYMENT',
    defaultSeverity: 'LOW',
    defaultPriority: 'LOW',
    isMandatory: false,
    requiresAction: false,
  },
  payment_action_required: {
    type: 'payment_action_required',
    category: 'PAYMENT',
    defaultSeverity: 'HIGH',
    defaultPriority: 'HIGH',
    isMandatory: true,
    requiresAction: true,
  },
  payment_captured: {
    type: 'payment_captured',
    category: 'PAYMENT',
    defaultSeverity: 'LOW',
    defaultPriority: 'NORMAL',
    isMandatory: true,
    requiresAction: false,
  },
  payment_failed: {
    type: 'payment_failed',
    category: 'PAYMENT',
    defaultSeverity: 'HIGH',
    defaultPriority: 'HIGH',
    isMandatory: true,
    requiresAction: true,
  },
  payment_cancelled: {
    type: 'payment_cancelled',
    category: 'PAYMENT',
    defaultSeverity: 'MEDIUM',
    defaultPriority: 'NORMAL',
    isMandatory: true,
    requiresAction: false,
  },

  // REFUND
  refund_requested: {
    type: 'refund_requested',
    category: 'REFUND',
    defaultSeverity: 'LOW',
    defaultPriority: 'NORMAL',
    isMandatory: true,
    requiresAction: false,
  },
  refund_approved: {
    type: 'refund_approved',
    category: 'REFUND',
    defaultSeverity: 'LOW',
    defaultPriority: 'NORMAL',
    isMandatory: true,
    requiresAction: false,
  },
  refund_processing: {
    type: 'refund_processing',
    category: 'REFUND',
    defaultSeverity: 'LOW',
    defaultPriority: 'NORMAL',
    isMandatory: true,
    requiresAction: false,
  },
  refund_succeeded: {
    type: 'refund_succeeded',
    category: 'REFUND',
    defaultSeverity: 'LOW',
    defaultPriority: 'NORMAL',
    isMandatory: true,
    requiresAction: false,
  },
  refund_failed: {
    type: 'refund_failed',
    category: 'REFUND',
    defaultSeverity: 'HIGH',
    defaultPriority: 'HIGH',
    isMandatory: true,
    requiresAction: true,
  },
  refund_rejected: {
    type: 'refund_rejected',
    category: 'REFUND',
    defaultSeverity: 'HIGH',
    defaultPriority: 'HIGH',
    isMandatory: true,
    requiresAction: true,
  },

  // SUPPLIER
  supplier_confirmation_required: {
    type: 'supplier_confirmation_required',
    category: 'SUPPLIER',
    defaultSeverity: 'MEDIUM',
    defaultPriority: 'HIGH',
    isMandatory: true,
    requiresAction: true,
  },
  supplier_confirmed: {
    type: 'supplier_confirmed',
    category: 'SUPPLIER',
    defaultSeverity: 'LOW',
    defaultPriority: 'NORMAL',
    isMandatory: true,
    requiresAction: false,
  },
  supplier_rejected: {
    type: 'supplier_rejected',
    category: 'SUPPLIER',
    defaultSeverity: 'HIGH',
    defaultPriority: 'CRITICAL',
    isMandatory: true,
    requiresAction: true,
  },
  supplier_cancelled: {
    type: 'supplier_cancelled',
    category: 'SUPPLIER',
    defaultSeverity: 'HIGH',
    defaultPriority: 'CRITICAL',
    isMandatory: true,
    requiresAction: true,
  },
  supplier_capacity_changed: {
    type: 'supplier_capacity_changed',
    category: 'SUPPLIER',
    defaultSeverity: 'MEDIUM',
    defaultPriority: 'NORMAL',
    isMandatory: false,
    requiresAction: false,
  },
  supplier_availability_changed: {
    type: 'supplier_availability_changed',
    category: 'SUPPLIER',
    defaultSeverity: 'MEDIUM',
    defaultPriority: 'NORMAL',
    isMandatory: false,
    requiresAction: false,
  },

  // INVENTORY
  inventory_hold_created: {
    type: 'inventory_hold_created',
    category: 'BOOKING',
    defaultSeverity: 'LOW',
    defaultPriority: 'LOW',
    isMandatory: false,
    requiresAction: false,
  },
  inventory_hold_expiring: {
    type: 'inventory_hold_expiring',
    category: 'BOOKING',
    defaultSeverity: 'MEDIUM',
    defaultPriority: 'HIGH',
    isMandatory: true,
    requiresAction: true,
  },
  inventory_hold_expired: {
    type: 'inventory_hold_expired',
    category: 'BOOKING',
    defaultSeverity: 'MEDIUM',
    defaultPriority: 'NORMAL',
    isMandatory: true,
    requiresAction: false,
  },
  inventory_unavailable: {
    type: 'inventory_unavailable',
    category: 'BOOKING',
    defaultSeverity: 'HIGH',
    defaultPriority: 'HIGH',
    isMandatory: true,
    requiresAction: true,
  },

  // EXTERNAL REALITY
  weather_alert: {
    type: 'weather_alert',
    category: 'SAFETY',
    defaultSeverity: 'HIGH',
    defaultPriority: 'HIGH',
    isMandatory: true,
    requiresAction: false,
  },
  external_event_detected: {
    type: 'external_event_detected',
    category: 'SAFETY',
    defaultSeverity: 'MEDIUM',
    defaultPriority: 'NORMAL',
    isMandatory: true,
    requiresAction: false,
  },
  external_event_resolved: {
    type: 'external_event_resolved',
    category: 'SAFETY',
    defaultSeverity: 'LOW',
    defaultPriority: 'NORMAL',
    isMandatory: false,
    requiresAction: false,
  },
  weather_impact_detected: {
    type: 'weather_impact_detected',
    category: 'SAFETY',
    defaultSeverity: 'HIGH',
    defaultPriority: 'CRITICAL',
    isMandatory: true,
    requiresAction: true,
  },

  // LIVING JOURNEY
  change_proposed: {
    type: 'change_proposed',
    category: 'DISRUPTION',
    defaultSeverity: 'MEDIUM',
    defaultPriority: 'NORMAL',
    isMandatory: false,
    requiresAction: false,
  },
  change_requires_approval: {
    type: 'change_requires_approval',
    category: 'DISRUPTION',
    defaultSeverity: 'HIGH',
    defaultPriority: 'CRITICAL',
    isMandatory: true,
    requiresAction: true,
  },
  change_approved: {
    type: 'change_approved',
    category: 'ITINERARY',
    defaultSeverity: 'LOW',
    defaultPriority: 'NORMAL',
    isMandatory: true,
    requiresAction: false,
  },
  change_rejected: {
    type: 'change_rejected',
    category: 'ITINERARY',
    defaultSeverity: 'MEDIUM',
    defaultPriority: 'HIGH',
    isMandatory: true,
    requiresAction: true,
  },
  change_applied: {
    type: 'change_applied',
    category: 'ITINERARY',
    defaultSeverity: 'LOW',
    defaultPriority: 'HIGH',
    isMandatory: true,
    requiresAction: false,
  },
  change_failed: {
    type: 'change_failed',
    category: 'DISRUPTION',
    defaultSeverity: 'HIGH',
    defaultPriority: 'CRITICAL',
    isMandatory: true,
    requiresAction: true,
  },
  change_conflict_detected: {
    type: 'change_conflict_detected',
    category: 'DISRUPTION',
    defaultSeverity: 'HIGH',
    defaultPriority: 'CRITICAL',
    isMandatory: true,
    requiresAction: true,
  },

  // OPERATIONS
  operational_conflict_detected: {
    type: 'operational_conflict_detected',
    category: 'COLLABORATION',
    defaultSeverity: 'HIGH',
    defaultPriority: 'CRITICAL',
    isMandatory: true,
    requiresAction: true,
  },
  attention_required: {
    type: 'attention_required',
    category: 'COLLABORATION',
    defaultSeverity: 'HIGH',
    defaultPriority: 'HIGH',
    isMandatory: true,
    requiresAction: true,
  },
  task_assigned: {
    type: 'task_assigned',
    category: 'COLLABORATION',
    defaultSeverity: 'LOW',
    defaultPriority: 'NORMAL',
    isMandatory: false,
    requiresAction: true,
  },
  task_completed: {
    type: 'task_completed',
    category: 'COLLABORATION',
    defaultSeverity: 'LOW',
    defaultPriority: 'LOW',
    isMandatory: false,
    requiresAction: false,
  },
  escalation_triggered: {
    type: 'escalation_triggered',
    category: 'COLLABORATION',
    defaultSeverity: 'CRITICAL',
    defaultPriority: 'CRITICAL',
    isMandatory: true,
    requiresAction: true,
  },
};

export class CommunicationEventFactory {
  /**
   * Translates a Living Journey Engine DomainOutboxEvent into a standardized CommunicationEvent
   */
  public static fromLivingJourneyOutbox(
    outboxEvent: DomainOutboxEvent,
    tenantId: string = 'org_goa_ops_01'
  ): CommunicationEvent {
    let eventType: CommunicationEventType = 'itinerary_updated';
    let severity: NotificationSeverity = 'MEDIUM';
    let priority: NotificationPriority = 'NORMAL';

    switch (outboxEvent.eventType) {
      case 'CHANGE_DETECTED':
        eventType = 'itinerary_item_cancelled';
        severity = 'HIGH';
        priority = 'CRITICAL';
        break;
      case 'CHANGE_AWAITING_APPROVAL':
        eventType = 'change_requires_approval';
        severity = 'HIGH';
        priority = 'CRITICAL';
        break;
      case 'CHANGE_APPROVED':
        eventType = 'change_approved';
        severity = 'LOW';
        priority = 'NORMAL';
        break;
      case 'CHANGE_APPLIED':
        eventType = 'change_applied';
        severity = 'LOW';
        priority = 'HIGH';
        break;
      case 'CHANGE_REJECTED':
        eventType = 'change_rejected';
        severity = 'MEDIUM';
        priority = 'HIGH';
        break;
      case 'BOOKING_REALLOCATED':
        eventType = 'itinerary_item_replaced';
        severity = 'MEDIUM';
        priority = 'HIGH';
        break;
      case 'BUDGET_UPDATED':
        eventType = 'booking_price_updated';
        severity = 'LOW';
        priority = 'NORMAL';
        break;
      default:
        eventType = 'itinerary_updated';
    }

    return {
      eventId: `cevt_${outboxEvent.id}`,
      eventType,
      eventVersion: 1,
      occurredAt: outboxEvent.createdAt,
      tenantId,
      journeyId: outboxEvent.journeyId,
      bookingId: (outboxEvent.payload.bookingId as string) || undefined,
      actorId: (outboxEvent.payload.actorId as string) || undefined,
      sourceDomain: 'journey-engine',
      aggregateType: 'Journey',
      aggregateId: outboxEvent.journeyId,
      correlationId: `corr_${outboxEvent.changeRequestId || outboxEvent.idempotencyKey}`,
      causationId: outboxEvent.id,
      severity,
      operationalPriority: priority,
      payload: outboxEvent.payload,
      idempotencyKey: `comm_outbox_${outboxEvent.id}`,
      requiredAction:
        priority === 'CRITICAL' ? 'Review & Approve Replacement Proposal' : undefined,
    };
  }

  /**
   * Creates a typed communication event
   */
  public static createEvent<T extends Record<string, unknown>>(params: {
    eventType: CommunicationEventType;
    tenantId?: string;
    journeyId?: string;
    bookingId?: string;
    actorId?: string;
    sourceDomain: string;
    aggregateType: string;
    aggregateId: string;
    correlationId: string;
    causationId?: string;
    severity?: NotificationSeverity;
    priority?: NotificationPriority;
    payload: T;
    idempotencyKey: string;
    requiredAction?: string;
  }): CommunicationEvent<T> {
    const def = EVENT_CATALOG[params.eventType] || {
      category: 'SYSTEM',
      defaultSeverity: 'MEDIUM',
      defaultPriority: 'NORMAL',
    };

    return {
      eventId: `cevt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      eventType: params.eventType,
      eventVersion: 1,
      occurredAt: new Date().toISOString(),
      tenantId: params.tenantId || 'org_goa_ops_01',
      journeyId: params.journeyId,
      bookingId: params.bookingId,
      actorId: params.actorId,
      sourceDomain: params.sourceDomain,
      aggregateType: params.aggregateType,
      aggregateId: params.aggregateId,
      correlationId: params.correlationId,
      causationId: params.causationId,
      severity: params.severity || def.defaultSeverity,
      operationalPriority: params.priority || def.defaultPriority,
      payload: params.payload,
      idempotencyKey: params.idempotencyKey,
      requiredAction: params.requiredAction,
    };
  }
}
