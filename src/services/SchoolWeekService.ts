/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SchoolYearTimelineConfig, ExcludedPeriod, CurrentStudyPeriodResult } from '../types';
import { classService } from './ClassService';
import { tenantService } from './TenantService';
import { SchoolYearDateNormalizer } from './SchoolYearDateNormalizer';

export interface WeekCalculationResult {
  weekNumber: number; // 1..35
  semester: 'HK1' | 'HK2' | 'Hè' | 'Nghỉ lễ';
  semesterLabel: string; // 'Học kỳ I' | 'Học kỳ II' | 'Kỳ nghỉ Hè' | 'Nghỉ lễ/Tết'
  label: string; // e.g. "Tuần 5 • HKI" or "Tuần 22 • HKII" or "Nghỉ Tết"
  fullLabel: string; // e.g. "Tuần 5 (Học kỳ I)"
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  dateRangeFormatted: string; // e.g. "29/09 - 05/10/2025"
  isHoliday: boolean;
  holidayName?: string;
  isCurrent: boolean;
  totalWeeksInYear: number;
  badgeText: string;
  statusText: string;
  schoolYearLabel?: string;
}

export const DEFAULT_TIMELINE: SchoolYearTimelineConfig = {
  startDateHK1: '2025-09-05',
  endDateHK1: '2026-01-16',
  startDateHK2: '2026-01-19',
  endDateHK2: '2026-05-30',
  totalWeeksHK1: 18,
  totalWeeksHK2: 17,
  totalWeeks: 35,
  academicYearStart: '2025-09-05',
  academicYearEnd: '2026-05-30',
  semester1Start: '2025-09-05',
  semester1End: '2026-01-16',
  semester2Start: '2026-01-19',
  semester2End: '2026-05-30',
  semester1Weeks: 18,
  semester2Weeks: 17,
  firstStudyWeekStartDate: '2025-09-05',
  schoolYearLabel: '2025 - 2026',
  excludedPeriods: [
    {
      id: 'break-tet',
      name: 'Nghỉ Tết Nguyên Đán',
      startDate: '2026-02-12',
      endDate: '2026-02-23',
      reason: 'Nghỉ Tết theo quy định',
      countAsStudyWeek: false
    }
  ],
  excludedRanges: [
    {
      id: 'break-tet',
      name: 'Nghỉ Tết Nguyên Đán',
      startDate: '2026-02-12',
      endDate: '2026-02-23',
      reason: 'Nghỉ Tết theo quy định',
      countAsStudyWeek: false
    }
  ]
};

class SchoolWeekService {
  private listeners: Array<() => void> = [];

  constructor() {
    queueMicrotask(() => {
      if (typeof classService !== 'undefined' && classService?.subscribe) {
        classService.subscribe(() => this.notify());
      }
      if (typeof tenantService !== 'undefined' && tenantService?.subscribe) {
        tenantService.subscribe(() => this.notify());
      }
    });
  }

