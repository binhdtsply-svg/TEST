/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserAccount, UserRole, OfficerPermissions } from '../types';
import { demoAccounts } from '../data/demoData';
import { studentService } from './StudentService';
import { tenantService } from './TenantService';
import { authRepository } from './AuthRepository';
import { safeLocalStorageGet, safeLocalStorageSet, safeLocalStorageRemove } from '../utils/storageUtils';
import { sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';
import { firebaseAuth } from './GoogleAuthService';

const AUTH_STORAGE_KEY = 'kgcns_current_user_role';
const ACCOUNTS_STORAGE_KEY = 'kgcns_user_accounts';
const SESSION_STORAGE_KEY = 'kgcns_auth_session';
const CUSTOM_AVATARS_STORAGE_KEY = 'kgcns_custom_avatars_map';

const SUPER_ADMIN_GOOGLE_EMAIL = 'binhdtsply@gmail.com';

const SUPER_ADMIN_ACCOUNT: UserAccount = {
  id: 'usr-super-admin',
  userId: 'usr-super-admin',
  name: 'Ban Quản trị Hệ thống Không Gian Chủ Nhiệm Số',
  role: 'SUPER_ADMIN',
  avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80',
  email: SUPER_ADMIN_GOOGLE_EMAIL,
  phone: '0900 000 999',
  tenantId: 'platform-root',
  workspaceId: 'platform-root',
  loginMethod: 'GOOGLE'
};

const TEACHER_2_ACCOUNT: UserAccount = {
  id: 'tch-02',
  userId: 'usr-teacher-2',
  teacherId: 'tch-02',
  name: 'Thầy Trần Hoàng Nam (GVCN 12A2)',
  role: 'TEACHER',
  avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
  email: 'hoangnam.tran@nguyenhue.edu.vn',
  phone: '0988 777 666',
  tenantId: 'tenant-hoang-nam',
  workspaceId: 'tenant-hoang-nam',
  loginMethod: 'BOTH'
};

class AuthService {
  private currentRole: UserRole = 'STUDENT';
  private userAccounts: Record<string, UserAccount> = {
    ...demoAccounts,
    superAdmin: SUPER_ADMIN_ACCOUNT,
    teacher2: TEACHER_2_ACCOUNT
  };
  private currentUser: UserAccount = {
    id: 'guest',
    name: 'Chưa đăng nhập',
    role: 'STUDENT',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
  };
  private listeners: Array<(user: UserAccount) => void> = [];

  constructor() {
    try {
      const savedAccounts = safeLocalStorageGet(ACCOUNTS_STORAGE_KEY);
      if (savedAccounts) {
        this.userAccounts = { ...this.userAccounts, ...JSON.parse(savedAccounts) };
      }
    } catch {
      // ignore
    }

    try {
      const savedSession = safeLocalStorageGet(SESSION_STORAGE_KEY);
      if (savedSession) {
        const session = JSON.parse(savedSession);
        if (session.role) {
          this.restoreSession(session);
          if (session.token) {
            authRepository.setSessionToken(session.token);
          }
          this.notify();
          return;
        }
      }
    } catch {
      // ignore
    }

    const hasToken = !!authRepository.getSessionToken();
    const savedRole = safeLocalStorageGet(AUTH_STORAGE_KEY) as UserRole | null;
    if (savedRole && hasToken && ['SUPER_ADMIN', 'TEACHER', 'CLASS_OFFICER', 'STUDENT', 'PARENT'].includes(savedRole)) {
      this.switchRole(savedRole);
    } else {
      safeLocalStorageRemove(AUTH_STORAGE_KEY);
      safeLocalStorageRemove(SESSION_STORAGE_KEY);
      this.currentUser = {
        id: 'guest',
        name: 'Chưa đăng nhập',
        role: 'STUDENT',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
      };
      this.currentRole = 'STUDENT';
    }
  }

  public getPersistentAvatar(identity: {
    id?: string;
    userId?: string;
    role?: string;
    tenantId?: string;
    studentId?: string;
    teacherId?: string;
    childStudentId?: string;
    email?: string;
  }): string | null {
    try {
      const mapStr = safeLocalStorageGet(CUSTOM_AVATARS_STORAGE_KEY);
      if (mapStr) {
        const map = JSON.parse(mapStr);
        const keysToCheck: string[] = [];
        const isParent = identity.role === 'PARENT' || (Boolean(identity.childStudentId) && !identity.studentId && identity.role !== 'STUDENT');
        if (isParent) {
          // Strictly Parent keys - NEVER check student_* keys!
          if (identity.userId) keysToCheck.push(`user_${identity.userId}`, identity.userId, `parent_${identity.userId}`);
          if (identity.id) keysToCheck.push(`user_${identity.id}`, identity.id, `parent_${identity.id}`);
          if (identity.childStudentId) keysToCheck.push(`parent_child_${identity.childStudentId}`, `parent_${identity.childStudentId}`);
          if (identity.email) keysToCheck.push(`email_${identity.email.toLowerCase().trim()}`);
          if (identity.tenantId && identity.childStudentId) keysToCheck.push(`role_PARENT_${identity.tenantId}_${identity.childStudentId}`);
        } else {
          // Student / Teacher / Super Admin keys
          if (identity.userId) keysToCheck.push(`user_${identity.userId}`, identity.userId);
          if (identity.id) keysToCheck.push(`user_${identity.id}`, identity.id);
          if (identity.studentId) keysToCheck.push(`student_${identity.studentId}`);
          if (identity.teacherId) keysToCheck.push(`teacher_${identity.teacherId}`, identity.teacherId);
          if (identity.email) keysToCheck.push(`email_${identity.email.toLowerCase().trim()}`);
          if (identity.role === 'SUPER_ADMIN') {
            keysToCheck.push('role_SUPER_ADMIN');
          }
        }

        for (const k of keysToCheck) {
          if (map[k] && typeof map[k] === 'string' && map[k].trim()) {
            return map[k];
          }
        }
      }
    } catch {
      // ignore
    }
    return null;
  }

  private restoreSession(session: any) {
    this.currentRole = session.role;
    if (session.tenantId) {
      tenantService.setActiveTenant(session.tenantId, {
        ownerName: session.name,
        ownerEmail: session.email
      });
    }

    let resolvedName = session.name;
    if (!resolvedName || resolvedName === 'Người dùng' || resolvedName === 'Chưa đăng nhập') {
      if (session.role === 'TEACHER') {
        const matchedT = tenantService.getTeacherAccounts().find(a => a.tenantId === session.tenantId || a.id === session.teacherId);
        const tenantMeta = tenantService.getTenantById(session.tenantId);
        resolvedName = matchedT?.fullName || tenantMeta?.ownerName || (session.tenantId === 'tenant-hoang-nam' ? 'Thầy Trần Hoàng Nam' : session.name || 'Giáo viên Chủ nhiệm');
      } else if (session.role === 'SUPER_ADMIN') {
        resolvedName = 'Ban Quản trị Hệ thống Không Gian Chủ Nhiệm Số';
      } else if ((session.role === 'STUDENT' || session.role === 'CLASS_OFFICER') && session.studentId) {
        const stu = studentService.getById(session.studentId);
        if (stu) {
          resolvedName = stu.fullName;
        }
      } else if (session.role === 'PARENT' && session.childStudentId) {
        const stu = studentService.getById(session.childStudentId);
        if (stu) {
          const parentName = stu.parent?.fatherName ? `Bác ${stu.parent.fatherName}` : stu.parent?.motherName ? `Cô ${stu.parent.motherName}` : `Phụ huynh em ${stu.fullName}`;
          resolvedName = `${parentName} (PH em ${stu.fullName})`;
        }
      }
    }

    const isParent = session.role === 'PARENT';
    const parentDefaultAvatar = demoAccounts.parent.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80';
    let resolvedAvatar = this.getPersistentAvatar({
      id: session.userId || session.id,
      userId: session.userId,
      role: session.role,
      tenantId: session.tenantId,
      studentId: isParent ? undefined : session.studentId,
      teacherId: session.teacherId,
      childStudentId: isParent ? session.childStudentId : undefined,
      email: session.email
    }) || (isParent ? (session.avatar || parentDefaultAvatar) : session.avatar);

    if ((session.role === 'STUDENT' || session.role === 'CLASS_OFFICER') && (session.studentId || session.userId)) {
      const targetId = session.studentId || session.userId;
      if (targetId) {
        const stu = studentService.getById(targetId);
        if (stu?.avatar) {
          resolvedAvatar = stu.avatar;
        }
      }
    }

    this.currentUser = {
      id: session.userId || `usr-${session.role.toLowerCase()}`,
      userId: session.userId,
      teacherId: session.teacherId,
      token: session.token,
      name: resolvedName || (session.role === 'PARENT' ? 'Phụ huynh' : 'Học viên'),
      role: session.role,
      avatar: resolvedAvatar || (isParent ? parentDefaultAvatar : ((demoAccounts as any)[session.role.toLowerCase()]?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80')),
      tenantId: session.tenantId,
      workspaceId: session.workspaceId || session.tenantId,
      currentClassId: session.currentClassId,
      studentId: session.studentId,
      childStudentId: session.childStudentId,
      phone: session.phone,
      email: session.email,
      loginMethod: session.loginMethod,
      googleSub: session.googleSub,
      issuedAt: session.issuedAt,
      expiresAt: session.expiresAt,
      permissions: session.role === 'CLASS_OFFICER' ? (session.permissions || demoAccounts.officer.permissions) : undefined
    };
  }

  public isAuthenticated(): boolean {
    const hasSession = !!safeLocalStorageGet(SESSION_STORAGE_KEY);
    const hasRole = !!safeLocalStorageGet(AUTH_STORAGE_KEY);
    const hasToken = !!authRepository.getSessionToken();
    if (this.currentUser?.role === 'SUPER_ADMIN' && !hasToken) {
      return false;
    }
    return (hasSession || hasRole || hasToken) && Boolean(this.currentUser && this.currentUser.id !== 'guest');
  }

  public async verifyServerSession(): Promise<{ valid: boolean; role?: UserRole }> {
    const res = await authRepository.verifySession();
    if (res.success && res.user) {
      if (this.currentUser.role !== res.user.role) {
        this.currentUser.role = res.user.role;
        this.currentRole = res.user.role;
        safeLocalStorageSet(AUTH_STORAGE_KEY, res.user.role);
        this.notify();
      }
      return { valid: true, role: res.user.role };
    }
    return { valid: false };
  }

  public getToken(): string {
    if (this.currentUser?.token) {
      return this.currentUser.token;
    }
    const repoToken = authRepository.getSessionToken();
    if (repoToken) return repoToken;

    const sessionStr = safeLocalStorageGet(SESSION_STORAGE_KEY);
    if (sessionStr) {
      try {
        const session = JSON.parse(sessionStr);
        if (session.token) return session.token;
      } catch {
        // ignore
      }
    }
    return (
      safeLocalStorageGet('kgcns_auth_token') ||
      safeLocalStorageGet('kgcns_server_session_token') ||
      safeLocalStorageGet('kgcns_session_token') ||
      ''
    );
  }

  public async ensureValidSession(): Promise<string> {
    const existing = this.getToken();
    const userInfo = {
      userId: this.currentUser?.userId || this.currentUser?.id,
      role: this.currentUser?.role || this.currentRole,
      tenantId: this.currentUser?.tenantId,
      teacherId: this.currentUser?.teacherId,
      studentId: this.currentUser?.studentId,
      childStudentId: this.currentUser?.childStudentId,
      email: this.currentUser?.email,
      token: existing
    };

    const res = await authRepository.syncSession(userInfo);
    if (res.success && res.token) {
      if (this.currentUser) {
        this.currentUser.token = res.token;
        safeLocalStorageSet(SESSION_STORAGE_KEY, JSON.stringify(this.currentUser));
      }
      authRepository.setSessionToken(res.token);
      return res.token;
    }
    return existing || '';
  }

  public logout() {
    safeLocalStorageRemove(SESSION_STORAGE_KEY);
    safeLocalStorageRemove(AUTH_STORAGE_KEY);
    authRepository.logout().catch(() => {});
    authRepository.setSessionToken(null);
    tenantService.clearActiveTenant();
    try {
      studentService.clearOnLogout();
    } catch {}
    this.currentUser = {
      id: 'guest',
      name: 'Chưa đăng nhập',
      role: 'STUDENT',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
    };
    this.currentRole = 'STUDENT';
    this.notify();
  }

  /**
   * Verified Google OAuth Sign-in flow.
   * Super Admin is strictly locked to 'binhdtsply@gmail.com'.
   * GVCN must match an active teacher account registered with allowedGoogleEmail.
   */
  public loginWithGoogle(
    email: string,
    sub?: string,
    name?: string,
    avatar?: string
  ): { success: boolean; user?: UserAccount; message: string; errorCode?: string } {
    const normEmail = email.trim().toLowerCase();

    // 1. Check Super Admin Identity (strictly binhdtsply@gmail.com)
    if (normEmail === SUPER_ADMIN_GOOGLE_EMAIL) {
      const adminAvatar = this.getPersistentAvatar({ userId: SUPER_ADMIN_ACCOUNT.id, role: 'SUPER_ADMIN', email: normEmail }) || avatar || SUPER_ADMIN_ACCOUNT.avatar;
      this.currentUser = {
        ...SUPER_ADMIN_ACCOUNT,
        name: name || SUPER_ADMIN_ACCOUNT.name,
        avatar: adminAvatar,
        googleSub: sub,
        loginMethod: 'GOOGLE',
        issuedAt: Date.now(),
        expiresAt: Date.now() + 86400000 * 7,
        studentId: undefined,
        childStudentId: undefined,
        isTestCredential: false
      };
      this.currentRole = 'SUPER_ADMIN';
      safeLocalStorageSet(AUTH_STORAGE_KEY, 'SUPER_ADMIN');
      safeLocalStorageSet(
        SESSION_STORAGE_KEY,
        JSON.stringify({
          userId: SUPER_ADMIN_ACCOUNT.id,
          role: 'SUPER_ADMIN',
          name: this.currentUser.name,
          email: normEmail,
          avatar: this.currentUser.avatar,
          tenantId: 'platform-root',
          workspaceId: 'platform-root',
          loginMethod: 'GOOGLE',
          googleSub: sub,
          issuedAt: this.currentUser.issuedAt,
          expiresAt: this.currentUser.expiresAt
        })
      );
      this.ensureValidSession().catch(() => {});
      this.notify();
      return {
        success: true,
        user: this.currentUser,
        message: `Đăng nhập thành công Quản trị viên Super Admin (${normEmail}) qua Google OAuth!`
      };
    }

    // 2. Check Teacher Account bound to Google Email
    const matchedTeacher = tenantService.findTeacherByGoogleIdentity(normEmail, sub);

    if (matchedTeacher) {
      if (matchedTeacher.status === 'LOCKED') {
        return { success: false, message: 'Tài khoản Giáo viên chủ nhiệm đã bị tạm khóa bởi Quản trị viên.', errorCode: 'ACCOUNT_LOCKED' };
      }
      if (matchedTeacher.status === 'REVOKED') {
        return { success: false, message: 'Tài khoản Giáo viên chủ nhiệm đã bị thu hồi quyền truy cập.', errorCode: 'ACCOUNT_REVOKED' };
      }
      if (matchedTeacher.loginMethod === 'ACCESS_CODE') {
        return { success: false, message: 'Email này chưa được cấp quyền đăng nhập Google.', errorCode: 'GOOGLE_AUTH_DISABLED' };
      }

      tenantService.setActiveTenant(matchedTeacher.tenantId);
      if (sub && !matchedTeacher.googleSub) {
        tenantService.linkGoogleAccount(matchedTeacher.id, normEmail, sub);
      }

      const tAvatar = this.getPersistentAvatar({
        userId: matchedTeacher.id,
        teacherId: matchedTeacher.id,
        role: 'TEACHER',
        tenantId: matchedTeacher.tenantId,
        email: matchedTeacher.email
      }) || avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80';

      this.currentUser = {
        id: matchedTeacher.id,
        userId: matchedTeacher.id,
        teacherId: matchedTeacher.id,
        name: matchedTeacher.fullName,
        role: 'TEACHER',
        email: matchedTeacher.email,
        phone: matchedTeacher.phone,
        avatar: tAvatar,
        tenantId: matchedTeacher.tenantId,
        workspaceId: matchedTeacher.tenantId,
        loginMethod: 'GOOGLE',
        googleSub: sub,
        issuedAt: Date.now(),
        expiresAt: Date.now() + 86400000 * 7,
        studentId: undefined,
        childStudentId: undefined,
        isTestCredential: false
      };
      this.currentRole = 'TEACHER';
      safeLocalStorageSet(AUTH_STORAGE_KEY, 'TEACHER');
      safeLocalStorageSet(
        SESSION_STORAGE_KEY,
        JSON.stringify({
          userId: matchedTeacher.id,
          teacherId: matchedTeacher.id,
          role: 'TEACHER',
          name: matchedTeacher.fullName,
          email: matchedTeacher.email,
          phone: matchedTeacher.phone,
          tenantId: matchedTeacher.tenantId,
          workspaceId: matchedTeacher.tenantId,
          avatar: this.currentUser.avatar,
          loginMethod: 'GOOGLE',
          googleSub: sub,
          issuedAt: this.currentUser.issuedAt,
          expiresAt: this.currentUser.expiresAt
        })
      );
      this.notify();
      return {
        success: true,
        user: this.currentUser,
        message: `Chào mừng GVCN ${matchedTeacher.fullName} (${matchedTeacher.schoolName}) đăng nhập qua Google!`
      };
    }

    return {
      success: false,
      message: 'Email Google này chưa được đăng ký trong hệ thống. Vui lòng liên hệ Quản trị viên.',
      errorCode: 'GOOGLE_EMAIL_NOT_REGISTERED'
    };
  }

  /**
   * Async server-authenticated Google sign-in
   */
  public async loginWithGoogleAsync(
    email: string,
    sub?: string,
    name?: string,
    avatar?: string,
    accessToken?: string,
    idToken?: string,
    selectedRole?: string
  ): Promise<{ success: boolean; user?: UserAccount; message: string; errorCode?: string }> {
    const serverResult = await authRepository.loginWithGoogle(email, sub, name, avatar, accessToken, idToken, selectedRole);
    if (!serverResult.success || !serverResult.user) {
      if (serverResult.errorCode === 'NETWORK_ERROR') {
        const localResult = this.loginWithGoogle(email, sub, name, avatar);
        if (localResult.success) {
          return localResult;
        }
        return localResult;
      }
      return {
        success: false,
        message: serverResult.message || 'Email Google này chưa được đăng ký trong hệ thống. Vui lòng liên hệ Quản trị viên.',
        errorCode: serverResult.errorCode || 'GOOGLE_EMAIL_NOT_REGISTERED'
      };
    }

    const sUser = serverResult.user;
    if (sUser.tenantId) {
      tenantService.setActiveTenant(sUser.tenantId);
    }

    const isSuperAdmin = sUser.role === 'SUPER_ADMIN';
    const isTeacher = sUser.role === 'TEACHER';
    const isNam = sUser.tenantId === 'tenant-hoang-nam';

    const customGoogleAvatar = this.getPersistentAvatar({
      id: sUser.id,
      userId: sUser.id,
      role: sUser.role,
      tenantId: sUser.tenantId,
      teacherId: sUser.teacherId,
      email: sUser.email || email
    });

    this.currentUser = {
      id: sUser.id,
      userId: sUser.id,
      teacherId: sUser.teacherId,
      name: isSuperAdmin ? 'Ban Quản trị Hệ thống Không Gian Chủ Nhiệm Số' : (sUser.displayName || sUser.fullName || name || (isTeacher ? 'Giáo viên Chủ nhiệm' : 'Người dùng Google')),
      role: sUser.role as UserRole,
      email: sUser.email || email,
      avatar: customGoogleAvatar || avatar || sUser.avatar || (isSuperAdmin ? 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80' : 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80'),
      tenantId: sUser.tenantId || (isSuperAdmin ? 'platform-root' : ''),
      workspaceId: sUser.tenantId || (isSuperAdmin ? 'platform-root' : ''),
      loginMethod: 'GOOGLE',
      googleSub: sub,
      token: serverResult.token,
      issuedAt: Date.now(),
      expiresAt: Date.now() + 86400000 * 7,
      isTestCredential: Boolean(sUser.isTestCredential)
    };
    this.currentRole = sUser.role as UserRole;
    safeLocalStorageSet(AUTH_STORAGE_KEY, sUser.role);
    safeLocalStorageSet(SESSION_STORAGE_KEY, JSON.stringify(this.currentUser));
    if (serverResult.token) {
      authRepository.setSessionToken(serverResult.token);
    }
    this.notify();

    return {
      success: true,
      user: this.currentUser,
      message: isSuperAdmin 
        ? `Đăng nhập thành công Quản trị viên Super Admin (${this.currentUser.email}) qua Google OAuth!`
        : `Chào mừng GVCN ${this.currentUser.name}!`
    };
  }

  /**
   * User (GVCN / Student / Parent) login via Firebase Authentication Email + Password
   */
  public async loginUserWithFirebaseAsync(
    email: string,
    passwordPlain: string
  ): Promise<{
    success: boolean;
    user?: UserAccount;
    message: string;
    errorCode?: string;
  }> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = passwordPlain.trim();

    try {
      let idToken: string | undefined;
      let firebaseUid: string | undefined;

      try {
        const userCred = await signInWithEmailAndPassword(firebaseAuth, cleanEmail, cleanPass);
        if (userCred?.user) {
          idToken = await userCred.user.getIdToken();
          firebaseUid = userCred.user.uid;
        }
      } catch (fbErr: any) {
        console.warn('[AuthService] Firebase direct sign-in:', fbErr.code);
      }

      const res = await fetch('/api/v1/auth/user/firebase-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, firebaseUid, idToken })
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.user) {
        return {
          success: false,
          errorCode: data.errorCode || 'LOGIN_FAILED',
          message: data.message || 'Email hoặc mật khẩu không chính xác.'
        };
      }

      if (data.token) {
        authRepository.setSessionToken(data.token);
      }

      const sUser = data.user;
      if (sUser.tenantId) {
        tenantService.setActiveTenant(sUser.tenantId);
      }

      this.currentUser = {
        ...sUser,
        role: data.role || sUser.role,
        issuedAt: Date.now(),
        expiresAt: Date.now() + 86400000 * 7
      };
      this.currentRole = this.currentUser.role;
      safeLocalStorageSet(AUTH_STORAGE_KEY, this.currentRole);
      safeLocalStorageSet(SESSION_STORAGE_KEY, JSON.stringify(this.currentUser));
      this.notify();

      return {
        success: true,
        user: this.currentUser,
        message: `Đăng nhập thành công với vai trò ${this.currentRole}!`
      };
    } catch (err: any) {
      return {
        success: false,
        errorCode: 'NETWORK_ERROR',
        message: err?.message || 'Không thể kết nối đến máy chủ xác thực.'
      };
    }
  }

  /**
   * Super Admin login with Firebase Authentication (with strict role check)
   */
  public async loginAdminWithFirebaseAsync(
    email: string,
    passwordPlain: string,
    rememberDevice: boolean = true
  ): Promise<{
    success: boolean;
    user?: UserAccount;
    message: string;
    errorCode?: string;
  }> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = passwordPlain.trim();

    try {
      let idToken: string | undefined;
      let firebaseUid: string | undefined;

      // 1. Authenticate against single Firebase Authentication instance
      try {
        const userCred = await signInWithEmailAndPassword(firebaseAuth, cleanEmail, cleanPass);
        if (userCred?.user) {
          idToken = await userCred.user.getIdToken();
          firebaseUid = userCred.user.uid;
        }
      } catch (fbErr: any) {
        // Fall back to server authentication
        console.warn('[AuthService] Firebase direct admin auth:', fbErr?.code);
      }

      // 2. Strict Server Role Verification: admin = true check
      const res = await fetch('/api/v1/auth/admin/verify-firebase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, firebaseUid, idToken })
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        await res.text().catch(() => '');
        return {
          success: false,
          errorCode: res.status === 403 ? 'FORBIDDEN_NOT_ADMIN' : 'INVALID_SERVER_RESPONSE',
          message: res.status === 403
            ? 'TỪ CHỐI QUYỀN ADMIN: Tài khoản không có quyền Quản trị viên.'
            : 'Máy chủ xác thực không phản hồi định dạng JSON hợp lệ.'
        };
      }

      const text = await res.text();
      let data: any;
      try {
        data = text && text.trim() ? JSON.parse(text) : null;
      } catch {
        return {
          success: false,
          errorCode: 'JSON_PARSE_ERROR',
          message: 'Không thể xử lý phản hồi từ máy chủ.'
        };
      }

      if (!res.ok || !data || !data.success || !data.admin) {
        return {
          success: false,
          errorCode: data?.errorCode || (res.status === 403 ? 'FORBIDDEN_NOT_ADMIN' : 'UNAUTHORIZED'),
          message: data?.message || (res.status === 403
            ? 'TỪ CHỐI QUYỀN ADMIN: Tài khoản không có quyền Quản trị viên.'
            : 'Xác thực tài khoản không thành công.')
        };
      }

      if (data.token) {
        authRepository.setSessionToken(data.token);
      }

      const sUser = data.user;
      this.currentUser = {
        ...sUser,
        role: 'SUPER_ADMIN',
        issuedAt: Date.now(),
        expiresAt: Date.now() + (rememberDevice ? 86400000 * 30 : 86400000 * 7)
      };
      this.currentRole = 'SUPER_ADMIN';
      safeLocalStorageSet(AUTH_STORAGE_KEY, 'SUPER_ADMIN');
      safeLocalStorageSet(SESSION_STORAGE_KEY, JSON.stringify(this.currentUser));
      this.notify();

      return {
        success: true,
        user: this.currentUser,
        message: 'Đăng nhập Quản trị viên thành công!'
      };
    } catch (err: any) {
      return {
        success: false,
        errorCode: 'NETWORK_ERROR',
        message: err?.message || 'Không thể kết nối đến máy chủ xác thực Quản trị viên.'
      };
    }
  }

  /**
   * Async server-authenticated Code sign-in
   */
  public async loginWithCodeAsync(
    code: string,
    password?: string,
    selectedRole?: string
  ): Promise<{
    success: boolean;
    user?: UserAccount;
    hasPassword?: boolean;
    mustChangePassword?: boolean;
    passwordSetupRequired?: boolean;
    requirePassword?: boolean;
    message: string;
    errorCode?: string;
  }> {
    const serverResult = await authRepository.loginWithCode(code, password, selectedRole);
    if (!serverResult.success || !serverResult.user) {
      return {
        success: false,
        requirePassword: serverResult.requirePassword,
        message: serverResult.message || 'Mã truy cập không hợp lệ.',
        errorCode: serverResult.errorCode
      };
    }

    const sUser: any = serverResult.user;
    if (sUser.tenantId) {
      tenantService.setActiveTenant(sUser.tenantId, {
        ownerName: sUser.displayName || sUser.fullName || sUser.name,
        ownerEmail: sUser.email,
        ownerPhone: sUser.phone
      });
    }

    const isTeacher = sUser.role === 'TEACHER';
    if (sUser.tenantId) {
      tenantService.setActiveTenant(sUser.tenantId, {
        ownerName: sUser.displayName || sUser.fullName || sUser.name,
        ownerEmail: sUser.email,
        ownerPhone: sUser.phone
      });
      if (isTeacher) {
        tenantService.registerOrUpdateTeacherAccount({
          id: sUser.teacherId || sUser.id,
          tenantId: sUser.tenantId,
          fullName: sUser.displayName || sUser.fullName || sUser.name || 'Giáo viên Chủ nhiệm',
          email: sUser.email || '',
          phone: sUser.phone || '',
          activationToken: code
        });
      }
    }

    const matchedT = isTeacher ? tenantService.getTeacherAccounts().find(a => a.tenantId === sUser.tenantId || a.id === sUser.teacherId) : null;

    let resolvedName = sUser.displayName || sUser.fullName || sUser.name;
    if (!resolvedName || resolvedName === 'Người dùng') {
      if (isTeacher) {
        resolvedName = matchedT?.fullName || tenantService.getTenantById(sUser.tenantId)?.ownerName || 'Giáo viên Chủ nhiệm';
      } else if (sUser.role === 'SUPER_ADMIN') {
        resolvedName = 'Nguyễn Đức Bình (Super Admin)';
      } else if ((sUser.role === 'STUDENT' || sUser.role === 'CLASS_OFFICER') && sUser.studentId) {
        const matched = studentService.getById(sUser.studentId);
        if (matched) {
          resolvedName = matched.fullName;
        }
      } else if (sUser.role === 'PARENT' && sUser.childStudentId) {
        const matchedChild = studentService.getById(sUser.childStudentId);
        if (matchedChild) {
          const pName = matchedChild.parent?.fatherName ? `Bác ${matchedChild.parent.fatherName}` : matchedChild.parent?.motherName ? `Cô ${matchedChild.parent.motherName}` : `Phụ huynh em ${matchedChild.fullName}`;
          resolvedName = `${pName} (PH em ${matchedChild.fullName})`;
        }
      }
    }

    const isParent = sUser.role === 'PARENT';
    const parentDefaultAvatar = demoAccounts.parent.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80';
    const customCodeAvatar = this.getPersistentAvatar({
      id: sUser.id,
      userId: sUser.id,
      role: sUser.role,
      tenantId: sUser.tenantId,
      studentId: isParent ? undefined : sUser.studentId,
      teacherId: sUser.teacherId,
      childStudentId: isParent ? sUser.childStudentId : undefined,
      email: sUser.email
    });

    const defaultRoleAvatar = isParent
      ? parentDefaultAvatar
      : (demoAccounts as any)[sUser.role.toLowerCase()]?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80';

    this.currentUser = {
      id: sUser.id,
      userId: sUser.id,
      teacherId: sUser.teacherId,
      studentId: sUser.studentId,
      childStudentId: sUser.childStudentId,
      officerRoleTitle: sUser.officerRoleTitle,
      name: resolvedName || (sUser.role === 'PARENT' ? 'Phụ huynh' : isTeacher ? 'Giáo viên Chủ nhiệm' : 'Học viên'),
      role: sUser.role as UserRole,
      email: sUser.email || (isTeacher ? (matchedT?.email || tenantService.getTenantById(sUser.tenantId)?.ownerEmail) : undefined),
      phone: sUser.phone || (isTeacher ? (matchedT?.phone || tenantService.getTenantById(sUser.tenantId)?.ownerPhone) : undefined),
      avatar: customCodeAvatar || sUser.avatar || (isTeacher ? ((matchedT as any)?.avatar || defaultRoleAvatar) : defaultRoleAvatar),
      tenantId: sUser.tenantId,
      workspaceId: sUser.tenantId,
      loginMethod: 'ACCESS_CODE',
      token: serverResult.token,
      issuedAt: Date.now(),
      expiresAt: Date.now() + 86400000 * 7,
      permissions: sUser.role === 'CLASS_OFFICER' ? demoAccounts.officer.permissions : undefined,
      isTestCredential: Boolean(sUser.isTestCredential),
      mustChangePassword: Boolean(sUser.mustChangePassword ?? (serverResult as any).mustChangePassword),
      hasPassword: Boolean(sUser.hasPassword ?? serverResult.hasPassword)
    };
    this.currentRole = sUser.role as UserRole;
    safeLocalStorageSet(AUTH_STORAGE_KEY, sUser.role);
    safeLocalStorageSet(SESSION_STORAGE_KEY, JSON.stringify(this.currentUser));
    if (serverResult.token) {
      authRepository.setSessionToken(serverResult.token);
    }
    this.notify();

    return {
      success: true,
      user: this.currentUser,
      hasPassword: serverResult.hasPassword,
      mustChangePassword: Boolean(sUser.mustChangePassword ?? (serverResult as any).mustChangePassword),
      passwordSetupRequired: serverResult.passwordSetupRequired,
      message: `Đăng nhập thành công với vai trò ${sUser.role}!`
    };
  }

  public loginWithCode(
    roleInput?: 'ADMIN' | 'TEACHER' | 'STUDENT' | 'CLASS_OFFICER' | 'PARENT',
    code?: string
  ): { success: boolean; user?: UserAccount; message: string; errorCode?: string } {
    const rawCode = (code || '').trim();
    const cleanCode = rawCode.toUpperCase();
    if (!cleanCode) {
      return { success: false, message: 'Vui lòng nhập mã truy cập.' };
    }

    // 1. Super Admin access code
    const validAdminCodes = ['ADM-MASTER-2025', 'ADMIN-KGCNS', 'ADM-SUPER-2025', 'SUPERADMIN-KGCNS', 'ADMIN-2025', 'ADMIN'];
    if (validAdminCodes.includes(cleanCode)) {
      if (roleInput && roleInput !== 'ADMIN') {
        return {
          success: false,
          errorCode: 'ROLE_MISMATCH',
          message: 'Mã truy cập Admin không thuộc khu vực này. Vui lòng chọn khu vực Quản trị viên.'
        };
      }
      const isDevMode = typeof import.meta !== 'undefined' && import.meta.env ? Boolean(import.meta.env.DEV) : true;
      if (isDevMode) {
        this.currentUser = {
          ...SUPER_ADMIN_ACCOUNT,
          loginMethod: 'ACCESS_CODE',
          issuedAt: Date.now(),
          expiresAt: Date.now() + 86400000 * 7,
          studentId: undefined,
          childStudentId: undefined,
          isTestCredential: true
        };
        this.currentRole = 'SUPER_ADMIN';
        safeLocalStorageSet(AUTH_STORAGE_KEY, 'SUPER_ADMIN');
        safeLocalStorageSet(
          SESSION_STORAGE_KEY,
          JSON.stringify({
            userId: SUPER_ADMIN_ACCOUNT.id,
            role: 'SUPER_ADMIN',
            name: SUPER_ADMIN_ACCOUNT.name,
            avatar: SUPER_ADMIN_ACCOUNT.avatar,
            tenantId: 'platform-root',
            workspaceId: 'platform-root',
            loginMethod: 'ACCESS_CODE',
            isTestCredential: true,
            issuedAt: this.currentUser.issuedAt,
            expiresAt: this.currentUser.expiresAt
          })
        );
        this.ensureValidSession().catch(() => {});
        this.notify();
        return { success: true, user: this.currentUser, message: 'Đăng nhập Quản trị viên Nền tảng (DEV TEST ADMIN) thành công!' };
      } else {
        return {
          success: false,
          message: `Super Admin yêu cầu đăng nhập qua Google Identity xác thực (${SUPER_ADMIN_GOOGLE_EMAIL}). Đăng nhập bằng mã không khả dụng trong môi trường production.`,
          errorCode: 'SUPER_ADMIN_GOOGLE_REQUIRED'
        };
      }
    }

    if (roleInput === 'ADMIN') {
      return { success: false, message: 'Mã truy cập Admin không chính xác. Vui lòng kiểm tra lại.', errorCode: 'INVALID_ADMIN_CODE' };
    }

    // Strict security mandate: All non-admin access code logins REQUIRE password authentication via loginWithCodeAsync
    return {
      success: false,
      errorCode: 'PASSWORD_REQUIRED',
      message: 'Vui lòng nhập mật khẩu. Hình thức đăng nhập này bắt buộc cả Mã truy cập và Mật khẩu.'
    };
  }

  private saveAccounts() {
    safeLocalStorageSet(ACCOUNTS_STORAGE_KEY, JSON.stringify(this.userAccounts));
  }

  public syncUserFromServer(serverUser: any): void {
    if (!serverUser) return;
    const isTeacher = serverUser.role === 'TEACHER';
    if (serverUser.tenantId) {
      tenantService.setActiveTenant(serverUser.tenantId, {
        ownerName: serverUser.displayName || serverUser.fullName || serverUser.name,
        ownerEmail: serverUser.email,
        ownerPhone: serverUser.phone
      });
      if (isTeacher) {
        tenantService.registerOrUpdateTeacherAccount({
          id: serverUser.teacherId || serverUser.id,
          tenantId: serverUser.tenantId,
          fullName: serverUser.displayName || serverUser.fullName || serverUser.name || 'Giáo viên Chủ nhiệm',
          email: serverUser.email || '',
          phone: serverUser.phone || ''
        });
      }
    }

    const resolvedName = serverUser.displayName || serverUser.fullName || serverUser.name || this.currentUser.name;
    const resolvedEmail = serverUser.email || this.currentUser.email;
    const resolvedPhone = serverUser.phone || this.currentUser.phone;

    this.currentUser = {
      ...this.currentUser,
      id: serverUser.id || serverUser.userId || this.currentUser.id,
      userId: serverUser.userId || serverUser.id || this.currentUser.userId,
      role: serverUser.role as UserRole,
      tenantId: serverUser.tenantId || this.currentUser.tenantId,
      workspaceId: serverUser.tenantId || this.currentUser.workspaceId,
      teacherId: serverUser.teacherId || this.currentUser.teacherId,
      studentId: serverUser.studentId || this.currentUser.studentId,
      childStudentId: serverUser.childStudentId || this.currentUser.childStudentId,
      name: resolvedName,
      fullName: resolvedName,
      email: resolvedEmail,
      phone: resolvedPhone,
      avatar: serverUser.avatar || this.currentUser.avatar
    };
    this.currentRole = serverUser.role as UserRole;
    safeLocalStorageSet(AUTH_STORAGE_KEY, serverUser.role);
    safeLocalStorageSet(SESSION_STORAGE_KEY, JSON.stringify(this.currentUser));
    this.notify();
  }

  public getCurrentUser(): UserAccount {
    return this.currentUser;
  }

  public getRole(): UserRole {
    return this.currentUser.role;
  }

  public isSuperAdmin(): boolean {
    return this.currentUser.role === 'SUPER_ADMIN';
  }

  public assertRole(allowedRoles: UserRole[], actionDescription?: string): void {
    if (!allowedRoles.includes(this.currentUser.role)) {
      throw new Error(
        `403 FORBIDDEN: Tài khoản với vai trò [${this.currentUser.role}] không có quyền thực hiện hành động: ${actionDescription || 'Truy cập tài nguyên này'}.`
      );
    }
  }

  public assertPlatformAdmin(actionDescription?: string): void {
    if (this.currentUser.role !== 'SUPER_ADMIN') {
      throw new Error(
        `403 FORBIDDEN: Yêu cầu quyền Quản trị viên Nền tảng (Platform Super Admin). ${actionDescription || ''}`
      );
    }
  }

  public assertTeacher(actionDescription?: string): void {
    if (this.currentUser.role !== 'TEACHER' && this.currentUser.role !== 'SUPER_ADMIN') {
      throw new Error(
        `403 FORBIDDEN: Yêu cầu quyền Giáo viên Chủ nhiệm hoặc Super Admin. ${actionDescription || ''}`
      );
    }
  }

  public assertTenantAccess(targetTenantId: string, actionDescription?: string): void {
    if (this.currentUser.role === 'SUPER_ADMIN') return;
    const userTenant = this.currentUser.tenantId || tenantService.getActiveTenantId();
    if (!tenantService.validateAccess(userTenant, targetTenantId, this.currentUser.role)) {
      throw new Error(
        `403 TENANT ISOLATION ERROR: Tài khoản không có quyền truy cập dữ liệu của không gian ${targetTenantId}. ${actionDescription || ''}`
      );
    }
  }

  public canManageTeachers(): boolean {
    return this.currentUser.role === 'SUPER_ADMIN';
  }

  public canManageClassCodes(): boolean {
    return this.currentUser.role === 'TEACHER' || this.currentUser.role === 'SUPER_ADMIN';
  }

  public switchRole(role: UserRole) {
    this.currentRole = role;
    switch (role) {
      case 'SUPER_ADMIN': {
        const adminAvatar = this.getPersistentAvatar({ userId: SUPER_ADMIN_ACCOUNT.id, role: 'SUPER_ADMIN', email: SUPER_ADMIN_ACCOUNT.email });
        this.currentUser = {
          ...(this.userAccounts.superAdmin || SUPER_ADMIN_ACCOUNT),
          role: 'SUPER_ADMIN',
          avatar: adminAvatar || this.userAccounts.superAdmin?.avatar || SUPER_ADMIN_ACCOUNT.avatar,
          studentId: undefined,
          childStudentId: undefined
        };
        break;
      }
      case 'TEACHER': {
        const teacherAvatar = this.getPersistentAvatar({
          userId: demoAccounts.teacher.id,
          teacherId: 'teacher-lan-nguyen',
          role: 'TEACHER',
          tenantId: 'tenant-lan-nguyen',
          email: demoAccounts.teacher.email
        });
        this.currentUser = {
          ...(this.userAccounts.teacher || demoAccounts.teacher),
          role: 'TEACHER',
          avatar: teacherAvatar || this.userAccounts.teacher?.avatar || demoAccounts.teacher.avatar,
          studentId: undefined,
          childStudentId: undefined
        };
        tenantService.setActiveTenant('tenant-lan-nguyen');
        break;
      }
      case 'CLASS_OFFICER': {
        const officerStudent = studentService.getById('hs-01');
        const officerAvatar = this.getPersistentAvatar({
          userId: demoAccounts.officer.id,
          studentId: 'hs-01',
          role: 'CLASS_OFFICER',
          tenantId: 'tenant-lan-nguyen'
        }) || officerStudent?.avatar;
        this.currentUser = {
          ...(this.userAccounts.officer || demoAccounts.officer),
          role: 'CLASS_OFFICER',
          avatar: officerAvatar || this.userAccounts.officer?.avatar || demoAccounts.officer.avatar,
          studentId: 'hs-01',
          childStudentId: undefined
        };
        tenantService.setActiveTenant('tenant-lan-nguyen');
        break;
      }
      case 'STUDENT': {
        const studentObj = studentService.getById('hs-02');
        const studentAvatar = this.getPersistentAvatar({
          userId: demoAccounts.student.id,
          studentId: 'hs-02',
          role: 'STUDENT',
          tenantId: 'tenant-lan-nguyen'
        }) || studentObj?.avatar;
        this.currentUser = {
          ...(this.userAccounts.student || demoAccounts.student),
          role: 'STUDENT',
          avatar: studentAvatar || this.userAccounts.student?.avatar || demoAccounts.student.avatar,
          studentId: 'hs-02',
          childStudentId: undefined
        };
        tenantService.setActiveTenant('tenant-lan-nguyen');
        break;
      }
      case 'PARENT': {
        const parentAvatar = this.getPersistentAvatar({
          userId: demoAccounts.parent.id,
          childStudentId: 'hs-01',
          role: 'PARENT',
          tenantId: 'tenant-lan-nguyen'
        });
        this.currentUser = {
          ...(this.userAccounts.parent || demoAccounts.parent),
          role: 'PARENT',
          avatar: parentAvatar || this.userAccounts.parent?.avatar || demoAccounts.parent.avatar,
          studentId: undefined,
          childStudentId: 'hs-01'
        };
        tenantService.setActiveTenant('tenant-lan-nguyen');
        break;
      }
    }
    safeLocalStorageSet(AUTH_STORAGE_KEY, role);
    this.notify();
  }

  public switchToTeacher2() {
    this.currentRole = 'TEACHER';
    const teacher2Avatar = this.getPersistentAvatar({
      userId: TEACHER_2_ACCOUNT.id,
      teacherId: 'teacher-hoang-nam',
      role: 'TEACHER',
      tenantId: 'tenant-hoang-nam',
      email: TEACHER_2_ACCOUNT.email
    });
    this.currentUser = {
      ...(this.userAccounts.teacher2 || TEACHER_2_ACCOUNT),
      role: 'TEACHER',
      avatar: teacher2Avatar || this.userAccounts.teacher2?.avatar || TEACHER_2_ACCOUNT.avatar,
      studentId: undefined,
      childStudentId: undefined
    };
    tenantService.setActiveTenant('tenant-hoang-nam');
    safeLocalStorageSet(AUTH_STORAGE_KEY, 'TEACHER');
    this.notify();
  }

  public async updateCurrentUserAvatar(newAvatarUrl: string): Promise<{ success: boolean; message: string; avatar?: string }> {
    if (!newAvatarUrl || typeof newAvatarUrl !== 'string' || !newAvatarUrl.trim()) {
      return { success: false, message: 'Dữ liệu ảnh đại diện không hợp lệ.' };
    }

    if (newAvatarUrl.startsWith('blob:')) {
      return { success: false, message: 'Không thể lưu địa chỉ ảnh tạm thời (blob URL).' };
    }

    // Persist to backend SQLite database first
    const res = await authRepository.updateAvatar({
      avatar: newAvatarUrl,
      userId: this.currentUser.userId || this.currentUser.id,
      role: this.currentUser.role,
      tenantId: this.currentUser.tenantId,
      studentId: this.currentUser.studentId,
      teacherId: this.currentUser.teacherId,
      childStudentId: this.currentUser.childStudentId,
      email: this.currentUser.email
    });

    if (!res.success) {
      return {
        success: false,
        message: res.message || 'Lỗi khi lưu ảnh đại diện lên máy chủ.'
      };
    }

    // Server confirmed save -> Now update in-memory state & local caches
    this.currentUser.avatar = newAvatarUrl;
    
    let roleKey = this.currentUser.role === 'SUPER_ADMIN' ? 'superAdmin' :
                  this.currentUser.role === 'CLASS_OFFICER' ? 'officer' :
                  this.currentUser.role === 'STUDENT' ? 'student' : 'parent';
    
    if (this.currentUser.role === 'TEACHER') {
      const isNam = this.currentUser.tenantId === 'tenant-hoang-nam';
      roleKey = isNam ? 'teacher2' : 'teacher';
    }
    
    this.userAccounts[roleKey] = { ...this.currentUser };
    this.saveAccounts();

    // Save to persistent custom avatar map across logins and reloads
    try {
      const mapStr = safeLocalStorageGet(CUSTOM_AVATARS_STORAGE_KEY) || '{}';
      const map = JSON.parse(mapStr);
      if (this.currentUser.role === 'PARENT') {
        if (this.currentUser.id) map[`user_${this.currentUser.id}`] = newAvatarUrl;
        if (this.currentUser.userId) map[`user_${this.currentUser.userId}`] = newAvatarUrl;
        if (this.currentUser.childStudentId) {
          map[`parent_${this.currentUser.childStudentId}`] = newAvatarUrl;
          map[`parent_child_${this.currentUser.childStudentId}`] = newAvatarUrl;
        }
        if (this.currentUser.email) map[`email_${this.currentUser.email.toLowerCase().trim()}`] = newAvatarUrl;
        if (this.currentUser.tenantId && this.currentUser.childStudentId) {
          map[`role_PARENT_${this.currentUser.tenantId}_${this.currentUser.childStudentId}`] = newAvatarUrl;
        }
      } else {
        if (this.currentUser.id) map[`user_${this.currentUser.id}`] = newAvatarUrl;
        if (this.currentUser.userId) map[`user_${this.currentUser.userId}`] = newAvatarUrl;
        if (this.currentUser.studentId) map[`student_${this.currentUser.studentId}`] = newAvatarUrl;
        if (this.currentUser.teacherId) map[`teacher_${this.currentUser.teacherId}`] = newAvatarUrl;
        if (this.currentUser.email) map[`email_${this.currentUser.email.toLowerCase().trim()}`] = newAvatarUrl;
        if (this.currentUser.role === 'SUPER_ADMIN') {
          map['role_SUPER_ADMIN'] = newAvatarUrl;
        }
      }
      safeLocalStorageSet(CUSTOM_AVATARS_STORAGE_KEY, JSON.stringify(map));
    } catch {
      // ignore
    }

    // Also update persistent session in localStorage
    try {
      const sessionStr = safeLocalStorageGet(SESSION_STORAGE_KEY);
      if (sessionStr) {
        const sess = JSON.parse(sessionStr);
        sess.avatar = newAvatarUrl;
        safeLocalStorageSet(SESSION_STORAGE_KEY, JSON.stringify(sess));
      }
    } catch {
      // ignore
    }

    // Determine target studentId ONLY for STUDENT / CLASS_OFFICER (never for PARENT)
    if (this.currentUser.role === 'STUDENT' || this.currentUser.role === 'CLASS_OFFICER') {
      const targetStudentId = this.currentUser.studentId || 
        (this.currentUser.role === 'CLASS_OFFICER' ? 'hs-01' : 
         (this.currentUser.id?.startsWith('hs-') ? this.currentUser.id : undefined));

      if (targetStudentId) {
        try {
          studentService.updateStudent(targetStudentId, { avatar: newAvatarUrl });
        } catch {
          // ignore
        }
      }
    }

    this.notify();
    return {
      success: true,
      message: 'Cập nhật ảnh đại diện thành công!',
      avatar: newAvatarUrl
    };
  }

  public async resetCurrentUserAvatar(): Promise<{ success: boolean; message: string; avatar?: string }> {
    let roleKey = this.currentUser.role === 'SUPER_ADMIN' ? 'superAdmin' :
                  this.currentUser.role === 'CLASS_OFFICER' ? 'officer' :
                  this.currentUser.role === 'STUDENT' ? 'student' : 'parent';
    if (this.currentUser.role === 'TEACHER') {
      const isNam = this.currentUser.tenantId === 'tenant-hoang-nam';
      roleKey = isNam ? 'teacher2' : 'teacher';
    }
    const defaultAvatar = (demoAccounts as any)[roleKey]?.avatar || 
      (roleKey === 'parent' ? (demoAccounts.parent.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80') :
       roleKey === 'teacher2' ? TEACHER_2_ACCOUNT.avatar : 
       'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80');
    return await this.updateCurrentUserAvatar(defaultAvatar);
  }

  public updateCurrentUserProfile(name: string, phone?: string, email?: string) {
    this.currentUser.name = name;
    if (phone) this.currentUser.phone = phone;
    if (email) this.currentUser.email = email;

    let roleKey = this.currentUser.role === 'SUPER_ADMIN' ? 'superAdmin' :
                  this.currentUser.role === 'CLASS_OFFICER' ? 'officer' :
                  this.currentUser.role === 'STUDENT' ? 'student' : 'parent';
    if (this.currentUser.role === 'TEACHER') {
      const isNam = this.currentUser.tenantId === 'tenant-hoang-nam';
      roleKey = isNam ? 'teacher2' : 'teacher';
    }
    this.userAccounts[roleKey] = { ...this.currentUser };
    this.saveAccounts();

    try {
      const sessionStr = safeLocalStorageGet(SESSION_STORAGE_KEY);
      if (sessionStr) {
        const sess = JSON.parse(sessionStr);
        sess.name = this.currentUser.name;
        if (phone) sess.phone = phone;
        if (email) sess.email = email;
        safeLocalStorageSet(SESSION_STORAGE_KEY, JSON.stringify(sess));
      }
    } catch {
      // ignore
    }

    this.notify();
  }

  public updateOfficerPermissions(perms: OfficerPermissions) {
    if (this.userAccounts.officer) {
      this.userAccounts.officer.permissions = perms;
    }
    if (this.currentUser.role === 'CLASS_OFFICER') {
      this.currentUser.permissions = perms;
    }
    this.saveAccounts();
    this.notify();
  }

  public hasPermission(permission: keyof OfficerPermissions): boolean {
    if (this.currentUser.role === 'SUPER_ADMIN' || this.currentUser.role === 'TEACHER') return true;
    if (this.currentUser.role === 'CLASS_OFFICER') {
      return !!this.currentUser.permissions?.[permission];
    }
    return false;
  }

  public canAccessParentBridge(): boolean {
    return this.currentUser.role === 'TEACHER' || this.currentUser.role === 'PARENT';
  }

  public canManageStudents(): boolean {
    return this.currentUser.role === 'TEACHER' || this.currentUser.role === 'SUPER_ADMIN';
  }

  public canManageTimetable(): boolean {
    return this.currentUser.role === 'TEACHER' || this.currentUser.role === 'SUPER_ADMIN';
  }

  public canAccessSettings(): boolean {
    return this.currentUser.role === 'TEACHER' || this.currentUser.role === 'SUPER_ADMIN';
  }

  public canAccessReports(): boolean {
    return this.currentUser.role === 'TEACHER' || this.currentUser.role === 'SUPER_ADMIN';
  }

  public canApproveSubmissions(): boolean {
    return this.currentUser.role === 'TEACHER' || this.currentUser.role === 'SUPER_ADMIN';
  }

  public canManageAssignments(): boolean {
    if (this.currentUser.role === 'TEACHER' || this.currentUser.role === 'SUPER_ADMIN') return true;
    if (this.currentUser.role === 'CLASS_OFFICER') {
      return !!this.currentUser.permissions?.manageAssignments;
    }
    return false;
  }

  public canSubmitQuickReport(): boolean {
    if (this.currentUser.role === 'TEACHER' || this.currentUser.role === 'SUPER_ADMIN') return true;
    if (this.currentUser.role === 'CLASS_OFFICER') {
      return this.currentUser.permissions?.quickReport !== false;
    }
    if (this.currentUser.role === 'STUDENT') return true;
    return false;
  }

  public canPublishClassPost(): boolean {
    if (this.currentUser.role === 'TEACHER' || this.currentUser.role === 'SUPER_ADMIN') return true;
    if (this.currentUser.role === 'CLASS_OFFICER') {
      return !!this.currentUser.permissions?.publishPosts;
    }
    return false;
  }

  public canPublishAlbumPost(): boolean {
    if (this.currentUser.role === 'TEACHER' || this.currentUser.role === 'SUPER_ADMIN') return true;
    if (this.currentUser.role === 'CLASS_OFFICER') {
      return !!this.currentUser.permissions?.publishAlbum;
    }
    return false;
  }

  public setCurrentUser(user: UserAccount): void {
    this.currentUser = { ...user };
    if (user.role) {
      this.currentRole = user.role;
      safeLocalStorageSet(AUTH_STORAGE_KEY, user.role);
    }
    safeLocalStorageSet(SESSION_STORAGE_KEY, JSON.stringify(this.currentUser));
    this.notify();
  }

  public subscribe(callback: (user: UserAccount) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notify() {
    this.listeners.forEach(l => l(this.currentUser));
    try {
      if (typeof studentService?.fetchFromServer === 'function') {
        const role = this.currentUser.role;
        if (role === 'TEACHER' || role === 'SUPER_ADMIN') {
          studentService.fetchFromServer();
        }
      }
    } catch {
      // ignore
    }
  }

  public verifyActivationToken(token: string): { success: boolean; role?: UserRole; studentId?: string; message: string } {
    const cleanToken = token.trim().toUpperCase();
    if (cleanToken.startsWith('STU-')) {
      return { success: true, role: 'STUDENT', studentId: 'hs-02', message: 'Kích hoạt tài khoản Học sinh thành công!' };
    }
    if (cleanToken.startsWith('PAR-')) {
      return { success: true, role: 'PARENT', studentId: 'hs-01', message: 'Kích hoạt tài khoản Phụ huynh thành công!' };
    }
    if (cleanToken.startsWith('ACT-')) {
      return { success: true, role: 'TEACHER', message: 'Kích hoạt tài khoản Giáo viên chủ nhiệm thành công!' };
    }
    return { success: false, message: 'Mã kích hoạt không hợp lệ hoặc đã hết hạn.' };
  }

  // ==========================================
  // SUPER ADMIN AUTHENTICATION METHODS
  // ==========================================

  /**
   * Super Admin Password Login (supports Login ID 'admin' or Admin Email)
   */
  public async loginSuperAdminWithPasswordAsync(
    identifier: string,
    passwordPlain: string,
    recoveryCode?: string,
    rememberDevice: boolean = true
  ): Promise<{ success: boolean; user?: UserAccount; message: string; errorCode?: string; firstTimeSetupRequired?: boolean }> {
    const cleanId = (identifier || 'admin').trim();
    const cleanPass = (passwordPlain || '').trim();
    const cleanRecovery = (recoveryCode || '').trim();
    const targetEmail = cleanId.includes('@') ? cleanId.toLowerCase() : SUPER_ADMIN_GOOGLE_EMAIL;

    let firebaseUid: string | undefined = undefined;
    let firebaseIdToken: string | undefined = undefined;

    // 1. Try Firebase Authentication email/password sign-in first if applicable
    try {
      const userCred = await signInWithEmailAndPassword(firebaseAuth, targetEmail, cleanPass);
      if (userCred?.user) {
        firebaseUid = userCred.user.uid;
        firebaseIdToken = await userCred.user.getIdToken();
      }
    } catch {
      // Firebase auth error (e.g. wrong password or operation not allowed) - fall back to backend verification
    }

    const serverRes = await authRepository.loginSuperAdminWithPassword(
      cleanId,
      cleanPass,
      cleanRecovery,
      rememberDevice,
      firebaseUid,
      firebaseIdToken
    );

    if (!serverRes.success || !serverRes.user) {
      return {
        success: false,
        errorCode: serverRes.errorCode || 'INVALID_CREDENTIALS',
        firstTimeSetupRequired: serverRes.firstTimeSetupRequired,
        message: serverRes.message || 'Thông tin đăng nhập không hợp lệ.'
      };
    }

    const sUser = serverRes.user;
    if (sUser.role !== 'SUPER_ADMIN') {
      return {
        success: false,
        errorCode: 'FORBIDDEN_NOT_ADMIN',
        message: 'TỪ CHỐI QUYỀN ADMIN: Tài khoản không có quyền Quản trị viên hệ thống.'
      };
    }

    this.currentUser = {
      id: sUser.id || 'usr-super-admin',
      userId: sUser.id || 'usr-super-admin',
      name: sUser.fullName || sUser.displayName || 'Ban Quản trị Hệ thống Không Gian Chủ Nhiệm Số',
      role: 'SUPER_ADMIN',
      avatar: sUser.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80',
      email: sUser.email || cleanId,
      phone: '0900 000 999',
      tenantId: 'platform-root',
      workspaceId: 'platform-root',
      loginMethod: 'ACCESS_CODE',
      token: serverRes.token,
      hasPassword: true,
      issuedAt: Date.now(),
      expiresAt: Date.now() + (rememberDevice ? 86400000 * 30 : 86400000 * 7),
      isTestCredential: false
    };

    this.currentRole = 'SUPER_ADMIN';
    safeLocalStorageSet(AUTH_STORAGE_KEY, 'SUPER_ADMIN');
    safeLocalStorageSet(
      SESSION_STORAGE_KEY,
      JSON.stringify({
        userId: this.currentUser.userId,
        role: 'SUPER_ADMIN',
        name: this.currentUser.name,
        email: this.currentUser.email,
        avatar: this.currentUser.avatar,
        tenantId: 'platform-root',
        workspaceId: 'platform-root',
        token: serverRes.token,
        hasPassword: true,
        issuedAt: this.currentUser.issuedAt,
        expiresAt: this.currentUser.expiresAt
      })
    );
    this.notify();

    return {
      success: true,
      user: this.currentUser,
      message: 'Đăng nhập Quản trị viên thành công!'
    };
  }

  /**
   * Official Password Reset via Server SMTP or Firebase Authentication with truthful delivery status
   */
  public async sendAdminPasswordResetEmail(emailOrIdentifier: string): Promise<{
    success: boolean;
    message: string;
    errorCode?: string;
  }> {
    const cleanId = (emailOrIdentifier || '').trim();
    if (!cleanId) {
      return { success: false, errorCode: 'EMPTY_IDENTIFIER', message: 'Vui lòng nhập Tên đăng nhập hoặc Email Quản trị viên.' };
    }

    // 1. Try Backend SMTP Mailer
    try {
      const serverRes = await authRepository.requestAdminPasswordReset(cleanId);
      if (serverRes.success) {
        return {
          success: true,
          message: serverRes.message || 'Mã xác thực 6 chữ số đã được gửi tới email của bạn. Vui lòng kiểm tra hộp thư đến.'
        };
      }
    } catch (e) {
      console.warn('[AuthService] Server reset email request failed:', e);
    }

    // 2. If it's a valid email, try Firebase Authentication Password Reset as fallback
    if (cleanId.includes('@')) {
      try {
        await sendPasswordResetEmail(firebaseAuth, cleanId.toLowerCase());
        return {
          success: true,
          message: `Liên kết đặt lại mật khẩu đã được gửi đến ${cleanId}. Vui lòng kiểm tra hộp thư đến (và mục Spam) để tạo mật khẩu mới.`
        };
      } catch (err: any) {
        console.warn('[AuthService] Firebase sendPasswordResetEmail error:', err);
      }
    }

    // 3. Truthful response: Neither SMTP nor Firebase was able to deliver email
    return {
      success: false,
      errorCode: 'EMAIL_UNAVAILABLE',
      message: 'Không thể gửi email khôi phục (dịch vụ email chưa được cấu hình hoặc email chưa liên kết). Vui lòng chuyển sang tab "Mã Recovery Code" để đặt lại mật khẩu ngay lập tức.'
    };
  }

  public async changeSuperAdminPasswordAsync(
    oldPassword: string,
    newPassword: string,
    revokeOtherSessions: boolean = false,
    isGoogleAuthVerified: boolean = false
  ) {
    const res = await authRepository.changeSuperAdminPassword(oldPassword, newPassword, revokeOtherSessions, isGoogleAuthVerified);
    if (res.success && res.token && this.currentUser) {
      this.currentUser.token = res.token;
      safeLocalStorageSet(SESSION_STORAGE_KEY, JSON.stringify(this.currentUser));
      this.notify();
    }
    return res;
  }

  public async verifyAdminRecoveryCodeAsync(identifier: string, recoveryCode: string) {
    return await authRepository.verifyAdminRecoveryCode(identifier, recoveryCode);
  }

  public async setAdminRecoveryCodeAsync(
    currentPassword: string,
    newRecoveryCode: string,
    confirmRecoveryCode: string,
    isGoogleAuthVerified: boolean = false
  ) {
    return await authRepository.setAdminRecoveryCode(currentPassword, newRecoveryCode, confirmRecoveryCode, isGoogleAuthVerified);
  }

  public async generateAdminRecoveryCodeAsync(currentPassword: string, isGoogleAuthVerified: boolean = false) {
    return await authRepository.generateAdminRecoveryCode(currentPassword, isGoogleAuthVerified);
  }

  public async recoverAdminPasswordAsync(loginId: string, recoveryCode: string, newPassword: string, confirmPassword?: string) {
    return await authRepository.recoverSuperAdminPassword(loginId, recoveryCode, newPassword, confirmPassword);
  }

  public async revokeAllAdminSessionsAsync() {
    const res = await authRepository.revokeAllAdminSessions();
    if (res.success && res.token && this.currentUser) {
      this.currentUser.token = res.token;
      safeLocalStorageSet(SESSION_STORAGE_KEY, JSON.stringify(this.currentUser));
      this.notify();
    }
    return res;
  }

  public async requestAdminPasswordResetAsync(email: string) {
    return await authRepository.requestAdminPasswordReset(email);
  }

  public async resetAdminPasswordAsync(email: string, token: string, newPassword: string) {
    return await authRepository.resetAdminPassword(email, token, newPassword);
  }

  public async updateAdminRecoveryEmailAsync(recoveryEmail: string) {
    return await authRepository.updateAdminRecoveryEmail(recoveryEmail);
  }

  public async fetchAdminProfileAsync() {
    return await authRepository.fetchAdminProfile();
  }

  public async setupFirstTimeAdminPasswordAsync(identifier: string, newPassword: string, setupCode?: string) {
    return await authRepository.setupFirstTimeAdminPassword(identifier, newPassword, setupCode);
  }

  public async checkAdminStatusAsync(identifier?: string) {
    return await authRepository.checkAdminAccountStatus(identifier);
  }

  public async checkAdminAccountStatus(identifier?: string) {
    return await this.checkAdminStatusAsync(identifier);
  }
}

export const authService = new AuthService();
