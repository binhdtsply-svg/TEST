import { getDatabase } from '../db/database';
import { hashSecret, verifySecret } from '../auth/crypto';
import { tenantRepository } from './TenantRepository';

export interface CredentialRecord {
  id: string;
  type: 'TEACHER' | 'STUDENT' | 'PARENT';
  tenant_id: string;
  owner_id: string; /* teacher_id, student_id, or child_student_id */
  lookup_identifier: string; /* Cleaned uppercase code for exact lookup index */
  secret_hash: string;
  status: 'ACTIVE' | 'LOCKED' | 'REVOKED';
  credential_version: number;
  is_officer: number;
  officer_role_title?: string | null;
  is_test_credential: number;
  must_change_password?: number | null;
  password_hash?: string | null;
  password_updated_at?: string | null;
  last_issued_at?: string | null;
  created_at: string;
  created_by?: string | null;
  last_login_at?: string | null;
  locked_at?: string | null;
  locked_by?: string | null;
  revoked_at?: string | null;
  revoked_by?: string | null;
}

export interface SanitizedCredential {
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
  mustChangePassword?: boolean;
  passwordUpdatedAt?: string | null;
  lastIssuedAt?: string | null;
  createdAt: string;
  createdBy?: string | null;
  lastLoginAt?: string | null;
  lockedAt?: string | null;
  lockedBy?: string | null;
}

export interface CredentialAuditRecord {
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

export class CredentialRepository {
  private db = getDatabase();

  normalizeCode(code: string): string {
    return code.trim().toUpperCase();
  }

  logAudit(audit: {
    credentialId?: string;
    tenantId: string;
    ownerId: string;
    role: string;
    action: string;
    actorUserId: string;
    actorRole?: string;
    credentialVersion: number;
    reason?: string;
  }) {
    try {
      const id = `caud_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const stmt = this.db.prepare(`
        INSERT INTO credential_audits (
          id, credential_id, tenant_id, owner_id, role,
          action, actor_user_id, actor_role, credential_version, reason, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        id,
        audit.credentialId || null,
        audit.tenantId,
        audit.ownerId,
        audit.role,
        audit.action,
        audit.actorUserId,
        audit.actorRole || null,
        audit.credentialVersion,
        audit.reason || null,
        new Date().toISOString()
      );
    } catch (err) {
      console.warn('[CredentialRepository] Failed to write credential audit:', err);
    }
  }

  saveCredential(params: {
    type: 'TEACHER' | 'STUDENT' | 'PARENT';
    tenant_id: string;
    owner_id: string;
    raw_code: string;
    is_officer?: boolean;
    officer_role_title?: string;
    is_test_credential?: boolean;
    created_by?: string;
    reason?: string;
  }): CredentialRecord {
    tenantRepository.ensureTenantExists(params.tenant_id);
    const normalized = this.normalizeCode(params.raw_code);
    const existing = this.findByTenantAndOwner(params.tenant_id, params.owner_id, params.type)
      || this.findByLookupIdentifier(normalized);
    const secretHash = hashSecret(params.raw_code.trim());
    const now = new Date().toISOString();

    if (existing) {
      const newVersion = existing.credential_version + 1;
      const stmt = this.db.prepare(`
        UPDATE credentials SET
          tenant_id = ?, owner_id = ?, type = ?,
          lookup_identifier = ?, secret_hash = ?, status = 'ACTIVE', credential_version = ?,
          is_officer = ?, officer_role_title = ?, is_test_credential = ?,
          last_issued_at = ?, locked_at = NULL, locked_by = NULL, revoked_at = NULL, revoked_by = NULL
        WHERE id = ?
      `);
      stmt.run(
        params.tenant_id,
        params.owner_id,
        params.type,
        normalized,
        secretHash,
        newVersion,
        params.is_officer ? 1 : 0,
        params.officer_role_title || null,
        params.is_test_credential ? 1 : 0,
        now,
        existing.id
      );

      this.logAudit({
        credentialId: existing.id,
        tenantId: params.tenant_id,
        ownerId: params.owner_id,
        role: params.type,
        action: 'REGENERATE',
        actorUserId: params.created_by || 'system',
        actorRole: 'TEACHER',
        credentialVersion: newVersion,
        reason: params.reason || 'Cấp lại mã truy cập mới (hủy mã cũ)'
      });

      return this.findByLookupIdentifier(normalized)!;
    } else {
      const id = `cred_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const stmt = this.db.prepare(`
        INSERT INTO credentials (
          id, type, tenant_id, owner_id, lookup_identifier, secret_hash,
          status, credential_version, is_officer, officer_role_title,
          is_test_credential, last_issued_at, created_at, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', 1, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        id,
        params.type,
        params.tenant_id,
        params.owner_id,
        normalized,
        secretHash,
        params.is_officer ? 1 : 0,
        params.officer_role_title || null,
        params.is_test_credential ? 1 : 0,
        now,
        now,
        params.created_by || null
      );

      this.logAudit({
        credentialId: id,
        tenantId: params.tenant_id,
        ownerId: params.owner_id,
        role: params.type,
        action: 'CREATE',
        actorUserId: params.created_by || 'system',
        actorRole: 'TEACHER',
        credentialVersion: 1,
        reason: params.reason || 'Khởi tạo mã truy cập ban đầu'
      });

      return this.findByLookupIdentifier(normalized)!;
    }
  }

  findByLookupIdentifier(lookupIdentifier: string, type?: 'TEACHER' | 'STUDENT' | 'PARENT'): CredentialRecord | null {
    if (type) {
      const stmt = this.db.prepare('SELECT * FROM credentials WHERE lookup_identifier = ? AND type = ?');
      const row = stmt.get(lookupIdentifier, type) as any;
      if (row) return row;
    }
    const stmt = this.db.prepare('SELECT * FROM credentials WHERE lookup_identifier = ?');
    const row = stmt.get(lookupIdentifier) as any;
    return row || null;
  }

