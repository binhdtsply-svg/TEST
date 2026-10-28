import { Router, Response } from 'express';
import { getDb } from '../db/database';
import { classSettingsRepository, ClassSettingsRecord } from '../repositories/ClassSettingsRepository';
import { teacherAccountRepository } from '../repositories/TeacherAccountRepository';
import { tenantRepository } from '../repositories/TenantRepository';
import { studentRepository } from '../repositories/StudentRepository';
import { auditLogRepository } from '../repositories/AuditLogRepository';
import { persistenceSyncService } from '../services/PersistenceSyncService';
import { eventHub } from '../events/EventHub';
import { authenticateToken, requireTenantAccess, AuthenticatedRequest } from '../auth/middleware';
import { sanitizeClassSettingsRecord } from '../utils/sanitizers';

export const classSettingsRouter = Router();

function getSystemItemsForTenant(prefix: string, tenantId: string): any[] {
  const db = getDb();
  const keyPrefix = `${prefix}__${tenantId}__%`;
  const rows = db
    .prepare('SELECT key, value_json, updated_at FROM system_settings WHERE key LIKE ? ORDER BY updated_at DESC')
    .all(keyPrefix) as Array<{ key: string; value_json: string; updated_at: string }>;
  const items: any[] = [];
  for (const r of rows) {
    try {
      const parsed = JSON.parse(r.value_json);
      if (parsed && !parsed._deleted) {
        items.push(parsed);
      }
    } catch {}
  }
  return items;
}

function getSystemItemById(prefix: string, tenantId: string, id: string): any | null {
  const db = getDb();
  const key = `${prefix}__${tenantId}__${id}`;
  const row = db
    .prepare('SELECT value_json FROM system_settings WHERE key = ?')
    .get(key) as { value_json: string } | undefined;
  if (!row) return null;
  try {
    const parsed = JSON.parse(row.value_json);
    if (parsed && !parsed._deleted) return parsed;
    return null;
  } catch {
    return null;
  }
}

function findSystemItemAnywhere(prefix: string, id: string): { tenantId: string; item: any } | null {
  const db = getDb();
  const suffix = `%__${id}`;
  const rows = db
    .prepare('SELECT key, value_json FROM system_settings WHERE key LIKE ? AND key LIKE ?')
    .all(`${prefix}__%`, suffix) as Array<{ key: string; value_json: string }>;
  for (const r of rows) {
    const parts = r.key.split('__');
    if (parts.length >= 3 && parts[0] === prefix && parts.slice(2).join('__') === id) {
      try {
        const parsed = JSON.parse(r.value_json);
        if (parsed && !parsed._deleted) {
          return { tenantId: parts[1], item: parsed };
        }
      } catch {}
    }
  }
  return null;
}

function saveSystemItem(prefix: string, tenantId: string, id: string, item: any, updatedBy: string): void {
  const db = getDb();
  const key = `${prefix}__${tenantId}__${id}`;
  const now = new Date().toISOString();
  db.prepare(`
    INSERT OR REPLACE INTO system_settings (key, value_json, updated_at, updated_by)
    VALUES (?, ?, ?, ?)
  `).run(key, JSON.stringify(item), now, updatedBy);
  persistenceSyncService.flushToPersistentBackup();
}

