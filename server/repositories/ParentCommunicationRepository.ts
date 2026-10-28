import { getDatabase } from '../db/database';

export interface ParentConversationRow {
  id: string;
  tenant_id: string;
  student_id: string;
  parent_name: string;
  parent_phone?: string | null;
  topic: string;
  messages_json: string;
  last_message_at: string;
  unread_teacher: number;
  unread_parent: number;
  created_at: string;
  updated_at: string;
}

export interface ParentAnnouncementRow {
  id: string;
  tenant_id: string;
  title: string;
  content: string;
  target_type: string;
  target_student_ids_json?: string | null;
  sent_at: string;
  sent_by: string;
  requires_acknowledgement: number;
  acknowledgements_json: string;
  created_at: string;
}

export class ParentCommunicationRepository {
  private db = getDatabase();

  getConversations(tenantId: string, studentId?: string): ParentConversationRow[] {
    if (studentId) {
      const stmt = this.db.prepare('SELECT * FROM parent_conversations WHERE tenant_id = ? AND student_id = ? ORDER BY last_message_at DESC');
      return stmt.all(tenantId, studentId) as any[];
    }
    const stmt = this.db.prepare('SELECT * FROM parent_conversations WHERE tenant_id = ? ORDER BY last_message_at DESC');
    return stmt.all(tenantId) as any[];
  }

  getConversationById(tenantId: string, conversationId: string): ParentConversationRow | null {
    const stmt = this.db.prepare('SELECT * FROM parent_conversations WHERE tenant_id = ? AND id = ?');
    const row = stmt.get(tenantId, conversationId) as any;
    return row || null;
  }

  upsertConversation(record: ParentConversationRow): ParentConversationRow {
    const stmt = this.db.prepare(`
      INSERT INTO parent_conversations (
        id, tenant_id, student_id, parent_name, parent_phone, topic, messages_json,
        last_message_at, unread_teacher, unread_parent, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(tenant_id, id) DO UPDATE SET
        messages_json = excluded.messages_json,
        last_message_at = excluded.last_message_at,
        unread_teacher = excluded.unread_teacher,
        unread_parent = excluded.unread_parent,
        updated_at = excluded.updated_at
    `);
    stmt.run(
      record.id,
      record.tenant_id,
      record.student_id,
      record.parent_name,
      record.parent_phone || null,
      record.topic,
      record.messages_json,
      record.last_message_at,
      record.unread_teacher,
      record.unread_parent,
      record.created_at,
      record.updated_at
    );
    return this.getConversationById(record.tenant_id, record.id)!;
  }

  getAnnouncements(tenantId: string): ParentAnnouncementRow[] {
    const stmt = this.db.prepare('SELECT * FROM parent_announcements WHERE tenant_id = ? ORDER BY sent_at DESC');
    return stmt.all(tenantId) as any[];
  }

  upsertAnnouncement(record: ParentAnnouncementRow): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO parent_announcements (
        id, tenant_id, title, content, target_type, target_student_ids_json,
        sent_at, sent_by, requires_acknowledgement, acknowledgements_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      record.id,
      record.tenant_id,
      record.title,
      record.content,
      record.target_type,
      record.target_student_ids_json || null,
      record.sent_at,
      record.sent_by,
      record.requires_acknowledgement,
      record.acknowledgements_json,
      record.created_at
    );
  }

  deleteAnnouncement(tenantId: string, id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM parent_announcements WHERE tenant_id = ? AND id = ?');
    const result = stmt.run(tenantId, id);
    return result.changes > 0;
  }
}

export const parentCommunicationRepository = new ParentCommunicationRepository();
