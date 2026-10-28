/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LessonAssignment } from '../types';

/**
 * Returns current date string in Vietnam timezone (Asia/Ho_Chi_Minh) in YYYY-MM-DD format.
 */
export function getVietnamTodayISO(): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(new Date());
  } catch {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}

/**
 * Returns tomorrow date string in Vietnam timezone in YYYY-MM-DD format.
 */
export function getVietnamTomorrowISO(): string {
  const todayStr = getVietnamTodayISO();
  const [y, m, d] = todayStr.split('-').map(Number);
  const tomorrow = new Date(y, m - 1, d + 1, 12, 0, 0);
  const ty = tomorrow.getFullYear();
  const tm = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const td = String(tomorrow.getDate()).padStart(2, '0');
  return `${ty}-${tm}-${td}`;
}

/**
 * Safely parses a date string and returns day name in Vietnamese:
 * Thứ 2, Thứ 3, Thứ 4, Thứ 5, Thứ 6, Thứ 7, Chủ Nhật
 */
export function getVietnamDayOfWeekName(dateStr: string): string {
  if (!dateStr) return 'Thứ 2';

  const match = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const day = parseInt(match[3], 10);
    const dObj = new Date(year, month - 1, day, 12, 0, 0);
    const dayNames = [
      'Chủ Nhật',
      'Thứ 2',
      'Thứ 3',
      'Thứ 4',
      'Thứ 5',
      'Thứ 6',
      'Thứ 7'
    ];
    return dayNames[dObj.getDay()] || 'Thứ 2';
  }

  // Handle DD/MM/YYYY
  const vnMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (vnMatch) {
    const day = parseInt(vnMatch[1], 10);
    const month = parseInt(vnMatch[2], 10);
    const year = parseInt(vnMatch[3], 10);
    const dObj = new Date(year, month - 1, day, 12, 0, 0);
    const dayNames = [
      'Chủ Nhật',
      'Thứ 2',
      'Thứ 3',
      'Thứ 4',
      'Thứ 5',
      'Thứ 6',
      'Thứ 7'
    ];
    return dayNames[dObj.getDay()] || 'Thứ 2';
  }

  return 'Thứ 2';
}

/**
 * Formats a date string to the exact title format specified in prompt:
 * "Thứ 3 — Ngày 20/10/2026"
 */
export function formatVietnamDateTitle(dateStr: string): string {
  if (!dateStr) return 'Ngày học';

  // Check YYYY-MM-DD
  const match = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const day = parseInt(match[3], 10);
    const dObj = new Date(year, month - 1, day, 12, 0, 0);
    const dayNames = [
      'Chủ Nhật',
      'Thứ 2',
      'Thứ 3',
      'Thứ 4',
      'Thứ 5',
      'Thứ 6',
      'Thứ 7'
    ];
    const dayName = dayNames[dObj.getDay()] || 'Thứ';
    const padDay = String(day).padStart(2, '0');
    const padMonth = String(month).padStart(2, '0');
    return `${dayName} — Ngày ${padDay}/${padMonth}/${year}`;
  }

  // Check DD/MM/YYYY
  const vnMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (vnMatch) {
    const day = parseInt(vnMatch[1], 10);
    const month = parseInt(vnMatch[2], 10);
    const year = parseInt(vnMatch[3], 10);
    const dObj = new Date(year, month - 1, day, 12, 0, 0);
    const dayNames = [
      'Chủ Nhật',
      'Thứ 2',
      'Thứ 3',
      'Thứ 4',
      'Thứ 5',
      'Thứ 6',
      'Thứ 7'
    ];
    const dayName = dayNames[dObj.getDay()] || 'Thứ';
    const padDay = String(day).padStart(2, '0');
    const padMonth = String(month).padStart(2, '0');
    return `${dayName} — Ngày ${padDay}/${padMonth}/${year}`;
  }

  // Fallback if only day name or text
  return dateStr;
}

/**
 * Normalizes subject task preparation text from various legacy properties
 */
