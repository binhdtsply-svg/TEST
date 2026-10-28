import { Router, Response } from 'express';
import { AuthenticatedRequest, authenticateToken } from '../auth/middleware';
import { careerRepository } from '../repositories/CareerRepository';
import { auditLogRepository } from '../repositories/AuditLogRepository';

const router = Router();

router.use(authenticateToken);

// GET /api/v1/career
router.get('/', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const allProfiles = careerRepository.listByTenant(user.tenantId);

  let filtered = allProfiles;
  if (user.role === 'STUDENT' || user.role === 'CLASS_OFFICER') {
    filtered = allProfiles.filter(c => c.student_id === user.studentId);
  } else if (user.role === 'PARENT') {
    filtered = allProfiles.filter(c => c.student_id === user.childStudentId);
  }

  return res.json({
    success: true,
    data: filtered.map(c => ({
      id: c.id,
      studentId: c.student_id,
      riasecScores: JSON.parse(c.riasec_scores_json),
      primaryTraits: JSON.parse(c.primary_traits_json),
      recommendedCareers: JSON.parse(c.recommended_careers_json),
      studentAspirations: c.student_aspirations,
      hollandHistory: JSON.parse(c.holland_history_json || '[]'),
      mbtiResult: c.mbti_result_json ? JSON.parse(c.mbti_result_json) : null,
      workValuesResult: c.work_values_result_json ? JSON.parse(c.work_values_result_json) : null,
      assessmentsHistory: c.assessments_history_json ? JSON.parse(c.assessments_history_json) : [],
      updatedAt: c.updated_at
    }))
  });
});

// POST /api/v1/career - Save career assessment result
router.post('/', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const body = req.body;

  let targetStudentId = body.studentId;
  if (user.role === 'STUDENT' || user.role === 'CLASS_OFFICER') {
    targetStudentId = user.studentId!;
  }

  if (!targetStudentId) {
    return res.status(400).json({ success: false, errorCode: 'INVALID_PAYLOAD', message: 'Thiếu studentId.' });
  }

  const existing = careerRepository.getByStudent(user.tenantId, targetStudentId);
  const now = new Date().toISOString();
  const profileId = existing ? existing.id : `career_${targetStudentId}`;

  const history = existing ? JSON.parse(existing.holland_history_json || '[]') : [];
  if (body.riasecScores) {
    // Only push if different from last attempt or explicit new test
    const lastAttempt = history[history.length - 1];
    const isDuplicate = lastAttempt && JSON.stringify(lastAttempt.scores) === JSON.stringify(body.riasecScores);
    if (!isDuplicate || body.forceNewHistory) {
      history.push({
        testedAt: now,
        scores: body.riasecScores,
        primaryTraits: body.primaryTraits || []
      });
    }
  }

  // Preserve or update MBTI & Work Values
  let mbtiJson = existing?.mbti_result_json || '{}';
  if (body.mbtiResult !== undefined) {
    mbtiJson = JSON.stringify(body.mbtiResult || {});
  }

  let workValuesJson = existing?.work_values_result_json || '{}';
  if (body.workValuesResult !== undefined) {
    workValuesJson = JSON.stringify(body.workValuesResult || {});
  }

  let assessmentsHistoryJson = existing?.assessments_history_json || '[]';
  if (body.assessmentsHistory !== undefined) {
    assessmentsHistoryJson = JSON.stringify(body.assessmentsHistory || []);
  }

  const saved = careerRepository.upsert({
    id: profileId,
    tenant_id: user.tenantId,
    student_id: targetStudentId,
    riasec_scores_json: JSON.stringify(body.riasecScores || (existing ? JSON.parse(existing.riasec_scores_json) : {})),
    primary_traits_json: JSON.stringify(body.primaryTraits || (existing ? JSON.parse(existing.primary_traits_json) : [])),
    recommended_careers_json: JSON.stringify(body.recommendedCareers || (existing ? JSON.parse(existing.recommended_careers_json) : [])),
    student_aspirations: body.studentAspirations !== undefined ? body.studentAspirations : existing?.student_aspirations,
    holland_history_json: JSON.stringify(history),
    mbti_result_json: mbtiJson,
    work_values_result_json: workValuesJson,
    assessments_history_json: assessmentsHistoryJson
  });

  auditLogRepository.createLog({
    actorUserId: user.userId,
    actorRole: user.role,
    actorTenantId: user.tenantId,
    action: 'CAREER_PROFILE_UPDATED',
    targetType: 'CAREER_PROFILE',
    targetId: profileId,
    details: `Cập nhật hồ sơ hướng nghiệp cho học sinh ${targetStudentId}`
  });

  return res.json({ success: true, data: saved });
});

export default router;
