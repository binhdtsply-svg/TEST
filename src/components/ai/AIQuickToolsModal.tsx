/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  BarChart2,
  UserCheck,
  FileText,
  Gamepad2,
  Mail,
  HeartHandshake,
  X,
  Sparkles,
  Download,
  Copy,
  Check,
  Send,
  Edit3,
  Users,
  Clock,
  MapPin,
  Target,
  RefreshCw
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { aiService, StudentAIAnalysis, ClassroomGameResult } from '../../services/AIService';
import { classService } from '../../services/ClassService';
import { studentService } from '../../services/StudentService';
import { useStudents } from '../../hooks/useStudents';
import { AIDataPermissions } from '../../types';

interface AIQuickToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
  toolType: string;
  permissions: AIDataPermissions;
  onInsertToChat: (text: string) => void;
  onOpenDocumentEditor: (title: string, content: string, type: any) => void;
}

export const AIQuickToolsModal: React.FC<AIQuickToolsModalProps> = ({
  isOpen,
  onClose,
  toolType,
  permissions,
  onInsertToChat,
  onOpenDocumentEditor
}) => {
  const classSettings = classService.getSettings();
  const allStudents = useStudents();

  // State for different tools
  const [activeTool, setActiveTool] = useState<string>(toolType || 'class_analysis');
  const [isLoading, setIsLoading] = useState(false);
  const [resultText, setResultText] = useState<string>('');
  const [resultTitle, setResultTitle] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Class Analysis Form State
  const [classTimeframe, setClassTimeframe] = useState<'this_week' | 'this_month' | 'hk1' | 'hk2' | 'custom'>('this_week');

  // 2. Student Analysis Form State
  const [selectedStudentId, setSelectedStudentId] = useState<string>(allStudents[0]?.id || '');
  const [studentCustomGoal, setStudentCustomGoal] = useState<string>('');

  // 3. Situation Form State
  const [situationText, setSituationText] = useState<string>('');

  // 4. Plan Form State
  const [planType, setPlanType] = useState<'week' | 'month' | 'semester' | 'thematic' | 'homeroom_period'>('week');
  const [planNotes, setPlanNotes] = useState<string>('');

  // 5. Game Form State
  const [studentCount, setStudentCount] = useState<number>(allStudents.length || 42);
  const [durationMinutes, setDurationMinutes] = useState<number>(15);
  const [spaceType, setSpaceType] = useState<string>('Trong phòng học');
  const [gameObjective, setGameObjective] = useState<string>('Tăng tương tác và gắn kết tinh thần đoàn kết giữa các tổ');

  // 6. Parent Letter Form State
  const [letterType, setLetterType] = useState<string>('midterm_progress');
  const [letterNotes, setLetterNotes] = useState<string>('');

  useEffect(() => {
    if (toolType) {
      setActiveTool(toolType);
    }
  }, [toolType]);

  if (!isOpen) return null;

  const handleRunTool = async () => {
    setIsLoading(true);
    setResultText('');
    try {
      if (activeTool === 'class_analysis') {
        const title = `BÁO CÁO PHÂN TÍCH TÌNH HÌNH LỚP ${classSettings.className.toUpperCase()} (${classTimeframe === 'this_week' ? 'TUẦN NÀY' : classTimeframe === 'this_month' ? 'THÁNG NÀY' : 'HỌC KỲ'})`;
        setResultTitle(title);
        const res = await aiService.analyzeClassSituation(classTimeframe, permissions);
        setResultText(res);
      } else if (activeTool === 'student_analysis') {
        const student = allStudents.find((s) => s.id === selectedStudentId);
        const title = `HỒ SƠ TƯ VẤN SƯ PHẠM HỌC SINH: ${student?.fullName?.toUpperCase() || 'HỌC SINH'}`;
        setResultTitle(title);
        const res = await aiService.analyzeStudent(selectedStudentId, permissions, studentCustomGoal);
        setResultText(res.rawResponse || res.summary);
      } else if (activeTool === 'situation') {
        const title = `TƯ VẤN XỬ LÝ TÌNH HUỐNG CHỦ NHIỆM LỚP ${classSettings.className.toUpperCase()}`;
        setResultTitle(title);
        const res = await aiService.consultHomeroomSituation(situationText, permissions);
        setResultText(res);
      } else if (activeTool === 'plan') {
        const titleMap = {
          week: 'KẾ HOẠCH CÔNG TÁC CHỦ NHIỆM TUẦN',
          month: 'KẾ HOẠCH CÔNG TÁC CHỦ NHIỆM THÁNG',
          semester: 'KẾ HOẠCH CÔNG TÁC CHỦ NHIỆM HỌC KỲ',
          thematic: 'KẾ HOẠCH CHUYÊN ĐỀ CHỦ NHIỆM',
          homeroom_period: 'TIẾN TRÌNH TIẾT SINH HOẠT LỚP'
        };
        const title = `${titleMap[planType] || 'KẾ HOẠCH CHỦ NHIỆM'} - LỚP ${classSettings.className.toUpperCase()}`;
        setResultTitle(title);
        const res = await aiService.generateHomeroomPlan(planType, planNotes, permissions);
        setResultText(res);
      } else if (activeTool === 'game') {
        const title = `KỊCH BẢN TRÒ CHƠI SINH HOẠT LỚP ${classSettings.className.toUpperCase()}`;
        setResultTitle(title);
        const res = await aiService.generateClassroomGame({
          studentCount,
          durationMinutes,
          spaceType,
          objective: gameObjective
        });
        setResultText(res.pedagogicalNotes);
      } else if (activeTool === 'parent') {
        const title = `THƯ THÔNG BÁO / DỰ THẢO GỬI PHỤ HUYNH LỚP ${classSettings.className.toUpperCase()}`;
        setResultTitle(title);
        const prompt = `Soạn thảo văn bản gửi phụ huynh học sinh Lớp ${classSettings.className} (${classSettings.schoolName}).
Chủ đề / Yêu cầu: ${letterType === 'midterm_progress' ? 'Thông báo tình hình học tập và rèn luyện giữa kỳ' : letterType === 'parent_meeting' ? 'Kịch bản và giấy mời họp Phụ huynh' : 'Thư động viên và nhắc nhở ôn thi'}
Ghi chú bổ sung: ${letterNotes || 'Ấm áp, trang trọng, kêu gọi sự đồng hành của gia đình'}

Hãy trình bày chuẩn mẫu thư ngỏ / thông báo gồm Tiêu đề, Kính gửi, Nội dung chính, Lời cảm ơn và Chữ ký GVCN.`;
        const res = await aiService.askAssistant(prompt, { permissions, thinkingLevel: 'medium' });
        setResultText(res);
      }
    } catch (err: any) {
      setErrorMessage(`Đã xảy ra lỗi khi tạo tài liệu: ${err?.message || 'Vui lòng kiểm tra lại kết nối'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportWord = async () => {
    if (!resultText) return;
    const { wordExportService } = await import('../../services/WordExportService');
    await wordExportService.exportAIResponseToWord(resultTitle || 'VĂN BẢN CHỦ NHIỆM', resultText);
  };

  const handleCopy = () => {
    if (!resultText) return;
    navigator.clipboard.writeText(`${resultTitle}\n\n${resultText}`);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div
        id="ai-quick-tools-modal"
        className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Công Cụ Nghiệp Vụ Chủ Nhiệm Chuyên Sâu
              </h3>
              <p className="text-xs text-slate-500">
                Phân tích dữ liệu thực tế, lập kế hoạch sư phạm và xuất file Word chuẩn mực
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="px-5 pt-3 border-b border-slate-200/80 flex items-center gap-2 overflow-x-auto custom-scrollbar bg-white">
          <button
            type="button"
            onClick={() => {
              setActiveTool('class_analysis');
              setResultText('');
            }}
            className={`px-3.5 py-2 rounded-t-xl text-xs font-bold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-all ${
              activeTool === 'class_analysis'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Phân tích lớp</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTool('student_analysis');
              setResultText('');
            }}
            className={`px-3.5 py-2 rounded-t-xl text-xs font-bold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-all ${
              activeTool === 'student_analysis'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Phân tích học sinh</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTool('situation');
              setResultText('');
            }}
            className={`px-3.5 py-2 rounded-t-xl text-xs font-bold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-all ${
              activeTool === 'situation'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <HeartHandshake className="w-3.5 h-3.5" />
            <span>Tư vấn tình huống</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTool('plan');
              setResultText('');
            }}
            className={`px-3.5 py-2 rounded-t-xl text-xs font-bold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-all ${
              activeTool === 'plan'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Kế hoạch chủ nhiệm</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTool('game');
              setResultText('');
            }}
            className={`px-3.5 py-2 rounded-t-xl text-xs font-bold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-all ${
              activeTool === 'game'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>Trò chơi sinh hoạt</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTool('parent');
              setResultText('');
            }}
            className={`px-3.5 py-2 rounded-t-xl text-xs font-bold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-all ${
              activeTool === 'parent'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Thư & Thông báo PH</span>
          </button>
        </div>

        {/* Modal Main Content */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 custom-scrollbar bg-slate-50/50">
          {/* Left Form: Parameters Configuration (5 cols) */}
          <div className="lg:col-span-5 space-y-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            {activeTool === 'class_analysis' && (
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700 block">
                  Chọn khung thời gian phân tích:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setClassTimeframe('this_week')}
                    className={`p-2.5 rounded-xl text-xs font-semibold border text-left transition-all ${
                      classTimeframe === 'this_week'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                        : 'border-slate-200 bg-slate-50 text-slate-700'
                    }`}
                  >
                    Tuần này
                  </button>
                  <button
                    type="button"
                    onClick={() => setClassTimeframe('this_month')}
                    className={`p-2.5 rounded-xl text-xs font-semibold border text-left transition-all ${
                      classTimeframe === 'this_month'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                        : 'border-slate-200 bg-slate-50 text-slate-700'
                    }`}
                  >
                    Tháng này
                  </button>
                  <button
                    type="button"
                    onClick={() => setClassTimeframe('hk1')}
                    className={`p-2.5 rounded-xl text-xs font-semibold border text-left transition-all ${
                      classTimeframe === 'hk1'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                        : 'border-slate-200 bg-slate-50 text-slate-700'
                    }`}
                  >
                    Học kỳ I
                  </button>
                  <button
                    type="button"
                    onClick={() => setClassTimeframe('hk2')}
                    className={`p-2.5 rounded-xl text-xs font-semibold border text-left transition-all ${
                      classTimeframe === 'hk2'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                        : 'border-slate-200 bg-slate-50 text-slate-700'
                    }`}
                  >
                    Học kỳ II
                  </button>
                </div>
                <p className="text-xs text-slate-500 italic">
                  AI sẽ tự động tổng hợp sĩ số {allStudents.length} học sinh, nề nếp, điểm rèn luyện, hoa Nguyệt Quế và xếp loại học tập.
                </p>
              </div>
            )}

            {activeTool === 'student_analysis' && (
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700 block">
                  Chọn học sinh cần phân tích chuyên sâu:
                </label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                >
                  {allStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.code} · Tổ {s.group})
                    </option>
                  ))}
                </select>

                <label className="text-xs font-bold text-slate-700 block mt-2">
                  Mục tiêu tư vấn cụ thể của GVCN (Tùy chọn):
                </label>
                <textarea
                  value={studentCustomGoal}
                  onChange={(e) => setStudentCustomGoal(e.target.value)}
                  rows={4}
                  placeholder="Ví dụ: Em gần đây có dấu hiệu mất tập trung môn Toán, cần hướng dẫn phương pháp động viên nhẹ nhàng..."
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
                />
              </div>
            )}

            {activeTool === 'situation' && (
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700 block">
                  Mô tả tình huống cần tư vấn giải pháp sư phạm:
                </label>
                <textarea
                  value={situationText}
                  onChange={(e) => setSituationText(e.target.value)}
                  rows={7}
                  placeholder="Nhập tình huống thực tế... (Ví dụ: Hai học sinh trong tổ có mâu thuẫn khi làm bài tập nhóm, hoặc một học sinh thường xuyên ngủ gật trong giờ học...)"
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden leading-relaxed"
                />
                <p className="text-[11px] text-slate-500">
                  AI sẽ gợi ý giải pháp theo 7 bước sư phạm tích cực, tôn trọng và bảo mật.
                </p>
              </div>
            )}

            {activeTool === 'plan' && (
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700 block">
                  Loại kế hoạch cần soạn thảo:
                </label>
                <select
                  value={planType}
                  onChange={(e: any) => setPlanType(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                >
                  <option value="week">Kế hoạch công tác chủ nhiệm Tuần</option>
                  <option value="month">Kế hoạch công tác chủ nhiệm Tháng</option>
                  <option value="semester">Kế hoạch công tác chủ nhiệm Học kỳ</option>
                  <option value="thematic">Kế hoạch chuyên đề chủ nhiệm</option>
                  <option value="homeroom_period">Kế hoạch / Tiến trình Tiết Sinh hoạt Lớp</option>
                </select>

                <label className="text-xs font-bold text-slate-700 block mt-2">
                  Trọng tâm / Ghi chú bổ sung của Thầy/Cô:
                </label>
                <textarea
                  value={planNotes}
                  onChange={(e) => setPlanNotes(e.target.value)}
                  rows={4}
                  placeholder="Ví dụ: Tập trung chuẩn bị thi giữa kỳ, đôn đốc nề nếp trang phục và thi đua Vườn Nguyệt Quế..."
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
                />
              </div>
            )}

            {activeTool === 'game' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Sĩ số tham gia:
                    </label>
                    <input
                      type="number"
                      value={studentCount}
                      onChange={(e) => setStudentCount(Number(e.target.value))}
                      className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Thời lượng (phút):
                    </label>
                    <input
                      type="number"
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(Number(e.target.value))}
                      className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Không gian tổ chức:
                  </label>
                  <select
                    value={spaceType}
                    onChange={(e) => setSpaceType(e.target.value)}
                    className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="Trong phòng học">Trong phòng học (Ngồi tại chỗ)</option>
                    <option value="Sân trường / Ngoài trời">Sân trường / Ngoài trời</option>
                    <option value="Hội trường / Nhà đa năng">Hội trường / Nhà đa năng</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Mục tiêu chính của hoạt động:
                  </label>
                  <input
                    type="text"
                    value={gameObjective}
                    onChange={(e) => setGameObjective(e.target.value)}
                    className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                    placeholder="Gắn kết các tổ, khởi động tiết sinh hoạt..."
                  />
                </div>
              </div>
            )}

            {activeTool === 'parent' && (
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700 block">
                  Mục đích gửi phụ huynh:
                </label>
                <select
                  value={letterType}
                  onChange={(e) => setLetterType(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                >
                  <option value="midterm_progress">Thông báo kết quả & Động viên giữa kỳ</option>
                  <option value="parent_meeting">Giấy mời & Kịch bản Họp Phụ huynh</option>
                  <option value="exam_prep">Nhắc nhở ôn tập trước kỳ thi</option>
                  <option value="custom">Thông báo chuyên đề đặc biệt</option>
                </select>

                <label className="text-xs font-bold text-slate-700 block mt-2">
                  Nội dung trọng tâm cần truyền tải:
                </label>
                <textarea
                  value={letterNotes}
                  onChange={(e) => setLetterNotes(e.target.value)}
                  rows={4}
                  placeholder="Ghi chú thêm thông tin cụ thể (thời gian, địa điểm, lưu ý đặc biệt...)"
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
                />
              </div>
            )}

            <button
              type="button"
              id="btn-run-quick-tool"
              onClick={handleRunTool}
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-linear-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm shadow-indigo-500/20 active:scale-98 transition-all"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>AI đang phân tích & soạn thảo...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Thực Hiện & Tạo Văn Bản</span>
                </>
              )}
            </button>
          </div>

          {/* Right Result Pane (7 cols) */}
          <div className="lg:col-span-7 flex flex-col bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs min-h-[380px]">
            {resultText ? (
              <div className="flex-1 flex flex-col space-y-4">
                {/* Result Actions Toolbar */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide truncate max-w-xs">
                    {resultTitle}
                  </h4>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{isCopied ? 'Đã sao chép' : 'Sao chép'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenDocumentEditor(resultTitle, resultText, 'general')}
                      className="px-2.5 py-1.5 rounded-lg border border-indigo-200 text-indigo-700 bg-indigo-50/60 hover:bg-indigo-100 text-xs font-semibold flex items-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Xem & Sửa Word</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleExportWord}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold flex items-center gap-1.5 shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Xuất .docx</span>
                    </button>
                  </div>
                </div>

                {/* Rendered Text */}
                <div className="flex-1 overflow-y-auto prose prose-slate max-w-none text-xs leading-relaxed space-y-2.5 pr-1 custom-scrollbar">
                  <ReactMarkdown>{resultText}</ReactMarkdown>
                </div>

                {/* Bottom action: Send to Chat */}
                <div className="pt-2 border-t border-slate-100 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      onInsertToChat(`[Kết quả từ công cụ ${resultTitle}]:\n\n${resultText}`);
                      onClose();
                    }}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Chuyển nội dung này vào Cuộc trò chuyện chính</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400 space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                  <FileText className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-semibold text-slate-600">Sẵn sàng tạo văn bản</h4>
                <p className="text-xs text-slate-400 max-w-sm">
                  Chọn các thông số ở khung bên trái và bấm <strong>"Thực Hiện & Tạo Văn Bản"</strong> để AI phân tích và xuất tài liệu.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
