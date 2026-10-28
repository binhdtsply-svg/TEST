/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  ShieldCheck,
  Share2,
  Copy,
  Check,
  LogIn,
  ArrowLeft,
  Calendar,
  User,
  HelpCircle,
  FileText,
  AlertCircle,
  ExternalLink,
  Layers,
  Sparkles,
  Image as ImageIcon
} from 'lucide-react';
import { publicShareService, PublicSharedResource, ShareResolveResult } from '../../services/PublicShareService';
import { SurveySection, SurveyQuestion } from '../../types';

interface PublicShareViewProps {
  shareToken: string;
  onClose?: () => void;
  onLoginClick?: () => void;
}

export const PublicShareView: React.FC<PublicShareViewProps> = ({
  shareToken,
  onClose,
  onLoginClick
}) => {
  const [resolveResult, setResolveResult] = useState<ShareResolveResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    try {
      const res = publicShareService.resolveShare(shareToken);
      setResolveResult(res);
    } catch (e: any) {
      setResolveResult({
        status: 'NOT_FOUND',
        message: e?.message || 'Lỗi khi tải nội dung chia sẻ.'
      });
    } finally {
      setIsLoading(false);
    }
  }, [shareToken]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleGoToLogin = () => {
    if (onLoginClick) {
      onLoginClick();
    } else {
      window.location.hash = '#overview';
      window.location.reload();
    }
  };

  const handleReturnHome = () => {
    if (onClose) {
      onClose();
    } else {
      window.location.hash = '#overview';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-800">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center max-w-md w-full space-y-4">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center animate-pulse">
            <GraduationCap className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Đang tải nội dung chia sẻ...</h3>
          <p className="text-xs text-slate-500">Vui lòng đợi trong giây lát khi hệ thống xác thực liên kết.</p>
        </div>
      </div>
    );
  }

  if (!resolveResult || resolveResult.status !== 'SUCCESS' || !resolveResult.resource) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-800">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center max-w-lg w-full space-y-6">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertCircle className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-extrabold text-slate-900">Liên kết chia sẻ không còn khả dụng</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              {resolveResult?.message ||
                'Nội dung này có thể đã bị xóa, lưu trữ hoặc thu hồi bởi Giáo viên chủ nhiệm.'}
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={handleGoToLogin}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition-all cursor-pointer shadow-xs"
            >
              <LogIn className="h-4 w-4" />
              <span>Đăng nhập hệ thống</span>
            </button>
            <button
              onClick={handleReturnHome}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer shadow-xs"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Về trang chủ</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const resource = resolveResult.resource;
  const isSurvey = resource.resourceType === 'survey';
  const surveySections: SurveySection[] = resource.metadata?.sections || [];

  return (
    <div className="min-h-screen bg-slate-50/80 font-sans text-slate-800 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-4 sm:px-6 py-3.5 shadow-xs">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-xs">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-slate-900 tracking-tight">
                  KHÔNG GIAN CHỦ NHIỆM SỐ
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                  <ShieldCheck className="h-3 w-3 text-blue-600" />
                  <span>Bản xem công khai</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                {resource.className || 'Lớp học'} • Năm học {resource.schoolYear || '2025 - 2026'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer shadow-xs"
              title="Sao chép liên kết chia sẻ"
            >
              {copiedLink ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Đã sao chép!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Sao chép link</span>
                </>
              )}
            </button>

            <button
              onClick={handleGoToLogin}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-blue-700 transition-all cursor-pointer shadow-xs"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Đăng nhập</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Main Resource Card */}
        <article className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
          {/* Header metadata */}
          <div className="border-b border-slate-100 pb-5 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 border border-indigo-200">
                {isSurvey ? '📋 BÀI KHẢO SÁT' : resource.resourceType === 'activity' ? '🏆 HOẠT ĐỘNG LỚP' : '📢 BẢNG TIN LỚP HỌC'}
              </span>
              {resource.tags && resource.tags.map((tag, idx) => (
                <span key={idx} className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                  {tag}
                </span>
              ))}
            </div>

            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-snug">
              {resource.title}
            </h1>

            <div className="flex items-center gap-4 text-xs text-slate-500 font-medium flex-wrap pt-1">
              <span className="inline-flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-slate-400" />
                <span>Người tạo: <b>{resource.authorName || 'GVCN'}</b></span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span>Thời gian: <b>{new Date(resource.createdAt).toLocaleDateString('vi-VN')}</b></span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Xác thực an toàn</span>
              </span>
            </div>
          </div>

          {/* Body Content */}
          {resource.content && (
            <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line space-y-2">
              {resource.content}
            </div>
          )}

          {/* Media Images if any */}
          {resource.mediaUrls && resource.mediaUrls.length > 0 && (
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon className="h-4 w-4 text-blue-600" />
                <span>Hình ảnh đính kèm ({resource.mediaUrls.length})</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {resource.mediaUrls.map((url, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedImage(url)}
                    className="group relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100 cursor-pointer aspect-video"
                  >
                    <img
                      src={url}
                      alt={`Đính kèm ${idx + 1}`}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                      Nhấn để phóng to
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* If it's a Survey: Render rich section-by-section read-only view */}
          {isSurvey && surveySections.length > 0 && (
            <div className="space-y-6 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between rounded-xl bg-blue-50/70 p-3.5 border border-blue-100">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                  <Layers className="h-4 w-4 text-blue-600" />
                  <span>Cấu trúc phiếu khảo sát: {surveySections.length} phần, {resource.metadata?.totalQuestions || 0} câu hỏi</span>
                </div>
                <span className="text-[11px] font-medium text-blue-700">Chế độ xem trước</span>
              </div>

              <div className="space-y-6">
                {surveySections.map((section, sIdx) => (
                  <div
                    key={section.id || sIdx}
                    className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 space-y-4"
                  >
                    <div className="border-b border-slate-200/80 pb-3">
                      <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-600 text-[11px] font-bold text-white">
                          {sIdx + 1}
                        </span>
                        <span>{section.title}</span>
                      </h3>
                      {section.description && (
                        <p className="text-xs text-slate-500 mt-1 pl-7">{section.description}</p>
                      )}
                    </div>

                    <div className="space-y-4 pl-0 sm:pl-7">
                      {(section.questions || []).map((q: SurveyQuestion, qIdx: number) => (
                        <div
                          key={q.id || qIdx}
                          className="rounded-lg border border-slate-200/70 bg-white p-4 space-y-2 shadow-2xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-bold text-slate-800">
                              Câu {qIdx + 1}: {q.title}
                              {q.required && <span className="text-rose-500 font-bold ml-1">*</span>}
                            </span>
                            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 shrink-0">
                              {q.type === 'SINGLE_CHOICE'
                                ? 'Trắc nghiệm 1 lựa chọn'
                                : q.type === 'MULTI_CHOICE'
                                ? 'Nhiều lựa chọn'
                                : q.type === 'LONG_TEXT'
                                ? 'Tự luận'
                                : 'Trả lời ngắn'}
                            </span>
                          </div>

                          {/* Options if choice question */}
                          {(q.type === 'SINGLE_CHOICE' || q.type === 'MULTI_CHOICE') && q.options && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                              {q.options.map((opt, optIdx) => (
                                <div
                                  key={optIdx}
                                  className="flex items-center gap-2 rounded-md bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 border border-slate-100"
                                >
                                  <div
                                    className={`h-3 w-3 rounded-${q.type === 'SINGLE_CHOICE' ? 'full' : 'sm'} border border-slate-300 bg-white shrink-0`}
                                  />
                                  <span>{opt}</span>
                                </div>
                              ))}
                              {q.allowOther && (
                                <div className="flex items-center gap-2 rounded-md bg-slate-50 px-2.5 py-1.5 text-xs text-slate-500 italic border border-slate-100">
                                  <span>Khác (tự nhập)...</span>
                                </div>
                              )}
                            </div>
                          )}

                          {q.type === 'SHORT_TEXT' && (
                            <div className="rounded-md border border-dashed border-slate-200 bg-slate-50/50 p-2 text-xs text-slate-400 italic">
                              Học sinh nhập câu trả lời ngắn...
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Responder login CTA */}
              <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 p-6 text-center space-y-3">
                <div className="mx-auto h-10 w-10 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h4 className="text-sm font-extrabold text-blue-950">
                  Bạn là Học sinh lớp {resource.className || '12A1'}?
                </h4>
                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  Đăng nhập vào tài khoản Không Gian Chủ Nhiệm Số để điền và nộp câu trả lời cho bài khảo sát này.
                </p>
                <button
                  onClick={handleGoToLogin}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-all cursor-pointer shadow-xs"
                >
                  <LogIn className="h-4 w-4" />
                  <span>Đăng nhập để làm khảo sát</span>
                </button>
              </div>
            </div>
          )}
        </article>

        {/* Security & Privacy Guarantee Banner */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex items-start gap-3 text-xs text-slate-600">
          <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h5 className="font-bold text-slate-900">Bảo mật thông tin & An toàn dữ liệu</h5>
            <p className="text-[11px] leading-relaxed text-slate-500">
              Trang xem công khai này được mã hóa an toàn và chỉ hiển thị đúng nội dung được chia sẻ bởi Giáo viên Chủ nhiệm. Người xem công khai không thể truy cập vào danh sách học sinh, điểm số học tập, hồ sơ tâm lý hay các chức năng quản trị lớp học.
            </p>
          </div>
        </div>
      </main>

      {/* Image Modal Lightbox */}
      {selectedImage && (
        <div
          onClick={() => setSelectedImage(null)}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs cursor-pointer"
        >
          <div className="max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-white p-2">
            <img
              src={selectedImage}
              alt="Phóng to"
              className="max-h-[85vh] w-auto rounded-xl object-contain"
            />
          </div>
        </div>
      )}

      {/* Simple Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 px-6 text-center text-[11px] text-slate-400">
        Không Gian Chủ Nhiệm Số © {new Date().getFullYear()} • Nền tảng Quản trị & Đồng hành Học sinh Lớp Chủ Nhiệm
      </footer>
    </div>
  );
};