  findByTenantAndOwner(tenantId: string, ownerId: string, type: 'TEACHER' | 'STUDENT' | 'PARENT'): CredentialRecord | null {
    const stmt = this.db.prepare('SELECT * FROM credentials WHERE tenant_id = ? AND owner_id = ? AND type = ?');
    let row = stmt.get(tenantId, ownerId, type) as any;
    if (!row && type === 'TEACHER') {
      const tStmt = this.db.prepare('SELECT teacher_id FROM teacher_accounts WHERE id = ? OR teacher_id = ? OR email = ?');
      const tRow = tStmt.get(ownerId, ownerId, ownerId) as any;
      if (tRow) {
        row = stmt.get(tenantId, tRow.teacher_id, 'TEACHER') as any;
      }
    }
    return row || null;
  }

  getCredentialsForTenant(tenantId: string): SanitizedCredential[] {
    const stmt = this.db.prepare('SELECT * FROM credentials WHERE tenant_id = ? ORDER BY created_at ASC');
    const rows = stmt.all(tenantId) as unknown as (CredentialRecord & { initial_password?: string | null })[];
    return rows.map(r => ({
      id: r.id,
      type: r.type,
      tenantId: r.tenant_id,
      ownerId: r.owner_id,
      status: r.status,
      credentialVersion: r.credential_version,
      isOfficer: Boolean(r.is_officer),
      officerRoleTitle: r.officer_role_title,
      hasPassword: Boolean(r.password_hash),
      initialPassword: r.initial_password || null,
      passwordUpdatedAt: r.password_updated_at || null,
      lastIssuedAt: r.last_issued_at || r.created_at,
      createdAt: r.created_at,
      createdBy: r.created_by,
      lastLoginAt: r.last_login_at,
      lockedAt: r.locked_at,
      lockedBy: r.locked_by
    }));
  }

  getCredentialHistory(tenantId: string, ownerId?: string): CredentialAuditRecord[] {
    if (ownerId) {
      const stmt = this.db.prepare(`
        SELECT * FROM credential_audits 
        WHERE tenant_id = ? AND owner_id = ? 
        ORDER BY created_at DESC LIMIT 100
      `);
      return stmt.all(tenantId, ownerId) as unknown as CredentialAuditRecord[];
    }
    const stmt = this.db.prepare(`
      SELECT * FROM credential_audits 
      WHERE tenant_id = ? 
      ORDER BY created_at DESC LIMIT 200
    `);
    return stmt.all(tenantId) as unknown as CredentialAuditRecord[];
  }

  setPassword(params: {
    tenantId: string;
    ownerId: string;
    type: 'STUDENT' | 'PARENT' | 'TEACHER';
    newPasswordPlain: string;
    actorUserId: string;
  }): { success: boolean; message: string; credentialVersion?: number } {
    const record = this.findByTenantAndOwner(params.tenantId, params.ownerId, params.type);
    if (!record) {
      return { success: false, message: 'Không tìm thấy thông tin tài khoản.' };
    }

    if (!params.newPasswordPlain || params.newPasswordPlain.trim().length < 6) {
      return { success: false, message: 'Mật khẩu phải có độ dài tối thiểu 6 ký tự.' };
    }

    const passwordHash = hashSecret(params.newPasswordPlain.trim());
    const nextVer = record.credential_version + 1;
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      UPDATE credentials SET
        password_hash = ?,
        password_updated_at = ?,
        must_change_password = 0,
        credential_version = ?
      WHERE id = ?
    `);
    stmt.run(passwordHash, now, nextVer, record.id);

    this.logAudit({
      credentialId: record.id,
      tenantId: params.tenantId,
      ownerId: params.ownerId,
      role: params.type,
      action: 'PASSWORD_SET',
      actorUserId: params.actorUserId,
      actorRole: params.type,
      credentialVersion: nextVer,
      reason: 'Thiết lập mật khẩu bảo mật cá nhân'
    });

    return { success: true, message: 'Đã thiết lập mật khẩu cá nhân thành công.', credentialVersion: nextVer };
  }

  changePassword(params: {
    tenantId: string;
    ownerId: string;
    type: 'STUDENT' | 'PARENT' | 'TEACHER';
    oldPasswordPlain: string;
    newPasswordPlain: string;
    actorUserId: string;
  }): { success: boolean; message: string; credentialVersion?: number } {
    const record = this.findByTenantAndOwner(params.tenantId, params.ownerId, params.type);
    if (!record) {
      return { success: false, message: 'Không tìm thấy thông tin tài khoản để đổi mật khẩu.' };
    }

    if (!params.newPasswordPlain || params.newPasswordPlain.trim().length < 6) {
      return { success: false, message: 'Mật khẩu mới phải có tối thiểu 6 ký tự.' };
    }

    if (params.oldPasswordPlain.trim() === params.newPasswordPlain.trim()) {
      return { success: false, message: 'Mật khẩu mới không được trùng với mật khẩu hiện tại.' };
    }

    if (record.password_hash) {
      if (!verifySecret(params.oldPasswordPlain.trim(), record.password_hash)) {
        this.logAudit({
          credentialId: record.id,
          tenantId: params.tenantId,
          ownerId: params.ownerId,
          role: params.type,
          action: 'PASSWORD_CHANGE_FAILED',
          actorUserId: params.actorUserId,
          actorRole: params.type,
          credentialVersion: record.credential_version,
          reason: 'Nhập sai mật khẩu hiện tại'
        });
        return { success: false, message: 'Mật khẩu hiện tại không chính xác.' };
      }
    } else {
      // If user had no password_hash yet, check against secret_hash or lookup_identifier
      if (!verifySecret(params.oldPasswordPlain.trim(), record.secret_hash) && params.oldPasswordPlain.trim().toUpperCase() !== record.lookup_identifier) {
        return { success: false, message: 'Mật khẩu hoặc mã truy cập hiện tại không chính xác.' };
      }
    }

    const passwordHash = hashSecret(params.newPasswordPlain.trim());
    const nextVer = record.credential_version + 1;
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      UPDATE credentials SET
        password_hash = ?,
        password_updated_at = ?,
        must_change_password = 0,
        credential_version = ?
      WHERE id = ?
    `);
    stmt.run(passwordHash, now, nextVer, record.id);

