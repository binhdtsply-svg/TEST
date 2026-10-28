import { Router, Response } from 'express';
import { credentialRepository } from '../repositories/CredentialRepository';
import { teacherAccountRepository } from '../repositories/TeacherAccountRepository';
import { studentRepository } from '../repositories/StudentRepository';
import { sessionRepository } from '../repositories/SessionRepository';
import { auditLogRepository } from '../repositories/AuditLogRepository';
import { authenticateToken, requireRole, requireTenantAccess, AuthenticatedRequest } from '../auth/middleware';

export const credentialRouter = Router();

// 1. Get All Credentials for Current Tenant (GVCN / Super Admin only)
credentialRouter.get('/', authenticateToken, requireRole('SUPER_ADMIN', 'TEACHER'), (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.user?.tenantId;
  if (!tenantId) {
    return res.status(400).json({
      success: false,
      errorCode: 'TENANT_REQUIRED',
      message: 'Thiếu định danh không gian lớp học.'
    });
  }

  const credentials = credentialRepository.getCredentialsForTenant(tenantId);
  res.json({
    success: true,
    tenantId,
    credentials
  });
});

// 2. Get Credential History / Audits for Current Tenant
credentialRouter.get('/history', authenticateToken, requireRole('SUPER_ADMIN', 'TEACHER'), (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.user?.tenantId;
  if (!tenantId) {
    return res.status(400).json({
      success: false,
      errorCode: 'TENANT_REQUIRED',
      message: 'Thiếu định danh không gian lớp học.'
    });
  }

  const ownerId = typeof req.query.ownerId === 'string' ? req.query.ownerId : undefined;
  const history = credentialRepository.getCredentialHistory(tenantId, ownerId);
  res.json({
    success: true,
    tenantId,
    history
  });
});

// 3. Toggle Lock / Unlock / Revoke Credential
credentialRouter.post('/toggle-lock', authenticateToken, requireRole('SUPER_ADMIN', 'TEACHER'), requireTenantAccess, (req: AuthenticatedRequest, res: Response) => {
  const { tenantId, ownerId, type, status, reason } = req.body;

  if (!tenantId || !ownerId || !type || !status) {
    return res.status(400).json({
      success: false,
      errorCode: 'MISSING_PARAMS',
      message: 'Thiếu thông tin tenantId, ownerId, type hoặc status.'
    });
  }

  // Teacher cannot lock other teachers, only Super Admin can
  if (type === 'TEACHER' && req.user?.role !== 'SUPER_ADMIN') {
    return res.status(403).json({
      success: false,
      errorCode: 'PERMISSION_DENIED',
      message: 'Chỉ Quản trị viên cấp cao mới có quyền khóa/mở tài khoản Giáo viên.'
    });
  }

  // Enforce Teacher can only lock within their own tenant
  if (req.user?.role === 'TEACHER' && req.user.tenantId !== tenantId) {
    return res.status(403).json({
      success: false,
      errorCode: 'TENANT_ACCESS_DENIED',
      message: `403 TENANT ISOLATION ERROR: Bạn không có quyền thao tác trên không gian ${tenantId}.`
    });
  }

  if (type === 'TEACHER') {
    teacherAccountRepository.updateStatus(ownerId, status);
    const updated = teacherAccountRepository.getByTeacherId(ownerId);
    if (updated) {
      sessionRepository.invalidateSessionsByCredentialVersion(tenantId, ownerId, updated.credential_version);
    }
  } else {
    const result = credentialRepository.setCredentialStatus(tenantId, ownerId, type, status, req.user!.userId, reason);
    if (!result.success) {
      return res.status(404).json({
        success: false,
        errorCode: 'CREDENTIAL_NOT_FOUND',
        message: 'Không tìm thấy thông tin mã truy cập để cập nhật.'
      });
    }
    // Invalidate existing sessions
    sessionRepository.invalidateSessionsByCredentialVersion(tenantId, ownerId, result.credentialVersion);
  }

  auditLogRepository.log({
    actorUserId: req.user!.userId,
    actorRole: req.user!.role,
    actorTenantId: req.user!.tenantId,
    action: `CREDENTIAL_${status}_${type}`,
    targetType: type,
    targetId: ownerId,
    details: `Tenant: ${tenantId}, Status changed to ${status}${reason ? `, Reason: ${reason}` : ''}`
  });

  res.json({
    success: true,
    message: `Đã cập nhật trạng thái ${type} thành công: ${status}.`
  });
});

