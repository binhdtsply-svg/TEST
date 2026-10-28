/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { safeLocalStorageGet, safeLocalStorageSet, safeLocalStorageRemove } from '../utils/storageUtils';

export interface ServerAuthResponse {
  success: boolean;
  token?: string;
  hasPassword?: boolean;
  mustChangePassword?: boolean;
  passwordSetupRequired?: boolean;
  firstTimeSetupRequired?: boolean;
  requirePassword?: boolean;
  user?: {
    id: string;
    role: 'SUPER_ADMIN' | 'TEACHER' | 'CLASS_OFFICER' | 'STUDENT' | 'PARENT';
    tenantId: string;
    teacherId?: string;
    studentId?: string;
    childStudentId?: string;
    officerRoleTitle?: string;
    fullName?: string;
    email?: string;
    displayName?: string;
    avatar?: string;
    isTestCredential?: boolean;
    mustChangePassword?: boolean;
    hasPassword?: boolean;
  };
  errorCode?: string;
  message?: string;
}

export interface ServerCredentialItem {
  id: string;
  type: 'TEACHER' | 'STUDENT' | 'PARENT';
  tenantId: string;
  ownerId: string;
  status: 'ACTIVE' | 'LOCKED' | 'REVOKED';
  credentialVersion: number;
  isOfficer: boolean;
  officerRoleTitle?: string | null;
  hasPassword: boolean;
  initialPassword?: string | null;
  passwordUpdatedAt?: string | null;
  lastIssuedAt?: string | null;
  createdAt: string;
  createdBy?: string | null;
  lastLoginAt?: string | null;
  lockedAt?: string | null;
  lockedBy?: string | null;
}

export interface ServerCredentialAudit {
  id: string;
  credential_id?: string | null;
  tenant_id: string;
  owner_id: string;
  role: string;
  action: string;
  actor_user_id: string;
  actor_role?: string | null;
  credential_version: number;
  reason?: string | null;
  created_at: string;
}

export class AuthRepository {
  private static instance: AuthRepository;
  private sessionToken: string | null = null;

  private constructor() {
    this.sessionToken = safeLocalStorageGet('kgcns_server_session_token');
  }

  public static getInstance(): AuthRepository {
    if (!AuthRepository.instance) {
      AuthRepository.instance = new AuthRepository();
    }
    return AuthRepository.instance;
  }

  public getSessionToken(): string | null {
    return (
      this.sessionToken ||
      safeLocalStorageGet('kgcns_server_session_token') ||
      safeLocalStorageGet('kgcns_auth_token') ||
      safeLocalStorageGet('kgcns_session_token') ||
      null
    );
  }

  public setSessionToken(token: string | null) {
    this.sessionToken = token;
    if (token) {
      safeLocalStorageSet('kgcns_server_session_token', token);
      safeLocalStorageSet('kgcns_auth_token', token);
      safeLocalStorageSet('kgcns_session_token', token);
      if (typeof document !== 'undefined') {
        document.cookie = `kgcns_session=${encodeURIComponent(token)}; path=/; max-age=604800; SameSite=Lax`;
      }
    } else {
      safeLocalStorageRemove('kgcns_server_session_token');
      safeLocalStorageRemove('kgcns_auth_token');
      safeLocalStorageRemove('kgcns_session_token');
      if (typeof document !== 'undefined') {
        document.cookie = 'kgcns_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
      }
    }
  }

