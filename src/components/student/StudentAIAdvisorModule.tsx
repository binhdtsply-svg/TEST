/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Sparkles,
  Send,
  Bot,
  User,
  Copy,
  Check,
  RotateCcw,
  BookOpen,
  Award,
  TreePine,
  Compass,
  AlertCircle,
  Lightbulb,
  ArrowRight,
  ShieldCheck,
  MessageSquare,
  Flame,
  CheckCircle2
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { authService } from '../../services/AuthService';
import { studentService } from '../../services/StudentService';
import { aiStudentContextService } from '../../services/AIStudentContextService';
import { aiService, SYSTEM_PROMPT_STUDENT_ADVISOR } from '../../services/AIService';
import { AIMessage, Student } from '../../types';

const STUDENT_QUICK_PROMPTS = [
  {
    icon: '📈',
    label: 'Cải thiện môn cần củng cố',
    prompt: 'Dựa trên bảng điểm các môn hiện tại của em, hãy phân tích môn nào em đang có điểm thấp nhất và gợi ý lộ trình 3 bước cụ thể để em cải thiện điểm trong 2 tuần tới.'
  },
  {
    icon: '🎯',
    label: 'Kế hoạch ôn tập thi học kỳ',
    prompt: 'Hãy giúp em lập một kế hoạch phân bổ thời gian ôn tập thi học kỳ khoa học trong 10 ngày tới, ưu tiên các môn trọng tâm và duy trì sức khỏe tinh thần.'
  },
  {
    icon: '🧭',
    label: 'Tư vấn chọn ngành theo RIASEC',
    prompt: 'Dựa trên kết quả trắc nghiệm tính cách nghề nghiệp RIASEC và điểm số các môn của em, hãy gợi ý 3 ngành đại học phù hợp cùng các tổ hợp môn xét tuyển tối ưu.'
  },
  {
    icon: '🌸',
    label: 'Bí quyết tích hoa Nguyệt Quế',
    prompt: 'Hãy cho em một số gợi ý về các hành động việc tốt, hỗ trợ bạn bè trong lớp hoặc tham gia hoạt động để tích thêm điểm rèn luyện và làm trổ bông Nguyệt Quế.'
  },
  {
    icon: '⏳',
    label: 'Quản lý thời gian & Giảm áp lực',
    prompt: 'Em thường bị xao nhãng và áp lực bài vở vào buổi tối. Hãy chỉ cho em phương pháp quản lý thời gian (như Pomodoro hoặc Time-blocking) phù hợp với học sinh THPT.'
  },
  {
    icon: '💬',
    label: 'Gợi ý chia sẻ với Thầy/Cô GVCN',
    prompt: 'Em muốn trao đổi với Thầy/Cô Chủ nhiệm về một số khó khăn trong học tập và nề nếp của mình. Hãy gợi ý giúp em cách mở lời một cách chân thành và tự tin.'
  }
];

