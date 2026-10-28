/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Sparkles,
  Calendar,
  Copy,
  Check,
  FileText,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Users,
  Award,
  BookOpen,
  CalendarDays,
  Save,
  ChevronDown,
  X,
  Scale,
  UserCheck,
  PhoneCall,
  Edit2,
  Plus,
  ArrowDownToLine
} from 'lucide-react';
import {
  classAnalyticsAndAlertService,
  WeeklyClassSummary,
  MonthlyClassSummary,
  SemesterClassSummary
} from '../../services/ClassAnalyticsAndAlertService';
import { aiService } from '../../services/AIService';
import { studentService } from '../../services/StudentService';
import { classService } from '../../services/ClassService';
import { trainingService } from '../../services/TrainingService';
import { SchoolYearDateNormalizer } from '../../services/SchoolYearDateNormalizer';
import { UserRole, Student, ViolationHandlingRecord, ViolationHandlingStatus } from '../../types';

const VIOLATION_CATEGORIES_LIST = [
  'Nề nếp & Tác phong',
  'Chuyên cần / Đi muộn / Vắng học',
  'Học tập / Không thuộc bài / Thiếu bài tập',
  'Kỷ luật / Làm việc riêng / Mất trật tự',
  'Sử dụng điện thoại / Thiết bị trái phép',
  'Đạo đức / Ứng xử / Bất kính',
  'Bảo vệ tài sản / Vệ sinh chung',
  'Khác'
];

const SEVERITY_LIST = ['Nhẹ', 'Vừa', 'Nặng', 'Nghiêm trọng'];

interface HomeroomCareAndWeeklySummaryProps {
  currentUserRole: UserRole;
  onOpenAIWithStudent?: (studentId: string) => void;
  onNavigate?: (module: string, params?: Record<string, any>) => void;
}

