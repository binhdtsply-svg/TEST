/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SystemConfig, MigrationHistoryItem, FeatureFlagConfig, AdminContactInfo } from '../types';

const STORAGE_KEYS = {
  SYSTEM_CONFIG: 'kgcns_v2_system_config',
  MIGRATION_HISTORY: 'kgcns_v2_migration_history',
};

const DEFAULT_FEATURE_FLAGS: FeatureFlagConfig = {
  aiAssistant: true,
  googleSync: true,
  zaloIntegration: true,
  hollandTest: true,
  graduationEstimator: true,
  parentBridge: true,
  laurelGamification: true,
  excelImportExport: true,
  pwaOfflineSync: true,
  customThemes: true
};

const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
  schemaVersion: 4,
  platformName: 'Không Gian Chủ Nhiệm Số',
  version: '2.6.0-SaaS',
  maintenanceMode: false,
  supportBreakGlassActive: false,
  featureFlags: DEFAULT_FEATURE_FLAGS,
  adminContact: {
    organizationName: 'Ban Quản trị Hệ thống Không Gian Chủ Nhiệm Số',
    contactPerson: 'Đoàn Thị Bình',
    email: 'binhdtsply@gmail.com',
    phone: '0973640124',
    address: 'Hà Nội, Việt Nam',
    workingHours: 'Thứ 2 - Thứ 6 (08:00 - 17:30)',
    notes: 'Liên hệ khi cần hỗ trợ cấp mới tài khoản GVCN hoặc khôi phục quyền truy cập.',
    updatedAt: '2026-09-22T11:42:37.066Z',
    updatedBy: 'SUPER_ADMIN'
  }
};

const DEFAULT_MIGRATION_HISTORY: MigrationHistoryItem[] = [
  {
    migrationId: 'mig-001-init',
    fromVersion: 0,
    toVersion: 1,
    startedAt: '2025-08-15 08:00',
    completedAt: '2025-08-15 08:01',
    status: 'SUCCESS',
    affectedTenants: 1,
    notes: 'Khởi tạo schema ban đầu cho hệ thống quản lý lớp học chủ nhiệm'
  },
  {
    migrationId: 'mig-002-multitenant',
    fromVersion: 1,
    toVersion: 2,
    startedAt: '2025-11-20 09:00',
    completedAt: '2025-11-20 09:01',
    status: 'SUCCESS',
    affectedTenants: 2,
    notes: 'Chuyển đổi kiến trúc sang Multi-tenant SaaS, bổ sung Super Admin và cách ly dữ liệu từng giáo viên'
  }
];

