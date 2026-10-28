/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  BookOpen,
  History,
  Plus,
  Edit2,
  CheckCircle2,
  FileSpreadsheet,
  Printer,
  ChevronDown,
  Palette,
  X,
  AlertCircle,
  Eye,
  Check,
  CheckCheck,
  Save,
  Sparkles,
  Sliders,
  Upload,
  Download,
  Trash2,
  RefreshCw
} from 'lucide-react';
import {
  TimetableVersion,
  TimetablePeriod,
  UserRole
} from '../../types';
import { academicService } from '../../services/AcademicService';
import { authService } from '../../services/AuthService';
import { exportService } from '../../services/ExportService';
import { PeriodTimeModal } from './PeriodTimeModal';
import { SubjectColorConfigModal } from './SubjectColorConfigModal';
import { TimetableExcelImportModal } from './TimetableExcelImportModal';
import { classService } from '../../services/ClassService';

interface TimetableTableGridProps {
  currentVersion?: TimetableVersion;
  timetable?: TimetableVersion;
  historyVersions?: TimetableVersion[];
  currentUserRole?: UserRole;
  canManageTimetable?: boolean;
  canManageAssignments?: boolean;
  onRefresh?: () => void;
}

const DAYS: Array<'Thứ 2' | 'Thứ 3' | 'Thứ 4' | 'Thứ 5' | 'Thứ 6' | 'Thứ 7'> = [
  'Thứ 2',
  'Thứ 3',
  'Thứ 4',
  'Thứ 5',
  'Thứ 6',
  'Thứ 7'
];

