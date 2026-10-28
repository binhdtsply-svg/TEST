/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Edit,
  Edit3,
  Eye,
  Trash2,
  Copy,
  Sparkles,
  FileUp,
  CheckCircle2,
  Clock,
  Archive,
  Layers,
  Send,
  AlertCircle,
  HelpCircle,
  BarChart2,
  X,
  Check,
  ShieldCheck
} from 'lucide-react';
import { SurveyTemplate, SurveyTemplateStatus } from '../../types';
import { surveyTemplateService } from '../../services/SurveyTemplateService';
import { studentSurveyService } from '../../services/StudentSurveyService';
import { classService } from '../../services/ClassService';
import { authService } from '../../services/AuthService';
import { SurveyBuilderModal } from './SurveyBuilderModal';
import { SurveyPreviewModal } from './SurveyPreviewModal';

export const SurveyTemplateManagerView: React.FC = () => {
  const [templates, setTemplates] = useState<SurveyTemplate[]>([]);
  const [activeTemplateForEdit, setActiveTemplateForEdit] = useState<SurveyTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<SurveyTemplate | null>(null);

  const currentUser = authService.getCurrentUser();
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  const canManageTemplate = (template: SurveyTemplate) => {
    return surveyTemplateService.canUserManageTemplate(currentUser?.role || 'TEACHER', template);
  };

  // Rename state
  const [renameModalTemplate, setRenameModalTemplate] = useState<SurveyTemplate | null>(null);
  const [renameTitleInput, setRenameTitleInput] = useState<string>('');
  const [renameError, setRenameError] = useState<string>('');

  const classSettings = classService.getSettings();
  const currentSchoolYear = classSettings.academicYear || '2025 - 2026';

  const loadTemplates = () => {
    const list = surveyTemplateService.getTemplatesBySchoolYear(currentSchoolYear);
    setTemplates(list);
  };

  useEffect(() => {
    loadTemplates();
  }, [currentSchoolYear]);

  // Handle open rename modal
  const handleOpenRename = (template: SurveyTemplate) => {
    setRenameModalTemplate(template);
    setRenameTitleInput(template.title);
    setRenameError('');
  };

  // Handle save rename
  const handleSaveRename = () => {
    if (!renameModalTemplate) return;
    const trimmed = renameTitleInput.trim();
    if (!trimmed) {
      setRenameError('Tên bài khảo sát không được để trống.');
      return;
    }

    try {
      surveyTemplateService.renameTemplate(renameModalTemplate.id, trimmed);
      setRenameModalTemplate(null);
      loadTemplates();
    } catch (err: any) {
      setRenameError(err.message || 'Lỗi khi đổi tên bài khảo sát');
    }
  };

  // Handle create new blank draft
  const handleCreateNew = () => {
    const newDraft = surveyTemplateService.createTemplate({
      title: 'Phiếu khảo sát học sinh đầu năm',
      description: '',
      schoolYear: currentSchoolYear,
      sections: []
    });

    loadTemplates();
    setActiveTemplateForEdit(newDraft);
  };

  // Handle Edit existing Published Template (creates a new version draft)
  const handleEditPublished = (publishedTemplate: SurveyTemplate) => {
    try {
      const newDraft = surveyTemplateService.createVersionDraft(publishedTemplate.id);
      loadTemplates();
      setActiveTemplateForEdit(newDraft);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi tạo bản nháp phiên bản mới');
    }
  };

  // Handle Edit Draft
  const handleEditDraft = (draftTemplate: SurveyTemplate) => {
    setActiveTemplateForEdit(draftTemplate);
  };

  // Handle Delete Draft or Survey with safe rules
  const handleDeleteOrArchive = (template: SurveyTemplate) => {
    const responses = studentSurveyService.getResponsesByTemplate(template.id);
    const hasResponses = responses.length > 0;

    if (template.status === 'DRAFT' && !hasResponses) {
      if (!confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn bản nháp "${template.title}" không?`)) {
        return;
      }
      try {
        surveyTemplateService.deleteOrArchiveSurvey(template.id, false);
        loadTemplates();
      } catch (err: any) {
        alert(err.message || 'Lỗi khi xóa bản nháp');
      }
    } else {
      const reason = hasResponses
        ? `Bài khảo sát "${template.title}" đã có ${responses.length} phản hồi từ học sinh.`
        : `Bài khảo sát "${template.title}" đang ở trạng thái phát hành.`;
      if (
        !confirm(
          `${reason}\n\nĐể bảo toàn dữ liệu và lịch sử học tập, hệ thống sẽ chuyển bài khảo sát sang trạng thái LƯU TRỮ (Archive).\n\nBạn có muốn tiếp tục lưu trữ bài khảo sát không?`
        )
      ) {
        return;
      }
      try {
        surveyTemplateService.deleteOrArchiveSurvey(template.id, true);
        loadTemplates();
      } catch (err: any) {
        alert(err.message || 'Lỗi khi lưu trữ bài khảo sát');
      }
    }
  };

  // Response count helper
  const allResponses = studentSurveyService.getAllSurveys();

  const publishedTemplates = templates.filter((t) => t.status === 'PUBLISHED');
  const draftTemplates = templates.filter((t) => t.status === 'DRAFT');
  const archivedTemplates = templates.filter((t) => t.status === 'ARCHIVED');

  const handleArchiveTemplate = (template: SurveyTemplate) => {
    handleDeleteOrArchive(template);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header and Quick Creation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Layers className="h-5 w-5 text-blue-600" />
            <span>Quản lý hệ thống khảo sát & Biểu mẫu</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Quản lý đồng thời nhiều bài khảo sát độc lập, tạo mới từ ChatGPT/Word, phát hành và tự động phát thông báo đến học sinh.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleCreateNew}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-all cursor-pointer shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Tạo khảo sát mới</span>
          </button>
        </div>
      </div>

      {/* 1. CURRENTLY ACTIVE (PUBLISHED) TEMPLATES */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 rounded-full bg-emerald-500 ring-4 ring-emerald-100"></span>
            <h3 className="text-sm font-extrabold text-slate-900">
              Các bài khảo sát đang phát hành ({publishedTemplates.length})
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Học sinh có thể truy cập và điền phiếu trực tiếp
          </span>
        </div>

        {publishedTemplates.length > 0 ? (
          <div className="space-y-3">
            {publishedTemplates.map((pub) => {
              const responsesForThis = studentSurveyService.getResponsesByTemplate(pub.id);
              const submittedCount = responsesForThis.filter(r => r.status === 'SUBMITTED' || r.status === 'REVIEWED').length;
              return (
                <div key={pub.id} className="rounded-xl border border-emerald-200/80 bg-emerald-50/30 p-4 space-y-3 transition-all hover:border-emerald-300">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-extrabold text-slate-900">{pub.title}</h4>
                        <span className="rounded-lg bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200">
                          Phiên bản v{pub.version}
                        </span>
                        {pub.surveyType && (
                          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                            {pub.surveyType}
                          </span>
                        )}
                      </div>
                      {pub.description && (
                        <p className="text-xs text-slate-600 mt-1">{pub.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-[11px] text-slate-500 mt-2 font-medium flex-wrap">
                        <span>Năm học: <b>{pub.schoolYear}</b></span>
                        <span>Cấu trúc: <b>{pub.sections.length} phần, {pub.sections.reduce((acc, s) => acc + s.questions.length, 0)} câu hỏi</b></span>
                        <span>Đã nộp: <strong className="text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded">{submittedCount} phản hồi</strong></span>
                        <span>Xuất bản: <b>{new Date(pub.publishedAt || pub.updatedAt).toLocaleString('vi-VN')}</b></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <button
                        onClick={() => setPreviewTemplate(pub)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer shadow-xs"
                      >
                        <Eye className="h-4 w-4 text-blue-600" />
                        <span>Xem trước</span>
                      </button>

                      {canManageTemplate(pub) ? (
                        <>
                          <button
                            onClick={() => handleOpenRename(pub)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer shadow-xs"
                            title="Chỉnh sửa tên bài khảo sát"
                          >
                            <Edit3 className="h-4 w-4 text-amber-600" />
                            <span>Đổi tên</span>
                          </button>

                          <button
                            onClick={() => handleEditPublished(pub)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-blue-700 transition-all cursor-pointer shadow-xs"
                            title="Chỉnh sửa và tạo phiên bản mới v + 1"
                          >
                            <Edit className="h-4 w-4" />
                            <span>Tạo bản v{pub.version + 1}</span>
                          </button>

                          <button
                            onClick={() => handleDeleteOrArchive(pub)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-all cursor-pointer shadow-xs"
                            title="Xóa hoặc lưu trữ bài khảo sát"
                          >
                            <Trash2 className="h-4 w-4 text-rose-500" />
                            <span>Xóa / Lưu trữ</span>
                          </button>
                        </>
                      ) : (
                        <span className="text-[11px] font-medium text-slate-400 italic px-2">
                          Khảo sát từ Admin
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center space-y-2">
            <AlertCircle className="mx-auto h-8 w-8 text-amber-500" />
            <p className="text-xs font-bold text-slate-700">Chưa có bài khảo sát nào được phát hành cho năm học này</p>
            <p className="text-[11px] text-slate-500">
              Nhấp "Tạo khảo sát mới" hoặc mở bản nháp bên dưới để xuất bản.
            </p>
          </div>
        )}
      </div>

      {/* 2. DRAFT TEMPLATES (BẢN NHÁP) */}
      {draftTemplates.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-extrabold text-slate-900">
                Bản nháp đang soạn thảo ({draftTemplates.length})
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {draftTemplates.map((draft) => (
              <div
                key={draft.id}
                className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 space-y-3 hover:bg-amber-50/70 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="rounded-md bg-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                        Bản nháp v{draft.version}
                      </span>
                      {draft.source && (
                        <span className="rounded-md bg-slate-200 px-1.5 py-0.5 text-[9px] font-bold text-slate-700 font-mono">
                          {draft.source}
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs font-extrabold text-slate-900 mt-1.5 line-clamp-1">
                      {draft.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {draft.sections.length} phần • {draft.sections.reduce((acc, s) => acc + s.questions.length, 0)} câu hỏi
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setPreviewTemplate(draft)}
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-white hover:text-blue-600 transition-all cursor-pointer"
                      title="Xem trước"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    {canManageTemplate(draft) ? (
                      <>
                        <button
                          onClick={() => handleOpenRename(draft)}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-white hover:text-amber-600 transition-all cursor-pointer"
                          title="Chỉnh sửa tên bài khảo sát"
                        >
                          <Edit3 className="h-4 w-4 text-amber-600" />
                        </button>
                        <button
                          onClick={() => handleEditDraft(draft)}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-white hover:text-indigo-600 transition-all cursor-pointer"
                          title="Tiếp tục chỉnh sửa"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteOrArchive(draft)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-100 hover:text-rose-600 transition-all cursor-pointer"
                          title="Xóa bản nháp"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic px-1">Chỉ xem</span>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Cập nhật: {new Date(draft.updatedAt).toLocaleTimeString('vi-VN')} {new Date(draft.updatedAt).toLocaleDateString('vi-VN')}</span>
                  {canManageTemplate(draft) ? (
                    <button
                      onClick={() => handleEditDraft(draft)}
                      className="font-bold text-blue-600 hover:underline cursor-pointer"
                    >
                      Soạn tiếp →
                    </button>
                  ) : (
                    <button
                      onClick={() => setPreviewTemplate(draft)}
                      className="font-bold text-slate-600 hover:underline cursor-pointer"
                    >
                      Xem chi tiết →
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. ARCHIVED / HISTORICAL TEMPLATES */}
      {archivedTemplates.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Archive className="h-4 w-4 text-slate-500" />
              <h3 className="text-sm font-extrabold text-slate-900">
                Lịch sử phiên bản đã lưu trữ ({archivedTemplates.length})
              </h3>
            </div>
            <p className="text-[11px] text-slate-400">
              Toàn bộ câu trả lời của học viên từ các phiên bản cũ đều được bảo toàn.
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {archivedTemplates.map((arch) => (
              <div key={arch.id} className="py-3 flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                      Phiên bản v{arch.version} (Đã lưu trữ)
                    </span>
                    <span className="text-xs font-bold text-slate-800">{arch.title}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {arch.sections.length} phần • Cập nhật: {new Date(arch.updatedAt).toLocaleDateString('vi-VN')}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setPreviewTemplate(arch)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    <Eye className="h-3.5 w-3.5 text-blue-600" />
                    <span>Xem lại</span>
                  </button>

                  {canManageTemplate(arch) ? (
                    <>
                      <button
                        onClick={() => handleOpenRename(arch)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                        title="Chỉnh sửa tên bài khảo sát"
                      >
                        <Edit3 className="h-3.5 w-3.5 text-amber-600" />
                        <span>Đổi tên</span>
                      </button>

                      <button
                        onClick={() => handleEditPublished(arch)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100 cursor-pointer"
                        title="Tạo bản nháp mới từ phiên bản này"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        <span>Nhân bản làm mới</span>
                      </button>
                    </>
                  ) : (
                    <span className="text-[11px] text-slate-400 italic px-1">Chỉ xem</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rename Survey Modal */}
      {renameModalTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm">
                <Edit3 className="h-4 w-4 text-amber-600" />
                <span>Chỉnh sửa tên bài khảo sát</span>
              </div>
              <button
                onClick={() => setRenameModalTemplate(null)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tên bài khảo sát <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={renameTitleInput}
                  onChange={(e) => {
                    setRenameTitleInput(e.target.value);
                    if (renameError) setRenameError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveRename();
                    }
                  }}
                  placeholder="Nhập tên bài khảo sát mới..."
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  autoFocus
                />
                {renameError && (
                  <p className="text-[11px] text-rose-600 font-medium mt-1">{renameError}</p>
                )}
              </div>

              <div className="rounded-xl bg-slate-50 p-3 border border-slate-200/80 text-[11px] text-slate-600 space-y-1">
                <p className="font-semibold text-slate-700">Quy tắc bảo toàn dữ liệu:</p>
                <ul className="list-disc list-inside space-y-0.5 text-slate-500">
                  <li>Cập nhật trực tiếp trên bài khảo sát hiện tại (ID: <span className="font-mono text-slate-600">{renameModalTemplate.id}</span>)</li>
                  <li>Không tạo bản ghi mới, không thay đổi ID và không làm mất phản hồi của học sinh</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRenameModalTemplate(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveRename}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 cursor-pointer shadow-xs"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Lưu thay đổi</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Survey Builder Modal */}
      {activeTemplateForEdit && (
        <SurveyBuilderModal
          isOpen={true}
          template={activeTemplateForEdit}
          onClose={() => setActiveTemplateForEdit(null)}
          onSaved={() => {
            loadTemplates();
            setActiveTemplateForEdit(null);
          }}
        />
      )}

      {/* Survey Preview Modal */}
      {previewTemplate && (
        <SurveyPreviewModal
          isOpen={true}
          template={previewTemplate}
          onClose={() => setPreviewTemplate(null)}
        />
      )}
    </div>
  );
};
