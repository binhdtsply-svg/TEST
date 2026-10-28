/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  PointTransaction,
  PointRuleConfig,
  LaurelTree,
  LaurelStage,
  TrainingCategory,
  AdjustmentReport,
  UserRole
} from '../types';
import {
  initialPointTransactions,
  initialPointRules,
  initialLaurelTrees,
  initialAdjustmentReports
} from '../data/demoData';
import { tenantService } from './TenantService';
import { studentService } from './StudentService';
import { classService } from './ClassService';
import { trainingRepositoryClient } from './TrainingRepositoryClient';
import { authService } from './AuthService';

class TrainingService {
  private activeTenantId: string = 'tenant-lan-nguyen';
  private transactions: PointTransaction[] = [...initialPointTransactions];
  private rules: PointRuleConfig[] = [...initialPointRules];
  private trees: LaurelTree[] = [...initialLaurelTrees];
  private adjustments: AdjustmentReport[] = [...initialAdjustmentReports];
  private listeners: Array<() => void> = [];
  private isFetching: boolean = false;

  constructor() {
    this.activeTenantId = tenantService.getActiveTenantId();
    this.loadFromStorage(this.activeTenantId);
    this.fetchFromServer();

    tenantService.subscribe(() => {
      const nextTenantId = tenantService.getActiveTenantId();
      if (nextTenantId !== this.activeTenantId) {
        this.activeTenantId = nextTenantId;
        this.loadFromStorage(nextTenantId);
        this.notify();
        this.fetchFromServer();
      }
    });

    queueMicrotask(() => {
      if (typeof studentService !== 'undefined' && studentService?.subscribe) {
        studentService.subscribe(() => {
          this.notify();
        });
      }
    });
  }

  public reloadForActiveTenant(): void {
    this.activeTenantId = tenantService.getActiveTenantId();
    this.loadFromStorage(this.activeTenantId);
    this.notify();
    this.fetchFromServer();
  }

  public refresh(): void {
    this.reloadForActiveTenant();
  }

  public async fetchFromServer(): Promise<void> {
    if (this.isFetching) return;
    this.isFetching = true;
    try {
      const res = await trainingRepositoryClient.getTransactions();
      if (res.success && res.data && Array.isArray(res.data) && res.data.length > 0) {
        const serverTxs: PointTransaction[] = res.data.map((t: any) => {
          const matchedStudent = studentService.getById(t.studentId) || studentService.getAll().find(s => s.id === t.studentId || s.code === t.studentId);
          return {
            id: t.id,
            studentId: t.studentId,
            studentName: (t.studentName && t.studentName !== 'Học sinh') ? t.studentName : (matchedStudent?.fullName || t.studentName || 'Học viên'),
            studentGroup: (t.studentGroup && t.studentGroup !== 1) ? t.studentGroup : (matchedStudent?.group || t.studentGroup || 1),
            classId: this.activeTenantId === 'tenant-hoang-nam' ? '12A2' : '11A1',
            points: t.points,
            category: t.category,
            reason: t.title || t.description || 'Ghi nhận rèn luyện',
            proposedByName: t.createdByRole === 'TEACHER' ? 'GVCN' : 'Cán bộ lớp',
            proposedByRole: t.createdByRole || 'CLASS_OFFICER',
            approvedBy: t.approvedBy,
            status: t.status === 'APPROVED' ? 'approved' : t.status === 'REJECTED' ? 'rejected' : 'pending',
            parentVisible: true,
            createdAt: t.createdAt
          };
        });

        const currentUser = authService.getCurrentUser();
        const isStudentOrParent = currentUser.role === 'STUDENT' || currentUser.role === 'PARENT';
        const myStudentId = currentUser.studentId || (currentUser as any).childStudentId;

        if (isStudentOrParent && myStudentId) {
          // For students/parents: update this student's records with server data, preserve other students' records
          const otherStudentTxs = this.transactions.filter(t => t.studentId !== myStudentId);
          this.transactions = [...otherStudentTxs, ...serverTxs];
        } else {
          // For teacher or admin: server transactions are authoritative
          const sMap = new Map<string, PointTransaction>();
          serverTxs.forEach(stx => sMap.set(stx.id, stx));

          const merged: PointTransaction[] = [...serverTxs];
          for (const localTx of this.transactions) {
            if (!sMap.has(localTx.id) && (localTx.id.startsWith('tx-local') || localTx.id.startsWith('local_'))) {
              merged.push(localTx);
            }
          }
          this.transactions = merged;
        }

        this.recalculateAllTrees();
        this.saveToStorage();
        this.notify();
      }
    } catch (err) {
      console.warn('[TrainingService] Sync notice:', err);
    } finally {
      this.isFetching = false;
    }
  }

