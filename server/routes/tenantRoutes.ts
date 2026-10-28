import { Router, Response, Request } from 'express';
import { tenantRepository } from '../repositories/TenantRepository';
import { teacherAccountRepository } from '../repositories/TeacherAccountRepository';
import { auditLogRepository } from '../repositories/AuditLogRepository';
import { studentRepository } from '../repositories/StudentRepository';
import { credentialRepository } from '../repositories/CredentialRepository';
import { systemSettingsRepository } from '../repositories/SystemSettingsRepository';
import { supportRepository } from '../repositories/SupportRepository';
import { ClassSettingsRepository } from '../repositories/ClassSettingsRepository';
import { getDatabase } from '../db/database';
import { persistenceSyncService } from '../services/PersistenceSyncService';
import { authenticateToken, requireRole, requireTenantAccess, AuthenticatedRequest } from '../auth/middleware';

export const tenantRouter = Router();

// 0. Public: Get Admin Contact Information (for login screen & footer)
tenantRouter.get('/system/contact', (_req: Request, res: Response) => {
  const contact = systemSettingsRepository.getAdminContact();
  res.json({
    success: true,
    contact: contact || null
  });
});

// 0b. Public: Get list of active workspaces/tenants (for multi-tenant client hydration)
tenantRouter.get('/public/list', (_req: Request, res: Response) => {
  try {
    const allTenants = tenantRepository.getAll();
    const publicTenants = allTenants.map((t) => ({
      id: t.id,
      name: t.name,
      schoolName: t.school_name,
      ownerName: t.owner_name,
      ownerEmail: t.owner_email,
      plan: t.plan,
      status: t.status,
      createdAt: t.created_at,
      updatedAt: t.updated_at
    }));
    res.json({
      success: true,
      tenants: publicTenants
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err?.message || 'Không thể lấy danh sách không gian lớp.'
    });
  }
});

// 0c. Public: Get sanitized list of active teachers (for client workspace hydration and login lookup)
tenantRouter.get('/public/teachers', (_req: Request, res: Response) => {
  try {
    const allTeachers = teacherAccountRepository.getAll();
    const classSettingsRepo = ClassSettingsRepository.getInstance();
    const publicTeachers = allTeachers
      .filter(t => t.status === 'ACTIVE')
      .map(t => {
        const tenant = tenantRepository.getById(t.tenant_id);
        const classSetting = classSettingsRepo.getByTenantAndClass(t.tenant_id);
        return {
          id: t.teacher_id,
          teacherId: t.teacher_id,
          tenantId: t.tenant_id,
          email: t.email,
          fullName: t.full_name,
          phone: t.phone || '',
          schoolName: classSetting?.school_name || tenant?.school_name || 'Trường THPT',
          workspaceName: tenant?.name || `Không gian GVCN ${t.full_name}`,
          className: classSetting?.class_name || (t.tenant_id === 'tenant-lan-nguyen' ? '11A1' : t.tenant_id === 'tenant-hoang-nam' ? '12A2' : '10A1'),
          academicYear: classSetting?.academic_year || '2025 - 2026',
          loginMethod: t.login_method,
          allowedGoogleEmail: t.google_email || t.email,
          status: t.status,
          createdAt: t.created_at
        };
      });
    res.json({
      success: true,
      teachers: publicTeachers
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err?.message || 'Không thể lấy danh sách giáo viên.'
    });
  }
});

// 1. Super Admin: Get Admin Contact Information
tenantRouter.get('/admin/contact', authenticateToken, requireRole('SUPER_ADMIN'), (_req: AuthenticatedRequest, res: Response) => {
  const contact = systemSettingsRepository.getAdminContact();
  res.json({
    success: true,
    contact: contact || null
  });
});

