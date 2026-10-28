import { Router, Response } from 'express';
import { AuthenticatedRequest, authenticateToken, requireRole } from '../auth/middleware';
import { surveyRepository } from '../repositories/SurveyRepository';
import { auditLogRepository } from '../repositories/AuditLogRepository';
import { eventHub } from '../events/EventHub';

const router = Router();

// Apply auth to all survey routes
router.use(authenticateToken);

// GET /api/v1/surveys/templates - Get active templates for tenant
router.get('/templates', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const templates = surveyRepository.getTemplatesByTenant(user.tenantId);
  const requestedScope = req.query.scope as string | undefined;

  const mapped = templates.map(t => {
    let sections: any[] = [];
    let meta: any = {};
    try {
      const parsed = JSON.parse(t.sections_json);
      if (Array.isArray(parsed)) {
        sections = parsed;
      } else if (parsed && parsed.sections) {
        sections = parsed.sections;
        meta = parsed.meta || {};
      }
    } catch {}

    const scope = t.scope || meta.scope || (t.creator_role === 'SUPER_ADMIN' ? 'SYSTEM' : 'CLASS');
    const creatorRole = t.creator_role || meta.creatorRole || (t.is_default ? 'SYSTEM' : 'TEACHER');
    const classId = t.class_id || meta.classId || 'class-12a1';
    const surveyType = t.survey_type || meta.surveyType || (t.is_default ? 'GRADE12_START_YEAR' : 'CUSTOM');
    const createdBy = t.created_by || meta.createdBy || (scope === 'SYSTEM' ? 'Ban Quản trị Hệ thống' : 'GVCN');
    let targetAudience = ['STUDENT'];
    if (t.target_audience_json) {
      try { targetAudience = JSON.parse(t.target_audience_json); } catch {}
    } else if (meta.targetAudience) {
      targetAudience = meta.targetAudience;
    }

    return {
      id: t.id,
      tenantId: t.tenant_id,
      classId,
      title: t.title,
      description: t.description || '',
      targetType: t.target_type,
      targetAudience,
      scope,
      creatorRole,
      createdBy,
      surveyType,
      academicYear: t.academic_year,
      schoolYear: t.academic_year,
      semester: t.semester,
      currentVersion: t.current_version,
      version: t.current_version,
      status: t.status,
      isDefault: Boolean(t.is_default),
      sections,
      createdAt: t.created_at,
      updatedAt: t.updated_at
    };
  });

  // Strict role and scope filtering
  let filtered = mapped;
  if (requestedScope) {
    filtered = filtered.filter(t => t.scope === requestedScope);
  } else if (user.role === 'SUPER_ADMIN') {
    // Super admin sees all templates
    filtered = mapped;
  } else if (user.role === 'TEACHER') {
    // GVCN sees:
    // 1) Surveys specifically targeting TEACHER (from Admin/School)
    // 2) Class surveys created by or assigned to this class
    // 3) Surveys targeting Student or Parent within the class
    filtered = filtered.filter(t => 
      (Array.isArray(t.targetAudience) && t.targetAudience.includes('TEACHER')) || 
      t.scope !== 'SYSTEM' || 
      t.creatorRole === 'TEACHER' ||
      (t.classId && (user as any).classId && t.classId === (user as any).classId)
    );
  } else if (user.role === 'STUDENT' || user.role === 'CLASS_OFFICER') {
    // Students/officers only see active published surveys intended for students
    filtered = filtered.filter(t => t.status === 'PUBLISHED' && Array.isArray(t.targetAudience) && t.targetAudience.includes('STUDENT'));
  } else if (user.role === 'PARENT') {
    // Parents only see active published surveys intended for parents
    filtered = filtered.filter(t => t.status === 'PUBLISHED' && Array.isArray(t.targetAudience) && t.targetAudience.includes('PARENT'));
  }

  return res.json({
    success: true,
    data: filtered
  });
});