  private loadFromStorage(tenantId: string) {
    const tId = tenantService.normalizeTenantId(tenantId);
    try {
      const txKey = tenantService.getTenantStorageKey('transactions', tId);
      const savedTx = localStorage.getItem(txKey);
      if (savedTx) {
        this.transactions = JSON.parse(savedTx);
      } else {
        if (tId === 'tenant-lan-nguyen') {
          const legacy = localStorage.getItem('kgcns_transactions');
          if (legacy) {
            this.transactions = JSON.parse(legacy);
            localStorage.setItem(txKey, legacy);
          } else {
            this.transactions = [...initialPointTransactions];
          }
        } else {
          this.transactions = [];
        }
      }

      const rulesKey = tenantService.getTenantStorageKey('point_rules', tId);
      const savedRules = localStorage.getItem(rulesKey);
      if (savedRules) {
        this.rules = JSON.parse(savedRules);
      } else {
        this.rules = [...initialPointRules];
      }

      const treesKey = tenantService.getTenantStorageKey('laurel_trees', tId);
      const savedTrees = localStorage.getItem(treesKey);
      if (savedTrees) {
        this.trees = JSON.parse(savedTrees);
      } else {
        this.trees = tId === 'tenant-lan-nguyen' ? [...initialLaurelTrees] : [];
      }

      const adjKey = tenantService.getTenantStorageKey('adjustments', tId);
      const savedAdj = localStorage.getItem(adjKey);
      if (savedAdj) {
        this.adjustments = JSON.parse(savedAdj);
      } else {
        this.adjustments = tId === 'tenant-lan-nguyen' ? [...initialAdjustmentReports] : [];
      }
      this.recalculateAllTrees();
    } catch {
      // ignore
    }
  }

  private saveToStorage(tenantId?: string) {
    const tId = tenantService.normalizeTenantId(tenantId || this.activeTenantId);
    try {
      localStorage.setItem(tenantService.getTenantStorageKey('transactions', tId), JSON.stringify(this.transactions));
      localStorage.setItem(tenantService.getTenantStorageKey('point_rules', tId), JSON.stringify(this.rules));
      localStorage.setItem(tenantService.getTenantStorageKey('laurel_trees', tId), JSON.stringify(this.trees));
      localStorage.setItem(tenantService.getTenantStorageKey('adjustments', tId), JSON.stringify(this.adjustments));
    } catch {
      // ignore
    }
    this.notify();
  }

  // Transactions
  public getAllTransactions(): PointTransaction[] {
    return [...this.transactions];
  }

  public getTransactions(): PointTransaction[] {
    return this.getAllTransactions();
  }

  public getApprovedTransactions(): PointTransaction[] {
    return this.transactions.filter(t => (String(t.status || '').toLowerCase() === 'approved' || String(t.reviewStatus || '').toLowerCase() === 'approved'));
  }

  public getPendingTransactions(): PointTransaction[] {
    return this.transactions.filter(t => (String(t.status || '').toLowerCase() === 'pending' || String(t.reviewStatus || '').toLowerCase() === 'pending'));
  }

  public getRejectedTransactions(): PointTransaction[] {
    return this.transactions.filter(t => (String(t.status || '').toLowerCase() === 'rejected' || String(t.reviewStatus || '').toLowerCase() === 'rejected'));
  }

  public getTransactionsForStudent(studentId: string): PointTransaction[] {
    return this.getStudentTransactions(studentId);
  }

  public getStudentTransactions(studentId: string): PointTransaction[] {
    return this.transactions.filter(t => t.studentId === studentId);
  }

  public getStudentApprovedTransactions(studentId: string): PointTransaction[] {
    return this.transactions.filter(t => t.studentId === studentId && (String(t.status || '').toLowerCase() === 'approved' || String(t.reviewStatus || '').toLowerCase() === 'approved'));
  }

