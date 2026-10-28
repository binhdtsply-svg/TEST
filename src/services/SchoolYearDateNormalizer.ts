/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SchoolYearTimelineConfig, ExcludedPeriod } from '../types';

export interface ParseYearsResult {
  startYear: number;
  endYear: number;
  isCrossYear: boolean;
}

export class SchoolYearDateNormalizer {
  /**
   * Safe date component extractor from YYYY-MM-DD or DD/MM/YYYY string (with or without time)
   */
  public static parseDateParts(dateStr?: string): { year: number; month: number; day: number } | null {
    if (!dateStr || typeof dateStr !== 'string') return null;
    const clean = dateStr.trim();

    // 0. If clean has time with ISO / UTC timezone marker, parse with Date to get local date
    if (clean.includes('T') && (clean.endsWith('Z') || clean.includes('+') || /T.*[+-]\d{2}/.test(clean))) {
      const parsedDate = new Date(clean);
      if (!isNaN(parsedDate.getTime())) {
        return {
          year: parsedDate.getFullYear(),
          month: parsedDate.getMonth() + 1,
          day: parsedDate.getDate()
        };
      }
    }

    // 1. Check YYYY-MM-DD or YYYY-MM-DDTHH:mm... (or YYYY/MM/DD)
    const ymd = clean.match(/(\d{4})[\-\/](\d{1,2})[\-\/](\d{1,2})/);
    if (ymd) {
      const year = parseInt(ymd[1], 10);
      const month = parseInt(ymd[2], 10);
      const day = parseInt(ymd[3], 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day) && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return { year, month, day };
      }
    }

