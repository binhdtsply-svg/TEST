import { Router, Response } from 'express';
import { AuthenticatedRequest, authenticateToken, requireRole } from '../auth/middleware';
import { academicRepository } from '../repositories/AcademicRepository';
import { studentRepository } from '../repositories/StudentRepository';
import { auditLogRepository } from '../repositories/AuditLogRepository';
import { eventHub } from '../events/EventHub';
import { persistenceSyncService } from '../services/PersistenceSyncService';

const router = Router();

router.use(authenticateToken);

// GET /api/v1/academic/records
router.get('/records', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const allRecords = academicRepository.listByTenant(user.tenantId);

  let filtered = allRecords;
  if (user.role === 'STUDENT' || user.role === 'CLASS_OFFICER') {
    filtered = allRecords.filter(r => r.student_id === user.studentId);
  } else if (user.role === 'PARENT') {
    const targetChildId = user.childStudentId || user.studentId;
    filtered = allRecords.filter(r => r.student_id === targetChildId);
  }

  const isStudentOrParent = user.role === 'STUDENT' || user.role === 'CLASS_OFFICER' || user.role === 'PARENT';

  return res.json({
    success: true,
    data: filtered.map(r => {
      const parsedScores = JSON.parse(r.scores_json || '{}');
      const isPublished = user.role === 'PARENT'
        ? (parsedScores.publishedToParent !== false && (parsedScores.publishedToParent === true || parsedScores.publicationStatus === 'PUBLISHED' || parsedScores.publishedToStudent === true))
        : (parsedScores.publishedToStudent !== false && (parsedScores.publishedToStudent === true || parsedScores.publicationStatus === 'PUBLISHED'));
      
      // If student or parent is viewing an unpublished draft, mask scores
      const safeScores = isStudentOrParent && !isPublished ? {
        period: parsedScores.period,
        grades: [],
        publishedToStudent: false,
        publishedToParent: false,
        publicationStatus: 'DRAFT'
      } : parsedScores;

      return {
        id: r.id,
        studentId: r.student_id,
        academicYear: r.academic_year,
        semester: r.semester,
        scores: safeScores,
        conductScore: r.conduct_score,
        conductEvaluation: r.conduct_evaluation,
        academicRank: r.academic_rank,
        gpa: isStudentOrParent && !isPublished ? undefined : r.gpa,
        attendanceSummary: r.attendance_summary_json ? JSON.parse(r.attendance_summary_json) : undefined,
        teacherEvaluation: isStudentOrParent && !isPublished ? undefined : r.teacher_evaluation,
        updatedAt: r.updated_at
      };
    })
  });
});

function normalizePeriodForServer(period?: string): string {
  if (!period) return 'midterm_hk1';
  const p = String(period).toLowerCase().trim().replace(/[-_\s]/g, '');
  if (p.includes('giua') && (p.includes('1') || p.includes('hk1') || p.includes('i'))) return 'midterm_hk1';
  if (p.includes('mid') && (p.includes('1') || p.includes('hk1'))) return 'midterm_hk1';
  if (p === 'gk1' || p === 'gki' || p === 'midtermhk1') return 'midterm_hk1';

  if (p.includes('giua') && (p.includes('2') || p.includes('hk2') || p.includes('ii'))) return 'midterm_hk2';
  if (p.includes('mid') && (p.includes('2') || p.includes('hk2'))) return 'midterm_hk2';
  if (p === 'gk2' || p === 'gkii' || p === 'midtermhk2') return 'midterm_hk2';

  if (p.includes('nam') || p.includes('year') || p.includes('annual') || p === 'cn' || p === 'canam') return 'full_year';

  if (p.includes('cuoi') && (p.includes('2') || p.includes('hk2') || p.includes('ii'))) return 'final_hk2';
  if (p.includes('final') && (p.includes('2') || p.includes('hk2'))) return 'final_hk2';
  if (p === 'ck2' || p === 'ckii' || p === 'hk2' || p === 'hocky2' || p === 'hockyii' || p === 'finalhk2') return 'final_hk2';

  if (p.includes('cuoi') && (p.includes('1') || p.includes('hk1') || p.includes('i'))) return 'final_hk1';
  if (p.includes('final') && (p.includes('1') || p.includes('hk1'))) return 'final_hk1';
  if (p === 'ck1' || p === 'cki' || p === 'hk1' || p === 'hocky1' || p === 'hockyi' || p === 'finalhk1') return 'final_hk1';

  return 'midterm_hk1';
}