function deleteSystemItem(prefix: string, tenantId: string, id: string, updatedBy: string, hardDelete = false): void {
  const db = getDb();
  const key = `${prefix}__${tenantId}__${id}`;
  if (hardDelete) {
    db.prepare('DELETE FROM system_settings WHERE key = ?').run(key);
  } else {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT OR REPLACE INTO system_settings (key, value_json, updated_at, updated_by)
      VALUES (?, ?, ?, ?)
    `).run(key, JSON.stringify({ id, tenantId, _deleted: true, deletedAt: now }), now, updatedBy);
  }
  persistenceSyncService.flushToPersistentBackup();
}

function resolveScopedTenantId(req: AuthenticatedRequest, res: Response): string | null {
  const user = req.user!;
  const queryTenant = req.query.tenantId ? String(req.query.tenantId).trim() : undefined;
  const bodyTenant = req.body && req.body.tenantId ? String(req.body.tenantId).trim() : undefined;
  if (user.role === 'SUPER_ADMIN') {
    return bodyTenant || queryTenant || user.tenantId;
  }
  if ((queryTenant && queryTenant !== user.tenantId) || (bodyTenant && bodyTenant !== user.tenantId)) {
    res.status(403).json({
      success: false,
      errorCode: 'TENANT_ACCESS_DENIED',
      message: '403 TENANT ISOLATION ERROR: Bạn không có quyền truy cập hoặc thao tác dữ liệu của lớp khác.'
    });
    return null;
  }
  return user.tenantId;
}

// Apply auth & tenant middleware
classSettingsRouter.use(authenticateToken);
classSettingsRouter.use(requireTenantAccess);

// 1. GET /api/v1/class-settings - Get class settings for authenticated tenant
classSettingsRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  let tenantId = user.tenantId;

  if (user.role === 'SUPER_ADMIN') {
    tenantId = req.query.tenantId ? String(req.query.tenantId).trim() : user.tenantId;
  } else if (user.role === 'TEACHER') {
    // Strict isolation: TEACHER is strictly authoritative for their authenticated tenantId
    tenantId = user.tenantId;
  }

  let settings = classSettingsRepository.getByTenantAndClass(tenantId);
  if (!settings) {
    // If Super Admin accesses platform-root without class settings, return empty/default
    if (user.role === 'SUPER_ADMIN') {
      return res.json({
        success: true,
        data: null
      });
    }

    // Auto-initialize class settings for this tenant to prevent falling back to another teacher's settings
    const teacherAcc = teacherAccountRepository.getByTeacherId(user.teacherId || user.userId)
      || teacherAccountRepository.getByTenantId(tenantId);
    const tenant = tenantRepository.getById(tenantId);
    const ownerName = teacherAcc?.full_name || tenant?.owner_name || 'Giáo viên Chủ nhiệm';
    const schoolName = tenant?.school_name || 'Trường THPT';
    const activeStudentCount = studentRepository.countByTenant(tenantId);

    const defaultRecord: ClassSettingsRecord = {
      tenant_id: tenantId,
      class_id: `class-${tenantId}`,
      school_name: schoolName,
      class_name: '10A1',
      grade: '10',
      stream: 'KHTN',
      academic_year: '2025 - 2026',
      semester: 'Học kỳ I',
      teacher_name: ownerName,
      teacher_phone: teacherAcc?.phone || '',
      teacher_email: teacherAcc?.email || '',
      slogan: `Không gian Chủ nhiệm Lớp 10A1 - ${schoolName}`,
      cover_image: null,
      total_students: activeStudentCount,
      theme_json: JSON.stringify({ primaryColor: '#059669', primaryButton: '#059669' }),
      subjects_json: JSON.stringify([]),
      interaction_settings_json: null,
      google_integration_json: null,
      zalo_settings_json: null,
      ai_config_json: null,
      school_year_timeline_json: null,
      raw_metadata: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    settings = classSettingsRepository.upsert(defaultRecord);
  } else {
    // Reconcile total_students & raw_metadata.confirmedTotalStudents with active student count in students table
    const activeStudentCount = studentRepository.countByTenant(tenantId);
    let rawMetaObj: Record<string, any> = {};
    let metaNeedsSync = false;
    if (settings.raw_metadata) {
      try {
        rawMetaObj = JSON.parse(settings.raw_metadata);
        if (rawMetaObj.confirmedTotalStudents !== undefined && rawMetaObj.confirmedTotalStudents !== activeStudentCount) {
          rawMetaObj.confirmedTotalStudents = activeStudentCount;
          metaNeedsSync = true;
        }
      } catch {}
    }
    if (settings.total_students !== activeStudentCount || metaNeedsSync) {
      const syncUpdates: Partial<ClassSettingsRecord> = { total_students: activeStudentCount };
      if (metaNeedsSync) {
        syncUpdates.raw_metadata = JSON.stringify(rawMetaObj);
      }
      settings = classSettingsRepository.update(tenantId, settings.class_id, syncUpdates) || settings;
      persistenceSyncService.flushToPersistentBackup();
    }
  }

  return res.json({
    success: true,
    data: sanitizeClassSettingsRecord(settings, user)
  });
});

// 2. PATCH /api/v1/class-settings - Update class settings (TEACHER and SUPER_ADMIN)
classSettingsRouter.patch('/', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const data = req.body || {};

  const isTeacherOrAdmin = user.role === 'TEACHER' || user.role === 'SUPER_ADMIN';
  const isStudentRole = user.role === 'STUDENT' || user.role === 'CLASS_OFFICER';
  const isPersonalGoalsOnlyUpdate =
    isStudentRole &&
    Array.isArray(data.personalGoals) &&
    Object.keys(data).every(k => k === 'personalGoals' || k === 'tenantId');

  // Strict Role Check: TEACHER and SUPER_ADMIN (or STUDENT/CLASS_OFFICER updating their own personalGoals)
  if (!isTeacherOrAdmin && !isPersonalGoalsOnlyUpdate) {
    return res.status(403).json({
      success: false,
      errorCode: 'ROLE_ACCESS_DENIED',
      message: 'Từ chối thao tác: Chỉ Giáo viên chủ nhiệm hoặc Quản trị viên mới có quyền cập nhật cấu hình lớp học.'
    });
  }

  // Strict Cross-Tenant Protection: TEACHER/STUDENT is strictly authoritative for their authenticated tenantId
  let tenantId = user.tenantId;
  if (user.role === 'SUPER_ADMIN') {
    tenantId = data.tenantId || (req.query.tenantId ? String(req.query.tenantId).trim() : user.tenantId);
  } else {
    if (data.tenantId && data.tenantId !== user.tenantId) {
      return res.status(403).json({
        success: false,
        errorCode: 'TENANT_ACCESS_DENIED',
        message: '403 TENANT ISOLATION ERROR: Bạn không có quyền cập nhật cấu hình lớp học khác.'
      });
    }
    tenantId = user.tenantId;
  }

  let existing = classSettingsRepository.getByTenantAndClass(tenantId);
  if (!existing) {
    const teacherAcc = teacherAccountRepository.getByTeacherId(user.teacherId || user.userId)
      || teacherAccountRepository.getByTenantId(tenantId);
    const tenant = tenantRepository.getById(tenantId);
    const defaultRecord: ClassSettingsRecord = {
      tenant_id: tenantId,
      class_id: `class-${tenantId}`,
      school_name: tenant?.school_name || (data.schoolName ? String(data.schoolName).trim() : 'Trường THPT'),
      class_name: data.className ? String(data.className).trim() : '10A1',
      grade: data.grade ? String(data.grade).trim() : '10',
      stream: data.stream ? String(data.stream).trim() : 'KHTN',
      academic_year: data.academicYear ? String(data.academicYear).trim() : '2025 - 2026',
      semester: data.semester ? String(data.semester).trim() : 'Học kỳ I',
      teacher_name: data.teacherName ? String(data.teacherName).trim() : (teacherAcc?.full_name || tenant?.owner_name || 'Giáo viên Chủ nhiệm'),
      teacher_phone: data.teacherPhone ? String(data.teacherPhone).trim() : (teacherAcc?.phone || ''),
      teacher_email: data.teacherEmail ? String(data.teacherEmail).trim() : (teacherAcc?.email || ''),
      slogan: data.slogan || null,
      cover_image: data.coverImage || null,
      total_students: studentRepository.countByTenant(tenantId),
      theme_json: JSON.stringify({ primaryColor: '#059669', primaryButton: '#059669' }),
      subjects_json: JSON.stringify([]),
      interaction_settings_json: null,
      google_integration_json: null,
      zalo_settings_json: null,
      ai_config_json: null,
      school_year_timeline_json: null,
      raw_metadata: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    existing = classSettingsRepository.upsert(defaultRecord);
  }

  const updates: Partial<ClassSettingsRecord> = {};

  // Parse existing raw_metadata once
  let currentMeta: Record<string, unknown> = {};
  if (existing.raw_metadata) {
    try { currentMeta = JSON.parse(existing.raw_metadata); } catch {}
  }
  let metaModified = false;

  if (isPersonalGoalsOnlyUpdate) {
    const existingPersonalGoals = Array.isArray(currentMeta.personalGoals) ? (currentMeta.personalGoals as any[]) : [];
    const otherStudentsGoals = existingPersonalGoals.filter(g => g && g.studentId !== user.studentId);
    const ownIncomingGoals = (data.personalGoals as any[]).filter(g => g && g.studentId === user.studentId);
    currentMeta.personalGoals = [...otherStudentsGoals, ...ownIncomingGoals];
    updates.raw_metadata = JSON.stringify(currentMeta);

    const updatedRecord = classSettingsRepository.update(tenantId, existing.class_id, updates);
    persistenceSyncService.flushToPersistentBackup();
    return res.json({
      success: true,
      data: sanitizeClassSettingsRecord(updatedRecord || existing, user)
    });
  }

  if (data.schoolName !== undefined) updates.school_name = String(data.schoolName).trim();
  if (data.className !== undefined) updates.class_name = String(data.className).trim();
  if (data.grade !== undefined) updates.grade = String(data.grade).trim();
  if (data.stream !== undefined) updates.stream = String(data.stream).trim();

  // Support educationTrack parsing if passed
  if (data.educationTrack !== undefined) {
    const rawTrack = String(data.educationTrack).trim();
    if (!updates.grade) {
      const gradeMatch = rawTrack.match(/(?:Khối\s*)?(10|11|12)/i);
      if (gradeMatch) {
        updates.grade = `Khối ${gradeMatch[1]}`;
      }
    }
    if (!updates.stream) {
      const parts = rawTrack.split(/[-·|/]/);
      if (parts.length > 1) {
        updates.stream = parts.slice(1).join(' - ').trim();
      }
    }
  }

  if (data.educationTrack !== undefined) {
    currentMeta.educationTrack = String(data.educationTrack).trim();
    metaModified = true;
  }

  if (data.academicYear !== undefined) updates.academic_year = String(data.academicYear).trim();
  if (data.semester !== undefined) updates.semester = String(data.semester).trim();
  if (data.teacherName !== undefined) updates.teacher_name = String(data.teacherName).trim();
  if (data.teacherPhone !== undefined) updates.teacher_phone = String(data.teacherPhone).trim();
  if (data.teacherEmail !== undefined) updates.teacher_email = String(data.teacherEmail).trim();
  if (data.slogan !== undefined) updates.slogan = data.slogan;
  if (data.coverImage !== undefined) updates.cover_image = data.coverImage;

  const actualActiveCount = studentRepository.countByTenant(tenantId);
  updates.total_students = actualActiveCount;
  if (data.confirmedTotalStudents !== undefined || currentMeta.confirmedTotalStudents !== undefined) {
    currentMeta.confirmedTotalStudents = actualActiveCount;
    metaModified = true;
  }

  if (data.violationWarningThreshold !== undefined) {
    const parsed = parseInt(data.violationWarningThreshold, 10);
    currentMeta.violationWarningThreshold = isNaN(parsed) || parsed < 1 ? 2 : parsed;
    metaModified = true;
  }

  if (Array.isArray(data.milestones)) {
    currentMeta.milestones = data.milestones;
    metaModified = true;
  }
  if (Array.isArray(data.classGoals)) {
    currentMeta.classGoals = data.classGoals;
    metaModified = true;
  }
  if (Array.isArray(data.personalGoals)) {
    currentMeta.personalGoals = data.personalGoals;
    metaModified = true;
  }
  if (Array.isArray(data.pinnedItems)) {
    currentMeta.pinnedItems = data.pinnedItems;
    metaModified = true;
  }

  if (metaModified) {
    updates.raw_metadata = JSON.stringify(currentMeta);
  }

  if (data.theme !== undefined) {
    updates.theme_json = typeof data.theme === 'string' ? data.theme : JSON.stringify(data.theme);
  }
  if (data.subjects !== undefined) {
    updates.subjects_json = typeof data.subjects === 'string' ? data.subjects : JSON.stringify(data.subjects);
  }
  if (data.interactionSettings !== undefined) {
    updates.interaction_settings_json = typeof data.interactionSettings === 'string' 
      ? data.interactionSettings 
      : JSON.stringify(data.interactionSettings);
  }
  if (data.googleIntegration !== undefined) {
    updates.google_integration_json = typeof data.googleIntegration === 'string' 
      ? data.googleIntegration 
      : JSON.stringify(data.googleIntegration);
  }
  if (data.zaloSettings !== undefined) {
    updates.zalo_settings_json = typeof data.zaloSettings === 'string' 
      ? data.zaloSettings 
      : JSON.stringify(data.zaloSettings);
  }
  if (data.aiConfig !== undefined) {
    updates.ai_config_json = typeof data.aiConfig === 'string' 
      ? data.aiConfig 
      : JSON.stringify(data.aiConfig);
  }
  if (data.schoolYearTimeline !== undefined) {
    let timelineObj = data.schoolYearTimeline;
    if (typeof timelineObj === 'string') {
      try {
        timelineObj = JSON.parse(timelineObj);
      } catch {
        timelineObj = null;
      }
    }
    updates.school_year_timeline_json = JSON.stringify(timelineObj || data.schoolYearTimeline);
    if (timelineObj && timelineObj.schoolYearLabel) {
      updates.academic_year = String(timelineObj.schoolYearLabel).trim();
    }
  }

  const updated = classSettingsRepository.update(tenantId, existing.class_id, updates);

  // Synchronize schoolName and teacher identity with TenantRepository
  const existingTenant = tenantRepository.getById(tenantId);
  if (existingTenant) {
    tenantRepository.createOrUpdate({
      ...existingTenant,
      school_name: updates.school_name || existingTenant.school_name,
      owner_name: updates.teacher_name || existingTenant.owner_name,
      owner_email: updates.teacher_email || existingTenant.owner_email,
      updated_at: new Date().toISOString()
    });
  }

  // Synchronize with TeacherAccountRepository to keep teacher profile unified
  if (updates.teacher_name || updates.teacher_phone || updates.teacher_email) {
    const targetTeacherId = user.teacherId || user.userId;
    const existingTeacherAcc = teacherAccountRepository.getByTeacherId(targetTeacherId)
      || teacherAccountRepository.getByTenantId(tenantId);
    if (existingTeacherAcc) {
      teacherAccountRepository.createOrUpdate({
        ...existingTeacherAcc,
        full_name: updates.teacher_name || existingTeacherAcc.full_name,
        phone: updates.teacher_phone !== undefined ? updates.teacher_phone : existingTeacherAcc.phone,
        email: updates.teacher_email !== undefined ? updates.teacher_email : existingTeacherAcc.email,
        updated_at: new Date().toISOString()
      });
    }
  }

  const effectiveStudents = actualActiveCount;

  // Publish real-time event for cross-tenant / admin synchronization
  eventHub.publish({
    id: `evt_cls_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    type: 'CLASS_SETTINGS_UPDATED',
    tenantId,
    actorId: user.userId,
    actorRole: user.role,
    actorName: (user as any).name || (user as any).fullName || 'GVCN',
    targetRoles: ['SUPER_ADMIN', 'TEACHER'],
    payload: {
      tenantId,
      schoolName: updated?.school_name,
      className: updated?.class_name,
      totalStudents: effectiveStudents,
      academicYear: updated?.academic_year
    },
    timestamp: new Date().toISOString()
  });

  auditLogRepository.createLog({
    actorUserId: user.userId,
    actorRole: user.role,
    actorTenantId: tenantId,
    action: 'CLASS_SETTINGS_UPDATED',
    targetType: 'CLASS_SETTINGS',
    targetId: existing.class_id,
    details: { fields: Object.keys(updates), tenantId }
  });

  // Synchronize immediately to persistent backup
  persistenceSyncService.flushToPersistentBackup();

  return res.json({
    success: true,
    data: sanitizeClassSettingsRecord(updated!, user)
  });
});

