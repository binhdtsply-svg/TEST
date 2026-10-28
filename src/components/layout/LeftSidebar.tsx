/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  MessageSquareQuote,
  Users,
  TreePine,
  Award,
  BookOpen,
  Target,
  Images,
  HeartHandshake,
  Compass,
  CheckSquare,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Calendar,
  CalendarDays,
  FileCheck,
  ShieldAlert,
  Sparkles,
  ClipboardList,
  BookOpenCheck
} from 'lucide-react';
import { authService } from '../../services/AuthService';
import { classService } from '../../services/ClassService';
import { submissionService } from '../../services/SubmissionService';
import { UserRole } from '../../types';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
  roles?: UserRole[];
}

interface LeftSidebarProps {
  currentModule: string;
  onSelectModule?: (id: string) => void;
  onNavigate?: (id: string) => void;
  onOpenAIDrawer?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const MODULE_COLORS: Record<string, { iconColor: string; activeBg: string; activeText: string; activeBorder: string }> = {
  admin: { iconColor: 'text-amber-500', activeBg: 'bg-amber-50', activeText: 'text-amber-700', activeBorder: 'border-amber-200' },
  overview: { iconColor: 'text-blue-500', activeBg: 'bg-blue-50', activeText: 'text-blue-700', activeBorder: 'border-blue-200' },
  homeroom_calendar: { iconColor: 'text-indigo-600', activeBg: 'bg-indigo-50', activeText: 'text-indigo-700', activeBorder: 'border-indigo-200' },
  surveys: { iconColor: 'text-blue-600', activeBg: 'bg-blue-50', activeText: 'text-blue-700', activeBorder: 'border-blue-200' },
  feed: { iconColor: 'text-purple-500', activeBg: 'bg-purple-50', activeText: 'text-purple-700', activeBorder: 'border-purple-200' },
  students: { iconColor: 'text-sky-500', activeBg: 'bg-sky-50', activeText: 'text-sky-700', activeBorder: 'border-sky-200' },
  academic: { iconColor: 'text-emerald-500', activeBg: 'bg-emerald-50', activeText: 'text-emerald-700', activeBorder: 'border-emerald-200' },
  student_results: { iconColor: 'text-emerald-500', activeBg: 'bg-emerald-50', activeText: 'text-emerald-700', activeBorder: 'border-emerald-200' },
  schedule: { iconColor: 'text-amber-500', activeBg: 'bg-amber-50', activeText: 'text-amber-700', activeBorder: 'border-amber-200' },
  laurel: { iconColor: 'text-green-500', activeBg: 'bg-green-50', activeText: 'text-green-700', activeBorder: 'border-green-200' },
  goals: { iconColor: 'text-orange-500', activeBg: 'bg-orange-50', activeText: 'text-orange-700', activeBorder: 'border-orange-200' },
  training: { iconColor: 'text-indigo-500', activeBg: 'bg-indigo-50', activeText: 'text-indigo-700', activeBorder: 'border-indigo-200' },
  graduation: { iconColor: 'text-rose-500', activeBg: 'bg-rose-50', activeText: 'text-rose-700', activeBorder: 'border-rose-200' },
  activities: { iconColor: 'text-fuchsia-500', activeBg: 'bg-fuchsia-50', activeText: 'text-fuchsia-700', activeBorder: 'border-fuchsia-200' },
  album: { iconColor: 'text-teal-500', activeBg: 'bg-teal-50', activeText: 'text-teal-700', activeBorder: 'border-teal-200' },
  parents: { iconColor: 'text-rose-500', activeBg: 'bg-rose-50', activeText: 'text-rose-700', activeBorder: 'border-rose-200' },
  career: { iconColor: 'text-cyan-500', activeBg: 'bg-cyan-50', activeText: 'text-cyan-700', activeBorder: 'border-cyan-200' },
  ai: { iconColor: 'text-indigo-600', activeBg: 'bg-indigo-50', activeText: 'text-indigo-700', activeBorder: 'border-indigo-200' },
  approvals: { iconColor: 'text-amber-500', activeBg: 'bg-amber-50', activeText: 'text-amber-700', activeBorder: 'border-amber-200' },
  reports: { iconColor: 'text-blue-500', activeBg: 'bg-blue-50', activeText: 'text-blue-700', activeBorder: 'border-blue-200' },
  guide: { iconColor: 'text-teal-600', activeBg: 'bg-teal-50', activeText: 'text-teal-700', activeBorder: 'border-teal-200' },
  settings: { iconColor: 'text-slate-500', activeBg: 'bg-slate-100', activeText: 'text-slate-800', activeBorder: 'border-slate-300' }
};

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  currentModule,
  onSelectModule,
  onNavigate,
  onOpenAIDrawer,
  isCollapsed: controlledCollapsed,
  onToggleCollapse
}) => {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [pendingCount, setPendingCount] = useState(submissionService.getPendingCount());
  const [classSettings, setClassSettings] = useState(classService.getSettings());
  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;
  const toggleCollapse = onToggleCollapse || (() => setInternalCollapsed(!internalCollapsed));

  useEffect(() => {
    const unsubSub = submissionService.subscribe(() => {
      setPendingCount(submissionService.getPendingCount());
    });
    const unsubClass = classService.subscribe(() => {
      setClassSettings(classService.getSettings());
    });
    const unsubAuth = authService.subscribe(() => {
      setClassSettings(classService.getSettings());
    });
    return () => {
      unsubSub();
      unsubClass();
      unsubAuth();
    };
  }, []);

  const handleSelect = (id: string) => {
    if (onSelectModule) onSelectModule(id);
    if (onNavigate) onNavigate(id);
  };

  const currentUser = authService.getCurrentUser();
  const role = currentUser.role;
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const isTeacher = role === 'TEACHER';
  const isOfficer = role === 'CLASS_OFFICER';
  const isStudent = role === 'STUDENT';
  const isParent = role === 'PARENT';

  // Navigation Items mapped dynamically to each specific role
  let navItems: NavItem[] = [];

  if (isSuperAdmin) {
    navItems = [
      { id: 'admin', label: '👑 Quản trị Nền tảng', icon: ShieldAlert }
    ];
  } else if (isTeacher) {
    navItems = [
      { id: 'overview', label: 'Tổng quan', icon: LayoutDashboard },
      { id: 'feed', label: 'Bảng tin lớp', icon: MessageSquareQuote },
      { id: 'homeroom_calendar', label: 'Lịch công tác chủ nhiệm', icon: CalendarDays },
      { id: 'surveys', label: 'Khảo sát', icon: ClipboardList },
      { id: 'ai', label: 'AI Trợ lý GVCN', icon: Sparkles },
      { id: 'students', label: 'Quản lý Học viên', icon: Users },
      { id: 'academic', label: 'Quản lý Học tập', icon: BookOpen },
      { id: 'schedule', label: 'Thời khóa biểu & Báo bài', icon: Calendar },
      { id: 'laurel', label: 'Cây Nguyệt Quế', icon: TreePine },
      { id: 'goals', label: 'Mục tiêu năm học', icon: Target },
      { id: 'training', label: 'Rèn luyện & Kỷ luật', icon: Award },
      { id: 'graduation', label: 'Thi Tốt nghiệp THPT', icon: GraduationCap },
      { id: 'activities', label: 'Hoạt động phong trào', icon: Award },
      { id: 'album', label: 'Album kỷ niệm', icon: Images },
      { id: 'parents', label: 'Nhịp cầu Phụ huynh', icon: HeartHandshake },
      { id: 'career', label: 'Hướng nghiệp', icon: Compass }
    ];
  } else if (isOfficer) {
    navItems = [
      { id: 'overview', label: 'Tổng quan', icon: LayoutDashboard },
      { id: 'feed', label: 'Bảng tin lớp', icon: MessageSquareQuote },
      { id: 'surveys', label: 'Khảo sát', icon: ClipboardList },
      { id: 'ai', label: 'AI Cố vấn học tập', icon: Sparkles },
      { id: 'schedule', label: 'Thời khóa biểu & Báo bài', icon: Calendar },
      { id: 'student_results', label: 'Kết quả học tập cá nhân', icon: BookOpen },
      { id: 'laurel', label: 'Cây Nguyệt Quế', icon: TreePine },
      { id: 'goals', label: 'Mục tiêu năm học', icon: Target },
      { id: 'training', label: 'Rèn luyện & Kỷ luật', icon: Award },
      { id: 'graduation', label: 'Thi Tốt nghiệp THPT', icon: GraduationCap },
      { id: 'activities', label: 'Hoạt động phong trào', icon: Award },
      { id: 'album', label: 'Album kỷ niệm', icon: Images },
      { id: 'career', label: 'Hướng nghiệp', icon: Compass },
      { id: 'approvals', label: 'Đề xuất & Đính chính', icon: CheckSquare }
    ];
  } else if (isStudent) {
    navItems = [
      { id: 'overview', label: 'Tổng quan', icon: LayoutDashboard },
      { id: 'feed', label: 'Bảng tin lớp', icon: MessageSquareQuote },
      { id: 'surveys', label: 'Khảo sát', icon: ClipboardList },
      { id: 'ai', label: 'AI Cố vấn học tập', icon: Sparkles },
      { id: 'schedule', label: 'Thời khóa biểu & Báo bài', icon: Calendar },
      { id: 'student_results', label: 'Kết quả học tập cá nhân', icon: BookOpen },
      { id: 'laurel', label: 'Cây Nguyệt Quế', icon: TreePine },
      { id: 'goals', label: 'Mục tiêu năm học', icon: Target },
      { id: 'training', label: 'Rèn luyện cá nhân', icon: Award },
      { id: 'graduation', label: 'Thi Tốt nghiệp THPT', icon: GraduationCap },
      { id: 'activities', label: 'Hoạt động phong trào', icon: Award },
      { id: 'album', label: 'Album kỷ niệm', icon: Images },
      { id: 'career', label: 'Hướng nghiệp & Trải nghiệm', icon: Compass },
      { id: 'approvals', label: 'Đề xuất của tôi', icon: CheckSquare }
    ];
  } else if (isParent) {
    navItems = [
      { id: 'overview', label: 'Tổng quan', icon: LayoutDashboard },
      { id: 'feed', label: 'Bảng tin lớp', icon: MessageSquareQuote },
      { id: 'surveys', label: 'Khảo sát', icon: ClipboardList },
      { id: 'parents', label: 'Nhịp cầu Phụ huynh', icon: HeartHandshake },
      { id: 'schedule', label: 'Thời khóa biểu & Báo bài', icon: Calendar },
      { id: 'student_results', label: 'Kết quả học tập của con', icon: BookOpen },
      { id: 'graduation', label: 'Thi Tốt nghiệp THPT của con', icon: GraduationCap },
      { id: 'training', label: 'Rèn luyện của con', icon: Award },
      { id: 'laurel', label: 'Cây Nguyệt Quế của con', icon: TreePine },
      { id: 'activities', label: 'Hoạt động phong trào', icon: Award },
      { id: 'album', label: 'Album kỷ niệm', icon: Images },
      { id: 'career', label: 'Hướng nghiệp của con', icon: Compass }
    ];
  }

  const adminNavItems: NavItem[] = [
    { id: 'approvals', label: 'Chờ duyệt', icon: CheckSquare, badge: pendingCount },
    { id: 'reports', label: 'Báo cáo & Thống kê', icon: BarChart3 },
    { id: 'settings', label: 'Cài đặt', icon: Settings },
    { id: 'guide', label: 'Hướng dẫn sử dụng', icon: BookOpenCheck }
  ];

  return (
    <aside
      className={`relative hidden md:flex flex-col border-r border-[#E5E7EB] bg-white transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-full md:w-[200px] xl:w-[220px]'
      } shrink-0 rounded-2xl shadow-xs`}
    >
      {/* Collapse Toggle Button */}
      <button
        onClick={toggleCollapse}
        className="absolute -right-3 top-5 z-20 flex h-6 w-6 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-gray-500 shadow-xs hover:bg-gray-50 hover:text-gray-800 cursor-pointer"
        title={isCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
      >
        {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
      </button>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-2.5 py-4 space-y-4">
        {/* Section 1: Menu Chính */}
        <div>
          {!isCollapsed && (
            <div className="px-2.5 pb-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              {isTeacher ? `Không gian lớp ${classSettings.className}` : isStudent ? 'Góc Học Viên' : 'Góc Phụ Huynh'}
            </div>
          )}
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                currentModule === item.id ||
                (item.id === 'laurel' && currentModule === 'laurel-garden') ||
                (item.id === 'academic' && currentModule === 'academics') ||
                (item.id === 'album' && currentModule === 'activities');

              const colorConfig = MODULE_COLORS[item.id] || {
                iconColor: 'text-blue-500',
                activeBg: 'bg-blue-50',
                activeText: 'text-blue-700',
                activeBorder: 'border-blue-200'
              };

              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item.id)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl font-medium text-xs transition-all cursor-pointer text-left ${
                    isActive
                      ? `${colorConfig.activeBg} ${colorConfig.activeText} border ${colorConfig.activeBorder} font-bold shadow-2xs`
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  title={item.label}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 transition-colors ${
                      isActive ? colorConfig.iconColor : `${colorConfig.iconColor} opacity-70 group-hover:opacity-100`
                    }`}
                  />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Section 2: Quản trị (GVCN only) */}
        {isTeacher && (
          <div className="pt-2 border-t border-slate-100">
            {!isCollapsed && (
              <div className="px-2.5 pb-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Quản trị GVCN
              </div>
            )}
            <nav className="flex flex-col gap-1">
              {adminNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentModule === item.id;
                const colorConfig = MODULE_COLORS[item.id] || {
                  iconColor: 'text-slate-500',
                  activeBg: 'bg-slate-50',
                  activeText: 'text-slate-700',
                  activeBorder: 'border-slate-200'
                };

                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item.id)}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl font-medium text-xs transition-all cursor-pointer text-left ${
                      isActive
                        ? `${colorConfig.activeBg} ${colorConfig.activeText} border ${colorConfig.activeBorder} font-bold shadow-2xs`
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                    title={item.label}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon
                        className={`h-4 w-4 shrink-0 ${
                          isActive ? colorConfig.iconColor : `${colorConfig.iconColor} opacity-70`
                        }`}
                      />
                      {!isCollapsed && <span className="truncate">{item.label}</span>}
                    </div>
                    {!isCollapsed && item.badge !== undefined && (
                      <span className="rounded-full bg-rose-500 px-1.5 py-0.2 text-[10px] font-bold text-white">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        )}
      </div>

      {/* Role Badge Indicator */}
      <div className="p-3 border-t border-[#E5E7EB] bg-slate-50/50 rounded-b-2xl">
        {!isCollapsed ? (
          <div className="flex items-center gap-2.5 text-xs">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-700 font-bold">
              {isTeacher ? 'GV' : isStudent ? 'HS' : isParent ? 'PH' : 'CB'}
            </div>
            <div className="truncate">
              <div className="font-bold text-slate-800 truncate">{currentUser.name}</div>
              <div className="text-[10px] text-slate-500 truncate">
                {isTeacher ? `GVCN Lớp ${classSettings.className}` : isStudent ? `Học sinh ${classSettings.className}` : isParent ? `Phụ huynh ${classSettings.className}` : `Cán sự lớp ${classSettings.className}`}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-[10px] font-bold text-blue-700">
              {isTeacher ? 'GV' : isStudent ? 'HS' : isParent ? 'PH' : 'CB'}
            </span>
          </div>
        )}
      </div>
    </aside>
  );
};
