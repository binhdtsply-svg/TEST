/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Share2,
  Copy,
  Check,
  ExternalLink,
  MessageCircle,
  ShieldCheck,
  AlertCircle,
  Mail
} from 'lucide-react';
import { SharePayload, UserAccount } from '../../types';
import { authService } from '../../services/AuthService';
import {
  nativeShareProvider,
  copyLinkProvider,
  zaloShareProvider,
  zaloClassService,
  formatSafeShareMessage,
  getOrCreateShareUrl
} from '../../services/ShareService';

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  payload?: SharePayload;
  currentUser?: UserAccount;
  title?: string;
  content?: string;
}

export const ShareDialog: React.FC<ShareDialogProps> = ({
  isOpen,
  onClose,
  payload,
  currentUser,
  title,
  content
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedZalo, setCopiedZalo] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const effectiveUser = currentUser || authService.getCurrentUser();
  const effectivePayload: SharePayload = payload || {
    id: `share-${Date.now()}`,
    type: 'post',
    title: title || 'Chia sẻ thông tin lớp',
    summary: content?.slice(0, 150) || 'Nội dung chia sẻ từ Không Gian Chủ Nhiệm Số',
    url: window.location.href,
    parentVisible: true
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const shareUrl = getOrCreateShareUrl(effectivePayload, effectiveUser);
  const zaloSettings = zaloClassService.getSettings();
  const formattedShareText = formatSafeShareMessage(effectivePayload, shareUrl);

  const handleCopyLink = async () => {
    const res = await copyLinkProvider.share(effectivePayload, effectiveUser);
    if (res.success) {
      setCopiedLink(true);
      setActionMessage('Đã sao chép liên kết vào bộ nhớ tạm!');
      setTimeout(() => {
        setCopiedLink(false);
        setActionMessage(null);
      }, 2500);
    }
  };

  const handleShareZalo = async () => {
    const res = await zaloShareProvider.share(payload, currentUser);
    setActionMessage(res.message);
    setCopiedZalo(true);
    setTimeout(() => {
      setCopiedZalo(false);
      setActionMessage(null);
    }, 3000);
  };

  const handleNativeShare = async () => {
    const res = await nativeShareProvider.share(payload, currentUser);
    setActionMessage(res.message);
  };

  const handleOpenZaloGroup = () => {
    if (zaloSettings.groupLink) {
      window.open(zaloSettings.groupLink, '_blank');
    }
  };

  const handleShareEmail = () => {
    const subject = encodeURIComponent(payload.title || 'Thông tin từ Lớp học');
    const body = encodeURIComponent(formattedShareText);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Chia sẻ thông tin lớp</h3>
              <p className="text-xs text-slate-500">Định dạng chuẩn 4 dòng, nhanh chóng và bảo mật</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {/* Formatted 4-line preview */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
              Nội dung thông điệp chuẩn (4 dòng):
            </label>
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 font-mono text-xs text-slate-800 whitespace-pre-line leading-relaxed select-all">
              {formattedShareText}
            </div>
          </div>

          {/* Privacy Note */}
          {payload.isSensitive ? (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 leading-relaxed">
                <strong>Bảo mật thông tin:</strong> Bản chia sẻ ngoài đã tự động rút gọn để bảo vệ dữ liệu cá nhân học sinh.
              </p>
            </div>
          ) : (
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-xs text-emerald-800 leading-relaxed">
                Nội dung an toàn, sẵn sàng lan tỏa tới tập thể lớp và phụ huynh.
              </p>
            </div>
          )}

          {/* Action Message Toast */}
          {actionMessage && (
            <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs font-semibold flex items-center justify-between animate-fade-in">
              <span>{actionMessage}</span>
              <button onClick={() => setActionMessage(null)} className="text-blue-500 hover:text-blue-700">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Actions List */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Tùy chọn chia sẻ
            </label>

            {/* Option 1: Copy Share URL */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 text-xs bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 focus:outline-hidden select-all"
              />
              <button
                onClick={handleCopyLink}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs shrink-0 cursor-pointer ${
                  copiedLink
                    ? 'bg-emerald-600 text-white'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Đã chép link
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Sao chép link
                  </>
                )}
              </button>
            </div>

            {/* Option 2: Zalo Share (Copy 4 lines & open) */}
            <button
              onClick={handleShareZalo}
              className="w-full p-3 rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 text-blue-900 flex items-center justify-between transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
                  Z
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-900 group-hover:text-blue-700">
                    Chia sẻ vào Zalo (Chuẩn 4 dòng)
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Tự động sao chép văn bản kèm đường dẫn bảo mật để gửi nhóm Zalo
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-blue-600 bg-white px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs">
                {copiedZalo ? 'Đã sao chép!' : 'Chép & Gửi Zalo'}
              </span>
            </button>

            {/* Option 3: Email Share */}
            <button
              onClick={handleShareEmail}
              className="w-full p-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 flex items-center justify-between transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-black text-sm">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-900">
                    Gửi qua Email
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Mở trình soạn thảo email với nội dung dặn dò đầy đủ
                  </p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-400" />
            </button>

            {/* Option 4: Open Zalo Group */}
            {zaloSettings.groupLink && (
              <button
                onClick={handleOpenZaloGroup}
                className="w-full p-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 flex items-center justify-between transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-sm">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-slate-900">
                      Mở nhóm Zalo lớp ({zaloSettings.classId})
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {zaloSettings.groupName}
                    </p>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-400" />
              </button>
            )}

            {/* Option 5: Native Share Sheet */}
            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button
                onClick={handleNativeShare}
                className="w-full py-2.5 px-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Mở bảng chia sẻ hệ thống (Thiết bị di động / Máy tính bảng)</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