// 4. Regenerate Single Credential Code
credentialRouter.post('/regenerate', authenticateToken, requireRole('SUPER_ADMIN', 'TEACHER'), requireTenantAccess, (req: AuthenticatedRequest, res: Response) => {
  const { tenantId, ownerId, type, newRawCode, isOfficer, officerRoleTitle, reason } = req.body;

  if (!tenantId || !ownerId || !type || !newRawCode) {
    return res.status(400).json({
      success: false,
      errorCode: 'MISSING_PARAMS',
      message: 'Thiếu thông tin tạo mã mới.'
    });
  }

  if (req.user?.role === 'TEACHER' && req.user.tenantId !== tenantId) {
    return res.status(403).json({
      success: false,
      errorCode: 'TENANT_ACCESS_DENIED',
      message: `403 TENANT ISOLATION ERROR: Bạn không có quyền thao tác trên không gian ${tenantId}.`
    });
  }

  const updated = credentialRepository.saveCredential({
    type,
    tenant_id: tenantId,
    owner_id: ownerId,
    raw_code: newRawCode,
    is_officer: isOfficer,
    officer_role_title: officerRoleTitle,
    is_test_credential: req.user?.isTestCredential || false,
    created_by: req.user!.userId,
    reason
  });

  // Invalidate any sessions using old credential version
  sessionRepository.invalidateSessionsByCredentialVersion(tenantId, ownerId, updated.credential_version);

  auditLogRepository.log({
    actorUserId: req.user!.userId,
    actorRole: req.user!.role,
    actorTenantId: req.user!.tenantId,
    action: `CREDENTIAL_REGENERATED_${type}`,
    targetType: type,
    targetId: ownerId,
    details: `New version: ${updated.credential_version}${reason ? `, Lý do: ${reason}` : ''}`
  });

  res.json({
    success: true,
    credentialVersion: updated.credential_version,
    message: 'Đã cấp mới mã truy cập thành công.'
  });
});

// 5. Batch Save/Regenerate Credentials for Multiple Students
credentialRouter.post('/batch-save', authenticateToken, requireRole('SUPER_ADMIN', 'TEACHER'), requireTenantAccess, (req: AuthenticatedRequest, res: Response) => {
  const { tenantId, items, reason } = req.body;

  if (!tenantId || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      errorCode: 'INVALID_DATA',
      message: 'Thiếu dữ liệu danh sách mã cần lưu.'
    });
  }

  if (req.user?.role === 'TEACHER' && req.user.tenantId !== tenantId) {
    return res.status(403).json({
      success: false,
      errorCode: 'TENANT_ACCESS_DENIED',
      message: `403 TENANT ISOLATION ERROR: Bạn không có quyền thao tác trên không gian ${tenantId}.`
    });
  }

  const results: any[] = [];
  for (const item of items) {
    const { ownerId, type, rawCode, isOfficer, officerRoleTitle } = item;
    if (ownerId && type && rawCode) {
      const saved = credentialRepository.saveCredential({
        type,
        tenant_id: tenantId,
        owner_id: ownerId,
        raw_code: rawCode,
        is_officer: isOfficer,
        officer_role_title: officerRoleTitle,
        is_test_credential: req.user?.isTestCredential || false,
        created_by: req.user!.userId,
        reason: reason || 'Cấp mã đồng loạt theo danh sách lớp'
      });
      sessionRepository.invalidateSessionsByCredentialVersion(tenantId, ownerId, saved.credential_version);
      results.push({ ownerId, type, credentialVersion: saved.credential_version });
    }
  }

  auditLogRepository.log({
    actorUserId: req.user!.userId,
    actorRole: req.user!.role,
    actorTenantId: req.user!.tenantId,
    action: 'CREDENTIALS_BATCH_SAVED',
    targetType: 'BATCH',
    targetId: tenantId,
    details: `Updated ${results.length} credentials for tenant ${tenantId}`
  });

  res.json({
    success: true,
    count: results.length,
    message: `Đã lưu và đồng bộ thành công ${results.length} mã truy cập.`
  });
});

