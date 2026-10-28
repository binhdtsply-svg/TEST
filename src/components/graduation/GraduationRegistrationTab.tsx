/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Save,
  Users,
  ShieldCheck,
  Sparkles,
  Info,
  Calendar,
  Layers,
  Check,
  UserCheck,
  MessageSquare,
  Send,
  CornerDownRight,
  Reply,
  Lock,
  Eye,
  Award,
  History,
  Clock,
  ChevronDown,
  ChevronUp,
  FileText,
  X
} from 'lucide-react';
import { GraduationRegistration, GraduationExamComment, GraduationChoiceHistory, UserRole, StudentSurveyResponse } from '../../types';
import { graduationService, ELECTIVE_SUBJECTS_LIST } from '../../services/GraduationService';
import { studentService } from '../../services/StudentService';
import { authService } from '../../services/AuthService';
import { studentSurveyService } from '../../services/StudentSurveyService';
import { StudentSurveyDetailModal } from '../student/StudentSurveyDetailModal';

/**
 * Modal hiển thị an toàn phần khảo sát môn thi dành riêng cho Phụ huynh
 * (Tuân thủ quyền riêng tư: Không hiển thị sức khỏe, tâm lý, gia cảnh, tin nhắn riêng)
 */
interface ParentSurveyGraduationPrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  survey: StudentSurveyResponse | null;
  studentName?: string;
  studentCode?: string;
}

