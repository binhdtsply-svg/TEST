/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  TimetableVersion,
  TimetableSlot,
  TimetablePeriod,
  LessonAssignment,
  ExamSchedule,
  StudentAcademicRecord,
  SubjectGrade,
  SharedGradeFile,
  AcademicPeriod,
  SubjectConfig,
  PeriodTimeConfig,
  AcademicPublication,
  UserRole,
  DayTimetable
} from '../types';
import {
  initialTimetable,
  initialAssignments,
  initialExamSchedules,
  initialAcademicRecords,
  initialSubjects,
  THPT_2018_STANDARD_SUBJECTS,
  GDTX_THPT_STANDARD_SUBJECTS
} from '../data/demoData';
import { classService } from './ClassService';
import { tenantService } from './TenantService';
import { studentService } from './StudentService';
import { calculateSubjectAverage, isEnteredValidScore } from './AcademicCalculationService';
import { inAppNotificationService } from './InAppNotificationService';
import { authRepository } from './AuthRepository';
import { authService } from './AuthService';
import { academicRepositoryClient } from './AcademicRepositoryClient';
import { SchoolYearDateNormalizer } from './SchoolYearDateNormalizer';
import { normalizeDateKey } from '../utils/assignmentUtils';

export { calculateSubjectAverage, isEnteredValidScore } from './AcademicCalculationService';

export function normalizeAcademicPeriod(period?: string): AcademicPeriod {
  if (!period) return 'midterm_hk1';
  const p = String(period).toLowerCase().trim().replace(/[-_\s]/g, '');
  if (p.includes('giua') && (p.includes('1') || p.includes('hk1') || p.includes('i'))) return 'midterm_hk1';
  if (p.includes('mid') && (p.includes('1') || p.includes('hk1'))) return 'midterm_hk1';
  if (p === 'gk1' || p === 'gki' || p === 'midtermhk1') return 'midterm_hk1';

  if (p.includes('giua') && (p.includes('2') || p.includes('hk2') || p.includes('ii'))) return 'midterm_hk2';
  if (p.includes('mid') && (p.includes('2') || p.includes('hk2'))) return 'midterm_hk2';
  if (p === 'gk2' || p === 'gkii' || p === 'midtermhk2') return 'midterm_hk2';

  if (p.includes('nam') || p.includes('year') || p.includes('annual') || p === 'cn' || p === 'canam') return 'full_year';

  if (p.includes('cuoi') && (p.includes('2') || p.includes('hk2') || p.includes('ii'))) return 'final_hk2';
  if (p.includes('final') && (p.includes('2') || p.includes('hk2'))) return 'final_hk2';
  if (p === 'ck2' || p === 'ckii' || p === 'hk2' || p === 'hocky2' || p === 'hockyii' || p === 'finalhk2') return 'final_hk2';

  if (p.includes('cuoi') && (p.includes('1') || p.includes('hk1') || p.includes('i'))) return 'final_hk1';
  if (p.includes('final') && (p.includes('1') || p.includes('hk1'))) return 'final_hk1';
  if (p === 'ck1' || p === 'cki' || p === 'hk1' || p === 'hocky1' || p === 'hockyi' || p === 'finalhk1') return 'final_hk1';

  return 'midterm_hk1';
}

export function getCanonicalSubjectCode(nameOrCode?: string): string {
  if (!nameOrCode) return '';
  const s = String(nameOrCode)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]/g, '')
    .trim();

  if (s.includes('toan')) return 'TOAN';
  if (s.includes('nguvan') || s === 'van') return 'VAN';
  if (s.includes('tienganh') || s.includes('ngoainngu') || s.includes('anh') || s.includes('eng')) return 'ENG';
  if (s.includes('lichsu') || s === 'su') return 'SU';
  if (s.includes('diali') || s.includes('dialy') || s === 'dia') return 'DIA';
  if (s.includes('vatli') || s.includes('vatly') || s === 'ly') return 'LY';
  if (s.includes('hoahoc') || s === 'hoa') return 'HOA';
  if (s.includes('sinhhoc') || s === 'sinh') return 'SINH';
  if (s.includes('tinhoc') || s === 'tin') return 'TIN';
  if (s.includes('congnghe') || s === 'cn') return 'CN';
  if (s.includes('thechat') || s.includes('theduc') || s.includes('gdtc')) return 'GDTC';
  if (s.includes('quocphong') || s.includes('gdqp')) return 'GDQP';
  if (s.includes('trainghiem') || s.includes('huongnghiep') || s.includes('hdtn')) return 'HDTN';
  if (s.includes('diaphuong') || s.includes('gddp')) return 'GDDP';
  if (s.includes('kinhte') || s.includes('phapluat') || s.includes('gdcd') || s.includes('gdkt')) return 'GDKTPL';

  return s.toUpperCase();
}

export function isSameSubject(
  subA?: { id?: string; subjectId?: string; code?: string; subjectCode?: string; name?: string; subjectName?: string },
  subB?: { id?: string; subjectId?: string; code?: string; subjectCode?: string; name?: string; subjectName?: string }
): boolean {
  if (!subA || !subB) return false;
  const idA = subA.id || (subA as any).subjectId;
  const idB = subB.id || (subB as any).subjectId;
  if (idA && idB && idA.toLowerCase().trim() === idB.toLowerCase().trim()) return true;

  const codeA = subA.subjectCode || subA.code;
  const codeB = subB.subjectCode || subB.code;
  if (codeA && codeB && codeA.toUpperCase().trim() === codeB.toUpperCase().trim()) return true;

  const nameA = subA.name || subA.subjectName || '';
  const nameB = subB.name || subB.subjectName || '';
  if (nameA && nameB && nameA.toLowerCase().trim() === nameB.toLowerCase().trim()) return true;

  const canA = getCanonicalSubjectCode(codeA || nameA || idA);
  const canB = getCanonicalSubjectCode(codeB || nameB || idB);
  if (canA && canB && canA === canB) return true;

  return false;
}

/**
 * Kiểm tra môn học đặc thù của THPT không thuộc chương trình GDTX cấp THPT
 * (Theo Thông tư 12/2022/TT-BGDĐT: GDTX không có GDTC, GDQP, HĐTN, GDĐP)
 */
export function isTHPTExclusiveSubject(subjectNameOrCode?: string): boolean {
  if (!subjectNameOrCode) return false;
  const s = String(subjectNameOrCode).toLowerCase().trim();
  const can = getCanonicalSubjectCode(s);
  if (can === 'GDTC' || can === 'GDQP' || can === 'HDTN' || can === 'GDDP') {
    return true;
  }
  return s.includes('thể chất') ||
         s.includes('the chat') ||
         s.includes('quốc phòng') ||
         s.includes('quoc phong') ||
         s.includes('trải nghiệm') ||
         s.includes('trai nghiem') ||
         s.includes('hướng nghiệp') ||
         s.includes('huong nghiep') ||
         s.includes('địa phương') ||
         s.includes('dia phuong');
}

export const PERIOD_NAMES: Record<AcademicPeriod, string> = {
  midterm_hk1: 'Giữa HKI',
  final_hk1: 'Cuối HKI',
  midterm_hk2: 'Giữa HKII',
  final_hk2: 'Cuối HKII',
  full_year: 'Điểm cuối năm học'
};

export const DEFAULT_SUBJECT_COLORS: Record<string, { bg: string; border: string; text: string; label: string }> = {
  'Toán học': { bg: 'bg-blue-50/90', border: 'border-blue-300', text: 'text-blue-950', label: 'Xanh dương pastel' },
  'Ngữ văn': { bg: 'bg-purple-50/90', border: 'border-purple-300', text: 'text-purple-950', label: 'Tím pastel' },
  'Tiếng Anh': { bg: 'bg-indigo-50/90', border: 'border-indigo-300', text: 'text-indigo-950', label: 'Chàm pastel' },
  'Vật lí': { bg: 'bg-cyan-50/90', border: 'border-cyan-300', text: 'text-cyan-950', label: 'Cyan pastel' },
  'Vật lý': { bg: 'bg-cyan-50/90', border: 'border-cyan-300', text: 'text-cyan-950', label: 'Cyan pastel' },
  'Hóa học': { bg: 'bg-teal-50/90', border: 'border-teal-300', text: 'text-teal-950', label: 'Xanh ngọc pastel' },
  'Hoá học': { bg: 'bg-teal-50/90', border: 'border-teal-300', text: 'text-teal-950', label: 'Xanh ngọc pastel' },
  'Sinh học': { bg: 'bg-emerald-50/90', border: 'border-emerald-300', text: 'text-emerald-950', label: 'Lục pastel' },
  'Lịch sử': { bg: 'bg-amber-50/90', border: 'border-amber-300', text: 'text-amber-950', label: 'Vàng nhạt pastel' },
  'Địa lí': { bg: 'bg-orange-50/90', border: 'border-orange-300', text: 'text-orange-950', label: 'Cam nhạt pastel' },
  'Địa lý': { bg: 'bg-orange-50/90', border: 'border-orange-300', text: 'text-orange-950', label: 'Cam nhạt pastel' },
  'Tin học': { bg: 'bg-violet-50/90', border: 'border-violet-300', text: 'text-violet-950', label: 'Tím hoa cà pastel' },
  'Giáo dục kinh tế và pháp luật': { bg: 'bg-slate-100', border: 'border-slate-300', text: 'text-slate-800', label: 'Xám sáng pastel' },
  'GD Kinh tế & Pháp luật': { bg: 'bg-slate-100', border: 'border-slate-300', text: 'text-slate-800', label: 'Xám sáng pastel' },
  'Công nghệ': { bg: 'bg-lime-50/90', border: 'border-lime-300', text: 'text-lime-950', label: 'Xanh cốm pastel' },
  'Giáo dục quốc phòng và an ninh': { bg: 'bg-stone-100', border: 'border-stone-300', text: 'text-stone-800', label: 'Rêu cát pastel' },
  'Giáo dục Quốc phòng - AN': { bg: 'bg-stone-100', border: 'border-stone-300', text: 'text-stone-800', label: 'Rêu cát pastel' },
  'Giáo dục thể chất': { bg: 'bg-rose-50/90', border: 'border-rose-300', text: 'text-rose-950', label: 'Hồng pastel' },
  'Giáo dục Thể chất': { bg: 'bg-rose-50/90', border: 'border-rose-300', text: 'text-rose-950', label: 'Hồng pastel' },
  'Âm nhạc': { bg: 'bg-pink-50/90', border: 'border-pink-300', text: 'text-pink-950', label: 'Hồng sen pastel' },
  'Mĩ thuật': { bg: 'bg-rose-50/90', border: 'border-rose-300', text: 'text-rose-950', label: 'Đỏ hoa hồng pastel' },
  'Mỹ thuật': { bg: 'bg-rose-50/90', border: 'border-rose-300', text: 'text-rose-950', label: 'Đỏ hoa hồng pastel' },
  'Hoạt động trải nghiệm, hướng nghiệp': { bg: 'bg-sky-50/90', border: 'border-sky-300', text: 'text-sky-950', label: 'Xanh da trời pastel' },
  'Nội dung giáo dục của địa phương': { bg: 'bg-yellow-50/90', border: 'border-yellow-300', text: 'text-yellow-950', label: 'Vàng cam pastel' },
  'Chào cờ': { bg: 'bg-green-50/90', border: 'border-green-300', text: 'text-green-950', label: 'Xanh lá pastel' },
  'Sinh hoạt lớp': { bg: 'bg-emerald-50/90', border: 'border-emerald-300', text: 'text-emerald-950', label: 'Lục pastel' }
};

export const DEFAULT_SUBJECT_CONFIGS: Record<string, number> = {
  'Toán học': 4,
  'Ngữ văn': 4,
  'Tiếng Anh': 4,
  'Vật lí': 3,
  'Hóa học': 3,
  'Sinh học': 3,
  'Lịch sử': 2,
  'Địa lí': 2,
  'Tin học': 3,
  'Giáo dục kinh tế và pháp luật': 3,
  'GD Kinh tế & Pháp luật': 3,
  'Công nghệ': 3,
  'Giáo dục quốc phòng và an ninh': 2,
  'Giáo dục Quốc phòng - AN': 2,
  'Giáo dục Thể chất': 0,
  'Giáo dục thể chất': 0,
  'Khoa học tự nhiên': 4,
  'Lịch sử và Địa lí': 3,
  'Giáo dục công dân': 2,
  'Tiếng Việt': 4,
  'Khoa học': 3,
  'Tin học và Công nghệ': 3
};

export const DEFAULT_PERIOD_TIMES: { morning: PeriodTimeConfig[]; afternoon: PeriodTimeConfig[] } = {
  morning: [
    { period: 1, session: 'morning', startTime: '07:00', endTime: '07:45' },
    { period: 2, session: 'morning', startTime: '07:50', endTime: '08:35' },
    { period: 3, session: 'morning', startTime: '08:50', endTime: '09:35' },
    { period: 4, session: 'morning', startTime: '09:40', endTime: '10:25' },
    { period: 5, session: 'morning', startTime: '10:30', endTime: '11:15' }
  ],
  afternoon: [
    { period: 1, session: 'afternoon', startTime: '13:30', endTime: '14:15' },
    { period: 2, session: 'afternoon', startTime: '14:20', endTime: '15:05' },
    { period: 3, session: 'afternoon', startTime: '15:20', endTime: '16:05' },
    { period: 4, session: 'afternoon', startTime: '16:10', endTime: '16:55' },
    { period: 5, session: 'afternoon', startTime: '17:00', endTime: '17:45' }
  ]
};

const initialSharedGradeFiles: SharedGradeFile[] = [
  {
    id: 'sgf-1',
    title: 'Bảng điểm Tổng kết Giữa Học kỳ I - Lớp 11A1 (Chính thức)',
    description: 'Bảng tổng hợp điểm kiểm tra định kỳ có chữ ký xác nhận của Ban Giám hiệu và GVCN.',
    file: {
      id: 'f-sgf-1',
      name: 'Bang_Diem_Giua_HK1_11A1.pdf',
      url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      type: 'pdf',
      size: '420 KB'
    },
    period: 'midterm_hk1',
    semester: 'HK1',
    schoolYear: '2025 - 2026',
    targetType: 'class',
    teacherVisible: true,
    parentVisible: true,
    studentVisible: true,
    uploadedBy: 'Cô Nguyễn Thị Mai Lan (GVCN)',
    uploadedAt: '12/11/2025 15:30'
  },
  {
    id: 'sgf-2',
    title: 'Phiếu Báo Điểm Chi Tiết - Em Trần Phương Linh (Giữa HKI)',
    description: 'Phiếu điểm chi tiết từng cột điểm thành phần và nhận xét của GVCN.',
    file: {
      id: 'f-sgf-2',
      name: 'Phieu_Diem_TranPhuongLinh_GiuaHK1.pdf',
      url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      type: 'pdf',
      size: '280 KB'
    },
    period: 'midterm_hk1',
    semester: 'HK1',
    schoolYear: '2025 - 2026',
    targetType: 'student',
    studentId: 'hs-02',
    studentName: 'Trần Phương Linh',
    teacherVisible: true,
    parentVisible: true,
    studentVisible: true,
    uploadedBy: 'Cô Nguyễn Thị Mai Lan (GVCN)',
    uploadedAt: '20/11/2025 09:00'
  },
  {
    id: 'sgf-3',
    title: 'Phiếu Báo Điểm Chi Tiết - Em Nguyễn Gia Huy (Giữa HKI)',
    description: 'Phiếu điểm chi tiết từng cột điểm thành phần và nhận xét của GVCN.',
    file: {
      id: 'f-sgf-3',
      name: 'Phieu_Diem_NguyenGiaHuy_GiuaHK1.pdf',
      url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      type: 'pdf',
      size: '285 KB'
    },
    period: 'midterm_hk1',
    semester: 'HK1',
    schoolYear: '2025 - 2026',
    targetType: 'student',
    studentId: 'hs-01',
    studentName: 'Nguyễn Gia Huy',
    teacherVisible: true,
    parentVisible: true,
    studentVisible: true,
    uploadedBy: 'Cô Nguyễn Thị Mai Lan (GVCN)',
    uploadedAt: '20/11/2025 09:00'
  }
];

class AcademicService {
  private activeTenantId: string = 'tenant-lan-nguyen';
  private timetable: TimetableVersion = { ...initialTimetable };
  private appliedTimetable: TimetableVersion = { ...initialTimetable };
  private timetableHistory: TimetableVersion[] = [
    { ...initialTimetable },
    {
      id: 'tkb-v0-hk1-2025',
      versionName: 'TKB Khai giảng (05/09 - 14/09/2025)',
      semester: 'HK1',
      validFrom: '05/09/2025',
      validTo: '14/09/2025',
      isActive: false,
      schedule: initialTimetable.schedule
    }
  ];
  private assignments: LessonAssignment[] = [...initialAssignments];
  private examSchedules: ExamSchedule[] = [...initialExamSchedules];
  // Key format: `${studentId}_${period}`
  private academicRecords: Record<string, StudentAcademicRecord> = {};
  // Publications tracking: Key format: `${studentId}_${period}`
  private publications: Record<string, AcademicPublication> = {};
  private sharedGradeFiles: SharedGradeFile[] = [...initialSharedGradeFiles];
  private subjectConfigs: Record<string, number> = { ...DEFAULT_SUBJECT_CONFIGS };
  private periodTimes: { morning: PeriodTimeConfig[]; afternoon: PeriodTimeConfig[] } = {
    morning: [...DEFAULT_PERIOD_TIMES.morning],
    afternoon: [...DEFAULT_PERIOD_TIMES.afternoon]
  };
  private listeners: Array<() => void> = [];
  private inFlightSyncPromise: Promise<boolean> | null = null;
  private pendingForceSync: boolean = false;
  private refreshDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.activeTenantId = tenantService.getActiveTenantId();
    this.loadFromStorage(this.activeTenantId);
    this.fetchAssignmentsFromServer();
    this.fetchTimetableFromServer();

    tenantService.subscribe(() => {
      const nextTenantId = tenantService.getActiveTenantId();
      if (nextTenantId !== this.activeTenantId) {
        this.activeTenantId = nextTenantId;
        this.loadFromStorage(nextTenantId);
        this.notify();
        this.fetchAssignmentsFromServer();
        this.fetchTimetableFromServer();
      }
    });

    authService.subscribe(() => {
      this.fetchTimetableFromServer();
      this.fetchAssignmentsFromServer();
      this.syncWithBackendServer(this.activeTenantId, true).catch(() => {});
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
    this.fetchAssignmentsFromServer();
    this.fetchTimetableFromServer();
  }

  public refresh(): void {
    this.reloadForActiveTenant();
  }

  public scheduleServerRecordsRefresh(delayMs: number = 150): void {
    if (this.refreshDebounceTimer) {
      clearTimeout(this.refreshDebounceTimer);
    }
    this.refreshDebounceTimer = setTimeout(() => {
      this.refreshDebounceTimer = null;
      this.syncWithBackendServer(this.activeTenantId, true).catch(() => {});
    }, delayMs);
  }

  public async fetchTimetableFromServer(): Promise<void> {
    try {
      const token = authRepository.getSessionToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const classSettings = classService.getSettings();
      const classId = classSettings.classId || classSettings.id || `class-${this.activeTenantId}`;
      const academicYear = classSettings.academicYear || '2025 - 2026';
      const semester = this.timetable.semester === 'HK2' ? 'Học kỳ II' : 'Học kỳ I';
      const params = new URLSearchParams({ classId, academicYear, semester });

      const res = await fetch(`/api/v1/timetable?${params.toString()}`, { headers });
      const resData = await res.json();
      if (resData.success && resData.data) {
        const raw = resData.data.rawGrid;
        const grid = resData.data.scheduleGrid;

        let currentUserRole: UserRole = 'TEACHER';
        try {
          const u = authService.getCurrentUser();
          if (u) currentUserRole = u.role;
        } catch {
          // ignore
        }

        if (currentUserRole !== 'TEACHER' && (currentUserRole as any) !== 'SUPER_ADMIN') {
          // Student & Parent strictly receive applied timetable from server
          const appliedSource = raw?.applied || grid;
          if (appliedSource) {
            const normApplied = this.normalizeTimetableVersion(appliedSource);
            this.timetable = normApplied;
            this.appliedTimetable = normApplied;
          }
        } else {
          // Teacher & Admin receive working draft, applied version, and history
          if (raw && typeof raw === 'object' && raw.working) {
            this.timetable = this.normalizeTimetableVersion(raw.working);
            if (raw.applied) {
              this.appliedTimetable = this.normalizeTimetableVersion(raw.applied);
            } else {
              this.appliedTimetable = this.normalizeTimetableVersion(raw.working);
            }
            if (Array.isArray(raw.history)) {
              this.timetableHistory = raw.history.map((h: any) => this.normalizeTimetableVersion(h));
            }
          } else if (grid) {
            const norm = this.normalizeTimetableVersion(grid);
            this.timetable = norm;
            this.appliedTimetable = norm;
          }
        }
        this.saveToStorage();
        this.notify();
      }
    } catch {
      // offline fallback
    }
  }

  public async syncTimetableToServer(
    status: 'DRAFT' | 'APPLIED' = 'DRAFT',
    overridePayload?: {
      working?: TimetableVersion;
      applied?: TimetableVersion;
      history?: TimetableVersion[];
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const token = authRepository.getSessionToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const classSettings = classService.getSettings();
      const classId = classSettings.classId || classSettings.id || `class-${this.activeTenantId}`;
      const academicYear = classSettings.academicYear || '2025 - 2026';
      const activeWorking = overridePayload?.working || this.timetable;
      const semester = (activeWorking?.semester === 'HK2') ? 'Học kỳ II' : 'Học kỳ I';

      const res = await fetch('/api/v1/timetable', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          classId,
          academicYear,
          semester,
          status,
          action: status === 'APPLIED' ? 'APPLY' : 'SAVE',
          scheduleGrid: {
            working: overridePayload?.working || this.timetable,
            applied: overridePayload?.applied || this.appliedTimetable,
            history: overridePayload?.history || this.timetableHistory,
            status
          }
        })
      });