export const StudentAIAdvisorModule: React.FC = () => {
  const currentUser = authService.getCurrentUser();
  const allStudents = studentService.getAll();

  // Find linked student
  const student = useMemo<Student | undefined>(() => {
    if (currentUser.studentId) {
      return studentService.getById(currentUser.studentId);
    }
    const studentIdCandidate = currentUser.id?.startsWith('usr_stu_') ? currentUser.id.replace('usr_stu_', '') : '';
    if (studentIdCandidate) {
      const found = studentService.getById(studentIdCandidate);
      if (found) return found;
    }
    // Fallback: match by code or name if available
    return allStudents.find(
      s => (s?.code && s.code.toLowerCase() === (currentUser.id || '').toLowerCase()) || 
           (s?.fullName && s.fullName === currentUser.name)
    ) || allStudents[0];
  }, [currentUser, allStudents]);

  // Build student pedagogical context
  const studentContext = useMemo(() => {
    if (!student?.id) return null;
    return aiStudentContextService.buildStudentContext(student.id);
  }, [student]);

  // Chat State
  const [messages, setMessages] = useState<AIMessage[]>(() => {
    const studentName = student?.fullName || currentUser.name || 'Học sinh';
    return [
      {
        id: 'msg-welcome',
        role: 'assistant',
        content: `Chào **${studentName}**! Thầy/Cô AI Cố vấn học tập rất vui được đồng hành cùng em. 

Em có thể hỏi thầy/cô bất cứ điều gì về **lộ trình ôn tập môn học**, **phương pháp tự học**, **tư vấn chọn ngành nghề theo RIASEC** hay **cách tích lũy hoa Nguyệt Quế & điểm rèn luyện** nhé! ✨`,
        timestamp: new Date().toISOString()
      }
    ];
  });

  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputQuery).trim();
    if (!text || isLoading || !student || !studentContext) return;

    const userMsg: AIMessage = {
      id: `msg-user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputQuery('');
    setIsLoading(true);

    try {
      // Build tailored prompt including student context
      const contextualPrompt = aiStudentContextService.generatePedagogicalPrompt(studentContext, text);
      
      const payloadMessages = [
        ...newMessages.slice(-4).map(m => ({
          role: m.role,
          content: m.role === 'user' ? contextualPrompt : m.content
        }))
      ];

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: payloadMessages,
          systemInstruction: SYSTEM_PROMPT_STUDENT_ADVISOR,
          model: 'gemini-3.7-flash',
          thinkingLevel: 'medium'
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || errData?.message || `Lỗi server (${res.status})`);
      }

      const data = await res.json();
      const replyText = data.text || 'Xin lỗi, AI tạm thời chưa thể đưa ra câu trả lời.';

      const botMsg: AIMessage = {
        id: `msg-bot-${Date.now()}`,
        role: 'assistant',
        content: replyText,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: AIMessage = {
        id: `msg-err-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ **Không thể kết nối AI**: ${err.message || 'Vui lòng kiểm tra lại kết nối mạng hoặc thử lại sau.'}`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleResetChat = () => {
    const studentName = student?.fullName || currentUser.name || 'Học sinh';
    setMessages([
      {
        id: 'msg-welcome-reset',
        role: 'assistant',
        content: `Chào **${studentName}**! Chúng ta bắt đầu phiên tư vấn học tập mới nhé. Em đang quan tâm đến nội dung nào hôm nay? 🌟`,
        timestamp: new Date().toISOString()
      }
    ]);
  };

  if (!student) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs">
        <AlertCircle className="mx-auto h-12 w-12 text-amber-500 mb-3" />
        <h3 className="text-base font-bold text-slate-800">Không tìm thấy hồ sơ học sinh liên kết</h3>
        <p className="text-xs text-slate-500 mt-1">
          Tài khoản của bạn chưa được gắn với mã học sinh trong lớp. Vui lòng liên hệ Giáo viên Chủ nhiệm để được hỗ trợ.
        </p>
      </div>
    );
  }

  const ac = studentContext?.academicRecord;
  const tr = studentContext?.trainingSummary;
  const cr = studentContext?.careerAssessment;
  const laurel = studentContext?.laurelTree;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* 1. Header Banner */}
      <div className="rounded-3xl border border-blue-200 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 p-5 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md text-white shadow-inner">
              <Sparkles className="h-6 w-6 text-yellow-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-black tracking-tight">AI CỐ VẤN HỌC TẬP</h1>
                <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-bold backdrop-blur-md">
                  Dành riêng cho {student?.fullName || 'Học sinh'} ({student?.code || 'HS'})
                </span>
                <span className="rounded-full bg-emerald-400/30 text-emerald-100 border border-emerald-300/40 px-2 py-0.5 text-[11px] font-bold">
                  Gemini 3.7 Flash
                </span>
              </div>
              <p className="text-xs text-blue-100 mt-1 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
                <span>Bảo mật cá nhân · Đồng hành tự học · Định hướng tương lai</span>
              </p>
            </div>
          </div>

          <button
            onClick={handleResetChat}
            className="flex items-center gap-1.5 self-start md:self-center rounded-xl bg-white/15 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/25 transition-colors backdrop-blur-md cursor-pointer border border-white/20"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Tạo phiên tư vấn mới</span>
          </button>
        </div>
      </div>

      {/* 2. Personal Quick Dashboard (4 Metrics Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Academic Card */}
        <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-blue-800">
            <span className="text-[11px] font-bold uppercase">Học tập</span>
            <BookOpen className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-2">
            <div className="text-lg font-black text-slate-800">
              {ac?.highestSubject ? `${ac.highestSubject.name} (${ac.highestSubject.score}đ)` : 'Đang học tập'}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {ac?.lowestSubject ? `Cần chú ý: ${ac.lowestSubject.name} (${ac.lowestSubject.score}đ)` : 'Chưa có điểm tổng kết'}
            </p>
          </div>
        </div>

        {/* Conduct / Training Card */}
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-[11px] font-bold uppercase">Rèn luyện</span>
            <Award className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2">
            <div className="text-lg font-black text-emerald-700">
              {tr?.totalPoints !== undefined ? `${tr.totalPoints} / 100 đ` : 'Chưa có điểm'}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Xếp loại: <strong className="text-emerald-700">{tr?.conductRank || 'Chưa đánh giá'}</strong>
            </p>
          </div>
        </div>

        {/* Laurel Tree Card */}
        <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-800">
            <span className="text-[11px] font-bold uppercase">Cây Nguyệt Quế</span>
            <TreePine className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2">
            <div className="text-lg font-black text-amber-700">
              {laurel?.currentFlowers ?? 0} / 10 Hoa
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Đã trổ hoàn thành: <strong>{laurel?.completedTrees ?? 0}</strong> cây
            </p>
          </div>
        </div>

        {/* RIASEC Career Card */}
        <div className="rounded-2xl border border-purple-100 bg-purple-50/50 p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-purple-800">
            <span className="text-[11px] font-bold uppercase">Hướng nghiệp RIASEC</span>
            <Compass className="h-4 w-4 text-purple-600" />
          </div>
          <div className="mt-2">
            <div className="text-lg font-black text-purple-700">
              {cr?.primaryCode || 'RIASEC'}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 truncate" title={cr?.suggestedMajors?.join(', ')}>
              {cr?.suggestedMajors?.[0] || 'Chưa làm trắc nghiệm'}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Main Chat Interface & Quick Prompts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* Chat Area (2 cols) */}
        <div className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white shadow-xs flex flex-col h-[640px] overflow-hidden">
          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {messages.map((msg) => {
              const isAssistant = msg.role === 'assistant';
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${isAssistant ? 'items-start' : 'items-start flex-row-reverse'}`}
                >
                  {/* Avatar */}
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl font-bold shadow-xs ${
                      isAssistant
                        ? 'bg-linear-to-br from-blue-600 to-indigo-600 text-white'
                        : 'bg-slate-800 text-white'
                    }`}
                  >
                    {isAssistant ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`relative max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed shadow-xs ${
                      isAssistant
                        ? 'bg-slate-50 text-slate-800 border border-slate-200/80'
                        : 'bg-blue-600 text-white font-medium'
                    }`}
                  >
                    {isAssistant ? (
                      <div className="prose prose-xs sm:prose-sm max-w-none text-slate-800 prose-headings:text-slate-900 prose-strong:text-slate-900 prose-ul:my-1 prose-li:my-0.5">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}

                    {/* Copy button */}
                    {isAssistant && (
                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-600" />
                            <span className="text-emerald-600">Đã sao chép</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Sao chép</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex gap-3 items-start animate-pulse">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
                  <Bot className="h-4 w-4 animate-spin" />
                </div>
                <div className="rounded-2xl bg-slate-100 border border-slate-200 p-3.5 text-xs text-slate-500 font-medium">
                  Thầy/Cô AI đang suy nghĩ và phân tích dữ liệu học tập của em...
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <div className="border-t border-slate-100 bg-slate-50/70 p-3 sm:p-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-end gap-2"
            >
              <textarea
                ref={textareaRef}
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                rows={2}
                placeholder="Nhập câu hỏi hoặc băn khoăn về học tập, rèn luyện, thi cử..."
                className="flex-1 resize-none rounded-2xl border border-slate-200 bg-white p-3 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-100 transition-all"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!inputQuery.trim() || isLoading}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                title="Gửi tin nhắn (Enter)"
              >
                <Send className="h-5 w-5" />
              </button>
            </form>
            <p className="text-[10px] text-slate-400 mt-1.5 text-center">
              Lời khuyên của AI mang tính chất tham khảo &amp; định hướng sư phạm tích cực. Hãy trao đổi thêm với Thầy/Cô GVCN khi cần nhé!
            </p>
          </div>
        </div>

        {/* Quick Prompts Panel (1 col) */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-slate-800">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <Lightbulb className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-tight">GỢI Ý CÂU HỎI THƯỜNG GẶP</h3>
              <p className="text-[11px] text-slate-500">Bấm để hỏi nhanh AI Cố vấn</p>
            </div>
          </div>

          <div className="space-y-2.5">
            {STUDENT_QUICK_PROMPTS.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(item.prompt)}
                disabled={isLoading}
                className="w-full text-left p-3 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-blue-50 hover:border-blue-200 transition-all group cursor-pointer disabled:opacity-50"
              >
                <div className="flex items-start gap-2.5">
                  <span className="text-base shrink-0">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 group-hover:text-blue-700 transition-colors">
                      {item.label}
                    </p>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                      {item.prompt}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600 shrink-0 mt-1 transition-transform group-hover:translate-x-0.5" />
                </div>
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3 text-[11px] text-emerald-900 flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              Hệ thống đã tự động tích hợp bảng điểm, chuyên cần và kết quả trắc nghiệm RIASEC của em để đưa ra câu trả lời chính xác nhất.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
