/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Users,
  Server,
  ToggleLeft,
  ToggleRight,
  Database,
  Download,
  Upload,
  Plus,
  Lock,
  Unlock,
  Key,
  Layers,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Sliders,
  Settings,
  Sparkles,
  Globe,
  FileSpreadsheet,
  MessageSquare,
  Compass,
  GraduationCap,
  HeartHandshake,
  Award,
  PhoneCall,
  Mail,
  Building,
  UserCheck,
  Clock,
  MapPin,
  FileText,
  ShieldCheck,
  Info,
  HelpCircle,
  Star,
  Lightbulb,
  Eye,
  EyeOff,
  KeyRound,
  Trash2,
  Copy,
  Palette,
  BookOpen
} from 'lucide-react';
import { tenantService } from '../../services/TenantService';
import { migrationService } from '../../services/MigrationService';
import { auditService } from '../../services/AuditService';
import { AdminSupportCenter } from './AdminSupportCenter';
import { AdminFeedbackCenter } from './AdminFeedbackCenter';
import { AdminSystemDashboard } from './AdminSystemDashboard';
import { AdminSupportFeedbackHub } from './AdminSupportFeedbackHub';
import { AdminSystemSurveyManager } from './AdminSystemSurveyManager';
import { AdminThemeSettingsTab } from './AdminThemeSettingsTab';
import { AdminGuideManagerTab } from './AdminGuideManagerTab';
import { DeleteWorkspaceModal } from './DeleteWorkspaceModal';
import { adminThemeService, AdminThemeConfig } from '../../services/AdminThemeService';
import { authService } from '../../services/AuthService';
import { exportService } from '../../services/ExportService';
import { realtimeSyncService } from '../../services/RealtimeSyncService';
import { Tenant, TeacherAccountItem, TenantPlan, FeatureFlagConfig, AdminContactInfo } from '../../types';