// 2. Super Admin: Update Admin Contact Information (Persisted to database)
tenantRouter.post('/admin/contact', authenticateToken, requireRole('SUPER_ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const { organizationName, contactPerson, email, phone, address, workingHours, notes } = req.body;
  const user = req.user!;

  const contactData = {
    organizationName: organizationName?.trim() || '',
    contactPerson: contactPerson?.trim() || '',
    email: email?.trim() || '',
    phone: phone?.trim() || '',
    address: address?.trim() || '',
    workingHours: workingHours?.trim() || '',
    notes: notes?.trim() || ''
  };

  systemSettingsRepository.setAdminContact(contactData, user.userId);

  auditLogRepository.log({
    actorUserId: user.userId,
    actorRole: 'SUPER_ADMIN',
    actorTenantId: 'platform-root',
    action: 'UPDATE_ADMIN_CONTACT_INFO',
    targetType: 'SYSTEM_SETTINGS',
    targetId: 'admin_contact_info',
    details: { contactPerson: contactData.contactPerson, email: contactData.email }
  });

  const saved = systemSettingsRepository.getAdminContact();
  res.json({
    success: true,
    message: 'Cập nhật thông tin liên hệ Ban Quản trị thành công.',
    contact: saved
  });
});

// 3. Super Admin: Real System Statistics (Aggregated from real database tables)
tenantRouter.get('/admin/stats', authenticateToken, requireRole('SUPER_ADMIN'), (_req: AuthenticatedRequest, res: Response) => {
  const allTenants = tenantRepository.getAll();
  const allTeachers = teacherAccountRepository.getAll();
  const credentialStats = credentialRepository.getStats();
  const totalStudents = studentRepository.countAll();
  const totalAuditLogs = auditLogRepository.countAll();

  const activeTenants = allTenants.filter(t => t.status === 'ACTIVE').length;
  const lockedTenants = allTenants.filter(t => t.status === 'LOCKED').length;

  const activeTeachers = allTeachers.filter(t => t.status === 'ACTIVE').length;
  const lockedTeachers = allTeachers.filter(t => t.status === 'LOCKED').length;

  // Support & Feedback Stats from real database
  const supportStats = supportRepository.getStats();

  // Surveys & System Usage from real database
  let surveyStats = {
    total: 0,
    published: 0,
    drafts: 0,
    archived: 0,
    responses: 0,
    completedResponses: 0
  };

  let usageStats = {
    activeUsers: 0,
    totalLogins: 0,
    recentAudits: [] as any[]
  };

  try {
    const db = getDatabase();
    
    // Check survey templates count
    const totalSurveys = (db.prepare('SELECT COUNT(*) as count FROM survey_templates').get() as any)?.count || 0;
    const pubSurveys = (db.prepare("SELECT COUNT(*) as count FROM survey_templates WHERE status = 'PUBLISHED'").get() as any)?.count || 0;
    const draftSurveys = (db.prepare("SELECT COUNT(*) as count FROM survey_templates WHERE status = 'DRAFT'").get() as any)?.count || 0;
    const archSurveys = (db.prepare("SELECT COUNT(*) as count FROM survey_templates WHERE status = 'ARCHIVED'").get() as any)?.count || 0;
    const respCount = (db.prepare('SELECT COUNT(*) as count FROM survey_responses').get() as any)?.count || 0;
    const compRespCount = (db.prepare("SELECT COUNT(*) as count FROM survey_responses WHERE status = 'COMPLETED'").get() as any)?.count || respCount;

    surveyStats = {
      total: totalSurveys,
      published: pubSurveys,
      drafts: draftSurveys,
      archived: archSurveys,
      responses: respCount,
      completedResponses: compRespCount
    };

    // Usage & Login counts
    const activeUsersRow = db.prepare('SELECT COUNT(DISTINCT owner_id) as count FROM credentials WHERE last_login_at IS NOT NULL').get() as any;
    const totalLoginsRow = db.prepare('SELECT COUNT(*) as count FROM credentials WHERE last_login_at IS NOT NULL').get() as any;
    const recentLogs = db.prepare('SELECT action, target_type AS module, actor_user_id AS performed_by, created_at AS timestamp, details FROM audit_logs ORDER BY created_at DESC LIMIT 8').all() as any[];

    usageStats = {
      activeUsers: activeUsersRow?.count || 0,
      totalLogins: totalLoginsRow?.count || 0,
      recentAudits: recentLogs || []
    };
  } catch (err) {
    console.error('Error fetching survey/usage db stats:', err);
  }

  res.json({
    success: true,
    stats: {
      totalTenants: allTenants.length,
      activeTenants: activeTenants,
      totalTeachers: allTeachers.length,
      activeTeachers: activeTeachers,
      totalClasses: allTenants.filter(t => t.id !== 'platform-root').length,
      totalStudents: totalStudents,
      totalCredentials: credentialStats.total,
      activeCredentials: credentialStats.active,
      tenants: {
        total: allTenants.length,
        active: activeTenants,
        locked: lockedTenants
      },
      teachers: {
        total: allTeachers.length,
        active: activeTeachers,
        locked: lockedTeachers
      },
      classes: {
        total: allTenants.filter(t => t.id !== 'platform-root').length
      },
      students: {
        total: totalStudents
      },
      credentials: {
        total: credentialStats.total,
        active: credentialStats.active,
        locked: credentialStats.locked,
        revoked: credentialStats.revoked,
        teachers: credentialStats.teachers,
        students: credentialStats.students,
        parents: credentialStats.parents
      },
      surveys: surveyStats,
      support: supportStats,
      usage: usageStats,
      auditLogs: {
        total: totalAuditLogs
      },
      system: {
        schemaVersion: 4,
        platformName: 'Không Gian Chủ Nhiệm Số',
        version: 'v2.5.0-SAAS'
      }
    }
  });
});

