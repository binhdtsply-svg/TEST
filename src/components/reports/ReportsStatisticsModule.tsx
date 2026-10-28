/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  BarChart3,
  FileSpreadsheet,
  Printer,
  Download,
  Calendar,
  Filter,
  Users,
  Award,
  BookOpen,
  TreePine,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Search,
  Sparkles,
  ShieldCheck,
  CheckSquare,
  Square,
  Clock,
  Paperclip,
  Check,
  ChevronDown,
  FileText,
  UserCheck,
  Eye,
  X,
  GraduationCap,
  Medal,
  ChevronRight
} from 'lucide-react';
import { authService } from '../../services/AuthService';
import { studentService } from '../../services/StudentService';
import { classService } from '../../services/ClassService';
import { trainingService } from '../../services/TrainingService';
import { academicService } from '../../services/AcademicService';
import { submissionService } from '../../services/SubmissionService';
import { exportService } from '../../services/ExportService';
import { fullYearReportService, ClassFullYearReportData, StudentFullYearReportData, ReportPeriod } from '../../services/FullYearReportService';
import { conductEvaluationService } from '../../services/ConductEvaluationService';
import { useStudents } from '../../hooks/useStudents';
import { Student } from '../../types';

export const CONTENT_TYPE_OPTIONS = [
  { id: 'all', label: 'Tất cả nội dung' },
  { id: 'nghi_co_phep', label: 'Nghỉ có phép' },
  { id: 'nghi_khong_phep', label: 'Nghỉ không phép' },
  { id: 'di_tre', label: 'Đi trễ' },
  { id: 'vi_pham', label: 'Vi phạm' },
  { id: 'khen_thuong', label: 'Khen thưởng' },
  { id: 'viec_tot', label: 'Việc tốt & Giúp bạn' },
  { id: 'tien_bo', label: 'Tiến bộ học tập' },
  { id: 'diem_cong', label: 'Điểm cộng rèn luyện' },
  { id: 'diem_tru', label: 'Điểm trừ rèn luyện' },
  { id: 'hoc_tap', label: 'Kết quả học tập' },
  { id: 'bao_bai', label: 'Báo bài & Dặn dò' },
  { id: 'kiem_tra', label: 'Lịch kiểm tra' },
  { id: 'phong_trao', label: 'Hoạt động phong trào' },
  { id: 'nguyet_que', label: 'Cây Nguyệt Quế' }
];

export interface ReportPreviewRow {
  id: string;
  stt: number;
  studentId: string;
  studentName: string;
  studentCode: string;
  group: number;
  date: string;
  rawDate: string;
  contentType: string;
  categoryLabel: string;
  content: string;
  points: number;
  recordedBy: string;
  status: 'Đã duyệt' | 'Chính thức' | 'Chờ duyệt' | 'Từ chối';
  proofUrl?: string;
}

