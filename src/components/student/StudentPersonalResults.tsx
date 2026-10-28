/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  GraduationCap,
  Award,
  BookOpen,
  FileSpreadsheet,
  Download,
  Eye,
  FileText,
  Calendar,
  Clock,
  Sparkles,
  TreePine,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Paperclip,
  Send,
  X,
  Upload,
  User,
  ShieldCheck,
  TrendingUp,
  MessageSquare
} from 'lucide-react';
import {
  StudentAcademicRecord,
  SharedGradeFile,
  PointTransaction,
  LaurelTree,
  Student,
  AttachedFile,
  AdjustmentReport,
  AcademicPeriod,
  ConductEvaluationPeriodType
} from '../../types';
import { academicService, PERIOD_NAMES, calculateSubjectAverage, isEnteredValidScore } from '../../services/AcademicService';
import { trainingService } from '../../services/TrainingService';
import { submissionService } from '../../services/SubmissionService';
import { studentService } from '../../services/StudentService';
import { authService } from '../../services/AuthService';
import { classService } from '../../services/ClassService';
import { conductEvaluationService } from '../../services/ConductEvaluationService';
import { graduationService } from '../../services/GraduationService';
import { GraduationRegistration } from '../../types';
import { FilePreviewModal } from '../common/FilePreviewModal';
import { getVietnameseSubjectFullName } from '../../utils/subjectHelpers';
import { StudentConductSelfAssessmentModal } from '../training/StudentConductSelfAssessmentModal';

