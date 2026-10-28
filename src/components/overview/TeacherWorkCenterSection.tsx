/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  CheckCircle2,
  Circle,
  Edit3,
  Trash2,
  X,
  Check,
  RefreshCw,
  CalendarDays,
  ListFilter,
  CalendarRange,
  Users,
  Award,
  BookOpen,
  FileCheck,
  AlertCircle
} from 'lucide-react';
import {
  teacherWorkCenterClient,
  TeacherPersonalTask,
  HomeroomEventCategory
} from '../../services/TeacherWorkCenterClient';
import { activityService } from '../../services/ActivityService';
import { parentCommunicationService } from '../../services/ParentCommunicationService';
import { authService } from '../../services/AuthService';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';
import { UserRole, ActivityPost, ParentAnnouncement } from '../../types';
import { parseDateToTimestamp } from '../../services/SchoolYearDateNormalizer';

interface TeacherWorkCenterSectionProps {
  currentUserRole: UserRole;
  currentClassId?: string;
  onNavigateToModule: (module: string, params?: Record<string, any>) => void;
}

type ViewMode = 'MONTH' | 'WEEK' | 'LIST';

type CategoryFilterType = 'ALL' | HomeroomEventCategory;

interface UnifiedEvent {
  id: string;
  source: 'TASK' | 'ACTIVITY' | 'PARENT';
  sourceLabel?: string;
  originalId: string;
  title: string;
  category: HomeroomEventCategory | string;
  categoryLabel: string;
  categoryColor: {
    bg: string;
    text: string;
    border: string;
    dot: string;
    badge: string;
  };
  date: string; // YYYY-MM-DD
  startTime?: string | null;
  endTime?: string | null;
  isAllDay: boolean;
  location?: string | null;
  notes?: string | null;
  priority?: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';
  isCompleted: boolean;
  isOverdue: boolean;
  rawTask?: TeacherPersonalTask;
  rawActivity?: ActivityPost;
  rawAnnouncement?: ParentAnnouncement;
}

const CATEGORY_CONFIG: Record<
  HomeroomEventCategory,
  { label: string; bg: string; text: string; border: string; dot: string; badge: string }
> = {
  HOMEROOM: {
    label: 'Công tác chủ nhiệm',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
    badge: 'bg-blue-100 text-blue-800'
  },
  PARENT_MEETING: {
    label: 'Họp phụ huynh',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
    badge: 'bg-amber-100 text-amber-800'
  },
  CLASS_MEETING: {
    label: 'Họp lớp',
    bg: 'bg-teal-50',
    text: 'text-teal-700',
    border: 'border-teal-200',
    dot: 'bg-teal-500',
    badge: 'bg-teal-100 text-teal-800'
  },
  EXAM_SURVEY: {
    label: 'Kiểm tra / Khảo sát',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    dot: 'bg-rose-500',
    badge: 'bg-rose-100 text-rose-800'
  },
  EXTRACURRICULAR: {
    label: 'Ngoại khóa & Đoàn đội',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-100 text-emerald-800'
  },
  PERSONAL: {
    label: 'Việc cá nhân',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    dot: 'bg-purple-500',
    badge: 'bg-purple-100 text-purple-800'
  }
};

const DEFAULT_CATEGORY_COLOR = {
  label: 'Khác',
  bg: 'bg-slate-50',
  text: 'text-slate-700',
  border: 'border-slate-200',
  dot: 'bg-slate-500',
  badge: 'bg-slate-100 text-slate-800'
};

const getCategoryDetails = (categoryKey?: string) => {
  if (!categoryKey) return CATEGORY_CONFIG.HOMEROOM;
  const upper = categoryKey.toUpperCase();
  if (upper in CATEGORY_CONFIG) {
    return CATEGORY_CONFIG[upper as HomeroomEventCategory];
  }
  // Mapping for vietnamese activity categories
  if (categoryKey === 'Phong trào' || categoryKey === 'Thể thao' || categoryKey === 'Văn nghệ' || categoryKey === 'Tình nguyện') {
    return CATEGORY_CONFIG.EXTRACURRICULAR;
  }
  if (categoryKey === 'Học thuật' || categoryKey.includes('Khảo sát') || categoryKey.includes('Kiểm tra')) {
    return CATEGORY_CONFIG.EXAM_SURVEY;
  }
  if (categoryKey.includes('Phụ huynh')) {
    return CATEGORY_CONFIG.PARENT_MEETING;
  }
  if (categoryKey.includes('Lớp') || categoryKey.includes('Chi đoàn')) {
    return CATEGORY_CONFIG.CLASS_MEETING;
  }
  return DEFAULT_CATEGORY_COLOR;
};

const PRIORITY_CONFIG: Record<
  'URGENT' | 'HIGH' | 'NORMAL' | 'LOW',
  { label: string; badge: string; dot: string; icon: string; border: string; bg: string }
> = {
  URGENT: {
    label: 'Rất quan trọng',
    badge: 'bg-rose-50 text-rose-700 border-rose-200 ring-1 ring-rose-300',
    dot: 'bg-rose-500',
    icon: '🔴',
    border: 'border-rose-300',
    bg: 'bg-rose-50/70'
  },
  HIGH: {
    label: 'Quan trọng',
    badge: 'bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-300',
    dot: 'bg-amber-500',
    icon: '🟡',
    border: 'border-amber-300',
    bg: 'bg-amber-50/70'
  },
  NORMAL: {
    label: 'Bình thường',
    badge: 'bg-slate-50 text-slate-700 border-slate-200',
    dot: 'bg-slate-400',
    icon: '⚪',
    border: 'border-slate-200',
    bg: 'bg-white'
  },
  LOW: {
    label: 'Bình thường',
    badge: 'bg-slate-50 text-slate-700 border-slate-200',
    dot: 'bg-slate-400',
    icon: '⚪',
    border: 'border-slate-200',
    bg: 'bg-white'
  }
};

const getPriorityDetails = (priority?: string) => {
  if (!priority) return PRIORITY_CONFIG.NORMAL;
  const upper = priority.toUpperCase();
  if (upper in PRIORITY_CONFIG) {
    return PRIORITY_CONFIG[upper as keyof typeof PRIORITY_CONFIG];
  }
  return PRIORITY_CONFIG.NORMAL;
};

