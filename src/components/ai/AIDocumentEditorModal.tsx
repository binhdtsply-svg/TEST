/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Copy,
  Check,
  X,
  Eye,
  Edit3,
  Sparkles,
  School,
  Calendar,
  UserCheck
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { classService } from '../../services/ClassService';

interface AIDocumentEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTitle: string;
  initialContent: string;
  documentType?: 'plan' | 'report' | 'parent_letter' | 'situation' | 'game' | 'general';
}

export const AIDocumentEditorModal: React.FC<AIDocumentEditorModalProps> = ({
  isOpen,
  onClose,
  initialTitle = '',
  initialContent = '',
  documentType = 'general'
}) => {
  const classSettings = classService.getSettings();
  const [docTitle, setDocTitle] = useState<string>(initialTitle || 'VĂN BẢN CÔNG TÁC CHỦ NHIỆM');
  const [docContent, setDocContent] = useState<string>(initialContent || '');
  const [activeView, setActiveView] = useState<'editor' | 'preview'>('preview');
  const [isExporting, setIsExporting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDocTitle(initialTitle || 'VĂN BẢN CÔNG TÁC CHỦ NHIỆM');
      setDocContent(initialContent || '');
    }
  }, [isOpen, initialTitle, initialContent]);

  if (!isOpen) return null;

  const handleExportWord = async () => {
    setIsExporting(true);
    try {
      const { wordExportService } = await import('../../services/WordExportService');
      await wordExportService.exportAIResponseToWord(
        docTitle,
        docContent,
        {
          documentType,
          schoolName: classSettings.schoolName,
          className: classSettings.className,
          teacherName: classSettings.homeroomTeacherName || classSettings.teacherName,
          academicYear: classSettings.academicYear,
          semester: classSettings.semester
        }
      );
    } catch (err: any) {
      setErrorMessage(`Không thể xuất file Word: ${err?.message || 'Vui lòng thử lại'}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(`${docTitle}\n\n${docContent}`);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div
        id="ai-doc-editor-modal"
        className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Trình Soạn Thảo & Xuất File Word (.docx)
              </h3>
              <p className="text-xs text-slate-500">
                Định dạng chuẩn văn bản hành chính giáo dục Việt Nam (Khổ A4, Times New Roman, Quốc hiệu/Đơn vị)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Switcher */}
            <div className="bg-slate-200/80 p-1 rounded-xl flex items-center gap-1 text-xs">
              <button
                type="button"
                onClick={() => setActiveView('preview')}
                className={`px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                  activeView === 'preview' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Xem trước</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveView('editor')}
                className={`px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                  activeView === 'editor' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Chỉnh sửa nội dung</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar bg-slate-100/50">
          {errorMessage && (
            <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800 animate-fade-in">
              <span>{errorMessage}</span>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-rose-500 hover:text-rose-700 ml-2"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Title Editor */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
              Tiêu đề văn bản (Sẽ xuất hiện trang trọng trên đầu trang Word):
            </label>
            <input
              type="text"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              className="w-full px-3.5 py-2 text-sm font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              placeholder="Nhập tiêu đề văn bản..."
            />
          </div>

          {/* Editor or Preview Pane */}
          {activeView === 'editor' ? (
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                Nội dung chi tiết (Hỗ trợ Markdown, danh sách, tiêu đề I - VIII):
              </label>
              <textarea
                value={docContent}
                onChange={(e) => setDocContent(e.target.value)}
                rows={16}
                className="w-full p-4 text-xs font-mono text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 leading-relaxed custom-scrollbar"
                placeholder="Nhập hoặc chỉnh sửa nội dung..."
              />
            </div>
          ) : (
            /* Document Page Simulation (Standard A4 Paper Look) */
            <div className="bg-white max-w-3xl mx-auto p-8 sm:p-12 rounded-2xl border border-slate-300 shadow-md text-slate-800 font-serif leading-relaxed text-sm space-y-6">
              {/* Official Header */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-4 text-xs">
                <div>
                  <p className="font-bold text-slate-900">
                    TRƯỜNG/ĐƠN VỊ: {classSettings.schoolName.toUpperCase()}
                  </p>
                  <p className="italic text-slate-600">
                    LỚP: {classSettings.className} · NĂM HỌC: {classSettings.academicYear}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                  <p className="italic text-slate-600">Độc lập - Tự do - Hạnh phúc</p>
                </div>
              </div>

              {/* Document Title */}
              <div className="text-center py-2 space-y-1">
                <h1 className="text-xl font-bold uppercase tracking-wide text-slate-900">
                  {docTitle}
                </h1>
                <p className="text-xs italic text-slate-500">
                  (Lớp {classSettings.className} — Giáo viên Chủ nhiệm: {classSettings.homeroomTeacherName || classSettings.teacherName || 'GVCN'})
                </p>
              </div>

              {/* Document Body Markdown */}
              <div className="prose prose-slate max-w-none text-xs sm:text-sm leading-relaxed space-y-3 font-serif">
                <ReactMarkdown>{docContent}</ReactMarkdown>
              </div>

              {/* Signature Section */}
              <div className="pt-8 flex justify-end">
                <div className="text-center w-64 space-y-1 text-xs">
                  <p className="italic text-slate-500">
                    Ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}
                  </p>
                  <p className="font-bold uppercase text-slate-900">GIÁO VIÊN CHỦ NHIỆM</p>
                  <div className="h-16" />
                  <p className="font-bold text-slate-900">
                    {classSettings.homeroomTeacherName || classSettings.teacherName || 'Giáo viên Chủ nhiệm'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
          <button
            type="button"
            onClick={handleCopyText}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            {isCopied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700">Đã sao chép!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-500" />
                <span>Sao chép toàn bộ</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-all"
            >
              Đóng
            </button>

            <button
              type="button"
              id="btn-confirm-export-docx"
              onClick={handleExportWord}
              disabled={isExporting}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Đang tạo file Word...' : 'Tải về file Word (.docx)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
