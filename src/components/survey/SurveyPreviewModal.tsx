/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  Eye,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import { SurveyTemplate, SurveySection, SurveyQuestion } from '../../types';

interface SurveyPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: SurveyTemplate;
}

export const SurveyPreviewModal: React.FC<SurveyPreviewModalProps> = ({
  isOpen,
  onClose,
  template
}) => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [dummyAnswers, setDummyAnswers] = useState<Record<string, any>>({});
  const [dummyOtherText, setDummyOtherText] = useState<Record<string, string>>({});
  const [completed, setCompleted] = useState<boolean>(false);

  if (!isOpen) return null;

  const sections = template.sections || [];
  const currentSection = sections[currentStep] || sections[0];
  const totalSteps = sections.length;

  const handleSingleChoice = (qKey: string, opt: string) => {
    setDummyAnswers((prev) => ({
      ...prev,
      [qKey]: opt
    }));
  };

  const handleMultiChoice = (qKey: string, opt: string, maxSelections?: number) => {
    setDummyAnswers((prev) => {
      const currentList: string[] = Array.isArray(prev[qKey]) ? prev[qKey] : [];
      let nextList: string[];
      if (currentList.includes(opt)) {
        nextList = currentList.filter((item) => item !== opt);
      } else {
        if (maxSelections && currentList.length >= maxSelections) {
          alert(`Bạn chỉ được chọn tối đa ${maxSelections} phương án cho câu hỏi này.`);
          return prev;
        }
        nextList = [...currentList, opt];
      }
      return {
        ...prev,
        [qKey]: nextList
      };
    });
  };

  const handleTextChange = (qKey: string, val: string) => {
    setDummyAnswers((prev) => ({
      ...prev,
      [qKey]: val
    }));
  };

  const handleOtherTextChange = (qKey: string, val: string) => {
    setDummyOtherText((prev) => ({
      ...prev,
      [qKey]: val
    }));
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      setCompleted(true);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-xs animate-fade-in">
      <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Preview Banner Header */}
        <div className="shrink-0 bg-amber-500 px-4 py-2.5 text-white flex items-center justify-between text-xs font-bold shadow-xs">
          <div className="flex items-center gap-2 min-w-0">
            <Eye className="h-4 w-4 shrink-0" />
            <span className="truncate">CHẾ ĐỘ XEM TRƯỚC NHƯ HỌC VIÊN — KHÔNG LƯU DỮ LIỆU THẬT</span>
          </div>
          <span className="shrink-0 rounded-md bg-amber-600/60 px-2 py-0.5 text-[11px] font-mono">
            Phiên bản v{template.version} ({template.status})
          </span>
        </div>

        {/* Modal Header */}
        <div className="shrink-0 flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-3.5 bg-slate-50/60">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-extrabold text-slate-900 break-words leading-tight" title={template.title}>
              {template.title}
            </h2>
            {template.description && (
              <p className="text-xs text-slate-500 mt-0.5 leading-normal">{template.description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-full p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-all cursor-pointer"
            title="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step Indicator */}
        {totalSteps > 1 && !completed && (
          <div className="shrink-0 border-b border-slate-100 bg-slate-50 px-6 py-2.5 overflow-x-auto">
            <div className="flex items-center gap-2 min-w-max pb-0.5">
              {sections.map((sec, idx) => (
                <button
                  key={sec.id || idx}
                  type="button"
                  onClick={() => setCurrentStep(idx)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                    currentStep === idx
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  <span className="max-w-[180px] truncate">{sec.title || `Phần ${idx + 1}`}</span>
                  {dummyAnswers[sec.questions[0]?.key] && (
                    <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
          {completed ? (
            <div className="py-12 text-center space-y-4 animate-fade-in">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-900">Mô phỏng nộp bài thành công!</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Trong môi trường thực tế, học viên sẽ nhận được thông báo hoàn thành và câu trả lời sẽ được lưu trữ an toàn theo phiên bản v{template.version}.
              </p>
              <div className="pt-4 flex justify-center gap-3">
                <button
                  onClick={() => {
                    setCompleted(false);
                    setCurrentStep(0);
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Thực hiện lại từ đầu
                </button>
                <button
                  onClick={onClose}
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-all cursor-pointer shadow-xs"
                >
                  Đóng xem trước
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Section Header */}
              {currentSection && (
                <div className="rounded-xl bg-blue-50/60 p-4 border border-blue-100">
                  <h3 className="text-sm font-extrabold text-blue-900">{currentSection.title}</h3>
                  {currentSection.description && (
                    <p className="text-xs text-blue-700 mt-1">{currentSection.description}</p>
                  )}
                </div>
              )}

              {/* Questions List */}
              {(!currentSection || !currentSection.questions || currentSection.questions.length === 0) ? (
                <div className="py-10 text-center text-xs text-slate-400 italic">
                  Phần này chưa có câu hỏi nào.
                </div>
              ) : (
                <div className="space-y-5">
                  {currentSection.questions.map((q, qIdx) => {
                    const ansVal = dummyAnswers[q.key];
                    const otherVal = dummyOtherText[q.key] || '';
                    const isOtherSelected =
                      q.type === 'SINGLE_CHOICE'
                        ? ansVal === 'Khác'
                        : Array.isArray(ansVal) && ansVal.includes('Khác');

                    return (
                      <div
                        key={q.id || q.key || qIdx}
                        className="rounded-2xl border border-slate-200 bg-white p-4.5 shadow-xs space-y-3 hover:border-slate-300 transition-all"
                      >
                        {/* Question Title */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5 flex-wrap">
                              <span>
                                {qIdx + 1}. {q.title}
                              </span>
                              {q.required && (
                                <span className="text-rose-500 font-bold text-[11px]" title="Bắt buộc">
                                  *
                                </span>
                              )}
                              {q.visibility === 'TEACHER_ONLY' && (
                                <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                                  Chỉ GVCN xem
                                </span>
                              )}
                            </h4>
                            {q.description && (
                              <p className="text-[11px] text-slate-500 italic">{q.description}</p>
                            )}
                          </div>
                          {q.type === 'MULTI_CHOICE' && q.maxSelections && (
                            <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                              Chọn tối đa {q.maxSelections}
                            </span>
                          )}
                        </div>

                        {/* Question Inputs according to Type */}
                        {/* 1. SHORT_TEXT */}
                        {q.type === 'SHORT_TEXT' && (
                          <input
                            type="text"
                            placeholder="Nhập câu trả lời ngắn..."
                            value={ansVal || ''}
                            onChange={(e) => handleTextChange(q.key, e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                          />
                        )}

                        {/* 2. LONG_TEXT */}
                        {q.type === 'LONG_TEXT' && (
                          <textarea
                            rows={3}
                            placeholder="Nhập câu trả lời chi tiết / ý kiến của bạn..."
                            value={ansVal || ''}
                            onChange={(e) => handleTextChange(q.key, e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                          />
                        )}

                        {/* 3. SINGLE_CHOICE */}
                        {q.type === 'SINGLE_CHOICE' && (
                          <div className="space-y-2 pt-1">
                            {(q.options || []).map((opt) => (
                              <label
                                key={opt}
                                className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-xs cursor-pointer transition-all ${
                                  ansVal === opt
                                    ? 'border-blue-500 bg-blue-50/60 font-bold text-blue-900'
                                    : 'border-slate-200 bg-slate-50/40 text-slate-700 hover:bg-slate-100'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={q.key}
                                  checked={ansVal === opt}
                                  onChange={() => handleSingleChoice(q.key, opt)}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                                />
                                <span>{opt}</span>
                              </label>
                            ))}

                            {/* allowOther support */}
                            {q.allowOther && (
                              <div className="space-y-2">
                                <label
                                  className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-xs cursor-pointer transition-all ${
                                    isOtherSelected
                                      ? 'border-blue-500 bg-blue-50/60 font-bold text-blue-900'
                                      : 'border-slate-200 bg-slate-50/40 text-slate-700 hover:bg-slate-100'
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name={q.key}
                                    checked={isOtherSelected}
                                    onChange={() => handleSingleChoice(q.key, 'Khác')}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span>Khác</span>
                                </label>
                                {isOtherSelected && (
                                  <input
                                    type="text"
                                    placeholder="Vui lòng nhập nội dung cụ thể..."
                                    value={otherVal}
                                    onChange={(e) => handleOtherTextChange(q.key, e.target.value)}
                                    className="w-full rounded-xl border border-blue-300 bg-white p-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
                                    autoFocus
                                  />
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* 4. MULTI_CHOICE */}
                        {q.type === 'MULTI_CHOICE' && (
                          <div className="space-y-2 pt-1">
                            {(q.options || []).map((opt) => {
                              const checked = Array.isArray(ansVal) && ansVal.includes(opt);
                              return (
                                <label
                                  key={opt}
                                  className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-xs cursor-pointer transition-all ${
                                    checked
                                      ? 'border-blue-500 bg-blue-50/60 font-bold text-blue-900'
                                      : 'border-slate-200 bg-slate-50/40 text-slate-700 hover:bg-slate-100'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => handleMultiChoice(q.key, opt, q.maxSelections)}
                                    className="h-4 w-4 rounded-sm text-blue-600 focus:ring-blue-500"
                                  />
                                  <span>{opt}</span>
                                </label>
                              );
                            })}

                            {/* allowOther support */}
                            {q.allowOther && (
                              <div className="space-y-2">
                                <label
                                  className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-xs cursor-pointer transition-all ${
                                    isOtherSelected
                                      ? 'border-blue-500 bg-blue-50/60 font-bold text-blue-900'
                                      : 'border-slate-200 bg-slate-50/40 text-slate-700 hover:bg-slate-100'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isOtherSelected}
                                    onChange={() => handleMultiChoice(q.key, 'Khác', q.maxSelections)}
                                    className="h-4 w-4 rounded-sm text-blue-600 focus:ring-blue-500"
                                  />
                                  <span>Khác</span>
                                </label>
                                {isOtherSelected && (
                                  <input
                                    type="text"
                                    placeholder="Vui lòng nhập nội dung cụ thể..."
                                    value={otherVal}
                                    onChange={(e) => handleOtherTextChange(q.key, e.target.value)}
                                    className="w-full rounded-xl border border-blue-300 bg-white p-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
                                    autoFocus
                                  />
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* 5. DROPDOWN */}
                        {q.type === 'DROPDOWN' && (
                          <select
                            value={ansVal || ''}
                            onChange={(e) => handleTextChange(q.key, e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                          >
                            <option value="">-- Chọn một phương án --</option>
                            {(q.options || []).map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        )}

                        {/* 6. SCALE */}
                        {q.type === 'SCALE' && (
                          <div className="space-y-2 pt-1">
                            {q.scaleMode === 'CUSTOM' || (q.options && q.options.length > 0) ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                                {(q.options || []).map((level, idx) => {
                                  const isSelected = ansVal === level;
                                  return (
                                    <label
                                      key={idx}
                                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                                        isSelected
                                          ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                      }`}
                                    >
                                      <span className="text-xs break-words leading-relaxed">{level}</span>
                                      <input
                                        type="radio"
                                        name={q.key}
                                        checked={isSelected}
                                        onChange={() => handleSingleChoice(q.key, level)}
                                        className="sr-only"
                                      />
                                      {isSelected && <CheckCircle2 className="h-4 w-4 shrink-0 ml-1.5" />}
                                    </label>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold px-2">
                                  <span>{q.scaleMinLabel || `${q.scaleMin || 1} (Thấp / Kém)`}</span>
                                  <span>{q.scaleMaxLabel || `${q.scaleMax || 5} (Cao / Rất tốt)`}</span>
                                </div>
                                <div className="flex items-center justify-between gap-1.5 p-3 bg-slate-50/70 rounded-xl border border-slate-200 flex-wrap">
                                  {Array.from(
                                    { length: Math.max(1, (q.scaleMax ?? 5) - (q.scaleMin ?? 1) + 1) },
                                    (_, i) => (q.scaleMin ?? 1) + i
                                  ).map((val) => (
                                    <label
                                      key={val}
                                      className={`flex flex-col items-center justify-center p-2 rounded-lg cursor-pointer flex-1 min-w-[32px] transition-all border ${
                                        Number(ansVal) === val
                                          ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                                      }`}
                                    >
                                      <span className="text-xs font-bold">{val}</span>
                                      <input
                                        type="radio"
                                        name={q.key}
                                        checked={Number(ansVal) === val}
                                        onChange={() => handleSingleChoice(q.key, val as any)}
                                        className="sr-only"
                                      />
                                    </label>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* 7. DATE */}
                        {q.type === 'DATE' && (
                          <div className="pt-1">
                            <input
                              type="date"
                              value={ansVal || ''}
                              onChange={(e) => handleTextChange(q.key, e.target.value)}
                              className="w-full sm:w-64 rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                            />
                          </div>
                        )}

                        {/* 8. TIME */}
                        {q.type === 'TIME' && (
                          <div className="pt-1">
                            <input
                              type="time"
                              value={ansVal || ''}
                              onChange={(e) => handleTextChange(q.key, e.target.value)}
                              className="w-full sm:w-48 rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                            />
                          </div>
                        )}

                        {/* 9. DURATION */}
                        {q.type === 'DURATION' && (
                          <div className="pt-1">
                            <input
                              type="text"
                              placeholder="Ví dụ: 45 phút, 1 giờ 30 phút..."
                              value={ansVal || ''}
                              onChange={(e) => handleTextChange(q.key, e.target.value)}
                              className="w-full sm:w-72 rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                            />
                          </div>
                        )}

                        {/* 10. GRID */}
                        {(q.type === 'GRID' || q.type === 'GRID_SINGLE' || q.type === 'GRID_MULTI') &&
                          (q.gridRows || q.rows) &&
                          (q.gridColumns || q.columns) && (() => {
                            const gRows = q.gridRows || q.rows || [];
                            const gCols = q.gridColumns || q.columns || [];
                            return (
                              <div className="overflow-x-auto rounded-xl border border-slate-200 mt-2">
                                <table className="w-full text-left text-xs">
                                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                                    <tr>
                                      <th className="p-3">Nội dung</th>
                                      {gCols.map((col, cIdx) => (
                                        <th key={cIdx} className="p-3 text-center">
                                          {col}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 bg-white">
                                    {gRows.map((row, rIdx) => (
                                      <tr key={rIdx} className="hover:bg-slate-50">
                                        <td className="p-3 font-medium text-slate-800">{row}</td>
                                        {gCols.map((col, cIdx) => (
                                          <td key={cIdx} className="p-3 text-center">
                                            <input
                                              type={q.type === 'GRID_MULTI' ? 'checkbox' : 'radio'}
                                              name={`${q.key}_row_${rIdx}`}
                                              className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                                            />
                                          </td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            );
                          })()}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        {!completed && (
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-6 py-4">
            <button
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition-all cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Quay lại</span>
            </button>

            <div className="text-xs text-slate-500 font-semibold">
              Phần {currentStep + 1} / {totalSteps || 1}
            </div>

            <button
              onClick={handleNext}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-all cursor-pointer shadow-xs"
            >
              <span>{currentStep === totalSteps - 1 ? 'Mô phỏng nộp phiếu' : 'Tiếp tục'}</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