  /**
   * Check if an activity praise transaction already exists in the ledger
   */
  public isActivityPraisedInLedger(activityId: string, studentId: string): boolean {
    const key = `activity-praise-${activityId}-${studentId}`;
    const deterministicId = `tx-praise-${activityId}-${studentId}`;
    const reversalId = `tx-rev-${activityId}-${studentId}`;
    const hasReversal = this.transactions.some(
      t => (t.id === reversalId || t.reversalOfTransactionId === deterministicId) && String(t.status || '').toLowerCase() === 'approved'
    );
    if (hasReversal) return false;
    const tx = this.transactions.find(
      t =>
        (t.id === deterministicId || t.sourceEventKey === key) &&
        !t.isReversed &&
        String(t.status || '').toLowerCase() === 'approved'
    );
    return Boolean(tx);
  }

  /**
   * Award +5 training points for ⭐ Activity Praise by GVCN (Idempotent & Server-Synced)
   */
  public awardActivityPraisePoints(params: {
    activityId: string;
    activityTitle: string;
    studentId: string;
    studentName: string;
    studentGroup?: number;
    classId?: string;
    teacherName?: string;
    teacherRole?: UserRole;
  }): PointTransaction {
    const eventKey = `activity-praise-${params.activityId}-${params.studentId}`;
    const deterministicId = `tx-praise-${params.activityId}-${params.studentId}`;
    const reversalId = `tx-rev-${params.activityId}-${params.studentId}`;

    // Remove any previous reversal if re-awarding after a revocation
    this.transactions = this.transactions.filter(t => t.id !== reversalId);

    // Check if active transaction already exists (Idempotent guard)
    const existing = this.transactions.find(
      t =>
        (t.id === deterministicId || t.sourceEventKey === eventKey) &&
        !t.isReversed &&
        String(t.status || '').toLowerCase() === 'approved'
    );
    if (existing) {
      return existing;
    }

    const nowVN = new Date();
    const createdAt = nowVN.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + nowVN.toLocaleDateString('vi-VN');

    const newTx: PointTransaction = {
      id: deterministicId,
      studentId: params.studentId,
      studentName: params.studentName || 'Học sinh',
      studentGroup: params.studentGroup || 1,
      classId: params.classId || classService.getSettings()?.className || (this.activeTenantId === 'tenant-hoang-nam' ? '12A2' : '11A1'),
      points: 5,
      category: 'Phong trào',
      reason: `⭐ Tuyên dương xuất sắc trong hoạt động: ${params.activityTitle}`,
      proposedByName: params.teacherName || 'GVCN',
      proposedByRole: params.teacherRole || 'TEACHER',
      approvedBy: params.teacherName || 'GVCN',
      status: 'approved',
      parentVisible: true,
      sourceType: 'ACTIVITY_EVALUATION',
      sourceId: params.activityId,
      sourceEventKey: eventKey,
      isReversed: false,
      isReversal: false,
      createdAt
    };

    this.transactions = this.transactions.filter(t => t.id !== deterministicId);
    this.transactions.unshift(newTx);
    this.recalculateStudentTree(params.studentId);
    this.saveToStorage();

    trainingRepositoryClient.createTransaction({
      id: newTx.id,
      studentId: newTx.studentId,
      title: newTx.reason,
      points: newTx.points,
      category: newTx.category,
      status: 'APPROVED',
      createdAt: newTx.createdAt
    }).catch(err => console.warn('[TrainingService] Server praise tx sync notice:', err));

    return newTx;
  }

