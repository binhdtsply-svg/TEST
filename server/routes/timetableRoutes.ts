import { Router, Response } from 'express';
import { AuthenticatedRequest, authenticateToken, requireRole } from '../auth/middleware';
import { timetableRepository } from '../repositories/TimetableRepository';
import { auditLogRepository } from '../repositories/AuditLogRepository';
import { eventHub } from '../events/EventHub';
import { persistenceSyncService } from '../services/PersistenceSyncService';

const router = Router();

router.use(authenticateToken);

// GET /api/v1/timetable
router.get('/', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const classId = (req.query.classId as string) || `class-${user.tenantId}`;
  const academicYear = (req.query.academicYear as string) || '2025 - 2026';
  const semester = (req.query.semester as string) || 'Học kỳ I';

  const row = timetableRepository.getTimetable(user.tenantId, classId, academicYear, semester);
  if (!row) {
    return res.json({ success: true, data: null });
  }

  let parsedGrid: any = null;
  try {
    parsedGrid = JSON.parse(row.schedule_grid_json);
  } catch {
    parsedGrid = null;
  }

  // If structured grid with working vs applied
  let finalGrid = parsedGrid;
  let sanitizedRawGrid = parsedGrid;
  if (parsedGrid && typeof parsedGrid === 'object' && !Array.isArray(parsedGrid)) {
    if (user.role === 'STUDENT' || user.role === 'PARENT') {
      const hasAppliedSchedule = parsedGrid.applied && Array.isArray(parsedGrid.applied.schedule) && parsedGrid.applied.schedule.length > 0;
      if (hasAppliedSchedule) {
        finalGrid = parsedGrid.applied;
      } else if (parsedGrid.status === 'APPLIED') {
        finalGrid = parsedGrid.applied || parsedGrid.working || parsedGrid;
      } else {
        // Not applied yet: student/parent receives null or empty applied version, never working draft
        finalGrid = parsedGrid.applied || null;
      }
      sanitizedRawGrid = {
        applied: finalGrid,
        status: parsedGrid.status === 'APPLIED' ? 'APPLIED' : 'DRAFT'
      };
    } else {
      finalGrid = parsedGrid.working || parsedGrid;
    }
  }

  return res.json({
    success: true,
    data: {
      classId: row.class_id,
      academicYear: row.academic_year,
      semester: row.semester,
      scheduleGrid: finalGrid,
      rawGrid: sanitizedRawGrid,
      updatedAt: row.updated_at
    }
  });
});

// POST /api/v1/timetable
router.post('/', requireRole('TEACHER', 'SUPER_ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const body = req.body;

  if (body.tenantId && body.tenantId !== user.tenantId && user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({
      success: false,
      errorCode: 'TENANT_ACCESS_DENIED',
      message: '403 TENANT ISOLATION ERROR: Bạn không có quyền cập nhật thời khóa biểu lớp khác.'
    });
  }

  const classId = body.classId || `class-${user.tenantId}`;
  const academicYear = body.academicYear || '2025 - 2026';
  const semester = body.semester || 'Học kỳ I';
  const action = body.action || (body.status === 'APPLIED' ? 'APPLY' : 'SAVE');

  timetableRepository.saveTimetable({
    tenant_id: user.tenantId,
    class_id: classId,
    academic_year: academicYear,
    semester: semester,
    schedule_grid_json: JSON.stringify(body.scheduleGrid || {}),
    updated_at: new Date().toISOString(),
    updated_by: user.userId
  });

  auditLogRepository.createLog({
    actorUserId: user.userId,
    actorRole: user.role,
    actorTenantId: user.tenantId,
    action: action === 'APPLY' ? 'TIMETABLE_APPLIED' : 'TIMETABLE_UPDATED',
    targetType: 'TIMETABLE',
    targetId: `${classId}_${academicYear}`,
    details: action === 'APPLY' ? `Áp dụng chính thức thời khóa biểu lớp ${classId}` : `Lưu bản nháp thời khóa biểu lớp ${classId}`
  });

  if (action === 'APPLY') {
    const timestamp = new Date().toISOString();
    eventHub.publish({
      id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      type: 'TIMETABLE_APPLIED',
      tenantId: user.tenantId,
      actorId: user.userId,
      actorRole: user.role,
      actorName: 'GVCN',
      timestamp,
      payload: {
        classId,
        academicYear,
        semester
      },
      notification: {
        title: `Thời khóa biểu mới: Lớp ${classId}`,
        message: `GVCN đã cập nhật và áp dụng thời khóa biểu mới cho lớp.`,
        type: 'info',
        linkTo: '/academic?tab=timetable',
        category: 'ACADEMIC'
      },
      targetRoles: ['STUDENT', 'CLASS_OFFICER', 'PARENT'],
      excludeUserIds: [user.userId],
      parentVisible: true
    });
  }

  try {
    persistenceSyncService.flushToPersistentBackup();
  } catch (err) {
    console.warn('[timetableRoutes] Timetable persistence flush notice:', err);
  }

  return res.json({ success: true, action });
});

