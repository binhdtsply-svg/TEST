/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload, RotateCcw, Check, Camera } from 'lucide-react';
import { authService } from '../../services/AuthService';
import { fileStorageService } from '../../services/FileStorageService';

interface AvatarUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newUrl: string) => void;
}

export const AvatarUploadModal: React.FC<AvatarUploadModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const currentUser = authService.getCurrentUser();
  const [previewUrl, setPreviewUrl] = useState<string>(currentUser.avatar);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPreviewUrl(currentUser.avatar || '');
      setErrorMsg(null);
    }
  }, [isOpen, currentUser.avatar]);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setErrorMsg('Vui lòng chọn định dạng ảnh hợp lệ (JPG, PNG, WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Kích thước ảnh không được vượt quá 5MB.');
      return;
    }

    setIsProcessing(true);
    try {
      const uploaded = await fileStorageService.uploadLocalFile(file);
      setPreviewUrl(uploaded.url);
    } catch {
      setErrorMsg('Không thể tải ảnh lên. Vui lòng thử lại.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    if (previewUrl) {
      setIsProcessing(true);
      setErrorMsg(null);
      try {
        const res = await authService.updateCurrentUserAvatar(previewUrl);
        if (res.success) {
          if (onSuccess) onSuccess(previewUrl);
          onClose();
        } else {
          setErrorMsg(res.message || 'Lỗi khi lưu ảnh đại diện.');
        }
      } catch (err: any) {
        setErrorMsg(err?.message || 'Không thể lưu ảnh đại diện.');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleResetToDefault = async () => {
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      await authService.resetCurrentUserAvatar();
      const updated = authService.getCurrentUser();
      setPreviewUrl(updated.avatar);
      if (onSuccess) onSuccess(updated.avatar);
      onClose();
    } catch {
      setErrorMsg('Không thể đặt lại ảnh mặc định.');
    } finally {
      setIsProcessing(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-600 font-bold">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Thay Ảnh Đại Diện</h3>
              <p className="text-xs text-slate-500">
                Cập nhật ảnh cho {currentUser.name} ({currentUser.role === 'TEACHER' ? 'GVCN' : currentUser.role === 'CLASS_OFFICER' ? 'Ban cán sự' : currentUser.role === 'STUDENT' ? 'Học sinh' : 'Phụ huynh'})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Avatar Preview */}
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="relative group">
              <img
                src={previewUrl}
                alt="Avatar preview"
                referrerPolicy="no-referrer"
                className="h-28 w-28 rounded-full object-cover ring-4 ring-blue-500/20 shadow-md transition-all"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <Camera className="h-6 w-6" />
              </button>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Định dạng hỗ trợ: JPG, PNG, WEBP (Tối đa 5MB)
            </p>
          </div>

          {errorMsg && (
            <div className="rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-200 font-medium text-center">
              {errorMsg}
            </div>
          )}

          {/* Upload Input & Actions */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png, image/jpeg, image/webp, image/jpg"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="flex items-center justify-center gap-2 w-full rounded-xl border border-dashed border-blue-400 bg-blue-50/50 py-3 text-xs font-bold text-blue-700 hover:bg-blue-100/60 transition-colors cursor-pointer"
            >
              <Upload className="h-4 w-4" />
              <span>{isProcessing ? 'Đang xử lý ảnh...' : 'Chọn ảnh từ thiết bị của bạn'}</span>
            </button>

            <button
              type="button"
              onClick={handleResetToDefault}
              className="flex items-center justify-center gap-2 w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Dùng ảnh đại diện mặc định</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 border-t border-slate-200 bg-slate-50 px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isProcessing}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
          >
            <Check className="h-4 w-4" />
            <span>Lưu ảnh đại diện</span>
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
