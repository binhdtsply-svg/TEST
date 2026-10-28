import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import { getDatabase } from '../db/database';
import { StudentRepository } from './StudentRepository';
import { ParentCommunicationRepository } from './ParentCommunicationRepository';
import { SurveyRepository } from './SurveyRepository';
import { TimetableRepository } from './TimetableRepository';

export interface TeacherPersonalTaskRecord {
  id: string;
  tenant_id: string;
  teacher_id: string;
  class_id?: string | null;
  title: string;
  notes?: string | null;
  due_date?: string | null; // ISO YYYY-MM-DD
  start_time?: string | null;
  end_time?: string | null;
  location?: string | null;
  category?: string | null;
  is_all_day?: number | boolean;
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
  targetDate: string; // YYYY-MM-DD
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
  personalTasks: TeacherPersonalTaskRecord[];
}

export class TeacherWorkCenterRepository {
  private static instance: TeacherWorkCenterRepository;
  private db: DatabaseSync;
  private studentRepo: StudentRepository;
  private parentRepo: ParentCommunicationRepository;
  private surveyRepo: SurveyRepository;
  private timetableRepo: TimetableRepository;

  private constructor() {
    this.db = getDatabase();
    this.studentRepo = StudentRepository.getInstance();
    this.parentRepo = new ParentCommunicationRepository();
    this.surveyRepo = new SurveyRepository();
    this.timetableRepo = new TimetableRepository();
  }

  public static getInstance(): TeacherWorkCenterRepository {
    if (!TeacherWorkCenterRepository.instance) {
      TeacherWorkCenterRepository.instance = new TeacherWorkCenterRepository();
    }
    return TeacherWorkCenterRepository.instance;
  }

  // --- PERSONAL TASKS CRUD ---
  public getPersonalTasks(
    tenantId: string,
    teacherId: string,
    filter?: 'ALL' | 'TODAY' | 'OVERDUE' | 'UPCOMING' | 'DONE'
  ): TeacherPersonalTaskRecord[] {
    const todayStr = new Date().toISOString().split('T')[0];
    let query = 'SELECT * FROM teacher_personal_tasks WHERE tenant_id = ? AND teacher_id = ?';
    const params: any[] = [tenantId, teacherId];

    if (filter === 'DONE') {
      query += " AND status = 'DONE' ORDER BY completed_at DESC, updated_at DESC";
    } else if (filter === 'TODAY') {
      query += " AND status != 'DONE' AND (due_date = ? OR due_date IS NULL) ORDER BY CASE priority WHEN 'URGENT' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'NORMAL' THEN 3 ELSE 4 END, created_at DESC";
      params.push(todayStr);
    } else if (filter === 'OVERDUE') {
      query += " AND status != 'DONE' AND due_date < ? ORDER BY due_date ASC";
      params.push(todayStr);
    } else if (filter === 'UPCOMING') {
      query += " AND status != 'DONE' AND due_date > ? ORDER BY due_date ASC";
      params.push(todayStr);
    } else {
      query += " ORDER BY CASE status WHEN 'DONE' THEN 2 ELSE 1 END, CASE priority WHEN 'URGENT' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'NORMAL' THEN 3 ELSE 4 END, created_at DESC";
    }

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];

