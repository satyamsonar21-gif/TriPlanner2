import type { AuditLog, UserRole } from '@/types/database.types';

export class AuditService {
  private static logs: AuditLog[] = [];

  public static async recordEvent(
    entityType: string,
    entityId: string,
    action: string,
    actorId: string,
    actorRole: UserRole,
    details: Record<string, unknown> = {}
  ): Promise<AuditLog> {
    const log: AuditLog = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      entity_type: entityType,
      entity_id: entityId,
      action,
      actor_id: actorId,
      actor_role: actorRole,
      details,
      timestamp: new Date().toISOString(),
    };

    const frozenLog = Object.freeze(structuredClone(log));
    this.logs.unshift(frozenLog);
    const metaEnv = (import.meta as unknown as { env?: { DEV?: boolean } }).env;
    if (metaEnv?.DEV) {
      console.info('[Audit Log Event]:', frozenLog);
    }
    return structuredClone(frozenLog);
  }

  public static async getLogsForEntity(entityId: string): Promise<AuditLog[]> {
    return this.logs
      .filter((l) => l.entity_id === entityId)
      .map((l) => structuredClone(l));
  }
}
