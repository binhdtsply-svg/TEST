/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  Calendar,
  Pin,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  UserCheck,
  ListTodo
} from 'lucide-react';
import { authService } from '../../services/AuthService';
import { submissionService } from '../../services/SubmissionService';
import { academicService } from '../../services/AcademicService';
import { classService } from '../../services/ClassService';
import { postService } from '../../services/PostService';
import { useCurrentStudyPeriod } from '../../hooks/useCurrentStudyPeriod';
import { UserAccount, Submission, ExamSchedule, LessonAssignment } from '../../types';

export interface RightSidebarItem {
  id: string;
  type:
    | 'URGENT_ACTION'
    | 'PENDING_APPROVAL'
    | 'UPCOMING_TEST'
    | 'IMPORTANT_POST'
    | 'ASSIGNMENT'
    | 'ACADEMIC_RESULT';
  classId: string;
  entityType?: 'absence' | 'late' | 'violation' | 'conduct' | 'points' | 'exam' | 'notice' | 'other';
  entityId?: string;
  title: string;
  subtitle?: string;
  targetRoute?: string;
  targetTab?: string;
  createdAt?: string;
}

export function resolveSidebarTarget(
  item: Partial<RightSidebarItem>,
  user: UserAccount
): { module: string; subTab?: string; entityId?: string } {
  // Urgent action items / pending approvals for GVCN always resolve to 'approvals' (Chờ duyệt)
  if (
    item.type === 'URGENT_ACTION' ||
    item.type === 'PENDING_APPROVAL' ||
    item.targetRoute === 'approvals' ||
    item.targetRoute === 'pending'
  ) {
    return {
      module: 'approvals',
      subTab: item.targetTab || 'pending',
      entityId: item.entityId
    };
  }

  // Upcoming tests always resolve to 'schedule' (Thời khóa biểu & Báo bài -> Lịch kiểm tra) for all roles
  if (item.type === 'UPCOMING_TEST' || item.targetRoute === 'schedule' || item.targetRoute === 'exams' || item.targetRoute === 'tests') {
    return {
      module: 'schedule',
      subTab: item.targetTab || 'exams',
      entityId: item.entityId
    };
  }

  if (item.type === 'ASSIGNMENT') {
    return {
      module: 'schedule',
      subTab: 'assignments',
      entityId: item.entityId
    };
  }

  if (item.type === 'ACADEMIC_RESULT') {
    return {
      module: 'student_results'
    };
  }

  if (item.type === 'IMPORTANT_POST') {
    if (user.role === 'PARENT') {
      return { module: 'parents' };
    }
    return { module: 'feed' };
  }

  return {
    module: item.targetRoute || 'overview',
    subTab: item.targetTab,
    entityId: item.entityId
  };
}