// GET /api/v1/timetable/exams
router.get('/exams', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const exams = timetableRepository.getExamSchedules(user.tenantId);
  return res.json({ success: true, data: exams });
});

// POST /api/v1/timetable/exams
router.post('/exams', requireRole('TEACHER', 'SUPER_ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const body = req.body;

  const examId = body.id || `exam_${Date.now()}`;
  timetableRepository.upsertExamSchedule({
    id: examId,
    tenant_id: user.tenantId,
    class_id: body.classId || `class-${user.tenantId}`,
    exam_title: body.examTitle,
    subject: body.subject,
    exam_date: body.examDate,
    start_time: body.startTime,
    duration_minutes: body.durationMinutes || 45,
    room: body.room,
    notes: body.notes,
    created_at: body.createdAt || new Date().toISOString()
  });

  return res.json({ success: true, examId });
});

// GET /api/v1/timetable/assignments
router.get('/assignments', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const assignments = timetableRepository.getAssignments(user.tenantId);
  return res.json({ success: true, data: assignments });
});

// POST /api/v1/timetable/assignments
router.post('/assignments', requireRole('TEACHER', 'CLASS_OFFICER', 'SUPER_ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const body = req.body;

  const assignId = body.id || `as_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const existing = timetableRepository.getAssignmentById(user.tenantId, assignId);
  const now = new Date().toISOString();

  const dateStr = body.assignedDate || body.date || existing?.assigned_date || now.split('T')[0];
  const normDateStr = dateStr.split('T')[0];

  // Find other assignments on the same day in this tenant
  const existingSameDay = timetableRepository.getAssignments(user.tenantId).filter(
    a => (a.assigned_date === normDateStr || a.due_date === normDateStr || a.assigned_date === dateStr || a.due_date === dateStr) && (!existing || a.id !== existing.id)
  );
  const dayIsCurrentlyPinned = existingSameDay.length > 0 && existingSameDay.some(a => a.is_pinned === 1);

  // Preserve existing formatting and pin status unless explicitly provided
  let isPinned: number;
  if (body.isPinned !== undefined || body.pinnedToOverview !== undefined) {
    isPinned = (body.isPinned || body.pinnedToOverview) ? 1 : 0;
    // When explicit pin state is saved, keep entire day synchronized
    timetableRepository.updateDayPin(user.tenantId, normDateStr, isPinned);
    if (dateStr !== normDateStr) {
      timetableRepository.updateDayPin(user.tenantId, dateStr, isPinned);
    }
  } else if (existing) {
    isPinned = existing.is_pinned || 0;
  } else {
    // New assignment inherits day's existing pin status
    isPinned = dayIsCurrentlyPinned ? 1 : 0;
  }

  const bgColor = body.bgColor !== undefined 
    ? body.bgColor 
    : (body.bg_color !== undefined 
      ? body.bg_color 
      : (existing?.bg_color || (existingSameDay.find(a => a.bg_color)?.bg_color || null)));

  const textColor = body.textColor !== undefined 
    ? body.textColor 
    : (body.text_color !== undefined 
      ? body.text_color 
      : (existing?.text_color || (existingSameDay.find(a => a.text_color)?.text_color || null)));

  const desc = body.description ?? (body.preparation ?? (body.homework ?? (existing?.description || '')));

  timetableRepository.upsertAssignment({
    id: assignId,
    tenant_id: user.tenantId,
    class_id: body.classId || existing?.class_id || `class-${user.tenantId}`,
    title: body.title || `Báo bài môn ${body.subject}`,
    subject: body.subject,
    assigned_date: dateStr,
    due_date: body.dueDate || body.deadline || dateStr,
    description: desc,
    status: body.status || existing?.status || 'ACTIVE',
    is_pinned: isPinned,
    bg_color: bgColor,
    text_color: textColor,
    author_role: existing?.author_role || user.role,
    author_name: existing?.author_name || (user.role === 'TEACHER' ? 'GVCN' : user.officerRoleTitle || 'Ban cán sự'),
    created_at: existing?.created_at || body.createdAt || now,
    updated_at: now
  });

  const timestamp = new Date().toISOString();
  eventHub.publish({
    id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    type: 'ASSIGNMENT_CREATED',
    tenantId: user.tenantId,
    actorId: user.userId,
    actorRole: user.role,
    actorName: user.role === 'TEACHER' ? 'GVCN' : user.officerRoleTitle || 'Thành viên lớp',
    timestamp,
    payload: {
      assignmentId: assignId,
      title: body.title,
      subject: body.subject,
      dueDate: body.dueDate || dateStr,
      authorRole: user.role,
      isPinned: isPinned === 1,
      bgColor,
      textColor
    },
    notification: {
      title: `Báo bài mới: môn ${body.subject || 'học tập'}`,
      message: body.title || 'Nội dung dặn dò bài tập mới từ lớp.',
      type: 'info',
      linkTo: '/academic?tab=assignment',
      category: 'ACADEMIC',
      meta: { assignmentId: assignId }
    },
    targetRoles: user.role === 'TEACHER' ? ['STUDENT', 'CLASS_OFFICER', 'PARENT'] : ['TEACHER', 'STUDENT', 'CLASS_OFFICER', 'PARENT'],
    excludeUserIds: [user.userId],
    parentVisible: true
  });

  try {
    persistenceSyncService.flushToPersistentBackup();
  } catch (err) {
    console.warn('[timetableRoutes] Persistence backup flush notice:', err);
  }

  return res.json({ success: true, assignId, isPinned: isPinned === 1, bgColor, textColor });
});

// POST /api/v1/timetable/assignments/:id/toggle-pin
router.post('/assignments/:id/toggle-pin', requireRole('TEACHER', 'CLASS_OFFICER', 'SUPER_ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { id } = req.params;

  const existing = timetableRepository.getAssignmentById(user.tenantId, id);
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy mục báo bài cần ghim hoặc không có quyền' });
  }

  const date = existing.assigned_date || existing.due_date;
  if (!date) {
    return res.status(400).json({ success: false, message: 'Mục báo bài không có ngày xác định' });
  }

  const dayAssignments = timetableRepository.getAssignments(user.tenantId).filter(
    a => a.assigned_date === date || a.due_date === date
  );
  if (dayAssignments.length === 0) {
    return res.status(400).json({ success: false, message: 'Ngày này chưa có nội dung báo bài nào để ghim.' });
  }

  const allPinned = dayAssignments.every(a => a.is_pinned === 1);
  const nextPinned = !allPinned;

  const updatedCount = timetableRepository.updateDayPin(user.tenantId, date, nextPinned ? 1 : 0);

  try {
    persistenceSyncService.flushToPersistentBackup();
  } catch (err) {
    console.warn('[timetableRoutes] Toggle pin persistence flush notice:', err);
  }

  const timestamp = new Date().toISOString();
  try {
    eventHub.publish({
      id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      type: 'ASSIGNMENT_UPDATED',
      tenantId: user.tenantId,
      actorId: user.userId,
      actorRole: user.role,
      actorName: user.role === 'TEACHER' ? 'GVCN' : user.officerRoleTitle || 'Thành viên lớp',
      timestamp,
      payload: {
        date,
        assignmentId: id,
        isPinned: nextPinned,
        updatedCount
      },
      notification: {
        title: nextPinned ? `Báo bài đã ghim: ngày ${date}` : `Bỏ ghim báo bài: ngày ${date}`,
        message: nextPinned ? `Đã ghim toàn bộ báo bài ngày ${date} (${updatedCount} môn).` : `Đã bỏ ghim báo bài ngày ${date}.`,
        type: 'info',
        linkTo: '/academic?tab=assignment',
        category: 'ACADEMIC'
      },
      targetRoles: ['TEACHER', 'STUDENT', 'CLASS_OFFICER', 'PARENT'],
      excludeUserIds: [user.userId],
      parentVisible: true
    });
  } catch (err) {
    console.warn('[timetableRoutes] Toggle pin eventHub error notice:', err);
  }

  return res.json({ success: true, id, date, isPinned: nextPinned, count: updatedCount });
});

// DELETE /api/v1/timetable/assignments/:id
router.delete('/assignments/:id', requireRole('TEACHER', 'CLASS_OFFICER', 'SUPER_ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { id } = req.params;

  const existing = timetableRepository.getAssignmentById(user.tenantId, id);
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy mục báo bài hoặc không có quyền xóa' });
  }

  const deleted = timetableRepository.deleteAssignment(user.tenantId, id);
  if (deleted) {
    const timestamp = new Date().toISOString();
    eventHub.publish({
      id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      type: 'ASSIGNMENT_DELETED',
      tenantId: user.tenantId,
      actorId: user.userId,
      actorRole: user.role,
      actorName: user.role === 'TEACHER' ? 'GVCN' : user.officerRoleTitle || 'Thành viên lớp',
      timestamp,
      payload: {
        assignmentId: id,
        title: existing.title,
        subject: existing.subject
      },
      targetRoles: ['TEACHER', 'STUDENT', 'CLASS_OFFICER', 'PARENT'],
      excludeUserIds: [user.userId],
      parentVisible: true
    });
    try {
      persistenceSyncService.flushToPersistentBackup();
    } catch (err) {
      console.warn('[timetableRoutes] Persistence backup flush notice:', err);
    }
  }

  return res.json({ success: true, deleted });
});

// POST /api/v1/timetable/assignments/batch
router.post('/assignments/batch', requireRole('TEACHER', 'CLASS_OFFICER', 'SUPER_ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { items } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Danh sách môn báo bài không hợp lệ' });
  }

  const savedIds: string[] = [];
  const now = new Date().toISOString();

  for (const item of items) {
    if (!item.subject) continue;
    const assignId = item.id || `as_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const dateStr = item.assignedDate || item.date || now.split('T')[0];
    const desc = item.description || item.preparation || item.homework || '';
    const isPinned = item.isPinned || item.pinnedToOverview ? 1 : 0;
    const bgColor = item.bgColor || item.bg_color || null;
    const textColor = item.textColor || item.text_color || null;

    timetableRepository.upsertAssignment({
      id: assignId,
      tenant_id: user.tenantId,
      class_id: item.classId || `class-${user.tenantId}`,
      title: item.title || `Báo bài môn ${item.subject}`,
      subject: item.subject,
      assigned_date: dateStr,
      due_date: item.dueDate || dateStr,
      description: desc,
      status: item.status || 'ACTIVE',
      is_pinned: isPinned,
      bg_color: bgColor,
      text_color: textColor,
      author_role: user.role,
      author_name: user.role === 'TEACHER' ? 'GVCN' : user.officerRoleTitle || 'Ban cán sự',
      created_at: item.createdAt || now,
      updated_at: now
    });

    savedIds.push(assignId);
  }

  try {
    persistenceSyncService.flushToPersistentBackup();
  } catch (err) {
    console.warn('[timetableRoutes] Batch persistence backup flush notice:', err);
  }

  return res.json({ success: true, count: savedIds.length, ids: savedIds });
});

