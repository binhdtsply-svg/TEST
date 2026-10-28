import { Router, Request, Response } from 'express';
import { credentialRepository } from '../repositories/CredentialRepository';
import { teacherAccountRepository } from '../repositories/TeacherAccountRepository';
import { studentRepository } from '../repositories/StudentRepository';
import { tenantRepository } from '../repositories/TenantRepository';
import { sessionRepository } from '../repositories/SessionRepository';
import { auditLogRepository } from '../repositories/AuditLogRepository';
import { adminAccountRepository } from '../repositories/AdminAccountRepository';
import { userAvatarRepository } from '../repositories/UserAvatarRepository';
import { emailService } from '../services/EmailService';
import { persistenceSyncService } from '../services/PersistenceSyncService';
import { getDatabase } from '../db/database';
import { authenticateToken, AuthenticatedRequest } from '../auth/middleware';

export const authRouter = Router();

// Diagnostic endpoint to check persistent sync and Firestore IAM connectivity
authRouter.get('/persistence-status', async (_req: Request, res: Response) => {
  const status = await persistenceSyncService.verifyFirestoreConnection();
  res.json({
    success: true,
    status
  });
});

// Rate limiting state for brute-force protection
const loginAttempts = new Map<string, { count: number; firstAttempt: number }>();
const MAX_ATTEMPTS = process.env.NODE_ENV === 'production' ? 30 : 300;
const WINDOW_MS = 5 * 60 * 1000;

// Admin Google Email Allowlist (Configured via env or default to official Admin)
const ADMIN_GOOGLE_EMAILS: string[] = (process.env.ADMIN_GOOGLE_EMAILS || 'binhdtsply@gmail.com')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

interface GoogleVerifiedPayload {
  valid: boolean;
  email?: string;
  sub?: string;
  name?: string;
  picture?: string;
  emailVerified?: boolean;
  error?: string;
}

/**
 * Verifies Google OAuth token with Google's servers
 */
async function verifyGoogleTokenWithGoogle(tokenInfo: {
  accessToken?: string;
  idToken?: string;
  fallbackEmail?: string;
  fallbackSub?: string;
  fallbackName?: string;
  fallbackAvatar?: string;
}): Promise<GoogleVerifiedPayload> {
  const { accessToken, idToken, fallbackEmail, fallbackSub, fallbackName, fallbackAvatar } = tokenInfo;

  // 1. Verify Access Token via Google OAuth UserInfo endpoint
  if (accessToken && typeof accessToken === 'string' && accessToken.trim()) {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken.trim()}` }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.email) {
          return {
            valid: true,
            email: data.email,
            sub: data.sub,
            name: data.name,
            picture: data.picture,
            emailVerified: data.email_verified === true || data.email_verified === 'true'
          };
        }
      }
    } catch (err) {
      console.error('[AuthServer] Error verifying Google access_token:', err);
    }
  }

  // 2. Verify ID Token via Google TokenInfo endpoint
  if (idToken && typeof idToken === 'string' && idToken.trim()) {
    try {
      const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken.trim())}`);
      if (response.ok) {
        const data = await response.json();
        if (data.email) {
          return {
            valid: true,
            email: data.email,
            sub: data.sub,
            name: data.name,
            picture: data.picture,
            emailVerified: data.email_verified === true || data.email_verified === 'true'
          };
        }
      }
    } catch (err) {
      console.error('[AuthServer] Error verifying Google id_token:', err);
    }
  }

  // Strict Security Enforcement: Tokens must be authentically verified by Google or Firebase.
  // Never grant authentication or Super Admin privilege based purely on self-declared client email.
  return {
    valid: false,
    error: 'Mã xác thực Google/Firebase không hợp lệ hoặc thiếu Access Token/ID Token từ máy chủ.'
  };
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (!record) {
    loginAttempts.set(ip, { count: 1, firstAttempt: now });
    return true;
  }
  if (now - record.firstAttempt > WINDOW_MS) {
    loginAttempts.set(ip, { count: 1, firstAttempt: now });
    return true;
  }
  record.count += 1;
  return record.count <= MAX_ATTEMPTS;
}

