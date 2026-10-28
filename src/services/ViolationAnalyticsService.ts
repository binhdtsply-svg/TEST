/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PointTransaction } from '../types';
import { trainingService } from './TrainingService';
import { SchoolYearDateNormalizer } from './SchoolYearDateNormalizer';
import { schoolWeekService } from './SchoolWeekService';

export interface ViolationStatsSummary {
  /**
   * SỐ LƯỢT VI PHẠM (Quy tắc đếm chuẩn: bằng đúng tổng số bản ghi vi phạm thực tế)
   */
  totalCount: number;
  /**
   * SỐ HỌC VIÊN CÓ VI PHẠM (Quy tắc đếm chuẩn: đếm DISTINCT số học viên có vi phạm)
   */
  studentsWithViolationCount: number;
  /**
   * Tổng điểm trừ vi phạm (giá trị tuyệt đối)
   */
  totalPenaltyPoints: number;
  /**
   * Phân loại theo nhóm vi phạm (sắp xếp giảm dần theo số lượt)
   */
  byCategory: Array<{ category: string; count: number }>;
  /**
   * Nhãn khoảng thời gian tương ứng
   */
  dateRangeLabel: string;
  startDate?: string;
  endDate?: string;
  /**
   * DỮ LIỆU CHI TIẾT (Danh sách bản ghi vi phạm thực tế)
   */
  records: PointTransaction[];
}

/**
 * Kiểm tra xem một PointTransaction có phải là bản ghi vi phạm / kỷ luật hay không
 */
export function isViolationTransaction(t: PointTransaction): boolean {
  if (!t) return false;

  // 1. Điểm âm luôn là vi phạm / trừ điểm
  if (typeof t.points === 'number' && t.points < 0) {
    return true;
  }

  // 2. Điểm dương là khen thưởng / việc tốt, không phải vi phạm
  if (typeof t.points === 'number' && t.points > 0) {
    return false;
  }

  // 3. Nếu có cờ / loại vi phạm rõ ràng
  if ((t as any).submissionType === 'violation' || (t as any).type === 'violation' || (t as any).isViolation === true) {
    return true;
  }

  // 4. Nếu điểm = 0 hoặc không có điểm, kiểm tra phân loại và lý do
  const cat = (t.category || '').toLowerCase();
  const reason = (
    t.reason ||
    (t as any).description ||
    (t as any).title ||
    ''
  ).toLowerCase();

  const keywords = [
    'vi phạm',
    'nội quy',
    'đi trễ',
    'muộn',
    'nghỉ không phép',
    'kỷ luật',
    'nhắc nhở',
    'trốn học',
    'đồng phục',
    'tác phong',
    'điện thoại'
  ];

  return keywords.some((k) => cat.includes(k) || reason.includes(k));
}

/**
 * Kiểm tra xem giao dịch đã được phê duyệt chính thức hay chưa
 */
export function isApprovedTransaction(t: PointTransaction): boolean {
  if (!t) return false;
  const s = (t.status || (t as any).reviewStatus || '').toString().toLowerCase().trim();
  return s === 'approved' || s === 'chính thức' || s === 'chinh thuc';
}

/**
 * Trích xuất ngày chuẩn ISO (YYYY-MM-DD) từ bản ghi vi phạm, bảo toàn chính xác timezone không bị lệch ngày
 */
export function getTransactionISODate(t: PointTransaction): string {
  if (!t) return '';
  const rawDate =
    t.eventDate ||
    t.createdAt ||
    (t as any).approvedAt ||
    (t as any).date ||
    t.timestamp;

  if (!rawDate) return '';
  return SchoolYearDateNormalizer.toISODateString(rawDate);
}

class ViolationAnalyticsService {
  private listeners: Array<() => void> = [];

  constructor() {
    queueMicrotask(() => {
      if (typeof trainingService !== 'undefined' && trainingService?.subscribe) {
        trainingService.subscribe(() => {
          this.notify();
        });
      }
    });
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((l) => {
      try {
        l();
      } catch (err) {
        console.error('[ViolationAnalyticsService] Listener error:', err);
      }
    });
  }

