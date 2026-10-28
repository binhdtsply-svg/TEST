/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Clock, Check, RotateCcw } from 'lucide-react';
import { PeriodTimeConfig } from '../../types';
import { academicService, DEFAULT_PERIOD_TIMES } from '../../services/AcademicService';

interface PeriodTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const PeriodTimeModal: React.FC<PeriodTimeModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [morningTimes, setMorningTimes] = useState<PeriodTimeConfig[]>([]);
  const [afternoonTimes, setAfternoonTimes] = useState<PeriodTimeConfig[]>([]);
  const [activeSession, setActiveSession] = useState<'morning' | 'afternoon'>('morning');

  useEffect(() => {
    if (isOpen) {
      const currentTimes = academicService.getPeriodTimes();
      setMorningTimes([...currentTimes.morning]);
      setAfternoonTimes([...currentTimes.afternoon]);
    }
  }, [isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleTimeChange = (
    session: 'morning' | 'afternoon',
    index: number,
    field: 'startTime' | 'endTime',
    value: string
  ) => {
    if (session === 'morning') {
      const updated = [...morningTimes];
      updated[index] = { ...updated[index], [field]: value };
      setMorningTimes(updated);
    } else {
      const updated = [...afternoonTimes];
      updated[index] = { ...updated[index], [field]: value };
      setAfternoonTimes(updated);
    }
  };

  const handleReset = () => {
    setMorningTimes([...DEFAULT_PERIOD_TIMES.morning]);
    setAfternoonTimes([...DEFAULT_PERIOD_TIMES.afternoon]);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    academicService.updatePeriodTimes({
      morning: morningTimes,
      afternoon: afternoonTimes
    });
    if (onSuccess) onSuccess();
    onClose();
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-600 font-bold">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Cấu Hình Thời Gian Tiết Học</h3>
              <p className="text-xs text-slate-500">Thiết lập khung giờ bắt đầu và kết thúc từng tiết</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-200 bg-slate-100/70 p-1">
          <button
            type="button"
            onClick={() => setActiveSession('morning')}
            className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all cursor-pointer ${
              activeSession === 'morning'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🌅 Buổi Sáng (Tiết 1 - 5)
          </button>
          <button
            type="button"
            onClick={() => setActiveSession('afternoon')}
            className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all cursor-pointer ${
              activeSession === 'afternoon'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🌇 Buổi Chiều (Tiết 1 - 5)
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="space-y-2.5">
            {(activeSession === 'morning' ? morningTimes : afternoonTimes).map((slot, idx) => (
              <div
                key={slot.period}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 bg-slate-50/60"
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-700 font-bold text-xs">
                    T{slot.period}
                  </span>
                  <span className="text-xs font-bold text-slate-700">
                    Tiết {slot.period}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={slot.startTime || ''}
                    onChange={(e) =>
                      handleTimeChange(activeSession, idx, 'startTime', e.target.value)
                    }
                    className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-800 outline-hidden focus:border-blue-500"
                    required
                  />
                  <span className="text-xs text-slate-400 font-bold">-</span>
                  <input
                    type="time"
                    value={slot.endTime || ''}
                    onChange={(e) =>
                      handleTimeChange(activeSession, idx, 'endTime', e.target.value)
                    }
                    className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-800 outline-hidden focus:border-blue-500"
                    required
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Khôi phục mặc định</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
              >
                <Check className="h-4 w-4" />
                <span>Lưu thay đổi</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
