/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, User, Phone, Mail, Shield, Camera, Check, LogOut, Settings, KeyRound, ShieldAlert } from 'lucide-react';
import { authService } from '../../services/AuthService';
import { studentService } from '../../services/StudentService';
import { classService } from '../../services/ClassService';
import { UserAccount } from '../../types';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAvatarUpload: () => void;
  onOpenClassSettings?: () => void;
  onOpenRoleMatrix?: () => void;
  onOpenChangePassword?: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  onOpenAvatarUpload,
  onOpenClassSettings,
  onOpenRoleMatrix,
  onOpenChangePassword
}) => {
  const currentUser = authService.getCurrentUser();
  const [name, setName] = useState(currentUser.name);
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [email, setEmail] = useState(currentUser.email || '');
  const [warningThreshold, setWarningThreshold] = useState<number>(() => classService.getViolationWarningThreshold());
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen || typeof document === 'undefined') return null;

  const isTeacher = currentUser.role === 'TEACHER';
  const isStudent = currentUser.role === 'STUDENT';
  const isOfficer = currentUser.role === 'CLASS_OFFICER';
  const isParent = currentUser.role === 'PARENT';
  const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';

  const linkedStudent = currentUser.studentId ? studentService.getById(currentUser.studentId) : null;

  const getRoleBadge = () => {
    switch (currentUser.role) {
      case 'SUPER_ADMIN':
        return { label: 'Quản trị viên Hệ thống (Super Admin)', bg: 'bg-amber-100 text-amber-800 border-amber-200' };
      case 'TEACHER':
        return { label: 'Giáo viên Chủ nhiệm (Admin)', bg: 'bg-indigo-100 text-indigo-800 border-indigo-200' };
      case 'CLASS_OFFICER':
        return { label: 'Ban cán sự lớp', bg: 'bg-blue-100 text-blue-800 border-blue-200' };
      case 'STUDENT':
        return { label: 'Học sinh', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
      case 'PARENT':
        return { label: 'Phụ huynh học sinh', bg: 'bg-amber-100 text-amber-800 border-amber-200' };
      default:
        return { label: 'Người dùng', bg: 'bg-slate-100 text-slate-800 border-slate-200' };
    }
  };

  const roleInfo = getRoleBadge() || { label: 'Người dùng', bg: 'bg-slate-100 text-slate-800 border-slate-200' };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    authService.updateCurrentUserProfile(name, phone, email);

    if (isTeacher) {
      classService.updateSettings({
        homeroomTeacher: name,
        homeroomTeacherName: name,
        teacherName: name,
        teacherPhone: phone,
        teacherEmail: email,
        violationWarningThreshold: warningThreshold
      });
    } else if ((isStudent || isOfficer) && linkedStudent) {
      studentService.updateStudent(linkedStudent.id, {
        fullName: name,
        phone
      });
    }

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 900);
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white font-bold">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Hồ Sơ Cá Nhân</h3>
              <p className="text-xs text-slate-500">Thông tin tài khoản và phân quyền trong lớp</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSave} className="p-5 space-y-4 text-xs">
          {/* Avatar Section */}
          <div className="flex items-center gap-4 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
            <div className="relative group shrink-0">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                referrerPolicy="no-referrer"
                className="h-16 w-16 rounded-full object-cover ring-2 ring-blue-500/30 shadow-xs"
              />
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAvatarUpload();
                }}
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                title="Thay đổi ảnh đại diện"
              >
                <Camera className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-900 truncate">{currentUser.name}</span>
              </div>
              <span className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold border mt-1 ${roleInfo.bg}`}>
                {roleInfo.label}
              </span>
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAvatarUpload();
                  }}
                  className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                >
                  <Camera className="h-3.5 w-3.5" />
                  <span>Đổi ảnh đại diện</span>
                </button>
              </div>
            </div>
          </div>

          {/* Linked student info if applicable */}
          {(isStudent || isOfficer) && linkedStudent && (
            <div className="rounded-xl bg-emerald-50/80 p-3 border border-emerald-200">
              <div className="text-[11px] font-bold text-emerald-800">
                Học sinh liên kết: {linkedStudent.fullName} ({linkedStudent.code})
              </div>
              <div className="text-[10px] text-emerald-700 mt-0.5">
                Tổ {linkedStudent.group} • {linkedStudent.officerRole || 'Học sinh'}
              </div>
            </div>
          )}

          {isParent && linkedStudent && (
            <div className="rounded-xl bg-amber-50/80 p-3 border border-amber-200">
              <div className="text-[11px] font-bold text-amber-800">
                Phụ huynh của em: {linkedStudent.fullName} ({linkedStudent.code} - Tổ {linkedStudent.group})
              </div>
            </div>
          )}

          {/* Fields */}
          <div className="space-y-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Họ và tên *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-hidden"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  <span>Số điện thoại</span>
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="09xx xxx xxx"
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  <span>Email</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-hidden"
                />
              </div>
            </div>

            {isTeacher && (
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 space-y-1.5">
                <label className="block font-bold text-indigo-950 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5">
                    <ShieldAlert className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Ngưỡng cảnh báo vi phạm của lớp (GVCN)</span>
                  </span>
                  <span className="text-[10px] font-black text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded">
                    ≥ {warningThreshold} lượt
                  </span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={warningThreshold}
                    onChange={(e) => setWarningThreshold(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-20 rounded-lg border border-slate-300 bg-white p-1.5 text-xs text-slate-900 font-bold focus:border-indigo-500 outline-hidden"
                  />
                  <span className="text-[11px] text-slate-600">
                    lượt vi phạm trong năm / tuần để kích hoạt Cảnh báo (Mặc định: 2)
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Additional quick actions */}
          <div className="pt-2 border-t border-slate-100 flex flex-col gap-1.5">
            {!isSuperAdmin && onOpenChangePassword && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenChangePassword();
                }}
                className="flex items-center gap-2 rounded-xl p-2 text-left text-indigo-700 hover:bg-indigo-50 font-semibold transition-colors cursor-pointer"
              >
                <KeyRound className="h-4 w-4 text-indigo-600" />
                <span>Đổi mật khẩu tài khoản</span>
              </button>
            )}

            {isTeacher && onOpenClassSettings && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenClassSettings();
                }}
                className="flex items-center gap-2 rounded-xl p-2 text-left text-slate-700 hover:bg-slate-100 font-semibold"
              >
                <Settings className="h-4 w-4 text-slate-500" />
                <span>Cài đặt không gian lớp học & giao diện</span>
              </button>
            )}

            {onOpenRoleMatrix && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenRoleMatrix();
                }}
                className="flex items-center gap-2 rounded-xl p-2 text-left text-blue-700 hover:bg-blue-50 font-semibold"
              >
                <Shield className="h-4 w-4 text-blue-500" />
                <span>Chuyển đổi vai trò Demo (GVCN / Cán sự / Học sinh / Phụ huynh)</span>
              </button>
            )}
          </div>

          {savedSuccess && (
            <div className="rounded-xl bg-emerald-50 p-2.5 text-center text-xs font-bold text-emerald-700 border border-emerald-200 flex items-center justify-center gap-1.5 animate-fade-in">
              <Check className="h-4 w-4" />
              <span>Đã lưu thông tin cá nhân thành công!</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
            >
              Đóng
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
            >
              <Check className="h-4 w-4" />
              <span>Lưu thay đổi</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