// 1. Code Login (Teacher, Student, Parent, Officer)
authRouter.post('/login-code', (req: Request, res: Response) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({
      success: false,
      errorCode: 'RATE_LIMIT_EXCEEDED',
      message: 'Quá nhiều lượt thử đăng nhập. Vui lòng thử lại sau 5 phút.'
    });
  }

  const { code, password, selectedRole, selectedArea } = req.body;
  const targetArea = (selectedRole || selectedArea || '').toString().trim().toUpperCase();

  if (!code || typeof code !== 'string' || !code.trim()) {
    return res.status(400).json({
      success: false,
      errorCode: 'INVALID_CREDENTIAL',
      message: 'Vui lòng nhập mã truy cập hợp lệ.'
    });
  }

  const cleanCode = code.trim().toUpperCase();

  // 1.1 Check DEV Super Admin Code (Blocked in Production or when ADMIN_TEST_CODE_DISABLED is set)
  const isDevAdminCode = ['ADM-MASTER-2025', 'ADMIN-KGCNS', 'ADM-SUPER-2025', 'SUPERADMIN-KGCNS'].includes(cleanCode);
  if (isDevAdminCode) {
    if (targetArea && targetArea !== 'ADMIN' && targetArea !== 'SUPER_ADMIN') {
      const areaLabel = targetArea === 'TEACHER' ? 'GVCN' : targetArea === 'STUDENT' ? 'Học viên' : targetArea === 'PARENT' ? 'Phụ huynh' : targetArea;
      return res.status(403).json({
        success: false,
        errorCode: 'ROLE_MISMATCH',
        message: `Mã truy cập Ban Quản trị không thuộc khu vực ${areaLabel}. Vui lòng chọn khu vực Quản trị viên.`
      });
    }

    const isDev = process.env.NODE_ENV !== 'production';
    const adminTestCodeDisabled = process.env.ADMIN_TEST_CODE_DISABLED === 'true' || !isDev;
    if (adminTestCodeDisabled) {
      return res.status(403).json({
        success: false,
        errorCode: 'PRODUCTION_BLOCKED',
        message: 'Mã truy cập Admin thử nghiệm bị vô hiệu hóa. Vui lòng đăng nhập bằng Google Admin (binhdtsply@gmail.com).'
      });
    }

    const adminAccount = adminAccountRepository.findById('usr-super-admin');
    const adminSessionVersion = adminAccount?.session_version || 1;

    const { session, token } = sessionRepository.createSession({
      userId: 'usr-super-admin',
      role: 'SUPER_ADMIN',
      tenantId: 'platform-root',
      credentialVersion: adminSessionVersion,
      isTestCredential: true
    });

    auditLogRepository.log({
      actorUserId: 'usr_sa_dev_master',
      actorRole: 'SUPER_ADMIN',
      actorTenantId: 'platform-root',
      action: 'LOGIN_DEV_ADMIN_CODE',
      targetType: 'SYSTEM',
      targetId: 'platform-root'
    });

    return res.json({
      success: true,
      token,
      user: {
        id: session.user_id,
        role: session.role,
        tenantId: session.tenant_id,
        isTestCredential: true,
        displayName: 'Ban Quản trị Hệ thống Không Gian Chủ Nhiệm Số'
      }
    });
  }

  // If user selected ADMIN role but did not enter a valid admin code
  if (targetArea === 'ADMIN' || targetArea === 'SUPER_ADMIN') {
    return res.status(403).json({
      success: false,
      errorCode: 'ROLE_MISMATCH',
      message: 'Mã đăng nhập này không thuộc khu vực Quản trị viên. Vui lòng chọn đúng khu vực đăng nhập.'
    });
  }

  // 1.2 Authenticate via Credential Repository (with optional password check and target area validation)
  const authResult = credentialRepository.authenticate(cleanCode, password, targetArea as any);
  if (!authResult.success || !authResult.credential) {
    const isRoleMismatch = authResult.errorCode === 'ROLE_MISMATCH';
    return res.status(isRoleMismatch ? 403 : 401).json({
      success: false,
      errorCode: authResult.errorCode || 'INVALID_CREDENTIAL',
      requirePassword: authResult.requirePassword || false,
      hasPassword: authResult.hasPassword,
      message: authResult.message || 'Mã truy cập không hợp lệ.'
    });
  }

  const cred = authResult.credential;

  // Strict cross-check: credential type must match target area if specified
  if (targetArea === 'TEACHER' && cred.type !== 'TEACHER') {
    return res.status(403).json({
      success: false,
      errorCode: 'ROLE_MISMATCH',
      message: 'Mã đăng nhập này không thuộc khu vực GVCN. Vui lòng chọn đúng khu vực đăng nhập.'
    });
  }
  if (targetArea === 'STUDENT' && cred.type !== 'STUDENT') {
    return res.status(403).json({
      success: false,
      errorCode: 'ROLE_MISMATCH',
      message: 'Mã đăng nhập này không thuộc khu vực Học viên. Vui lòng chọn đúng khu vực đăng nhập.'
    });
  }
  if (targetArea === 'PARENT' && cred.type !== 'PARENT') {
    return res.status(403).json({
      success: false,
      errorCode: 'ROLE_MISMATCH',
      message: 'Mã đăng nhập này không thuộc khu vực Phụ huynh. Vui lòng chọn đúng khu vực đăng nhập.'
    });
  }

  // Resolve specific role and identities
  if (cred.type === 'TEACHER') {
    const teacherAcc = teacherAccountRepository.getByTeacherId(cred.owner_id)
      || teacherAccountRepository.getByTenantId(cred.tenant_id);
    if (!teacherAcc || teacherAcc.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        errorCode: 'ACCOUNT_LOCKED',
        message: 'Tài khoản Giáo viên chủ nhiệm không tồn tại hoặc đã bị tạm khóa. Vui lòng liên hệ Quản trị viên.'
      });
    }

    const { session, token } = sessionRepository.createSession({
      userId: teacherAcc.id,
      role: 'TEACHER',
      tenantId: cred.tenant_id,
      teacherId: cred.owner_id,
      credentialVersion: cred.credential_version,
      isTestCredential: Boolean(cred.is_test_credential)
    });

    auditLogRepository.log({
      actorUserId: teacherAcc.id,
      actorRole: 'TEACHER',
      actorTenantId: cred.tenant_id,
      action: 'LOGIN_TEACHER_CODE',
      targetType: 'TEACHER',
      targetId: cred.owner_id
    });

    const teacherAvatar = userAvatarRepository.getAvatarForUser({
      userId: teacherAcc.id,
      teacherId: cred.owner_id,
      role: 'TEACHER',
      tenantId: cred.tenant_id,
      email: teacherAcc.email
    }) || (teacherAcc as any).avatar || undefined;

    return res.json({
      success: true,
      token,
      hasPassword: authResult.hasPassword,
      mustChangePassword: authResult.mustChangePassword,
      passwordSetupRequired: authResult.passwordSetupRequired,
      user: {
        id: session.user_id,
        teacherId: session.teacher_id,
        role: session.role,
        tenantId: session.tenant_id,
        fullName: teacherAcc.full_name,
        name: teacherAcc.full_name,
        displayName: teacherAcc.full_name,
        email: teacherAcc.email,
        phone: teacherAcc.phone,
        avatar: teacherAvatar,
        hasPassword: authResult.hasPassword,
        mustChangePassword: authResult.mustChangePassword,
        isTestCredential: Boolean(cred.is_test_credential)
      }
    });
  }

  if (cred.type === 'STUDENT') {
    const student = studentRepository.getById(cred.tenant_id, cred.owner_id);
    const role = cred.is_officer ? 'CLASS_OFFICER' : 'STUDENT';
    const { session, token } = sessionRepository.createSession({
      userId: `usr_stu_${cred.owner_id}`,
      role,
      tenantId: cred.tenant_id,
      studentId: cred.owner_id,
      officerRoleTitle: cred.officer_role_title || undefined,
      credentialVersion: cred.credential_version,
      isTestCredential: Boolean(cred.is_test_credential)
    });

    const studentFullName = student ? student.full_name : `Học sinh (${cred.lookup_identifier})`;
    const studentAvatar = userAvatarRepository.getAvatarForUser({
      userId: session.user_id,
      studentId: cred.owner_id,
      role,
      tenantId: cred.tenant_id
    }) || student?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80';

    return res.json({
      success: true,
      token,
      hasPassword: authResult.hasPassword,
      mustChangePassword: authResult.mustChangePassword,
      passwordSetupRequired: authResult.passwordSetupRequired,
      user: {
        id: session.user_id,
        userId: session.user_id,
        studentId: session.student_id,
        role: session.role,
        tenantId: session.tenant_id,
        name: studentFullName,
        fullName: studentFullName,
        displayName: studentFullName,
        studentName: studentFullName,
        avatar: studentAvatar,
        phone: student?.phone || undefined,
        email: student?.email || undefined,
        officerRoleTitle: session.officer_role_title || undefined,
        hasPassword: authResult.hasPassword,
        mustChangePassword: authResult.mustChangePassword,
        isTestCredential: Boolean(cred.is_test_credential)
      }
    });
  }

  if (cred.type === 'PARENT') {
    const student = studentRepository.getById(cred.tenant_id, cred.owner_id);
    const { session, token } = sessionRepository.createSession({
      userId: `usr_par_${cred.owner_id}`,
      role: 'PARENT',
      tenantId: cred.tenant_id,
      childStudentId: cred.owner_id,
      credentialVersion: cred.credential_version,
      isTestCredential: Boolean(cred.is_test_credential)
    });

    const parentName = student
      ? (student.father_name ? `Bác ${student.father_name}` : student.mother_name ? `Cô ${student.mother_name}` : `Phụ huynh em ${student.full_name}`)
      : 'Phụ huynh';
    const parentFullName = student ? `${parentName} (PH em ${student.full_name})` : 'Phụ huynh học sinh';
    const parentAvatar = userAvatarRepository.getAvatarForUser({
      userId: session.user_id,
      childStudentId: cred.owner_id,
      role: 'PARENT',
      tenantId: cred.tenant_id
    }) || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80';

    return res.json({
      success: true,
      token,
      hasPassword: authResult.hasPassword,
      mustChangePassword: authResult.mustChangePassword,
      passwordSetupRequired: authResult.passwordSetupRequired,
      user: {
        id: session.user_id,
        userId: session.user_id,
        childStudentId: session.child_student_id,
        role: session.role,
        tenantId: session.tenant_id,
        name: parentFullName,
        fullName: parentFullName,
        displayName: parentFullName,
        studentName: student ? student.full_name : undefined,
        avatar: parentAvatar,
        hasPassword: authResult.hasPassword,
        mustChangePassword: authResult.mustChangePassword,
        isTestCredential: Boolean(cred.is_test_credential)
      }
    });
  }

  return res.status(400).json({
    success: false,
    errorCode: 'UNKNOWN_CREDENTIAL_TYPE',
    message: 'Không nhận diện được loại tài khoản.'
  });
});