  /**
   * Lấy toàn bộ DỮ LIỆU VI PHẠM GỐC đã được duyệt
   */
  public getAllApprovedViolations(): PointTransaction[] {
    const all = trainingService.getAllTransactions();
    return all.filter((t) => isApprovedTransaction(t) && isViolationTransaction(t));
  }

  /**
   * Tổng hợp thống kê chuẩn từ danh sách bản ghi vi phạm
   */
  public summarize(
    violations: PointTransaction[],
    dateRangeLabel: string = '',
    startDate?: string,
    endDate?: string
  ): ViolationStatsSummary {
    const totalCount = violations.length; // SỐ LƯỢT VI PHẠM = TỔNG SỐ BẢN GHI THỰC TẾ
    const studentIds = new Set(
      violations.map((v) => v.studentId).filter(Boolean)
    );
    const studentsWithViolationCount = studentIds.size; // SỐ HỌC VIÊN CÓ VI PHẠM (DISTINCT)

    const totalPenaltyPoints = Math.abs(
      violations.reduce((sum, v) => sum + (v.points < 0 ? v.points : 0), 0)
    );

    const catMap = new Map<string, number>();
    violations.forEach((v) => {
      const c = v.category || (v as any).title || 'Vi phạm nội quy';
      catMap.set(c, (catMap.get(c) || 0) + 1);
    });

    const byCategory = Array.from(catMap.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalCount,
      studentsWithViolationCount,
      totalPenaltyPoints,
      byCategory,
      dateRangeLabel,
      startDate,
      endDate,
      records: violations
    };
  }

  /**
   * 1. THỐNG KÊ NGÀY: Lấy vi phạm theo ngày cụ thể (mặc định hôm nay)
   */
  public getDailyViolations(targetDateInput?: string | Date): ViolationStatsSummary {
    const all = this.getAllApprovedViolations();
    let targetIso = '';

    if (targetDateInput instanceof Date) {
      targetIso = SchoolYearDateNormalizer.formatDateString(
        targetDateInput.getFullYear(),
        targetDateInput.getMonth() + 1,
        targetDateInput.getDate()
      );
    } else if (typeof targetDateInput === 'string' && targetDateInput.trim()) {
      targetIso = SchoolYearDateNormalizer.toISODateString(targetDateInput);
    }

    if (!targetIso) {
      const now = new Date();
      targetIso = SchoolYearDateNormalizer.formatDateString(
        now.getFullYear(),
        now.getMonth() + 1,
        now.getDate()
      );
    }

    const filtered = all.filter((t) => getTransactionISODate(t) === targetIso);
    const parts = SchoolYearDateNormalizer.parseDateParts(targetIso);
    const label = parts
      ? `Ngày ${String(parts.day).padStart(2, '0')}/${String(parts.month).padStart(2, '0')}/${parts.year}`
      : `Ngày ${targetIso}`;

    return this.summarize(filtered, label, targetIso, targetIso);
  }