// 3b. Super Admin: List all teacher accounts with exact student counts and credentials from database
tenantRouter.get('/admin/teachers', authenticateToken, requireRole('SUPER_ADMIN'), (_req: AuthenticatedRequest, res: Response) => {
  const allTeachers = teacherAccountRepository.getAll();
  const classSettingsRepo = ClassSettingsRepository.getInstance();
  const teachersWithCounts = allTeachers.map(t => {
    const studentCount = studentRepository.countByTenant(t.tenant_id);
    const tenant = tenantRepository.getById(t.tenant_id);
    const cred = credentialRepository.findByTenantAndOwner(t.tenant_id, t.teacher_id, 'TEACHER');
    const classSetting = classSettingsRepo.getByTenantAndClass(t.tenant_id);
    let effectiveTotalStudents = studentCount;
    if (typeof classSetting?.total_students === 'number' && classSetting.total_students > 0) {
      effectiveTotalStudents = classSetting.total_students;
    } else if (classSetting?.raw_metadata) {
      try {
        const meta = JSON.parse(classSetting.raw_metadata);
        if (typeof meta.confirmedTotalStudents === 'number' && meta.confirmedTotalStudents > 0) {
          effectiveTotalStudents = meta.confirmedTotalStudents;
        }
      } catch {}
    }

    return {
      id: t.teacher_id,
      tenantId: t.tenant_id,
      email: t.email,
      fullName: t.full_name,
      phone: t.phone || '',
      schoolName: classSetting?.school_name || tenant?.school_name || 'Trường THPT',
      workspaceName: tenant?.name || `Không gian GVCN ${t.full_name}`,
      className: classSetting?.class_name || (t.tenant_id === 'tenant-lan-nguyen' ? '11A1' : t.tenant_id === 'tenant-hoang-nam' ? '12A2' : '10A1'),
      academicYear: classSetting?.academic_year || '2025 - 2026',
      loginMethod: t.login_method,
      allowedGoogleEmail: t.google_email || t.email,
      classesCount: 1,
      totalStudentsCount: effectiveTotalStudents,
      status: t.status,
      activationToken: cred?.lookup_identifier || 'ACT-ACTIVE',
      hasPassword: Boolean(cred?.password_hash),
      passwordUpdatedAt: cred?.password_updated_at || null,
      createdAt: t.created_at,
      createdBy: 'Super Admin'
    };
  });

  res.json({
    success: true,
    teachers: teachersWithCounts
  });
});