const ParentSurveyGraduationPrivacyModal: React.FC<ParentSurveyGraduationPrivacyModalProps> = ({
  isOpen,
  onClose,
  survey,
  studentName,
  studentCode
}) => {
  if (!isOpen || !survey) return null;

    const plan = survey.answers?.graduationPlan;
  const career = survey.answers?.careerOrientation;
  const planSub1 = plan?.electiveSubject1 || (Array.isArray((plan as any)?.electiveSubjects) ? (plan as any).electiveSubjects[0] : undefined);
  const planSub2 = plan?.electiveSubject2 || (Array.isArray((plan as any)?.electiveSubjects) ? (plan as any).electiveSubjects[1] : undefined);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <BookOpen className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Thông tin Khảo sát Môn thi Đầu năm
              </h3>
              <p className="text-[11px] text-slate-500">
                Học sinh: <strong className="text-slate-800">{studentName || 'Học viên'}</strong> ({studentCode})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3.5 text-xs">
          <div className="rounded-xl bg-blue-50/60 p-3 border border-blue-200/80 space-y-2">
            <div className="text-[11px] font-bold text-blue-900 uppercase">
              Nguyện vọng môn thi tự chọn tại thời điểm khảo sát
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-white p-2.5 border border-blue-200 shadow-2xs">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Môn tự chọn 1</span>
                <span className="text-xs font-black text-blue-950">{planSub1 || 'Chưa chọn'}</span>
              </div>
              <div className="rounded-lg bg-white p-2.5 border border-blue-200 shadow-2xs">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Môn tự chọn 2</span>
                <span className="text-xs font-black text-indigo-950">{planSub2 || 'Chưa chọn'}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 rounded-xl bg-slate-50 p-3 border border-slate-200">
            <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
              <span className="text-slate-600 font-medium">Mức độ tự tin / chắc chắn:</span>
              <span className="font-bold text-slate-900">{plan?.confidence || 'Khá tự tin'}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
              <span className="text-slate-600 font-medium">Nhu cầu tư vấn từ GVCN:</span>
              <span className={`font-bold ${plan?.needTeacherAdvice && plan.needTeacherAdvice !== 'Không' ? 'text-amber-700' : 'text-slate-700'}`}>
                {plan?.needTeacherAdvice || 'Không'}
              </span>
            </div>
            {plan?.choiceFactors && plan.choiceFactors.length > 0 && (
              <div className="py-1">
                <span className="text-slate-600 font-medium block mb-1">Căn cứ / Lý do lựa chọn:</span>
                <div className="flex flex-wrap gap-1">
                  {plan.choiceFactors.map((factor, idx) => (
                    <span key={idx} className="rounded-md bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-700 border border-slate-200">
                      {factor}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {career?.postHighSchoolPlan && (
              <div className="flex justify-between items-center py-1 border-t border-slate-200/60">
                <span className="text-slate-600 font-medium">Định hướng sau tốt nghiệp:</span>
                <span className="font-bold text-slate-800">{career.postHighSchoolPlan}</span>
              </div>
            )}
            <div className="flex justify-between items-center py-1 border-t border-slate-200/60 text-[11px] text-slate-400">
              <span>Ngày nộp khảo sát:</span>
              <span className="font-mono">{survey.submittedAt || survey.createdAt || 'Đầu năm học'}</span>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-xl bg-emerald-50/60 p-2.5 text-[11px] text-emerald-900 border border-emerald-200">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              Chế độ bảo mật thông tin: Các mục thông tin cá nhân nhạy cảm khác trong phiếu khảo sát được bảo lưu riêng tư theo quy chế trường.
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end pt-3 border-t border-slate-100">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-white hover:bg-slate-900 cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export const GraduationRegistrationTab: React.FC = () => {
  const currentUser = authService.getCurrentUser();
  const role = currentUser.role;
  const isTeacher = role === 'TEACHER' || role === 'SUPER_ADMIN';
  const isOfficer = role === 'CLASS_OFFICER';
  const isStudent = role === 'STUDENT';
  const isStudentLike = isStudent || isOfficer;
  const isParent = role === 'PARENT';

  const [students, setStudents] = useState(() => studentService.getAll());
  const [allRegistrations, setAllRegistrations] = useState<GraduationRegistration[]>(() =>
    graduationService.getAllForClass ? graduationService.getAllForClass() : graduationService.getAll()
  );

  // Determine active student ID using stable identifiers (studentId, childStudentId, studentCode)
  const resolveOwnStudentId = (studentList = students): string => {
    if (isStudentLike) {
      const rawId = currentUser.studentId || (currentUser.id?.startsWith('usr_stu_') ? currentUser.id.replace('usr_stu_', '') : currentUser.id);
      const matched = studentList.find(
        s => s.id === rawId || (s.code && s.code.toLowerCase() === String(rawId || '').toLowerCase())
      );
      return matched?.id || currentUser.studentId || studentList[0]?.id || '';
    }
    if (isParent) {
      const rawId = currentUser.childStudentId || currentUser.studentId || (currentUser.id?.startsWith('usr_par_') ? currentUser.id.replace('usr_par_', '') : '');
      const matched = studentList.find(
        s => s.id === rawId || (s.code && s.code.toLowerCase() === String(rawId || '').toLowerCase())
      );
      return matched?.id || currentUser.childStudentId || currentUser.studentId || studentList[0]?.id || '';
    }
    return studentList[0]?.id || '';
  };

  const [selectedStudentId, setSelectedStudentId] = useState<string>(() => resolveOwnStudentId());

  // Form state (only used by student / officer)
  const [electiveSubject1, setElectiveSubject1] = useState<string>('');
  const [electiveSubject2, setElectiveSubject2] = useState<string>('');
  const [isForeignLanguageExempt, setIsForeignLanguageExempt] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);

  // History state
  const [historyList, setHistoryList] = useState<GraduationChoiceHistory[]>([]);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState<boolean>(true);

  // Modals
  const [isSurveyModalOpen, setIsSurveyModalOpen] = useState<boolean>(false);
  const [isParentPrivacyModalOpen, setIsParentPrivacyModalOpen] = useState<boolean>(false);

  // Comment thread state
  const [comments, setComments] = useState<GraduationExamComment[]>([]);
  const [newCommentText, setNewCommentText] = useState<string>('');
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<string>('');
  const [commentSuccessMsg, setCommentSuccessMsg] = useState<string | null>(null);

  const loadData = () => {
    const latestStudents = studentService.getAll();
    setStudents(latestStudents);
    const classRegs = graduationService.getAllForClass ? graduationService.getAllForClass() : graduationService.getAll();
    setAllRegistrations(classRegs);
    const effectiveStudentId = (!isTeacher ? resolveOwnStudentId(latestStudents) : selectedStudentId) || latestStudents[0]?.id || '';
    if (effectiveStudentId && effectiveStudentId !== selectedStudentId && !isTeacher) {
      setSelectedStudentId(effectiveStudentId);
    }
    const targetId = effectiveStudentId || selectedStudentId;
    if (targetId) {
      const reg = graduationService.getByStudentId(targetId);
      if (reg) {
        setElectiveSubject1(reg.electiveSubject1 || '');
        setElectiveSubject2(reg.electiveSubject2 || '');
        setIsForeignLanguageExempt(!!reg.isForeignLanguageExempt);
      } else {
        setElectiveSubject1('');
        setElectiveSubject2('');
        setIsForeignLanguageExempt(false);
      }
      setComments(graduationService.getComments(targetId));
      setHistoryList(graduationService.getChoiceHistory(targetId));
    }
  };

  useEffect(() => {
    graduationService.fetchFromServer();
  }, []);

  useEffect(() => {
    loadData();
    const unsubGrad = graduationService.subscribe(loadData);
    const unsubStudents = studentService.subscribe(loadData);
    return () => {
      unsubGrad();
      unsubStudents();
    };
  }, [selectedStudentId]);

  // When selected student changes, populate fields & load comments/history
  useEffect(() => {
    const reg = graduationService.getByStudentId(selectedStudentId);
    if (reg) {
      setElectiveSubject1(reg.electiveSubject1 || '');
      setElectiveSubject2(reg.electiveSubject2 || '');
      setIsForeignLanguageExempt(!!reg.isForeignLanguageExempt);
    } else {
      setElectiveSubject1('');
      setElectiveSubject2('');
      setIsForeignLanguageExempt(false);
    }
    setComments(graduationService.getComments(selectedStudentId));
    setHistoryList(graduationService.getChoiceHistory(selectedStudentId));
    setSaveSuccessMsg(null);
    setSaveErrorMsg(null);
    setReplyingToCommentId(null);
    setReplyText('');
  }, [selectedStudentId]);

  const currentRegistration = graduationService.getByStudentId(selectedStudentId);
  const currentStudent = students.find(s => s.id === selectedStudentId);

  // Initial Survey response
  const initialSurvey = studentSurveyService.getByStudent(selectedStudentId, 'GRADE12_START_YEAR') ||
    studentSurveyService.getAll().find(s => s.studentId === selectedStudentId && (s.surveyType === 'GRADE12_START_YEAR' || s.answers?.graduationPlan));
  const initialPlan = initialSurvey?.answers?.graduationPlan;
  const initialSub1 = initialPlan?.electiveSubject1 || (Array.isArray((initialPlan as any)?.electiveSubjects) ? (initialPlan as any).electiveSubjects[0] : undefined);
  const initialSub2 = initialPlan?.electiveSubject2 || (Array.isArray((initialPlan as any)?.electiveSubjects) ? (initialPlan as any).electiveSubjects[1] : undefined);

  // Comparison check
  const hasInitialSurveyChoice = !!(initialSub1 && initialSub1 !== 'Chưa xác định');
  const isKeepingInitialChoice = hasInitialSurveyChoice &&
    currentRegistration?.electiveSubject1 === initialSub1 &&
    currentRegistration?.electiveSubject2 === initialSub2;

  // Student Save Handler
  const handleSaveRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveErrorMsg(null);
    setSaveSuccessMsg(null);

    if (!isStudentLike) {
      setSaveErrorMsg('Chỉ học sinh mới có quyền thay đổi và lưu lựa chọn môn thi!');
      return;
    }

    const myStudentId = resolveOwnStudentId();
    if (selectedStudentId !== myStudentId) {
      setSaveErrorMsg('Bạn chỉ có quyền chỉnh sửa lựa chọn môn thi của chính mình!');
      return;
    }

    if (!electiveSubject1 || !electiveSubject2) {
      setSaveErrorMsg('Vui lòng chọn đầy đủ 02 môn thi tự chọn!');
      return;
    }

    if (electiveSubject1 === electiveSubject2) {
      setSaveErrorMsg('MÔN TỰ CHỌN 1 và MÔN TỰ CHỌN 2 không được trùng nhau. Vui lòng chọn 2 môn khác nhau!');
      return;
    }

    if (!selectedStudentId) {
      setSaveErrorMsg('Vui lòng chọn học sinh.');
      return;
    }

    try {
      await graduationService.updateRegistration(currentRegistration?.id || `grad-reg-${selectedStudentId}`, {
        studentId: selectedStudentId,
        studentName: currentStudent?.fullName || 'Học sinh',
        studentCode: currentStudent?.code || '',
        studentGroup: currentStudent?.group || 1,
        compulsorySubjects: ['Toán', 'Ngữ văn'],
        electiveSubject1,
        electiveSubject2,
        isForeignLanguageExempt,
        hasStudentCustomizedChoice: true,
        source: 'STUDENT_MANUAL',
        updatedBy: isOfficer ? 'Ban cán sự' : 'Học sinh'
      });

      setHistoryList(graduationService.getChoiceHistory(selectedStudentId));
      setSaveSuccessMsg('Đã lưu thông tin đăng ký môn thi thành công!');
      setTimeout(() => {
        setSaveSuccessMsg(null);
      }, 2500);
    } catch (err: any) {
      setSaveErrorMsg(err?.message || 'Lỗi khi đồng bộ dữ liệu đăng ký môn thi lên máy chủ.');
    }
  };

  // Add top-level comment
  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !selectedStudentId) return;

    graduationService.addComment({
      studentId: selectedStudentId,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorRole: currentUser.role,
      authorAvatar: currentUser.avatar,
      content: newCommentText.trim()
    });

    setNewCommentText('');
    setComments(graduationService.getComments(selectedStudentId));
    setCommentSuccessMsg('Đã gửi góp ý thành công!');
    setTimeout(() => setCommentSuccessMsg(null), 2500);
  };

  // Send nested reply
  const handleSendReply = (parentCommentId: string) => {
    if (!replyText.trim() || !selectedStudentId) return;

    graduationService.addComment({
      studentId: selectedStudentId,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorRole: currentUser.role,
      authorAvatar: currentUser.avatar,
      content: replyText.trim(),
      parentCommentId
    });

    setReplyText('');
    setReplyingToCommentId(null);
    setComments(graduationService.getComments(selectedStudentId));
  };

  // Elective subject distribution stats for Class
  const electiveStats: Record<string, number> = {};
  allRegistrations.forEach(r => {
    if (r.electiveSubject1) {
      electiveStats[r.electiveSubject1] = (electiveStats[r.electiveSubject1] || 0) + 1;
    }
    if (r.electiveSubject2) {
      electiveStats[r.electiveSubject2] = (electiveStats[r.electiveSubject2] || 0) + 1;
    }
  });

  // Top level comments vs replies
  const topLevelComments = comments.filter(c => !c.parentCommentId);
  const getRepliesForComment = (commentId: string) => comments.filter(c => c.parentCommentId === commentId);

  const getRoleBadge = (commentRole: UserRole) => {
    switch (commentRole) {
      case 'TEACHER':
      case 'SUPER_ADMIN':
        return <span className="rounded-md bg-blue-100 text-blue-800 px-2 py-0.5 text-[10px] font-black border border-blue-200">GVCN</span>;
      case 'PARENT':
        return <span className="rounded-md bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-black border border-amber-200">Phụ huynh</span>;
      case 'CLASS_OFFICER':
        return <span className="rounded-md bg-purple-100 text-purple-800 px-2 py-0.5 text-[10px] font-black border border-purple-200">Ban cán sự</span>;
      case 'STUDENT':
      default:
        return <span className="rounded-md bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-black border border-emerald-200">Học viên</span>;
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* 1. Header & Student Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">
            ĐĂNG KÝ 02 MÔN THI TỰ CHỌN & THEO DÕI NGUYỆN VỌNG
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Chương trình GDPT 2018: 02 môn bắt buộc (Toán, Ngữ văn) + đúng 02 môn tự chọn do học sinh trực tiếp đăng ký.
          </p>
        </div>

        {/* Student Selector (for Teacher) */}
        {isTeacher && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 shrink-0">Chọn học viên:</span>
            <select
              value={selectedStudentId}
              onChange={e => setSelectedStudentId(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-hidden"
            >
              {students.map(s => {
                const reg = allRegistrations.find(r => r.studentId === s.id);
                return (
                  <option key={s.id} value={s.id}>
                    {s.code} - {s.fullName} ({reg?.electiveSubject1 || 'Chưa chọn'} + {reg?.electiveSubject2 || 'Chưa chọn'})
                  </option>
                );
              })}
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* ========================================================================= */}
          {/* SECTION 1: NGUYỆN VỌNG TỪ KHẢO SÁT */}
          {/* ========================================================================= */}
          <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/30 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-blue-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-blue-950 uppercase tracking-tight">
                    1. NGUYỆN VỌNG TỪ KHẢO SÁT
                  </h3>
                  <span className="text-[10px] text-blue-600 font-semibold">
                    Dữ liệu lịch sử gốc từ biểu mẫu khảo sát
                  </span>
                </div>
              </div>

              {/* View Survey Action Button */}
              {initialSurvey && (
                <div>
                  {isParent ? (
                    <button
                      onClick={() => setIsParentPrivacyModalOpen(true)}
                      className="flex items-center gap-1 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-blue-700 border border-blue-300 hover:bg-blue-50 transition-all cursor-pointer shadow-2xs"
                    >
                      <Eye className="h-3.5 w-3.5 text-blue-600" />
                      <span>Xem thông tin môn thi khảo sát</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsSurveyModalOpen(true)}
                      className="flex items-center gap-1 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-blue-700 border border-blue-300 hover:bg-blue-50 transition-all cursor-pointer shadow-2xs"
                    >
                      <Eye className="h-3.5 w-3.5 text-blue-600" />
                      <span>Xem khảo sát gốc</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {initialPlan && (initialSub1 || initialSub2) ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white p-3 border border-blue-200/80 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Nguyện vọng môn tự chọn 1</span>
                    <div className="text-xs font-black text-blue-900 mt-0.5">
                      {initialSub1 || 'Chưa xác định'}
                    </div>
                  </div>

                  <div className="rounded-xl bg-white p-3 border border-blue-200/80 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Nguyện vọng môn tự chọn 2</span>
                    <div className="text-xs font-black text-indigo-900 mt-0.5">
                      {initialSub2 || 'Chưa xác định'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs bg-white/80 p-3 rounded-xl border border-blue-100">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Mức độ chắc chắn:</span>
                    <span className="font-bold text-slate-800 text-[11px]">{initialPlan.confidence || 'Vừa phải'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Nhu cầu tư vấn GVCN:</span>
                    <span className={`font-bold text-[11px] ${initialPlan.needTeacherAdvice && initialPlan.needTeacherAdvice !== 'Không' ? 'text-amber-700' : 'text-slate-800'}`}>
                      {initialPlan.needTeacherAdvice || 'Không'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Thời gian nộp:</span>
                    <span className="font-mono text-slate-600 text-[11px]">
                      {initialSurvey?.submittedAt ? new Date(initialSurvey.submittedAt).toLocaleDateString('vi-VN') : 'Đầu năm học'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-white/70 p-4 border border-blue-100 text-center text-xs text-slate-500 italic">
                Chưa có dữ liệu nguyện vọng từ phiếu khảo sát của học viên này.
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* SECTION 2: LỰA CHỌN HIỆN TẠI (ĐĂNG KÝ XÉT TỐT NGHIỆP) */}
          {/* ========================================================================= */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <UserCheck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">
                    2. LỰA CHỌN HIỆN TẠI (ĐĂNG KÝ XÉT TỐT NGHIỆP)
                  </h3>
                  <div className="text-[10px] text-slate-400">
                    {currentStudent?.fullName || 'Học sinh'} ({currentStudent?.code}) • Lớp 12A1
                  </div>
                </div>
              </div>

              {/* Status Tags */}
              <div className="flex items-center gap-2 flex-wrap justify-end">
                {hasInitialSurveyChoice && (
                  isKeepingInitialChoice ? (
                    <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold text-blue-800 border border-blue-200">
                      ✓ Giữ nguyên theo khảo sát
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                      ℹ️ Đã thay đổi so với khảo sát
                    </span>
                  )
                )}
                {currentRegistration?.updatedAt && (
                  <span className="text-[10px] text-slate-400 font-mono">
                    Cập nhật: {currentRegistration.updatedAt}
                  </span>
                )}
              </div>
            </div>

            {/* Read-only notice for Teacher and Parent */}
            {!isStudentLike && (
              <div className="flex items-center gap-2 rounded-xl bg-blue-50/60 p-3 text-xs text-blue-900 border border-blue-200">
                <Info className="h-4 w-4 text-blue-600 shrink-0" />
                <span>
                  {isTeacher
                    ? 'Giáo viên chủ nhiệm xem thông tin đăng ký môn thi của học viên. Để đóng góp ý kiến hoặc tư vấn định hướng, vui lòng sử dụng khung "Góp ý của GVCN" bên dưới.'
                    : 'Phụ huynh xem thông tin đăng ký môn thi của con (chế độ chỉ đọc). Để gửi lời nhắn động viên hoặc trao đổi với GVCN và con, vui lòng sử dụng khung trao đổi bên dưới.'}
                </span>
              </div>
            )}

            {/* Section A: Compulsory subjects */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>MÔN THI BẮT BUỘC (02 MÔN)</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 border border-slate-200">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Môn bắt buộc 1</span>
                    <div className="text-xs font-black text-slate-800 mt-0.5">TOÁN HỌC</div>
                  </div>
                  <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                    Bắt buộc
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 border border-slate-200">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Môn bắt buộc 2</span>
                    <div className="text-xs font-black text-slate-800 mt-0.5">NGỮ VĂN</div>
                  </div>
                  <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                    Bắt buộc
                  </span>
                </div>
              </div>
            </div>

            {/* Section B: Elective subjects */}
            <div className="space-y-2.5 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-blue-900 uppercase tracking-tight flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  <span>MÔN THI TỰ CHỌN (02 MÔN)</span>
                </label>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  GDPT 2018
                </span>
              </div>

              {isStudentLike ? (
                /* Editable view for Student / Officer */
                <form onSubmit={handleSaveRegistration} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* MÔN TỰ CHỌN 1 */}
                    <div className="space-y-1.5 rounded-xl bg-blue-50/40 p-3.5 border border-blue-200">
                      <label className="block text-xs font-extrabold text-blue-950 uppercase">
                        MÔN TỰ CHỌN 1 <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={electiveSubject1}
                        onChange={e => setElectiveSubject1(e.target.value)}
                        className="w-full rounded-xl border border-blue-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-blue-600 focus:outline-hidden shadow-2xs"
                      >
                        <option value="">-- Chọn môn tự chọn 1 --</option>
                        {ELECTIVE_SUBJECTS_LIST.map(sub => (
                          <option key={`sub1-${sub}`} value={sub}>
                            {sub}
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-slate-500">Môn tự chọn đầu tiên dùng để xét tốt nghiệp.</p>
                    </div>

                    {/* MÔN TỰ CHỌN 2 */}
                    <div className="space-y-1.5 rounded-xl bg-indigo-50/40 p-3.5 border border-indigo-200">
                      <label className="block text-xs font-extrabold text-indigo-950 uppercase">
                        MÔN TỰ CHỌN 2 <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={electiveSubject2}
                        onChange={e => setElectiveSubject2(e.target.value)}
                        className="w-full rounded-xl border border-indigo-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-indigo-600 focus:outline-hidden shadow-2xs"
                      >
                        <option value="">-- Chọn môn tự chọn 2 --</option>
                        {ELECTIVE_SUBJECTS_LIST.map(sub => (
                          <option key={`sub2-${sub}`} value={sub}>
                            {sub}
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-slate-500">Môn tự chọn thứ hai (không trùng môn 1).</p>
                    </div>
                  </div>

                  {/* Foreign Language Exemption Option */}
                  <div className="rounded-xl bg-slate-50 p-3 border border-slate-200 space-y-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isForeignLanguageExempt}
                        onChange={e => setIsForeignLanguageExempt(e.target.checked)}
                        className="rounded-md text-blue-600 focus:ring-0 h-4 w-4"
                      />
                      <span className="text-xs font-bold text-slate-800">
                        Được miễn thi bài thi Ngoại ngữ (có chứng chỉ quốc tế hợp lệ theo quy chế)
                      </span>
                    </label>
                    <p className="text-[11px] text-slate-500 pl-6">
                      Thí sinh có chứng chỉ IELTS ≥ 4.0, TOEFL iBT ≥ 45 hoặc chứng chỉ tương đương theo danh mục Bộ GD&ĐT quy định được quy đổi 10 điểm Ngoại ngữ khi xét tốt nghiệp.
                    </p>
                  </div>

                  {/* Feedback Messages */}
                  {saveErrorMsg && (
                    <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700 border border-rose-200">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{saveErrorMsg}</span>
                    </div>
                  )}

                  {saveSuccessMsg && (
                    <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span>{saveSuccessMsg}</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-2">
                    {currentRegistration && (currentRegistration.electiveSubject1 || currentRegistration.electiveSubject2) ? (
                      <button
                        type="button"
                        onClick={async () => {
                          if (confirm('Bạn có chắc chắn muốn xóa dữ liệu đăng ký môn thi tốt nghiệp đã lưu?')) {
                            await graduationService.deleteRegistration(selectedStudentId);
                            setElectiveSubject1('');
                            setElectiveSubject2('');
                            setIsForeignLanguageExempt(false);
                            setSaveSuccessMsg('Đã xóa dữ liệu đăng ký môn thi thành công!');
                            setTimeout(() => setSaveSuccessMsg(null), 2500);
                          }
                        }}
                        className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-all cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                        <span>Xóa đăng ký</span>
                      </button>
                    ) : <div />}

                    <button
                      type="submit"
                      className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-all cursor-pointer"
                    >
                      <Save className="h-4 w-4" />
                      <span>Lưu lựa chọn môn thi</span>
                    </button>
                  </div>
                </form>
              ) : (
                /* Read-only view for Parent / Teacher */
                currentRegistration && (currentRegistration.electiveSubject1 || currentRegistration.electiveSubject2) ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="flex items-center justify-between rounded-xl bg-blue-50/70 p-3.5 border border-blue-200">
                        <div>
                          <span className="text-[10px] font-bold text-blue-700 uppercase">Môn tự chọn 1</span>
                          <div className="text-xs font-black text-blue-950 mt-0.5">
                            {currentRegistration?.electiveSubject1 || 'Chưa đăng ký'}
                          </div>
                        </div>
                        <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800 border border-blue-200">
                          Đã chọn
                        </span>
                      </div>

                      <div className="flex items-center justify-between rounded-xl bg-indigo-50/70 p-3.5 border border-indigo-200">
                        <div>
                          <span className="text-[10px] font-bold text-indigo-700 uppercase">Môn tự chọn 2</span>
                          <div className="text-xs font-black text-indigo-950 mt-0.5">
                            {currentRegistration?.electiveSubject2 || 'Chưa đăng ký'}
                          </div>
                        </div>
                        <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800 border border-indigo-200">
                          Đã chọn
                        </span>
                      </div>
                    </div>

                    {currentRegistration?.isForeignLanguageExempt && (
                      <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-2.5 text-xs font-bold text-emerald-800 border border-emerald-200">
                        <Check className="h-4 w-4 text-emerald-600" />
                        <span>Thí sinh đăng ký diện miễn thi bài thi Ngoại ngữ (có chứng chỉ quốc tế).</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl bg-slate-50 p-6 text-center border border-slate-200 space-y-1">
                    <AlertCircle className="h-5 w-5 text-slate-400 mx-auto mb-1" />
                    <div className="text-xs font-bold text-slate-700">Học viên chưa đăng ký môn thi tốt nghiệp THPT</div>
                    <div className="text-[11px] text-slate-400">Khi học sinh chọn và lưu 02 môn tự chọn, thông tin đăng ký chính thức sẽ xuất hiện tại đây.</div>
                  </div>
                )
              )}

              {/* Synchronized Teacher Note from Part 4 */}
              {currentRegistration?.teacherNote && (
                <div className="mt-3 rounded-xl bg-amber-50/70 p-3 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                  <MessageSquare className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-black uppercase text-[10px] text-amber-800 block">Ghi chú theo dõi từ GVCN (Phần 4):</span>
                    <span className="font-medium text-amber-950">{currentRegistration.teacherNote}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECTION 3: LỊCH SỬ THAY ĐỔI LỰA CHỌN MÔN THI */}
          {/* ========================================================================= */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                  <History className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    <span>3. LỊCH SỬ THAY ĐỔI LỰA CHỌN MÔN THI</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200">
                      {historyList.length} lượt ghi nhận
                    </span>
                  </h3>
                  <span className="text-[10px] text-slate-400">
                    Theo dõi tiến trình thay đổi nguyện vọng thi tốt nghiệp THPT qua từng giai đoạn
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                {isHistoryExpanded ? (
                  <>
                    <span>Thu gọn</span>
                    <ChevronUp className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    <span>Mở rộng</span>
                    <ChevronDown className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>

            {isHistoryExpanded && (
              <div className="space-y-2.5 pt-1">
                {historyList.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400 italic">
                    Chưa có lịch sử thay đổi môn thi nào được ghi nhận.
                  </div>
                ) : (
                  <div className="relative border-l-2 border-indigo-200 ml-4 pl-4 space-y-3">
                    {historyList.map((item, idx) => {
                      const isSurveySource = item.source === 'START_YEAR_SURVEY';
                      const isStudentUpdate = item.source === 'STUDENT_UPDATE';

                      return (
                        <div key={item.id || idx} className="relative group">
                          {/* Timeline dot */}
                          <div
                            className={`absolute -left-[23px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white shadow-xs ${
                              isSurveySource
                                ? 'bg-blue-600 ring-2 ring-blue-100'
                                : isStudentUpdate
                                ? 'bg-emerald-600 ring-2 ring-emerald-100'
                                : 'bg-slate-600 ring-2 ring-slate-100'
                            }`}
                          />

                          <div className="rounded-xl bg-slate-50/90 hover:bg-slate-50 p-3 border border-slate-200/80 transition-all space-y-1.5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                                    isSurveySource
                                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                      : isStudentUpdate
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                                  }`}
                                >
                                  {isSurveySource
                                    ? 'Khảo sát'
                                    : isStudentUpdate
                                    ? 'Học viên cập nhật'
                                    : 'Hệ thống'}
                                </span>

                                <span className="text-xs font-bold text-slate-800">
                                  {item.electiveSubject1} + {item.electiveSubject2}
                                </span>
                              </div>

                              <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {item.changedAt}
                              </span>
                            </div>

                            <div className="text-[11px] text-slate-600 flex items-center justify-between">
                              <span>
                                Người cập nhật: <strong>{item.changedBy || 'Học viên'}</strong>
                              </span>
                              {item.note && (
                                <span className="text-slate-500 italic text-[10px]">
                                  {item.note}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* SECTION 4: GÓP Ý & TRAO ĐỔI (GVCN - PHỤ HUYNH - HỌC VIÊN) */}
          {/* ========================================================================= */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">
                    4. TRAO ĐỔI & TƯ VẤN MÔN THI TỐT NGHIỆP
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Kênh trao đổi 3 bên giữa Giáo viên chủ nhiệm, Phụ huynh và Học sinh
                  </p>
                </div>
              </div>

              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                {comments.length} tin nhắn
              </span>
            </div>

            {/* Comment Form */}
            <form onSubmit={handleSendComment} className="space-y-2.5">
              <textarea
                value={newCommentText}
                onChange={e => setNewCommentText(e.target.value)}
                placeholder={
                  isTeacher
                    ? 'Nhập góp ý, nhận xét hoặc định hướng môn thi cho học viên này...'
                    : isParent
                    ? 'Nhập lời nhắn, ý kiến đóng góp hoặc câu hỏi gửi tới GVCN và con...'
                    : 'Nhập câu hỏi hoặc mong muốn được GVCN tư vấn thêm về môn thi...'
                }
                rows={2}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-hidden transition-all shadow-2xs"
              />

              <div className="flex items-center justify-between">
                {commentSuccessMsg ? (
                  <span className="text-xs font-bold text-emerald-600">{commentSuccessMsg}</span>
                ) : (
                  <span className="text-[10px] text-slate-400">Góp ý được lưu trữ và hiển thị minh bạch cho GVCN, Phụ huynh & Học viên</span>
                )}

                <button
                  type="submit"
                  disabled={!newCommentText.trim()}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 transition-all cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{isTeacher ? 'Gửi góp ý' : isParent ? 'Gửi lời nhắn' : 'Gửi trao đổi'}</span>
                </button>
              </div>
            </form>

            {/* Comment Thread History */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              {topLevelComments.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 italic">
                  Chưa có góp ý hoặc trao đổi nào. Hãy là người đầu tiên để lại lời nhắn!
                </div>
              ) : (
                topLevelComments.map(comment => {
                  const replies = getRepliesForComment(comment.id);
                  const isReplying = replyingToCommentId === comment.id;

                  return (
                    <div key={comment.id} className="rounded-xl bg-slate-50/80 p-3.5 border border-slate-200/80 space-y-2.5">
                      {/* Top level message */}
                      <div className="flex items-start gap-2.5">
                        <img
                          src={comment.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                          alt={comment.authorName}
                          referrerPolicy="no-referrer"
                          className="h-7 w-7 rounded-lg object-cover ring-1 ring-slate-200 shrink-0 mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 mb-1">
                            <span className="text-xs font-extrabold text-slate-900">{comment.authorName}</span>
                            {getRoleBadge(comment.authorRole)}
                            <span className="text-[10px] text-slate-400 ml-auto">{comment.createdAt}</span>
                          </div>
                          <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                            {comment.content}
                          </div>

                          {/* Reply action button */}
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              type="button"
                              onClick={() => {
                                setReplyingToCommentId(isReplying ? null : comment.id);
                                setReplyText('');
                              }}
                              className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                            >
                              <Reply className="h-3 w-3" />
                              <span>Phản hồi</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Nested Replies (1 Level) */}
                      {replies.length > 0 && (
                        <div className="pl-6 space-y-2 pt-1 border-l-2 border-indigo-200 ml-3.5">
                          {replies.map(reply => (
                            <div key={reply.id} className="flex items-start gap-2 rounded-lg bg-white p-2.5 border border-slate-200/60">
                              <img
                                src={reply.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                                alt={reply.authorName}
                                referrerPolicy="no-referrer"
                                className="h-6 w-6 rounded-md object-cover ring-1 ring-slate-200 shrink-0 mt-0.5"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                                  <span className="text-xs font-bold text-slate-900">{reply.authorName}</span>
                                  {getRoleBadge(reply.authorRole)}
                                  <span className="text-[10px] text-slate-400 ml-auto">{reply.createdAt}</span>
                                </div>
                                <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                                  {reply.content}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Inline Reply Input */}
                      {isReplying && (
                        <div className="pl-6 pt-2 border-l-2 border-indigo-300 ml-3.5 space-y-2">
                          <textarea
                            value={replyText}
                            onChange={e => setReplyText(e.target.value)}
                            placeholder={`Phản hồi tới ${comment.authorName}...`}
                            rows={2}
                            className="w-full rounded-xl border border-indigo-200 bg-white p-2.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-hidden"
                          />
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setReplyingToCommentId(null)}
                              className="rounded-lg px-2.5 py-1 text-[11px] font-bold text-slate-500 hover:bg-slate-200 cursor-pointer"
                            >
                              Hủy
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSendReply(comment.id)}
                              disabled={!replyText.trim()}
                              className="rounded-lg bg-indigo-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
                            >
                              Gửi phản hồi
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* 4. Summary & Class Statistics (Right Column) */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-indigo-600" />
              <span>TỔNG HỢP MÔN THI ĐÃ CHỌN</span>
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 border border-slate-200">
                <span className="text-slate-600">Toán (Bắt buộc)</span>
                <span className="font-extrabold text-blue-700">✓ Đã chọn</span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 border border-slate-200">
                <span className="text-slate-600">Ngữ văn (Bắt buộc)</span>
                <span className="font-extrabold text-blue-700">✓ Đã chọn</span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-blue-50/70 p-2.5 border border-blue-200">
                <span className="text-blue-900 font-bold">Môn tự chọn 1:</span>
                <span className="font-black text-blue-800">{currentRegistration?.electiveSubject1 || 'Chưa đăng ký'}</span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-indigo-50/70 p-2.5 border border-indigo-200">
                <span className="text-indigo-900 font-bold">Môn tự chọn 2:</span>
                <span className="font-black text-indigo-800">{currentRegistration?.electiveSubject2 || 'Chưa đăng ký'}</span>
              </div>
            </div>

            <div className="rounded-xl bg-amber-50 p-2.5 border border-amber-200 text-[11px] text-amber-900 leading-relaxed font-medium">
              Lưu ý: Học sinh cần kiểm tra kỹ tổ hợp môn tự chọn để đảm bảo phù hợp với ngành học dự kiến xét tuyển Đại học - Cao đẳng.
            </div>
          </div>

          {/* Class-wide elective distribution */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
              <Users className="h-4 w-4 text-emerald-600" />
              <span>PHÂN BỐ MÔN TỰ CHỌN CẢ LỚP</span>
            </h3>

            <div className="space-y-1.5 text-xs">
              {Object.entries(electiveStats)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 6)
                .map(([subject, count]) => {
                  const percent = Math.round((count / (allRegistrations.length * 2 || 1)) * 100);
                  return (
                    <div key={subject} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-700">{subject}</span>
                        <span className="font-bold text-slate-500">
                          {count} lượt ({percent}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full bg-blue-600 rounded-full" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>

      {/* Survey Detail Modal (for Student, Class Officer, Teacher) */}
      {isSurveyModalOpen && initialSurvey && (
        <StudentSurveyDetailModal
          isOpen={isSurveyModalOpen}
          onClose={() => setIsSurveyModalOpen(false)}
          survey={initialSurvey}
        />
      )}

      {/* Privacy-Safe Survey Modal (for Parent) */}
      {isParentPrivacyModalOpen && initialSurvey && (
        <ParentSurveyGraduationPrivacyModal
          isOpen={isParentPrivacyModalOpen}
          onClose={() => setIsParentPrivacyModalOpen(false)}
          survey={initialSurvey}
          studentName={currentStudent?.fullName}
          studentCode={currentStudent?.code}
        />
      )}
    </div>
  );
};
