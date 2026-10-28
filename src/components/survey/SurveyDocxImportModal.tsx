/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  X,
  FileUp,
  Upload,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  FileText
} from 'lucide-react';
import { SurveySection } from '../../types';
import { DocxImportService } from '../../services/DocxImportService';
import { ParseResult } from '../../services/SurveyTextParser';

interface SurveyDocxImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (sections: SurveySection[]) => void;
}

export const SurveyDocxImportModal: React.FC<SurveyDocxImportModalProps> = ({
  isOpen,
  onClose,
  onImport
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (selectedFile: File) => {
    if (!selectedFile.name.toLowerCase().endsWith('.docx')) {
      setErrorMsg('Vui lòng chọn tệp Word định dạng .docx (Word 2007 trở lên).');
      return;
    }

    setFile(selectedFile);
    setErrorMsg('');
    setIsExtracting(true);

    try {
      const res = await DocxImportService.parseDocxFile(selectedFile);
      if (res.sections.length === 0 || res.stats.totalQuestions === 0) {
        setErrorMsg('Không tìm thấy câu hỏi nào trong file Word đã chọn. Vui lòng kiểm tra lại nội dung tệp.');
        setParseResult(null);
      } else {
        setParseResult(res);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi trích xuất tệp Word');
      setParseResult(null);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleConfirmImport = () => {
    if (!parseResult || parseResult.sections.length === 0) return;
    onImport(parseResult.sections);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-xs animate-fade-in">
      <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
              <FileUp className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">
                Nhập câu hỏi từ tệp Microsoft Word (.docx)
              </h2>
              <p className="text-[11px] text-slate-500">
                Tự động đọc nội dung câu hỏi, trích xuất cấu trúc và chuẩn bị vào bản nháp.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-all cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <input
            type="file"
            ref={fileInputRef}
            accept=".docx"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileChange(e.target.files[0]);
              }
            }}
            className="hidden"
          />

          {!parseResult ? (
            <div className="space-y-4">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-10 text-center hover:bg-blue-50/50 hover:border-blue-400 transition-all cursor-pointer group"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-600 mb-3 group-hover:scale-105 transition-transform">
                  <Upload className="h-7 w-7" />
                </div>
                <h3 className="text-xs font-extrabold text-slate-800">
                  {isExtracting ? 'Đang trích xuất dữ liệu...' : 'Kéo thả file .docx hoặc nhấp để chọn tệp'}
                </h3>
                <p className="text-[11px] text-slate-500 mt-1 max-w-sm">
                  Chỉ hỗ trợ tệp Microsoft Word (.docx). Không lưu trữ tài liệu Word gốc trên máy chủ.
                </p>
              </div>

              {isExtracting && (
                <div className="flex items-center justify-center gap-2 p-4 text-xs font-bold text-blue-600 bg-blue-50 rounded-xl">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Hệ thống đang xử lý và phân tích cấu trúc văn bản...</span>
                </div>
              )}

              {errorMsg && (
                <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700 border border-rose-200">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>
          ) : (
            /* Result Preview */
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between rounded-xl bg-emerald-50 p-4 border border-emerald-200 text-emerald-800">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                  <div>
                    <h3 className="text-xs font-extrabold">Đã đọc tệp: {file?.name}</h3>
                    <p className="text-[11px] text-emerald-700">
                      Tìm thấy {parseResult.stats.totalSections} phần và {parseResult.stats.totalQuestions} câu hỏi.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setParseResult(null);
                    setFile(null);
                  }}
                  className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-slate-700 border border-slate-200 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Chọn tệp khác
                </button>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Tổng câu hỏi</p>
                  <p className="text-lg font-extrabold text-slate-900 mt-0.5">{parseResult.stats.totalQuestions}</p>
                </div>
                <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-2.5">
                  <p className="text-[10px] text-blue-700 font-bold uppercase">Trắc nghiệm</p>
                  <p className="text-lg font-extrabold text-blue-800 mt-0.5">
                    {parseResult.stats.singleChoiceCount + parseResult.stats.multiChoiceCount}
                  </p>
                </div>
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-2.5">
                  <p className="text-[10px] text-indigo-700 font-bold uppercase">Tự luận / Ý kiến</p>
                  <p className="text-lg font-extrabold text-indigo-800 mt-0.5">
                    {parseResult.stats.shortTextCount + parseResult.stats.longTextCount}
                  </p>
                </div>
                <div className={`rounded-xl border p-2.5 ${
                  parseResult.unresolvedCount > 0 ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-slate-50'
                }`}>
                  <p className={`text-[10px] font-bold uppercase ${
                    parseResult.unresolvedCount > 0 ? 'text-amber-800' : 'text-slate-500'
                  }`}>
                    Cần xem xét
                  </p>
                  <p className={`text-lg font-extrabold mt-0.5 ${
                    parseResult.unresolvedCount > 0 ? 'text-amber-800' : 'text-slate-900'
                  }`}>
                    {parseResult.unresolvedCount}
                  </p>
                </div>
              </div>

              {/* Structure Preview */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  Xem trước cấu trúc ({parseResult.sections.length} phần):
                </h4>
                {parseResult.sections.map((sec, sIdx) => (
                  <div key={sec.id || sIdx} className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-900 border-b border-slate-100 pb-2">
                      <span>{sec.title}</span>
                      <span className="text-[11px] text-slate-500">{sec.questions.length} câu hỏi</span>
                    </div>
                    <div className="space-y-1.5 pl-2">
                      {sec.questions.map((q, qIdx) => (
                        <div key={q.id || qIdx} className="flex items-start justify-between text-xs py-1 border-b border-slate-50 last:border-0">
                          <span className="text-slate-800 font-medium line-clamp-1">
                            {qIdx + 1}. {q.title}
                          </span>
                          <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-mono font-bold text-slate-600 ml-2">
                            {q.type} {q.allowOther ? '(+Khác)' : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
          >
            Hủy bỏ
          </button>

          {parseResult && (
            <button
              type="button"
              onClick={handleConfirmImport}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-all cursor-pointer shadow-xs"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Nhập vào bản nháp khảo sát</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
