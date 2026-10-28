import { getDatabase } from '../db/database';

export interface TenantRecord {
  id: string;
  name: string;
  school_name: string;
  owner_id?: string;
  owner_email?: string;
  owner_name?: string;
  plan: string;
  status: 'ACTIVE' | 'LOCKED' | 'EXPIRED';
  created_at: string;
  updated_at: string;
}

export class TenantRepository {
  private db = getDatabase();

  getById(id: string): TenantRecord | null {
    const stmt = this.db.prepare('SELECT * FROM tenants WHERE id = ?');
    const row = stmt.get(id) as any;
    return row || null;
  }

  getAll(): TenantRecord[] {
    const stmt = this.db.prepare('SELECT * FROM tenants ORDER BY created_at ASC');
    return stmt.all() as any[];
  }

  ensureTenantExists(tenantId: string, name?: string, schoolName?: string): void {
    if (!tenantId || typeof tenantId !== 'string' || !tenantId.trim()) return;
    const cleanId = tenantId.trim();
    const existing = this.getById(cleanId);
    if (!existing) {
      this.createOrUpdate({
        id: cleanId,
        name: name || `Không Gian Chủ Nhiệm (${cleanId})`,
        school_name: schoolName || 'Trường THPT',
        plan: 'PRO',
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
  }

  createOrUpdate(tenant: TenantRecord): void {
    const existing = this.getById(tenant.id);
    if (existing) {
      const stmt = this.db.prepare(`
        UPDATE tenants SET 
          name = ?, school_name = ?, owner_id = ?, owner_email = ?, 
          owner_name = ?, plan = ?, status = ?, updated_at = ?
        WHERE id = ?
      `);
      stmt.run(
        tenant.name,
        tenant.school_name,
        tenant.owner_id || null,
        tenant.owner_email || null,
        tenant.owner_name || null,
        tenant.plan || 'STANDARD',
        tenant.status || 'ACTIVE',
        tenant.updated_at || new Date().toISOString(),
        tenant.id
      );
    } else {
      const stmt = this.db.prepare(`
        INSERT INTO tenants (
          id, name, school_name, owner_id, owner_email, owner_name, plan, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        tenant.id,
        tenant.name,
        tenant.school_name,
        tenant.owner_id || null,
        tenant.owner_email || null,
        tenant.owner_name || null,
        tenant.plan || 'STANDARD',
        tenant.status || 'ACTIVE',
        tenant.created_at || new Date().toISOString(),
        tenant.updated_at || new Date().toISOString()
      );
    }
  }

  getDeletionSummary(id: string) {
    const tenant = this.getById(id);
    if (!tenant) return null;

    let className = 'Chưa thiết lập';
    let academicYear = '2025-2026';
    let totalStudents = 0;
    let totalCredentials = 0;
    let teacherName = tenant.owner_name || 'Chưa phân công';
    let teacherEmail = tenant.owner_email || '';

    try {
      const classSetting = this.db.prepare('SELECT class_name, academic_year, teacher_name, teacher_email FROM class_settings WHERE tenant_id = ? LIMIT 1').get(id) as any;
      if (classSetting) {
        if (classSetting.class_name) className = classSetting.class_name;
        if (classSetting.academic_year) academicYear = classSetting.academic_year;
        if (classSetting.teacher_name) teacherName = classSetting.teacher_name;
        if (classSetting.teacher_email) teacherEmail = classSetting.teacher_email;
      }
    } catch {}

    try {
      const studentCountRow = this.db.prepare('SELECT COUNT(*) as count FROM students WHERE tenant_id = ?').get(id) as any;
      if (studentCountRow) totalStudents = studentCountRow.count || 0;
    } catch {}

    try {
      const credCountRow = this.db.prepare('SELECT COUNT(*) as count FROM credentials WHERE tenant_id = ?').get(id) as any;
      if (credCountRow) totalCredentials = credCountRow.count || 0;
    } catch {}

    try {
      const teacherRow = this.db.prepare('SELECT full_name, email FROM teacher_accounts WHERE tenant_id = ? LIMIT 1').get(id) as any;
      if (teacherRow) {
        if (teacherRow.full_name) teacherName = teacherRow.full_name;
        if (teacherRow.email) teacherEmail = teacherRow.email;
      }
    } catch {}

    return {
      id: tenant.id,
      name: tenant.name,
      schoolName: tenant.school_name,
      className,
      academicYear,
      teacherName,
      teacherEmail,
      totalStudents,
      totalCredentials,
      status: tenant.status,
      plan: tenant.plan,
      createdAt: tenant.created_at
    };
  }

  deleteTenantPermanently(tenantId: string): { success: boolean; message: string; deletedTenantId: string } {
    if (!tenantId || typeof tenantId !== 'string' || !tenantId.trim()) {
      throw new Error('Mã định danh không gian lớp không hợp lệ.');
    }

    const cleanId = tenantId.trim();

    // CRITICAL PROTECTION: Never allow deletion of platform-root or system root
    if (cleanId === 'platform-root' || cleanId === 'default') {
      throw new Error('Không thể xóa không gian gốc hệ thống hoặc không gian mặc định.');
    }

    const existing = this.getById(cleanId);
    if (!existing) {
      throw new Error(`Không tìm thấy không gian lớp có ID: ${cleanId}`);
    }

    // ATOMIC TRANSACTION: Delete all data strictly scoped to this tenant_id
    this.db.exec('BEGIN TRANSACTION;');
    try {
      // 1. Clear active sessions
      this.db.prepare('DELETE FROM auth_sessions WHERE tenant_id = ?').run(cleanId);

      // 2. Delete credentials & credential audits
      this.db.prepare('DELETE FROM credentials WHERE tenant_id = ?').run(cleanId);
      this.db.prepare('DELETE FROM credential_audits WHERE tenant_id = ?').run(cleanId);

      // 3. Delete teacher accounts belonging to this tenant
      this.db.prepare('DELETE FROM teacher_accounts WHERE tenant_id = ?').run(cleanId);

      // 4. Delete students
      this.db.prepare('DELETE FROM students WHERE tenant_id = ?').run(cleanId);

      // 5. Delete class settings
      this.db.prepare('DELETE FROM class_settings WHERE tenant_id = ?').run(cleanId);

      // 6. Delete backups
      this.db.prepare('DELETE FROM server_backups WHERE tenant_id = ?').run(cleanId);

      // 7. Delete survey sync proposals, responses, versions, templates
      this.db.prepare('DELETE FROM survey_sync_proposals WHERE tenant_id = ?').run(cleanId);
      this.db.prepare('DELETE FROM survey_responses WHERE tenant_id = ?').run(cleanId);
      this.db.prepare('DELETE FROM survey_template_versions WHERE tenant_id = ?').run(cleanId);
      this.db.prepare('DELETE FROM survey_templates WHERE tenant_id = ?').run(cleanId);

      // 8. Delete academic records and snapshots
      this.db.prepare('DELETE FROM academic_records WHERE tenant_id = ?').run(cleanId);
      this.db.prepare('DELETE FROM published_academic_snapshots WHERE tenant_id = ?').run(cleanId);

      // 9. Delete timetables, exam schedules, assignments
      this.db.prepare('DELETE FROM timetables WHERE tenant_id = ?').run(cleanId);
      this.db.prepare('DELETE FROM exam_schedules WHERE tenant_id = ?').run(cleanId);
      this.db.prepare('DELETE FROM assignments WHERE tenant_id = ?').run(cleanId);

      // 10. Delete training transactions, rules, laurels, attendance
      this.db.prepare('DELETE FROM training_transactions WHERE tenant_id = ?').run(cleanId);
      this.db.prepare('DELETE FROM training_rule_configs WHERE tenant_id = ?').run(cleanId);
      this.db.prepare('DELETE FROM laurel_trees WHERE tenant_id = ?').run(cleanId);
      this.db.prepare('DELETE FROM attendance_records WHERE tenant_id = ?').run(cleanId);

      // 11. Delete graduation choices & career profiles
      this.db.prepare('DELETE FROM graduation_choices WHERE tenant_id = ?').run(cleanId);
      this.db.prepare('DELETE FROM career_profiles WHERE tenant_id = ?').run(cleanId);

      // 12. Delete parent conversations, announcements, notifications, posts
      this.db.prepare('DELETE FROM parent_conversations WHERE tenant_id = ?').run(cleanId);
      this.db.prepare('DELETE FROM parent_announcements WHERE tenant_id = ?').run(cleanId);
      this.db.prepare('DELETE FROM notifications WHERE tenant_id = ?').run(cleanId);
      this.db.prepare('DELETE FROM posts WHERE tenant_id = ?').run(cleanId);

      // 13. Delete teacher personal tasks
      this.db.prepare('DELETE FROM teacher_personal_tasks WHERE tenant_id = ?').run(cleanId);

      // 14. Unlink support tickets & feedbacks
      try {
        this.db.prepare('UPDATE support_tickets SET tenant_id = NULL WHERE tenant_id = ?').run(cleanId);
        this.db.prepare('UPDATE user_feedbacks SET tenant_id = NULL WHERE tenant_id = ?').run(cleanId);
      } catch {}

      // 15. Finally, delete the tenant record
      this.db.prepare('DELETE FROM tenants WHERE id = ?').run(cleanId);

      this.db.exec('COMMIT;');

      return {
        success: true,
        message: `Đã xóa vĩnh viễn không gian lớp ${existing.name} (${cleanId}) và giải phóng toàn bộ dữ liệu lưu trữ thành công.`,
        deletedTenantId: cleanId
      };
    } catch (err: any) {
      try {
        this.db.exec('ROLLBACK;');
      } catch {}
      console.error(`[TenantRepository] Failed to delete tenant ${cleanId}:`, err);
      throw new Error(`Không thể xóa không gian lớp. Dữ liệu chưa bị thay đổi. Lỗi: ${err.message || 'Lỗi cơ sở dữ liệu'}`);
    }
  }
}

export const tenantRepository = new TenantRepository();
