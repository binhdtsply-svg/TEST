/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  User,
  Phone,
  MapPin,
  Calendar,
  Heart,
  Award,
  BookOpen,
  Compass,
  Lock,
  Edit2,
  TreePine,
  ExternalLink,
  Printer,
  Target,
  Plus,
  MessageSquare,
  CheckCircle2,
  Clock,
  Save,
  AlertTriangle,
  Eye,
  EyeOff,
  ClipboardList,
  Sparkles,
  Cpu,
  Layers,
  GraduationCap,
  Lightbulb,
  Trash2,
  FileText,
  HeartHandshake
} from 'lucide-react';
import { Student, PersonalGoal, AcademicPeriod, StudentSurveyResponse, AttentionHistoryEntry, AttentionStatus, ViolationHandlingRecord, GraduationRegistration } from '../../types';
import { getVietnameseSubjectFullName } from '../../utils/subjectHelpers';
import { trainingService } from '../../services/TrainingService';
import { academicService, PERIOD_NAMES } from '../../services/AcademicService';
import { careerService } from '../../services/CareerService';
import { authService } from '../../services/AuthService';
import { classService } from '../../services/ClassService';
import { studentService } from '../../services/StudentService';
import { studentSurveyService } from '../../services/StudentSurveyService';
import { graduationService } from '../../services/GraduationService';
import { conductEvaluationService } from '../../services/ConductEvaluationService';

interface StudentProfileModalProps {
  student: Student | null;
  onClose: () => void;
  onOpenEdit: (student: Student) => void;
  onDeleteStudent?: (student: Student) => void;
}

