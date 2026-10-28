/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Sparkles,
  HeartHandshake,
  ArrowRight,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Lock,
  Eye,
  EyeOff,
  PhoneCall,
  Mail,
  Clock,
  Building,
  UserCheck,
  MapPin,
  X,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { authService } from '../../services/AuthService';
import { migrationService } from '../../services/MigrationService';
import { GoogleAuthService } from '../../services/GoogleAuthService';
import { AdminContactInfo } from '../../types';

interface UserLoginScreenProps {
  onLoginSuccess: () => void;
  onNavigateAdminLogin?: () => void;
}

type UserRoleTab = 'TEACHER' | 'STUDENT' | 'PARENT';

export const UserLoginScreen: React.FC<UserLoginScreenProps> = ({
  onLoginSuccess,
  onNavigateAdminLogin
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRoleTab>('TEACHER');
  const [accessCode, setAccessCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Firebase Email/Password Login Toggle (for users who prefer direct email)
  const [useEmailLogin, setUseEmailLogin] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  // Google Login Dialog for GVCN
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleEmailInput, setGoogleEmailInput] = useState('');

  // Admin Contact Information State
  const [adminContact, setAdminContact] = useState<AdminContactInfo>(() => {
    return migrationService.getAdminContact() || {
      organizationName: 'Ban Quản trị Hệ thống Không Gian Chủ Nhiệm Số',
      contactPerson: 'Đoàn Thị Bình',
      email: 'binhdtsply@gmail.com',
      phone: '0973640124',
      address: 'Hà Nội, Việt Nam',
      workingHours: 'Thứ 2 - Thứ 6 (08:00 - 17:30)',
      notes: 'Liên hệ khi cần hỗ trợ cấp mới tài khoản GVCN hoặc khôi phục quyền truy cập.',
      updatedAt: new Date().toISOString(),
      updatedBy: 'SUPER_ADMIN'
    };
  });

  useEffect(() => {
    migrationService.fetchRemoteAdminContact().then(contact => {
      if (contact) setAdminContact(contact);
    });

    const unsub = migrationService.subscribe(() => {
      const contact = migrationService.getAdminContact();
      if (contact) setAdminContact(contact);
    });

    return () => unsub();
  }, []);

  const roleConfigs = [
    {
      id: 'TEACHER' as UserRoleTab,
      label: 'GVCN',
      badge: 'Giáo viên Chủ nhiệm',
      icon: GraduationCap,
      color: 'blue',
      bgActive: 'bg-blue-50/90 border-blue-600 text-blue-900 shadow-md shadow-blue-100',
      iconActive: 'bg-blue-600 text-white',
      btnBg: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-blue-200',
      badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
      description: 'Chủ nhiệm lớp: Quản lý học sinh, sổ điểm, rèn luyện nề nếp & kết nối phụ huynh.',
      defaultCode: 'ACT-ML-2025-LHP',
      demoCodes: [
        { code: 'ACT-ML-2025-LHP', desc: 'Cô Nguyễn Thị Mai Lan (Lớp 11A1 - THPT Chuyên Lê Hồng Phong)' },
        { code: 'ACT-HN-2025-NH', desc: 'Thầy Trần Hoàng Nam (Lớp 12A2 - THPT Chuyên Nguyễn Huệ)' }
      ]
    },
    {
      id: 'STUDENT' as UserRoleTab,
      label: 'Học sinh',
      badge: 'Học sinh & Cán sự lớp',
      icon: Sparkles,
      color: 'emerald',
      bgActive: 'bg-emerald-50/90 border-emerald-600 text-emerald-900 shadow-md shadow-emerald-100',
      iconActive: 'bg-emerald-600 text-white',
      btnBg: 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-emerald-200',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      description: 'Học sinh & Cán sự: Xem thời khóa biểu, báo bài, nộp minh chứng rèn luyện và kết quả học tập.',
      defaultCode: 'STU-11A1-01',
      demoCodes: [
        { code: 'STU-11A1-01', desc: 'Trần Gia Huy (Lớp trưởng 11A1 - Cán sự lớp)' },
        { code: 'STU-11A1-02', desc: 'Lê Phương Linh (Lớp phó học tập 11A1)' },
        { code: 'STU-11A1-03', desc: 'Phạm Minh Châu (Học sinh 11A1)' }
      ]
    },
    {
      id: 'PARENT' as UserRoleTab,
      label: 'Phụ huynh',
      badge: 'Cha mẹ học sinh',
      icon: HeartHandshake,
      color: 'rose',
      bgActive: 'bg-rose-50/90 border-rose-600 text-rose-900 shadow-md shadow-rose-100',
      iconActive: 'bg-rose-600 text-white',
      btnBg: 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-rose-200',
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
      description: 'Phụ huynh: Kênh trao đổi 1-1 bảo mật với GVCN, theo dõi chuyên cần và biểu đồ học tập của con em.',
      defaultCode: 'PAR-11A1-01',
      demoCodes: [
        { code: 'PAR-11A1-01', desc: 'Phụ huynh em Trần Gia Huy (11A1)' },
        { code: 'PAR-11A1-02', desc: 'Phụ huynh em Lê Phương Linh (11A1)' },
        { code: 'PAR-11A1-03', desc: 'Phụ huynh em Phạm Minh Châu (11A1)' }
      ]
    }
  ];

  const currentRoleConfig = roleConfigs.find((r) => r.id === selectedRole) || roleConfigs[0];

  const handleRoleChange = (newRole: UserRoleTab) => {
    setSelectedRole(newRole);
    setErrorMessage('');
    setPassword('');
    setAccessCode('');
  };

  /**
   * Execute Google Login with verified/inputted email
   */
  const executeGoogleLoginWithEmail = async (
    emailToUse: string,
    googleInfo?: { sub?: string; name?: string; avatarUrl?: string; accessToken?: string; idToken?: string }
  ) => {
    const cleanEmail = emailToUse.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Vui lòng nhập địa chỉ email Google hợp lệ.');
      return;
    }

    setErrorMessage('');
    setIsGoogleLoading(true);

    try {
      const targetSub = googleInfo?.sub || `google_sub_${cleanEmail.replace(/[^a-z0-9]/g, '_')}`;
      const targetName = googleInfo?.name;
      const targetAvatar = googleInfo?.avatarUrl;
      const targetToken = googleInfo?.accessToken || GoogleAuthService.getAccessToken() || undefined;

      const result = await authService.loginWithGoogleAsync(
        cleanEmail,
        targetSub,
        targetName,
        targetAvatar,
        targetToken,
        googleInfo?.idToken,
        selectedRole
      );

      setIsGoogleLoading(false);
      if (result.success) {
        setShowGoogleModal(false);
        onLoginSuccess();
      } else {
        setErrorMessage(result.message || 'Email Google này chưa được đăng ký trong hệ thống. Vui lòng liên hệ Quản trị viên.');
      }
    } catch (err: any) {
      setIsGoogleLoading(false);
      setErrorMessage(err?.message || 'Không thể đăng nhập bằng Google. Vui lòng thử lại.');
    }
  };

  /**
   * Initiates Google Login for Teacher (GVCN)
   */
  const handleTeacherGoogleLogin = async () => {
    setErrorMessage('');

    const hasCid = GoogleAuthService.hasClientId();
    if (hasCid) {
      setIsGoogleLoading(true);
      try {
        const googleInfo = await GoogleAuthService.connect();
        if (googleInfo?.email) {
          await executeGoogleLoginWithEmail(googleInfo.email, googleInfo);
          return;
        }
      } catch (authErr: any) {
        console.warn('[UserLoginScreen] Google connect popup error:', authErr);
        if (authErr?.message?.includes('popup_closed') || authErr?.type === 'popup_closed') {
          setIsGoogleLoading(false);
          setErrorMessage('Bạn đã đóng cửa sổ đăng nhập Google.');
          return;
        }
      }
      setIsGoogleLoading(false);
    }

    setGoogleEmailInput('');
    setShowGoogleModal(true);
  };

  /**
   * Standard Login by Access Code + Password (both mandatory)
   */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (useEmailLogin) {
      // Firebase Email + Password sign-in
      if (!userEmail.trim()) {
        setErrorMessage('Vui lòng nhập địa chỉ email đăng nhập.');
        return;
      }
      if (!password.trim()) {
        setErrorMessage('Vui lòng nhập mật khẩu.');
        return;
      }
      setIsLoading(true);
      try {
        const res = await authService.loginUserWithFirebaseAsync(userEmail.trim(), password.trim());
        setIsLoading(false);
        if (res.success) {
          onLoginSuccess();
        } else {
          setErrorMessage(res.message || 'Email hoặc mật khẩu không chính xác.');
        }
      } catch (err: any) {
        setIsLoading(false);
        setErrorMessage(err?.message || 'Lỗi khi đăng nhập bằng Email.');
      }
      return;
    }

    if (!accessCode.trim()) {
      setErrorMessage('Vui lòng nhập mã truy cập.');
      return;
    }

    if (!password.trim()) {
      setErrorMessage('Vui lòng nhập mật khẩu. Hình thức đăng nhập này bắt buộc cả Mã truy cập và Mật khẩu.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await authService.loginWithCodeAsync(accessCode.trim(), password.trim(), selectedRole);
      setIsLoading(false);
      if (result.success) {
        onLoginSuccess();
      } else {
        setErrorMessage(result.message || 'Mã truy cập hoặc mật khẩu không chính xác.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
    }
  };

  const handleAdminLinkClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onNavigateAdminLogin) {
      onNavigateAdminLogin();
    } else {
      if (typeof window !== 'undefined') {
        try {
          window.history.pushState({}, '', '/quan-tri');
        } catch {
          window.location.hash = 'quan-tri';
        }
      }
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-800 flex flex-col justify-between relative overflow-x-hidden selection:bg-blue-600 selection:text-white font-['Be_Vietnam_Pro',sans-serif]">
      {/* Soft Ambient Background Accents */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-200/40 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-indigo-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-emerald-100/40 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] opacity-35" />
      </div>

      {/* Main Container - 2 Column Layout */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex-1 flex items-center justify-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* LEFT COLUMN: System Branding, Highlights & Admin Contact */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
            <div className="space-y-6">
              {/* Brand Header */}
              <div className="flex items-center gap-3.5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/25 text-white font-black text-2xl">
                  K
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                    KHÔNG GIAN CHỦ NHIỆM SỐ
                    <span className="rounded-md bg-blue-100 border border-blue-200 text-blue-700 text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider">
                      Cổng Người Dùng
                    </span>
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium">
                    Hệ sinh thái Quản trị Lớp học & Không gian Giáo dục Toàn diện
                  </p>
                </div>
              </div>

              {/* Slogan & Educational Highlights */}
              <div className="rounded-3xl border border-slate-200/80 bg-white/80 backdrop-blur-md p-5 sm:p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-blue-700 font-bold text-xs uppercase tracking-wider">
                  <Sparkles className="h-4 w-4" />
                  <span>Khu vực Đăng nhập Lớp học</span>
                </div>
                <h2 className="text-base sm:text-lg font-black text-slate-800 leading-snug">
                  Đồng hành cùng Giáo viên Chủ nhiệm, Phụ huynh và Học sinh trong từng bước trưởng thành
                </h2>
                <div className="space-y-2.5 pt-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Dành cho <strong>GVCN</strong>, <strong>Học sinh</strong> và <strong>Phụ huynh</strong></span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Bảo mật dữ liệu riêng tư theo từng Không gian lớp học</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Đồng bộ tức thời qua nền tảng Firebase Authentication hiện tại</span>
                  </div>
                </div>
              </div>

              {/* ADMIN CONTACT BOX */}
              <div className="rounded-3xl border border-amber-200/90 bg-gradient-to-br from-amber-50/90 via-orange-50/50 to-amber-50/80 backdrop-blur-md p-5 sm:p-6 shadow-sm space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-900 font-black text-xs uppercase tracking-wider">
                    <Building className="h-4 w-4 text-amber-700" />
                    <span>HỖ TRỢ & CẤP TÀI KHOẢN GVCN</span>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100/90 border border-amber-300 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                    <PhoneCall className="h-3 w-3" /> Trực tuyến
                  </span>
                </div>

                <div className="space-y-2 text-xs text-slate-700">
                  <div>
                    <span className="font-bold text-slate-900 block">{adminContact?.organizationName || 'Ban Quản trị Không Gian Chủ Nhiệm Số'}</span>
                    {adminContact?.contactPerson && (
                      <span className="text-[11px] text-slate-600 block mt-0.5">
                        Người đại diện: <strong>{adminContact.contactPerson}</strong>
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-amber-200/60">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Hotline hỗ trợ:</span>
                      <a href={`tel:${adminContact?.phone || '0973640124'}`} className="font-bold text-amber-900 hover:text-amber-700">
                        {adminContact?.phone || '0973640124'}
                      </a>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Email tiếp nhận:</span>
                      <a href={`mailto:${adminContact?.email || 'binhdtsply@gmail.com'}`} className="font-medium text-blue-700 hover:underline truncate block text-[11px]">
                        {adminContact?.email || 'binhdtsply@gmail.com'}
                      </a>
                    </div>
                  </div>

                  {adminContact?.workingHours && (
                    <div className="flex items-start gap-2 text-slate-700 pt-1">
                      <Clock className="h-3.5 w-3.5 text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] text-slate-500 block">Thời gian trực:</span>
                        <span className="text-[11px] text-slate-800 font-medium">{adminContact.workingHours}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Action Contact Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <a
                    href={`tel:${adminContact?.phone || '0973640124'}`}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs py-2 px-3 transition-colors shadow-xs"
                  >
                    <PhoneCall className="h-3.5 w-3.5" />
                    Gọi Hotline
                  </a>
                  {adminContact?.phone && (
                    <a
                      href={`https://zalo.me/${adminContact.phone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 px-3 transition-colors shadow-xs"
                    >
                      <span className="font-black text-[11px]">Zalo</span>
                      Nhắn tin
                    </a>
                  )}
                  {adminContact?.email && (
                    <a
                      href={`mailto:${adminContact.email}`}
                      className="inline-flex items-center justify-center p-2 rounded-xl bg-white border border-amber-300 text-amber-800 hover:bg-amber-100 transition-colors"
                      title="Gửi Email Hỗ trợ"
                    >
                      <Mail className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: User Dedicated Login Card Panel */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            <div className="rounded-3xl border border-slate-200/90 bg-white shadow-xl shadow-slate-200/60 p-6 sm:p-8 space-y-6">
              
              {/* Card Title Header */}
              <div className="text-center space-y-2 border-b border-slate-100 pb-5">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1 text-xs font-bold">
                  <KeyRound className="h-3.5 w-3.5 text-blue-600" />
                  Cổng Đăng Nhập /app
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Không Gian Lớp Học
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                  Chọn đúng vai trò tương ứng để truy cập không gian lớp học của bạn.
                </p>
              </div>

              {/* 3 User Role Selector Buttons (NO ADMIN TAB) */}
              <div className="grid grid-cols-3 gap-2.5">
                {roleConfigs.map((r) => {
                  const Icon = r.icon;
                  const isSelected = selectedRole === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => handleRoleChange(r.id)}
                      className={`p-3 rounded-2xl text-center transition-all cursor-pointer flex flex-col items-center gap-2 relative ${
                        isSelected
                          ? `${r.bgActive} border-2`
                          : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300'
                      }`}
                    >
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-xl transition-transform ${
                          isSelected ? `${r.iconActive} scale-105 shadow-sm` : 'bg-slate-200/80 text-slate-600'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className={`text-xs font-bold ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>
                          {r.label}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[90px]">
                          {r.badge}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Role Scope Notice */}
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3.5 flex items-start gap-3 text-xs text-slate-600">
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${currentRoleConfig.iconActive}`}>
                  <currentRoleConfig.icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-bold text-slate-800 text-xs mb-0.5">
                    Quyền hạn: {currentRoleConfig.badge}
                  </div>
                  <p className="text-slate-500 leading-relaxed text-[11px]">
                    {currentRoleConfig.description}
                  </p>
                </div>
              </div>

              {/* Error Feedback Message */}
              {errorMessage && (
                <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3.5 flex items-start gap-3 text-xs text-rose-800 animate-shake shadow-xs">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1 font-medium leading-relaxed">{errorMessage}</div>
                  <button
                    type="button"
                    onClick={() => setErrorMessage('')}
                    className="text-rose-400 hover:text-rose-600 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* LOGIN FORM */}
              <form onSubmit={handleLogin} className="space-y-4">
                
                {useEmailLogin ? (
                  /* Form mode: Direct Email + Password */
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Địa chỉ Email đăng nhập <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="email"
                        value={userEmail}
                        onChange={(e) => {
                          setUserEmail(e.target.value);
                          if (errorMessage) setErrorMessage('');
                        }}
                        placeholder="Nhập email của bạn (VD: tengv@school.edu.vn)..."
                        className="w-full rounded-2xl border border-slate-300 bg-white pl-10 pr-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all font-medium"
                        required
                      />
                    </div>
                  </div>
                ) : (
                  /* Form mode: Access Code / Identifier */
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Mã truy cập / Email đăng nhập <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={accessCode}
                        onChange={(e) => {
                          setAccessCode(e.target.value);
                          if (errorMessage) setErrorMessage('');
                        }}
                        placeholder={
                          selectedRole === 'TEACHER'
                            ? 'Nhập mã GVCN (VD: GV-2026-XXXXX hoặc ACT-...) hoặc email...'
                            : `Nhập mã ${currentRoleConfig.label} (VD: STU-..., PAR-...)...`
                        }
                        className="w-full rounded-2xl border border-slate-300 bg-white pl-10 pr-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all font-medium"
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Password Input */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Mật khẩu <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setUseEmailLogin(!useEmailLogin)}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                    >
                      {useEmailLogin ? 'Đăng nhập bằng Mã truy cập' : 'Đăng nhập bằng Email'}
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errorMessage) setErrorMessage('');
                      }}
                      placeholder="Nhập mật khẩu của bạn..."
                      required
                      className="w-full rounded-2xl border border-slate-300 bg-white pl-10 pr-10 py-3 text-sm text-slate-900 placeholder-slate-400 outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit Login Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full rounded-2xl py-3.5 text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md ${currentRoleConfig.btnBg} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isLoading ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Đang xác thực thông tin...</span>
                    </>
                  ) : (
                    <>
                      <span>ĐĂNG NHẬP {currentRoleConfig.badge.toUpperCase()}</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                {/* Google OAuth Option for GVCN */}
                {selectedRole === 'TEACHER' && (
                  <>
                    <div className="relative flex py-1 items-center">
                      <div className="flex-grow border-t border-slate-200" />
                      <span className="flex-shrink mx-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                        HOẶC
                      </span>
                      <div className="flex-grow border-t border-slate-200" />
                    </div>

                    <button
                      type="button"
                      onClick={handleTeacherGoogleLogin}
                      disabled={isGoogleLoading}
                      className="w-full rounded-2xl py-3 px-4 bg-white hover:bg-slate-50 text-slate-700 text-sm font-bold shadow-xs hover:shadow border border-slate-300 transition-all cursor-pointer flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isGoogleLoading ? (
                        <>
                          <div className="h-4 w-4 border-2 border-slate-700/30 border-t-slate-700 rounded-full animate-spin" />
                          <span>Đang kết nối Google...</span>
                        </>
                      ) : (
                        <>
                          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                            <path
                              fill="#4285F4"
                              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                              fill="#34A853"
                              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                              fill="#FBBC05"
                              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                            />
                            <path
                              fill="#EA4335"
                              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                            />
                          </svg>
                          <span>Đăng nhập nhanh bằng tài khoản Google</span>
                        </>
                      )}
                    </button>
                  </>
                )}
              </form>

              {/* Sample/Demo Accounts Reference */}
              {currentRoleConfig.demoCodes && currentRoleConfig.demoCodes.length > 0 && (
                <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Mẫu tài khoản thử nghiệm ({currentRoleConfig.label}):
                    </span>
                    <span className="text-[10px] text-slate-400">Nhấp để điền nhanh</span>
                  </div>
                  <div className="space-y-1.5">
                    {currentRoleConfig.demoCodes.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setAccessCode(item.code);
                          setErrorMessage('');
                        }}
                        className="w-full text-left p-2 rounded-xl bg-white hover:bg-blue-50/80 border border-slate-200 hover:border-blue-200 transition-all flex items-center justify-between text-xs cursor-pointer group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <code className="px-1.5 py-0.5 rounded-md bg-slate-100 group-hover:bg-blue-100 font-mono font-bold text-blue-700 text-[11px]">
                            {item.code}
                          </code>
                          <span className="text-slate-600 truncate text-[11px] font-medium">{item.desc}</span>
                        </div>
                        <span className="text-[10px] text-blue-600 font-bold shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          Chọn
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>
      </main>

      {/* FOOTER */}
      <footer className="relative z-10 w-full border-t border-slate-200/80 bg-white/80 backdrop-blur-md py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            © {new Date().getFullYear()} Không Gian Chủ Nhiệm Số. Bản quyền thuộc về Ban Quản trị Nền tảng.
          </div>
          <div className="flex items-center gap-4 text-slate-500 text-xs">
            <span>Cổng Người Dùng (/app)</span>
          </div>
        </div>
      </footer>

      {/* Google Email Verification Modal for GVCN */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 font-bold">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Xác thực Google GVCN</h3>
                  <p className="text-[11px] text-slate-500">Đăng nhập tài khoản GVCN qua Google Email</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGoogleModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Địa chỉ Email Google của GVCN <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={googleEmailInput}
                  onChange={(e) => setGoogleEmailInput(e.target.value)}
                  placeholder="VD: mailan.nguyen@lehongphong.edu.vn"
                  className="w-full rounded-xl border border-slate-300 p-3 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
                  autoFocus
                />
              </div>

              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-[11px] text-slate-600 leading-relaxed">
                Tài khoản Google phải là email đã được Ban Quản trị cấp quyền cho Giáo viên chủ nhiệm.
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGoogleModal(false)}
                  className="flex-1 rounded-xl border border-slate-300 bg-white py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={() => executeGoogleLoginWithEmail(googleEmailInput)}
                  className="flex-1 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-700 shadow-md cursor-pointer"
                >
                  Xác nhận đăng nhập
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
