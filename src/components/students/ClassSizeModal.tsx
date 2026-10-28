/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Users, CheckCircle, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';
import { classService } from '../../services/ClassService';
import { studentService } from '../../services/StudentService';

interface ClassSizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ClassSizeModal: React.FC<ClassSizeModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const settings = classService.getSettings();
  const realCount = studentService.getStudents() ? studentService.getStudents().length : 0;
  
  const [confirmedSize, setConfirmedSize] = useState<string>(
    settings.confirmedTotalStudents ? String(settings.confirmedTotalStudents) : ''
  );
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const current = classService.getSettings();
      setConfirmedSize(current.confirmedTotalStudents ? String(current.confirmedTotalStudents) : '');
      setSuccessMsg(null);
      setErrorMsg(null);
    }
  }, [isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleSyncWithRealList = () => {
    setConfirmedSize(String(realCount));
  };

  const handleClearConfirmed = () => {
    setConfirmedSize('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    const parsedNum = parseInt(confirmedSize.trim(), 10);
    const confirmedVal = !isNaN(parsedNum) && parsedNum >= 0 ? parsedNum : undefined;

    try {
      const res = await classService.updateSettings({
        confirmedTotalStudents: confirmedVal,
        totalStudents: confirmedVal !== undefined ? confirmedVal : realCount
      });
      if (res && !res.success && res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg('Đã cập nhật sĩ số thành công!');
        setTimeout(() => {
          if (onSuccess) onSuccess();
          onClose();
        }, 700);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Có lỗi xảy ra khi lưu sĩ số.');
      console.error('Error saving class size:', err);
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-200 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-xs">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">CẬP NHẬT SĨ SỐ LỚP HỌC</h3>
              <p className="text-xs text-slate-500">
                Đồng nhất sĩ số giữa Ảnh bìa và Quản lý học viên
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Success alert */}
        {successMsg && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-bold text-emerald-800 animate-fade-in">
            <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Error alert */}
        {errorMsg && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-2xl bg-rose-50 border border-rose-200 p-3 text-xs font-bold text-rose-800 animate-fade-in">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Body Form */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          {/* Comparison Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3.5 text-center">
              <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wide">
                Sĩ số thực tế (Roster)
              </span>
              <div className="text-2xl font-black text-blue-900 mt-0.5">
                {realCount}
              </div>
              <p className="text-[10px] text-blue-600 mt-0.5">
                Học viên trong danh sách
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3.5 text-center">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide">
                Sĩ số GVCN xác nhận
              </span>
              <div className="text-2xl font-black text-emerald-900 mt-0.5">
                {confirmedSize ? confirmedSize : `${realCount} (Tự động)`}
              </div>
              <p className="text-[10px] text-emerald-600 mt-0.5">
                {confirmedSize ? 'Theo cấu hình của GVCN' : 'Đồng bộ tự động'}
              </p>
            </div>
          </div>

          {/* Input field */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Sĩ số do GVCN xác nhận (Danh bộ / Đăng ký)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                max="200"
                value={confirmedSize}
                onChange={(e) => setConfirmedSize(e.target.value)}
                placeholder={`Mặc định theo danh sách (${realCount})`}
                className="flex-1 rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-hidden bg-white"
              />
              <button
                type="button"
                onClick={handleSyncWithRealList}
                className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer shrink-0"
                title="Đặt bằng số học sinh thực tế trong danh sách"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Gán bằng thực tế ({realCount})</span>
              </button>
            </div>
            {confirmedSize && (
              <button
                type="button"
                onClick={handleClearConfirmed}
                className="text-[11px] font-semibold text-slate-500 hover:text-rose-600 underline cursor-pointer mt-1"
              >
                Xóa giá trị xác nhận riêng (tự động theo danh sách thực tế)
              </button>
            )}
          </div>

          {/* Explanatory note */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 text-xs text-slate-600 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
              <span>Cơ chế đồng nhất dữ liệu:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600 ml-1">
              <li>
                <strong>Sĩ số thực tế:</strong> Được tính tự động từ số hồ sơ học sinh thuộc đúng lớp hiện tại ({realCount} học viên).
              </li>
              <li>
                <strong>Ảnh bìa & Quản lý học viên:</strong> Luôn phản ánh thống nhất và đồng bộ ngay khi thêm, xóa học sinh hoặc nhập file Excel.
              </li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-all cursor-pointer disabled:opacity-50"
            >
              <CheckCircle className="h-4 w-4" />
              <span>{saving ? 'Đang lưu...' : 'Lưu sĩ số'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
