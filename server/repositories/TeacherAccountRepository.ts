import { getDatabase } from '../db/database';
import { tenantRepository } from './TenantRepository';

export interface TeacherAccountRecord {
  id: string;
  teacher_id: string;
  tenant_id: string;
  full_name: string;
  email: string;
  phone?: string;
  google_sub?: string;
  google_email?: string;
  login_method: 'GOOGLE' | 'ACCESS_CODE' | 'BOTH';
  status: 'ACTIVE' | 'LOCKED' | 'REVOKED';
  credential_version: number;
  created_at: string;
  updated_at: string;
}

export class TeacherAccountRepository {
  private db = getDatabase();

  getByTeacherId(teacherId: string): TeacherAccountRecord | null {
    if (!teacherId) return null;
    const stmt = this.db.prepare('SELECT * FROM teacher_accounts WHERE teacher_id = ? OR id = ?');
    const row = stmt.get(teacherId, teacherId) as any;
    return row || null;
  }

  getById(id: string): TeacherAccountRecord | null {
    if (!id) return null;
    const stmt = this.db.prepare('SELECT * FROM teacher_accounts WHERE id = ? OR teacher_id = ?');
    const row = stmt.get(id, id) as any;
    return row || null;
  }

  getByTenantId(tenantId: string): TeacherAccountRecord | null {
    const stmt = this.db.prepare('SELECT * FROM teacher_accounts WHERE tenant_id = ?');
    const row = stmt.get(tenantId) as any;
    return row || null;
  }

  getByGoogleEmail(email: string): TeacherAccountRecord | null {
    const stmt = this.db.prepare('SELECT * FROM teacher_accounts WHERE LOWER(google_email) = LOWER(?) OR LOWER(email) = LOWER(?)');
    const row = stmt.get(email, email) as any;
    return row || null;
  }

  getAll(): TeacherAccountRecord[] {
    const stmt = this.db.prepare('SELECT * FROM teacher_accounts ORDER BY created_at ASC');
    return stmt.all() as any[];
  }

  createOrUpdate(account: TeacherAccountRecord): void {
    tenantRepository.ensureTenantExists(account.tenant_id, account.full_name);
    const existing = this.getByTeacherId(account.teacher_id);
    if (existing) {
      const stmt = this.db.prepare(`
        UPDATE teacher_accounts SET 
          tenant_id = ?, full_name = ?, email = ?, phone = ?, 
          google_sub = ?, google_email = ?, login_method = ?, 
          status = ?, credential_version = ?, updated_at = ?
        WHERE teacher_id = ?
      `);
      stmt.run(
        account.tenant_id,
        account.full_name,
        account.email,
        account.phone || null,
        account.google_sub || null,
        account.google_email || null,
        account.login_method || 'BOTH',
        account.status || 'ACTIVE',
        account.credential_version || 1,
        new Date().toISOString(),
        account.teacher_id
      );
    } else {
      const now = new Date().toISOString();
      const stmt = this.db.prepare(`
        INSERT INTO teacher_accounts (
          id, teacher_id, tenant_id, full_name, email, phone,
          google_sub, google_email, login_method, status, credential_version,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        account.id,
        account.teacher_id,
        account.tenant_id,
        account.full_name,
        account.email,
        account.phone || null,
        account.google_sub || null,
        account.google_email || null,
        account.login_method || 'BOTH',
        account.status || 'ACTIVE',
        account.credential_version || 1,
        account.created_at || now,
        account.updated_at || now
      );
    }
  }

  incrementCredentialVersion(teacherId: string): number {
    const account = this.getByTeacherId(teacherId);
    if (!account) return 1;
    const nextVer = (account.credential_version || 1) + 1;
    const stmt = this.db.prepare('UPDATE teacher_accounts SET credential_version = ?, updated_at = ? WHERE teacher_id = ?');
    stmt.run(nextVer, new Date().toISOString(), teacherId);
    return nextVer;
  }

  updateStatus(teacherId: string, status: 'ACTIVE' | 'LOCKED' | 'REVOKED'): void {
    const stmt = this.db.prepare('UPDATE teacher_accounts SET status = ?, updated_at = ? WHERE teacher_id = ?');
    stmt.run(status, new Date().toISOString(), teacherId);
    this.incrementCredentialVersion(teacherId);
  }
}

export const teacherAccountRepository = new TeacherAccountRepository();
