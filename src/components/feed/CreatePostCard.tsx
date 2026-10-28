/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Send,
  Image as ImageIcon,
  Paperclip,
  Smile,
  ShieldCheck,
  Eye,
  X,
  Sparkles,
  AlertCircle,
  Pin
} from 'lucide-react';
import { PostCategory, AttachedFile } from '../../types';
import { postService } from '../../services/PostService';
import { authService } from '../../services/AuthService';
import { fileStorageService } from '../../services/FileStorageService';
import { IconPicker } from '../common/IconPicker';

interface CreatePostCardProps {
  onPostCreated?: () => void;
}

export const CreatePostCard: React.FC<CreatePostCardProps> = ({ onPostCreated }) => {
  const currentUser = authService.getCurrentUser();
  const isTeacher = currentUser.role === 'TEACHER';

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<PostCategory>('Thông báo');
  const [customBadgeIcon, setCustomBadgeIcon] = useState<string>('📢');
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const [parentVisible, setParentVisible] = useState(true);
  const [pinnedToOverview, setPinnedToOverview] = useState(false);
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      const uploaded = await fileStorageService.uploadLocalFile(files[i]);
      setAttachments(prev => [...prev, uploaded]);
    }
  };

  const handleCategoryChange = (cat: PostCategory) => {
    setCategory(cat);
    switch (cat) {
      case 'Thông báo': setCustomBadgeIcon('📢'); break;
      case 'Học tập': setCustomBadgeIcon('📚'); break;
      case 'Khen thưởng': setCustomBadgeIcon('🏆'); break;
      case 'Phong trào': setCustomBadgeIcon('🎉'); break;
      case 'Nhắc nhở': setCustomBadgeIcon('⏰'); break;
      default: setCustomBadgeIcon('📝');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setIsSubmitting(true);
    try {
      postService.createPost({
        authorId: currentUser.id,
        authorName: currentUser.name,
        authorAvatar: currentUser.avatar,
        authorRole: currentUser.role,
        title: title.trim(),
        content: content.trim(),
        category,
        customBadgeIcon,
        parentVisible,
        isPinned: pinnedToOverview,
        pinnedToOverview: pinnedToOverview,
        requiresApproval: !isTeacher,
        status: isTeacher ? 'approved' : 'pending',
        attachments: attachments.length > 0 ? attachments : undefined
      });

      setTitle('');
      setContent('');
      setAttachments([]);
      setPinnedToOverview(false);
      if (!isTeacher) {
        setSuccessMsg('Đã gửi bài đăng thành công! Bài viết đã chuyển vào mục "Chờ duyệt" của Giáo viên chủ nhiệm.');
        setTimeout(() => setSuccessMsg(null), 4000);
      }
      if (onPostCreated) onPostCreated();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs mb-6">
      {successMsg && (
        <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-bold text-emerald-800 animate-fade-in">
          {successMsg}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Author Avatar & Header */}
        <div className="flex items-center gap-3">
          <img
            src={currentUser.avatar}
            alt={currentUser.name}
            referrerPolicy="no-referrer"
            className="h-10 w-10 rounded-full object-cover ring-2 ring-blue-100"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800 truncate">{currentUser.name}</span>
              <span className="rounded-md bg-blue-50 px-2 py-0.2 text-[10px] font-bold text-blue-600 border border-blue-200">
                {currentUser.role === 'TEACHER' ? 'GVCN' : currentUser.role === 'CLASS_OFFICER' ? 'Ban cán sự' : 'Thành viên'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Đăng thông báo, dặn dò hoặc chia sẻ khoảnh khắc lớp</p>
          </div>
        </div>

        {/* Title Input */}
        <div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Tiêu đề bài đăng (VD: Thông báo Lịch học bù tuần tới)..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs font-bold text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-hidden"
            required
          />
        </div>

        {/* Content Area */}
        <div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Nội dung chi tiết dặn dò học sinh, thông tin bài tập hoặc sự kiện..."
            rows={3}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-hidden"
            required
          />
        </div>

        {/* Attachments preview */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {attachments.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-1.5 rounded-lg bg-blue-50 border border-blue-200 px-2.5 py-1 text-xs text-blue-800"
              >
                <Paperclip className="h-3 w-3 text-blue-600" />
                <span className="truncate max-w-[140px]">{file.name}</span>
                <button
                  type="button"
                  onClick={() => setAttachments(prev => prev.filter(f => f.id !== file.id))}
                  className="text-blue-500 hover:text-rose-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Categories, Custom Badge & Privacy controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Category Select */}
            <select
              value={category}
              onChange={(e) => handleCategoryChange(e.target.value as PostCategory)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-hidden hover:bg-slate-100"
            >
              <option value="Thông báo">📢 Thông báo</option>
              <option value="Học tập">📚 Học tập</option>
              <option value="Khen thưởng">🏆 Khen thưởng</option>
              <option value="Phong trào">🎉 Phong trào</option>
              <option value="Nhắc nhở">⏰ Nhắc nhở</option>
              <option value="Khác">📝 Khác</option>
            </select>

            {/* Custom Icon Picker Trigger */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsIconPickerOpen(!isIconPickerOpen)}
                className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                title="Đổi biểu tượng badge"
              >
                <span>{customBadgeIcon}</span>
                <Smile className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {isIconPickerOpen && (
                <div className="absolute top-full left-0 mt-2 z-50">
                  <IconPicker
                    selectedIcon={customBadgeIcon}
                    onSelect={(icon) => {
                      setCustomBadgeIcon(icon);
                      setIsIconPickerOpen(false);
                    }}
                    onClose={() => setIsIconPickerOpen(false)}
                  />
                </div>
              )}
            </div>

            {/* File Upload Trigger */}
            <label className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100">
              <ImageIcon className="h-3.5 w-3.5 text-blue-600" />
              <span>Đính kèm tệp / ảnh</span>
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
              />
            </label>
          </div>

          {/* Privacy Toggle, Pin to Overview & Submit */}
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-slate-600 hover:text-blue-600 transition-colors">
              <input
                type="checkbox"
                checked={parentVisible}
                onChange={(e) => setParentVisible(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <Eye className="h-3.5 w-3.5 text-slate-400" />
              <span>Cho Phụ huynh xem</span>
            </label>

            {(isTeacher || currentUser.role === 'CLASS_OFFICER' || (currentUser.role as any) === 'SUPER_ADMIN') && (
              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-700 hover:text-blue-600 transition-colors">
                <input
                  type="checkbox"
                  checked={pinnedToOverview}
                  onChange={(e) => setPinnedToOverview(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <Pin className="h-3.5 w-3.5 text-blue-500 fill-current" />
                <span>Ghim lên trang tổng quan</span>
              </label>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !title.trim() || !content.trim()}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-95 cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{isTeacher ? 'Đăng ngay' : 'Gửi bài đăng'}</span>
            </button>
          </div>
        </div>

        {!isTeacher && (
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 bg-amber-50/70 p-2 rounded-lg border border-amber-100">
            <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            <span>Bài đăng từ Học viên / Ban cán sự sẽ hiển thị sau khi Giáo viên chủ nhiệm duyệt.</span>
          </div>
        )}
      </form>
    </div>
  );
};