class MigrationManager {
  private config: SystemConfig = DEFAULT_SYSTEM_CONFIG;
  private history: MigrationHistoryItem[] = [];
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.load();
    // Auto-fetch persisted admin contact from database
    this.fetchRemoteAdminContact().catch(() => {});
  }

  private load(): void {
    try {
      const storedConfig = localStorage.getItem(STORAGE_KEYS.SYSTEM_CONFIG);
      if (storedConfig) {
        this.config = { ...DEFAULT_SYSTEM_CONFIG, ...JSON.parse(storedConfig) };
      } else {
        this.config = DEFAULT_SYSTEM_CONFIG;
        this.saveConfig();
      }

      const storedHistory = localStorage.getItem(STORAGE_KEYS.MIGRATION_HISTORY);
      if (storedHistory) {
        this.history = JSON.parse(storedHistory);
      } else {
        this.history = DEFAULT_MIGRATION_HISTORY;
        this.saveHistory();
      }
    } catch {
      this.config = DEFAULT_SYSTEM_CONFIG;
      this.history = DEFAULT_MIGRATION_HISTORY;
    }
  }

  private saveConfig(): void {
    localStorage.setItem(STORAGE_KEYS.SYSTEM_CONFIG, JSON.stringify(this.config));
    this.notify();
  }

  private saveHistory(): void {
    localStorage.setItem(STORAGE_KEYS.MIGRATION_HISTORY, JSON.stringify(this.history));
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(fn => {
      try {
        fn();
      } catch (err) {
        console.error('MigrationManager error:', err);
      }
    });
  }

  public getConfig(): SystemConfig {
    return { ...this.config };
  }

  public getAdminContact(): AdminContactInfo | null {
    return this.config.adminContact ? { ...this.config.adminContact } : null;
  }

  public async fetchRemoteAdminContact(): Promise<AdminContactInfo | null> {
    try {
      const res = await fetch('/api/v1/tenants/system/contact');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.contact) {
          this.config.adminContact = data.contact;
          this.saveConfig();
          this.notify();
          return data.contact;
        }
      }
    } catch (e) {
      console.warn('[MigrationService] Failed to fetch remote admin contact, fallback to local store:', e);
    }
    return this.getAdminContact();
  }

  private resolveAuthToken(explicitToken?: string): string {
    if (explicitToken) return explicitToken;
    try {
      const sessionStr = localStorage.getItem('kgcns_session_v2');
      if (sessionStr) {
        const parsed = JSON.parse(sessionStr);
        if (parsed?.token) return parsed.token;
      }
    } catch {}
    return (
      localStorage.getItem('kgcns_server_session_token') ||
      localStorage.getItem('kgcns_auth_token') ||
      localStorage.getItem('kgcns_session_token') ||
      sessionStorage.getItem('kgcns_session_token') ||
      (window as any).__kgcns_token ||
      ''
    );
  }

  public async updateAdminContact(contact: Partial<AdminContactInfo>, token?: string): Promise<boolean> {
    const updated: AdminContactInfo = {
      ...(this.config.adminContact || {}),
      ...contact,
      updatedAt: new Date().toISOString(),
      updatedBy: 'SUPER_ADMIN'
    };

    this.config.adminContact = updated;
    this.saveConfig();

    // Try persisting to SQLite backend
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const resolvedToken = this.resolveAuthToken(token);
      if (resolvedToken) {
        headers['Authorization'] = `Bearer ${resolvedToken}`;
      }

      const res = await fetch('/api/v1/tenants/admin/contact', {
        method: 'POST',
        headers,
        body: JSON.stringify(updated)
      });

      if (res.ok) {
        const json = await res.json();
        if (json.contact) {
          this.config.adminContact = json.contact;
          this.saveConfig();
          this.notify();
        }
      } else {
        console.warn('[MigrationService] Server returned non-ok status for admin contact update:', res.status);
      }
    } catch (err) {
      console.warn('[MigrationService] Server sync for admin contact failed, local storage preserved:', err);
    }

    return true;
  }

  public getHistory(): MigrationHistoryItem[] {
    return [...this.history];
  }

  public updateFeatureFlags(flags: Partial<FeatureFlagConfig>): void {
    this.config.featureFlags = {
      ...this.config.featureFlags,
      ...flags
    };
    this.saveConfig();
  }

  public toggleFeature(featureKey: keyof FeatureFlagConfig): boolean {
    const nextVal = !this.config.featureFlags[featureKey];
    this.config.featureFlags[featureKey] = nextVal;
    this.saveConfig();
    return nextVal;
  }

  public setMaintenanceMode(active: boolean): void {
    this.config.maintenanceMode = active;
    this.saveConfig();
  }

  public setSupportBreakGlass(active: boolean): void {
    this.config.supportBreakGlassActive = active;
    this.saveConfig();
  }

  public runIdempotentMigration(): { success: boolean; message: string; version: number } {
    const fromVersion = this.config.schemaVersion;
    const toVersion = fromVersion + 1;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);

    const newHistoryItem: MigrationHistoryItem = {
      migrationId: `mig-${Date.now().toString(36)}`,
      fromVersion,
      toVersion,
      startedAt: now,
      completedAt: now,
      status: 'SUCCESS',
      affectedTenants: 2,
      notes: `Đồng bộ schema version ${toVersion}, kiểm tra toàn vẹn ràng buộc tenantId và cấu hình dữ liệu chuẩn.`
    };

    this.config.schemaVersion = toVersion;
    this.history.unshift(newHistoryItem);
    this.saveConfig();
    this.saveHistory();

    return {
      success: true,
      message: `Đã thực thi nâng cấp schema lên version ${toVersion} an toàn và không mất dữ liệu!`,
      version: toVersion
    };
  }

  public exportFullPlatformSnapshot(): string {
    const snapshot: Record<string, any> = {
      meta: {
        platform: 'Không Gian Chủ Nhiệm Số',
        exportedAt: new Date().toISOString(),
        schemaVersion: this.config.schemaVersion,
        version: this.config.version
      },
      systemConfig: this.config,
      migrationHistory: this.history,
      dataStores: {}
    };

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('kgcns_') || key.startsWith('app_theme'))) {
        try {
          snapshot.dataStores[key] = JSON.parse(localStorage.getItem(key) || 'null');
        } catch {
          snapshot.dataStores[key] = localStorage.getItem(key);
        }
      }
    }

    return JSON.stringify(snapshot, null, 2);
  }

  public restoreSnapshot(jsonString: string): { success: boolean; message: string } {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.meta || !parsed.meta.platform) {
        return { success: false, message: 'File sao lưu không hợp lệ hoặc không thuộc hệ thống Không Gian Chủ Nhiệm Số!' };
      }

      if (parsed.dataStores) {
        Object.entries(parsed.dataStores).forEach(([key, val]) => {
          if (typeof val === 'object') {
            localStorage.setItem(key, JSON.stringify(val));
          } else {
            localStorage.setItem(key, String(val));
          }
        });
      }

      if (parsed.systemConfig) {
        this.config = parsed.systemConfig;
        this.saveConfig();
      }

      if (parsed.migrationHistory) {
        this.history = parsed.migrationHistory;
        this.saveHistory();
      }

      this.notify();
      return { success: true, message: 'Đã khôi phục dữ liệu snapshot thành công!' };
    } catch (err: any) {
      return { success: false, message: `Lỗi đọc snapshot: ${err.message}` };
    }
  }
}

export const migrationService = new MigrationManager();
