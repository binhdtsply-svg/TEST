/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Palette, X, RotateCcw, Check, Sparkles } from 'lucide-react';
import { academicService, DEFAULT_SUBJECT_COLORS } from '../../services/AcademicService';

interface SubjectColorConfigModalProps {
  onClose: () => void;
  onRefresh: () => void;
}

export const PASTEL_COLOR_PRESETS: Array<{ bg: string; border: string; text: string; label: string; swatch: string }> = [
  { bg: 'bg-blue-50/90', border: 'border-blue-300', text: 'text-blue-950', label: 'Xanh dương pastel', swatch: 'bg-blue-100 border-blue-400' },
  { bg: 'bg-purple-50/90', border: 'border-purple-300', text: 'text-purple-950', label: 'Tím pastel', swatch: 'bg-purple-100 border-purple-400' },
  { bg: 'bg-indigo-50/90', border: 'border-indigo-300', text: 'text-indigo-950', label: 'Chàm pastel', swatch: 'bg-indigo-100 border-indigo-400' },
  { bg: 'bg-cyan-50/90', border: 'border-cyan-300', text: 'text-cyan-950', label: 'Cyan pastel', swatch: 'bg-cyan-100 border-cyan-400' },
  { bg: 'bg-teal-50/90', border: 'border-teal-300', text: 'text-teal-950', label: 'Xanh ngọc pastel', swatch: 'bg-teal-100 border-teal-400' },
  { bg: 'bg-emerald-50/90', border: 'border-emerald-300', text: 'text-emerald-950', label: 'Lục pastel', swatch: 'bg-emerald-100 border-emerald-400' },
  { bg: 'bg-amber-50/90', border: 'border-amber-300', text: 'text-amber-950', label: 'Vàng nhạt pastel', swatch: 'bg-amber-100 border-amber-400' },
  { bg: 'bg-orange-50/90', border: 'border-orange-300', text: 'text-orange-950', label: 'Cam nhạt pastel', swatch: 'bg-orange-100 border-orange-400' },
  { bg: 'bg-violet-50/90', border: 'border-violet-300', text: 'text-violet-950', label: 'Tím hoa cà pastel', swatch: 'bg-violet-100 border-violet-400' },
  { bg: 'bg-rose-50/90', border: 'border-rose-300', text: 'text-rose-950', label: 'Hồng pastel', swatch: 'bg-rose-100 border-rose-400' },
  { bg: 'bg-lime-50/90', border: 'border-lime-300', text: 'text-lime-950', label: 'Xanh cốm pastel', swatch: 'bg-lime-100 border-lime-400' },
  { bg: 'bg-slate-100', border: 'border-slate-300', text: 'text-slate-800', label: 'Xám sáng pastel', swatch: 'bg-slate-200 border-slate-400' }
];

export const SubjectColorConfigModal: React.FC<SubjectColorConfigModalProps> = ({ onClose, onRefresh }) => {
  const [subjectColors, setSubjectColors] = useState(academicService.getSubjectColors());

  const handleSelectColor = (subject: string, preset: (typeof PASTEL_COLOR_PRESETS)[0]) => {
    const updated = {
      ...subjectColors,
      [subject]: {
        bg: preset.bg,
        border: preset.border,
        text: preset.text,
        label: preset.label
      }
    };
    setSubjectColors(updated);
    academicService.updateSubjectColor(subject, {
      bg: preset.bg,
      border: preset.border,
      text: preset.text,
      label: preset.label
    });
    onRefresh();
  };

  const handleReset = () => {
    if (confirm('Khôi phục toàn bộ màu môn học về mặc định pastel chuẩn?')) {
      academicService.resetSubjectColors();
      setSubjectColors(academicService.getSubjectColors());
      onRefresh();
    }
  };

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-600 text-white shadow-2xs">
              <Palette className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">
                CẤU HÌNH MÀU MÔN HỌC THỜI KHÓA BIỂU
              </h3>
              <p className="text-[11px] text-slate-500">
                Tùy chỉnh tông màu pastel trang nhã cho từng môn học trên bảng Thời khóa biểu
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-4 text-xs">
          <div className="rounded-xl bg-blue-50/60 p-3 border border-blue-100 text-slate-700 leading-relaxed">
            Màu sắc được thiết kế theo nguyên tắc pastel dịu mắt, độ tương phản cao với chữ đậm rõ nét trên nền trắng.
          </div>

          <div className="space-y-3 divide-y divide-slate-100">
            {(Object.entries(subjectColors) as [string, { bg: string; border: string; text: string; label: string }][]).map(([subject, currentSetting]) => (
              <div key={subject} className="pt-3 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-[160px]">
                  <div className={`inline-block rounded-lg px-2.5 py-1 text-xs font-bold border ${currentSetting.bg} ${currentSetting.border} ${currentSetting.text}`}>
                    {subject}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{currentSetting.label || 'Tùy chỉnh'}</div>
                </div>

                {/* Swatches */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {PASTEL_COLOR_PRESETS.map((preset, idx) => {
                    const isSelected = currentSetting.bg === preset.bg;
                    return (
                      <button
                        key={idx}
                        onClick={() => handleSelectColor(subject, preset)}
                        title={preset.label}
                        className={`h-6 w-6 rounded-md border transition-all flex items-center justify-center cursor-pointer ${preset.swatch} ${
                          isSelected ? 'ring-2 ring-blue-600 scale-110 shadow-xs' : 'hover:scale-105'
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3 text-slate-900 stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Khôi phục màu mặc định</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700 active:scale-95 transition-all shadow-xs cursor-pointer"
          >
            Hoàn tất
          </button>
        </div>
      </div>
    </div>
  );
};
