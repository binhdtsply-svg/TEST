import { getDatabase } from '../db/database';

export interface AuditLogRecord {
  id: string;
  actor_user_id: string;
  actor_role: string;
  actor_tenant_id?: string | null;
  action: string;
  target_type: string;
  target_id: string;
  details?: string | null;
  created_at: string;
}

export class AuditLogRepository {
  private db = getDatabase();

  log(params: {
    actorUserId: string;
    actorRole: string;
    actorTenantId?: string;
    action: string;
    targetType: string;
    targetId: string;
    details?: string | Record<string, any>;
  }): void {
    const id = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    let detailsStr: string | null = null;
    if (params.details) {
      detailsStr = typeof params.details === 'object' ? JSON.stringify(params.details) : String(params.details);
    }

    const stmt = this.db.prepare(`
      INSERT INTO audit_logs (
        id, actor_user_id, actor_role, actor_tenant_id, action, target_type, target_id, details, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      params.actorUserId,
      params.actorRole,
      params.actorTenantId || null,
      params.action,
      params.targetType,
      params.targetId,
      detailsStr,
      new Date().toISOString()
    );
  }

  createLog(params: {
    actorUserId: string;
    actorRole: string;
    actorTenantId?: string;
    action: string;
    targetType: string;
    targetId: string;
    details?: string | Record<string, any>;
  }): void {
    this.log(params);
  }

  getByTenant(tenantId: string, limit = 100): AuditLogRecord[] {
    const stmt = this.db.prepare('SELECT * FROM audit_logs WHERE actor_tenant_id = ? ORDER BY created_at DESC LIMIT ?');
    return stmt.all(tenantId, limit) as any[];
  }

  getAll(limit = 100): AuditLogRecord[] {
    const stmt = this.db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?');
    return stmt.all(limit) as any[];
  }

  countAll(): number {
    const stmt = this.db.prepare('SELECT COUNT(*) as cnt FROM audit_logs');
    const res = stmt.get() as { cnt: number };
    return res ? res.cnt : 0;
  }
}

export const auditLogRepository = new AuditLogRepository();