  /**
   * Remove / Reverse Activity Praise points (-5 points reversal transaction)
   */
  public removeActivityPraisePoints(params: {
    activityId: string;
    activityTitle: string;
    studentId: string;
    teacherName?: string;
    teacherRole?: UserRole;
  }): PointTransaction | null {
    const eventKey = `activity-praise-${params.activityId}-${params.studentId}`;
    const deterministicId = `tx-praise-${params.activityId}-${params.studentId}`;
    const reversalId = `tx-rev-${params.activityId}-${params.studentId}`;

    const origTx = this.transactions.find(
      t =>
        (t.id === deterministicId || t.sourceEventKey === eventKey) &&
        !t.isReversed &&
        String(t.status || '').toLowerCase() === 'approved'
    );

    if (!origTx) {
      return null;
    }

    // Mark original as reversed
    origTx.isReversed = true;

    const existingRev = this.transactions.find(t => t.id === reversalId);
    if (existingRev) {
      return existingRev;
    }

    const nowVN = new Date();
    const createdAt = nowVN.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + nowVN.toLocaleDateString('vi-VN');

    const reversalTx: PointTransaction = {
      id: reversalId,
      studentId: params.studentId,
      studentName: origTx.studentName,
      studentGroup: origTx.studentGroup,
      classId: origTx.classId,
      points: -5,
      category: 'Phong trào',
      reason: `Hủy tuyên dương hoạt động: ${params.activityTitle}`,
      proposedByName: params.teacherName || 'GVCN',
      proposedByRole: params.teacherRole || 'TEACHER',
      approvedBy: params.teacherName || 'GVCN',
      status: 'approved',
      parentVisible: true,
      sourceType: 'ACTIVITY_EVALUATION',
      sourceId: params.activityId,
      reversalOfTransactionId: origTx.id,
      isReversal: true,
      createdAt
    };

    this.transactions.unshift(reversalTx);
    this.recalculateStudentTree(params.studentId);
    this.saveToStorage();

    trainingRepositoryClient.createTransaction({
      id: reversalTx.id,
      studentId: reversalTx.studentId,
      title: reversalTx.reason,
      points: reversalTx.points,
      category: reversalTx.category,
      status: 'APPROVED',
      createdAt: reversalTx.createdAt
    }).catch(err => console.warn('[TrainingService] Server reversal tx sync notice:', err));

    return reversalTx;
  }

  public recordTransaction(payload: any) {
    const studentIds = payload.studentIds || (payload.studentId ? [payload.studentId] : []);
    const isTeacher = payload.role === 'TEACHER' || payload.proposedByRole === 'TEACHER' || payload.isTeacher;
    const defaultStatus = payload.status || (isTeacher ? 'approved' : 'pending');
    const nowVN = new Date();
    const timeStr = nowVN.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + nowVN.toLocaleDateString('vi-VN');
    const dateOnly = nowVN.toLocaleDateString('vi-VN');
    const defaultClassName = classService.getSettings()?.className || (this.activeTenantId === 'tenant-hoang-nam' ? '12A2' : '11A1');

    studentIds.forEach((sId: string) => {
      const student = studentService.getById(sId);
      const studentName = student?.fullName || payload.studentName || 'Học sinh';
      const studentGroup = student?.group || payload.studentGroup || 1;
      const classId = student?.classId || defaultClassName;

      this.addTransaction({
        studentId: sId,
        studentName,
        studentGroup,
        classId,
        points: payload.points || 0,
        category: payload.category || 'Học tập',
        reason: payload.reason || '',
        proposedByName: payload.recordedBy || payload.proposedByName || (isTeacher ? 'GVCN' : 'Cán sự lớp'),
        proposedByRole: payload.proposedByRole || (isTeacher ? 'TEACHER' : 'CLASS_OFFICER'),
        approvedBy: defaultStatus === 'approved' ? (payload.recordedBy || payload.approvedBy || 'GVCN') : undefined,
        approvedAt: defaultStatus === 'approved' ? timeStr : undefined,
        status: defaultStatus,
        reviewStatus: defaultStatus,
        parentNotificationStatus: payload.parentNotificationStatus || 'NOT_NOTIFIED',
        eventDate: payload.eventDate || dateOnly,
        parentVisible: payload.parentVisible !== undefined ? payload.parentVisible : (defaultStatus === 'approved')
      });
    });
    this.notify();
  }