    this.logAudit({
      credentialId: record.id,
      tenantId: params.tenantId,
      ownerId: params.ownerId,
      role: params.type,
      action: 'PASSWORD_CHANGE',
      actorUserId: params.actorUserId,
      actorRole: params.type,
      credentialVersion: nextVer,
      reason: 'Người dùng tự đổi mật khẩu cá nhân'
    });

    return { success: true, message: 'Đổi mật khẩu thành công.', credentialVersion: nextVer };
  }

  setPasswordByTeacher(params: {
    tenantId: string;
    ownerId: string;
    type: 'STUDENT' | 'PARENT' | 'TEACHER';
    newPasswordPlain: string;
    actorUserId: string;
    actorRole?: 'TEACHER' | 'SUPER_ADMIN';
  }): { success: boolean; message: string; credentialVersion?: number } {
    const record = this.findByTenantAndOwner(params.tenantId, params.ownerId, params.type);
    if (!record) {
      return { success: false, message: 'Không tìm thấy tài khoản để cấp mật khẩu.' };
    }

    if (!params.newPasswordPlain || params.newPasswordPlain.trim().length < 6) {
      return { success: false, message: 'Mật khẩu phải có độ dài tối thiểu 6 ký tự.' };
    }

    const passwordHash = hashSecret(params.newPasswordPlain.trim());
    const nextVer = record.credential_version + 1;
    const stmt = this.db.prepare(`
      UPDATE credentials SET
        password_hash = ?,
        initial_password = ?,
        password_updated_at = ?,
        must_change_password = 0,
        credential_version = ?
      WHERE id = ?
    `);
    stmt.run(passwordHash, params.newPasswordPlain.trim(), new Date().toISOString(), nextVer, record.id);

    const actorRole = params.actorRole || 'TEACHER';
    this.logAudit({
      credentialId: record.id,
      tenantId: params.tenantId,
      ownerId: params.ownerId,
      role: params.type,
      action: 'PASSWORD_SET',
      actorUserId: params.actorUserId,
      actorRole,
      credentialVersion: nextVer,
      reason: actorRole === 'SUPER_ADMIN' ? 'Super Admin cấp/đổi mật khẩu trực tiếp' : 'GVCN cấp/đổi mật khẩu trực tiếp cho học sinh/phụ huynh'
    });

    return { success: true, message: 'Đã cấp mật khẩu mới thành công.', credentialVersion: nextVer };
  }

  resetPasswordByTeacher(params: {
    tenantId: string;
    ownerId: string;
    type: 'STUDENT' | 'PARENT';
    actorUserId: string;
  }): { success: boolean; message: string; credentialVersion?: number } {
    const record = this.findByTenantAndOwner(params.tenantId, params.ownerId, params.type);
    if (!record) {
      return { success: false, message: 'Không tìm thấy tài khoản để đặt lại mật khẩu.' };
    }

    const nextVer = record.credential_version + 1;
    const stmt = this.db.prepare(`
      UPDATE credentials SET
        password_hash = NULL,
        initial_password = NULL,
        password_updated_at = NULL,
        must_change_password = 1,
        credential_version = ?
      WHERE id = ?
    `);
    stmt.run(nextVer, record.id);

    this.logAudit({
      credentialId: record.id,
      tenantId: params.tenantId,
      ownerId: params.ownerId,
      role: params.type,
      action: 'PASSWORD_RESET',
      actorUserId: params.actorUserId,
      actorRole: 'TEACHER',
      credentialVersion: nextVer,
      reason: 'GVCN đặt lại trạng thái mật khẩu (yêu cầu đặt lại qua mã truy cập)'
    });

    return { success: true, message: 'Đã đặt lại mật khẩu thành công. Người dùng có thể đăng nhập lại bằng Mã truy cập.', credentialVersion: nextVer };
  }

