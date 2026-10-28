/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  GraduationCap,
  Search,
  Bell,
  Sparkles,
  Zap,
  User,
  Check,
  X,
  ChevronDown,
  Camera,
  Settings,
  Shield,
  LogOut,
  ExternalLink,
  HelpCircle,
  MessageSquareHeart,
  KeyRound,
  BookOpenCheck
} from 'lucide-react';
import { authService } from '../../services/AuthService';
import { classService } from '../../services/ClassService';
import { connectivityService } from '../../services/ConnectivityService';
import { schoolWeekService } from '../../services/SchoolWeekService';
import { useCurrentStudyPeriod } from '../../hooks/useCurrentStudyPeriod';
import { useNotifications } from '../../hooks/useNotifications';
import { UserAccount, UserRole, InAppNotification } from '../../types';
import { AvatarUploadModal } from '../common/AvatarUploadModal';
import { UserProfileModal } from '../common/UserProfileModal';
import { ChangePasswordModal } from '../auth/ChangePasswordModal';
import { FeedbackSupportModal } from '../support/FeedbackSupportModal';

interface HeaderProps {
  onOpenQuickReport?: () => void;
  onOpenReportModal?: () => void;
  onOpenAIAssistant?: () => void;
  onOpenAIDrawer?: () => void;
  onSelectModule?: (moduleId: string) => void;
  onNavigate?: (moduleId: string, options?: { subTab?: string; entityId?: string; proposalId?: string; testId?: string; [key: string]: any }) => void;
  onOpenRoleMatrix?: () => void;
  onOpenClassSettings?: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenQuickReport,
  onOpenReportModal,
  onOpenAIAssistant,
  onOpenAIDrawer,
  onSelectModule,
  onNavigate,
  onOpenRoleMatrix,
  onOpenClassSettings,
  onLogout
}) => {
  const [classSettings, setClassSettings] = useState(classService.getSettings());
  const [connStatus, setConnStatus] = useState(connectivityService.getStatus());
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [notificationCoords, setNotificationCoords] = useState<{ top: number; right: number }>({ top: 60, right: 20 });
  const [avatarMenuCoords, setAvatarMenuCoords] = useState<{ top: number; right: number }>({ top: 60, right: 20 });

  const notifBtnRef = useRef<HTMLButtonElement>(null);
  const avatarBtnRef = useRef<HTMLButtonElement>(null);

  // Authoritative real-time synchronized in-app notifications
  const {
    notifications,
    unreadCount,
    currentUser,
    markAsRead,
    markAllAsRead,
    refresh
  } = useNotifications();

  // Single authoritative derived study period hook
  const currentWeekInfo = useCurrentStudyPeriod();

  const handleOpenReport = onOpenQuickReport || onOpenReportModal;
  const handleOpenAI = onOpenAIAssistant || onOpenAIDrawer;
  const handleNav = onSelectModule || onNavigate;

  useEffect(() => {
    const unsubClass = classService.subscribe(() => setClassSettings(classService.getSettings()));
    const unsubAuth = authService.subscribe(() => setClassSettings(classService.getSettings()));
    const unsubConn = connectivityService.subscribe(() => setConnStatus(connectivityService.getStatus()));

    return () => {
      unsubClass();
      unsubAuth();
      unsubConn();
    };
  }, []);

  const handleToggleNotifications = () => {
    if (!isNotificationsOpen && notifBtnRef.current) {
      const rect = notifBtnRef.current.getBoundingClientRect();
      setNotificationCoords({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right
      });
      setIsAvatarMenuOpen(false);
    }
    setIsNotificationsOpen(!isNotificationsOpen);
  };

  const handleToggleAvatarMenu = () => {
    if (!isAvatarMenuOpen && avatarBtnRef.current) {
      const rect = avatarBtnRef.current.getBoundingClientRect();
      setAvatarMenuCoords({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right
      });
      setIsNotificationsOpen(false);
    }
    setIsAvatarMenuOpen(!isAvatarMenuOpen);
  };

  const handleNotificationClick = (item: InAppNotification) => {
    markAsRead(item.id);
    setIsNotificationsOpen(false);
    
    let rawTarget = (item.targetModule || item.link || '').toLowerCase().trim();
    let targetSubTab = item.targetTab || '';

    // Infer target from category if missing
    if (!rawTarget) {
      const cat = (item.category as string || '').toLowerCase();
      if (currentUser.role === 'SUPER_ADMIN') {
        rawTarget = 'admin';
        if (cat === 'support' || cat === 'feedback' || cat === 'suggestion') {
          targetSubTab = 'support_feedback';
        } else if (cat === 'survey') {
          targetSubTab = 'surveys';
        } else {
          targetSubTab = item.targetTab || 'dashboard';
        }
      } else if (cat === 'academic' || cat === 'grades') {
        rawTarget = currentUser.role === 'TEACHER' ? 'academic' : 'student_results';
      } else if (cat === 'support' || cat === 'feedback' || cat === 'suggestion') {
        rawTarget = 'admin';
        targetSubTab = 'support_feedback';
      } else if (cat === 'activity') {
        rawTarget = 'activities';
      } else if (cat === 'laurel') {
        rawTarget = 'laurel';
      } else if (cat === 'test' || cat === 'exam') {
        rawTarget = 'schedule';
        targetSubTab = targetSubTab || 'exams';
      } else if (cat === 'assignment') {
        rawTarget = 'schedule';
        targetSubTab = targetSubTab || 'assignments';
      } else if (cat === 'training' || cat === 'conduct') {
        rawTarget = 'training';
      } else if (cat === 'survey') {
        rawTarget = 'surveys';
      } else if (cat === 'approval' || cat === 'submission') {
        rawTarget = 'approvals';
      } else if (cat === 'parent') {
        rawTarget = 'parents';
      } else {
        rawTarget = 'feed';
      }
    }

    // Resolve normalized target module
    let targetModule = 'overview';
    if (rawTarget === 'posts' || rawTarget === 'post' || rawTarget === 'feed' || rawTarget === 'notices') {
      targetModule = 'feed';
    } else if (rawTarget === 'academic' || rawTarget === 'grades' || rawTarget === 'learning' || rawTarget === 'academic_results') {
      if (currentUser.role === 'TEACHER' || currentUser.role === 'SUPER_ADMIN') {
        targetModule = 'academic';
      } else {
        targetModule = 'student_results';
      }
    } else if (rawTarget === 'schedule' || rawTarget === 'tkb' || rawTarget === 'timetable' || rawTarget === 'assignments' || rawTarget === 'exams' || rawTarget === 'tests') {
      targetModule = 'schedule';
      if (!targetSubTab) {
        targetSubTab = rawTarget === 'exams' || rawTarget === 'tests' ? 'exams' : rawTarget === 'assignments' ? 'assignments' : 'timetable';
      }
    } else if (rawTarget === 'students' || rawTarget === 'student' || rawTarget === 'roster') {
      if (currentUser.role === 'TEACHER' || currentUser.role === 'SUPER_ADMIN') {
        targetModule = 'students';
      } else {
        targetModule = 'student_results';
      }
    } else if (rawTarget === 'surveys' || rawTarget === 'survey') {
      targetModule = 'surveys';
    } else if (rawTarget === 'activities' || rawTarget === 'activity') {
      targetModule = 'activities';
    } else if (rawTarget === 'laurel' || rawTarget === 'garden') {
      targetModule = 'laurel';
    } else if (rawTarget === 'training' || rawTarget === 'discipline' || rawTarget === 'conduct') {
      targetModule = 'training';
    } else if (rawTarget === 'parents' || rawTarget === 'parent' || rawTarget === 'parent_bridge') {
      targetModule = 'parents';
    } else if (rawTarget === 'approvals' || rawTarget === 'pending' || rawTarget === 'submissions') {
      targetModule = 'approvals';
      targetSubTab = targetSubTab || 'pending';
    } else if (rawTarget === 'reports' || rawTarget === 'report' || rawTarget === 'statistics') {
      targetModule = 'reports';
    } else if (rawTarget === 'settings' || rawTarget === 'setting') {
      targetModule = 'settings';
    } else if (rawTarget === 'ai' || rawTarget === 'advisor') {
      targetModule = 'ai';
    } else if (rawTarget === 'graduation' || rawTarget === 'totnghiep') {
      targetModule = 'graduation';
    } else if (rawTarget === 'goals' || rawTarget === 'goal') {
      targetModule = 'goals';
    } else if (rawTarget === 'album' || rawTarget === 'photos') {
      targetModule = 'album';
    } else if (rawTarget === 'admin' || rawTarget === 'platform_admin') {
      targetModule = 'admin';
    } else if (rawTarget === 'student_results' || rawTarget === 'results' || rawTarget === 'scores') {
      targetModule = 'student_results';
    } else {
      targetModule = rawTarget || 'overview';
    }

    const entityId = item.meta?.templateId || item.meta?.surveyTemplateId || item.meta?.surveyId || item.meta?.submissionId || item.meta?.reportId || item.meta?.proposalId || item.meta?.studentId || item.meta?.postId || item.meta?.examId;
    const proposalId = item.meta?.submissionId || item.meta?.reportId || item.meta?.proposalId;
    const testId = item.meta?.examId;
    const surveyId = item.meta?.surveyId;
    const templateId = item.meta?.templateId || item.meta?.surveyTemplateId;

    if (onNavigate) {
      onNavigate(targetModule, {
        subTab: targetSubTab || (targetModule === 'surveys' ? 'responses' : 'pending'),
        proposalId,
        entityId,
        testId,
        surveyId,
        templateId
      } as any);
    } else if (handleNav) {
      handleNav(targetModule);
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return { label: '👑 Super Admin', bg: 'bg-amber-100 text-amber-900 border-amber-300' };
      case 'TEACHER':
        return { label: 'GVCN (Admin)', bg: 'bg-indigo-100 text-indigo-700 border-indigo-200' };
      case 'CLASS_OFFICER':
        return { label: 'Ban cán sự', bg: 'bg-blue-100 text-blue-700 border-blue-200' };
      case 'STUDENT':
        return { label: 'Học sinh', bg: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
      case 'PARENT':
        return { label: 'Phụ huynh', bg: 'bg-amber-100 text-amber-700 border-amber-200' };
      default:
        return { label: 'Thành viên', bg: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  const roleInfo = getRoleBadge(currentUser.role);
  const displayName = currentUser.role === 'SUPER_ADMIN'
    ? 'Ban Quản trị Hệ thống Không Gian Chủ Nhiệm Số'
    : currentUser.name;

  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
        {/* Left: Logo & Class identity */}
        <div className="flex items-center gap-3">
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl font-bold shadow-xs ${
            currentUser.role === 'SUPER_ADMIN' ? 'bg-amber-600 text-white' : 'bg-blue-600 text-white'
          }`}>
            {currentUser.role === 'SUPER_ADMIN' ? (
              <Shield className="h-5 w-5" />
            ) : (
              <GraduationCap className="h-5 w-5" />
            )}
          </div>
          {currentUser.role === 'SUPER_ADMIN' ? (
            <div className="hidden sm:flex flex-col leading-tight">
              <div className="flex items-center gap-2">
                <span className="font-black text-sm text-slate-900 uppercase tracking-tight">
                  KHÔNG GIAN CHỦ NHIỆM SỐ
                </span>
                <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[11px] font-black text-amber-800 border border-amber-300">
                  BAN QUẢN TRỊ NỀN TẢNG
                </span>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                Trung tâm Quản trị Hệ sinh thái • Toàn quyền Super Admin
              </span>
            </div>
          ) : (
            <div className="hidden sm:flex flex-col leading-tight">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-900 uppercase tracking-tight">
                  KHÔNG GIAN CHỦ NHIỆM SỐ
                </span>
                <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700 border border-blue-100">
                  Lớp {classSettings.className}
                </span>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                Lớp {classSettings.className} • Năm học {classSettings.academicYear} • {classSettings.schoolName}
              </span>
            </div>
          )}
        </div>

        {/* Center: Search & Connectivity */}
        <div className="flex items-center gap-3 flex-1 max-w-md mx-4">
          {/* Search Bar */}
          <div className="relative w-full">
            <div className="relative flex items-center">
              <Search className="absolute left-3.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(e.target.value.length > 0);
                }}
                placeholder="Tìm kiếm học viên, bài viết, TKB, rèn luyện..."
                className="w-full bg-slate-100 border-none rounded-full py-1.5 pl-9 pr-8 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setIsSearchOpen(false);
                  }}
                  className="absolute right-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Search Dropdown */}
            {isSearchOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-2 shadow-xl z-50 text-xs">
                <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Kết quả gợi ý điều hướng
                </div>
                <div className="space-y-1 mt-1">
                  {(currentUser.role === 'TEACHER' || currentUser.role === 'SUPER_ADMIN') && (
                    <button
                      onClick={() => {
                        handleNav?.('homeroom_calendar');
                        setIsSearchOpen(false);
                        setSearchQuery('');
                      }}
                      className="w-full rounded-lg px-2.5 py-1.5 text-left hover:bg-indigo-50 hover:text-indigo-700 flex items-center justify-between text-indigo-900 font-medium"
                    >
                      <span>📅 Lịch công tác chủ nhiệm</span>
                      <span className="text-[10px] text-indigo-400">Lịch GVCN</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      handleNav?.('students');
                      setIsSearchOpen(false);
                      setSearchQuery('');
                    }}
                    className="w-full rounded-lg px-2.5 py-1.5 text-left hover:bg-blue-50 hover:text-blue-700 flex items-center justify-between"
                  >
                    <span>📋 Quản lý Danh sách & Hồ sơ Học viên</span>
                    <span className="text-[10px] text-slate-400">Xem tất cả</span>
                  </button>
                  <button
                    onClick={() => {
                      handleNav?.('academic');
                      setIsSearchOpen(false);
                      setSearchQuery('');
                    }}
                    className="w-full rounded-lg px-2.5 py-1.5 text-left hover:bg-blue-50 hover:text-blue-700 flex items-center justify-between"
                  >
                    <span>📚 Thời khóa biểu, Báo bài & Điểm số</span>
                    <span className="text-[10px] text-slate-400">Học tập</span>
                  </button>
                  <button
                    onClick={() => {
                      handleNav?.('training');
                      setIsSearchOpen(false);
                      setSearchQuery('');
                    }}
                    className="w-full rounded-lg px-2.5 py-1.5 text-left hover:bg-blue-50 hover:text-blue-700 flex items-center justify-between"
                  >
                    <span>🌱 Nhật ký Rèn luyện & Trích lục Báo cáo</span>
                    <span className="text-[10px] text-slate-400">Rèn luyện</span>
                  </button>
                  <button
                    onClick={() => {
                      handleNav?.('laurel');
                      setIsSearchOpen(false);
                      setSearchQuery('');
                    }}
                    className="w-full rounded-lg px-2.5 py-1.5 text-left hover:bg-blue-50 hover:text-blue-700 flex items-center justify-between"
                  >
                    <span>🌼 Vườn Nguyệt Quế & Top 3 Vinh Danh</span>
                    <span className="text-[10px] text-slate-400">Nguyệt quế</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Online / Offline status badge */}
          <div className="hidden lg:flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
            {connStatus.isOnline ? (
              <>
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Đã đồng bộ</span>
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span>Offline ({connStatus.pendingCount})</span>
              </>
            )}
          </div>
        </div>

        {/* Right: Actions & User Avatar */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Report Button (Teacher or Officer) */}
          {(currentUser.role === 'TEACHER' || currentUser.role === 'CLASS_OFFICER') && handleOpenReport && (
            <button
              onClick={handleOpenReport}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-all active:scale-95 cursor-pointer"
              title="Báo cáo nhanh rèn luyện / chuyên cần"
            >
              <Zap className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">+ Báo cáo nhanh</span>
            </button>
          )}

          {/* AI Assistant Button (Teacher) */}
          {currentUser.role === 'TEACHER' && handleOpenAI && (
            <button
              onClick={handleOpenAI}
              className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer"
              title="Trợ lý AI Chủ nhiệm"
            >
              <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
              <span className="hidden sm:inline">AI Chủ nhiệm</span>
            </button>
          )}

          {/* Feedback & User Support Center Trigger */}
          <button
            onClick={() => setIsFeedbackModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700 hover:bg-sky-100 transition-colors cursor-pointer"
            title="Đánh giá, Góp ý, Đề xuất chức năng & Yêu cầu Hỗ trợ"
          >
            <HelpCircle className="h-3.5 w-3.5 text-sky-600" />
            <span className="hidden sm:inline">Góp ý & Hỗ trợ</span>
          </button>

          {/* Notifications Trigger Button */}
          <div className="relative">
            <button
              ref={notifBtnRef}
              onClick={handleToggleNotifications}
              className={`relative rounded-xl border p-2 transition-colors cursor-pointer ${
                isNotificationsOpen
                  ? 'border-blue-500 bg-blue-50 text-blue-600'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
              title="Thông báo mới"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* Time Scope Badge: Month/Year for SUPER_ADMIN vs Week of Semester in Academic Year for GVCN / Student / Parent */}
          {currentUser.role === 'SUPER_ADMIN' ? (
            <div
              title={`Phạm vi quản trị hệ sinh thái: Tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}`}
              className="flex items-center gap-1.5 rounded-2xl px-3 py-1.5 text-xs font-black border border-amber-300 bg-amber-50 text-amber-900 shadow-2xs select-none shrink-0"
            >
              <span>{`Tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}`}</span>
            </div>
          ) : (
            <div
              onClick={() => handleNav?.('schedule')}
              title={`${currentWeekInfo.statusText}${currentWeekInfo.dateRangeFormatted ? ` (${currentWeekInfo.dateRangeFormatted})` : ''} • Năm học ${currentWeekInfo.schoolYearLabel} • Nhấn để xem Thời khóa biểu & Kế hoạch tuần`}
              className={`flex items-center gap-1.5 rounded-2xl px-3 py-1.5 text-xs font-black border transition-all cursor-pointer select-none active:scale-95 shrink-0 ${
                currentWeekInfo.isHoliday
                  ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 shadow-2xs'
                  : 'bg-indigo-50 text-indigo-900 border-indigo-200 hover:bg-indigo-100 shadow-2xs'
              }`}
            >
              <span>{currentWeekInfo.badgeText}</span>
            </div>
          )}

          {/* User Avatar & Role */}
          <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
            <div
              onClick={handleToggleAvatarMenu}
              className="text-right hidden sm:block cursor-pointer hover:opacity-80 transition-opacity"
              title="Xem thông tin và tùy chọn tài khoản"
            >
              <p className="text-xs font-bold text-slate-900 leading-tight">{displayName}</p>
              <p className="text-[10px] text-blue-600 uppercase font-semibold leading-tight flex items-center justify-end gap-1">
                <span>{roleInfo.label}</span>
                <ChevronDown className="h-2.5 w-2.5" />
              </p>
            </div>

            <button
              ref={avatarBtnRef}
              onClick={handleToggleAvatarMenu}
              className="group relative h-9 w-9 rounded-full ring-2 ring-blue-500/20 overflow-hidden cursor-pointer shadow-xs focus:ring-2 focus:ring-blue-600"
              title="Tùy chọn tài khoản"
            >
              <img
                src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                alt={displayName}
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover transition-transform group-hover:scale-110"
              />
            </button>
          </div>
        </div>
      </header>

      {/* PORTAL: Notifications Popup (High z-index to never be clipped or submerged) */}
      {isNotificationsOpen && typeof document !== 'undefined' && createPortal(
        <>
          <div
            className="fixed inset-0 z-[9990] bg-transparent"
            onClick={() => setIsNotificationsOpen(false)}
          />
          <div
            style={{
              top: `${notificationCoords.top}px`,
              right: `${Math.max(12, notificationCoords.right)}px`
            }}
            className="fixed z-[9995] w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl animate-fade-in text-xs max-h-[85vh] flex flex-col"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3 shrink-0">
              <div className="flex items-center gap-1.5">
                <Bell className="h-4 w-4 text-blue-600" />
                <span className="font-bold text-slate-900">Thông báo mới nhất</span>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-rose-100 px-1.5 py-0.2 text-[10px] font-bold text-rose-700">
                    {unreadCount} mới
                  </span>
                )}
              </div>
              <button
                onClick={markAllAsRead}
                className="text-[11px] text-blue-600 font-bold hover:underline cursor-pointer"
              >
                Đã đọc tất cả
              </button>
            </div>

            <div className="space-y-2 overflow-y-auto pr-1 flex-1">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <Bell className="h-8 w-8 mx-auto mb-2 text-slate-300 stroke-1" />
                  <p className="font-semibold text-xs text-slate-600">Không có thông báo nào</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Các hoạt động và nhắc nhở mới sẽ xuất hiện tại đây.</p>
                </div>
              ) : (
                notifications.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleNotificationClick(item)}
                    className={`rounded-xl p-3 border transition-colors cursor-pointer ${
                      item.read
                        ? 'bg-slate-50 border-slate-200 opacity-75 hover:opacity-100'
                        : 'bg-blue-50/70 border-blue-200 hover:bg-blue-100/70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold text-slate-900 leading-snug">{item.title}</div>
                      {!item.read && (
                        <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="text-slate-600 text-[11px] mt-1 leading-relaxed">{item.desc}</p>
                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-200/50">
                      <span className="text-[10px] text-slate-400">{item.time}</span>
                      <span className="text-[10px] font-bold text-blue-600 hover:underline">
                        Xem chi tiết →
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>,
        document.body
      )}

      {/* PORTAL: Avatar Dropdown Menu */}
      {isAvatarMenuOpen && typeof document !== 'undefined' && createPortal(
        <>
          <div
            className="fixed inset-0 z-[9990] bg-transparent"
            onClick={() => setIsAvatarMenuOpen(false)}
          />
          <div
            style={{
              top: `${avatarMenuCoords.top}px`,
              right: `${Math.max(12, avatarMenuCoords.right)}px`
            }}
            className="fixed z-[9995] w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl animate-fade-in text-xs"
          >
            {/* User Header in dropdown */}
            <div className="p-3 border-b border-slate-100 flex items-center gap-3">
              <img
                src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                alt=""
                referrerPolicy="no-referrer"
                className="h-10 w-10 rounded-full object-cover ring-2 ring-blue-500/20"
              />
              <div className="min-w-0 flex-1">
                <div className="font-bold text-slate-900 truncate">{displayName}</div>
                <div className="text-[10px] text-blue-600 font-semibold">{roleInfo.label}</div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="py-1.5 space-y-1">
              <button
                onClick={() => {
                  setIsAvatarMenuOpen(false);
                  setIsProfileModalOpen(true);
                }}
                className="w-full rounded-xl px-3 py-2 text-left text-slate-700 hover:bg-slate-100 flex items-center gap-2.5 font-medium transition-colors cursor-pointer"
              >
                <User className="h-4 w-4 text-slate-500" />
                <span>Thông tin cá nhân</span>
              </button>

              <button
                onClick={() => {
                  setIsAvatarMenuOpen(false);
                  setIsAvatarModalOpen(true);
                }}
                className="w-full rounded-xl px-3 py-2 text-left text-slate-700 hover:bg-slate-100 flex items-center gap-2.5 font-medium transition-colors cursor-pointer"
              >
                <Camera className="h-4 w-4 text-slate-500" />
                <span>Đổi ảnh đại diện</span>
              </button>

              {currentUser.role !== 'SUPER_ADMIN' && (
                <button
                  onClick={() => {
                    setIsAvatarMenuOpen(false);
                    setIsChangePasswordModalOpen(true);
                  }}
                  className="w-full rounded-xl px-3 py-2 text-left text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2.5 font-medium transition-colors cursor-pointer"
                >
                  <KeyRound className="h-4 w-4 text-indigo-600" />
                  <span>Đổi mật khẩu</span>
                </button>
              )}

              {currentUser.role === 'SUPER_ADMIN' && handleNav && (
                <button
                  onClick={() => {
                    setIsAvatarMenuOpen(false);
                    handleNav('admin');
                  }}
                  className="w-full rounded-xl px-3 py-2 text-left bg-amber-50 text-amber-900 hover:bg-amber-100 flex items-center gap-2.5 font-bold transition-colors cursor-pointer border border-amber-200"
                >
                  <Shield className="h-4 w-4 text-amber-600" />
                  <span>Bảng điều khiển Super Admin</span>
                </button>
              )}

              {currentUser.role === 'TEACHER' && onOpenClassSettings && (
                <button
                  onClick={() => {
                    setIsAvatarMenuOpen(false);
                    onOpenClassSettings();
                  }}
                  className="w-full rounded-xl px-3 py-2 text-left text-slate-700 hover:bg-slate-100 flex items-center gap-2.5 font-medium transition-colors cursor-pointer"
                >
                  <Settings className="h-4 w-4 text-slate-500" />
                  <span>Cài đặt lớp học & Giao diện</span>
                </button>
              )}

              {currentUser.role === 'TEACHER' && handleNav && (
                <button
                  onClick={() => {
                    setIsAvatarMenuOpen(false);
                    handleNav('guide');
                  }}
                  className="w-full rounded-xl px-3 py-2 text-left text-teal-800 hover:bg-teal-50 flex items-center gap-2.5 font-bold transition-colors cursor-pointer border border-teal-100 bg-teal-50/50"
                >
                  <BookOpenCheck className="h-4 w-4 text-teal-600" />
                  <span>Hướng dẫn sử dụng GVCN</span>
                </button>
              )}

              {onOpenRoleMatrix && (
                <button
                  onClick={() => {
                    setIsAvatarMenuOpen(false);
                    onOpenRoleMatrix();
                  }}
                  className="w-full rounded-xl px-3 py-2 text-left text-blue-700 hover:bg-blue-50 flex items-center gap-2.5 font-bold transition-colors cursor-pointer"
                >
                  <Shield className="h-4 w-4 text-blue-500" />
                  <span>Chuyển đổi vai trò Demo</span>
                </button>
              )}

              <button
                onClick={() => {
                  setIsAvatarMenuOpen(false);
                  setIsFeedbackModalOpen(true);
                }}
                className="w-full rounded-xl px-3 py-2 text-left text-sky-800 hover:bg-sky-50 flex items-center gap-2.5 font-bold transition-colors cursor-pointer"
              >
                <HelpCircle className="h-4 w-4 text-sky-600" />
                <span>Đánh giá, Góp ý & Hỗ trợ</span>
              </button>

              {onLogout && (
                <button
                  onClick={() => {
                    setIsAvatarMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full rounded-xl px-3 py-2 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 font-bold transition-colors cursor-pointer border-t border-slate-100 mt-1"
                >
                  <LogOut className="h-4 w-4 text-rose-500" />
                  <span>Đăng xuất khỏi không gian</span>
                </button>
              )}
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Feedback, Suggestions & User Support Modal */}
      <FeedbackSupportModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
      />

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onOpenAvatarUpload={() => setIsAvatarModalOpen(true)}
        onOpenClassSettings={onOpenClassSettings}
        onOpenRoleMatrix={onOpenRoleMatrix}
        onOpenChangePassword={() => {
          setIsProfileModalOpen(false);
          setIsChangePasswordModalOpen(true);
        }}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordModalOpen}
        onClose={() => setIsChangePasswordModalOpen(false)}
      />

      {/* Change Avatar Modal */}
      <AvatarUploadModal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        onSuccess={() => {
          refresh();
        }}
      />
    </>
  );
};

