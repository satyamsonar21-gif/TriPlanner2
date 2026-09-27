import type {
  NotificationRecord,
  NotificationLifecycleState,
} from './types';

export class NotificationStore {
  private notifications = new Map<string, NotificationRecord>();
  private idempotencyKeys = new Set<string>();

  constructor(initialItems: NotificationRecord[] = []) {
    this.reset(initialItems);
  }

  public reset(initialItems: NotificationRecord[] = []): void {
    this.notifications.clear();
    this.idempotencyKeys.clear();
    for (const item of initialItems) {
      this.save(item);
    }
  }

  public hasIdempotencyKey(key: string): boolean {
    return this.idempotencyKeys.has(key);
  }

  public save(notification: NotificationRecord): NotificationRecord {
    const existing = this.notifications.get(notification.id);
    const updated: NotificationRecord = {
      ...notification,
      version: existing ? existing.version + 1 : 1,
      updatedAt: new Date().toISOString(),
    };
    this.notifications.set(notification.id, updated);
    if (notification.idempotencyKey) {
      this.idempotencyKeys.add(notification.idempotencyKey);
    }
    return updated;
  }

  public getById(id: string): NotificationRecord | undefined {
    return this.notifications.get(id);
  }

  public getByRecipient(
    recipientId: string,
    options?: { unreadOnly?: boolean; tenantId?: string }
  ): NotificationRecord[] {
    return Array.from(this.notifications.values())
      .filter((n) => {
        if (n.recipientId !== recipientId) return false;
        if (options?.tenantId && n.tenantId !== options.tenantId) return false;
        if (options?.unreadOnly && n.lifecycleState === 'READ') return false;
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getByTenant(tenantId: string): NotificationRecord[] {
    return Array.from(this.notifications.values())
      .filter((n) => n.tenantId === tenantId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getByJourney(journeyId: string): NotificationRecord[] {
    return Array.from(this.notifications.values())
      .filter((n) => n.journeyId === journeyId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getUnreadCount(recipientId: string): number {
    return Array.from(this.notifications.values()).filter(
      (n) => n.recipientId === recipientId && n.lifecycleState !== 'READ' && n.lifecycleState !== 'RESOLVED'
    ).length;
  }

  public markAsRead(id: string, actorId: string): NotificationRecord {
    const notif = this.notifications.get(id);
    if (!notif) {
      throw new Error(`Notification "${id}" not found.`);
    }

    // IDOR / Security check
    if (notif.recipientId !== actorId && !actorId.startsWith('usr_operator') && !actorId.startsWith('usr_admin')) {
      throw new Error(`Unauthorized: User "${actorId}" cannot mark notification "${id}" as read.`);
    }

    notif.lifecycleState = 'READ';
    notif.readAt = new Date().toISOString();
    return this.save(notif);
  }

  public markAllAsRead(recipientId: string): number {
    let count = 0;
    const now = new Date().toISOString();
    for (const notif of this.notifications.values()) {
      if (notif.recipientId === recipientId && notif.lifecycleState !== 'READ') {
        notif.lifecycleState = 'READ';
        notif.readAt = now;
        this.save(notif);
        count++;
      }
    }
    return count;
  }

  public acknowledge(id: string, actorId: string, notes?: string): NotificationRecord {
    const notif = this.notifications.get(id);
    if (!notif) {
      throw new Error(`Notification "${id}" not found.`);
    }

    notif.lifecycleState = 'ACKNOWLEDGED';
    notif.acknowledgedAt = new Date().toISOString();
    return this.save(notif);
  }

  public resolve(id: string, actorId: string, notes?: string): NotificationRecord {
    const notif = this.notifications.get(id);
    if (!notif) {
      throw new Error(`Notification "${id}" not found.`);
    }

    notif.lifecycleState = 'RESOLVED';
    notif.resolvedAt = new Date().toISOString();
    return this.save(notif);
  }

  /**
   * Retrieves high-priority items requiring attention for the Operator Attention Center
   */
  public getAttentionQueue(tenantId: string = 'org_goa_ops_01'): NotificationRecord[] {
    return Array.from(this.notifications.values())
      .filter((n) => {
        if (n.tenantId !== tenantId) return false;
        // High priority or action required items that are not resolved
        const isActionable =
          n.priority === 'CRITICAL' ||
          n.priority === 'HIGH' ||
          n.actionRequired ||
          n.category === 'DISRUPTION' ||
          n.category === 'SAFETY';
        return isActionable && n.lifecycleState !== 'RESOLVED';
      })
      .sort((a, b) => {
        // Critical first, then by date descending
        const priorityOrder: Record<string, number> = {
          CRITICAL: 4,
          HIGH: 3,
          NORMAL: 2,
          LOW: 1,
        };
        const priDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
        if (priDiff !== 0) return priDiff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }

  public getAll(): NotificationRecord[] {
    return Array.from(this.notifications.values());
  }
}

export const sharedNotificationStore = new NotificationStore();