  public addTransaction(
    tx: Omit<PointTransaction, 'id' | 'createdAt'> & { id?: string }
  ): PointTransaction {
    if (tx.id) {
      const existingById = this.transactions.find(t => t.id === tx.id);
      if (existingById) {
        return existingById;
      }
    }

    const nowVN = new Date();
    const timeStr = nowVN.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + nowVN.toLocaleDateString('vi-VN');
    const dateOnly = nowVN.toLocaleDateString('vi-VN');

    // Fill missing student details if not present
    let studentName = tx.studentName;
    let studentGroup = tx.studentGroup;
    let classId = tx.classId;

    if (tx.studentId && (!studentName || studentName === 'Học sinh')) {
      const student = studentService.getById(tx.studentId);
      if (student) {
        studentName = student.fullName;
        if (!studentGroup) studentGroup = student.group;
        if (!classId) classId = student.classId;
      }
    }
    if (!classId) {
      classId = classService.getSettings()?.className || (this.activeTenantId === 'tenant-hoang-nam' ? '12A2' : '11A1');
    }

    const rawStatus = (tx.status || tx.reviewStatus || 'pending').toString().toLowerCase();
    const normalizedStatus: 'pending' | 'approved' | 'rejected' = 
      rawStatus === 'approved' ? 'approved' : rawStatus === 'rejected' ? 'rejected' : 'pending';

    const newTx: PointTransaction = {
      ...tx,
      studentName: studentName || 'Học sinh',
      studentGroup: studentGroup || 1,
      classId,
      id: tx.id || `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      status: normalizedStatus,
      reviewStatus: normalizedStatus,
      parentNotificationStatus: tx.parentNotificationStatus || 'NOT_NOTIFIED',
      eventDate: tx.eventDate || dateOnly,
      createdAt: timeStr
    };

    this.transactions.unshift(newTx);
    if (String(newTx.status || '').toLowerCase() === 'approved' && newTx.studentId) {
      this.recalculateStudentTree(newTx.studentId);
    }
    this.saveToStorage();
    this.notify();

    // Persist to server backend (triggers domain event for real-time notification)
    const validTitle = (newTx.reason && newTx.reason.trim()) ? newTx.reason.trim() : `Ghi nhận điểm: ${newTx.category}`;
    trainingRepositoryClient.createTransaction({
      id: newTx.id,
      studentId: newTx.studentId,
      title: validTitle,
      points: newTx.points,
      category: newTx.category,
      status: newTx.status === 'approved' ? 'APPROVED' : 'PROPOSED',
      createdAt: newTx.createdAt
    }).catch(err => console.warn('[TrainingService] Server tx error:', err));

    return newTx;
  }

  public approveTransaction(
    id: string,
    teacherName: string,
    updates?: {
      points?: number;
      reason?: string;
      category?: string;
      eventDate?: string;
      studentGroup?: number;
    }
  ) {
    const tx = this.transactions.find(t => t.id === id);
    if (tx) {
      const nowVN = new Date();
      const timeStr = nowVN.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + nowVN.toLocaleDateString('vi-VN');

      tx.status = 'approved';
      tx.reviewStatus = 'approved';
      tx.approvedBy = teacherName;
      tx.approvedAt = timeStr;
      tx.parentVisible = true;

      if (updates) {
        if (updates.points !== undefined) tx.points = updates.points;
        if (updates.reason !== undefined) tx.reason = updates.reason;
        if (updates.category !== undefined) tx.category = updates.category;
        if (updates.eventDate !== undefined) tx.eventDate = updates.eventDate;
        if (updates.studentGroup !== undefined) tx.studentGroup = updates.studentGroup;
      }

      if (tx.studentId) {
        this.recalculateStudentTree(tx.studentId);
      }
      this.saveToStorage();

      if (updates && (updates.points !== undefined || updates.reason !== undefined || updates.category !== undefined)) {
        trainingRepositoryClient.updateTransaction(id, {
          status: 'APPROVED',
          points: tx.points,
          title: tx.reason,
          category: tx.category,
          description: tx.reason
        }).catch(() => {});
      } else {
        trainingRepositoryClient.approveTransaction(id).catch(() => {});
      }
    }
  }

  public rejectTransaction(id: string, teacherName: string, reason?: string) {
    const tx = this.transactions.find(t => t.id === id);
    if (tx) {
      const wasApproved = String(tx.status || '').toLowerCase() === 'approved';
      tx.status = 'rejected';
      tx.reviewStatus = 'rejected';
      tx.approvedBy = teacherName;
      tx.rejectedReason = reason || 'Không đủ căn cứ / Đề xuất không hợp lệ';
      
      if (wasApproved && tx.studentId) {
        this.recalculateStudentTree(tx.studentId);
      }
      this.saveToStorage();

      trainingRepositoryClient.updateTransaction(id, {
        status: 'REJECTED',
        description: tx.rejectedReason
      }).catch(() => {});
    }
  }

  public updateTransaction(id: string, updates: Partial<PointTransaction>) {
    const idx = this.transactions.findIndex(t => t.id === id);
    if (idx >= 0) {
      const prevTx = this.transactions[idx];
      this.transactions[idx] = { ...prevTx, ...updates };
      const current = this.transactions[idx];
      if (current.studentId) {
        this.recalculateStudentTree(current.studentId);
      }
      this.saveToStorage();

      trainingRepositoryClient.updateTransaction(id, {
        points: current.points,
        title: current.reason,
        category: current.category,
        description: current.reason,
        status: String(current.status || 'APPROVED').toUpperCase()
      }).catch(() => {});
    }
  }

  public markParentNotified(transactionIds: string[], teacherName: string) {
    const nowVN = new Date();
    const timeStr = nowVN.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + nowVN.toLocaleDateString('vi-VN');
    
    let changed = false;
    this.transactions.forEach(t => {
      if (transactionIds.includes(t.id)) {
        t.parentNotificationStatus = 'SENT';
        t.parentNotifiedAt = timeStr;
        t.parentNotifiedBy = teacherName;
        changed = true;
      }
    });

    if (changed) {
      this.saveToStorage();
    }
  }

  public deleteTransaction(id: string) {
    const tx = this.transactions.find(t => t.id === id);
    const sId = tx?.studentId;
    this.transactions = this.transactions.filter(t => t.id !== id);
    if (sId) this.recalculateStudentTree(sId);
    this.saveToStorage();

    trainingRepositoryClient.deleteTransaction(id).catch(() => {});
  }

  // Point rules
  public getRules(): PointRuleConfig[] {
    return [...this.rules];
  }

  public addRule(rule: Omit<PointRuleConfig, 'id'>): PointRuleConfig {
    const newRule: PointRuleConfig = {
      title: rule.title || '',
      points: rule.points ?? 0,
      category: rule.category || 'Học tập',
      ...rule,
      id: `rule-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      isCustom: true
    };
    this.rules.push(newRule);
    this.saveToStorage();
    return newRule;
  }

