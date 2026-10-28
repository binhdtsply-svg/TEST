/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Compass,
  Sparkles,
  CheckCircle2,
  Award,
  BookOpen,
  Building2,
  HelpCircle,
  BarChart3,
  Users,
  Search,
  Check,
  Save,
  ExternalLink,
  Target,
  GraduationCap,
  FileSpreadsheet,
  Printer,
  History,
  MessageSquare,
  Send,
  AlertCircle,
  ChevronRight,
  TrendingUp,
  RefreshCw,
  Eye,
  UserCheck,
  X,
  Bot,
  Sliders,
  Brain,
  Briefcase,
  Bookmark,
  Bell,
  Layers
} from 'lucide-react';
import { studentService } from '../../services/StudentService';
import { useStudents } from '../../hooks/useStudents';
import { careerService } from '../../services/CareerService';
import { authService } from '../../services/AuthService';
import { classService } from '../../services/ClassService';
import { exportService } from '../../services/ExportService';
import { ONET_MINI_QUESTIONS, RIASEC_INFO } from '../../data/onetQuestions';
import {
  CareerProfile,
  CareerAssessment,
  RIASECCategory,
  ParentCareerFeedback,
  Student
} from '../../types';
import { Pagination } from '../common/Pagination';
import { RadarHollandChart } from './RadarHollandChart';
import { CareerAIAssistantChat } from './CareerAIAssistantChat';
import { HollandQuickScoreModal } from './HollandQuickScoreModal';
import { MBTIAssessmentSection } from './MBTIAssessmentSection';
import { WorkValuesAssessmentSection } from './WorkValuesAssessmentSection';
import { ComprehensiveCareerResultSection } from './ComprehensiveCareerResultSection';
import { MajorsLookupSection } from './MajorsLookupSection';
import { UniversitiesBenchmarkSection } from './UniversitiesBenchmarkSection';
import { OccupationsLookupSection } from './OccupationsLookupSection';
import { MyChoicesSection } from './MyChoicesSection';
import { AdmissionUpdatesSection } from './AdmissionUpdatesSection';
import { AssessmentHistoryModal } from './AssessmentHistoryModal';
import { AssessmentHistoryCardList } from './AssessmentHistoryCardList';
import { ClassCareerAnalyticsDashboard } from './ClassCareerAnalyticsDashboard';

