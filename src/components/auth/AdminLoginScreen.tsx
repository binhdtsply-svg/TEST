/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  ArrowRight,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  ArrowLeft,
  X,
  Mail,
  RefreshCw,
  HelpCircle,
  AlertTriangle
} from 'lucide-react';
import { authService } from '../../services/AuthService';
import { GoogleAuthService } from '../../services/GoogleAuthService';

interface AdminLoginScreenProps {
  onLoginSuccess: () => void;
  onNavigateUserLogin?: () => void;
}

const SUPER_ADMIN_EMAIL = 'binhdtsply@gmail.com';

export const AdminLoginScreen: React.FC<AdminLoginScreenProps> = ({
  onLoginSuccess,
  onNavigateUserLogin
}) => {
  // Primary Login State
  const [adminIdentifier, setAdminIdentifier] = useState('admin');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [showRecoveryCode, setShowRecoveryCode] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [adminRememberDevice, setAdminRememberDevice] = useState(true);
  const [isAdminLoading, setIsAdminLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Error and Access Denied State
  const [errorMessage, setErrorMessage] = useState('');
  const [isNonAdminRejected, setIsNonAdminRejected] = useState(false);
  const [rejectedDetails, setRejectedDetails] = useState('');

  // Recovery & First-Time Setup Modal State
  const [showAdminForgotModal, setShowAdminForgotModal] = useState(false);
  const [adminRecoveryTab, setAdminRecoveryTab] = useState<'SETUP_PASSWORD' | 'RECOVERY_CODE' | 'EMAIL'>('RECOVERY_CODE');

  // First-Time Setup & Recovery Code Form State
  const [rcIdentifier, setRcIdentifier] = useState('admin');
  const [rcCode, setRcCode] = useState('');
  const [rcNewPassword, setRcNewPassword] = useState('');
  const [rcConfirmPassword, setRcConfirmPassword] = useState('');
  const [rcShowPassword, setRcShowPassword] = useState(false);
  const [rcStep, setRcStep] = useState<1 | 2>(1);
  const [isRcLoading, setIsRcLoading] = useState(false);

  // Persistent Setup Status from Server
  const [isFirstTimeSetupRequired, setIsFirstTimeSetupRequired] = useState(false);
  const [isStatusChecked, setIsStatusChecked] = useState(false);

  React.useEffect(() => {
    let active = true;
    authService.checkAdminAccountStatus('admin').then(status => {
      if (active) {
        if (status && status.success && status.firstTimeSetupRequired === true && status.exists === true) {
          setIsFirstTimeSetupRequired(true);
          setAdminRecoveryTab('SETUP_PASSWORD');
        } else {
          // If status check is unavailable or fails, NEVER falsely force first-time setup
          setIsFirstTimeSetupRequired(false);
          setAdminRecoveryTab('RECOVERY_CODE');
        }
        setIsStatusChecked(true);
      }
    }).catch(() => {
      if (active) {
        setIsFirstTimeSetupRequired(false);
        setAdminRecoveryTab('RECOVERY_CODE');
        setIsStatusChecked(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // Email Reset Form State
  const [forgotEmail, setForgotEmail] = useState(SUPER_ADMIN_EMAIL);
  const [emailStep, setEmailStep] = useState<1 | 2>(1);
  const [emailToken, setEmailToken] = useState('');
  const [emailNewPassword, setEmailNewPassword] = useState('');
  const [emailConfirmPassword, setEmailConfirmPassword] = useState('');
  const [emailShowPassword, setEmailShowPassword] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [isForgotLoading, setIsForgotLoading] = useState(false);

  /**
   * Dedicated Super Admin Password & Firebase Login Handler
   */
  const handleSuperAdminPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsNonAdminRejected(false);
    setRejectedDetails('');

    const cleanRecovery = recoveryCode.trim();
    const cleanPass = adminPassword.trim();

    if (!cleanRecovery) {
      setErrorMessage('Vui lòng nhập Mã Recovery Code hiện hành.');
      return;
    }

    if (!cleanPass) {
      setErrorMessage('Vui lòng nhập Mật khẩu Admin.');
      return;
    }

    setIsAdminLoading(true);

    try {
      // Standard Server Authentication for Admin (Recovery Code + Admin Password)
      const result = await authService.loginSuperAdminWithPasswordAsync(
        'admin',
        cleanPass,
        cleanRecovery,
        adminRememberDevice
      );

      setIsAdminLoading(false);

      if (result.success) {
        onLoginSuccess();
      } else {
        if (result.errorCode === 'FORBIDDEN_NOT_ADMIN') {
          setIsNonAdminRejected(true);
          setRejectedDetails(result.message || 'Tài khoản của bạn không có quyền Quản trị viên hệ thống.');
        } else {
          setErrorMessage(result.message || 'Mật khẩu hoặc Recovery Code Quản trị viên không chính xác. Vui lòng kiểm tra lại.');
        }
      }
    } catch (err: any) {
      setIsAdminLoading(false);
      setErrorMessage(err?.message || 'Lỗi kết nối khi xác thực Quản trị viên.');
    }
  };

  /**
   * Official Google OAuth for Super Admin (Strict allowlist - NO BYPASS)
   */
  const handleGoogleAdminLogin = async () => {
    setErrorMessage('');
    setIsNonAdminRejected(false);
    setRejectedDetails('');
    setIsGoogleLoading(true);

    try {
      const hasCid = GoogleAuthService.hasClientId();
      if (!hasCid) {
        setIsGoogleLoading(false);
        setErrorMessage('Hệ thống chưa cấu hình Google OAuth Client ID cho Quản trị viên. Vui lòng đăng nhập bằng Mật khẩu Super Admin.');
        return;
      }

      let googleInfo: any = null;
      try {
        googleInfo = await GoogleAuthService.connect();
      } catch (authErr: any) {
        console.warn('[AdminLoginScreen] Google connect popup error:', authErr);
        setIsGoogleLoading(false);
        if (authErr?.message?.includes('popup_closed') || authErr?.type === 'popup_closed') {
          setErrorMessage('Bạn đã đóng cửa sổ đăng nhập Google.');
        } else {
          setErrorMessage('Lỗi kết nối xác thực Google OAuth. Vui lòng đăng nhập bằng Mật khẩu Admin.');
        }
        return;
      }

      if (!googleInfo || !googleInfo.email) {
        setIsGoogleLoading(false);
        setErrorMessage('Không nhận được thông tin xác thực tài khoản Google. Vui lòng thử lại.');
        return;
      }

      const targetEmail = googleInfo.email.toLowerCase().trim();

      // Rule: Chỉ chấp nhận Google identity đã liên kết với Admin. Không cho Gmail bất kỳ vào Admin.
      if (targetEmail !== SUPER_ADMIN_EMAIL.toLowerCase().trim()) {
        setIsGoogleLoading(false);
        setIsNonAdminRejected(true);
        setRejectedDetails(`Tài khoản Google (${targetEmail}) không có quyền Quản trị viên hệ thống. Vui lòng sử dụng Cổng Người Dùng.`);
        return;
      }

      const targetSub = googleInfo.sub || 'usr_sa_google_official';
      const targetName = googleInfo.name || 'Ban Quản trị Hệ thống';
      const targetAvatar = googleInfo.avatarUrl || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80';
      const targetToken = googleInfo.accessToken || GoogleAuthService.getAccessToken() || undefined;

      const result = await authService.loginWithGoogleAsync(
        targetEmail,
        targetSub,
        targetName,
        targetAvatar,
        targetToken,
        undefined,
        'ADMIN'
      );

      setIsGoogleLoading(false);

      if (result.success) {
        onLoginSuccess();
      } else {
        if (result.errorCode === 'ROLE_MISMATCH' || result.errorCode === 'FORBIDDEN_NOT_ADMIN') {
          setIsNonAdminRejected(true);
          setRejectedDetails(result.message || 'Email Google này không thuộc danh sách Quản trị viên Nền tảng.');
        } else {
          setErrorMessage(result.message || 'Tài khoản Google này chưa được cấp quyền quản trị.');
        }
      }
    } catch (err: any) {
      setIsGoogleLoading(false);
      setErrorMessage(err?.message || 'Không thể đăng nhập bằng Google. Vui lòng thử lại.');
    }
  };

  /**
   * Super Admin First-Time Password Setup Handler
   */
  const handleSetupFirstTimePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');

    const cleanId = rcIdentifier.trim() || adminIdentifier.trim() || 'admin';
    const cleanCode = rcCode.trim().toUpperCase();
    const cleanPass = rcNewPassword.trim();
    const cleanConfirm = rcConfirmPassword.trim();

    if (!cleanId) {
      setForgotError('Vui lòng nhập Tên đăng nhập hoặc Email Quản trị viên.');
      return;
    }

    if (!cleanCode) {
      setForgotError('Vui lòng nhập Mã xác thực khởi tạo (Recovery Code).');
      return;
    }

    if (!cleanPass || cleanPass.length < 6) {
      setForgotError('Mật khẩu mới phải có tối thiểu 6 ký tự.');
      return;
    }

    if (cleanPass !== cleanConfirm) {
      setForgotError('Mật khẩu xác nhận không khớp với mật khẩu mới.');
      return;
    }

    setIsRcLoading(true);

    try {
      const res = await authService.setupFirstTimeAdminPasswordAsync(cleanId, cleanPass, cleanCode);
      setIsRcLoading(false);

      if (res.success) {
        setIsFirstTimeSetupRequired(false);
        setForgotSuccess(res.message || 'Thiết lập mật khẩu Quản trị viên thành công! Đang tự động đăng nhập...');
        setAdminIdentifier(cleanId);
        setAdminPassword(cleanPass);
        setRecoveryCode(cleanCode);
        setTimeout(async () => {
          const loginRes = await authService.loginSuperAdminWithPasswordAsync(cleanId, cleanPass, cleanCode, adminRememberDevice);
          if (loginRes.success) {
            setShowAdminForgotModal(false);
            onLoginSuccess();
          }
        }, 1200);
      } else {
        setForgotError(res.message || 'Không thể thiết lập mật khẩu Quản trị viên.');
      }
    } catch (err: any) {
      setIsRcLoading(false);
      setForgotError(err?.message || 'Lỗi kết nối máy chủ khi thiết lập mật khẩu.');
    }
  };

  /**
   * Step 1: Verify Recovery Code before allowing new password creation
   */
  const handleVerifyRecoveryCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');

    const cleanId = rcIdentifier.trim();
    const cleanCode = rcCode.trim();

    if (!cleanId) {
      setForgotError('Vui lòng nhập Tên đăng nhập hoặc Email Quản trị viên.');
      return;
    }

    if (!cleanCode) {
      setForgotError('Vui lòng nhập Mã Recovery Code hiện hành.');
      return;
    }

    setIsRcLoading(true);

    try {
      const res = await authService.verifyAdminRecoveryCodeAsync(cleanId, cleanCode);
      setIsRcLoading(false);

      if (res.success) {
        setForgotError('');
        setForgotSuccess('Xác minh Recovery Code thành công! Vui lòng thiết lập mật khẩu Admin mới.');
        setRcStep(2);
      } else {
        setForgotError(res.message || 'Mã Recovery Code không chính xác. Vui lòng kiểm tra lại.');
      }
    } catch (err: any) {
      setIsRcLoading(false);
      setForgotError(err?.message || 'Lỗi kết nối máy chủ khi xác minh Recovery Code.');
    }
  };

  /**
   * Step 2: Set new Admin password after successful Recovery Code verification
   */
  const handleResetWithVerifiedRecoveryCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');

    const cleanId = rcIdentifier.trim();
    const cleanCode = rcCode.trim();
    const cleanPass = rcNewPassword.trim();
    const cleanConfirm = rcConfirmPassword.trim();

    if (!cleanPass || cleanPass.length < 6) {
      setForgotError('Mật khẩu mới phải có tối thiểu 6 ký tự.');
      return;
    }

    if (cleanPass !== cleanConfirm) {
      setForgotError('Mật khẩu xác nhận không khớp với mật khẩu mới.');
      return;
    }

    setIsRcLoading(true);

    try {
      const res = await authService.recoverAdminPasswordAsync(cleanId, cleanCode, cleanPass, cleanConfirm);
      setIsRcLoading(false);

      if (res.success) {
        setForgotSuccess(res.message || 'Đặt lại mật khẩu thành công! Đang tự động đăng nhập...');
        setAdminIdentifier(cleanId);
        setAdminPassword(cleanPass);
        setRecoveryCode(cleanCode);
        setTimeout(async () => {
          const loginRes = await authService.loginSuperAdminWithPasswordAsync(cleanId, cleanPass, cleanCode, adminRememberDevice);
          if (loginRes.success) {
            setShowAdminForgotModal(false);
            onLoginSuccess();
          }
        }, 1200);
      } else {
        setForgotError(res.message || 'Không thể đặt lại mật khẩu.');
      }
    } catch (err: any) {
      setIsRcLoading(false);
      setForgotError(err?.message || 'Lỗi kết nối máy chủ khi đặt lại mật khẩu.');
    }
  };

  /**
   * Request Password Reset Code via Real SMTP Email
   */
  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');

    const targetEmail = forgotEmail.trim().toLowerCase();
    if (!targetEmail || !targetEmail.includes('@')) {
      setForgotError('Vui lòng nhập email Quản trị viên hợp lệ.');
      return;
    }

    setIsForgotLoading(true);

    try {
      const res = await authService.requestAdminPasswordResetAsync(targetEmail);
      setIsForgotLoading(false);

      if (res.success) {
        setForgotSuccess(res.message || `Mã xác thực 6 chữ số đã được gửi đến ${res.maskedEmail || targetEmail}.`);
        setEmailStep(2);
      } else {
        setForgotError(res.message || 'Không thể gửi email xác thực. Vui lòng kiểm tra lại địa chỉ email.');
      }
    } catch (err: any) {
      setIsForgotLoading(false);
      setForgotError(err?.message || 'Lỗi khi yêu cầu mã xác thực qua Email.');
    }
  };

  /**
   * Submit Reset Password with 6-Digit Email Code
   */
  const handleResetPasswordWithEmailToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');

    const cleanId = forgotEmail.trim();
    const cleanToken = emailToken.trim();
    const cleanPass = emailNewPassword.trim();
    const cleanConfirm = emailConfirmPassword.trim();

    if (!cleanToken) {
      setForgotError('Vui lòng nhập Mã xác thực 6 chữ số đã nhận trong email.');
      return;
    }

    if (!cleanPass || cleanPass.length < 6) {
      setForgotError('Mật khẩu mới phải có tối thiểu 6 ký tự.');
      return;
    }

    if (cleanPass !== cleanConfirm) {
      setForgotError('Mật khẩu xác nhận không khớp với mật khẩu mới.');
      return;
    }

    setIsForgotLoading(true);

    try {
      const res = await authService.resetAdminPasswordAsync(cleanId, cleanToken, cleanPass);
      setIsForgotLoading(false);

      if (res.success) {
        setForgotSuccess(res.message || 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập với mật khẩu mới.');
        setAdminIdentifier(cleanId);
        setAdminPassword(cleanPass);
      } else {
        setForgotError(res.message || 'Mã xác thực không hợp lệ hoặc đã hết hạn.');
      }
    } catch (err: any) {
      setIsForgotLoading(false);
      setForgotError(err?.message || 'Lỗi khi đặt lại mật khẩu.');
    }
  };

  const handleReturnToUserLogin = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onNavigateUserLogin) {
      onNavigateUserLogin();
    } else {
      if (typeof window !== 'undefined') {
        try {
          window.history.pushState({}, '', '/app');
        } catch {
          window.location.hash = 'app';
        }
      }
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-x-hidden selection:bg-amber-500 selection:text-slate-950 font-['Be_Vietnam_Pro',sans-serif]">
      {/* High-Security Dark Background Grid */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:28px_28px] opacity-25" />
      </div>

      {/* Main Administrative Container */}
      <main className="relative z-10 w-full max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-16 flex-1 flex flex-col items-center justify-center">
        
        {/* Top Return Link */}
        <div className="w-full max-w-lg mb-6 flex items-center justify-between">
          <a
            href="/app"
            onClick={handleReturnToUserLogin}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors bg-slate-900/80 hover:bg-slate-800 px-3.5 py-2 rounded-xl border border-slate-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Cổng Đăng Nhập Người Dùng (/app)</span>
          </a>
          <span className="text-[11px] font-mono text-amber-500/80 uppercase tracking-widest flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            Admin Auth Gateway
          </span>
        </div>

        {/* Central Dedicated Admin Card */}
        <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900/90 backdrop-blur-xl shadow-2xl shadow-black/80 p-7 sm:p-9 space-y-6">
          
          {/* Header & Crest */}
          <div className="text-center space-y-3 border-b border-slate-800 pb-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 font-black shadow-lg shadow-amber-500/20">
              <ShieldAlert className="h-7 w-7 text-slate-950" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 px-3 py-1 text-[11px] font-bold uppercase tracking-wider mb-2">
                <Lock className="h-3 w-3" />
                CỔNG BẢO MẬT QUẢN TRỊ VIÊN /quan-tri
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Xác Thực Super Admin
              </h1>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                Khu vực quản trị cấp cao dành riêng cho Ban Quản trị Nền tảng Không Gian Chủ Nhiệm Số.
              </p>
            </div>
          </div>

          {/* NON-ADMIN STRICT REJECTION BANNER */}
          {isNonAdminRejected && (
            <div className="rounded-2xl bg-rose-950/80 border-2 border-rose-500 p-4 space-y-3 animate-shake">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-xs font-black text-rose-200 uppercase tracking-wide">
                    TỪ CHỐI QUYỀN ADMIN (ACCESS DENIED)
                  </h3>
                  <p className="text-xs text-rose-300 mt-1 leading-relaxed">
                    {rejectedDetails || 'Tài khoản của bạn đã được xác thực nhưng KHÔNG CÓ QUYỀN Quản trị viên hệ thống (Admin = false).'}
                  </p>
                  <p className="text-[11px] text-rose-400 mt-1.5">
                    Các tài khoản Giáo viên chủ nhiệm, Học sinh và Phụ huynh vui lòng đăng nhập qua Cổng Người Dùng.
                  </p>
                </div>
              </div>
              <div className="pt-1">
                <a
                  href="/app"
                  onClick={handleReturnToUserLogin}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs py-2.5 px-4 shadow-md transition-colors"
                >
                  <span>Chuyển sang Cổng Người Dùng (/app)</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          )}

          {/* Standard Error Feedback Message */}
          {errorMessage && !isNonAdminRejected && (
            <div className="rounded-2xl bg-rose-900/40 border border-rose-700/60 p-3.5 flex items-start gap-3 text-xs text-rose-300 animate-shake">
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{errorMessage}</div>
              <button
                type="button"
                onClick={() => setErrorMessage('')}
                className="text-rose-400 hover:text-rose-200 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Super Admin Password Login Form */}
          <form onSubmit={handleSuperAdminPasswordLogin} className="space-y-4">
            
            {/* ADMIN IDENTIFIER INPUT */}
            {/* FIELD 1: RECOVERY CODE */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Mã Recovery Code hiện hành <span className="text-amber-500">*</span>
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type={showRecoveryCode ? 'text' : 'password'}
                  value={recoveryCode}
                  onChange={(e) => {
                    setRecoveryCode(e.target.value);
                    if (errorMessage) setErrorMessage('');
                    if (isNonAdminRejected) setIsNonAdminRejected(false);
                  }}
                  placeholder="Nhập mã Recovery Code hiện hành..."
                  className="w-full rounded-2xl border border-slate-700 bg-slate-800/80 pl-10 pr-10 py-3 text-sm text-white placeholder-slate-500 outline-hidden focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowRecoveryCode(!showRecoveryCode)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                  title={showRecoveryCode ? 'Ẩn mã Recovery Code' : 'Hiện mã Recovery Code'}
                >
                  {showRecoveryCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* FIELD 2: ADMIN PASSWORD */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Mật khẩu Admin <span className="text-amber-500">*</span>
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(SUPER_ADMIN_EMAIL);
                      setRcIdentifier('admin');
                      setRcCode('');
                      setRcNewPassword('');
                      setRcConfirmPassword('');
                      setRcStep(1);
                      setAdminRecoveryTab('RECOVERY_CODE');
                      setForgotError('');
                      setForgotSuccess('');
                      setShowAdminForgotModal(true);
                    }}
                    className="text-xs font-bold text-slate-400 hover:text-slate-200 hover:underline cursor-pointer"
                  >
                    Quên mật khẩu?
                  </button>
                </div>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type={showAdminPassword ? 'text' : 'password'}
                  value={adminPassword}
                  onChange={(e) => {
                    setAdminPassword(e.target.value);
                    if (errorMessage) setErrorMessage('');
                    if (isNonAdminRejected) setIsNonAdminRejected(false);
                  }}
                  placeholder="Nhập mật khẩu Admin..."
                  required
                  className="w-full rounded-2xl border border-slate-700 bg-slate-800/80 pl-10 pr-10 py-3 text-sm text-white placeholder-slate-500 outline-hidden focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowAdminPassword(!showAdminPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                  title={showAdminPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showAdminPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* REMEMBER DEVICE CHECKBOX */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-400 hover:text-slate-200">
                <input
                  type="checkbox"
                  checked={adminRememberDevice}
                  onChange={(e) => setAdminRememberDevice(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-amber-500 h-4 w-4"
                />
                <span className="font-medium">Ghi nhớ thiết bị Quản trị (duy trì phiên an toàn)</span>
              </label>
            </div>

            {/* Primary Submit Button */}
            <button
              type="submit"
              disabled={isAdminLoading || !recoveryCode.trim() || !adminPassword.trim()}
              className="w-full rounded-2xl py-3.5 text-sm font-black text-slate-950 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg bg-amber-500 hover:bg-amber-400 active:bg-amber-600 shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAdminLoading ? (
                <>
                  <div className="h-4 w-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                  <span>Đang xác thực quyền Admin...</span>
                </>
              ) : (
                <>
                  <span>XÁC THỰC QUẢN TRỊ VIÊN HỆ THỐNG</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            {/* OR Divider */}
            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-800" />
              <span className="flex-shrink mx-4 text-xs font-bold text-slate-600 uppercase tracking-widest">
                HOẶC
              </span>
              <div className="flex-grow border-t border-slate-800" />
            </div>

            {/* Google OAuth Login for Super Admin */}
            <button
              type="button"
              onClick={handleGoogleAdminLogin}
              disabled={isGoogleLoading}
              className="w-full rounded-2xl py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-bold border border-slate-700 transition-all cursor-pointer flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
            >
              {isGoogleLoading ? (
                <>
                  <div className="h-4 w-4 border-2 border-slate-400/30 border-t-slate-400 rounded-full animate-spin" />
                  <span>Đang kết nối Google Admin...</span>
                </>
              ) : (
                <>
                  <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
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
                  <span>Đăng nhập bằng Google Admin ({SUPER_ADMIN_EMAIL})</span>
                </>
              )}
            </button>
          </form>

          {/* Security Notice Box */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-1.5 text-xs text-slate-400">
            <div className="flex items-center gap-2 text-amber-400 font-bold">
              <ShieldCheck className="h-4 w-4" />
              <span>Chính sách Kiểm soát Quyền Admin</span>
            </div>
            <p className="leading-relaxed text-[11px]">
              Tài khoản Admin được quản trị và kiểm soát độc quyền tại tầng bảo mật máy chủ & Firebase Authentication. Mọi hành vi đăng nhập trái phép đều bị ghi lại trong Nhật ký Kiểm toán (Audit Logs).
            </p>
          </div>

        </div>

      </main>

      {/* FOOTER */}
      <footer className="relative z-10 w-full border-t border-slate-800/80 bg-slate-950 py-4 text-center text-xs text-slate-500">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            © {new Date().getFullYear()} Không Gian Chủ Nhiệm Số. Cổng Quản Trị Hệ Thống.
          </div>
          <div className="flex items-center gap-4 text-slate-400 text-xs">
            <a
              href="/app"
              onClick={handleReturnToUserLogin}
              className="text-slate-300 hover:text-white font-bold"
            >
              ← Cổng Người Dùng /app
            </a>
          </div>
        </div>
      </footer>

      {/* SUPER ADMIN RECOVERY & SETUP MODAL */}
      {showAdminForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-7 shadow-2xl text-slate-100 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 font-bold">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase">KHÔI PHỤC & THIẾT LẬP MẬT KHẨU ADMIN</h3>
                  <p className="text-[11px] text-slate-400">Chọn phương thức phù hợp với tình trạng tài khoản</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAdminForgotModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className={`grid ${isFirstTimeSetupRequired ? 'grid-cols-3' : 'grid-cols-2'} gap-1.5 p-1 rounded-2xl bg-slate-950 border border-slate-800`}>
              {isFirstTimeSetupRequired && (
                <button
                  type="button"
                  onClick={() => {
                    setAdminRecoveryTab('SETUP_PASSWORD');
                    setForgotError('');
                    setForgotSuccess('');
                  }}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    adminRecoveryTab === 'SETUP_PASSWORD'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Thiết lập lần đầu
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setAdminRecoveryTab('RECOVERY_CODE');
                  setForgotError('');
                  setForgotSuccess('');
                }}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  adminRecoveryTab === 'RECOVERY_CODE'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Mã Khôi phục
              </button>
              <button
                type="button"
                onClick={() => {
                  setAdminRecoveryTab('EMAIL');
                  setForgotError('');
                  setForgotSuccess('');
                }}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  adminRecoveryTab === 'EMAIL'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Email Token
              </button>
            </div>

            {/* Error & Success Alerts in Modal */}
            {forgotError && (
              <div className="rounded-xl bg-rose-950 border border-rose-700/60 p-3 text-xs text-rose-300 font-medium animate-shake">
                {forgotError}
              </div>
            )}
            {forgotSuccess && (
              <div className="rounded-xl bg-emerald-950 border border-emerald-700/60 p-3 text-xs text-emerald-300 font-medium">
                {forgotSuccess}
              </div>
            )}

            {/* TAB 1: FIRST-TIME SETUP */}
            {adminRecoveryTab === 'SETUP_PASSWORD' && (
              <form onSubmit={handleSetupFirstTimePassword} className="space-y-4">
                <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-300">
                  Dành cho tài khoản Quản trị viên mới khởi tạo hoặc chưa từng đặt mật khẩu trong cơ sở dữ liệu.
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Tên đăng nhập hoặc Email</label>
                  <input
                    type="text"
                    value={rcIdentifier}
                    onChange={(e) => setRcIdentifier(e.target.value)}
                    placeholder="admin hoặc binhdtsply@gmail.com"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-xs text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Mã xác thực khởi tạo (Recovery Code) *</label>
                  <input
                    type="text"
                    value={rcCode}
                    onChange={(e) => setRcCode(e.target.value)}
                    placeholder="Nhập mã Recovery Code khởi tạo..."
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-xs text-white font-mono uppercase"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Mật khẩu mới (≥ 6 ký tự)</label>
                    <input
                      type={rcShowPassword ? 'text' : 'password'}
                      value={rcNewPassword}
                      onChange={(e) => setRcNewPassword(e.target.value)}
                      placeholder="Mật khẩu mới..."
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-xs text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Xác nhận mật khẩu</label>
                    <input
                      type={rcShowPassword ? 'text' : 'password'}
                      value={rcConfirmPassword}
                      onChange={(e) => setRcConfirmPassword(e.target.value)}
                      placeholder="Nhập lại..."
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-xs text-white"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rcShowPassword}
                      onChange={(e) => setRcShowPassword(e.target.checked)}
                      className="rounded"
                    />
                    <span>Hiện mật khẩu</span>
                  </label>
                  <button
                    type="submit"
                    disabled={isRcLoading}
                    className="rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-5 py-2.5 cursor-pointer disabled:opacity-50"
                  >
                    {isRcLoading ? 'Đang lưu...' : 'LƯU MẬT KHẨU MỚI'}
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: RECOVERY CODE */}
            {adminRecoveryTab === 'RECOVERY_CODE' && (
              <div className="space-y-4">
                {rcStep === 1 ? (
                  <form onSubmit={handleVerifyRecoveryCode} className="space-y-4">
                    <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-300 leading-relaxed">
                      <div className="font-bold flex items-center gap-1.5 mb-1">
                        <KeyRound className="h-4 w-4 text-amber-400 shrink-0" />
                        <span>Xác minh Recovery Code hiện hành</span>
                      </div>
                      <p className="text-[11px] text-amber-200/90">
                        Vui lòng nhập Recovery Code hiện hành đã được thiết lập cho tài khoản Quản trị viên.
                        Chỉ cho phép tạo mật khẩu Admin mới sau khi xác minh Recovery Code thành công.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Tên đăng nhập hoặc Email Quản trị *</label>
                      <input
                        type="text"
                        value={rcIdentifier}
                        onChange={(e) => setRcIdentifier(e.target.value)}
                        placeholder="admin hoặc email quản trị viên"
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-xs text-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Recovery Code hiện hành *</label>
                      <input
                        type="text"
                        value={rcCode}
                        onChange={(e) => setRcCode(e.target.value)}
                        placeholder="Nhập Recovery Code hiện hành..."
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-xs text-white font-mono uppercase"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isRcLoading || !rcCode.trim()}
                      className="w-full rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs py-3 cursor-pointer disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-md shadow-amber-500/20"
                    >
                      {isRcLoading ? (
                        <>
                          <div className="h-4 w-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                          <span>Đang xác minh Recovery Code...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          <span>XÁC MINH RECOVERY CODE</span>
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleResetWithVerifiedRecoveryCode} className="space-y-4">
                    <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs text-emerald-300 leading-relaxed">
                      <div className="font-bold flex items-center gap-1.5 mb-1">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                        <span>Xác minh thành công</span>
                      </div>
                      <p className="text-[11px] text-emerald-200">
                        Recovery Code đã được xác thực chính xác cho tài khoản <strong>{rcIdentifier}</strong>. Hãy thiết lập mật khẩu Admin mới bên dưới.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">Mật khẩu mới (≥ 6 ký tự) *</label>
                        <input
                          type={rcShowPassword ? 'text' : 'password'}
                          value={rcNewPassword}
                          onChange={(e) => setRcNewPassword(e.target.value)}
                          placeholder="Mật khẩu mới..."
                          className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-xs text-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">Xác nhận mật khẩu *</label>
                        <input
                          type={rcShowPassword ? 'text' : 'password'}
                          value={rcConfirmPassword}
                          onChange={(e) => setRcConfirmPassword(e.target.value)}
                          placeholder="Nhập lại..."
                          className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-xs text-white"
                          required
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rcShowPassword}
                          onChange={(e) => setRcShowPassword(e.target.checked)}
                          className="rounded"
                        />
                        <span>Hiện mật khẩu</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setRcStep(1);
                          setForgotError('');
                          setForgotSuccess('');
                        }}
                        className="text-xs text-slate-400 hover:text-white"
                      >
                        ← Nhập lại Recovery Code
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={isRcLoading || !rcNewPassword.trim() || !rcConfirmPassword.trim()}
                      className="w-full rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs py-3 cursor-pointer disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-md shadow-amber-500/20"
                    >
                      {isRcLoading ? (
                        <>
                          <div className="h-4 w-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                          <span>Đang lưu mật khẩu mới...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          <span>LƯU MẬT KHẨU MỚI & ĐĂNG NHẬP</span>
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* TAB 3: EMAIL TOKEN */}
            {adminRecoveryTab === 'EMAIL' && (
              <div>
                {emailStep === 1 ? (
                  <form onSubmit={handleSendResetEmail} className="space-y-4">
                    <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-300">
                      Gửi mã xác thực 6 chữ số qua Email Quản trị viên (SMTP Delivery).
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Email Quản trị viên *</label>
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="binhdtsply@gmail.com"
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-xs text-white"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isForgotLoading}
                      className="w-full rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs py-3 cursor-pointer disabled:opacity-50"
                    >
                      {isForgotLoading ? 'Đang gửi mã xác thực...' : 'GỬI MÃ XÁC THỰC QUA EMAIL'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleResetPasswordWithEmailToken} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Mã xác thực 6 chữ số *</label>
                      <input
                        type="text"
                        value={emailToken}
                        onChange={(e) => setEmailToken(e.target.value)}
                        placeholder="Nhập 6 số trong email..."
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-xs text-white font-mono uppercase"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">Mật khẩu mới</label>
                        <input
                          type={emailShowPassword ? 'text' : 'password'}
                          value={emailNewPassword}
                          onChange={(e) => setEmailNewPassword(e.target.value)}
                          placeholder="Mật khẩu mới..."
                          className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-xs text-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">Xác nhận mật khẩu</label>
                        <input
                          type={emailShowPassword ? 'text' : 'password'}
                          value={emailConfirmPassword}
                          onChange={(e) => setEmailConfirmPassword(e.target.value)}
                          placeholder="Nhập lại..."
                          className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-xs text-white"
                          required
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="button"
                        onClick={() => setEmailStep(1)}
                        className="text-xs text-slate-400 hover:text-white"
                      >
                        ← Gửi lại mã
                      </button>
                      <button
                        type="submit"
                        disabled={isForgotLoading}
                        className="rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-5 py-2.5 cursor-pointer disabled:opacity-50"
                      >
                        {isForgotLoading ? 'Đang cập nhật...' : 'XÁC NHẬN MẬT KHẨU MỚI'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