  public updateRule(id: string, updates: Partial<PointRuleConfig>): PointRuleConfig | null {
    const idx = this.rules.findIndex(r => r.id === id);
    if (idx >= 0) {
      this.rules[idx] = { ...this.rules[idx], ...updates };
      this.saveToStorage();
      return this.rules[idx];
    }
    return null;
  }

  public deleteRule(id: string): boolean {
    const beforeLen = this.rules.length;
    this.rules = this.rules.filter(r => r.id !== id);
    if (this.rules.length !== beforeLen) {
      this.saveToStorage();
      return true;
    }
    return false;
  }

  // Laurel Trees computation
  public getTrees(): LaurelTree[] {
    const students = studentService.getStudents();
    const treeMap = new Map<string, LaurelTree>();
    this.trees.forEach(t => treeMap.set(t.studentId, t));

    if (students.length === 0) {
      return this.trees.map(t => {
        const stageInfo = TrainingService.getStageLabel(t?.stage);
        return {
          ...t,
          stageName: stageInfo?.name || 'Hạt mầm',
          icon: stageInfo?.icon || '🌰',
          currentCyclePoints: t?.currentPoints || 0,
          totalPointsEarned: t?.totalLifetimePoints || 0
        };
      });
    }

    return students.map(stu => {
      const existing = treeMap.get(stu.id);
      const stage = existing?.stage || 'SEED';
      const stageInfo = TrainingService.getStageLabel(stage);
      const currentPoints = existing?.currentPoints || 0;
      const completedTrees = existing?.completedTrees || 0;
      const totalLifetimePoints = existing?.totalLifetimePoints || 0;

      return {
        studentId: stu.id,
        studentName: stu.fullName,
        studentAvatar: stu.avatar || '',
        group: stu.group || 1,
        studentGroup: stu.group || 1,
        currentPoints,
        completedTrees,
        stage,
        totalLifetimePoints,
        stageName: stageInfo?.name || 'Hạt mầm',
        icon: stageInfo?.icon || '🌰',
        currentCyclePoints: currentPoints,
        totalPointsEarned: totalLifetimePoints
      };
    });
  }

  public getStudentTree(studentId: string): LaurelTree | undefined {
    const existing = this.trees.find(t => t.studentId === studentId);
    const stu = studentService.getById(studentId);
    if (!existing && !stu) return undefined;

    const stage = existing?.stage || 'SEED';
    const stageInfo = TrainingService.getStageLabel(stage);
    const currentPoints = existing?.currentPoints || 0;
    const completedTrees = existing?.completedTrees || 0;
    const totalLifetimePoints = existing?.totalLifetimePoints || 0;

    return {
      studentId: studentId,
      studentName: existing?.studentName || stu?.fullName || 'Học sinh',
      studentAvatar: existing?.studentAvatar || stu?.avatar || '',
      group: existing?.group || stu?.group || 1,
      studentGroup: existing?.group || stu?.group || 1,
      currentPoints,
      completedTrees,
      stage,
      totalLifetimePoints,
      stageName: stageInfo?.name || 'Hạt mầm',
      icon: stageInfo?.icon || '🌰',
      currentCyclePoints: currentPoints,
      totalPointsEarned: totalLifetimePoints
    };
  }