// POST /api/v1/timetable/assignments/shift-date
router.post('/assignments/shift-date', requireRole('TEACHER', 'CLASS_OFFICER', 'SUPER_ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { ids, newDate } = req.body;

  if (!Array.isArray(ids) || !newDate) {
    return res.status(400).json({ success: false, message: 'Dữ liệu chuyển ngày không hợp lệ' });
  }

  let updatedCount = 0;
  for (const id of ids) {
    const existing = timetableRepository.getAssignmentById(user.tenantId, id);
    if (existing) {
      timetableRepository.upsertAssignment({
        ...existing,
        assigned_date: newDate,
        due_date: newDate
      });
      updatedCount++;
    }
  }

  try {
    persistenceSyncService.flushToPersistentBackup();
  } catch (err) {
    console.warn('[timetableRoutes] Shift-date persistence backup flush notice:', err);
  }

  return res.json({ success: true, updatedCount });
});

// POST /api/v1/timetable/assignments/day-appearance
router.post('/assignments/day-appearance', requireRole('TEACHER', 'CLASS_OFFICER', 'SUPER_ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { date, bgColor, textColor } = req.body;

  if (!date) {
    return res.status(400).json({ success: false, message: 'Thiếu thông tin ngày học cần đổi màu' });
  }

  const updatedCount = timetableRepository.updateDayAppearance(
    user.tenantId,
    date,
    bgColor || null,
    textColor || null
  );

  try {
    persistenceSyncService.flushToPersistentBackup();
  } catch (err) {
    console.warn('[timetableRoutes] Day appearance persistence backup flush notice:', err);
  }

  const timestamp = new Date().toISOString();
  try {
    eventHub.publish({
      id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      type: 'ASSIGNMENT_UPDATED',
      tenantId: user.tenantId,
      actorId: user.userId,
      actorRole: user.role,
      actorName: user.role === 'TEACHER' ? 'GVCN' : user.officerRoleTitle || 'Thành viên lớp',
      timestamp,
      payload: {
        date,
        bgColor,
        textColor,
        updatedCount
      },
      targetRoles: ['TEACHER', 'STUDENT', 'CLASS_OFFICER', 'PARENT'],
      excludeUserIds: [user.userId],
      parentVisible: true
    });
  } catch (err) {
    console.warn('[timetableRoutes] Day appearance eventHub error notice:', err);
  }

  return res.json({ success: true, date, bgColor, textColor, count: updatedCount });
});