  authenticate(rawCode: string, passwordInput?: string, expectedRole?: 'TEACHER' | 'STUDENT' | 'PARENT' | 'SUPER_ADMIN' | 'ADMIN'): {
    success: boolean;
    credential?: CredentialRecord;
    requirePassword?: boolean;
    hasPassword?: boolean;
    mustChangePassword?: boolean;
    passwordSetupRequired?: boolean;
    errorCode?: string;
    message?: string;
  } {
    const normalized = this.normalizeCode(rawCode);
    const expectedType = expectedRole === 'ADMIN' ? 'SUPER_ADMIN' : expectedRole;
    let record = this.findByLookupIdentifier(normalized, expectedType === 'SUPER_ADMIN' ? undefined : (expectedType as any));
    let matchedByEmail = false;

    if (!record && normalized.includes('-')) {
      const parts = normalized.split('-');
      if (parts.length > 2) {
        const withoutClass = parts.slice(0, -1).join('-');
        record = this.findByLookupIdentifier(withoutClass, expectedType === 'SUPER_ADMIN' ? undefined : (expectedType as any));
      }
    }

    if (!record && rawCode.includes('@')) {
      const emailTrim = rawCode.trim().toLowerCase();
      try {
        const stmt = this.db.prepare(`
          SELECT c.* FROM credentials c
          JOIN teacher_accounts t ON c.owner_id = t.teacher_id
          WHERE LOWER(t.email) = ? OR LOWER(t.google_email) = ?
        `);
        record = (stmt.get(emailTrim, emailTrim) as any) || null;
        if (record) {
          matchedByEmail = true;
        }
      } catch (err) {
        console.error('[CredentialRepo] Error querying by email:', err);
      }
    }

    if (!record) {
      return {
        success: false,
        errorCode: 'INVALID_CREDENTIAL',
        message: 'Mã truy cập hoặc email không hợp lệ hoặc không tồn tại trên hệ thống.'
      };
    }

    // Role verification against expectedRole / expectedType
    if (expectedType && expectedType !== 'SUPER_ADMIN' && record.type !== expectedType) {
      const roleDisplayName = expectedType === 'TEACHER' ? 'GVCN' : expectedType === 'STUDENT' ? 'Học viên' : 'Phụ huynh';
      return {
        success: false,
        errorCode: 'ROLE_MISMATCH',
        message: `Mã đăng nhập này không thuộc khu vực ${roleDisplayName}. Vui lòng chọn đúng khu vực đăng nhập.`
      };
    }

    const codeTrim = rawCode.trim();
    const parts = codeTrim.split('-');
    const altCode = parts.length > 2 ? parts.slice(0, -1).join('-') : null;
    const isSecretValid = matchedByEmail
      || verifySecret(codeTrim, record.secret_hash)
      || (altCode ? verifySecret(altCode, record.secret_hash) : false)
      || codeTrim.toUpperCase() === record.lookup_identifier
      || (altCode ? altCode.toUpperCase() === record.lookup_identifier : false);

    if (!isSecretValid) {
      this.logAudit({
        credentialId: record.id,
        tenantId: record.tenant_id,
        ownerId: record.owner_id,
        role: record.type,
        action: 'LOGIN_FAILED',
        actorUserId: 'anonymous',
        credentialVersion: record.credential_version,
        reason: 'Sai mã truy cập secret_hash'
      });
      return {
        success: false,
        errorCode: 'INVALID_CREDENTIAL',
        message: 'Mã truy cập không hợp lệ.'
      };
    }

    // Normalize is_officer: if officer_role_title is 'Thành viên' or empty, is_officer is 0
    if (record.officer_role_title === 'Thành viên' || !record.officer_role_title) {
      record.is_officer = 0;
    }

    if (record.status === 'LOCKED') {
      this.logAudit({
        credentialId: record.id,
        tenantId: record.tenant_id,
        ownerId: record.owner_id,
        role: record.type,
        action: 'LOGIN_FAILED',
        actorUserId: record.owner_id,
        credentialVersion: record.credential_version,
        reason: 'Tài khoản đang bị khóa bởi GVCN'
      });
      return {
        success: false,
        errorCode: 'ACCOUNT_LOCKED',
        message: 'Tài khoản này đã bị khóa bởi Giáo viên chủ nhiệm. Vui lòng liên hệ GVCN để mở lại.'
      };
    }

    if (record.status === 'REVOKED') {
      return {
        success: false,
        errorCode: 'ACCOUNT_REVOKED',
        message: 'Mã truy cập này đã bị thu hồi hoặc thay thế bằng mã mới.'
      };
    }

    // Strict verification: Access Code + Password are BOTH mandatory for production credentials
    if (!passwordInput || passwordInput.trim() === '') {
      if (record.is_test_credential) {
        // Test credential: allow direct authentication with code
      } else {
        return {
          success: false,
          credential: record,
          requirePassword: true,
          hasPassword: Boolean(record.password_hash),
          errorCode: 'PASSWORD_REQUIRED',
          message: 'Vui lòng nhập mật khẩu. Hình thức đăng nhập bằng Mã truy cập bắt buộc phải có cả Mã truy cập và Mật khẩu.'
        };
      }
    } else if (!record.password_hash) {
      if (!record.is_test_credential) {
        return {
          success: false,
          requirePassword: true,
          hasPassword: false,
          errorCode: 'PASSWORD_NOT_SET',
          message: 'Tài khoản này chưa được cấp mật khẩu. Vui lòng liên hệ Giáo viên chủ nhiệm để được cấp mật khẩu.'
        };
      }
    } else {
      const isPasswordValid = verifySecret(passwordInput.trim(), record.password_hash);
      if (!isPasswordValid) {
        this.logAudit({
          credentialId: record.id,
          tenantId: record.tenant_id,
          ownerId: record.owner_id,
          role: record.type,
          action: 'LOGIN_FAILED',
          actorUserId: record.owner_id,
          credentialVersion: record.credential_version,
          reason: 'Sai mật khẩu cá nhân'
        });
        return {
          success: false,
          requirePassword: true,
          hasPassword: true,
          errorCode: 'INVALID_PASSWORD',
          message: 'Mật khẩu cá nhân không chính xác. Vui lòng kiểm tra lại.'
        };
      }
    }

    // Update last login
    const stmt = this.db.prepare('UPDATE credentials SET last_login_at = ? WHERE id = ?');
    stmt.run(new Date().toISOString(), record.id);

    this.logAudit({
      credentialId: record.id,
      tenantId: record.tenant_id,
      ownerId: record.owner_id,
      role: record.type,
      action: 'LOGIN_SUCCESS',
      actorUserId: record.owner_id,
      credentialVersion: record.credential_version,
      reason: 'Đăng nhập thành công'
    });

    const hasPassword = Boolean(record.password_hash);
    const mustChangePassword = Boolean(record.must_change_password);

    return {
      success: true,
      credential: record,
      hasPassword,
      mustChangePassword,
      passwordSetupRequired: !hasPassword || mustChangePassword
    };
  }