  public getDefaultTimeline(): SchoolYearTimelineConfig {
    return { ...DEFAULT_TIMELINE };
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private notify() {
    this.listeners.forEach((l) => {
      try {
        l();
      } catch (err) {
        console.error('SchoolWeekService listener error:', err);
      }
    });
  }

  public getTimelineConfig(): SchoolYearTimelineConfig {
    const settings = classService.getSettings();
    if (settings.schoolYearTimeline) {
      return SchoolYearDateNormalizer.normalizeTimeline(
        settings.schoolYearTimeline,
        settings.academicYear || settings.schoolYearLabel || '2025 - 2026'
      );
    }
    return SchoolYearDateNormalizer.normalizeTimeline(DEFAULT_TIMELINE, settings.academicYear || '2025 - 2026');
  }

  public updateTimelineConfig(newTimeline: Partial<SchoolYearTimelineConfig>): void {
    const current = this.getTimelineConfig();
    const updated: SchoolYearTimelineConfig = {
      ...current,
      ...newTimeline
    };
    const normalized = SchoolYearDateNormalizer.normalizeTimeline(
      updated,
      updated.schoolYearLabel || current.schoolYearLabel
    );
    classService.updateSettings({
      schoolYearTimeline: normalized
    });
    this.notify();
  }

  /**
   * Helper: Format Date to YYYY-MM-DD
   */
  private formatDateStr(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Helper: Format Date to DD/MM
   */
  private formatShortDate(d: Date): string {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
  }

  /**
   * Helper: Format Date to DD/MM/YYYY
   */
  private formatFullDateVN(d: Date): string {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  /**
   * Helper: Format Date to MM/YYYY (Tháng / Năm)
   */
  private formatMonthYear(d: Date): string {
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${month}/${year}`;
  }

  /**
   * Calculate Current Study Period according to SchoolYearTimeline specification
   */
  public getCurrentStudyPeriod(
    customTimeline?: SchoolYearTimelineConfig,
    currentDate: Date = new Date()
  ): CurrentStudyPeriodResult {
    const config = customTimeline
      ? SchoolYearDateNormalizer.normalizeTimeline(
          customTimeline,
          customTimeline.schoolYearLabel || classService.getSettings().academicYear
        )
      : this.getTimelineConfig();

    const dateStr = this.formatDateStr(currentDate);
    const time = currentDate.getTime();
    const holidays = config.excludedPeriods || config.excludedRanges || [];

    // 1. Check if falling in an excluded holiday/break period
    for (const h of holidays) {
      if (dateStr >= h.startDate && dateStr <= h.endDate) {
        const isHk1 = dateStr <= config.endDateHK1;
        return {
          status: 'BREAK',
          semester: isHk1 ? 'HKI' : 'HKII',
          schoolYearLabel: config.schoolYearLabel || '2025 - 2026',
          breakName: h.name,
          badgeText: `📅 ${h.name}`,
          statusText: `Đang trong kỳ nghỉ: ${h.name}`,
          dateRangeFormatted: `${h.startDate} → ${h.endDate}`,
          isHoliday: true
        };
      }
    }

    const startHK1 = new Date((config.firstStudyWeekStartDate || config.startDateHK1) + 'T00:00:00');
    const endHK1 = new Date(config.endDateHK1 + 'T23:59:59');
    const startHK2 = new Date(config.startDateHK2 + 'T00:00:00');
    const endHK2 = new Date(config.endDateHK2 + 'T23:59:59');

    // 2. Before school year
    if (time < startHK1.getTime()) {
      return {
        status: 'BEFORE_SCHOOL_YEAR',
        semester: 'HKI',
        schoolYearLabel: config.schoolYearLabel || '2025 - 2026',
        badgeText: '📅 Chưa bắt đầu năm học',
        statusText: `Chưa bắt đầu năm học mới (Khai giảng: ${config.startDateHK1})`,
        isHoliday: false
      };
    }

    // Calculate break days before target date in a semester
    const getBreakDaysBefore = (semesterStart: Date, targetTime: number, semEnd: Date) => {
      let breakDays = 0;
      for (const h of holidays) {
        if (h.countAsStudyWeek === true) continue; // count as study week, so do not subtract
        const hStart = new Date(h.startDate + 'T00:00:00');
        const hEnd = new Date(h.endDate + 'T23:59:59');
        if (hEnd.getTime() < semesterStart.getTime() || hStart.getTime() > semEnd.getTime()) continue;
        
        // If holiday completely passed before target date
        if (hEnd.getTime() < targetTime) {
          const days = Math.round((hEnd.getTime() - hStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          breakDays += days;
        }
      }
      return breakDays;
    };

    // 3. Within HK1
    if (time >= startHK1.getTime() && time <= endHK1.getTime()) {
      const diffDays = Math.floor((time - startHK1.getTime()) / (1000 * 60 * 60 * 24));
      const breakDays = getBreakDaysBefore(startHK1, time, endHK1);
      const effectiveDays = Math.max(0, diffDays - breakDays);
      const weekIndex = Math.floor(effectiveDays / 7) + 1;
      const weekNum = Math.min(config.totalWeeksHK1 || 18, Math.max(1, weekIndex));

      const weekStart = new Date(startHK1.getTime() + (weekNum - 1) * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);

      const syLabel = config.schoolYearLabel || '2025 - 2026';
      return {
        status: 'STUDY_WEEK',
        weekNumber: weekNum,
        semester: 'HKI',
        schoolYearLabel: syLabel,
        weekStart,
        weekEnd,
        badgeText: `Tuần ${weekNum} · Học kì I · ${syLabel}`,
        statusText: `Đang học Tuần ${weekNum} (Học kỳ I) · Năm học ${syLabel}`,
        dateRangeFormatted: `${this.formatShortDate(weekStart)} - ${this.formatShortDate(weekEnd)}`,
        isHoliday: false
      };
    }

    // 4. Between HK1 and HK2 (Inter-semester break)
    if (time > endHK1.getTime() && time < startHK2.getTime()) {
      const syLabel = config.schoolYearLabel || '2025 - 2026';
      return {
        status: 'BREAK',
        semester: 'HKI',
        schoolYearLabel: syLabel,
        breakName: 'Sơ kết Học kỳ I',
        badgeText: `Sơ kết HKI · ${syLabel}`,
        statusText: `Đang trong thời gian sơ kết Học kỳ I · Năm học ${syLabel}`,
        dateRangeFormatted: `${this.formatShortDate(endHK1)} - ${this.formatShortDate(startHK2)}`,
        isHoliday: true
      };
    }

    // 5. Within HK2
    if (time >= startHK2.getTime() && time <= endHK2.getTime()) {
      const diffDays = Math.floor((time - startHK2.getTime()) / (1000 * 60 * 60 * 24));
      const breakDays = getBreakDaysBefore(startHK2, time, endHK2);
      const effectiveDays = Math.max(0, diffDays - breakDays);
      const hk2WeekIndex = Math.floor(effectiveDays / 7) + 1;
      const hk1Total = config.totalWeeksHK1 || 18;
      const totalWeekNum = hk1Total + Math.min(config.totalWeeksHK2 || 17, Math.max(1, hk2WeekIndex));
      const hk2WeekNum = Math.min(config.totalWeeksHK2 || 17, Math.max(1, hk2WeekIndex));

      const weekStart = new Date(startHK2.getTime() + (hk2WeekNum - 1) * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);

      const syLabel = config.schoolYearLabel || '2025 - 2026';
      return {
        status: 'STUDY_WEEK',
        weekNumber: totalWeekNum,
        semester: 'HKII',
        schoolYearLabel: syLabel,
        weekStart,
        weekEnd,
        badgeText: `Tuần ${totalWeekNum} · Học kì II · ${syLabel}`,
        statusText: `Đang học Tuần ${totalWeekNum} (Tuần ${hk2WeekNum} HK2) · Năm học ${syLabel}`,
        dateRangeFormatted: `${this.formatShortDate(weekStart)} - ${this.formatShortDate(weekEnd)}`,
        isHoliday: false
      };
    }

    // 6. After school year (Summer vacation)
    return {
      status: 'AFTER_SCHOOL_YEAR',
      semester: 'HKII',
      schoolYearLabel: config.schoolYearLabel || '2025 - 2026',
      badgeText: '📅 Đã kết thúc năm học',
      statusText: 'Đã kết thúc năm học • Kỳ nghỉ hè',
      dateRangeFormatted: `Từ ${this.formatShortDate(endHK2)}`,
      isHoliday: true
    };
  }

  /**
   * Calculate week info for a specific date (Legacy + Modern compatibility)
   */
  public getWeekInfoForDate(
    targetDate: Date = new Date(),
    customTimeline?: SchoolYearTimelineConfig
  ): WeekCalculationResult {
    const period = this.getCurrentStudyPeriod(customTimeline, targetDate);
    const config = customTimeline ? { ...DEFAULT_TIMELINE, ...customTimeline } : this.getTimelineConfig();

    if (period.status === 'BREAK') {
      return {
        weekNumber: 0,
        semester: 'Nghỉ lễ',
        semesterLabel: period.breakName || 'Nghỉ lễ',
        label: period.badgeText,
        fullLabel: period.breakName || 'Kỳ nghỉ lễ/Tết',
        startDate: period.dateRangeFormatted?.split(' → ')[0] || '',
        endDate: period.dateRangeFormatted?.split(' → ')[1] || '',
        dateRangeFormatted: period.dateRangeFormatted || '',
        isHoliday: true,
        holidayName: period.breakName,
        isCurrent: true,
        totalWeeksInYear: 35,
        badgeText: period.badgeText,
        statusText: period.statusText,
        schoolYearLabel: period.schoolYearLabel
      };
    }

    if (period.status === 'BEFORE_SCHOOL_YEAR') {
      return {
        weekNumber: 1,
        semester: 'HK1',
        semesterLabel: 'Chuẩn bị năm học mới',
        label: 'Chuẩn bị HK1',
        fullLabel: 'Chuẩn bị vào năm học mới (Học kỳ I)',
        startDate: config.startDateHK1,
        endDate: config.endDateHK1,
        dateRangeFormatted: `Khai giảng: ${config.startDateHK1}`,
        isHoliday: false,
        isCurrent: false,
        totalWeeksInYear: 35,
        badgeText: period.badgeText,
        statusText: period.statusText,
        schoolYearLabel: period.schoolYearLabel
      };
    }

    if (period.status === 'AFTER_SCHOOL_YEAR') {
      return {
        weekNumber: 35,
        semester: 'Hè',
        semesterLabel: 'Kỳ nghỉ hè',
        label: '☀️ Kỳ nghỉ hè',
        fullLabel: 'Tổng kết năm học - Kỳ nghỉ hè',
        startDate: config.endDateHK2,
        endDate: config.startDateHK1,
        dateRangeFormatted: period.dateRangeFormatted || '',
        isHoliday: true,
        holidayName: 'Kỳ nghỉ hè',
        isCurrent: true,
        totalWeeksInYear: 35,
        badgeText: period.badgeText,
        statusText: period.statusText,
        schoolYearLabel: period.schoolYearLabel
      };
    }

    // STUDY_WEEK
    const isHk1 = period.semester === 'HKI';
    const weekNum = period.weekNumber || 1;
    const wStartStr = period.weekStart ? this.formatDateStr(period.weekStart) : config.startDateHK1;
    const wEndStr = period.weekEnd ? this.formatDateStr(period.weekEnd) : config.endDateHK1;

    return {
      weekNumber: weekNum,
      semester: isHk1 ? 'HK1' : 'HK2',
      semesterLabel: isHk1 ? 'Học kỳ I' : 'Học kỳ II',
      label: period.badgeText.replace('📅 ', ''),
      fullLabel: `Tuần ${weekNum} (${isHk1 ? 'Học kỳ I' : 'Học kỳ II'})`,
      startDate: wStartStr,
      endDate: wEndStr,
      dateRangeFormatted: period.dateRangeFormatted || `${this.formatShortDate(period.weekStart || new Date())} - ${this.formatShortDate(period.weekEnd || new Date())}`,
      isHoliday: false,
      isCurrent: true,
      totalWeeksInYear: 35,
      badgeText: period.badgeText,
      statusText: period.statusText,
      schoolYearLabel: period.schoolYearLabel
    };
  }

  /**
   * Get all 35 study weeks with labels and dates for calendar / planning dropdowns
   */
  public getAllStudyWeeks(): Array<{
    weekNumber: number;
    semester: 'HK1' | 'HK2';
    semesterLabel: string;
    label: string;
    fullLabel: string;
    dateRange: string;
    dateRangeFormatted: string;
    startDate: string;
    endDate: string;
  }> {
    const config = this.getTimelineConfig();
    const result: Array<{
      weekNumber: number;
      semester: 'HK1' | 'HK2';
      semesterLabel: string;
      label: string;
      fullLabel: string;
      dateRange: string;
      dateRangeFormatted: string;
      startDate: string;
      endDate: string;
    }> = [];

    const startHK1 = new Date(config.startDateHK1 + 'T00:00:00');
    const totalHK1 = config.totalWeeksHK1 || 18;
    for (let i = 1; i <= totalHK1; i++) {
      const wStart = new Date(startHK1.getTime() + (i - 1) * 7 * 24 * 60 * 60 * 1000);
      const wEnd = new Date(wStart.getTime() + 6 * 24 * 60 * 60 * 1000);
      const rangeStr = `${this.formatShortDate(wStart)} - ${this.formatShortDate(wEnd)}`;
      result.push({
        weekNumber: i,
        semester: 'HK1',
        semesterLabel: 'Học kỳ I',
        label: `Tuần ${i} (HKI)`,
        fullLabel: `Tuần ${i} (Học kỳ I)`,
        dateRange: rangeStr,
        dateRangeFormatted: rangeStr,
        startDate: this.formatDateStr(wStart),
        endDate: this.formatDateStr(wEnd)
      });
    }

    const startHK2 = new Date(config.startDateHK2 + 'T00:00:00');
    const totalHK2 = config.totalWeeksHK2 || 17;
    for (let j = 1; j <= totalHK2; j++) {
      const weekNum = totalHK1 + j;
      const wStart = new Date(startHK2.getTime() + (j - 1) * 7 * 24 * 60 * 60 * 1000);
      const wEnd = new Date(wStart.getTime() + 6 * 24 * 60 * 60 * 1000);
      const rangeStr = `${this.formatShortDate(wStart)} - ${this.formatShortDate(wEnd)}`;
      result.push({
        weekNumber: weekNum,
        semester: 'HK2',
        semesterLabel: 'Học kỳ II',
        label: `Tuần ${weekNum} (HKII - Tuần ${j})`,
        fullLabel: `Tuần ${weekNum} (Học kỳ II - Tuần ${j})`,
        dateRange: rangeStr,
        dateRangeFormatted: rangeStr,
        startDate: this.formatDateStr(wStart),
        endDate: this.formatDateStr(wEnd)
      });
    }

    return result;
  }
}

export const schoolWeekService = new SchoolWeekService();
