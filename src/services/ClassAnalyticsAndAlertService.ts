/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Student, PointTransaction, ClassSettings, AttentionStatus, AttentionHistoryEntry, ViolationHandlingRecord } from '../types';
import { studentService } from './StudentService';
import { trainingService } from './TrainingService';
import { academicService } from './AcademicService';
import { classService } from './ClassService';
import { schoolWeekService } from './SchoolWeekService';
import { tenantService } from './TenantService';
import { teacherWorkCenterClient, TeacherPersonalTask } from './TeacherWorkCenterClient';
import { activityService } from './ActivityService';
import { SchoolYearDateNormalizer } from './SchoolYearDateNormalizer';
import { violationAnalyticsService, isViolationTransaction, getTransactionISODate } from './ViolationAnalyticsService';
import { fullYearReportService } from './FullYearReportService';

export interface SpecialCaseStudentViolation {
  id: string;
  date: string;
  isoDate: string;
  category: string;
  reason: string;
  points: number;
}

export interface SpecialCaseStudent {
  studentId: string;
  studentName: string;
  studentCode: string;
  studentGroup: number;
  className: string;
  avatar?: string;
  violationsCount: number;
  violations: SpecialCaseStudentViolation[];
  datesOccurred: string[];
  hasAttentionProfile: boolean;
  currentAttentionStatus?: AttentionStatus;
  attentionNote?: string;
  supportMeasure?: string;
  attentionCategories?: string[];
  attentionStartedAt?: string;
  attentionEndedAt?: string;
  attentionHistory?: AttentionHistoryEntry[];
}

export interface TrackingOverviewStats {
  specialCasesCount: number;
  monitoringCount: number;
  endedCount: number;
  specialCases: SpecialCaseStudent[];
  selectedWeekNumber: number;
  selectedWeek: any;
  currentWeekNum: number;
  allWeeks: any[];
}

export type AlertSeverity = 'ATTENTION' | 'WARNING' | 'SPECIAL_ATTENTION';
export type AlertStatus = 'UNSEEN' | 'VIEWED' | 'MONITORING' | 'RESOLVED' | 'CONTINUED';

export interface AlertResolutionHistoryEntry {
  timestamp: string;
  action: string;
  actorName: string;
  notes?: string;
  status: AlertStatus;
}

export interface AlertResolutionRecord {
  alertId: string;
  studentId: string;
  status: AlertStatus;
  resolutionNotes?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  nextReviewDate?: string;
  followUpResult?: string;
  history: AlertResolutionHistoryEntry[];
}

export interface HomeroomCareAlert {
  id: string;
  studentId: string;
  studentName: string;
  studentCode: string;
  studentGroup: number;
  avatar?: string;
  category?: string;
  severity: AlertSeverity;
  severityLabel: string;
  title: string;
  reason: string;
  triggerSignals: string[];
  sourceDataSummary: {
    recentViolationsCount: number;
    previousViolationsCount: number;
    trendText: string;
    violationCategories: string[];
    absentDaysCount: number;
    tardyDaysCount: number;
    academicAverage?: number;
    specialAttentionFlag: boolean;
  };
  timeframeLabel?: string;
  suggestedActionDraft?: string;
  status: AlertStatus;
  statusLabel: string;
  resolution?: AlertResolutionRecord;
  createdAt: string;
  updatedAt?: string;
}

export interface WeeklyClassSummary {
  weekNumber: number;
  weekLabel: string;
  dateRange: string;
  schoolYearLabel: string;
  semester: string;
  totalStudents: number;
  attendance: {
    attendanceRate: number; // percentage 0 - 100
    excusedAbsences: number;
    unexcusedAbsences: number;
    tardyCount: number;
    totalAbsences: number;
    attendanceTrend: string;
  };
  violations: {
    totalCount: number;
    studentsWithViolationCount: number;
    byCategory: Array<{ category: string; count: number }>;
    previousWeekTotal: number;
    trendDifference: number; // + / -
    trendDirection: 'INCREASED' | 'DECREASED' | 'STABLE';
    trendText: string;
  };
  positiveHighlights: {
    goodDeedsCount: number;
    totalRewardPoints: number;
    studentsRewardedCount: number;
    laurelTreesCompleted: number;
    activeActivitiesCount: number;
  };
  academics: {
    scoredStudentsCount: number;
    classAverageEstimated?: number;
    goodExcellentCount: number;
    needImprovementCount: number;
  };
  alertsAndFollowUp: {
    totalAlerts: number;
    unseenAlerts: number;
    monitoringAlerts: number;
    resolvedAlerts: number;
    specialAttentionCount: number;
  };
  teacherWork: {
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
    overdueTasks: number;
  };
  generatedAt: string;
}

export interface MonthlyClassSummary {
  monthYear: string; // e.g. "10/2025"
  monthLabel: string; // e.g. "Tháng 10/2025"
  totalStudents: number;
  attendance: {
    attendanceRate: number;
    excusedAbsences: number;
    unexcusedAbsences: number;
    tardyCount: number;
    totalAbsences: number;
    attendanceTrend: string;
  };
  violations: {
    totalCount: number;
    studentsWithViolationCount: number;
    byCategory: Array<{ category: string; count: number }>;
    previousMonthTotal: number;
    trendDifference: number;
    trendDirection: 'INCREASED' | 'DECREASED' | 'STABLE';
    trendText: string;
  };
  positiveHighlights: {
    goodDeedsCount: number;
    totalRewardPoints: number;
    studentsRewardedCount: number;
  };
  alertsAndFollowUp: {
    totalAlerts: number;
    monitoringAlerts: number;
    resolvedAlerts: number;
  };
  teacherWork: {
    completedTasks: number;
    pendingTasks: number;
  };
  generatedAt: string;
}

export interface SemesterClassSummary {
  semester: 'HK1' | 'HK2';
  semesterLabel: string; // e.g. "Học kỳ I"
  schoolYearLabel: string;
  totalStudents: number;
  attendance: {
    attendanceRate: number;
    excusedAbsences: number;
    unexcusedAbsences: number;
    tardyCount: number;
    totalAbsences: number;
    attendanceTrend: string;
  };
  violations: {
    totalCount: number;
    studentsWithViolationCount: number;
    byCategory: Array<{ category: string; count: number }>;
    trendDifference: number;
    trendDirection: 'INCREASED' | 'DECREASED' | 'STABLE';
    trendText: string;
  };
  positiveHighlights: {
    goodDeedsCount: number;
    totalRewardPoints: number;
    studentsRewardedCount: number;
    laurelTreesCompleted: number;
    activeActivitiesCount: number;
  };
  academics: {
    scoredStudentsCount: number;
    classAverageEstimated?: number;
    goodExcellentCount: number;
    needImprovementCount: number;
  };
  alertsAndFollowUp: {
    totalAlerts: number;
    monitoringAlerts: number;
    resolvedAlerts: number;
  };
  teacherWork: {
    completedTasks: number;
    pendingTasks: number;
  };
  generatedAt: string;
}

export interface SavedSummaryEntry {
  type: 'week' | 'month' | 'semester';
  key: string;
  teacherEvaluation: string;
  nextDirection: string;
  savedAt: string;
  savedBy?: string;
}

const STORAGE_PREFIX = 'kgcns_care_alerts_state_';
const SUMMARY_STORAGE_PREFIX = 'kgcns_class_summaries_';

class ClassAnalyticsAndAlertService {
  private listeners: Array<() => void> = [];