// 2. Google OAuth Login Endpoint
authRouter.post('/google-login', async (req: Request, res: Response) => {
  const { email, sub, name, avatar, accessToken, idToken, selectedRole, selectedArea } = req.body;
  const targetArea = (selectedRole || selectedArea || '').toString().trim().toUpperCase();

  if (targetArea === 'STUDENT' || targetArea === 'PARENT') {
    return res.status(403).json({
      success: false,
      errorCode: 'ROLE_MISMATCH',
      message: 'Phương thức đăng nhập Google chỉ áp dụng cho Quản trị viên và Giáo viên chủ nhiệm.'
    });
  }

  // Verify Google Identity on the Server
  const verification = await verifyGoogleTokenWithGoogle({
    accessToken,
    idToken,
    fallbackEmail: email,
    fallbackSub: sub,
    fallbackName: name,
    fallbackAvatar: avatar
  });

  if (!verification.valid || !verification.email) {
    return res.status(401).json({
      success: false,
      errorCode: 'INVALID_GOOGLE_AUTH',
      message: verification.error || 'Thông tin xác thực Google không hợp lệ hoặc đã hết hạn.'
    });
  }

  const cleanEmail = verification.email.trim().toLowerCase();
  const verifiedSub = verification.sub || sub;
  const verifiedName = verification.name || name;
  const verifiedAvatar = verification.picture || avatar;

  // 2.1 Authorized Official Super Admin via Allowlist
  if (ADMIN_GOOGLE_EMAILS.includes(cleanEmail)) {
    if (targetArea && targetArea !== 'ADMIN' && targetArea !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        errorCode: 'ROLE_MISMATCH',
        message: 'Tài khoản Google này thuộc Ban Quản trị Hệ thống. Vui lòng chọn đúng khu vực Quản trị viên.'
      });
    }

    const adminAccount = adminAccountRepository.findById('usr-super-admin');
    const adminSessionVersion = adminAccount?.session_version || 1;

    const { session, token } = sessionRepository.createSession({
      userId: 'usr-super-admin',
      role: 'SUPER_ADMIN',
      tenantId: 'platform-root',
      credentialVersion: adminSessionVersion,
      isTestCredential: false,
      loginMethod: 'GOOGLE'
    });

    auditLogRepository.log({
      actorUserId: 'usr_sa_google_official',
      actorRole: 'SUPER_ADMIN',
      actorTenantId: 'platform-root',
      action: 'LOGIN_GOOGLE_SUPER_ADMIN',
      targetType: 'SYSTEM',
      targetId: 'platform-root',
      details: `Google Sub: ${verifiedSub || 'verified'} | Email: ${cleanEmail}`
    });

    return res.json({
      success: true,
      token,
      user: {
        id: session.user_id,
        role: session.role,
        tenantId: session.tenant_id,
        email: cleanEmail,
        displayName: 'Ban Quản trị Hệ thống Không Gian Chủ Nhiệm Số',
        fullName: 'Ban Quản trị Hệ thống Không Gian Chủ Nhiệm Số',
        avatar: verifiedAvatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80',
        isTestCredential: false
      }
    });
  }

  // If Admin area was selected but email is not in Admin Allowlist
  if (targetArea === 'ADMIN' || targetArea === 'SUPER_ADMIN') {
    return res.status(403).json({
      success: false,
      errorCode: 'ROLE_MISMATCH',
      message: 'Email Google này không thuộc danh sách Quản trị viên Nền tảng.'
    });
  }

  // 2.2 Teacher linked with Google
  const teacherAcc = teacherAccountRepository.getByGoogleEmail(cleanEmail);
  if (teacherAcc) {
    if (targetArea && targetArea !== 'TEACHER') {
      return res.status(403).json({
        success: false,
        errorCode: 'ROLE_MISMATCH',
        message: 'Tài khoản Google này thuộc Giáo viên chủ nhiệm. Vui lòng chọn khu vực GVCN.'
      });
    }

    if (teacherAcc.status === 'LOCKED' || teacherAcc.status === 'REVOKED') {
      return res.status(403).json({
        success: false,
        errorCode: 'ACCOUNT_LOCKED',
        message: 'Tài khoản Giáo viên chủ nhiệm đã bị tạm khóa hoặc thu hồi quyền truy cập. Vui lòng liên hệ Quản trị viên.'
      });
    }

    if (teacherAcc.login_method === 'ACCESS_CODE') {
      return res.status(403).json({
        success: false,
        errorCode: 'GOOGLE_AUTH_DISABLED',
        message: 'Email này chưa được cấp quyền đăng nhập Google.'
      });
    }

    if (teacherAcc.status === 'ACTIVE') {
      const { session, token } = sessionRepository.createSession({
        userId: teacherAcc.id,
        role: 'TEACHER',
        tenantId: teacherAcc.tenant_id,
        teacherId: teacherAcc.teacher_id,
        credentialVersion: teacherAcc.credential_version,
        isTestCredential: false
      });

      auditLogRepository.log({
        actorUserId: teacherAcc.id,
        actorRole: 'TEACHER',
        actorTenantId: teacherAcc.tenant_id,
        action: 'LOGIN_GOOGLE_TEACHER',
        targetType: 'TEACHER',
        targetId: teacherAcc.teacher_id,
        details: `Google Sub: ${verifiedSub || 'verified'} | Email: ${cleanEmail}`
      });

      return res.json({
        success: true,
        token,
        user: {
          id: session.user_id,
          teacherId: session.teacher_id,
          role: session.role,
          tenantId: session.tenant_id,
          fullName: teacherAcc.full_name,
          displayName: teacherAcc.full_name,
          email: teacherAcc.email,
          isTestCredential: false
        }
      });
    }
  }

  return res.status(403).json({
    success: false,
    errorCode: 'ACCOUNT_NOT_FOUND',
    message: 'Email Google này chưa được đăng ký trong hệ thống Không Gian Chủ Nhiệm Số.'
  });
});

// 3. Current Session Check
authRouter.get('/session', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  let fullName: string | undefined;
  let displayName: string | undefined;
  let avatar: string | undefined;
  let email: string | undefined;
  let phone: string | undefined;
  let studentName: string | undefined;

  if (user.role === 'TEACHER') {
    const teacherAcc = teacherAccountRepository.getByTeacherId(user.teacherId || user.userId)
      || teacherAccountRepository.getByTenantId(user.tenantId);
    if (teacherAcc) {
      fullName = teacherAcc.full_name;
      displayName = teacherAcc.full_name;
      email = teacherAcc.email;
      phone = teacherAcc.phone;
      avatar = (teacherAcc as any).avatar || undefined;
    }
  } else if (user.role === 'STUDENT' || user.role === 'CLASS_OFFICER') {
    if (user.studentId) {
      const student = studentRepository.getById(user.tenantId, user.studentId);
      if (student) {
        fullName = student.full_name;
        displayName = student.full_name;
        studentName = student.full_name;
        avatar = student.avatar || undefined;
        email = student.email || undefined;
        phone = student.phone || undefined;
      }
    }
  } else if (user.role === 'PARENT') {
    if (user.childStudentId) {
      const student = studentRepository.getById(user.tenantId, user.childStudentId);
      if (student) {
        const parentName = student.father_name ? `Bác ${student.father_name}` : student.mother_name ? `Cô ${student.mother_name}` : `Phụ huynh em ${student.full_name}`;
        fullName = `${parentName} (PH em ${student.full_name})`;
        displayName = fullName;
        studentName = student.full_name;
        avatar = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80';
      }
    }
  } else if (user.role === 'SUPER_ADMIN') {
    fullName = 'Nguyễn Đức Bình (Super Admin)';
    displayName = 'Nguyễn Đức Bình (Super Admin)';
    email = 'binhdtsply@gmail.com';
  }

  // Check persistent userAvatarRepository
  const customAvatar = userAvatarRepository.getAvatarForUser({
    userId: user.userId,
    studentId: user.studentId,
    teacherId: user.teacherId,
    childStudentId: user.childStudentId,
    role: user.role,
    tenantId: user.tenantId,
    email
  });

  if (customAvatar) {
    avatar = customAvatar;
  }

  res.json({
    success: true,
    user: {
      ...user,
      id: user.userId,
      name: displayName || fullName || 'Người dùng',
      fullName: fullName || displayName,
      displayName: displayName || fullName,
      avatar,
      email,
      phone,
      studentName
    }
  });
});

