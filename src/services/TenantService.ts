/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Tenant, TeacherAccountItem, TenantPlan, TenantStatus, TeacherAccountStatus } from '../types';
import { safeLocalStorageGet, safeLocalStorageSet, safeLocalStorageRemove } from '../utils/storageUtils';
import { authRepository } from './AuthRepository';

const STORAGE_KEYS = {
  TENANTS: 'kgcns_v2_tenants',
  ACTIVE_TENANT_ID: 'kgcns_v2_active_tenant_id',
  TEACHER_ACCOUNTS: 'kgcns_v2_teacher_accounts',
};

const DEFAULT_TENANTS: Tenant[] = [
  {
    id: 'tenant-lan-nguyen',
    name: 'Không gian GVCN Mai Lan (11A1)',
    schoolName: 'THPT Chuyên Lê Hồng Phong',
    ownerEmail: 'mailan.nguyen@lehongphong.edu.vn',
    ownerName: 'Cô Nguyễn Thị Mai Lan',
    ownerPhone: '0912 345 678',
    status: 'ACTIVE',
    plan: 'PRO',
    quota: {
      maxClasses: 5,
      maxStudentsPerClass: 50,
      storageMb: 2048,
      aiCreditsMonthly: 500
    },
    classIds: ['class-11a1-2025'],
    currentClassId: 'class-11a1-2025',
    createdAt: '2025-08-15T08:00:00.000Z',
    updatedAt: '2025-11-20T10:00:00.000Z',
    isDemo: true
  },
  {
    id: 'tenant-hoang-nam',
    name: 'Không gian GVCN Hoàng Nam (12A2)',
    schoolName: 'THPT Chuyên Nguyễn Huệ',
    ownerEmail: 'hoangnam.tran@nguyenhue.edu.vn',
    ownerName: 'Thầy Trần Hoàng Nam',
    ownerPhone: '0988 777 666',
    status: 'ACTIVE',
    plan: 'STANDARD',
    quota: {
      maxClasses: 2,
      maxStudentsPerClass: 45,
      storageMb: 1024,
      aiCreditsMonthly: 200
    },
    classIds: ['class-12a2-2025'],
    currentClassId: 'class-12a2-2025',
    createdAt: '2025-09-01T08:00:00.000Z',
    updatedAt: '2025-11-15T09:00:00.000Z',
    isDemo: true
  },
  {
    id: 'tenant-co-binh-mv5brvta',
    name: 'Không gian GVCN Cô Bình',
    schoolName: 'Trường THPT',
    ownerEmail: 'binhdtsply@gmail.com',
    ownerName: 'Cô Bình',
    ownerPhone: '0912 987 654',
    status: 'ACTIVE',
    plan: 'PRO',
    quota: {
      maxClasses: 5,
      maxStudentsPerClass: 50,
      storageMb: 2048,
      aiCreditsMonthly: 500
    },
    classIds: ['class-cobinh-2026'],
    currentClassId: 'class-cobinh-2026',
    createdAt: '2026-10-12T14:06:10.126Z',
    updatedAt: '2026-10-12T14:06:10.126Z',
    isDemo: false
  }
];

const DEFAULT_TEACHER_ACCOUNTS: TeacherAccountItem[] = [
  {
    id: 'tch-01',
    tenantId: 'tenant-lan-nguyen',
    email: 'mailan.nguyen@lehongphong.edu.vn',
    fullName: 'Cô Nguyễn Thị Mai Lan',
    phone: '0912 345 678',
    schoolName: 'THPT Chuyên Lê Hồng Phong',
    workspaceName: 'Không gian GVCN Mai Lan (11A1)',
    loginMethod: 'BOTH',
    allowedGoogleEmail: 'mailan.nguyen@lehongphong.edu.vn',
    classesCount: 1,
    totalStudentsCount: 4,
    status: 'ACTIVE',
    createdAt: '2025-08-15 08:00',
    createdBy: 'Super Admin (binhdtsply@gmail.com)',
    lastLoginAt: '2025-11-20 14:30',
    activationToken: 'ACT-ML-2025-LHP'
  },
  {
    id: 'tch-02',
    tenantId: 'tenant-hoang-nam',
    email: 'hoangnam.tran@nguyenhue.edu.vn',
    fullName: 'Thầy Trần Hoàng Nam',
    phone: '0988 777 666',
    schoolName: 'THPT Chuyên Nguyễn Huệ',
    workspaceName: 'Không gian GVCN Hoàng Nam (12A2)',
    loginMethod: 'BOTH',
    allowedGoogleEmail: 'hoangnam.tran@nguyenhue.edu.vn',
    classesCount: 1,
    totalStudentsCount: 1,
    status: 'ACTIVE',
    createdAt: '2025-09-01 08:00',
    createdBy: 'Super Admin (binhdtsply@gmail.com)',
    lastLoginAt: '2025-11-18 10:15',
    activationToken: 'ACT-HN-2025-NH'
  },
  {
    id: 'tch-mv5brvta',
    tenantId: 'tenant-co-binh-mv5brvta',
    email: 'binhdtsply@gmail.com',
    fullName: 'Cô Bình',
    phone: '0912 987 654',
    schoolName: 'Trường THPT',
    workspaceName: 'Không gian GVCN Cô Bình',
    loginMethod: 'BOTH',
    allowedGoogleEmail: 'binhdtsply@gmail.com',
    classesCount: 1,
    totalStudentsCount: 32,
    status: 'ACTIVE',
    createdAt: '2026-10-12 14:06',
    createdBy: 'Super Admin (binhdtsply@gmail.com)',
    lastLoginAt: '2026-10-12 14:06',
    activationToken: 'ACT-CB-MV5BRVTA'
  }
];

class TenantManager {
  private tenants: Tenant[] = [];
  private activeTenantId: string = 'tenant-lan-nguyen';
  private teacherAccounts: TeacherAccountItem[] = [];
  private listeners: Set<() => void> = new Set();
  private channel: BroadcastChannel | null = null;