// Helper to detect Admin / System-created templates
const isSystemOrAdminTemplate = (template: any): boolean => {
  if (!template) return false;
  if (template.creator_role === 'TEACHER' || template.scope === 'CLASS') return false;
  if (template.scope === 'SYSTEM' || template.creator_role === 'SUPER_ADMIN') return true;
  if (
    template.created_by &&
    (template.created_by.includes('Admin') ||
      template.created_by.includes('Ban Quản trị') ||
      template.created_by.includes('Ban Giám hiệu'))
  ) {
    return true;
  }
  try {
    const parsed = JSON.parse(template.sections_json);
    if (parsed && parsed.meta) {
      if (parsed.meta.creatorRole === 'TEACHER' || parsed.meta.scope === 'CLASS') return false;
      if (parsed.meta.scope === 'SYSTEM' || parsed.meta.creatorRole === 'SUPER_ADMIN') return true;
    }
  } catch {}
  return false;
};

// POST /api/v1/surveys/templates - Create/Update template (Teacher/Admin only)
router.post('/templates', requireRole('TEACHER', 'SUPER_ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const body = req.body;

  if (!body.title || !body.sections) {
    return res.status(400).json({ success: false, errorCode: 'INVALID_PAYLOAD', message: 'Tiêu đề và các phần khảo sát là bắt buộc.' });
  }

  const templateId = body.id || `survey_${Date.now()}`;

  // SECURITY ENFORCEMENT: Teachers cannot modify or overwrite Admin-created / System surveys
  if (user.role !== 'SUPER_ADMIN') {
    const existing = surveyRepository.getTemplateById(user.tenantId, templateId);
    if (existing && isSystemOrAdminTemplate(existing)) {
      return res.status(403).json({
        success: false,
        errorCode: 'FORBIDDEN_ADMIN_SURVEY',
        message: 'Khảo sát này do Ban Quản trị Hệ thống tạo. GVCN chỉ có quyền thực hiện hoặc xem phản hồi, không được sửa đổi cấu trúc biểu mẫu.'
      });
    }

    if (body.scope === 'SYSTEM' || body.creatorRole === 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        errorCode: 'FORBIDDEN_SCOPE',
        message: 'Chỉ Quản trị viên hệ thống (Admin) mới có quyền tạo khảo sát cấp hệ thống.'
      });
    }
  }
  const scope = body.scope || (user.role === 'SUPER_ADMIN' ? 'SYSTEM' : 'CLASS');
  const creatorRole = body.creatorRole || (user.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'TEACHER');
  const createdBy = body.createdBy || (scope === 'SYSTEM' ? 'Ban Quản trị Hệ thống' : (user as any).name || 'GVCN');
  const classId = body.classId || (user.role === 'TEACHER' ? (user as any).classId || (user as any).teacherId || 'class-12a1' : undefined);
  const surveyType = body.surveyType || 'CUSTOM';
  const targetAudience = body.targetAudience || (scope === 'SYSTEM' ? ['TEACHER', 'STUDENT', 'PARENT'] : ['STUDENT']);
  const academicYear = body.academicYear || body.schoolYear || '2025 - 2026';
  const semester = body.semester || 'Học kỳ I';
  const currentVersion = body.currentVersion || body.version || 1;
  const status = body.status || 'PUBLISHED';

  const saved = surveyRepository.upsertTemplate({
    id: templateId,
    tenant_id: user.tenantId,
    title: body.title,
    description: body.description || '',
    target_type: body.targetType || 'STUDENT',
    academic_year: academicYear,
    semester: semester,
    current_version: currentVersion,
    status: status,
    is_default: body.isDefault ? 1 : 0,
    sections_json: JSON.stringify({
      sections: body.sections,
      meta: {
        classId,
        scope,
        creatorRole,
        createdBy,
        surveyType,
        targetAudience,
        version: currentVersion
      }
    }),
    class_id: classId || null,
    created_by: createdBy,
    creator_role: creatorRole,
    scope: scope,
    survey_type: surveyType,
    target_audience_json: JSON.stringify(targetAudience)
  });

  auditLogRepository.createLog({
    actorUserId: user.userId,
    actorRole: user.role,
    actorTenantId: user.tenantId,
    action: 'SURVEY_TEMPLATE_SAVED',
    targetType: 'SURVEY_TEMPLATE',
    targetId: templateId,
    details: `Cập nhật biểu mẫu khảo sát: ${saved.title}`
  });

  // Real-time Event Publication
  eventHub.publish({
    id: `evt_survey_tpl_${templateId}_${Date.now()}`,
    type: 'SURVEY_TEMPLATE_SAVED',
    tenantId: user.tenantId,
    actorId: user.userId,
    actorRole: user.role,
    targetRoles: ['TEACHER', 'STUDENT', 'CLASS_OFFICER'],
    excludeUserIds: [user.userId],
    parentVisible: false,
    payload: {
      templateId: saved.id,
      title: saved.title,
      currentVersion: saved.current_version,
      status: saved.status
    },
    notification: {
      title: `📋 Biểu mẫu khảo sát mới: ${saved.title}`,
      message: `GVCN đã cập nhật biểu mẫu khảo sát trực tuyến "${saved.title}". Vui lòng kiểm tra và hoàn thành.`,
      type: 'info',
      linkTo: 'survey',
      category: 'academic'
    },
    timestamp: new Date().toISOString()
  });

  return res.json({
    success: true,
    data: {
      id: saved.id,
      title: saved.title,
      currentVersion: saved.current_version,
      status: saved.status
    }
  });
});