interface RightActionCenterProps {
  onSelectModule?: (moduleId: string) => void;
  onNavigate?: (
    moduleId: string,
    options?: { subTab?: string; entityId?: string; proposalId?: string; testId?: string }
  ) => void;
  onOpenAIDrawer?: () => void;
  onOpenReportModal?: () => void;
  onOpenStudentProfile?: (studentId: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const RightActionCenter: React.FC<RightActionCenterProps> = ({
  onSelectModule,
  onNavigate,
  onOpenAIDrawer,
  onOpenReportModal,
  onOpenStudentProfile,
  isCollapsed: controlledCollapsed,
  onToggleCollapse
}) => {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserAccount>(() => authService.getCurrentUser());
  const [classSettings, setClassSettings] = useState(() => classService.getSettings());
  const [pendingCount, setPendingCount] = useState(submissionService.getPendingCount());
  const [pendingSubmissions, setPendingSubmissions] = useState<Submission[]>(() =>
    submissionService.getPendingSubmissions()
  );
  const [exams, setExams] = useState<ExamSchedule[]>(() => academicService.getExams());
  const [assignments, setAssignments] = useState<LessonAssignment[]>(() => academicService.getAssignments());
  const [pinnedPosts, setPinnedPosts] = useState(() => postService.getPinnedPosts());
  const [manualPinnedItems, setManualPinnedItems] = useState(() => classService.getPinnedItems());

  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;
  const toggleCollapse = onToggleCollapse || (() => setInternalCollapsed(!internalCollapsed));

  const currentPeriod = useCurrentStudyPeriod();
  const currentClassId = classSettings.id || '12A1';

  const isTeacher = currentUser.role === 'TEACHER' || (currentUser.role as any) === 'SUPER_ADMIN';
  const isOfficer = currentUser.role === 'CLASS_OFFICER';
  const isStudent = currentUser.role === 'STUDENT';
  const isParent = currentUser.role === 'PARENT';

  const loadData = () => {
    setCurrentUser(authService.getCurrentUser());
    setClassSettings(classService.getSettings());
    setPendingCount(submissionService.getPendingCount());
    setPendingSubmissions(submissionService.getPendingSubmissions());
    setExams(academicService.getExams());
    setAssignments(academicService.getAssignments());
    setPinnedPosts(postService.getPinnedPosts());
    setManualPinnedItems(classService.getPinnedItems());
  };

  useEffect(() => {
    loadData();
    const unsubSub = submissionService.subscribe(loadData);
    const unsubAcademic = academicService.subscribe(loadData);
    const unsubAuth = authService.subscribe(loadData);
    const unsubPost = postService.subscribe(loadData);
    const unsubClass = classService.subscribe(loadData);

    return () => {
      unsubSub();
      unsubAcademic();
      unsubAuth();
      unsubPost();
      unsubClass();
    };
  }, []);

  // Compute role-isolated Important Notice
  const activeImportantNotice = useMemo(() => {
    // 1. If there are pinned posts for this class/tenant
    if (pinnedPosts.length > 0) {
      const p = pinnedPosts[0];
      return {
        title: p.title || 'Thông báo quan trọng của lớp',
        content: p.content || 'Xem chi tiết thông báo trên bảng tin.',
        targetRoute: isParent ? 'parents' : 'feed',
        type: 'IMPORTANT_POST' as const
      };
    }
    // 2. If there are manual pinned items in ClassService
    if (manualPinnedItems.length > 0) {
      const m = manualPinnedItems[0];
      return {
        title: m.title || 'Thông báo quan trọng',
        content: m.content || 'Xem chi tiết thông báo trên trang tổng quan.',
        targetRoute: 'overview',
        type: 'IMPORTANT_POST' as const
      };
    }
    // 3. Role-specific clean fallback
    if (isTeacher) {
      return {
        title: 'Nhắc nhở công tác GVCN',
        content: `Cập nhật điểm danh, duyệt đơn xin phép và theo dõi tiến trình học tập của Lớp ${classSettings.className}.`,
        targetRoute: 'homeroom_calendar',
        type: 'IMPORTANT_POST' as const
      };
    }
    if (isParent) {
      return {
        title: 'Thông báo Phụ huynh',
        content: `Kính mời Quý Phụ huynh theo dõi thông tin học tập, rèn luyện và thông báo của Lớp ${classSettings.className} tại Nhịp cầu Phụ huynh.`,
        targetRoute: 'parents',
        type: 'IMPORTANT_POST' as const
      };
    }
    // Student & Officer:
    return {
      title: 'Thông báo Học viên',
      content: `Theo dõi thời khóa biểu, chuẩn bị bài tập và xem các thông báo mới nhất của Lớp ${classSettings.className} trên Bảng tin.`,
      targetRoute: 'feed',
      type: 'IMPORTANT_POST' as const
    };
  }, [pinnedPosts, manualPinnedItems, isTeacher, isParent, isStudent, isOfficer, classSettings.className]);

  const handleTargetNavigation = (targetItem: Partial<RightSidebarItem>) => {
    const resolved = resolveSidebarTarget(targetItem, currentUser);
    if (onNavigate) {
      onNavigate(resolved.module, {
        subTab: resolved.subTab,
        entityId: resolved.entityId,
        proposalId: resolved.entityId,
        testId: resolved.entityId
      });
    } else if (onSelectModule) {
      onSelectModule(resolved.module);
    }
  };

  const sidebarTitle = isTeacher
    ? 'GVCN Hôm nay'
    : isOfficer
    ? 'Ban cán sự Hôm nay'
    : isStudent
    ? 'Học sinh Hôm nay'
    : 'Phụ huynh Hôm nay';

  // Urgent pending submissions for GVCN (absence, lateness, violations, urgent items)
  const urgentTeacherItems = pendingSubmissions.filter(sub =>
    sub.submissionType === 'leave_permitted' ||
    sub.submissionType === 'violation' ||
    sub.submissionType === 'training_error' ||
    sub.category.toLowerCase().includes('nghỉ') ||
    sub.category.toLowerCase().includes('vắng') ||
    sub.category.toLowerCase().includes('muộn') ||
    sub.category.toLowerCase().includes('trễ') ||
    sub.category.toLowerCase().includes('vi phạm')
  );

  // Top 2-3 upcoming exams for everyone
  const upcomingExams = exams.slice(0, 3);

  // =========================================================================
  // COLLAPSED STATE (Width: 56px / ~48-64px, NO rotated text, NO distorted cards)
  // =========================================================================
  if (isCollapsed) {
    return (
      <aside
        id="right-action-center-collapsed"
        className="relative hidden lg:flex flex-col border border-[#E5E7EB] bg-white w-14 min-w-14 shrink-0 items-center py-4 rounded-2xl shadow-xs space-y-4 select-none"
      >
        {/* Expand Toggle Button */}
        <button
          id="btn-expand-right-sidebar"
          onClick={toggleCollapse}
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-xs hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-all cursor-pointer"
          title="Mở rộng trung tâm tác vụ"
          aria-label="Mở rộng sidebar phải"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Clean, Non-Rotated Icon Stack */}
        <div className="flex flex-col items-center gap-3 pt-2">
          {/* Pending Submissions / Urgent Button for GVCN */}
          {isTeacher && (
            <button
              onClick={() =>
                handleTargetNavigation({
                  type: 'PENDING_APPROVAL',
                  targetRoute: 'approvals',
                  targetTab: 'pending',
                  classId: currentClassId
                })
              }
              className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600 hover:bg-orange-100 hover:scale-105 transition-all cursor-pointer"
              title={`Trung tâm xét duyệt (${pendingCount} việc chờ)`}
            >
              <Clock className="h-4 w-4" />
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[9px] font-black text-white shadow-2xs animate-pulse">
                  {pendingCount}
                </span>
              )}
            </button>
          )}

          {/* Upcoming Tests / Exam Schedule */}
          <button
            onClick={() =>
              handleTargetNavigation({
                type: 'UPCOMING_TEST',
                targetRoute: 'schedule',
                targetTab: 'exams',
                classId: currentClassId
              })
            }
            className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 hover:scale-105 transition-all cursor-pointer"
            title="Lịch kiểm tra sắp tới"
          >
            <Calendar className="h-4 w-4" />
            {upcomingExams.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[9px] font-bold text-white shadow-2xs">
                {upcomingExams.length}
              </span>
            )}
          </button>

