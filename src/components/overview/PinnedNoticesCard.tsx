/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Pin, PinOff, Plus, FileText, Download, Eye, Trash2, X, Paperclip, MessageSquareQuote, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import { PinnedItem, AttachedFile, Post, LessonAssignment } from '../../types';
import { classService } from '../../services/ClassService';
import { postService, parsePostDateToTimestamp } from '../../services/PostService';
import { authService } from '../../services/AuthService';
import { academicService } from '../../services/AcademicService';
import { fileStorageService } from '../../services/FileStorageService';
import {
  formatVietnamDateTitle,
  getAssignmentTaskContent,
  getAssignmentBgClasses,
  getAssignmentTextClass,
  groupPinnedAssignmentsByDay
} from '../../utils/assignmentUtils';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';

interface PinnedNoticesCardProps {
  onOpenFilePreview: (file: AttachedFile) => void;
}

export const PinnedNoticesCard: React.FC<PinnedNoticesCardProps> = ({ onOpenFilePreview }) => {
  const [pinnedPosts, setPinnedPosts] = useState<Post[]>(() => postService.getPinnedPosts());
  const [manualPinnedItems, setManualPinnedItems] = useState<PinnedItem[]>(() => classService.getPinnedItems());
  const [pinnedAssignments, setPinnedAssignments] = useState<LessonAssignment[]>(() => academicService.getPinnedAssignments());
  const currentUser = authService.getCurrentUser();
  const isTeacher = currentUser.role === 'TEACHER' || (currentUser.role as any) === 'SUPER_ADMIN';
  const isOfficer = currentUser.role === 'CLASS_OFFICER';
  const canManagePins = isTeacher || isOfficer;

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<PinnedItem['category']>('notice');
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);

  useEffect(() => {
    const unsubClass = classService.subscribe(() => {
      setManualPinnedItems(classService.getPinnedItems());
    });
    const unsubPost = postService.subscribe(() => {
      setPinnedPosts(postService.getPinnedPosts());
    });
    const unsubAcademic = academicService.subscribe(() => {
      setPinnedAssignments(academicService.getPinnedAssignments());
    });

    return () => {
      unsubClass();
      unsubPost();
      unsubAcademic();
    };
  }, []);

  const sortedPinnedPosts = useMemo(() => {
    return [...pinnedPosts].sort((a, b) => {
      if (typeof a.pinOrder === 'number' && typeof b.pinOrder === 'number' && a.pinOrder !== b.pinOrder) {
        return a.pinOrder - b.pinOrder;
      }
      if (a.pinnedAt && b.pinnedAt) {
        const pinDiff = parsePostDateToTimestamp(b.pinnedAt) - parsePostDateToTimestamp(a.pinnedAt);
        if (pinDiff !== 0) return pinDiff;
      }
      const dateA = a.publishedAt || a.postedAt || a.createdAt;
      const dateB = b.publishedAt || b.postedAt || b.createdAt;
      const diff = parsePostDateToTimestamp(dateB) - parsePostDateToTimestamp(dateA);
      if (diff !== 0) return diff;
      return (b.id || '').localeCompare(a.id || '');
    });
  }, [pinnedPosts]);

  const sortedManualPinnedItems = useMemo(() => {
    return [...manualPinnedItems].sort((a, b) => {
      const diff = parsePostDateToTimestamp(b.pinnedAt) - parsePostDateToTimestamp(a.pinnedAt);
      if (diff !== 0) return diff;
      return (b.id || '').localeCompare(a.id || '');
    });
  }, [manualPinnedItems]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      const uploaded = await fileStorageService.uploadLocalFile(files[i]);
      setAttachedFiles(prev => [...prev, uploaded]);
    }
  };

  const handleAddPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const teacherName = currentUser.name 
      ? (currentUser.name.includes('GVCN') ? currentUser.name : `${currentUser.name} (GVCN)`)
      : (classService.getSettings().teacherName ? `${classService.getSettings().teacherName} (GVCN)` : 'GVCN');

    classService.addPinnedItem({
      title: newTitle.trim(),
      content: newContent.trim(),
      category: newCategory,
      pinnedBy: teacherName,
      files: attachedFiles.length > 0 ? attachedFiles : undefined
    });

    setIsAddOpen(false);
    setNewTitle('');
    setNewContent('');
    setAttachedFiles([]);
    setNewCategory('notice');
  };

  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    id: string;
    title: string;
    type: 'feed_post' | 'manual_notice';
  }>({
    isOpen: false,
    id: '',
    title: '',
    type: 'feed_post'
  });
  const [actionSuccessNotice, setActionSuccessNotice] = useState<string | null>(null);

  const handleUnpinPost = (id: string, postTitle?: string) => {
    postService.unpinPost(id);
    setPinnedPosts(prev => prev.filter(p => p.id !== id));
    setActionSuccessNotice(`Đã bỏ ghim "${postTitle || 'bài viết'}" khỏi Trang tổng quan. Bài viết vẫn được lưu giữ trên Bảng tin lớp theo đúng ngày đăng.`);
    setTimeout(() => setActionSuccessNotice(null), 4000);
  };

  const requestDeleteFeedPost = (id: string, postTitle?: string) => {
    setDeleteModalState({
      isOpen: true,
      id,
      title: postTitle || 'Bài viết',
      type: 'feed_post'
    });
  };

  const handleUnpinManualItem = (id: string, title?: string) => {
    classService.removePinnedItem(id);
    setManualPinnedItems(prev => prev.filter(item => item.id !== id));
    setActionSuccessNotice(`Đã bỏ ghim thông báo "${title || 'này'}" khỏi Trang tổng quan.`);
    setTimeout(() => setActionSuccessNotice(null), 4000);
  };

  const requestDeleteManualItem = (id: string, title?: string) => {
    setDeleteModalState({
      isOpen: true,
      id,
      title: title || 'Thông báo',
      type: 'manual_notice'
    });
  };

  const confirmDelete = () => {
    if (!deleteModalState.id) return;
    if (deleteModalState.type === 'feed_post') {
      postService.deletePost(deleteModalState.id);
      setPinnedPosts(prev => prev.filter(p => p.id !== deleteModalState.id));
      setActionSuccessNotice(`Đã xóa vĩnh viễn bài viết "${deleteModalState.title}".`);
    } else {
      classService.removePinnedItem(deleteModalState.id);
      setManualPinnedItems(prev => prev.filter(item => item.id !== deleteModalState.id));
      setActionSuccessNotice(`Đã xóa thông báo "${deleteModalState.title}".`);
    }
    setDeleteModalState({ isOpen: false, id: '', title: '', type: 'feed_post' });
    setTimeout(() => setActionSuccessNotice(null), 4000);
  };

  const groupedPinnedAssignments = useMemo(() => {
    return groupPinnedAssignmentsByDay(pinnedAssignments, academicService.getAssignments());
  }, [pinnedAssignments]);

  const totalPinnedCount = sortedPinnedPosts.length + sortedManualPinnedItems.length + groupedPinnedAssignments.length;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs mb-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
            <Pin className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-800">THÔNG BÁO QUAN TRỌNG & BẢN TIN ĐÃ GHIM</h3>
              {totalPinnedCount > 0 && (
                <span className="rounded-full bg-rose-100 px-2 py-0.2 text-[10px] font-bold text-rose-700">
                  {totalPinnedCount} mục đã ghim
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500">Các bản tin lớp trọng tâm, quy định & tài liệu ưu tiên hiển thị trên Trang Tổng quan</p>
          </div>
        </div>

        {canManagePins && (
          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-1 rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Ghim thông báo mới</span>
          </button>
        )}
      </div>

      {totalPinnedCount === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center bg-slate-50/50">
          <Pin className="h-8 w-8 text-slate-300 mx-auto mb-2 rotate-45" />
          <p className="text-xs font-bold text-slate-700">Chưa có bản tin hoặc thông báo nào được ghim lên Trang Tổng quan</p>
          <p className="text-[11px] text-slate-400 mt-1 max-w-md mx-auto">
            GVCN và Cán sự lớp có thể nhấn nút <strong>"Ghim"</strong> trên bất kỳ bài viết nào trong tab <em>Bản tin lớp</em> hoặc ghim thông báo trực tiếp tại đây để luôn xuất hiện trên Trang Tổng quan.
          </p>
          {canManagePins && (
            <button
              onClick={() => setIsAddOpen(true)}
              className="mt-3.5 inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 transition-colors shadow-2xs cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Ghim thông báo đầu tiên</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1. Pinned Posts from "Bản tin lớp" (Primary Source of Truth) */}
          {sortedPinnedPosts.map((post) => (
            <div
              key={post.id}
              className="relative flex flex-col justify-between rounded-xl border border-blue-200 bg-blue-50/30 p-4 hover:border-blue-300 transition-colors shadow-2xs"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-700 shrink-0">
                      <Pin className="h-3 w-3 fill-current" />
                    </span>
                    <span className="rounded-md bg-blue-100 text-blue-800 px-2 py-0.5 text-[10px] font-extrabold border border-blue-200">
                      {post.customBadgeIcon || '📢'} {post.category || 'Bản tin lớp'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      {post.authorName} ({post.authorRole === 'TEACHER' ? 'GVCN' : post.authorRole === 'CLASS_OFFICER' ? 'Ban cán sự' : 'Học viên'})
                    </span>
                  </div>
                  {canManagePins && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleUnpinPost(post.id, post.title)}
                        className="inline-flex items-center gap-1 text-slate-500 hover:text-blue-700 hover:bg-blue-100/80 px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer border border-slate-200 bg-white"
                        title="Bỏ ghim khỏi Trang tổng quan (bài viết vẫn lưu giữ trong Bảng tin lớp)"
                      >
                        <PinOff className="h-3 w-3 text-blue-600" />
                        <span>Bỏ ghim</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => requestDeleteFeedPost(post.id, post.title)}
                        className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer transition-colors rounded-lg hover:bg-rose-50 border border-slate-200 bg-white shadow-2xs"
                        title="Xóa vĩnh viễn bài viết"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 leading-snug mb-2">
                  {post.title}
                </h4>

                <p className="text-xs text-slate-700 leading-relaxed mb-3 whitespace-pre-line">
                  {post.content}
                </p>

                {/* Post Attachments */}
                {post.attachments && post.attachments.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-blue-100">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Tệp đính kèm bài viết:</span>
                    {post.attachments.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between rounded-lg bg-white p-2 border border-slate-200 text-xs text-slate-700"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                          <span className="truncate">{file.name}</span>
                          <span className="text-[10px] text-slate-400">({file.size})</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => onOpenFilePreview(file)}
                            className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-600 cursor-pointer"
                          >
                            <Eye className="h-3 w-3" />
                            <span>Xem</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-blue-100/80">
                <span>Đã đăng: {post.createdAt}</span>
                <span className="font-bold text-blue-700 flex items-center gap-1">
                  <MessageSquareQuote className="h-3 w-3" />
                  <span>Bản tin lớp đã ghim</span>
                </span>
              </div>
            </div>
          ))}

          {/* 2. Manual Pinned Notices from Class Settings */}
          {sortedManualPinnedItems.map((item) => (
            <div
              key={item.id}
              className="relative flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-4 hover:border-slate-300 transition-colors"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-50 text-rose-600 shrink-0">
                      <Pin className="h-3 w-3" />
                    </span>
                    <h4 className="text-xs font-bold text-slate-800 leading-snug">{item.title}</h4>
                  </div>
                  {canManagePins && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleUnpinManualItem(item.id, item.title)}
                        className="inline-flex items-center gap-1 text-slate-600 hover:text-amber-700 hover:bg-amber-100/80 px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer border border-slate-200 bg-white shadow-2xs"
                        title="Bỏ ghim thông báo khỏi Trang tổng quan"
                      >
                        <PinOff className="h-3 w-3 text-amber-600" />
                        <span>Bỏ ghim</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => requestDeleteManualItem(item.id, item.title)}
                        className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer transition-colors rounded-lg hover:bg-rose-50 border border-slate-200 bg-white shadow-2xs"
                        title="Xóa thông báo"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-600 leading-relaxed mb-3 whitespace-pre-line">
                  {item.content}
                </p>

                {item.files && item.files.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-200/60">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase">Tài liệu đính kèm:</span>
                    {item.files.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between rounded-lg bg-white p-2 border border-slate-200 text-xs text-slate-700"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                          <span className="truncate">{file.name}</span>
                          <span className="text-[10px] text-slate-400">({file.size})</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => onOpenFilePreview(file)}
                            className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-600 cursor-pointer"
                          >
                            <Eye className="h-3 w-3" />
                            <span>Xem</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-200/40">
                <span>Đã ghim: {item.pinnedAt} {item.pinnedBy ? `• ${item.pinnedBy}` : ''}</span>
                <span className="font-semibold text-rose-600">Thông báo ưu tiên</span>
              </div>
            </div>
          ))}

          {/* 3. Pinned Assignments from Báo bài (Hiển thị thống nhất một mục theo ngày) */}
          {groupedPinnedAssignments.map((group) => {
            const bgClasses = getAssignmentBgClasses(group.dayBgColor);
            const textClass = getAssignmentTextClass(group.dayTextColor);
            const canUnpin = currentUser.role === 'TEACHER' || currentUser.role === 'CLASS_OFFICER';

            return (
              <div
                key={`pinned-assign-day-${group.dateKey}`}
                className={`relative flex flex-col justify-between rounded-xl border p-4 transition-colors shadow-2xs ${bgClasses.bg} ${bgClasses.border} ring-1 ring-amber-300`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-700 shrink-0">
                        <Pin className="h-3 w-3 fill-current" />
                      </span>
                      <span className="rounded-md bg-amber-100 text-amber-900 px-2 py-0.5 text-[10px] font-extrabold border border-amber-300">
                        BÁO BÀI ĐÃ GHIM
                      </span>
                      <span className="text-[10px] font-bold text-slate-800">
                        {group.dateTitle}
                      </span>
                      <span className="rounded-md bg-amber-200/80 text-amber-950 px-1.5 py-0.5 text-[9px] font-extrabold">
                        {group.items.length} môn
                      </span>
                    </div>

                    {canUnpin && (
                      <button
                        type="button"
                        onClick={async () => {
                          await academicService.toggleDayPinAsync(group.dateKey, false);
                          setActionSuccessNotice(`Đã bỏ ghim toàn bộ báo bài ngày ${group.dateTitle}.`);
                          setTimeout(() => setActionSuccessNotice(null), 4000);
                        }}
                        className="inline-flex items-center gap-1 text-slate-600 hover:text-amber-800 hover:bg-amber-100/80 px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer border border-slate-200 bg-white shadow-2xs"
                        title="Bỏ ghim toàn bộ báo bài ngày này khỏi Trang tổng quan"
                      >
                        <PinOff className="h-3 w-3 text-amber-600" />
                        <span>Bỏ ghim</span>
                      </button>
                    )}
                  </div>

                  {/* Nội dung danh sách tất cả các môn trong ngày */}
                  <div className="space-y-1.5 pt-1">
                    {group.items.map((item) => {
                      const content = getAssignmentTaskContent(item) || 'Chuẩn bị bài học theo hướng dẫn.';
                      return (
                        <div key={`pinned-item-${item.id}`} className="flex items-start gap-2">
                          <span className={`font-bold select-none text-base leading-none mt-0.5 ${textClass}`}>•</span>
                          <div className={`text-xs leading-relaxed break-words flex-1 ${textClass}`}>
                            <span className="font-extrabold">Môn {item.subject}:</span>{' '}
                            <span>{content}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-200/50">
                  <span>Ngày học: {group.dateTitle}</span>
                  <a
                    href="#schedule/assignments"
                    className="font-bold text-blue-600 hover:underline flex items-center gap-0.5"
                  >
                    <span>Mở Báo bài</span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Pin Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-100 text-rose-600">
                  <Pin className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">Ghim Thông Báo / Nội Quy Lớp</h3>
              </div>
              <button onClick={() => setIsAddOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddPin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tiêu đề thông báo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="VD: Quy định trang phục & chuyên cần năm học 2025 - 2026..."
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phân loại
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-hidden bg-white"
                >
                  <option value="notice">Thông báo chung</option>
                  <option value="rule">Nội quy & Quy định lớp</option>
                  <option value="schedule">Kế hoạch / Lịch hoạt động</option>
                  <option value="other">Khác</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nội dung chi tiết <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Ghi rõ nội dung dặn dò, hướng dẫn..."
                  rows={4}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Đính kèm tệp văn bản / quy định (PDF, DOC, XLS, hình ảnh)
                </label>
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-rose-50 file:text-rose-700 hover:file:bg-rose-100 cursor-pointer"
                />
                {attachedFiles.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {attachedFiles.map(f => (
                      <div key={f.id} className="text-[11px] text-slate-600 flex items-center gap-1">
                        <Paperclip className="h-3 w-3 text-slate-400" />
                        <span>{f.name} ({f.size})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-semibold text-white hover:bg-rose-700 shadow-xs cursor-pointer"
                >
                  Ghim lên trang Tổng quan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {actionSuccessNotice && (
        <div className="mt-4 flex items-center justify-between gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800 border border-emerald-200 animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{actionSuccessNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccessNotice(null)}
            className="text-emerald-700 hover:text-emerald-900 cursor-pointer p-0.5 rounded-md hover:bg-emerald-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={deleteModalState.isOpen}
        title={deleteModalState.type === 'feed_post' ? 'Xác nhận xóa bài viết' : 'Xác nhận xóa thông báo'}
        itemName={deleteModalState.title}
        message={
          deleteModalState.type === 'feed_post'
            ? 'Thầy/Cô có chắc chắn muốn xóa vĩnh viễn bài viết này khỏi hệ thống? Bài viết sẽ bị xóa khỏi cả Trang tổng quan và Bảng tin lớp.'
            : 'Thầy/Cô có chắc chắn muốn xóa thông báo này khỏi Trang tổng quan?'
        }
        confirmText="Xác nhận xóa vĩnh viễn"
        cancelText="Hủy bỏ"
        onConfirm={confirmDelete}
        onClose={() => setDeleteModalState({ isOpen: false, id: '', title: '', type: 'feed_post' })}
      />
    </div>
  );
};
