/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Send,
  MessageSquare,
  CheckCircle2,
  Calendar,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  FileText,
  ShieldCheck,
  CheckSquare,
  Square
} from 'lucide-react';
import { PointTransaction, Student } from '../../types';
import { trainingService } from '../../services/TrainingService';
import { studentService } from '../../services/StudentService';
import { parentCommunicationService } from '../../services/ParentCommunicationService';
import { authService } from '../../services/AuthService';
import { classService } from '../../services/ClassService';

interface SendParentTrainingReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialStudentId?: string;
  initialTransactionIds?: string[];
  onSuccess?: () => void;
}

type ScopeType = 'UNNOTIFIED' | 'THIS_WEEK' | 'THIS_MONTH' | 'ALL_APPROVED' | 'CUSTOM_DATE';

export const SendParentTrainingReportModal: React.FC<SendParentTrainingReportModalProps> = ({
  isOpen,
  onClose,
  initialStudentId,
  initialTransactionIds,
  onSuccess
}) => {
  const students = studentService.getAll();
  const currentUser = authService.getCurrentUser();
  const classSettings = classService.getSettings();

  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    initialStudentId || (students[0]?.id || 'hs-01')
  );
  const [scope, setScope] = useState<ScopeType>('UNNOTIFIED');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [selectedTxIds, setSelectedTxIds] = useState<string[]>([]);
  const [customMessage, setCustomMessage] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [sentSuccess, setSentSuccess] = useState<boolean>(false);

  // Sync initial student
  useEffect(() => {
    if (initialStudentId) {
      setSelectedStudentId(initialStudentId);
    }
  }, [initialStudentId]);

  const selectedStudent = useMemo(() => {
    return students.find(s => s.id === selectedStudentId) || students[0];
  }, [students, selectedStudentId]);

  // All approved transactions for selected student
  const studentApprovedTxs = useMemo(() => {
    return trainingService.getStudentApprovedTransactions(selectedStudentId);
  }, [selectedStudentId, isOpen]);

  // Filter transactions based on scope
  const scopedTransactions = useMemo(() => {
    const now = new Date();
    
    // Start of current week (Monday)
    const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);

    // Start of current month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return studentApprovedTxs.filter(tx => {
      if (scope === 'UNNOTIFIED') {
        return tx.parentNotificationStatus !== 'SENT';
      }

      if (scope === 'THIS_WEEK') {
        const txDate = tx.createdAt ? new Date(tx.createdAt) : new Date();
        return !isNaN(txDate.getTime()) ? txDate >= startOfWeek : true;
      }

      if (scope === 'THIS_MONTH') {
        const txDate = tx.createdAt ? new Date(tx.createdAt) : new Date();
        return !isNaN(txDate.getTime()) ? txDate >= startOfMonth : true;
      }

      if (scope === 'CUSTOM_DATE') {
        if (!customStartDate && !customEndDate) return true;
        const txDate = tx.eventDate || tx.createdAt || '';
        if (customStartDate && txDate < customStartDate) return false;
        if (customEndDate && txDate > customEndDate) return false;
        return true;
      }

      return true; // ALL_APPROVED
    });
  }, [studentApprovedTxs, scope, customStartDate, customEndDate]);

  // Update selected IDs when scoped transactions change
  useEffect(() => {
    if (initialTransactionIds && initialTransactionIds.length > 0) {
      const validIds = initialTransactionIds.filter(id => studentApprovedTxs.some(t => t.id === id));
      if (validIds.length > 0) {
        setSelectedTxIds(validIds);
        return;
      }
    }
    setSelectedTxIds(scopedTransactions.map(t => t.id));
  }, [scopedTransactions, initialTransactionIds, studentApprovedTxs]);

  // Selected transactions subset
  const activeTransactions = useMemo(() => {
    return studentApprovedTxs.filter(t => selectedTxIds.includes(t.id));
  }, [studentApprovedTxs, selectedTxIds]);

  // Statistics of selected transactions
  const metrics = useMemo(() => {
    let plus = 0;
    let minus = 0;
    activeTransactions.forEach(t => {
      if (t.points > 0) plus += t.points;
      else minus += Math.abs(t.points);
    });
    return {
      plus,
      minus,
      net: plus - minus,
      count: activeTransactions.length
    };
  }, [activeTransactions]);

  // Generate message draft
  useEffect(() => {
    const studentName = selectedStudent?.fullName || 'Học sinh';
    const className = classSettings.className || '11A1';
    const parentName = selectedStudent?.parentName || 'Quý Phụ huynh';

    let scopeLabel = 'gần đây';
    if (scope === 'UNNOTIFIED') scopeLabel = 'các sự kiện rèn luyện mới nhất';
    else if (scope === 'THIS_WEEK') scopeLabel = 'tuần này';
    else if (scope === 'THIS_MONTH') scopeLabel = 'tháng này';
    else if (scope === 'ALL_APPROVED') scopeLabel = 'toàn bộ quá trình rèn luyện';
    else if (scope === 'CUSTOM_DATE') scopeLabel = `giai đoạn từ ${customStartDate || '...'} đến ${customEndDate || '...'}`;

    let eventsList = '';
    if (activeTransactions.length > 0) {
      eventsList = activeTransactions.map((t, idx) => {
        const sign = t.points > 0 ? `+${t.points}` : `${t.points}`;
        const dateStr = t.eventDate || t.createdAt || 'Gần đây';
        return `${idx + 1}. [${dateStr}] ${t.category}: ${t.reason} (${sign}đ)`;
      }).join('\n');
    } else {
      eventsList = '(Không có sự kiện nào được chọn)';
    }

    const draft = `Kính gửi ${parentName} của em ${studentName} (Lớp ${className}),

GVCN xin thông báo đến Quý Phụ huynh kết quả rèn luyện và nề nếp của em ${studentName} trong ${scopeLabel}:

📊 TỔNG KẾT ĐIỂM RÈN LUYỆN:
- Tổng điểm khen thưởng & việc tốt: +${metrics.plus} điểm
- Tổng điểm trừ / nhắc nhở nề nếp: -${metrics.minus} điểm
- Điểm rèn luyện ròng: ${metrics.net >= 0 ? '+' : ''}${metrics.net} điểm

📋 CHI TIẾT CÁC SỰ KIỆN GHI NHẬN (${metrics.count} sự kiện):
${eventsList}

Rất mong Quý Phụ huynh cùng gia đình tiếp tục phối hợp, động viên và nhắc nhở em duy trì tốt nề nếp, phát huy các mặt tích cực.

Trân trọng cảm ơn Quý Phụ huynh!
${currentUser.name} (GVCN)`;

    setCustomMessage(draft);
  }, [selectedStudent, classSettings, scope, customStartDate, customEndDate, activeTransactions, metrics, currentUser]);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleToggleTx = (id: string) => {
    setSelectedTxIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedTxIds.length === scopedTransactions.length) {
      setSelectedTxIds([]);
    } else {
      setSelectedTxIds(scopedTransactions.map(t => t.id));
    }
  };

  const handleSendReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !customMessage.trim()) return;

    setIsSending(true);

    try {
      // 1. Send 1-1 chat message to parent
      parentCommunicationService.sendMessage(selectedStudentId, {
        senderRole: 'TEACHER',
        senderName: currentUser.name,
        content: customMessage.trim(),
        channel: 'IN_APP'
      });

      // 2. Mark transactions as SENT
      if (selectedTxIds.length > 0) {
        trainingService.markParentNotified(selectedTxIds, currentUser.name);
      }

      setSentSuccess(true);
      setTimeout(() => {
        setSentSuccess(false);
        setIsSending(false);
        if (onSuccess) onSuccess();
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Failed to send training report:', err);
      setIsSending(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
      <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-rose-50/80 via-white to-amber-50/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-600 text-white font-black shadow-xs">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <span>Gửi Báo Cáo Rèn Luyện Cho Phụ Huynh</span>
                <span className="rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 border border-rose-200">
                  Nhịp cầu 1-1
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Gửi tổng kết điểm rèn luyện và nề nếp trực tiếp vào cuộc trò chuyện Phụ huynh
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSendReport} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Step 1: Select Student */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                1. Chọn Học sinh nhận báo cáo
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-bold text-slate-900 bg-white outline-none focus:border-rose-500"
              >
                {students.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.code} - {s.fullName} (Tổ {s.group || 1} • PH: {s.parentName || 'Chưa rõ'})
                  </option>
                ))}
              </select>
            </div>

            {/* Step 2: Select Scope */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                2. Phạm vi tổng hợp dữ liệu
              </label>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value as ScopeType)}
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-bold text-slate-900 bg-white outline-none focus:border-rose-500"
              >
                <option value="UNNOTIFIED">⚠️ Vi phạm / Sự kiện chưa gửi thông báo</option>
                <option value="THIS_WEEK">📅 Rèn luyện trong tuần này</option>
                <option value="THIS_MONTH">🗓️ Rèn luyện trong tháng này</option>
                <option value="ALL_APPROVED">🌟 Toàn bộ lịch sử đã duyệt</option>
                <option value="CUSTOM_DATE">⏱️ Tùy chọn khoảng ngày...</option>
              </select>
            </div>
          </div>

          {/* Custom Date Range if selected */}
          {scope === 'CUSTOM_DATE' && (
            <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Từ ngày</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Đến ngày</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs bg-white"
                />
              </div>
            </div>
          )}

          {/* Quick Metrics Summary Banner */}
          <div className="grid grid-cols-4 gap-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <div className="text-center">
              <div className="text-[10px] font-bold text-slate-500">Số sự kiện</div>
              <div className="text-sm font-black text-slate-800">{metrics.count}</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] font-bold text-emerald-600">+ Điểm thưởng</div>
              <div className="text-sm font-black text-emerald-700">+{metrics.plus}đ</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] font-bold text-rose-600">- Điểm trừ</div>
              <div className="text-sm font-black text-rose-700">-{metrics.minus}đ</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] font-bold text-blue-600">Điểm ròng</div>
              <div className={`text-sm font-black ${metrics.net >= 0 ? 'text-blue-700' : 'text-rose-700'}`}>
                {metrics.net >= 0 ? `+${metrics.net}` : metrics.net}đ
              </div>
            </div>
          </div>

          {/* Step 3: Transaction List with Checkboxes */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <span>3. Danh sách sự kiện đính kèm ({selectedTxIds.length}/{scopedTransactions.length} đã chọn)</span>
              </label>
              {scopedTransactions.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-xs font-bold text-rose-600 hover:underline cursor-pointer"
                >
                  {selectedTxIds.length === scopedTransactions.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                </button>
              )}
            </div>

            <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 bg-white">
              {scopedTransactions.length > 0 ? (
                scopedTransactions.map((tx) => {
                  const isChecked = selectedTxIds.includes(tx.id);
                  const isNotified = tx.parentNotificationStatus === 'SENT';

                  return (
                    <div
                      key={tx.id}
                      onClick={() => handleToggleTx(tx.id)}
                      className={`flex items-center justify-between p-2.5 hover:bg-slate-50 cursor-pointer text-xs transition-colors ${
                        isChecked ? 'bg-rose-50/40' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 shrink-0 pointer-events-none"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 truncate">{tx.reason}</span>
                            <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-semibold text-slate-600 shrink-0">
                              {tx.category}
                            </span>
                            {isNotified && (
                              <span className="rounded bg-blue-50 text-blue-700 px-1.5 py-0.2 text-[9px] font-bold shrink-0 border border-blue-200">
                                Đã gửi trước đó
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {tx.eventDate || tx.createdAt} • Người duyệt: {tx.approvedBy || 'GVCN'}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 ml-3">
                        <span
                          className={`rounded-lg px-2 py-0.5 text-xs font-black ${
                            tx.points >= 0
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {tx.points > 0 ? `+${tx.points}` : tx.points}đ
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 text-center text-xs text-slate-400 italic">
                  Không có bản ghi nào phù hợp với phạm vi đã chọn.
                </div>
              )}
            </div>
          </div>

          {/* Step 4: Preview & Edit Message */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              4. Nội dung tin nhắn gửi Phụ huynh (Có thể chỉnh sửa)
            </label>
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={7}
              className="w-full rounded-2xl border border-slate-300 p-3 text-xs text-slate-900 font-medium leading-relaxed outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100 bg-white"
              required
            />
          </div>

          {/* Success Banner */}
          {sentSuccess && (
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 flex items-center gap-2 font-bold animate-fade-in">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Đã gửi báo cáo rèn luyện thành công đến Phụ huynh em {selectedStudent?.fullName}!</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            <span className="text-[11px] text-slate-500">
              * Tin nhắn sẽ xuất hiện trong mục <strong>Nhịp cầu phụ huynh (Chat 1-1)</strong>
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={isSending || !customMessage.trim()}
                className="flex items-center gap-2 rounded-xl bg-rose-600 px-6 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700 active:scale-95 disabled:opacity-50 cursor-pointer transition-all"
              >
                <Send className="h-4 w-4" />
                <span>{isSending ? 'Đang gửi...' : 'Gửi qua Chat 1-1'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