// PATCH /api/v1/surveys/templates/:id/rename - Rename an existing survey template (Teacher/Admin only)
router.patch('/templates/:id/rename', requireRole('TEACHER', 'SUPER_ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const templateId = req.params.id;
  const { title } = req.body;

  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({
      success: false,
      errorCode: 'INVALID_TITLE',
      message: 'Tên bài khảo sát không được để trống.'
    });
  }

  const existing = surveyRepository.getTemplateById(user.tenantId, templateId);
  if (!existing) {
    return res.status(404).json({
      success: false,
      errorCode: 'NOT_FOUND',
      message: 'Không tìm thấy bài khảo sát cần đổi tên.'
    });
  }

  if (user.role !== 'SUPER_ADMIN' && isSystemOrAdminTemplate(existing)) {
    return res.status(403).json({
      success: false,
      errorCode: 'FORBIDDEN_ADMIN_SURVEY',
      message: 'Khảo sát này do Ban Quản trị Hệ thống tạo. GVCN không có quyền đổi tên.'
    });
  }

  const updated = surveyRepository.updateTemplateTitle(user.tenantId, templateId, title.trim());
  if (!updated) {
    return res.status(500).json({
      success: false,
      errorCode: 'UPDATE_FAILED',
      message: 'Lỗi khi cập nhật tên bài khảo sát.'
    });
  }

  auditLogRepository.createLog({
    actorUserId: user.userId,
    actorRole: user.role,
    actorTenantId: user.tenantId,
    action: 'SURVEY_TEMPLATE_RENAMED',
    targetType: 'SURVEY_TEMPLATE',
    targetId: templateId,
    details: `Đổi tên bài khảo sát từ "${existing.title}" thành "${updated.title}"`
  });

  // Real-time Event Publication
  eventHub.publish({
    id: `evt_survey_renamed_${templateId}_${Date.now()}`,
    type: 'SURVEY_TEMPLATE_SAVED',
    tenantId: user.tenantId,
    actorId: user.userId,
    actorRole: user.role,
    targetRoles: ['TEACHER', 'STUDENT', 'CLASS_OFFICER'],
    excludeUserIds: [user.userId],
    parentVisible: false,
    payload: {
      templateId: updated.id,
      title: updated.title,
      currentVersion: updated.current_version,
      status: updated.status
    },
    notification: {
      title: `📋 Cập nhật tên khảo sát: ${updated.title}`,
      message: `Bài khảo sát đã được đổi tên thành "${updated.title}".`,
      type: 'info',
      linkTo: 'survey',
      category: 'academic'
    },
    timestamp: new Date().toISOString()
  });

  return res.json({
    success: true,
    data: {
      id: updated.id,
      title: updated.title,
      currentVersion: updated.current_version,
      status: updated.status,
      updatedAt: updated.updated_at
    }
  });
});