// ============================================================================
// 3. SUBMISSIONS (Trung tâm Phê duyệt Đề xuất) - /api/v1/class-settings/submissions
// ============================================================================

classSettingsRouter.get('/submissions', (req: AuthenticatedRequest, res: Response) => {
  const tenantId = resolveScopedTenantId(req, res);
  if (!tenantId) return;
  const user = req.user!;

  let items = getSystemItemsForTenant('sub', tenantId);
  if (user.role === 'STUDENT' || user.role === 'CLASS_OFFICER') {
    items = items.filter(
      s =>
        s.studentId === user.studentId ||
        s.senderId === user.userId ||
        s.senderId === user.studentId ||
        s.proposedById === user.userId ||
        s.proposedById === user.studentId
    );
  } else if (user.role === 'PARENT') {
    items = items.filter(
      s =>
        s.studentId === user.childStudentId ||
        s.senderId === user.userId ||
        s.proposedById === user.userId
    );
  }
  items.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  return res.json({ success: true, data: items });
});

classSettingsRouter.post('/submissions', (req: AuthenticatedRequest, res: Response) => {
  const tenantId = resolveScopedTenantId(req, res);
  if (!tenantId) return;
  const user = req.user!;
  const data = req.body || {};

  const effectiveTitle = String(data.title || data.category || '').trim();
  const effectiveContent = String(data.content || data.description || '').trim();

  if (!effectiveTitle && !effectiveContent) {
    return res.status(400).json({
      success: false,
      errorCode: 'VALIDATION_ERROR',
      message: 'Vui lòng nhập nội dung phiếu đề xuất.'
    });
  }

  // Reject temporary blob URLs in attachments or evidence
  const filesToCheck = [
    ...(Array.isArray(data.attachments) ? data.attachments : []),
    ...(Array.isArray(data.evidence) ? data.evidence : []),
    ...(Array.isArray(data.evidenceFiles) ? data.evidenceFiles : [])
  ];
  if (filesToCheck.some((a: any) => String(a?.url || '').startsWith('blob:'))) {
    return res.status(400).json({
      success: false,
      errorCode: 'BLOB_URL_NOT_ALLOWED',
      message: 'Không chấp nhận tệp đính kèm dạng blob URL tạm thời. Vui lòng sử dụng dữ liệu tệp bền vững.'
    });
  }

  // Role & identity enforcement
  let resolvedStudentId = data.studentId;
  if (user.role === 'STUDENT') {
    if (user.studentId && data.studentId && data.studentId !== user.studentId) {
      return res.status(403).json({
        success: false,
        errorCode: 'ROLE_ACCESS_DENIED',
        message: 'Học viên chỉ được gửi phiếu đề xuất cho chính mình.'
      });
    }
    resolvedStudentId = user.studentId || data.studentId;
  } else if (user.role === 'PARENT') {
    if (user.childStudentId && data.studentId && data.studentId !== user.childStudentId) {
      return res.status(403).json({
        success: false,
        errorCode: 'ROLE_ACCESS_DENIED',
        message: 'Phụ huynh chỉ được gửi phiếu đề xuất cho con em mình.'
      });
    }
    resolvedStudentId = user.childStudentId || data.studentId;
  }

  const existingItems = getSystemItemsForTenant('sub', tenantId);
  const incomingId = data.id ? String(data.id).trim() : '';

  // Idempotency / duplicate check by ID or identical pending submission
  const duplicateById = incomingId ? existingItems.find(s => s.id === incomingId) : null;
  if (duplicateById) {
    return res.status(200).json({ success: true, data: duplicateById, duplicate: true });
  }

  const normTitle = effectiveTitle.toLowerCase();
  const normContent = effectiveContent.toLowerCase();
  const subType = data.submissionType || data.type || 'good_deed';
  const duplicatePending = existingItems.find(s => {
    const sStatus = String(s.status || '').toLowerCase();
    const sTitle = String(s.title || s.category || '').trim().toLowerCase();
    const sContent = String(s.content || s.description || '').trim().toLowerCase();
    const sType = s.submissionType || s.type || 'good_deed';
    return (
      sStatus === 'pending' &&
      sType === subType &&
      s.studentId === resolvedStudentId &&
      sTitle === normTitle &&
      sContent === normContent
    );
  });
  if (duplicatePending) {
    return res.status(200).json({ success: true, data: duplicatePending, duplicate: true });
  }

  const now = new Date().toISOString();
  const subId = incomingId || `sub-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const isTeacher = user.role === 'TEACHER' || user.role === 'SUPER_ADMIN';
  const defaultStatus = data.status && isTeacher ? data.status : (data.description !== undefined ? 'pending' : 'PENDING');

  const newSub = {
    ...data,
    id: subId,
    tenantId,
    studentId: resolvedStudentId || data.studentId || user.studentId || user.userId,
    senderId: data.senderId || data.proposedById || user.studentId || user.userId,
    proposedById: data.proposedById || data.senderId || user.studentId || user.userId,
    senderRole: isTeacher ? (data.senderRole || data.proposedByRole || 'TEACHER') : user.role,
    proposedByRole: isTeacher ? (data.proposedByRole || data.senderRole || 'TEACHER') : user.role,
    status: defaultStatus,
    createdAt: data.createdAt || now,
    updatedAt: now
  };

  saveSystemItem('sub', tenantId, subId, newSub, user.userId);
  return res.status(201).json({ success: true, data: newSub });
});

classSettingsRouter.patch('/submissions/:id', (req: AuthenticatedRequest, res: Response) => {
  const tenantId = resolveScopedTenantId(req, res);
  if (!tenantId) return;
  const user = req.user!;
  const { id } = req.params;
  const updates = req.body || {};

  const existing = getSystemItemById('sub', tenantId, id);
  if (!existing) {
    const other = findSystemItemAnywhere('sub', id);
    if (other && other.tenantId !== tenantId) {
      return res.status(403).json({
        success: false,
        errorCode: 'TENANT_ACCESS_DENIED',
        message: '403 TENANT ISOLATION ERROR: Bạn không có quyền thao tác phiếu đề xuất của lớp khác.'
      });
    }
    return res.status(404).json({
      success: false,
      errorCode: 'NOT_FOUND',
      message: 'Không tìm thấy phiếu đề xuất.'
    });
  }

  const isTeacher = user.role === 'TEACHER' || user.role === 'SUPER_ADMIN';
  const incomingStatusLower = updates.status ? String(updates.status).toLowerCase() : '';
  const existingStatusLower = String(existing.status || '').toLowerCase();

  if (!isTeacher) {
    // Students/Parents cannot approve or reject submissions
    if (
      incomingStatusLower === 'approved' ||
      incomingStatusLower === 'edited_and_approved' ||
      incomingStatusLower === 'rejected' ||
      updates.teacherFeedback !== undefined ||
      updates.reviewedBy !== undefined
    ) {
      return res.status(403).json({
        success: false,
        errorCode: 'ROLE_ACCESS_DENIED',
        message: 'Chỉ Giáo viên chủ nhiệm mới có quyền phê duyệt hoặc từ chối phiếu đề xuất.'
      });
    }
    const isOwner =
      existing.studentId === user.studentId ||
      existing.senderId === user.userId ||
      existing.senderId === user.studentId ||
      existing.proposedById === user.userId ||
      existing.proposedById === user.studentId ||
      (user.role === 'PARENT' && existing.studentId === user.childStudentId);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        errorCode: 'ROLE_ACCESS_DENIED',
        message: 'Bạn chỉ có quyền chỉnh sửa phiếu đề xuất của chính mình.'
      });
    }
    if (existingStatusLower === 'approved' || existingStatusLower === 'edited_and_approved' || existingStatusLower === 'rejected') {
      return res.status(400).json({
        success: false,
        errorCode: 'ALREADY_PROCESSED',
        message: 'Phiếu đề xuất đã được GVCN xử lý, không thể chỉnh sửa.'
      });
    }
  }

  // Idempotent guard if already approved
  if (
    (existingStatusLower === 'approved' || existingStatusLower === 'edited_and_approved') &&
    (incomingStatusLower === 'approved' || incomingStatusLower === 'edited_and_approved')
  ) {
    return res.json({ success: true, data: existing, alreadyApproved: true });
  }

  const now = new Date().toISOString();
  const updated = {
    ...existing,
    ...updates,
    id: existing.id,
    tenantId,
    updatedAt: now
  };

  saveSystemItem('sub', tenantId, id, updated, user.userId);
  return res.json({ success: true, data: updated });
});

classSettingsRouter.delete('/submissions/:id', (req: AuthenticatedRequest, res: Response) => {
  const tenantId = resolveScopedTenantId(req, res);
  if (!tenantId) return;
  const user = req.user!;
  const { id } = req.params;

  const existing = getSystemItemById('sub', tenantId, id);
  if (!existing) {
    const other = findSystemItemAnywhere('sub', id);
    if (other && other.tenantId !== tenantId) {
      return res.status(403).json({
        success: false,
        errorCode: 'TENANT_ACCESS_DENIED',
        message: '403 TENANT ISOLATION ERROR: Bạn không có quyền xóa phiếu đề xuất của lớp khác.'
      });
    }
    return res.status(404).json({ success: false, errorCode: 'NOT_FOUND', message: 'Không tìm thấy phiếu đề xuất.' });
  }

  const isTeacher = user.role === 'TEACHER' || user.role === 'SUPER_ADMIN';
  const isOwner =
    existing.studentId === user.studentId ||
    existing.senderId === user.userId ||
    existing.senderId === user.studentId ||
    existing.proposedById === user.userId ||
    existing.proposedById === user.studentId ||
    (user.role === 'PARENT' && existing.studentId === user.childStudentId);
  const existingStatusLower = String(existing.status || '').toLowerCase();

  if (!isTeacher && (!isOwner || existingStatusLower !== 'pending')) {
    return res.status(403).json({
      success: false,
      errorCode: 'ROLE_ACCESS_DENIED',
      message: 'Bạn không có quyền xóa phiếu đề xuất này.'
    });
  }

  deleteSystemItem('sub', tenantId, id, user.userId, req.query.hard === 'true' && isTeacher);
  return res.json({ success: true, message: 'Đã xóa phiếu đề xuất.' });
});

// ============================================================================
// 4. ACTIVITIES (Hoạt động Phong trào) - /api/v1/class-settings/activities
// ============================================================================

classSettingsRouter.get('/activities', (req: AuthenticatedRequest, res: Response) => {
  const tenantId = resolveScopedTenantId(req, res);
  if (!tenantId) return;

  const items = getSystemItemsForTenant('act', tenantId);
  items.sort((a, b) => new Date(b.createdAt || b.startDate || 0).getTime() - new Date(a.createdAt || a.startDate || 0).getTime());
  return res.json({ success: true, data: items });
});

classSettingsRouter.post('/activities', (req: AuthenticatedRequest, res: Response) => {
  const tenantId = resolveScopedTenantId(req, res);
  if (!tenantId) return;
  const user = req.user!;
  const data = req.body || {};

  if (user.role !== 'TEACHER' && user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({
      success: false,
      errorCode: 'ROLE_ACCESS_DENIED',
      message: 'Chỉ Giáo viên chủ nhiệm mới có quyền tạo hoạt động phong trào.'
    });
  }

  if (!data.title || !String(data.title).trim()) {
    return res.status(400).json({
      success: false,
      errorCode: 'VALIDATION_ERROR',
      message: 'Vui lòng nhập tên hoạt động.'
    });
  }

  const hasBlobAttachment =
    (Array.isArray(data.attachments) && data.attachments.some((a: any) => String(a?.url || '').startsWith('blob:'))) ||
    (Array.isArray(data.media) && data.media.some((m: any) => String(m?.url || '').startsWith('blob:'))) ||
    (Array.isArray(data.images) && data.images.some((u: any) => String(u || '').startsWith('blob:')));

  if (hasBlobAttachment) {
    return res.status(400).json({
      success: false,
      errorCode: 'BLOB_URL_NOT_ALLOWED',
      message: 'Không chấp nhận tệp đính kèm hoặc hình ảnh dạng blob URL tạm thời.'
    });
  }

  const existingItems = getSystemItemsForTenant('act', tenantId);
  const incomingId = data.id ? String(data.id).trim() : '';
  if (incomingId) {
    const dup = existingItems.find(a => a.id === incomingId);
    if (dup) {
      return res.status(200).json({ success: true, data: dup, duplicate: true });
    }
  }

  const now = new Date().toISOString();
  const actId = incomingId || `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const newActivity = {
    ...data,
    id: actId,
    tenantId,
    registrations: Array.isArray(data.registrations) ? data.registrations : [],
    participants: Array.isArray(data.participants) ? data.participants : [],
    createdAt: data.createdAt || now,
    updatedAt: now
  };

  saveSystemItem('act', tenantId, actId, newActivity, user.userId);
  return res.status(201).json({ success: true, data: newActivity });
});

