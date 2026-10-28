import { getDatabase } from '../db/database';
import { tenantRepository } from './TenantRepository';

export interface AcademicRecordRow {
  id: string;
  tenant_id: string;
  student_id: string;
  academic_year: string;
  semester: string;
  scores_json: string;
  conduct_score?: number | null;
  conduct_evaluation?: string | null;
  academic_rank?: string | null;
  gpa?: number | null;
  attendance_summary_json?: string | null;
  teacher_evaluation?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PublishedAcademicSnapshotRow {
  id: string;
  tenant_id: string;
  academic_year: string;
  semester: string;
  period_label: string;
  published_at: string;
  published_by: string;
  snapshot_data_json: string;
  status: string;
}

export class AcademicRepository {
  private db = getDatabase();

  listByTenant(tenantId: string): AcademicRecordRow[] {
    const stmt = this.db.prepare('SELECT * FROM academic_records WHERE tenant_id = ? ORDER BY student_id ASC');
    return stmt.all(tenantId) as any[];
  }

  getByStudent(tenantId: string, studentId: string): AcademicRecordRow[] {
    const stmt = this.db.prepare('SELECT * FROM academic_records WHERE tenant_id = ? AND student_id = ?');
    return stmt.all(tenantId, studentId) as any[];
  }

  runInTransaction<T>(fn: () => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const result = fn();
      this.db.exec('COMMIT');
      return result;
    } catch (err) {
      try {
        this.db.exec('ROLLBACK');
      } catch {}
      throw err;
    }
  }

  upsert(record: Omit<AcademicRecordRow, 'created_at' | 'updated_at'> & { created_at?: string; updated_at?: string }): AcademicRecordRow {
    tenantRepository.ensureTenantExists(record.tenant_id);
    const now = new Date().toISOString();
    const createdAt = record.created_at || now;
    const updatedAt = record.updated_at || now;

    // Check existing record to preserve publishedSnapshot ONLY if incoming is an unpublished draft
    let finalScoresJson = record.scores_json;
    try {
      const checkStmt = this.db.prepare('SELECT * FROM academic_records WHERE tenant_id = ? AND id = ?');
      const existing = checkStmt.get(record.tenant_id, record.id) as unknown as AcademicRecordRow | undefined;
      if (existing && existing.scores_json) {
        const incoming = JSON.parse(record.scores_json || '{}');
        const prev = JSON.parse(existing.scores_json || '{}');
        const isIncomingPublished =
          incoming.publicationStatus === 'PUBLISHED' ||
          incoming.publishedToStudent === true ||
          incoming.publishedToParent === true;

        if (isIncomingPublished) {
          delete incoming.publishedSnapshot;
          finalScoresJson = JSON.stringify(incoming);
        } else if (!incoming.publishedSnapshot) {
          if (prev.publishedSnapshot) {
            incoming.publishedSnapshot = prev.publishedSnapshot;
            finalScoresJson = JSON.stringify(incoming);
          } else if (prev.publicationStatus === 'PUBLISHED' || prev.publishedToStudent === true) {
            incoming.publishedSnapshot = {
              period: prev.period || record.semester,
              grades: prev.grades || [],
              gpa: existing.gpa,
              academicRank: existing.academic_rank,
              conductScore: existing.conduct_score,
              conductEvaluation: existing.conduct_evaluation,
              teacherEvaluation: existing.teacher_evaluation,
              publishedAt: prev.publishedAt || existing.updated_at,
              publishedBy: prev.publishedBy || 'GVCN',
              publicationStatus: 'PUBLISHED',
              publishedToStudent: true,
              publishedToParent: true
            };
            finalScoresJson = JSON.stringify(incoming);
          }
        }
      }
    } catch {}

    const stmt = this.db.prepare(`
      INSERT INTO academic_records (
        id, tenant_id, student_id, academic_year, semester, scores_json,
        conduct_score, conduct_evaluation, academic_rank, gpa,
        attendance_summary_json, teacher_evaluation, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(tenant_id, id) DO UPDATE SET
        scores_json = excluded.scores_json,
        conduct_score = excluded.conduct_score,
        conduct_evaluation = excluded.conduct_evaluation,
        academic_rank = excluded.academic_rank,
        gpa = excluded.gpa,
        attendance_summary_json = excluded.attendance_summary_json,
        teacher_evaluation = excluded.teacher_evaluation,
        updated_at = excluded.updated_at
    `);

    stmt.run(
      record.id,
      record.tenant_id,
      record.student_id,
      record.academic_year,
      record.semester,
      finalScoresJson,
      record.conduct_score ?? null,
      record.conduct_evaluation ?? null,
      record.academic_rank ?? null,
      record.gpa ?? null,
      record.attendance_summary_json ?? null,
      record.teacher_evaluation ?? null,
      createdAt,
      updatedAt
    );

    const checkStmt = this.db.prepare('SELECT * FROM academic_records WHERE tenant_id = ? AND id = ?');
    return checkStmt.get(record.tenant_id, record.id) as any;
  }