  /**
   * 2. THỐNG KÊ TUẦN: Lấy vi phạm theo tuần (theo số tuần học hoặc theo ngày bất kỳ)
   */
  public getWeeklyViolations(targetInput?: string | Date | number): ViolationStatsSummary {
    const all = this.getAllApprovedViolations();
    let startDate = '';
    let endDate = '';
    let label = 'Tuần này';

    if (typeof targetInput === 'number') {
      const allStudyWeeks = schoolWeekService.getAllStudyWeeks();
      const studyWeek = allStudyWeeks.find((w) => w.weekNumber === targetInput);
      if (studyWeek) {
        startDate = studyWeek.startDate;
        endDate = studyWeek.endDate;
        label = studyWeek.label;
      }
    }

    if (!startDate || !endDate) {
      let refDate: Date = new Date();
      if (typeof targetInput === 'string' && targetInput.trim()) {
        const parts = SchoolYearDateNormalizer.parseDateParts(targetInput);
        if (parts) {
          refDate = new Date(parts.year, parts.month - 1, parts.day);
        }
      } else if (targetInput instanceof Date) {
        refDate = targetInput;
      }

      const weekRange = SchoolYearDateNormalizer.getMondayToSundayRange(refDate);
      if (weekRange) {
        startDate = weekRange.mondayStr;
        endDate = weekRange.sundayStr;
        const mParts = SchoolYearDateNormalizer.parseDateParts(weekRange.mondayStr);
        const sParts = SchoolYearDateNormalizer.parseDateParts(weekRange.sundayStr);
        if (mParts && sParts) {
          label = `Tuần (${String(mParts.day).padStart(2, '0')}/${String(mParts.month).padStart(2, '0')} - ${String(sParts.day).padStart(2, '0')}/${String(sParts.month).padStart(2, '0')})`;
        } else {
          label = `Tuần (${startDate} - ${endDate})`;
        }
      }
    }

    const filtered = all.filter((t) => {
      const d = getTransactionISODate(t);
      if (!d) return false;
      return d >= startDate && d <= endDate;
    });

    return this.summarize(filtered, label, startDate, endDate);
  }

  /**
   * 3. THỐNG KÊ THÁNG: Lấy vi phạm theo tháng (MM/YYYY)
   */
  public getMonthlyViolations(targetMonthYear?: string | Date): ViolationStatsSummary {
    const all = this.getAllApprovedViolations();
    let targetYear = 0;
    let targetMonth = 0;

    if (targetMonthYear instanceof Date) {
      targetYear = targetMonthYear.getFullYear();
      targetMonth = targetMonthYear.getMonth() + 1;
    } else if (targetMonthYear && typeof targetMonthYear === 'string') {
      const parts = SchoolYearDateNormalizer.parseDateParts(targetMonthYear);
      if (parts) {
        targetYear = parts.year;
        targetMonth = parts.month;
      } else {
        const myMatch = targetMonthYear.match(/(\d{1,2})[\/\-](\d{4})/);
        if (myMatch) {
          targetMonth = parseInt(myMatch[1], 10);
          targetYear = parseInt(myMatch[2], 10);
        }
      }
    }

    if (!targetYear || !targetMonth) {
      const now = new Date();
      targetYear = now.getFullYear();
      targetMonth = now.getMonth() + 1;
    }

    const monthStr = String(targetMonth).padStart(2, '0');
    const label = `Tháng ${monthStr}/${targetYear}`;
    const startIso = `${targetYear}-${monthStr}-01`;
    const lastDay = new Date(targetYear, targetMonth, 0).getDate();
    const endIso = `${targetYear}-${monthStr}-${String(lastDay).padStart(2, '0')}`;

    const filtered = all.filter((t) => {
      const d = getTransactionISODate(t);
      if (!d) return false;
      const parts = SchoolYearDateNormalizer.parseDateParts(d);
      return parts ? parts.year === targetYear && parts.month === targetMonth : false;
    });

    return this.summarize(filtered, label, startIso, endIso);
  }

  /**
   * 4. TỔNG QUAN: Lấy thống kê vi phạm đồng bộ theo khoảng thời gian được chọn
   */
  public getOverviewViolations(
    period: 'today' | 'day' | 'week' | 'month' | 'semester' | 'year' | 'all' = 'week'
  ): ViolationStatsSummary {
    if (period === 'today' || period === 'day') {
      return this.getDailyViolations();
    }
    if (period === 'week') {
      return this.getWeeklyViolations();
    }
    if (period === 'month') {
      return this.getMonthlyViolations();
    }

    // Học kỳ hoặc Cả năm: lấy toàn bộ vi phạm đã duyệt
    const all = this.getAllApprovedViolations();
    const label = period === 'semester' ? 'Học kỳ I' : 'Cả năm học';
    return this.summarize(all, label);
  }
}

export const violationAnalyticsService = new ViolationAnalyticsService();