          {/* Notices / Announcements */}
          <button
            onClick={() =>
              handleTargetNavigation({
                type: 'IMPORTANT_POST',
                targetRoute: isParent ? 'parents' : 'feed',
                classId: currentClassId
              })
            }
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:scale-105 transition-all cursor-pointer"
            title="Thông báo & Nhắc nhở"
          >
            <Pin className="h-4 w-4" />
          </button>

          {/* Quick Report Button */}
          {onOpenReportModal && (
            <button
              onClick={onOpenReportModal}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white hover:bg-black hover:scale-105 transition-all cursor-pointer shadow-xs mt-2"
              title="Báo cáo nhanh"
            >
              <span className="text-xs font-bold">➕</span>
            </button>
          )}
        </div>
      </aside>
    );
  }

  // =========================================================================
  // EXPANDED STATE (Width: 280px, Rich Cards, Smooth Padding & Routing)
  // =========================================================================
  return (
    <aside
      id="right-action-center-expanded"
      className="relative hidden lg:flex flex-col border border-[#E5E7EB] bg-white w-full lg:w-[260px] lg:min-w-[240px] xl:w-[280px] xl:min-w-[260px] shrink-0 p-4 space-y-3.5 rounded-2xl shadow-xs"
    >
      {/* Collapse Toggle Button */}
      <button
        id="btn-collapse-right-sidebar"
        onClick={toggleCollapse}
        className="absolute -left-3 top-4 z-20 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-xs hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer"
        title="Thu gọn sidebar phải"
        aria-label="Thu gọn sidebar phải"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>

      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <h2 className="text-xs font-black uppercase tracking-wider text-blue-700">
          {sidebarTitle}
        </h2>
        {currentPeriod.status === 'STUDY_WEEK' ? (
          <span
            className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full"
            title={currentPeriod.dateRangeFormatted ? `${currentPeriod.dateRangeFormatted} • ${currentPeriod.schoolYearLabel}` : undefined}
          >
            {`${String(new Date().getMonth() + 1).padStart(2, '0')}/${new Date().getFullYear()}`}
          </span>
        ) : currentPeriod.status === 'BREAK' ? (
          <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
            {currentPeriod.breakName || 'Nghỉ lễ'}
          </span>
        ) : currentPeriod.status === 'BEFORE_SCHOOL_YEAR' ? (
          <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
            Chưa vào năm học
          </span>
        ) : (
          <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
            Bế giảng
          </span>
        )}
      </div>

      <div className="space-y-3 overflow-y-auto pr-0.5 max-h-[calc(100vh-210px)] scrollbar-thin">
        {/* ================================================================ */}
        {/* 🔴 CẦN XỬ LÝ SỚM (Chỉ dành cho GVCN - Điều hướng về Chờ duyệt) */}
        {/* ================================================================ */}
        {isTeacher && (
          <div className="bg-rose-50/80 p-3 rounded-xl border border-rose-100">
            <h4 className="text-[10px] font-black text-rose-700 uppercase mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-rose-600 rounded-full animate-pulse"></span>
                <span>Cần xử lý sớm (GVCN)</span>
              </span>
              {urgentTeacherItems.length > 0 && (
                <span className="bg-rose-200 text-rose-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {urgentTeacherItems.length}
                </span>
              )}
            </h4>

            {urgentTeacherItems.length === 0 ? (
              <p className="text-[11px] text-slate-500 italic">
                Không có sự vụ khẩn cấp tồn đọng
              </p>
            ) : (
              <ul className="text-xs space-y-2">
                {urgentTeacherItems.slice(0, 3).map(sub => (
                  <li
                    key={sub.id}
                    onClick={() =>
                      handleTargetNavigation({
                        id: sub.id,
                        type: 'URGENT_ACTION',
                        classId: sub.classId || currentClassId,
                        entityType:
                          sub.submissionType === 'leave_permitted'
                            ? 'absence'
                            : sub.submissionType === 'violation'
                            ? 'violation'
                            : 'points',
                        entityId: sub.id,
                        targetRoute: 'approvals',
                        targetTab: 'pending',
                        title: `${sub.studentName} (${sub.category})`
                      })
                    }
                    className="flex flex-col gap-0.5 p-1.5 rounded-lg bg-white/70 hover:bg-white border border-rose-100/60 cursor-pointer hover:shadow-2xs transition-all text-[#172033]"
                    title="Nhấn để mở và xử lý tại mục Chờ duyệt"
                  >
                    <div className="flex items-center justify-between gap-1.5 min-w-0">
                      <span className="font-bold text-rose-900 truncate min-w-0 flex-1">
                        {sub.studentName}
                      </span>
                      <span className="text-[10px] text-rose-600 font-semibold shrink-0">
                        {sub.category}
                      </span>
                    </div>
                    <span className="text-slate-500 text-[11px] line-clamp-1">
                      {sub.description}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ================================================================ */}
        {/* 🟠 ĐỀ XUẤT CHỜ DUYỆT (GVCN - Điều hướng về Chờ duyệt) */}
        {/* ================================================================ */}
        {isTeacher && (
          <div className="bg-orange-50/80 p-3 rounded-xl border border-orange-100">
            <h4 className="text-[10px] font-black text-orange-700 uppercase mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-orange-600" />
                <span>Đề xuất chờ duyệt</span>
              </span>
              <span className="bg-orange-200 text-orange-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {pendingCount}
              </span>
            </h4>

            {pendingSubmissions.length === 0 ? (
              <p className="text-[11px] text-slate-500 italic">Không có đề xuất tồn đọng</p>
            ) : (
              <ul className="text-xs space-y-1.5">
                {pendingSubmissions.slice(0, 3).map(sub => (
                  <li
                    key={sub.id}
                    onClick={() =>
                      handleTargetNavigation({
                        id: sub.id,
                        type: 'PENDING_APPROVAL',
                        classId: sub.classId || currentClassId,
                        entityId: sub.id,
                        targetRoute: 'approvals',
                        targetTab: 'pending',
                        title: `${sub.studentName} (${sub.category})`
                      })
                    }
                    className="flex items-center justify-between p-1.5 rounded-lg bg-white/70 hover:bg-white border border-orange-100/60 cursor-pointer hover:shadow-2xs transition-all text-[#172033]"
                    title="Nhấn để mở và xử lý tại mục Chờ duyệt"
                  >
                    <span className="font-medium text-[11px] truncate min-w-0 flex-1" title={`${sub.studentName} (${sub.category})`}>
                      {sub.studentName} ({sub.category})
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 ml-1.5 ${
                        sub.proposedPoints >= 0
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {sub.proposedPoints >= 0 ? `+${sub.proposedPoints}` : sub.proposedPoints}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Học sinh / Ban cán sự: Nhiệm vụ tuần này & Báo bài */}
        {(isStudent || isOfficer) && (
          <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-100">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[10px] font-black text-blue-700 uppercase flex items-center gap-1.5">
                <ListTodo className="w-3.5 h-3.5 text-blue-600" />
                <span>Báo bài & Nhiệm vụ</span>
              </h4>
              <button
                onClick={() =>
                  handleTargetNavigation({
                    type: 'ASSIGNMENT',
                    targetRoute: 'schedule',
                    targetTab: 'assignments',
                    classId: currentClassId
                  })
                }
                className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer"
              >
                Xem tất cả →
              </button>
            </div>
            {assignments.length === 0 ? (
              <p className="text-[11px] text-slate-500 italic">Chưa có báo bài mới cho lớp</p>
            ) : (
              <ul className="text-xs space-y-2">
                {assignments.slice(0, 3).map((assign) => (
                  <li
                    key={assign.id}
                    onClick={() =>
                      handleTargetNavigation({
                        id: assign.id,
                        type: 'ASSIGNMENT',
                        targetRoute: 'schedule',
                        targetTab: 'assignments',
                        classId: currentClassId,
                        entityId: assign.id
                      })
                    }
                    className="flex flex-col gap-0.5 p-1.5 rounded-lg bg-white/70 hover:bg-white border border-blue-100 cursor-pointer hover:shadow-2xs transition-all text-[#172033]"
                    title="Nhấn để mở chi tiết báo bài"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-blue-900 truncate">
                        {assign.subject}: {assign.title || 'Dặn dò'}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full font-bold bg-blue-100 text-blue-700 shrink-0">
                        {assign.dayOfWeek}
                      </span>
                    </div>
                    <span className="text-slate-500 text-[11px] line-clamp-1">
                      {assign.content || 'Xem chi tiết bài tập'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Phụ huynh: Nhắc nhở Phụ huynh & Báo bài của con */}
        {isParent && (
          <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-100">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[10px] font-black text-emerald-800 uppercase flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Báo bài & Nhắc nhở</span>
              </h4>
              <button
                onClick={() =>
                  handleTargetNavigation({
                    type: 'ASSIGNMENT',
                    targetRoute: 'schedule',
                    targetTab: 'assignments',
                    classId: currentClassId
                  })
                }
                className="text-[10px] font-bold text-emerald-700 hover:underline cursor-pointer"
              >
                Xem tất cả →
              </button>
            </div>
            {assignments.length === 0 ? (
              <p className="text-[11px] text-slate-500 italic">Chưa có báo bài mới cho lớp</p>
            ) : (
              <ul className="text-xs space-y-2">
                {assignments.slice(0, 3).map((assign) => (
                  <li
                    key={assign.id}
                    onClick={() =>
                      handleTargetNavigation({
                        id: assign.id,
                        type: 'ASSIGNMENT',
                        targetRoute: 'schedule',
                        targetTab: 'assignments',
                        classId: currentClassId,
                        entityId: assign.id
                      })
                    }
                    className="flex flex-col gap-0.5 p-1.5 rounded-lg bg-white/70 hover:bg-white border border-emerald-100 cursor-pointer hover:shadow-2xs transition-all text-[#172033]"
                    title="Nhấn để mở chi tiết báo bài"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-emerald-950 truncate">
                        {assign.subject}: {assign.title || 'Dặn dò'}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full font-bold bg-emerald-100 text-emerald-800 shrink-0">
                        {assign.dayOfWeek}
                      </span>
                    </div>
                    <span className="text-slate-500 text-[11px] line-clamp-1">
                      {assign.content || 'Xem chi tiết bài tập'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ================================================================ */}
        {/* 📅 KIỂM TRA SẮP TỚI (Dành cho TẤT CẢ các role -> schedule/exams) */}
        {/* ================================================================ */}
        <div className="bg-blue-50/80 p-3 rounded-xl border border-blue-100">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[10px] font-black text-blue-700 uppercase flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>Kiểm tra sắp tới</span>
            </h4>
            <button
              onClick={() =>
                handleTargetNavigation({
                  type: 'UPCOMING_TEST',
                  targetRoute: 'schedule',
                  targetTab: 'exams',
                  classId: currentClassId
                })
              }
              className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer"
            >
              Xem tất cả →
            </button>
          </div>

          {upcomingExams.length === 0 ? (
            <p className="text-[11px] text-slate-500 italic">Chưa có lịch kiểm tra trong tuần</p>
          ) : (
            <ul className="text-xs space-y-2">
              {upcomingExams.map(exam => (
                <li
                  key={exam.id}
                  onClick={() =>
                    handleTargetNavigation({
                      id: exam.id,
                      type: 'UPCOMING_TEST',
                      classId: currentClassId,
                      entityType: 'exam',
                      entityId: exam.id,
                      targetRoute: 'schedule',
                      targetTab: 'exams',
                      title: exam.isCentralized
                        ? (exam.examTitle || 'Kiểm tra tập trung')
                        : `${exam.subject} (${exam.duration})`
                    })
                  }
                  className="border-l-2 border-blue-500 pl-2.5 py-1 bg-white/70 hover:bg-white rounded-r-lg border-y border-r border-slate-100 cursor-pointer hover:shadow-2xs transition-all"
                  title="Nhấn để xem chi tiết lịch kiểm tra và tài liệu ôn tập"
                >
                  <p className="font-bold text-[#172033] line-clamp-1">
                    {exam.isCentralized
                      ? (exam.examTitle || exam.announcementTitle || 'Kiểm tra tập trung')
                      : `${exam.subject} - ${exam.duration}`}
                  </p>
                  <p className="text-slate-500 text-[11px] flex items-center gap-2 mt-0.5">
                    <span>{exam.date || exam.startDate}</span>
                    <span>•</span>
                    <span className="font-semibold text-blue-700">
                      {typeof exam.period === 'number' ? `Tiết ${exam.period}` : exam.period}
                    </span>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 📌 Thông báo quan trọng */}
        <div className="bg-indigo-50/80 p-3 rounded-xl border border-indigo-100">
          <h4 className="text-[10px] font-black text-indigo-700 uppercase mb-2 flex items-center gap-1.5">
            <Pin className="w-3.5 h-3.5 text-indigo-600" />
            <span>Thông báo quan trọng</span>
          </h4>
          <div className="bg-white p-2.5 rounded-lg shadow-2xs border border-indigo-100">
            {activeImportantNotice.title && (
              <h5 className="text-[11px] font-bold text-indigo-950 mb-1 line-clamp-1">
                {activeImportantNotice.title}
              </h5>
            )}
            <p className="text-xs leading-relaxed text-[#172033] line-clamp-3">
              {activeImportantNotice.content}
            </p>
            <button
              onClick={() =>
                handleTargetNavigation({
                  type: activeImportantNotice.type,
                  targetRoute: activeImportantNotice.targetRoute,
                  classId: currentClassId
                })
              }
              className="mt-2 text-[10px] text-indigo-600 font-bold uppercase hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Chi tiết</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-auto pt-3 border-t border-slate-100">
        {onOpenReportModal && (
          <button
            onClick={onOpenReportModal}
            className="w-full bg-[#172033] text-white py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-black active:scale-98 transition-all cursor-pointer shadow-xs"
          >
            <span>➕</span>
            <span>Báo cáo nhanh</span>
          </button>
        )}
      </div>
    </aside>
  );
};
