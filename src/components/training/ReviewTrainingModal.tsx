/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  CheckCircle2,
  XCircle,
  Edit3,
  ShieldCheck,
  User,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { PointTransaction } from '../../types';
import { trainingService } from '../../services/TrainingService';
import { authService } from '../../services/AuthService';

interface ReviewTrainingModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: PointTransaction | null;
  onSuccess?: () => void;
}

export const ReviewTrainingModal: React.FC<ReviewTrainingModalProps> = ({
  isOpen,
  onClose,
  transaction,
  onSuccess
}) => {
  const currentUser = authService.getCurrentUser();

  const [pointsType, setPointsType] = useState<'plus' | 'minus'>('plus');
  const [pointsValue, setPointsValue] = useState<number>(5);
  const [category, setCategory] = useState<string>('Học tập');
  const [reason, setReason] = useState<string>('');
  const [eventDate, setEventDate] = useState<string>('');
  const [isRejecting, setIsRejecting] = useState<boolean>(false);
  const [rejectedReason, setRejectedReason] = useState<string>('');

  useEffect(() => {
    if (transaction) {
      if (transaction.points < 0) {
        setPointsType('minus');
        setPointsValue(Math.abs(transaction.points));
      } else {
        setPointsType('plus');
        setPointsValue(Math.abs(transaction.points));
      }
      setCategory(transaction.category || 'Học tập');
      setReason(transaction.reason || '');
      setEventDate(transaction.eventDate || transaction.createdAt || '');
      setIsRejecting(false);
      setRejectedReason('');
    }
  }, [transaction]);

  if (!isOpen || !transaction || typeof document === 'undefined') return null;

  const handleApprove = (e: React.FormEvent) => {
    e.preventDefault();
    const finalPoints = pointsType === 'plus' ? Math.abs(pointsValue) : -Math.abs(pointsValue);

    trainingService.approveTransaction(transaction.id, currentUser.name, {
      points: finalPoints,
      category,
      reason: reason.trim(),
      eventDate
    });

    if (onSuccess) onSuccess();
    onClose();
  };

  const handleConfirmReject = (e: React.FormEvent) => {
    e.preventDefault();
    trainingService.rejectTransaction(
      transaction.id,
      currentUser.name,
      rejectedReason.trim() || 'Báo cáo chưa đủ căn cứ xác thực'
    );

    if (onSuccess) onSuccess();
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
      <div className="relative flex max-h-[90vh] w-full max-w-xl flex-col rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700 font-bold">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                {isRejecting ? 'Từ Chối Đề Xuất Rèn Luyện' : 'Kiểm Duyệt & Phê Duyệt Báo Cáo'}
              </h3>
              <p className="text-xs text-slate-500">
                Người báo cáo: <strong>{transaction.proposedByName || 'Cán sự lớp'}</strong> ({transaction.proposedByRole || 'Cán bộ lớp'})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        {!isRejecting ? (
          <form onSubmit={handleApprove} className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Student Info Box */}
            <div className="rounded-2xl bg-blue-50/60 border border-blue-200 p-3.5 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-blue-600">HỌC SINH ĐƯỢC GHI NHẬN</div>
                <div className="text-sm font-black text-slate-900 mt-0.5">{transaction.studentName}</div>
              </div>
              <div className="text-right">
                <div className="text-[11px] font-bold text-slate-500">ĐIỂM ĐỀ XUẤT BAN ĐẦU</div>
                <div className={`text-sm font-black ${transaction.points >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {transaction.points > 0 ? `+${transaction.points}` : transaction.points} đ
                </div>
              </div>
            </div>

            {/* Category & Points Tuning */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Danh mục</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900 bg-white outline-none"
                >
                  <option value="Học tập">📚 Học tập</option>
                  <option value="Nề nếp & Kỷ luật">⏰ Nề nếp & Kỷ luật</option>
                  <option value="Phong trào & Hoạt động">🎉 Phong trào</option>
                  <option value="Việc tốt & Giúp đỡ">❤️ Việc tốt & Giúp đỡ</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Loại điểm</label>
                <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setPointsType('plus')}
                    className={`rounded-lg py-1 text-xs font-bold transition-all ${
                      pointsType === 'plus' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    + Cộng
                  </button>
                  <button
                    type="button"
                    onClick={() => setPointsType('minus')}
                    className={`rounded-lg py-1 text-xs font-bold transition-all ${
                      pointsType === 'minus' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    - Trừ
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Điểm duyệt ({pointsType === 'plus' ? '+' : '-'})
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={pointsValue}
                  onChange={(e) => setPointsValue(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs font-black text-slate-900 outline-none"
                  required
                />
              </div>
            </div>

            {/* Event Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Ngày ghi nhận</label>
              <input
                type="text"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                placeholder="dd/mm/yyyy"
                className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900 outline-none"
              />
            </div>

            {/* Reason */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nội dung / Lý do ghi nhận (GVCN có thể chỉnh sửa)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 outline-none focus:border-blue-500"
                required
              />
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsRejecting(true)}
                className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 cursor-pointer"
              >
                <XCircle className="h-4 w-4" />
                <span>Từ chối báo cáo</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={!reason.trim()}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-6 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Phê duyệt & Lưu vào sổ</span>
                </button>
              </div>
            </div>
          </form>
        ) : (
          /* Reject Confirmation Form */
          <form onSubmit={handleConfirmReject} className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-rose-800">
                <AlertCircle className="h-4 w-4 text-rose-600" />
                <span>Xác nhận từ chối đề xuất này</span>
              </div>
              <p className="text-slate-600">
                Báo cáo của <strong>{transaction.proposedByName}</strong> cho học sinh{' '}
                <strong>{transaction.studentName}</strong> sẽ chuyển sang trạng thái <em>Đã từ chối</em> và không tính vào điểm rèn luyện.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Lý do từ chối (Gửi lại phản hồi cho người báo cáo)
              </label>
              <textarea
                value={rejectedReason}
                onChange={(e) => setRejectedReason(e.target.value)}
                placeholder="Nhập lý do từ chối (Ví dụ: Đã có cán sự khác ghi nhận, chưa đủ minh chứng...)"
                rows={3}
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 outline-none focus:border-rose-500"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsRejecting(false)}
                className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Quay lại
              </button>
              <button
                type="submit"
                disabled={!rejectedReason.trim()}
                className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-700 active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <XCircle className="h-4 w-4" />
                <span>Xác nhận từ chối</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
};
