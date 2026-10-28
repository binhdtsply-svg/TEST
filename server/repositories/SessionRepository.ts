import { getDatabase } from '../db/database';
import { generateSessionToken, verifySessionToken } from '../auth/crypto';
import { persistenceSyncService } from '../services/PersistenceSyncService';

export interface SessionRecord {
  id: string;
  token: string;
  user_id: string;
  role: 'SUPER_ADMIN' | 'TEACHER' | 'CLASS_OFFICER' | 'STUDENT' | 'PARENT';
  tenant_id: string;
  teacher_id?: string | null;
  student_id?: string | null;
  child_student_id?: string | null;
  officer_role_title?: string | null;
  credential_version: number;
  login_method?: string | null;
  created_at: string;
  expires_at: string;
  last_activity_at: string;
  is_test_credential: number;
}

export class SessionRepository {
  private db = getDatabase();
  private revokedSessionIds = new Set<string>();

  private loadRevokedSessionIds(): Set<string> {
    try {
      const row = this.db.prepare("SELECT value_json FROM system_settings WHERE key = 'revoked_auth_sessions'").get() as any;
      if (row?.value_json) {
        const parsed = JSON.parse(row.value_json);
        if (Array.isArray(parsed)) {
          for (const id of parsed) {
            if (id) this.revokedSessionIds.add(String(id));
          }
        }
      }
    } catch {}
    return this.revokedSessionIds;
  }

  private markSessionRevoked(sessionId: string): void {
    if (!sessionId) return;
    this.loadRevokedSessionIds();
    this.revokedSessionIds.add(sessionId);
    try {
      const list = Array.from(this.revokedSessionIds).slice(-500);
      const nowIso = new Date().toISOString();
      this.db.prepare(`
        INSERT OR REPLACE INTO system_settings (key, value_json, updated_at, updated_by)
        VALUES ('revoked_auth_sessions', ?, ?, 'session_repository')
      `).run(JSON.stringify(list), nowIso);
    } catch {}
  }

  public isSessionRevoked(sessionId: string): boolean {
    if (!sessionId) return false;
    if (this.revokedSessionIds.has(sessionId)) return true;
    this.loadRevokedSessionIds();
    return this.revokedSessionIds.has(sessionId);
  }

  createSession(params: {
    userId: string;
    role: 'SUPER_ADMIN' | 'TEACHER' | 'CLASS_OFFICER' | 'STUDENT' | 'PARENT';
    tenantId: string;
    teacherId?: string;
    studentId?: string;
    childStudentId?: string;
    officerRoleTitle?: string;
    credentialVersion?: number;
    isTestCredential?: boolean;
    expiresInDays?: number;
    loginMethod?: string;
  }): { session: SessionRecord; token: string } {
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (params.expiresInDays || 7) * 24 * 60 * 60 * 1000);

    const payload = {
      sessionId,
      userId: params.userId,
      role: params.role,
      tenantId: params.tenantId,
      teacherId: params.teacherId,
      studentId: params.studentId,
      childStudentId: params.childStudentId,
      officerRoleTitle: params.officerRoleTitle,
      credentialVersion: params.credentialVersion || 1,
      loginMethod: params.loginMethod || null,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString()
    };

    const token = generateSessionToken(payload);