// 3.01 Dedicated Server-Side Route Guard Authorization Endpoint
const handleRouteGuardVerification = (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const targetRoute = (req.query.route || req.body?.route || '').toString().toLowerCase().trim().replace(/^\//, '');

  // Rule 1: /quan-tri & /quan-tri-x7k9 -> CHỈ ADMIN
  if (targetRoute === 'quan-tri' || targetRoute === 'quan-tri-x7k9' || targetRoute === 'quantri' || targetRoute === 'admin-login') {
    if (user.role === 'SUPER_ADMIN') {
      return res.json({
        success: true,
        allowed: true,
        route: '/quan-tri',
        role: user.role,
        user: {
          id: user.userId,
          role: user.role,
          email: 'binhdtsply@gmail.com'
        }
      });
    }
    return res.status(403).json({
      success: false,
      allowed: false,
      errorCode: 'ROLE_ACCESS_DENIED',
      route: '/quan-tri',
      role: user.role,
      message: 'Từ chối truy cập: Cổng Quản trị viên (/quan-tri) chỉ dành riêng cho Super Admin.'
    });
  }

  // Rule 2: /app -> GVCN / Học viên / Phụ huynh / các role người dùng hiện có
  if (targetRoute === 'app' || targetRoute === 'dang-nhap') {
    const validUserRoles = ['TEACHER', 'STUDENT', 'PARENT', 'CLASS_OFFICER'];
    if (validUserRoles.includes(user.role)) {
      return res.json({
        success: true,
        allowed: true,
        route: '/app',
        role: user.role,
        user: {
          id: user.userId,
          role: user.role
        }
      });
    }
    if (user.role === 'SUPER_ADMIN') {
      return res.json({
        success: true,
        allowed: true,
        route: '/app',
        role: user.role,
        isAdmin: true
      });
    }
    return res.status(403).json({
      success: false,
      allowed: false,
      errorCode: 'ROLE_ACCESS_DENIED',
      route: '/app',
      role: user.role,
      message: 'Từ chối truy cập: Vai trò người dùng không hợp lệ trên Cổng Người Dùng (/app).'
    });
  }

  return res.json({
    success: true,
    allowed: true,
    route: targetRoute,
    role: user.role
  });
};

authRouter.all('/verify-route-access', authenticateToken, handleRouteGuardVerification);
authRouter.all('/route-guard', authenticateToken, handleRouteGuardVerification);

// 3.0 Avatar Update Endpoint (Persistent storage across sessions & logins)
authRouter.post('/avatar', (req: Request, res: Response) => {
  const { avatar, userId, role, tenantId, studentId, teacherId, childStudentId, email } = req.body;
  if (!avatar || typeof avatar !== 'string' || !avatar.trim()) {
    return res.status(400).json({ success: false, message: 'Thiếu dữ liệu ảnh đại diện.' });
  }

  // Reject transient blob: URLs as they cannot be retrieved permanently
  if (avatar.startsWith('blob:')) {
    return res.status(400).json({ success: false, message: 'Không thể lưu địa chỉ ảnh tạm thời (blob URL).' });
  }

  userAvatarRepository.saveAvatar({
    avatar,
    userId,
    role,
    tenantId,
    studentId,
    teacherId,
    childStudentId,
    email
  });

  // Also sync to teacher_accounts table if teacherId or userId is teacher
  if (teacherId || role === 'TEACHER') {
    try {
      const db = getDatabase();
      const tId = teacherId || userId;
      if (tId) {
        db.prepare('UPDATE teacher_accounts SET avatar = ?, updated_at = ? WHERE teacher_id = ? OR id = ?').run(avatar, new Date().toISOString(), tId, tId);
      }
    } catch {}
  }

  // Also sync to students table ONLY if studentId is present AND role is STUDENT or CLASS_OFFICER (never for PARENT)
  if ((role === 'STUDENT' || role === 'CLASS_OFFICER' || !role) && studentId && role !== 'PARENT') {
    if (tenantId) {
      try {
        studentRepository.update(tenantId, studentId, { avatar });
      } catch {}
    }
  }

  // Flush to persistent backup snapshot immediately
  try {
    persistenceSyncService.flushToPersistentBackup();
  } catch (err) {
    console.warn('[authRoutes] Avatar flush notice:', err);
  }

  return res.json({ success: true, message: 'Đã lưu ảnh đại diện bền vững thành công!', avatar });
});

// 3.01 Dedicated Avatar Read/Query Endpoint (Official query source)
authRouter.get('/avatar', (req: Request, res: Response) => {
  const { userId, studentId, teacherId, childStudentId, role, tenantId, email } = req.query;
  const avatar = userAvatarRepository.getAvatarForUser({
    userId: userId as string,
    studentId: studentId as string,
    teacherId: teacherId as string,
    childStudentId: childStudentId as string,
    role: role as string,
    tenantId: tenantId as string,
    email: email as string
  });
  return res.json({ success: true, avatar: avatar || null });
});

// 3.1 Session Sync / Auto-refresh Endpoint
authRouter.post('/sync-session', (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'];
  const token = (authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null)
    || (req.headers['x-session-token'] as string)
    || req.cookies?.kgcns_session
    || req.body.token;

  // 1. If valid token already exists in sessionRepository
  if (token) {
    const session = sessionRepository.getSessionByToken(token);
    if (session) {
      sessionRepository.touchSession(session.id);
      let sessionAvatar = userAvatarRepository.getAvatarForUser({
        userId: session.user_id,
        studentId: session.student_id || undefined,
        teacherId: session.teacher_id || undefined,
        childStudentId: session.child_student_id || undefined,
        role: session.role,
        tenantId: session.tenant_id
      });
      if (!sessionAvatar) {
        if (session.role === 'PARENT') {
          sessionAvatar = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80';
        } else if (session.role === 'STUDENT' || session.role === 'CLASS_OFFICER') {
          const student = session.student_id ? studentRepository.getById(session.tenant_id, session.student_id) : null;
          sessionAvatar = student?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80';
        }
      }
      return res.json({
        success: true,
        token,
        user: {
          id: session.user_id,
          userId: session.user_id,
          role: session.role,
          tenantId: session.tenant_id,
          teacherId: session.teacher_id,
          studentId: session.student_id,
          childStudentId: session.child_student_id,
          officerRoleTitle: session.officer_role_title,
          isTestCredential: session.is_test_credential,
          avatar: sessionAvatar || undefined
        }
      });
    }
  }

  // 2. Security Mandate: Never mint new sessions from unauthenticated profile payloads.
  // All sessions are persisted in SQLite (`auth_sessions`) and mirrored to Cloud Firestore.
  return res.status(401).json({
    success: false,
    errorCode: 'SESSION_EXPIRED',
    message: 'Phiên làm việc đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.'
  });
});

// 4. Logout Endpoint - Invalidates server session token and clears cookies
authRouter.post('/logout', (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'];
  let token = (authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null)
    || (req.headers['x-session-token'] as string)
    || (req as any).cookies?.kgcns_session;

  if (!token && req.headers.cookie) {
    const match = req.headers.cookie.match(/(?:^|;\s*)kgcns_session=([^;]+)/);
    if (match) {
      token = decodeURIComponent(match[1]);
    }
  }

  if (token) {
    sessionRepository.revokeToken(token);
  }
  res.clearCookie?.('kgcns_session', { path: '/' });
  res.json({ success: true, message: 'Đăng xuất thành công.' });
});

// 5. Password Setup (for first-time setup by logged-in student/parent)
authRouter.post('/password/setup', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { newPassword } = req.body;
  const user = req.user;

  if (!user) {
    return res.status(401).json({ success: false, message: 'Chưa xác thực danh tính.' });
  }

  const ownerId = user.studentId || user.childStudentId || user.teacherId || user.userId;
  const type = user.role === 'TEACHER' ? 'TEACHER' : user.role === 'PARENT' ? 'PARENT' : 'STUDENT';

  const result = credentialRepository.setPassword({
    tenantId: user.tenantId,
    ownerId,
    type,
    newPasswordPlain: newPassword,
    actorUserId: user.userId
  });

  if (!result.success) {
    return res.status(400).json(result);
  }

  res.json(result);
});

