import { getDatabase } from '../db/database';

export interface AdminContactInfoRecord {
  organizationName?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  workingHours?: string;
  notes?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export class SystemSettingsRepository {
  private getDb() {
    return getDatabase();
  }

  get<T>(key: string, defaultValue: T): T {
    try {
      const db = this.getDb();
      const stmt = db.prepare('SELECT value_json FROM system_settings WHERE key = ?');
      const row = stmt.get(key) as { value_json: string } | undefined;
      if (row && row.value_json) {
        return JSON.parse(row.value_json) as T;
      }
    } catch (e) {
      console.warn(`[SystemSettingsRepository] Error reading setting ${key}:`, e);
    }
    return defaultValue;
  }

  set<T>(key: string, value: T, updatedBy?: string): void {
    const db = this.getDb();
    const now = new Date().toISOString();
    const valueJson = JSON.stringify(value);
    const stmt = db.prepare(`
      INSERT INTO system_settings (key, value_json, updated_at, updated_by)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value_json = excluded.value_json,
        updated_at = excluded.updated_at,
        updated_by = excluded.updated_by
    `);
    stmt.run(key, valueJson, now, updatedBy || null);
  }

  getAdminContact(): AdminContactInfoRecord | null {
    return this.get<AdminContactInfoRecord | null>('admin_contact_info', null);
  }

  setAdminContact(contact: AdminContactInfoRecord, updatedBy?: string): void {
    const contactWithTimestamp = {
      ...contact,
      updatedAt: new Date().toISOString(),
      updatedBy: updatedBy || 'SUPER_ADMIN'
    };
    this.set('admin_contact_info', contactWithTimestamp, updatedBy);
  }
}

export const systemSettingsRepository = new SystemSettingsRepository();