    const stmt = this.db.prepare(`
      INSERT INTO auth_sessions (
        id, token, user_id, role, tenant_id, teacher_id, student_id, child_student_id,
        officer_role_title, credential_version, created_at, expires_at, last_activity_at, is_test_credential
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      sessionId,
      token,
      params.userId,
      params.role,
      params.tenantId,
      params.teacherId || null,
      params.studentId || null,
      params.childStudentId || null,
      params.officerRoleTitle || null,
      params.credentialVersion || 1,
      now.toISOString(),
      expiresAt.toISOString(),
      now.toISOString(),
      params.isTestCredential ? 1 : 0
    );

    const session: SessionRecord = {
      id: sessionId,
      token,
      user_id: params.userId,
      role: params.role,
      tenant_id: params.tenantId,
      teacher_id: params.teacherId || null,
      student_id: params.studentId || null,
      child_student_id: params.childStudentId || null,
      officer_role_title: params.officerRoleTitle || null,
      credential_version: params.credentialVersion || 1,
      created_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      last_activity_at: now.toISOString(),
      is_test_credential: params.isTestCredential ? 1 : 0,
      login_method: params.loginMethod || null
    };

    try {
      persistenceSyncService.scheduleDebouncedFlush(500);
    } catch {}

    return { session, token };
  }

  getSessionByToken(token: string): SessionRecord | null {
    const verified = verifySessionToken(token);
    if (!verified) return null;

    if (verified.sessionId && this.isSessionRevoked(verified.sessionId)) {
      try {
        this.db.prepare('DELETE FROM auth_sessions WHERE id = ? OR token = ?').run(verified.sessionId, token);
      } catch {}
      return null;
    }

    const stmt = this.db.prepare('SELECT * FROM auth_sessions WHERE token = ?');
    let session = stmt.get(token) as any;

    // Self-healing: If SQLite was recreated after container restart, but client holds a cryptographically verified, non-revoked token
    if (!session) {
      if (verified && verified.sessionId && verified.userId && verified.expiresAt) {
        if (new Date(verified.expiresAt).getTime() > Date.now()) {
          // Verify Super Admin session_version before self-healing
          if (verified.role === 'SUPER_ADMIN') {
            try {
              const adminRow = this.db.prepare('SELECT session_version, status FROM admin_accounts WHERE id = ? OR id = ? LIMIT 1').get(verified.userId, 'usr-super-admin') as any;
              if (adminRow && (adminRow.status !== 'ACTIVE' || (adminRow.session_version && adminRow.session_version > (verified.credentialVersion || 1)))) {
                return null;
              }
            } catch {}
          }

          try {
            this.db.prepare(`
              INSERT OR REPLACE INTO auth_sessions (
                id, token, user_id, role, tenant_id, teacher_id, student_id, child_student_id,
                officer_role_title, credential_version, created_at, expires_at, last_activity_at, is_test_credential
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              verified.sessionId,
              token,
              verified.userId,
              verified.role,
              verified.tenantId,
              verified.teacherId || null,
              verified.studentId || null,
              verified.childStudentId || null,
              verified.officerRoleTitle || null,
              verified.credentialVersion || 1,
              verified.createdAt || new Date().toISOString(),
              verified.expiresAt,
              new Date().toISOString(),
              0
            );
            session = {
              id: verified.sessionId,
              token,
              user_id: verified.userId,
              role: verified.role,
              tenant_id: verified.tenantId,
              teacher_id: verified.teacherId || null,
              student_id: verified.studentId || null,
              child_student_id: verified.childStudentId || null,
              officer_role_title: verified.officerRoleTitle || null,
              credential_version: verified.credentialVersion || 1,
              created_at: verified.createdAt || new Date().toISOString(),
              expires_at: verified.expiresAt,
              last_activity_at: new Date().toISOString(),
              is_test_credential: 0,
              login_method: verified.loginMethod || null
            };
            persistenceSyncService.scheduleDebouncedFlush(1000);
          } catch {}
        }
      }
    }

    if (!session) return null;

    // Check expiration
    if (new Date(session.expires_at).getTime() < Date.now()) {
      this.deleteSession(session.id);
      return null;
    }

    // Touch last activity
    const updateStmt = this.db.prepare('UPDATE auth_sessions SET last_activity_at = ? WHERE id = ?');
    updateStmt.run(new Date().toISOString(), session.id);

    // Attach verified loginMethod from token payload
    if (verified.loginMethod) {
      session.login_method = verified.loginMethod;
    }

    return session;
  }

  touchSession(sessionId: string): void {
    const updateStmt = this.db.prepare('UPDATE auth_sessions SET last_activity_at = ? WHERE id = ?');
    updateStmt.run(new Date().toISOString(), sessionId);
  }

  revokeToken(token: string): void {
    if (!token) return;
    try {
      const existing = this.db.prepare('SELECT id FROM auth_sessions WHERE token = ?').get(token) as any;
      if (existing?.id) {
        this.markSessionRevoked(existing.id);
      }
    } catch {}
    const verified = verifySessionToken(token);
    if (verified?.sessionId) {
      this.markSessionRevoked(verified.sessionId);
      try {
        this.db.prepare('DELETE FROM auth_sessions WHERE id = ? OR token = ?').run(verified.sessionId, token);
      } catch {}
    } else {
      try {
        this.db.prepare('DELETE FROM auth_sessions WHERE token = ?').run(token);
      } catch {}
    }
    try {
      persistenceSyncService.scheduleDebouncedFlush(500);
    } catch {}
  }

  deleteSession(sessionId: string): void {
    this.markSessionRevoked(sessionId);
    const stmt = this.db.prepare('DELETE FROM auth_sessions WHERE id = ?');
    stmt.run(sessionId);
    try {
      persistenceSyncService.scheduleDebouncedFlush(500);
    } catch {}
  }

  deleteSessionsForUser(userId: string): void {
    try {
      const rows = this.db.prepare('SELECT id FROM auth_sessions WHERE user_id = ?').all(userId) as any[];
      for (const r of rows) {
        if (r?.id) this.markSessionRevoked(r.id);
      }
    } catch {}
    const stmt = this.db.prepare('DELETE FROM auth_sessions WHERE user_id = ?');
    stmt.run(userId);
    try {
      persistenceSyncService.scheduleDebouncedFlush(500);
    } catch {}
  }

  invalidateSessionsByOwner(tenantId: string, ownerId: string): void {
    try {
      const rows = this.db.prepare(`
        SELECT id FROM auth_sessions 
        WHERE tenant_id = ? 
          AND (teacher_id = ? OR student_id = ? OR child_student_id = ? OR user_id = ?)
      `).all(tenantId, ownerId, ownerId, ownerId, ownerId) as any[];
      for (const r of rows) {
        if (r?.id) this.markSessionRevoked(r.id);
      }
    } catch {}
    const stmt = this.db.prepare(`
      DELETE FROM auth_sessions 
      WHERE tenant_id = ? 
        AND (teacher_id = ? OR student_id = ? OR child_student_id = ? OR user_id = ?)
    `);
    stmt.run(tenantId, ownerId, ownerId, ownerId, ownerId);
    try {
      persistenceSyncService.scheduleDebouncedFlush(500);
    } catch {}
  }

  invalidateSessionsByCredentialVersion(tenantId: string, ownerId: string, currentVersion: number): void {
    try {
      const rows = this.db.prepare(`
        SELECT id FROM auth_sessions 
        WHERE tenant_id = ? 
          AND (teacher_id = ? OR student_id = ? OR child_student_id = ? OR user_id = ?)
          AND credential_version < ?
      `).all(tenantId, ownerId, ownerId, ownerId, ownerId, currentVersion) as any[];
      for (const r of rows) {
        if (r?.id) this.markSessionRevoked(r.id);
      }
    } catch {}
    const stmt = this.db.prepare(`
      DELETE FROM auth_sessions 
      WHERE tenant_id = ? 
        AND (teacher_id = ? OR student_id = ? OR child_student_id = ? OR user_id = ?)
        AND credential_version < ?
    `);
    stmt.run(tenantId, ownerId, ownerId, ownerId, ownerId, currentVersion);
    try {
      persistenceSyncService.scheduleDebouncedFlush(500);
    } catch {}
  }
}

export const sessionRepository = new SessionRepository();


