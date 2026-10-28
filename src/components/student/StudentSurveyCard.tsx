/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  FileEdit,
  ShieldCheck,
  Layers,
  AlertCircle
} from 'lucide-react';
import { authService } from '../../services/AuthService';
import { studentSurveyService } from '../../services/StudentSurveyService';
import { surveyTemplateService } from '../../services/SurveyTemplateService';
import { classService } from '../../services/ClassService';
import { StudentSurveyResponse, SurveyTemplate } from '../../types';
import { StudentSurveyFormModal } from './StudentSurveyFormModal';
import { StudentSurveyDetailModal } from './StudentSurveyDetailModal';

interface StudentSurveyCardProps {
  onNavigateSurvey?: () => void;
  highlightSurveyId?: string;
}

export const StudentSurveyCard: React.FC<StudentSurveyCardProps> = ({
  onNavigateSurvey,
  highlightSurveyId
}) => {
  const currentUser = authService.getCurrentUser();
  const classSettings = classService.getSettings();
  const currentSchoolYear = classSettings.academicYear || '2025 - 2026';

  const [publishedTemplates, setPublishedTemplates] = useState<SurveyTemplate[]>(() => {
    return surveyTemplateService.getTemplatesBySchoolYear(currentSchoolYear)
      .filter(t => t.status === 'PUBLISHED' && (!t.targetAudience || t.targetAudience.includes('STUDENT')));
  });

  const [responsesMap, setResponsesMap] = useState<Record<string, StudentSurveyResponse>>({});
  const [activeFormTemplate, setActiveFormTemplate] = useState<SurveyTemplate | null>(null);
  const [activeDetailSurvey, setActiveDetailSurvey] = useState<{ survey: StudentSurveyResponse; template: SurveyTemplate } | null>(null);

  const refreshData = () => {
    const list = surveyTemplateService.getTemplatesBySchoolYear(currentSchoolYear)
      .filter(t => t.status === 'PUBLISHED' && (!t.targetAudience || t.targetAudience.includes('STUDENT')));
    setPublishedTemplates(list);

    if (currentUser.studentId) {
      const studentSurveys = studentSurveyService.getSurveysForStudent(currentUser.studentId);
      const map: Record<string, StudentSurveyResponse> = {};
      studentSurveys.forEach(r => {
        if (r.surveyTemplateId) {
          map[r.surveyTemplateId] = r;
        } else {
          map['template-grade12-default-v1'] = r;
          map['default'] = r;
        }
      });
      setResponsesMap(map);
    }
  };

  useEffect(() => {
    refreshData();
    const unsubSurvey = studentSurveyService.subscribe(() => refreshData());
    const unsubTemplate = surveyTemplateService.subscribe(() => refreshData());
    return () => {
      unsubSurvey();
      unsubTemplate();
    };
  }, [currentUser.studentId, currentSchoolYear]);

  // Handle auto-open if highlightSurveyId is passed from notification
  useEffect(() => {
    if (highlightSurveyId && publishedTemplates.length > 0) {
      const target = publishedTemplates.find(t => t.id === highlightSurveyId);
      if (target) {
        const survey = responsesMap[target.id] || responsesMap['default'];
        if (survey && (survey.status === 'SUBMITTED' || survey.status === 'REVIEWED')) {
          setActiveDetailSurvey({ survey, template: target });
        } else {
          setActiveFormTemplate(target);
        }
      }
    }
  }, [highlightSurveyId, publishedTemplates.length]);

  if (currentUser.role !== 'STUDENT' && currentUser.role !== 'CLASS_OFFICER') {
    return null;
  }

  const formatDateTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return `${d.toLocaleDateString('vi-VN')} • ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return isoString;
    }
  };

  const displayedTemplates = publishedTemplates.length > 0 ? publishedTemplates : [];

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-blue-200/80 bg-white p-6 shadow-xs">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-blue-600" />
            <span>Khảo sát ý kiến học sinh</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Danh sách các bài khảo sát từ Giáo viên Chủ nhiệm dành cho lớp {classSettings.className} ({classSettings.academicYear}).
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3.5 py-1.5 text-xs font-bold text-blue-700 border border-blue-200">
          <Layers className="h-4 w-4" />
          <span>{displayedTemplates.length} bài khảo sát đang mở</span>
        </div>
      </div>

      {displayedTemplates.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mx-auto">
            <ClipboardList className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-extrabold text-slate-800">
            Hiện chưa có bài khảo sát nào đang phát hành
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Khi Giáo viên Chủ nhiệm mở bài khảo sát mới, bài khảo sát sẽ xuất hiện tại đây và thông báo đến em.
          </p>
        </div>
      ) : (
        displayedTemplates.map((template) => {
          const survey = responsesMap[template.id] || (template.id === 'template-grade12-default-v1' ? responsesMap['default'] : undefined);
          const isSubmitted = survey?.status === 'SUBMITTED' || survey?.status === 'REVIEWED';
          const isReviewed = survey?.status === 'REVIEWED';
          const isDraft = survey?.status === 'DRAFT';

          const isHighlighted = highlightSurveyId === template.id;

          return (
            <div
              key={template.id}
              className={`relative overflow-hidden rounded-2xl border bg-white p-5 shadow-xs transition-all hover:shadow-sm ${
                isHighlighted ? 'ring-2 ring-blue-500 border-blue-400' : 'border-slate-200'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                <div className="flex items-start gap-3.5">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${
                      isSubmitted
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                        : isDraft
                        ? 'bg-amber-50 text-amber-600 border-amber-200'
                        : 'bg-blue-600 text-white border-blue-500 shadow-xs'
                    }`}
                  >
                    {isSubmitted ? (
                      <CheckCircle2 className="h-6 w-6" />
                    ) : isDraft ? (
                      <FileEdit className="h-6 w-6" />
                    ) : (
                      <ClipboardList className="h-6 w-6" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-slate-900 text-base leading-snug">
                        {template.title}
                      </h3>
                      {isReviewed ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-300">
                          <ShieldCheck className="h-3 w-3" /> GVCN đã xem
                        </span>
                      ) : isSubmitted ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-bold text-blue-800 border border-blue-300">
                          <CheckCircle2 className="h-3 w-3" /> Đã hoàn thành
                        </span>
                      ) : isDraft ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 border border-amber-300">
                          <Clock className="h-3 w-3" /> Đang thực hiện
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-700 border border-slate-300">
                          Chưa làm
                        </span>
                      )}

                      <span className="text-[11px] text-slate-400 font-medium">
                        (v{template.version || 1} • {template.sections?.length || 0} phần)
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed max-w-xl">
                      {template.description || `Khảo sát thông tin dành cho học sinh năm học ${classSettings.academicYear}.`}
                    </p>

                    {isSubmitted && survey?.submittedAt && (
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 pt-0.5">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        <span>Gửi lúc: <strong className="text-slate-700">{formatDateTime(survey.submittedAt)}</strong></span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isSubmitted && survey ? (
                    <button
                      onClick={() => setActiveDetailSurvey({ survey, template })}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer"
                    >
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Xem lại câu trả lời
                    </button>
                  ) : isDraft ? (
                    <button
                      onClick={() => setActiveFormTemplate(template)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-amber-700 transition-all cursor-pointer"
                    >
                      <FileEdit className="h-4 w-4" />
                      Tiếp tục làm bài
                      <ArrowRight className="h-3.5 w-3.5 ml-0.5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => setActiveFormTemplate(template)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-all cursor-pointer"
                    >
                      <Sparkles className="h-4 w-4" />
                      Bắt đầu khảo sát
                      <ArrowRight className="h-3.5 w-3.5 ml-0.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}

      {/* Survey Form Wizard Modal */}
      {activeFormTemplate && (
        <StudentSurveyFormModal
          isOpen={true}
          template={activeFormTemplate}
          onClose={() => setActiveFormTemplate(null)}
          onSubmitted={() => {
            setActiveFormTemplate(null);
            refreshData();
          }}
        />
      )}

      {/* Read-only Survey Detail Modal */}
      {activeDetailSurvey && (
        <StudentSurveyDetailModal
          isOpen={true}
          onClose={() => setActiveDetailSurvey(null)}
          survey={activeDetailSurvey.survey}
          template={activeDetailSurvey.template}
          onStatusUpdated={() => refreshData()}
        />
      )}
    </div>
  );
};
