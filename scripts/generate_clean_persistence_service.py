import os

service_code = """/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDocs, collection, Firestore } from 'firebase/firestore';
import { getDatabase } from '../db/database';
import { credentialRepository } from '../repositories/CredentialRepository';

export interface PersistentDataPayload {
  version: string;
  exportedAt: string;
  tables: Record<string, any[]>;
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
  private firestoreDb: Firestore | null = null;

  private constructor() {
    this.db = getDatabase();
    this.primaryBackupFile = path.join(process.cwd(), 'server', 'db', 'system_persistence_backup.json');
    this.secondaryBackupFile = path.join(process.cwd(), 'data', 'system_persistence_backup.json');
    this.immutableBackupFile = path.join(process.cwd(), 'server', 'db', 'system_persistence_backup_IMMUTABLE.json');
    this.safetySnapshotFile = path.join(process.cwd(), 'data', 'kgcns_master_safety_snapshot.db');

    // Initialize Cloud Firestore client if firebase config is present
    try {
      const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        if (config.projectId) {
          const app = getApps().length > 0 ? getApp() : initializeApp(config);
          this.firestoreDb = getFirestore(app, config.firestoreDatabaseId || '(default)');
          console.log('[PersistenceSyncService] Cloud Firestore connection active (db:', config.firestoreDatabaseId || '(default)', ')');
        }
      }
    } catch (e: any) {
      console.warn('[PersistenceSyncService] Cloud Firestore init note:', e?.message);
    }

    // Auto-sync interval: automatically flush and check backups every 3 minutes
    setInterval(() => {
      try {
        this.flushToPersistentBackup();
      } catch {}
    }, 3 * 60 * 1000).unref();
  }

  public static getInstance(): PersistenceSyncService {
    if (!PersistenceSyncService.instance) {
      PersistenceSyncService.instance = new PersistenceSyncService();
    }
    return PersistenceSyncService.instance;
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
   * Checks whether the current database already has this record with an equal or newer updated_at.
   * If true, hydration should NOT overwrite the database row with older backup data.
   */
  public isDbRecordFresher(
    tableName: string,
    keys: Record<string, any>,
    incomingUpdatedAt?: string | null
  ): boolean {
    try {
      const whereClauses = Object.keys(keys).map(k => `${k} = ?`).join(' AND ');
      const params = Object.values(keys);
      const row = this.db.prepare(`SELECT updated_at FROM ${tableName} WHERE ${whereClauses}`).get(...params) as any;
      if (!row) return false;
      if (!row.updated_at) return true;
      if (!incomingUpdatedAt) return true;
      const dbTime = new Date(row.updated_at).getTime();
      const incTime = new Date(incomingUpdatedAt).getTime();
      if (isNaN(incTime)) return true;
      if (isNaN(dbTime)) return false;
      return dbTime >= incTime;
    } catch {
      return false;
    }
  }

  /**
   * Hydrates database from disk JSON backup if database was restarted,
   * remixed, cloned, or lacks custom teacher/student records.
   */
  public hydrateFromBackup(): { restored: boolean; message: string } {
    return this.hydrateFromBackupIfAvailable();
  }

  public hydrateFromBackupIfAvailable(): { restored: boolean; message: string } {
    const freshest = this.getFreshestBackupPayload();
    if (!freshest) {
      return { restored: false, message: 'No JSON persistence backup file found.' };
    }

    try {
      const payload: PersistentDataPayload = freshest.payload;
      if (!payload.tables || typeof payload.tables !== 'object') {
        return { restored: false, message: 'Invalid payload in backup file.' };
      }

      let restoredCount = 0;

      // 1. Ensure established records from immutable backup are safely merged if reading another file
      try {
        if (fs.existsSync(this.immutableBackupFile) && freshest.sourceFile !== this.immutableBackupFile) {
          const immRaw = JSON.parse(fs.readFileSync(this.immutableBackupFile, 'utf-8'));
          if (immRaw && immRaw.tables && typeof immRaw.tables === 'object') {
            for (const [table, immRows] of Object.entries(immRaw.tables)) {
              if (!Array.isArray(immRows) || immRows.length === 0) continue;
              if (table === 'admin_accounts') {
                const currentRows = Array.isArray(payload.tables.admin_accounts) ? payload.tables.admin_accounts : [];
                const currentAdmin = currentRows[0];
                if (currentAdmin && (currentAdmin.first_time_setup_completed === 1 || currentAdmin.password_updated_at)) {
                  continue;
                }
                const immAdmin = immRows[0];
                if (immAdmin && (immAdmin.first_time_setup_completed === 1 || immAdmin.password_updated_at)) {
                  payload.tables.admin_accounts = [immAdmin];
                }
                continue;
              }
              const currentRows = Array.isArray(payload.tables[table]) ? payload.tables[table] : [];
              const keyProp = table === 'class_settings' ? 'tenant_id' : (table === 'timetables' ? 'tenant_id' : 'id');
              const existingKeys = new Set(currentRows.map((r: any) => r[keyProp]));
              for (const immRow of immRows as any[]) {
                if (immRow && immRow[keyProp] && !existingKeys.has(immRow[keyProp])) {
                  currentRows.push(immRow);
                  existingKeys.add(immRow[keyProp]);
                }
              }
              payload.tables[table] = currentRows;
            }
          }
        }
      } catch (immMergeErr: any) {
        console.warn('[PersistenceSyncService] Immutable merge note:', immMergeErr?.message);
      }

      // 1. Hydrate Admin Accounts
      let adminRows = payload.tables.admin_accounts;
      if (Array.isArray(adminRows)) {
        for (const row of adminRows) {
          try {
            const adminId = row.id || 'usr-super-admin';
            const existingAdmin = this.db.prepare('SELECT first_time_setup_completed, password_updated_at FROM admin_accounts WHERE id = ?').get(adminId) as any;
            if (existingAdmin && (existingAdmin.first_time_setup_completed === 1 || existingAdmin.password_updated_at)) {
              if (row.first_time_setup_completed !== 1 && !row.password_updated_at) {
                continue; // Do NOT overwrite established admin with unconfigured admin!
              }
            }
            if (this.isDbRecordFresher('admin_accounts', { id: adminId }, row.updated_at)) {
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
              row.id || 'usr-super-admin',
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
              (row.first_time_setup_completed === 1 || Boolean(row.password_updated_at)) ? 1 : 0,
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
      if (Array.isArray(payload.tables.tenants)) {
        for (const row of payload.tables.tenants) {
          try {
            if (this.isDbRecordFresher('tenants', { id: row.id }, row.updated_at)) continue;
            const stmt = this.db.prepare(`
              INSERT OR REPLACE INTO tenants (
                id, name, school_name, owner_id, owner_email, owner_name,
                plan, status, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            stmt.run(
              row.id, row.name, row.school_name, row.owner_id, row.owner_email,
              row.owner_name, row.plan, row.status, row.created_at, row.updated_at
            );
            restoredCount++;
          } catch {}
        }
      }

      // 3. Hydrate Teacher Accounts
      if (Array.isArray(payload.tables.teacher_accounts)) {
        for (const row of payload.tables.teacher_accounts) {
          try {
            if (this.isDbRecordFresher('teacher_accounts', { teacher_id: row.teacher_id }, row.updated_at)) continue;
            const stmt = this.db.prepare(`
              INSERT OR REPLACE INTO teacher_accounts (
                id, teacher_id, tenant_id, full_name, email, phone,
                google_sub, google_email, login_method, status, credential_version,
                created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            stmt.run(
              row.id, row.teacher_id, row.tenant_id, row.full_name, row.email,
              row.phone, row.google_sub, row.google_email, row.login_method,
              row.status, row.credential_version || 1, row.created_at, row.updated_at
            );
            restoredCount++;
          } catch {}
        }
      }

      // 4. Hydrate Class Settings
      if (Array.isArray(payload.tables.class_settings)) {
        for (const row of payload.tables.class_settings) {
          try {
            if (this.isDbRecordFresher('class_settings', { tenant_id: row.tenant_id, class_id: row.class_id }, row.updated_at)) continue;
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
              row.slogan, row.cover_image, row.total_students, row.theme_json, row.subjects_json,
              row.interaction_settings_json, row.google_integration_json, row.zalo_settings_json,
              row.ai_config_json, row.school_year_timeline_json, row.student_identity_mode,
              row.raw_metadata, row.created_at, row.updated_at
            );
            restoredCount++;
          } catch {}
        }
      }

      // 5. Hydrate Credentials
      if (Array.isArray(payload.tables.credentials)) {
        for (const row of payload.tables.credentials) {
          try {
            if (this.isDbRecordFresher('credentials', { id: row.id }, row.password_updated_at || row.last_issued_at || row.created_at)) continue;
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
      if (Array.isArray(payload.tables.students)) {
        for (const row of payload.tables.students) {
          try {
            if (this.isDbRecordFresher('students', { tenant_id: row.tenant_id, id: row.id }, row.updated_at || row.created_at)) continue;
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
              row.id, row.tenant_id, row.class_id, row.code, row.full_name, row.gender, row.dob,
              row.group_num, row.officer_role, row.avatar, row.phone, row.email, row.address,
              row.father_name, row.father_phone, row.father_job, row.mother_name, row.mother_phone, row.mother_job,
              row.health_notes, row.talents, row.private_teacher_notes, row.needs_special_attention,
              row.attention_categories, row.attention_note, row.support_measure, row.attention_status,
              row.attention_started_at, row.attention_updated_at, row.attention_updated_by,
              row.anonymous_code, row.status, row.raw_metadata, row.created_at, row.updated_at
            );
            restoredCount++;
          } catch {}
        }
      }

      // 7. Hydrate Assignments
      if (Array.isArray(payload.tables.assignments)) {
        for (const row of payload.tables.assignments) {
          try {
            if (this.isDbRecordFresher('assignments', { tenant_id: row.tenant_id, id: row.id }, row.updated_at || row.created_at)) continue;
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
              row.class_id,
              row.title,
              row.subject,
              row.assigned_date,
              row.due_date,
              row.description,
              row.status || 'ACTIVE',
              row.is_pinned ? 1 : 0,
              row.bg_color || null,
              row.text_color || null,
              row.author_role || null,
              row.author_name || null,
              row.created_at,
              row.updated_at || row.created_at
            );
            restoredCount++;
          } catch {}
        }
      }

      // 8. Hydrate Exam Schedules
      if (Array.isArray(payload.tables.exam_schedules)) {
        for (const row of payload.tables.exam_schedules) {
          try {
            if (this.isDbRecordFresher('exam_schedules', { tenant_id: row.tenant_id, id: row.id }, row.created_at)) continue;
            const stmt = this.db.prepare(`
              INSERT OR REPLACE INTO exam_schedules (
                id, tenant_id, class_id, exam_title, subject, exam_date,
                start_time, duration_minutes, room, notes, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            stmt.run(
              row.id, row.tenant_id, row.class_id, row.exam_title, row.subject,
              row.exam_date, row.start_time, row.duration_minutes, row.room, row.notes, row.created_at
            );
            restoredCount++;
          } catch {}
        }
      }

      // 9. Hydrate Timetables
      if (Array.isArray(payload.tables.timetables)) {
        for (const row of payload.tables.timetables) {
          try {
            if (this.isDbRecordFresher('timetables', { tenant_id: row.tenant_id, class_id: row.class_id, academic_year: row.academic_year, semester: row.semester }, row.updated_at)) continue;
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
              row.schedule_grid_json,
              row.updated_at || new Date().toISOString(),
              row.updated_by || 'system'
            );
            restoredCount++;
          } catch {}
        }
      }

      // 10. Hydrate User Avatars
      if (Array.isArray(payload.tables.user_avatars)) {
        for (const row of payload.tables.user_avatars) {
          try {
            if (this.isDbRecordFresher('user_avatars', { user_key: row.user_key }, row.updated_at)) continue;
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
      if (Array.isArray(payload.tables.posts)) {
        for (const row of payload.tables.posts) {
          try {
            if (this.isDbRecordFresher('posts', { tenant_id: row.tenant_id, id: row.id }, row.updated_at || row.created_at)) continue;
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
              row.author_id,
              row.author_name,
              row.author_role,
              row.author_avatar || null,
              row.category || 'Thông báo',
              row.title,
              row.content,
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

      // 12. Hydrate Academic Records
      if (Array.isArray(payload.tables.academic_records)) {
        for (const row of payload.tables.academic_records) {
          try {
            if (this.isDbRecordFresher('academic_records', { tenant_id: row.tenant_id, id: row.id }, row.updated_at || row.created_at)) continue;
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

      // 13. Hydrate Training Transactions
      if (Array.isArray(payload.tables.training_transactions)) {
        for (const row of payload.tables.training_transactions) {
          try {
            if (this.isDbRecordFresher('training_transactions', { tenant_id: row.tenant_id, id: row.id }, row.created_at)) continue;
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
              row.title,
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

      // 14. Hydrate Laurel Trees
      if (Array.isArray(payload.tables.laurel_trees)) {
        for (const row of payload.tables.laurel_trees) {
          try {
            if (this.isDbRecordFresher('laurel_trees', { tenant_id: row.tenant_id, student_id: row.student_id }, row.updated_at)) continue;
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

      // 15. Hydrate Graduation Choices
      if (Array.isArray(payload.tables.graduation_choices)) {
        for (const row of payload.tables.graduation_choices) {
          try {
            if (this.isDbRecordFresher('graduation_choices', { tenant_id: row.tenant_id, id: row.id }, row.updated_at || row.created_at)) continue;
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

      // 16. Hydrate Career Profiles
      if (Array.isArray(payload.tables.career_profiles)) {
        for (const row of payload.tables.career_profiles) {
          try {
            if (this.isDbRecordFresher('career_profiles', { tenant_id: row.tenant_id, id: row.id }, row.updated_at || row.created_at)) continue;
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

      // 17. Hydrate Surveys (Templates & Responses)
      if (Array.isArray(payload.tables.survey_templates)) {
        for (const row of payload.tables.survey_templates) {
          try {
            if (this.isDbRecordFresher('survey_templates', { tenant_id: row.tenant_id, id: row.id }, row.updated_at || row.created_at)) continue;
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

      if (Array.isArray(payload.tables.survey_responses)) {
        for (const row of payload.tables.survey_responses) {
          try {
            if (this.isDbRecordFresher('survey_responses', { tenant_id: row.tenant_id, id: row.id }, row.updated_at || row.created_at)) continue;
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

      // 18. Hydrate Parent Communication
      if (Array.isArray(payload.tables.parent_conversations)) {
        for (const row of payload.tables.parent_conversations) {
          try {
            if (this.isDbRecordFresher('parent_conversations', { tenant_id: row.tenant_id, id: row.id }, row.updated_at || row.created_at)) continue;
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

      if (Array.isArray(payload.tables.parent_announcements)) {
        for (const row of payload.tables.parent_announcements) {
          try {
            if (this.isDbRecordFresher('parent_announcements', { tenant_id: row.tenant_id, id: row.id }, row.sent_at || row.created_at)) continue;
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

      // 19. Hydrate System Settings
      if (Array.isArray(payload.tables.system_settings)) {
        for (const row of payload.tables.system_settings) {
          try {
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

      // 20. Ensure credentials consistency for all hydrated students and teachers
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

      // Create snapshot after hydration
      this.createSafetySnapshot();

      // Immediately synchronize persistent backups with the verified SQLite state
      this.flushToPersistentBackup();

      return {
        restored: true,
        message: `Successfully hydrated ${restoredCount} records from persistent backup.`
      };
    } catch (err: any) {
      console.warn('[PersistenceSyncService] Hydration warning:', err.message);
      return { restored: false, message: err.message };
    }
  }

  /**
   * Synchronously creates a persistent JSON backup of all key SQLite tables.
   */
  public flushToPersistentBackup(): void {
    if (this.isFlushing) {
      this.hasPendingFlush = true;
      return;
    }
    this.isFlushing = true;

    try {
      // Checkpoint SQLite WAL to write all active transactions to main db file
      try {
        this.db.exec('PRAGMA wal_checkpoint(PASSIVE);');
      } catch {}

      const tables = [
        'admin_accounts',
        'teacher_accounts',
        'tenants',
        'class_settings',
        'credentials',
        'students',
        'academic_records',
        'timetables',
        'training_transactions',
        'training_rule_configs',
        'laurel_trees',
        'posts',
        'survey_templates',
        'survey_responses',
        'career_profiles',
        'graduation_choices',
        'system_settings',
        'assignments',
        'exam_schedules',
        'user_avatars',
        'parent_conversations',
        'parent_announcements'
      ];

      const backup: PersistentDataPayload = {
        version: '2.0.0',
        exportedAt: new Date().toISOString(),
        tables: {}
      };

      for (const t of tables) {
        try {
          const rows = this.db.prepare(`SELECT * FROM ${t}`).all();
          if (t === 'admin_accounts' && (!rows || rows.length === 0)) {
            if (fs.existsSync(this.immutableBackupFile)) {
              try {
                const immRaw = JSON.parse(fs.readFileSync(this.immutableBackupFile, 'utf-8'));
                if (Array.isArray(immRaw?.tables?.admin_accounts) && immRaw.tables.admin_accounts.length > 0) {
                  backup.tables[t] = immRaw.tables.admin_accounts;
                } else {
                  backup.tables[t] = rows;
                }
              } catch {
                backup.tables[t] = rows;
              }
            } else {
              backup.tables[t] = rows;
            }
          } else {
            backup.tables[t] = rows;
          }
        } catch {
          backup.tables[t] = [];
        }
      }

      const jsonString = JSON.stringify(backup, null, 2);

      // Write to primary backup location (server/db/ - preserved in git/remix)
      try {
        const dir1 = path.dirname(this.primaryBackupFile);
        if (!fs.existsSync(dir1)) fs.mkdirSync(dir1, { recursive: true });
        fs.writeFileSync(this.primaryBackupFile, jsonString, 'utf-8');
      } catch {}

      // Write to secondary backup location (data/)
      try {
        const dir2 = path.dirname(this.secondaryBackupFile);
        if (!fs.existsSync(dir2)) fs.mkdirSync(dir2, { recursive: true });
        fs.writeFileSync(this.secondaryBackupFile, jsonString, 'utf-8');
      } catch {}

      // Write established admin account, teachers, tenants, class_settings, credentials, and students to immutable backup location so restarts/remix preserve all accounts
      try {
        let immPayload: any = {};
        if (fs.existsSync(this.immutableBackupFile)) {
          try {
            immPayload = JSON.parse(fs.readFileSync(this.immutableBackupFile, 'utf-8'));
          } catch {
            immPayload = {};
          }
        }
        immPayload.tables = immPayload.tables || {};

        if (backup.tables.admin_accounts && backup.tables.admin_accounts.length > 0) {
          const established = backup.tables.admin_accounts[0];
          if (established && (established.first_time_setup_completed === 1 || established.password_updated_at || established.recovery_code_hash || (established.password_hash && typeof established.password_hash === 'string' && established.password_hash.startsWith('scrypt:')))) {
            immPayload.tables.admin_accounts = [established];
          }
        }

        // Preserve all populated entities in immutable backup to survive restarts/remix/export
        for (const t of tables) {
          if (t === 'admin_accounts') continue;
          if (Array.isArray(backup.tables[t]) && backup.tables[t].length > 0) {
            immPayload.tables[t] = backup.tables[t];
          }
        }

        immPayload.exportedAt = new Date().toISOString();
        fs.writeFileSync(this.immutableBackupFile, JSON.stringify(immPayload, null, 2), 'utf-8');
      } catch (immWriteErr) {
        console.warn('[PersistenceSyncService] Immutable write note:', immWriteErr);
      }

      // Refresh safety SQLite snapshot
      this.createSafetySnapshot();

      // Mirror key collections to Cloud Firestore asynchronously
      if (this.firestoreDb) {
        this.syncToFirestoreAsync(backup).catch(() => {});
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
   * Mirror key records to Cloud Firestore for persistent cloud backup across remix/container lifecycle
   */
  public async syncToFirestoreAsync(payload: PersistentDataPayload): Promise<void> {
    if (!this.firestoreDb) return;
    try {
      const db = this.firestoreDb;
      const nowIso = new Date().toISOString();

      // 1. Sync Tenants
      if (Array.isArray(payload.tables.tenants)) {
        for (const t of payload.tables.tenants) {
          if (t && t.id) {
            try {
              await setDoc(doc(db, 'tenants', String(t.id)), { ...t, _syncedAt: nowIso }, { merge: true });
            } catch {}
          }
        }
      }

      // 2. Sync Teacher Accounts
      if (Array.isArray(payload.tables.teacher_accounts)) {
        for (const ta of payload.tables.teacher_accounts) {
          const docId = ta.teacher_id || ta.id;
          if (docId) {
            try {
              await setDoc(doc(db, 'teacher_accounts', String(docId)), { ...ta, _syncedAt: nowIso }, { merge: true });
            } catch {}
          }
        }
      }

      // 3. Sync Class Settings
      if (Array.isArray(payload.tables.class_settings)) {
        for (const cs of payload.tables.class_settings) {
          if (cs && cs.tenant_id) {
            try {
              await setDoc(doc(db, 'class_settings', String(cs.tenant_id)), { ...cs, _syncedAt: nowIso }, { merge: true });
            } catch {}
          }
        }
      }

      // 4. Sync Students
      if (Array.isArray(payload.tables.students)) {
        for (const st of payload.tables.students) {
          if (st && st.id) {
            try {
              await setDoc(doc(db, 'students', String(st.id)), { ...st, _syncedAt: nowIso }, { merge: true });
            } catch {}
          }
        }
      }

      // 5. Sync Admin Accounts
      if (Array.isArray(payload.tables.admin_accounts)) {
        for (const adm of payload.tables.admin_accounts) {
          if (adm && adm.id) {
            try {
              await setDoc(doc(db, 'admin_accounts', String(adm.id)), { ...adm, _syncedAt: nowIso }, { merge: true });
            } catch {}
          }
        }
      }

      // 6. Sync Timetables
      if (Array.isArray(payload.tables.timetables)) {
        for (const tb of payload.tables.timetables) {
          const docId = tb.id || (tb.tenant_id && tb.class_id ? `${tb.tenant_id}_${tb.class_id}_${tb.academic_year || ''}_${tb.semester || ''}`.replace(/[\\/\\s]/g, '_') : null);
          if (docId) {
            try {
              await setDoc(doc(db, 'timetables', String(docId)), { ...tb, _syncedAt: nowIso }, { merge: true });
            } catch {}
          }
        }
      }

      // 7. Sync Assignments
      if (Array.isArray(payload.tables.assignments)) {
        for (const asgn of payload.tables.assignments) {
          if (asgn && asgn.id) {
            try {
              await setDoc(doc(db, 'assignments', String(asgn.id)), { ...asgn, _syncedAt: nowIso }, { merge: true });
            } catch {}
          }
        }
      }

      // 8. Sync Posts
      if (Array.isArray(payload.tables.posts)) {
        for (const post of payload.tables.posts) {
          if (post && post.id) {
            try {
              await setDoc(doc(db, 'posts', String(post.id)), { ...post, _syncedAt: nowIso }, { merge: true });
            } catch {}
          }
        }
      }

      // 9. Sync Laurel Trees
      if (Array.isArray(payload.tables.laurel_trees)) {
        for (const tree of payload.tables.laurel_trees) {
          if (tree && tree.id) {
            try {
              await setDoc(doc(db, 'laurel_trees', String(tree.id)), { ...tree, _syncedAt: nowIso }, { merge: true });
            } catch {}
          }
        }
      }

      // 10. Sync Training Transactions
      if (Array.isArray(payload.tables.training_transactions)) {
        for (const tx of payload.tables.training_transactions) {
          if (tx && tx.id) {
            try {
              await setDoc(doc(db, 'training_transactions', String(tx.id)), { ...tx, _syncedAt: nowIso }, { merge: true });
            } catch {}
          }
        }
      }

      // 11. Sync Career Profiles
      if (Array.isArray(payload.tables.career_profiles)) {
        for (const cp of payload.tables.career_profiles) {
          if (cp && cp.id) {
            try {
              await setDoc(doc(db, 'career_profiles', String(cp.id)), { ...cp, _syncedAt: nowIso }, { merge: true });
            } catch {}
          }
        }
      }

      // 12. Sync Graduation Choices
      if (Array.isArray(payload.tables.graduation_choices)) {
        for (const gc of payload.tables.graduation_choices) {
          if (gc && gc.id) {
            try {
              await setDoc(doc(db, 'graduation_choices', String(gc.id)), { ...gc, _syncedAt: nowIso }, { merge: true });
            } catch {}
          }
        }
      }

      // 13. Sync Credentials
      if (Array.isArray(payload.tables.credentials)) {
        for (const cred of payload.tables.credentials) {
          if (cred && cred.id) {
            try {
              await setDoc(doc(db, 'credentials', String(cred.id)), { ...cred, _syncedAt: nowIso }, { merge: true });
            } catch {}
          }
        }
      }

      // 14. Sync Academic Records
      if (Array.isArray(payload.tables.academic_records)) {
        for (const ar of payload.tables.academic_records) {
          if (ar && ar.id) {
            try {
              await setDoc(doc(db, 'academic_records', String(ar.id)), { ...ar, _syncedAt: nowIso }, { merge: true });
            } catch {}
          }
        }
      }

      // 15. Sync Survey Templates
      if (Array.isArray(payload.tables.survey_templates)) {
        for (const st of payload.tables.survey_templates) {
          if (st && st.id) {
            try {
              await setDoc(doc(db, 'survey_templates', String(st.id)), { ...st, _syncedAt: nowIso }, { merge: true });
            } catch {}
          }
        }
      }

      // 16. Sync Survey Responses
      if (Array.isArray(payload.tables.survey_responses)) {
        for (const sr of payload.tables.survey_responses) {
          if (sr && sr.id) {
            try {
              await setDoc(doc(db, 'survey_responses', String(sr.id)), { ...sr, _syncedAt: nowIso }, { merge: true });
            } catch {}
          }
        }
      }

      // 17. Sync User Avatars
      if (Array.isArray(payload.tables.user_avatars)) {
        for (const av of payload.tables.user_avatars) {
          if (av && av.user_key) {
            try {
              await setDoc(doc(db, 'user_avatars', String(av.user_key)), { ...av, _syncedAt: nowIso }, { merge: true });
            } catch {}
          }
        }
      }

      // 18. Update system sync metadata
      await setDoc(doc(db, 'platform_sync', 'metadata'), {
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
      }, { merge: true });

      console.log('[PersistenceSyncService] Successfully synchronized records to Cloud Firestore.');
    } catch (err: any) {
      console.warn('[PersistenceSyncService] Firestore sync error:', err?.message);
    }
  }

  /**
   * Hydrates records from Cloud Firestore if present and restores them to SQLite
   */
  public async hydrateFromFirestoreIfAvailableAsync(): Promise<{ restored: boolean; count: number; message: string }> {
    if (!this.firestoreDb) {
      return { restored: false, count: 0, message: 'Cloud Firestore not configured.' };
    }

    try {
      const db = this.firestoreDb;
      let totalRestored = 0;

      // 1. Restore Tenants from Cloud Firestore
      try {
        const tenantSnap = await getDocs(collection(db, 'tenants'));
        if (!tenantSnap.empty) {
          for (const docSnap of tenantSnap.docs) {
            const row = docSnap.data();
            if (row && row.id && row.name) {
              if (this.isDbRecordFresher('tenants', { id: row.id }, row.updated_at || row._syncedAt)) continue;
              const stmt = this.db.prepare(`
                INSERT OR REPLACE INTO tenants (
                  id, name, school_name, owner_id, owner_email, owner_name,
                  plan, status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `);
              stmt.run(
                row.id, row.name, row.school_name, row.owner_id, row.owner_email,
                row.owner_name, row.plan, row.status, row.created_at, row.updated_at
              );
              totalRestored++;
            }
          }
        }
      } catch {}

      // 2. Restore Teacher Accounts from Cloud Firestore
      try {
        const teacherSnap = await getDocs(collection(db, 'teacher_accounts'));
        if (!teacherSnap.empty) {
          for (const docSnap of teacherSnap.docs) {
            const row = docSnap.data();
            if (row && row.id && row.teacher_id && row.tenant_id) {
              if (this.isDbRecordFresher('teacher_accounts', { teacher_id: row.teacher_id }, row.updated_at || row._syncedAt)) continue;
              const stmt = this.db.prepare(`
                INSERT OR REPLACE INTO teacher_accounts (
                  id, teacher_id, tenant_id, full_name, email, phone,
                  google_sub, google_email, login_method, status, credential_version,
                  created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `);
              stmt.run(
                row.id, row.teacher_id, row.tenant_id, row.full_name, row.email,
                row.phone, row.google_sub, row.google_email, row.login_method,
                row.status, row.credential_version || 1, row.created_at, row.updated_at
              );
              totalRestored++;
            }
          }
        }
      } catch {}

      // 3. Restore Class Settings from Cloud Firestore
      try {
        const classSnap = await getDocs(collection(db, 'class_settings'));
        if (!classSnap.empty) {
          for (const docSnap of classSnap.docs) {
            const row = docSnap.data();
            if (row && row.tenant_id && row.class_name) {
              if (this.isDbRecordFresher('class_settings', { tenant_id: row.tenant_id, class_id: row.class_id }, row.updated_at || row._syncedAt)) continue;
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
                row.slogan, row.cover_image, row.total_students, row.theme_json, row.subjects_json,
                row.interaction_settings_json, row.google_integration_json, row.zalo_settings_json,
                row.ai_config_json, row.school_year_timeline_json, row.student_identity_mode,
                row.raw_metadata, row.created_at, row.updated_at
              );
              totalRestored++;
            }
          }
        }
      } catch {}

      // 4. Restore Students from Cloud Firestore
      try {
        const studentSnap = await getDocs(collection(db, 'students'));
        if (!studentSnap.empty) {
          for (const docSnap of studentSnap.docs) {
            const row = docSnap.data();
            if (row && row.id && row.tenant_id && row.full_name) {
              if (this.isDbRecordFresher('students', { tenant_id: row.tenant_id, id: row.id }, row.updated_at || row._syncedAt)) continue;
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
                row.id, row.tenant_id, row.class_id, row.code, row.full_name, row.gender, row.dob,
                row.group_num, row.officer_role, row.avatar, row.phone, row.email, row.address,
                row.father_name, row.father_phone, row.father_job, row.mother_name, row.mother_phone, row.mother_job,
                row.health_notes, row.talents, row.private_teacher_notes, row.needs_special_attention,
                row.attention_categories, row.attention_note, row.support_measure, row.attention_status,
                row.attention_started_at, row.attention_updated_at, row.attention_updated_by,
                row.anonymous_code, row.status, row.raw_metadata, row.created_at, row.updated_at
              );
              totalRestored++;
            }
          }
        }
      } catch {}

      // 5. Restore Credentials from Cloud Firestore
      try {
        const credSnap = await getDocs(collection(db, 'credentials'));
        if (!credSnap.empty) {
          for (const docSnap of credSnap.docs) {
            const row = docSnap.data();
            if (row && row.id && row.tenant_id && row.owner_id && row.lookup_identifier) {
              if (this.isDbRecordFresher('credentials', { id: row.id }, row.password_updated_at || row.last_issued_at || row._syncedAt)) continue;
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
              totalRestored++;
            }
          }
        }
      } catch {}

      // 6. Restore Academic Records from Cloud Firestore
      try {
        const acadSnap = await getDocs(collection(db, 'academic_records'));
        if (!acadSnap.empty) {
          for (const docSnap of acadSnap.docs) {
            const row = docSnap.data();
            if (row && row.id && row.tenant_id && row.student_id) {
              if (this.isDbRecordFresher('academic_records', { tenant_id: row.tenant_id, id: row.id }, row.updated_at || row._syncedAt)) continue;
              const stmt = this.db.prepare(`
                INSERT OR REPLACE INTO academic_records (
                  id, tenant_id, student_id, academic_year, semester, scores_json,
                  conduct_score, conduct_evaluation, academic_rank, gpa,
                  attendance_summary_json, teacher_evaluation, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `);
              stmt.run(
                row.id, row.tenant_id, row.student_id, row.academic_year || '2025 - 2026',
                row.semester || 'Học kỳ I', row.scores_json || '[]',
                row.conduct_score !== undefined ? row.conduct_score : null,
                row.conduct_evaluation || null, row.academic_rank || null,
                row.gpa !== undefined ? row.gpa : null, row.attendance_summary_json || null,
                row.teacher_evaluation || null, row.created_at || new Date().toISOString(),
                row.updated_at || row.created_at || new Date().toISOString()
              );
              totalRestored++;
            }
          }
        }
      } catch {}

      if (totalRestored > 0) {
        this.createSafetySnapshot();
        this.flushToPersistentBackup();
        return {
          restored: true,
          count: totalRestored,
          message: `Khôi phục thành công ${totalRestored} bản ghi từ Cloud Firestore.`
        };
      }

      return { restored: false, count: 0, message: 'Cloud Firestore không có bản ghi mới cần khôi phục.' };
    } catch (err: any) {
      console.warn('[PersistenceSyncService] Firestore hydration error:', err?.message);
      return { restored: false, count: 0, message: err?.message };
    }
  }

  /**
   * Creates an atomic, standalone SQLite backup snapshot using VACUUM INTO
   */
  public createSafetySnapshot(): void {
    try {
      const dataDir = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // Checkpoint WAL first
      try {
        this.db.exec('PRAGMA wal_checkpoint(PASSIVE);');
      } catch {}

      // If snapshot file already exists, remove it before VACUUM INTO
      if (fs.existsSync(this.safetySnapshotFile)) {
        try {
          fs.unlinkSync(this.safetySnapshotFile);
        } catch {}
      }

      this.db.exec(`VACUUM INTO '${this.safetySnapshotFile}';`);
    } catch (err: any) {
      console.warn('[PersistenceSyncService] Snapshot note:', err?.message);
    }
  }
}

export const persistenceSyncService = PersistenceSyncService.getInstance();
"""

with open("/app/applet/server/services/PersistenceSyncService.ts", "w", encoding="utf-8") as f:
    f.write(service_code.strip() + "\\n")

print("Generated clean PersistenceSyncService.ts successfully!")
