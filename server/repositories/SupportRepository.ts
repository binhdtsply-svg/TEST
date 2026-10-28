import { getDatabase } from '../db/database';
import {
  SupportTicket,
  SupportTicketHistoryItem,
  UserFeedback,
  SupportFeedbackStats,
  SupportTicketCategory,
  SupportTicketPriority,
  SupportTicketStatus,
  FeedbackType,
  FeedbackCategory,
  FeedbackStatus,
  UserRole
} from '../../src/types';

export interface CreateTicketDTO {
  title: string;
  description: string;
  category: SupportTicketCategory;
  priority?: SupportTicketPriority;
  userId: string;
  userRole: UserRole;
  userName: string;
  userEmail?: string;
  userPhone?: string;
  tenantId?: string;
  relatedModule?: string;
}

export interface CreateFeedbackDTO {
  type: FeedbackType;
  rating?: number;
  category: FeedbackCategory;
  relatedModule?: string;
  title?: string;
  content: string;
  isAnonymous: boolean;
  userId?: string;
  userRole: UserRole;
  userName?: string;
  userEmail?: string;
  tenantId?: string;
}

export class SupportRepository {
  private get db() {
    return getDatabase();
  }

  // --------------------------------------------------------------------------
  // 1. SUPPORT TICKETS
  // --------------------------------------------------------------------------

  createTicket(dto: CreateTicketDTO): SupportTicket {
    const id = `ticket-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randDigits = Math.floor(100 + Math.random() * 900);
    const ticketCode = `SUP-${dateStr}-${randDigits}`;
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO support_tickets (
        id, ticket_code, title, description, category, priority, status,
        user_id, user_role, user_name, user_email, user_phone, tenant_id,
        related_module, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?
      )
    `);

    stmt.run(
      id,
      ticketCode,
      dto.title.trim(),
      dto.description.trim(),
      dto.category || 'OTHER',
      dto.priority || 'MEDIUM',
      'NEW',
      dto.userId,
      dto.userRole,
      dto.userName.trim(),
      dto.userEmail?.trim() || null,
      dto.userPhone?.trim() || null,
      dto.tenantId || null,
      dto.relatedModule || null,
      now,
      now
    );

    // Initial History Item
    this.addTicketHistory({
      ticketId: id,
      actorId: dto.userId,
      actorName: dto.userName,
      actorRole: dto.userRole,
      action: 'CREATE',
      newStatus: 'NEW',
      message: 'Người dùng gửi yêu cầu hỗ trợ ban đầu'
    });

