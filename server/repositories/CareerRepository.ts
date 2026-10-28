import { getDatabase } from '../db/database';

export interface CareerProfileRow {
  id: string;
  tenant_id: string;
  student_id: string;
  riasec_scores_json: string;
  primary_traits_json: string;
  recommended_careers_json: string;
  student_aspirations?: string | null;
  holland_history_json: string;
  mbti_result_json?: string;
  work_values_result_json?: string;
  assessments_history_json?: string;
  created_at: string;
  updated_at: string;
}

export class CareerRepository {
  private db = getDatabase();

  listByTenant(tenantId: string): CareerProfileRow[] {
    const stmt = this.db.prepare('SELECT * FROM career_profiles WHERE tenant_id = ? ORDER BY student_id ASC');
    return stmt.all(tenantId) as any[];
  }

  getByStudent(tenantId: string, studentId: string): CareerProfileRow | null {
    const stmt = this.db.prepare('SELECT * FROM career_profiles WHERE tenant_id = ? AND student_id = ?');
    const row = stmt.get(tenantId, studentId) as any;
    return row || null;
  }

  upsert(record: Omit<CareerProfileRow, 'created_at' | 'updated_at'> & { created_at?: string; updated_at?: string }): CareerProfileRow {
    const now = new Date().toISOString();
    const createdAt = record.created_at || now;
    const updatedAt = record.updated_at || now;

    const stmt = this.db.prepare(`
      INSERT INTO career_profiles (
        id, tenant_id, student_id, riasec_scores_json, primary_traits_json, recommended_careers_json,
        student_aspirations, holland_history_json, mbti_result_json, work_values_result_json, assessments_history_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(tenant_id, id) DO UPDATE SET
        riasec_scores_json = excluded.riasec_scores_json,
        primary_traits_json = excluded.primary_traits_json,
        recommended_careers_json = excluded.recommended_careers_json,
        student_aspirations = excluded.student_aspirations,
        holland_history_json = excluded.holland_history_json,
        mbti_result_json = excluded.mbti_result_json,
        work_values_result_json = excluded.work_values_result_json,
        assessments_history_json = excluded.assessments_history_json,
        updated_at = excluded.updated_at
    `);

    stmt.run(
      record.id,
      record.tenant_id,
      record.student_id,
      record.riasec_scores_json,
      record.primary_traits_json,
      record.recommended_careers_json,
      record.student_aspirations || null,
      record.holland_history_json || '[]',
      record.mbti_result_json || '{}',
      record.work_values_result_json || '{}',
      record.assessments_history_json || '[]',
      createdAt,
      updatedAt
    );

    const checkStmt = this.db.prepare('SELECT * FROM career_profiles WHERE tenant_id = ? AND id = ?');
    return checkStmt.get(record.tenant_id, record.id) as any;
  }
}

export const careerRepository = new CareerRepository();
