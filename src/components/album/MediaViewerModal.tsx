/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Share2,
  Heart,
  MessageCircle,
  Sparkles,
  Send,
  Trash2,
  CornerDownRight
} from 'lucide-react';
import { AlbumPost, UserAccount, Comment } from '../../types';
import { albumService } from '../../services/AlbumService';
import { ShareDialog } from '../common/ShareDialog';

interface MediaViewerModalProps {
  post: AlbumPost;
  initialMediaIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount;
}

export const MediaViewerModal: React.FC<MediaViewerModalProps> = ({
  post,
  initialMediaIndex = 0,
  isOpen,
  onClose,
  currentUser
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialMediaIndex);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);

  // Sync index when initialMediaIndex changes
  useEffect(() => {
    setCurrentIndex(initialMediaIndex);
    setZoomLevel(1);
  }, [initialMediaIndex, isOpen]);

  const mediaList = post.media && post.media.length > 0
    ? post.media
    : (post.images || []).map(url => ({ type: 'image' as const, url, name: 'Ảnh kỷ niệm' }));

  const currentMedia = mediaList[currentIndex] || mediaList[0];

  const handleNext = useCallback(() => {
    if (mediaList.length <= 1) return;
    setCurrentIndex(prev => (prev + 1) % mediaList.length);
    setZoomLevel(1);
  }, [mediaList.length]);

  const handlePrev = useCallback(() => {
    if (mediaList.length <= 1) return;
    setCurrentIndex(prev => (prev - 1 + mediaList.length) % mediaList.length);
    setZoomLevel(1);
  }, [mediaList.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handleNext, handlePrev]);

  if (!isOpen || !currentMedia) return null;

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.3, 3));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.3, 0.7));
  const handleResetZoom = () => setZoomLevel(1);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = currentMedia.url;
    link.download = currentMedia.name || `album-11a1-media-${currentIndex + 1}.jpg`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReaction = (type: 'love' | 'applause' | 'plant') => {
    albumService.toggleReaction(post.id, type, currentUser);
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

  const loveActive = (post.reactions?.love || []).includes(currentUser.id);
  const applauseActive = (post.reactions?.applause || []).includes(currentUser.id);
  const plantActive = (post.reactions?.plant || []).includes(currentUser.id);

  // Group top-level and reply comments
  const topComments = (post.comments || []).filter(c => !c.parentCommentId);
  const getReplies = (parentId: string) => (post.comments || []).filter(c => c.parentCommentId === parentId);

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex bg-slate-950/95 backdrop-blur-md animate-in fade-in overflow-hidden">
      {/* Main View Area */}
      <div className="flex-1 flex flex-col h-full relative">
        {/* Top Floating Controls Bar */}
        <div className="h-16 px-4 flex items-center justify-between z-20 bg-gradient-to-b from-slate-950/80 to-transparent">
          {/* Left Info */}
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Đóng xem ảnh (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="text-white">
              <p className="text-xs font-bold leading-tight line-clamp-1">{post.title}</p>
              <p className="text-[11px] text-slate-300">
                {currentMedia.type === 'video' ? 'Video' : 'Ảnh'} {currentIndex + 1} / {mediaList.length}
                {currentMedia.name ? ` • ${currentMedia.name}` : ''}
              </p>
            </div>
          </div>

          {/* Right Action Tools */}
          <div className="flex items-center gap-2">
            {currentMedia.type === 'image' && (
              <div className="hidden sm:flex items-center bg-white/10 rounded-xl p-1 gap-1">
                <button
                  onClick={handleZoomOut}
                  disabled={zoomLevel <= 0.7}
                  className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg disabled:opacity-30 cursor-pointer"
                  title="Thu nhỏ"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-[11px] font-mono text-white/90 px-1.5 min-w-[42px] text-center">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  onClick={handleZoomIn}
                  disabled={zoomLevel >= 3}
                  className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg disabled:opacity-30 cursor-pointer"
                  title="Phóng to"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={handleResetZoom}
                  className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer"
                  title="Đặt lại kích thước"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            )}

            <button
              onClick={handleDownload}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Tải xuống tệp này"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsShareOpen(true)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Chia sẻ tệp này"
            >
              <Share2 className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsSidebarOpen(prev => !prev)}
              className={`p-2 rounded-xl text-white transition-colors cursor-pointer ${
                isSidebarOpen ? 'bg-blue-600 hover:bg-blue-700' : 'bg-white/10 hover:bg-white/20'
              }`}
              title={isSidebarOpen ? 'Ẩn chi tiết & bình luận' : 'Xem chi tiết & bình luận'}
            >
              <MessageCircle className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Center Media Canvas */}
        <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden select-none">
          {currentMedia.type === 'video' ? (
            <div className="max-w-4xl w-full aspect-video rounded-2xl overflow-hidden shadow-2xl bg-black border border-white/10">
              <video
                src={currentMedia.url}
                controls
                autoPlay
                className="w-full h-full object-contain"
              >
                Trình duyệt không hỗ trợ phát video này.
              </video>
            </div>
          ) : (
            <div
              className="transition-transform duration-150 ease-out flex items-center justify-center max-w-full max-h-full"
              style={{ transform: `scale(${zoomLevel})` }}
            >
              <img
                src={currentMedia.url}
                alt={(currentMedia as any).caption || (currentMedia as any).name || post.title}
                referrerPolicy="no-referrer"
                className="max-h-[82vh] max-w-[85vw] object-contain rounded-lg shadow-2xl pointer-events-auto"
              />
            </div>
          )}

          {/* Navigation Arrows */}
          {mediaList.length > 1 && (
            <>
              <button
                onClick={handlePrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-slate-900/60 hover:bg-slate-900/90 text-white flex items-center justify-center shadow-lg transition-all border border-white/10 cursor-pointer group"
                title="Ảnh trước (Mũi tên trái)"
              >
                <ChevronLeft className="w-6 h-6 group-hover:-translate-x-0.5 transition-transform" />
              </button>
              <button
                onClick={handleNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-slate-900/60 hover:bg-slate-900/90 text-white flex items-center justify-center shadow-lg transition-all border border-white/10 cursor-pointer group"
                title="Ảnh tiếp theo (Mũi tên phải)"
              >
                <ChevronRight className="w-6 h-6 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </>
          )}
        </div>

        {/* Thumbnail Preview Strip */}
        {mediaList.length > 1 && (
          <div className="h-18 px-4 py-2 bg-slate-950/80 border-t border-white/10 flex items-center justify-center gap-2 overflow-x-auto z-20">
            {mediaList.map((m, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setCurrentIndex(idx);
                  setZoomLevel(1);
                }}
                className={`h-12 w-12 rounded-lg overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                  currentIndex === idx
                    ? 'border-blue-500 scale-105 shadow-md shadow-blue-500/30'
                    : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                {m.type === 'video' ? (
                  <div className="w-full h-full bg-slate-800 flex items-center justify-center text-white text-[10px] font-bold">
                    VIDEO
                  </div>
                ) : (
                  <img
                    src={m.url}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Side Details & Comments Drawer */}
      {isSidebarOpen && (
        <div className="w-full max-w-sm sm:w-96 bg-white border-l border-slate-200 flex flex-col h-full z-30 shadow-2xl animate-in slide-in-from-right">
          {/* Post Header */}
          <div className="p-4 border-b border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <img
                  src={post.authorAvatar}
                  alt={post.authorName}
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-blue-100"
                />
                <div>
                  <h4 className="text-xs font-bold text-slate-900 leading-snug">
                    {post.authorName}
                  </h4>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                      post.authorRole === 'TEACHER'
                        ? 'bg-purple-100 text-purple-700'
                        : post.authorRole === 'CLASS_OFFICER'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {post.authorRole === 'TEACHER' ? 'GVCN' : post.authorRole === 'CLASS_OFFICER' ? 'Ban cán sự' : 'Học sinh'}
                    </span>
                    <span className="text-[11px] text-slate-400">• {post.createdAt}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsSidebarOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <h3 className="text-sm font-bold text-slate-900 mb-1.5">{post.title}</h3>
            <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line mb-2.5">
              {post.content || post.description}
            </p>

            {/* Hashtags */}
            {(post.tags || post.hashtags) && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {(post.tags || post.hashtags || []).map((tag, idx) => (
                  <span
                    key={idx}
                    className="text-[11px] font-medium text-blue-600 hover:underline cursor-pointer"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Social Reactions Bar */}
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleReaction('love')}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  loveActive
                    ? 'bg-red-100 text-red-600 border border-red-200'
                    : 'hover:bg-slate-200 text-slate-600'
                }`}
                title="Yêu thích"
              >
                <Heart className={`w-3.5 h-3.5 ${loveActive ? 'fill-red-600 text-red-600' : ''}`} />
                <span>{(post.reactions?.love || []).length}</span>
              </button>

              <button
                onClick={() => handleReaction('applause')}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  applauseActive
                    ? 'bg-amber-100 text-amber-700 border border-amber-200'
                    : 'hover:bg-slate-200 text-slate-600'
                }`}
                title="Vỗ tay hoan hô"
              >
                <span>👏</span>
                <span>{(post.reactions?.applause || []).length}</span>
              </button>

              <button
                onClick={() => handleReaction('plant')}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  plantActive
                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                    : 'hover:bg-slate-200 text-slate-600'
                }`}
                title="Góp mầm xanh"
              >
                <span>🌱</span>
                <span>{(post.reactions?.plant || []).length}</span>
              </button>
            </div>

            <span className="text-[11px] text-slate-500 font-medium">
              {(post.comments || []).length} bình luận
            </span>
          </div>

          {/* Comments List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
            {topComments.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs">Chưa có bình luận nào.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Hãy là người đầu tiên chia sẻ cảm nghĩ!</p>
              </div>
            ) : (
              topComments.map(comment => {
                const replies = getReplies(comment.id);
                const canDelete = currentUser.role === 'TEACHER' || comment.authorId === currentUser.id;

                return (
                  <div key={comment.id} className="space-y-2">
                    {/* Top Comment */}
                    <div className="flex gap-2.5 group">
                      <img
                        src={comment.authorAvatar}
                        alt={comment.authorName}
                        referrerPolicy="no-referrer"
                        className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5"
                      />
                      <div className="flex-1">
                        <div className="bg-slate-100 rounded-2xl px-3.5 py-2 inline-block max-w-full">
                          <div className="flex items-center gap-1.5 mb-0.5">
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
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Replies */}
                    {replies.length > 0 && (
                      <div className="pl-9 space-y-2">
                        {replies.map(reply => {
                          const canDeleteReply = currentUser.role === 'TEACHER' || reply.authorId === currentUser.id;
                          return (
                            <div key={reply.id} className="flex gap-2 group">
                              <CornerDownRight className="w-3.5 h-3.5 text-slate-300 shrink-0 mt-1" />
                              <img
                                src={reply.authorAvatar}
                                alt={reply.authorName}
                                referrerPolicy="no-referrer"
                                className="w-6 h-6 rounded-full object-cover shrink-0 mt-0.5"
                              />
                              <div className="flex-1">
                                <div className="bg-blue-50/70 border border-blue-100/80 rounded-2xl px-3 py-1.5 inline-block max-w-full">
                                  <div className="flex items-center gap-1.5 mb-0.5">
                                    <span className="text-xs font-bold text-slate-900">
                                      {reply.authorName}
                                    </span>
                                    {reply.authorRole === 'TEACHER' && (
                                      <span className="text-[9px] font-bold bg-purple-100 text-purple-700 px-1 py-0.2 rounded-md">
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
              })
            )}
          </div>

          {/* Comment Input */}
          <div className="p-3 border-t border-slate-200 bg-slate-50">
            {replyingToCommentId && (
              <div className="flex items-center justify-between bg-blue-100/60 px-2.5 py-1 rounded-lg text-[11px] text-blue-800 mb-2">
                <span>Đang trả lời bình luận...</span>
                <button
                  onClick={() => {
                    setReplyingToCommentId(null);
                    setCommentText('');
                  }}
                  className="font-bold hover:text-blue-950 cursor-pointer"
                >
                  Hủy
                </button>
              </div>
            )}

            <form onSubmit={handleSendComment} className="flex items-center gap-2">
              <input
                type="text"
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder="Viết bình luận..."
                className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={!commentText.trim()}
                className="p-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl transition-colors cursor-pointer"
                title="Gửi bình luận"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Share Dialog */}
      <ShareDialog
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        payload={{
          id: post.id,
          title: post.title,
          content: post.content || post.description,
          category: 'Album kỷ niệm',
          type: 'album',
          parentVisible: post.parentVisible
        }}
        currentUser={currentUser}
      />
    </div>,
    document.body
  );
};