// POST /api/v1/timetable/assignments/day-toggle-pin
router.post('/assignments/day-toggle-pin', requireRole('TEACHER', 'CLASS_OFFICER', 'SUPER_ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { date, isPinned: explicitPinned } = req.body;

  if (!date) {
    return res.status(400).json({ success: false, message: 'Thiếu thông tin ngày học cần ghim' });
  }

  const normDate = date.split('T')[0];

  const dayAssignments = timetableRepository.getAssignments(user.tenantId).filter(
    a => a.assigned_date === date || a.due_date === date || a.assigned_date === normDate || a.due_date === normDate
  );

  // Không cho ghim nội dung rỗng nếu ngày đó chưa có báo bài
  if (dayAssignments.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Ngày này chưa có nội dung báo bài nào để ghim. Không cho phép ghim nội dung rỗng.'
    });
  }

  // If explicitPinned is given, use it; otherwise check current status of assignments for that date
  let nextPinned: boolean;
  if (typeof explicitPinned === 'boolean') {
    nextPinned = explicitPinned;
  } else {
    // If all are pinned, unpin; otherwise pin
    const allPinned = dayAssignments.every(a => a.is_pinned === 1);
    nextPinned = !allPinned;
  }

  const updatedCount = timetableRepository.updateDayPin(user.tenantId, normDate, nextPinned ? 1 : 0);
  if (date !== normDate) {
    timetableRepository.updateDayPin(user.tenantId, date, nextPinned ? 1 : 0);
  }

  try {
    persistenceSyncService.flushToPersistentBackup();
  } catch (err) {
    console.warn('[timetableRoutes] Day toggle pin persistence backup flush notice:', err);
  }

  const timestamp = new Date().toISOString();
  try {
    eventHub.publish({
      id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      type: 'ASSIGNMENT_UPDATED',
      tenantId: user.tenantId,
      actorId: user.userId,
      actorRole: user.role,
      actorName: user.role === 'TEACHER' ? 'GVCN' : user.officerRoleTitle || 'Thành viên lớp',
      timestamp,
      payload: {
        date,
        isPinned: nextPinned,
        updatedCount
      },
      notification: {
        title: nextPinned ? `Báo bài đã ghim: ${date}` : `Bỏ ghim báo bài: ${date}`,
        message: nextPinned ? 'GVCN đã ghim báo bài ngày này lên Bảng tin lớp.' : 'Trạng thái ghim báo bài đã được cập nhật.',
        type: 'info',
        linkTo: '/academic?tab=assignment',
        category: 'ACADEMIC'
      },
      targetRoles: ['TEACHER', 'STUDENT', 'CLASS_OFFICER', 'PARENT'],
      excludeUserIds: [user.userId],
      parentVisible: true
    });
  } catch (err) {
    console.warn('[timetableRoutes] Day toggle pin eventHub error notice:', err);
  }

  return res.json({ success: true, date, isPinned: nextPinned, count: updatedCount });
});

export default router;
