/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { authRepository } from './AuthRepository';
import { authService } from './AuthService';
import { tenantService } from './TenantService';
import { studentService } from './StudentService';
import { parentCommunicationService } from './ParentCommunicationService';
import { surveySyncService } from './SurveySyncService';
import { surveyTemplateService } from './SurveyTemplateService';
import { studentSurveyService } from './StudentSurveyService';
import { academicService } from './AcademicService';

export type HomeroomEventCategory =
  | 'HOMEROOM' // Công tác chủ nhiệm
  | 'PARENT_MEETING' // Họp phụ huynh
  | 'CLASS_MEETING' // Họp lớp
  | 'EXAM_SURVEY' // Kiểm tra / Khảo sát
  | 'EXTRACURRICULAR' // Ngoại khóa & Đoàn đội
  | 'PERSONAL'; // Việc cá nhân

export interface TeacherPersonalTask {
  id: string;
  tenant_id: string;
  teacher_id: string;
  class_id?: string | null;
  title: string;
  notes?: string | null;
  due_date?: string | null; // ISO YYYY-MM-DD
  start_time?: string | null; // HH:mm
  end_time?: string | null; // HH:mm
  location?: string | null;
  category?: HomeroomEventCategory | string;
  is_all_day?: boolean;
  priority: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';
  status: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'OVERDUE';
  linked_module?: string | null;
  linked_entity_id?: string | null;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
}

export interface WorkCenterActionItem {
  id: string;
  title: string;
  target: string;
  source: string;
  sourceModule: string;
  dueDate?: string | null;
  priority: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';
  status: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'OVERDUE';
  actionLabel: string;
  actionModule: string;
  actionParams?: Record<string, any>;
}

export interface WorkCenterParentMessageItem {
  id: string;
  studentId: string;
  studentName: string;
  parentName: string;
  parentPhone?: string | null;
  topic: string;
  unreadTeacher: number;
  lastMessageAt: string;
  lastMessageSnippet: string;
}

export interface WorkCenterSurveyItem {
  id: string;
  title: string;
  totalStudents: number;
  completedCount: number;
  pendingCount: number;
  completionRate: number;
  status: string;
  academicYear: string;
  needsTeacherAction: boolean;
}

export interface WorkCenterAttentionStudent {
  id: string;
  code: string;
  fullName: string;
  avatar?: string | null;
  reasons: string[];
  needsSpecialAttention: boolean;
  attentionNote?: string | null;
  missingInfo: string[];
}

export interface WorkCenterScheduleItem {
  id: string;
  type: 'TIMETABLE' | 'TASK' | 'EVENT' | 'SURVEY';
  timeLabel: string;
  title: string;
  subtitle?: string;
  targetDate: string;
  periodCategory: 'TODAY' | 'TOMORROW' | 'UPCOMING';
  priority?: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';
}

export interface WorkCenterMissingProfileItem {
  id: string;
  code: string;
  fullName: string;
  missingFields: string[];
}

export interface TeacherWorkCenterSummary {
  metrics: {
    totalPendingActions: number;
    urgentCount: number;
    unreadParentMessages: number;
    missingProfileCount: number;
    pendingSurveyCount: number;
    overdueTaskCount: number;
    todayScheduleCount: number;
  };
  urgentActions: WorkCenterActionItem[];
  parentCommunications: WorkCenterParentMessageItem[];
  surveysToMonitor: WorkCenterSurveyItem[];
  studentsRequiringAttention: WorkCenterAttentionStudent[];
  upcomingSchedule: WorkCenterScheduleItem[];
  missingDataProfiles: WorkCenterMissingProfileItem[];
  personalTasks: TeacherPersonalTask[];
}