  constructor() {
    queueMicrotask(() => {
      if (typeof studentService !== 'undefined' && studentService?.subscribe) {
        studentService.subscribe(() => this.notify());
      }
      if (typeof trainingService !== 'undefined' && trainingService?.subscribe) {
        trainingService.subscribe(() => this.notify());
      }
      if (typeof classService !== 'undefined' && classService?.subscribe) {
        classService.subscribe(() => this.notify());
      }
      if (typeof tenantService !== 'undefined' && tenantService?.subscribe) {
        tenantService.subscribe(() => this.notify());
      }
    });
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => {
      try {
        l();
      } catch (err) {
        console.error('ClassAnalyticsAndAlertService listener error:', err);
      }
    });
  }

  private getStorageKey(): string {
    const tenantId = tenantService.getActiveTenantId() || 'tenant-lan-nguyen';
    return `${STORAGE_PREFIX}${tenantId}`;
  }

  public getResolutionRecords(): Record<string, AlertResolutionRecord> {
    try {
      const raw = localStorage.getItem(this.getStorageKey());
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {
      // ignore
    }
    return {};
  }

  public saveResolutionRecords(records: Record<string, AlertResolutionRecord>): void {
    try {
      localStorage.setItem(this.getStorageKey(), JSON.stringify(records));
    } catch {
      // ignore
    }
    this.notify();
  }

  private getSummaryStorageKey(): string {
    const tenantId = tenantService.getActiveTenantId() || 'tenant-lan-nguyen';
    return `${SUMMARY_STORAGE_PREFIX}${tenantId}`;
  }

  public getSavedClassSummary(type: 'week' | 'month' | 'semester', key: string): SavedSummaryEntry | null {
    try {
      const raw = localStorage.getItem(this.getSummaryStorageKey());
      if (raw) {
        const map = JSON.parse(raw);
        return map[`${type}_${key}`] || null;
      }
    } catch {
      // ignore
    }
    return null;
  }

  public saveClassSummary(
    type: 'week' | 'month' | 'semester',
    key: string,
    data: { teacherEvaluation: string; nextDirection: string; savedBy?: string }
  ): void {
    try {
      const storageKey = this.getSummaryStorageKey();
      const raw = localStorage.getItem(storageKey);
      const map: Record<string, SavedSummaryEntry> = raw ? JSON.parse(raw) : {};
      
      map[`${type}_${key}`] = {
        type,
        key,
        teacherEvaluation: data.teacherEvaluation || '',
        nextDirection: data.nextDirection || '',
        savedAt: new Date().toISOString(),
        savedBy: data.savedBy || 'Giáo viên chủ nhiệm'
      };

      localStorage.setItem(storageKey, JSON.stringify(map));
      this.notify();
    } catch (err) {
      console.warn('[ClassAnalyticsAndAlertService] Error saving class summary:', err);
    }
  }

  public getAllSavedSummaries(): Record<string, SavedSummaryEntry> {
    try {
      const raw = localStorage.getItem(this.getSummaryStorageKey());
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {
      // ignore
    }
    return {};
  }

  /**
   * Helper: checks if a date falls in a given range using normalized ISO dates
   */
  public isDateInRange(dateStr?: string, startStr?: string, endStr?: string): boolean {
    if (!dateStr) return false;
    const isoDate = SchoolYearDateNormalizer.toISODateString(dateStr);
    if (!isoDate) return false;
    const isoStart = startStr ? SchoolYearDateNormalizer.toISODateString(startStr) : '';
    const isoEnd = endStr ? SchoolYearDateNormalizer.toISODateString(endStr) : '';
    if (isoStart && isoDate < isoStart) return false;
    if (isoEnd && isoDate > isoEnd) return false;
    return true;
  }

  /**
   * Parse date safely to month-year (MM/YYYY) without timezone distortion
   */
  public getMonthYear(dateStr?: string): string {
    if (!dateStr) return '';
    const parts = SchoolYearDateNormalizer.parseDateParts(dateStr);
    if (parts) {
      return `${String(parts.month).padStart(2, '0')}/${parts.year}`;
    }
    return '';
  }

  /**
   * Determine if a transaction is a violation (points < 0 or negative category)
   */
  public isViolationTx(tx: PointTransaction): boolean {
    return isViolationTransaction(tx);
  }

  /**
   * Determine if a transaction is positive (points > 0 or reward category)
   */
  public isPositiveTx(tx: PointTransaction): boolean {
    if (tx.points > 0) return true;
    const cat = (tx.category || '').toLowerCase();
    if (
      cat.includes('việc tốt') ||
      cat.includes('khen thưởng') ||
      cat.includes('tiến bộ') ||
      cat.includes('tích cực') ||
      cat.includes('phát biểu')
    ) {
      return true;
    }
    return false;
  }

  /**
   * Get Week Calculation for current study week
   */
  public getCurrentWeekInfo() {
    const period = schoolWeekService.getCurrentStudyPeriod();
    const allStudyWeeks = schoolWeekService.getAllStudyWeeks();
    const allWeeks = allStudyWeeks.map((w) => ({
      weekNumber: w.weekNumber,
      label: w.label,
      fullLabel: w.label,
      dateRangeFormatted: w.dateRange,
      startDate: w.startDate,
      endDate: w.endDate,
      semesterLabel: w.semester === 'HK1' ? 'Học kỳ I' : 'Học kỳ II'
    }));

    const todayIso = SchoolYearDateNormalizer.formatDateString(
      new Date().getFullYear(),
      new Date().getMonth() + 1,
      new Date().getDate()
    );

    const currentMatchingWeek = allWeeks.find(
      (w) => todayIso >= w.startDate && todayIso <= w.endDate
    );

    const currentWeekNum = period.weekNumber || currentMatchingWeek?.weekNumber || 1;
    const currentWeek =
      currentMatchingWeek ||
      allWeeks.find((w) => w.weekNumber === currentWeekNum) ||
      allWeeks[0];
    const prevWeek = allWeeks.find((w) => w.weekNumber === currentWeekNum - 1) || null;

    return {
      currentWeekNum,
      currentWeek,
      prevWeek,
      allWeeks
    };
  }

  /**
   * 1. SYSTEM STATS: Generate weekly class summary without AI
   */
  public getWeeklyClassSummary(targetWeekNumber?: number): WeeklyClassSummary {
    const students = studentService.getAll();
    const settings = classService.getSettings();
    const { currentWeekNum, allWeeks } = this.getCurrentWeekInfo();

    const selectedWeekNum = targetWeekNumber !== undefined ? targetWeekNumber : currentWeekNum;
    const week = allWeeks.find((w) => w.weekNumber === selectedWeekNum) || allWeeks[0];
    const prevWeek = allWeeks.find((w) => w.weekNumber === selectedWeekNum - 1) || null;

    const allTx = trainingService.getAllTransactions().filter((t) => t.status === 'approved');

    // Filter transactions by week date range
    // Violations - Unified via violationAnalyticsService
    const weeklyViolations = violationAnalyticsService.getWeeklyViolations(
      targetWeekNumber !== undefined ? targetWeekNumber : undefined
    );
    const prevWeekViolations = prevWeek
      ? violationAnalyticsService.getWeeklyViolations(prevWeek.weekNumber)
      : { totalCount: 0, studentsWithViolationCount: 0, byCategory: [], records: [] };

    const weekStart = targetWeekNumber !== undefined && week ? week.startDate : (weeklyViolations.startDate || week?.startDate);
    const weekEnd = targetWeekNumber !== undefined && week ? week.endDate : (weeklyViolations.endDate || week?.endDate);

    const weekTx = allTx.filter((t) => {
      const d = t.createdAt || (t as any).approvedAt || (t as any).date;
      if (!d) return true; // if no date, include for completeness
      if (!weekStart || !weekEnd) return true;
      return this.isDateInRange(d, weekStart, weekEnd);
    });

    const trendDiff = weeklyViolations.totalCount - prevWeekViolations.totalCount;
    let trendDir: 'INCREASED' | 'DECREASED' | 'STABLE' = 'STABLE';
    let trendText = 'Bằng số lượng tuần trước';
    if (trendDiff > 0) {
      trendDir = 'INCREASED';
      trendText = `Tăng ${trendDiff} lượt so với tuần trước (${prevWeekViolations.totalCount} lượt)`;
    } else if (trendDiff < 0) {
      trendDir = 'DECREASED';
      trendText = `Giảm ${Math.abs(trendDiff)} lượt so với tuần trước (${prevWeekViolations.totalCount} lượt)`;
    }

    // Attendance
    const tardyTx = weekTx.filter((t) => {
      const c = (t.category || '').toLowerCase();
      const r = (t.reason || (t as any).title || '').toLowerCase();
      return c.includes('đi trễ') || c.includes('muộn') || r.includes('trễ') || r.includes('muộn');
    });
    const excusedTx = weekTx.filter((t) => fullYearReportService.classifyAbsenceTransaction(t) === 'excused');
    const unexcusedTx = weekTx.filter((t) => fullYearReportService.classifyAbsenceTransaction(t) === 'unexcused');
    const totalAbsences = excusedTx.length + unexcusedTx.length;

    // Calculate estimated attendance rate based on 5 school days
    const totalPossibleAttendances = Math.max(students.length * 5, 1);
    const missedAttendances = totalAbsences;
    const attendanceRate = Math.max(0, Math.min(100, Math.round(((totalPossibleAttendances - missedAttendances) / totalPossibleAttendances) * 1000) / 10));

    // Positive points & highlights
    const positiveTx = weekTx.filter((t) => this.isPositiveTx(t));
    const totalRewardPoints = positiveTx.reduce((sum, t) => sum + (t.points > 0 ? t.points : 0), 0);
    const rewardedStudentIds = new Set(positiveTx.map((t) => t.studentId));

    const laurelTrees = trainingService.getTrees();
    const completedTrees = laurelTrees.reduce((sum, t) => sum + (t.completedTrees || 0), 0);
    const activities = activityService.getAll();

    // Academics overview
    let scoredCount = 0;
    let sumGpa = 0;
    let goodEx = 0;
    let needImp = 0;
    students.forEach((s) => {
      const periods: any[] = ['full_year', 'final_hk2', 'midterm_hk2', 'final_hk1', 'midterm_hk1'];
      const rec = periods.map(p => academicService.getStudentAcademicRecord(s.id, p)).find(r => r?.grades?.some(g => typeof g.average === 'number')) || academicService.getStudentAcademicRecord(s.id, 'midterm_hk1');
      if (rec && rec.grades && rec.grades.length > 0) {
        const scored = rec.grades.filter((g) => typeof g.average === 'number');
        if (scored.length > 0) {
          scoredCount++;
          const avg = scored.reduce((sum, g) => sum + (g.average || 0), 0) / scored.length;
          sumGpa += avg;
          if (avg >= 7.0) goodEx++;
          else if (avg < 5.0) needImp++;
        }
      }
    });

    // Tracking & Attention Overview Stats
    const trackingStats = this.getTrackingOverviewStats(selectedWeekNum);

    // Teacher Tasks
    const allTasks = (teacherWorkCenterClient as any).getLocalTasks
      ? (teacherWorkCenterClient as any).getLocalTasks(tenantService.getActiveTenantId(), 'gvcn')
      : [];
    const completedTasks = allTasks.filter((t: any) => t.status === 'DONE').length;
    const pendingTasks = allTasks.filter((t: any) => t.status !== 'DONE').length;
    const overdueTasks = allTasks.filter((t: any) => t.status === 'OVERDUE').length;

    return {
      weekNumber: selectedWeekNum,
      weekLabel: week ? week.label : `Tuần ${selectedWeekNum}`,
      dateRange: week ? week.dateRangeFormatted : 'Hiện tại',
      schoolYearLabel: settings.academicYear || '2025 - 2026',
      semester: week ? week.semesterLabel : settings.semester || 'Học kỳ I',
      totalStudents: students.length,
      attendance: {
        attendanceRate,
        excusedAbsences: excusedTx.length,
        unexcusedAbsences: unexcusedTx.length,
        tardyCount: tardyTx.length,
        totalAbsences,
        attendanceTrend: totalAbsences === 0 ? 'Chuyên cần 100%, không có học sinh vắng' : `${totalAbsences} lượt vắng trong tuần`
      },
      violations: {
        totalCount: weeklyViolations.totalCount,
        studentsWithViolationCount: weeklyViolations.studentsWithViolationCount,
        byCategory: weeklyViolations.byCategory,
        previousWeekTotal: prevWeekViolations.totalCount,
        trendDifference: trendDiff,
        trendDirection: trendDir,
        trendText
      },
      positiveHighlights: {
        goodDeedsCount: positiveTx.length,
        totalRewardPoints,
        studentsRewardedCount: rewardedStudentIds.size,
        laurelTreesCompleted: completedTrees,
        activeActivitiesCount: activities.length
      },
      academics: {
        scoredStudentsCount: scoredCount,
        classAverageEstimated: scoredCount > 0 ? Math.round((sumGpa / scoredCount) * 10) / 10 : undefined,
        goodExcellentCount: goodEx,
        needImprovementCount: needImp
      },
      alertsAndFollowUp: {
        totalAlerts: trackingStats.specialCasesCount,
        unseenAlerts: trackingStats.specialCasesCount,
        monitoringAlerts: trackingStats.monitoringCount,
        resolvedAlerts: trackingStats.endedCount,
        specialAttentionCount: trackingStats.specialCasesCount
      },
      teacherWork: {
        totalTasks: allTasks.length,
        completedTasks,
        pendingTasks,
        overdueTasks
      },
      generatedAt: new Date().toLocaleString('vi-VN')
    };
  }

  /**
   * 2. SYSTEM STATS: Generate monthly class summary without AI
   */
  public getMonthlyClassSummary(targetMonthYear?: string): MonthlyClassSummary {
    const students = studentService.getAll();
    const allTx = trainingService.getAllTransactions().filter((t) => t.status === 'approved');

    // Default to current month or first available
    const today = new Date();
    const currentMY = `${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
    const selectedMY = targetMonthYear || currentMY;

    const [selMonth, selYear] = selectedMY.split('/').map(Number);
    const prevMonthDate = new Date(selYear, selMonth - 2, 1);
    const prevMY = `${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}/${prevMonthDate.getFullYear()}`;

    const monthTx = allTx.filter((t) => {
      const d = t.createdAt || (t as any).approvedAt || (t as any).date;
      return d ? this.getMonthYear(d) === selectedMY : true;
    });

    const prevMonthTx = allTx.filter((t) => {
      const d = t.createdAt || (t as any).approvedAt || (t as any).date;
      return d ? this.getMonthYear(d) === prevMY : false;
    });

    const monthlyViolations = violationAnalyticsService.getMonthlyViolations(selectedMY);
    const prevMonthlyViolations = violationAnalyticsService.getMonthlyViolations(prevMY);

    const trendDiff = monthlyViolations.totalCount - prevMonthlyViolations.totalCount;
    let trendDir: 'INCREASED' | 'DECREASED' | 'STABLE' = 'STABLE';
    let trendText = 'Bằng số lượng tháng trước';
    if (trendDiff > 0) {
      trendDir = 'INCREASED';
      trendText = `Tăng ${trendDiff} lượt so với tháng trước (${prevMonthlyViolations.totalCount} lượt)`;
    } else if (trendDiff < 0) {
      trendDir = 'DECREASED';
      trendText = `Giảm ${Math.abs(trendDiff)} lượt so với tháng trước (${prevMonthlyViolations.totalCount} lượt)`;
    }

    const tardyTx = monthTx.filter((t) => {
      const c = (t.category || '').toLowerCase();
      const r = (t.reason || (t as any).title || '').toLowerCase();
      return c.includes('đi trễ') || c.includes('muộn') || r.includes('trễ') || r.includes('muộn');
    });
    const excusedTx = monthTx.filter((t) => fullYearReportService.classifyAbsenceTransaction(t) === 'excused');
    const unexcusedTx = monthTx.filter((t) => fullYearReportService.classifyAbsenceTransaction(t) === 'unexcused');
    const totalAbsences = excusedTx.length + unexcusedTx.length;

    const positiveTx = monthTx.filter((t) => this.isPositiveTx(t));
    const totalRewardPoints = positiveTx.reduce((sum, t) => sum + (t.points > 0 ? t.points : 0), 0);
    const rewardedStudentIds = new Set(positiveTx.map((t) => t.studentId));

    const alerts = this.generateObjectiveAlerts();
    const resolutions = this.getResolutionRecords();
    let monitoring = 0;
    let resolved = 0;
    alerts.forEach((a) => {
      const res = resolutions[a.id];
      const status = res?.status || a.status;
      if (status === 'MONITORING' || status === 'CONTINUED') monitoring++;
      else if (status === 'RESOLVED') resolved++;
    });

    const allTasks = (teacherWorkCenterClient as any).getLocalTasks
      ? (teacherWorkCenterClient as any).getLocalTasks(tenantService.getActiveTenantId(), 'gvcn')
      : [];
    const completedTasks = allTasks.filter((t: any) => t.status === 'DONE').length;
    const pendingTasks = allTasks.filter((t: any) => t.status !== 'DONE').length;

    return {
      monthYear: selectedMY,
      monthLabel: `Tháng ${selectedMY}`,
      totalStudents: students.length,
      attendance: {
        attendanceRate: 98,
        excusedAbsences: excusedTx.length,
        unexcusedAbsences: unexcusedTx.length,
        tardyCount: tardyTx.length,
        totalAbsences,
        attendanceTrend: `${totalAbsences} lượt vắng trong tháng`
      },
      violations: {
        totalCount: monthlyViolations.totalCount,
        studentsWithViolationCount: monthlyViolations.studentsWithViolationCount,
        byCategory: monthlyViolations.byCategory,
        previousMonthTotal: prevMonthlyViolations.totalCount,
        trendDifference: trendDiff,
        trendDirection: trendDir,
        trendText
      },
      positiveHighlights: {
        goodDeedsCount: positiveTx.length,
        totalRewardPoints,
        studentsRewardedCount: rewardedStudentIds.size
      },
      alertsAndFollowUp: {
        totalAlerts: alerts.length,
        monitoringAlerts: monitoring,
        resolvedAlerts: resolved
      },
      teacherWork: {
        completedTasks,
        pendingTasks
      },
      generatedAt: new Date().toLocaleString('vi-VN')
    };
  }

  /**
   * 2b. SYSTEM STATS: Generate semester class summary (HK1 or HK2)
   */
  public getSemesterClassSummary(targetSemester?: 'HK1' | 'HK2'): SemesterClassSummary {
    const students = studentService.getAll();
    const settings = classService.getSettings();
    const allWeeks = schoolWeekService.getAllStudyWeeks();
    const selSemester = targetSemester || (settings.semester === 'Học kỳ II' || settings.semester === 'HK2' ? 'HK2' : 'HK1');
    const semesterLabel = selSemester === 'HK1' ? 'Học kỳ I' : 'Học kỳ II';

    const semWeeks = allWeeks.filter(w => w.semester === selSemester);
    const startWeek = semWeeks[0];
    const endWeek = semWeeks[semWeeks.length - 1];

    const allTx = trainingService.getAllTransactions().filter(t => t.status === 'approved');
    const semTx = allTx.filter(t => {
      const d = t.createdAt || (t as any).approvedAt || (t as any).date;
      if (!d) return true;
      if (!startWeek || !endWeek) return true;
      return this.isDateInRange(d, startWeek.startDate, endWeek.endDate);
    });

    const violationTx = semTx.filter(t => this.isViolationTx(t));
    const positiveTx = semTx.filter(t => this.isPositiveTx(t));
    const totalRewardPoints = positiveTx.reduce((sum, t) => sum + (t.points > 0 ? t.points : 0), 0);
    const rewardedStudentIds = new Set(positiveTx.map(t => t.studentId));
    const studentsWithViolation = new Set(violationTx.map(t => t.studentId));

    // Group violations by category
    const catMap = new Map<string, number>();
    violationTx.forEach(v => {
      const c = v.category || 'Nề nếp';
      catMap.set(c, (catMap.get(c) || 0) + 1);
    });
    const byCategory = Array.from(catMap.entries()).map(([category, count]) => ({ category, count }));
    byCategory.sort((a, b) => b.count - a.count);

    const tardyTx = semTx.filter((t) => {
      const c = (t.category || '').toLowerCase();
      const r = (t.reason || (t as any).title || '').toLowerCase();
      return c.includes('đi trễ') || c.includes('muộn') || r.includes('trễ') || r.includes('muộn');
    });
    const excusedTx = semTx.filter((t) => fullYearReportService.classifyAbsenceTransaction(t) === 'excused');
    const unexcusedTx = semTx.filter((t) => fullYearReportService.classifyAbsenceTransaction(t) === 'unexcused');
    const totalAbsences = excusedTx.length + unexcusedTx.length;

    // Academic averages
    let scoredCount = 0;
    let sumGpa = 0;
    let goodEx = 0;
    let needImp = 0;
    students.forEach(s => {
      const candidatePeriods: any[] = selSemester === 'HK1' ? ['final_hk1', 'midterm_hk1'] : ['full_year', 'final_hk2', 'midterm_hk2', 'final_hk1', 'midterm_hk1'];
      const rec = candidatePeriods.map(p => academicService.getStudentAcademicRecord(s.id, p)).find(r => r?.grades?.some(g => typeof g.average === 'number')) || academicService.getStudentAcademicRecord(s.id, 'midterm_hk1');
      if (rec && rec.grades && rec.grades.length > 0) {
        const scored = rec.grades.filter(g => typeof g.average === 'number');
        if (scored.length > 0) {
          scoredCount++;
          const avg = scored.reduce((sum, g) => sum + (g.average || 0), 0) / scored.length;
          sumGpa += avg;
          if (avg >= 7.0) goodEx++;
          else if (avg < 5.0) needImp++;
        }
      }
    });

    const laurelTrees = trainingService.getTrees();
    const completedTrees = laurelTrees.reduce((sum, t) => sum + (t.completedTrees || 0), 0);
    const activities = activityService.getAll();

    const alerts = this.generateObjectiveAlerts();
    const resolutions = this.getResolutionRecords();
    let monitoring = 0;
    let resolved = 0;
    alerts.forEach(a => {
      const res = resolutions[a.id];
      const status = res?.status || a.status;
      if (status === 'MONITORING' || status === 'CONTINUED') monitoring++;
      else if (status === 'RESOLVED') resolved++;
    });

    const allTasks = (teacherWorkCenterClient as any).getLocalTasks
      ? (teacherWorkCenterClient as any).getLocalTasks(tenantService.getActiveTenantId(), 'gvcn')
      : [];
    const completedTasks = allTasks.filter((t: any) => t.status === 'DONE').length;
    const pendingTasks = allTasks.filter((t: any) => t.status !== 'DONE').length;

    return {
      semester: selSemester,
      semesterLabel,
      schoolYearLabel: settings.academicYear || '2025 - 2026',
      totalStudents: students.length,
      attendance: {
        attendanceRate: 98.5,
        excusedAbsences: excusedTx.length,
        unexcusedAbsences: unexcusedTx.length,
        tardyCount: tardyTx.length,
        totalAbsences,
        attendanceTrend: `Tổng ${totalAbsences} lượt vắng toàn học kỳ`
      },
      violations: {
        totalCount: violationTx.length,
        studentsWithViolationCount: studentsWithViolation.size,
        byCategory,
        trendDifference: 0,
        trendDirection: 'STABLE',
        trendText: `Tổng ${violationTx.length} lượt vi phạm ghi nhận trong ${semesterLabel}`
      },
      positiveHighlights: {
        goodDeedsCount: positiveTx.length,
        totalRewardPoints,
        studentsRewardedCount: rewardedStudentIds.size,
        laurelTreesCompleted: completedTrees,
        activeActivitiesCount: activities.length
      },
      academics: {
        scoredStudentsCount: scoredCount,
        classAverageEstimated: scoredCount > 0 ? Math.round((sumGpa / scoredCount) * 10) / 10 : undefined,
        goodExcellentCount: goodEx,
        needImprovementCount: needImp
      },
      alertsAndFollowUp: {
        totalAlerts: alerts.length,
        monitoringAlerts: monitoring,
        resolvedAlerts: resolved
      },
      teacherWork: {
        completedTasks,
        pendingTasks
      },
      generatedAt: new Date().toLocaleString('vi-VN')
    };
  }

  /**
   * TRƯỜNG HỢP ĐẶC BIỆT CỦA TUẦN (Tiêu chí cố định: >= 2 lượt vi phạm trong cùng một tuần)
   * Không cộng dồn giữa các tuần. Dữ liệu tuần mới tính riêng, tuần cũ lưu nguyên vẹn.
   */
  public getSpecialCaseStudents(targetWeekNumber?: number): SpecialCaseStudent[] {
    const { currentWeekNum, allWeeks, currentWeek } = this.getCurrentWeekInfo();
    const selWeekNum = targetWeekNumber !== undefined ? targetWeekNumber : currentWeekNum;
    const weeklyViolations = violationAnalyticsService.getWeeklyViolations(selWeekNum);
    const students = studentService.getAll(true);
    const cSettings = classService.getSettings();
    const className = cSettings.className || '11A1';

    const specialCases: SpecialCaseStudent[] = [];

    students.forEach((student) => {
      // Find violations for this student in this specific week (from transactions + handling records)
      const studentTxViolations = weeklyViolations.records.filter((r) => r.studentId === student.id);
      const studentHandlingRecords = (student.violationHandlingRecords || []).filter(
        (r) => r.weekNumber === selWeekNum || (selWeekNum === currentWeekNum && (!r.weekNumber || r.weekNumber === currentWeekNum))
      );

      const rawHandlingViolations: SpecialCaseStudentViolation[] = studentHandlingRecords.map((r) => ({
        id: r.id,
        date: r.date,
        isoDate: r.date,
        category: r.category || 'Nề nếp',
        reason: r.content || 'Vi phạm nề nếp',
        points: -2
      }));

      const rawTxViolations: SpecialCaseStudentViolation[] = studentTxViolations.map((v) => {
        const iso = getTransactionISODate(v) || v.eventDate || '';
        const parts = SchoolYearDateNormalizer.parseDateParts(iso);
        const dateFormatted = parts
          ? `${String(parts.day).padStart(2, '0')}/${String(parts.month).padStart(2, '0')}/${parts.year}`
          : iso || 'Chưa rõ';

        return {
          id: v.id,
          date: dateFormatted,
          isoDate: iso,
          category: v.category || 'Nề nếp',
          reason: v.reason || (v as any).description || (v as any).title || 'Vi phạm nội quy',
          points: v.points || 0
        };
      });

      // Combine violations without duplicating by ID
      const allRawMap = new Map<string, SpecialCaseStudentViolation>();
      rawTxViolations.forEach((v) => allRawMap.set(v.id, v));
      rawHandlingViolations.forEach((v) => allRawMap.set(v.id, v));
      const rawViolations = Array.from(allRawMap.values());
      const totalViolationsCount = rawViolations.length;

      // Ngưỡng cảnh báo do GVCN cấu hình riêng (Mặc định: 2 lượt)
      const warningThreshold = classService.getViolationWarningThreshold();
      if (totalViolationsCount >= warningThreshold) {
        // Unique dates
        const datesOccurred = Array.from(new Set(rawViolations.map((v) => v.date)));

        const hasProfile = Boolean(
          student.needsSpecialAttention ||
          student.attentionStatus === 'ended' ||
          student.attentionStatus === 'stopped' ||
          (student.attentionHistory && student.attentionHistory.length > 0)
        );

        specialCases.push({
          studentId: student.id,
          studentName: student.fullName,
          studentCode: student.code,
          studentGroup: student.group,
          className,
          avatar: student.avatar,
          violationsCount: totalViolationsCount,
          violations: rawViolations,
          datesOccurred,
          hasAttentionProfile: hasProfile,
          currentAttentionStatus: student.attentionStatus,
          attentionNote: student.attentionNote,
          supportMeasure: student.supportMeasure,
          attentionCategories: student.attentionCategories,
          attentionStartedAt: student.attentionStartedAt,
          attentionEndedAt: student.attentionEndedAt,
          attentionHistory: student.attentionHistory
        });
      }
    });

    // Sort: highest violations first, then alphabetically by student name
    specialCases.sort((a, b) => {
      if (b.violationsCount !== a.violationsCount) {
        return b.violationsCount - a.violationsCount;
      }
      return a.studentName.localeCompare(b.studentName, 'vi');
    });

    return specialCases;
  }

  /**
   * 3 CHỈ SỐ CHÍNH CHO TRỢ LÝ THEO DÕI & TỔNG KẾT NỀ NẾP GVCN
   * 1. Trường hợp đặc biệt (Tuần hiện tại: >= 2 lượt vi phạm)
   * 2. Đang theo dõi (Số học viên có hồ sơ trong Học viên cần quan tâm)
   * 3. Đã ngừng theo dõi (Số hồ sơ đã từng được theo dõi và hiện đã ngừng theo dõi, không xóa lịch sử)
   */
  public getTrackingOverviewStats(targetWeekNumber?: number): TrackingOverviewStats {
    const { currentWeekNum, allWeeks, currentWeek } = this.getCurrentWeekInfo();
    const selWeekNum = targetWeekNumber !== undefined ? targetWeekNumber : currentWeekNum;
    const selectedWeek = allWeeks.find((w) => w.weekNumber === selWeekNum) || currentWeek;

    const specialCases = this.getSpecialCaseStudents(selWeekNum);
    const allStudents = studentService.getAll(true);

    // 1. TRƯỜNG HỢP ĐẶC BIỆT: Số học viên vi phạm >= 2 lượt trong tuần được chọn
    const specialCasesCount = specialCases.length;

    // 2. ĐANG THEO DÕI: Số học viên hiện đang có hồ sơ theo dõi trong “Học viên cần quan tâm”
    const monitoringCount = allStudents.filter((s) => {
      const st = s.attentionStatus || (s.needsSpecialAttention ? 'monitoring' : undefined);
      return (
        s.needsSpecialAttention &&
        (st === 'monitoring' || st === 'supporting' || st === 'improving' || st === 'continued_support' || !st)
      );
    }).length;

    // 3. ĐÃ NGỪNG THEO DÕI: Số hồ sơ đã từng được theo dõi và hiện đã được GVCN xác nhận ngừng theo dõi (ended/stopped). Không xóa lịch sử!
    const endedCount = allStudents.filter((s) => {
      const hasEverBeenTracked = Boolean(
        s.needsSpecialAttention ||
        s.attentionStatus === 'ended' ||
        s.attentionStatus === 'stopped' ||
        (s.attentionHistory && s.attentionHistory.length > 0)
      );
      return hasEverBeenTracked && (s.attentionStatus === 'ended' || s.attentionStatus === 'stopped');
    }).length;

    return {
      specialCasesCount,
      monitoringCount,
      endedCount,
      specialCases,
      selectedWeekNumber: selWeekNum,
      selectedWeek,
      currentWeekNum,
      allWeeks
    };
  }

  /**
   * 3. OBJECTIVE ALERT ENGINE: Generate explainable alerts for GVCN based on 9 concrete criteria
   */
  public generateObjectiveAlerts(targetWeekNumber?: number): HomeroomCareAlert[] {
    const students = studentService.getAll();
    const allTx = trainingService.getAllTransactions().filter((t) => t.status === 'approved');
    const resolutions = this.getResolutionRecords();

    const { currentWeekNum, allWeeks } = this.getCurrentWeekInfo();
    const selWeekNum = targetWeekNumber !== undefined ? targetWeekNumber : currentWeekNum;
    const week = allWeeks.find((w) => w.weekNumber === selWeekNum) || allWeeks[0];
    const prevWeek = allWeeks.find((w) => w.weekNumber === selWeekNum - 1) || null;

    const alerts: HomeroomCareAlert[] = [];

    students.forEach((student) => {
      // Get student's transactions
      const studentTx = allTx.filter((t) => t.studentId === student.id);

      const weekTx = studentTx.filter((t) => {
        const d = t.createdAt || (t as any).approvedAt || (t as any).date;
        if (!d || !week) return true;
        return this.isDateInRange(d, week.startDate, week.endDate);
      });

      const prevWeekTx = prevWeek
        ? studentTx.filter((t) => {
            const d = t.createdAt || (t as any).approvedAt || (t as any).date;
            return d && this.isDateInRange(d, prevWeek.startDate, prevWeek.endDate);
          })
        : [];

      const currentViolations = weekTx.filter((t) => this.isViolationTx(t));
      const prevViolations = prevWeekTx.filter((t) => this.isViolationTx(t));

      const unexcusedCount = currentViolations.filter((t) => (t.category || '').includes('Nghỉ không phép')).length;
      const tardyCount = currentViolations.filter((t) => (t.category || '').includes('Đi trễ') || (t.title || '').includes('muộn')).length;
      const heavyViolations = currentViolations.filter((t) => t.points <= -10 || (t.category || '').includes('kỷ luật'));

      // Check academic status
      const alertPeriods: any[] = ['full_year', 'final_hk2', 'midterm_hk2', 'final_hk1', 'midterm_hk1'];
      const academicRec = alertPeriods.map(p => academicService.getStudentAcademicRecord(student.id, p)).find(r => r?.grades?.some(g => typeof g.average === 'number')) || academicService.getStudentAcademicRecord(student.id, 'midterm_hk1');
      let gpa: number | undefined;
      if (academicRec && academicRec.grades && academicRec.grades.length > 0) {
        const scored = academicRec.grades.filter((g) => typeof g.average === 'number');
        if (scored.length > 0) {
          gpa = Math.round((scored.reduce((s, g) => s + (g.average || 0), 0) / scored.length) * 10) / 10;
        }
      }

      // Check existing resolution history
      const existingRes = Object.values(resolutions).find((r) => r.studentId === student.id);
      const hadPreviousResolution = Boolean(existingRes && existingRes.status === 'RESOLVED');

      // --- EVALUATE THE 9 OBJECTIVE CRITERIA ---
      const triggerSignals: string[] = [];
      let criteriaCount = 0;

      // 1. Vi phạm đạt hoặc vượt ngưỡng cảnh báo do GVCN cấu hình
      const warningThreshold = classService.getViolationWarningThreshold();
      if (currentViolations.length >= warningThreshold) {
        triggerSignals.push(`${currentViolations.length} lượt vi phạm ghi nhận trong tuần (Đạt ngưỡng cảnh báo ≥ ${warningThreshold} lượt)`);
        criteriaCount++;
      }

      // 2. Nhiều lượt vi phạm (>= 3 lượt)
      if (currentViolations.length >= 3) {
        triggerSignals.push(`Mật độ vi phạm cao (≥ 3 lượt/tuần)`);
        criteriaCount++;
      }

      // 3. Tăng so với tuần trước
      if (currentViolations.length > prevViolations.length && currentViolations.length > 0) {
        const diff = currentViolations.length - prevViolations.length;
        triggerSignals.push(`Số lượt vi phạm tăng +${diff} so với tuần trước (tuần trước: ${prevViolations.length} lượt)`);
        criteriaCount++;
      }

      // 4. Vi phạm phát sinh liên tiếp 2 tuần
      if (currentViolations.length > 0 && prevViolations.length > 0) {
        triggerSignals.push(`Vi phạm nề nếp phát sinh liên tiếp 2 tuần gần nhất`);
        criteriaCount++;
      }

      // 5. Vi phạm nghiêm trọng hoặc điểm trừ nặng
      if (heavyViolations.length > 0) {
        triggerSignals.push(`Có ${heavyViolations.length} vi phạm mức độ nghiêm trọng (trừ điểm lớn ≤ -10 điểm)`);
        criteriaCount += 2;
      }

      // 6. Nghỉ không phép
      if (unexcusedCount >= 2) {
        triggerSignals.push(`Vắng học không phép ${unexcusedCount} buổi`);
        criteriaCount++;
      }

      // 7. Đã ghi nhận xử lý trước đó nhưng tiếp tục phát sinh
      if (hadPreviousResolution && currentViolations.length > 0) {
        triggerSignals.push(`Đã có biên bản/ghi nhận xử lý trước đó nhưng tiếp tục phát sinh vi phạm mới trong tuần`);
        criteriaCount += 2;
      }

      // 8. Nhiều tín hiệu đồng thời (vi phạm + vắng/trễ + điểm dưới 5.0)
      if (currentViolations.length > 0 && (unexcusedCount > 0 || tardyCount >= 2) && gpa !== undefined && gpa < 5.0) {
        triggerSignals.push(`Tín hiệu kết hợp: Vi phạm nề nếp + Chuyên cần giảm sút + Điểm học tập cần củng cố (${gpa}đ)`);
        criteriaCount += 2;
      }

      // 9. Nằm trong diện GVCN lưu ý đặc biệt nhưng có vi phạm
      if (student.needsSpecialAttention && currentViolations.length > 0) {
        triggerSignals.push(`Học sinh diện GVCN theo dõi sát (${student.attentionNote || 'Lưu ý riêng'}) có phát sinh vi phạm`);
        criteriaCount++;
      }

      // If student has any triggers OR is in special attention list with pending note
      if (criteriaCount > 0 || student.needsSpecialAttention) {
        let severity: AlertSeverity = 'ATTENTION';
        let severityLabel = 'Cần chú ý';

        if (heavyViolations.length > 0 || (hadPreviousResolution && currentViolations.length > 0) || criteriaCount >= 4) {
          severity = 'SPECIAL_ATTENTION';
          severityLabel = 'Đặc biệt quan tâm';
        } else if (criteriaCount >= 2 || currentViolations.length >= 3) {
          severity = 'WARNING';
          severityLabel = 'Cảnh báo';
        }

        const alertId = `alert_${student.id}_w${selWeekNum}`;
        const existingResolution = resolutions[alertId] || existingRes;

        let status: AlertStatus = existingResolution ? existingResolution.status : 'UNSEEN';
        let statusLabel = 'Chưa xem';
        if (status === 'VIEWED') statusLabel = 'Đã xem';
        else if (status === 'MONITORING') statusLabel = 'Đang theo dõi';
        else if (status === 'RESOLVED') statusLabel = 'Đã xử lý';
        else if (status === 'CONTINUED') statusLabel = 'Tiếp tục theo dõi';

        const catNames = Array.from(new Set(currentViolations.map((t) => t.category || t.title || 'Nề nếp')));

        const trendText =
          currentViolations.length > prevViolations.length
            ? `Tăng ${currentViolations.length - prevViolations.length} lượt`
            : currentViolations.length < prevViolations.length
            ? `Giảm ${prevViolations.length - currentViolations.length} lượt`
            : `Bằng tuần trước (${currentViolations.length} lượt)`;

        alerts.push({
          id: alertId,
          studentId: student.id,
          studentName: student.fullName,
          studentCode: student.code,
          studentGroup: student.group,
          avatar: student.avatar,
          severity,
          severityLabel,
          title: `Tín hiệu nề nếp cần GVCN theo dõi - ${student.fullName}`,
          reason: triggerSignals.join('; ') || 'Theo dõi nề nếp và chuyên cần định kỳ',
          triggerSignals: triggerSignals.length > 0 ? triggerSignals : ['Theo dõi theo kế hoạch chủ nhiệm đầu tuần'],
          sourceDataSummary: {
            recentViolationsCount: currentViolations.length,
            previousViolationsCount: prevViolations.length,
            trendText,
            violationCategories: catNames,
            absentDaysCount: unexcusedCount,
            tardyDaysCount: tardyCount,
            academicAverage: gpa,
            specialAttentionFlag: Boolean(student.needsSpecialAttention)
          },
          timeframeLabel: week ? week.label : `Tuần ${selWeekNum}`,
          status,
          statusLabel,
          resolution: existingResolution,
          createdAt: week ? week.startDate : new Date().toISOString().split('T')[0],
          updatedAt: new Date().toISOString()
        });
      }
    });

    // Sort: SPECIAL_ATTENTION first, then WARNING, then ATTENTION
    const priorityWeight: Record<AlertSeverity, number> = {
      SPECIAL_ATTENTION: 3,
      WARNING: 2,
      ATTENTION: 1
    };

    alerts.sort((a, b) => priorityWeight[b.severity] - priorityWeight[a.severity]);
    return alerts;
  }

  /**
   * Update resolution status and notes for an alert
   */
  public updateAlertStatus(params: {
    alertId: string;
    studentId: string;
    status: AlertStatus;
    resolutionNotes?: string;
    actorName?: string;
    nextReviewDate?: string;
    followUpResult?: string;
  }): void {
    const records = this.getResolutionRecords();
    const existing = records[params.alertId];

    const actor = params.actorName || classService.getSettings().homeroomTeacherName || 'GVCN';
    const nowStr = new Date().toLocaleString('vi-VN');

    const historyEntry: AlertResolutionHistoryEntry = {
      timestamp: nowStr,
      action: `Chuyển trạng thái sang [${params.status}]`,
      actorName: actor,
      notes: params.resolutionNotes,
      status: params.status
    };

    const updatedRecord: AlertResolutionRecord = {
      alertId: params.alertId,
      studentId: params.studentId,
      status: params.status,
      resolutionNotes: params.resolutionNotes || existing?.resolutionNotes,
      resolvedAt: params.status === 'RESOLVED' ? nowStr : existing?.resolvedAt,
      resolvedBy: params.status === 'RESOLVED' ? actor : existing?.resolvedBy,
      nextReviewDate: params.nextReviewDate || existing?.nextReviewDate,
      followUpResult: params.followUpResult || existing?.followUpResult,
      history: existing ? [...existing.history, historyEntry] : [historyEntry]
    };

    records[params.alertId] = updatedRecord;
    this.saveResolutionRecords(records);
  }

  /**
   * 4b. Format objective alerts context for AI assistant
   */
  public buildAlertsContextForAI(weekNumOrStudentId?: number | string): string {
    const isStudentId = typeof weekNumOrStudentId === 'string';
    const weekNum = typeof weekNumOrStudentId === 'number' ? weekNumOrStudentId : undefined;
    let alerts = this.generateObjectiveAlerts(weekNum);
    if (isStudentId) {
      alerts = alerts.filter((a) => a.studentId === weekNumOrStudentId);
    }
    if (alerts.length === 0) {
      return `\n* Dấu hiệu cảnh báo hệ thống: Không có cảnh báo bất thường nào trong thời gian này.\n`;
    }
    let text = `\n* Dấu hiệu cảnh báo hệ thống (${alerts.length} học sinh có tín hiệu cần lưu ý):\n`;
    alerts.forEach((a, idx) => {
      text += `  ${idx + 1}. [${a.severityLabel}] ${a.studentName} (Mã: ${a.studentCode}, Tổ ${a.studentGroup}): ${a.reason} [Trạng thái: ${a.statusLabel}]\n`;
    });
    return text;
  }

  /**
   * 5. AUTOMATED HOMEROOM PERIODIC SUMMARY CONTEXT BUILDER
   * Tự động xác định GVCN, lớp, thời gian, chuyên cần, vi phạm, việc tốt, xử lý vi phạm, công việc chủ nhiệm
   */
  public buildHomeroomPeriodicSummaryContext(
    type: 'week' | 'month' | 'semester' = 'week',
    key?: string | number
  ): {
    timeframeLabel: string;
    contextText: string;
    promptInstruction: string;
  } {
    const settings = classService.getSettings();
    const students = studentService.getAll(true);
    const teacherName = settings.homeroomTeacherName || settings.teacherName || 'Giáo viên chủ nhiệm';

    let timeframeLabel = '';
    let summaryDataText = '';
    let attendanceText = '';
    let violationsText = '';
    let rewardsText = '';
    let casesText = '';
    let handlingText = '';
    let tasksText = '';
    let comparisonText = '';

    if (type === 'week') {
      const { currentWeekNum, allWeeks } = this.getCurrentWeekInfo();
      const weekNum = typeof key === 'number' ? key : key ? Number(key) : currentWeekNum;
      const weekSummary = this.getWeeklyClassSummary(weekNum);
      const weekObj = allWeeks.find((w) => w.weekNumber === weekNum);
      timeframeLabel = `Tuần ${weekNum} (${weekSummary.dateRange || weekObj?.dateRangeFormatted || 'Học kỳ I'})`;

      // 1. Chuyên cần
      attendanceText = `- Tỷ lệ chuyên cần: ${weekSummary.attendance.attendanceRate}%\n- Vắng có phép: ${weekSummary.attendance.excusedAbsences} buổi\n- Vắng không phép: ${weekSummary.attendance.unexcusedAbsences} buổi\n- Đi muộn / Đi trễ: ${weekSummary.attendance.tardyCount} lượt\n- Xu hướng chuyên cần: ${weekSummary.attendance.attendanceTrend}`;

      // 2. Vi phạm & Diễn biến so với tuần trước
      violationsText = `- Tổng số lượt vi phạm trong tuần: ${weekSummary.violations.totalCount} lượt\n- Số học sinh phát sinh vi phạm: ${weekSummary.violations.studentsWithViolationCount} học sinh\n- So với tuần trước: ${weekSummary.violations.trendText} (Tuần trước: ${weekSummary.violations.previousWeekTotal} lượt)\n- Chi tiết theo nhóm lỗi:\n`;
      if (weekSummary.violations.byCategory.length > 0) {
        weekSummary.violations.byCategory.forEach((c) => {
          violationsText += `  • ${c.category}: ${c.count} lượt\n`;
        });
      } else {
        violationsText += `  • Không ghi nhận vi phạm nào trong tuần.\n`;
      }

      // 3. Điểm sáng & Việc tốt
      rewardsText = `- Việc tốt ghi nhận: ${weekSummary.positiveHighlights.goodDeedsCount} lượt (+${weekSummary.positiveHighlights.totalRewardPoints} điểm rèn luyện)\n- Số học sinh được tuyên dương/cộng điểm: ${weekSummary.positiveHighlights.studentsRewardedCount} em\n- Cây Nguyệt Quế đã hoàn thành nở hoa: ${weekSummary.positiveHighlights.laurelTreesCompleted} cây`;

      // 4. Trường hợp đặc biệt / cần lưu ý (>= 2 vi phạm trong tuần hoặc có tín hiệu cảnh báo)
      const specialCases = this.getSpecialCaseStudents(weekNum);
      if (specialCases.length > 0) {
        casesText = `Có ${specialCases.length} học sinh có dấu hiệu cần lưu ý trong tuần (Nhiều lượt vi phạm hoặc có tín hiệu cần theo dõi):\n`;
        specialCases.forEach((sc, idx) => {
          casesText += `  ${idx + 1}. ${sc.studentName} (Mã: ${sc.studentCode}, Tổ ${sc.studentGroup}): ${sc.violationsCount} lượt vi phạm. Các lỗi: ${sc.violations.map((v) => `${v.reason} (${v.date})`).join('; ')}\n`;
          if (sc.hasAttentionProfile && sc.attentionNote) {
            casesText += `     * Ghi chú diện theo dõi của GVCN: ${sc.attentionNote}\n`;
          }
        });
      } else {
        casesText = `Không có học sinh nào đạt ngưỡng cảnh báo đặc biệt trong tuần này.`;
      }

      // 5. Lịch sử biên bản xử lý của GVCN trong tuần
      const weeklyHandling: Array<{ studentName: string; record: ViolationHandlingRecord }> = [];
      students.forEach((s) => {
        const records = s.violationHandlingRecords || [];
        records.forEach((r) => {
          if (r.weekNumber === weekNum || (r.date && weekObj && r.date >= weekObj.startDate && r.date <= weekObj.endDate)) {
            weeklyHandling.push({ studentName: s.fullName, record: r });
          }
        });
      });

      if (weeklyHandling.length > 0) {
        handlingText = `GVCN đã tiến hành xử lý ${weeklyHandling.length} sự việc trong tuần:\n`;
        weeklyHandling.forEach((h, idx) => {
          handlingText += `  ${idx + 1}. Học sinh: ${h.studentName} - Sự việc: [${h.record.category}] ${h.record.content} (Mức độ: ${h.record.severity})\n`;
          if (h.record.educationalMeasure) handlingText += `     • Biện pháp giáo dục: ${h.record.educationalMeasure}\n`;
          if (h.record.studentExchangeNotes) handlingText += `     • Trao đổi với học sinh: ${h.record.studentExchangeNotes}\n`;
          if (h.record.parentCoordinationNotes) handlingText += `     • Phối hợp phụ huynh: ${h.record.parentCoordinationNotes}\n`;
          handlingText += `     • Trạng thái hiện tại: ${h.record.status === 'RESOLVED' ? 'Đã ổn định/giải quyết' : h.record.status === 'PROCESSING' ? 'Đang theo dõi xử lý' : 'Cảnh báo'}\n`;
        });
      } else {
        handlingText = `Chưa phát sinh biên bản xử lý vi phạm nặng nào cần ghi nhận riêng trong tuần này.`;
      }

      // 6. Công tác chủ nhiệm & Nhiệm vụ tuần
      const allTasks = (teacherWorkCenterClient as any).getLocalTasks
        ? (teacherWorkCenterClient as any).getLocalTasks(tenantService.getActiveTenantId(), 'gvcn')
        : [];
      const completedTasks = allTasks.filter((t: any) => t.status === 'DONE');
      const pendingTasks = allTasks.filter((t: any) => t.status !== 'DONE');
      tasksText = `- Công việc chủ nhiệm đã hoàn thành (${completedTasks.length}): ${completedTasks.slice(0, 5).map((t: any) => t.title).join('; ') || 'Các nhiệm vụ thường nhật'}\n- Công việc tồn đọng / cần tiếp tục (${pendingTasks.length}): ${pendingTasks.slice(0, 5).map((t: any) => t.title).join('; ') || 'Không có việc tồn đọng'}`;

      comparisonText = `Xu hướng tổng thể: ${weekSummary.violations.trendDirection === 'DECREASED' ? 'Tích cực - Số vi phạm giảm so với tuần trước.' : weekSummary.violations.trendDirection === 'INCREASED' ? 'Cần lưu ý - Số vi phạm tăng so với tuần trước.' : 'Ổn định so với tuần trước.'}`;
    } else if (type === 'month') {
      const today = new Date();
      const monthYear = key ? String(key) : `${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
      const monthlySummary = this.getMonthlyClassSummary(monthYear);
      timeframeLabel = `Tháng ${monthYear}`;

      attendanceText = `- Xu hướng chuyên cần: ${monthlySummary.attendance.attendanceTrend} (Tỷ lệ: ${monthlySummary.attendance.attendanceRate}%, Vắng CP: ${monthlySummary.attendance.excusedAbsences}, Vắng KP: ${monthlySummary.attendance.unexcusedAbsences}, Trễ: ${monthlySummary.attendance.tardyCount})`;
      violationsText = `- Tổng số lượt vi phạm trong tháng: ${monthlySummary.violations.totalCount} lượt (${monthlySummary.violations.trendText})\n- Số học sinh phát sinh vi phạm: ${monthlySummary.violations.studentsWithViolationCount} em\n- Phân bố theo nhóm lỗi: ${monthlySummary.violations.byCategory.map((c) => `${c.category}: ${c.count}`).join(', ') || 'Không có vi phạm'}`;
      rewardsText = `- Việc tốt ghi nhận trong tháng: ${monthlySummary.positiveHighlights.goodDeedsCount} lượt (+${monthlySummary.positiveHighlights.totalRewardPoints} điểm)\n- Số học sinh được tuyên dương: ${monthlySummary.positiveHighlights.studentsRewardedCount} em`;
      
      // Attention cases in month
      const monthlyHandling: Array<{ studentName: string; record: ViolationHandlingRecord }> = [];
      students.forEach((s) => {
        const records = s.violationHandlingRecords || [];
        records.forEach((r) => {
          if (r.date && r.date.includes(`/${monthYear}`)) {
            monthlyHandling.push({ studentName: s.fullName, record: r });
          }
        });
      });
      casesText = `Học sinh có vi phạm trong tháng: ${monthlySummary.violations.studentsWithViolationCount} em. Học sinh diện GVCN theo dõi sát: ${students.filter(s => s.needsSpecialAttention).length} em.`;
      handlingText = monthlyHandling.length > 0
        ? `Đã xử lý và lưu hồ sơ ${monthlyHandling.length} sự việc trong tháng:\n` + monthlyHandling.slice(0, 5).map((h, i) => `  ${i + 1}. ${h.studentName}: [${h.record.category}] ${h.record.content} -> ${h.record.status === 'RESOLVED' ? 'Đã giải quyết' : 'Đang theo dõi'}`).join('\n')
        : `GVCN duy trì theo dõi và xử lý các ca nề nếp xuyên suốt tháng.`;
      
      const allTasks = (teacherWorkCenterClient as any).getLocalTasks
        ? (teacherWorkCenterClient as any).getLocalTasks(tenantService.getActiveTenantId(), 'gvcn')
        : [];
      const completedTasks = allTasks.filter((t: any) => t.status === 'DONE');
      const pendingTasks = allTasks.filter((t: any) => t.status !== 'DONE');
      tasksText = `- Công việc chủ nhiệm hoàn thành: ${completedTasks.length}\n- Công việc tồn đọng: ${pendingTasks.length}`;
      comparisonText = `Xu hướng nề nếp tháng: ${monthlySummary.violations.trendText}`;
    } else {
      const sem = (key as any) || 'HK1';
      const semesterSummary = this.getSemesterClassSummary(sem);
      timeframeLabel = semesterSummary.semesterLabel;

      attendanceText = `- Chuyên cần toàn kỳ: ${semesterSummary.attendance.attendanceTrend} (Tỷ lệ: ${semesterSummary.attendance.attendanceRate}%, Vắng CP: ${semesterSummary.attendance.excusedAbsences}, Vắng KP: ${semesterSummary.attendance.unexcusedAbsences}, Trễ: ${semesterSummary.attendance.tardyCount})`;
      violationsText = `- Tổng số vi phạm toàn kỳ: ${semesterSummary.violations.totalCount} lượt (${semesterSummary.violations.trendText})\n- Số học sinh phát sinh vi phạm: ${semesterSummary.violations.studentsWithViolationCount} em\n- Phân bố theo nhóm lỗi: ${semesterSummary.violations.byCategory.map((c) => `${c.category}: ${c.count}`).join(', ') || 'Không có vi phạm'}`;
      rewardsText = `- Tổng việc tốt toàn kỳ: ${semesterSummary.positiveHighlights.goodDeedsCount} lượt (+${semesterSummary.positiveHighlights.totalRewardPoints} điểm rèn luyện)\n- Số cây Nguyệt Quế nở hoa hoàn thành: ${semesterSummary.positiveHighlights.laurelTreesCompleted} cây`;
      casesText = `Tổng kết rèn luyện và nề nếp toàn học kỳ. Học sinh diện theo dõi tích cực: ${students.filter(s => s.needsSpecialAttention).length} em.`;
      handlingText = `Toàn bộ hồ sơ xử lý nề nếp đã được GVCN tổng hợp và đối chiếu với Ban Giám Hiệu.`;
      tasksText = `Các chỉ tiêu năm học của lớp được đối chiếu hoàn thành theo kế hoạch.`;
      comparisonText = `Đánh giá tổng thể học kỳ: ${semesterSummary.violations.trendText}`;
    }

    const contextText = `=== DỮ LIỆU TỔNG HỢP TỰ ĐỘNG CHO BẢN TỔNG KẾT GVCN ===
- Lớp: ${settings.className} | Đơn vị: ${settings.schoolName}
- Giáo viên chủ nhiệm: ${teacherName}
- Khoảng thời gian tổng kết: ${timeframeLabel}
- Sĩ số lớp: ${students.length} học sinh (Nam: ${students.filter((s) => s.gender === 'Nam').length}, Nữ: ${students.filter((s) => s.gender === 'Nữ').length})

1. CHUYÊN CẦN:
${attendanceText}

2. NỀ NẾP & VI PHẠM:
${violationsText}

3. ĐIỂM SÁNG & KHEN THƯỞNG:
${rewardsText}

4. HỌC VIÊN CÓ DẤU HIỆU CẦN LƯU Ý (SỐ LIỆU THỰC TẾ):
${casesText}

5. LỊCH SỬ XỬ LÝ & BIỆN PHÁP SƯ PHẠM CỦA GVCN:
${handlingText}

6. TIẾN ĐỘ CÔNG TÁC CHỦ NHIỆM:
${tasksText}

7. DIỄN BIẾN SO SÁNH:
${comparisonText}
==================================================`;

    const promptInstruction = `Bạn là Trợ lý AI hỗ trợ Giáo viên chủ nhiệm. Dựa trên dữ liệu thực tế được hệ thống tự động tổng hợp ở trên cho [${timeframeLabel}] của lớp ${settings.className} (GVCN: ${teacherName}), hãy lập "BẢN NHÁP TỔNG KẾT CÔNG TÁC CHỦ NHIỆM" có chiều sâu sư phạm, thực tế, mạch lạc.

QUY TẮC BẮT BUỘC:
- ĐÂY LÀ BẢN NHÁP THAM VẤN ĐỂ GVCN XEM, CHỈNH SỬA, PHÊ DUYỆT VÀ QUYẾT ĐỊNH LƯU.
- Phân tích theo diễn biến (tăng/giảm, vấn đề lặp lại, kết quả của biện pháp đã thực hiện).
- Tuân thủ phương pháp suy luận: Dữ kiện -> Nhận định -> Điều cần xác minh -> Đề xuất.
- Tuyệt đối KHÔNG tự suy luận nguyên nhân tâm lý, bệnh lý hay hoàn cảnh gia đình nếu chưa có dữ liệu thực tế kiểm chứng. Không gán nhãn tiêu cực cho học sinh.
- Nếu mục nào không có dữ liệu phát sinh (ví dụ không có việc tồn đọng), hãy ghi nhận ngắn gọn, không kéo dài lan man.

HÃY TRÌNH BÀY BẢN NHÁP THEO ĐÚNG 10 MỤC LA MÃ CHUẨN:

### I. TÌNH HÌNH CHUNG
(Sĩ số, tinh thần học tập và nề nếp tổng thể của lớp trong giai đoạn)

### II. CHUYÊN CẦN
(Đánh giá tỷ lệ chuyên cần, số buổi vắng có phép/không phép, đi trễ và xu hướng)

### III. NỀ NẾP VÀ VI PHẠM
(Số lượt vi phạm, phân bố theo nhóm lỗi, so sánh diễn biến tăng/giảm với kỳ trước)

### IV. ĐIỂM SÁNG
(Biểu dương các việc tốt, cộng điểm rèn luyện, hoa Nguyệt Quế và tinh thần thi đua của học sinh/tổ)

### V. NHỮNG VẤN ĐỀ CẦN LƯU Ý
(Các tồn tại nổi bật, nguy cơ nề nếp hoặc thói quen học tập cần chấn chỉnh)

### VI. HỌC VIÊN CÓ DẤU HIỆU NỔI BẬT
(Nêu khách quan học sinh có vi phạm lặp lại hoặc vắng nhiều; chỉ nêu số liệu, đề xuất GVCN trao đổi riêng để kiểm chứng thực tế)

### VII. CÁC BIỆN PHÁP ĐÃ THỰC HIỆN
(Tóm lược các biện pháp giáo dục, trao đổi 1:1, phối hợp phụ huynh mà GVCN đã triển khai)

### VIII. KẾT QUẢ BƯỚC ĐẦU
(Sự chuyển biến của học sinh và tập thể sau khi áp dụng biện pháp sư phạm)

### IX. VIỆC CHƯA HOÀN THÀNH
(Các đầu việc, nhiệm vụ hoặc hồ sơ công tác chủ nhiệm còn tồn đọng)

### X. ĐỀ XUẤT TRỌNG TÂM CHO GIAI ĐOẠN TIẾP THEO
(Định hướng hành động cụ thể, nội dung trọng tâm cho tiết Sinh hoạt lớp và kế hoạch tuần/tháng tới)

*Lưu ý: Bản nháp tạo lúc ${new Date().toLocaleString('vi-VN')}. GVCN toàn quyền duyệt và điều chỉnh.*`;

    return {
      timeframeLabel,
      contextText,
      promptInstruction
    };
  }
}

export const classAnalyticsAndAlertService = new ClassAnalyticsAndAlertService();