// DELETE /api/v1/surveys/templates/:id - Delete a DRAFT survey template without responses (Teacher/Admin only)
router.delete('/templates/:id', requireRole('TEACHER', 'SUPER_ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const templateId = req.params.id;

  const existing = surveyRepository.getTemplateById(user.tenantId, templateId);
  if (!existing) {
    return res.status(404).json({
      success: false,
      errorCode: 'NOT_FOUND',
      message: 'Không tìm thấy bài khảo sát cần xóa.'
    });
  }

  if (user.role !== 'SUPER_ADMIN' && isSystemOrAdminTemplate(existing)) {
    return res.status(403).json({
      success: false,
      errorCode: 'FORBIDDEN_ADMIN_SURVEY',
      message: 'Khảo sát này do Ban Quản trị Hệ thống tạo. GVCN không có quyền xóa.'
    });
  }

  const responseCount = surveyRepository.getResponseCountByTemplate(user.tenantId, templateId);

  // DATA PROTECTION RULE: Surveys with responses must not be hard deleted
  if (responseCount > 0) {
    return res.status(400).json({
      success: false,
      errorCode: 'SURVEY_HAS_RESPONSES',
      message: 'Bài khảo sát này đã có dữ liệu phản hồi nên không thể xóa hoàn toàn để bảo vệ lịch sử. Bạn có thể lưu trữ bài khảo sát.',
      canArchive: true
    });
  }

  const deleted = surveyRepository.deleteTemplate(user.tenantId, templateId);
  if (!deleted) {
    return res.status(500).json({
      success: false,
      errorCode: 'DELETE_FAILED',
      message: 'Lỗi khi xóa bài khảo sát.'
    });
  }

  auditLogRepository.createLog({
    actorUserId: user.userId,
    actorRole: user.role,
    actorTenantId: user.tenantId,
    action: 'SURVEY_TEMPLATE_DELETED',
    targetType: 'SURVEY_TEMPLATE',
    targetId: templateId,
    details: `Xóa bản nháp bài khảo sát: ${existing.title}`
  });

  return res.json({
    success: true,
    message: 'Đã xóa bản nháp bài khảo sát thành công.'
  });
});

// POST /api/v1/surveys/templates/:id/archive - Archive a survey template (Teacher/Admin only)
router.post('/templates/:id/archive', requireRole('TEACHER', 'SUPER_ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const templateId = req.params.id;

  const existing = surveyRepository.getTemplateById(user.tenantId, templateId);
  if (!existing) {
    return res.status(404).json({
      success: false,
      errorCode: 'NOT_FOUND',
      message: 'Không tìm thấy bài khảo sát cần lưu trữ.'
    });
  }

  if (user.role !== 'SUPER_ADMIN' && isSystemOrAdminTemplate(existing)) {
    return res.status(403).json({
      success: false,
      errorCode: 'FORBIDDEN_ADMIN_SURVEY',
      message: 'Khảo sát này do Ban Quản trị Hệ thống tạo. GVCN không có quyền lưu trữ hoặc đóng khảo sát.'
    });
  }

  const archived = surveyRepository.archiveTemplate(user.tenantId, templateId);
  if (!archived) {
    return res.status(500).json({
      success: false,
      errorCode: 'ARCHIVE_FAILED',
      message: 'Lỗi khi lưu trữ bài khảo sát.'
    });
  }

  auditLogRepository.createLog({
    actorUserId: user.userId,
    actorRole: user.role,
    actorTenantId: user.tenantId,
    action: 'SURVEY_TEMPLATE_ARCHIVED',
    targetType: 'SURVEY_TEMPLATE',
    targetId: templateId,
    details: `Lưu trữ bài khảo sát: ${existing.title}`
  });

  return res.json({
    success: true,
    data: {
      id: archived.id,
      title: archived.title,
      status: archived.status,
      updatedAt: archived.updated_at
    },
    message: 'Đã lưu trữ bài khảo sát thành công.'
  });
});