classSettingsRouter.patch('/activities/:id', (req: AuthenticatedRequest, res: Response) => {
  const tenantId = resolveScopedTenantId(req, res);
  if (!tenantId) return;
  const user = req.user!;
  const { id } = req.params;
  const data = req.body || {};

  const existing = getSystemItemById('act', tenantId, id);
  if (!existing) {
    const other = findSystemItemAnywhere('act', id);
    if (other && other.tenantId !== tenantId) {
      return res.status(403).json({
        success: false,
        errorCode: 'TENANT_ACCESS_DENIED',
        message: '403 TENANT ISOLATION ERROR: Bạn không có quyền thao tác hoạt động của lớp khác.'
      });
    }
    return res.status(404).json({ success: false, errorCode: 'NOT_FOUND', message: 'Không tìm thấy hoạt động.' });
  }

  const hasBlobAttachment =
    (Array.isArray(data.attachments) && data.attachments.some((a: any) => String(a?.url || '').startsWith('blob:'))) ||
    (Array.isArray(data.media) && data.media.some((m: any) => String(m?.url || '').startsWith('blob:'))) ||
    (Array.isArray(data.images) && data.images.some((u: any) => String(u || '').startsWith('blob:')));

  if (hasBlobAttachment) {
    return res.status(400).json({
      success: false,
      errorCode: 'BLOB_URL_NOT_ALLOWED',
      message: 'Không chấp nhận tệp đính kèm hoặc hình ảnh dạng blob URL tạm thời.'
    });
  }

  const isTeacher = user.role === 'TEACHER' || user.role === 'SUPER_ADMIN';
  const existingRegistrations: any[] = Array.isArray(existing.registrations) ? existing.registrations : [];
  const existingParticipants: any[] = Array.isArray(existing.participants) ? existing.participants : [];

  if (!isTeacher) {
    // Allow reactions / comments from STUDENT, CLASS_OFFICER, PARENT
    const isReactionOrCommentOnly = Object.keys(data).every(
      k => k === 'reactions' || k === 'comments' || k === 'tenantId' || k === 'updatedAt'
    );
    if (isReactionOrCommentOnly) {
      const updatedSocial = {
        ...existing,
        reactions: data.reactions !== undefined ? data.reactions : existing.reactions,
        comments: Array.isArray(data.comments) ? data.comments : existing.comments,
        updatedAt: new Date().toISOString()
      };
      saveSystemItem('act', tenantId, id, updatedSocial, user.userId);
      return res.json({ success: true, data: updatedSocial });
    }

    if (user.role !== 'STUDENT' && user.role !== 'CLASS_OFFICER') {
      return res.status(403).json({
        success: false,
        errorCode: 'ROLE_ACCESS_DENIED',
        message: 'Bạn không có quyền chỉnh sửa hoạt động này.'
      });
    }

    // Ensure non-teacher isn't trying to mutate core activity fields if they differ from existing
    if (
      (data.title !== undefined && data.title !== existing.title) ||
      (data.status !== undefined && data.status !== existing.status) ||
      (data.type !== undefined && data.type !== existing.type) ||
      (data.category !== undefined && data.category !== existing.category)
    ) {
      return res.status(403).json({
        success: false,
        errorCode: 'ROLE_ACCESS_DENIED',
        message: 'Chỉ Giáo viên chủ nhiệm mới có quyền thay đổi thông tin hoặc trạng thái hoạt động.'
      });
    }

    const ownStudentId = user.studentId || user.userId;

    // Merge registrations for ownStudentId while preserving teacher evaluation fields
    let mergedRegistrations = existingRegistrations;
    if (Array.isArray(data.registrations)) {
      const existingOwnReg = existingRegistrations.find(r => r.studentId === ownStudentId);
      const incomingOwnReg = data.registrations.find((r: any) => r.studentId === ownStudentId);
      const otherRegs = existingRegistrations.filter(r => r.studentId !== ownStudentId);
      if (incomingOwnReg) {
        const safeOwnReg = {
          ...existingOwnReg,
          ...incomingOwnReg,
          studentId: ownStudentId,
          evaluationLevel: existingOwnReg?.evaluationLevel || 'CHUA_DANH_GIA',
          praiseOrReward: existingOwnReg?.praiseOrReward,
          trainingBonusPoints: existingOwnReg?.trainingBonusPoints,
          teacherPrivateNote: existingOwnReg?.teacherPrivateNote,
          evaluatedAt: existingOwnReg?.evaluatedAt,
          evaluatedBy: existingOwnReg?.evaluatedBy
        };
        mergedRegistrations = [...otherRegs, safeOwnReg];
      } else {
        mergedRegistrations = otherRegs;
      }
    }

    // Merge participants for ownStudentId while preserving teacher evaluation fields
    let mergedParticipants = existingParticipants;
    if (Array.isArray(data.participants)) {
      const existingOwn = existingParticipants.find(p => p.studentId === ownStudentId);
      const incomingOwn = data.participants.find((p: any) => p.studentId === ownStudentId);
      const otherParticipants = existingParticipants.filter(p => p.studentId !== ownStudentId);
      if (incomingOwn) {
        const safeOwn = {
          ...existingOwn,
          ...incomingOwn,
          studentId: ownStudentId,
          evaluation: existingOwn?.evaluation,
          praisePointsAwarded: existingOwn?.praisePointsAwarded,
          praiseAwardedAt: existingOwn?.praiseAwardedAt,
          praiseAwardedBy: existingOwn?.praiseAwardedBy
        };
        mergedParticipants = [...otherParticipants, safeOwn];
      } else {
        mergedParticipants = otherParticipants;
      }
    }

    const updatedByStudent = {
      ...existing,
      registrations: mergedRegistrations,
      participants: mergedParticipants,
      reactions: data.reactions !== undefined ? data.reactions : existing.reactions,
      comments: Array.isArray(data.comments) ? data.comments : existing.comments,
      updatedAt: new Date().toISOString()
    };
    saveSystemItem('act', tenantId, id, updatedByStudent, user.userId);
    return res.json({ success: true, data: updatedByStudent });
  }

  // Teacher update: deduplicate registrations & participants by studentId
  let dedupedRegistrations = existingRegistrations;
  if (Array.isArray(data.registrations)) {
    const regMap = new Map<string, any>();
    for (const r of existingRegistrations) {
      if (r && r.studentId) regMap.set(r.studentId, r);
    }
    const nextRegMap = new Map<string, any>();
    for (const r of data.registrations) {
      if (!r || !r.studentId) continue;
      const prev = regMap.get(r.studentId);
      nextRegMap.set(r.studentId, { ...prev, ...r });
    }
    dedupedRegistrations = Array.from(nextRegMap.values());
  }

  let dedupedParticipants = existingParticipants;
  if (Array.isArray(data.participants)) {
    const byStudent = new Map<string, any>();
    for (const p of existingParticipants) {
      if (p && p.studentId) byStudent.set(p.studentId, p);
    }
    const nextMap = new Map<string, any>();
    for (const p of data.participants) {
      if (!p || !p.studentId) continue;
      const prev = byStudent.get(p.studentId);
      const isGoodOrExcellent = p.evaluation === 'Xuất sắc' || p.evaluation === 'Tốt';
      nextMap.set(p.studentId, {
        ...prev,
        ...p,
        praisePointsAwarded: isGoodOrExcellent ? Boolean(prev?.praisePointsAwarded || p.praisePointsAwarded) : false
      });
    }
    dedupedParticipants = Array.from(nextMap.values());
  }

  const updated = {
    ...existing,
    ...data,
    id: existing.id,
    tenantId,
    registrations: dedupedRegistrations,
    participants: dedupedParticipants,
    updatedAt: new Date().toISOString()
  };

  saveSystemItem('act', tenantId, id, updated, user.userId);
  return res.json({ success: true, data: updated });
});

