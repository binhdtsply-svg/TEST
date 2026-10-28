import { Request, Response, NextFunction } from 'express';
import { sessionRepository, SessionRecord } from '../repositories/SessionRepository';
import { credentialRepository } from '../repositories/CredentialRepository';
import { teacherAccountRepository } from '../repositories/TeacherAccountRepository';
import { adminAccountRepository } from '../repositories/AdminAccountRepository';
import { verifySessionToken } from '../auth/crypto';

export interface AuthenticatedRequest extends Request {
  user?: {
    sessionId: string;
    userId: string;
    role: 'SUPER_ADMIN' | 'TEACHER' | 'CLASS_OFFICER' | 'STUDENT' | 'PARENT';
    tenantId: string;
    teacherId?: string | null;
    studentId?: string | null;
    childStudentId?: string | null;
    officerRoleTitle?: string | null;
    credentialVersion: number;
    isTestCredential: boolean;
    fullName?: string | null;
    loginMethod?: string | null;
  };
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
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

  if (!token) {
    return res.status(401).json({
      success: false,
      errorCode: 'AUTH_REQUIRED',
      message: 'Vui lòng đăng nhập để thực hiện thao tác này.'
    });
  }

  const session = sessionRepository.getSessionByToken(token);
  if (!session) {
    return res.status(401).json({
      success: false,
      errorCode: 'SESSION_EXPIRED',
      message: 'Phiên làm việc đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.'
    });
  }

  // Check if credential has been locked, revoked, or regenerated since session was issued
  if (session.role === 'TEACHER') {
    let teacherAcc = session.teacher_id ? teacherAccountRepository.getByTeacherId(session.teacher_id) : null;
    if (!teacherAcc && session.tenant_id) {
      teacherAcc = teacherAccountRepository.getByTenantId(session.tenant_id);
    }
    if (teacherAcc && (teacherAcc.status !== 'ACTIVE' || teacherAcc.credential_version > session.credential_version)) {
      sessionRepository.deleteSession(session.id);
      return res.status(401).json({
        success: false,
        errorCode: 'SESSION_REVOKED',
        message: 'Tài khoản Giáo viên đã bị thay đổi hoặc khóa. Phiên làm việc đã bị thu hồi.'
      });
    }
  } else if ((session.role === 'STUDENT' || session.role === 'CLASS_OFFICER') && session.student_id) {
    const cred = credentialRepository.findByTenantAndOwner(session.tenant_id, session.student_id, 'STUDENT');
    if (cred && (cred.status !== 'ACTIVE' || cred.credential_version > session.credential_version)) {
      sessionRepository.deleteSession(session.id);
      return res.status(401).json({
        success: false,
        errorCode: 'SESSION_REVOKED',
        message: 'Mã truy cập Học sinh đã bị khóa hoặc cấp mới. Phiên làm việc đã bị thu hồi.'
      });
    }
  } else if (session.role === 'PARENT' && session.child_student_id) {
    const cred = credentialRepository.findByTenantAndOwner(session.tenant_id, session.child_student_id, 'PARENT');
    if (cred && (cred.status !== 'ACTIVE' || cred.credential_version > session.credential_version)) {
      sessionRepository.deleteSession(session.id);
      return res.status(401).json({
        success: false,
        errorCode: 'SESSION_REVOKED',
        message: 'Mã truy cập Phụ huynh đã bị khóa hoặc cấp mới. Phiên làm việc đã bị thu hồi.'
      });
    }
  } else if (session.role === 'SUPER_ADMIN') {
    let admin = adminAccountRepository.findById(session.user_id);
    if (!admin) {
      admin = adminAccountRepository.findById('usr-super-admin');
    }
    if (!admin || admin.status !== 'ACTIVE' || (admin.session_version && admin.session_version > session.credential_version)) {
      sessionRepository.deleteSession(session.id);
      return res.status(401).json({
        success: false,
        errorCode: 'SESSION_REVOKED',
        message: 'Phiên làm việc của Quản trị viên đã hết hạn hoặc bị thu hồi. Vui lòng đăng nhập lại.'
      });
    }
  }

  const tokenPayload = verifySessionToken(token);
  req.user = {
    sessionId: session.id,
    userId: session.user_id,
    role: session.role,
    tenantId: session.tenant_id,
    teacherId: session.teacher_id,
    studentId: session.student_id,
    childStudentId: session.child_student_id,
    officerRoleTitle: session.officer_role_title,
    credentialVersion: session.credential_version,
    isTestCredential: Boolean(session.is_test_credential),
    loginMethod: tokenPayload?.loginMethod || (session as any).login_method || null,
    fullName: session.role === 'TEACHER' && session.teacher_id 
      ? teacherAccountRepository.getByTeacherId(session.teacher_id)?.full_name 
      : (session.role === 'SUPER_ADMIN' ? 'Ban Quản trị' : null)
  };

  next();
}

export function requireRole(...allowedRoles: Array<'SUPER_ADMIN' | 'TEACHER' | 'CLASS_OFFICER' | 'STUDENT' | 'PARENT'>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        errorCode: 'AUTH_REQUIRED',
        message: 'Yêu cầu xác thực.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        errorCode: 'ROLE_ACCESS_DENIED',
        message: `Bạn không có quyền thực hiện thao tác này. Quyền yêu cầu: [${allowedRoles.join(', ')}].`
      });
    }

    next();
  };
}

export const requireSuperAdmin = requireRole('SUPER_ADMIN');

export function requireTenantAccess(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ success: false, errorCode: 'AUTH_REQUIRED', message: 'Yêu cầu xác thực.' });
  }

  // Super Admin can access all tenants
  if (req.user.role === 'SUPER_ADMIN') {
    return next();
  }

  const targetTenantId = (req.params.tenantId || req.body.tenantId || req.query.tenantId || '').toString();

  if (targetTenantId && req.user.tenantId !== targetTenantId) {
    return res.status(403).json({
      success: false,
      errorCode: 'TENANT_ACCESS_DENIED',
      message: `403 TENANT ISOLATION ERROR: Bạn không có quyền truy cập không gian ${targetTenantId}.`
    });
  }

  next();
}
