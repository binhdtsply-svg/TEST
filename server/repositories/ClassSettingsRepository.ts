import { DatabaseSync } from 'node:sqlite';
import { getDatabase } from '../db/database';
import { tenantRepository } from './TenantRepository';

export interface ClassSettingsRecord {
  tenant_id: string;
  class_id: string;
  school_name: string;
  class_name: string;
  grade: string;
  stream: string;
  academic_year: string;
  semester: string;
  teacher_name: string;
  teacher_phone: string;
  teacher_email: string;
  slogan?: string | null;
  cover_image?: string | null;
  total_students: number;
  theme_json: string;
  subjects_json: string;
  interaction_settings_json?: string | null;
  google_integration_json?: string | null;
  zalo_settings_json?: string | null;
  ai_config_json?: string | null;
  school_year_timeline_json?: string | null;
  student_identity_mode?: 'IDENTIFIED' | 'ANONYMOUS' | null;
  raw_metadata?: string | null;
  created_at: string;
  updated_at: string;
}

export class ClassSettingsRepository {
  private static instance: ClassSettingsRepository;
  private db: DatabaseSync;

  private constructor() {
    this.db = getDatabase();
  }

  public static getInstance(): ClassSettingsRepository {
    if (!ClassSettingsRepository.instance) {
      ClassSettingsRepository.instance = new ClassSettingsRepository();
    }
    return ClassSettingsRepository.instance;
  }

  public getByTenantAndClass(tenantId: string, classId?: string): ClassSettingsRecord | null {
    if (classId) {
      const stmt = this.db.prepare(`
        SELECT * FROM class_settings
        WHERE tenant_id = ? AND class_id = ?
      `);
      const record = stmt.get(tenantId, classId);
      return (record as unknown as ClassSettingsRecord) || null;
    } else {
      const stmt = this.db.prepare(`
        SELECT * FROM class_settings
        WHERE tenant_id = ?
        ORDER BY updated_at DESC
        LIMIT 1
      `);
      const record = stmt.get(tenantId);
      return (record as unknown as ClassSettingsRecord) || null;
    }
  }

  public upsert(record: ClassSettingsRecord): ClassSettingsRecord {
    tenantRepository.ensureTenantExists(record.tenant_id, record.class_name, record.school_name);
    const stmt = this.db.prepare(`
      INSERT INTO class_settings (
        tenant_id, class_id, school_name, class_name, grade, stream,
        academic_year, semester, teacher_name, teacher_phone, teacher_email,
        slogan, cover_image, total_students, theme_json, subjects_json,
        interaction_settings_json, google_integration_json, zalo_settings_json,
        ai_config_json, school_year_timeline_json, student_identity_mode, raw_metadata,
        created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?
      )
      ON CONFLICT(tenant_id, class_id) DO UPDATE SET
        school_name = excluded.school_name,
        class_name = excluded.class_name,
        grade = excluded.grade,
        stream = excluded.stream,
        academic_year = excluded.academic_year,
        semester = excluded.semester,
        teacher_name = excluded.teacher_name,
        teacher_phone = excluded.teacher_phone,
        teacher_email = excluded.teacher_email,
        slogan = excluded.slogan,
        cover_image = excluded.cover_image,
        total_students = excluded.total_students,
        theme_json = excluded.theme_json,
        subjects_json = excluded.subjects_json,
        interaction_settings_json = excluded.interaction_settings_json,
        google_integration_json = excluded.google_integration_json,
        zalo_settings_json = excluded.zalo_settings_json,
        ai_config_json = excluded.ai_config_json,
        school_year_timeline_json = excluded.school_year_timeline_json,
        student_identity_mode = excluded.student_identity_mode,
        raw_metadata = excluded.raw_metadata,
        updated_at = excluded.updated_at
    `);

    stmt.run(
      record.tenant_id,
      record.class_id,
      record.school_name,
      record.class_name,
      record.grade,
      record.stream,
      record.academic_year,
      record.semester || 'HK1',
      record.teacher_name,
      record.teacher_phone,
      record.teacher_email,
      record.slogan || null,
      record.cover_image || null,
      record.total_students || 0,
      record.theme_json || '{}',
      record.subjects_json || '[]',
      record.interaction_settings_json || null,
      record.google_integration_json || null,
      record.zalo_settings_json || null,
      record.ai_config_json || null,
      record.school_year_timeline_json || null,
      record.student_identity_mode || 'IDENTIFIED',
      record.raw_metadata || null,
      record.created_at || new Date().toISOString(),
      record.updated_at || new Date().toISOString()
    );

    return this.getByTenantAndClass(record.tenant_id, record.class_id)!;
  }

  public update(tenantId: string, classId: string, updates: Partial<ClassSettingsRecord>): ClassSettingsRecord | null {
    const existing = this.getByTenantAndClass(tenantId, classId);
    if (!existing) return null;

    const merged: ClassSettingsRecord = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString()
    };

    return this.upsert(merged);
  }
}

export const classSettingsRepository = ClassSettingsRepository.getInstance();