  updateOfficerStatus(
    tenantId: string,
    studentId: string,
    isOfficer: boolean,
    officerRoleTitle?: string | null
  ): boolean {
    const record = this.findByTenantAndOwner(tenantId, studentId, 'STUDENT');
    if (!record) return false;

    const nextVer = record.credential_version + 1;
    const stmt = this.db.prepare(`
      UPDATE credentials SET
        is_officer = ?,
        officer_role_title = ?,
        credential_version = ?
      WHERE id = ?
    `);
    stmt.run(isOfficer ? 1 : 0, officerRoleTitle || null, nextVer, record.id);
    return true;
  }

  setCredentialStatus(
    tenantId: string,
    ownerId: string,
    type: 'TEACHER' | 'STUDENT' | 'PARENT',
    status: 'ACTIVE' | 'LOCKED' | 'REVOKED',
    actorUserId: string,
    reason?: string
  ): { success: boolean; credentialVersion: number } {
    const record = this.findByTenantAndOwner(tenantId, ownerId, type);
    if (!record) {
      return { success: false, credentialVersion: 0 };
    }

    const nextVer = record.credential_version + 1;
    const now = new Date().toISOString();

    if (status === 'LOCKED') {
      const stmt = this.db.prepare(`
        UPDATE credentials SET status = 'LOCKED', credential_version = ?, locked_at = ?, locked_by = ? WHERE id = ?
      `);
      stmt.run(nextVer, now, actorUserId, record.id);
    } else if (status === 'REVOKED') {
      const stmt = this.db.prepare(`
        UPDATE credentials SET status = 'REVOKED', credential_version = ?, revoked_at = ?, revoked_by = ? WHERE id = ?
      `);
      stmt.run(nextVer, now, actorUserId, record.id);
    } else {
      const stmt = this.db.prepare(`
        UPDATE credentials SET status = 'ACTIVE', credential_version = ?, locked_at = NULL, locked_by = NULL WHERE id = ?
      `);
      stmt.run(nextVer, record.id);
    }

    this.logAudit({
      credentialId: record.id,
      tenantId,
      ownerId,
      role: type,
      action: status === 'ACTIVE' ? 'UNLOCK' : status,
      actorUserId,
      actorRole: 'TEACHER',
      credentialVersion: nextVer,
      reason: reason || (status === 'LOCKED' ? 'GVCN tạm khóa mã đăng nhập' : status === 'ACTIVE' ? 'GVCN mở khóa mã đăng nhập' : 'GVCN thu hồi mã đăng nhập')
    });

    return { success: true, credentialVersion: nextVer };
  }

  ensureCredentialsForAllStudents(tenantId?: string): { syncedStudents: number; syncedParents: number } {
    try {
      const query = tenantId
        ? 'SELECT id, tenant_id, code, full_name, officer_role FROM students WHERE tenant_id = ?'
        : 'SELECT id, tenant_id, code, full_name, officer_role FROM students';
      const studentsStmt = this.db.prepare(query);
      const students = (tenantId ? studentsStmt.all(tenantId) : studentsStmt.all()) as any[];
      let syncedStudents = 0;
      let syncedParents = 0;

      for (const s of students) {
        // Check student credential
        const existingStudentCred = this.db.prepare(
          "SELECT id FROM credentials WHERE tenant_id = ? AND owner_id = ? AND type = 'STUDENT'"
        ).get(s.tenant_id, s.id);

        if (!existingStudentCred) {
          this.saveCredential({
            type: 'STUDENT',
            tenant_id: s.tenant_id,
            owner_id: s.id,
            raw_code: `STU-${s.code || s.id}`,
            is_officer: Boolean(s.officer_role),
            officer_role_title: s.officer_role || undefined,
            is_test_credential: true,
            created_by: 'SYSTEM_AUTO_SYNC'
          });
          syncedStudents++;
        }

        // Check parent credential
        const existingParentCred = this.db.prepare(
          "SELECT id FROM credentials WHERE tenant_id = ? AND owner_id = ? AND type = 'PARENT'"
        ).get(s.tenant_id, s.id);

        if (!existingParentCred) {
          this.saveCredential({
            type: 'PARENT',
            tenant_id: s.tenant_id,
            owner_id: s.id,
            raw_code: `PAR-${s.code || s.id}`,
            is_test_credential: true,
            created_by: 'SYSTEM_AUTO_SYNC'
          });
          syncedParents++;
        }
      }

      return { syncedStudents, syncedParents };
    } catch (e) {
      console.warn('[CredentialRepository] Error auto-syncing credentials for students:', e);
      return { syncedStudents: 0, syncedParents: 0 };
    }
  }