export const StudentProfileModal: React.FC<StudentProfileModalProps> = ({
  student,
  onClose,
  onOpenEdit,
  onDeleteStudent
}) => {
  const currentUser = authService.getCurrentUser();
  const isTeacher = currentUser.role === 'TEACHER';
  const isStudent = currentUser.role === 'STUDENT';
  const isParent = currentUser.role === 'PARENT';
  const canViewPrivateDetails =
    isTeacher ||
    currentUser.studentId === student?.id ||
    (currentUser.role === 'PARENT' &&
      (currentUser.childStudentId === student?.id || currentUser.studentId === student?.id));

  const [activeTab, setActiveTab] = useState<'info' | 'survey' | 'training' | 'academic' | 'career' | 'goals' | 'graduation' | 'notes' | 'support_history'>('info');
  const [selectedPeriod, setSelectedPeriod] = useState<AcademicPeriod>('midterm_hk1');
  const [personalGoals, setPersonalGoals] = useState<PersonalGoal[]>([]);
  const [survey, setSurvey] = useState<StudentSurveyResponse | null>(null);
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalCategory, setNewGoalCategory] = useState<'Học tập' | 'Rèn luyện' | 'Kỹ năng' | 'Khác'>('Học tập');
  const [feedbackGoalId, setFeedbackGoalId] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState('');

  // Current student with full data
  const [currentStudent, setCurrentStudent] = useState<Student>(() => {
    if (!student) return {} as Student;
    return studentService.getById(student.id) || student;
  });

  // Teacher notes & special attention state
  const [privateNotes, setPrivateNotes] = useState('');
  const [needsAttention, setNeedsAttention] = useState(false);
  const [attentionCategories, setAttentionCategories] = useState<string[]>([]);
  const [attentionText, setAttentionText] = useState('');
  const [attentionStatus, setAttentionStatus] = useState<AttentionStatus>('monitoring');
  const [notesSaveSuccess, setNotesSaveSuccess] = useState<string | null>(null);

  // Support history state
  const [isAddingEpisode, setIsAddingEpisode] = useState(false);
  const [editingEpisodeId, setEditingEpisodeId] = useState<string | null>(null);
  const [epWeekNumber, setEpWeekNumber] = useState<number>(1);
  const [epStartDate, setEpStartDate] = useState<string>('');
  const [epCategories, setEpCategories] = useState<string[]>(['Học tập']);
  const [epSignsAndCauses, setEpSignsAndCauses] = useState<string>('');
  const [epSupportMeasure, setEpSupportMeasure] = useState<string>('');
  const [epTeacherNote, setEpTeacherNote] = useState<string>('');
  const [epWeeklyReview, setEpWeeklyReview] = useState<string>('');
  const [epStatus, setEpStatus] = useState<AttentionStatus>('monitoring');
  const [epNextReviewDate, setEpNextReviewDate] = useState<string>('');
  const [epSaveSuccess, setEpSaveSuccess] = useState<string | null>(null);
  const [epFilter, setEpFilter] = useState<'all' | 'monitoring' | 'supporting' | 'resolved'>('all');

  useEffect(() => {
    if (student) {
      setPersonalGoals(classService.getPersonalGoalsForStudent(student.id));
      const fullStudent = studentService.getById(student.id) || student;
      setCurrentStudent(fullStudent);
      setPrivateNotes(fullStudent.privateTeacherNotes || '');
      setNeedsAttention(!!fullStudent.needsSpecialAttention);
      setAttentionCategories(fullStudent.attentionCategories || []);
      setAttentionText(fullStudent.attentionNote || '');
      setAttentionStatus((fullStudent.attentionStatus as any) || 'monitoring');

      const s = studentSurveyService.getByStudent(student.id) || 
        studentSurveyService.getAll().find((item) => item.studentId === student.id);
      setSurvey(s || null);
    }
  }, [student]);

  useEffect(() => {
    const unsubStudent = studentService.subscribe(() => {
      if (student) {
        const fullStudent = studentService.getById(student.id);
        if (fullStudent) {
          setCurrentStudent(fullStudent);
          setPrivateNotes(fullStudent.privateTeacherNotes || '');
          setNeedsAttention(!!fullStudent.needsSpecialAttention);
          setAttentionCategories(fullStudent.attentionCategories || []);
          setAttentionText(fullStudent.attentionNote || '');
          setAttentionStatus((fullStudent.attentionStatus as any) || 'monitoring');
        }
      }
    });
    return unsubStudent;
  }, [student]);

  useEffect(() => {
    const unsub = studentSurveyService.subscribe(() => {
      if (student) {
        const s = studentSurveyService.getByStudent(student.id) || 
          studentSurveyService.getAll().find((item) => item.studentId === student.id);
        setSurvey(s || null);
      }
    });
    return unsub;
  }, [student]);

  const [gradRegVersion, setGradRegVersion] = useState(0);
  const [academicVersion, setAcademicVersion] = useState(0);

  useEffect(() => {
    graduationService.fetchFromServer();
    academicService.syncWithBackendServer().catch(() => {});
    const unsubGrad = graduationService.subscribe(() => {
      setGradRegVersion(v => v + 1);
      if (student) {
        const fullStudent = studentService.getById(student.id);
        if (fullStudent) {
          setCurrentStudent(fullStudent);
        }
      }
    });
    const unsubAcademic = academicService.subscribe(() => {
      setAcademicVersion(v => v + 1);
    });
    return () => {
      unsubGrad();
      unsubAcademic();
    };
  }, [student]);

  // Real violation records of student from StudentService (Top-level Hook call to strictly adhere to Rules of Hooks)
  const studentViolations: ViolationHandlingRecord[] = React.useMemo(() => {
    if (!student) return [];
    return studentService.getStudentViolationRecords(student.id);
  }, [student?.id, currentStudent]);

  if (!student || typeof document === 'undefined') return null;

  const graduationRecord: GraduationRegistration | undefined = graduationService.getByStudentId(student.id) || (currentStudent?.graduationSummary as GraduationRegistration | undefined);
  const tree = trainingService.getStudentTree(student.id);
  const studentTx = trainingService.getTransactionsForStudent(student.id);
  const academicRecord = academicService.getStudentAcademicRecord(student.id, selectedPeriod);
  const careerProfile = careerService.getProfile(student.id);
  const classSettings = classService.getSettings();
  const currentSchoolYear = classSettings.schoolYear || classSettings.academicYear || '2024 - 2025';

  const isPublishedForViewer = isTeacher 
    ? true 
    : isStudent 
    ? !!academicRecord.publishedToStudent 
    : isParent 
    ? !!academicRecord.publishedToParent 
    : false;

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim()) return;

    classService.savePersonalGoal({
      studentId: student.id,
      studentName: student.fullName,
      title: newGoalTitle.trim(),
      target: newGoalTarget.trim() || 'Đạt 100% mục tiêu',
      category: newGoalCategory,
      deadline: 'Hết năm học',
      progress: 10,
      notes: 'Mục tiêu tự cam kết',
      semester: 'HK1',
      status: 'in_progress',
      parentVisible: true
    });

    setPersonalGoals(classService.getPersonalGoalsForStudent(student.id));
    setIsAddingGoal(false);
    setNewGoalTitle('');
    setNewGoalTarget('');
  };

  const handleSendFeedback = (goalId: string) => {
    if (feedbackText.trim()) {
      classService.addTeacherFeedbackToGoal(goalId, feedbackText.trim());
      setPersonalGoals(classService.getPersonalGoalsForStudent(student.id));
      setFeedbackGoalId(null);
      setFeedbackText('');
    }
  };

  const getAttentionStatusBadge = (status: AttentionStatus | undefined) => {
    switch (status) {
      case 'resolved':
      case 'ended':
      case 'stopped':
      case 'stable':
        return {
          label: 'Đã hoàn tất hỗ trợ',
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
          dot: 'bg-emerald-500'
        };
      case 'supporting':
      case 'continued_support':
        return {
          label: 'Đang hỗ trợ',
          bg: 'bg-amber-50 text-amber-800 border-amber-300',
          dot: 'bg-amber-500'
        };
      case 'improving':
        return {
          label: 'Đang hỗ trợ (Có tiến bộ)',
          bg: 'bg-blue-50 text-blue-800 border-blue-300',
          dot: 'bg-blue-500'
        };
      case 'monitoring':
      default:
        return {
          label: 'Đang theo dõi',
          bg: 'bg-rose-50 text-rose-800 border-rose-300',
          dot: 'bg-rose-500'
        };
    }
  };

  const handleQuickTransitionEpisode = (entry: AttentionHistoryEntry, newStatus: AttentionStatus) => {
    studentService.updateSupportHistoryEpisode(student.id, entry.id, {
      status: newStatus,
      endedAt: (newStatus === 'resolved' || newStatus === 'ended' || newStatus === 'stopped')
        ? (entry.endedAt || new Date().toLocaleDateString('vi-VN'))
        : undefined
    });

    const updated = studentService.getById(student.id);
    if (updated) {
      setCurrentStudent(updated);
      setNeedsAttention(!!updated.needsSpecialAttention);
      setAttentionStatus((updated.attentionStatus as any) || 'monitoring');
      setAttentionCategories(updated.attentionCategories || []);
      setAttentionText(updated.attentionNote || '');
    }
  };

  const handleSaveEpisode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!epSupportMeasure.trim() && !epSignsAndCauses.trim() && !epTeacherNote.trim()) {
      return;
    }

    if (editingEpisodeId) {
      studentService.updateSupportHistoryEpisode(student.id, editingEpisodeId, {
        weekNumber: epWeekNumber,
        startDate: epStartDate || undefined,
        categories: epCategories.length > 0 ? epCategories : ['Học tập'],
        signsAndCauses: epSignsAndCauses.trim() || undefined,
        supportMeasure: epSupportMeasure.trim() || undefined,
        teacherNote: epTeacherNote.trim() || undefined,
        weeklyReview: epWeeklyReview.trim() || undefined,
        status: epStatus,
        nextReviewDate: epNextReviewDate || undefined
      });
      setEpSaveSuccess('Cập nhật đợt hỗ trợ thành công!');
    } else {
      studentService.addSupportHistoryEpisode(student.id, {
        weekNumber: epWeekNumber,
        startDate: epStartDate || new Date().toLocaleDateString('vi-VN'),
        schoolYear: currentSchoolYear,
        categories: epCategories.length > 0 ? epCategories : ['Học tập'],
        signsAndCauses: epSignsAndCauses.trim() || undefined,
        supportMeasure: epSupportMeasure.trim() || undefined,
        teacherNote: epTeacherNote.trim() || undefined,
        weeklyReview: epWeeklyReview.trim() || undefined,
        status: epStatus,
        nextReviewDate: epNextReviewDate || undefined,
        recordedBy: currentUser.fullName || 'GVCN'
      });
      setEpSaveSuccess('Thêm đợt hỗ trợ & theo dõi mới thành công!');
    }

    const updated = studentService.getById(student.id);
    if (updated) {
      setCurrentStudent(updated);
      setNeedsAttention(!!updated.needsSpecialAttention);
      setAttentionStatus((updated.attentionStatus as any) || 'monitoring');
      setAttentionCategories(updated.attentionCategories || []);
      setAttentionText(updated.attentionNote || '');
    }

    setTimeout(() => {
      setIsAddingEpisode(false);
      setEditingEpisodeId(null);
      setEpSignsAndCauses('');
      setEpSupportMeasure('');
      setEpTeacherNote('');
      setEpWeeklyReview('');
      setEpNextReviewDate('');
      setEpSaveSuccess(null);
    }, 1200);
  };

  const handleOpenEditEpisode = (entry: AttentionHistoryEntry) => {
    setEditingEpisodeId(entry.id);
    setEpWeekNumber(entry.weekNumber || 1);
    setEpStartDate(entry.startDate || '');
    setEpCategories(entry.categories || ['Học tập']);
    setEpSignsAndCauses(entry.signsAndCauses || '');
    setEpSupportMeasure(entry.supportMeasure || '');
    setEpTeacherNote(entry.teacherNote || '');
    setEpWeeklyReview(entry.weeklyReview || '');
    setEpStatus(entry.status || 'monitoring');
    setEpNextReviewDate(entry.nextReviewDate || '');
    setIsAddingEpisode(true);
  };

  return createPortal(
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 p-2 sm:p-4 md:p-6 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="relative flex flex-col w-full max-w-6xl 2xl:max-w-7xl h-[94vh] max-h-[96vh] rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-200 my-auto">
        {/* Header with Avatar & Basic Info */}
        <div className="relative bg-gradient-to-r from-blue-600 to-indigo-700 p-5 sm:p-6 text-white shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 rounded-full bg-white/20 p-1.5 text-white hover:bg-white/30 backdrop-blur-xs transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <img
              src={student.avatar}
              alt={student.fullName}
              referrerPolicy="no-referrer"
              className="h-20 w-20 rounded-2xl object-cover ring-4 ring-white/30 shadow-md"
            />
            <div className="text-center sm:text-left flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                <span className="rounded-md bg-white/20 px-2 py-0.5 text-xs font-bold backdrop-blur-xs">
                  {student.code}
                </span>
                <span className="rounded-md bg-emerald-400/90 text-slate-900 px-2 py-0.5 text-xs font-bold">
                  Tổ {student.group}
                </span>
                {student.officerRole && (
                  <span className="rounded-md bg-amber-400 text-slate-900 px-2 py-0.5 text-xs font-black">
                    ⭐ {student.officerRole}
                  </span>
                )}
                {(currentStudent.conductRank || student.conductRank) && (
                  <span className="rounded-md bg-white/20 text-white px-2 py-0.5 text-xs font-bold backdrop-blur-xs">
                    Rèn luyện: {currentStudent.conductRank || student.conductRank}
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-black tracking-tight">{student.fullName}</h2>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 text-xs text-blue-100 mt-1">
                <span>{student.gender}</span>
                <span>•</span>
                <span>Sinh ngày: {student.dob}</span>
                <span>•</span>
                <span>Dân tộc: <strong>{student.ethnicity || 'Kinh'}</strong></span>
                {student.isUnionMember && (
                  <>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-white/20 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur-xs">
                      ⭐ Đoàn viên
                    </span>
                  </>
                )}
                {student.phone && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {student.phone}
                    </span>
                  </>
                )}
              </div>
            </div>

            {isTeacher && (
              <div className="flex items-center gap-2 self-center sm:self-start">
                <button
                  type="button"
                  onClick={() => onOpenEdit(student)}
                  className="flex items-center gap-1.5 rounded-xl bg-white/90 px-3.5 py-2 text-xs font-bold text-slate-800 shadow-sm hover:bg-white transition-all cursor-pointer"
                >
                  <Edit2 className="h-3.5 w-3.5 text-blue-600" />
                  <span>Sửa hồ sơ</span>
                </button>
                {onDeleteStudent && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onDeleteStudent(student);
                    }}
                    className="flex items-center gap-1.5 rounded-xl bg-rose-500/90 hover:bg-rose-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition-all cursor-pointer"
                    title="Xóa học sinh khỏi lớp"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Xóa</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Special Attention Banner for Teacher */}
        {isTeacher && (student.needsSpecialAttention || needsAttention) && (
          <div className="mx-4 sm:mx-6 mt-3 sm:mt-4 rounded-2xl border-2 border-rose-300 bg-rose-50/90 p-4 shadow-sm space-y-2.5 animate-fade-in shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-rose-600 text-white font-black text-xs shrink-0">
                  ⚠️
                </span>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-rose-900">
                    HỌC VIÊN CẦN QUAN TÂM ĐẶC BIỆT (GVCN THEO DÕI NỘI BỘ)
                  </h4>
                  <p className="text-[11px] text-rose-700">
                    Thông tin này chỉ hiển thị riêng cho Giáo viên chủ nhiệm để có kế hoạch đồng hành phù hợp.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${
                  (student.attentionStatus || attentionStatus) === 'resolved' || (student.attentionStatus || attentionStatus) === 'ended' || (student.attentionStatus || attentionStatus) === 'stopped'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : (student.attentionStatus || attentionStatus) === 'improving'
                    ? 'bg-blue-100 text-blue-800 border border-blue-300'
                    : 'bg-rose-200 text-rose-900 border border-rose-300'
                }`}>
                  {(student.attentionStatus || attentionStatus) === 'ended' || (student.attentionStatus || attentionStatus) === 'stopped'
                    ? 'Đã ngừng theo dõi (Lưu sử)'
                    : (student.attentionStatus || attentionStatus) === 'resolved'
                    ? 'Đã ổn định'
                    : (student.attentionStatus || attentionStatus) === 'improving'
                    ? 'Đang tiến bộ'
                    : 'Đang theo dõi sát sao'}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('support_history')}
                  className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-rose-700 border border-rose-300 shadow-2xs hover:bg-rose-100 transition-all cursor-pointer"
                >
                  <Clock className="h-3.5 w-3.5 text-rose-600" />
                  <span>Xem Lịch sử hỗ trợ</span>
                </button>
              </div>
            </div>

            {(student.attentionCategories || attentionCategories)?.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] font-bold text-rose-950">Lĩnh vực lưu tâm:</span>
                {(student.attentionCategories || attentionCategories).map(cat => (
                  <span key={cat} className="rounded-lg bg-white px-2 py-0.5 text-xs font-bold text-rose-700 border border-rose-200 shadow-2xs">
                    {cat}
                  </span>
                ))}
              </div>
            )}

            {((student.attentionNote || attentionText) || (student.privateTeacherNotes || privateNotes)) && (
              <div className="rounded-xl bg-white/95 p-3 border border-rose-200 text-xs space-y-1 text-slate-800">
                {(student.attentionNote || attentionText) && (
                  <div>
                    <span className="font-bold text-rose-900">Ghi chú vấn đề / Biện pháp hỗ trợ: </span>
                    <span className="text-slate-700">{student.attentionNote || attentionText}</span>
                  </div>
                )}
                {student.attentionStartedAt && (
                  <div className="text-[10px] text-slate-400">
                    Thời điểm bắt đầu theo dõi: {student.attentionStartedAt}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 sm:px-6 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 gap-1 shrink-0">
          <button
            onClick={() => setActiveTab('info')}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-3 text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'info'
                ? 'border-blue-600 text-blue-600 bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <User className="h-4 w-4" />
            <span>Gia đình & Liên lạc</span>
          </button>

          <button
            onClick={() => setActiveTab('survey')}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-3 text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'survey'
                ? 'border-indigo-600 text-indigo-600 bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <ClipboardList className="h-4 w-4 text-indigo-600" />
            <span>Thông tin từ khảo sát</span>
            {survey && (survey.status === 'SUBMITTED' || survey.status === 'REVIEWED') && (
              <span className="rounded-full bg-indigo-100 px-1.5 py-0.2 text-[9px] font-bold text-indigo-800">
                Đã gửi
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('training')}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-3 text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'training'
                ? 'border-blue-600 text-blue-600 bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <TreePine className="h-4 w-4 text-emerald-600" />
            <span>Rèn luyện & Nguyệt Quế</span>
          </button>

          <button
            onClick={() => setActiveTab('academic')}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-3 text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'academic'
                ? 'border-blue-600 text-blue-600 bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <BookOpen className="h-4 w-4 text-indigo-600" />
            <span>Kết quả học tập</span>
          </button>

          <button
            onClick={() => setActiveTab('goals')}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-3 text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'goals'
                ? 'border-blue-600 text-blue-600 bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Target className="h-4 w-4 text-rose-600" />
            <span>Mục tiêu năm học</span>
          </button>

          <button
            onClick={() => setActiveTab('career')}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-3 text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'career'
                ? 'border-blue-600 text-blue-600 bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Compass className="h-4 w-4 text-amber-600" />
            <span>Hướng nghiệp Holland</span>
          </button>

          <button
            onClick={() => setActiveTab('graduation')}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-3 text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'graduation'
                ? 'border-purple-600 text-purple-600 bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <GraduationCap className="h-4 w-4 text-purple-600" />
            <span>Thi Tốt nghiệp THPT</span>
            {graduationRecord?.status && (
              <span className={`rounded-full px-1.5 py-0.2 text-[9px] font-bold ${
                graduationRecord.status === 'qualified' ? 'bg-emerald-100 text-emerald-800' :
                graduationRecord.status === 'at_risk' ? 'bg-amber-100 text-amber-800' :
                graduationRecord.status === 'unqualified' ? 'bg-rose-100 text-rose-800' :
                'bg-slate-100 text-slate-700'
              }`}>
                {graduationRecord.status === 'qualified' ? 'Đủ ĐK' : graduationRecord.status === 'at_risk' ? 'Cận chuẩn' : graduationRecord.status === 'unqualified' ? 'Chưa đạt' : 'Dự kiến'}
              </span>
            )}
          </button>

          {isTeacher && (
            <button
              onClick={() => setActiveTab('support_history')}
              className={`flex items-center gap-1.5 border-b-2 px-4 py-3 text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeTab === 'support_history'
                  ? 'border-rose-600 text-rose-700 bg-white rounded-t-lg shadow-2xs'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Clock className="h-4 w-4 text-rose-600" />
              <span>Lịch sử hỗ trợ & theo dõi</span>
              {(currentStudent?.attentionHistory?.length || 0) > 0 && (
                <span className="rounded-full bg-rose-100 text-rose-700 px-1.5 py-0.2 text-[10px] font-black">
                  {currentStudent.attentionHistory!.length}
                </span>
              )}
            </button>
          )}

          {isTeacher && (
            <button
              onClick={() => setActiveTab('notes')}
              className={`flex items-center gap-1.5 border-b-2 px-4 py-3 text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeTab === 'notes'
                  ? 'border-rose-600 text-rose-600 bg-white rounded-t-lg shadow-2xs'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Lock className="h-4 w-4 text-rose-600" />
              <span>Ghi chú Bảo mật GVCN</span>
            </button>
          )}
        </div>

        {/* Tab Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-300 hover:scrollbar-thumb-slate-400">
          {/* 1. Family & Contact */}
          {activeTab === 'info' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Thông tin Gia đình & Phụ huynh</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="rounded-xl bg-white p-3.5 border border-slate-200">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <span>👨 Cha:</span>
                      <span className="text-blue-700">
                        {canViewPrivateDetails ? (student.fatherName || 'Chưa cập nhật') : (student.fatherName ? student.fatherName.slice(0, 3) + '••••' : 'Chưa cập nhật')}
                      </span>
                    </div>
                    <div className="text-slate-500 mt-1">
                      Nghề nghiệp: {canViewPrivateDetails ? (student.fatherJob || 'Tự do') : '••••••••'}
                    </div>
                    <div className="text-slate-500 mt-0.5 flex items-center gap-1">
                      <Phone className="h-3 w-3 text-slate-400" />
                      <span>{canViewPrivateDetails ? (student.fatherPhone || 'Chưa có SĐT') : '•••••••••• (Bảo mật)'}</span>
                    </div>
                  </div>

                  <div className="rounded-xl bg-white p-3.5 border border-slate-200">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <span>👩 Mẹ:</span>
                      <span className="text-blue-700">
                        {canViewPrivateDetails ? (student.motherName || 'Chưa cập nhật') : (student.motherName ? student.motherName.slice(0, 3) + '••••' : 'Chưa cập nhật')}
                      </span>
                    </div>
                    <div className="text-slate-500 mt-1">
                      Nghề nghiệp: {canViewPrivateDetails ? (student.motherJob || 'Tự do') : '••••••••'}
                    </div>
                    <div className="text-slate-500 mt-0.5 flex items-center gap-1">
                      <Phone className="h-3 w-3 text-slate-400" />
                      <span>{canViewPrivateDetails ? (student.motherPhone || 'Chưa có SĐT') : '•••••••••• (Bảo mật)'}</span>
                    </div>
                  </div>
                </div>

                {(student.parentName || student.parentPhone) && (
                  <div className="rounded-xl bg-blue-50/70 p-3.5 border border-blue-200 text-xs">
                    <div className="font-bold text-blue-900 flex items-center gap-1.5">
                      <span>🛡️ Người giám hộ / Liên hệ khẩn cấp:</span>
                      <span className="text-blue-800">
                        {canViewPrivateDetails ? (student.parentName || 'Phụ huynh') : (student.parentName ? student.parentName.slice(0, 3) + '••••' : 'Phụ huynh')}
                      </span>
                    </div>
                    {student.parentPhone && (
                      <div className="text-slate-600 mt-1 flex items-center gap-1">
                        <Phone className="h-3 w-3 text-blue-500" />
                        <span>{canViewPrivateDetails ? student.parentPhone : '•••••••••• (Bảo mật)'}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="rounded-xl bg-white p-3.5 border border-slate-200 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    <span className="font-semibold text-slate-700">Địa chỉ thường trú:</span>
                  </div>
                  <p className="text-slate-800 pl-5">
                    {canViewPrivateDetails ? (student.address || 'Quận 5, TP. Hồ Chí Minh') : 'TP. Hồ Chí Minh (Đã ẩn địa chỉ chi tiết)'}
                  </p>
                </div>
              </div>

              {/* Health & Talents */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800 mb-2">
                    <Heart className="h-4 w-4 text-rose-500" />
                    <span>Tình trạng Sức khỏe</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {student.healthNotes || 'Sức khỏe tốt, phát triển thể chất bình thường.'}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800 mb-2">
                    <Award className="h-4 w-4 text-amber-500" />
                    <span>Sở thích & Năng khiếu</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {student.talents || 'Đam mê lập trình khoa học máy tính, chơi cờ vua, thích đọc sách.'}
                  </p>
                </div>
              </div>

              {/* Survey summary card in info tab */}
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
                      <ClipboardList className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                        Thông tin từ Khảo sát Đầu năm
                      </h4>
                      <p className="text-[11px] text-indigo-700">
                        {survey?.status === 'SUBMITTED' || survey?.status === 'REVIEWED'
                          ? `Đã gửi ngày ${survey.submittedAt ? new Date(survey.submittedAt).toLocaleDateString('vi-VN') : 'đầu năm'}`
                          : 'Học viên chưa hoàn tất khảo sát'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('survey')}
                    className="inline-flex items-center gap-1 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-indigo-700 border border-indigo-200 shadow-2xs hover:bg-indigo-50 transition-all cursor-pointer"
                  >
                    <span>Xem chi tiết khảo sát</span>
                    <ExternalLink className="h-3 w-3" />
                  </button>
                </div>

                {survey?.answers ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-xs">
                    <div className="rounded-xl bg-white p-3 border border-indigo-100 space-y-1">
                      <p className="font-bold text-slate-700 flex items-center gap-1">
                        <BookOpen className="h-3.5 w-3.5 text-indigo-600" /> Thế mạnh học tập:
                      </p>
                      <p className="text-indigo-950 font-semibold">
                        {survey.answers.academicSelfAssessment?.strongSubjects?.length
                          ? survey.answers.academicSelfAssessment.strongSubjects.join(', ')
                          : 'Chưa cập nhật'}
                      </p>
                    </div>

                    <div className="rounded-xl bg-white p-3 border border-indigo-100 space-y-1">
                      <p className="font-bold text-slate-700 flex items-center gap-1">
                        <Cpu className="h-3.5 w-3.5 text-indigo-600" /> Năng lực số & AI:
                      </p>
                      <p className="text-indigo-950 font-semibold">
                        {survey.answers.talentsAndDigitalSkills?.aiVerificationHabit || 'Có sử dụng và kiểm chứng'}
                      </p>
                    </div>

                    <div className="rounded-xl bg-white p-3 border border-indigo-100 space-y-1">
                      <p className="font-bold text-slate-700 flex items-center gap-1">
                        <Compass className="h-3.5 w-3.5 text-indigo-600" /> Dự định sau THPT:
                      </p>
                      <p className="text-indigo-950 font-semibold">
                        {survey.answers.careerOrientation?.postHighSchoolPlan === 'Khác' && survey.answers.otherText?.['careerOrientation.postHighSchoolPlan']
                          ? `Khác: ${survey.answers.otherText['careerOrientation.postHighSchoolPlan']}`
                          : (survey.answers.careerOrientation?.postHighSchoolPlan || 'Chưa cập nhật')}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic bg-white p-3 rounded-xl border border-indigo-100">
                    Chưa có phản hồi khảo sát cho năm học này.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 1.5. SURVEY TAB: THÔNG TIN TỪ KHẢO SÁT (BẢO MẬT & ĐÃ LỌC CÁC TRƯỜNG NHẠY CẢM) */}
          {activeTab === 'survey' && (
            <div className="space-y-4 animate-fade-in">
              {survey?.answers ? (
                <>
                  {/* Survey Status Banner */}
                  <div className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-blue-50 p-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-xs">
                        <ClipboardList className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-indigo-950">
                            Khảo sát Đầu năm Lớp 12
                          </h4>
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-300">
                            {survey.status === 'SUBMITTED' ? 'Đã gửi' : survey.status === 'REVIEWED' ? 'Đã duyệt' : 'Bản nháp'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600">
                          Năm học: <strong className="text-slate-800">{survey.schoolYear}</strong> • Gửi lúc: <strong className="text-slate-800">{survey.submittedAt ? new Date(survey.submittedAt).toLocaleString('vi-VN') : 'Chưa gửi'}</strong>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-xl bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 border border-slate-200">
                        <Lock className="h-3 w-3 text-emerald-600" />
                        Đã lọc bảo mật
                      </span>
                    </div>
                  </div>

                  {/* Section 1: Tự đánh giá học tập */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                      <BookOpen className="h-4 w-4 text-blue-600" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        1. Tự Đánh giá Năng lực Học tập
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 space-y-1.5">
                        <p className="font-bold text-emerald-950 flex items-center gap-1">
                          <span>★ Môn học tự tin / Thế mạnh:</span>
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {survey.answers.academicSelfAssessment?.strongSubjects?.length ? (
                            survey.answers.academicSelfAssessment.strongSubjects.map((s) => (
                              <span key={s} className="rounded-md bg-emerald-600 px-2 py-0.5 text-[11px] font-bold text-white">
                                {s}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-500 italic">Chưa chọn</span>
                          )}
                        </div>
                      </div>

                      <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3.5 space-y-1.5">
                        <p className="font-bold text-rose-950 flex items-center gap-1">
                          <span>⚠ Môn học còn yếu / Cần hỗ trợ:</span>
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {survey.answers.academicSelfAssessment?.supportSubjects?.length ? (
                            survey.answers.academicSelfAssessment.supportSubjects.map((s) => (
                              <span key={s} className="rounded-md bg-rose-600 px-2 py-0.5 text-[11px] font-bold text-white">
                                {s}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-500 italic">Chưa chọn</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1.5">
                        <p className="font-bold text-slate-800">Khó khăn gặp phải trong học tập:</p>
                        <div className="flex flex-wrap gap-1">
                          {(survey.answers.academicSelfAssessment?.difficulties || []).length ? (
                            survey.answers.academicSelfAssessment.difficulties.map((d) => (
                              <span key={d} className="rounded-lg bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 border border-slate-200">
                                • {d === 'Khác' && survey.answers.otherText?.['academicSelfAssessment.difficulties']
                                  ? `Khác: ${survey.answers.otherText['academicSelfAssessment.difficulties']}`
                                  : d}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-500 italic">Không có</span>
                          )}
                        </div>
                      </div>

                      <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 space-y-1.5">
                        <p className="font-bold text-blue-900">Nhu cầu được thầy cô hỗ trợ:</p>
                        <div className="flex flex-wrap gap-1">
                          {(survey.answers.academicSelfAssessment?.teacherSupportNeeds || []).length ? (
                            survey.answers.academicSelfAssessment.teacherSupportNeeds.map((n) => (
                              <span key={n} className="rounded-lg bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-900 border border-blue-200">
                                ✓ {n === 'Khác' && survey.answers.otherText?.['academicSelfAssessment.teacherSupportNeeds']
                                  ? `Khác: ${survey.answers.otherText['academicSelfAssessment.teacherSupportNeeds']}`
                                  : n}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-500 italic">Không có</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Năng lực số & AI */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                      <Cpu className="h-4 w-4 text-indigo-600" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        2. Năng lực Số & Ứng dụng AI
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {Object.entries(survey.answers.talentsAndDigitalSkills?.digitalSkillMatrix || {}).map(([skill, lvl]) => (
                        <div key={skill} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                          <span className="font-medium text-slate-700">{skill}</span>
                          <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-800">
                            {String(lvl)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1">
                        <p className="text-slate-500 font-medium">Thói quen kiểm chứng thông tin AI:</p>
                        <p className="font-bold text-slate-900">
                          {survey.answers.talentsAndDigitalSkills?.aiVerificationHabit || 'Có kiểm chứng'}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1">
                        <p className="text-slate-500 font-medium">Sẵn sàng tham gia Tổ Kỹ thuật / Truyền thông:</p>
                        <p className="font-bold text-indigo-700">
                          {survey.answers.talentsAndDigitalSkills?.willingToJoinTechTeam || 'Chưa chọn'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Sở thích & Tìm hiểu bản thân */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                      <Compass className="h-4 w-4 text-amber-600" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        3. Sở thích, Năng khiếu & Định hướng Hướng nghiệp
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="rounded-xl border border-fuchsia-200 bg-fuchsia-50/50 p-3 space-y-1.5">
                        <p className="font-bold text-fuchsia-950">Năng khiếu / Sở trường:</p>
                        <div className="flex flex-wrap gap-1">
                          {(survey.answers.talentsAndDigitalSkills?.talents || []).length ? (
                            survey.answers.talentsAndDigitalSkills.talents.map((t) => (
                              <span key={t} className="rounded-md bg-fuchsia-100 px-2 py-0.5 text-[11px] font-bold text-fuchsia-900">
                                ★ {t === 'Khác' && survey.answers.otherText?.['talentsAndDigitalSkills.talents']
                                  ? `Khác: ${survey.answers.otherText['talentsAndDigitalSkills.talents']}`
                                  : t}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-500 italic">Chưa chọn</span>
                          )}
                        </div>
                      </div>

                      <div className="rounded-xl border border-cyan-200 bg-cyan-50/50 p-3 space-y-1">
                        <p className="font-bold text-cyan-950">Dự định sau THPT:</p>
                        <p className="font-bold text-cyan-900 text-sm">
                          {survey.answers.careerOrientation?.postHighSchoolPlan === 'Khác' && survey.answers.otherText?.['careerOrientation.postHighSchoolPlan']
                            ? `Khác: ${survey.answers.otherText['careerOrientation.postHighSchoolPlan']}`
                            : (survey.answers.careerOrientation?.postHighSchoolPlan || 'Chưa chọn')}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1">
                        <p className="text-slate-500 font-medium">Ngành nghề & Trường Đại học mục tiêu:</p>
                        <p className="font-bold text-blue-700">
                          {survey.answers.careerOrientation?.targetCareerAndSchool || 'Chưa xác định'}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1">
                        <p className="text-slate-500 font-medium">Mã trắc nghiệm Holland RIASEC đã làm:</p>
                        <p className="font-bold text-slate-900">
                          {survey.answers.careerOrientation?.previousHollandCode || 'Chưa làm'}
                        </p>
                      </div>
                    </div>

                    {survey.answers.careerOrientation?.interestFields?.length ? (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1.5 text-xs">
                        <p className="font-bold text-slate-800">Lĩnh vực nghề nghiệp quan tâm:</p>
                        <div className="flex flex-wrap gap-1">
                          {survey.answers.careerOrientation.interestFields.map((field) => (
                            <span key={field} className="rounded-lg bg-cyan-100 px-2 py-0.5 text-[11px] font-semibold text-cyan-900">
                              {field === 'Khác' && survey.answers.otherText?.['careerOrientation.interestFields']
                                ? `Khác: ${survey.answers.otherText['careerOrientation.interestFields']}`
                                : field}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {/* Section 4: Mục tiêu năm học & Nguyện vọng lớp */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                      <Target className="h-4 w-4 text-rose-600" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        4. Mục tiêu Năm học & Nguyện vọng
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 space-y-1">
                        <p className="text-blue-700 font-medium">Mục tiêu danh hiệu / Học lực Lớp 12:</p>
                        <p className="font-bold text-blue-950 text-sm">{survey.answers.goals?.academicGoal || 'Chưa đặt'}</p>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1">
                        <p className="text-slate-500 font-medium">Nguyện vọng chức vụ cán sự:</p>
                        <p className="font-bold text-indigo-700">
                          {survey.answers.leadershipProposal?.desiredPosition === 'Khác' && survey.answers.otherText?.['leadershipProposal.desiredPosition']
                            ? `Khác: ${survey.answers.otherText['leadershipProposal.desiredPosition']}`
                            : (survey.answers.leadershipProposal?.desiredPosition || 'Không')}
                        </p>
                      </div>
                    </div>

                    {survey.answers.goals?.actionAndSupportPlan && (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1 text-xs">
                        <p className="font-bold text-slate-800">Kế hoạch hành động cụ thể:</p>
                        <p className="text-slate-700 whitespace-pre-wrap">{survey.answers.goals.actionAndSupportPlan}</p>
                      </div>
                    )}
                  </div>

                  {/* Privacy compliance badge */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500 flex items-center gap-2">
                    <Lock className="h-4 w-4 text-slate-400 shrink-0" />
                    <span>
                      Hệ thống tự động bảo vệ dữ liệu: Thông tin sức khỏe chi tiết, tâm lý, hoàn cảnh gia đình riêng tư và lời nhắn bí mật gửi GVCN được bảo mật nghiêm ngặt và không hiển thị trong hồ sơ học viên.
                    </span>
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center space-y-3">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                    <ClipboardList className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Chưa có Dữ liệu Khảo sát</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                      Học sinh chưa hoàn tất biểu mẫu khảo sát năm học {currentSchoolYear}. Sau khi học viên gửi phiếu khảo sát, các thông tin tự đánh giá và năng lực số sẽ tự động xuất hiện tại đây.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2. Training & Laurel Tree */}
          {activeTab === 'training' && (
            <div className="space-y-4">
              {/* Tree Status Banner */}
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 text-2xl shadow-xs">
                    {tree ? tree.icon : '🌱'}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-emerald-800">
                      Giai đoạn: <b className="text-emerald-900">{tree ? tree.stageName : 'Mầm non'}</b>
                    </div>
                    <div className="text-sm font-black text-slate-900">
                      {tree ? tree.currentCyclePoints : 0}/100 Điểm chu kỳ hiện tại
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs text-slate-500">Thành tích</div>
                  <div className="text-lg font-black text-emerald-700">
                    🌼 {tree ? tree.completedTrees : 0} Cây trổ hoa
                  </div>
                </div>
              </div>

              {/* Periodical Conduct Evaluation summary */}
              {(() => {
                const latestEvals = conductEvaluationService.getStudentEvaluations(student.id);
                if (latestEvals.length > 0) {
                  return (
                    <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                          <Award className="h-4 w-4 text-indigo-600" />
                          <span>Kết quả Xếp loại Rèn luyện Định kỳ</span>
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
                        {latestEvals.map(({ period, evaluation }) => (
                          <div key={period.id} className="rounded-xl bg-white p-3 border border-indigo-100 shadow-2xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-600 font-bold text-[11px]">{period.periodTitle}</span>
                              <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                                period.status === 'FINALIZED' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
                              }`}>
                                {period.status === 'FINALIZED' ? 'Chính thức' : 'Dự thảo'}
                              </span>
                            </div>
                            <div className="text-sm font-black text-indigo-900">
                              {evaluation.finalGrade || evaluation.teacherAssessment || <span className="text-slate-400 font-normal italic text-xs">Chưa xếp loại</span>}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {evaluation.selfAssessment ? `Tự nhận: ${evaluation.selfAssessment}` : 'Chưa gửi tự nhận'}
                              {evaluation.collectiveAssessment ? ` • Tập thể: ${evaluation.collectiveAssessment}` : ''}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Transactions list */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 mb-2">Lịch sử Ghi nhận Điểm Rèn luyện</h4>
                <div className="space-y-2">
                  {studentTx.length > 0 ? (
                    studentTx.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 border border-slate-200 text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800">{tx.category}</span>
                            <span className="text-[11px] text-slate-400">{tx.timestamp}</span>
                          </div>
                          <p className="text-slate-600 mt-0.5">{tx.reason}</p>
                        </div>
                        <span className={`text-sm font-black ${tx.points >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {tx.points > 0 ? `+${tx.points}` : tx.points}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="py-6 text-center text-xs text-slate-400 italic">Chưa có bản ghi rèn luyện nào.</div>
                  )}
                </div>
              </div>

              {/* Lịch sử theo dõi & xử lý vi phạm nề nếp (Bảo toàn 100% dữ liệu thực tế) */}
              {studentViolations.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <h4 className="text-xs font-bold text-slate-800 mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-rose-700">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Hồ sơ Theo dõi & Xử lý Vi phạm ({studentViolations.length} bản ghi)</span>
                    </span>
                    <span className="text-[10px] text-slate-400">Đồng bộ từ Sổ Nề nếp GVCN</span>
                  </h4>
                  <div className="space-y-2">
                    {studentViolations.map((rec) => (
                      <div key={rec.id} className="rounded-xl border border-rose-200 bg-rose-50/40 p-3 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{rec.content}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                            rec.status === 'RESOLVED'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : rec.status === 'PROCESSING'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}>
                            {rec.status === 'RESOLVED' ? 'Đã ổn định' : rec.status === 'PROCESSING' ? 'Đang xử lý' : 'Cảnh báo'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2">
                          <span>Ngày: <strong>{rec.date}</strong></span>
                          <span>•</span>
                          <span>Nhóm: <strong>{rec.category}</strong></span>
                          <span>•</span>
                          <span>Mức độ: <strong>{rec.severity}</strong></span>
                          {rec.frequencyCount && rec.frequencyCount > 1 && (
                            <>
                              <span>•</span>
                              <span>Tần suất: <strong>{rec.frequencyCount} lần</strong></span>
                            </>
                          )}
                        </div>
                        {rec.educationalMeasure && (
                          <div className="text-[11px] text-slate-700 bg-white p-2 rounded-lg border border-slate-200">
                            <span className="font-bold text-blue-700">Biện pháp: </span>
                            {rec.educationalMeasure}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. Academics */}
          {activeTab === 'academic' && (
            <div className="space-y-4">
              {/* Period Selector Tabs */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                  {(Object.keys(PERIOD_NAMES) as AcademicPeriod[]).map((periodKey) => {
                    const isSelected = selectedPeriod === periodKey;
                    return (
                      <button
                        key={periodKey}
                        type="button"
                        onClick={() => setSelectedPeriod(periodKey)}
                        className={`rounded-lg px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                        }`}
                      >
                        {PERIOD_NAMES[periodKey]}
                      </button>
                    );
                  })}
                </div>

                {isTeacher && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-slate-500 font-medium">Trạng thái công bố:</span>
                    {academicRecord.publishedToStudent || academicRecord.publishedToParent ? (
                      <span className="flex items-center gap-1 rounded-md bg-emerald-100 text-emerald-800 px-2 py-0.5 font-bold">
                        <Eye className="h-3 w-3" />
                        Đã công bố
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 rounded-md bg-amber-100 text-amber-800 px-2 py-0.5 font-bold">
                        <EyeOff className="h-3 w-3" />
                        Nội bộ GVCN
                      </span>
                    )}
                  </div>
                )}
              </div>

              {!isPublishedForViewer ? (
                <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/50 p-8 text-center space-y-2">
                  <Clock className="mx-auto h-8 w-8 text-amber-500 mb-1" />
                  <h4 className="text-sm font-bold text-amber-900">
                    Kết quả đợt {PERIOD_NAMES[selectedPeriod]} đang được cập nhật
                  </h4>
                  <p className="text-xs text-amber-700 max-w-md mx-auto">
                    Giáo viên chủ nhiệm đang tổng hợp và đối soát điểm kiểm tra từ giáo viên bộ môn. Kết quả sẽ được công bố tới học sinh và phụ huynh trong thời gian sớm nhất.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-blue-50/70 border border-blue-200 p-4">
                    <div>
                      <span className="text-xs text-blue-800 font-bold">
                        Kết quả học tập: {PERIOD_NAMES[selectedPeriod]} ({currentSchoolYear})
                      </span>
                      <div className="text-xs text-slate-600 mt-1">
                        {academicRecord.teacherComment || academicRecord.academicSummary ? (
                          <span><b>Nhận xét của GVCN:</b> {academicRecord.teacherComment || academicRecord.academicSummary}</span>
                        ) : (
                          <span>Theo dõi tiến độ điểm thường xuyên và định kỳ từng môn học</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {academicRecord?.highestSubject && (
                        <span className="rounded-xl bg-emerald-100 text-emerald-800 px-3 py-1 text-xs font-bold border border-emerald-200">
                          Thế mạnh: {getVietnameseSubjectFullName((academicRecord.highestSubject as any)?.name || (academicRecord.highestSubject as any)?.subjectName || academicRecord.highestSubject)} ({(academicRecord.highestSubject as any)?.score !== undefined ? (academicRecord.highestSubject as any).score : '-'})
                        </span>
                      )}
                      {academicRecord?.lowestSubject && (
                        <span className="rounded-xl bg-amber-100 text-amber-800 px-3 py-1 text-xs font-bold border border-amber-200">
                          Cần cải thiện: {getVietnameseSubjectFullName((academicRecord.lowestSubject as any)?.name || (academicRecord.lowestSubject as any)?.subjectName || academicRecord.lowestSubject)} ({(academicRecord.lowestSubject as any)?.score !== undefined ? (academicRecord.lowestSubject as any).score : '-'})
                        </span>
                      )}
                      {academicRecord?.conductResult && (
                        <span className="rounded-xl bg-indigo-100 text-indigo-900 px-3 py-1 text-xs font-bold border border-indigo-200">
                          Rèn luyện: {academicRecord.conductResult}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Grades table */}
                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                        <tr>
                          <th className="p-2.5">Môn học</th>
                          {selectedPeriod === 'full_year' ? (
                            <>
                              <th className="p-2.5 text-center">TX1</th>
                              <th className="p-2.5 text-center">TX2</th>
                              <th className="p-2.5 text-center">TX3</th>
                              <th className="p-2.5 text-center">Điểm giữa học kì II</th>
                              <th className="p-2.5 text-center">Điểm kiểm tra HKII</th>
                              <th className="p-2.5 text-center text-indigo-700">TB môn HKII</th>
                              <th className="p-2.5 text-center text-slate-700">TB môn HKI</th>
                              <th className="p-2.5 text-right font-black text-blue-700">Cả năm</th>
                            </>
                          ) : selectedPeriod === 'final_hk1' || selectedPeriod === 'final_hk2' ? (
                            <>
                              <th className="p-2.5 text-center">TX1</th>
                              <th className="p-2.5 text-center">TX2</th>
                              <th className="p-2.5 text-center">TX3</th>
                              <th className="p-2.5 text-center">Giữa kỳ</th>
                              <th className="p-2.5 text-center">Cuối kỳ</th>
                              <th className="p-2.5 text-right font-black text-blue-700">ĐTB Môn</th>
                            </>
                          ) : (
                            <>
                              <th className="p-2.5 text-center">TX1</th>
                              <th className="p-2.5 text-center">TX2</th>
                              <th className="p-2.5 text-center">TX3</th>
                              <th className="p-2.5 text-center">Giữa kỳ</th>
                              <th className="p-2.5 text-right font-black text-blue-700">ĐTB Giữa kỳ</th>
                            </>
                          )}
                          <th className="p-2.5 text-slate-500">Ghi chú</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {academicRecord.grades.map((g) => {
                          const isPassFail = g.assessmentMode === 'COMMENT_ONLY' || g.subjectName.toLowerCase().includes('trải nghiệm') || g.subjectName.toLowerCase().includes('hướng nghiệp');
                          const colSpanCount = selectedPeriod === 'full_year' ? 3 : selectedPeriod.includes('final') ? 6 : 5;

                          if (isPassFail) {
                            const qual = g.qualitativeResult;
                            return (
                              <tr key={g.subjectName} className="hover:bg-slate-50/50">
                                <td className="p-2.5 font-semibold text-slate-800">{getVietnameseSubjectFullName(g.subjectName)}</td>
                                <td colSpan={colSpanCount - 1} className="p-2.5 text-center text-slate-400 italic bg-slate-50/30">
                                  {g.comment || 'Đánh giá bằng nhận xét'}
                                </td>
                                <td className="p-2.5 text-right font-bold">
                                  {qual ? (
                                    <span className={`inline-block px-2 py-0.5 rounded-md text-xs ${qual === 'Đạt' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                      {qual}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 font-normal">-</span>
                                  )}
                                </td>
                                <td className="p-2.5 text-slate-400 text-[11px]">{g.note || '-'}</td>
                              </tr>
                            );
                          }

                          if (selectedPeriod === 'full_year') {
                            return (
                              <tr key={g.subjectName} className="hover:bg-slate-50/50">
                                <td className="p-2.5 font-semibold text-slate-800">{getVietnameseSubjectFullName(g.subjectName)}</td>
                                <td className="p-2.5 text-center text-slate-600">{g.tbHk1 !== undefined ? g.tbHk1 : '-'}</td>
                                <td className="p-2.5 text-center text-slate-600">{g.tbHk2 !== undefined ? g.tbHk2 : '-'}</td>
                                <td className="p-2.5 text-right font-bold text-blue-600">{g.tbCaNam !== undefined ? Number(g.tbCaNam).toFixed(1) : '-'}</td>
                                <td className="p-2.5 text-slate-400 text-[11px]">{g.note || '-'}</td>
                              </tr>
                            );
                          }

                          return (
                            <tr key={g.subjectName} className="hover:bg-slate-50/50">
                              <td className="p-2.5 font-semibold text-slate-800">{getVietnameseSubjectFullName(g.subjectName)}</td>
                              <td className="p-2.5 text-center text-slate-600">{g.tx1 !== undefined ? g.tx1 : '-'}</td>
                              <td className="p-2.5 text-center text-slate-600">{g.tx2 !== undefined ? g.tx2 : '-'}</td>
                              <td className="p-2.5 text-center text-slate-600">{g.tx3 !== undefined ? g.tx3 : '-'}</td>
                              <td className="p-2.5 text-center text-slate-600">{g.midterm !== undefined ? g.midterm : '-'}</td>
                              {(selectedPeriod === 'final_hk1' || selectedPeriod === 'final_hk2') && (
                                <td className="p-2.5 text-center text-slate-600">{g.finalExam !== undefined ? g.finalExam : '-'}</td>
                              )}
                              <td className="p-2.5 text-right font-bold text-blue-600">{g.average !== undefined ? Number(g.average).toFixed(1) : '-'}</td>
                              <td className="p-2.5 text-slate-400 text-[11px]">{g.note || '-'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {/* 4. Goals Tab (Mục tiêu năm học) */}
          {activeTab === 'goals' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Mục tiêu phát triển cá nhân</h4>
                  <p className="text-[11px] text-slate-500">Kế hoạch phấn đấu học tập, rèn luyện và lời khuyên từ GVCN</p>
                </div>
                <button
                  onClick={() => setIsAddingGoal(!isAddingGoal)}
                  className="flex items-center gap-1 rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-100 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>{isAddingGoal ? 'Hủy' : '+ Thêm mục tiêu'}</span>
                </button>
              </div>

              {/* Add Goal Inline Form */}
              {isAddingGoal && (
                <form onSubmit={handleAddGoal} className="rounded-2xl border border-blue-200 bg-blue-50/40 p-4 space-y-3">
                  <div className="font-bold text-xs text-blue-800">Thêm mục tiêu mới cho {student.fullName}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tên mục tiêu:</label>
                      <input
                        type="text"
                        required
                        value={newGoalTitle}
                        onChange={(e) => setNewGoalTitle(e.target.value)}
                        placeholder="VD: Đạt GPA 9.0, Trổ 3 cây Nguyệt quế..."
                        className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Chỉ tiêu / Kỳ vọng:</label>
                      <input
                        type="text"
                        value={newGoalTarget}
                        onChange={(e) => setNewGoalTarget(e.target.value)}
                        placeholder="VD: Điểm tổng kết HK1 >= 9.0"
                        className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <select
                      value={newGoalCategory}
                      onChange={(e) => setNewGoalCategory(e.target.value as any)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium"
                    >
                      <option value="Học tập">Học tập</option>
                      <option value="Rèn luyện">Rèn luyện</option>
                      <option value="Kỹ năng">Kỹ năng</option>
                      <option value="Khác">Khác</option>
                    </select>
                    <button
                      type="submit"
                      className="rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-700 cursor-pointer"
                    >
                      Lưu mục tiêu
                    </button>
                  </div>
                </form>
              )}

              {/* Goals List */}
              <div className="space-y-3">
                {personalGoals.length > 0 ? (
                  personalGoals.map((goal) => (
                    <div key={goal.id} className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2.5 shadow-xs">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-100">
                              {goal.category}
                            </span>
                            <span className="font-bold text-xs text-slate-900">{goal.title}</span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1">Chỉ tiêu: <span className="font-semibold text-slate-800">{goal.target}</span></p>
                        </div>
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          goal.progress >= 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {goal.progress}%
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full transition-all"
                          style={{ width: `${goal.progress}%` }}
                        />
                      </div>

                      {/* Teacher Feedback Section */}
                      {goal.teacherFeedback ? (
                        <div className="rounded-xl bg-amber-50 p-2.5 border border-amber-100 text-xs text-amber-900 flex items-start gap-2">
                          <MessageSquare className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">Nhận xét của GVCN:</span>
                            <p className="text-[11px] text-amber-800 mt-0.5">{goal.teacherFeedback}</p>
                          </div>
                        </div>
                      ) : isTeacher ? (
                        <div>
                          {feedbackGoalId === goal.id ? (
                            <div className="mt-2 space-y-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                              <textarea
                                value={feedbackText}
                                onChange={(e) => setFeedbackText(e.target.value)}
                                placeholder="Nhập lời khuyên hoặc góp ý cho mục tiêu của học sinh..."
                                rows={2}
                                className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                              />
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setFeedbackGoalId(null)}
                                  className="px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
                                >
                                  Hủy
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSendFeedback(goal.id)}
                                  className="px-3 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                                >
                                  Gửi nhận xét
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setFeedbackGoalId(goal.id);
                                setFeedbackText('');
                              }}
                              className="text-[11px] font-bold text-amber-700 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <MessageSquare className="h-3 w-3" />
                              <span>+ Thêm nhận xét / lời khuyên của GVCN</span>
                            </button>
                          )}
                        </div>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-xs text-slate-400 italic">
                    Chưa có mục tiêu nào được thiết lập cho năm học này.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 5. Career Holland */}
          {activeTab === 'career' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
                <div className="text-xs font-bold text-amber-800">Mã trắc nghiệm Holland RIASEC</div>
                <div className="text-lg font-black text-amber-950 mt-0.5">{careerProfile.primaryCode}</div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-xl bg-white p-2 border border-amber-200">
                    <span className="text-[10px] text-slate-400">Xã hội (S):</span>
                    <div className="font-bold text-slate-800">{careerProfile.hollandScores.social} đ</div>
                  </div>
                  <div className="rounded-xl bg-white p-2 border border-amber-200">
                    <span className="text-[10px] text-slate-400">Nghiên cứu (I):</span>
                    <div className="font-bold text-slate-800">{careerProfile.hollandScores.investigative} đ</div>
                  </div>
                  <div className="rounded-xl bg-white p-2 border border-amber-200">
                    <span className="text-[10px] text-slate-400">Quản lý (E):</span>
                    <div className="font-bold text-slate-800">{careerProfile.hollandScores.enterprising} đ</div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                <div>
                  <span className="text-xs font-bold text-slate-800">Ngành học ưu tiên:</span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {careerProfile.suggestedMajors.map((major, i) => (
                      <span key={i} className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 border border-blue-200">
                        {major}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-xs font-bold text-slate-800">Khối thi / Tổ hợp môn:</span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {careerProfile.examGroups.map((group, i) => (
                      <span key={i} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                        {group}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-xs font-bold text-slate-800">Trường Đại học mục tiêu:</span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {careerProfile.targetUniversities.map((uni, i) => (
                      <span key={i} className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 border border-indigo-200">
                        🏛️ {uni}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Support and Follow-up History (Teacher Only) */}
          {activeTab === 'support_history' && isTeacher && (
            <div className="space-y-6">
              {/* Header Card / Status Overview */}
              <div className="rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50/70 via-white to-amber-50/40 p-5 shadow-xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-600 text-white shadow-xs">
                        <Clock className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                          Lịch sử hỗ trợ & theo dõi học sinh
                          <span className="rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                            Bảo mật GVCN
                          </span>
                        </h3>
                        <p className="text-xs text-slate-600">
                          Nhật ký đồng hành, biện pháp can thiệp và theo dõi tiến độ của học sinh theo từng tuần/đợt.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingEpisodeId(null);
                        setEpWeekNumber((currentStudent?.attentionHistory?.length || 0) + 1);
                        setEpStartDate(new Date().toLocaleDateString('vi-VN'));
                        setEpCategories(currentStudent?.attentionCategories?.length ? [...currentStudent.attentionCategories] : ['Học tập']);
                        setEpSignsAndCauses('');
                        setEpSupportMeasure(currentStudent?.supportMeasure || '');
                        setEpTeacherNote('');
                        setEpWeeklyReview('');
                        setEpStatus(currentStudent?.attentionStatus || 'monitoring');
                        setEpNextReviewDate('');
                        setIsAddingEpisode(!isAddingEpisode);
                      }}
                      className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700 active:scale-95 transition-all cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                      <span>{isAddingEpisode ? 'Đóng form ghi nhận' : 'Ghi nhận đợt hỗ trợ mới'}</span>
                    </button>
                  </div>
                </div>

                {/* Status summary metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-rose-100/80">
                  <div className="rounded-xl bg-white/80 p-3 border border-rose-100 shadow-2xs">
                    <div className="text-[11px] font-medium text-slate-500">Trạng thái hiện tại</div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${getAttentionStatusBadge(currentStudent?.attentionStatus).dot}`} />
                      <span className="text-xs font-black text-slate-800">
                        {getAttentionStatusBadge(currentStudent?.attentionStatus).label}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl bg-white/80 p-3 border border-rose-100 shadow-2xs">
                    <div className="text-[11px] font-medium text-slate-500">Tổng số đợt ghi nhận</div>
                    <div className="mt-1 text-sm font-black text-rose-700">
                      {currentStudent?.attentionHistory?.length || 0} đợt đồng hành
                    </div>
                  </div>

                  <div className="rounded-xl bg-white/80 p-3 border border-rose-100 shadow-2xs">
                    <div className="text-[11px] font-medium text-slate-500">Thời điểm bắt đầu</div>
                    <div className="mt-1 text-xs font-bold text-slate-700">
                      {currentStudent?.attentionStartedAt || 'Chưa ghi nhận'}
                    </div>
                  </div>

                  <div className="rounded-xl bg-white/80 p-3 border border-rose-100 shadow-2xs">
                    <div className="text-[11px] font-medium text-slate-500">Cập nhật gần nhất</div>
                    <div className="mt-1 text-xs font-bold text-slate-700">
                      {currentStudent?.attentionUpdatedAt || 'Chưa có'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Add/Edit Episode */}
              {isAddingEpisode && (
                <div className="rounded-2xl border-2 border-rose-400 bg-white p-5 shadow-lg space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-100 text-rose-700 font-bold text-xs">
                        {editingEpisodeId ? <Edit2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                      </div>
                      <h4 className="text-sm font-black text-slate-900">
                        {editingEpisodeId ? 'Chỉnh sửa đợt hỗ trợ & theo dõi' : 'Thêm đợt hỗ trợ & theo dõi mới'}
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingEpisode(false);
                        setEditingEpisodeId(null);
                      }}
                      className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {epSaveSuccess && (
                    <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-800 border border-emerald-200">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>{epSaveSuccess}</span>
                    </div>
                  )}

                  <form onSubmit={handleSaveEpisode} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Tuần / Đợt theo dõi: <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="52"
                          value={epWeekNumber}
                          onChange={e => setEpWeekNumber(parseInt(e.target.value) || 1)}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 focus:border-rose-500 focus:bg-white focus:outline-hidden"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Ngày bắt đầu / Ghi nhận:
                        </label>
                        <input
                          type="text"
                          value={epStartDate}
                          onChange={e => setEpStartDate(e.target.value)}
                          placeholder="VD: 05/10/2026"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:border-rose-500 focus:bg-white focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Trạng thái đợt hỗ trợ:
                        </label>
                        <select
                          value={epStatus}
                          onChange={e => setEpStatus(e.target.value as AttentionStatus)}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 focus:border-rose-500 focus:bg-white focus:outline-hidden"
                        >
                          <option value="monitoring">1. Đang theo dõi</option>
                          <option value="supporting">2. Đang hỗ trợ</option>
                          <option value="resolved">3. Đã hoàn tất hỗ trợ</option>
                        </select>
                      </div>
                    </div>

                    {/* Categories */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Lĩnh vực hỗ trợ & quan tâm:
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          'Học tập (Yếu/Cần phụ đạo)',
                          'Kỷ luật & Nề nếp',
                          'Chuyên cần / Vắng nhiều',
                          'Gia cảnh đặc biệt',
                          'Tâm lý / Cảm xúc',
                          'Sức khỏe / Thể chất',
                          'Kỹ năng hòa nhập'
                        ].map(cat => {
                          const isSel = epCategories.includes(cat);
                          return (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => {
                                if (isSel) {
                                  setEpCategories(epCategories.filter(c => c !== cat));
                                } else {
                                  setEpCategories([...epCategories, cat]);
                                }
                              }}
                              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                                isSel
                                  ? 'bg-rose-600 text-white shadow-2xs'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              {cat}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Signs & Causes */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Biểu hiện cụ thể & Nguyên nhân:
                        </label>
                        <textarea
                          value={epSignsAndCauses}
                          onChange={e => setEpSignsAndCauses(e.target.value)}
                          placeholder="Mô tả các biểu hiện của học sinh trong tuần (VD: ngủ gật trong giờ, chưa làm bài tập, trầm lặng bất thường...)"
                          rows={3}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 focus:border-rose-500 focus:bg-white focus:outline-hidden"
                        />
                      </div>

                      {/* Support Measure */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Biện pháp can thiệp / Hỗ trợ của GVCN: <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                          value={epSupportMeasure}
                          onChange={e => setEpSupportMeasure(e.target.value)}
                          placeholder="Các biện pháp đã áp dụng (VD: gặp riêng trao đổi, xếp ngồi cùng bạn học khá, liên hệ phụ huynh, giao bài tập vừa sức...)"
                          rows={3}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 focus:border-rose-500 focus:bg-white focus:outline-hidden"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Weekly Review */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Đánh giá tiến độ sau tuần / Kết quả đạt được:
                        </label>
                        <textarea
                          value={epWeeklyReview}
                          onChange={e => setEpWeeklyReview(e.target.value)}
                          placeholder="Học sinh có tiến bộ như thế nào? (VD: đã đi học đúng giờ 4/5 buổi, làm bài tập đầy đủ hơn...)"
                          rows={2}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 focus:border-rose-500 focus:bg-white focus:outline-hidden"
                        />
                      </div>

                      {/* Teacher Note & Next Review Date */}
                      <div className="space-y-2">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Ghi chú thêm của GVCN:
                          </label>
                          <input
                            type="text"
                            value={epTeacherNote}
                            onChange={e => setEpTeacherNote(e.target.value)}
                            placeholder="Ghi chú thêm hoặc dặn dò cho tuần sau..."
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:border-rose-500 focus:bg-white focus:outline-hidden"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Ngày hẹn đánh giá tiếp theo:
                          </label>
                          <input
                            type="text"
                            value={epNextReviewDate}
                            onChange={e => setEpNextReviewDate(e.target.value)}
                            placeholder="VD: 12/10/2026"
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:border-rose-500 focus:bg-white focus:outline-hidden"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Form actions */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingEpisode(false);
                          setEditingEpisodeId(null);
                        }}
                        className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700 active:scale-95 transition-all cursor-pointer"
                      >
                        <Save className="h-4 w-4" />
                        <span>{editingEpisodeId ? 'Cập nhật đợt hỗ trợ' : 'Lưu đợt hỗ trợ'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Current Active Plan Summary Card */}
              {(currentStudent?.supportMeasure || currentStudent?.attentionNote) && (
                <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base">💡</span>
                      <h4 className="text-xs font-black uppercase tracking-wider text-blue-900">
                        KẾ HOẠCH HỖ TRỢ HIỆN TẠI ĐANG ÁP DỤNG
                      </h4>
                    </div>
                    {currentStudent.attentionUpdatedAt && (
                      <span className="text-[10px] text-blue-600 font-medium">
                        Cập nhật: {currentStudent.attentionUpdatedAt} ({currentStudent.attentionUpdatedBy || 'GVCN'})
                      </span>
                    )}
                  </div>
                  {currentStudent.supportMeasure && (
                    <div className="text-xs text-slate-800 bg-white/90 rounded-xl p-3 border border-blue-100">
                      <span className="font-bold text-blue-900">Biện pháp hỗ trợ chính: </span>
                      <span>{currentStudent.supportMeasure}</span>
                    </div>
                  )}
                  {currentStudent.attentionNote && (
                    <div className="text-xs text-slate-700 bg-white/90 rounded-xl p-3 border border-blue-100">
                      <span className="font-bold text-blue-900">Ghi chú lưu tâm: </span>
                      <span>{currentStudent.attentionNote}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Timeline of Support Episodes */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <span>DANH SÁCH CÁC ĐỢT HỖ TRỢ & ĐỒNG HÀNH ({currentStudent?.attentionHistory?.length || 0})</span>
                  </h4>
                  {/* Filter Pills */}
                  {currentStudent?.attentionHistory && currentStudent.attentionHistory.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEpFilter('all')}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer ${
                          epFilter === 'all'
                            ? 'bg-slate-900 text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Tất cả ({currentStudent.attentionHistory.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setEpFilter('monitoring')}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer ${
                          epFilter === 'monitoring'
                            ? 'bg-rose-600 text-white shadow-2xs'
                            : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                        }`}
                      >
                        Đang theo dõi ({currentStudent.attentionHistory.filter(e => e.status === 'monitoring' || !e.status).length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setEpFilter('supporting')}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer ${
                          epFilter === 'supporting'
                            ? 'bg-amber-600 text-white shadow-2xs'
                            : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                        }`}
                      >
                        Đang hỗ trợ ({currentStudent.attentionHistory.filter(e => e.status === 'supporting' || e.status === 'improving' || e.status === 'continued_support').length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setEpFilter('resolved')}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer ${
                          epFilter === 'resolved'
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                        }`}
                      >
                        Đã hoàn tất hỗ trợ ({currentStudent.attentionHistory.filter(e => e.status === 'resolved' || e.status === 'ended' || e.status === 'stopped' || e.status === 'stable').length})
                      </button>
                    </div>
                  )}
                </div>

                {(!currentStudent?.attentionHistory || currentStudent.attentionHistory.length === 0) ? (
                  <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center space-y-3 bg-slate-50/50">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                      <Clock className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <h5 className="text-sm font-bold text-slate-800">Chưa có lịch sử hỗ trợ nào</h5>
                      <p className="text-xs text-slate-500 max-w-md mx-auto">
                        Học viên chưa có đợt ghi nhận hỗ trợ nào. Nhấn vào nút bên dưới để bắt đầu ghi nhận đợt hỗ trợ và đồng hành cùng học sinh.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingEpisodeId(null);
                        setEpWeekNumber(1);
                        setEpStartDate(new Date().toLocaleDateString('vi-VN'));
                        setEpCategories(currentStudent?.attentionCategories?.length ? [...currentStudent.attentionCategories] : ['Học tập']);
                        setEpSignsAndCauses('');
                        setEpSupportMeasure(currentStudent?.supportMeasure || '');
                        setEpTeacherNote('');
                        setEpWeeklyReview('');
                        setEpStatus(currentStudent?.attentionStatus || 'monitoring');
                        setIsAddingEpisode(true);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700 transition-all cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Bắt đầu ghi nhận đợt hỗ trợ</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {currentStudent.attentionHistory
                      .filter(ep => {
                        if (epFilter === 'monitoring') return ep.status === 'monitoring' || !ep.status;
                        if (epFilter === 'supporting') return ep.status === 'supporting' || ep.status === 'improving' || ep.status === 'continued_support';
                        if (epFilter === 'resolved') return ep.status === 'resolved' || ep.status === 'ended' || ep.status === 'stopped' || ep.status === 'stable';
                        return true;
                      })
                      .map((ep, idx) => {
                      const badge = getAttentionStatusBadge(ep.status);
                      return (
                        <div
                          key={ep.id || idx}
                          className="relative rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs hover:shadow-md transition-all space-y-3"
                        >
                          {/* Card Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="flex items-center justify-center rounded-xl bg-slate-900 px-2.5 py-1 text-xs font-black text-white shadow-2xs">
                                Tuần {ep.weekNumber || (currentStudent.attentionHistory!.length - idx)}
                              </span>
                              <span className="text-xs font-bold text-slate-700">
                                {ep.startDate ? `Bắt đầu: ${ep.startDate}` : `Ghi nhận: ${ep.recordedAt}`}
                              </span>
                              {ep.schoolYear && (
                                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                                  {ep.schoolYear}
                                </span>
                              )}
                              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black border ${badge.bg}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                                {badge.label}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 self-end sm:self-center">
                              {(ep.status === 'monitoring' || !ep.status) && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleQuickTransitionEpisode(ep, 'supporting')}
                                    className="flex items-center gap-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer"
                                    title="Chuyển sang trạng thái Đang hỗ trợ"
                                  >
                                    <span>▶ Bắt đầu hỗ trợ</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleQuickTransitionEpisode(ep, 'resolved')}
                                    className="flex items-center gap-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer"
                                    title="Đánh giá hoàn tất đợt hỗ trợ này"
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                    <span>Hoàn tất hỗ trợ</span>
                                  </button>
                                </>
                              )}
                              {(ep.status === 'supporting' || ep.status === 'improving' || ep.status === 'continued_support') && (
                                <button
                                  type="button"
                                  onClick={() => handleQuickTransitionEpisode(ep, 'resolved')}
                                  className="flex items-center gap-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer"
                                  title="Đánh giá hoàn tất đợt hỗ trợ này"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                  <span>Hoàn tất hỗ trợ</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleOpenEditEpisode(ep)}
                                className="flex items-center gap-1 rounded-lg bg-slate-100 hover:bg-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                              >
                                <Edit2 className="h-3 w-3 text-blue-600" />
                                <span>Chỉnh sửa</span>
                              </button>
                            </div>
                          </div>

                          {/* Categories tags */}
                          {ep.categories && ep.categories.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1">
                              <span className="text-[11px] font-bold text-slate-500 mr-1">Lĩnh vực:</span>
                              {ep.categories.map(cat => (
                                <span
                                  key={cat}
                                  className="rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200"
                                >
                                  {cat}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Details Content */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                            {ep.signsAndCauses && (
                              <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 space-y-1">
                                <div className="font-bold text-slate-800 flex items-center gap-1 text-[11px] text-rose-900">
                                  <span>⚠️ Biểu hiện & Nguyên nhân:</span>
                                </div>
                                <div className="text-slate-700 leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                                  {ep.signsAndCauses}
                                </div>
                              </div>
                            )}

                            {ep.supportMeasure && (
                              <div className="rounded-xl bg-emerald-50/60 p-3 border border-emerald-100 space-y-1">
                                <div className="font-bold text-emerald-900 flex items-center gap-1 text-[11px]">
                                  <span>🛠️ Biện pháp can thiệp / Hỗ trợ:</span>
                                </div>
                                <div className="text-slate-800 leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                                  {ep.supportMeasure}
                                </div>
                              </div>
                            )}

                            {ep.weeklyReview && (
                              <div className="rounded-xl bg-blue-50/60 p-3 border border-blue-100 space-y-1">
                                <div className="font-bold text-blue-900 flex items-center gap-1 text-[11px]">
                                  <span>📈 Đánh giá tiến độ sau tuần / Kết quả:</span>
                                </div>
                                <div className="text-slate-800 leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                                  {ep.weeklyReview}
                                </div>
                              </div>
                            )}

                            {(ep.teacherNote || ep.nextReviewDate) && (
                              <div className="rounded-xl bg-amber-50/60 p-3 border border-amber-100 space-y-1">
                                {ep.teacherNote && (
                                  <>
                                    <div className="font-bold text-amber-900 text-[11px]">
                                      💬 Ghi chú của GVCN:
                                    </div>
                                    <div className="text-slate-800 leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                                      {ep.teacherNote}
                                    </div>
                                  </>
                                )}
                                {ep.nextReviewDate && (
                                  <div className="pt-1 text-[11px] text-amber-800 font-bold">
                                    ⏰ Hẹn đánh giá lại: {ep.nextReviewDate}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Footer of card */}
                          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-100">
                            <div>
                              Người ghi nhận: <span className="font-bold text-slate-600">{ep.recordedBy || 'GVCN'}</span>
                              {ep.endedAt && <span className="ml-2 text-emerald-600 font-bold">• Hoàn tất đợt: {ep.endedAt}</span>}
                            </div>
                            <div>Ghi lúc: {ep.recordedAt}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 6. Secret Teacher Notes (Teacher Only) */}
          {activeTab === 'notes' && isTeacher && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-rose-800">
                    <Lock className="h-4 w-4 text-rose-600" />
                    <span>Học viên diện Cần lưu tâm & Ghi chú Bảo mật GVCN</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('support_history')}
                      className="flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100 hover:bg-rose-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      <Clock className="h-3 w-3" />
                      <span>Xem Lịch sử hỗ trợ ({currentStudent?.attentionHistory?.length || 0})</span>
                    </button>
                    <span className="text-[10px] font-bold text-rose-600 bg-white px-2 py-0.5 rounded-full border border-rose-200">
                      Chỉ GVCN xem
                    </span>
                  </div>
                </div>

                {/* Special attention checkbox */}
                <div className="rounded-xl bg-white p-3 border border-rose-200 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={needsAttention}
                      onChange={e => setNeedsAttention(e.target.checked)}
                      className="h-4 w-4 rounded-md text-rose-600 focus:ring-0"
                    />
                    <span className="text-xs font-bold text-rose-900">
                      Đánh dấu học viên thuộc diện &quot;Cần lưu tâm đặc biệt&quot;
                    </span>
                  </label>

                  {needsAttention && (
                    <div className="pl-6 space-y-2 pt-1 border-t border-rose-100">
                      <div className="text-[11px] font-bold text-slate-700">Lĩnh vực cần lưu tâm:</div>
                      <div className="flex flex-wrap gap-1.5">
                        {['Học tập', 'Kỷ luật / Nề nếp', 'Tâm lý / Tình cảm', 'Gia đình / Hoàn cảnh', 'Sức khỏe'].map(cat => {
                          const isSel = attentionCategories.includes(cat);
                          return (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => {
                                if (isSel) {
                                  setAttentionCategories(attentionCategories.filter(c => c !== cat));
                                } else {
                                  setAttentionCategories([...attentionCategories, cat]);
                                }
                              }}
                              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                                isSel
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              {cat}
                            </button>
                          );
                        })}
                      </div>

                      <div className="pt-1">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Trạng thái theo dõi:
                        </label>
                        <select
                          value={attentionStatus}
                          onChange={e => setAttentionStatus(e.target.value as any)}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-hidden"
                        >
                          <option value="monitoring">1. Đang theo dõi</option>
                          <option value="supporting">2. Đang hỗ trợ</option>
                          <option value="resolved">3. Đã hoàn tất hỗ trợ</option>
                        </select>
                      </div>

                      <div className="pt-1">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Chi tiết vấn đề cần lưu tâm:
                        </label>
                        <textarea
                          value={attentionText}
                          onChange={e => setAttentionText(e.target.value)}
                          placeholder="Mô tả hoàn cảnh, biểu hiện hoặc kế hoạch hỗ trợ học sinh..."
                          rows={2}
                          className="w-full rounded-xl border border-rose-200 bg-slate-50 p-2.5 text-xs text-slate-800 focus:border-rose-500 focus:bg-white focus:outline-hidden"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* General private notes */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Ghi chú bí mật của GVCN (Tâm lý, năng lực, lịch sử trao đổi riêng):
                  </label>
                  <textarea
                    value={privateNotes}
                    onChange={e => setPrivateNotes(e.target.value)}
                    placeholder="Ghi lại các thông tin riêng tư, nhận xét cá nhân của GVCN về học sinh này..."
                    rows={4}
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                {notesSaveSuccess && (
                  <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-2.5 text-xs font-bold text-emerald-800 border border-emerald-200">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>{notesSaveSuccess}</span>
                  </div>
                )}

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      studentService.updateStudent(student.id, {
                        privateTeacherNotes: privateNotes.trim(),
                        needsSpecialAttention: needsAttention,
                        attentionCategories,
                        attentionNote: attentionText.trim(),
                        attentionStatus,
                        attentionUpdatedAt: new Date().toLocaleDateString('vi-VN'),
                        attentionUpdatedBy: 'GVCN'
                      });
                      setNotesSaveSuccess('Đã lưu ghi chú bí mật và trạng thái lưu tâm thành công!');
                      setTimeout(() => setNotesSaveSuccess(null), 2500);
                    }}
                    className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700 active:scale-95 transition-all cursor-pointer"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>Lưu ghi chú bảo mật</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: THI TỐT NGHIỆP THPT (SYNCHRONIZED FROM PART 4) */}
          {activeTab === 'graduation' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50/80 via-indigo-50/50 to-white p-4 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600 text-white shadow-xs">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black uppercase tracking-tight text-slate-900">
                      Hồ sơ Theo dõi Thi Tốt nghiệp THPT (GDPT 2018)
                    </h4>
                    <p className="text-xs text-slate-500">
                      Đồng bộ trực tiếp với bảng Theo dõi của GVCN (Phần 4), Mục 2 và Mục 3
                    </p>
                  </div>
                </div>
                {graduationRecord && (
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold border ${
                      graduationRecord.status === 'qualified'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : graduationRecord.status === 'at_risk'
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : graduationRecord.status === 'unqualified'
                        ? 'bg-rose-50 text-rose-800 border-rose-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      {graduationRecord.status === 'qualified'
                        ? '✓ Đủ điều kiện dự kiến'
                        : graduationRecord.status === 'at_risk'
                        ? '⚠️ Cận chuẩn / Cần lưu ý'
                        : graduationRecord.status === 'unqualified'
                        ? '✗ Chưa đủ điều kiện'
                        : '⏳ Đang cập nhật dữ liệu'}
                    </span>
                  </div>
                )}
              </div>

              {graduationRecord ? (
                <div className="space-y-4">
                  {/* 1. Đăng ký môn thi */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                        1. Tổ hợp 04 môn thi Tốt nghiệp THPT
                      </span>
                      {graduationRecord.updatedAt && (
                        <span className="text-[11px] text-slate-400 font-mono">
                          Cập nhật: {graduationRecord.updatedAt} {graduationRecord.updatedBy ? `(${graduationRecord.updatedBy})` : ''}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Bắt buộc 1</span>
                        <span className="font-black text-slate-900 mt-0.5 block">Toán</span>
                        <span className="text-[11px] font-bold text-blue-700 mt-1 block">
                          Điểm: {graduationRecord.scores?.math !== undefined ? graduationRecord.scores.math.toFixed(2) : '--'}
                        </span>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Bắt buộc 2</span>
                        <span className="font-black text-slate-900 mt-0.5 block">Ngữ văn</span>
                        <span className="text-[11px] font-bold text-blue-700 mt-1 block">
                          Điểm: {graduationRecord.scores?.literature !== undefined ? graduationRecord.scores.literature.toFixed(2) : '--'}
                        </span>
                      </div>
                      <div className="rounded-xl bg-blue-50/60 p-3 border border-blue-200">
                        <span className="text-[10px] font-bold text-blue-700 uppercase block">Tự chọn 1</span>
                        <span className="font-black text-blue-950 mt-0.5 block">
                          {graduationRecord.electiveSubject1 || 'Chưa chọn'}
                        </span>
                        <span className="text-[11px] font-bold text-blue-700 mt-1 block">
                          Điểm: {graduationRecord.scores?.elective1 !== undefined ? graduationRecord.scores.elective1.toFixed(2) : '--'}
                        </span>
                      </div>
                      <div className="rounded-xl bg-indigo-50/60 p-3 border border-indigo-200">
                        <span className="text-[10px] font-bold text-indigo-700 uppercase block">Tự chọn 2</span>
                        <span className="font-black text-indigo-950 mt-0.5 block">
                          {graduationRecord.electiveSubject2 || 'Chưa chọn'}
                        </span>
                        <span className="text-[11px] font-bold text-indigo-700 mt-1 block">
                          Điểm: {graduationRecord.scores?.elective2 !== undefined ? graduationRecord.scores.elective2.toFixed(2) : '--'}
                        </span>
                      </div>
                    </div>

                    {graduationRecord.isForeignLanguageExempt && (
                      <div className="rounded-xl bg-emerald-50 p-2.5 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>Thuộc diện miễn thi bài thi Ngoại ngữ (chứng chỉ quốc tế hợp lệ theo quy chế).</span>
                      </div>
                    )}
                  </div>

                  {/* 2. ĐTB các năm học & Điểm xét tốt nghiệp dự kiến */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-2.5 text-xs">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-800 block border-b border-slate-100 pb-2">
                        2. Điểm TB các năm học THPT (Hệ số 1-2-3)
                      </span>
                      <div className="grid grid-cols-4 gap-2 text-center">
                        <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-200">
                          <span className="text-[10px] text-slate-400 font-bold block">Lớp 10</span>
                          <span className="font-mono font-black text-slate-800 text-sm">
                            {graduationRecord.gpa10 !== undefined ? graduationRecord.gpa10.toFixed(2) : '--'}
                          </span>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-200">
                          <span className="text-[10px] text-slate-400 font-bold block">Lớp 11</span>
                          <span className="font-mono font-black text-slate-800 text-sm">
                            {graduationRecord.gpa11 !== undefined ? graduationRecord.gpa11.toFixed(2) : '--'}
                          </span>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-200">
                          <span className="text-[10px] text-slate-400 font-bold block">Lớp 12</span>
                          <span className="font-mono font-black text-slate-800 text-sm">
                            {graduationRecord.gpa12 !== undefined ? graduationRecord.gpa12.toFixed(2) : '--'}
                          </span>
                        </div>
                        <div className="rounded-xl bg-indigo-50 p-2.5 border border-indigo-200">
                          <span className="text-[10px] text-indigo-700 font-bold block">ĐTB 3 năm</span>
                          <span className="font-mono font-black text-indigo-950 text-sm">
                            {graduationRecord.gpaAllYears !== undefined ? graduationRecord.gpaAllYears.toFixed(2) : '--'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-1 text-[11px] text-slate-600">
                        <span>Điểm ưu tiên (ƯT): <strong>+{graduationRecord.priorityBonus || 0}</strong></span>
                        <span>Điểm khuyến khích (KK): <strong>+{graduationRecord.encouragementBonus || 0}</strong></span>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-purple-200 bg-purple-50/40 p-4 shadow-2xs flex flex-col justify-between text-xs">
                      <div className="flex items-center justify-between border-b border-purple-100 pb-2">
                        <span className="font-black uppercase tracking-wider text-purple-950">
                          3. Điểm xét tốt nghiệp dự kiến (ĐXTN)
                        </span>
                        <span className="font-mono text-xl font-black text-purple-700">
                          {graduationRecord.calculatedScore !== undefined ? graduationRecord.calculatedScore.toFixed(2) : '--'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-700 mt-2 font-medium">
                        {graduationRecord.statusReason || 'Chưa nhập đủ điểm 4 môn thi và ĐTB 3 năm THPT để tính ĐXTN.'}
                      </p>
                      {graduationRecord.teacherNote && (
                        <div className="mt-2 rounded-xl bg-white p-2.5 border border-amber-200 text-[11px] text-amber-950">
                          <strong className="text-amber-800 block uppercase text-[10px]">Ghi chú theo dõi của GVCN:</strong>
                          <span>{graduationRecord.teacherNote}</span>
                        </div>
                      )}
                      {isTeacher && graduationRecord.isFlagged && (
                        <div className="mt-2 rounded-xl bg-rose-50 p-2.5 border border-rose-200 text-[11px] text-rose-900">
                          <strong className="text-rose-800 block uppercase text-[10px]">Cờ lưu ý nội bộ GVCN:</strong>
                          <span>{(graduationRecord.flagReasons || []).join(', ') || 'Cần theo dõi sát'}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-xs text-slate-500">
                  Chưa có dữ liệu theo dõi thi tốt nghiệp THPT cho học viên này.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3.5">
          <div className="text-xs text-slate-500">
            Hồ sơ học sinh cập nhật Năm học {currentSchoolYear}
          </div>
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-200 px-5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-300 transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