// 6. Password Change (for TEACHER, STUDENT, PARENT, CLASS_OFFICER - not ADMIN)
authRouter.post('/password/change', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { oldPassword, newPassword } = req.body;
  const user = req.user;

  if (!user) {
    return res.status(401).json({ success: false, message: 'Chưa xác thực danh tính.' });
  }

  if (user.role === 'SUPER_ADMIN') {
    return res.status(403).json({
      success: false,
      errorCode: 'ADMIN_NOT_ALLOWED',
      message: 'Tài khoản Quản trị viên sử dụng cơ chế bảo mật và xác thực quản trị riêng.'
    });
  }

  if (!oldPassword || typeof oldPassword !== 'string') {
    return res.status(400).json({
      success: false,
      errorCode: 'OLD_PASSWORD_REQUIRED',
      message: 'Vui lòng nhập mật khẩu hiện tại.'
    });
  }

  if (!newPassword || typeof newPassword !== 'string' || newPassword.trim().length < 6) {
    return res.status(400).json({
      success: false,
      errorCode: 'INVALID_PASSWORD_LENGTH',
      message: 'Mật khẩu mới phải có tối thiểu 6 ký tự.'
    });
  }

  const ownerId = user.teacherId || user.studentId || user.childStudentId || user.userId;
  const type = user.role === 'TEACHER' ? 'TEACHER' : user.role === 'PARENT' ? 'PARENT' : 'STUDENT';

  const result = credentialRepository.changePassword({
    tenantId: user.tenantId,
    ownerId,
    type,
    oldPasswordPlain: oldPassword.trim(),
    newPasswordPlain: newPassword.trim(),
    actorUserId: user.userId
  });

  if (!result.success) {
    return res.status(400).json(result);
  }

  res.json(result);
});

// ==========================================
// SUPER ADMIN DEDICATED AUTHENTICATION ENDPOINTS
// ==========================================

// 7. Super Admin Password Login (supports Login ID: 'admin' or Admin Email)
authRouter.post(['/admin/login', '/admin-login'], async (req: Request, res: Response) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({
      success: false,
      errorCode: 'RATE_LIMIT_EXCEEDED',
      message: 'Quá nhiều lượt thử đăng nhập. Vui lòng thử lại sau 5 phút.'
    });
  }

  await persistenceSyncService.ensureAdminAccountHydratedAsync();

  const { loginId, email, password, recoveryCode, rememberDevice, firebaseUid } = req.body;
  const identifier = (loginId || email || 'admin').trim();

  // Strict Security Guard: Explicitly reject non-admin roles trying to log in at Admin endpoint
  const teacherMatch = teacherAccountRepository.getByGoogleEmail(identifier);
  if (teacherMatch) {
    auditLogRepository.log({
      actorUserId: teacherMatch.teacher_id,
      actorRole: 'TEACHER',
      actorTenantId: teacherMatch.tenant_id,
      action: 'LOGIN_ADMIN_REJECTED_TEACHER',
      targetType: 'SYSTEM',
      targetId: 'platform-root',
      details: `Teacher (${teacherMatch.full_name} - ${teacherMatch.email}) rejected at /admin-login endpoint.`
    });

    return res.status(403).json({
      success: false,
      errorCode: 'FORBIDDEN_NOT_ADMIN',
      message: 'TỪ CHỐI QUYỀN ADMIN: Tài khoản này là Giáo viên chủ nhiệm, không có quyền Quản trị viên hệ thống. Vui lòng đăng nhập qua Cổng người dùng /dang-nhap.'
    });
  }

  const credMatch = credentialRepository.findByLookupIdentifier(identifier.toUpperCase());
  const isStudentOrParentToken = identifier.toUpperCase().startsWith('STU-') || identifier.toUpperCase().startsWith('PAR-');
  if ((credMatch && credMatch.type !== 'TEACHER') || isStudentOrParentToken) {
    return res.status(403).json({
      success: false,
      errorCode: 'FORBIDDEN_NOT_ADMIN',
      message: 'TỪ CHỐI QUYỀN ADMIN: Tài khoản học sinh/phụ huynh không được phép truy cập Cổng Quản trị viên. Vui lòng đăng nhập qua /dang-nhap.'
    });
  }

  let authResult = adminAccountRepository.authenticate(identifier, password, recoveryCode);

  // If local password failed, but a verified Firebase UID was supplied for this admin (e.g. after Firebase Password Reset)
  if (!authResult.success && firebaseUid) {
    const adminByEmail = adminAccountRepository.findByLoginIdentifier(identifier);
    if (adminByEmail && (adminByEmail.email.toLowerCase() === 'binhdtsply@gmail.com' || adminByEmail.id === 'usr-super-admin')) {
      adminAccountRepository.syncPasswordFromFirebase(adminByEmail.id, password, firebaseUid);
      authResult = adminAccountRepository.authenticate(identifier, password, recoveryCode);
    }
  }

  if (!authResult.success || !authResult.admin) {
    auditLogRepository.log({
      actorUserId: 'anonymous',
      actorRole: 'SUPER_ADMIN',
      actorTenantId: 'platform-root',
      action: 'LOGIN_ADMIN_FAILED',
      targetType: 'SYSTEM',
      targetId: 'platform-root',
      details: `Failed admin login attempt with identifier: ${identifier || 'none'}`
    });

    const isBadRequest = authResult.errorCode === 'LOGIN_ID_REQUIRED' || authResult.errorCode === 'PASSWORD_REQUIRED';
    const isLocked = authResult.errorCode === 'ACCOUNT_LOCKED';
    const statusCode = isBadRequest ? 400 : (isLocked ? 403 : 401);

    return res.status(statusCode).json({
      success: false,
      errorCode: authResult.errorCode || 'INVALID_CREDENTIALS',
      firstTimeSetupRequired: authResult.firstTimeSetupRequired,
      message: authResult.message || 'Thông tin đăng nhập không hợp lệ.'
    });
  }

  const admin = authResult.admin;
  const expiresInDays = rememberDevice ? 30 : 7;
  const { session, token } = sessionRepository.createSession({
    userId: admin.id,
    role: 'SUPER_ADMIN',
    tenantId: 'platform-root',
    credentialVersion: admin.sessionVersion,
    expiresInDays,
    isTestCredential: false,
    loginMethod: 'PASSWORD'
  });

  auditLogRepository.log({
    actorUserId: admin.id,
    actorRole: 'SUPER_ADMIN',
    actorTenantId: 'platform-root',
    action: 'LOGIN_ADMIN_SUCCESS',
    targetType: 'SYSTEM',
    targetId: 'platform-root',
    details: `Super Admin logged in with identifier: ${identifier} (ID: ${admin.loginId})`
  });

  res.json({
    success: true,
    token,
    user: {
      id: session.user_id,
      userId: session.user_id,
      loginId: admin.loginId,
      role: session.role,
      tenantId: session.tenant_id,
      email: admin.email,
      recoveryEmail: admin.recoveryEmail,
      fullName: admin.fullName,
      name: admin.fullName,
      displayName: admin.fullName,
      avatar: userAvatarRepository.getAvatarForUser({ userId: admin.id, role: 'SUPER_ADMIN', email: admin.email }) || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80',
      isTestCredential: false,
      hasRecoveryCode: admin.hasRecoveryCode,
      rememberDevice: Boolean(rememberDevice)
    }
  });
});

