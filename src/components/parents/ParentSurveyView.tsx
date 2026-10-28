/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  Calendar,
  User,
  ArrowRight,
  Eye,
  FileEdit,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Search,
  Filter,
  RefreshCw,
  Building2,
  Users
} from 'lucide-react';
import { authService } from '../../services/AuthService';
import { studentService } from '../../services/StudentService';
import { classService } from '../../services/ClassService';
import { surveyTemplateService } from '../../services/SurveyTemplateService';
import { studentSurveyService } from '../../services/StudentSurveyService';
import { SurveyTemplate, StudentSurveyResponse } from '../../types';
import { StudentSurveyFormModal } from '../student/StudentSurveyFormModal';
import { StudentSurveyDetailModal } from '../student/StudentSurveyDetailModal';

export const ParentSurveyView: React.FC = () => {
  const currentUser = authService.getCurrentUser();
  const currentClassSettings = classService.getSettings();
  const currentSchoolYear = currentClassSettings.academicYear || '2025 - 2026';

  const childStudent = currentUser.studentId ? studentService.getById(currentUser.studentId) : null;
  const parentKey = currentUser.studentId ? `parent_${currentUser.studentId}` : `parent_${currentUser.id}`;

  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [templates, setTemplates] = useState<SurveyTemplate[]>(() =>
    surveyTemplateService.getParentSurveys(currentSchoolYear)
  );
  const [responses, setResponses] = useState<StudentSurveyResponse[]>(() =>
    studentSurveyService.getAll()
  );
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [selectedTemplateForFill, setSelectedTemplateForFill] = useState<SurveyTemplate | null>(null);
  const [selectedResponseForView, setSelectedResponseForView] = useState<StudentSurveyResponse | null>(null);

  const reloadData = () => {
    setTemplates(surveyTemplateService.getParentSurveys(currentSchoolYear));
    setResponses(studentSurveyService.getAll());
  };

  useEffect(() => {
    reloadData();
    const unsubTpl = surveyTemplateService.subscribe(reloadData);
    const unsubResp = studentSurveyService.subscribe(reloadData);
    return () => {
      unsubTpl();
      unsubResp();
    };
  }, [currentSchoolYear]);

  // Map templates with parent responses
  const surveyItems = useMemo(() => {
    return templates.map((tpl) => {
      // Find matching response for this parent
      const resp = responses.find(
        (r) =>
          r.surveyTemplateId === tpl.id &&
          (r.studentId === parentKey || (currentUser.studentId && r.studentId === currentUser.studentId))
      );

      const isCompleted = resp?.status === 'SUBMITTED' || resp?.status === 'REVIEWED';
      const isDraft = resp?.status === 'DRAFT';

      return {
        template: tpl,
        response: resp,
        status: isCompleted ? 'COMPLETED' : isDraft ? 'IN_PROGRESS' : 'NOT_STARTED',
        submittedAt: resp?.submittedAt || resp?.updatedAt
      };
    });
  }, [templates, responses, parentKey, currentUser.studentId]);

  const filteredItems = useMemo(() => {
    return surveyItems.filter((item) => {
      const matchesSearch =
        !searchQuery.trim() ||
        item.template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.template.description && item.template.description.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (activeTab === 'pending') {
        return item.status !== 'COMPLETED';
      } else {
        return item.status === 'COMPLETED';
      }
    });
  }, [surveyItems, searchQuery, activeTab]);

  const pendingCount = surveyItems.filter((i) => i.status !== 'COMPLETED').length;
  const completedCount = surveyItems.filter((i) => i.status === 'COMPLETED').length;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Đang cập nhật';
    try {
      const d = new Date(dateStr);
      return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()} lúc ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div id="parent-survey-container" className="space-y-6">
      {/* Page Header */}
      <div
        id="parent-survey-header"
        className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-800/50">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              Khảo sát Dành cho Phụ huynh
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
                Chính thức
              </span>
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Thực hiện các phiếu khảo sát ý kiến, nguyện vọng và phối hợp giáo dục giữa Gia đình & Nhà trường.
              {childStudent && (
                <span className="text-indigo-600 dark:text-indigo-400 font-medium ml-1">
                  (Học sinh: {(childStudent as any).fullName || (childStudent as any).name} - Lớp {currentClassSettings.name || '12A1'})
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
          <button
            id="btn-refresh-parent-surveys"
            onClick={reloadData}
            className="p-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 text-sm font-medium"
            title="Tải lại dữ liệu"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Làm mới</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div id="parent-survey-tabs" className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 w-full sm:w-auto">
          <button
            id="tab-parent-survey-pending"
            onClick={() => setActiveTab('pending')}
            className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2 ${
              activeTab === 'pending'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Chưa hoàn thành</span>
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            id="tab-parent-survey-completed"
            onClick={() => setActiveTab('completed')}
            className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2 ${
              activeTab === 'completed'
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Đã hoàn thành</span>
            {completedCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                {completedCount}
              </span>
            )}
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="input-search-parent-surveys"
            type="text"
            placeholder="Tìm kiếm phiếu khảo sát..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 rounded-xl text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-200"
          />
        </div>
      </div>

      {/* Survey Cards Grid */}
      {filteredItems.length === 0 ? (
        <div
          id="parent-survey-empty"
          className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center shadow-xs"
        >
          <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-700/50 text-slate-400 flex items-center justify-center mx-auto mb-4">
            <ClipboardList className="w-8 h-8" />
          </div>
          <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200">
            {activeTab === 'pending'
              ? 'Không có phiếu khảo sát nào cần thực hiện'
              : 'Chưa có phiếu khảo sát nào đã hoàn thành'}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            {activeTab === 'pending'
              ? 'Quý phụ huynh đã hoàn tất các phiếu khảo sát được gửi từ Ban Giám hiệu và GVCN.'
              : 'Sau khi hoàn thành khảo sát, câu trả lời sẽ được lưu trữ tại đây để quý phụ huynh có thể xem lại bất kỳ lúc nào.'}
          </p>
        </div>
      ) : (
        <div id="parent-survey-list" className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredItems.map(({ template, response, status, submittedAt }) => {
            const isCompleted = status === 'COMPLETED';
            const isDraft = status === 'IN_PROGRESS';

            return (
              <div
                key={template.id}
                id={`card-parent-survey-${template.id}`}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Card Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40">
                      <Users className="w-3.5 h-3.5" />
                      Đối tượng: Phụ huynh
                    </span>

                    {isCompleted ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Đã hoàn thành
                      </span>
                    ) : isDraft ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40">
                        <Clock className="w-3.5 h-3.5" />
                        Đang làm dở
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Chưa hoàn thành
                      </span>
                    )}
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 leading-snug mb-2">
                    {template.title}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                    {template.description || 'Khảo sát định kỳ thu thập thông tin và ý kiến đóng góp từ quý phụ huynh.'}
                  </p>

                  {/* Survey Meta Information */}
                  <div className="space-y-2 py-3 border-y border-slate-100 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-400">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5" /> Đơn vị / Người gửi:
                      </span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {template.createdBy || 'Ban Giám hiệu & GVCN'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" /> Thời hạn tiếp nhận:
                      </span>
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">
                        Đang mở nhận ý kiến
                      </span>
                    </div>

                    {isCompleted && submittedAt && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Thời gian hoàn thành:
                        </span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {formatDate(submittedAt)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-5 pt-2 flex items-center justify-end gap-3">
                  {isCompleted && response ? (
                    <button
                      id={`btn-view-parent-response-${template.id}`}
                      onClick={() => setSelectedResponseForView(response)}
                      className="w-full sm:w-auto px-4 py-2 text-sm font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition flex items-center justify-center gap-1.5"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Xem lại câu trả lời</span>
                    </button>
                  ) : (
                    <button
                      id={`btn-start-parent-survey-${template.id}`}
                      onClick={() => setSelectedTemplateForFill(template)}
                      className="w-full sm:w-auto px-5 py-2.5 text-sm font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs hover:shadow transition flex items-center justify-center gap-2"
                    >
                      <span>{isDraft ? 'Tiếp tục làm khảo sát' : 'Bắt đầu khảo sát'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Survey Fill Modal */}
      {selectedTemplateForFill && (
        <StudentSurveyFormModal
          isOpen={true}
          onClose={() => setSelectedTemplateForFill(null)}
          template={selectedTemplateForFill}
          onSubmitted={() => {
            setSelectedTemplateForFill(null);
            reloadData();
            setActiveTab('completed');
          }}
        />
      )}

      {/* Response Detail Modal */}
      {selectedResponseForView && (
        <StudentSurveyDetailModal
          isOpen={true}
          onClose={() => setSelectedResponseForView(null)}
          survey={selectedResponseForView}
          onStatusUpdated={() => {
            reloadData();
          }}
        />
      )}
    </div>
  );
};