  getStats(): { total: number; active: number; locked: number; revoked: number; teachers: number; students: number; parents: number } {
    // Ensure all existing students have credentials before gathering stats
    this.ensureCredentialsForAllStudents();

    const totalStmt = this.db.prepare('SELECT COUNT(*) as cnt FROM credentials');
    const activeStmt = this.db.prepare("SELECT COUNT(*) as cnt FROM credentials WHERE status = 'ACTIVE'");
    const lockedStmt = this.db.prepare("SELECT COUNT(*) as cnt FROM credentials WHERE status = 'LOCKED'");
    const revokedStmt = this.db.prepare("SELECT COUNT(*) as cnt FROM credentials WHERE status = 'REVOKED'");
    const teacherStmt = this.db.prepare("SELECT COUNT(*) as cnt FROM credentials WHERE type = 'TEACHER'");
    const studentStmt = this.db.prepare("SELECT COUNT(*) as cnt FROM credentials WHERE type = 'STUDENT'");
    const parentStmt = this.db.prepare("SELECT COUNT(*) as cnt FROM credentials WHERE type = 'PARENT'");

    return {
      total: (totalStmt.get() as any)?.cnt || 0,
      active: (activeStmt.get() as any)?.cnt || 0,
      locked: (lockedStmt.get() as any)?.cnt || 0,
      revoked: (revokedStmt.get() as any)?.cnt || 0,
      teachers: (teacherStmt.get() as any)?.cnt || 0,
      students: (studentStmt.get() as any)?.cnt || 0,
      parents: (parentStmt.get() as any)?.cnt || 0
    };
  }

  searchAllCredentials(params?: {
    query?: string;
    role?: string;
    status?: string;
  }): Array<{
    id: string;
    type: 'TEACHER' | 'STUDENT' | 'PARENT';
    tenantId: string;
    ownerId: string;
    lookupIdentifier: string;
    status: 'ACTIVE' | 'LOCKED' | 'REVOKED';
    credentialVersion: number;
    isOfficer: boolean;
    officerRoleTitle?: string | null;
    hasPassword: boolean;
    mustChangePassword?: boolean;
    displayName: string;
    subText?: string;
    createdAt: string;
    lastLoginAt?: string | null;
  }> {
    this.ensureCredentialsForAllStudents();

    let sql = `
      SELECT 
        c.id, c.type, c.tenant_id, c.owner_id, c.lookup_identifier, c.status,
        c.credential_version, c.is_officer, c.officer_role_title, c.password_hash,
        c.must_change_password, c.created_at, c.last_login_at,
        s.full_name as student_name, s.code as student_code, cs.class_name as class_name,
        t.full_name as teacher_name, t.email as teacher_email
      FROM credentials c
      LEFT JOIN students s ON (c.tenant_id = s.tenant_id AND c.owner_id = s.id)
      LEFT JOIN class_settings cs ON (c.tenant_id = cs.tenant_id)
      LEFT JOIN teacher_accounts t ON (c.owner_id = t.teacher_id)
      WHERE 1=1
    `;
    const sqlParams: any[] = [];

    if (params?.role && params.role !== 'ALL') {
      sql += ' AND c.type = ?';
      sqlParams.push(params.role);
    }
    if (params?.status && params.status !== 'ALL') {
      sql += ' AND c.status = ?';
      sqlParams.push(params.status);
    }
    if (params?.query && params.query.trim()) {
      const q = `%${params.query.trim()}%`;
      sql += ' AND (c.lookup_identifier LIKE ? OR c.owner_id LIKE ? OR s.full_name LIKE ? OR s.code LIKE ? OR t.full_name LIKE ? OR t.email LIKE ?)';
      sqlParams.push(q, q, q, q, q, q);
    }

    sql += ' ORDER BY c.created_at DESC LIMIT 100';

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...sqlParams) as any[];