export const ReportsStatisticsModule: React.FC = () => {
  const currentUser = authService.getCurrentUser();
  const classSettings = classService.getSettings();
  const isTeacher = currentUser.role === 'TEACHER';

  // Primary active module section: 'full_year' | 'events_log'
  const [activeReportSection, setActiveReportSection] = useState<'full_year' | 'events_log'>('full_year');

  // Report Period Selection: 'hk1' | 'hk2' | 'full_year' (Default: 'full_year')
  const [reportPeriod, setReportPeriod] = useState<'hk1' | 'hk2' | 'full_year'>('full_year');

  // Full-Year Sub-View: 'class_summary' | 'individual_student'
  const [fullYearSubView, setFullYearSubView] = useState<'class_summary' | 'individual_student'>('class_summary');
  const [selectedIndividualStudentId, setSelectedIndividualStudentId] = useState<string>('');
  const [individualModalStudentId, setIndividualModalStudentId] = useState<string | null>(null);

  // Search & Filter for Full-Year class table
  const [classTableSearch, setClassTableSearch] = useState<string>('');
  const [classTableGroupFilter, setClassTableGroupFilter] = useState<string>('all');
  const [classTableTierFilter, setClassTableTierFilter] = useState<string>('all');

  // Multi-Dimensional Log Filters (for events_log tab)
  const [selectedScope, setSelectedScope] = useState<'all' | 'group' | 'student' | 'multiple_students'>('all');
  const [selectedGroup, setSelectedGroup] = useState<number>(1);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [selectedContentTypes, setSelectedContentTypes] = useState<string[]>(['all']);
  const [periodType, setPeriodType] = useState<'today' | 'this_week' | 'this_month' | 'hk1' | 'hk2' | 'full_year' | 'custom'>('full_year');
  const [fromDate, setFromDate] = useState<string>('2025-09-01');
  const [toDate, setToDate] = useState<string>('2026-05-31');
  const [searchQuery, setSearchQuery] = useState('');

  const students = useStudents();
  const [dataVersion, setDataVersion] = useState(0);
  const transactions = trainingService.getAllTransactions();
  const submissions = submissionService.getAll();

  useEffect(() => {
    academicService.syncWithBackendServer().catch(() => {});
    const unsubConduct = conductEvaluationService.subscribe(() => {
      setDataVersion(v => v + 1);
    });
    const unsubAcademic = academicService.subscribe(() => {
      setDataVersion(v => v + 1);
    });
    const unsubTraining = trainingService.subscribe(() => {
      setDataVersion(v => v + 1);
    });
    const unsubClass = classService.subscribe(() => {
      setDataVersion(v => v + 1);
    });
    return () => {
      unsubConduct();
      unsubAcademic();
      unsubTraining();
      unsubClass();
    };
  }, []);

  // Set default individual student if empty
  useEffect(() => {
    if (!selectedIndividualStudentId && students.length > 0) {
      setSelectedIndividualStudentId(students[0].id);
    }
  }, [students, selectedIndividualStudentId]);

  // Compute Full Year Class Report Data directly from live services
  const classFullYearData: ClassFullYearReportData = useMemo(() => {
    return fullYearReportService.getClassFullYearReport();
  }, [students, transactions, submissions, dataVersion]);

  // Compute selected individual student report data
  const selectedStudentReportData: StudentFullYearReportData | null = useMemo(() => {
    if (!selectedIndividualStudentId) return null;
    return fullYearReportService.getStudentFullYearReport(selectedIndividualStudentId);
  }, [selectedIndividualStudentId, students, transactions, submissions, dataVersion]);

  // Compute modal student report data if opened
  const modalStudentReportData: StudentFullYearReportData | null = useMemo(() => {
    if (!individualModalStudentId) return null;
    return fullYearReportService.getStudentFullYearReport(individualModalStudentId);
  }, [individualModalStudentId, students, transactions, submissions, dataVersion]);

  // Active summary stats based on selected report period
  const activeSummary = useMemo(() => {
    if (reportPeriod === 'hk1') return classFullYearData.summaryHk1 || classFullYearData.summary;
    if (reportPeriod === 'hk2') return classFullYearData.summaryHk2 || classFullYearData.summary;
    return classFullYearData.summary;
  }, [classFullYearData, reportPeriod]);

  // Filtered rows for the class report table
  const filteredClassRows = useMemo(() => {
    return classFullYearData.rows.filter(r => {
      if (classTableGroupFilter !== 'all' && r.group.toString() !== classTableGroupFilter) {
        return false;
      }
      const academicRes = reportPeriod === 'hk1'
        ? (r.academicResultHk1 || r.academicResult)
        : reportPeriod === 'hk2'
        ? (r.academicResultHk2 || r.academicResult)
        : r.academicResult;

      if (classTableTierFilter !== 'all' && academicRes !== classTableTierFilter) {
        return false;
      }
      if (classTableSearch.trim()) {
        const q = classTableSearch.toLowerCase();
        const matchName = r.studentName.toLowerCase().includes(q);
        const matchCode = r.studentCode.toLowerCase().includes(q);
        if (!matchName && !matchCode) return false;
      }
      return true;
    });
  }, [classFullYearData.rows, classTableGroupFilter, classTableTierFilter, classTableSearch, reportPeriod]);

  // Guard: Teacher only
  if (!isTeacher) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50/60 p-8 text-center animate-fade-in">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-600 mb-3">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <h3 className="text-base font-extrabold text-red-800">Không có quyền truy cập</h3>
        <p className="text-xs text-red-600 mt-1 max-w-md mx-auto">
          Phân hệ "Báo cáo & Thống kê" chỉ dành riêng cho Giáo viên chủ nhiệm để trích xuất dữ liệu tổng hợp phục vụ công tác quản lý và báo cáo nhà trường.
        </p>
      </div>
    );
  }

  // --- Handlers for Exporting Reports (HK1 / HK2 / Cả năm) ---
  const filterClassReportRows = (rows: ClassFullYearReportData['rows']) => {
    return rows
      .filter(r => {
        if (classTableGroupFilter !== 'all' && r.group.toString() !== classTableGroupFilter) {
          return false;
        }
        const academicRes = reportPeriod === 'hk1'
          ? (r.academicResultHk1 || r.academicResult)
          : reportPeriod === 'hk2'
          ? (r.academicResultHk2 || r.academicResult)
          : r.academicResult;

        if (classTableTierFilter !== 'all' && academicRes !== classTableTierFilter) {
          return false;
        }
        if (classTableSearch.trim()) {
          const q = classTableSearch.toLowerCase();
          const matchName = r.studentName.toLowerCase().includes(q);
          const matchCode = r.studentCode.toLowerCase().includes(q);
          if (!matchName && !matchCode) return false;
        }
        return true;
      })
      .map((r, idx) => ({ ...r, stt: idx + 1 }));
  };

  const handleExportClassExcel = async () => {
    const synced = await academicService.syncWithBackendServer(undefined, true);
    if (!synced) return;
    const freshData = fullYearReportService.getClassFullYearReport();
    const targetRows = filterClassReportRows(freshData.rows);
    exportService.exportClassReportToExcel({ ...freshData, rows: targetRows }, reportPeriod);
  };

  const handleExportClassCSV = async () => {
    const synced = await academicService.syncWithBackendServer(undefined, true);
    if (!synced) return;
    const freshData = fullYearReportService.getClassFullYearReport();
    const targetRows = filterClassReportRows(freshData.rows);
    const periodLabel = reportPeriod === 'hk1' ? 'HocKy1' : reportPeriod === 'hk2' ? 'HocKy2' : 'CaNam';
    const flatData = targetRows.map(r => {
      const rowObj: Record<string, any> = {
        'STT': r.stt,
        'Họ và tên': r.studentName,
        'Mã học viên': r.studentCode,
        'Tổ': `Tổ ${r.group}`
      };

      if (reportPeriod === 'hk1') {
        freshData.appliedSubjects.forEach(sub => {
          const sName = sub.name || (sub as any).subjectName || 'Môn';
          const sc = r.subjectScores[sName] || {};
          rowObj[`${sName} (TB HKI)`] = sc.tbHk1 !== undefined ? sc.tbHk1 : '';
        });
        rowObj['Nghỉ có phép'] = r.excusedAbsencesHk1 ?? 0;
        rowObj['Nghỉ không phép'] = r.unexcusedAbsencesHk1 ?? 0;
        rowObj['Kết quả học tập'] = r.academicResultHk1 || 'Chưa xếp loại';
        rowObj['Rèn luyện HKI'] = r.conductHk1 || 'Chưa đánh giá';
        rowObj['Danh hiệu'] = r.honorTitleHk1 || '';
        rowObj['Ghi chú'] = r.autoSummaryNoteHk1 || '';
      } else if (reportPeriod === 'hk2') {
        freshData.appliedSubjects.forEach(sub => {
          const sName = sub.name || (sub as any).subjectName || 'Môn';
          const sc = r.subjectScores[sName] || {};
          rowObj[`${sName} - TB HKI`] = sc.tbHk1 !== undefined ? sc.tbHk1 : '';
          rowObj[`${sName} - TB HKII`] = sc.tbHk2 !== undefined ? sc.tbHk2 : '';
          rowObj[`${sName} - Cả năm`] = sc.tbCaNam !== undefined ? sc.tbCaNam : '';
        });
        rowObj['Nghỉ có phép'] = r.excusedAbsencesHk2 ?? 0;
        rowObj['Nghỉ không phép'] = r.unexcusedAbsencesHk2 ?? 0;
        rowObj['Kết quả học tập'] = r.academicResultHk2 || 'Chưa xếp loại';
        rowObj['Rèn luyện HKI'] = r.conductHk1 || 'Chưa đánh giá';
        rowObj['Rèn luyện HKII'] = r.conductHk2 || 'Chưa đánh giá';
        rowObj['Rèn luyện cả năm'] = r.conductCaNam || 'Chưa đánh giá';
        rowObj['Danh hiệu'] = r.honorTitleHk2 || '';
        rowObj['Ghi chú'] = r.autoSummaryNoteHk2 || '';
      } else {
        freshData.appliedSubjects.forEach(sub => {
          const sName = sub.name || (sub as any).subjectName || 'Môn';
          const sc = r.subjectScores[sName] || {};
          rowObj[`${sName} - TB HKI`] = sc.tbHk1 !== undefined ? sc.tbHk1 : '';
          rowObj[`${sName} - TB HKII`] = sc.tbHk2 !== undefined ? sc.tbHk2 : '';
          rowObj[`${sName} - Cả năm`] = sc.tbCaNam !== undefined ? sc.tbCaNam : '';
        });
        rowObj['Nghỉ có phép'] = r.excusedAbsences;
        rowObj['Nghỉ không phép'] = r.unexcusedAbsences;
        rowObj['Kết quả học tập'] = r.academicResult;
        rowObj['Rèn luyện HKI'] = r.conductHk1;
        rowObj['Rèn luyện HKII'] = r.conductHk2;
        rowObj['Rèn luyện cả năm'] = r.conductCaNam;
        rowObj['Danh hiệu'] = r.honorTitle;
        rowObj['Ghi chú'] = r.autoSummaryNote;
      }

      return rowObj;
    });

    exportService.exportToCSV(flatData, `BaoCao_${periodLabel}_ToanLop_${freshData.className.replace(/\s+/g, '_')}`);
  };

  const handleExportIndividualStudentExcel = async (reportData: StudentFullYearReportData) => {
    const synced = await academicService.syncWithBackendServer(undefined, true);
    if (!synced) return;
    const freshStudentReport = fullYearReportService.getStudentFullYearReport(reportData.student.id) || reportData;
    exportService.exportStudentReportToExcel(freshStudentReport, reportPeriod);
  };

  const handlePrintFullYear = () => {
    window.print();
  };

  // --- Multi-dimensional log filter logic ---
  const toggleStudentSelection = (sId: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(sId) ? prev.filter(id => id !== sId) : [...prev, sId]
    );
  };
  const selectAllStudents = () => setSelectedStudentIds(students.map(s => s.id));
  const clearAllStudents = () => setSelectedStudentIds([]);

  const toggleContentType = (typeId: string) => {
    if (typeId === 'all') {
      setSelectedContentTypes(['all']);
      return;
    }
    let next = selectedContentTypes.filter(t => t !== 'all');
    if (next.includes(typeId)) {
      next = next.filter(t => t !== typeId);
    } else {
      next.push(typeId);
    }
    if (next.length === 0) {
      next = ['all'];
    }
    setSelectedContentTypes(next);
  };

  const scopedStudents = useMemo(() => {
    return students.filter(s => {
      if (selectedScope === 'group') return s.group === selectedGroup;
      if (selectedScope === 'student') return selectedStudentId ? s.id === selectedStudentId : true;
      if (selectedScope === 'multiple_students') {
        return selectedStudentIds.length > 0 ? selectedStudentIds.includes(s.id) : true;
      }
      return true;
    });
  }, [students, selectedScope, selectedGroup, selectedStudentId, selectedStudentIds]);

  const scopedStudentIds = useMemo(() => new Set(scopedStudents.map(s => s.id)), [scopedStudents]);

  const reportRows = useMemo<ReportPreviewRow[]>(() => {
    const rows: ReportPreviewRow[] = [];
    const hasAll = selectedContentTypes.includes('all');
    const seenTxIds = new Set<string>();

    // 1. Training Transactions
    transactions.forEach(t => {
      if (!fullYearReportService.isApprovedTransaction(t)) return;
      if (t.id) {
        if (seenTxIds.has(t.id)) return;
        seenTxIds.add(t.id);
      }
      const stu = students.find(
        s => s.id === t.studentId || (s.code && String(t.studentId || '').trim().toLowerCase() === s.code.trim().toLowerCase())
      );
      if (!stu || !scopedStudentIds.has(stu.id)) return;

      if (periodType === 'hk1' && fullYearReportService.resolveTransactionSemester(t, classSettings) !== 'hk1') {
        return;
      }
      if (periodType === 'hk2' && fullYearReportService.resolveTransactionSemester(t, classSettings) !== 'hk2') {
        return;
      }

      const catLower = (t.category || '').toLowerCase();
      const reasonLower = (t.reason || '').toLowerCase();
      const absenceKind = fullYearReportService.classifyAbsenceTransaction(t);

      let typeKey = 'diem_cong';
      if (t.points < 0) typeKey = 'diem_tru';
      if (catLower.includes('vi phạm') || reasonLower.includes('vi phạm')) typeKey = 'vi_pham';
      if (absenceKind === 'excused') typeKey = 'nghi_co_phep';
      if (absenceKind === 'unexcused') typeKey = 'nghi_khong_phep';
      if (catLower.includes('đi trễ') || reasonLower.includes('trễ') || reasonLower.includes('muộn')) typeKey = 'di_tre';
      if (catLower.includes('việc tốt') || reasonLower.includes('giúp')) typeKey = 'viec_tot';
      if (catLower.includes('tiến bộ') || reasonLower.includes('tiến bộ')) typeKey = 'tien_bo';
      if (catLower.includes('khen thưởng') || reasonLower.includes('khen')) typeKey = 'khen_thuong';
      if (catLower.includes('phong trào') || catLower.includes('hoạt động')) typeKey = 'phong_trao';

      if (!hasAll && !selectedContentTypes.includes(typeKey)) {
        if (t.points > 0 && !selectedContentTypes.includes('diem_cong')) return;
        if (t.points < 0 && !selectedContentTypes.includes('diem_tru')) return;
        if (t.points === 0) return;
      }

      const itemDate = t.eventDate || t.createdAt || t.timestamp || '';
      const proofUrl = (t as any).proofUrl || t.evidenceFiles?.[0]?.url;

      rows.push({
        id: `trans-${t.id}`,
        stt: 0,
        studentId: stu.id,
        studentName: stu.fullName,
        studentCode: stu.code,
        group: stu.group,
        date: itemDate,
        rawDate: itemDate,
        contentType: typeKey,
        categoryLabel: t.category || (t.points >= 0 ? 'Điểm cộng' : 'Điểm trừ'),
        content: t.reason || 'Ghi nhận rèn luyện',
        points: t.points,
        recordedBy: t.recordedBy || 'GVCN',
        status: 'Chính thức',
        proofUrl
      });
    });

    // 2. Submissions / Quick Reports
    submissions.forEach(sub => {
      if (!sub.studentId || !scopedStudentIds.has(sub.studentId)) return;
      const stu = students.find(s => s.id === sub.studentId);
      if (!stu) return;

      let typeKey = sub.submissionType === 'violation' ? 'vi_pham' : sub.submissionType === 'good_deed' ? 'viec_tot' : 'diem_cong';
      const descLower = (sub.description || '').toLowerCase();
      if (descLower.includes('không phép')) typeKey = 'nghi_khong_phep';
      else if (descLower.includes('có phép')) typeKey = 'nghi_co_phep';
      else if (descLower.includes('đi trễ') || descLower.includes('muộn')) typeKey = 'di_tre';

      if (!hasAll && !selectedContentTypes.includes(typeKey)) return;

      const itemDate = sub.eventDate || (sub.proposedAt ? sub.proposedAt.slice(0, 10) : '');
      const proofUrl = sub.evidence?.[0]?.url || sub.evidenceFiles?.[0]?.url;

      rows.push({
        id: `sub-${sub.id}`,
        stt: 0,
        studentId: stu.id,
        studentName: stu.fullName,
        studentCode: stu.code,
        group: stu.group,
        date: itemDate,
        rawDate: itemDate,
        contentType: typeKey,
        categoryLabel: sub.category,
        content: sub.description,
        points: sub.proposedPoints || 0,
        recordedBy: sub.proposedBy,
        status: sub.status === 'approved' || sub.status === 'edited_and_approved' ? 'Đã duyệt' : sub.status === 'rejected' ? 'Từ chối' : 'Chờ duyệt',
        proofUrl
      });
    });

    let filtered = rows;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.studentName.toLowerCase().includes(q) ||
        r.studentCode.toLowerCase().includes(q) ||
        r.content.toLowerCase().includes(q) ||
        r.categoryLabel.toLowerCase().includes(q)
      );
    }

    return filtered.map((r, idx) => ({ ...r, stt: idx + 1 }));
  }, [transactions, submissions, students, scopedStudents, scopedStudentIds, selectedContentTypes, searchQuery, periodType, classSettings]);

  return (
    <div className="space-y-5 animate-fade-in pb-12">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-indigo-600" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
              TRUNG TÂM BÁO CÁO & THỐNG KÊ KẾT QUẢ
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Tổng hợp kết quả học tập & rèn luyện cả năm học theo Thông tư 43/2021/TT-BGDĐT cho Lớp {classSettings.className} — Năm học {classSettings.academicYear || '2025 - 2026'}
          </p>
        </div>

        {/* Period Selector & Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Period Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-2xs">
            <button
              type="button"
              onClick={() => setReportPeriod('hk1')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                reportPeriod === 'hk1'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              Học kỳ I
            </button>
            <button
              type="button"
              onClick={() => setReportPeriod('hk2')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                reportPeriod === 'hk2'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              Học kỳ II
            </button>
            <button
              type="button"
              onClick={() => setReportPeriod('full_year')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                reportPeriod === 'full_year'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              Cả năm
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportClassExcel}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white shadow-sm hover:bg-emerald-700 active:scale-95 transition-all cursor-pointer"
            title={`Xuất file Excel Báo cáo ${reportPeriod === 'hk1' ? 'Học kỳ I' : reportPeriod === 'hk2' ? 'Học kỳ II' : 'Cả năm'} toàn bộ học sinh trong lớp`}
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>
              XUẤT BÁO CÁO {reportPeriod === 'hk1' ? 'HỌC KỲ I' : reportPeriod === 'hk2' ? 'HỌC KỲ II' : 'CẢ NĂM'} – TOÀN LỚP
            </span>
          </button>

          <button
            type="button"
            onClick={handleExportClassCSV}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            title="Xuất định dạng CSV"
          >
            <Download className="h-4 w-4 text-slate-500" />
            <span>CSV</span>
          </button>

          <button
            type="button"
            onClick={handlePrintFullYear}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            title="In hoặc lưu file PDF"
          >
            <Printer className="h-4 w-4 text-slate-500" />
            <span>In / PDF</span>
          </button>
        </div>
      </div>

      {/* Main Section Navigation Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveReportSection('full_year')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition-all cursor-pointer ${
              activeReportSection === 'full_year'
                ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200/50'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <GraduationCap className="h-4 w-4 text-indigo-600" />
            <span>KẾT QUẢ HỌC TẬP – RÈN LUYỆN CẢ NĂM</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveReportSection('events_log')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition-all cursor-pointer ${
              activeReportSection === 'events_log'
                ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200/50'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <FileText className="h-4 w-4 text-slate-600" />
            <span>NHẬT KÝ SỰ KIỆN & ĐIỂM RÈN LUYỆN</span>
          </button>
        </div>

        {activeReportSection === 'full_year' && (
          <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setFullYearSubView('class_summary')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                fullYearSubView === 'class_summary'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Báo cáo Toàn Lớp
            </button>
            <button
              type="button"
              onClick={() => setFullYearSubView('individual_student')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                fullYearSubView === 'individual_student'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Báo cáo Cá Nhân Học Viên
            </button>
          </div>
        )}
      </div>

      {/* SECTION 1: FULL YEAR REPORT (KẾT QUẢ HỌC TẬP – RÈN LUYỆN CẢ NĂM) */}
      {activeReportSection === 'full_year' && (
        <div className="space-y-5">
          {/* Aggregated Class Stats KPI Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-3.5 shadow-2xs">
              <div className="flex items-center justify-between text-indigo-700 text-[11px] font-bold">
                <span>Tổng sĩ số</span>
                <Users className="h-3.5 w-3.5" />
              </div>
              <div className="text-2xl font-black text-indigo-950 mt-1">
                {activeSummary.totalStudents} <span className="text-xs font-semibold">HV</span>
              </div>
              <div className="text-[10px] text-indigo-600 mt-0.5">Lớp {classFullYearData.className}</div>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3.5 shadow-2xs">
              <div className="flex items-center justify-between text-emerald-700 text-[11px] font-bold">
                <span>Học tập {reportPeriod === 'hk1' ? 'HKI' : reportPeriod === 'hk2' ? 'HKII' : ''}: TỐT</span>
                <Award className="h-3.5 w-3.5" />
              </div>
              <div className="text-2xl font-black text-emerald-950 mt-1">
                {activeSummary.totCount} <span className="text-xs font-semibold text-emerald-700">({activeSummary.totPercent}%)</span>
              </div>
              <div className="text-[10px] text-emerald-600 mt-0.5">Đạt chuẩn Thông tư 43</div>
            </div>

            <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-3.5 shadow-2xs">
              <div className="flex items-center justify-between text-blue-700 text-[11px] font-bold">
                <span>Học tập {reportPeriod === 'hk1' ? 'HKI' : reportPeriod === 'hk2' ? 'HKII' : ''}: KHÁ</span>
                <BookOpen className="h-3.5 w-3.5" />
              </div>
              <div className="text-2xl font-black text-blue-950 mt-1">
                {activeSummary.khaCount} <span className="text-xs font-semibold text-blue-700">({activeSummary.khaPercent}%)</span>
              </div>
              <div className="text-[10px] text-blue-600 mt-0.5">Đạt chuẩn khá</div>
            </div>

            <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-3.5 shadow-2xs">
              <div className="flex items-center justify-between text-amber-700 text-[11px] font-bold">
                <span>Học tập {reportPeriod === 'hk1' ? 'HKI' : reportPeriod === 'hk2' ? 'HKII' : ''}: ĐẠT</span>
                <CheckCircle2 className="h-3.5 w-3.5" />
              </div>
              <div className="text-2xl font-black text-amber-950 mt-1">
                {activeSummary.datCount} <span className="text-xs font-semibold text-amber-700">({activeSummary.datPercent}%)</span>
              </div>
              <div className="text-[10px] text-amber-700 mt-0.5">Hoàn thành chương trình</div>
            </div>

            <div className="rounded-2xl border border-purple-100 bg-purple-50/70 p-3.5 shadow-2xs">
              <div className="flex items-center justify-between text-purple-700 text-[11px] font-bold">
                <span>Khen thưởng {reportPeriod === 'hk1' ? 'HKI' : reportPeriod === 'hk2' ? 'HKII' : 'cuối năm'}</span>
                <Medal className="h-3.5 w-3.5" />
              </div>
              <div className="text-lg font-black text-purple-950 mt-1">
                {activeSummary.xuatSacCount > 0 && <span>{activeSummary.xuatSacCount} Xuất sắc</span>}
                {activeSummary.xuatSacCount > 0 && activeSummary.gioiCount > 0 && <span> • </span>}
                {activeSummary.gioiCount > 0 && <span>{activeSummary.gioiCount} Giỏi</span>}
                {activeSummary.xuatSacCount === 0 && activeSummary.gioiCount === 0 && <span>Chưa có</span>}
              </div>
              <div className="text-[10px] text-purple-600 mt-0.5">Danh hiệu theo TT 43</div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 shadow-2xs">
              <div className="flex items-center justify-between text-slate-700 text-[11px] font-bold">
                <span>Tổng lượt nghỉ học {reportPeriod === 'hk1' ? 'HKI' : reportPeriod === 'hk2' ? 'HKII' : ''}</span>
                <Clock className="h-3.5 w-3.5" />
              </div>
              <div className="text-lg font-black text-slate-900 mt-1">
                <span className="text-blue-700">{activeSummary.totalExcusedAbsences} CP</span>
                <span className="text-slate-400 mx-1">/</span>
                <span className="text-rose-700">{activeSummary.totalUnexcusedAbsences} KP</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {reportPeriod === 'hk1' ? 'Tổng hợp chuyên cần HKI' : reportPeriod === 'hk2' ? 'Tổng hợp chuyên cần HKII' : 'Tổng hợp chuyên cần cả năm'}
              </div>
            </div>
          </div>

          {/* VIEW A: BÁO CÁO TOÀN LỚP */}
          {fullYearSubView === 'class_summary' && (
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs space-y-3">
              {/* Header Info Banner & Filters */}
              <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70 space-y-3">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <h2 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                      <FileSpreadsheet className="h-5 w-5 text-indigo-600" />
                      <span>
                        {reportPeriod === 'hk1'
                          ? 'BẢNG TỔNG HỢP KẾT QUẢ HỌC TẬP – RÈN LUYỆN HỌC KỲ I'
                          : reportPeriod === 'hk2'
                          ? 'BẢNG TỔNG HỢP KẾT QUẢ HỌC TẬP – RÈN LUYỆN HỌC KỲ II'
                          : 'BẢNG TỔNG HỢP KẾT QUẢ HỌC TẬP – RÈN LUYỆN CẢ NĂM'}
                      </span>
                    </h2>
                    <p className="text-xs text-slate-600 mt-0.5 font-medium">
                      Lớp: <b className="text-slate-900">{classFullYearData.className}</b> • Năm học: <b className="text-slate-900">{classFullYearData.schoolYear}</b> • GVCN: <b className="text-slate-900">{classFullYearData.teacherName}</b>
                    </p>
                  </div>
                  <div className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100 shrink-0">
                    Hiển thị {filteredClassRows.length}/{classFullYearData.rows.length} học viên • {classFullYearData.appliedSubjects.length} môn học
                  </div>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-200/60">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Tìm theo tên học viên, mã HV..."
                      value={classTableSearch}
                      onChange={(e) => setClassTableSearch(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <select
                      value={classTableGroupFilter}
                      onChange={(e) => setClassTableGroupFilter(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500"
                    >
                      <option value="all">-- Lọc theo tất cả các Tổ --</option>
                      <option value="1">Tổ 1</option>
                      <option value="2">Tổ 2</option>
                      <option value="3">Tổ 3</option>
                      <option value="4">Tổ 4</option>
                    </select>
                  </div>

                  <div>
                    <select
                      value={classTableTierFilter}
                      onChange={(e) => setClassTableTierFilter(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500"
                    >
                      <option value="all">-- Lọc theo Kết quả học tập --</option>
                      <option value="Tốt">Mức Tốt</option>
                      <option value="Khá">Mức Khá</option>
                      <option value="Đạt">Mức Đạt</option>
                      <option value="Chưa đạt">Mức Chưa đạt</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Table with Dynamic Headers according to reportPeriod */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    {/* Header Row 1 */}
                    <tr className="bg-slate-100 text-slate-700 font-black text-[11px] uppercase tracking-wider border-b border-slate-300">
                      <th rowSpan={reportPeriod === 'hk1' ? 1 : 2} className="p-2.5 text-center w-10 border-r border-slate-200 bg-slate-200/70">TT</th>
                      <th rowSpan={reportPeriod === 'hk1' ? 1 : 2} className="p-2.5 min-w-[160px] border-r border-slate-200 bg-slate-200/70 sticky left-0 z-10">Họ và tên</th>
                      <th rowSpan={reportPeriod === 'hk1' ? 1 : 2} className="p-2.5 min-w-[100px] border-r border-slate-200 bg-slate-200/70">Mã HV</th>
                      <th rowSpan={reportPeriod === 'hk1' ? 1 : 2} className="p-2.5 text-center min-w-[60px] border-r border-slate-200 bg-slate-200/70">Tổ</th>

                      {/* Subject Group Headers */}
                      {classFullYearData.appliedSubjects.map(sub => (
                        <th
                          key={sub.id}
                          colSpan={reportPeriod === 'hk1' ? 1 : 3}
                          className="p-2 text-center border-r border-slate-200 bg-indigo-50/70 text-indigo-950 font-black"
                        >
                          {sub.name || (sub as any).subjectName}
                          {reportPeriod === 'hk1' && <span className="block text-[10px] font-bold text-indigo-700 mt-0.5">(TB HKI)</span>}
                        </th>
                      ))}

                      {/* Final Summary Columns */}
                      <th rowSpan={reportPeriod === 'hk1' ? 1 : 2} className="p-2 text-center min-w-[70px] border-r border-slate-200 bg-blue-50/80 text-blue-950">Nghỉ CP</th>
                      <th rowSpan={reportPeriod === 'hk1' ? 1 : 2} className="p-2 text-center min-w-[70px] border-r border-slate-200 bg-rose-50/80 text-rose-950">Nghỉ KP</th>
                      <th rowSpan={reportPeriod === 'hk1' ? 1 : 2} className="p-2 text-center min-w-[110px] border-r border-slate-200 bg-emerald-50/80 text-emerald-950">
                        KQ Học tập {reportPeriod === 'hk1' ? 'HKI' : reportPeriod === 'hk2' ? 'HKII' : ''}
                      </th>
                      {reportPeriod === 'hk1' ? (
                        <th className="p-2 text-center min-w-[90px] border-r border-slate-200 bg-amber-50/80 text-amber-950">RL HKI</th>
                      ) : (
                        <>
                          <th rowSpan={2} className="p-2 text-center min-w-[75px] border-r border-slate-200 bg-slate-100">RL HKI</th>
                          <th rowSpan={2} className="p-2 text-center min-w-[75px] border-r border-slate-200 bg-slate-100">RL HKII</th>
                          <th rowSpan={2} className="p-2 text-center min-w-[85px] border-r border-slate-200 bg-amber-50/80 text-amber-950">RL Cả năm</th>
                        </>
                      )}
                      <th rowSpan={reportPeriod === 'hk1' ? 1 : 2} className="p-2 text-center min-w-[120px] border-r border-slate-200 bg-purple-50/80 text-purple-950">Danh hiệu</th>
                      <th rowSpan={reportPeriod === 'hk1' ? 1 : 2} className="p-2.5 min-w-[200px] border-r border-slate-200">Ghi chú</th>
                      <th rowSpan={reportPeriod === 'hk1' ? 1 : 2} className="p-2 text-center min-w-[80px]">Thao tác</th>
                    </tr>

                    {/* Header Row 2: Sub-headers (TB HKI | TB HKII | Cả năm) for HKII & Full Year */}
                    {reportPeriod !== 'hk1' && (
                      <tr className="bg-slate-50 text-slate-600 font-bold text-[10px] border-b border-slate-300">
                        {classFullYearData.appliedSubjects.map(sub => (
                          <React.Fragment key={`sub-cols-${sub.id}`}>
                            <th className="p-1.5 text-center border-r border-slate-200 bg-slate-50 w-12">HKI</th>
                            <th className="p-1.5 text-center border-r border-slate-200 bg-slate-50 w-12">HKII</th>
                            <th className="p-1.5 text-center border-r border-slate-200 bg-indigo-50/50 text-indigo-900 font-black w-12">C.Năm</th>
                          </React.Fragment>
                        ))}
                      </tr>
                    )}
                  </thead>

                  <tbody className="divide-y divide-slate-200">
                    {filteredClassRows.length > 0 ? (
                      filteredClassRows.map(r => {
                        const excused = reportPeriod === 'hk1'
                          ? (r.excusedAbsencesHk1 ?? 0)
                          : reportPeriod === 'hk2'
                          ? (r.excusedAbsencesHk2 ?? 0)
                          : r.excusedAbsences;
                        const unexcused = reportPeriod === 'hk1'
                          ? (r.unexcusedAbsencesHk1 ?? 0)
                          : reportPeriod === 'hk2'
                          ? (r.unexcusedAbsencesHk2 ?? 0)
                          : r.unexcusedAbsences;
                        const academicResultVal = reportPeriod === 'hk1'
                          ? (r.academicResultHk1 || 'Chưa xếp loại')
                          : reportPeriod === 'hk2'
                          ? (r.academicResultHk2 || 'Chưa xếp loại')
                          : r.academicResult;
                        const honorVal = reportPeriod === 'hk1'
                          ? (r.honorTitleHk1 || '')
                          : reportPeriod === 'hk2'
                          ? (r.honorTitleHk2 || '')
                          : r.honorTitle;
                        const noteVal = reportPeriod === 'hk1'
                          ? (r.autoSummaryNoteHk1 || '')
                          : reportPeriod === 'hk2'
                          ? (r.autoSummaryNoteHk2 || '')
                          : r.autoSummaryNote;

                        return (
                          <tr key={r.studentId} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-2.5 text-center font-bold text-slate-400 border-r border-slate-200">{r.stt}</td>
                            <td className="p-2.5 font-bold text-slate-900 whitespace-nowrap border-r border-slate-200 sticky left-0 bg-white z-0">
                              {r.studentName}
                            </td>
                            <td className="p-2.5 font-mono text-slate-600 border-r border-slate-200 whitespace-nowrap">{r.studentCode}</td>
                            <td className="p-2 text-center font-semibold text-slate-600 border-r border-slate-200">Tổ {r.group}</td>

                            {/* Subject Scores */}
                            {classFullYearData.appliedSubjects.map(sub => {
                              const sName = sub.name || (sub as any).subjectName;
                              const sc = r.subjectScores[sName] || {};
                              const isComment = sub.assessmentMode === 'COMMENT_ONLY';

                              if (reportPeriod === 'hk1') {
                                return (
                                  <td key={`score-${r.studentId}-${sub.id}`} className="p-2 text-center border-r border-slate-200 font-bold text-slate-900 bg-indigo-50/20">
                                    {isComment ? (
                                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${sc.tbHk1 === 'Chưa đạt' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                        {sc.tbHk1 || 'Đạt'}
                                      </span>
                                    ) : (
                                      sc.tbHk1 !== undefined && sc.tbHk1 !== '' ? (
                                        <span className={Number(sc.tbHk1) >= 8 ? 'text-indigo-700' : Number(sc.tbHk1) < 5 ? 'text-rose-600' : 'text-slate-900'}>
                                          {sc.tbHk1}
                                        </span>
                                      ) : '—'
                                    )}
                                  </td>
                                );
                              }

                              // HKII and Full Year: Display 3 Columns (TB HKI | TB HKII | Cả năm)
                              return (
                                <React.Fragment key={`score-${r.studentId}-${sub.id}`}>
                                  <td className="p-1.5 text-center border-r border-slate-200 font-medium text-slate-700">
                                    {isComment ? (sc.tbHk1 || 'Đạt') : (sc.tbHk1 !== undefined && sc.tbHk1 !== '' ? sc.tbHk1 : '—')}
                                  </td>
                                  <td className="p-1.5 text-center border-r border-slate-200 font-medium text-slate-700">
                                    {isComment ? (sc.tbHk2 || 'Đạt') : (sc.tbHk2 !== undefined && sc.tbHk2 !== '' ? sc.tbHk2 : '—')}
                                  </td>
                                  <td className="p-1.5 text-center border-r border-slate-200 font-black text-slate-950 bg-indigo-50/30">
                                    {isComment ? (
                                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${sc.tbCaNam === 'Chưa đạt' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                        {sc.tbCaNam || 'Đạt'}
                                      </span>
                                    ) : (
                                      sc.tbCaNam !== undefined && sc.tbCaNam !== '' ? (
                                        <span className={Number(sc.tbCaNam) >= 8 ? 'text-indigo-700' : Number(sc.tbCaNam) < 5 ? 'text-rose-600' : 'text-slate-900'}>
                                          {sc.tbCaNam}
                                        </span>
                                      ) : '—'
                                    )}
                                  </td>
                                </React.Fragment>
                              );
                            })}

                            {/* Excused & Unexcused Absences */}
                            <td className="p-2 text-center border-r border-slate-200 font-bold text-blue-700">
                              {excused > 0 ? `${excused}` : '0'}
                            </td>
                            <td className="p-2 text-center border-r border-slate-200 font-bold text-rose-700">
                              {unexcused > 0 ? `${unexcused}` : '0'}
                            </td>

                            {/* Academic Result (Tốt / Khá / Đạt / Chưa đạt) */}
                            <td className="p-2 text-center border-r border-slate-200 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded-lg text-[11px] font-black ${
                                academicResultVal === 'Tốt'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : academicResultVal === 'Khá'
                                  ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                  : academicResultVal === 'Đạt'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : academicResultVal === 'Chưa đạt'
                                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                  : 'bg-slate-100 text-slate-600'
                              }`}>
                                {academicResultVal}
                              </span>
                            </td>

                            {/* Conduct (HKI only in HKI mode, otherwise all 3) */}
                            {reportPeriod === 'hk1' ? (
                              <td className="p-2 text-center border-r border-slate-200 font-black text-slate-900 bg-amber-50/40">
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-900">
                                  {r.conductHk1 || 'Chưa đánh giá'}
                                </span>
                              </td>
                            ) : (
                              <>
                                <td className="p-2 text-center border-r border-slate-200 font-medium text-slate-700">{r.conductHk1}</td>
                                <td className="p-2 text-center border-r border-slate-200 font-medium text-slate-700">{r.conductHk2}</td>
                                <td className="p-2 text-center border-r border-slate-200 font-black text-slate-900 bg-amber-50/40">
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-900">
                                    {r.conductCaNam}
                                  </span>
                                </td>
                              </>
                            )}

                            {/* Honor Title */}
                            <td className="p-2 text-center border-r border-slate-200 whitespace-nowrap">
                              {honorVal ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black bg-purple-100 text-purple-900 border border-purple-200 shadow-2xs">
                                  <Medal className="h-3 w-3 text-purple-600" />
                                  <span>{honorVal}</span>
                                </span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>

                            {/* Auto Summary Notes */}
                            <td className="p-2.5 text-[11px] text-slate-700 font-medium max-w-xs border-r border-slate-200">
                              {noteVal || <span className="text-slate-300 italic">Không có</span>}
                            </td>

                            {/* Action Button */}
                            <td className="p-2 text-center whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => setIndividualModalStudentId(r.studentId)}
                                className="flex items-center gap-1 mx-auto px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-[10px] transition-colors cursor-pointer"
                                title="Xem chi tiết báo cáo của học viên này"
                              >
                                <Eye className="h-3 w-3" />
                                <span>Xem</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td
                          colSpan={reportPeriod === 'hk1' ? classFullYearData.appliedSubjects.length + 8 : classFullYearData.appliedSubjects.length * 3 + 12}
                          className="p-8 text-center text-xs text-slate-400 italic"
                        >
                          Không tìm thấy học sinh nào phù hợp với bộ lọc hiện tại.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW B: BÁO CÁO CHI TIẾT CÁ NHÂN HỌC VIÊN */}
          {fullYearSubView === 'individual_student' && selectedStudentReportData && (
            <div className="space-y-4">
              {/* Student Selector Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center gap-3">
                  <label className="text-xs font-bold text-slate-700 whitespace-nowrap">
                    Chọn học viên xem báo cáo:
                  </label>
                  <select
                    value={selectedIndividualStudentId}
                    onChange={(e) => setSelectedIndividualStudentId(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-900 outline-none focus:border-indigo-500 focus:bg-white"
                  >
                    {students.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.code} — {s.fullName} (Tổ {s.group})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleExportIndividualStudentExcel(selectedStudentReportData)}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-2xs cursor-pointer"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>Xuất Excel Cá Nhân</span>
                  </button>
                  <button
                    type="button"
                    onClick={handlePrintFullYear}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                  >
                    <Printer className="h-4 w-4 text-slate-500" />
                    <span>In Phiếu</span>
                  </button>
                </div>
              </div>

              {/* Individual Student Report Card */}
              <IndividualStudentReportView reportData={selectedStudentReportData} reportPeriod={reportPeriod} />
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: EVENTS & TRANSACTIONS LOG REPORT */}
      {activeReportSection === 'events_log' && (
        <div className="space-y-4">
          {/* Multi-Dimensional Filters Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Filter className="h-4 w-4 text-indigo-600" />
                <span>Bộ Lọc Sự Kiện & Nề Nếp</span>
              </h3>
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                {reportRows.length} bản ghi phù hợp
              </span>
            </div>

            {/* Scope & Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">1. Phạm vi báo cáo</label>
                <select
                  value={selectedScope}
                  onChange={(e) => setSelectedScope(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 font-semibold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                >
                  <option value="all">Toàn bộ lớp ({students.length} HS)</option>
                  <option value="group">Theo từng Tổ</option>
                  <option value="student">Từng cá nhân học sinh</option>
                  <option value="multiple_students">Nhiều học viên (Tùy chọn)</option>
                </select>
              </div>

              {selectedScope === 'group' && (
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">Chọn Tổ</label>
                  <select
                    value={selectedGroup}
                    onChange={(e) => setSelectedGroup(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 font-semibold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                  >
                    <option value={1}>Tổ 1</option>
                    <option value={2}>Tổ 2</option>
                    <option value={3}>Tổ 3</option>
                    <option value={4}>Tổ 4</option>
                  </select>
                </div>
              )}

              {selectedScope === 'student' && (
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">Chọn Học sinh</label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 font-semibold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                  >
                    <option value="">-- Tất cả học sinh --</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.code} - {s.fullName} (Tổ {s.group})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">2. Mốc thời gian</label>
                <select
                  value={periodType}
                  onChange={(e) => setPeriodType(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 font-semibold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                >
                  <option value="today">Hôm nay</option>
                  <option value="this_week">Tuần này</option>
                  <option value="this_month">Tháng này</option>
                  <option value="hk1">Học kỳ I</option>
                  <option value="hk2">Học kỳ II</option>
                  <option value="full_year">Cả năm học</option>
                  <option value="custom">Khoảng tùy chọn</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">3. Tìm kiếm từ khóa</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tên học sinh, nội dung..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Custom Date Range Picker */}
            {periodType === 'custom' && (
              <div className="flex flex-wrap items-center gap-3 bg-amber-50/70 p-3 rounded-xl border border-amber-200 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-amber-900">Từ ngày:</span>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 outline-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-amber-900">Đến ngày:</span>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 outline-none"
                  />
                </div>
              </div>
            )}

            {/* Multiple Students Selection Drawer */}
            {selectedScope === 'multiple_students' && (
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3.5 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-900">
                    Chọn danh sách học sinh cần thống kê ({selectedStudentIds.length}/{students.length} đã chọn):
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={selectAllStudents}
                      className="font-bold text-indigo-600 hover:underline cursor-pointer"
                    >
                      Chọn tất cả
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={clearAllStudents}
                      className="font-bold text-slate-500 hover:underline cursor-pointer"
                    >
                      Bỏ chọn
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 max-h-44 overflow-y-auto pr-1">
                  {students.map(s => {
                    const isSelected = selectedStudentIds.includes(s.id);
                    return (
                      <label
                        key={s.id}
                        className={`flex items-center gap-2 p-1.5 rounded-lg border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleStudentSelection(s.id)}
                          className="sr-only"
                        />
                        {isSelected ? <CheckSquare className="h-3.5 w-3.5 shrink-0" /> : <Square className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
                        <span className="truncate text-[11px]">{s.fullName}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Content Types Multi-Select */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-700 block">
                4. Chọn các loại dữ liệu cần thống kê:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {CONTENT_TYPE_OPTIONS.map(opt => {
                  const isSelected = selectedContentTypes.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => toggleContentType(opt.id)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Logs Table */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 px-5 py-4 bg-slate-50/80 gap-2">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-indigo-600" />
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  BẢNG NHẬT KÝ SỰ KIỆN ({reportRows.length} DÒNG)
                </h3>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3 text-center w-10">STT</th>
                    <th className="p-3">Học viên</th>
                    <th className="p-3">Mã HV</th>
                    <th className="p-3 text-center">Tổ</th>
                    <th className="p-3">Ngày</th>
                    <th className="p-3">Phân loại</th>
                    <th className="p-3">Nội dung ghi nhận</th>
                    <th className="p-3 text-center">Điểm +/-</th>
                    <th className="p-3">Người ghi</th>
                    <th className="p-3 text-center">Trạng thái</th>
                    <th className="p-3 text-center">Minh chứng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportRows.length > 0 ? (
                    reportRows.map((r, idx) => (
                      <tr key={`${r.id}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 text-center font-bold text-slate-400">{r.stt}</td>
                        <td className="p-3 font-bold text-slate-900 whitespace-nowrap">{r.studentName}</td>
                        <td className="p-3 font-mono font-bold text-indigo-600">{r.studentCode}</td>
                        <td className="p-3 text-center font-semibold text-slate-600">Tổ {r.group}</td>
                        <td className="p-3 text-slate-600 whitespace-nowrap font-medium">{r.date}</td>
                        <td className="p-3">
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 border border-slate-200">
                            {r.categoryLabel}
                          </span>
                        </td>
                        <td className="p-3 text-slate-800 font-medium max-w-sm">{r.content}</td>
                        <td className="p-3 text-center whitespace-nowrap">
                          {r.points !== 0 ? (
                            <span
                              className={`rounded-lg px-2 py-0.5 text-xs font-black ${
                                r.points > 0
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {r.points > 0 ? `+${r.points}` : r.points}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="p-3 text-slate-600 whitespace-nowrap">{r.recordedBy}</td>
                        <td className="p-3 text-center whitespace-nowrap">
                          <span className="rounded-md px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            {r.status}
                          </span>
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          {r.proofUrl ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              <Paperclip className="h-3 w-3" />
                              <span>Có file</span>
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={11} className="p-8 text-center text-xs text-slate-400 italic">
                        Không tìm thấy dữ liệu nào phù hợp với bộ lọc hiện tại.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: INDIVIDUAL STUDENT FULL YEAR REPORT PREVIEW */}
      {individualModalStudentId && modalStudentReportData && (
        <div className="fixed inset-0 z-modal bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-fade-in max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-indigo-600" />
                <h3 className="text-sm font-black text-slate-900 uppercase">
                  Báo Cáo Cả Năm: {modalStudentReportData.student.fullName} ({modalStudentReportData.student.code})
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleExportIndividualStudentExcel(modalStudentReportData)}
                  className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  <span>Xuất Excel</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIndividualModalStudentId(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              <IndividualStudentReportView reportData={modalStudentReportData} reportPeriod={reportPeriod} />
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setIndividualModalStudentId(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Sub-component: Clean, pristine view of an Individual Student's Full-Year Report
 */
const IndividualStudentReportView: React.FC<{
  reportData: StudentFullYearReportData;
  reportPeriod?: ReportPeriod;
}> = ({ reportData, reportPeriod = 'full_year' }) => {
  const {
    student,
    className,
    schoolYear,
    teacherName,
    subjectRows,
    conductHk1,
    conductHk2,
    conductCaNam,
    excusedAbsences,
    unexcusedAbsences,
    excusedAbsencesHk1,
    unexcusedAbsencesHk1,
    excusedAbsencesHk2,
    unexcusedAbsencesHk2,
    academicResult,
    academicResultHk1,
    academicResultHk2,
    honorTitle,
    honorTitleHk1,
    honorTitleHk2,
    autoSummaryNote,
    autoSummaryNoteHk1,
    autoSummaryNoteHk2,
    teacherComment,
    teacherCommentHk1,
    teacherCommentHk2
  } = reportData;

  const displayExcused =
    reportPeriod === 'hk1'
      ? (excusedAbsencesHk1 ?? 0)
      : reportPeriod === 'hk2'
      ? (excusedAbsencesHk2 ?? 0)
      : excusedAbsences;

  const displayUnexcused =
    reportPeriod === 'hk1'
      ? (unexcusedAbsencesHk1 ?? 0)
      : reportPeriod === 'hk2'
      ? (unexcusedAbsencesHk2 ?? 0)
      : unexcusedAbsences;

  const displayAcademicResult =
    reportPeriod === 'hk1'
      ? (academicResultHk1 || academicResult)
      : reportPeriod === 'hk2'
      ? (academicResultHk2 || academicResult)
      : academicResult;

  const displayHonorTitle =
    reportPeriod === 'hk1'
      ? (honorTitleHk1 ?? '')
      : reportPeriod === 'hk2'
      ? (honorTitleHk2 ?? '')
      : honorTitle;

  const displayAutoNote =
    reportPeriod === 'hk1'
      ? (autoSummaryNoteHk1 ?? autoSummaryNote)
      : reportPeriod === 'hk2'
      ? (autoSummaryNoteHk2 ?? autoSummaryNote)
      : autoSummaryNote;

  const displayTeacherComment =
    reportPeriod === 'hk1'
      ? (teacherCommentHk1 || teacherComment)
      : reportPeriod === 'hk2'
      ? (teacherCommentHk2 || teacherComment)
      : teacherComment;

  const periodBadgeLabel =
    reportPeriod === 'hk1' ? 'HỌC KỲ I' : reportPeriod === 'hk2' ? 'HỌC KỲ II' : 'CẢ NĂM';

  // Max regular test score count in HKII
  const maxTxCount = Math.max(...subjectRows.map(s => s.txScores.length), 3);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-6 text-slate-800">
      {/* Title Header */}
      <div className="text-center border-b border-slate-100 pb-4">
        <h2 className="text-lg sm:text-xl font-black text-indigo-950 uppercase tracking-tight">
          PHIẾU BÁO CÁO KẾT QUẢ HỌC TẬP – RÈN LUYỆN {periodBadgeLabel}
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Theo quy định đánh giá học viên GDTX (Thông tư 43/2021/TT-BGDĐT)
        </p>
      </div>

      {/* A. THÔNG TIN HỌC VIÊN */}
      <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
        <div>
          <span className="text-slate-500 font-semibold block text-[11px]">Họ và tên học viên:</span>
          <span className="text-sm font-black text-slate-900">{student.fullName}</span>
        </div>
        <div>
          <span className="text-slate-500 font-semibold block text-[11px]">Mã học viên:</span>
          <span className="font-mono font-bold text-indigo-700">{student.code}</span>
        </div>
        <div>
          <span className="text-slate-500 font-semibold block text-[11px]">Lớp:</span>
          <span className="font-bold text-slate-900">{className}</span>
        </div>
        <div>
          <span className="text-slate-500 font-semibold block text-[11px]">Năm học:</span>
          <span className="font-bold text-slate-900">{schoolYear}</span>
        </div>
        <div>
          <span className="text-slate-500 font-semibold block text-[11px]">Ngày sinh:</span>
          <span className="font-medium text-slate-800">{student.dob || '—'}</span>
        </div>
        <div>
          <span className="text-slate-500 font-semibold block text-[11px]">Tổ sinh hoạt:</span>
          <span className="font-medium text-slate-800">Tổ {student.group}</span>
        </div>
        <div className="col-span-2">
          <span className="text-slate-500 font-semibold block text-[11px]">Giáo viên chủ nhiệm:</span>
          <span className="font-bold text-indigo-900">{teacherName}</span>
        </div>
      </div>

      {/* B. KẾT QUẢ HỌC TẬP (Mỗi môn: TX HKII, GK HKII, CK HKII, TB HKI, TB HKII, Cả năm) */}
      <div className="space-y-2">
        <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
          <BookOpen className="h-4 w-4 text-indigo-600" />
          <span>B. KẾT QUẢ HỌC TẬP TỪNG MÔN HỌC</span>
        </h3>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-2.5 text-center w-8">STT</th>
                <th className="p-2.5 min-w-[150px]">Môn học</th>
                {Array.from({ length: maxTxCount }).map((_, i) => (
                  <th key={`th-tx-${i}`} className="p-2 text-center w-12 bg-slate-50">
                    TX{i + 1}
                  </th>
                ))}
                <th className="p-2 text-center w-14 bg-amber-50/50 text-amber-950">GK HKII</th>
                <th className="p-2 text-center w-14 bg-amber-50/50 text-amber-950">CK HKII</th>
                <th className="p-2 text-center w-14 bg-blue-50/60 text-blue-950">TB HKI</th>
                <th className="p-2 text-center w-14 bg-indigo-50/60 text-indigo-950">TB HKII</th>
                <th className="p-2 text-center w-16 bg-emerald-50 text-emerald-950 font-black">CẢ NĂM</th>
                <th className="p-2.5 min-w-[140px]">Nhận xét</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subjectRows.map((s, idx) => {
                const isComment = s.assessmentMode === 'COMMENT_ONLY';
                return (
                  <tr key={s.subjectId} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-2.5 text-center font-bold text-slate-400">{idx + 1}</td>
                    <td className="p-2.5 font-bold text-slate-900 whitespace-nowrap">{s.subjectName}</td>

                    {/* Regular Scores (TX HKII) */}
                    {Array.from({ length: maxTxCount }).map((_, i) => (
                      <td key={`tx-score-${s.subjectId}-${i}`} className="p-2 text-center font-medium text-slate-700">
                        {isComment ? '—' : (s.txScores[i] !== undefined ? s.txScores[i] : '—')}
                      </td>
                    ))}

                    {/* GK HKII */}
                    <td className="p-2 text-center font-bold text-slate-800 bg-amber-50/20">
                      {isComment ? '—' : (s.midtermHk2 !== undefined ? s.midtermHk2 : '—')}
                    </td>

                    {/* CK HKII */}
                    <td className="p-2 text-center font-bold text-slate-800 bg-amber-50/20">
                      {isComment ? '—' : (s.finalExamHk2 !== undefined ? s.finalExamHk2 : '—')}
                    </td>

                    {/* TB HKI */}
                    <td className="p-2 text-center font-bold text-blue-900 bg-blue-50/20">
                      {isComment ? (s.qualitativeHk1 || 'Đạt') : (s.tbHk1 !== undefined ? s.tbHk1 : '—')}
                    </td>

                    {/* TB HKII */}
                    <td className="p-2 text-center font-bold text-indigo-900 bg-indigo-50/20">
                      {isComment ? (s.qualitativeHk2 || 'Đạt') : (s.tbHk2 !== undefined ? s.tbHk2 : '—')}
                    </td>

                    {/* CẢ NĂM */}
                    <td className="p-2 text-center font-black text-emerald-950 bg-emerald-50/50">
                      {isComment ? (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                          s.qualitativeCaNam === 'Chưa đạt' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {s.qualitativeCaNam || 'Đạt'}
                        </span>
                      ) : (
                        s.tbCaNam !== undefined ? (
                          <span className={`text-xs font-black ${Number(s.tbCaNam) >= 8 ? 'text-indigo-700' : Number(s.tbCaNam) < 5 ? 'text-rose-600' : 'text-slate-900'}`}>
                            {s.tbCaNam}
                          </span>
                        ) : '—'
                      )}
                    </td>

                    {/* Comment */}
                    <td className="p-2.5 text-slate-600 font-medium text-[11px]">
                      {s.comment || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* C, D & XẾP LOẠI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* C. KẾT QUẢ RÈN LUYỆN (HKI, HKII, Cả năm - KHÔNG CÓ GIỮA KỲ) */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-indigo-600" />
            <span>C. KẾT QUẢ RÈN LUYỆN</span>
          </h3>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-white p-2.5 border border-slate-200">
              <span className="text-[10px] text-slate-500 font-bold block">RÈN LUYỆN HKI</span>
              <span className="text-sm font-black text-slate-800 mt-1 block">{conductHk1}</span>
            </div>
            <div className="rounded-xl bg-white p-2.5 border border-slate-200">
              <span className="text-[10px] text-slate-500 font-bold block">RÈN LUYỆN HKII</span>
              <span className="text-sm font-black text-slate-800 mt-1 block">{conductHk2}</span>
            </div>
            <div className="rounded-xl bg-amber-50 p-2.5 border border-amber-300">
              <span className="text-[10px] text-amber-800 font-bold block">RÈN LUYỆN CẢ NĂM</span>
              <span className="text-sm font-black text-amber-950 mt-1 block">{conductCaNam}</span>
            </div>
          </div>
        </div>

        {/* D. CHUYÊN CẦN */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-indigo-600" />
            <span>D. CHUYÊN CẦN & NGHỈ HỌC ({periodBadgeLabel})</span>
          </h3>

          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-xl bg-blue-50/80 p-2.5 border border-blue-200">
              <span className="text-[10px] text-blue-700 font-bold block">NGHỈ CÓ PHÉP</span>
              <span className="text-lg font-black text-blue-950 mt-0.5 block">{displayExcused} buổi</span>
            </div>
            <div className="rounded-xl bg-rose-50/80 p-2.5 border border-rose-200">
              <span className="text-[10px] text-rose-700 font-bold block">NGHỈ KHÔNG PHÉP</span>
              <span className="text-lg font-black text-rose-950 mt-0.5 block">{displayUnexcused} buổi</span>
            </div>
          </div>
        </div>
      </div>

      {/* XẾP LOẠI CHUNG & DANH HIỆU (THEO TT43) */}
      <div className="rounded-2xl border-2 border-indigo-200 bg-gradient-to-r from-indigo-50/60 via-purple-50/40 to-blue-50/40 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <span className="text-[11px] font-black text-indigo-900 uppercase tracking-wider block">
              KẾT QUẢ HỌC TẬP {periodBadgeLabel} (THEO THÔNG TƯ 43)
            </span>
            <div className="text-2xl font-black text-indigo-950 mt-0.5">
              Mức {displayAcademicResult}
            </div>
          </div>

          <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-indigo-100">
            <span className="text-[11px] font-black text-purple-900 uppercase tracking-wider block">
              DANH HIỆU KHEN THƯỞNG ({periodBadgeLabel})
            </span>
            <div className="text-xl font-black text-purple-950 mt-0.5 flex items-center sm:justify-end gap-1.5">
              {displayHonorTitle ? (
                <>
                  <Medal className="h-5 w-5 text-purple-600 shrink-0" />
                  <span>{displayHonorTitle}</span>
                </>
              ) : (
                <span className="text-slate-400 text-sm font-semibold">—</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* E & F: GHI CHÚ & NHẬN XÉT GVCN */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* E. GHI CHÚ */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 space-y-2">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span>E. GHI CHÚ TỔNG HỢP TỪ HỆ THỐNG</span>
          </h3>
          <p className="text-xs text-slate-700 leading-relaxed font-medium bg-white p-3 rounded-lg border border-slate-200 min-h-[60px]">
            {displayAutoNote || <span className="text-slate-400 italic">Không có ghi nhận vi phạm hay khen thưởng đặc biệt.</span>}
          </p>
        </div>

        {/* F. NHẬN XÉT CỦA GVCN */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 space-y-2">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <UserCheck className="h-4 w-4 text-indigo-600" />
            <span>F. NHẬN XÉT CỦA GIÁO VIÊN CHỦ NHIỆM</span>
          </h3>
          <p className="text-xs text-slate-700 leading-relaxed font-medium bg-white p-3 rounded-lg border border-slate-200 min-h-[60px]">
            {displayTeacherComment || <span className="text-slate-400 italic">Chưa có nhận xét được lưu.</span>}
          </p>
        </div>
      </div>

      {/* Signature Section for Print */}
      <div className="hidden print:grid grid-cols-2 pt-8 text-center text-xs">
        <div>
          <p className="font-bold">ĐẠI DIỆN BAN CÁN SỰ LỚP</p>
          <p className="text-slate-400 italic mt-1">(Ký & ghi rõ họ tên)</p>
          <div className="h-16"></div>
        </div>
        <div>
          <p className="italic">TP. Hồ Chí Minh, ngày .... tháng .... năm {new Date().getFullYear()}</p>
          <p className="font-bold mt-1">GIÁO VIÊN CHỦ NHIỆM</p>
          <p className="text-slate-400 italic mt-1">(Ký & ghi rõ họ tên)</p>
          <div className="h-16"></div>
          <p className="font-bold text-slate-900">{teacherName}</p>
        </div>
      </div>
    </div>
  );
};