export function getAssignmentTaskContent(item: LessonAssignment): string {
  const content = item.preparation || item.description || item.homework || item.content || item.title || '';
  return content.trim();
}

/**
 * Formats a day's assignments to plain text for copying or sharing
 *
 * Example:
 * Thứ 3 — Ngày 20/10/2026
 * - Môn Toán: Kiểm tra thường xuyên.
 * - Môn Hóa học: Xem trước bài học tiếp theo.
 * - Môn Vật lí: Ôn tập nội dung đã học.
 */
export function formatAssignmentShareText(dateTitle: string, items: LessonAssignment[]): string {
  const lines: string[] = [dateTitle];
  items.forEach(item => {
    const content = getAssignmentTaskContent(item) || 'Chuẩn bị bài học theo hướng dẫn.';
    lines.push(`- Môn ${item.subject}: ${content}`);
  });
  return lines.join('\n');
}

/**
 * Color palette configurations for assignment highlighting & decoration
 */
export interface AssignmentColorOption {
  id: string;
  label: string;
  bgClass: string;
  borderClass: string;
  badgeBg: string;
  badgeText: string;
  hex: string;
}

export interface AssignmentTextColorOption {
  id: string;
  label: string;
  textClass: string;
  hex: string;
}

export const ASSIGNMENT_BG_COLORS: AssignmentColorOption[] = [
  {
    id: 'default',
    label: 'Mặc định (Trắng)',
    bgClass: 'bg-white',
    borderClass: 'border-slate-200',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-800',
    hex: '#ffffff'
  },
  {
    id: 'amber',
    label: 'Vàng nhạt (Nổi bật)',
    bgClass: 'bg-amber-50',
    borderClass: 'border-amber-200',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-800',
    hex: '#fef3c7'
  },
  {
    id: 'blue',
    label: 'Xanh lam (Ưu tiên)',
    bgClass: 'bg-blue-50',
    borderClass: 'border-blue-200',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-800',
    hex: '#dbeafe'
  },
  {
    id: 'emerald',
    label: 'Xanh lá (Tích cực)',
    bgClass: 'bg-emerald-50',
    borderClass: 'border-emerald-200',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-800',
    hex: '#d1fae5'
  },
  {
    id: 'rose',
    label: 'Hồng / Đỏ (Kiểm tra / Gấp)',
    bgClass: 'bg-rose-50',
    borderClass: 'border-rose-200',
    badgeBg: 'bg-rose-100',
    badgeText: 'text-rose-800',
    hex: '#ffe4e6'
  },
  {
    id: 'purple',
    label: 'Tím nhạt (Ôn tập)',
    bgClass: 'bg-purple-50',
    borderClass: 'border-purple-200',
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-800',
    hex: '#f3e8ff'
  },
  {
    id: 'sky',
    label: 'Xanh trời (Thông báo)',
    bgClass: 'bg-sky-50',
    borderClass: 'border-sky-200',
    badgeBg: 'bg-sky-100',
    badgeText: 'text-sky-800',
    hex: '#e0f2fe'
  }
];

export const ASSIGNMENT_TEXT_COLORS: AssignmentTextColorOption[] = [
  {
    id: 'default',
    label: 'Mặc định (Tối)',
    textClass: 'text-slate-800',
    hex: '#1e293b'
  },
  {
    id: 'blue',
    label: 'Xanh dương đậm',
    textClass: 'text-blue-700',
    hex: '#1d4ed8'
  },
  {
    id: 'rose',
    label: 'Đỏ / Hồng đậm',
    textClass: 'text-rose-700',
    hex: '#be123c'
  },
  {
    id: 'emerald',
    label: 'Xanh lá đậm',
    textClass: 'text-emerald-700',
    hex: '#047857'
  },
  {
    id: 'purple',
    label: 'Tím đậm',
    textClass: 'text-purple-700',
    hex: '#7e22ce'
  },
  {
    id: 'amber',
    label: 'Hổ phách đậm',
    textClass: 'text-amber-800',
    hex: '#92400e'
  }
];

