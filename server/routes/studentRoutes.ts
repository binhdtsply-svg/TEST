import { Router, Response } from 'express';
import { studentRepository, StudentRecord } from '../repositories/StudentRepository';
import { credentialRepository } from '../repositories/CredentialRepository';
import { classSettingsRepository } from '../repositories/ClassSettingsRepository';
import { auditLogRepository } from '../repositories/AuditLogRepository';
import { userAvatarRepository } from '../repositories/UserAvatarRepository';
import { persistenceSyncService } from '../services/PersistenceSyncService';
import { authenticateToken, requireRole, requireTenantAccess, AuthenticatedRequest } from '../auth/middleware';
import { sanitizeStudentRecord } from '../utils/sanitizers';

export const studentRouter = Router();

function syncClassTotalStudents(tenantId: string): number {
  const activeCount = studentRepository.countByTenant(tenantId);
  const settings = classSettingsRepository.getByTenantAndClass(tenantId);
  if (settings) {
    let rawMeta: Record<string, any> = {};
    let metaChanged = false;
    if (settings.raw_metadata) {
      try {
        rawMeta = JSON.parse(settings.raw_metadata);
        if (rawMeta.confirmedTotalStudents !== undefined && rawMeta.confirmedTotalStudents !== activeCount) {
          rawMeta.confirmedTotalStudents = activeCount;
          metaChanged = true;
        }
      } catch {}
    }
    const updates: Record<string, any> = { total_students: activeCount };
    if (metaChanged) {
      updates.raw_metadata = JSON.stringify(rawMeta);
    }
    classSettingsRepository.update(tenantId, settings.class_id, updates);
  }
  return activeCount;
}

// Apply auth & tenant middleware to all student routes
studentRouter.use(authenticateToken);
studentRouter.use(requireTenantAccess);

// 1. GET /api/v1/students - List students in tenant
studentRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const tenantId = user.tenantId;

  // SUPER_ADMIN has no class-level access
  if (user.role === 'SUPER_ADMIN') {
    return res.status(403).json({
      success: false,
      errorCode: 'CLASS_ACCESS_DENIED',
      message: 'Admin Tổng không có quyền truy cập trực tiếp danh sách học sinh của lớp.'
    });
  }

  // PARENT role is not allowed to query the entire class roster
  if (user.role === 'PARENT') {
    if (!user.childStudentId) {
      return res.json({ success: true, data: [] });
    }
    const child = studentRepository.getById(tenantId, user.childStudentId);
    if (!child) {
      return res.json({ success: true, data: [] });
    }
    return res.json({
      success: true,
      data: [sanitizeStudentRecord(child, user)]
    });
  }

  const students = studentRepository.getAllByTenant(tenantId);
  const sanitized = students.map(s => sanitizeStudentRecord(s, user));

  return res.json({
    success: true,
    data: sanitized,
    total: sanitized.length
  });
});

// 2. GET /api/v1/students/:studentId - Get single student record
studentRouter.get('/:studentId', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const tenantId = user.tenantId;
  const { studentId } = req.params;

  if (user.role === 'SUPER_ADMIN') {
    return res.status(403).json({
      success: false,
      errorCode: 'CLASS_ACCESS_DENIED',
      message: 'Admin Tổng không có quyền truy cập trực tiếp hồ sơ học sinh lớp học.'
    });
  }

  // Check student access: student/officer can only view their own record
  if ((user.role === 'STUDENT' || user.role === 'CLASS_OFFICER') && user.studentId !== studentId && user.userId !== studentId) {
    return res.status(403).json({
      success: false,
      errorCode: 'ROLE_ACCESS_DENIED',
      message: 'Học viên chỉ có quyền truy cập hồ sơ của chính mình.'
    });
  }

  // Check parent access: parent can only access their own child
  if (user.role === 'PARENT' && user.childStudentId !== studentId) {
    return res.status(403).json({
      success: false,
      errorCode: 'ROLE_ACCESS_DENIED',
      message: 'Phụ huynh chỉ có quyền xem thông tin của con em mình.'
    });
  }

  const student = studentRepository.getById(tenantId, studentId);
  if (!student) {
    const otherTenantStudent = studentRepository.findAnywhere(studentId);
    if (otherTenantStudent) {
      return res.status(403).json({
        success: false,
        errorCode: 'TENANT_ACCESS_DENIED',
        message: '403 TENANT ISOLATION ERROR: Bạn không có quyền xem thông tin học sinh của lớp khác.'
      });
    }
    return res.status(404).json({
      success: false,
      errorCode: 'STUDENT_NOT_FOUND',
      message: 'Không tìm thấy hồ sơ học sinh.'
    });
  }

  return res.json({
    success: true,
    data: sanitizeStudentRecord(student, user)
  });
});

