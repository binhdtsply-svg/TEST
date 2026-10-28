/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  ClipboardList,
  FileCheck2,
  Clock,
  Plus,
  Filter,
  Search,
  Paperclip,
  Download,
  Eye,
  Trash2,
  Edit2,
  Share2,
  Bookmark,
  CheckCircle2,
  AlertCircle,
  FileText,
  Sliders,
  History,
  Save,
  ChevronRight,
  BookOpen,
  Pin,
  Palette,
  Image as ImageIcon,
  X,
  FileSpreadsheet,
  Printer,
  Sparkles,
  Info,
  Building2,
  DoorOpen,
  GraduationCap,
  Layers,
  CalendarDays,
  CalendarRange,
  ChevronLeft
} from 'lucide-react';
import {
  TimetableVersion,
  LessonAssignment,
  ExamSchedule,
  AttachedFile,
  SubjectConfig
} from '../../types';
import { academicService } from '../../services/AcademicService';
import { classService } from '../../services/ClassService';
import { schoolWeekService } from '../../services/SchoolWeekService';
import { authService } from '../../services/AuthService';
import { inAppNotificationService } from '../../services/InAppNotificationService';
import { fileStorageService } from '../../services/FileStorageService';
import { TimetableTableGrid } from './TimetableTableGrid';
import { FilePreviewModal } from '../common/FilePreviewModal';
import { ModalLayout } from '../common/ModalLayout';
import { Pagination } from '../common/Pagination';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';
import { getVietnameseSubjectFullName } from '../../utils/subjectHelpers';
import { parseDateToTimestamp } from '../../services/SchoolYearDateNormalizer';
import {
  getVietnamTodayISO,
  getVietnamTomorrowISO,
  formatVietnamDateTitle,
  getVietnamDayOfWeekName,
  getAssignmentTaskContent,
  formatAssignmentShareText,
  ASSIGNMENT_BG_COLORS,
  ASSIGNMENT_TEXT_COLORS,
  getAssignmentBgClasses,
  getAssignmentTextClass
} from '../../utils/assignmentUtils';

interface ScheduleAndAssignmentsModuleProps {
  initialSubTab?: 'timetable' | 'assignments' | 'exams';
  highlightExamId?: string;
}

