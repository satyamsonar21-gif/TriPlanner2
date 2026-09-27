import type { UserRole } from '@/types/database.types';

export type CommunicationChannel = 'IN_APP' | 'EMAIL' | 'SMS' | 'WHATSAPP' | 'PUSH';

export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';

export type NotificationSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type NotificationLifecycleState =
  | 'CREATED'
  | 'QUEUED'
  | 'PROCESSING'
  | 'DELIVERED'
  | 'READ'
  | 'ACKNOWLEDGED'
  | 'RESOLVED'
  | 'FAILED'
  | 'RETRYING'
  | 'DEAD_LETTERED';

export type OperationalActionState =
  | 'OPEN'
  | 'ACKNOWLEDGED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'ESCALATED'
  | 'DISMISSED';

export type NotificationCategory =
  | 'DISRUPTION'
  | 'BOOKING'
  | 'PAYMENT'
  | 'REFUND'
  | 'SAFETY'
  | 'SUPPLIER'
  | 'ITINERARY'
  | 'COLLABORATION'
  | 'SYSTEM';

export type CommunicationEventType =
  // JOURNEY
  | 'journey_created'
  | 'journey_updated'
  | 'journey_date_changed'
  | 'itinerary_updated'
  | 'itinerary_item_changed'
  | 'itinerary_item_cancelled'
  | 'itinerary_item_replaced'
  | 'journey_completed'
  // BOOKING
  | 'booking_created'
  | 'booking_price_updated'
  | 'booking_inventory_held'
  | 'booking_payment_required'
  | 'booking_payment_authorized'
  | 'booking_payment_captured'
  | 'booking_confirmed'
  | 'booking_failed'
  | 'booking_amendment_requested'
  | 'booking_cancelled'
  | 'booking_completed'
  // PAYMENT
  | 'payment_pending'
  | 'payment_action_required'
  | 'payment_captured'
  | 'payment_failed'
  | 'payment_cancelled'
  // REFUND
  | 'refund_requested'
  | 'refund_approved'
  | 'refund_processing'
  | 'refund_succeeded'
  | 'refund_failed'
  | 'refund_rejected'
  // SUPPLIER
  | 'supplier_confirmation_required'
  | 'supplier_confirmed'
  | 'supplier_rejected'
  | 'supplier_cancelled'
  | 'supplier_capacity_changed'
  | 'supplier_availability_changed'
  // INVENTORY
  | 'inventory_hold_created'
  | 'inventory_hold_expiring'
  | 'inventory_hold_expired'
  | 'inventory_unavailable'
  // EXTERNAL REALITY
  | 'weather_alert'
  | 'external_event_detected'
  | 'external_event_resolved'
  | 'weather_impact_detected'
  // LIVING JOURNEY
  | 'change_proposed'
  | 'change_requires_approval'
  | 'change_approved'
  | 'change_rejected'
  | 'change_applied'
  | 'change_failed'
  | 'change_conflict_detected'
  // OPERATIONS
  | 'operational_conflict_detected'
  | 'attention_required'
  | 'task_assigned'
  | 'task_completed'
  | 'escalation_triggered';

/**
 * Structured Operational Narrative Context
 * Answers: WHAT HAPPENED -> WHY IT MATTERS -> WHAT IS AFFECTED -> WHAT CHANGED -> WHAT ACTION REQUIRED -> NEXT STEPS
 */
export interface ContextSummary {
  whatHappened: string;
  whyItMatters: string;
  whatIsAffected: string;
  whatHasChanged: string;
  whatActionRequired?: string;
  whatUserCanDoNext: string;
}

/**
 * Strongly typed domain communication event
 */
export interface CommunicationEvent<T = Record<string, unknown>> {
  eventId: string;
  eventType: CommunicationEventType;
  eventVersion: number;
  occurredAt: string;
  tenantId: string;
  journeyId?: string;
  bookingId?: string;
  actorId?: string;
  sourceDomain: string;
  aggregateType: string;
  aggregateId: string;
  correlationId: string;
  causationId?: string;
  severity: NotificationSeverity;
  operationalPriority: NotificationPriority;
  payload: T;
  idempotencyKey: string;
  requiredAction?: string;
  expiresAt?: string;
}

/**
 * Recipient resolution output
 */
export interface ResolvedRecipient {
  userId: string;
  role: UserRole;
  tenantId: string;
  email?: string;
  phone?: string;
  channels: CommunicationChannel[];
  isMandatory: boolean;
}

/**
 * Recipient resolution input context
 */
export interface RecipientResolutionContext {
  tenantId: string;
  journeyId?: string;
  bookingId?: string;
  travelerId?: string;
  operatorId?: string;
  coordinatorId?: string;
  supplierId?: string;
  actorId?: string;
  actorRole?: UserRole;
}

/**
 * Durable in-app / multi-channel notification entity
 */
export interface NotificationRecord {
  id: string;
  tenantId: string;
  recipientId: string;
  recipientRole: UserRole;
  eventId?: string;
  journeyId?: string;
  bookingId?: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  severity: NotificationSeverity;
  title: string;
  body: string;
  contextSummary: ContextSummary;
  actionRequired: boolean;
  actionType?: string;
  actionUrl?: string;
  lifecycleState: NotificationLifecycleState;
  readAt?: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  expiresAt?: string;
  correlationId: string;
  idempotencyKey: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Per-channel delivery attempt tracking
 */
export interface NotificationDelivery {
  id: string;
  notificationId: string;
  channel: CommunicationChannel;
  recipientAddress: string;
  provider: string;
  providerMessageId?: string;
  status: NotificationLifecycleState;
  attemptCount: number;
  maxAttempts: number;
  nextRetryAt?: string;
  lastError?: string;
  deliveredAt?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/**
 * User Preferences
 */
export interface NotificationPreferences {
  userId: string;
  tenantId: string;
  categoryPreferences: Record<NotificationCategory, boolean>;
  channelPreferences: Record<CommunicationChannel, boolean>;
  quietHoursEnabled: boolean;
  quietHoursStart: string; // "22:00"
  quietHoursEnd: string;   // "07:00"
  timezone: string;        // "Asia/Kolkata"
  updatedAt: string;
}

/**
 * Explicit acknowledgement record
 */
export interface NotificationAcknowledgement {
  id: string;
  notificationId: string;
  actionState: OperationalActionState;
  actorId: string;
  actorRole: UserRole;
  notes?: string;
  domainActionRef?: string;
  createdAt: string;
}

/**
 * Dead letter record for permanent or exhausted delivery attempts
 */
export interface DeadLetterRecord {
  id: string;
  deliveryId: string;
  eventId?: string;
  failureReason: string;
  retryCount: number;
  lastAttemptAt: string;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  notes?: string;
  createdAt: string;
}

/**
 * Rendered template representation
 */
export interface RenderedTemplate {
  subject?: string;
  title: string;
  body: string;
  contextSummary: ContextSummary;
  actionLabel?: string;
  actionUrl?: string;
  disclaimer?: string;
}

/**
 * Communication Telemetry metrics for Phase 08 & Phase 09 Observability
 */
export interface CommunicationTelemetry {
  eventsIngested: number;
  notificationsCreated: number;
  deliveriesAttempted: number;
  deliveriesSucceeded: number;
  deliveriesFailed: number;
  retriesScheduled: number;
  deadLetterCount: number;
  unreadCount: number;
  averageAckLatencyMs: number;
  lastEventAt?: string;
}