class TeacherWorkCenterClient {
  private getHeaders(): HeadersInit {
    const token = authRepository.getSessionToken();
    const currentUser = authService.getCurrentUser();
    const activeTenantId = currentUser.tenantId || tenantService.getActiveTenantId() || 'tenant-lan-nguyen';

    return {
      'Content-Type': 'application/json',
      'X-Tenant-Id': activeTenantId,
      'X-User-Role': currentUser.role || 'TEACHER',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  }

  private generateDefaultEvents(tenantId: string, teacherId: string): TeacherPersonalTask[] {
    const baseEvents: Array<Partial<TeacherPersonalTask>> = [
      {
        title: 'Sinh hoạt chủ nhiệm đầu tuần & Đánh giá thi đua',
        due_date: '2026-09-21',
        start_time: '07:00',
        end_time: '07:45',
        location: 'Phòng học 11A1',
        category: 'HOMEROOM',
        notes: 'Đánh giá nề nếp tuần qua, triển khai kế hoạch thi đua tuần mới và tuyên dương các tổ làm tốt.',
        priority: 'HIGH',
        status: 'TODO'
      },
      {
        title: 'Họp Phụ huynh đầu năm học 2026 - 2027',
        due_date: '2026-09-27',
        start_time: '08:00',
        end_time: '10:30',
        location: 'Phòng học 11A1',
        category: 'PARENT_MEETING',
        notes: 'Báo cáo phương hướng năm học, bầu Ban đại diện CMHS và thống nhất kế hoạch rèn luyện.',
        priority: 'URGENT',
        status: 'TODO'
      },
      {
        title: 'Kiểm tra khảo sát chất lượng đầu năm môn Toán & Ngữ văn',
        due_date: '2026-09-24',
        start_time: '13:30',
        end_time: '16:00',
        location: 'Khu nhà A - Phòng thi khối 11',
        category: 'EXAM_SURVEY',
        notes: 'Phổ biến quy chế thi cho học sinh, kiểm diện sĩ số và hướng dẫn làm bài nghiêm túc.',
        priority: 'HIGH',
        status: 'TODO'
      },
      {
        title: 'Đại hội Chi đoàn & Bầu Ban cán sự lớp 11A1',
        due_date: '2026-09-26',
        start_time: '15:00',
        end_time: '16:30',
        location: 'Phòng học 11A1',
        category: 'CLASS_MEETING',
        notes: 'Tổ chức Đại hội chi đoàn nhiệm kỳ mới, kiện toàn đội ngũ Ban cán sự và phân công nhiệm vụ.',
        priority: 'NORMAL',
        status: 'TODO'
      },
      {
        title: 'Ngày Thứ Bảy Tình Nguyện: Chăm sóc bồn hoa & Vệ sinh môi trường',
        due_date: '2026-09-26',
        start_time: '07:30',
        end_time: '11:00',
        location: 'Sân trường & Vườn cây thanh niên',
        category: 'EXTRACURRICULAR',
        notes: 'Tham gia phong trào ngày thứ bảy tình nguyện theo kế hoạch Đoàn trường.',
        priority: 'NORMAL',
        status: 'TODO'
      }
    ];

    return baseEvents.map((e, idx) => ({
      id: `task_seed_${idx + 1}_${Date.now()}`,
      tenant_id: tenantId,
      teacher_id: teacherId,
      class_id: 'class-11a1-2025',
      title: e.title || '',
      notes: e.notes || null,
      due_date: e.due_date || null,
      start_time: e.start_time || null,
      end_time: e.end_time || null,
      location: e.location || null,
      category: e.category || 'HOMEROOM',
      is_all_day: e.is_all_day || false,
      priority: e.priority || 'NORMAL',
      status: e.status || 'TODO',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
  }

  private getLocalTasks(tenantId: string, teacherId: string): TeacherPersonalTask[] {
    try {
      const storageKey = tenantService.getTenantStorageKey(`teacher_personal_tasks_${teacherId}`, tenantId);
      const saved = localStorage.getItem(storageKey);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const todayStr = new Date().toISOString().split('T')[0];
          return parsed.map(t => {
            if (t.status !== 'DONE' && t.due_date && t.due_date < todayStr) {
              return { ...t, status: 'OVERDUE' };
            }
            return t;
          });
        }
      }
    } catch {
      // ignore
    }

    const defaultEvents = this.generateDefaultEvents(tenantId, teacherId);
    this.saveLocalTasks(tenantId, teacherId, defaultEvents);
    return defaultEvents;
  }

  private saveLocalTasks(tenantId: string, teacherId: string, tasks: TeacherPersonalTask[]): void {
    try {
      const storageKey = tenantService.getTenantStorageKey(`teacher_personal_tasks_${teacherId}`, tenantId);
      localStorage.setItem(storageKey, JSON.stringify(tasks));
    } catch {
      // ignore
    }
  }

  public async getSummary(classId?: string): Promise<TeacherWorkCenterSummary> {
    try {
      const url = classId 
        ? `/api/v1/teacher-work-center/summary?classId=${encodeURIComponent(classId)}`
        : '/api/v1/teacher-work-center/summary';
      
      const res = await fetch(url, { credentials: 'include', headers: this.getHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data && data.data) {
          return data.data;
        }
      }
    } catch (e) {
      // Server offline / network error -> fall through to client aggregation
    }

    // Seamless Fallback: Direct client-side aggregation using current auth session & tenant context
    return this.buildClientSummary(classId);
  }

  public async getTasks(filter?: 'ALL' | 'TODAY' | 'OVERDUE' | 'UPCOMING' | 'DONE'): Promise<TeacherPersonalTask[]> {
    const currentUser = authService.getCurrentUser();
    const tenantId = currentUser.tenantId || tenantService.getActiveTenantId() || 'tenant-lan-nguyen';
    const teacherId = currentUser.id || currentUser.teacherId || 'gvcn';

    try {
      const url = filter 
        ? `/api/v1/teacher-work-center/tasks?filter=${filter}`
        : '/api/v1/teacher-work-center/tasks';
      const res = await fetch(url, { credentials: 'include', headers: this.getHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.data)) {
          this.saveLocalTasks(tenantId, teacherId, data.data);
          return data.data;
        }
      }
    } catch {
      // ignore
    }

    const tasks = this.getLocalTasks(tenantId, teacherId);
    const todayStr = new Date().toISOString().split('T')[0];

    if (filter === 'DONE') {
      return tasks.filter(t => t.status === 'DONE');
    } else if (filter === 'TODAY') {
      return tasks.filter(t => t.status !== 'DONE' && (!t.due_date || t.due_date === todayStr));
    } else if (filter === 'OVERDUE') {
      return tasks.filter(t => t.status !== 'DONE' && t.due_date && t.due_date < todayStr);
    } else if (filter === 'UPCOMING') {
      return tasks.filter(t => t.status !== 'DONE' && t.due_date && t.due_date > todayStr);
    }
    return tasks;
  }

  public async createTask(task: {
    title: string;
    notes?: string;
    due_date?: string;
    start_time?: string;
    end_time?: string;
    location?: string;
    category?: HomeroomEventCategory | string;
    is_all_day?: boolean;
    priority?: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';
    class_id?: string;
    linked_module?: string;
    linked_entity_id?: string;
  }): Promise<TeacherPersonalTask> {
    const currentUser = authService.getCurrentUser();
    const tenantId = currentUser.tenantId || tenantService.getActiveTenantId() || 'tenant-lan-nguyen';
    const teacherId = currentUser.id || currentUser.teacherId || 'gvcn';

    let createdTask: TeacherPersonalTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tenant_id: tenantId,
      teacher_id: teacherId,
      class_id: task.class_id || null,
      title: task.title.trim(),
      notes: task.notes?.trim() || null,
      due_date: task.due_date || null,
      start_time: task.start_time || null,
      end_time: task.end_time || null,
      location: task.location?.trim() || null,
      category: task.category || 'HOMEROOM',
      is_all_day: task.is_all_day ?? false,
      priority: task.priority || 'NORMAL',
      status: 'TODO',
      linked_module: task.linked_module || null,
      linked_entity_id: task.linked_entity_id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      const res = await fetch('/api/v1/teacher-work-center/tasks', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(task),
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.data) {
          createdTask = data.data;
        }
      }
    } catch {
      // server sync optional
    }

