import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import { getDatabase } from '../db/database';
import { tenantRepository } from './TenantRepository';

export interface StudentRecord {
  id: string;
  tenant_id: string;
  class_id: string;
  code: string;
  full_name: string;
  gender: 'Nam' | 'Nữ';
  dob: string;
  group_num: number;
  officer_role?: string | null;
  avatar?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  father_name?: string | null;
  father_phone?: string | null;
  father_job?: string | null;
  mother_name?: string | null;
  mother_phone?: string | null;
  mother_job?: string | null;
  health_notes?: string | null;
  talents?: string | null;
  private_teacher_notes?: string | null;
  needs_special_attention: number;
  attention_categories?: string | null; // JSON array string
  attention_note?: string | null;
  support_measure?: string | null;
  attention_status?: string | null;
  attention_started_at?: string | null;
  attention_updated_at?: string | null;
  attention_updated_by?: string | null;
  anonymous_code?: string | null;
  status: string;
  raw_metadata?: string | null; // JSON string
  created_at: string;
  updated_at: string;
}

export class StudentRepository {
  private static instance: StudentRepository;
  private db: DatabaseSync;

  private constructor() {
    this.db = getDatabase();
  }

  public static getInstance(): StudentRepository {
    if (!StudentRepository.instance) {
      StudentRepository.instance = new StudentRepository();
    }
    return StudentRepository.instance;
  }

  public generateAnonymousCode(tenantId: string): string {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    for (let attempts = 0; attempts < 50; attempts++) {
      let code = 'ANON-';
      const randomBytes = crypto.randomBytes(5);
      for (let i = 0; i < 5; i++) {
        code += chars[randomBytes[i] % chars.length];
      }
      const existing = this.db.prepare(`
        SELECT id FROM students WHERE tenant_id = ? AND anonymous_code = ?
      `).get(tenantId, code);
      if (!existing) {
        return code;
      }
    }
    return `ANON-${Date.now().toString(36).toUpperCase()}`;
  }

  public getAllByTenant(tenantId: string): StudentRecord[] {
    const stmt = this.db.prepare(`
      SELECT * FROM students
      WHERE tenant_id = ?
      ORDER BY group_num ASC, code ASC, full_name ASC
    `);
    return stmt.all(tenantId) as unknown as StudentRecord[];
  }

  public getById(tenantId: string, studentId: string): StudentRecord | null {
    const stmt = this.db.prepare(`
      SELECT * FROM students
      WHERE tenant_id = ? AND id = ?
    `);
    const record = stmt.get(tenantId, studentId);
    return (record as unknown as StudentRecord) || null;
  }

  public getByCode(tenantId: string, code: string): StudentRecord | null {
    const stmt = this.db.prepare(`
      SELECT * FROM students
      WHERE tenant_id = ? AND code = ?
    `);
    const record = stmt.get(tenantId, code.trim());
    return (record as unknown as StudentRecord) || null;
  }