// 6. Reset Student / Parent Password (by Teacher or Admin)
credentialRouter.post('/reset-password', authenticateToken, requireRole('SUPER_ADMIN', 'TEACHER'), requireTenantAccess, (req: AuthenticatedRequest, res: Response) => {
  const { tenantId, ownerId, type } = req.body;
  const userRole = req.user?.role;

  if (!tenantId || !ownerId || !type) {
    return res.status(400).json({
      success: false,
      errorCode: 'MISSING_PARAMS',
      message: 'Thiếu thông tin tenantId, ownerId hoặc type.'
    });
  }

  // Strict Role Checking:
  // 1. TEACHER: Can ONLY reset passwords for STUDENT and PARENT in their own class
  if (userRole === 'TEACHER') {
    if (type !== 'STUDENT' && type !== 'PARENT') {
      return res.status(403).json({
        success: false,
        errorCode: 'PERMISSION_DENIED',
        message: 'Giáo viên chủ nhiệm chỉ có quyền đặt lại mật khẩu cho học sinh và phụ huynh trong lớp mình chủ nhiệm.'
      });
    }

    if (req.user!.tenantId !== tenantId) {
      return res.status(403).json({
        success: false,
        errorCode: 'TENANT_ACCESS_DENIED',
        message: `403 TENANT ISOLATION ERROR: Bạn không có quyền thao tác trên không gian ${tenantId}.`
      });
    }

    // Verify student belongs to this teacher's class
    const student = studentRepository.getById(tenantId, ownerId);
    if (!student) {
      return res.status(403).json({
        success: false,
        errorCode: 'STUDENT_NOT_IN_CLASS',
        message: 'Học sinh hoặc phụ huynh này không thuộc danh sách lớp chủ nhiệm của bạn.'
      });
    }

    const result = credentialRepository.resetPasswordByTeacher({
      tenantId,
      ownerId,
      type,
      actorUserId: req.user!.userId
    });

    if (!result.success) {
      return res.status(404).json(result);
    }

    // Invalidate sessions
    if (result.credentialVersion) {
      sessionRepository.invalidateSessionsByCredentialVersion(tenantId, ownerId, result.credentialVersion);
    }

    return res.json(result);
  }

  // 2. SUPER_ADMIN: Can reset passwords for ANY role (TEACHER, STUDENT, PARENT)
  if (userRole === 'SUPER_ADMIN') {
    if (type === 'TEACHER') {
      const teacherResult = credentialRepository.resetPasswordByAdmin({
        tenantId,
        ownerId,
        type: 'TEACHER',
        actorUserId: req.user!.userId
      });

      if (teacherResult.success) {
        const teacherAcc = teacherAccountRepository.getByTeacherId(ownerId) || teacherAccountRepository.getByTenantId(tenantId);
        if (teacherAcc) {
          teacherAccountRepository.incrementCredentialVersion(teacherAcc.id);
          sessionRepository.invalidateSessionsByCredentialVersion(tenantId, teacherAcc.id, (teacherAcc.credential_version || 1) + 1);
        }
      }
      return res.json(teacherResult);
    }

    const result = credentialRepository.resetPasswordByAdmin({
      tenantId,
      ownerId,
      type,
      actorUserId: req.user!.userId
    });

    if (!result.success) {
      return res.status(404).json(result);
    }

    // Invalidate sessions
    if (result.credentialVersion) {
      sessionRepository.invalidateSessionsByCredentialVersion(tenantId, ownerId, result.credentialVersion);
    }

    return res.json(result);
  }

  return res.status(403).json({
    success: false,
    errorCode: 'PERMISSION_DENIED',
    message: 'Bạn không có quyền thực hiện thao tác đặt lại mật khẩu.'
  });
});

