/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Pin,
  MessageCircle,
  Share2,
  MoreVertical,
  Trash2,
  Edit2,
  Paperclip,
  Check,
  FileText,
  Send,
  Eye,
  CheckCircle2
} from 'lucide-react';
import { Post, AttachedFile } from '../../types';
import { postService } from '../../services/PostService';
import { authService } from '../../services/AuthService';
import { notificationProvider } from '../../services/NotificationProvider';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';

interface PostItemProps {
  post: Post;
  onOpenFilePreview: (file: AttachedFile) => void;
}

export const PostItem: React.FC<PostItemProps> = ({ post, onOpenFilePreview }) => {
  const currentUser = authService.getCurrentUser();
  const isTeacher = currentUser.role === 'TEACHER' || (currentUser.role as any) === 'SUPER_ADMIN';
  const isOfficer = currentUser.role === 'CLASS_OFFICER';
  const isParent = currentUser.role === 'PARENT';
  const isAuthor = currentUser.id === post.authorId || currentUser.name === post.authorName;
  const isTeacherPost = post.authorRole === 'TEACHER';
  const isPinned = Boolean(post.isPinned || post.pinnedToOverview);
  // Rule VII: Officer can pin/unpin their own posts, but cannot unpin GVCN's pinned post
  const canPin = !isParent && (isTeacher || (isOfficer && (isAuthor || (!isTeacherPost && !isPinned))));

  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const getReactionCount = (val: any) => (Array.isArray(val) ? val.length : (typeof val === 'number' ? val : 0));

  const reactions = [
    { type: 'like' as const, emoji: '👍', label: 'Thích', count: getReactionCount(post.reactions?.like) },
    { type: 'love' as const, emoji: '❤️', label: 'Yêu thích', count: getReactionCount(post.reactions?.love) },
    { type: 'applause' as const, emoji: '👏', label: 'Tuyệt vời', count: getReactionCount(post.reactions?.applause) },
    { type: 'insightful' as const, emoji: '💡', label: 'Ý nghĩa', count: getReactionCount((post.reactions as any)?.insightful) },
    { type: 'laurel' as const, emoji: '🌼', label: 'Tự hào', count: getReactionCount((post.reactions as any)?.plant || (post.reactions as any)?.laurel) },
    { type: 'celebrate' as const, emoji: '🎉', label: 'Chúc mừng', count: getReactionCount(post.reactions?.celebrate) }
  ];

  const handleReaction = (type: any) => {
    if (isParent) return;
    postService.toggleReaction(post.id, type, currentUser.id);
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (isParent || !commentText.trim()) return;

    postService.addComment(post.id, {
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorAvatar: currentUser.avatar,
      authorRole: currentUser.role,
      content: commentText.trim()
    });

    setCommentText('');
  };

  const handleTogglePin = () => {
    if (isParent) return;
    if (isOfficer && !isTeacher && isTeacherPost && isPinned) {
      return;
    }
    postService.togglePin(post.id);
  };

  const handleDelete = () => {
    if (isParent) return;
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    postService.deletePost(post.id);
    setIsDeleteModalOpen(false);
  };

  const handleShareZalo = () => {
    const success = notificationProvider.copyShareableContent(post.title, post.content);
    if (success) {
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 2500);
    }
  };

  const getCategoryTheme = (category: string) => {
    switch (category) {
      case 'Thông báo':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Học tập':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Khen thưởng':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Phong trào':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Nhắc nhở':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <article className={`relative rounded-2xl border bg-white p-5 shadow-xs transition-all ${
      isPinned ? 'border-blue-300 ring-1 ring-blue-100' : 'border-slate-200'
    } mb-4`}>
      {/* Pinned Marker */}
      {isPinned && (
        <div className="absolute -top-2.5 right-6 flex items-center gap-1 rounded-full bg-blue-600 px-3 py-0.5 text-[10px] font-bold text-white shadow-xs">
          <Pin className="h-3 w-3 fill-current" />
          <span>ĐÃ GHIM ĐẦU BẢNG TIN</span>
        </div>
      )}

      {/* Header: Author Info & Category */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          {post.authorAvatar ? (
            <img
              src={post.authorAvatar}
              alt={post.authorName}
              referrerPolicy="no-referrer"
              className="h-10 w-10 rounded-full object-cover ring-2 ring-slate-100 shrink-0"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm ring-2 ring-slate-100 shrink-0">
              {post.authorName ? post.authorName.charAt(0).toUpperCase() : 'U'}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-900">{post.authorName}</span>
              <span className="rounded-md bg-slate-100 px-1.5 py-0.2 text-[10px] font-bold text-slate-600 border border-slate-200">
                {post.authorRole === 'TEACHER' ? 'GVCN' : post.authorRole === 'CLASS_OFFICER' ? 'Ban cán sự' : 'Học sinh'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
              <span>{post.createdAt}</span>
              <span>•</span>
              <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.2 text-[10px] font-bold border ${getCategoryTheme(post.category)}`}>
                <span>{post.customBadgeIcon || '📢'}</span>
                <span>{post.category}</span>
              </span>
              {post.parentVisible && (
                <span className="text-[10px] text-emerald-600 font-medium hidden sm:inline">
                  (PH xem được)
                </span>
              )}
              {post.status === 'pending' && (
                <span className="rounded-md bg-amber-50 px-1.5 py-0.2 text-[10px] font-bold text-amber-700 border border-amber-200">
                  ⏳ Đang chờ duyệt
                </span>
              )}
              {post.status === 'rejected' && (
                <span className="rounded-md bg-rose-50 px-1.5 py-0.2 text-[10px] font-bold text-rose-700 border border-rose-200" title={post.rejectionReason}>
                  ❌ Chưa duyệt
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Options Menu (Teacher / Officer / Author) */}
        <div className="flex items-center gap-1">
          {canPin && (
            <button
              onClick={handleTogglePin}
              className={`rounded-lg p-1.5 transition-colors cursor-pointer flex items-center gap-1 ${
                isPinned ? 'text-blue-600 bg-blue-50 hover:bg-blue-100 ring-1 ring-blue-200' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
              }`}
              title={isPinned ? 'Bỏ ghim khỏi Trang tổng quan' : 'Ghim lên Trang tổng quan & đầu bảng tin'}
            >
              <Pin className={`h-4 w-4 ${isPinned ? 'fill-current' : ''}`} />
              <span className="text-[10px] font-bold hidden sm:inline">{isPinned ? 'Đã ghim' : 'Ghim'}</span>
            </button>
          )}

          {(isTeacher || isAuthor) && (
            <button
              onClick={handleDelete}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
              title="Xóa bài viết"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Post Title */}
      <h3 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight mb-2">
        {post.title}
      </h3>

      {/* Post Content */}
      <div className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-2 mb-4 whitespace-pre-line">
        {post.content.length > 300 && !isExpanded ? (
          <>
            <p>{post.content.slice(0, 300)}...</p>
            <button
              onClick={() => setIsExpanded(true)}
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              Xem thêm chi tiết
            </button>
          </>
        ) : (
          <p>{post.content}</p>
        )}
      </div>

      {/* Attached Media / Files */}
      {post.attachments && post.attachments.length > 0 && (
        <div className="mb-4 space-y-2">
          {/* Images Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {post.attachments
              .filter(f => f.url && (f.type === 'image' || f.name.match(/\.(jpeg|jpg|png|webp|gif)$/i)))
              .map((img) => (
                <div
                  key={img.id}
                  onClick={() => onOpenFilePreview(img)}
                  className="group relative h-36 w-full overflow-hidden rounded-xl bg-slate-100 cursor-pointer border border-slate-200"
                >
                  <img
                    src={img.url}
                    alt={img.name}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                    Xem ảnh
                  </div>
                </div>
              ))}
          </div>

          {/* Documents list */}
          <div className="space-y-1.5">
            {post.attachments
              .filter(f => f.type !== 'image' && !f.name.match(/\.(jpeg|jpg|png|webp|gif)$/i))
              .map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 border border-slate-200 text-xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="h-4 w-4 text-blue-600 shrink-0" />
                    <span className="truncate font-medium text-slate-800">{file.name}</span>
                    <span className="text-[10px] text-slate-400">({file.size})</span>
                  </div>
                  <button
                    onClick={() => onOpenFilePreview(file)}
                    className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-blue-600 border border-slate-200 hover:bg-blue-50 shadow-2xs shrink-0"
                  >
                    <Eye className="h-3 w-3" />
                    <span>Xem</span>
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 6 Reactions Bar */}
      <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3 mb-3">
        {reactions.map((r) => (
          <button
            key={r.type}
            disabled={isParent}
            onClick={() => handleReaction(r.type)}
            className={`flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-medium transition-all ${
              r.count > 0
                ? 'bg-blue-50/80 text-blue-700 border border-blue-200 font-bold'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
            } ${isParent ? 'cursor-default opacity-85 hover:bg-slate-50' : 'active:scale-95'}`}
            title={isParent ? 'Phụ huynh xem thông tin ở chế độ chỉ đọc' : r.label}
          >
            <span>{r.emoji}</span>
            <span>{r.count}</span>
          </button>
        ))}
      </div>

      {/* Interaction Actions (Comments, Share to Zalo) */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs text-slate-500">
        <button
          onClick={() => setIsCommentsOpen(!isCommentsOpen)}
          className="flex items-center gap-1.5 hover:text-blue-600 font-medium"
        >
          <MessageCircle className="h-4 w-4" />
          <span>{post.comments.length} Bình luận</span>
        </button>

        <button
          onClick={handleShareZalo}
          className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-medium"
        >
          {copiedNotification ? (
            <>
              <Check className="h-4 w-4 text-emerald-600" />
              <span className="text-emerald-600 font-bold">Đã sao chép gửi Zalo!</span>
            </>
          ) : (
            <>
              <Share2 className="h-4 w-4" />
              <span>Chia sẻ Zalo / Sao chép</span>
            </>
          )}
        </button>
      </div>

      {/* Comments Drawer / Thread */}
      {isCommentsOpen && (
        <div className="mt-4 rounded-xl bg-slate-50/80 p-3.5 border border-slate-100 space-y-3">
          <div className="space-y-2.5 max-h-64 overflow-y-auto">
            {post.comments.length > 0 ? (
              post.comments.map((comment) => (
                <div key={comment.id} className="flex items-start gap-2.5 text-xs">
                  {comment.authorAvatar ? (
                    <img
                      src={comment.authorAvatar}
                      alt={comment.authorName}
                      referrerPolicy="no-referrer"
                      className="h-7 w-7 rounded-full object-cover ring-1 ring-slate-200 mt-0.5 shrink-0"
                    />
                  ) : (
                    <div className="h-7 w-7 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px] ring-1 ring-slate-200 mt-0.5 shrink-0">
                      {comment.authorName ? comment.authorName.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}
                  <div className="flex-1 rounded-xl bg-white p-2.5 border border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">{comment.authorName}</span>
                      <span className="text-[10px] text-slate-400">{comment.createdAt}</span>
                    </div>
                    <p className="mt-1 text-slate-700 leading-relaxed">{comment.content}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-2 text-center text-xs text-slate-400 italic">
                Chưa có bình luận nào. Hãy là người đầu tiên trao đổi!
              </div>
            )}
          </div>

          {/* Add comment input OR Parent Read-Only Notice */}
          {!isParent ? (
            <form onSubmit={handleAddComment} className="flex items-center gap-2 pt-2 border-t border-slate-200/60">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Viết phản hồi / câu hỏi của bạn..."
                className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-hidden"
              />
              <button
                type="submit"
                disabled={!commentText.trim()}
                className="rounded-xl bg-blue-600 p-2 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          ) : (
            <div className="pt-2 border-t border-slate-200/60 text-center text-[11px] text-slate-600 bg-slate-100/70 rounded-xl p-2.5 font-medium">
              💡 <b>Chế độ Phụ huynh (Chỉ xem):</b> Để gửi ý kiến hoặc trao đổi riêng tư với Thầy/Cô, quý phụ huynh vui lòng sử dụng mục <b>Cầu nối Phụ huynh</b>.
            </div>
          )}
        </div>
      )}

      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        title="Xác nhận xóa bài viết"
        itemName={post.title}
        message="Thầy/Cô có chắc chắn muốn xóa bài viết này khỏi Bảng tin? Hành động này sẽ đồng bộ trên toàn hệ thống và không thể hoàn tác."
        confirmText="Xác nhận xóa"
        cancelText="Hủy bỏ"
        onConfirm={confirmDelete}
        onClose={() => setIsDeleteModalOpen(false)}
      />
    </article>
  );
};