    // Dynamically mark overdue if needed
    return rows.map(r => {
      let status = r.status;
      if (status !== 'DONE' && r.due_date && r.due_date < todayStr) {
        status = 'OVERDUE';
      }
      return {
        ...r,
        status
      };
    });
  }

  public getPersonalTaskById(tenantId: string, taskId: string): TeacherPersonalTaskRecord | null {
    const rawId = taskId.replace(/^task_/, '');
    const prefixedId = taskId.startsWith('task_') ? taskId : `task_${taskId}`;
    const stmt = this.db.prepare(
      'SELECT * FROM teacher_personal_tasks WHERE (tenant_id = ? OR ? = \'platform-root\') AND (id = ? OR id = ? OR id = ?)'
    );
    const row = stmt.get(tenantId, tenantId, taskId, rawId, prefixedId) as any;
    if (!row) return null;
    const todayStr = new Date().toISOString().split('T')[0];
    let status = row.status;
    if (status !== 'DONE' && row.due_date && row.due_date < todayStr) {
      status = 'OVERDUE';
    }
    return { ...row, status };
  }

  public createPersonalTask(
    tenantId: string,
    teacherId: string,
    data: {
      title: string;
      notes?: string | null;
      due_date?: string | null;
      start_time?: string | null;
      end_time?: string | null;
      location?: string | null;
      category?: string | null;
      is_all_day?: boolean | number;
      priority?: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';
      class_id?: string | null;
      linked_module?: string | null;
      linked_entity_id?: string | null;
    }
  ): TeacherPersonalTaskRecord {
    const id = `task_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const now = new Date().toISOString();
    const priority = data.priority || 'NORMAL';
    const status = 'TODO';
    const category = data.category || 'HOMEROOM';
    const isAllDay = data.is_all_day ? 1 : 0;

    const stmt = this.db.prepare(`
      INSERT INTO teacher_personal_tasks (
        id, tenant_id, teacher_id, class_id, title, notes, due_date,
        start_time, end_time, location, category, is_all_day,
        priority, status, linked_module, linked_entity_id, created_at, updated_at, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
    `);

    stmt.run(
      id,
      tenantId,
      teacherId,
      data.class_id || null,
      data.title.trim(),
      data.notes ? data.notes.trim() : null,
      data.due_date || null,
      data.start_time || null,
      data.end_time || null,
      data.location ? data.location.trim() : null,
      category,
      isAllDay,
      priority,
      status,
      data.linked_module || null,
      data.linked_entity_id || null,
      now,
      now
    );

    return this.getPersonalTaskById(tenantId, id)!;
  }

  public updatePersonalTask(
    tenantId: string,
    taskId: string,
    updates: Partial<TeacherPersonalTaskRecord>
  ): TeacherPersonalTaskRecord | null {
    const existing = this.getPersonalTaskById(tenantId, taskId);
    if (!existing) return null;

    const now = new Date().toISOString();
    const newStatus = updates.status !== undefined ? updates.status : existing.status;
    const completedAt = newStatus === 'DONE' ? (existing.completed_at || now) : null;
    const isAllDay = updates.is_all_day !== undefined ? (updates.is_all_day ? 1 : 0) : (existing.is_all_day ? 1 : 0);

    const stmt = this.db.prepare(`
      UPDATE teacher_personal_tasks
      SET title = COALESCE(?, title),
          notes = COALESCE(?, notes),
          due_date = ?,
          start_time = COALESCE(?, start_time),
          end_time = COALESCE(?, end_time),
          location = COALESCE(?, location),
          category = COALESCE(?, category),
          is_all_day = COALESCE(?, is_all_day),
          priority = COALESCE(?, priority),
          status = COALESCE(?, status),
          linked_module = COALESCE(?, linked_module),
          linked_entity_id = COALESCE(?, linked_entity_id),
          completed_at = ?,
          updated_at = ?
      WHERE tenant_id = ? AND id = ?
    `);

    stmt.run(
      updates.title !== undefined ? updates.title.trim() : null,
      updates.notes !== undefined ? (updates.notes ? updates.notes.trim() : null) : null,
      updates.due_date !== undefined ? updates.due_date : existing.due_date,
      updates.start_time !== undefined ? updates.start_time : null,
      updates.end_time !== undefined ? updates.end_time : null,
      updates.location !== undefined ? (updates.location ? updates.location.trim() : null) : null,
      updates.category !== undefined ? updates.category : null,
      isAllDay,
      updates.priority !== undefined ? updates.priority : null,
      newStatus,
      updates.linked_module !== undefined ? updates.linked_module : null,
      updates.linked_entity_id !== undefined ? updates.linked_entity_id : null,
      completedAt,
      now,
      tenantId,
      existing.id
    );

    return this.getPersonalTaskById(tenantId, existing.id);
  }

  public deletePersonalTask(tenantId: string, taskId: string): boolean {
    const rawId = taskId.replace(/^task_/, '');
    const prefixedId = taskId.startsWith('task_') ? taskId : `task_${taskId}`;
    const stmt = this.db.prepare(
      'DELETE FROM teacher_personal_tasks WHERE (tenant_id = ? OR ? = \'platform-root\') AND (id = ? OR id = ? OR id = ?)'
    );
    const res = stmt.run(tenantId, tenantId, taskId, rawId, prefixedId);
    return (res.changes ?? 0) > 0;
  }

  public toggleTaskStatus(tenantId: string, taskId: string): TeacherPersonalTaskRecord | null {
    const task = this.getPersonalTaskById(tenantId, taskId);
    if (!task) return null;

    const nextStatus = task.status === 'DONE' ? 'TODO' : 'DONE';
    return this.updatePersonalTask(tenantId, taskId, { status: nextStatus });
  }

  // --- AGGREGATED SUMMARY FOR DASHBOARD ---
  public getAggregatedSummary(
    tenantId: string,
    teacherId: string,
    classId?: string
  ): TeacherWorkCenterSummary {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // 1. Fetch Students
    const allStudents = this.studentRepo.getAllByTenant(tenantId);
    const students = classId ? allStudents.filter(s => s.class_id === classId) : allStudents;

    // 2. Fetch Parent Conversations
    const convRows = this.parentRepo.getConversations(tenantId);
    const studentMap = new Map<string, typeof allStudents[0]>(students.map(s => [s.id, s]));

    const parentCommunications: WorkCenterParentMessageItem[] = [];
    let unreadParentMessagesCount = 0;

    for (const conv of convRows) {
      if (conv.unread_teacher > 0) {
        unreadParentMessagesCount += conv.unread_teacher;
      }
      const student = studentMap.get(conv.student_id);
      const studentName = student ? student.full_name : 'Học sinh';

      let snippet = '';
      try {
        const msgs = JSON.parse(conv.messages_json || '[]');
        if (Array.isArray(msgs) && msgs.length > 0) {
          const lastMsg = msgs[msgs.length - 1];
          snippet = lastMsg.text || lastMsg.content || '';
        }
      } catch {}

      if (conv.unread_teacher > 0 || parentCommunications.length < 5) {
        parentCommunications.push({
          id: conv.id,
          studentId: conv.student_id,
          studentName,
          parentName: conv.parent_name || (student?.father_name || student?.mother_name || 'Phụ huynh'),
          parentPhone: conv.parent_phone || (student?.father_phone || student?.mother_phone || null),
          topic: conv.topic || 'Trao đổi tình hình học sinh',
          unreadTeacher: conv.unread_teacher || 0,
          lastMessageAt: conv.last_message_at,
          lastMessageSnippet: snippet.slice(0, 100)
        });
      }
    }

    // 3. Fetch Surveys and Responses
    const surveyTemplates = this.surveyRepo.getTemplatesByTenant(tenantId);
    const activeSurveys = surveyTemplates.filter(t => t.status === 'PUBLISHED');
    const allResponses = this.surveyRepo.getResponsesByTenant(tenantId);
    const surveysToMonitor: WorkCenterSurveyItem[] = [];
    const submittedStudentIdsBySurvey = new Map<string, Set<string>>();

    for (const st of activeSurveys) {
      const responses = allResponses.filter(r => r.template_id === st.id);
      const submittedSet = new Set<string>();
      for (const r of responses) {
        if (r.status === 'SUBMITTED' || r.status === 'REVIEWED') {
          submittedSet.add(r.student_id);
        }
      }
      submittedStudentIdsBySurvey.set(st.id, submittedSet);

      const totalTarget = students.length || 1;
      const completedCount = submittedSet.size;
      const pendingCount = Math.max(0, totalTarget - completedCount);
      const rate = Math.round((completedCount / totalTarget) * 100);

      surveysToMonitor.push({
        id: st.id,
        title: st.title,
        totalStudents: totalTarget,
        completedCount,
        pendingCount,
        completionRate: rate,
        status: st.status,
        academicYear: st.academic_year || '2025-2026',
        needsTeacherAction: pendingCount > 0
      });
    }

    // 4. Missing Profile Fields
    const missingDataProfiles: WorkCenterMissingProfileItem[] = [];
    for (const s of students) {
      const missing: string[] = [];
      if (!s.phone || s.phone.trim() === '') missing.push('SĐT học sinh');
      if ((!s.father_phone || s.father_phone.trim() === '') && (!s.mother_phone || s.mother_phone.trim() === '')) {
        missing.push('SĐT phụ huynh');
      }
      if (!s.address || s.address.trim() === '') missing.push('Địa chỉ');
      if (!s.dob || s.dob.trim() === '') missing.push('Ngày sinh');

      if (missing.length > 0) {
        missingDataProfiles.push({
          id: s.id,
          code: s.code,
          fullName: s.full_name,
          missingFields: missing
        });
      }
    }

    // 5. Students Requiring Attention (Real Data Signals)
    const studentsRequiringAttention: WorkCenterAttentionStudent[] = [];
    for (const s of students) {
      const reasons: string[] = [];

      // Check special attention flag
      if (s.needs_special_attention === 1) {
        reasons.push(s.attention_note ? `Theo dõi: ${s.attention_note}` : 'Trong danh sách GVCN cần theo dõi đặc biệt');
      }

      // Check missing survey
      for (const st of activeSurveys) {
        const submitted = submittedStudentIdsBySurvey.get(st.id);
        if (submitted && !submitted.has(s.id)) {
          reasons.push(`Chưa nộp khảo sát: "${st.title}"`);
        }
      }

      // Check missing important contacts
      const missingContacts: string[] = [];
      if (!s.phone) missingContacts.push('SĐT cá nhân');
      if (!s.father_phone && !s.mother_phone) missingContacts.push('SĐT liên hệ phụ huynh');
      if (missingContacts.length > 0) {
        reasons.push(`Thiếu thông tin: ${missingContacts.join(', ')}`);
      }

      if (reasons.length > 0) {
        studentsRequiringAttention.push({
          id: s.id,
          code: s.code,
          fullName: s.full_name,
          avatar: s.avatar || null,
          reasons,
          needsSpecialAttention: s.needs_special_attention === 1,
          attentionNote: s.attention_note || null,
          missingInfo: missingContacts
        });
      }
    }

    // 6. Personal Tasks
    const personalTasks = this.getPersonalTasks(tenantId, teacherId, 'ALL');
    const overdueTasks = personalTasks.filter(t => t.status === 'OVERDUE');
    const pendingTasks = personalTasks.filter(t => t.status !== 'DONE');

    // 7. Schedule & Upcoming
    const upcomingSchedule: WorkCenterScheduleItem[] = [];
    
    // Add today/tomorrow timetable if exists
    try {
      const activeTimetable = this.timetableRepo.getTimetable(tenantId, classId || '12A1', '2025 - 2026', 'Học kỳ I') 
        || this.timetableRepo.getTimetable(tenantId, 'class-11a1-2025', '2025 - 2026', 'Học kỳ I');
      if (activeTimetable) {
        const grid = JSON.parse(activeTimetable.schedule_grid_json || '{}');
        const dayOfWeek = today.getDay(); // 0: CN, 1: T2, 2: T3, ..., 6: T7
        const dayKeyToday = dayOfWeek === 0 ? 'CN' : `T${dayOfWeek + 1}`;
        const dayOfWeekTomorrow = (dayOfWeek + 1) % 7;
        const dayKeyTomorrow = dayOfWeekTomorrow === 0 ? 'CN' : `T${dayOfWeekTomorrow + 1}`;

        if (grid[dayKeyToday] && Array.isArray(grid[dayKeyToday])) {
          for (const period of grid[dayKeyToday]) {
            if (period.subject && period.subject.trim() !== '') {
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

        if (grid[dayKeyTomorrow] && Array.isArray(grid[dayKeyTomorrow])) {
          for (const period of grid[dayKeyTomorrow]) {
            if (period.subject && period.subject.trim() !== '') {
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
    } catch {}

    // Add personal task deadlines to upcoming schedule
    for (const task of pendingTasks) {
      if (task.due_date) {
        const isToday = task.due_date === todayStr;
        const isTomorrow = task.due_date === tomorrowStr;
        upcomingSchedule.push({
          id: `task_sched_${task.id}`,
          type: 'TASK',
          timeLabel: isToday ? 'Hôm nay' : isTomorrow ? 'Ngày mai' : task.due_date,
          title: task.title,
          subtitle: task.notes || undefined,
          targetDate: task.due_date,
          periodCategory: isToday ? 'TODAY' : isTomorrow ? 'TOMORROW' : 'UPCOMING',
          priority: task.priority
        });
      }
    }

    // 8. Consolidated Urgent Action Items (Việc cần xử lý ngay)
    const urgentActions: WorkCenterActionItem[] = [];

    // A. Unread parent messages waiting for response
    const unreadConvs = convRows.filter(c => c.unread_teacher > 0);
    for (const c of unreadConvs) {
      const student = studentMap.get(c.student_id);
      urgentActions.push({
        id: `act_parent_${c.id}`,
        title: `Phụ huynh ${c.parent_name || 'học sinh'} gửi ${c.unread_teacher} tin nhắn chờ phản hồi`,
        target: student ? `${student.full_name} (${student.code})` : 'Phụ huynh',
        source: 'Nhịp cầu Phụ huynh',
        sourceModule: 'parents',
        priority: 'URGENT',
        status: 'TODO',
        actionLabel: 'Trả lời ngay',
        actionModule: 'parents',
        actionParams: { entityId: c.student_id, subTab: 'private' }
      });
    }

    // B. Overdue Personal Tasks
    for (const ot of overdueTasks) {
      urgentActions.push({
        id: `act_task_${ot.id}`,
        title: ot.title,
        target: 'Công việc GVCN',
        source: 'Việc cá nhân',
        sourceModule: 'overview',
        dueDate: ot.due_date,
        priority: 'URGENT',
        status: 'OVERDUE',
        actionLabel: 'Xem việc',
        actionModule: 'overview',
        actionParams: { taskId: ot.id }
      });
    }

    // C. Surveys needing attention (if incomplete rate is high)
    for (const st of surveysToMonitor) {
      if (st.pendingCount > 0) {
        urgentActions.push({
          id: `act_survey_${st.id}`,
          title: `Khảo sát "${st.title}": còn ${st.pendingCount}/${st.totalStudents} học sinh chưa nộp`,
          target: `${st.pendingCount} học sinh`,
          source: 'Khảo sát lớp',
          sourceModule: 'surveys',
          priority: st.pendingCount > (st.totalStudents / 2) ? 'HIGH' : 'NORMAL',
          status: 'TODO',
          actionLabel: 'Theo dõi & Đôn đốc',
          actionModule: 'surveys',
          actionParams: { templateId: st.id, subTab: 'responses' }
        });
      }
    }

    // D. Missing student profiles action
    if (missingDataProfiles.length > 0) {
      urgentActions.push({
        id: 'act_missing_profiles',
        title: `Có ${missingDataProfiles.length} học sinh còn thiếu thông tin liên lạc / hồ sơ`,
        target: `${missingDataProfiles.length} hồ sơ`,
        source: 'Quản lý Học viên',
        sourceModule: 'students',
        priority: 'NORMAL',
        status: 'TODO',
        actionLabel: 'Bổ sung hồ sơ',
        actionModule: 'students',
        actionParams: { filter: 'incomplete' }
      });
    }

    // 9. Consolidated Metrics
    const urgentCount = urgentActions.filter(a => a.priority === 'URGENT' || a.priority === 'HIGH').length;
    const totalPendingActions = urgentActions.length + pendingTasks.length;

    return {
      metrics: {
        totalPendingActions,
        urgentCount,
        unreadParentMessages: unreadParentMessagesCount,
        missingProfileCount: missingDataProfiles.length,
        pendingSurveyCount: surveysToMonitor.reduce((acc, s) => acc + s.pendingCount, 0),
        overdueTaskCount: overdueTasks.length,
        todayScheduleCount: upcomingSchedule.filter(s => s.periodCategory === 'TODAY').length
      },
      urgentActions: urgentActions.slice(0, 10),
      parentCommunications: parentCommunications.slice(0, 8),
      surveysToMonitor,
      studentsRequiringAttention: studentsRequiringAttention.slice(0, 10),
      upcomingSchedule: upcomingSchedule.slice(0, 10),
      missingDataProfiles: missingDataProfiles.slice(0, 10),
      personalTasks
    };
  }
}

export const teacherWorkCenterRepository = TeacherWorkCenterRepository.getInstance();
