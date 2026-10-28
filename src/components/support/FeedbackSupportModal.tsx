/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  HelpCircle,
  MessageSquarePlus,
  Lightbulb,
  Clock,
  Star,
  CheckCircle2,
  AlertCircle,
  Send,
  ShieldCheck,
  Tag,
  Layers,
  Phone,
  Mail,
  RefreshCw,
  Eye,
  MessageSquare
} from 'lucide-react';
import { supportService } from '../../services/SupportService';
import { authService } from '../../services/AuthService';
import {
  SupportTicket,
  UserFeedback,
  SupportTicketCategory,
  SupportTicketPriority,
  FeedbackType,
  FeedbackCategory
} from '../../types';

interface FeedbackSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'ticket' | 'feedback' | 'suggestion' | 'history';
}

const SUPPORT_CATEGORIES: { id: SupportTicketCategory; label: string }[] = [
  { id: 'ACCOUNT', label: 'Tài khoản & Phân quyền' },
  { id: 'LOGIN', label: 'Đăng nhập & Quên mật khẩu' },
  { id: 'DATA', label: 'Lỗi dữ liệu & Đồng bộ' },
  { id: 'FEATURE', label: 'Lỗi tính năng nghiệp vụ' },
  { id: 'USABILITY', label: 'Thao tác khó sử dụng' },
  { id: 'UI', label: 'Giao diện & Hiển thị' },
  { id: 'OTHER', label: 'Vấn đề khác' }
];

const FEEDBACK_CATEGORIES: { id: FeedbackCategory; label: string }[] = [
  { id: 'UI', label: 'Giao diện & Bố cục' },
  { id: 'USABILITY', label: 'Độ dễ sử dụng' },
  { id: 'SPEED', label: 'Tốc độ & Hiệu năng' },
  { id: 'BUG', label: 'Báo lỗi kỹ thuật' },
  { id: 'FEATURE', label: 'Ý tưởng tính năng' },
  { id: 'OTHER', label: 'Góp ý chung' }
];

const MODULE_OPTIONS = [
  'Đăng nhập & Xác thực',
  'Tổng quan & Bảng tin',
  'Quản lý Học viên',
  'Quản lý Học tập & Sổ điểm',
  'Lịch công tác chủ nhiệm',
  'Thời khóa biểu & Báo bài',
  'Khảo sát học tập',
  'Rèn luyện & Kỷ luật',
  'Nhịp cầu Phụ huynh',
  'Cây Nguyệt Quế & Thi đua',
  'AI Cố vấn / AI GVCN',
  'Báo cáo & Thống kê',
  'Cài đặt không gian lớp',
  'Khác'
];

