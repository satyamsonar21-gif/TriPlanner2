import type { UserRole } from '@/types/database.types';
import type {
  CommunicationEvent,
  NotificationRecord,
  RecipientResolutionContext,
  OperationalActionState,
  CommunicationTelemetry,
} from './types';
import type { DomainOutboxEvent } from '@/domains/journey-engine/types';
import { CommunicationEventFactory } from './event-catalog';
import { RecipientResolver } from './recipient-resolver';
import { NotificationPolicyEngine } from './notification-policy';
import { TemplateEngine } from './template-engine';
import { NotificationStore, sharedNotificationStore } from './notification-store';
import { DeliveryService, sharedDeliveryService } from './delivery-service';
import { DeduplicationService, sharedDeduplicationService } from './deduplication-service';
import { CommunicationAuditService, sharedCommunicationAuditService } from './communication-audit';
import { AcknowledgementService, sharedAcknowledgementService } from './acknowledgement-service';

export class CommunicationOrchestrator {
  private store: NotificationStore;
  private deliveryService: DeliveryService;
  private deduplication: DeduplicationService;
  private audit: CommunicationAuditService;
  private ackService: AcknowledgementService;

  constructor(
    store: NotificationStore = sharedNotificationStore,
    deliveryService: DeliveryService = sharedDeliveryService,
    deduplication: DeduplicationService = sharedDeduplicationService,
    audit: CommunicationAuditService = sharedCommunicationAuditService,
    ackService: AcknowledgementService = sharedAcknowledgementService
  ) {
    this.store = store;
    this.deliveryService = deliveryService;
    this.deduplication = deduplication;
    this.audit = audit;
    this.ackService = ackService;
  }

  /**
   * Ingests a transactional outbox event emitted by the Living Journey Engine
   */
  public async ingestOutboxEvent(
    outboxEvent: DomainOutboxEvent,
    context: RecipientResolutionContext
  ): Promise<NotificationRecord[]> {
    const commEvent = CommunicationEventFactory.fromLivingJourneyOutbox(
      outboxEvent,
      context.tenantId
    );
    return this.ingestEvent(commEvent, context);
  }

  /**
   * Primary entry point: Ingests an authoritative domain communication event,
   * resolves recipients, renders templates, persists notification records,
   * and orchestrates multi-channel delivery.
   */
  public async ingestEvent(
    event: CommunicationEvent,
    context: RecipientResolutionContext
  ): Promise<NotificationRecord[]> {
    this.deliveryService.recordEventIngested();

    this.audit.record({
      tenantId: event.tenantId,
      action: 'COMMUNICATION_INGESTED',
      eventId: event.eventId,
      correlationId: event.correlationId,
      actorId: event.actorId,
      metadata: { eventType: event.eventType, severity: event.severity },
    });

    // 1. Storm Prevention / Event Coalescing Check
    if (this.deduplication.shouldCoalesce(event)) {
      return [];
    }

    // 2. Deterministic Recipient Resolution
    const recipients = RecipientResolver.resolve(event, context);
    this.audit.record({
      tenantId: event.tenantId,
      action: 'RECIPIENTS_RESOLVED',
      eventId: event.eventId,
      correlationId: event.correlationId,
      metadata: { recipientCount: recipients.length, recipients: recipients.map((r) => r.userId) },
    });

    const createdNotifications: NotificationRecord[] = [];

    // 3. Process Each Recipient
    for (const recipient of recipients) {
      const priority = NotificationPolicyEngine.resolvePriority(event);
      const template = TemplateEngine.render(event, recipient.role);

      const notifId = `notif_${event.eventId}_${recipient.userId}`;
      const notificationRecord: NotificationRecord = {
        id: notifId,
        tenantId: event.tenantId,
        recipientId: recipient.userId,
        recipientRole: recipient.role,
        eventId: event.eventId,
        journeyId: event.journeyId,
        bookingId: event.bookingId,
        category: (event.payload.category as any) || 'DISRUPTION',
        priority,
        severity: event.severity,
        title: template.title,
        body: template.body,
        contextSummary: template.contextSummary,
        actionRequired: !!(event.requiredAction || template.actionLabel),
        actionType: event.requiredAction ? 'APPROVAL_REQUIRED' : undefined,
        actionUrl: template.actionUrl,
        lifecycleState: 'CREATED',
        correlationId: event.correlationId,
        idempotencyKey: `notif_idem_${event.idempotencyKey}_${recipient.userId}`,
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Save to durable store
      const saved = this.store.save(notificationRecord);
      this.deliveryService.recordNotificationCreated();

      this.audit.record({
        tenantId: event.tenantId,
        action: 'NOTIFICATION_CREATED',
        eventId: event.eventId,
        notificationId: saved.id,
        correlationId: event.correlationId,
        actorId: recipient.userId,
        actorRole: recipient.role,
        metadata: { priority, title: template.title },
      });

      // 4. Orchestrate Multi-Channel Delivery (In-App + Email)
      await this.deliveryService.deliverToRecipient({
        notification: saved,
        recipient,
        template,
      });

      // Update state to DELIVERED once in-app delivery is recorded
      saved.lifecycleState = 'DELIVERED';
      this.store.save(saved);

      createdNotifications.push(saved);
    }

    return createdNotifications;
  }

  // Convenience query and action methods
  public getTravelerNotifications(
    travelerId: string,
    options?: { unreadOnly?: boolean; tenantId?: string }
  ): NotificationRecord[] {
    return this.store.getByRecipient(travelerId, options);
  }

  public getOperatorAttentionQueue(tenantId: string = 'org_goa_ops_01'): NotificationRecord[] {
    return this.store.getAttentionQueue(tenantId);
  }

  public getVendorNotifications(vendorId: string): NotificationRecord[] {
    return this.store.getByRecipient(vendorId);
  }

  public markRead(notificationId: string, actorId: string): NotificationRecord {
    const notif = this.store.markAsRead(notificationId, actorId);
    this.audit.record({
      tenantId: notif.tenantId,
      action: 'NOTIFICATION_READ',
      notificationId: notif.id,
      correlationId: notif.correlationId,
      actorId,
    });
    return notif;
  }

  public markAllRead(recipientId: string): number {
    return this.store.markAllAsRead(recipientId);
  }

  public acknowledge(params: {
    notificationId: string;
    actionState: OperationalActionState;
    actorId: string;
    actorRole: UserRole;
    notes?: string;
    domainActionRef?: string;
  }) {
    return this.ackService.recordAction(params);
  }

  public getTelemetry(): CommunicationTelemetry {
    const telemetry = this.deliveryService.getTelemetry();
    telemetry.unreadCount = this.store.getAll().filter((n) => n.lifecycleState !== 'READ' && n.lifecycleState !== 'RESOLVED').length;
    return telemetry;
  }

  public resetFixtures(): void {
    this.store.reset();
    this.deliveryService.reset();
    this.deduplication.reset();
    this.audit.reset();
    this.ackService.reset();
  }
}

export const sharedCommunicationOrchestrator = new CommunicationOrchestrator();
