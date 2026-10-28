/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Sparkles,
  Clock,
  ExternalLink,
  Milestone,
  Check,
  Info,
  Star
} from 'lucide-react';
import { TimelineMilestone } from '../../types';
import { classService } from '../../services/ClassService';
import { authService } from '../../services/AuthService';
import { ModalLayout } from '../common/ModalLayout';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';
import {
  parseEventDateToTimestamp,
  formatMilestoneDisplayDate,
  evaluateMilestoneStatus
} from '../../services/SchoolYearDateNormalizer';

interface ClassYearTimelineProps {
  onOpenFilePreview?: (file: any) => void;
}

export const ClassYearTimeline: React.FC<ClassYearTimelineProps> = ({ onOpenFilePreview }) => {
  const [milestones, setMilestones] = useState<TimelineMilestone[]>(classService.getMilestones());
  const [currentTimeMs, setCurrentTimeMs] = useState<number>(Date.now());
  const currentUser = authService.getCurrentUser();
  const isTeacher = currentUser.role === 'TEACHER' || (currentUser.role as any) === 'SUPER_ADMIN';

  const [selectedMilestone, setSelectedMilestone] = useState<TimelineMilestone | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingMilestone, setEditingMilestone] = useState<Partial<TimelineMilestone>>({});
  const [deletingMilestone, setDeletingMilestone] = useState<TimelineMilestone | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const currentMilestoneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return classService.subscribe(() => {
      setMilestones(classService.getMilestones());
    });
  }, []);

  // Update time periodically (every 30 seconds) and when window/tab regains focus or becomes visible
  useEffect(() => {
    const updateTime = () => setCurrentTimeMs(Date.now());

    const interval = setInterval(updateTime, 30000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateTime();
      }
    };
    const handleFocus = () => updateTime();

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Sort milestones chronologically by event date (ascending)
  const sortedMilestones = useMemo(() => {
    return [...milestones].sort((a, b) => {
      const diff = parseEventDateToTimestamp(a.date) - parseEventDateToTimestamp(b.date);
      if (diff !== 0) return diff;
      return (a.id || '').localeCompare(b.id || '');
    });
  }, [milestones]);

  // Compute automatic runtime status for each milestone without altering underlying database data
  const milestonesWithStatus = useMemo(() => {
    return sortedMilestones.map((m) => {
      const computedStatus = evaluateMilestoneStatus(m, currentTimeMs);
      return {
        ...m,
        computedStatus
      };
    });
  }, [sortedMilestones, currentTimeMs]);

  // Auto-scroll to the current milestone on mount or when current milestone changes
  useEffect(() => {
    if (currentMilestoneRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const target = currentMilestoneRef.current;
      const leftOffset = target.offsetLeft - container.offsetWidth / 2 + target.offsetWidth / 2;
      container.scrollTo({ left: Math.max(0, leftOffset), behavior: 'smooth' });
    }
  }, [milestonesWithStatus]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const scrollAmount = container.clientWidth * 0.75;
      container.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const handleOpenAdd = () => {
    setEditingMilestone({
      title: '',
      date: new Date().toLocaleDateString('vi-VN'),
      description: '',
      status: 'upcoming',
      category: 'activity',
      images: []
    });
    setIsEditing(true);
    setSelectedMilestone(null);
  };

  const handleOpenEdit = (m: TimelineMilestone, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingMilestone({ ...m });
    setIsEditing(true);
    setSelectedMilestone(null);
  };

  const handleDelete = (m: TimelineMilestone, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDeletingMilestone(m);
  };

  const handleConfirmDelete = () => {
    if (!deletingMilestone) return;
    const idToDelete = deletingMilestone.id;
    classService.deleteMilestone(idToDelete);
    setMilestones(classService.getMilestones());
    if (selectedMilestone?.id === idToDelete) {
      setSelectedMilestone(null);
    }
    setDeletingMilestone(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMilestone.title?.trim() || !editingMilestone.date?.trim()) return;

    if (editingMilestone.id) {
      classService.updateMilestone(editingMilestone.id, editingMilestone);
    } else {
      classService.addMilestone({
        title: editingMilestone.title || '',
        date: editingMilestone.date || '',
        startDate: editingMilestone.startDate,
        endDate: editingMilestone.endDate,
        description: editingMilestone.description || '',
        status: editingMilestone.status || 'upcoming',
        category: editingMilestone.category || 'activity',
        images: editingMilestone.images || []
      });
    }

    setMilestones(classService.getMilestones());
    setIsEditing(false);
    setEditingMilestone({});
  };

  /**
   * Status badge styling:
   * 1. Đã hoàn thành: Xanh lá dịu (Emerald/Green), thể hiện sự kiện đã kết thúc
   * 2. Đang diễn ra: Màu cam nổi bật (Amber/Orange) kết hợp dấu sao ★
   * 3. Sắp diễn ra: Màu trung tính hoặc xanh dương nhạt (Slate/Sky)
   * 4. Chưa xác định: Màu xám trung tính an toàn (khi thiếu ngày hoặc ngày không hợp lệ)
   */
  const getStatusBadge = (status: 'completed' | 'current' | 'upcoming' | 'unknown' | string) => {
    if (status === 'completed') {
      return {
        text: 'Đã hoàn thành',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
        nodeClass: 'bg-emerald-500 text-white shadow-xs',
        cardBorder: 'border-emerald-200/80 bg-emerald-50/20 hover:border-emerald-300 hover:shadow-2xs',
        titleClass: 'text-slate-900',
        dot: 'bg-emerald-500'
      };
    }
    if (status === 'current') {
      return {
        text: 'Đang diễn ra',
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 font-extrabold shadow-2xs',
        nodeClass: 'bg-amber-500 text-white ring-4 ring-amber-200 shadow-xs animate-pulse',
        cardBorder: 'border-amber-400 bg-amber-50/40 shadow-sm ring-2 ring-amber-400/30 scale-[1.01]',
        titleClass: 'text-amber-950 font-black',
        dot: 'bg-amber-500'
      };
    }
    if (status === 'upcoming') {
      return {
        text: 'Sắp diễn ra',
        badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
        nodeClass: 'bg-slate-200 text-slate-700',
        cardBorder: 'border-slate-200 bg-slate-50/60 hover:bg-white hover:border-slate-300',
        titleClass: 'text-slate-700',
        dot: 'bg-sky-400'
      };
    }
    return {
      text: 'Chưa xác định',
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
      nodeClass: 'bg-slate-200 text-slate-500',
      cardBorder: 'border-slate-200 bg-slate-50/40 hover:bg-white hover:border-slate-300',
      titleClass: 'text-slate-600',
      dot: 'bg-slate-400'
    };
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs overflow-hidden">
      {/* Header with Navigation Arrows */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-200/60 shadow-2xs">
            <Milestone className="h-4.5 w-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-tight">
                Hành trình năm học
              </h3>
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                {sortedMilestones.length} mốc
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Con chạy tiến trình sự kiện, kỳ thi & phong trào năm học
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Scroll Navigation Buttons */}
          <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1">
            <button
              onClick={() => handleScroll('left')}
              className="flex h-7 w-7 items-center justify-center rounded-xl text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-2xs transition-all cursor-pointer"
              title="Cuộn sang trái"
              aria-label="Sang trái"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleScroll('right')}
              className="flex h-7 w-7 items-center justify-center rounded-xl text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-2xs transition-all cursor-pointer"
              title="Cuộn sang phải"
              aria-label="Sang phải"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {isTeacher && (
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 rounded-2xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-blue-700 shadow-2xs transition-all cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Thêm mốc</span>
            </button>
          )}
        </div>
      </div>

      {/* Horizontal Carousel Track */}
      <div className="relative">
        <div
          ref={scrollContainerRef}
          className="flex items-stretch gap-3 overflow-x-auto pb-2 pt-1 scrollbar-none snap-x snap-mandatory scroll-smooth"
        >
          {milestonesWithStatus.map((m, idx) => {
            const isCompleted = m.computedStatus === 'completed';
            const isCurrent = m.computedStatus === 'current';
            const badge = getStatusBadge(m.computedStatus);

            return (
              <div
                key={m.id}
                ref={isCurrent ? currentMilestoneRef : undefined}
                onClick={() => setSelectedMilestone(m)}
                className={`relative snap-start shrink-0 w-[240px] sm:w-[260px] md:w-[280px] rounded-2xl border p-4 cursor-pointer transition-all duration-200 flex flex-col justify-between ${badge.cardBorder}`}
              >
                <div>
                  {/* Top Node Indicator & Status */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        {/* Star ★ indicator above current milestone */}
                        {isCurrent && (
                          <div
                            className="absolute -top-3.5 left-1/2 -translate-x-1/2 flex items-center justify-center text-amber-500 font-black text-xs leading-none drop-shadow-xs"
                            title="Mốc đang diễn ra"
                          >
                            ★
                          </div>
                        )}
                        <div
                          className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black ${badge.nodeClass}`}
                        >
                          {isCompleted ? <Check className="h-3.5 w-3.5" /> : isCurrent ? <Star className="h-3 w-3 fill-current" /> : idx + 1}
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-slate-500">
                        {formatMilestoneDisplayDate(m.date, m.endDate)}
                      </span>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] border ${badge.badgeClass}`}
                    >
                      {isCurrent && <span className="text-amber-600 font-black leading-none">★</span>}
                      {badge.text}
                    </span>
                  </div>

                  {/* Title & Preview */}
                  <h4
                    className={`text-xs sm:text-sm leading-tight line-clamp-2 ${badge.titleClass}`}
                  >
                    {m.title}
                  </h4>

                  {m.description && (
                    <p className="mt-1.5 text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                      {m.description}
                    </p>
                  )}
                </div>

                {/* Bottom Footer Card Tag */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                  <span>Xem chi tiết mốc</span>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Milestone Detail Modal */}
      {selectedMilestone && !isEditing && (
        <ModalLayout
          isOpen={true}
          onClose={() => setSelectedMilestone(null)}
          title={selectedMilestone.title}
          subtitle={`Thời gian: ${formatMilestoneDisplayDate(selectedMilestone.date, selectedMilestone.endDate)}`}
          icon={Milestone}
          maxWidthClass="max-w-xl"
          headerActions={
            isTeacher ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleOpenEdit(selectedMilestone)}
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                  title="Chỉnh sửa mốc"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(selectedMilestone)}
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
                  title="Xóa mốc"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ) : undefined
          }
          footer={
            <button
              onClick={() => setSelectedMilestone(null)}
              className="rounded-2xl bg-slate-200 px-5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-300 transition-colors cursor-pointer"
            >
              Đóng
            </button>
          }
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {(() => {
                const computed = evaluateMilestoneStatus(selectedMilestone, currentTimeMs);
                const modalBadge = getStatusBadge(computed);
                return (
                  <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black border ${modalBadge.badgeClass}`}>
                    {computed === 'current' && <span className="text-amber-600 font-black">★</span>}
                    {modalBadge.text}
                  </span>
                );
              })()}
              <span className="text-xs font-bold text-slate-500">
                Phân loại: {selectedMilestone.category === 'academic' ? 'Học tập & Kiểm tra' : selectedMilestone.category === 'ceremony' ? 'Lễ hội & Khai giảng' : 'Hoạt động phong trào'}
              </span>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200">
              <h5 className="text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-blue-600" />
                Nội dung & Kế hoạch chi tiết
              </h5>
              <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                {selectedMilestone.description || 'Chưa có thông tin mô tả chi tiết cho mốc thời gian này.'}
              </p>
            </div>

            {selectedMilestone.images && selectedMilestone.images.length > 0 && (
              <div>
                <h5 className="text-xs font-bold text-slate-800 mb-2">Hình ảnh lưu niệm</h5>
                <div className="grid grid-cols-2 gap-2">
                  {selectedMilestone.images.map((img, i) => (
                    <img
                      key={i}
                      src={img}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="h-36 w-full rounded-2xl object-cover border border-slate-200"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </ModalLayout>
      )}

      {/* Milestone Add/Edit Modal */}
      {isEditing && (
        <ModalLayout
          isOpen={true}
          onClose={() => setIsEditing(false)}
          title={editingMilestone.id ? 'Chỉnh sửa Mốc sự kiện' : 'Thêm Mốc sự kiện Năm học'}
          subtitle="Cập nhật tiến trình con chạy hành trình năm học"
          icon={Calendar}
          maxWidthClass="max-w-lg"
          footer={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="rounded-2xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="rounded-2xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-xs transition-colors"
              >
                Lưu mốc thời gian
              </button>
            </div>
          }
        >
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tên sự kiện / Mốc thời gian <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={editingMilestone.title || ''}
                onChange={(e) => setEditingMilestone({ ...editingMilestone, title: e.target.value })}
                placeholder="VD: Kiểm tra Cuối Học kỳ I"
                className="w-full rounded-2xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-hidden"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Thời gian / Ngày <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingMilestone.date || ''}
                  onChange={(e) => setEditingMilestone({ ...editingMilestone, date: e.target.value })}
                  placeholder="VD: 22/12/2026"
                  className="w-full rounded-2xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-hidden"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Trạng thái
                </label>
                <select
                  value={editingMilestone.status || 'upcoming'}
                  onChange={(e) => setEditingMilestone({ ...editingMilestone, status: e.target.value as any })}
                  className="w-full rounded-2xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-hidden bg-white"
                >
                  <option value="completed">Đã hoàn thành</option>
                  <option value="current">Đang diễn ra (Nổi bật)</option>
                  <option value="upcoming">Sắp diễn ra</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Kế hoạch / Nội dung tóm tắt
              </label>
              <textarea
                value={editingMilestone.description || ''}
                onChange={(e) => setEditingMilestone({ ...editingMilestone, description: e.target.value })}
                placeholder="Ghi chú kế hoạch thực hiện, mục tiêu của lớp..."
                rows={3}
                className="w-full rounded-2xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-hidden"
              />
            </div>
          </form>
        </ModalLayout>
      )}

      {/* Confirmation Modal for Milestone Deletion */}
      {deletingMilestone && (
        <ConfirmDeleteModal
          isOpen={true}
          title="Xác nhận xóa mốc sự kiện"
          itemName={`${deletingMilestone.title} (${formatMilestoneDisplayDate(deletingMilestone.date, deletingMilestone.endDate)})`}
          message="Bạn có chắc chắn muốn xóa mốc sự kiện này khỏi tiến trình Hành trình năm học? Thao tác này sẽ cập nhật ngay lập tức cho toàn bộ lớp."
          confirmText="Xóa mốc sự kiện"
          cancelText="Hủy bỏ"
          onConfirm={handleConfirmDelete}
          onClose={() => setDeletingMilestone(null)}
          isDestructive={true}
        />
      )}
    </div>
  );
};