    return this.getTicketById(id)!;
  }

  getTicketById(id: string): SupportTicket | null {
    const stmt = this.db.prepare('SELECT * FROM support_tickets WHERE id = ? OR ticket_code = ?');
    const row = stmt.get(id, id) as any;
    if (!row) return null;

    const history = this.getTicketHistory(row.id);

    return {
      id: row.id,
      ticketCode: row.ticket_code,
      title: row.title,
      description: row.description,
      category: row.category,
      priority: row.priority,
      status: row.status,
      userId: row.user_id,
      userRole: row.user_role,
      userName: row.user_name,
      userEmail: row.user_email || undefined,
      userPhone: row.user_phone || undefined,
      tenantId: row.tenant_id || undefined,
      relatedModule: row.related_module || undefined,
      adminResponse: row.admin_response || undefined,
      adminNotes: row.admin_notes || undefined,
      assignedAdminId: row.assigned_admin_id || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      resolvedAt: row.resolved_at || undefined,
      history
    };
  }

  getTicketsByUser(userId: string): SupportTicket[] {
    const stmt = this.db.prepare(`
      SELECT * FROM support_tickets 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `);
    const rows = stmt.all(userId) as any[];
    return rows.map(r => this.mapTicketRow(r));
  }

  getAllTickets(filters?: {
    status?: string;
    category?: string;
    priority?: string;
    search?: string;
  }): SupportTicket[] {
    let sql = 'SELECT * FROM support_tickets WHERE 1=1';
    const params: any[] = [];

    if (filters?.status && filters.status !== 'ALL') {
      sql += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters?.category && filters.category !== 'ALL') {
      sql += ' AND category = ?';
      params.push(filters.category);
    }
    if (filters?.priority && filters.priority !== 'ALL') {
      sql += ' AND priority = ?';
      params.push(filters.priority);
    }
    if (filters?.search && filters.search.trim()) {
      const q = `%${filters.search.trim()}%`;
      sql += ' AND (ticket_code LIKE ? OR title LIKE ? OR description LIKE ? OR user_name LIKE ? OR user_email LIKE ?)';
      params.push(q, q, q, q, q);
    }

    sql += ' ORDER BY created_at DESC';

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as any[];
    return rows.map(r => this.mapTicketRow(r));
  }

  updateTicketStatus(params: {
    ticketId: string;
    status: SupportTicketStatus;
    actorId: string;
    actorName: string;
    actorRole: string;
    adminResponse?: string;
    adminNotes?: string;
  }): SupportTicket | null {
    const existing = this.getTicketById(params.ticketId);
    if (!existing) return null;

    const now = new Date().toISOString();
    const isResolved = params.status === 'RESOLVED' || params.status === 'CLOSED';
    const resolvedAt = isResolved ? (existing.resolvedAt || now) : null;

    const newResponse = params.adminResponse !== undefined ? params.adminResponse : existing.adminResponse;
    const newNotes = params.adminNotes !== undefined ? params.adminNotes : existing.adminNotes;

    const stmt = this.db.prepare(`
      UPDATE support_tickets SET
        status = ?,
        admin_response = ?,
        admin_notes = ?,
        assigned_admin_id = ?,
        updated_at = ?,
        resolved_at = ?
      WHERE id = ?
    `);

    stmt.run(
      params.status,
      newResponse || null,
      newNotes || null,
      params.actorId,
      now,
      resolvedAt,
      existing.id
    );

    let action: 'UPDATE_STATUS' | 'ADD_RESPONSE' | 'ADD_NOTE' | 'RESOLVE' | 'CLOSE' = 'UPDATE_STATUS';
    if (params.status === 'RESOLVED') action = 'RESOLVE';
    else if (params.status === 'CLOSED') action = 'CLOSE';
    else if (params.adminResponse && params.adminResponse !== existing.adminResponse) action = 'ADD_RESPONSE';
    else if (params.adminNotes && params.adminNotes !== existing.adminNotes) action = 'ADD_NOTE';

    this.addTicketHistory({
      ticketId: existing.id,
      actorId: params.actorId,
      actorName: params.actorName,
      actorRole: params.actorRole,
      action,
      oldStatus: existing.status,
      newStatus: params.status,
      message: params.adminResponse || params.adminNotes || `Cập nhật trạng thái thành ${params.status}`
    });

    return this.getTicketById(existing.id);
  }

  // --------------------------------------------------------------------------
  // 2. SUPPORT TICKET HISTORY
  // --------------------------------------------------------------------------

  private addTicketHistory(item: {
    ticketId: string;
    actorId: string;
    actorName: string;
    actorRole: string;
    action: 'CREATE' | 'UPDATE_STATUS' | 'ADD_RESPONSE' | 'ADD_NOTE' | 'RESOLVE' | 'CLOSE';
    oldStatus?: SupportTicketStatus;
    newStatus?: SupportTicketStatus;
    message?: string;
  }): void {
    const id = `hist-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO support_ticket_history (
        id, ticket_id, actor_id, actor_name, actor_role, action,
        old_status, new_status, message, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      item.ticketId,
      item.actorId,
      item.actorName,
      item.actorRole,
      item.action,
      item.oldStatus || null,
      item.newStatus || null,
      item.message || null,
      now
    );
  }

  getTicketHistory(ticketId: string): SupportTicketHistoryItem[] {
    const stmt = this.db.prepare(`
      SELECT * FROM support_ticket_history 
      WHERE ticket_id = ? 
      ORDER BY created_at ASC
    `);
    const rows = stmt.all(ticketId) as any[];
    return rows.map(r => ({
      id: r.id,
      ticketId: r.ticket_id,
      actorId: r.actor_id,
      actorName: r.actor_name,
      actorRole: r.actor_role,
      action: r.action,
      oldStatus: r.old_status || undefined,
      newStatus: r.new_status || undefined,
      message: r.message || undefined,
      createdAt: r.created_at
    }));
  }

  // --------------------------------------------------------------------------
  // 3. USER FEEDBACK & FEATURE SUGGESTIONS
  // --------------------------------------------------------------------------

  createFeedback(dto: CreateFeedbackDTO): UserFeedback {
    const id = `fb-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO user_feedbacks (
        id, type, rating, category, related_module, title, content,
        is_anonymous, user_id, user_role, user_name, user_email, tenant_id,
        status, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?
      )
    `);

    stmt.run(
      id,
      dto.type,
      dto.rating || null,
      dto.category || 'OTHER',
      dto.relatedModule || null,
      dto.title?.trim() || null,
      dto.content.trim(),
      dto.isAnonymous ? 1 : 0,
      dto.userId || null,
      dto.userRole,
      dto.isAnonymous ? null : (dto.userName?.trim() || null),
      dto.isAnonymous ? null : (dto.userEmail?.trim() || null),
      dto.tenantId || null,
      'NEW',
      now,
      now
    );

    return this.getFeedbackById(id)!;
  }

  getFeedbackById(id: string): UserFeedback | null {
    const stmt = this.db.prepare('SELECT * FROM user_feedbacks WHERE id = ?');
    const row = stmt.get(id) as any;
    if (!row) return null;
    return this.mapFeedbackRow(row);
  }

  getFeedbacksByUser(userId: string): UserFeedback[] {
    const stmt = this.db.prepare(`
      SELECT * FROM user_feedbacks 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `);
    const rows = stmt.all(userId) as any[];
    return rows.map(r => this.mapFeedbackRow(r));
  }

  getAllFeedbacks(filters?: {
    type?: string;
    category?: string;
    status?: string;
    module?: string;
    search?: string;
  }): UserFeedback[] {
    let sql = 'SELECT * FROM user_feedbacks WHERE 1=1';
    const params: any[] = [];

    if (filters?.type && filters.type !== 'ALL') {
      sql += ' AND type = ?';
      params.push(filters.type);
    }
    if (filters?.category && filters.category !== 'ALL') {
      sql += ' AND category = ?';
      params.push(filters.category);
    }
    if (filters?.status && filters.status !== 'ALL') {
      sql += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters?.module && filters.module !== 'ALL') {
      sql += ' AND related_module = ?';
      params.push(filters.module);
    }
    if (filters?.search && filters.search.trim()) {
      const q = `%${filters.search.trim()}%`;
      sql += ' AND (title LIKE ? OR content LIKE ? OR user_name LIKE ?)';
      params.push(q, q, q);
    }

    sql += ' ORDER BY created_at DESC';

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as any[];
    return rows.map(r => this.mapFeedbackRow(r));
  }

  updateFeedbackStatus(feedbackId: string, status: FeedbackStatus, adminNotes?: string): UserFeedback | null {
    const existing = this.getFeedbackById(feedbackId);
    if (!existing) return null;

    const now = new Date().toISOString();
    const newNotes = adminNotes !== undefined ? adminNotes : existing.adminNotes;

    const stmt = this.db.prepare(`
      UPDATE user_feedbacks SET
        status = ?,
        admin_notes = ?,
        updated_at = ?
      WHERE id = ?
    `);

    stmt.run(status, newNotes || null, now, feedbackId);
    return this.getFeedbackById(feedbackId);
  }

  // --------------------------------------------------------------------------
  // 4. STATS & ANALYTICS (REAL DATABASE DATA)
  // --------------------------------------------------------------------------

  getStats(): SupportFeedbackStats {
    // Ticket metrics
    const ticketRows = this.db.prepare('SELECT status, COUNT(*) as count FROM support_tickets GROUP BY status').all() as any[];
    const ticketsMap: Record<string, number> = {};
    let totalTickets = 0;
    for (const r of ticketRows) {
      ticketsMap[r.status] = r.count;
      totalTickets += r.count;
    }

    // Feedback metrics
    const feedbackRows = this.db.prepare('SELECT type, rating, category, related_module, user_role, status FROM user_feedbacks').all() as any[];
    
    let ratingsCount = 0;
    let sumRating = 0;
    let bugsCount = 0;
    let suggestionsCount = 0;
    const byRating: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const byRole: Record<string, number> = {};
    const byModule: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    for (const f of feedbackRows) {
      if (f.type === 'RATING_FEEDBACK' && f.rating) {
        ratingsCount++;
        sumRating += f.rating;
        const star = Math.min(5, Math.max(1, Math.round(f.rating)));
        byRating[star] = (byRating[star] || 0) + 1;
      }
      if (f.type === 'BUG_REPORT') bugsCount++;
      if (f.type === 'FEATURE_SUGGESTION') suggestionsCount++;

      const role = f.user_role || 'OTHER';
      byRole[role] = (byRole[role] || 0) + 1;

      const mod = f.related_module || 'Chung';
      byModule[mod] = (byModule[mod] || 0) + 1;

      const st = f.status || 'NEW';
      byStatus[st] = (byStatus[st] || 0) + 1;
    }

    const averageRating = ratingsCount > 0 ? Math.round((sumRating / ratingsCount) * 10) / 10 : 0;

    return {
      tickets: {
        total: totalTickets,
        new: ticketsMap['NEW'] || 0,
        processing: ticketsMap['PROCESSING'] || 0,
        responded: ticketsMap['RESPONDED'] || 0,
        resolved: ticketsMap['RESOLVED'] || 0,
        closed: ticketsMap['CLOSED'] || 0
      },
      feedbacks: {
        total: feedbackRows.length,
        ratingsCount,
        averageRating,
        bugsCount,
        suggestionsCount,
        byRating,
        byRole,
        byModule,
        byStatus
      }
    };
  }

  // --------------------------------------------------------------------------
  // MAPPERS
  // --------------------------------------------------------------------------

  private mapTicketRow(row: any): SupportTicket {
    return {
      id: row.id,
      ticketCode: row.ticket_code,
      title: row.title,
      description: row.description,
      category: row.category,
      priority: row.priority,
      status: row.status,
      userId: row.user_id,
      userRole: row.user_role,
      userName: row.user_name,
      userEmail: row.user_email || undefined,
      userPhone: row.user_phone || undefined,
      tenantId: row.tenant_id || undefined,
      relatedModule: row.related_module || undefined,
      adminResponse: row.admin_response || undefined,
      adminNotes: row.admin_notes || undefined,
      assignedAdminId: row.assigned_admin_id || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      resolvedAt: row.resolved_at || undefined
    };
  }

  private mapFeedbackRow(row: any): UserFeedback {
    const isAnonymous = Boolean(row.is_anonymous);
    return {
      id: row.id,
      type: row.type,
      rating: row.rating ? Number(row.rating) : undefined,
      category: row.category,
      relatedModule: row.related_module || undefined,
      title: row.title || undefined,
      content: row.content,
      isAnonymous,
      userId: row.user_id || undefined,
      userRole: row.user_role,
      userName: isAnonymous ? 'Người dùng Ẩn danh' : (row.user_name || undefined),
      userEmail: isAnonymous ? undefined : (row.user_email || undefined),
      tenantId: row.tenant_id || undefined,
      status: row.status,
      adminNotes: row.admin_notes || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

export const supportRepository = new SupportRepository();
