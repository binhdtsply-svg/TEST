/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Heart,
  MessageCircle,
  Pin,
  MoreHorizontal,
  Trash2,
  Edit2,
  FileText,
  Download,
  Play,
  Send,
  CornerDownRight,
  Eye,
  Lock,
  Globe
} from 'lucide-react';
import { AlbumPost, UserAccount, Comment } from '../../types';
import { albumService } from '../../services/AlbumService';
import { ShareButton } from '../common/ShareButton';
import { MediaViewerModal } from './MediaViewerModal';

interface AlbumPostCardProps {
  post: AlbumPost;
  currentUser: UserAccount;
  onEdit?: (post: AlbumPost) => void;
}

export const AlbumPostCard: React.FC<AlbumPostCardProps> = ({
  post,
  currentUser,
  onEdit
}) => {
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [isCommentsOpen, setIsCommentsOpen] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const mediaList = post.media && post.media.length > 0
    ? post.media
    : (post.images || []).map(url => ({ type: 'image' as const, url, name: 'Ảnh kỷ niệm' }));

  const photos = mediaList.filter(m => m.type === 'image');
  const videos = mediaList.filter(m => m.type === 'video');

  const loveActive = (post.reactions?.love || []).includes(currentUser.id);
  const applauseActive = (post.reactions?.applause || []).includes(currentUser.id);
  const plantActive = (post.reactions?.plant || []).includes(currentUser.id);

  const totalReactions =
    (post.reactions?.love?.length || 0) +
    (post.reactions?.applause?.length || 0) +
    (post.reactions?.plant?.length || 0);

  const handleOpenViewer = (index: number) => {
    setSelectedMediaIndex(index);
    setIsViewerOpen(true);
  };

  const handleReaction = (type: 'love' | 'applause' | 'plant') => {
    albumService.toggleReaction(post.id, type, currentUser);
  };

  const handleTogglePin = () => {
    albumService.togglePin(post.id, currentUser);
    setIsMenuOpen(false);
  };

  const handleDeletePost = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa bài đăng này không?')) {
      albumService.deletePost(post.id, currentUser);
      setIsMenuOpen(false);
    }
  };

  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    albumService.addComment(post.id, commentText.trim(), currentUser, replyingToCommentId || undefined);
    setCommentText('');
    setReplyingToCommentId(null);
  };

  const handleDeleteComment = (commentId: string) => {
    albumService.deleteComment(post.id, commentId, currentUser);
  };

  const isTeacher = currentUser.role === 'TEACHER';
  const isAuthor = post.authorId === currentUser.id;
  const canManage = isTeacher || isAuthor;

  // Group top-level and reply comments
  const topComments = (post.comments || []).filter(c => !c.parentCommentId);
  const getReplies = (parentId: string) => (post.comments || []).filter(c => c.parentCommentId === parentId);

  // Content truncation
  const contentText = post.content || post.description || '';
  const isLongContent = contentText.length > 240;
  const displayedContent = isLongContent && !isExpanded
    ? contentText.substring(0, 240) + '...'
    : contentText;

  // Render Facebook/Zalo-style responsive photo grid
  const renderPhotoGrid = () => {
    const count = photos.length;
    if (count === 0) return null;

    if (count === 1) {
      return (
        <div
          onClick={() => handleOpenViewer(0)}
          className="relative max-h-[460px] overflow-hidden rounded-2xl cursor-pointer group bg-slate-900"
        >
          <img
            src={photos[0].url}
            alt={(photos[0] as any).caption || (photos[0] as any).name || post.title}
            referrerPolicy="no-referrer"
            className="w-full h-full max-h-[460px] object-cover group-hover:scale-101 transition-transform duration-300"
          />
        </div>
      );
    }

    if (count === 2) {
      return (
        <div className="grid grid-cols-2 gap-1.5 rounded-2xl overflow-hidden max-h-[380px]">
          {photos.map((p, idx) => (
            <div
              key={idx}
              onClick={() => handleOpenViewer(idx)}
              className="relative aspect-4/3 overflow-hidden cursor-pointer group bg-slate-900"
            >
              <img
                src={p.url}
                alt=""
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
              />
            </div>
          ))}
        </div>
      );
    }

    if (count === 3) {
      return (
        <div className="grid grid-cols-3 gap-1.5 rounded-2xl overflow-hidden max-h-[380px]">
          <div
            onClick={() => handleOpenViewer(0)}
            className="col-span-2 relative aspect-4/3 sm:aspect-auto sm:h-full overflow-hidden cursor-pointer group bg-slate-900"
          >
            <img
              src={photos[0].url}
              alt=""
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
            />
          </div>
          <div className="col-span-1 grid grid-rows-2 gap-1.5">
            {photos.slice(1, 3).map((p, idx) => (
              <div
                key={idx + 1}
                onClick={() => handleOpenViewer(idx + 1)}
                className="relative h-full overflow-hidden cursor-pointer group bg-slate-900"
              >
                <img
                  src={p.url}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                />
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (count === 4) {
      return (
        <div className="grid grid-cols-2 gap-1.5 rounded-2xl overflow-hidden max-h-[420px]">
          {photos.map((p, idx) => (
            <div
              key={idx}
              onClick={() => handleOpenViewer(idx)}
              className="relative aspect-square overflow-hidden cursor-pointer group bg-slate-900"
            >
              <img
                src={p.url}
                alt=""
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
              />
            </div>
          ))}
        </div>
      );
    }

    // 5+ Photos: 3 full photos + 4th tile with +N overlay
    const extraCount = count - 4;
    return (
      <div className="grid grid-cols-2 gap-1.5 rounded-2xl overflow-hidden max-h-[420px]">
        {photos.slice(0, 3).map((p, idx) => (
          <div
            key={idx}
            onClick={() => handleOpenViewer(idx)}
            className="relative aspect-square overflow-hidden cursor-pointer group bg-slate-900"
          >
            <img
              src={p.url}
              alt=""
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
            />
          </div>
        ))}

        <div
          onClick={() => handleOpenViewer(3)}
          className="relative aspect-square overflow-hidden cursor-pointer group bg-slate-900"
        >
          <img
            src={photos[3].url}
            alt=""
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
          />
          {extraCount > 0 && (
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-2xs flex items-center justify-center text-white text-2xl font-black transition-colors group-hover:bg-slate-950/70">
              +{extraCount + 1}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <article className={`bg-white rounded-2xl border transition-all relative ${
      post.isPinned
        ? 'border-blue-300 shadow-md shadow-blue-500/5'
        : 'border-slate-200/90 shadow-xs hover:shadow-sm'
    } w-full min-w-0 overflow-hidden`}>
      {/* Pinned banner if active */}
      {post.isPinned && (
        <div className="px-5 py-2 rounded-t-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 flex items-center gap-2 text-xs font-bold text-blue-700">
          <Pin className="w-3.5 h-3.5 fill-blue-600 rotate-45" />
          <span>Bài viết ghim quan trọng của lớp</span>
        </div>
      )}

      {/* Header */}
      <div className="p-5 pb-3 flex items-start justify-between min-w-0 gap-3">
        <div className="flex items-center gap-3">
          <img
            src={post.authorAvatar}
            alt={post.authorName}
            referrerPolicy="no-referrer"
            className="w-11 h-11 rounded-full object-cover ring-2 ring-slate-100 shadow-2xs"
          />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 leading-tight">
                {post.authorName}
              </h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                post.authorRole === 'TEACHER'
                  ? 'bg-purple-100 text-purple-700'
                  : post.authorRole === 'CLASS_OFFICER'
                  ? 'bg-blue-100 text-blue-700'
                  : post.authorRole === 'PARENT'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-slate-100 text-slate-700'
              }`}>
                {post.authorRole === 'TEACHER'
                  ? 'GVCN'
                  : post.authorRole === 'CLASS_OFFICER'
                  ? 'Ban cán sự'
                  : post.authorRole === 'PARENT'
                  ? 'Phụ huynh'
                  : 'Học sinh'}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
              <span>{post.createdAt}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                {post.parentVisible ? (
                  <>
                    <Globe className="w-3 h-3 text-slate-400" />
                    <span>Lớp & Phụ huynh</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3 h-3 text-amber-500" />
                    <span>Nội bộ lớp</span>
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Options Menu */}
        {canManage && (
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(prev => !prev)}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              title="Tùy chọn bài viết"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 top-8 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-30 animate-in fade-in">
                {isTeacher && (
                  <button
                    onClick={handleTogglePin}
                    className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                  >
                    <Pin className="w-3.5 h-3.5" />
                    {post.isPinned ? 'Bỏ ghim bài viết' : 'Ghim lên đầu bảng tin'}
                  </button>
                )}

                {onEdit && (
                  <button
                    onClick={() => {
                      onEdit(post);
                      setIsMenuOpen(false);
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Chỉnh sửa bài viết
                  </button>
                )}

                <button
                  onClick={handleDeletePost}
                  className="w-full px-3.5 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Xóa bài viết
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content Text & Title */}
      <div className="px-5 pb-3.5 min-w-0">
        <h4 className="text-base font-bold text-slate-900 mb-1.5 break-words">
          {post.title}
        </h4>
        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line break-words">
          {displayedContent}
        </p>

        {isLongContent && (
          <button
            onClick={() => setIsExpanded(prev => !prev)}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 mt-1 cursor-pointer"
          >
            {isExpanded ? 'Thu gọn' : 'Xem thêm...'}
          </button>
        )}

        {/* Tags */}
        {(post.tags || post.hashtags) && (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {(post.tags || post.hashtags || []).map((tag, idx) => (
              <span
                key={idx}
                className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Media Grid */}
      {photos.length > 0 && (
        <div className="px-5 pb-3">
          {renderPhotoGrid()}
        </div>
      )}

      {/* Video Player */}
      {videos.length > 0 && (
        <div className="px-5 pb-3">
          <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-slate-200">
            <video
              src={videos[0].url}
              controls
              className="w-full h-full object-contain"
            >
              Trình duyệt không hỗ trợ video này.
            </video>
          </div>
        </div>
      )}

      {/* File Attachments */}
      {post.attachments && post.attachments.length > 0 && (
        <div className="px-5 pb-3">
          <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Tệp đính kèm ({post.attachments.length})
            </p>
            {post.attachments.map(att => (
              <a
                key={att.id}
                href={att.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all text-xs font-medium text-slate-800 group"
              >
                <div className="flex items-center gap-2 truncate">
                  <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="truncate">{att.name}</span>
                  {att.size && <span className="text-[10px] text-slate-400">({att.size})</span>}
                </div>
                <Download className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Interactions Stats Bar */}
      <div className="px-5 py-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          {totalReactions > 0 ? (
            <div className="flex items-center -space-x-1">
              {(post.reactions?.love || []).length > 0 && (
                <span className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center text-[10px] ring-2 ring-white">
                  ❤️
                </span>
              )}
              {(post.reactions?.applause || []).length > 0 && (
                <span className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center text-[10px] ring-2 ring-white">
                  👏
                </span>
              )}
              {(post.reactions?.plant || []).length > 0 && (
                <span className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-[10px] ring-2 ring-white">
                  🌱
                </span>
              )}
              <span className="ml-2 font-semibold text-slate-700">{totalReactions}</span>
            </div>
          ) : (
            <span>Hãy là người đầu tiên tương tác</span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span>{(post.comments || []).length} bình luận</span>
          <span>•</span>
          <span>{post.sharesCount || 0} chia sẻ</span>
        </div>
      </div>

      {/* Action Buttons: React, Comment, Share */}
      <div className="px-3 py-1.5 border-t border-slate-100 grid grid-cols-3 gap-1 bg-slate-50/50 min-w-0">
        {/* Reactions Dropdown / Quick bar */}
        <div className="flex items-center justify-center gap-1 min-w-0 overflow-hidden">
          <button
            onClick={() => handleReaction('love')}
            className={`flex-1 min-w-0 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              loveActive
                ? 'bg-red-50 text-red-600 border border-red-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="Yêu thích"
          >
            <Heart className={`w-4 h-4 shrink-0 ${loveActive ? 'fill-red-600 text-red-600' : ''}`} />
            <span className="hidden sm:inline truncate">Yêu thích</span>
          </button>
          <button
            onClick={() => handleReaction('applause')}
            className={`p-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              applauseActive
                ? 'bg-amber-100 text-amber-800'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="Vỗ tay hoan hô"
          >
            👏
          </button>
          <button
            onClick={() => handleReaction('plant')}
            className={`p-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              plantActive
                ? 'bg-emerald-100 text-emerald-800'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="Góp mầm xanh"
          >
            🌱
          </button>
        </div>

        {/* Comment button */}
        <button
          onClick={() => setIsCommentsOpen(prev => !prev)}
          className="py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <MessageCircle className="w-4 h-4 text-slate-500" />
          <span>Bình luận</span>
        </button>

        {/* Share button */}
        <ShareButton
          payload={{
            id: post.id,
            title: post.title,
            content: post.content || post.description,
            category: 'Album kỷ niệm',
            type: 'album',
            parentVisible: post.parentVisible
          }}
          currentUser={currentUser}
          variant="subtle"
          onShared={() => albumService.incrementShareCount(post.id)}
          className="w-full justify-center font-bold"
        />
      </div>

      {/* Inline Comments Section */}
      {isCommentsOpen && (
        <div className="p-5 pt-3 border-t border-slate-100 bg-slate-50/80 space-y-3">
          {/* List of comments */}
          {topComments.length > 0 && (
            <div className="space-y-3">
              {topComments.map(comment => {
                const replies = getReplies(comment.id);
                const canDelete = isTeacher || comment.authorId === currentUser.id;

                return (
                  <div key={comment.id} className="space-y-2">
                    <div className="flex gap-2.5 group">
                      <img
                        src={comment.authorAvatar}
                        alt={comment.authorName}
                        referrerPolicy="no-referrer"
                        className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5 shadow-2xs"
                      />
                      <div className="flex-1">
                        <div className="bg-white border border-slate-200/80 rounded-2xl px-4 py-2.5 inline-block max-w-full shadow-2xs">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-bold text-slate-900">
                              {comment.authorName}
                            </span>
                            {comment.authorRole === 'TEACHER' && (
                              <span className="text-[9px] font-bold bg-purple-100 text-purple-700 px-1.5 py-0.2 rounded-md">
                                GVCN
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-line">
                            {comment.content}
                          </p>
                        </div>

                        <div className="flex items-center gap-3 mt-1 ml-2 text-[11px] text-slate-400">
                          <span>{comment.createdAt}</span>
                          <button
                            onClick={() => {
                              setReplyingToCommentId(comment.id);
                              setCommentText(`@${comment.authorName} `);
                            }}
                            className="font-bold text-slate-600 hover:text-blue-600 cursor-pointer"
                          >
                            Trả lời
                          </button>
                          {canDelete && (
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                              title="Xóa bình luận"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Replies */}
                    {replies.length > 0 && (
                      <div className="pl-10 space-y-2">
                        {replies.map(reply => {
                          const canDeleteReply = isTeacher || reply.authorId === currentUser.id;
                          return (
                            <div key={reply.id} className="flex gap-2 group">
                              <CornerDownRight className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-1" />
                              <img
                                src={reply.authorAvatar}
                                alt={reply.authorName}
                                referrerPolicy="no-referrer"
                                className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5 shadow-2xs"
                              />
                              <div className="flex-1">
                                <div className="bg-blue-50/70 border border-blue-100 rounded-2xl px-3.5 py-2 inline-block max-w-full">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <span className="text-xs font-bold text-slate-900">
                                      {reply.authorName}
                                    </span>
                                    {reply.authorRole === 'TEACHER' && (
                                      <span className="text-[9px] font-bold bg-purple-100 text-purple-700 px-1.5 py-0.2 rounded-md">
                                        GVCN
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-line">
                                    {reply.content}
                                  </p>
                                </div>

                                <div className="flex items-center gap-3 mt-1 ml-2 text-[10px] text-slate-400">
                                  <span>{reply.createdAt}</span>
                                  {canDeleteReply && (
                                    <button
                                      onClick={() => handleDeleteComment(reply.id)}
                                      className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                      title="Xóa phản hồi"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Comment Form */}
          <div className="pt-2">
            {replyingToCommentId && (
              <div className="flex items-center justify-between bg-blue-100/70 px-3 py-1 rounded-xl text-xs text-blue-800 mb-2 font-medium">
                <span>Đang trả lời bình luận...</span>
                <button
                  onClick={() => {
                    setReplyingToCommentId(null);
                    setCommentText('');
                  }}
                  className="font-bold hover:underline cursor-pointer"
                >
                  Hủy
                </button>
              </div>
            )}

            <form onSubmit={handleSendComment} className="flex items-center gap-2.5">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-full object-cover shrink-0 shadow-2xs"
              />
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder="Viết bình luận hoặc chúc mừng tập thể lớp..."
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 pr-11 text-xs text-slate-900 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs"
                />
                <button
                  type="submit"
                  disabled={!commentText.trim()}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-30 text-white rounded-lg transition-colors cursor-pointer"
                  title="Gửi bình luận"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Media Viewer Modal */}
      {isViewerOpen && (
        <MediaViewerModal
          post={post}
          initialMediaIndex={selectedMediaIndex}
          isOpen={isViewerOpen}
          onClose={() => setIsViewerOpen(false)}
          currentUser={currentUser}
        />
      )}
    </article>
  );
};