  public upsert(record: StudentRecord): StudentRecord {
    tenantRepository.ensureTenantExists(record.tenant_id);
    const anonCode = record.anonymous_code || this.generateAnonymousCode(record.tenant_id);

    const stmt = this.db.prepare(`
      INSERT INTO students (
        id, tenant_id, class_id, code, full_name, gender, dob, group_num,
        officer_role, avatar, phone, email, address,
        father_name, father_phone, father_job,
        mother_name, mother_phone, mother_job,
        health_notes, talents, private_teacher_notes,
        needs_special_attention, attention_categories, attention_note,
        support_measure, attention_status, attention_started_at,
        attention_updated_at, attention_updated_by, anonymous_code, status, raw_metadata,
        created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?
      )
      ON CONFLICT(tenant_id, id) DO UPDATE SET
        class_id = excluded.class_id,
        code = excluded.code,
        full_name = excluded.full_name,
        gender = excluded.gender,
        dob = excluded.dob,
        group_num = excluded.group_num,
        officer_role = excluded.officer_role,
        avatar = excluded.avatar,
        phone = excluded.phone,
        email = excluded.email,
        address = excluded.address,
        father_name = excluded.father_name,
        father_phone = excluded.father_phone,
        father_job = excluded.father_job,
        mother_name = excluded.mother_name,
        mother_phone = excluded.mother_phone,
        mother_job = excluded.mother_job,
        health_notes = excluded.health_notes,
        talents = excluded.talents,
        private_teacher_notes = excluded.private_teacher_notes,
        needs_special_attention = excluded.needs_special_attention,
        attention_categories = excluded.attention_categories,
        attention_note = excluded.attention_note,
        support_measure = excluded.support_measure,
        attention_status = excluded.attention_status,
        attention_started_at = excluded.attention_started_at,
        attention_updated_at = excluded.attention_updated_at,
        attention_updated_by = excluded.attention_updated_by,
        anonymous_code = COALESCE(excluded.anonymous_code, students.anonymous_code),
        status = excluded.status,
        raw_metadata = excluded.raw_metadata,
        updated_at = excluded.updated_at
    `);

    stmt.run(
      record.id,
      record.tenant_id,
      record.class_id || '',
      record.code,
      record.full_name,
      record.gender || 'Nam',
      record.dob || '',
      record.group_num || 1,
      record.officer_role || null,
      record.avatar || null,
      record.phone || null,
      record.email || null,
      record.address || null,
      record.father_name || null,
      record.father_phone || null,
      record.father_job || null,
      record.mother_name || null,
      record.mother_phone || null,
      record.mother_job || null,
      record.health_notes || null,
      record.talents || null,
      record.private_teacher_notes || null,
      record.needs_special_attention ? 1 : 0,
      record.attention_categories || null,
      record.attention_note || null,
      record.support_measure || null,
      record.attention_status || 'monitoring',
      record.attention_started_at || null,
      record.attention_updated_at || null,
      record.attention_updated_by || null,
      anonCode,
      record.status || 'Đang học',
      record.raw_metadata || null,
      record.created_at || new Date().toISOString(),
      record.updated_at || new Date().toISOString()
    );

    return this.getById(record.tenant_id, record.id)!;
  }

  public update(tenantId: string, studentId: string, updates: Partial<StudentRecord>): StudentRecord | null {
    const existing = this.getById(tenantId, studentId);
    if (!existing) return null;

    const merged: StudentRecord = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString()
    };

    return this.upsert(merged);
  }

  public updateOfficerRole(tenantId: string, studentId: string, officerRole: string | undefined): StudentRecord | null {
    const existing = this.getById(tenantId, studentId);
    if (!existing) return null;

    const stmt = this.db.prepare(`
      UPDATE students SET
        officer_role = ?,
        updated_at = ?
      WHERE tenant_id = ? AND id = ?
    `);
    stmt.run(officerRole || null, new Date().toISOString(), tenantId, studentId);
    return this.getById(tenantId, studentId);
  }

  public setStatus(tenantId: string, studentId: string, status: string): StudentRecord | null {
    const existing = this.getById(tenantId, studentId);
    if (!existing) return null;

    const stmt = this.db.prepare(`
      UPDATE students SET
        status = ?,
        updated_at = ?
      WHERE tenant_id = ? AND id = ?
    `);
    stmt.run(status, new Date().toISOString(), tenantId, studentId);
    return this.getById(tenantId, studentId);
  }

  public delete(tenantId: string, studentId: string): boolean {
    const stmt = this.db.prepare('DELETE FROM students WHERE tenant_id = ? AND id = ?');
    const res = stmt.run(tenantId, studentId);
    return res.changes > 0;
  }

  public findAnywhere(studentId: string): StudentRecord | null {
    const stmt = this.db.prepare('SELECT * FROM students WHERE id = ?');
    const record = stmt.get(studentId);
    return (record as unknown as StudentRecord) || null;
  }

  public countByTenant(tenantId: string): number {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as cnt FROM students
      WHERE tenant_id = ? AND status NOT IN ('ARCHIVED', 'Nghỉ học', 'Chuyển trường')
    `);
    const res = stmt.get(tenantId) as { cnt: number };
    return res ? res.cnt : 0;
  }

  public countAll(): number {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as cnt FROM students
    `);
    const res = stmt.get() as { cnt: number };
    return res ? res.cnt : 0;
  }
}

export const studentRepository = StudentRepository.getInstance();
