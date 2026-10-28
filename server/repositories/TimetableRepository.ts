import { getDatabase } from '../db/database';

export interface TimetableRow {
  tenant_id: string;
  class_id: string;
  academic_year: string;
  semester: string;
  schedule_grid_json: string;
  updated_at: string;
  updated_by: string;
}

export interface ExamScheduleRow {
  id: string;
  tenant_id: string;
  class_id: string;
  exam_title: string;
  subject: string;
  exam_date: string;
  start_time: string;
  duration_minutes: number;
  room?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface AssignmentRow {
  id: string;
  tenant_id: string;
  class_id: string;
  title: string;
  subject: string;
  assigned_date: string;
  due_date: string;
  description?: string | null;
  status: string;
  is_pinned?: number;
  bg_color?: string | null;
  text_color?: string | null;
  author_role?: string | null;
  author_name?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export class TimetableRepository {
  private db = getDatabase();

  getTimetable(tenantId: string, classId: string, academicYear: string, semester: string): TimetableRow | null {
    const stmt = this.db.prepare('SELECT * FROM timetables WHERE tenant_id = ? AND class_id = ? AND academic_year = ? AND semester = ?');
    let row = stmt.get(tenantId, classId, academicYear, semester) as any;
    if (row) return row;

    // Check alias: 'HK1' <-> 'Học kỳ I', 'HK2' <-> 'Học kỳ II'
    const altSemester = semester === 'HK1' ? 'Học kỳ I' : (semester === 'Học kỳ I' ? 'HK1' : (semester === 'HK2' ? 'Học kỳ II' : (semester === 'Học kỳ II' ? 'HK2' : semester)));
    if (altSemester !== semester) {
      row = stmt.get(tenantId, classId, academicYear, altSemester) as any;
      if (row) return row;
    }

    // Fallback: check if any record matches tenant and academicYear + semester
    const fallbackStmt = this.db.prepare('SELECT * FROM timetables WHERE tenant_id = ? AND academic_year = ? AND (semester = ? OR semester = ?) ORDER BY updated_at DESC LIMIT 1');
    const fallbackRow = fallbackStmt.get(tenantId, academicYear, semester, altSemester) as any;
    if (fallbackRow) return fallbackRow;

    // Broad fallback: latest timetable for tenant
    const anyStmt = this.db.prepare('SELECT * FROM timetables WHERE tenant_id = ? ORDER BY updated_at DESC LIMIT 1');
    return (anyStmt.get(tenantId) as any) || null;
  }

  getLatestTimetableForTenant(tenantId: string, academicYear?: string, semester?: string): TimetableRow | null {
    if (academicYear && semester) {
      const stmt = this.db.prepare('SELECT * FROM timetables WHERE tenant_id = ? AND academic_year = ? AND semester = ? ORDER BY updated_at DESC LIMIT 1');
      return (stmt.get(tenantId, academicYear, semester) as any) || null;
    }
    const stmt = this.db.prepare('SELECT * FROM timetables WHERE tenant_id = ? ORDER BY updated_at DESC LIMIT 1');
    return (stmt.get(tenantId) as any) || null;
  }

  saveTimetable(record: TimetableRow): void {
    const stmt = this.db.prepare(`
      INSERT INTO timetables (
        tenant_id, class_id, academic_year, semester, schedule_grid_json, updated_at, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(tenant_id, class_id, academic_year, semester) DO UPDATE SET
        schedule_grid_json = excluded.schedule_grid_json,
        updated_at = excluded.updated_at,
        updated_by = excluded.updated_by
    `);
    stmt.run(
      record.tenant_id,
      record.class_id,
      record.academic_year,
      record.semester,
      record.schedule_grid_json,
      record.updated_at,
      record.updated_by
    );
  }

  getExamSchedules(tenantId: string, classId?: string): ExamScheduleRow[] {
    if (classId) {
      const stmt = this.db.prepare('SELECT * FROM exam_schedules WHERE tenant_id = ? AND class_id = ? ORDER BY exam_date ASC');
      return stmt.all(tenantId, classId) as any[];
    }
    const stmt = this.db.prepare('SELECT * FROM exam_schedules WHERE tenant_id = ? ORDER BY exam_date ASC');
    return stmt.all(tenantId) as any[];
  }

  upsertExamSchedule(record: ExamScheduleRow): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO exam_schedules (
        id, tenant_id, class_id, exam_title, subject, exam_date, start_time, duration_minutes, room, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      record.id,
      record.tenant_id,
      record.class_id,
      record.exam_title,
      record.subject,
      record.exam_date,
      record.start_time,
      record.duration_minutes,
      record.room || null,
      record.notes || null,
      record.created_at
    );
  }

  getAssignments(tenantId: string, classId?: string): AssignmentRow[] {
    if (classId) {
      const stmt = this.db.prepare('SELECT * FROM assignments WHERE tenant_id = ? AND class_id = ? ORDER BY is_pinned DESC, COALESCE(assigned_date, due_date) DESC, created_at DESC, id DESC');
      return stmt.all(tenantId, classId) as any[];
    }
    const stmt = this.db.prepare('SELECT * FROM assignments WHERE tenant_id = ? ORDER BY is_pinned DESC, COALESCE(assigned_date, due_date) DESC, created_at DESC, id DESC');
    return stmt.all(tenantId) as any[];
  }

  getAssignmentById(tenantId: string, id: string): AssignmentRow | null {
    const stmt = this.db.prepare('SELECT * FROM assignments WHERE tenant_id = ? AND id = ?');
    const row = stmt.get(tenantId, id) as any;
    return row || null;
  }

  deleteAssignment(tenantId: string, id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM assignments WHERE tenant_id = ? AND id = ?');
    const result = stmt.run(tenantId, id);
    return result.changes > 0;
  }

  togglePinAssignment(tenantId: string, id: string): { success: boolean; isPinned: boolean } {
    const existing = this.getAssignmentById(tenantId, id);
    if (!existing) return { success: false, isPinned: false };
    const nextPinned = existing.is_pinned === 1 ? 0 : 1;
    const now = new Date().toISOString();
    const stmt = this.db.prepare('UPDATE assignments SET is_pinned = ?, updated_at = ? WHERE tenant_id = ? AND id = ?');
    stmt.run(nextPinned, now, tenantId, id);
    return { success: true, isPinned: nextPinned === 1 };
  }

  upsertAssignment(record: AssignmentRow): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO assignments (
        id, tenant_id, class_id, title, subject, assigned_date, due_date, description, status,
        is_pinned, bg_color, text_color, author_role, author_name, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      record.id,
      record.tenant_id,
      record.class_id,
      record.title,
      record.subject,
      record.assigned_date,
      record.due_date,
      record.description || null,
      record.status,
      record.is_pinned ? 1 : 0,
      record.bg_color || null,
      record.text_color || null,
      record.author_role || null,
      record.author_name || null,
      record.created_at,
      record.updated_at || new Date().toISOString()
    );
  }