function validateGradesPayload(grades: any[]): { isValid: boolean; error?: string } {
  if (!Array.isArray(grades)) return { isValid: true };
  for (const g of grades) {
    if (!g || typeof g !== 'object') continue;
    const isComment = g.assessmentMode === 'COMMENT_ONLY';
    if (isComment) {
      if (g.qualitativeResult !== undefined && g.qualitativeResult !== null && g.qualitativeResult !== '') {
        const str = String(g.qualitativeResult).trim().toLowerCase();
        if (str !== 'đạt' && str !== 'dat' && str !== 'chưa đạt' && str !== 'chua dat') {
          return { isValid: false, error: `Môn ${g.subjectName || ''}: Kết quả nhận xét "${g.qualitativeResult}" không hợp lệ (chỉ chấp nhận "Đạt" hoặc "Chưa đạt").` };
        }
      }
    } else {
      const scoreKeys = ['tx1', 'tx2', 'tx3', 'tx4', 'tx5', 'tx6', 'midterm', 'finalExam', 'average', 'tbHk1', 'tbHk2', 'tbCaNam'];
      for (const k of scoreKeys) {
        const val = g[k];
        if (val !== undefined && val !== null && val !== '') {
          const num = typeof val === 'number' ? val : Number(String(val).trim());
          if (isNaN(num) || !isFinite(num) || num < 0 || num > 10) {
            return { isValid: false, error: `Môn ${g.subjectName || ''}: Điểm "${val}" ở cột ${k} không hợp lệ (phải từ 0 đến 10).` };
          }
        }
      }
      if (Array.isArray(g.regularScores)) {
        for (const rVal of g.regularScores) {
          if (rVal !== undefined && rVal !== null && rVal !== '') {
            const num = typeof rVal === 'number' ? rVal : Number(String(rVal).trim());
            if (isNaN(num) || !isFinite(num) || num < 0 || num > 10) {
              return { isValid: false, error: `Môn ${g.subjectName || ''}: Điểm thường xuyên "${rVal}" không hợp lệ (phải từ 0 đến 10).` };
            }
          }
        }
      }
    }
  }
  return { isValid: true };
}

