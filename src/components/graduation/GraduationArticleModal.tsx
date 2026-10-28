/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Plus, X, Save, Pin, Upload, Paperclip, FileText, Globe, Calendar, Archive } from 'lucide-react';
import { OfficialGraduationArticle, GraduationArticleCategory, AttachedFile } from '../../types';
import { officialGraduationExamService } from '../../services/OfficialGraduationExamService';
import { authService } from '../../services/AuthService';
import { classService } from '../../services/ClassService';

interface GraduationArticleModalProps {
  initialArticle?: OfficialGraduationArticle | null;
  onClose: () => void;
}

const CATEGORIES: GraduationArticleCategory[] = [
  'Tuyển sinh',
  'Quy chế',
  'Lịch thi',
  'Đăng ký dự thi',
  'Hướng dẫn',
  'Ưu tiên',
  'Khuyến khích',
  'Thông báo',
  'Khác'
];

export const GraduationArticleModal: React.FC<GraduationArticleModalProps> = ({ initialArticle, onClose }) => {
  const isEditing = !!initialArticle;
  const currentUser = authService.getCurrentUser();
  const isSuperAdmin = currentUser.role === 'SUPER_ADMIN' || (currentUser as any).role === 'ADMIN';

  const defaultSource = isSuperAdmin
    ? 'Ban Giám Hiệu / Ban Quản Trị'
    : (classService.getSettings().homeroomTeacherName ? `GVCN - ${classService.getSettings().homeroomTeacherName}` : 'Giáo viên chủ nhiệm');

  const [title, setTitle] = useState(initialArticle?.title || '');
  const [summary, setSummary] = useState(initialArticle?.summary || '');
  const [content, setContent] = useState(initialArticle?.content || '');
  const [category, setCategory] = useState<GraduationArticleCategory>(initialArticle?.category || 'Tuyển sinh');
  const [admissionYear, setAdmissionYear] = useState<string>(initialArticle?.admissionYear || initialArticle?.examYear || '2026');
  const [publishedAt, setPublishedAt] = useState<string>(initialArticle?.publishedAt || new Date().toLocaleDateString('vi-VN'));
  const [sourceName, setSourceName] = useState(initialArticle?.sourceName || defaultSource);
  const [sourceUrl, setSourceUrl] = useState(initialArticle?.sourceUrl || '');
  const [scope, setScope] = useState<'SYSTEM' | 'CLASS'>(
    initialArticle?.scope || (isSuperAdmin ? 'SYSTEM' : 'CLASS')
  );
  const [isOfficial, setIsOfficial] = useState(initialArticle?.isOfficial ?? true);
  const [isPinned, setIsPinned] = useState(initialArticle?.isPinned ?? false);
  const [isImportant, setIsImportant] = useState(initialArticle?.isImportant ?? false);
  const [isArchived, setIsArchived] = useState(initialArticle?.status === 'ARCHIVED');
  const [attachments, setAttachments] = useState<AttachedFile[]>(initialArticle?.attachments || []);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const isSheet = !!file.name.match(/\.(xlsx|xls|csv)$/i);
      const isDoc = !!file.name.match(/\.(doc|docx)$/i);
      const isPdf = file.name.toLowerCase().endsWith('.pdf');
      const isImg = !!file.name.match(/\.(png|jpg|jpeg|webp)$/i);

      const newFile: AttachedFile = {
        id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: file.name,
        size: `${Math.round(file.size / 1024)} KB`,
        type: isPdf ? 'pdf' : isSheet ? 'sheet' : isDoc ? 'doc' : isImg ? 'image' : 'other',
        url: URL.createObjectURL(file)
      };
      setAttachments(prev => [...prev, newFile]);
    });
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Vui lòng nhập tiêu đề thông tin/bản tin.');
      return;
    }
    if (!summary.trim()) {
      setErrorMsg('Vui lòng nhập tóm tắt nội dung chính.');
      return;
    }

    let sourceDomain = 'moet.gov.vn';
    try {
      if (sourceUrl.trim()) {
        const parsed = new URL(sourceUrl.startsWith('http') ? sourceUrl : `https://${sourceUrl}`);
        sourceDomain = parsed.hostname;
      }
    } catch {
      sourceDomain = 'nguon-chinh-thuc';
    }

    const cleanYear = admissionYear.trim() || '2026';

    if (isEditing && initialArticle) {
      officialGraduationExamService.updateArticle(initialArticle.id, {
        title: title.trim(),
        summary: summary.trim(),
        content: content.trim(),
        category,
        admissionYear: cleanYear,
        examYear: cleanYear,
        publishedAt: publishedAt.trim() || initialArticle.publishedAt,
        sourceName: sourceName.trim() || 'Nguồn chính thức',
        sourceDomain,
        sourceUrl: sourceUrl.trim(),
        scope: isSuperAdmin ? scope : initialArticle.scope || 'CLASS',
        status: isArchived ? 'ARCHIVED' : 'ACTIVE',
        isOfficial,
        isPinned,
        isImportant,
        attachments
      });
    } else {
      officialGraduationExamService.createArticle({
        title: title.trim(),
        summary: summary.trim(),
        content: content.trim(),
        category,
        admissionYear: cleanYear,
        examYear: cleanYear,
        publishedAt: publishedAt.trim() || new Date().toLocaleDateString('vi-VN'),
        sourceName: sourceName.trim() || 'Nguồn chính thức',
        sourceDomain,
        sourceUrl: sourceUrl.trim(),
        scope: isSuperAdmin ? scope : 'CLASS',
        status: isArchived ? 'ARCHIVED' : 'ACTIVE',
        createdBy: currentUser.id,
        authorName: currentUser.fullName || (isSuperAdmin ? 'Admin' : 'GVCN'),
        authorRole: currentUser.role,
        isOfficial,
        isPinned,
        isImportant,
        attachments
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white shadow-2xs">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">
                {isEditing ? 'CHỈNH SỬA THÔNG TIN TUYỂN SINH & KỲ THI' : 'THÊM THÔNG BÁO / THÔNG TIN TUYỂN SINH & KỲ THI'}
              </h3>
              <p className="text-[11px] text-slate-500">
                Cập nhật thông tin tuyển sinh, quy chế, mốc thời gian và đường link nguồn chính thức
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="overflow-y-auto p-6 space-y-4 text-xs">
          {errorMsg && (
            <div className="rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-800 border border-rose-200">
              {errorMsg}
            </div>
          )}

          {/* Title */}
          <div className="space-y-1">
            <label className="font-black text-slate-800 uppercase tracking-tight block">
              TIÊU ĐỀ THÔNG BÁO / VĂN BẢN <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="VD: Hướng dẫn đăng ký xét tuyển Đại học năm 2027..."
              className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-bold focus:border-blue-500 focus:outline-hidden"
              required
            />
          </div>

          {/* Category & Admission/Exam Year */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="font-black text-slate-800 uppercase tracking-tight block">
                DANH MỤC <span className="text-rose-500">*</span>
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as GraduationArticleCategory)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 p-2 text-xs font-bold"
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-black text-slate-800 uppercase tracking-tight block">
                NĂM TUYỂN SINH / THI <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={admissionYear}
                onChange={e => setAdmissionYear(e.target.value)}
                placeholder="VD: 2027, 2026..."
                className="w-full rounded-xl border border-slate-300 bg-white p-2 text-xs font-bold"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="font-black text-slate-800 uppercase tracking-tight block">
                NGÀY BAN HÀNH
              </label>
              <input
                type="text"
                value={publishedAt}
                onChange={e => setPublishedAt(e.target.value)}
                placeholder="DD/MM/YYYY"
                className="w-full rounded-xl border border-slate-300 bg-white p-2 text-xs font-semibold"
              />
            </div>
          </div>

          {/* Scope selection for Admin */}
          {isSuperAdmin && (
            <div className="space-y-1 p-2.5 bg-blue-50/60 rounded-xl border border-blue-200">
              <label className="font-bold text-blue-900 block text-[11px] uppercase">
                Phạm vi phát hành (Quyền Quản trị):
              </label>
              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-800">
                  <input
                    type="radio"
                    name="scope"
                    value="SYSTEM"
                    checked={scope === 'SYSTEM'}
                    onChange={() => setScope('SYSTEM')}
                    className="text-blue-600"
                  />
                  <span>Thông tin cấp Hệ thống (Toàn trường)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-800">
                  <input
                    type="radio"
                    name="scope"
                    value="CLASS"
                    checked={scope === 'CLASS'}
                    onChange={() => setScope('CLASS')}
                    className="text-blue-600"
                  />
                  <span>Thông tin riêng cấp Lớp</span>
                </label>
              </div>
            </div>
          )}

          {/* Source Name & Official Source Link */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-black text-slate-800 uppercase tracking-tight block">
                TÊN NGUỒN CUNG CẤP
              </label>
              <input
                type="text"
                value={sourceName}
                onChange={e => setSourceName(e.target.value)}
                placeholder="VD: Bộ GD&ĐT, Sở GD&ĐT, Trường ĐH Bách Khoa, GVCN..."
                className="w-full rounded-xl border border-slate-300 bg-white p-2 text-xs font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="font-black text-slate-800 uppercase tracking-tight block">
                LINK NGUỒN CHÍNH THỨC (URL)
              </label>
              <input
                type="url"
                value={sourceUrl}
                onChange={e => setSourceUrl(e.target.value)}
                placeholder="https://moet.gov.vn/..."
                className="w-full rounded-xl border border-slate-300 bg-white p-2 text-xs text-blue-600 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Short summary */}
          <div className="space-y-1">
            <label className="font-black text-slate-800 uppercase tracking-tight block">
              TÓM TẮT NỘI DUNG CHÍNH <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              value={summary}
              onChange={e => setSummary(e.target.value)}
              placeholder="Tóm tắt 1-2 câu cốt lõi giúp học sinh và phụ huynh nhanh chóng nắm bắt..."
              className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs focus:border-blue-500 focus:outline-hidden"
              required
            />
          </div>

          {/* Detailed Content */}
          <div className="space-y-1">
            <label className="font-black text-slate-800 uppercase tracking-tight block">
              NỘI DUNG CHI TIẾT &amp; CÁC MỐC THỜI GIAN
            </label>
            <textarea
              rows={4}
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Nội dung chi tiết, các mốc thời gian quan trọng, hướng dẫn đăng ký, điều kiện xét tuyển..."
              className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs leading-relaxed focus:border-blue-500 focus:outline-hidden"
            />
          </div>

          {/* Attachments */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-black text-slate-800 uppercase tracking-tight">TỆP ĐÍNH KÈM (ẢNH, PDF, WORD, EXCEL)</label>
              <label className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline cursor-pointer">
                <Upload className="h-3.5 w-3.5" />
                <span>Chọn tệp tải lên</span>
                <input type="file" multiple onChange={handleFileUpload} className="hidden" />
              </label>
            </div>

            {attachments.length > 0 && (
              <div className="space-y-1.5 rounded-xl bg-slate-50 p-2.5 border border-slate-200">
                {attachments.map(att => (
                  <div key={att.id} className="flex items-center justify-between rounded-lg bg-white p-2 border border-slate-200 text-xs">
                    <span className="font-bold text-slate-800 truncate max-w-[300px]">{att.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(att.id)}
                      className="text-rose-500 hover:text-rose-700 font-bold p-1 cursor-pointer"
                    >
                      Xóa
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Checkboxes: Pinned, Official, Important, Archived */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={e => setIsPinned(e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded-md"
              />
              <span className="text-[11px] font-bold text-slate-700">Ghim lên đầu</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isOfficial}
                onChange={e => setIsOfficial(e.target.checked)}
                className="h-4 w-4 text-emerald-600 rounded-md"
              />
              <span className="text-[11px] font-bold text-slate-700">Nguồn chính thức</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isImportant}
                onChange={e => setIsImportant(e.target.checked)}
                className="h-4 w-4 text-amber-600 rounded-md"
              />
              <span className="text-[11px] font-bold text-slate-700">Đánh dấu quan trọng</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isArchived}
                onChange={e => setIsArchived(e.target.checked)}
                className="h-4 w-4 text-slate-500 rounded-md"
              />
              <span className="text-[11px] font-bold text-slate-700">Lưu trữ (Archived)</span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 active:scale-95 transition-all cursor-pointer"
            >
              <Save className="h-4 w-4" />
              <span>{isEditing ? 'Lưu thay đổi' : 'Đăng thông tin'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