// 4. Get All Tenants (Super Admin) or Single Tenant (Teacher)
tenantRouter.get('/', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role === 'SUPER_ADMIN') {
    const tenants = tenantRepository.getAll();
    return res.json({ success: true, tenants });
  }

  // Teacher only gets their own tenant
  const tenant = tenantRepository.getById(req.user!.tenantId);
  return res.json({ success: true, tenants: tenant ? [tenant] : [] });
});

// 5. Super Admin: Create Teacher Workspace and Account with optional Password & Custom Code
tenantRouter.post('/admin/create-teacher', authenticateToken, requireRole('SUPER_ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const { fullName, email, phone, schoolName, plan, className, password, initialCode, accessCode } = req.body;
  const user = req.user!;

  if (!fullName || !email || !schoolName) {
    return res.status(400).json({
      success: false,
      errorCode: 'MISSING_REQUIRED_FIELDS',
      message: 'Vui lòng cung cấp đầy đủ họ tên, email và trường học.'
    });
  }

  const cleanEmail = String(email).trim().toLowerCase();

  // Validate email standard regex (no requirement for @gmail.com - accepts all valid domains)
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(cleanEmail)) {
    return res.status(400).json({
      success: false,
      errorCode: 'INVALID_EMAIL_FORMAT',
      message: 'Địa chỉ email không đúng định dạng hợp lệ (VD: tengv@school.edu.vn hoặc gvcn@outlook.com).'
    });
  }

  // Check if email already exists
  const existingTeacher = teacherAccountRepository.getByGoogleEmail(cleanEmail);
  if (existingTeacher) {
    return res.status(400).json({
      success: false,
      errorCode: 'EMAIL_ALREADY_EXISTS',
      message: `Email "${cleanEmail}" đã được sử dụng cho tài khoản GVCN "${existingTeacher.full_name}".`
    });
  }

  // Check custom access code if specified
  const rawProvidedCode = initialCode || accessCode;
  let activationToken = '';
  if (rawProvidedCode && String(rawProvidedCode).trim()) {
    const cleanCode = String(rawProvidedCode).trim().toUpperCase();
    const existingCred = credentialRepository.findByLookupIdentifier(cleanCode);
    if (existingCred) {
      return res.status(400).json({
        success: false,
        errorCode: 'CODE_ALREADY_EXISTS',
        message: `Mã đăng nhập "${cleanCode}" đã tồn tại trên hệ thống. Vui lòng chọn mã khác.`
      });
    }
    activationToken = cleanCode;
  } else {
    // Generate unique standard access code
    const yr = new Date().getFullYear();
    const randPart = Math.random().toString(36).substring(2, 7).toUpperCase();
    activationToken = `GV-${yr}-${randPart}`;
  }

  // Password handling
  let finalPassword = '';
  if (password && String(password).trim()) {
    if (String(password).trim().length < 6) {
      return res.status(400).json({
        success: false,
        errorCode: 'PASSWORD_TOO_SHORT',
        message: 'Mật khẩu phải có độ dài tối thiểu 6 ký tự.'
      });
    }
    finalPassword = String(password).trim();
  } else {
    finalPassword = `GV@${Math.random().toString(36).substring(2, 8).toUpperCase()}!`;
  }

  // Generate identifiers
  const slug = String(fullName)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 20);

  const tenantId = `tenant-${slug}-${Date.now().toString(36)}`;
  const teacherId = `tch-${Date.now().toString(36)}`;
  const finalClassName = className ? String(className).trim() : '10A1';
  const classId = `class-${finalClassName.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now().toString(36)}`;
  const now = new Date().toISOString();

  // 1. Create tenant
  tenantRepository.createOrUpdate({
    id: tenantId,
    name: `Không gian GVCN ${fullName}`,
    school_name: String(schoolName || 'Trường THPT'),
    plan: plan || 'STANDARD',
    status: 'ACTIVE',
    created_at: now,
    updated_at: now
  });

  // 2. Initialize class settings in class_settings table
  try {
    ClassSettingsRepository.getInstance().upsert({
      tenant_id: tenantId,
      class_id: classId,
      school_name: String(schoolName || 'Trường THPT'),
      class_name: finalClassName,
      grade: finalClassName.replace(/[^0-9]/g, '') || '10',
      stream: 'Tự nhiên',
      academic_year: '2025-2026',
      semester: 'HK1',
      teacher_name: fullName,
      teacher_phone: phone ? String(phone).trim() : '',
      teacher_email: cleanEmail,
      theme_json: JSON.stringify({ primaryColor: 'blue' }),
      subjects_json: JSON.stringify([]),
      total_students: 0,
      student_identity_mode: 'IDENTIFIED',
      created_at: now,
      updated_at: now
    });
  } catch (classErr) {
    console.warn('[TenantRoutes] Class settings upsert warning:', classErr);
  }

  // 3. Create teacher account record
  teacherAccountRepository.createOrUpdate({
    id: teacherId,
    teacher_id: teacherId,
    tenant_id: tenantId,
    full_name: fullName,
    email: cleanEmail,
    phone: phone ? String(phone).trim() : undefined,
    login_method: 'BOTH',
    status: 'ACTIVE',
    credential_version: 1,
    created_at: now,
    updated_at: now
  });

  // 4. Create credential record in credentials table
  credentialRepository.saveCredential({
    tenant_id: tenantId,
    owner_id: teacherId,
    type: 'TEACHER',
    raw_code: activationToken,
    is_officer: false,
    is_test_credential: false,
    created_by: user.userId,
    reason: 'Admin cấp tài khoản GVCN mới'
  });

  // 5. Set hashed password for immediate login
  credentialRepository.setPassword({
    tenantId,
    ownerId: teacherId,
    type: 'TEACHER',
    newPasswordPlain: finalPassword,
    actorUserId: user.userId
  });

  auditLogRepository.log({
    actorUserId: user.userId,
    actorRole: 'SUPER_ADMIN',
    actorTenantId: 'platform-root',
    action: 'CREATE_TEACHER_ACCOUNT',
    targetType: 'TEACHER',
    targetId: teacherId,
    details: { fullName, email: cleanEmail, schoolName, plan: plan || 'STANDARD', className: finalClassName, activationToken }
  });

  // Synchronize immediately to persistent backup
  persistenceSyncService.flushToPersistentBackup();

  return res.json({
    success: true,
    message: 'Tạo Không gian và cấp tài khoản GVCN thành công.',
    account: {
      id: teacherId,
      tenantId,
      email: cleanEmail,
      fullName,
      phone,
      schoolName,
      className: finalClassName,
      status: 'ACTIVE',
      activationToken,
      temporaryPassword: finalPassword,
      hasPassword: true
    },
    tenant: {
      id: tenantId,
      name: `Không gian GVCN ${fullName}`,
      schoolName
    }
  });
});

