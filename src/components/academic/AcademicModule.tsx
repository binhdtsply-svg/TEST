/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  BookOpen,
  Sliders,
  Plus,
  Filter,
  CheckCircle2,
  AlertCircle,
  Download,
  Eye,
  Edit3,
  Paperclip,
  Check,
  X,
  Upload,
  UserCheck,
  Bookmark,
  FileText,
  Trash2,
  FileSpreadsheet,
  Save,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  Search,
  CheckSquare,
  MessageSquare,
  HelpCircle
} from 'lucide-react';
import {
  AttachedFile,
  SubjectGrade,
  StudentAcademicRecord,
  SharedGradeFile,
  Student,
  AcademicPeriod,
  SubjectConfig
} from '../../types';
import { academicService, PERIOD_NAMES, calculateSubjectAverage, isEnteredValidScore, isSameSubject } from '../../services/AcademicService';
import { studentService } from '../../services/StudentService';
import { useStudents } from '../../hooks/useStudents';
import { authService } from '../../services/AuthService';
import { exportService } from '../../services/ExportService';
import { classService } from '../../services/ClassService';
import { ExcelGradeImportModal } from './ExcelGradeImportModal';
import { UploadTranscriptModal } from './UploadTranscriptModal';
import { SubjectConfigTab } from './SubjectConfigTab';
import { FilePreviewModal } from '../common/FilePreviewModal';
import { AccessRestricted } from '../common/AccessRestricted';
import { Pagination } from '../common/Pagination';
import { getVietnameseSubjectShortName, getVietnameseSubjectFullName } from '../../utils/subjectHelpers';

interface AcademicModuleProps {
  initialTab?: 'grades' | 'entry' | 'shared_files' | 'config';
}

