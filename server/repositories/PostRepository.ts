import { getDatabase } from '../db/database';
import { persistenceSyncService } from '../services/PersistenceSyncService';

export interface PostRow {
  id: string;
  tenant_id: string;
  author_id: string;
  author_name: string;
  author_role: string;
  author_avatar?: string | null;
  category: string;
  title: string;
  content: string;
  images_json: string;
  attachments_json: string;
  pinned_to_overview: number;
  parent_visible: number;
  reactions_json: string;
  comments_json: string;
  status?: string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export class PostRepository {
  private db = getDatabase();

  getPosts(tenantId: string, parentOnly: boolean = false): PostRow[] {
    if (parentOnly) {
      const stmt = this.db.prepare(
        'SELECT * FROM posts WHERE tenant_id = ? AND parent_visible = 1 ORDER BY pinned_to_overview DESC, rowid DESC'
      );
      return stmt.all(tenantId) as any[];
    }
    const stmt = this.db.prepare(
      'SELECT * FROM posts WHERE tenant_id = ? ORDER BY pinned_to_overview DESC, rowid DESC'
    );
    return stmt.all(tenantId) as any[];
  }

  getPostById(tenantId: string, postId: string): PostRow | null {
    const stmt = this.db.prepare('SELECT * FROM posts WHERE tenant_id = ? AND id = ?');
    const row = stmt.get(tenantId, postId) as any;
    return row || null;
  }

  findAnyPostById(postId: string): PostRow | null {
    const stmt = this.db.prepare('SELECT * FROM posts WHERE id = ?');
    const row = stmt.get(postId) as any;
    return row || null;
  }

  upsertPost(record: PostRow): PostRow {
    const postStatus = record.status || 'approved';
    const stmt = this.db.prepare(`
      INSERT INTO posts (
        id, tenant_id, author_id, author_name, author_role, author_avatar,
        category, title, content, images_json, attachments_json,
        pinned_to_overview, parent_visible, reactions_json, comments_json,
        status, reviewed_by, reviewed_at,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(tenant_id, id) DO UPDATE SET
        category = excluded.category,
        title = excluded.title,
        content = excluded.content,
        images_json = excluded.images_json,
        attachments_json = excluded.attachments_json,
        pinned_to_overview = excluded.pinned_to_overview,
        parent_visible = excluded.parent_visible,
        reactions_json = excluded.reactions_json,
        comments_json = excluded.comments_json,
        status = excluded.status,
        reviewed_by = excluded.reviewed_by,
        reviewed_at = excluded.reviewed_at,
        updated_at = excluded.updated_at
    `);

    stmt.run(
      record.id,
      record.tenant_id,
      record.author_id,
      record.author_name,
      record.author_role,
      record.author_avatar || null,
      record.category,
      record.title,
      record.content,
      record.images_json,
      record.attachments_json,
      record.pinned_to_overview,
      record.parent_visible,
      record.reactions_json,
      record.comments_json,
      postStatus,
      record.reviewed_by || null,
      record.reviewed_at || null,
      record.created_at,
      record.updated_at
    );

    try {
      persistenceSyncService.scheduleDebouncedFlush(1000);
    } catch {}

    return record;
  }

  updatePostStatus(tenantId: string, postId: string, status: string, reviewerName?: string): boolean {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      UPDATE posts
      SET status = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ?
      WHERE tenant_id = ? AND id = ?
    `);
    const result = stmt.run(status, reviewerName || null, now, now, tenantId, postId);
    if (result.changes > 0) {
      try {
        persistenceSyncService.scheduleDebouncedFlush(1000);
      } catch {}
    }
    return result.changes > 0;
  }

  deletePost(tenantId: string, postId: string): boolean {
    const stmt = this.db.prepare('DELETE FROM posts WHERE tenant_id = ? AND id = ?');
    const result = stmt.run(tenantId, postId);
    if (result.changes > 0) {
      try {
        persistenceSyncService.scheduleDebouncedFlush(1000);
      } catch {}
    }
    return result.changes > 0;
  }
}

export const postRepository = new PostRepository();