// 6. Super Admin: Reset Password for Teacher (Preserves Access Code, Email, Role, and Class Data)
tenantRouter.post('/admin/reset-password', authenticateToken, requireRole('SUPER_ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const { teacherId, newPassword } = req.body;
  const user = req.user!;

  if (!teacherId) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng cung cấp mã định danh tài khoản GVCN (teacherId).'
    });
  }

  const teacher = teacherAccountRepository.getByTeacherId(teacherId)
    || teacherAccountRepository.getByTenantId(teacherId);

  if (!teacher) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy thông tin tài khoản Giáo viên chủ nhiệm.'
    });
  }

  let finalPassword = '';
  if (newPassword && String(newPassword).trim()) {
    if (String(newPassword).trim().length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu mới phải có độ dài tối thiểu 6 ký tự.'
      });
    }
    finalPassword = String(newPassword).trim();
  } else {
    finalPassword = `GV@${Math.random().toString(36).substring(2, 8).toUpperCase()}!`;
  }

  // Ensure credential exists
  let cred = credentialRepository.findByTenantAndOwner(teacher.tenant_id, teacher.teacher_id, 'TEACHER');
  if (!cred) {
    const autoToken = `GV-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    cred = credentialRepository.saveCredential({
      tenant_id: teacher.tenant_id,
      owner_id: teacher.teacher_id,
      type: 'TEACHER',
      raw_code: autoToken,
      created_by: user.userId,
      reason: 'Khởi tạo mã truy cập cho GVCN khi reset mật khẩu'
    });
  }

  // Update password in credentials (hashes password, retains lookup_identifier)
  const setResult = credentialRepository.setPassword({
    tenantId: teacher.tenant_id,
    ownerId: teacher.teacher_id,
    type: 'TEACHER',
    newPasswordPlain: finalPassword,
    actorUserId: user.userId
  });

  if (!setResult.success) {
    return res.status(400).json({
      success: false,
      message: setResult.message || 'Không thể thiết lập mật khẩu mới.'
    });
  }

  // Invalidate active sessions for this teacher to enforce re-login
  try {
    const db = getDatabase();
    db.prepare('DELETE FROM auth_sessions WHERE teacher_id = ? OR user_id = ?').run(teacher.teacher_id, teacher.id);
  } catch (sessErr) {
    console.warn('[TenantRoutes] Failed to clear teacher sessions on password reset:', sessErr);
  }

  auditLogRepository.log({
    actorUserId: user.userId,
    actorRole: 'SUPER_ADMIN',
    actorTenantId: 'platform-root',
    action: 'RESET_TEACHER_PASSWORD',
    targetType: 'TEACHER',
    targetId: teacher.teacher_id,
    details: { fullName: teacher.full_name, email: teacher.email }
  });

  // Synchronize immediately to persistent backup and Cloud Firestore
  persistenceSyncService.flushToPersistentBackup();

  return res.json({
    success: true,
    message: `Đã đặt lại mật khẩu cho GVCN ${teacher.full_name} thành công.`,
    temporaryPassword: finalPassword,
    teacherId: teacher.teacher_id,
    fullName: teacher.full_name,
    email: teacher.email,
    activationToken: cred.lookup_identifier
  });
});

// 7. Super Admin: Delete Teacher Account (Strict Preservation: Class, Student, and Parent data are NOT deleted)
tenantRouter.delete('/admin/teacher/:teacherId', authenticateToken, requireRole('SUPER_ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const { teacherId } = req.params;
  const user = req.user!;

  if (!teacherId) {
    return res.status(400).json({ success: false, message: 'Thiếu mã định danh giáo viên.' });
  }

  const teacher = teacherAccountRepository.getByTeacherId(teacherId)
    || teacherAccountRepository.getByTenantId(teacherId);

  if (!teacher) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản GVCN cần xóa.' });
  }

  const db = getDatabase();

  // Invalidate active sessions for this teacher
  try {
    db.prepare('DELETE FROM auth_sessions WHERE teacher_id = ? OR user_id = ?').run(teacher.teacher_id, teacher.id);
  } catch (sessErr) {
    console.warn('[TenantRoutes] Failed to clear sessions for deleted teacher:', sessErr);
  }

  // Delete credentials ONLY for TEACHER owner (preserve all student/parent credentials)
  try {
    db.prepare("DELETE FROM credentials WHERE owner_id = ? AND type = 'TEACHER'").run(teacher.teacher_id);
  } catch (credErr) {
    console.warn('[TenantRoutes] Failed to delete teacher credentials:', credErr);
  }

  // Delete teacher account record from teacher_accounts
  try {
    db.prepare('DELETE FROM teacher_accounts WHERE teacher_id = ?').run(teacher.teacher_id);
  } catch (taErr) {
    console.warn('[TenantRoutes] Failed to delete teacher account:', taErr);
  }

  // CRITICAL MANDATE: DO NOT delete tenant! DO NOT delete students! DO NOT delete class_settings!
  // All class, student, parent and academic records remain 100% preserved.

  auditLogRepository.log({
    actorUserId: user.userId,
    actorRole: 'SUPER_ADMIN',
    actorTenantId: 'platform-root',
    action: 'DELETE_TEACHER_ACCOUNT',
    targetType: 'TEACHER',
    targetId: teacher.teacher_id,
    details: { fullName: teacher.full_name, email: teacher.email, tenantId: teacher.tenant_id }
  });

  // Synchronize immediately to persistent backup
  persistenceSyncService.flushToPersistentBackup();

  return res.json({
    success: true,
    message: `Đã xóa tài khoản GVCN ${teacher.full_name}. Dữ liệu lớp học, học viên và phụ huynh được bảo toàn nguyên vẹn.`
  });
});

// 8. Super Admin: Toggle Teacher Account Status (Lock / Unlock)
tenantRouter.post('/admin/toggle-teacher-status', authenticateToken, requireRole('SUPER_ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const { teacherId } = req.body;
  const user = req.user!;

  const teacher = teacherAccountRepository.getByTeacherId(teacherId)
    || teacherAccountRepository.getByTenantId(teacherId);

  if (!teacher) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản GVCN.' });
  }

  const nextStatus = teacher.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE';
  teacherAccountRepository.updateStatus(teacher.teacher_id, nextStatus);

  // Sync credential and tenant status
  const db = getDatabase();
  try {
    db.prepare("UPDATE credentials SET status = ? WHERE owner_id = ? AND type = 'TEACHER'").run(nextStatus, teacher.teacher_id);
    db.prepare("UPDATE tenants SET status = ? WHERE id = ?").run(nextStatus, teacher.tenant_id);
    if (nextStatus === 'LOCKED') {
      db.prepare('DELETE FROM auth_sessions WHERE teacher_id = ? OR user_id = ?').run(teacher.teacher_id, teacher.id);
    }
  } catch (err) {
    console.warn('[TenantRoutes] Failed to sync status across tables:', err);
  }

  auditLogRepository.log({
    actorUserId: user.userId,
    actorRole: 'SUPER_ADMIN',
    actorTenantId: 'platform-root',
    action: nextStatus === 'ACTIVE' ? 'UNLOCK_TEACHER_ACCOUNT' : 'LOCK_TEACHER_ACCOUNT',
    targetType: 'TEACHER',
    targetId: teacher.teacher_id,
    details: { fullName: teacher.full_name, nextStatus }
  });

  // Synchronize immediately to persistent backup
  persistenceSyncService.flushToPersistentBackup();

  return res.json({
    success: true,
    status: nextStatus,
    message: nextStatus === 'ACTIVE' ? `Đã mở khóa tài khoản GVCN ${teacher.full_name}.` : `Đã tạm khóa tài khoản GVCN ${teacher.full_name}.`
  });
});

// 5. Get Specific Tenant Details
tenantRouter.get('/:tenantId', authenticateToken, requireTenantAccess, (req: AuthenticatedRequest, res: Response) => {
  const { tenantId } = req.params;
  const tenant = tenantRepository.getById(tenantId);
  if (!tenant) {
    return res.status(404).json({
      success: false,
      errorCode: 'TENANT_NOT_FOUND',
      message: 'Không tìm thấy không gian chủ nhiệm.'
    });
  }
  res.json({ success: true, tenant });
});

// 6. Super Admin: Update Tenant Status
tenantRouter.patch('/:tenantId/status', authenticateToken, requireRole('SUPER_ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const { tenantId } = req.params;
  const { status } = req.body;
  const user = req.user!;

  if (status !== 'ACTIVE' && status !== 'LOCKED' && status !== 'EXPIRED') {
    return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ.' });
  }

  const existing = tenantRepository.getById(tenantId);
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy không gian.' });
  }

  existing.status = status;
  tenantRepository.createOrUpdate(existing);

  auditLogRepository.log({
    actorUserId: user.userId,
    actorRole: 'SUPER_ADMIN',
    actorTenantId: 'platform-root',
    action: 'UPDATE_TENANT_STATUS',
    targetType: 'TENANT',
    targetId: tenantId,
    details: { oldStatus: existing.status, newStatus: status }
  });

  res.json({ success: true, message: `Cập nhật trạng thái không gian thành ${status}.`, tenant: existing });
});

// 6b. Super Admin: Get Workspace Deletion Summary
tenantRouter.get('/admin/workspace/:tenantId/summary', authenticateToken, requireRole('SUPER_ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const { tenantId } = req.params;
  const summary = tenantRepository.getDeletionSummary(tenantId);
  if (!summary) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy không gian lớp cần tra cứu.' });
  }
  res.json({ success: true, summary });
});

// 6c. Super Admin: Permanent Atomic Delete of a Class Workspace
tenantRouter.delete('/admin/workspace/:tenantId', authenticateToken, requireRole('SUPER_ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const { tenantId } = req.params;
  const { confirmName } = req.body || {};
  const user = req.user!;

  if (!tenantId || tenantId === 'platform-root' || tenantId === 'default') {
    return res.status(400).json({ success: false, message: 'Không thể xóa không gian hệ thống hoặc không gian không hợp lệ.' });
  }

  const existing = tenantRepository.getById(tenantId);
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy không gian lớp cần xóa.' });
  }

  // Double confirmation check on server if confirmName is provided
  if (confirmName !== undefined && String(confirmName).trim() !== existing.name.trim()) {
    return res.status(400).json({
      success: false,
      message: `Tên xác nhận "${confirmName}" không khớp chính xác với tên không gian "${existing.name}".`
    });
  }

  try {
    const result = tenantRepository.deleteTenantPermanently(tenantId);

    // Audit log
    auditLogRepository.log({
      actorUserId: user.userId,
      actorRole: 'SUPER_ADMIN',
      actorTenantId: 'platform-root',
      action: 'PERMANENT_DELETE_WORKSPACE',
      targetType: 'TENANT',
      targetId: tenantId,
      details: {
        workspaceName: existing.name,
        schoolName: existing.school_name,
        ownerEmail: existing.owner_email,
        ownerName: existing.owner_name,
        deletedAt: new Date().toISOString()
      }
    });

    res.json({
      success: true,
      message: result.message,
      deletedTenantId: tenantId
    });
  } catch (err: any) {
    console.error(`[TenantRoutes] Delete error for tenant ${tenantId}:`, err);
    res.status(500).json({
      success: false,
      message: err.message || 'Không thể xóa không gian lớp. Dữ liệu chưa bị thay đổi. Vui lòng thử lại.'
    });
  }
});

// 7. Get Audit Logs
tenantRouter.get('/audit/logs', authenticateToken, requireRole('SUPER_ADMIN', 'TEACHER'), (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role === 'SUPER_ADMIN') {
    const logs = auditLogRepository.getAll(150);
    return res.json({ success: true, logs });
  }

  const logs = auditLogRepository.getByTenant(req.user!.tenantId, 100);
  return res.json({ success: true, logs });
});