export const ScheduleAndAssignmentsModule: React.FC<ScheduleAndAssignmentsModuleProps> = ({
  initialSubTab,
  highlightExamId
}) => {
  const currentUser = authService.getCurrentUser();
  const isTeacher = currentUser.role === 'TEACHER';
  const isOfficer = currentUser.role === 'CLASS_OFFICER';
  const isStudent = currentUser.role === 'STUDENT';
  const isParent = currentUser.role === 'PARENT';

  // Can create / edit permissions
  const canManageTimetable = isTeacher;
  const canCreateAssignment = isTeacher || isOfficer;
  const canCreateExam = isTeacher || isOfficer;

  // Determine initial subtab from URL hash or prop
  const getSubTabFromHash = (): 'timetable' | 'assignments' | 'exams' => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash.toLowerCase();
      if (hash.includes('assignments') || hash.includes('homework') || hash.includes('baobai')) {
        return 'assignments';
      }
      if (hash.includes('exams') || hash.includes('tests') || hash.includes('kiemtra')) {
        return 'exams';
      }
      if (hash.includes('timetable') || hash.includes('schedule') || hash.includes('tkb')) {
        return 'timetable';
      }
    }
    return initialSubTab || 'timetable';
  };

  const [activeSubTab, setActiveSubTab] = useState<'timetable' | 'assignments' | 'exams'>(
    getSubTabFromHash()
  );

  const [highlightedExamId, setHighlightedExamId] = useState<string | undefined>(highlightExamId);

  // Sync initialSubTab when parent changes
  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  // Sync highlightExamId
  useEffect(() => {
    if (highlightExamId) {
      setHighlightedExamId(highlightExamId);
      setActiveSubTab('exams');
      const timer = setTimeout(() => {
        const el = document.getElementById(`exam-card-${highlightExamId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [highlightExamId]);

  // Synchronize hash with active tab
  const handleSwitchTab = (tab: 'timetable' | 'assignments' | 'exams') => {
    setActiveSubTab(tab);
    if (typeof window !== 'undefined' && window.location) {
      window.location.hash = `schedule/${tab}`;
    }
  };

  // Subjects from Single Source of Truth
  const [subjects, setSubjects] = useState<SubjectConfig[]>(classService.getSubjects());

  // Timetable State
  const [currentVersion, setCurrentVersion] = useState<TimetableVersion>(
    academicService.getActiveTimetable()
  );
  const [historyVersions, setHistoryVersions] = useState<TimetableVersion[]>(
    academicService.getTimetableHistory()
  );

  // Assignments State
  const [assignments, setAssignments] = useState<LessonAssignment[]>(
    academicService.getAssignments()
  );
  // Assignment Filtering & Navigation States (All / School Week / Month)
  const [assignmentFilterMode, setAssignmentFilterMode] = useState<'all' | 'week' | 'month'>('all');
  const allStudyWeeks = useMemo(() => schoolWeekService.getAllStudyWeeks(), []);
  const currentStudyPeriod = useMemo(() => schoolWeekService.getCurrentStudyPeriod(), []);
  const [selectedWeekNumber, setSelectedWeekNumber] = useState<number>(() => currentStudyPeriod.weekNumber || 1);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [assignmentSubjectFilter, setAssignmentSubjectFilter] = useState<string>('all');
  const [assignmentSearch, setAssignmentSearch] = useState<string>('');

  // Daily Báo Bài Modal & Unified Day Settings State (Một ngày học = Một thiết lập chung)
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Partial<LessonAssignment>>({});
  const [isAddDayModalOpen, setIsAddDayModalOpen] = useState(false);
  const [isEditSingleModalOpen, setIsEditSingleModalOpen] = useState(false);
  const [isShiftDateModalOpen, setIsShiftDateModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState<string>(() => getVietnamTomorrowISO());
  const [modalDayBgColor, setModalDayBgColor] = useState<string>('default');
  const [modalDayTextColor, setModalDayTextColor] = useState<string>('default');
  const [modalDayIsPinned, setModalDayIsPinned] = useState<boolean>(false);
  const [modalSubjectRows, setModalSubjectRows] = useState<Array<{
    tempId: string;
    subject: string;
    content: string;
  }>>([]);
  const [modalSingleItem, setModalSingleItem] = useState<{
    id: string;
    date: string;
    subject: string;
    content: string;
    bgColor?: string;
    textColor?: string;
    isPinned?: boolean;
  } | null>(null);
  const [activeDayColorPickerDate, setActiveDayColorPickerDate] = useState<string | null>(null);
  const [shiftDateTarget, setShiftDateTarget] = useState<{ groupTitle: string; ids: string[]; currentDate: string; newDate: string } | null>(null);
  const [isSavingAssignment, setIsSavingAssignment] = useState(false);
  const [assignmentErrorMessage, setAssignmentErrorMessage] = useState<string | null>(null);

  // Daily Assignments Pagination State (Tối đa 10 ngày báo bài / trang)
  const [dayPage, setDayPage] = useState<number>(1);
  const [dayPageSize, setDayPageSize] = useState<number>(10);

  // Exam Schedules State
  const [examSchedules, setExamSchedules] = useState<ExamSchedule[]>(
    academicService.getExams()
  );
  const [examScopeTab, setExamScopeTab] = useState<'all' | 'regular' | 'centralized'>('all');
  const [examTypeFilter, setExamTypeFilter] = useState<string>('all');
  const [examFormatFilter, setExamFormatFilter] = useState<string>('all');
  const [examSubjectFilter, setExamSubjectFilter] = useState<string>('all');
  const [examSearch, setExamSearch] = useState<string>('');
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Partial<ExamSchedule>>({});

  // Pagination states
  const [examPage, setExamPage] = useState<number>(1);
  const [examPageSize, setExamPageSize] = useState<number>(10);
  const [assignmentPage, setAssignmentPage] = useState<number>(1);
  const [assignmentPageSize, setAssignmentPageSize] = useState<number>(10);

  // File Preview
  const [previewFile, setPreviewFile] = useState<AttachedFile | null>(null);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  const loadData = () => {
    setSubjects(classService.getSubjects());
    setCurrentVersion(academicService.getActiveTimetable(currentUser.role));
    setHistoryVersions(academicService.getTimetableHistory());
    setAssignments(academicService.getAssignments());
    setExamSchedules(academicService.getExams());
  };

  useEffect(() => {
    loadData();
    academicService.fetchTimetableFromServer();
    academicService.fetchAssignmentsFromServer();
    const unsubAcademic = academicService.subscribe(loadData);
    const unsubClass = classService.subscribe(loadData);
    const unsubAuth = authService.subscribe(loadData);
    const unsubNotif = inAppNotificationService.subscribe(() => {
      academicService.fetchTimetableFromServer();
      loadData();
    });

    const handleHashChange = () => {
      const tab = getSubTabFromHash();
      setActiveSubTab(tab);
    };

    window.addEventListener('hashchange', handleHashChange);

    return () => {
      unsubAcademic();
      unsubClass();
      unsubAuth();
      unsubNotif();
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const showNotification = (msg: string) => {
    setNotificationMsg(msg);
    setTimeout(() => setNotificationMsg(null), 3500);
  };

  // File upload simulation for modals
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'assignment' | 'exam'
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAttachments: AttachedFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const uploaded = await fileStorageService.uploadLocalFile(file);
        newAttachments.push(uploaded);
      } catch (err) {
        console.warn('[ScheduleAndAssignmentsModule] Upload error:', err);
      }
    }

    if (target === 'assignment') {
      setEditingAssignment(prev => ({
        ...prev,
        attachments: [...(prev.attachments || []), ...newAttachments]
      }));
    } else {
      setEditingExam(prev => ({
        ...prev,
        attachments: [...(prev.attachments || []), ...newAttachments]
      }));
    }
  };

  // Date key normalizer for consistent ISO YYYY-MM-DD grouping and chronological sorting
  const normalizeDateKey = (rawDate?: string): string => {
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
  };

  // Streamlined Daily Báo Bài Handlers (Một ngày học = Một thiết lập chung)
  const handleOpenAddDayAssignment = (prefilledDate?: string) => {
    const d = prefilledDate || getVietnamTomorrowISO();
    setModalDate(d);

    // Auto-inherit day settings if date already has assignments
    const normDate = normalizeDateKey(d);
    const existingSameDay = assignments.filter(a => normalizeDateKey(a.date || a.dueDate || a.assigned_date) === normDate);
    const inheritedBg = existingSameDay.find(a => a.bgColor && a.bgColor !== 'default')?.bgColor || existingSameDay.find(a => a.bg_color && a.bg_color !== 'default')?.bg_color || 'default';
    const inheritedText = existingSameDay.find(a => a.textColor && a.textColor !== 'default')?.textColor || existingSameDay.find(a => a.text_color && a.text_color !== 'default')?.text_color || 'default';
    const inheritedPinned = existingSameDay.some(a => a.isPinned || a.pinnedToOverview);

    setModalDayBgColor(inheritedBg);
    setModalDayTextColor(inheritedText);
    setModalDayIsPinned(inheritedPinned);

    setModalSubjectRows([
      {
        tempId: `row-${Date.now()}-1`,
        subject: subjects[0]?.name || 'Toán học',
        content: ''
      }
    ]);
    setAssignmentErrorMessage(null);
    setIsAddDayModalOpen(true);
  };

  const handleModalDateChange = (newDate: string) => {
    setModalDate(newDate);
    const normDate = normalizeDateKey(newDate);
    const existingSameDay = assignments.filter(a => normalizeDateKey(a.date || a.dueDate || a.assigned_date) === normDate);
    if (existingSameDay.length > 0) {
      const inheritedBg = existingSameDay.find(a => a.bgColor && a.bgColor !== 'default')?.bgColor || existingSameDay.find(a => a.bg_color && a.bg_color !== 'default')?.bg_color || 'default';
      const inheritedText = existingSameDay.find(a => a.textColor && a.textColor !== 'default')?.textColor || existingSameDay.find(a => a.text_color && a.text_color !== 'default')?.text_color || 'default';
      const inheritedPinned = existingSameDay.some(a => a.isPinned || a.pinnedToOverview);
      setModalDayBgColor(inheritedBg);
      setModalDayTextColor(inheritedText);
      setModalDayIsPinned(inheritedPinned);
    }
  };

  const handleAddSubjectRow = () => {
    setModalSubjectRows(prev => [
      ...prev,
      {
        tempId: `row-${Date.now()}-${prev.length + 1}`,
        subject: subjects[prev.length % (subjects.length || 1)]?.name || 'Ngữ văn',
        content: ''
      }
    ]);
  };

  const handleRemoveSubjectRow = (tempId: string) => {
    if (modalSubjectRows.length <= 1) return;
    setModalSubjectRows(prev => prev.filter(r => r.tempId !== tempId));
  };

  const handleSaveDayAssignmentsBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalDate) {
      setAssignmentErrorMessage('Vui lòng chọn ngày học.');
      return;
    }

    const validRows = modalSubjectRows.filter(r => r.subject.trim() && r.content.trim());
    if (validRows.length === 0) {
      setAssignmentErrorMessage('Vui lòng nhập nội dung cần chuẩn bị cho ít nhất một môn học.');
      return;
    }

    setIsSavingAssignment(true);
    setAssignmentErrorMessage(null);
    try {
      await academicService.saveAssignmentsBatchAsync(
        modalDate,
        validRows.map(r => ({
          subject: r.subject,
          content: r.content,
          bgColor: modalDayBgColor,
          textColor: modalDayTextColor,
          isPinned: modalDayIsPinned
        })),
        {
          bgColor: modalDayBgColor,
          textColor: modalDayTextColor,
          isPinned: modalDayIsPinned
        }
      );
      showNotification(`Đã lưu báo bài cho ${formatVietnamDateTitle(modalDate)} thành công!`);
      setIsAddDayModalOpen(false);
      setModalSubjectRows([]);
    } catch (err: any) {
      setAssignmentErrorMessage(err.message || 'Lỗi khi lưu báo bài lên máy chủ. Dữ liệu đang nhập vẫn được giữ nguyên.');
    } finally {
      setIsSavingAssignment(false);
    }
  };

  const handleOpenEditSubjectRow = (item: LessonAssignment) => {
    const itemDate = item.date || item.dueDate || item.assigned_date || getVietnamTodayISO();
    const normDate = normalizeDateKey(itemDate);
    const sameDay = assignments.filter(a => normalizeDateKey(a.date || a.dueDate || a.assigned_date) === normDate);
    const dayBg = sameDay.find(a => a.bgColor && a.bgColor !== 'default')?.bgColor || sameDay.find(a => a.bg_color && a.bg_color !== 'default')?.bg_color || item.bgColor || 'default';
    const dayText = sameDay.find(a => a.textColor && a.textColor !== 'default')?.textColor || sameDay.find(a => a.text_color && a.text_color !== 'default')?.text_color || item.textColor || 'default';
    const dayPin = sameDay.some(a => a.isPinned || a.pinnedToOverview);

    setModalSingleItem({
      id: item.id,
      date: itemDate,
      subject: item.subject,
      content: getAssignmentTaskContent(item),
      bgColor: dayBg,
      textColor: dayText,
      isPinned: dayPin
    });
    setAssignmentErrorMessage(null);
    setIsEditSingleModalOpen(true);
  };

  const handleSaveSingleSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalSingleItem || !modalSingleItem.subject.trim() || !modalSingleItem.content.trim()) {
      setAssignmentErrorMessage('Vui lòng nhập tên môn và nội dung cần chuẩn bị.');
      return;
    }

    setIsSavingAssignment(true);
    setAssignmentErrorMessage(null);
    try {
      await academicService.saveAssignmentAsync({
        id: modalSingleItem.id,
        date: modalSingleItem.date,
        subject: modalSingleItem.subject,
        preparation: modalSingleItem.content,
        homework: modalSingleItem.content,
        description: modalSingleItem.content,
        title: `Báo bài môn ${modalSingleItem.subject}`,
        status: isTeacher ? 'approved' : 'pending',
        isPinned: Boolean(modalSingleItem.isPinned),
        pinnedToOverview: Boolean(modalSingleItem.isPinned),
        bgColor: modalSingleItem.bgColor || 'default',
        textColor: modalSingleItem.textColor || 'default',
        bg_color: modalSingleItem.bgColor || 'default',
        text_color: modalSingleItem.textColor || 'default'
      });
      // Keep entire day's appearance and pin status synchronized
      if (modalSingleItem.bgColor !== undefined || modalSingleItem.textColor !== undefined) {
        await academicService.updateDayAppearanceAsync(
          modalSingleItem.date,
          modalSingleItem.bgColor || 'default',
          modalSingleItem.textColor || 'default'
        );
      }
      if (modalSingleItem.isPinned !== undefined) {
        await academicService.toggleDayPinAsync(modalSingleItem.date, Boolean(modalSingleItem.isPinned));
      }

      showNotification(`Đã cập nhật môn ${modalSingleItem.subject} và đồng bộ thiết lập ngày ${formatVietnamDateTitle(modalSingleItem.date)}!`);
      setIsEditSingleModalOpen(false);
      setModalSingleItem(null);
    } catch (err: any) {
      setAssignmentErrorMessage(err.message || 'Lỗi khi cập nhật báo bài lên máy chủ. Dữ liệu đang nhập vẫn được giữ nguyên.');
    } finally {
      setIsSavingAssignment(false);
    }
  };

  // Toggle pin for entire day
  const handleToggleDayPin = async (dateKey: string) => {
    if (dateKey === 'Khác') return;
    try {
      const sameDayItems = assignments.filter(a => normalizeDateKey(a.date || a.dueDate || a.assigned_date) === dateKey);
      if (sameDayItems.length === 0) {
        showNotification('Ngày này chưa có nội dung báo bài nào để ghim. Không cho phép ghim nội dung rỗng.');
        return;
      }
      const nextPinned = await academicService.toggleDayPinAsync(dateKey);
      showNotification(nextPinned ? `Đã ghim toàn bộ báo bài ngày ${formatVietnamDateTitle(dateKey)} lên Bảng tin lớp!` : `Đã bỏ ghim báo bài ngày ${formatVietnamDateTitle(dateKey)}!`);
    } catch (err: any) {
      showNotification(err.message || 'Lỗi khi thay đổi trạng thái ghim báo bài của ngày.');
    }
  };

  // Update appearance (background color and text color) for entire day
  const handleUpdateDayAppearance = async (dateKey: string, bgColor?: string, textColor?: string) => {
    if (dateKey === 'Khác') return;
    try {
      await academicService.updateDayAppearanceAsync(dateKey, bgColor, textColor);
      showNotification(`Đã cập nhật định dạng màu sắc cho ngày ${formatVietnamDateTitle(dateKey)}!`);
      setActiveDayColorPickerDate(null);
    } catch (err: any) {
      showNotification(err.message || 'Lỗi khi lưu định dạng màu sắc.');
    }
  };

  const handleTogglePinItem = async (item: LessonAssignment) => {
    const itemDate = normalizeDateKey(item.date || item.dueDate || item.assigned_date);
    await handleToggleDayPin(itemDate);
  };

  const handleUpdateAppearance = async (item: LessonAssignment, bgColor?: string, textColor?: string) => {
    const itemDate = normalizeDateKey(item.date || item.dueDate || item.assigned_date);
    await handleUpdateDayAppearance(itemDate, bgColor, textColor);
  };

  const handleOpenShiftDate = (group: { dateKey: string; dateTitle: string; items: LessonAssignment[] }) => {
    setShiftDateTarget({
      groupTitle: group.dateTitle,
      ids: group.items.map(i => i.id),
      currentDate: group.dateKey,
      newDate: group.dateKey === 'Khác' ? getVietnamTodayISO() : group.dateKey
    });
    setAssignmentErrorMessage(null);
    setIsShiftDateModalOpen(true);
  };

  const handleConfirmShiftDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftDateTarget || !shiftDateTarget.newDate) return;
    setIsSavingAssignment(true);
    setAssignmentErrorMessage(null);
    try {
      await academicService.shiftAssignmentsDateAsync(shiftDateTarget.ids, shiftDateTarget.newDate);
      showNotification(`Đã chuyển toàn bộ báo bài sang ${formatVietnamDateTitle(shiftDateTarget.newDate)}!`);
      setIsShiftDateModalOpen(false);
      setShiftDateTarget(null);
    } catch (err: any) {
      setAssignmentErrorMessage(err.message || 'Lỗi khi chuyển ngày báo bài.');
    } finally {
      setIsSavingAssignment(false);
    }
  };

  const handleCopyDayShare = (group: { dateTitle: string; items: LessonAssignment[] }) => {
    const text = formatAssignmentShareText(group.dateTitle, group.items);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      showNotification('Đã sao chép nội dung báo bài vào bộ nhớ tạm!');
    } else {
      showNotification('Nội dung:\n' + text);
    }
  };

  // Backward compatible handlers
  const handleOpenAddAssignment = () => {
    handleOpenAddDayAssignment();
  };

  const handleOpenEditAssignment = (item: LessonAssignment) => {
    handleOpenEditSubjectRow(item);
  };

  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'assignment' | 'exam' | 'day_assignments';
    id: string;
    ids?: string[];
    title: string;
  } | null>(null);

  const handleDeleteAssignment = (item: LessonAssignment) => {
    const dTitle = item.date ? formatVietnamDateTitle(item.date) : (item.dayOfWeek || 'ngày học');
    setDeleteTarget({
      type: 'assignment',
      id: item.id,
      title: `môn ${item.subject} (${dTitle})`
    });
  };

  const handleDeleteDayGroup = (group: { dateKey: string; dateTitle: string; items: LessonAssignment[] }) => {
    const deletableItems = isTeacher
      ? group.items
      : group.items.filter(item => item.authorRole === 'CLASS_OFFICER' || item.author_role === 'CLASS_OFFICER');

    if (deletableItems.length === 0) {
      showNotification('Bạn không có quyền xóa các mục báo bài do Giáo viên chủ nhiệm đã tạo.');
      return;
    }

    setDeleteTarget({
      type: 'day_assignments',
      id: group.dateKey,
      ids: deletableItems.map(i => i.id),
      title: `${group.dateTitle} (${deletableItems.length} môn)`
    });
  };

  const handleDeleteExam = (exam: ExamSchedule) => {
    const isCent = exam.isCentralized || ['midterm', 'final'].includes(exam.examType);
    setDeleteTarget({
      type: 'exam',
      id: exam.id,
      title: isCent
        ? (exam.examTitle || 'Lịch kiểm tra tập trung')
        : `Lịch kiểm tra môn ${getVietnameseSubjectFullName(exam.subject)}`
    });
  };

  const confirmDeleteTarget = async () => {
    if (deleteTarget) {
      if (deleteTarget.type === 'assignment') {
        try {
          await academicService.deleteAssignmentAsync(deleteTarget.id);
          showNotification('Đã xóa môn học khỏi báo bài thành công.');
        } catch (err: any) {
          showNotification(err.message || 'Lỗi khi xóa môn học khỏi báo bài.');
        }
      } else if (deleteTarget.type === 'day_assignments') {
        try {
          const idsToDelete = deleteTarget.ids || [deleteTarget.id];
          await academicService.deleteAssignmentsBatchAsync(idsToDelete);
          showNotification(`Đã xóa toàn bộ báo bài ngày ${deleteTarget.title} thành công.`);
        } catch (err: any) {
          showNotification(err.message || 'Lỗi khi xóa toàn bộ báo bài của ngày.');
        }
      } else if (deleteTarget.type === 'exam') {
        academicService.deleteExam(deleteTarget.id);
        showNotification('Đã xóa lịch kiểm tra thành công.');
      }
      setDeleteTarget(null);
    }
  };

  const handleTogglePinAssignment = (id: string) => {
    const item = assignments.find(a => a.id === id);
    if (!item) return;
    if (isOfficer && !isTeacher) {
      if (item.authorRole === 'TEACHER' && item.pinnedToOverview) {
        showNotification('Ban cán sự không thể bỏ ghim nội dung do GVCN đã ghim.');
        return;
      }
    }
    academicService.toggleAssignmentPin(id);
    showNotification('Đã thay đổi trạng thái ghim báo bài.');
  };

  const handleSaveAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAssignment.subject) return;

    if (editingAssignment.id) {
      academicService.saveAssignment({
        id: editingAssignment.id,
        subject: editingAssignment.subject || 'Toán học',
        title: editingAssignment.title || `Báo bài môn ${editingAssignment.subject}`,
        dayOfWeek: editingAssignment.dayOfWeek || 'Thứ 2',
        period: editingAssignment.period || 1,
        date: editingAssignment.date || new Date().toISOString().split('T')[0],
        homework: editingAssignment.homework || '',
        preparation: editingAssignment.preparation || '',
        suppliesNeeded: editingAssignment.suppliesNeeded || '',
        deadline: editingAssignment.deadline || '',
        attachments: editingAssignment.attachments || [],
        authorRole: editingAssignment.authorRole || (isTeacher ? 'TEACHER' : 'CLASS_OFFICER'),
        authorName: editingAssignment.authorName || currentUser.name,
        status: isTeacher ? 'approved' : 'pending',
        pinnedToOverview: Boolean(editingAssignment.pinnedToOverview)
      });
      showNotification('Đã cập nhật thông tin báo bài.');
    } else {
      academicService.saveAssignment({
        subject: editingAssignment.subject || 'Toán học',
        title: editingAssignment.title || `Báo bài môn ${editingAssignment.subject}`,
        dayOfWeek: editingAssignment.dayOfWeek || 'Thứ 2',
        period: editingAssignment.period || 1,
        date: editingAssignment.date || new Date().toISOString().split('T')[0],
        homework: editingAssignment.homework || '',
        preparation: editingAssignment.preparation || '',
        suppliesNeeded: editingAssignment.suppliesNeeded || '',
        deadline: editingAssignment.deadline || '',
        attachments: editingAssignment.attachments || [],
        authorRole: isTeacher ? 'TEACHER' : 'CLASS_OFFICER',
        authorName: currentUser.name,
        status: isTeacher ? 'approved' : 'pending',
        pinnedToOverview: Boolean(editingAssignment.pinnedToOverview)
      });
      showNotification(isTeacher ? 'Đã đăng mục báo bài mới.' : 'Đã gửi báo bài lên bảng tin lớp.');
    }

    setIsAssignmentModalOpen(false);
    setEditingAssignment({});
  };

  // Exam Handlers
  const handleOpenAddExam = (isCentralizedDefault = false) => {
    const isCent = isCentralizedDefault || examScopeTab === 'centralized';
    setEditingExam({
      subject: isCent ? 'Toàn khối / Toàn trường' : (subjects[0]?.name || 'Toán học'),
      examType: isCent ? 'midterm' : '15min',
      format: isCent ? 'Theo đề thi chung của Trường' : 'Trắc nghiệm',
      date: new Date().toISOString().split('T')[0],
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
      period: isCent ? 'Theo ca thi chung' : 'Tiết 1',
      duration: isCent ? '60 - 90 phút' : '15 phút',
      scope: '',
      notes: '',
      announcementTitle: isCent ? 'Lịch kiểm tra đánh giá tập trung Giữa Học kỳ I' : '',
      attachments: [],
      isPublished: true,
      pinnedToOverview: false,
      isCentralized: isCent,
      examTitle: isCent ? 'Lịch kiểm tra tập trung Giữa Học kỳ I' : '',
      semester: 'HK1'
    });
    setIsExamModalOpen(true);
  };

  const handleOpenEditExam = (exam: ExamSchedule) => {
    setEditingExam({ ...exam });
    setIsExamModalOpen(true);
  };

  const handleTogglePinExam = (id: string) => {
    const exam = examSchedules.find(e => e.id === id);
    if (!exam) return;
    if (isOfficer && !isTeacher && exam.authorRole === 'TEACHER' && exam.pinnedToOverview) {
      showNotification('Ban cán sự không thể bỏ ghim nội dung do GVCN đã ghim.');
      return;
    }
    academicService.toggleExamPin(id);
    showNotification('Đã thay đổi trạng thái ghim tổng quan.');
  };

  const handleTogglePinExamToFeed = (id: string) => {
    const exam = examSchedules.find(e => e.id === id);
    if (!exam) return;
    if (isOfficer && !isTeacher && exam.authorRole === 'TEACHER' && exam.pinnedToFeed) {
      showNotification('Ban cán sự không thể bỏ ghim nội dung do GVCN đã ghim.');
      return;
    }
    academicService.toggleExamPinToFeed(id);
    const updated = academicService.getExams().find(e => e.id === id);
    if (updated?.pinnedToFeed) {
      showNotification('Đã ghim bài kiểm tra lên Bảng tin lớp.');
    } else {
      showNotification('Đã bỏ ghim bài kiểm tra khỏi Bảng tin lớp.');
    }
  };

  const handleSaveExam = (e: React.FormEvent) => {
    e.preventDefault();
    const isCent = editingExam.isCentralized || ['midterm', 'final'].includes(editingExam.examType || '');

    if (!isCent && !editingExam.subject) {
      showNotification('Vui lòng chọn môn kiểm tra.');
      return;
    }

    if (isCent) {
      const examData: Partial<ExamSchedule> = {
        subject: 'Toàn khối / Toàn trường',
        examType: editingExam.examType || 'midterm',
        format: 'Theo lịch thi chung',
        date: editingExam.startDate || editingExam.date || new Date().toISOString().split('T')[0],
        startDate: editingExam.startDate || editingExam.date || new Date().toISOString().split('T')[0],
        endDate: editingExam.endDate || editingExam.startDate || editingExam.date,
        period: editingExam.period || 'Theo ca thi chung',
        duration: editingExam.duration || '60 - 90 phút/môn',
        scope: editingExam.scope || '',
        notes: editingExam.notes || editingExam.contentNotes || '',
        announcementTitle: editingExam.announcementTitle || editingExam.examTitle || 'Lịch kiểm tra tập trung',
        attachments: editingExam.attachments || [],
        isPublished: true,
        pinnedToOverview: editingExam.pinnedToOverview || false,
        pinnedToFeed: editingExam.pinnedToFeed || false,
        isCentralized: true,
        examTitle: editingExam.examTitle || editingExam.announcementTitle || 'Lịch kiểm tra tập trung',
        semester: editingExam.semester || 'HK1',
        authorRole: editingExam.authorRole || (isTeacher ? 'TEACHER' : 'CLASS_OFFICER'),
        authorName: editingExam.authorName || currentUser.name
      };

      if (editingExam.id) {
        academicService.saveExam({ ...examData, id: editingExam.id });
        showNotification('Đã cập nhật Lịch kiểm tra tập trung.');
      } else {
        academicService.saveExam(examData);
        showNotification('Đã công bố Lịch kiểm tra tập trung mới.');
      }
    } else {
      const examData: Partial<ExamSchedule> = {
        subject: editingExam.subject || subjects[0]?.name || 'Toán học',
        examType: editingExam.examType || '15min',
        format: editingExam.format || 'Trắc nghiệm',
        date: editingExam.date || new Date().toISOString().split('T')[0],
        period: editingExam.period || 'Tiết 1',
        duration: editingExam.duration || '15 phút',
        scope: editingExam.scope || '',
        notes: editingExam.notes || '',
        attachments: editingExam.attachments || [],
        isPublished: true,
        pinnedToOverview: editingExam.pinnedToOverview || false,
        pinnedToFeed: editingExam.pinnedToFeed || false,
        isCentralized: false,
        semester: editingExam.semester || 'HK1',
        authorRole: editingExam.authorRole || (isTeacher ? 'TEACHER' : 'CLASS_OFFICER'),
        authorName: editingExam.authorName || currentUser.name
      };

      if (editingExam.id) {
        academicService.saveExam({ ...examData, id: editingExam.id });
        showNotification('Đã cập nhật lịch kiểm tra môn học.');
      } else {
        academicService.saveExam(examData);
        showNotification('Đã công bố lịch kiểm tra môn học.');
      }
    }

    setIsExamModalOpen(false);
    setEditingExam({});
  };

  // Share handler
  const handleShare = (title: string, text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(`${title}\n${text}`);
      showNotification('Đã sao chép nội dung vào bộ nhớ tạm để chia sẻ.');
    } else {
      showNotification('Nội dung: ' + title);
    }
  };

  // 1. Group all assignments into unified study days
  const allDayGroups = useMemo(() => {
    const map = new Map<string, LessonAssignment[]>();
    for (const item of assignments) {
      const rawDate = item.date || item.dueDate || item.assigned_date;
      const key = normalizeDateKey(rawDate);
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(item);
    }

    const todayISO = getVietnamTodayISO();
    const tomorrowISO = getVietnamTomorrowISO();

    const groups = Array.from(map.entries()).map(([dateKey, items]) => {
      // Unified day appearance derived from items
      const dayBgColor = items.find(i => i.bgColor && i.bgColor !== 'default')?.bgColor 
        || items.find(i => i.bg_color && i.bg_color !== 'default')?.bg_color 
        || 'default';
      const dayTextColor = items.find(i => i.textColor && i.textColor !== 'default')?.textColor 
        || items.find(i => i.text_color && i.text_color !== 'default')?.text_color 
        || 'default';
      const isPinned = items.some(i => i.isPinned || i.pinnedToOverview);

      return {
        dateKey,
        dateTitle: formatVietnamDateTitle(dateKey),
        dayOfWeekName: getVietnamDayOfWeekName(dateKey),
        isToday: dateKey === todayISO,
        isTomorrow: dateKey === tomorrowISO,
        dayBgColor,
        dayTextColor,
        isPinned,
        hasPinned: isPinned,
        items
      };
    });

    // Sort strictly in descending chronological order (newest date first)
    groups.sort((a, b) => {
      if (a.dateKey === 'Khác') return 1;
      if (b.dateKey === 'Khác') return -1;
      return b.dateKey.localeCompare(a.dateKey);
    });

    return groups;
  }, [assignments]);

  // 2. Filter day groups according to Navigation Mode (All / Week / Month) & Search / Subject
  const filteredDayGroups = useMemo(() => {
    const selectedWeekObj = allStudyWeeks.find(w => w.weekNumber === selectedWeekNumber);

    return allDayGroups.filter(group => {
      // Navigation Mode (All / Week / Month)
      if (assignmentFilterMode === 'week') {
        if (!selectedWeekObj || group.dateKey === 'Khác') return false;
        if (group.dateKey < selectedWeekObj.startDate || group.dateKey > selectedWeekObj.endDate) {
          return false;
        }
      } else if (assignmentFilterMode === 'month') {
        if (!selectedMonth || group.dateKey === 'Khác') return false;
        if (!group.dateKey.startsWith(selectedMonth)) {
          return false;
        }
      }

      // Subject Filter
      if (assignmentSubjectFilter !== 'all') {
        const hasSub = group.items.some(i => i.subject === assignmentSubjectFilter);
        if (!hasSub) return false;
      }

      // Search Query
      if (assignmentSearch.trim()) {
        const q = assignmentSearch.toLowerCase();
        const hasMatch = group.items.some(i => {
          const matchSub = i.subject.toLowerCase().includes(q);
          const matchContent = getAssignmentTaskContent(i).toLowerCase().includes(q);
          return matchSub || matchContent;
        });
        if (!hasMatch) return false;
      }

      return true;
    });
  }, [allDayGroups, assignmentFilterMode, selectedWeekNumber, selectedMonth, assignmentSubjectFilter, assignmentSearch, allStudyWeeks]);

  // 3. Paginate day groups (10 days per page)
  const paginatedDayGroups = useMemo(() => {
    const startIndex = (dayPage - 1) * dayPageSize;
    return filteredDayGroups.slice(startIndex, startIndex + dayPageSize);
  }, [filteredDayGroups, dayPage, dayPageSize]);

  const totalDayPages = Math.max(1, Math.ceil(filteredDayGroups.length / dayPageSize));

  // Backward compatibility alias: dayGroups
  const dayGroups = paginatedDayGroups;

  // List of available months for "Theo tháng" filtering mode
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    for (const g of allDayGroups) {
      if (g.dateKey && g.dateKey !== 'Khác' && g.dateKey.length >= 7) {
        monthSet.add(g.dateKey.substring(0, 7));
      }
    }
    const now = new Date();
    const cur = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    monthSet.add(cur);

    for (const w of allStudyWeeks) {
      if (w.startDate && w.startDate.length >= 7) monthSet.add(w.startDate.substring(0, 7));
      if (w.endDate && w.endDate.length >= 7) monthSet.add(w.endDate.substring(0, 7));
    }
    return Array.from(monthSet).sort().reverse();
  }, [allDayGroups, allStudyWeeks]);

  const formatMonthLabel = (mKey: string) => {
    const parts = mKey.split('-');
    if (parts.length === 2) {
      return `Tháng ${parts[1]}/${parts[0]}`;
    }
    return mKey;
  };

  // Filtered Exams with Scope separation
  const filteredExams = examSchedules.filter((e) => {
    const isCent = e.isCentralized || ['midterm', 'final'].includes(e.examType);

    if (examScopeTab === 'regular' && isCent) return false;
    if (examScopeTab === 'centralized' && !isCent) return false;

    if (examTypeFilter !== 'all' && e.examType !== examTypeFilter) return false;
    if (examFormatFilter !== 'all' && e.format !== examFormatFilter) return false;
    if (examSubjectFilter !== 'all' && e.subject !== examSubjectFilter) return false;
    if (examSearch.trim()) {
      const q = examSearch.toLowerCase();
      const matchSub = e.subject.toLowerCase().includes(q);
      const matchScope = (e.scope || '').toLowerCase().includes(q);
      const matchNotes = (e.notes || '').toLowerCase().includes(q);
      const matchTitle = (e.examTitle || '').toLowerCase().includes(q);
      const matchRoom = (e.room || '').toLowerCase().includes(q);
      if (!matchSub && !matchScope && !matchNotes && !matchTitle && !matchRoom) return false;
    }
    return true;
  });

  // Sort exams: pinned first, then chronological event date (ascending) and start time, before pagination
  const sortedExams = useMemo(() => {
    return [...filteredExams].sort((a, b) => {
      const aPin = a.pinnedToFeed ? 1 : 0;
      const bPin = b.pinnedToFeed ? 1 : 0;
      if (aPin !== bPin) return bPin - aPin;
      const diff = parseDateToTimestamp(a.examDate) - parseDateToTimestamp(b.examDate);
      if (diff !== 0) return diff;
      const timeA = a.startTime || '00:00';
      const timeB = b.startTime || '00:00';
      return timeA.localeCompare(timeB);
    });
  }, [filteredExams]);

  const paginatedExams = sortedExams.slice(
    (examPage - 1) * examPageSize,
    examPage * examPageSize
  );

  const getExamBadge = (type: ExamSchedule['examType']) => {
    switch (type) {
      case '15min':
        return { label: '15 Phút (Thường xuyên)', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
      case '45min':
      case '1period':
        return { label: '1 Tiết (Định kỳ)', bg: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'midterm':
        return { label: 'Giữa Học kỳ', bg: 'bg-amber-50 text-amber-800 border-amber-300 font-bold' };
      case 'final':
        return { label: 'Cuối Học kỳ', bg: 'bg-rose-50 text-rose-800 border-rose-300 font-black' };
      default:
        return { label: 'Kiểm tra', bg: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
  };

  const getFormatBadge = (format?: string) => {
    switch (format) {
      case 'Trắc nghiệm':
        return { label: 'Trắc nghiệm', bg: 'bg-sky-50 text-sky-700 border-sky-200' };
      case 'Tự luận':
        return { label: 'Tự luận', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case 'Kết hợp':
      case 'Kết hợp (Trắc nghiệm + Tự luận)':
        return { label: 'Kết hợp (TN + TL)', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'Thực hành':
      case 'Thực hành / Báo cáo':
        return { label: 'Thực hành / Báo cáo', bg: 'bg-teal-50 text-teal-700 border-teal-200' };
      case 'Vấn đáp':
        return { label: 'Vấn đáp', bg: 'bg-orange-50 text-orange-700 border-orange-200' };
      default:
        return format ? { label: format, bg: 'bg-slate-50 text-slate-700 border-slate-200' } : null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {notificationMsg && (
        <div className="fixed top-20 right-4 z-toast flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-xs font-bold text-white shadow-xl animate-fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{notificationMsg}</span>
        </div>
      )}

      {/* Main Header & 3 Unified Subtabs */}
      <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-2xs">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight">
                Thời khóa biểu & Báo bài
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Kế hoạch học tập tuần, chuẩn bị bài vở và lịch kiểm tra định kỳ
              </p>
            </div>
          </div>

          {/* 3 Explicit Subtabs */}
          <div className="flex items-center gap-1.5 rounded-2xl bg-slate-100 p-1.5 self-start lg:self-auto overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => handleSwitchTab('timetable')}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeSubTab === 'timetable'
                  ? 'bg-white text-blue-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>1. Thời khóa biểu</span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchTab('assignments')}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeSubTab === 'assignments'
                  ? 'bg-white text-blue-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ClipboardList className="h-3.5 w-3.5" />
              <span>2. Báo bài</span>
              {assignments.length > 0 && (
                <span className="ml-1 rounded-full bg-blue-100 text-blue-700 px-1.5 py-0.2 text-[10px] font-black">
                  {assignments.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleSwitchTab('exams')}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeSubTab === 'exams'
                  ? 'bg-white text-blue-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileCheck2 className="h-3.5 w-3.5" />
              <span>3. Lịch kiểm tra</span>
              {examSchedules.length > 0 && (
                <span className="ml-1 rounded-full bg-rose-100 text-rose-700 px-1.5 py-0.2 text-[10px] font-black">
                  {examSchedules.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* SUBTAB 1: THỜI KHÓA BIỂU */}
        {/* ------------------------------------------------------------- */}
        {activeSubTab === 'timetable' && (
          <div className="mt-5 space-y-4 animate-fade-in">
            <TimetableTableGrid
              currentVersion={currentVersion}
              historyVersions={historyVersions}
              currentUserRole={currentUser.role}
              canManageTimetable={canManageTimetable}
              canManageAssignments={canCreateAssignment}
              onRefresh={loadData}
            />
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* SUBTAB 2: BÁO BÀI (HỌC VIÊN CẦN CHUẨN BỊ / BÀI TẬP VỀ NHÀ) */}
        {/* ------------------------------------------------------------- */}
        {activeSubTab === 'assignments' && (
          <div className="mt-5 space-y-4 animate-fade-in">
            {/* Action & Filter Toolbar */}
            <div className="flex flex-col gap-3 bg-slate-50 p-3.5 sm:p-4 rounded-2xl border border-slate-200">
              {/* Row 1: Navigation Modes (Tất cả / Theo tuần học / Theo tháng) & Create Button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Segmented Mode Selector */}
                <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-xl overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setAssignmentFilterMode('all');
                      setDayPage(1);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      assignmentFilterMode === 'all'
                        ? 'bg-white text-blue-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                    }`}
                  >
                    <Layers className="h-3.5 w-3.5" />
                    <span>Tất cả</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                      assignmentFilterMode === 'all' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {allDayGroups.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAssignmentFilterMode('week');
                      setDayPage(1);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      assignmentFilterMode === 'week'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                    }`}
                  >
                    <Calendar className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Theo tuần học</span>
                    {assignmentFilterMode === 'week' && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full font-black bg-indigo-100 text-indigo-700">
                        Tuần {selectedWeekNumber}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAssignmentFilterMode('month');
                      setDayPage(1);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      assignmentFilterMode === 'month'
                        ? 'bg-white text-emerald-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                    }`}
                  >
                    <Clock className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Theo tháng</span>
                    {assignmentFilterMode === 'month' && selectedMonth && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full font-black bg-emerald-100 text-emerald-700">
                        {formatMonthLabel(selectedMonth)}
                      </span>
                    )}
                  </button>
                </div>

                {/* Create Assignment Button */}
                {canCreateAssignment && (
                  <button
                    type="button"
                    onClick={() => handleOpenAddDayAssignment()}
                    className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-2xs transition-colors cursor-pointer shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                    <span>{isTeacher ? 'Tạo báo bài theo ngày' : 'Đề xuất báo bài theo ngày'}</span>
                  </button>
                )}
              </div>

              {/* Row 2: Secondary Controls (Week Selector / Month Selector, Subject Filter, Search) */}
              <div className="flex flex-wrap items-center gap-2.5 pt-1 border-t border-slate-200/60">
                {/* Week selector if mode is 'week' */}
                {assignmentFilterMode === 'week' && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-600 hidden sm:inline">Chọn tuần:</span>
                    <select
                      value={selectedWeekNumber}
                      onChange={(e) => {
                        setSelectedWeekNumber(Number(e.target.value));
                        setDayPage(1);
                      }}
                      className="rounded-xl border border-indigo-200 bg-indigo-50/60 text-indigo-900 px-3 py-1.5 text-xs font-bold outline-hidden focus:ring-1 focus:ring-indigo-500"
                    >
                      {allStudyWeeks.map((w) => (
                        <option key={w.weekNumber} value={w.weekNumber}>
                          {w.fullLabel}: {w.dateRangeFormatted}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Month selector if mode is 'month' */}
                {assignmentFilterMode === 'month' && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-600 hidden sm:inline">Chọn tháng:</span>
                    <select
                      value={selectedMonth}
                      onChange={(e) => {
                        setSelectedMonth(e.target.value);
                        setDayPage(1);
                      }}
                      className="rounded-xl border border-emerald-200 bg-emerald-50/60 text-emerald-900 px-3 py-1.5 text-xs font-bold outline-hidden focus:ring-1 focus:ring-emerald-500"
                    >
                      {availableMonths.map((m) => (
                        <option key={m} value={m}>
                          {formatMonthLabel(m)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Subject Filter */}
                <select
                  value={assignmentSubjectFilter}
                  onChange={(e) => {
                    setAssignmentSubjectFilter(e.target.value);
                    setDayPage(1);
                  }}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 outline-hidden"
                >
                  <option value="all">Tất cả môn học</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>

                {/* Search */}
                <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={assignmentSearch}
                    onChange={(e) => {
                      setAssignmentSearch(e.target.value);
                      setDayPage(1);
                    }}
                    placeholder="Tìm môn học, nội dung bài..."
                    className="w-full rounded-xl border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 outline-hidden focus:border-blue-500"
                  />
                  {assignmentSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setAssignmentSearch('');
                        setDayPage(1);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Informational Banner */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 pt-0.5">
                <div className="flex items-center gap-2">
                  {assignmentFilterMode === 'week' && (() => {
                    const w = allStudyWeeks.find(item => item.weekNumber === selectedWeekNumber);
                    return w ? (
                      <span className="font-semibold text-indigo-900 bg-indigo-100/70 px-2.5 py-0.5 rounded-md">
                        Lịch tuần học: <b>Tuần {w.weekNumber}</b> ({w.dateRangeFormatted}) • {w.semesterLabel}
                      </span>
                    ) : null;
                  })()}

                  {assignmentFilterMode === 'month' && (
                    <span className="font-semibold text-emerald-900 bg-emerald-100/70 px-2.5 py-0.5 rounded-md">
                      Tháng đang chọn: <b>{formatMonthLabel(selectedMonth)}</b>
                    </span>
                  )}

                  {assignmentFilterMode === 'all' && (
                    <span className="font-semibold text-slate-700 bg-slate-200/70 px-2.5 py-0.5 rounded-md">
                      Toàn bộ báo bài theo thứ tự ngày mới nhất đến cũ nhất
                    </span>
                  )}
                </div>

                <span className="font-medium text-slate-500">
                  Hiển thị <b>{filteredDayGroups.length}</b> ngày báo bài (10 ngày / trang)
                </span>
              </div>
            </div>

            {/* Assignments List Grouped by Study Day */}
            {dayGroups.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center bg-slate-50/50">
                <ClipboardList className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                <h4 className="text-xs font-bold text-slate-700">Chưa có nhiệm vụ báo bài nào phù hợp</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 max-w-md mx-auto">
                  {assignmentFilterMode === 'week'
                    ? `Chưa có báo bài nào trong Tuần ${selectedWeekNumber}. Thầy/Cô có thể tạo mới bằng nút phía trên.`
                    : assignmentFilterMode === 'month'
                    ? `Chưa có báo bài nào trong ${formatMonthLabel(selectedMonth)}.`
                    : 'Nhiệm vụ học tập và nội dung cần chuẩn bị theo từng ngày học sẽ hiển thị tại đây để học viên tiện theo dõi.'}
                </p>
                {canCreateAssignment && (
                  <button
                    type="button"
                    onClick={() => handleOpenAddDayAssignment()}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-blue-700 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Tạo báo bài đầu tiên</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {dayGroups.map((group) => {
                  const dayBgClasses = getAssignmentBgClasses(group.dayBgColor);
                  const dayTextClass = getAssignmentTextClass(group.dayTextColor);
                  const isDayColorPickerOpen = activeDayColorPickerDate === group.dateKey;

                  return (
                    <div
                      key={group.dateKey}
                      className={`rounded-2xl border transition-all shadow-xs ${
                        group.isPinned
                          ? 'border-amber-300 ring-2 ring-amber-300/60 bg-white'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      } p-4 sm:p-5`}
                    >
                      {/* Header ngày học: Thứ, ngày, tháng, năm + Thiết lập chung cho cả ngày */}
                      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${group.isPinned ? 'bg-amber-100 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
                            <Calendar className="h-4 w-4" />
                          </span>

                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                              {group.dateTitle}
                            </h3>

                            {group.isToday && (
                              <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                                Hôm nay
                              </span>
                            )}

                            {group.isTomorrow && (
                              <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-800">
                                Ngày mai
                              </span>
                            )}

                            {group.isPinned && (
                              <span className="rounded-md bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 text-[11px] font-bold flex items-center gap-1 shadow-2xs">
                                <Pin className="h-3 w-3 fill-amber-700 text-amber-700" />
                                <span>ĐÃ GHIM BẢNG TIN</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Header Actions: Ghim cả ngày, Đổi màu cả ngày, Sao chép, Đổi ngày, Thêm môn */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Nút Ghim / Bỏ ghim cho cả ngày */}
                          {canCreateAssignment && group.dateKey !== 'Khác' && (
                            <button
                              type="button"
                              onClick={() => handleToggleDayPin(group.dateKey)}
                              className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                                group.isPinned
                                  ? 'bg-amber-100 border-amber-300 text-amber-800 hover:bg-amber-200'
                                  : 'bg-white border-slate-200 text-slate-600 hover:border-amber-300 hover:text-amber-700 hover:bg-amber-50'
                              }`}
                              title={group.isPinned ? 'Bỏ ghim báo bài ngày này khỏi Bảng tin' : 'Ghim toàn bộ báo bài ngày này lên Bảng tin lớp'}
                            >
                              <Pin className={`h-3.5 w-3.5 ${group.isPinned ? 'fill-amber-700 text-amber-700' : ''}`} />
                              <span>{group.isPinned ? 'Đã ghim' : 'Ghim ngày'}</span>
                            </button>
                          )}

                          {/* Nút Đổi màu nền & màu chữ cho toàn bộ ngày này */}
                          {canCreateAssignment && group.dateKey !== 'Khác' && (
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setActiveDayColorPickerDate(isDayColorPickerOpen ? null : group.dateKey)}
                                className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer ${
                                  isDayColorPickerOpen
                                    ? 'bg-blue-100 border-blue-300 text-blue-700'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-blue-600'
                                }`}
                                title="Chọn màu nền và màu chữ cho toàn bộ ngày này"
                              >
                                <Palette className="h-3.5 w-3.5" />
                                <span>Màu sắc</span>
                              </button>

                              {/* Dropdown Bảng chọn màu cho toàn bộ ngày */}
                              {isDayColorPickerOpen && (
                                <div className="absolute right-0 top-full mt-1.5 z-50 w-72 rounded-2xl bg-white p-3.5 shadow-xl border border-slate-200 text-xs animate-fade-in">
                                  <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100">
                                    <span className="font-extrabold text-slate-900">Màu sắc ngày ({group.dateTitle})</span>
                                    <button
                                      type="button"
                                      onClick={() => setActiveDayColorPickerDate(null)}
                                      className="text-slate-400 hover:text-slate-600 p-0.5 rounded-md"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </div>

                                  {/* Màu nền cả ngày */}
                                  <div className="mb-3">
                                    <span className="block text-[11px] font-bold text-slate-600 mb-1.5">Màu nền cho cả ngày:</span>
                                    <div className="grid grid-cols-7 gap-1.5">
                                      {ASSIGNMENT_BG_COLORS.map(c => {
                                        const isSelected = (group.dayBgColor || 'default') === c.id;
                                        return (
                                          <button
                                            key={c.id}
                                            type="button"
                                            onClick={() => handleUpdateDayAppearance(group.dateKey, c.id, group.dayTextColor)}
                                            className={`h-7 w-7 rounded-lg border flex items-center justify-center transition-transform hover:scale-110 cursor-pointer ${
                                              isSelected ? 'ring-2 ring-blue-600 scale-105 border-blue-400' : 'border-slate-300'
                                            }`}
                                            style={{ backgroundColor: c.hex }}
                                            title={c.label}
                                          >
                                            {isSelected && <span className="h-2 w-2 rounded-full bg-slate-800" />}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  {/* Màu chữ cả ngày */}
                                  <div>
                                    <span className="block text-[11px] font-bold text-slate-600 mb-1.5">Màu chữ cho cả ngày:</span>
                                    <div className="grid grid-cols-6 gap-1.5">
                                      {ASSIGNMENT_TEXT_COLORS.map(c => {
                                        const isSelected = (group.dayTextColor || 'default') === c.id;
                                        return (
                                          <button
                                            key={c.id}
                                            type="button"
                                            onClick={() => handleUpdateDayAppearance(group.dateKey, group.dayBgColor, c.id)}
                                            className={`h-7 w-7 rounded-lg border flex items-center justify-center transition-transform hover:scale-110 cursor-pointer ${
                                              isSelected ? 'ring-2 ring-blue-600 scale-105 border-slate-300' : 'border-slate-200'
                                            }`}
                                            style={{ backgroundColor: c.hex }}
                                            title={c.label}
                                          >
                                            {isSelected && <span className="h-2 w-2 rounded-full bg-white" />}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Sao chép báo bài của ngày */}
                          <button
                            type="button"
                            onClick={() => handleCopyDayShare(group)}
                            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Sao chép báo bài của ngày này"
                          >
                            <Share2 className="h-3 w-3" />
                            <span className="hidden sm:inline">Sao chép</span>
                          </button>

                          {/* Đổi ngày báo bài */}
                          {canCreateAssignment && (
                            <button
                              type="button"
                              onClick={() => handleOpenShiftDate(group)}
                              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors cursor-pointer"
                              title="Đổi ngày báo bài"
                            >
                              <Calendar className="h-3 w-3" />
                              <span className="hidden sm:inline">Đổi ngày</span>
                            </button>
                          )}

                          {/* Xóa toàn bộ báo bài của ngày này */}
                          {canCreateAssignment && (
                            <button
                              type="button"
                              onClick={() => handleDeleteDayGroup(group)}
                              className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-white px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Xóa toàn bộ báo bài của ngày này"
                            >
                              <Trash2 className="h-3 w-3" />
                              <span className="hidden sm:inline">Xóa ngày</span>
                            </button>
                          )}

                          {/* Thêm môn học vào ngày này */}
                          {canCreateAssignment && (
                            <button
                              type="button"
                              onClick={() => handleOpenAddDayAssignment(group.dateKey === 'Khác' ? undefined : group.dateKey)}
                              className="inline-flex items-center gap-1 rounded-xl bg-blue-50 border border-blue-200 px-2.5 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
                              title="Thêm môn học vào ngày này"
                            >
                              <Plus className="h-3 w-3" />
                              <span>Thêm môn</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Danh sách nhiệm vụ học tập theo từng môn - TẤT CẢ DÙNG CHUNG MÀU NỀN & MÀU CHỮ CỦA NGÀY */}
                      <div className="space-y-2 pt-3">
                        {group.items.map((item) => {
                          const content = getAssignmentTaskContent(item) || 'Chuẩn bị bài học theo hướng dẫn.';
                          const canEdit = isTeacher || (isOfficer && item.authorRole === 'CLASS_OFFICER');
                          const canDelete = isTeacher || (isOfficer && item.authorRole === 'CLASS_OFFICER');

                          return (
                            <div
                              key={item.id}
                              className={`group relative flex items-start justify-between gap-3 rounded-xl px-3.5 py-2.5 border transition-all ${dayBgClasses.bg} ${dayBgClasses.border} shadow-2xs hover:border-slate-300`}
                            >
                              {/* Dòng môn học: - Môn Toán: Kiểm tra thường xuyên. */}
                              <div className="flex items-start gap-2 flex-1 min-w-0">
                                <span className={`font-bold select-none text-base leading-none mt-0.5 ${dayTextClass}`}>•</span>
                                <div className={`text-sm leading-relaxed break-words flex-1 ${dayTextClass}`}>
                                  <span className="font-extrabold">Môn {item.subject}:</span>{' '}
                                  <span>{content}</span>
                                  {item.attachments && item.attachments.length > 0 && (
                                    <span className="inline-flex items-center gap-1 ml-2">
                                      {item.attachments.map(f => (
                                        <button
                                          key={f.id}
                                          type="button"
                                          onClick={() => setPreviewFile(f)}
                                          className="inline-flex items-center gap-0.5 rounded bg-slate-100/90 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 hover:text-blue-700 cursor-pointer"
                                        >
                                          <Paperclip className="h-2.5 w-2.5" />
                                          <span className="truncate max-w-[100px]">{f.name}</span>
                                        </button>
                                      ))}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Thao tác Chỉnh sửa & Xóa dòng môn học */}
                              {canCreateAssignment && (
                                <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                                  {canEdit && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditSubjectRow(item)}
                                      className="rounded-lg p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                                      title="Chỉnh sửa môn học này"
                                    >
                                      <Edit2 className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                  {canDelete && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteAssignment(item)}
                                      className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                      title="Xóa môn học này"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Phân trang Báo bài: Hiển thị tối đa 10 báo bài theo ngày trên một trang */}
            {filteredDayGroups.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="text-xs text-slate-600 font-medium flex items-center gap-2">
                  <span>Trang <b className="text-slate-900">{dayPage}</b> / <b className="text-slate-900">{totalDayPages}</b></span>
                  <span className="text-slate-300">•</span>
                  <span>Tổng cộng: <b className="text-slate-900">{filteredDayGroups.length}</b> ngày báo bài (10 ngày / trang)</span>
                </div>

                {totalDayPages > 1 && (
                  <div className="flex items-center gap-1.5 self-center sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setDayPage(prev => Math.max(1, prev - 1))}
                      disabled={dayPage === 1}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    >
                      Trang trước
                    </button>

                    {Array.from({ length: totalDayPages }, (_, i) => i + 1).map((p) => {
                      // Compact pagination buttons if many pages
                      if (totalDayPages > 7 && Math.abs(p - dayPage) > 2 && p !== 1 && p !== totalDayPages) {
                        if (p === 2 || p === totalDayPages - 1) {
                          return <span key={p} className="text-slate-400 px-1 text-xs">...</span>;
                        }
                        return null;
                      }

                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setDayPage(p)}
                          className={`h-7 w-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            p === dayPage
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => setDayPage(prev => Math.min(totalDayPages, prev + 1))}
                      disabled={dayPage === totalDayPages}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    >
                      Trang sau
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* SUBTAB 3: LỊCH KIỂM TRA (THƯỜNG XUYÊN / TẬP TRUNG ĐỊNH KỲ) */}
        {/* ------------------------------------------------------------- */}
        {activeSubTab === 'exams' && (
          <div className="mt-5 space-y-4 animate-fade-in">
            {/* Sub-scope Segmented Navigation & Action Buttons */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
              {/* Scope Segmented Tabs */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl overflow-x-auto">
                <button
                  type="button"
                  onClick={() => {
                    setExamScopeTab('all');
                    setExamPage(1);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    examScopeTab === 'all'
                      ? 'bg-white text-blue-700 shadow-xs ring-1 ring-slate-200/50'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>Tất cả lịch kiểm tra</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    examScopeTab === 'all' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {examSchedules.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setExamScopeTab('regular');
                    setExamPage(1);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    examScopeTab === 'regular'
                      ? 'bg-white text-emerald-700 shadow-xs ring-1 ring-slate-200/50'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <FileCheck2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>KT Thường xuyên (15p / 1 tiết)</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    examScopeTab === 'regular' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {examSchedules.filter(e => !e.isCentralized && ['15min', '1period', '45min'].includes(e.examType)).length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setExamScopeTab('centralized');
                    setExamPage(1);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    examScopeTab === 'centralized'
                      ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200/50'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <Building2 className="h-3.5 w-3.5 text-indigo-600" />
                  <span>KT Tập trung (Giữa kỳ / Cuối kỳ)</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    examScopeTab === 'centralized' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {examSchedules.filter(e => e.isCentralized || ['midterm', 'final'].includes(e.examType)).length}
                  </span>
                </button>
              </div>

              {/* Action Buttons for Teacher / Officer */}
              {canCreateExam && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenAddExam(false)}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-2xs transition-colors cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>+ KT Thường xuyên</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenAddExam(true)}
                    className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 shadow-2xs transition-colors cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>+ Lịch thi Tập trung</span>
                  </button>
                </div>
              )}
            </div>

            {/* Filter Toolbar */}
            <div className="flex flex-wrap items-center gap-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-200">
              {/* Search input */}
              <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={examSearch}
                  onChange={(e) => {
                    setExamSearch(e.target.value);
                    setExamPage(1);
                  }}
                  placeholder="Tìm môn, phòng, kỳ thi, nội dung..."
                  className="w-full rounded-xl border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 outline-hidden focus:border-blue-500"
                />
                {examSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setExamSearch('');
                      setExamPage(1);
                    }}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Filter Type */}
              <select
                value={examTypeFilter}
                onChange={(e) => {
                  setExamTypeFilter(e.target.value);
                  setExamPage(1);
                }}
                className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 outline-hidden"
              >
                <option value="all">Tất cả loại bài KT</option>
                <option value="15min">15 Phút (Thường xuyên)</option>
                <option value="1period">1 Tiết / 45 Phút</option>
                <option value="midterm">Giữa Học kỳ</option>
                <option value="final">Cuối Học kỳ</option>
              </select>

              {/* Filter Format */}
              <select
                value={examFormatFilter}
                onChange={(e) => {
                  setExamFormatFilter(e.target.value);
                  setExamPage(1);
                }}
                className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 outline-hidden"
              >
                <option value="all">Tất cả hình thức</option>
                <option value="Trắc nghiệm">Trắc nghiệm</option>
                <option value="Tự luận">Tự luận</option>
                <option value="Kết hợp (Trắc nghiệm + Tự luận)">Kết hợp (TN + TL)</option>
                <option value="Thực hành / Báo cáo">Thực hành / Báo cáo</option>
                <option value="Vấn đáp">Vấn đáp</option>
              </select>

              {/* Filter Subject */}
              <select
                value={examSubjectFilter}
                onChange={(e) => {
                  setExamSubjectFilter(e.target.value);
                  setExamPage(1);
                }}
                className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 outline-hidden"
              >
                <option value="all">Tất cả môn học</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.name}>
                    {getVietnameseSubjectFullName(s.name)}
                  </option>
                ))}
              </select>
            </div>

            {/* Exams Table / Cards */}
            {filteredExams.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center bg-slate-50/50">
                <FileCheck2 className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                <h4 className="text-xs font-bold text-slate-700">Chưa có lịch kiểm tra nào phù hợp</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 max-w-md mx-auto">
                  Lịch kiểm tra thường xuyên 15 phút, 1 tiết, giữa kỳ và cuối kỳ sẽ hiển thị tại đây kèm đề cương ôn tập.
                </p>
                {canCreateExam && (
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenAddExam(false)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Thêm KT Thường xuyên</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenAddExam(true)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Thêm KT Tập trung</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paginatedExams.map((exam) => {
                  const isCent = exam.isCentralized || ['midterm', 'final'].includes(exam.examType);
                  const badge = getExamBadge(exam.examType);
                  const formatBadge = getFormatBadge(exam.format);
                  const isExamAuthor = isTeacher || exam.authorName === currentUser.name || (isOfficer && (exam.authorRole === 'CLASS_OFFICER' || !exam.authorRole));
                  const isTeacherExam = exam.authorRole === 'TEACHER';
                  const canEdit = isTeacher || (isOfficer && isExamAuthor);
                  const canDelete = isTeacher || (isOfficer && isExamAuthor);
                  const canPinExam = isTeacher || (isOfficer && (isExamAuthor || (!isTeacherExam && !exam.pinnedToOverview)));
                  const canPinExamToFeed = isTeacher || (isOfficer && (isExamAuthor || (!isTeacherExam && !exam.pinnedToFeed)));
                  const localizedSubject = getVietnameseSubjectFullName(exam.subject);
                  const primaryImageAttachment = exam.attachments?.find(f => f.type === 'image' || (f.type as string)?.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(f.name));
                  const primaryPdfAttachment = exam.attachments?.find(f => f.type === 'pdf' || (f.type as string) === 'application/pdf' || /\.pdf$/i.test(f.name));

                  if (isCent) {
                    const isHighlighted = highlightedExamId === exam.id;
                    return (
                      <div
                        key={exam.id}
                        id={`exam-card-${exam.id}`}
                        className={`rounded-2xl border bg-white p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between md:col-span-2 border-indigo-200 bg-gradient-to-br from-indigo-50/30 via-white to-slate-50 ring-1 ring-indigo-100 ${
                          isHighlighted
                            ? 'border-indigo-600 ring-4 ring-indigo-300/60 shadow-lg scale-[1.005]'
                            : exam.pinnedToOverview
                            ? 'border-amber-300 ring-amber-200'
                            : ''
                        }`}
                      >
                        <div className="space-y-3.5">
                          {/* Header Banner */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-indigo-100">
                            <div className="flex items-center gap-2">
                              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
                                <Building2 className="h-5 w-5" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="text-base font-black text-slate-900">
                                    {exam.examTitle || exam.announcementTitle || 'LỊCH KIỂM TRA TẬP TRUNG'}
                                  </h3>
                                  <span className="rounded-lg bg-indigo-100 text-indigo-800 text-[11px] font-extrabold px-2.5 py-0.5 border border-indigo-200">
                                    {exam.semester === 'HK1' ? 'Học kỳ I' : exam.semester === 'HK2' ? 'Học kỳ II' : exam.semester || 'Học kỳ I'}
                                  </span>
                                  <span className={`rounded-lg px-2.5 py-0.5 text-[11px] font-extrabold border ${badge.bg}`}>
                                    {badge.label}
                                  </span>
                                  {exam.pinnedToOverview && (
                                    <span className="rounded-lg bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 flex items-center gap-1 border border-amber-200">
                                      <Pin className="h-3 w-3" /> Đã ghim
                                    </span>
                                  )}
                                  {exam.pinnedToFeed && (
                                    <span className="rounded-lg bg-blue-100 text-blue-800 text-[10px] font-black px-2 py-0.5 flex items-center gap-1 border border-blue-200 shadow-2xs">
                                      <Pin className="h-3 w-3 fill-blue-700 text-blue-700" /> Đã ghim Bảng tin
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-indigo-900/80 font-medium mt-0.5">
                                  Kế hoạch kiểm tra đánh giá định kỳ tập trung toàn trường / toàn khối
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 self-start sm:self-auto">
                              <button
                                type="button"
                                onClick={() =>
                                  handleShare(
                                    `[${exam.examTitle || 'LỊCH KIỂM TRA TẬP TRUNG'}]`,
                                    `Thời gian: Từ ${exam.startDate || exam.date} đến ${exam.endDate || exam.startDate || exam.date}\nHọc kỳ: ${exam.semester || 'HK1'}\nLưu ý chung: ${exam.notes || 'Học sinh có mặt trước giờ thi 15 phút, mang đầy đủ dụng cụ học tập.'}`
                                  )
                                }
                                className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors cursor-pointer"
                                title="Sao chép thông báo để chia sẻ"
                              >
                                <Share2 className="h-4 w-4" />
                              </button>

                              {/* Pin to Feed button (Teacher or Author Officer) */}
                              {canPinExamToFeed && (
                                <button
                                  type="button"
                                  onClick={() => handleTogglePinExamToFeed(exam.id)}
                                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                                    exam.pinnedToFeed
                                      ? 'bg-amber-500 text-white border-amber-500 shadow-sm shadow-amber-200 hover:bg-amber-600'
                                      : 'bg-white text-slate-600 border-slate-200 hover:border-amber-400 hover:text-amber-600 hover:bg-amber-50/50'
                                  }`}
                                  title={exam.pinnedToFeed ? 'Bỏ ghim khỏi Bảng tin lớp' : 'Ghim bài kiểm tra lên Bảng tin lớp'}
                                >
                                  <Pin className={`h-3.5 w-3.5 ${exam.pinnedToFeed ? 'fill-current' : ''}`} />
                                  <span>{exam.pinnedToFeed ? 'Đã ghim Bảng tin' : 'Ghim Bảng tin'}</span>
                                </button>
                              )}

                              {/* Pin to Overview button (Teacher or Author Officer) */}
                              {canPinExam && (
                                <button
                                  type="button"
                                  onClick={() => handleTogglePinExam(exam.id)}
                                  className={`rounded-xl border border-slate-200 bg-white p-2 transition-colors cursor-pointer ${
                                    exam.pinnedToOverview
                                      ? 'text-amber-600 hover:bg-amber-50'
                                      : 'text-slate-500 hover:bg-slate-50 hover:text-amber-600'
                                  }`}
                                  title={exam.pinnedToOverview ? 'Bỏ ghim' : 'Ghim lên đầu'}
                                >
                                  <Pin className="h-4 w-4" />
                                </button>
                              )}

                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditExam(exam)}
                                  className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-600 cursor-pointer"
                                  title="Chỉnh sửa"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                              )}

                              {canDelete && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteExam(exam)}
                                  className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                                  title="Xóa"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Time & Scope Meta */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white/80 p-3 rounded-xl border border-indigo-100 text-xs">
                            <div className="flex items-center gap-2.5">
                              <Calendar className="h-4 w-4 text-indigo-600 shrink-0" />
                              <div>
                                <span className="font-bold text-slate-500 block text-[10px]">Thời gian diễn ra</span>
                                <span className="font-extrabold text-slate-900">
                                  {exam.startDate && exam.endDate && exam.startDate !== exam.endDate
                                    ? `Từ ${exam.startDate} đến ${exam.endDate}`
                                    : exam.date || exam.startDate || 'Theo lịch trường'}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2.5">
                              <Clock className="h-4 w-4 text-indigo-600 shrink-0" />
                              <div>
                                <span className="font-bold text-slate-500 block text-[10px]">Thời lượng / Ca thi</span>
                                <span className="font-extrabold text-slate-900">{exam.duration || '60 - 90 phút/môn'}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2.5">
                              <FileText className="h-4 w-4 text-indigo-600 shrink-0" />
                              <div>
                                <span className="font-bold text-slate-500 block text-[10px]">Hình thức tổ chức</span>
                                <span className="font-extrabold text-indigo-900">Kiểm tra tập trung toàn trường</span>
                              </div>
                            </div>
                          </div>

                          {/* General Notes / Instructions */}
                          {exam.notes && (
                            <div className="rounded-xl bg-amber-50/70 border border-amber-200/80 p-3 text-xs text-amber-950 leading-relaxed">
                              <div className="font-extrabold text-amber-900 mb-0.5 flex items-center gap-1.5">
                                <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                                <span>Lưu ý chung từ Nhà trường & GVCN:</span>
                              </div>
                              <p className="whitespace-pre-line">{exam.notes}</p>
                            </div>
                          )}

                          {/* Image or PDF Schedule Preview */}
                          {exam.attachments && exam.attachments.length > 0 && (
                            <div className="space-y-2 pt-1">
                              <div className="text-xs font-black text-slate-800 flex items-center justify-between">
                                <span className="flex items-center gap-1.5">
                                  <Paperclip className="h-3.5 w-3.5 text-indigo-600" />
                                  <span>Bảng Lịch Thi & Đề Cương Ôn Tập ({exam.attachments.length} tệp)</span>
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                                {exam.attachments.map((f) => {
                                  const isImg = f.type === 'image' || (f.type as string)?.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(f.name);
                                  const isPdf = f.type === 'pdf' || (f.type as string) === 'application/pdf' || /\.pdf$/i.test(f.name);

                                  return (
                                    <div
                                      key={f.id}
                                      className="rounded-xl border border-indigo-100 bg-white p-2.5 flex items-center justify-between gap-2 shadow-2xs hover:border-indigo-300 transition-colors"
                                    >
                                      <div
                                        onClick={() => setPreviewFile(f)}
                                        className="flex items-center gap-2 min-w-0 cursor-pointer flex-1"
                                      >
                                        {isImg ? (
                                          <div className="h-9 w-9 rounded-lg bg-indigo-50 flex items-center justify-center overflow-hidden border border-indigo-200 shrink-0">
                                            {f.url ? (
                                              <img src={f.url} alt={f.name} className="h-full w-full object-cover" />
                                            ) : (
                                              <Eye className="h-4 w-4 text-indigo-600" />
                                            )}
                                          </div>
                                        ) : isPdf ? (
                                          <div className="h-9 w-9 rounded-lg bg-rose-50 flex items-center justify-center border border-rose-200 text-rose-600 font-black text-[10px] shrink-0">
                                            PDF
                                          </div>
                                        ) : (
                                          <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                                            <Paperclip className="h-4 w-4" />
                                          </div>
                                        )}

                                        <div className="min-w-0 flex-1">
                                          <p className="text-xs font-bold text-slate-900 truncate">{f.name}</p>
                                          <p className="text-[10px] text-indigo-600 font-semibold">Nhấn để xem chi tiết</p>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() => setPreviewFile(f)}
                                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                          title="Xem trước phóng to"
                                        >
                                          <Eye className="h-3.5 w-3.5" />
                                        </button>
                                        {f.url && (
                                          <a
                                            href={f.url}
                                            download={f.name}
                                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                                            title="Tải về máy"
                                          >
                                            <Download className="h-3.5 w-3.5" />
                                          </a>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  // Regular Exam Card
                  const isHighlighted = highlightedExamId === exam.id;
                  return (
                    <div
                      key={exam.id}
                      id={`exam-card-${exam.id}`}
                      className={`rounded-2xl border bg-white p-4 shadow-xs hover:border-blue-300 transition-all flex flex-col justify-between ${
                        isHighlighted
                          ? 'border-blue-600 ring-4 ring-blue-300/60 shadow-lg scale-[1.005]'
                          : exam.pinnedToOverview
                          ? 'border-amber-300 bg-amber-50/20 ring-1 ring-amber-200'
                          : 'border-slate-200'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-base font-black text-slate-900">{localizedSubject}</span>
                            <span className={`rounded-lg px-2 py-0.5 text-xs border ${badge.bg}`}>
                              {badge.label}
                            </span>
                            {formatBadge && (
                              <span className={`rounded-lg px-2 py-0.5 text-xs border ${formatBadge.bg}`}>
                                {formatBadge.label}
                              </span>
                            )}
                            {exam.pinnedToOverview && (
                              <span className="rounded bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.2 flex items-center gap-1">
                                <Pin className="h-2.5 w-2.5" /> Ghim
                              </span>
                            )}
                            {exam.pinnedToFeed && (
                              <span className="rounded bg-blue-100 border border-blue-200 text-blue-800 text-[10px] font-bold px-1.5 py-0.2 flex items-center gap-1">
                                <Pin className="h-2.5 w-2.5 fill-blue-700 text-blue-700" /> Bảng tin
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            {/* Share button */}
                            <button
                              type="button"
                              onClick={() =>
                                handleShare(
                                  `[LỊCH KIỂM TRA - ${localizedSubject} (${badge.label})]`,
                                  `Môn: ${localizedSubject}\nHình thức: ${exam.format || 'Trắc nghiệm'}\nNgày thi: ${exam.date} (${exam.period})\nThời lượng: ${exam.duration}\nPhạm vi ôn tập: ${exam.scope || 'Toàn bộ bài học'}\nGhi chú: ${exam.notes || 'Không'}`
                                )
                              }
                              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                              title="Sao chép nội dung để chia sẻ"
                            >
                              <Share2 className="h-3.5 w-3.5" />
                            </button>

                            {/* Pin to Feed button (Teacher or Author Officer) */}
                            {canPinExamToFeed && (
                              <button
                                type="button"
                                onClick={() => handleTogglePinExamToFeed(exam.id)}
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                                  exam.pinnedToFeed
                                    ? 'bg-amber-500 text-white border-amber-500 hover:bg-amber-600'
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-amber-400 hover:text-amber-600 hover:bg-amber-50/50'
                                }`}
                                title={exam.pinnedToFeed ? 'Bỏ ghim khỏi Bảng tin lớp' : 'Ghim bài kiểm tra lên Bảng tin lớp'}
                              >
                                <Pin className={`h-3 w-3 ${exam.pinnedToFeed ? 'fill-current' : ''}`} />
                                <span className="hidden sm:inline">{exam.pinnedToFeed ? 'Đã ghim' : 'Ghim Bảng tin'}</span>
                              </button>
                            )}

                            {/* Pin button (Teacher or Author Officer) */}
                            {canPinExam && (
                              <button
                                type="button"
                                onClick={() => handleTogglePinExam(exam.id)}
                                className={`rounded-lg p-1 transition-colors cursor-pointer ${
                                  exam.pinnedToOverview
                                    ? 'text-amber-600 hover:bg-amber-100'
                                    : 'text-slate-400 hover:bg-slate-100 hover:text-amber-600'
                                }`}
                                title={exam.pinnedToOverview ? 'Bỏ ghim' : 'Ghim lên đầu'}
                              >
                                <Pin className="h-3.5 w-3.5" />
                              </button>
                            )}

                            {/* Edit button */}
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => handleOpenEditExam(exam)}
                                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-blue-600 cursor-pointer"
                                title="Sửa"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                            )}

                            {/* Delete button */}
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => handleDeleteExam(exam)}
                                className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                                title="Xóa"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Metadata Grid */}
                        <div className="grid grid-cols-3 gap-2 rounded-xl p-2.5 text-xs mb-2.5 border bg-slate-50 border-slate-100 text-slate-700">
                          <div>
                            <span className="font-bold text-slate-500 block text-[10px]">Ngày kiểm tra</span>
                            <span className="font-semibold text-slate-900">{exam.date}</span>
                          </div>
                          <div>
                            <span className="font-bold text-slate-500 block text-[10px]">Tiết kiểm tra</span>
                            <span className="font-semibold text-slate-900">{typeof exam.period === 'number' ? `Tiết ${exam.period}` : exam.period}</span>
                          </div>
                          <div>
                            <span className="font-bold text-slate-500 block text-[10px]">Thời lượng</span>
                            <span className="font-semibold text-slate-900">{exam.duration}</span>
                          </div>
                        </div>

                        {exam.scope && (
                          <div className="text-xs text-slate-800 leading-relaxed mb-2">
                            <span className="font-bold text-blue-900">Phạm vi ôn tập: </span>
                            <span>{exam.scope}</span>
                          </div>
                        )}

                        {exam.notes && (
                          <div className="text-xs text-slate-600 leading-relaxed mb-2">
                            <span className="font-bold text-slate-700">Dặn dò của GV: </span>
                            <span>{exam.notes}</span>
                          </div>
                        )}

                        {exam.attachments && exam.attachments.length > 0 && (
                          <div className="space-y-1.5 mt-2">
                            <div className="text-[11px] font-bold text-slate-500">Đề cương / File ôn tập:</div>
                            <div className="flex flex-wrap gap-1.5">
                              {exam.attachments.map((f) => (
                                <div key={f.id} className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setPreviewFile(f)}
                                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors cursor-pointer"
                                  >
                                    <Eye className="h-3 w-3 text-blue-600" />
                                    <span className="truncate max-w-[140px]">{f.name}</span>
                                  </button>
                                  {f.url && (
                                    <a
                                      href={f.url}
                                      download={f.name}
                                      className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                                      title="Tải về"
                                    >
                                      <Download className="h-3 w-3" />
                                    </a>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Exams Pagination */}
            {filteredExams.length > 0 && (
              <div className="mt-4">
                <Pagination
                  currentPage={examPage}
                  totalItems={filteredExams.length}
                  pageSize={examPageSize}
                  onPageChange={(page) => setExamPage(page)}
                  onPageSizeChange={(size) => {
                    setExamPageSize(size);
                    setExamPage(1);
                  }}
                  pageSizeOptions={[6, 10, 20, 50]}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* 1. Modal: Tạo Báo Bài Theo Ngày Học (Hỗ trợ thêm nhiều môn trên cùng một ngày) */}
      {isAddDayModalOpen && (
        <ModalLayout
          isOpen={true}
          onClose={() => {
            if (!isSavingAssignment) setIsAddDayModalOpen(false);
          }}
          title="Tạo Báo Bài Theo Ngày Học"
          subtitle="Tổ chức danh sách nhiệm vụ học tập và nội dung chuẩn bị cho ngày học"
          icon={ClipboardList}
          maxWidthClass="max-w-xl"
          footer={
            <div className="flex items-center justify-between w-full">
              <button
                type="button"
                onClick={handleAddSubjectRow}
                className="inline-flex items-center gap-1.5 rounded-2xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Thêm môn học</span>
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isSavingAssignment}
                  onClick={() => setIsAddDayModalOpen(false)}
                  className="rounded-2xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={isSavingAssignment}
                  onClick={handleSaveDayAssignmentsBatch}
                  className="rounded-2xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSavingAssignment ? (
                    <>
                      <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <span>Lưu báo bài</span>
                  )}
                </button>
              </div>
            </div>
          }
        >
          <form onSubmit={handleSaveDayAssignmentsBatch} className="space-y-4">
            {/* Error banner if save fails */}
            {assignmentErrorMessage && (
              <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3 text-xs font-medium text-rose-800 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                <div>
                  <div className="font-bold">Lưu không thành công</div>
                  <div>{assignmentErrorMessage}</div>
                </div>
              </div>
            )}

            {/* Chọn ngày học & Kế thừa thiết lập chung */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Ngày học <span className="text-rose-500">*</span>
              </label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <input
                  type="date"
                  value={modalDate}
                  onChange={(e) => handleModalDateChange(e.target.value)}
                  className="w-full sm:w-56 rounded-2xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 outline-hidden bg-white"
                />
                <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-2 rounded-xl">
                  {formatVietnamDateTitle(modalDate)}
                </span>
              </div>
            </div>

            {/* Thiết lập chung một lần cho cả ngày (Màu nền, màu chữ, trạng thái ghim) */}
            <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-blue-950 flex items-center gap-1.5">
                  <Palette className="h-3.5 w-3.5 text-blue-600" />
                  <span>Thiết lập chung cho cả ngày học</span>
                </span>
                <span className="text-[10px] text-blue-700 font-semibold bg-blue-100/80 px-2 py-0.5 rounded-md">
                  Áp dụng chung cho tất cả các môn
                </span>
              </div>

              {/* Ghim ngày */}
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                <input
                  type="checkbox"
                  checked={modalDayIsPinned}
                  onChange={(e) => setModalDayIsPinned(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 h-4 w-4"
                />
                <span className="flex items-center gap-1.5">
                  <Pin className={`h-3.5 w-3.5 ${modalDayIsPinned ? 'text-amber-600 fill-amber-600' : 'text-slate-400'}`} />
                  <span>Ghim toàn bộ báo bài ngày này lên Bảng tin lớp</span>
                </span>
              </label>

              {/* Màu nền & Màu chữ cả ngày */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Màu nền cho cả ngày:</label>
                  <select
                    value={modalDayBgColor}
                    onChange={(e) => setModalDayBgColor(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-hidden"
                  >
                    {ASSIGNMENT_BG_COLORS.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Màu chữ cho cả ngày:</label>
                  <select
                    value={modalDayTextColor}
                    onChange={(e) => setModalDayTextColor(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-hidden"
                  >
                    {ASSIGNMENT_TEXT_COLORS.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Danh sách các môn học trong ngày */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">
                  Danh sách môn học & nội dung cần chuẩn bị
                </label>
                <span className="text-[11px] text-slate-400">
                  {modalSubjectRows.length} môn
                </span>
              </div>

              {modalSubjectRows.map((row, idx) => (
                <div
                  key={row.tempId}
                  className="p-3 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2 relative"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-slate-500">
                      Môn #{idx + 1}
                    </span>
                    {modalSubjectRows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSubjectRow(row.tempId)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors"
                        title="Xóa môn này khỏi ngày"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="sm:col-span-1">
                      <select
                        value={row.subject}
                        onChange={(e) => {
                          const val = e.target.value;
                          setModalSubjectRows(prev =>
                            prev.map(r => (r.tempId === row.tempId ? { ...r, subject: val } : r))
                          );
                        }}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-900 outline-hidden bg-white"
                      >
                        {subjects.map(s => (
                          <option key={s.id} value={s.name}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        value={row.content}
                        onChange={(e) => {
                          const val = e.target.value;
                          setModalSubjectRows(prev =>
                            prev.map(r => (r.tempId === row.tempId ? { ...r, content: val } : r))
                          );
                        }}
                        placeholder="Nội dung cần chuẩn bị (VD: Làm bài tập 1, 2 trang 45; Xem trước bài mới...)"
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 outline-hidden bg-white"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddSubjectRow}
                className="w-full py-2.5 rounded-2xl border-2 border-dashed border-slate-200 hover:border-blue-300 text-xs font-bold text-blue-600 hover:bg-blue-50/50 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ Thêm môn học tiếp theo vào ngày này</span>
              </button>
            </div>
          </form>
        </ModalLayout>
      )}

      {/* 2. Modal: Chỉnh Sửa Môn Báo Bài */}
      {isEditSingleModalOpen && modalSingleItem && (
        <ModalLayout
          isOpen={true}
          onClose={() => {
            if (!isSavingAssignment) setIsEditSingleModalOpen(false);
          }}
          title="Chỉnh Sửa Môn Báo Bài"
          subtitle="Cập nhật môn học hoặc nội dung chuẩn bị"
          icon={Edit2}
          maxWidthClass="max-w-lg"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <button
                type="button"
                disabled={isSavingAssignment}
                onClick={() => setIsEditSingleModalOpen(false)}
                className="rounded-2xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isSavingAssignment}
                onClick={handleSaveSingleSubject}
                className="rounded-2xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSavingAssignment ? (
                  <>
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <span>Lưu thay đổi</span>
                )}
              </button>
            </div>
          }
        >
          <form onSubmit={handleSaveSingleSubject} className="space-y-3.5">
            {assignmentErrorMessage && (
              <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3 text-xs font-medium text-rose-800 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                <div>{assignmentErrorMessage}</div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Ngày học</label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <input
                  type="date"
                  value={modalSingleItem.date}
                  onChange={(e) => setModalSingleItem({ ...modalSingleItem, date: e.target.value })}
                  className="w-full sm:w-56 rounded-2xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 outline-hidden bg-white"
                />
                <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl">
                  {formatVietnamDateTitle(modalSingleItem.date)}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Môn học</label>
              <select
                value={modalSingleItem.subject}
                onChange={(e) => setModalSingleItem({ ...modalSingleItem, subject: e.target.value })}
                className="w-full rounded-2xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 outline-hidden bg-white"
              >
                {subjects.map(s => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nội dung cần chuẩn bị</label>
              <textarea
                value={modalSingleItem.content}
                onChange={(e) => setModalSingleItem({ ...modalSingleItem, content: e.target.value })}
                rows={3}
                placeholder="VD: Kiểm tra thường xuyên, Xem trước bài mới..."
                className="w-full rounded-2xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 outline-hidden bg-white leading-relaxed"
              />
            </div>

            {/* Ghim bài */}
            <div className="flex items-center gap-2 pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                <input
                  type="checkbox"
                  checked={Boolean(modalSingleItem.isPinned)}
                  onChange={(e) => setModalSingleItem({ ...modalSingleItem, isPinned: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <span className="flex items-center gap-1.5">
                  <Pin className={`h-3.5 w-3.5 ${modalSingleItem.isPinned ? 'text-amber-600 fill-amber-600' : 'text-slate-400'}`} />
                  <span>Ghim toàn bộ báo bài ngày này lên Bảng tin & Tổng quan</span>
                </span>
              </label>
            </div>

            {/* Chọn màu nền */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Màu nền nổi bật</label>
              <div className="flex flex-wrap items-center gap-2">
                {ASSIGNMENT_BG_COLORS.map(c => {
                  const isSelected = (modalSingleItem.bgColor || 'default') === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setModalSingleItem({ ...modalSingleItem, bgColor: c.id })}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        isSelected ? 'ring-2 ring-blue-600 border-blue-400 shadow-2xs scale-105' : 'border-slate-300 hover:border-slate-400'
                      }`}
                      style={{ backgroundColor: c.hex }}
                    >
                      <span className="h-2 w-2 rounded-full border border-slate-400" style={{ backgroundColor: c.hex }} />
                      <span className="text-slate-800">{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Chọn màu chữ */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Màu chữ</label>
              <div className="flex flex-wrap items-center gap-2">
                {ASSIGNMENT_TEXT_COLORS.map(c => {
                  const isSelected = (modalSingleItem.textColor || 'default') === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setModalSingleItem({ ...modalSingleItem, textColor: c.id })}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border bg-white transition-all cursor-pointer ${
                        isSelected ? 'ring-2 ring-blue-600 border-blue-400 shadow-2xs scale-105' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.hex }} />
                      <span className={c.textClass}>{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </form>
        </ModalLayout>
      )}

      {/* 3. Modal: Đổi Ngày Báo Bài Cho Cả Nhóm */}
      {isShiftDateModalOpen && shiftDateTarget && (
        <ModalLayout
          isOpen={true}
          onClose={() => {
            if (!isSavingAssignment) setIsShiftDateModalOpen(false);
          }}
          title="Đổi Ngày Báo Bài"
          subtitle="Chuyển toàn bộ các môn học của ngày này sang ngày học mới"
          icon={Calendar}
          maxWidthClass="max-w-md"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <button
                type="button"
                disabled={isSavingAssignment}
                onClick={() => setIsShiftDateModalOpen(false)}
                className="rounded-2xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isSavingAssignment}
                onClick={handleConfirmShiftDate}
                className="rounded-2xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSavingAssignment ? (
                  <>
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <span>Xác nhận đổi ngày</span>
                )}
              </button>
            </div>
          }
        >
          <form onSubmit={handleConfirmShiftDate} className="space-y-3.5">
            {assignmentErrorMessage && (
              <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3 text-xs font-medium text-rose-800 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                <div>{assignmentErrorMessage}</div>
              </div>
            )}

            <div className="text-xs text-slate-600">
              Đang chuyển <span className="font-bold text-slate-800">{shiftDateTarget.ids.length} môn học</span> từ{' '}
              <span className="font-bold text-blue-700">{shiftDateTarget.groupTitle}</span> sang:
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Ngày học mới</label>
              <input
                type="date"
                value={shiftDateTarget.newDate}
                onChange={(e) => setShiftDateTarget({ ...shiftDateTarget, newDate: e.target.value })}
                className="w-full rounded-2xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 outline-hidden bg-white"
              />
              <div className="mt-2 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-2 rounded-xl">
                {formatVietnamDateTitle(shiftDateTarget.newDate)}
              </div>
            </div>
          </form>
        </ModalLayout>
      )}

      {/* Exam Add/Edit Modal */}
      {isExamModalOpen && (
        <ModalLayout
          isOpen={true}
          onClose={() => setIsExamModalOpen(false)}
          title={
            editingExam.isCentralized
              ? (editingExam.id ? 'Chỉnh sửa Lịch kiểm tra tập trung' : 'CÔNG BỐ LỊCH KIỂM TRA TẬP TRUNG')
              : (editingExam.id ? 'Chỉnh sửa Lịch kiểm tra môn học' : 'CÔNG BỐ LỊCH KIỂM TRA MÔN HỌC')
          }
          subtitle={
            editingExam.isCentralized
              ? 'Kế hoạch kiểm tra đánh giá định kỳ toàn trường / toàn khối'
              : 'Thông báo kiểm tra thường xuyên & 1 tiết tại lớp'
          }
          icon={editingExam.isCentralized ? Building2 : FileCheck2}
          maxWidthClass="max-w-xl"
          footer={
            <div className="flex items-center justify-between w-full">
              <div>
                {editingExam.isCentralized && editingExam.attachments && editingExam.attachments.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (editingExam.attachments && editingExam.attachments[0]) {
                        setPreviewFile(editingExam.attachments[0]);
                      }
                    }}
                    className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Xem trước lịch thi</span>
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsExamModalOpen(false)}
                  className="rounded-2xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSaveExam}
                  className={`rounded-2xl px-5 py-2 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer ${
                    editingExam.isCentralized ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {editingExam.id ? 'Cập nhật' : (editingExam.isCentralized ? 'Công bố Lịch kiểm tra tập trung' : 'Công bố Lịch kiểm tra')}
                </button>
              </div>
            </div>
          }
        >
          <form onSubmit={handleSaveExam} className="space-y-4">
            {/* Exam Scope Toggle in Modal */}
            <div className="p-1 bg-slate-100 rounded-xl grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => {
                  setEditingExam({
                    ...editingExam,
                    isCentralized: false,
                    examType: editingExam.examType === 'midterm' || editingExam.examType === 'final' ? '15min' : (editingExam.examType || '15min'),
                    duration: editingExam.duration || '15 phút',
                    subject: subjects[0]?.name || 'Toán học'
                  });
                }}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold text-center transition-all cursor-pointer ${
                  !editingExam.isCentralized
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                KT Thường xuyên / Tại lớp
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingExam({
                    ...editingExam,
                    isCentralized: true,
                    examType: ['midterm', 'final'].includes(editingExam.examType || '') ? editingExam.examType : 'midterm',
                    examTitle: editingExam.examTitle || 'Lịch kiểm tra tập trung Giữa Học kỳ I - Năm học 2025-2026',
                    announcementTitle: editingExam.announcementTitle || 'Thông báo Lịch kiểm tra đánh giá tập trung',
                    semester: editingExam.semester || 'HK1',
                    startDate: editingExam.startDate || editingExam.date || new Date().toISOString().split('T')[0],
                    endDate: editingExam.endDate || new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
                    duration: '60 - 90 phút/môn',
                    subject: 'Toàn khối / Toàn trường'
                  });
                }}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold text-center transition-all cursor-pointer ${
                  editingExam.isCentralized
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                KT Tập trung (Giữa kỳ / Cuối kỳ)
              </button>
            </div>

            {/* ========================================================================= */}
            {/* FORM 1: KIỂM TRA TẬP TRUNG (GIỮA KỲ / CUỐI KỲ)                             */}
            {/* ========================================================================= */}
            {editingExam.isCentralized ? (
              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tên kỳ kiểm tra <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingExam.examTitle || ''}
                    onChange={(e) => setEditingExam({ ...editingExam, examTitle: e.target.value })}
                    placeholder="VD: Lịch kiểm tra tập trung Giữa Học kỳ I - Năm học 2025-2026"
                    className="w-full rounded-2xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 outline-hidden font-semibold focus:border-indigo-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Học kỳ</label>
                    <select
                      value={editingExam.semester || 'HK1'}
                      onChange={(e) => setEditingExam({ ...editingExam, semester: e.target.value as any })}
                      className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-xs text-slate-900 outline-hidden bg-white"
                    >
                      <option value="HK1">Học kỳ I</option>
                      <option value="HK2">Học kỳ II</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Loại kỳ kiểm tra</label>
                    <select
                      value={editingExam.examType || 'midterm'}
                      onChange={(e) => setEditingExam({ ...editingExam, examType: e.target.value as any })}
                      className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-xs text-slate-900 outline-hidden bg-white"
                    >
                      <option value="midterm">Kiểm tra Giữa Học kỳ</option>
                      <option value="final">Kiểm tra Cuối Học kỳ</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Từ ngày <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={editingExam.startDate || editingExam.date || ''}
                      onChange={(e) => setEditingExam({ ...editingExam, startDate: e.target.value, date: e.target.value })}
                      className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-xs text-slate-900 outline-hidden"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Đến ngày <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={editingExam.endDate || editingExam.startDate || editingExam.date || ''}
                      onChange={(e) => setEditingExam({ ...editingExam, endDate: e.target.value })}
                      className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-xs text-slate-900 outline-hidden"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tiêu đề thông báo</label>
                  <input
                    type="text"
                    value={editingExam.announcementTitle || ''}
                    onChange={(e) => setEditingExam({ ...editingExam, announcementTitle: e.target.value })}
                    placeholder="VD: Thông báo Lịch kiểm tra và hướng dẫn ôn tập kiểm tra giữa kỳ"
                    className="w-full rounded-2xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nội dung / Lưu ý chung của Nhà trường & GVCN
                  </label>
                  <textarea
                    value={editingExam.notes || ''}
                    onChange={(e) => setEditingExam({ ...editingExam, notes: e.target.value })}
                    placeholder="VD: Học sinh có mặt tại phòng thi trước 15 phút, trang phục nghiêm túc, chuẩn bị đầy đủ máy tính, bút chì, thước kẻ..."
                    rows={3}
                    className="w-full rounded-2xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 outline-hidden leading-relaxed"
                  />
                </div>

                {/* Upload Official Schedule (Images/PDF) */}
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-3.5 space-y-2.5">
                  <div>
                    <label className="block text-xs font-black text-indigo-900 mb-0.5 flex items-center gap-1.5">
                      <Paperclip className="h-4 w-4 text-indigo-600" />
                      <span>Đính kèm Bảng Lịch thi chính thức (Ảnh JPG/PNG hoặc File PDF) & Đề cương</span>
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Tải lên file ảnh chụp lịch thi hoặc tài liệu PDF để học sinh và phụ huynh xem phóng to trực tiếp
                    </p>
                  </div>

                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.pptx,.txt"
                    onChange={(e) => handleFileUpload(e, 'exam')}
                    className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
                  />

                  {editingExam.attachments && editingExam.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {editingExam.attachments.map((f, idx) => (
                        <span
                          key={f.id || idx}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-white px-2.5 py-1.5 text-xs text-slate-700 border border-indigo-200 shadow-2xs"
                        >
                          <Paperclip className="h-3.5 w-3.5 text-indigo-600" />
                          <span className="truncate max-w-[150px] font-medium">{f.name}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setEditingExam({
                                ...editingExam,
                                attachments: editingExam.attachments?.filter((_, i) => i !== idx)
                              })
                            }
                            className="text-slate-400 hover:text-rose-500 cursor-pointer"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center pt-2">
                  <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editingExam.pinnedToOverview || false}
                      onChange={(e) => setEditingExam({ ...editingExam, pinnedToOverview: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <Pin className="h-3.5 w-3.5 text-amber-500" />
                      Ghim lên trang Tổng quan lớp
                    </span>
                  </label>
                </div>

                <div className="flex items-center pt-1">
                  <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editingExam.pinnedToFeed || false}
                      onChange={(e) => setEditingExam({ ...editingExam, pinnedToFeed: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <Pin className="h-3.5 w-3.5 text-blue-500" />
                      Ghim lên Bảng tin lớp
                    </span>
                  </label>
                </div>
              </div>
            ) : (
              /* ========================================================================= */
              /* FORM 2: KIỂM TRA THƯỜNG XUYÊN / TẠI LỚP (MÔN HỌC CỤ THỂ)                   */
              /* ========================================================================= */
              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Môn kiểm tra <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={editingExam.subject || subjects[0]?.name || 'Toán học'}
                    onChange={(e) => setEditingExam({ ...editingExam, subject: e.target.value })}
                    className="w-full rounded-2xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 outline-hidden bg-white font-semibold"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.name}>
                        {getVietnameseSubjectFullName(s.name)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Hình thức</label>
                    <select
                      value={editingExam.format || 'Trắc nghiệm'}
                      onChange={(e) => setEditingExam({ ...editingExam, format: e.target.value })}
                      className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-xs text-slate-900 outline-hidden bg-white"
                    >
                      <option value="Trắc nghiệm">Trắc nghiệm</option>
                      <option value="Tự luận">Tự luận</option>
                      <option value="Kết hợp (Trắc nghiệm + Tự luận)">Kết hợp (TN + TL)</option>
                      <option value="Thực hành / Báo cáo">Thực hành / Báo cáo</option>
                      <option value="Vấn đáp">Vấn đáp</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Ngày kiểm tra <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={editingExam.date || ''}
                      onChange={(e) => setEditingExam({ ...editingExam, date: e.target.value })}
                      className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-xs text-slate-900 outline-hidden"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Tiết kiểm tra</label>
                    <input
                      type="text"
                      value={editingExam.period || 'Tiết 1'}
                      onChange={(e) => setEditingExam({ ...editingExam, period: e.target.value })}
                      placeholder="VD: Tiết 2, Tiết 3-4"
                      className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-xs text-slate-900 outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Thời lượng làm bài</label>
                    <div className="flex gap-1.5">
                      <select
                        value={['15 phút', '45 phút', '60 phút', '90 phút'].includes(editingExam.duration || '') ? editingExam.duration : 'custom'}
                        onChange={(e) => {
                          if (e.target.value === 'custom') {
                            setEditingExam({
                              ...editingExam,
                              duration: ['15 phút', '45 phút', '60 phút', '90 phút'].includes(editingExam.duration || '') ? '' : (editingExam.duration || '')
                            });
                          } else {
                            setEditingExam({ ...editingExam, duration: e.target.value });
                          }
                        }}
                        className="rounded-2xl border border-slate-300 px-3 py-2 text-xs text-slate-900 outline-hidden bg-white shrink-0"
                      >
                        <option value="15 phút">15 phút</option>
                        <option value="45 phút">45 phút</option>
                        <option value="60 phút">60 phút</option>
                        <option value="90 phút">90 phút</option>
                        <option value="custom">Khác</option>
                      </select>
                      <input
                        type="text"
                        value={editingExam.duration ?? ''}
                        onChange={(e) => setEditingExam({ ...editingExam, duration: e.target.value })}
                        placeholder="Thời lượng (VD: 20 phút, 30 phút, 1 tiết...)"
                        className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-xs text-slate-900 outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="flex items-center pt-5">
                    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={editingExam.pinnedToOverview || false}
                        onChange={(e) => setEditingExam({ ...editingExam, pinnedToOverview: e.target.checked })}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                        <Pin className="h-3.5 w-3.5 text-amber-500" />
                        Ghim lên trang Tổng quan lớp
                      </span>
                    </label>
                  </div>

                  <div className="flex items-center pt-2">
                    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={editingExam.pinnedToFeed || false}
                        onChange={(e) => setEditingExam({ ...editingExam, pinnedToFeed: e.target.checked })}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                        <Pin className="h-3.5 w-3.5 text-blue-500" />
                        Ghim lên Bảng tin lớp
                      </span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phạm vi kiến thức ôn tập</label>
                  <textarea
                    value={editingExam.scope || ''}
                    onChange={(e) => setEditingExam({ ...editingExam, scope: e.target.value })}
                    placeholder="VD: Chương 1, 2 và các dạng bài tập trọng tâm..."
                    rows={2}
                    className="w-full rounded-2xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú dặn dò của GV</label>
                  <textarea
                    value={editingExam.notes || ''}
                    onChange={(e) => setEditingExam({ ...editingExam, notes: e.target.value })}
                    placeholder="VD: Học sinh chuẩn bị máy tính bỏ túi Casio, bút chì 2B, thước kẻ..."
                    rows={2}
                    className="w-full rounded-2xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 outline-hidden"
                  />
                </div>

                {/* Exam Attachments */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Đính kèm đề cương / tài liệu ôn tập</label>
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.pptx,.txt"
                    onChange={(e) => handleFileUpload(e, 'exam')}
                    className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                  />
                  {editingExam.attachments && editingExam.attachments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {editingExam.attachments.map((f, idx) => (
                        <span
                          key={f.id || idx}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-700 border border-slate-200"
                        >
                          <Paperclip className="h-3 w-3 text-slate-500" />
                          <span className="truncate max-w-[120px]">{f.name}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setEditingExam({
                                ...editingExam,
                                attachments: editingExam.attachments?.filter((_, i) => i !== idx)
                              })
                            }
                            className="text-slate-400 hover:text-rose-500 cursor-pointer"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </form>
        </ModalLayout>
      )}

      {/* File Preview Modal */}
      {previewFile && (
        <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
      )}

      {/* Confirmation Modal for Delete Assignment / Exam */}
      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        title={
          deleteTarget?.type === 'day_assignments'
            ? 'Xác nhận xóa toàn bộ báo bài'
            : deleteTarget?.type === 'assignment'
            ? 'Xác nhận xóa báo bài'
            : 'Xác nhận xóa lịch kiểm tra'
        }
        itemName={deleteTarget?.title}
        message={
          deleteTarget?.type === 'day_assignments'
            ? `Bạn có chắc chắn muốn xóa toàn bộ báo bài của ngày ${deleteTarget?.title}? Tất cả các môn học trong ngày này sẽ bị xóa khỏi danh sách lớp và không thể phục hồi.`
            : deleteTarget?.type === 'assignment'
            ? 'Bạn có chắc chắn muốn xóa mục báo bài này khỏi danh sách lớp? Dữ liệu đã xóa sẽ không thể phục hồi.'
            : 'Bạn có chắc chắn muốn xóa lịch kiểm tra này? Học viên và phụ huynh sẽ không còn nhìn thấy lịch này trên bảng tin và thời khóa biểu.'
        }
        confirmText="Xác nhận xóa"
        cancelText="Hủy bỏ"
        onConfirm={confirmDeleteTarget}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
};
