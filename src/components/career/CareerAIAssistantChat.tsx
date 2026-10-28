/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  RefreshCw,
  Trash2,
  AlertCircle,
  HelpCircle,
  BookOpen,
  GraduationCap,
  Target,
  TrendingUp,
  User,
  Bot,
  Copy,
  Check
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { careerService } from '../../services/CareerService';
import { studentService } from '../../services/StudentService';
import { classService } from '../../services/ClassService';
import { CareerAIMessage, CareerAIConversation, CareerAssessment } from '../../types';

interface CareerAIAssistantChatProps {
  studentId: string;
  currentAssessment?: CareerAssessment | null;
  className?: string;
}

export const CareerAIAssistantChat: React.FC<CareerAIAssistantChatProps> = ({
  studentId,
  currentAssessment,
  className = ''
}) => {
  const [conversation, setConversation] = useState<CareerAIConversation>(() =>
    careerService.getConversation(studentId)
  );
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const student = studentService.getById(studentId);
  const classSettings = classService.getSettings();

  const loadConv = () => {
    const conv = careerService.getConversation(studentId);
    setConversation({ ...conv, messages: [...conv.messages] });
  };

  useEffect(() => {
    loadConv();
  }, [studentId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation.messages, isLoading]);

  const handleSendMessage = async (textToSend?: string, quickPromptLabel?: string) => {
    const message = textToSend || inputValue.trim();
    if (!message || isLoading) return;

    if (!textToSend) {
      setInputValue('');
    }

    setIsLoading(true);
    try {
      await careerService.sendMultiTurnChatMessage(studentId, message, quickPromptLabel);
      loadConv();
    } catch {
      loadConv();
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearConversation = () => {
    if (window.confirm('Bạn có chắc muốn làm mới lịch sử tư vấn AI với học sinh này?')) {
      careerService.clearConversation(studentId);
      loadConv();
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const primaryCode = currentAssessment?.primaryCode || 'RIASEC';
  const quickPrompts = [
    {
      icon: GraduationCap,
      label: 'Gợi ý ngành & trường',
      prompt: `Dựa trên kết quả trắc nghiệm Holland mã ${primaryCode} và điểm học tập của em, hãy gợi ý 4 ngành đào tạo và 3 trường Đại học phù hợp nhất tại Việt Nam kèm lý do phân tích chi tiết.`
    },
    {
      icon: Target,
      label: 'Tư vấn tổ hợp môn thi',
      prompt: `Em nên lựa chọn tổ hợp môn thi tốt nghiệp THPT nào (như A00, A01, D01, D07...) để tối ưu hóa cơ hội xét tuyển cho nhóm ngành ${primaryCode}?`
    },
    {
      icon: TrendingUp,
      label: 'Liên hệ điểm số môn học',
      prompt: `Hãy phân tích sự liên kết giữa các môn học thế mạnh ở trường lớp và các nhóm ngành nghề phù hợp với nhóm tính cách ${primaryCode} của em.`
    },
    {
      icon: BookOpen,
      label: 'Lộ trình hành động 3 tháng',
      prompt: `Hãy lập cho em một kế hoạch hành động 3 tháng cụ thể để tìm hiểu sâu về ngành học, củng cố môn thi tốt nghiệp và chuẩn bị tâm thế vững vàng.`
    }
  ];

  return (
    <div className={`rounded-2xl border border-indigo-200 bg-white shadow-xs flex flex-col overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-800 to-purple-800 px-5 py-4 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-xs text-amber-300 shadow-inner">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black tracking-tight text-white">
                Trợ lý Cố vấn Hướng nghiệp AI Sư phạm
              </h3>
              <span className="rounded-full bg-indigo-500/50 border border-indigo-400/40 px-2 py-0.5 text-[10px] font-bold text-indigo-100">
                Multi-Turn Chat
              </span>
            </div>
            <p className="text-[11px] text-indigo-200 mt-0.5">
              Đồng hành tư vấn cho học sinh: <strong className="text-white">{student?.fullName || 'Học sinh'}</strong> (Lớp {classSettings.className || '11A1'} • Mã {primaryCode})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleClearConversation}
            className="flex items-center gap-1 rounded-xl bg-white/10 hover:bg-white/20 px-2.5 py-1.5 text-[11px] font-bold text-indigo-100 transition-colors cursor-pointer"
            title="Làm mới đoạn hội thoại"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Làm mới</span>
          </button>
        </div>
      </div>

      {/* Messages List Area */}
      <div className="flex-1 p-4 sm:p-5 overflow-y-auto max-h-[500px] min-h-[360px] space-y-4 bg-slate-50/50">
        {conversation.messages.map((msg) => {
          const isUser = msg.role === 'user';
          const isAssistant = msg.role === 'assistant';

          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold shadow-2xs ${
                  isUser
                    ? 'bg-amber-600 text-white'
                    : msg.isError
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-indigo-700 text-white'
                }`}
              >
                {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>

              {/* Message Content */}
              <div
                className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed space-y-2 shadow-2xs ${
                  isUser
                    ? 'bg-amber-600 text-white rounded-tr-none'
                    : msg.isError
                    ? 'bg-rose-50 border border-rose-200 text-rose-900 rounded-tl-none'
                    : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                }`}
              >
                {/* User quick prompt badge if any */}
                {isUser && msg.quickPromptUsed && (
                  <div className="text-[10px] font-bold text-amber-200 uppercase tracking-wider mb-1">
                    🎯 Chủ đề: {msg.quickPromptUsed}
                  </div>
                )}

                {/* Message Body */}
                {isUser ? (
                  <div className="whitespace-pre-wrap font-medium">{msg.content}</div>
                ) : (
                  <div className="markdown-body prose prose-xs prose-slate max-w-none">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                )}

                {/* Footer time & actions */}
                <div
                  className={`flex items-center justify-between pt-1 border-t text-[10px] ${
                    isUser ? 'border-amber-500/40 text-amber-100' : 'border-slate-100 text-slate-400'
                  }`}
                >
                  <span>{msg.createdAt}</span>

                  {isAssistant && !msg.isError && (
                    <button
                      onClick={() => handleCopyMessage(msg.id, msg.content)}
                      className="flex items-center gap-1 text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer ml-2"
                    >
                      {copiedMsgId === msg.id ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-600" />
                          <span className="text-emerald-600">Đã chép</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>Sao chép</span>
                        </>
                      )}
                    </button>
                  )}

                  {msg.isError && (
                    <button
                      onClick={() => handleSendMessage(conversation.messages[conversation.messages.length - 2]?.content)}
                      className="flex items-center gap-1 font-bold text-rose-700 hover:underline cursor-pointer"
                    >
                      <RefreshCw className="h-3 w-3" />
                      <span>Thử lại</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Loading Spinner Indicator */}
        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-700 text-white shadow-2xs">
              <Bot className="h-4 w-4" />
            </div>
            <div className="rounded-2xl rounded-tl-none bg-white border border-indigo-200 p-3.5 shadow-2xs flex items-center gap-2.5 text-xs text-indigo-900 font-bold">
              <Sparkles className="h-4 w-4 text-indigo-600 animate-spin" />
              <span>Trợ lý AI đang nghiên cứu hồ sơ RIASEC và phân tích câu trả lời...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompt Pills */}
      <div className="p-3 bg-white border-t border-slate-100 space-y-2">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
          <HelpCircle className="h-3.5 w-3.5 text-amber-600" />
          <span>Gợi ý câu hỏi nhanh:</span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {quickPrompts.map((qp, idx) => {
            const Icon = qp.icon;
            return (
              <button
                key={idx}
                onClick={() => handleSendMessage(qp.prompt, qp.label)}
                disabled={isLoading}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-900 px-3 py-1.5 text-[11px] font-bold text-slate-700 transition-all cursor-pointer disabled:opacity-50"
              >
                <Icon className="h-3 w-3 text-indigo-600" />
                <span>{qp.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Input Form Bar */}
      <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Hỏi trợ lý AI về ngành nghề, điểm chuẩn, khối thi hoặc thắc mắc của bạn..."
            disabled={isLoading}
            className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all disabled:opacity-50"
          />

          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            <Send className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Gửi câu hỏi</span>
          </button>
        </form>

        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 px-1">
          <div className="flex items-center gap-1 text-amber-700">
            <AlertCircle className="h-3 w-3 text-amber-600" />
            <span>Phân tích AI mang tính tham khảo sư phạm theo chuẩn O*NET & GDPT 2018.</span>
          </div>
          <span>Không Gian Chủ Nhiệm Số • Lớp {classSettings.className || '11A1'}</span>
        </div>
      </div>
    </div>
  );
};