classSettingsRouter.delete('/activities/:id', (req: AuthenticatedRequest, res: Response) => {
  const tenantId = resolveScopedTenantId(req, res);
  if (!tenantId) return;
  const user = req.user!;
  const { id } = req.params;

  if (user.role !== 'TEACHER' && user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({
      success: false,
      errorCode: 'ROLE_ACCESS_DENIED',
      message: 'Chỉ Giáo viên chủ nhiệm mới có quyền xóa hoạt động phong trào.'
    });
  }

  const existing = getSystemItemById('act', tenantId, id);
  if (!existing) {
    const other = findSystemItemAnywhere('act', id);
    if (other && other.tenantId !== tenantId) {
      return res.status(403).json({
        success: false,
        errorCode: 'TENANT_ACCESS_DENIED',
        message: '403 TENANT ISOLATION ERROR: Bạn không có quyền xóa hoạt động của lớp khác.'
      });
    }
    return res.status(404).json({ success: false, errorCode: 'NOT_FOUND', message: 'Không tìm thấy hoạt động.' });
  }

  deleteSystemItem('act', tenantId, id, user.userId, req.query.hard === 'true');
  return res.json({ success: true, message: 'Đã xóa hoạt động phong trào.' });
});

// ============================================================================
// 5. ALBUM (Album Kỷ niệm) - /api/v1/class-settings/album
// ============================================================================

