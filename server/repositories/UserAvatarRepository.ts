import { DatabaseSync } from 'node:sqlite';
import { getDatabase } from '../db/database';

export interface UserAvatarRecord {
  user_key: string;
  avatar: string;
  user_id?: string | null;
  role?: string | null;
  tenant_id?: string | null;
  updated_at: string;
}

export class UserAvatarRepository {
  private db: DatabaseSync;

  constructor(db?: DatabaseSync) {
    this.db = db || getDatabase();
  }

  public getAvatar(userKey: string): string | null {
    if (!userKey) return null;
    try {
      const stmt = this.db.prepare(`SELECT avatar FROM user_avatars WHERE user_key = ?`);
      const row = stmt.get(userKey) as { avatar?: string } | undefined;
      return row?.avatar || null;
    } catch {
      return null;
    }
  }

  public getAvatarForUser(params: {
    userId?: string;
    studentId?: string;
    teacherId?: string;
    childStudentId?: string;
    role?: string;
    tenantId?: string;
    email?: string;
  }): string | null {
    const isParent = params.role === 'PARENT' || (Boolean(params.childStudentId) && !params.studentId && params.role !== 'STUDENT');
    const keysToCheck: string[] = [];

    if (isParent) {
      // Keys strictly for PARENT - NEVER check student_* keys or raw studentId!
      if (params.userId) keysToCheck.push(`user_${params.userId}`, params.userId, `parent_${params.userId}`);
      if (params.childStudentId) keysToCheck.push(`parent_child_${params.childStudentId}`, `parent_${params.childStudentId}`);
      if (params.email) keysToCheck.push(`email_${params.email.toLowerCase().trim()}`);
      if (params.tenantId && params.childStudentId) {
        keysToCheck.push(`role_PARENT_${params.tenantId}_${params.childStudentId}`);
      }
    } else {
      // Keys strictly for STUDENT, CLASS_OFFICER, TEACHER, SUPER_ADMIN - NEVER check parent keys
      if (params.userId) keysToCheck.push(`user_${params.userId}`, params.userId);
      if (params.studentId) keysToCheck.push(`student_${params.studentId}`, `user_stu_${params.studentId}`);
      if (params.teacherId) keysToCheck.push(`teacher_${params.teacherId}`, params.teacherId);
      if (params.email) keysToCheck.push(`email_${params.email.toLowerCase().trim()}`);
      if (params.role === 'SUPER_ADMIN') keysToCheck.push('role_SUPER_ADMIN');
    }

    for (const k of keysToCheck) {
      const av = this.getAvatar(k);
      if (av) return av;
    }
    return null;
  }

  public saveAvatar(params: {
    avatar: string;
    userId?: string;
    studentId?: string;
    teacherId?: string;
    childStudentId?: string;
    role?: string;
    tenantId?: string;
    email?: string;
  }): void {
    if (!params.avatar) return;
    const now = new Date().toISOString();
    const isParent = params.role === 'PARENT' || (Boolean(params.childStudentId) && !params.studentId && params.role !== 'STUDENT');
    const keysToSave: string[] = [];

    if (isParent) {
      // Keys strictly for PARENT - NEVER save to student_* keys!
      if (params.userId) keysToSave.push(`user_${params.userId}`, params.userId, `parent_${params.userId}`);
      if (params.childStudentId) keysToSave.push(`parent_child_${params.childStudentId}`, `parent_${params.childStudentId}`);
      if (params.email) keysToSave.push(`email_${params.email.toLowerCase().trim()}`);
      if (params.tenantId && params.childStudentId) {
        keysToSave.push(`role_PARENT_${params.tenantId}_${params.childStudentId}`);
      }
    } else {
      // Keys strictly for STUDENT, CLASS_OFFICER, TEACHER, SUPER_ADMIN - NEVER save to parent keys or shared role key
      if (params.userId) keysToSave.push(`user_${params.userId}`, params.userId);
      if (params.studentId) keysToSave.push(`student_${params.studentId}`, `user_stu_${params.studentId}`);
      if (params.teacherId) keysToSave.push(`teacher_${params.teacherId}`, params.teacherId);
      if (params.email) keysToSave.push(`email_${params.email.toLowerCase().trim()}`);
      if (params.role === 'SUPER_ADMIN') keysToSave.push('role_SUPER_ADMIN');
    }

    const stmt = this.db.prepare(`
      INSERT INTO user_avatars (user_key, avatar, user_id, role, tenant_id, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_key) DO UPDATE SET
        avatar = excluded.avatar,
        user_id = COALESCE(excluded.user_id, user_avatars.user_id),
        role = COALESCE(excluded.role, user_avatars.role),
        tenant_id = COALESCE(excluded.tenant_id, user_avatars.tenant_id),
        updated_at = excluded.updated_at
    `);

    for (const key of keysToSave) {
      try {
        stmt.run(key, params.avatar, params.userId || null, params.role || null, params.tenantId || null, now);
      } catch {
        // ignore
      }
    }
  }
}

export const userAvatarRepository = new UserAvatarRepository();
