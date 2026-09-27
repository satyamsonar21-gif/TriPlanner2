import type { UserRole } from '@/types/database.types';
import type {
  NotificationAcknowledgement,
  OperationalActionState,
  NotificationRecord,
} from './types';
import { NotificationStore, sharedNotificationStore } from './notification-store';
import { CommunicationAuditService, sharedCommunicationAuditService } from './communication-audit';

export class AcknowledgementService {
  private acks = new Map<string, NotificationAcknowledgement[]>();
  private store: NotificationStore;
  private audit: CommunicationAuditService;

  constructor(
    store: NotificationStore = sharedNotificationStore,
    audit: CommunicationAuditService = sharedCommunicationAuditService
  ) {
    this.store = store;
    this.audit = audit;
  }

  /**
   * Records an explicit operational action / acknowledgement on a notification.
   * INVARIANT: READ != ACKNOWLEDGED.
   */
  public recordAction(params: {
    notificationId: string;
    actionState: OperationalActionState;
    actorId: string;
    actorRole: UserRole;
    notes?: string;
    domainActionRef?: string;
  }): { notification: NotificationRecord; acknowledgement: NotificationAcknowledgement } {
    const notif = this.store.getById(params.notificationId);
    if (!notif) {
      throw new Error(`Notification "${params.notificationId}" not found.`);
    }

    // Authorization check: Traveler can only acknowledge their own notification.
    // Operator/Admin can acknowledge on behalf of operations within tenant.
    if (
      params.actorRole === 'traveler' &&
      notif.recipientId !== params.actorId
    ) {
      throw new Error(
        `Unauthorized: Traveler "${params.actorId}" cannot acknowledge notification for "${notif.recipientId}".`
      );
    }

    const ack: NotificationAcknowledgement = {
      id: `ack_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      notificationId: notif.id,
      actionState: params.actionState,
      actorId: params.actorId,
      actorRole: params.actorRole,
      notes: params.notes,
      domainActionRef: params.domainActionRef,
      createdAt: new Date().toISOString(),
    };

    const existing = this.acks.get(notif.id) || [];
    existing.push(ack);
    this.acks.set(notif.id, existing);

    // Update notification state accordingly
    if (params.actionState === 'RESOLVED') {
      notif.lifecycleState = 'RESOLVED';
      notif.resolvedAt = ack.createdAt;
    } else {
      notif.lifecycleState = 'ACKNOWLEDGED';
      notif.acknowledgedAt = ack.createdAt;
    }
    const updatedNotif = this.store.save(notif);

    this.audit.record({
      tenantId: notif.tenantId,
      action: params.actionState === 'RESOLVED' ? 'NOTIFICATION_RESOLVED' : 'NOTIFICATION_ACKNOWLEDGED',
      notificationId: notif.id,
      correlationId: notif.correlationId,
      actorId: params.actorId,
      actorRole: params.actorRole,
      metadata: { actionState: params.actionState, notes: params.notes, domainActionRef: params.domainActionRef },
    });

    return {
      notification: updatedNotif,
      acknowledgement: ack,
    };
  }

  public getAcknowledgements(notificationId: string): NotificationAcknowledgement[] {
    return this.acks.get(notificationId) || [];
  }

  public reset(): void {
    this.acks.clear();
  }
}

export const sharedAcknowledgementService = new AcknowledgementService();