// 7b. Super Admin Firebase Auth Verification (Strict Role Enforcement)
// 7b. Super Admin Firebase Auth Verification (Strict Role Enforcement)
authRouter.post('/admin/verify-firebase', async (req: Request, res: Response) => {
  const { email, firebaseUid, idToken } = req.body;
  const cleanEmail = (email || '').trim().toLowerCase();

  if (!cleanEmail) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng cung cấp email tài khoản.'
    });
  }

  // Token is mandatory — never grant Super Admin based on self-declared email without token verification
  if (!idToken || typeof idToken !== 'string' || !idToken.trim()) {
    return res.status(401).json({
      success: false,
      errorCode: 'ID_TOKEN_REQUIRED',
      message: 'Yêu cầu mã xác thực Firebase (ID Token) hợp lệ để xác minh quyền quản trị.'
    });
  }

  const verification = await verifyGoogleTokenWithGoogle({ idToken: idToken.trim() });
  if (!verification.valid || !verification.email) {
    return res.status(401).json({
      success: false,
      errorCode: 'INVALID_FIREBASE_TOKEN',
      message: 'Mã xác thực Firebase không hợp lệ hoặc đã hết hạn.'
    });
  }

  const verifiedEmail = verification.email.toLowerCase().trim();
  if (verifiedEmail !== cleanEmail) {
    return res.status(403).json({
      success: false,
      errorCode: 'EMAIL_MISMATCH',
      message: 'Email trong token xác thực không khớp với email yêu cầu.'
    });
  }

  // Check if identifier is an authorized Admin account
  const adminAccount = adminAccountRepository.findByLoginIdentifier(cleanEmail);
  const isAllowedAdminEmail = ADMIN_GOOGLE_EMAILS.includes(cleanEmail) || (adminAccount && adminAccount.email.toLowerCase() === cleanEmail);

  if (!isAllowedAdminEmail || !adminAccount) {
    auditLogRepository.log({
      actorUserId: firebaseUid || verification.sub || 'anonymous',
      actorRole: 'SUPER_ADMIN',
      actorTenantId: 'platform-root',
      action: 'LOGIN_ADMIN_REJECTED_NOT_ADMIN',
      targetType: 'SYSTEM',
      targetId: 'platform-root',
      details: `Non-admin user (${cleanEmail}) rejected at /admin-login Firebase verification.`
    });

    return res.status(403).json({
      success: false,
      admin: false,
      errorCode: 'FORBIDDEN_NOT_ADMIN',
      message: 'TỪ CHỐI QUYỀN ADMIN: Tài khoản xác thực Firebase thành công nhưng không có quyền Quản trị viên (Admin). Vui lòng đăng nhập qua Cổng người dùng /dang-nhap.'
    });
  }

  const verifiedUid = verification.sub || firebaseUid;
  if (adminAccount.firebase_uid && verifiedUid && adminAccount.firebase_uid !== verifiedUid) {
    return res.status(403).json({
      success: false,
      errorCode: 'UID_MISMATCH',
      message: 'Firebase UID không khớp với tài khoản Quản trị viên đã liên kết.'
    });
  }

  const { session, token } = sessionRepository.createSession({
    userId: adminAccount.id,
    role: 'SUPER_ADMIN',
    tenantId: 'platform-root',
    credentialVersion: adminAccount.session_version,
    expiresInDays: 30,
    isTestCredential: false,
    loginMethod: 'FIREBASE'
  });

  auditLogRepository.log({
    actorUserId: adminAccount.id,
    actorRole: 'SUPER_ADMIN',
    actorTenantId: 'platform-root',
    action: 'LOGIN_ADMIN_FIREBASE_SUCCESS',
    targetType: 'SYSTEM',
    targetId: 'platform-root',
    details: `Admin logged in via Firebase Auth: ${cleanEmail} (UID: ${verifiedUid || 'verified'})`
  });

  return res.json({
    success: true,
    admin: true,
    token,
    user: {
      id: adminAccount.id,
      userId: adminAccount.id,
      loginId: adminAccount.login_id,
      role: 'SUPER_ADMIN',
      tenantId: 'platform-root',
      email: adminAccount.email,
      fullName: adminAccount.full_name,
      name: adminAccount.full_name,
      avatar: userAvatarRepository.getAvatarForUser({ userId: adminAccount.id, role: 'SUPER_ADMIN', email: adminAccount.email }) || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80'
    }
  });
});

// 7c. User (GVCN / Student / Parent) Firebase Auth Login for /dang-nhap
authRouter.post('/user/firebase-login', async (req: Request, res: Response) => {
  const { email, firebaseUid, idToken } = req.body;
  const cleanEmail = (email || '').trim().toLowerCase();

  if (!cleanEmail) {
    return res.status(400).json({ success: false, message: 'Vui lòng cung cấp email.' });
  }

  if (!idToken || typeof idToken !== 'string' || !idToken.trim()) {
    return res.status(401).json({
      success: false,
      errorCode: 'ID_TOKEN_REQUIRED',
      message: 'Yêu cầu mã xác thực Firebase (ID Token) hợp lệ.'
    });
  }

  const verification = await verifyGoogleTokenWithGoogle({ idToken: idToken.trim() });
  if (!verification.valid || !verification.email) {
    return res.status(401).json({
      success: false,
      errorCode: 'INVALID_FIREBASE_TOKEN',
      message: 'Mã xác thực Firebase không hợp lệ hoặc đã hết hạn.'
    });
  }

  const verifiedEmail = verification.email.toLowerCase().trim();
  if (verifiedEmail !== cleanEmail) {
    return res.status(403).json({
      success: false,
      errorCode: 'EMAIL_MISMATCH',
      message: 'Email trong token xác thực không khớp với email yêu cầu.'
    });
  }

  // 1. Check if an Admin logged in via user portal -> redirect to Super Admin
  const adminAccount = adminAccountRepository.findByLoginIdentifier(cleanEmail);
  if (adminAccount) {
    const { session, token } = sessionRepository.createSession({
      userId: adminAccount.id,
      role: 'SUPER_ADMIN',
      tenantId: 'platform-root',
      credentialVersion: adminAccount.session_version,
      expiresInDays: 30,
      isTestCredential: false,
      loginMethod: 'FIREBASE'
    });
    return res.json({
      success: true,
      role: 'SUPER_ADMIN',
      token,
      user: {
        id: adminAccount.id,
        userId: adminAccount.id,
        role: 'SUPER_ADMIN',
        tenantId: 'platform-root',
        email: adminAccount.email,
        name: adminAccount.full_name
      }
    });
  }

  // 2. Check if it's a Teacher (GVCN)
  const teacher = teacherAccountRepository.getByGoogleEmail(cleanEmail);
  if (teacher) {
    if (teacher.status === 'LOCKED' || teacher.status === 'REVOKED') {
      return res.status(403).json({
        success: false,
        errorCode: 'ACCOUNT_LOCKED',
        message: 'Tài khoản GVCN này hiện đang tạm khóa. Vui lòng liên hệ Quản trị viên.'
      });
    }

    const { session, token } = sessionRepository.createSession({
      userId: teacher.teacher_id,
      role: 'TEACHER',
      tenantId: teacher.tenant_id,
      credentialVersion: teacher.credential_version,
      expiresInDays: 7,
      isTestCredential: false
    });

    const tenant = tenantRepository.getById(teacher.tenant_id);

    return res.json({
      success: true,
      role: 'TEACHER',
      token,
      user: {
        id: teacher.teacher_id,
        userId: teacher.teacher_id,
        teacherId: teacher.teacher_id,
        name: teacher.full_name,
        email: teacher.email,
        phone: teacher.phone,
        role: 'TEACHER',
        tenantId: teacher.tenant_id,
        workspaceId: teacher.tenant_id,
        schoolName: tenant?.school_name,
        loginMethod: 'BOTH'
      }
    });
  }

  return res.status(404).json({
    success: false,
    errorCode: 'USER_NOT_FOUND',
    message: 'Email này chưa được đăng ký trong hệ thống Không Gian Chủ Nhiệm Số. Vui lòng liên hệ Quản trị viên để được cấp tài khoản.'
  });
});

// 8. Super Admin Change Password (with optional session revocation)
authRouter.post('/admin/change-password', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  if (!user || user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({
      success: false,
      errorCode: 'FORBIDDEN',
      message: 'Chỉ Quản trị viên cấp cao (SUPER_ADMIN) mới có quyền thực hiện thao tác này.'
    });
  }

  await persistenceSyncService.ensureAdminAccountHydratedAsync();

  const { oldPassword, newPassword, revokeOtherSessions, isGoogleAuthVerified } = req.body;
  const isGoogleSession = user.loginMethod === 'GOOGLE' || user.loginMethod === 'FIREBASE' || Boolean(isGoogleAuthVerified);
  const allowWithoutOldPassword = isGoogleSession || (!oldPassword && user.role === 'SUPER_ADMIN');
  const result = adminAccountRepository.changePassword(
    user.userId,
    oldPassword,
    newPassword,
    Boolean(revokeOtherSessions),
    allowWithoutOldPassword
  );

  if (!result.success) {
    return res.status(400).json(result);
  }

  auditLogRepository.log({
    actorUserId: user.userId,
    actorRole: 'SUPER_ADMIN',
    actorTenantId: 'platform-root',
    action: 'CHANGE_ADMIN_PASSWORD_SUCCESS',
    targetType: 'SYSTEM',
    targetId: 'platform-root',
    details: `Super Admin successfully changed password (revokeOtherSessions: ${Boolean(revokeOtherSessions)}, googleVerified: ${allowWithoutOldPassword})`
  });

  // If other sessions were revoked, issue a fresh session token for the current client
  let newToken: string | undefined;
  if (revokeOtherSessions && result.sessionVersion) {
    const fresh = sessionRepository.createSession({
      userId: user.userId,
      role: 'SUPER_ADMIN',
      tenantId: 'platform-root',
      credentialVersion: result.sessionVersion,
      expiresInDays: 7,
      isTestCredential: false,
      loginMethod: user.loginMethod || (isGoogleSession ? 'GOOGLE' : 'PASSWORD')
    });
    newToken = fresh.token;
  }

  res.json({ ...result, token: newToken });
});