classSettingsRouter.get('/album', (req: AuthenticatedRequest, res: Response) => {
  const tenantId = resolveScopedTenantId(req, res);
  if (!tenantId) return;
  const user = req.user!;

  let items = getSystemItemsForTenant('alb', tenantId);
  const isTeacher = user.role === 'TEACHER' || user.role === 'SUPER_ADMIN';
  if (!isTeacher) {
    items = items.filter(
      p =>
        String(p.status || 'published').toLowerCase() === 'published' ||
        p.authorId === user.userId ||
        p.authorId === user.studentId
    );
  }
  items.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  return res.json({ success: true, data: items });
});

classSettingsRouter.post('/album', (req: AuthenticatedRequest, res: Response) => {
  const tenantId = resolveScopedTenantId(req, res);
  if (!tenantId) return;
  const user = req.user!;
  const data = req.body || {};

  if (!data.title && !data.content && (!Array.isArray(data.media) || data.media.length === 0)) {
    return res.status(400).json({
      success: false,
      errorCode: 'VALIDATION_ERROR',
      message: 'Vui lòng nhập tiêu đề, nội dung hoặc đính kèm phương tiện cho album kỷ niệm.'
    });
  }

  const hasBlob =
    (Array.isArray(data.media) && data.media.some((m: any) => String(m?.url || '').startsWith('blob:'))) ||
    (Array.isArray(data.images) && data.images.some((u: any) => String(u || '').startsWith('blob:'))) ||
    (Array.isArray(data.attachments) && data.attachments.some((a: any) => String(a?.url || '').startsWith('blob:'))) ||
    String(data.videoUrl || '').startsWith('blob:');

  if (hasBlob) {
    return res.status(400).json({
      success: false,
      errorCode: 'BLOB_URL_NOT_ALLOWED',
      message: 'Không chấp nhận ảnh/video dạng blob URL tạm thời. Vui lòng tải tệp bền vững.'
    });
  }

  const existingItems = getSystemItemsForTenant('alb', tenantId);
  const incomingId = data.id ? String(data.id).trim() : '';
  if (incomingId) {
    const dup = existingItems.find(p => p.id === incomingId);
    if (dup) {
      return res.status(200).json({ success: true, data: dup, duplicate: true });
    }
  }

  const isTeacher = user.role === 'TEACHER' || user.role === 'SUPER_ADMIN';
  const now = new Date().toISOString();
  const postId = incomingId || `alb-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  const newPost = {
    ...data,
    id: postId,
    tenantId,
    authorId: data.authorId || user.studentId || user.userId,
    authorRole: isTeacher ? 'TEACHER' : user.role,
    status: data.status || 'published',
    reactions: data.reactions || { love: [], applause: [], plant: [], like: [] },
    comments: Array.isArray(data.comments) ? data.comments : [],
    createdAt: data.createdAt || now,
    updatedAt: now
  };

  saveSystemItem('alb', tenantId, postId, newPost, user.userId);
  return res.status(201).json({ success: true, data: newPost });
});

classSettingsRouter.patch('/album/:id', (req: AuthenticatedRequest, res: Response) => {
  const tenantId = resolveScopedTenantId(req, res);
  if (!tenantId) return;
  const user = req.user!;
  const { id } = req.params;
  const data = req.body || {};

  const existing = getSystemItemById('alb', tenantId, id);
  if (!existing) {
    const other = findSystemItemAnywhere('alb', id);
    if (other && other.tenantId !== tenantId) {
      return res.status(403).json({
        success: false,
        errorCode: 'TENANT_ACCESS_DENIED',
        message: '403 TENANT ISOLATION ERROR: Bạn không có quyền thao tác album của lớp khác.'
      });
    }
    return res.status(404).json({ success: false, errorCode: 'NOT_FOUND', message: 'Không tìm thấy bài đăng album.' });
  }

  const hasBlob =
    (Array.isArray(data.media) && data.media.some((m: any) => String(m?.url || '').startsWith('blob:'))) ||
    (Array.isArray(data.images) && data.images.some((u: any) => String(u || '').startsWith('blob:'))) ||
    (Array.isArray(data.attachments) && data.attachments.some((a: any) => String(a?.url || '').startsWith('blob:'))) ||
    String(data.videoUrl || '').startsWith('blob:');

  if (hasBlob) {
    return res.status(400).json({
      success: false,
      errorCode: 'BLOB_URL_NOT_ALLOWED',
      message: 'Không chấp nhận ảnh/video dạng blob URL tạm thời.'
    });
  }

  const isTeacher = user.role === 'TEACHER' || user.role === 'SUPER_ADMIN';
  if (!isTeacher) {
    // Non-teacher can add reactions/comments/sharesCount or edit their own post, but cannot approve/pin
    const isAuthor = existing.authorId === user.userId || existing.authorId === user.studentId;
    const isSocialOnly = Object.keys(data).every(
      k => k === 'reactions' || k === 'comments' || k === 'commentsCount' || k === 'sharesCount' || k === 'tenantId' || k === 'updatedAt'
    );
    if (!isAuthor && !isSocialOnly) {
      return res.status(403).json({
        success: false,
        errorCode: 'ROLE_ACCESS_DENIED',
        message: 'Bạn không có quyền chỉnh sửa bài đăng album của người khác.'
      });
    }
    const updatedNonTeacher = {
      ...existing,
      ...(isAuthor ? data : {}),
      reactions: data.reactions !== undefined ? data.reactions : existing.reactions,
      comments: Array.isArray(data.comments) ? data.comments : existing.comments,
      commentsCount: data.commentsCount !== undefined ? data.commentsCount : (Array.isArray(data.comments) ? data.comments.length : existing.commentsCount),
      sharesCount: data.sharesCount !== undefined ? data.sharesCount : existing.sharesCount,
      status: existing.status,
      isPinned: existing.isPinned,
      isFeatured: existing.isFeatured,
      id: existing.id,
      tenantId,
      updatedAt: new Date().toISOString()
    };
    saveSystemItem('alb', tenantId, id, updatedNonTeacher, user.userId);
    return res.json({ success: true, data: updatedNonTeacher });
  }

  const updated = {
    ...existing,
    ...data,
    id: existing.id,
    tenantId,
    updatedAt: new Date().toISOString()
  };

  saveSystemItem('alb', tenantId, id, updated, user.userId);
  return res.json({ success: true, data: updated });
});

classSettingsRouter.delete('/album/:id', (req: AuthenticatedRequest, res: Response) => {
  const tenantId = resolveScopedTenantId(req, res);
  if (!tenantId) return;
  const user = req.user!;
  const { id } = req.params;

  const existing = getSystemItemById('alb', tenantId, id);
  if (!existing) {
    const other = findSystemItemAnywhere('alb', id);
    if (other && other.tenantId !== tenantId) {
      return res.status(403).json({
        success: false,
        errorCode: 'TENANT_ACCESS_DENIED',
        message: '403 TENANT ISOLATION ERROR: Bạn không có quyền xóa bài đăng album của lớp khác.'
      });
    }
    return res.status(404).json({ success: false, errorCode: 'NOT_FOUND', message: 'Không tìm thấy bài đăng album.' });
  }

  const isTeacher = user.role === 'TEACHER' || user.role === 'SUPER_ADMIN';
  const isAuthor = existing.authorId === user.userId || existing.authorId === user.studentId;
  if (!isTeacher && !isAuthor) {
    return res.status(403).json({
      success: false,
      errorCode: 'ROLE_ACCESS_DENIED',
      message: 'Bạn không có quyền xóa bài đăng album này.'
    });
  }

  deleteSystemItem('alb', tenantId, id, user.userId, req.query.hard === 'true' && isTeacher);
  return res.json({ success: true, message: 'Đã xóa bài đăng album kỷ niệm.' });
});

// ============================================================================
// 6. CONDUCT EVALUATIONS (Đánh giá rèn luyện định kỳ) - /api/v1/class-settings/conduct-evaluations
// ============================================================================

classSettingsRouter.get('/conduct-evaluations', (req: AuthenticatedRequest, res: Response) => {
  const tenantId = resolveScopedTenantId(req, res);
  if (!tenantId) return;

  const items = getSystemItemsForTenant('cnd', tenantId);
  items.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
  return res.json({ success: true, data: items });
});

classSettingsRouter.put('/conduct-evaluations/:id', (req: AuthenticatedRequest, res: Response) => {
  const tenantId = resolveScopedTenantId(req, res);
  if (!tenantId) return;
  const user = req.user!;
  const { id } = req.params;
  const data = req.body || {};

  const other = findSystemItemAnywhere('cnd', id);
  if (other && other.tenantId !== tenantId) {
    return res.status(403).json({
      success: false,
      errorCode: 'TENANT_ACCESS_DENIED',
      message: '403 TENANT ISOLATION ERROR: Bạn không có quyền thao tác biên bản đánh giá rèn luyện của lớp khác.'
    });
  }

  const existing = getSystemItemById('cnd', tenantId, id);
  const isTeacher = user.role === 'TEACHER' || user.role === 'SUPER_ADMIN';

  // Protect FINALIZED evaluation from being overwritten by non-teachers or stale localStorage drafts
  if (existing && existing.status === 'FINALIZED') {
    if (!isTeacher) {
      return res.status(403).json({
        success: false,
        errorCode: 'ALREADY_FINALIZED',
        message: 'Biên bản đánh giá kỳ này đã được GVCN chốt chính thức, không thể chỉnh sửa.'
      });
    }
    if (data.status === 'DRAFT' && !data.explicitReopen) {
      // Do not allow an automatic draft sync to downgrade a FINALIZED evaluation
      return res.status(200).json({
        success: true,
        data: existing,
        protectedFinalized: true
      });
    }
  }

  if (!isTeacher) {
    if (user.role !== 'STUDENT' && user.role !== 'CLASS_OFFICER') {
      return res.status(403).json({
        success: false,
        errorCode: 'ROLE_ACCESS_DENIED',
        message: 'Bạn không có quyền cập nhật đánh giá rèn luyện.'
      });
    }

    const ownStudentId = user.studentId || user.userId;
    const existingRecords: any[] = Array.isArray(existing?.records) ? existing.records : [];
    const incomingRecords: any[] = Array.isArray(data.records) ? data.records : [];

    const mergedRecords = existingRecords.map(rec => {
      const inc = incomingRecords.find(r => r.studentId === rec.studentId);
      if (!inc) return rec;
      if (user.role === 'STUDENT' && rec.studentId !== ownStudentId) {
        return rec;
      }
      return {
        ...rec,
        selfLevel: rec.studentId === ownStudentId ? (inc.selfLevel ?? rec.selfLevel) : rec.selfLevel,
        selfNote: rec.studentId === ownStudentId ? (inc.selfNote ?? rec.selfNote) : rec.selfNote,
        groupLevel: user.role === 'CLASS_OFFICER' ? (inc.groupLevel ?? rec.groupLevel) : rec.groupLevel,
        groupNote: user.role === 'CLASS_OFFICER' ? (inc.groupNote ?? rec.groupNote) : rec.groupNote,
        // Never allow student/officer to overwrite teacher's finalLevel or teacherNote
        finalLevel: rec.finalLevel,
        teacherNote: rec.teacherNote,
        updatedAt: new Date().toISOString()
      };
    });

    // Include any new student record for ownStudentId if not yet in existingRecords
    for (const inc of incomingRecords) {
      if (!inc || !inc.studentId) continue;
      if (!mergedRecords.some(r => r.studentId === inc.studentId)) {
        if (user.role === 'STUDENT' && inc.studentId !== ownStudentId) continue;
        mergedRecords.push({
          ...inc,
          finalLevel: undefined,
          teacherNote: undefined
        });
      }
    }

    const now = new Date().toISOString();
    const savedNonTeacher = {
      ...(existing || data),
      id,
      tenantId,
      status: 'DRAFT',
      records: mergedRecords,
      minutes: user.role === 'CLASS_OFFICER' ? (data.minutes || existing?.minutes) : (existing?.minutes || data.minutes),
      createdAt: existing?.createdAt || data.createdAt || now,
      updatedAt: now
    };
    saveSystemItem('cnd', tenantId, id, savedNonTeacher, user.userId);
    return res.json({ success: true, data: savedNonTeacher });
  }

  const now = new Date().toISOString();
  const saved = {
    ...(existing || {}),
    ...data,
    id,
    tenantId,
    createdAt: existing?.createdAt || data.createdAt || now,
    updatedAt: now
  };
  delete (saved as any).explicitReopen;

  saveSystemItem('cnd', tenantId, id, saved, user.userId);
  return res.json({ success: true, data: saved });
});

classSettingsRouter.delete('/conduct-evaluations/:id', (req: AuthenticatedRequest, res: Response) => {
  const tenantId = resolveScopedTenantId(req, res);
  if (!tenantId) return;
  const user = req.user!;
  const { id } = req.params;

  if (user.role !== 'TEACHER' && user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({
      success: false,
      errorCode: 'ROLE_ACCESS_DENIED',
      message: 'Chỉ Giáo viên chủ nhiệm mới có quyền xóa biên bản đánh giá rèn luyện.'
    });
  }

  const existing = getSystemItemById('cnd', tenantId, id);
  if (!existing) {
    const other = findSystemItemAnywhere('cnd', id);
    if (other && other.tenantId !== tenantId) {
      return res.status(403).json({
        success: false,
        errorCode: 'TENANT_ACCESS_DENIED',
        message: '403 TENANT ISOLATION ERROR: Bạn không có quyền xóa biên bản đánh giá của lớp khác.'
      });
    }
    return res.status(404).json({ success: false, errorCode: 'NOT_FOUND', message: 'Không tìm thấy biên bản đánh giá.' });
  }

  deleteSystemItem('cnd', tenantId, id, user.userId, req.query.hard === 'true');
  return res.json({ success: true, message: 'Đã xóa biên bản đánh giá rèn luyện.' });
});

