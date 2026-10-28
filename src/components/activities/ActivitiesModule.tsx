/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  MapPin,
  MessageCircle,
  Share2,
  Heart,
  Award,
  PartyPopper,
  ThumbsUp,
  MoreVertical,
  Edit2,
  Trash2,
  Pin,
  Paperclip,
  Eye,
  Download,
  Send,
  UserCheck,
  Users,
  CheckCircle2,
  UserPlus,
  AlertCircle
} from 'lucide-react';
import { ActivityCategory, ActivityPost, AttachedFile, UserAccount } from '../../types';
import { activityService } from '../../services/ActivityService';
import { authService } from '../../services/AuthService';
import { classService } from '../../services/ClassService';
import { ActivityCreateModal } from './ActivityCreateModal';
import { ActivityRegistrationsModal } from './ActivityRegistrationsModal';
import { StudentActivityRegisterModal } from './StudentActivityRegisterModal';
import { ActivitySummaryEvaluationView } from './ActivitySummaryEvaluationView';
import { ShareDialog } from '../common/ShareDialog';
import { FilePreviewModal } from '../common/FilePreviewModal';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';

const CATEGORY_COLORS: Record<ActivityCategory, { bg: string; text: string; border: string }> = {
  'Phong trào': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  'Văn nghệ': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  'Thể thao': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  'Thi đua': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  'Tình nguyện': { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  'Đoàn – Hội': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  'Ngoại khóa': { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  'Tham quan': { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
  'Hướng nghiệp': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  'Sự kiện trường': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  'Khác': { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' }
};

export const ActivitiesModule: React.FC = () => {
  const currentUser = authService.getCurrentUser();
  const classSettings = classService.getSettings();

  const [activeSubTab, setActiveSubTab] = useState<'feed' | 'evaluation'>('feed');
  const [activities, setActivities] = useState<ActivityPost[]>(activityService.getAll());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState<'all' | 'upcoming' | 'past'>('all');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<ActivityPost | null>(null);

  // Registration modals
  const [selectedActivityForRegistrations, setSelectedActivityForRegistrations] = useState<ActivityPost | null>(null);
  const [selectedActivityForStudentRegister, setSelectedActivityForStudentRegister] = useState<ActivityPost | null>(null);

  // Share state
  const [shareDialogData, setShareDialogData] = useState<{
    isOpen: boolean;
    title: string;
    content: string;
  }>({
    isOpen: false,
    title: '',
    content: ''
  });

  // File Preview Modal
  const [previewFile, setPreviewFile] = useState<AttachedFile | null>(null);
  const [previewGallery, setPreviewGallery] = useState<AttachedFile[]>([]);

  // Open comments map
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [activityToDelete, setActivityToDelete] = useState<ActivityPost | null>(null);
  const [registrationToCancel, setRegistrationToCancel] = useState<string | null>(null);

  const canCreate =
    currentUser.role === 'TEACHER' ||
    (currentUser.role === 'CLASS_OFFICER' && (currentUser.permissions?.manageActivities !== false));

  useEffect(() => {
    const unsub = activityService.subscribe(() => {
      setActivities(activityService.getAll());
      // Keep selected modals in sync if open
      if (selectedActivityForRegistrations) {
        const updated = activityService.getById(selectedActivityForRegistrations.id);
        if (updated) setSelectedActivityForRegistrations(updated);
      }
    });
    return unsub;
  }, [selectedActivityForRegistrations]);

  const handleToggleReaction = (
    activityId: string,
    reactionType: 'love' | 'applause' | 'celebrate' | 'like'
  ) => {
    activityService.toggleReaction(activityId, reactionType, currentUser.id);
  };

  const handleSendComment = (activityId: string) => {
    const text = commentInputs[activityId]?.trim();
    if (!text) return;

    activityService.addComment(activityId, text, currentUser);

    setCommentInputs((prev) => ({ ...prev, [activityId]: '' }));
  };

  const handleDeleteActivity = (act: ActivityPost) => {
    setActivityToDelete(act);
  };

  const confirmDeleteActivity = () => {
    if (activityToDelete) {
      activityService.deleteActivity(activityToDelete.id, currentUser);
      setActivityToDelete(null);
    }
  };

  const handleTogglePin = (act: ActivityPost) => {
    activityService.updateActivity(
      act.id,
      { pinnedToOverview: !act.pinnedToOverview },
      currentUser
    );
  };

  const handleCancelMyRegistration = (actId: string) => {
    setRegistrationToCancel(actId);
  };

  const confirmCancelRegistration = () => {
    if (registrationToCancel) {
      const studentId = currentUser.studentId || currentUser.id;
      activityService.cancelActivityRegistration(registrationToCancel, studentId);
      setRegistrationToCancel(null);
    }
  };

  const handleOpenShare = (act: ActivityPost) => {
    const timeStr = act.isAllDay
      ? `${act.startDate} (Cả ngày)`
      : `${act.startDate} lúc ${act.startTime || '08:00'}`;
    const locationStr = act.location ? ` | Địa điểm: ${act.location}` : '';
    const shareContent = `[${act.category}] ${act.content}\nThời gian: ${timeStr}${locationStr}`;

    setShareDialogData({
      isOpen: true,
      title: act.title,
      content: shareContent
    });
  };

  const handlePreviewImage = (url: string, allImages: string[]) => {
    const gallery: AttachedFile[] = allImages.map((imgUrl, i) => ({
      id: `img-${i}`,
      name: `Ảnh hoạt động ${i + 1}`,
      url: imgUrl,
      type: 'image',
      size: ''
    }));
    const current = gallery.find((g) => g.url === url) || gallery[0];
    setPreviewGallery(gallery);
    setPreviewFile(current);
  };

  const filteredActivities = activities.filter((act) => {
    if (selectedCategory !== 'all' && act.category !== selectedCategory) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = act.title.toLowerCase().includes(q);
      const matchContent = act.content.toLowerCase().includes(q);
      const matchLocation = act.location?.toLowerCase().includes(q);
      if (!matchTitle && !matchContent && !matchLocation) return false;
    }

    if (timeFilter !== 'all') {
      const today = new Date().toISOString().split('T')[0];
      if (timeFilter === 'upcoming' && act.startDate < today) return false;
      if (timeFilter === 'past' && act.startDate >= today) return false;
    }

    return true;
  });

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-orange-100 p-2 text-orange-600">
              <Sparkles className="h-5 w-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              HOẠT ĐỘNG PHONG TRÀO & SỰ KIỆN LỚP
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1 pl-11">
            Không gian cập nhật kế hoạch phong trào, hội thi, văn nghệ, thể thao và hoạt động ngoại khóa của lớp {classSettings.className}
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => {
              setEditingPost(null);
              setIsCreateModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 rounded-2xl bg-orange-600 hover:bg-orange-700 px-5 py-2.5 text-xs font-extrabold text-white shadow-xs transition-all cursor-pointer active:scale-95 shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>TẠO HOẠT ĐỘNG MỚI</span>
          </button>
        )}
      </div>

      {/* Subtab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        <button
          onClick={() => setActiveSubTab('feed')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer ${
            activeSubTab === 'feed'
              ? 'bg-orange-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Sparkles className="h-4 w-4" />
          <span>Kế hoạch & Bảng tin phong trào</span>
        </button>
        <button
          onClick={() => setActiveSubTab('evaluation')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer ${
            activeSubTab === 'evaluation'
              ? 'bg-orange-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Award className="h-4 w-4" />
          <span>Tổng hợp & Đánh giá hoạt động</span>
        </button>
      </div>

      {activeSubTab === 'evaluation' ? (
        <ActivitySummaryEvaluationView />
      ) : (
        <>
          {/* Filter & Search Bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên hoạt động, địa điểm..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-slate-50 focus:bg-white focus:border-orange-500 focus:outline-hidden"
          />
        </div>

        {/* Category Pills & Time Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 outline-hidden hover:bg-slate-100"
          >
            <option value="all">Tất cả thể loại</option>
            {Object.keys(CATEGORY_COLORS).map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value as any)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 outline-hidden hover:bg-slate-100"
          >
            <option value="all">Mọi thời điểm</option>
            <option value="upcoming">Sắp tới</option>
            <option value="past">Đã diễn ra</option>
          </select>
        </div>
      </div>

      {/* Activities Feed List */}
      <div className="space-y-4">
        {filteredActivities.length > 0 ? (
          filteredActivities.map((act) => {
            const catStyle = CATEGORY_COLORS[act.category] || CATEGORY_COLORS['Khác'];
            const allImages = act.media?.filter((m) => m.type === 'image').map((m) => m.url) || act.images || [];
            const isCommentsOpen = openComments[act.id] || false;

            const loveCount = act.reactions?.love?.length || 0;
            const applauseCount = act.reactions?.applause?.length || 0;
            const celebrateCount = act.reactions?.celebrate?.length || 0;
            const likeCount = act.reactions?.like?.length || 0;
            const totalReactions = loveCount + applauseCount + celebrateCount + likeCount;

            const isLoved = act.reactions?.love?.includes(currentUser.id);
            const isApplause = act.reactions?.applause?.includes(currentUser.id);
            const isCelebrated = act.reactions?.celebrate?.includes(currentUser.id);
            const isLiked = act.reactions?.like?.includes(currentUser.id);

            const isAuthor = act.authorId === currentUser.id;
            const isTeacher = currentUser.role === 'TEACHER';
            const isStudent = currentUser.role === 'STUDENT' || currentUser.role === 'CLASS_OFFICER';

            // Registration Stats & Status
            const registrations = act.registrations || [];
            const activeRegs = registrations.filter((r) => r.status !== 'cancelled');
            const currentStudentId = currentUser.studentId || currentUser.id;
            const myReg = registrations.find((r) => r.studentId === currentStudentId && r.status !== 'cancelled');
            const isRegistered = !!myReg;

            const isDeadlinePassed = act.registrationDeadline
              ? new Date(act.registrationDeadline).getTime() < Date.now()
              : false;

            const isFull = !!(act.maxParticipants && act.maxParticipants > 0 && activeRegs.length >= act.maxParticipants);

            return (
              <div
                key={act.id}
                className={`bg-white rounded-3xl border transition-all shadow-xs overflow-hidden ${
                  act.pinnedToOverview ? 'border-orange-300 ring-2 ring-orange-100' : 'border-slate-200'
                }`}
              >
                {/* Pinned Banner */}
                {act.pinnedToOverview && (
                  <div className="bg-orange-500/10 px-5 py-1.5 border-b border-orange-200/60 flex items-center gap-1.5 text-orange-800 text-[11px] font-extrabold">
                    <Pin className="w-3.5 h-3.5 text-orange-600 fill-orange-500" />
                    <span>HOẠT ĐỘNG TRỌNG TÂM ĐƯỢC GHIM LÊN BẢNG TIN TỔNG QUAN</span>
                  </div>
                )}

                <div className="p-5 sm:p-6 space-y-4">
                  {/* Card Header: Author Info & Category */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={act.authorAvatar}
                        alt={act.authorName}
                        referrerPolicy="no-referrer"
                        className="w-11 h-11 rounded-2xl border border-slate-200 object-cover shadow-2xs"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-900">{act.authorName}</span>
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200">
                            {act.authorRole === 'TEACHER'
                              ? 'GVCN'
                              : act.authorRole === 'CLASS_OFFICER'
                              ? 'Ban cán sự'
                              : 'Học sinh'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Đăng lúc: {act.createdAt}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-xl px-3 py-1 text-xs font-black border uppercase tracking-wider ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
                      >
                        {act.category}
                      </span>

                      {/* Options for Author or Teacher */}
                      {(isAuthor || isTeacher) && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleTogglePin(act)}
                            title={act.pinnedToOverview ? 'Bỏ ghim' : 'Ghim bài'}
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                              act.pinnedToOverview
                                ? 'bg-orange-50 border-orange-200 text-orange-600'
                                : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-700'
                            }`}
                          >
                            <Pin className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => {
                              setEditingPost(act);
                              setIsCreateModalOpen(true);
                            }}
                            title="Chỉnh sửa"
                            className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDeleteActivity(act)}
                            title="Xóa"
                            className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Title & Metadata Box */}
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-snug">
                      {act.title}
                    </h2>

                    {/* Event Schedule & Location Pills */}
                    <div className="flex flex-wrap items-center gap-2.5 mt-2.5 text-xs">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 text-orange-900 border border-orange-200 font-bold">
                        <Calendar className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                        <span>
                          {act.startDate}
                          {act.endDate && act.endDate !== act.startDate ? ` → ${act.endDate}` : ''}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-900 border border-blue-200 font-bold">
                        <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>
                          {act.isAllDay
                            ? 'Cả ngày'
                            : `${act.startTime || '08:00'}${act.endTime ? ` - ${act.endTime}` : ''}`}
                        </span>
                      </div>

                      {act.location && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-800 border border-slate-200 font-bold">
                          <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span>{act.location}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Description Content */}
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium whitespace-pre-line">
                    {act.content}
                  </p>

                  {/* Media Grid */}
                  {allImages.length > 0 && (
                    <div
                      className={`grid gap-2 rounded-2xl overflow-hidden ${
                        allImages.length === 1
                          ? 'grid-cols-1 max-h-96'
                          : allImages.length === 2
                          ? 'grid-cols-2 max-h-72'
                          : 'grid-cols-2 sm:grid-cols-3 max-h-80'
                      }`}
                    >
                      {allImages.map((imgUrl, i) => (
                        <div
                          key={i}
                          onClick={() => handlePreviewImage(imgUrl, allImages)}
                          className="relative group cursor-pointer overflow-hidden bg-slate-900 aspect-video rounded-xl"
                        >
                          <img
                            src={imgUrl}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                            <Eye className="w-6 h-6" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Attached Files List */}
                  {act.attachments && act.attachments.length > 0 && (
                    <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-2">
                      <div className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                        <span>Tài liệu & Kế hoạch đính kèm ({act.attachments.length})</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {act.attachments.map((file) => (
                          <div
                            key={file.id}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="p-1.5 rounded-lg bg-orange-100 text-orange-700 text-[10px] font-black uppercase">
                                {file.type}
                              </span>
                              <div className="truncate">
                                <div className="text-xs font-bold text-slate-900 truncate">{file.name}</div>
                                <div className="text-[10px] text-slate-400">{file.size}</div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0 ml-2">
                              <button
                                onClick={() => setPreviewFile(file)}
                                className="p-1.5 rounded-lg bg-slate-50 hover:bg-orange-50 text-slate-600 hover:text-orange-700 border border-slate-200 transition-colors cursor-pointer"
                                title="Xem tài liệu"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <a
                                href={file.url}
                                download={file.name}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded-lg bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-700 border border-slate-200 transition-colors"
                                title="Tải về"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Activity Registration Panel */}
                  {act.registrationEnabled !== false && (
                    <div className="rounded-2xl bg-blue-50/70 border border-blue-100 p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-blue-600" />
                          <span className="font-bold text-xs text-blue-950">
                            Đăng ký tham gia:{' '}
                            <strong className="text-blue-700 font-black">
                              {activeRegs.length}{' '}
                              {act.maxParticipants ? `/ ${act.maxParticipants}` : ''} học sinh
                            </strong>
                          </span>

                          {act.registrationDeadline && (
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                isDeadlinePassed
                                  ? 'bg-rose-100 text-rose-700'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {isDeadlinePassed ? 'Hết hạn đăng ký' : `Hạn: ${act.registrationDeadline}`}
                            </span>
                          )}
                        </div>

                        {/* Registered Avatars Preview */}
                        {activeRegs.length > 0 && (
                          <div className="flex items-center gap-1.5 pl-6">
                            <div className="flex -space-x-2 overflow-hidden">
                              {activeRegs.slice(0, 5).map((reg) => (
                                <img
                                  key={reg.id}
                                  src={reg.studentAvatar}
                                  alt={reg.studentName}
                                  title={`${reg.studentName} (${reg.groupOrTeam})`}
                                  className="inline-block h-6 w-6 rounded-full ring-2 ring-white object-cover"
                                />
                              ))}
                            </div>
                            {activeRegs.length > 5 && (
                              <span className="text-[11px] text-blue-600 font-semibold">
                                +{activeRegs.length - 5} học sinh khác
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Registration Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Teacher: View Full List */}
                        {isTeacher && (
                          <button
                            onClick={() => setSelectedActivityForRegistrations(act)}
                            className="flex items-center gap-1.5 rounded-xl bg-white border border-blue-200 px-3.5 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-50 shadow-2xs transition-all cursor-pointer"
                          >
                            <Users className="h-3.5 w-3.5" />
                            <span>Danh sách đăng ký ({activeRegs.length})</span>
                          </button>
                        )}

                        {/* Student actions */}
                        {isStudent && (
                          <>
                            {isRegistered ? (
                              <div className="flex items-center gap-2">
                                <span className="flex items-center gap-1 rounded-xl bg-emerald-100 border border-emerald-200 px-3 py-1.5 text-xs font-bold text-emerald-800">
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                  <span>Đã đăng ký</span>
                                </span>
                                {!isDeadlinePassed && (
                                  <button
                                    onClick={() => handleCancelMyRegistration(act.id)}
                                    className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors cursor-pointer"
                                  >
                                    Hủy
                                  </button>
                                )}
                              </div>
                            ) : isDeadlinePassed ? (
                              <span className="rounded-xl bg-slate-100 border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-500">
                                Đã hết hạn đăng ký
                              </span>
                            ) : isFull ? (
                              <span className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs font-bold text-amber-700">
                                Đã đủ số lượng
                              </span>
                            ) : (
                              <button
                                onClick={() => setSelectedActivityForStudentRegister(act)}
                                className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-1.5 text-xs font-bold text-white shadow-xs transition-all active:scale-95 cursor-pointer"
                              >
                                <UserPlus className="h-3.5 w-3.5" />
                                <span>Đăng ký tham gia</span>
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Reaction Summary & Action Bar */}
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    {/* Reactions Toolbar */}
                    <div className="flex items-center gap-1 sm:gap-2">
                      <button
                        onClick={() => handleToggleReaction(act.id, 'love')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isLoved
                            ? 'bg-rose-50 text-rose-600 border border-rose-200 shadow-2xs'
                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${isLoved ? 'fill-rose-500 text-rose-500' : ''}`} />
                        <span>Thả tim {loveCount > 0 ? `(${loveCount})` : ''}</span>
                      </button>

                      <button
                        onClick={() => handleToggleReaction(act.id, 'applause')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isApplause
                            ? 'bg-amber-50 text-amber-600 border border-amber-200 shadow-2xs'
                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        <Award className={`w-3.5 h-3.5 ${isApplause ? 'fill-amber-500 text-amber-500' : ''}`} />
                        <span>Cổ vũ {applauseCount > 0 ? `(${applauseCount})` : ''}</span>
                      </button>

                      <button
                        onClick={() => handleToggleReaction(act.id, 'celebrate')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isCelebrated
                            ? 'bg-purple-50 text-purple-600 border border-purple-200 shadow-2xs'
                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        <PartyPopper className={`w-3.5 h-3.5 ${isCelebrated ? 'text-purple-600' : ''}`} />
                        <span>Chúc mừng {celebrateCount > 0 ? `(${celebrateCount})` : ''}</span>
                      </button>
                    </div>

                    {/* Comments and Share buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          setOpenComments((prev) => ({ ...prev, [act.id]: !prev[act.id] }))
                        }
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 cursor-pointer transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-slate-500" />
                        <span>Bình luận ({act.comments?.length || 0})</span>
                      </button>

                      <button
                        onClick={() => handleOpenShare(act)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 cursor-pointer transition-colors"
                      >
                        <Share2 className="w-3.5 h-3.5 text-blue-600" />
                        <span>Chia sẻ Zalo</span>
                      </button>
                    </div>
                  </div>

                  {/* Expandable Comments Section */}
                  {isCommentsOpen && (
                    <div className="pt-3 border-t border-slate-100 space-y-3 animate-fade-in">
                      {/* Comments List */}
                      {act.comments && act.comments.length > 0 ? (
                        <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                          {act.comments.map((comment) => (
                            <div
                              key={comment.id}
                              className="flex items-start gap-2.5 p-2.5 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs"
                            >
                              <img
                                src={comment.authorAvatar}
                                alt={comment.authorName}
                                referrerPolicy="no-referrer"
                                className="w-7 h-7 rounded-xl object-cover border border-slate-200 shrink-0"
                              />
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-extrabold text-slate-900">
                                      {comment.authorName}
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                      • {comment.createdAt}
                                    </span>
                                  </div>
                                </div>
                                <p className="text-slate-700 mt-1 font-medium leading-relaxed">
                                  {comment.content}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic text-center py-2">
                          Chưa có bình luận nào. Hãy là người đầu tiên trao đổi về hoạt động này!
                        </p>
                      )}

                      {/* Comment Input Box */}
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={commentInputs[act.id] || ''}
                          onChange={(e) =>
                            setCommentInputs((prev) => ({ ...prev, [act.id]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSendComment(act.id);
                          }}
                          placeholder="Viết trao đổi / ý kiến về hoạt động này..."
                          className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 bg-white focus:border-orange-500 focus:outline-hidden"
                        />
                        <button
                          onClick={() => handleSendComment(act.id)}
                          className="p-2 rounded-xl bg-orange-600 text-white hover:bg-orange-700 transition-colors cursor-pointer"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
            <Sparkles className="w-12 h-12 text-orange-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">Chưa có hoạt động phong trào nào</h3>
            <p className="text-xs text-slate-500 mt-1">
              Thầy cô hoặc Ban cán sự lớp có thể bấm "Tạo hoạt động mới" để phát động phong trào thi đua.
            </p>
          </div>
        )}
      </div>
      </>
      )}

      {/* Create / Edit Activity Modal */}
      {isCreateModalOpen && (
        <ActivityCreateModal
          isOpen={isCreateModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false);
            setEditingPost(null);
          }}
          currentUser={currentUser}
          editingPost={editingPost}
        />
      )}

      {/* Teacher / Admin Registrations Management Modal */}
      {selectedActivityForRegistrations && (
        <ActivityRegistrationsModal
          activity={selectedActivityForRegistrations}
          onClose={() => setSelectedActivityForRegistrations(null)}
        />
      )}

      {/* Student Activity Register Modal */}
      {selectedActivityForStudentRegister && (
        <StudentActivityRegisterModal
          activity={selectedActivityForStudentRegister}
          currentUser={currentUser}
          onClose={() => setSelectedActivityForStudentRegister(null)}
          onSuccess={() => {
            setActivities(activityService.getAll());
          }}
        />
      )}

      {/* Universal Share Dialog with 4-line format */}
      {shareDialogData.isOpen && (
        <ShareDialog
          isOpen={shareDialogData.isOpen}
          onClose={() => setShareDialogData((prev) => ({ ...prev, isOpen: false }))}
          title={shareDialogData.title}
          content={shareDialogData.content}
        />
      )}

      {/* Universal File Viewer */}
      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          isOpen={true}
          onClose={() => setPreviewFile(null)}
          gallery={previewGallery.length > 0 ? previewGallery : undefined}
          onSelectGalleryItem={(item) => setPreviewFile(item)}
        />
      )}

      {/* Confirm Delete Activity Modal */}
      <ConfirmDeleteModal
        isOpen={!!activityToDelete}
        title="Xác nhận xóa hoạt động phong trào"
        itemName={activityToDelete?.title}
        message="Thầy/Cô có chắc chắn muốn xóa hoạt động phong trào này? Toàn bộ danh sách đăng ký và đánh giá liên quan sẽ bị xóa khỏi hệ thống."
        confirmText="Xác nhận xóa"
        cancelText="Hủy bỏ"
        onConfirm={confirmDeleteActivity}
        onClose={() => setActivityToDelete(null)}
      />

      {/* Confirm Cancel Registration Modal */}
      <ConfirmDeleteModal
        isOpen={!!registrationToCancel}
        title="Hủy đăng ký tham gia hoạt động"
        message="Bạn có chắc chắn muốn hủy đăng ký tham gia hoạt động phong trào này không?"
        confirmText="Hủy đăng ký"
        cancelText="Quay lại"
        isDestructive={false}
        onConfirm={confirmCancelRegistration}
        onClose={() => setRegistrationToCancel(null)}
      />
    </div>
  );
};