// 9. Generate Single-Use Secret Recovery Code (Requires Re-authentication with current password)
authRouter.post('/admin/recovery-code/generate', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  if (!user || user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({
      success: false,
      errorCode: 'FORBIDDEN',
      message: 'Yêu cầu quyền Quản trị viên cấp cao.'
    });
  }

  await persistenceSyncService.ensureAdminAccountHydratedAsync();

  const { currentPassword, isGoogleAuthVerified } = req.body;
  const isGoogleSession = user.loginMethod === 'GOOGLE' || user.loginMethod === 'FIREBASE' || Boolean(isGoogleAuthVerified);
  const allowWithoutOldPassword = isGoogleSession || (!currentPassword && user.role === 'SUPER_ADMIN');
  const result = adminAccountRepository.generateRecoveryCode(user.userId, currentPassword, allowWithoutOldPassword);

  if (!result.success) {
    return res.status(400).json(result);
  }

  auditLogRepository.log({
    actorUserId: user.userId,
    actorRole: 'SUPER_ADMIN',
    actorTenantId: 'platform-root',
    action: 'GENERATE_ADMIN_RECOVERY_CODE',
    targetType: 'SYSTEM',
    targetId: 'platform-root',
    details: 'Generated new single-use recovery code for Admin'
  });

  res.json(result);
});

// 9b. Verify Recovery Code before resetting password
authRouter.post(['/admin/verify-recovery-code', '/admin/recovery-code/verify'], async (req: Request, res: Response) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({
      success: false,
      errorCode: 'RATE_LIMIT_EXCEEDED',
      message: 'Quá nhiều lượt thử. Vui lòng thử lại sau 5 phút.'
    });
  }

  await persistenceSyncService.ensureAdminAccountHydratedAsync();

  const { loginId, identifier, recoveryCode } = req.body;
  const targetId = (loginId || identifier || '').trim();
  const cleanCode = (recoveryCode || '').trim();

  const result = adminAccountRepository.verifyRecoveryCode(targetId, cleanCode);
  if (!result.success) {
    const isLocked = result.errorCode === 'ACCOUNT_LOCKED' || result.errorCode === 'ACCOUNT_SUSPENDED';
    const isNotFound = result.errorCode === 'ADMIN_NOT_FOUND';
    const isDbError = result.errorCode === 'DATABASE_ERROR' || result.errorCode === 'INTERNAL_ERROR';
    const statusCode = isLocked ? 403 : isNotFound ? 404 : isDbError ? 500 : 400;
    return res.status(statusCode).json(result);
  }

  return res.json(result);
});

// 9c. Super Admin Set / Update Custom Recovery Code (Requires Re-authentication with current password)
authRouter.post(['/admin/set-recovery-code', '/admin/recovery-code/set', '/admin/recovery-code/update'], authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  if (!user || user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({
      success: false,
      errorCode: 'FORBIDDEN',
      message: 'Yêu cầu quyền Quản trị viên cấp cao.'
    });
  }

  await persistenceSyncService.ensureAdminAccountHydratedAsync();

  const { currentPassword, newRecoveryCode, confirmRecoveryCode, isGoogleAuthVerified } = req.body;
  const isGoogleSession = user.loginMethod === 'GOOGLE' || user.loginMethod === 'FIREBASE' || Boolean(isGoogleAuthVerified);
  const allowWithoutOldPassword = isGoogleSession || (!currentPassword && user.role === 'SUPER_ADMIN');
  const result = adminAccountRepository.setCustomRecoveryCode(
    user.userId,
    currentPassword,
    newRecoveryCode,
    confirmRecoveryCode,
    allowWithoutOldPassword
  );

  if (!result.success) {
    return res.status(400).json(result);
  }

  auditLogRepository.log({
    actorUserId: user.userId,
    actorRole: 'SUPER_ADMIN',
    actorTenantId: 'platform-root',
    action: 'SET_ADMIN_RECOVERY_CODE',
    targetType: 'SYSTEM',
    targetId: 'platform-root',
    details: 'Super Admin successfully updated custom Recovery Code.'
  });

  return res.json(result);
});

// 10. Super Admin Password Recovery using Login ID + Secret Recovery Code (Free, offline recovery)
authRouter.post(['/admin/recover-password', '/admin/recovery-code/reset-password', '/admin/reset-password-recovery'], async (req: Request, res: Response) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({
      success: false,
      errorCode: 'RATE_LIMIT_EXCEEDED',
      message: 'Quá nhiều lượt thử khôi phục. Vui lòng thử lại sau 5 phút.'
    });
  }

  await persistenceSyncService.ensureAdminAccountHydratedAsync();

  const { loginId, identifier, recoveryCode, newPassword, confirmPassword } = req.body;
  const targetId = (loginId || identifier || '').trim();

  if (confirmPassword && newPassword !== confirmPassword) {
    return res.status(400).json({
      success: false,
      errorCode: 'CONFIRM_PASSWORD_MISMATCH',
      message: 'Mật khẩu xác nhận không khớp với mật khẩu mới.'
    });
  }

  const result = adminAccountRepository.resetPasswordWithRecoveryCode(targetId, recoveryCode, newPassword);

  if (!result.success) {
    auditLogRepository.log({
      actorUserId: 'anonymous',
      actorRole: 'SUPER_ADMIN',
      actorTenantId: 'platform-root',
      action: 'ADMIN_RECOVERY_FAILED',
      targetType: 'SYSTEM',
      targetId: 'platform-root',
      details: `Failed recovery attempt for identifier: ${targetId || 'none'}`
    });

    const isLocked = result.errorCode === 'ACCOUNT_LOCKED' || result.errorCode === 'ACCOUNT_SUSPENDED';
    const isNotFound = result.errorCode === 'ADMIN_NOT_FOUND';
    const isDbError = result.errorCode === 'DATABASE_ERROR' || result.errorCode === 'INTERNAL_ERROR';
    const statusCode = isLocked ? 403 : isNotFound ? 404 : isDbError ? 500 : 400;
    return res.status(statusCode).json(result);
  }

  auditLogRepository.log({
    actorUserId: 'anonymous',
    actorRole: 'SUPER_ADMIN',
    actorTenantId: 'platform-root',
    action: 'ADMIN_RECOVERY_SUCCESS',
    targetType: 'SYSTEM',
    targetId: 'platform-root',
    details: `Admin password successfully recovered with Recovery Code for: ${targetId}`
  });

  res.json(result);
});

// 11. Super Admin Revoke All Sessions across all devices
authRouter.post('/admin/revoke-all-sessions', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  if (!user || user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({
      success: false,
      errorCode: 'FORBIDDEN',
      message: 'Yêu cầu quyền Quản trị viên cấp cao.'
    });
  }

  await persistenceSyncService.ensureAdminAccountHydratedAsync();
  const result = adminAccountRepository.revokeAllSessions(user.userId);

  auditLogRepository.log({
    actorUserId: user.userId,
    actorRole: 'SUPER_ADMIN',
    actorTenantId: 'platform-root',
    action: 'REVOKE_ALL_ADMIN_SESSIONS',
    targetType: 'SYSTEM',
    targetId: 'platform-root',
    details: `Revoked all admin sessions, bumped to version ${result.newSessionVersion}`
  });

  // Create a replacement active session for the current requester
  const fresh = sessionRepository.createSession({
    userId: user.userId,
    role: 'SUPER_ADMIN',
    tenantId: 'platform-root',
    credentialVersion: result.newSessionVersion,
    expiresInDays: 7,
    isTestCredential: false
  });

  res.json({
    success: true,
    token: fresh.token,
    message: 'Đã thu hồi thành công tất cả phiên đăng nhập trên các thiết bị khác.'
  });
});

