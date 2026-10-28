/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuditLog, UserRole, UserAccount } from '../types';
import { initialAuditLogs } from '../data/demoData';
import { tenantService } from './TenantService';
import { safeLocalStorageSet, safeLocalStorageGet } from '../utils/storageUtils';

class AuditService {
  private activeTenantId: string = 'tenant-lan-nguyen';
  private logs: AuditLog[] = [...initialAuditLogs];
  private listeners: Array<() => void> = [];

  constructor() {
    this.activeTenantId = tenantService.getActiveTenantId();
    this.loadFromStorage(this.activeTenantId);

    tenantService.subscribe(() => {
      const nextTenantId = tenantService.getActiveTenantId();
      if (nextTenantId !== this.activeTenantId) {
        this.activeTenantId = nextTenantId;
        this.loadFromStorage(nextTenantId);
        this.notify();
      }
    });
  }

  public reloadForActiveTenant(): void {
    this.activeTenantId = tenantService.getActiveTenantId();
    this.loadFromStorage(this.activeTenantId);
    this.notify();
  }

  private loadFromStorage(tenantId: string) {
    const tId = tenantService.normalizeTenantId(tenantId);
    try {
      const key = tenantService.getTenantStorageKey('audit_logs', tId);
      const saved = safeLocalStorageGet(key);
      if (saved) {
        this.logs = JSON.parse(saved);
      } else {
        if (tId === 'tenant-lan-nguyen') {
          const legacy = safeLocalStorageGet('kgcns_audit_logs');
          if (legacy) {
            this.logs = JSON.parse(legacy);
            safeLocalStorageSet(key, legacy);
          } else {
            this.logs = [...initialAuditLogs];
          }
        } else {
          this.logs = [];
        }
      }
    } catch {
      this.logs = tId === 'tenant-lan-nguyen' ? [...initialAuditLogs] : [];
    }
  }

  private saveToStorage(tenantId?: string) {
    const tId = tenantService.normalizeTenantId(tenantId || this.activeTenantId);
    try {
      safeLocalStorageSet(tenantService.getTenantStorageKey('audit_logs', tId), JSON.stringify(this.logs));
    } catch {
      // ignore
    }
    this.notify();
  }

  public getLogs(): AuditLog[] {
    return [...this.logs];
  }

  public logEvent(
    action: AuditLog['action'],
    actor: { id: string; name: string; role: UserRole },
    targetName: string,
    details: string,
    metadata?: any
  ): AuditLog {
    const newLog: AuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      action,
      actorId: actor?.id || 'sys',
      actorRole: actor?.role || 'TEACHER',
      performedBy: actor?.name || 'Hệ thống',
      role: actor?.role || 'TEACHER',
      target: targetName,
      targetId: metadata?.targetId,
      classId: metadata?.classId || '11A1',
      details,
      metadata,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('vi-VN')
    };

    this.logs.unshift(newLog);
    // Keep max 80 logs to maintain clean storage footprint
    if (this.logs.length > 80) {
      this.logs = this.logs.slice(0, 80);
    }

    this.saveToStorage();
    return newLog;
  }

  public log(
    action: string,
    role: UserRole | string,
    target: string,
    details: string,
    metadata?: any
  ): AuditLog {
    return this.logEvent(
      action as any,
      { id: 'usr-admin', name: role === 'SUPER_ADMIN' ? 'Super Admin' : 'GVCN', role: role as UserRole },
      target,
      details,
      metadata
    );
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }
}

export const auditService = new AuditService();
export const auditLogService = auditService;
