/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, MessageSquareQuote, Sparkles, ShieldCheck, Pin, Layers, Calendar, Clock, BookOpen, Users, ExternalLink } from 'lucide-react';
import { Post, PostCategory, AttachedFile, ExamSchedule, LessonAssignment } from '../../types';
import { postService, parsePostDateToTimestamp } from '../../services/PostService';
import { authService } from '../../services/AuthService';
import { academicService } from '../../services/AcademicService';
import {
  formatVietnamDateTitle,
  getAssignmentTaskContent,
  getAssignmentBgClasses,
  getAssignmentTextClass,
  groupPinnedAssignmentsByDay
} from '../../utils/assignmentUtils';
import { CreatePostCard } from './CreatePostCard';
import { PostItem } from './PostItem';

interface FeedModuleProps {
  onOpenFilePreview: (file: AttachedFile) => void;
  onNavigate?: (module: string, options?: any) => void;
}

export const FeedModule: React.FC<FeedModuleProps> = ({ onOpenFilePreview, onNavigate }) => {
  const [posts, setPosts] = useState<Post[]>(postService.getPostsForRole(authService.getRole()));
  const [pinnedExams, setPinnedExams] = useState<ExamSchedule[]>(academicService.getPinnedFeedExams());
  const [pinnedAssignments, setPinnedAssignments] = useState<LessonAssignment[]>(academicService.getPinnedAssignments());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const currentUser = authService.getCurrentUser();
  const isParent = currentUser.role === 'PARENT';

  useEffect(() => {
    const updatePosts = () => {
      setPosts(postService.getPostsForRole(authService.getRole()));
    };

    const updateExams = () => {
      setPinnedExams(academicService.getPinnedFeedExams());
    };

    const updateAssignments = () => {
      setPinnedAssignments(academicService.getPinnedAssignments());
    };

    const unsubPost = postService.subscribe(updatePosts);
    const unsubAuth = authService.subscribe(() => {
      updatePosts();
      updateExams();
      updateAssignments();
    });
    const unsubAcademic = academicService.subscribe(() => {
      updateExams();
      updateAssignments();
    });

    // Fetch latest posts from server on mount
    postService.refresh();

    return () => {
      unsubPost();
      unsubAuth();
      unsubAcademic();
    };
  }, []);

  const categories = [
    { id: 'all', label: 'Tất cả' },
    { id: 'Thông báo', label: '📢 Thông báo' },
    { id: 'Học tập', label: '📚 Học tập' },
    { id: 'Khen thưởng', label: '🏆 Khen thưởng' },
    { id: 'Phong trào', label: '🎉 Phong trào' },
    { id: 'Nhắc nhở', label: '⏰ Nhắc nhở' }
  ];

  const { pinnedPosts, regularPosts } = useMemo(() => {
    const matched = posts.filter((p) => {
      const matchCategory = selectedCategory === 'all' || p.category === selectedCategory;
      const matchSearch =
        searchKeyword === '' ||
        (p.title || '').toLowerCase().includes(searchKeyword.toLowerCase()) ||
        p.content.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        p.authorName.toLowerCase().includes(searchKeyword.toLowerCase());
      return matchCategory && matchSearch;
    });

    const pinned = matched
      .filter((p) => Boolean(p.isPinned || p.pinnedToOverview || p.pinned))
      .sort((a, b) => {
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

    const regular = matched
      .filter((p) => !Boolean(p.isPinned || p.pinnedToOverview || p.pinned))
      .sort((a, b) => {
        const dateA = a.publishedAt || a.postedAt || a.createdAt;
        const dateB = b.publishedAt || b.postedAt || b.createdAt;
        const diff = parsePostDateToTimestamp(dateB) - parsePostDateToTimestamp(dateA);
        if (diff !== 0) return diff;
        return (b.id || '').localeCompare(a.id || '');
      });

    return { pinnedPosts: pinned, regularPosts: regular };
  }, [posts, selectedCategory, searchKeyword]);

  const groupedPinnedAssignments = useMemo(() => {
    return groupPinnedAssignmentsByDay(pinnedAssignments, academicService.getAssignments());
  }, [pinnedAssignments]);

  const totalFilteredCount = pinnedPosts.length + regularPosts.length;

  return (
    <div className="space-y-5">
      {/* Feed Title & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <MessageSquareQuote className="h-5 w-5 text-blue-600" />
            <span>BẢNG TIN & DẶN DÒ LỚP HỌC</span>
          </h2>
          <p className="text-xs text-slate-500">
            Kênh thông tin chính thống, biểu dương thành tích và dặn dò việc học
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="Lọc bài viết theo từ khóa..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-hidden"
          />
        </div>
      </div>

      {/* Parent Filter Note */}
      {isParent && (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 p-3.5 text-xs text-emerald-900 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-bold text-emerald-950">Chế độ Phụ huynh (Chỉ xem - Read-Only)</p>
              <p className="text-[11px] text-emerald-800 mt-0.5">
                Quý phụ huynh đang xem các thông báo và dặn dò chính thức từ Giáo viên chủ nhiệm. Để gửi phản hồi hoặc trao đổi riêng tư với Thầy/Cô, vui lòng sử dụng mục <b>Cầu nối Phụ huynh</b>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Create Post Widget (Not for Parent) */}
      {!isParent && <CreatePostCard />}

      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
              selectedCategory === cat.id
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* SECTION: KHU VỰC BÀI KIỂM TRA ĐANG GHIM */}
      {pinnedExams.length > 0 && (
        <div className="space-y-3 rounded-2xl bg-gradient-to-br from-indigo-50/70 via-blue-50/40 to-white border border-indigo-200/90 p-4 sm:p-5 shadow-xs animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-100 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
                <Calendar className="h-4.5 w-4.5" />
              </span>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-indigo-950 uppercase tracking-wide flex items-center gap-2">
                  <span>Bài kiểm tra đang ghim trên Bảng tin ({pinnedExams.length})</span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-2xs">
                    <Pin className="h-2.5 w-2.5 fill-current" /> Đã ghim
                  </span>
                </h3>
                <p className="text-[11px] text-indigo-900/70">
                  Lịch kiểm tra trọng tâm được Giáo viên Chủ nhiệm ghim thông báo đến lớp
                </p>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-100/80 px-2.5 py-1 rounded-lg shrink-0 self-start sm:self-auto">
              Đồng bộ Lịch kiểm tra
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
            {pinnedExams.map((exam) => {
              const examName = exam.announcementTitle || exam.examTitle || (exam.isCentralized ? 'Lịch kiểm tra tập trung' : `Bài kiểm tra ${exam.subject || 'Môn học'}`);
              const examSubject = exam.isCentralized ? (exam.subject || 'Toàn khối / Toàn trường') : (exam.subject || 'Môn học');
              const examTime = exam.startDate && exam.endDate && exam.startDate !== exam.endDate
                ? `${exam.startDate} đến ${exam.endDate}`
                : exam.date || exam.examDate || exam.startDate || 'Theo thông báo';
              const targetAudience = exam.isCentralized ? 'Toàn khối / Toàn trường' : (exam.scope || 'Toàn bộ học sinh lớp');
              const examFormat = exam.format || (exam.examType === 'midterm' ? 'Giữa kỳ' : exam.examType === 'final' ? 'Cuối kỳ' : 'Trắc nghiệm');
              const isTeacher = currentUser.role === 'TEACHER';

              return (
                <div
                  key={`pinned-exam-${exam.id}`}
                  className="rounded-2xl border border-indigo-200/80 bg-white p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between gap-3 group"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="rounded-lg bg-indigo-600 text-white text-[11px] font-black px-2.5 py-0.5 shadow-2xs">
                          {exam.isCentralized ? 'TẬP TRUNG' : (exam.subject || 'MÔN HỌC')}
                        </span>
                        <span className="rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-bold px-2 py-0.5">
                          {examFormat}
                        </span>
                        <span className="rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold px-2 py-0.5">
                          {exam.duration || 'Đang diễn ra'}
                        </span>
                      </div>
                      {isTeacher && (
                        <button
                          type="button"
                          onClick={() => {
                            academicService.toggleExamPinToFeed(exam.id);
                          }}
                          className="text-[11px] font-bold text-slate-400 hover:text-rose-600 hover:bg-rose-50 px-2 py-1 rounded-lg transition-colors cursor-pointer shrink-0"
                          title="Bỏ ghim bài kiểm tra khỏi Bảng tin"
                        >
                          Bỏ ghim
                        </button>
                      )}
                    </div>

                    <div>
                      <h4 className="text-sm font-black text-slate-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
                        {examName}
                      </h4>
                      <div className="mt-2 space-y-1.5 text-xs text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <BookOpen className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                          <span><strong>Môn học:</strong> {examSubject}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          <span><strong>Thời gian:</strong> {examTime} ({exam.period || 'Tiết 1'})</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          <span><strong>Đối tượng:</strong> {targetAudience}</span>
                        </div>
                        {exam.notes && (
                          <p className="text-[11px] text-slate-500 line-clamp-2 bg-slate-50 p-2 rounded-xl border border-slate-100 mt-1.5 leading-relaxed">
                            <strong>Dặn dò:</strong> {exam.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono text-slate-400 font-medium">
                      Mã: {exam.id}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (onNavigate) {
                          onNavigate('schedule', { subTab: 'exams', testId: exam.id });
                        } else if (typeof window !== 'undefined') {
                          window.location.hash = 'schedule';
                        }
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer"
                    >
                      <span>Mở bài kiểm tra</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION: KHU VỰC BÁO BÀI ĐANG GHIM TRÊN BẢNG TIN */}
      {groupedPinnedAssignments.length > 0 && (
        <div className="space-y-3 rounded-2xl bg-gradient-to-br from-amber-50/70 via-orange-50/30 to-white border border-amber-200/90 p-4 sm:p-5 shadow-xs animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-100 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
                <BookOpen className="h-4.5 w-4.5" />
              </span>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-amber-950 uppercase tracking-wide flex items-center gap-2">
                  <span>Báo bài đang ghim trên Bảng tin ({groupedPinnedAssignments.length})</span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-2xs">
                    <Pin className="h-2.5 w-2.5 fill-current" /> Đã ghim
                  </span>
                </h3>
                <p className="text-[11px] text-amber-900/70">
                  Nhiệm vụ học tập và chuẩn bị bài được GVCN / Ban cán sự ghim ưu tiên theo dõi
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (onNavigate) {
                  onNavigate('schedule', { subTab: 'assignments' });
                } else if (typeof window !== 'undefined') {
                  window.location.hash = 'schedule/assignments';
                }
              }}
              className="text-[11px] font-bold text-amber-800 bg-amber-100/90 hover:bg-amber-200 px-3 py-1 rounded-xl transition-colors cursor-pointer self-start sm:self-auto flex items-center gap-1"
            >
              <span>Xem toàn bộ Báo bài</span>
              <ExternalLink className="h-3 w-3" />
            </button>
          </div>

          <div className="space-y-3 pt-1">
            {groupedPinnedAssignments.map((group) => {
              const dayBgClasses = getAssignmentBgClasses(group.dayBgColor);
              const dayTextClass = getAssignmentTextClass(group.dayTextColor);
              const canUnpinDay = currentUser.role === 'TEACHER' || currentUser.role === 'CLASS_OFFICER';

              return (
                <div key={group.dateKey} className="rounded-2xl border border-amber-300 bg-white/95 p-4 shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between border-b border-amber-100/80 pb-2.5 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500 text-white shadow-xs">
                        <Pin className="h-3.5 w-3.5 fill-current" />
                      </span>
                      <span className="text-xs sm:text-sm font-extrabold text-slate-900">{group.dateTitle}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-md">
                        {group.items.length} môn học
                      </span>
                      {canUnpinDay && (
                        <button
                          type="button"
                          onClick={() => {
                            academicService.toggleDayPinAsync(group.dateKey, false);
                          }}
                          className="text-[11px] font-bold text-slate-500 hover:text-rose-700 hover:bg-rose-50 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                          title="Bỏ ghim toàn bộ báo bài ngày này khỏi Bảng tin"
                        >
                          Bỏ ghim ngày
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    {group.items.map((item) => {
                      const content = getAssignmentTaskContent(item) || 'Chuẩn bị bài học theo hướng dẫn.';

                      return (
                        <div
                          key={`pinned-asg-${item.id}`}
                          className={`flex items-start justify-between gap-3 rounded-xl px-3 py-2 border transition-all ${dayBgClasses.bg} ${dayBgClasses.border} shadow-2xs`}
                        >
                          <div className="flex items-start gap-2 flex-1 min-w-0">
                            <span className={`font-bold select-none text-base leading-none mt-0.5 ${dayTextClass}`}>•</span>
                            <div className={`text-xs sm:text-sm leading-relaxed break-words flex-1 ${dayTextClass}`}>
                              <span className="font-extrabold">Môn {item.subject}:</span>{' '}
                              <span>{content}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 1: KHU VỰC BÀI ĐANG GHIM (PINNED POSTS) */}
      {pinnedPosts.length > 0 && (
        <div className="space-y-3 rounded-2xl bg-blue-50/40 border border-blue-200/80 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
                <Pin className="h-3.5 w-3.5 fill-current" />
              </span>
              <h3 className="text-xs sm:text-sm font-extrabold text-blue-950 uppercase tracking-wider">
                Bài viết đang ghim trên Bảng tin ({pinnedPosts.length})
              </h3>
            </div>
            <span className="text-[11px] font-medium text-blue-700 bg-blue-100/80 px-2.5 py-0.5 rounded-full">
              Sắp xếp theo ngày đăng
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {pinnedPosts.map((post) => (
              <PostItem key={`pinned-${post.id}`} post={post} onOpenFilePreview={onOpenFilePreview} />
            ))}
          </div>
        </div>
      )}

      {/* SECTION 2: KHU VỰC BÀI ĐĂNG THƯỜNG (REGULAR POSTS) */}
      <div className="space-y-3">
        {pinnedPosts.length > 0 && regularPosts.length > 0 && (
          <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
            <Layers className="h-4 w-4 text-slate-500" />
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Tất cả bài đăng ({regularPosts.length})
            </h3>
          </div>
        )}

        {regularPosts.length > 0 ? (
          regularPosts.map((post) => (
            <PostItem key={`regular-${post.id}`} post={post} onOpenFilePreview={onOpenFilePreview} />
          ))
        ) : pinnedPosts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
              <MessageSquareQuote className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-700">Chưa có bài viết nào trong mục này</h3>
            <p className="text-xs text-slate-400 mt-1">
              {searchKeyword ? 'Hãy thử tìm với từ khóa khác' : 'Các thông báo mới sẽ xuất hiện tại đây'}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
};