  publishPeriodRecords(params: {
    tenantId: string;
    period: string;
    academicYear?: string;
    semester?: string;
    periodLabel?: string;
    studentIds?: string[];
    publishedAt: string;
    publishedBy: string;
    incomingRecords?: Record<string, any>;
  }): { count: number } {
    tenantRepository.ensureTenantExists(params.tenantId);
    const allRecords = this.listByTenant(params.tenantId);
    let count = 0;

    const normPeriod = params.period.toLowerCase().trim().replace(/[-_\s]/g, '');

    allRecords.forEach(rec => {
      if (params.studentIds && params.studentIds.length > 0 && !params.studentIds.includes(rec.student_id)) {
        return;
      }
      let parsedScores: any = {};
      try {
        parsedScores = JSON.parse(rec.scores_json || '{}');
      } catch {}

      const recPeriod = String(parsedScores.period || '').toLowerCase().trim().replace(/[-_\s]/g, '');
      const idContainsPeriod = rec.id.toLowerCase().includes(normPeriod);
      if (recPeriod && recPeriod !== normPeriod && !idContainsPeriod) {
        return;
      }

      const publishedSnapshot = {
        period: params.period,
        grades: parsedScores.grades || [],
        gpa: rec.gpa,
        academicRank: rec.academic_rank,
        conductScore: rec.conduct_score,
        conductEvaluation: rec.conduct_evaluation,
        teacherEvaluation: rec.teacher_evaluation,
        publishedAt: params.publishedAt,
        publishedBy: params.publishedBy,
        publicationStatus: 'PUBLISHED',
        publishedToStudent: true,
        publishedToParent: true
      };

      const updatedScores = {
        ...parsedScores,
        period: params.period,
        publishedToStudent: true,
        publishedToParent: true,
        publishedAt: params.publishedAt,
        publishedBy: params.publishedBy,
        publicationStatus: 'PUBLISHED',
        publishedSnapshot
      };

      const updateStmt = this.db.prepare(`
        UPDATE academic_records
        SET scores_json = ?, updated_at = ?
        WHERE tenant_id = ? AND id = ?
      `);
      updateStmt.run(JSON.stringify(updatedScores), params.publishedAt, params.tenantId, rec.id);
      count++;
    });

    if (params.incomingRecords && typeof params.incomingRecords === 'object') {
      Object.entries(params.incomingRecords).forEach(([key, inRec]: [string, any]) => {
        const studentId = inRec.studentId || key.split('_')[0];
        const rawRecPeriod = inRec.period || params.period;
        const normRecPeriod = String(rawRecPeriod).toLowerCase().trim().replace(/[-_\s]/g, '');
        if (normRecPeriod !== normPeriod) return;
        if (params.studentIds && params.studentIds.length > 0 && !params.studentIds.includes(studentId)) return;

        const recordId = inRec.id || `acad_${studentId}_${params.period}_${params.academicYear || '2025_2026'}`;
        const existing = allRecords.find(r => r.id === recordId);
        if (!existing) {
          const publishedSnapshot = {
            period: params.period,
            grades: inRec.grades || [],
            gpa: inRec.gpa,
            academicRank: inRec.academicRank,
            conductScore: inRec.conductScore,
            conductEvaluation: inRec.conductSummary,
            teacherEvaluation: inRec.academicSummary || inRec.teacherComment,
            publishedAt: params.publishedAt,
            publishedBy: params.publishedBy,
            publicationStatus: 'PUBLISHED',
            publishedToStudent: true,
            publishedToParent: true
          };

          const updatedScores = {
            ...inRec,
            period: params.period,
            publishedToStudent: true,
            publishedToParent: true,
            publishedAt: params.publishedAt,
            publishedBy: params.publishedBy,
            publicationStatus: 'PUBLISHED',
            publishedSnapshot
          };

          this.upsert({
            id: recordId,
            tenant_id: params.tenantId,
            student_id: studentId,
            academic_year: params.academicYear || '2025 - 2026',
            semester: params.semester || (params.period.includes('hk2') ? 'Học kỳ II' : 'Học kỳ I'),
            scores_json: JSON.stringify(updatedScores),
            conduct_score: inRec.conductScore,
            conduct_evaluation: inRec.conductSummary,
            academic_rank: inRec.academicRank,
            gpa: inRec.gpa,
            attendance_summary_json: inRec.attendanceSummary ? JSON.stringify(inRec.attendanceSummary) : null,
            teacher_evaluation: inRec.academicSummary || inRec.teacherComment,
            created_at: params.publishedAt,
            updated_at: params.publishedAt
          });
          count++;
        }
      });
    }

    return { count };
  }

  publishSnapshot(snapshot: PublishedAcademicSnapshotRow): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO published_academic_snapshots (
        id, tenant_id, academic_year, semester, period_label, published_at, published_by, snapshot_data_json, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      snapshot.id,
      snapshot.tenant_id,
      snapshot.academic_year,
      snapshot.semester,
      snapshot.period_label,
      snapshot.published_at,
      snapshot.published_by,
      snapshot.snapshot_data_json,
      snapshot.status
    );
  }

  getSnapshots(tenantId: string): PublishedAcademicSnapshotRow[] {
    const stmt = this.db.prepare('SELECT * FROM published_academic_snapshots WHERE tenant_id = ? ORDER BY published_at DESC');
    return stmt.all(tenantId) as any[];
  }
}

export const academicRepository = new AcademicRepository();
