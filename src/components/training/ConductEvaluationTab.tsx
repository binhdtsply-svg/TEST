/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Award,
  FileSpreadsheet,
  FileText,
  FileDown,
  Sparkles,
  Save,
  RotateCcw,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  Users,
  User,
  Calendar,
  Eye,
  Edit3,
  X,
  TrendingUp,
  TrendingDown,
  Plus,
  RefreshCw,
  Clock,
  ShieldCheck,
  CheckSquare,
  MessageSquare,
  ChevronRight,
  Info,
  Upload,
  Download
} from 'lucide-react';
import {
  ConductPeriodEvaluation,
  ConductStudentEvaluation,
  ConductEvaluationPeriodType,
  ConductEvaluationGrade,
  ConductMeetingMinutes,
  PointTransaction,
  Student
} from '../../types';
import { conductEvaluationService } from '../../services/ConductEvaluationService';
import { studentService } from '../../services/StudentService';
import { trainingService } from '../../services/TrainingService';
import { studentSurveyService } from '../../services/StudentSurveyService';
import { exportService } from '../../services/ExportService';
import { classService } from '../../services/ClassService';
import { authService } from '../../services/AuthService';
import { ConductExcelImportModal, ConductExcelImportItem, downloadConductExcelTemplate } from './ConductExcelImportModal';
import { normalizeConductGrade } from '../../utils/surveyAnswerUtils';

const GRADE_OPTIONS: ConductEvaluationGrade[] = ['Tốt', 'Khá', 'Đạt', 'Chưa đạt'];

