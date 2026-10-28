import { getDatabase } from '../db/database';

export interface NotificationRow {
  id: string;
  tenant_id: string;
  user_id: string;
  role: string;
  type: string;
  title: string;
  message: string;
  link_to?: string | null;
  is_read: number;
  created_at: string;
}

export class NotificationRepository {
  private db = getDatabase();

  getForUser(tenantId: string, userId: string): NotificationRow[] {
    const stmt = this.db.prepare('SELECT * FROM notifications WHERE tenant_id = ? AND user_id = ? ORDER BY created_at DESC');
    return stmt.all(tenantId, userId) as any[];
  }

  create(record: NotificationRow): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO notifications (
        id, tenant_id, user_id, role, type, title, message, link_to, is_read, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      record.id,
      record.tenant_id,
      record.user_id,
      record.role,
      record.type,
      record.title,
      record.message,
      record.link_to || null,
      record.is_read ? 1 : 0,
      record.created_at
    );
  }

  markAsRead(tenantId: string, userId: string, id: string): void {
    const stmt = this.db.prepare('UPDATE notifications SET is_read = 1 WHERE tenant_id = ? AND user_id = ? AND id = ?');
    stmt.run(tenantId, userId, id);
  }

  markAllAsRead(tenantId: string, userId: string): void {
    const stmt = this.db.prepare('UPDATE notifications SET is_read = 1 WHERE tenant_id = ? AND user_id = ?');
    stmt.run(tenantId, userId);
  }
}

export const notificationRepository = new NotificationRepository();
