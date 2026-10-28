/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  MessageSquarePlus,
  MessageSquare,
  Trash2,
  Edit2,
  Check,
  X,
  Zap,
  Brain,
  Sparkles,
  Calendar,
  BarChart2,
  UserCheck,
  Gamepad2,
  FileText,
  Mail,
  HeartHandshake
} from 'lucide-react';
import { AIConversation } from '../../types';

interface AIConversationSidebarProps {
  conversations: AIConversation[];
  activeConversationId: string;
  onSelectConversation: (id: string) => void;
  onCreateConversation: () => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onDeleteConversation: (id: string) => void;
  thinkingLevel: 'low' | 'medium' | 'high';
  onChangeThinkingLevel: (level: 'low' | 'medium' | 'high') => void;
  onSelectQuickTool: (toolId: string) => void;
}

export const AIConversationSidebar: React.FC<AIConversationSidebarProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onCreateConversation,
  onRenameConversation,
  onDeleteConversation,
  thinkingLevel,
  onChangeThinkingLevel,
  onSelectQuickTool
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');

  const handleStartEdit = (conv: AIConversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title || '');
  };

  const handleSaveEdit = (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      onRenameConversation(convId, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const handleDelete = (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Thầy/Cô có chắc chắn muốn xóa cuộc trò chuyện này?')) {
      onDeleteConversation(convId);
    }
  };

  return (
    <div
      id="ai-conversation-sidebar"
      className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col h-full space-y-4"
    >
      {/* New Conversation Button */}
      <button
        type="button"
        id="btn-create-new-conv"
        onClick={onCreateConversation}
        className="w-full py-2.5 px-3.5 rounded-xl bg-linear-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm shadow-indigo-500/20 active:scale-98 transition-all"
      >
        <MessageSquarePlus className="w-4 h-4" />
        <span>+ Cuộc trò chuyện mới</span>
      </button>

      {/* Thinking Level Control */}
      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 uppercase tracking-wider">
          <span className="flex items-center gap-1">
            <Brain className="w-3.5 h-3.5 text-indigo-600" />
            Mức độ suy nghĩ (Thinking):
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1">
          <button
            type="button"
            onClick={() => onChangeThinkingLevel('low')}
            className={`py-1 rounded-lg text-[11px] font-semibold transition-all ${
              thinkingLevel === 'low'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
            title="Phù hợp thông báo ngắn, nhắc nhở nhanh"
          >
            ⚡ Thấp
          </button>
          <button
            type="button"
            onClick={() => onChangeThinkingLevel('medium')}
            className={`py-1 rounded-lg text-[11px] font-semibold transition-all ${
              thinkingLevel === 'medium'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
            title="Mặc định - Trả lời cân bằng, mạch lạc"
          >
            💡 Vừa
          </button>
          <button
            type="button"
            onClick={() => onChangeThinkingLevel('high')}
            className={`py-1 rounded-lg text-[11px] font-semibold transition-all ${
              thinkingLevel === 'high'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
            title="Phân tích sâu dữ liệu học sinh, kế hoạch phức tạp"
          >
            🧠 Sâu sắc
          </button>
        </div>
      </div>

      {/* Conversation History List */}
      <div className="flex-1 flex flex-col min-h-0 space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Lịch sử trò chuyện ({conversations.length})
          </span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
          {conversations.map((conv) => {
            const isActive = conv.id === activeConversationId;
            const isEditing = editingId === conv.id;

            return (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`group relative p-2.5 rounded-xl text-xs cursor-pointer transition-all flex items-center justify-between gap-2 ${
                  isActive
                    ? 'bg-indigo-50/90 text-indigo-950 font-semibold border border-indigo-200/80 shadow-2xs'
                    : 'bg-slate-50/60 hover:bg-slate-100/80 text-slate-700 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                  {isEditing ? (
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full px-1.5 py-0.5 text-xs bg-white border border-indigo-400 rounded-md focus:outline-hidden"
                      autoFocus
                    />
                  ) : (
                    <span className="truncate">{conv.title}</span>
                  )}
                </div>

                {/* Edit & Delete Action Buttons */}
                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        onClick={(e) => handleSaveEdit(conv.id, e)}
                        className="p-1 text-emerald-600 hover:bg-emerald-100 rounded-sm"
                        title="Lưu tên"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="p-1 text-slate-400 hover:bg-slate-200 rounded-sm"
                        title="Hủy"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={(e) => handleStartEdit(conv, e)}
                        className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-200/60 rounded-sm"
                        title="Đổi tên"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      {conversations.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => handleDelete(conv.id, e)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-sm"
                          title="Xóa cuộc trò chuyện"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {conversations.length === 0 && (
            <div className="text-center py-6 text-xs text-slate-400">
              Chưa có cuộc trò chuyện nào.
            </div>
          )}
        </div>
      </div>

      {/* Homeroom Specialized Tools Shortcuts */}
      <div className="pt-3 border-t border-slate-100 space-y-1">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block px-1 mb-1.5">
          Công cụ nghiệp vụ GVCN
        </span>
        <div className="grid grid-cols-2 gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => onSelectQuickTool('class_analysis')}
            className="p-2 rounded-xl bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 text-left border border-slate-200/60 flex items-center gap-2 transition-all"
          >
            <BarChart2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="truncate text-[11px] font-medium">Phân tích lớp</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectQuickTool('student_analysis')}
            className="p-2 rounded-xl bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 text-left border border-slate-200/60 flex items-center gap-2 transition-all"
          >
            <UserCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="truncate text-[11px] font-medium">Phân tích HS</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectQuickTool('plan')}
            className="p-2 rounded-xl bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 text-left border border-slate-200/60 flex items-center gap-2 transition-all"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate text-[11px] font-medium">Lập kế hoạch</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectQuickTool('game')}
            className="p-2 rounded-xl bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 text-left border border-slate-200/60 flex items-center gap-2 transition-all"
          >
            <Gamepad2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
            <span className="truncate text-[11px] font-medium">Trò chơi lớp</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectQuickTool('parent')}
            className="p-2 rounded-xl bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 text-left border border-slate-200/60 flex items-center gap-2 transition-all"
          >
            <Mail className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span className="truncate text-[11px] font-medium">Thư gửi PH</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectQuickTool('situation')}
            className="p-2 rounded-xl bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 text-left border border-slate-200/60 flex items-center gap-2 transition-all"
          >
            <HeartHandshake className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="truncate text-[11px] font-medium">Tư vấn tình huống</span>
          </button>
        </div>
      </div>
    </div>
  );
};