// POST /api/v1/academic/records - Teacher save academic data (Single record or Batch)
router.post('/records', requireRole('TEACHER', 'SUPER_ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const body = req.body;

  const rawRecords = Array.isArray(body)
    ? body
    : Array.isArray(body?.records)
    ? body.records
    : [body];

  if (rawRecords.length === 0 || !rawRecords[0]?.studentId) {
    return res.status(400).json({ success: false, errorCode: 'INVALID_PAYLOAD', message: 'Thiếu thông tin học sinh hoặc bảng điểm.' });
  }

  const savedList: any[] = [];
  const failedList: Array<{ studentId: string; studentName?: string; error: string }> = [];
  const preparedUpserts: Array<{
    student: any;
    recordId: string;
    normPeriod: string;
    academicYear: string;
    semester: string;
    scoresJson: string;
    conductScore: any;
    conductEvaluation: any;
    computedRank: any;
    computedGpa: any;
    attendanceSummaryJson: string | null;
    teacherEvaluation: any;
  }> = [];

  // Phase 1: Validate all records first so no partial writes occur on validation failure
  for (const item of rawRecords) {
    if (!item || !item.studentId || !item.scores) {
      failedList.push({ studentId: item?.studentId || 'unknown', error: 'Thiếu studentId hoặc dữ liệu scores.' });
      continue;
    }

    // Cross-tenant verification
    const student = studentRepository.getById(user.tenantId, item.studentId) || studentRepository.getByCode(user.tenantId, item.studentId);
    if (!student) {
      const otherStudent = studentRepository.findAnywhere(item.studentId);
      if (otherStudent) {
        failedList.push({
          studentId: item.studentId,
          error: '403 TENANT ISOLATION ERROR: Bạn không có quyền cập nhật bảng điểm cho học sinh lớp khác.'
        });
      } else {
        failedList.push({
          studentId: item.studentId,
          error: `Không tìm thấy học sinh với mã/ID "${item.studentId}" trong lớp.`
        });
      }
      continue;
    }

    // Validate scores
    const gradeValidation = validateGradesPayload(item.scores?.grades);
    if (!gradeValidation.isValid) {
      failedList.push({
        studentId: student.id,
        studentName: student.full_name,
        error: `Học sinh ${student.full_name}: ${gradeValidation.error}`
      });
      continue;
    }

    const normPeriod = normalizePeriodForServer(item.scores?.period || item.period);
    const rawNormPeriod = normPeriod.replace(/[-_\s]/g, '');
    const academicYear = item.academicYear || '2025 - 2026';
    const normYear = academicYear.replace(/[\s-]+/g, '_');

    const existingRecords = academicRepository.getByStudent(user.tenantId, student.id);
    const matchedExisting = existingRecords.find(r => {
      if (item.id && r.id === item.id) return true;
      if (r.academic_year && r.academic_year.trim() !== academicYear.trim()) return false;
      try {
        const p = JSON.parse(r.scores_json || '{}');
        const pPeriod = p.period ? normalizePeriodForServer(p.period) : undefined;
        if (pPeriod === normPeriod) return true;
      } catch {}
      const rIdClean = r.id.toLowerCase().replace(/[-_\s]/g, '');
      if (rIdClean.includes(rawNormPeriod)) return true;
      return false;
    });

    const recordId = matchedExisting ? matchedExisting.id : (item.id || `acad_${student.id}_${normPeriod}_${normYear}`);

    let computedGpa = item.gpa;
    const computedRank = item.academicRank;
    if ((computedGpa === undefined || computedRank === undefined) && item.scores?.grades && Array.isArray(item.scores.grades)) {
      const scoredGrades = item.scores.grades.filter((g: any) => typeof g.average === 'number' && !isNaN(g.average));
      if (scoredGrades.length > 0 && computedGpa === undefined) {
        computedGpa = Math.round((scoredGrades.reduce((sum: number, g: any) => sum + g.average, 0) / scoredGrades.length) * 10) / 10;
      }
    }

    preparedUpserts.push({
      student,
      recordId,
      normPeriod,
      academicYear,
      semester: item.semester || (normPeriod === 'full_year' ? 'Cả năm' : (normPeriod.includes('hk2') ? 'Học kỳ II' : 'Học kỳ I')),
      scoresJson: JSON.stringify(item.scores),
      conductScore: item.conductScore ?? null,
      conductEvaluation: item.conductEvaluation ?? null,
      computedRank: computedRank ?? null,
      computedGpa: computedGpa ?? null,
      attendanceSummaryJson: item.attendanceSummary ? JSON.stringify(item.attendanceSummary) : null,
      teacherEvaluation: item.teacherEvaluation || null
    });
  }

  const isBatch = Array.isArray(body) || Array.isArray(body?.records);

  // Block partial writes if any record in the request failed validation
  if (failedList.length > 0) {
    if (!isBatch && rawRecords.length === 1) {
      return res.status(400).json({
        success: false,
        errorCode: 'SAVE_FAILED',
        message: failedList[0].error,
        error: failedList[0].error
      });
    }
    return res.status(400).json({
      success: false,
      errorCode: 'VALIDATION_FAILED',
      message: failedList.map(f => f.error).join('; '),
      total: rawRecords.length,
      savedCount: 0,
      failedCount: failedList.length,
      failedDetails: failedList,
      data: []
    });
  }

  // Phase 2: Execute all database writes atomically in a single SQLite transaction
  try {
    academicRepository.runInTransaction(() => {
      for (const entry of preparedUpserts) {
        const saved = academicRepository.upsert({
          id: entry.recordId,
          tenant_id: user.tenantId,
          student_id: entry.student.id,
          academic_year: entry.academicYear,
          semester: entry.semester,
          scores_json: entry.scoresJson,
          conduct_score: entry.conductScore,
          conduct_evaluation: entry.conductEvaluation,
          academic_rank: entry.computedRank,
          gpa: entry.computedGpa,
          attendance_summary_json: entry.attendanceSummaryJson,
          teacher_evaluation: entry.teacherEvaluation
        });

        auditLogRepository.createLog({
          actorUserId: user.userId,
          actorRole: user.role,
          actorTenantId: user.tenantId,
          action: 'ACADEMIC_RECORD_SAVED',
          targetType: 'ACADEMIC_RECORD',
          targetId: entry.recordId,
          details: `Cập nhật kết quả học tập cho học sinh ${entry.student.full_name || entry.student.id} (${entry.normPeriod})`
        });

        savedList.push({ saved, entry });
      }
    });
  } catch (saveErr: any) {
    const errMsg = `Lỗi ghi dữ liệu vào cơ sở dữ liệu: ${saveErr?.message || 'Đã hoàn tác giao dịch để bảo toàn dữ liệu'}`;
    if (!isBatch && rawRecords.length === 1) {
      return res.status(500).json({
        success: false,
        errorCode: 'SAVE_FAILED',
        message: errMsg,
        error: errMsg
      });
    }
    return res.status(500).json({
      success: false,
      errorCode: 'SAVE_FAILED',
      message: errMsg,
      total: rawRecords.length,
      savedCount: 0,
      failedCount: rawRecords.length,
      failedDetails: preparedUpserts.map(u => ({
        studentId: u.student.id,
        studentName: u.student.full_name,
        error: errMsg
      })),
      data: []
    });
  }

  // Publish SSE events and schedule backup flush only after transaction commits
  for (const { saved, entry } of savedList) {
    eventHub.publish({
      id: `evt_acad_${entry.recordId}_${Date.now()}`,
      type: 'ACADEMIC_RECORD_UPDATED',
      tenantId: user.tenantId,
      actorId: user.userId,
      actorRole: user.role,
      targetRoles: ['TEACHER', 'STUDENT', 'CLASS_OFFICER', 'PARENT'],
      excludeUserIds: [user.userId],
      parentVisible: true,
      payload: {
        studentId: entry.student.id,
        period: entry.normPeriod,
        recordId: entry.recordId,
        updatedAt: saved.updated_at
      },
      timestamp: new Date().toISOString()
    });
  }

  const savedRows = savedList.map(s => s.saved);

  if (savedRows.length > 0) {
    try {
      persistenceSyncService.scheduleDebouncedFlush(1000);
    } catch {}
  }

  if (!isBatch && rawRecords.length === 1) {
    return res.json({ success: true, data: savedRows[0] });
  }

  return res.json({
    success: true,
    total: rawRecords.length,
    savedCount: savedRows.length,
    failedCount: 0,
    failedDetails: [],
    data: savedRows
  });
});

