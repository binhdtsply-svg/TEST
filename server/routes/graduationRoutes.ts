import { Router, Response } from 'express';
import { AuthenticatedRequest, authenticateToken } from '../auth/middleware';
import { graduationRepository } from '../repositories/GraduationRepository';
import { auditLogRepository } from '../repositories/AuditLogRepository';
import { persistenceSyncService } from '../services/PersistenceSyncService';

import { studentRepository } from '../repositories/StudentRepository';

const router = Router();

router.use(authenticateToken);

function sanitizeGraduationChoiceForViewer(choice: Record<string, any>, role: string): Record<string, any> {
  if (!choice || typeof choice !== 'object') return {};
  if (role === 'TEACHER' || role === 'SUPER_ADMIN') {
    return choice;
  }
  // For STUDENT, CLASS_OFFICER, and PARENT: hide internal GVCN-only tracking flags
  const sanitized = { ...choice };
  delete sanitized.isFlagged;
  delete sanitized.flagReasons;
  return sanitized;
}

// GET /api/v1/graduation
router.get('/', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const allChoices = graduationRepository.listByTenant(user.tenantId);

  let filtered = allChoices;
  if (user.role === 'STUDENT' || user.role === 'CLASS_OFFICER') {
    filtered = allChoices.filter(c => c.student_id === user.studentId || c.student_id === user.userId);
  } else if (user.role === 'PARENT') {
    filtered = allChoices.filter(c => c.student_id === user.childStudentId);
  }

  return res.json({
    success: true,
    data: filtered.map(c => {
      let parsedInitial = {};
      let parsedCurrent = {};
      let parsedHistory = [];
      let parsedMock = [];
      try { parsedInitial = JSON.parse(c.initial_choice_json || '{}'); } catch {}
      try { parsedCurrent = JSON.parse(c.current_choice_json || '{}'); } catch {}
      try { parsedHistory = JSON.parse(c.history_json || '[]'); } catch {}
      try { parsedMock = c.mock_exam_results_json ? JSON.parse(c.mock_exam_results_json) : []; } catch {}

      return {
        id: c.id,
        studentId: c.student_id,
        initialChoice: sanitizeGraduationChoiceForViewer(parsedInitial, user.role),
        currentChoice: sanitizeGraduationChoiceForViewer(parsedCurrent, user.role),
        history: parsedHistory,
        mockExamResults: parsedMock,
        updatedAt: c.updated_at
      };
    })
  });
});