  public static getStageForPoints(pts: number): LaurelStage {
    if (pts >= 90) return 'BLOOMING';
    if (pts >= 66) return 'BIG_TREE';
    if (pts >= 41) return 'SAPLING';
    if (pts >= 21) return 'SPROUT';
    return 'SEED';
  }

  public static getStageLabel(stage?: LaurelStage): { name: string; icon: string; minPts: number; maxPts: number; color: string } {
    switch (stage) {
      case 'SEED':
        return { name: 'Hạt mầm', icon: '🌰', minPts: 0, maxPts: 20, color: '#A16207' };
      case 'SPROUT':
        return { name: 'Nảy mầm', icon: '🌱', minPts: 21, maxPts: 40, color: '#16A34A' };
      case 'SAPLING':
        return { name: 'Cây non', icon: '🌿', minPts: 41, maxPts: 65, color: '#0D9488' };
      case 'BIG_TREE':
        return { name: 'Cây lớn', icon: '🌳', minPts: 66, maxPts: 89, color: '#2563EB' };
      case 'BLOOMING':
        return { name: 'Trổ bông', icon: '🌼', minPts: 90, maxPts: 100, color: '#EAB308' };
      default:
        return { name: 'Hạt mầm', icon: '🌰', minPts: 0, maxPts: 20, color: '#A16207' };
    }
  }

  private recalculateStudentTree(studentId: string) {
    const studentApprovedTxs = this.transactions.filter(
      t => t.studentId === studentId && 
           (String(t.status || '').toLowerCase() === 'approved' || String(t.reviewStatus || '').toLowerCase() === 'approved') && 
           !t.isReversed
    );
    const sumPoints = studentApprovedTxs.reduce((sum, tx) => sum + (Number(tx.points) || 0), 0);

    // 100 points = 1 completed tree
    const completedCycles = Math.floor(Math.max(0, sumPoints) / 100);
    const currentPoints = Math.max(0, sumPoints) % 100;
    const stage = TrainingService.getStageForPoints(currentPoints);

    const existingIndex = this.trees.findIndex(t => t.studentId === studentId);
    if (existingIndex >= 0) {
      this.trees[existingIndex] = {
        ...this.trees[existingIndex],
        currentPoints,
        completedTrees: completedCycles,
        stage,
        totalLifetimePoints: Math.max(0, sumPoints),
        currentCyclePoints: currentPoints,
        totalPointsEarned: Math.max(0, sumPoints)
      };
    } else {
      this.trees.push({
        studentId,
        studentName: '',
        studentAvatar: '',
        group: 1,
        currentPoints,
        completedTrees: completedCycles,
        stage,
        totalLifetimePoints: Math.max(0, sumPoints),
        currentCyclePoints: currentPoints,
        totalPointsEarned: Math.max(0, sumPoints)
      });
    }
  }

  public recalculateAllTrees(): void {
    const studentIds = new Set<string>();
    this.trees.forEach(tr => {
      if (tr.studentId) studentIds.add(tr.studentId);
    });
    this.transactions.forEach(tx => {
      if (tx.studentId) studentIds.add(tx.studentId);
    });
    studentIds.forEach(id => this.recalculateStudentTree(id));
  }

  // Adjustment reports
  public getAdjustmentReports(): AdjustmentReport[] {
    return [...this.adjustments];
  }

  public submitAdjustmentReport(report: Omit<AdjustmentReport, 'id' | 'status' | 'createdAt'>): AdjustmentReport {
    const newReport: AdjustmentReport = {
      ...report,
      id: `adj-${Date.now()}`,
      status: 'pending',
      createdAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('vi-VN')
    };
    this.adjustments.unshift(newReport);
    this.saveToStorage();
    return newReport;
  }

  public resolveAdjustmentReport(id: string, status: 'approved' | 'rejected', reply: string) {
    this.adjustments = this.adjustments.map(a => 
      a.id === id ? { ...a, status, teacherReply: reply } : a
    );
    this.saveToStorage();
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
        console.error('TrainingService listener error:', err);
      }
    });
  }
}

export const trainingService = new TrainingService();
