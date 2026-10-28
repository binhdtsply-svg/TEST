/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sliders, X, Save, RotateCcw, AlertTriangle, ShieldCheck, Info } from 'lucide-react';
import { GraduationRuleConfig } from '../../types';
import { graduationService, DEFAULT_GRADUATION_RULE_CONFIG } from '../../services/GraduationService';

interface GraduationRuleConfigModalProps {
  onClose: () => void;
}

export const GraduationRuleConfigModal: React.FC<GraduationRuleConfigModalProps> = ({ onClose }) => {
  const currentConfig = graduationService.getRuleConfig();

  const [documentName, setDocumentName] = useState(currentConfig.officialDocumentName);
  const [sourceUrl, setSourceUrl] = useState(currentConfig.officialSourceUrl);
  const [grade10Weight, setGrade10Weight] = useState(String(currentConfig.grade10Weight ?? 1));
  const [grade11Weight, setGrade11Weight] = useState(String(currentConfig.grade11Weight ?? 2));
  const [grade12Weight, setGrade12Weight] = useState(String(currentConfig.grade12Weight ?? 3));
  const [examWeight, setExamWeight] = useState(String((currentConfig.examWeight ?? 0.5) * 100));
  const [transcriptWeight, setTranscriptWeight] = useState(String((currentConfig.transcriptWeight ?? 0.5) * 100));
  const [minimumScore, setMinimumScore] = useState(String(currentConfig.minimumGraduationScore ?? 5.0));
  const [deadPoint, setDeadPoint] = useState(String(currentConfig.minimumSubjectScore ?? 1.0));

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const w10 = parseFloat(grade10Weight) || 1;
    const w11 = parseFloat(grade11Weight) || 2;
    const w12 = parseFloat(grade12Weight) || 3;
    const ew = (parseFloat(examWeight) || 50) / 100;
    const tw = (parseFloat(transcriptWeight) || 50) / 100;
    const minPass = parseFloat(minimumScore) || 5.0;
    const minSub = parseFloat(deadPoint) || 1.0;

    graduationService.updateRuleConfig({
      officialDocumentName: documentName,
      officialSourceUrl: sourceUrl,
      grade10Weight: w10,
      grade11Weight: w11,
      grade12Weight: w12,
      examWeight: ew,
      transcriptWeight: tw,
      minimumGraduationScore: minPass,
      minimumSubjectScore: minSub
    });

    onClose();
  };

  const handleReset = () => {
    if (confirm('Khôi phục công thức và trọng số về mặc định chuẩn Bộ GD&ĐT (10:1, 11:2, 12:3, thi 50%, học bạ 50%)?')) {
      graduationService.resetRuleConfig();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
      <div className="relative flex max-h-[90vh] w-full max-w-xl flex-col rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-2xs">
              <Sliders className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">
                CẤU HÌNH QUY CHẾ & TRỌNG SỐ XÉT TỐT NGHIỆP
              </h3>
              <p className="text-[11px] text-slate-500">
                Tự động tính toán lại toàn bộ điểm xét tốt nghiệp cả lớp theo cấu hình này
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="overflow-y-auto p-6 space-y-4 text-xs">
          {/* Document & Source */}
          <div className="space-y-2">
            <label className="font-black text-slate-800 uppercase tracking-tight block">
              VĂN BẢN QUY PHẠM & CỔNG NGUỒN
            </label>
            <input
              type="text"
              value={documentName}
              onChange={e => setDocumentName(e.target.value)}
              placeholder="Tên văn bản / Thông tư quy chế..."
              className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-bold"
            />
            <input
              type="text"
              value={sourceUrl}
              onChange={e => setSourceUrl(e.target.value)}
              placeholder="Đường dẫn nguồn chính thức (URL)..."
              className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-blue-600"
            />
          </div>

          {/* GPA 3 years weights */}
          <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200 space-y-2">
            <span className="font-black text-slate-800 uppercase tracking-tight block">
              TRỌNG SỐ ĐIỂM HỌC BẠ (LỚP 10 - 11 - 12)
            </span>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600">Hệ số Lớp 10</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={grade10Weight}
                  onChange={e => setGrade10Weight(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs font-black text-center"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600">Hệ số Lớp 11</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={grade11Weight}
                  onChange={e => setGrade11Weight(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs font-black text-center"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600">Hệ số Lớp 12</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={grade12Weight}
                  onChange={e => setGrade12Weight(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs font-black text-center"
                />
              </div>
            </div>
            <p className="text-[10px] text-slate-500">
              Công thức hiện tại: (ĐTB10 × {grade10Weight} + ĐTB11 × {grade11Weight} + ĐTB12 × {grade12Weight}) ÷{' '}
              {(parseFloat(grade10Weight) || 1) + (parseFloat(grade11Weight) || 2) + (parseFloat(grade12Weight) || 3)}
            </p>
          </div>

          {/* Exam vs Transcript Weight */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 rounded-xl bg-blue-50/50 p-3 border border-blue-200">
              <label className="text-[11px] font-black text-blue-900 block">TỶ LỆ ĐIỂM THI (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={examWeight}
                onChange={e => setExamWeight(e.target.value)}
                className="w-full rounded-lg border border-blue-300 bg-white p-2 text-xs font-black text-blue-900"
              />
              <span className="text-[10px] text-slate-500">Mặc định: 50%</span>
            </div>

            <div className="space-y-1 rounded-xl bg-indigo-50/50 p-3 border border-indigo-200">
              <label className="text-[11px] font-black text-indigo-900 block">TỶ LỆ HỌC BẠ (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={transcriptWeight}
                onChange={e => setTranscriptWeight(e.target.value)}
                className="w-full rounded-lg border border-indigo-300 bg-white p-2 text-xs font-black text-indigo-900"
              />
              <span className="text-[10px] text-slate-500">Mặc định: 50%</span>
            </div>
          </div>

          {/* Pass Score & Dead Point */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 block">Điểm sàn xét tốt nghiệp (ĐXTN)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={minimumScore}
                onChange={e => setMinimumScore(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2 text-xs font-bold"
              />
              <span className="text-[10px] text-slate-400">Quy định: Từ 5.00 trở lên</span>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 block">Mức điểm liệt mỗi môn</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={deadPoint}
                onChange={e => setDeadPoint(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2 text-xs font-bold text-rose-600"
              />
              <span className="text-[10px] text-slate-400">Quy chế: Môn &le; 1.0đ là điểm liệt</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Khôi phục mặc định</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 active:scale-95 transition-all cursor-pointer"
              >
                <Save className="h-4 w-4" />
                <span>Lưu cấu hình</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