export const StudentPersonalResults: React.FC = () => {
  const currentUser = authService.getCurrentUser();
  const classSettings = classService.getSettings();
  const isParent = currentUser.role === 'PARENT';
  const isTeacherOrAdmin = currentUser.role === 'TEACHER' || (currentUser.role as any) === 'SUPER_ADMIN';
  const allStudents = studentService.getStudents();
  const currentUserIdStudent = currentUser.studentId || 
    (currentUser.id?.startsWith('usr_stu_') ? currentUser.id.replace('usr_stu_', '') : '') ||
    (allStudents.find(s => s.code?.toLowerCase() === currentUser.id?.toLowerCase() || s.email === currentUser.email)?.id);
  const defaultFallbackId = isTeacherOrAdmin && allStudents.length > 0 ? allStudents[0].id : '';
  // Strictly bound to the current logged-in student or child of parent
  const rawTargetStudentId = isParent
    ? (currentUser.childStudentId || currentUser.studentId || '')
    : isTeacherOrAdmin
    ? (currentUser.studentId || defaultFallbackId)
    : (currentUserIdStudent || '');
  const studentInfo: Student | undefined = studentService.getById(rawTargetStudentId) || allStudents.find(s => s.code?.toLowerCase() === rawTargetStudentId?.toLowerCase());
  const studentId = studentInfo?.id || rawTargetStudentId;

  const [selectedPeriod, setSelectedPeriod] = useState<AcademicPeriod>('midterm_hk1');
  const [academicRecord, setAcademicRecord] = useState<StudentAcademicRecord>(
    academicService.getStudentAcademicRecord(studentId, selectedPeriod)
  );
  const [sharedFiles, setSharedFiles] = useState<SharedGradeFile[]>([]);
  const [trainingLogs, setTrainingLogs] = useState<PointTransaction[]>([]);
  // Violation records for the student from StudentService
  const studentViolations = React.useMemo(() => {
    return studentService.getStudentViolationRecords(studentId);
  }, [studentId]);
  const [studentTree, setStudentTree] = useState<LaurelTree | undefined>(
    trainingService.getStudentTree(studentId)
  );

  // Active sub-tab: 'all' | 'academic' | 'training'
  const [activeTab, setActiveTab] = useState<'all' | 'academic' | 'training'>('all');

  // Preview file modal
  const [previewFile, setPreviewFile] = useState<AttachedFile | null>(null);

  // Adjustment report modal
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportCategory, setReportCategory] = useState<'Học tập' | 'Rèn luyện' | 'Khen thưởng' | 'Khác'>('Học tập');
  const [reportDescription, setReportDescription] = useState('');
  const [reportFiles, setReportFiles] = useState<AttachedFile[]>([]);
  const [reportSubmittedSuccess, setReportSubmittedSuccess] = useState(false);

  // Student Conduct Self-Assessment modal state
  const [isSelfAssessmentModalOpen, setIsSelfAssessmentModalOpen] = useState(false);
  const [selfAssessmentPeriod, setSelfAssessmentPeriod] = useState<ConductEvaluationPeriodType>('SEMESTER_1');

  const [graduationRecord, setGraduationRecord] = useState<GraduationRegistration | undefined>(() =>
    graduationService.getByStudentId(studentId)
  );

  const loadData = () => {
    setAcademicRecord(academicService.getStudentAcademicRecord(studentId, selectedPeriod));
    setSharedFiles(
      academicService.getSharedGradeFiles({
        studentId,
        period: selectedPeriod,
        isStudent: !isParent,
        isParent: isParent
      })
    );
    setTrainingLogs(trainingService.getStudentTransactions(studentId));
    setStudentTree(trainingService.getStudentTree(studentId));
    setGraduationRecord(graduationService.getByStudentId(studentId));
  };

  useEffect(() => {
    graduationService.fetchFromServer();
    academicService.syncWithBackendServer().catch(() => {});
  }, [studentId]);

  useEffect(() => {
    loadData();
    const unsubAcademic = academicService.subscribe(loadData);
    const unsubTraining = trainingService.subscribe(loadData);
    const unsubConduct = conductEvaluationService.subscribe(loadData);
    const unsubGraduation = graduationService.subscribe(loadData);
    const unsubStudent = studentService.subscribe(loadData);
    return () => {
      unsubAcademic();
      unsubTraining();
      unsubConduct();
      unsubGraduation();
      unsubStudent();
    };
  }, [studentId, selectedPeriod]);

  // Calculate training stats from valid approved transactions
  const validApprovedTxs = trainingLogs.filter(
    (t) => (String(t.status || '').toLowerCase() === 'approved' || String(t.reviewStatus || '').toLowerCase() === 'approved') && !t.isReversed
  );

  const totalPositivePoints = validApprovedTxs
    .filter((t) => t.points > 0)
    .reduce((sum, t) => sum + t.points, 0);

  const totalNegativePoints = validApprovedTxs
    .filter((t) => t.points < 0 && !t.isReversal)
    .reduce((sum, t) => sum + Math.abs(t.points), 0);

  const netTrainingPoints = totalPositivePoints - totalNegativePoints;

  // Compute absences combining recorded academic record and approved training logs
  const loggedExcusedAbsences = validApprovedTxs.filter(
    (t) => t.category === 'Nghỉ có phép' || t.reason?.toLowerCase().includes('nghỉ có phép') || t.reason?.toLowerCase().includes('ốm có phép')
  ).length;

  const loggedUnexcusedAbsences = validApprovedTxs.filter(
    (t) => t.category === 'Nghỉ không phép' || t.reason?.toLowerCase().includes('nghỉ không phép')
  ).length;

  const finalExcusedAbsences = Math.max(academicRecord.excusedAbsences ?? 0, loggedExcusedAbsences);
  const finalUnexcusedAbsences = Math.max(academicRecord.unexcusedAbsences ?? 0, loggedUnexcusedAbsences);

  const handleSubmitAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportDescription.trim()) return;

    const studentFullName = studentInfo?.fullName || currentUser.name;

    // 1. Submit to Training Adjustment Reports
    trainingService.submitAdjustmentReport({
      studentId,
      studentName: studentFullName,
      category: reportCategory,
      description: reportDescription.trim(),
      evidenceFiles: reportFiles
    });

    // 2. Also register in SubmissionService so GVCN sees in Approval Center
    submissionService.createSubmission(
      {
        studentId,
        studentName: studentFullName,
        studentGroup: studentInfo?.group || 1,
        submissionType: reportCategory === 'Học tập' ? 'academic_error' : 'training_error',
        category: reportCategory === 'Học tập' ? 'Đề xuất điều chỉnh điểm học tập' : 'Đề xuất điều chỉnh điểm rèn luyện',
        description: `[Đề nghị điều chỉnh - ${reportCategory}] ${reportDescription.trim()}`,
        proposedPoints: 0,
        evidence: reportFiles,
        parentVisible: true
      },
      currentUser
    );

    setReportSubmittedSuccess(true);
    setTimeout(() => {
      setReportSubmittedSuccess(false);
      setIsReportModalOpen(false);
      setReportDescription('');
      setReportFiles([]);
    }, 1500);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((f: File, i: number) => {
      const reader = new FileReader();
      const isImg = f.type.includes('image') || /\.(jpeg|jpg|png|webp|gif|svg)$/i.test(f.name);
      
      reader.onload = (event) => {
        const fileUrl = (event.target?.result as string) || URL.createObjectURL(f);
        const attached: AttachedFile = {
          id: `f-adj-${Date.now()}-${i}`,
          name: f.name,
          url: fileUrl,
          type: isImg
            ? 'image'
            : f.name.endsWith('.pdf')
            ? 'pdf'
            : f.name.endsWith('.xlsx') || f.name.endsWith('.xls')
            ? 'sheet'
            : 'doc',
          size: `${(f.size / 1024).toFixed(1)} KB`
        };
        setReportFiles((prev) => [...prev, attached]);
      };

      if (isImg || f.type.includes('text') || f.type.includes('json')) {
        reader.readAsDataURL(f);
      } else {
        // fallback to data url for all small files
        reader.readAsDataURL(f);
      }
    });
  };

  if (!studentInfo && !isTeacherOrAdmin) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center max-w-lg mx-auto my-12 shadow-xs">
        <AlertCircle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800">Chưa liên kết hồ sơ học sinh</h3>
        <p className="text-xs text-slate-500 mt-1">
          Tài khoản của bạn hiện chưa được gắn với mã học sinh nào trong danh sách lớp. Vui lòng liên hệ Giáo viên chủ nhiệm để kiểm tra liên kết tài khoản.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Student Personal Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-700 via-blue-700 to-indigo-800 p-6 text-white shadow-md">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src={studentInfo?.avatar || (isParent ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80' : currentUser.avatar)}
              alt={studentInfo?.fullName || (isParent ? 'Học sinh' : currentUser.name)}
              referrerPolicy="no-referrer"
              className="h-16 w-16 rounded-2xl border-2 border-white/40 object-cover shadow-md"
            />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/20 px-3 py-0.5 text-[11px] font-extrabold uppercase tracking-wider backdrop-blur-xs">
                  {isParent ? 'Kết quả học tập của con' : 'Hồ sơ học sinh'} • {studentInfo?.code || 'HV-01'}
                </span>
                <span className="rounded-full bg-emerald-500/30 px-2.5 py-0.5 text-[11px] font-bold text-emerald-200 border border-emerald-400/30">
                  {studentInfo?.officerRole || 'Học sinh'}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black mt-1 tracking-tight">
                {studentInfo?.fullName || (isParent ? 'Học sinh' : currentUser.name)}
              </h1>
              <p className="text-xs text-indigo-100 mt-0.5">
                {classSettings.className ? `Lớp ${classSettings.className}` : 'Lớp học'} • Tổ {studentInfo?.group || 1} • GVCN: {classSettings.homeroomTeacherName || classSettings.teacherName || 'Cô Đoàn Thị Bình'}
                {isParent && <span className="font-semibold text-amber-200 ml-1.5">• Phụ huynh: {currentUser.name}</span>}
              </p>
            </div>
          </div>

          {/* Quick Action */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-xs font-bold text-white border border-white/20 backdrop-blur-xs transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <HelpCircle className="h-4 w-4 text-amber-300" />
              <span>Báo cáo nhanh / Đề nghị điều chỉnh</span>
            </button>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
      </div>

      {/* Navigation Filter Pills & Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('all')}
            className={`rounded-xl px-4 py-2 text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            📊 Toàn bộ kết quả
          </button>

          <button
            onClick={() => setActiveTab('academic')}
            className={`rounded-xl px-4 py-2 text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === 'academic'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            📚 Bảng điểm môn học
          </button>

          <button
            onClick={() => setActiveTab('training')}
            className={`rounded-xl px-4 py-2 text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === 'training'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            🌼 Điểm rèn luyện & Cây Nguyệt Quế
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600">Mốc thời gian:</span>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as AcademicPeriod)}
            className="rounded-xl border border-blue-300 bg-blue-50/70 px-3 py-1.5 text-xs font-black text-blue-700 outline-hidden hover:bg-blue-100/60 transition-colors shadow-2xs"
          >
            {Object.entries(PERIOD_NAMES).map(([pKey, pLabel]) => (
              <option key={pKey} value={pKey}>
                📅 {pLabel}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* SECTION 1: KẾT QUẢ HỌC TẬP (ACADEMIC RESULTS) */}
      {(activeTab === 'all' || activeTab === 'academic') && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-blue-600" />
                <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                  KẾT QUẢ HỌC TẬP • {PERIOD_NAMES[selectedPeriod].toUpperCase()} (2025 - 2026)
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Dữ liệu bảng điểm chính thức theo cấu hình môn học của lớp do GVCN quản lý
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {academicRecord.publicationStatus === 'PUBLISHED' || academicRecord.publishedToStudent || academicRecord.publishedToParent ? (
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 border border-emerald-200 shadow-2xs">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Đã công bố {academicRecord.publishedAt ? `(${academicRecord.publishedAt})` : ''}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 border border-amber-200 shadow-2xs">
                  <Clock className="h-3.5 w-3.5 text-amber-600" />
                  <span>Bản nháp / Đang cập nhật từ GVCN</span>
                </span>
              )}
            </div>
          </div>

          {/* If period is in draft, display clear informational banner */}
          {academicRecord.publicationStatus !== 'PUBLISHED' && !academicRecord.publishedToStudent && !academicRecord.publishedToParent && (
            <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/70 p-4 text-xs text-amber-900 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-extrabold block text-sm text-amber-950 mb-0.5">
                  Bảng điểm {PERIOD_NAMES[selectedPeriod]} chưa được GVCN chính thức công bố
                </strong>
                <span>
                  Danh sách môn học hiển thị dưới đây được đồng bộ tự động theo cấu hình chính thức của lớp. Khi Giáo viên chủ nhiệm đối soát hoàn tất và bấm "Công bố", phụ huynh và học sinh sẽ nhận được bảng điểm chi tiết đầy đủ.
                </span>
              </div>
            </div>
          )}

          {/* Academic Metric Cards (Section XVI: 1. Môn TB cao nhất, 2. Môn cần chú ý, 3. Số ngày nghỉ, 4. Kết quả rèn luyện) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Môn có TB cao nhất */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-2xs">
              <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
                1. Môn thế mạnh (TB cao nhất)
              </div>
              <div className="text-lg font-black text-emerald-950 mt-1.5">
                {academicRecord?.highestSubject ? `${(academicRecord.highestSubject as any)?.name || (academicRecord.highestSubject as any)?.subjectName || academicRecord.highestSubject}` : 'Chưa đủ dữ liệu'}
              </div>
              <div className="text-xs font-bold text-emerald-700 mt-0.5">
                {academicRecord?.highestSubject ? `Điểm TB: ${(academicRecord.highestSubject as any)?.score !== undefined ? (academicRecord.highestSubject as any).score : '-'}` : 'Chưa có điểm'}
              </div>
            </div>

            {/* 2. Môn cần chú ý */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-2xs">
              <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-500 inline-block" />
                2. Môn cần chú ý / bồi dưỡng
              </div>
              <div className="text-lg font-black text-amber-950 mt-1.5">
                {academicRecord?.lowestSubject ? `${(academicRecord.lowestSubject as any)?.name || (academicRecord.lowestSubject as any)?.subjectName || academicRecord.lowestSubject}` : 'Chưa đủ dữ liệu'}
              </div>
              <div className="text-xs font-bold text-amber-700 mt-0.5">
                {academicRecord?.lowestSubject ? `Điểm TB: ${(academicRecord.lowestSubject as any)?.score !== undefined ? (academicRecord.lowestSubject as any).score : '-'}` : 'Chưa có điểm'}
              </div>
            </div>

            {/* 4. Số ngày nghỉ (Có phép & Không phép) */}
            <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 shadow-2xs">
              <div className="text-[11px] font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-500 inline-block" />
                4. Chuyên cần & Số ngày nghỉ
              </div>
              <div className="flex items-center gap-3 mt-1.5">
                <div>
                  <div className="text-base font-black text-blue-900">{finalExcusedAbsences} <span className="text-xs font-bold text-blue-700">buổi</span></div>
                  <div className="text-[10px] text-slate-500">Có phép</div>
                </div>
                <div className="h-6 w-px bg-blue-200" />
                <div>
                  <div className="text-base font-black text-blue-900">{finalUnexcusedAbsences} <span className="text-xs font-bold text-blue-700">buổi</span></div>
                  <div className="text-[10px] text-slate-500">Không phép</div>
                </div>
              </div>
              <div className="text-[10px] text-blue-600 mt-0.5 font-medium">
                {finalUnexcusedAbsences > 0 ? 'Cần cải thiện nề nếp' : 'Chuyên cần tốt'}
              </div>
            </div>

            {/* 5. Kết quả rèn luyện nếu GVCN đã công bố */}
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 shadow-2xs">
              <div className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-indigo-500 inline-block" />
                5. Kết quả rèn luyện
              </div>
              <div className="text-lg font-black text-indigo-950 mt-1.5">
                {academicRecord.conductResult || 'Chưa có dữ liệu đánh giá'}
              </div>
              <div className="text-[10px] text-indigo-700 mt-0.5 truncate">
                {academicRecord.conductResult
                  ? (academicRecord.conductSummary || 'GVCN đã đánh giá chính thức')
                  : 'Chưa có dữ liệu đánh giá'}
              </div>
            </div>
          </div>

          {/* Synchronized Graduation Exam Tracking Summary Card (From Part 4 - Theo dõi của GVCN) */}
          {graduationRecord && (
            <div className="rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50/70 via-white to-indigo-50/50 p-4 shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-purple-600" />
                  <span className="text-xs font-black uppercase tracking-wider text-purple-950">
                    Theo dõi Thi Tốt nghiệp THPT (Đồng bộ từ GVCN)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                    graduationRecord.status === 'qualified'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : graduationRecord.status === 'at_risk'
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : graduationRecord.status === 'unqualified'
                      ? 'bg-rose-50 text-rose-800 border-rose-200'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}>
                    {graduationRecord.status === 'qualified'
                      ? '✓ Đủ ĐK dự kiến'
                      : graduationRecord.status === 'at_risk'
                      ? '⚠️ Cận chuẩn'
                      : graduationRecord.status === 'unqualified'
                      ? '✗ Chưa đạt'
                      : 'Chưa đủ điểm'}
                  </span>
                  {graduationRecord.calculatedScore !== undefined && (
                    <span className="rounded-lg bg-purple-600 px-2.5 py-0.5 text-xs font-black text-white font-mono">
                      ĐXTN: {graduationRecord.calculatedScore.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
                <div className="rounded-xl bg-white p-2.5 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Toán (Bắt buộc)</span>
                  <span className="font-mono font-black text-slate-900">
                    {graduationRecord.scores?.math !== undefined ? graduationRecord.scores.math.toFixed(2) : '--'}
                  </span>
                </div>
                <div className="rounded-xl bg-white p-2.5 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Ngữ văn (Bắt buộc)</span>
                  <span className="font-mono font-black text-slate-900">
                    {graduationRecord.scores?.literature !== undefined ? graduationRecord.scores.literature.toFixed(2) : '--'}
                  </span>
                </div>
                <div className="rounded-xl bg-blue-50/50 p-2.5 border border-blue-200">
                  <span className="text-[10px] font-bold text-blue-700 uppercase block truncate">
                    TC1: {graduationRecord.electiveSubject1 || 'Chưa chọn'}
                  </span>
                  <span className="font-mono font-black text-blue-950">
                    {graduationRecord.scores?.elective1 !== undefined ? graduationRecord.scores.elective1.toFixed(2) : '--'}
                  </span>
                </div>
                <div className="rounded-xl bg-indigo-50/50 p-2.5 border border-indigo-200">
                  <span className="text-[10px] font-bold text-indigo-700 uppercase block truncate">
                    TC2: {graduationRecord.electiveSubject2 || 'Chưa chọn'}
                  </span>
                  <span className="font-mono font-black text-indigo-950">
                    {graduationRecord.scores?.elective2 !== undefined ? graduationRecord.scores.elective2.toFixed(2) : '--'}
                  </span>
                </div>
                <div className="rounded-xl bg-purple-50/60 p-2.5 border border-purple-200 col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-bold text-purple-700 uppercase block">ĐTB 3 năm (10-11-12)</span>
                  <span className="font-mono font-black text-purple-950">
                    {graduationRecord.gpaAllYears !== undefined ? graduationRecord.gpaAllYears.toFixed(2) : '--'}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    ({graduationRecord.gpa10 ?? '-'} / {graduationRecord.gpa11 ?? '-'} / {graduationRecord.gpa12 ?? '-'})
                  </span>
                </div>
              </div>

              {graduationRecord.teacherNote && (
                <div className="rounded-xl bg-amber-50/80 p-2.5 border border-amber-200 text-xs text-amber-950 flex items-start gap-2">
                  <MessageSquare className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold text-amber-900">Ghi chú từ GVCN: </strong>
                    <span>{graduationRecord.teacherNote}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Structured Grade Table (READ ONLY) */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <span className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
                Bảng điểm chi tiết từng môn học • {PERIOD_NAMES[selectedPeriod]}
              </span>
              <span className="text-[11px] text-slate-500 italic">Chế độ chỉ đọc (Read-only)</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                {selectedPeriod === 'full_year' ? (
                  <>
                    <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-extrabold">
                      <tr>
                        <th className="p-3">Môn học</th>
                        <th className="p-3 text-center bg-blue-50/60 text-blue-900">TB Học kỳ I</th>
                        <th className="p-3 text-center bg-indigo-50/60 text-indigo-900">TB Học kỳ II</th>
                        <th className="p-3 text-center bg-emerald-50/80 text-emerald-900 font-black">TB Cả Năm</th>
                        <th className="p-3">Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {academicRecord.grades.map((grade, idx) => {
                        const isPassFail = grade.assessmentMode === 'COMMENT_ONLY' || grade.subjectName.toLowerCase().includes('trải nghiệm') || grade.subjectName.toLowerCase().includes('hướng nghiệp');
                        if (isPassFail) {
                          const qual = grade.qualitativeResult;
                          return (
                            <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                              <td className="p-3 font-bold text-slate-900">{getVietnameseSubjectFullName(grade.subjectName)}</td>
                              <td className="p-3 text-center text-slate-400 italic bg-blue-50/30">
                                {grade.comment || (qual ? `Đánh giá: ${qual}` : 'Đánh giá nhận xét')}
                              </td>
                              <td className="p-3 text-center text-slate-400 italic bg-indigo-50/30">
                                {grade.comment || (qual ? `Đánh giá: ${qual}` : 'Đánh giá nhận xét')}
                              </td>
                              <td className="p-3 text-center font-bold bg-emerald-50/40 text-sm">
                                {qual ? (
                                  <span className={`inline-block px-2.5 py-0.5 rounded-md text-xs ${qual === 'Đạt' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                    {qual}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 font-normal">-</span>
                                )}
                              </td>
                              <td className="p-3 text-slate-500">{grade.note || '-'}</td>
                            </tr>
                          );
                        }

                        const hk1 = isEnteredValidScore(grade.tbHk1) ? Number(grade.tbHk1) : undefined;
                        const hk2 = isEnteredValidScore(grade.tbHk2) ? Number(grade.tbHk2) : undefined;
                        const caNam = calculateSubjectAverage({
                          assessmentMode: grade.assessmentMode,
                          tbHk1: hk1,
                          tbHk2: hk2,
                          tbCaNam: grade.tbCaNam,
                          period: 'full_year'
                        });
                        return (
                          <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                            <td className="p-3 font-bold text-slate-900">{getVietnameseSubjectFullName(grade.subjectName)}</td>
                            <td className="p-3 text-center font-bold text-blue-800 bg-blue-50/30">
                              {hk1 !== undefined ? hk1 : '-'}
                            </td>
                            <td className="p-3 text-center font-bold text-indigo-800 bg-indigo-50/30">
                              {hk2 !== undefined ? hk2 : '-'}
                            </td>
                            <td className="p-3 text-center font-black text-emerald-700 bg-emerald-50/40 text-sm">
                              {caNam !== undefined ? caNam.toFixed(1) : '-'}
                            </td>
                            <td className="p-3 text-slate-500">{grade.note || '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </>
                ) : (
                  (() => {
                    const maxTxCols = Math.max(
                      1,
                      ...academicRecord.grades
                        .filter(
                          (g) =>
                            g.assessmentMode !== 'COMMENT_ONLY' &&
                            !g.subjectName.toLowerCase().includes('trải nghiệm') &&
                            !g.subjectName.toLowerCase().includes('hướng nghiệp')
                        )
                        .map((g) => {
                          if (typeof g._importedTxCount === 'number' && g._importedTxCount >= 0) {
                            return g._importedTxCount;
                          }
                          const highestPopulatedTx = [g.tx1, g.tx2, g.tx3, g.tx4, g.tx5, g.tx6].reduce(
                            (maxIdx, v, idx) => (v !== undefined && v !== null ? idx + 1 : maxIdx),
                            0
                          );
                          const configured = academicService.getSubjectRegularCount(g.subjectName);
                          return Math.max(highestPopulatedTx, configured || 0);
                        })
                    );

                    return (
                      <>
                        <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-extrabold">
                          <tr>
                            <th className="p-3">Môn học</th>
                            {Array.from({ length: maxTxCols }).map((_, i) => (
                              <th key={i} className="p-3 text-center">
                                TX {i + 1}
                              </th>
                            ))}
                            <th className="p-3 text-center bg-blue-50/60 text-blue-900">Giữa kỳ</th>
                            {selectedPeriod.startsWith('final_') && (
                              <th className="p-3 text-center bg-indigo-50/60 text-indigo-900">Cuối kỳ</th>
                            )}
                            <th className="p-3 text-center bg-emerald-50/80 text-emerald-900 font-black">Kết quả / TB</th>
                            <th className="p-3">Ghi chú</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {academicRecord.grades.map((grade, idx) => {
                            const isPassFail =
                              grade.assessmentMode === 'COMMENT_ONLY' ||
                              grade.subjectName.toLowerCase().includes('trải nghiệm') ||
                              grade.subjectName.toLowerCase().includes('hướng nghiệp');
                            if (isPassFail) {
                              const qual = grade.qualitativeResult;
                              return (
                                <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                                  <td className="p-3 font-bold text-slate-900">{getVietnameseSubjectFullName(grade.subjectName)}</td>
                                  <td
                                    colSpan={maxTxCols + (selectedPeriod.startsWith('final_') ? 2 : 1)}
                                    className="p-3 text-center text-slate-400 italic bg-slate-50/40"
                                  >
                                    {grade.comment || (qual ? `Kết quả đánh giá: ${qual}` : 'Môn học đánh giá bằng nhận xét (Đạt / Chưa đạt)')}
                                  </td>
                                  <td className="p-3 text-center font-bold bg-emerald-50/40 text-sm">
                                    {qual ? (
                                      <span
                                        className={`inline-block px-2 py-0.5 rounded-md text-xs ${
                                          qual === 'Đạt' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                        }`}
                                      >
                                        {qual}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 font-normal">-</span>
                                    )}
                                  </td>
                                  <td className="p-3 text-slate-500">{grade.note || '-'}</td>
                                </tr>
                              );
                            }

                            return (
                              <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                                <td className="p-3 font-bold text-slate-900">{getVietnameseSubjectFullName(grade.subjectName)}</td>
                                {Array.from({ length: maxTxCols }).map((_, i) => {
                                  const txKey = `tx${i + 1}` as 'tx1' | 'tx2' | 'tx3' | 'tx4' | 'tx5' | 'tx6';
                                  return (
                                    <td key={txKey} className="p-3 text-center text-slate-700">
                                      {grade[txKey] ?? '-'}
                                    </td>
                                  );
                                })}
                                <td className="p-3 text-center font-bold text-blue-800 bg-blue-50/30">
                                  {grade.midterm ?? '-'}
                                </td>
                                {selectedPeriod.startsWith('final_') && (
                                  <td className="p-3 text-center font-bold text-indigo-800 bg-indigo-50/30">
                                    {grade.finalExam ?? '-'}
                                  </td>
                                )}
                                <td className="p-3 text-center font-black text-emerald-700 bg-emerald-50/40 text-sm">
                                  {grade.average ?? '-'}
                                </td>
                                <td className="p-3 text-slate-500">{grade.note || '-'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </>
                    );
                  })()
                )}
              </table>
            </div>
          </div>

          {/* Teacher Summary and Assessment Boxes */}
          {(academicRecord.academicSummary || academicRecord.conductSummary || academicRecord.teacherComment) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/70 to-white p-4 space-y-2 shadow-2xs">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                  <BookOpen className="h-4 w-4 text-blue-600 shrink-0" />
                  <span>1. Đánh giá Kết quả học tập ({PERIOD_NAMES[selectedPeriod]}):</span>
                </div>
                <p className="text-xs text-slate-800 leading-relaxed font-medium pl-6">
                  "{academicRecord.academicSummary || academicRecord.teacherComment}"
                </p>
                <div className="text-[10px] text-slate-400 pl-6 flex items-center justify-between pt-1">
                  <span>{academicRecord.commentUpdatedBy || `${classSettings.homeroomTeacherName || classSettings.teacherName || 'Cô Đoàn Thị Bình'} (GVCN)`}</span>
                  {academicRecord.commentUpdatedAt && <span>Cập nhật: {academicRecord.commentUpdatedAt}</span>}
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/70 to-white p-4 space-y-2 shadow-2xs">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>2. Đánh giá Kết quả rèn luyện ({PERIOD_NAMES[selectedPeriod]}):</span>
                </div>
                <p className="text-xs text-slate-800 leading-relaxed font-medium pl-6">
                  {academicRecord.conductSummary ? `"${academicRecord.conductSummary}"` : 'Chưa có dữ liệu đánh giá từ GVCN cho mốc này.'}
                </p>
                <div className="text-[10px] text-slate-400 pl-6 flex items-center justify-between pt-1">
                  <span>{academicRecord.conductSummary ? (academicRecord.commentUpdatedBy || `${classSettings.homeroomTeacherName || classSettings.teacherName || 'GVCN'} (GVCN)`) : 'Chờ GVCN cập nhật'}</span>
                  {academicRecord.commentUpdatedAt && <span>Cập nhật: {academicRecord.commentUpdatedAt}</span>}
                </div>
              </div>
            </div>
          )}

          {/* Shared Transcript / Evidence Files Section */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-indigo-600" />
                <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
                  Bảng điểm & Minh chứng GVCN đã chia sẻ ({sharedFiles.length})
                </h3>
              </div>
              <span className="text-[11px] text-slate-400">Tài liệu chính thức</span>
            </div>

            {sharedFiles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {sharedFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-start justify-between rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 hover:bg-slate-50 transition-all shadow-2xs"
                  >
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl bg-red-100 p-2 text-red-600 font-bold text-xs mt-0.5">
                        PDF
                      </div>
                      <div>
                        <div className="font-bold text-xs text-slate-900 leading-snug">{file.title}</div>
                        {file.description && (
                          <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                            {file.description}
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400 mt-1">
                          GVCN tải lên: {file.uploadedAt} • Dung lượng: {file.file?.size || 'N/A'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <button
                        onClick={() => file.file && setPreviewFile(file.file)}
                        className="rounded-xl bg-white border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 shadow-2xs transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Xem</span>
                      </button>

                      <a
                        href={file.file?.url || '#'}
                        download={file.file?.name || file.title || 'bang_diem.pdf'}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 shadow-2xs transition-colors flex items-center gap-1"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Tải về</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-xs text-slate-400 italic py-4">
                Chưa có file bảng điểm nào được GVCN chia sẻ cho bạn ở mốc thời gian này.
              </p>
            )}
          </div>
        </div>
      )}

      {/* SECTION 2: KẾT QUẢ RÈN LUYỆN (TRAINING RESULTS) */}
      {(activeTab === 'all' || activeTab === 'training') && (
        <div className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <Award className="h-5 w-5 text-emerald-600" />
                <span>KẾT QUẢ RÈN LUYỆN & CÂY NGUYỆT QUẾ CỦA TÔI</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Nhật ký điểm thưởng, việc tốt và tiến độ trổ hoa Cây Nguyệt Quế cá nhân
              </p>
            </div>

            {studentTree && (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-1.5 border border-emerald-200">
                <TreePine className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-bold text-emerald-900">
                  {studentTree.completedTrees > 0 ? `Đã hoàn thành ${studentTree.completedTrees} cây • ` : ''}
                  Giai đoạn: {studentTree.stageName || 'Trổ bông'} ({studentTree.currentCyclePoints ?? studentTree.currentPoints ?? 0}/100 đ)
                </span>
              </div>
            )}
          </div>

          {/* Training Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 text-center sm:text-left">
              <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                Điểm Rèn Luyện Hiện Tại
              </div>
              <div className="text-2xl font-black text-emerald-900 mt-1">
                {netTrainingPoints > 0 ? `+${netTrainingPoints}` : netTrainingPoints} đ
              </div>
              <div className="text-[10px] text-emerald-600 mt-0.5">
                {studentTree ? `Tiến độ cây: ${studentTree.currentCyclePoints ?? studentTree.currentPoints ?? 0}/100 đ (Chu kỳ ${(studentTree.completedTrees || 0) + 1})` : 'Điểm rèn luyện ròng'}
              </div>
            </div>

            <div className="rounded-2xl border border-teal-100 bg-teal-50/60 p-4 text-center sm:text-left">
              <div className="text-[11px] font-bold text-teal-700 uppercase tracking-wider">
                Tổng Điểm Thưởng (+)
              </div>
              <div className="text-2xl font-black text-teal-900 mt-1">+{totalPositivePoints} đ</div>
              <div className="text-[10px] text-teal-600 mt-0.5">Việc tốt, phát biểu, phong trào</div>
            </div>

            <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-4 text-center sm:text-left">
              <div className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">
                Tổng Điểm Trừ (-)
              </div>
              <div className="text-2xl font-black text-rose-900 mt-1">-{totalNegativePoints} đ</div>
              <div className="text-[10px] text-rose-600 mt-0.5">Vi phạm nề nếp</div>
            </div>

            <div className="rounded-2xl border border-purple-100 bg-purple-50/60 p-4 text-center sm:text-left">
              <div className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">
                Tổng Điểm Tích Lũy Năm
              </div>
              <div className="text-2xl font-black text-purple-900 mt-1">
                {studentTree?.totalLifetimePoints !== undefined && studentTree.totalLifetimePoints > 0 ? studentTree.totalLifetimePoints : Math.max(0, netTrainingPoints)} đ
              </div>
              <div className="text-[10px] text-purple-600 mt-0.5">Đóng góp Cây Nguyệt Quế</div>
            </div>
          </div>

          {/* Card: Đánh giá & Tự nhận xét rèn luyện định kỳ */}
          {(() => {
            const studentEvals = conductEvaluationService.getStudentEvaluations(studentId);
            const semEvals = studentEvals.filter(
              e => e.period.periodType === 'SEMESTER_1' || e.period.periodType === 'SEMESTER_2' || e.period.periodType === 'FULL_YEAR'
            );
            return (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/60 pb-2.5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-emerald-700" />
                    <div>
                      <h3 className="font-black text-xs text-emerald-950 uppercase tracking-wider">
                        Tự Nhận Xét & Kết Quả Đánh Giá Rèn Luyện Định Kỳ
                      </h3>
                      <p className="text-[10px] text-emerald-800">
                        Học viên tự nhận xét (nhập thủ công / đồng bộ khảo sát) & đối chiếu với đánh giá GVCN (file Excel)
                      </p>
                    </div>
                  </div>
                  {!isParent && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelfAssessmentPeriod('SEMESTER_1');
                        setIsSelfAssessmentModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-1.5 text-xs font-bold transition-all shadow-xs cursor-pointer self-start sm:self-auto shrink-0"
                    >
                      <Award className="h-4 w-4 text-emerald-200" />
                      <span>Mở Tự Nhận Xét Rèn Luyện</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {semEvals.map(({ period, evaluation }) => {
                    const isFinal = period.status === 'FINALIZED';
                    return (
                      <div key={period.id} className="rounded-xl border border-white bg-white p-3 space-y-2.5 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-800">{period.periodTitle}</span>
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[9px] font-black ${
                                isFinal
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}
                            >
                              {isFinal ? 'Chính thức' : 'Dự thảo'}
                            </span>
                            {!isParent && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelfAssessmentPeriod(period.periodType);
                                  setIsSelfAssessmentModalOpen(true);
                                }}
                                className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
                              >
                                {evaluation.selfAssessment ? 'Sửa' : 'Nhập'}
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2 rounded-lg bg-emerald-50/70 border border-emerald-100">
                            <div className="text-[9px] font-bold text-emerald-800 uppercase">Tự nhận xét</div>
                            <div className="text-sm font-black text-emerald-950 mt-0.5">
                              {evaluation.selfAssessment || <span className="text-slate-400 font-normal italic text-xs">Chưa có</span>}
                            </div>
                            {evaluation.selfAssessmentSource && (
                              <div className="text-[8px] text-emerald-700 truncate mt-0.5" title={evaluation.selfAssessmentSource}>
                                {evaluation.selfAssessmentSource}
                              </div>
                            )}
                          </div>
                          <div className="p-2 rounded-lg bg-indigo-50/70 border border-indigo-100">
                            <div className="text-[9px] font-bold text-indigo-800 uppercase">GVCN (Excel)</div>
                            <div className="text-sm font-black text-indigo-950 mt-0.5">
                              {evaluation.teacherAssessment || evaluation.finalGrade || <span className="text-slate-400 font-normal italic text-xs">Chưa có</span>}
                            </div>
                            <div className="text-[8px] text-indigo-700 truncate mt-0.5">
                              Tập thể: {evaluation.collectiveAssessment || '-'}
                            </div>
                          </div>
                        </div>

                        {evaluation.teacherNote && (
                          <div className="text-[10px] text-slate-600 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                            💬 <i>GVCN: {evaluation.teacherNote}</i>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Timeline Table of Training Events */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <span className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
                Lịch sử các lần ghi nhận điểm rèn luyện ({trainingLogs.length})
              </span>
              <span className="text-[11px] text-slate-500 italic">Chỉ hiển thị dữ liệu của cá nhân bạn</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-extrabold">
                  <tr>
                    <th className="p-3">Thời gian</th>
                    <th className="p-3">Danh mục</th>
                    <th className="p-3">Nội dung ghi nhận & Lý do</th>
                    <th className="p-3 text-center">Điểm số</th>
                    <th className="p-3">Người ghi nhận</th>
                    <th className="p-3 text-center">Trạng thái</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {trainingLogs.length > 0 ? (
                    trainingLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3 text-slate-500 whitespace-nowrap">{log.createdAt}</td>
                        <td className="p-3">
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                            {log.category}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{log.reason}</div>
                          {log.evidenceFiles && log.evidenceFiles.length > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                              {log.evidenceFiles.map((f) => (
                                <button
                                  key={f.id}
                                  onClick={() => setPreviewFile(f)}
                                  className="inline-flex items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-700 hover:underline"
                                >
                                  <Paperclip className="h-3 w-3" />
                                  <span>{f.name}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`inline-block rounded-lg px-2.5 py-1 text-xs font-black ${
                              log.points >= 0
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {log.points > 0 ? `+${log.points}` : log.points} đ
                          </span>
                        </td>
                        <td className="p-3 text-slate-600">
                          {log.approvedBy ? `${log.approvedBy} (Duyệt)` : log.proposedByName}
                        </td>
                        <td className="p-3 text-center">
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                            Đã duyệt
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-xs text-slate-400 italic">
                        Chưa có bản ghi rèn luyện nào được lưu trên hệ thống.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SUBMIT ADJUSTMENT REPORT */}
      {isReportModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 animate-scale-up space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-amber-600" />
                <h3 className="font-extrabold text-base text-slate-900">
                  Gửi Báo Cáo Nhanh / Đề Nghị Điều Chỉnh Cho GVCN
                </h3>
              </div>
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {reportSubmittedSuccess ? (
              <div className="rounded-2xl bg-emerald-50 p-6 text-center text-emerald-800 space-y-2">
                <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
                <div className="font-bold text-sm">Gửi báo cáo thành công!</div>
                <div className="text-xs text-emerald-700">
                  Giáo viên chủ nhiệm sẽ kiểm tra và phản hồi sớm nhất cho em.
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitAdjustment} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Lĩnh vực cần đề nghị điều chỉnh
                  </label>
                  <select
                    value={reportCategory}
                    onChange={(e) => setReportCategory(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-900 bg-white outline-hidden"
                  >
                    <option value="Học tập">Điểm số học tập / Bài kiểm tra</option>
                    <option value="Rèn luyện">Điểm rèn luyện / Kỷ cương nề nếp</option>
                    <option value="Khen thưởng">Khen thưởng / Minh chứng việc tốt</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Nội dung chi tiết & Lý do điều chỉnh
                  </label>
                  <textarea
                    rows={4}
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                    placeholder="Mô tả cụ thể cột điểm hoặc sự kiện ghi nhận nhầm lẫn, kèm thông tin chi tiết..."
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-900 outline-hidden focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Ảnh chụp bài làm / Minh chứng xác thực
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-2.5 text-slate-700 hover:bg-slate-100">
                    <Upload className="h-4 w-4 text-slate-500" />
                    <span>Chọn hình ảnh bài kiểm tra hoặc tài liệu minh chứng</span>
                    <input
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                      accept="image/*,.pdf"
                    />
                  </label>

                  {reportFiles.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {reportFiles.map((f) => (
                        <span
                          key={f.id}
                          className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-700 border border-indigo-200"
                        >
                          <Paperclip className="h-3 w-3" />
                          <span>{f.name}</span>
                          <button
                            type="button"
                            onClick={() => setReportFiles((prev) => prev.filter((x) => x.id !== f.id))}
                            className="text-indigo-400 hover:text-rose-500 cursor-pointer"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsReportModalOpen(false)}
                    className="rounded-xl px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 font-bold text-white hover:bg-indigo-700 shadow-xs cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Gửi cho Giáo viên chủ nhiệm</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* File Preview Modal */}
      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          isOpen={true}
          onClose={() => setPreviewFile(null)}
        />
      )}

      {/* Student Conduct Self Assessment Modal */}
      {isSelfAssessmentModalOpen && (
        <StudentConductSelfAssessmentModal
          isOpen={isSelfAssessmentModalOpen}
          onClose={() => setIsSelfAssessmentModalOpen(false)}
          studentId={studentId}
          initialPeriod={selfAssessmentPeriod}
          onSaved={() => loadData()}
        />
      )}
    </div>
  );
};
