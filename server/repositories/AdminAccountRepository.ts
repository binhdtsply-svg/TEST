import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDatabase } from '../db/database';
import { hashSecret, verifySecret } from '../auth/crypto';
import { persistenceSyncService } from '../services/PersistenceSyncService';

const getModuleDirname = () => {
  if (typeof __dirname !== 'undefined') return __dirname;
  try {
    if (typeof import.meta !== 'undefined' && import.meta?.url) {
      return path.dirname(fileURLToPath(import.meta.url));
    }
  } catch {}
  return process.cwd();
};
const moduleDirname = getModuleDirname();

export interface AdminAccountRecord {
  id: string;
  login_id: string;
  email: string;
  recovery_email: string | null;
  full_name: string;
  password_hash: string;
  password_updated_at: string | null;
  reset_token_hash: string | null;
  reset_token_expires_at: string | null;
  recovery_code_hash: string | null;
  recovery_code_used: number;
  recovery_code_created_at: string | null;
  session_version: number;
  first_time_setup_completed?: number;
  failed_attempts?: number;
  locked_until?: string | null;
  bootstrap_token_hash?: string | null;
  bootstrap_token_expires_at?: string | null;
  firebase_uid?: string | null;
  status: 'ACTIVE' | 'LOCKED' | 'SUSPENDED';
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SanitizedAdminAccount {
  id: string;
  loginId: string;
  email: string;
  recoveryEmail: string | null;
  fullName: string;
  status: 'ACTIVE' | 'LOCKED' | 'SUSPENDED';
  hasPassword: boolean;
  firstTimeSetupRequired: boolean;
  hasRecoveryCode: boolean;
  hasCustomRecoveryCode?: boolean;
  recoveryCodeCreatedAt: string | null;
  sessionVersion: number;
  passwordUpdatedAt: string | null;
  lastLoginAt: string | null;
}

const DEFAULT_SUPER_ADMIN_ID = 'usr-super-admin';
const DEFAULT_SUPER_ADMIN_LOGIN_ID = 'admin';
const DEFAULT_SUPER_ADMIN_EMAIL = 'binhdtsply@gmail.com';
const DEFAULT_RECOVERY_EMAIL = 'dtbinh2223@gmail.com';
const DEFAULT_INITIAL_ADMIN_PASSWORD = process.env.INITIAL_ADMIN_PASSWORD || '123456@';
export const DEFAULT_INITIAL_RECOVERY_CODE = 'KHONGGIANCHUNHIEMSO2026';

export class AdminAccountRepository {
  protected getDb() {
    return getDatabase();
  }

  constructor() {
    this.ensureDefaultAdminAccount();
  }

  /**
   * Produces a strictly monotonic ISO timestamp greater than any existing timestamp on the Admin record.
   * Prevents clock-skew regressions between build/preview snapshots and Cloud Run runtime instances.
   */
  private getMonotonicTimestamp(admin?: AdminAccountRecord | null): string {
    const nowMs = Date.now();
    if (!admin) return new Date(nowMs).toISOString();
    const prevMax = Math.max(
      admin.updated_at ? new Date(admin.updated_at).getTime() || 0 : 0,
      admin.password_updated_at ? new Date(admin.password_updated_at).getTime() || 0 : 0,
      admin.recovery_code_created_at ? new Date(admin.recovery_code_created_at).getTime() || 0 : 0,
      admin.last_login_at ? new Date(admin.last_login_at).getTime() || 0 : 0,
      admin.created_at ? new Date(admin.created_at).getTime() || 0 : 0
    );
    return new Date(Math.max(nowMs, prevMax + 1000)).toISOString();
  }

  /**
   * CRITICAL PERSISTENCE MANDATE:
   * Synchronously writes Admin account snapshot to SQLite AND all persistent disk backup locations,
   * and updates the Cloud Firestore cache & document.
   * This guarantees that passwords, Recovery Codes, and setup status persist across all reboots,
   * server restarts, container lifecycles, and export/remix operations.
   */
  public persistAdminAccountSnapshot(admin: AdminAccountRecord): void {
    const db = this.getDb();
    const now = this.getMonotonicTimestamp(admin);
    const updatedRow: AdminAccountRecord = {
      ...admin,
      first_time_setup_completed: 1,
      failed_attempts: 0,
      locked_until: null,
      status: 'ACTIVE',
      updated_at: admin.updated_at && new Date(admin.updated_at).getTime() >= new Date(now).getTime() ? admin.updated_at : now
    };

    // 0. Update Cloud Firestore in-memory authority immediately
    try {
      persistenceSyncService.setCachedCloudAdminAccount(updatedRow);
    } catch {}

    // 1. Update or Insert SQLite with atomic upsert
    try {
      const res = db.prepare(`
        UPDATE admin_accounts SET
          login_id = ?,
          email = ?,
          recovery_email = ?,
          full_name = ?,
          password_hash = ?,
          password_updated_at = ?,
          reset_token_hash = ?,
          reset_token_expires_at = ?,
          recovery_code_hash = ?,
          recovery_code_used = ?,
          recovery_code_created_at = ?,
          session_version = ?,
          first_time_setup_completed = 1,
          failed_attempts = 0,
          locked_until = NULL,
          status = 'ACTIVE',
          updated_at = ?
        WHERE id = ? OR LOWER(login_id) = ?
      `).run(
        updatedRow.login_id || DEFAULT_SUPER_ADMIN_LOGIN_ID,
        (updatedRow.email || DEFAULT_SUPER_ADMIN_EMAIL).toLowerCase(),
        updatedRow.recovery_email ? updatedRow.recovery_email.toLowerCase() : null,
        updatedRow.full_name || 'Ban Quản trị Hệ thống Không Gian Chủ Nhiệm Số',
        updatedRow.password_hash,
        updatedRow.password_updated_at || updatedRow.updated_at,
        updatedRow.reset_token_hash || null,
        updatedRow.reset_token_expires_at || null,
        updatedRow.recovery_code_hash,
        updatedRow.recovery_code_used ?? 0,
        updatedRow.recovery_code_created_at || updatedRow.updated_at,
        updatedRow.session_version || 1,
        updatedRow.updated_at,
        updatedRow.id,
        (updatedRow.login_id || DEFAULT_SUPER_ADMIN_LOGIN_ID).toLowerCase()
      );

      if (res.changes === 0) {
        db.prepare(`
          INSERT INTO admin_accounts (
            id, login_id, email, recovery_email, full_name, password_hash, password_updated_at,
            reset_token_hash, reset_token_expires_at, recovery_code_hash, recovery_code_used,
            recovery_code_created_at, session_version, first_time_setup_completed, failed_attempts,
            locked_until, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, NULL, 'ACTIVE', ?, ?)
        `).run(
          updatedRow.id || DEFAULT_SUPER_ADMIN_ID,
          updatedRow.login_id || DEFAULT_SUPER_ADMIN_LOGIN_ID,
          (updatedRow.email || DEFAULT_SUPER_ADMIN_EMAIL).toLowerCase(),
          updatedRow.recovery_email ? updatedRow.recovery_email.toLowerCase() : null,
          updatedRow.full_name || 'Ban Quản trị Hệ thống Không Gian Chủ Nhiệm Số',
          updatedRow.password_hash,
          updatedRow.password_updated_at || updatedRow.updated_at,
          updatedRow.reset_token_hash || null,
          updatedRow.reset_token_expires_at || null,
          updatedRow.recovery_code_hash,
          updatedRow.recovery_code_used ?? 0,
          updatedRow.recovery_code_created_at || updatedRow.updated_at,
          updatedRow.session_version || 1,
          updatedRow.created_at || updatedRow.updated_at,
          updatedRow.updated_at
        );
      }
    } catch (e) {
      console.warn('[AdminAccountRepository] persistAdminAccountSnapshot SQLite update note:', e);
    }

    // 2. Synchronously write to all persistent backup files while preserving all existing tables
    const backupFiles = this.getCandidateBackupPaths();
    const fallbackFreshest = persistenceSyncService.getFreshestBackupPayload();

    for (const bFile of backupFiles) {
      try {
        const dir = path.dirname(bFile);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        let payload: any = {};
        if (fs.existsSync(bFile)) {
          try {
            payload = JSON.parse(fs.readFileSync(bFile, 'utf-8'));
          } catch {
            payload = {};
          }
        }
        if ((!payload.tables || Object.keys(payload.tables).length <= 1) && fallbackFreshest?.payload?.tables) {
          payload.tables = { ...fallbackFreshest.payload.tables, ...(payload.tables || {}) };
        }
        payload.version = payload.version || '2.0.0';
        payload.tables = payload.tables || {};
        payload.tables.admin_accounts = [updatedRow];
        payload.exportedAt = updatedRow.updated_at;
        fs.writeFileSync(bFile, JSON.stringify(payload, null, 2), 'utf-8');
      } catch (err: any) {
        console.warn(`[AdminAccountRepository] Failed to write backup to ${bFile}:`, err?.message);
      }
    }

    // 3. Flush full persistent backup through PersistenceSyncService & mirror to Firestore
    try {
      persistenceSyncService.setCachedCloudAdminAccount(updatedRow);
      persistenceSyncService.flushToPersistentBackup();
      persistenceSyncService.syncAdminAccountDirectly(updatedRow).catch(() => {});
    } catch {}
  }

