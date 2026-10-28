/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  Sparkles,
  FileText,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  RefreshCw,
  Info,
  Check,
  Copy,
  Calendar,
  Clock,
  Timer,
  Table,
  PlusCircle,
  Layers,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { SurveySection } from '../../types';
import { SurveyTextParser, ParseResult } from '../../services/SurveyTextParser';

interface SurveyTextPasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (
    sections: SurveySection[],
    source: 'AI_PASTE' | 'WORD_PASTE',
    mode?: 'APPEND' | 'REPLACE'
  ) => void;
  mode: 'AI' | 'WORD';
  hasExistingSections?: boolean;
}

// 1. Mandatory Standard Format for Grid questions
export const STANDARD_GRID_SAMPLE = `[LOAI_CAU_HOI]
LƯỚI NHIỀU LỰA CHỌN MỖI DÒNG

[CAU_HOI]
Em hãy tự đánh giá khả năng sử dụng các công cụ số phục vụ học tập và hoạt động lớp.

[DONG]
1. Sử dụng Google Drive để lưu trữ tài liệu
2. Sử dụng Google Docs để soạn thảo
3. Sử dụng Canva để thiết kế
4. Sử dụng công cụ AI để hỗ trợ học tập

[LUACHON]
1. Chưa biết sử dụng
2. Biết nhưng cần hướng dẫn
3. Sử dụng được
4. Sử dụng khá thành thạo
5. Sử dụng thành thạo

[HET]`;

// 2. Mandatory Prompt Template for Homeroom Teachers to send to ChatGPT / Gemini
export const AI_PROMPT_TEMPLATE_GRID = `Hãy chuyển nội dung khảo sát sau thành câu hỏi dạng
LƯỚI NHIỀU LỰA CHỌN MỖI DÒNG để nhập vào hệ thống khảo sát.

BẮT BUỘC xuất đúng cấu trúc sau và không thêm giải thích:

[LOAI_CAU_HOI]
LƯỚI NHIỀU LỰA CHỌN MỖI DÒNG

[CAU_HOI]
...

[DONG]
1. ...
2. ...
3. ...

[LUACHON]
1. ...
2. ...
3. ...
4. ...

[HET]

Quy tắc:
- [CAU_HOI] chỉ chứa nội dung câu hỏi chung.
- [DONG] chứa các tiêu chí/dòng cần đánh giá.
- [LUACHON] chứa các mức lựa chọn dùng chung cho mọi dòng.
- Không đưa đáp án hoặc giải thích.
- Không thay đổi nội dung gốc.
- Mỗi dòng phải nằm trên một dòng riêng.
- Mỗi lựa chọn phải nằm trên một dòng riêng.`;

const GENERAL_SURVEY_SAMPLE = `PHẦN 1. THÔNG TIN CÁ NHÂN & KỸ NĂNG

1. Họ và tên học viên
Loại: Trả lời ngắn

2. Ngày, tháng, năm sinh
Loại: Ngày tháng năm

3. Em hãy tự đánh giá khả năng sử dụng công nghệ số:
Loại: Lưới nhiều lựa chọn mỗi dòng
Các dòng:
1. Sử dụng Google Drive để lưu trữ tài liệu
2. Sử dụng Google Docs để soạn thảo
3. Sử dụng Canva để thiết kế
4. Sử dụng công cụ AI hỗ trợ học tập
Các mức đánh giá:
1. Chưa biết sử dụng
2. Biết nhưng cần hướng dẫn
3. Sử dụng được
4. Sử dụng khá thành thạo
5. Sử dụng thành thạo`;

