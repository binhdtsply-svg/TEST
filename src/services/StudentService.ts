/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Student, ParentInfo, AttentionStatus, AttentionHistoryEntry, ViolationHandlingRecord, ViolationHandlingStatus } from '../types';
import { initialStudents, initialTeacher2Students } from '../data/demoData';
import { authRepository } from './AuthRepository';
import { tenantService } from './TenantService';
import { studentRepositoryClient } from './StudentRepositoryClient';
import { classService } from './ClassService';
import { trainingService } from './TrainingService';
import { safeLocalStorageGet, safeLocalStorageSet } from '../utils/storageUtils';

class StudentService {
  private activeTenantId: string = 'tenant-lan-nguyen';
  private students: Student[] = [...initialStudents];
  private listeners: Array<() => void> = [];
  private isFetching: boolean = false;

  constructor() {
    this.activeTenantId = tenantService.getActiveTenantId();
    this.loadFromStorage(this.activeTenantId);
    this.fetchFromServer();

    // Reactively reload students when active workspace/tenant switches
    tenantService.subscribe(() => {
      const nextTenantId = tenantService.getActiveTenantId();
      if (nextTenantId !== this.activeTenantId) {
        this.activeTenantId = nextTenantId;
        this.loadFromStorage(nextTenantId);
        this.notify();
      }
      this.fetchFromServer();
    });
  }

