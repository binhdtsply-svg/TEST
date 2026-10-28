/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Sparkles, FileText, RefreshCw, BarChart2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { aiService } from '../../services/AIService';
import { classService } from '../../services/ClassService';
import { studentService } from '../../services/StudentService';

interface AIAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenFullscreenAI?: () => void;
}

export const AIAssistantDrawer: React.FC<AIAssistantDrawerProps> = ({
  isOpen,
  onClose,
  onOpenFullscreenAI
}) => {
  const [loading, setLoading] = useState(false);
  const [analysisText, setAnalysisText] = useState<string>('');
  const [reportDraft, setReportDraft] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'analysis' | 'report'>('analysis');

  if (!isOpen) return null;

  const classSettings = classService.getSettings();
  const students = studentService.getAll();

  const handleRunAnalysis = async () => {
    setLoading(true);
    try {
      const res = await aiService.analyzeClassSituation('this_week');
      setAnalysisText(res);
    } catch (err: any) {
      setAnalysisText(`⚠️ Không thể hoàn tất phân tích: ${err?.message || 'Đã có lỗi xảy ra'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    setLoading(true);
    try {
      const res = await aiService.generateHomeroomPlan('week');
      setReportDraft(res);
    } catch (err: any) {
      setReportDraft(`⚠️ Không thể tạo báo cáo: ${err?.message || 'Đã có lỗi xảy ra'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
      <div className="flex h-full w-full max-w-lg flex-col bg-white shadow-2xl border-l border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Trợ Lý AI Chủ Nhiệm</h3>
              <p className="text-xs text-slate-500">Phân tích hành trình, gợi ý động viên & soạn báo cáo</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {onOpenFullscreenAI && (
              <button
                onClick={() => {
                  onClose();
                  onOpenFullscreenAI();
                }}
                className="rounded-lg px-2 py-1 text-xs font-bold text-blue-600 bg-blue-100/60 hover:bg-blue-100 hover:text-blue-800 transition-colors cursor-pointer mr-1"
                title="Mở toàn màn hình AI Chủ nhiệm"
              >
                Mở toàn trang
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6">
          <button
            onClick={() => setActiveTab('analysis')}
            className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'analysis'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <BarChart2 className="h-4 w-4" />
            Phân Tích Lớp Học
          </button>
          <button
            onClick={() => setActiveTab('report')}
            className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'report'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileText className="h-4 w-4" />
            Dự Thảo Kế Hoạch
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {activeTab === 'analysis' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 text-xs text-blue-900 leading-relaxed flex items-center justify-between">
                <span>Phân tích toàn diện dữ liệu lớp <strong>{classSettings.className}</strong> ({students.length} học sinh).</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  {aiService.getWorkspaceConfig().sourceType === 'personal_gemini' ? 'Gemini Cá nhân' : 'AI Hệ thống'}
                </span>
              </div>

              {!analysisText && !loading && (
                <button
                  onClick={handleRunAnalysis}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-xs font-bold text-white hover:bg-blue-700 transition-colors shadow-xs"
                >
                  <Sparkles className="h-4 w-4" />
                  Bắt đầu Phân Tích Lớp
                </button>
              )}

              {loading && (
                <div className="flex flex-col items-center justify-center py-12 space-y-3">
                  <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
                  <p className="text-xs font-medium text-slate-600">AI đang tổng hợp dữ liệu lớp học...</p>
                </div>
              )}

              {analysisText && !loading && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-700">Kết quả phân tích:</span>
                    <button
                      onClick={handleRunAnalysis}
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <RefreshCw className="h-3 w-3" /> Phân tích lại
                    </button>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-xs leading-relaxed text-slate-800 prose prose-slate max-w-none">
                    <ReactMarkdown>{analysisText}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'report' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 text-xs text-indigo-900 leading-relaxed">
                Tự động soạn dự thảo kế hoạch công tác chủ nhiệm chuẩn mẫu hành chính giáo dục Việt Nam.
              </div>

              {!reportDraft && !loading && (
                <button
                  onClick={handleGenerateReport}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white hover:bg-indigo-700 transition-colors shadow-xs"
                >
                  <FileText className="h-4 w-4" />
                  Tạo Dự Thảo Kế Hoạch Tuần
                </button>
              )}

              {loading && (
                <div className="flex flex-col items-center justify-center py-12 space-y-3">
                  <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin" />
                  <p className="text-xs font-medium text-slate-600">AI đang soạn thảo văn bản...</p>
                </div>
              )}

              {reportDraft && !loading && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-700">Dự thảo kế hoạch:</span>
                    <button
                      onClick={handleGenerateReport}
                      className="text-xs text-indigo-600 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <RefreshCw className="h-3 w-3" /> Soạn lại
                    </button>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-xs leading-relaxed text-slate-800 prose prose-slate max-w-none">
                    <ReactMarkdown>{reportDraft}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