  updateDayAppearance(tenantId: string, date: string, bgColor: string | null, textColor: string | null): number {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      UPDATE assignments
      SET bg_color = ?, text_color = ?, updated_at = ?
      WHERE tenant_id = ? AND (assigned_date = ? OR due_date = ?)
    `);
    const result = stmt.run(bgColor, textColor, now, tenantId, date, date);
    return Number(result.changes);
  }

  updateDayPin(tenantId: string, date: string, isPinned: number): number {
    const now = new Date().toISOString();
    const normDate = date.includes('T') ? date.split('T')[0] : date;
    const stmt = this.db.prepare(`
      UPDATE assignments
      SET is_pinned = ?, updated_at = ?
      WHERE tenant_id = ? AND (
        assigned_date = ? OR due_date = ? OR
        assigned_date = ? OR due_date = ?
      )
    `);
    const result = stmt.run(isPinned, now, tenantId, date, date, normDate, normDate);
    return Number(result.changes);
  }

  syncDayPinStatus(tenantId?: string): number {
    try {
      const query = tenantId
        ? `SELECT DISTINCT tenant_id, assigned_date FROM assignments WHERE tenant_id = ? AND is_pinned = 1 AND assigned_date IS NOT NULL`
        : `SELECT DISTINCT tenant_id, assigned_date FROM assignments WHERE is_pinned = 1 AND assigned_date IS NOT NULL`;
      const rows = tenantId ? this.db.prepare(query).all(tenantId) as any[] : this.db.prepare(query).all() as any[];

      const updateStmt = this.db.prepare(`
        UPDATE assignments
        SET is_pinned = 1
        WHERE tenant_id = ? AND (assigned_date = ? OR due_date = ?) AND is_pinned != 1
      `);

      let totalUpdated = 0;
      for (const r of rows) {
        if (r.tenant_id && r.assigned_date) {
          const res = updateStmt.run(r.tenant_id, r.assigned_date, r.assigned_date);
          totalUpdated += Number(res.changes);
        }
      }
      return totalUpdated;
    } catch (err) {
      console.warn('[TimetableRepository] syncDayPinStatus notice:', err);
      return 0;
    }
  }
}

export const timetableRepository = new TimetableRepository();