// POST /api/v1/academic/publish - Publish academic snapshot
router.post('/publish', requireRole('TEACHER', 'SUPER_ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const body = req.body;

  const snapshotId = `snap_${Date.now()}`;
  academicRepository.publishSnapshot({
    id: snapshotId,
    tenant_id: user.tenantId,
    academic_year: body.academicYear || '2025 - 2026',
    semester: body.semester || 'Học kỳ I',
    period_label: body.periodLabel || 'Tổng kết Học kỳ I',
    published_at: new Date().toISOString(),
    published_by: user.userId,
    snapshot_data_json: JSON.stringify(body.data || {}),
    status: 'PUBLISHED'
  });

  auditLogRepository.createLog({
    actorUserId: user.userId,
    actorRole: user.role,
    actorTenantId: user.tenantId,
    action: 'ACADEMIC_PUBLISHED',
    targetType: 'ACADEMIC_SNAPSHOT',
    targetId: snapshotId,
    details: `Xuất bản bảng điểm ${body.periodLabel}`
  });

  // Real-time Event Publication
  eventHub.publish({
    id: `evt_acad_${snapshotId}_${Date.now()}`,
    type: 'ACADEMIC_PUBLISHED',
    tenantId: user.tenantId,
    actorId: user.userId,
    actorRole: user.role,
    targetRoles: ['TEACHER', 'STUDENT', 'CLASS_OFFICER', 'PARENT'],
    excludeUserIds: [user.userId],
    parentVisible: true,
    payload: {
      snapshotId,
      periodLabel: body.periodLabel || 'Tổng kết Học kỳ I',
      academicYear: body.academicYear || '2025 - 2026',
      semester: body.semester || 'Học kỳ I'
    },
    notification: {
      title: `📊 Bảng điểm đã được công bố: ${body.periodLabel || 'Kết quả học tập'}`,
      message: `GVCN đã xuất bản bảng điểm chính thức (${body.periodLabel || 'Học kỳ I'}). Quý phụ huynh và học sinh có thể tra cứu chi tiết.`,
      type: 'success',
      linkTo: 'academic',
      category: 'academic'
    },
    timestamp: new Date().toISOString()
  });

  try {
    persistenceSyncService.scheduleDebouncedFlush(1000);
  } catch {}

  return res.json({ success: true, snapshotId });
});

// GET /api/v1/academic/snapshots
router.get('/snapshots', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const snapshots = academicRepository.getSnapshots(user.tenantId);
  return res.json({
    success: true,
    data: snapshots.map(s => ({
      id: s.id,
      academicYear: s.academic_year,
      semester: s.semester,
      periodLabel: s.period_label,
      publishedAt: s.published_at,
      status: s.status,
      data: JSON.parse(s.snapshot_data_json)
    }))
  });
});

export default router;