export const ConductEvaluationTab: React.FC = () => {
  const currentUser = authService.getCurrentUser();
  const isTeacher = currentUser.role === 'TEACHER' || currentUser.role === 'SUPER_ADMIN';

  // Period Selection
  const [selectedPeriod, setSelectedPeriod] = useState<ConductEvaluationPeriodType>('SEMESTER_1');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  
  // Current evaluation session in memory
  const [currentEvaluation, setCurrentEvaluation] = useState<ConductPeriodEvaluation | null>(null);
  const [unsavedEvaluations, setUnsavedEvaluations] = useState<ConductStudentEvaluation[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const hasUnsavedChangesRef = useRef<boolean>(false);
  useEffect(() => {
    hasUnsavedChangesRef.current = hasUnsavedChanges;
  }, [hasUnsavedChanges]);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isSyncingSurveys, setIsSyncingSurveys] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);
  const [isExportingWord, setIsExportingWord] = useState<boolean>(false);
  const [isExcelImportModalOpen, setIsExcelImportModalOpen] = useState<boolean>(false);
  const [students, setStudents] = useState<Student[]>(() => studentService.getAll());

  useEffect(() => {
    const unsub = studentService.subscribe(() => {
      setStudents(studentService.getAll());
    });
    return () => unsub();
  }, []);

  const periodShortLabel = useMemo(() => {
    if (selectedPeriod === 'SEMESTER_1') return 'HKI';
    if (selectedPeriod === 'SEMESTER_2') return 'HKII';
    if (selectedPeriod === 'MID_SEMESTER_1') return 'GHK I';
    if (selectedPeriod === 'MID_SEMESTER_2') return 'GHK II';
    if (selectedPeriod === 'FULL_YEAR') return 'Cả năm';
    return 'Đợt ĐG';
  }, [selectedPeriod]);

  const handleDownloadPeriodTemplate = () => {
    downloadConductExcelTemplate(currentEvaluation, students);
  };

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>('all');
  const [violationFilter, setViolationFilter] = useState<'all' | 'has_violation' | 'no_violation'>('all');

  // Modals
  const [selectedStudentForDetail, setSelectedStudentForDetail] = useState<ConductStudentEvaluation | null>(null);
  const [isMinutesModalOpen, setIsMinutesModalOpen] = useState<boolean>(false);
  const [editingMinutes, setEditingMinutes] = useState<ConductMeetingMinutes | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState<boolean>(false);

  // Load / initialize evaluation
  const loadEvaluation = () => {
    const customDates = selectedPeriod === 'CUSTOM' && customStartDate && customEndDate
      ? { start: customStartDate, end: customEndDate }
      : undefined;

    const evaluation = conductEvaluationService.getOrCreateEvaluation(selectedPeriod, customDates);
    setCurrentEvaluation(evaluation);
    setUnsavedEvaluations(JSON.parse(JSON.stringify(evaluation.evaluations)));
    setEditingMinutes(evaluation.meetingMinutes ? JSON.parse(JSON.stringify(evaluation.meetingMinutes)) : null);
    setHasUnsavedChanges(false);
    hasUnsavedChangesRef.current = false;

    if (selectedPeriod === 'CUSTOM' && evaluation.startDate && evaluation.endDate) {
      setCustomStartDate(evaluation.startDate);
      setCustomEndDate(evaluation.endDate);
    }
  };

  useEffect(() => {
    loadEvaluation();
    const unsub = conductEvaluationService.subscribe(() => {
      // Background sync if not dirty - check ref to avoid stale closure
      if (!hasUnsavedChangesRef.current) {
        const customDates = selectedPeriod === 'CUSTOM' && customStartDate && customEndDate
          ? { start: customStartDate, end: customEndDate }
          : undefined;
        const evaluation = conductEvaluationService.getOrCreateEvaluation(selectedPeriod, customDates);
        setCurrentEvaluation(evaluation);
        setUnsavedEvaluations(JSON.parse(JSON.stringify(evaluation.evaluations)));
      }
    });
    return () => unsub();
  }, [selectedPeriod]);

  // Handle custom date apply
  const handleApplyCustomDates = () => {
    if (!customStartDate || !customEndDate) return;
    const evaluation = conductEvaluationService.getOrCreateEvaluation('CUSTOM', {
      start: customStartDate,
      end: customEndDate
    });
    setCurrentEvaluation(evaluation);
    setUnsavedEvaluations(JSON.parse(JSON.stringify(evaluation.evaluations)));
    setEditingMinutes(evaluation.meetingMinutes ? JSON.parse(JSON.stringify(evaluation.meetingMinutes)) : null);
    setHasUnsavedChanges(false);
  };

  // Update single student in dirty buffer (pure update without auto-inferring finalGrade)
  const handleGradeChange = (
    studentId: string,
    field: 'selfAssessment' | 'collectiveAssessment' | 'teacherAssessment' | 'finalGrade',
    value: string
  ) => {
    if (currentEvaluation?.status === 'FINALIZED') return;

    setUnsavedEvaluations(prev =>
      prev.map(item => {
        if (item.studentId === studentId) {
          const updated = { ...item, [field]: value };
          if (field === 'selfAssessment') {
            updated.selfAssessmentSource = value ? 'Nhập thủ công' : undefined;
          }
          return updated;
        }
        return item;
      })
    );
    setHasUnsavedChanges(true);
  };

  // Restore survey self-assessment for single student
  const handleRestoreSurveyForStudent = (studentId: string) => {
    if (!currentEvaluation || currentEvaluation.status === 'FINALIZED') return;
    const surveyRes = conductEvaluationService.getSurveySelfAssessment(studentId, selectedPeriod);
    if (surveyRes?.grade) {
      const cleanGrade = normalizeConductGrade(surveyRes.grade) || '';
      setUnsavedEvaluations(prev =>
        prev.map(item => {
          if (item.studentId === studentId) {
            return {
              ...item,
              selfAssessment: cleanGrade,
              selfAssessmentSource: surveyRes.sourceTitle,
              selfAssessmentSubmittedAt: surveyRes.submittedAt
            };
          }
          return item;
        })
      );
      setHasUnsavedChanges(true);
      setSaveSuccessMsg(`✓ Đã nạp tự đánh giá từ khảo sát cho học sinh (${cleanGrade}). Nhấn "Lưu và đồng bộ" để lưu.`);
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } else {
      setSaveErrorMsg(`Không tìm thấy bài khảo sát rèn luyện phù hợp cho ${periodShortLabel} của học sinh này.`);
      setTimeout(() => setSaveErrorMsg(null), 3000);
    }
  };

  // Update note in dirty buffer
  const handleNoteChange = (studentId: string, note: string) => {
    if (currentEvaluation?.status === 'FINALIZED') return;

    setUnsavedEvaluations(prev =>
      prev.map(item => (item.studentId === studentId ? { ...item, teacherNote: note } : item))
    );
    setHasUnsavedChanges(true);
  };

  // Save changes to service & sync reports
  const handleSaveChanges = async () => {
    if (!currentEvaluation) return;
    setIsSaving(true);
    setSaveErrorMsg(null);

    try {
      // 1. Validate input - Keep valid grades or blank, NEVER force unrated students to 'Tốt'!
      const validGrades: ConductEvaluationGrade[] = ['Tốt', 'Khá', 'Đạt', 'Chưa đạt'];
      const validatedEvaluations = unsavedEvaluations.map(e => {
        const finalGrade = validGrades.includes(e.finalGrade as ConductEvaluationGrade)
          ? e.finalGrade
          : (e.finalGrade ? e.finalGrade : '');
        const teacherAssessment = validGrades.includes(e.teacherAssessment as ConductEvaluationGrade)
          ? e.teacherAssessment
          : (e.teacherAssessment ? e.teacherAssessment : '');
        const collectiveAssessment = validGrades.includes(e.collectiveAssessment as ConductEvaluationGrade)
          ? e.collectiveAssessment
          : (e.collectiveAssessment ? e.collectiveAssessment : '');
        const selfAssessment = e.selfAssessment || '';

        return {
          ...e,
          finalGrade,
          teacherAssessment,
          collectiveAssessment,
          selfAssessment,
          status: 'SAVED' as const,
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser.name || 'GVCN'
        };
      });

      // 2. Persist in conductEvaluationService & sync official records
      conductEvaluationService.batchUpdateEvaluations(currentEvaluation.id, validatedEvaluations);
      if (editingMinutes) {
        conductEvaluationService.updateMeetingMinutes(currentEvaluation.id, editingMinutes);
      }
      conductEvaluationService.syncToOfficialRecords(currentEvaluation.id);

      setUnsavedEvaluations(validatedEvaluations);
      setHasUnsavedChanges(false);
      hasUnsavedChangesRef.current = false;
      setSaveSuccessMsg('✓ Đã lưu kết quả đánh giá rèn luyện thành công & đồng bộ sang Hồ sơ và Báo cáo!');
      setTimeout(() => setSaveSuccessMsg(null), 3500);
    } catch (err: any) {
      console.error('Failed to save conduct evaluations', err);
      setSaveErrorMsg('Lỗi khi lưu kết quả đánh giá. Vui lòng thử lại.');
      setTimeout(() => setSaveErrorMsg(null), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  // Discard changes
  const handleDiscardChanges = () => {
    if (!currentEvaluation) return;
    setUnsavedEvaluations(JSON.parse(JSON.stringify(currentEvaluation.evaluations)));
    setEditingMinutes(currentEvaluation.meetingMinutes ? JSON.parse(JSON.stringify(currentEvaluation.meetingMinutes)) : null);
    setHasUnsavedChanges(false);
  };

  // Sync student self-assessments from latest surveys
  const handleSyncSurveys = () => {
    if (!currentEvaluation || currentEvaluation.status === 'FINALIZED') return;
    setIsSyncingSurveys(true);
    try {
      const result = conductEvaluationService.syncAllSurveysForPeriod(currentEvaluation.id);
      const updated = conductEvaluationService.getOrCreateEvaluation(selectedPeriod);
      setCurrentEvaluation(updated);
      setUnsavedEvaluations(JSON.parse(JSON.stringify(updated.evaluations)));
      setHasUnsavedChanges(false);
      setSaveSuccessMsg(
        `✓ Đã đồng bộ phần tự đánh giá từ bài khảo sát: ${result.syncedCount} học sinh có dữ liệu (${result.notSubmittedCount} học sinh chưa nộp khảo sát).`
      );
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Failed to sync surveys', err);
      setSaveErrorMsg('Lỗi khi đồng bộ khảo sát. Vui lòng thử lại.');
      setTimeout(() => setSaveErrorMsg(null), 3500);
    } finally {
      setIsSyncingSurveys(false);
    }
  };

  // Handle confirm Excel import into dirty buffer or direct save
  const handleConfirmExcelImport = (
    importedItems: ConductExcelImportItem[],
    shouldAutoSave: boolean = true
  ) => {
    if (!currentEvaluation || currentEvaluation.status === 'FINALIZED') return;

    const itemMap = new Map(importedItems.map(item => [item.studentId, item]));
    const updated = unsavedEvaluations.map(studentEval => {
      const imported = itemMap.get(studentEval.studentId);
      if (!imported) return studentEval;

      return {
        ...studentEval,
        // Only overwrite if imported field is not undefined (Rule: không ghi đè trường rỗng)
        selfAssessment: imported.selfAssessment !== undefined ? imported.selfAssessment : studentEval.selfAssessment,
        selfAssessmentSource: imported.selfAssessment !== undefined ? (imported.selfAssessment ? 'Nhập từ file Excel' : undefined) : studentEval.selfAssessmentSource,
        collectiveAssessment: imported.collectiveAssessment !== undefined ? imported.collectiveAssessment : studentEval.collectiveAssessment,
        teacherAssessment: imported.teacherAssessment !== undefined ? imported.teacherAssessment : studentEval.teacherAssessment,
        finalGrade: imported.finalGrade !== undefined ? imported.finalGrade : studentEval.finalGrade,
        teacherNote: imported.teacherNote !== undefined ? imported.teacherNote : studentEval.teacherNote,
        updatedAt: new Date().toISOString(),
        updatedBy: authService.getCurrentUser().name || 'GVCN'
      };
    });

    setUnsavedEvaluations(updated);

    if (shouldAutoSave) {
      conductEvaluationService.batchUpdateEvaluations(currentEvaluation.id, updated);
      setCurrentEvaluation({
        ...currentEvaluation,
        evaluations: updated,
        updatedAt: new Date().toISOString()
      });
      setHasUnsavedChanges(false);
      hasUnsavedChangesRef.current = false;
      setSaveSuccessMsg(`✓ Đã nhập và lưu thành công kết quả rèn luyện ${currentEvaluation.periodTitle} cho ${importedItems.length} học sinh!`);
    } else {
      setHasUnsavedChanges(true);
      hasUnsavedChangesRef.current = true;
      setSaveSuccessMsg(`✓ Đã nhận dữ liệu từ file Excel cho ${importedItems.length} học sinh. Vui lòng kiểm tra lại và nhấn "Lưu và đồng bộ" để hoàn tất.`);
    }
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  // Copy Teacher assessment to final result
  const handleCopyTeacherToFinal = () => {
    if (!currentEvaluation || currentEvaluation.status === 'FINALIZED') return;

    setUnsavedEvaluations(prev =>
      prev.map(item => ({
        ...item,
        finalGrade: item.teacherAssessment
      }))
    );
    setHasUnsavedChanges(true);
  };

  // Recalculate raw data from transactions
  const handleRecalculateRawData = () => {
    if (!currentEvaluation) return;
    const updated = conductEvaluationService.recalculateFromTransactions(currentEvaluation.id);
    if (updated) {
      setCurrentEvaluation(updated);
      setUnsavedEvaluations(JSON.parse(JSON.stringify(updated.evaluations)));
      setHasUnsavedChanges(false);
      setSaveSuccessMsg('Đã đồng bộ lại các lượt vi phạm và khen thưởng mới nhất từ sổ rèn luyện!');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    }
  };

  // Toggle Finalize / Lock
  const handleToggleFinalize = () => {
    if (!currentEvaluation) return;

    if (currentEvaluation.status === 'FINALIZED') {
      conductEvaluationService.unlockEvaluation(currentEvaluation.id);
      loadEvaluation();
      setSaveSuccessMsg('Đã mở khóa đợt đánh giá để tiếp tục chỉnh sửa.');
    } else {
      // Save pending edits first
      if (hasUnsavedChanges) {
        conductEvaluationService.batchUpdateEvaluations(currentEvaluation.id, unsavedEvaluations);
      }
      conductEvaluationService.finalizeEvaluation(currentEvaluation.id);
      loadEvaluation();
      setSaveSuccessMsg('Đã khóa & phê duyệt kết quả đánh giá rèn luyện!');
    }
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // Reset evaluation
  const handleConfirmReset = () => {
    if (!currentEvaluation) return;
    const resetSession = conductEvaluationService.resetEvaluation(currentEvaluation.id);
    if (resetSession) {
      setCurrentEvaluation(resetSession);
      setUnsavedEvaluations(JSON.parse(JSON.stringify(resetSession.evaluations)));
      setEditingMinutes(resetSession.meetingMinutes ? JSON.parse(JSON.stringify(resetSession.meetingMinutes)) : null);
      setHasUnsavedChanges(false);
      setIsResetConfirmOpen(false);
      setSaveSuccessMsg('Đã khởi tạo lại toàn bộ dữ liệu đánh giá kỳ này.');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    }
  };

  // Export Excel
  const handleExportExcel = () => {
    if (!currentEvaluation) return;
    const evalToExport = {
      ...currentEvaluation,
      evaluations: unsavedEvaluations
    };
    exportService.exportConductEvaluationToExcel(evalToExport);
  };

  // Export Word Meeting Minutes
  const handleExportWordMinutes = async () => {
    if (!currentEvaluation) return;
    setIsExportingWord(true);
    try {
      const evalToExport = {
        ...currentEvaluation,
        evaluations: unsavedEvaluations,
        meetingMinutes: editingMinutes || currentEvaluation.meetingMinutes
      };
      const { wordExportService } = await import('../../services/WordExportService');
      await wordExportService.exportConductMeetingMinutesWord(evalToExport);
    } catch (e) {
      console.error('Failed to export Word minutes', e);
    } finally {
      setIsExportingWord(false);
    }
  };

  // Save Meeting Minutes Modal
  const handleSaveMinutes = () => {
    if (!currentEvaluation || !editingMinutes) return;
    conductEvaluationService.updateMeetingMinutes(currentEvaluation.id, editingMinutes);
    setIsMinutesModalOpen(false);
    setSaveSuccessMsg('Đã cập nhật thông tin biên bản họp.');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // Save Detail Modal changes
  const handleSaveDetailModal = (updatedStudent: ConductStudentEvaluation) => {
    setUnsavedEvaluations(prev =>
      prev.map(item => (item.studentId === updatedStudent.studentId ? updatedStudent : item))
    );
    setHasUnsavedChanges(true);
    setSelectedStudentForDetail(null);
  };

  // Statistics Calculation
  const stats = useMemo(() => {
    const total = unsavedEvaluations.length;
    let countGood = 0;
    let countFair = 0;
    let countPass = 0;
    let countFail = 0;
    let countUnranked = 0;
    let totalNet = 0;
    let totalViolations = 0;
    let totalPraises = 0;

    unsavedEvaluations.forEach(e => {
      const g = e.finalGrade;
      if (g === 'Tốt') countGood++;
      else if (g === 'Khá') countFair++;
      else if (g === 'Đạt') countPass++;
      else if (g === 'Chưa đạt') countFail++;
      else countUnranked++;

      totalNet += e.netPoints;
      totalViolations += e.violationCount;
      totalPraises += e.praiseCount;
    });

    const pctGood = total > 0 ? ((countGood / total) * 100).toFixed(1) : '0';
    const pctFair = total > 0 ? ((countFair / total) * 100).toFixed(1) : '0';
    const pctPass = total > 0 ? ((countPass / total) * 100).toFixed(1) : '0';
    const pctFail = total > 0 ? ((countFail / total) * 100).toFixed(1) : '0';
    const pctUnranked = total > 0 ? ((countUnranked / total) * 100).toFixed(1) : '0';

    return {
      total,
      countGood,
      countFair,
      countPass,
      countFail,
      countUnranked,
      pctGood,
      pctFair,
      pctPass,
      pctFail,
      pctUnranked,
      totalNet,
      totalViolations,
      totalPraises,
      avgNet: total > 0 ? (totalNet / total).toFixed(1) : '0'
    };
  }, [unsavedEvaluations]);

  // Filtered Students List
  const filteredStudents = useMemo(() => {
    return unsavedEvaluations.filter(e => {
      if (selectedGroup !== 'all' && e.group !== Number(selectedGroup)) {
        return false;
      }
      if (selectedGradeFilter === 'unranked') {
        if (e.finalGrade && e.finalGrade.trim() !== '') return false;
      } else if (selectedGradeFilter !== 'all' && e.finalGrade !== selectedGradeFilter) {
        return false;
      }
      if (violationFilter === 'has_violation' && e.violationCount === 0) {
        return false;
      }
      if (violationFilter === 'no_violation' && e.violationCount > 0) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = e.studentName?.toLowerCase().includes(q);
        const matchCode = e.studentCode?.toLowerCase().includes(q);
        const matchNote = e.teacherNote?.toLowerCase().includes(q) || e.autoSummaryNote?.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchNote) return false;
      }
      return true;
    });
  }, [unsavedEvaluations, selectedGroup, selectedGradeFilter, violationFilter, searchQuery]);

  const isFinalized = currentEvaluation?.status === 'FINALIZED';

  // Get raw transactions for drilldown modal
  const studentTransactionsForModal = useMemo(() => {
    if (!selectedStudentForDetail || !currentEvaluation) return [];
    return conductEvaluationService
      .getTransactionsForPeriod(
        currentEvaluation.periodType,
        currentEvaluation.startDate && currentEvaluation.endDate
          ? { start: currentEvaluation.startDate, end: currentEvaluation.endDate }
          : undefined
      )
      .filter(t => t.studentId === selectedStudentForDetail.studentId);
  }, [selectedStudentForDetail, currentEvaluation]);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* ========================================================================= */}
      {/* SECTION 1: HEADER & PERIOD SELECTOR                                       */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 font-black">
                <CheckSquare className="h-4 w-4" />
              </span>
              <h2 className="text-base font-black text-slate-900">
                {currentEvaluation?.periodTitle || 'ĐÁNH GIÁ, XẾP LOẠI RÈN LUYỆN ĐỊNH KỲ'}
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
              <span>Liên kết dữ liệu: Khảo sát tự đánh giá ↔ Nhật ký vi phạm/khen thưởng ↔ Hồ sơ học sinh</span>
              {currentEvaluation?.startDate && currentEvaluation?.endDate && (
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                  Thời gian: {currentEvaluation.startDate} đến {currentEvaluation.endDate}
                </span>
              )}
            </p>
          </div>

          {/* Period Selector Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            <button
              onClick={() => setSelectedPeriod('MID_SEMESTER_1')}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                selectedPeriod === 'MID_SEMESTER_1'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Giữa Kỳ I (GHK I)
            </button>
            <button
              onClick={() => setSelectedPeriod('SEMESTER_1')}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                selectedPeriod === 'SEMESTER_1'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Cuối Kỳ I (HKI)
            </button>
            <button
              onClick={() => setSelectedPeriod('MID_SEMESTER_2')}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                selectedPeriod === 'MID_SEMESTER_2'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Giữa Kỳ II (GHKII)
            </button>
            <button
              onClick={() => setSelectedPeriod('SEMESTER_2')}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                selectedPeriod === 'SEMESTER_2'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Cuối Kỳ II (HKII)
            </button>
            <button
              onClick={() => setSelectedPeriod('FULL_YEAR')}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                selectedPeriod === 'FULL_YEAR'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Cả Năm Học
            </button>
            <button
              onClick={() => setSelectedPeriod('CUSTOM')}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                selectedPeriod === 'CUSTOM'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Khoảng Tự Chọn
            </button>
          </div>
        </div>

        {/* Custom date range picker if CUSTOM */}
        {selectedPeriod === 'CUSTOM' && (
          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100 bg-slate-50/70 p-3 rounded-xl">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-700">Từ ngày:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={e => setCustomStartDate(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Đến ngày:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={e => setCustomEndDate(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 outline-none"
              />
            </div>
            <button
              onClick={handleApplyCustomDates}
              className="rounded-xl bg-slate-900 text-white px-3.5 py-1.5 text-xs font-bold hover:bg-slate-800 cursor-pointer shadow-xs"
            >
              Áp dụng lọc dữ liệu
            </button>
          </div>
        )}

        {/* Status banner & action triggers */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            {isFinalized ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 px-3 py-1 text-xs font-black border border-emerald-300">
                <Lock className="h-3.5 w-3.5 text-emerald-600" />
                <span>Đã Khóa & Phê Duyệt Chính Thức</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 text-amber-800 px-3 py-1 text-xs font-black border border-amber-300">
                <Unlock className="h-3.5 w-3.5 text-amber-600" />
                <span>Bản Thảo Đang Chỉnh Sửa</span>
              </span>
            )}

            {currentEvaluation?.finalizedAt && (
              <span className="text-[11px] text-slate-400">
                Phê duyệt bởi: {currentEvaluation.finalizedBy} ({new Date(currentEvaluation.finalizedAt).toLocaleDateString('vi-VN')})
              </span>
            )}
          </div>

          {/* Main Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {isTeacher && !isFinalized && (
              <button
                onClick={handleSaveChanges}
                disabled={isSaving}
                className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black shadow-xs transition-all cursor-pointer ${
                  hasUnsavedChanges
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-400 ring-offset-1 animate-pulse'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                } disabled:opacity-50`}
                title="Lưu dữ liệu đánh giá rèn luyện vào hệ thống & đồng bộ Báo cáo"
              >
                {isSaving ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                <span>{isSaving ? 'Đang Lưu...' : hasUnsavedChanges ? 'Lưu Thay Đổi (Chưa Lưu)' : 'Lưu và Đồng Bộ'}</span>
              </button>
            )}

            {hasUnsavedChanges && (
              <button
                onClick={handleDiscardChanges}
                disabled={isSaving}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 px-3 py-2 text-xs font-bold hover:bg-slate-100 cursor-pointer"
                title="Hủy các thay đổi chưa lưu và khôi phục trạng thái trước đó"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Hủy</span>
              </button>
            )}

            {isTeacher && !isFinalized && (
              <>
                <button
                  onClick={handleSyncSurveys}
                  disabled={isSyncingSurveys}
                  title="Đồng bộ kết quả học viên tự đánh giá từ bài khảo sát rèn luyện mới nhất"
                  className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 px-3 py-2 text-xs font-bold hover:bg-blue-100 cursor-pointer transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 text-blue-600 ${isSyncingSurveys ? 'animate-spin' : ''}`} />
                  <span>{isSyncingSurveys ? 'Đang Đồng Bộ...' : 'Đồng Bộ Khảo Sát'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPeriodTemplate}
                  title={`Tải file Excel mẫu đánh giá rèn luyện chuẩn cho ${currentEvaluation?.periodTitle || periodShortLabel}`}
                  className="flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 px-3 py-2 text-xs font-bold hover:bg-emerald-100 cursor-pointer transition-colors shadow-2xs"
                >
                  <Download className="h-3.5 w-3.5 text-emerald-700" />
                  <span>Tải Mẫu Excel ({periodShortLabel})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsExcelImportModalOpen(true)}
                  title={`Nhập dữ liệu đánh giá rèn luyện từ file Excel cho ${currentEvaluation?.periodTitle || periodShortLabel}`}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-700 text-white px-3.5 py-2 text-xs font-bold hover:bg-emerald-800 cursor-pointer transition-colors shadow-xs"
                >
                  <Upload className="h-3.5 w-3.5 text-white" />
                  <span>Nhập File Excel</span>
                </button>

                <button
                  onClick={handleCopyTeacherToFinal}
                  title="Sao chép toàn bộ cột GVCN đánh giá sang cột Kết quả chính thức"
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 px-3 py-2 text-xs font-bold hover:bg-slate-100 cursor-pointer transition-colors"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                  <span>Chép ĐG GVCN → Kết Quả</span>
                </button>

                <button
                  onClick={handleRecalculateRawData}
                  title="Đồng bộ lại dữ liệu vi phạm & khen thưởng từ sổ rèn luyện"
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 px-3 py-2 text-xs font-bold hover:bg-slate-100 cursor-pointer transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Đồng Bộ Lại Sổ</span>
                </button>
              </>
            )}

            <button
              onClick={() => setIsMinutesModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-800 px-3 py-2 text-xs font-bold hover:bg-blue-100 cursor-pointer transition-colors"
            >
              <FileText className="h-3.5 w-3.5 text-blue-600" />
              <span>Biên Bản Họp</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 px-3 py-2 text-xs font-bold hover:bg-emerald-100 cursor-pointer transition-colors"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
              <span>Xuất Excel</span>
            </button>

            <button
              onClick={handleExportWordMinutes}
              disabled={isExportingWord}
              className="flex items-center gap-1.5 rounded-xl bg-blue-700 text-white px-3.5 py-2 text-xs font-bold hover:bg-blue-800 active:scale-95 cursor-pointer shadow-xs disabled:opacity-50"
            >
              <FileDown className="h-3.5 w-3.5" />
              <span>{isExportingWord ? 'Đang xuất Word...' : 'Xuất Word (Biên Bản)'}</span>
            </button>

            {isTeacher && (
              <button
                onClick={handleToggleFinalize}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold text-white transition-all cursor-pointer shadow-xs ${
                  isFinalized
                    ? 'bg-slate-700 hover:bg-slate-800'
                    : 'bg-emerald-700 hover:bg-emerald-800'
                }`}
              >
                {isFinalized ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                <span>{isFinalized ? 'Mở Khóa Chỉnh Sửa' : 'Khóa & Phê Duyệt'}</span>
              </button>
            )}
          </div>
        </div>

        {saveSuccessMsg && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-bold text-emerald-800 flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {saveErrorMsg && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-bold text-rose-800 flex items-center gap-2 animate-fade-in">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{saveErrorMsg}</span>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: STATISTICAL METRICS OVERVIEW                                   */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-center sm:text-left">
          <div className="text-[11px] font-black text-emerald-700 flex items-center justify-center sm:justify-start gap-1">
            <Award className="h-3.5 w-3.5" />
            <span>Xếp Loại TỐT</span>
          </div>
          <div className="text-2xl font-black text-emerald-950 mt-1">{stats.countGood} <span className="text-xs font-semibold text-emerald-700">({stats.pctGood}%)</span></div>
          <div className="text-[10px] text-emerald-700 mt-0.5">Xuất sắc & nề nếp gương mẫu</div>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 text-center sm:text-left">
          <div className="text-[11px] font-black text-blue-700 flex items-center justify-center sm:justify-start gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Xếp Loại KHÁ</span>
          </div>
          <div className="text-2xl font-black text-blue-950 mt-1">{stats.countFair} <span className="text-xs font-semibold text-blue-700">({stats.pctFair}%)</span></div>
          <div className="text-[10px] text-blue-700 mt-0.5">Đạt chuẩn rèn luyện tốt</div>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-center sm:text-left">
          <div className="text-[11px] font-black text-amber-700 flex items-center justify-center sm:justify-start gap-1">
            <Info className="h-3.5 w-3.5" />
            <span>Xếp Loại ĐẠT</span>
          </div>
          <div className="text-2xl font-black text-amber-950 mt-1">{stats.countPass} <span className="text-xs font-semibold text-amber-700">({stats.pctPass}%)</span></div>
          <div className="text-[10px] text-amber-700 mt-0.5">Cần tiếp tục phấn đấu</div>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 text-center sm:text-left">
          <div className="text-[11px] font-black text-rose-700 flex items-center justify-center sm:justify-start gap-1">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>CHƯA ĐẠT</span>
          </div>
          <div className="text-2xl font-black text-rose-950 mt-1">{stats.countFail} <span className="text-xs font-semibold text-rose-700">({stats.pctFail}%)</span></div>
          <div className="text-[10px] text-rose-700 mt-0.5">Có vi phạm cần khắc phục</div>
        </div>

        <div className="col-span-2 sm:col-span-1 rounded-2xl border border-slate-200 bg-white p-4 text-center sm:text-left">
          <div className="text-[11px] font-black text-slate-700 flex items-center justify-center sm:justify-start gap-1">
            <Users className="h-3.5 w-3.5 text-slate-500" />
            <span>SĨ SỐ TOÀN LỚP</span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">{stats.total} HS</div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {stats.countUnranked > 0 ? (
              <span className="text-amber-700 font-bold">{stats.countUnranked} HS chưa xếp loại</span>
            ) : (
              <span className="text-emerald-700 font-bold">100% đã xếp loại</span>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 3: SEARCH & FILTER CONTROLS                                       */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên học sinh, mã HS, ghi chú..."
              className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-800 focus:border-emerald-500 outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-semibold text-slate-500">Tổ:</span>
            <select
              value={selectedGroup}
              onChange={e => setSelectedGroup(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700 outline-none"
            >
              <option value="all">Tất cả 4 tổ</option>
              <option value="1">Tổ 1</option>
              <option value="2">Tổ 2</option>
              <option value="3">Tổ 3</option>
              <option value="4">Tổ 4</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-semibold text-slate-500">Xếp loại:</span>
            <select
              value={selectedGradeFilter}
              onChange={e => setSelectedGradeFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700 outline-none"
            >
              <option value="all">Tất cả xếp loại</option>
              <option value="Tốt">Xếp loại Tốt ({stats.countGood})</option>
              <option value="Khá">Xếp loại Khá ({stats.countFair})</option>
              <option value="Đạt">Xếp loại Đạt ({stats.countPass})</option>
              <option value="Chưa đạt">Xếp loại Chưa đạt ({stats.countFail})</option>
              {stats.countUnranked > 0 && (
                <option value="unranked">Chưa xếp loại ({stats.countUnranked})</option>
              )}
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-semibold text-slate-500">Vi phạm:</span>
            <select
              value={violationFilter}
              onChange={e => setViolationFilter(e.target.value as any)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700 outline-none"
            >
              <option value="all">Tất cả</option>
              <option value="has_violation">⚠️ Có vi phạm</option>
              <option value="no_violation">✅ Không vi phạm</option>
            </select>
          </div>

          {(selectedGroup !== 'all' || selectedGradeFilter !== 'all' || violationFilter !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedGroup('all');
                setSelectedGradeFilter('all');
                setViolationFilter('all');
                setSearchQuery('');
              }}
              className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer ml-auto"
            >
              Đặt lại bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 4: MAIN EVALUATION TABLE                                          */}
      {/* ========================================================================= */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
            <tr>
              <th className="p-3 text-center w-10">STT</th>
              <th className="p-3 min-w-[160px]">Học viên</th>
              <th className="p-3 text-center min-w-[100px]">Nề nếp & Điểm</th>
              <th className="p-3 min-w-[120px]">Tự đánh giá</th>
              <th className="p-3 min-w-[120px]">Tập thể đánh giá</th>
              <th className="p-3 min-w-[120px]">GVCN đánh giá</th>
              <th className="p-3 min-w-[120px]">Kết quả</th>
              <th className="p-3 min-w-[240px]">Ghi chú & Tóm tắt</th>
              <th className="p-3 text-right w-16">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredStudents.length > 0 ? (
              filteredStudents.map((item, idx) => {
                const isGood = item.finalGrade === 'Tốt';
                const isFair = item.finalGrade === 'Khá';
                const isPass = item.finalGrade === 'Đạt';
                const isFail = item.finalGrade === 'Chưa đạt';

                return (
                  <tr key={item.studentId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 text-center font-bold text-slate-400">
                      {idx + 1}
                    </td>

                    <td className="p-3">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{item.studentName}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {item.studentCode} • Tổ {item.group}
                      </div>
                    </td>

                    {/* Points & Transaction Summary */}
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <span
                          className={`rounded-lg px-2 py-0.5 text-xs font-black ${
                            item.netPoints >= 0
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {item.netPoints > 0 ? `+${item.netPoints}` : item.netPoints}đ
                        </span>
                      </div>
                      <div className="text-[9px] text-slate-400 mt-0.5">
                        +{item.plusPoints}đ / -{item.minusPoints}đ ({item.violationCount} lỗi)
                      </div>
                      <div className="text-[9px] text-slate-400 italic">
                        (Minh chứng tham khảo)
                      </div>
                    </td>

                    {/* Self Assessment (Manual edit or survey synced) */}
                    <td className="p-3">
                      <div className="space-y-1">
                        <select
                          disabled={isFinalized}
                          value={normalizeConductGrade(item.selfAssessment) || ''}
                          onChange={e => handleGradeChange(item.studentId, 'selfAssessment', e.target.value)}
                          className={`rounded-xl border px-2 py-1 text-xs font-bold outline-none disabled:bg-slate-100 w-full ${
                            item.selfAssessment
                              ? item.selfAssessment === 'Tốt'
                                ? 'border-emerald-300 bg-emerald-50/60 text-emerald-900 font-black'
                                : item.selfAssessment === 'Khá'
                                ? 'border-blue-300 bg-blue-50/60 text-blue-900 font-black'
                                : item.selfAssessment === 'Đạt'
                                ? 'border-amber-300 bg-amber-50/60 text-amber-900 font-black'
                                : 'border-rose-300 bg-rose-50/60 text-rose-900 font-black'
                              : 'border-slate-200 bg-slate-50 text-slate-400'
                          }`}
                        >
                          <option value="">-- Chưa đánh giá --</option>
                          {GRADE_OPTIONS.map(opt => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 px-0.5">
                          <span
                            className="truncate max-w-[90px]"
                            title={
                              item.selfAssessmentSource
                                ? `${item.selfAssessmentSource}${item.selfAssessmentSubmittedAt ? ` (${new Date(item.selfAssessmentSubmittedAt).toLocaleDateString('vi-VN')})` : ''}`
                                : item.selfAssessment ? 'Nhập thủ công' : 'Chưa có dữ liệu'
                            }
                          >
                            {item.selfAssessmentSource ? (item.selfAssessmentSource.includes('Khảo sát') ? 'Khảo sát' : item.selfAssessmentSource) : item.selfAssessment ? 'Thủ công' : 'Chưa có'}
                          </span>
                          {!isFinalized && (
                            <button
                              type="button"
                              onClick={() => handleRestoreSurveyForStudent(item.studentId)}
                              className="text-[9px] text-blue-600 hover:text-blue-800 font-bold shrink-0 hover:underline cursor-pointer"
                              title="Lấy lại kết quả tự đánh giá từ bài khảo sát rèn luyện của học sinh này"
                            >
                              Lấy KS
                            </button>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Collective Assessment */}
                    <td className="p-3">
                      <select
                        disabled={isFinalized}
                        value={item.collectiveAssessment || ''}
                        onChange={e => handleGradeChange(item.studentId, 'collectiveAssessment', e.target.value)}
                        className={`rounded-xl border px-2 py-1 text-xs font-bold outline-none disabled:bg-slate-100 w-full ${
                          item.collectiveAssessment
                            ? 'border-slate-300 bg-white text-slate-800'
                            : 'border-slate-200 bg-slate-50 text-slate-400'
                        }`}
                      >
                        <option value="">-- Chưa đánh giá --</option>
                        {GRADE_OPTIONS.map(opt => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Teacher Assessment */}
                    <td className="p-3">
                      <select
                        disabled={isFinalized}
                        value={item.teacherAssessment || ''}
                        onChange={e => handleGradeChange(item.studentId, 'teacherAssessment', e.target.value)}
                        className={`rounded-xl border px-2 py-1 text-xs font-bold outline-none disabled:bg-slate-100 w-full ${
                          item.teacherAssessment
                            ? 'border-emerald-300 bg-emerald-50/50 text-emerald-900 font-black'
                            : 'border-slate-200 bg-slate-50 text-slate-400'
                        }`}
                      >
                        <option value="">-- Chưa đánh giá --</option>
                        {GRADE_OPTIONS.map(opt => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Final Grade */}
                    <td className="p-3">
                      <select
                        disabled={isFinalized}
                        value={item.finalGrade || ''}
                        onChange={e => handleGradeChange(item.studentId, 'finalGrade', e.target.value)}
                        className={`rounded-xl px-2.5 py-1 text-xs font-black outline-none w-full border ${
                          isGood
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            : isFair
                            ? 'bg-blue-100 text-blue-900 border-blue-300'
                            : isPass
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : isFail
                            ? 'bg-rose-100 text-rose-900 border-rose-300'
                            : 'bg-slate-50 text-slate-400 border-slate-200'
                        }`}
                      >
                        <option value="">-- Chưa xếp loại --</option>
                        {GRADE_OPTIONS.map(opt => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Notes & Auto Summary */}
                    <td className="p-3">
                      <div className="space-y-1">
                        <input
                          type="text"
                          disabled={isFinalized}
                          value={item.teacherNote}
                          onChange={e => handleNoteChange(item.studentId, e.target.value)}
                          placeholder="Nhận xét của GVCN..."
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-800 outline-none focus:border-emerald-500"
                        />
                        {item.autoSummaryNote && (
                          <div className="text-[10px] text-slate-400 truncate max-w-xs" title={item.autoSummaryNote}>
                            {item.autoSummaryNote}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="p-3 text-right">
                      <button
                        onClick={() => setSelectedStudentForDetail(item)}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700 transition-colors cursor-pointer"
                        title="Xem chi tiết lịch sử vi phạm & khảo sát"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={9} className="p-8 text-center text-xs text-slate-400 italic">
                  Không tìm thấy học sinh nào phù hợp với điều kiện lọc.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: STUDENT DRILLDOWN DETAILS MODAL                                   */}
      {/* ========================================================================= */}
      {selectedStudentForDetail && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-600 text-white font-bold">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Hồ Sơ Đánh Giá Rèn Luyện: {selectedStudentForDetail.studentName}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Mã: {selectedStudentForDetail.studentCode} • Tổ {selectedStudentForDetail.group} • {currentEvaluation?.periodTitle}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudentForDetail(null)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-200 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Point KPI mini grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-center">
                  <div className="text-[10px] font-bold text-emerald-700">Điểm Khen Thưởng</div>
                  <div className="text-lg font-black text-emerald-900 mt-0.5">+{selectedStudentForDetail.plusPoints} đ</div>
                  <div className="text-[10px] text-emerald-600">{selectedStudentForDetail.praiseCount} lượt biểu dương</div>
                </div>

                <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3 text-center">
                  <div className="text-[10px] font-bold text-rose-700">Điểm Nhắc Nhở</div>
                  <div className="text-lg font-black text-rose-900 mt-0.5">-{selectedStudentForDetail.minusPoints} đ</div>
                  <div className="text-[10px] text-rose-600">{selectedStudentForDetail.violationCount} lượt vi phạm</div>
                </div>

                <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-center">
                  <div className="text-[10px] font-bold text-blue-700">Điểm Rèn Luyện Ròng</div>
                  <div className={`text-lg font-black mt-0.5 ${selectedStudentForDetail.netPoints >= 0 ? 'text-blue-900' : 'text-rose-900'}`}>
                    {selectedStudentForDetail.netPoints > 0 ? `+${selectedStudentForDetail.netPoints}` : selectedStudentForDetail.netPoints} đ
                  </div>
                  <div className="text-[10px] text-blue-600">Tích lũy trong kỳ</div>
                </div>
              </div>

              {/* Assessment Grades Form */}
              <div className="rounded-2xl border border-slate-200 p-4 space-y-3 bg-slate-50/50">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Mức Xếp Loại Đánh Giá 4 Cấp
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold text-slate-600">Tự đánh giá</label>
                      {!isFinalized && (
                        <button
                          type="button"
                          onClick={() => {
                            const res = conductEvaluationService.getSurveySelfAssessment(selectedStudentForDetail.studentId, selectedPeriod);
                            if (res?.grade) {
                              const cleanGrade = normalizeConductGrade(res.grade);
                              setSelectedStudentForDetail({
                                ...selectedStudentForDetail,
                                selfAssessment: cleanGrade,
                                selfAssessmentSource: res.sourceTitle,
                                selfAssessmentSubmittedAt: res.submittedAt
                              });
                            } else {
                              alert(`Không tìm thấy bài khảo sát rèn luyện phù hợp cho ${periodShortLabel} của học sinh này.`);
                            }
                          }}
                          className="text-[10px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer"
                          title="Lấy kết quả tự đánh giá từ bài khảo sát rèn luyện của học sinh này"
                        >
                          <RefreshCw className="h-2.5 w-2.5" />
                          <span>Lấy khảo sát</span>
                        </button>
                      )}
                    </div>
                    <select
                      disabled={isFinalized}
                      value={normalizeConductGrade(selectedStudentForDetail.selfAssessment) || ''}
                      onChange={e =>
                        setSelectedStudentForDetail({
                          ...selectedStudentForDetail,
                          selfAssessment: e.target.value,
                          selfAssessmentSource: e.target.value ? 'Nhập thủ công' : undefined
                        })
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white p-2 text-xs font-bold text-slate-800 outline-none"
                    >
                      <option value="">-- Chưa có --</option>
                      {GRADE_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                    {selectedStudentForDetail.selfAssessmentSource && (
                      <div className="text-[9px] text-slate-500 mt-1 truncate" title={selectedStudentForDetail.selfAssessmentSource}>
                        Nguồn: {selectedStudentForDetail.selfAssessmentSource}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Tập thể ĐG</label>
                    <select
                      disabled={isFinalized}
                      value={selectedStudentForDetail.collectiveAssessment}
                      onChange={e =>
                        setSelectedStudentForDetail({
                          ...selectedStudentForDetail,
                          collectiveAssessment: e.target.value
                        })
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white p-2 text-xs font-bold text-slate-800 outline-none"
                    >
                      {GRADE_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">GVCN ĐG</label>
                    <select
                      disabled={isFinalized}
                      value={selectedStudentForDetail.teacherAssessment}
                      onChange={e =>
                        setSelectedStudentForDetail({
                          ...selectedStudentForDetail,
                          teacherAssessment: e.target.value
                        })
                      }
                      className="w-full rounded-xl border border-emerald-400 bg-emerald-50 p-2 text-xs font-bold text-emerald-900 outline-none"
                    >
                      {GRADE_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Kết quả cuối</label>
                    <select
                      disabled={isFinalized}
                      value={selectedStudentForDetail.finalGrade}
                      onChange={e =>
                        setSelectedStudentForDetail({
                          ...selectedStudentForDetail,
                          finalGrade: e.target.value
                        })
                      }
                      className="w-full rounded-xl border border-blue-400 bg-blue-50 p-2 text-xs font-black text-blue-900 outline-none"
                    >
                      {GRADE_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Nhận xét của GVCN</label>
                  <textarea
                    disabled={isFinalized}
                    value={selectedStudentForDetail.teacherNote}
                    onChange={e =>
                      setSelectedStudentForDetail({
                        ...selectedStudentForDetail,
                        teacherNote: e.target.value
                      })
                    }
                    rows={2}
                    className="w-full rounded-xl border border-slate-300 bg-white p-2 text-xs text-slate-800 outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Conflict Notice if Self-Assessment differs from Teacher Assessment */}
                {(() => {
                  const selfG = normalizeConductGrade(selectedStudentForDetail.selfAssessment);
                  const teachG = normalizeConductGrade(selectedStudentForDetail.teacherAssessment);
                  if (selfG && teachG && selfG !== teachG) {
                    return (
                      <div className="rounded-xl border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-900 flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                        <div className="text-[11px] leading-relaxed">
                          <b>Lưu ý chênh lệch:</b> Học viên tự đánh giá <b>"{selfG}"</b> trong khi GVCN/Excel đánh giá <b>"{teachG}"</b>. Hai nguồn dữ liệu này được lưu trữ độc lập trên hệ thống, không tự động ghi đè lên nhau.
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              {/* Transactions List in Period */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                  <span>Chi Tiết Sự Kiện Rèn Luyện Trong Kỳ ({studentTransactionsForModal.length})</span>
                  <span className="text-[10px] text-slate-400 font-normal">Trích xuất tự động từ sổ nề nếp</span>
                </h4>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                      <tr>
                        <th className="p-2.5">Thời gian</th>
                        <th className="p-2.5 text-center">Điểm</th>
                        <th className="p-2.5">Danh mục</th>
                        <th className="p-2.5">Nội dung</th>
                        <th className="p-2.5">Ghi nhận bởi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {studentTransactionsForModal.length > 0 ? (
                        studentTransactionsForModal.map(tx => (
                          <tr key={tx.id} className="hover:bg-slate-50">
                            <td className="p-2.5 text-slate-500 whitespace-nowrap text-[11px]">
                              {tx.eventDate || tx.createdAt || 'Gần đây'}
                            </td>
                            <td className="p-2.5 text-center">
                              <span
                                className={`rounded px-1.5 py-0.5 text-[11px] font-black ${
                                  tx.points >= 0
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}
                              >
                                {tx.points > 0 ? `+${tx.points}` : tx.points}
                              </span>
                            </td>
                            <td className="p-2.5 text-slate-600 text-[11px]">{tx.category}</td>
                            <td className="p-2.5 text-slate-800 font-medium">{tx.reason}</td>
                            <td className="p-2.5 text-slate-500 text-[11px]">{tx.recordedBy || 'GVCN'}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-xs text-slate-400 italic">
                            Không có bản ghi rèn luyện nào trong kỳ đánh giá này.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50">
              <button
                type="button"
                onClick={() => setSelectedStudentForDetail(null)}
                className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 cursor-pointer"
              >
                Đóng
              </button>
              {!isFinalized && (
                <button
                  type="button"
                  onClick={() => handleSaveDetailModal(selectedStudentForDetail)}
                  className="rounded-xl bg-emerald-600 text-white px-5 py-2 text-xs font-bold hover:bg-emerald-700 cursor-pointer"
                >
                  Áp Dụng Thay Đổi
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: MEETING MINUTES MODAL (BIÊN BẢN HỌP XÉT DUYỆT)                    */}
      {/* ========================================================================= */}
      {isMinutesModalOpen && editingMinutes && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-3xl max-h-[92vh] flex flex-col rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-blue-50/80">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-700 text-white font-bold">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Biên Bản Họp Xét Đánh Giá, Xếp Loại Rèn Luyện
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {currentEvaluation?.periodTitle} • Chuẩn hóa văn bản hành chính theo quy chế THPT
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsMinutesModalOpen(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-200 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form Fields */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Official Vietnamese Administrative National Header Preview */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-center border-b border-slate-200 pb-3">
                  <div className="space-y-0.5">
                    <div className="text-[11px] text-slate-500 uppercase font-semibold">SỞ GIÁO DỤC VÀ ĐÀO TẠO</div>
                    <div className="text-xs font-black text-slate-800 uppercase tracking-tight">
                      {classService.getSettings().schoolName || 'TRƯỜNG THPT'}
                    </div>
                    <div className="text-xs font-bold text-slate-600">
                      Lớp: {classService.getSettings().className || '12A1'}
                    </div>
                    <div className="text-[10px] text-slate-400">-------------------</div>
                  </div>

                  <div className="space-y-0.5">
                    <div className="text-xs font-black text-slate-900 uppercase tracking-tight">
                      CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                    </div>
                    <div className="text-xs font-bold text-slate-800 underline decoration-slate-400 underline-offset-2">
                      Độc lập - Tự do - Hạnh phúc
                    </div>
                    <div className="text-[10px] text-slate-400">-----------------------</div>
                  </div>
                </div>

                <div className="text-center pt-1">
                  <h4 className="text-xs font-black text-blue-900 uppercase tracking-wide">
                    BIÊN BẢN HỌP XÉT ĐÁNH GIÁ, XẾP LOẠI RÈN LUYỆN HỌC SINH
                  </h4>
                  <p className="text-[11px] text-slate-500 italic mt-0.5">
                    {currentEvaluation?.periodTitle} • Năm học: {classService.getSettings().academicYear || '2025 - 2026'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ngày họp</label>
                  <input
                    type="date"
                    value={editingMinutes.meetingDate}
                    onChange={e => setEditingMinutes({ ...editingMinutes, meetingDate: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs font-semibold text-slate-800 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Giờ họp</label>
                  <input
                    type="text"
                    value={editingMinutes.meetingTime || '15:30'}
                    onChange={e => setEditingMinutes({ ...editingMinutes, meetingTime: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs font-semibold text-slate-800 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Địa điểm</label>
                  <input
                    type="text"
                    value={editingMinutes.meetingLocation}
                    onChange={e => setEditingMinutes({ ...editingMinutes, meetingLocation: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs font-semibold text-slate-800 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Chủ trì (Chủ tọa)</label>
                  <input
                    type="text"
                    value={editingMinutes.presidedBy}
                    onChange={e => setEditingMinutes({ ...editingMinutes, presidedBy: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs font-semibold text-slate-800 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Thư ký cuộc họp</label>
                  <input
                    type="text"
                    value={editingMinutes.secretary}
                    onChange={e => setEditingMinutes({ ...editingMinutes, secretary: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs font-semibold text-slate-800 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Số học sinh có mặt</label>
                  <input
                    type="number"
                    value={editingMinutes.attendeesCount}
                    onChange={e => setEditingMinutes({ ...editingMinutes, attendeesCount: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs font-semibold text-slate-800 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nội dung / Tiến trình cuộc họp</label>
                <textarea
                  value={editingMinutes.meetingAgenda}
                  onChange={e => setEditingMinutes({ ...editingMinutes, meetingAgenda: e.target.value })}
                  rows={3}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ý kiến đóng góp của tập thể</label>
                <textarea
                  value={editingMinutes.collectiveOpinion}
                  onChange={e => setEditingMinutes({ ...editingMinutes, collectiveOpinion: e.target.value })}
                  rows={2}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Kết luận của Giáo viên chủ nhiệm</label>
                <textarea
                  value={editingMinutes.teacherConclusion}
                  onChange={e => setEditingMinutes({ ...editingMinutes, teacherConclusion: e.target.value })}
                  rows={2}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
              <button
                type="button"
                onClick={handleExportWordMinutes}
                disabled={isExportingWord}
                className="flex items-center gap-1.5 rounded-xl bg-blue-700 text-white px-4 py-2 text-xs font-bold hover:bg-blue-800 cursor-pointer shadow-xs"
              >
                <FileDown className="h-4 w-4" />
                <span>Xuất File Word (.docx)</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsMinutesModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handleSaveMinutes}
                  className="rounded-xl bg-emerald-600 text-white px-5 py-2 text-xs font-bold hover:bg-emerald-700 cursor-pointer"
                >
                  Lưu Biên Bản
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Excel Import Modal */}
      {isExcelImportModalOpen && (
        <ConductExcelImportModal
          isOpen={isExcelImportModalOpen}
          onClose={() => setIsExcelImportModalOpen(false)}
          currentEvaluation={currentEvaluation}
          students={students}
          onConfirmImport={handleConfirmExcelImport}
        />
      )}
    </div>
  );
};