export const TimetableTableGrid: React.FC<TimetableTableGridProps> = ({
  currentVersion: propCurrentVersion,
  timetable: propTimetable,
  historyVersions: propHistoryVersions,
  currentUserRole: propCurrentUserRole,
  canManageTimetable,
  onRefresh
}) => {
  // Mobile day selection state
  const [selectedMobileDay, setSelectedMobileDay] = useState<string>('Thứ 2');

  // Selected period modal
  const [selectedSlot, setSelectedSlot] = useState<{
    dayOfWeek: string;
    session: 'morning' | 'afternoon';
    periodNum: number;
    periodData?: TimetablePeriod;
  } | null>(null);

  // Modals state
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isNewVersionModalOpen, setIsNewVersionModalOpen] = useState(false);
  const [isPeriodTimeModalOpen, setIsPeriodTimeModalOpen] = useState(false);
  const [isColorConfigModalOpen, setIsColorConfigModalOpen] = useState(false);
  const [isExcelImportModalOpen, setIsExcelImportModalOpen] = useState(false);

  // Version history deletion state
  const [versionToDelete, setVersionToDelete] = useState<TimetableVersion | null>(null);
  const [isDeletingVersion, setIsDeletingVersion] = useState(false);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null);

  // New version form state
  const [newVersionName, setNewVersionName] = useState('');
  const [newVersionSemester, setNewVersionSemester] = useState<'HK1' | 'HK2'>('HK1');
  const [newVersionValidFrom, setNewVersionValidFrom] = useState(
    new Date().toLocaleDateString('vi-VN')
  );

  // Quick edit period state in modal (Teacher only)
  const [editSubject, setEditSubject] = useState('');
  const [editNote, setEditNote] = useState('');

  // Persistence and Apply Now state
  const [isSaving, setIsSaving] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isConfirmApplyOpen, setIsConfirmApplyOpen] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const currentRole = propCurrentUserRole || authService.getCurrentUser().role;
  const isTeacher = currentRole === 'TEACHER' || canManageTimetable === true;

  // Fallback safe active timetable version
  const currentVersion: TimetableVersion =
    propCurrentVersion ||
    propTimetable ||
    academicService.getActiveTimetable(currentRole) || {
      id: 'tkb-default',
      versionName: 'Thời khóa biểu Chính thức (Học kỳ I)',
      semester: 'HK1',
      validFrom: '15/09/2025',
      isActive: true,
      schedule: []
    };

  const historyVersions: TimetableVersion[] =
    propHistoryVersions || academicService.getTimetableHistory() || [currentVersion];

  const subjectColors = academicService.getSubjectColors() || {};
  const periodTimes = academicService.getPeriodTimes() || { morning: [], afternoon: [] };
  const subjectsList = classService.getSubjects();

  const versionNameDisplay =
    currentVersion.versionName || (currentVersion as any).name || 'Thời khóa biểu áp dụng';

  // Helper to normalize any schedule representation into standard DayTimetable[]
  const normalizedSchedule = React.useMemo(() => {
    const raw = currentVersion?.schedule;
    if (!raw) return [];
    if (Array.isArray(raw)) {
      return raw.map((item: any, idx: number) => ({
        dayOfWeek: item?.dayOfWeek || DAYS[idx] || `Thứ ${idx + 2}`,
        morningPeriods: Array.isArray(item?.morningPeriods) ? item.morningPeriods : [],
        afternoonPeriods: Array.isArray(item?.afternoonPeriods) ? item.afternoonPeriods : []
      }));
    }
    if (typeof raw === 'object') {
      if (Array.isArray((raw as any).days)) return (raw as any).days;
      if (Array.isArray((raw as any).schedule)) return (raw as any).schedule;
      const dayKeyMap: Record<string, string> = {
        'T2': 'Thứ 2', 'T3': 'Thứ 3', 'T4': 'Thứ 4', 'T5': 'Thứ 5', 'T6': 'Thứ 6', 'T7': 'Thứ 7',
        'Thứ 2': 'Thứ 2', 'Thứ 3': 'Thứ 3', 'Thứ 4': 'Thứ 4', 'Thứ 5': 'Thứ 5', 'Thứ 6': 'Thứ 6', 'Thứ 7': 'Thứ 7',
        '2': 'Thứ 2', '3': 'Thứ 3', '4': 'Thứ 4', '5': 'Thứ 5', '6': 'Thứ 6', '7': 'Thứ 7'
      };
      return DAYS.map(dayName => {
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
    return [];
  }, [currentVersion]);

  // Helper to find a period safely
  const getPeriod = (
    dayOfWeek: string,
    session: 'morning' | 'afternoon',
    periodNum: number
  ): TimetablePeriod | undefined => {
    if (!normalizedSchedule || !Array.isArray(normalizedSchedule)) return undefined;
    const day = normalizedSchedule.find(d => d.dayOfWeek === dayOfWeek);
    if (!day) return undefined;
    const list = session === 'morning' ? day.morningPeriods : day.afternoonPeriods;
    return (list || []).find(p => p && p.period === periodNum);
  };

  const handleOpenSlot = (dayOfWeek: string, session: 'morning' | 'afternoon', periodNum: number) => {
    const period = getPeriod(dayOfWeek, session, periodNum);
    setSelectedSlot({
      dayOfWeek,
      session,
      periodNum,
      periodData: period
    });

    setEditSubject(period?.subject || '');
    setEditNote(period?.note || '');
  };

  const isAppliedStatus = React.useMemo(() => {
    return academicService.isTimetableApplied();
  }, [currentVersion]);

  const showFeedback = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotificationMsg({ type, text });
    setTimeout(() => setNotificationMsg(null), 4000);
  };

  const handleSaveWorkingTimetable = async () => {
    if (!isTeacher) return;
    setIsSaving(true);
    try {
      const res = await academicService.saveWorkingTimetable();
      showFeedback(res.message || 'Đã lưu thời khóa biểu thành công. Bản làm việc đã được lưu trữ an toàn trên hệ thống.', 'success');
      if (onRefresh) onRefresh();
    } catch (err: any) {
      showFeedback('Lỗi khi lưu thời khóa biểu: ' + (err?.message || 'Không thể lưu'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmApply = async () => {
    if (!isTeacher) return;
    setIsApplying(true);
    try {
      const res = await academicService.applyTimetableNow();
      setIsConfirmApplyOpen(false);
      showFeedback(res.message || 'Đã áp dụng thời khóa biểu. Học viên và Phụ huynh của lớp đã được thông báo.', 'success');
      if (onRefresh) onRefresh();
    } catch (err: any) {
      showFeedback('Lỗi khi áp dụng thời khóa biểu: ' + (err?.message || 'Thao tác thất bại'), 'error');
    } finally {
      setIsApplying(false);
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await academicService.fetchTimetableFromServer();
      showFeedback('Đã làm mới và đồng bộ thời khóa biểu từ máy chủ lưu trữ.', 'info');
      if (onRefresh) onRefresh();
    } catch {
      showFeedback('Không thể kết nối đến máy chủ để đồng bộ.', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSaveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !isTeacher) return;

    await academicService.updateTimetableSlot(
      selectedSlot.dayOfWeek,
      selectedSlot.session,
      selectedSlot.periodNum,
      {
        subject: editSubject.trim(),
        note: editNote.trim()
      }
    );

    setSelectedSlot(null);
    showFeedback('Đã lưu tiết học vào bản làm việc. Nhấn "Lưu" để lưu trữ hoặc "Áp dụng ngay" khi muốn công bố cho HS & PH.', 'info');
    if (onRefresh) onRefresh();
  };

  const handleCreateNewVersion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVersionName.trim()) return;

    academicService.createTimetableVersion(
      newVersionName.trim(),
      newVersionSemester,
      newVersionValidFrom,
      JSON.parse(JSON.stringify(normalizedSchedule))
    );

    setIsNewVersionModalOpen(false);
    setNewVersionName('');
    if (onRefresh) onRefresh();
  };

  const handleActivateVersion = (versionId: string) => {
    academicService.activateTimetableVersion(versionId);
    setIsHistoryModalOpen(false);
    if (onRefresh) onRefresh();
  };

  const handleConfirmDeleteVersion = async () => {
    if (!versionToDelete) return;
    setIsDeletingVersion(true);
    setDeleteErrorMessage(null);

    try {
      const res = await academicService.deleteTimetableHistoryVersion(versionToDelete.id);
      if (!res.success) {
        setDeleteErrorMessage(res.message || 'Không thể xóa bản ghi lịch sử.');
        setIsDeletingVersion(false);
        return;
      }

      setNotificationMsg({
        type: 'success',
        text: res.message || 'Đã xóa bản ghi lịch sử thành công.'
      });
      setTimeout(() => setNotificationMsg(null), 3500);

      setVersionToDelete(null);
      setIsDeletingVersion(false);

      if (onRefresh) {
        onRefresh();
      }
    } catch (err: any) {
      setDeleteErrorMessage(err?.message || 'Đã xảy ra lỗi ngoài dự kiến khi xóa bản ghi.');
      setIsDeletingVersion(false);
    }
  };

  const handleExportExcel = () => {
    exportService.exportTimetableToExcel(currentVersion);
  };

  const handlePrint = () => {
    window.print();
  };

  // Helper for subject pastel styles
  const getSubjectStyle = (subjectName?: string) => {
    if (!subjectName || subjectName.trim() === '') {
      return {
        bg: 'bg-slate-50/50',
        border: 'border-slate-200/80',
        text: 'text-slate-400'
      };
    }
    const found = subjectColors[subjectName.trim()];
    if (found) {
      return {
        bg: found.bg,
        border: found.border,
        text: found.text
      };
    }
    return {
      bg: 'bg-blue-50/70',
      border: 'border-blue-200',
      text: 'text-blue-900 font-bold'
    };
  };

  return (
    <div className="space-y-4">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Version Info Badge */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-2xs">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                  {versionNameDisplay}
                </h2>
                {isTeacher ? (
                  isAppliedStatus ? (
                    <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Đang áp dụng chính thức
                    </span>
                  ) : (
                    <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 text-amber-600" /> Bản làm việc (Chưa áp dụng cho HS/PH)
                    </span>
                  )
                ) : (
                  <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Đang áp dụng chính thức
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Học kỳ: <span className="font-bold text-slate-700">{currentVersion.semester || 'HK1'}</span> • Áp dụng từ:{' '}
                <span className="font-bold text-slate-700">{currentVersion.validFrom || 'Học kỳ này'}</span>
                {currentVersion.appliedAt && (
                  <span> • Áp dụng lúc: <span className="font-semibold text-slate-600">{new Date(currentVersion.appliedAt).toLocaleDateString('vi-VN')}</span></span>
                )}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Primary Workflow Buttons for GVCN: Lưu & Áp dụng ngay */}
            {isTeacher && (
              <>
                <button
                  type="button"
                  onClick={handleSaveWorkingTimetable}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 rounded-xl border border-blue-300 bg-blue-50 px-3.5 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-all shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50"
                  title="Lưu thời khóa biểu vào hệ thống (Bản làm việc / DRAFT)"
                >
                  <Save className="h-3.5 w-3.5 text-blue-600" />
                  <span>{isSaving ? 'Đang lưu...' : 'Lưu'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsConfirmApplyOpen(true)}
                  disabled={isApplying}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                  title="Áp dụng ngay thời khóa biểu cho Học viên và Phụ huynh của lớp"
                >
                  <CheckCheck className="h-4 w-4" />
                  <span>{isApplying ? 'Đang áp dụng...' : 'Áp dụng ngay'}</span>
                </button>
              </>
            )}

            {/* Import Excel (Teacher Only) */}
            {isTeacher && (
              <button
                type="button"
                onClick={() => setIsExcelImportModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50/80 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-all shadow-2xs cursor-pointer"
                title="Nhập thời khóa biểu từ file Excel và tải file mẫu"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Nhập Excel</span>
              </button>
            )}

            {/* Subject Color Configuration (Teacher Only) */}
            {isTeacher && (
              <button
                type="button"
                onClick={() => setIsColorConfigModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                title="Tùy chỉnh màu pastel cho các môn học"
              >
                <Palette className="h-3.5 w-3.5 text-purple-600" />
                <span className="hidden md:inline">Màu môn</span>
              </button>
            )}

            {/* Period Times Config (Teacher Only) */}
            {isTeacher && (
              <button
                type="button"
                onClick={() => setIsPeriodTimeModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                title="Cấu hình khung giờ tiết học"
              >
                <Clock className="h-3.5 w-3.5 text-indigo-600" />
                <span className="hidden md:inline">Khung giờ</span>
              </button>
            )}

            {/* Version History Button */}
            <button
              type="button"
              onClick={() => setIsHistoryModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            >
              <History className="h-3.5 w-3.5 text-slate-500" />
              <span>Lịch sử ({historyVersions.length})</span>
            </button>

            {/* Create New Version Button (Teacher Only) */}
            {isTeacher && (
              <button
                type="button"
                onClick={() => setIsNewVersionModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Tạo bản mới</span>
              </button>
            )}

            {/* Refresh / Sync from Server */}
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50"
              title="Làm mới và đồng bộ từ máy chủ"
            >
              <RefreshCw className={`h-4 w-4 text-blue-600 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>

            {/* Export & Print */}
            <button
              type="button"
              onClick={handleExportExcel}
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
              title="Xuất file Excel TKB"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
              title="In thời khóa biểu"
            >
              <Printer className="h-4 w-4 text-slate-600" />
            </button>
          </div>
        </div>

        {/* Informational banner when working copy is modified but not applied yet */}
        {isTeacher && !isAppliedStatus && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/90 p-3.5 text-xs text-amber-900 shadow-2xs animate-fade-in">
            <div className="flex items-start sm:items-center gap-2.5">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
              <span>
                <strong>Bản làm việc có thay đổi chưa áp dụng:</strong> Học viên và Phụ huynh hiện vẫn đang xem phiên bản đã áp dụng trước đó. Nhấn <strong>"Áp dụng ngay"</strong> để chính thức công bố bản mới này cho lớp.
              </span>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <button
                type="button"
                onClick={handleSaveWorkingTimetable}
                disabled={isSaving}
                className="rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100 transition-colors cursor-pointer"
              >
                {isSaving ? 'Đang lưu...' : 'Lưu lại'}
              </button>
              <button
                type="button"
                onClick={() => setIsConfirmApplyOpen(true)}
                disabled={isApplying}
                className="rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-2xs transition-all cursor-pointer flex items-center gap-1"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span>Áp dụng ngay</span>
              </button>
            </div>
          </div>
        )}

        {/* Mobile Day Selector (hidden on lg) */}
        <div className="flex items-center gap-1 overflow-x-auto lg:hidden pt-2 border-t border-slate-100">
          {DAYS.map(day => (
            <button
              key={day}
              type="button"
              onClick={() => setSelectedMobileDay(day)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedMobileDay === day
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {day}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Desktop Timetable Grid (Simplified: Subject ONLY, High-Contrast Pastel) */}
      <div className="hidden lg:block space-y-6">
        {/* ================= MORNING SESSION ================= */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          {/* Morning Header */}
          <div className="flex items-center justify-between border-b border-slate-200 bg-amber-50/60 px-5 py-3">
            <div className="flex items-center gap-2">
              <span className="text-base">☀️</span>
              <h3 className="text-xs font-black uppercase tracking-wider text-amber-950">
                BUỔI SÁNG (TIẾT 1 - 5)
              </h3>
            </div>
            <span className="text-[11px] font-bold text-amber-800">
              07:00 — 11:15
            </span>
          </div>

          <table className="w-full border-collapse text-left text-xs bg-white table-fixed">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-extrabold uppercase text-slate-700">
                <th className="w-24 p-3 text-center border-r border-slate-200">Tiết / Giờ</th>
                {DAYS.map(day => (
                  <th key={day} className="p-3 text-center border-r last:border-r-0 border-slate-200">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {periodTimes.morning.map(cfg => {
                const pNum = cfg.period;
                const timeStr = `${cfg.startTime} - ${cfg.endTime}`;

                return (
                  <tr key={`morning-p-${pNum}`} className="divide-x divide-slate-100">
                    {/* Period Column */}
                    <td className="p-2.5 text-center bg-slate-50/50 font-bold border-r border-slate-200">
                      <div className="text-xs font-black text-slate-900">Tiết {pNum}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{timeStr}</div>
                    </td>

                    {/* Days Columns - SUBJECT ONLY */}
                    {DAYS.map(day => {
                      const period = getPeriod(day, 'morning', pNum);
                      const style = getSubjectStyle(period?.subject);
                      const hasSubject = !!(period?.subject && period.subject.trim());

                      return (
                        <td
                          key={`morning-${day}-${pNum}`}
                          onClick={() => handleOpenSlot(day, 'morning', pNum)}
                          className={`p-1.5 transition-all cursor-pointer relative group ${
                            hasSubject ? 'hover:brightness-95' : 'hover:bg-slate-50/80'
                          }`}
                        >
                          {hasSubject ? (
                            <div className={`h-full min-h-[52px] rounded-xl border p-2 flex items-center justify-center text-center transition-all ${style.bg} ${style.border} shadow-2xs`}>
                              <span className={`text-xs font-black leading-snug tracking-tight ${style.text}`}>
                                {period?.subject}
                              </span>
                              {isTeacher && (
                                <Edit2 className="h-3 w-3 text-slate-400 absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                              )}
                            </div>
                          ) : (
                            <div className="h-full min-h-[52px] rounded-xl border border-dashed border-slate-200 p-2 flex items-center justify-center text-slate-300 group-hover:border-blue-300 group-hover:text-blue-400 transition-colors">
                              {isTeacher ? <span className="text-[11px] font-medium">+ Thêm</span> : <span className="text-[10px]">-</span>}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ================= AFTERNOON SESSION ================= */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          {/* Afternoon Header */}
          <div className="flex items-center justify-between border-b border-slate-200 bg-sky-50/60 px-5 py-3">
            <div className="flex items-center gap-2">
              <span className="text-base">🌤️</span>
              <h3 className="text-xs font-black uppercase tracking-wider text-sky-950">
                BUỔI CHIỀU (TIẾT 1 - 5)
              </h3>
            </div>
            <span className="text-[11px] font-bold text-sky-800">
              13:30 — 17:45
            </span>
          </div>

          <table className="w-full border-collapse text-left text-xs bg-white table-fixed">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-extrabold uppercase text-slate-700">
                <th className="w-24 p-3 text-center border-r border-slate-200">Tiết / Giờ</th>
                {DAYS.map(day => (
                  <th key={day} className="p-3 text-center border-r last:border-r-0 border-slate-200">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {periodTimes.afternoon.map(cfg => {
                const pNum = cfg.period;
                const timeStr = `${cfg.startTime} - ${cfg.endTime}`;

                return (
                  <tr key={`afternoon-p-${pNum}`} className="divide-x divide-slate-100">
                    {/* Period Column */}
                    <td className="p-2.5 text-center bg-slate-50/50 font-bold border-r border-slate-200">
                      <div className="text-xs font-black text-slate-900">Tiết {pNum}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{timeStr}</div>
                    </td>

                    {/* Days Columns - SUBJECT ONLY */}
                    {DAYS.map(day => {
                      const period = getPeriod(day, 'afternoon', pNum);
                      const style = getSubjectStyle(period?.subject);
                      const hasSubject = !!(period?.subject && period.subject.trim());

                      return (
                        <td
                          key={`afternoon-${day}-${pNum}`}
                          onClick={() => handleOpenSlot(day, 'afternoon', pNum)}
                          className={`p-1.5 transition-all cursor-pointer relative group ${
                            hasSubject ? 'hover:brightness-95' : 'hover:bg-slate-50/80'
                          }`}
                        >
                          {hasSubject ? (
                            <div className={`h-full min-h-[52px] rounded-xl border p-2 flex items-center justify-center text-center transition-all ${style.bg} ${style.border} shadow-2xs`}>
                              <span className={`text-xs font-black leading-snug tracking-tight ${style.text}`}>
                                {period?.subject}
                              </span>
                              {isTeacher && (
                                <Edit2 className="h-3 w-3 text-slate-400 absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                              )}
                            </div>
                          ) : (
                            <div className="h-full min-h-[52px] rounded-xl border border-dashed border-slate-200 p-2 flex items-center justify-center text-slate-300 group-hover:border-blue-300 group-hover:text-blue-400 transition-colors">
                              {isTeacher ? <span className="text-[11px] font-medium">+ Thêm</span> : <span className="text-[10px]">-</span>}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Mobile View (Card List per selected Day - Simplified) */}
      <div className="block lg:hidden space-y-4">
        {/* Morning */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-black text-amber-950 uppercase">☀️ BUỔI SÁNG — {selectedMobileDay}</span>
            <span className="text-[10px] text-slate-400 font-mono">07:00 - 11:15</span>
          </div>

          <div className="space-y-2">
            {periodTimes.morning.map(cfg => {
              const pNum = cfg.period;
              const period = getPeriod(selectedMobileDay, 'morning', pNum);
              const style = getSubjectStyle(period?.subject);
              const hasSubject = !!(period?.subject && period.subject.trim());

              return (
                <div
                  key={`mob-m-${pNum}`}
                  onClick={() => handleOpenSlot(selectedMobileDay, 'morning', pNum)}
                  className={`flex items-center justify-between rounded-xl border p-3 cursor-pointer transition-all ${
                    hasSubject ? `${style.bg} ${style.border}` : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-center font-bold min-w-[50px]">
                      <div className="text-xs text-slate-800">Tiết {pNum}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{cfg.startTime}</div>
                    </div>
                    <div>
                      <div className={`text-xs font-black ${hasSubject ? style.text : 'text-slate-400'}`}>
                        {hasSubject ? period?.subject : '(Trống)'}
                      </div>
                      {period?.note && (
                        <div className="text-[10px] text-slate-500">
                          {period.note}
                        </div>
                      )}
                    </div>
                  </div>
                  {isTeacher && <Edit2 className="h-3.5 w-3.5 text-slate-400" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Afternoon */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-black text-sky-950 uppercase">🌤️ BUỔI CHIỀU — {selectedMobileDay}</span>
            <span className="text-[10px] text-slate-400 font-mono">13:30 - 17:45</span>
          </div>

          <div className="space-y-2">
            {periodTimes.afternoon.map(cfg => {
              const pNum = cfg.period;
              const period = getPeriod(selectedMobileDay, 'afternoon', pNum);
              const style = getSubjectStyle(period?.subject);
              const hasSubject = !!(period?.subject && period.subject.trim());

              return (
                <div
                  key={`mob-a-${pNum}`}
                  onClick={() => handleOpenSlot(selectedMobileDay, 'afternoon', pNum)}
                  className={`flex items-center justify-between rounded-xl border p-3 cursor-pointer transition-all ${
                    hasSubject ? `${style.bg} ${style.border}` : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-center font-bold min-w-[50px]">
                      <div className="text-xs text-slate-800">Tiết {pNum}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{cfg.startTime}</div>
                    </div>
                    <div>
                      <div className={`text-xs font-black ${hasSubject ? style.text : 'text-slate-400'}`}>
                        {hasSubject ? period?.subject : '(Trống)'}
                      </div>
                      {period?.note && (
                        <div className="text-[10px] text-slate-500">
                          {period.note}
                        </div>
                      )}
                    </div>
                  </div>
                  {isTeacher && <Edit2 className="h-3.5 w-3.5 text-slate-400" />}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Slot Detail / Quick Edit Modal */}
      {selectedSlot && (
        <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="relative flex w-full max-w-md flex-col rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white shadow-2xs">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">
                    {selectedSlot.dayOfWeek} • {selectedSlot.session === 'morning' ? 'Buổi Sáng' : 'Buổi Chiều'} (Tiết {selectedSlot.periodNum})
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {isTeacher ? 'Chỉnh sửa môn học tiết này' : 'Chi tiết tiết học'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSlot(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content: Form if Teacher, View if Student/Parent */}
            {isTeacher ? (
              <form onSubmit={handleSaveSlot} className="p-6 space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-black text-slate-800 uppercase tracking-tight block">
                    CHỌN HOẶC NHẬP MÔN HỌC
                  </label>
                  <select
                    value={editSubject}
                    onChange={e => setEditSubject(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-bold focus:border-blue-500 focus:outline-hidden"
                  >
                    <option value="">-- (Để trống / Không có tiết) --</option>
                    <option value="Chào cờ">Chào cờ</option>
                    <option value="Sinh hoạt lớp">Sinh hoạt lớp</option>
                    <option value="Hoạt động trải nghiệm">Hoạt động trải nghiệm</option>
                    {subjectsList.map(s => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Hoặc nhập môn tự do</label>
                  <input
                    type="text"
                    value={editSubject}
                    onChange={e => setEditSubject(e.target.value)}
                    placeholder="VD: Toán học, Ôn thi HSG, Tự chọn..."
                    className="w-full rounded-xl border border-slate-300 bg-white p-2 text-xs font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Ghi chú tiết học (tùy chọn)</label>
                  <input
                    type="text"
                    value={editNote}
                    onChange={e => setEditNote(e.target.value)}
                    placeholder="VD: Học tại phòng Lab, kiểm tra đầu giờ..."
                    className="w-full rounded-xl border border-slate-300 bg-white p-2 text-xs"
                  />
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setEditSubject('');
                      setEditNote('');
                    }}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
                  >
                    Xóa môn tiết này
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedSlot(null)}
                      className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 active:scale-95 transition-all cursor-pointer"
                    >
                      <Check className="h-4 w-4" />
                      <span>Lưu tiết học</span>
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <div className="p-6 space-y-4 text-xs">
                <div className="rounded-2xl bg-blue-50/70 p-4 border border-blue-200 text-center">
                  <span className="text-[10px] font-bold text-blue-700 uppercase block">Môn học</span>
                  <div className="text-base font-black text-blue-950 mt-0.5">
                    {selectedSlot.periodData?.subject || 'Chưa có tiết học'}
                  </div>
                  {selectedSlot.periodData?.note && (
                    <div className="text-xs text-slate-600 mt-2 font-medium bg-white/80 p-2 rounded-xl border border-blue-100">
                      Ghi chú: {selectedSlot.periodData.note}
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSelectedSlot(null)}
                    className="rounded-xl bg-slate-200 px-5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-300 cursor-pointer"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. Version History Modal */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="relative flex max-h-[85vh] w-full max-w-lg flex-col rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-700 text-white shadow-2xs">
                  <History className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">
                    LỊCH SỬ CÁC PHIÊN BẢN THỜI KHÓA BIỂU
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Tổng số {historyVersions.length} phiên bản đã lưu trong hệ thống
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="overflow-y-auto p-6 space-y-3 text-xs divide-y divide-slate-100">
              {historyVersions.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  Chưa có bản ghi lịch sử nào được lưu.
                </div>
              ) : (
                historyVersions.map(ver => {
                  const isActive = ver.id === currentVersion.id;
                  const vName = ver.versionName || (ver as any).name || 'Thời khóa biểu';

                  return (
                    <div key={ver.id} className="pt-3 first:pt-0 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-slate-900 truncate">{vName}</span>
                          {isActive && (
                            <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                              Đang áp dụng
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                          <span>Áp dụng từ: <strong className="text-slate-600">{ver.validFrom}</strong></span>
                          <span>•</span>
                          <span>Học kỳ: <strong className="text-slate-600">{ver.semester}</strong></span>
                          <span className="font-mono text-slate-400 text-[9px]">(ID: {ver.id})</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isTeacher && !isActive && (
                          <button
                            type="button"
                            onClick={() => handleActivateVersion(ver.id)}
                            className="rounded-xl border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
                          >
                            Kích hoạt
                          </button>
                        )}

                        {isTeacher && (
                          <button
                            type="button"
                            onClick={() => {
                              setVersionToDelete(ver);
                              setDeleteErrorMessage(null);
                            }}
                            className="flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100 hover:border-rose-300 transition-colors cursor-pointer"
                            title="Xóa bản ghi lịch sử này"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Xóa</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-6 py-3">
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="rounded-xl bg-slate-200 px-4 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-300 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Delete Single Timetable History Record */}
      {versionToDelete && (
        <div className="fixed inset-0 z-toast flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="relative flex w-full max-w-md flex-col rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-rose-100 bg-rose-50/80 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-600 text-white shadow-2xs">
                  <Trash2 className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-rose-950 uppercase tracking-tight">
                    XÁC NHẬN XÓA BẢN GHI LỊCH SỬ
                  </h3>
                  <p className="text-[11px] text-rose-700">
                    Xóa 01 bản ghi phiên bản khỏi lịch sử thời khóa biểu
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isDeletingVersion) {
                    setVersionToDelete(null);
                    setDeleteErrorMessage(null);
                  }
                }}
                disabled={isDeletingVersion}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 cursor-pointer disabled:opacity-40"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 text-xs">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 space-y-2">
                <div className="text-slate-500 font-medium">Bản ghi được chọn để xóa:</div>
                <div className="font-extrabold text-slate-900 text-sm">
                  {versionToDelete.versionName || (versionToDelete as any).name || 'Thời khóa biểu'}
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-200 text-slate-600">
                  <div>Áp dụng từ: <strong>{versionToDelete.validFrom}</strong></div>
                  <div>Học kỳ: <strong>{versionToDelete.semester}</strong></div>
                  <div className="col-span-2 text-slate-400 font-mono text-[10px]">
                    Mã bản ghi (ID): {versionToDelete.id}
                  </div>
                </div>
              </div>

              {versionToDelete.id === currentVersion.id && (
                <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3 text-amber-800 text-[11px]">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <strong>Lưu ý:</strong> Bản ghi này có cùng mã định danh với TKB đang sử dụng. Thao tác xóa sẽ <strong>chỉ xóa bản ghi này khỏi danh sách lịch sử</strong>; thời khóa biểu đang áp dụng của lớp vẫn được bảo toàn nguyên vẹn 100%.
                  </div>
                </div>
              )}

              <p className="text-slate-600 text-[11px]">
                Bạn có chắc chắn muốn xóa bản ghi lịch sử này không? Các bản ghi lịch sử khác và thời khóa biểu đang áp dụng sẽ không bị thay đổi.
              </p>

              {deleteErrorMessage && (
                <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-rose-700 text-xs font-semibold">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{deleteErrorMessage}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2.5 border-t border-slate-200 bg-slate-50 px-6 py-3.5">
              <button
                type="button"
                onClick={() => {
                  setVersionToDelete(null);
                  setDeleteErrorMessage(null);
                }}
                disabled={isDeletingVersion}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteVersion}
                disabled={isDeletingVersion}
                className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 active:scale-95 transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isDeletingVersion ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Đang xóa...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Xác nhận xóa</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Create New Version Modal */}
      {isNewVersionModalOpen && (
        <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="relative flex w-full max-w-md flex-col rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 bg-blue-50 px-6 py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white shadow-2xs">
                  <Plus className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-blue-950 uppercase tracking-tight">
                    TẠO PHIÊN BẢN THỜI KHÓA BIỂU MỚI
                  </h3>
                  <p className="text-[11px] text-blue-800">
                    Kế thừa toàn bộ dữ liệu từ bản hiện tại và cho phép điều chỉnh
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewVersionModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewVersion} className="p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-black text-slate-800 uppercase tracking-tight block">
                  TÊN PHIÊN BẢN <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newVersionName}
                  onChange={e => setNewVersionName(e.target.value)}
                  placeholder="VD: Thời khóa biểu Học kỳ II (Áp dụng từ tuần 20)..."
                  className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-bold focus:border-blue-500 focus:outline-hidden"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Học kỳ</label>
                  <select
                    value={newVersionSemester}
                    onChange={e => setNewVersionSemester(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 p-2 text-xs font-bold"
                  >
                    <option value="HK1">Học kỳ I</option>
                    <option value="HK2">Học kỳ II</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Ngày áp dụng</label>
                  <input
                    type="text"
                    value={newVersionValidFrom}
                    onChange={e => setNewVersionValidFrom(e.target.value)}
                    placeholder="DD/MM/YYYY"
                    className="w-full rounded-xl border border-slate-300 bg-white p-2 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewVersionModalOpen(false)}
                  className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 active:scale-95 transition-all cursor-pointer"
                >
                  <Check className="h-4 w-4" />
                  <span>Tạo và áp dụng ngay</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Period Time Modal */}
      <PeriodTimeModal
        isOpen={isPeriodTimeModalOpen}
        onClose={() => setIsPeriodTimeModalOpen(false)}
        onSuccess={onRefresh}
      />

      {/* 8. Subject Color Config Modal */}
      {isColorConfigModalOpen && (
        <SubjectColorConfigModal
          onClose={() => setIsColorConfigModalOpen(false)}
          onRefresh={onRefresh || (() => {})}
        />
      )}

      {/* 9. Excel Import Modal */}
      <TimetableExcelImportModal
        isOpen={isExcelImportModalOpen}
        onClose={() => setIsExcelImportModalOpen(false)}
        onSuccess={() => {
          setIsExcelImportModalOpen(false);
          if (onRefresh) onRefresh();
        }}
      />

      {/* 10. Confirm Apply Timetable Modal */}
      {isConfirmApplyOpen && (
        <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="relative flex w-full max-w-md flex-col rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 bg-emerald-50 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-2xs">
                  <CheckCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                    Áp dụng thời khóa biểu ngay
                  </h3>
                  <p className="text-[11px] text-emerald-800 font-medium">
                    Công bố chính thức cho Học viên và Phụ huynh
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsConfirmApplyOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-emerald-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-3.5 text-xs text-slate-600">
              <p className="leading-relaxed text-slate-800">
                Bạn đang chuẩn bị <strong className="text-emerald-700">công bố & áp dụng thời khóa biểu này</strong> cho lớp học:
              </p>
              <ul className="list-disc pl-5 space-y-2 font-medium text-slate-700">
                <li>
                  Phiên bản này sẽ ngay lập tức thay thế bản công bố cũ, trở thành thời khóa biểu chính thức được nhìn thấy bởi <strong>Học viên</strong> và <strong>Phụ huynh</strong>.
                </li>
                <li>
                  Hệ thống tự động gửi thông báo đến đúng thành viên của lớp.
                </li>
                <li>
                  Dữ liệu các lớp khác và tài khoản khác được giữ nguyên vẹn.
                </li>
              </ul>
              <div className="rounded-xl bg-amber-50 p-3 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <span>Vui lòng kiểm tra kỹ các tiết học trước khi áp dụng chính thức.</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-6 py-4">
              <button
                type="button"
                onClick={() => setIsConfirmApplyOpen(false)}
                className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmApply}
                disabled={isApplying}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                <CheckCheck className="h-4 w-4" />
                <span>{isApplying ? 'Đang xử lý...' : 'Xác nhận áp dụng ngay'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 11. Toast Feedback */}
      {notificationMsg && (
        <div
          className={`fixed top-20 right-4 z-toast flex items-center gap-2.5 rounded-2xl px-4 py-3 text-xs font-bold text-white shadow-2xl animate-fade-in ${
            notificationMsg.type === 'error'
              ? 'bg-rose-600'
              : notificationMsg.type === 'info'
              ? 'bg-blue-600'
              : 'bg-emerald-700'
          }`}
        >
          {notificationMsg.type === 'error' ? (
            <AlertCircle className="h-4 w-4 text-white" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-white" />
          )}
          <span>{notificationMsg.text}</span>
        </div>
      )}
    </div>
  );
};