export const AcademicModule: React.FC<AcademicModuleProps> = ({ initialTab = 'grades' }) => {
  const currentUser = authService.getCurrentUser();
  const classSettings = classService.getSettings();
  const isTeacher = currentUser.role === 'TEACHER';

  // Active sub-tabs
  const [activeTab, setActiveTab] = useState<'grades' | 'entry' | 'shared_files' | 'config'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Milestone / Academic Period
  const [selectedPeriod, setSelectedPeriod] = useState<AcademicPeriod>('midterm_hk1');
  const isFinalPeriod = selectedPeriod === 'final_hk1' || selectedPeriod === 'final_hk2';

  // Subjects from Single Source of Truth
  const [subjects, setSubjects] = useState<SubjectConfig[]>(classService.getSubjects());
  const appliedSubjects = subjects.filter((s) => s.selected !== false && s.active !== false);

  // Data states
  const [sharedGradeFiles, setSharedGradeFiles] = useState<SharedGradeFile[]>([]);
  const [students, setStudents] = useState<Student[]>(studentService.getAll());

  // Modals state
  const [isExcelImportModalOpen, setIsExcelImportModalOpen] = useState(false);
  const [isUploadTranscriptModalOpen, setIsUploadTranscriptModalOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };
  const [previewFile, setPreviewFile] = useState<AttachedFile | null>(null);

  // Grade Edit Modal for specific student
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editingGrades, setEditingGrades] = useState<SubjectGrade[]>([]);
  const [editingAcademicSummary, setEditingAcademicSummary] = useState<string>('');
  const [editingConductSummary, setEditingConductSummary] = useState<string>('');
  const [editingPublishedToStudent, setEditingPublishedToStudent] = useState<boolean>(false);
  const [editingPublishedToParent, setEditingPublishedToParent] = useState<boolean>(false);
  const [gradeSuccessMsg, setGradeSuccessMsg] = useState<string | null>(null);

  // Search & Filters for Grade List
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [overviewPage, setOverviewPage] = useState<number>(1);
  const [overviewPageSize, setOverviewPageSize] = useState<number>(10);

  // Direct Entry Tab States
  const [entrySubjectName, setEntrySubjectName] = useState<string>('');
  const currentSubjectConfig = appliedSubjects.find((s) => s.name === entrySubjectName);
  const [entryGradesMap, setEntryGradesMap] = useState<Record<string, SubjectGrade>>({});
  const [hasUnsavedEntryChanges, setHasUnsavedEntryChanges] = useState<boolean>(false);
  const [entrySaveSuccess, setEntrySaveSuccess] = useState<boolean>(false);
  const [entryPage, setEntryPage] = useState<number>(1);
  const [entryPageSize, setEntryPageSize] = useState<number>(10);

  const [dataRefreshTick, setDataRefreshTick] = useState<number>(0);

  // Memoized parent midterm grades map for preserving mid-term scores in Cuối HKI / Cuối HKII
  const parentMidtermGradesMap = useMemo(() => {
    if (!isFinalPeriod || !entrySubjectName) return {};
    const parentPeriod: AcademicPeriod = selectedPeriod === 'final_hk1' ? 'midterm_hk1' : 'midterm_hk2';
    const map: Record<string, SubjectGrade | undefined> = {};
    students.forEach((s) => {
      const parentRec = academicService.getStudentAcademicRecord(s.id, parentPeriod);
      map[s.id] = parentRec?.grades?.find((g) => isSameSubject(g, { name: entrySubjectName }));
    });
    return map;
  }, [isFinalPeriod, selectedPeriod, entrySubjectName, students, dataRefreshTick]);

  const parentMidtermRecordForModal = useMemo(() => {
    if (!isFinalPeriod || !editingStudentId) return null;
    const parentPeriod: AcademicPeriod = selectedPeriod === 'final_hk1' ? 'midterm_hk1' : 'midterm_hk2';
    return academicService.getStudentAcademicRecord(editingStudentId, parentPeriod);
  }, [isFinalPeriod, selectedPeriod, editingStudentId, dataRefreshTick]);

  const modalMaxTxCols = Math.max(
    1,
    ...appliedSubjects
      .filter((s) => s.assessmentMode !== 'COMMENT_ONLY')
      .map((s) => s.txColumnCount ?? 3)
  );

  const loadData = () => {
    const subs = classService.getSubjects();
    setSubjects(subs);
    setStudents(studentService.getAll());
    setSharedGradeFiles(
      academicService.getSharedGradeFiles({
        period: selectedPeriod,
        isTeacher: true
      })
    );
    setDataRefreshTick((prev) => prev + 1);

    if (!entrySubjectName && subs.length > 0) {
      setEntrySubjectName(subs[0]?.name || 'Toán học');
    }
  };

  useEffect(() => {
    academicService.syncWithBackendServer().catch(() => {});
    loadData();
    const unsubAcademic = academicService.subscribe(loadData);
    const unsubClass = classService.subscribe(loadData);
    const unsubStudent = studentService.subscribe(loadData);
    return () => {
      unsubAcademic();
      unsubClass();
      unsubStudent();
    };
  }, [selectedPeriod, currentUser.role]);

  // Load entry grades when entry subject, period, or underlying academic records change
  useEffect(() => {
    if (activeTab === 'entry' && entrySubjectName) {
      const map: Record<string, SubjectGrade> = {};
      const isCommentSub = currentSubjectConfig?.assessmentMode === 'COMMENT_ONLY' || academicService.isCommentOnlySubject(entrySubjectName);
      students.forEach((s) => {
        const rec = academicService.getStudentAcademicRecord(s.id, selectedPeriod);
        const g = rec.grades.find((x) => isSameSubject(x, { name: entrySubjectName }) || x.subjectName === entrySubjectName);
        if (g) {
          map[s.id] = { ...g };
        } else {
          map[s.id] = {
            subjectName: entrySubjectName,
            assessmentMode: isCommentSub ? 'COMMENT_ONLY' : 'SCORE_AND_COMMENT',
            regularScores: [],
            tx1: undefined,
            tx2: undefined,
            tx3: undefined,
            tx4: undefined,
            tx5: undefined,
            tx6: undefined,
            midterm: undefined,
            finalExam: undefined,
            tbHk1: undefined,
            tbHk2: undefined,
            tbCaNam: undefined,
            average: undefined,
            qualitativeResult: selectedPeriod === 'full_year' ? undefined : 'Đạt',
            comment: ''
          };
        }
      });
      setEntryGradesMap(map);
      setHasUnsavedEntryChanges(false);
    }
  }, [activeTab, entrySubjectName, selectedPeriod, students, currentSubjectConfig?.assessmentMode, currentSubjectConfig?.txColumnCount, dataRefreshTick]);

  if (!isTeacher) {
    return (
      <AccessRestricted
        userRole={currentUser.role}
        requiredRole="TEACHER"
        moduleName="Quản lý Học tập & Cấu hình Môn học"
        onBackToHome={() => {}}
      />
    );
  }

  // Open single student grade edit modal
  const handleOpenStudentGradeEdit = (studentId: string) => {
    const record = academicService.getStudentAcademicRecord(studentId, selectedPeriod);
    setEditingStudentId(studentId);

    // Merge student grades with current applied subjects
    const mergedGrades: SubjectGrade[] = appliedSubjects.map((sub) => {
      const existing = record.grades.find((g) => isSameSubject(g, sub) || g.subjectName === sub.name);
      if (existing) return { ...existing, assessmentMode: sub.assessmentMode };
      return {
        subjectName: sub.name,
        subjectCode: sub.subjectCode || sub.code,
        assessmentMode: sub.assessmentMode,
        regularScores: [],
        tx1: undefined,
        tx2: undefined,
        tx3: undefined,
        tx4: undefined,
        midterm: undefined,
        finalExam: undefined,
        tbHk1: undefined,
        tbHk2: undefined,
        tbCaNam: undefined,
        average: undefined,
        qualitativeResult: selectedPeriod === 'full_year' ? undefined : 'Đạt',
        comment: ''
      };
    });

    setEditingGrades(mergedGrades);
    setEditingAcademicSummary(record.academicSummary || record.teacherComment || '');
    setEditingConductSummary(record.conductSummary || '');
    setEditingPublishedToStudent(record.publishedToStudent || false);
    setEditingPublishedToParent(record.publishedToParent || false);
    setGradeSuccessMsg(null);
  };

  const handleScoreChange = (index: number, field: keyof SubjectGrade, valStr: string) => {
    if (isFinalPeriod) {
      if (field === 'midterm') {
        return; // Bảo toàn điểm giữa kì: không cho phép chỉnh sửa trong kỳ cuối học kì
      }
      if (typeof field === 'string' && field.startsWith('tx')) {
        const currentSub = editingGrades[index];
        const parentG = parentMidtermRecordForModal?.grades?.find((x) => isSameSubject(x, currentSub));
        if (isEnteredValidScore(parentG?.[field as keyof SubjectGrade])) {
          return; // Bảo toàn điểm thường xuyên đã có từ giữa kì
        }
      }
    }
    const val = isEnteredValidScore(valStr) ? Number(String(valStr).trim()) : undefined;
    setEditingGrades((prev) => {
      const copy = [...prev];
      const current = copy[index];
      const target: any = { ...current, [field]: val };

      const tx1 = isEnteredValidScore(target.tx1) ? Number(target.tx1) : undefined;
      const tx2 = isEnteredValidScore(target.tx2) ? Number(target.tx2) : undefined;
      const tx3 = isEnteredValidScore(target.tx3) ? Number(target.tx3) : undefined;
      const tx4 = isEnteredValidScore(target.tx4) ? Number(target.tx4) : undefined;
      const tx5 = isEnteredValidScore(target.tx5) ? Number(target.tx5) : undefined;
      const tx6 = isEnteredValidScore(target.tx6) ? Number(target.tx6) : undefined;
      const regularScores = [tx1, tx2, tx3, tx4, tx5, tx6].filter((v): v is number => v !== undefined);
      const midterm = isEnteredValidScore(target.midterm) ? Number(target.midterm) : undefined;
      const finalExam = isEnteredValidScore(target.finalExam) ? Number(target.finalExam) : undefined;

      let tbHk1 = isEnteredValidScore(target.tbHk1) ? Number(Number(target.tbHk1).toFixed(1)) : undefined;
      let tbHk2 = isEnteredValidScore(target.tbHk2) ? Number(Number(target.tbHk2).toFixed(1)) : undefined;

      if (selectedPeriod === 'full_year') {
        if (field === 'tbHk1') {
          target._manualTbHk1 = val !== undefined;
          target._clearedTbHk1 = val === undefined;
        } else if (field === 'tbHk2') {
          target._manualTbHk2 = val !== undefined;
          target._clearedTbHk2 = val === undefined;
        } else if (['tx1', 'tx2', 'tx3', 'tx4', 'tx5', 'tx6', 'midterm', 'finalExam'].includes(String(field))) {
          const calcHk2 = calculateSubjectAverage({
            assessmentMode: target.assessmentMode,
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
          if (calcHk2 !== undefined) {
            tbHk2 = calcHk2;
            target._clearedTbHk2 = false;
          } else if (!target._manualTbHk2) {
            tbHk2 = undefined;
          }
        }
      }

      const updatedSubject: SubjectGrade = {
        ...target,
        tx1,
        tx2,
        tx3,
        tx4,
        tx5,
        tx6,
        regularScores,
        midterm,
        finalExam,
        tbHk1,
        tbHk2
      };

      if (updatedSubject.assessmentMode !== 'COMMENT_ONLY') {
        const calcAvg = calculateSubjectAverage({
          assessmentMode: updatedSubject.assessmentMode,
          tx1,
          tx2,
          tx3,
          tx4,
          tx5,
          tx6,
          regularScores,
          midterm,
          finalExam,
          period: selectedPeriod,
          tbHk1: updatedSubject.tbHk1,
          tbHk2: updatedSubject.tbHk2,
          tbCaNam: updatedSubject.tbCaNam
        });
        updatedSubject.average = calcAvg;
        if (selectedPeriod === 'full_year') {
          updatedSubject.tbCaNam = calcAvg;
        }
      }
      copy[index] = updatedSubject;
      return copy;
    });
  };

  // Single Student Modal: Save (Draft) vs Publish (Công bố cho HV và PH)
  const handleSaveStudentGradebook = async (e?: React.FormEvent, shouldPublish: boolean = false) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!editingStudentId || isSaving) return;

    setIsSaving(true);
    try {
      const existingRec = academicService.getStudentAcademicRecord(editingStudentId, selectedPeriod);
      const willPublishStudent = shouldPublish ? true : (existingRec.publishedToStudent ?? true);
      const willPublishParent = shouldPublish ? true : (existingRec.publishedToParent ?? true);
      await academicService.persistStudentGrades(
        editingStudentId,
        editingGrades,
        selectedPeriod,
        editingAcademicSummary,
        classSettings.homeroomTeacherName || classSettings.teacherName || 'GVCN',
        {
          academicSummary: editingAcademicSummary,
          conductSummary: editingConductSummary,
          publishedToStudent: willPublishStudent,
          publishedToParent: willPublishParent
        }
      );

      if (shouldPublish) {
        academicService.publishStudentGrades(editingStudentId, selectedPeriod);
        setGradeSuccessMsg('Đã công bố bảng điểm cho học viên và phụ huynh thành công!');
        showToast('Đã công bố điểm cho học viên và phụ huynh thành công!');
      } else {
        setGradeSuccessMsg('Đã lưu dữ liệu điểm thành công lên hệ thống!');
        showToast('Đã lưu dữ liệu điểm thành công lên hệ thống.');
      }

      loadData();
      setTimeout(() => {
        setGradeSuccessMsg(null);
        setEditingStudentId(null);
      }, 1000);
    } catch (err: any) {
      showToast('Lỗi khi lưu bảng điểm lên hệ thống: ' + (err?.message || 'Không thể lưu.'));
    } finally {
      setIsSaving(false);
    }
  };

  // Direct Entry Tab: Save entire class grades for selected subject (Draft vs Publish)
  const handleSaveClassSubjectGrades = async (shouldPublish: boolean = false) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const items: Array<{
        studentId: string;
        updatedGrades: SubjectGrade[];
        period: AcademicPeriod;
        teacherComment?: string;
        commentUpdatedBy?: string;
        options?: any;
      }> = [];

      for (const s of students) {
        const rec = academicService.getStudentAcademicRecord(s.id, selectedPeriod);
        const subjectGrade = entryGradesMap[s.id];
        if (subjectGrade) {
          const otherGrades = rec.grades.filter(
            (g) => !isSameSubject(g, { name: entrySubjectName, subjectName: entrySubjectName } as any)
          );
          const updatedGrades = [...otherGrades, subjectGrade];
          const publishedToStudent = shouldPublish ? true : (rec.publishedToStudent ?? true);
          const publishedToParent = shouldPublish ? true : (rec.publishedToParent ?? true);

          items.push({
            studentId: s.id,
            updatedGrades,
            period: selectedPeriod,
            teacherComment: rec.teacherComment,
            commentUpdatedBy: classSettings.homeroomTeacherName || classSettings.teacherName || 'GVCN',
            options: {
              academicSummary: rec.academicSummary,
              conductSummary: rec.conductSummary,
              publishedToStudent,
              publishedToParent
            }
          });
        }
      }

      if (items.length === 0) {
        showToast('Chưa có học sinh nào được nhập hoặc sửa điểm.');
        setIsSaving(false);
        return;
      }

      const res = await academicService.persistStudentGradesBatch(items);

      if (!res.success && res.savedCount === 0) {
        const detailStr = res.failedDetails.length > 0
          ? ': ' + res.failedDetails.map(d => `${d.studentName || d.studentId}: ${d.message}`).join(', ')
          : '';
        showToast('Lỗi khi lưu điểm lên hệ thống' + detailStr);
        setIsSaving(false);
        return;
      }

      loadData();

      if (shouldPublish) {
        academicService.publishAllGrades(selectedPeriod);
        if (res.failedCount > 0) {
          showToast(`Đã lưu và công bố điểm môn ${entrySubjectName} cho ${res.savedCount}/${items.length} học sinh. Thất bại: ${res.failedDetails.map(d => d.studentName || d.studentId).join(', ')}`);
        } else {
          showToast(`Đã công bố điểm môn ${entrySubjectName} cho học viên và phụ huynh thành công!`);
        }
      } else {
        if (res.failedCount > 0) {
          showToast(`Đã lưu điểm môn ${entrySubjectName} cho ${res.savedCount}/${items.length} học sinh. Thất bại: ${res.failedDetails.map(d => d.studentName || d.studentId).join(', ')}`);
        } else {
          showToast(`Đã lưu điểm môn ${entrySubjectName} (${res.savedCount} học sinh) thành công lên hệ thống.`);
        }
      }

      setHasUnsavedEntryChanges(false);
      setEntrySaveSuccess(true);
      setTimeout(() => setEntrySaveSuccess(false), 3000);
    } catch (err: any) {
      showToast('Lỗi khi lưu điểm lên hệ thống: ' + (err?.message || 'Không thể lưu.'));
    } finally {
      setIsSaving(false);
    }
  };

  // Subtab 1: Save Overview Grades (Draft) vs Publish to all
  const handleSaveAllGradesDraft = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const items = students.map((s) => {
        const rec = academicService.getStudentAcademicRecord(s.id, selectedPeriod);
        const currentGrades = Array.isArray(rec.grades) ? rec.grades : [];
        return {
          studentId: s.id,
          updatedGrades: currentGrades,
          period: selectedPeriod,
          teacherComment: rec.academicSummary || rec.teacherComment,
          commentUpdatedBy: classSettings.homeroomTeacherName || classSettings.teacherName || 'GVCN',
          options: {
            academicSummary: rec.academicSummary,
            conductSummary: rec.conductSummary,
            publishedToStudent: rec.publishedToStudent ?? true,
            publishedToParent: rec.publishedToParent ?? true
          }
        };
      });

      const res = await academicService.persistStudentGradesBatch(items);

      if (!res.success && res.savedCount === 0) {
        const detailStr = res.failedDetails.length > 0
          ? ': ' + res.failedDetails.map(d => `${d.studentName || d.studentId}: ${d.message}`).join(', ')
          : '';
        showToast('Lỗi khi lưu dữ liệu điểm lên hệ thống' + detailStr);
        setIsSaving(false);
        return;
      }

      loadData();
      if (res.failedCount > 0) {
        showToast(`Đã lưu ${res.savedCount}/${items.length} học sinh. Thất bại: ${res.failedDetails.map(d => d.studentName || d.studentId).join(', ')}`);
      } else {
        showToast('Đã lưu toàn bộ bảng điểm thành công lên hệ thống (chưa công bố).');
      }
    } catch (err: any) {
      showToast('Lỗi khi lưu dữ liệu điểm lên hệ thống: ' + (err?.message || 'Không thể lưu.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublishAllGrades = () => {
    try {
      academicService.publishAllGrades(selectedPeriod);
      loadData();
      showToast('Đã công bố điểm cho học viên và phụ huynh thành công!');
    } catch (err: any) {
      showToast('Lỗi khi công bố điểm: ' + (err?.message || 'Không thể công bố.'));
    }
  };

  // Export all grades to Excel (using latest saved records & active filters)
  const handleExportAllGrades = async () => {
    if (editingStudentId !== null || (activeTab === 'entry' && hasUnsavedEntryChanges)) {
      showToast('Có thay đổi điểm chưa lưu! Vui lòng nhấn Lưu trước khi xuất Excel để đảm bảo dữ liệu chính xác.');
      return;
    }

    const synced = await academicService.syncWithBackendServer(undefined, true);
    if (!synced) {
      showToast('Không thể truy vấn dữ liệu điểm mới nhất từ máy chủ. Vui lòng kiểm tra kết nối và thử lại.');
      return;
    }

    const targetStudents = filteredStudents.length > 0 || studentSearch.trim() || groupFilter !== 'all' ? filteredStudents : students;
    const data = targetStudents.map((s, idx) => {
      const rec = academicService.getStudentAcademicRecord(s.id, selectedPeriod);
      const row: Record<string, any> = {
        STT: idx + 1,
        'Mã học sinh': s.code,
        'Họ và tên': s.fullName,
        Tổ: `Tổ ${s.group}`
      };

      // Add each subject
      appliedSubjects.forEach((sub) => {
        const g = rec.grades.find((x) => isSameSubject(x, sub));
        if (sub.assessmentMode === 'COMMENT_ONLY') {
          row[sub.name] = (g?.qualitativeResult === 'Đạt' || g?.qualitativeResult === 'Chưa đạt') ? g.qualitativeResult : '-';
        } else if (selectedPeriod === 'full_year') {
          const val = g?.tbCaNam !== undefined ? g.tbCaNam : g?.average;
          row[sub.name] = typeof val === 'number' ? val : '-';
        } else {
          row[sub.name] = typeof g?.average === 'number' ? g.average : '-';
        }
      });

      const evalRes = academicService.evaluateStudentTT43(rec, appliedSubjects);
      row['Kết quả học tập (TT43)'] = evalRes.label;
      row['Nhận xét học tập'] = rec.academicSummary || rec.teacherComment || '-';
      row['Nhận xét rèn luyện'] = rec.conductSummary || '-';

      return row;
    });

    const cName = classSettings.className ? classSettings.className.replace(/\s+/g, '_') : 'Lop';
    exportService.exportToExcel(
      data,
      `Bang_Ket_Qua_Hoc_Tap_${selectedPeriod}_${cName}`,
      `Kết quả ${PERIOD_NAMES[selectedPeriod]}`
    );
  };

  // Filter students
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (groupFilter !== 'all' && s.group.toString() !== groupFilter) return false;
      if (studentSearch.trim()) {
        const q = studentSearch.toLowerCase();
        const matchName = s.fullName.toLowerCase().includes(q);
        const matchCode = s.code.toLowerCase().includes(q);
        if (!matchName && !matchCode) return false;
      }
      return true;
    });
  }, [students, groupFilter, studentSearch]);

  // Reset pagination when search/filter changes
  useEffect(() => {
    setOverviewPage(1);
  }, [groupFilter, studentSearch]);

  const paginatedOverviewStudents = useMemo(() => {
    const start = (overviewPage - 1) * overviewPageSize;
    return filteredStudents.slice(start, start + overviewPageSize);
  }, [filteredStudents, overviewPage, overviewPageSize]);

  const paginatedEntryStudents = useMemo(() => {
    const start = (entryPage - 1) * entryPageSize;
    return students.slice(start, start + entryPageSize);
  }, [students, entryPage, entryPageSize]);

  const editingStudent = students.find((s) => s.id === editingStudentId);

  return (
    <div className="space-y-6 animate-fade-in relative">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 rounded-2xl bg-slate-900 text-white px-5 py-3 text-xs font-bold shadow-2xl animate-fade-in border border-slate-700">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Header & Tab Navigation */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-blue-600" />
              <span>Quản Lý Học Tập & Đánh Giá</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Theo dõi kết quả học tập định kỳ theo Thông tư 43/2021/TT-BGDĐT, nhập điểm, minh chứng và cấu hình môn học
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSaveAllGradesDraft}
              className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors shadow-2xs cursor-pointer"
              title="Lưu dữ liệu điểm hiện tại thành dữ liệu đã lưu nhưng chưa công bố"
            >
              <Save className="h-4 w-4 text-blue-600" />
              <span>Lưu</span>
            </button>

            <button
              type="button"
              onClick={handlePublishAllGrades}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-colors shadow-2xs cursor-pointer"
              title="Dành riêng cho thao tác công bố điểm cho học viên và phụ huynh"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Công bố cho HV và PH</span>
            </button>

            <button
              type="button"
              onClick={() => setIsExcelImportModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors shadow-2xs cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              <span>Nhập điểm từ Excel</span>
            </button>

            <button
              type="button"
              onClick={handleExportAllGrades}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            >
              <Download className="h-4 w-4 text-slate-600" />
              <span>Xuất bảng điểm Excel</span>
            </button>
          </div>
        </div>

        {/* 4 Clear Functional Sub-Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200">
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('grades')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition-all cursor-pointer ${
                activeTab === 'grades'
                  ? 'bg-white text-blue-700 shadow-xs ring-1 ring-slate-200/50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <BookOpen className="h-4 w-4" />
              <span>Bảng kết quả học tập</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('entry')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition-all cursor-pointer ${
                activeTab === 'entry'
                  ? 'bg-white text-blue-700 shadow-xs ring-1 ring-slate-200/50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Edit3 className="h-4 w-4" />
              <span>Nhập điểm trực tiếp</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('shared_files')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition-all cursor-pointer ${
                activeTab === 'shared_files'
                  ? 'bg-white text-blue-700 shadow-xs ring-1 ring-slate-200/50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Paperclip className="h-4 w-4" />
              <span>Minh chứng & Phiếu điểm</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('config')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition-all cursor-pointer ${
                activeTab === 'config'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Sliders className="h-4 w-4" />
              <span>Cấu hình môn học (GVCN)</span>
            </button>
          </div>

          {/* Period Selector */}
          {activeTab !== 'config' && (
            <div className="flex items-center gap-2 px-2">
              <span className="text-[11px] font-bold text-slate-500 hidden sm:inline">Kỳ đánh giá:</span>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value as AcademicPeriod)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-blue-900 focus:border-blue-500 focus:outline-hidden cursor-pointer shadow-2xs"
              >
                <option value="midterm_hk1">Giữa Học kỳ 1 (GK1)</option>
                <option value="final_hk1">Cuối Học kỳ 1 (CK1)</option>
                <option value="midterm_hk2">Giữa Học kỳ 2 (GK2)</option>
                <option value="final_hk2">Cuối Học kỳ 2 (CK2)</option>
                <option value="full_year">Điểm cuối năm học</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* SUBTAB 1: BẢNG KẾT QUẢ HỌC TẬP TỔNG QUAN */}
      {activeTab === 'grades' && (
        <div className="space-y-4 animate-fade-in">
          {/* TT43 / 2021 / TT-BGDĐT Statistical Overview Banner */}
          {(() => {
            const tt43Stats = academicService.getTT43Statistics(selectedPeriod, appliedSubjects);
            return (
              <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/60 via-white to-indigo-50/40 p-4 sm:p-5 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                    <div>
                      <h3 className="text-xs font-black text-blue-950 uppercase tracking-wider">
                        Thống kê Đánh giá Kết quả Học tập theo Thông tư 43/2021/TT-BGDĐT
                      </h3>
                      <p className="text-[11px] text-blue-700">
                        Áp dụng cho {PERIOD_NAMES[selectedPeriod]} • {tt43Stats.statusLabel} • {tt43Stats.completedAssessed}/{tt43Stats.totalAssessed} học sinh đủ dữ liệu đánh giá
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={handleSaveAllGradesDraft}
                      className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-white px-3.5 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-50 shadow-2xs transition-colors cursor-pointer"
                      title="Lưu dữ liệu điểm hiện tại thành dữ liệu đã lưu nhưng chưa công bố"
                    >
                      <Save className="h-3.5 w-3.5 text-blue-600" />
                      <span>Lưu</span>
                    </button>

                    <button
                      type="button"
                      onClick={handlePublishAllGrades}
                      className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-blue-700 shadow-2xs transition-colors cursor-pointer"
                      title="Dành riêng cho thao tác công bố điểm cho học viên và phụ huynh"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Công bố cho HV và PH</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {/* Tốt */}
                  <div className="rounded-xl border border-emerald-200 bg-white p-3 shadow-2xs">
                    <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800">
                      <span>Mức TỐT</span>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-800 font-extrabold">
                        {tt43Stats.totPercent}%
                      </span>
                    </div>
                    <div className="text-2xl font-black text-emerald-950 mt-1">
                      {tt43Stats.totCount} <span className="text-xs font-bold text-slate-500">học sinh</span>
                    </div>
                    <div className="text-[10px] text-emerald-700 mt-0.5">Môn NX Đạt; ĐTB ≥ 6.5 & ≥ 5 môn ≥ 8.0</div>
                  </div>

                  {/* Khá */}
                  <div className="rounded-xl border border-blue-200 bg-white p-3 shadow-2xs">
                    <div className="flex items-center justify-between text-[11px] font-bold text-blue-800">
                      <span>Mức KHÁ</span>
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] text-blue-800 font-extrabold">
                        {tt43Stats.khaPercent}%
                      </span>
                    </div>
                    <div className="text-2xl font-black text-blue-950 mt-1">
                      {tt43Stats.khaCount} <span className="text-xs font-bold text-slate-500">học sinh</span>
                    </div>
                    <div className="text-[10px] text-blue-700 mt-0.5">Môn NX Đạt; ĐTB ≥ 5.0 & ≥ 5 môn ≥ 6.5</div>
                  </div>

                  {/* Đạt */}
                  <div className="rounded-xl border border-amber-200 bg-white p-3 shadow-2xs">
                    <div className="flex items-center justify-between text-[11px] font-bold text-amber-800">
                      <span>Mức ĐẠT</span>
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] text-amber-800 font-extrabold">
                        {tt43Stats.datPercent}%
                      </span>
                    </div>
                    <div className="text-2xl font-black text-amber-950 mt-1">
                      {tt43Stats.datCount} <span className="text-xs font-bold text-slate-500">học sinh</span>
                    </div>
                    <div className="text-[10px] text-amber-700 mt-0.5">Tối đa 1 môn NX Chưa đạt; ≥ 5 môn ≥ 5.0, không môn &lt; 3.5</div>
                  </div>

                  {/* Chưa đạt */}
                  <div className="rounded-xl border border-rose-200 bg-white p-3 shadow-2xs">
                    <div className="flex items-center justify-between text-[11px] font-bold text-rose-800">
                      <span>Mức CHƯA ĐẠT</span>
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] text-rose-800 font-extrabold">
                        {tt43Stats.chuaDatPercent}%
                      </span>
                    </div>
                    <div className="text-2xl font-black text-rose-950 mt-1">
                      {tt43Stats.chuaDatCount} <span className="text-xs font-bold text-slate-500">học sinh</span>
                    </div>
                    <div className="text-[10px] text-rose-700 mt-0.5">Các trường hợp còn lại (đã đủ dữ liệu)</div>
                  </div>

                  {/* Chưa đủ dữ liệu */}
                  <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs col-span-2 sm:col-span-1">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                      <span>CHƯA ĐỦ DỮ LIỆU</span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-700 font-extrabold">
                        {tt43Stats.chuaDuLieuPercent}%
                      </span>
                    </div>
                    <div className="text-2xl font-black text-slate-800 mt-1">
                      {tt43Stats.chuaDuLieuCount} <span className="text-xs font-bold text-slate-500">học sinh</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Điểm trống hoặc thiếu ĐTB môn</div>
                  </div>
                </div>

                {/* Ghi chú khi có học sinh chưa đủ dữ liệu */}
                {tt43Stats.chuaDuLieuCount > 0 && (
                  <div className="flex items-start sm:items-center gap-2 rounded-xl bg-amber-50/80 border border-amber-200/80 px-3.5 py-2 text-xs text-amber-900">
                    <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
                    <span>
                      Hiện có <strong>{tt43Stats.chuaDuLieuCount}</strong> học sinh ({tt43Stats.chuaDuLieuPercent}%) chưa đủ dữ liệu đánh giá (chưa nhập điểm hoặc thiếu điểm trung bình môn). Theo Điều 9 Thông tư 43/2021/TT-BGDĐT, các trường hợp này không được mặc định xếp loại mà cần nhập đủ dữ liệu để xếp loại chính xác.
                    </span>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Filter and Search Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm học sinh theo tên hoặc mã..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="w-64 rounded-xl border border-slate-200 bg-slate-50/50 pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-hidden"
                />
              </div>

              {/* Group Filter */}
              <div className="flex items-center gap-1 text-xs">
                <span className="text-slate-500 font-bold">Tổ:</span>
                <select
                  value={groupFilter}
                  onChange={(e) => setGroupFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:border-blue-500 focus:outline-hidden cursor-pointer"
                >
                  <option value="all">Tất cả các tổ</option>
                  <option value="1">Tổ 1</option>
                  <option value="2">Tổ 2</option>
                  <option value="3">Tổ 3</option>
                  <option value="4">Tổ 4</option>
                </select>
              </div>
            </div>

            <div className="text-xs text-slate-500">
              Hiển thị <strong className="text-slate-800">{filteredStudents.length}</strong> / {students.length} học sinh
            </div>
          </div>

          {/* Main Grade Table */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-700">
                    <th className="py-3 px-3 text-center w-10">STT</th>
                    <th className="py-3 px-3 min-w-[170px] sticky left-0 bg-slate-50 z-10">Học sinh</th>
                    <th className="py-3 px-3 text-center w-16">Tổ</th>
                    {appliedSubjects.map((sub) => (
                      <th key={sub.id || sub.name} className="py-3 px-2 text-center min-w-[70px]">
                        <span title={getVietnameseSubjectFullName(sub.name)} className="font-bold text-slate-800">
                          {getVietnameseSubjectShortName(sub.name)}
                        </span>
                      </th>
                    ))}
                    <th className="py-3 px-3 text-center min-w-[120px]">Kết quả TT43</th>
                    <th className="py-3 px-3 min-w-[180px]">Nhận xét của GVCN</th>
                    <th className="py-3 px-3 text-center w-24">Công bố</th>
                    <th className="py-3 px-3 text-right w-20 sticky right-0 bg-slate-50 z-10">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {paginatedOverviewStudents.map((student, idx) => {
                    const rec = academicService.getStudentAcademicRecord(student.id, selectedPeriod);
                    const globalIdx = (overviewPage - 1) * overviewPageSize + idx + 1;

                    return (
                      <tr key={`${student.id}-${idx}`} className="transition-colors hover:bg-blue-50/30">
                        {/* STT */}
                        <td className="py-3 px-3 text-center text-slate-400 font-bold">{globalIdx}</td>

                        {/* Name & Code */}
                        <td className="py-3 px-3 sticky left-0 bg-white group-hover:bg-blue-50/30 z-10">
                          <div>
                            <div className="font-bold text-slate-900">{student.fullName}</div>
                            <div className="text-[10px] font-mono text-slate-400">{student.code}</div>
                          </div>
                        </td>

                        {/* Group */}
                        <td className="py-3 px-3 text-center">
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                            Tổ {student.group}
                          </span>
                        </td>

                        {/* Dynamic Subjects */}
                        {appliedSubjects.map((sub) => {
                          const g = rec.grades.find((x) => x.subjectName === sub.name);
                          const isCommentOnly = sub.assessmentMode === 'COMMENT_ONLY';

                          if (isCommentOnly) {
                            const result = g?.qualitativeResult;
                            if (!result) {
                              return (
                                <td key={sub.id || sub.name} className="py-3 px-2 text-center text-slate-300">
                                  -
                                </td>
                              );
                            }
                            const isPass = result === 'Đạt';
                            return (
                              <td key={sub.id || sub.name} className="py-3 px-2 text-center">
                                <span
                                  className={`inline-block rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                                    isPass ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                                  }`}
                                >
                                  {result}
                                </span>
                              </td>
                            );
                          }

                          const avg = g?.average;
                          const missingHk1 = selectedPeriod === 'full_year' && g?.tbHk2 !== undefined && g?.tbHk1 === undefined;
                          const missingHk2 = selectedPeriod === 'full_year' && g?.tbHk1 !== undefined && g?.tbHk2 === undefined;
                          return (
                            <td
                              key={sub.id || sub.name}
                              className="py-3 px-2 text-center font-bold"
                              title={
                                selectedPeriod === 'full_year'
                                  ? `TB HKII: ${g?.tbHk2 !== undefined ? g.tbHk2.toFixed(1) : 'Thiếu'} | TB HKI: ${
                                      g?.tbHk1 !== undefined ? g.tbHk1.toFixed(1) : 'Thiếu'
                                    } | Cả năm: ${avg !== undefined ? avg.toFixed(1) : 'Chưa đủ dữ liệu'}`
                                  : undefined
                              }
                            >
                              {avg !== undefined ? (
                                <span
                                  className={
                                    avg >= 8.0
                                      ? 'text-emerald-700'
                                      : avg >= 6.5
                                      ? 'text-blue-700'
                                      : avg >= 5.0
                                      ? 'text-amber-700'
                                      : 'text-rose-600'
                                  }
                                >
                                  {avg.toFixed(1)}
                                </span>
                              ) : missingHk1 ? (
                                <span className="text-[10px] font-semibold text-amber-600" title="Thiếu điểm TB môn HKI">
                                  Thiếu HKI
                                </span>
                              ) : missingHk2 ? (
                                <span className="text-[10px] font-semibold text-amber-600" title="Thiếu điểm TB môn HKII">
                                  Thiếu HKII
                                </span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                          );
                        })}

                        {/* Kết quả học tập (TT43) */}
                        {(() => {
                          const evalRes = academicService.evaluateStudentTT43(rec, appliedSubjects);
                          return (
                            <td className="py-3 px-3 text-center">
                              <span
                                title={evalRes.hasFullData ? evalRes.label : (evalRes.reason || 'Chưa đủ dữ liệu đánh giá')}
                                className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold ${
                                  evalRes.tier === 'TOT'
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    : evalRes.tier === 'KHA'
                                    ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                    : evalRes.tier === 'DAT'
                                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                    : evalRes.tier === 'CHUA_DAT'
                                    ? 'bg-rose-50 text-rose-800 border border-rose-200'
                                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                                }`}
                              >
                                {evalRes.label}
                              </span>
                            </td>
                          );
                        })()}

                        {/* Teacher Summary */}
                        <td className="py-3 px-3">
                          <p className="text-[11px] text-slate-600 line-clamp-1 italic">
                            {rec.academicSummary || rec.teacherComment || 'Chưa có nhận xét'}
                          </p>
                        </td>

                        {/* Published Status */}
                        <td className="py-3 px-3 text-center">
                          {(() => {
                            const isPub = academicService.isPeriodPublished(student.id, selectedPeriod);
                            if (isPub) {
                              if (rec.publicationStatus === 'DRAFT' || (!rec.publishedToStudent && !rec.publishedToParent)) {
                                return (
                                  <span
                                    className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800"
                                    title="Dữ liệu cũ đã công bố cho HV & PH. Hiện có bản nháp mới lưu nhưng chưa công bố."
                                  >
                                    <AlertCircle className="h-3 w-3 text-amber-600" />
                                    <span>Đã công bố (Có nháp mới)</span>
                                  </span>
                                );
                              }
                              return (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                  <Check className="h-3 w-3" />
                                  <span>Đã công bố</span>
                                </span>
                              );
                            }
                            return (
                              <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                                Bản nháp
                              </span>
                            );
                          })()}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3 text-right sticky right-0 bg-white group-hover:bg-blue-50/30 z-10">
                          <button
                            type="button"
                            onClick={() => handleOpenStudentGradeEdit(student.id)}
                            className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            <span>Sửa</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Overview Table Pagination */}
            <Pagination
              currentPage={overviewPage}
              totalItems={filteredStudents.length}
              pageSize={overviewPageSize}
              onPageChange={setOverviewPage}
              onPageSizeChange={setOverviewPageSize}
              itemLabel="học sinh"
            />
          </div>
        </div>
      )}

      {/* SUBTAB 2: NHẬP ĐIỂM TRỰC TIẾP THEO MÔN */}
      {activeTab === 'entry' && (
        <div className="space-y-4 animate-fade-in">
          {/* Control Bar: Select Subject */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-xs font-black text-slate-700">Chọn môn học cần nhập điểm:</label>
              <select
                value={entrySubjectName}
                onChange={(e) => setEntrySubjectName(e.target.value)}
                className="rounded-xl border border-blue-300 bg-blue-50/50 px-3 py-1.5 text-xs font-bold text-blue-900 focus:border-blue-500 focus:bg-white focus:outline-hidden cursor-pointer"
              >
                {appliedSubjects.map((sub) => (
                  <option key={sub.id || sub.name} value={sub.name}>
                    {sub.name} ({sub.assessmentMode === 'COMMENT_ONLY' ? 'Đánh giá nhận xét' : `${sub.txColumnCount} cột TX`})
                  </option>
                ))}
              </select>

              {currentSubjectConfig && (
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
                  {currentSubjectConfig.assessmentMode === 'COMMENT_ONLY'
                    ? '📝 Đánh giá bằng nhận xét (Chỉ chốt Đạt / Chưa đạt)'
                    : selectedPeriod === 'full_year'
                    ? '📊 ĐTB cả năm = (TB môn HKII × 2 + TB môn HKI) / 3'
                    : `📊 Điểm số: ${currentSubjectConfig.txColumnCount} TX + 1 GK + 1 CK`}
                </span>
              )}
              {isFinalPeriod && (
                <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                  🔒 Điểm giữa kì đã bảo toàn (chỉ nhập bổ sung TX và Cuối kỳ)
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleSaveClassSubjectGrades(false)}
                className="flex items-center gap-1.5 rounded-xl border border-blue-300 bg-white px-4 py-2 text-xs font-black text-blue-700 shadow-xs hover:bg-blue-50 transition-colors cursor-pointer"
                title="Lưu dữ liệu điểm hiện tại thành dữ liệu đã lưu nhưng chưa công bố"
              >
                <Save className="h-4 w-4 text-blue-600" />
                <span>Lưu</span>
              </button>

              <button
                type="button"
                onClick={() => handleSaveClassSubjectGrades(true)}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
                title="Dành riêng cho thao tác công bố điểm cho học viên và phụ huynh"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Công bố cho HV và PH</span>
              </button>
            </div>
          </div>

          {entrySaveSuccess && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-800 border border-emerald-200 animate-fade-in">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Đã lưu thành công điểm môn {entrySubjectName} cho cả lớp!</span>
            </div>
          )}

          {/* Grid entry table */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  {selectedPeriod === 'full_year' && currentSubjectConfig?.assessmentMode !== 'COMMENT_ONLY' ? (
                    <>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-700">
                        <th rowSpan={2} className="py-2.5 px-3 text-center w-10 border-r border-slate-200">STT</th>
                        <th rowSpan={2} className="py-2.5 px-3 min-w-[180px] border-r border-slate-200">Họ và tên học sinh</th>
                        <th rowSpan={2} className="py-2.5 px-2 text-center w-16 border-r border-slate-200">Tổ</th>
                        <th
                          colSpan={currentSubjectConfig?.txColumnCount ?? 3}
                          className="py-2 px-2 text-center border-b border-r border-slate-200 bg-slate-100/80 text-slate-800"
                        >
                          Điểm thường xuyên
                        </th>
                        <th rowSpan={2} className="py-2.5 px-2 text-center w-24 border-r border-slate-200">
                          Điểm giữa học kì II
                        </th>
                        <th rowSpan={2} className="py-2.5 px-2 text-center w-24 border-r border-slate-200">
                          Điểm kiểm tra HKII
                        </th>
                        <th rowSpan={2} className="py-2.5 px-2 text-center w-24 border-r border-slate-200 bg-indigo-50/60 text-indigo-900">
                          TB môn HKII
                        </th>
                        <th rowSpan={2} className="py-2.5 px-2 text-center w-24 border-r border-slate-200 bg-slate-100/80 text-slate-800">
                          TB môn HKI
                        </th>
                        <th rowSpan={2} className="py-2.5 px-2 text-center w-24 border-r border-slate-200 bg-blue-50/80 text-blue-950">
                          Cả năm
                        </th>
                        <th rowSpan={2} className="py-2.5 px-3 min-w-[180px]">
                          Ghi chú / Nhận xét
                        </th>
                      </tr>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-extrabold uppercase text-slate-600">
                        {Array.from({ length: currentSubjectConfig?.txColumnCount ?? 3 }).map((_, i) => (
                          <th key={i} className="py-1.5 px-2 text-center w-16 border-r border-slate-200">
                            TX{i + 1}
                          </th>
                        ))}
                      </tr>
                    </>
                  ) : (
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-700">
                      <th className="py-3 px-3 text-center w-10">STT</th>
                      <th className="py-3 px-3 min-w-[180px]">Họ và tên học sinh</th>
                      <th className="py-3 px-2 text-center w-16">Tổ</th>

                      {currentSubjectConfig?.assessmentMode === 'COMMENT_ONLY' ? (
                        <>
                          <th className="py-3 px-3 text-center w-44">
                            {selectedPeriod === 'full_year' ? 'Cả năm (Đạt / Chưa đạt)' : 'Kết quả đánh giá'}
                          </th>
                          <th className="py-3 px-3 min-w-[260px]">Nhận xét chi tiết môn học</th>
                        </>
                      ) : (
                        <>
                          {Array.from({ length: currentSubjectConfig?.txColumnCount ?? 3 }).map((_, i) => (
                            <th key={i} className="py-3 px-2 text-center w-18">
                              TX{i + 1}
                            </th>
                          ))}
                          <th className="py-3 px-2 text-center w-20">
                            Giữa kỳ {isFinalPeriod && <span className="block text-[9px] text-slate-400 font-normal">(Đã khóa)</span>}
                          </th>
                          <th className="py-3 px-2 text-center w-20">Cuối kỳ</th>
                          <th className="py-3 px-2 text-center w-20 bg-blue-50/70 text-blue-900">TB Môn</th>
                          <th className="py-3 px-3 min-w-[200px]">Ghi chú / Nhận xét</th>
                        </>
                      )}
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {paginatedEntryStudents.map((student, idx) => {
                    const grade = entryGradesMap[student.id] || {
                      subjectName: entrySubjectName,
                      qualitativeResult: selectedPeriod === 'full_year' ? undefined : 'Đạt',
                      comment: ''
                    };
                    const globalIdx = (entryPage - 1) * entryPageSize + idx + 1;

                    const handleFieldUpdate = (field: keyof SubjectGrade, value: any) => {
                      if (isFinalPeriod) {
                        if (field === 'midterm') {
                          return; // Bảo toàn điểm giữa kì: không cho phép chỉnh sửa trong kỳ cuối học kì
                        }
                        if (typeof field === 'string' && field.startsWith('tx')) {
                          const parentG = parentMidtermGradesMap[student.id];
                          if (isEnteredValidScore(parentG?.[field as keyof SubjectGrade])) {
                            return; // Bảo toàn điểm thường xuyên đã có từ giữa kì
                          }
                        }
                      }
                      setHasUnsavedEntryChanges(true);
                      setEntryGradesMap((prev) => {
                        const copy = { ...prev };
                        const target: any = { ...(copy[student.id] || grade), [field]: value };

                        if (currentSubjectConfig?.assessmentMode === 'COMMENT_ONLY') {
                          const qual = value === 'Đạt' || value === 'Chưa đạt' ? value : undefined;
                          copy[student.id] = {
                            ...target,
                            assessmentMode: 'COMMENT_ONLY',
                            qualitativeResult: field === 'qualitativeResult' ? qual : target.qualitativeResult,
                            tx1: undefined,
                            tx2: undefined,
                            tx3: undefined,
                            tx4: undefined,
                            tx5: undefined,
                            tx6: undefined,
                            regularScores: [],
                            midterm: undefined,
                            finalExam: undefined,
                            tbHk1: undefined,
                            tbHk2: undefined,
                            tbCaNam: undefined,
                            average: undefined
                          };
                          return copy;
                        }

                        const tx1 = isEnteredValidScore(target.tx1) ? Number(target.tx1) : undefined;
                        const tx2 = isEnteredValidScore(target.tx2) ? Number(target.tx2) : undefined;
                        const tx3 = isEnteredValidScore(target.tx3) ? Number(target.tx3) : undefined;
                        const tx4 = isEnteredValidScore(target.tx4) ? Number(target.tx4) : undefined;
                        const tx5 = isEnteredValidScore(target.tx5) ? Number(target.tx5) : undefined;
                        const tx6 = isEnteredValidScore(target.tx6) ? Number(target.tx6) : undefined;
                        const regularScores = [tx1, tx2, tx3, tx4, tx5, tx6].filter((v): v is number => v !== undefined);
                        const midterm = isEnteredValidScore(target.midterm) ? Number(target.midterm) : undefined;
                        const finalExam = isEnteredValidScore(target.finalExam) ? Number(target.finalExam) : undefined;

                        let tbHk1 = isEnteredValidScore(target.tbHk1) ? Number(Number(target.tbHk1).toFixed(1)) : undefined;
                        let tbHk2 = isEnteredValidScore(target.tbHk2) ? Number(Number(target.tbHk2).toFixed(1)) : undefined;

                        if (selectedPeriod === 'full_year') {
                          if (field === 'tbHk1') {
                            target._manualTbHk1 = value !== undefined;
                            target._clearedTbHk1 = value === undefined;
                          } else if (field === 'tbHk2') {
                            target._manualTbHk2 = value !== undefined;
                            target._clearedTbHk2 = value === undefined;
                          } else if (['tx1', 'tx2', 'tx3', 'tx4', 'tx5', 'tx6', 'midterm', 'finalExam'].includes(String(field))) {
                            const calcHk2 = calculateSubjectAverage({
                              assessmentMode: currentSubjectConfig?.assessmentMode,
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
                            if (calcHk2 !== undefined) {
                              tbHk2 = calcHk2;
                              target._clearedTbHk2 = false;
                            } else if (!target._manualTbHk2) {
                              tbHk2 = undefined;
                            }
                          }
                        }

                        const updatedSubject: SubjectGrade = {
                          ...target,
                          tx1,
                          tx2,
                          tx3,
                          tx4,
                          tx5,
                          tx6,
                          regularScores,
                          midterm,
                          finalExam,
                          tbHk1,
                          tbHk2
                        };

                        // Auto-calculate dynamic average omitting blank columns
                        if ((currentSubjectConfig?.assessmentMode as string) !== 'COMMENT_ONLY') {
                          const calcAvg = calculateSubjectAverage({
                            assessmentMode: currentSubjectConfig?.assessmentMode,
                            tx1,
                            tx2,
                            tx3,
                            tx4,
                            tx5,
                            tx6,
                            regularScores,
                            midterm,
                            finalExam,
                            period: selectedPeriod,
                            tbHk1: updatedSubject.tbHk1,
                            tbHk2: updatedSubject.tbHk2,
                            tbCaNam: updatedSubject.tbCaNam
                          });
                          updatedSubject.average = calcAvg;
                          if (selectedPeriod === 'full_year') {
                            updatedSubject.tbCaNam = calcAvg;
                          }
                        }

                        copy[student.id] = updatedSubject;
                        return copy;
                      });
                    };

                    return (
                      <tr key={`${student.id}-${idx}`} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2.5 px-3 text-center text-slate-400 font-bold">{globalIdx}</td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900">{student.fullName}</div>
                          <div className="text-[10px] font-mono text-slate-400">{student.code}</div>
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                            Tổ {student.group}
                          </span>
                        </td>

                        {currentSubjectConfig?.assessmentMode === 'COMMENT_ONLY' ? (
                          <>
                            <td className="py-2.5 px-3 text-center">
                              <select
                                value={grade.qualitativeResult || ''}
                                onChange={(e) => handleFieldUpdate('qualitativeResult', e.target.value || undefined)}
                                className={`rounded-lg border px-2.5 py-1 text-xs font-bold focus:outline-hidden ${
                                  grade.qualitativeResult === 'Đạt'
                                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                                    : grade.qualitativeResult === 'Chưa đạt'
                                    ? 'border-rose-300 bg-rose-50 text-rose-800'
                                    : 'border-slate-300 bg-slate-50 text-slate-600'
                                }`}
                              >
                                <option value="">-- Chưa chốt --</option>
                                <option value="Đạt">Đạt</option>
                                <option value="Chưa đạt">Chưa đạt</option>
                              </select>
                            </td>
                            <td className="py-2.5 px-3">
                              <input
                                type="text"
                                placeholder="Nhập nhận xét sự tiến bộ của học sinh..."
                                value={grade.comment || ''}
                                onChange={(e) => handleFieldUpdate('comment', e.target.value)}
                                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
                              />
                            </td>
                          </>
                        ) : selectedPeriod === 'full_year' ? (
                          <>
                            {/* 1. Điểm thường xuyên */}
                            {Array.from({ length: currentSubjectConfig?.txColumnCount ?? 3 }).map((_, i) => {
                              const txKey = `tx${i + 1}` as keyof SubjectGrade;
                              const val = grade[txKey] as number | undefined;
                              return (
                                <td key={i} className="py-2.5 px-2 text-center">
                                  <input
                                    type="number"
                                    min="0"
                                    max="10"
                                    step="0.1"
                                    placeholder="-"
                                    value={val !== undefined ? val : ''}
                                    onChange={(e) => {
                                      handleFieldUpdate(
                                        txKey,
                                        isEnteredValidScore(e.target.value) ? Number(e.target.value.trim()) : undefined
                                      );
                                    }}
                                    className="w-14 text-center rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-xs font-bold text-slate-900 focus:border-blue-500 focus:outline-hidden"
                                  />
                                </td>
                              );
                            })}
                            {/* 2. Điểm giữa học kì II */}
                            <td className="py-2.5 px-2 text-center">
                              <input
                                type="number"
                                min="0"
                                max="10"
                                step="0.1"
                                placeholder="-"
                                value={grade.midterm !== undefined ? grade.midterm : ''}
                                onChange={(e) =>
                                  handleFieldUpdate(
                                    'midterm',
                                    isEnteredValidScore(e.target.value) ? Number(e.target.value.trim()) : undefined
                                  )
                                }
                                className="w-16 text-center rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-xs font-bold text-blue-900 focus:border-blue-500 focus:outline-hidden"
                              />
                            </td>
                            {/* 3. Điểm kiểm tra HKII */}
                            <td className="py-2.5 px-2 text-center">
                              <input
                                type="number"
                                min="0"
                                max="10"
                                step="0.1"
                                placeholder="-"
                                value={grade.finalExam !== undefined ? grade.finalExam : ''}
                                onChange={(e) =>
                                  handleFieldUpdate(
                                    'finalExam',
                                    isEnteredValidScore(e.target.value) ? Number(e.target.value.trim()) : undefined
                                  )
                                }
                                className="w-16 text-center rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-xs font-bold text-indigo-900 focus:border-blue-500 focus:outline-hidden"
                              />
                            </td>
                            {/* 4. TB môn HKII */}
                            <td className="py-2.5 px-2 text-center bg-indigo-50/30">
                              <input
                                type="number"
                                min="0"
                                max="10"
                                step="0.1"
                                placeholder="-"
                                value={grade.tbHk2 !== undefined ? grade.tbHk2 : ''}
                                onChange={(e) =>
                                  handleFieldUpdate(
                                    'tbHk2',
                                    isEnteredValidScore(e.target.value) ? Number(e.target.value.trim()) : undefined
                                  )
                                }
                                className="w-16 text-center rounded-lg border border-indigo-200 bg-white px-1.5 py-1 text-xs font-extrabold text-indigo-800 focus:border-indigo-500 focus:outline-hidden"
                              />
                            </td>
                            {/* 5. TB môn HKI */}
                            <td className="py-2.5 px-2 text-center bg-slate-50/70">
                              <input
                                type="number"
                                min="0"
                                max="10"
                                step="0.1"
                                placeholder="-"
                                value={grade.tbHk1 !== undefined ? grade.tbHk1 : ''}
                                onChange={(e) =>
                                  handleFieldUpdate(
                                    'tbHk1',
                                    isEnteredValidScore(e.target.value) ? Number(e.target.value.trim()) : undefined
                                  )
                                }
                                title="Điểm TB môn HKI đã lưu (có thể điều chỉnh nếu cần)"
                                className="w-16 text-center rounded-lg border border-slate-300 bg-white px-1.5 py-1 text-xs font-extrabold text-slate-800 focus:border-blue-500 focus:outline-hidden"
                              />
                            </td>
                            {/* 6. Cả năm */}
                            <td className="py-2.5 px-2 text-center bg-blue-50/50">
                              {grade.average !== undefined ? (
                                <span className="font-extrabold text-xs text-blue-700">
                                  {grade.average.toFixed(1)}
                                </span>
                              ) : grade.tbHk2 !== undefined && grade.tbHk1 === undefined ? (
                                <span className="text-[10px] font-bold text-amber-600" title="Thiếu TB môn HKI">
                                  Thiếu HKI
                                </span>
                              ) : grade.tbHk1 !== undefined && grade.tbHk2 === undefined ? (
                                <span className="text-[10px] font-bold text-amber-600" title="Thiếu TB môn HKII">
                                  Thiếu HKII
                                </span>
                              ) : (
                                <span className="text-slate-400 font-bold" title="Chưa đủ điểm TB môn HKI và HKII">
                                  -
                                </span>
                              )}
                            </td>
                            {/* Ghi chú */}
                            <td className="py-2.5 px-3">
                              <input
                                type="text"
                                placeholder="Ghi chú..."
                                value={grade.note || ''}
                                onChange={(e) => handleFieldUpdate('note', e.target.value)}
                                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:border-blue-500 focus:outline-hidden"
                              />
                            </td>
                          </>
                        ) : (
                          <>
                            {Array.from({ length: currentSubjectConfig?.txColumnCount ?? 3 }).map((_, i) => {
                              const txKey = `tx${i + 1}` as keyof SubjectGrade;
                              const val = grade[txKey] as number | undefined;
                              const parentG = parentMidtermGradesMap[student.id];
                              const isLockedTx = isFinalPeriod && isEnteredValidScore(parentG?.[txKey]);
                              return (
                                <td key={i} className="py-2.5 px-2 text-center">
                                  <input
                                    type="number"
                                    min="0"
                                    max="10"
                                    step="0.1"
                                    placeholder="-"
                                    value={val !== undefined ? val : ''}
                                    disabled={isLockedTx}
                                    readOnly={isLockedTx}
                                    title={
                                      isLockedTx
                                        ? 'Điểm thường xuyên đã chốt ở giữa kì, được bảo toàn không chỉnh sửa ở kì cuối học kì'
                                        : undefined
                                    }
                                    onChange={(e) => {
                                      if (isLockedTx) return;
                                      handleFieldUpdate(txKey, isEnteredValidScore(e.target.value) ? Number(e.target.value.trim()) : undefined);
                                    }}
                                    className={`w-14 text-center rounded-lg border px-1.5 py-1 text-xs font-bold focus:outline-hidden ${
                                      isLockedTx
                                        ? 'border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed select-none'
                                        : 'border-slate-200 bg-white text-slate-900 focus:border-blue-500'
                                    }`}
                                  />
                                </td>
                              );
                            })}
                            <td className="py-2.5 px-2 text-center">
                              <input
                                type="number"
                                min="0"
                                max="10"
                                step="0.1"
                                placeholder="-"
                                value={grade.midterm !== undefined ? grade.midterm : ''}
                                disabled={isFinalPeriod}
                                readOnly={isFinalPeriod}
                                title={isFinalPeriod ? "Điểm giữa kì đã chốt, không chỉnh sửa ở kì cuối học kì" : undefined}
                                onChange={(e) => {
                                  if (isFinalPeriod) return;
                                  handleFieldUpdate('midterm', isEnteredValidScore(e.target.value) ? Number(e.target.value.trim()) : undefined);
                                }}
                                className={`w-14 text-center rounded-lg border px-1.5 py-1 text-xs font-bold focus:outline-hidden ${
                                  isFinalPeriod
                                    ? 'border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed select-none'
                                    : 'border-slate-200 bg-white text-blue-900 focus:border-blue-500'
                                }`}
                              />
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <input
                                type="number"
                                min="0"
                                max="10"
                                step="0.1"
                                placeholder="-"
                                value={grade.finalExam !== undefined ? grade.finalExam : ''}
                                onChange={(e) =>
                                  handleFieldUpdate('finalExam', isEnteredValidScore(e.target.value) ? Number(e.target.value.trim()) : undefined)
                                }
                                className="w-14 text-center rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-xs font-bold text-indigo-900 focus:border-blue-500 focus:outline-hidden"
                              />
                            </td>
                            <td className="py-2.5 px-2 text-center bg-blue-50/40">
                              <span className="font-extrabold text-xs text-blue-700">
                                {grade.average !== undefined ? grade.average.toFixed(1) : '-'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <input
                                type="text"
                                placeholder="Ghi chú..."
                                value={grade.note || ''}
                                onChange={(e) => handleFieldUpdate('note', e.target.value)}
                                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:border-blue-500 focus:outline-hidden"
                              />
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Direct Entry Pagination */}
            <Pagination
              currentPage={entryPage}
              totalItems={students.length}
              pageSize={entryPageSize}
              onPageChange={setEntryPage}
              onPageSizeChange={setEntryPageSize}
              itemLabel="học sinh"
            />

            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/80 p-4">
              <span className="text-xs text-slate-500">
                Lớp có {students.length} học sinh. Nhập điểm trực tiếp sẽ tự động tính điểm TB Môn theo quy tắc GDPT 2018 (TX hệ số 1, GK hệ số 2, CK hệ số 3).
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveClassSubjectGrades(false)}
                  className="flex items-center gap-1.5 rounded-xl border border-blue-300 bg-white px-4 py-2 text-xs font-black text-blue-700 shadow-xs hover:bg-blue-50 transition-colors cursor-pointer"
                  title="Lưu dữ liệu điểm hiện tại thành dữ liệu đã lưu nhưng chưa công bố"
                >
                  <Save className="h-4 w-4 text-blue-600" />
                  <span>Lưu</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveClassSubjectGrades(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
                  title="Dành riêng cho thao tác công bố điểm cho học viên và phụ huynh"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Công bố cho HV và PH</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: MINH CHỨNG & PHIẾU ĐIỂM */}
      {activeTab === 'shared_files' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
            <div>
              <h3 className="text-sm font-black text-slate-800">Tệp Minh Chứng Bảng Điểm & Phiếu Kết Quả</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Tải lên bản chụp có chữ ký, file scan PDF hoặc bảng điểm tổng hợp để chia sẻ cho Học viên và Phụ huynh
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsUploadTranscriptModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
            >
              <Upload className="h-4 w-4" />
              <span>Tải lên tệp minh chứng</span>
            </button>
          </div>

          {sharedGradeFiles.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <FileSpreadsheet className="mx-auto h-12 w-12 text-slate-300" />
              <h4 className="mt-3 text-sm font-black text-slate-700">Chưa có tệp minh chứng nào</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Nhấn vào nút "Tải lên tệp minh chứng" ở trên để lưu trữ và công bố bảng điểm định kỳ cho lớp.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sharedGradeFiles.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 font-bold">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-800 line-clamp-1">{item.title}</h4>
                          <span className="text-[10px] font-medium text-slate-400">
                            {item.period ? PERIOD_NAMES[item.period] : 'Định kỳ'}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('Bạn có chắc muốn xóa tệp minh chứng này?')) {
                            academicService.deleteSharedGradeFile(item.id);
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 cursor-pointer"
                        title="Xóa tệp"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {item.description && (
                      <p className="text-xs text-slate-600 line-clamp-2">{item.description}</p>
                    )}

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-[10px] text-slate-500">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 font-bold">
                        {item.targetType === 'class' ? 'Toàn lớp' : `Cá nhân: ${item.studentName}`}
                      </span>
                      {item.parentVisible && (
                        <span className="rounded-md bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800">
                          Phụ huynh xem được
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-100">
                    <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                      {(item.file as any).fileName || item.file.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPreviewFile(item.file)}
                      className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Xem tệp</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 4: CẤU HÌNH MÔN HỌC (GVCN) */}
      {activeTab === 'config' && (
        <SubjectConfigTab onSaved={loadData} />
      )}

      {/* MODAL: CHỈNH SỬA BẢNG ĐIỂM HỌC SINH */}
      {editingStudentId && editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 p-4 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white font-bold">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">
                    Bảng Điểm & Đánh Giá: {editingStudent.fullName} ({editingStudent.code})
                  </h3>
                  <p className="text-[11px] text-slate-500 flex items-center gap-2">
                    <span>Kỳ đánh giá: <strong className="text-blue-700">{PERIOD_NAMES[selectedPeriod]}</strong></span>
                    {isFinalPeriod && (
                      <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                        🔒 Điểm giữa kì đã bảo toàn
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingStudentId(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveStudentGradebook} className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {gradeSuccessMsg && (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 font-bold text-emerald-800 border border-emerald-200 animate-fade-in">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{gradeSuccessMsg}</span>
                </div>
              )}

              {/* Subject Grades Table */}
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          {selectedPeriod === 'full_year' ? (
                            <>
                              <tr className="bg-slate-100 text-[11px] font-black uppercase text-slate-700 border-b border-slate-200">
                                <th rowSpan={2} className="py-2 px-3 border-r border-slate-200">Môn học</th>
                                <th colSpan={modalMaxTxCols} className="py-1.5 px-2 text-center border-b border-r border-slate-200 bg-slate-200/60">
                                  Điểm thường xuyên
                                </th>
                                <th rowSpan={2} className="py-2 px-2 text-center w-24 border-r border-slate-200">
                                  Điểm giữa học kì II
                                </th>
                                <th rowSpan={2} className="py-2 px-2 text-center w-24 border-r border-slate-200">
                                  Điểm kiểm tra HKII
                                </th>
                                <th rowSpan={2} className="py-2 px-2 text-center w-24 border-r border-slate-200 bg-indigo-50 text-indigo-900">
                                  TB môn HKII
                                </th>
                                <th rowSpan={2} className="py-2 px-2 text-center w-24 border-r border-slate-200 bg-slate-200/60 text-slate-800">
                                  TB môn HKI
                                </th>
                                <th rowSpan={2} className="py-2 px-2 text-center w-24 border-r border-slate-200 bg-blue-100 text-blue-900">
                                  Cả năm
                                </th>
                                <th rowSpan={2} className="py-2 px-3 min-w-[150px]">Đánh giá / Nhận xét môn</th>
                              </tr>
                              <tr className="bg-slate-100 text-[10px] font-extrabold uppercase text-slate-600 border-b border-slate-200">
                                {Array.from({ length: modalMaxTxCols }).map((_, i) => (
                                  <th key={i} className="py-1 px-2 text-center w-16 border-r border-slate-200">
                                    TX{i + 1}
                                  </th>
                                ))}
                              </tr>
                            </>
                          ) : (
                            <tr className="bg-slate-100 text-[11px] font-black uppercase text-slate-700">
                              <th className="py-2 px-3">Môn học</th>
                              {Array.from({ length: modalMaxTxCols }).map((_, i) => (
                                <th key={i} className="py-2 px-2 text-center w-24">
                                  TX{i + 1}
                                </th>
                              ))}
                              <th className="py-2 px-2 text-center w-24">
                                Giữa kỳ {isFinalPeriod && <span className="block text-[9px] text-slate-500 font-normal">(Đã khóa)</span>}
                              </th>
                              <th className="py-2 px-2 text-center w-24">Cuối kỳ</th>
                              <th className="py-2 px-2 text-center w-24 bg-blue-100 text-blue-900">TB Môn</th>
                              <th className="py-2 px-3 min-w-[150px]">Đánh giá / Nhận xét môn</th>
                            </tr>
                          )}
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {editingGrades.map((g, idx) => {
                            const isCommentOnly = g.assessmentMode === 'COMMENT_ONLY';
                            const subConfigForRow = appliedSubjects.find((s) => isSameSubject(s, g));
                            const subTxCount = subConfigForRow?.txColumnCount ?? modalMaxTxCols;
                            const parentModalG = parentMidtermRecordForModal?.grades?.find((x) => isSameSubject(x, g));

                            return (
                              <tr key={g.subjectName || idx} className="hover:bg-slate-50">
                                <td className="py-2.5 px-3 font-bold text-slate-800">{g.subjectName}</td>

                                {isCommentOnly ? (
                                  selectedPeriod === 'full_year' ? (
                                    <>
                                      <td colSpan={modalMaxTxCols + 4} className="py-2.5 px-3 text-center text-[11px] text-slate-400 italic bg-slate-50/50">
                                        Môn đánh giá bằng nhận xét (Chỉ chốt Đạt / Chưa đạt, không tính điểm số)
                                      </td>
                                      <td className="py-2.5 px-2 text-center bg-blue-50/40">
                                        <select
                                          value={g.qualitativeResult || ''}
                                          onChange={(e) => {
                                            const copy = [...editingGrades];
                                            const val = e.target.value === 'Đạt' || e.target.value === 'Chưa đạt' ? e.target.value : undefined;
                                            copy[idx] = { ...copy[idx], qualitativeResult: val as any };
                                            setEditingGrades(copy);
                                          }}
                                          className={`rounded-lg border px-2.5 py-1 text-xs font-bold focus:outline-hidden ${
                                            g.qualitativeResult === 'Đạt'
                                              ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                                              : g.qualitativeResult === 'Chưa đạt'
                                              ? 'border-rose-300 bg-rose-50 text-rose-800'
                                              : 'border-slate-300 bg-white text-slate-600'
                                          }`}
                                        >
                                          <option value="">-- Chưa chốt --</option>
                                          <option value="Đạt">Đạt</option>
                                          <option value="Chưa đạt">Chưa đạt</option>
                                        </select>
                                      </td>
                                    </>
                                  ) : (
                                    <td colSpan={modalMaxTxCols + 3} className="py-2.5 px-3">
                                      <div className="flex items-center gap-3">
                                        <select
                                          value={g.qualitativeResult || ''}
                                          onChange={(e) => {
                                            const copy = [...editingGrades];
                                            const val = e.target.value === 'Đạt' || e.target.value === 'Chưa đạt' ? e.target.value : undefined;
                                            copy[idx] = { ...copy[idx], qualitativeResult: val as any };
                                            setEditingGrades(copy);
                                          }}
                                          className={`rounded-lg border px-3 py-1 text-xs font-bold focus:outline-hidden ${
                                            g.qualitativeResult === 'Đạt'
                                              ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                                              : g.qualitativeResult === 'Chưa đạt'
                                              ? 'border-rose-300 bg-rose-50 text-rose-800'
                                              : 'border-slate-300 bg-white text-slate-600'
                                          }`}
                                        >
                                          <option value="">-- Chưa chốt --</option>
                                          <option value="Đạt">Đạt</option>
                                          <option value="Chưa đạt">Chưa đạt</option>
                                        </select>
                                        <span className="text-[11px] text-slate-500 italic">
                                          (Môn đánh giá bằng nhận xét theo Thông tư 43)
                                        </span>
                                      </div>
                                    </td>
                                  )
                                ) : selectedPeriod === 'full_year' ? (
                                  <>
                                    {/* 1. Điểm thường xuyên (theo đúng số cột TX của môn) */}
                                    {Array.from({ length: modalMaxTxCols }).map((_, txIdx) => {
                                      const txKey = `tx${txIdx + 1}` as 'tx1' | 'tx2' | 'tx3' | 'tx4' | 'tx5' | 'tx6';
                                      const isSlotActive = txIdx < subTxCount;
                                      const txVal = isSlotActive ? g[txKey] : undefined;
                                      return (
                                        <td key={txKey} className="py-2 px-1.5 text-center">
                                          {isSlotActive ? (
                                            <input
                                              type="number"
                                              min="0"
                                              max="10"
                                              step="0.1"
                                              value={txVal !== undefined ? txVal : ''}
                                              onChange={(e) => handleScoreChange(idx, txKey, e.target.value)}
                                              className="w-14 text-center rounded-lg border border-slate-200 bg-white px-1 py-1 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-hidden"
                                              placeholder="-"
                                            />
                                          ) : (
                                            <span className="text-slate-300 font-bold">-</span>
                                          )}
                                        </td>
                                      );
                                    })}
                                    {/* 2. Điểm giữa học kì II */}
                                    <td className="py-2 px-1.5 text-center">
                                      <input
                                        type="number"
                                        min="0"
                                        max="10"
                                        step="0.1"
                                        value={g.midterm !== undefined ? g.midterm : ''}
                                        onChange={(e) => handleScoreChange(idx, 'midterm', e.target.value)}
                                        className="w-16 text-center rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-xs font-bold text-blue-900 focus:border-blue-500 focus:outline-hidden"
                                        placeholder="-"
                                      />
                                    </td>
                                    {/* 3. Điểm kiểm tra HKII */}
                                    <td className="py-2 px-1.5 text-center">
                                      <input
                                        type="number"
                                        min="0"
                                        max="10"
                                        step="0.1"
                                        value={g.finalExam !== undefined ? g.finalExam : ''}
                                        onChange={(e) => handleScoreChange(idx, 'finalExam', e.target.value)}
                                        className="w-16 text-center rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-xs font-bold text-indigo-900 focus:border-blue-500 focus:outline-hidden"
                                        placeholder="-"
                                      />
                                    </td>
                                    {/* 4. TB môn HKII */}
                                    <td className="py-2 px-1.5 text-center bg-indigo-50/40">
                                      <input
                                        type="number"
                                        min="0"
                                        max="10"
                                        step="0.1"
                                        value={g.tbHk2 !== undefined ? g.tbHk2 : ''}
                                        onChange={(e) => handleScoreChange(idx, 'tbHk2', e.target.value)}
                                        className="w-16 text-center rounded-lg border border-indigo-200 bg-white px-1.5 py-1 text-xs font-extrabold text-indigo-800 focus:border-indigo-500 focus:outline-hidden"
                                        placeholder="-"
                                      />
                                    </td>
                                    {/* 5. TB môn HKI */}
                                    <td className="py-2 px-1.5 text-center bg-slate-50">
                                      <input
                                        type="number"
                                        min="0"
                                        max="10"
                                        step="0.1"
                                        value={g.tbHk1 !== undefined ? g.tbHk1 : ''}
                                        onChange={(e) => handleScoreChange(idx, 'tbHk1', e.target.value)}
                                        className="w-16 text-center rounded-lg border border-slate-300 bg-white px-1.5 py-1 text-xs font-extrabold text-slate-800 focus:border-blue-500 focus:outline-hidden"
                                        placeholder="-"
                                      />
                                    </td>
                                    {/* 6. Cả năm */}
                                    <td className="py-2 px-2 text-center bg-blue-50/60">
                                      {g.average !== undefined ? (
                                        <span className="font-black text-blue-700">{g.average.toFixed(1)}</span>
                                      ) : g.tbHk2 !== undefined && g.tbHk1 === undefined ? (
                                        <span className="text-[10px] font-bold text-amber-600" title="Thiếu TB môn HKI">
                                          Thiếu HKI
                                        </span>
                                      ) : g.tbHk1 !== undefined && g.tbHk2 === undefined ? (
                                        <span className="text-[10px] font-bold text-amber-600" title="Thiếu TB môn HKII">
                                          Thiếu HKII
                                        </span>
                                      ) : (
                                        <span className="text-slate-400 font-bold">-</span>
                                      )}
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    {Array.from({ length: modalMaxTxCols }).map((_, txIdx) => {
                                      const txKey = `tx${txIdx + 1}` as 'tx1' | 'tx2' | 'tx3' | 'tx4' | 'tx5' | 'tx6';
                                      const isSlotActive = txIdx < subTxCount;
                                      const txVal = isSlotActive ? g[txKey] : undefined;
                                      const isLockedTx = isFinalPeriod && isEnteredValidScore(parentModalG?.[txKey]);
                                      return (
                                        <td key={txKey} className="py-2 px-2 text-center">
                                          {isSlotActive ? (
                                            <input
                                              type="number"
                                              min="0"
                                              max="10"
                                              step="0.1"
                                              value={txVal !== undefined ? txVal : ''}
                                              disabled={isLockedTx}
                                              readOnly={isLockedTx}
                                              title={
                                                isLockedTx
                                                  ? 'Điểm thường xuyên đã chốt ở giữa kì, được bảo toàn không chỉnh sửa ở kì cuối học kì'
                                                  : undefined
                                              }
                                              onChange={(e) => {
                                                if (isLockedTx) return;
                                                handleScoreChange(idx, txKey, e.target.value);
                                              }}
                                              className={`w-16 text-center rounded-lg border px-1.5 py-1 text-xs font-bold focus:outline-hidden ${
                                                isLockedTx
                                                  ? 'border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed select-none'
                                                  : 'border-slate-200 bg-white text-slate-800 focus:border-blue-500'
                                              }`}
                                              placeholder="-"
                                            />
                                          ) : (
                                            <span className="text-slate-300 font-bold">-</span>
                                          )}
                                        </td>
                                      );
                                    })}
                                <td className="py-2 px-2 text-center">
                                  <input
                                    type="number"
                                    min="0"
                                    max="10"
                                    step="0.1"
                                    value={g.midterm !== undefined ? g.midterm : ''}
                                    disabled={isFinalPeriod}
                                    readOnly={isFinalPeriod}
                                    title={isFinalPeriod ? "Điểm giữa kì đã chốt, không chỉnh sửa ở kì cuối học kì" : undefined}
                                    onChange={(e) => {
                                      if (isFinalPeriod) return;
                                      handleScoreChange(idx, 'midterm', e.target.value);
                                    }}
                                    className={`w-16 text-center rounded-lg border px-1.5 py-1 text-xs font-bold focus:outline-hidden ${
                                      isFinalPeriod
                                        ? 'border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed select-none'
                                        : 'border-slate-200 bg-white text-blue-900 focus:border-blue-500'
                                    }`}
                                    placeholder="-"
                                  />
                                </td>
                                <td className="py-2 px-2 text-center">
                                  <input
                                    type="number"
                                    min="0"
                                    max="10"
                                    step="0.1"
                                    value={g.finalExam !== undefined ? g.finalExam : ''}
                                    onChange={(e) => handleScoreChange(idx, 'finalExam', e.target.value)}
                                    className="w-16 text-center rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-xs font-bold text-indigo-900 focus:border-blue-500 focus:outline-hidden"
                                    placeholder="-"
                                  />
                                </td>
                                <td className="py-2 px-2 text-center bg-blue-50/50">
                                  <span className="font-black text-blue-700">
                                    {g.average !== undefined ? g.average.toFixed(1) : '-'}
                                  </span>
                                </td>
                              </>
                            )}

                            <td className="py-2 px-3">
                              <input
                                type="text"
                                placeholder="Nhận xét môn..."
                                value={g.comment || g.note || ''}
                                onChange={(e) => {
                                  const copy = [...editingGrades];
                                  copy[idx] = { ...copy[idx], comment: e.target.value, note: e.target.value };
                                  setEditingGrades(copy);
                                }}
                                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:border-blue-500 focus:outline-hidden"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summaries & Publishing */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-black text-slate-700 mb-1">
                    Nhận xét Kết quả học tập của GVCN:
                  </label>
                  <textarea
                    rows={3}
                    value={editingAcademicSummary}
                    onChange={(e) => setEditingAcademicSummary(e.target.value)}
                    placeholder="Ghi nhận sự cố gắng, tiến bộ và định hướng học tập cho học sinh..."
                    className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-black text-slate-700 mb-1">
                    Nhận xét Kết quả rèn luyện & Kỷ luật:
                  </label>
                  <textarea
                    rows={3}
                    value={editingConductSummary}
                    onChange={(e) => setEditingConductSummary(e.target.value)}
                    placeholder="Nhận xét về thái độ, đạo đức, nề nếp kỷ luật và tinh thần tập thể..."
                    className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Publication Toggles */}
              <div className="flex flex-wrap items-center gap-6 rounded-xl bg-slate-50 p-3 border border-slate-200">
                <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingPublishedToStudent}
                    onChange={(e) => setEditingPublishedToStudent(e.target.checked)}
                    className="h-4 w-4 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span>Công bố cho Học sinh xem</span>
                </label>

                <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingPublishedToParent}
                    onChange={(e) => setEditingPublishedToParent(e.target.checked)}
                    className="h-4 w-4 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span>Công bố cho Phụ huynh xem</span>
                </label>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingStudentId(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveStudentGradebook(undefined, false)}
                  className="flex items-center gap-1.5 rounded-xl border border-blue-300 bg-white px-4 py-2 text-xs font-black text-blue-700 hover:bg-blue-50 shadow-xs cursor-pointer"
                  title="Lưu dữ liệu điểm hiện tại thành dữ liệu đã lưu nhưng chưa công bố"
                >
                  <Save className="h-4 w-4 text-blue-600" />
                  <span>Lưu</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveStudentGradebook(undefined, true)}
                  className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white hover:bg-blue-700 shadow-xs cursor-pointer"
                  title="Dành riêng cho thao tác công bố điểm cho học viên và phụ huynh"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Công bố cho HV và PH</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALS */}
      {isExcelImportModalOpen && (
        <ExcelGradeImportModal
          isOpen={isExcelImportModalOpen}
          onClose={() => setIsExcelImportModalOpen(false)}
          currentPeriod={selectedPeriod}
          onSuccess={() => {
            setIsExcelImportModalOpen(false);
            loadData();
          }}
        />
      )}

      {isUploadTranscriptModalOpen && (
        <UploadTranscriptModal
          isOpen={isUploadTranscriptModalOpen}
          onClose={() => setIsUploadTranscriptModalOpen(false)}
          currentPeriod={selectedPeriod}
          onSuccess={() => {
            setIsUploadTranscriptModalOpen(false);
            loadData();
          }}
        />
      )}

      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
};
