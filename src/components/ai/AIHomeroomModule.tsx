/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Sparkles,
  Bot,
  User,
  Copy,
  Check,
  RotateCcw,
  FileText,
  Download,
  Edit3,
  Sliders,
  Trash2,
  Brain,
  ShieldCheck,
  AlertCircle,
  Globe,
  MessageSquare,
  Layers,
  BookOpen,
  ExternalLink,
  Zap,
  HelpCircle
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { aiService } from '../../services/AIService';
import { classService } from '../../services/ClassService';
import { authService } from '../../services/AuthService';
import { studentService } from '../../services/StudentService';
import { useStudents } from '../../hooks/useStudents';
import { AnalysisScope, DEFAULT_AI_PERMISSIONS, TimeframeFilter } from '../../services/AIContextService';
import { schoolWeekService } from '../../services/SchoolWeekService';
import { AIMessage, AIConversation, AIDataPermissions } from '../../types';
import { AIConnectionBanner } from './AIConnectionBanner';
import { AIScopeSelector } from './AIScopeSelector';
import { AIConversationSidebar } from './AIConversationSidebar';
import { AIDocumentEditorModal } from './AIDocumentEditorModal';
import { AIQuickToolsModal } from './AIQuickToolsModal';
import { AICareSignalsWorkflow } from './AICareSignalsWorkflow';
import { GeminiPromptHub } from './GeminiPromptHub';
import { ChatGPTPromptHub } from './ChatGPTPromptHub';
import { OtherAIToolsHub } from './OtherAIToolsHub';
import { AITeacherGuideHub } from './AITeacherGuideHub';

export type AISubTab = 'ai_hub' | 'gemini' | 'chatgpt' | 'other_tools' | 'guide';

interface AIHomeroomModuleProps {
  onOpenSettings?: () => void;
  initialSubTab?: AISubTab;
}

const QUICK_PROMPTS = [
  { label: '🔍 Phân tích tín hiệu cảnh báo', prompt: 'Dựa trên dữ liệu vi phạm nề nếp, chuyên cần và danh mục cảnh báo khách quan từ hệ thống, hãy phân tích các tín hiệu cần GVCN lưu ý và đề xuất các điều cần xác minh.' },
  { label: '📅 Dự thảo kế hoạch tuần mới', prompt: 'Dựa trên tổng kết tuần vừa qua, việc chưa hoàn thành và các ca theo dõi nề nếp, hãy gợi ý bản nháp kế hoạch công tác chủ nhiệm cho tuần mới.' },
  { label: '📊 Phân tích tình hình lớp', prompt: 'Hãy phân tích tổng thể tình hình học tập, nề nếp, chuyên cần và Vườn Nguyệt Quế của lớp học trong tuần này.' },
  { label: '📝 Kế hoạch sinh hoạt lớp', prompt: 'Soạn kế hoạch chi tiết cho tiết Sinh hoạt lớp 45 phút tuần này, tập trung vào tinh thần tự quản và khen ngợi học sinh tiến bộ.' },
  { label: '💌 Thư ngỏ phụ huynh', prompt: 'Soạn thư ngỏ gửi phụ huynh học sinh để thông báo tình hình rèn luyện và kêu gọi đồng hành cùng con trong giai đoạn giữa kỳ.' },
  { label: '💡 Hướng phối hợp học viên', prompt: 'Đề xuất các giải pháp sư phạm và hướng tiếp cận 1:1 ấm áp giúp đỡ học sinh có tín hiệu vi phạm nề nếp tiến bộ hơn.' }
];