    const currentTasks = this.getLocalTasks(tenantId, teacherId);
    const existingIdx = currentTasks.findIndex(t => t.id === createdTask.id || `task_${t.id}` === createdTask.id);
    if (existingIdx >= 0) {
      currentTasks[existingIdx] = createdTask;
    } else {
      currentTasks.unshift(createdTask);
    }
    this.saveLocalTasks(tenantId, teacherId, currentTasks);

    return createdTask;
  }

  public async updateTask(id: string, updates: Partial<TeacherPersonalTask>): Promise<TeacherPersonalTask> {
    const currentUser = authService.getCurrentUser();
    const tenantId = currentUser.tenantId || tenantService.getActiveTenantId() || 'tenant-lan-nguyen';
    const teacherId = currentUser.id || currentUser.teacherId || 'gvcn';

    const currentTasks = this.getLocalTasks(tenantId, teacherId);
    const cleanId = id.replace(/^task_/, '');
    const index = currentTasks.findIndex(t => t.id === id || t.id === cleanId || `task_${t.id}` === id);
    let updatedTask = currentTasks[index] || {
      id,
      tenant_id: tenantId,
      teacher_id: teacherId,
      title: updates.title || '',
      priority: updates.priority || 'NORMAL',
      status: updates.status || 'TODO',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    updatedTask = {
      ...updatedTask,
      ...updates,
      updated_at: new Date().toISOString()
    };
    if (updates.status === 'DONE') {
      updatedTask.completed_at = new Date().toISOString();
    } else if (updates.status === 'TODO') {
      updatedTask.completed_at = null;
    }

    if (index !== -1) {
      currentTasks[index] = updatedTask;
    } else {
      currentTasks.unshift(updatedTask);
    }
    this.saveLocalTasks(tenantId, teacherId, currentTasks);

    try {
      const res = await fetch(`/api/v1/teacher-work-center/tasks/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(updates),
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.data) {
          updatedTask = data.data;
          const idx = currentTasks.findIndex(t => t.id === updatedTask.id || t.id === id || `task_${t.id}` === id);
          if (idx >= 0) {
            currentTasks[idx] = updatedTask;
            this.saveLocalTasks(tenantId, teacherId, currentTasks);
          }
        }
      }
    } catch {
      // optional
    }

    return updatedTask;
  }

  public async toggleTask(id: string): Promise<TeacherPersonalTask> {
    const currentUser = authService.getCurrentUser();
    const tenantId = currentUser.tenantId || tenantService.getActiveTenantId() || 'tenant-lan-nguyen';
    const teacherId = currentUser.id || currentUser.teacherId || 'gvcn';

    const currentTasks = this.getLocalTasks(tenantId, teacherId);
    const cleanId = id.replace(/^task_/, '');
    const task = currentTasks.find(t => t.id === id || t.id === cleanId || `task_${t.id}` === id);
    const nextStatus = task?.status === 'DONE' ? 'TODO' : 'DONE';

    try {
      const res = await fetch(`/api/v1/teacher-work-center/tasks/${encodeURIComponent(id)}/toggle`, {
        method: 'POST',
        headers: this.getHeaders(),
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.data) {
          const updated = data.data;
          const idx = currentTasks.findIndex(t => t.id === updated.id || t.id === id || `task_${t.id}` === id);
          if (idx >= 0) {
            currentTasks[idx] = updated;
          } else {
            currentTasks.unshift(updated);
          }
          this.saveLocalTasks(tenantId, teacherId, currentTasks);
          return updated;
        }
      }
    } catch {
      // fallback
    }

    return this.updateTask(task?.id || id, { status: nextStatus });
  }

  public async deleteTask(id: string): Promise<void> {
    const currentUser = authService.getCurrentUser();
    const tenantId = currentUser.tenantId || tenantService.getActiveTenantId() || 'tenant-lan-nguyen';
    const teacherId = currentUser.id || currentUser.teacherId || 'gvcn';

    const cleanId = id.replace(/^task_/, '');
    const currentTasks = this.getLocalTasks(tenantId, teacherId);
    const filtered = currentTasks.filter(t => t.id !== id && t.id !== cleanId && `task_${t.id}` !== id);
    this.saveLocalTasks(tenantId, teacherId, filtered);

    try {
      await fetch(`/api/v1/teacher-work-center/tasks/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
        credentials: 'include'
      });
    } catch {
      // optional
    }
  }

  // --- CLIENT-SIDE AGGREGATION FALLBACK ---
  public buildClientSummary(classId?: string): TeacherWorkCenterSummary {
    const currentUser = authService.getCurrentUser();
    const tenantId = currentUser.tenantId || tenantService.getActiveTenantId() || 'tenant-lan-nguyen';
    const teacherId = currentUser.id || currentUser.teacherId || 'gvcn';
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // 1. Students
    const allStudents = studentService.getAll();
    const students = allStudents;

    // 2. Parent Conversations
    let convList: any[] = [];
    try {
      convList = parentCommunicationService.getConversationsForTeacher();
    } catch {
      convList = [];
    }

    const parentCommunications: WorkCenterParentMessageItem[] = [];
    let unreadParentMessagesCount = 0;

    for (const conv of convList) {
      if (conv.unreadTeacher && conv.unreadTeacher > 0) {
        unreadParentMessagesCount += conv.unreadTeacher;
      }
      const student = students.find(s => s.id === conv.studentId);
      const studentName = student ? student.fullName : 'Học sinh';

      let snippet = '';
      if (conv.messages && Array.isArray(conv.messages) && conv.messages.length > 0) {
        const last = conv.messages[conv.messages.length - 1];
        snippet = last.content || last.text || '';
      }

      if ((conv.unreadTeacher && conv.unreadTeacher > 0) || parentCommunications.length < 5) {
        parentCommunications.push({
          id: conv.id,
          studentId: conv.studentId,
          studentName,
          parentName: conv.parentName || (student?.fatherName || student?.motherName || 'Phụ huynh'),
          parentPhone: conv.parentPhone || (student?.fatherPhone || student?.motherPhone || null),
          topic: conv.topic || 'Trao đổi tình hình học sinh',
          unreadTeacher: conv.unreadTeacher || 0,
          lastMessageAt: conv.lastMessageAt || new Date().toISOString(),
          lastMessageSnippet: snippet.slice(0, 100)
        });
      }
    }

    // 3. Surveys
    const surveysToMonitor: WorkCenterSurveyItem[] = [];
    let pendingSurveyCount = 0;
    try {
      const templates = surveyTemplateService.getAll();
      const activeSurveys = templates.filter(t => t.status === 'PUBLISHED');

      for (const t of activeSurveys) {
        const totalTarget = students.length || 1;
        const responses = studentSurveyService.getResponsesByTemplate(t.id);
        const submittedCount = responses.filter(r => r.status === 'SUBMITTED' || r.status === 'REVIEWED').length;
        const pendingCount = Math.max(0, totalTarget - submittedCount);
        const rate = Math.round((submittedCount / totalTarget) * 100);

        if (pendingCount > 0) {
          pendingSurveyCount += pendingCount;
        }

        surveysToMonitor.push({
          id: t.id,
          title: t.title,
          totalStudents: totalTarget,
          completedCount: submittedCount,
          pendingCount,
          completionRate: rate,
          status: t.status,
          academicYear: (t as any).academicYear || '2025 - 2026',
          needsTeacherAction: pendingCount > 0
        });
      }
    } catch {
      // ignore
    }

    // 4. Missing Profile items
    const missingDataProfiles: WorkCenterMissingProfileItem[] = [];
    for (const s of students) {
      const missing: string[] = [];
      if (!s.phone || s.phone.trim() === '') missing.push('SĐT học sinh');
      if ((!s.fatherPhone || s.fatherPhone.trim() === '') && (!s.motherPhone || s.motherPhone.trim() === '')) {
        missing.push('SĐT phụ huynh');
      }
      if (!s.address || s.address.trim() === '') missing.push('Địa chỉ');
      if (!s.dob || s.dob.trim() === '') missing.push('Ngày sinh');

      if (missing.length > 0) {
        missingDataProfiles.push({
          id: s.id,
          code: s.code || s.anonymousCode || 'HS',
          fullName: s.fullName,
          missingFields: missing
        });
      }
    }

    // 5. Attention Students
    const studentsRequiringAttention: WorkCenterAttentionStudent[] = [];
    for (const s of students) {
      const reasons: string[] = [];
      if (s.needsSpecialAttention) {
        reasons.push(s.attentionNote ? `Theo dõi: ${s.attentionNote}` : 'Trong danh sách GVCN cần theo dõi đặc biệt');
      }

      const missingContacts: string[] = [];
      if (!s.phone) missingContacts.push('SĐT cá nhân');
      if (!s.fatherPhone && !s.motherPhone) missingContacts.push('SĐT liên hệ phụ huynh');
      if (missingContacts.length > 0) {
        reasons.push(`Thiếu thông tin: ${missingContacts.join(', ')}`);
      }

      if (reasons.length > 0) {
        studentsRequiringAttention.push({
          id: s.id,
          code: s.code || s.anonymousCode || 'HS',
          fullName: s.fullName,
          avatar: s.avatar || null,
          reasons,
          needsSpecialAttention: !!s.needsSpecialAttention,
          attentionNote: s.attentionNote || null,
          missingInfo: missingContacts
        });
      }
    }

    // 6. Personal Tasks
    const personalTasks = this.getLocalTasks(tenantId, teacherId);
    const overdueTasks = personalTasks.filter(t => t.status === 'OVERDUE');
    const pendingTasks = personalTasks.filter(t => t.status !== 'DONE');

    // 7. Upcoming Schedule
    const upcomingSchedule: WorkCenterScheduleItem[] = [];
    try {
      const timetable = academicService.getActiveTimetable();
      if (timetable && timetable.schedule) {
        const dayOfWeek = today.getDay(); // 0: CN, 1: T2, ..., 6: T7
        const dayKeyToday = dayOfWeek === 0 ? 'CN' : `Thứ ${dayOfWeek + 1}`;
        const dayKeyTodayShort = dayOfWeek === 0 ? 'CN' : `T${dayOfWeek + 1}`;
        const dayOfWeekTomorrow = (dayOfWeek + 1) % 7;
        const dayKeyTomorrow = dayOfWeekTomorrow === 0 ? 'CN' : `Thứ ${dayOfWeekTomorrow + 1}`;
        const dayKeyTomorrowShort = dayOfWeekTomorrow === 0 ? 'CN' : `T${dayOfWeekTomorrow + 1}`;

        let todayPeriods: any[] = [];
        let tomorrowPeriods: any[] = [];

        if (Array.isArray(timetable.schedule)) {
          const todayDay = timetable.schedule.find((d: any) => d.dayOfWeek === dayKeyToday || d.dayOfWeek === dayKeyTodayShort);
          if (todayDay) {
            todayPeriods = [
              ...(Array.isArray(todayDay.morningPeriods) ? todayDay.morningPeriods : []),
              ...(Array.isArray(todayDay.afternoonPeriods) ? todayDay.afternoonPeriods : [])
            ];
          }
          const tomorrowDay = timetable.schedule.find((d: any) => d.dayOfWeek === dayKeyTomorrow || d.dayOfWeek === dayKeyTomorrowShort);
          if (tomorrowDay) {
            tomorrowPeriods = [
              ...(Array.isArray(tomorrowDay.morningPeriods) ? tomorrowDay.morningPeriods : []),
              ...(Array.isArray(tomorrowDay.afternoonPeriods) ? tomorrowDay.afternoonPeriods : [])
            ];
          }
        } else if (typeof timetable.schedule === 'object') {
          todayPeriods = timetable.schedule[dayKeyTodayShort] || timetable.schedule[dayKeyToday] || [];
          tomorrowPeriods = timetable.schedule[dayKeyTomorrowShort] || timetable.schedule[dayKeyTomorrow] || [];
        }

        if (Array.isArray(todayPeriods)) {
          for (const period of todayPeriods) {
            if (period && period.subject && period.subject.trim() !== '') {
              upcomingSchedule.push({
                id: `tkb_today_${period.period}`,
                type: 'TIMETABLE',
                timeLabel: `Tiết ${period.period} (Hôm nay)`,
                title: `${period.subject} ${period.teacher ? `- GV: ${period.teacher}` : ''}`,
                subtitle: period.room ? `Phòng ${period.room}` : undefined,
                targetDate: todayStr,
                periodCategory: 'TODAY',
                priority: 'NORMAL'
              });
            }
          }
        }

        if (Array.isArray(tomorrowPeriods)) {
          for (const period of tomorrowPeriods) {
            if (period && period.subject && period.subject.trim() !== '') {
              upcomingSchedule.push({
                id: `tkb_tmr_${period.period}`,
                type: 'TIMETABLE',
                timeLabel: `Tiết ${period.period} (Ngày mai)`,
                title: `${period.subject} ${period.teacher ? `- GV: ${period.teacher}` : ''}`,
                subtitle: period.room ? `Phòng ${period.room}` : undefined,
                targetDate: tomorrowStr,
                periodCategory: 'TOMORROW',
                priority: 'LOW'
              });
            }
          }
        }
      }
    } catch {
      // ignore
    }

    // 8. Urgent Actions
    const urgentActions: WorkCenterActionItem[] = [];

    // Overdue tasks -> Urgent
    for (const t of overdueTasks) {
      urgentActions.push({
        id: `urgent_task_${t.id}`,
        title: `Công việc quá hạn: "${t.title}"`,
        target: 'Việc cá nhân GVCN',
        source: 'Kế hoạch cá nhân',
        sourceModule: 'TASKS',
        dueDate: t.due_date,
        priority: 'URGENT',
        status: 'OVERDUE',
        actionLabel: 'Xử lý ngay',
        actionModule: 'tasks',
        actionParams: { taskId: t.id }
      });
    }

    // Unread parent messages -> High/Urgent
    for (const conv of parentCommunications.filter(c => c.unreadTeacher > 0)) {
      urgentActions.push({
        id: `urgent_parent_${conv.id}`,
        title: `Phụ huynh gửi tin nhắn chưa phản hồi (${conv.unreadTeacher} tin)`,
        target: `PH em ${conv.studentName} (${conv.parentName})`,
        source: 'Nhịp cầu Phụ huynh',
        sourceModule: 'COMMUNICATION',
        priority: 'HIGH',
        status: 'TODO',
        actionLabel: 'Mở hội thoại',
        actionModule: 'parents',
        actionParams: { entityId: conv.studentId }
      });
    }

    // Pending survey proposals -> Urgent action
    try {
      const pendingProposals = surveySyncService.getProposals({ status: 'PENDING' });
      if (pendingProposals.length > 0) {
        urgentActions.push({
          id: `urgent_proposals_${pendingProposals.length}`,
          title: `Có ${pendingProposals.length} đề xuất đồng bộ khảo sát cần duyệt`,
          target: 'Khảo sát trực tuyến',
          source: 'Khảo sát học sinh',
          sourceModule: 'SURVEYS',
          priority: 'HIGH',
          status: 'TODO',
          actionLabel: 'Duyệt đề xuất',
          actionModule: 'surveys',
          actionParams: { subTab: 'proposals' }
        });
      }
    } catch {
      // ignore
    }

    const todayScheduleCount = upcomingSchedule.filter(s => s.periodCategory === 'TODAY').length;

    return {
      metrics: {
        totalPendingActions: urgentActions.length + pendingTasks.length,
        urgentCount: urgentActions.length,
        unreadParentMessages: unreadParentMessagesCount,
        missingProfileCount: missingDataProfiles.length,
        pendingSurveyCount,
        overdueTaskCount: overdueTasks.length,
        todayScheduleCount
      },
      urgentActions,
      parentCommunications,
      surveysToMonitor,
      studentsRequiringAttention,
      upcomingSchedule,
      missingDataProfiles,
      personalTasks
    };
  }
}

export const teacherWorkCenterClient = new TeacherWorkCenterClient();
