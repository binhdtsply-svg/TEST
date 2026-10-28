/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Sparkles,
  ShieldCheck,
  AlertCircle,
  FileText,
  UserCheck,
  Users,
  User,
  ArrowRight,
  CheckCircle2,
  Edit3,
  Download,
  Copy,
  Check,
  RotateCcw,
  Save,
  MessageSquare,
  HelpCircle,
  Clock,
  Compass,
  FileSignature
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { aiService } from '../../services/AIService';
import { studentService } from '../../services/StudentService';
import { classService } from '../../services/ClassService';
import { AnalysisScope } from '../../services/AIContextService';
import { AIDataPermissions, Student } from '../../types';

interface AICareSignalsWorkflowProps {
  scope: AnalysisScope;
  selectedStudentId?: string;
  permissions: AIDataPermissions;
  allStudents: Student[];
  onOpenDocumentEditor?: (title: string, content: string) => void;
  onInsertToChat?: (text: string) => void;
}

export const AICareSignalsWorkflow: React.FC<AICareSignalsWorkflowProps> = ({
  scope,
  selectedStudentId,
  permissions,
  allStudents,
  onOpenDocumentEditor,
  onInsertToChat
}) => {
  const classSettings = classService.getSettings();
  const selectedStudentObj = allStudents.find((s) => s.id === selectedStudentId);

  // Workflow steps: 1: Ready to Analyze -> 2: Signals Analyzed & Teacher Verification -> 3: Coordination Proposed & Approval
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // AI execution states
  const [isAnalyzingSignals, setIsAnalyzingSignals] = useState(false);
  const [signalsResult, setSignalsResult] = useState<string>('');
  const [signalsError, setSignalsError] = useState<string | null>(null);

  // Teacher verification notes
  const [teacherVerificationNotes, setTeacherVerificationNotes] = useState<string>('');

  // Coordination proposal states
  const [isGeneratingCoordination, setIsGeneratingCoordination] = useState(false);
  const [coordinationResult, setCoordinationResult] = useState<string>('');
  const [coordinationError, setCoordinationError] = useState<string | null>(null);

  // Editing & approval states
  const [isEditingDraft, setIsEditingDraft] = useState(false);
  const [editableDraftText, setEditableDraftText] = useState<string>('');
  const [isSavedSuccessfully, setIsSavedSuccessfully] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // 1. Action: GVCN explicitly requests Signal Analysis
  const handleRunSignalAnalysis = async () => {
    setIsAnalyzingSignals(true);
    setSignalsError(null);
    setSignalsResult('');
    setCoordinationResult('');
    setIsSavedSuccessfully(false);

    try {
      const activeScope = scope === 'single_student' ? 'single_student' : 'class';
      const result = await aiService.analyzeCareSignals({
        scope: activeScope,
        studentId: selectedStudentId,
        permissions,
        timeframe: 'this_week'
      });
      setSignalsResult(result);
      setCurrentStep(2);
    } catch (err: any) {
      setSignalsError(err?.message || 'Không thể kết nối đến hệ thống AI để phân tích tín hiệu.');
    } finally {
      setIsAnalyzingSignals(false);
    }
  };

  // 2. Action: GVCN explicitly requests Coordination Proposal after review
  const handleRunCoordinationProposal = async () => {
    if (!signalsResult) return;
    setIsGeneratingCoordination(true);
    setCoordinationError(null);
    setCoordinationResult('');
    setIsSavedSuccessfully(false);

    try {
      const activeScope = scope === 'single_student' ? 'single_student' : 'class';
      const result = await aiService.suggestCoordinationDraft(signalsResult, {
        scope: activeScope,
        studentId: selectedStudentId,
        verifiedNotes: teacherVerificationNotes,
        permissions
      });
      setCoordinationResult(result);
      setEditableDraftText(result);
      setCurrentStep(3);
    } catch (err: any) {
      setCoordinationError(err?.message || 'Không thể kết nối đến AI để tạo đề xuất phối hợp.');
    } finally {
      setIsGeneratingCoordination(false);
    }
  };

  // 3. Action: GVCN Approves and Saves to Teacher Records
  const handleApproveAndSave = () => {
    const contentToSave = isEditingDraft ? editableDraftText : coordinationResult;
    if (!contentToSave) return;

    if (scope === 'single_student' && selectedStudentId) {
      // Save safely into student's teacher tracking notes
      studentService.updateStudentSpecialAttention(selectedStudentId, {
        needsSpecialAttention: true,
        attentionCategories: ['Theo dõi & Phối hợp sư phạm'],
        attentionNote: `[AI & GVCN Phối hợp - ${new Date().toLocaleDateString('vi-VN')}]: ${teacherVerificationNotes || 'Đã kiểm chứng tín hiệu'}\n\nKế hoạch: ${contentToSave.slice(0, 300)}...`,
        supportMeasure: 'Phối hợp gia đình & GVCN đồng hành',
        attentionStatus: 'supporting'
      });
    }

    setIsSavedSuccessfully(true);
    setTimeout(() => setIsSavedSuccessfully(false), 4000);
  };

  const handleCopyContent = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleExportWord = async () => {
    const title =
      scope === 'single_student' && selectedStudentObj
        ? `KE_HOACH_PHOI_HOP_${selectedStudentObj.fullName.toUpperCase().replace(/\s+/g, '_')}`
        : `KE_HOACH_PHOI_HOP_LOP_${classSettings.className.toUpperCase()}`;

    const textToExport = `# ${title}\n\n## 1. TÍN HIỆU CẦN QUAN TÂM (ĐÃ KIỂM CHỨNG)\n${signalsResult}\n\n## 2. GHI CHÚ KIỂM CHỨNG CỦA GVCN\n${teacherVerificationNotes || 'GVCN đã xác nhận và phê duyệt.'}\n\n## 3. DỰ THẢO HƯỚNG PHỐI HỢP & KẾ HOẠCH HÀNH ĐỘNG\n${isEditingDraft ? editableDraftText : coordinationResult}`;

    const { wordExportService } = await import('../../services/WordExportService');
    await wordExportService.exportAIResponseToWord(title, textToExport);
  };

  const handleResetWorkflow = () => {
    setCurrentStep(1);
    setSignalsResult('');
    setSignalsError(null);
    setTeacherVerificationNotes('');
    setCoordinationResult('');
    setCoordinationError(null);
    setIsEditingDraft(false);
    setEditableDraftText('');
    setIsSavedSuccessfully(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-6 space-y-5">
      {/* Workflow Step Tracker */}
      <div className="border-b border-slate-100 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              Quy trình AI Chủ nhiệm: Phân tích tín hiệu & Đề xuất phối hợp (Human-in-the-loop)
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
              <span>Hỗ trợ sư phạm từ dữ liệu thực tế</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                {scope === 'single_student' && selectedStudentObj
                  ? `Học sinh: ${selectedStudentObj.fullName} (Mã: ${selectedStudentObj.code})`
                  : `Toàn lớp: ${classSettings.className} (${allStudents.length} HS)`}
              </span>
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handleResetWorkflow}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Làm mới quy trình
              </button>
            )}
          </div>
        </div>

        {/* 3 Step Breadcrumb */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 mt-4">
          <div
            className={`p-2.5 rounded-xl border transition-all flex items-center gap-2.5 ${
              currentStep === 1
                ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900 font-bold'
                : currentStep > 1
                ? 'bg-emerald-50/50 border-emerald-200 text-emerald-800'
                : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                currentStep > 1
                  ? 'bg-emerald-600 text-white'
                  : currentStep === 1
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {currentStep > 1 ? <Check className="w-3.5 h-3.5" /> : '1'}
            </div>
            <div className="text-xs">
              <p className="font-bold">1. Phân tích tín hiệu</p>
              <p className="text-[10px] text-slate-500 font-normal">Tổng hợp từ dữ liệu hiện có</p>
            </div>
          </div>

          <div
            className={`p-2.5 rounded-xl border transition-all flex items-center gap-2.5 ${
              currentStep === 2
                ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900 font-bold'
                : currentStep > 2
                ? 'bg-emerald-50/50 border-emerald-200 text-emerald-800'
                : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                currentStep > 2
                  ? 'bg-emerald-600 text-white'
                  : currentStep === 2
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {currentStep > 2 ? <Check className="w-3.5 h-3.5" /> : '2'}
            </div>
            <div className="text-xs">
              <p className="font-bold">2. GVCN kiểm chứng</p>
              <p className="text-[10px] text-slate-500 font-normal">Xác nhận thông tin thực tế</p>
            </div>
          </div>

          <div
            className={`p-2.5 rounded-xl border transition-all flex items-center gap-2.5 ${
              currentStep === 3
                ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900 font-bold'
                : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                currentStep === 3 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              3
            </div>
            <div className="text-xs">
              <p className="font-bold">3. Đề xuất & Phê duyệt</p>
              <p className="text-[10px] text-slate-500 font-normal">Chỉnh sửa & lưu dự thảo</p>
            </div>
          </div>
        </div>
      </div>

      {/* STEP 1: Ready to Analyze */}
      {currentStep === 1 && (
        <div className="space-y-4 py-2">
          <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200/80 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
                <Compass className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-800">
                  Phân tích tín hiệu cần quan tâm đối với:{' '}
                  <span className="text-indigo-600">
                    {scope === 'single_student' && selectedStudentObj
                      ? `${selectedStudentObj.fullName} (Mã: ${selectedStudentObj.code})`
                      : `Toàn thể Lớp ${classSettings.className}`}
                  </span>
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  AI sẽ đọc dữ liệu đã tồn tại (chuyên cần, kết quả học tập, điểm cộng/vi phạm, rèn luyện, ghi chú GVCN, thi tốt nghiệp) để tổng hợp các tín hiệu khách quan. AI tuân thủ nguyên tắc không chẩn đoán, không gán nhãn và không tự quyết định biện pháp.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200 text-[11px] text-slate-500 font-medium">
              <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                <CheckCircle2 className="w-3 h-3" /> Dữ liệu hồ sơ
              </span>
              <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                <CheckCircle2 className="w-3 h-3" /> Chuyên cần
              </span>
              <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                <CheckCircle2 className="w-3 h-3" /> Kết quả học tập
              </span>
              <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                <CheckCircle2 className="w-3 h-3" /> Điểm cộng / Vi phạm
              </span>
              <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                <CheckCircle2 className="w-3 h-3" /> Ghi chú GVCN
              </span>
              <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                <CheckCircle2 className="w-3 h-3" /> Thi tốt nghiệp THPT
              </span>
            </div>
          </div>

          {signalsError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Không thể hoàn tất phân tích</p>
                <p className="text-[11px] text-rose-700">{signalsError}</p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-start">
            <button
              type="button"
              id="btn-analyze-care-signals"
              onClick={handleRunSignalAnalysis}
              disabled={isAnalyzingSignals}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white shadow-sm flex items-center gap-2 transition-all ${
                isAnalyzingSignals
                  ? 'bg-indigo-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 active:scale-98 shadow-indigo-500/20'
              }`}
            >
              {isAnalyzingSignals ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin" />
                  <span>Đang phân tích dữ liệu thực tế...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Bắt đầu phân tích tín hiệu cần quan tâm</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Signals Analyzed & GVCN Verification Area */}
      {currentStep === 2 && (
        <div className="space-y-5 animate-fade-in">
          {/* Signals Output Container */}
          <div className="bg-slate-50/70 rounded-2xl border border-slate-200/90 p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                  1
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-800">
                  Kết quả phân tích tín hiệu cần quan tâm từ AI
                </h3>
              </div>
              <span className="text-[10px] text-slate-400">
                {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {/* Markdown Signals Content */}
            <div className="prose max-w-none text-xs leading-relaxed text-slate-800 bg-white p-4 rounded-xl border border-slate-200/70 custom-scrollbar max-h-[450px] overflow-y-auto">
              <ReactMarkdown>{signalsResult}</ReactMarkdown>
            </div>

            {/* Guardrail Disclaimer */}
            <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/70 text-amber-900 text-xs flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <span className="font-bold">Nguyên tắc Human-in-the-loop:</span> AI chỉ phát hiện tín hiệu từ dữ liệu ghi nhận, không đưa ra kết luận tính cách hay chẩn đoán. Thầy/Cô hãy kiểm chứng thông tin thực tế trước khi xây dựng hướng phối hợp.
              </div>
            </div>
          </div>

          {/* GVCN Verification Input Area */}
          <div className="bg-indigo-50/50 rounded-2xl border border-indigo-100 p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs sm:text-sm">
              <UserCheck className="w-4 h-4 text-indigo-600" />
              <span>Ghi chú kiểm chứng & Bổ sung thực tế của GVCN (Tùy chọn)</span>
            </div>
            <p className="text-[11px] text-slate-600">
              Thầy/Cô có thể ghi lại các thông tin đã trao đổi trực tiếp với học sinh, phụ huynh hoặc giáo viên bộ môn để AI đưa ra đề xuất phối hợp chính xác nhất:
            </p>
            <textarea
              id="gvcn-verification-notes"
              value={teacherVerificationNotes}
              onChange={(e) => setTeacherVerificationNotes(e.target.value)}
              rows={3}
              placeholder="Ví dụ: Đã trao đổi riêng với em, lý do tuần qua vắng là do gia đình có việc, tâm lý em vẫn ổn định và hứa sẽ chép bài đầy đủ..."
              className="w-full bg-white rounded-xl border border-slate-200 p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 leading-relaxed"
            />
          </div>

          {coordinationError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Không thể tạo đề xuất phối hợp</p>
                <p className="text-[11px] text-rose-700">{coordinationError}</p>
              </div>
            </div>
          )}

          {/* Action Button: Proceed to Coordination */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={handleResetWorkflow}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold"
            >
              Phân tích lại
            </button>

            <button
              type="button"
              id="btn-suggest-coordination"
              onClick={handleRunCoordinationProposal}
              disabled={isGeneratingCoordination}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white shadow-sm flex items-center gap-2 transition-all ${
                isGeneratingCoordination
                  ? 'bg-indigo-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 active:scale-98 shadow-indigo-500/20'
              }`}
            >
              {isGeneratingCoordination ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin" />
                  <span>Đang soạn thảo đề xuất phối hợp...</span>
                </>
              ) : (
                <>
                  <span>Tiếp tục: Đề xuất hướng phối hợp</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Coordination Proposal & GVCN Approval / Editing */}
      {currentStep === 3 && (
        <div className="space-y-5 animate-fade-in">
          {/* Header Controls for Step 3 */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                3
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-800">
                  Dự thảo Đề xuất Hướng phối hợp Sư phạm
                </h3>
                <p className="text-[11px] text-slate-500">
                  Thầy/Cô có toàn quyền chỉnh sửa, bổ sung trước khi phê duyệt hoặc lưu.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setIsEditingDraft(!isEditingDraft)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  isEditingDraft
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isEditingDraft ? 'Xem định dạng xem trước' : 'Chỉnh sửa dự thảo'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleCopyContent(isEditingDraft ? editableDraftText : coordinationResult)}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopied ? 'Đã sao chép' : 'Sao chép'}</span>
              </button>

              <button
                type="button"
                onClick={handleExportWord}
                className="px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải .docx</span>
              </button>
            </div>
          </div>

          {/* Draft View or Edit Mode */}
          {isEditingDraft ? (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">Trực tiếp chỉnh sửa văn bản dự thảo:</label>
              <textarea
                value={editableDraftText}
                onChange={(e) => setEditableDraftText(e.target.value)}
                rows={16}
                className="w-full bg-white rounded-2xl border border-slate-300 p-4 text-xs font-mono text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 leading-relaxed custom-scrollbar"
              />
            </div>
          ) : (
            <div className="prose max-w-none text-xs leading-relaxed text-slate-800 bg-white p-5 rounded-2xl border border-slate-200 custom-scrollbar max-h-[500px] overflow-y-auto shadow-2xs">
              <ReactMarkdown>{coordinationResult}</ReactMarkdown>
            </div>
          )}

          {/* Success Banner when saved */}
          {isSavedSuccessfully && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="font-bold">
                ✓ Đã phê duyệt và lưu vào Sổ theo dõi GVCN thành công!
              </div>
            </div>
          )}

          {/* Approval & Saving Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold"
            >
              ← Quay lại bước kiểm chứng
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {onInsertToChat && (
                <button
                  type="button"
                  onClick={() => onInsertToChat(isEditingDraft ? editableDraftText : coordinationResult)}
                  className="px-3.5 py-2 rounded-xl border border-indigo-200 text-indigo-700 hover:bg-indigo-50 text-xs font-semibold flex items-center gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Đưa vào Chat AI</span>
                </button>
              )}

              <button
                type="button"
                id="btn-approve-and-save"
                onClick={handleApproveAndSave}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm shadow-emerald-600/20 active:scale-98 transition-all"
              >
                <Save className="w-4 h-4" />
                <span>Phê duyệt & Lưu vào Sổ theo dõi GVCN</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