  public async fetchFromServer(): Promise<void> {
    if (this.isFetching) return;
    this.isFetching = true;
    try {
      const res = await studentRepositoryClient.getStudents();
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        // Safe merge with local student cache to preserve tokens and nested structures
        const serverIds = new Set(res.data.map((s: any) => s.id));
        const mergedStudents: Student[] = res.data.map(serverStudent => {
          const localStudent = this.students.find(s => s.id === serverStudent.id);
          const studentToken = serverStudent.studentActivationToken || serverStudent.activationTokenStudent || localStudent?.studentActivationToken || localStudent?.activationTokenStudent || `STU-${serverStudent.code}`;
          const parentToken = serverStudent.parentActivationToken || serverStudent.activationTokenParent || localStudent?.parentActivationToken || localStudent?.activationTokenParent || `PAR-${serverStudent.code}`;
          
          const parentObj = serverStudent.parent || localStudent?.parent || {
            fatherName: serverStudent.fatherName || localStudent?.fatherName || '',
            fatherPhone: serverStudent.fatherPhone || localStudent?.fatherPhone || '',
            fatherJob: serverStudent.fatherJob || localStudent?.fatherJob || '',
            motherName: serverStudent.motherName || localStudent?.motherName || '',
            motherPhone: serverStudent.motherPhone || localStudent?.motherPhone || '',
            motherJob: serverStudent.motherJob || localStudent?.motherJob || '',
            address: serverStudent.address || localStudent?.address || 'TP. Hồ Chí Minh',
            zaloConnected: true
          };

          // Safe merge and full preservation of violation handling records
          let deletedViolationIds = new Set<string>();
          try {
            const existingDeleted = JSON.parse(safeLocalStorageGet('kgcns_deleted_violation_ids') || '[]');
            if (Array.isArray(existingDeleted)) {
              deletedViolationIds = new Set(existingDeleted);
            }
          } catch {}

          const localViolations = Array.isArray(localStudent?.violationHandlingRecords) ? localStudent!.violationHandlingRecords : [];
          const serverViolations = Array.isArray(serverStudent.violationHandlingRecords) ? serverStudent.violationHandlingRecords : [];
          const vMap = new Map<string, ViolationHandlingRecord>();
          for (const v of localViolations) {
            if (v && (v.id || (v as any).violationId)) {
              const k = v.id || (v as any).violationId;
              if (deletedViolationIds.has(k)) continue;
              vMap.set(k, { ...v, id: k, violationId: k });
            }
          }
          for (const sv of serverViolations) {
            if (sv && (sv.id || (sv as any).violationId)) {
              const k = sv.id || (sv as any).violationId;
              if (deletedViolationIds.has(k)) continue;
              const existingV = vMap.get(k);
              if (!existingV) {
                vMap.set(k, { ...sv, id: k, violationId: k });
              } else {
                const combinedHistory = Array.from(new Set([
                  ...(existingV.history || []),
                  ...(sv.history || [])
                ].map(h => JSON.stringify(h)))).map(s => JSON.parse(s));
                vMap.set(k, {
                  ...existingV,
                  ...sv,
                  id: k,
                  violationId: k,
                  history: combinedHistory.length > 0 ? combinedHistory : (existingV.history || sv.history)
                });
              }
            }
          }
          const mergedViolations = Array.from(vMap.values()).sort((a, b) =>
            new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime()
          );

          if (localViolations.length > serverViolations.length) {
            studentRepositoryClient.updateStudent(serverStudent.id, {
              violationHandlingRecords: mergedViolations
            }).catch(() => {});
          }

          return {
            ...localStudent,
            ...serverStudent,
            parent: parentObj,
            graduationSummary: serverStudent.graduationSummary || localStudent?.graduationSummary,
            violationHandlingRecords: mergedViolations,
            studentActivationToken: studentToken,
            activationTokenStudent: studentToken,
            parentActivationToken: parentToken,
            activationTokenParent: parentToken,
            tokenStudentStatus: serverStudent.tokenStudentStatus || localStudent?.tokenStudentStatus || 'active',
            tokenParentStatus: serverStudent.tokenParentStatus || localStudent?.tokenParentStatus || 'active',
            tokenRevoked: serverStudent.tokenRevoked ?? localStudent?.tokenRevoked ?? false,
            status: serverStudent.status || localStudent?.status || 'Đang học'
          } as Student;
        });

        // Only retain local students if they explicitly belong to the current active tenant
        for (const localStudent of this.students) {
          if (!serverIds.has(localStudent.id) && (localStudent as any).tenantId === this.activeTenantId) {
            mergedStudents.push(localStudent);
          }
        }

        this.students = this.deduplicateStudents(mergedStudents);
        this.saveToStorage(this.activeTenantId, false); // save to cache without redundant server re-sync
        this.notify();
      }
    } catch (err) {
      console.warn('[StudentService] Server sync notice:', err);
    } finally {
      this.isFetching = false;
    }
  }

  public clearOnLogout(): void {
    this.students = [];
    this.notify();
  }

  private getDefaultStudentsForTenant(tenantId: string): Student[] {
    const normId = tenantService.normalizeTenantId(tenantId);
    if (normId === 'tenant-hoang-nam') {
      return [...initialTeacher2Students];
    }
    if (normId === 'tenant-lan-nguyen') {
      return [...initialStudents];
    }
    return [];
  }

  public reloadForActiveTenant(): void {
    this.activeTenantId = tenantService.getActiveTenantId();
    this.loadFromStorage(this.activeTenantId);
    this.notify();
    this.fetchFromServer();
  }

  private loadFromStorage(tenantId: string) {
    const tId = tenantService.normalizeTenantId(tenantId);
    try {
      const storageKey = tenantService.getTenantStorageKey('students', tId);
      const saved = safeLocalStorageGet(storageKey);

      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          this.students = this.deduplicateStudents(parsed);
        }
      } else {
        // Migration check for legacy un-scoped key (only for tenant-lan-nguyen)
        if (tId === 'tenant-lan-nguyen') {
          const legacy = safeLocalStorageGet('kgcns_students');
          if (legacy) {
            try {
              const parsedLegacy = JSON.parse(legacy);
              if (Array.isArray(parsedLegacy) && parsedLegacy.length > 0) {
                this.students = this.deduplicateStudents(parsedLegacy);
                safeLocalStorageSet(storageKey, JSON.stringify(this.students));
              } else {
                this.students = this.deduplicateStudents(this.getDefaultStudentsForTenant(tId));
              }
            } catch {
              this.students = this.deduplicateStudents(this.getDefaultStudentsForTenant(tId));
            }
          } else {
            this.students = this.deduplicateStudents(this.getDefaultStudentsForTenant(tId));
          }
        } else {
          this.students = this.deduplicateStudents(this.getDefaultStudentsForTenant(tId));
        }
      }
    } catch (err) {
      console.error('StudentService load error:', err);
      this.students = this.deduplicateStudents(this.getDefaultStudentsForTenant(tId));
    }
  }

  private generateDeterministicAnonymousCode(studentId: string, studentCode: string, index: number): string {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    const seedStr = `${studentId}-${studentCode}-${index}`;
    let hash = 5381;
    for (let i = 0; i < seedStr.length; i++) {
      hash = ((hash << 5) + hash) + seedStr.charCodeAt(i);
    }
    let res = 'HS-';
    let absHash = Math.abs(hash);
    for (let i = 0; i < 6; i++) {
      res += chars.charAt(absHash % chars.length);
      absHash = Math.floor(absHash / chars.length) + (i * 13) + 7;
    }
    return res;
  }

  private deduplicateStudents(list: Student[]): Student[] {
    const seenIds = new Set<string>();
    const seenAnonCodes = new Set<string>();

    const deduplicated = list.map((s, idx) => {
      let finalId = s.id;
      if (!finalId || seenIds.has(finalId)) {
        finalId = `hs-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`;
      }
      seenIds.add(finalId);

      let anonCode = s.anonymousCode;
      if (!anonCode || seenAnonCodes.has(anonCode)) {
        anonCode = this.generateDeterministicAnonymousCode(finalId, s.code || `code-${idx}`, idx);
      }
      seenAnonCodes.add(anonCode);

      const studentToken = s.studentActivationToken || s.activationTokenStudent || s.code;
      const parentToken = s.parentActivationToken || s.activationTokenParent || '';

      return {
        ...s,
        id: finalId,
        anonymousCode: anonCode,
        studentActivationToken: studentToken,
        activationTokenStudent: studentToken,
        parentActivationToken: parentToken,
        activationTokenParent: parentToken,
        tokenStudentStatus: s.tokenStudentStatus || (s.tokenRevoked ? 'revoked' : 'active'),
        tokenParentStatus: s.tokenParentStatus || (s.tokenRevoked ? 'revoked' : 'active'),
        tokenRevoked: s.tokenRevoked ?? (s.tokenStudentStatus === 'revoked' || false)
      };
    });

    return deduplicated;
  }

  public getStudentsForTenant(tenantId: string): Student[] {
    const tId = tenantService.normalizeTenantId(tenantId);
    if (tId === this.activeTenantId) {
      return [...this.students];
    }
    try {
      const storageKey = tenantService.getTenantStorageKey('students', tId);
      const saved = safeLocalStorageGet(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return this.deduplicateStudents(parsed);
        }
      }
    } catch {
      // ignore
    }
    return this.deduplicateStudents(this.getDefaultStudentsForTenant(tId));
  }

  public findStudentByTokenAcrossTenants(
    token: string
  ): { student: Student; tenantId: string; matchType: 'STUDENT' | 'PARENT' } | null {
    const cleanToken = token.trim().toUpperCase();
    if (!cleanToken) return null;

    const allTenants = tenantService.getTenants();
    for (const tenant of allTenants) {
      const tenantStudents = this.getStudentsForTenant(tenant.id);
      for (const s of tenantStudents) {
        const sToken1 = s.studentActivationToken?.trim().toUpperCase();
        const sToken2 = s.activationTokenStudent?.trim().toUpperCase();
        const sCode = s.code?.trim().toUpperCase();

        if (sToken1 === cleanToken || sToken2 === cleanToken || (sCode && sCode === cleanToken)) {
          return { student: s, tenantId: tenant.id, matchType: 'STUDENT' };
        }

        const pToken1 = s.parentActivationToken?.trim().toUpperCase();
        const pToken2 = s.activationTokenParent?.trim().toUpperCase();
        if (pToken1 === cleanToken || pToken2 === cleanToken) {
          return { student: s, tenantId: tenant.id, matchType: 'PARENT' };
        }
      }
    }
    return null;
  }

  private saveToStorage(tenantId?: string, _syncToServer: boolean = false) {
    const tId = tenantService.normalizeTenantId(tenantId || this.activeTenantId);
    try {
      const storageKey = tenantService.getTenantStorageKey('students', tId);
      safeLocalStorageSet(storageKey, JSON.stringify(this.students));
    } catch {
      // ignore
    }
    this.notify();
  }

  private getCurrentUserRole(): string {
    try {
      const sessionStr = safeLocalStorageGet('kgcns_auth_session');
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        if (session.role) return session.role;
      }
      return safeLocalStorageGet('kgcns_current_user_role') || 'STUDENT';
    } catch {
      return safeLocalStorageGet('kgcns_current_user_role') || 'STUDENT';
    }
  }

  private sanitizeForRole(studentList: Student[]): Student[] {
    const role = this.getCurrentUserRole();

    if (role === 'TEACHER' || role === 'SUPER_ADMIN') {
      return studentList;
    }

    // Strip sensitive teacher-only notes, special attention, and violation handling records for non-teacher roles
    return studentList.map(s => {
      const copy = { ...s };
      delete copy.privateTeacherNotes;
      delete copy.needsSpecialAttention;
      delete copy.attentionCategories;
      delete copy.attentionNote;
      delete copy.attentionStatus;
      delete copy.attentionStartedAt;
      delete copy.attentionUpdatedAt;
      delete copy.attentionUpdatedBy;
      delete copy.attentionEndedAt;
      delete copy.attentionWeekNumber;
      delete copy.attentionHistory;
      delete copy.violationHandlingRecords;
      return copy;
    });
  }

  public getAll(includeInternalOrOptions?: boolean | { includeArchived?: boolean; includeInternal?: boolean }): Student[] {
    let includeArchived = false;
    let includeInternal = false;

    if (typeof includeInternalOrOptions === 'boolean') {
      includeInternal = includeInternalOrOptions;
    } else if (typeof includeInternalOrOptions === 'object' && includeInternalOrOptions !== null) {
      includeArchived = !!includeInternalOrOptions.includeArchived;
      includeInternal = !!includeInternalOrOptions.includeInternal;
    }

    let result = [...this.students];

    // Filter out archived students by default unless explicitly requested
    if (!includeArchived) {
      result = result.filter(
        s => s.status !== 'ARCHIVED' && (s.status as any) !== 'Nghỉ học' && (s.status as any) !== 'Chuyển trường'
      );
    }

    if (includeInternal) {
      return result;
    }
    return this.sanitizeForRole(result);
  }

  public getStudents(): Student[] {
    return this.getAll();
  }

  public getById(id: string): Student | undefined {
    const s = this.students.find(item => item.id === id);
    if (!s) return undefined;
    return this.sanitizeForRole([s])[0];
  }

  public getStudentById(id: string): Student | undefined {
    return this.getById(id);
  }

  public getByGroup(group: number): Student[] {
    const activeList = this.students.filter(
      s => s.group === group && s.status !== 'ARCHIVED' && (s.status as any) !== 'Nghỉ học' && (s.status as any) !== 'Chuyển trường'
    );
    return this.sanitizeForRole(activeList);
  }

  public getSpecialAttentionStudents(): Student[] {
    const role = this.getCurrentUserRole();
    if (role !== 'TEACHER' && role !== 'SUPER_ADMIN') return [];
    return this.students.filter(
      s => s.needsSpecialAttention && s.status !== 'ARCHIVED' && (s.status as any) !== 'Nghỉ học' && (s.status as any) !== 'Chuyển trường'
    );
  }

  public addStudent(student: Omit<Student, 'id' | 'code' | 'studentActivationToken' | 'parentActivationToken'> & { id?: string; code?: string }): Student {
    const isTeacher2 = this.activeTenantId === 'tenant-hoang-nam';
    const activeCount = this.students.filter(s => s.status !== 'ARCHIVED').length;
    const randomCodeNum = String(activeCount + 1).padStart(2, '0');
    const classPrefix = isTeacher2 ? '12A2' : '11A1';
    const studentCode = student.code || `HV${classPrefix}${randomCodeNum}`;
    const randId = Math.random().toString(36).substring(2, 6).toUpperCase();
    const randSuffix = Math.random().toString(36).substring(2, 7);
    
    const newStudent: Student = {
      ...student,
      id: student.id || `hs-${Date.now()}-${randSuffix}`,
      code: studentCode,
      avatar: student.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      studentActivationToken: `STU-${randId}-${classPrefix}`,
      parentActivationToken: `PAR-${randId}-${classPrefix}`,
      activationTokenStudent: `STU-${randId}-${classPrefix}`,
      activationTokenParent: `PAR-${randId}-${classPrefix}`,
      tokenStudentStatus: 'active',
      tokenParentStatus: 'active',
      tokenRevoked: false,
      status: student.status || 'Đang học'
    };

    this.students.push(newStudent);
    this.students = this.deduplicateStudents(this.students);
    this.saveToStorage();

    // Async sync student profile to server
    studentRepositoryClient.createStudent(newStudent).catch(err => {
      console.warn('[StudentService] Error creating student on server:', err);
    });

    // Async sync persistent credentials to backend SQLite
    const tId = tenantService.normalizeTenantId(this.activeTenantId);
    authRepository.batchSaveCredentials({
      tenantId: tId,
      items: [
        {
          ownerId: newStudent.id,
          type: 'STUDENT',
          rawCode: newStudent.studentActivationToken!,
          isOfficer: Boolean(newStudent.officerRole),
          officerRoleTitle: newStudent.officerRole
        },
        {
          ownerId: newStudent.id,
          type: 'PARENT',
          rawCode: newStudent.parentActivationToken!
        }
      ],
      reason: `GVCN tạo học sinh mới ${newStudent.fullName}`
    }).catch(err => {
      console.warn('[StudentService] Error saving credentials on server:', err);
    });

    return newStudent;
  }

  public updateStudent(id: string, updates: Partial<Student>) {
    // Ensure studentId is strictly immutable
    const safeUpdates = { ...updates };
    delete safeUpdates.id;

    this.students = this.students.map(s => (s.id === id ? { ...s, ...safeUpdates } : s));
    this.saveToStorage();

    // Async sync to server
    studentRepositoryClient.updateStudent(id, safeUpdates).catch(err => {
      console.warn('[StudentService] Error updating student on server:', err);
    });
  }

  /**
   * Safe whitelist profile patch for student self-update / survey sync.
   */
  public updateStudentProfileByStudent(
    studentId: string,
    allowedUpdates: { phone?: string; talents?: string; conductRank?: string }
  ): boolean {
    const student = this.students.find(s => s.id === studentId);
    if (!student) return false;

    let modified = false;

    if (allowedUpdates.phone !== undefined && allowedUpdates.phone.trim() !== '') {
      student.phone = allowedUpdates.phone.trim();
      modified = true;
    }

    if (allowedUpdates.talents !== undefined && allowedUpdates.talents.trim() !== '') {
      student.talents = allowedUpdates.talents.trim();
      modified = true;
    }

    if (allowedUpdates.conductRank !== undefined && allowedUpdates.conductRank.trim() !== '') {
      student.conductRank = allowedUpdates.conductRank.trim();
      modified = true;
    }

    if (modified) {
      this.saveToStorage();
      studentRepositoryClient.updateStudent(studentId, {
        phone: student.phone,
        talents: student.talents,
        conductRank: student.conductRank
      }).catch(err => {
        console.warn('[StudentService] Error updating student profile on server:', err);
      });
    }
    return true;
  }

  /**
   * Safe sync of Graduation Exam status and scores into the student profile
   */
  public updateStudentGraduationSummary(studentId: string, gradData: any, syncToServer: boolean = false): boolean {
    const student = this.students.find(s => s.id === studentId || (gradData?.studentCode && s.code?.toLowerCase() === String(gradData.studentCode).trim().toLowerCase()));
    if (!student) return false;

    const cleanReasons = Array.isArray(gradData.flagReasons) ? gradData.flagReasons : [];
    const cleanNote = typeof gradData.teacherNote === 'string' ? gradData.teacherNote : '';
    student.graduationSummary = {
      electiveSubject1: gradData.electiveSubject1,
      electiveSubject2: gradData.electiveSubject2,
      isForeignLanguageExempt: !!gradData.isForeignLanguageExempt,
      scores: gradData.scores || {},
      gpa10: gradData.gpa10,
      gpa11: gradData.gpa11,
      gpa12: gradData.gpa12,
      gpaAllYears: gradData.gpaAllYears,
      priorityBonus: gradData.priorityBonus,
      encouragementBonus: gradData.encouragementBonus,
      calculatedScore: gradData.calculatedScore,
      status: gradData.status,
      statusReason: gradData.statusReason,
      isFlagged: Boolean(gradData.isFlagged || cleanNote.trim().length > 0 || cleanReasons.length > 0),
      flagReasons: cleanReasons,
      teacherNote: cleanNote,
      updatedAt: gradData.updatedAt || new Date().toLocaleDateString('vi-VN'),
      updatedBy: gradData.updatedBy || 'GVCN'
    };

    this.saveToStorage(this.activeTenantId);
    this.notify();

    if (syncToServer) {
      studentRepositoryClient.updateStudent(student.id, {
        graduationSummary: student.graduationSummary
      }).catch(err => {
        console.warn('[StudentService] Error syncing graduationSummary to server:', err);
      });
    }

    return true;
  }

  /**
   * Safe Teacher-Only Special Attention update triggered by GVCN approval
   */
  public updateStudentSpecialAttention(
    studentId: string,
    attentionData: {
      needsSpecialAttention: boolean;
      attentionCategories?: string[];
      attentionNote?: string;
      supportMeasure?: string;
      attentionStatus?: 'monitoring' | 'supporting' | 'improving' | 'resolved' | 'ended' | 'stable' | 'continued_support';
    }
  ): boolean {
    const student = this.students.find(s => s.id === studentId);
    if (!student) return false;

    student.needsSpecialAttention = attentionData.needsSpecialAttention;
    if (attentionData.attentionCategories) {
      student.attentionCategories = attentionData.attentionCategories;
    }
    if (attentionData.attentionNote !== undefined) {
      student.attentionNote = attentionData.attentionNote;
    }
    if (attentionData.supportMeasure !== undefined) {
      student.supportMeasure = attentionData.supportMeasure;
    }
    if (attentionData.attentionStatus) {
      student.attentionStatus = attentionData.attentionStatus;
    }
    student.attentionUpdatedAt = new Date().toLocaleString('vi-VN');
    this.saveToStorage();

    studentRepositoryClient.updateStudent(studentId, {
      needsSpecialAttention: student.needsSpecialAttention,
      attentionCategories: student.attentionCategories,
      attentionNote: student.attentionNote,
      supportMeasure: student.supportMeasure,
      attentionStatus: student.attentionStatus
    }).catch(err => {
      console.warn('[StudentService] Error updating special attention on server:', err);
    });

    return true;
  }

  /**
   * Record GVCN monitoring entry for a student in a specific study week
   * Idempotent & non-duplicative per student/week. Synchronizes with 'Học viên cần quan tâm'.
   */
  public recordStudentAttention(params: {
    studentId: string;
    weekNumber: number;
    weekLabel?: string;
    schoolYear?: string;
    violationsCount: number;
    violationDetails?: Array<{
      date: string;
      category?: string;
      reason: string;
      points?: number;
    }>;
    teacherNote: string;
    categories: string[];
    supportMeasure: string;
    status: AttentionStatus;
    saveToSpecialAttention: boolean;
    actorName?: string;
    nextReviewDate?: string;
  }): boolean {
    const student = this.students.find(s => s.id === params.studentId);
    if (!student) return false;

    const nowVN = new Date();
    const nowStr = nowVN.toLocaleDateString('vi-VN') + ' ' + nowVN.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const sYear = params.schoolYear || '2025 - 2026';
    const entryId = `att-hist-${params.studentId}-w${params.weekNumber}-${sYear.replace(/\s+/g, '')}`;

    const newHistoryEntry: AttentionHistoryEntry = {
      id: entryId,
      weekNumber: params.weekNumber,
      weekLabel: params.weekLabel || `Tuần ${params.weekNumber}`,
      schoolYear: sYear,
      recordedAt: nowStr,
      violationsCount: params.violationsCount,
      violationDetails: params.violationDetails || [],
      teacherNote: params.teacherNote,
      categories: params.categories,
      supportMeasure: params.supportMeasure,
      status: params.status,
      recordedBy: params.actorName || 'GVCN',
      nextReviewDate: params.nextReviewDate,
      endedAt: (params.status === 'ended' || params.status === 'stopped' || params.status === 'resolved') ? nowStr : undefined
    };

    const existingHistory = Array.isArray(student.attentionHistory) ? [...student.attentionHistory] : [];
    const existingIndex = existingHistory.findIndex(
      h => h.weekNumber === params.weekNumber && (h.schoolYear === sYear || !h.schoolYear)
    );

    if (existingIndex >= 0) {
      existingHistory[existingIndex] = {
        ...existingHistory[existingIndex],
        ...newHistoryEntry
      };
    } else {
      existingHistory.unshift(newHistoryEntry);
    }
    student.attentionHistory = existingHistory;

    // Checkbox: "Lưu vào Học viên cần quan tâm"
    if (params.saveToSpecialAttention) {
      student.needsSpecialAttention = true;
      student.attentionCategories = params.categories;
      student.attentionNote = params.teacherNote;
      student.supportMeasure = params.supportMeasure;
      student.attentionStatus = params.status;
      student.attentionWeekNumber = params.weekNumber;
      if (!student.attentionStartedAt) {
        student.attentionStartedAt = nowVN.toLocaleDateString('vi-VN');
      }
      student.attentionUpdatedAt = nowStr;
      student.attentionUpdatedBy = params.actorName || 'GVCN';
      if (params.status === 'ended' || params.status === 'stopped' || params.status === 'resolved') {
        student.attentionEndedAt = nowVN.toLocaleDateString('vi-VN');
      } else {
        student.attentionEndedAt = undefined;
      }
    } else {
      // If not checked, but student was already in special attention, update status/notes without removing profile
      if (student.needsSpecialAttention) {
        student.attentionCategories = params.categories;
        student.attentionNote = params.teacherNote;
        student.supportMeasure = params.supportMeasure;
        student.attentionStatus = params.status;
        student.attentionUpdatedAt = nowStr;
        student.attentionUpdatedBy = params.actorName || 'GVCN';
      }
    }

    this.saveToStorage();

    // Async sync to server
    studentRepositoryClient.updateStudent(params.studentId, {
      needsSpecialAttention: student.needsSpecialAttention,
      attentionCategories: student.attentionCategories,
      attentionNote: student.attentionNote,
      supportMeasure: student.supportMeasure,
      attentionStatus: student.attentionStatus
    }).catch(err => {
      console.warn('[StudentService] Error syncing attention to server:', err);
    });

    return true;
  }

  /**
   * Stop monitoring a student.
   * STRICT GUARANTEE: Never deletes student, record, notes, measures, violations, or history.
   * Only transitions tracking status to 'ended'.
   */
  public stopStudentAttention(studentId: string, actorName: string = 'GVCN', reason?: string): boolean {
    const student = this.students.find(s => s.id === studentId);
    if (!student) return false;

    const nowVN = new Date();
    const nowStr = nowVN.toLocaleDateString('vi-VN') + ' ' + nowVN.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const todayDate = nowVN.toLocaleDateString('vi-VN');

    student.attentionStatus = 'ended';
    student.attentionEndedAt = todayDate;
    student.attentionUpdatedAt = nowStr;
    student.attentionUpdatedBy = actorName;
    if (reason && reason.trim()) {
      student.attentionNote = student.attentionNote
        ? `${student.attentionNote}\n[Ngừng theo dõi ${todayDate}]: ${reason.trim()}`
        : `[Ngừng theo dõi ${todayDate}]: ${reason.trim()}`;
    }

    // Keep history intact, update latest status
    if (student.attentionHistory && student.attentionHistory.length > 0) {
      student.attentionHistory[0].status = 'ended';
      student.attentionHistory[0].endedAt = nowStr;
    }

    this.saveToStorage();

    studentRepositoryClient.updateStudent(studentId, {
      attentionStatus: 'ended',
      attentionNote: student.attentionNote
    }).catch(() => {});

    return true;
  }

  /**
   * Add a new support history episode (đợt hỗ trợ & theo dõi) to the student's profile.
   * Guarantees long-term preservation without deleting student records or previous episodes.
   */
  public addSupportHistoryEpisode(studentId: string, episode: Omit<AttentionHistoryEntry, 'id' | 'recordedAt'>): boolean {
    const student = this.students.find(s => s.id === studentId);
    if (!student) return false;

    const nowVN = new Date();
    const nowStr = nowVN.toLocaleDateString('vi-VN') + ' ' + nowVN.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const todayDate = nowVN.toLocaleDateString('vi-VN');

    const newEntry: AttentionHistoryEntry = {
      ...episode,
      id: `att-ep-${studentId}-${Date.now()}`,
      recordedAt: nowStr,
      startDate: episode.startDate || todayDate,
      categories: episode.categories || ['Học tập'],
      status: episode.status || 'monitoring'
    };

    const existingHistory = Array.isArray(student.attentionHistory) ? [...student.attentionHistory] : [];
    existingHistory.unshift(newEntry);
    student.attentionHistory = existingHistory;

    // Update active fields on student profile
    student.needsSpecialAttention = true;
    if (episode.status) {
      student.attentionStatus = episode.status;
      if (episode.status === 'resolved' || episode.status === 'ended' || episode.status === 'stopped') {
        student.attentionEndedAt = todayDate;
      } else {
        student.attentionEndedAt = undefined;
      }
    }
    if (episode.supportMeasure) {
      student.supportMeasure = episode.supportMeasure;
    }
    if (episode.categories && episode.categories.length > 0) {
      student.attentionCategories = episode.categories;
    }
    if (episode.teacherNote || episode.teacherAnalysis) {
      student.attentionNote = episode.teacherNote || episode.teacherAnalysis || student.attentionNote;
    }
    student.attentionUpdatedAt = nowStr;
    student.attentionUpdatedBy = episode.recordedBy || 'GVCN';
    if (!student.attentionStartedAt) {
      student.attentionStartedAt = episode.startDate || todayDate;
    }

    this.saveToStorage();

    studentRepositoryClient.updateStudent(studentId, {
      needsSpecialAttention: true,
      attentionCategories: student.attentionCategories,
      attentionNote: student.attentionNote,
      supportMeasure: student.supportMeasure,
      attentionStatus: student.attentionStatus
    }).catch(err => {
      console.warn('[StudentService] Error syncing support episode to server:', err);
    });

    this.notify();
    return true;
  }

  /**
   * Update an existing support history episode (e.g. 1-week review, status change to resolved, etc.)
   * NEVER deletes the episode or history, even when status is 'resolved' (Đã hoàn tất hỗ trợ).
   */
  public updateSupportHistoryEpisode(studentId: string, episodeId: string, updates: Partial<AttentionHistoryEntry>): boolean {
    const student = this.students.find(s => s.id === studentId);
    if (!student) return false;

    const existingHistory = Array.isArray(student.attentionHistory) ? [...student.attentionHistory] : [];
    const idx = existingHistory.findIndex(e => e.id === episodeId);
    if (idx === -1) return false;

    const nowVN = new Date();
    const nowStr = nowVN.toLocaleDateString('vi-VN') + ' ' + nowVN.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const todayDate = nowVN.toLocaleDateString('vi-VN');

    const updated: AttentionHistoryEntry = {
      ...existingHistory[idx],
      ...updates,
      endedAt: (updates.status === 'resolved' || updates.status === 'ended' || updates.status === 'stopped')
        ? (existingHistory[idx].endedAt || todayDate)
        : undefined
    };

    existingHistory[idx] = updated;
    student.attentionHistory = existingHistory;

    // If the updated episode is the latest one, reflect changes on student profile
    if (idx === 0) {
      if (updates.status) {
        student.attentionStatus = updates.status;
        if (updates.status === 'resolved' || updates.status === 'ended' || updates.status === 'stopped') {
          student.attentionEndedAt = todayDate;
        } else {
          student.attentionEndedAt = undefined;
        }
      }
      if (updates.supportMeasure) {
        student.supportMeasure = updates.supportMeasure;
      }
      if (updates.teacherNote || updates.teacherAnalysis) {
        student.attentionNote = updates.teacherNote || updates.teacherAnalysis || student.attentionNote;
      }
    }

    student.attentionUpdatedAt = nowStr;
    this.saveToStorage();

    studentRepositoryClient.updateStudent(studentId, {
      needsSpecialAttention: student.needsSpecialAttention,
      attentionCategories: student.attentionCategories,
      attentionNote: student.attentionNote,
      supportMeasure: student.supportMeasure,
      attentionStatus: student.attentionStatus
    }).catch(err => {
      console.warn('[StudentService] Error syncing support episode update to server:', err);
    });

    this.notify();
    return true;
  }

  /**
   * Resume active monitoring for a student previously stopped
   */
  public resumeStudentAttention(studentId: string, actorName: string = 'GVCN'): boolean {
    const student = this.students.find(s => s.id === studentId);
    if (!student) return false;

    const nowVN = new Date();
    const nowStr = nowVN.toLocaleDateString('vi-VN') + ' ' + nowVN.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    student.needsSpecialAttention = true;
    student.attentionStatus = 'monitoring';
    student.attentionEndedAt = undefined;
    student.attentionUpdatedAt = nowStr;
    student.attentionUpdatedBy = actorName;

    this.saveToStorage();

    studentRepositoryClient.updateStudent(studentId, {
      needsSpecialAttention: true,
      attentionStatus: 'monitoring'
    }).catch(() => {});

    return true;
  }

  /**
   * Soft-archive / delete a student.
   */
  public archiveStudent(id: string) {
    this.students = this.students.map(s => {
      if (s.id === id) {
        return {
          ...s,
          status: 'ARCHIVED',
          officerRole: undefined,
          tokenRevoked: true,
          tokenStudentStatus: 'revoked',
          tokenParentStatus: 'revoked'
        };
      }
      return s;
    });
    this.saveToStorage();

    studentRepositoryClient.archiveStudent(id).catch(err => {
      console.warn('[StudentService] Error archiving student on server:', err);
    });
  }

  public deleteStudent(id: string) {
    this.archiveStudent(id);
  }

  public regenerateTokens(id: string): { studentToken: string; parentToken: string } | null {
    const isTeacher2 = this.activeTenantId === 'tenant-hoang-nam';
    const classPrefix = isTeacher2 ? '12A2' : '11A1';
    const randId = Math.random().toString(36).substring(2, 6).toUpperCase();
    const studentToken = `STU-${randId}-${classPrefix}`;
    const parentToken = `PAR-${randId}-${classPrefix}`;
    
    const student = this.students.find(s => s.id === id);
    if (!student) return null;

    student.studentActivationToken = studentToken;
    student.parentActivationToken = parentToken;
    student.activationTokenStudent = studentToken;
    student.activationTokenParent = parentToken;
    student.tokenStudentStatus = 'active';
    student.tokenParentStatus = 'active';
    student.tokenRevoked = false;
    this.saveToStorage();

    // Persist hash to backend CredentialRepository
    const tId = tenantService.normalizeTenantId(this.activeTenantId);
    authRepository.batchSaveCredentials({
      tenantId: tId,
      items: [
        {
          ownerId: student.id,
          type: 'STUDENT',
          rawCode: studentToken,
          isOfficer: Boolean(student.officerRole),
          officerRoleTitle: student.officerRole
        },
        {
          ownerId: student.id,
          type: 'PARENT',
          rawCode: parentToken
        }
      ],
      reason: `GVCN cấp lại mã cho học sinh ${student.fullName}`
    }).catch(err => {
      console.warn('[StudentService] Failed to persist regenerated credential on server:', err);
    });

    return { studentToken, parentToken };
  }

  public async syncAllCredentialsToServer(): Promise<{ count: number }> {
    const tId = tenantService.normalizeTenantId(this.activeTenantId);
    const activeStudents = this.students.filter(s => s.status !== 'ARCHIVED');
    const items: Array<{
      ownerId: string;
      type: 'STUDENT' | 'PARENT';
      rawCode: string;
      isOfficer?: boolean;
      officerRoleTitle?: string;
    }> = [];

    for (const student of activeStudents) {
      const studentToken = student.studentActivationToken || student.activationTokenStudent || student.code;
      const parentToken = student.parentActivationToken || student.activationTokenParent || `PAR-${student.id.slice(-4).toUpperCase()}`;
      
      if (studentToken) {
        items.push({
          ownerId: student.id,
          type: 'STUDENT',
          rawCode: studentToken,
          isOfficer: Boolean(student.officerRole),
          officerRoleTitle: student.officerRole
        });
      }
      if (parentToken) {
        items.push({
          ownerId: student.id,
          type: 'PARENT',
          rawCode: parentToken
        });
      }
    }

    if (items.length > 0) {
      await authRepository.batchSaveCredentials({
        tenantId: tId,
        items,
        reason: `GVCN lưu và đồng bộ ${items.length} mã truy cập toàn lớp`
      });
    }

    return { count: items.length };
  }

  public async saveSingleStudentCredential(
    studentId: string, 
    studentToken: string, 
    parentToken: string
  ): Promise<boolean> {
    const student = this.students.find(s => s.id === studentId);
    if (!student) return false;

    student.studentActivationToken = studentToken.trim();
    student.activationTokenStudent = studentToken.trim();
    student.parentActivationToken = parentToken.trim();
    student.activationTokenParent = parentToken.trim();
    student.tokenStudentStatus = 'active';
    student.tokenParentStatus = 'active';
    student.tokenRevoked = false;
    this.saveToStorage();

    const tId = tenantService.normalizeTenantId(this.activeTenantId);
    await authRepository.batchSaveCredentials({
      tenantId: tId,
      items: [
        {
          ownerId: student.id,
          type: 'STUDENT',
          rawCode: student.studentActivationToken,
          isOfficer: Boolean(student.officerRole),
          officerRoleTitle: student.officerRole
        },
        {
          ownerId: student.id,
          type: 'PARENT',
          rawCode: student.parentActivationToken
        }
      ],
      reason: `GVCN cập nhật và lưu mã truy cập cho học sinh ${student.fullName}`
    });

    return true;
  }

  public toggleTokenStatus(id: string, type: 'student' | 'parent', targetStatus?: 'active' | 'revoked' | 'pending') {
    const student = this.students.find(s => s.id === id);
    if (!student) return;

    const tId = tenantService.normalizeTenantId(this.activeTenantId);

    if (type === 'student') {
      const current = student.tokenStudentStatus || (student.tokenRevoked ? 'revoked' : 'active');
      const next = targetStatus || (current === 'active' ? 'revoked' : 'active');
      student.tokenStudentStatus = next;
      if (next === 'active') {
        student.tokenRevoked = false;
      }
      authRepository.toggleCredentialLock({
        tenantId: tId,
        ownerId: student.id,
        type: 'STUDENT',
        status: next === 'active' ? 'ACTIVE' : 'LOCKED',
        reason: next === 'active' ? 'GVCN mở khóa mã đăng nhập' : 'GVCN tạm khóa mã đăng nhập'
      }).catch(err => {
        console.warn('[StudentService] Failed to sync student token status to server:', err);
      });
    } else {
      const current = student.tokenParentStatus || (student.tokenRevoked ? 'revoked' : 'active');
      const next = targetStatus || (current === 'active' ? 'revoked' : 'active');
      student.tokenParentStatus = next;
      authRepository.toggleCredentialLock({
        tenantId: tId,
        ownerId: student.id,
        type: 'PARENT',
        status: next === 'active' ? 'ACTIVE' : 'LOCKED',
        reason: next === 'active' ? 'GVCN mở khóa mã đăng nhập' : 'GVCN tạm khóa mã đăng nhập'
      }).catch(err => {
        console.warn('[StudentService] Failed to sync parent token status to server:', err);
      });
    }

    this.saveToStorage();
  }

  public getAccessCredentials() {
    const students = this.getAll(true);
    return students.map(s => ({
      studentId: s.id,
      studentCode: s.code,
      fullName: s.fullName,
      group: s.group,
      officerRole: s.officerRole,
      studentToken: s.studentActivationToken || s.activationTokenStudent || s.code,
      studentTokenStatus: s.tokenStudentStatus || (s.tokenRevoked ? 'revoked' : 'active'),
      parentName: s.parent?.fatherName ? `Bác ${s.parent.fatherName}` : s.parent?.motherName ? `Cô ${s.parent.motherName}` : `PH em ${s.fullName}`,
      parentPhone: s.parent?.fatherPhone || s.parent?.motherPhone || '',
      parentToken: s.parentActivationToken || s.activationTokenParent || '',
      parentTokenStatus: s.tokenParentStatus || (s.tokenRevoked ? 'revoked' : 'active')
    }));
  }

  public updateParentInfo(id: string, parentInfo: ParentInfo) {
    const student = this.students.find(s => s.id === id);
    if (student) {
      student.parent = { ...student.parent, ...parentInfo };
      this.saveToStorage();
      studentRepositoryClient.updateStudent(id, { parent: student.parent }).catch(err => {
        console.warn('[StudentService] Error updating parent info on server:', err);
      });
    }
  }

  public saveAllStudents(newStudents: Student[]) {
    this.students = this.deduplicateStudents([...newStudents]);
    this.saveToStorage();
  }

  public regenerateAllTokens() {
    const isTeacher2 = this.activeTenantId === 'tenant-hoang-nam';
    const classPrefix = isTeacher2 ? '12A2' : '11A1';
    const tId = tenantService.normalizeTenantId(this.activeTenantId);
    const batchItems: Array<{
      ownerId: string;
      type: 'STUDENT' | 'PARENT';
      rawCode: string;
      isOfficer?: boolean;
      officerRoleTitle?: string;
    }> = [];

    this.students.forEach(s => {
      const randId = Math.random().toString(36).substring(2, 6).toUpperCase();
      const sToken = `STU-${randId}-${classPrefix}`;
      const pToken = `PAR-${randId}-${classPrefix}`;
      s.studentActivationToken = sToken;
      s.parentActivationToken = pToken;
      s.activationTokenStudent = sToken;
      s.activationTokenParent = pToken;
      s.tokenStudentStatus = 'active';
      s.tokenParentStatus = 'active';
      s.tokenRevoked = false;

      batchItems.push({
        ownerId: s.id,
        type: 'STUDENT',
        rawCode: sToken,
        isOfficer: Boolean(s.officerRole),
        officerRoleTitle: s.officerRole
      });
      batchItems.push({
        ownerId: s.id,
        type: 'PARENT',
        rawCode: pToken
      });
    });

    this.saveToStorage();

    if (batchItems.length > 0) {
      authRepository.batchSaveCredentials({
        tenantId: tId,
        items: batchItems,
        reason: 'GVCN tạo mới toàn bộ mã kích hoạt cho tập thể lớp'
      }).catch(err => {
        console.warn('[StudentService] Failed to batch save credentials on server:', err);
      });
    }
  }

  public importStudents(students: Array<any>) {
    return this.importStudentsBatch(students);
  }

  public importStudentsBatch(rawList: Array<Partial<Student>>): {
    imported: number;
    skipped: number;
    errors: string[];
    duplicates: string[];
  } {
    const errors: string[] = [];
    const duplicates: string[] = [];
    const isTeacher2 = this.activeTenantId === 'tenant-hoang-nam';
    const classPrefix = isTeacher2 ? '12A2' : '11A1';
    const tId = tenantService.normalizeTenantId(this.activeTenantId);

    const existingCodes = new Set(this.students.map(s => s.code.trim().toUpperCase()));
    const batchCodes = new Set<string>();
    const newlyAdded: Student[] = [];
    const batchCredentials: Array<{
      ownerId: string;
      type: 'STUDENT' | 'PARENT';
      rawCode: string;
      isOfficer?: boolean;
      officerRoleTitle?: string;
    }> = [];

    rawList.forEach((item, index) => {
      const rowNum = index + 1;
      if (!item.fullName || item.fullName.trim().length === 0) {
        errors.push(`Dòng ${rowNum}: Thiếu Họ và tên học sinh.`);
        return;
      }

      const rawCode = item.code ? String(item.code).trim() : '';
      if (!rawCode) {
        errors.push(`Dòng ${rowNum}: Thiếu Mã học sinh (${item.fullName}).`);
        return;
      }

      const upperCode = rawCode.toUpperCase();
      if (existingCodes.has(upperCode)) {
        duplicates.push(`${rawCode} (${item.fullName})`);
        return;
      }

      if (batchCodes.has(upperCode)) {
        duplicates.push(`${rawCode} (Trùng lặp trong tệp Excel)`);
        return;
      }

      batchCodes.add(upperCode);
      existingCodes.add(upperCode);

      const gender = (item.gender === 'Nữ' || (item.gender as string) === 'Nu') ? 'Nữ' : 'Nam';
      const randId = Math.random().toString(36).substring(2, 6).toUpperCase();
      const randSuffix = Math.random().toString(36).substring(2, 7);
      const studentToken = `STU-${randId}-${classPrefix}`;
      const parentToken = `PAR-${randId}-${classPrefix}`;
      const studentId = item.id || `hs-${Date.now()}-${index}-${randSuffix}`;
      const anonCode = item.anonymousCode || this.generateDeterministicAnonymousCode(studentId, rawCode, index);

      const newStudent: Student = {
        id: studentId,
        code: rawCode,
        anonymousCode: anonCode,
        fullName: item.fullName.trim(),
        gender,
        dob: item.dob || '01/01/2008',
        group: Number(item.group) || 1,
        officerRole: item.officerRole || undefined,
        avatar: item.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
        phone: item.phone || '',
        email: item.email || '',
        address: item.address || 'TP. Hồ Chí Minh',
        parent: item.parent || {
          fatherName: item.fatherName || item.parent?.fatherName || '',
          fatherPhone: item.fatherPhone || item.parent?.fatherPhone || '',
          motherName: item.motherName || item.parent?.motherName || '',
          motherPhone: item.motherPhone || item.parent?.motherPhone || '',
          address: item.address || item.parent?.address || 'TP. Hồ Chí Minh',
          zaloConnected: true
        },
        studentActivationToken: studentToken,
        parentActivationToken: parentToken,
        activationTokenStudent: studentToken,
        activationTokenParent: parentToken,
        tokenStudentStatus: 'active',
        tokenParentStatus: 'active',
        tokenRevoked: false,
        status: 'Đang học'
      };

      this.students.push(newStudent);
      newlyAdded.push(newStudent);

      batchCredentials.push({
        ownerId: newStudent.id,
        type: 'STUDENT',
        rawCode: studentToken,
        isOfficer: Boolean(newStudent.officerRole),
        officerRoleTitle: newStudent.officerRole
      });
      batchCredentials.push({
        ownerId: newStudent.id,
        type: 'PARENT',
        rawCode: parentToken
      });
    });

    if (newlyAdded.length > 0) {
      this.students = this.deduplicateStudents(this.students);
      this.saveToStorage();

      // Batch sync to server database
      studentRepositoryClient.batchImportStudents(newlyAdded).catch(err => {
        console.warn('[StudentService] Server batch import sync notice:', err);
      });

      // Batch sync credentials to server
      if (batchCredentials.length > 0) {
        authRepository.batchSaveCredentials({
          tenantId: tId,
          items: batchCredentials,
          reason: 'Cấp mã truy cập theo danh sách nhập khẩu Excel'
        }).catch(err => {
          console.warn('[StudentService] Server credential sync notice:', err);
        });
      }
    }

    return {
      imported: newlyAdded.length,
      skipped: duplicates.length,
      errors,
      duplicates
    };
  }

  public addViolationHandlingRecord(
    studentId: string,
    record: Omit<ViolationHandlingRecord, 'id' | 'createdAt'>
  ): boolean {
    const student = this.students.find(s => s.id === studentId);
    if (!student) return false;

    const cSettings = classService.getSettings();
    const currentAcademicYear = cSettings.academicYear || cSettings.schoolYearLabel || '2025 - 2026';
    const currentClassName = cSettings.className || '11A1';
    const currentClassId = cSettings.id || cSettings.classId || 'class-11a1-2025';
    const currentTenantId = student.tenantId || this.activeTenantId || 'tenant-lan-nguyen';
    const nowIso = new Date().toISOString();
    const violationId = `vh-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const newRecord: ViolationHandlingRecord = {
      ...record,
      id: violationId,
      violationId,
      studentId,
      studentName: student.fullName,
      tenantId: currentTenantId,
      classId: currentClassId,
      className: record.className || currentClassName,
      schoolYear: record.schoolYear || currentAcademicYear,
      academicYear: record.academicYear || record.schoolYear || currentAcademicYear,
      date: record.date || nowIso.split('T')[0],
      time: record.time || undefined,
      weekNumber: record.weekNumber,
      content: record.content ? record.content.trim() : 'Vi phạm nề nếp',
      category: record.category || 'Nề nếp & Tác phong',
      severity: record.severity || 'Vừa',
      frequencyCount: record.frequencyCount || 1,
      educationalMeasure: record.educationalMeasure?.trim() || undefined,
      studentExchangeNotes: record.studentExchangeNotes?.trim() || undefined,
      parentCoordinationNotes: record.parentCoordinationNotes?.trim() || undefined,
      handlingResult: record.handlingResult?.trim() || undefined,
      handlingContent: record.handlingResult?.trim() || record.handlingContent?.trim() || record.educationalMeasure?.trim() || undefined,
      status: record.status || 'PROCESSING',
      teacherNotes: record.teacherNotes?.trim() || undefined,
      recordedBy: record.recordedBy?.trim() || 'Giáo viên chủ nhiệm',
      recordedAt: record.recordedAt || nowIso,
      handledBy: (record.status === 'RESOLVED' || record.status === 'PROCESSING' || record.educationalMeasure || record.handlingResult)
        ? (record.handledBy?.trim() || 'Giáo viên chủ nhiệm')
        : undefined,
      handledAt: (record.status === 'RESOLVED' || record.status === 'PROCESSING' || record.educationalMeasure || record.handlingResult)
        ? (record.handledAt || nowIso)
        : undefined,
      createdAt: nowIso,
      updatedAt: nowIso,
      history: Array.isArray(record.history) && record.history.length > 0 ? record.history : [
        {
          timestamp: nowIso,
          action: record.status === 'RESOLVED'
            ? 'Ghi nhận và xác nhận đã xử lý hoàn tất'
            : record.educationalMeasure
            ? 'Ghi nhận vi phạm và áp dụng biện pháp xử lý'
            : 'Ghi nhận hồ sơ vi phạm',
          status: record.status || 'PROCESSING',
          notes: record.handlingResult || record.educationalMeasure || record.teacherNotes || record.content,
          actorName: record.recordedBy || 'Giáo viên chủ nhiệm',
          handledAt: (record.status === 'RESOLVED' || record.educationalMeasure || record.handlingResult) ? nowIso : undefined,
          educationalMeasure: record.educationalMeasure?.trim() || undefined,
          handlingResult: record.handlingResult?.trim() || undefined,
          studentExchangeNotes: record.studentExchangeNotes?.trim() || undefined,
          parentCoordinationNotes: record.parentCoordinationNotes?.trim() || undefined,
          teacherNotes: record.teacherNotes?.trim() || undefined
        }
      ]
    };

    if (!Array.isArray(student.violationHandlingRecords)) {
      student.violationHandlingRecords = [];
    }

    // PREPEND: Tạo bản ghi riêng biệt độc lập, không ghi đè bất kỳ bản ghi cũ nào!
    student.violationHandlingRecords.unshift(newRecord);
    this.saveToStorage();

    // Đồng bộ lên SQLite máy chủ
    studentRepositoryClient.updateStudent(studentId, {
      violationHandlingRecords: student.violationHandlingRecords
    }).catch(err => {
      console.warn('[StudentService] Server violation sync notice:', err);
    });

    this.notify();
    return true;
  }

  public updateViolationHandlingRecord(
    studentId: string,
    recordId: string,
    updates: Partial<ViolationHandlingRecord>,
    actionDescription?: string
  ): boolean {
    const student = this.students.find(s => s.id === studentId);
    if (!student || !Array.isArray(student.violationHandlingRecords)) return false;

    const idx = student.violationHandlingRecords.findIndex(r => r.id === recordId || (r as any).violationId === recordId);
    if (idx === -1) return false;

    const existing = student.violationHandlingRecords[idx];
    const now = new Date().toISOString();

    const isNowResolved = updates.status === 'RESOLVED';
    const isNowProcessing = updates.status === 'PROCESSING';

    const historyEntry = {
      timestamp: now,
      action: actionDescription || (updates.status && updates.status !== existing.status
        ? `Cập nhật trạng thái thành: ${updates.status === 'WARNING' ? 'Cảnh báo' : updates.status === 'PROCESSING' ? 'Đang xử lý' : 'Đã ổn định'}`
        : updates.educationalMeasure && updates.educationalMeasure !== existing.educationalMeasure
        ? 'Cập nhật biện pháp giáo dục / xử lý'
        : updates.handlingResult && updates.handlingResult !== existing.handlingResult
        ? 'Cập nhật kết quả xử lý'
        : 'Cập nhật tiến trình xử lý'),
      notes: updates.handlingResult || updates.teacherNotes || updates.studentExchangeNotes || updates.parentCoordinationNotes || updates.educationalMeasure || updates.handlingContent,
      status: updates.status || existing.status,
      actorName: updates.handledBy || 'Giáo viên chủ nhiệm',
      handledAt: (isNowResolved || isNowProcessing || updates.handlingResult || updates.educationalMeasure) ? (updates.handledAt || now) : existing.handledAt,
      educationalMeasure: updates.educationalMeasure || existing.educationalMeasure,
      handlingResult: updates.handlingResult || existing.handlingResult,
      studentExchangeNotes: updates.studentExchangeNotes || existing.studentExchangeNotes,
      parentCoordinationNotes: updates.parentCoordinationNotes || existing.parentCoordinationNotes,
      teacherNotes: updates.teacherNotes || existing.teacherNotes
    };

    student.violationHandlingRecords[idx] = {
      ...existing,
      ...updates,
      id: existing.id,
      violationId: existing.id,
      studentId: existing.studentId,
      handledBy: (isNowResolved || isNowProcessing || updates.handlingResult || updates.educationalMeasure)
        ? (updates.handledBy || existing.handledBy || 'Giáo viên chủ nhiệm')
        : existing.handledBy,
      handledAt: (isNowResolved || isNowProcessing || updates.handlingResult || updates.educationalMeasure)
        ? (updates.handledAt || existing.handledAt || now)
        : existing.handledAt,
      handlingContent: updates.handlingResult || updates.handlingContent || existing.handlingContent || updates.educationalMeasure,
      updatedAt: now,
      history: [...(existing.history || []), historyEntry]
    };

    this.saveToStorage();

    // Đồng bộ lên SQLite máy chủ
    studentRepositoryClient.updateStudent(studentId, {
      violationHandlingRecords: student.violationHandlingRecords
    }).catch(err => {
      console.warn('[StudentService] Server violation update sync notice:', err);
    });

    this.notify();
    return true;
  }

  public deleteViolationHandlingRecord(studentId: string, recordId: string): boolean {
    const student = this.students.find(s => s.id === studentId);
    if (!student || !Array.isArray(student.violationHandlingRecords)) return false;

    const initialLength = student.violationHandlingRecords.length;
    student.violationHandlingRecords = student.violationHandlingRecords.filter(
      r => r.id !== recordId && (r as any).violationId !== recordId
    );
    if (student.violationHandlingRecords.length === initialLength) return false;

    // Record tombstone so background server re-sync will not resurrect this record
    try {
      const deletedKey = 'kgcns_deleted_violation_ids';
      const existingDeleted = JSON.parse(safeLocalStorageGet(deletedKey) || '[]');
      if (Array.isArray(existingDeleted) && !existingDeleted.includes(recordId)) {
        existingDeleted.push(recordId);
        safeLocalStorageSet(deletedKey, JSON.stringify(existingDeleted));
      }
    } catch {}

    this.saveToStorage();

    // Đồng bộ lên SQLite máy chủ
    studentRepositoryClient.updateStudent(studentId, {
      violationHandlingRecords: student.violationHandlingRecords
    }).catch(err => {
      console.warn('[StudentService] Server violation delete sync notice:', err);
    });

    this.notify();
    return true;
  }

  public getStudentViolationHandling(studentId: string): ViolationHandlingRecord[] {
    const student = this.students.find(s => s.id === studentId);
    return student?.violationHandlingRecords || [];
  }

  /**
   * Lấy toàn bộ bản ghi vi phạm của học viên trong năm học chỉ định (hoặc năm học hiện tại)
   */
  public getStudentViolationRecords(studentId: string, targetAcademicYear?: string): ViolationHandlingRecord[] {
    const student = this.students.find(s => s.id === studentId);
    if (!student || !Array.isArray(student.violationHandlingRecords)) return [];

    const cSettings = classService.getSettings();
    const currentYear = (targetAcademicYear || cSettings.academicYear || '2025 - 2026').replace(/\s+/g, '');

    return student.violationHandlingRecords.filter(r => {
      if (r.schoolYear) {
        return r.schoolYear.replace(/\s+/g, '') === currentYear;
      }
      return true; // Mặc định thuộc năm học hiện tại
    });
  }

  /**
   * Tính TỔNG SỐ LƯỢT VI PHẠM THỰC TẾ của học sinh trong năm học hiện tại.
   * QUY TẮC CỐT LÕI:
   * 1. Mỗi bản ghi vi phạm thực tế tính là 1 lượt (hoặc frequencyCount).
   * 2. VI PHẠM ĐÃ ĐƯỢC XỬ LÝ VẪN LÀ VI PHẠM ĐÃ XẢY RA (không bị giảm khi trạng thái thành RESOLVED).
   * 3. Bao gồm cả bản ghi hồ sơ vi phạm và điểm phạt rèn luyện chưa ghi nhận hồ sơ.
   */
  public getStudentTotalViolationsCount(studentId: string, targetAcademicYear?: string): number {
    const student = this.students.find(s => s.id === studentId);
    if (!student) return 0;

    const records = this.getStudentViolationRecords(studentId, targetAcademicYear);
    const recordsCount = records.reduce((sum, r) => sum + (r.frequencyCount && r.frequencyCount > 0 ? r.frequencyCount : 1), 0);

    // Đếm các điểm phạt rèn luyện thực tế
    let txCount = 0;
    try {
      const allTx = trainingService.getAllTransactions();
      const existingRecordIds = new Set(records.map(r => r.id));
      const studentTx = allTx.filter(t => 
        t.studentId === studentId && 
        t.status === 'approved' && 
        t.points < 0 && 
        !existingRecordIds.has(t.id)
      );
      txCount = studentTx.length;
    } catch {
      // Fallback
    }

    return recordsCount + txCount;
  }

  /**
   * Kiểm tra học sinh có ĐẠT HOẶC VƯỢT NGƯỠNG CẢNH BÁO VI PHẠM do GVCN cấu hình hay không.
   */
  public isStudentAtViolationWarningThreshold(studentId: string, targetAcademicYear?: string): boolean {
    const totalCount = this.getStudentTotalViolationsCount(studentId, targetAcademicYear);
    const threshold = classService.getViolationWarningThreshold();
    return totalCount >= threshold;
  }

  public getAllViolationHandlingStudents(): Array<{
    student: Student;
    records: ViolationHandlingRecord[];
    latestRecord?: ViolationHandlingRecord;
    activeStatus: ViolationHandlingStatus;
  }> {
    return this.students
      .filter(s => Array.isArray(s.violationHandlingRecords) && s.violationHandlingRecords.length > 0)
      .map(s => {
        const records = s.violationHandlingRecords || [];
        const latestRecord = records[0];
        // Active status comes directly from the latest handling record confirmed by GVCN
        const activeStatus: ViolationHandlingStatus = latestRecord?.status || 'WARNING';
        return {
          student: s,
          records,
          latestRecord,
          activeStatus
        };
      });
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notify() {
    this.listeners.forEach(l => {
      try {
        l();
      } catch (err) {
        console.error('Error in student listener:', err);
      }
    });
  }
}

export const studentService = new StudentService();