  /**
   * Returns all possible backup file paths across process.cwd() and __dirname.
   */
  public getCandidateBackupPaths(): string[] {
    return [
      path.join(process.cwd(), 'server', 'db', 'system_persistence_backup_IMMUTABLE.json'),
      path.join(process.cwd(), 'server', 'db', 'system_persistence_backup.json'),
      path.join(process.cwd(), 'data', 'system_persistence_backup.json'),
      path.resolve(moduleDirname, '..', 'db', 'system_persistence_backup_IMMUTABLE.json'),
      path.resolve(moduleDirname, '..', 'db', 'system_persistence_backup.json'),
      path.resolve(moduleDirname, '..', '..', 'data', 'system_persistence_backup.json')
    ].filter((p, i, arr) => arr.indexOf(p) === i);
  }

  /**
   * Deterministically validates whether an Admin account is configured
   * (meaning first-time setup has been completed and custom credentials exist).
   */
  public isRecordConfigured(admin: AdminAccountRecord | any): boolean {
    if (!admin) return false;
    if (admin.first_time_setup_completed === 1) return true;
    if (Boolean(admin.password_updated_at)) return true;
    if (
      typeof admin.password_hash === 'string' &&
      admin.password_hash.startsWith('scrypt:') &&
      !verifySecret(DEFAULT_INITIAL_ADMIN_PASSWORD, admin.password_hash)
    ) {
      return true;
    }
    if (
      typeof admin.recovery_code_hash === 'string' &&
      admin.recovery_code_hash.startsWith('scrypt:') &&
      !verifySecret(DEFAULT_INITIAL_RECOVERY_CODE, admin.recovery_code_hash)
    ) {
      return true;
    }
    if (
      admin.recovery_code_created_at &&
      (!admin.created_at || admin.recovery_code_created_at !== admin.created_at)
    ) {
      return true;
    }
    return false;
  }

  /**
   * Scans Cloud Firestore cache and all backup files, returning the freshest established Admin account record.
   */
  public getEstablishedAdminFromBackups(): AdminAccountRecord | null {
    let establishedAdmin: any = null;
    let establishedAdminTime = 0;

    try {
      const cloudAdmin = persistenceSyncService.getCachedCloudAdminAccount();
      if (cloudAdmin && this.isRecordConfigured(cloudAdmin)) {
        establishedAdmin = cloudAdmin;
        establishedAdminTime = Math.max(
          cloudAdmin.password_updated_at ? new Date(cloudAdmin.password_updated_at).getTime() || 0 : 0,
          cloudAdmin.recovery_code_created_at ? new Date(cloudAdmin.recovery_code_created_at).getTime() || 0 : 0,
          cloudAdmin.updated_at ? new Date(cloudAdmin.updated_at).getTime() || 0 : 0,
          cloudAdmin.created_at ? new Date(cloudAdmin.created_at).getTime() || 0 : 0
        );
      }
    } catch {}

    const backupCandidates = this.getCandidateBackupPaths();

    for (const bPath of backupCandidates) {
      try {
        if (fs.existsSync(bPath)) {
          const payload = JSON.parse(fs.readFileSync(bPath, 'utf-8'));
          if (Array.isArray(payload?.tables?.admin_accounts) && payload.tables.admin_accounts.length > 0) {
            const found = payload.tables.admin_accounts[0];
            if (this.isRecordConfigured(found)) {
              const t = Math.max(
                found.password_updated_at ? new Date(found.password_updated_at).getTime() || 0 : 0,
                found.recovery_code_created_at ? new Date(found.recovery_code_created_at).getTime() || 0 : 0,
                found.updated_at ? new Date(found.updated_at).getTime() || 0 : 0,
                found.created_at ? new Date(found.created_at).getTime() || 0 : 0
              );
              if (t > establishedAdminTime || !establishedAdmin) {
                establishedAdmin = found;
                establishedAdminTime = t;
              }
            }
          }
        }
      } catch {}
    }
    return establishedAdmin;
  }

