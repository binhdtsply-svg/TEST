/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, ShieldAlert, X, Save, Bookmark } from 'lucide-react';
import { GraduationRegistration } from '../../types';
import { graduationService } from '../../services/GraduationService';

interface GraduationFlagModalProps {
  registration: GraduationRegistration;
  onClose: () => void;
  onSaved?: (updated: GraduationRegistration) => void;
}

const FLAG_REASONS = [
  'Điểm dự kiến thấp (ĐXTN < 5.0)',
  'Có môn thi ở mức điểm liệt hoặc gần điểm liệt (≤ 2.0đ)',
  'Chưa chọn đủ 02 môn tự chọn',
  'Thiếu dữ liệu học bạ (Lớp 10 / 11 / 12)',
  'Hồ sơ ưu tiên / khuyến khích chưa có minh chứng',
  'Chuyên cần và ý thức học tập cần lưu ý',
  'Cần phụ đạo, bồi dưỡng thêm',
  'Lý do khác do GVCN theo dõi'
];

export const GraduationFlagModal: React.FC<GraduationFlagModalProps> = ({ registration, onClose, onSaved }) => {
  const wasPreviouslyFlagged = Boolean(
    registration.isFlagged ||
    (registration.teacherNote && registration.teacherNote.trim().length > 0) ||
    (Array.isArray(registration.flagReasons) && registration.flagReasons.length > 0)
  );

  // Default to true when opening the "Đánh dấu học viên cần chú ý" modal
  const [isFlagged, setIsFlagged] = useState<boolean>(true);
  const [selectedReasons, setSelectedReasons] = useState<string[]>(registration.flagReasons || []);
  const [teacherNote, setTeacherNote] = useState<string>(registration.teacherNote || '');
  const [customReason, setCustomReason] = useState<string>('');

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const toggleReason = (reason: string) => {
    setErrorMsg(null);
    if (selectedReasons.includes(reason)) {
      setSelectedReasons(selectedReasons.filter(r => r !== reason));
    } else {
      setSelectedReasons([...selectedReasons, reason]);
      if (!isFlagged) setIsFlagged(true);
    }
  };

  const handleAddCustomReason = () => {
    const trimmedCustom = customReason.trim();
    if (trimmedCustom && !selectedReasons.includes(trimmedCustom)) {
      setErrorMsg(null);
      setSelectedReasons([...selectedReasons, trimmedCustom]);
      setCustomReason('');
      if (!isFlagged) setIsFlagged(true);
    }
  };

  const handleNoteChange = (val: string) => {
    setErrorMsg(null);
    setTeacherNote(val);
    if (val.trim().length > 0 && !isFlagged) {
      setIsFlagged(true);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setErrorMsg(null);

    const trimmedNote = teacherNote.trim();
    const trimmedCustom = customReason.trim();
    const mergedReasons = Array.from(
      new Set(
        [...selectedReasons, ...(trimmedCustom ? [trimmedCustom] : [])]
          .map(r => r.trim())
          .filter(Boolean)
      )
    );

    const hasContent = trimmedNote.length > 0 || mergedReasons.length > 0;

    // Validation: If student was NOT previously flagged/noted, prevent saving an empty note/reason
    if (!wasPreviouslyFlagged && (!isFlagged || !hasContent)) {
      setErrorMsg('Vui lòng nhập nội dung ghi chú hoặc chọn ít nhất một lý do cần chú ý trước khi lưu.');
      return;
    }

    // If student WAS previously flagged/noted, unchecking isFlagged OR clearing all notes/reasons turns off the flag
    const effectiveIsFlagged = Boolean(isFlagged && hasContent);
    const effectiveReasons = effectiveIsFlagged ? mergedReasons : [];
    const effectiveNote = effectiveIsFlagged ? trimmedNote : '';

    setIsSaving(true);
    try {
      const updated = await graduationService.toggleStudentFlag(
        registration.studentId,
        effectiveIsFlagged,
        effectiveReasons,
        effectiveNote
      );
      if (!updated) {
        throw new Error('Không thể lưu ghi chú theo dõi cho học viên. Vui lòng thử lại.');
      }
      if (onSaved) {
        onSaved(updated);
      }
      onClose();
    } catch (err: any) {
      console.error('Error saving tracking flag:', err);
      setErrorMsg(err?.message || 'Lỗi khi lưu ghi chú cần chú ý. Dữ liệu vừa nhập vẫn được giữ lại.');
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-200 bg-amber-50/80 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500 text-white shadow-2xs">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-black text-amber-950 uppercase tracking-tight">
                ĐÁNH DẤU HỌC VIÊN CẦN CHÚ Ý
              </h3>
              <p className="text-[11px] text-amber-800">
                {registration.studentName} ({registration.studentCode}) • Tổ {registration.studentGroup}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="overflow-y-auto p-6 space-y-4 text-xs">
          {errorMsg && (
            <div className="flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-800 border border-rose-200">
              <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Toggle Flag Status */}
          <div className="rounded-2xl bg-amber-50/50 p-3.5 border border-amber-200 space-y-2">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="font-extrabold text-slate-800">
                Trạng thái: {isFlagged ? 'Đang bật theo dõi đặc biệt (⚠️ Cần chú ý)' : 'Bình thường'}
              </span>
              <input
                type="checkbox"
                checked={isFlagged}
                onChange={e => {
                  setErrorMsg(null);
                  setIsFlagged(e.target.checked);
                }}
                className="h-4 w-4 text-amber-600 rounded-md"
              />
            </label>
            <p className="text-[10px] text-slate-500">
              Học viên được đánh dấu sẽ được làm nổi bật với màu nền vàng dịu trên bảng theo dõi của GVCN.
            </p>
          </div>

          {/* List of reasons */}
          <div className="space-y-2">
            <label className="font-black text-slate-800 uppercase tracking-tight block">
              LÝ DO THEO DÕI / CẢNH BÁO
            </label>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {FLAG_REASONS.map(reason => (
                <label
                  key={reason}
                  className={`flex items-start gap-2.5 rounded-xl p-2.5 border transition-colors cursor-pointer ${
                    selectedReasons.includes(reason)
                      ? 'bg-amber-50/80 border-amber-300 font-bold text-amber-950'
                      : 'bg-slate-50/50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedReasons.includes(reason)}
                    onChange={() => toggleReason(reason)}
                    className="mt-0.5 h-3.5 w-3.5 rounded-md text-amber-600 focus:ring-0"
                  />
                  <span className="text-[11px] leading-tight">{reason}</span>
                </label>
              ))}
            </div>

            {/* Custom reason input */}
            <div className="flex gap-2 pt-1">
              <input
                type="text"
                placeholder="Nhập lý do khác..."
                value={customReason}
                onChange={e => {
                  setErrorMsg(null);
                  setCustomReason(e.target.value);
                  if (e.target.value.trim().length > 0 && !isFlagged) {
                    setIsFlagged(true);
                  }
                }}
                className="flex-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs focus:border-blue-500 focus:outline-hidden"
              />
              <button
                type="button"
                onClick={handleAddCustomReason}
                className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200 cursor-pointer"
              >
                + Thêm
              </button>
            </div>
          </div>

          {/* Teacher private note */}
          <div className="space-y-1.5">
            <label className="font-black text-slate-800 uppercase tracking-tight block">
              GHI CHÚ THEO DÕI CỦA GVCN (CHỈ GVCN XEM ĐƯỢC)
            </label>
            <textarea
              rows={3}
              placeholder="Ghi chú kế hoạch bồi dưỡng, lịch trao đổi với phụ huynh, tiến độ nộp hồ sơ..."
              value={teacherNote}
              onChange={e => handleNoteChange(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 cursor-pointer disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-1.5 rounded-xl bg-amber-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-700 active:scale-95 transition-all cursor-pointer disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              <span>{isSaving ? 'Đang lưu...' : 'Lưu thông tin theo dõi'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
