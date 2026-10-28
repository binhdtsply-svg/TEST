/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Save,
  AlertCircle,
  Clock,
  ShieldAlert,
  User,
  Sparkles,
  Lock,
  Info,
  Check,
  HelpCircle,
  FileText
} from 'lucide-react';
import { authService } from '../../services/AuthService';
import { classService } from '../../services/ClassService';
import { studentService } from '../../services/StudentService';
import { studentSurveyService, createDefaultSurveyAnswers } from '../../services/StudentSurveyService';
import { surveyTemplateService } from '../../services/SurveyTemplateService';
import { surveySyncService } from '../../services/SurveySyncService';
import { SurveyTemplate, SurveySection, SurveyQuestion, StudentSurveyResponse } from '../../types';

interface StudentSurveyFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitted: () => void;
  template?: SurveyTemplate | null;
  templateId?: string;
}

// Helpers for nested/flat key access
const getAnswerValue = (answers: any, key: string): any => {
  if (!answers) return undefined;
  if (answers[key] !== undefined) return answers[key];
  if (!key.includes('.')) return undefined;
  const parts = key.split('.');
  let curr = answers;
  for (const p of parts) {
    if (curr === undefined || curr === null) return undefined;
    curr = curr[p];
  }
  return curr;
};

const setAnswerValue = (answers: any, key: string, val: any): any => {
  if (!key.includes('.')) {
    return { ...answers, [key]: val };
  }
  const parts = key.split('.');
  const root = { ...answers };
  let curr = root;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    curr[part] = curr[part] ? { ...curr[part] } : {};
    curr = curr[part];
  }
  curr[parts[parts.length - 1]] = val;
  return root;
};