    return rows.map(r => {
      let displayName = r.owner_id;
      let subText = '';
      if (r.type === 'TEACHER') {
        displayName = r.teacher_name || r.owner_id;
        subText = r.teacher_email || `Mã: ${r.lookup_identifier}`;
      } else if (r.type === 'STUDENT') {
        displayName = r.student_name || `Học sinh (${r.student_code || r.owner_id})`;
        subText = `Lớp: ${r.class_name || r.tenant_id} • Mã: ${r.lookup_identifier}`;
      } else if (r.type === 'PARENT') {
        displayName = r.student_name ? `Phụ huynh em ${r.student_name}` : `Phụ huynh (${r.owner_id})`;
        subText = `Lớp: ${r.class_name || r.tenant_id} • Mã: ${r.lookup_identifier}`;
      }

      return {
        id: r.id,
        type: r.type,
        tenantId: r.tenant_id,
        ownerId: r.owner_id,
        lookupIdentifier: r.lookup_identifier,
        status: r.status,
        credentialVersion: r.credential_version,
        isOfficer: Boolean(r.is_officer),
        officerRoleTitle: r.officer_role_title,
        hasPassword: Boolean(r.password_hash),
        mustChangePassword: Boolean(r.must_change_password),
        displayName,
        subText,
        createdAt: r.created_at,
        lastLoginAt: r.last_login_at
      };
    });
  }

  resetPasswordByAdmin(params: {
    tenantId: string;
    ownerId: string;
    type: 'TEACHER' | 'STUDENT' | 'PARENT';
    actorUserId: string;
  }): { success: boolean; message: string; credentialVersion?: number } {
    const record = this.findByTenantAndOwner(params.tenantId, params.ownerId, params.type);
    if (!record) {
      return { success: false, message: 'Không tìm thấy tài khoản để đặt lại mật khẩu.' };
    }

    const nextVer = record.credential_version + 1;
    const stmt = this.db.prepare(`
      UPDATE credentials SET
        password_hash = NULL,
        initial_password = NULL,
        password_updated_at = NULL,
        must_change_password = 1,
        credential_version = ?
      WHERE id = ?
    `);
    stmt.run(nextVer, record.id);

    this.logAudit({
      credentialId: record.id,
      tenantId: params.tenantId,
      ownerId: params.ownerId,
      role: params.type,
      action: 'ADMIN_PASSWORD_RESET',
      actorUserId: params.actorUserId,
      actorRole: 'SUPER_ADMIN',
      credentialVersion: nextVer,
      reason: 'Admin Tổng reset mật khẩu qua Trung tâm Hỗ trợ người dùng'
    });

    return {
      success: true,
      credentialVersion: nextVer,
      message: 'Đã đặt lại mật khẩu thành công. Người dùng sẽ dùng mã truy cập ban đầu để đăng nhập và thiết lập mật khẩu mới.'
    };
  }

  batchGrantPasswords(params: {
    tenantId: string;
    targetType?: 'ALL' | 'STUDENT' | 'PARENT';
    targetOwnerIds?: string[];
    customPassword?: string;
    actorUserId: string;
    actorRole?: string;
    reason?: string;
  }): {
    success: boolean;
    totalProcessed: number;
    successCount: number;
    failCount: number;
    failures: Array<{ studentId: string; studentName?: string; reason: string }>;
    count: number;
    generatedList: Array<{
      studentId: string;
      studentName: string;
      studentCode: string;
      type: 'STUDENT' | 'PARENT';
      loginCode: string;
      newPasswordPlain: string;
    }>;
    message: string;
  } {
    // 1. Ensure credentials are created/synced for all students
    this.ensureCredentialsForAllStudents(params.tenantId);

    // 2. Fetch all students in this tenant
    const stmt = this.db.prepare('SELECT id, code, full_name FROM students WHERE tenant_id = ? ORDER BY code ASC');
    const students = stmt.all(params.tenantId) as Array<{ id: string; code: string; full_name: string }>;

    const targetType = params.targetType || 'ALL';
    const targetSet = params.targetOwnerIds && params.targetOwnerIds.length > 0
      ? new Set(params.targetOwnerIds)
      : null;

    const generatedList: Array<{
      studentId: string;
      studentName: string;
      studentCode: string;
      type: 'STUDENT' | 'PARENT';
      loginCode: string;
      newPasswordPlain: string;
    }> = [];
    const failures: Array<{ studentId: string; studentName?: string; reason: string }> = [];

    const now = new Date().toISOString();
    const updateStmt = this.db.prepare(`
      UPDATE credentials SET
        password_hash = ?,
        initial_password = ?,
        password_updated_at = ?,
        must_change_password = 0,
        credential_version = credential_version + 1
      WHERE id = ?
    `);

    let targetCount = 0;

    for (const student of students) {
      if (targetSet && !targetSet.has(student.id)) {
        continue;
      }
      targetCount++;

      // Process STUDENT
      if (targetType === 'ALL' || targetType === 'STUDENT') {
        const cred = this.findByTenantAndOwner(params.tenantId, student.id, 'STUDENT');
        if (cred) {
          try {
            const newPassword = params.customPassword && params.customPassword.trim().length >= 6
              ? params.customPassword.trim()
              : generateSecureClassPassword();
            const pHash = hashSecret(newPassword);
            updateStmt.run(pHash, newPassword, now, cred.id);

            this.logAudit({
              credentialId: cred.id,
              tenantId: params.tenantId,
              ownerId: student.id,
              role: 'STUDENT',
              action: 'PASSWORD_SET',
              actorUserId: params.actorUserId,
              actorRole: params.actorRole || 'TEACHER',
              credentialVersion: cred.credential_version + 1,
              reason: params.reason || 'GVCN cấp/reset mật khẩu hàng loạt cho học viên'
            });

            generatedList.push({
              studentId: student.id,
              studentName: student.full_name,
              studentCode: student.code,
              type: 'STUDENT',
              loginCode: cred.lookup_identifier, // Login code is completely preserved!
              newPasswordPlain: newPassword
            });
          } catch (err: any) {
            failures.push({
              studentId: student.id,
              studentName: student.full_name,
              reason: `Lỗi cập nhật mật khẩu học sinh: ${err?.message || 'Không xác định'}`
            });
          }
        } else {
          failures.push({
            studentId: student.id,
            studentName: student.full_name,
            reason: 'Chưa có bản ghi định danh học sinh'
          });
        }
      }

      // Process PARENT
      if (targetType === 'ALL' || targetType === 'PARENT') {
        const cred = this.findByTenantAndOwner(params.tenantId, student.id, 'PARENT');
        if (cred) {
          try {
            const newPassword = params.customPassword && params.customPassword.trim().length >= 6
              ? params.customPassword.trim()
              : generateSecureClassPassword();
            const pHash = hashSecret(newPassword);
            updateStmt.run(pHash, newPassword, now, cred.id);

            this.logAudit({
              credentialId: cred.id,
              tenantId: params.tenantId,
              ownerId: student.id,
              role: 'PARENT',
              action: 'PASSWORD_SET',
              actorUserId: params.actorUserId,
              actorRole: params.actorRole || 'TEACHER',
              credentialVersion: cred.credential_version + 1,
              reason: params.reason || 'GVCN cấp/reset mật khẩu hàng loạt cho phụ huynh'
            });

            generatedList.push({
              studentId: student.id,
              studentName: student.full_name,
              studentCode: student.code,
              type: 'PARENT',
              loginCode: cred.lookup_identifier, // Login code is completely preserved!
              newPasswordPlain: newPassword
            });
          } catch (err: any) {
            failures.push({
              studentId: student.id,
              studentName: student.full_name,
              reason: `Lỗi cập nhật mật khẩu phụ huynh: ${err?.message || 'Không xác định'}`
            });
          }
        } else {
          failures.push({
            studentId: student.id,
            studentName: student.full_name,
            reason: 'Chưa có bản ghi định danh phụ huynh'
          });
        }
      }
    }

    return {
      success: true,
      totalProcessed: targetCount,
      successCount: generatedList.length,
      failCount: failures.length,
      failures,
      count: generatedList.length,
      generatedList,
      message: `Đã xử lý: ${targetCount} hồ sơ. Cấp thành công: ${generatedList.length} tài khoản${failures.length > 0 ? `, thất bại: ${failures.length}` : ''}.`
    };
  }

  batchResetPasswords(params: {
    tenantId: string;
    targetType?: 'ALL' | 'STUDENT' | 'PARENT';
    targetOwnerIds?: string[];
    actorUserId: string;
    actorRole?: string;
    reason?: string;
  }): {
    success: boolean;
    totalProcessed: number;
    successCount: number;
    failCount: number;
    failures: Array<{ studentId: string; studentName?: string; reason: string }>;
    count: number;
    resetList: Array<{
      studentId: string;
      studentName: string;
      studentCode: string;
      type: 'STUDENT' | 'PARENT';
      loginCode: string;
    }>;
    message: string;
  } {
    this.ensureCredentialsForAllStudents(params.tenantId);

    const stmt = this.db.prepare('SELECT id, code, full_name FROM students WHERE tenant_id = ? ORDER BY code ASC');
    const students = stmt.all(params.tenantId) as Array<{ id: string; code: string; full_name: string }>;

    const targetType = params.targetType || 'ALL';
    const targetSet = params.targetOwnerIds && params.targetOwnerIds.length > 0
      ? new Set(params.targetOwnerIds)
      : null;

    const resetList: Array<{
      studentId: string;
      studentName: string;
      studentCode: string;
      type: 'STUDENT' | 'PARENT';
      loginCode: string;
    }> = [];
    const failures: Array<{ studentId: string; studentName?: string; reason: string }> = [];

    const resetStmt = this.db.prepare(`
      UPDATE credentials SET
        password_hash = NULL,
        initial_password = NULL,
        password_updated_at = NULL,
        must_change_password = 1,
        credential_version = credential_version + 1
      WHERE id = ?
    `);

    let targetCount = 0;

    for (const student of students) {
      if (targetSet && !targetSet.has(student.id)) {
        continue;
      }
      targetCount++;

      // Process STUDENT
      if (targetType === 'ALL' || targetType === 'STUDENT') {
        const cred = this.findByTenantAndOwner(params.tenantId, student.id, 'STUDENT');
        if (cred) {
          try {
            resetStmt.run(cred.id);
            this.logAudit({
              credentialId: cred.id,
              tenantId: params.tenantId,
              ownerId: student.id,
              role: 'STUDENT',
              action: 'PASSWORD_RESET',
              actorUserId: params.actorUserId,
              actorRole: params.actorRole || 'TEACHER',
              credentialVersion: cred.credential_version + 1,
              reason: params.reason || 'GVCN reset mật khẩu hàng loạt về mặc định'
            });

            resetList.push({
              studentId: student.id,
              studentName: student.full_name,
              studentCode: student.code,
              type: 'STUDENT',
              loginCode: cred.lookup_identifier
            });
          } catch (err: any) {
            failures.push({
              studentId: student.id,
              studentName: student.full_name,
              reason: `Lỗi đặt lại mật khẩu học sinh: ${err?.message || 'Không xác định'}`
            });
          }
        }
      }

      // Process PARENT
      if (targetType === 'ALL' || targetType === 'PARENT') {
        const cred = this.findByTenantAndOwner(params.tenantId, student.id, 'PARENT');
        if (cred) {
          try {
            resetStmt.run(cred.id);
            this.logAudit({
              credentialId: cred.id,
              tenantId: params.tenantId,
              ownerId: student.id,
              role: 'PARENT',
              action: 'PASSWORD_RESET',
              actorUserId: params.actorUserId,
              actorRole: params.actorRole || 'TEACHER',
              credentialVersion: cred.credential_version + 1,
              reason: params.reason || 'GVCN reset mật khẩu phụ huynh hàng loạt về mặc định'
            });

            resetList.push({
              studentId: student.id,
              studentName: student.full_name,
              studentCode: student.code,
              type: 'PARENT',
              loginCode: cred.lookup_identifier
            });
          } catch (err: any) {
            failures.push({
              studentId: student.id,
              studentName: student.full_name,
              reason: `Lỗi đặt lại mật khẩu phụ huynh: ${err?.message || 'Không xác định'}`
            });
          }
        }
      }
    }

    return {
      success: true,
      totalProcessed: targetCount,
      successCount: resetList.length,
      failCount: failures.length,
      failures,
      count: resetList.length,
      resetList,
      message: `Đã đặt lại mật khẩu cho ${resetList.length} tài khoản về mặc định thành công.`
    };
  }

  deleteCredentialsForOwner(tenantId: string, ownerId: string): boolean {
    const stmt = this.db.prepare('DELETE FROM credentials WHERE tenant_id = ? AND owner_id = ?');
    const result = stmt.run(tenantId, ownerId);
    return result.changes > 0;
  }
}

export function generateSecureClassPassword(): string {
  const lettersUpper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lettersLower = 'abcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const specials = ['@', '#', '$', '%', '&', '!'];

  const p1 = lettersUpper[Math.floor(Math.random() * lettersUpper.length)];
  const p2 = lettersLower[Math.floor(Math.random() * lettersLower.length)];
  const p3 = lettersLower[Math.floor(Math.random() * lettersLower.length)];
  const p4 = digits[Math.floor(Math.random() * digits.length)];
  const p5 = digits[Math.floor(Math.random() * digits.length)];
  const p6 = specials[Math.floor(Math.random() * specials.length)];
  const p7 = lettersUpper[Math.floor(Math.random() * lettersUpper.length)];
  const p8 = digits[Math.floor(Math.random() * digits.length)];

  return `${p1}${p2}${p3}${p4}${p5}${p6}${p7}${p8}`;
}

export const credentialRepository = new CredentialRepository();