export const TeacherWorkCenterSection: React.FC<TeacherWorkCenterSectionProps> = ({
  currentUserRole,
  currentClassId,
  onNavigateToModule
}) => {
  // Strict role check: ONLY TEACHER or SUPER_ADMIN
  const isAuthorized = currentUserRole === 'TEACHER' || currentUserRole === 'SUPER_ADMIN';
  if (!isAuthorized) {
    return null;
  }

  const [tasks, setTasks] = useState<TeacherPersonalTask[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('MONTH');
  const [listTab, setListTab] = useState<'TODO' | 'DONE'>('TODO');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilterType>('ALL');
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<'ALL' | 'URGENT' | 'HIGH' | 'NORMAL'>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'ALL' | 'TODO' | 'TODAY' | 'OVERDUE' | 'DONE'>('ALL');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modal States
  const [isEventModalOpen, setIsEventModalOpen] = useState<boolean>(false);
  const [editingEvent, setEditingEvent] = useState<UnifiedEvent | null>(null);
  const [eventToDelete, setEventToDelete] = useState<UnifiedEvent | null>(null);
  const [selectedDetailEvent, setSelectedDetailEvent] = useState<UnifiedEvent | null>(null);

  // Event Form State
  const [eventForm, setEventForm] = useState({
    title: '',
    category: 'HOMEROOM' as HomeroomEventCategory,
    due_date: new Date().toISOString().split('T')[0],
    is_all_day: false,
    start_time: '07:30',
    end_time: '09:00',
    location: '',
    notes: '',
    priority: 'NORMAL' as 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW'
  });
  const [savingEvent, setSavingEvent] = useState<boolean>(false);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(prev => (prev?.text === text ? null : prev));
    }, 3500);
  };

  const [activitiesList, setActivitiesList] = useState<ActivityPost[]>([]);
  const [announcementsList, setAnnouncementsList] = useState<ParentAnnouncement[]>([]);

  // Helpers for parsing date and time
  const parseDateToISO = (dateStr?: string): string => {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    const matchSlash = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (matchSlash) {
      const d = matchSlash[1].padStart(2, '0');
      const m = matchSlash[2].padStart(2, '0');
      const y = matchSlash[3];
      return `${y}-${m}-${d}`;
    }
    const matchDash = dateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4})/);
    if (matchDash) {
      const d = matchDash[1].padStart(2, '0');
      const m = matchDash[2].padStart(2, '0');
      const y = matchDash[3];
      return `${y}-${m}-${d}`;
    }
    return dateStr.split('T')[0] || new Date().toISOString().split('T')[0];
  };

  const extractTime = (timeStr?: string, contentStr?: string): string | null => {
    if (timeStr && /^\d{1,2}:\d{2}$/.test(timeStr)) return timeStr;
    if (!contentStr) return null;
    const match = contentStr.match(/(\d{1,2})[h:](\d{2})/i);
    if (match) {
      return `${match[1].padStart(2, '0')}:${match[2]}`;
    }
    return null;
  };

  // Load all events (Tasks, Activities, Parent Bridge)
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const taskList = await teacherWorkCenterClient.getTasks('ALL');
      setTasks(taskList || []);
      setActivitiesList(activityService.getAll() || []);
      setAnnouncementsList(parentCommunicationService.getAnnouncements() || []);
    } catch (err) {
      console.error('[LOAD-SCHEDULE-ERROR]', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const unsubActivity = activityService.subscribe(loadData);
    const unsubParent = parentCommunicationService.subscribe(loadData);
    return () => {
      unsubActivity();
      unsubParent();
    };
  }, [loadData]);

  // Aggregate Unified Events with Strict Deduplication
  const allEvents: UnifiedEvent[] = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const eventMap = new Map<string, UnifiedEvent>();

    // 1. Homeroom Personal Tasks
    for (const t of tasks) {
      const dateVal = parseDateToISO(t.due_date || t.created_at?.split('T')[0] || todayStr);
      const catConfig = getCategoryDetails(t.category);
      const isDone = t.status === 'DONE';
      const isOverdue = !isDone && dateVal < todayStr;
      const uniqueKey = `TASK_${t.id}`;

      eventMap.set(uniqueKey, {
        id: `task_${t.id}`,
        source: 'TASK',
        sourceLabel: 'Việc chủ nhiệm',
        originalId: t.id,
        title: t.title,
        category: (t.category as HomeroomEventCategory) || 'HOMEROOM',
        categoryLabel: catConfig.label,
        categoryColor: catConfig,
        date: dateVal,
        startTime: t.start_time || null,
        endTime: t.end_time || null,
        isAllDay: !!t.is_all_day || (!t.start_time && !t.end_time),
        location: t.location || null,
        notes: t.notes || null,
        priority: t.priority || 'NORMAL',
        isCompleted: isDone,
        isOverdue,
        rawTask: t
      });
    }

    // 2. Class Activities from ActivityService (Hoạt động phong trào)
    try {
      for (const act of activitiesList) {
        const rawDate = act.startDate || act.createdAt?.split(' ')[0] || todayStr;
        const dateVal = parseDateToISO(rawDate);
        const catConfig = CATEGORY_CONFIG.EXTRACURRICULAR;
        const isDone = !!act.isCompleted;
        const isOverdue = !isDone && dateVal < todayStr;
        const uniqueKey = `ACTIVITY_${act.id}`;

        if (!eventMap.has(uniqueKey)) {
          eventMap.set(uniqueKey, {
            id: `act_${act.id}`,
            source: 'ACTIVITY',
            sourceLabel: 'Hoạt động phong trào',
            originalId: act.id,
            title: act.title,
            category: 'EXTRACURRICULAR',
            categoryLabel: `Phong trào: ${act.category || 'Hoạt động'}`,
            categoryColor: catConfig,
            date: dateVal,
            startTime: act.startTime || extractTime(undefined, act.content) || null,
            endTime: act.endTime || null,
            isAllDay: !!act.isAllDay || (!act.startTime && !act.endTime),
            location: act.location || null,
            notes: act.content || null,
            priority: 'NORMAL',
            isCompleted: isDone,
            isOverdue,
            rawActivity: act
          });
        }
      }
    } catch {
      // ignore
    }

    // 3. Parent Bridge Announcements & Meetings (Nhịp cầu phụ huynh)
    try {
      for (const ann of announcementsList) {
        // Include announcements with eventDate or category containing Lịch / Họp / Phối hợp
        const hasSpecificDate = !!ann.eventDate;
        const isMeetingOrSchedule =
          ann.category === 'Lịch họp phụ huynh' ||
          ann.category === 'Lịch tư vấn' ||
          ann.category === 'Kế hoạch phối hợp' ||
          ann.title.toLowerCase().includes('lịch') ||
          ann.title.toLowerCase().includes('họp');

        if (hasSpecificDate || isMeetingOrSchedule) {
          const rawDate = ann.eventDate || ann.createdAt;
          const dateVal = parseDateToISO(rawDate);
          const catConfig = CATEGORY_CONFIG.PARENT_MEETING;
          const isDone = !!ann.isCompleted;
          const isOverdue = !isDone && dateVal < todayStr;
          const uniqueKey = `PARENT_${ann.id}`;

          if (!eventMap.has(uniqueKey)) {
            eventMap.set(uniqueKey, {
              id: `parent_${ann.id}`,
              source: 'PARENT',
              sourceLabel: 'Nhịp cầu phụ huynh',
              originalId: ann.id,
              title: ann.title,
              category: 'PARENT_MEETING',
              categoryLabel: ann.category || 'Họp phụ huynh',
              categoryColor: catConfig,
              date: dateVal,
              startTime: ann.eventTime || extractTime(undefined, ann.content) || '08:00',
              endTime: null,
              isAllDay: !ann.eventTime && !extractTime(undefined, ann.content),
              location: ann.location || 'Phòng học lớp',
              notes: ann.content || null,
              priority: 'HIGH',
              isCompleted: isDone,
              isOverdue,
              rawAnnouncement: ann
            });
          }
        }
      }
    } catch {
      // ignore
    }

    // Sort by actual event date then time
    const unified = Array.from(eventMap.values());
    return unified.sort((a, b) => {
      const dateDiff = parseDateToTimestamp(a.date) - parseDateToTimestamp(b.date);
      if (dateDiff !== 0) {
        return dateDiff;
      }
      const timeA = a.startTime || '00:00';
      const timeB = b.startTime || '00:00';
      return timeA.localeCompare(timeB);
    });
  }, [tasks, activitiesList, announcementsList]);

  // Filtered Events by Category, Priority & Status
  const filteredEvents = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];

    return allEvents.filter(e => {
      // 1. Category Filter
      if (selectedCategory !== 'ALL') {
        if (selectedCategory === 'HOMEROOM' && !(e.category === 'HOMEROOM' || e.category === 'Công tác chủ nhiệm')) return false;
        if (selectedCategory === 'PARENT_MEETING' && !(e.category === 'PARENT_MEETING' || e.category.includes('Phụ huynh'))) return false;
        if (selectedCategory === 'CLASS_MEETING' && !(e.category === 'CLASS_MEETING' || e.category.includes('Họp lớp'))) return false;
        if (selectedCategory === 'EXAM_SURVEY' && !(e.category === 'EXAM_SURVEY' || e.category === 'Học thuật' || e.category.includes('Kiểm tra'))) return false;
        if (selectedCategory === 'EXTRACURRICULAR' && !(
          e.category === 'EXTRACURRICULAR' ||
          e.category === 'Phong trào' ||
          e.category === 'Thể thao' ||
          e.category === 'Văn nghệ' ||
          e.category === 'Tình nguyện'
        )) return false;
        if (selectedCategory === 'PERSONAL' && !(e.category === 'PERSONAL' || e.category === 'Việc cá nhân')) return false;
      }

      // 2. Priority Filter
      if (selectedPriorityFilter !== 'ALL') {
        const evPriority = (e.priority || 'NORMAL') === 'LOW' ? 'NORMAL' : (e.priority || 'NORMAL');
        if (evPriority !== selectedPriorityFilter) return false;
      }

      // 3. Status / Time Filter
      if (selectedStatusFilter === 'TODO') {
        if (e.isCompleted) return false;
      } else if (selectedStatusFilter === 'TODAY') {
        if (e.date !== todayStr) return false;
      } else if (selectedStatusFilter === 'OVERDUE') {
        if (!e.isOverdue) return false;
      } else if (selectedStatusFilter === 'DONE') {
        if (!e.isCompleted) return false;
      }

      return true;
    });
  }, [allEvents, selectedCategory, selectedPriorityFilter, selectedStatusFilter]);

  // Navigation Handlers
  const handlePrev = () => {
    const next = new Date(currentDate);
    if (viewMode === 'MONTH') {
      next.setMonth(next.getMonth() - 1);
    } else if (viewMode === 'WEEK') {
      next.setDate(next.getDate() - 7);
    } else {
      next.setMonth(next.getMonth() - 1);
    }
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (viewMode === 'MONTH') {
      next.setMonth(next.getMonth() + 1);
    } else if (viewMode === 'WEEK') {
      next.setDate(next.getDate() + 7);
    } else {
      next.setMonth(next.getMonth() + 1);
    }
    setCurrentDate(next);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Open Create Modal
  const handleOpenCreate = (prefillDate?: string) => {
    setEditingEvent(null);
    setEventForm({
      title: '',
      category: 'HOMEROOM',
      due_date: prefillDate || currentDate.toISOString().split('T')[0],
      is_all_day: false,
      start_time: '07:30',
      end_time: '09:00',
      location: 'Phòng học 11A1',
      notes: '',
      priority: 'NORMAL'
    });
    setIsEventModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (event: UnifiedEvent, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingEvent(event);
    setEventForm({
      title: event.title,
      category: (event.category as HomeroomEventCategory) || 'HOMEROOM',
      due_date: event.date || new Date().toISOString().split('T')[0],
      is_all_day: !!event.isAllDay,
      start_time: event.startTime || '07:30',
      end_time: event.endTime || '09:00',
      location: event.location || '',
      notes: event.notes || '',
      priority: event.priority || 'NORMAL'
    });
    setSelectedDetailEvent(null);
    setIsEventModalOpen(true);
  };

  // Toggle Completion
  const handleToggleComplete = async (event: UnifiedEvent, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    const nextIsCompleted = !event.isCompleted;
    const source = event.source;
    const originalId = event.originalId;

    // 1. Optimistic UI update across all sources
    if (source === 'TASK') {
      setTasks(prev =>
        prev.map(t => {
          if (t.id === originalId || `task_${t.id}` === originalId || t.id === originalId.replace(/^task_/, '')) {
            return {
              ...t,
              status: nextIsCompleted ? 'DONE' : 'TODO',
              completed_at: nextIsCompleted ? new Date().toISOString() : null,
              updated_at: new Date().toISOString()
            };
          }
          return t;
        })
      );
    } else if (source === 'ACTIVITY') {
      setActivitiesList(prev =>
        prev.map(a => (a.id === originalId ? { ...a, isCompleted: nextIsCompleted } : a))
      );
    } else if (source === 'PARENT') {
      setAnnouncementsList(prev =>
        prev.map(a => (a.id === originalId ? { ...a, isCompleted: nextIsCompleted } : a))
      );
    }

    if (selectedDetailEvent && (selectedDetailEvent.id === event.id || selectedDetailEvent.originalId === originalId)) {
      setSelectedDetailEvent(prev => (prev ? { ...prev, isCompleted: nextIsCompleted } : null));
    }

    try {
      if (source === 'TASK') {
        await teacherWorkCenterClient.toggleTask(originalId);
      } else if (source === 'ACTIVITY') {
        activityService.updateActivity(originalId, { isCompleted: nextIsCompleted }, authService.getCurrentUser());
      } else if (source === 'PARENT') {
        parentCommunicationService.updateAnnouncement(originalId, { isCompleted: nextIsCompleted });
      }
      await loadData();
      showToast(nextIsCompleted ? 'Đã hoàn thành công việc!' : 'Đã chuyển thành chưa hoàn thành');
    } catch (err: any) {
      showToast(err.message || 'Lỗi cập nhật trạng thái sự kiện', 'error');
      await loadData();
    }
  };

  // Delete Event Request -> Opens Confirmation Modal
  const handleDeleteEvent = (event: UnifiedEvent, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setEventToDelete(event);
  };

  // Confirm Delete Event Execution
  const handleConfirmDeleteEvent = async (event: UnifiedEvent) => {
    const source = event.source;
    const originalId = event.originalId;

    // 1. Optimistic UI update: immediately remove from state
    if (source === 'TASK') {
      setTasks(prev => prev.filter(t => t.id !== originalId && `task_${t.id}` !== originalId && t.id !== originalId.replace(/^task_/, '')));
    } else if (source === 'ACTIVITY') {
      setActivitiesList(prev => prev.filter(a => a.id !== originalId));
    } else if (source === 'PARENT') {
      setAnnouncementsList(prev => prev.filter(a => a.id !== originalId));
    }

    if (selectedDetailEvent && (selectedDetailEvent.id === event.id || selectedDetailEvent.originalId === originalId)) {
      setSelectedDetailEvent(null);
    }
    setEventToDelete(null);

    try {
      if (source === 'TASK') {
        await teacherWorkCenterClient.deleteTask(originalId);
        showToast('Đã xóa công việc khỏi lịch thành công!');
      } else if (source === 'ACTIVITY') {
        const deleted = activityService.deleteActivity(originalId, authService.getCurrentUser());
        if (deleted) {
          showToast('Đã xóa hoạt động phong trào thành công!');
        } else {
          showToast('Không thể xóa hoạt động phong trào', 'error');
        }
      } else if (source === 'PARENT') {
        parentCommunicationService.deleteAnnouncement(originalId);
        showToast('Đã xóa thông báo / lịch phụ huynh thành công!');
      }
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi xóa sự kiện', 'error');
      await loadData();
    }
  };

  // Save Event
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventForm.title.trim()) {
      showToast('Vui lòng nhập tên sự kiện / công việc', 'error');
      return;
    }

    if (savingEvent) return;

    setSavingEvent(true);
    try {
      if (editingEvent) {
        if (editingEvent.source === 'TASK') {
          await teacherWorkCenterClient.updateTask(editingEvent.originalId, {
            title: eventForm.title.trim(),
            category: eventForm.category,
            due_date: eventForm.due_date || undefined,
            start_time: eventForm.is_all_day ? undefined : eventForm.start_time || undefined,
            end_time: eventForm.is_all_day ? undefined : eventForm.end_time || undefined,
            location: eventForm.location.trim() || undefined,
            notes: eventForm.notes.trim() || undefined,
            priority: eventForm.priority,
            is_all_day: eventForm.is_all_day
          });
          showToast('Cập nhật lịch công tác thành công!');
        } else if (editingEvent.source === 'ACTIVITY') {
          activityService.updateActivity(
            editingEvent.originalId,
            {
              title: eventForm.title.trim(),
              startDate: eventForm.due_date,
              startTime: eventForm.is_all_day ? undefined : eventForm.start_time,
              endTime: eventForm.is_all_day ? undefined : eventForm.end_time,
              location: eventForm.location.trim() || undefined,
              content: eventForm.notes.trim() || undefined,
              isAllDay: eventForm.is_all_day
            },
            authService.getCurrentUser()
          );
          showToast('Cập nhật hoạt động phong trào thành công!');
        } else if (editingEvent.source === 'PARENT') {
          parentCommunicationService.updateAnnouncement(editingEvent.originalId, {
            title: eventForm.title.trim(),
            eventDate: eventForm.due_date,
            eventTime: eventForm.is_all_day ? undefined : eventForm.start_time,
            location: eventForm.location.trim() || undefined,
            content: eventForm.notes.trim() || undefined
          });
          showToast('Cập nhật lịch / thông báo phụ huynh thành công!');
        }
      } else {
        await teacherWorkCenterClient.createTask({
          title: eventForm.title.trim(),
          category: eventForm.category,
          due_date: eventForm.due_date || undefined,
          start_time: eventForm.is_all_day ? undefined : eventForm.start_time || undefined,
          end_time: eventForm.is_all_day ? undefined : eventForm.end_time || undefined,
          location: eventForm.location.trim() || undefined,
          notes: eventForm.notes.trim() || undefined,
          priority: eventForm.priority,
          is_all_day: eventForm.is_all_day,
          class_id: currentClassId
        });
        showToast('Lưu công việc vào lịch công tác thành công!');
      }
      setIsEventModalOpen(false);
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi lưu lịch công tác', 'error');
    } finally {
      setSavingEvent(false);
    }
  };

  // Month navigation & matrix calculations
  const monthYearLabel = useMemo(() => {
    const month = currentDate.getMonth() + 1;
    const year = currentDate.getFullYear();
    return `Tháng ${month}, ${year}`;
  }, [currentDate]);

  // Generate Month Grid Matrix (Monday to Sunday)
  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Get day of week: 0 = Sun, 1 = Mon, ..., 6 = Sat
    // Convert to Monday = 0, ..., Sunday = 6
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const daysInMonth = lastDayOfMonth.getDate();

    // Previous month filler days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    const days: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      dateObj: Date;
    }> = [];

    const todayStr = new Date().toISOString().split('T')[0];

    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const prevDate = new Date(year, month - 1, d);
      const dateStr = prevDate.toISOString().split('T')[0];
      days.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        dateObj: prevDate
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const curDate = new Date(year, month, d);
      // Construct date string manually to avoid timezone shift
      const mm = String(month + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      const dateStr = `${year}-${mm}-${dd}`;
      days.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        dateObj: curDate
      });
    }

    // Next month filler days to complete 35 or 42 cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(year, month + 1, i);
      const nextYear = nextDate.getFullYear();
      const nextMonth = String(nextDate.getMonth() + 1).padStart(2, '0');
      const nextDay = String(i).padStart(2, '0');
      const dateStr = `${nextYear}-${nextMonth}-${nextDay}`;
      days.push({
        dateStr,
        dayNumber: i,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        dateObj: nextDate
      });
    }

    return days;
  }, [currentDate]);

  // Week Days (Monday to Sunday)
  const weekDays = useMemo(() => {
    const cur = new Date(currentDate);
    let dayOfWeek = cur.getDay() - 1; // Mon = 0, Sun = 6
    if (dayOfWeek === -1) dayOfWeek = 6;

    const monday = new Date(cur);
    monday.setDate(cur.getDate() - dayOfWeek);

    const days: Array<{
      dateStr: string;
      dayName: string;
      dayNumber: number;
      isToday: boolean;
      dateObj: Date;
    }> = [];

    const todayStr = new Date().toISOString().split('T')[0];
    const dayNames = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dateNum = String(d.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${dateNum}`;
      days.push({
        dateStr,
        dayName: dayNames[i],
        dayNumber: d.getDate(),
        isToday: dateStr === todayStr,
        dateObj: d
      });
    }

    return days;
  }, [currentDate]);

  // Format date helper for agenda/list
  const formatDisplayDate = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split('-');
      const target = new Date(Number(y), Number(m) - 1, Number(d));
      const todayStr = new Date().toISOString().split('T')[0];
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      let prefix = '';
      if (dateStr === todayStr) prefix = 'Hôm nay - ';
      else if (dateStr === tomorrowStr) prefix = 'Ngày mai - ';

      const daysOfWeek = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
      const dayName = daysOfWeek[target.getDay()];

      return `${prefix}${dayName}, ngày ${d}/${m}/${y}`;
    } catch {
      return dateStr;
    }
  };

  // Pending and Completed events counts
  const pendingEventsCount = useMemo(() => {
    return allEvents.filter(e => !e.isCompleted).length;
  }, [allEvents]);

  const completedEventsCount = useMemo(() => {
    return allEvents.filter(e => e.isCompleted).length;
  }, [allEvents]);

  // Group events by date for List view
  const groupedEventsByDate = useMemo(() => {
    const map = new Map<string, UnifiedEvent[]>();
    const items = filteredEvents.filter(ev => {
      if (viewMode === 'LIST') {
        if (listTab === 'TODO') return !ev.isCompleted;
        if (listTab === 'DONE') return ev.isCompleted;
      }
      return true;
    });

    for (const ev of items) {
      if (!map.has(ev.date)) {
        map.set(ev.date, []);
      }
      map.get(ev.date)!.push(ev);
    }
    return Array.from(map.entries());
  }, [filteredEvents, viewMode, listTab]);

  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden transition-all">
      {/* 1. THANH TIÊU ĐỀ (HEADER BAR) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 md:px-6 md:py-5 border-b border-slate-100 bg-white">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-2xs">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Lịch công tác chủ nhiệm
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Các hoạt động, cuộc họp, kiểm tra và sự kiện của lớp
            </p>
          </div>
        </div>

        {/* 2. NÚT CHÍNH: + THÊM SỰ KIỆN / LỊCH MỚI */}
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 border border-slate-200 transition-colors"
            title="Làm mới dữ liệu lịch"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>

          <button
            onClick={() => handleOpenCreate()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-xs hover:shadow transition-all active:scale-98"
          >
            <Plus className="w-4 h-4" />
            <span>+ Thêm sự kiện / Lịch mới</span>
          </button>
        </div>
      </div>

      {/* 3. THANH ĐIỀU HƯỚNG THỜI GIAN & CHẾ ĐỘ XEM */}
      <div className="p-4 md:px-6 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/40">
        {/* Navigation buttons: Hôm nay, <, >, Month/Year */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleToday}
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 border border-slate-200 shadow-2xs transition-colors"
          >
            Hôm nay
          </button>

          <div className="flex items-center rounded-lg border border-slate-200 bg-white shadow-2xs overflow-hidden">
            <button
              onClick={handlePrev}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
              title="Trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors border-l border-slate-200"
              title="Sau"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <span className="text-sm font-bold text-slate-900 ml-1">
            {viewMode === 'WEEK'
              ? `Tuần ${weekDays[0].dayNumber}/${weekDays[0].dateObj.getMonth() + 1} - ${weekDays[6].dayNumber}/${weekDays[6].dateObj.getMonth() + 1}, ${weekDays[6].dateObj.getFullYear()}`
              : monthYearLabel}
          </span>
        </div>

        {/* View Mode Switcher: Tháng / Tuần / Danh sách */}
        <div className="flex items-center rounded-xl bg-slate-100/80 p-1 border border-slate-200/80 self-start md:self-auto">
          <button
            onClick={() => setViewMode('MONTH')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'MONTH'
                ? 'bg-white text-indigo-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Tháng</span>
          </button>

          <button
            onClick={() => setViewMode('WEEK')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'WEEK'
                ? 'bg-white text-indigo-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarRange className="w-3.5 h-3.5" />
            <span>Tuần</span>
          </button>

          <button
            onClick={() => setViewMode('LIST')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'LIST'
                ? 'bg-white text-indigo-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span>Danh sách</span>
          </button>
        </div>
      </div>

      {/* 4. KHU VỰC LỌC LOẠI SỰ KIỆN (TINH GỌN) */}
      <div className="px-4 md:px-6 py-2.5 bg-white border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto scrollbar-none text-xs">
        <button
          onClick={() => setSelectedCategory('ALL')}
          className={`px-3 py-1 rounded-lg font-semibold whitespace-nowrap transition-colors ${
            selectedCategory === 'ALL'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100 bg-slate-50 border border-slate-200/80'
          }`}
        >
          Tất cả ({allEvents.length})
        </button>

        <button
          onClick={() => setSelectedCategory('HOMEROOM')}
          className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            selectedCategory === 'HOMEROOM'
              ? 'bg-blue-600 text-white shadow-2xs'
              : 'text-blue-700 hover:bg-blue-50 bg-blue-50/50 border border-blue-200'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <span>Công tác chủ nhiệm</span>
        </button>

        <button
          onClick={() => setSelectedCategory('PARENT_MEETING')}
          className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            selectedCategory === 'PARENT_MEETING'
              ? 'bg-amber-600 text-white shadow-2xs'
              : 'text-amber-700 hover:bg-amber-50 bg-amber-50/50 border border-amber-200'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span>Họp phụ huynh</span>
        </button>

        <button
          onClick={() => setSelectedCategory('CLASS_MEETING')}
          className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            selectedCategory === 'CLASS_MEETING'
              ? 'bg-teal-600 text-white shadow-2xs'
              : 'text-teal-700 hover:bg-teal-50 bg-teal-50/50 border border-teal-200'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-teal-500" />
          <span>Họp lớp</span>
        </button>

        <button
          onClick={() => setSelectedCategory('EXAM_SURVEY')}
          className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            selectedCategory === 'EXAM_SURVEY'
              ? 'bg-rose-600 text-white shadow-2xs'
              : 'text-rose-700 hover:bg-rose-50 bg-rose-50/50 border border-rose-200'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-rose-500" />
          <span>Kiểm tra / Khảo sát</span>
        </button>

        <button
          onClick={() => setSelectedCategory('EXTRACURRICULAR')}
          className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            selectedCategory === 'EXTRACURRICULAR'
              ? 'bg-emerald-600 text-white shadow-2xs'
              : 'text-emerald-700 hover:bg-emerald-50 bg-emerald-50/50 border border-emerald-200'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Ngoại khóa & Đoàn đội</span>
        </button>

        <button
          onClick={() => setSelectedCategory('PERSONAL')}
          className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            selectedCategory === 'PERSONAL'
              ? 'bg-purple-600 text-white shadow-2xs'
              : 'text-purple-700 hover:bg-purple-50 bg-purple-50/50 border border-purple-200'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-purple-500" />
          <span>Việc cá nhân</span>
        </button>
      </div>

      {/* 4.1 BỘ LỌC BỔ SUNG: MỨC ĐỘ ƯU TIÊN & TIẾN ĐỘ THỜI HẠN */}
      <div className="px-4 md:px-6 py-2 bg-slate-50/70 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2.5 text-xs">
        {/* Lọc theo Tiến độ / Thời hạn */}
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-[11px] font-semibold text-slate-500 mr-1">Tiến độ:</span>
          {(
            [
              { key: 'ALL', label: 'Tất cả' },
              { key: 'TODO', label: 'Cần làm' },
              { key: 'TODAY', label: 'Hôm nay' },
              { key: 'OVERDUE', label: 'Quá hạn' },
              { key: 'DONE', label: 'Đã xong' }
            ] as const
          ).map(filter => (
            <button
              key={filter.key}
              onClick={() => setSelectedStatusFilter(filter.key)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                selectedStatusFilter === filter.key
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-200/60 bg-white border border-slate-200'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Lọc theo Mức độ ưu tiên */}
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-[11px] font-semibold text-slate-500 mr-1">Mức độ:</span>
          {(
            [
              { key: 'ALL', label: 'Tất cả mức độ' },
              { key: 'URGENT', label: '🔴 Rất quan trọng' },
              { key: 'HIGH', label: '🟡 Quan trọng' },
              { key: 'NORMAL', label: '⚪ Bình thường' }
            ] as const
          ).map(p => (
            <button
              key={p.key}
              onClick={() => setSelectedPriorityFilter(p.key)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                selectedPriorityFilter === p.key
                  ? 'bg-slate-800 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-200/60 bg-white border border-slate-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
          <div
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg border text-xs font-semibold ${
              toastMessage.type === 'success'
                ? 'bg-emerald-600 text-white border-emerald-500'
                : 'bg-rose-600 text-white border-rose-500'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <Check className="w-4 h-4 text-white" />
            ) : (
              <AlertCircle className="w-4 h-4 text-white" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* 5. KHU VỰC LỊCH CHÍNH (CALENDAR-FIRST VIEW) */}
      <div className="p-4 md:p-6 bg-white min-h-[420px]">
        {loading && allEvents.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center justify-center">
            <RefreshCw className="w-7 h-7 text-indigo-600 animate-spin mb-2" />
            <p className="text-xs text-slate-500">Đang tải lịch công tác chủ nhiệm...</p>
          </div>
        ) : (
          <>
            {/* VIEW A: CHẾ ĐỘ XEM THÁNG (MONTH VIEW) */}
            {viewMode === 'MONTH' && (
              <div className="w-full">
                {/* Weekday headers */}
                <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-t-xl overflow-hidden border border-slate-200 text-center text-xs font-semibold text-slate-600">
                  <div className="bg-slate-50 py-2">Thứ 2</div>
                  <div className="bg-slate-50 py-2">Thứ 3</div>
                  <div className="bg-slate-50 py-2">Thứ 4</div>
                  <div className="bg-slate-50 py-2">Thứ 5</div>
                  <div className="bg-slate-50 py-2">Thứ 6</div>
                  <div className="bg-slate-50 py-2 text-indigo-600">Thứ 7</div>
                  <div className="bg-slate-50 py-2 text-rose-600">Chủ nhật</div>
                </div>

                {/* Day cells matrix */}
                <div className="grid grid-cols-7 gap-px bg-slate-200 border-x border-b border-slate-200 rounded-b-xl overflow-hidden">
                  {monthDays.map(day => {
                    const dayEvents = filteredEvents.filter(e => e.date === day.dateStr);

                    return (
                      <div
                        key={day.dateStr}
                        onClick={() => handleOpenCreate(day.dateStr)}
                        className={`min-h-[105px] sm:min-h-[120px] p-1.5 sm:p-2 bg-white flex flex-col justify-between transition-colors group cursor-pointer ${
                          !day.isCurrentMonth
                            ? 'bg-slate-50/50 text-slate-400'
                            : 'hover:bg-slate-50/80'
                        } ${day.isToday ? 'ring-2 ring-indigo-500 ring-inset bg-indigo-50/20' : ''}`}
                      >
                        {/* Day Header */}
                        <div className="flex items-center justify-between">
                          <span
                            className={`inline-flex items-center justify-center text-xs font-bold w-6 h-6 rounded-full ${
                              day.isToday
                                ? 'bg-indigo-600 text-white'
                                : day.isCurrentMonth
                                ? 'text-slate-800'
                                : 'text-slate-400'
                            }`}
                          >
                            {day.dayNumber}
                          </span>

                          <button
                            onClick={e => {
                              e.stopPropagation();
                              handleOpenCreate(day.dateStr);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                            title="Thêm sự kiện ngày này"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Event List in Cell */}
                        <div className="space-y-1 mt-1 flex-1 overflow-y-auto max-h-[85px] scrollbar-none">
                          {dayEvents.slice(0, 3).map(ev => {
                            const pConfig = getPriorityDetails(ev.priority);
                            return (
                              <div
                                key={ev.id}
                                onClick={e => {
                                  e.stopPropagation();
                                  setSelectedDetailEvent(ev);
                                }}
                                className={`text-[11px] px-1.5 py-0.5 rounded-md border flex items-center justify-between gap-1 transition-all hover:scale-[1.01] ${
                                  ev.isCompleted
                                    ? 'bg-slate-100 border-slate-200 text-slate-500 line-through'
                                    : `${ev.categoryColor.bg} ${ev.categoryColor.border} ${ev.categoryColor.text}`
                                }`}
                                title={`${ev.startTime ? `${ev.startTime} - ` : ''}${ev.title} (${pConfig.label})`}
                              >
                                <div className="flex items-center gap-1 truncate min-w-0">
                                  {ev.priority === 'URGENT' ? (
                                    <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-rose-500 animate-pulse" />
                                  ) : ev.priority === 'HIGH' ? (
                                    <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-amber-500" />
                                  ) : (
                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ev.categoryColor.dot}`} />
                                  )}
                                  <span className="font-semibold truncate">{ev.title}</span>
                                </div>
                                {ev.startTime && (
                                  <span className="text-[9px] font-medium shrink-0 opacity-80">
                                    {ev.startTime}
                                  </span>
                                )}
                              </div>
                            );
                          })}

                          {dayEvents.length > 3 && (
                            <div className="text-[10px] text-slate-500 font-semibold px-1">
                              +{dayEvents.length - 3} sự kiện khác...
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* VIEW B: CHẾ ĐỘ XEM TUẦN (WEEK VIEW) */}
            {viewMode === 'WEEK' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
                {weekDays.map(day => {
                  const dayEvents = filteredEvents.filter(e => e.date === day.dateStr);

                  return (
                    <div
                      key={day.dateStr}
                      className={`rounded-xl border flex flex-col transition-all min-h-[320px] ${
                        day.isToday
                          ? 'border-indigo-300 bg-indigo-50/20 ring-1 ring-indigo-200'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      {/* Column Header */}
                      <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/60 rounded-t-xl">
                        <div>
                          <div className="text-xs font-semibold text-slate-500">{day.dayName}</div>
                          <div
                            className={`text-sm font-bold ${
                              day.isToday ? 'text-indigo-600' : 'text-slate-800'
                            }`}
                          >
                            {day.dayNumber}/{day.dateObj.getMonth() + 1}
                          </div>
                        </div>

                        <button
                          onClick={() => handleOpenCreate(day.dateStr)}
                          className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-white border border-transparent hover:border-slate-200 transition-colors"
                          title="Thêm sự kiện"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Event Cards */}
                      <div className="p-2 space-y-2 flex-1 overflow-y-auto">
                        {dayEvents.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-center p-3 text-slate-400 text-xs">
                            <span className="text-[11px]">Không có lịch</span>
                          </div>
                        ) : (
                          dayEvents.map(ev => (
                            <div
                              key={ev.id}
                              onClick={() => setSelectedDetailEvent(ev)}
                              className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all hover:shadow-xs flex flex-col justify-between gap-1.5 ${
                                ev.isCompleted
                                  ? 'bg-slate-50 border-slate-200/80 text-slate-500'
                                  : `${ev.categoryColor.bg} ${ev.categoryColor.border}`
                              }`}
                            >
                              <div>
                                <div className="flex items-center justify-between gap-1 mb-1 flex-wrap">
                                  <div className="flex items-center gap-1 flex-wrap">
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${ev.categoryColor.badge}`}>
                                      {ev.categoryLabel}
                                    </span>
                                    {ev.priority && ev.priority !== 'NORMAL' && (
                                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${getPriorityDetails(ev.priority).badge}`}>
                                        {getPriorityDetails(ev.priority).icon} {getPriorityDetails(ev.priority).label}
                                      </span>
                                    )}
                                  </div>
                                  {ev.startTime && (
                                    <span className="text-[10px] font-medium text-slate-500 flex items-center gap-0.5">
                                      <Clock className="w-3 h-3" />
                                      {ev.startTime}
                                    </span>
                                  )}
                                </div>

                                <h4
                                  className={`font-bold text-xs line-clamp-2 ${
                                    ev.isCompleted ? 'line-through text-slate-400' : 'text-slate-800'
                                  }`}
                                >
                                  {ev.title}
                                </h4>

                                {ev.location && (
                                  <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1 truncate">
                                    <MapPin className="w-3 h-3 shrink-0" />
                                    <span className="truncate">{ev.location}</span>
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center justify-between pt-1 border-t border-slate-100/60 mt-1">
                                <button
                                  onClick={e => handleToggleComplete(ev, e)}
                                  className={`text-[11px] font-semibold flex items-center gap-1 ${
                                    ev.isCompleted ? 'text-emerald-600' : 'text-slate-500 hover:text-emerald-600'
                                  }`}
                                >
                                  {ev.isCompleted ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <Circle className="w-3.5 h-3.5" />
                                  )}
                                  <span>{ev.isCompleted ? 'Đã xong' : 'Xong'}</span>
                                </button>

                                <div className="flex items-center gap-1 ml-auto">
                                  <button
                                    onClick={e => handleOpenEdit(ev, e)}
                                    className="p-1 rounded text-slate-400 hover:text-indigo-600"
                                    title="Chỉnh sửa"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={e => handleDeleteEvent(ev, e)}
                                    className="p-1 rounded text-slate-400 hover:text-rose-600"
                                    title="Xóa sự kiện"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* VIEW C: CHẾ ĐỘ XEM DANH SÁCH (LIST / AGENDA VIEW) */}
            {viewMode === 'LIST' && (
              <div className="space-y-4">
                {/* 2 SUB-TABS: CÔNG VIỆC CẦN LÀM & CÔNG VIỆC ĐÃ HOÀN THÀNH */}
                <div className="flex items-center gap-2 p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200/80">
                  <button
                    onClick={() => setListTab('TODO')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
                      listTab === 'TODO'
                        ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                    }`}
                  >
                    <Clock className="w-4 h-4 text-indigo-600" />
                    <span>CÔNG VIỆC CẦN LÀM</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold transition-all ${
                        listTab === 'TODO'
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {pendingEventsCount}
                    </span>
                  </button>

                  <button
                    onClick={() => setListTab('DONE')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
                      listTab === 'DONE'
                        ? 'bg-white text-emerald-700 shadow-xs ring-1 ring-slate-200'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>CÔNG VIỆC ĐÃ HOÀN THÀNH</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold transition-all ${
                        listTab === 'DONE'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {completedEventsCount}
                    </span>
                  </button>
                </div>

                {groupedEventsByDate.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-8">
                    {listTab === 'TODO' ? (
                      <>
                        <CheckCircle2 className="w-10 h-10 text-emerald-500/60 mb-2.5" />
                        <span className="font-bold text-slate-700 text-sm">Tuyệt vời! Không có công việc nào cần làm</span>
                        <span className="text-slate-500 mt-1 max-w-sm">
                          Bạn đã hoàn thành tất cả công việc hoặc chưa thêm công việc mới.
                        </span>
                        <button
                          onClick={() => handleOpenCreate()}
                          className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-xs transition-all flex items-center gap-1.5"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Thêm công việc mới</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <CalendarIcon className="w-10 h-10 text-slate-300 mb-2.5" />
                        <span className="font-bold text-slate-700 text-sm">Chưa có công việc nào đã hoàn thành</span>
                        <span className="text-slate-500 mt-1 max-w-sm">
                          Khi bạn đánh dấu hoàn thành các công việc ở tab "CÔNG VIỆC CẦN LÀM", chúng sẽ được lưu và hiển thị tại đây.
                        </span>
                      </>
                    )}
                  </div>
                ) : (
                  groupedEventsByDate.map(([dateKey, events]) => (
                    <div key={dateKey} className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                      {/* Date Heading */}
                      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="w-4 h-4 text-indigo-600" />
                          <span className="text-xs font-bold text-slate-800">
                            {formatDisplayDate(dateKey)}
                          </span>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-500">
                          {events.length} sự kiện
                        </span>
                      </div>

                      {/* Event Items */}
                      <div className="divide-y divide-slate-100">
                        {events.map(ev => (
                          <div
                            key={ev.id}
                            onClick={() => setSelectedDetailEvent(ev)}
                            className={`p-3.5 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer group ${
                              ev.isCompleted ? 'opacity-65' : ''
                            }`}
                          >
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                              {/* Complete Toggle Button */}
                              <button
                                onClick={e => handleToggleComplete(ev, e)}
                                className="mt-0.5 text-slate-400 hover:text-emerald-600 transition-colors shrink-0"
                                title={ev.isCompleted ? 'Đánh dấu chưa hoàn thành' : 'Đánh dấu đã hoàn thành'}
                              >
                                {ev.isCompleted ? (
                                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                ) : (
                                  <Circle className="w-5 h-5" />
                                )}
                              </button>

                              {/* Main Info */}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ev.categoryColor.badge}`}>
                                    {ev.categoryLabel}
                                  </span>

                                  {ev.source !== 'TASK' && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                      {ev.sourceLabel}
                                    </span>
                                  )}

                                  {ev.priority && ev.priority !== 'NORMAL' && (
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getPriorityDetails(ev.priority).badge}`}>
                                      {getPriorityDetails(ev.priority).icon} {getPriorityDetails(ev.priority).label}
                                    </span>
                                  )}

                                  {ev.startTime && (
                                    <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-slate-400" />
                                      {ev.startTime} {ev.endTime ? `- ${ev.endTime}` : ''}
                                    </span>
                                  )}

                                  {ev.isAllDay && (
                                    <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                      Cả ngày
                                    </span>
                                  )}

                                  {ev.isOverdue && (
                                    <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                      Quá hạn
                                    </span>
                                  )}
                                </div>

                                <h4
                                  className={`text-xs font-bold group-hover:text-indigo-600 transition-colors ${
                                    ev.isCompleted ? 'line-through text-slate-400' : 'text-slate-900'
                                  }`}
                                >
                                  {ev.title}
                                </h4>

                                <div className="flex items-center gap-4 text-[11px] text-slate-500 mt-1 flex-wrap">
                                  {ev.location && (
                                    <span className="flex items-center gap-1">
                                      <MapPin className="w-3 h-3 text-slate-400" />
                                      <strong>{ev.location}</strong>
                                    </span>
                                  )}
                                  {ev.notes && (
                                    <span className="line-clamp-1 italic text-slate-400">
                                      "{ev.notes}"
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-1 self-end sm:self-center shrink-0 opacity-80 group-hover:opacity-100">
                              <button
                                onClick={e => handleOpenEdit(ev, e)}
                                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                                title="Chỉnh sửa"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={e => handleDeleteEvent(ev, e)}
                                className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                                title="Xóa"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              {ev.source === 'ACTIVITY' && (
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    onNavigateToModule('activities');
                                  }}
                                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors"
                                >
                                  Mở hoạt động
                                </button>
                              )}
                              {ev.source === 'PARENT' && (
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    onNavigateToModule('parents');
                                  }}
                                  className="text-xs font-semibold text-purple-600 hover:text-purple-700 px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors"
                                >
                                  Mở phụ huynh
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* 6. MODAL XEM CHI TIẾT SỰ KIỆN (QUICK VIEW) */}
      {selectedDetailEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-2xs">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-2xl text-slate-800 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                  <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${selectedDetailEvent.categoryColor.badge}`}>
                    {selectedDetailEvent.categoryLabel}
                  </span>
                  {selectedDetailEvent.priority && selectedDetailEvent.priority !== 'NORMAL' && (
                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${getPriorityDetails(selectedDetailEvent.priority).badge}`}>
                      {getPriorityDetails(selectedDetailEvent.priority).icon} {getPriorityDetails(selectedDetailEvent.priority).label}
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  {selectedDetailEvent.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDetailEvent(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Date & Time */}
              <div className="flex items-center gap-2 text-slate-700">
                <CalendarIcon className="w-4 h-4 text-slate-400 shrink-0" />
                <span>
                  <strong>Ngày:</strong> {formatDisplayDate(selectedDetailEvent.date)}
                </span>
              </div>

              {(selectedDetailEvent.startTime || selectedDetailEvent.isAllDay) && (
                <div className="flex items-center gap-2 text-slate-700">
                  <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>
                    <strong>Thời gian:</strong>{' '}
                    {selectedDetailEvent.isAllDay
                      ? 'Cả ngày'
                      : `${selectedDetailEvent.startTime || ''} ${selectedDetailEvent.endTime ? `- ${selectedDetailEvent.endTime}` : ''}`}
                  </span>
                </div>
              )}

              {selectedDetailEvent.location && (
                <div className="flex items-center gap-2 text-slate-700">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>
                    <strong>Địa điểm:</strong> {selectedDetailEvent.location}
                  </span>
                </div>
              )}

              {selectedDetailEvent.notes && (
                <div className="mt-2 p-3 rounded-xl bg-slate-50 border border-slate-100 text-slate-600">
                  <div className="font-semibold text-slate-700 mb-1">Nội dung chi tiết:</div>
                  <p className="whitespace-pre-line">{selectedDetailEvent.notes}</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <span className="text-slate-500 font-medium">Trạng thái:</span>
                <span
                  className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                    selectedDetailEvent.isCompleted
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {selectedDetailEvent.isCompleted ? 'Đã hoàn thành' : 'Đang lên lịch / Chưa hoàn thành'}
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-5 mt-4 border-t border-slate-100">
              <div>
                <button
                  onClick={() => handleDeleteEvent(selectedDetailEvent)}
                  className="px-3 py-1.5 rounded-xl hover:bg-rose-50 text-rose-600 text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa sự kiện</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleComplete(selectedDetailEvent)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors flex items-center gap-1 ${
                    selectedDetailEvent.isCompleted
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{selectedDetailEvent.isCompleted ? 'Bỏ hoàn thành' : 'Đánh dấu xong'}</span>
                </button>

                <button
                  onClick={() => handleOpenEdit(selectedDetailEvent)}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-xs transition-all flex items-center gap-1"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Sửa</span>
                </button>

                {selectedDetailEvent.source === 'ACTIVITY' && (
                  <button
                    onClick={() => {
                      setSelectedDetailEvent(null);
                      onNavigateToModule('activities');
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-xs font-semibold text-white shadow-xs transition-all"
                  >
                    Mở module Hoạt động
                  </button>
                )}

                {selectedDetailEvent.source === 'PARENT' && (
                  <button
                    onClick={() => {
                      setSelectedDetailEvent(null);
                      onNavigateToModule('parents');
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-xs font-semibold text-white shadow-xs transition-all"
                  >
                    Mở Nhịp cầu phụ huynh
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL THÊM / SỬA SỰ KIỆN (FORM GỌN GÀNG) */}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-2xs">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-lg w-full shadow-2xl text-slate-800 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  {editingEvent ? 'Chỉnh sửa sự kiện lịch' : 'Thêm sự kiện / Lịch mới'}
                </h3>
              </div>
              <button
                onClick={() => setIsEventModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editingEvent && editingEvent.source !== 'TASK' && (
              <div className={`mb-3 p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                editingEvent.source === 'ACTIVITY'
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-purple-50 border-purple-200 text-purple-800'
              }`}>
                <span>
                  Bản ghi liên kết từ: <strong>{editingEvent.sourceLabel}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsEventModalOpen(false);
                    onNavigateToModule(editingEvent.source === 'ACTIVITY' ? 'activities' : 'parents');
                  }}
                  className="text-xs font-bold underline hover:opacity-80 shrink-0"
                >
                  Mở module gốc →
                </button>
              </div>
            )}

            <form onSubmit={handleSaveEvent} className="space-y-3.5 text-xs">
              {/* Tên sự kiện */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên sự kiện / Lịch trình <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Sinh hoạt chủ nhiệm đầu tuần, Họp ban cán sự..."
                  value={eventForm.title}
                  onChange={e => setEventForm({ ...eventForm, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-xs"
                />
              </div>

              {/* Mức độ ưu tiên & Loại sự kiện */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mức độ ưu tiên / Tính chất <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={eventForm.priority}
                    onChange={e => setEventForm({ ...eventForm, priority: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-xs font-medium"
                  >
                    <option value="NORMAL">⚪ Bình thường</option>
                    <option value="HIGH">🟡 Quan trọng</option>
                    <option value="URGENT">🔴 Rất quan trọng</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Loại sự kiện
                  </label>
                  <select
                    value={eventForm.category}
                    onChange={e => setEventForm({ ...eventForm, category: e.target.value as HomeroomEventCategory })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-xs"
                  >
                    <option value="HOMEROOM">Công tác chủ nhiệm</option>
                    <option value="PARENT_MEETING">Họp phụ huynh</option>
                    <option value="CLASS_MEETING">Họp lớp / Chi đoàn</option>
                    <option value="EXAM_SURVEY">Kiểm tra / Khảo sát</option>
                    <option value="EXTRACURRICULAR">Ngoại khóa & Đoàn đội</option>
                    <option value="PERSONAL">Việc cá nhân</option>
                  </select>
                </div>
              </div>

              {/* Ngày thực hiện & Hạn chót */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ngày thực hiện / Hạn chót <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={eventForm.due_date}
                  onChange={e => setEventForm({ ...eventForm, due_date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-xs"
                />
              </div>

              {/* Khung giờ & Cả ngày */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={eventForm.is_all_day}
                      onChange={e => setEventForm({ ...eventForm, is_all_day: e.target.checked })}
                      className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs font-semibold text-slate-700">Sự kiện cả ngày</span>
                  </label>
                </div>

                {!eventForm.is_all_day && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Giờ bắt đầu
                      </label>
                      <input
                        type="time"
                        value={eventForm.start_time}
                        onChange={e => setEventForm({ ...eventForm, start_time: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-800 focus:ring-2 focus:ring-indigo-500 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Giờ kết thúc
                      </label>
                      <input
                        type="time"
                        value={eventForm.end_time}
                        onChange={e => setEventForm({ ...eventForm, end_time: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-800 focus:ring-2 focus:ring-indigo-500 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Địa điểm */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Địa điểm
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Phòng 11A1, Hội trường A, Sân trường..."
                  value={eventForm.location}
                  onChange={e => setEventForm({ ...eventForm, location: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-xs"
                />
              </div>

              {/* Mô tả ngắn */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mô tả ngắn / Ghi chú
                </label>
                <textarea
                  rows={2}
                  placeholder="Nội dung tóm tắt, lưu ý chuẩn bị tài liệu..."
                  value={eventForm.notes}
                  onChange={e => setEventForm({ ...eventForm, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-xs"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEventModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={savingEvent || !eventForm.title.trim()}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-xs font-semibold text-white shadow-xs transition-all flex items-center gap-1.5"
                >
                  {savingEvent ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>{editingEvent ? 'Cập nhật sự kiện' : 'Lưu vào lịch'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* 8. MODAL XÁC NHẬN XÓA SỰ KIỆN */}
      <ConfirmDeleteModal
        isOpen={!!eventToDelete}
        title={
          eventToDelete?.source === 'ACTIVITY'
            ? 'Xác nhận xóa hoạt động phong trào'
            : eventToDelete?.source === 'PARENT'
            ? 'Xác nhận xóa lịch / thông báo phụ huynh'
            : 'Xác nhận xóa công việc chủ nhiệm'
        }
        itemName={eventToDelete?.title}
        message={
          eventToDelete?.source === 'ACTIVITY'
            ? `Hoạt động phong trào "${eventToDelete?.title}" sẽ bị xóa khỏi lịch và module Hoạt động phong trào. Bạn có chắc chắn muốn xóa?`
            : eventToDelete?.source === 'PARENT'
            ? `Lịch / Thông báo "${eventToDelete?.title}" sẽ bị xóa khỏi lịch và module Nhịp cầu phụ huynh. Bạn có chắc chắn muốn xóa?`
            : `Công việc "${eventToDelete?.title}" sẽ bị xóa vĩnh viễn khỏi lịch công tác chủ nhiệm. Bạn có chắc chắn muốn xóa?`
        }
        confirmText="Xác nhận xóa"
        cancelText="Hủy bỏ"
        onConfirm={() => {
          if (eventToDelete) {
            handleConfirmDeleteEvent(eventToDelete);
          }
        }}
        onClose={() => setEventToDelete(null)}
      />
    </section>
  );
};
