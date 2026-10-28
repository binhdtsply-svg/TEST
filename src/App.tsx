/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { AttachedFile, Student, ClassSettings } from './types';
import { authService } from './services/AuthService';
import { authRepository } from './services/AuthRepository';
import { studentService } from './services/StudentService';
import { classService } from './services/ClassService';
import { realtimeSyncService } from './services/RealtimeSyncService';
import { adminThemeService, AdminThemeConfig } from './services/AdminThemeService';
import { ShieldAlert, Lock, ArrowRight } from 'lucide-react';

// Layout components
import { Header } from './components/layout/Header';
import { LeftSidebar } from './components/layout/LeftSidebar';
import { RightActionCenter } from './components/layout/RightActionCenter';
import { BottomNav } from './components/layout/BottomNav';
import { ClassCover } from './components/layout/ClassCover';

// Overview widgets (loaded immediately for initial dashboard view)
import { QuickStatsCards } from './components/overview/QuickStatsCards';
import { ClassYearTimeline } from './components/overview/ClassYearTimeline';
import { PinnedNoticesCard } from './components/overview/PinnedNoticesCard';
import { HomeroomCareAndWeeklySummary } from './components/overview/HomeroomCareAndWeeklySummary';

// Core Auth, Guard & Error Boundary components
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { publicShareService } from './services/PublicShareService';
import { AccessRestricted } from './components/common/AccessRestricted';
import { LoginScreen } from './components/auth/LoginScreen';
import { ForcePasswordChangeModal } from './components/auth/ForcePasswordChangeModal';
import { DevRouteSwitcher } from './components/common/DevRouteSwitcher';

// Lazy-loaded Core Module Pages (loaded on-demand after login / tab navigation)
const HomeroomCalendarModule = lazy(() => import('./components/calendar/HomeroomCalendarModule').then(m => ({ default: m.HomeroomCalendarModule })));
const FeedModule = lazy(() => import('./components/feed/FeedModule').then(m => ({ default: m.FeedModule })));
const StudentsModule = lazy(() => import('./components/students/StudentsModule').then(m => ({ default: m.StudentsModule })));
const LaurelGardenModule = lazy(() => import('./components/laurel/LaurelGardenModule').then(m => ({ default: m.LaurelGardenModule })));
const TrainingModule = lazy(() => import('./components/training/TrainingModule').then(m => ({ default: m.TrainingModule })));
const AcademicModule = lazy(() => import('./components/academic/AcademicModule').then(m => ({ default: m.AcademicModule })));
const GraduationModule = lazy(() => import('./components/graduation/GraduationModule').then(m => ({ default: m.GraduationModule })));
const ActivitiesModule = lazy(() => import('./components/activities/ActivitiesModule').then(m => ({ default: m.ActivitiesModule })));
const AlbumModule = lazy(() => import('./components/album/AlbumModule').then(m => ({ default: m.AlbumModule })));
const ParentBridgeModule = lazy(() => import('./components/parents/ParentBridgeModule').then(m => ({ default: m.ParentBridgeModule })));
const CareerModule = lazy(() => import('./components/career/CareerModule').then(m => ({ default: m.CareerModule })));
const SettingsModule = lazy(() => import('./components/settings/SettingsModule').then(m => ({ default: m.SettingsModule })));
const GoalsModule = lazy(() => import('./components/goals/GoalsModule').then(m => ({ default: m.GoalsModule })));
const StudentPersonalResults = lazy(() => import('./components/student/StudentPersonalResults').then(m => ({ default: m.StudentPersonalResults })));
const ApprovalCenterModule = lazy(() => import('./components/approvals/ApprovalCenterModule').then(m => ({ default: m.ApprovalCenterModule })));
const ReportsStatisticsModule = lazy(() => import('./components/reports/ReportsStatisticsModule').then(m => ({ default: m.ReportsStatisticsModule })));
const ScheduleAndAssignmentsModule = lazy(() => import('./components/academic/ScheduleAndAssignmentsModule').then(m => ({ default: m.ScheduleAndAssignmentsModule })));
const PlatformAdminConsole = lazy(() => import('./components/admin/PlatformAdminConsole').then(m => ({ default: m.PlatformAdminConsole })));
const AIHomeroomModule = lazy(() => import('./components/ai/AIHomeroomModule').then(m => ({ default: m.AIHomeroomModule })));
const StudentAIAdvisorModule = lazy(() => import('./components/student/StudentAIAdvisorModule').then(m => ({ default: m.StudentAIAdvisorModule })));
const StudentSurveyCard = lazy(() => import('./components/student/StudentSurveyCard').then(m => ({ default: m.StudentSurveyCard })));
const TeacherSurveyManagementView = lazy(() => import('./components/students/TeacherSurveyManagementView').then(m => ({ default: m.TeacherSurveyManagementView })));
const ParentSurveyView = lazy(() => import('./components/parents/ParentSurveyView').then(m => ({ default: m.ParentSurveyView })));
const TeacherGuideModule = lazy(() => import('./components/guide/TeacherGuideModule').then(m => ({ default: m.TeacherGuideModule })));