export const HomeroomCareAndWeeklySummary: React.FC<HomeroomCareAndWeeklySummaryProps> = ({
  currentUserRole,
  onNavigate
}) => {
  const isTeacherOrAdmin = currentUserRole === 'TEACHER' || (currentUserRole as any) === 'SUPER_ADMIN';

  // Sub-tabs for NHÓM 2: TỔNG KẾT
  const [summaryTab, setSummaryTab] = useState<'week' | 'month' | 'semester'>('week');

  // Study period / Weeks info
  const { currentWeekNum, allWeeks } = useMemo(() => classAnalyticsAndAlertService.getCurrentWeekInfo(), []);
  const [selectedWeekNum, setSelectedWeekNum] = useState<number>(currentWeekNum);

  // Month & Semester selectors
  const availableMonths = useMemo(() => {
    const today = new Date();
    const curYear = today.getFullYear();
    return [
      { id: `09/${curYear}`, label: `Tháng 09/${curYear}` },
      { id: `10/${curYear}`, label: `Tháng 10/${curYear}` },
      { id: `11/${curYear}`, label: `Tháng 11/${curYear}` },
      { id: `12/${curYear}`, label: `Tháng 12/${curYear}` },
      { id: `01/${curYear + 1}`, label: `Tháng 01/${curYear + 1}` },
      { id: `02/${curYear + 1}`, label: `Tháng 02/${curYear + 1}` },
      { id: `03/${curYear + 1}`, label: `Tháng 03/${curYear + 1}` },
      { id: `04/${curYear + 1}`, label: `Tháng 04/${curYear + 1}` },
      { id: `05/${curYear + 1}`, label: `Tháng 05/${curYear + 1}` }
    ];
  }, []);

  const [selectedMonthYear, setSelectedMonthYear] = useState<string>(() => {
    const today = new Date();
    return `${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
  });

  const [selectedSemester, setSelectedSemester] = useState<'HK1' | 'HK2'>('HK1');

  // Aggregated Data States
  const [weeklySummary, setWeeklySummary] = useState<WeeklyClassSummary>(() =>
    classAnalyticsAndAlertService.getWeeklyClassSummary(currentWeekNum)
  );
  const [monthlySummary, setMonthlySummary] = useState<MonthlyClassSummary>(() =>
    classAnalyticsAndAlertService.getMonthlyClassSummary(selectedMonthYear)
  );
  const [semesterSummary, setSemesterSummary] = useState<SemesterClassSummary>(() =>
    classAnalyticsAndAlertService.getSemesterClassSummary(selectedSemester)
  );

  const [students, setStudents] = useState<Student[]>(() => studentService.getAll());

  // Input States for B (Đánh giá, nhận xét) & C (Phương hướng)
  const [evalText, setEvalText] = useState<string>('');
  const [dirText, setDirText] = useState<string>('');
  const [isCurrentSaved, setIsCurrentSaved] = useState<boolean>(false);
  const [isEditingWeek, setIsEditingWeek] = useState<boolean>(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [isCopiedSummary, setIsCopiedSummary] = useState<boolean>(false);

  // AI Analysis Modal
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiModalTitle, setAiModalTitle] = useState<string>('');
  const [aiResultText, setAiResultText] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState<boolean>(false);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);

  // Reload handler
  const reloadData = () => {
    setStudents(studentService.getAll());
    setWeeklySummary(classAnalyticsAndAlertService.getWeeklyClassSummary(selectedWeekNum));
    setMonthlySummary(classAnalyticsAndAlertService.getMonthlyClassSummary(selectedMonthYear));
    setSemesterSummary(classAnalyticsAndAlertService.getSemesterClassSummary(selectedSemester));
  };

  useEffect(() => {
    const unsubClass = classAnalyticsAndAlertService.subscribe(reloadData);
    const unsubStudent = studentService.subscribe(reloadData);
    reloadData();
    return () => {
      unsubClass();
      unsubStudent();
    };
  }, [selectedWeekNum, selectedMonthYear, selectedSemester]);

  // Load saved evaluation and direction when switching tab/timeframe
  useEffect(() => {
    let currentKey = '';
    if (summaryTab === 'week') currentKey = String(selectedWeekNum);
    else if (summaryTab === 'month') currentKey = selectedMonthYear;
    else if (summaryTab === 'semester') currentKey = selectedSemester;

    const saved = classAnalyticsAndAlertService.getSavedClassSummary(summaryTab, currentKey);
    if (saved) {
      setEvalText(saved.teacherEvaluation || '');
      setDirText(saved.nextDirection || '');
      setIsCurrentSaved(true);
    } else {
      setEvalText('');
      setDirText('');
      setIsCurrentSaved(false);
    }
    setIsEditingWeek(false);
    setSaveSuccessMessage(null);
    setSaveErrorMessage(null);
  }, [summaryTab, selectedWeekNum, selectedMonthYear, selectedSemester]);

  // Detail Modal State: 'WARNING' | 'PROCESSING' | 'RESOLVED' | null
  const [activeDetailModalTab, setActiveDetailModalTab] = useState<'WARNING' | 'PROCESSING' | 'RESOLVED' | null>(null);

  // Handling Modal State
  const [handlingStudent, setHandlingStudent] = useState<Student | null>(null);
  const [handlingExistingRecord, setHandlingExistingRecord] = useState<ViolationHandlingRecord | null>(null);
  const [isHandlingFormModalOpen, setIsHandlingFormModalOpen] = useState<boolean>(false);

  // Form Fields
  const [hDate, setHDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [hContent, setHContent] = useState<string>('');
  const [hCategory, setHCategory] = useState<string>('Nề nếp & Tác phong');
  const [hSeverity, setHSeverity] = useState<string>('Vừa');
  const [hFrequency, setHFrequency] = useState<number>(1);
  const [hEducationalMeasure, setHEducationalMeasure] = useState<string>('');
  const [hStudentExchange, setHStudentExchange] = useState<string>('');
  const [hParentCoordination, setHParentCoordination] = useState<string>('');
  const [hHandlingResult, setHHandlingResult] = useState<string>('');
  const [hStatus, setHStatus] = useState<ViolationHandlingStatus>('PROCESSING');
  const [hTeacherNotes, setHTeacherNotes] = useState<string>('');
  const [hSaveSuccess, setHSaveSuccess] = useState<string | null>(null);

  // Derive NHÓM 1: THEO DÕI VI PHẠM STATS & CHI TIẾT HỌC VIÊN
  const {
    warningCount,
    processingCount,
    resolvedCount,
    warningStudentsList,
    processingStudentsList,
    resolvedStudentsList
  } = useMemo(() => {
    // 1. Get special case students with >= 2 violations in the selected week
    const tracking = classAnalyticsAndAlertService.getTrackingOverviewStats(selectedWeekNum);
    const weekSpecialCases = tracking.specialCases;

    const allStudents = studentService.getAll(true);
    const className = classService.getSettings().className || '11A1';

    // Map studentId -> existing handling record info
    const studentStatusMap = new Map<
      string,
      { status: ViolationHandlingStatus; latestRecord?: ViolationHandlingRecord; records: ViolationHandlingRecord[]; student: Student }
    >();

    allStudents.forEach((s) => {
      const records = s.violationHandlingRecords || [];
      if (records.length > 0) {
        const latest = records[0];
        // Active status of student in general: take latest record
        const activeStatus: ViolationHandlingStatus = latest.status || 'RESOLVED';

        studentStatusMap.set(s.id, {
          status: activeStatus,
          latestRecord: latest,
          records,
          student: s
        });
      }
    });

    const warningStudents: Array<any> = [];
    const processingStudents: Array<any> = [];
    const resolvedStudents: Array<any> = [];
    const handledStudentIds = new Set<string>();

    // Process all students who have >= 2 violations in the selected week
    weekSpecialCases.forEach((sc) => {
      handledStudentIds.add(sc.studentId);
      const student = allStudents.find((s) => s.id === sc.studentId);
      if (!student) return;

      const records = student.violationHandlingRecords || [];
      // Find handling record specifically tied to this week's alert
      const currentWeekRecord = records.find((r) => r.weekNumber === selectedWeekNum) || null;

      // Status for THIS week's alert:
      // If teacher has processed/recorded for this week, respect that status (PROCESSING / RESOLVED / WARNING).
      // If NO record exists for this week yet, it is a fresh active alert: must be WARNING!
      const activeStatus: ViolationHandlingStatus = currentWeekRecord ? currentWeekRecord.status : 'WARNING';

      const item = {
        student,
        studentId: student.id,
        fullName: student.fullName,
        code: student.code,
        group: student.group,
        className: sc.className || className,
        avatar: student.avatar,
        specialCase: sc,
        existingRecord: currentWeekRecord,
        records,
        violationsCount: sc.violationsCount,
        violations: sc.violations.map((v) => ({
          id: v.id,
          date: v.date,
          isoDate: v.isoDate,
          category: v.category || 'Nề nếp',
          reason: v.reason || 'Vi phạm nội quy',
          points: v.points || 0,
          severity: Math.abs(v.points) >= 5 ? 'Nặng' : Math.abs(v.points) >= 2 ? 'Vừa' : 'Nhẹ'
        })),
        activeStatus
      };

      if (activeStatus === 'PROCESSING') {
        processingStudents.push(item);
      } else if (activeStatus === 'RESOLVED') {
        resolvedStudents.push(item);
      } else {
        warningStudents.push(item);
      }
    });

    // Also include students who have handling records outside this week's special cases
    studentStatusMap.forEach(({ status, latestRecord, records, student }, studentId) => {
      if (handledStudentIds.has(studentId)) return;

      const txs = trainingService
        .getAllTransactions()
        .filter((t) => t.studentId === studentId && t.status === 'approved' && t.points < 0);

      const mappedViolations =
        records.length > 0
          ? records.map((r) => ({
              id: r.id,
              date: r.date,
              isoDate: r.date,
              category: r.category,
              reason: r.content,
              points: -2,
              severity: r.severity || 'Vừa'
            }))
          : txs.map((t) => ({
              id: t.id,
              date: t.createdAt || t.date || '',
              isoDate: t.createdAt || t.date || '',
              category: t.category || 'Nề nếp',
              reason: t.reason || t.title || 'Vi phạm nội quy',
              points: t.points,
              severity: Math.abs(t.points) >= 5 ? 'Nặng' : 'Vừa'
            }));

      const item = {
        student,
        studentId: student.id,
        fullName: student.fullName,
        code: student.code,
        group: student.group,
        className,
        avatar: student.avatar,
        existingRecord: latestRecord,
        records,
        violationsCount: mappedViolations.length,
        violations: mappedViolations,
        activeStatus: status
      };

      if (status === 'PROCESSING') {
        processingStudents.push(item);
      } else if (status === 'RESOLVED') {
        resolvedStudents.push(item);
      }
      // Note: If an older record was WARNING, but the student does NOT have >= 2 violations
      // in the currently selected week, they are NOT put into this week's warningStudents list.
    });

    return {
      warningCount: warningStudents.length,
      processingCount: processingStudents.length,
      resolvedCount: resolvedStudents.length,
      warningStudentsList: warningStudents,
      processingStudentsList: processingStudents,
      resolvedStudentsList: resolvedStudents
    };
  }, [students, selectedWeekNum]);

  const handleOpenHandlingForStudent = (item: any) => {
    const student = item.student;
    setHandlingStudent(student);

    const existing = item.existingRecord || null;
    setHandlingExistingRecord(existing);

    if (existing) {
      setHDate(existing.date || new Date().toISOString().split('T')[0]);
      setHContent(existing.content || '');
      setHCategory(existing.category || 'Nề nếp & Tác phong');
      setHSeverity(existing.severity || 'Vừa');
      setHFrequency(existing.frequencyCount || item.violationsCount || 1);
      setHEducationalMeasure(existing.educationalMeasure || '');
      setHStudentExchange(existing.studentExchangeNotes || '');
      setHParentCoordination(existing.parentCoordinationNotes || '');
      setHHandlingResult(existing.handlingResult || '');
      setHStatus(existing.status || 'PROCESSING');
      setHTeacherNotes(existing.teacherNotes || '');
    } else {
      const firstIso = item.violations[0]?.date ? SchoolYearDateNormalizer.toISODateString(item.violations[0].date) : '';
      setHDate(firstIso || new Date().toISOString().split('T')[0]);
      const violationLines = (item.violations || []).map((v: any) => `${v.date} — ${v.reason} (${v.category})`).join('; ');
      setHContent(violationLines ? `Vi phạm tuần ${selectedWeekNum} (${item.violationsCount} lượt): ${violationLines}` : `Vi phạm nội quy tuần ${selectedWeekNum}`);
      setHCategory(item.violations[0]?.category || 'Nề nếp & Tác phong');
      setHSeverity(item.violations.some((v: any) => Math.abs(v.points) >= 5) ? 'Nặng' : 'Vừa');
      setHFrequency(item.violationsCount || 2);
      setHEducationalMeasure('');
      setHStudentExchange('');
      setHParentCoordination('');
      setHHandlingResult('');
      setHStatus('PROCESSING');
      setHTeacherNotes('');
    }

    setHSaveSuccess(null);
    setIsHandlingFormModalOpen(true);
  };

  const handleSaveHandlingForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!handlingStudent || !hContent.trim()) return;

    if (handlingExistingRecord) {
      studentService.updateViolationHandlingRecord(
        handlingStudent.id,
        handlingExistingRecord.id,
        {
          date: hDate,
          weekNumber: handlingExistingRecord.weekNumber || selectedWeekNum,
          content: hContent.trim(),
          category: hCategory,
          severity: hSeverity,
          frequencyCount: hFrequency,
          educationalMeasure: hEducationalMeasure.trim() || undefined,
          studentExchangeNotes: hStudentExchange.trim() || undefined,
          parentCoordinationNotes: hParentCoordination.trim() || undefined,
          handlingResult: hHandlingResult.trim() || undefined,
          status: hStatus,
          teacherNotes: hTeacherNotes.trim() || undefined
        }
      );
      setHSaveSuccess('✓ Đã cập nhật thành công hồ sơ vào: Quản lí học viên → Theo dõi & Xử lý vi phạm!');
    } else {
      studentService.addViolationHandlingRecord(handlingStudent.id, {
        studentId: handlingStudent.id,
        studentName: handlingStudent.fullName,
        date: hDate,
        weekNumber: selectedWeekNum,
        content: hContent.trim(),
        category: hCategory,
        severity: hSeverity,
        frequencyCount: hFrequency,
        educationalMeasure: hEducationalMeasure.trim() || undefined,
        studentExchangeNotes: hStudentExchange.trim() || undefined,
        parentCoordinationNotes: hParentCoordination.trim() || undefined,
        handlingResult: hHandlingResult.trim() || undefined,
        status: hStatus,
        teacherNotes: hTeacherNotes.trim() || undefined
      });
      setHSaveSuccess('✓ Đã lưu thành công hồ sơ vào: Quản lí học viên → Theo dõi & Xử lý vi phạm!');
    }

    reloadData();

    setTimeout(() => {
      setIsHandlingFormModalOpen(false);
      setHSaveSuccess(null);
    }, 1200);
  };

  const handleQuickUpdateStatusInModal = (item: any, newStatus: ViolationHandlingStatus) => {
    const student = item.student;
    const existing = item.existingRecord || null;
    if (existing) {
      studentService.updateViolationHandlingRecord(student.id, existing.id, {
        ...existing,
        status: newStatus,
        handlingResult:
          newStatus === 'RESOLVED'
            ? (existing.handlingResult || 'Đã ổn định nề nếp theo xác nhận của GVCN')
            : existing.handlingResult
      });
    } else {
      studentService.addViolationHandlingRecord(student.id, {
        studentId: student.id,
        studentName: student.fullName,
        date: new Date().toISOString().split('T')[0],
        weekNumber: selectedWeekNum,
        content: `Vi phạm tuần ${selectedWeekNum} (${item.violationsCount} lượt)`,
        category: item.violations[0]?.category || 'Nề nếp & Tác phong',
        severity: item.violations.some((v: any) => Math.abs(v.points) >= 5) ? 'Nặng' : 'Vừa',
        frequencyCount: item.violationsCount || 2,
        status: newStatus,
        handlingResult: newStatus === 'RESOLVED' ? 'Đã ổn định nề nếp theo xác nhận của GVCN' : 'Đang xử lý nề nếp'
      });
    }
    reloadData();
  };

  // Save summary handler
  const handleSaveSummary = () => {
    let currentKey = '';
    let label = '';
    if (summaryTab === 'week') {
      currentKey = String(selectedWeekNum);
      label = `Tuần ${selectedWeekNum}`;
    } else if (summaryTab === 'month') {
      currentKey = selectedMonthYear;
      label = `Tháng ${selectedMonthYear}`;
    } else {
      currentKey = selectedSemester;
      label = selectedSemester === 'HK1' ? 'Học kỳ I' : 'Học kỳ II';
    }

    try {
      classAnalyticsAndAlertService.saveClassSummary(summaryTab, currentKey, {
        teacherEvaluation: evalText,
        nextDirection: dirText,
        savedBy: classService.getSettings().homeroomTeacherName || 'Giáo viên chủ nhiệm'
      });

      setIsCurrentSaved(true);
      if (summaryTab === 'week') {
        setIsEditingWeek(false);
      }
      setSaveErrorMessage(null);
      setSaveSuccessMessage(`✓ Đã lưu thành công tổng kết ${label}!`);
      setTimeout(() => {
        setSaveSuccessMessage(null);
      }, 4000);
    } catch (err: any) {
      console.error('Save summary failed:', err);
      setSaveErrorMessage(`Không thể lưu tổng kết ${label}: ${err?.message || 'Lỗi không xác định'}`);
      setTimeout(() => {
        setSaveErrorMessage(null);
      }, 5000);
    }
  };

  // Copy summary text to clipboard
  const handleCopySummary = () => {
    let text = '';
    if (summaryTab === 'week') {
      text = `=== BIÊN BẢN TỔNG KẾT TUẦN ${selectedWeekNum} ===\n`;
      text += `1. Tình hình chung & Chuyên cần: Tỷ lệ ${weeklySummary.attendance.attendanceRate}%, Vắng có phép: ${weeklySummary.attendance.excusedAbsences}, Vắng không phép: ${weeklySummary.attendance.unexcusedAbsences}, Đi muộn: ${weeklySummary.attendance.tardyCount}.\n`;
      text += `2. Rèn luyện & Vi phạm: ${weeklySummary.violations.totalCount} lượt (${weeklySummary.violations.trendText}).\n`;
      text += `3. Khen thưởng: +${weeklySummary.positiveHighlights.totalRewardPoints}đ, ${weeklySummary.positiveHighlights.goodDeedsCount} việc tốt.\n`;
    } else if (summaryTab === 'month') {
      text = `=== BIÊN BẢN TỔNG KẾT THÁNG ${selectedMonthYear} ===\n`;
      text += `1. Chuyên cần: ${monthlySummary.attendance.attendanceTrend}\n`;
      text += `2. Vi phạm: ${monthlySummary.violations.totalCount} lượt (${monthlySummary.violations.trendText})\n`;
      text += `3. Khen thưởng: +${monthlySummary.positiveHighlights.totalRewardPoints}đ (${monthlySummary.positiveHighlights.goodDeedsCount} lượt việc tốt)\n`;
    } else {
      text = `=== BIÊN BẢN TỔNG KẾT ${semesterSummary.semesterLabel.toUpperCase()} ===\n`;
      text += `1. Sĩ số: ${semesterSummary.totalStudents} học sinh\n`;
      text += `2. Vi phạm toàn kỳ: ${semesterSummary.violations.totalCount} lượt\n`;
      text += `3. Khen thưởng: +${semesterSummary.positiveHighlights.totalRewardPoints}đ, ${semesterSummary.positiveHighlights.goodDeedsCount} lượt việc tốt\n`;
    }

    if (evalText.trim()) {
      text += `\n* Đánh giá, nhận xét của GVCN:\n${evalText}\n`;
    }
    if (dirText.trim()) {
      text += `\n* Phương hướng tiếp theo:\n${dirText}\n`;
    }

    navigator.clipboard.writeText(text);
    setIsCopiedSummary(true);
    setTimeout(() => setIsCopiedSummary(false), 2500);
  };

  // AI analysis helper
  const handleAiAnalyze = async () => {
    setIsAiLoading(true);
    setAiError(null);
    setAiResultText(null);
    setAiModalTitle(`Trợ lý AI tổng kết & tham vấn nề nếp (${summaryTab === 'week' ? `Tuần ${selectedWeekNum}` : summaryTab === 'month' ? `Tháng ${selectedMonthYear}` : semesterSummary.semesterLabel})`);

    try {
      let prompt = `Bạn là cố vấn sư phạm chuyên nghiệp hỗ trợ Giáo viên chủ nhiệm lớp. Dưới đây là dữ liệu thực tế của lớp:\n`;
      if (summaryTab === 'week') {
        prompt += `- Tuần học: Tuần ${selectedWeekNum} (${weeklySummary.dateRange})\n`;
        prompt += `- Sĩ số: ${weeklySummary.totalStudents} học sinh\n`;
        prompt += `- Chuyên cần: Tỷ lệ ${weeklySummary.attendance.attendanceRate}%, Vắng có phép: ${weeklySummary.attendance.excusedAbsences}, Vắng không phép: ${weeklySummary.attendance.unexcusedAbsences}, Đi muộn: ${weeklySummary.attendance.tardyCount}\n`;
        prompt += `- Vi phạm: ${weeklySummary.violations.totalCount} lượt (so với tuần trước: ${weeklySummary.violations.trendText})\n`;
        prompt += `- Phân loại vi phạm: ${weeklySummary.violations.byCategory.map(c => `${c.category}: ${c.count}`).join(', ') || 'Không có'}\n`;
        prompt += `- Khen thưởng / Việc tốt: ${weeklySummary.positiveHighlights.goodDeedsCount} lượt (+${weeklySummary.positiveHighlights.totalRewardPoints} điểm)\n`;
      } else if (summaryTab === 'month') {
        prompt += `- Tháng: ${selectedMonthYear}\n`;
        prompt += `- Vi phạm: ${monthlySummary.violations.totalCount} lượt (${monthlySummary.violations.trendText})\n`;
        prompt += `- Khen thưởng: ${monthlySummary.positiveHighlights.goodDeedsCount} lượt\n`;
      } else {
        prompt += `- Học kỳ: ${semesterSummary.semesterLabel}\n`;
        prompt += `- Vi phạm toàn kỳ: ${semesterSummary.violations.totalCount} lượt\n`;
        prompt += `- Khen thưởng: ${semesterSummary.positiveHighlights.goodDeedsCount} lượt\n`;
      }
      prompt += `\nHãy viết dự thảo 2 phần ngắn gọn, cô đọng, giàu tính sư phạm:\n1. Nhận xét đánh giá chung của GVCN\n2. Phương hướng và nhiệm vụ trọng tâm giai đoạn tiếp theo.`;

      const response = await aiService.askAssistant(prompt, { scope: 'class' });
      setAiResultText(response);
    } catch (err: any) {
      setAiError(err.message || 'Không thể kết nối dịch vụ AI.');
    } finally {
      setIsAiLoading(false);
    }
  };

  /**
   * Helper to parse AI summary output into 2 distinct sections:
   * 1. Evaluation ("Đánh giá, nhận xét của GVCN")
   * 2. Next direction ("Phương hướng tuần học tiếp theo")
   */
  const parseAiSummaryParts = (rawText: string): { evaluation: string; direction: string } => {
    if (!rawText || !rawText.trim()) {
      return { evaluation: '', direction: '' };
    }

    const text = rawText.trim();

    // Pattern to find the start of Section 2 (Phương hướng...)
    const part2Pattern = /(?:^|\n)\s*(?:#{1,4}\s*)?(?:\*{0,2}\s*)?(?:(?:2|II)\s*[\.\:\-\)]|Phần\s*2\s*[\:\.\-]?|[bB]\s*[\.\)])\s*(?:\*{0,2}\s*)?(?:Phương hướng|Nhiệm vụ|Kế hoạch|Định hướng)[^\n]*\n?/i;
    const match = text.match(part2Pattern);

    if (match && match.index !== undefined) {
      const rawPart1 = text.slice(0, match.index).trim();
      const rawPart2 = text.slice(match.index + match[0].length).trim();

      // Strip Section 1 title header if present (e.g. "1. Nhận xét đánh giá chung của GVCN:")
      const cleanPart1 = rawPart1
        .replace(/^(?:#{1,4}\s*)?(?:\*{0,2}\s*)?(?:(?:1|I)\s*[\.\:\-\)]|Phần\s*1\s*[\:\.\-]?|[aA]\s*[\.\)])\s*(?:\*{0,2}\s*)?(?:Nhận xét|Đánh giá|Tình hình)[^\n]*\n?/i, '')
        .trim();

      return {
        evaluation: cleanPart1 || rawPart1,
        direction: rawPart2
      };
    }

    // Fallback: look for "Phương hướng" or "Nhiệm vụ trọng tâm" starting on a new line
    const fallbackPattern = /(?:^|\n)\s*(?:#{1,4}\s*)?(?:\*{0,2}\s*)?(?:Phương hướng(?:\s+và\s+nhiệm\s+vụ)?|Nhiệm vụ trọng tâm|Định hướng)[^\n]*:?\s*\n?/i;
    const fallbackMatch = text.match(fallbackPattern);
    if (fallbackMatch && fallbackMatch.index !== undefined && fallbackMatch.index > 0) {
      const rawPart1 = text.slice(0, fallbackMatch.index).trim();
      const rawPart2 = text.slice(fallbackMatch.index + fallbackMatch[0].length).trim();
      const cleanPart1 = rawPart1
        .replace(/^(?:#{1,4}\s*)?(?:\*{0,2}\s*)?(?:Nhận xét|Đánh giá)[^\n]*:?\s*\n?/i, '')
        .trim();
      return {
        evaluation: cleanPart1 || rawPart1,
        direction: rawPart2
      };
    }

    return {
      evaluation: text,
      direction: ''
    };
  };

  /**
   * Directly sets the parsed AI text into the active textareas (evalText & dirText)
   * without automatically saving to DB, preserving the user's manual review & save workflow.
   */
  const applyAiSummaryToInputs = () => {
    if (!aiResultText) return;
    const { evaluation, direction } = parseAiSummaryParts(aiResultText);
    if (evaluation) {
      setEvalText(evaluation);
    }
    if (direction) {
      setDirText(direction);
    }
    setShowOverwriteConfirm(false);
    setAiResultText(null);
    setAiError(null);
    if (summaryTab === 'week') {
      setIsEditingWeek(true);
    }
    setImportSuccessMsg('✓ Đã nhập nội dung từ AI vào các ô đánh giá và phương hướng.');
    setTimeout(() => setImportSuccessMsg(null), 3500);
  };

  /**
   * Action handler for "Nhập" button with overwrite protection:
   * Prompts confirmation if either input already contains content.
   */
  const handleImportAiSummary = () => {
    if (!aiResultText) return;
    const hasExistingContent = Boolean(evalText.trim() || dirText.trim());
    if (hasExistingContent) {
      setShowOverwriteConfirm(true);
    } else {
      applyAiSummaryToInputs();
    }
  };

  // Access Control: Non-teachers view privacy-friendly placeholder
  if (!isTeacherOrAdmin) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs text-center space-y-2">
        <ShieldAlert className="h-8 w-8 text-blue-500 mx-auto" />
        <h4 className="text-sm font-bold text-slate-800">Trợ Lý Theo Dõi & Tổng Kết Nề Nếp GVCN</h4>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Số liệu thống kê tổng hợp của cả lớp được hiển thị tại Thẻ thống kê rèn luyện trên trang Tổng quan. Không gian theo dõi vi phạm và biên bản tổng kết chỉ dành riêng cho Giáo viên chủ nhiệm.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* HEADER: TRỢ LÝ THEO DÕI & TỔNG KẾT NỀ NẾP GVCN */}
      <div className="px-5 pt-4 pb-3 border-b border-slate-200/80 bg-slate-50/50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600 text-white shadow-xs">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                  Trợ Lý Theo Dõi & Tổng Kết Nề Nếp GVCN
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold border border-blue-200">
                  Thời gian thực
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Không gian theo dõi nề nếp, xử lý vi phạm và tổng hợp biên bản tự động định kỳ
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* ============================================================ */}
        {/* NHÓM 1 — THEO DÕI VI PHẠM */}
        {/* ============================================================ */}
        <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-r from-slate-50 to-blue-50/20 p-4 space-y-3.5 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700 font-bold">
                <ShieldAlert className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                  THEO DÕI VI PHẠM
                </h4>
                <p className="text-[11px] text-slate-500">
                  Tình trạng xử lý nề nếp tổng hợp từ hồ sơ học viên (Tuần {selectedWeekNum})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 font-medium">Tuần theo dõi:</span>
              <select
                value={selectedWeekNum}
                onChange={(e) => setSelectedWeekNum(Number(e.target.value))}
                className="text-xs font-bold bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 cursor-pointer shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {allWeeks.map((w) => (
                  <option key={w.weekNumber} value={w.weekNumber}>
                    {w.label} {w.weekNumber === currentWeekNum ? '★ Hiện tại' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 3 Trạng thái: Cảnh báo | Đang xử lý | Đã ổn định */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 1. CẢNH BÁO */}
            <div className="bg-rose-50/90 border border-rose-200 rounded-xl p-3.5 flex flex-col justify-between shadow-2xs hover:bg-rose-50 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-rose-800 uppercase tracking-tight block">
                    CẢNH BÁO
                  </span>
                  <span className="text-[10px] text-rose-600 font-medium block">
                    Nhiều lượt vi phạm trong tuần
                  </span>
                </div>
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-rose-200/80 text-rose-800">
                  <AlertTriangle className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-2.5 flex items-baseline justify-between">
                <div className="text-2xl font-black text-rose-950">
                  {warningCount} <span className="text-xs font-semibold text-rose-700">học viên</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveDetailModalTab('WARNING')}
                  className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 hover:text-rose-900 bg-white hover:bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 shadow-2xs cursor-pointer transition-all active:scale-95"
                >
                  <span>Xem chi tiết</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* 2. ĐANG XỬ LÝ */}
            <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-3.5 flex flex-col justify-between shadow-2xs hover:bg-amber-50 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-amber-800 uppercase tracking-tight block">
                    ĐANG XỬ LÝ
                  </span>
                  <span className="text-[10px] text-amber-700 font-medium block">
                    GVCN đang theo dõi / xử lý
                  </span>
                </div>
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-200/80 text-amber-800">
                  <Clock className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-2.5 flex items-baseline justify-between">
                <div className="text-2xl font-black text-amber-950">
                  {processingCount} <span className="text-xs font-semibold text-amber-700">trường hợp</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveDetailModalTab('PROCESSING')}
                  className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 hover:text-amber-950 bg-white hover:bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 shadow-2xs cursor-pointer transition-all active:scale-95"
                >
                  <span>Xem chi tiết</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* 3. ĐÃ ỔN ĐỊNH */}
            <div className="bg-emerald-50/90 border border-emerald-200 rounded-xl p-3.5 flex flex-col justify-between shadow-2xs hover:bg-emerald-50 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-tight block">
                    ĐÃ ỔN ĐỊNH
                  </span>
                  <span className="text-[10px] text-emerald-700 font-medium block">
                    Đã hoàn thành xử lý và ổn định
                  </span>
                </div>
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-200/80 text-emerald-800">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-2.5 flex items-baseline justify-between">
                <div className="text-2xl font-black text-emerald-950">
                  {resolvedCount} <span className="text-xs font-semibold text-emerald-700">trường hợp</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveDetailModalTab('RESOLVED')}
                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 hover:text-emerald-950 bg-white hover:bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 shadow-2xs cursor-pointer transition-all active:scale-95"
                >
                  <span>Xem chi tiết</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* NHÓM 2 — TỔNG KẾT (3 TABS: TUẦN | THÁNG | HỌC KỲ) */}
        {/* ============================================================ */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 font-bold">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                  TỔNG KẾT
                </h4>
                <p className="text-[11px] text-slate-500">
                  Tổng hợp tự động, ghi nhận đánh giá của GVCN và phương hướng giai đoạn tiếp theo
                </p>
              </div>
            </div>

            {/* 3 TABS SELECTOR */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setSummaryTab('week')}
                className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  summaryTab === 'week'
                    ? 'bg-white text-blue-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>Tuần</span>
              </button>

              <button
                type="button"
                onClick={() => setSummaryTab('month')}
                className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  summaryTab === 'month'
                    ? 'bg-white text-blue-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarDays className="h-3.5 w-3.5" />
                <span>Tháng</span>
              </button>

              <button
                type="button"
                onClick={() => setSummaryTab('semester')}
                className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  summaryTab === 'semester'
                    ? 'bg-white text-blue-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>Học kỳ</span>
              </button>
            </div>
          </div>

          {/* Timeframe Scope Selector for active tab */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Phạm vi tổng kết:</span>
              {summaryTab === 'week' && (
                <select
                  value={selectedWeekNum}
                  onChange={(e) => setSelectedWeekNum(Number(e.target.value))}
                  className="text-xs font-bold bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 cursor-pointer shadow-2xs"
                >
                  {allWeeks.map((w) => (
                    <option key={w.weekNumber} value={w.weekNumber}>
                      {w.label} {w.weekNumber === currentWeekNum ? '★ Hiện tại' : ''} ({w.dateRangeFormatted})
                    </option>
                  ))}
                </select>
              )}

              {summaryTab === 'month' && (
                <select
                  value={selectedMonthYear}
                  onChange={(e) => setSelectedMonthYear(e.target.value)}
                  className="text-xs font-bold bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 cursor-pointer shadow-2xs"
                >
                  {availableMonths.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              )}

              {summaryTab === 'semester' && (
                <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-300">
                  <button
                    type="button"
                    onClick={() => setSelectedSemester('HK1')}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      selectedSemester === 'HK1' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Học kỳ I
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSemester('HK2')}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      selectedSemester === 'HK2' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Học kỳ II
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopySummary}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-slate-700 hover:bg-slate-100 border border-slate-300 cursor-pointer transition-colors shadow-2xs"
              >
                {isCopiedSummary ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-slate-500" />}
                <span>{isCopiedSummary ? 'Đã sao chép' : 'Sao chép biên bản'}</span>
              </button>

              <button
                type="button"
                onClick={handleAiAnalyze}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 cursor-pointer transition-colors shadow-2xs"
              >
                <Sparkles className="h-3.5 w-3.5 text-yellow-300" />
                <span>AI Hỗ trợ tổng kết</span>
              </button>

              {aiResultText && (
                <button
                  type="button"
                  onClick={handleImportAiSummary}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer transition-colors shadow-2xs active:scale-95 animate-in fade-in"
                  title="Đưa nội dung AI đã tổng kết vào các ô tương ứng"
                >
                  <ArrowDownToLine className="h-3.5 w-3.5" />
                  <span>Nhập</span>
                </button>
              )}
            </div>
          </div>

          {/* Success Banner when Imported from AI */}
          {importSuccessMsg && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{importSuccessMsg}</span>
            </div>
          )}

          {/* Success Banner when Saved */}
          {saveSuccessMessage && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{saveSuccessMessage}</span>
            </div>
          )}

          {/* Error Banner when Save fails */}
          {saveErrorMessage && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold animate-in fade-in">
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>{saveErrorMessage}</span>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 1 CONTENT: TỔNG KẾT TUẦN */}
          {/* ============================================================ */}
          {summaryTab === 'week' && (
            <div className="space-y-4">
              {/* A. TỔNG HỢP TỰ ĐỘNG */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Block 1: Chuyên cần */}
                <div className="bg-slate-50/70 rounded-xl border border-slate-200 p-3.5 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-1.5">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-blue-600" />
                      Chuyên cần & Sĩ số
                    </span>
                    <span className="text-[11px] font-bold px-1.5 py-0.2 rounded-md bg-blue-100 text-blue-800">
                      {weeklySummary.totalStudents} HS
                    </span>
                  </div>
                  <div className="text-xs space-y-1 text-slate-700">
                    <p>• Tỷ lệ chuyên cần: <strong className="text-slate-900">{weeklySummary.attendance.attendanceRate}%</strong></p>
                    <p>• Nghỉ có phép: <strong>{weeklySummary.attendance.excusedAbsences}</strong> lượt</p>
                    <p>• Nghỉ không phép: <strong className="text-rose-600">{weeklySummary.attendance.unexcusedAbsences}</strong> lượt</p>
                    <p>• Đi học muộn: <strong>{weeklySummary.attendance.tardyCount}</strong> lượt</p>
                  </div>
                </div>

                {/* Block 2: Vi phạm nề nếp */}
                <div className="bg-amber-50/40 rounded-xl border border-amber-200/80 p-3.5 space-y-2">
                  <div className="flex items-center justify-between border-b border-amber-200/60 pb-1.5">
                    <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                      Vi phạm nề nếp
                    </span>
                    <div className="flex items-center gap-1 text-[11px] font-bold">
                      {weeklySummary.violations.trendDirection === 'INCREASED' ? (
                        <span className="text-rose-600 flex items-center gap-0.5">
                          <TrendingUp className="h-3 w-3" /> Tăng
                        </span>
                      ) : weeklySummary.violations.trendDirection === 'DECREASED' ? (
                        <span className="text-emerald-600 flex items-center gap-0.5">
                          <TrendingDown className="h-3 w-3" /> Giảm
                        </span>
                      ) : (
                        <span className="text-slate-500 flex items-center gap-0.5">
                          <Minus className="h-3 w-3" /> Bằng
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-xs space-y-1 text-slate-700">
                    <p>• Tổng số lượt vi phạm: <strong className="text-amber-900">{weeklySummary.violations.totalCount}</strong> lượt</p>
                    <p>• Số học sinh có vi phạm: <strong>{weeklySummary.violations.studentsWithViolationCount}</strong> em</p>
                    <p className="text-[11px] text-slate-500 italic">• {weeklySummary.violations.trendText}</p>
                    {weeklySummary.violations.byCategory.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {weeklySummary.violations.byCategory.map((cat, idx) => (
                          <span key={idx} className="text-[10px] px-1.5 py-0.5 bg-white border border-amber-200 text-amber-900 rounded-md font-medium">
                            {cat.category}: {cat.count}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Block 3: Khen thưởng & Tích cực */}
                <div className="bg-emerald-50/40 rounded-xl border border-emerald-200/80 p-3.5 space-y-2">
                  <div className="flex items-center justify-between border-b border-emerald-200/60 pb-1.5">
                    <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                      <Award className="h-3.5 w-3.5 text-emerald-600" />
                      Khen thưởng & Việc tốt
                    </span>
                    <span className="text-[11px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800">
                      +{weeklySummary.positiveHighlights.totalRewardPoints}đ
                    </span>
                  </div>
                  <div className="text-xs space-y-1 text-slate-700">
                    <p>• Lượt việc tốt / khen thưởng: <strong>{weeklySummary.positiveHighlights.goodDeedsCount}</strong> lượt</p>
                    <p>• Học sinh ghi nhận tích cực: <strong>{weeklySummary.positiveHighlights.studentsRewardedCount}</strong> em</p>
                    <p>• Cây Nguyệt Quế nở hoa: <strong>{weeklySummary.positiveHighlights.laurelTreesCompleted}</strong> cây</p>
                    <p>• Hoạt động phong trào tham gia: <strong>{weeklySummary.positiveHighlights.activeActivitiesCount}</strong> hoạt động</p>
                  </div>
                </div>
              </div>

              {/* B. ĐÁNH GIÁ, NHẬN XÉT CỦA GVCN */}
              {isEditingWeek ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Đánh giá, nhận xét của GVCN:
                  </label>
                  <textarea
                    rows={4}
                    value={evalText}
                    onChange={(e) => setEvalText(e.target.value)}
                    placeholder="Nhập nội dung đánh giá thực tế của tuần (nề nếp, thái độ học tập, các ưu điểm và tồn tại cần khắc phục)..."
                    className="w-full p-3.5 rounded-xl border border-blue-300 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs leading-relaxed"
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <span className="block text-xs font-bold text-slate-700">
                    Đánh giá, nhận xét của GVCN:
                  </span>
                  <div className="w-full p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/90 text-xs text-slate-800 leading-relaxed shadow-2xs min-h-[72px]">
                    {evalText.trim() ? (
                      <div className="whitespace-pre-wrap font-sans text-slate-800">
                        {evalText}
                      </div>
                    ) : (
                      <p className="text-slate-400 italic">
                        (Chưa có nội dung đánh giá, nhận xét cho tuần {selectedWeekNum}. Nhấn &quot;Chỉnh sửa tổng kết tuần&quot; hoặc &quot;AI Hỗ trợ tổng kết&quot; để bổ sung.)
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* C. PHƯƠNG HƯỚNG TUẦN HỌC TIẾP THEO */}
              {isEditingWeek ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Phương hướng tuần học tiếp theo:
                  </label>
                  <textarea
                    rows={4}
                    value={dirText}
                    onChange={(e) => setDirText(e.target.value)}
                    placeholder="Nhập phương hướng và nhiệm vụ cần thực hiện trong tuần tiếp theo (chấn chỉnh kỷ luật, đôn đốc học tập, phối hợp phụ huynh)..."
                    className="w-full p-3.5 rounded-xl border border-blue-300 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs leading-relaxed"
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <span className="block text-xs font-bold text-slate-700">
                    Phương hướng tuần học tiếp theo:
                  </span>
                  <div className="w-full p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/90 text-xs text-slate-800 leading-relaxed shadow-2xs min-h-[72px]">
                    {dirText.trim() ? (
                      <div className="whitespace-pre-wrap font-sans text-slate-800">
                        {dirText}
                      </div>
                    ) : (
                      <p className="text-slate-400 italic">
                        (Chưa có phương hướng cho tuần học tiếp theo. Nhấn &quot;Chỉnh sửa tổng kết tuần&quot; hoặc &quot;AI Hỗ trợ tổng kết&quot; để bổ sung.)
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* D. NÚT LỆNH */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                {isEditingWeek && (
                  <button
                    type="button"
                    onClick={() => {
                      const currentKey = String(selectedWeekNum);
                      const saved = classAnalyticsAndAlertService.getSavedClassSummary('week', currentKey);
                      if (saved) {
                        setEvalText(saved.teacherEvaluation || '');
                        setDirText(saved.nextDirection || '');
                      }
                      setIsEditingWeek(false);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 bg-white hover:bg-slate-100 border border-slate-300 cursor-pointer transition-colors shadow-2xs"
                  >
                    <X className="h-3.5 w-3.5 text-slate-500" />
                    <span>Hủy</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsEditingWeek((prev) => !prev)}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95 ${
                    isEditingWeek
                      ? 'text-blue-700 bg-blue-100 border border-blue-300 ring-1 ring-blue-400'
                      : 'text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200'
                  }`}
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  <span>Chỉnh sửa tổng kết tuần</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveSummary}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs cursor-pointer transition-all active:scale-95"
                  title="Lưu nội dung tổng kết tuần"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>Lưu</span>
                </button>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 2 CONTENT: TỔNG KẾT THÁNG */}
          {/* ============================================================ */}
          {summaryTab === 'month' && (
            <div className="space-y-4">
              {/* A. TỔNG HỢP TỰ ĐỘNG */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="bg-slate-50/70 rounded-xl border border-slate-200 p-3.5 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-1.5">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-blue-600" />
                      Chuyên cần tháng {selectedMonthYear}
                    </span>
                    <span className="text-[11px] font-bold px-1.5 py-0.2 rounded-md bg-blue-100 text-blue-800">
                      {monthlySummary.totalStudents} HS
                    </span>
                  </div>
                  <div className="text-xs space-y-1 text-slate-700">
                    <p>• Tổng lượt vắng cả tháng: <strong>{monthlySummary.attendance.totalAbsences}</strong> lượt</p>
                    <p>• Vắng có phép: <strong>{monthlySummary.attendance.excusedAbsences}</strong> | Không phép: <strong className="text-rose-600">{monthlySummary.attendance.unexcusedAbsences}</strong></p>
                    <p>• Đi học muộn trong tháng: <strong>{monthlySummary.attendance.tardyCount}</strong> lượt</p>
                  </div>
                </div>

                <div className="bg-amber-50/40 rounded-xl border border-amber-200/80 p-3.5 space-y-2">
                  <div className="flex items-center justify-between border-b border-amber-200/60 pb-1.5">
                    <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                      Vi phạm nề nếp tháng
                    </span>
                    <span className="text-[11px] font-bold px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800">
                      {monthlySummary.violations.totalCount} lượt
                    </span>
                  </div>
                  <div className="text-xs space-y-1 text-slate-700">
                    <p>• Số học sinh có vi phạm: <strong>{monthlySummary.violations.studentsWithViolationCount}</strong> em</p>
                    <p className="text-[11px] text-slate-500 italic">• {monthlySummary.violations.trendText}</p>
                    {monthlySummary.violations.byCategory.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {monthlySummary.violations.byCategory.map((cat, idx) => (
                          <span key={idx} className="text-[10px] px-1.5 py-0.5 bg-white border border-amber-200 text-amber-900 rounded-md font-medium">
                            {cat.category}: {cat.count}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-emerald-50/40 rounded-xl border border-emerald-200/80 p-3.5 space-y-2">
                  <div className="flex items-center justify-between border-b border-emerald-200/60 pb-1.5">
                    <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                      <Award className="h-3.5 w-3.5 text-emerald-600" />
                      Khen thưởng tháng
                    </span>
                    <span className="text-[11px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800">
                      +{monthlySummary.positiveHighlights.totalRewardPoints}đ
                    </span>
                  </div>
                  <div className="text-xs space-y-1 text-slate-700">
                    <p>• Lượt việc tốt ghi nhận: <strong>{monthlySummary.positiveHighlights.goodDeedsCount}</strong> lượt</p>
                    <p>• Số học sinh tích cực: <strong>{monthlySummary.positiveHighlights.studentsRewardedCount}</strong> em</p>
                  </div>
                </div>
              </div>

              {/* B. ĐÁNH GIÁ, NHẬN XÉT CỦA GVCN */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Đánh giá, nhận xét của GVCN:
                </label>
                <textarea
                  rows={3}
                  value={evalText}
                  onChange={(e) => setEvalText(e.target.value)}
                  placeholder="Nhập nội dung đánh giá thực tế của tháng (sự tiến bộ của tập thể, các mặt còn tồn đọng)..."
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* C. PHƯƠNG HƯỚNG THÁNG TIẾP THEO */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Phương hướng tháng tiếp theo:
                </label>
                <textarea
                  rows={3}
                  value={dirText}
                  onChange={(e) => setDirText(e.target.value)}
                  placeholder="Nhập phương hướng và nhiệm vụ cần thực hiện trong tháng tiếp theo..."
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* D. NÚT LỆNH */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleSaveSummary}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs cursor-pointer transition-all active:scale-95"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{isCurrentSaved ? 'Chỉnh sửa tổng kết tháng' : 'Lưu tổng kết tháng'}</span>
                </button>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 3 CONTENT: TỔNG KẾT HỌC KỲ */}
          {/* ============================================================ */}
          {summaryTab === 'semester' && (
            <div className="space-y-4">
              {/* A. TỔNG HỢP TỰ ĐỘNG */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="bg-slate-50/70 rounded-xl border border-slate-200 p-3.5 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-1.5">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-blue-600" />
                      Quy mô & Chuyên cần
                    </span>
                    <span className="text-[11px] font-bold px-1.5 py-0.2 rounded-md bg-blue-100 text-blue-800">
                      {semesterSummary.totalStudents} HS
                    </span>
                  </div>
                  <div className="text-xs space-y-1 text-slate-700">
                    <p>• Học kỳ: <strong>{semesterSummary.semesterLabel}</strong></p>
                    <p>• Năm học: <strong>{semesterSummary.schoolYearLabel}</strong></p>
                    <p>• Tỷ lệ chuyên cần bình quân: <strong>{semesterSummary.attendance.attendanceRate}%</strong></p>
                  </div>
                </div>

                <div className="bg-amber-50/40 rounded-xl border border-amber-200/80 p-3.5 space-y-2">
                  <div className="flex items-center justify-between border-b border-amber-200/60 pb-1.5">
                    <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                      Vi phạm nề nếp toàn kỳ
                    </span>
                    <span className="text-[11px] font-bold px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800">
                      {semesterSummary.violations.totalCount} lượt
                    </span>
                  </div>
                  <div className="text-xs space-y-1 text-slate-700">
                    <p>• Số học sinh có vi phạm: <strong>{semesterSummary.violations.studentsWithViolationCount}</strong> em</p>
                    {semesterSummary.violations.byCategory.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {semesterSummary.violations.byCategory.map((cat, idx) => (
                          <span key={idx} className="text-[10px] px-1.5 py-0.5 bg-white border border-amber-200 text-amber-900 rounded-md font-medium">
                            {cat.category}: {cat.count}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-emerald-50/40 rounded-xl border border-emerald-200/80 p-3.5 space-y-2">
                  <div className="flex items-center justify-between border-b border-emerald-200/60 pb-1.5">
                    <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                      <Award className="h-3.5 w-3.5 text-emerald-600" />
                      Khen thưởng toàn kỳ
                    </span>
                    <span className="text-[11px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800">
                      +{semesterSummary.positiveHighlights.totalRewardPoints}đ
                    </span>
                  </div>
                  <div className="text-xs space-y-1 text-slate-700">
                    <p>• Tổng lượt việc tốt: <strong>{semesterSummary.positiveHighlights.goodDeedsCount}</strong> lượt</p>
                    <p>• Cây Nguyệt Quế nở hoa: <strong>{semesterSummary.positiveHighlights.laurelTreesCompleted}</strong> cây</p>
                  </div>
                </div>
              </div>

              {/* B. ĐÁNH GIÁ, NHẬN XÉT CỦA GVCN */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Đánh giá, nhận xét của GVCN:
                </label>
                <textarea
                  rows={3}
                  value={evalText}
                  onChange={(e) => setEvalText(e.target.value)}
                  placeholder="Nhập nội dung đánh giá thực tế của toàn học kỳ..."
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* C. PHƯƠNG HƯỚNG HỌC KỲ TIẾP THEO */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Phương hướng học kỳ tiếp theo:
                </label>
                <textarea
                  rows={3}
                  value={dirText}
                  onChange={(e) => setDirText(e.target.value)}
                  placeholder="Nhập phương hướng và nhiệm vụ trọng tâm cho học kỳ tiếp theo..."
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* D. NÚT LỆNH */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleSaveSummary}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs cursor-pointer transition-all active:scale-95"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{isCurrentSaved ? 'Chỉnh sửa tổng kết học kỳ' : 'Lưu tổng kết học kỳ'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: AI KẾT QUẢ PHÂN TÍCH */}
      {(isAiLoading || aiResultText || aiError) && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 space-y-4 shadow-xl border border-slate-200 max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-600" />
                <h4 className="text-sm font-bold text-slate-900">{aiModalTitle}</h4>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAiResultText(null);
                  setAiError(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-3 text-xs leading-relaxed text-slate-800">
              {isAiLoading && (
                <div className="py-12 text-center space-y-3">
                  <RefreshCw className="h-8 w-8 text-blue-600 animate-spin mx-auto" />
                  <p className="font-bold text-slate-700">Trợ lý AI đang phân tích dữ liệu thực tế của lớp...</p>
                  <p className="text-slate-400 text-[11px]">
                    Tổng hợp từ sổ nề nếp, chuyên cần và kết quả rèn luyện
                  </p>
                </div>
              )}

              {aiError && (
                <div className="bg-rose-50 text-rose-800 p-3 rounded-xl border border-rose-200">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-rose-600" />
                    Không thể hoàn tất yêu cầu AI:
                  </p>
                  <p className="mt-1">{aiError}</p>
                </div>
              )}

              {aiResultText && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 prose prose-xs max-w-none">
                  <div className="whitespace-pre-wrap font-sans text-xs text-slate-800 leading-relaxed">
                    {aiResultText}
                  </div>
                </div>
              )}
            </div>

            {showOverwriteConfirm ? (
              <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl space-y-2.5 animate-in fade-in">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>Ô nhập liệu hiện đã có nội dung. Bạn có chắc chắn muốn thay thế bằng nội dung do AI tổng kết không?</span>
                </div>
                <div className="flex items-center justify-end gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setShowOverwriteConfirm(false)}
                    className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    onClick={applyAiSummaryToInputs}
                    className="px-3.5 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-bold cursor-pointer transition-colors"
                  >
                    Xác nhận nhập
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
                <span>* Nội dung mang tính tham vấn sư phạm. GVCN là người quyết định cuối cùng.</span>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(aiResultText || '');
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-slate-700 hover:bg-slate-100 border border-slate-300 cursor-pointer"
                  >
                    Sao chép nội dung
                  </button>
                  {aiResultText && (
                    <button
                      type="button"
                      onClick={handleImportAiSummary}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs cursor-pointer transition-colors active:scale-95"
                      title="Đưa nội dung AI đã tổng kết vào các ô tương ứng"
                    >
                      <ArrowDownToLine className="h-3.5 w-3.5" />
                      <span>Nhập</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 1: CHI TIẾT THEO DÕI VI PHẠM & CẢNH BÁO GVCN */}
      {/* ============================================================ */}
      {activeDetailModalTab && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center border border-amber-300 shadow-2xs">
                  <Scale className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
                      CHI TIẾT THEO DÕI & XỬ LÝ VI PHẠM
                    </h3>
                    <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 border border-blue-200">
                      Tuần {selectedWeekNum}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Đối soát lịch sử tất cả lỗi vi phạm nề nếp và hồ sơ xử lý làm việc của GVCN
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => {
                    setActiveDetailModalTab(null);
                    onNavigate && onNavigate('students', { subTab: 'violation_handling' });
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-white hover:bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl shadow-2xs transition-all cursor-pointer"
                >
                  <span>Mở toàn bộ trong Quản lí học viên</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDetailModalTab(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Filter Tabs in Modal */}
            <div className="px-5 pt-3 pb-2 border-b border-slate-100 bg-white flex items-center gap-2 overflow-x-auto scrollbar-none">
              <button
                type="button"
                onClick={() => setActiveDetailModalTab('WARNING')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  activeDetailModalTab === 'WARNING'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100'
                }`}
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Cảnh báo (Nhiều lượt vi phạm) ({warningCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveDetailModalTab('PROCESSING')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  activeDetailModalTab === 'PROCESSING'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100'
                }`}
              >
                <Clock className="h-3.5 w-3.5" />
                <span>Đang xử lý ({processingCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveDetailModalTab('RESOLVED')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  activeDetailModalTab === 'RESOLVED'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Đã ổn định ({resolvedCount})</span>
              </button>
            </div>

            {/* Student List in Active Tab */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {(() => {
                const currentList =
                  activeDetailModalTab === 'WARNING'
                    ? warningStudentsList
                    : activeDetailModalTab === 'PROCESSING'
                    ? processingStudentsList
                    : resolvedStudentsList;

                if (currentList.length === 0) {
                  return (
                    <div className="py-12 text-center space-y-2">
                      <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
                      <h4 className="text-sm font-bold text-slate-800">
                        Không có học viên nào trong diện {activeDetailModalTab === 'WARNING' ? 'Cảnh báo' : activeDetailModalTab === 'PROCESSING' ? 'Đang xử lý' : 'Đã ổn định'} của Tuần {selectedWeekNum}
                      </h4>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        Tình hình nề nếp lớp học được kiểm soát tốt hoặc các trường hợp vi phạm đã được xử lý hoàn tất.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    {currentList.map((item: any, idx: number) => {
                      const isWarning = item.activeStatus === 'WARNING';
                      const isProc = item.activeStatus === 'PROCESSING';
                      const priorRecords = (item.records || []).filter((r: any) => r.id !== item.existingRecord?.id);

                      return (
                        <div
                          key={`${item.studentId}-${idx}`}
                          className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3.5 hover:border-slate-300 transition-all"
                        >
                          {/* Top: Student Info & Status */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-3">
                              <img
                                src={item.avatar}
                                alt={item.fullName}
                                referrerPolicy="no-referrer"
                                className="h-11 w-11 rounded-2xl object-cover ring-1 ring-slate-200"
                              />
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="text-sm font-black text-slate-900">{item.fullName}</h4>
                                  <span className="font-mono text-xs text-slate-400">({item.code})</span>
                                </div>
                                <div className="text-xs text-slate-500 mt-0.5">
                                  Lớp <strong>{item.className}</strong> • <strong>Tổ {item.group}</strong>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              {/* Total violations in week badge */}
                              <span className="px-2.5 py-1 rounded-xl bg-rose-100 text-rose-900 border border-rose-300 text-xs font-black flex items-center gap-1 shadow-2xs">
                                <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                                <span>{item.violationsCount} lượt vi phạm trong tuần</span>
                              </span>

                              {/* Tái vi phạm badge */}
                              {priorRecords.length > 0 && isWarning && (
                                <span className="px-2.5 py-1 rounded-xl bg-orange-100 text-orange-900 border border-orange-300 text-xs font-bold flex items-center gap-1 shadow-2xs">
                                  <span>⚠️ Tái vi phạm ({priorRecords.length} hồ sơ cũ)</span>
                                </span>
                              )}

                              {/* Status badge */}
                              <span
                                className={`px-2.5 py-1 rounded-xl text-xs font-bold border flex items-center gap-1 ${
                                  isWarning
                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                    : isProc
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                }`}
                              >
                                {isWarning ? (
                                  <>
                                    <AlertTriangle className="h-3.5 w-3.5" />
                                    <span>Cảnh báo</span>
                                  </>
                                ) : isProc ? (
                                  <>
                                    <Clock className="h-3.5 w-3.5" />
                                    <span>Đang xử lý</span>
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    <span>Đã ổn định</span>
                                  </>
                                )}
                              </span>
                            </div>
                          </div>

                          {/* Middle: ALL Violations Detail (Mỗi lỗi vi phạm cụ thể) */}
                          <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/90 space-y-2">
                            <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                              <span>Danh sách tất cả các lỗi vi phạm trong tuần ({item.violations.length} lỗi):</span>
                              <span className="text-slate-400 font-medium">Hồ sơ căn cứ xử lý</span>
                            </div>

                            <div className="space-y-1.5">
                              {item.violations.map((v: any, vIdx: number) => (
                                <div
                                  key={v.id || vIdx}
                                  className="bg-white p-2.5 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs shadow-2xs"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[11px] shrink-0 border border-slate-200">
                                      {v.date}
                                    </span>
                                    <span className="font-bold text-slate-800">{v.reason}</span>
                                  </div>

                                  <div className="flex items-center gap-2 text-[11px] shrink-0">
                                    <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-semibold border border-amber-200">
                                      {v.category}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-bold border border-rose-200">
                                      Mức độ: {v.severity || 'Vừa'} ({v.points ? `${v.points}đ` : '-2đ'})
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Existing handling record summary for CURRENT week if present */}
                          {item.existingRecord && (
                            <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-200/80 space-y-1.5 text-xs">
                              <div className="font-bold text-blue-900 flex items-center justify-between">
                                <span>Tiến trình xử lý đã ghi nhận tuần {item.existingRecord.weekNumber || selectedWeekNum}:</span>
                                <span className="text-[10px] text-blue-600 font-medium">
                                  Ngày cập nhật: {item.existingRecord.date}
                                </span>
                              </div>
                              {item.existingRecord.educationalMeasure && (
                                <div className="text-slate-700">
                                  <strong>Biện pháp giáo dục: </strong>
                                  {item.existingRecord.educationalMeasure}
                                </div>
                              )}
                              {item.existingRecord.studentExchangeNotes && (
                                <div className="text-slate-600">
                                  <strong>Trao đổi HS: </strong>
                                  {item.existingRecord.studentExchangeNotes}
                                </div>
                              )}
                              {item.existingRecord.parentCoordinationNotes && (
                                <div className="text-emerald-700">
                                  <strong>Phối hợp PH: </strong>
                                  {item.existingRecord.parentCoordinationNotes}
                                </div>
                              )}
                              {item.existingRecord.handlingResult && (
                                <div className="text-emerald-800 font-medium">
                                  <strong>Kết quả xử lý: </strong>
                                  {item.existingRecord.handlingResult}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Notice for repeat violation with PREVIOUS records */}
                          {!item.existingRecord && priorRecords.length > 0 && (
                            <div className="p-3 rounded-xl bg-orange-50/70 border border-orange-200/90 space-y-1.5 text-xs">
                              <div className="font-bold text-orange-950 flex items-center justify-between">
                                <span className="flex items-center gap-1.5">
                                  <AlertTriangle className="h-3.5 w-3.5 text-orange-600" />
                                  <span>Hồ sơ xử lý trước đó (Tái vi phạm tuần {selectedWeekNum}):</span>
                                </span>
                                <span className="text-[10px] text-orange-700 font-semibold">
                                  Đã có {priorRecords.length} đợt xử lý trong quá khứ
                                </span>
                              </div>
                              <p className="text-slate-600 text-[11px]">
                                Học viên đã từng được xử lý nề nếp ở tuần trước. Tuần này tiếp tục phát sinh vi phạm mới ({item.violationsCount} lượt). Lịch sử cũ được bảo lưu đầy đủ.
                              </p>
                              <div className="bg-white p-2.5 rounded-lg border border-orange-200 text-[11px] space-y-1 shadow-2xs">
                                <div className="flex items-center justify-between font-bold">
                                  <span className="text-slate-800">
                                    Đợt gần nhất: Tuần {priorRecords[0].weekNumber || 'trước'} ({priorRecords[0].date})
                                  </span>
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    priorRecords[0].status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800' :
                                    priorRecords[0].status === 'PROCESSING' ? 'bg-amber-100 text-amber-800' :
                                    'bg-rose-100 text-rose-800'
                                  }`}>
                                    {priorRecords[0].status === 'RESOLVED' ? 'Đã ổn định' : priorRecords[0].status === 'PROCESSING' ? 'Đang xử lý' : 'Cảnh báo'}
                                  </span>
                                </div>
                                {priorRecords[0].educationalMeasure && (
                                  <div className="text-slate-700">
                                    <strong>Biện pháp đã áp dụng: </strong> {priorRecords[0].educationalMeasure}
                                  </div>
                                )}
                                {priorRecords[0].parentCoordinationNotes && (
                                  <div className="text-emerald-700">
                                    <strong>Phối hợp PH: </strong> {priorRecords[0].parentCoordinationNotes}
                                  </div>
                                )}
                                {priorRecords[0].handlingResult && (
                                  <div className="text-slate-800 font-medium">
                                    <strong>Kết quả ghi nhận: </strong> {priorRecords[0].handlingResult}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Prior records history if multiple exist */}
                          {item.existingRecord && priorRecords.length > 0 && (
                            <details className="text-xs group">
                              <summary className="cursor-pointer font-bold text-slate-600 hover:text-slate-800 select-none py-1 flex items-center gap-1">
                                <span>▶ Xem lịch sử {priorRecords.length} đợt xử lý các tuần trước</span>
                              </summary>
                              <div className="mt-2 space-y-1.5 pl-2 border-l-2 border-slate-200">
                                {priorRecords.map((pr: any, prIdx: number) => (
                                  <div key={pr.id || prIdx} className="bg-slate-50 p-2 rounded-lg border border-slate-200 text-[11px] space-y-0.5">
                                    <div className="flex items-center justify-between font-semibold">
                                      <span className="text-slate-700">Tuần {pr.weekNumber || '—'} ({pr.date})</span>
                                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                        pr.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800' :
                                        pr.status === 'PROCESSING' ? 'bg-amber-100 text-amber-800' :
                                        'bg-rose-100 text-rose-800'
                                      }`}>
                                        {pr.status === 'RESOLVED' ? 'Đã ổn định' : pr.status === 'PROCESSING' ? 'Đang xử lý' : 'Cảnh báo'}
                                      </span>
                                    </div>
                                    {pr.educationalMeasure && (
                                      <p className="text-slate-600"><strong>Biện pháp:</strong> {pr.educationalMeasure}</p>
                                    )}
                                    {pr.handlingResult && (
                                      <p className="text-emerald-700"><strong>Kết quả:</strong> {pr.handlingResult}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </details>
                          )}

                          {/* Bottom Action: XỬ LÍ / GHI NHẬN LÀM VIỆC & CẬP NHẬT TRẠNG THÁI */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2">
                            <span className="text-[11px] text-slate-500 italic">
                              {item.existingRecord
                                ? 'Đã có hồ sơ xử lý trong Quản lí học viên. Bấm để cập nhật tiến trình.'
                                : 'Chưa có biên bản làm việc chính thức cho vụ việc này.'}
                            </span>

                            <div className="flex items-center gap-2 self-end sm:self-auto">
                              {/* Cập nhật nhanh trạng thái */}
                              {isProc && (
                                <button
                                  type="button"
                                  onClick={() => handleQuickUpdateStatusInModal(item, 'RESOLVED')}
                                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-100/90 hover:bg-emerald-200 border border-emerald-300 active:scale-95 px-3 py-2 rounded-xl transition-all shadow-2xs cursor-pointer"
                                  title="Xác nhận học viên đã xử lý và nề nếp đã ổn định"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                                  <span>Xác nhận: Đã ổn định</span>
                                </button>
                              )}

                              {!isWarning && !isProc && (
                                <button
                                  type="button"
                                  onClick={() => handleQuickUpdateStatusInModal(item, 'PROCESSING')}
                                  className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-100/90 hover:bg-amber-200 border border-amber-300 active:scale-95 px-3 py-2 rounded-xl transition-all shadow-2xs cursor-pointer"
                                  title="Mở lại trạng thái theo dõi / đang xử lý"
                                >
                                  <Clock className="h-3.5 w-3.5 text-amber-700" />
                                  <span>Chuyển: Đang xử lý</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleOpenHandlingForStudent(item)}
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 px-4 py-2 rounded-xl transition-all shadow-xs cursor-pointer"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                                <span>{item.existingRecord ? 'Xử lí / Cập nhật làm việc' : 'Xử lí / Ghi nhận làm việc'}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: FORM XỬ LÝ / GHI NHẬN LÀM VIỆC VỚI HỌC VIÊN */}
      {/* ============================================================ */}
      {isHandlingFormModalOpen && handlingStudent && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 font-black">
                  <Scale className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {handlingExistingRecord ? 'Cập nhật Tiến trình Xử lý Vi phạm' : 'Ghi nhận Hồ sơ Xử lý Vi phạm'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Học viên: <strong className="text-slate-800">{handlingStudent.fullName}</strong> ({handlingStudent.code} • Tổ {handlingStudent.group})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsHandlingFormModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Notification / Storage Destination confirmation */}
            <div className="rounded-xl bg-blue-50/80 border border-blue-200 p-2.5 text-xs text-blue-900 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-blue-600 shrink-0" />
              <span>
                Dữ liệu sau khi lưu được tự động cập nhật vào <strong>Quản lí học viên → Theo dõi & Xử lý vi phạm</strong> và đồng bộ với bảng trạng thái nề nếp.
              </span>
            </div>

            {hSaveSuccess && (
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3 flex items-center gap-2 text-xs font-bold text-emerald-800 animate-in fade-in">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{hSaveSuccess}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSaveHandlingForm} className="space-y-3.5 text-xs">
              {/* Row 1: Date, Category, Severity */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Ngày vi phạm / Làm việc <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={hDate}
                    onChange={(e) => setHDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium focus:border-blue-500 outline-hidden bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Loại vi phạm <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={hCategory}
                    onChange={(e) => setHCategory(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium focus:border-blue-500 outline-hidden bg-white"
                  >
                    {VIOLATION_CATEGORIES_LIST.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Mức độ <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={hSeverity}
                    onChange={(e) => setHSeverity(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium focus:border-blue-500 outline-hidden bg-white"
                  >
                    {SEVERITY_LIST.map((sev) => (
                      <option key={sev} value={sev}>{sev}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Violation Content */}
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Nội dung vi phạm cụ thể <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={hContent}
                  onChange={(e) => setHContent(e.target.value)}
                  placeholder="VD: Đi học muộn 2 lần trong tuần, không thực hiện trực nhật..."
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:border-blue-500 outline-hidden"
                  required
                />
              </div>

              {/* Row 3: Educational Measure */}
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Biện pháp giáo dục / Xử lý của GVCN
                </label>
                <textarea
                  rows={2}
                  value={hEducationalMeasure}
                  onChange={(e) => setHEducationalMeasure(e.target.value)}
                  placeholder="VD: Nhắc nhở nghiêm túc trước lớp, yêu cầu viết bản tự kiểm điểm, phân công bạn hỗ trợ..."
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-blue-500 outline-hidden"
                />
              </div>

              {/* Row 4: Student Exchange & Parent Coordination */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Nội dung trao đổi với Học viên
                  </label>
                  <textarea
                    rows={2}
                    value={hStudentExchange}
                    onChange={(e) => setHStudentExchange(e.target.value)}
                    placeholder="VD: Học sinh nhận thức rõ khuyết điểm, hứa quyết tâm khắc phục..."
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-blue-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Nội dung phối hợp với Phụ huynh
                  </label>
                  <textarea
                    rows={2}
                    value={hParentCoordination}
                    onChange={(e) => setHParentCoordination(e.target.value)}
                    placeholder="VD: Đã liên hệ qua điện thoại/Zalo để gia đình đôn đốc học sinh..."
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-blue-500 outline-hidden"
                  />
                </div>
              </div>

              {/* Row 5: Handling Result & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Kết quả xử lý / Đánh giá sau can thiệp
                  </label>
                  <input
                    type="text"
                    value={hHandlingResult}
                    onChange={(e) => setHHandlingResult(e.target.value)}
                    placeholder="VD: Học sinh có chuyển biến tốt, đi học đúng giờ..."
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 focus:border-blue-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Trạng thái theo dõi <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={hStatus}
                    onChange={(e) => setHStatus(e.target.value as ViolationHandlingStatus)}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs font-bold focus:border-blue-500 outline-hidden bg-white"
                  >
                    <option value="WARNING">⚠️ Cảnh báo (Cần chú ý theo dõi)</option>
                    <option value="PROCESSING">⏳ Đang xử lý (Đang can thiệp / theo dõi nề nếp)</option>
                    <option value="RESOLVED">✅ Đã ổn định (Đã hoàn thành xử lý và tiến bộ)</option>
                  </select>
                </div>
              </div>

              {/* Row 6: Teacher Notes */}
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Ghi chú riêng của GVCN (Bảo mật nội bộ)
                </label>
                <input
                  type="text"
                  value={hTeacherNotes}
                  onChange={(e) => setHTeacherNotes(e.target.value)}
                  placeholder="Ghi chú thêm của giáo viên chủ nhiệm..."
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-blue-500 outline-hidden"
                />
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsHandlingFormModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <Save className="h-4 w-4" />
                  <span>{handlingExistingRecord ? 'LƯU CẬP NHẬT' : 'LƯU HỒ SƠ XỬ LÝ'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
