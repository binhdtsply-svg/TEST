import { getDatabase } from '../db/database';
import { tenantRepository } from './TenantRepository';

export interface SurveyTemplateRecord {
  id: string;
  tenant_id: string;
  title: string;
  description?: string | null;
  target_type: string;
  academic_year: string;
  semester: string;
  current_version: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  is_default: number;
  sections_json: string;
  created_at: string;
  updated_at: string;
  class_id?: string | null;
  created_by?: string | null;
  creator_role?: string | null;
  scope?: string | null;
  survey_type?: string | null;
  target_audience_json?: string | null;
}

export interface SurveyResponseRecord {
  id: string;
  tenant_id: string;
  template_id: string;
  template_version: number;
  student_id: string;
  status: 'DRAFT' | 'SUBMITTED' | 'REVIEWED';
  raw_answers_json: string;
  sensitive_answers_json?: string | null;
  submitted_at?: string | null;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SurveySyncProposalRecord {
  id: string;
  tenant_id: string;
  template_id?: string | null;
  response_id: string;
  student_id: string;
  target_field: string;
  field_category: 'AUTO_SYNC' | 'REVIEW_REQUIRED' | 'TEACHER_ONLY';
  old_value?: string | null;
  new_value?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'AUTO_APPLIED';
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
}

export class SurveyRepository {
  private db = getDatabase();

  constructor() {
    this.auditAndFixSurveyOwnership();
  }

  auditAndFixSurveyOwnership(): { updated: number } {
    let count = 0;
    try {
      // 1. Correct GVCN-created templates
      const teacherStmt = this.db.prepare(`
        UPDATE survey_templates
        SET creator_role = 'TEACHER', scope = 'CLASS'
        WHERE id IN ('template-grade12-default-v1', 'template-conduct-hk1')
           OR created_by LIKE '%GVCN%'
           OR created_by LIKE '%Mai Lan%'
           OR created_by LIKE '%Giáo viên%'
           OR (creator_role IS NULL AND class_id IS NOT NULL)
      `);
      const res1 = teacherStmt.run();
      count += Number(res1.changes);

      // 2. Correct Admin-created templates
      const adminStmt = this.db.prepare(`
        UPDATE survey_templates
        SET creator_role = 'SUPER_ADMIN', scope = 'SYSTEM'
        WHERE id IN ('template-parent-partnership-v1', 'template-teacher-digital-v1')
           OR created_by LIKE '%Admin%'
           OR created_by LIKE '%Ban Quản trị%'
           OR created_by LIKE '%Ban Giám hiệu%'
      `);
      const res2 = adminStmt.run();
      count += Number(res2.changes);
    } catch (err) {
      console.warn('auditAndFixSurveyOwnership warning:', err);
    }
    return { updated: count };
  }

  getTemplatesByTenant(tenantId: string): SurveyTemplateRecord[] {
    const stmt = this.db.prepare('SELECT * FROM survey_templates WHERE tenant_id = ? ORDER BY created_at DESC');
    return stmt.all(tenantId) as any[];
  }

  getTemplateById(tenantId: string, templateId: string): SurveyTemplateRecord | null {
    const stmt = this.db.prepare('SELECT * FROM survey_templates WHERE tenant_id = ? AND id = ?');
    const row = stmt.get(tenantId, templateId) as any;
    return row || null;
  }

  upsertTemplate(record: Omit<SurveyTemplateRecord, 'created_at' | 'updated_at'> & { created_at?: string; updated_at?: string }): SurveyTemplateRecord {
    tenantRepository.ensureTenantExists(record.tenant_id);
    const now = new Date().toISOString();
    const createdAt = record.created_at || now;
    const updatedAt = record.updated_at || now;

    const stmt = this.db.prepare(`
      INSERT INTO survey_templates (
        id, tenant_id, title, description, target_type, academic_year, semester,
        current_version, status, is_default, sections_json, created_at, updated_at,
        class_id, created_by, creator_role, scope, survey_type, target_audience_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(tenant_id, id) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        target_type = excluded.target_type,
        academic_year = excluded.academic_year,
        semester = excluded.semester,
        current_version = excluded.current_version,
        status = excluded.status,
        is_default = excluded.is_default,
        sections_json = excluded.sections_json,
        updated_at = excluded.updated_at,
        class_id = COALESCE(excluded.class_id, survey_templates.class_id),
        created_by = COALESCE(excluded.created_by, survey_templates.created_by),
        creator_role = COALESCE(excluded.creator_role, survey_templates.creator_role),
        scope = COALESCE(excluded.scope, survey_templates.scope),
        survey_type = COALESCE(excluded.survey_type, survey_templates.survey_type),
        target_audience_json = COALESCE(excluded.target_audience_json, survey_templates.target_audience_json)
    `);

    stmt.run(
      record.id,
      record.tenant_id,
      record.title,
      record.description || null,
      record.target_type,
      record.academic_year,
      record.semester,
      record.current_version,
      record.status,
      record.is_default ? 1 : 0,
      record.sections_json,
      createdAt,
      updatedAt,
      record.class_id || null,
      record.created_by || null,
      record.creator_role || null,
      record.scope || 'CLASS',
      record.survey_type || 'CUSTOM',
      record.target_audience_json || null
    );

    return this.getTemplateById(record.tenant_id, record.id)!;
  }