// 3. POST /api/v1/students - Create a new student (TEACHER only)
studentRouter.post('/', requireRole('TEACHER'), (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const tenantId = user.tenantId;
  const data = req.body;

  if (!data.fullName || !data.code) {
    return res.status(400).json({
      success: false,
      errorCode: 'VALIDATION_ERROR',
      message: 'Vui lòng cung cấp đầy đủ Họ tên và Mã học sinh.'
    });
  }

  const studentId = data.id || `hs-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  // Attention categories parsing
  let attentionCategoriesJson: string | null = null;
  if (Array.isArray(data.attentionCategories)) {
    attentionCategoriesJson = JSON.stringify(data.attentionCategories);
  }

  const record: StudentRecord = {
    id: studentId,
    tenant_id: tenantId,
    class_id: data.classId || '',
    code: String(data.code).trim(),
    full_name: String(data.fullName).trim(),
    gender: data.gender === 'Nữ' ? 'Nữ' : 'Nam',
    dob: String(data.dob || '').trim(),
    group_num: Number(data.group) || 1,
    officer_role: data.officerRole ? String(data.officerRole).trim() : null,
    avatar: data.avatar || null,
    phone: data.phone || null,
    email: data.email || null,
    address: data.address || null,
    father_name: data.fatherName || data.father?.name || null,
    father_phone: data.fatherPhone || data.father?.phone || null,
    father_job: data.fatherJob || data.father?.job || null,
    mother_name: data.motherName || data.mother?.name || null,
    mother_phone: data.motherPhone || data.mother?.phone || null,
    mother_job: data.motherJob || data.mother?.job || null,
    health_notes: data.healthNotes || null,
    talents: data.talents || null,
    private_teacher_notes: data.privateTeacherNotes || null,
    needs_special_attention: data.needsSpecialAttention ? 1 : 0,
    attention_categories: attentionCategoriesJson,
    attention_note: data.attentionNote || null,
    support_measure: data.supportMeasure || null,
    attention_status: data.attentionStatus || 'monitoring',
    attention_started_at: data.attentionStartedAt || null,
    attention_updated_at: data.attentionUpdatedAt || null,
    attention_updated_by: user.userId,
    status: data.status || 'Đang học',
    raw_metadata: null,
    created_at: now,
    updated_at: now
  };

  const created = studentRepository.upsert(record);

  // Automatically ensure STUDENT and PARENT credentials exist for newly created student
  try {
    const stuToken = data.studentActivationToken || `STU-${created.code}`;
    const parToken = data.parentActivationToken || `PAR-${created.code}`;

    credentialRepository.saveCredential({
      type: 'STUDENT',
      tenant_id: tenantId,
      owner_id: created.id,
      raw_code: stuToken,
      is_officer: Boolean(created.officer_role),
      officer_role_title: created.officer_role || undefined,
      is_test_credential: user.isTestCredential || false,
      created_by: user.userId
    });

    credentialRepository.saveCredential({
      type: 'PARENT',
      tenant_id: tenantId,
      owner_id: created.id,
      raw_code: parToken,
      is_test_credential: user.isTestCredential || false,
      created_by: user.userId
    });
  } catch (credErr) {
    console.warn('[StudentRoutes] Non-blocking credential creation warning:', credErr);
  }

  // Update total_students count in class settings if exists
  syncClassTotalStudents(tenantId);

  // Audit log
  auditLogRepository.createLog({
    actorUserId: user.userId,
    actorRole: user.role,
    actorTenantId: tenantId,
    action: 'STUDENT_CREATED',
    targetType: 'STUDENT',
    targetId: created.id,
    details: { code: created.code, fullName: created.full_name }
  });

  // Persist immediately to disk backup and Cloud Firestore
  persistenceSyncService.flushToPersistentBackup();

  return res.status(201).json({
    success: true,
    data: sanitizeStudentRecord(created, user)
  });
});

// 4. PATCH /api/v1/students/:studentId - Update student record (TEACHER or self-student)
studentRouter.patch('/:studentId', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Chưa đăng nhập.' });
  }
  const tenantId = user.tenantId;
  const { studentId } = req.params;
  const data = req.body;

  const isTeacher = user.role === 'TEACHER' || (user.role as string) === 'SUPER_ADMIN';
  const isSelf = (user.role === 'STUDENT' || user.role === 'CLASS_OFFICER') &&
    (user.studentId === studentId || user.userId === studentId);

  if (!isTeacher && !isSelf) {
    return res.status(403).json({
      success: false,
      errorCode: 'FORBIDDEN',
      message: 'Bạn không có quyền cập nhật thông tin học sinh này.'
    });
  }

  const existing = studentRepository.getById(tenantId, studentId);
  if (!existing) {
    const otherTenantStudent = studentRepository.findAnywhere(studentId);
    if (otherTenantStudent) {
      return res.status(403).json({
        success: false,
        errorCode: 'TENANT_ACCESS_DENIED',
        message: '403 TENANT ISOLATION ERROR: Bạn không có quyền thao tác trên học sinh lớp khác.'
      });
    }
    return res.status(404).json({
      success: false,
      errorCode: 'STUDENT_NOT_FOUND',
      message: 'Không tìm thấy học sinh để cập nhật.'
    });
  }

  const updates: Partial<StudentRecord> = {};
  if (data.code !== undefined && isTeacher) updates.code = String(data.code).trim();
  if (data.fullName !== undefined && isTeacher) updates.full_name = String(data.fullName).trim();
  if (data.gender !== undefined) updates.gender = data.gender === 'Nữ' ? 'Nữ' : 'Nam';
  if (data.dob !== undefined) updates.dob = String(data.dob).trim();
  if (data.group !== undefined && isTeacher) updates.group_num = Number(data.group);
  if (data.officerRole !== undefined && isTeacher) updates.officer_role = data.officerRole ? String(data.officerRole).trim() : null;
  if (data.avatar !== undefined) updates.avatar = data.avatar;
  if (data.phone !== undefined) updates.phone = data.phone;
  if (data.email !== undefined) updates.email = data.email;
  if (data.address !== undefined) updates.address = data.address;
  if (data.fatherName !== undefined) updates.father_name = data.fatherName;
  if (data.fatherPhone !== undefined) updates.father_phone = data.fatherPhone;
  if (data.fatherJob !== undefined) updates.father_job = data.fatherJob;
  if (data.motherName !== undefined) updates.mother_name = data.motherName;
  if (data.motherPhone !== undefined) updates.mother_phone = data.motherPhone;
  if (data.motherJob !== undefined) updates.mother_job = data.motherJob;
  if (data.healthNotes !== undefined) updates.health_notes = data.healthNotes;
  if (data.talents !== undefined) updates.talents = data.talents;
  if (data.privateTeacherNotes !== undefined && isTeacher) updates.private_teacher_notes = data.privateTeacherNotes;
  if (data.needsSpecialAttention !== undefined && isTeacher) updates.needs_special_attention = data.needsSpecialAttention ? 1 : 0;
  if (data.attentionCategories !== undefined && isTeacher) {
    updates.attention_categories = Array.isArray(data.attentionCategories) ? JSON.stringify(data.attentionCategories) : null;
  }
  if (data.attentionNote !== undefined && isTeacher) updates.attention_note = data.attentionNote;
  if (data.supportMeasure !== undefined && isTeacher) updates.support_measure = data.supportMeasure;
  if (data.attentionStatus !== undefined && isTeacher) updates.attention_status = data.attentionStatus;
  if (data.attentionStartedAt !== undefined && isTeacher) updates.attention_started_at = data.attentionStartedAt;
  if (data.status !== undefined && isTeacher) updates.status = data.status;

  if (
    (isTeacher && (data.attentionHistory !== undefined || data.attentionEndedAt !== undefined || data.violationHandlingRecords !== undefined || data.graduationSummary !== undefined)) ||
    (isSelf && data.graduationSummary !== undefined)
  ) {
    let meta: Record<string, any> = {};
    if (existing.raw_metadata) {
      try { meta = JSON.parse(existing.raw_metadata); } catch {}
    }
    if (isTeacher && data.attentionHistory !== undefined) meta.attentionHistory = data.attentionHistory;
    if (isTeacher && data.attentionEndedAt !== undefined) meta.attentionEndedAt = data.attentionEndedAt;
    if (data.graduationSummary !== undefined) {
      const prevGrad = meta.graduationSummary || {};
      meta.graduationSummary = {
        ...prevGrad,
        ...data.graduationSummary,
        ...(isTeacher
          ? {}
          : {
              isFlagged: prevGrad.isFlagged,
              flagReasons: prevGrad.flagReasons,
              teacherNote: prevGrad.teacherNote
            })
      };
    }
    if (data.violationHandlingRecords !== undefined) {
      if (!isTeacher) {
        return res.status(403).json({
          success: false,
          errorCode: 'FORBIDDEN',
          message: 'Chỉ Giáo viên chủ nhiệm mới có quyền cập nhật hồ sơ theo dõi & xử lý vi phạm.'
        });
      }
      meta.violationHandlingRecords = data.violationHandlingRecords;
    }
    updates.raw_metadata = JSON.stringify(meta);
  }

  updates.attention_updated_by = user.userId;
  updates.attention_updated_at = new Date().toISOString();

  const updated = studentRepository.update(tenantId, studentId, updates);
  if (updates.status !== undefined) {
    syncClassTotalStudents(tenantId);
  }

  // If officer role changed, update credential officer flag
  if (data.officerRole !== undefined) {
    const isOfficer = Boolean(data.officerRole);
    credentialRepository.updateOfficerStatus(tenantId, studentId, isOfficer, data.officerRole);
  }

  // If avatar was updated, synchronize to userAvatarRepository
  if (updates.avatar) {
    userAvatarRepository.saveAvatar({
      avatar: updates.avatar,
      userId: `usr_stu_${studentId}`,
      studentId: studentId,
      role: 'STUDENT',
      tenantId: tenantId
    });
  }

  // Audit log
  auditLogRepository.createLog({
    actorUserId: user.userId,
    actorRole: user.role,
    actorTenantId: tenantId,
    action: 'STUDENT_UPDATED',
    targetType: 'STUDENT',
    targetId: studentId,
    details: { fields: Object.keys(updates) }
  });

  // Persist immediately to disk backup and Cloud Firestore
  persistenceSyncService.flushToPersistentBackup();

  return res.json({
    success: true,
    data: sanitizeStudentRecord(updated!, user)
  });
});

// 5. POST /api/v1/students/:studentId/assign-officer - Assign Officer Role (TEACHER only)
studentRouter.post('/:studentId/assign-officer', requireRole('TEACHER'), (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const tenantId = user.tenantId;
  const { studentId } = req.params;
  const { officerRole } = req.body;

  if (!officerRole || typeof officerRole !== 'string') {
    return res.status(400).json({
      success: false,
      errorCode: 'VALIDATION_ERROR',
      message: 'Vui lòng chỉ định chức danh ban cán sự.'
    });
  }

  const student = studentRepository.getById(tenantId, studentId);
  if (!student) {
    return res.status(404).json({
      success: false,
      errorCode: 'STUDENT_NOT_FOUND',
      message: 'Không tìm thấy học sinh.'
    });
  }

  studentRepository.updateOfficerRole(tenantId, studentId, officerRole.trim());
  credentialRepository.updateOfficerStatus(tenantId, studentId, true, officerRole.trim());

  auditLogRepository.createLog({
    actorUserId: user.userId,
    actorRole: user.role,
    actorTenantId: tenantId,
    action: 'OFFICER_GRANTED',
    targetType: 'STUDENT',
    targetId: studentId,
    details: { officerRole: officerRole.trim() }
  });

  persistenceSyncService.flushToPersistentBackup();

  const updated = studentRepository.getById(tenantId, studentId);
  return res.json({
    success: true,
    data: sanitizeStudentRecord(updated!, user),
    message: `Đã bổ nhiệm học sinh làm ${officerRole.trim()}.`
  });
});

// 6. POST /api/v1/students/:studentId/revoke-officer - Revoke Officer Role (TEACHER only)
studentRouter.post('/:studentId/revoke-officer', requireRole('TEACHER'), (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const tenantId = user.tenantId;
  const { studentId } = req.params;

  const student = studentRepository.getById(tenantId, studentId);
  if (!student) {
    return res.status(404).json({
      success: false,
      errorCode: 'STUDENT_NOT_FOUND',
      message: 'Không tìm thấy học sinh.'
    });
  }

  studentRepository.updateOfficerRole(tenantId, studentId, undefined);
  credentialRepository.updateOfficerStatus(tenantId, studentId, false, undefined);

  auditLogRepository.createLog({
    actorUserId: user.userId,
    actorRole: user.role,
    actorTenantId: tenantId,
    action: 'OFFICER_REVOKED',
    targetType: 'STUDENT',
    targetId: studentId,
    details: {}
  });

  persistenceSyncService.flushToPersistentBackup();

  const updated = studentRepository.getById(tenantId, studentId);
  return res.json({
    success: true,
    data: sanitizeStudentRecord(updated!, user),
    message: 'Đã thu hồi quyền ban cán sự lớp.'
  });
});

// 7. POST /api/v1/students/:studentId/archive - Archive / Inactive student (TEACHER only)
studentRouter.post('/:studentId/archive', requireRole('TEACHER'), (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const tenantId = user.tenantId;
  const { studentId } = req.params;
  const { status } = req.body;

  const student = studentRepository.getById(tenantId, studentId);
  if (!student) {
    return res.status(404).json({
      success: false,
      errorCode: 'STUDENT_NOT_FOUND',
      message: 'Không tìm thấy học sinh.'
    });
  }

  const newStatus = status || 'ARCHIVED';
  studentRepository.setStatus(tenantId, studentId, newStatus);
  syncClassTotalStudents(tenantId);

  auditLogRepository.createLog({
    actorUserId: user.userId,
    actorRole: user.role,
    actorTenantId: tenantId,
    action: 'STUDENT_ARCHIVED',
    targetType: 'STUDENT',
    targetId: studentId,
    details: { status: newStatus }
  });

  persistenceSyncService.flushToPersistentBackup();

  const updated = studentRepository.getById(tenantId, studentId);
  return res.json({
    success: true,
    data: sanitizeStudentRecord(updated!, user),
    message: `Đã chuyển trạng thái học sinh sang "${newStatus}".`
  });
});

// 8. POST /api/v1/students/batch-import - Batch import students safely with duplicate prevention
studentRouter.post('/batch-import', requireRole('TEACHER'), (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const tenantId = user.tenantId;
  const { students } = req.body;

  if (!Array.isArray(students) || students.length === 0) {
    return res.status(400).json({
      success: false,
      errorCode: 'VALIDATION_ERROR',
      message: 'Danh sách học sinh nhập khẩu không hợp lệ hoặc đang trống.'
    });
  }

  const existingStudents = studentRepository.getAllByTenant(tenantId);
  const existingCodes = new Set(existingStudents.map(s => s.code.trim().toUpperCase()));
  const batchCodes = new Set<string>();

  const added: StudentRecord[] = [];
  const duplicates: Array<{ code: string; fullName: string; reason: string }> = [];
  const errors: Array<{ row: number; reason: string }> = [];

  const now = new Date().toISOString();

  students.forEach((item: any, idx: number) => {
    const rowNum = idx + 1;
    if (!item.fullName || String(item.fullName).trim() === '') {
      errors.push({ row: rowNum, reason: 'Thiếu Họ và tên học sinh' });
      return;
    }

    const rawCode = item.code ? String(item.code).trim() : '';
    if (!rawCode) {
      errors.push({ row: rowNum, reason: 'Thiếu Mã học sinh' });
      return;
    }

    const upperCode = rawCode.toUpperCase();
    if (existingCodes.has(upperCode)) {
      duplicates.push({ code: rawCode, fullName: item.fullName, reason: 'Mã học sinh đã tồn tại trong lớp' });
      return;
    }

    if (batchCodes.has(upperCode)) {
      duplicates.push({ code: rawCode, fullName: item.fullName, reason: 'Mã học sinh bị trùng lặp trong tệp Excel' });
      return;
    }

    batchCodes.add(upperCode);

    const studentId = item.id || `hs-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`;
    const record: StudentRecord = {
      id: studentId,
      tenant_id: tenantId,
      class_id: item.classId || '',
      code: rawCode,
      full_name: String(item.fullName).trim(),
      gender: item.gender === 'Nữ' || item.gender === 'Nu' ? 'Nữ' : 'Nam',
      dob: String(item.dob || '01/01/2008').trim(),
      group_num: Number(item.group) || 1,
      officer_role: item.officerRole ? String(item.officerRole).trim() : null,
      avatar: item.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      phone: item.phone || null,
      email: item.email || null,
      address: item.address || null,
      father_name: item.fatherName || item.parent?.fatherName || null,
      father_phone: item.fatherPhone || item.parent?.fatherPhone || null,
      father_job: item.fatherJob || item.parent?.fatherJob || null,
      mother_name: item.motherName || item.parent?.motherName || null,
      mother_phone: item.motherPhone || item.parent?.motherPhone || null,
      mother_job: item.motherJob || item.parent?.motherJob || null,
      health_notes: item.healthNotes || null,
      talents: item.talents || null,
      private_teacher_notes: item.privateTeacherNotes || null,
      needs_special_attention: 0,
      attention_categories: null,
      attention_note: null,
      support_measure: null,
      attention_status: 'monitoring',
      attention_started_at: null,
      attention_updated_at: null,
      attention_updated_by: user.userId,
      status: 'Đang học',
      raw_metadata: null,
      created_at: now,
      updated_at: now
    };

    const saved = studentRepository.upsert(record);
    added.push(saved);

    try {
      const stuToken = item.studentActivationToken || `STU-${saved.code}`;
      const parToken = item.parentActivationToken || `PAR-${saved.code}`;

      credentialRepository.saveCredential({
        type: 'STUDENT',
        tenant_id: tenantId,
        owner_id: saved.id,
        raw_code: stuToken,
        is_officer: Boolean(saved.officer_role),
        officer_role_title: saved.officer_role || undefined,
        is_test_credential: user.isTestCredential || false,
        created_by: user.userId
      });

      credentialRepository.saveCredential({
        type: 'PARENT',
        tenant_id: tenantId,
        owner_id: saved.id,
        raw_code: parToken,
        is_test_credential: user.isTestCredential || false,
        created_by: user.userId
      });
    } catch (credErr) {
      console.warn('[StudentRoutes] Batch-import non-blocking credential creation warning:', credErr);
    }
  });

  // Update total count
  syncClassTotalStudents(tenantId);

  // Audit log
  auditLogRepository.createLog({
    actorUserId: user.userId,
    actorRole: user.role,
    actorTenantId: tenantId,
    action: 'STUDENTS_BATCH_IMPORTED',
    targetType: 'BATCH',
    targetId: tenantId,
    details: { addedCount: added.length, duplicateCount: duplicates.length, errorCount: errors.length }
  });

  // Persist immediately to disk backup and Cloud Firestore
  persistenceSyncService.flushToPersistentBackup();

  return res.json({
    success: true,
    addedCount: added.length,
    duplicateCount: duplicates.length,
    errorCount: errors.length,
    added: added.map(s => sanitizeStudentRecord(s, user)),
    duplicates,
    errors,
    message: `Đã nhập thành công ${added.length} học sinh. Bỏ qua ${duplicates.length} mục trùng lặp.`
  });
});

// 9. DELETE /api/v1/students/:studentId - Delete student (TEACHER only within tenant)
studentRouter.delete('/:studentId', requireRole('TEACHER'), (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const tenantId = user.tenantId;
  const { studentId } = req.params;

  const existing = studentRepository.getById(tenantId, studentId);
  if (!existing) {
    const other = studentRepository.findAnywhere(studentId);
    if (other) {
      return res.status(403).json({
        success: false,
        errorCode: 'TENANT_ACCESS_DENIED',
        message: '403 TENANT ISOLATION ERROR: Bạn không có quyền xóa học sinh của lớp khác.'
      });
    }
    return res.status(404).json({
      success: false,
      errorCode: 'STUDENT_NOT_FOUND',
      message: 'Không tìm thấy học sinh để xóa.'
    });
  }

  studentRepository.delete(tenantId, studentId);
  credentialRepository.deleteCredentialsForOwner(tenantId, studentId);

  // Update total count
  syncClassTotalStudents(tenantId);

  auditLogRepository.createLog({
    actorUserId: user.userId,
    actorRole: user.role,
    actorTenantId: tenantId,
    action: 'STUDENT_DELETED',
    targetType: 'STUDENT',
    targetId: studentId,
    details: { code: existing.code, fullName: existing.full_name }
  });

  // Persist immediately to disk backup and Cloud Firestore
  persistenceSyncService.flushToPersistentBackup();

  return res.json({
    success: true,
    message: 'Đã xóa học sinh khỏi danh sách lớp thành công.'
  });
});