// GET /api/v1/surveys/responses - Get responses with strict role isolation
router.get('/responses', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const allResponses = surveyRepository.getResponsesByTenant(user.tenantId);

  if (user.role === 'PARENT') {
    // Parents only see their own completed or draft surveys (matching parent_studentId or studentId)
    const parentKey = user.studentId ? `parent_${user.studentId}` : `parent_${user.userId}`;
    const ownResponses = allResponses.filter(r => r.student_id === parentKey || (user.studentId && r.student_id === user.studentId));
    return res.json({
      success: true,
      data: ownResponses.map(r => ({
        id: r.id,
        templateId: r.template_id,
        templateVersion: r.template_version,
        studentId: r.student_id,
        status: r.status,
        answers: JSON.parse(r.raw_answers_json),
        submittedAt: r.submitted_at,
        reviewedAt: r.reviewed_at
      }))
    });
  }

  if (user.role === 'STUDENT' || user.role === 'CLASS_OFFICER') {
    const ownResponses = allResponses.filter(r => r.student_id === user.studentId);
    return res.json({
      success: true,
      data: ownResponses.map(r => ({
        id: r.id,
        templateId: r.template_id,
        templateVersion: r.template_version,
        studentId: r.student_id,
        status: r.status,
        answers: JSON.parse(r.raw_answers_json),
        submittedAt: r.submitted_at,
        reviewedAt: r.reviewed_at
      }))
    });
  }

  // Teacher / Super Admin view
  return res.json({
    success: true,
    data: allResponses.map(r => ({
      id: r.id,
      templateId: r.template_id,
      templateVersion: r.template_version,
      studentId: r.student_id,
      status: r.status,
      answers: JSON.parse(r.raw_answers_json),
      sensitiveAnswers: r.sensitive_answers_json ? JSON.parse(r.sensitive_answers_json) : undefined,
      submittedAt: r.submitted_at,
      reviewedAt: r.reviewed_at,
      reviewedBy: r.reviewed_by
    }))
  });
});

