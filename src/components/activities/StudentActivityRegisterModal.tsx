/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, Clock, MapPin, CheckCircle2, User, AlertCircle } from 'lucide-react';
import { ActivityPost, UserAccount } from '../../types';
import { activityService } from '../../services/ActivityService';

interface StudentActivityRegisterModalProps {
  activity: ActivityPost;
  currentUser: UserAccount;
  onClose: () => void;
  onSuccess: () => void;
}

export const StudentActivityRegisterModal: React.FC<StudentActivityRegisterModalProps> = ({
  activity,
  currentUser,
  onClose,
  onSuccess
}) => {
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const result = activityService.registerStudentForActivity(
      activity.id,
      {
        id: currentUser.studentId || currentUser.id,
        fullName: currentUser.name,
        avatar: currentUser.avatar,
        studentCode: (currentUser as any).studentCode || currentUser.studentId || 'HS-11A1',
        groupOrTeam: (currentUser as any).groupOrTeam || 'Tổ 1'
      },
      notes.trim()
    );

    if (result.success) {
      onSuccess();
      onClose();
    } else {
      setError(result.message);
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900">
                Đăng Ký Tham Gia Hoạt Động
              </h2>
              <span className="text-[11px] text-blue-600 font-bold">
                {activity.category}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div className="rounded-2xl bg-blue-50/60 border border-blue-100 p-4 space-y-2">
            <h3 className="font-extrabold text-slate-900 text-sm">{activity.title}</h3>
            <div className="flex flex-wrap items-center gap-3 text-slate-600 text-[11px]">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-blue-600" />
                {activity.startDate} {activity.startTime ? `(${activity.startTime})` : ''}
              </span>
              {activity.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-rose-500" />
                  {activity.location}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl bg-slate-50 border border-slate-200 p-3.5">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="h-10 w-10 rounded-full object-cover ring-2 ring-blue-500/30"
            />
            <div>
              <p className="font-bold text-slate-900">{currentUser.name}</p>
              <p className="text-[11px] text-slate-500">
                Mã: {(currentUser as any).studentCode || currentUser.studentId || 'HS-11A1'} • Vai trò: Học viên
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Ghi chú thêm cho GVCN / Phân công vị trí (Không bắt buộc)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ví dụ: Em có thể mang thêm 2 xẻng nhỏ / Em muốn hát bài đơn ca..."
              className="w-full rounded-2xl border border-slate-200 p-3 text-xs text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-all active:scale-95 cursor-pointer"
            >
              Xác nhận Đăng Ký
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
