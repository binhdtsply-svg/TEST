/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Image,
  Film,
  Paperclip,
  Trash2,
  ChevronUp,
  ChevronDown,
  Pin,
  Globe,
  Lock,
  Sparkles,
  AlertCircle,
  Plus,
  FileText
} from 'lucide-react';
import { AlbumPost, UserAccount, AttachedFile, AlbumMediaItem } from '../../types';
import { albumService } from '../../services/AlbumService';

import { classService } from '../../services/ClassService';

interface AlbumCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount;
  editingPost?: AlbumPost | null;
}

const PRESET_TAGS = ['#TapTheLop', '#NhoMaiThanhXuan', '#HocTapTot', '#HoiThao', '#VanNghe20-11', '#NgoaiKhoa', '#STEM'];

// Sample high-quality educational photo pool for quick adding / demo
const SAMPLE_PHOTOS = [
  'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80'
];

export const AlbumCreateModal: React.FC<AlbumCreateModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  editingPost
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [mediaItems, setMediaItems] = useState<AlbumMediaItem[]>([]);
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [parentVisible, setParentVisible] = useState(true);
  const [isPinned, setIsPinned] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingPost) {
      setTitle(editingPost.title || '');
      setContent(editingPost.content || editingPost.description || '');
      setTags(editingPost.tags || editingPost.hashtags || []);
      setMediaItems(
        editingPost.media && editingPost.media.length > 0
          ? editingPost.media
          : (editingPost.images || []).map(url => ({ type: 'image', url, name: 'Ảnh kỷ niệm' }))
      );
      setAttachments(editingPost.attachments || []);
      setParentVisible(editingPost.parentVisible !== undefined ? editingPost.parentVisible : true);
      setIsPinned(editingPost.isPinned || false);
    } else {
      setTitle('');
      setContent('');
      const defaultTag = `#Lop${(classService.getSettings().className || '12A1').replace(/\s+/g, '')}`;
      setTags([defaultTag]);
      setMediaItems([]);
      setAttachments([]);
      setParentVisible(true);
      setIsPinned(false);
    }
    setErrorMessage(null);
  }, [editingPost, isOpen]);

  if (!isOpen) return null;

  const photoCount = mediaItems.filter(m => m.type === 'image').length;
  const videoCount = mediaItems.filter(m => m.type === 'video').length;

  const handleAddSamplePhoto = () => {
    if (photoCount >= 15) {
      setErrorMessage('Đã đạt giới hạn tối đa 15 hình ảnh!');
      return;
    }
    const randomPhoto = SAMPLE_PHOTOS[Math.floor(Math.random() * SAMPLE_PHOTOS.length)];
    setMediaItems(prev => [
      ...prev,
      {
        type: 'image',
        url: randomPhoto,
        name: `Ảnh kỷ niệm ${prev.length + 1}`
      }
    ]);
    setErrorMessage(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (type === 'image') {
      if (photoCount + files.length > 15) {
        setErrorMessage(`Chỉ được tải lên tối đa 15 hình ảnh (bạn đang có ${photoCount} ảnh, chọn thêm ${files.length} ảnh).`);
        return;
      }

      Array.from(files).forEach((file: File) => {
        const reader = new FileReader();
        reader.onload = (loadEvt) => {
          if (loadEvt.target?.result) {
            setMediaItems(prev => [
              ...prev,
              {
                type: 'image',
                url: loadEvt.target!.result as string,
                name: file.name
              }
            ]);
          }
        };
        reader.readAsDataURL(file);
      });
    } else if (type === 'video') {
      if (videoCount >= 1 || files.length > 1) {
        setErrorMessage('Chỉ được đính kèm tối đa 1 video trong bài đăng!');
        return;
      }
      const file: File = files[0];
      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        if (loadEvt.target?.result) {
          setMediaItems(prev => [
            ...prev,
            {
              type: 'video',
              url: loadEvt.target!.result as string,
              name: file.name
            }
          ]);
        }
      };
      reader.readAsDataURL(file);
    }
    setErrorMessage(null);
  };

  const handleDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
      let docType: 'image' | 'pdf' | 'doc' | 'sheet' | 'video' | 'other' = 'doc';
      if (fileExt === 'pdf') docType = 'pdf';
      else if (['xls', 'xlsx', 'csv'].includes(fileExt)) docType = 'sheet';
      else if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(fileExt)) docType = 'image';
      else if (['mp4', 'webm', 'mov'].includes(fileExt)) docType = 'video';

      const newDoc: AttachedFile = {
        id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: file.name,
        url: URL.createObjectURL(file),
        size: `${(file.size / 1024).toFixed(0)} KB`,
        type: docType
      };
      setAttachments(prev => [...prev, newDoc]);
    });
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setMediaItems(prev => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index - 1];
      copy[index - 1] = temp;
      return copy;
    });
  };

  const handleMoveDown = (index: number) => {
    if (index === mediaItems.length - 1) return;
    setMediaItems(prev => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index + 1];
      copy[index + 1] = temp;
      return copy;
    });
  };

  const handleRemoveMedia = (index: number) => {
    setMediaItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleAddTag = (tagToAdd: string) => {
    const clean = tagToAdd.trim();
    if (!clean) return;
    const formatted = clean.startsWith('#') ? clean : `#${clean}`;
    if (!tags.includes(formatted)) {
      setTags(prev => [...prev, formatted]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(t => t !== tagToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (photoCount > 15) {
      setErrorMessage('Chỉ được tải lên tối đa 15 hình ảnh!');
      return;
    }
    if (videoCount > 1) {
      setErrorMessage('Chỉ được tải lên tối đa 1 video!');
      return;
    }
    if (!title.trim() && !content.trim() && mediaItems.length === 0) {
      setErrorMessage('Vui lòng nhập tiêu đề/nội dung hoặc đính kèm ảnh kỷ niệm!');
      return;
    }

    if (editingPost) {
      const res = albumService.updatePost(
        editingPost.id,
        {
          title: title.trim() || 'Khoảnh khắc kỷ niệm',
          content: content.trim(),
          tags,
          media: mediaItems,
          images: mediaItems.filter(m => m.type === 'image').map(m => m.url),
          videoUrl: mediaItems.find(m => m.type === 'video')?.url,
          attachments,
          parentVisible,
          isPinned: currentUser.role === 'TEACHER' ? isPinned : editingPost.isPinned
        },
        currentUser
      );

      if (!res.success) {
        setErrorMessage(res.error || 'Có lỗi xảy ra khi cập nhật bài viết!');
        return;
      }
    } else {
      const res = albumService.createPost(
        {
          title: title.trim() || 'Khoảnh khắc kỷ niệm',
          content: content.trim(),
          tags,
          media: mediaItems,
          attachments,
          parentVisible,
          isPinned: currentUser.role === 'TEACHER' ? isPinned : false
        },
        currentUser
      );

      if (!res.success) {
        setErrorMessage(res.error || 'Có lỗi xảy ra khi tạo bài viết!');
        return;
      }
    }

    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              referrerPolicy="no-referrer"
              className="w-9 h-9 rounded-full object-cover ring-2 ring-blue-200 shadow-2xs"
            />
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {editingPost ? 'Chỉnh sửa bài đăng Album' : 'Tạo bài đăng Album kỷ niệm'}
              </h3>
              <p className="text-xs text-slate-500">
                Đăng bởi <span className="font-semibold text-slate-700">{currentUser.name}</span> (
                {currentUser.role === 'TEACHER' ? 'GVCN' : currentUser.role === 'CLASS_OFFICER' ? 'Ban cán sự' : 'Học sinh'})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Error Alert */}
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Tiêu đề bài đăng / Hoạt động
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="VD: Hội thao 26/3, Lễ Khai giảng, Kỷ niệm 20/11..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-semibold focus:bg-white focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Cảm nghĩ & Lời chúc
            </label>
            <textarea
              rows={3}
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Chia sẻ những kỷ niệm đẹp, khoảnh khắc đáng nhớ của các bạn..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3.5 text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 leading-relaxed"
            />
          </div>

          {/* Media Attachments Header & Counter */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Hình ảnh & Video ({photoCount}/15 ảnh • {videoCount}/1 video)
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddSamplePhoto}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-blue-500" />
                  + Thêm ảnh mẫu HD
                </button>
              </div>
            </div>

            {/* Upload Buttons Row */}
            <div className="flex flex-wrap gap-2">
              <input
                type="file"
                ref={fileInputRef}
                multiple
                accept="image/jpeg,image/png,image/webp,image/heic"
                className="hidden"
                onChange={e => handleFileUpload(e, 'image')}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
              >
                <Image className="w-4 h-4 text-blue-600" />
                Tải ảnh từ máy (Tối đa 15)
              </button>

              <button
                type="button"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'video/mp4,video/webm,video/quicktime';
                  input.onchange = (ev: any) => handleFileUpload(ev, 'video');
                  input.click();
                }}
                disabled={videoCount >= 1}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
              >
                <Film className="w-4 h-4 text-purple-600" />
                Đính kèm 1 Video
              </button>

              <input
                type="file"
                ref={docInputRef}
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                className="hidden"
                onChange={handleDocUpload}
              />
              <button
                type="button"
                onClick={() => docInputRef.current?.click()}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
              >
                <Paperclip className="w-4 h-4 text-emerald-600" />
                Đính kèm tài liệu
              </button>
            </div>

            {/* Media Items Preview List with Reordering */}
            {mediaItems.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-200 max-h-56 overflow-y-auto">
                {mediaItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="relative aspect-square rounded-xl overflow-hidden border border-slate-300 bg-black group"
                  >
                    {item.type === 'video' ? (
                      <div className="w-full h-full flex flex-col items-center justify-center text-white p-2 text-center bg-slate-900">
                        <Film className="w-6 h-6 text-purple-400 mb-1" />
                        <span className="text-[10px] font-bold truncate max-w-full">VIDEO</span>
                      </div>
                    ) : (
                      <img
                        src={item.url}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    )}

                    {/* Order Badge */}
                    <span className="absolute top-1 left-1 bg-black/70 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-md">
                      #{idx + 1}
                    </span>

                    {/* Overlay Action Buttons */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-1">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleMoveUp(idx)}
                          disabled={idx === 0}
                          className="p-1 bg-white/20 hover:bg-white/40 disabled:opacity-20 text-white rounded cursor-pointer"
                          title="Chuyển lên trước"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveDown(idx)}
                          disabled={idx === mediaItems.length - 1}
                          className="p-1 bg-white/20 hover:bg-white/40 disabled:opacity-20 text-white rounded cursor-pointer"
                          title="Chuyển ra sau"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveMedia(idx)}
                        className="p-1 bg-red-600/80 hover:bg-red-600 text-white rounded text-[10px] font-bold flex items-center gap-1 mt-1 cursor-pointer"
                        title="Xóa tệp này"
                      >
                        <Trash2 className="w-3 h-3" />
                        Xóa
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Document Attachments Preview */}
            {attachments.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-bold text-slate-500">Tệp tài liệu đính kèm:</p>
                {attachments.map(att => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-100 border border-slate-200 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="truncate font-medium text-slate-800">{att.name}</span>
                      <span className="text-[10px] text-slate-400">({att.size})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(att.id)}
                      className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Hashtags Input & Preset Chips */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Thẻ chủ đề (Hashtags)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag(tagInput);
                  }
                }}
                placeholder="Nhập hashtag rồi nhấn Enter (VD: #KỷNiệm)"
                className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => handleAddTag(tagInput)}
                className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                + Thêm
              </button>
            </div>

            {/* Selected tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-lg"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-blue-900 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Preset Suggestions */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-slate-400">Gợi ý:</span>
              {PRESET_TAGS.map((t, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleAddTag(t)}
                  className="text-[11px] text-slate-600 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-md cursor-pointer"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Privacy & Pin Settings */}
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            {/* Parent Visibility */}
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={parentVisible}
                onChange={e => setParentVisible(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
              />
              <span className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-blue-600" />
                Cho phép Phụ huynh xem bài đăng này
              </span>
            </label>

            {/* Pin to Top (Teacher only) */}
            {currentUser.role === 'TEACHER' && (
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={e => setIsPinned(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <span className="flex items-center gap-1.5">
                  <Pin className="w-3.5 h-3.5 text-purple-600" />
                  Ghim lên đầu bảng tin Album
                </span>
              </label>
            )}
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer"
          >
            {editingPost ? 'Lưu cập nhật' : 'Đăng lên Album kỷ niệm'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
