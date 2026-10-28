import { getDatabase } from '../db/database';

export interface TrainingTransactionRow {
  id: string;
  tenant_id: string;
  student_id: string;
  rule_id?: string | null;
  category: string;
  title: string;
  points: number;
  description?: string | null;
  evidence_url?: string | null;
  status: 'PROPOSED' | 'APPROVED' | 'REJECTED';
  created_by_role: string;
  created_by_user_id: string;
  approved_by?: string | null;
  approved_at?: string | null;
  created_at: string;
}

export interface TrainingRuleConfigRow {
  id: string;
  tenant_id: string;
  category: string;
  title: string;
  default_points: number;
  description?: string | null;
  active: number;
}

export interface LaurelTreeRow {
  tenant_id: string;
  student_id: string;
  total_points: number;
  current_rank_level: number;
  badges_json: string;
  updated_at: string;
}

export interface AttendanceRecordRow {
  id: string;
  tenant_id: string;
  student_id: string;
  date: string;
  status: string;
  reason?: string | null;
  recorded_by: string;
  created_at: string;
}

export class TrainingRepository {
  private db = getDatabase();

  getTransactionsByTenant(tenantId: string): TrainingTransactionRow[] {
    const stmt = this.db.prepare('SELECT * FROM training_transactions WHERE tenant_id = ? ORDER BY created_at DESC');
    return stmt.all(tenantId) as any[];
  }

  getTransactionsByStudent(tenantId: string, studentId: string): TrainingTransactionRow[] {
    const stmt = this.db.prepare('SELECT * FROM training_transactions WHERE tenant_id = ? AND student_id = ? ORDER BY created_at DESC');
    return stmt.all(tenantId, studentId) as any[];
  }

  getTransactionById(tenantId: string, id: string): TrainingTransactionRow | undefined {
    const stmt = this.db.prepare('SELECT * FROM training_transactions WHERE tenant_id = ? AND id = ?');
    return stmt.get(tenantId, id) as any;
  }

  upsertTransaction(record: TrainingTransactionRow): TrainingTransactionRow {
    const stmt = this.db.prepare(`
      INSERT INTO training_transactions (
        id, tenant_id, student_id, rule_id, category, title, points,
        description, evidence_url, status, created_by_role, created_by_user_id,
        approved_by, approved_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(tenant_id, id) DO UPDATE SET
        rule_id = excluded.rule_id,
        category = excluded.category,
        title = excluded.title,
        points = excluded.points,
        description = excluded.description,
        evidence_url = excluded.evidence_url,
        status = excluded.status,
        approved_by = excluded.approved_by,
        approved_at = excluded.approved_at
    `);
    stmt.run(
      record.id,
      record.tenant_id,
      record.student_id,
      record.rule_id || null,
      record.category,
      record.title,
      record.points,
      record.description || null,
      record.evidence_url || null,
      record.status,
      record.created_by_role,
      record.created_by_user_id,
      record.approved_by || null,
      record.approved_at || null,
      record.created_at
    );

    const checkStmt = this.db.prepare('SELECT * FROM training_transactions WHERE tenant_id = ? AND id = ?');
    return checkStmt.get(record.tenant_id, record.id) as any;
  }

  deleteTransaction(tenantId: string, id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM training_transactions WHERE tenant_id = ? AND id = ?');
    const result = stmt.run(tenantId, id);
    return result.changes > 0;
  }

  getRuleConfigs(tenantId: string): TrainingRuleConfigRow[] {
    const stmt = this.db.prepare('SELECT * FROM training_rule_configs WHERE tenant_id = ?');
    return stmt.all(tenantId) as any[];
  }

  upsertRuleConfig(record: TrainingRuleConfigRow): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO training_rule_configs (
        id, tenant_id, category, title, default_points, description, active
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      record.id,
      record.tenant_id,
      record.category,
      record.title,
      record.default_points,
      record.description || null,
      record.active
    );
  }

  getLaurelTree(tenantId: string, studentId: string): LaurelTreeRow | null {
    const stmt = this.db.prepare('SELECT * FROM laurel_trees WHERE tenant_id = ? AND student_id = ?');
    const row = stmt.get(tenantId, studentId) as any;
    return row || null;
  }

  saveLaurelTree(record: LaurelTreeRow): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO laurel_trees (
        tenant_id, student_id, total_points, current_rank_level, badges_json, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      record.tenant_id,
      record.student_id,
      record.total_points,
      record.current_rank_level,
      record.badges_json,
      record.updated_at
    );
  }

  getAttendanceRecords(tenantId: string, studentId?: string): AttendanceRecordRow[] {
    if (studentId) {
      const stmt = this.db.prepare('SELECT * FROM attendance_records WHERE tenant_id = ? AND student_id = ? ORDER BY date DESC');
      return stmt.all(tenantId, studentId) as any[];
    }
    const stmt = this.db.prepare('SELECT * FROM attendance_records WHERE tenant_id = ? ORDER BY date DESC');
    return stmt.all(tenantId) as any[];
  }

  upsertAttendanceRecord(record: AttendanceRecordRow): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO attendance_records (
        id, tenant_id, student_id, date, status, reason, recorded_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      record.id,
      record.tenant_id,
      record.student_id,
      record.date,
      record.status,
      record.reason || null,
      record.recorded_by,
      record.created_at
    );
  }
}

export const trainingRepository = new TrainingRepository();
