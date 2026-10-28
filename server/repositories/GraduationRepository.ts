import { getDatabase } from '../db/database';

export interface GraduationChoiceRow {
  id: string;
  tenant_id: string;
  student_id: string;
  initial_choice_json: string;
  current_choice_json: string;
  history_json: string;
  mock_exam_results_json?: string | null;
  created_at: string;
  updated_at: string;
}

export class GraduationRepository {
  private db = getDatabase();

  listByTenant(tenantId: string): GraduationChoiceRow[] {
    const stmt = this.db.prepare('SELECT * FROM graduation_choices WHERE tenant_id = ? ORDER BY student_id ASC');
    return stmt.all(tenantId) as any[];
  }

  getByStudent(tenantId: string, studentId: string): GraduationChoiceRow | null {
    const stmt = this.db.prepare('SELECT * FROM graduation_choices WHERE tenant_id = ? AND student_id = ?');
    const row = stmt.get(tenantId, studentId) as any;
    return row || null;
  }

  upsert(record: Omit<GraduationChoiceRow, 'created_at' | 'updated_at'> & { created_at?: string; updated_at?: string }): GraduationChoiceRow {
    const now = new Date().toISOString();
    const createdAt = record.created_at || now;
    const updatedAt = record.updated_at || now;

    const stmt = this.db.prepare(`
      INSERT INTO graduation_choices (
        id, tenant_id, student_id, initial_choice_json, current_choice_json, history_json, mock_exam_results_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(tenant_id, id) DO UPDATE SET
        current_choice_json = excluded.current_choice_json,
        history_json = excluded.history_json,
        mock_exam_results_json = excluded.mock_exam_results_json,
        updated_at = excluded.updated_at
    `);

    stmt.run(
      record.id,
      record.tenant_id,
      record.student_id,
      record.initial_choice_json,
      record.current_choice_json,
      record.history_json,
      record.mock_exam_results_json || '[]',
      createdAt,
      updatedAt
    );

    const checkStmt = this.db.prepare('SELECT * FROM graduation_choices WHERE tenant_id = ? AND id = ?');
    return checkStmt.get(record.tenant_id, record.id) as any;
  }

  delete(tenantId: string, id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM graduation_choices WHERE tenant_id = ? AND id = ?');
    const result = stmt.run(tenantId, id);
    return (result as any).changes > 0;
  }

  deleteByStudent(tenantId: string, studentId: string): boolean {
    const stmt = this.db.prepare('DELETE FROM graduation_choices WHERE tenant_id = ? AND student_id = ?');
    const result = stmt.run(tenantId, studentId);
    return (result as any).changes > 0;
  }
}

export const graduationRepository = new GraduationRepository();
