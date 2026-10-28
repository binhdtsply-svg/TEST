/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { ShieldCheck, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { authService } from '../../services/AuthService';
import { authRepository } from '../../services/AuthRepository';
import { UserAccount } from '../../types';

interface ForcePasswordChangeModalProps {
  currentUser: UserAccount;
  isOpen: boolean;
  onSuccess: () => void;
}

export const ForcePasswordChangeModal: React.FC<ForcePasswordChangeModalProps> = ({
  currentUser,
  isOpen,
  onSuccess
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (newPassword.trim().length < 6) {
      setErrorMessage('Mật khẩu bảo mật phải có độ dài tối thiểu 6 ký tự.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Mật khẩu xác nhận không khớp với mật khẩu mới.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authRepository.setupPassword(newPassword.trim());

      if (res.success) {
        // Update current local user session
        currentUser.mustChangePassword = false;
        currentUser.hasPassword = true;
        authService.setCurrentUser({
          ...currentUser,
          mustChangePassword: false,
          hasPassword: true
        });
        onSuccess();
      } else {
        setErrorMessage(res.message || 'Không thể thiết lập mật khẩu.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Lỗi hệ thống khi cập nhật mật khẩu.');
    } finally {
      setIsLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md animate-fade-in font-['Be_Vietnam_Pro',sans-serif]">
      <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl p-6 sm:p-8 text-white">
        {/* Header Decor */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-bold text-amber-300 uppercase tracking-wider mb-1">
              Yêu cầu bảo mật lần đầu
            </div>
            <h3 className="text-base font-bold text-white">Thiết Lập Mật Khẩu Cá Nhân</h3>
          </div>
        </div>

        <p className="text-xs text-slate-300 mb-6 leading-relaxed">
          Chào bạn, <strong className="text-white">{currentUser.name}</strong>! Để bảo vệ quyền riêng tư và dữ liệu học tập cá nhân, vui lòng đặt mật khẩu riêng cho tài khoản trước khi tiếp tục.
        </p>

        {errorMessage && (
          <div className="mb-4 flex items-start gap-2 rounded-xl bg-rose-500/20 border border-rose-500/40 p-3 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Mật khẩu mới (Tối thiểu 6 ký tự)
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nhập mật khẩu mới..."
                className="w-full rounded-xl bg-slate-800/90 border border-slate-700 px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-hidden focus:ring-2 focus:ring-amber-400/20 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Xác nhận lại mật khẩu
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu..."
              className="w-full rounded-xl bg-slate-800/90 border border-slate-700 px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-hidden focus:ring-2 focus:ring-amber-400/20"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 py-3 text-xs font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{isLoading ? 'Đang cập nhật...' : 'XÁC NHẬN & VÀO LỚP HỌC'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