// 7. Direct Set / Grant Password for Student / Parent (by Teacher or Admin)
credentialRouter.post('/set-password', authenticateToken, requireRole('SUPER_ADMIN', 'TEACHER'), requireTenantAccess, (req: AuthenticatedRequest, res: Response) => {
  const { tenantId, ownerId, type, newPassword } = req.body;
  const userRole = req.user?.role;

  if (!tenantId || !ownerId || !type || !newPassword) {
    return res.status(400).json({
      success: false,
      errorCode: 'MISSING_PARAMS',
      message: 'Thiếu thông tin tenantId, ownerId, type hoặc mật khẩu mới.'
    });
  }

  if (typeof newPassword !== 'string' || newPassword.trim().length < 6) {
    return res.status(400).json({
      success: false,
      errorCode: 'INVALID_PASSWORD_LENGTH',
      message: 'Mật khẩu phải có độ dài tối thiểu 6 ký tự.'
    });
  }

  // 1. TEACHER: Can ONLY set passwords for STUDENT and PARENT in their own class
  if (userRole === 'TEACHER') {
    if (type !== 'STUDENT' && type !== 'PARENT') {
      return res.status(403).json({
        success: false,
        errorCode: 'PERMISSION_DENIED',
        message: 'Giáo viên chủ nhiệm chỉ có quyền cấp mật khẩu cho học sinh và phụ huynh trong lớp mình chủ nhiệm.'
      });
    }

    if (req.user!.tenantId !== tenantId) {
      return res.status(403).json({
        success: false,
        errorCode: 'TENANT_ACCESS_DENIED',
        message: `403 TENANT ISOLATION ERROR: Bạn không có quyền thao tác trên không gian ${tenantId}.`
      });
    }

    // Verify student belongs to this teacher's class
    const student = studentRepository.getById(tenantId, ownerId);
    if (!student) {
      return res.status(403).json({
        success: false,
        errorCode: 'STUDENT_NOT_IN_CLASS',
        message: 'Học sinh hoặc phụ huynh này không thuộc danh sách lớp chủ nhiệm của bạn.'
      });
    }

    const result = credentialRepository.setPasswordByTeacher({
      tenantId,
      ownerId,
      type,
      newPasswordPlain: newPassword.trim(),
      actorUserId: req.user!.userId
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    // Invalidate existing sessions
    if (result.credentialVersion) {
      sessionRepository.invalidateSessionsByCredentialVersion(tenantId, ownerId, result.credentialVersion);
    }

    return res.json(result);
  }

  // 2. SUPER_ADMIN: Can set passwords for ANY role
  if (userRole === 'SUPER_ADMIN') {
    const result = credentialRepository.setPasswordByTeacher({
      tenantId,
      ownerId,
      type,
      newPasswordPlain: newPassword.trim(),
      actorUserId: req.user!.userId,
      actorRole: 'SUPER_ADMIN'
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    if (result.credentialVersion) {
      sessionRepository.invalidateSessionsByCredentialVersion(tenantId, ownerId, result.credentialVersion);
    }

    return res.json(result);
  }

  return res.status(403).json({
    success: false,
    errorCode: 'PERMISSION_DENIED',
    message: 'Bạn không có quyền thực hiện thao tác cấp mật khẩu.'
  });
});

// 8. Batch Grant / Reset Passwords for Students & Parents (by Teacher or Admin)
credentialRouter.post('/batch-grant-passwords', authenticateToken, requireRole('SUPER_ADMIN', 'TEACHER'), requireTenantAccess, (req: AuthenticatedRequest, res: Response) => {
  const { tenantId, targetType = 'ALL', targetStudentIds, customPassword, reason } = req.body;
  const userRole = req.user?.role;

  if (!tenantId) {
    return res.status(400).json({
      success: false,
      errorCode: 'MISSING_PARAMS',
      message: 'Thiếu thông tin tenantId.'
    });
  }

  // 1. TEACHER: Tenant isolation and student class membership validation
  if (userRole === 'TEACHER') {
    if (req.user!.tenantId !== tenantId) {
      return res.status(403).json({
        success: false,
        errorCode: 'TENANT_ACCESS_DENIED',
        message: `403 TENANT ISOLATION ERROR: Bạn không có quyền thao tác trên không gian ${tenantId}.`
      });
    }

    if (Array.isArray(targetStudentIds) && targetStudentIds.length > 0) {
      for (const sId of targetStudentIds) {
        const student = studentRepository.getById(tenantId, sId);
        if (!student) {
          return res.status(403).json({
            success: false,
            errorCode: 'STUDENT_NOT_IN_CLASS',
            message: `Học sinh có mã ID ${sId} không thuộc danh sách lớp chủ nhiệm của bạn.`
          });
        }
      }
    }
  }

  const result = credentialRepository.batchGrantPasswords({
    tenantId,
    targetType: targetType as 'ALL' | 'STUDENT' | 'PARENT',
    targetOwnerIds: Array.isArray(targetStudentIds) && targetStudentIds.length > 0 ? targetStudentIds : undefined,
    customPassword: customPassword && typeof customPassword === 'string' ? customPassword.trim() : undefined,
    actorUserId: req.user!.userId,
    actorRole: userRole,
    reason: reason || (userRole === 'TEACHER' ? 'GVCN cấp mật khẩu tự động cho học sinh/phụ huynh' : 'Admin cấp mật khẩu hàng loạt')
  });

  if (!result.success) {
    return res.status(400).json(result);
  }

  // Invalidate any active sessions for all affected students/parents
  for (const item of result.generatedList) {
    sessionRepository.invalidateSessionsByOwner(tenantId, item.studentId);
  }

  return res.json(result);
});