  /**
   * CRITICAL PERSISTENCE MANDATE:
   * Only insert default admin if NO admin account exists at all.
   * If an admin account exists: NEVER overwrite password_hash, NEVER overwrite login_id, NEVER overwrite email.
   * If an established admin account exists in Cloud Firestore or immutable backup, restore and preserve it across all restarts.
   */
  public ensureDefaultAdminAccount(): void {
    try {
      const db = this.getDb();
      const stmt = db.prepare('SELECT * FROM admin_accounts LIMIT 1');
      const existing = stmt.get() as unknown as AdminAccountRecord | undefined;

      // Check if an established admin record exists in Cloud Firestore cache or persistent backups
      const establishedAdmin: any = this.getEstablishedAdminFromBackups();
      const establishedAdminTime = establishedAdmin ? Math.max(
        establishedAdmin.password_updated_at ? new Date(establishedAdmin.password_updated_at).getTime() || 0 : 0,
        establishedAdmin.recovery_code_created_at ? new Date(establishedAdmin.recovery_code_created_at).getTime() || 0 : 0,
        establishedAdmin.updated_at ? new Date(establishedAdmin.updated_at).getTime() || 0 : 0,
        establishedAdmin.created_at ? new Date(establishedAdmin.created_at).getTime() || 0 : 0
      ) : 0;

      if (!existing) {
        if (establishedAdmin) {
          const insertStmt = db.prepare(`
            INSERT INTO admin_accounts (
              id, login_id, email, recovery_email, full_name, password_hash, password_updated_at,
              reset_token_hash, reset_token_expires_at, recovery_code_hash, recovery_code_used,
              recovery_code_created_at, session_version, first_time_setup_completed, status, last_login_at, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);

          insertStmt.run(
            establishedAdmin.id || DEFAULT_SUPER_ADMIN_ID,
            establishedAdmin.login_id || DEFAULT_SUPER_ADMIN_LOGIN_ID,
            (establishedAdmin.email || DEFAULT_SUPER_ADMIN_EMAIL).toLowerCase(),
            (establishedAdmin.recovery_email || DEFAULT_RECOVERY_EMAIL).toLowerCase(),
            establishedAdmin.full_name || 'Ban Quản trị Hệ thống Không Gian Chủ Nhiệm Số',
            establishedAdmin.password_hash,
            establishedAdmin.password_updated_at || null,
            establishedAdmin.reset_token_hash || null,
            establishedAdmin.reset_token_expires_at || null,
            establishedAdmin.recovery_code_hash || null,
            establishedAdmin.recovery_code_used ?? 0,
            establishedAdmin.recovery_code_created_at || establishedAdmin.updated_at || '2025-01-01T00:00:00.000Z',
            establishedAdmin.session_version || 1,
            1,    // first_time_setup_completed = 1
            establishedAdmin.status || 'ACTIVE',
            establishedAdmin.last_login_at || null,
            establishedAdmin.created_at || '2025-01-01T00:00:00.000Z',
            establishedAdmin.updated_at || '2025-01-01T00:00:00.000Z'
          );
          console.log('[AdminAccountRepository] Restored and protected established SUPER_ADMIN account from persistent storage.');
          return;
        }

        const id = DEFAULT_SUPER_ADMIN_ID;
        const loginId = DEFAULT_SUPER_ADMIN_LOGIN_ID;
        const email = DEFAULT_SUPER_ADMIN_EMAIL.toLowerCase();
        const recoveryEmail = DEFAULT_RECOVERY_EMAIL.toLowerCase();
        const fullName = 'Ban Quản trị Hệ thống Không Gian Chủ Nhiệm Số';
        const passwordHash = hashSecret(DEFAULT_INITIAL_ADMIN_PASSWORD);
        const recoveryCodeHash = hashSecret(DEFAULT_INITIAL_RECOVERY_CODE);
        const epochIso = '1970-01-01T00:00:00.000Z';

        const insertStmt = db.prepare(`
          INSERT INTO admin_accounts (
            id, login_id, email, recovery_email, full_name, password_hash, password_updated_at,
            reset_token_hash, reset_token_expires_at, recovery_code_hash, recovery_code_used,
            recovery_code_created_at, session_version, first_time_setup_completed, status, last_login_at, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, NULL, ?, 0, ?, 1, 0, 'ACTIVE', NULL, ?, ?)
        `);

        insertStmt.run(id, loginId, email, recoveryEmail, fullName, passwordHash, recoveryCodeHash, epochIso, epochIso, epochIso);
        console.log('[AdminAccountRepository] Initialized fallback unconfigured SUPER_ADMIN account in database.');
      } else {
        const existingTime = Math.max(
          existing.password_updated_at ? new Date(existing.password_updated_at).getTime() || 0 : 0,
          (existing as any).recovery_code_created_at ? new Date((existing as any).recovery_code_created_at).getTime() || 0 : 0,
          (existing as any).updated_at ? new Date((existing as any).updated_at).getTime() || 0 : 0,
          (existing as any).created_at ? new Date((existing as any).created_at).getTime() || 0 : 0
        );
        const isExistingConfigured = this.isRecordConfigured(existing);

        // If existing record was unconfigured but persistent storage has established record, sync from persistent storage
        if (!isExistingConfigured && establishedAdmin) {
          db.prepare(`
            UPDATE admin_accounts SET
              login_id = ?, email = ?, recovery_email = ?, full_name = ?,
              password_hash = ?, password_updated_at = ?, recovery_code_hash = ?,
              recovery_code_used = 0, recovery_code_created_at = ?, session_version = ?,
              first_time_setup_completed = 1, status = 'ACTIVE', updated_at = ?
            WHERE id = ?
          `).run(
            establishedAdmin.login_id || DEFAULT_SUPER_ADMIN_LOGIN_ID,
            (establishedAdmin.email || DEFAULT_SUPER_ADMIN_EMAIL).toLowerCase(),
            (establishedAdmin.recovery_email || DEFAULT_RECOVERY_EMAIL).toLowerCase(),
            establishedAdmin.full_name || 'Ban Quản trị Hệ thống Không Gian Chủ Nhiệm Số',
            establishedAdmin.password_hash,
            establishedAdmin.password_updated_at || null,
            establishedAdmin.recovery_code_hash || existing.recovery_code_hash,
            establishedAdmin.recovery_code_created_at || establishedAdmin.updated_at,
            establishedAdmin.session_version || 1,
            establishedAdmin.updated_at || new Date().toISOString(),
            existing.id
          );
          console.log('[AdminAccountRepository] Restored established Super Admin credentials from persistent storage.');
        } else if (establishedAdmin && establishedAdminTime > existingTime && isExistingConfigured) {
          // Persistent storage has strictly newer configured credentials than existing
          db.prepare(`
            UPDATE admin_accounts SET
              login_id = ?, email = ?, recovery_email = ?, full_name = ?,
              password_hash = ?, password_updated_at = ?, recovery_code_hash = ?,
              recovery_code_used = 0, recovery_code_created_at = ?, session_version = ?,
              first_time_setup_completed = 1, status = 'ACTIVE', updated_at = ?
            WHERE id = ?
          `).run(
            establishedAdmin.login_id || DEFAULT_SUPER_ADMIN_LOGIN_ID,
            (establishedAdmin.email || DEFAULT_SUPER_ADMIN_EMAIL).toLowerCase(),
            (establishedAdmin.recovery_email || DEFAULT_RECOVERY_EMAIL).toLowerCase(),
            establishedAdmin.full_name || 'Ban Quản trị Hệ thống Không Gian Chủ Nhiệm Số',
            establishedAdmin.password_hash,
            establishedAdmin.password_updated_at || null,
            establishedAdmin.recovery_code_hash || existing.recovery_code_hash,
            establishedAdmin.recovery_code_created_at || establishedAdmin.updated_at,
            establishedAdmin.session_version || 1,
            establishedAdmin.updated_at || new Date().toISOString(),
            existing.id
          );
        } else {
          // Preserve existing configured account and ensure first_time_setup_completed = 1
          if (isExistingConfigured && existing.first_time_setup_completed !== 1) {
            db.prepare('UPDATE admin_accounts SET first_time_setup_completed = 1 WHERE id = ?').run(existing.id);
          }
          if (!existing.login_id) {
            db.prepare('UPDATE admin_accounts SET login_id = ? WHERE id = ?').run(DEFAULT_SUPER_ADMIN_LOGIN_ID, existing.id);
          }
          if (!existing.recovery_email) {
            db.prepare('UPDATE admin_accounts SET recovery_email = ? WHERE id = ?').run(DEFAULT_RECOVERY_EMAIL.toLowerCase(), existing.id);
          }
          if (typeof existing.session_version !== 'number' || isNaN(existing.session_version)) {
            db.prepare('UPDATE admin_accounts SET session_version = 1 WHERE id = ?').run(existing.id);
          }
        }
      }
    } catch (err) {
      console.warn('[AdminAccountRepository] Error ensuring default admin account:', err);
    }
  }

  /**
   * Look up Admin by Login ID (e.g. 'admin') or registered Admin Email.
   */
  public findByLoginIdentifier(identifier: string): AdminAccountRecord | null {
    try {
      this.ensureDefaultAdminAccount();
      const clean = (identifier || '').trim().toLowerCase();
      if (!clean) return null;

      const db = this.getDb();
      const stmt = db.prepare(`
        SELECT * FROM admin_accounts
        WHERE LOWER(login_id) = ? OR LOWER(email) = ? OR LOWER(recovery_email) = ?
        LIMIT 1
      `);
      const row = stmt.get(clean, clean, clean) as unknown as AdminAccountRecord | undefined;
      return row || null;
    } catch (err) {
      console.error('[AdminAccountRepository] findByLoginIdentifier error:', err);
      return null;
    }
  }

  public findByEmail(email: string): AdminAccountRecord | null {
    return this.findByLoginIdentifier(email);
  }

  public findById(id: string): AdminAccountRecord | null {
    try {
      this.ensureDefaultAdminAccount();
      const db = this.getDb();
      const stmt = db.prepare('SELECT * FROM admin_accounts WHERE id = ? LIMIT 1');
      let row = stmt.get(id) as unknown as AdminAccountRecord | undefined;
      if (!row && (id === 'usr_sa_google_official' || id === DEFAULT_SUPER_ADMIN_ID)) {
        row = (stmt.get(DEFAULT_SUPER_ADMIN_ID) || db.prepare('SELECT * FROM admin_accounts LIMIT 1').get()) as unknown as AdminAccountRecord | undefined;
      }
      return row || null;
    } catch (err) {
      console.error('[AdminAccountRepository] findById error:', err);
      return null;
    }
  }

  /**
   * Check status of Admin account for login and setup workflows
   */
  public getAdminStatus(identifier?: string): {
    exists: boolean;
    firstTimeSetupRequired: boolean;
    emailConfigured: boolean;
    hasRecoveryCode: boolean;
    loginId?: string;
    email?: string;
    maskedEmail?: string;
    statusError?: string;
  } {
    try {
      this.ensureDefaultAdminAccount();
      let admin = identifier ? this.findByLoginIdentifier(identifier) : null;
      if (!admin) {
        admin = this.findById(DEFAULT_SUPER_ADMIN_ID) || this.findByLoginIdentifier(DEFAULT_SUPER_ADMIN_LOGIN_ID);
      }
      if (!admin) {
        try {
          const anyRow = this.getDb().prepare('SELECT * FROM admin_accounts LIMIT 1').get() as unknown as AdminAccountRecord | undefined;
          if (anyRow) admin = anyRow;
        } catch {}
      }

      let isConfigured = this.isRecordConfigured(admin);

      // If DB has no admin or DB record is unconfigured, check backups immediately!
      if (!admin || !isConfigured) {
        const established = this.getEstablishedAdminFromBackups();
        if (established) {
          try {
            this.persistAdminAccountSnapshot(established);
            admin = established;
            isConfigured = true;
          } catch {}
        }
      }

      if (!admin) {
        // MANDATE: Only confirm firstTimeSetupRequired = true if verified that no admin has EVER been configured
        return {
          exists: false,
          firstTimeSetupRequired: true,
          emailConfigured: false,
          hasRecoveryCode: false
        };
      }

      // Self-heal: If configured but first_time_setup_completed was not 1, update it immediately
      if (isConfigured && admin.first_time_setup_completed !== 1) {
        try {
          this.getDb().prepare('UPDATE admin_accounts SET first_time_setup_completed = 1 WHERE id = ?').run(admin.id);
          admin.first_time_setup_completed = 1;
        } catch {}
      }

      const firstTimeSetupRequired = !isConfigured;
      const targetEmail = admin.recovery_email || admin.email;
      const [u, d] = (targetEmail || 'admin@domain.com').split('@');
      const maskedEmail = d ? `${(u || '').slice(0, 3)}***@${d}` : 'admin***@domain.com';

      return {
        exists: true,
        firstTimeSetupRequired,
        emailConfigured: true,
        hasRecoveryCode: Boolean(admin.recovery_code_hash && admin.recovery_code_used === 0),
        loginId: admin.login_id || 'admin',
        email: admin.email,
        maskedEmail
      };
    } catch (err: any) {
      console.error('[AdminAccountRepository] getAdminStatus read error:', err?.message);
      // MANDATE: When API, database or temporary error occurs, NEVER force first-time setup
      return {
        exists: true,
        firstTimeSetupRequired: false,
        emailConfigured: true,
        hasRecoveryCode: true,
        statusError: 'DB_READ_ERROR'
      };
    }
  }

  /**
   * Primary Admin Authentication method.
   * Accepts Login ID (e.g. 'admin') or registered Admin Email, Password, and Recovery Code.
   */
  public authenticate(identifier: string, passwordPlain: string, recoveryCodePlain?: string): {
    success: boolean;
    message?: string;
    errorCode?: string;
    firstTimeSetupRequired?: boolean;
    admin?: SanitizedAdminAccount;
  } {
    const cleanIdentifier = (identifier || 'admin').trim();
    const cleanPass = (passwordPlain || '').trim();
    const cleanRecovery = (recoveryCodePlain || '').trim();

    if (!cleanPass) {
      return { success: false, errorCode: 'PASSWORD_REQUIRED', message: 'Vui lòng nhập Mật khẩu Quản trị viên.' };
    }

    if (!cleanRecovery) {
      return { success: false, errorCode: 'INVALID_CREDENTIALS', message: 'Thông tin đăng nhập không hợp lệ.' };
    }

    const admin = this.findByLoginIdentifier(cleanIdentifier) || this.findById(DEFAULT_SUPER_ADMIN_ID);
    if (!admin) {
      return {
        success: false,
        errorCode: 'INVALID_CREDENTIALS',
        message: 'Thông tin đăng nhập không hợp lệ.'
      };
    }

    if (admin.status !== 'ACTIVE') {
      return {
        success: false,
        errorCode: 'ACCOUNT_LOCKED',
        message: 'Tài khoản Quản trị viên hiện đang bị tạm khóa. Vui lòng liên hệ hỗ trợ kỹ thuật.'
      };
    }

    const now = new Date();
    const nowMs = now.getTime();

    // Check temporary lockout cooldown if previous failed attempts exceeded threshold
    if (admin.locked_until) {
      const lockUntilMs = new Date(admin.locked_until).getTime();
      if (lockUntilMs > nowMs) {
        const remainingMinutes = Math.ceil((lockUntilMs - nowMs) / 60000);
        return {
          success: false,
          errorCode: 'ACCOUNT_LOCKED',
          firstTimeSetupRequired: false,
          message: `Tài khoản bị tạm khóa do nhập sai quá nhiều lần. Vui lòng thử lại sau ${remainingMinutes} phút.`
        };
      } else {
        // Lockout expired: cleanly self-heal and reset counter
        try {
          this.getDb().prepare('UPDATE admin_accounts SET failed_attempts = 0, locked_until = NULL WHERE id = ?').run(admin.id);
          admin.failed_attempts = 0;
          admin.locked_until = null;
        } catch (e) {
          console.warn('[AdminAccountRepository] Failed to reset expired lockout:', e);
        }
      }
    }

    // Verify password hash
    const isPasswordValid = verifySecret(cleanPass, admin.password_hash);
    
    // Verify recovery code
    const isRecoveryValid = this.isRecoveryCodeValid(admin, cleanRecovery);

    if (!isPasswordValid || !isRecoveryValid) {
      const currentFailed = (admin.failed_attempts || 0) + 1;
      const db = this.getDb();
      if (currentFailed >= 5) {
        const lockoutTime = new Date(nowMs + 5 * 60 * 1000).toISOString();
        db.prepare('UPDATE admin_accounts SET failed_attempts = ?, locked_until = ?, updated_at = ? WHERE id = ?').run(
          currentFailed,
          lockoutTime,
          now.toISOString(),
          admin.id
        );
        return {
          success: false,
          errorCode: 'ACCOUNT_LOCKED',
          firstTimeSetupRequired: false,
          message: 'Bạn đã nhập sai thông tin xác thực 5 lần liên tiếp. Tài khoản bị tạm khóa trong 5 phút để bảo vệ hệ thống.'
        };
      } else {
        db.prepare('UPDATE admin_accounts SET failed_attempts = ?, updated_at = ? WHERE id = ?').run(
          currentFailed,
          now.toISOString(),
          admin.id
        );
        return {
          success: false,
          errorCode: 'INVALID_CREDENTIALS',
          firstTimeSetupRequired: false,
          message: 'Mật khẩu hoặc Recovery Code Quản trị viên không chính xác. Vui lòng kiểm tra lại.'
        };
      }
    }

    // Update last_login_at and reset failed attempts counter upon successful verification
    const nowIso = this.getMonotonicTimestamp(admin);
    const updatedAdminRecord: AdminAccountRecord = {
      ...admin,
      first_time_setup_completed: 1,
      failed_attempts: 0,
      locked_until: null,
      last_login_at: nowIso,
      updated_at: nowIso
    };
    try {
      const db = this.getDb();
      db.prepare('UPDATE admin_accounts SET first_time_setup_completed = 1, failed_attempts = 0, locked_until = NULL, last_login_at = ?, updated_at = ? WHERE id = ?').run(nowIso, nowIso, admin.id);
      persistenceSyncService.setCachedCloudAdminAccount(updatedAdminRecord);
    } catch (e) {
      console.warn('[AdminAccountRepository] Failed to update last_login_at:', e);
    }

    return {
      success: true,
      firstTimeSetupRequired: false,
      admin: this.sanitizeAdminRecord(updatedAdminRecord)
    };
  }

  /**
   * Backwards-compatible alias for authenticate
   */
  public authenticateWithPassword(emailOrLoginId: string, passwordPlain: string, recoveryCodePlain?: string) {
    return this.authenticate(emailOrLoginId, passwordPlain, recoveryCodePlain);
  }

  /**
   * Change Admin Password while logged in.
   * Requires current password verification (Re-authentication).
   */
  public changePassword(
    adminId: string,
    oldPasswordPlain: string,
    newPasswordPlain: string,
    revokeOtherSessions: boolean = false,
    isGoogleAuthVerified: boolean = false
  ): {
    success: boolean;
    message?: string;
    errorCode?: string;
    sessionVersion?: number;
  } {
    const admin = this.findById(adminId) || this.findById(DEFAULT_SUPER_ADMIN_ID) || this.findByLoginIdentifier(adminId);
    if (!admin) {
      return { success: false, errorCode: 'ADMIN_NOT_FOUND', message: 'Không tìm thấy tài khoản Quản trị viên.' };
    }

    const cleanOld = (oldPasswordPlain || '').trim();
    const cleanNew = (newPasswordPlain || '').trim();

    if (!cleanNew || cleanNew.length < 6) {
      return { success: false, errorCode: 'INVALID_PASSWORD_LENGTH', message: 'Mật khẩu mới phải có tối thiểu 6 ký tự.' };
    }

    // If not verified via Google OAuth, require and verify current password
    if (!isGoogleAuthVerified) {
      if (!cleanOld) {
        return { success: false, errorCode: 'OLD_PASSWORD_REQUIRED', message: 'Vui lòng nhập mật khẩu hiện tại.' };
      }

      if (cleanOld === cleanNew) {
        return { success: false, errorCode: 'PASSWORD_UNCHANGED', message: 'Mật khẩu mới không được trùng với mật khẩu hiện tại.' };
      }

      const isOldValid = verifySecret(cleanOld, admin.password_hash);
      if (!isOldValid) {
        return { success: false, errorCode: 'INVALID_OLD_PASSWORD', message: 'Mật khẩu hiện tại không chính xác.' };
      }
    }

    // Hash new password server-side
    const newHash = hashSecret(cleanNew);
    const now = this.getMonotonicTimestamp(admin);
    const newSessionVersion = revokeOtherSessions ? (admin.session_version || 1) + 1 : (admin.session_version || 1);

    const updatedAdmin: AdminAccountRecord = {
      ...admin,
      password_hash: newHash,
      password_updated_at: now,
      session_version: newSessionVersion,
      first_time_setup_completed: 1,
      failed_attempts: 0,
      locked_until: null,
      status: 'ACTIVE',
      updated_at: now
    };

    this.persistAdminAccountSnapshot(updatedAdmin);

    return {
      success: true,
      sessionVersion: newSessionVersion,
      message: 'Đổi mật khẩu Quản trị viên thành công.'
    };
  }

  /**
   * Synchronize Admin password after successful Firebase Authentication reset / verification.
   * Updates password hash without disrupting Admin UID, email, or tenant data.
   */
  public syncPasswordFromFirebase(
    adminId: string,
    newPasswordPlain: string,
    firebaseUid?: string
  ): {
    success: boolean;
    sessionVersion: number;
  } {
    const admin = this.findById(adminId);
    if (!admin) {
      return { success: false, sessionVersion: 1 };
    }

    const newHash = hashSecret(newPasswordPlain.trim());
    const now = this.getMonotonicTimestamp(admin);
    const newSessionVersion = (admin.session_version || 1) + 1;

    try {
      const updatedAdmin: AdminAccountRecord = {
        ...admin,
        password_hash: newHash,
        password_updated_at: now,
        session_version: newSessionVersion,
        firebase_uid: firebaseUid || admin.firebase_uid,
        first_time_setup_completed: 1,
        status: 'ACTIVE',
        updated_at: now
      };

      this.persistAdminAccountSnapshot(updatedAdmin);

      return { success: true, sessionVersion: newSessionVersion };
    } catch (err) {
      console.warn('[AdminAccountRepository] syncPasswordFromFirebase warning:', err);
      return { success: false, sessionVersion: admin.session_version || 1 };
    }
  }

  /**
   * Generate a secure, one-time Recovery Code for the Admin.
   * Requires re-authentication with current password.
   * Returns plaintext recovery code ONLY to the authenticated admin for offline safekeeping.
   */
  public generateRecoveryCode(
    adminId: string,
    currentPasswordPlain: string,
    isGoogleAuthVerified: boolean = false
  ): {
    success: boolean;
    recoveryCode?: string;
    createdAt?: string;
    message: string;
    errorCode?: string;
  } {
    const admin = this.findById(adminId) || this.findById(DEFAULT_SUPER_ADMIN_ID) || this.findByLoginIdentifier(adminId);
    if (!admin) {
      return { success: false, errorCode: 'ADMIN_NOT_FOUND', message: 'Không tìm thấy tài khoản Quản trị viên.' };
    }

    if (!isGoogleAuthVerified) {
      const cleanPass = (currentPasswordPlain || '').trim();
      if (!cleanPass) {
        return { success: false, errorCode: 'PASSWORD_REQUIRED', message: 'Vui lòng nhập mật khẩu hiện tại để xác thực thao tác bảo mật.' };
      }

      if (!verifySecret(cleanPass, admin.password_hash)) {
        return { success: false, errorCode: 'INVALID_PASSWORD', message: 'Mật khẩu hiện tại không chính xác.' };
      }
    }

    // Generate random secure code: RC-XXXX-XXXX-XXXX (12 uppercase hex chars in 3 groups)
    const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
    const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
    const part3 = crypto.randomBytes(2).toString('hex').toUpperCase();
    const recoveryCode = `RC-${part1}-${part2}-${part3}`;

    // Hash recovery code before storing (never plaintext in DB)
    const codeHash = hashSecret(recoveryCode);
    const now = this.getMonotonicTimestamp(admin);

    const updatedAdmin: AdminAccountRecord = {
      ...admin,
      recovery_code_hash: codeHash,
      recovery_code_used: 0,
      recovery_code_created_at: now,
      first_time_setup_completed: 1,
      failed_attempts: 0,
      locked_until: null,
      status: 'ACTIVE',
      updated_at: now
    };

    this.persistAdminAccountSnapshot(updatedAdmin);

    return {
      success: true,
      recoveryCode,
      createdAt: now,
      message: 'Mã khôi phục bí mật đã được tạo thành công. Hãy ghi nhớ hoặc lưu vào nơi an toàn.'
    };
  }

  /**
   * Canonical normalization for recovery codes:
   * Trims outer whitespace, strips all internal whitespace, and converts to uppercase.
   */
  public normalizeRecoveryCode(rawCode: string): string {
    if (!rawCode || typeof rawCode !== 'string') return '';
    const clean = rawCode.trim().replace(/\s+/g, '').toUpperCase();
    if (clean.startsWith('RC') && clean.length === 14 && !clean.includes('-')) {
      return `RC-${clean.slice(2, 6)}-${clean.slice(6, 10)}-${clean.slice(10, 14)}`;
    }
    if (clean.startsWith('KGCN') && clean.length === 16 && !clean.includes('-')) {
      return `KGCN-${clean.slice(4, 8)}-${clean.slice(8, 12)}-${clean.slice(12, 16)}`;
    }
    return clean;
  }

  /**
   * Check if a given recovery code matches the Admin's active recovery code.
   * If a custom recovery code has been set, only the hash match is valid.
   * Flexibly normalizes hyphens, casing, and spaces for zero-friction verification.
   */
  public isRecoveryCodeValid(admin: AdminAccountRecord, recoveryCode: string): boolean {
    const cleanCode = (recoveryCode || '').trim();
    if (!cleanCode) return false;
    if (admin.recovery_code_used === 1) return false;

    if (admin.recovery_code_hash) {
      // 1. Canonical normalization (uppercase, all internal whitespace stripped)
      const normInput = this.normalizeRecoveryCode(cleanCode);
      if (normInput && verifySecret(normInput, admin.recovery_code_hash)) {
        return true;
      }

      // 2. Direct match with exact string
      if (verifySecret(cleanCode, admin.recovery_code_hash)) {
        return true;
      }

      // 3. Uppercase match with original spacing
      if (verifySecret(cleanCode.toUpperCase(), admin.recovery_code_hash)) {
        return true;
      }

      // 4. Normalized without hyphens and spaces
      const stripped = cleanCode.replace(/[-\s]/g, '').toUpperCase();
      if (verifySecret(stripped, admin.recovery_code_hash)) {
        return true;
      }

      // 5. Pattern-based hyphenation reconstruction for legacy hashes:
      // RC-XXXX-XXXX-XXXX (14 chars)
      if (stripped.startsWith('RC') && stripped.length === 14) {
        const formattedRC = 'RC-' + stripped.slice(2, 6) + '-' + stripped.slice(6, 10) + '-' + stripped.slice(10, 14);
        if (verifySecret(formattedRC, admin.recovery_code_hash)) return true;
      }

      // KGCN-XXXX-XXXX-XXXX (16 chars)
      if (stripped.startsWith('KGCN') && stripped.length === 16) {
        const formattedKGCN = 'KGCN-' + stripped.slice(4, 8) + '-' + stripped.slice(8, 12) + '-' + stripped.slice(12, 16);
        if (verifySecret(formattedKGCN, admin.recovery_code_hash)) return true;
      }

      // 12-char hex without prefix
      if (stripped.length === 12) {
        const rcCandidate = 'RC-' + stripped.slice(0, 4) + '-' + stripped.slice(4, 8) + '-' + stripped.slice(8, 12);
        if (verifySecret(rcCandidate, admin.recovery_code_hash)) return true;
        const kgcnCandidate = 'KGCN-' + stripped.slice(0, 4) + '-' + stripped.slice(4, 8) + '-' + stripped.slice(8, 12);
        if (verifySecret(kgcnCandidate, admin.recovery_code_hash)) return true;
      }

      return false;
    }

    return false;
  }

  /**
   * Step 1: Verify current Recovery Code before allowing password reset.
   * Accurately reports the real cause of any failure (lockout, DB error, suspended account, invalid code).
   */
  public verifyRecoveryCode(identifier: string, recoveryCode: string): {
    success: boolean;
    message: string;
    errorCode?: string;
    loginId?: string;
  } {
    const cleanId = (identifier || '').trim();
    const cleanCode = (recoveryCode || '').trim();

    if (!cleanId) {
      return { success: false, errorCode: 'LOGIN_ID_REQUIRED', message: 'Vui lòng nhập Tên đăng nhập hoặc Email Quản trị viên.' };
    }

    if (!cleanCode) {
      return { success: false, errorCode: 'RECOVERY_CODE_REQUIRED', message: 'Vui lòng nhập Mã Recovery Code hiện hành.' };
    }

    let admin: AdminAccountRecord | null = null;
    try {
      admin = this.findByLoginIdentifier(cleanId) || this.findById(cleanId) || (['admin', 'superadmin', 'super_admin', 'administrator', 'root'].includes(cleanId.toLowerCase()) ? this.findById(DEFAULT_SUPER_ADMIN_ID) : null);
    } catch (dbErr: any) {
      return {
        success: false,
        errorCode: 'DATABASE_ERROR',
        message: 'Lỗi truy vấn cơ sở dữ liệu khi xác minh tài khoản. Vui lòng thử lại sau.'
      };
    }

    if (!admin) {
      return { success: false, errorCode: 'ADMIN_NOT_FOUND', message: 'Tài khoản Quản trị viên không tồn tại trong hệ thống.' };
    }

    if (admin.status !== 'ACTIVE') {
      return { success: false, errorCode: 'ACCOUNT_SUSPENDED', message: 'Tài khoản Quản trị viên hiện đang bị khóa hoặc tạm dừng.' };
    }

    if (admin.locked_until) {
      const lockUntilMs = new Date(admin.locked_until).getTime();
      const nowMs = Date.now();
      if (lockUntilMs > nowMs) {
        const remainingMinutes = Math.ceil((lockUntilMs - nowMs) / 60000);
        return {
          success: false,
          errorCode: 'ACCOUNT_LOCKED',
          message: `Tài khoản bị tạm khóa do nhập sai quá nhiều lần. Vui lòng thử lại sau ${remainingMinutes} phút.`
        };
      } else {
        // Lockout expired: cleanly self-heal and reset counter
        try {
          this.getDb().prepare('UPDATE admin_accounts SET failed_attempts = 0, locked_until = NULL WHERE id = ?').run(admin.id);
          admin.failed_attempts = 0;
          admin.locked_until = null;
        } catch {}
      }
    }

    if (!admin.recovery_code_hash) {
      return {
        success: false,
        errorCode: 'RECOVERY_CODE_NOT_CONFIGURED',
        message: 'Tài khoản chưa có Recovery Code được kích hoạt.'
      };
    }

    let isMatch = false;
    try {
      isMatch = this.isRecoveryCodeValid(admin, cleanCode);
    } catch (verifyErr: any) {
      return {
        success: false,
        errorCode: 'INTERNAL_ERROR',
        message: 'Lỗi nội bộ khi xác thực mã khôi phục. Vui lòng thử lại sau.'
      };
    }

    if (!isMatch) {
      return {
        success: false,
        errorCode: 'INVALID_RECOVERY_CODE',
        message: 'Mã Recovery Code không chính xác. Vui lòng kiểm tra lại.'
      };
    }

    // Reset failed attempts upon successful verification
    try {
      this.getDb().prepare('UPDATE admin_accounts SET failed_attempts = 0, locked_until = NULL WHERE id = ?').run(admin.id);
      admin.failed_attempts = 0;
      admin.locked_until = null;
    } catch {}

    return {
      success: true,
      loginId: admin.login_id || 'admin',
      message: 'Xác minh Recovery Code thành công.'
    };
  }

  /**
   * Set or update custom Recovery Code for Admin.
   * Requires identity verification with current Admin password OR verified Google OAuth Super Admin session.
   * Requires confirmation of new Recovery Code before saving.
   * Once updated, only the new code is accepted; old code is invalidated.
   */
  public setCustomRecoveryCode(
    adminId: string,
    currentPasswordPlain: string,
    newRecoveryCodePlain: string,
    confirmRecoveryCodePlain: string,
    isGoogleAuthVerified: boolean = false
  ): {
    success: boolean;
    message: string;
    errorCode?: string;
    createdAt?: string;
  } {
    const admin = this.findById(adminId) || this.findById(DEFAULT_SUPER_ADMIN_ID) || this.findByLoginIdentifier(adminId);
    if (!admin) {
      return { success: false, errorCode: 'ADMIN_NOT_FOUND', message: 'Không tìm thấy tài khoản Quản trị viên.' };
    }

    const cleanPass = (currentPasswordPlain || '').trim();
    const cleanNewCode = (newRecoveryCodePlain || '').trim();
    const cleanConfirmCode = (confirmRecoveryCodePlain || '').trim();

    if (!isGoogleAuthVerified) {
      if (!cleanPass) {
        return { success: false, errorCode: 'PASSWORD_REQUIRED', message: 'Vui lòng nhập mật khẩu Quản trị viên hiện tại để xác thực.' };
      }

      if (!verifySecret(cleanPass, admin.password_hash)) {
        return { success: false, errorCode: 'INVALID_PASSWORD', message: 'Mật khẩu hiện tại không chính xác. Không thể đổi Recovery Code.' };
      }
    }

    const normNewCode = this.normalizeRecoveryCode(cleanNewCode);
    const normConfirmCode = this.normalizeRecoveryCode(cleanConfirmCode);

    if (!normNewCode || normNewCode.length < 6) {
      return { success: false, errorCode: 'INVALID_CODE_LENGTH', message: 'Recovery Code mới phải có tối thiểu 6 ký tự.' };
    }

    if (normNewCode !== normConfirmCode) {
      return { success: false, errorCode: 'CODE_CONFIRM_MISMATCH', message: 'Mã Recovery Code xác nhận không khớp. Vui lòng nhập lại chính xác.' };
    }

    const codeHash = hashSecret(normNewCode);
    const now = this.getMonotonicTimestamp(admin);

    const updatedAdmin: AdminAccountRecord = {
      ...admin,
      recovery_code_hash: codeHash,
      recovery_code_used: 0,
      recovery_code_created_at: now,
      first_time_setup_completed: 1,
      failed_attempts: 0,
      locked_until: null,
      status: 'ACTIVE',
      updated_at: now
    };

    this.persistAdminAccountSnapshot(updatedAdmin);

    return {
      success: true,
      createdAt: now,
      message: 'Thiết lập Recovery Code mới thành công. Mã mới đã thay thế hoàn toàn mã cũ và có hiệu lực ngay lập tức.'
    };
  }

  /**
   * Recover Admin Password using Login Identifier + Secret Recovery Code.
   * Only allows reset after validating the current recovery code.
   */
  public resetPasswordWithRecoveryCode(
    identifier: string,
    recoveryCode: string,
    newPasswordPlain: string
  ): {
    success: boolean;
    message: string;
    errorCode?: string;
  } {
    const cleanId = (identifier || '').trim();
    const cleanCode = (recoveryCode || '').trim();
    const cleanPass = (newPasswordPlain || '').trim();

    if (!cleanId) {
      return { success: false, errorCode: 'LOGIN_ID_REQUIRED', message: 'Vui lòng nhập Tên đăng nhập hoặc Email Quản trị viên.' };
    }

    if (!cleanCode) {
      return { success: false, errorCode: 'RECOVERY_CODE_REQUIRED', message: 'Vui lòng nhập Mã khôi phục bí mật (Recovery Code).' };
    }

    if (!cleanPass || cleanPass.length < 6) {
      return { success: false, errorCode: 'INVALID_PASSWORD_LENGTH', message: 'Mật khẩu mới phải có tối thiểu 6 ký tự.' };
    }

    let admin: AdminAccountRecord | null = null;
    try {
      admin = this.findByLoginIdentifier(cleanId) || this.findById(cleanId) || (['admin', 'superadmin', 'super_admin', 'administrator', 'root'].includes(cleanId.toLowerCase()) ? this.findById(DEFAULT_SUPER_ADMIN_ID) : null);
    } catch (dbErr: any) {
      return {
        success: false,
        errorCode: 'DATABASE_ERROR',
        message: 'Lỗi truy vấn cơ sở dữ liệu khi khôi phục mật khẩu. Vui lòng thử lại sau.'
      };
    }

    if (!admin) {
      return { success: false, errorCode: 'ADMIN_NOT_FOUND', message: 'Tài khoản Quản trị viên không tồn tại trong hệ thống.' };
    }

    if (admin.status !== 'ACTIVE') {
      return { success: false, errorCode: 'ACCOUNT_SUSPENDED', message: 'Tài khoản Quản trị viên hiện đang bị khóa hoặc tạm dừng.' };
    }

    if (admin.locked_until) {
      const lockUntilMs = new Date(admin.locked_until).getTime();
      const nowMs = Date.now();
      if (lockUntilMs > nowMs) {
        const remainingMinutes = Math.ceil((lockUntilMs - nowMs) / 60000);
        return {
          success: false,
          errorCode: 'ACCOUNT_LOCKED',
          message: `Tài khoản bị tạm khóa do nhập sai quá nhiều lần. Vui lòng thử lại sau ${remainingMinutes} phút.`
        };
      } else {
        try {
          this.getDb().prepare('UPDATE admin_accounts SET failed_attempts = 0, locked_until = NULL WHERE id = ?').run(admin.id);
          admin.failed_attempts = 0;
          admin.locked_until = null;
        } catch {}
      }
    }

    let isMatch = false;
    try {
      isMatch = this.isRecoveryCodeValid(admin, cleanCode);
    } catch (verifyErr: any) {
      return {
        success: false,
        errorCode: 'INTERNAL_ERROR',
        message: 'Lỗi nội bộ khi xác thực mã khôi phục. Vui lòng thử lại sau.'
      };
    }

    if (!isMatch) {
      return {
        success: false,
        errorCode: 'INVALID_RECOVERY_CODE',
        message: 'Mã khôi phục bí mật (Recovery Code) không chính xác.'
      };
    }

    const newHash = hashSecret(cleanPass);
    const now = this.getMonotonicTimestamp(admin);
    const newSessionVersion = (admin.session_version || 1) + 1;

    const updatedAdmin: AdminAccountRecord = {
      ...admin,
      password_hash: newHash,
      password_updated_at: now,
      first_time_setup_completed: 1,
      recovery_code_used: 1,
      failed_attempts: 0,
      locked_until: null,
      session_version: newSessionVersion,
      status: 'ACTIVE',
      updated_at: now
    };

    this.persistAdminAccountSnapshot(updatedAdmin);

    return {
      success: true,
      message: 'Đặt lại mật khẩu Quản trị viên thành công. Vui lòng đăng nhập với mật khẩu mới.'
    };
  }

  /**
   * Revoke all existing sessions for the Admin (Session Version bump).
   */
  public revokeAllSessions(adminId: string): { success: boolean; newSessionVersion: number } {
    const admin = this.findById(adminId);
    if (!admin) return { success: false, newSessionVersion: 1 };

    const newSessionVersion = (admin.session_version || 1) + 1;
    const now = this.getMonotonicTimestamp(admin);
    const db = this.getDb();

    const updatedAdmin: AdminAccountRecord = {
      ...admin,
      session_version: newSessionVersion,
      first_time_setup_completed: 1,
      updated_at: now
    };
    this.persistAdminAccountSnapshot(updatedAdmin);

    // Delete active sessions for this admin in auth_sessions
    try {
      db.prepare("DELETE FROM auth_sessions WHERE user_id = ? OR role = 'SUPER_ADMIN'").run(admin.id);
    } catch (e) {
      console.warn('[AdminAccountRepository] Failed to prune auth_sessions:', e);
    }

    return { success: true, newSessionVersion };
  }

  /**
   * Get sanitized admin profile for UI settings.
   */
  public getAdminProfile(adminId: string): SanitizedAdminAccount | null {
    const admin = this.findById(adminId);
    if (!admin) return null;
    return this.sanitizeAdminRecord(admin);
  }

  public updateRecoveryEmail(adminId: string, newRecoveryEmail: string): {
    success: boolean;
    message: string;
  } {
    const cleanEmail = (newRecoveryEmail || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, message: 'Vui lòng nhập địa chỉ email khôi phục hợp lệ.' };
    }

    const admin = this.findById(adminId);
    if (!admin) {
      return { success: false, message: 'Không tìm thấy tài khoản Quản trị viên.' };
    }

    const now = this.getMonotonicTimestamp(admin);
    const updatedAdmin: AdminAccountRecord = {
      ...admin,
      recovery_email: cleanEmail,
      updated_at: now
    };

    this.persistAdminAccountSnapshot(updatedAdmin);

    return {
      success: true,
      message: 'Cập nhật email khôi phục thành công.'
    };
  }

  /**
   * Create cryptographically secure 6-digit Reset Token for Admin
   */
  public createPasswordResetToken(identifier: string): {
    success: boolean;
    token?: string;
    expiresAt?: string;
    admin?: AdminAccountRecord;
    message: string;
    errorCode?: string;
  } {
    const admin = this.findByLoginIdentifier(identifier);
    if (!admin) {
      return { success: false, errorCode: 'ADMIN_NOT_FOUND', message: 'Không tìm thấy tài khoản Quản trị viên tương ứng.' };
    }
    const token = crypto.randomInt(100000, 999999).toString();
    const tokenHash = hashSecret(token);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const now = this.getMonotonicTimestamp(admin);

    const db = this.getDb();
    db.prepare(`
      UPDATE admin_accounts
      SET reset_token_hash = ?, reset_token_expires_at = ?, updated_at = ?
      WHERE id = ?
    `).run(tokenHash, expiresAt, now, admin.id);

    try {
      persistenceSyncService.flushToPersistentBackup();
    } catch {}

    return {
      success: true,
      token,
      expiresAt,
      admin,
      message: 'Đã tạo mã xác thực đặt lại mật khẩu.'
    };
  }

  /**
   * Reset password using single-use 6-digit Reset Token
   */
  public resetPasswordWithToken(identifier: string, token: string, newPasswordPlain: string): {
    success: boolean;
    message: string;
    errorCode?: string;
  } {
    const cleanId = (identifier || '').trim();
    const cleanToken = (token || '').trim();
    const cleanPass = (newPasswordPlain || '').trim();

    if (!cleanId) {
      return { success: false, errorCode: 'LOGIN_ID_REQUIRED', message: 'Vui lòng nhập Tên đăng nhập hoặc Email Quản trị viên.' };
    }
    if (!cleanToken) {
      return { success: false, errorCode: 'TOKEN_REQUIRED', message: 'Vui lòng nhập Mã xác thực gồm 6 chữ số.' };
    }
    if (!cleanPass || cleanPass.length < 6) {
      return { success: false, errorCode: 'INVALID_PASSWORD_LENGTH', message: 'Mật khẩu mới phải có tối thiểu 6 ký tự.' };
    }

    const admin = this.findByLoginIdentifier(cleanId);
    if (!admin || !admin.reset_token_hash || !admin.reset_token_expires_at) {
      return { success: false, errorCode: 'INVALID_TOKEN', message: 'Mã xác thực không hợp lệ hoặc chưa được yêu cầu.' };
    }
    if (new Date() > new Date(admin.reset_token_expires_at)) {
      return { success: false, errorCode: 'TOKEN_EXPIRED', message: 'Mã xác thực đã hết hạn (hiệu lực 15 phút). Vui lòng yêu cầu mã mới.' };
    }
    if (!verifySecret(cleanToken, admin.reset_token_hash)) {
      return { success: false, errorCode: 'INVALID_TOKEN', message: 'Mã xác thực không chính xác.' };
    }

    const newHash = hashSecret(cleanPass);
    const now = this.getMonotonicTimestamp(admin);
    const newSessionVersion = (admin.session_version || 1) + 1;

    const updatedAdmin: AdminAccountRecord = {
      ...admin,
      password_hash: newHash,
      password_updated_at: now,
      reset_token_hash: null,
      reset_token_expires_at: null,
      session_version: newSessionVersion,
      first_time_setup_completed: 1,
      status: 'ACTIVE',
      updated_at: now
    };

    this.persistAdminAccountSnapshot(updatedAdmin);

    return { success: true, message: 'Đặt lại mật khẩu Quản trị viên thành công. Vui lòng đăng nhập với mật khẩu mới.' };
  }

  /**
   * First-time password setup for Admin account
   */
  public setupFirstTimePassword(identifier: string, newPasswordPlain: string, setupCode?: string): {
    success: boolean;
    message: string;
    errorCode?: string;
  } {
    const cleanId = (identifier || '').trim();
    const cleanPass = (newPasswordPlain || '').trim();
    const cleanCode = (setupCode || '').trim().toUpperCase();

    if (!cleanId) {
      return { success: false, errorCode: 'LOGIN_ID_REQUIRED', message: 'Vui lòng nhập Tên đăng nhập hoặc Email Quản trị viên.' };
    }

    if (!cleanPass || cleanPass.length < 6) {
      return { success: false, errorCode: 'INVALID_PASSWORD_LENGTH', message: 'Mật khẩu mới phải có tối thiểu 6 ký tự.' };
    }

    const admin = this.findByLoginIdentifier(cleanId);
    if (!admin) {
      return { success: false, errorCode: 'ADMIN_NOT_FOUND', message: 'Không tìm thấy tài khoản Quản trị viên tương ứng.' };
    }

    // MANDATE 1: Recovery Code mặc định KHONGGIANCHUNHIEMSO2026 chỉ dùng trong lần thiết lập ban đầu
    const isAlreadyInitialized = (admin.first_time_setup_completed === 1 || Boolean(admin.password_updated_at));
    if (isAlreadyInitialized) {
      return {
        success: false,
        errorCode: 'ALREADY_INITIALIZED',
        message: 'Tài khoản Quản trị viên đã hoàn tất thiết lập ban đầu trước đó. Vui lòng đăng nhập bình thường bằng Mật khẩu Quản trị viên.'
      };
    }

    // Verify mandatory recovery code for first-time setup or access initialization
    if (!cleanCode) {
      return {
        success: false,
        errorCode: 'RECOVERY_CODE_REQUIRED',
        message: 'Vui lòng nhập Mã xác thực khởi tạo (Recovery Code).'
      };
    }

    let isCodeValid = false;
    if (admin.recovery_code_hash && admin.recovery_code_used === 0) {
      isCodeValid = this.isRecoveryCodeValid(admin, cleanCode);
    }

    if (!isCodeValid) {
      return {
        success: false,
        errorCode: 'INVALID_SETUP_CODE',
        message: 'Mã xác thực khởi tạo (Recovery Code) không chính xác hoặc đã qua sử dụng.'
      };
    }

    const newHash = hashSecret(cleanPass);
    const now = this.getMonotonicTimestamp(admin);
    const newSessionVersion = (admin.session_version || 1) + 1;

    const updatedAdminRow: AdminAccountRecord = {
      ...admin,
      password_hash: newHash,
      password_updated_at: now,
      first_time_setup_completed: 1,
      recovery_code_used: 0,
      recovery_code_hash: admin.recovery_code_hash || (cleanCode ? hashSecret(cleanCode) : hashSecret(DEFAULT_INITIAL_RECOVERY_CODE)),
      session_version: newSessionVersion,
      status: 'ACTIVE',
      updated_at: now
    };

    this.persistAdminAccountSnapshot(updatedAdminRow);

    return {
      success: true,
      message: 'Thiết lập mật khẩu Quản trị viên thành công. Bạn có thể đăng nhập ngay bằng mật khẩu vừa tạo.'
    };
  }

  private sanitizeAdminRecord(admin: AdminAccountRecord): SanitizedAdminAccount {
    const isConfigured = this.isRecordConfigured(admin);
    const firstTimeSetupRequired = !isConfigured;
    const hasCustomRecoveryCode = Boolean(admin.recovery_code_hash);
    return {
      id: admin.id,
      loginId: admin.login_id || 'admin',
      email: admin.email,
      recoveryEmail: admin.recovery_email,
      fullName: admin.full_name,
      status: admin.status,
      hasPassword: isConfigured,
      firstTimeSetupRequired,
      hasRecoveryCode: true,
      hasCustomRecoveryCode,
      recoveryCodeCreatedAt: admin.recovery_code_created_at,
      sessionVersion: admin.session_version || 1,
      passwordUpdatedAt: admin.password_updated_at,
      lastLoginAt: admin.last_login_at
    };
  }
}

export const adminAccountRepository = new AdminAccountRepository();