export const PlatformAdminConsole: React.FC = () => {
  const [adminTheme, setAdminTheme] = useState<AdminThemeConfig>(adminThemeService.getAdminTheme());
  const [activeTab, setActiveTab] = useState<'dashboard' | 'overview' | 'support_feedback' | 'surveys' | 'theme_settings' | 'contact' | 'security' | 'teachers' | 'workspaces' | 'features' | 'migrations' | 'audit' | 'guides'>('dashboard');
  const [tenants, setTenants] = useState<Tenant[]>(tenantService.getTenants());
  const [teachers, setTeachers] = useState<TeacherAccountItem[]>(tenantService.getTeacherAccounts());
  const [systemConfig, setSystemConfig] = useState(migrationService.getConfig());
  const [migrationHistory, setMigrationHistory] = useState(migrationService.getHistory());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'LOCKED'>('ALL');
  const [deleteWorkspaceTargetId, setDeleteWorkspaceTargetId] = useState<string | null>(null);

  // Admin Security Tab State
  const [adminProfile, setAdminProfile] = useState<{
    id: string;
    loginId: string;
    email: string;
    recoveryEmail: string | null;
    status: 'ACTIVE' | 'LOCKED' | 'SUSPENDED';
    hasPassword: boolean;
    hasRecoveryCode: boolean;
    hasCustomRecoveryCode?: boolean;
    recoveryCodeCreatedAt: string | null;
    sessionVersion: number;
    passwordUpdatedAt: string | null;
    lastLoginAt: string | null;
  } | null>(null);

  // Password Change State
  const [adminOldPassword, setAdminOldPassword] = useState('');
  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');
  const [adminRevokeOtherSessions, setAdminRevokeOtherSessions] = useState(true);
  const [showAdminOldPassword, setShowAdminOldPassword] = useState(false);
  const [showAdminNewPassword, setShowAdminNewPassword] = useState(false);
  const [adminPassError, setAdminPassError] = useState<string | null>(null);
  const [adminPassSuccess, setAdminPassSuccess] = useState<string | null>(null);
  const [isChangingAdminPass, setIsChangingAdminPass] = useState(false);

  // Firebase Password Reset State
  const [firebaseResetLoading, setFirebaseResetLoading] = useState(false);
  const [firebaseResetSuccess, setFirebaseResetSuccess] = useState<string | null>(null);
  const [firebaseResetError, setFirebaseResetError] = useState<string | null>(null);

  // Recovery Code State
  const [rcCurrentPassword, setRcCurrentPassword] = useState('');
  const [customNewRecoveryCode, setCustomNewRecoveryCode] = useState('');
  const [customConfirmRecoveryCode, setCustomConfirmRecoveryCode] = useState('');
  const [showCustomRcCode, setShowCustomRcCode] = useState(false);
  const [generatedRecoveryCode, setGeneratedRecoveryCode] = useState<string | null>(null);
  const [isGeneratingRc, setIsGeneratingRc] = useState(false);
  const [rcGenError, setRcGenError] = useState<string | null>(null);
  const [rcGenSuccess, setRcGenSuccess] = useState<string | null>(null);

  // Revoke All Sessions State
  const [isRevokingSessions, setIsRevokingSessions] = useState(false);
  const [revokeSessionsSuccess, setRevokeSessionsSuccess] = useState<string | null>(null);
  const [revokeSessionsError, setRevokeSessionsError] = useState<string | null>(null);

  const currentUser = authService.getCurrentUser();
  const isGoogleAdmin = currentUser?.loginMethod === 'GOOGLE' || 
                        currentUser?.email?.toLowerCase() === 'binhdtsply@gmail.com' ||
                        adminProfile?.email?.toLowerCase() === 'binhdtsply@gmail.com';

  // Admin Contact Form State
  const [contactForm, setContactForm] = useState<AdminContactInfo>(() => {
    return migrationService.getAdminContact() || {
      organizationName: 'Ban Quản trị Hệ thống Không Gian Chủ Nhiệm Số',
      contactPerson: 'Đoàn Thị Bình',
      email: 'binhdtsply@gmail.com',
      phone: '0973640124',
      address: 'Hà Nội, Việt Nam',
      workingHours: 'Thứ 2 - Thứ 6 (08:00 - 17:30)',
      notes: 'Liên hệ khi cần cấp mới tài khoản GVCN, khôi phục mã truy cập hoặc phản hồi kỹ thuật.',
      updatedAt: new Date().toISOString(),
      updatedBy: 'SUPER_ADMIN'
    };
  });
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [contactSaveSuccess, setContactSaveSuccess] = useState(false);

  // Live Backend Stats
  const [dbStats, setDbStats] = useState<{
    totalTenants?: number;
    activeTenants?: number;
    totalTeachers?: number;
    totalStudents?: number;
    totalAuditLogs?: number;
    totalCredentials?: number;
    activeCredentials?: number;
  } | null>(null);

  // New Teacher Modal
  const [showNewTeacherModal, setShowNewTeacherModal] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newSchool, setNewSchool] = useState('THPT Chuyên Lê Hồng Phong');
  const [newPlan, setNewPlan] = useState<TenantPlan>('PRO');
  const [newClassName, setNewClassName] = useState('10A1');
  const [newInitialCode, setNewInitialCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newConfirmPassword, setNewConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showNewConfirmPassword, setShowNewConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isCreatingTeacher, setIsCreatingTeacher] = useState(false);
  const [createdSuccessAccount, setCreatedSuccessAccount] = useState<TeacherAccountItem | null>(null);

  // Reset Password Modal
  const [resetTeacherTarget, setResetTeacherTarget] = useState<TeacherAccountItem | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [isAutoResetPassword, setIsAutoResetPassword] = useState(true);
  const [isSubmittingReset, setIsSubmittingReset] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccessModal, setResetSuccessModal] = useState<{
    teacher: TeacherAccountItem;
    temporaryPassword?: string;
    activationToken?: string;
  } | null>(null);

  // Delete Teacher Modal
  const [deleteTeacherTarget, setDeleteTeacherTarget] = useState<TeacherAccountItem | null>(null);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Clipboard copy state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const handleCopyText = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Break-glass modal
  const [showBreakGlassModal, setShowBreakGlassModal] = useState(false);
  const [breakGlassReason, setBreakGlassReason] = useState('');

  // Notification / Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  useEffect(() => {
    const unsubTenant = tenantService.subscribe(() => {
      setTenants(tenantService.getTenants());
      setTeachers(tenantService.getTeacherAccounts());
    });
    const unsubMigration = migrationService.subscribe(() => {
      const cfg = migrationService.getConfig();
      setSystemConfig(cfg);
      setMigrationHistory(migrationService.getHistory());
      if (cfg.adminContact) {
        setContactForm(cfg.adminContact);
      }
    });
    const unsubAdminTheme = adminThemeService.subscribe(() => {
      setAdminTheme(adminThemeService.getAdminTheme());
    });

    // Fetch contact info from remote API
    migrationService.fetchRemoteAdminContact().then(contact => {
      if (contact) {
        setContactForm(contact);
      }
    });

    // Fetch live DB stats and teachers from server
    let token = '';
    try {
      const sessionStr = localStorage.getItem('kgcns_session_v2');
      if (sessionStr) {
        const parsed = JSON.parse(sessionStr);
        if (parsed?.token) token = parsed.token;
      }
    } catch {}
    if (!token) {
      token =
        localStorage.getItem('kgcns_server_session_token') ||
        localStorage.getItem('kgcns_auth_token') ||
        localStorage.getItem('kgcns_session_token') ||
        sessionStorage.getItem('kgcns_session_token') ||
        (window as any).__kgcns_token ||
        '';
    }

    if (token) {
      fetch('/api/v1/tenants/admin/stats', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.stats) {
            setDbStats(data.stats);
          }
        })
        .catch(err => {
          console.warn('Failed to fetch remote DB stats:', err);
        });

      tenantService.fetchTeachersFromServer().then(remoteTeachers => {
        if (remoteTeachers && remoteTeachers.length > 0) {
          setTeachers(remoteTeachers);
        }
      }).catch(() => {});
    }

    const unsubRealtime = realtimeSyncService.on('CLASS_SETTINGS_UPDATED', (event?: any) => {
      if (event?.tenantId && event?.payload) {
        tenantService.syncClassroomConfiguration(event.tenantId, {
          schoolName: event.payload.schoolName,
          className: event.payload.className,
          totalStudentsCount: event.payload.totalStudents,
          academicYear: event.payload.academicYear
        });
        setTeachers(tenantService.getTeacherAccounts());
      }
      tenantService.fetchTeachersFromServer().then(remoteTeachers => {
        if (remoteTeachers && remoteTeachers.length > 0) {
          setTeachers(remoteTeachers);
        }
      }).catch(() => {});
    });

    return () => {
      unsubTenant();
      unsubMigration();
      unsubAdminTheme();
      unsubRealtime();
    };
  }, []);

  // Proactively sync latest teacher accounts when Admin opens or navigates to Teachers management tab
  useEffect(() => {
    if (activeTab === 'teachers' || activeTab === 'dashboard') {
      tenantService.fetchTeachersFromServer().then(remoteTeachers => {
        if (remoteTeachers && remoteTeachers.length > 0) {
          setTeachers(remoteTeachers);
        }
      }).catch(() => {});
    }
  }, [activeTab]);

  // Load Admin Profile when Security Tab is opened
  useEffect(() => {
    if (activeTab === 'security') {
      authService.fetchAdminProfileAsync().then(res => {
        if (res.success && res.profile) {
          setAdminProfile(res.profile);
        }
      });
    }
  }, [activeTab]);

  const handleChangeAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminPassError(null);
    setAdminPassSuccess(null);

    const cleanOld = adminOldPassword.trim();
    const cleanNew = adminNewPassword.trim();
    const cleanConfirm = adminConfirmPassword.trim();

    if (!isGoogleAdmin && !cleanOld) {
      setAdminPassError('Vui lòng nhập mật khẩu hiện tại.');
      return;
    }
    if (!cleanNew || cleanNew.length < 6) {
      setAdminPassError('Mật khẩu mới phải có tối thiểu 6 ký tự.');
      return;
    }
    if (cleanNew !== cleanConfirm) {
      setAdminPassError('Xác nhận mật khẩu mới không khớp.');
      return;
    }
    if (cleanOld && cleanOld === cleanNew) {
      setAdminPassError('Mật khẩu mới không được trùng với mật khẩu hiện tại.');
      return;
    }

    setIsChangingAdminPass(true);
    try {
      const res = await authService.changeSuperAdminPasswordAsync(
        cleanOld,
        cleanNew,
        adminRevokeOtherSessions,
        isGoogleAdmin
      );
      setIsChangingAdminPass(false);
      if (res.success) {
        setAdminPassSuccess('Đổi mật khẩu Quản trị viên thành công!');
        setAdminOldPassword('');
        setAdminNewPassword('');
        setAdminConfirmPassword('');
        showToast('Đổi mật khẩu Quản trị viên thành công!');
        const profRes = await authService.fetchAdminProfileAsync();
        if (profRes.success && profRes.profile) setAdminProfile(profRes.profile);
      } else {
        setAdminPassError(res.message || 'Mật khẩu hiện tại không chính xác.');
      }
    } catch (err: any) {
      setIsChangingAdminPass(false);
      setAdminPassError(err?.message || 'Lỗi kết nối khi đổi mật khẩu.');
    }
  };

  const handleSaveCustomRecoveryCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setRcGenError(null);
    setRcGenSuccess(null);
    setGeneratedRecoveryCode(null);

    const cleanPass = rcCurrentPassword.trim();
    const cleanNew = customNewRecoveryCode.trim();
    const cleanConfirm = customConfirmRecoveryCode.trim();

    if (!isGoogleAdmin && !cleanPass) {
      setRcGenError('Vui lòng nhập mật khẩu Quản trị viên hiện tại để xác minh danh tính.');
      return;
    }
    if (!cleanNew || cleanNew.length < 6) {
      setRcGenError('Recovery Code mới phải có tối thiểu 6 ký tự.');
      return;
    }
    if (cleanNew !== cleanConfirm) {
      setRcGenError('Mã Recovery Code xác nhận không khớp. Vui lòng nhập lại chính xác.');
      return;
    }

    setIsGeneratingRc(true);
    try {
      const res = await authService.setAdminRecoveryCodeAsync(cleanPass, cleanNew, cleanConfirm, isGoogleAdmin);
      setIsGeneratingRc(false);
      if (res.success) {
        setGeneratedRecoveryCode(cleanNew.toUpperCase());
        setRcGenSuccess('Thiết lập Recovery Code mới thành công! Mã mới đã thay thế hoàn toàn mã cũ và có hiệu lực ngay lập tức. Hãy ghi nhớ hoặc cất giữ mã mới an toàn.');
        setRcCurrentPassword('');
        setCustomNewRecoveryCode('');
        setCustomConfirmRecoveryCode('');
        showToast('Thiết lập Recovery Code mới thành công!');
        const profRes = await authService.fetchAdminProfileAsync();
        if (profRes.success && profRes.profile) setAdminProfile(profRes.profile);
      } else {
        setRcGenError(res.message || 'Mật khẩu hiện tại không chính xác hoặc không thể đổi mã.');
      }
    } catch (err: any) {
      setIsGeneratingRc(false);
      setRcGenError(err?.message || 'Lỗi kết nối khi thiết lập Recovery Code mới.');
    }
  };

  const handleGenerateRandomRecoveryCodeSuggestion = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const segment = (len: number) => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const randomCode = `KGCN-${segment(4)}-${segment(4)}-${segment(4)}`;
    setCustomNewRecoveryCode(randomCode);
    setCustomConfirmRecoveryCode(randomCode);
    setShowCustomRcCode(true);
  };

  const handleGenerateRecoveryCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setRcGenError(null);
    setRcGenSuccess(null);

    const cleanPass = rcCurrentPassword.trim();
    if (!isGoogleAdmin && !cleanPass) {
      setRcGenError('Vui lòng nhập mật khẩu hiện tại để xác thực thao tác tạo mã khôi phục.');
      return;
    }

    setIsGeneratingRc(true);
    try {
      const res = await authService.generateAdminRecoveryCodeAsync(cleanPass, isGoogleAdmin);
      setIsGeneratingRc(false);
      if (res.success && res.recoveryCode) {
        setGeneratedRecoveryCode(res.recoveryCode);
        setRcGenSuccess('Đã tạo Mã khôi phục bí mật thành công! Hãy sao chép và cất giữ ở nơi an toàn.');
        setRcCurrentPassword('');
        showToast('Tạo Mã khôi phục bí mật thành công!');
        const profRes = await authService.fetchAdminProfileAsync();
        if (profRes.success && profRes.profile) setAdminProfile(profRes.profile);
      } else {
        setRcGenError(res.message || 'Mật khẩu hiện tại không chính xác.');
      }
    } catch (err: any) {
      setIsGeneratingRc(false);
      setRcGenError(err?.message || 'Lỗi kết nối khi tạo mã khôi phục.');
    }
  };

  const handleSendFirebaseResetFromConsole = async () => {
    setFirebaseResetError(null);
    setFirebaseResetSuccess(null);

    const targetEmail = adminProfile?.email || 'binhdtsply@gmail.com';
    setFirebaseResetLoading(true);

    try {
      const res = await authService.sendAdminPasswordResetEmail(targetEmail);
      setFirebaseResetLoading(false);
      if (res.success) {
        setFirebaseResetSuccess(res.message);
        showToast('Đã gửi email đặt lại mật khẩu qua Firebase!');
      } else {
        setFirebaseResetError(res.message);
      }
    } catch (err: any) {
      setFirebaseResetLoading(false);
      setFirebaseResetError(err?.message || 'Lỗi khi gửi email đặt lại mật khẩu qua Firebase.');
    }
  };

  const handleRevokeAllSessions = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn đăng xuất tất cả các thiết bị khác? Phiên hiện tại của bạn sẽ tiếp tục hoạt động an toàn.')) {
      return;
    }
    setRevokeSessionsError(null);
    setRevokeSessionsSuccess(null);
    setIsRevokingSessions(true);

    try {
      const res = await authService.revokeAllAdminSessionsAsync();
      setIsRevokingSessions(false);
      if (res.success) {
        setRevokeSessionsSuccess('Đã thu hồi tất cả phiên đăng nhập khác thành công!');
        showToast('Đã đăng xuất khỏi tất cả các thiết bị khác!');
        const profRes = await authService.fetchAdminProfileAsync();
        if (profRes.success && profRes.profile) setAdminProfile(profRes.profile);
      } else {
        setRevokeSessionsError(res.message || 'Không thể thu hồi phiên đăng nhập.');
      }
    } catch (err: any) {
      setIsRevokingSessions(false);
      setRevokeSessionsError(err?.message || 'Lỗi kết nối khi thu hồi phiên.');
    }
  };

  const stats = tenantService.getPlatformStats();

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingContact(true);
    setContactSaveSuccess(false);

    try {
      await migrationService.updateAdminContact(contactForm);
      auditService.log(
        'Cập nhật Thông tin Liên hệ Admin',
        'SUPER_ADMIN',
        contactForm.organizationName,
        `Cập nhật Email: ${contactForm.email}, SĐT: ${contactForm.phone}`
      );
      setContactSaveSuccess(true);
      showToast('Đã lưu và đồng bộ Thông tin Liên hệ Admin toàn hệ thống!');
      setTimeout(() => setContactSaveSuccess(false), 4000);
    } catch (err: any) {
      alert(`Lỗi khi lưu thông tin liên hệ: ${err.message}`);
    } finally {
      setIsSavingContact(false);
    }
  };

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName || !newEmail || !newSchool) {
      setPasswordError('Vui lòng điền đầy đủ họ tên, email và trường học.');
      return;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(newEmail.trim())) {
      setPasswordError('Email không đúng định dạng hợp lệ (VD: tengv@school.edu.vn hoặc gv@outlook.com).');
      return;
    }

    if (!newPassword) {
      setPasswordError('Vui lòng nhập mật khẩu cho tài khoản GVCN.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Mật khẩu phải có độ dài tối thiểu 6 ký tự.');
      return;
    }

    if (newPassword !== newConfirmPassword) {
      setPasswordError('Mật khẩu và xác nhận mật khẩu không khớp.');
      return;
    }

    setPasswordError(null);
    setIsCreatingTeacher(true);

    try {
      const result = await tenantService.createTeacherWorkspaceAsync({
        fullName: newFullName.trim(),
        email: newEmail.trim(),
        phone: newPhone.trim(),
        schoolName: newSchool.trim(),
        plan: newPlan,
        className: newClassName.trim() || '10A1',
        initialCode: newInitialCode.trim() || undefined,
        password: newPassword.trim()
      });

      auditService.log(
        'Cấp tài khoản GVCN',
        'SUPER_ADMIN',
        `${newFullName} (${newEmail})`,
        `Cấp tài khoản GVCN mới cho trường ${newSchool}, lớp ${newClassName || '10A1'}, gói ${newPlan}`
      );

      // Refresh accounts from server
      await tenantService.fetchTeachersFromServer().catch(() => {});
      setTeachers(tenantService.getTeacherAccounts());

      setCreatedSuccessAccount(result.account);
      setNewFullName('');
      setNewEmail('');
      setNewPhone('');
      setNewClassName('10A1');
      setNewInitialCode('');
      setNewPassword('');
      setNewConfirmPassword('');
      setPasswordError(null);
      showToast(`Đã cấp tài khoản và tạo Không gian riêng cho GVCN ${result.account?.fullName || newFullName}!`);
    } catch (err: any) {
      setPasswordError(err.message || 'Lỗi khi tạo tài khoản GVCN.');
    } finally {
      setIsCreatingTeacher(false);
    }
  };

  const handleConfirmResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTeacherTarget) return;

    if (!isAutoResetPassword && (!resetNewPassword || resetNewPassword.length < 6)) {
      setResetError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }

    setResetError(null);
    setIsSubmittingReset(true);

    try {
      const result = await tenantService.resetTeacherPassword(
        resetTeacherTarget.id,
        isAutoResetPassword ? undefined : resetNewPassword.trim()
      );

      auditService.log(
        'Đặt lại mật khẩu GVCN',
        'SUPER_ADMIN',
        `${resetTeacherTarget.fullName} (${resetTeacherTarget.email})`,
        `Admin đã đặt lại mật khẩu mới cho tài khoản GVCN`
      );

      // Refresh teachers from server
      await tenantService.fetchTeachersFromServer().catch(() => {});
      setTeachers(tenantService.getTeacherAccounts());

      setResetSuccessModal({
        teacher: resetTeacherTarget,
        temporaryPassword: result.temporaryPassword,
        activationToken: result.activationToken || resetTeacherTarget.activationToken
      });
      setResetTeacherTarget(null);
      setResetNewPassword('');
      setIsAutoResetPassword(true);
      showToast(`Đã đặt lại mật khẩu thành công cho ${resetTeacherTarget.fullName}!`);
    } catch (err: any) {
      setResetError(err.message || 'Lỗi khi đặt lại mật khẩu.');
    } finally {
      setIsSubmittingReset(false);
    }
  };

  const handleConfirmDeleteTeacher = async () => {
    if (!deleteTeacherTarget) return;

    setIsSubmittingDelete(true);
    setDeleteError(null);

    try {
      await tenantService.deleteTeacherAccount(deleteTeacherTarget.id);

      auditService.log(
        'Xóa tài khoản GVCN',
        'SUPER_ADMIN',
        `${deleteTeacherTarget.fullName} (${deleteTeacherTarget.email})`,
        `Admin đã xóa tài khoản GVCN ${deleteTeacherTarget.fullName}. Toàn bộ dữ liệu lớp học được bảo toàn.`
      );

      // Refresh teachers
      await tenantService.fetchTeachersFromServer().catch(() => {});
      setTeachers(tenantService.getTeacherAccounts());

      showToast(`Đã xóa tài khoản GVCN ${deleteTeacherTarget.fullName}. Dữ liệu lớp học và học sinh được bảo toàn nguyên vẹn.`);
      setDeleteTeacherTarget(null);
    } catch (err: any) {
      setDeleteError(err.message || 'Lỗi khi xóa tài khoản GVCN.');
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  const handleToggleTeacherAccount = async (tch: TeacherAccountItem) => {
    try {
      const result = await tenantService.toggleTeacherAccountStatus(tch.id);
      await tenantService.fetchTeachersFromServer().catch(() => {});
      setTeachers(tenantService.getTeacherAccounts());
      showToast(result.message);
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi thay đổi trạng thái tài khoản.');
    }
  };

  const handleToggleTenant = (id: string, name: string) => {
    const nextStatus = tenantService.toggleTenantStatus(id);
    auditService.log(
      nextStatus === 'ACTIVE' ? 'Kích hoạt Workspace' : 'Tạm khóa Workspace',
      'SUPER_ADMIN',
      name,
      `Chuyển trạng thái sang ${nextStatus}`
    );
    showToast(`Đã ${nextStatus === 'ACTIVE' ? 'mở khóa' : 'tạm khóa'} không gian ${name}`);
  };

  const handleToggleFeature = (key: keyof FeatureFlagConfig, label: string) => {
    const next = migrationService.toggleFeature(key);
    auditService.log(
      'Cập nhật Feature Flag',
      'SUPER_ADMIN',
      label,
      `Chuyển trạng thái tính năng sang: ${next ? 'BẬT' : 'TẮT'}`
    );
    showToast(`Đã ${next ? 'bật' : 'tắt'} tính năng: ${label}`);
  };

  const handleRunMigration = () => {
    const res = migrationService.runIdempotentMigration();
    auditService.log(
      'Nâng cấp Schema Database',
      'SUPER_ADMIN',
      `Schema Version ${res.version}`,
      'Thực thi migration tự động toàn bộ Tenants'
    );
    showToast(res.message);
  };

  const handleExportSnapshot = () => {
    const jsonStr = migrationService.exportFullPlatformSnapshot();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `khong-gian-chu-nhiem-so-snapshot-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Đã tải xuống bản Snapshot toàn hệ thống an toàn!');
  };

  const handleImportSnapshot = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = evt => {
      const text = evt.target?.result as string;
      const res = migrationService.restoreSnapshot(text);
      if (res.success) {
        showToast(res.message);
      } else {
        alert(res.message);
      }
    };
    reader.readAsText(file);
  };

  const handleActivateBreakGlass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!breakGlassReason) {
      alert('Vui lòng nhập lý do hỗ trợ kỹ thuật (Break-glass access).');
      return;
    }

    migrationService.setSupportBreakGlass(true);
    auditService.log(
      'Kích hoạt Quyền Hỗ trợ Kỹ thuật (Break-glass)',
      'SUPER_ADMIN',
      'TOÀN HỆ THỐNG',
      `Lý do: ${breakGlassReason}`
    );

    setShowBreakGlassModal(false);
    showToast('Đã kích hoạt chế độ Support / Break-glass Access với đầy đủ Audit Trail.');
  };

  const filteredTeachers = teachers.filter(t => {
    if (!t) return false;
    const name = t.fullName || '';
    const email = t.email || '';
    const school = t.schoolName || '';
    const q = searchQuery.toLowerCase();
    const matchSearch =
      name.toLowerCase().includes(q) ||
      email.toLowerCase().includes(q) ||
      school.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'ALL' || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[9999] flex items-center gap-3 rounded-2xl bg-slate-900 px-5 py-3 text-white shadow-2xl border border-slate-700 animate-slide-up">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* 1. HORIZONTAL LARGE COVER BANNER - Prominent top banner frame with dynamic alignment */}
      <div className="relative h-44 sm:h-56 md:h-64 w-full overflow-hidden rounded-3xl border border-slate-200/90 bg-slate-900 shadow-sm admin-cover-layout">
        {adminTheme.coverImage ? (
          <>
            <img
              src={adminTheme.coverImage}
              alt="Admin Cover Banner"
              referrerPolicy="no-referrer"
              style={{
                objectPosition: adminTheme.coverPosition || `center ${adminTheme.coverPositionY ?? 50}%`,
                transform: `scale(${(adminTheme.coverZoom ?? 100) / 100})`
              }}
              className="absolute inset-0 h-full w-full object-cover transition-all duration-200"
            />
            <div
              className="absolute inset-0 bg-slate-950"
              style={{ opacity: (adminTheme.coverOverlayOpacity ?? 30) / 100 }}
            />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center">
            <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="text-center space-y-1 z-10 px-4">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-bold backdrop-blur-xs border border-white/10">
                <ShieldAlert className="h-3.5 w-3.5 text-blue-400" /> Không Gian Quản Trị Hệ Thống Số
              </span>
            </div>
          </div>
        )}

        {/* Quick Cover Action on top-right */}
        <div className="absolute top-4 right-4 z-20">
          <button
            onClick={() => setActiveTab('theme_settings')}
            className="flex items-center gap-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 backdrop-blur-md px-3.5 py-2 text-xs font-bold text-white border border-white/20 shadow-lg cursor-pointer transition-all active:scale-95"
          >
            <Palette className="h-3.5 w-3.5 text-amber-400" />
            <span>Tùy chỉnh Ảnh bìa & Theme</span>
          </button>
        </div>
      </div>

      {/* 2. ADMIN HEADER / INFORMATION CARD */}
      <div
        className="rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-200/90 relative overflow-hidden transition-all admin-header-card"
        style={{
          backgroundColor: adminTheme.backgroundColor || '#FFFFFF',
          color: adminTheme.textColor || '#0F172A'
        }}
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                <ShieldAlert className="h-3.5 w-3.5" /> BẢNG ĐIỀU KHIỂN QUẢN TRỊ TOÀN HỆ THỐNG
              </span>
              <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                ● {stats.systemHealth}
              </span>
              <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {stats.version}
              </span>
            </div>
            <h1
              className="text-xl sm:text-2xl font-black tracking-tight"
              style={{ color: adminTheme.textColor || '#0F172A' }}
            >
              HỆ THỐNG QUẢN TRỊ NỀN TẢNG "KHÔNG GIAN CHỦ NHIỆM SỐ"
            </h1>
            <p
              className="text-xs max-w-3xl leading-relaxed"
              style={{ color: adminTheme.secondaryTextColor || '#64748B' }}
            >
              Quản trị hạ tầng SaaS đa người dùng, cấp tài khoản cho GVCN, cấu hình phiên bản schema, kiểm soát tính năng toàn hệ thống và thiết lập Thông tin liên hệ Admin hiển thị tại trang đăng nhập.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setShowNewTeacherModal(true)}
              className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm cursor-pointer transition-all active:scale-95"
            >
              <Plus className="h-4 w-4" /> CẤP TÀI KHOẢN GVCN
            </button>
            <button
              onClick={() => setActiveTab('contact')}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold border cursor-pointer transition-all bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200"
            >
              <PhoneCall className="h-4 w-4 text-amber-500" /> THÔNG TIN LIÊN HỆ
            </button>
            <button
              onClick={handleExportSnapshot}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold border cursor-pointer transition-all bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
            >
              <Download className="h-4 w-4" /> XUẤT SNAPSHOT
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-6 border-t border-slate-100">
          <div className="rounded-2xl p-3.5 border border-slate-200 bg-slate-50/80 transition-all">
            <span className="text-[11px] font-bold uppercase block text-slate-500">
              Workspaces
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-slate-900">
                {dbStats?.totalTenants ?? (dbStats as any)?.tenants?.total ?? stats.totalTenants}
              </span>
              <span className="text-[10px] font-bold text-emerald-600">({dbStats?.activeTenants ?? (dbStats as any)?.tenants?.active ?? stats.activeTenants} Hoạt động)</span>
            </div>
          </div>

          <div className="rounded-2xl p-3.5 border border-slate-200 bg-slate-50/80 transition-all">
            <span className="text-[11px] font-bold uppercase block text-slate-500">
              Giáo viên chủ nhiệm
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-slate-900">
                {dbStats?.totalTeachers ?? (dbStats as any)?.teachers?.total ?? stats.totalTeachers}
              </span>
              <span className="text-[10px] text-slate-500">
                Tài khoản
              </span>
            </div>
          </div>

          <div className="rounded-2xl p-3.5 border border-slate-200 bg-slate-50/80 transition-all">
            <span className="text-[11px] font-bold uppercase block text-slate-500">
              Tổng số Lớp học
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-slate-900">
                {stats.totalClasses}
              </span>
              <span className="text-[10px] text-slate-500">
                Không gian
              </span>
            </div>
          </div>

          <div className="rounded-2xl p-3.5 border border-slate-200 bg-slate-50/80 transition-all">
            <span className="text-[11px] font-bold uppercase block text-slate-500">
              Học sinh trong CSDL
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-slate-900">
                {dbStats?.totalStudents ?? (dbStats as any)?.students?.total ?? stats.totalStudentsEstimate}
              </span>
              <span className="text-[10px] text-slate-500">
                Học viên
              </span>
            </div>
          </div>

          <div className="rounded-2xl p-3.5 border border-slate-200 bg-slate-50/80 transition-all">
            <span className="text-[11px] font-bold uppercase block text-slate-500">
              Schema Version
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-blue-700">
                v{systemConfig.schemaVersion}
              </span>
              <span className="text-[10px] font-bold text-slate-500">
                Bảo toàn
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2-Column Administrative Layout: Left/Right Vertical Sidebar + Main Content Workspace */}
      <div className={`flex flex-col ${adminTheme.sidebarPosition === 'right' ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-6 items-start`}>
        {/* Left Vertical Sidebar */}
        <aside className="w-full lg:w-72 shrink-0 bg-white rounded-3xl border border-slate-200/80 p-4 shadow-sm space-y-5 lg:sticky lg:top-4">
          <div className="px-2 pt-1 pb-0 flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">DANH MỤC QUẢN TRỊ</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
              Admin
            </span>
          </div>

          <nav className="space-y-4">
            {/* Group 1: Hệ thống & Điều hành */}
            <div className="space-y-1">
              <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-indigo-600">
                Hệ Thống & Điều Hành
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className={`w-full flex items-center justify-between gap-3 rounded-2xl px-3.5 py-2.5 text-xs font-bold transition-all text-left cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Activity className="h-4 w-4 shrink-0" />
                  <span className="truncate">Bảng Điều Khiển</span>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${activeTab === 'dashboard' ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-700'}`}>
                  Live
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('support_feedback')}
                className={`w-full flex items-center justify-between gap-3 rounded-2xl px-3.5 py-2.5 text-xs font-bold transition-all text-left cursor-pointer ${
                  activeTab === 'support_feedback'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <HelpCircle className="h-4 w-4 shrink-0 text-sky-400" />
                  <span className="truncate">Hỗ Trợ & Góp Ý</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('surveys')}
                className={`w-full flex items-center justify-between gap-3 rounded-2xl px-3.5 py-2.5 text-xs font-bold transition-all text-left cursor-pointer ${
                  activeTab === 'surveys'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText className="h-4 w-4 shrink-0 text-purple-400" />
                  <span className="truncate">Khảo Sát Hệ Thống</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('guides')}
                className={`w-full flex items-center justify-between gap-3 rounded-2xl px-3.5 py-2.5 text-xs font-bold transition-all text-left cursor-pointer ${
                  activeTab === 'guides'
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <BookOpen className="h-4 w-4 shrink-0 text-amber-500" />
                  <span className="truncate">Hướng Dẫn Sử Dụng</span>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${activeTab === 'guides' ? 'bg-white/20 text-white' : 'bg-amber-50 text-amber-700'}`}>
                  5 Nhóm
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('theme_settings')}
                className={`w-full flex items-center justify-between gap-3 rounded-2xl px-3.5 py-2.5 text-xs font-bold transition-all text-left cursor-pointer ${
                  activeTab === 'theme_settings'
                    ? 'bg-pink-600 text-white shadow-md shadow-pink-600/20'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Palette className="h-4 w-4 shrink-0 text-pink-500" />
                  <span className="truncate">Giao Diện & Theme Admin</span>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${activeTab === 'theme_settings' ? 'bg-white/20 text-white' : 'bg-pink-50 text-pink-700'}`}>
                  Custom
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('contact')}
                className={`w-full flex items-center justify-between gap-3 rounded-2xl px-3.5 py-2.5 text-xs font-bold transition-all text-left cursor-pointer ${
                  activeTab === 'contact'
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <PhoneCall className="h-4 w-4 shrink-0 text-amber-500" />
                  <span className="truncate">Thông Tin Liên Hệ</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('security')}
                className={`w-full flex items-center justify-between gap-3 rounded-2xl px-3.5 py-2.5 text-xs font-bold transition-all text-left cursor-pointer ${
                  activeTab === 'security'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <KeyRound className="h-4 w-4 shrink-0 text-emerald-500" />
                  <span className="truncate">Bảo Mật Tài Khoản</span>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${activeTab === 'security' ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-700'}`}>
                  Admin
                </span>
              </button>
            </div>

            {/* Group 2: Quản trị Người Dùng */}
            <div className="space-y-1 pt-2 border-t border-slate-100">
              <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
                Quản Trị Người Dùng
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('teachers')}
                className={`w-full flex items-center justify-between gap-3 rounded-2xl px-3.5 py-2.5 text-xs font-bold transition-all text-left cursor-pointer ${
                  activeTab === 'teachers'
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Users className="h-4 w-4 shrink-0" />
                  <span className="truncate">Quản Lý GVCN & Lớp Học</span>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${activeTab === 'teachers' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'}`}>
                  {teachers.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('workspaces')}
                className={`w-full flex items-center justify-between gap-3 rounded-2xl px-3.5 py-2.5 text-xs font-bold transition-all text-left cursor-pointer ${
                  activeTab === 'workspaces'
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Layers className="h-4 w-4 shrink-0" />
                  <span className="truncate">Danh Sách Không Gian</span>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${activeTab === 'workspaces' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'}`}>
                  {tenants.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className={`w-full flex items-center justify-between gap-3 rounded-2xl px-3.5 py-2.5 text-xs font-bold transition-all text-left cursor-pointer ${
                  activeTab === 'overview'
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <ShieldCheck className="h-4 w-4 shrink-0" />
                  <span className="truncate">Tổng Quan Quyền Hạn</span>
                </div>
              </button>
            </div>

            {/* Group 3: Hạ tầng & Kỹ thuật */}
            <div className="space-y-1 pt-2 border-t border-slate-100">
              <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
                Hạ Tầng & Kỹ Thuật
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('features')}
                className={`w-full flex items-center justify-between gap-3 rounded-2xl px-3.5 py-2.5 text-xs font-bold transition-all text-left cursor-pointer ${
                  activeTab === 'features'
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Sliders className="h-4 w-4 shrink-0" />
                  <span className="truncate">Feature Flags</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('migrations')}
                className={`w-full flex items-center justify-between gap-3 rounded-2xl px-3.5 py-2.5 text-xs font-bold transition-all text-left cursor-pointer ${
                  activeTab === 'migrations'
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Database className="h-4 w-4 shrink-0" />
                  <span className="truncate">Phiên Bản & Schema</span>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${activeTab === 'migrations' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'}`}>
                  v{systemConfig.schemaVersion}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('audit')}
                className={`w-full flex items-center justify-between gap-3 rounded-2xl px-3.5 py-2.5 text-xs font-bold transition-all text-left cursor-pointer ${
                  activeTab === 'audit'
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Key className="h-4 w-4 shrink-0" />
                  <span className="truncate">Nhật Ký Audit Logs</span>
                </div>
              </button>
            </div>
          </nav>

          {/* Quick sidebar widget */}
          <div className="rounded-2xl bg-slate-50 p-3 border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
              <span>Hạ tầng CSDL</span>
              <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span> Sẵn sàng
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowNewTeacherModal(true)}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-2 text-xs font-bold text-white hover:bg-blue-500 shadow-sm cursor-pointer transition-all active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" /> Cấp Tài Khoản GVCN
            </button>
          </div>
        </aside>

        {/* Right Main Content Area */}
        <main className="flex-1 min-w-0 w-full space-y-6">

      {/* TAB: ADMIN DASHBOARD */}
      {activeTab === 'dashboard' && (
        <AdminSystemDashboard />
      )}

      {/* TAB: SUPPORT & FEEDBACK HUB */}
      {activeTab === 'support_feedback' && (
        <AdminSupportFeedbackHub />
      )}

      {/* TAB: SYSTEM SURVEY MANAGER */}
      {activeTab === 'surveys' && (
        <AdminSystemSurveyManager />
      )}

      {/* TAB: GUIDE MANAGEMENT (SUPER_ADMIN ONLY) */}
      {activeTab === 'guides' && (
        <AdminGuideManagerTab />
      )}

      {/* TAB: ADMIN THEME & UI SETTINGS */}
      {activeTab === 'theme_settings' && (
        <AdminThemeSettingsTab />
      )}

      {/* TAB 1: OVERVIEW & ADMIN POWERS */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Admin Responsibilities / Core Powers Card */}
            <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase">QUYỀN HẠN CỦA ADMIN TỔNG (PLATFORM SUPER ADMIN)</h3>
                    <p className="text-xs text-slate-500">Phân định rõ ràng trách nhiệm quản trị hệ sinh thái và tôn trọng quyền riêng tư của lớp</p>
                  </div>
                </div>
                <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-black text-indigo-700 border border-indigo-200">
                  PLATFORM SCOPE
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="rounded-2xl bg-blue-50/50 p-4 border border-blue-100 space-y-2">
                  <span className="text-[11px] font-black text-blue-900 uppercase flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
                    1. Quản lý Tài khoản & Bản quyền
                  </span>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Cấp mới tài khoản GVCN, cấu hình hạn mức số lớp, dung lượng lưu trữ, cấp phát mã kích hoạt và khóa/mở khóa workspace khi cần.
                  </p>
                </div>

                <div className="rounded-2xl bg-purple-50/50 p-4 border border-purple-100 space-y-2">
                  <span className="text-[11px] font-black text-purple-900 uppercase flex items-center gap-1.5">
                    <Sliders className="h-4 w-4 text-purple-600 shrink-0" />
                    2. Cấu hình Tính năng (Feature Flags)
                  </span>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Bật/Tắt các module toàn hệ thống (AI Cố vấn, Zalo OA, Google Sync, Holland Test, Dự toán điểm tốt nghiệp TT22) mà không ảnh hưởng CSDL.
                  </p>
                </div>

                <div className="rounded-2xl bg-emerald-50/50 p-4 border border-emerald-100 space-y-2">
                  <span className="text-[11px] font-black text-emerald-900 uppercase flex items-center gap-1.5">
                    <PhoneCall className="h-4 w-4 text-emerald-600 shrink-0" />
                    3. Thông tin Liên hệ Admin
                  </span>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Nhập và quản lý thông tin liên hệ hỗ trợ (Hotline, Email, Người đại diện, Giờ làm việc) hiển thị công khai ở Trang Đăng Nhập.
                  </p>
                </div>

                <div className="rounded-2xl bg-amber-50/50 p-4 border border-amber-100 space-y-2">
                  <span className="text-[11px] font-black text-amber-900 uppercase flex items-center gap-1.5">
                    <Database className="h-4 w-4 text-amber-600 shrink-0" />
                    4. Bảo toàn & Nâng cấp Dữ liệu
                  </span>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Thực thi Schema Migration tự động (Idempotent), xuất snapshot toàn hệ thống JSON và bảo đảm 100% không bao giờ mất mát dữ liệu lớp.
                  </p>
                </div>
              </div>

              {/* Strict Privacy Notice */}
              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200 flex items-start gap-3">
                <Info className="h-5 w-5 text-slate-500 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-600 leading-relaxed">
                  <strong>Ranh giới bảo mật:</strong> Admin Tổng <u>không truy cập</u> và <u>không can thiệp</u> vào dữ liệu chuyên môn riêng tư của từng lớp (Danh sách học sinh, sổ đánh giá, nhận xét hạnh kiểm, bảng điểm hay tin nhắn phụ huynh).
                </p>
              </div>
            </div>

            {/* Workspaces Summary List */}
            <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 uppercase">CÁC KHÔNG GIAN ĐANG VẬN HÀNH ({tenants.length})</h3>
                <button
                  onClick={() => setActiveTab('workspaces')}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                >
                  Xem chi tiết tất cả →
                </button>
              </div>

              <div className="space-y-3">
                {tenants.slice(0, 4).map(tenant => (
                  <div
                    key={tenant.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4 border border-slate-200 hover:border-blue-300 transition-all"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900">{tenant.name}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          tenant.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {tenant.status}
                        </span>
                        <span className="rounded-md bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-800">
                          {tenant.plan}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {tenant.schoolName} • GVCN: {tenant.ownerName} ({tenant.ownerEmail})
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleTenant(tenant.id, tenant.name)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                          tenant.status === 'ACTIVE'
                            ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        }`}
                      >
                        {tenant.status === 'ACTIVE' ? 'Tạm khóa' : 'Kích hoạt'}
                      </button>
                      <button
                        onClick={() => setDeleteWorkspaceTargetId(tenant.id)}
                        title="Xóa vĩnh viễn không gian lớp"
                        className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs font-bold hover:bg-rose-100 flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>Xóa vĩnh viễn</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Admin Contact Preview & Quick Actions */}
          <div className="space-y-6">
            {/* Quick Contact Info Display Card */}
            <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-900">
                  <PhoneCall className="h-5 w-5 text-amber-600 shrink-0" />
                  <h3 className="text-xs font-black uppercase tracking-tight">THÔNG TIN LIÊN HỆ ĐANG HIỂN THỊ</h3>
                </div>
                <button
                  onClick={() => setActiveTab('contact')}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800"
                >
                  Chỉnh sửa
                </button>
              </div>

              <div className="rounded-2xl bg-amber-50/60 p-4 border border-amber-200/80 space-y-2.5 text-xs">
                <div className="font-bold text-slate-900">{contactForm.organizationName}</div>
                <div className="text-slate-600 flex items-center gap-2">
                  <UserCheck className="h-3.5 w-3.5 text-amber-700" />
                  <span>{contactForm.contactPerson}</span>
                </div>
                <div className="text-slate-600 flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-amber-700" />
                  <a href={`mailto:${contactForm.email}`} className="text-blue-700 hover:underline">{contactForm.email}</a>
                </div>
                <div className="text-slate-600 flex items-center gap-2">
                  <PhoneCall className="h-3.5 w-3.5 text-amber-700" />
                  <a href={`tel:${contactForm.phone}`} className="font-bold text-slate-900">{contactForm.phone}</a>
                </div>
                {contactForm.workingHours && (
                  <div className="text-slate-500 flex items-center gap-2 text-[11px]">
                    <Clock className="h-3.5 w-3.5 text-amber-700" />
                    <span>{contactForm.workingHours}</span>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-slate-400">
                Thông tin này xuất hiện tại Trang Đăng Nhập để hỗ trợ GVCN, Phụ huynh và Học sinh khi cần cấp mới hoặc khôi phục quyền truy cập.
              </p>
            </div>

            {/* Support Access / Break-Glass Box */}
            <div className="rounded-3xl bg-amber-50/70 p-6 border border-amber-200 space-y-4">
              <div className="flex items-center gap-2 text-amber-900">
                <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0" />
                <h3 className="text-xs font-black uppercase tracking-tight">TRUY CẬP HỖ TRỢ KỸ THUẬT (BREAK-GLASS)</h3>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                Super Admin mặc định KHÔNG can thiệp dữ liệu lớp. Chỉ kích hoạt khi GVCN yêu cầu hỗ trợ sửa lỗi khẩn cấp. Mọi hành động đều được ghi log bất biến.
              </p>

              <button
                onClick={() => setShowBreakGlassModal(true)}
                className="w-full rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-black text-white hover:bg-amber-700 shadow-md cursor-pointer transition-all"
              >
                {systemConfig.supportBreakGlassActive ? '✓ ĐANG KÍCH HOẠT BREAK-GLASS' : 'YÊU CẦU TRUY CẬP HỖ TRỢ'}
              </button>
            </div>

            {/* Quick Actions Card */}
            <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200 space-y-3">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight">TÁC VỤ HỆ THỐNG NHANH</h3>

              <div className="space-y-2">
                <button
                  onClick={handleRunMigration}
                  className="w-full flex items-center justify-between rounded-xl bg-slate-50 p-3 text-xs font-bold text-slate-800 hover:bg-slate-100 border border-slate-200 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-blue-600" /> Đồng bộ & Nâng Schema (v{systemConfig.schemaVersion})
                  </span>
                  <span className="text-[10px] text-slate-400">Tự động</span>
                </button>

                <button
                  onClick={handleExportSnapshot}
                  className="w-full flex items-center justify-between rounded-xl bg-slate-50 p-3 text-xs font-bold text-slate-800 hover:bg-slate-100 border border-slate-200 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Download className="h-4 w-4 text-emerald-600" /> Tải Snapshot Toàn Bộ (JSON)
                  </span>
                  <span className="text-[10px] text-slate-400">Full</span>
                </button>

                <label className="w-full flex items-center justify-between rounded-xl bg-slate-50 p-3 text-xs font-bold text-slate-800 hover:bg-slate-100 border border-slate-200 cursor-pointer">
                  <span className="flex items-center gap-2">
                    <Upload className="h-4 w-4 text-indigo-600" /> Phục Hồi Dữ Liệu Từ File
                  </span>
                  <input type="file" accept=".json" onChange={handleImportSnapshot} className="hidden" />
                  <span className="text-[10px] text-slate-400">Chọn file</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ADMIN CONTACT MANAGEMENT FORM */}
      {activeTab === 'contact' && (
        <div className="rounded-3xl bg-white p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 font-bold">
                  <PhoneCall className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 uppercase">QUẢN LÝ THÔNG TIN LIÊN HỆ ADMIN</h3>
                  <p className="text-xs text-slate-500">Thông tin này được lưu vào hệ thống và hiển thị trực tiếp tại Trang Đăng Nhập cho người dùng.</p>
                </div>
              </div>
            </div>
          </div>

          {contactSaveSuccess && (
            <div className="rounded-2xl bg-emerald-50 p-4 border border-emerald-200 flex items-center gap-3 text-emerald-900 text-xs font-bold animate-fade-in">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <span>Đã lưu và đồng bộ thành công Thông tin Liên hệ Admin!</span>
            </div>
          )}

          <form onSubmit={handleSaveContact} className="space-y-6 max-w-4xl text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-[11px] font-black text-slate-700 uppercase mb-1.5 flex items-center gap-1.5">
                  <Building className="h-4 w-4 text-slate-500" /> Tên đơn vị / Ban Quản trị *
                </label>
                <input
                  type="text"
                  required
                  value={contactForm.organizationName}
                  onChange={e => setContactForm({ ...contactForm, organizationName: e.target.value })}
                  placeholder="Ví dụ: Ban Quản trị Hệ thống Không Gian Chủ Nhiệm Số"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50/50 p-3 text-xs font-bold text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-700 uppercase mb-1.5 flex items-center gap-1.5">
                  <UserCheck className="h-4 w-4 text-slate-500" /> Người liên hệ / Đại diện kỹ thuật *
                </label>
                <input
                  type="text"
                  required
                  value={contactForm.contactPerson}
                  onChange={e => setContactForm({ ...contactForm, contactPerson: e.target.value })}
                  placeholder="Ví dụ: Thầy Nguyễn Đức Bình"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50/50 p-3 text-xs font-bold text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-[11px] font-black text-slate-700 uppercase mb-1.5 flex items-center gap-1.5">
                  <Mail className="h-4 w-4 text-slate-500" /> Email hỗ trợ / Tiếp nhận yêu cầu *
                </label>
                <input
                  type="email"
                  required
                  value={contactForm.email}
                  onChange={e => setContactForm({ ...contactForm, email: e.target.value })}
                  placeholder="binhdtsply@gmail.com"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50/50 p-3 text-xs font-bold text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-700 uppercase mb-1.5 flex items-center gap-1.5">
                  <PhoneCall className="h-4 w-4 text-slate-500" /> Số điện thoại / Hotline hỗ trợ *
                </label>
                <input
                  type="text"
                  required
                  value={contactForm.phone}
                  onChange={e => setContactForm({ ...contactForm, phone: e.target.value })}
                  placeholder="0988 123 456"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50/50 p-3 text-xs font-bold text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-[11px] font-black text-slate-700 uppercase mb-1.5 flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-slate-500" /> Địa chỉ / Cơ sở làm việc
                </label>
                <input
                  type="text"
                  value={contactForm.address || ''}
                  onChange={e => setContactForm({ ...contactForm, address: e.target.value })}
                  placeholder="Hà Nội, Việt Nam"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50/50 p-3 text-xs font-medium text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-700 uppercase mb-1.5 flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-slate-500" /> Khung giờ hỗ trợ
                </label>
                <input
                  type="text"
                  value={contactForm.workingHours || ''}
                  onChange={e => setContactForm({ ...contactForm, workingHours: e.target.value })}
                  placeholder="Thứ 2 - Thứ 6 (08:00 - 17:30)"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50/50 p-3 text-xs font-medium text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-700 uppercase mb-1.5 flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-slate-500" /> Hướng dẫn / Ghi chú hiển thị cho người dùng
              </label>
              <textarea
                rows={3}
                value={contactForm.notes || ''}
                onChange={e => setContactForm({ ...contactForm, notes: e.target.value })}
                placeholder="Liên hệ khi cần hỗ trợ cấp mới tài khoản GVCN hoặc khôi phục quyền truy cập..."
                className="w-full rounded-xl border border-slate-300 bg-slate-50/50 p-3 text-xs font-medium text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-hidden"
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <span className="text-[11px] text-slate-400">
                Lần cập nhật gần nhất: {contactForm.updatedAt ? new Date(contactForm.updatedAt).toLocaleString('vi-VN') : 'Chưa lưu'}
              </span>

              <button
                type="submit"
                disabled={isSavingContact}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-xs font-black text-white hover:bg-blue-500 shadow-lg shadow-blue-600/30 cursor-pointer disabled:opacity-50 transition-all"
              >
                {isSavingContact ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                LƯU THÔNG TIN LIÊN HỆ
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB: BẢO MẬT & ĐỊNH DANH TÀI KHOẢN ADMIN */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="rounded-3xl bg-white p-6 sm:p-8 shadow-sm border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 font-bold">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 uppercase">BẢO MẬT & ĐỊNH DANH TÀI KHOẢN QUẢN TRỊ VIÊN</h3>
                  <p className="text-xs text-slate-500">Quản lý Tên đăng nhập riêng, đổi mật khẩu an toàn, khôi phục qua Firebase Authentication và bảo vệ phiên.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <ShieldCheck className="h-4 w-4" />
                  Tài khoản Persistent
                </span>
              </div>
            </div>

            {/* Principle of Separation Notice */}
            <div className="mt-5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-4 space-y-2">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wide">
                <ShieldAlert className="h-4 w-4 text-amber-700 shrink-0" />
                <span>Nguyên Tắc Phân Định Bảo Mật: Tách Thông Tin Công Khai Khỏi Credential Quản Trị</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                Thông tin tại tab <strong>Thông Tin Liên Hệ</strong> (Email hỗ trợ, Số điện thoại hỗ trợ) là dữ liệu công khai hiển thị cho người dùng liên hệ hỗ trợ.
                Tài khoản Quản trị viên sử dụng <strong>Tên đăng nhập riêng (admin / email)</strong> và cơ chế đặt lại mật khẩu an toàn qua <strong>Firebase Authentication</strong> gửi về email chính chủ.
                Kẻ ngoài dù biết Email hay Số điện thoại hỗ trợ cũng <strong>tuyệt đối không thể</strong> dùng chúng để can thiệp tài khoản Admin.
              </p>
            </div>

            {/* Status Grid */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Tên đăng nhập (Login ID)</span>
                <span className="text-sm font-mono font-bold text-slate-900 block">{adminProfile?.loginId || 'admin'}</span>
                <span className="text-[10px] text-slate-500 block">Định danh đăng nhập độc lập & duy nhất</span>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Khôi phục mật khẩu</span>
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-bold text-slate-900">
                    Firebase Authentication
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 block">
                  Email: {adminProfile?.email || 'binhdtsply@gmail.com'}
                </span>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Phiên bảo mật hệ thống</span>
                <span className="text-sm font-bold text-indigo-700 block">v{adminProfile?.sessionVersion || 1}</span>
                <span className="text-[10px] text-slate-500 block">Tự động tăng khi đổi mật khẩu/thu hồi phiên</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Card 1: Change Password */}
            <div className="rounded-3xl bg-white p-6 sm:p-7 shadow-sm border border-slate-200 space-y-5">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 font-bold">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 uppercase">ĐỔI MẬT KHẨU QUẢN TRỊ VIÊN</h4>
                  <p className="text-xs text-slate-500">Yêu cầu xác thực mật khẩu hiện tại trước khi thiết lập mật khẩu mới.</p>
                </div>
              </div>

              {adminPassError && (
                <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3.5 flex items-start gap-2.5 text-xs text-rose-800">
                  <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="flex-1 font-medium">{adminPassError}</span>
                </div>
              )}

              {adminPassSuccess && (
                <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3.5 flex items-start gap-2.5 text-xs text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="flex-1 font-medium">{adminPassSuccess}</span>
                </div>
              )}

              <form onSubmit={handleChangeAdminPassword} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Mật khẩu hiện tại {isGoogleAdmin ? <span className="text-emerald-600 font-normal lowercase">(không bắt buộc vì đã xác thực Google OAuth)</span> : <span className="text-red-500">*</span>}
                  </label>
                  <div className="relative">
                    <input
                      type={showAdminOldPassword ? 'text' : 'password'}
                      value={adminOldPassword}
                      onChange={e => setAdminOldPassword(e.target.value)}
                      placeholder={isGoogleAdmin ? "Để trống nếu không nhớ mật khẩu cũ..." : "Nhập mật khẩu hiện tại..."}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50/50 pl-3.5 pr-10 py-2.5 text-xs text-slate-900 outline-hidden focus:border-blue-500 focus:bg-white"
                      required={!isGoogleAdmin}
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminOldPassword(!showAdminOldPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showAdminOldPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Mật khẩu mới (Tối thiểu 6 ký tự) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showAdminNewPassword ? 'text' : 'password'}
                      value={adminNewPassword}
                      onChange={e => setAdminNewPassword(e.target.value)}
                      placeholder="Nhập mật khẩu mới..."
                      className="w-full rounded-xl border border-slate-300 bg-slate-50/50 pl-3.5 pr-10 py-2.5 text-xs text-slate-900 outline-hidden focus:border-blue-500 focus:bg-white"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminNewPassword(!showAdminNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showAdminNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Xác nhận mật khẩu mới <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={adminConfirmPassword}
                    onChange={e => setAdminConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới..."
                    className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-900 outline-hidden focus:border-blue-500 focus:bg-white"
                    required
                  />
                </div>

                <div className="pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-600 hover:text-slate-900">
                    <input
                      type="checkbox"
                      checked={adminRevokeOtherSessions}
                      onChange={e => setAdminRevokeOtherSessions(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    <span className="font-medium">Đăng xuất khỏi tất cả các thiết bị khác sau khi đổi mật khẩu</span>
                  </label>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isChangingAdminPass || (!isGoogleAdmin && !adminOldPassword.trim()) || !adminNewPassword.trim() || !adminConfirmPassword.trim()}
                    className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-black text-white hover:bg-blue-700 shadow-md cursor-pointer transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isChangingAdminPass ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Đang lưu mật khẩu mới...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        <span>CẬP NHẬT MẬT KHẨU MỚI</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Card 2: Secret Recovery Code Management */}
            <div className="rounded-3xl bg-white p-6 sm:p-7 shadow-sm border border-slate-200 space-y-5">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700 font-bold">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 uppercase">MÃ KHÔI PHỤC BÍ MẬT (SECRET RECOVERY CODE)</h4>
                  <p className="text-xs text-slate-500">Khôi phục quyền truy cập offline 100%, độc lập và không phụ thuộc dịch vụ email.</p>
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3.5 space-y-2 text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Trạng thái mã hiện tại:</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    adminProfile?.hasCustomRecoveryCode
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}>
                    {adminProfile?.hasCustomRecoveryCode ? 'Đã thiết lập Recovery Code riêng (bền vững)' : 'Mã mặc định hệ thống (chưa đổi)'}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-500">
                  Hệ thống bảo vệ mã bằng thuật toán băm mật mã an toàn (scrypt). Mã mới sẽ thay thế hoàn toàn mã cũ; mã cũ bị từ chối ngay sau khi cập nhật thành công.
                </p>
              </div>

              {generatedRecoveryCode && (
                <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-400 p-4 space-y-2 text-center animate-scale-up">
                  <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
                    Mã Recovery Code Hiện Hành Của Bạn:
                  </span>
                  <div className="font-mono text-xl font-black text-amber-950 tracking-widest bg-white py-2 px-4 rounded-xl border border-amber-300 shadow-inner select-all">
                    {generatedRecoveryCode}
                  </div>
                  <span className="text-[10px] text-amber-700 block">
                    ⚠️ Hãy sao chép hoặc ghi nhớ mã này vào nơi an toàn. Mã này bắt buộc phải nhập khi sử dụng chức năng Quên mật khẩu.
                  </span>
                </div>
              )}

              {rcGenError && (
                <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3.5 flex items-start gap-2.5 text-xs text-rose-800">
                  <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="flex-1 font-medium">{rcGenError}</span>
                </div>
              )}

              {rcGenSuccess && (
                <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3.5 flex items-start gap-2.5 text-xs text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="flex-1 font-medium leading-relaxed">{rcGenSuccess}</span>
                </div>
              )}

              <form onSubmit={handleSaveCustomRecoveryCode} className="space-y-3.5 pt-1 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    1. Mật khẩu Quản trị viên hiện tại {isGoogleAdmin ? <span className="text-emerald-600 font-normal lowercase">(không bắt buộc vì đã xác thực Google OAuth)</span> : <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="password"
                    value={rcCurrentPassword}
                    onChange={e => setRcCurrentPassword(e.target.value)}
                    placeholder={isGoogleAdmin ? "Để trống nếu không nhớ mật khẩu cũ..." : "Nhập mật khẩu Admin hiện tại để xác thực..."}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-900 outline-hidden focus:border-amber-600 focus:bg-white"
                    required={!isGoogleAdmin}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      2. Recovery Code mới (≥ 6 ký tự) <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateRandomRecoveryCodeSuggestion}
                      className="text-[10px] font-bold text-amber-600 hover:text-amber-700 hover:underline cursor-pointer"
                    >
                      ⚡ Gợi ý tạo mã ngẫu nhiên
                    </button>
                  </div>
                  <input
                    type={showCustomRcCode ? 'text' : 'password'}
                    value={customNewRecoveryCode}
                    onChange={e => setCustomNewRecoveryCode(e.target.value)}
                    placeholder="Nhập mã Recovery Code mới..."
                    className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-900 font-mono uppercase outline-hidden focus:border-amber-600 focus:bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    3. Nhập lại Recovery Code mới (Xác nhận) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type={showCustomRcCode ? 'text' : 'password'}
                    value={customConfirmRecoveryCode}
                    onChange={e => setCustomConfirmRecoveryCode(e.target.value)}
                    placeholder="Xác nhận lại mã Recovery Code mới..."
                    className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-900 font-mono uppercase outline-hidden focus:border-amber-600 focus:bg-white"
                    required
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={showCustomRcCode}
                      onChange={e => setShowCustomRcCode(e.target.checked)}
                      className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 h-4 w-4"
                    />
                    <span>Hiện ký tự Recovery Code</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isGeneratingRc || (!isGoogleAdmin && !rcCurrentPassword.trim()) || !customNewRecoveryCode.trim() || !customConfirmRecoveryCode.trim()}
                  className="w-full rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-black text-xs py-2.5 px-4 shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isGeneratingRc ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Đang lưu Recovery Code mới...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      <span>LƯU VÀ KÍCH HOẠT RECOVERY CODE MỚI</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Card 3: Email Recovery Status & Test Reset */}
            <div className="rounded-3xl bg-white p-6 sm:p-7 shadow-sm border border-slate-200 space-y-5">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700 font-bold">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 uppercase">KHÔI PHỤC MẬT KHẨU QUA EMAIL (SMTP / FIREBASE)</h4>
                  <p className="text-xs text-slate-500">Cơ chế đặt lại mật khẩu an toàn qua email đăng ký chính thức của Quản trị viên.</p>
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3.5 space-y-2 text-xs text-slate-600">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Info className="h-4 w-4 text-blue-600" />
                  <span>Quy trình gửi Email xác thực:</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-500">
                  Email đích: <strong>{adminProfile?.email || 'binhdtsply@gmail.com'}</strong>. Hệ thống ưu tiên gửi mã xác thực 6 số qua máy chủ SMTP (nếu cấu hình), kết hợp Firebase Password Reset. Nếu dịch vụ email không khả dụng, hệ thống sẽ thông báo rõ ràng và hướng dẫn dùng Mã Recovery Code.
                </p>
              </div>

              {firebaseResetError && (
                <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3.5 flex items-start gap-2.5 text-xs text-rose-800">
                  <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="flex-1 font-medium">{firebaseResetError}</span>
                </div>
              )}

              {firebaseResetSuccess && (
                <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3.5 flex items-start gap-2.5 text-xs text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="flex-1 font-medium leading-relaxed">{firebaseResetSuccess}</span>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSendFirebaseResetFromConsole}
                  disabled={firebaseResetLoading}
                  className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-black text-white hover:bg-blue-700 shadow-md cursor-pointer transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {firebaseResetLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Đang gửi yêu cầu...</span>
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4" />
                      <span>GỬI EMAIL THỬ NGHIỆM ĐẶT LẠI MẬT KHẨU</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Card 3: Session Management & Revoke All */}
          <div className="rounded-3xl bg-white p-6 sm:p-7 shadow-sm border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600 font-bold">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 uppercase">QUẢN LÝ PHIÊN & ĐĂNG XUẤT TẤT CẢ THIẾT BỊ</h4>
                  <p className="text-xs text-slate-500">Chủ động thu hồi tất cả phiên đăng nhập khác nếu nghi ngờ bị lộ mật khẩu hoặc thiết bị lạ.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleRevokeAllSessions}
                disabled={isRevokingSessions}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {isRevokingSessions ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                <span>ĐĂNG XUẤT TẤT CẢ CÁC THIẾT BỊ KHÁC</span>
              </button>
            </div>

            {revokeSessionsError && (
              <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3.5 flex items-start gap-2.5 text-xs text-rose-800">
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="flex-1 font-medium">{revokeSessionsError}</span>
              </div>
            )}

            {revokeSessionsSuccess && (
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3.5 flex items-start gap-2.5 text-xs text-emerald-800">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="flex-1 font-medium">{revokeSessionsSuccess}</span>
              </div>
            )}

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Hệ thống áp dụng cơ chế <strong>Session Version Invalidation</strong>: Khi bấm nút này, toàn bộ phiên đăng nhập cũ trên máy tính, điện thoại khác sẽ bị từ chối ngay lập tức. Thiết bị hiện tại của bạn vẫn được duy trì phiên mới mà không bị gián đoạn.
            </p>
          </div>
        </div>
      )}

      {/* TAB 3: TEACHER ACCOUNTS */}
      {activeTab === 'teachers' && (
        <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase">QUẢN LÝ TÀI KHOẢN GVCN / KHÔNG GIAN LỚP HỌC</h3>
              <p className="text-xs text-slate-500">Admin cấp tài khoản GVCN, gán không gian lớp học, thiết lập trạng thái và kiểm soát quyền truy cập.</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  try {
                    exportService.exportTeacherAccountsToExcel(filteredTeachers);
                    showToast(`Đã xuất thành công danh sách ${filteredTeachers.length} tài khoản GVCN ra file Excel!`);
                  } catch (err: any) {
                    showToast('Lỗi khi xuất file Excel: ' + (err?.message || 'Vui lòng thử lại.'));
                  }
                }}
                title="Xuất toàn bộ danh sách tài khoản GVCN kèm thông tin lớp và sĩ số ra file Excel"
                className="flex items-center gap-1.5 rounded-xl border border-emerald-600 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 cursor-pointer shadow-xs transition-colors"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                <span>Xuất Excel</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  try {
                    await tenantService.fetchTeachersFromServer();
                    setTeachers(tenantService.getTeacherAccounts());
                    showToast('Đã làm mới danh sách tài khoản GVCN từ máy chủ.');
                  } catch (err: any) {
                    showToast('Lỗi khi tải lại dữ liệu: ' + err.message);
                  }
                }}
                title="Đồng bộ và làm mới danh sách tài khoản từ máy chủ"
                className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer shadow-xs transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
                <span>Làm mới</span>
              </button>
              <button
                onClick={() => setShowNewTeacherModal(true)}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white hover:bg-blue-500 cursor-pointer shadow-md"
              >
                <Plus className="h-4 w-4" /> Cấp Tài Khoản Mới
              </button>
            </div>
          </div>

          {/* Summary Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tổng số GVCN</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-100 text-blue-600 font-bold text-xs">
                  <Users className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="mt-2 text-xl font-black text-slate-900">{teachers.length}</div>
              <p className="text-[10px] text-slate-400 mt-0.5">Tài khoản quản trị lớp</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Đang hoạt động</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 font-bold text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="mt-2 text-xl font-black text-emerald-600">
                {teachers.filter(t => t.status === 'ACTIVE').length}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Quyền truy cập mở</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Số lớp quản lý</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 font-bold text-xs">
                  <GraduationCap className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="mt-2 text-xl font-black text-indigo-600">
                {teachers.reduce((sum, t) => sum + (t.classesCount || 1), 0)}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Không gian lớp học</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tổng sĩ số HS</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-100 text-amber-600 font-bold text-xs">
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="mt-2 text-xl font-black text-amber-600">
                {teachers.reduce((sum, t) => sum + (t.totalStudentsCount ?? (t.tenantId === 'tenant-lan-nguyen' ? 4 : 1)), 0)}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Học sinh trên hệ thống</p>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm kiếm theo tên GVCN, email, trường học..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50/50 pl-10 pr-4 py-2 text-xs font-medium focus:border-blue-500 focus:bg-white focus:outline-hidden"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-2 rounded-xl text-xs font-bold cursor-pointer ${
                  statusFilter === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tất cả ({teachers.length})
              </button>
              <button
                onClick={() => setStatusFilter('ACTIVE')}
                className={`px-3 py-2 rounded-xl text-xs font-bold cursor-pointer ${
                  statusFilter === 'ACTIVE' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                Hoạt động
              </button>
              <button
                onClick={() => setStatusFilter('LOCKED')}
                className={`px-3 py-2 rounded-xl text-xs font-bold cursor-pointer ${
                  statusFilter === 'LOCKED' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                }`}
              >
                Tạm khóa
              </button>
            </div>
          </div>

          {/* Teacher Accounts Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-black uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Giáo viên chủ nhiệm</th>
                  <th className="p-3.5">Trường / Đơn vị</th>
                  <th className="p-3.5 text-center">Lớp phân công</th>
                  <th className="p-3.5 text-center">Sĩ số lớp</th>
                  <th className="p-3.5 text-center">Năm học</th>
                  <th className="p-3.5">Mã đăng nhập</th>
                  <th className="p-3.5 text-center">Mật khẩu</th>
                  <th className="p-3.5">Trạng thái</th>
                  <th className="p-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium text-slate-700">
                {filteredTeachers.map(tch => {
                  const assignedClass = tch?.className || (tch?.tenantId === 'tenant-lan-nguyen' ? '11A1' : tch?.tenantId === 'tenant-hoang-nam' ? '12A2' : '10A1');
                  const academicYear = tch?.academicYear || '2025 - 2026';
                  const studentCount = (tch?.totalStudentsCount !== undefined && tch?.totalStudentsCount !== null)
                    ? tch.totalStudentsCount
                    : (tch?.tenantId === 'tenant-lan-nguyen' ? 4 : 1);
                  const loginCode = tch?.activationToken || 'ACT-ACTIVE';
                  const isCopied = copiedKey === `code-${tch.id}`;

                  return (
                    <tr key={tch.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{tch?.fullName || 'Chưa đặt tên'}</div>
                        <div className="text-[11px] text-slate-500 font-medium">{tch?.email || ''}</div>
                        {tch?.phone && <div className="text-[10px] text-slate-400">SĐT: {tch.phone}</div>}
                      </td>
                      <td className="p-3.5">
                        <span className="font-semibold text-slate-800">{tch?.schoolName || 'Trường THPT'}</span>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[11px] font-black bg-blue-50 text-blue-700 border border-blue-200">
                          {assignedClass}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Users className="h-3 w-3" />
                          {studentCount} HS
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-semibold text-slate-600 bg-slate-100 border border-slate-200">
                          {academicYear}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <div className="inline-flex items-center gap-1.5">
                          <code className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-mono font-bold text-slate-800 border border-slate-200">
                            {loginCode}
                          </code>
                          <button
                            type="button"
                            onClick={() => handleCopyText(`code-${tch.id}`, loginCode)}
                            title="Sao chép mã đăng nhập"
                            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 cursor-pointer"
                          >
                            {isCopied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </td>
                      <td className="p-3.5 text-center">
                        {tch?.hasPassword ? (
                          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Lock className="h-3 w-3" /> Đã thiết lập
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Unlock className="h-3 w-3" /> Chưa đặt
                          </span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          tch?.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {tch?.status === 'ACTIVE' ? 'Hoạt động' : 'Tạm khóa'}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setResetTeacherTarget(tch);
                              setResetError(null);
                              setResetNewPassword('');
                              setIsAutoResetPassword(true);
                            }}
                            title="Đặt lại mật khẩu"
                            className="rounded-lg px-2 py-1 text-[11px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 cursor-pointer flex items-center gap-1 transition-all"
                          >
                            <KeyRound className="h-3 w-3" />
                            <span>Reset MK</span>
                          </button>

                          <button
                            onClick={() => handleToggleTeacherAccount(tch)}
                            title={tch?.status === 'ACTIVE' ? 'Tạm khóa quyền đăng nhập' : 'Mở khóa quyền đăng nhập'}
                            className={`rounded-lg px-2 py-1 text-[11px] font-bold cursor-pointer transition-all flex items-center gap-1 ${
                              tch?.status === 'ACTIVE'
                                ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                            }`}
                          >
                            {tch?.status === 'ACTIVE' ? (
                              <>
                                <Lock className="h-3 w-3" />
                                <span>Khóa</span>
                              </>
                            ) : (
                              <>
                                <Unlock className="h-3 w-3" />
                                <span>Mở khóa</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => {
                              setDeleteTeacherTarget(tch);
                              setDeleteError(null);
                            }}
                            title="Xóa tài khoản GVCN (Bảo toàn dữ liệu lớp học)"
                            className="rounded-lg px-2 py-1 text-[11px] font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 cursor-pointer flex items-center gap-1 transition-all"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>Xóa</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: WORKSPACES */}
      {activeTab === 'workspaces' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tenants.map(t => (
            <div
              key={t.id}
              className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200 space-y-4 hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 font-black">
                    {t.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">{t.name}</h3>
                    <p className="text-xs text-slate-500">{t.schoolName}</p>
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
                  t.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                  {t.status}
                </span>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Chủ sở hữu:</span>
                  <span className="font-bold text-slate-800">{t.ownerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Email:</span>
                  <span className="font-medium text-slate-700">{t.ownerEmail}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Gói dịch vụ:</span>
                  <span className="font-bold text-blue-700">{t.plan} (Max {t.quota.maxClasses} lớp, {t.quota.maxStudentsPerClass} hs/lớp)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">AI Credits:</span>
                  <span className="font-bold text-purple-700">{t.quota.aiCreditsMonthly} credits / tháng</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-500">Mã định danh: <code className="font-mono font-bold text-slate-700">{t.id}</code></span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleTenant(t.id, t.name)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                      t.status === 'ACTIVE' ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    {t.status === 'ACTIVE' ? 'Tạm ngưng workspace' : 'Kích hoạt lại'}
                  </button>
                  <button
                    onClick={() => setDeleteWorkspaceTargetId(t.id)}
                    title="Xóa vĩnh viễn không gian lớp"
                    className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs font-bold hover:bg-rose-100 flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Xóa vĩnh viễn</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 5: FEATURE FLAGS */}
      {activeTab === 'features' && (
        <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200 space-y-6">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase">CẤU HÌNH TÍNH NĂNG TOÀN HỆ THỐNG (FEATURE FLAGS)</h3>
            <p className="text-xs text-slate-500">Bật/Tắt tính năng theo nhu cầu vận hành, thử nghiệm tính năng mới mà không làm gián đoạn người dùng.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { key: 'aiAssistant', label: 'Trợ lý AI Cố vấn Chủ nhiệm', desc: 'Gợi ý kế hoạch sinh hoạt lớp, tối ưu nề nếp và phân tích học lực', icon: Sparkles, color: 'text-purple-600' },
              { key: 'googleSync', label: 'Đồng bộ Google Sheets & Forms', desc: 'Tự động kéo dữ liệu khảo sát và đồng bộ biểu mẫu Google', icon: Globe, color: 'text-blue-600' },
              { key: 'zaloIntegration', label: 'Tích hợp Zalo Group & Zalo OA', desc: 'Gửi tin báo bài, thời khóa biểu và lịch thi qua nhóm Zalo phụ huynh', icon: MessageSquare, color: 'text-sky-600' },
              { key: 'hollandTest', label: 'Trắc nghiệm Hướng nghiệp RIASEC / Holland', desc: 'Khám phá thiên hướng nghề nghiệp và gợi ý ngành học phù hợp', icon: Compass, color: 'text-amber-600' },
              { key: 'graduationEstimator', label: 'Dự toán Điểm Tốt nghiệp THPT (TT22 / 2018)', desc: 'Tính điểm xét tốt nghiệp theo công thức 4 môn + điểm học bạ 3 năm', icon: GraduationCap, color: 'text-indigo-600' },
              { key: 'parentBridge', label: 'Nhịp cầu Phụ huynh & Nhật ký Giáo dục', desc: 'Kênh trao đổi riêng tư 1-1 giữa GVCN và từng gia đình học sinh', icon: HeartHandshake, color: 'text-rose-600' },
              { key: 'laurelGamification', label: 'Vườn Nguyệt Quế & Gamification Rèn luyện', desc: 'Mô hình nuôi cây hạnh kiểm từ Hạt mầm đến Hoa nở rực rỡ', icon: Award, color: 'text-emerald-600' },
              { key: 'excelImportExport', label: 'Xuất / Nhập Excel Chuẩn Bộ GD&ĐT', desc: 'Hỗ trợ import danh sách lớp, xuất bảng điểm và báo cáo tổng kết', icon: FileSpreadsheet, color: 'text-teal-600' },
            ].map(item => {
              const Icon = item.icon;
              const isEnabled = (systemConfig.featureFlags as any)[item.key];
              return (
                <div
                  key={item.key}
                  className="flex items-start justify-between gap-4 rounded-2xl bg-slate-50 p-4 border border-slate-200"
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-2xs ${item.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs font-black text-slate-900 block">{item.label}</span>
                      <p className="text-[11px] text-slate-500 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleFeature(item.key as any, item.label)}
                    className="cursor-pointer shrink-0 mt-1"
                  >
                    {isEnabled ? (
                      <ToggleRight className="h-7 w-7 text-emerald-600" />
                    ) : (
                      <ToggleLeft className="h-7 w-7 text-slate-300" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 6: MIGRATIONS & VERSIONS */}
      {activeTab === 'migrations' && (
        <div className="space-y-6">
          <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase">QUẢN LÝ PHIÊN BẢN & MIGRATION DATABASE</h3>
                <p className="text-xs text-slate-500">Đảm bảo nâng cấp liên tục, schema versioning tự động và tuyệt đối không xóa trắng dữ liệu.</p>
              </div>

              <button
                onClick={handleRunMigration}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white hover:bg-blue-500 shadow-md cursor-pointer"
              >
                <RefreshCw className="h-4 w-4" /> Chạy Nâng Cấp Schema (Idempotent)
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Schema Version Hiện Tại</span>
                <div className="mt-1 text-xl font-black text-slate-900">Version {systemConfig.schemaVersion}</div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Quy chuẩn tương thích</span>
                <div className="mt-1 text-sm font-bold text-emerald-700">100% Zero Data Loss</div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Tổng số lần Migration</span>
                <div className="mt-1 text-xl font-black text-indigo-700">{migrationHistory.length} lần</div>
              </div>
            </div>
          </div>

          {/* Migration History Log */}
          <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200 space-y-4">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight">LỊCH SỬ NÂNG CẤP SCHEMA (MIGRATION LOGS)</h3>
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[11px] font-black uppercase text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Mã Migration</th>
                    <th className="p-3.5">Từ v → Đến v</th>
                    <th className="p-3.5">Thời gian thực thi</th>
                    <th className="p-3.5">Workspaces ảnh hưởng</th>
                    <th className="p-3.5">Trạng thái</th>
                    <th className="p-3.5">Ghi chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium text-slate-700">
                  {migrationHistory.map(item => (
                    <tr key={item.migrationId} className="hover:bg-slate-50/80">
                      <td className="p-3.5 font-mono text-slate-900 font-bold">{item.migrationId}</td>
                      <td className="p-3.5 font-bold text-blue-700">v{item.fromVersion} → v{item.toVersion}</td>
                      <td className="p-3.5 text-slate-500">{item.completedAt}</td>
                      <td className="p-3.5 font-bold text-slate-800">{item.affectedTenants} Tenants</td>
                      <td className="p-3.5">
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                          {item.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-600 max-w-xs truncate">{item.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase">NHẬT KÝ HOẠT ĐỘNG HỆ THỐNG (AUDIT TRAIL)</h3>
              <p className="text-xs text-slate-500">Mọi thao tác quản trị, cấp quyền, cấu hình và thay đổi dữ liệu được lưu vết minh bạch.</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-black uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Thời gian</th>
                  <th className="p-3.5">Hành động</th>
                  <th className="p-3.5">Người thực hiện</th>
                  <th className="p-3.5">Đối tượng</th>
                  <th className="p-3.5">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium text-slate-700">
                {auditService.getLogs().map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/80">
                    <td className="p-3.5 text-slate-400 whitespace-nowrap">{log.timestamp}</td>
                    <td className="p-3.5 font-bold text-slate-900">{log.action}</td>
                    <td className="p-3.5">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                        {log.performedBy} ({log.role})
                      </span>
                    </td>
                    <td className="p-3.5 font-semibold text-blue-800">{log.target}</td>
                    <td className="p-3.5 text-slate-600">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
        </main>
      </div>

      {/* MODAL: CREATE TEACHER ACCOUNT */}
      {showNewTeacherModal && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="relative flex max-h-[92vh] w-full max-w-lg flex-col rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white">
                  <Plus className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase">CẤP TÀI KHOẢN GVCN MỚI</h3>
                  <p className="text-[11px] text-slate-500">Tạo Workspace riêng biệt và mã kích hoạt cho giáo viên</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowNewTeacherModal(false);
                  setCreatedSuccessAccount(null);
                }}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {createdSuccessAccount ? (
              <div className="p-6 space-y-4 text-xs">
                <div className="rounded-2xl bg-emerald-50 p-4 border border-emerald-200 text-emerald-900 space-y-2 text-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
                  <h4 className="text-sm font-black">CẤP TÀI KHOẢN GVCN THÀNH CÔNG!</h4>
                  <p className="text-xs text-emerald-800">
                    Không gian riêng cho <strong>{createdSuccessAccount?.fullName || 'GVCN'}</strong> đã sẵn sàng hoạt động.
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200 space-y-2.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Họ và tên GVCN:</span>
                    <span className="font-bold text-slate-900">{createdSuccessAccount.fullName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Email đăng nhập:</span>
                    <span className="font-bold text-slate-900">{createdSuccessAccount.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Trường:</span>
                    <span className="font-bold text-slate-900">{createdSuccessAccount.schoolName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Lớp phân công:</span>
                    <span className="font-bold text-blue-700">{createdSuccessAccount.className || '10A1'}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                    <span className="text-slate-500">Mã đăng nhập / Access code:</span>
                    <div className="flex items-center gap-1.5">
                      <code className="rounded-md bg-blue-100 px-2.5 py-1 text-xs font-black font-mono text-blue-900 border border-blue-200">
                        {createdSuccessAccount.activationToken}
                      </code>
                      <button
                        type="button"
                        onClick={() => handleCopyText('created-code', createdSuccessAccount.activationToken || '')}
                        className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 cursor-pointer"
                        title="Sao chép mã"
                      >
                        {copiedKey === 'created-code' ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                  {(createdSuccessAccount as any).temporaryPassword && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Mật khẩu khởi tạo:</span>
                      <code className="rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-black font-mono text-emerald-900 border border-emerald-200">
                        {(createdSuccessAccount as any).temporaryPassword}
                      </code>
                    </div>
                  )}
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      const textToCopy = `THÔNG TIN TÀI KHOẢN GIÁO VIÊN CHỦ NHIỆM:\n- Họ và tên: ${createdSuccessAccount.fullName}\n- Email: ${createdSuccessAccount.email}\n- Mã đăng nhập: ${createdSuccessAccount.activationToken}\n- Mật khẩu: ${(createdSuccessAccount as any).temporaryPassword || '(Mật khẩu đã thiết lập khi tạo)'}\n- Lớp phụ trách: ${createdSuccessAccount.className || '10A1'}\n- Trường: ${createdSuccessAccount.schoolName}\n- Địa chỉ đăng nhập: Không gian Chủ Nhiệm Số`;
                      handleCopyText('full-account', textToCopy);
                    }}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-500 cursor-pointer shadow-md"
                  >
                    {copiedKey === 'full-account' ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copiedKey === 'full-account' ? 'Đã sao chép vào bộ nhớ tạm!' : 'Sao chép thông tin bàn giao cho GVCN'}
                  </button>
                  <button
                    onClick={() => {
                      setShowNewTeacherModal(false);
                      setCreatedSuccessAccount(null);
                    }}
                    className="w-full rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer"
                  >
                    Hoàn tất
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateTeacher} className="overflow-y-auto p-6 space-y-4 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Họ và tên Giáo viên chủ nhiệm *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Cô Lê Thị Thu Thảo"
                    value={newFullName}
                    onChange={e => setNewFullName(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50/50 p-2.5 text-xs font-bold text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1 flex items-center justify-between">
                    <span>Email đăng nhập / liên hệ *</span>
                    <span className="text-[10px] text-slate-400 font-normal">Chấp nhận mọi miền email hợp lệ</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="thuthao.le@thpt.edu.vn hoặc tengv@outlook.com"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50/50 p-2.5 text-xs font-medium text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Số điện thoại
                    </label>
                    <input
                      type="tel"
                      placeholder="0912 345 678"
                      value={newPhone}
                      onChange={e => setNewPhone(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50/50 p-2.5 text-xs font-medium text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Lớp khởi tạo ban đầu
                    </label>
                    <input
                      type="text"
                      placeholder="10A1"
                      value={newClassName}
                      onChange={e => setNewClassName(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50/50 p-2.5 text-xs font-medium text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1 flex items-center justify-between">
                    <span>Mã đăng nhập ban đầu (Tùy chọn)</span>
                    <span className="text-[10px] text-slate-400 font-normal">Để trống để tự sinh (VD: GV-2025-XXX)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Để trống để tự tạo hoặc nhập mã riêng..."
                    value={newInitialCode}
                    onChange={e => setNewInitialCode(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50/50 p-2.5 text-xs font-mono font-bold text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-hidden uppercase"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Tên Trường / Cơ sở Giáo dục *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="THPT Chuyên Lê Hồng Phong"
                    value={newSchool}
                    onChange={e => setNewSchool(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50/50 p-2.5 text-xs font-medium text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1 flex items-center justify-between">
                      <span>Mật khẩu khởi tạo *</span>
                      <span className="text-[10px] text-slate-400 font-normal">Tối thiểu 6 ký tự</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={e => {
                          setNewPassword(e.target.value);
                          if (passwordError) setPasswordError(null);
                        }}
                        className="w-full rounded-xl border border-slate-300 bg-slate-50/50 p-2.5 pr-9 text-xs font-medium text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                        title={showNewPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Xác nhận mật khẩu *
                    </label>
                    <div className="relative">
                      <input
                        type={showNewConfirmPassword ? 'text' : 'password'}
                        required
                        placeholder="••••••••"
                        value={newConfirmPassword}
                        onChange={e => {
                          setNewConfirmPassword(e.target.value);
                          if (passwordError) setPasswordError(null);
                        }}
                        className="w-full rounded-xl border border-slate-300 bg-slate-50/50 p-2.5 pr-9 text-xs font-medium text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewConfirmPassword(!showNewConfirmPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                        title={showNewConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      >
                        {showNewConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {passwordError && (
                  <div className="rounded-xl bg-rose-50 p-2.5 text-xs text-rose-700 font-bold border border-rose-200 flex items-center gap-1.5 animate-fade-in">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>{passwordError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Gói tài khoản & Quota
                  </label>
                  <select
                    value={newPlan}
                    onChange={e => setNewPlan(e.target.value as TenantPlan)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50/50 p-2.5 text-xs font-bold text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-hidden"
                  >
                    <option value="STANDARD">STANDARD (2 Lớp, 45 HS/lớp, 1GB Storage)</option>
                    <option value="PRO">PRO (5 Lớp, 50 HS/lớp, 2GB Storage, 500 AI Credits)</option>
                    <option value="ENTERPRISE">ENTERPRISE (Không giới hạn lớp, 10GB Storage)</option>
                  </select>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNewTeacherModal(false)}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingTeacher}
                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-black text-white hover:bg-blue-500 shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {isCreatingTeacher ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Tạo Workspace & Cấp Quyền
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL: RESET TEACHER PASSWORD */}
      {resetTeacherTarget && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="relative flex max-h-[92vh] w-full max-w-md flex-col rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white">
                  <KeyRound className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase">ĐẶT LẠI MẬT KHẨU GVCN</h3>
                  <p className="text-[11px] text-slate-500">Thiết lập mật khẩu đăng nhập mới cho giáo viên</p>
                </div>
              </div>
              <button
                onClick={() => setResetTeacherTarget(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmResetPassword} className="p-6 space-y-4 text-xs">
              <div className="rounded-2xl bg-indigo-50/60 p-4 border border-indigo-100 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Giáo viên:</span>
                  <span className="font-bold text-slate-900">{resetTeacherTarget.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Email đăng nhập:</span>
                  <span className="font-semibold text-slate-800">{resetTeacherTarget.email}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Mã đăng nhập:</span>
                  <code className="rounded-md bg-white px-2 py-0.5 text-xs font-mono font-bold text-indigo-900 border border-indigo-200">
                    {resetTeacherTarget.activationToken || 'ACT-ACTIVE'}
                  </code>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Lớp phân công:</span>
                  <span className="font-bold text-blue-700">{resetTeacherTarget.className || '10A1'}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-black text-slate-700 uppercase">
                  Phương thức cấp mật khẩu mới:
                </label>
                <div className="space-y-2">
                  <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100/70">
                    <input
                      type="radio"
                      name="resetMode"
                      checked={isAutoResetPassword}
                      onChange={() => setIsAutoResetPassword(true)}
                      className="mt-0.5 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="font-bold text-slate-900">Tự động sinh mật khẩu ngẫu nhiên an toàn</div>
                      <div className="text-[11px] text-slate-500">Hệ thống sẽ tạo mật khẩu ngẫu nhiên có độ bảo mật cao (VD: GV@8F3K9L!)</div>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100/70">
                    <input
                      type="radio"
                      name="resetMode"
                      checked={!isAutoResetPassword}
                      onChange={() => setIsAutoResetPassword(false)}
                      className="mt-0.5 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="font-bold text-slate-900">Chỉ định mật khẩu cụ thể</div>
                      <div className="text-[11px] text-slate-500">Nhập mật khẩu mới do bạn tự chọn (tối thiểu 6 ký tự)</div>
                    </div>
                  </label>
                </div>
              </div>

              {!isAutoResetPassword && (
                <div className="animate-fade-in">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Mật khẩu mới *
                  </label>
                  <input
                    type="text"
                    required={!isAutoResetPassword}
                    placeholder="Nhập mật khẩu mới (ít nhất 6 ký tự)..."
                    value={resetNewPassword}
                    onChange={e => setResetNewPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-bold text-slate-900 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              )}

              <div className="rounded-xl bg-amber-50 p-3 text-[11px] text-amber-800 border border-amber-200 leading-relaxed">
                <strong>Lưu ý:</strong> Mã đăng nhập, email, lớp học và toàn bộ dữ liệu của GVCN này sẽ được giữ nguyên vẹn. Các phiên đăng nhập hiện tại của giáo viên sẽ được làm mới để yêu cầu đăng nhập bằng mật khẩu mới.
              </div>

              {resetError && (
                <div className="rounded-xl bg-rose-50 p-2.5 text-xs text-rose-700 font-bold border border-rose-200 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{resetError}</span>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResetTeacherTarget(null)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReset}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-black text-white hover:bg-indigo-500 shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingReset ? <RefreshCw className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                  Xác nhận đặt lại
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RESET PASSWORD SUCCESS NOTIFICATION */}
      {resetSuccessModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="relative flex max-h-[92vh] w-full max-w-md flex-col rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-6 space-y-4 text-xs">
              <div className="text-center space-y-2">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h3 className="text-base font-black text-slate-900">ĐẶT LẠI MẬT KHẨU THÀNH CÔNG</h3>
                <p className="text-xs text-slate-500">Mật khẩu mới đã được cập nhật an toàn trong hệ thống</p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200 space-y-2.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Giáo viên:</span>
                  <span className="font-bold text-slate-900">{resetSuccessModal.teacher.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Email:</span>
                  <span className="font-bold text-slate-900">{resetSuccessModal.teacher.email}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Mã đăng nhập (Giữ nguyên):</span>
                  <code className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-mono font-bold text-blue-900 border border-blue-200">
                    {resetSuccessModal.activationToken || resetSuccessModal.teacher.activationToken}
                  </code>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                  <span className="text-slate-700 font-bold">Mật khẩu mới:</span>
                  <code className="rounded-lg bg-emerald-100 px-3 py-1 text-sm font-mono font-black text-emerald-900 border border-emerald-300">
                    {resetSuccessModal.temporaryPassword}
                  </code>
                </div>
              </div>

              <div className="rounded-xl bg-blue-50 p-3 text-[11px] text-blue-800 border border-blue-200 leading-relaxed">
                Hãy sao chép thông tin trên và gửi riêng cho GVCN qua kênh liên lạc an toàn.
              </div>

              <div className="space-y-2 pt-2">
                <button
                  onClick={() => {
                    const textToCopy = `THÔNG TIN TÀI KHOẢN GVCN:\n- Họ và tên: ${resetSuccessModal.teacher.fullName}\n- Email: ${resetSuccessModal.teacher.email}\n- Mã đăng nhập: ${resetSuccessModal.activationToken || resetSuccessModal.teacher.activationToken}\n- Mật khẩu mới: ${resetSuccessModal.temporaryPassword}\n- Lớp phụ trách: ${resetSuccessModal.teacher.className || '10A1'}\n- Trường: ${resetSuccessModal.teacher.schoolName}`;
                    handleCopyText('reset-handover', textToCopy);
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-500 cursor-pointer shadow-md"
                >
                  {copiedKey === 'reset-handover' ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copiedKey === 'reset-handover' ? 'Đã sao chép vào bộ nhớ tạm!' : 'Sao chép thông tin bàn giao'}
                </button>
                <button
                  onClick={() => setResetSuccessModal(null)}
                  className="w-full rounded-xl bg-slate-100 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200 cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DELETE TEACHER CONFIRMATION (DATA PRESERVATION) */}
      {deleteTeacherTarget && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="relative flex max-h-[92vh] w-full max-w-md flex-col rounded-3xl bg-white shadow-2xl overflow-hidden border border-rose-300">
            <div className="flex items-center justify-between border-b border-rose-200 bg-rose-50 px-6 py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-600 text-white">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-rose-900 uppercase">XÁC NHẬN XÓA TÀI KHOẢN GVCN</h3>
                  <p className="text-[11px] text-rose-700">Thu hồi quyền và tài khoản của giáo viên</p>
                </div>
              </div>
              <button
                onClick={() => setDeleteTeacherTarget(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-700 font-medium">
                Bạn đang thực hiện xóa tài khoản Giáo viên chủ nhiệm dưới đây:
              </p>

              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Họ và tên:</span>
                  <span className="font-bold text-slate-900">{deleteTeacherTarget.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Email đăng nhập:</span>
                  <span className="font-bold text-slate-900">{deleteTeacherTarget.email}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Mã đăng nhập:</span>
                  <code className="font-mono font-bold text-slate-800 bg-slate-200/70 px-1.5 py-0.5 rounded">
                    {deleteTeacherTarget.activationToken || 'ACT-ACTIVE'}
                  </code>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Vai trò hệ thống:</span>
                  <span className="font-black text-blue-700">Giáo viên chủ nhiệm (TEACHER)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Lớp phân công:</span>
                  <span className="font-bold text-slate-800">{deleteTeacherTarget.className || '10A1'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Trường:</span>
                  <span className="font-medium text-slate-800">{deleteTeacherTarget.schoolName}</span>
                </div>
              </div>

              <div className="rounded-2xl bg-emerald-50 p-4 border border-emerald-200 text-emerald-900 space-y-1">
                <div className="flex items-center gap-1.5 font-black text-xs text-emerald-800 uppercase">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  BẢO TOÀN DỮ LIỆU LỚP HỌC & HỌC SINH
                </div>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  Hệ thống chỉ xóa thông tin tài khoản đăng nhập của giáo viên này. Toàn bộ dữ liệu lớp học, hồ sơ học viên, thông tin phụ huynh, khảo sát và điểm rèn luyện sẽ được bảo toàn nguyên vẹn trên hệ thống.
                </p>
              </div>

              {deleteError && (
                <div className="rounded-xl bg-rose-50 p-2.5 text-xs text-rose-700 font-bold border border-rose-200 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{deleteError}</span>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteTeacherTarget(null)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteTeacher}
                  disabled={isSubmittingDelete}
                  className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-5 py-2 text-xs font-black text-white hover:bg-rose-500 shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingDelete ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Xác nhận xóa tài khoản
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: BREAK-GLASS SUPPORT ACCESS */}
      {showBreakGlassModal && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="relative flex max-h-[90vh] w-full max-w-md flex-col rounded-3xl bg-white shadow-2xl overflow-hidden border border-amber-300">
            <div className="flex items-center justify-between border-b border-amber-200 bg-amber-50 px-6 py-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-amber-600" />
                <h3 className="text-xs font-black text-amber-900 uppercase">XÁC NHẬN BREAK-GLASS SUPPORT ACCESS</h3>
              </div>
              <button
                onClick={() => setShowBreakGlassModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleActivateBreakGlass} className="p-6 space-y-4 text-xs">
              <p className="text-slate-600 leading-relaxed">
                Bạn đang yêu cầu quyền can thiệp hỗ trợ kỹ thuật vào dữ liệu của các không gian GVCN. Vui lòng nhập lý do cụ thể để lưu vết vào Audit Log hệ thống.
              </p>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Lý do truy cập hỗ trợ *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Ví dụ: Xử lý sự cố đồng bộ bảng điểm HK1 theo yêu cầu GVCN Mai Lan qua ticket #9021"
                  value={breakGlassReason}
                  onChange={e => setBreakGlassReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50/50 p-2.5 text-xs text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-hidden"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBreakGlassModal(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-600 px-5 py-2 text-xs font-black text-white hover:bg-amber-700 shadow-md cursor-pointer"
                >
                  Xác nhận Kích hoạt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Permanent Delete Workspace Modal */}
      <DeleteWorkspaceModal
        isOpen={Boolean(deleteWorkspaceTargetId)}
        tenantId={deleteWorkspaceTargetId}
        onClose={() => setDeleteWorkspaceTargetId(null)}
        onSuccess={async (msg) => {
          showToast(msg);
          await tenantService.fetchTeachersFromServer().catch(() => {});
          setTenants(tenantService.getTenants());
          setTeachers(tenantService.getTeacherAccounts());
          tenantService.getAdminStats().then(s => {
            if (s) setDbStats(s);
          });
        }}
      />
    </div>
  );
};