export const SurveyTextPasteModal: React.FC<SurveyTextPasteModalProps> = ({
  isOpen,
  onClose,
  onImport,
  mode,
  hasExistingSections = false
}) => {
  const [inputText, setInputText] = useState<string>('');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);
  const [showPromptDetails, setShowPromptDetails] = useState<boolean>(false);
  const [importMode, setImportMode] = useState<'APPEND' | 'REPLACE'>(
    hasExistingSections ? 'APPEND' : 'REPLACE'
  );

  if (!isOpen) return null;

  const handleParse = () => {
    if (!inputText || inputText.trim().length === 0) {
      setErrorMsg('Vui lòng dán nội dung văn bản câu hỏi vào khung soạn thảo.');
      return;
    }

    setIsAnalyzing(true);
    setErrorMsg('');

    try {
      const res = SurveyTextParser.parse(inputText);
      if (res.sections.length === 0 || res.stats.totalQuestions === 0) {
        setErrorMsg('Không xác định được cấu trúc. Vui lòng sử dụng định dạng mẫu bên trên.');
        setParseResult(null);
      } else if (!res.validation.isValid) {
        setErrorMsg(
          res.validation.issues.join(' | ') ||
            'Không xác định được cấu trúc. Vui lòng sử dụng định dạng mẫu.'
        );
        setParseResult(res);
      } else {
        setParseResult(res);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi phân tích nội dung');
      setParseResult(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirmImport = () => {
    if (!parseResult || parseResult.sections.length === 0) return;
    if (!parseResult.validation.isValid) {
      setErrorMsg('Không thể áp dụng khảo sát do cấu trúc chưa hợp lệ. Vui lòng đối soát các cảnh báo màu đỏ.');
      return;
    }
    onImport(parseResult.sections, mode === 'AI' ? 'AI_PASTE' : 'WORD_PASTE', importMode);
    onClose();
  };

  const handleUseGridSample = () => {
    setInputText(STANDARD_GRID_SAMPLE);
    setErrorMsg('');
    try {
      const res = SurveyTextParser.parse(STANDARD_GRID_SAMPLE);
      setParseResult(res);
    } catch {
      // ignore
    }
  };

  const handleUseGeneralSample = () => {
    setInputText(GENERAL_SURVEY_SAMPLE);
    setErrorMsg('');
    try {
      const res = SurveyTextParser.parse(GENERAL_SURVEY_SAMPLE);
      setParseResult(res);
    } catch {
      // ignore
    }
  };

  const handleCopyAIPrompt = () => {
    navigator.clipboard.writeText(AI_PROMPT_TEMPLATE_GRID);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2500);
  };

  const handleClear = () => {
    setInputText('');
    setParseResult(null);
    setErrorMsg('');
  };

  const lineCount = inputText ? inputText.split('\n').length : 0;
  const charCount = inputText.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-2 sm:p-4 backdrop-blur-xs animate-fade-in">
      <div className="relative flex h-[95vh] max-h-[95vh] w-full max-w-6xl flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-3.5 bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-xs ${
                mode === 'AI' ? 'bg-indigo-600 text-white' : 'bg-blue-600 text-white'
              }`}
            >
              {mode === 'AI' ? <Sparkles className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-extrabold text-slate-900">
                  {mode === 'AI' ? 'Dán câu hỏi từ ChatGPT / Gemini / AI' : 'Dán nội dung câu hỏi từ Word'}
                </h2>
                <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800 border border-emerald-200">
                  Nhận diện Ma trận Lưới & Tự nhiên
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Nhận diện chính xác 100% câu hỏi Lưới nhiều lựa chọn mỗi dòng, trắc nghiệm, tự luận và ngày/giờ.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-all cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mandatory Format Guide & AI Prompt Box - Prominently Displayed */}
        <div className="bg-gradient-to-r from-indigo-50/95 via-blue-50/90 to-purple-50/95 border-b border-indigo-200 px-6 py-3 shrink-0 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white text-[10px] font-bold">
                ✓
              </span>
              <p className="text-xs text-indigo-950 font-bold">
                Để hệ thống đọc chính xác câu hỏi dạng <span className="text-indigo-700 underline underline-offset-2">Lưới nhiều lựa chọn mỗi dòng</span>, hãy yêu cầu ChatGPT/Gemini xuất đúng định dạng chuẩn bên dưới:
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyAIPrompt}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 transition-all cursor-pointer shadow-xs"
              >
                {copiedPrompt ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedPrompt ? '✓ Đã copy prompt AI' : 'Sao chép Prompt yêu cầu ChatGPT / Gemini'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowPromptDetails(!showPromptDetails)}
                className="inline-flex items-center gap-1 rounded-xl border border-indigo-200 bg-white px-2.5 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-50 transition-all cursor-pointer shadow-2xs"
              >
                <span>Xem định dạng mẫu</span>
                {showPromptDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {/* Expandable Format Details */}
          {showPromptDetails && (
            <div className="rounded-xl bg-white/95 p-3.5 border border-indigo-200 shadow-2xs space-y-2 text-xs animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-indigo-950 uppercase tracking-wide text-[11px]">
                  Cấu trúc mẫu chuẩn bắt buộc:
                </span>
                <button
                  type="button"
                  onClick={handleUseGridSample}
                  className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span>Dán cấu trúc này vào ô nhập</span>
                </button>
              </div>

              <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg font-mono text-[11px] leading-relaxed overflow-x-auto whitespace-pre">
{`[LOAI_CAU_HOI]
LƯỚI NHIỀU LỰA CHỌN MỖI DÒNG

[CAU_HOI]
Em hãy tự đánh giá khả năng sử dụng các công cụ số phục vụ học tập và hoạt động lớp.

[DONG]
1. Sử dụng Google Drive để lưu trữ tài liệu
2. Sử dụng Google Docs để soạn thảo
3. Sử dụng Canva để thiết kế
4. Sử dụng công cụ AI để hỗ trợ học tập

[LUACHON]
1. Chưa biết sử dụng
2. Biết nhưng cần hướng dẫn
3. Sử dụng được
4. Sử dụng khá thành thạo
5. Sử dụng thành thạo

[HET]`}
              </pre>
            </div>
          )}
        </div>

        {/* Modal Main Body - 2 Columns Side-by-Side */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden min-h-0 bg-slate-100">
          {/* LEFT COLUMN: Input Textarea Area */}
          <div className="lg:col-span-6 flex flex-col border-r border-slate-200 bg-white p-5 space-y-3 overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  Vùng dán nội dung từ AI / Word:
                </label>
                <span className="text-[11px] font-mono text-slate-400">
                  ({lineCount} dòng • {charCount} ký tự)
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleUseGridSample}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                >
                  Dán mẫu Lưới ma trận
                </button>
                <span className="text-slate-300">•</span>
                <button
                  type="button"
                  onClick={handleUseGeneralSample}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                >
                  Dán mẫu tự nhiên
                </button>
                {inputText && (
                  <>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={handleClear}
                      className="text-[11px] font-bold text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                    >
                      Xóa trắng
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Spacious Textarea */}
            <div className="flex-1 flex flex-col min-h-[280px]">
              <textarea
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                placeholder={
                  mode === 'AI'
                    ? "Dán nội dung từ ChatGPT / Gemini (theo mẫu [LOAI_CAU_HOI] hoặc dạng tự nhiên: Câu hỏi, Các dòng, Các mức đánh giá) vào đây..."
                    : "Mở file Word, chọn Ctrl+A, sau đó dán (Ctrl+V) toàn bộ nội dung danh sách câu hỏi vào đây..."
                }
                className="w-full flex-1 rounded-2xl border border-slate-300 bg-slate-50/60 p-4 font-mono text-xs leading-relaxed text-slate-900 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 focus:outline-hidden resize-none transition-all shadow-2xs"
              />
            </div>

            {errorMsg && (
              <div className="flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700 border border-rose-200 animate-fade-in shrink-0">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                <div className="space-y-1">
                  <span>{errorMsg}</span>
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={handleUseGridSample}
                      className="text-[11px] font-bold text-indigo-700 underline hover:text-indigo-900 cursor-pointer"
                    >
                      Bấm vào đây để tải mẫu chuẩn [LOAI_CAU_HOI] / [DONG] / [LUACHON]
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Action Bar for Input */}
            <div className="flex items-center justify-between pt-1 shrink-0 flex-wrap gap-2">
              <span className="text-[11px] text-slate-500 italic">
                Sau khi dán văn bản, bấm <strong>[Phân tích văn bản]</strong> để kiểm tra cấu trúc.
              </span>
              <button
                type="button"
                onClick={handleParse}
                disabled={!inputText.trim() || isAnalyzing}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition-all cursor-pointer shadow-xs"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Đang phân tích...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    <span>Phân tích văn bản</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: Analysis & Extracted Preview */}
          <div className="lg:col-span-6 flex flex-col bg-slate-50 p-5 space-y-4 overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                Kết quả phân tích & Đối soát cấu trúc:
              </label>
              {parseResult && (
                <div className="flex items-center gap-1.5">
                  <span
                    className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold border ${
                      parseResult.validation.isValid
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : 'bg-rose-100 text-rose-800 border-rose-200'
                    }`}
                  >
                    {parseResult.validation.isValid ? '✓ Nhận diện thành công' : '⚠️ Cần kiểm tra'}
                  </span>
                  <span className="rounded-md bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                    {parseResult.stats.totalSections} phần • {parseResult.stats.totalQuestions} câu hỏi
                  </span>
                </div>
              )}
            </div>

            {!parseResult ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center rounded-2xl border-2 border-dashed border-slate-200 bg-white/70 space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div className="space-y-1 max-w-sm">
                  <h3 className="text-xs font-extrabold text-slate-800">
                    Sẵn sàng phân tích câu hỏi
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Dán nội dung từ ChatGPT / Gemini ở khung bên trái và bấm <strong>[Phân tích văn bản]</strong>. Toàn bộ danh sách hàng, cột và câu hỏi sẽ hiển thị trực quan tại đây trước khi thêm vào biểu mẫu.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 flex-1 animate-fade-in">
                {/* Stats Breakdown Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-2xs">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Tổng câu hỏi</p>
                    <p className="text-base font-extrabold text-slate-900 mt-0.5">
                      {parseResult.stats.totalQuestions}
                    </p>
                  </div>
                  <div className="rounded-xl border border-orange-200 bg-orange-50/70 p-2.5 shadow-2xs">
                    <p className="text-[10px] text-orange-700 font-bold uppercase">Lưới Ma trận</p>
                    <p className="text-base font-extrabold text-orange-900 mt-0.5">
                      {parseResult.stats.gridCount}
                    </p>
                  </div>
                  <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-2.5 shadow-2xs">
                    <p className="text-[10px] text-blue-700 font-bold uppercase">Trắc nghiệm</p>
                    <p className="text-base font-extrabold text-blue-900 mt-0.5">
                      {parseResult.stats.singleChoiceCount +
                        parseResult.stats.multiChoiceCount +
                        parseResult.stats.dropdownCount}
                    </p>
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-2.5 shadow-2xs">
                    <p className="text-[10px] text-emerald-700 font-bold uppercase">Tự luận & Khác</p>
                    <p className="text-base font-extrabold text-emerald-900 mt-0.5">
                      {parseResult.stats.shortTextCount +
                        parseResult.stats.longTextCount +
                        parseResult.stats.dateCount +
                        parseResult.stats.scaleCount}
                    </p>
                  </div>
                </div>

                {/* Validation Reconciliation Alert */}
                {parseResult.validation.issues.length > 0 && (
                  <div className="rounded-xl border border-rose-300 bg-rose-50 p-3.5 text-xs text-rose-900 space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-rose-800">
                      <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                      <span>Thông báo đối soát cấu trúc:</span>
                    </div>
                    <ul className="list-disc pl-5 text-[11px] space-y-0.5 text-rose-700">
                      {parseResult.validation.issues.map((issue, idx) => (
                        <li key={idx}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Sections & Questions List Preview */}
                <div className="space-y-4">
                  {parseResult.sections.map((sec, sIdx) => (
                    <div
                      key={sec.id || sIdx}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="text-xs font-extrabold text-slate-900">
                          {sec.title}
                        </span>
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                          {sec.questions.length} câu hỏi
                        </span>
                      </div>

                      <div className="space-y-3">
                        {sec.questions.map((q, qIdx) => {
                          const isGrid =
                            q.type === 'GRID' ||
                            q.type === 'GRID_SINGLE' ||
                            q.type === 'GRID_MULTI';
                          const rows = q.rows || q.gridRows || [];
                          const cols = q.columns || q.gridColumns || [];

                          return (
                            <div
                              key={q.id || qIdx}
                              className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="space-y-0.5 flex-1">
                                  <p className="text-xs font-bold text-slate-900">
                                    {qIdx + 1}. {q.title}
                                  </p>
                                  {q.description && (
                                    <p className="text-[11px] text-slate-500 italic">
                                      💡 {q.description}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                                  <span
                                    className={`rounded-lg px-2 py-0.5 text-[10px] font-bold border ${
                                      q.type === 'GRID_MULTI'
                                        ? 'bg-orange-100 text-orange-800 border-orange-200'
                                        : q.type === 'GRID_SINGLE'
                                        ? 'bg-amber-100 text-amber-800 border-amber-200'
                                        : q.type === 'MULTI_CHOICE'
                                        ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
                                        : q.type === 'SINGLE_CHOICE'
                                        ? 'bg-blue-100 text-blue-800 border-blue-200'
                                        : 'bg-slate-200 text-slate-700 border-slate-300'
                                    }`}
                                  >
                                    {q.type === 'GRID_MULTI'
                                      ? 'Lưới nhiều lựa chọn mỗi dòng'
                                      : q.type === 'GRID_SINGLE'
                                      ? 'Lưới 1 lựa chọn mỗi dòng'
                                      : q.type === 'MULTI_CHOICE'
                                      ? 'Nhiều lựa chọn'
                                      : q.type === 'SINGLE_CHOICE'
                                      ? 'Một lựa chọn'
                                      : q.type === 'SHORT_TEXT'
                                      ? 'Trả lời ngắn'
                                      : q.type === 'LONG_TEXT'
                                      ? 'Đoạn văn dài'
                                      : q.type}
                                  </span>
                                  {q.required && (
                                    <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
                                      Bắt buộc
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Matrix / Grid Full Preview */}
                              {isGrid && rows.length > 0 && cols.length > 0 && (
                                <div className="space-y-2 rounded-xl bg-white p-3 border border-orange-200">
                                  <div className="flex items-center justify-between text-xs font-bold text-orange-950">
                                    <span className="flex items-center gap-1.5">
                                      <Table className="h-4 w-4 text-orange-600" />
                                      <span>Cấu trúc Lưới Ma trận ({rows.length} Hàng × {cols.length} Cột):</span>
                                    </span>
                                  </div>

                                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                                    <table className="w-full text-left text-xs border-collapse">
                                      <thead className="bg-slate-100 border-b border-slate-200 font-bold text-slate-700">
                                        <tr>
                                          <th className="p-2.5 border-r border-slate-200 min-w-[160px]">
                                            Tiêu chí / Dòng
                                          </th>
                                          {cols.map((col, cIdx) => (
                                            <th
                                              key={cIdx}
                                              className="p-2.5 text-center border-r last:border-r-0 border-slate-200 min-w-[110px]"
                                            >
                                              {col}
                                            </th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 bg-white">
                                        {rows.map((row, rIdx) => (
                                          <tr key={rIdx} className="hover:bg-slate-50/80">
                                            <td className="p-2.5 font-medium text-slate-800 border-r border-slate-200">
                                              {rIdx + 1}. {row}
                                            </td>
                                            {cols.map((_, cIdx) => (
                                              <td
                                                key={cIdx}
                                                className="p-2.5 text-center border-r last:border-r-0 border-slate-200"
                                              >
                                                {q.type === 'GRID_MULTI' ? (
                                                  <input
                                                    type="checkbox"
                                                    disabled
                                                    className="h-3.5 w-3.5 rounded text-indigo-600 opacity-60 cursor-not-allowed mx-auto"
                                                  />
                                                ) : (
                                                  <input
                                                    type="radio"
                                                    disabled
                                                    className="h-3.5 w-3.5 text-indigo-600 opacity-60 cursor-not-allowed mx-auto"
                                                  />
                                                )}
                                              </td>
                                            ))}
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}

                              {/* Options Preview for Standard Choice types */}
                              {!isGrid && q.options && q.options.length > 0 && (
                                <div className="pt-1 grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-slate-700">
                                  {q.options.map((opt, optIdx) => (
                                    <div
                                      key={optIdx}
                                      className="flex items-center gap-1.5 truncate bg-white rounded px-2.5 py-1.5 border border-slate-200"
                                    >
                                      <span className="text-slate-400 font-mono text-[10px]">
                                        {q.type === 'MULTI_CHOICE' ? '□' : '○'}
                                      </span>
                                      <span className="truncate">{opt}</span>
                                    </div>
                                  ))}
                                  {q.allowOther && (
                                    <div className="flex items-center gap-1.5 text-teal-700 italic bg-teal-50/60 rounded px-2 py-1 border border-teal-100">
                                      <span>○ Khác: [Tự nhập...]</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer with Import Mode Selection to PREVENT DATA LOSS */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-3.5 shrink-0 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
            >
              Hủy bỏ
            </button>

            {/* Import Mode Radio Controls (Mandatory Rule IX: Do NOT wipe existing data by default!) */}
            {hasExistingSections && (
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
                <span className="text-[11px] font-bold text-slate-600">Cách áp dụng:</span>
                <label className="inline-flex items-center gap-1.5 cursor-pointer font-bold text-blue-700">
                  <input
                    type="radio"
                    name="importMode"
                    value="APPEND"
                    checked={importMode === 'APPEND'}
                    onChange={() => setImportMode('APPEND')}
                    className="h-3.5 w-3.5 text-blue-600 cursor-pointer"
                  />
                  <span>Thêm tiếp (Giữ câu hỏi cũ)</span>
                </label>

                <label className="inline-flex items-center gap-1.5 cursor-pointer text-slate-600 hover:text-slate-800 ml-2">
                  <input
                    type="radio"
                    name="importMode"
                    value="REPLACE"
                    checked={importMode === 'REPLACE'}
                    onChange={() => setImportMode('REPLACE')}
                    className="h-3.5 w-3.5 text-rose-600 cursor-pointer"
                  />
                  <span>Thay thế toàn bộ</span>
                </label>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {parseResult && parseResult.sections.length > 0 && (
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={!parseResult.validation.isValid}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-extrabold text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>
                  {importMode === 'APPEND' && hasExistingSections
                    ? `Thêm ${parseResult.stats.totalQuestions} câu hỏi vào biểu mẫu`
                    : `Nhập vào biểu mẫu (${parseResult.stats.totalQuestions} câu hỏi)`}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