// POST /api/v1/surveys/responses - Submit or save draft survey response
router.post('/responses', requireRole('STUDENT', 'CLASS_OFFICER', 'TEACHER', 'SUPER_ADMIN', 'PARENT'), (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const body = req.body;

  let targetStudentId = body.studentId;
  if (user.role === 'STUDENT' || user.role === 'CLASS_OFFICER') {
    if (body.studentId && body.studentId !== user.studentId) {
      return res.status(403).json({
        success: false,
        errorCode: 'FORBIDDEN_OTHER_STUDENT',
        message: 'Bạn không có quyền gửi khảo sát thay học sinh khác.'
      });
    }
    targetStudentId = user.studentId!;
  } else if (user.role === 'PARENT') {
    if (body.studentId && user.childStudentId && body.studentId !== user.childStudentId && body.studentId !== `parent_${user.childStudentId}`) {
      return res.status(403).json({
        success: false,
        errorCode: 'FORBIDDEN_OTHER_STUDENT',
        message: 'Bạn không có quyền gửi khảo sát cho học sinh khác.'
      });
    }
    targetStudentId = user.childStudentId ? (body.targetType === 'STUDENT' ? user.childStudentId : `parent_${user.childStudentId}`) : `parent_${user.userId}`;
  } else if (user.role === 'TEACHER') {
    targetStudentId = body.studentId || (user as any).teacherId || `teacher_${user.userId}`;
  }

  if (!targetStudentId || !body.templateId) {
    return res.status(400).json({ success: false, errorCode: 'INVALID_PAYLOAD', message: 'Thiếu thông tin templateId hoặc studentId.' });
  }

  const responseId = body.id || `resp_${targetStudentId}_${body.templateId}`;
  const now = new Date().toISOString();

  const saved = surveyRepository.upsertResponse({
    id: responseId,
    tenant_id: user.tenantId,
    template_id: body.templateId,
    template_version: body.templateVersion || 1,
    student_id: targetStudentId,
    status: body.status || 'SUBMITTED',
    raw_answers_json: JSON.stringify(body.answers || {}),
    sensitive_answers_json: body.sensitiveAnswers ? JSON.stringify(body.sensitiveAnswers) : null,
    submitted_at: body.status === 'DRAFT' ? null : (body.submittedAt || now)
  });

  auditLogRepository.createLog({
    actorUserId: user.userId,
    actorRole: user.role,
    actorTenantId: user.tenantId,
    action: body.status === 'DRAFT' ? 'SURVEY_DRAFT_SAVED' : 'SURVEY_SUBMITTED',
    targetType: 'SURVEY_RESPONSE',
    targetId: responseId,
    details: `Người dùng ${user.role} (${targetStudentId}) nộp khảo sát ${body.templateId}`
  });

  if (saved.status === 'SUBMITTED') {
    // Real-time Event Publication
    eventHub.publish({
      id: `evt_survey_sub_${saved.id}_${Date.now()}`,
      type: 'SURVEY_SUBMITTED',
      tenantId: user.tenantId,
      actorId: user.userId,
      actorRole: user.role,
      targetRoles: ['TEACHER', 'SUPER_ADMIN'],
      excludeUserIds: [user.userId],
      parentVisible: false,
      payload: {
        responseId: saved.id,
        templateId: saved.template_id,
        studentId: saved.student_id,
        status: saved.status,
        submittedAt: saved.submitted_at
      },
      notification: {
        title: `📝 Học sinh hoàn thành khảo sát`,
        message: `Học sinh (Mã: ${targetStudentId}) vừa hoàn thành và gửi phản hồi phiếu khảo sát trực tuyến.`,
        type: 'success',
        linkTo: 'survey',
        category: 'academic'
      },
      timestamp: now
    });
  }

  return res.json({
    success: true,
    data: {
      id: saved.id,
      studentId: saved.student_id,
      status: saved.status,
      submittedAt: saved.submitted_at
    }
  });
});

// GET /api/v1/surveys/proposals - Get sync proposals (Teacher only)
router.get('/proposals', requireRole('TEACHER', 'SUPER_ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const templateId = typeof req.query.templateId === 'string' ? req.query.templateId : undefined;
  const surveyId = typeof req.query.surveyId === 'string' ? req.query.surveyId : undefined;

  const proposals = surveyRepository.getProposalsByTenant(user.tenantId, { templateId, surveyId });
  return res.json({ success: true, data: proposals });
});

