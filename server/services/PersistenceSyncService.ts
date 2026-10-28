/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { initializeApp, getApps, getApp, App, cert } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getDatabase } from '../db/database';
import { credentialRepository } from '../repositories/CredentialRepository';
import { verifySecret, DEFAULT_INITIAL_ADMIN_PASSWORD, DEFAULT_INITIAL_RECOVERY_CODE } from '../auth/crypto';

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

export interface PersistentDataPayload {
  version: string;
  exportedAt: string;
  tables: Record<string, any[]>;
}

export const PERSISTENT_TABLES = [
  'admin_accounts',
  'auth_sessions',
  'tenants',
  'teacher_accounts',
  'class_settings',
  'credentials',
  'students',
  'academic_records',
  'published_academic_snapshots',
  'timetables',
  'exam_schedules',
  'assignments',
  'training_transactions',
  'training_rule_configs',
  'laurel_trees',
  'attendance_records',
  'graduation_choices',
  'career_profiles',
  'survey_templates',
  'survey_template_versions',
  'survey_responses',
  'survey_sync_proposals',
  'parent_conversations',
  'parent_announcements',
  'notifications',
  'posts',
  'teacher_personal_tasks',
  'system_settings',
  'support_tickets',
  'support_ticket_history',
  'user_feedbacks',
  'user_avatars'
] as const;

function sanitizeDocId(rawId: string): string {
  return String(rawId || 'unknown')
    .trim()
    .replace(/[\/\s]+/g, '__')
    .replace(/^\.+$/, '_dot_')
    .slice(0, 500);
}

export function getCanonicalDocId(tableName: string, row: any): string | null {
  if (!row || typeof row !== 'object') return null;
  switch (tableName) {
    case 'admin_accounts':
      return sanitizeDocId(row.id || 'usr-super-admin');
    case 'teacher_accounts':
      return sanitizeDocId(row.teacher_id || row.id);
    case 'class_settings':
      if (!row.tenant_id) return null;
      return sanitizeDocId(row.class_id ? `${row.tenant_id}__${row.class_id}` : row.tenant_id);
    case 'timetables':
      if (!row.tenant_id || !row.class_id) return null;
      return sanitizeDocId(`${row.tenant_id}__${row.class_id}__${row.academic_year || '2025-2026'}__${row.semester || 'HK1'}`);
    case 'laurel_trees':
      if (!row.tenant_id || !row.student_id) return null;
      return sanitizeDocId(`${row.tenant_id}__${row.student_id}`);
    case 'system_settings':
      if (!row.key) return null;
      return sanitizeDocId(row.key);
    case 'user_avatars':
      if (!row.user_key) return null;
      return sanitizeDocId(row.user_key);
    case 'students':
    case 'academic_records':
    case 'exam_schedules':
    case 'assignments':
    case 'training_transactions':
    case 'training_rule_configs':
    case 'attendance_records':
    case 'graduation_choices':
    case 'career_profiles':
    case 'survey_templates':
    case 'survey_responses':
    case 'parent_conversations':
    case 'parent_announcements':
    case 'notifications':
    case 'posts':
    case 'teacher_personal_tasks':
      if (!row.id) return null;
      return sanitizeDocId(row.tenant_id ? `${row.tenant_id}__${row.id}` : row.id);
    default:
      if (!row.id) return null;
      return sanitizeDocId(row.id);
  }
}

