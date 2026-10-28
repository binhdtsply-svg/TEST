/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  LayoutDashboard,
  MessageSquareQuote,
  BookOpen,
  Calendar,
  CalendarDays,
  TreePine,
  Menu,
  X,
  Users,
  Award,
  Sparkles,
  Images,
  HeartHandshake,
  Compass,
  CheckSquare,
  BarChart3,
  Settings,
  GraduationCap,
  Sparkle,
  ClipboardList,
  BookOpenCheck
} from 'lucide-react';
import { authService } from '../../services/AuthService';

interface BottomNavProps {
  currentModule: string;
  onSelectModule?: (moduleId: string) => void;
  onNavigate?: (moduleId: string) => void;
  onOpenAIDrawer?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentModule,
  onSelectModule,
  onNavigate,
  onOpenAIDrawer
}) => {
  const currentUser = authService.getCurrentUser();
  const role = currentUser.role;
  const isTeacher = role === 'TEACHER';
  const isParent = role === 'PARENT';
  const isStudent = role === 'STUDENT';
  const isOfficer = role === 'CLASS_OFFICER';
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleSelect = (id: string) => {
    if (onSelectModule) onSelectModule(id);
    if (onNavigate) onNavigate(id);
    setIsDrawerOpen(false);
  };

  const mainTabs = isStudent ? [
    { id: 'overview', label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'feed', label: 'Bảng tin', icon: MessageSquareQuote },
    { id: 'schedule', label: 'TKB & Bài', icon: Calendar },
    { id: 'student_results', label: 'Kết quả', icon: GraduationCap }
  ] : isParent ? [
    { id: 'overview', label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'feed', label: 'Bảng tin', icon: MessageSquareQuote },
    { id: 'schedule', label: 'TKB & Bài', icon: Calendar },
    { id: 'student_results', label: 'Điểm của con', icon: GraduationCap }
  ] : isOfficer ? [
    { id: 'overview', label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'feed', label: 'Bảng tin', icon: MessageSquareQuote },
    { id: 'schedule', label: 'TKB & Bài', icon: Calendar },
    { id: 'laurel', label: 'Nguyệt quế', icon: TreePine }
  ] : [
    { id: 'overview', label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'feed', label: 'Bảng tin', icon: MessageSquareQuote },
    { id: 'schedule', label: 'TKB & Bài', icon: Calendar },
    { id: 'academic', label: 'Học tập', icon: BookOpen }
  ];

  const drawerItems = [
    { id: 'surveys', label: 'Khảo sát trực tuyến', icon: ClipboardList },
    ...(isTeacher ? [{ id: 'homeroom_calendar', label: 'Lịch công tác chủ nhiệm', icon: CalendarDays }] : []),
    ...(isTeacher ? [{ id: 'ai', label: 'AI Trợ lý GVCN', icon: Sparkles }] : []),
    ...(isStudent || isOfficer ? [{ id: 'ai', label: 'AI Cố vấn học tập', icon: Sparkles }] : []),
    ...(isTeacher ? [{ id: 'students', label: 'Quản lý Học viên', icon: Users }] : []),
    { id: 'graduation', label: 'Thi Tốt nghiệp THPT', icon: GraduationCap },
    { id: 'activities', label: 'Hoạt động phong trào', icon: Award },
    { id: 'training', label: 'Rèn luyện & Điểm nề nếp', icon: Award },
    { id: 'album', label: 'Album kỷ niệm', icon: Images },
    ...(isTeacher ? [{ id: 'parents', label: 'Nhịp cầu Phụ huynh', icon: HeartHandshake }] : []),
    { id: 'career', label: 'Hướng nghiệp & Trải nghiệm', icon: Compass }
  ];

  const adminDrawerItems = isTeacher ? [
    { id: 'approvals', label: 'Nội dung chờ duyệt', icon: CheckSquare },
    { id: 'reports', label: 'Báo cáo trích xuất', icon: BarChart3 },
    { id: 'settings', label: 'Cài đặt lớp & Giao diện', icon: Settings },
    { id: 'guide', label: 'Hướng dẫn sử dụng GVCN', icon: BookOpenCheck }
  ] : [];

  return (
    <>
      {/* Fixed Bottom Bar on Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-slate-200 bg-white/95 px-2 backdrop-blur-md md:hidden">
        {mainTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentModule === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleSelect(tab.id)}
              className={`flex flex-col items-center justify-center py-1 px-2 transition-colors cursor-pointer ${
                isActive ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] mt-0.5">{tab.label}</span>
            </button>
          );
        })}

        {/* 'Tất cả' Button */}
        <button
          onClick={() => setIsDrawerOpen(true)}
          className={`flex flex-col items-center justify-center py-1 px-2 transition-colors cursor-pointer ${
            isDrawerOpen ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Menu className="h-5 w-5" />
          <span className="text-[10px] mt-0.5">Thêm</span>
        </button>
      </nav>

      {/* Drawer for other modules */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-900/60 backdrop-blur-xs md:hidden animate-fade-in">
          <div className="max-h-[80vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl border-t border-slate-200 animate-slide-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">
                  Menu chức năng ({currentUser.name})
                </span>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 py-4">
              {drawerItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentModule === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item.id)}
                    className={`flex items-center gap-2.5 rounded-2xl p-3 text-left text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-indigo-600" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {adminDrawerItems.length > 0 && (
              <div className="pt-2 border-t border-slate-100">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Quản trị GVCN
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {adminDrawerItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item.id)}
                        className="flex items-center gap-2 rounded-2xl bg-slate-50 p-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                      >
                        <Icon className="h-4 w-4 shrink-0 text-slate-500" />
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