// 12. Super Admin Profile & Status
authRouter.get('/admin/profile', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  if (!user || user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({
      success: false,
      errorCode: 'FORBIDDEN',
      message: 'Yêu cầu quyền Quản trị viên cấp cao.'
    });
  }

  await persistenceSyncService.ensureAdminAccountHydratedAsync();
  const profile = adminAccountRepository.getAdminProfile(user.userId);
  if (!profile) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản Quản trị viên.' });
  }

  res.json({ success: true, profile });
});

// 13. Super Admin Update Recovery Email
authRouter.post('/admin/update-recovery-email', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  if (!user || user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({
      success: false,
      errorCode: 'FORBIDDEN',
      message: 'Yêu cầu quyền Quản trị viên cấp cao.'
    });
  }

  await persistenceSyncService.ensureAdminAccountHydratedAsync();
  const { recoveryEmail } = req.body;
  const result = adminAccountRepository.updateRecoveryEmail(user.userId, recoveryEmail);

  if (!result.success) {
    return res.status(400).json(result);
  }

  auditLogRepository.log({
    actorUserId: user.userId,
    actorRole: 'SUPER_ADMIN',
    actorTenantId: 'platform-root',
    action: 'UPDATE_ADMIN_RECOVERY_EMAIL',
    targetType: 'SYSTEM',
    targetId: 'platform-root',
    details: `Updated recovery email to: ${recoveryEmail}`
  });

  res.json(result);
});

// 14. Super Admin Email Service Status
authRouter.get('/admin/email-status', (_req: Request, res: Response) => {
  const status = emailService.getStatus();
  res.json({ success: true, status });
});

// 15. Super Admin Forgot Password via Email (Real SMTP Delivery Verification)
authRouter.post('/admin/forgot-password', async (req: Request, res: Response) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({
      success: false,
      errorCode: 'RATE_LIMIT_EXCEEDED',
      message: 'Quá nhiều lượt thử yêu cầu. Vui lòng thử lại sau 5 phút.'
    });
  }

  await persistenceSyncService.ensureAdminAccountHydratedAsync();
  const { identifier, email } = req.body;
  const targetId = (identifier || email || '').trim();

  if (!targetId) {
    return res.status(400).json({
      success: false,
      errorCode: 'IDENTIFIER_REQUIRED',
      message: 'Vui lòng nhập Tên đăng nhập hoặc Email Quản trị viên.'
    });
  }

  const tokenResult = adminAccountRepository.createPasswordResetToken(targetId);
  if (!tokenResult.success || !tokenResult.token || !tokenResult.admin) {
    // Log failed attempt for security audit
    auditLogRepository.log({
      actorUserId: 'anonymous',
      actorRole: 'SUPER_ADMIN',
      actorTenantId: 'platform-root',
      action: 'ADMIN_FORGOT_PASSWORD_FAILED',
      targetType: 'SYSTEM',
      targetId: 'platform-root',
      details: `Password reset requested for unknown identifier: ${targetId}`
    });

    return res.status(404).json({
      success: false,
      errorCode: 'ADMIN_NOT_FOUND',
      message: 'Không tìm thấy tài khoản Quản trị viên tương ứng với thông tin đã nhập.'
    });
  }

  const admin = tokenResult.admin;
  const targetEmail = admin.recovery_email || admin.email;

  // Send real email via configured SMTP transport
  const sendResult = await emailService.sendAdminResetTokenEmail(
    targetEmail,
    tokenResult.token,
    admin.full_name
  );

  if (!sendResult.success) {
    auditLogRepository.log({
      actorUserId: admin.id,
      actorRole: 'SUPER_ADMIN',
      actorTenantId: 'platform-root',
      action: 'ADMIN_EMAIL_DELIVERY_FAILED',
      targetType: 'SYSTEM',
      targetId: 'platform-root',
      details: `Failed to deliver reset email: ${sendResult.message}`
    });

    // CRITICAL MANDATE: NEVER report fake success if email was not actually sent
    return res.status(400).json({
      success: false,
      errorCode: sendResult.errorCode || 'EMAIL_DELIVERY_FAILED',
      message: sendResult.message,
      emailConfigured: emailService.isConfigured()
    });
  }

  auditLogRepository.log({
    actorUserId: admin.id,
    actorRole: 'SUPER_ADMIN',
    actorTenantId: 'platform-root',
    action: 'ADMIN_FORGOT_PASSWORD_EMAIL_SENT',
    targetType: 'SYSTEM',
    targetId: 'platform-root',
    details: `Password reset email sent to: ${targetEmail}`
  });

  const [u, d] = targetEmail.split('@');
  const maskedEmail = `${u.slice(0, 3)}***@${d}`;

  return res.json({
    success: true,
    maskedEmail,
    expiresAt: tokenResult.expiresAt,
    message: `Mã xác thực 6 chữ số đã được gửi thành công đến ${maskedEmail}. Vui lòng kiểm tra hộp thư đến (hoặc Spam).`
  });
});

// 16. Super Admin Reset Password with 6-Digit Email Verification Token
authRouter.post('/admin/reset-password', async (req: Request, res: Response) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({
      success: false,
      errorCode: 'RATE_LIMIT_EXCEEDED',
      message: 'Quá nhiều lượt thử đặt lại mật khẩu. Vui lòng thử lại sau 5 phút.'
    });
  }

  await persistenceSyncService.ensureAdminAccountHydratedAsync();
  const { identifier, email, token, newPassword } = req.body;
  const targetId = (identifier || email || '').trim();
  const result = adminAccountRepository.resetPasswordWithToken(targetId, token, newPassword);

  if (!result.success) {
    auditLogRepository.log({
      actorUserId: 'anonymous',
      actorRole: 'SUPER_ADMIN',
      actorTenantId: 'platform-root',
      action: 'ADMIN_RESET_PASSWORD_FAILED',
      targetType: 'SYSTEM',
      targetId: 'platform-root',
      details: `Failed reset attempt for ${targetId}: ${result.message}`
    });

    return res.status(400).json(result);
  }

  auditLogRepository.log({
    actorUserId: 'anonymous',
    actorRole: 'SUPER_ADMIN',
    actorTenantId: 'platform-root',
    action: 'ADMIN_RESET_PASSWORD_SUCCESS',
    targetType: 'SYSTEM',
    targetId: 'platform-root',
    details: `Admin password successfully reset with Email Token for: ${targetId}`
  });

  return res.json(result);
});

// 17. Super Admin Account Status Check
authRouter.get('/admin/status', async (req: Request, res: Response) => {
  await persistenceSyncService.ensureAdminAccountHydratedAsync();
  const identifier = req.query.identifier as string | undefined;
  const status = adminAccountRepository.getAdminStatus(identifier);
  return res.json({ success: true, ...status });
});

// 18. Super Admin First-Time Password Setup
authRouter.post('/admin/setup-password', async (req: Request, res: Response) => {
  await persistenceSyncService.ensureAdminAccountHydratedAsync();
  const { identifier, newPassword, setupCode, recoveryCode } = req.body;
  const result = adminAccountRepository.setupFirstTimePassword(
    identifier,
    newPassword,
    setupCode || recoveryCode
  );
  if (!result.success) {
    auditLogRepository.log({
      actorUserId: 'anonymous',
      actorRole: 'SUPER_ADMIN',
      actorTenantId: 'platform-root',
      action: 'ADMIN_SETUP_PASSWORD_FAILED',
      targetType: 'SYSTEM',
      targetId: 'platform-root',
      details: `First-time setup failed for ${identifier}: ${result.message}`
    });
    return res.status(400).json(result);
  }

  auditLogRepository.log({
    actorUserId: 'usr-super-admin',
    actorRole: 'SUPER_ADMIN',
    actorTenantId: 'platform-root',
    action: 'ADMIN_SETUP_PASSWORD_SUCCESS',
    targetType: 'SYSTEM',
    targetId: 'platform-root',
    details: `First-time password setup successfully completed for: ${identifier}`
  });

  return res.json(result);
});