// POST /api/v1/graduation - Save/Update graduation orientation & tracking
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const body = req.body || {};

  let targetStudentId = body.studentId;
  if (user.role === 'STUDENT' || user.role === 'CLASS_OFFICER') {
    targetStudentId = user.studentId!;
  } else if (user.role === 'PARENT') {
    return res.status(403).json({ success: false, errorCode: 'ROLE_ACCESS_DENIED', message: 'Phụ huynh chỉ có quyền xem định hướng thi tốt nghiệp.' });
  }

  const incomingChoice = body.currentChoice || body;

  // 1. Resolve targetStudentId within current tenant by ID or by code directly on targetStudentId
  let studentRecord = targetStudentId
    ? (studentRepository.getById(user.tenantId, String(targetStudentId).trim()) ||
       studentRepository.getByCode(user.tenantId, String(targetStudentId).trim()))
    : null;

  // 2. Prevent cross-tenant leakage: if targetStudentId belongs to another tenant, reject immediately
  if (!studentRecord && targetStudentId) {
    const otherTenantStudent = studentRepository.findAnywhere(String(targetStudentId).trim());
    if (otherTenantStudent && otherTenantStudent.tenant_id !== user.tenantId) {
      return res.status(403).json({
        success: false,
        errorCode: 'TENANT_ACCESS_DENIED',
        message: 'Không được phép cập nhật dữ liệu thi tốt nghiệp của học viên thuộc lớp khác.'
      });
    }
  }

  // 3. Fallback to explicit studentCode within current tenant
  if (!studentRecord && (body.studentCode || incomingChoice?.studentCode)) {
    const codeCandidate = String(body.studentCode || incomingChoice?.studentCode).trim();
    studentRecord = studentRepository.getByCode(user.tenantId, codeCandidate);
  }

  if (studentRecord) {
    targetStudentId = studentRecord.id;
  }

  if (!targetStudentId) {
    return res.status(400).json({ success: false, errorCode: 'INVALID_PAYLOAD', message: 'Thiếu mã định danh học viên (studentId).' });
  }

  if (!studentRecord) {
    return res.status(404).json({
      success: false,
      errorCode: 'STUDENT_NOT_FOUND',
      message: 'Không tìm thấy hồ sơ học viên hợp lệ trong lớp hiện tại để lưu dữ liệu.'
    });
  }

  const existing = graduationRepository.getByStudent(user.tenantId, targetStudentId);
  const now = new Date().toISOString();
  const choiceId = existing ? existing.id : `grad_${targetStudentId}`;

  let prevChoice: Record<string, any> = {};
  if (existing?.current_choice_json) {
    try { prevChoice = JSON.parse(existing.current_choice_json); } catch {}
  }

  // Merge incoming fields onto existing choice so unrelated fields are never lost
  const currentChoice: Record<string, any> = {
    ...prevChoice,
    ...incomingChoice,
    studentId: targetStudentId,
    studentCode: studentRecord?.code || incomingChoice.studentCode || prevChoice.studentCode || '',
    studentName: studentRecord?.full_name || incomingChoice.studentName || prevChoice.studentName || '',
    studentGroup: studentRecord?.group_num || incomingChoice.studentGroup || prevChoice.studentGroup || 1,
    scores: {
      ...(prevChoice.scores || {}),
      ...(incomingChoice.scores || {})
    }
  };

  // If a student updates their own electives, preserve GVCN-only internal flags & teacherNote
  if (user.role === 'STUDENT' || user.role === 'CLASS_OFFICER') {
    if (prevChoice.isFlagged !== undefined) currentChoice.isFlagged = prevChoice.isFlagged;
    if (prevChoice.flagReasons !== undefined) currentChoice.flagReasons = prevChoice.flagReasons;
    if (prevChoice.teacherNote !== undefined) currentChoice.teacherNote = prevChoice.teacherNote;
  }

  let initialChoice = currentChoice;
  if (existing?.initial_choice_json) {
    try {
      const parsedInit = JSON.parse(existing.initial_choice_json);
      if (parsedInit && (parsedInit.electiveSubject1 || parsedInit.electiveSubject2)) {
        initialChoice = parsedInit;
      }
    } catch {}
  }

  let history: any[] = [];
  if (existing?.history_json) {
    try { history = JSON.parse(existing.history_json || '[]'); } catch {}
  }

  const electiveChanged =
    !existing ||
    currentChoice.electiveSubject1 !== prevChoice.electiveSubject1 ||
    currentChoice.electiveSubject2 !== prevChoice.electiveSubject2 ||
    Boolean(currentChoice.isForeignLanguageExempt) !== Boolean(prevChoice.isForeignLanguageExempt);

  if (electiveChanged && (currentChoice.electiveSubject1 || currentChoice.electiveSubject2)) {
    const actorLabel =
      currentChoice.updatedBy ||
      (user.role === 'TEACHER' ? 'Giáo viên chủ nhiệm' : 'Học viên');
    history.push({
      changedAt: currentChoice.updatedAt || now,
      changedBy: actorLabel,
      role: user.role,
      note: user.role === 'TEACHER'
        ? (history.length === 0 ? 'GVCN khởi tạo / nhập môn thi tự chọn' : 'GVCN cập nhật môn thi tự chọn tại Phần 4')
        : (history.length === 0 ? 'Học viên đăng ký môn thi tự chọn lần đầu' : 'Học viên cập nhật lại môn thi tự chọn'),
      data: {
        electiveSubject1: currentChoice.electiveSubject1,
        electiveSubject2: currentChoice.electiveSubject2,
        isForeignLanguageExempt: Boolean(currentChoice.isForeignLanguageExempt)
      }
    });
  }

  const saved = graduationRepository.upsert({
    id: choiceId,
    tenant_id: user.tenantId,
    student_id: targetStudentId,
    initial_choice_json: JSON.stringify(initialChoice),
    current_choice_json: JSON.stringify(currentChoice),
    history_json: JSON.stringify(history),
    mock_exam_results_json: body.mockExamResults ? JSON.stringify(body.mockExamResults) : (existing?.mock_exam_results_json || '[]')
  });

  // Synchronize graduationSummary directly into student record raw_metadata in SQLite
  if (studentRecord) {
    let rawMeta: Record<string, any> = {};
    if (studentRecord.raw_metadata) {
      try { rawMeta = JSON.parse(studentRecord.raw_metadata); } catch {}
    }
    const cleanReasons = Array.isArray(currentChoice.flagReasons) ? currentChoice.flagReasons : [];
    const cleanNote = typeof currentChoice.teacherNote === 'string' ? currentChoice.teacherNote : '';
    rawMeta.graduationSummary = {
      electiveSubject1: currentChoice.electiveSubject1,
      electiveSubject2: currentChoice.electiveSubject2,
      isForeignLanguageExempt: Boolean(currentChoice.isForeignLanguageExempt),
      scores: currentChoice.scores || {},
      gpa10: currentChoice.gpa10,
      gpa11: currentChoice.gpa11,
      gpa12: currentChoice.gpa12,
      gpaAllYears: currentChoice.gpaAllYears,
      priorityBonus: currentChoice.priorityBonus,
      encouragementBonus: currentChoice.encouragementBonus,
      calculatedScore: currentChoice.calculatedScore,
      status: currentChoice.status,
      statusReason: currentChoice.statusReason,
      isFlagged: Boolean(currentChoice.isFlagged || cleanNote.trim().length > 0 || cleanReasons.length > 0),
      flagReasons: cleanReasons,
      teacherNote: cleanNote,
      updatedAt: currentChoice.updatedAt || now,
      updatedBy: currentChoice.updatedBy || (user.role === 'TEACHER' ? 'Giáo viên chủ nhiệm' : 'Học viên')
    };
    studentRepository.update(user.tenantId, studentRecord.id, {
      raw_metadata: JSON.stringify(rawMeta)
    });
  }

  auditLogRepository.createLog({
    actorUserId: user.userId,
    actorRole: user.role,
    actorTenantId: user.tenantId,
    action: 'GRADUATION_UPDATED',
    targetType: 'GRADUATION_CHOICE',
    targetId: choiceId,
    details: `${user.role} cập nhật dữ liệu tốt nghiệp cho học sinh ${targetStudentId}`
  });

  // Ensure mutation is flushed and synced to Cloud Firestore
  try {
    await persistenceSyncService.flushAndSyncToCloudAsync({ forceFullSync: false, allowDeletes: true });
  } catch (err) {
    console.warn('[graduationRoutes] sync warning:', err);
  }

  return res.json({ success: true, data: sanitizeGraduationChoiceForViewer(saved, user.role) });
});

