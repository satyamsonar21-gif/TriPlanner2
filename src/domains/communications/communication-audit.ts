export type CommunicationAuditAction =
  | 'COMMUNICATION_INGESTED'
  | 'RECIPIENTS_RESOLVED'
  | 'NOTIFICATION_CREATED'
  | 'DELIVERY_ATTEMPTED'
  | 'DELIVERY_SUCCEEDED'
  | 'DELIVERY_FAILED'
  | 'RETRY_SCHEDULED'
  | 'NOTIFICATION_READ'
  | 'NOTIFICATION_ACKNOWLEDGED'
  | 'NOTIFICATION_RESOLVED'
  | 'DEAD_LETTERED';

export interface CommunicationAuditEntry {
  id: string;
  tenantId: string;
  action: CommunicationAuditAction;
  eventId?: string;
  notificationId?: string;
  correlationId?: string;
  actorId?: string;
  actorRole?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export class CommunicationAuditService {
  private logs: CommunicationAuditEntry[] = [];

  public record(params: {
    tenantId?: string;
    action: CommunicationAuditAction;
    eventId?: string;
    notificationId?: string;
    correlationId?: string;
    actorId?: string;
    actorRole?: string;
    metadata?: Record<string, unknown>;
  }): CommunicationAuditEntry {
    const entry: CommunicationAuditEntry = {
      id: `cal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tenantId: params.tenantId || 'org_goa_ops_01',
      action: params.action,
      eventId: params.eventId,
      notificationId: params.notificationId,
      correlationId: params.correlationId,
      actorId: params.actorId,
      actorRole: params.actorRole,
      metadata: params.metadata || {},
      timestamp: new Date().toISOString(),
    };

    this.logs.push(entry);
    return entry;
  }

  public getByNotificationId(notificationId: string): CommunicationAuditEntry[] {
    return this.logs.filter((l) => l.notificationId === notificationId);
  }

  public getByEventId(eventId: string): CommunicationAuditEntry[] {
    return this.logs.filter((l) => l.eventId === eventId);
  }

  public getByCorrelationId(correlationId: string): CommunicationAuditEntry[] {
    return this.logs.filter((l) => l.correlationId === correlationId);
  }

  public getAll(): CommunicationAuditEntry[] {
    return [...this.logs];
  }

  public reset(): void {
    this.logs = [];
  }
}

export const sharedCommunicationAuditService = new CommunicationAuditService();
