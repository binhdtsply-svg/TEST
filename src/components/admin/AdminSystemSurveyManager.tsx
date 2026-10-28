/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Eye,
  Edit3,
  Copy,
  Archive,
  Send,
  Trash2,
  Users,
  Globe,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import { SurveyTemplate, SurveyTemplateStatus } from '../../types';
import { surveyTemplateService } from '../../services/SurveyTemplateService';
import { studentSurveyService } from '../../services/StudentSurveyService';
import { SurveyBuilderModal } from '../survey/SurveyBuilderModal';
import { SurveyPreviewModal } from '../survey/SurveyPreviewModal';
import { authService } from '../../services/AuthService';

export const AdminSystemSurveyManager: React.FC = () => {
  const [templates, setTemplates] = useState<SurveyTemplate[]>([]);
  const [filterAudience, setFilterAudience] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Modals state
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [builderTemplateId, setBuilderTemplateId] = useState<string | null>(null);
  
  const [previewTemplate, setPreviewTemplate] = useState<SurveyTemplate | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Safe In-App Delete / Archive Modal
  const [deleteTarget, setDeleteTarget] = useState<{
    template: SurveyTemplate;
    responseCount: number;
    isSubmitting: boolean;
  } | null>(null);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadTemplates = () => {
    const list = (typeof surveyTemplateService?.getAllTemplates === 'function'
      ? surveyTemplateService.getAllTemplates()
      : typeof surveyTemplateService?.getAll === 'function'
      ? surveyTemplateService.getAll()
      : []) || [];
    setTemplates(list);
  };

  useEffect(() => {
    loadTemplates();
    const unsub = surveyTemplateService.subscribe(() => {
      loadTemplates();
    });
    return () => unsub();
  }, []);

  const handleCreateNew = () => {
    const currentUser = authService.getCurrentUser();
    const newDraft = surveyTemplateService.createTemplate({
      title: 'Khảo sát Hệ thống Quản trị Mới',
      description: 'Khảo sát lấy ý kiến đánh giá từ các nhóm đối tượng trên toàn hệ thống.',
      targetAudience: ['TEACHER', 'STUDENT', 'PARENT'],
      scope: 'SYSTEM',
      creatorRole: 'SUPER_ADMIN',
      createdBy: currentUser.name || 'Ban Quản trị Hệ thống'
    });
    setBuilderTemplateId(newDraft.id);
    setIsBuilderOpen(true);
  };

  const handleEditDraft = (template: SurveyTemplate) => {
    setBuilderTemplateId(template.id);
    setIsBuilderOpen(true);
  };

  const handlePublish = (templateId: string) => {
    try {
      surveyTemplateService.publishTemplate(templateId);
      setNotification({ type: 'success', message: 'Xuất bản phiếu khảo sát thành công! Các đối tượng được chọn sẽ nhận được thông báo.' });
      loadTemplates();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Lỗi khi xuất bản khảo sát.' });
    }
  };

  const handleArchive = (templateId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn lưu trữ phiếu khảo sát này? Người dùng sẽ không thể điền thêm phản hồi mới.')) return;
    try {
      surveyTemplateService.archiveTemplate(templateId);
      setNotification({ type: 'success', message: 'Đã chuyển phiếu khảo sát vào kho lưu trữ.' });
      loadTemplates();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Lỗi khi lưu trữ khảo sát.' });
    }
  };

  const handleDuplicate = (templateId: string) => {
    try {
      const dup = surveyTemplateService.duplicateTemplate(templateId);
      setNotification({ type: 'success', message: `Đã tạo bản sao: ${dup.title}` });
      loadTemplates();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Lỗi khi nhân bản.' });
    }
  };

  const handleDeleteSurvey = (template: SurveyTemplate) => {
    const responses = studentSurveyService.getResponsesByTemplate(template.id);
    setDeleteTarget({
      template,
      responseCount: responses.length,
      isSubmitting: false
    });
  };

  const handleConfirmDeleteAction = () => {
    if (!deleteTarget) return;
    const { template, responseCount } = deleteTarget;
    const hasResponses = responseCount > 0;

    setDeleteTarget(prev => prev ? { ...prev, isSubmitting: true } : null);

    try {
      const result = surveyTemplateService.deleteOrArchiveSurvey(template.id, hasResponses);
      setNotification({
        type: 'success',
        message: result.message
      });
      loadTemplates();
      setDeleteTarget(null);
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err?.message || 'Không thể xóa phiếu khảo sát.'
      });
      setDeleteTarget(prev => prev ? { ...prev, isSubmitting: false } : null);
    }
  };

  const handleOpenPreview = (template: SurveyTemplate) => {
    setPreviewTemplate(template);
    setIsPreviewOpen(true);
  };

  // Filter logic
  const filteredTemplates = templates.filter(t => {
    if (filterStatus !== 'ALL' && t.status !== filterStatus) return false;
    if (filterAudience !== 'ALL') {
      const aud = t.targetAudience || ['STUDENT'];
      if (!aud.includes(filterAudience as any)) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchDesc = (t.description || '').toLowerCase().includes(q);
      const matchAuthor = (t.createdBy || '').toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchAuthor) return false;
    }
    return true;
  });

  const totalPublished = templates.filter(t => t.status === 'PUBLISHED').length;
  const totalDraft = templates.filter(t => t.status === 'DRAFT').length;
  const totalArchived = templates.filter(t => t.status === 'ARCHIVED').length;

  return (
    <div className="space-y-6">
      {/* Banner - Bright Educational Style */}
      <div className="rounded-3xl bg-white p-6 sm:p-7 text-slate-800 shadow-sm border border-slate-200/90 flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-blue-50/70 rounded-full blur-2xl pointer-events-none -mr-16 -mt-16" />
        <div className="relative z-10">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
              Quản trị Hệ thống Khảo sát
            </span>
          </div>
          <h2 className="text-xl font-black mt-1.5 flex items-center gap-2.5 text-slate-900">
            <FileText className="w-6 h-6 text-blue-600" />
            Trung tâm Khảo sát Toàn diện Hệ thống
          </h2>
          <p className="text-xs text-slate-500 max-w-2xl mt-1 leading-relaxed">
            Thiết kế phiếu khảo sát linh hoạt bằng Survey Builder, định hình đối tượng nhận (GVCN, Học viên, Phụ huynh) và phạm vi phát hành trên toàn hệ thống.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 relative z-10">
          <button
            onClick={handleCreateNew}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4 text-white" />
            Tạo khảo sát mới
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500">Tổng số biểu mẫu</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{templates.length}</div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Đang phát hành
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-1">{totalPublished}</div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-amber-600">Bản nháp đang sửa</div>
          <div className="text-2xl font-black text-amber-600 mt-1">{totalDraft}</div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-400">Đã lưu trữ</div>
          <div className="text-2xl font-black text-slate-500 mt-1">{totalArchived}</div>
        </div>
      </div>

      {notification && (
        <div className={`p-4 rounded-xl text-xs font-bold flex items-center justify-between gap-2 border ${
          notification.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
            : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="text-slate-500 hover:text-slate-700 cursor-pointer">✕</button>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tiêu đề, tác giả..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap">
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <span>Đối tượng:</span>
          </div>
          <select
            value={filterAudience}
            onChange={(e) => setFilterAudience(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden"
          >
            <option value="ALL">Tất cả đối tượng</option>
            <option value="TEACHER">GVCN (Chủ nhiệm)</option>
            <option value="STUDENT">Học viên</option>
            <option value="PARENT">Phụ huynh</option>
          </select>

          <div className="flex items-center gap-1 text-xs text-slate-500 ml-2">
            <span>Trạng thái:</span>
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="PUBLISHED">Đang phát hành</option>
            <option value="DRAFT">Bản nháp</option>
            <option value="ARCHIVED">Lưu trữ</option>
          </select>
        </div>
      </div>

      {/* Templates List */}
      {filteredTemplates.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">Không tìm thấy biểu mẫu khảo sát nào</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Chưa có biểu mẫu phù hợp với bộ lọc hiện tại. Bấm "Tạo khảo sát mới" để bắt đầu thiết kế.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => {
            const questionCount = (template.sections || []).reduce(
              (sum, sec) => sum + (sec.questions ? sec.questions.length : 0),
              0
            );
            const audience = template.targetAudience || ['STUDENT'];

            return (
              <div
                key={template.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-all hover:border-indigo-300"
              >
                <div>
                  {/* Status & Scope tags */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide uppercase ${
                        template.status === 'PUBLISHED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : template.status === 'DRAFT'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {template.status === 'PUBLISHED'
                        ? 'Đang phát hành'
                        : template.status === 'DRAFT'
                        ? 'Bản nháp'
                        : 'Lưu trữ'}
                    </span>

                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-lg flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      {template.scope === 'SYSTEM' ? 'Toàn hệ thống' : template.scope === 'WORKSPACE' ? 'Cơ sở' : 'Lớp'}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2">
                    {template.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {template.description || 'Chưa có mô tả chi tiết cho khảo sát này.'}
                  </p>

                  {/* Audience tags */}
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <div className="text-[11px] font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      Đối tượng nhận:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {audience.map(aud => (
                        <span
                          key={aud}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            aud === 'TEACHER'
                              ? 'bg-blue-100 text-blue-800'
                              : aud === 'STUDENT'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {aud === 'TEACHER' ? 'GVCN' : aud === 'STUDENT' ? 'Học viên' : 'Phụ huynh'}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Metadata stats */}
                  <div className="grid grid-cols-2 gap-2 mt-3 p-2.5 bg-slate-50 rounded-xl text-xs text-slate-600">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Số câu hỏi</span>
                      <span className="font-extrabold text-slate-800">{questionCount} câu</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Tác giả</span>
                      <span className="font-semibold text-slate-700 truncate block">
                        {template.createdBy || 'Hệ thống'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions bottom */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenPreview(template)}
                      title="Xem trước khảo sát"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDuplicate(template.id)}
                      title="Nhân bản biểu mẫu"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {template.status === 'DRAFT' && (
                      <>
                        <button
                          onClick={() => handleEditDraft(template)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Sửa
                        </button>
                        <button
                          onClick={() => handlePublish(template.id)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Phát hành
                        </button>
                      </>
                    )}

                    {template.status === 'PUBLISHED' && (
                      <button
                        onClick={() => handleArchive(template.id)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Archive className="w-3.5 h-3.5" />
                        Lưu trữ
                      </button>
                    )}

                    {template.status === 'ARCHIVED' && (
                      <span className="text-[11px] text-slate-400 italic">Đã đóng nhận kết quả</span>
                    )}

                    {/* Delete Survey Button (Admin Real Action) */}
                    <button
                      onClick={() => handleDeleteSurvey(template)}
                      title="Xóa phiếu khảo sát"
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg border border-rose-200 transition-colors cursor-pointer flex items-center gap-1 active:scale-95"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>Xóa</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Survey Builder Modal */}
      {isBuilderOpen && (
        <SurveyBuilderModal
          isOpen={isBuilderOpen}
          mode="ADMIN"
          onClose={() => {
            setIsBuilderOpen(false);
            setBuilderTemplateId(null);
            loadTemplates();
          }}
          templateId={builderTemplateId || undefined}
        />
      )}

      {/* Survey Preview Modal */}
      {isPreviewOpen && previewTemplate && (
        <SurveyPreviewModal
          isOpen={isPreviewOpen}
          onClose={() => {
            setIsPreviewOpen(false);
            setPreviewTemplate(null);
          }}
          template={previewTemplate}
        />
      )}

      {/* Delete / Archive Survey Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4 animate-scale-in">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-2xl ${deleteTarget.responseCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                {deleteTarget.responseCount > 0 ? <AlertCircle className="w-6 h-6" /> : <Trash2 className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {deleteTarget.responseCount > 0 ? 'Xác nhận Lưu trữ Khảo sát' : 'Xác nhận Xóa Khảo sát'}
                </h3>
                <p className="text-xs text-slate-500">
                  {deleteTarget.responseCount > 0 ? 'Bảo toàn dữ liệu phản hồi' : 'Xóa vĩnh viễn khỏi hệ thống'}
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200 text-xs space-y-2">
              <div className="font-bold text-slate-800">
                {deleteTarget.template.title}
              </div>
              {deleteTarget.responseCount > 0 ? (
                <div className="text-amber-800 space-y-1">
                  <p>
                    Khảo sát này hiện đang có <strong>{deleteTarget.responseCount}</strong> phản hồi từ người dùng.
                  </p>
                  <p className="text-[11px] text-amber-700">
                    Theo quy tắc an toàn dữ liệu, hệ thống sẽ chuyển khảo sát sang trạng thái <strong>LƯU TRỮ</strong> (đóng nhận phản hồi nhưng bảo toàn toàn bộ kết quả đã gửi).
                  </p>
                </div>
              ) : (
                <div className="text-slate-600 space-y-1">
                  <p>
                    Khảo sát này chưa có phản hồi nào và sẽ bị <strong>xóa hoàn toàn</strong> khỏi danh sách.
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Thao tác này không thể hoàn tác sau khi xác nhận.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={deleteTarget.isSubmitting}
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={deleteTarget.isSubmitting}
                onClick={handleConfirmDeleteAction}
                className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 active:scale-95 ${
                  deleteTarget.responseCount > 0
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {deleteTarget.isSubmitting ? (
                  <Clock className="w-3.5 h-3.5 animate-spin" />
                ) : deleteTarget.responseCount > 0 ? (
                  <Archive className="w-3.5 h-3.5" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>
                  {deleteTarget.isSubmitting
                    ? 'Đang xử lý...'
                    : deleteTarget.responseCount > 0
                    ? 'Chuyển sang Lưu trữ'
                    : 'Xóa vĩnh viễn'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