// Lazy-loaded Public Shared View & On-Demand Modals/Drawers
const PublicShareView = lazy(() => import('./components/common/PublicShareView').then(m => ({ default: m.PublicShareView })));
const FilePreviewModal = lazy(() => import('./components/common/FilePreviewModal').then(m => ({ default: m.FilePreviewModal })));
const QuickReportModal = lazy(() => import('./components/common/QuickReportModal').then(m => ({ default: m.QuickReportModal })));
const AIAssistantDrawer = lazy(() => import('./components/common/AIAssistantDrawer').then(m => ({ default: m.AIAssistantDrawer })));
const DemoRoleMatrix = lazy(() => import('./components/layout/DemoRoleMatrix').then(m => ({ default: m.DemoRoleMatrix })));
const StudentProfileModal = lazy(() => import('./components/students/StudentProfileModal').then(m => ({ default: m.StudentProfileModal })));
const StudentEditModal = lazy(() => import('./components/students/StudentEditModal').then(m => ({ default: m.StudentEditModal })));
const SetupWizardModal = lazy(() => import('./components/admin/SetupWizardModal').then(m => ({ default: m.SetupWizardModal })));

function ModuleLoadingFallback() {
  return (
    <div className="w-full py-16 flex flex-col items-center justify-center gap-3 text-slate-500">
      <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-xs font-semibold">Đang tải phân hệ...</p>
    </div>
  );
}

