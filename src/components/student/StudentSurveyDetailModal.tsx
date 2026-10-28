/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Lock,
  User,
  BookOpen,
  Target,
  GraduationCap,
  Compass,
  Sparkles,
  Users,
  Eye,
  Calendar,
  Phone,
  RefreshCw,
  FileText,
  Layers,
  HelpCircle,
  Check
} from 'lucide-react';
import { StudentSurveyResponse, SurveyTemplate, SurveySection, SurveyQuestion } from '../../types';
import { authService } from '../../services/AuthService';
import { studentService } from '../../services/StudentService';
import { classService } from '../../services/ClassService';
import { studentSurveyService } from '../../services/StudentSurveyService';
import { surveyTemplateService } from '../../services/SurveyTemplateService';
import { surveySyncService } from '../../services/SurveySyncService';
import { getSafeSurveyAnswer, extractCleanAnswerText, unwrapAnswerValue } from '../../utils/surveyAnswerUtils';

interface StudentSurveyDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  survey: StudentSurveyResponse;
  template?: SurveyTemplate | null;
  onStatusUpdated?: () => void;
}

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

export const StudentSurveyDetailModal: React.FC<StudentSurveyDetailModalProps> = ({
  isOpen,
  onClose,
  survey,
  template: propTemplate,
  onStatusUpdated
}) => {
  const currentUser = authService.getCurrentUser();
  const isTeacher = currentUser.role === 'TEACHER' || currentUser.role === 'SUPER_ADMIN';
  const student = studentService.getById(survey.studentId);
  const classSettings = classService.getSettings();

  const resolvedTemplate: SurveyTemplate | null =
    propTemplate ||
    (survey.surveyTemplateId ? surveyTemplateService.getById(survey.surveyTemplateId) : null) ||
    surveyTemplateService.getPublishedTemplate(survey.surveyType) ||
    null;

  const [activeTab, setActiveTab] = useState<number>(0);
  const [currentSurvey, setCurrentSurvey] = useState<StudentSurveyResponse>(survey);
  const [isMarking, setIsMarking] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  useEffect(() => {
    setCurrentSurvey(survey);
  }, [survey]);

  if (!isOpen) return null;

  const answers = currentSurvey.answers || {};
  const otherText = (answers as any).otherText || {};
  const isSubmitted = currentSurvey.status === 'SUBMITTED' || currentSurvey.status === 'REVIEWED';
  const isReviewed = currentSurvey.status === 'REVIEWED';

  const formatDateTime = (isoString?: string) => {
    if (!isoString) return 'Chưa có';
    try {
      const d = new Date(isoString);
      return `${d.toLocaleDateString('vi-VN')} • ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return isoString;
    }
  };

  const handleMarkReviewed = () => {
    try {
      setIsMarking(true);
      const updated = studentSurveyService.markReviewed(currentSurvey.id);
      setCurrentSurvey(updated);
      if (onStatusUpdated) onStatusUpdated();
    } catch (e: any) {
      setSyncFeedback(e.message || 'Không thể đánh dấu đã xem');
    } finally {
      setIsMarking(false);
    }
  };

  const handleManualSync = async () => {
    try {
      setIsSyncing(true);
      setSyncFeedback(null);
      await surveySyncService.processSurvey(currentSurvey.id, { force: true });
      setSyncFeedback('Đồng bộ dữ liệu thành công!');
      setTimeout(() => setSyncFeedback(null), 3000);
      if (onStatusUpdated) onStatusUpdated();
    } catch (e: any) {
      setSyncFeedback(`Lỗi: ${e.message || 'Không thể đồng bộ'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const sections: SurveySection[] = resolvedTemplate?.sections || [];
  const currentSection = sections[activeTab] || sections[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-2 sm:p-4 backdrop-blur-xs animate-fade-in">
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 p-5 text-white">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-white backdrop-blur-xs font-bold text-lg">
              {student?.fullName ? student.fullName.charAt(0) : 'HS'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-extrabold text-white">
                  {student?.fullName || 'Học viên'}
                </h3>
                <span className="rounded-md bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white">
                  Mã HS: {student?.code || '—'}
                </span>
                <span className="rounded-md bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white">
                  Tổ {student?.group || 1}
                </span>
              </div>
              <p className="text-xs text-blue-100 mt-0.5">
                {resolvedTemplate?.title || 'Phiếu Khảo sát Học sinh'} • Phiên bản v{currentSurvey.surveyTemplateVersion || 1}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isReviewed ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-300/40 px-3 py-1 text-xs font-bold text-emerald-100">
                <ShieldCheck className="h-4 w-4 text-emerald-300" /> GVCN đã xem
              </span>
            ) : isSubmitted ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 border border-blue-300/40 px-3 py-1 text-xs font-bold text-blue-100">
                <CheckCircle2 className="h-4 w-4 text-blue-300" /> Đã nộp phiếu
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 border border-amber-300/40 px-3 py-1 text-xs font-bold text-amber-100">
                <Clock className="h-4 w-4 text-amber-300" /> Đang soạn nháp
              </span>
            )}

            <button
              onClick={onClose}
              className="rounded-xl p-2 text-white/80 hover:bg-white/20 hover:text-white transition-all cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Metadata Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs text-slate-600">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-slate-400" />
              <span>Thời gian nộp: <strong className="text-slate-800">{formatDateTime(currentSurvey.submittedAt)}</strong></span>
            </div>
            {isReviewed && currentSurvey.reviewedAt && (
              <div className="flex items-center gap-1.5">
                <Eye className="h-4 w-4 text-emerald-500" />
                <span>GVCN xác nhận: <strong className="text-slate-800">{formatDateTime(currentSurvey.reviewedAt)}</strong> ({currentSurvey.reviewedBy || 'GVCN'})</span>
              </div>
            )}
          </div>

          {isTeacher && (
            <div className="flex items-center gap-2">
              {!isReviewed && (
                <button
                  onClick={handleMarkReviewed}
                  disabled={isMarking}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-all cursor-pointer disabled:opacity-50"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>{isMarking ? 'Đang xác nhận...' : 'Đánh dấu đã xem'}</span>
                </button>
              )}

              <button
                onClick={handleManualSync}
                disabled={isSyncing}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer shadow-xs disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Đang đồng bộ...' : 'Đồng bộ dữ liệu'}</span>
              </button>
            </div>
          )}
        </div>

        {syncFeedback && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-2 text-xs font-bold text-emerald-800 animate-fade-in flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>{syncFeedback}</span>
          </div>
        )}

        {/* Section Tabs */}
        {sections.length > 0 && (
          <div className="flex items-center gap-1 border-b border-slate-200 bg-white px-5 py-2 overflow-x-auto text-xs">
            {sections.map((sec, idx) => (
              <button
                key={sec.id || idx}
                onClick={() => setActiveTab(idx)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === idx
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>{idx + 1}. {sec.title}</span>
              </button>
            ))}
          </div>
        )}

        {/* Question Answers Display Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 bg-slate-50/50">
          {currentSection && currentSection.questions && currentSection.questions.length > 0 ? (
            <div className="space-y-4 animate-fade-in">
              {currentSection.questions.map((q, qIdx) => {
                const qKey = q.key || q.id;
                const value = getSafeSurveyAnswer(answers, qKey, q.id) ?? getAnswerValue(answers, qKey);
                const otherVal = otherText[qKey];

                return (
                  <div
                    key={q.id || qIdx}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-bold text-slate-900 leading-snug">
                        <span className="text-blue-600 mr-1">{qIdx + 1}.</span>
                        {q.title}
                      </h4>
                      {q.visibility === 'TEACHER_ONLY' && (
                        <span className="rounded-md bg-amber-100 text-amber-900 px-2 py-0.5 text-[10px] font-bold shrink-0">
                          Chỉ GVCN thấy
                        </span>
                      )}
                    </div>

                    {/* Formatted Answer */}
                    <div className="rounded-xl bg-slate-50 p-3.5 text-xs text-slate-800 border border-slate-100">
                      {value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0) ? (
                        <span className="italic text-slate-400">Không có câu trả lời</span>
                      ) : Array.isArray(value) ? (
                        <div className="flex flex-wrap gap-1.5">
                          {value.map((item, idx) => {
                            const unwrappedItem = unwrapAnswerValue(item);
                            const itemText = typeof unwrappedItem === 'string'
                              ? unwrappedItem
                              : (typeof unwrappedItem === 'number' || typeof unwrappedItem === 'boolean'
                                  ? String(unwrappedItem)
                                  : extractCleanAnswerText(unwrappedItem));
                            return (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 rounded-lg bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-900"
                              >
                                <Check className="h-3 w-3 text-blue-600" />
                                {item === 'Khác' && otherVal ? `Khác: ${otherVal}` : (itemText || '—')}
                              </span>
                            );
                          })}
                        </div>
                      ) : typeof value === 'object' ? (
                        (() => {
                          const unwrapped = unwrapAnswerValue(value);
                          if (typeof unwrapped === 'string' && unwrapped && unwrapped !== '[object Object]') {
                            return (
                              <div className="font-semibold text-slate-900 leading-relaxed">
                                {unwrapped === 'Khác' && otherVal ? `Khác: ${otherVal}` : unwrapped}
                              </div>
                            );
                          }
                          if (typeof unwrapped === 'number' || typeof unwrapped === 'boolean') {
                            return (
                              <div className="font-semibold text-slate-900 leading-relaxed">
                                {String(unwrapped)}
                              </div>
                            );
                          }
                          return (
                            <div className="space-y-1.5">
                              {Object.entries(value).map(([k, v]) => {
                                const cleanV = extractCleanAnswerText(v);
                                return (
                                  <div key={k} className="flex items-center justify-between text-xs py-1 border-b border-slate-200/60 last:border-0">
                                    <span className="font-semibold text-slate-700">{k}:</span>
                                    <span className="font-bold text-blue-700">{cleanV || '—'}</span>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()
                      ) : q.type === 'SCALE' ? (
                        <div className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3.5 py-1 text-xs font-bold text-white shadow-xs">
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>
                            {q.scaleMode === 'CUSTOM' || (q.options && q.options.length > 0)
                              ? `Mức độ: ${extractCleanAnswerText(value)}`
                              : `Điểm đánh giá: ${extractCleanAnswerText(value)}/${q.scaleMax || 5}`}
                          </span>
                        </div>
                      ) : (
                        <div className="font-semibold text-slate-900 leading-relaxed">
                          {value === 'Khác' && otherVal ? `Khác: ${otherVal}` : extractCleanAnswerText(value)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500 bg-white">
              Không có câu hỏi trong phần này.
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end border-t border-slate-200 bg-white px-5 py-3.5">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-all cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