  public async syncSession(userInfo: {
    role?: string;
    tenantId?: string;
    userId?: string;
    teacherId?: string;
    studentId?: string;
    childStudentId?: string;
    email?: string;
    token?: string;
  }): Promise<{ success: boolean; token?: string; user?: any; message?: string }> {
    try {
      const currentToken = this.getSessionToken();
      const response = await fetch('/api/v1/auth/sync-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {})
        },
        body: JSON.stringify({
          ...userInfo,
          token: currentToken || userInfo.token
        })
      });
      const data = await response.json();
      if (data.success && data.token) {
        this.setSessionToken(data.token);
      }
      return data;
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Không thể đồng bộ phiên làm việc với máy chủ.'
      };
    }
  }

  public async loginWithCode(code: string, password?: string, selectedRole?: string): Promise<ServerAuthResponse> {
    try {
      const response = await fetch('/api/v1/auth/login-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, password, selectedRole })
      });

      const data = await response.json();
      if (data.success && data.token) {
        this.setSessionToken(data.token);
      }
      return data;
    } catch (err: any) {
      return {
        success: false,
        errorCode: 'NETWORK_ERROR',
        message: err?.message || 'Không thể kết nối đến máy chủ xác thực.'
      };
    }
  }

  public async loginWithGoogle(
    email: string,
    sub?: string,
    name?: string,
    avatar?: string,
    accessToken?: string,
    idToken?: string,
    selectedRole?: string
  ): Promise<ServerAuthResponse> {
    try {
      const response = await fetch('/api/v1/auth/google-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, sub, name, avatar, accessToken, idToken, selectedRole })
      });

      const data = await response.json();
      if (data.success && data.token) {
        this.setSessionToken(data.token);
      }
      return data;
    } catch (err: any) {
      return {
        success: false,
        errorCode: 'NETWORK_ERROR',
        message: err?.message || 'Không thể kết nối đến máy chủ xác thực.'
      };
    }
  }

  public async verifySession(): Promise<ServerAuthResponse> {
    const token = this.getSessionToken();
    if (!token) {
      return { success: false, errorCode: 'AUTH_REQUIRED' };
    }

    try {
      const response = await fetch('/api/v1/auth/session', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await this.safeParseResponse<ServerAuthResponse>(response, 'Phiên làm việc không hợp lệ.');
      // CRITICAL SECURITY & STABILITY MANDATE:
      // Only delete session token if server EXPLICITLY rejects credentials (401 or 403).
      // If server returned 5xx (500, 502, 503, 504 during container restart) or temporary issue, NEVER delete the token!
      if (response.status === 401 || response.status === 403) {
        this.setSessionToken(null);
      }
      return data;
    } catch (err: any) {
      // Temporary network error or container restart: NEVER delete token, preserve user session!
      return {
        success: false,
        errorCode: 'NETWORK_ERROR',
        message: err?.message || 'Lỗi kiểm tra phiên máy chủ.'
      };
    }
  }

  public async verifyRouteAccess(route: string): Promise<{
    allowed: boolean;
    role?: string;
    errorCode?: string;
    message?: string;
  }> {
    const token = this.getSessionToken();
    if (!token) {
      return { allowed: false, errorCode: 'AUTH_REQUIRED', message: 'Chưa đăng nhập' };
    }

    try {
      const response = await fetch(`/api/v1/auth/verify-route-access?route=${encodeURIComponent(route)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await this.safeParseResponse<{ allowed: boolean; role?: string; errorCode?: string; message?: string }>(
        response,
        'Không thể xác thực quyền truy cập đường dẫn.'
      );
      return {
        allowed: Boolean(data.allowed),
        role: data.role,
        errorCode: data.errorCode,
        message: data.message
      };
    } catch {
      // Fallback check session
      const sessionRes = await this.verifySession();
      if (!sessionRes.success || !sessionRes.user) {
        return { allowed: false, errorCode: 'AUTH_REQUIRED' };
      }
      const role = sessionRes.user.role;
      if (route.includes('quan-tri') || route.includes('admin')) {
        return {
          allowed: role === 'SUPER_ADMIN',
          role,
          errorCode: role === 'SUPER_ADMIN' ? undefined : 'ROLE_ACCESS_DENIED'
        };
      }
      if (route.includes('app')) {
        const isUserRole = ['TEACHER', 'STUDENT', 'PARENT', 'CLASS_OFFICER', 'SUPER_ADMIN'].includes(role);
        return {
          allowed: isUserRole,
          role,
          errorCode: isUserRole ? undefined : 'ROLE_ACCESS_DENIED'
        };
      }
      return { allowed: true, role };
    }
  }

  public async logout(): Promise<void> {
    const token = this.getSessionToken();
    if (token) {
      try {
        await fetch('/api/v1/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch {
        // ignore network error on logout
      }
    }
    this.setSessionToken(null);
  }

  public async fetchCredentials(): Promise<{ success: boolean; credentials?: ServerCredentialItem[]; message?: string }> {
    const token = this.getSessionToken();
    try {
      const response = await fetch('/api/v1/credentials', {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      return await response.json();
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Không thể tải danh sách mã từ máy chủ.'
      };
    }
  }

  public async fetchCredentialHistory(ownerId?: string): Promise<{ success: boolean; history?: ServerCredentialAudit[]; message?: string }> {
    const token = this.getSessionToken();
    try {
      const url = ownerId ? `/api/v1/credentials/history?ownerId=${encodeURIComponent(ownerId)}` : '/api/v1/credentials/history';
      const response = await fetch(url, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      return await response.json();
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Không thể tải lịch sử cấp mã.'
      };
    }
  }

  public async toggleCredentialLock(params: {
    tenantId: string;
    ownerId: string;
    type: 'STUDENT' | 'PARENT' | 'TEACHER';
    status: 'ACTIVE' | 'LOCKED' | 'REVOKED';
    reason?: string;
  }): Promise<{ success: boolean; message?: string; errorCode?: string }> {
    const token = this.getSessionToken();
    try {
      const response = await fetch('/api/v1/credentials/toggle-lock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(params)
      });
      return await response.json();
    } catch (err: any) {
      return {
        success: false,
        errorCode: 'NETWORK_ERROR',
        message: err?.message || 'Lỗi mạng khi cập nhật trạng thái mã truy cập.'
      };
    }
  }

  public async regenerateCredential(params: {
    tenantId: string;
    ownerId: string;
    type: 'STUDENT' | 'PARENT';
    newRawCode: string;
    isOfficer?: boolean;
    officerRoleTitle?: string;
    reason?: string;
  }): Promise<{ success: boolean; credentialVersion?: number; message?: string; errorCode?: string }> {
    const token = this.getSessionToken();
    try {
      const response = await fetch('/api/v1/credentials/regenerate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(params)
      });
      return await response.json();
    } catch (err: any) {
      return {
        success: false,
        errorCode: 'NETWORK_ERROR',
        message: err?.message || 'Lỗi mạng khi tạo mã mới.'
      };
    }
  }

  public async batchSaveCredentials(params: {
    tenantId: string;
    items: Array<{
      ownerId: string;
      type: 'STUDENT' | 'PARENT';
      rawCode: string;
      isOfficer?: boolean;
      officerRoleTitle?: string;
    }>;
    reason?: string;
  }): Promise<{ success: boolean; count?: number; message?: string; errorCode?: string }> {
    const token = this.getSessionToken();
    try {
      const response = await fetch('/api/v1/credentials/batch-save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(params)
      });
      return await response.json();
    } catch (err: any) {
      return {
        success: false,
        errorCode: 'NETWORK_ERROR',
        message: err?.message || 'Lỗi mạng khi lưu danh sách mã mới.'
      };
    }
  }

  public async resetCredentialPassword(params: {
    tenantId: string;
    ownerId: string;
    type: 'STUDENT' | 'PARENT';
  }): Promise<{ success: boolean; message?: string; errorCode?: string }> {
    const token = this.getSessionToken();
    try {
      const response = await fetch('/api/v1/credentials/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(params)
      });
      return await response.json();
    } catch (err: any) {
      return {
        success: false,
        errorCode: 'NETWORK_ERROR',
        message: err?.message || 'Lỗi mạng khi đặt lại mật khẩu.'
      };
    }
  }

  public async setPasswordByTeacher(params: {
    tenantId: string;
    ownerId: string;
    type: 'STUDENT' | 'PARENT';
    newPassword: string;
  }): Promise<{ success: boolean; message?: string; errorCode?: string }> {
    const token = this.getSessionToken();
    try {
      const response = await fetch('/api/v1/credentials/set-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(params)
      });
      return await response.json();
    } catch (err: any) {
      return {
        success: false,
        errorCode: 'NETWORK_ERROR',
        message: err?.message || 'Lỗi mạng khi cấp mật khẩu.'
      };
    }
  }

  public async batchGrantPasswords(params: {
    tenantId: string;
    targetType?: 'ALL' | 'STUDENT' | 'PARENT';
    targetStudentIds?: string[];
    customPassword?: string;
    reason?: string;
  }): Promise<{
    success: boolean;
    count?: number;
    totalProcessed?: number;
    successCount?: number;
    failCount?: number;
    failures?: Array<{ studentId: string; studentName?: string; reason: string }>;
    generatedList?: Array<{
      studentId: string;
      studentName: string;
      studentCode: string;
      type: 'STUDENT' | 'PARENT';
      loginCode: string;
      newPasswordPlain: string;
    }>;
    message?: string;
    errorCode?: string;
  }> {
    const token = this.getSessionToken();
    try {
      const response = await fetch('/api/v1/credentials/batch-grant-passwords', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(params)
      });
      return await response.json();
    } catch (err: any) {
      return {
        success: false,
        errorCode: 'NETWORK_ERROR',
        message: err?.message || 'Lỗi mạng khi cấp mật khẩu hàng loạt.'
      };
    }
  }

  public async setupPassword(newPassword: string): Promise<{ success: boolean; message?: string; errorCode?: string }> {
    const token = this.getSessionToken();
    try {
      const response = await fetch('/api/v1/auth/password/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ newPassword })
      });
      return await response.json();
    } catch (err: any) {
      return {
        success: false,
        errorCode: 'NETWORK_ERROR',
        message: err?.message || 'Lỗi kết nối khi thiết lập mật khẩu.'
      };
    }
  }

  public async changePassword(oldPassword: string, newPassword: string): Promise<{ success: boolean; message?: string; errorCode?: string }> {
    const token = this.getSessionToken();
    try {
      const response = await fetch('/api/v1/auth/password/change', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ oldPassword, newPassword })
      });
      return await response.json();
    } catch (err: any) {
      return {
        success: false,
        errorCode: 'NETWORK_ERROR',
        message: err?.message || 'Lỗi kết nối khi đổi mật khẩu.'
      };
    }
  }

  // ==========================================
  // SUPER ADMIN CLIENT AUTHENTICATION METHODS
  // ==========================================

  /**
   * Robust response parser ensuring Content-Type is JSON, body is non-empty,
   * and never letting non-JSON HTML fallback or unhandled SyntaxErrors crash the client.
   */
  public async safeParseResponse<T extends { success?: boolean; message?: string; errorCode?: string }>(
    response: Response,
    defaultErrorMessage: string = 'Máy chủ phản hồi định dạng không hợp lệ.'
  ): Promise<T> {
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      await response.text().catch(() => '');
      return {
        success: false,
        errorCode: response.status === 403 ? 'FORBIDDEN_NOT_ADMIN' : (response.status === 401 ? 'UNAUTHORIZED' : 'INVALID_SERVER_RESPONSE'),
        message: response.status === 403
          ? 'TỪ CHỐI QUYỀN ADMIN: Tài khoản không có quyền Quản trị viên.'
          : defaultErrorMessage
      } as T;
    }

    const text = await response.text();
    if (!text || !text.trim()) {
      return {
        success: false,
        errorCode: 'EMPTY_RESPONSE',
        message: 'Máy chủ phản hồi rỗng.'
      } as T;
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      return {
        success: false,
        errorCode: 'JSON_PARSE_ERROR',
        message: 'Không thể phân tích dữ liệu phản hồi từ máy chủ.'
      } as T;
    }
  }

  public async loginSuperAdminWithPassword(
    identifier: string,
    password: string,
    recoveryCode?: string,
    rememberDevice: boolean = true,
    firebaseUid?: string,
    firebaseIdToken?: string
  ): Promise<ServerAuthResponse> {
    try {
      const response = await fetch('/api/v1/auth/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loginId: identifier || 'admin',
          password,
          recoveryCode,
          rememberDevice,
          firebaseUid,
          firebaseIdToken
        })
      });

      const data = await this.safeParseResponse<ServerAuthResponse>(
        response,
        'Máy chủ xác thực không phản hồi định dạng JSON hợp lệ.'
      );

      // CRITICAL: Ensure business payload confirms success AND valid token
      if (response.ok && data && data.success === true && data.token) {
        this.setSessionToken(data.token);
        return data;
      }

      // If HTTP 200 (response.ok) but data.success is false or missing
      if (response.ok && (!data || data.success !== true)) {
        return {
          success: false,
          errorCode: data?.errorCode || 'LOGIN_FAILED',
          firstTimeSetupRequired: data?.firstTimeSetupRequired,
          message: data?.message || 'Đăng nhập Quản trị viên không thành công.'
        };
      }

      // Handle HTTP error codes (400, 401, 403, 429)
      return {
        success: false,
        errorCode: data?.errorCode || (response.status === 403 ? 'FORBIDDEN_NOT_ADMIN' : (response.status === 429 ? 'RATE_LIMIT_EXCEEDED' : 'INVALID_CREDENTIALS')),
        firstTimeSetupRequired: data?.firstTimeSetupRequired,
        message: data?.message || (response.status === 403
          ? 'TỪ CHỐI QUYỀN ADMIN: Tài khoản không có quyền Quản trị viên.'
          : (response.status === 429
            ? 'Quá nhiều lượt thử đăng nhập. Vui lòng thử lại sau 5 phút.'
            : 'Thông tin đăng nhập không hợp lệ.'))
      };
    } catch (err: any) {
      return {
        success: false,
        errorCode: 'NETWORK_ERROR',
        message: err?.message || 'Không thể kết nối đến máy chủ xác thực Quản trị viên.'
      };
    }
  }

  public async changeSuperAdminPassword(
    oldPassword: string,
    newPassword: string,
    revokeOtherSessions: boolean = false,
    isGoogleAuthVerified: boolean = false
  ): Promise<{ success: boolean; message?: string; errorCode?: string; token?: string }> {
    const token = this.getSessionToken();
    try {
      const response = await fetch('/api/v1/auth/admin/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ oldPassword, newPassword, revokeOtherSessions, isGoogleAuthVerified })
      });
      const data = await this.safeParseResponse<{ success: boolean; message?: string; errorCode?: string; token?: string }>(
        response,
        'Đổi mật khẩu thất bại: Máy chủ không phản hồi JSON hợp lệ.'
      );
      if (response.ok && data.success && data.token) {
        this.setSessionToken(data.token);
      }
      return data;
    } catch (err: any) {
      return {
        success: false,
        errorCode: 'NETWORK_ERROR',
        message: err?.message || 'Lỗi kết nối khi đổi mật khẩu Quản trị viên.'
      };
    }
  }

  public async generateAdminRecoveryCode(
    currentPassword: string,
    isGoogleAuthVerified: boolean = false
  ): Promise<{
    success: boolean;
    recoveryCode?: string;
    createdAt?: string;
    message: string;
    errorCode?: string;
  }> {
    const token = this.getSessionToken();
    try {
      const response = await fetch('/api/v1/auth/admin/recovery-code/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ currentPassword, isGoogleAuthVerified })
      });
      return await this.safeParseResponse(response, 'Lỗi kết nối khi tạo mã khôi phục bí mật.');
    } catch (err: any) {
      return {
        success: false,
        errorCode: 'NETWORK_ERROR',
        message: err?.message || 'Lỗi kết nối khi tạo mã khôi phục bí mật.'
      };
    }
  }

  public async verifyAdminRecoveryCode(
    identifier: string,
    recoveryCode: string
  ): Promise<{ success: boolean; message: string; errorCode?: string; loginId?: string }> {
    try {
      const response = await fetch('/api/v1/auth/admin/verify-recovery-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, recoveryCode })
      });
      return await this.safeParseResponse(response, 'Lỗi kết nối khi xác minh Recovery Code.');
    } catch (err: any) {
      return {
        success: false,
        errorCode: 'NETWORK_ERROR',
        message: err?.message || 'Lỗi kết nối khi xác minh Recovery Code.'
      };
    }
  }

  public async setAdminRecoveryCode(
    currentPassword: string,
    newRecoveryCode: string,
    confirmRecoveryCode: string,
    isGoogleAuthVerified: boolean = false
  ): Promise<{ success: boolean; message: string; errorCode?: string; createdAt?: string }> {
    const token = this.getSessionToken();
    try {
      const response = await fetch('/api/v1/auth/admin/set-recovery-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ currentPassword, newRecoveryCode, confirmRecoveryCode, isGoogleAuthVerified })
      });
      return await this.safeParseResponse(response, 'Lỗi kết nối khi thiết lập Recovery Code mới.');
    } catch (err: any) {
      return {
        success: false,
        errorCode: 'NETWORK_ERROR',
        message: err?.message || 'Lỗi kết nối khi thiết lập Recovery Code mới.'
      };
    }
  }

  public async recoverSuperAdminPassword(
    loginId: string,
    recoveryCode: string,
    newPassword: string,
    confirmPassword?: string
  ): Promise<{ success: boolean; message: string; errorCode?: string }> {
    try {
      const response = await fetch('/api/v1/auth/admin/recover-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginId, recoveryCode, newPassword, confirmPassword })
      });
      return await this.safeParseResponse(response, 'Lỗi kết nối máy chủ khi khôi phục mật khẩu.');
    } catch (err: any) {
      return {
        success: false,
        errorCode: 'NETWORK_ERROR',
        message: err?.message || 'Lỗi kết nối máy chủ khi khôi phục mật khẩu.'
      };
    }
  }

  public async revokeAllAdminSessions(): Promise<{ success: boolean; message: string; token?: string }> {
    const token = this.getSessionToken();
    try {
      const response = await fetch('/api/v1/auth/admin/revoke-all-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      const data = await this.safeParseResponse<{ success: boolean; message: string; token?: string }>(
        response,
        'Lỗi kết nối khi thu hồi phiên đăng nhập.'
      );
      if (response.ok && data.success && data.token) {
        this.setSessionToken(data.token);
      }
      return data;
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Lỗi kết nối khi thu hồi phiên đăng nhập.'
      };
    }
  }

  public async checkAdminEmailStatus(): Promise<{
    success: boolean;
    status?: {
      configured: boolean;
      host: string;
      port: number;
      userMasked: string;
      fromAddress: string;
    };
  }> {
    try {
      const response = await fetch('/api/v1/auth/admin/email-status');
      return await this.safeParseResponse(response, 'Không thể kiểm tra trạng thái email.');
    } catch {
      return { success: false };
    }
  }

  public async requestAdminPasswordReset(identifier: string): Promise<{
    success: boolean;
    message: string;
    resetToken?: string;
    expiresAt?: string;
    maskedEmail?: string;
    emailConfigured?: boolean;
    errorCode?: string;
  }> {
    try {
      const response = await fetch('/api/v1/auth/admin/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, email: identifier })
      });
      return await this.safeParseResponse(response, 'Lỗi kết nối khi gửi yêu cầu khôi phục mật khẩu.');
    } catch (err: any) {
      return {
        success: false,
        errorCode: 'NETWORK_ERROR',
        message: err?.message || 'Lỗi kết nối khi gửi yêu cầu khôi phục mật khẩu.'
      };
    }
  }

  public async resetAdminPassword(identifier: string, token: string, newPassword: string): Promise<{
    success: boolean;
    message: string;
    errorCode?: string;
  }> {
    try {
      const response = await fetch('/api/v1/auth/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, email: identifier, token, newPassword })
      });
      return await this.safeParseResponse(response, 'Lỗi kết nối khi đặt lại mật khẩu Quản trị viên.');
    } catch (err: any) {
      return {
        success: false,
        errorCode: 'NETWORK_ERROR',
        message: err?.message || 'Lỗi kết nối khi đặt lại mật khẩu Quản trị viên.'
      };
    }
  }

  public async checkAdminAccountStatus(identifier?: string): Promise<{
    success: boolean;
    exists: boolean;
    firstTimeSetupRequired: boolean;
    emailConfigured: boolean;
    hasRecoveryCode: boolean;
    loginId?: string;
    email?: string;
    maskedEmail?: string;
    errorMessage?: string;
  }> {
    try {
      const url = identifier ? `/api/v1/auth/admin/status?identifier=${encodeURIComponent(identifier)}` : '/api/v1/auth/admin/status';
      const response = await fetch(url);
      const data = await this.safeParseResponse<any>(response);
      if (!data || !data.success) {
        return {
          success: false,
          exists: true, // Preserve established admin presence on temporary server error
          firstTimeSetupRequired: false, // MANDATE: Never force first-time setup on temporary read error
          emailConfigured: true,
          hasRecoveryCode: true,
          errorMessage: data?.message || 'Không thể kiểm tra trạng thái Quản trị viên.'
        };
      }
      return {
        ...data,
        firstTimeSetupRequired: data.firstTimeSetupRequired === true && data.exists === true
      };
    } catch (err: any) {
      return {
        success: false,
        exists: true,
        firstTimeSetupRequired: false, // MANDATE: Never force first-time setup on network error
        emailConfigured: true,
        hasRecoveryCode: true,
        errorMessage: err?.message || 'Lỗi mạng khi kiểm tra trạng thái Quản trị viên.'
      };
    }
  }

  public async setupFirstTimeAdminPassword(identifier: string, newPassword: string, setupCode?: string): Promise<{
    success: boolean;
    message: string;
    errorCode?: string;
  }> {
    try {
      const response = await fetch('/api/v1/auth/admin/setup-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, newPassword, setupCode, recoveryCode: setupCode })
      });
      return await this.safeParseResponse(response, 'Lỗi kết nối khi thiết lập mật khẩu Quản trị viên.');
    } catch (err: any) {
      return {
        success: false,
        errorCode: 'NETWORK_ERROR',
        message: err?.message || 'Lỗi kết nối khi thiết lập mật khẩu Quản trị viên.'
      };
    }
  }

  public async fetchAdminProfile(): Promise<{ success: boolean; profile?: any; message?: string }> {
    const token = this.getSessionToken();
    try {
      const response = await fetch('/api/v1/auth/admin/profile', {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      return await this.safeParseResponse(response, 'Không thể tải thông tin Quản trị viên.');
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Không thể tải thông tin Quản trị viên.'
      };
    }
  }

  public async updateAdminRecoveryEmail(recoveryEmail: string): Promise<{ success: boolean; message: string }> {
    const token = this.getSessionToken();
    try {
      const response = await fetch('/api/v1/auth/admin/update-recovery-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ recoveryEmail })
      });
      return await this.safeParseResponse(response, 'Không thể cập nhật email khôi phục.');
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Không thể cập nhật email khôi phục.'
      };
    }
  }

  public async updateAvatar(params: {
    avatar: string;
    userId?: string;
    role?: string;
    tenantId?: string;
    studentId?: string;
    teacherId?: string;
    childStudentId?: string;
    email?: string;
  }): Promise<{ success: boolean; message: string; avatar?: string }> {
    const token = this.getSessionToken();
    try {
      const response = await fetch('/api/v1/auth/avatar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(params)
      });
      return await response.json();
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Lỗi kết nối khi lưu ảnh đại diện.'
      };
    }
  }
}

export const authRepository = AuthRepository.getInstance();