// POST /api/v1/surveys/parse-google-form-url - Parse public Google Form from URL
router.post('/parse-google-form-url', requireRole('TEACHER', 'SUPER_ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  const { url } = req.body;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'INVALID_URL',
      message: 'Vui lòng cung cấp liên kết Google Forms hợp lệ.'
    });
  }

  const trimmedUrl = url.trim();

  // Validate domain
  if (!trimmedUrl.includes('docs.google.com/forms') && !trimmedUrl.includes('forms.gle')) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_DOMAIN',
      message: 'Liên kết không phải là Google Forms hợp lệ. Vui lòng nhập liên kết bắt đầu bằng https://docs.google.com/forms/... hoặc https://forms.gle/...'
    });
  }

  try {
    // Normalise URL to viewform if it is /edit
    let targetFetchUrl = trimmedUrl;
    if (targetFetchUrl.includes('/forms/d/') && targetFetchUrl.includes('/edit')) {
      targetFetchUrl = targetFetchUrl.replace(/\/edit.*$/, '/viewform');
    }

    const response = await fetch(targetFetchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'vi,en-US;q=0.9,en;q=0.8'
      },
      redirect: 'follow'
    });

    if (!response.ok) {
      return res.status(400).json({
        success: false,
        error: 'ACCESS_DENIED',
        message: 'Không thể truy cập Google Forms này (yêu cầu quyền xem hoặc biểu mẫu bị khóa). Vui lòng chuyển sang tab "Dán nội dung" để nhập câu hỏi trực tiếp.'
      });
    }

    const html = await response.text();

    // Look for FB_PUBLIC_LOAD_DATA_
    const match = html.match(/FB_PUBLIC_LOAD_DATA_\s*=\s*(\[[\s\S]+?\]);\s*<\/script>/);
    if (!match || !match[1]) {
      return res.status(400).json({
        success: false,
        error: 'CANNOT_EXTRACT',
        message: 'Không tìm thấy cấu trúc biểu mẫu công khai trong liên kết này (có thể biểu mẫu yêu cầu đăng nhập tài khoản tổ chức). Vui lòng mở biểu mẫu, sao chép văn bản câu hỏi và dùng mục "Dán nội dung".'
      });
    }

    let parsedData: any;
    try {
      parsedData = JSON.parse(match[1]);
    } catch {
      return res.status(400).json({
        success: false,
        error: 'PARSE_FAILED',
        message: 'Lỗi khi giải mã dữ liệu Google Form. Vui lòng dùng mục "Dán nội dung".'
      });
    }

    const formDetails = parsedData[1];
    if (!formDetails || !Array.isArray(formDetails)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_FORM_DATA',
        message: 'Cấu trúc Google Form không đúng định dạng chuẩn. Vui lòng dùng mục "Dán nội dung".'
      });
    }

    const formTitle = formDetails[8] || formDetails[0] || 'Khảo sát Google Form';
    const formDescription = formDetails[0] && formDetails[0] !== formTitle ? formDetails[0] : '';
    const rawItems: any[] = formDetails[1] || [];

    const sections: any[] = [];
    let currentSection: any = {
      id: `sec-gf-${Date.now()}-1`,
      title: 'Phần 1: Thông tin khảo sát',
      order: 1,
      questions: []
    };
    let questionIndex = 1;
    let sectionIndex = 1;

    for (const item of rawItems) {
      if (!item || !Array.isArray(item)) continue;

      const title = item[1] || '';
      const description = item[2] || '';
      const itemType = item[3];

      // Item type 8 is Section Header / Page break in Google Forms
      if (itemType === 8) {
        if (currentSection.questions.length > 0 || currentSection.title) {
          sections.push(currentSection);
        }
        sectionIndex++;
        questionIndex = 1;
        currentSection = {
          id: `sec-gf-${Date.now()}-${sectionIndex}`,
          title: title || `Phần ${sectionIndex}`,
          description: description || undefined,
          order: sectionIndex,
          questions: []
        };
        continue;
      }

      // Question metadata
      let qType: string = 'SHORT_TEXT';
      let options: string[] | undefined = undefined;
      let required = false;
      let allowOther = false;
      let scaleMin: number | undefined = undefined;
      let scaleMax: number | undefined = undefined;
      let scaleMinLabel: string | undefined = undefined;
      let scaleMaxLabel: string | undefined = undefined;

      const itemPayload = item[4] && item[4][0];
      if (itemPayload) {
        required = itemPayload[2] === 1;

        // Options
        if (Array.isArray(itemPayload[1])) {
          options = itemPayload[1]
            .map((opt: any) => (Array.isArray(opt) ? opt[0] : opt))
            .filter(Boolean);
        }

        // Allow other
        allowOther = itemPayload[8] === 1;
      }

      switch (itemType) {
        case 0:
          qType = 'SHORT_TEXT';
          break;
        case 1:
          qType = 'LONG_TEXT';
          break;
        case 2:
          qType = 'SINGLE_CHOICE';
          break;
        case 3:
          qType = 'DROPDOWN';
          break;
        case 4:
          qType = 'MULTI_CHOICE';
          break;
        case 5:
          qType = 'SCALE';
          if (itemPayload && itemPayload[3]) {
            scaleMin = parseInt(itemPayload[3][0], 10) || 1;
            scaleMax = parseInt(itemPayload[3][1], 10) || 5;
          } else {
            scaleMin = 1;
            scaleMax = 5;
          }
          if (itemPayload && itemPayload[4]) {
            scaleMinLabel = itemPayload[4][0] || undefined;
            scaleMaxLabel = itemPayload[4][1] || undefined;
          }
          break;
        case 7:
          qType = 'GRID';
          break;
        case 9:
          qType = 'DATE';
          break;
        case 10:
          qType = 'TIME';
          break;
        case 11:
          qType = 'DURATION';
          break;
        default:
          qType = options && options.length > 0 ? 'SINGLE_CHOICE' : 'SHORT_TEXT';
      }

      currentSection.questions.push({
        id: `q-gf-${Date.now()}-${sectionIndex}-${questionIndex}`,
        key: `q_gf_${sectionIndex}_${questionIndex}`,
        title: title || `Câu hỏi ${questionIndex}`,
        description: description || undefined,
        type: qType,
        required,
        options: options && options.length > 0 ? options : undefined,
        allowOther: qType === 'SINGLE_CHOICE' || qType === 'MULTI_CHOICE' ? allowOther : undefined,
        scaleMin,
        scaleMax,
        scaleMinLabel,
        scaleMaxLabel,
        dateIncludeYear: qType === 'DATE' ? true : undefined,
        visibility: 'NORMAL',
        order: questionIndex
      });

      questionIndex++;
    }

    if (currentSection.questions.length > 0 || currentSection.title) {
      sections.push(currentSection);
    }

    const totalQuestions = sections.reduce((acc, s) => acc + (s.questions?.length || 0), 0);

    return res.json({
      success: true,
      title: formTitle,
      description: formDescription,
      sections,
      totalQuestions,
      totalSections: sections.length,
      url: trimmedUrl
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: err.message || 'Lỗi khi tải dữ liệu từ Google Forms.'
    });
  }
});