      const resData = await res.json().catch(() => null);
      if (!res.ok || (resData && resData.success === false)) {
        return {
          success: false,
          error: resData?.message || `Lỗi máy chủ (${res.status})`
        };
      }
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Không thể kết nối đến máy chủ lưu trữ'
      };
    }
  }

  public async fetchAssignmentsFromServer(): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      const token = authRepository.getSessionToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/v1/timetable/assignments', { headers });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        if (data.data.length > 0) {
          const serverAssigns: LessonAssignment[] = data.data.map((a: any) => {
            const existingLocal = this.assignments.find(l => l.id === a.id);
            const isPinned = (a.is_pinned !== undefined && a.is_pinned !== null)
              ? (a.is_pinned === 1 || a.is_pinned === true)
              : Boolean(existingLocal?.isPinned || existingLocal?.pinnedToOverview);
            const bgColor = (a.bg_color !== undefined && a.bg_color !== null)
              ? a.bg_color
              : (existingLocal?.bgColor || existingLocal?.bg_color || '');
            const textColor = (a.text_color !== undefined && a.text_color !== null)
              ? a.text_color
              : (existingLocal?.textColor || existingLocal?.text_color || '');

            return {
              id: a.id,
              subject: a.subject,
              title: a.title,
              dayOfWeek: existingLocal?.dayOfWeek || 'Thứ 2',
              period: existingLocal?.period || 1,
              date: a.assigned_date,
              assigned_date: a.assigned_date,
              homework: a.description || existingLocal?.homework || '',
              preparation: a.description || existingLocal?.preparation || '',
              description: a.description || existingLocal?.description || '',
              suppliesNeeded: existingLocal?.suppliesNeeded || '',
              deadline: a.due_date || existingLocal?.deadline || '',
              dueDate: a.due_date || existingLocal?.dueDate || '',
              pinnedToOverview: isPinned,
              isPinned: isPinned,
              bgColor: bgColor,
              textColor: textColor,
              bg_color: bgColor,
              text_color: textColor,
              attachments: existingLocal?.attachments || [],
              createdByName: a.author_name || existingLocal?.createdByName || 'GVCN',
              createdByRole: a.author_role || existingLocal?.createdByRole || 'TEACHER',
              authorRole: a.author_role || existingLocal?.authorRole || 'TEACHER',
              authorName: a.author_name || existingLocal?.authorName || 'GVCN',
              status: a.status === 'ACTIVE' ? 'approved' : 'pending'
            };
          });

          // Ensure day-level pin consistency: if any item on a date is pinned, all items on that date are pinned
          const pinnedDates = new Set<string>();
          serverAssigns.forEach(a => {
            if (a.isPinned || a.pinnedToOverview) {
              const d = normalizeDateKey(a.date || a.dueDate || a.assigned_date);
              if (d && d !== 'Khác') pinnedDates.add(d);
            }
          });

          this.assignments = serverAssigns.map(a => {
            const d = normalizeDateKey(a.date || a.dueDate || a.assigned_date);
            if (pinnedDates.has(d)) {
              return { ...a, isPinned: true, pinnedToOverview: true };
            }
            return a;
          });
          this.saveToStorage();
          this.notify();
        }
      }
    } catch (err) {
      console.warn('[AcademicService] Assignment sync notice:', err);
    }
  }

  private normalizeTimetableVersion(tkb: any): TimetableVersion {
    if (!tkb) return { ...initialTimetable };
    const DAYS_LIST: Array<'Thứ 2' | 'Thứ 3' | 'Thứ 4' | 'Thứ 5' | 'Thứ 6' | 'Thứ 7'> = [
      'Thứ 2',
      'Thứ 3',
      'Thứ 4',
      'Thứ 5',
      'Thứ 6',
      'Thứ 7'
    ];
    let safeSchedule: any[] = [];
    const raw = tkb.schedule;

    const mapLegacyPeriods = (periodsArr: any[]): { morningPeriods: TimetablePeriod[]; afternoonPeriods: TimetablePeriod[] } => {
      const morning: TimetablePeriod[] = [];
      const afternoon: TimetablePeriod[] = [];
      if (!Array.isArray(periodsArr)) return { morningPeriods: morning, afternoonPeriods: afternoon };

      periodsArr.forEach((item: any, idx: number) => {
        const periodNum = (idx % 5) + 1;
        const subject = typeof item === 'string' ? item : (item?.subject || '');
        const teacher = typeof item === 'object' ? (item?.teacher || '') : '';
        const room = typeof item === 'object' ? (item?.room || '') : '';
        const note = typeof item === 'object' ? (item?.note || '') : '';

        if (idx < 5) {
          morning.push({ period: periodNum, subject, teacher, room, note });
        } else {
          afternoon.push({ period: periodNum, subject, teacher, room, note });
        }
      });
      return { morningPeriods: morning, afternoonPeriods: afternoon };
    };

    if (Array.isArray(raw)) {
      safeSchedule = DAYS_LIST.map((dayName, idx) => {
        const found = raw.find((item: any) => item?.dayOfWeek === dayName || item?.day === dayName);
        if (found) {
          let morningPeriods = Array.isArray(found.morningPeriods) ? found.morningPeriods : [];
          let afternoonPeriods = Array.isArray(found.afternoonPeriods) ? found.afternoonPeriods : [];

          if (morningPeriods.length === 0 && afternoonPeriods.length === 0 && Array.isArray(found.periods)) {
            const mapped = mapLegacyPeriods(found.periods);
            morningPeriods = mapped.morningPeriods;
            afternoonPeriods = mapped.afternoonPeriods;
          }

          return {
            dayOfWeek: dayName,
            morningPeriods: morningPeriods.map((p: any, pIdx: number) => ({
              period: p?.period || pIdx + 1,
              subject: p?.subject || '',
              teacher: p?.teacher || '',
              room: p?.room || '',
              note: p?.note || ''
            })),
            afternoonPeriods: afternoonPeriods.map((p: any, pIdx: number) => ({
              period: p?.period || pIdx + 1,
              subject: p?.subject || '',
              teacher: p?.teacher || '',
              room: p?.room || '',
              note: p?.note || ''
            }))
          };
        }

        const rawItem = raw[idx];
        if (rawItem && Array.isArray(rawItem.periods)) {
          const mapped = mapLegacyPeriods(rawItem.periods);
          return {
            dayOfWeek: dayName,
            morningPeriods: mapped.morningPeriods,
            afternoonPeriods: mapped.afternoonPeriods
          };
        }

        return { dayOfWeek: dayName, morningPeriods: [], afternoonPeriods: [] };
      });
    } else if (raw && typeof raw === 'object') {
      const daysSource = Array.isArray(raw.days) ? raw.days : (Array.isArray(raw.schedule) ? raw.schedule : null);
      if (daysSource) {
        safeSchedule = DAYS_LIST.map(dayName => {
          const found = daysSource.find((item: any) => item?.dayOfWeek === dayName || item?.day === dayName);
          if (found) {
            let morningPeriods = Array.isArray(found.morningPeriods) ? found.morningPeriods : [];
            let afternoonPeriods = Array.isArray(found.afternoonPeriods) ? found.afternoonPeriods : [];
            if (morningPeriods.length === 0 && afternoonPeriods.length === 0 && Array.isArray(found.periods)) {
              const mapped = mapLegacyPeriods(found.periods);
              morningPeriods = mapped.morningPeriods;
              afternoonPeriods = mapped.afternoonPeriods;
            }
            return { dayOfWeek: dayName, morningPeriods, afternoonPeriods };
          }
          return { dayOfWeek: dayName, morningPeriods: [], afternoonPeriods: [] };
        });
      } else {
        const dayKeyMap: Record<string, string> = {
          'T2': 'Thứ 2', 'T3': 'Thứ 3', 'T4': 'Thứ 4', 'T5': 'Thứ 5', 'T6': 'Thứ 6', 'T7': 'Thứ 7',
          'Thứ 2': 'Thứ 2', 'Thứ 3': 'Thứ 3', 'Thứ 4': 'Thứ 4', 'Thứ 5': 'Thứ 5', 'Thứ 6': 'Thứ 6', 'Thứ 7': 'Thứ 7',
          '2': 'Thứ 2', '3': 'Thứ 3', '4': 'Thứ 4', '5': 'Thứ 5', '6': 'Thứ 6', '7': 'Thứ 7'
        };
        safeSchedule = DAYS_LIST.map(dayName => {
          let dayData: any = null;
          for (const [key, val] of Object.entries(raw)) {
            if (dayKeyMap[key] === dayName || key.toLowerCase() === dayName.toLowerCase()) {
              dayData = val;
              break;
            }
          }
          if (Array.isArray(dayData)) {
            return {
              dayOfWeek: dayName,
              morningPeriods: dayData.filter((p: any) => p.session !== 'afternoon' && (p.period <= 5 || !p.session)),
              afternoonPeriods: dayData.filter((p: any) => p.session === 'afternoon' || p.period > 5)
            };
          }
          if (dayData && typeof dayData === 'object') {
            return {
              dayOfWeek: dayName,
              morningPeriods: Array.isArray(dayData.morningPeriods) ? dayData.morningPeriods : [],
              afternoonPeriods: Array.isArray(dayData.afternoonPeriods) ? dayData.afternoonPeriods : []
            };
          }
          return { dayOfWeek: dayName, morningPeriods: [], afternoonPeriods: [] };
        });
      }
    } else {
      safeSchedule = DAYS_LIST.map(dayName => ({
        dayOfWeek: dayName,
        morningPeriods: [],
        afternoonPeriods: []
      }));
    }

    return {
      id: tkb.id || `tkb-${Date.now()}`,
      versionName: tkb.versionName || (tkb as any).name || 'Thời khóa biểu Chính thức',
      semester: tkb.semester || 'HK1',
      validFrom: tkb.validFrom || '15/09/2025',
      validTo: tkb.validTo,
      isActive: tkb.isActive !== undefined ? Boolean(tkb.isActive) : true,
      isApplied: tkb.isApplied !== undefined ? Boolean(tkb.isApplied) : true,
      appliedAt: tkb.appliedAt,
      schedule: safeSchedule
    };
  }

  private loadFromStorage(tenantId: string) {
    const tId = tenantService.normalizeTenantId(tenantId);
    try {
      const tkbKey = tenantService.getTenantStorageKey('timetable', tId);
      const savedTkb = localStorage.getItem(tkbKey);
      if (savedTkb) {
        this.timetable = this.normalizeTimetableVersion(JSON.parse(savedTkb));
      } else {
        if (tId === 'tenant-lan-nguyen') {
          const legacy = localStorage.getItem('kgcns_timetable');
          if (legacy) {
            this.timetable = this.normalizeTimetableVersion(JSON.parse(legacy));
            localStorage.setItem(tkbKey, legacy);
          } else {
            this.timetable = { ...initialTimetable };
          }
        } else {
          this.timetable = { ...initialTimetable, id: `tkb-${tId}`, versionName: 'Thời khóa biểu chính thức HK1' };
        }
      }

      const appliedKey = tenantService.getTenantStorageKey('timetable_applied', tId);
      const savedApplied = localStorage.getItem(appliedKey);
      if (savedApplied) {
        this.appliedTimetable = this.normalizeTimetableVersion(JSON.parse(savedApplied));
      } else {
        this.appliedTimetable = JSON.parse(JSON.stringify(this.timetable));
      }

      const tkbHistKey = tenantService.getTenantStorageKey('timetable_history', tId);
      const savedTkbHist = localStorage.getItem(tkbHistKey);
      if (savedTkbHist) {
        const parsed = JSON.parse(savedTkbHist);
        if (Array.isArray(parsed)) {
          this.timetableHistory = parsed.map(v => this.normalizeTimetableVersion(v));
        } else {
          this.timetableHistory = [this.timetable];
        }
      } else {
        this.timetableHistory = [this.timetable];
      }

      const assignKey = tenantService.getTenantStorageKey('assignments', tId);
      const savedAssign = localStorage.getItem(assignKey);
      if (savedAssign) {
        this.assignments = JSON.parse(savedAssign);
      } else {
        this.assignments = tId === 'tenant-lan-nguyen' ? [...initialAssignments] : [];
      }

      const examsKey = tenantService.getTenantStorageKey('exams', tId);
      const savedExams = localStorage.getItem(examsKey);
      if (savedExams) {
        this.examSchedules = JSON.parse(savedExams);
      } else {
        this.examSchedules = tId === 'tenant-lan-nguyen' ? [...initialExamSchedules] : [];
      }

      const recsKey = tenantService.getTenantStorageKey('academic_records', tId);
      const savedRecords = localStorage.getItem(recsKey);
      if (savedRecords) {
        this.academicRecords = JSON.parse(savedRecords);
      } else {
        this.academicRecords = {};
        if (tId === 'tenant-lan-nguyen') {
          const legacyRecs = localStorage.getItem('kgcns_academic_records');
          if (legacyRecs) {
            this.academicRecords = JSON.parse(legacyRecs);
            localStorage.setItem(recsKey, legacyRecs);
          } else {
            this.initDefaultRecords();
          }
        }
      }

      const pubsKey = tenantService.getTenantStorageKey('academic_publications', tId);
      const savedPubs = localStorage.getItem(pubsKey);
      if (savedPubs) {
        try {
          this.publications = JSON.parse(savedPubs);
        } catch {
          this.publications = {};
        }
      } else {
        if (!this.publications) {
          this.publications = {};
        }
        // If this.publications has not been populated, reconstruct from published academic records
        if (Object.keys(this.publications).length === 0) {
          Object.entries(this.academicRecords).forEach(([key, rec]) => {
            if (rec && (rec.publishedToStudent || rec.publishedToParent || rec.publicationStatus === 'PUBLISHED')) {
              this.publications[key] = {
                period: normalizeAcademicPeriod(rec.period),
                studentId: rec.studentId,
                status: 'PUBLISHED',
                publishedAt: rec.publishedAt || '20/11/2025 lúc 09:00',
                publishedBy: rec.publishedBy || 'Cô Nguyễn Thị Mai Lan (GVCN)',
                publicationVersion: rec.publicationVersion || 1,
                snapshot: JSON.parse(JSON.stringify(rec))
              };
            }
          });
        }
      }

      const filesKey = tenantService.getTenantStorageKey('shared_grade_files', tId);
      const savedFiles = localStorage.getItem(filesKey);
      if (savedFiles) {
        this.sharedGradeFiles = JSON.parse(savedFiles);
      } else {
        this.sharedGradeFiles = tId === 'tenant-lan-nguyen' ? [...initialSharedGradeFiles] : [];
      }

      const subConfigsKey = tenantService.getTenantStorageKey('subject_configs', tId);
      const savedSubjectConfigs = localStorage.getItem(subConfigsKey);
      if (savedSubjectConfigs) {
        this.subjectConfigs = JSON.parse(savedSubjectConfigs);
      } else {
        this.subjectConfigs = { ...DEFAULT_SUBJECT_CONFIGS };
      }

      const periodTimesKey = tenantService.getTenantStorageKey('period_times', tId);
      const savedPeriodTimes = localStorage.getItem(periodTimesKey);
      if (savedPeriodTimes) {
        this.periodTimes = JSON.parse(savedPeriodTimes);
      } else {
        this.periodTimes = {
          morning: [...DEFAULT_PERIOD_TIMES.morning],
          afternoon: [...DEFAULT_PERIOD_TIMES.afternoon]
        };
      }
      this.syncWithBackendServer(tId).catch(() => {});
    } catch {
      // fallback
    }
  }

  public async syncWithBackendServer(tenantId?: string, forceSync: boolean = false): Promise<boolean> {
    const tId = tenantService.normalizeTenantId(tenantId || this.activeTenantId);
    if (this.inFlightSyncPromise) {
      if (forceSync) {
        this.pendingForceSync = true;
      }
      return this.inFlightSyncPromise;
    }

    this.inFlightSyncPromise = this.performSyncWithBackendServer(tId, forceSync).finally(() => {
      this.inFlightSyncPromise = null;
      if (this.pendingForceSync) {
        this.pendingForceSync = false;
        this.syncWithBackendServer(this.activeTenantId, true).catch(() => {});
      }
    });

    return this.inFlightSyncPromise;
  }

  private async performSyncWithBackendServer(tId: string, forceSync: boolean): Promise<boolean> {
    const hasToken = Boolean(authRepository.getSessionToken());
    try {
      const res = await academicRepositoryClient.getRecords();
      if (!res || !res.success) {
        return !hasToken;
      }
      if (Array.isArray(res.data) && res.data.length > 0) {
        let changed = false;
        const appliedServerTsByKey: Record<string, number> = {};

        // Sort ascending by updatedAt so that when multiple rows exist for the same (studentId, period),
        // the most recently updated server row is processed last and always takes precedence.
        const sortedRows = [...res.data].sort((a: any, b: any) => {
          const tsA = SchoolYearDateNormalizer.parseDateToTimestamp(a?.updatedAt || a?.scores?.updatedAt);
          const tsB = SchoolYearDateNormalizer.parseDateToTimestamp(b?.updatedAt || b?.scores?.updatedAt);
          return tsA - tsB;
        });

        sortedRows.forEach((row: any) => {
          const sid = row.studentId;
          const scores = row.scores;
          if (scores && typeof scores === 'object') {
            const rawPeriod = scores.period || (scores.fullRecord && scores.fullRecord.period) || 'midterm_hk1';
            const period = normalizeAcademicPeriod(rawPeriod);
            const key = `${sid}_${period}`;
            const existing = this.academicRecords[key];

            const serverTs = SchoolYearDateNormalizer.parseDateToTimestamp(row.updatedAt || scores.updatedAt);
            const clientTs = SchoolYearDateNormalizer.parseDateToTimestamp(existing?.updatedAt);
            const prevBatchTs = appliedServerTsByKey[key];

            // Skip if an even newer server row for the same (studentId, period) was already applied in this batch
            if (prevBatchTs !== undefined && serverTs > 0 && prevBatchTs > serverTs) {
              return;
            }

            // Server record is authoritative if client record doesn't exist, or forceSync is true, or serverTs >= clientTs - 5000 (allowing 5s clock skew), or serverTs === 0
            if (forceSync || !existing || serverTs >= clientTs - 5000 || serverTs === 0) {
              if (serverTs > 0) {
                appliedServerTsByKey[key] = serverTs;
              }
              if (scores.fullRecord) {
                this.academicRecords[key] = {
                  ...scores.fullRecord,
                  grades: Array.isArray(scores.grades) ? scores.grades : scores.fullRecord.grades,
                  gpa: row.gpa !== undefined ? row.gpa : (scores.gpa !== undefined ? scores.gpa : scores.fullRecord.gpa),
                  academicRank: row.academicRank !== undefined ? row.academicRank : (scores.academicRank !== undefined ? scores.academicRank : scores.fullRecord.academicRank),
                  publishedToStudent: scores.publishedToStudent ?? scores.fullRecord.publishedToStudent ?? false,
                  publishedToParent: scores.publishedToParent ?? scores.fullRecord.publishedToParent ?? false,
                  publicationStatus: scores.publicationStatus || scores.fullRecord.publicationStatus || (scores.publishedToStudent ? 'PUBLISHED' : 'DRAFT'),
                  updatedAt: row.updatedAt || scores.updatedAt || scores.fullRecord.updatedAt || new Date().toISOString(),
                  period
                };
                changed = true;
              } else if (Array.isArray(scores.grades)) {
                this.academicRecords[key] = {
                  studentId: sid,
                  period: period,
                  semester: (period === 'full_year' ? 'Cả năm' : (period.includes('hk2') ? 'HK2' : 'HK1')) as any,
                  grades: scores.grades,
                  gpa: row.gpa !== undefined ? row.gpa : scores.gpa,
                  academicRank: row.academicRank !== undefined ? row.academicRank : scores.academicRank,
                  excusedAbsences: row.attendanceSummary?.excused ?? scores.excusedAbsences ?? 0,
                  unexcusedAbsences: row.attendanceSummary?.unexcused ?? scores.unexcusedAbsences ?? 0,
                  publishedToStudent: scores.publishedToStudent ?? false,
                  publishedToParent: scores.publishedToParent ?? false,
                  publishedAt: scores.publishedAt,
                  publishedBy: scores.publishedBy,
                  publicationStatus: scores.publicationStatus || (scores.publishedToStudent ? 'PUBLISHED' : 'DRAFT'),
                  academicSummary: row.teacherEvaluation || scores.academicSummary,
                  conductSummary: row.conductEvaluation || scores.conductSummary,
                  highestSubject: scores.highestSubject,
                  lowestSubject: scores.lowestSubject,
                  updatedAt: row.updatedAt || new Date().toISOString()
                };
                changed = true;
              }

              // Always synchronize published snapshot tracking with authoritative server record
              if (scores.publishedToStudent || scores.publishedToParent || scores.publicationStatus === 'PUBLISHED') {
                this.publications[key] = {
                  period: normalizeAcademicPeriod(period),
                  studentId: sid,
                  status: 'PUBLISHED',
                  publishedAt: scores.publishedAt || row.updatedAt,
                  publishedBy: scores.publishedBy || 'GVCN',
                  publicationVersion: scores.publicationVersion || (this.publications[key]?.publicationVersion || 1),
                  snapshot: JSON.parse(JSON.stringify(this.academicRecords[key]))
                };
              } else if (this.publications[key]) {
                this.publications[key] = {
                  ...this.publications[key],
                  status: 'DRAFT',
                  snapshot: JSON.parse(JSON.stringify(this.academicRecords[key]))
                };
              }
            }
          }
        });
        if (changed) {
          this.saveToStorage(tId);
          this.notify();
        }
      }
      return true;
    } catch {
      return !hasToken;
    }
  }

  private initDefaultRecords() {
    Object.entries(initialAcademicRecords).forEach(([studentId, rec]: [string, any]) => {
      const p = rec.period || 'midterm_hk1';
      const key = `${studentId}_${p}`;
      const publishedStatus = p === 'midterm_hk1' ? 'PUBLISHED' : 'DRAFT';
      const publishedAt = p === 'midterm_hk1' ? '20/11/2025 lúc 09:00' : undefined;

      this.academicRecords[key] = {
        ...rec,
        period: p,
        publicationStatus: publishedStatus,
        publishedAt: publishedAt,
        publishedBy: p === 'midterm_hk1' ? 'Cô Nguyễn Thị Mai Lan (GVCN)' : undefined,
        publicationVersion: p === 'midterm_hk1' ? 1 : 0
      };

      if (!this.publications[key] && p === 'midterm_hk1') {
        this.publications[key] = {
          period: p,
          studentId: studentId,
          status: 'PUBLISHED',
          publishedAt: '20/11/2025 lúc 09:00',
          publishedBy: 'Cô Nguyễn Thị Mai Lan (GVCN)',
          publicationVersion: 1,
          snapshot: this.academicRecords[key]
        };
      }
    });
  }

  private saveToStorage(tenantId?: string) {
    const tId = tenantService.normalizeTenantId(tenantId || this.activeTenantId);
    try {
      localStorage.setItem(tenantService.getTenantStorageKey('timetable', tId), JSON.stringify(this.timetable));
      localStorage.setItem(tenantService.getTenantStorageKey('timetable_applied', tId), JSON.stringify(this.appliedTimetable));
      localStorage.setItem(tenantService.getTenantStorageKey('timetable_history', tId), JSON.stringify(this.timetableHistory));
      localStorage.setItem(tenantService.getTenantStorageKey('assignments', tId), JSON.stringify(this.assignments));
      localStorage.setItem(tenantService.getTenantStorageKey('exams', tId), JSON.stringify(this.examSchedules));
      localStorage.setItem(tenantService.getTenantStorageKey('academic_records', tId), JSON.stringify(this.academicRecords));
      localStorage.setItem(tenantService.getTenantStorageKey('academic_publications', tId), JSON.stringify(this.publications));
      localStorage.setItem(tenantService.getTenantStorageKey('shared_grade_files', tId), JSON.stringify(this.sharedGradeFiles));
      localStorage.setItem(tenantService.getTenantStorageKey('subject_configs', tId), JSON.stringify(this.subjectConfigs));
      localStorage.setItem(tenantService.getTenantStorageKey('period_times', tId), JSON.stringify(this.periodTimes));
    } catch {
      // ignore
    }
    this.notify();
  }

  // Period Times configuration
  public getPeriodTimes(): { morning: PeriodTimeConfig[]; afternoon: PeriodTimeConfig[] } {
    return {
      morning: [...this.periodTimes.morning],
      afternoon: [...this.periodTimes.afternoon]
    };
  }

  public updatePeriodTimes(times: { morning: PeriodTimeConfig[]; afternoon: PeriodTimeConfig[] }) {
    this.periodTimes = times;
    this.saveToStorage();
  }

  // Subject List & Configs (Synced with classService.getSubjects single source of truth)
  public getSubjectList(): SubjectConfig[] {
    try {
      return classService.getSubjects();
    } catch {
      return [...initialSubjects];
    }
  }

  public getSubjectNames(): string[] {
    try {
      return classService.getSubjectNames();
    } catch {
      return initialSubjects.map(s => s.name);
    }
  }

  public getSubjectConfigs(): Record<string, number> {
    const list = this.getSubjectList();
    const result: Record<string, number> = {};
    list.forEach(s => {
      const subName = s?.name || (s as any)?.subjectName;
      if (subName) {
        result[subName] = s.txColumnCount !== undefined ? s.txColumnCount : (this.subjectConfigs[subName] !== undefined ? this.subjectConfigs[subName] : 3);
      }
    });
    return result;
  }

  public getSubjectRegularCount(subjectName: string): number {
    const list = this.getSubjectList();
    const found = list.find(s => s && (s.name === subjectName || s.id === subjectName || (s as any).subjectName === subjectName || isSameSubject(s, { name: subjectName })));
    if (found && found.txColumnCount !== undefined) return found.txColumnCount;
    return this.subjectConfigs[subjectName] !== undefined ? this.subjectConfigs[subjectName] : 3;
  }

  public updateSubjectRegularCount(subjectName: string, count: number) {
    const safeCount = Math.max(0, Math.min(6, count));
    this.subjectConfigs[subjectName] = safeCount;
    const list = this.getSubjectList();
    const found = list.find(s => s && (s.name === subjectName || s.id === subjectName || (s as any).subjectName === subjectName || isSameSubject(s, { name: subjectName })));
    if (found) {
      this.subjectConfigs[found.name] = safeCount;
      classService.updateSubject(found.id, { txColumnCount: safeCount });
    }
    this.saveToStorage();
  }

  public async updateMultipleSubjectRegularCounts(countsBySubject: Record<string, number>): Promise<void> {
    const entries = Object.entries(countsBySubject || {});
    if (entries.length === 0) return;

    const currentSubjects = classService.getSubjects();
    let subjectsChanged = false;
    const updatedSubjects = currentSubjects.map(sub => {
      if (!sub || sub.assessmentMode === 'COMMENT_ONLY') return sub;
      const matchEntry = entries.find(([subName]) =>
        sub.name === subName ||
        sub.id === subName ||
        (sub as any).subjectName === subName ||
        isSameSubject(sub, { name: subName })
      );
      if (!matchEntry) return sub;

      const safeCount = Math.max(0, Math.min(6, matchEntry[1]));
      this.subjectConfigs[matchEntry[0]] = safeCount;
      this.subjectConfigs[sub.name] = safeCount;
      if (sub.txColumnCount !== safeCount) {
        subjectsChanged = true;
        return { ...sub, txColumnCount: safeCount };
      }
      return sub;
    });

    entries.forEach(([subName, cnt]) => {
      this.subjectConfigs[subName] = Math.max(0, Math.min(6, cnt));
    });

    if (subjectsChanged) {
      await classService.updateSettings({ subjects: updatedSubjects });
    }
    this.saveToStorage();
  }

  // Timetable
  public getActiveTimetable(role?: UserRole): TimetableVersion {
    let checkRole = role;
    if (!checkRole) {
      try {
        const u = authService.getCurrentUser();
        if (u) checkRole = u.role;
      } catch {
        // ignore
      }
    }
    if (checkRole !== 'TEACHER' && (checkRole as any) !== 'SUPER_ADMIN') {
      return { ...(this.appliedTimetable || this.timetable) };
    }
    return { ...this.timetable };
  }

  public getWorkingTimetable(): TimetableVersion {
    return { ...this.timetable };
  }

  public getAppliedTimetable(): TimetableVersion {
    return { ...(this.appliedTimetable || this.timetable) };
  }

  public isTimetableApplied(): boolean {
    if (!this.appliedTimetable) return false;
    try {
      const workingScheduleStr = JSON.stringify(this.timetable.schedule);
      const appliedScheduleStr = JSON.stringify(this.appliedTimetable.schedule);
      return workingScheduleStr === appliedScheduleStr;
    } catch {
      return false;
    }
  }

  public async saveWorkingTimetable(versionName?: string): Promise<{ success: boolean; message: string; syncSuccess: boolean; error?: string }> {
    const DAYS_LIST: Array<'Thứ 2' | 'Thứ 3' | 'Thứ 4' | 'Thứ 5' | 'Thứ 6' | 'Thứ 7'> = [
      'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'
    ];
    if (!this.timetable) {
      this.timetable = {
        id: `tkb-${this.activeTenantId}-${Date.now()}`,
        versionName: versionName || 'Thời khóa biểu Chính thức (Học kỳ I)',
        semester: 'HK1',
        validFrom: new Date().toLocaleDateString('vi-VN'),
        isActive: true,
        schedule: DAYS_LIST.map(d => ({ dayOfWeek: d, morningPeriods: [], afternoonPeriods: [] }))
      };
    }
    if (!this.timetable.id) {
      this.timetable.id = `tkb-${this.activeTenantId}-${Date.now()}`;
    }
    if (versionName) {
      this.timetable.versionName = versionName;
    }
    if (!Array.isArray(this.timetable.schedule) || this.timetable.schedule.length === 0) {
      this.timetable.schedule = DAYS_LIST.map(d => ({ dayOfWeek: d, morningPeriods: [], afternoonPeriods: [] }));
    }
    this.timetable.updatedAt = new Date().toISOString();

    if (!Array.isArray(this.timetableHistory) || this.timetableHistory.length === 0) {
      this.timetableHistory = [this.timetable];
    } else {
      const exists = this.timetableHistory.some(v => v.id === this.timetable.id);
      if (exists) {
        this.timetableHistory = this.timetableHistory.map(v => (v.id === this.timetable.id ? this.timetable : v));
      } else {
        this.timetableHistory = [this.timetable, ...this.timetableHistory];
      }
    }

    const syncRes = await this.syncTimetableToServer('DRAFT');
    if (!syncRes.success) {
      return {
        success: false,
        syncSuccess: false,
        error: syncRes.error,
        message: `Lưu thất bại: ${syncRes.error || 'Máy chủ không phản hồi'}`
      };
    }

    this.saveToStorage();
    this.notify();
    return {
      success: true,
      syncSuccess: true,
      message: 'Đã lưu thời khóa biểu thành công (Bản làm việc). Nhấn "Áp dụng ngay" khi muốn công bố cho Học viên và Phụ huynh.'
    };
  }

  public async applyTimetableNow(author?: any): Promise<{ success: boolean; message: string; syncSuccess: boolean; error?: string }> {
    const DAYS_LIST: Array<'Thứ 2' | 'Thứ 3' | 'Thứ 4' | 'Thứ 5' | 'Thứ 6' | 'Thứ 7'> = [
      'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'
    ];
    if (!this.timetable) {
      this.timetable = {
        id: `tkb-${this.activeTenantId}-${Date.now()}`,
        versionName: 'Thời khóa biểu Chính thức (Học kỳ I)',
        semester: 'HK1',
        validFrom: new Date().toLocaleDateString('vi-VN'),
        isActive: true,
        schedule: DAYS_LIST.map(d => ({ dayOfWeek: d, morningPeriods: [], afternoonPeriods: [] }))
      };
    }
    if (!this.timetable.id) {
      this.timetable.id = `tkb-${this.activeTenantId}-${Date.now()}`;
    }

    const now = new Date().toISOString();
    const candidateWorking: TimetableVersion = {
      ...this.timetable,
      isApplied: true,
      appliedAt: now,
      updatedAt: now
    };

    const candidateApplied: TimetableVersion = JSON.parse(JSON.stringify(candidateWorking));

    let candidateHistory: TimetableVersion[] = [];
    if (!Array.isArray(this.timetableHistory) || this.timetableHistory.length === 0) {
      candidateHistory = [candidateWorking];
    } else {
      const exists = this.timetableHistory.some(v => v.id === candidateWorking.id);
      if (exists) {
        candidateHistory = this.timetableHistory.map(v => (v.id === candidateWorking.id ? candidateWorking : v));
      } else {
        candidateHistory = [candidateWorking, ...this.timetableHistory];
      }
    }

    // Step 1: Lưu thành công vào kho dữ liệu chính trước khi đổi trạng thái đang áp dụng
    const syncRes = await this.syncTimetableToServer('APPLIED', {
      working: candidateWorking,
      applied: candidateApplied,
      history: candidateHistory
    });

    if (!syncRes.success) {
      // Giữ nguyên TKB đang hoạt động, báo lỗi
      return {
        success: false,
        syncSuccess: false,
        error: syncRes.error,
        message: `Áp dụng thất bại: ${syncRes.error || 'Không thể lưu vào máy chủ'}. Phiên bản đang áp dụng hiện tại được giữ nguyên vẹn.`
      };
    }

    // Step 2: Máy chủ đã lưu thành công -> cập nhật trạng thái hệ thống
    this.timetable = candidateWorking;
    this.appliedTimetable = candidateApplied;
    this.timetableHistory = candidateHistory;
    this.saveToStorage();

    // Step 3: Đồng bộ và thông báo tới học viên và phụ huynh
    let notifySuccess = true;
    try {
      const classUser = author || authService.getCurrentUser();
      inAppNotificationService.notifyTimetableApplied(this.appliedTimetable, classUser);
    } catch (err) {
      notifySuccess = false;
      console.warn('[AcademicService] Timetable applied notify notice:', err);
    }

    this.notify();

    if (!notifySuccess) {
      return {
        success: true,
        syncSuccess: false,
        message: 'Đã lưu và áp dụng TKB trên máy chủ, nhưng thông báo tức thời tới phụ huynh/học viên gặp trục trặc. Bạn có thể nhấn thử lại.'
      };
    }

    return {
      success: true,
      syncSuccess: true,
      message: 'Đã lưu và áp dụng thời khóa biểu thành công. Toàn bộ học viên và phụ huynh lớp đã được cập nhật.'
    };
  }

  public async overwriteCurrentTimetable(
    newSchedule: DayTimetable[],
    applyNow: boolean = false,
    optionalVersionName?: string
  ): Promise<{ success: boolean; message: string; syncSuccess: boolean; error?: string }> {
    const now = new Date().toISOString();
    const targetId = this.timetable?.id || `tkb-${this.activeTenantId}-${Date.now()}`;
    const targetName = optionalVersionName?.trim() || this.timetable?.versionName || 'Thời khóa biểu chính thức';
    const targetSemester = this.timetable?.semester || 'HK1';
    const targetValidFrom = this.timetable?.validFrom || new Date().toLocaleDateString('vi-VN');

    const updatedVersion: TimetableVersion = {
      ...this.timetable,
      id: targetId,
      versionName: targetName,
      semester: targetSemester,
      validFrom: targetValidFrom,
      isActive: true,
      isApplied: applyNow ? true : (this.timetable?.isApplied || false),
      appliedAt: applyNow ? now : this.timetable?.appliedAt,
      updatedAt: now,
      schedule: newSchedule
    };

    // Update in-place in history: KHÔNG tạo thêm bản đang áp dụng trùng lặp
    let updatedHistory: TimetableVersion[] = [];
    if (!Array.isArray(this.timetableHistory) || this.timetableHistory.length === 0) {
      updatedHistory = [updatedVersion];
    } else {
      const exists = this.timetableHistory.some(v => v.id === targetId);
      if (exists) {
        updatedHistory = this.timetableHistory.map(v => (v.id === targetId ? updatedVersion : v));
      } else {
        updatedHistory = [updatedVersion, ...this.timetableHistory];
      }
    }

    const candidateApplied: TimetableVersion = applyNow
      ? JSON.parse(JSON.stringify(updatedVersion))
      : (this.appliedTimetable || updatedVersion);

    // Lưu thành công vào kho dữ liệu chính trước khi cập nhật bộ nhớ
    const syncRes = await this.syncTimetableToServer(applyNow ? 'APPLIED' : 'DRAFT', {
      working: updatedVersion,
      applied: candidateApplied,
      history: updatedHistory
    });

    if (!syncRes.success) {
      // Giữ nguyên TKB đang hoạt động, giữ bản xem trước và báo lỗi
      return {
        success: false,
        syncSuccess: false,
        error: syncRes.error,
        message: `Ghi đè thất bại: ${syncRes.error || 'Lỗi lưu máy chủ'}. Thời khóa biểu hiện tại được giữ nguyên vẹn.`
      };
    }

    // Cam kết dữ liệu
    this.timetable = updatedVersion;
    if (applyNow) {
      this.appliedTimetable = candidateApplied;
    }
    this.timetableHistory = updatedHistory;
    this.saveToStorage();

    let notifySuccess = true;
    if (applyNow) {
      try {
        const classUser = authService.getCurrentUser();
        inAppNotificationService.notifyTimetableApplied(this.appliedTimetable, classUser);
      } catch (err) {
        notifySuccess = false;
        console.warn('[AcademicService] Timetable overwrite notify notice:', err);
      }
    }

    this.notify();

    if (applyNow && !notifySuccess) {
      return {
        success: true,
        syncSuccess: false,
        message: 'Đã ghi đè và áp dụng TKB trên máy chủ, nhưng thông báo tức thời tới học viên/phụ huynh bị gián đoạn. Bạn có thể thử đồng bộ lại.'
      };
    }

    return {
      success: true,
      syncSuccess: true,
      message: applyNow
        ? 'Đã ghi đè bản hiện tại và áp dụng ngay cho toàn bộ Học viên & Phụ huynh của lớp.'
        : 'Đã ghi đè bản hiện tại thành công (Bản làm việc). Nhấn "Áp dụng ngay" khi muốn công bố cho lớp.'
    };
  }

  public async createNewTimetableVersionAsync(
    versionName: string,
    semester: 'HK1' | 'HK2',
    validFrom: string,
    newSchedule: DayTimetable[],
    applyNow: boolean = false
  ): Promise<{ success: boolean; message: string; syncSuccess: boolean; error?: string }> {
    const now = new Date().toISOString();
    const newVersion: TimetableVersion = {
      id: `tkb-${this.activeTenantId}-${Date.now()}`,
      versionName: versionName.trim() || `TKB Phiên bản mới (${new Date().toLocaleDateString('vi-VN')})`,
      semester,
      validFrom: validFrom || new Date().toLocaleDateString('vi-VN'),
      isActive: true,
      isApplied: applyNow,
      appliedAt: applyNow ? now : undefined,
      updatedAt: now,
      schedule: newSchedule
    };

    // Tạo phiên bản riêng trong lịch sử, không xóa các phiên bản cũ
    const updatedHistory: TimetableVersion[] = (Array.isArray(this.timetableHistory) ? this.timetableHistory : [])
      .map(v => ({ ...v, isActive: false }));
    updatedHistory.unshift(newVersion);

    const candidateApplied: TimetableVersion = applyNow
      ? JSON.parse(JSON.stringify(newVersion))
      : (this.appliedTimetable || newVersion);

    // Lưu vào kho dữ liệu chính trước khi cập nhật
    const syncRes = await this.syncTimetableToServer(applyNow ? 'APPLIED' : 'DRAFT', {
      working: newVersion,
      applied: candidateApplied,
      history: updatedHistory
    });

    if (!syncRes.success) {
      // Giữ nguyên TKB đang hoạt động, giữ bản xem trước và báo lỗi
      return {
        success: false,
        syncSuccess: false,
        error: syncRes.error,
        message: `Tạo bản mới thất bại: ${syncRes.error || 'Lỗi lưu máy chủ'}. Không có thay đổi nào được thực hiện.`
      };
    }

    this.timetable = newVersion;
    if (applyNow) {
      this.appliedTimetable = candidateApplied;
    }
    this.timetableHistory = updatedHistory;
    this.saveToStorage();

    let notifySuccess = true;
    if (applyNow) {
      try {
        const classUser = authService.getCurrentUser();
        inAppNotificationService.notifyTimetableApplied(this.appliedTimetable, classUser);
      } catch (err) {
        notifySuccess = false;
        console.warn('[AcademicService] Timetable create notify notice:', err);
      }
    }

    this.notify();

    if (applyNow && !notifySuccess) {
      return {
        success: true,
        syncSuccess: false,
        message: `Đã tạo phiên bản mới "${newVersion.versionName}" và áp dụng trên hệ thống, nhưng thông báo tức thời bị gián đoạn. Bạn có thể thử đồng bộ lại.`
      };
    }

    return {
      success: true,
      syncSuccess: true,
      message: applyNow
        ? `Đã tạo phiên bản mới "${newVersion.versionName}" và áp dụng ngay cho lớp.`
        : `Đã tạo phiên bản mới "${newVersion.versionName}" (Bản làm việc). Các phiên bản cũ vẫn được lưu an toàn trong lịch sử.`
    };
  }

  public getTimetable(): TimetableSlot[] {
    const slots: TimetableSlot[] = [];
    const dayMap: Record<string, number> = {
      'Thứ 2': 2,
      'Thứ 3': 3,
      'Thứ 4': 4,
      'Thứ 5': 5,
      'Thứ 6': 6,
      'Thứ 7': 7
    };

    this.timetable.schedule.forEach(day => {
      const dayNum = dayMap[day.dayOfWeek] || 2;
      day.morningPeriods.forEach(p => {
        slots.push({
          id: `slot-${dayNum}-${p.period}`,
          dayOfWeek: dayNum,
          period: p.period,
          subject: p.subject,
          teacherName: p.teacher,
          room: p.room || 'P.102'
        });
      });
    });

    return slots;
  }

  public toggleAssignmentStatus(id: string) {
    this.assignments = this.assignments.map(a => 
      a.id === id ? { ...a, status: (a.status === 'approved' ? 'pending' : 'approved') as any } : a
    );
    this.saveToStorage();
  }

  public getTimetableHistory(): TimetableVersion[] {
    return [...this.timetableHistory];
  }

  public switchActiveTimetableVersion(versionId: string) {
    const target = this.timetableHistory.find(v => v.id === versionId);
    if (target) {
      this.timetableHistory = this.timetableHistory.map(v => ({
        ...v,
        isActive: v.id === versionId
      }));
      this.timetable = { ...target, isActive: true };
      this.saveToStorage();
    }
  }

  public createTimetableVersion(
    versionName: string,
    semester: 'HK1' | 'HK2',
    validFrom: string,
    schedule: TimetableVersion['schedule']
  ): TimetableVersion {
    const newVersion: TimetableVersion = {
      id: `tkb-${Date.now()}`,
      versionName,
      semester,
      validFrom,
      isActive: true,
      schedule
    };

    this.timetableHistory = this.timetableHistory.map(v => ({ ...v, isActive: false }));
    this.timetableHistory.unshift(newVersion);
    this.timetable = newVersion;
    this.saveToStorage();
    return newVersion;
  }

  public updateTimetable(schedule: TimetableVersion['schedule'], versionName?: string) {
    const newVersion: TimetableVersion = {
      id: `tkb-${Date.now()}`,
      versionName: versionName || `TKB Điều chỉnh ngày ${new Date().toLocaleDateString('vi-VN')}`,
      semester: this.timetable.semester,
      validFrom: new Date().toLocaleDateString('vi-VN'),
      isActive: true,
      schedule
    };

    this.timetableHistory = this.timetableHistory.map(v => ({ ...v, isActive: false }));
    this.timetableHistory.unshift(newVersion);
    this.timetable = newVersion;
    this.saveToStorage();
  }

  public activateTimetableVersion(versionId: string) {
    this.switchActiveTimetableVersion(versionId);
  }

  public async updateTimetableSlot(
    dayOfWeek: string,
    session: 'morning' | 'afternoon',
    periodNum: number,
    data: { subject: string; teacher?: string; room?: string; note?: string }
  ): Promise<void> {
    const DAYS_LIST: Array<'Thứ 2' | 'Thứ 3' | 'Thứ 4' | 'Thứ 5' | 'Thứ 6' | 'Thứ 7'> = [
      'Thứ 2',
      'Thứ 3',
      'Thứ 4',
      'Thứ 5',
      'Thứ 6',
      'Thứ 7'
    ];

    if (!this.timetable) {
      this.timetable = {
        id: `tkb-${this.activeTenantId}-${Date.now()}`,
        versionName: 'Thời khóa biểu Chính thức (Học kỳ I)',
        semester: 'HK1',
        validFrom: new Date().toLocaleDateString('vi-VN'),
        isActive: true,
        schedule: DAYS_LIST.map(d => ({ dayOfWeek: d, morningPeriods: [], afternoonPeriods: [] }))
      };
    }
    if (!this.timetable.id) {
      this.timetable.id = `tkb-${this.activeTenantId}-${Date.now()}`;
    }

    // Ensure this.timetable.schedule contains all 6 days
    let scheduleCopy: DayTimetable[] = Array.isArray(this.timetable?.schedule) && this.timetable.schedule.length > 0
      ? [...this.timetable.schedule]
      : DAYS_LIST.map(d => ({ dayOfWeek: d, morningPeriods: [], afternoonPeriods: [] }));

    DAYS_LIST.forEach(d => {
      if (!scheduleCopy.some(item => item.dayOfWeek === d)) {
        scheduleCopy.push({ dayOfWeek: d, morningPeriods: [], afternoonPeriods: [] });
      }
    });

    const updatedSchedule = scheduleCopy.map(day => {
      if (day.dayOfWeek !== dayOfWeek) return day;

      const morningPeriods = Array.isArray(day.morningPeriods) ? [...day.morningPeriods] : [];
      const afternoonPeriods = Array.isArray(day.afternoonPeriods) ? [...day.afternoonPeriods] : [];

      if (session === 'morning') {
        const existingIdx = morningPeriods.findIndex(p => p.period === periodNum);
        if (existingIdx >= 0) {
          if (!data.subject || data.subject.trim() === '') {
            morningPeriods.splice(existingIdx, 1);
          } else {
            morningPeriods[existingIdx] = {
              ...morningPeriods[existingIdx],
              period: periodNum,
              subject: data.subject.trim(),
              teacher: data.teacher !== undefined ? data.teacher : (morningPeriods[existingIdx].teacher || ''),
              room: data.room !== undefined ? data.room : (morningPeriods[existingIdx].room || ''),
              note: data.note !== undefined ? data.note : (morningPeriods[existingIdx].note || '')
            };
          }
        } else if (data.subject && data.subject.trim() !== '') {
          morningPeriods.push({
            period: periodNum,
            subject: data.subject.trim(),
            teacher: data.teacher || '',
            room: data.room || '',
            note: data.note || ''
          });
          morningPeriods.sort((a, b) => a.period - b.period);
        }
        return { ...day, morningPeriods };
      } else {
        const existingIdx = afternoonPeriods.findIndex(p => p.period === periodNum);
        if (existingIdx >= 0) {
          if (!data.subject || data.subject.trim() === '') {
            afternoonPeriods.splice(existingIdx, 1);
          } else {
            afternoonPeriods[existingIdx] = {
              ...afternoonPeriods[existingIdx],
              period: periodNum,
              subject: data.subject.trim(),
              teacher: data.teacher !== undefined ? data.teacher : (afternoonPeriods[existingIdx].teacher || ''),
              room: data.room !== undefined ? data.room : (afternoonPeriods[existingIdx].room || ''),
              note: data.note !== undefined ? data.note : (afternoonPeriods[existingIdx].note || '')
            };
          }
        } else if (data.subject && data.subject.trim() !== '') {
          afternoonPeriods.push({
            period: periodNum,
            subject: data.subject.trim(),
            teacher: data.teacher || '',
            room: data.room || '',
            note: data.note || ''
          });
          afternoonPeriods.sort((a, b) => a.period - b.period);
        }
        return { ...day, afternoonPeriods };
      }
    });

    this.timetable = {
      ...this.timetable,
      schedule: updatedSchedule,
      updatedAt: new Date().toISOString()
    };
    if (!Array.isArray(this.timetableHistory) || this.timetableHistory.length === 0) {
      this.timetableHistory = [this.timetable];
    } else {
      const exists = this.timetableHistory.some(v => v.id === this.timetable.id);
      if (exists) {
        this.timetableHistory = this.timetableHistory.map(v => (v.id === this.timetable.id ? this.timetable : v));
      } else {
        this.timetableHistory = [this.timetable, ...this.timetableHistory];
      }
    }
    this.saveToStorage();
    await this.syncTimetableToServer('DRAFT');
  }

  public async deleteTimetableHistoryVersion(versionId: string): Promise<{ success: boolean; message: string }> {
    if (!versionId) {
      return { success: false, message: 'Mã định danh phiên bản không hợp lệ.' };
    }

    const targetIdx = this.timetableHistory.findIndex(v => v.id === versionId);
    if (targetIdx === -1) {
      return { success: false, message: 'Không tìm thấy bản ghi lịch sử tương ứng.' };
    }

    const targetRecord = this.timetableHistory[targetIdx];
    const targetName = targetRecord.versionName || (targetRecord as any).name || 'Thời khóa biểu';

    // 1. Remove ONLY this specific record from history
    const previousHistory = [...this.timetableHistory];
    this.timetableHistory = this.timetableHistory.filter(v => v.id !== versionId);

    // 2. Preserve applied and working timetables 100% (do NOT change or delete active TKB)
    // 3. Save to local storage
    this.saveToStorage();

    // 4. Sync immediately to server master database (SQLite)
    try {
      const syncRes = await this.syncTimetableToServer(
        this.appliedTimetable?.id === this.timetable.id ? 'APPLIED' : 'DRAFT',
        {
          working: this.timetable,
          applied: this.appliedTimetable,
          history: this.timetableHistory
        }
      );

      if (!syncRes.success) {
        // Rollback on server error
        this.timetableHistory = previousHistory;
        this.saveToStorage();
        return {
          success: false,
          message: syncRes.error || 'Lỗi khi lưu thay đổi lên máy chủ. Đã khôi phục bản ghi.'
        };
      }

      this.notify();
      return {
        success: true,
        message: `Đã xóa bản ghi lịch sử "${targetName}" thành công.`
      };
    } catch (err: any) {
      // Rollback on network/unexpected error
      this.timetableHistory = previousHistory;
      this.saveToStorage();
      return {
        success: false,
        message: err?.message || 'Lỗi kết nối máy chủ khi xóa bản ghi lịch sử.'
      };
    }
  }

  public deleteTimetableVersion(versionId: string) {
    return this.deleteTimetableHistoryVersion(versionId);
  }

  public updatePeriod(dayOfWeek: string, periodNum: number, updates: Partial<TimetablePeriod>) {
    const updatedSchedule = this.timetable.schedule.map(day => {
      if (day.dayOfWeek !== dayOfWeek) return day;
      
      const updateList = (list: TimetablePeriod[]) => list.map(p => {
        if (p.period === periodNum) {
          return { ...p, ...updates };
        }
        return p;
      });

      return {
        ...day,
        morningPeriods: updateList(day.morningPeriods),
        afternoonPeriods: updateList(day.afternoonPeriods || [])
      };
    });

    this.timetable.schedule = updatedSchedule;
    this.saveToStorage();
  }

  public resetTimetableToDefault() {
    this.timetable = { ...initialTimetable };
    this.assignments = [...initialAssignments];
    this.saveToStorage();
  }

  // Shared Grade Evidence Files
  public getSharedGradeFiles(filter?: {
    studentId?: string;
    period?: AcademicPeriod;
    isParent?: boolean;
    isStudent?: boolean;
    isTeacher?: boolean;
  }): SharedGradeFile[] {
    return this.sharedGradeFiles.filter(file => {
      if (filter?.period && file.period && file.period !== filter.period) return false;
      if (filter?.isParent && !file.parentVisible) return false;
      if (filter?.isStudent && !file.studentVisible) return false;
      if (file.targetType === 'student' && filter?.studentId && file.studentId !== filter.studentId) {
        return false;
      }
      return true;
    });
  }

  public addSharedGradeFile(
    file: Omit<SharedGradeFile, 'id' | 'uploadedAt'>
  ): SharedGradeFile {
    const newFile: SharedGradeFile = {
      ...file,
      id: `sgf-${Date.now()}`,
      uploadedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('vi-VN')
    };
    this.sharedGradeFiles.unshift(newFile);
    this.saveToStorage();
    return newFile;
  }

  public deleteSharedGradeFile(id: string) {
    this.sharedGradeFiles = this.sharedGradeFiles.filter(f => f.id !== id);
    this.saveToStorage();
  }

  // Assignments
  public getAssignments(): LessonAssignment[] {
    return [...this.assignments];
  }

  public getPinnedAssignments(): LessonAssignment[] {
    return this.assignments.filter(a => Boolean(a.isPinned || a.pinnedToOverview));
  }

  public getAssignmentsForPeriod(dayOfWeek: string, period: number): LessonAssignment[] {
    return this.assignments.filter(a => a.dayOfWeek === dayOfWeek && a.period === period);
  }

  public saveAssignment(assignment: Omit<LessonAssignment, 'id'> & { id?: string }): LessonAssignment {
    let result: LessonAssignment;
    const taskContent = assignment.preparation || assignment.description || assignment.homework || '';
    if (assignment.id) {
      this.assignments = this.assignments.map(a => a.id === assignment.id ? {
        ...a,
        ...assignment,
        preparation: taskContent,
        homework: taskContent,
        description: taskContent
      } : a);
      this.saveToStorage();
      result = this.assignments.find(a => a.id === assignment.id)!;
    } else {
      const newAssign: LessonAssignment = {
        ...assignment,
        id: `as-${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        preparation: taskContent,
        homework: taskContent,
        description: taskContent
      };
      this.assignments.unshift(newAssign);
      this.saveToStorage();
      result = newAssign;
    }

    // Persist to server backend
    try {
      const token = authRepository.getSessionToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      fetch('/api/v1/timetable/assignments', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          id: result.id,
          title: result.title || `Báo bài môn ${result.subject}`,
          subject: result.subject,
          assignedDate: result.date || new Date().toISOString().split('T')[0],
          dueDate: result.dueDate || result.deadline || result.date,
          description: taskContent,
          status: result.status === 'approved' ? 'ACTIVE' : 'PENDING'
        })
      }).catch(err => console.warn('[AcademicService] Server assignment post error:', err));
    } catch {
      // ignore
    }

    this.notify();
    return result;
  }

  public async saveAssignmentAsync(assignment: Omit<LessonAssignment, 'id'> & { id?: string }): Promise<LessonAssignment> {
    const assignId = assignment.id || `as-${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const taskContent = assignment.preparation || assignment.description || assignment.homework || '';
    const dateStr = assignment.date || assignment.assigned_date || new Date().toISOString().split('T')[0];

    const existing = this.assignments.find(a => a.id === assignId);

    // Look up existing day configuration if not explicitly provided
    const sameDayItems = this.assignments.filter(a => (a.date === dateStr || a.dueDate === dateStr || a.assigned_date === dateStr) && a.id !== assignId);
    const dayDefaultBg = sameDayItems.find(a => a.bgColor || a.bg_color)?.bgColor || sameDayItems.find(a => a.bgColor || a.bg_color)?.bg_color || '';
    const dayDefaultText = sameDayItems.find(a => a.textColor || a.text_color)?.textColor || sameDayItems.find(a => a.textColor || a.text_color)?.text_color || '';
    const dayDefaultPinned = sameDayItems.some(a => a.isPinned || a.pinnedToOverview);

    const isPinned = assignment.isPinned !== undefined 
      ? Boolean(assignment.isPinned) 
      : (assignment.pinnedToOverview !== undefined 
        ? Boolean(assignment.pinnedToOverview) 
        : (existing?.isPinned !== undefined ? Boolean(existing.isPinned) : dayDefaultPinned));

    const bgColor = assignment.bgColor !== undefined 
      ? assignment.bgColor 
      : (assignment.bg_color !== undefined ? assignment.bg_color : (existing?.bgColor || dayDefaultBg));

    const textColor = assignment.textColor !== undefined 
      ? assignment.textColor 
      : (assignment.text_color !== undefined ? assignment.text_color : (existing?.textColor || dayDefaultText));

    const token = authRepository.getSessionToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('/api/v1/timetable/assignments', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        id: assignId,
        title: assignment.title || `Báo bài môn ${assignment.subject}`,
        subject: assignment.subject,
        assignedDate: dateStr,
        dueDate: assignment.dueDate || assignment.deadline || dateStr,
        description: taskContent,
        status: assignment.status === 'approved' ? 'ACTIVE' : 'PENDING',
        isPinned,
        bgColor,
        textColor
      })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || 'Lỗi khi lưu báo bài lên máy chủ');
    }

    const saved: LessonAssignment = {
      ...assignment,
      id: assignId,
      date: dateStr,
      assigned_date: dateStr,
      preparation: taskContent,
      homework: taskContent,
      description: taskContent,
      isPinned,
      pinnedToOverview: isPinned,
      bgColor,
      textColor,
      bg_color: bgColor,
      text_color: textColor
    };

    const normDate = normalizeDateKey(dateStr);
    if (assignment.id) {
      this.assignments = this.assignments.map(a => {
        if (a.id === assignId) return { ...a, ...saved };
        const d = normalizeDateKey(a.date || a.dueDate || a.assigned_date);
        if (d === normDate && (assignment.isPinned !== undefined || assignment.pinnedToOverview !== undefined)) {
          return { ...a, isPinned, pinnedToOverview: isPinned };
        }
        return a;
      });
    } else {
      if (assignment.isPinned !== undefined || assignment.pinnedToOverview !== undefined) {
        this.assignments = this.assignments.map(a => {
          const d = normalizeDateKey(a.date || a.dueDate || a.assigned_date);
          if (d === normDate) {
            return { ...a, isPinned, pinnedToOverview: isPinned };
          }
          return a;
        });
      }
      this.assignments.unshift(saved);
    }

    this.saveToStorage();
    this.notify();
    return saved;
  }

  public async saveAssignmentsBatchAsync(
    date: string,
    items: Array<{ id?: string; subject: string; content: string; bgColor?: string; textColor?: string; isPinned?: boolean }>,
    dayConfig?: { bgColor?: string; textColor?: string; isPinned?: boolean }
  ): Promise<LessonAssignment[]> {
    const validItems = items.filter(it => it.subject.trim() && it.content.trim());
    if (validItems.length === 0) {
      throw new Error('Vui lòng nhập ít nhất một môn học và nội dung chuẩn bị.');
    }

    // Determine day-level configuration
    const sameDayItems = this.assignments.filter(a => a.date === date || a.dueDate === date || a.assigned_date === date);
    const dayBg = dayConfig?.bgColor !== undefined 
      ? dayConfig.bgColor 
      : (sameDayItems.find(a => a.bgColor || a.bg_color)?.bgColor || sameDayItems.find(a => a.bgColor || a.bg_color)?.bg_color || '');
    const dayText = dayConfig?.textColor !== undefined 
      ? dayConfig.textColor 
      : (sameDayItems.find(a => a.textColor || a.text_color)?.textColor || sameDayItems.find(a => a.textColor || a.text_color)?.text_color || '');
    const dayPinned = dayConfig?.isPinned !== undefined 
      ? Boolean(dayConfig.isPinned) 
      : (sameDayItems.some(a => a.isPinned || a.pinnedToOverview));

    const payloadItems = validItems.map(it => {
      const existing = it.id ? this.assignments.find(a => a.id === it.id) : null;
      const isPinned = it.isPinned !== undefined ? Boolean(it.isPinned) : (existing?.isPinned !== undefined ? Boolean(existing.isPinned) : dayPinned);
      const bgColor = it.bgColor !== undefined ? it.bgColor : (existing?.bgColor || dayBg);
      const textColor = it.textColor !== undefined ? it.textColor : (existing?.textColor || dayText);

      return {
        id: it.id || `as-${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        subject: it.subject.trim(),
        date,
        assignedDate: date,
        dueDate: date,
        description: it.content.trim(),
        preparation: it.content.trim(),
        homework: it.content.trim(),
        title: `Báo bài môn ${it.subject.trim()}`,
        status: 'ACTIVE',
        isPinned,
        bgColor,
        textColor
      };
    });

    const token = authRepository.getSessionToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('/api/v1/timetable/assignments/batch', {
      method: 'POST',
      headers,
      body: JSON.stringify({ items: payloadItems })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || 'Lỗi khi lưu danh sách báo bài lên máy chủ');
    }

    // Merge into local storage and cache
    const newAssignmentsMap = new Map(this.assignments.map(a => [a.id, a]));
    const results: LessonAssignment[] = [];

    payloadItems.forEach(p => {
      const fullItem: LessonAssignment = {
        id: p.id,
        subject: p.subject,
        date: p.date,
        assigned_date: p.date,
        dayOfWeek: 'Thứ',
        period: 1,
        title: p.title,
        preparation: p.description,
        homework: p.description,
        description: p.description,
        status: 'approved',
        isPinned: p.isPinned,
        pinnedToOverview: p.isPinned,
        bgColor: p.bgColor,
        textColor: p.textColor,
        bg_color: p.bgColor,
        text_color: p.textColor
      };
      newAssignmentsMap.set(p.id, fullItem);
      results.push(fullItem);
    });

    this.assignments = Array.from(newAssignmentsMap.values());
    this.saveToStorage();
    this.notify();
    return results;
  }

  public deleteAssignment(id: string) {
    this.assignments = this.assignments.filter(a => a.id !== id);
    this.saveToStorage();
    this.notify();

    try {
      const token = authRepository.getSessionToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      fetch(`/api/v1/timetable/assignments/${id}`, { method: 'DELETE', headers }).catch(() => {});
    } catch {
      // ignore
    }
  }

  public async deleteAssignmentAsync(id: string): Promise<boolean> {
    const token = authRepository.getSessionToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`/api/v1/timetable/assignments/${id}`, {
      method: 'DELETE',
      headers
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || 'Không thể xóa mục báo bài trên máy chủ');
    }

    this.assignments = this.assignments.filter(a => a.id !== id);
    this.saveToStorage();
    this.notify();
    return true;
  }

  public async deleteAssignmentsBatchAsync(ids: string[]): Promise<boolean> {
    if (!ids || ids.length === 0) return true;
    const token = authRepository.getSessionToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const idSet = new Set(ids);
    for (const id of ids) {
      try {
        await fetch(`/api/v1/timetable/assignments/${id}`, {
          method: 'DELETE',
          headers
        });
      } catch (e) {
        console.warn('[AcademicService] Delete item batch note:', e);
      }
    }

    this.assignments = this.assignments.filter(a => !idSet.has(a.id));
    this.saveToStorage();
    this.notify();
    return true;
  }

  public async shiftAssignmentsDateAsync(ids: string[], newDate: string): Promise<boolean> {
    const token = authRepository.getSessionToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('/api/v1/timetable/assignments/shift-date', {
      method: 'POST',
      headers,
      body: JSON.stringify({ ids, newDate })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || 'Không thể cập nhật ngày trên máy chủ');
    }

    this.assignments = this.assignments.map(a => {
      if (ids.includes(a.id)) {
        return { ...a, date: newDate, dueDate: newDate };
      }
      return a;
    });

    this.saveToStorage();
    this.notify();
    return true;
  }

  public async toggleAssignmentPinAsync(id: string): Promise<boolean> {
    const item = this.assignments.find(a => a.id === id);
    if (!item) return false;
    const itemDate = item.date || item.dueDate || item.assigned_date;
    if (!itemDate) return false;
    return this.toggleDayPinAsync(itemDate);
  }

  public async updateAssignmentAppearanceAsync(id: string, bgColor?: string, textColor?: string): Promise<boolean> {
    const item = this.assignments.find(a => a.id === id);
    if (!item) return false;

    const token = authRepository.getSessionToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const updatedBg = bgColor !== undefined ? bgColor : (item.bgColor || '');
    const updatedText = textColor !== undefined ? textColor : (item.textColor || '');

    const res = await fetch('/api/v1/timetable/assignments', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        id: item.id,
        subject: item.subject,
        title: item.title,
        assignedDate: item.date || item.dueDate,
        dueDate: item.dueDate || item.date,
        description: item.preparation || item.description || item.homework,
        isPinned: item.isPinned || item.pinnedToOverview,
        bgColor: updatedBg,
        textColor: updatedText
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Lỗi khi lưu màu sắc báo bài lên máy chủ');
    }

    this.assignments = this.assignments.map(a => a.id === id ? {
      ...a,
      bgColor: updatedBg,
      textColor: updatedText,
      bg_color: updatedBg,
      text_color: updatedText
    } : a);

    this.saveToStorage();
    this.notify();
    return true;
  }

  public async updateDayAppearanceAsync(date: string, bgColor?: string, textColor?: string): Promise<boolean> {
    const updatedBg = bgColor || '';
    const updatedText = textColor || '';

    // Update in memory
    this.assignments = this.assignments.map(a => {
      const matchDate = a.date === date || a.dueDate === date || a.assigned_date === date;
      if (matchDate) {
        return {
          ...a,
          bgColor: updatedBg,
          textColor: updatedText,
          bg_color: updatedBg,
          text_color: updatedText
        };
      }
      return a;
    });

    this.saveToStorage();
    this.notify();

    // Persist to server backend
    try {
      const token = authRepository.getSessionToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/v1/timetable/assignments/day-appearance', {
        method: 'POST',
        headers,
        body: JSON.stringify({ date, bgColor: updatedBg, textColor: updatedText })
      });

      if (!res.ok) {
        console.warn('[AcademicService] Server day appearance update non-200 response');
      }
    } catch (err) {
      console.warn('[AcademicService] Server day appearance error:', err);
    }

    return true;
  }

  public async toggleDayPinAsync(date: string, targetPinned?: boolean): Promise<boolean> {
    const normTargetDate = normalizeDateKey(date);
    const dayItems = this.assignments.filter(a => {
      const d = normalizeDateKey(a.date || a.dueDate || a.assigned_date);
      return d === normTargetDate;
    });
    if (dayItems.length === 0) {
      throw new Error('Ngày này chưa có nội dung báo bài nào để ghim. Không cho phép ghim nội dung rỗng.');
    }

    const currentlyAllPinned = dayItems.length > 0 && dayItems.every(a => a.isPinned || a.pinnedToOverview);
    const nextPinned = typeof targetPinned === 'boolean' ? targetPinned : !currentlyAllPinned;

    // Update in memory for all assignments of this date
    this.assignments = this.assignments.map(a => {
      const d = normalizeDateKey(a.date || a.dueDate || a.assigned_date);
      if (d === normTargetDate) {
        return {
          ...a,
          isPinned: nextPinned,
          pinnedToOverview: nextPinned
        };
      }
      return a;
    });

    this.saveToStorage();
    this.notify();

    // Persist to server backend
    try {
      const token = authRepository.getSessionToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/v1/timetable/assignments/day-toggle-pin', {
        method: 'POST',
        headers,
        body: JSON.stringify({ date: normTargetDate, isPinned: nextPinned })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Lỗi khi ghim/bỏ ghim báo bài ngày này trên máy chủ');
      }
    } catch (err: any) {
      console.warn('[AcademicService] Server day toggle pin error:', err);
      throw err;
    }

    return nextPinned;
  }

  public toggleAssignmentPin(id: string) {
    this.toggleAssignmentPinAsync(id).catch(err => {
      console.warn('[AcademicService] toggleAssignmentPin notice:', err);
    });
  }

  // Exam Schedule
  public getExams(): ExamSchedule[] {
    return [...this.examSchedules];
  }

  public saveExam(exam: Omit<ExamSchedule, 'id'> & { id?: string }): ExamSchedule {
    let saved: ExamSchedule;
    if (exam.id) {
      this.examSchedules = this.examSchedules.map(e => e.id === exam.id ? { ...e, ...exam } : e);
      this.saveToStorage();
      saved = this.examSchedules.find(e => e.id === exam.id)!;
    } else {
      const newExam: ExamSchedule = {
        ...exam,
        id: `ex-${Date.now()}`
      };
      this.examSchedules.unshift(newExam);
      this.saveToStorage();
      saved = newExam;
    }

    // Trigger notification to students, parents, class officers
    inAppNotificationService.notifyExamScheduleSaved(saved);

    return saved;
  }

  public deleteExam(id: string) {
    this.examSchedules = this.examSchedules.filter(e => e.id !== id);
    this.saveToStorage();
  }

  public toggleExamPin(id: string) {
    this.examSchedules = this.examSchedules.map(e => e.id === id ? { ...e, pinnedToOverview: !e.pinnedToOverview } : e);
    this.saveToStorage();
  }

  public toggleExamPinToFeed(id: string) {
    this.examSchedules = this.examSchedules.map(e => e.id === id ? { ...e, pinnedToFeed: !e.pinnedToFeed } : e);
    this.saveToStorage();
  }

  public getPinnedFeedExams(): ExamSchedule[] {
    return this.examSchedules.filter(e => Boolean(e.pinnedToFeed));
  }

  // Normalize helper for subject name comparisons
  // Normalize helper for subject name comparisons
  public normalizeSubjectName(name: string): string {
    if (!name) return '';
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }

  public isCommentOnlySubject(name?: string): boolean {
    if (!name) return false;
    const n = name.toLowerCase();
    return n.includes('trải nghiệm') ||
      n.includes('hướng nghiệp') ||
      n.includes('thể chất') ||
      n.includes('địa phương') ||
      n.includes('chào cờ') ||
      n.includes('sinh hoạt') ||
      n.includes('hdtn') ||
      n.includes('gdtc') ||
      n.includes('gddp');
  }

  // Normalize raw grades or scores from any storage source into SubjectGrade array
  public normalizeRawGrades(record: StudentAcademicRecord): SubjectGrade[] {
    if (!record) return [];
    let list: any[] = [];
    if (Array.isArray(record.grades)) {
      list = [...record.grades];
    } else if (record.grades && typeof record.grades === 'object') {
      list = Object.values(record.grades);
    }

    if (list.length === 0 && Array.isArray((record as any).scores)) {
      list = (record as any).scores;
    }

    return list.map((g: any) => {
      const subName = g.subjectName || g.name || 'Môn học';
      const subCode = g.subjectCode || g.code;
      const isComment = g.assessmentMode === 'COMMENT_ONLY' || this.isCommentOnlySubject(subName);

      // Check if explicit tx1..tx6 fields are provided
      const hasExplicitTx = [g.tx1, g.tx2, g.tx3, g.tx4, g.tx5, g.tx6].some(isEnteredValidScore);
      let tx1 = isEnteredValidScore(g.tx1) ? Number(g.tx1) : undefined;
      let tx2 = isEnteredValidScore(g.tx2) ? Number(g.tx2) : undefined;
      let tx3 = isEnteredValidScore(g.tx3) ? Number(g.tx3) : undefined;
      let tx4 = isEnteredValidScore(g.tx4) ? Number(g.tx4) : undefined;
      let tx5 = isEnteredValidScore(g.tx5) ? Number(g.tx5) : undefined;
      let tx6 = isEnteredValidScore(g.tx6) ? Number(g.tx6) : undefined;

      // Only fall back to regularScores if no explicit tx column was provided
      if (!hasExplicitTx && Array.isArray(g.regularScores) && g.regularScores.length > 0) {
        tx1 = isEnteredValidScore(g.regularScores[0]) ? Number(g.regularScores[0]) : undefined;
        tx2 = isEnteredValidScore(g.regularScores[1]) ? Number(g.regularScores[1]) : undefined;
        tx3 = isEnteredValidScore(g.regularScores[2]) ? Number(g.regularScores[2]) : undefined;
        tx4 = isEnteredValidScore(g.regularScores[3]) ? Number(g.regularScores[3]) : undefined;
        tx5 = isEnteredValidScore(g.regularScores[4]) ? Number(g.regularScores[4]) : undefined;
        tx6 = isEnteredValidScore(g.regularScores[5]) ? Number(g.regularScores[5]) : undefined;
      }

      const txList: number[] = [tx1, tx2, tx3, tx4, tx5, tx6].filter((v): v is number => v !== undefined);

      const midterm = [g.midterm, g.midtermScore, g.gk, g.giuaKy, g.diemGK, g.diemGiuaKy].find(isEnteredValidScore);
      const finalExam = [g.finalExam, g.finalScore, g.ck, g.cuoiKy, g.diemCK, g.diemCuoiKy].find(isEnteredValidScore);
      const avg = [g.average, g.averageScore, g.dtb, g.dtbm, g.score, g.diemTB, g.tbMon, g.diemTrungBinh].find(isEnteredValidScore);
      const tbHk1 = [g.tbHk1, g.dtbHk1, g.diemTBHk1, g.diemTbHk1, g.tbhk1, g.dtbhk1, g.tbHkI, g.dtbHkI].find(isEnteredValidScore);
      const tbHk2 = [g.tbHk2, g.dtbHk2, g.diemTBHk2, g.diemTbHk2, g.tbhk2, g.dtbhk2, g.tbHkII, g.dtbHkII].find(isEnteredValidScore);
      const tbCaNam = [g.tbCaNam, g.dtbCaNam, g.diemTBCaNam, g.diemTbCaNam, g.tbcn, g.dtbcn, g.tbNam, g.dtbNam].find(isEnteredValidScore);

      let qual = g.qualitativeResult ?? g.danhGia ?? g.result ?? g.nhanXet ?? g.xepLoai;
      if (typeof qual === 'string') {
        const normQ = qual.trim().toLowerCase();
        if (normQ === 'đạt' || normQ === 'đ' || normQ === 'd') {
          qual = 'Đạt';
        } else if (normQ === 'chưa đạt' || normQ === 'cđ' || normQ === 'cd') {
          qual = 'Chưa đạt';
        }
      }

      // If no valid component scores exist and average is 0, do not create a fake 0 average
      const hasAnyComponent = txList.length > 0 || midterm !== undefined || finalExam !== undefined;
      let finalAvg: number | undefined = (!isComment && avg !== undefined) ? Number(avg) : undefined;
      if (!hasAnyComponent && finalAvg === 0) {
        finalAvg = undefined;
      }
      if (finalAvg === undefined && hasAnyComponent && !isComment) {
        finalAvg = calculateSubjectAverage({
          assessmentMode: 'SCORE_AND_COMMENT',
          tx1,
          tx2,
          tx3,
          tx4,
          tx5,
          tx6,
          regularScores: txList,
          midterm: midterm !== undefined ? Number(midterm) : undefined,
          finalExam: finalExam !== undefined ? Number(finalExam) : undefined,
          period: g.period
        });
      }

      return {
        ...g,
        subjectId: g.subjectId || g.id,
        subjectName: subName,
        subjectCode: subCode,
        assessmentMode: isComment ? ('COMMENT_ONLY' as const) : ('SCORE_AND_COMMENT' as const),
        qualitativeResult: qual,
        comment: g.comment || g.nhanXet || g.note || '',
        regularScores: txList,
        tx1,
        tx2,
        tx3,
        tx4,
        tx5,
        tx6,
        midterm: midterm !== undefined ? Number(midterm) : undefined,
        finalExam: finalExam !== undefined ? Number(finalExam) : undefined,
        average: finalAvg,
        tbHk1: tbHk1 !== undefined ? Number(tbHk1) : undefined,
        tbHk2: tbHk2 !== undefined ? Number(tbHk2) : undefined,
        tbCaNam: tbCaNam !== undefined ? Number(tbCaNam) : undefined
      };
    });
  }

  // Resolve subject score strictly for the specified period without inappropriate cross-period bleeding
  public resolveSubjectPeriodScore(
    g: SubjectGrade,
    period: AcademicPeriod,
    studentId?: string
  ): number | undefined {
    if (!g) return undefined;
    const normP = normalizeAcademicPeriod(period);

    // Môn nhận xét (COMMENT_ONLY) không tính điểm trung bình số
    if (g.assessmentMode === 'COMMENT_ONLY' || this.isCommentOnlySubject(g.subjectName)) {
      return undefined;
    }

    // Helper to safely extract entered valid number
    const getScore = (...candidates: any[]): number | undefined => {
      const found = candidates.find(isEnteredValidScore);
      return found !== undefined ? Number(Number(found).toFixed(1)) : undefined;
    };

    const midtermVal = getScore(g.midterm, (g as any).midtermScore, (g as any).gk, (g as any).giuaKy, (g as any).diemGK, (g as any).diemGiuaKy);
    const finalVal = getScore(g.finalExam, (g as any).finalScore, (g as any).ck, (g as any).cuoiKy, (g as any).diemCK, (g as any).diemCuoiKy);
    const avgVal = getScore(g.average, (g as any).averageScore, (g as any).diemTB, (g as any).dtb, (g as any).score, (g as any).tbMon, (g as any).dtbm, (g as any).diemTrungBinh);
    const tbHk1Val = getScore(g.tbHk1, (g as any).dtbHk1, (g as any).diemTBHk1, (g as any).diemTbHk1, (g as any).tbhk1, (g as any).dtbhk1, (g as any).tbHkI, (g as any).dtbHkI);
    const tbHk2Val = getScore(g.tbHk2, (g as any).dtbHk2, (g as any).diemTBHk2, (g as any).diemTbHk2, (g as any).tbhk2, (g as any).dtbhk2, (g as any).tbHkII, (g as any).dtbHkII);
    const tbCaNamVal = getScore(g.tbCaNam, (g as any).dtbCaNam, (g as any).diemTBCaNam, (g as any).diemTbCaNam, (g as any).tbcn, (g as any).dtbcn, (g as any).tbNam, (g as any).dtbNam);

    if (normP === 'full_year') {
      // Tính điểm trung bình cả năm theo công thức: ĐTB cả năm = (ĐTB môn HKII × 2 + ĐTB môn HKI) / 3
      // Lấy đúng điểm trung bình học kì đã lưu; nếu thiếu HKI hoặc HKII thì trả về undefined.
      let resolvedHk1: number | undefined;
      let resolvedHk2: number | undefined;

      if (studentId) {
        const student = studentService.getById(studentId) || studentService.getAll().find(s => s.id === studentId || s.code === studentId);
        const sid = student?.id || studentId;
        const scode = student?.code;

        if (!(g as any)._clearedTbHk1) {
          const recHk1 = this.findAcademicRecord(sid, scode, 'final_hk1');
          if (recHk1) {
            const g1 = this.normalizeRawGrades(recHk1).find(x => isSameSubject(x, g));
            if (g1) {
              resolvedHk1 = getScore(g1.average, g1.tbHk1) ?? this.resolveSubjectPeriodScore(g1, 'final_hk1', sid);
            }
          }
        }

        if (!(g as any)._clearedTbHk2) {
          const recHk2 = this.findAcademicRecord(sid, scode, 'final_hk2');
          if (recHk2) {
            const g2 = this.normalizeRawGrades(recHk2).find(x => isSameSubject(x, g));
            if (g2) {
              resolvedHk2 = getScore(g2.average, g2.tbHk2) ?? this.resolveSubjectPeriodScore(g2, 'final_hk2', sid);
            }
          }
        }
      }

      if (resolvedHk1 === undefined && !(g as any)._clearedTbHk1) {
        resolvedHk1 = tbHk1Val;
      }

      if (resolvedHk2 === undefined && !(g as any)._clearedTbHk2) {
        resolvedHk2 = tbHk2Val ?? calculateSubjectAverage({
          tx1: g.tx1,
          tx2: g.tx2,
          tx3: g.tx3,
          tx4: g.tx4,
          tx5: g.tx5,
          tx6: g.tx6,
          regularScores: g.regularScores,
          midterm: midtermVal,
          finalExam: finalVal,
          period: 'final_hk2'
        });
      }

      if (isEnteredValidScore(resolvedHk1) && isEnteredValidScore(resolvedHk2)) {
        return Number(((Number(resolvedHk2) * 2 + Number(resolvedHk1)) / 3).toFixed(1));
      }

      // Nếu thiếu điểm HKI hoặc HKII hoặc dữ liệu không hợp lệ -> bắt buộc trả về undefined
      return undefined;
    }

    if (normP === 'midterm_hk1') {
      // Giữa HKI: chỉ dùng dữ liệu của kỳ này (TX & GK HKI)
      // 1. Tính từ điểm thành phần nếu có
      const calcAvg = calculateSubjectAverage({
        tx1: g.tx1,
        tx2: g.tx2,
        tx3: g.tx3,
        tx4: g.tx4,
        tx5: g.tx5,
        tx6: g.tx6,
        regularScores: g.regularScores,
        midterm: midtermVal,
        period: 'midterm_hk1'
      });
      if (calcAvg !== undefined) {
        return calcAvg;
      }

      // 2. Điểm trung bình đã lưu cho Giữa HKI (chỉ khi có điểm hợp lệ, không tự sinh 0 khi tất cả ô trống)
      const hasAnyComponent = [g.tx1, g.tx2, g.tx3, g.tx4, g.tx5, g.tx6, midtermVal].some(isEnteredValidScore);
      const gPeriod = (g as any).period ? normalizeAcademicPeriod((g as any).period) : undefined;
      if ((!gPeriod || gPeriod === 'midterm_hk1') && avgVal !== undefined && avgVal !== tbHk1Val && avgVal !== tbCaNamVal) {
        if (avgVal > 0 || hasAnyComponent) return avgVal;
      }
      if (gPeriod === 'midterm_hk1' && avgVal !== undefined) {
        if (avgVal > 0 || hasAnyComponent) return avgVal;
      }

      return undefined;
    }

    if (normP === 'final_hk1') {
      // Cuối HKI:
      // 1. Ưu tiên tính từ điểm thành phần TX + GK + CK HKI nếu người dùng có nhập điểm thành phần
      const calcAvg = calculateSubjectAverage({
        tx1: g.tx1,
        tx2: g.tx2,
        tx3: g.tx3,
        tx4: g.tx4,
        tx5: g.tx5,
        tx6: g.tx6,
        regularScores: g.regularScores,
        midterm: midtermVal,
        finalExam: finalVal,
        period: 'final_hk1'
      });
      if (calcAvg !== undefined) {
        return calcAvg;
      }

      // 2. Nếu không có điểm thành phần nào, kiểm tra điểm trung bình HKI đã lưu (ví dụ import bảng điểm tổng kết)
      const hasAnyComponent = [g.tx1, g.tx2, g.tx3, g.tx4, g.tx5, g.tx6, midtermVal, finalVal].some(isEnteredValidScore);
      if (tbHk1Val !== undefined && (tbHk1Val > 0 || hasAnyComponent)) {
        return tbHk1Val;
      }

      const gPeriod = (g as any).period ? normalizeAcademicPeriod((g as any).period) : undefined;
      if ((!gPeriod || gPeriod === 'final_hk1') && avgVal !== undefined && avgVal !== tbHk2Val && avgVal !== tbCaNamVal) {
        if (avgVal > 0 || hasAnyComponent) return avgVal;
      }
      if (gPeriod === 'final_hk1' && avgVal !== undefined) {
        if (avgVal > 0 || hasAnyComponent) return avgVal;
      }

      return undefined;
    }

    if (normP === 'midterm_hk2') {
      // Giữa HKII: chỉ dùng dữ liệu của kỳ này (TX & GK HKII)
      // 1. Tính từ điểm thành phần nếu có
      const calcAvg = calculateSubjectAverage({
        tx1: g.tx1,
        tx2: g.tx2,
        tx3: g.tx3,
        tx4: g.tx4,
        tx5: g.tx5,
        tx6: g.tx6,
        regularScores: g.regularScores,
        midterm: midtermVal,
        period: 'midterm_hk2'
      });
      if (calcAvg !== undefined) {
        return calcAvg;
      }

      // 2. Điểm trung bình đã lưu cho Giữa HKII
      const hasAnyComponent = [g.tx1, g.tx2, g.tx3, g.tx4, g.tx5, g.tx6, midtermVal].some(isEnteredValidScore);
      const gPeriod = (g as any).period ? normalizeAcademicPeriod((g as any).period) : undefined;
      if ((!gPeriod || gPeriod === 'midterm_hk2') && avgVal !== undefined && avgVal !== tbHk1Val && avgVal !== tbCaNamVal) {
        if (avgVal > 0 || hasAnyComponent) return avgVal;
      }
      if (gPeriod === 'midterm_hk2' && avgVal !== undefined) {
        if (avgVal > 0 || hasAnyComponent) return avgVal;
      }

      return undefined;
    }

    if (normP === 'final_hk2') {
      // Cuối HKII:
      // 1. Ưu tiên tính từ điểm thành phần TX + GK + CK HKII nếu có nhập điểm thành phần
      const calcAvg = calculateSubjectAverage({
        tx1: g.tx1,
        tx2: g.tx2,
        tx3: g.tx3,
        tx4: g.tx4,
        tx5: g.tx5,
        tx6: g.tx6,
        regularScores: g.regularScores,
        midterm: midtermVal,
        finalExam: finalVal,
        period: 'final_hk2'
      });
      if (calcAvg !== undefined) {
        return calcAvg;
      }

      // 2. Nếu không có điểm thành phần, kiểm tra điểm trung bình HKII đã lưu
      const hasAnyComponent = [g.tx1, g.tx2, g.tx3, g.tx4, g.tx5, g.tx6, midtermVal, finalVal].some(isEnteredValidScore);
      if (tbHk2Val !== undefined && (tbHk2Val > 0 || hasAnyComponent)) {
        return tbHk2Val;
      }

      const gPeriod = (g as any).period ? normalizeAcademicPeriod((g as any).period) : undefined;
      if ((!gPeriod || gPeriod === 'final_hk2') && avgVal !== undefined && avgVal !== tbHk1Val && avgVal !== tbCaNamVal) {
        if (avgVal > 0 || hasAnyComponent) return avgVal;
      }
      if (gPeriod === 'final_hk2' && avgVal !== undefined) {
        if (avgVal > 0 || hasAnyComponent) return avgVal;
      }

      return undefined;
    }

    return undefined;
  }

  // Find existing academic record by student id/code and period
  public findAcademicRecord(studentId: string, studentCode?: string, period: AcademicPeriod = 'midterm_hk1'): StudentAcademicRecord | undefined {
    const normP = normalizeAcademicPeriod(period);

    // 1. Direct keys with exact period suffix
    const exactKeys = [
      `${studentId}_${normP}`,
      studentCode ? `${studentCode}_${normP}` : undefined,
      `${studentId}_${period}`,
      studentCode ? `${studentCode}_${period}` : undefined,
      `acad_${studentId}_${normP}`,
      studentCode ? `acad_${studentCode}_${normP}` : undefined,
      `acad_${studentId}_${period}`,
      studentCode ? `acad_${studentCode}_${period}` : undefined
    ].filter(Boolean) as string[];

    for (const k of exactKeys) {
      const rec = this.academicRecords[k];
      if (rec) {
        const rPeriod = rec.period ? normalizeAcademicPeriod(rec.period as any) : undefined;
        if (!rPeriod || rPeriod === normP) {
          return rec;
        }
      }
    }

    // 2. Scan all stored records for matching student and exact period
    const allRecords = Object.values(this.academicRecords);
    const exactMatch = allRecords.find(r => {
      const matchSid = r.studentId === studentId || (studentCode && r.studentId === studentCode) || (r as any).student_id === studentId;
      if (!matchSid) return false;
      const rPeriod = normalizeAcademicPeriod(r.period as any);
      return rPeriod === normP;
    });
    if (exactMatch) return exactMatch;

    // 3. Look up in composite / summary records or un-perioded records
    // (Yêu cầu 2: Không mặc định tạo bản ghi rỗng khi dữ liệu hợp lệ đang nằm ở bản ghi tổng hợp hoặc khóa lưu trữ khác)
    const generalKeys = [
      studentId,
      studentCode,
      `acad_${studentId}`,
      studentCode ? `acad_${studentCode}` : undefined,
      `${studentId}_all`,
      `${studentId}_summary`,
      `${studentId}_composite`,
      `${studentId}_canam`,
      `${studentId}_canam_summary`
    ].filter(Boolean) as string[];

    const candidateRecords: StudentAcademicRecord[] = [];
    for (const gk of generalKeys) {
      if (this.academicRecords[gk]) {
        candidateRecords.push(this.academicRecords[gk]);
      }
    }

    allRecords.forEach(r => {
      const matchSid = r.studentId === studentId || (studentCode && r.studentId === studentCode) || (r as any).student_id === studentId;
      if (!matchSid || candidateRecords.includes(r)) return;
      const rPeriodNorm = r.period ? normalizeAcademicPeriod(r.period as any) : undefined;
      // Chỉ xem xét làm bản ghi tổng hợp nếu không gắn với một học kỳ cụ thể khác
      if (!rPeriodNorm || rPeriodNorm === normP || (r as any).period === 'all' || (r as any).period === 'summary' || (r as any).period === 'composite') {
        candidateRecords.push(r);
      }
    });

    for (const cand of candidateRecords) {
      const normGrades = this.normalizeRawGrades(cand);
      if (normGrades.length === 0) continue;

      // Xác minh xem bản ghi tổng hợp này có chứa dữ liệu điểm hợp lệ cho kỳ được yêu cầu không
      let validCount = 0;
      const gradesWithPeriod = normGrades.map(g => {
        const score = this.resolveSubjectPeriodScore(g, normP, studentId);
        if (score !== undefined || (g.assessmentMode === 'COMMENT_ONLY' && (g.qualitativeResult === 'Đạt' || g.qualitativeResult === 'Chưa đạt'))) {
          validCount++;
        }
        return {
          ...g,
          period: normP,
          average: score,
          tbCaNam: normP === 'full_year' ? score : g.tbCaNam,
          tbHk1: normP === 'final_hk1' ? score : g.tbHk1,
          tbHk2: normP === 'final_hk2' ? score : g.tbHk2
        };
      });

      if (validCount > 0) {
        return {
          ...cand,
          period: normP,
          grades: gradesWithPeriod
        };
      }
    }

    // 4. Trường hợp đặc biệt cho tab Cả năm (full_year):
    // Nếu chưa có bản ghi cả năm riêng biệt, nhưng học viên đã có đủ điểm ở cả 2 kỳ final_hk1 và final_hk2
    // -> Tổng hợp bản ghi cả năm tương thích từ 2 học kỳ (Yêu cầu 2 & 3)
    if (normP === 'full_year') {
      const recHk1 = this.findAcademicRecord(studentId, studentCode, 'final_hk1');
      const recHk2 = this.findAcademicRecord(studentId, studentCode, 'final_hk2');
      if (recHk1 && recHk2) {
        const gList1 = this.normalizeRawGrades(recHk1);
        const gList2 = this.normalizeRawGrades(recHk2);
        if (gList1.length > 0 && gList2.length > 0) {
          const synthesizedGrades: SubjectGrade[] = gList1.map(g1 => {
            const g2 = gList2.find(x => isSameSubject(x, g1));
            const isComment = g1.assessmentMode === 'COMMENT_ONLY' || this.isCommentOnlySubject(g1.subjectName);
            if (isComment) {
              return {
                ...g1,
                period: 'full_year',
                qualitativeResult: g2?.qualitativeResult || g1.qualitativeResult || undefined
              };
            }
            const s1 = this.resolveSubjectPeriodScore(g1, 'final_hk1', studentId);
            const s2 = g2 ? this.resolveSubjectPeriodScore(g2, 'final_hk2', studentId) : undefined;
            const caNamAvg = (isEnteredValidScore(s1) && isEnteredValidScore(s2))
              ? Number(((Number(s1) * 1 + Number(s2) * 2) / 3).toFixed(1))
              : undefined;
            return {
              ...g1,
              period: 'full_year',
              tbHk1: s1,
              tbHk2: s2,
              tbCaNam: caNamAvg,
              average: caNamAvg
            };
          });

          return {
            studentId,
            period: 'full_year',
            semester: 'Cả năm' as any,
            grades: synthesizedGrades,
            teacherComment: recHk2.teacherComment || recHk1.teacherComment || '',
            academicSummary: recHk2.academicSummary || recHk1.academicSummary || '',
            conductSummary: recHk2.conductSummary || recHk1.conductSummary || '',
            conductResult: recHk2.conductResult || recHk1.conductResult || undefined,
            excusedAbsences: (recHk1?.excusedAbsences ?? 0) + (recHk2?.excusedAbsences ?? 0),
            unexcusedAbsences: (recHk1?.unexcusedAbsences ?? 0) + (recHk2?.unexcusedAbsences ?? 0),
            publishedToStudent: recHk2.publishedToStudent ?? false,
            publishedToParent: recHk2.publishedToParent ?? false,
            publicationStatus: recHk2.publicationStatus || 'DRAFT'
          };
        }
      }
    }

    return undefined;
  }

  // Match a grade item or name to the official SubjectConfig
  public matchSubjectConfig(item: string | SubjectGrade, appliedSubjects: SubjectConfig[]): SubjectConfig | undefined {
    if (!item) return undefined;
    if (typeof item !== 'string' && item.subjectId) {
      const byId = appliedSubjects.find(s => s.id === item.subjectId);
      if (byId) return byId;
    }
    const searchCode = typeof item === 'string' ? item : item.subjectCode;
    if (searchCode) {
      const byCode = appliedSubjects.find(s => s.subjectCode === searchCode || s.code === searchCode);
      if (byCode) return byCode;
    }
    const searchName = typeof item === 'string' ? item : item.subjectName;
    if (searchName) {
      const byExactName = appliedSubjects.find(s => s.name === searchName || (s as any).subjectName === searchName);
      if (byExactName) return byExactName;

      const normSearch = this.normalizeSubjectName(searchName);
      const byNorm = appliedSubjects.find(s => {
        const normName = this.normalizeSubjectName(s.name || (s as any).subjectName || '');
        return normName === normSearch;
      });
      if (byNorm) return byNorm;

      const canSearch = getCanonicalSubjectCode(searchName);
      return appliedSubjects.find(s => {
        const canName = getCanonicalSubjectCode(s.code || s.subjectCode || s.name);
        return canName === canSearch;
      });
    }
    return undefined;
  }

  /**
   * Kiểm tra môn học có phải là môn đặc thù của GDPT THPT (không thuộc chương trình GDTX cấp THPT theo TT 12/2022 & TT 43/2021) hay không.
   * Gồm: Giáo dục quốc phòng và an ninh (GDQP-AN), Giáo dục thể chất (GDTC), Nội dung giáo dục của địa phương (GDĐP).
   */
  public isTHPTOnlySubject(subjectNameOrCode?: string): boolean {
    if (!subjectNameOrCode) return false;
    const norm = String(subjectNameOrCode).toLowerCase().replace(/đ/g, 'd').replace(/Đ/g, 'd').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[-_,\s]/g, '');
    return norm.includes('quocphong') ||
           norm.includes('gdqp') ||
           norm.includes('thechat') ||
           norm.includes('gdtc') ||
           norm.includes('diaphuong') ||
           norm.includes('gddp');
  }

  /**
   * Kiểm tra môn học có thuộc khung chương trình GDTX cấp THPT (TT 12/2022) hay không.
   * Bắt buộc: Ngữ văn, Toán học, Lịch sử.
   * Lựa chọn: Địa lí, Vật lí, Hóa học, Sinh học, Tin học, Công nghệ, Giáo dục kinh tế và pháp luật.
   * Tự chọn / HĐ: Ngoại ngữ (Tiếng Anh...), Hoạt động trải nghiệm hướng nghiệp.
   */
  public isGDTXSubject(subjectNameOrCode?: string): boolean {
    if (!subjectNameOrCode) return false;
    if (this.isTHPTOnlySubject(subjectNameOrCode)) return false;
    const norm = String(subjectNameOrCode).toLowerCase().replace(/đ/g, 'd').replace(/Đ/g, 'd').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[-_,\s]/g, '');
    return norm.includes('van') ||
           norm.includes('toan') ||
           norm.includes('su') ||
           norm.includes('dia') ||
           norm.includes('vatl') ||
           norm.includes('ly') ||
           norm.includes('li') ||
           norm.includes('hoa') ||
           norm.includes('sinh') ||
           norm.includes('tin') ||
           norm.includes('congnghe') ||
           norm.includes('kinhte') ||
           norm.includes('phapluat') ||
           norm.includes('ktpl') ||
           norm.includes('congdan') ||
           norm.includes('gdcd') ||
           norm.includes('khoahoctunhien') ||
           norm.includes('khtn') ||
           norm.includes('anh') ||
           norm.includes('ngoaingu') ||
           norm.includes('trainghiem') ||
           norm.includes('huongnghiep');
  }

  /**
   * Xác định xem học viên hoặc lớp học có thuộc chương trình GDTX hay không.
   */
  public isGDTXCurriculum(record?: StudentAcademicRecord, studentId?: string): boolean {
    const classSettings = classService.getSettings();
    const classProg = (classSettings.educationProgram || classSettings.curriculumType || '').toUpperCase();
    const schoolName = (classSettings.schoolName || '').toLowerCase();
    if (classProg.includes('GDTX') ||
        schoolName.includes('gdtx') ||
        schoolName.includes('gdnn') ||
        schoolName.includes('giáo dục thường xuyên') ||
        schoolName.includes('giáo dục nghề nghiệp')) {
      return true;
    }

    const sid = record?.studentId || studentId;
    if (sid) {
      if (sid.toLowerCase().includes('gdtx') || sid.toLowerCase().startsWith('hv')) {
        return true;
      }
      const student = studentService.getById(sid) || studentService.getAll().find(s => s.id === sid || s.code === sid);
      if (student) {
        const studentProg = ((student as any).educationProgram || (student as any).curriculumType || '').toUpperCase();
        if (studentProg.includes('GDTX')) return true;
        if (student.code && (student.code.toLowerCase().includes('gdtx') || student.code.toLowerCase().startsWith('hv'))) {
          return true;
        }
      }
    }

    if (record) {
      const recProg = ((record as any).educationProgram || (record as any).curriculumType || '').toUpperCase();
      if (recProg.includes('GDTX')) return true;

      const raw = this.normalizeRawGrades(record);
      if (raw.length > 0 && raw.length <= 9) {
        const hasTHPT = raw.some(g => this.isTHPTOnlySubject(g.subjectName || g.subjectCode));
        const hasGDTXMandatory = raw.some(g => {
          const n = (g.subjectName || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          return n.includes('van') || n.includes('toan');
        });
        if (!hasTHPT && hasGDTXMandatory) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Xác định danh sách môn thực tế áp dụng cho từng học viên.
   * Yêu cầu:
   * 1. Khi đánh giá theo TT43 (GDTX), chỉ kiểm tra các môn thuộc chương trình áp dụng cho học viên đó; không tự thêm môn THPT không áp dụng.
   * 2. Không tự suy đoán môn học từ số lượng môn đã có điểm.
   * 3. Phải dựa vào: (a) cấu hình chương trình, (b) môn đăng ký của học viên, (c) dữ liệu hiện có.
   * 4. Nếu không xác định được danh sách môn hợp lệ, báo rõ trạng thái và nguyên nhân.
   */
  public resolveApplicableSubjects(
    record: StudentAcademicRecord,
    appliedSubjects?: SubjectConfig[],
    isGDTXContext: boolean = false
  ): { subjects: SubjectConfig[]; isValid: boolean; reason?: string } {
    const isGDTX = isGDTXContext || this.isGDTXCurriculum(record, record?.studentId);

    // TH 1: Không phải GDTX (GDPT THPT thông thường)
    if (!isGDTX) {
      if (appliedSubjects && appliedSubjects.length > 0) {
        return { subjects: appliedSubjects, isValid: true };
      }
      const classApplied = classService.getAppliedSubjects();
      const subjects = classApplied.length > 0 ? classApplied : THPT_2018_STANDARD_SUBJECTS;
      return { subjects, isValid: true };
    }

    // TH 2: Chương trình GDTX (hoặc đánh giá theo TT43)
    const sid = record?.studentId;
    const student = sid
      ? (studentService.getById(sid) || studentService.getAll().find(s => s.id === sid || s.code === sid))
      : undefined;

    const pool = (appliedSubjects && appliedSubjects.length > 0)
      ? appliedSubjects
      : classService.getSubjects();

    // 1. Kiểm tra môn đăng ký của học viên (registeredSubjects / enrolledSubjects)
    const registered = (student as any)?.registeredSubjects ||
                       (student as any)?.enrolledSubjects ||
                       (student as any)?.combinationSubjects ||
                       (record as any)?.registeredSubjects ||
                       (record as any)?.appliedSubjects;

    if (Array.isArray(registered) && registered.length > 0) {
      const resolvedList: SubjectConfig[] = [];
      registered.forEach((item: any) => {
        const itemName = typeof item === 'string' ? item : (item.name || item.subjectName || item.code || item.subjectCode);
        if (this.isTHPTOnlySubject(itemName)) return; // Loại trừ môn THPT không áp dụng

        const matched = this.matchSubjectConfig(item, pool);
        if (matched) {
          if (!resolvedList.some(s => isSameSubject(s, matched))) {
            resolvedList.push(matched);
          }
        } else if (typeof item === 'object' && item.name) {
          if (!resolvedList.some(s => isSameSubject(s, item))) {
            resolvedList.push(item);
          }
        } else if (typeof item === 'string') {
          resolvedList.push({
            id: `sub-${item}`,
            name: item,
            selected: true,
            active: true,
            assessmentMode: this.isCommentOnlySubject(item) ? 'COMMENT_ONLY' : 'SCORE_AND_COMMENT'
          });
        }
      });

      // Luôn đảm bảo 3 môn học bắt buộc của GDTX: Ngữ văn, Toán học, Lịch sử
      const mandatoryGDTX = [
        { name: 'Ngữ văn', code: 'VAN' },
        { name: 'Toán học', code: 'TOAN' },
        { name: 'Lịch sử', code: 'SU' }
      ];
      mandatoryGDTX.forEach(m => {
        if (!resolvedList.some(s => isSameSubject(s, m))) {
          resolvedList.push({
            id: `gdtx-${m.code.toLowerCase()}`,
            name: m.name,
            subjectCode: m.code,
            code: m.code,
            selected: true,
            active: true,
            assessmentMode: 'SCORE_AND_COMMENT'
          });
        }
      });

      if (resolvedList.length >= 3) {
        return { subjects: resolvedList, isValid: true };
      }
    }

    // 2. Kiểm tra cấu hình chương trình GDTX ở cấp lớp (class settings)
    const classSettings = classService.getSettings();
    const classProg = (classSettings.educationProgram || classSettings.curriculumType || '').toUpperCase();
    const isClassExplicitGDTX = classProg.includes('GDTX');

    // Nếu appliedSubjects truyền vào là danh mục đã lọc riêng cho GDTX (không chứa môn THPT đặc thù và <= 9 môn)
    if (appliedSubjects && appliedSubjects.length > 0) {
      const hasTHPTSpecific = appliedSubjects.some(s => this.isTHPTOnlySubject(s.name || (s as any).subjectName));
      if (!hasTHPTSpecific && appliedSubjects.length <= 9) {
        return { subjects: appliedSubjects, isValid: true };
      }
    }

    // Nếu cấu hình lớp là GDTX và danh mục môn của lớp là thuần GDTX
    if (isClassExplicitGDTX) {
      const classApplied = classService.getAppliedSubjects().filter(s => !this.isTHPTOnlySubject(s.name || (s as any).subjectName));
      if (classApplied.length > 0 && classApplied.length <= 9) {
        return { subjects: classApplied, isValid: true };
      }
    }

    // 3. Dựa vào dữ liệu hiện có của học viên (existing data)
    // Lấy các môn trong bản ghi hiện tại của học viên
    const existingGrades = this.normalizeRawGrades(record);
    const existingSubjectsInRecord: SubjectConfig[] = [];

    existingGrades.forEach(g => {
      const subName = g.subjectName;
      if (!subName || this.isTHPTOnlySubject(subName)) return; // Bỏ qua môn THPT không áp dụng
      if (!this.isGDTXSubject(subName)) return; // Bỏ qua môn ngoài danh mục GDTX

      if (!existingSubjectsInRecord.some(s => isSameSubject(s, g))) {
        const matched = this.matchSubjectConfig(g, pool);
        existingSubjectsInRecord.push({
          id: matched?.id || g.subjectId || `sub-${subName}`,
          name: matched?.name || subName,
          subjectCode: matched?.subjectCode || matched?.code || g.subjectCode,
          code: matched?.code || matched?.subjectCode || g.subjectCode,
          selected: true,
          active: true,
          assessmentMode: (g.assessmentMode === 'COMMENT_ONLY' || this.isCommentOnlySubject(subName)) ? 'COMMENT_ONLY' : 'SCORE_AND_COMMENT'
        });
      }
    });

    // Luôn đảm bảo 3 môn học bắt buộc của GDTX: Ngữ văn, Toán học, Lịch sử
    const mandatoryGDTX = [
      { name: 'Ngữ văn', code: 'VAN' },
      { name: 'Toán học', code: 'TOAN' },
      { name: 'Lịch sử', code: 'SU' }
    ];
    mandatoryGDTX.forEach(m => {
      if (!existingSubjectsInRecord.some(s => isSameSubject(s, m))) {
        existingSubjectsInRecord.push({
          id: `gdtx-${m.code.toLowerCase()}`,
          name: m.name,
          subjectCode: m.code,
          code: m.code,
          selected: true,
          active: true,
          assessmentMode: 'SCORE_AND_COMMENT'
        });
      }
    });

    // Theo CT GDTX cấp THPT (TT 12/2022), học viên học 3 môn bắt buộc + 4 môn lựa chọn = 7 môn
    if (existingSubjectsInRecord.length >= 7) {
      return { subjects: existingSubjectsInRecord, isValid: true };
    }

    // Nếu học viên có dữ liệu các môn GDTX (ít nhất 3 môn bắt buộc) nhưng chưa đủ 7 môn:
    // Bổ sung các môn lựa chọn chuẩn của GDTX (GDTX_THPT_STANDARD_SUBJECTS)
    if (existingSubjectsInRecord.length >= 3) {
      GDTX_THPT_STANDARD_SUBJECTS.forEach(std => {
        if (!existingSubjectsInRecord.some(s => isSameSubject(s, std))) {
          existingSubjectsInRecord.push({ ...std, selected: true, active: true });
        }
      });
      return { subjects: existingSubjectsInRecord, isValid: true };
    }

    // 4. Nếu không xác định được danh sách môn hợp lệ (Requirement 5)
    return {
      subjects: [],
      isValid: false,
      reason: 'Chưa xác định được danh sách môn học hợp lệ theo chương trình GDTX (chưa có môn đăng ký và không có cấu hình chương trình áp dụng)'
    };
  }

  // Reconcile any academic record with the current active SubjectConfigs
  public reconcileRecordWithConfig(record: StudentAcademicRecord, appliedSubjects?: SubjectConfig[]): StudentAcademicRecord {
    if (!record) return record;
    const normPeriod = normalizeAcademicPeriod(record.period as any);
    const existingGrades = this.normalizeRawGrades(record);

    let activeSubjects: SubjectConfig[];
    const isGDTX = this.isGDTXCurriculum(record, record.studentId);

    if (isGDTX) {
      const resolved = this.resolveApplicableSubjects(record, appliedSubjects, true);
      if (resolved.isValid && resolved.subjects.length > 0) {
        activeSubjects = resolved.subjects;
      } else {
        activeSubjects = GDTX_THPT_STANDARD_SUBJECTS;
      }
    } else {
      if (appliedSubjects && appliedSubjects.length > 0) {
        activeSubjects = appliedSubjects;
      } else {
        const classApplied = classService.getAppliedSubjects();
        activeSubjects = classApplied.length > 0 ? classApplied : THPT_2018_STANDARD_SUBJECTS;
      }
    }

    const parentMidtermPeriod: AcademicPeriod | null =
      normPeriod === 'final_hk1' ? 'midterm_hk1' : (normPeriod === 'final_hk2' ? 'midterm_hk2' : null);

    let parentMidtermGrades: SubjectGrade[] = [];
    let savedHk1Grades: SubjectGrade[] = [];
    let savedHk2Grades: SubjectGrade[] = [];
    let savedMidHk2Grades: SubjectGrade[] = [];

    if (record.studentId) {
      const student = studentService.getById(record.studentId) || studentService.getAll().find(s => s.id === record.studentId || s.code === record.studentId);
      const sid = student?.id || record.studentId;
      const scode = student?.code;

      if (parentMidtermPeriod) {
        const parentRec = this.findAcademicRecord(sid, scode, parentMidtermPeriod);
        if (parentRec) {
          parentMidtermGrades = this.normalizeRawGrades(parentRec);
        }
      }

      if (normPeriod === 'full_year') {
        const recHk1 = this.findAcademicRecord(sid, scode, 'final_hk1');
        if (recHk1) savedHk1Grades = this.normalizeRawGrades(recHk1);

        const recHk2 = this.findAcademicRecord(sid, scode, 'final_hk2');
        if (recHk2) savedHk2Grades = this.normalizeRawGrades(recHk2);

        const recMidHk2 = this.findAcademicRecord(sid, scode, 'midterm_hk2');
        if (recMidHk2) savedMidHk2Grades = this.normalizeRawGrades(recMidHk2);
      }
    }

    const extractSavedSemesterAvg = (gSem: SubjectGrade | undefined, semPeriod: 'final_hk1' | 'final_hk2'): number | undefined => {
      if (!gSem || gSem.assessmentMode === 'COMMENT_ONLY' || this.isCommentOnlySubject(gSem.subjectName)) return undefined;
      const directVal = semPeriod === 'final_hk1'
        ? (isEnteredValidScore(gSem.tbHk1) ? gSem.tbHk1 : (isEnteredValidScore(gSem.average) ? gSem.average : undefined))
        : (isEnteredValidScore(gSem.tbHk2) ? gSem.tbHk2 : (isEnteredValidScore(gSem.average) ? gSem.average : undefined));
      if (isEnteredValidScore(directVal)) {
        return Number(Number(directVal).toFixed(1));
      }
      return this.resolveSubjectPeriodScore(gSem, semPeriod, record.studentId);
    };

    const reconciledGrades: SubjectGrade[] = activeSubjects.map((sub) => {
      const subName = sub.name || (sub as any).subjectName || 'Môn học';
      const isComment = sub.assessmentMode === 'COMMENT_ONLY' || this.isCommentOnlySubject(subName);
      const configuredTxCount = isComment
        ? 0
        : (sub.txColumnCount !== undefined ? sub.txColumnCount : this.getSubjectRegularCount(subName));

      const existingGrade = existingGrades.find(g => isSameSubject(g, sub));
      const parentGrade = parentMidtermGrades.find(g => isSameSubject(g, sub));
      const gHk1 = savedHk1Grades.find(g => isSameSubject(g, sub));
      const gHk2 = savedHk2Grades.find(g => isSameSubject(g, sub));
      const gMidHk2 = savedMidHk2Grades.find(g => isSameSubject(g, sub));

      const isOverwrittenByImport = Boolean((existingGrade as any)?._overwrittenByImport);
      const effectiveTxCount = typeof (existingGrade as any)?._importedTxCount === 'number'
        ? Math.max(0, Math.min(6, (existingGrade as any)._importedTxCount))
        : configuredTxCount;

      if (normPeriod === 'full_year') {
        if (isComment) {
          let qual = isOverwrittenByImport
            ? existingGrade?.qualitativeResult
            : (existingGrade?.qualitativeResult ?? gHk2?.qualitativeResult ?? undefined);
          if (qual !== 'Đạt' && qual !== 'Chưa đạt') {
            qual = undefined;
          }
          return {
            ...(existingGrade || {}),
            subjectId: sub.id,
            subjectCode: sub.subjectCode || sub.code,
            subjectName: subName,
            assessmentMode: 'COMMENT_ONLY' as const,
            qualitativeResult: qual,
            comment: isOverwrittenByImport ? (existingGrade?.comment || '') : (existingGrade?.comment || gHk2?.comment || ''),
            tx1: undefined,
            tx2: undefined,
            tx3: undefined,
            tx4: undefined,
            tx5: undefined,
            tx6: undefined,
            regularScores: [],
            midterm: undefined,
            finalExam: undefined,
            average: undefined,
            tbHk1: undefined,
            tbHk2: undefined,
            tbCaNam: undefined,
            note: existingGrade?.note || ''
          };
        }

        const hasExistingFullYearEntry = existingGrade !== undefined;
        const pickComp = (key: 'tx1' | 'tx2' | 'tx3' | 'tx4' | 'tx5' | 'tx6' | 'midterm' | 'finalExam'): number | undefined => {
          if (hasExistingFullYearEntry) {
            if (isEnteredValidScore(existingGrade[key])) return Number(existingGrade[key]);
            if ((existingGrade as any)._editedInFullYear || isOverwrittenByImport) return undefined;
          }
          if (isEnteredValidScore(gHk2?.[key])) return Number(gHk2![key]);
          if (key !== 'finalExam' && isEnteredValidScore(gMidHk2?.[key])) return Number(gMidHk2![key]);
          return undefined;
        };

        const tx1 = effectiveTxCount >= 1 ? pickComp('tx1') : undefined;
        const tx2 = effectiveTxCount >= 2 ? pickComp('tx2') : undefined;
        const tx3 = effectiveTxCount >= 3 ? pickComp('tx3') : undefined;
        const tx4 = effectiveTxCount >= 4 ? pickComp('tx4') : undefined;
        const tx5 = effectiveTxCount >= 5 ? pickComp('tx5') : undefined;
        const tx6 = effectiveTxCount >= 6 ? pickComp('tx6') : undefined;
        const regularScores = [tx1, tx2, tx3, tx4, tx5, tx6].filter((v): v is number => v !== undefined);
        const midtermToUse = pickComp('midterm');
        const finalExam = pickComp('finalExam');

        const savedHk1Avg = extractSavedSemesterAvg(gHk1, 'final_hk1');
        const savedHk2Avg = extractSavedSemesterAvg(gHk2, 'final_hk2');

        let tbHk1: number | undefined;
        if ((existingGrade as any)?._clearedTbHk1) {
          tbHk1 = undefined;
        } else if (savedHk1Avg !== undefined) {
          tbHk1 = savedHk1Avg;
        } else if (isEnteredValidScore(existingGrade?.tbHk1)) {
          tbHk1 = Number(Number(existingGrade!.tbHk1).toFixed(1));
        } else {
          tbHk1 = undefined;
        }

        let tbHk2: number | undefined;
        if ((existingGrade as any)?._clearedTbHk2) {
          tbHk2 = undefined;
        } else if (savedHk2Avg !== undefined) {
          tbHk2 = savedHk2Avg;
        } else if (isEnteredValidScore(existingGrade?.tbHk2)) {
          tbHk2 = Number(Number(existingGrade!.tbHk2).toFixed(1));
        } else {
          tbHk2 = calculateSubjectAverage({
            tx1,
            tx2,
            tx3,
            tx4,
            tx5,
            tx6,
            regularScores,
            midterm: midtermToUse,
            finalExam,
            period: 'final_hk2'
          });
        }

        const caNamAvg = (isEnteredValidScore(tbHk1) && isEnteredValidScore(tbHk2))
          ? Number(((Number(tbHk2) * 2 + Number(tbHk1)) / 3).toFixed(1))
          : (isOverwrittenByImport && isEnteredValidScore(existingGrade?.tbCaNam) && tbHk1 === undefined && tbHk2 === undefined
              ? Number(Number(existingGrade!.tbCaNam).toFixed(1))
              : undefined);

        return {
          ...(existingGrade || {}),
          subjectId: sub.id,
          subjectCode: sub.subjectCode || sub.code,
          subjectName: subName,
          assessmentMode: 'SCORE_AND_COMMENT' as const,
          qualitativeResult: undefined,
          comment: existingGrade?.comment || '',
          note: existingGrade?.note || '',
          tx1,
          tx2,
          tx3,
          tx4,
          tx5,
          tx6,
          regularScores,
          midterm: midtermToUse,
          finalExam,
          tbHk1,
          tbHk2,
          tbCaNam: caNamAvg,
          average: caNamAvg
        };
      }

      if (existingGrade) {
        if (isComment) {
          let qual = existingGrade.qualitativeResult;
          if (!isOverwrittenByImport && qual === undefined && parentGrade?.qualitativeResult) {
            qual = parentGrade.qualitativeResult;
          }
          if (qual !== 'Đạt' && qual !== 'Chưa đạt') {
            qual = undefined;
          }
          return {
            ...existingGrade,
            subjectId: sub.id,
            subjectCode: sub.subjectCode || sub.code,
            subjectName: subName,
            assessmentMode: 'COMMENT_ONLY' as const,
            qualitativeResult: qual,
            comment: existingGrade.comment || '',
            tx1: undefined,
            tx2: undefined,
            tx3: undefined,
            tx4: undefined,
            tx5: undefined,
            tx6: undefined,
            regularScores: [],
            midterm: undefined,
            finalExam: undefined,
            average: undefined,
            tbHk1: undefined,
            tbHk2: undefined,
            tbCaNam: undefined
          };
        } else {
          // Nếu bản ghi được ghi đè từ file Excel mới (isOverwrittenByImport), lấy đúng giá trị trong file mới,
          // không tự động giữ lại điểm cũ hoặc điểm giữa kì ở các cột không có / để trống trong file mới.
          let midtermToUse: number | undefined = isEnteredValidScore(existingGrade.midterm) ? Number(existingGrade.midterm) : undefined;
          if (!isOverwrittenByImport && parentMidtermPeriod && isEnteredValidScore(parentGrade?.midterm)) {
            midtermToUse = Number(parentGrade.midterm);
          }

          const rawTx1 = (!isOverwrittenByImport && parentMidtermPeriod && isEnteredValidScore(parentGrade?.tx1))
            ? Number(parentGrade.tx1)
            : (isEnteredValidScore(existingGrade.tx1) ? Number(existingGrade.tx1) : undefined);
          const rawTx2 = (!isOverwrittenByImport && parentMidtermPeriod && isEnteredValidScore(parentGrade?.tx2))
            ? Number(parentGrade.tx2)
            : (isEnteredValidScore(existingGrade.tx2) ? Number(existingGrade.tx2) : undefined);
          const rawTx3 = (!isOverwrittenByImport && parentMidtermPeriod && isEnteredValidScore(parentGrade?.tx3))
            ? Number(parentGrade.tx3)
            : (isEnteredValidScore(existingGrade.tx3) ? Number(existingGrade.tx3) : undefined);
          const rawTx4 = (!isOverwrittenByImport && parentMidtermPeriod && isEnteredValidScore(parentGrade?.tx4))
            ? Number(parentGrade.tx4)
            : (isEnteredValidScore(existingGrade.tx4) ? Number(existingGrade.tx4) : undefined);
          const rawTx5 = (!isOverwrittenByImport && parentMidtermPeriod && isEnteredValidScore(parentGrade?.tx5))
            ? Number(parentGrade.tx5)
            : (isEnteredValidScore(existingGrade.tx5) ? Number(existingGrade.tx5) : undefined);
          const rawTx6 = (!isOverwrittenByImport && parentMidtermPeriod && isEnteredValidScore(parentGrade?.tx6))
            ? Number(parentGrade.tx6)
            : (isEnteredValidScore(existingGrade.tx6) ? Number(existingGrade.tx6) : undefined);

          const tx1 = effectiveTxCount >= 1 ? rawTx1 : undefined;
          const tx2 = effectiveTxCount >= 2 ? rawTx2 : undefined;
          const tx3 = effectiveTxCount >= 3 ? rawTx3 : undefined;
          const tx4 = effectiveTxCount >= 4 ? rawTx4 : undefined;
          const tx5 = effectiveTxCount >= 5 ? rawTx5 : undefined;
          const tx6 = effectiveTxCount >= 6 ? rawTx6 : undefined;
          const regularScores = [tx1, tx2, tx3, tx4, tx5, tx6].filter((v): v is number => v !== undefined);
          const finalExam = isEnteredValidScore(existingGrade.finalExam) ? Number(existingGrade.finalExam) : undefined;

          const updatedGrade: SubjectGrade = {
            ...existingGrade,
            subjectId: sub.id,
            subjectCode: sub.subjectCode || sub.code,
            subjectName: subName,
            assessmentMode: 'SCORE_AND_COMMENT' as const,
            tx1,
            tx2,
            tx3,
            tx4,
            tx5,
            tx6,
            regularScores,
            midterm: midtermToUse,
            finalExam
          };

          const resolvedScore = this.resolveSubjectPeriodScore(updatedGrade, normPeriod, record.studentId);
          return {
            ...updatedGrade,
            average: resolvedScore,
            tbCaNam: existingGrade.tbCaNam,
            tbHk1: normPeriod === 'final_hk1' ? resolvedScore : existingGrade.tbHk1,
            tbHk2: normPeriod === 'final_hk2' ? resolvedScore : existingGrade.tbHk2
          };
        }
      }

      // If no existing grade, produce clean grade preserving midterm and TX if present in parent midterm period
      if (isComment) {
        return {
          subjectId: sub.id,
          subjectCode: sub.subjectCode || sub.code,
          subjectName: subName,
          assessmentMode: 'COMMENT_ONLY' as const,
          qualitativeResult: parentGrade?.qualitativeResult,
          comment: parentGrade?.comment || '',
          tx1: undefined,
          tx2: undefined,
          tx3: undefined,
          tx4: undefined,
          tx5: undefined,
          tx6: undefined,
          midterm: undefined,
          finalExam: undefined,
          average: undefined,
          tbHk1: undefined,
          tbHk2: undefined,
          tbCaNam: undefined,
          note: ''
        };
      }

      const tx1 = isEnteredValidScore(parentGrade?.tx1) ? Number(parentGrade?.tx1) : undefined;
      const tx2 = isEnteredValidScore(parentGrade?.tx2) ? Number(parentGrade?.tx2) : undefined;
      const tx3 = isEnteredValidScore(parentGrade?.tx3) ? Number(parentGrade?.tx3) : undefined;
      const tx4 = isEnteredValidScore(parentGrade?.tx4) ? Number(parentGrade?.tx4) : undefined;
      const tx5 = isEnteredValidScore(parentGrade?.tx5) ? Number(parentGrade?.tx5) : undefined;
      const tx6 = isEnteredValidScore(parentGrade?.tx6) ? Number(parentGrade?.tx6) : undefined;
      const regularScores = [tx1, tx2, tx3, tx4, tx5, tx6].filter((v): v is number => v !== undefined);
      const midtermToUse = (parentMidtermPeriod && isEnteredValidScore(parentGrade?.midterm)) ? Number(parentGrade.midterm) : undefined;
      const newGrade: SubjectGrade = {
        subjectId: sub.id,
        subjectCode: sub.subjectCode || sub.code,
        subjectName: subName,
        assessmentMode: 'SCORE_AND_COMMENT' as const,
        qualitativeResult: undefined,
        comment: '',
        tx1,
        tx2,
        tx3,
        tx4,
        tx5,
        tx6,
        regularScores,
        midterm: midtermToUse,
        finalExam: undefined,
        average: undefined,
        tbHk1: undefined,
        tbHk2: undefined,
        tbCaNam: undefined,
        note: ''
      };
      const resolvedScore = this.resolveSubjectPeriodScore(newGrade, normPeriod, record.studentId);
      newGrade.average = resolvedScore;
      if (normPeriod === 'final_hk1') newGrade.tbHk1 = resolvedScore;
      if (normPeriod === 'final_hk2') newGrade.tbHk2 = resolvedScore;
      return newGrade;
    });

    const scoredGrades = reconciledGrades.filter(g => typeof g.average === 'number' && g.assessmentMode !== 'COMMENT_ONLY');
    let highestSubject: { name: string; score: number } | undefined = undefined;
    let lowestSubject: { name: string; score: number } | undefined = undefined;

    if (scoredGrades.length > 0) {
      const sorted = [...scoredGrades].sort((a, b) => (b.average || 0) - (a.average || 0));
      highestSubject = { name: sorted[0].subjectName, score: sorted[0].average || 0 };
      lowestSubject = { name: sorted[sorted.length - 1].subjectName, score: sorted[sorted.length - 1].average || 0 };
    }

    return {
      ...record,
      period: normPeriod,
      grades: reconciledGrades,
      highestSubject,
      lowestSubject,
      strongestSubject: record.strongestSubject || highestSubject?.name,
      improvementSubject: record.improvementSubject || lowestSubject?.name
    };
  }

  // Publication lifecycle methods
  public getPublication(studentId: string, period: AcademicPeriod): AcademicPublication {
    const key = `${studentId}_${period}`;
    if (this.publications[key]) {
      return this.publications[key];
    }
    const rec = this.academicRecords[key];
    const isPublished = rec?.publishedToStudent === true || rec?.publishedToParent === true || rec?.publicationStatus === 'PUBLISHED';
    return {
      period,
      studentId,
      status: isPublished ? 'PUBLISHED' : 'DRAFT',
      publishedAt: rec?.publishedAt,
      publishedBy: rec?.publishedBy || (rec?.commentUpdatedBy ? `${rec.commentUpdatedBy}` : undefined),
      publicationVersion: rec?.publicationVersion || (isPublished ? 1 : 0),
      snapshot: rec ? JSON.parse(JSON.stringify(rec)) : undefined
    };
  }

  public isPeriodPublished(studentId: string, period: AcademicPeriod): boolean {
    const pub = this.getPublication(studentId, period);
    return pub.status === 'PUBLISHED';
  }

  public publishStudentGrades(studentId: string, period: AcademicPeriod, publishedBy?: string): AcademicPublication {
    const classSettings = classService.getSettings();
    const author = publishedBy || (classSettings.homeroomTeacherName ? `${classSettings.homeroomTeacherName} (GVCN)` : 'GVCN');
    const now = new Date();
    const dateStr = now.toLocaleDateString('vi-VN');
    const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const fullTimestamp = `${dateStr} lúc ${timeStr}`;

    const key = `${studentId}_${period}`;
    const currentRec = this.getStudentAcademicRecord(studentId, period);
    const existingPub = this.getPublication(studentId, period);
    const nextVer = (existingPub.publicationVersion || 0) + 1;

    const reconciled = this.reconcileRecordWithConfig(currentRec);
    const updatedRec: StudentAcademicRecord = {
      ...reconciled,
      publishedToStudent: true,
      publishedToParent: true,
      publishedAt: fullTimestamp,
      publishedBy: author,
      publicationVersion: nextVer,
      publicationStatus: 'PUBLISHED',
      updatedAt: fullTimestamp
    };

    const pub: AcademicPublication = {
      period,
      studentId,
      status: 'PUBLISHED',
      publishedAt: fullTimestamp,
      publishedBy: author,
      publicationVersion: nextVer,
      snapshot: JSON.parse(JSON.stringify(updatedRec))
    };

    this.academicRecords[key] = updatedRec;
    this.publications[key] = pub;
    this.saveToStorage();

    // Trigger in-app notification to student and parent
    inAppNotificationService.notifyGradesPublished(period, PERIOD_NAMES[period] || period, studentId);

    // Sync to backend SQLite
    academicRepositoryClient.saveRecord(this.buildServerRecordPayload(updatedRec)).catch(() => {});

    return pub;
  }

  public publishAllGrades(period: AcademicPeriod = 'midterm_hk1', publishedBy?: string) {
    const classSettings = classService.getSettings();
    const author = publishedBy || (classSettings.homeroomTeacherName ? `${classSettings.homeroomTeacherName} (GVCN)` : 'GVCN');
    const now = new Date();
    const dateStr = now.toLocaleDateString('vi-VN');
    const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const fullTimestamp = `${dateStr} lúc ${timeStr}`;

    // Get all student IDs present in records or student list
    const studentKeys = Object.keys(this.academicRecords).map(k => k.split('_')[0]);
    const allStudents = studentService.getAll();
    const uniqueStudentIds = Array.from(new Set([...studentKeys, ...allStudents.map(s => s.id)].filter(Boolean)));
    if (uniqueStudentIds.length === 0) {
      uniqueStudentIds.push('hs-01', 'hs-02');
    }

    uniqueStudentIds.forEach(studentId => {
      const key = `${studentId}_${period}`;
      const rec = this.getStudentAcademicRecord(studentId, period);
      const existingPub = this.getPublication(studentId, period);
      const nextVer = (existingPub.publicationVersion || 0) + 1;

      const reconciled = this.reconcileRecordWithConfig(rec);
      const updatedRec: StudentAcademicRecord = {
        ...reconciled,
        publishedToStudent: true,
        publishedToParent: true,
        publishedAt: fullTimestamp,
        publishedBy: author,
        publicationVersion: nextVer,
        publicationStatus: 'PUBLISHED',
        updatedAt: fullTimestamp
      };

      const pub: AcademicPublication = {
        period,
        studentId,
        status: 'PUBLISHED',
        publishedAt: fullTimestamp,
        publishedBy: author,
        publicationVersion: nextVer,
        snapshot: JSON.parse(JSON.stringify(updatedRec))
      };

      this.academicRecords[key] = updatedRec;
      this.publications[key] = pub;
    });

    this.saveToStorage();

    // Trigger in-app notification to all class members
    inAppNotificationService.notifyGradesPublished(period, PERIOD_NAMES[period] || period);

    // Sync published snapshot & individual student records to backend SQLite
    academicRepositoryClient.publishSnapshot({
      academicYear: '2025 - 2026',
      semester: period.includes('hk2') ? 'Học kỳ II' : 'Học kỳ I',
      periodLabel: PERIOD_NAMES[period] || period,
      data: { period, records: this.academicRecords }
    }).catch(() => {});

    uniqueStudentIds.forEach(studentId => {
      const rec = this.academicRecords[`${studentId}_${period}`];
      if (rec) {
        academicRepositoryClient.saveRecord(this.buildServerRecordPayload(rec)).catch(() => {});
      }
    });
  }

  public unpublishPeriod(studentId: string, period: AcademicPeriod) {
    const key = `${studentId}_${period}`;
    if (this.academicRecords[key]) {
      this.academicRecords[key] = {
        ...this.academicRecords[key],
        publishedToStudent: false,
        publishedToParent: false,
        publicationStatus: 'DRAFT'
      };
    }
    if (this.publications[key]) {
      this.publications[key] = {
        ...this.publications[key],
        status: 'DRAFT'
      };
    }
    this.saveToStorage();
  }

  public reconcileAllRecords() {
    const applied = classService.getAppliedSubjects();
    Object.keys(this.academicRecords).forEach(key => {
      this.academicRecords[key] = this.reconcileRecordWithConfig(this.academicRecords[key], applied);
    });
    this.saveToStorage();
  }

  // Academic Grade Records by Period & Student
  public getStudentAcademicRecord(studentId: string, period: AcademicPeriod = 'midterm_hk1'): StudentAcademicRecord {
    const normPeriod = normalizeAcademicPeriod(period);
    const student = studentService.getById(studentId) || studentService.getAll().find(s => s.id === studentId || s.code === studentId);
    const sid = student?.id || studentId;
    const scode = student?.code;

    const key = `${sid}_${normPeriod}`;
    let record = this.findAcademicRecord(sid, scode, normPeriod);

    if (!record) {
      const classSettings = classService.getSettings();
      const teacherName = classSettings.homeroomTeacherName || classSettings.teacherName || 'GVCN';
      const isDefaultPublished = false;

      record = {
        studentId: sid,
        period: normPeriod,
        semester: (normPeriod.includes('hk2') ? 'HK2' : 'HK1') as any,
        grades: [],
        highestSubject: undefined,
        lowestSubject: undefined,
        teacherComment: '',
        academicSummary: '',
        conductSummary: '',
        conductResult: undefined,
        publishedToStudent: isDefaultPublished,
        publishedToParent: isDefaultPublished,
        publishedAt: undefined,
        publishedBy: undefined,
        publicationVersion: 0,
        publicationStatus: 'DRAFT',
        commentUpdatedAt: undefined,
        commentUpdatedBy: teacherName
      };
    }

    // Always reconcile with active subjects SSOT
    const reconciled = this.reconcileRecordWithConfig(record);
    
    // Sync publication status
    const pub = this.publications[key] || (scode ? this.publications[`${scode}_${normPeriod}`] : undefined);
    if (pub) {
      if (record.publicationStatus === 'DRAFT' || record.publishedToStudent === false) {
        reconciled.publicationStatus = 'DRAFT';
        reconciled.publishedToStudent = false;
        reconciled.publishedToParent = false;
      } else {
        reconciled.publicationStatus = pub.status;
        reconciled.publishedToStudent = pub.status === 'PUBLISHED';
        reconciled.publishedToParent = pub.status === 'PUBLISHED';
      }
      reconciled.publishedAt = pub.publishedAt;
      reconciled.publishedBy = pub.publishedBy;
      reconciled.publicationVersion = pub.publicationVersion;
    }

    this.academicRecords[key] = reconciled;

    // Boundary protection for Student and Parent:
    // Only return the published snapshot if explicitly published;
    // unpublished edits remain hidden from student/parent until GVCN publishes.
    const currentUser = authService.getCurrentUser();
    const isStudentOrParent = currentUser && (currentUser.role === 'STUDENT' || currentUser.role === 'CLASS_OFFICER' || currentUser.role === 'PARENT');
    if (isStudentOrParent) {
      const isExplicitlyPublished = (pub && pub.status === 'PUBLISHED') ||
        reconciled.publicationStatus === 'PUBLISHED' ||
        reconciled.publishedToStudent === true;

      if (isExplicitlyPublished) {
        if (pub && pub.status === 'PUBLISHED' && pub.snapshot) {
          return this.reconcileRecordWithConfig(pub.snapshot);
        }
        return reconciled;
      }
      return {
        ...reconciled,
        publishedToStudent: false,
        publishedToParent: false,
        publicationStatus: 'DRAFT',
        grades: reconciled.grades.map(g => ({
          ...g,
          tx1: undefined,
          tx2: undefined,
          tx3: undefined,
          tx4: undefined,
          tx5: undefined,
          tx6: undefined,
          regularScores: [],
          midterm: undefined,
          finalExam: undefined,
          average: undefined,
          qualitativeResult: undefined
        }))
      };
    }

    return reconciled;
  }

  public getGrades(period: AcademicPeriod = 'midterm_hk1'): StudentAcademicRecord[] {
    const activeStudents = studentService.getAll();
    return activeStudents.map(s => this.getStudentAcademicRecord(s.id, period));
  }

  /**
   * Đánh giá kết quả học tập của 1 học viên theo Điều 9 Thông tư 43/2021/TT-BGDĐT
   *
   * Quy định Điều 9:
   * 1. Đối với môn học:
   *    - Môn nhận xét: Đạt / Chưa đạt
   *    - Môn tính điểm: Điểm trung bình môn (ĐTBmhk hoặc ĐTBmcn)
   * 2. Xếp loại kết quả học tập (từng học kì và cả năm):
   *    - Mức Tốt:
   *      + Tất cả môn nhận xét được đánh giá mức Đạt
   *      + Tất cả môn tính điểm có ĐTB >= 6.5, trong đó có ít nhất 05 môn đạt từ 8.0 trở lên
   *    - Mức Khá:
   *      + Tất cả môn nhận xét được đánh giá mức Đạt
   *      + Tất cả môn tính điểm có ĐTB >= 5.0, trong đó có ít nhất 05 môn đạt từ 6.5 trở lên
   *    - Mức Đạt:
   *      + Có không quá 01 môn nhận xét đánh giá mức Chưa đạt
   *      + Có ít nhất 05 môn tính điểm có ĐTB >= 5.0; không có môn nào ĐTB < 3.5
   *    - Mức Chưa đạt:
   *      + Các trường hợp còn lại (khi đã đủ dữ liệu đánh giá)
   *    - Chưa đủ dữ liệu đánh giá:
   *      + Khi học viên còn môn chưa có điểm trung bình hoặc môn nhận xét chưa có kết quả (điểm trống / chưa nhập đủ)
   */
  public evaluateStudentTT43(rec: StudentAcademicRecord, appliedSubjects?: SubjectConfig[]): {
    tier: 'TOT' | 'KHA' | 'DAT' | 'CHUA_DAT' | 'CHUA_DU_LIEU';
    label: 'Mức Tốt' | 'Mức Khá' | 'Mức Đạt' | 'Mức Chưa đạt' | 'Chưa đủ dữ liệu đánh giá';
    hasFullData: boolean;
    missingSubjects: string[];
    gpaEstimate?: number;
    reason?: string;
  } {
    // 0. Xác định danh sách môn áp dụng theo đúng quy định GDTX và hồ sơ/dữ liệu thực tế của học viên
    const applicable = this.resolveApplicableSubjects(rec, appliedSubjects, true);
    if (!applicable.isValid || applicable.subjects.length === 0) {
      return {
        tier: 'CHUA_DU_LIEU',
        label: 'Chưa đủ dữ liệu đánh giá',
        hasFullData: false,
        missingSubjects: [],
        reason: applicable.reason || 'Chưa xác định được danh sách môn học hợp lệ theo chương trình GDTX'
      };
    }

    const reconciled = this.reconcileRecordWithConfig(rec, applicable.subjects);
    const grades = reconciled.grades || [];

    const scoredGrades = grades.filter(g => g.assessmentMode !== 'COMMENT_ONLY');
    const commentGrades = grades.filter(g => g.assessmentMode === 'COMMENT_ONLY');

    const missingSubjects: string[] = [];
    const normPeriod = normalizeAcademicPeriod(rec.period as any);

    // 1. Trích xuất ĐTB của từng môn độc lập theo đúng kỳ đang thống kê
    const scoredList: { name: string; score: number }[] = [];
    scoredGrades.forEach(g => {
      const subjectScore = this.resolveSubjectPeriodScore(g, normPeriod, rec.studentId);

      if (subjectScore === undefined || isNaN(subjectScore)) {
        missingSubjects.push(g.subjectName);
      } else {
        scoredList.push({ name: g.subjectName, score: subjectScore });
      }
    });

    // 2. Kiểm tra từng môn nhận xét: phải có kết quả 'Đạt' hoặc 'Chưa đạt'
    const commentList: { name: string; result: string }[] = [];
    commentGrades.forEach(g => {
      let qResult = g.qualitativeResult;
      if (!qResult || (qResult !== 'Đạt' && qResult !== 'Chưa đạt')) {
        missingSubjects.push(g.subjectName);
      } else {
        commentList.push({ name: g.subjectName, result: qResult });
      }
    });

    // 3. Nếu chưa có môn nào hoặc còn môn chưa có điểm / chưa đánh giá -> BẮT BUỘC giữ trạng thái "Chưa đủ dữ liệu đánh giá"
    if (grades.length === 0 || missingSubjects.length > 0) {
      const validScores = scoredList.map(s => s.score);
      const partialGpa = validScores.length > 0
        ? Number((validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(1))
        : undefined;

      const reason = grades.length === 0 || missingSubjects.length === grades.length
        ? 'Chưa nhập điểm môn nào'
        : `Chưa đủ dữ liệu (${missingSubjects.length} môn chưa có ĐTB/đánh giá: ${missingSubjects.slice(0, 3).join(', ')}${missingSubjects.length > 3 ? '...' : ''})`;

      return {
        tier: 'CHUA_DU_LIEU',
        label: 'Chưa đủ dữ liệu đánh giá',
        hasFullData: false,
        missingSubjects,
        gpaEstimate: partialGpa,
        reason
      };
    }

    // 4. Đã có đầy đủ điểm tất cả các môn:
    // Xét ĐTB TỪNG MÔN ĐỘC LẬP theo Điều 9 Khoản 2 Thông tư 43/2021/TT-BGDĐT
    const scores = scoredList.map(s => s.score);
    // Tính ĐTB chung chỉ để hiển thị tham khảo / ước lượng, TUYỆT ĐỐI KHÔNG DÙNG ĐỂ THAY THẾ ĐIỀU KIỆN TỪNG MÔN
    const avgSum = Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1));

    const allGte65 = scores.every(s => s >= 6.5);
    const countGte8 = scores.filter(s => s >= 8.0).length;

    const allGte5 = scores.every(s => s >= 5.0);
    const countGte65 = scores.filter(s => s >= 6.5).length;

    const countGte5 = scores.filter(s => s >= 5.0).length;
    const countLt35 = scores.filter(s => s < 3.5).length;

    const failedComments = commentList.filter(c => c.result === 'Chưa đạt').length;

    // 4.1. Xác định mức đánh giá ban đầu theo Khoản 2 Điều 9 Thông tư 43/2021/TT-BGDĐT
    let baseTier: 'TOT' | 'KHA' | 'DAT' | 'CHUA_DAT' = 'CHUA_DAT';
    let baseLabel: 'Mức Tốt' | 'Mức Khá' | 'Mức Đạt' | 'Mức Chưa đạt' = 'Mức Chưa đạt';

    if (failedComments === 0 && allGte65 && countGte8 >= 5) {
      baseTier = 'TOT';
      baseLabel = 'Mức Tốt';
    } else if (failedComments === 0 && allGte5 && countGte65 >= 5) {
      baseTier = 'KHA';
      baseLabel = 'Mức Khá';
    } else if (failedComments <= 1 && countGte5 >= 5 && countLt35 === 0) {
      baseTier = 'DAT';
      baseLabel = 'Mức Đạt';
    } else {
      baseTier = 'CHUA_DAT';
      baseLabel = 'Mức Chưa đạt';
    }

    // Nếu đã đạt Mức Tốt hoặc Mức Khá: không bị hạ từ 2 mức trở lên -> Giữ nguyên kết quả Khoản 2
    if (baseTier === 'TOT' || baseTier === 'KHA') {
      return {
        tier: baseTier,
        label: baseLabel,
        hasFullData: true,
        missingSubjects: [],
        gpaEstimate: avgSum
      };
    }

    // 4.2. Quy tắc điều chỉnh mức đánh giá theo Khoản 3 Điều 9 Thông tư 43/2021/TT-BGDĐT:
    // "Nếu mức đánh giá kết quả học tập của học kì, cả năm học bị thấp xuống từ 02 (hai) mức trở lên
    // so với mức đánh giá quy định tại điểm a, điểm b khoản 2 Điều này chỉ do kết quả đánh giá của
    // duy nhất 01 (một) môn học thì mức đánh giá kết quả học tập của học kì đó, cả năm học đó
    // được điều chỉnh lên mức liền kề."

    // A. Kiểm tra điều chỉnh so với điểm a (Mức Tốt):
    // Tiêu chuẩn điểm a: Tất cả môn nhận xét Đạt; Tất cả môn tính điểm ĐTB >= 6.5; ít nhất 5 môn >= 8.0
    const failedCommentsA = commentList.filter(c => c.result === 'Chưa đạt');
    const failedScoredA = scoredList.filter(s => s.score < 6.5);
    const totalViolationsA = failedCommentsA.length + failedScoredA.length;

    if (totalViolationsA === 1) {
      const violatingSubjectName = failedCommentsA.length === 1 ? failedCommentsA[0].name : failedScoredA[0].name;

      // Kiểm tra điều kiện 5 môn >= 8.0:
      // Môn vi phạm có điểm < 6.5 (hoặc nhận xét Chưa đạt), không nằm trong số môn >= 8.0.
      // Nếu số môn >= 8.0 hiện tại đã đạt ít nhất 5 môn (countGte8 >= 5),
      // thì chứng minh duy nhất môn này làm hạ mức so với điểm a (Mức Tốt).
      if (countGte8 >= 5) {
        if (baseTier === 'DAT') {
          // Bị hạ 2 mức: từ Tốt xuống Đạt (Tốt -> Khá -> Đạt) chỉ do duy nhất 1 môn.
          // Điều chỉnh lên mức liền kề của Đạt -> Mức Khá!
          return {
            tier: 'KHA',
            label: 'Mức Khá',
            hasFullData: true,
            missingSubjects: [],
            gpaEstimate: avgSum,
            reason: `Điều chỉnh lên Mức Khá theo K3 Đ9 TT43 (chỉ do duy nhất môn ${violatingSubjectName} làm hạ từ Mức Tốt xuống Mức Đạt)`
          };
        } else if (baseTier === 'CHUA_DAT') {
          // Bị hạ 3 mức: từ Tốt xuống Chưa đạt (Tốt -> Khá -> Đạt -> Chưa đạt) chỉ do duy nhất 1 môn (vd: điểm < 3.5).
          // Điều chỉnh lên mức liền kề của Chưa đạt -> Mức Đạt!
          return {
            tier: 'DAT',
            label: 'Mức Đạt',
            hasFullData: true,
            missingSubjects: [],
            gpaEstimate: avgSum,
            reason: `Điều chỉnh lên Mức Đạt theo K3 Đ9 TT43 (chỉ do duy nhất môn ${violatingSubjectName} làm hạ từ Mức Tốt xuống Mức Chưa đạt)`
          };
        }
      }
    }

    // B. Kiểm tra điều chỉnh so với điểm b (Mức Khá):
    // Chỉ áp dụng khi baseTier === 'CHUA_DAT' (vì từ Khá xuống Chưa đạt là hạ 2 mức: Khá -> Đạt -> Chưa đạt).
    // (Từ Khá xuống Đạt chỉ là hạ 1 mức, không thuộc diện điều chỉnh từ 2 mức trở lên của Khoản 3).
    if (baseTier === 'CHUA_DAT') {
      const failedCommentsB = commentList.filter(c => c.result === 'Chưa đạt');
      const failedScoredB = scoredList.filter(s => s.score < 5.0);
      const totalViolationsB = failedCommentsB.length + failedScoredB.length;

      if (totalViolationsB === 1) {
        const violatingSubjectName = failedCommentsB.length === 1 ? failedCommentsB[0].name : failedScoredB[0].name;

        // Môn vi phạm có điểm < 5.0 (hoặc nhận xét Chưa đạt), không nằm trong số môn >= 6.5.
        // Nếu số môn >= 6.5 hiện tại đã đạt ít nhất 5 môn (countGte65 >= 5),
        // thì chứng minh duy nhất môn này làm hạ mức so với điểm b (Mức Khá).
        if (countGte65 >= 5) {
          // Bị hạ 2 mức: từ Khá xuống Chưa đạt chỉ do duy nhất 1 môn (vd: điểm < 3.5).
          // Điều chỉnh lên mức liền kề của Chưa đạt -> Mức Đạt!
          return {
            tier: 'DAT',
            label: 'Mức Đạt',
            hasFullData: true,
            missingSubjects: [],
            gpaEstimate: avgSum,
            reason: `Điều chỉnh lên Mức Đạt theo K3 Đ9 TT43 (chỉ do duy nhất môn ${violatingSubjectName} làm hạ từ Mức Khá xuống Mức Chưa đạt)`
          };
        }
      }
    }

    // C. Các trường hợp còn lại: Không thuộc diện điều chỉnh Khoản 3 -> Giữ nguyên kết quả Khoản 2
    return {
      tier: baseTier,
      label: baseLabel,
      hasFullData: true,
      missingSubjects: [],
      gpaEstimate: avgSum
    };
  }

  /**
   * Thống kê kết quả học tập theo Điều 9 Thông tư 43/2021/TT-BGDĐT
   */
  public getTT43Statistics(period: AcademicPeriod = 'midterm_hk1', appliedSubjects?: SubjectConfig[]) {
    const normPeriod = normalizeAcademicPeriod(period);
    const activeStudents = studentService.getAll();
    const records = activeStudents.map(s => this.getStudentAcademicRecord(s.id, normPeriod));
    
    // Categorize students
    const totStudents: Array<{ id: string; name: string; code?: string; gpaEstimate: number }> = [];
    const khaStudents: Array<{ id: string; name: string; code?: string; gpaEstimate: number }> = [];
    const datStudents: Array<{ id: string; name: string; code?: string; gpaEstimate: number }> = [];
    const chuaDatStudents: Array<{ id: string; name: string; code?: string; gpaEstimate: number }> = [];
    const chuaDuLieuStudents: Array<{ id: string; name: string; code?: string; gpaEstimate?: number; missingCount: number; missingSubjects: string[]; reason?: string }> = [];

    records.forEach(rec => {
      const studentObj = activeStudents.find(s => s.id === rec.studentId || (s.code && s.code === rec.studentId));
      const studentName = studentObj ? studentObj.fullName : rec.studentId;
      const studentCode = studentObj?.code;

      const evalRes = this.evaluateStudentTT43(rec, appliedSubjects);

      if (!evalRes.hasFullData) {
        chuaDuLieuStudents.push({
          id: rec.studentId,
          name: studentName,
          code: studentCode,
          gpaEstimate: evalRes.gpaEstimate,
          missingCount: evalRes.missingSubjects.length,
          missingSubjects: evalRes.missingSubjects,
          reason: evalRes.reason
        });
      } else {
        const item = {
          id: rec.studentId,
          name: studentName,
          code: studentCode,
          gpaEstimate: evalRes.gpaEstimate ?? 0
        };
        if (evalRes.tier === 'TOT') {
          totStudents.push(item);
        } else if (evalRes.tier === 'KHA') {
          khaStudents.push(item);
        } else if (evalRes.tier === 'DAT') {
          datStudents.push(item);
        } else {
          chuaDatStudents.push(item);
        }
      }
    });

    const total = activeStudents.length;
    const isForecast = normPeriod === 'midterm_hk1' || normPeriod === 'midterm_hk2';
    const completedAssessed = totStudents.length + khaStudents.length + datStudents.length + chuaDatStudents.length;

    return {
      period: normPeriod,
      periodName: PERIOD_NAMES[normPeriod],
      isForecast,
      statusLabel: isForecast ? 'Dự báo / Tạm tính giữa kỳ' : 'Xếp loại chính thức',
      totalAssessed: total,
      completedAssessed,
      totCount: totStudents.length,
      totPercent: total > 0 ? Number(((totStudents.length / total) * 100).toFixed(1)) : 0,
      totStudents,
      khaCount: khaStudents.length,
      khaPercent: total > 0 ? Number(((khaStudents.length / total) * 100).toFixed(1)) : 0,
      khaStudents,
      datCount: datStudents.length,
      datPercent: total > 0 ? Number(((datStudents.length / total) * 100).toFixed(1)) : 0,
      datStudents,
      chuaDatCount: chuaDatStudents.length,
      chuaDatPercent: total > 0 ? Number(((chuaDatStudents.length / total) * 100).toFixed(1)) : 0,
      chuaDatStudents,
      chuaDuLieuCount: chuaDuLieuStudents.length,
      chuaDuLieuPercent: total > 0 ? Number(((chuaDuLieuStudents.length / total) * 100).toFixed(1)) : 0,
      chuaDuLieuStudents
    };
  }

  public buildServerRecordPayload(reconciled: StudentAcademicRecord) {
    const classSettings = classService.getSettings();
    const normAcademicYear = (classSettings.schoolYearLabel || classSettings.academicYear || '2025 - 2026').trim();
    const semName = reconciled.period === 'full_year'
      ? 'Cả năm'
      : (reconciled.period.includes('hk2') ? 'Học kỳ II' : 'Học kỳ I');

    const scoredGrades = reconciled.grades.filter(g => typeof g.average === 'number' && !isNaN(g.average));
    const gpa = scoredGrades.length > 0
      ? Math.round((scoredGrades.reduce((sum, g) => sum + (g.average || 0), 0) / scoredGrades.length) * 10) / 10
      : undefined;

    const appliedSubjects = classService.getAppliedSubjects();
    const tt43Res = this.evaluateStudentTT43(reconciled, appliedSubjects);
    const academicRank = tt43Res.label;

    return {
      id: `acad_${reconciled.studentId}_${reconciled.period}_${normAcademicYear.replace(/[\s-]+/g, '_')}`,
      studentId: reconciled.studentId,
      academicYear: normAcademicYear,
      semester: semName,
      gpa,
      academicRank,
      conductScore: reconciled.conductResult === 'Tốt' ? 95 : (reconciled.conductResult === 'Khá' ? 80 : (reconciled.conductResult === 'Đạt' ? 65 : 45)),
      conductEvaluation: reconciled.conductSummary,
      attendanceSummary: {
        excused: reconciled.excusedAbsences || 0,
        unexcused: reconciled.unexcusedAbsences || 0
      },
      scores: {
        period: reconciled.period,
        grades: reconciled.grades,
        gpa,
        academicRank,
        publishedToStudent: reconciled.publishedToStudent,
        publishedToParent: reconciled.publishedToParent,
        publishedAt: reconciled.publishedAt,
        publishedBy: reconciled.publishedBy,
        publicationStatus: reconciled.publicationStatus,
        academicSummary: reconciled.academicSummary,
        conductSummary: reconciled.conductSummary,
        highestSubject: reconciled.highestSubject,
        lowestSubject: reconciled.lowestSubject,
        fullRecord: reconciled
      },
      teacherEvaluation: reconciled.academicSummary || reconciled.teacherComment
    };
  }

  public updateStudentGrades(
    studentId: string,
    updatedGrades: SubjectGrade[],
    period: AcademicPeriod = 'midterm_hk1',
    teacherComment?: string,
    commentUpdatedBy?: string,
    options?: {
      academicSummary?: string;
      conductSummary?: string;
      conductResult?: 'Tốt' | 'Khá' | 'Đạt' | 'Chưa đạt';
      strongestSubject?: string;
      improvementSubject?: string;
      excusedAbsences?: number;
      unexcusedAbsences?: number;
      publishedToStudent?: boolean;
      publishedToParent?: boolean;
      skipBackgroundServerSave?: boolean;
    }
  ) {
    const normPeriod = normalizeAcademicPeriod(period);
    const validGrades = updatedGrades.map(g => {
      const isComment = g.assessmentMode === 'COMMENT_ONLY' ||
        g.subjectName.toLowerCase().includes('trải nghiệm') ||
        g.subjectName.toLowerCase().includes('hướng nghiệp') ||
        g.subjectName.toLowerCase().includes('thể chất') ||
        g.subjectName.toLowerCase().includes('địa phương') ||
        g.subjectName.toLowerCase().includes('chào cờ') ||
        g.subjectName.toLowerCase().includes('sinh hoạt');

      if (isComment) {
        const qual = (g.qualitativeResult === 'Đạt' || g.qualitativeResult === 'Chưa đạt')
          ? g.qualitativeResult
          : undefined;
        return {
          ...g,
          assessmentMode: 'COMMENT_ONLY' as const,
          qualitativeResult: qual,
          tx1: undefined,
          tx2: undefined,
          tx3: undefined,
          tx4: undefined,
          tx5: undefined,
          tx6: undefined,
          regularScores: [],
          midterm: undefined,
          finalExam: undefined,
          average: undefined,
          tbHk1: undefined,
          tbHk2: undefined,
          tbCaNam: undefined
        };
      }

      let tx1 = isEnteredValidScore(g.tx1) ? Number(g.tx1) : undefined;
      let tx2 = isEnteredValidScore(g.tx2) ? Number(g.tx2) : undefined;
      let tx3 = isEnteredValidScore(g.tx3) ? Number(g.tx3) : undefined;
      let tx4 = isEnteredValidScore(g.tx4) ? Number(g.tx4) : undefined;
      let tx5 = isEnteredValidScore(g.tx5) ? Number(g.tx5) : undefined;
      let tx6 = isEnteredValidScore(g.tx6) ? Number(g.tx6) : undefined;
      let midterm = isEnteredValidScore(g.midterm) ? Number(g.midterm) : undefined;
      let finalExam = isEnteredValidScore(g.finalExam) ? Number(g.finalExam) : undefined;

      const isOverwrittenByImport = Boolean((g as any)._overwrittenByImport);
      const configuredTxCount = this.getSubjectRegularCount(g.subjectName);
      const isFinal = normPeriod === 'final_hk1' || normPeriod === 'final_hk2';
      const effectiveTxCount = (!isFinal && typeof (g as any)._importedTxCount === 'number')
        ? Math.max(0, Math.min(6, (g as any)._importedTxCount))
        : configuredTxCount;

      // Trong kỳ cuối HKI / Cuối HKII:
      // Bảo toàn điểm giữa kì và các điểm thường xuyên đã có từ giữa kì
      if (isFinal) {
        const parentMidtermPeriod = normPeriod === 'final_hk1' ? 'midterm_hk1' : 'midterm_hk2';
        const parentRec = this.findAcademicRecord(studentId, undefined, parentMidtermPeriod);
        const parentG = parentRec ? this.normalizeRawGrades(parentRec).find(x => isSameSubject(x, g)) : undefined;
        const existingRec = this.findAcademicRecord(studentId, undefined, normPeriod);
        const existingG = existingRec ? this.normalizeRawGrades(existingRec).find(x => isSameSubject(x, g)) : undefined;

        // 1. Điểm giữa kỳ: Bảo toàn từ kỳ giữa nếu g không gửi điểm giữa kỳ mới
        if (midterm === undefined) {
          if (parentG && isEnteredValidScore(parentG.midterm)) {
            midterm = Number(parentG.midterm);
          } else if (existingG && isEnteredValidScore(existingG.midterm)) {
            midterm = Number(existingG.midterm);
          }
        }

        // 2. Điểm thường xuyên đã có từ kỳ giữa: Bảo toàn nếu slot đó ở kỳ này chưa có điểm
        if (parentG) {
          if (tx1 === undefined && isEnteredValidScore(parentG.tx1)) tx1 = Number(parentG.tx1);
          if (tx2 === undefined && isEnteredValidScore(parentG.tx2)) tx2 = Number(parentG.tx2);
          if (tx3 === undefined && isEnteredValidScore(parentG.tx3)) tx3 = Number(parentG.tx3);
          if (tx4 === undefined && isEnteredValidScore(parentG.tx4)) tx4 = Number(parentG.tx4);
          if (tx5 === undefined && isEnteredValidScore(parentG.tx5)) tx5 = Number(parentG.tx5);
          if (tx6 === undefined && isEnteredValidScore(parentG.tx6)) tx6 = Number(parentG.tx6);
        }

        // 3. Với các cột TX còn thiếu ở giữa kỳ: nếu bản ghi cuối kỳ hiện tại đã có điểm lưu trước đó và g không gửi điểm mới (khi sửa UI), bảo toàn điểm đã lưu
        if (!isOverwrittenByImport && existingG) {
          if (tx1 === undefined && isEnteredValidScore(existingG.tx1)) tx1 = Number(existingG.tx1);
          if (tx2 === undefined && isEnteredValidScore(existingG.tx2)) tx2 = Number(existingG.tx2);
          if (tx3 === undefined && isEnteredValidScore(existingG.tx3)) tx3 = Number(existingG.tx3);
          if (tx4 === undefined && isEnteredValidScore(existingG.tx4)) tx4 = Number(existingG.tx4);
          if (tx5 === undefined && isEnteredValidScore(existingG.tx5)) tx5 = Number(existingG.tx5);
          if (tx6 === undefined && isEnteredValidScore(existingG.tx6)) tx6 = Number(existingG.tx6);
          if (finalExam === undefined && isEnteredValidScore(existingG.finalExam)) finalExam = Number(existingG.finalExam);
        }
      }

      // Cắt bỏ triệt để các cột TX vượt quá cấu trúc cột hiện hành của môn học / file Excel mới
      if (effectiveTxCount < 1) tx1 = undefined;
      if (effectiveTxCount < 2) tx2 = undefined;
      if (effectiveTxCount < 3) tx3 = undefined;
      if (effectiveTxCount < 4) tx4 = undefined;
      if (effectiveTxCount < 5) tx5 = undefined;
      if (effectiveTxCount < 6) tx6 = undefined;

      const regularScores = [tx1, tx2, tx3, tx4, tx5, tx6].filter((v): v is number => v !== undefined);

      let tbHk1 = isEnteredValidScore(g.tbHk1) ? Number(Number(g.tbHk1).toFixed(1)) : undefined;
      let tbHk2 = isEnteredValidScore(g.tbHk2) ? Number(Number(g.tbHk2).toFixed(1)) : undefined;

      if (normPeriod === 'full_year') {
        if (tbHk2 === undefined && !(g as any)._clearedTbHk2) {
          tbHk2 = calculateSubjectAverage({
            assessmentMode: g.assessmentMode,
            tx1,
            tx2,
            tx3,
            tx4,
            tx5,
            tx6,
            regularScores,
            midterm,
            finalExam,
            period: 'final_hk2'
          });
        }
      }

      const calculatedAvg = calculateSubjectAverage({
        assessmentMode: g.assessmentMode,
        tx1,
        tx2,
        tx3,
        tx4,
        tx5,
        tx6,
        regularScores,
        midterm,
        finalExam,
        period: normPeriod,
        tbHk1,
        tbHk2,
        tbCaNam: g.tbCaNam
      });

      const resolvedDirectAvg = (isOverwrittenByImport && calculatedAvg === undefined && isEnteredValidScore(g.average) && Boolean((g as any)._importedDirectAvg))
        ? Number(Number(g.average).toFixed(1))
        : calculatedAvg;

      return {
        ...g,
        ...(normPeriod === 'full_year' ? { _editedInFullYear: true } : {}),
        tx1,
        tx2,
        tx3,
        tx4,
        tx5,
        tx6,
        regularScores,
        midterm,
        finalExam,
        tbHk1: normPeriod === 'final_hk1' ? resolvedDirectAvg : tbHk1,
        tbHk2: normPeriod === 'final_hk2' ? resolvedDirectAvg : tbHk2,
        tbCaNam: normPeriod === 'full_year' ? resolvedDirectAvg : (isOverwrittenByImport ? undefined : g.tbCaNam),
        average: resolvedDirectAvg !== undefined ? resolvedDirectAvg : undefined
      };
    });

    const key = `${studentId}_${normPeriod}`;
    const existing: Partial<StudentAcademicRecord> = this.academicRecords[key] || {};

    const finalAcademicSummary = options?.academicSummary !== undefined 
      ? options.academicSummary 
      : (teacherComment !== undefined ? teacherComment : existing.academicSummary || existing.teacherComment);

    const classSettings = classService.getSettings();
    const defaultAuthor = classSettings.homeroomTeacherName ? `${classSettings.homeroomTeacherName} (GVCN)` : 'GVCN';
    const nowIso = new Date().toISOString();

    const draftRecord: StudentAcademicRecord = {
      ...existing,
      studentId,
      period: normPeriod,
      semester: (normPeriod === 'full_year' ? 'Cả năm' : (normPeriod.includes('hk2') ? 'HK2' : 'HK1')) as any,
      grades: validGrades,
      teacherComment: finalAcademicSummary,
      academicSummary: finalAcademicSummary,
      conductSummary: options?.conductSummary !== undefined ? options.conductSummary : existing.conductSummary,
      conductResult: options?.conductResult !== undefined ? options.conductResult : existing.conductResult,
      strongestSubject: options?.strongestSubject !== undefined ? options.strongestSubject : existing.strongestSubject,
      improvementSubject: options?.improvementSubject !== undefined ? options.improvementSubject : existing.improvementSubject,
      excusedAbsences: options?.excusedAbsences !== undefined ? options.excusedAbsences : (existing.excusedAbsences ?? 0),
      unexcusedAbsences: options?.unexcusedAbsences !== undefined ? options.unexcusedAbsences : (existing.unexcusedAbsences ?? 0),
      publishedToStudent: options?.publishedToStudent !== undefined ? options.publishedToStudent : (existing.publishedToStudent ?? true),
      publishedToParent: options?.publishedToParent !== undefined ? options.publishedToParent : (existing.publishedToParent ?? true),
      publishedAt: existing.publishedAt || nowIso,
      publishedBy: existing.publishedBy || defaultAuthor,
      publicationVersion: (existing.publicationVersion || 0) + 1,
      publicationStatus: (options?.publishedToStudent === false && options?.publishedToParent === false) ? 'DRAFT' : 'PUBLISHED',
      commentUpdatedAt: (teacherComment !== undefined || options?.academicSummary !== undefined || options?.conductSummary !== undefined) ? nowIso : existing.commentUpdatedAt,
      commentUpdatedBy: commentUpdatedBy || existing.commentUpdatedBy || defaultAuthor,
      updatedAt: nowIso
    };

    // Reconcile and save
    const reconciled = this.reconcileRecordWithConfig(draftRecord);
    this.academicRecords[key] = reconciled;

    // Automatically synchronize cached full_year record when final_hk1 or final_hk2 is updated
    if (normPeriod === 'final_hk1' || normPeriod === 'final_hk2') {
      const fullYearKey = `${studentId}_full_year`;
      if (this.academicRecords[fullYearKey]) {
        this.academicRecords[fullYearKey] = this.reconcileRecordWithConfig(this.academicRecords[fullYearKey]);
      }
    }

    if (reconciled.publishedToStudent || reconciled.publicationStatus === 'PUBLISHED') {
      this.publications[key] = {
        period: normPeriod,
        studentId,
        status: 'PUBLISHED',
        publishedAt: reconciled.publishedAt || nowIso,
        publishedBy: reconciled.publishedBy || defaultAuthor,
        publicationVersion: (this.publications[key]?.publicationVersion || 0) + 1,
        snapshot: JSON.parse(JSON.stringify(reconciled))
      };
    }
    this.saveToStorage();
    this.notify();

    if (!options?.skipBackgroundServerSave) {
      // Persist to server backend SQLite & schedule backup flush
      const serverPayload = this.buildServerRecordPayload(reconciled);
      academicRepositoryClient.saveRecord(serverPayload).catch(() => {});
    }

    return reconciled;
  }

  public async persistStudentGrades(
    studentId: string,
    updatedGrades: SubjectGrade[],
    period: AcademicPeriod = 'midterm_hk1',
    teacherComment?: string,
    commentUpdatedBy?: string,
    options?: {
      academicSummary?: string;
      conductSummary?: string;
      conductResult?: 'Tốt' | 'Khá' | 'Đạt' | 'Chưa đạt';
      strongestSubject?: string;
      improvementSubject?: string;
      excusedAbsences?: number;
      unexcusedAbsences?: number;
      publishedToStudent?: boolean;
      publishedToParent?: boolean;
      skipBackgroundServerSave?: boolean;
    }
  ): Promise<StudentAcademicRecord> {
    const normPeriod = normalizeAcademicPeriod(period);
    const key = `${studentId}_${normPeriod}`;
    const prevRecord = this.academicRecords[key] ? JSON.parse(JSON.stringify(this.academicRecords[key])) : undefined;
    const prevPub = this.publications[key] ? JSON.parse(JSON.stringify(this.publications[key])) : undefined;

    const reconciled = this.updateStudentGrades(studentId, updatedGrades, period, teacherComment, commentUpdatedBy, {
      ...options,
      skipBackgroundServerSave: true
    });
    const serverPayload = this.buildServerRecordPayload(reconciled);

    const res = await academicRepositoryClient.saveRecord(serverPayload);

    if (!res || res.success === false) {
      if (prevRecord !== undefined) {
        this.academicRecords[key] = prevRecord;
      } else {
        delete this.academicRecords[key];
      }
      if (prevPub !== undefined) {
        this.publications[key] = prevPub;
      } else {
        delete this.publications[key];
      }
      this.saveToStorage();
      this.notify();
      throw new Error(res?.message || (res as any)?.error || 'Lỗi khi lưu bảng điểm lên máy chủ.');
    }

    // Refresh from backend to guarantee authoritative state
    await this.syncWithBackendServer(undefined, true);

    return reconciled;
  }

  public async persistStudentGradesBatch(
    items: Array<{
      studentId: string;
      updatedGrades: SubjectGrade[];
      period: AcademicPeriod;
      teacherComment?: string;
      commentUpdatedBy?: string;
      options?: {
        academicSummary?: string;
        conductSummary?: string;
        conductResult?: 'Tốt' | 'Khá' | 'Đạt' | 'Chưa đạt';
        strongestSubject?: string;
        improvementSubject?: string;
        excusedAbsences?: number;
        unexcusedAbsences?: number;
        publishedToStudent?: boolean;
        publishedToParent?: boolean;
      };
    }>,
    importedSubjectTxCounts?: Record<string, number>
  ): Promise<{
    success: boolean;
    savedCount: number;
    failedCount: number;
    failedDetails: Array<{ studentId: string; studentName?: string; message: string }>;
  }> {
    if (!items || items.length === 0) {
      return { success: true, savedCount: 0, failedCount: 0, failedDetails: [] };
    }

    // Snapshot current state for atomic rollback if server save fails
    const prevRecordsSnapshot = JSON.parse(JSON.stringify(this.academicRecords));
    const prevPublicationsSnapshot = JSON.parse(JSON.stringify(this.publications));
    const prevSubjectConfigsSnapshot = JSON.parse(JSON.stringify(this.subjectConfigs));
    const prevClassSubjectsSnapshot = JSON.parse(JSON.stringify(classService.getSubjects()));

    if (importedSubjectTxCounts && Object.keys(importedSubjectTxCounts).length > 0) {
      await this.updateMultipleSubjectRegularCounts(importedSubjectTxCounts);
    }

    const payloads: any[] = [];
    items.forEach(item => {
      const reconciled = this.updateStudentGrades(
        item.studentId,
        item.updatedGrades,
        item.period,
        item.teacherComment,
        item.commentUpdatedBy,
        {
          ...item.options,
          skipBackgroundServerSave: true
        }
      );
      payloads.push(this.buildServerRecordPayload(reconciled));
    });

    const res = await academicRepositoryClient.saveRecordsBatch(payloads);

    if (res && res.success && (!res.failedCount || res.failedCount === 0)) {
      await this.syncWithBackendServer(undefined, true);
      return {
        success: true,
        savedCount: res.savedCount ?? payloads.length,
        failedCount: 0,
        failedDetails: []
      };
    }

    // Rollback local state on partial or complete failure so existing data is never corrupted
    this.academicRecords = prevRecordsSnapshot;
    this.publications = prevPublicationsSnapshot;
    this.subjectConfigs = prevSubjectConfigsSnapshot;
    if (importedSubjectTxCounts && Object.keys(importedSubjectTxCounts).length > 0) {
      await classService.updateSettings({ subjects: prevClassSubjectsSnapshot });
    }
    this.saveToStorage();
    this.notify();

    if (res && Array.isArray(res.failedDetails) && res.failedDetails.length > 0) {
      return {
        success: false,
        savedCount: 0,
        failedCount: res.failedCount ?? res.failedDetails.length,
        failedDetails: res.failedDetails.map((d: any) => ({
          studentId: d.studentId,
          studentName: d.studentName,
          message: d.error || d.message || 'Lỗi không xác định'
        }))
      };
    }

    return {
      success: false,
      savedCount: 0,
      failedCount: items.length,
      failedDetails: items.map(it => ({
        studentId: it.studentId,
        message: res?.message || 'Không thể kết nối đến máy chủ để lưu bảng điểm'
      }))
    };
  }

  public updateTeacherComment(
    studentId: string,
    period: AcademicPeriod,
    comment: string,
    author?: string
  ) {
    const classSettings = classService.getSettings();
    const defaultAuthor = classSettings.homeroomTeacherName ? `${classSettings.homeroomTeacherName} (GVCN)` : 'GVCN';
    const key = `${studentId}_${period}`;
    const existing = this.getStudentAcademicRecord(studentId, period);
    existing.teacherComment = comment;
    existing.commentUpdatedAt = new Date().toLocaleDateString('vi-VN');
    existing.commentUpdatedBy = author || defaultAuthor;
    this.academicRecords[key] = existing;
    this.saveToStorage();
  }

  public updateConductRecord(
    studentId: string,
    period: AcademicPeriod,
    conductResult: 'Tốt' | 'Khá' | 'Đạt' | 'Chưa đạt' | string,
    conductSummary?: string
  ): StudentAcademicRecord {
    const key = `${studentId}_${period}`;
    const existing = this.getStudentAcademicRecord(studentId, period);
    const updated: StudentAcademicRecord = {
      ...existing,
      conductResult: conductResult as any,
      conductSummary: conductSummary !== undefined ? conductSummary : existing.conductSummary,
      updatedAt: new Date().toLocaleDateString('vi-VN')
    };
    this.academicRecords[key] = updated;
    this.saveToStorage();
    this.notify();

    // Persist to server backend SQLite
    try {
      const serverPayload = this.buildServerRecordPayload(updated);
      academicRepositoryClient.saveRecord(serverPayload).catch(() => {});
      if (updated.publishedToStudent || updated.publicationStatus === 'PUBLISHED') {
        const pubKey = key;
        this.publications[pubKey] = {
          ...this.publications[pubKey],
          period,
          studentId,
          status: 'PUBLISHED',
          publishedAt: updated.publishedAt || new Date().toISOString(),
          publishedBy: updated.publishedBy || 'GVCN',
          publicationVersion: (this.publications[pubKey]?.publicationVersion || 0) + 1,
          snapshot: JSON.parse(JSON.stringify(updated))
        };
        academicRepositoryClient.publishSnapshot(this.publications[pubKey]).catch(() => {});
      }
    } catch {}

    return updated;
  }

  public getSubjectColors(): Record<string, { bg: string; border: string; text: string; label: string }> {
    try {
      const subjects = classService.getSubjects();
      const result: Record<string, { bg: string; border: string; text: string; label: string }> = { ...DEFAULT_SUBJECT_COLORS };
      subjects.forEach(s => {
        const subName = s?.name || (s as any)?.subjectName;
        if (subName && s.timetableColor && typeof s.timetableColor === 'object') {
          result[subName] = s.timetableColor as { bg: string; border: string; text: string; label: string };
        }
      });
      const saved = localStorage.getItem('kgcns_subject_colors');
      if (saved) {
        return { ...result, ...JSON.parse(saved) };
      }
      return result;
    } catch {
      // fallback
    }
    return { ...DEFAULT_SUBJECT_COLORS };
  }

  public updateSubjectColor(subject: string, colorSetting: { bg: string; border: string; text: string; label: string }) {
    const current = this.getSubjectColors();
    current[subject] = colorSetting;
    try {
      localStorage.setItem('kgcns_subject_colors', JSON.stringify(current));
      const subjects = classService.getSubjects();
      const found = subjects.find(s => s.name === subject || s.id === subject);
      if (found) {
        classService.updateSubject(found.id, { timetableColor: colorSetting });
      }
    } catch (e) {
      console.error(e);
    }
    this.notify();
  }

  public resetSubjectColors() {
    try {
      localStorage.removeItem('kgcns_subject_colors');
    } catch (e) {
      console.error(e);
    }
    this.notify();
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  public notify() {
    this.listeners.forEach(l => l());
  }
}

export const academicService = new AcademicService();