  updateTemplateTitle(tenantId: string, templateId: string, title: string): SurveyTemplateRecord | null {
    const existing = this.getTemplateById(tenantId, templateId);
    if (!existing) return null;

    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      UPDATE survey_templates
      SET title = ?, updated_at = ?
      WHERE tenant_id = ? AND id = ?
    `);
    stmt.run(title.trim(), now, tenantId, templateId);
    return this.getTemplateById(tenantId, templateId);
  }

  deleteTemplate(tenantId: string, templateId: string): boolean {
    const stmt = this.db.prepare(`
      DELETE FROM survey_templates
      WHERE tenant_id = ? AND id = ?
    `);
    const result = stmt.run(tenantId, templateId);
    return result.changes > 0;
  }

  archiveTemplate(tenantId: string, templateId: string): SurveyTemplateRecord | null {
    const existing = this.getTemplateById(tenantId, templateId);
    if (!existing) return null;

    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      UPDATE survey_templates
      SET status = 'ARCHIVED', updated_at = ?
      WHERE tenant_id = ? AND id = ?
    `);
    stmt.run(now, tenantId, templateId);
    return this.getTemplateById(tenantId, templateId);
  }

  getResponseCountByTemplate(tenantId: string, templateId: string): number {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM survey_responses
      WHERE tenant_id = ? AND template_id = ?
    `);
    const row = stmt.get(tenantId, templateId) as { count: number } | undefined;
    return row?.count || 0;
  }

  getResponsesByTenant(tenantId: string): SurveyResponseRecord[] {
    const stmt = this.db.prepare('SELECT * FROM survey_responses WHERE tenant_id = ? ORDER BY updated_at DESC');
    return stmt.all(tenantId) as any[];
  }

  getResponseByStudent(tenantId: string, templateId: string, studentId: string): SurveyResponseRecord | null {
    const stmt = this.db.prepare('SELECT * FROM survey_responses WHERE tenant_id = ? AND template_id = ? AND student_id = ?');
    const row = stmt.get(tenantId, templateId, studentId) as any;
    return row || null;
  }

  upsertResponse(record: Omit<SurveyResponseRecord, 'created_at' | 'updated_at'> & { created_at?: string; updated_at?: string }): SurveyResponseRecord {
    tenantRepository.ensureTenantExists(record.tenant_id);
    const now = new Date().toISOString();
    const createdAt = record.created_at || now;
    const updatedAt = record.updated_at || now;

    const stmt = this.db.prepare(`
      INSERT INTO survey_responses (
        id, tenant_id, template_id, template_version, student_id, status,
        raw_answers_json, sensitive_answers_json, submitted_at, reviewed_at, reviewed_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(tenant_id, id) DO UPDATE SET
        template_version = excluded.template_version,
        status = excluded.status,
        raw_answers_json = excluded.raw_answers_json,
        sensitive_answers_json = excluded.sensitive_answers_json,
        submitted_at = excluded.submitted_at,
        reviewed_at = excluded.reviewed_at,
        reviewed_by = excluded.reviewed_by,
        updated_at = excluded.updated_at
    `);

    stmt.run(
      record.id,
      record.tenant_id,
      record.template_id,
      record.template_version,
      record.student_id,
      record.status,
      record.raw_answers_json,
      record.sensitive_answers_json || null,
      record.submitted_at || null,
      record.reviewed_at || null,
      record.reviewed_by || null,
      createdAt,
      updatedAt
    );

    const checkStmt = this.db.prepare('SELECT * FROM survey_responses WHERE tenant_id = ? AND id = ?');
    return checkStmt.get(record.tenant_id, record.id) as any;
  }

  getProposalsByTenant(tenantId: string, filter?: { templateId?: string; surveyId?: string }): SurveySyncProposalRecord[] {
    if (filter?.templateId) {
      const stmt = this.db.prepare(`
        SELECT p.* FROM survey_sync_proposals p
        WHERE p.tenant_id = ?
          AND (
            p.template_id = ?
            OR p.response_id IN (
              SELECT r.id FROM survey_responses r
              WHERE r.tenant_id = ? AND r.template_id = ?
            )
          )
        ORDER BY p.created_at DESC
      `);
      return stmt.all(tenantId, filter.templateId, tenantId, filter.templateId) as any[];
    }

    if (filter?.surveyId) {
      const stmt = this.db.prepare(`
        SELECT * FROM survey_sync_proposals
        WHERE tenant_id = ? AND (response_id = ? OR id = ?)
        ORDER BY created_at DESC
      `);
      return stmt.all(tenantId, filter.surveyId, filter.surveyId) as any[];
    }

    const stmt = this.db.prepare('SELECT * FROM survey_sync_proposals WHERE tenant_id = ? ORDER BY created_at DESC');
    return stmt.all(tenantId) as any[];
  }

  upsertProposal(record: SurveySyncProposalRecord): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO survey_sync_proposals (
        id, tenant_id, template_id, response_id, student_id, target_field, field_category,
        old_value, new_value, status, reviewed_by, reviewed_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      record.id,
      record.tenant_id,
      record.template_id || null,
      record.response_id,
      record.student_id,
      record.target_field,
      record.field_category,
      record.old_value || null,
      record.new_value || null,
      record.status,
      record.reviewed_by || null,
      record.reviewed_at || null,
      record.created_at
    );
  }
}

export const surveyRepository = new SurveyRepository();