// POST /api/v1/surveys/fetch-google-form-api - Secure Server Proxy to Google Forms API
router.post('/fetch-google-form-api', requireRole('TEACHER', 'SUPER_ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  const { formId, accessToken: bodyToken } = req.body;
  const token = (req.headers['x-google-access-token'] as string) || bodyToken;

  if (!formId || typeof formId !== 'string') {
    return res.status(400).json({
      success: false,
      errorCode: 'GOOGLE_EDITOR_FORM_ID_REQUIRED',
      message: 'Vui lòng cung cấp mã ID Google Form hợp lệ.'
    });
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      errorCode: 'GOOGLE_TOKEN_EXPIRED',
      message: 'Vui lòng kết nối tài khoản Google trước khi nạp cấu trúc Form.'
    });
  }

  try {
    const gfResponse = await fetch(`https://forms.googleapis.com/v1/forms/${encodeURIComponent(formId.trim())}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json'
      }
    });

    if (gfResponse.status === 401) {
      return res.status(401).json({
        success: false,
        errorCode: 'GOOGLE_TOKEN_EXPIRED',
        message: 'Phiên kết nối Google đã hết hạn. Vui lòng kết nối lại.'
      });
    }

    if (gfResponse.status === 403) {
      return res.status(403).json({
        success: false,
        errorCode: 'GOOGLE_PERMISSION_DENIED',
        message: 'Không tìm thấy Google Form hoặc tài khoản hiện tại không có quyền truy cập.'
      });
    }

    if (gfResponse.status === 404) {
      return res.status(404).json({
        success: false,
        errorCode: 'GOOGLE_FORM_NOT_FOUND',
        message: 'Không tìm thấy Google Form hoặc tài khoản hiện tại không có quyền truy cập.'
      });
    }

    if (!gfResponse.ok) {
      return res.status(gfResponse.status).json({
        success: false,
        errorCode: 'GOOGLE_API_FAILED',
        message: 'Không tìm thấy Google Form hoặc tài khoản hiện tại không có quyền truy cập.'
      });
    }

    const formData = await gfResponse.json();
    return res.json({
      success: true,
      data: formData
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      errorCode: 'GOOGLE_API_FAILED',
      message: err.message || 'Lỗi khi kết nối đến máy chủ Google Forms API.'
    });
  }
});

export default router;