// DELETE /api/v1/graduation/:studentId - Delete graduation orientation
router.delete('/:studentId', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  let targetStudentId = req.params.studentId;

  if (user.role === 'PARENT') {
    return res.status(403).json({ success: false, errorCode: 'ROLE_ACCESS_DENIED', message: 'Phụ huynh chỉ có quyền xem, không được xóa dữ liệu.' });
  }

  if (user.role === 'STUDENT' || user.role === 'CLASS_OFFICER') {
    if (user.studentId !== targetStudentId) {
      return res.status(403).json({ success: false, errorCode: 'FORBIDDEN_USER', message: 'Học sinh chỉ có quyền xóa dữ liệu của chính mình.' });
    }
  }

  const existing = graduationRepository.getByStudent(user.tenantId, targetStudentId);
  if (!existing) {
    return res.json({ success: true, message: 'Bản ghi không tồn tại hoặc đã được xóa trước đó.' });
  }

  graduationRepository.deleteByStudent(user.tenantId, targetStudentId);

  auditLogRepository.createLog({
    actorUserId: user.userId,
    actorRole: user.role,
    actorTenantId: user.tenantId,
    action: 'GRADUATION_DELETED',
    targetType: 'GRADUATION_CHOICE',
    targetId: existing.id,
    details: `${user.role} xóa định hướng tốt nghiệp của học sinh ${targetStudentId}`
  });

  try {
    await persistenceSyncService.flushAndSyncToCloudAsync({ forceFullSync: false, allowDeletes: true });
  } catch (err) {
    console.warn('[graduationRoutes] delete sync warning:', err);
  }

  return res.json({ success: true, message: 'Đã xóa dữ liệu tốt nghiệp thành công.' });
});

export default router;
