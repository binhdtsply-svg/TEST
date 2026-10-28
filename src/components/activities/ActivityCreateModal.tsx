/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Plus,
  Calendar,
  Clock,
  MapPin,
  Image as ImageIcon,
  FileText,
  Upload,
  Paperclip,
  Trash2,
  Sparkles,
  Pin
} from 'lucide-react';
import { ActivityCategory, ActivityPost, AttachedFile, AlbumMediaItem, UserAccount } from '../../types';
import { activityService } from '../../services/ActivityService';

interface ActivityCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount;
  editingPost?: ActivityPost | null;
  onSuccess?: () => void;
}

const CATEGORIES: ActivityCategory[] = [
  'Phong trào',
  'Văn nghệ',
  'Thể thao',
  'Thi đua',
  'Tình nguyện',
  'Đoàn – Hội',
  'Ngoại khóa',
  'Tham quan',
  'Hướng nghiệp',
  'Sự kiện trường',
  'Khác'
];

export const ActivityCreateModal: React.FC<ActivityCreateModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  editingPost,
  onSuccess
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<ActivityCategory>('Phong trào');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('08:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [location, setLocation] = useState('');
  const [pinnedToOverview, setPinnedToOverview] = useState(false);

  // Registration Settings
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [registrationDeadline, setRegistrationDeadline] = useState('');
  const [maxParticipants, setMaxParticipants] = useState<number>(0);

  const [mediaItems, setMediaItems] = useState<AlbumMediaItem[]>([]);
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [imageUrlInput, setImageUrlInput] = useState('');

  useEffect(() => {
    if (editingPost) {
      setTitle(editingPost.title);
      setContent(editingPost.content);
      setCategory(editingPost.category);
      setStartDate(editingPost.startDate);
      setStartTime(editingPost.startTime || '08:00');
      setEndDate(editingPost.endDate || '');
      setEndTime(editingPost.endTime || '');
      setIsAllDay(editingPost.isAllDay || false);
      setLocation(editingPost.location || '');
      setPinnedToOverview(editingPost.pinnedToOverview || false);
      setRegistrationEnabled(editingPost.registrationEnabled !== false);
      setRegistrationDeadline(editingPost.registrationDeadline || '');
      setMaxParticipants(editingPost.maxParticipants || 0);
      setMediaItems(editingPost.media || []);
      setAttachments(editingPost.attachments || []);
    } else {
      setTitle('');
      setContent('');
      setCategory('Phong trào');
      setStartDate(new Date().toISOString().split('T')[0]);
      setStartTime('08:00');
      setEndDate('');
      setEndTime('');
      setIsAllDay(false);
      setLocation('');
      setPinnedToOverview(false);
      setRegistrationEnabled(true);
      setRegistrationDeadline('');
      setMaxParticipants(0);
      setMediaItems([]);
      setAttachments([]);
    }
  }, [editingPost, isOpen]);

  // Handle ESC key
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

  const handleAddImageUrl = () => {
    if (!imageUrlInput.trim()) return;
    setMediaItems((prev) => [
      ...prev,
      {
        type: 'image',
        url: imageUrlInput.trim(),
        caption: ''
      }
    ]);
    setImageUrlInput('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File, index) => {
      const isImg = file.type.startsWith('image/');
      const isVid = file.type.startsWith('video/');
      const isPdf = file.name.endsWith('.pdf');
      const isSheet = file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv');
      const isDoc = file.name.endsWith('.doc') || file.name.endsWith('.docx') || file.name.endsWith('.pptx');

      const url = URL.createObjectURL(file);

      if (isImg || isVid) {
        setMediaItems((prev) => [
          ...prev,
          {
            type: isVid ? 'video' : 'image',
            url,
            name: file.name,
            caption: file.name
          }
        ]);
      } else {
        setAttachments((prev) => [
          ...prev,
          {
            id: `att-act-${Date.now()}-${index}`,
            name: file.name,
            url,
            type: isPdf ? 'pdf' : isSheet ? 'sheet' : isDoc ? 'doc' : 'other',
            size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`
          }
        ]);
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    const imagesList = mediaItems.filter((m) => m.type === 'image').map((m) => m.url);

    if (editingPost) {
      activityService.updateActivity(
        editingPost.id,
        {
          title: title.trim(),
          content: content.trim(),
          category,
          startDate,
          startTime: isAllDay ? undefined : startTime,
          endDate: endDate || undefined,
          endTime: isAllDay ? undefined : endTime,
          isAllDay,
          location: location.trim() || undefined,
          media: mediaItems,
          images: imagesList,
          attachments,
          pinnedToOverview,
          registrationEnabled,
          registrationDeadline: registrationDeadline || undefined,
          maxParticipants: maxParticipants > 0 ? maxParticipants : undefined
        },
        currentUser
      );
    } else {
      activityService.createActivity(
        {
          title: title.trim(),
          content: content.trim(),
          category,
          startDate,
          startTime: isAllDay ? undefined : startTime,
          endDate: endDate || undefined,
          endTime: isAllDay ? undefined : endTime,
          isAllDay,
          location: location.trim() || undefined,
          media: mediaItems,
          images: imagesList,
          attachments,
          pinnedToOverview,
          registrationEnabled,
          registrationDeadline: registrationDeadline || undefined,
          maxParticipants: maxParticipants > 0 ? maxParticipants : undefined,
          authorId: currentUser.id,
          authorName: currentUser.name,
          authorAvatar: currentUser.avatar,
          authorRole: currentUser.role
        },
        currentUser
      );
    }

    if (onSuccess) onSuccess();
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                {editingPost ? 'Chỉnh sửa Hoạt động phong trào' : 'Tạo Hoạt động Phong trào Mới'}
              </h3>
              <p className="text-xs text-slate-500">
                Thông tin sự kiện, kế hoạch thi đua, phong trào tập thể lớp 11A1
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Title */}
          <div>
            <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider text-[11px]">
              Tên hoạt động / Chủ đề sự kiện <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Hội thi Kéo co truyền thống, Chiến dịch tình nguyện xanh..."
              className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-900 font-semibold focus:border-orange-500 focus:outline-hidden"
            />
          </div>

          {/* Category & Pinned */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider text-[11px]">
                Thể loại hoạt động
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ActivityCategory)}
                className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-900 font-bold bg-white focus:border-orange-500 focus:outline-hidden"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 pt-6">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={pinnedToOverview}
                  onChange={(e) => setPinnedToOverview(e.target.checked)}
                  className="rounded border-slate-300 text-orange-600 focus:ring-orange-500 h-4 w-4"
                />
                <span className="font-bold text-slate-700 flex items-center gap-1">
                  <Pin className="w-3.5 h-3.5 text-orange-500" />
                  Ghim lên Bảng tin Tổng quan
                </span>
              </label>
            </div>
          </div>

          {/* Activity Date and Time (Start & End) */}
          <div className="p-3.5 bg-orange-50/60 rounded-2xl border border-orange-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-orange-950 text-xs flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-orange-600" />
                Thời gian diễn ra hoạt động
              </span>

              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={isAllDay}
                  onChange={(e) => setIsAllDay(e.target.checked)}
                  className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                />
                <span>Cả ngày</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Start */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Bắt đầu <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-300 p-2 text-slate-900 bg-white"
                  />
                  {!isAllDay && (
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-24 rounded-xl border border-slate-300 p-2 text-slate-900 bg-white"
                    />
                  )}
                </div>
              </div>

              {/* End */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Kết thúc (Tùy chọn)
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-300 p-2 text-slate-900 bg-white"
                  />
                  {!isAllDay && (
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-24 rounded-xl border border-slate-300 p-2 text-slate-900 bg-white"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Địa điểm tổ chức
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="VD: Sân vận động trường, Hội trường A, Phòng học 11A1..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-slate-900 bg-white focus:border-orange-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Registration Settings Box */}
          <div className="p-3.5 bg-blue-50/60 rounded-2xl border border-blue-100 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={registrationEnabled}
                  onChange={(e) => setRegistrationEnabled(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <span className="font-bold text-blue-950 text-xs">
                  Mở cổng đăng ký tham gia cho học sinh
                </span>
              </label>
            </div>

            {registrationEnabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 animate-fade-in">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Hạn chót đăng ký (Tùy chọn)
                  </label>
                  <input
                    type="datetime-local"
                    value={registrationDeadline}
                    onChange={(e) => setRegistrationDeadline(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2 text-slate-900 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Giới hạn số lượng tối đa (0 = Không giới hạn)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={maxParticipants}
                    onChange={(e) => setMaxParticipants(Number(e.target.value))}
                    placeholder="0 (Toàn thể lớp)"
                    className="w-full rounded-xl border border-slate-300 p-2 text-slate-900 bg-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Content Description */}
          <div>
            <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider text-[11px]">
              Nội dung chi tiết & Kế hoạch triển khai <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Mô tả mục đích, nội dung, phân công công việc, thời gian tập trung và lưu ý..."
              className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-900 focus:border-orange-500 focus:outline-hidden leading-relaxed"
            />
          </div>

          {/* Attachments & Media */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5 uppercase tracking-wider text-[11px]">
              Ảnh minh họa & Tệp kế hoạch đính kèm
            </label>

            <div className="flex flex-wrap gap-2">
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-2 text-slate-700 hover:bg-slate-100 font-bold transition-colors">
                <Upload className="h-4 w-4 text-orange-600" />
                <span>Tải ảnh / video / tệp kế hoạch</span>
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  accept="image/*,video/*,.pdf,.xlsx,.xls,.doc,.docx"
                />
              </label>
            </div>

            {/* Quick URL input for images */}
            <div className="flex items-center gap-2 mt-2">
              <input
                type="text"
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
                placeholder="Hoặc dán URL ảnh trực tiếp..."
                className="flex-1 rounded-xl border border-slate-200 px-3 py-1.5 text-slate-700"
              />
              <button
                type="button"
                onClick={handleAddImageUrl}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
              >
                Thêm ảnh
              </button>
            </div>

            {/* Preview Selected Media */}
            {mediaItems.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-3">
                {mediaItems.map((item, idx) => (
                  <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-200 aspect-video bg-slate-900">
                    <img src={item.url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setMediaItems((prev) => prev.filter((_, i) => i !== idx))}
                      className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-md hover:bg-rose-600 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Preview Selected Attachments */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {attachments.map((file, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-800 rounded-xl text-xs font-bold border border-slate-200"
                  >
                    <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                    <span className="truncate max-w-[150px]">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-slate-400 hover:text-rose-500 ml-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>{editingPost ? 'CẬP NHẬT HOẠT ĐỘNG' : 'ĐĂNG HOẠT ĐỘNG'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