export const CareerModule: React.FC = () => {
  const students = useStudents();
  const currentUser = authService.getCurrentUser();
  const role = currentUser.role;
  const isTeacher = role === 'TEACHER';
  const isStudent = role === 'STUDENT' || role === 'CLASS_OFFICER';
  const isParent = role === 'PARENT';

  const classSettings = classService.getSettings();

  // Selected student target
  const defaultStudentId = isParent
    ? (currentUser.childStudentId || currentUser.studentId || students[0]?.id || 'hs-01')
    : isStudent
    ? (currentUser.studentId || 'hs-02')
    : (students[0]?.id || 'hs-01');

  const [selectedStudentId, setSelectedStudentId] = useState<string>(defaultStudentId);
  const [activeTab, setActiveTab] = useState<string>('self_discovery');
  const [quizSubTab, setQuizSubTab] = useState<'summary' | 'holland' | 'mbti' | 'work_values'>('summary');
  const [majorsSchoolsSubTab, setMajorsSchoolsSubTab] = useState<'majors' | 'universities'>('majors');
  const [isHollandHistoryModalOpen, setIsHollandHistoryModalOpen] = useState<boolean>(false);
  const [teacherHistoryStudent, setTeacherHistoryStudent] = useState<{
    student: Student;
    type: 'holland' | 'mbti' | 'work_values';
  } | null>(null);

  // Assessments state
  const [assessments, setAssessments] = useState<CareerAssessment[]>([]);
  const [activeAssessmentId, setActiveAssessmentId] = useState<string | null>(null);
  const [isTakingNewQuiz, setIsTakingNewQuiz] = useState<boolean>(false);
  const [isQuickScoreModalOpen, setIsQuickScoreModalOpen] = useState<boolean>(false);

  // In-progress Quiz State
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quizSavedMessage, setQuizSavedMessage] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Parent Feedback Form State
  const [parentFeedbackContent, setParentFeedbackContent] = useState('');
  const [parentFeedbackSubmitted, setParentFeedbackSubmitted] = useState(false);

  // AI Analysis Loading State
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const loadData = () => {
    const allAssessments = careerService.getAllAssessments();
    setAssessments(allAssessments);
  };

  useEffect(() => {
    loadData();
    const unsub = careerService.subscribe(loadData);
    return unsub;
  }, []);

  const selectedStudent = useMemo(() => {
    return students.find((s) => s.id === selectedStudentId) || students[0] || ({
      id: selectedStudentId || 'hs-01',
      fullName: 'Học sinh',
      code: 'HS',
      group: 1,
      gender: 'Nam',
      status: 'Đang học',
      dob: ''
    } as Student);
  }, [students, selectedStudentId]);

  const studentAssessments = useMemo(() => {
    return assessments
      .filter((a) => a.studentId === selectedStudentId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [assessments, selectedStudentId]);

  const currentAssessment = useMemo(() => {
    if (isTakingNewQuiz) return null;
    if (activeAssessmentId) {
      return assessments.find((a) => a.id === activeAssessmentId) || null;
    }
    return studentAssessments.find((a) => a.status === 'completed') || studentAssessments[0] || null;
  }, [assessments, activeAssessmentId, studentAssessments, isTakingNewQuiz]);

  // Load raw answers when viewing an assessment or starting a new draft
  useEffect(() => {
    if (isTakingNewQuiz) {
      setQuizAnswers({});
    } else if (currentAssessment && currentAssessment.rawAnswers) {
      setQuizAnswers(currentAssessment.rawAnswers);
    } else {
      setQuizAnswers({});
    }
  }, [currentAssessment?.id, isTakingNewQuiz]);

  const answeredCount = useMemo(() => {
    return Object.values(quizAnswers).filter((v) => Number(v) > 0).length;
  }, [quizAnswers]);

  const handleAnswer = (qId: number, score: number) => {
    setQuizAnswers((prev) => ({ ...prev, [qId]: score }));
  };

  const handleSaveDraft = () => {
    const calculated = careerService.calculateONetScores(quizAnswers);
    const studentId = selectedStudent?.id || selectedStudentId;
    const studentName = selectedStudent?.fullName || 'Học sinh';
    const studentCode = selectedStudent?.code || '';
    const studentAvatar = selectedStudent?.avatar;

    const draft: Omit<CareerAssessment, 'id' | 'createdAt' | 'updatedAt' | 'attemptNumber'> & { id?: string } = {
      id: isTakingNewQuiz ? undefined : currentAssessment?.id,
      studentId,
      studentName,
      studentCode,
      studentAvatar,
      workspaceId: classSettings.id,
      classId: classSettings.className,
      provider: 'ONET_MINI_INTEREST_PROFILER',
      assessmentType: 'mini_30',
      assessmentVersion: 'O*NET Mini v1.0',
      status: 'draft',
      startedAt: currentAssessment?.startedAt || new Date().toISOString(),
      rawAnswers: quizAnswers,
      scores: calculated.scores,
      riasec: calculated.riasec,
      topInterestCodes: calculated.topInterestCodes,
      primaryCode: calculated.primaryCode,
      codeMeaning: calculated.codeMeaning,
      suggestedMajors: calculated.suggestedMajors,
      suggestedCareers: calculated.suggestedCareers,
      expectedExamCombinations: calculated.suggestedExamCombinations,
      source: 'O*NET Interest Profiler Short Form - US Department of Labor'
    };

    const saved = careerService.saveAssessment(draft);
    setIsTakingNewQuiz(false);
    setActiveAssessmentId(saved.id);
    setQuizSavedMessage('Đã lưu bản nháp bài làm Holland – RIASEC thành công!');
    setTimeout(() => setQuizSavedMessage(null), 3000);
  };

  const handleCompleteAssessment = () => {
    if (answeredCount < 30) {
      if (!window.confirm(`Bạn đã hoàn thành ${answeredCount}/30 câu hỏi. Bạn có muốn nộp bài để tính điểm và phân tích RIASEC ngay?`)) {
        return;
      }
    }

    setIsSubmitting(true);
    const calculated = careerService.calculateONetScores(quizAnswers);
    const studentId = selectedStudent?.id || selectedStudentId;
    const studentName = selectedStudent?.fullName || 'Học sinh';
    const studentCode = selectedStudent?.code || '';
    const studentAvatar = selectedStudent?.avatar;

    const completed: Omit<CareerAssessment, 'id' | 'createdAt' | 'updatedAt' | 'attemptNumber'> & { id?: string } = {
      id: isTakingNewQuiz ? undefined : (currentAssessment?.status === 'draft' ? currentAssessment.id : undefined),
      studentId,
      studentName,
      studentCode,
      studentAvatar,
      workspaceId: classSettings.id,
      classId: classSettings.className,
      provider: 'ONET_MINI_INTEREST_PROFILER',
      assessmentType: 'mini_30',
      assessmentVersion: 'O*NET Mini v1.0',
      status: 'completed',
      startedAt: currentAssessment?.startedAt || new Date().toISOString(),
      completedAt: new Date().toISOString(),
      rawAnswers: quizAnswers,
      scores: calculated.scores,
      riasec: calculated.riasec,
      topInterestCodes: calculated.topInterestCodes,
      primaryCode: calculated.primaryCode,
      codeMeaning: calculated.codeMeaning,
      suggestedMajors: calculated.suggestedMajors,
      suggestedCareers: calculated.suggestedCareers,
      expectedExamCombinations: calculated.suggestedExamCombinations,
      source: 'O*NET Interest Profiler Short Form - US Department of Labor'
    };

    const saved = careerService.saveAssessment(completed);
    setIsTakingNewQuiz(false);
    setActiveAssessmentId(saved.id);
    setIsSubmitting(false);
    setQuizSavedMessage('Chúc mừng bạn đã hoàn thành bài trắc nghiệm Holland – RIASEC (O*NET Mini)!');
    setTimeout(() => setQuizSavedMessage(null), 4000);
  };

  const handleStartNewAssessment = () => {
    setIsTakingNewQuiz(true);
    setActiveAssessmentId(null);
    setQuizAnswers({});
  };

  const handleCancelNewAssessment = () => {
    setIsTakingNewQuiz(false);
    if (studentAssessments.length > 0) {
      setActiveAssessmentId(studentAssessments[0].id);
    }
  };

  const handleParentSubmitFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentFeedbackContent.trim() || !currentAssessment) return;

    careerService.addParentFeedback(currentAssessment.id, {
      parentName: currentUser.name || 'Phụ huynh học sinh',
      content: parentFeedbackContent.trim()
    });

    setParentFeedbackContent('');
    setParentFeedbackSubmitted(true);
    setTimeout(() => setParentFeedbackSubmitted(false), 3000);
  };

  const handleRunAIAnalysis = async () => {
    if (!currentAssessment) return;
    setIsGeneratingAI(true);
    try {
      await careerService.generateAICareerAnalysis(currentAssessment.id);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleExportExcel = () => {
    const data = (students || []).map((s, idx) => {
      const latest = careerService.getLatestAssessmentForStudent(s.id);
      const prof = careerService.getProfile(s.id);

      return {
        'STT': idx + 1,
        'Mã học sinh': s.code,
        'Họ và tên': s.fullName,
        'Tổ': `Tổ ${s.group}`,
        'Mã RIASEC': latest?.primaryCode || prof.primaryCode || 'SEC',
        'Ý nghĩa nhóm': latest?.codeMeaning || 'Xã hội - Quản lý - Nghiệp vụ',
        'Điểm R (Thực tế)': latest ? `${latest.riasec?.R || 0}/25` : `${prof.hollandScores?.realistic || 0}/25`,
        'Điểm I (Nghiên cứu)': latest ? `${latest.riasec?.I || 0}/25` : `${prof.hollandScores?.investigative || 0}/25`,
        'Điểm A (Nghệ thuật)': latest ? `${latest.riasec?.A || 0}/25` : `${prof.hollandScores?.artistic || 0}/25`,
        'Điểm S (Xã hội)': latest ? `${latest.riasec?.S || 0}/25` : `${prof.hollandScores?.social || 0}/25`,
        'Điểm E (Quản lý)': latest ? `${latest.riasec?.E || 0}/25` : `${prof.hollandScores?.enterprising || 0}/25`,
        'Điểm C (Nghiệp vụ)': latest ? `${latest.riasec?.C || 0}/25` : `${prof.hollandScores?.conventional || 0}/25`,
        'Nguyện vọng ngành 1': latest?.suggestedMajors?.[0] || prof.suggestedMajors?.[0] || '',
        'Nguyện vọng ngành 2': latest?.suggestedMajors?.[1] || prof.suggestedMajors?.[1] || '',
        'Tổ hợp môn dự kiến': latest?.expectedExamCombinations?.[0] || prof.examGroups?.[0] || 'D01 (Toán, Văn, Anh)',
        'Trạng thái khảo sát': latest ? 'Đã hoàn thành O*NET' : 'Chưa hoàn thành'
      };
    });

    const clsName = classSettings.className || '11A1';
    exportService.exportToExcel(
      data,
      `Bao_Cao_Huong_Nghiep_Holland_RIASEC_${clsName}_${new Date().toISOString().slice(0, 10)}`,
      'Hướng nghiệp RIASEC'
    );
  };

  const handlePrintAssessment = () => {
    window.print();
  };

  // Filtered Questions for Quiz
  const filteredQuestions = useMemo(() => {
    if (filterCategory === 'all') return ONET_MINI_QUESTIONS;
    return ONET_MINI_QUESTIONS.filter((q) => q.category === filterCategory);
  }, [filterCategory]);

  return (
    <div className="space-y-4 animate-fade-in w-full min-w-0 pb-4">
      {/* Top Banner Card */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs min-w-0">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 min-w-0">
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-amber-100">
              <Compass className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <h1 className="text-base sm:text-lg xl:text-xl font-black text-slate-900 tracking-tight break-words">
                  TRẮC NGHIỆM ĐỊNH HƯỚNG NGHỀ NGHIỆP HOLLAND – RIASEC
                </h1>
                <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 shrink-0">
                  Chuẩn O*NET Mini Profiler
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5 break-words">
                Đồng hành định hướng tương lai, khối thi tốt nghiệp và chọn trường cho học sinh lớp <strong className="text-slate-700">{classSettings.className || '11A1'}</strong>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Student Selector (Visible to Teacher) */}
            {isTeacher && (
              <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700">
                <Users className="h-3.5 w-3.5 text-slate-500" />
                <span>Học sinh:</span>
                <select
                  value={selectedStudentId}
                  onChange={(e) => {
                    setSelectedStudentId(e.target.value);
                    setActiveAssessmentId(null);
                    setIsTakingNewQuiz(false);
                  }}
                  className="bg-transparent font-bold text-slate-900 outline-none cursor-pointer max-w-[170px] truncate"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} - {s.fullName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {isTeacher && (
              <button
                onClick={() => setIsQuickScoreModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100 transition-colors cursor-pointer"
                title="Nhập trực tiếp điểm trắc nghiệm Holland 6 nhóm"
              >
                <Sliders className="h-3.5 w-3.5 text-amber-700" />
                <span>Nhập điểm Holland</span>
              </button>
            )}

            {isTeacher && (
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors cursor-pointer"
                title="Xuất bảng tổng hợp hướng nghiệp cả lớp ra Excel"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span>Xuất Báo cáo Excel</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 sm:gap-2 border-t border-slate-100 mt-5 pt-4 overflow-x-auto scrollbar-thin">
          <button
            onClick={() => setActiveTab('self_discovery')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'self_discovery' || activeTab === 'onet_quiz'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Compass className="h-4 w-4" />
            <span>1. Khám phá bản thân</span>
          </button>

          <button
            onClick={() => setActiveTab('occupations')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'occupations'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Briefcase className="h-4 w-4" />
            <span>2. Tìm hiểu nghề nghiệp</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('majors_schools');
              setMajorsSchoolsSubTab('majors');
            }}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'majors_schools' || activeTab === 'majors' || activeTab === 'universities'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span>3. Tìm ngành – Tìm trường</span>
          </button>

          <button
            onClick={() => setActiveTab('my_choices')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'my_choices'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Bookmark className="h-4 w-4" />
            <span>4. Lựa chọn của tôi</span>
          </button>

          <button
            onClick={() => setActiveTab('admissions')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'admissions'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Bell className="h-4 w-4" />
            <span>5. Tin tức tuyển sinh</span>
          </button>

          <button
            onClick={() => setActiveTab('ai_consultant')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'ai_consultant'
                ? 'bg-indigo-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span>Trợ lý AI Sư phạm</span>
          </button>

          {isTeacher && (
            <button
              onClick={() => setActiveTab('matrix')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'matrix'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Thống kê & Phân tích Hướng nghiệp Lớp</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: KHÁM PHÁ BẢN THÂN (HOLLAND RIASEC, MBTI, GIÁ TRỊ NGHỀ NGHIỆP)       */}
      {/* ========================================================================= */}
      {(activeTab === 'self_discovery' || activeTab === 'onet_quiz') && (
        <div className="space-y-4">
          {/* Sub-navigation: Trung tâm Khám phá Nghề nghiệp */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100/90 border border-slate-200 overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setQuizSubTab('summary')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                quizSubTab === 'summary'
                  ? 'bg-white text-indigo-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Award className="h-4 w-4 text-amber-500" />
              <span>Kết quả khám phá nghề nghiệp</span>
            </button>

            <button
              type="button"
              onClick={() => setQuizSubTab('holland')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                quizSubTab === 'holland'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Compass className="h-4 w-4" />
              <span>1. Holland RIASEC</span>
            </button>

            <button
              type="button"
              onClick={() => setQuizSubTab('mbti')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                quizSubTab === 'mbti'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Brain className="h-4 w-4" />
              <span>2. Khung MBTI</span>
            </button>

            <button
              type="button"
              onClick={() => setQuizSubTab('work_values')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                quizSubTab === 'work_values'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Briefcase className="h-4 w-4" />
              <span>3. Giá trị & Sở thích</span>
            </button>
          </div>

          {/* Sub-tab: Summary */}
          {quizSubTab === 'summary' && (
            <ComprehensiveCareerResultSection
              student={selectedStudent}
              currentAssessment={currentAssessment}
              onNavigateToMajors={() => setActiveTab('majors')}
              onNavigateToUnis={() => setActiveTab('universities')}
              onSelectTestTab={(t) => setQuizSubTab(t)}
            />
          )}

          {/* Sub-tab: MBTI */}
          {quizSubTab === 'mbti' && (
            <MBTIAssessmentSection
              student={selectedStudent}
              isStudent={isStudent}
              onNavigateToMajors={() => setActiveTab('majors')}
              onNavigateToUnis={() => setActiveTab('universities')}
            />
          )}

          {/* Sub-tab: Work Values & Interests */}
          {quizSubTab === 'work_values' && (
            <WorkValuesAssessmentSection
              student={selectedStudent}
              isStudent={isStudent}
              onNavigateToMajors={() => setActiveTab('majors')}
              onNavigateToUnis={() => setActiveTab('universities')}
            />
          )}

          {/* Sub-tab: Holland RIASEC */}
          {quizSubTab === 'holland' && (
            <div className="space-y-4">
              {/* Status Message */}
              {quizSavedMessage && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800 flex items-center gap-2 shadow-xs">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{quizSavedMessage}</span>
                </div>
              )}

              {/* Student Profile Overview Spotlight */}
              <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 min-w-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 font-black text-sm">
                  {(selectedStudent?.fullName || 'HS').charAt(0)}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-extrabold text-slate-900 flex flex-wrap items-center gap-2">
                    <span>Hồ sơ Hướng nghiệp: {selectedStudent?.fullName || 'Học sinh'}</span>
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 shrink-0">
                      Mã: {selectedStudent?.code || 'HS'} • Tổ {selectedStudent?.group || 1}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {studentAssessments.length > 0
                      ? `Đã thực hiện ${studentAssessments.length} lần khảo sát Holland/RIASEC`
                      : 'Chưa có dữ liệu trắc nghiệm Holland/RIASEC'}
                  </p>
                </div>
              </div>

              {/* Actions: Print / History / New Attempt */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {studentAssessments.length > 0 && !isTakingNewQuiz && (
                  <button
                    type="button"
                    onClick={() => setIsHollandHistoryModalOpen(true)}
                    className="flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100 transition-colors cursor-pointer shadow-2xs"
                  >
                    <History className="h-3.5 w-3.5 text-amber-700" />
                    <span>Lịch sử & So sánh ({studentAssessments.length} lần)</span>
                  </button>
                )}

                {currentAssessment?.status === 'completed' && !isTakingNewQuiz && (
                  <button
                    onClick={handlePrintAssessment}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <Printer className="h-3.5 w-3.5 text-slate-600" />
                    <span>In Phiếu kết quả</span>
                  </button>
                )}

                {!isTakingNewQuiz && (
                  <button
                    onClick={handleStartNewAssessment}
                    className="flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-amber-700 transition-colors cursor-pointer shadow-xs"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>+ Làm bài khảo sát mới</span>
                  </button>
                )}

                {isTakingNewQuiz && (
                  <button
                    onClick={handleCancelNewAssessment}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5 text-slate-500" />
                    <span>Quay lại kết quả trước</span>
                  </button>
                )}
              </div>
            </div>

            {/* Assessment History Selector Pills */}
            {!isTakingNewQuiz && studentAssessments.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-1 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 mr-1">
                  <History className="h-3.5 w-3.5 text-amber-600" />
                  <span>Lịch sử các lần khảo sát ({studentAssessments.length}):</span>
                </div>
                {studentAssessments.map((ast, idx) => {
                  const isSelected = (currentAssessment?.id === ast.id);
                  const attemptLabel = `Lần ${studentAssessments.length - idx}: ${ast.primaryCode || 'RIASEC'} (${ast.createdAt || ast.updatedAt || 'Mới nhất'})`;
                  return (
                    <button
                      key={ast.id}
                      onClick={() => {
                        setIsTakingNewQuiz(false);
                        setActiveAssessmentId(ast.id);
                      }}
                      className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      <span>{attemptLabel}</span>
                      {ast.status === 'completed' ? (
                        <CheckCircle2 className={`h-3 w-3 ${isSelected ? 'text-white' : 'text-emerald-600'}`} />
                      ) : (
                        <span className="rounded bg-amber-100 text-amber-800 text-[10px] px-1">Nháp</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Standard Disclaimer Notice */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5 flex items-start gap-2.5 text-xs text-amber-900">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">Khuyến cáo sư phạm:</strong> Kết quả trắc nghiệm Holland/RIASEC mang tính tham khảo định hướng sư phạm, không phải kết luận nghề nghiệp cuối cùng. Học sinh và Phụ huynh nên kết hợp năng lực học tập thực tế và tư vấn của GVCN.
              </div>
            </div>

            {/* Banner when viewing a past attempt */}
            {!isTakingNewQuiz && studentAssessments.length > 1 && currentAssessment && currentAssessment.id !== studentAssessments[0].id && (
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/80 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-indigo-950 shadow-2xs">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-indigo-600 shrink-0" />
                  <span>
                    Bạn đang xem lại kết quả chi tiết của <strong>Lần {currentAssessment.attemptNumber || 'trước'}</strong> ({currentAssessment.createdAt || 'bản ghi lịch sử'}).
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveAssessmentId(studentAssessments[0].id)}
                  className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 transition-colors shrink-0 cursor-pointer self-start sm:self-auto"
                >
                  Xem kết quả gần nhất (Lần {studentAssessments[0].attemptNumber || studentAssessments.length})
                </button>
              </div>
            )}

            {/* If Student Has Completed Assessment and not taking new quiz: Display RIASEC Radar / Bars */}
            {!isTakingNewQuiz && currentAssessment?.status === 'completed' && (
              <div className="space-y-6 min-w-0">
                {/* Result Highlights */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-w-0">
                  {/* Primary Code Banner */}
                  <div className="rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 p-4 space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                      Mã Holland / RIASEC Nổi trội
                    </div>
                    <div className="text-2xl font-black text-amber-950">
                      {currentAssessment.primaryCode}
                    </div>
                    <div className="text-xs font-bold text-amber-700">
                      {currentAssessment.codeMeaning}
                    </div>
                    <p className="text-[11px] text-amber-900/80 leading-relaxed pt-1 border-t border-amber-200">
                      Nhóm đặc trưng chiếm ưu thế cao nhất trong năng lực tư duy, sở thích hoạt động và phong cách nghề nghiệp.
                    </p>
                  </div>

                  {/* Recommended Majors */}
                  <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-blue-800 flex items-center gap-1">
                      <GraduationCap className="h-3.5 w-3.5" />
                      <span>Ngành đào tạo đề xuất</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {(currentAssessment.suggestedMajors || []).map((m, idx) => (
                        <span
                          key={idx}
                          className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-blue-900 border border-blue-200 shadow-2xs"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Expected Exam Combinations */}
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                      <Target className="h-3.5 w-3.5" />
                      <span>Tổ hợp môn THPT phù hợp</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {(currentAssessment.expectedExamCombinations || ['A00', 'A01', 'D01']).map((e, idx) => (
                        <span
                          key={idx}
                          className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-emerald-900 border border-emerald-200 shadow-2xs"
                        >
                          {e}
                        </span>
                      ))}
                    </div>
                    <div className="text-[10px] text-emerald-700">
                      Đồng bộ với phân tích kết quả học tập các môn thế mạnh của học sinh.
                    </div>
                  </div>
                </div>

                {/* Radar Holland SVG Chart */}
                <RadarHollandChart
                  currentAssessment={currentAssessment}
                  allAssessments={studentAssessments}
                />

                {/* 6 RIASEC Bars Distribution */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <BarChart3 className="h-4 w-4 text-amber-600" />
                      <span>Phân bố điểm số 6 nhóm RIASEC (Thang điểm 0 - 25)</span>
                    </h4>
                    <span className="text-[11px] text-slate-400 font-semibold">
                      Chuẩn O*NET Interest Profiler
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {(['R', 'I', 'A', 'S', 'E', 'C'] as RIASECCategory[]).map((cat) => {
                      const info = RIASEC_INFO[cat];
                      const score = currentAssessment.riasec[cat] || 0;
                      const percentage = Math.min(100, Math.round((score / 25) * 100));
                      const isTop = currentAssessment.topInterestCodes.includes(cat);

                      return (
                        <div
                          key={cat}
                          className={`rounded-xl border p-3 bg-white space-y-2 ${
                            isTop ? 'border-amber-300 ring-2 ring-amber-400/20 shadow-2xs' : 'border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span
                                className="flex h-6 w-6 items-center justify-center rounded-lg text-white font-black text-xs"
                                style={{ backgroundColor: info.color }}
                              >
                                {cat}
                              </span>
                              <span className="text-xs font-black text-slate-900">{info.vietnameseName || info.name}</span>
                            </div>
                            <span className="text-xs font-black text-slate-900">
                              {score}/25 đ <span className="text-[10px] text-slate-400">({percentage}%)</span>
                            </span>
                          </div>

                          {/* Progress bar */}
                          <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${percentage}%`, backgroundColor: info.color }}
                            />
                          </div>

                          <div className="text-[10px] text-slate-500 line-clamp-1">
                            {((info as any)?.traits || (info as any)?.characteristics || [])?.join(' • ') || (info as any)?.description || ''}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* AI Career Analysis Section */}
                <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/50 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-indigo-600" />
                      <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                        Phân tích Sư phạm & Tư vấn Hướng nghiệp từ AI
                      </h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setActiveTab('ai_consultant')}
                        className="flex items-center gap-1.5 rounded-xl border border-indigo-300 bg-white px-3.5 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-50 transition-all cursor-pointer"
                      >
                        <Bot className="h-3.5 w-3.5" />
                        <span>Chat với Trợ lý AI</span>
                      </button>

                      <button
                        onClick={handleRunAIAnalysis}
                        disabled={isGeneratingAI}
                        className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Sparkles className={`h-3.5 w-3.5 ${isGeneratingAI ? 'animate-spin' : ''}`} />
                        <span>{currentAssessment.aiAnalysis ? 'Cập nhật phân tích AI' : 'Tạo phân tích AI'}</span>
                      </button>
                    </div>
                  </div>

                  {currentAssessment.aiAnalysis ? (
                    <div className="space-y-3.5 text-xs leading-relaxed text-slate-800">
                      <div className="rounded-xl bg-white p-3.5 border border-indigo-100 space-y-2">
                        <div className="font-bold text-indigo-900">1. Tóm tắt thế mạnh & phong cách học tập:</div>
                        <p className="text-slate-700">{currentAssessment.aiAnalysis.strengthsSummary}</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="rounded-xl bg-white p-3.5 border border-indigo-100 space-y-1.5">
                          <div className="font-bold text-indigo-900">2. Môi trường làm việc phù hợp:</div>
                          <ul className="list-disc pl-4 space-y-1 text-slate-700">
                            {(currentAssessment.aiAnalysis.recommendedWorkEnvironments || []).map((env, i) => (
                              <li key={i}>{env}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="rounded-xl bg-white p-3.5 border border-indigo-100 space-y-1.5">
                          <div className="font-bold text-indigo-900">3. Câu hỏi tự phản tư cho học sinh:</div>
                          <ul className="list-disc pl-4 space-y-1 text-slate-700">
                            {(currentAssessment.aiAnalysis.selfExplorationQuestions || []).map((q, i) => (
                              <li key={i}>{q}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="rounded-xl bg-white p-3.5 border border-indigo-100 space-y-1.5">
                        <div className="font-bold text-indigo-900">4. Lộ trình hành động 1-3 tháng tới:</div>
                        <ul className="list-disc pl-4 space-y-1 text-slate-700">
                          {(currentAssessment.aiAnalysis.roadmap1to3Months || []).map((r, i) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                      </div>

                      {/* Disclaimer */}
                      <div className="rounded-xl bg-amber-50/70 border border-amber-200 p-3 text-[11px] text-amber-900 flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                        <span>
                          <strong>Khuyến cáo sư phạm:</strong> {currentAssessment.aiAnalysis.disclaimer || 'Kết quả mang tính tham khảo sư phạm.'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-xs text-slate-400 space-y-2">
                      <p>Chưa có bản phân tích hướng nghiệp chuyên sâu từ AI.</p>
                      <p className="text-[11px]">Bấm nút "Tạo phân tích AI" phía trên để nhận báo cáo tham vấn hướng nghiệp toàn diện.</p>
                    </div>
                  )}
                </div>

                {/* Parent Feedback Block */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <MessageSquare className="h-4 w-4 text-emerald-600" />
                      <span>Ý kiến & Nguyện vọng từ Phụ huynh ({currentAssessment.parentFeedbacks?.length || 0})</span>
                    </h4>
                  </div>

                  {/* List of existing feedback */}
                  {currentAssessment.parentFeedbacks && currentAssessment.parentFeedbacks.length > 0 ? (
                    <div className="space-y-2.5">
                      {(currentAssessment.parentFeedbacks || []).map((fb) => (
                        <div key={fb.id} className="rounded-xl bg-slate-50 p-3 border border-slate-200 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">{fb.parentName}</span>
                            <span className="text-[10px] text-slate-400">{fb.createdAt}</span>
                          </div>
                          <p className="text-slate-700">{fb.content}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 italic">
                      Chưa có phản hồi hoặc ghi chú từ phụ huynh.
                    </div>
                  )}

                  {/* Form for Parent */}
                  {isParent && (
                    <form onSubmit={handleParentSubmitFeedback} className="space-y-3 pt-3 border-t border-slate-100">
                      <label className="block text-xs font-bold text-slate-700">
                        Gửi ý kiến đóng góp / Định hướng của gia đình cho học sinh:
                      </label>
                      <textarea
                        rows={3}
                        value={parentFeedbackContent}
                        onChange={(e) => setParentFeedbackContent(e.target.value)}
                        placeholder="Nhập tâm tư, nguyện vọng chọn ngành hoặc lời nhắn gửi của phụ huynh gửi tới GVCN..."
                        className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                      />
                      <div className="flex items-center justify-between">
                        {parentFeedbackSubmitted && (
                          <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                            <Check className="h-3.5 w-3.5" /> Đã gửi phản hồi thành công!
                          </span>
                        )}
                        <button
                          type="submit"
                          disabled={!parentFeedbackContent.trim()}
                          className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-bold text-white transition-colors cursor-pointer disabled:opacity-50 ml-auto"
                        >
                          <Send className="h-3.5 w-3.5" />
                          <span>Gửi ý kiến phụ huynh</span>
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}

            {/* Dedicated List of All Historical Attempts (Cards with View & Retake) */}
            {!isTakingNewQuiz && studentAssessments.length > 0 && (
              <AssessmentHistoryCardList
                title="Holland – RIASEC"
                testType="holland"
                items={studentAssessments.map((ast, idx) => ({
                  id: ast.id,
                  attemptNumber: ast.attemptNumber || studentAssessments.length - idx,
                  dateStr: ast.createdAt || ast.updatedAt || '---',
                  codeOrTitle: ast.primaryCode || 'RIASEC',
                  subSummary: ast.codeMeaning || (ast.suggestedMajors || []).slice(0, 2).join(', '),
                  isLatest: idx === 0,
                  isSelectedForView: currentAssessment?.id === ast.id,
                  rawItem: ast
                }))}
                onSelectAttemptToView={(item) => {
                  setIsTakingNewQuiz(false);
                  setActiveAssessmentId(item.id);
                }}
                onStartNewAttempt={handleStartNewAssessment}
                onOpenCompareModal={() => setIsHollandHistoryModalOpen(true)}
                isTakingQuiz={isTakingNewQuiz}
                themeColor="amber"
              />
            )}

            {/* Quiz Questionnaire Area (When taking new quiz or editing draft) */}
            {(isTakingNewQuiz || currentAssessment?.status === 'draft' || !currentAssessment) && (
              <div className="space-y-6 pt-2">
                {/* Progress bar */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">
                      Tiến độ làm bài khảo sát O*NET Mini (30 câu hỏi)
                    </span>
                    <span className="font-black text-amber-700">
                      {answeredCount}/30 câu ({Math.round((answeredCount / 30) * 100)}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-500 transition-all duration-300"
                      style={{ width: `${(answeredCount / 30) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Category Filter Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  <button
                    onClick={() => setFilterCategory('all')}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                      filterCategory === 'all'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Tất cả (30 câu)
                  </button>
                  {(['R', 'I', 'A', 'S', 'E', 'C'] as RIASECCategory[]).map((cat) => {
                    const info = RIASEC_INFO[cat];
                    const catCount = ONET_MINI_QUESTIONS.filter(
                      (q) => q.category === cat && quizAnswers[q.id] !== undefined
                    ).length;
                    return (
                      <button
                        key={cat}
                        onClick={() => setFilterCategory(cat)}
                        className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                          filterCategory === cat
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: info.color }}
                        />
                        <span>{info.name}</span>
                        <span className="text-[10px] opacity-70">({catCount}/5)</span>
                      </button>
                    );
                  })}
                </div>

                {/* Questions List */}
                <div className="space-y-3">
                  {filteredQuestions.map((q) => {
                    const ans = quizAnswers[q.id];
                    const catInfo = RIASEC_INFO[q.category];

                    return (
                      <div
                        key={q.id}
                        className={`rounded-2xl border p-4 transition-all bg-white ${
                          ans !== undefined
                            ? 'border-amber-300 bg-amber-50/20 shadow-2xs'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 min-w-0">
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-black text-slate-700">
                                Câu {q.id}
                              </span>
                              <span
                                className="rounded-lg text-white font-black text-[10px] px-2 py-0.5"
                                style={{ backgroundColor: catInfo.color }}
                              >
                                {catInfo.name} ({q.category})
                              </span>
                            </div>
                            <h4 className="text-xs font-bold text-slate-900 leading-relaxed break-words">
                              {(q as any).activityText || (q as any).prompt || (q as any).text}
                            </h4>
                            {(q as any).exampleJob && (
                              <p className="text-[11px] text-slate-400 break-words">
                                Ví dụ công việc liên quan: {(q as any).exampleJob}
                              </p>
                            )}
                          </div>

                          {/* Likert Scale (1 = Rất ghét, 5 = Rất thích) */}
                          <div className="flex items-center gap-1.5 shrink-0 self-start md:self-center">
                            {[
                              { score: 1, label: 'Rất không thích', color: 'hover:bg-rose-100 active:bg-rose-200' },
                              { score: 2, label: 'Không thích', color: 'hover:bg-orange-100 active:bg-orange-200' },
                              { score: 3, label: 'Bình thường', color: 'hover:bg-slate-100 active:bg-slate-200' },
                              { score: 4, label: 'Thích', color: 'hover:bg-blue-100 active:bg-blue-200' },
                              { score: 5, label: 'Rất thích', color: 'hover:bg-emerald-100 active:bg-emerald-200' }
                            ].map((opt) => {
                              const isChosen = ans === opt.score;
                              return (
                                <button
                                  key={opt.score}
                                  type="button"
                                  onClick={() => handleAnswer(q.id, opt.score)}
                                  title={opt.label}
                                  className={`flex h-9 w-9 items-center justify-center rounded-xl font-black text-xs transition-all cursor-pointer ${
                                    isChosen
                                      ? 'bg-amber-600 text-white shadow-xs scale-105 ring-2 ring-amber-400'
                                      : `bg-slate-100 text-slate-700 ${opt.color}`
                                  }`}
                                >
                                  {opt.score}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Save Draft / Submit Button Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
                  <div className="text-xs text-slate-500">
                    Thang điểm: <strong>1: Rất không thích</strong> → <strong>5: Rất thích</strong>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSaveDraft}
                      className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                    >
                      <Save className="h-3.5 w-3.5" />
                      <span>Lưu bản nháp</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCompleteAssessment}
                      disabled={isSubmitting}
                      className="flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 px-5 py-2.5 text-xs font-bold text-white shadow-xs transition-all cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Nộp bài & Phân tích RIASEC</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: TRỢ LÝ CỐ VẤN AI SƯ PHẠM (MULTI-TURN CHAT)                           */}
      {/* ========================================================================= */}
      {activeTab === 'ai_consultant' && (
        <div className="space-y-4">
          <CareerAIAssistantChat
            studentId={selectedStudentId}
            currentAssessment={currentAssessment}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: TÌM HIỂU NGHỀ NGHIỆP                                               */}
      {/* ========================================================================= */}
      {activeTab === 'occupations' && (
        <OccupationsLookupSection
          student={selectedStudent}
          onNavigateToMajors={() => {
            setActiveTab('majors_schools');
            setMajorsSchoolsSubTab('majors');
          }}
          onNavigateToSaved={() => setActiveTab('my_choices')}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 3: TÌM NGÀNH – TÌM TRƯỜNG                                             */}
      {/* ========================================================================= */}
      {(activeTab === 'majors_schools' || activeTab === 'majors' || activeTab === 'universities') && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-1 rounded-2xl bg-slate-100 border border-slate-200 w-fit">
            <button
              type="button"
              onClick={() => setMajorsSchoolsSubTab('majors')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                majorsSchoolsSubTab === 'majors'
                  ? 'bg-white text-indigo-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="h-4 w-4 text-indigo-600" />
              <span>Tra cứu Ngành đào tạo</span>
            </button>
            <button
              type="button"
              onClick={() => setMajorsSchoolsSubTab('universities')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                majorsSchoolsSubTab === 'universities'
                  ? 'bg-white text-indigo-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="h-4 w-4 text-amber-600" />
              <span>Trường Đại học & Điểm chuẩn</span>
            </button>
          </div>

          {majorsSchoolsSubTab === 'majors' ? (
            <MajorsLookupSection
              student={selectedStudent}
              currentAssessment={currentAssessment}
              onNavigateToUnis={() => setMajorsSchoolsSubTab('universities')}
            />
          ) : (
            <UniversitiesBenchmarkSection
              onNavigateToMajors={() => setMajorsSchoolsSubTab('majors')}
            />
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: LỰA CHỌN CỦA TÔI                                                   */}
      {/* ========================================================================= */}
      {activeTab === 'my_choices' && (
        <MyChoicesSection
          student={selectedStudent}
          onNavigateToOccupations={() => setActiveTab('occupations')}
          onNavigateToMajors={() => {
            setActiveTab('majors_schools');
            setMajorsSchoolsSubTab('majors');
          }}
          onNavigateToUnis={() => {
            setActiveTab('majors_schools');
            setMajorsSchoolsSubTab('universities');
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 5: TIN TỨC TUYỂN SINH                                                 */}
      {/* ========================================================================= */}
      {activeTab === 'admissions' && (
        <AdmissionUpdatesSection
          isTeacherOrAdmin={isTeacher || role === 'SUPER_ADMIN'}
          onNavigateToUnis={() => {
            setActiveTab('majors_schools');
            setMajorsSchoolsSubTab('universities');
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB: THỐNG KÊ & PHÂN TÍCH HƯỚNG NGHIỆP CỦA LỚP (DÀNH CHO GVCN)            */}
      {/* ========================================================================= */}
      {activeTab === 'matrix' && isTeacher && (
        <ClassCareerAnalyticsDashboard
          students={students}
          className={classSettings.className || '11A1'}
          onSelectStudentProfile={(studentId) => {
            setSelectedStudentId(studentId);
            setActiveTab('self_discovery');
            setQuizSubTab('summary');
          }}
        />
      )}

      {/* Holland Quick Score Direct Entry Modal */}
      {isQuickScoreModalOpen && (
        <HollandQuickScoreModal
          student={selectedStudent}
          isOpen={isQuickScoreModalOpen}
          onClose={() => setIsQuickScoreModalOpen(false)}
          onSaved={(newAssessment) => {
            loadData();
            setActiveAssessmentId(newAssessment.id);
            setIsTakingNewQuiz(false);
          }}
        />
      )}

      {/* Holland Multi-Attempt History & Compare Modal */}
      {isHollandHistoryModalOpen && (
        <AssessmentHistoryModal
          student={selectedStudent}
          assessmentType="holland"
          title="Trắc nghiệm Holland – RIASEC"
          historyList={studentAssessments}
          onClose={() => setIsHollandHistoryModalOpen(false)}
          onSelectAttemptToView={(attempt) => {
            setIsTakingNewQuiz(false);
            setActiveAssessmentId(attempt.id);
          }}
        />
      )}

      {/* Teacher / School Dedicated Assessment History & Comparison Modal */}
      {teacherHistoryStudent && (
        <AssessmentHistoryModal
          student={teacherHistoryStudent.student}
          assessmentType={teacherHistoryStudent.type}
          title={
            teacherHistoryStudent.type === 'holland'
              ? 'Trắc nghiệm Holland RIASEC'
              : teacherHistoryStudent.type === 'mbti'
              ? 'Khảo sát xu hướng MBTI'
              : 'Khảo sát Giá trị nghề nghiệp'
          }
          historyList={
            teacherHistoryStudent.type === 'holland'
              ? careerService.getHollandHistory(teacherHistoryStudent.student.id)
              : teacherHistoryStudent.type === 'mbti'
              ? careerService.getMBTIHistory(teacherHistoryStudent.student.id)
              : careerService.getWorkValuesHistory(teacherHistoryStudent.student.id)
          }
          onClose={() => setTeacherHistoryStudent(null)}
          onSelectAttemptToView={(attempt) => {
            setSelectedStudentId(teacherHistoryStudent.student.id);
            setActiveTab('self_discovery');
            setQuizSubTab(teacherHistoryStudent.type);
            if (teacherHistoryStudent.type === 'holland') {
              setActiveAssessmentId(attempt.id);
            }
            setTeacherHistoryStudent(null);
          }}
        />
      )}
    </div>
  );
};