export const FeedbackSupportModal: React.FC<FeedbackSupportModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'ticket'
}) => {
  const [activeTab, setActiveTab] = useState<'ticket' | 'feedback' | 'suggestion' | 'history'>(defaultTab);
  const currentUser = authService.getCurrentUser();

  // Ticket Form
  const [ticketTitle, setTicketTitle] = useState('');
  const [ticketCategory, setTicketCategory] = useState<SupportTicketCategory>('LOGIN');
  const [ticketPriority, setTicketPriority] = useState<SupportTicketPriority>('MEDIUM');
  const [ticketModule, setTicketModule] = useState(MODULE_OPTIONS[0]);
  const [ticketDesc, setTicketDesc] = useState('');
  const [ticketEmail, setTicketEmail] = useState('');
  const [ticketPhone, setTicketPhone] = useState('');
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);

  // Feedback Form
  const [rating, setRating] = useState<number>(5);
  const [feedbackCategory, setFeedbackCategory] = useState<FeedbackCategory>('USABILITY');
  const [feedbackModule, setFeedbackModule] = useState(MODULE_OPTIONS[1]);
  const [feedbackContent, setFeedbackContent] = useState('');
  const [isFeedbackAnonymous, setIsFeedbackAnonymous] = useState(false);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  // Suggestion Form
  const [suggTitle, setSuggTitle] = useState('');
  const [suggModule, setSuggModule] = useState(MODULE_OPTIONS[0]);
  const [suggContent, setSuggContent] = useState('');
  const [isSuggAnonymous, setIsSuggAnonymous] = useState(false);
  const [isSubmittingSugg, setIsSubmittingSugg] = useState(false);

  // History
  const [myTickets, setMyTickets] = useState<SupportTicket[]>([]);
  const [myFeedbacks, setMyFeedbacks] = useState<UserFeedback[]>([]);
  const [selectedTicketDetail, setSelectedTicketDetail] = useState<SupportTicket | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Toast
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
      loadMyHistory();
    }
  }, [isOpen, defaultTab]);

  const loadMyHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const [tickets, feedbacks] = await Promise.all([
        supportService.fetchMyTickets(),
        supportService.fetchMyFeedbacks()
      ]);
      setMyTickets(tickets);
      setMyFeedbacks(feedbacks);
    } catch (err) {
      console.error('Error loading history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketTitle.trim() || !ticketDesc.trim()) {
      setErrorMessage('Vui lòng nhập đầy đủ tiêu đề và nội dung yêu cầu.');
      return;
    }
    setIsSubmittingTicket(true);
    setErrorMessage(null);

    const res = await supportService.submitTicket({
      title: ticketTitle.trim(),
      description: ticketDesc.trim(),
      category: ticketCategory,
      priority: ticketPriority,
      relatedModule: ticketModule,
      userEmail: ticketEmail.trim() || undefined,
      userPhone: ticketPhone.trim() || undefined
    });

    setIsSubmittingTicket(false);
    if (res.success) {
      setSuccessMessage(res.message);
      setTicketTitle('');
      setTicketDesc('');
      loadMyHistory();
      setTimeout(() => setSuccessMessage(null), 5000);
      setActiveTab('history');
    } else {
      setErrorMessage(res.message);
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackContent.trim()) {
      setErrorMessage('Vui lòng nhập nội dung góp ý.');
      return;
    }
    setIsSubmittingFeedback(true);
    setErrorMessage(null);

    const res = await supportService.submitFeedback({
      type: 'RATING_FEEDBACK',
      rating,
      category: feedbackCategory,
      relatedModule: feedbackModule,
      content: feedbackContent.trim(),
      isAnonymous: isFeedbackAnonymous
    });

    setIsSubmittingFeedback(false);
    if (res.success) {
      setSuccessMessage(res.message);
      setFeedbackContent('');
      loadMyHistory();
      setTimeout(() => setSuccessMessage(null), 5000);
      setActiveTab('history');
    } else {
      setErrorMessage(res.message);
    }
  };

  const handleSuggestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggTitle.trim() || !suggContent.trim()) {
      setErrorMessage('Vui lòng nhập tiêu đề và mô tả đề xuất chức năng.');
      return;
    }
    setIsSubmittingSugg(true);
    setErrorMessage(null);

    const res = await supportService.submitFeedback({
      type: 'FEATURE_SUGGESTION',
      category: 'FEATURE',
      relatedModule: suggModule,
      title: suggTitle.trim(),
      content: suggContent.trim(),
      isAnonymous: isSuggAnonymous
    });

    setIsSubmittingSugg(false);
    if (res.success) {
      setSuccessMessage(res.message);
      setSuggTitle('');
      setSuggContent('');
      loadMyHistory();
      setTimeout(() => setSuccessMessage(null), 5000);
      setActiveTab('history');
    } else {
      setErrorMessage(res.message);
    }
  };

  if (!isOpen) return null;

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'NEW':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">Mới tiếp nhận</span>;
      case 'PROCESSING':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">Đang xử lý</span>;
      case 'RESPONDED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">Đã phản hồi</span>;
      case 'RESOLVED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">Đã giải quyết</span>;
      case 'CLOSED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">Đã đóng</span>;
      case 'UNDER_REVIEW':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">Đang xem xét</span>;
      case 'APPROVED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-800">Đã duyệt</span>;
      case 'IN_DEVELOPMENT':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-800">Đang phát triển</span>;
      case 'IMPLEMENTED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">Đã triển khai</span>;
      case 'REJECTED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">Không thực hiện</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">{status}</span>;
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[99999] overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-start sm:items-center justify-center p-2 sm:p-4 md:p-6 py-4 sm:py-6 animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col my-auto max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-xs">
              <HelpCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Trung tâm Hỗ trợ & Đóng góp Ý kiến</h2>
              <p className="text-xs text-blue-100 font-medium">
                Kênh tiếp nhận hỗ trợ kỹ thuật, đánh giá trải nghiệm & đề xuất tính năng
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50/75 px-4 pt-2 gap-1 overflow-x-auto shrink-0">
          <button
            onClick={() => { setActiveTab('ticket'); setSelectedTicketDetail(null); }}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-t-xl transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'ticket'
                ? 'bg-white text-blue-600 border-t-2 border-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            Yêu cầu Hỗ trợ
          </button>
          <button
            onClick={() => { setActiveTab('feedback'); setSelectedTicketDetail(null); }}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-t-xl transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'feedback'
                ? 'bg-white text-blue-600 border-t-2 border-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
            }`}
          >
            <Star className="w-4 h-4" />
            Đánh giá & Góp ý
          </button>
          <button
            onClick={() => { setActiveTab('suggestion'); setSelectedTicketDetail(null); }}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-t-xl transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'suggestion'
                ? 'bg-white text-blue-600 border-t-2 border-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
            }`}
          >
            <Lightbulb className="w-4 h-4" />
            Đề xuất Tính năng
          </button>
          <button
            onClick={() => { setActiveTab('history'); setSelectedTicketDetail(null); loadMyHistory(); }}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-t-xl transition-all whitespace-nowrap ml-auto cursor-pointer ${
              activeTab === 'history'
                ? 'bg-white text-blue-600 border-t-2 border-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
            }`}
          >
            <Clock className="w-4 h-4" />
            Lịch sử của tôi ({myTickets.length + myFeedbacks.length})
          </button>
        </div>

        {/* Alerts */}
        {successMessage && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2 text-xs sm:text-sm shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2 text-xs sm:text-sm shrink-0">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0 space-y-4 text-slate-800 overscroll-contain pb-8 sm:pb-10">
          {/* 1. SUPPORT TICKET TAB */}
          {activeTab === 'ticket' && (
            <form onSubmit={handleTicketSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Tiêu đề yêu cầu hỗ trợ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Cần khôi phục mật khẩu, không xem được sổ điểm..."
                  value={ticketTitle}
                  onChange={(e) => setTicketTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Loại vấn đề <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={ticketCategory}
                    onChange={(e) => setTicketCategory(e.target.value as SupportTicketCategory)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  >
                    {SUPPORT_CATEGORIES.map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Mức độ ưu tiên
                  </label>
                  <select
                    value={ticketPriority}
                    onChange={(e) => setTicketPriority(e.target.value as SupportTicketPriority)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  >
                    <option value="LOW">Thấp (Tìm hiểu / Hướng dẫn)</option>
                    <option value="MEDIUM">Bình thường (Cần hỗ trợ sớm)</option>
                    <option value="HIGH">Cao (Ảnh hưởng tiến độ)</option>
                    <option value="URGENT">Khẩn cấp (Không thể truy cập)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Phân hệ / Module liên quan
                </label>
                <select
                  value={ticketModule}
                  onChange={(e) => setTicketModule(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                >
                  {MODULE_OPTIONS.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Mô tả chi tiết vấn đề <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Mô tả cụ thể trường hợp bạn gặp phải, thông báo lỗi (nếu có) để Ban Quản trị xử lý nhanh nhất..."
                  value={ticketDesc}
                  onChange={(e) => setTicketDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Số điện thoại liên hệ (Tùy chọn)
                  </label>
                  <input
                    type="text"
                    placeholder="0988 xxx xxx"
                    value={ticketPhone}
                    onChange={(e) => setTicketPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Email nhận kết quả (Tùy chọn)
                  </label>
                  <input
                    type="email"
                    placeholder="email@vidu.com"
                    value={ticketEmail}
                    onChange={(e) => setTicketEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="pt-3 pb-2 border-t border-slate-100 flex items-center justify-end gap-3 sticky bottom-0 bg-white/95 backdrop-blur-xs -mx-4 sm:-mx-6 px-4 sm:px-6 z-10 shadow-xs">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTicket}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingTicket ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Đang gửi yêu cầu...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Gửi yêu cầu hỗ trợ
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* 2. FEEDBACK & RATING TAB */}
          {activeTab === 'feedback' && (
            <form onSubmit={handleFeedbackSubmit} className="space-y-4">
              {/* Star Rating */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Đánh giá mức độ hài lòng về hệ thống
                </label>
                <div className="flex justify-center items-center gap-2 py-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="p-1.5 transition-transform hover:scale-125 focus:outline-hidden"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          star <= rating
                            ? 'text-amber-400 fill-amber-400 drop-shadow-xs'
                            : 'text-slate-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <p className="text-xs font-semibold text-slate-600 mt-1">
                  {rating === 1 && '⭐ 1/5: Rất không hài lòng'}
                  {rating === 2 && '⭐⭐ 2/5: Chưa hài lòng, cần cải thiện'}
                  {rating === 3 && '⭐⭐⭐ 3/5: Bình thường, tạm ổn'}
                  {rating === 4 && '⭐⭐⭐⭐ 4/5: Hài lòng & Tiện ích'}
                  {rating === 5 && '⭐⭐⭐⭐⭐ 5/5: Rất tuyệt vời, xuất sắc!'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Phân loại góp ý <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={feedbackCategory}
                    onChange={(e) => setFeedbackCategory(e.target.value as FeedbackCategory)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  >
                    {FEEDBACK_CATEGORIES.map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Phân hệ / Module liên quan
                  </label>
                  <select
                    value={feedbackModule}
                    onChange={(e) => setFeedbackModule(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  >
                    {MODULE_OPTIONS.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Ý kiến đóng góp & Cảm nhận của bạn <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Chia sẻ trải nghiệm, những điểm bạn thích hoặc các chi tiết cần cải tiến để phục vụ lớp tốt hơn..."
                  value={feedbackContent}
                  onChange={(e) => setFeedbackContent(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all resize-none"
                />
              </div>

              <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <input
                  type="checkbox"
                  id="anonymousFeedback"
                  checked={isFeedbackAnonymous}
                  onChange={(e) => setIsFeedbackAnonymous(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded-sm border-slate-300 focus:ring-blue-500"
                />
                <label htmlFor="anonymousFeedback" className="text-xs font-medium text-slate-700 cursor-pointer">
                  🔒 Gửi ẩn danh (Không hiển thị danh tính cá nhân trên báo cáo phản hồi)
                </label>
              </div>

              <div className="pt-3 pb-2 border-t border-slate-100 flex items-center justify-end gap-3 sticky bottom-0 bg-white/95 backdrop-blur-xs -mx-4 sm:-mx-6 px-4 sm:px-6 z-10 shadow-xs">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingFeedback}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingFeedback ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Đang gửi...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Gửi đánh giá & Góp ý
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* 3. FEATURE SUGGESTION TAB */}
          {activeTab === 'suggestion' && (
            <form onSubmit={handleSuggestionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Tên tính năng bạn muốn có <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Tôi muốn web/app có thêm chức năng..."
                  value={suggTitle}
                  onChange={(e) => setSuggTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Phân hệ / Module đề xuất
                </label>
                <select
                  value={suggModule}
                  onChange={(e) => setSuggModule(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                >
                  {MODULE_OPTIONS.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Mô tả chi tiết ý tưởng & Lợi ích mang lại <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Mô tả chức năng hoạt động như thế nào, phục vụ công việc gì của GVCN, Học sinh hoặc Phụ huynh..."
                  value={suggContent}
                  onChange={(e) => setSuggContent(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all resize-none"
                />
              </div>

              <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <input
                  type="checkbox"
                  id="anonymousSugg"
                  checked={isSuggAnonymous}
                  onChange={(e) => setIsSuggAnonymous(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded-sm border-slate-300 focus:ring-blue-500"
                />
                <label htmlFor="anonymousSugg" className="text-xs font-medium text-slate-700 cursor-pointer">
                  🔒 Đề xuất ẩn danh
                </label>
              </div>

              <div className="pt-3 pb-2 border-t border-slate-100 flex items-center justify-end gap-3 sticky bottom-0 bg-white/95 backdrop-blur-xs -mx-4 sm:-mx-6 px-4 sm:px-6 z-10 shadow-xs">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSugg}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingSugg ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Đang gửi...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Gửi đề xuất tính năng
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* 4. HISTORY TAB */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              {isLoadingHistory ? (
                <div className="py-12 text-center text-slate-500 text-sm flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Đang tải lịch sử hỗ trợ & phản hồi...
                </div>
              ) : myTickets.length === 0 && myFeedbacks.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-700">Bạn chưa có yêu cầu hỗ trợ hoặc phản hồi nào</p>
                  <p className="text-xs text-slate-500 mt-1">Các yêu cầu và góp ý bạn gửi sẽ được lưu trữ và hiển thị tiến độ tại đây.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Tickets List */}
                  {myTickets.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                        Yêu cầu hỗ trợ kỹ thuật ({myTickets.length})
                      </h3>
                      <div className="space-y-2.5">
                        {myTickets.map(t => (
                          <div
                            key={t.id}
                            className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl hover:border-blue-300 transition-all text-xs"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="font-mono font-bold text-blue-700 mr-2">{t.ticketCode}</span>
                                <span className="font-semibold text-slate-900 text-sm">{t.title}</span>
                              </div>
                              {renderStatusBadge(t.status)}
                            </div>

                            <p className="text-slate-600 mt-1 line-clamp-2">{t.description}</p>

                            <div className="flex items-center gap-3 mt-2 text-slate-500">
                              <span>Phân loại: <b>{t.category}</b></span>
                              <span>Module: <b>{t.relatedModule || 'Chung'}</b></span>
                              <span>Ngày gửi: {new Date(t.createdAt).toLocaleDateString('vi-VN')}</span>
                            </div>

                            {t.adminResponse && (
                              <div className="mt-2.5 p-2.5 bg-blue-50/80 border-l-4 border-blue-600 rounded-r-lg text-slate-800">
                                <p className="font-semibold text-blue-900 flex items-center gap-1">
                                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                                  Phản hồi từ Ban Quản trị:
                                </p>
                                <p className="mt-0.5 text-slate-700">{t.adminResponse}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Feedbacks List */}
                  {myFeedbacks.length > 0 && (
                    <div className="pt-2">
                      <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5 text-amber-500" />
                        Đánh giá & Đề xuất của bạn ({myFeedbacks.length})
                      </h3>
                      <div className="space-y-2.5">
                        {myFeedbacks.map(f => (
                          <div
                            key={f.id}
                            className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl hover:border-amber-300 transition-all text-xs"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                {f.type === 'FEATURE_SUGGESTION' ? (
                                  <span className="px-2 py-0.5 bg-purple-100 text-purple-800 font-semibold rounded-md">💡 Đề xuất tính năng</span>
                                ) : (
                                  <div className="flex items-center text-amber-500 font-bold">
                                    <Star className="w-3.5 h-3.5 fill-amber-400 mr-1" />
                                    {f.rating ? `${f.rating}/5` : 'Góp ý'}
                                  </div>
                                )}
                                <span className="font-semibold text-slate-900 text-sm">{f.title || f.category}</span>
                              </div>
                              {renderStatusBadge(f.status)}
                            </div>

                            <p className="text-slate-600 mt-1 line-clamp-2">{f.content}</p>

                            <div className="flex items-center gap-3 mt-2 text-slate-500">
                              <span>Module: <b>{f.relatedModule || 'Chung'}</b></span>
                              <span>Ngày gửi: {new Date(f.createdAt).toLocaleDateString('vi-VN')}</span>
                            </div>

                            {f.adminNotes && (
                              <div className="mt-2.5 p-2 bg-indigo-50 border-l-4 border-indigo-600 rounded-r-lg text-slate-800">
                                <p className="font-semibold text-indigo-900">Ghi chú từ BQT:</p>
                                <p className="mt-0.5 text-slate-700">{f.adminNotes}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
