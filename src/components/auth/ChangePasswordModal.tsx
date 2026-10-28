/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { authService } from '../../services/AuthService';
import { authRepository } from '../../services/AuthRepository';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (message?: string) => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const currentUser = authService.getCurrentUser();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen || typeof document === 'undefined') return null;

  const getRoleLabel = () => {
    switch (currentUser.role) {
      case 'SUPER_ADMIN':
        return 'Quản trị viên Super Admin';
      case 'TEACHER':
        return 'Giáo viên Chủ nhiệm';
      case 'CLASS_OFFICER':
        return 'Ban Cán sự Lớp';
      case 'STUDENT':
        return 'Học viên';
      case 'PARENT':
        return 'Phụ huynh Học sinh';
      default:
        return 'Người dùng';
    }
  };

  const handleResetForm = () => {
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleClose = () => {
    handleResetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!oldPassword || oldPassword.trim() === '') {
      setErrorMessage('Vui lòng nhập mật khẩu hoặc mã truy cập hiện tại.');
      return;
    }

    if (!newPassword || newPassword.trim().length < 6) {
      setErrorMessage('Mật khẩu mới phải có độ dài tối thiểu 6 ký tự.');
      return;
    }

    if (oldPassword.trim() === newPassword.trim()) {
      setErrorMessage('Mật khẩu mới không được trùng với mật khẩu hiện tại.');
      return;
    }

    if (newPassword.trim() !== confirmPassword.trim()) {
      setErrorMessage('Xác nhận mật khẩu mới không khớp.');
      return;
    }

    setIsLoading(true);
    try {
      const res = currentUser.role === 'SUPER_ADMIN'
        ? await authService.changeSuperAdminPasswordAsync(oldPassword.trim(), newPassword.trim())
        : await authRepository.changePassword(oldPassword.trim(), newPassword.trim());

      if (res.success) {
        setSuccessMessage('Đổi mật khẩu tài khoản thành công!');
        currentUser.hasPassword = true;
        currentUser.mustChangePassword = false;
        authService.setCurrentUser({
          ...currentUser,
          hasPassword: true,
          mustChangePassword: false
        });

        setTimeout(() => {
          if (onSuccess) {
            onSuccess('Đổi mật khẩu thành công!');
          }
          handleClose();
        }, 1200);
      } else {
        setErrorMessage(res.message || 'Không thể đổi mật khẩu. Vui lòng kiểm tra lại mật khẩu hiện tại.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Có lỗi kết nối hệ thống khi đổi mật khẩu.');
    } finally {
      setIsLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in font-['Be_Vietnam_Pro',sans-serif]">
      <div className="relative w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-slate-50 to-indigo-50/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white font-bold shadow-xs">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-800">Đổi Mật Khẩu Cá Nhân</h3>
                <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                  {getRoleLabel()}
                </span>
              </div>
              <p className="text-xs text-slate-500">Bảo vệ an toàn tài khoản và dữ liệu cá nhân</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User identification info */}
        <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-700">
            <ShieldCheck className="h-4 w-4 text-indigo-600" />
            <span>Tài khoản: <strong className="text-slate-900">{currentUser.name}</strong></span>
          </div>
          <span className="text-[11px] text-slate-500">
            {currentUser.email || currentUser.teacherId || currentUser.studentId || ''}
          </span>
        </div>

        {/* Form body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {errorMessage && (
            <div className="flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-rose-800 animate-fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
              <span className="text-xs font-medium">{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-emerald-800 animate-fade-in">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span className="text-xs font-bold">{successMessage}</span>
            </div>
          )}

          {/* 1. Mật khẩu hiện tại */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>Mật khẩu hiện tại *</span>
              <span className="text-[11px] font-normal text-slate-400">Hoặc mã truy cập ban đầu</span>
            </label>
            <div className="relative">
              <input
                type={showOldPassword ? 'text' : 'password'}
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Nhập mật khẩu hiện tại..."
                className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-hidden pr-10"
              />
              <button
                type="button"
                onClick={() => setShowOldPassword(!showOldPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showOldPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* 2. Mật khẩu mới */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>Mật khẩu mới *</span>
              <span className="text-[11px] font-normal text-indigo-600">Tối thiểu 6 ký tự</span>
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)..."
                className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-hidden pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* 3. Xác nhận mật khẩu mới */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">
              Xác nhận mật khẩu mới *
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới..."
                className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-hidden pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Notice box */}
          <div className="rounded-xl bg-indigo-50/60 border border-indigo-100 p-3 text-[11px] text-indigo-900 space-y-1">
            <div className="font-bold flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
              <span>Lưu ý bảo mật:</span>
            </div>
            <p className="text-indigo-800">
              Mật khẩu mới do bạn tự đặt sẽ được bảo mật tuyệt đối. Sau khi đổi thành công, bạn sẽ sử dụng mật khẩu mới này cho tất cả các lần đăng nhập tiếp theo.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isLoading || Boolean(successMessage)}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:shadow-indigo-500/25 transition-all cursor-pointer disabled:opacity-50"
            >
              <Lock className="h-4 w-4" />
              <span>{isLoading ? 'Đang xử lý...' : 'Xác nhận Đổi Mật Khẩu'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