function normalizeAppModule(rawMod: string, role?: string): string {
  const m = (rawMod || '').toLowerCase().trim();
  if (m === 'quan-tri' || m === 'quan-tri-x7k9' || m === 'quantri' || m === 'admin-login' || m === 'admin_login' || m === 'adminlogin') {
    if (role === 'SUPER_ADMIN') return 'admin';
    return 'access_denied_admin';
  }
  if (m === 'app' || m === 'dang-nhap' || m === 'dang_nhap' || m === 'login') {
    if (role === 'SUPER_ADMIN') return 'admin';
    return 'overview';
  }
  if (role === 'SUPER_ADMIN') {
    return 'admin';
  }
  if (!m || m === 'overview' || m === 'home' || m === 'dashboard') return 'overview';
  if (m === 'homeroom_calendar' || m === 'homeroom-calendar' || m === 'teacher_calendar' || m === 'workcenter' || m === 'lichcongtac' || m === 'lich-cong-tac' || m === 'lich') {
    if (role === 'TEACHER') return 'homeroom_calendar';
    return 'overview';
  }
  if (m === 'posts' || m === 'post' || m === 'notices' || m === 'feed') return 'feed';
  if (m === 'schedule' || m === 'tkb' || m === 'timetable' || m === 'assignments' || m === 'exams' || m === 'tests') return 'schedule';
  if (m === 'academic' || m === 'grades' || m === 'learning' || m === 'academic_results') {
    if (role === 'TEACHER') return 'academic';
    return 'student_results';
  }
  if (m === 'student_results' || m === 'results' || m === 'scores' || m === 'ketquahoctap') return 'student_results';
  if (m === 'students' || m === 'student' || m === 'roster' || m === 'hocsinh') {
    if (role === 'TEACHER') return 'students';
    return 'student_results';
  }
  if (m === 'surveys' || m === 'survey' || m === 'khaosat') return 'surveys';
  if (m === 'activities' || m === 'activity' || m === 'phongtrao') return 'activities';
  if (m === 'laurel' || m === 'garden' || m === 'nguyetque') return 'laurel';
  if (m === 'training' || m === 'discipline' || m === 'conduct' || m === 'renluyen') return 'training';
  if (m === 'parents' || m === 'parent' || m === 'parent_bridge' || m === 'phuhuynh') return 'parents';
  if (m === 'approvals' || m === 'pending' || m === 'submissions' || m === 'choduyet') return 'approvals';
  if (m === 'reports' || m === 'report' || m === 'statistics' || m === 'thongke') return 'reports';
  if (m === 'guide' || m === 'huong-dan' || m === 'huongdan' || m === 'manual' || m === 'tailieu') {
    if (role === 'TEACHER') return 'guide';
    return 'overview';
  }
  if (m === 'settings' || m === 'setting' || m === 'caidat') return 'settings';
  if (m === 'ai' || m === 'advisor' || m === 'covanai') return 'ai';
  if (m === 'graduation' || m === 'totnghiep' || m === 'exam') return 'graduation';
  if (m === 'goals' || m === 'goal' || m === 'muctieu') return 'goals';
  if (m === 'album' || m === 'photos' || m === 'anh') return 'album';
  if (m === 'career' || m === 'huongnghiep') return 'career';
  if (m === 'admin' || m === 'platform_admin') return 'admin';
  return 'overview';
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => authService.isAuthenticated());
  const [activeShareToken, setActiveShareToken] = useState<string | null>(() => publicShareService.detectShareUrl());

  const getInitialModule = () => {
    const role = authService.getCurrentUser().role;
    if (role === 'SUPER_ADMIN') return 'admin';
    if (!authService.isAuthenticated()) {
      return 'overview';
    }
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '').replace(/^\//, '').split('?')[0].split('/')[0];
      const path = (window.location.pathname || '').replace(/^\//, '').split('?')[0].split('/')[0];
      const target = hash || path;
      if (target) {
        return normalizeAppModule(target, role);
      }
    }
    return 'overview';
  };

  const [currentModule, setCurrentModuleState] = useState<string>(getInitialModule);
  const [isRightSidebarCollapsed, setIsRightSidebarCollapsed] = useState(false);
  const [navOptions, setNavOptions] = useState<{
    subTab?: string;
    entityId?: string;
    proposalId?: string;
    testId?: string;
  } | null>(null);
  const [currentUser, setCurrentUser] = useState(authService.getCurrentUser());
  const [classSettings, setClassSettings] = useState<ClassSettings>(classService.getSettings());
  const [adminTheme, setAdminTheme] = useState<AdminThemeConfig>(adminThemeService.getAdminTheme());

  const setCurrentModule = (mod: string) => {
    const normalized = normalizeAppModule(mod, currentUser.role);
    setCurrentModuleState(normalized);
    if (typeof window !== 'undefined') {
      window.location.hash = normalized;
    }
  };

  const handleNavigate = (
    moduleId: string,
    options?: { subTab?: string; entityId?: string; proposalId?: string; testId?: string }
  ) => {
    const normalized = normalizeAppModule(moduleId, currentUser.role);
    setNavOptions(options || null);
    setCurrentModuleState(normalized);
    if (typeof window !== 'undefined') {
      window.location.hash = normalized;
    }
  };

  const handleLoginSuccess = () => {
    const user = authService.getCurrentUser();
    setCurrentUser(user);
    const targetModule = user.role === 'SUPER_ADMIN' ? 'admin' : 'overview';
    setCurrentModuleState(targetModule);
    setNavOptions(null);
    if (typeof window !== 'undefined') {
      window.location.hash = targetModule;
    }
    setIsLoggedIn(true);
    verifyServerAuthorization();
  };

  const handleLogout = () => {
    const wasAdmin = currentUser.role === 'SUPER_ADMIN';
    authService.logout();
    setServerVerification({
      isLoading: false,
      isVerified: false,
      serverRole: undefined
    });
    setCurrentModuleState('overview');
    setNavOptions(null);
    if (typeof window !== 'undefined') {
      const exitRoute = wasAdmin ? '/quan-tri' : '/app';
      try {
        window.history.pushState({}, '', exitRoute);
      } catch {
        window.location.hash = wasAdmin ? 'quan-tri' : 'app';
      }
    }
    setIsLoggedIn(false);
  };

  // Server-side authorization verification state (Source of truth for permissions)
  const [serverVerification, setServerVerification] = useState<{
    isLoading: boolean;
    isVerified: boolean;
    serverRole?: string;
  }>({
    isLoading: true,
    isVerified: false
  });

  const verifyServerAuthorization = async () => {
    if (!authService.isAuthenticated()) {
      setServerVerification({ isLoading: false, isVerified: false, serverRole: undefined });
      return;
    }
    setServerVerification(prev => ({ ...prev, isLoading: true }));
    try {
      const res = await authRepository.verifySession();
      if (res.success && res.user) {
        setServerVerification({
          isLoading: false,
          isVerified: true,
          serverRole: res.user.role
        });
        authService.syncUserFromServer(res.user);
      } else if (res.errorCode === 'NETWORK_ERROR' || res.errorCode === 'SERVER_ERROR') {
        // Safe Session Recovery: Temporary network failure or container cold-start!
        // DO NOT log out, DO NOT clear user state! Keep current authenticated session intact.
        setServerVerification({
          isLoading: false,
          isVerified: true,
          serverRole: currentUser.role
        });
      } else {
        setServerVerification({
          isLoading: false,
          isVerified: false,
          serverRole: undefined
        });
        authService.logout();
        setIsLoggedIn(false);
      }
    } catch {
      // Temporary network exception: preserve session
      setServerVerification({
        isLoading: false,
        isVerified: true,
        serverRole: currentUser.role
      });
    }
  };

  useEffect(() => {
    verifyServerAuthorization();
  }, [isLoggedIn, currentModule]);

  // Modal & Drawer states
  const [previewFile, setPreviewFile] = useState<AttachedFile | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isAIDrawerOpen, setIsAIDrawerOpen] = useState(false);
  const [isRoleMatrixOpen, setIsRoleMatrixOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  // Student Profile Drawer from other widgets
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  useEffect(() => {
    let prevRole = authService.getCurrentUser().role;
    const unsubAuth = authService.subscribe(() => {
      const u = authService.getCurrentUser();
      setCurrentUser(u);
      realtimeSyncService.reconnect();
      if (u.role !== prevRole) {
        prevRole = u.role;
        const target = u.role === 'SUPER_ADMIN' ? 'admin' : 'overview';
        setCurrentModuleState(target);
        setNavOptions(null);
        if (typeof window !== 'undefined') {
          window.location.hash = target;
        }
      }
    });
    const unsubClass = classService.subscribe(() => {
      setClassSettings(classService.getSettings());
    });
    const unsubAdminTheme = adminThemeService.subscribe(() => {
      setAdminTheme(adminThemeService.getAdminTheme());
    });
    const handleUrlChange = () => {
      const shareToken = publicShareService.detectShareUrl();
      setActiveShareToken(shareToken);
      if (!shareToken) {
        const mod = getInitialModule();
        setCurrentModuleState(mod);
      }
    };
    window.addEventListener('hashchange', handleUrlChange);
    window.addEventListener('popstate', handleUrlChange);
    return () => {
      unsubAuth();
      unsubClass();
      unsubAdminTheme();
      window.removeEventListener('hashchange', handleUrlChange);
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, []);

  // Compute isolated effective theme: Admin has dedicated theme scope, Class users have class theme scope
  const isAdmin = currentUser.role === 'SUPER_ADMIN';
  const effectiveTheme = useMemo(() => {
    if (isAdmin) {
      return {
        fontFamily: adminTheme.fontFamily || 'Be Vietnam Pro',
        textColor: adminTheme.textColor || '#0F172A',
        backgroundType: adminTheme.backgroundType,
        backgroundColor: adminTheme.backgroundColor || '#F8FAFC',
        gradient: adminTheme.gradient,
        backgroundImage: adminTheme.backgroundImage,
        overlayOpacity: adminTheme.overlayOpacity ?? 20
      };
    }
    const t = classSettings.theme;
    return {
      fontFamily: t.fontFamily || 'Be Vietnam Pro',
      textColor: t.textColor || '#172033',
      backgroundType: t.backgroundType,
      backgroundColor: t.backgroundColor || '#F8FAFF',
      gradient: t.gradient,
      backgroundImage: t.backgroundImage,
      overlayOpacity: t.overlayOpacity ?? 25
    };
  }, [isAdmin, adminTheme, classSettings.theme]);

  // Compute container background style
  const containerStyle = useMemo<React.CSSProperties>(() => {
    const fontName = effectiveTheme.fontFamily;
    const baseStyle: React.CSSProperties = {
      fontFamily: `'${fontName}', system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`,
      color: effectiveTheme.textColor,
    };

    if (effectiveTheme.backgroundType === 'gradient' && effectiveTheme.gradient) {
      baseStyle.background = `linear-gradient(${effectiveTheme.gradient.direction || 'to bottom'}, ${effectiveTheme.gradient.color1 || '#F8FAFC'}, ${effectiveTheme.gradient.color2 || '#EFF6FF'})`;
    } else if (effectiveTheme.backgroundType === 'image' && effectiveTheme.backgroundImage) {
      baseStyle.backgroundImage = `url("${effectiveTheme.backgroundImage}")`;
      baseStyle.backgroundSize = 'cover';
      baseStyle.backgroundPosition = 'center';
      baseStyle.backgroundAttachment = 'fixed';
      baseStyle.backgroundRepeat = 'no-repeat';
    } else {
      baseStyle.backgroundColor = effectiveTheme.backgroundColor;
    }

    return baseStyle;
  }, [effectiveTheme]);

  const handleOpenStudentProfile = (studentId: string) => {
    const student = studentService.getById(studentId);
    if (student) {
      setViewingStudent(student);
    }
  };

  // 1. PUBLIC SHARE VIEW ROUTE (Zero login required, zero sensitive access)
  if (activeShareToken) {
    return (
      <Suspense fallback={<ModuleLoadingFallback />}>
        <PublicShareView
          shareToken={activeShareToken}
          onClose={() => {
            setActiveShareToken(null);
            if (typeof window !== 'undefined') {
              window.location.hash = '#overview';
              window.history.pushState({}, '', '/');
            }
          }}
          onLoginClick={() => {
            setActiveShareToken(null);
            if (typeof window !== 'undefined') {
              window.location.hash = '#overview';
              window.history.pushState({}, '', '/');
            }
          }}
        />
      </Suspense>
    );
  }

  // 2. CHECK TARGET ROUTE (/quan-tri vs /app)
  const isTargetingAdminRoute = useMemo(() => {
    if (typeof window === 'undefined') return currentModule === 'admin';
    const path = (window.location.pathname || '').toLowerCase().replace(/\/$/, '');
    const hash = (window.location.hash || '').toLowerCase().replace('#', '').replace(/^\//, '').split('?')[0].split('/')[0];
    return (
      path === '/quan-tri' ||
      path === '/quan-tri-x7k9' ||
      path === '/admin-login' ||
      hash === 'quan-tri' ||
      hash === 'quan-tri-x7k9' ||
      hash === 'quantri' ||
      hash === 'admin-login' ||
      currentModule === 'admin' ||
      currentModule === 'access_denied_admin'
    );
  }, [currentModule]);

  // 2.1 AUTH GUARD: If not logged in
  if (!isLoggedIn) {
    return (
      <>
        <LoginScreen
          initialMode={isTargetingAdminRoute ? 'admin' : 'user'}
          onLoginSuccess={handleLoginSuccess}
        />
        <DevRouteSwitcher />
      </>
    );
  }

  // 2.2 ADMIN ROUTE GUARD: When accessing /quan-tri, SERVER MUST VERIFY session + role
  if (isTargetingAdminRoute) {
    if (serverVerification.isLoading) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center space-y-4 font-['Be_Vietnam_Pro',sans-serif]">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs sm:text-sm font-medium text-slate-300">Đang xác thực bảo mật Quản trị viên từ máy chủ...</p>
        </div>
      );
    }

    const isServerAdmin =
      serverVerification.isVerified &&
      serverVerification.serverRole === 'SUPER_ADMIN' &&
      currentUser.role === 'SUPER_ADMIN';

    if (!isServerAdmin) {
      return (
        <>
          <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-between relative selection:bg-rose-500 selection:text-white font-['Be_Vietnam_Pro',sans-serif]">
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="w-full max-w-lg bg-slate-900 border-2 border-rose-500/80 rounded-3xl p-7 sm:p-9 shadow-2xl space-y-6 text-center animate-shake">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 px-3 py-1 text-[11px] font-bold uppercase tracking-wider">
                    <Lock className="w-3 h-3" />
                    TỪ CHỐI TRUY CẬP (ACCESS DENIED)
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Không Đủ Quyền Quản Trị
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Cổng Quản trị viên (<code className="text-amber-400 font-mono">/quan-tri</code>) chỉ dành riêng cho Ban Quản trị Nền tảng (Super Admin).
                  </p>
                  <p className="text-xs text-slate-400">
                    Tài khoản của bạn ({currentUser.name} - Vai trò: <span className="font-bold text-rose-400">{currentUser.role}</span>) không có quyền Quản trị viên hệ thống.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        window.history.pushState({}, '', '/app');
                      } catch {}
                      window.location.hash = 'app';
                      setCurrentModuleState('overview');
                    }}
                    className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Chuyển sang Cổng Người Dùng (/app)</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            <footer className="py-4 text-center text-xs text-slate-500 border-t border-slate-800">
              © {new Date().getFullYear()} Không Gian Chủ Nhiệm Số. Hệ Thống Kiểm Soát Truy Cập Bảo Mật.
            </footer>
          </div>
          <DevRouteSwitcher />
        </>
      );
    }
  }

  // 2.3 USER ROUTE GUARD: When accessing /app
  const isUserRoute = typeof window !== 'undefined' && (
    window.location.pathname.toLowerCase().startsWith('/app') ||
    (window.location.hash || '').toLowerCase().includes('app')
  );
  const validUserRoles = ['TEACHER', 'STUDENT', 'PARENT', 'CLASS_OFFICER', 'SUPER_ADMIN'];
  if (isUserRoute && !validUserRoles.includes(currentUser.role)) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <AccessRestricted
          userRole={currentUser.role}
          requiredRole="TEACHER"
          moduleName="Cổng Người Dùng (/app)"
          onBackToHome={() => handleLogout()}
        />
      </div>
    );
  }

  return (
    <div
      style={containerStyle}
      className="relative min-h-screen flex flex-col selection:bg-blue-600 selection:text-white transition-colors duration-300"
    >
      {/* Background Overlay for Image Backgrounds */}
      {effectiveTheme.backgroundType === 'image' && effectiveTheme.backgroundImage && (
        <div
          className="fixed inset-0 pointer-events-none z-0"
          style={{
            backgroundColor: effectiveTheme.backgroundColor || '#FFFFFF',
            opacity: (effectiveTheme.overlayOpacity ?? 20) / 100
          }}
        />
      )}

      {/* Top Navigation Bar */}
      <div className="relative z-10">
        <Header
          onOpenAIDrawer={() => setIsAIDrawerOpen(true)}
          onOpenReportModal={() => setIsReportModalOpen(true)}
          onOpenRoleMatrix={() => setIsRoleMatrixOpen(true)}
          onOpenClassSettings={() => setCurrentModule('settings')}
          onSelectModule={(mod) => setCurrentModule(mod)}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
        />
      </div>

      {/* Main Container Layout: Responsive 3-Column CSS Grid for Class users, Full-Width Isolated Console for Super Admin */}
      <div className="relative z-10 mx-auto w-full max-w-[1536px] px-3 sm:px-4 lg:px-6 py-4">
        {currentUser.role === 'SUPER_ADMIN' ? (
          <main className="min-w-0 w-full pb-16">
            <ErrorBoundary>
              <Suspense fallback={<ModuleLoadingFallback />}>
                <PlatformAdminConsole />
              </Suspense>
            </ErrorBoundary>
          </main>
        ) : (
          <div className="space-y-4 min-w-0 w-full">
            {/* 1. HORIZONTAL LARGE CLASS COVER & HEADER - Spans full width above sidebars */}
            <div className="w-full min-w-0">
              <ErrorBoundary>
                <ClassCover
                  onNavigateModule={handleNavigate}
                  onOpenReport={() => setIsReportModalOpen(true)}
                  onOpenAI={() => setIsAIDrawerOpen(true)}
                />
              </ErrorBoundary>
            </div>

            {/* 2. LOWER SECTION: Left Sidebar + Central Workspace Modules + Right Action Center */}
            <div
              className={`grid grid-cols-1 md:grid-cols-[200px_minmax(0,1fr)] ${
                isRightSidebarCollapsed
                  ? 'lg:grid-cols-[200px_minmax(0,1fr)_56px] xl:grid-cols-[220px_minmax(0,1fr)_56px]'
                  : 'lg:grid-cols-[200px_minmax(0,1fr)_260px] xl:grid-cols-[220px_minmax(0,1fr)_280px]'
              } gap-4 items-start transition-all duration-200 min-w-0 w-full`}
            >
              {/* Left Sidebar Navigation */}
              <LeftSidebar
                currentModule={currentModule}
                onNavigate={handleNavigate}
                onOpenAIDrawer={() => setIsAIDrawerOpen(true)}
              />

              {/* Central Workspace Area */}
              <main className="min-w-0 w-full space-y-4 pb-20 lg:pb-6">
                <ErrorBoundary>
                  <Suspense fallback={<ModuleLoadingFallback />}>
            {/* Module: AI Homeroom Assistant / Student Advisor */}
            {currentModule === 'ai' && (
              currentUser.role === 'STUDENT' || currentUser.role === 'CLASS_OFFICER' ? (
                <StudentAIAdvisorModule />
              ) : currentUser.role === 'PARENT' ? (
                <AccessRestricted
                  userRole={currentUser.role}
                  requiredRole="STUDENT"
                  moduleName="AI Cố vấn học tập (Dành riêng cho Học viên & GVCN)"
                  onBackToHome={() => handleNavigate('overview')}
                />
              ) : (
                <AIHomeroomModule onOpenSettings={() => handleNavigate('settings')} />
              )
            )}

            {/* Access Denied Guard when non-admin logged-in user visits /quan-tri */}
            {currentModule === 'access_denied_admin' && (
              <div className="space-y-4 animate-fade-in max-w-4xl mx-auto py-8">
                <AccessRestricted
                  userRole={currentUser.role}
                  requiredRole="SUPER_ADMIN"
                  moduleName="Cổng Đăng Nhập & Bảng Quản Trị Hệ Thống (/quan-tri)"
                  onBackToHome={() => handleNavigate('overview')}
                />
              </div>
            )}

            {/* Module: Overview */}
            {currentModule === 'overview' && (
              <div className="space-y-4 animate-fade-in">
                {/* 1. Year Timeline Milestones Tracker */}
                <ClassYearTimeline />

                {/* 2. 4 Quick Stat Summary Cards */}
                <QuickStatsCards onNavigate={handleNavigate} />

                {/* 2.1 Homeroom Care Alerts, Weekly Summary & Plan (For GVCN & Admin) */}
                {(currentUser.role === 'TEACHER' || (currentUser.role as any) === 'SUPER_ADMIN') && (
                  <HomeroomCareAndWeeklySummary
                    currentUserRole={currentUser.role}
                    onNavigate={(mod, params) => handleNavigate(mod, params)}
                    onOpenAIWithStudent={(studentId) => {
                      handleNavigate('ai', { entityId: studentId });
                    }}
                  />
                )}

                {/* 3. Pinned Notices & Rules */}
                <PinnedNoticesCard onOpenFilePreview={(f) => setPreviewFile(f)} />
              </div>
            )}

            {/* Module: Lịch công tác chủ nhiệm (Exclusive for GVCN / Super Admin) */}
            {currentModule === 'homeroom_calendar' && (
              (currentUser.role as any) !== 'TEACHER' && (currentUser.role as any) !== 'SUPER_ADMIN' ? (
                <AccessRestricted
                  userRole={currentUser.role}
                  requiredRole="TEACHER"
                  moduleName="Lịch công tác chủ nhiệm"
                  onBackToHome={() => handleNavigate('overview')}
                />
              ) : (
                <HomeroomCalendarModule
                  currentUserRole={currentUser.role}
                  currentClassId={classSettings.id}
                  onNavigateToModule={(mod, params) => handleNavigate(mod, params)}
                />
              )
            )}

            {/* Module: Surveys (Khảo sát) */}
            {currentModule === 'surveys' && (
              currentUser.role === 'PARENT' ? (
                <div className="space-y-4 animate-fade-in max-w-5xl mx-auto">
                  <ParentSurveyView />
                </div>
              ) : (currentUser.role === 'TEACHER' || (currentUser.role as any) === 'SUPER_ADMIN') ? (
                <TeacherSurveyManagementView
                  initialTemplateId={(navOptions as any)?.templateId || (navOptions as any)?.surveyTemplateId || navOptions?.entityId}
                  initialSubTab={navOptions?.subTab as any}
                  highlightSurveyId={(navOptions as any)?.surveyId}
                />
              ) : (
                <div className="space-y-4 animate-fade-in max-w-4xl mx-auto">
                  <StudentSurveyCard
                    highlightSurveyId={navOptions?.entityId || (navOptions as any)?.surveyId || (navOptions as any)?.templateId}
                    onNavigateSurvey={() => {}}
                  />
                </div>
              )
            )}

            {/* Module: Feed */}
            {currentModule === 'feed' && (
              <FeedModule
                onOpenFilePreview={(f) => setPreviewFile(f)}
                onNavigate={handleNavigate}
              />
            )}

            {/* Module: Students (Protected: Teachers only) */}
            {currentModule === 'students' && (
              currentUser.role !== 'TEACHER' ? (
                <AccessRestricted
                  userRole={currentUser.role}
                  requiredRole="TEACHER"
                  moduleName="Quản lý Học viên & Hồ sơ lớp"
                  onBackToHome={() => handleNavigate('overview')}
                />
              ) : (
                <StudentsModule
                  initialSubTab={navOptions?.subTab}
                  initialGroup={
                    (navOptions as any)?.group ||
                    (navOptions?.subTab === 'violation_handling'
                      ? 'violation_handling'
                      : navOptions?.subTab === 'special_attention'
                      ? 'special_attention'
                      : undefined)
                  }
                />
              )
            )}

            {/* Module: Student Personal Results (For Student / Officer / Parent) */}
            {currentModule === 'student_results' && <StudentPersonalResults />}

            {/* Module: Graduation Exam (Thi Tốt nghiệp THPT) */}
            {currentModule === 'graduation' && <GraduationModule />}

            {/* Module: Laurel Garden */}
            {currentModule === 'laurel' && (
              <LaurelGardenModule onSelectStudentProfile={handleOpenStudentProfile} />
            )}

            {/* Module: Training */}
            {currentModule === 'training' && <TrainingModule />}

            {/* Module: Academic (Học tập & Cấu hình Môn học - Protected: GVCN only) */}
            {(currentModule === 'academic' || currentModule === 'grades' || currentModule === 'learning') && (
              currentUser.role !== 'TEACHER' ? (
                <AccessRestricted
                  userRole={currentUser.role}
                  requiredRole="TEACHER"
                  moduleName="Quản lý Học tập & Cấu hình Môn học"
                  onBackToHome={() => handleNavigate('overview')}
                />
              ) : (
                <AcademicModule initialTab="grades" />
              )
            )}

            {/* Module: Timetable & Assignments (Thời khóa biểu & Báo bài - 3 Subtabs: Thời khóa biểu, Báo bài, Lịch kiểm tra) */}
            {(currentModule === 'schedule' || currentModule === 'timetable' || currentModule === 'assignments' || currentModule === 'exams') && (
              <ScheduleAndAssignmentsModule
                initialSubTab={
                  navOptions?.subTab === 'exams' || currentModule === 'exams'
                    ? 'exams'
                    : navOptions?.subTab === 'assignments' || currentModule === 'assignments'
                    ? 'assignments'
                    : (navOptions?.subTab as any) || 'timetable'
                }
                highlightExamId={navOptions?.testId || navOptions?.entityId}
              />
            )}

            {/* Module: Activities / Phong trào */}
            {currentModule === 'activities' && <ActivitiesModule />}

            {/* Module: Goals */}
            {currentModule === 'goals' && <GoalsModule />}

            {/* Module: Photo Album */}
            {currentModule === 'album' && (
              <AlbumModule onOpenFilePreview={(f) => setPreviewFile(f)} />
            )}

            {/* Module: Parents Bridge (Protected: Students & Class Officers cannot access parent portal) */}
            {currentModule === 'parents' && (
              !authService.canAccessParentBridge() ? (
                <AccessRestricted
                  userRole={currentUser.role}
                  requiredRole="PARENT"
                  moduleName="Nhịp cầu Phụ huynh"
                  onBackToHome={() => handleNavigate('overview')}
                />
              ) : (
                <ParentBridgeModule
                  initialTab={navOptions?.subTab === 'private' ? 'private' : undefined}
                  initialStudentId={navOptions?.entityId}
                  onOpenFilePreview={(f) => setPreviewFile(f)}
                />
              )
            )}

            {/* Module: Career Guidance */}
            {currentModule === 'career' && (
              <ErrorBoundary fallbackTitle="Phân hệ Hướng nghiệp & Trải nghiệm">
                <CareerModule />
              </ErrorBoundary>
            )}

            {/* Module: Settings (Protected: Teacher only) */}
            {currentModule === 'settings' && (
              currentUser.role !== 'TEACHER' ? (
                <AccessRestricted
                  userRole={currentUser.role}
                  requiredRole="TEACHER"
                  moduleName="Cài đặt & Cấu hình không gian lớp"
                  onBackToHome={() => handleNavigate('overview')}
                />
              ) : (
                <SettingsModule />
              )
            )}

            {/* Module: Approvals (Teacher Approval Center & Student Submissions) */}
            {currentModule === 'approvals' && (
              <ApprovalCenterModule
                initialTab={(navOptions?.subTab as any) || 'pending'}
                highlightProposalId={navOptions?.proposalId || navOptions?.entityId}
                onOpenStudentProfile={handleOpenStudentProfile}
              />
            )}

            {/* Module: Reports & Statistics */}
            {currentModule === 'reports' && (
              (currentUser.role as any) !== 'TEACHER' && (currentUser.role as any) !== 'SUPER_ADMIN' ? (
                <AccessRestricted
                  userRole={currentUser.role}
                  requiredRole="TEACHER"
                  moduleName="Báo cáo & Thống kê lớp"
                  onBackToHome={() => handleNavigate('overview')}
                />
              ) : (
                <ReportsStatisticsModule />
              )
            )}

            {/* Module: Teacher User Guide (Exclusive for TEACHER role) */}
            {currentModule === 'guide' && (
              currentUser.role !== 'TEACHER' ? (
                <AccessRestricted
                  userRole={currentUser.role}
                  requiredRole="TEACHER"
                  moduleName="Hướng dẫn sử dụng dành cho Giáo viên chủ nhiệm"
                  onBackToHome={() => handleNavigate('overview')}
                />
              ) : (
                <TeacherGuideModule onNavigateModule={handleNavigate} />
              )
            )}

            {/* Module: Super Admin Platform Console */}
            {currentModule === 'admin' && (
              (currentUser.role as any) !== 'SUPER_ADMIN' ? (
                <AccessRestricted
                  userRole={currentUser.role}
                  requiredRole="SUPER_ADMIN"
                  moduleName="Bảng điều khiển Nền tảng Super Admin"
                  onBackToHome={() => handleNavigate('overview')}
                />
              ) : (
                <PlatformAdminConsole />
              )
            )}
                  </Suspense>
            </ErrorBoundary>
          </main>

          {/* Right Action Center & Widgets (280px on Desktop, 56px when collapsed) */}
          <RightActionCenter
            isCollapsed={isRightSidebarCollapsed}
            onToggleCollapse={() => setIsRightSidebarCollapsed(prev => !prev)}
            onNavigate={handleNavigate}
            onOpenAIDrawer={() => setIsAIDrawerOpen(true)}
            onOpenReportModal={() => setIsReportModalOpen(true)}
            onOpenStudentProfile={handleOpenStudentProfile}
          />
        </div>
        </div>
        )}
      </div>

      {/* Mobile Bottom Navigation Bar (Hidden for Super Admin) */}
      {currentUser.role !== 'SUPER_ADMIN' && (
        <BottomNav
          currentModule={currentModule}
          onNavigate={handleNavigate}
          onOpenAIDrawer={() => setIsAIDrawerOpen(true)}
        />
      )}

      {/* File Preview Modal */}
      {previewFile && (
        <Suspense fallback={null}>
          <FilePreviewModal
            file={previewFile}
            isOpen={!!previewFile}
            onClose={() => setPreviewFile(null)}
          />
        </Suspense>
      )}

      {/* Quick Report Generator Modal */}
      {isReportModalOpen && (
        <Suspense fallback={null}>
          <QuickReportModal
            isOpen={isReportModalOpen}
            onClose={() => setIsReportModalOpen(false)}
          />
        </Suspense>
      )}

      {/* AI Assistant Drawer */}
      {isAIDrawerOpen && (
        <Suspense fallback={null}>
          <AIAssistantDrawer
            isOpen={isAIDrawerOpen}
            onClose={() => setIsAIDrawerOpen(false)}
            onOpenFullscreenAI={() => setCurrentModule('ai')}
          />
        </Suspense>
      )}

      {/* Role Matrix Modal */}
      {isRoleMatrixOpen && (
        <Suspense fallback={null}>
          <DemoRoleMatrix
            isOpen={isRoleMatrixOpen}
            onClose={() => setIsRoleMatrixOpen(false)}
          />
        </Suspense>
      )}

      {/* Quick Student 360 Profile Modal */}
      {viewingStudent && (
        <Suspense fallback={null}>
          <StudentProfileModal
            student={viewingStudent}
            onClose={() => setViewingStudent(null)}
            onOpenEdit={(st) => {
              setViewingStudent(null);
              setEditingStudent(st);
            }}
          />
        </Suspense>
      )}

      {/* Student Edit Modal */}
      {editingStudent && (
        <Suspense fallback={null}>
          <StudentEditModal
            student={editingStudent}
            isOpen={!!editingStudent}
            onClose={() => setEditingStudent(null)}
            onSaved={() => {
              // Re-fetch if needed
            }}
          />
        </Suspense>
      )}

      {/* Classroom Setup Wizard Modal */}
      {isWizardOpen && (
        <Suspense fallback={null}>
          <SetupWizardModal
            onClose={() => setIsWizardOpen(false)}
            onComplete={() => {
              setIsWizardOpen(false);
              setCurrentModule('overview');
            }}
          />
        </Suspense>
      )}

      {/* Mandatory Password Change on First Login / Reset Modal */}
      {currentUser && Boolean(currentUser.mustChangePassword) && (
        <ForcePasswordChangeModal
          currentUser={currentUser}
          isOpen={true}
          onSuccess={() => {
            setCurrentUser({ ...authService.getCurrentUser() });
          }}
        />
      )}

      {/* Dev Route Switcher for AI Studio Preview Testing */}
      <DevRouteSwitcher />
    </div>
  );
}