export function getAssignmentBgClasses(colorId?: string): { bg: string; border: string } {
  if (!colorId || colorId === 'default' || colorId === '#ffffff') {
    return { bg: 'bg-white', border: 'border-slate-200' };
  }
  const match = ASSIGNMENT_BG_COLORS.find(c => c.id === colorId || c.hex === colorId);
  if (match) return { bg: match.bgClass, border: match.borderClass };
  return { bg: 'bg-white', border: 'border-slate-200' };
}

export function getAssignmentTextClass(colorId?: string): string {
  if (!colorId || colorId === 'default') {
    return 'text-slate-800';
  }
  const match = ASSIGNMENT_TEXT_COLORS.find(c => c.id === colorId || c.hex === colorId);
  if (match) return match.textClass;
  return 'text-slate-800';
}

/**
 * Normalizes any date string (YYYY-MM-DD, DD/MM/YYYY, ISO timestamp) into canonical YYYY-MM-DD format
 */
export function normalizeDateKey(rawDate?: string): string {
  if (!rawDate) return 'Khác';
  const isoMatch = rawDate.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, '0');
    const d = isoMatch[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const vnMatch = rawDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (vnMatch) {
    const d = vnMatch[1].padStart(2, '0');
    const m = vnMatch[2].padStart(2, '0');
    const y = vnMatch[3];
    return `${y}-${m}-${d}`;
  }
  return rawDate;
}

export interface DayPinnedGroup {
  dateKey: string;
  dateTitle: string;
  dayBgColor: string;
  dayTextColor: string;
  items: LessonAssignment[];
}

/**
 * Groups pinned assignments by date so that each study day has AT MOST ONE unified pinned block.
 * Includes all subjects of that day without duplicates.
 */
export function groupPinnedAssignmentsByDay(
  pinnedAssignments: LessonAssignment[],
  allAssignments: LessonAssignment[]
): DayPinnedGroup[] {
  const map = new Map<string, LessonAssignment[]>();

  // Collect all unique pinned dates
  pinnedAssignments.forEach(item => {
    const rawDate = item.date || item.assigned_date || item.dueDate;
    const dateKey = normalizeDateKey(rawDate);
    if (!map.has(dateKey)) {
      map.set(dateKey, []);
    }
  });

  return Array.from(map.keys()).map(dateKey => {
    // Find all assignments for this date in allAssignments
    const allDayItems = allAssignments.filter(
      a => normalizeDateKey(a.date || a.dueDate || a.assigned_date) === dateKey
    );

    const fallbackItems = pinnedAssignments.filter(
      a => normalizeDateKey(a.date || a.dueDate || a.assigned_date) === dateKey
    );

    const sourceItems = allDayItems.length > 0 ? allDayItems : fallbackItems;

    // Deduplicate items by ID
    const uniqueMap = new Map<string, LessonAssignment>();
    sourceItems.forEach(item => {
      if (item && item.id && !uniqueMap.has(item.id)) {
        uniqueMap.set(item.id, item);
      }
    });

    const displayItems = Array.from(uniqueMap.values());

    const dayBgColor = displayItems.find(i => i.bgColor && i.bgColor !== 'default')?.bgColor 
      || displayItems.find(i => i.bg_color && i.bg_color !== 'default')?.bg_color 
      || 'default';
    const dayTextColor = displayItems.find(i => i.textColor && i.textColor !== 'default')?.textColor 
      || displayItems.find(i => i.text_color && i.text_color !== 'default')?.text_color 
      || 'default';

    return {
      dateKey,
      dateTitle: formatVietnamDateTitle(dateKey),
      dayBgColor,
      dayTextColor,
      items: displayItems
    };
  }).sort((a, b) => {
    if (a.dateKey === 'Khác') return 1;
    if (b.dateKey === 'Khác') return -1;
    return b.dateKey.localeCompare(a.dateKey);
  });
}