export const StudentSurveyFormModal: React.FC<StudentSurveyFormModalProps> = ({
  isOpen,
  onClose,
  onSubmitted,
  template: propTemplate,
  templateId
}) => {
  const currentUser = authService.getCurrentUser();
  const classSettings = classService.getSettings();
  const studentProfile = currentUser.studentId ? studentService.getById(currentUser.studentId) : null;

  // Resolve template
  const [resolvedTemplate, setResolvedTemplate] = useState<SurveyTemplate | null>(() => {
    if (propTemplate) return propTemplate;
    if (templateId) {
      return surveyTemplateService.getById(templateId) || null;
    }
    return surveyTemplateService.getPublishedTemplate() || null;
  });

  const [currentStep, setCurrentStep] = useState<number>(0);
  const [answers, setAnswers] = useState<any>(() => createDefaultSurveyAnswers());
  const [otherTextMap, setOtherTextMap] = useState<Record<string, string>>({});
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedTime, setLastSavedTime] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isSubmitSuccess, setIsSubmitSuccess] = useState<boolean>(false);
  const [submittedAt, setSubmittedAt] = useState<string>('');
  const [consentConfirmed, setConsentConfirmed] = useState<boolean>(false);

  const autosaveTimeoutRef = useRef<any>(null);

  // Sync template if props change
  useEffect(() => {
    if (propTemplate) {
      setResolvedTemplate(propTemplate);
    } else if (templateId) {
      const found = surveyTemplateService.getById(templateId);
      if (found) setResolvedTemplate(found);
    }
  }, [propTemplate, templateId]);

  // Load existing draft or create new draft for this specific template
  useEffect(() => {
    if (!currentUser.studentId || !resolvedTemplate) return;

    try {
      const targetTemplateId = resolvedTemplate.id;
      const existing = studentSurveyService.createDraft(
        (resolvedTemplate.surveyType as any) || 'GRADE12_START_YEAR',
        targetTemplateId
      );

      if (existing && existing.answers) {
        setAnswers(existing.answers);
        if (existing.answers.otherText) {
          setOtherTextMap(existing.answers.otherText);
        }
        if (existing.answers.consent?.confirmed) {
          setConsentConfirmed(true);
        }
        if (existing.status === 'SUBMITTED' || existing.status === 'REVIEWED') {
          setIsSubmitSuccess(true);
          setSubmittedAt(existing.submittedAt || existing.updatedAt);
        }
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'Lỗi khởi tạo khảo sát');
    }
  }, [currentUser.studentId, resolvedTemplate?.id]);

  if (!isOpen || !resolvedTemplate) return null;

  const sections: SurveySection[] = resolvedTemplate.sections || [];
  // Ensure at least one section exists if empty
  const activeSections = sections.length > 0 ? sections : [
    {
      id: 'sec-default',
      title: 'Nội dung khảo sát',
      order: 1,
      questions: []
    }
  ];

  const totalSteps = activeSections.length + 1; // last step is summary / consent
  const isFinalStep = currentStep === activeSections.length;
  const currentSection = activeSections[currentStep];

  // Debounced auto-save handler
  const triggerAutoSave = (updatedAnswers: any, updatedOtherText: Record<string, string>) => {
    if (!currentUser.studentId || isSubmitSuccess) return;

    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }

    setSaveStatus('saving');
    autosaveTimeoutRef.current = setTimeout(() => {
      try {
        const payload = {
          ...updatedAnswers,
          otherText: updatedOtherText,
          consent: {
            confirmed: consentConfirmed
          }
        };

        studentSurveyService.saveDraft(
          payload,
          (resolvedTemplate.surveyType as any) || 'GRADE12_START_YEAR',
          resolvedTemplate.id
        );

        setSaveStatus('saved');
        const now = new Date();
        setLastSavedTime(
          now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        );
      } catch (err: any) {
        console.warn('Autosave error:', err);
        setSaveStatus('error');
      }
    }, 800);
  };

  const handleUpdateField = (key: string, val: any) => {
    const updated = setAnswerValue(answers, key, val);
    setAnswers(updated);
    setErrorMessage('');
    triggerAutoSave(updated, otherTextMap);
  };

  const handleUpdateOtherText = (qKey: string, text: string) => {
    const updatedOther = { ...otherTextMap, [qKey]: text };
    setOtherTextMap(updatedOther);
    triggerAutoSave(answers, updatedOther);
  };

  const handleMultiChoiceToggle = (key: string, option: string, maxSelections?: number) => {
    const currentList: string[] = getAnswerValue(answers, key) || [];
    let nextList: string[];

    if (currentList.includes(option)) {
      nextList = currentList.filter((item) => item !== option);
    } else {
      if (maxSelections && currentList.length >= maxSelections) {
        setErrorMessage(`Bạn chỉ được chọn tối đa ${maxSelections} phương án cho câu hỏi này.`);
        return;
      }
      nextList = [...currentList, option];
    }

    handleUpdateField(key, nextList);
  };

  // Validation before going to next section
  const validateCurrentSection = (): boolean => {
    if (isFinalStep) {
      if (!consentConfirmed) {
        setErrorMessage('Vui lòng tích chọn xác nhận & cam kết thông tin trước khi nộp phiếu.');
        return false;
      }
      return true;
    }

    if (!currentSection) return true;

    for (const q of currentSection.questions) {
      if (q.visibility === 'TEACHER_ONLY') continue;
      if (q.required) {
        const val = getAnswerValue(answers, q.key || q.id);
        if (val === undefined || val === null || val === '') {
          setErrorMessage(`Vui lòng trả lời câu hỏi bắt buộc: "${q.title}"`);
          return false;
        }
        if (Array.isArray(val) && val.length === 0) {
          setErrorMessage(`Vui lòng chọn ít nhất 1 phương án cho câu hỏi: "${q.title}"`);
          return false;
        }
      }
    }

    return true;
  };

  const handleNextStep = () => {
    if (validateCurrentSection()) {
      setErrorMessage('');
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps - 1));
    }
  };

  const handlePrevStep = () => {
    setErrorMessage('');
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleManualSaveDraft = () => {
    if (!currentUser.studentId) return;
    try {
      setSaveStatus('saving');
      const payload = {
        ...answers,
        otherText: otherTextMap,
        consent: {
          confirmed: consentConfirmed
        }
      };

      studentSurveyService.saveDraft(
        payload,
        (resolvedTemplate.surveyType as any) || 'GRADE12_START_YEAR',
        resolvedTemplate.id
      );

      setSaveStatus('saved');
      const now = new Date();
      setLastSavedTime(
        now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
      setErrorMessage('');
    } catch (e: any) {
      setSaveStatus('error');
      setErrorMessage(e.message || 'Lỗi khi lưu bản nháp');
    }
  };

  const handleSubmitFinal = () => {
    if (!consentConfirmed) {
      setErrorMessage('Vui lòng tích chọn xác nhận và cam kết thông tin trước khi nộp phiếu.');
      return;
    }

    try {
      const payload = {
        ...answers,
        otherText: otherTextMap,
        consent: {
          confirmed: true
        }
      };

      const result = studentSurveyService.submitSurvey(
        payload,
        (resolvedTemplate.surveyType as any) || 'GRADE12_START_YEAR',
        resolvedTemplate.id
      );

      setIsSubmitSuccess(true);
      setSubmittedAt(result.submittedAt || new Date().toISOString());

      // Trigger automatic background survey processing
      surveySyncService.processSurvey(result.id, { force: false }).catch(() => {});

      if (onSubmitted) {
        onSubmitted();
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'Lỗi khi gửi phiếu khảo sát');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-2 sm:p-4 backdrop-blur-xs animate-fade-in">
      <div className="relative flex h-[94vh] sm:h-auto max-h-[94vh] sm:max-h-[92vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Modal Header */}
        <div className="shrink-0 flex items-center justify-between gap-3 border-b border-slate-200 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 px-5 py-3.5 text-white">
          <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur-xs text-white shadow-xs">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="rounded-md bg-white/20 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white shrink-0">
                  Phiếu Khảo Sát
                </span>
                <span className="text-xs text-blue-100 font-medium truncate">
                  {classSettings.className} • {classSettings.academicYear}
                </span>
              </div>
              <h2 
                className="text-sm sm:text-base font-bold text-white break-words leading-tight mt-0.5"
                title={resolvedTemplate.title}
              >
                {resolvedTemplate.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Autosave badge */}
            <div className="hidden md:flex items-center gap-1.5 text-xs text-blue-100 bg-black/15 px-3 py-1 rounded-full">
              {saveStatus === 'saving' ? (
                <>
                  <div className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                  <span>Đang tự động lưu...</span>
                </>
              ) : saveStatus === 'saved' ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-300" />
                  <span>Đã lưu {lastSavedTime ? `(${lastSavedTime})` : ''}</span>
                </>
              ) : (
                <>
                  <Clock className="h-3.5 w-3.5 text-blue-200" />
                  <span>Tự động lưu nháp</span>
                </>
              )}
            </div>

            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-white/80 hover:bg-white/20 hover:text-white transition-all cursor-pointer"
              title="Đóng"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Success Screen */}
        {isSubmitSuccess ? (
          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col items-center justify-center p-8 sm:p-12 text-center space-y-5 animate-fade-in my-auto">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-inner">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            
            <div className="space-y-2 max-w-md">
              <h3 className="text-xl font-extrabold text-slate-900">
                Nộp phiếu khảo sát thành công!
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Cảm ơn em <strong>{studentProfile?.fullName || currentUser.name}</strong> đã hoàn thành bài khảo sát{' '}
                <strong>"{resolvedTemplate.title}"</strong>. Dữ liệu đã được chuyển an toàn tới Giáo viên Chủ nhiệm.
              </p>
              {submittedAt && (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 font-medium mt-2">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  <span>Thời gian nộp: {new Date(submittedAt).toLocaleString('vi-VN')}</span>
                </div>
              )}
            </div>

            <div className="pt-4">
              <button
                onClick={onClose}
                className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-blue-700 transition-all cursor-pointer"
              >
                Đóng biểu mẫu
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Step Stepper Progress Bar */}
            <div className="shrink-0 border-b border-slate-200 bg-slate-50 px-4 sm:px-5 py-2.5 overflow-x-auto">
              <div className="flex items-center gap-2 min-w-max pb-0.5">
                {activeSections.map((sec, idx) => {
                  const isActive = currentStep === idx;
                  const isPassed = currentStep > idx;

                  return (
                    <button
                      key={sec.id || idx}
                      type="button"
                      onClick={() => {
                        if (idx < currentStep || validateCurrentSection()) {
                          setErrorMessage('');
                          setCurrentStep(idx);
                        }
                      }}
                      className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-xs'
                          : isPassed
                          ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span
                        className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                          isActive
                            ? 'bg-white text-blue-600'
                            : isPassed
                            ? 'bg-blue-200 text-blue-800'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {isPassed ? <Check className="h-3 w-3" /> : idx + 1}
                      </span>
                      <span className="max-w-[160px] sm:max-w-[220px] truncate">{sec.title}</span>
                    </button>
                  );
                })}

                {/* Final Step Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (validateCurrentSection()) {
                      setErrorMessage('');
                      setCurrentStep(activeSections.length);
                    }
                  }}
                  className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    isFinalStep
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>Xác nhận & Nộp</span>
                </button>
              </div>
            </div>

            {/* Error banner */}
            {errorMessage && (
              <div className="shrink-0 mx-5 mt-3 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-800 border border-rose-200 animate-fade-in">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Scrollable Questions Body */}
            <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-7 space-y-6">
              {!isFinalStep && currentSection ? (
                <div className="space-y-6 animate-fade-in">
                  {/* Section Title & Description */}
                  <div className="rounded-xl bg-blue-50/70 p-4 border border-blue-100">
                    <h3 className="text-sm font-extrabold text-blue-900">
                      Phần {currentStep + 1}: {currentSection.title}
                    </h3>
                    {currentSection.description && (
                      <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                        {currentSection.description}
                      </p>
                    )}
                  </div>

                  {/* Section Questions */}
                  {currentSection.questions && currentSection.questions.length > 0 ? (
                    currentSection.questions
                      .filter((q) => q.visibility !== 'TEACHER_ONLY')
                      .map((q, qIdx) => {
                        const qKey = q.key || q.id;
                        const value = getAnswerValue(answers, qKey);
                        const otherVal = otherTextMap[qKey] || '';

                        return (
                          <div
                            key={q.id || qIdx}
                            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3 transition-all hover:border-blue-200"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <label className="text-xs font-extrabold text-slate-900 leading-snug">
                                <span className="text-blue-600 mr-1.5">{qIdx + 1}.</span>
                                {q.title}
                                {q.required && <span className="text-rose-500 ml-1 font-bold">*</span>}
                              </label>
                            </div>

                            {q.description && (
                              <p className="text-[11px] text-slate-500">{q.description}</p>
                            )}

                            {/* Question Type: SHORT_TEXT */}
                            {q.type === 'SHORT_TEXT' && (
                              <input
                                type="text"
                                value={value || ''}
                                onChange={(e) => handleUpdateField(qKey, e.target.value)}
                                placeholder="Nhập câu trả lời của em..."
                                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none transition-all"
                              />
                            )}

                            {/* Question Type: LONG_TEXT */}
                            {q.type === 'LONG_TEXT' && (
                              <textarea
                                rows={3}
                                value={value || ''}
                                onChange={(e) => handleUpdateField(qKey, e.target.value)}
                                placeholder="Nhập câu trả lời chi tiết của em..."
                                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none transition-all resize-none"
                              />
                            )}

                            {/* Question Type: SINGLE_CHOICE */}
                            {q.type === 'SINGLE_CHOICE' && (
                              <div className="space-y-2">
                                {(q.options || []).map((opt, optIdx) => {
                                  const isSelected = value === opt;
                                  return (
                                    <label
                                      key={optIdx}
                                      className={`flex items-center gap-3 rounded-xl border p-3 text-xs font-medium cursor-pointer transition-all ${
                                        isSelected
                                          ? 'border-blue-500 bg-blue-50/60 text-blue-950 font-bold shadow-xs'
                                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                      }`}
                                    >
                                      <input
                                        type="radio"
                                        name={`radio-${q.id}`}
                                        checked={isSelected}
                                        onChange={() => handleUpdateField(qKey, opt)}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                                      />
                                      <span>{opt}</span>
                                    </label>
                                  );
                                })}

                                {q.allowOther && (
                                  <div className="pt-1">
                                    <label
                                      className={`flex items-center gap-3 rounded-xl border p-3 text-xs font-medium cursor-pointer transition-all ${
                                        value === 'Khác'
                                          ? 'border-blue-500 bg-blue-50/60 text-blue-950 font-bold'
                                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                      }`}
                                    >
                                      <input
                                        type="radio"
                                        name={`radio-${q.id}`}
                                        checked={value === 'Khác'}
                                        onChange={() => handleUpdateField(qKey, 'Khác')}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                                      />
                                      <span>Khác:</span>
                                    </label>
                                    {value === 'Khác' && (
                                      <input
                                        type="text"
                                        value={otherVal}
                                        onChange={(e) => handleUpdateOtherText(qKey, e.target.value)}
                                        placeholder="Vui lòng nêu cụ thể ý kiến khác của em..."
                                        className="mt-2 w-full rounded-xl border border-blue-300 bg-white px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                                        autoFocus
                                      />
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Question Type: MULTI_CHOICE */}
                            {q.type === 'MULTI_CHOICE' && (
                              <div className="space-y-2">
                                {(q.options || []).map((opt, optIdx) => {
                                  const list: string[] = Array.isArray(value) ? value : [];
                                  const isChecked = list.includes(opt);

                                  return (
                                    <label
                                      key={optIdx}
                                      className={`flex items-center gap-3 rounded-xl border p-3 text-xs font-medium cursor-pointer transition-all ${
                                        isChecked
                                          ? 'border-blue-500 bg-blue-50/60 text-blue-950 font-bold shadow-xs'
                                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => handleMultiChoiceToggle(qKey, opt, q.maxSelections)}
                                        className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                                      />
                                      <span>{opt}</span>
                                    </label>
                                  );
                                })}

                                {q.allowOther && (
                                  <div className="pt-1">
                                    <label
                                      className={`flex items-center gap-3 rounded-xl border p-3 text-xs font-medium cursor-pointer transition-all ${
                                        Array.isArray(value) && value.includes('Khác')
                                          ? 'border-blue-500 bg-blue-50/60 text-blue-950 font-bold'
                                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={Array.isArray(value) && value.includes('Khác')}
                                        onChange={() => handleMultiChoiceToggle(qKey, 'Khác', q.maxSelections)}
                                        className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                                      />
                                      <span>Khác:</span>
                                    </label>
                                    {Array.isArray(value) && value.includes('Khác') && (
                                      <input
                                        type="text"
                                        value={otherVal}
                                        onChange={(e) => handleUpdateOtherText(qKey, e.target.value)}
                                        placeholder="Vui lòng nêu cụ thể ý kiến khác của em..."
                                        className="mt-2 w-full rounded-xl border border-blue-300 bg-white px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                                        autoFocus
                                      />
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Question Type: DROPDOWN */}
                            {q.type === 'DROPDOWN' && (
                              <select
                                value={value || ''}
                                onChange={(e) => handleUpdateField(qKey, e.target.value)}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none transition-all cursor-pointer"
                              >
                                <option value="">-- Chọn phương án --</option>
                                {(q.options || []).map((opt, idx) => (
                                  <option key={idx} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            )}

                            {/* Question Type: SCALE */}
                            {q.type === 'SCALE' && (
                              <div className="space-y-2 pt-1">
                                {q.scaleMode === 'CUSTOM' || (q.options && q.options.length > 0) ? (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                                    {(q.options || []).map((level, idx) => {
                                      const isSelected = value === level;
                                      return (
                                        <button
                                          type="button"
                                          key={idx}
                                          onClick={() => handleUpdateField(qKey, level)}
                                          className={`flex items-center justify-between p-3.5 rounded-xl border text-left font-bold text-xs transition-all cursor-pointer ${
                                            isSelected
                                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                          }`}
                                        >
                                          <span className="break-words leading-relaxed">{level}</span>
                                          {isSelected && <Check className="h-4 w-4 shrink-0 ml-1.5" />}
                                        </button>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold px-1">
                                      <span>{q.scaleMinLabel || `${q.scaleMin || 1} (Thấp/Kém)`}</span>
                                      <span>{q.scaleMaxLabel || `${q.scaleMax || 5} (Cao/Rất tốt)`}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {Array.from(
                                        { length: Math.max(1, (q.scaleMax ?? 5) - (q.scaleMin ?? 1) + 1) },
                                        (_, i) => (q.scaleMin ?? 1) + i
                                      ).map((point) => {
                                        const isSelected = Number(value) === point;
                                        return (
                                          <button
                                            type="button"
                                            key={point}
                                            onClick={() => handleUpdateField(qKey, point)}
                                            className={`flex-1 min-w-[36px] rounded-xl py-3 text-xs font-extrabold transition-all cursor-pointer border ${
                                              isSelected
                                                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                            }`}
                                          >
                                            {point}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Question Type: DATE */}
                            {q.type === 'DATE' && (
                              <div className="pt-1">
                                <input
                                  type="date"
                                  value={value || ''}
                                  onChange={(e) => handleUpdateField(qKey, e.target.value)}
                                  className="w-full sm:w-64 rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none transition-all"
                                />
                              </div>
                            )}

                            {/* Question Type: TIME */}
                            {q.type === 'TIME' && (
                              <div className="pt-1">
                                <input
                                  type="time"
                                  value={value || ''}
                                  onChange={(e) => handleUpdateField(qKey, e.target.value)}
                                  className="w-full sm:w-48 rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none transition-all"
                                />
                              </div>
                            )}

                            {/* Question Type: DURATION */}
                            {q.type === 'DURATION' && (
                              <div className="pt-1">
                                <input
                                  type="text"
                                  placeholder="Ví dụ: 45 phút, 1 giờ 30 phút..."
                                  value={value || ''}
                                  onChange={(e) => handleUpdateField(qKey, e.target.value)}
                                  className="w-full sm:w-72 rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none transition-all"
                                />
                              </div>
                            )}

                            {/* Question Type: GRID / GRID_SINGLE / GRID_MULTI */}
                            {(q.type === 'GRID' || q.type === 'GRID_SINGLE' || q.type === 'GRID_MULTI') && q.gridRows && q.gridColumns && (
                              <div className="overflow-x-auto rounded-xl border border-slate-200">
                                <table className="w-full text-left text-xs">
                                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                                    <tr>
                                      <th className="p-3">Nội dung</th>
                                      {q.gridColumns.map((col, cIdx) => (
                                        <th key={cIdx} className="p-3 text-center">
                                          {col}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {q.gridRows.map((row, rIdx) => {
                                      const rowValueMap = typeof value === 'object' && value ? value : {};
                                      const selectedCol = rowValueMap[row];

                                      return (
                                        <tr key={rIdx} className="hover:bg-slate-50/50">
                                          <td className="p-3 font-semibold text-slate-800">{row}</td>
                                          {q.gridColumns!.map((col, cIdx) => (
                                            <td key={cIdx} className="p-3 text-center">
                                              <input
                                                type={q.type === 'GRID_MULTI' ? 'checkbox' : 'radio'}
                                                name={`grid-${q.id}-${rIdx}`}
                                                checked={
                                                  q.type === 'GRID_MULTI'
                                                    ? Array.isArray(selectedCol)
                                                      ? selectedCol.includes(col)
                                                      : false
                                                    : selectedCol === col
                                                }
                                                onChange={() => {
                                                  if (q.type === 'GRID_MULTI') {
                                                    const curList = Array.isArray(selectedCol) ? selectedCol : [];
                                                    const nextList = curList.includes(col)
                                                      ? curList.filter((c: string) => c !== col)
                                                      : [...curList, col];
                                                    const nextMap = { ...rowValueMap, [row]: nextList };
                                                    handleUpdateField(qKey, nextMap);
                                                  } else {
                                                    const nextMap = { ...rowValueMap, [row]: col };
                                                    handleUpdateField(qKey, nextMap);
                                                  }
                                                }}
                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                                              />
                                            </td>
                                          ))}
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        );
                      })
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500">
                      Chưa có câu hỏi trong phần này.
                    </div>
                  )}
                </div>
              ) : (
                /* FINAL STEP: CONFIRMATION & CONSENT */
                <div className="space-y-6 animate-fade-in">
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 space-y-3">
                    <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      <span>Xác nhận thông tin & Cam kết của học sinh</span>
                    </div>
                    <p className="text-xs text-emerald-700 leading-relaxed">
                      Em vui lòng kiểm tra lại toàn bộ các câu trả lời trước khi gửi. Thông tin khảo sát sẽ được chuyển trực tiếp và bảo mật đến Giáo viên Chủ nhiệm.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
                    <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                      Cam kết thông tin
                    </h4>

                    <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-xs font-semibold text-slate-800 cursor-pointer hover:bg-slate-100 transition-all">
                      <input
                        type="checkbox"
                        checked={consentConfirmed}
                        onChange={(e) => {
                          setConsentConfirmed(e.target.checked);
                          triggerAutoSave(answers, otherTextMap);
                        }}
                        className="mt-0.5 h-4.5 w-4.5 rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="leading-relaxed">
                        Em cam kết toàn bộ thông tin kê khai trên là hoàn toàn trung thực, chính xác và đồng ý để Giáo viên Chủ nhiệm sử dụng nhằm mục đích đồng hành, tư vấn học tập và định hướng năm học.
                      </span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="shrink-0 flex items-center justify-between border-t border-slate-200 bg-white px-5 py-3.5 z-10">
              <div className="flex items-center gap-2">
                {currentStep > 0 && (
                  <button
                    onClick={handlePrevStep}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>Quay lại</span>
                  </button>
                )}

                <button
                  onClick={handleManualSaveDraft}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  <Save className="h-3.5 w-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Lưu tạm</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {!isFinalStep ? (
                  <button
                    onClick={handleNextStep}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-all cursor-pointer"
                  >
                    <span>Tiếp theo</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmitFinal}
                    disabled={!consentConfirmed}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Nộp phiếu khảo sát</span>
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