function toFirestoreValue(val: any): any {
  if (val === null || val === undefined) {
    return { nullValue: null };
  }
  if (typeof val === 'boolean') {
    return { booleanValue: val };
  }
  if (typeof val === 'number') {
    if (!Number.isFinite(val)) return { nullValue: null };
    if (Number.isInteger(val)) {
      return { integerValue: String(val) };
    }
    return { doubleValue: val };
  }
  if (typeof val === 'string') {
    return { stringValue: val };
  }
  if (Array.isArray(val)) {
    return {
      arrayValue: {
        values: val.map((item) => toFirestoreValue(item))
      }
    };
  }
  if (typeof val === 'object') {
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) {
        fields[k] = toFirestoreValue(v);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function fromFirestoreValue(valObj: any): any {
  if (!valObj || typeof valObj !== 'object') return null;
  if ('nullValue' in valObj) return null;
  if ('booleanValue' in valObj) return Boolean(valObj.booleanValue);
  if ('integerValue' in valObj) {
    const num = Number(valObj.integerValue);
    return Number.isSafeInteger(num) ? num : String(valObj.integerValue);
  }
  if ('doubleValue' in valObj) return Number(valObj.doubleValue);
  if ('stringValue' in valObj) return String(valObj.stringValue);
  if ('timestampValue' in valObj) return String(valObj.timestampValue);
  if ('arrayValue' in valObj) {
    const values = valObj.arrayValue?.values;
    return Array.isArray(values) ? values.map((v: any) => fromFirestoreValue(v)) : [];
  }
  if ('mapValue' in valObj) {
    const fields = valObj.mapValue?.fields;
    return fields ? fromFirestoreFields(fields) : {};
  }
  return null;
}

function toFirestoreFields(row: Record<string, any>): Record<string, any> {
  const fields: Record<string, any> = {};
  for (const [k, v] of Object.entries(row)) {
    if (v !== undefined) {
      fields[k] = toFirestoreValue(v);
    }
  }
  return fields;
}

function fromFirestoreFields(fields: Record<string, any>): Record<string, any> {
  const obj: Record<string, any> = {};
  if (!fields || typeof fields !== 'object') return obj;
  for (const [k, v] of Object.entries(fields)) {
    obj[k] = fromFirestoreValue(v);
  }
  return obj;
}

export class PersistenceSyncService {
  private static instance: PersistenceSyncService;
  private db: DatabaseSync;
  private primaryBackupFile: string;
  private secondaryBackupFile: string;
  private immutableBackupFile: string;
  private safetySnapshotFile: string;
  private isFlushing = false;
  private hasPendingFlush = false;
  private debouncedTimer: NodeJS.Timeout | null = null;
  private firstDebounceCallTime = 0;
  private snapshotVersionCounter = 0;
  private latestQueuedSnapshotVersion = 0;
  private lastWrittenSnapshotVersion = 0;
  private lastWrittenChangeCount = -1;
  private lastCloudSyncedChangeCount = -1;
  private lastSafetySnapshotChangeCount = -1;
  private lastSafetySnapshotAt = 0;
  private lastBuiltSnapshot: {
    version: number;
    changeCount: number;
    payload: PersistentDataPayload;
    jsonString: string;
    immJsonString: string;
  } | null = null;
  private fileWriteChainPromise: Promise<{ ok: boolean; version: number; error?: string }> = Promise.resolve({
    ok: true,
    version: 0
  });
  private lastLocalBackupError: { timestamp: string; error: string; version: number } | null = null;
  private lastSafetySnapshotError: { timestamp: string; error: string } | null = null;
  private pendingCloudSyncRetry = false;
  private firestoreDb: Firestore | null = null;
  private firestoreCooldownUntil = 0;
  private firestoreWarned = false;
  private firestoreCircuitBreaker = false;
  private projectId = '';
  private firestoreDatabaseId = '(default)';
  private apiKey = '';
  private oAuthClientId = '';
  private cachedFirebaseToken: {
    idToken: string;
    uid: string;
    email: string;
    expiresAtMs: number;
  } | null = null;
  private tokenFetchPromise: Promise<string | null> | null = null;
  private syncedDocHashes = new Map<string, string>();
  private hasCompletedInitialCloudHydration = false;
  private cachedCloudAdminAccount: any | null = null;
  private adminHydrationPromise: Promise<any | null> | null = null;
  private activeCloudSyncPromise: Promise<{ ok: boolean; syncedCount: number; deletedCount: number; error?: string }> | null = null;
  private lastVerificationResult: { connected: boolean; checkedAt: string; message: string; details?: any } | null = null;

  private constructor() {
    this.db = getDatabase();
    this.primaryBackupFile = path.join(process.cwd(), 'server', 'db', 'system_persistence_backup.json');
    this.secondaryBackupFile = path.join(process.cwd(), 'data', 'system_persistence_backup.json');
    this.immutableBackupFile = path.join(process.cwd(), 'server', 'db', 'system_persistence_backup_IMMUTABLE.json');
    this.safetySnapshotFile = path.join(process.cwd(), 'data', 'kgcns_master_safety_snapshot.db');

    // Initialize Cloud Firestore configuration & credentials
    try {
      const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        if (config.projectId) {
          this.projectId = config.projectId;
          this.firestoreDatabaseId = config.firestoreDatabaseId || '(default)';
          this.apiKey = config.apiKey || '';
          this.oAuthClientId = config.oAuthClientId || '';

          if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
            try {
              const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
              const app = getApps().length > 0 ? getApp() : initializeApp({ credential: cert(sa), projectId: config.projectId });
              this.firestoreDb = getFirestore(app, this.firestoreDatabaseId);
            } catch {}
          }
          console.log(`[PersistenceSyncService] Cloud Firestore configured (project: ${this.projectId}, db: ${this.firestoreDatabaseId})`);
        }
      }
    } catch (e: any) {
      console.warn('[PersistenceSyncService] Cloud Firestore config init note:', e?.message);
    }

    // Auto-sync interval: automatically flush and sync every 3 minutes, refreshing SQLite safety snapshot only when dirty
    setInterval(() => {
      try {
        this.flushToPersistentBackup();
        const currentChanges = this.getSqliteTotalChanges();
        if (
          currentChanges !== this.lastSafetySnapshotChangeCount ||
          this.lastSafetySnapshotError !== null ||
          !fs.existsSync(this.safetySnapshotFile)
        ) {
          this.createSafetySnapshot();
        }
      } catch {}
    }, 3 * 60 * 1000).unref();
  }

  public static getInstance(): PersistenceSyncService {
    if (!PersistenceSyncService.instance) {
      PersistenceSyncService.instance = new PersistenceSyncService();
    }
    return PersistenceSyncService.instance;
  }

  public isInitialCloudHydrationComplete(): boolean {
    return this.hasCompletedInitialCloudHydration;
  }

  private getFirestoreRestBaseUrl(): string {
    return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(this.projectId)}/databases/${encodeURIComponent(this.firestoreDatabaseId)}/documents`;
  }

  /**
   * Obtains a verified Firebase Auth ID token for the Cloud Run service account
   * by exchanging a Google-signed OIDC identity token from the Cloud Run Metadata Server
   * with Firebase Identity Toolkit (signInWithIdp).
   */
  public async getCloudRunFirestoreToken(forceRefresh: boolean = false): Promise<string | null> {
    if (!this.projectId || !this.apiKey || !this.oAuthClientId) {
      return null;
    }

    const now = Date.now();
    if (!forceRefresh && this.cachedFirebaseToken && this.cachedFirebaseToken.expiresAtMs > now + 5 * 60 * 1000) {
      return this.cachedFirebaseToken.idToken;
    }

    if (this.tokenFetchPromise && !forceRefresh) {
      return this.tokenFetchPromise;
    }

    this.tokenFetchPromise = (async () => {
      const maxAttempts = 3;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const metadataUrl = `http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience=${encodeURIComponent(this.oAuthClientId)}&format=full`;
          const metaResp = await fetch(metadataUrl, {
            headers: { 'Metadata-Flavor': 'Google' }
          });

          if (!metaResp.ok) {
            throw new Error(`Metadata server returned HTTP ${metaResp.status}`);
          }

          const googleOidcToken = (await metaResp.text()).trim();
          if (!googleOidcToken || !googleOidcToken.includes('.')) {
            throw new Error('Invalid OIDC token from Cloud Run metadata server');
          }

          const idpUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${encodeURIComponent(this.apiKey)}`;
          const idpResp = await fetch(idpUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              postBody: `id_token=${encodeURIComponent(googleOidcToken)}&providerId=google.com`,
              requestUri: 'http://localhost',
              returnSecureToken: true
            })
          });

          if (!idpResp.ok) {
            const errBody = await idpResp.text();
            throw new Error(`IdentityToolkit signInWithIdp HTTP ${idpResp.status}: ${errBody.slice(0, 300)}`);
          }

          const idpData = (await idpResp.json()) as any;
          if (!idpData?.idToken) {
            throw new Error('IdentityToolkit response missing idToken');
          }

          const expiresInSec = Number(idpData.expiresIn) || 3600;
          this.cachedFirebaseToken = {
            idToken: idpData.idToken,
            uid: idpData.localId || '',
            email: idpData.email || 'ais-sandbox@ais-asia-southeast1-4497a4ef53.iam.gserviceaccount.com',
            expiresAtMs: Date.now() + expiresInSec * 1000
          };
          this.firestoreCircuitBreaker = false;
          this.firestoreCooldownUntil = 0;
          return this.cachedFirebaseToken.idToken;
        } catch (err: any) {
          if (attempt === maxAttempts) {
            console.warn(`[PersistenceSyncService] Failed to acquire Cloud Run Firestore token after ${maxAttempts} attempts:`, err?.message);
            return null;
          }
          await new Promise((r) => setTimeout(r, 200 * attempt));
        }
      }
      return null;
    })();

    try {
      return await this.tokenFetchPromise;
    } finally {
      this.tokenFetchPromise = null;
    }
  }

  /**
   * Executes a Firestore REST v1 batch commit with safe retry, backoff, and token refresh.
   */
  private async commitWritesToFirestoreRest(
    writes: any[],
    contextLabel: string
  ): Promise<{ ok: boolean; error?: string }> {
    if (writes.length === 0) return { ok: true };

    if (this.firestoreCooldownUntil > Date.now()) {
      return {
        ok: false,
        error: `Firestore đang trong thời gian chờ bảo vệ (cooldown) sau lỗi quyền truy cập hoặc giới hạn quota.`
      };
    }

    const chunkSize = 100;
    const baseUrl = this.getFirestoreRestBaseUrl();

    for (let offset = 0; offset < writes.length; offset += chunkSize) {
      const chunk = writes.slice(offset, offset + chunkSize);
      let chunkSuccess = false;
      let lastErr = '';

      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const token = await this.getCloudRunFirestoreToken(attempt > 1);
          if (!token) {
            throw new Error('Không thể khởi tạo mã xác thực máy chủ Cloud Run tới Firestore.');
          }

          const resp = await fetch(`${baseUrl}:commit`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ writes: chunk })
          });

          if (resp.ok) {
            chunkSuccess = true;
            this.firestoreCooldownUntil = 0;
            this.firestoreCircuitBreaker = false;
            break;
          }

          const errText = await resp.text();
          lastErr = `HTTP ${resp.status}: ${errText.slice(0, 300)}`;
          if (resp.status === 401 || resp.status === 403) {
            this.cachedFirebaseToken = null;
          }
          // If permission denied (403) or quota exhausted (429) persists on retry, activate cooldown to prevent retry storm
          if ((resp.status === 403 || resp.status === 429) && attempt >= 2) {
            this.firestoreCooldownUntil = Date.now() + 60 * 1000;
            this.firestoreCircuitBreaker = true;
            this.lastVerificationResult = {
              connected: false,
              checkedAt: new Date().toISOString(),
              message: `Đồng bộ Cloud Firestore tạm dừng do lỗi ${resp.status}. Dữ liệu cục bộ vẫn được bảo toàn.`,
              details: { projectId: this.projectId, databaseId: this.firestoreDatabaseId, status: resp.status }
            };
            break;
          }
        } catch (err: any) {
          lastErr = err?.message || String(err);
        }

        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, 250 * Math.pow(2, attempt - 1)));
        }
      }

      if (!chunkSuccess) {
        console.error(`[PersistenceSyncService] Firestore batch commit failed [${contextLabel}]: ${lastErr}`);
        return { ok: false, error: lastErr };
      }
    }

    return { ok: true };
  }

  /**
   * Queries all documents from a Firestore collection using :runQuery (compatible with Security Rules).
   */
  public async queryCollectionFromFirestoreRest(
    collectionId: string
  ): Promise<{ ok: boolean; docs: Array<{ docId: string; fullName: string; data: any }>; error?: string }> {
    const baseUrl = this.getFirestoreRestBaseUrl();
    let lastErr = '';

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const token = await this.getCloudRunFirestoreToken(attempt > 1);
        if (!token) {
          throw new Error('Missing Cloud Run Firestore token');
        }

        const resp = await fetch(`${baseUrl}:runQuery`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            structuredQuery: {
              from: [{ collectionId }],
              limit: 2000
            }
          })
        });

        if (!resp.ok) {
          const errText = await resp.text();
          lastErr = `HTTP ${resp.status}: ${errText.slice(0, 300)}`;
          if (resp.status === 401) {
            this.cachedFirebaseToken = null;
          }
        } else {
          const results = (await resp.json()) as any[];
          const docs: Array<{ docId: string; fullName: string; data: any }> = [];
          if (Array.isArray(results)) {
            for (const item of results) {
              if (item?.document?.name && item?.document?.fields) {
                const fullName: string = item.document.name;
                const docId = fullName.split('/').pop() || '';
                const data = fromFirestoreFields(item.document.fields);
                docs.push({ docId, fullName, data });
              }
            }
          }
          return { ok: true, docs };
        }
      } catch (err: any) {
        lastErr = err?.message || String(err);
      }

      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 200 * attempt));
      }
    }

    return { ok: false, docs: [], error: lastErr };
  }

  /**
   * Debounces frequent save operations (e.g. while adding posts, comments, or batch updating grades)
   * to ensure persistent backup is updated reliably without disk thrashing.
   * Includes a 3000ms ceiling so rapid successive updates never postpone flushing indefinitely.
   */
  public scheduleDebouncedFlush(delayMs: number = 1000): void {
    const now = Date.now();
    if (!this.firstDebounceCallTime) {
      this.firstDebounceCallTime = now;
    }

    if (now - this.firstDebounceCallTime > 3000) {
      if (this.debouncedTimer) {
        clearTimeout(this.debouncedTimer);
        this.debouncedTimer = null;
      }
      this.firstDebounceCallTime = 0;
      try {
        this.flushToPersistentBackup();
      } catch (err: any) {
        console.warn('[PersistenceSyncService] Forced flush note:', err?.message);
      }
      return;
    }

    if (this.debouncedTimer) {
      clearTimeout(this.debouncedTimer);
    }
    this.debouncedTimer = setTimeout(() => {
      this.debouncedTimer = null;
      this.firstDebounceCallTime = 0;
      try {
        this.flushToPersistentBackup();
      } catch (err: any) {
        console.warn('[PersistenceSyncService] Debounced flush note:', err?.message);
      }
    }, delayMs);
  }

  /**
   * Identifies the freshest backup payload among available persistent files.
   */
  public getFreshestBackupPayload(): { payload: PersistentDataPayload; sourceFile: string } | null {
    const candidateFiles = [
      this.primaryBackupFile,
      this.secondaryBackupFile,
      this.immutableBackupFile
    ].filter(f => fs.existsSync(f));

    if (candidateFiles.length === 0) return null;

    let bestFile = candidateFiles[0];
    let bestPayload: PersistentDataPayload | null = null;
    let latestTime = 0;

    for (const f of candidateFiles) {
      try {
        const raw = fs.readFileSync(f, 'utf-8');
        const parsed: PersistentDataPayload = JSON.parse(raw);
        if (parsed && parsed.tables && typeof parsed.tables === 'object') {
          const exportTime = parsed.exportedAt ? new Date(parsed.exportedAt).getTime() : 0;
          const statTime = fs.statSync(f).mtimeMs;
          const effectiveTime = Math.max(exportTime, statTime);
          if (effectiveTime > latestTime || !bestPayload) {
            latestTime = effectiveTime;
            bestFile = f;
            bestPayload = parsed;
          }
        }
      } catch {}
    }

    if (!bestPayload) return null;
    return { payload: bestPayload, sourceFile: bestFile };
  }

  /**
   * Deterministically validates whether an Admin account is established
   * (meaning first-time setup has been completed or custom credentials exist).
   */
  public isEstablishedAdmin(row: any): boolean {
    if (!row) return false;
    if (row.first_time_setup_completed === 1) return true;
    if (Boolean(row.password_updated_at)) return true;
    if (
      row.password_hash &&
      typeof row.password_hash === 'string' &&
      row.password_hash.startsWith('scrypt:') &&
      !verifySecret(DEFAULT_INITIAL_ADMIN_PASSWORD, row.password_hash)
    ) {
      return true;
    }
    if (
      row.recovery_code_hash &&
      typeof row.recovery_code_hash === 'string' &&
      row.recovery_code_hash.startsWith('scrypt:') &&
      !verifySecret(DEFAULT_INITIAL_RECOVERY_CODE, row.recovery_code_hash)
    ) {
      return true;
    }
    if (
      row.recovery_code_created_at &&
      (!row.created_at || row.recovery_code_created_at !== row.created_at)
    ) {
      return true;
    }
    return false;
  }

  public getCachedCloudAdminAccount(): any | null {
    return this.cachedCloudAdminAccount;
  }

  public setCachedCloudAdminAccount(admin: any): void {
    if (admin && this.isEstablishedAdmin(admin)) {
      this.cachedCloudAdminAccount = { ...admin, first_time_setup_completed: 1 };
    }
  }

  /**
   * Ensures the Super Admin account is read and verified from persistent Cloud Firestore storage
   * before deciding whether first-time setup is required or verifying Admin credentials.
   */
  public async ensureAdminAccountHydratedAsync(force: boolean = false): Promise<any | null> {
    if (!force && this.cachedCloudAdminAccount && this.isEstablishedAdmin(this.cachedCloudAdminAccount)) {
      try {
        const dbRow = this.db.prepare('SELECT * FROM admin_accounts WHERE id = ?').get(this.cachedCloudAdminAccount.id || 'usr-super-admin') as any;
        if (dbRow && this.isEstablishedAdmin(dbRow)) {
          const dbTime = this.extractRecordTimestampMs(dbRow);
          const cacheTime = this.extractRecordTimestampMs(this.cachedCloudAdminAccount);
          if (dbTime > cacheTime) {
            this.cachedCloudAdminAccount = { ...dbRow, first_time_setup_completed: 1 };
          }
        } else {
          this.hydrateTablesIntoSqlite({ admin_accounts: [this.cachedCloudAdminAccount] }, { fromCloud: true });
        }
      } catch {}
      return this.cachedCloudAdminAccount;
    }

    if (!this.projectId || process.env.ENABLE_FIRESTORE_SYNC === 'false') {
      return this.getEstablishedAdminFromBackups();
    }

    if (this.adminHydrationPromise) {
      return this.adminHydrationPromise;
    }

    this.adminHydrationPromise = (async () => {
      try {
        const q = await this.queryCollectionFromFirestoreRest('admin_accounts');
        if (q.ok && q.docs.length > 0) {
          let bestCloudAdmin: any = null;
          let bestTime = 0;
          for (const d of q.docs) {
            const { _syncedAt, ...cleanRow } = d.data;
            const canonicalId = getCanonicalDocId('admin_accounts', cleanRow) || d.docId;
            this.syncedDocHashes.set(`admin_accounts/${canonicalId}`, JSON.stringify(cleanRow));
            if (this.isEstablishedAdmin(cleanRow)) {
              const t = this.extractRecordTimestampMs(cleanRow);
              if (!bestCloudAdmin || t >= bestTime || (cleanRow.session_version || 1) > (bestCloudAdmin.session_version || 1)) {
                bestCloudAdmin = { ...cleanRow, first_time_setup_completed: 1 };
                bestTime = t;
              }
            }
          }
          if (bestCloudAdmin) {
            this.cachedCloudAdminAccount = bestCloudAdmin;
            this.hydrateTablesIntoSqlite({ admin_accounts: [bestCloudAdmin] }, { fromCloud: true });
            this.flushLocalBackupFilesOnly();
            return bestCloudAdmin;
          }
        }
      } catch (err: any) {
        console.warn('[PersistenceSyncService] ensureAdminAccountHydratedAsync note:', err?.message);
      }
      return this.getEstablishedAdminFromBackups();
    })();

    try {
      return await this.adminHydrationPromise;
    } finally {
      this.adminHydrationPromise = null;
    }
  }

  /**
   * Scans Cloud Firestore cache and all backup files, returning the freshest established Admin account record.
   */
  public getEstablishedAdminFromBackups(): any | null {
    let bestAdmin: any = null;
    let bestTime = 0;

    if (this.cachedCloudAdminAccount && this.isEstablishedAdmin(this.cachedCloudAdminAccount)) {
      bestAdmin = this.cachedCloudAdminAccount;
      bestTime = this.extractRecordTimestampMs(this.cachedCloudAdminAccount);
    }

    const candidateFiles = [
      this.immutableBackupFile,
      this.primaryBackupFile,
      this.secondaryBackupFile,
      path.resolve(moduleDirname, '..', 'db', 'system_persistence_backup_IMMUTABLE.json'),
      path.resolve(moduleDirname, '..', 'db', 'system_persistence_backup.json'),
      path.resolve(moduleDirname, '..', '..', 'data', 'system_persistence_backup.json')
    ].filter((f, i, arr) => arr.indexOf(f) === i && fs.existsSync(f));

    for (const f of candidateFiles) {
      try {
        const raw = fs.readFileSync(f, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed?.tables?.admin_accounts) && parsed.tables.admin_accounts.length > 0) {
          const found = parsed.tables.admin_accounts[0];
          if (this.isEstablishedAdmin(found)) {
            const t = Math.max(
              found.password_updated_at ? new Date(found.password_updated_at).getTime() || 0 : 0,
              found.recovery_code_created_at ? new Date(found.recovery_code_created_at).getTime() || 0 : 0,
              found.updated_at ? new Date(found.updated_at).getTime() || 0 : 0,
              found.created_at ? new Date(found.created_at).getTime() || 0 : 0
            );
            if (t > bestTime || !bestAdmin) {
              bestAdmin = found;
              bestTime = t;
            }
          }
        }
      } catch {}
    }
    return bestAdmin;
  }

  private extractRecordTimestampMs(row: any): number {
    if (!row || typeof row !== 'object') return 0;
    const candidates = [
      row.updated_at,
      row.password_updated_at,
      row.recovery_code_created_at,
      row.last_message_at,
      row.last_activity_at,
      row.last_login_at,
      row.last_issued_at,
      row.reviewed_at,
      row.approved_at,
      row.submitted_at,
      row.published_at,
      row.sent_at,
      row.completed_at,
      row.resolved_at,
      row.created_at
    ];
    let maxMs = 0;
    for (const c of candidates) {
      if (c && typeof c === 'string') {
        const t = new Date(c).getTime();
        if (!isNaN(t) && t > maxMs) {
          maxMs = t;
        }
      }
    }
    return maxMs;
  }

  /**
   * Checks whether the current database already has this record with an equal or newer timestamp.
   * Works across all tables regardless of whether they use `updated_at`, `password_updated_at`, `created_at`, etc.
   * If true, hydration will NOT overwrite the database row with older backup/snapshot data.
   */
  public isDbRecordFresher(
    tableName: string,
    keys: Record<string, any>,
    incomingUpdatedAt?: string | null,
    incomingRow?: any
  ): boolean {
    try {
      const whereClauses = Object.keys(keys).map(k => `${k} = ?`).join(' AND ');
      const params = Object.values(keys);
      const row = this.db.prepare(`SELECT * FROM ${tableName} WHERE ${whereClauses}`).get(...params) as any;
      if (!row) return false;

      const dbTime = this.extractRecordTimestampMs(row);
      let incTime = 0;
      if (incomingRow) {
        incTime = this.extractRecordTimestampMs(incomingRow);
      }
      if (!incTime && incomingUpdatedAt) {
        const parsed = new Date(incomingUpdatedAt).getTime();
        if (!isNaN(parsed)) incTime = parsed;
      }

      // If row exists in DB and incoming has no valid timestamp, keep existing DB row
      if (incTime === 0) return true;
      // If DB row has no timestamp at all, allow incoming timestamped row to update
      if (dbTime === 0) return false;
      return dbTime >= incTime;
    } catch {
      return false;
    }
  }

  /**
   * Shared, idempotent, timestamp-safe hydration of table records into SQLite.
   * Never overwrites fresher SQLite records with older snapshots.
   */
  private hydrateTablesIntoSqlite(tables: Record<string, any[]>, options?: { fromCloud?: boolean }): number {
    let restoredCount = 0;
    const fromCloud = Boolean(options?.fromCloud);

    // 1. Hydrate Admin Accounts
    if (Array.isArray(tables.admin_accounts)) {
      for (const row of tables.admin_accounts) {
        try {
          if (!row || !row.password_hash) continue;
          const adminId = row.id || 'usr-super-admin';
          const existingAdmin = this.db.prepare('SELECT * FROM admin_accounts WHERE id = ?').get(adminId) as any;
          const isExistingEstablished = this.isEstablishedAdmin(existingAdmin);
          const isIncomingEstablished = this.isEstablishedAdmin(row);

          if (isExistingEstablished && !isIncomingEstablished) {
            continue;
          }

          if (fromCloud && isIncomingEstablished) {
            this.cachedCloudAdminAccount = { ...row, first_time_setup_completed: 1 };
          } else if (isIncomingEstablished && !isExistingEstablished) {
            // Always upgrade unconfigured DB admin to established admin
          } else if (!fromCloud && this.isDbRecordFresher('admin_accounts', { id: adminId }, row.updated_at, row)) {
            continue;
          }

          const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO admin_accounts (
              id, login_id, email, recovery_email, full_name, password_hash, password_updated_at,
              reset_token_hash, reset_token_expires_at, recovery_code_hash, recovery_code_used,
              recovery_code_created_at, session_version, first_time_setup_completed, failed_attempts,
              locked_until, status, last_login_at, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          stmt.run(
            adminId,
            row.login_id || 'admin',
            (row.email || 'binhdtsply@gmail.com').toLowerCase(),
            row.recovery_email ? String(row.recovery_email).toLowerCase() : null,
            row.full_name || 'Ban Quản trị Hệ thống Không Gian Chủ Nhiệm Số',
            row.password_hash,
            row.password_updated_at || null,
            row.reset_token_hash || null,
            row.reset_token_expires_at || null,
            row.recovery_code_hash || null,
            row.recovery_code_used ?? 0,
            row.recovery_code_created_at || null,
            row.session_version || 1,
            isIncomingEstablished ? 1 : ((row.first_time_setup_completed === 1 || Boolean(row.password_updated_at)) ? 1 : 0),
            row.failed_attempts || 0,
            row.locked_until || null,
            row.status || 'ACTIVE',
            row.last_login_at || null,
            row.created_at || new Date().toISOString(),
            row.updated_at || new Date().toISOString()
          );
          restoredCount++;
        } catch (e: any) {
          console.warn('[PersistenceSyncService] admin_accounts hydration note:', e?.message);
        }
      }
    }

    // 2. Hydrate Tenants
    if (Array.isArray(tables.tenants)) {
      for (const row of tables.tenants) {
        try {
          if (!row || !row.id || !row.name) continue;
          if (!fromCloud && this.isDbRecordFresher('tenants', { id: row.id }, row.updated_at, row)) continue;
          const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO tenants (
              id, name, school_name, owner_id, owner_email, owner_name,
              plan, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          stmt.run(
            row.id, row.name, row.school_name || 'Trường THPT', row.owner_id || null, row.owner_email || null,
            row.owner_name || null, row.plan || 'PRO', row.status || 'ACTIVE',
            row.created_at || new Date().toISOString(), row.updated_at || new Date().toISOString()
          );
          restoredCount++;
        } catch {}
      }
    }

    // 3. Hydrate Teacher Accounts
    if (Array.isArray(tables.teacher_accounts)) {
      for (const row of tables.teacher_accounts) {
        try {
          if (!row || !row.teacher_id || !row.tenant_id) continue;
          if (!fromCloud && this.isDbRecordFresher('teacher_accounts', { teacher_id: row.teacher_id }, row.updated_at, row)) continue;
          const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO teacher_accounts (
              id, teacher_id, tenant_id, full_name, email, phone,
              google_sub, google_email, login_method, status, credential_version,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          stmt.run(
            row.id || row.teacher_id, row.teacher_id, row.tenant_id, row.full_name, row.email,
            row.phone || null, row.google_sub || null, row.google_email || null, row.login_method || 'ACCESS_CODE',
            row.status || 'ACTIVE', row.credential_version || 1,
            row.created_at || new Date().toISOString(), row.updated_at || new Date().toISOString()
          );
          restoredCount++;
        } catch {}
      }
    }

    // 4. Hydrate Class Settings
    if (Array.isArray(tables.class_settings)) {
      for (const row of tables.class_settings) {
        try {
          if (!row || !row.tenant_id || !row.class_id) continue;
          if (!fromCloud && this.isDbRecordFresher('class_settings', { tenant_id: row.tenant_id, class_id: row.class_id }, row.updated_at, row)) continue;
          const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO class_settings (
              tenant_id, class_id, school_name, class_name, grade, stream,
              academic_year, semester, teacher_name, teacher_phone, teacher_email,
              slogan, cover_image, total_students, theme_json, subjects_json,
              interaction_settings_json, google_integration_json, zalo_settings_json,
              ai_config_json, school_year_timeline_json, student_identity_mode,
              raw_metadata, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          stmt.run(
            row.tenant_id, row.class_id, row.school_name, row.class_name, row.grade, row.stream,
            row.academic_year, row.semester, row.teacher_name, row.teacher_phone, row.teacher_email,
            row.slogan || null, row.cover_image || null, row.total_students || 0,
            row.theme_json || '{}', row.subjects_json || '[]',
            row.interaction_settings_json || null, row.google_integration_json || null, row.zalo_settings_json || null,
            row.ai_config_json || null, row.school_year_timeline_json || null, row.student_identity_mode || 'IDENTIFIED',
            row.raw_metadata || null, row.created_at || new Date().toISOString(), row.updated_at || new Date().toISOString()
          );
          restoredCount++;
        } catch {}
      }
    }

    // 5. Hydrate Credentials
    if (Array.isArray(tables.credentials)) {
      for (const row of tables.credentials) {
        try {
          if (!row || !row.id || !row.tenant_id || !row.lookup_identifier) continue;
          if (!fromCloud && this.isDbRecordFresher('credentials', { id: row.id }, row.password_updated_at || row.last_issued_at || row.created_at, row)) continue;
          const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO credentials (
              id, type, tenant_id, owner_id, lookup_identifier, secret_hash,
              status, credential_version, is_officer, officer_role_title,
              is_test_credential, initial_password, password_hash, password_updated_at,
              last_issued_at, created_at, created_by, last_login_at,
              locked_at, locked_by, revoked_at, revoked_by, must_change_password
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          stmt.run(
            row.id,
            row.type,
            row.tenant_id,
            row.owner_id,
            row.lookup_identifier,
            row.secret_hash || row.password_hash || '',
            row.status || 'ACTIVE',
            row.credential_version || 1,
            row.is_officer ? 1 : 0,
            row.officer_role_title || null,
            row.is_test_credential ? 1 : 0,
            row.initial_password || null,
            row.password_hash || null,
            row.password_updated_at || null,
            row.last_issued_at || row.created_at || new Date().toISOString(),
            row.created_at || new Date().toISOString(),
            row.created_by || null,
            row.last_login_at || null,
            row.locked_at || null,
            row.locked_by || null,
            row.revoked_at || null,
            row.revoked_by || null,
            row.must_change_password ? 1 : 0
          );
          restoredCount++;
        } catch {}
      }
    }

    // 6. Hydrate Students
    if (Array.isArray(tables.students)) {
      for (const row of tables.students) {
        try {
          if (!row || !row.id || !row.tenant_id || !row.full_name) continue;
          if (!fromCloud && this.isDbRecordFresher('students', { tenant_id: row.tenant_id, id: row.id }, row.updated_at || row.created_at, row)) continue;
          const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO students (
              id, tenant_id, class_id, code, full_name, gender, dob,
              group_num, officer_role, avatar, phone, email, address,
              father_name, father_phone, father_job, mother_name, mother_phone, mother_job,
              health_notes, talents, private_teacher_notes, needs_special_attention,
              attention_categories, attention_note, support_measure, attention_status,
              attention_started_at, attention_updated_at, attention_updated_by,
              anonymous_code, status, raw_metadata, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          stmt.run(
            row.id, row.tenant_id, row.class_id || '', row.code || row.id, row.full_name, row.gender || 'Nam', row.dob || '',
            row.group_num || 1, row.officer_role || null, row.avatar || null, row.phone || null, row.email || null, row.address || null,
            row.father_name || null, row.father_phone || null, row.father_job || null, row.mother_name || null, row.mother_phone || null, row.mother_job || null,
            row.health_notes || null, row.talents || null, row.private_teacher_notes || null, row.needs_special_attention ? 1 : 0,
            row.attention_categories || null, row.attention_note || null, row.support_measure || null, row.attention_status || 'monitoring',
            row.attention_started_at || null, row.attention_updated_at || null, row.attention_updated_by || null,
            row.anonymous_code || null, row.status || 'Đang học', row.raw_metadata || null,
            row.created_at || new Date().toISOString(), row.updated_at || new Date().toISOString()
          );
          restoredCount++;
        } catch {}
      }
    }

    // 7. Hydrate Assignments
    if (Array.isArray(tables.assignments)) {
      for (const row of tables.assignments) {
        try {
          if (!row || !row.id || !row.tenant_id) continue;
          if (!fromCloud && this.isDbRecordFresher('assignments', { tenant_id: row.tenant_id, id: row.id }, row.updated_at || row.created_at, row)) continue;
          const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO assignments (
              id, tenant_id, class_id, title, subject, assigned_date, due_date,
              description, status, is_pinned, bg_color, text_color, author_role, author_name,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          stmt.run(
            row.id,
            row.tenant_id,
            row.class_id || '',
            row.title,
            row.subject,
            row.assigned_date,
            row.due_date,
            row.description || null,
            row.status || 'ACTIVE',
            row.is_pinned ? 1 : 0,
            row.bg_color || null,
            row.text_color || null,
            row.author_role || null,
            row.author_name || null,
            row.created_at || new Date().toISOString(),
            row.updated_at || row.created_at || new Date().toISOString()
          );
          restoredCount++;
        } catch {}
      }
    }

    // 8. Hydrate Exam Schedules
    if (Array.isArray(tables.exam_schedules)) {
      for (const row of tables.exam_schedules) {
        try {
          if (!row || !row.id || !row.tenant_id) continue;
          if (!fromCloud && this.isDbRecordFresher('exam_schedules', { tenant_id: row.tenant_id, id: row.id }, row.created_at, row)) continue;
          const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO exam_schedules (
              id, tenant_id, class_id, exam_title, subject, exam_date,
              start_time, duration_minutes, room, notes, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          stmt.run(
            row.id, row.tenant_id, row.class_id || '', row.exam_title, row.subject,
            row.exam_date, row.start_time, row.duration_minutes || 45, row.room || null, row.notes || null,
            row.created_at || new Date().toISOString()
          );
          restoredCount++;
        } catch {}
      }
    }

    // 9. Hydrate Timetables
    if (Array.isArray(tables.timetables)) {
      for (const row of tables.timetables) {
        try {
          if (!row || !row.tenant_id || !row.class_id) continue;
          if (!fromCloud && this.isDbRecordFresher('timetables', { tenant_id: row.tenant_id, class_id: row.class_id, academic_year: row.academic_year, semester: row.semester }, row.updated_at, row)) continue;
          const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO timetables (
              tenant_id, class_id, academic_year, semester, schedule_grid_json, updated_at, updated_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `);
          stmt.run(
            row.tenant_id,
            row.class_id,
            row.academic_year || '2025 - 2026',
            row.semester || 'Học kỳ I',
            row.schedule_grid_json || '[]',
            row.updated_at || new Date().toISOString(),
            row.updated_by || 'system'
          );
          restoredCount++;
        } catch {}
      }
    }

    // 10. Hydrate User Avatars
    if (Array.isArray(tables.user_avatars)) {
      for (const row of tables.user_avatars) {
        try {
          if (!row || !row.user_key || !row.avatar) continue;
          if (!fromCloud && this.isDbRecordFresher('user_avatars', { user_key: row.user_key }, row.updated_at, row)) continue;
          const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO user_avatars (
              user_key, avatar, user_id, role, tenant_id, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?)
          `);
          stmt.run(
            row.user_key,
            row.avatar,
            row.user_id || null,
            row.role || null,
            row.tenant_id || null,
            row.updated_at || new Date().toISOString()
          );
          restoredCount++;
        } catch {}
      }
    }

    // 11. Hydrate Posts (Classroom Feed)
    if (Array.isArray(tables.posts)) {
      for (const row of tables.posts) {
        try {
          if (!row || !row.id || !row.tenant_id) continue;
          if (!fromCloud && this.isDbRecordFresher('posts', { tenant_id: row.tenant_id, id: row.id }, row.updated_at || row.created_at, row)) continue;
          const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO posts (
              id, tenant_id, author_id, author_name, author_role, author_avatar,
              category, title, content, images_json, attachments_json,
              pinned_to_overview, parent_visible, reactions_json, comments_json,
              status, reviewed_by, reviewed_at, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          stmt.run(
            row.id,
            row.tenant_id,
            row.author_id || 'system',
            row.author_name || 'GVCN',
            row.author_role || 'TEACHER',
            row.author_avatar || null,
            row.category || 'Thông báo',
            row.title || '',
            row.content || '',
            row.images_json || '[]',
            row.attachments_json || '[]',
            row.pinned_to_overview ? 1 : 0,
            row.parent_visible !== undefined ? (row.parent_visible ? 1 : 0) : 1,
            row.reactions_json || '{"like":[],"love":[],"applause":[],"celebrate":[],"idea":[]}',
            row.comments_json || '[]',
            row.status || 'approved',
            row.reviewed_by || null,
            row.reviewed_at || null,
            row.created_at || new Date().toISOString(),
            row.updated_at || row.created_at || new Date().toISOString()
          );
          restoredCount++;
        } catch {}
      }
    }

    // 12. Hydrate Academic Records & Published Snapshots
    if (Array.isArray(tables.academic_records)) {
      for (const row of tables.academic_records) {
        try {
          if (!row || !row.id || !row.tenant_id || !row.student_id) continue;
          if (!fromCloud && this.isDbRecordFresher('academic_records', { tenant_id: row.tenant_id, id: row.id }, row.updated_at || row.created_at, row)) continue;
          const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO academic_records (
              id, tenant_id, student_id, academic_year, semester, scores_json,
              conduct_score, conduct_evaluation, academic_rank, gpa,
              attendance_summary_json, teacher_evaluation, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          stmt.run(
            row.id,
            row.tenant_id,
            row.student_id,
            row.academic_year || '2025 - 2026',
            row.semester || 'Học kỳ I',
            row.scores_json || '[]',
            row.conduct_score !== undefined ? row.conduct_score : null,
            row.conduct_evaluation || null,
            row.academic_rank || null,
            row.gpa !== undefined ? row.gpa : null,
            row.attendance_summary_json || null,
            row.teacher_evaluation || null,
            row.created_at || new Date().toISOString(),
            row.updated_at || row.created_at || new Date().toISOString()
          );
          restoredCount++;
        } catch {}
      }
    }

    if (Array.isArray(tables.published_academic_snapshots)) {
      for (const row of tables.published_academic_snapshots) {
        try {
          if (!row || !row.id || !row.tenant_id) continue;
          if (!fromCloud && this.isDbRecordFresher('published_academic_snapshots', { id: row.id }, row.published_at, row)) continue;
          const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO published_academic_snapshots (
              id, tenant_id, academic_year, semester, period_label,
              published_at, published_by, snapshot_data_json, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          stmt.run(
            row.id,
            row.tenant_id,
            row.academic_year || '2025 - 2026',
            row.semester || 'Học kỳ I',
            row.period_label || 'Bảng điểm',
            row.published_at || new Date().toISOString(),
            row.published_by || 'system',
            row.snapshot_data_json || '{}',
            row.status || 'PUBLISHED'
          );
          restoredCount++;
        } catch {}
      }
    }

    // 13. Hydrate Training Transactions, Rule Configs, Laurel Trees, Attendance
    if (Array.isArray(tables.training_transactions)) {
      for (const row of tables.training_transactions) {
        try {
          if (!row || !row.id || !row.tenant_id || !row.student_id) continue;
          if (!fromCloud && this.isDbRecordFresher('training_transactions', { tenant_id: row.tenant_id, id: row.id }, row.approved_at || row.created_at, row)) continue;
          const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO training_transactions (
              id, tenant_id, student_id, rule_id, category, title, points,
              description, evidence_url, status, created_by_role, created_by_user_id,
              approved_by, approved_at, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          stmt.run(
            row.id,
            row.tenant_id,
            row.student_id,
            row.rule_id || null,
            row.category || 'Nề nếp',
            row.title || '',
            row.points !== undefined ? row.points : 0,
            row.description || null,
            row.evidence_url || null,
            row.status || 'APPROVED',
            row.created_by_role || 'TEACHER',
            row.created_by_user_id || 'system',
            row.approved_by || null,
            row.approved_at || null,
            row.created_at || new Date().toISOString()
          );
          restoredCount++;
        } catch {}
      }
    }

    if (Array.isArray(tables.training_rule_configs)) {
      for (const row of tables.training_rule_configs) {
        try {
          if (!row || !row.id || !row.tenant_id) continue;
          const existing = this.db.prepare('SELECT 1 FROM training_rule_configs WHERE tenant_id = ? AND id = ?').get(row.tenant_id, row.id);
          if (existing && !fromCloud) continue;
          const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO training_rule_configs (
              id, tenant_id, category, title, default_points, description, active
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `);
          stmt.run(
            row.id, row.tenant_id, row.category || 'Nề nếp', row.title || '',
            row.default_points ?? 0, row.description || null, row.active !== undefined ? (row.active ? 1 : 0) : 1
          );
          restoredCount++;
        } catch {}
      }
    }

    if (Array.isArray(tables.laurel_trees)) {
      for (const row of tables.laurel_trees) {
        try {
          if (!row || !row.tenant_id || !row.student_id) continue;
          if (!fromCloud && this.isDbRecordFresher('laurel_trees', { tenant_id: row.tenant_id, student_id: row.student_id }, row.updated_at, row)) continue;
          const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO laurel_trees (
              tenant_id, student_id, total_points, current_rank_level, badges_json, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?)
          `);
          stmt.run(
            row.tenant_id,
            row.student_id,
            row.total_points !== undefined ? row.total_points : 0,
            row.current_rank_level || 1,
            row.badges_json || '[]',
            row.updated_at || new Date().toISOString()
          );
          restoredCount++;
        } catch {}
      }
    }

    if (Array.isArray(tables.attendance_records)) {
      for (const row of tables.attendance_records) {
        try {
          if (!row || !row.id || !row.tenant_id || !row.student_id) continue;
          if (!fromCloud && this.isDbRecordFresher('attendance_records', { tenant_id: row.tenant_id, id: row.id }, row.created_at, row)) continue;
          const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO attendance_records (
              id, tenant_id, student_id, date, status, reason, recorded_by, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `);
          stmt.run(
            row.id, row.tenant_id, row.student_id, row.date, row.status || 'PRESENT',
            row.reason || null, row.recorded_by || 'system', row.created_at || new Date().toISOString()
          );
          restoredCount++;
        } catch {}
      }
    }

    // 14. Hydrate Graduation Choices & Career Profiles
    if (Array.isArray(tables.graduation_choices)) {
      for (const row of tables.graduation_choices) {
        try {
          if (!row || !row.id || !row.tenant_id || !row.student_id) continue;
          if (!fromCloud && this.isDbRecordFresher('graduation_choices', { tenant_id: row.tenant_id, id: row.id }, row.updated_at || row.created_at, row)) continue;
          const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO graduation_choices (
              id, tenant_id, student_id, initial_choice_json, current_choice_json,
              history_json, mock_exam_results_json, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          stmt.run(
            row.id,
            row.tenant_id,
            row.student_id,
            row.initial_choice_json || '{}',
            row.current_choice_json || '{}',
            row.history_json || '[]',
            row.mock_exam_results_json || '[]',
            row.created_at || new Date().toISOString(),
            row.updated_at || row.created_at || new Date().toISOString()
          );
          restoredCount++;
        } catch {}
      }
    }

    if (Array.isArray(tables.career_profiles)) {
      for (const row of tables.career_profiles) {
        try {
          if (!row || !row.id || !row.tenant_id || !row.student_id) continue;
          if (!fromCloud && this.isDbRecordFresher('career_profiles', { tenant_id: row.tenant_id, id: row.id }, row.updated_at || row.created_at, row)) continue;
          const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO career_profiles (
              id, tenant_id, student_id, riasec_scores_json, primary_traits_json,
              recommended_careers_json, student_aspirations, holland_history_json,
              mbti_result_json, work_values_result_json, assessments_history_json,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          stmt.run(
            row.id,
            row.tenant_id,
            row.student_id,
            row.riasec_scores_json || '{}',
            row.primary_traits_json || '[]',
            row.recommended_careers_json || '[]',
            row.student_aspirations || null,
            row.holland_history_json || '[]',
            row.mbti_result_json || '{}',
            row.work_values_result_json || '{}',
            row.assessments_history_json || '[]',
            row.created_at || new Date().toISOString(),
            row.updated_at || row.created_at || new Date().toISOString()
          );
          restoredCount++;
        } catch {}
      }
    }

    // 15. Hydrate Surveys (Templates, Versions, Responses, Sync Proposals)
    if (Array.isArray(tables.survey_templates)) {
      for (const row of tables.survey_templates) {
        try {
          if (!row || !row.id || !row.tenant_id) continue;
          if (!fromCloud && this.isDbRecordFresher('survey_templates', { tenant_id: row.tenant_id, id: row.id }, row.updated_at || row.created_at, row)) continue;
          const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO survey_templates (
              id, tenant_id, title, description, target_type, academic_year, semester,
              current_version, status, is_default, sections_json, class_id,
              created_by, creator_role, scope, survey_type, target_audience_json,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          stmt.run(
            row.id, row.tenant_id, row.title, row.description || null, row.target_type || 'STUDENT',
            row.academic_year || '2025 - 2026', row.semester || 'Học kỳ I', row.current_version || 1,
            row.status || 'PUBLISHED', row.is_default ? 1 : 0, row.sections_json || '[]',
            row.class_id || null, row.created_by || null, row.creator_role || null,
            row.scope || 'CLASS', row.survey_type || 'CUSTOM', row.target_audience_json || null,
            row.created_at || new Date().toISOString(), row.updated_at || new Date().toISOString()
          );
          restoredCount++;
        } catch {}
      }
    }

    if (Array.isArray(tables.survey_template_versions)) {
      for (const row of tables.survey_template_versions) {
        try {
          if (!row || !row.id || !row.tenant_id) continue;
          if (!fromCloud && this.isDbRecordFresher('survey_template_versions', { id: row.id }, row.published_at, row)) continue;
          const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO survey_template_versions (
              id, tenant_id, template_id, version, snapshot_json, published_at, published_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `);
          stmt.run(
            row.id, row.tenant_id, row.template_id, row.version || 1,
            row.snapshot_json || '{}', row.published_at || new Date().toISOString(), row.published_by || 'system'
          );
          restoredCount++;
        } catch {}
      }
    }

    if (Array.isArray(tables.survey_responses)) {
      for (const row of tables.survey_responses) {
        try {
          if (!row || !row.id || !row.tenant_id) continue;
          if (!fromCloud && this.isDbRecordFresher('survey_responses', { tenant_id: row.tenant_id, id: row.id }, row.updated_at || row.created_at, row)) continue;
          const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO survey_responses (
              id, tenant_id, template_id, template_version, student_id, status,
              raw_answers_json, sensitive_answers_json, submitted_at, reviewed_at,
              reviewed_by, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          stmt.run(
            row.id, row.tenant_id, row.template_id || '', row.template_version || 1,
            row.student_id, row.status || 'SUBMITTED', row.raw_answers_json || '{}',
            row.sensitive_answers_json || null, row.submitted_at || null, row.reviewed_at || null,
            row.reviewed_by || null, row.created_at || new Date().toISOString(),
            row.updated_at || new Date().toISOString()
          );
          restoredCount++;
        } catch {}
      }
    }

    if (Array.isArray(tables.survey_sync_proposals)) {
      for (const row of tables.survey_sync_proposals) {
        try {
          if (!row || !row.id || !row.tenant_id) continue;
          if (!fromCloud && this.isDbRecordFresher('survey_sync_proposals', { id: row.id }, row.reviewed_at || row.created_at, row)) continue;
          const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO survey_sync_proposals (
              id, tenant_id, template_id, response_id, student_id, target_field,
              field_category, old_value, new_value, status, reviewed_by, reviewed_at, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          stmt.run(
            row.id, row.tenant_id, row.template_id || null, row.response_id, row.student_id,
            row.target_field, row.field_category || 'REVIEW_REQUIRED', row.old_value || null,
            row.new_value || null, row.status || 'PENDING', row.reviewed_by || null,
            row.reviewed_at || null, row.created_at || new Date().toISOString()
          );
          restoredCount++;
        } catch {}
      }
    }

    // 16. Hydrate Parent Communication & Notifications
    if (Array.isArray(tables.parent_conversations)) {
      for (const row of tables.parent_conversations) {
        try {
          if (!row || !row.id || !row.tenant_id) continue;
          if (!fromCloud && this.isDbRecordFresher('parent_conversations', { tenant_id: row.tenant_id, id: row.id }, row.updated_at || row.created_at, row)) continue;
          const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO parent_conversations (
              id, tenant_id, student_id, parent_name, parent_phone, topic,
              messages_json, last_message_at, unread_teacher, unread_parent,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          stmt.run(
            row.id, row.tenant_id, row.student_id, row.parent_name, row.parent_phone || null,
            row.topic, row.messages_json || '[]', row.last_message_at || new Date().toISOString(),
            row.unread_teacher || 0, row.unread_parent || 0,
            row.created_at || new Date().toISOString(), row.updated_at || new Date().toISOString()
          );
          restoredCount++;
        } catch {}
      }
    }

    if (Array.isArray(tables.parent_announcements)) {
      for (const row of tables.parent_announcements) {
        try {
          if (!row || !row.id || !row.tenant_id) continue;
          if (!fromCloud && this.isDbRecordFresher('parent_announcements', { tenant_id: row.tenant_id, id: row.id }, row.sent_at || row.created_at, row)) continue;
          const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO parent_announcements (
              id, tenant_id, title, content, target_type, target_student_ids_json,
              sent_at, sent_by, requires_acknowledgement, acknowledgements_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          stmt.run(
            row.id, row.tenant_id, row.title, row.content, row.target_type || 'ALL',
            row.target_student_ids_json || null, row.sent_at || new Date().toISOString(),
            row.sent_by || 'GVCN', row.requires_acknowledgement ? 1 : 0,
            row.acknowledgements_json || '[]', row.created_at || new Date().toISOString()
          );
          restoredCount++;
        } catch {}
      }
    }

    if (Array.isArray(tables.notifications)) {
      for (const row of tables.notifications) {
        try {
          if (!row || !row.id || !row.tenant_id) continue;
          if (!fromCloud && this.isDbRecordFresher('notifications', { tenant_id: row.tenant_id, id: row.id }, row.created_at, row)) continue;
          const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO notifications (
              id, tenant_id, user_id, role, type, title, message, link_to, is_read, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          stmt.run(
            row.id, row.tenant_id, row.user_id, row.role || 'TEACHER', row.type || 'SYSTEM',
            row.title || '', row.message || '', row.link_to || null, row.is_read ? 1 : 0,
            row.created_at || new Date().toISOString()
          );
          restoredCount++;
        } catch {}
      }
    }

    // 17. Hydrate Teacher Personal Tasks, Support Tickets, Feedbacks, System Settings
    if (Array.isArray(tables.teacher_personal_tasks)) {
      for (const row of tables.teacher_personal_tasks) {
        try {
          if (!row || !row.id || !row.tenant_id) continue;
          if (!fromCloud && this.isDbRecordFresher('teacher_personal_tasks', { tenant_id: row.tenant_id, id: row.id }, row.updated_at || row.created_at, row)) continue;
          const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO teacher_personal_tasks (
              id, tenant_id, teacher_id, class_id, title, notes, due_date,
              priority, status, linked_module, linked_entity_id, start_time, end_time,
              location, category, is_all_day, created_at, updated_at, completed_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          stmt.run(
            row.id, row.tenant_id, row.teacher_id, row.class_id || null, row.title,
            row.notes || null, row.due_date || null, row.priority || 'NORMAL', row.status || 'TODO',
            row.linked_module || null, row.linked_entity_id || null, row.start_time || null,
            row.end_time || null, row.location || null, row.category || 'HOMEROOM',
            row.is_all_day ? 1 : 0, row.created_at || new Date().toISOString(),
            row.updated_at || new Date().toISOString(), row.completed_at || null
          );
          restoredCount++;
        } catch {}
      }
    }

    if (Array.isArray(tables.support_tickets)) {
      for (const row of tables.support_tickets) {
        try {
          if (!row || !row.id || !row.ticket_code) continue;
          if (!fromCloud && this.isDbRecordFresher('support_tickets', { id: row.id }, row.updated_at || row.created_at, row)) continue;
          const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO support_tickets (
              id, ticket_code, title, description, category, priority, status,
              user_id, user_role, user_name, user_email, user_phone, tenant_id,
              related_module, admin_response, admin_notes, assigned_admin_id,
              created_at, updated_at, resolved_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          stmt.run(
            row.id, row.ticket_code, row.title, row.description, row.category,
            row.priority || 'MEDIUM', row.status || 'NEW', row.user_id, row.user_role,
            row.user_name, row.user_email || null, row.user_phone || null, row.tenant_id || null,
            row.related_module || null, row.admin_response || null, row.admin_notes || null,
            row.assigned_admin_id || null, row.created_at || new Date().toISOString(),
            row.updated_at || new Date().toISOString(), row.resolved_at || null
          );
          restoredCount++;
        } catch {}
      }
    }

    if (Array.isArray(tables.support_ticket_history)) {
      for (const row of tables.support_ticket_history) {
        try {
          if (!row || !row.id || !row.ticket_id) continue;
          if (!fromCloud && this.isDbRecordFresher('support_ticket_history', { id: row.id }, row.created_at, row)) continue;
          const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO support_ticket_history (
              id, ticket_id, actor_id, actor_name, actor_role, action,
              old_status, new_status, message, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          stmt.run(
            row.id, row.ticket_id, row.actor_id, row.actor_name, row.actor_role,
            row.action, row.old_status || null, row.new_status || null, row.message || null,
            row.created_at || new Date().toISOString()
          );
          restoredCount++;
        } catch {}
      }
    }

    if (Array.isArray(tables.user_feedbacks)) {
      for (const row of tables.user_feedbacks) {
        try {
          if (!row || !row.id) continue;
          if (!fromCloud && this.isDbRecordFresher('user_feedbacks', { id: row.id }, row.updated_at || row.created_at, row)) continue;
          const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO user_feedbacks (
              id, type, rating, category, related_module, title, content,
              is_anonymous, user_id, user_role, user_name, user_email, tenant_id,
              status, admin_notes, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          stmt.run(
            row.id, row.type || 'RATING_FEEDBACK', row.rating ?? null, row.category || 'Chung',
            row.related_module || null, row.title || null, row.content || '',
            row.is_anonymous ? 1 : 0, row.user_id || null, row.user_role || 'TEACHER',
            row.user_name || null, row.user_email || null, row.tenant_id || null,
            row.status || 'NEW', row.admin_notes || null,
            row.created_at || new Date().toISOString(), row.updated_at || new Date().toISOString()
          );
          restoredCount++;
        } catch {}
      }
    }

    if (Array.isArray(tables.system_settings)) {
      for (const row of tables.system_settings) {
        try {
          if (!row || !row.key) continue;
          if (!fromCloud && this.isDbRecordFresher('system_settings', { key: row.key }, row.updated_at, row)) continue;
          const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO system_settings (
              key, value_json, updated_at, updated_by
            ) VALUES (?, ?, ?, ?)
          `);
          stmt.run(
            row.key, row.value_json, row.updated_at || new Date().toISOString(), row.updated_by || 'system'
          );
          restoredCount++;
        } catch {}
      }
    }

    // 18. Hydrate Active Sessions (skipping explicitly revoked/logged-out sessions)
    if (Array.isArray(tables.auth_sessions)) {
      const revokedIds = new Set<string>();
      try {
        const revRow = this.db.prepare("SELECT value_json FROM system_settings WHERE key = 'revoked_auth_sessions'").get() as any;
        if (revRow?.value_json) {
          const parsed = JSON.parse(revRow.value_json);
          if (Array.isArray(parsed)) {
            for (const id of parsed) revokedIds.add(String(id));
          }
        }
      } catch {}

      for (const row of tables.auth_sessions) {
        try {
          if (!row || !row.id || !row.token || !row.expires_at) continue;
          if (revokedIds.has(String(row.id))) continue;
          if (new Date(row.expires_at).getTime() < Date.now()) continue;
          if (!fromCloud && this.isDbRecordFresher('auth_sessions', { id: row.id }, row.last_activity_at || row.created_at, row)) continue;
          const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO auth_sessions (
              id, token, user_id, role, tenant_id, teacher_id, student_id, child_student_id,
              officer_role_title, credential_version, created_at, expires_at, last_activity_at, is_test_credential
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          stmt.run(
            row.id,
            row.token,
            row.user_id,
            row.role,
            row.tenant_id,
            row.teacher_id || null,
            row.student_id || null,
            row.child_student_id || null,
            row.officer_role_title || null,
            row.credential_version || 1,
            row.created_at || new Date().toISOString(),
            row.expires_at,
            row.last_activity_at || new Date().toISOString(),
            row.is_test_credential ? 1 : 0
          );
          restoredCount++;
        } catch {}
      }
    }

    // 19. Ensure credentials consistency for all hydrated students and teachers
    try {
      credentialRepository.ensureCredentialsForAllStudents();
      if (!credentialRepository.findByTenantAndOwner('tenant-co-binh-mv5brvta', 'tch-mv5brvta', 'TEACHER')) {
        credentialRepository.saveCredential({
          type: 'TEACHER',
          tenant_id: 'tenant-co-binh-mv5brvta',
          owner_id: 'tch-mv5brvta',
          raw_code: 'ACT-CB-MV5BRVTA',
          is_test_credential: true,
          created_by: 'system_bootstrap'
        });
      }
    } catch (credSyncErr: any) {
      console.warn('[PersistenceSyncService] Credential auto-sync note:', credSyncErr?.message);
    }

    return restoredCount;
  }

  /**
   * Hydrates database from disk JSON backup if database was restarted,
   * remixed, cloned, or lacks custom teacher/student records.
   */
  public hydrateFromBackup(): { restored: boolean; message: string } {
    return this.hydrateFromBackupIfAvailable();
  }

  public hydrateFromBackupIfAvailable(options?: { skipFirestoreSync?: boolean }): { restored: boolean; message: string } {
    const freshest = this.getFreshestBackupPayload();
    if (!freshest) {
      return { restored: false, message: 'No JSON persistence backup file found.' };
    }

    try {
      const payload: PersistentDataPayload = JSON.parse(JSON.stringify(freshest.payload));
      if (!payload.tables || typeof payload.tables !== 'object') {
        return { restored: false, message: 'Invalid payload in backup file.' };
      }

      // Safely preserve established admin_accounts from immutable backup if needed,
      // while only merging other tables if the primary backup table is completely empty (preventing deleted records from resurrecting).
      try {
        if (fs.existsSync(this.immutableBackupFile) && freshest.sourceFile !== this.immutableBackupFile) {
          const immRaw = JSON.parse(fs.readFileSync(this.immutableBackupFile, 'utf-8'));
          if (immRaw && immRaw.tables && typeof immRaw.tables === 'object') {
            for (const [table, immRows] of Object.entries(immRaw.tables)) {
              if (!Array.isArray(immRows) || immRows.length === 0) continue;
              if (table === 'admin_accounts') {
                const currentRows = Array.isArray(payload.tables.admin_accounts) ? payload.tables.admin_accounts : [];
                const currentAdmin = currentRows[0];
                const immAdmin = immRows[0];
                if (!this.isEstablishedAdmin(currentAdmin) && this.isEstablishedAdmin(immAdmin)) {
                  payload.tables.admin_accounts = [immAdmin];
                }
                continue;
              }
              const currentRows = Array.isArray(payload.tables[table]) ? payload.tables[table] : [];
              if (currentRows.length === 0) {
                payload.tables[table] = immRows;
              }
            }
          }
        }
      } catch (immMergeErr: any) {
        console.warn('[PersistenceSyncService] Immutable merge note:', immMergeErr?.message);
      }

      const restoredCount = this.hydrateTablesIntoSqlite(payload.tables);

      this.createSafetySnapshot();

      if (!options?.skipFirestoreSync) {
        this.flushToPersistentBackup();
      } else {
        this.flushLocalBackupFilesOnly();
      }

      let totalSqliteRecords = 0;
      for (const t of PERSISTENT_TABLES) {
        try {
          totalSqliteRecords += (this.db.prepare(`SELECT COUNT(*) as c FROM ${t}`).get() as any)?.c ?? 0;
        } catch {}
      }

      return {
        restored: true,
        message: `Successfully hydrated ${restoredCount} newer/missing records from persistent backup (total active SQLite records across 32 tables: ${totalSqliteRecords}).`
      };
    } catch (err: any) {
      console.warn('[PersistenceSyncService] Hydration warning:', err.message);
      return { restored: false, message: err.message };
    }
  }

  /**
   * Returns cumulative SQLite row change count on the singleton connection for fast dirty-state detection.
   */
  private getSqliteTotalChanges(): number {
    try {
      return (this.db.prepare('SELECT total_changes() as c').get() as any)?.c ?? -1;
    } catch {
      return -1;
    }
  }

  /**
   * Cancels any pending debounced flush timer when an immediate/durable flush is already executing.
   */
  private clearPendingDebounceTimer(): void {
    if (this.debouncedTimer) {
      clearTimeout(this.debouncedTimer);
      this.debouncedTimer = null;
    }
    this.firstDebounceCallTime = 0;
  }

  /**
   * Builds a complete snapshot payload from all SQLite persistent tables.
   */
  public buildBackupPayloadFromSqlite(): PersistentDataPayload {
    try {
      this.db.exec('PRAGMA wal_checkpoint(PASSIVE);');
    } catch {}

    const backup: PersistentDataPayload = {
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      tables: {}
    };

    for (const t of PERSISTENT_TABLES) {
      try {
        let rows = this.db.prepare(`SELECT * FROM ${t}`).all();
        if (t === 'admin_accounts') {
          const dbAdmin = rows && rows.length > 0 ? rows[0] : null;
          if (this.isEstablishedAdmin(dbAdmin)) {
            this.cachedCloudAdminAccount = { ...dbAdmin, first_time_setup_completed: 1 };
          } else {
            const establishedFromBackup = this.getEstablishedAdminFromBackups();
            if (establishedFromBackup) {
              rows = [establishedFromBackup];
            }
          }
          backup.tables[t] = rows;
        } else {
          backup.tables[t] = rows;
        }
      } catch {
        backup.tables[t] = [];
      }
    }

    return backup;
  }

  /**
   * Returns a cached snapshot if no SQLite changes occurred since the last build, or builds and serializes a new versioned snapshot.
   */
  private getOrBuildSnapshot(forceRebuild: boolean = false): {
    version: number;
    changeCount: number;
    payload: PersistentDataPayload;
    jsonString: string;
    immJsonString: string;
  } {
    const currentChanges = this.getSqliteTotalChanges();
    if (
      !forceRebuild &&
      this.lastBuiltSnapshot &&
      currentChanges >= 0 &&
      this.lastBuiltSnapshot.changeCount === currentChanges
    ) {
      return this.lastBuiltSnapshot;
    }

    const payload = this.buildBackupPayloadFromSqlite();
    const jsonString = JSON.stringify(payload, null, 2);

    // Ensure IMMUTABLE payload preserves established admin account without re-reading/parsing 6MB from disk on every save
    let immJsonString = jsonString;
    const currentAdmin = Array.isArray(payload.tables.admin_accounts) ? payload.tables.admin_accounts[0] : null;
    if (!this.isEstablishedAdmin(currentAdmin)) {
      const establishedAdmin = this.getEstablishedAdminFromBackups();
      if (establishedAdmin) {
        const immPayload: PersistentDataPayload = {
          version: payload.version,
          exportedAt: payload.exportedAt,
          tables: {
            ...payload.tables,
            admin_accounts: [establishedAdmin]
          }
        };
        immJsonString = JSON.stringify(immPayload, null, 2);
      }
    }

    const version = ++this.snapshotVersionCounter;
    this.lastBuiltSnapshot = {
      version,
      changeCount: currentChanges,
      payload,
      jsonString,
      immJsonString
    };
    return this.lastBuiltSnapshot;
  }

  /**
   * Atomically writes a single backup file asynchronously via temporary file + rename.
   */
  private async writeSingleFileAtomicAsync(targetFile: string, content: string, version: number): Promise<void> {
    const dir = path.dirname(targetFile);
    await fs.promises.mkdir(dir, { recursive: true });
    const tmpFile = `${targetFile}.v${version}.${process.pid}.tmp`;
    try {
      await fs.promises.writeFile(tmpFile, content, 'utf-8');
      await fs.promises.rename(tmpFile, targetFile);
    } catch (err) {
      try {
        await fs.promises.unlink(tmpFile);
      } catch {}
      throw err;
    }
  }

  /**
   * Atomically writes a single backup file synchronously via temporary file + rename.
   */
  private writeSingleFileAtomicSync(targetFile: string, content: string, version: number): void {
    const dir = path.dirname(targetFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tmpFile = `${targetFile}.v${version}.${process.pid}.sync.tmp`;
    try {
      fs.writeFileSync(tmpFile, content, 'utf-8');
      fs.renameSync(tmpFile, targetFile);
    } catch (err) {
      try {
        if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
      } catch {}
      throw err;
    }
  }

  /**
   * Writes primary, secondary, and immutable JSON backups with retry and version verification.
   */
  private async writeSnapshotFilesWithRetryAsync(snapshot: {
    version: number;
    changeCount: number;
    payload: PersistentDataPayload;
    jsonString: string;
    immJsonString: string;
  }): Promise<{ ok: boolean; version: number; error?: string }> {
    const maxAttempts = 3;
    let lastError = '';

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      // Version guard before each retry attempt: never overwrite a newer version
      if (snapshot.version < this.latestQueuedSnapshotVersion || snapshot.version < this.lastWrittenSnapshotVersion) {
        return { ok: true, version: this.lastWrittenSnapshotVersion };
      }

      try {
        await Promise.all([
          this.writeSingleFileAtomicAsync(this.primaryBackupFile, snapshot.jsonString, snapshot.version),
          this.writeSingleFileAtomicAsync(this.secondaryBackupFile, snapshot.jsonString, snapshot.version),
          this.writeSingleFileAtomicAsync(this.immutableBackupFile, snapshot.immJsonString, snapshot.version)
        ]);

        if (snapshot.version >= this.lastWrittenSnapshotVersion) {
          this.lastWrittenSnapshotVersion = snapshot.version;
          this.lastWrittenChangeCount = snapshot.changeCount;
        }
        this.lastLocalBackupError = null;
        return { ok: true, version: snapshot.version };
      } catch (err: any) {
        lastError = err?.message || String(err);
        if (attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, 100 * attempt));
        }
      }
    }

    this.lastLocalBackupError = {
      timestamp: new Date().toISOString(),
      error: lastError,
      version: snapshot.version
    };
    console.error(`[PersistenceSyncService] Local backup file write failed after ${maxAttempts} attempts (v${snapshot.version}):`, lastError);
    this.scheduleDebouncedFlush(2000);
    return { ok: false, version: snapshot.version, error: lastError };
  }

  /**
   * Enqueues a serialized, version-controlled asynchronous write of local JSON backup files.
   * Guarantees older snapshots never overwrite newer snapshots.
   */
  private enqueueLocalBackupWriteAsync(snapshot: {
    version: number;
    changeCount: number;
    payload: PersistentDataPayload;
    jsonString: string;
    immJsonString: string;
  }): Promise<{ ok: boolean; version: number; error?: string }> {
    if (
      snapshot.version <= this.lastWrittenSnapshotVersion &&
      this.lastLocalBackupError === null
    ) {
      return Promise.resolve({ ok: true, version: this.lastWrittenSnapshotVersion });
    }

    this.latestQueuedSnapshotVersion = Math.max(this.latestQueuedSnapshotVersion, snapshot.version);

    const nextWrite = this.fileWriteChainPromise
      .catch(() => ({ ok: false, version: this.lastWrittenSnapshotVersion }))
      .then(async () => {
        if (snapshot.version < this.latestQueuedSnapshotVersion) {
          return { ok: true, version: this.lastWrittenSnapshotVersion };
        }
        if (snapshot.version <= this.lastWrittenSnapshotVersion && this.lastLocalBackupError === null) {
          return { ok: true, version: this.lastWrittenSnapshotVersion };
        }
        return await this.writeSnapshotFilesWithRetryAsync(snapshot);
      });

    this.fileWriteChainPromise = nextWrite;
    return nextWrite;
  }

  /**
   * Writes the SQLite snapshot to local JSON backups without triggering cloud network calls.
   * Avoids redundant VACUUM INTO on every save unless includeSafetySnapshot is requested or safety snapshot is missing.
   */
  public flushLocalBackupFilesOnly(options?: {
    includeSafetySnapshot?: boolean;
    forceRebuild?: boolean;
    asyncWrite?: boolean;
  }): PersistentDataPayload {
    this.clearPendingDebounceTimer();
    const snapshot = this.getOrBuildSnapshot(options?.forceRebuild ?? false);

    if (options?.asyncWrite) {
      this.enqueueLocalBackupWriteAsync(snapshot).catch((err) => {
        console.warn('[PersistenceSyncService] Async backup write note:', err?.message || err);
      });
    } else if (
      snapshot.version > this.lastWrittenSnapshotVersion ||
      this.lastLocalBackupError !== null ||
      options?.forceRebuild
    ) {
      this.latestQueuedSnapshotVersion = Math.max(this.latestQueuedSnapshotVersion, snapshot.version);
      try {
        this.writeSingleFileAtomicSync(this.primaryBackupFile, snapshot.jsonString, snapshot.version);
        this.writeSingleFileAtomicSync(this.secondaryBackupFile, snapshot.jsonString, snapshot.version);
        this.writeSingleFileAtomicSync(this.immutableBackupFile, snapshot.immJsonString, snapshot.version);
        this.lastWrittenSnapshotVersion = snapshot.version;
        this.lastWrittenChangeCount = snapshot.changeCount;
        this.lastLocalBackupError = null;
      } catch (syncWriteErr: any) {
        const errMsg = syncWriteErr?.message || String(syncWriteErr);
        this.lastLocalBackupError = {
          timestamp: new Date().toISOString(),
          error: errMsg,
          version: snapshot.version
        };
        console.error('[PersistenceSyncService] Synchronous local backup write error:', errMsg);
      }
    }

    if (options?.includeSafetySnapshot || !fs.existsSync(this.safetySnapshotFile)) {
      this.createSafetySnapshot();
    }

    return snapshot.payload;
  }

  /**
   * Creates a persistent JSON backup of all SQLite tables and triggers Cloud Firestore sync.
   * Skips redundant work if current SQLite changeCount has already been written and synced.
   */
  public flushToPersistentBackup(): void {
    this.clearPendingDebounceTimer();

    const currentChanges = this.getSqliteTotalChanges();
    const isLocalUpToDate =
      currentChanges >= 0 &&
      currentChanges === this.lastWrittenChangeCount &&
      this.lastLocalBackupError === null;
    const isCloudUpToDate =
      !this.hasCompletedInitialCloudHydration ||
      (currentChanges >= 0 && currentChanges === this.lastCloudSyncedChangeCount && !this.pendingCloudSyncRetry);

    if (isLocalUpToDate && isCloudUpToDate) {
      return;
    }

    if (this.isFlushing) {
      this.hasPendingFlush = true;
      return;
    }
    this.isFlushing = true;

    try {
      const snapshot = this.getOrBuildSnapshot(false);
      this.enqueueLocalBackupWriteAsync(snapshot).catch((err) => {
        console.warn('[PersistenceSyncService] Background local write note:', err?.message || err);
      });

      if (this.hasCompletedInitialCloudHydration && this.firestoreCooldownUntil <= Date.now()) {
        this.syncToFirestoreAsync(snapshot.payload).catch(() => {});
      }
    } catch (err) {
      console.warn('[PersistenceSyncService] Flush error:', err);
    } finally {
      this.isFlushing = false;
      if (this.hasPendingFlush) {
        this.hasPendingFlush = false;
        setTimeout(() => {
          this.flushToPersistentBackup();
        }, 50);
      }
    }
  }

  /**
   * Durably flushes local SQLite & JSON backups AND awaits Cloud Firestore commit before returning.
   * Used by mutating API routes and startup sync to guarantee data is saved in local backup files and Cloud Firestore before confirming.
   */
  public async flushAndSyncToCloudAsync(options?: {
    forceFullSync?: boolean;
    allowDeletes?: boolean;
    includeSafetySnapshot?: boolean;
  }): Promise<{ ok: boolean; syncedCount: number; deletedCount: number; error?: string }> {
    this.clearPendingDebounceTimer();
    const forceFullSync = options?.forceFullSync ?? false;
    const allowDeletes = options?.allowDeletes ?? false;

    const snapshot = this.getOrBuildSnapshot(forceFullSync);

    const [localWriteRes, cloudSyncRes] = await Promise.all([
      this.enqueueLocalBackupWriteAsync(snapshot),
      this.syncPayloadToCloudWithDiffAsync(snapshot.payload, {
        forceFullSync,
        allowDeletes,
        changeCount: snapshot.changeCount
      })
    ]);

    if (options?.includeSafetySnapshot || !fs.existsSync(this.safetySnapshotFile)) {
      this.createSafetySnapshot();
    }

    if (!localWriteRes.ok) {
      return {
        ok: false,
        syncedCount: cloudSyncRes.syncedCount,
        deletedCount: cloudSyncRes.deletedCount,
        error: `Lỗi ghi tệp sao lưu cục bộ: ${localWriteRes.error}`
      };
    }

    return cloudSyncRes;
  }

  private async syncPayloadToCloudWithDiffAsync(
    payload: PersistentDataPayload,
    options: { forceFullSync: boolean; allowDeletes: boolean; changeCount?: number }
  ): Promise<{ ok: boolean; syncedCount: number; deletedCount: number; error?: string }> {
    if (process.env.ENABLE_FIRESTORE_SYNC === 'false') {
      if (typeof options.changeCount === 'number' && options.changeCount >= 0) {
        this.lastCloudSyncedChangeCount = options.changeCount;
      }
      this.pendingCloudSyncRetry = false;
      return { ok: true, syncedCount: 0, deletedCount: 0 };
    }
    if (!this.projectId) {
      return { ok: false, syncedCount: 0, deletedCount: 0, error: 'Missing Firebase projectId configuration.' };
    }

    if (this.activeCloudSyncPromise && !options.forceFullSync) {
      await this.activeCloudSyncPromise.catch(() => {});
    }

    // Fast path: if an earlier sync already committed this exact SQLite changeCount and no deletes/forceFullSync requested
    if (
      !options.forceFullSync &&
      !options.allowDeletes &&
      !this.pendingCloudSyncRetry &&
      typeof options.changeCount === 'number' &&
      options.changeCount >= 0 &&
      options.changeCount === this.lastCloudSyncedChangeCount
    ) {
      return { ok: true, syncedCount: 0, deletedCount: 0 };
    }

    const runSync = async (): Promise<{ ok: boolean; syncedCount: number; deletedCount: number; error?: string }> => {
      const nowIso = new Date().toISOString();
      const docPrefix = `projects/${this.projectId}/databases/${this.firestoreDatabaseId}/documents`;
      const currentDocHashes = new Map<string, { hash: string; row: any }>();

      for (const tableName of PERSISTENT_TABLES) {
        const rows = payload.tables[tableName];
        if (!Array.isArray(rows)) continue;
        for (const row of rows) {
          const docId = getCanonicalDocId(tableName, row);
          if (!docId) continue;
          const relPath = `${tableName}/${docId}`;
          const hash = JSON.stringify(row);
          currentDocHashes.set(relPath, { hash, row });
        }
      }

      const writes: any[] = [];
      const updatedPaths: Array<{ relPath: string; hash: string }> = [];
      const deletedPaths: string[] = [];

      for (const [relPath, { hash, row }] of currentDocHashes.entries()) {
        if (options.forceFullSync || this.syncedDocHashes.get(relPath) !== hash) {
          writes.push({
            update: {
              name: `${docPrefix}/${relPath}`,
              fields: toFirestoreFields({ ...row, _syncedAt: nowIso })
            }
          });
          updatedPaths.push({ relPath, hash });
        }
      }

      if (options.allowDeletes && this.syncedDocHashes.size > 0) {
        for (const prevPath of this.syncedDocHashes.keys()) {
          if (!currentDocHashes.has(prevPath)) {
            writes.push({
              delete: `${docPrefix}/${prevPath}`
            });
            deletedPaths.push(prevPath);
          }
        }
      }

      // Always update platform_sync/metadata when there are changes or during forceFullSync
      if (writes.length > 0 || options.forceFullSync) {
        const metaDoc = {
          version: payload.version,
          exportedAt: payload.exportedAt,
          lastSyncedAt: nowIso,
          tenantCount: (payload.tables.tenants || []).length,
          teacherCount: (payload.tables.teacher_accounts || []).length,
          studentCount: (payload.tables.students || []).length,
          credentialCount: (payload.tables.credentials || []).length,
          adminCount: (payload.tables.admin_accounts || []).length,
          assignmentCount: (payload.tables.assignments || []).length,
          postCount: (payload.tables.posts || []).length,
          academicCount: (payload.tables.academic_records || []).length
        };
        writes.push({
          update: {
            name: `${docPrefix}/platform_sync/metadata`,
            fields: toFirestoreFields(metaDoc)
          }
        });
      }

      if (writes.length === 0) {
        if (typeof options.changeCount === 'number' && options.changeCount >= 0) {
          this.lastCloudSyncedChangeCount = options.changeCount;
        }
        this.pendingCloudSyncRetry = false;
        return { ok: true, syncedCount: 0, deletedCount: 0 };
      }

      const commitRes = await this.commitWritesToFirestoreRest(
        writes,
        options.forceFullSync ? 'full_sync' : 'incremental_sync'
      );

      if (!commitRes.ok) {
        this.pendingCloudSyncRetry = true;
        return {
          ok: false,
          syncedCount: 0,
          deletedCount: 0,
          error: commitRes.error || 'Firestore commit failed'
        };
      }

      for (const item of updatedPaths) {
        this.syncedDocHashes.set(item.relPath, item.hash);
      }
      for (const delPath of deletedPaths) {
        this.syncedDocHashes.delete(delPath);
      }

      if (typeof options.changeCount === 'number' && options.changeCount >= 0) {
        this.lastCloudSyncedChangeCount = options.changeCount;
      }
      this.pendingCloudSyncRetry = false;
      this.firestoreWarned = false;
      console.log(
        `[PersistenceSyncService] Cloud Firestore commit OK (synced: ${updatedPaths.length}, deleted: ${deletedPaths.length}).`
      );
      return {
        ok: true,
        syncedCount: updatedPaths.length,
        deletedCount: deletedPaths.length
      };
    };

    this.activeCloudSyncPromise = runSync();
    try {
      return await this.activeCloudSyncPromise;
    } finally {
      this.activeCloudSyncPromise = null;
    }
  }

  /**
   * Identifies if a Firestore error is related to missing permissions, security rules, or quota limits.
   */
  public isPermissionDeniedOrQuotaError(err: any): boolean {
    if (!err) return false;
    const msg = String(err?.message || err);
    const code = String(err?.code || '');
    return (
      code === 'permission-denied' ||
      code === '7' ||
      code === 'resource-exhausted' ||
      msg.includes('PERMISSION_DENIED') ||
      msg.includes('Missing or insufficient permissions') ||
      msg.includes('RESOURCE_EXHAUSTED') ||
      msg.includes('Quota exceeded')
    );
  }

  public handleFirestoreSyncError(err: any, collectionContext: string): boolean {
    console.warn(`[PersistenceSyncService] Firestore sync note at [${collectionContext}]:`, err?.message || err);
    return false;
  }

  public resetFirestoreCircuitBreaker(): void {
    this.firestoreCircuitBreaker = false;
    this.firestoreCooldownUntil = 0;
    this.firestoreWarned = false;
  }

  /**
   * Tests and verifies real Cloud Firestore connectivity and permissions using Cloud Run Server Auth + REST v1
   */
  public async verifyFirestoreConnection(): Promise<{ connected: boolean; errorCode?: string; errorMessage?: string; details?: any }> {
    if (!this.projectId) {
      const res = {
        connected: false,
        errorCode: 'NOT_CONFIGURED',
        errorMessage: 'Firestore chưa được cấu hình hoặc thiếu projectId.',
        details: {
          projectId: this.projectId,
          databaseId: this.firestoreDatabaseId
        }
      };
      this.lastVerificationResult = { ...res, checkedAt: new Date().toISOString(), message: res.errorMessage };
      return res;
    }

    try {
      const token = await this.getCloudRunFirestoreToken();
      if (!token) {
        throw new Error('Không thể lấy Firebase ID Token từ Cloud Run Metadata Server.');
      }

      const queryRes = await this.queryCollectionFromFirestoreRest('platform_sync');
      if (!queryRes.ok) {
        throw new Error(queryRes.error || 'Firestore query failed');
      }

      const details = {
        projectId: this.projectId,
        databaseId: this.firestoreDatabaseId,
        serviceAccount: this.cachedFirebaseToken?.email || 'ais-sandbox@ais-asia-southeast1-4497a4ef53.iam.gserviceaccount.com',
        authUid: this.cachedFirebaseToken?.uid || 'I0Pvtgs2iigapt3C1G4zvuqFY5O2',
        authMode: 'CLOUD_RUN_OIDC_FIREBASE_AUTH'
      };
      this.lastVerificationResult = {
        connected: true,
        checkedAt: new Date().toISOString(),
        message: 'Xác nhận kết nối và quyền truy cập Cloud Firestore từ máy chủ Cloud Run thành công.',
        details
      };
      return { connected: true, details };
    } catch (err: any) {
      const isPermDenied = this.isPermissionDeniedOrQuotaError(err);
      const details = {
        projectId: this.projectId,
        databaseId: this.firestoreDatabaseId,
        serviceAccount: this.cachedFirebaseToken?.email || 'ais-sandbox@ais-asia-southeast1-4497a4ef53.iam.gserviceaccount.com',
        note: err?.message || String(err)
      };
      const res = {
        connected: false,
        errorCode: isPermDenied ? 'PERMISSION_DENIED' : 'CONNECTION_FAILED',
        errorMessage: err?.message || String(err),
        details
      };
      this.lastVerificationResult = {
        connected: false,
        checkedAt: new Date().toISOString(),
        message: res.errorMessage,
        details
      };
      return res;
    }
  }

  public getLastVerificationResult() {
    return this.lastVerificationResult;
  }

  public getBackupSyncDiagnostics() {
    return {
      snapshotVersionCounter: this.snapshotVersionCounter,
      latestQueuedSnapshotVersion: this.latestQueuedSnapshotVersion,
      lastWrittenSnapshotVersion: this.lastWrittenSnapshotVersion,
      lastWrittenChangeCount: this.lastWrittenChangeCount,
      lastCloudSyncedChangeCount: this.lastCloudSyncedChangeCount,
      lastSafetySnapshotChangeCount: this.lastSafetySnapshotChangeCount,
      lastSafetySnapshotAt: this.lastSafetySnapshotAt ? new Date(this.lastSafetySnapshotAt).toISOString() : null,
      pendingCloudSyncRetry: this.pendingCloudSyncRetry,
      lastLocalBackupError: this.lastLocalBackupError,
      lastSafetySnapshotError: this.lastSafetySnapshotError
    };
  }

  /**
   * Mirror records to Cloud Firestore for persistent cloud backup across remix/container lifecycle
   */
  public async syncToFirestoreAsync(payload: PersistentDataPayload): Promise<void> {
    await this.syncPayloadToCloudWithDiffAsync(payload, {
      forceFullSync: false,
      allowDeletes: false,
      changeCount: this.lastBuiltSnapshot?.changeCount
    });
  }

  /**
   * Directly mirrors the updated Super Admin account to Cloud Firestore.
   * Called by AdminAccountRepository whenever Admin credentials or settings change.
   */
  public async syncAdminAccountDirectly(row: any): Promise<{ ok: boolean; error?: string }> {
    this.setCachedCloudAdminAccount(row);
    if (!this.projectId || process.env.ENABLE_FIRESTORE_SYNC === 'false') {
      return { ok: true };
    }
    try {
      const nowIso = new Date().toISOString();
      const adminId = sanitizeDocId(row.id || 'usr-super-admin');
      const docName = `projects/${this.projectId}/databases/${this.firestoreDatabaseId}/documents/admin_accounts/${adminId}`;
      const res = await this.commitWritesToFirestoreRest(
        [
          {
            update: {
              name: docName,
              fields: toFirestoreFields({ ...row, _syncedAt: nowIso })
            }
          }
        ],
        'admin_accounts_direct'
      );
      if (res.ok) {
        this.syncedDocHashes.set(`admin_accounts/${adminId}`, JSON.stringify(row));
        console.log('[PersistenceSyncService] Successfully synchronized established Super Admin account directly to Cloud Firestore.');
        return { ok: true };
      }
      return { ok: false, error: res.error };
    } catch (e: any) {
      this.handleFirestoreSyncError(e, 'admin_accounts_direct');
      return { ok: false, error: e?.message || String(e) };
    }
  }

  /**
   * Hydrates records from Cloud Firestore if present and restores them to SQLite without overwriting fresher records.
   */
  public async hydrateFromFirestoreIfAvailableAsync(): Promise<{ restored: boolean; count: number; message: string }> {
    if (!this.projectId || process.env.ENABLE_FIRESTORE_SYNC === 'false') {
      this.hasCompletedInitialCloudHydration = true;
      return { restored: false, count: 0, message: 'Cloud Firestore sync is disabled or not configured.' };
    }

    try {
      const token = await this.getCloudRunFirestoreToken();
      if (!token) {
        return {
          restored: false,
          count: 0,
          message: 'Không thể khởi tạo mã xác thực máy chủ Cloud Run tới Firestore.'
        };
      }

      const firestoreTables: Record<string, any[]> = {};
      let fetchedDocCount = 0;

      // Query all persistent collections in parallel batches of 8 for fast startup hydration
      const batchSize = 8;
      for (let i = 0; i < PERSISTENT_TABLES.length; i += batchSize) {
        const batchCols = PERSISTENT_TABLES.slice(i, i + batchSize);
        const results = await Promise.all(
          batchCols.map(async (col) => {
            const q = await this.queryCollectionFromFirestoreRest(col);
            return { col, q };
          })
        );

        for (const { col, q } of results) {
          if (q.ok && q.docs.length > 0) {
            const cleanRows: any[] = [];
            for (const d of q.docs) {
              const { _syncedAt, ...cleanRow } = d.data;
              cleanRows.push(cleanRow);
              const canonicalId = getCanonicalDocId(col, cleanRow) || d.docId;
              this.syncedDocHashes.set(`${col}/${canonicalId}`, JSON.stringify(cleanRow));
              fetchedDocCount++;
            }
            firestoreTables[col] = cleanRows;
          }
        }
      }

      this.hasCompletedInitialCloudHydration = true;

      if (fetchedDocCount === 0) {
        return { restored: false, count: 0, message: 'Cloud Firestore chưa có bản ghi nào, sẵn sàng đồng bộ khởi tạo.' };
      }

      const totalRestored = this.hydrateTablesIntoSqlite(firestoreTables, { fromCloud: true });

      if (totalRestored > 0) {
        this.flushLocalBackupFilesOnly();
        return {
          restored: true,
          count: totalRestored,
          message: `Khôi phục thành công ${totalRestored} bản ghi mới hơn từ Cloud Firestore (tổng ${fetchedDocCount} tài liệu trên Cloud).`
        };
      }

      return {
        restored: false,
        count: 0,
        message: `Đã đối chiếu ${fetchedDocCount} tài liệu trên Cloud Firestore; dữ liệu cục bộ đã ở trạng thái mới nhất.`
      };
    } catch (err: any) {
      this.hasCompletedInitialCloudHydration = true;
      console.warn('[PersistenceSyncService] Firestore hydration error:', err?.message);
      return { restored: false, count: 0, message: err?.message || 'Firestore hydration error' };
    }
  }

  /**
   * Creates an atomic, standalone SQLite backup snapshot using VACUUM INTO to a temporary file followed by atomic rename.
   * Never unlinks the existing safety snapshot before the new snapshot is completely written.
   */
  public createSafetySnapshot(): void {
    const tmpSnapshotFile = `${this.safetySnapshotFile}.${process.pid}.tmp`;
    try {
      const dataDir = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      try {
        this.db.exec('PRAGMA wal_checkpoint(PASSIVE);');
      } catch {}

      if (fs.existsSync(tmpSnapshotFile)) {
        try {
          fs.unlinkSync(tmpSnapshotFile);
        } catch {}
      }

      const escapedTmpPath = tmpSnapshotFile.replace(/'/g, "''");
      this.db.exec(`VACUUM INTO '${escapedTmpPath}';`);
      fs.renameSync(tmpSnapshotFile, this.safetySnapshotFile);

      this.lastSafetySnapshotChangeCount = this.getSqliteTotalChanges();
      this.lastSafetySnapshotAt = Date.now();
      this.lastSafetySnapshotError = null;
    } catch (err: any) {
      try {
        if (fs.existsSync(tmpSnapshotFile)) {
          fs.unlinkSync(tmpSnapshotFile);
        }
      } catch {}
      const errMsg = err?.message || String(err);
      this.lastSafetySnapshotError = {
        timestamp: new Date().toISOString(),
        error: errMsg
      };
      console.warn('[PersistenceSyncService] Snapshot error:', errMsg);
    }
  }
}

export const persistenceSyncService = PersistenceSyncService.getInstance();