  constructor() {
    this.loadFromStorage();

    // Multi-tab sync via BroadcastChannel
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel('kgcns_teacher_workspace_channel');
        this.channel.onmessage = (event) => {
          if (event.data?.type === 'CLASSROOM_CONFIG_SYNCED') {
            if (event.data?.tenantId && event.data?.config) {
              const { tenantId, config } = event.data;
              const normTarget = this.normalizeTenantId(tenantId);
              this.teacherAccounts = this.teacherAccounts.map(a => {
                if (a.tenantId === tenantId || this.normalizeTenantId(a.tenantId) === normTarget) {
                  return {
                    ...a,
                    ...(config.schoolName ? { schoolName: config.schoolName.trim() } : {}),
                    ...(config.className ? { className: config.className.trim() } : {}),
                    ...(config.totalStudentsCount !== undefined && config.totalStudentsCount !== null ? { totalStudentsCount: config.totalStudentsCount } : {}),
                    ...(config.academicYear ? { academicYear: config.academicYear.trim() } : {})
                  };
                }
                return a;
              });
              this.saveAccounts();

              if (config.schoolName) {
                this.tenants = this.tenants.map(t => {
                  if (t.id === tenantId || this.normalizeTenantId(t.id) === normTarget) {
                    return {
                      ...t,
                      schoolName: config.schoolName!.trim(),
                      school_name: config.schoolName!.trim(),
                      updatedAt: new Date().toISOString()
                    };
                  }
                  return t;
                });
                this.saveTenants();
              }
            } else {
              this.loadFromStorage();
            }
            this.notify();
          }
        };
      } catch (err) {
        console.warn('BroadcastChannel not supported for tenant workspace', err);
      }
    }

    // Cross-tab storage listener
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (
          e.key === STORAGE_KEYS.TEACHER_ACCOUNTS ||
          e.key === STORAGE_KEYS.TENANTS ||
          (e.key && e.key.includes('class_settings'))
        ) {
          this.loadFromStorage();
          this.notify();
        }
      });
    }

    // Hydrate latest persistent tenants and teacher accounts from server
    this.fetchTenantsFromServer().catch(() => {});
    this.fetchTeachersFromServer().catch(() => {});
  }

  private loadFromStorage(): void {
    try {
      const storedTenants = safeLocalStorageGet(STORAGE_KEYS.TENANTS);
      if (storedTenants) {
        const parsed = JSON.parse(storedTenants);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge defaults with stored tenants
          const mergedMap = new Map<string, Tenant>();
          DEFAULT_TENANTS.forEach(t => mergedMap.set(t.id, t));
          parsed.forEach((t: Tenant) => {
            if (t && t.id) mergedMap.set(t.id, { ...mergedMap.get(t.id), ...t });
          });
          this.tenants = Array.from(mergedMap.values());
        } else {
          this.tenants = [...DEFAULT_TENANTS];
          this.saveTenants();
        }
      } else {
        this.tenants = [...DEFAULT_TENANTS];
        this.saveTenants();
      }

      const storedActiveId = safeLocalStorageGet(STORAGE_KEYS.ACTIVE_TENANT_ID);
      if (storedActiveId) {
        this.activeTenantId = storedActiveId;
      } else {
        this.activeTenantId = this.tenants[0]?.id || 'tenant-lan-nguyen';
        safeLocalStorageSet(STORAGE_KEYS.ACTIVE_TENANT_ID, this.activeTenantId);
      }

      const storedAccounts = safeLocalStorageGet(STORAGE_KEYS.TEACHER_ACCOUNTS);
      if (storedAccounts) {
        const parsedAccounts = JSON.parse(storedAccounts);
        if (Array.isArray(parsedAccounts) && parsedAccounts.length > 0) {
          const mergedAccountsMap = new Map<string, TeacherAccountItem>();
          DEFAULT_TEACHER_ACCOUNTS.forEach(a => mergedAccountsMap.set(a.tenantId || a.id, a));
          parsedAccounts.forEach((a: TeacherAccountItem) => {
            const key = a.tenantId || a.id;
            if (key) mergedAccountsMap.set(key, { ...mergedAccountsMap.get(key), ...a });
          });
          this.teacherAccounts = Array.from(mergedAccountsMap.values());
        } else {
          this.teacherAccounts = [...DEFAULT_TEACHER_ACCOUNTS];
          this.saveAccounts();
        }
      } else {
        this.teacherAccounts = [...DEFAULT_TEACHER_ACCOUNTS];
        this.saveAccounts();
      }
    } catch {
      this.tenants = [...DEFAULT_TENANTS];
      this.activeTenantId = 'tenant-lan-nguyen';
      this.teacherAccounts = [...DEFAULT_TEACHER_ACCOUNTS];
    }
  }

  private saveTenants(): void {
    safeLocalStorageSet(STORAGE_KEYS.TENANTS, JSON.stringify(this.tenants));
    this.notify();
  }

  private saveAccounts(): void {
    safeLocalStorageSet(STORAGE_KEYS.TEACHER_ACCOUNTS, JSON.stringify(this.teacherAccounts));
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
        console.error('TenantManager listener error:', err);
      }
    });
  }

  public getTenants(): Tenant[] {
    return [...this.tenants];
  }

  public normalizeTenantId(id: string): string {
    if (!id) return this.activeTenantId || 'tenant-lan-nguyen';
    if (id === 'tenant-mai-lan' || id === 'tenant-lan' || id === 'ws-class-11a1') return 'tenant-lan-nguyen';
    if (id === 'tenant-nam' || id === 'ws-class-12a2') return 'tenant-hoang-nam';
    return id;
  }

  public clearActiveTenant(): void {
    this.activeTenantId = '';
    safeLocalStorageRemove(STORAGE_KEYS.ACTIVE_TENANT_ID);
    this.notify();
  }

  public registerOrUpdateTeacherAccount(account: Partial<TeacherAccountItem> & { tenantId: string }): void {
    if (!account || !account.tenantId) return;
    const existingIndex = this.teacherAccounts.findIndex(
      a => a.tenantId === account.tenantId || (account.id && a.id === account.id)
    );
    const updatedItem: TeacherAccountItem = {
      id: account.id || `tch-${account.tenantId}`,
      tenantId: account.tenantId,
      email: account.email || '',
      fullName: account.fullName || 'Giáo viên Chủ nhiệm',
      phone: account.phone || '',
      schoolName: account.schoolName || 'Trường THPT',
      workspaceName: account.workspaceName || `Không gian GVCN ${account.fullName || ''}`,
      loginMethod: account.loginMethod || 'BOTH',
      allowedGoogleEmail: account.allowedGoogleEmail || account.email,
      classesCount: account.classesCount || 1,
      totalStudentsCount: account.totalStudentsCount ?? 0,
      status: account.status || 'ACTIVE',
      createdAt: account.createdAt || new Date().toISOString(),
      activationToken: account.activationToken
    };
    if (existingIndex >= 0) {
      this.teacherAccounts[existingIndex] = {
        ...this.teacherAccounts[existingIndex],
        ...updatedItem
      };
    } else {
      this.teacherAccounts.push(updatedItem);
    }
    this.saveAccounts();
  }

  public getActiveTenant(): Tenant {
    const normId = this.normalizeTenantId(this.activeTenantId);
    const found = this.tenants.find(t => t.id === normId);
    if (found) return found;

    // Resilient fallback: ensure active tenant is never missing
    const synthesized: Tenant = {
      id: normId,
      name: `Không gian ${normId}`,
      schoolName: 'Trường THPT',
      ownerEmail: '',
      ownerName: 'Giáo viên Chủ nhiệm',
      status: 'ACTIVE',
      plan: 'STANDARD',
      quota: {
        maxClasses: 2,
        maxStudentsPerClass: 45,
        storageMb: 1024,
        aiCreditsMonthly: 200
      },
      classIds: [`class-${normId}`],
      currentClassId: `class-${normId}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.tenants.push(synthesized);
    this.saveTenants();
    return synthesized;
  }

  public getActiveTenantId(): string {
    return this.normalizeTenantId(this.getActiveTenant().id);
  }

  public setActiveTenant(tenantId: string, metadata?: Partial<Tenant>): void {
    if (!tenantId) return;
    const normId = this.normalizeTenantId(tenantId);
    
    let existing = this.tenants.find(t => t.id === normId);
    if (!existing) {
      existing = {
        id: normId,
        name: metadata?.name || `Không gian ${normId}`,
        schoolName: metadata?.schoolName || 'Trường THPT',
        ownerEmail: metadata?.ownerEmail || '',
        ownerName: metadata?.ownerName || 'Giáo viên Chủ nhiệm',
        ownerPhone: metadata?.ownerPhone || '',
        status: metadata?.status || 'ACTIVE',
        plan: metadata?.plan || 'STANDARD',
        quota: metadata?.quota || {
          maxClasses: 2,
          maxStudentsPerClass: 45,
          storageMb: 1024,
          aiCreditsMonthly: 200
        },
        classIds: metadata?.classIds || [`class-${normId}`],
        currentClassId: metadata?.currentClassId || `class-${normId}`,
        createdAt: metadata?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.tenants.push(existing);
      this.saveTenants();
    } else if (metadata) {
      Object.assign(existing, metadata, { updatedAt: new Date().toISOString() });
      this.saveTenants();
    }

    this.activeTenantId = normId;
    safeLocalStorageSet(STORAGE_KEYS.ACTIVE_TENANT_ID, normId);
    this.notify();
  }

  public async fetchTenantsFromServer(): Promise<Tenant[]> {
    if (typeof window === 'undefined') {
      return [...this.tenants];
    }
    try {
      const token = this.getAuthToken();
      // Try public list endpoint first, fallback to authenticated
      const url = token ? '/api/v1/tenants' : '/api/v1/tenants/public/list';
      const res = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.tenants)) {
          const tenantMap = new Map<string, Tenant>();
          DEFAULT_TENANTS.forEach(t => tenantMap.set(t.id, t));
          this.tenants.forEach(t => tenantMap.set(t.id, t));
          data.tenants.forEach((serverT: any) => {
            if (serverT && serverT.id) {
              const current = tenantMap.get(serverT.id);
              tenantMap.set(serverT.id, {
                id: serverT.id,
                name: serverT.name || current?.name || `Không gian ${serverT.id}`,
                schoolName: serverT.school_name || serverT.schoolName || current?.schoolName || 'Trường THPT',
                ownerEmail: serverT.owner_email || serverT.ownerEmail || current?.ownerEmail || '',
                ownerName: serverT.owner_name || serverT.ownerName || current?.ownerName || 'Giáo viên Chủ nhiệm',
                ownerPhone: serverT.ownerPhone || current?.ownerPhone || '',
                status: serverT.status || current?.status || 'ACTIVE',
                plan: (serverT.plan as TenantPlan) || current?.plan || 'STANDARD',
                quota: current?.quota || {
                  maxClasses: serverT.plan === 'PRO' ? 5 : 2,
                  maxStudentsPerClass: serverT.plan === 'PRO' ? 50 : 45,
                  storageMb: serverT.plan === 'PRO' ? 2048 : 1024,
                  aiCreditsMonthly: serverT.plan === 'PRO' ? 500 : 200
                },
                classIds: current?.classIds || [`class-${serverT.id}`],
                currentClassId: current?.currentClassId || `class-${serverT.id}`,
                createdAt: serverT.created_at || serverT.createdAt || current?.createdAt || new Date().toISOString(),
                updatedAt: serverT.updated_at || serverT.updatedAt || current?.updatedAt || new Date().toISOString()
              });
            }
          });
          this.tenants = Array.from(tenantMap.values());
          this.saveTenants();
          return this.tenants;
        }
      }
    } catch (err) {
      console.warn('[TenantService] Failed to fetch server tenants:', err);
    }
    return this.getTenants();
  }

  public validateAccess(userTenantId: string | undefined, targetTenantId: string, userRole: string): boolean {
    if (userRole === 'SUPER_ADMIN') return true;
    const normUserTenant = this.normalizeTenantId(userTenantId || '');
    const normTargetTenant = this.normalizeTenantId(targetTenantId);
    return normUserTenant === normTargetTenant;
  }

  public assertTenantAccess(userTenantId: string | undefined, targetTenantId: string, userRole: string): void {
    if (!this.validateAccess(userTenantId, targetTenantId, userRole)) {
      throw new Error(`403 FORBIDDEN: Không có quyền truy cập hoặc chỉnh sửa không gian ${targetTenantId}`);
    }
  }

  public getTenantById(id: string): Tenant | undefined {
    return this.tenants.find(t => t.id === id);
  }

  public getTeacherAccounts(): TeacherAccountItem[] {
    return this.teacherAccounts.map(account => {
      let schoolName = account.schoolName;
      let className = account.className;
      let academicYear = account.academicYear;
      let totalStudentsCount = account.totalStudentsCount;

      // 1. Read class settings if available
      try {
        const settingsKey = this.getTenantStorageKey('class_settings', account.tenantId);
        const storedSettings = safeLocalStorageGet(settingsKey);
        if (storedSettings) {
          const parsed = JSON.parse(storedSettings);
          if (parsed.schoolName && typeof parsed.schoolName === 'string' && parsed.schoolName.trim()) {
            schoolName = parsed.schoolName.trim();
          }
          if (parsed.className || parsed.name) {
            className = (parsed.className || parsed.name).trim();
          }
          if (parsed.academicYear) {
            academicYear = parsed.academicYear.trim();
          }
          if (parsed.confirmedTotalStudents !== undefined && parsed.confirmedTotalStudents !== null && parsed.confirmedTotalStudents !== '' && !isNaN(Number(parsed.confirmedTotalStudents))) {
            totalStudentsCount = Number(parsed.confirmedTotalStudents);
          } else if (parsed.totalStudents !== undefined && parsed.totalStudents !== null && parsed.totalStudents !== '' && !isNaN(Number(parsed.totalStudents))) {
            totalStudentsCount = Number(parsed.totalStudents);
          }
        }
      } catch {}

      // 2. If student data exists in tenant storage and not overridden by confirmedTotalStudents, compute exact count
      try {
        const studentKey = this.getTenantStorageKey('students', account.tenantId);
        const storedStudents = safeLocalStorageGet(studentKey);
        if (storedStudents) {
          const parsed = JSON.parse(storedStudents);
          if (Array.isArray(parsed)) {
            // If totalStudentsCount is undefined, update to real array length
            if (totalStudentsCount === undefined || totalStudentsCount === null) {
              totalStudentsCount = parsed.length;
            }
          }
        }
      } catch {}

      // 3. Fallbacks
      if (!className) {
        className = account.tenantId === 'tenant-lan-nguyen' ? '11A1' : account.tenantId === 'tenant-hoang-nam' ? '12A2' : '10A1';
      }
      if (!academicYear) {
        academicYear = '2025 - 2026';
      }
      if (totalStudentsCount === undefined || totalStudentsCount === null) {
        totalStudentsCount = account.tenantId === 'tenant-lan-nguyen' ? 4 : account.tenantId === 'tenant-hoang-nam' ? 1 : 0;
      }

      return {
        ...account,
        schoolName: schoolName || 'Trường THPT',
        className,
        academicYear,
        totalStudentsCount
      };
    });
  }

  /**
   * Synchronize updated classroom configuration from GVCN workspace back to Admin Management
   * Strictly updates only school, class, class size, and academic year by tenantId identifier.
   */
  public syncClassroomConfiguration(tenantId: string, config: {
    schoolName?: string;
    className?: string;
    totalStudentsCount?: number;
    academicYear?: string;
  }): void {
    if (!tenantId || typeof tenantId !== 'string') return;
    const cleanTenantId = tenantId.trim();

    const normTarget = this.normalizeTenantId(cleanTenantId);

    // 1. Locate and update teacher account strictly by tenantId identifier
    let updatedAny = false;
    this.teacherAccounts = this.teacherAccounts.map(a => {
      if (a.tenantId === cleanTenantId || this.normalizeTenantId(a.tenantId) === normTarget) {
        updatedAny = true;
        return {
          ...a,
          ...(config.schoolName ? { schoolName: config.schoolName.trim() } : {}),
          ...(config.className ? { className: config.className.trim() } : {}),
          ...(config.totalStudentsCount !== undefined && config.totalStudentsCount !== null ? { totalStudentsCount: config.totalStudentsCount } : {}),
          ...(config.academicYear ? { academicYear: config.academicYear.trim() } : {})
        };
      }
      return a;
    });

    if (updatedAny) {
      this.saveAccounts();
    } else {
      // If account was not in local memory, pull fresh accounts from server
      this.fetchTeachersFromServer().catch(() => {});
    }

    // 2. Update tenant schoolName if modified
    if (config.schoolName) {
      this.tenants = this.tenants.map(t => {
        if (t.id === cleanTenantId || this.normalizeTenantId(t.id) === normTarget) {
          return {
            ...t,
            schoolName: config.schoolName!.trim(),
            school_name: config.schoolName!.trim(),
            updatedAt: new Date().toISOString()
          };
        }
        return t;
      });
      this.saveTenants();
    }

    // 3. Broadcast across tabs
    if (this.channel) {
      try {
        this.channel.postMessage({
          type: 'CLASSROOM_CONFIG_SYNCED',
          tenantId: cleanTenantId,
          config
        });
      } catch {}
    }

    // 4. Notify local reactive subscribers (including PlatformAdminConsole)
    this.notify();
  }

  public async createTeacherWorkspaceAsync(data: {
    fullName: string;
    email: string;
    phone?: string;
    schoolName: string;
    workspaceName?: string;
    loginMethod?: 'GOOGLE' | 'ACCESS_CODE' | 'BOTH';
    allowedGoogleEmail?: string;
    plan?: TenantPlan;
    className?: string;
    initialCode?: string;
    createdBy?: string;
    password?: string;
  }): Promise<{ account: TeacherAccountItem; tenant: Tenant; temporaryPassword?: string }> {
    const cleanEmail = data.email.trim().toLowerCase();

    // Standard email validation (accepts all domains, no Gmail restriction)
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(cleanEmail)) {
      throw new Error('Địa chỉ email không đúng định dạng hợp lệ (VD: tengv@school.edu.vn hoặc gvcn@outlook.com).');
    }

    const existing = this.teacherAccounts.find(t => t.email.toLowerCase() === cleanEmail);
    if (existing) {
      throw new Error(`Email "${cleanEmail}" đã được sử dụng cho một tài khoản GVCN khác trong hệ thống.`);
    }

    if (data.initialCode && data.initialCode.trim()) {
      const codeTrim = data.initialCode.trim().toUpperCase();
      const existingCode = this.teacherAccounts.find(t => t.activationToken?.toUpperCase() === codeTrim);
      if (existingCode) {
        throw new Error(`Mã đăng nhập "${codeTrim}" đã được sử dụng. Vui lòng chọn mã khác.`);
      }
    }

    // 1. Resolve Admin Server Session Token
    let token = this.getAuthToken();
    if (!token) {
      // Check document cookies or storage keys
      try {
        const sessionStr = safeLocalStorageGet('kgcns_auth_session');
        if (sessionStr) {
          const parsed = JSON.parse(sessionStr);
          if (parsed?.token) token = parsed.token;
        }
      } catch {}
    }

    if (!token) {
      throw new Error('Chưa có phiên xác thực Quản trị viên hợp lệ trên máy chủ. Vui lòng đăng nhập lại Admin.');
    }

    // 2. Persist directly to authoritative backend master database
    let res: Response;
    try {
      res = await fetch('/api/v1/tenants/admin/create-teacher', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          fullName: data.fullName,
          email: cleanEmail,
          phone: data.phone,
          schoolName: data.schoolName,
          plan: data.plan,
          className: data.className,
          password: data.password?.trim(),
          initialCode: data.initialCode?.trim()
        })
      });
    } catch (fetchErr: any) {
      throw new Error(`Không thể kết nối đến máy chủ cơ sở dữ liệu để tạo tài khoản: ${fetchErr?.message || 'Lỗi mạng'}`);
    }

    let resData: any;
    try {
      resData = await res.json();
    } catch {
      throw new Error('Máy chủ phản hồi định dạng không hợp lệ khi tạo tài khoản GVCN.');
    }

    if (!res.ok || !resData.success) {
      throw new Error(resData.message || 'Không thể tạo tài khoản GVCN trên máy chủ cơ sở dữ liệu.');
    }

    const serverAccount: TeacherAccountItem = {
      ...resData.account,
      classesCount: 1,
      className: data.className || '10A1',
      totalStudentsCount: 0,
      hasPassword: true
    };

    const serverTenant: Tenant = {
      id: resData.tenant.id,
      name: resData.tenant.name,
      schoolName: resData.tenant.schoolName,
      ownerEmail: cleanEmail,
      ownerName: data.fullName,
      ownerPhone: data.phone,
      status: 'ACTIVE',
      plan: data.plan || 'STANDARD',
      quota: {
        maxClasses: data.plan === 'PRO' ? 5 : 2,
        maxStudentsPerClass: data.plan === 'PRO' ? 50 : 45,
        storageMb: data.plan === 'PRO' ? 2048 : 1024,
        aiCreditsMonthly: data.plan === 'PRO' ? 500 : 200
      },
      classIds: [`class-${(data.className || '10A1').toLowerCase()}`],
      currentClassId: `class-${(data.className || '10A1').toLowerCase()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Update in-memory state and local cache
    const existingTenantIdx = this.tenants.findIndex(t => t.id === serverTenant.id);
    if (existingTenantIdx >= 0) {
      this.tenants[existingTenantIdx] = serverTenant;
    } else {
      this.tenants.push(serverTenant);
    }

    const existingAccIdx = this.teacherAccounts.findIndex(a => a.id === serverAccount.id || a.tenantId === serverAccount.tenantId);
    if (existingAccIdx >= 0) {
      this.teacherAccounts[existingAccIdx] = serverAccount;
    } else {
      this.teacherAccounts.push(serverAccount);
    }

    this.saveTenants();
    this.saveAccounts();

    // Refresh list from server to ensure 100% database synchronization
    await this.fetchTeachersFromServer().catch(() => {});

    return { account: serverAccount, tenant: serverTenant, temporaryPassword: resData.account?.temporaryPassword };
  }

  public createTeacherWorkspace(data: {
    fullName: string;
    email: string;
    phone?: string;
    schoolName: string;
    workspaceName?: string;
    loginMethod?: 'GOOGLE' | 'ACCESS_CODE' | 'BOTH';
    allowedGoogleEmail?: string;
    plan?: TenantPlan;
    className?: string;
    initialCode?: string;
    createdBy?: string;
    password?: string;
  }): { account: TeacherAccountItem; tenant: Tenant } {
    const cleanEmail = data.email.trim().toLowerCase();
    const existing = this.teacherAccounts.find(t => t.email.toLowerCase() === cleanEmail);
    if (existing) {
      throw new Error(`Email "${cleanEmail}" đã được sử dụng cho một tài khoản GVCN khác trong hệ thống.`);
    }

    const slug = data.fullName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 20);

    const tenantId = `tenant-${slug}-${Date.now().toString(36)}`;
    const classId = `class-${(data.className || '10A1').toLowerCase()}-${Date.now().toString(36)}`;
    const activationToken = data.initialCode?.trim().toUpperCase() || `GV-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const hasPassword = Boolean(data.password && data.password.trim());

    const newTenant: Tenant = {
      id: tenantId,
      name: data.workspaceName || `Không gian GVCN ${data.fullName}`,
      schoolName: data.schoolName,
      ownerEmail: cleanEmail,
      ownerName: data.fullName,
      ownerPhone: data.phone,
      status: 'ACTIVE',
      plan: data.plan || 'STANDARD',
      quota: {
        maxClasses: data.plan === 'PRO' ? 5 : 2,
        maxStudentsPerClass: data.plan === 'PRO' ? 50 : 45,
        storageMb: data.plan === 'PRO' ? 2048 : 1024,
        aiCreditsMonthly: data.plan === 'PRO' ? 500 : 200
      },
      classIds: [classId],
      currentClassId: classId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const newAccount: TeacherAccountItem = {
      id: `tch-${Date.now().toString(36)}`,
      tenantId,
      email: cleanEmail,
      fullName: data.fullName,
      phone: data.phone,
      schoolName: data.schoolName,
      workspaceName: data.workspaceName || `Không gian GVCN ${data.fullName}`,
      className: data.className || '10A1',
      loginMethod: data.loginMethod || 'BOTH',
      allowedGoogleEmail: data.allowedGoogleEmail || cleanEmail,
      classesCount: 1,
      totalStudentsCount: 0,
      status: 'ACTIVE',
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      createdBy: data.createdBy || 'Super Admin (binhdtsply@gmail.com)',
      activationToken,
      hasPassword
    };

    this.tenants.push(newTenant);
    this.teacherAccounts.push(newAccount);
    this.saveTenants();
    this.saveAccounts();

    // Trigger async background sync with server
    this.createTeacherWorkspaceAsync(data).catch(err => {
      console.warn('[TenantService] Async sync error:', err);
    });

    return { account: newAccount, tenant: newTenant };
  }

  public async resetTeacherPassword(teacherId: string, newPassword?: string): Promise<{
    success: boolean;
    message: string;
    temporaryPassword?: string;
    activationToken?: string;
  }> {
    const token = this.getAuthToken();
    if (token) {
      const res = await fetch('/api/v1/tenants/admin/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ teacherId, newPassword })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Lỗi khi đặt lại mật khẩu trên máy chủ.');
      }

      // Update local state
      const idx = this.teacherAccounts.findIndex(t => t.id === teacherId || t.tenantId === teacherId);
      if (idx !== -1) {
        this.teacherAccounts[idx].hasPassword = true;
        this.saveAccounts();
      }

      return {
        success: true,
        message: data.message,
        temporaryPassword: data.temporaryPassword,
        activationToken: data.activationToken
      };
    }

    // Local fallback
    const idx = this.teacherAccounts.findIndex(t => t.id === teacherId || t.tenantId === teacherId);
    if (idx === -1) throw new Error('Không tìm thấy tài khoản GVCN.');
    const tempPass = newPassword?.trim() || `GV@${Math.random().toString(36).substring(2, 8).toUpperCase()}!`;
    this.teacherAccounts[idx].hasPassword = true;
    this.saveAccounts();

    return {
      success: true,
      message: 'Đã đặt lại mật khẩu cho tài khoản GVCN thành công.',
      temporaryPassword: tempPass,
      activationToken: this.teacherAccounts[idx].activationToken
    };
  }

  public async deleteTeacherAccount(teacherId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const token = this.getAuthToken();
    if (token) {
      const res = await fetch(`/api/v1/tenants/admin/teacher/${encodeURIComponent(teacherId)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Lỗi khi xóa tài khoản GVCN trên máy chủ.');
      }
    }

    // Remove from local teacherAccounts while strictly keeping tenants and students
    this.teacherAccounts = this.teacherAccounts.filter(t => t.id !== teacherId && t.tenantId !== teacherId);
    this.saveAccounts();

    return {
      success: true,
      message: 'Đã xóa tài khoản GVCN. Dữ liệu lớp học và học viên được bảo toàn nguyên vẹn.'
    };
  }

  public async toggleTeacherAccountStatus(teacherId: string): Promise<{
    success: boolean;
    status: TeacherAccountStatus;
    message: string;
  }> {
    const token = this.getAuthToken();
    if (token) {
      const res = await fetch('/api/v1/tenants/admin/toggle-teacher-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ teacherId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const idx = this.teacherAccounts.findIndex(t => t.id === teacherId || t.tenantId === teacherId);
        if (idx !== -1) {
          this.teacherAccounts[idx].status = data.status;
          this.saveAccounts();
        }
        return { success: true, status: data.status, message: data.message };
      }
    }

    const idx = this.teacherAccounts.findIndex(t => t.id === teacherId || t.tenantId === teacherId);
    if (idx === -1) throw new Error('Không tìm thấy tài khoản GVCN.');
    const nextStatus: TeacherAccountStatus = this.teacherAccounts[idx].status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE';
    this.teacherAccounts[idx].status = nextStatus;
    this.saveAccounts();

    return {
      success: true,
      status: nextStatus,
      message: nextStatus === 'ACTIVE' ? 'Đã mở khóa tài khoản GVCN.' : 'Đã tạm khóa tài khoản GVCN.'
    };
  }

  public updateTeacherAccount(id: string, patch: Partial<TeacherAccountItem>): TeacherAccountItem {
    const idx = this.teacherAccounts.findIndex(a => a.id === id);
    if (idx === -1) throw new Error('Teacher account not found');

    const updated = {
      ...this.teacherAccounts[idx],
      ...patch
    };
    this.teacherAccounts[idx] = updated;

    // Sync corresponding tenant info if needed
    if (patch.fullName || patch.schoolName || patch.email || patch.phone || patch.workspaceName) {
      const tIdx = this.tenants.findIndex(t => t.id === updated.tenantId);
      if (tIdx !== -1) {
        this.tenants[tIdx] = {
          ...this.tenants[tIdx],
          name: patch.workspaceName || (patch.fullName ? `Không gian GVCN ${patch.fullName}` : this.tenants[tIdx].name),
          ownerName: patch.fullName || this.tenants[tIdx].ownerName,
          ownerEmail: patch.email || this.tenants[tIdx].ownerEmail,
          ownerPhone: patch.phone !== undefined ? patch.phone : this.tenants[tIdx].ownerPhone,
          schoolName: patch.schoolName || this.tenants[tIdx].schoolName,
          updatedAt: new Date().toISOString()
        };
        this.saveTenants();
      }
    }

    this.saveAccounts();
    return updated;
  }

  public toggleTeacherStatus(id: string, newStatus?: 'ACTIVE' | 'LOCKED' | 'REVOKED'): 'ACTIVE' | 'LOCKED' | 'REVOKED' {
    const teacher = this.teacherAccounts.find(a => a.id === id);
    if (!teacher) throw new Error('Teacher account not found');

    const targetStatus = newStatus || (teacher.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE');
    this.updateTeacherAccount(id, { status: targetStatus });

    // Sync tenant status
    const tIdx = this.tenants.findIndex(t => t.id === teacher.tenantId);
    if (tIdx !== -1) {
      this.tenants[tIdx].status = targetStatus === 'ACTIVE' ? 'ACTIVE' : 'SUSPENDED';
      this.saveTenants();
    }

    return targetStatus;
  }

  public regenerateTeacherAccessCode(id: string): { newCode: string } {
    const teacher = this.teacherAccounts.find(a => a.id === id);
    if (!teacher) throw new Error('Teacher account not found');

    const randHex = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newCode = `ACT-${randHex}-${new Date().getFullYear()}`;
    this.updateTeacherAccount(id, { activationToken: newCode });
    return { newCode };
  }

  public linkGoogleAccount(id: string, googleEmail: string, googleSub?: string): boolean {
    const teacher = this.teacherAccounts.find(a => a.id === id);
    if (!teacher) return false;

    this.updateTeacherAccount(id, {
      allowedGoogleEmail: googleEmail.toLowerCase().trim(),
      googleSub: googleSub,
      loginMethod: teacher.loginMethod === 'ACCESS_CODE' ? 'BOTH' : teacher.loginMethod
    });
    return true;
  }

  public unlinkGoogleAccount(id: string): boolean {
    const teacher = this.teacherAccounts.find(a => a.id === id);
    if (!teacher) return false;

    this.updateTeacherAccount(id, {
      allowedGoogleEmail: undefined,
      googleSub: undefined,
      loginMethod: 'ACCESS_CODE'
    });
    return true;
  }

  public revokeTeacherAccount(id: string): boolean {
    return this.toggleTeacherStatus(id, 'REVOKED') === 'REVOKED';
  }

  public findTeacherByGoogleIdentity(googleEmail: string, googleSub?: string): TeacherAccountItem | undefined {
    const normEmail = googleEmail.toLowerCase().trim();
    return this.teacherAccounts.find(a => {
      if (a.status !== 'ACTIVE') return false;
      if (a.googleSub && googleSub && a.googleSub === googleSub) return true;
      if (a.allowedGoogleEmail && a.allowedGoogleEmail.toLowerCase().trim() === normEmail) return true;
      if (a.email && a.email.toLowerCase().trim() === normEmail && a.loginMethod !== 'ACCESS_CODE') return true;
      return false;
    });
  }

  public findTeacherByAccessCode(code: string): TeacherAccountItem | undefined {
    const cleanCode = code.trim().toUpperCase();
    return this.teacherAccounts.find(a => {
      if (!a.activationToken) return false;
      return a.activationToken.trim().toUpperCase() === cleanCode;
    });
  }

  public findTeacherById(id: string): TeacherAccountItem | undefined {
    return this.teacherAccounts.find(a => a.id === id);
  }

  public updateTenant(id: string, patch: Partial<Tenant>): Tenant {
    const idx = this.tenants.findIndex(t => t.id === id);
    if (idx === -1) throw new Error('Tenant not found');

    const updated = {
      ...this.tenants[idx],
      ...patch,
      updatedAt: new Date().toISOString()
    };
    this.tenants[idx] = updated;
    this.saveTenants();
    return updated;
  }

  public toggleTenantStatus(id: string): TenantStatus {
    const tenant = this.getTenantById(id);
    if (!tenant) throw new Error('Tenant not found');

    const nextStatus: TenantStatus = tenant.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    this.updateTenant(id, { status: nextStatus });

    const accIdx = this.teacherAccounts.findIndex(a => a.tenantId === id);
    if (accIdx !== -1) {
      this.teacherAccounts[accIdx].status = nextStatus === 'ACTIVE' ? 'ACTIVE' : 'LOCKED';
      this.saveAccounts();
    }

    return nextStatus;
  }

  public getPlatformStats() {
    const totalTenants = this.tenants.length;
    const activeTenants = this.tenants.filter(t => t.status === 'ACTIVE').length;
    const totalTeachers = this.teacherAccounts.length;
    const totalClasses = this.tenants.reduce((acc, t) => acc + (t.classIds?.length || 1), 0);
    const accounts = this.getTeacherAccounts();
    const totalStudentsEstimate = accounts.reduce((acc, a) => acc + (a.totalStudentsCount || 0), 0);
    const totalStorageMb = this.tenants.reduce((acc, t) => acc + (t.quota?.storageMb || 1024), 0);

    return {
      totalTenants,
      activeTenants,
      totalTeachers,
      totalClasses,
      totalStudentsEstimate,
      totalStorageMb,
      systemHealth: '100% HOẠT ĐỘNG BÌNH THƯỜNG',
      version: 'v2.6.0-SaaS'
    };
  }

  private getAuthToken(): string {
    const repoToken = authRepository.getSessionToken();
    if (repoToken) return repoToken;

    try {
      const sessionStr = safeLocalStorageGet('kgcns_auth_session');
      if (sessionStr) {
        const parsed = JSON.parse(sessionStr);
        if (parsed?.token) return parsed.token;
      }
    } catch {}

    try {
      const sessionStr = safeLocalStorageGet('kgcns_session_v2');
      if (sessionStr) {
        const parsed = JSON.parse(sessionStr);
        if (parsed?.token) return parsed.token;
      }
    } catch {}
    return (
      safeLocalStorageGet('kgcns_server_session_token') ||
      safeLocalStorageGet('kgcns_auth_token') ||
      safeLocalStorageGet('kgcns_session_token') ||
      (typeof window !== 'undefined' ? (window as any).__kgcns_token : '') ||
      ''
    );
  }

  public async getAdminStats(): Promise<any> {
    try {
      const token = this.getAuthToken();
      const res = await fetch('/api/v1/tenants/admin/stats', {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.stats) {
          return data.stats;
        }
      }
    } catch (err) {
      console.warn('[TenantService] Failed to fetch server admin stats:', err);
    }
    return null;
  }

  public async fetchTeachersFromServer(): Promise<TeacherAccountItem[]> {
    if (typeof window === 'undefined') {
      return [...this.teacherAccounts];
    }
    try {
      const token = this.getAuthToken();
      let res: Response;
      if (token) {
        res = await fetch('/api/v1/tenants/admin/teachers', {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        });
        if (!res.ok) {
          // If admin endpoint denied (e.g. non-admin token), fallback to public endpoint
          res = await fetch('/api/v1/tenants/public/teachers', {
            headers: { 'Content-Type': 'application/json' }
          });
        }
      } else {
        // Unauthenticated or client load: use public sanitized teacher roster
        res = await fetch('/api/v1/tenants/public/teachers', {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (res && res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.teachers)) {
          // Authoritative sync from database: map by tenantId or id
          const teacherMap = new Map<string, TeacherAccountItem>();
          data.teachers.forEach((t: TeacherAccountItem) => {
            const key = t.tenantId || t.id;
            if (key) teacherMap.set(key, t);
          });
          this.teacherAccounts.forEach((existing: TeacherAccountItem) => {
            const key = existing.tenantId || existing.id;
            if (key && !teacherMap.has(key)) {
              teacherMap.set(key, existing);
            }
          });
          this.teacherAccounts = Array.from(teacherMap.values());
          this.saveAccounts();
          return this.teacherAccounts;
        }
      }
    } catch (err) {
      console.warn('[TenantService] Failed to fetch server teachers:', err);
    }
    return this.getTeacherAccounts();
  }

  public async getWorkspaceDeletionSummary(tenantId: string): Promise<{
    id: string;
    name: string;
    schoolName: string;
    className: string;
    academicYear: string;
    teacherName: string;
    teacherEmail: string;
    totalStudents: number;
    totalCredentials: number;
    status: string;
    plan: string;
  }> {
    const token = this.getAuthToken();
    if (token) {
      try {
        const res = await fetch(`/api/v1/tenants/admin/workspace/${encodeURIComponent(tenantId)}/summary`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.summary) {
            return data.summary;
          }
        }
      } catch (err) {
        console.warn('[TenantService] Failed to fetch server deletion summary:', err);
      }
    }

    // Local fallback
    const tenant = this.getTenantById(tenantId) || this.tenants[0];
    const teacher = this.teacherAccounts.find(a => a.tenantId === tenantId);
    let studentsCount = 0;
    try {
      const studentKey = this.getTenantStorageKey('students', tenantId);
      const stored = safeLocalStorageGet(studentKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) studentsCount = parsed.length;
      }
    } catch {}

    return {
      id: tenant?.id || tenantId,
      name: tenant?.name || `Không gian ${tenantId}`,
      schoolName: tenant?.schoolName || 'Trường THPT',
      className: teacher?.className || '10A1',
      academicYear: teacher?.academicYear || '2025-2026',
      teacherName: teacher?.fullName || tenant?.ownerName || 'Chưa phân công',
      teacherEmail: teacher?.email || tenant?.ownerEmail || '',
      totalStudents: studentsCount || teacher?.totalStudentsCount || 0,
      totalCredentials: (studentsCount * 2) + (teacher ? 1 : 0),
      status: tenant?.status || 'ACTIVE',
      plan: tenant?.plan || 'STANDARD'
    };
  }

  public async deleteWorkspacePermanently(tenantId: string, confirmName?: string): Promise<{
    success: boolean;
    message: string;
  }> {
    if (!tenantId || tenantId === 'platform-root' || tenantId === 'default') {
      throw new Error('Không thể xóa không gian gốc hệ thống hoặc không gian mặc định.');
    }

    const token = this.getAuthToken();
    if (token) {
      const res = await fetch(`/api/v1/tenants/admin/workspace/${encodeURIComponent(tenantId)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ confirmName })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Lỗi khi xóa không gian lớp trên máy chủ.');
      }
    }

    // Client-side cleanup: Remove tenant and associated teacher account
    const tenantToDelete = this.getTenantById(tenantId);
    const tenantName = tenantToDelete?.name || tenantId;

    this.tenants = this.tenants.filter(t => t.id !== tenantId);
    this.teacherAccounts = this.teacherAccounts.filter(a => a.tenantId !== tenantId);

    // Clean up all localStorage keys strictly belonging to this tenant
    try {
      const prefix = `kgcns_${tenantId}_`;
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(prefix)) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (cleanErr) {
      console.warn('[TenantService] LocalStorage key cleanup notice:', cleanErr);
    }

    // Switch active tenant if the deleted tenant was currently selected
    if (this.activeTenantId === tenantId) {
      this.activeTenantId = this.tenants[0]?.id || 'tenant-lan-nguyen';
      safeLocalStorageSet(STORAGE_KEYS.ACTIVE_TENANT_ID, this.activeTenantId);
    }

    this.saveTenants();
    this.saveAccounts();

    return {
      success: true,
      message: `Đã xóa vĩnh viễn không gian lớp ${tenantName} và giải phóng toàn bộ dữ liệu lưu trữ thành công.`
    };
  }

  public getTenantStorageKey(baseKey: string, tenantId?: string): string {
    const tId = tenantId || this.activeTenantId;
    return `kgcns_${tId}_${baseKey}`;
  }
}

export const tenantService = new TenantManager();
export const tenantManager = tenantService;