export const AIHomeroomModule: React.FC<AIHomeroomModuleProps> = ({ onOpenSettings, initialSubTab = 'ai_hub' }) => {
  const currentUser = authService.getCurrentUser();
  const classSettings = classService.getSettings();
  const allStudents = useStudents();

  // 0. Active Sub-Tab State
  const [activeSubTab, setActiveSubTab] = useState<AISubTab>(initialSubTab);

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  // 1. Config & Connection State
  const [aiConfig, setAiConfig] = useState(aiService.getWorkspaceConfig());

  // 2. Multi-turn Conversations State
  const [conversations, setConversations] = useState<AIConversation[]>(() => aiService.getConversations());
  const [activeConv, setActiveConv] = useState<AIConversation>(() => aiService.getOrCreateActiveConversation());

  // 3. Scope & Permissions State
  const [scope, setScope] = useState<AnalysisScope>('class');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(allStudents[0]?.id || '');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [timeframe, setTimeframe] = useState<TimeframeFilter>(() => {
    const current = schoolWeekService.getCurrentStudyPeriod();
    return {
      type: 'week',
      weekNumber: current.weekNumber || 1
    };
  });
  const [permissions, setPermissions] = useState<AIDataPermissions>(DEFAULT_AI_PERMISSIONS);
  const [thinkingLevel, setThinkingLevel] = useState<'low' | 'medium' | 'high'>('medium');

  // 4. Chat Workspace State
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  // 5. Modals State
  const [docEditor, setDocEditor] = useState<{
    isOpen: boolean;
    title: string;
    content: string;
    documentType?: any;
  }>({
    isOpen: false,
    title: '',
    content: '',
    documentType: 'general'
  });

  const [quickToolModal, setQuickToolModal] = useState<{
    isOpen: boolean;
    toolType: string;
  }>({
    isOpen: false,
    toolType: 'class_analysis'
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync conversations and active conversation from AIService
  useEffect(() => {
    const unsub = aiService.subscribe(() => {
      setConversations(aiService.getConversations());
      setActiveConv(aiService.getOrCreateActiveConversation());
      setAiConfig(aiService.getWorkspaceConfig());
    });
    return unsub;
  }, []);

  // Auto-scroll when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConv.messages, isLoading]);

  // Handle Send Chat Message
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputQuery).trim();
    if (!text || isLoading) return;

    const userMsg: AIMessage = {
      id: `msg-user-${Date.now()}`,
      conversationId: activeConv.id,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      thinkingLevel
    };

    aiService.saveMessage(userMsg);
    setInputQuery('');
    setIsLoading(true);

    try {
      const responseText = await aiService.askAssistant(text, {
        scope,
        timeframe,
        studentId: selectedStudentId,
        studentIds: selectedStudentIds,
        permissions,
        thinkingLevel,
        conversationId: activeConv.id
      });

      const assistantMsg: AIMessage = {
        id: `msg-bot-${Date.now()}`,
        conversationId: activeConv.id,
        role: 'assistant',
        content: responseText,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        thinkingLevel
      };

      aiService.saveMessage(assistantMsg);
    } catch (err: any) {
      const msgText = err?.message || 'Đã có lỗi xảy ra';
      const isRate = msgText.includes('đạt giới hạn') || msgText.includes('hạn mức') || msgText.includes('429');
      const content = isRate
        ? `⚠️ **AI đang tạm thời đạt giới hạn sử dụng. Vui lòng thử lại sau.**`
        : `⚠️ **Không thể hoàn tất phản hồi từ AI:** ${msgText}`;

      const errMsg: AIMessage = {
        id: `msg-err-${Date.now()}`,
        conversationId: activeConv.id,
        role: 'assistant',
        content,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        isError: true
      };
      aiService.saveMessage(errMsg);
    } finally {
      setIsLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  };

  // Keyboard shortcut: Enter to send, Shift+Enter for newline
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopyMessage = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const handleExportWord = async (msg: AIMessage) => {
    const title = activeConv.title || 'VAN_BAN_CHU_NHIEM';
    const { wordExportService } = await import('../../services/WordExportService');
    await wordExportService.exportAIResponseToWord(title, msg.content);
  };

  const handleOpenInEditor = (msg: AIMessage) => {
    setDocEditor({
      isOpen: true,
      title: activeConv.title || 'DỰ THẢO VĂN BẢN CHỦ NHIỆM',
      content: msg.content,
      documentType: 'general'
    });
  };

  const handleCreateNewConversation = () => {
    const newConv = aiService.createConversation();
    setActiveConv(newConv);
  };

  const handleSelectConversation = (id: string) => {
    aiService.setActiveConversationId(id);
    const conv = conversations.find((c) => c.id === id);
    if (conv) setActiveConv(conv);
  };

  const handleRenameConversation = (id: string, newTitle: string) => {
    aiService.renameConversation(id, newTitle);
  };

  const handleDeleteConversation = (id: string) => {
    aiService.deleteConversation(id);
  };

  const handleClearActiveConversation = () => {
    if (window.confirm('Thầy/Cô có chắc chắn muốn xóa tất cả tin nhắn trong cuộc trò chuyện này?')) {
      aiService.clearConversation();
    }
  };

  const selectedStudentObj = allStudents.find((s) => s.id === selectedStudentId);

  const subTabs = [
    { id: 'ai_hub' as AISubTab, label: 'AI Hub & Trợ lý', icon: Sparkles, badge: 'Tích hợp' },
    { id: 'gemini' as AISubTab, label: 'Mở Gemini', icon: Globe, badge: '1-Click Prompt' },
    { id: 'chatgpt' as AISubTab, label: 'Mở ChatGPT', icon: MessageSquare, badge: '1-Click Prompt' },
    { id: 'other_tools' as AISubTab, label: 'Mở công cụ AI khác', icon: Layers, badge: '8+ Công cụ' },
    { id: 'guide' as AISubTab, label: 'Hướng dẫn sử dụng AI', icon: BookOpen, badge: 'Cẩm nang GVCN' }
  ];

  return (
    <div id="ai-homeroom-module" className="space-y-4 animate-fade-in">
      {/* 0. Main Sub-Tab Navigation Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-2 sm:p-2.5 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {subTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-ai-${tab.id}`}
                onClick={() => setActiveSubTab(tab.id)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-Tab 1: AI Hub (Trợ lý GVCN tích hợp) */}
      {activeSubTab === 'ai_hub' && (
        <div className="space-y-4 animate-fade-in">
          {/* 1. Connection Status Banner */}
          <AIConnectionBanner
            config={aiConfig}
            onRefreshConfig={() => setAiConfig(aiService.getWorkspaceConfig())}
            onOpenSettings={onOpenSettings}
          />

      {/* 2. Analysis Scope & Data Permissions Selector */}
      <AIScopeSelector
        scope={scope}
        onChangeScope={setScope}
        selectedStudentId={selectedStudentId}
        onSelectStudentId={setSelectedStudentId}
        selectedStudentIds={selectedStudentIds}
        onSelectStudentIds={setSelectedStudentIds}
        timeframe={timeframe}
        onChangeTimeframe={setTimeframe}
        permissions={permissions}
        onChangePermissions={setPermissions}
      />

      {/* 2.1 AI Care Signals & Coordination Workflow (Human-in-the-loop) */}
      <AICareSignalsWorkflow
        scope={scope}
        selectedStudentId={selectedStudentId}
        permissions={permissions}
        allStudents={allStudents}
        onOpenDocumentEditor={(title, content) => {
          setDocEditor({
            isOpen: true,
            title,
            content,
            documentType: 'general'
          });
        }}
        onInsertToChat={(text) => {
          setInputQuery(text);
          textareaRef.current?.focus();
        }}
      />

      {/* 3. Main Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left: Conversations & Quick Tools (4 cols on lg, 3 cols on xl) */}
        <div className="lg:col-span-4 xl:col-span-3 h-[680px]">
          <AIConversationSidebar
            conversations={conversations}
            activeConversationId={activeConv.id}
            onSelectConversation={handleSelectConversation}
            onCreateConversation={handleCreateNewConversation}
            onRenameConversation={handleRenameConversation}
            onDeleteConversation={handleDeleteConversation}
            thinkingLevel={thinkingLevel}
            onChangeThinkingLevel={setThinkingLevel}
            onSelectQuickTool={(toolId) => {
              setQuickToolModal({ isOpen: true, toolType: toolId });
            }}
          />
        </div>

        {/* Right: Interactive Chat Workspace (8 cols on lg, 9 cols on xl) */}
        <div className="lg:col-span-8 xl:col-span-9 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col h-[680px] overflow-hidden">
          {/* Chat Workspace Header */}
          <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/70">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                  {activeConv.title || 'Cuộc trò chuyện'}
                </h3>
                <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
                  <span className="flex items-center gap-1 font-medium text-indigo-700">
                    🎯 Phạm vi:{' '}
                    {scope === 'class'
                      ? `Toàn lớp (${allStudents.length} HS)`
                      : scope === 'single_student'
                      ? `${selectedStudentObj?.fullName || '1 Học viên'}`
                      : scope === 'multi_student'
                      ? `${selectedStudentIds.length} Học viên`
                      : 'Chung (Không dùng dữ liệu)'}
                  </span>
                  <span>·</span>
                  <span className="text-slate-500 font-medium">
                    Thinking:{' '}
                    {thinkingLevel === 'high'
                      ? 'Sâu sắc'
                      : thinkingLevel === 'low'
                      ? 'Nhanh'
                      : 'Tiêu chuẩn'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                id="btn-clear-chat"
                onClick={handleClearActiveConversation}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold transition-all"
                title="Làm mới nội dung cuộc trò chuyện này"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Messages Stream */}
          <div
            id="chat-messages-container"
            className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar bg-slate-50/30"
          >
            {activeConv.messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-8 h-8 rounded-xl bg-linear-to-br from-indigo-600 to-blue-600 text-white flex items-center justify-center shadow-xs shrink-0 mt-0.5">
                      <Sparkles className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-4 text-xs leading-relaxed space-y-2.5 transition-all shadow-xs ${
                      isUser
                        ? 'bg-indigo-600 text-white font-medium rounded-tr-xs'
                        : msg.isError
                        ? 'bg-rose-50 text-rose-900 border border-rose-200/80 rounded-tl-xs'
                        : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-xs'
                    }`}
                  >
                    {/* Message Body with Markdown */}
                    <div
                      className={`prose max-w-none text-xs leading-relaxed ${
                        isUser ? 'prose-invert text-white' : 'prose-slate'
                      }`}
                    >
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>

                    {/* Timestamp & Actions */}
                    <div
                      className={`flex items-center justify-between gap-3 pt-1 border-t text-[10px] ${
                        isUser
                          ? 'border-indigo-500/40 text-indigo-200'
                          : 'border-slate-100 text-slate-400'
                      }`}
                    >
                      <span>{msg.timestamp}</span>

                      {!isUser && !msg.isError && (
                        <div className="flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => handleCopyMessage(msg.content, msg.id)}
                            className="px-2 py-0.5 rounded-md hover:bg-slate-100 text-slate-600 flex items-center gap-1 transition-all"
                            title="Sao chép"
                          >
                            {copiedMsgId === msg.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span className="text-emerald-600 font-bold">Đã chép</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Sao chép</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenInEditor(msg)}
                            className="px-2 py-0.5 rounded-md hover:bg-indigo-50 text-indigo-700 font-medium flex items-center gap-1 transition-all"
                            title="Mở trong trình soạn thảo Word"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Sửa Word</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleExportWord(msg)}
                            className="px-2.5 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold flex items-center gap-1 transition-all"
                            title="Tải về file Word (.docx) thật"
                          >
                            <Download className="w-3 h-3" />
                            <span>Tải .docx</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {isUser && (
                    <div className="w-8 h-8 rounded-xl bg-slate-800 text-white flex items-center justify-center shadow-xs shrink-0 mt-0.5">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-start gap-3 justify-start animate-fade-in">
                <div className="w-8 h-8 rounded-xl bg-linear-to-br from-indigo-600 to-blue-600 text-white flex items-center justify-center shadow-xs shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4 animate-spin" />
                </div>
                <div className="bg-white border border-slate-200/80 rounded-2xl rounded-tl-xs p-4 shadow-xs text-xs text-slate-600 space-y-2 max-w-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
                    <span className="font-bold text-indigo-900">
                      AI Trợ lý đang suy nghĩ và phân tích dữ liệu...
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Đang tổng hợp dữ liệu lớp học và xây dựng giải pháp sư phạm chuẩn mực.
                  </p>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions & 1-Click Analysis Action */}
          <div className="px-4 py-2 bg-slate-50/90 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                Gợi ý nhanh:
              </span>
              {QUICK_PROMPTS.slice(0, 3).map((qp, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(qp.prompt)}
                  disabled={isLoading}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 text-xs whitespace-nowrap transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  {qp.label}
                </button>
              ))}
            </div>

            {/* Direct 1-Click Trigger */}
            <button
              type="button"
              id="btn-trigger-ai-analysis"
              onClick={() => handleSendMessage('Dựa trên dữ liệu thực tế đã chọn theo phạm vi thời gian, đối tượng và các nhóm dữ liệu ở trên, hãy thực hiện phân tích sư phạm toàn diện tách biệt rõ ràng 5 mục: 1. Dữ liệu ghi nhận được; 2. Nhận định từ dữ liệu; 3. Điểm cần lưu ý; 4. Giả thuyết nếu có; 5. Đề xuất hỗ trợ cho GVCN.')}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-xl bg-linear-to-r from-amber-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer disabled:opacity-50 transition-all active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Phân tích theo phạm vi đã chọn</span>
            </button>
          </div>

          {/* Input & Send Area */}
          <div className="p-3 sm:p-4 border-t border-slate-100 bg-white space-y-2">
            <div className="relative flex items-end gap-2 bg-slate-50 rounded-2xl border border-slate-200/80 p-2 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
              <textarea
                ref={textareaRef}
                id="ai-chat-input"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={2}
                placeholder="Nhập yêu cầu phân tích, lập kế hoạch, soạn thư ngỏ hoặc câu hỏi sư phạm... (Nhấn Enter để gửi, Shift+Enter để xuống dòng)"
                className="w-full bg-transparent text-xs sm:text-sm text-slate-800 placeholder-slate-400 resize-none focus:outline-hidden px-2 py-1 leading-relaxed custom-scrollbar"
              />

              <button
                type="button"
                id="btn-send-ai-message"
                onClick={() => handleSendMessage()}
                disabled={!inputQuery.trim() || isLoading}
                className={`p-2.5 rounded-xl text-white transition-all shadow-xs shrink-0 ${
                  !inputQuery.trim() || isLoading
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-linear-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 active:scale-95 shadow-indigo-500/20'
                }`}
                title="Gửi câu hỏi"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 inline" />
                Mọi phân tích chỉ đóng vai trò tham vấn gợi ý. Quyền quyết định thuộc về GVCN.
              </span>
              <span className="hidden sm:inline">Shift + Enter để xuống dòng</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Document Editor & Word Export Modal */}
      <AIDocumentEditorModal
        isOpen={docEditor.isOpen}
        onClose={() => setDocEditor({ ...docEditor, isOpen: false })}
        initialTitle={docEditor.title}
        initialContent={docEditor.content}
        documentType={docEditor.documentType}
      />

          {/* 5. Quick Homeroom Tools Modal */}
          <AIQuickToolsModal
            isOpen={quickToolModal.isOpen}
            onClose={() => setQuickToolModal({ ...quickToolModal, isOpen: false })}
            toolType={quickToolModal.toolType}
            permissions={permissions}
            onInsertToChat={(text) => handleSendMessage(text)}
            onOpenDocumentEditor={(title, content, type) => {
              setDocEditor({
                isOpen: true,
                title,
                content,
                documentType: type
              });
            }}
          />
        </div>
      )}

      {/* Sub-Tab 2: Mở Gemini */}
      {activeSubTab === 'gemini' && <GeminiPromptHub />}

      {/* Sub-Tab 3: Mở ChatGPT */}
      {activeSubTab === 'chatgpt' && <ChatGPTPromptHub />}

      {/* Sub-Tab 4: Mở công cụ AI khác */}
      {activeSubTab === 'other_tools' && <OtherAIToolsHub />}

      {/* Sub-Tab 5: Hướng dẫn sử dụng AI */}
      {activeSubTab === 'guide' && <AITeacherGuideHub />}
    </div>
  );
};