    // 2. Check DD/MM/YYYY or DD-MM-YYYY (with or without time like "10:30 03/10/2026")
    const dmy = clean.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (dmy) {
      const day = parseInt(dmy[1], 10);
      const month = parseInt(dmy[2], 10);
      const year = parseInt(dmy[3], 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day) && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return { year, month, day };
      }
    }

    return null;
  }

  /**
   * Parse any date/time string, Date object, or numeric timestamp into a millisecond timestamp.
   * Strictly avoids string/lexical comparison and avoids US-style MM/DD/YYYY misinterpretations of Vietnamese DD/MM/YYYY.
   * e.g., '04/10/2026' is correctly parsed as October 4, 2026 (NOT April 10, 2026).
   */
  public static parseDateToTimestamp(input?: string | number | Date | null): number {
    if (input === null || input === undefined) return 0;
    if (typeof input === 'number') return isNaN(input) ? 0 : input;
    if (input instanceof Date) return isNaN(input.getTime()) ? 0 : input.getTime();
    if (typeof input !== 'string') return 0;
    const clean = input.trim();
    if (!clean) return 0;

    // Direct millisecond timestamp string e.g. "1791118857291"
    if (/^\d{11,14}$/.test(clean)) {
      const num = parseInt(clean, 10);
      if (!isNaN(num)) return num;
    }

    // Extract optional time component HH:mm or HH:mm:ss
    let hours = 0;
    let minutes = 0;
    let seconds = 0;
    const timeMatch = clean.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (timeMatch) {
      hours = parseInt(timeMatch[1], 10);
      minutes = parseInt(timeMatch[2], 10);
      seconds = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
    }

    // 1. Check DD/MM/YYYY or D/M/YYYY or DD-MM-YYYY or DD.MM.YYYY (Vietnamese date format priority)
    const dmyMatch = clean.match(/(?:^|\b)(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})(?:$|\b)/);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10);
      const month = parseInt(dmyMatch[2], 10);
      const year = parseInt(dmyMatch[3], 10);
      if (year >= 1000 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return new Date(year, month - 1, day, hours, minutes, seconds).getTime();
      }
    }

    // 2. Check YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD (ISO date format)
    const ymdMatch = clean.match(/(?:^|\b)(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})(?:$|\b)/);
    if (ymdMatch) {
      const year = parseInt(ymdMatch[1], 10);
      const month = parseInt(ymdMatch[2], 10);
      const day = parseInt(ymdMatch[3], 10);
      if (year >= 1000 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        if (clean.includes('T') && (clean.endsWith('Z') || clean.includes('+') || /T.*[+-]\d{2}/.test(clean))) {
          const isoParsed = Date.parse(clean);
          if (!isNaN(isoParsed)) return isoParsed;
        }
        return new Date(year, month - 1, day, hours, minutes, seconds).getTime();
      }
    }

    // 3. Fallback to standard parse
    const fallback = Date.parse(clean);
    return isNaN(fallback) ? 0 : fallback;
  }

  /**
   * Deterministic comparator timestamp for Timeline and Event milestones.
   * Strictly guarantees chronological sorting (eventDate ASC) based on the event's actual date:
   * - Correctly handles Vietnamese DD/MM/YYYY without US-style MM/DD/YYYY misinterpretations.
   * - Supports DD/MM/YYYY, D/M/YYYY, YYYY-MM-DD, slashes, dashes, and dots.
   * - Completely independent of record creation time, IDs, or array insertion order.
   * - Safely maps missing/invalid dates to Number.MAX_SAFE_INTEGER so valid dates always sort first.
   */
  public static parseEventDateToTimestamp(input?: string | number | Date | null): number {
    if (input === null || input === undefined) return Number.MAX_SAFE_INTEGER;
    if (typeof input === 'number') return isNaN(input) ? Number.MAX_SAFE_INTEGER : input;
    if (input instanceof Date) return isNaN(input.getTime()) ? Number.MAX_SAFE_INTEGER : input.getTime();
    if (typeof input !== 'string') return Number.MAX_SAFE_INTEGER;
    const clean = input.trim();
    if (!clean) return Number.MAX_SAFE_INTEGER;

    // Direct epoch timestamp string
    if (/^\d{11,14}$/.test(clean)) {
      const num = parseInt(clean, 10);
      if (!isNaN(num)) return num;
    }

    // Fixed noon time to prevent any midnight / daylight saving timezone rollover
    let hours = 12;
    let minutes = 0;
    let seconds = 0;
    const timeMatch = clean.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (timeMatch) {
      hours = parseInt(timeMatch[1], 10);
      minutes = parseInt(timeMatch[2], 10);
      seconds = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
    }

    // 1. Strict Vietnamese DD/MM/YYYY or D/M/YYYY (slashes, dashes, dots)
    const dmyMatch = clean.match(/(?:^|\b)(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})(?:$|\b)/);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10);
      const month = parseInt(dmyMatch[2], 10);
      const year = parseInt(dmyMatch[3], 10);
      if (year >= 1000 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return new Date(year, month - 1, day, hours, minutes, seconds).getTime();
      }
    }

    // 2. Strict YYYY-MM-DD or YYYY/MM/DD (slashes, dashes, dots)
    const ymdMatch = clean.match(/(?:^|\b)(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})(?:$|\b)/);
    if (ymdMatch) {
      const year = parseInt(ymdMatch[1], 10);
      const month = parseInt(ymdMatch[2], 10);
      const day = parseInt(ymdMatch[3], 10);
      if (year >= 1000 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return new Date(year, month - 1, day, hours, minutes, seconds).getTime();
      }
    }

    // Fallback to parseDateToTimestamp
    const fallback = SchoolYearDateNormalizer.parseDateToTimestamp(clean);
    return fallback > 0 ? fallback : Number.MAX_SAFE_INTEGER;
  }

  /**
   * Formats milestone date or date range for user-facing display in standardized DD/MM/YYYY format.
   * Does NOT alter the underlying stored raw data.
   */
  public static formatMilestoneDisplayDate(dateStr?: string | null, endDateStr?: string | null): string {
    if (endDateStr && typeof endDateStr === 'string' && endDateStr.trim()) {
      const s = SchoolYearDateNormalizer.formatSingleDateString(dateStr);
      const e = SchoolYearDateNormalizer.formatSingleDateString(endDateStr);
      if (s && e) {
        return s === e ? s : `${s} - ${e}`;
      }
      return s || e || '';
    }

    if (!dateStr || typeof dateStr !== 'string') return '';
    const clean = dateStr.trim();
    if (!clean) return '';

    // Check if input contains a range separator like " - ", " -> ", " → ", " đến ", " tới "
    const rangeMatch = clean.match(/^(.*?)(?:\s+(?:[-–—]|->|→|đến|tới)\s+)(.+)$/i);
    if (rangeMatch) {
      const startFormatted = SchoolYearDateNormalizer.formatSingleDateString(rangeMatch[1]);
      const endFormatted = SchoolYearDateNormalizer.formatSingleDateString(rangeMatch[2]);
      if (startFormatted && endFormatted) {
        return startFormatted === endFormatted ? startFormatted : `${startFormatted} - ${endFormatted}`;
      }
      return startFormatted || endFormatted || clean;
    }

    return SchoolYearDateNormalizer.formatSingleDateString(clean);
  }

  /**
   * Helper to format a single date string with optional time
   */
  public static formatSingleDateString(dateStr?: string | null): string {
    if (!dateStr || typeof dateStr !== 'string') return '';
    const clean = dateStr.trim();
    if (!clean) return '';

    // Extract time if any (HH:mm)
    let timeSuffix = '';
    const timeMatch = clean.match(/(\d{1,2}:\d{2})(?::\d{2})?/);
    if (timeMatch) {
      timeSuffix = ` ${timeMatch[1]}`;
    }

    // 1. DD/MM/YYYY or D/M/YYYY
    const dmy = clean.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
    if (dmy) {
      const day = dmy[1].padStart(2, '0');
      const month = dmy[2].padStart(2, '0');
      const year = dmy[3];
      return `${day}/${month}/${year}${timeSuffix}`;
    }

    // 2. YYYY-MM-DD
    const ymd = clean.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
    if (ymd) {
      const year = ymd[1];
      const month = ymd[2].padStart(2, '0');
      const day = ymd[3].padStart(2, '0');
      return `${day}/${month}/${year}${timeSuffix}`;
    }

    return clean;
  }

  /**
   * Parse a date string into an exact epoch timestamp in Asia/Ho_Chi_Minh (+07:00) timezone.
   * If isEndOfDay is true and no specific time is present, sets to 23:59:59.999 VN time.
   * If isEndOfDay is false and no specific time is present, sets to 00:00:00.000 VN time.
   */
  public static parseVietnamDateTime(
    dateStr?: string | number | Date | null,
    isEndOfDay: boolean = false
  ): { timestamp: number; hasExplicitTime: boolean } | null {
    if (dateStr === null || dateStr === undefined) return null;
    if (typeof dateStr === 'number') {
      return isNaN(dateStr) ? null : { timestamp: dateStr, hasExplicitTime: true };
    }
    if (dateStr instanceof Date) {
      return isNaN(dateStr.getTime()) ? null : { timestamp: dateStr.getTime(), hasExplicitTime: true };
    }
    if (typeof dateStr !== 'string') return null;
    const clean = dateStr.trim();
    if (!clean) return null;

    // Direct millisecond timestamp string e.g. "1791118857291"
    if (/^\d{11,14}$/.test(clean)) {
      const num = parseInt(clean, 10);
      if (!isNaN(num)) return { timestamp: num, hasExplicitTime: true };
    }

    // Check for explicit time HH:mm or HH:mm:ss
    let hasExplicitTime = false;
    let hour = isEndOfDay ? 23 : 0;
    let minute = isEndOfDay ? 59 : 0;
    let second = isEndOfDay ? 59 : 0;
    let millisecond = isEndOfDay ? 999 : 0;

    const timeMatch = clean.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (timeMatch) {
      hasExplicitTime = true;
      hour = parseInt(timeMatch[1], 10);
      minute = parseInt(timeMatch[2], 10);
      second = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
      millisecond = 0;
    }

    // 1. Vietnamese DD/MM/YYYY or D/M/YYYY
    const dmyMatch = clean.match(/(?:^|\b)(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})(?:$|\b)/);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10);
      const month = parseInt(dmyMatch[2], 10);
      const year = parseInt(dmyMatch[3], 10);
      if (year >= 1000 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        const pad = (n: number) => n.toString().padStart(2, '0');
        const msStr = isEndOfDay && !hasExplicitTime ? '.999' : '';
        const isoWithOffset = `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}${msStr}+07:00`;
        const t = Date.parse(isoWithOffset);
        if (!isNaN(t)) return { timestamp: t, hasExplicitTime };
      }
    }

    // 2. ISO YYYY-MM-DD
    const ymdMatch = clean.match(/(?:^|\b)(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})(?:$|\b)/);
    if (ymdMatch) {
      const year = parseInt(ymdMatch[1], 10);
      const month = parseInt(ymdMatch[2], 10);
      const day = parseInt(ymdMatch[3], 10);
      if (year >= 1000 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        const pad = (n: number) => n.toString().padStart(2, '0');
        const msStr = isEndOfDay && !hasExplicitTime ? '.999' : '';
        const isoWithOffset = `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}${msStr}+07:00`;
        const t = Date.parse(isoWithOffset);
        if (!isNaN(t)) return { timestamp: t, hasExplicitTime };
      }
    }

    // Fallback: standard Date.parse
    const fallback = Date.parse(clean);
    if (!isNaN(fallback)) {
      return { timestamp: fallback, hasExplicitTime: true };
    }

    return null;
  }

  /**
   * Extract start and end time boundaries in milliseconds for a milestone.
   * Handles:
   * - Explicit milestone.startDate and milestone.endDate fields
   * - Range date strings like "20/12/2026 - 25/12/2026" in milestone.date
   * - Single date strings like "20/12/2026" (starts 00:00:00, ends 23:59:59.999 Vietnam time)
   * - Explicit time components if provided
   */
  public static getMilestoneTimeBoundaries(milestone: {
    date?: string;
    startDate?: string;
    endDate?: string;
  }): { startTimestamp: number | null; endTimestamp: number | null; isDeterminate: boolean } {
    let startRaw = (milestone.startDate || '').trim();
    let endRaw = (milestone.endDate || '').trim();

    if (!startRaw && milestone.date) {
      const cleanDate = milestone.date.trim();
      const rangeMatch = cleanDate.match(/^(.*?)(?:\s+(?:[-–—]|->|→|đến|tới)\s+)(.+)$/i);
      if (rangeMatch) {
        startRaw = rangeMatch[1].trim();
        if (!endRaw) {
          endRaw = rangeMatch[2].trim();
        }
      } else {
        startRaw = cleanDate;
      }
    }

    if (!startRaw) {
      return { startTimestamp: null, endTimestamp: null, isDeterminate: false };
    }

    const startParsed = SchoolYearDateNormalizer.parseVietnamDateTime(startRaw, false);
    if (!startParsed) {
      return { startTimestamp: null, endTimestamp: null, isDeterminate: false };
    }

    if (endRaw) {
      const endParsed = SchoolYearDateNormalizer.parseVietnamDateTime(endRaw, true);
      if (!endParsed) {
        return { startTimestamp: startParsed.timestamp, endTimestamp: null, isDeterminate: false };
      }
      return {
        startTimestamp: startParsed.timestamp,
        endTimestamp: Math.max(startParsed.timestamp, endParsed.timestamp),
        isDeterminate: true
      };
    }

    // Only one date provided: it spans the entire day unless it had explicit time
    if (startParsed.hasExplicitTime) {
      // If only single start time was provided without end (e.g. "08:00 20/12/2026"),
      // event ends at end of that same day in Vietnam time
      const endOfDay = SchoolYearDateNormalizer.parseVietnamDateTime(startRaw, true);
      return {
        startTimestamp: startParsed.timestamp,
        endTimestamp: endOfDay ? endOfDay.timestamp : startParsed.timestamp,
        isDeterminate: true
      };
    } else {
      const endOfDay = SchoolYearDateNormalizer.parseVietnamDateTime(startRaw, true);
      return {
        startTimestamp: startParsed.timestamp,
        endTimestamp: endOfDay ? endOfDay.timestamp : startParsed.timestamp,
        isDeterminate: true
      };
    }
  }

  /**
   * Automatically evaluate milestone status based on current time (Vietnam Asia/Ho_Chi_Minh).
   * Returns:
   * - 'completed': event has completely finished
   * - 'current': event is currently taking place
   * - 'upcoming': event is in the future
   * - 'unknown': insufficient or invalid date information to determine status
   */
  public static evaluateMilestoneStatus(
    milestone: {
      date?: string;
      startDate?: string;
      endDate?: string;
      status?: string;
      isCompleted?: boolean;
    },
    referenceTimeMs: number = Date.now()
  ): 'completed' | 'current' | 'upcoming' | 'unknown' {
    const boundaries = SchoolYearDateNormalizer.getMilestoneTimeBoundaries(milestone);
    if (!boundaries.isDeterminate || boundaries.startTimestamp === null || boundaries.endTimestamp === null) {
      // If manual completion is recorded and valid
      if (milestone.isCompleted === true || milestone.status === 'completed') {
        return 'completed';
      }
      if (milestone.status === 'upcoming') return 'upcoming';
      if (milestone.status === 'current') return 'current';
      return 'unknown';
    }

    if (referenceTimeMs < boundaries.startTimestamp) {
      return 'upcoming';
    }
    if (referenceTimeMs >= boundaries.startTimestamp && referenceTimeMs <= boundaries.endTimestamp) {
      return 'current';
    }
    return 'completed';
  }

  /**
   * Get deterministic Monday to Sunday range for any date string or Date object
   */
  public static getMondayToSundayRange(dateInput?: string | Date): {
    monday: Date;
    sunday: Date;
    mondayStr: string; // YYYY-MM-DD
    sundayStr: string; // YYYY-MM-DD
    weekKey: string;   // YYYY-MM-DD_YYYY-MM-DD
  } | null {
    let d: Date | null = null;
    if (dateInput instanceof Date) {
      d = new Date(dateInput);
    } else if (typeof dateInput === 'string') {
      const parts = this.parseDateParts(dateInput);
      if (parts) {
        d = new Date(parts.year, parts.month - 1, parts.day);
      }
    }
    if (!d || isNaN(d.getTime())) return null;

    const dayOfWeek = d.getDay(); // 0 is Sunday, 1 is Monday, ...
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(d);
    monday.setDate(d.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const mondayStr = this.formatDateString(monday.getFullYear(), monday.getMonth() + 1, monday.getDate());
    const sundayStr = this.formatDateString(sunday.getFullYear(), sunday.getMonth() + 1, sunday.getDate());

    return {
      monday,
      sunday,
      mondayStr,
      sundayStr,
      weekKey: `${mondayStr}_${sundayStr}`
    };
  }

  /**
   * Format date components safely to standard YYYY-MM-DD
   */
  public static formatDateString(year: number, month: number, day: number): string {
    const m = String(month).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${year}-${m}-${d}`;
  }

  /**
   * Convert any date format to standard YYYY-MM-DD string
   */
  public static toISODateString(dateStr?: string, defaultDateStr?: string): string {
    const parts = this.parseDateParts(dateStr);
    if (parts) {
      return this.formatDateString(parts.year, parts.month, parts.day);
    }
    return defaultDateStr || '';
  }

  /**
   * Parse startYear and endYear from reference dates, schoolYearLabel, or academicYear.
   * Priority:
   * 1. If referenceStartDate and referenceEndDate are provided with valid years.
   * 2. If referenceStartDate is provided.
   * 3. schoolYearLabel matches.
   * 4. Fallback default.
   */
  public static parseYears(
    schoolYearLabel?: string,
    referenceStartDate?: string,
    referenceEndDate?: string
  ): ParseYearsResult {
    const startParts = this.parseDateParts(referenceStartDate);
    const endParts = this.parseDateParts(referenceEndDate);

    if (startParts && startParts.year >= 2000) {
      const sy = startParts.year;
      let ey = endParts && endParts.year >= sy ? endParts.year : sy + 1;
      if (ey === sy) ey = sy + 1;
      return { startYear: sy, endYear: ey, isCrossYear: true };
    }

    const raw = (schoolYearLabel || '').trim();
    const matches = raw.match(/\b(20\d\d)\b/g);

    if (matches && matches.length >= 2) {
      const y1 = parseInt(matches[0], 10);
      const y2 = parseInt(matches[1], 10);
      const startYear = Math.min(y1, y2);
      const endYear = Math.max(y1, y2);
      return { startYear, endYear: endYear > startYear ? endYear : startYear + 1, isCrossYear: true };
    }

    if (matches && matches.length === 1) {
      const y1 = parseInt(matches[0], 10);
      return { startYear: y1, endYear: y1 + 1, isCrossYear: true };
    }

    if (endParts && endParts.year >= 2000) {
      const ey = endParts.year;
      return { startYear: ey - 1, endYear: ey, isCrossYear: true };
    }

    return { startYear: 2025, endYear: 2026, isCrossYear: true };
  }

  /**
   * Normalize an individual date within the context of an academic year.
   * If candidate date is valid with a full 4-digit year >= 2000, PRESERVE IT.
   */
  public static normalizeCrossYearDate(
    dateStr: string | undefined,
    startYear: number,
    endYear: number,
    fallbackDateStr: string,
    isSecondHalfHint: boolean = false
  ): string {
    if (!dateStr) return fallbackDateStr;
    const parts = this.parseDateParts(dateStr);
    if (!parts) return fallbackDateStr;

    // If date has a valid year >= 2000, preserve user's year
    if (parts.year >= 2000) {
      return this.formatDateString(parts.year, parts.month, parts.day);
    }

    // Otherwise assign target year based on semester hint or month
    const targetYear = (isSecondHalfHint || parts.month <= 7) ? endYear : startYear;
    return this.formatDateString(targetYear, parts.month, parts.day);
  }

  /**
   * Normalize Excluded Holiday/Break periods
   */
  public static normalizeExcludedPeriods(
    periods: ExcludedPeriod[] | undefined,
    startYear: number,
    endYear: number,
    _schoolStartDateStr?: string
  ): ExcludedPeriod[] {
    if (!periods || !Array.isArray(periods)) return [];

    return periods.map((p) => {
      const startParts = this.parseDateParts(p.startDate);
      const endParts = this.parseDateParts(p.endDate);

      let normStart = p.startDate;
      let normEnd = p.endDate;

      if (startParts) {
        const targetYear = startParts.year >= 2000 ? startParts.year : (startParts.month <= 7 ? endYear : startYear);
        normStart = this.formatDateString(targetYear, startParts.month, startParts.day);
      }

      if (endParts) {
        const targetYear = endParts.year >= 2000 ? endParts.year : (endParts.month <= 7 ? endYear : startYear);
        normEnd = this.formatDateString(targetYear, endParts.month, endParts.day);
      }

      return {
        ...p,
        startDate: normStart,
        endDate: normEnd
      };
    });
  }

  /**
   * Main Date Normalization & Migration Service for SchoolYearTimelineConfig
   */
  public static normalizeTimeline(rawTimeline: any, academicYearLabel?: string): SchoolYearTimelineConfig {
    const raw = rawTimeline || {};
    
    // 1. Raw start & end date inputs
    const rawStartHK1 = raw.startDateHK1 || raw.academicYearStart || raw.semester1Start || '';
    const rawEndHK2 = raw.endDateHK2 || raw.academicYearEnd || raw.semester2End || '';
    const label = raw.schoolYearLabel || academicYearLabel || '';

    // 2. Parse accurate startYear and endYear
    const { startYear, endYear } = this.parseYears(label, rawStartHK1, rawEndHK2);

    // 3. Format start dates
    const normStartHK1 = rawStartHK1 
      ? this.toISODateString(rawStartHK1, `${startYear}-09-05`)
      : `${startYear}-09-05`;

    const rawFirstWeek = raw.firstStudyWeekStartDate || rawStartHK1;
    const normFirstStudyWeek = rawFirstWeek
      ? this.toISODateString(rawFirstWeek, normStartHK1)
      : normStartHK1;

    // 4. Format semester 1 end date
    const rawEndHK1 = raw.endDateHK1 || raw.semester1End;
    const normEndHK1 = rawEndHK1
      ? this.toISODateString(rawEndHK1, `${endYear}-01-16`)
      : `${endYear}-01-16`;

    // 5. Format semester 2 start date
    const rawStartHK2 = raw.startDateHK2 || raw.semester2Start;
    const normStartHK2 = rawStartHK2
      ? this.toISODateString(rawStartHK2, `${endYear}-01-19`)
      : `${endYear}-01-19`;

    // 6. Format semester 2 end date / academic year end
    const normEndHK2 = rawEndHK2
      ? this.toISODateString(rawEndHK2, `${endYear}-05-30`)
      : `${endYear}-05-30`;

    const totalWeeksHK1 = Number(raw.totalWeeksHK1 || raw.semester1Weeks) || 18;
    const totalWeeksHK2 = Number(raw.totalWeeksHK2 || raw.semester2Weeks) || 17;
    const totalWeeks = Number(raw.totalWeeks) || (totalWeeksHK1 + totalWeeksHK2);

    // 7. Normalize Excluded / Holiday periods (Tet, 30/4, etc.)
    const rawHolidays = raw.excludedPeriods || raw.excludedRanges || [
      {
        id: 'break-tet',
        name: 'Nghỉ Tết Nguyên Đán',
        startDate: `${endYear}-02-12`,
        endDate: `${endYear}-02-23`,
        reason: 'Nghỉ Tết theo quy định',
        countAsStudyWeek: false
      }
    ];
    const normHolidays = this.normalizeExcludedPeriods(rawHolidays, startYear, endYear, normStartHK1);

    const timezone = raw.timezone || 'Asia/Ho_Chi_Minh';
    const computedLabel = `${startYear} - ${endYear}`;

    return {
      startDateHK1: normStartHK1,
      endDateHK1: normEndHK1,
      startDateHK2: normStartHK2,
      endDateHK2: normEndHK2,
      totalWeeksHK1,
      totalWeeksHK2,
      totalWeeks,
      academicYearStart: normStartHK1,
      academicYearEnd: normEndHK2,
      semester1Start: normStartHK1,
      semester1End: normEndHK1,
      semester2Start: normStartHK2,
      semester2End: normEndHK2,
      semester1Weeks: totalWeeksHK1,
      semester2Weeks: totalWeeksHK2,
      firstStudyWeekStartDate: normFirstStudyWeek,
      schoolYearLabel: computedLabel,
      timezone,
      excludedPeriods: normHolidays,
      excludedRanges: normHolidays,
      migratedFromLegacyTimeline: true,
      migratedAt: new Date().toISOString()
    };
  }

  /**
   * Validate Chronology of SchoolYearTimelineConfig
   */
  public static validateTimeline(timeline: SchoolYearTimelineConfig): { isValid: boolean; error?: string } {
    if (!timeline.startDateHK1 || !timeline.endDateHK2) {
      return { isValid: false, error: 'Thiếu ngày bắt đầu hoặc kết thúc năm học.' };
    }

    if (timeline.endDateHK2 <= timeline.startDateHK1) {
      return {
        isValid: false,
        error: `Khung thời gian không hợp lệ: Ngày kết thúc năm học (${timeline.endDateHK2}) phải sau ngày bắt đầu (${timeline.startDateHK1}).`
      };
    }

    if (timeline.firstStudyWeekStartDate && (timeline.firstStudyWeekStartDate < timeline.startDateHK1 || timeline.firstStudyWeekStartDate > timeline.endDateHK2)) {
      return {
        isValid: false,
        error: 'Ngày bắt đầu Tuần 1 phải nằm trong khoảng thời gian của năm học.'
      };
    }

    if (timeline.endDateHK1 && timeline.startDateHK1 && timeline.endDateHK1 < timeline.startDateHK1) {
      return {
        isValid: false,
        error: 'Ngày kết thúc Học kỳ I phải sau ngày bắt đầu Học kỳ I.'
      };
    }

    if (timeline.startDateHK2 && timeline.endDateHK1 && timeline.startDateHK2 < timeline.endDateHK1) {
      return {
        isValid: false,
        error: 'Ngày bắt đầu Học kỳ II phải sau ngày kết thúc Học kỳ I.'
      };
    }

    if (timeline.endDateHK2 && timeline.startDateHK2 && timeline.endDateHK2 < timeline.startDateHK2) {
      return {
        isValid: false,
        error: 'Ngày kết thúc Học kỳ II phải sau ngày bắt đầu Học kỳ II.'
      };
    }

    return { isValid: true };
  }
}

export const parseDateToTimestamp = SchoolYearDateNormalizer.parseDateToTimestamp;
export const parseEventDateToTimestamp = SchoolYearDateNormalizer.parseEventDateToTimestamp;
export const formatMilestoneDisplayDate = SchoolYearDateNormalizer.formatMilestoneDisplayDate;
export const evaluateMilestoneStatus = SchoolYearDateNormalizer.evaluateMilestoneStatus;
export const getMilestoneTimeBoundaries = SchoolYearDateNormalizer.getMilestoneTimeBoundaries;
