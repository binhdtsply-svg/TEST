import { DatabaseSync } from 'node:sqlite';
import { getDatabase } from '../db/database';

export interface BackupRecord {
  id: string;
  tenant_id: string;
  backup_type: string;
  migration_version: string;
  record_counts: string;
  data_payload: string;
  created_at: string;
  created_by: string;
}

export class BackupRepository {
  private static instance: BackupRepository;
  private db: DatabaseSync;

  private constructor() {
    this.db = getDatabase();
  }

  public static getInstance(): BackupRepository {
    if (!BackupRepository.instance) {
      BackupRepository.instance = new BackupRepository();
    }
    return BackupRepository.instance;
  }

  public createBackup(params: {
    id?: string;
    tenantId: string;
    backupType: string;
    migrationVersion: string;
    recordCounts: Record<string, number>;
    dataPayload: Record<string, unknown>;
    createdBy?: string;
  }): BackupRecord {
    const id = params.id || `bak-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO server_backups (
        id, tenant_id, backup_type, migration_version,
        record_counts, data_payload, created_at, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      params.tenantId,
      params.backupType,
      params.migrationVersion,
      JSON.stringify(params.recordCounts),
      JSON.stringify(params.dataPayload),
      now,
      params.createdBy || 'SYSTEM_MIGRATION'
    );

    return {
      id,
      tenant_id: params.tenantId,
      backup_type: params.backupType,
      migration_version: params.migrationVersion,
      record_counts: JSON.stringify(params.recordCounts),
      data_payload: JSON.stringify(params.dataPayload),
      created_at: now,
      created_by: params.createdBy || 'SYSTEM_MIGRATION'
    };
  }

  public getBackupsByTenant(tenantId: string): BackupRecord[] {
    const stmt = this.db.prepare(`
      SELECT * FROM server_backups
      WHERE tenant_id = ?
      ORDER BY created_at DESC
    `);
    return stmt.all(tenantId) as unknown as BackupRecord[];
  }
}

export const backupRepository = BackupRepository.getInstance();
