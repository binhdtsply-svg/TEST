import { Router, Response } from 'express';
import {
  authenticateToken,
  requireRole,
  requireTenantAccess,
  AuthenticatedRequest
} from '../auth/middleware';
import { teacherWorkCenterRepository } from '../repositories/TeacherWorkCenterRepository';

const router = Router();

// Apply authentication and role check (ONLY TEACHER and SUPER_ADMIN)
router.use(authenticateToken);
router.use(requireRole('TEACHER', 'SUPER_ADMIN'));

/**
 * GET /api/v1/teacher-work-center/summary
 * Returns aggregated work center data (urgent items, messages, surveys, attention students, schedule, tasks)
 */
router.get('/summary', requireTenantAccess, (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const teacherId = req.user!.teacherId || req.user!.userId;
    const classId = req.query.classId as string | undefined;

    const summary = teacherWorkCenterRepository.getAggregatedSummary(tenantId, teacherId, classId);
    return res.json({
      success: true,
      data: summary
    });
  } catch (error: any) {
    console.error('[WORK-CENTER-SUMMARY-ERROR]', error);
    return res.status(500).json({
      success: false,
      errorCode: 'SUMMARY_FETCH_FAILED',
      message: error?.message || 'Không thể tải dữ liệu Trung tâm công việc GVCN.'
    });
  }
});

/**
 * GET /api/v1/teacher-work-center/tasks
 * Returns personal tasks list with optional filter
 */
router.get('/tasks', requireTenantAccess, (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const teacherId = req.user!.teacherId || req.user!.userId;
    const filter = (req.query.filter as any) || 'ALL';

    const tasks = teacherWorkCenterRepository.getPersonalTasks(tenantId, teacherId, filter);
    return res.json({
      success: true,
      data: tasks
    });
  } catch (error: any) {
    console.error('[WORK-CENTER-TASKS-ERROR]', error);
    return res.status(500).json({
      success: false,
      errorCode: 'TASKS_FETCH_FAILED',
      message: error?.message || 'Không thể tải danh sách việc cá nhân.'
    });
  }
});

/**
 * POST /api/v1/teacher-work-center/tasks
 * Creates a new personal task
 */
router.post('/tasks', requireTenantAccess, (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const teacherId = req.user!.teacherId || req.user!.userId;
    const {
      title,
      notes,
      due_date,
      start_time,
      end_time,
      location,
      category,
      is_all_day,
      priority,
      class_id,
      linked_module,
      linked_entity_id
    } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_TITLE',
        message: 'Tiêu đề công việc là bắt buộc.'
      });
    }

    const task = teacherWorkCenterRepository.createPersonalTask(tenantId, teacherId, {
      title: title.trim(),
      notes: notes ? notes.trim() : null,
      due_date: due_date || null,
      start_time: start_time || null,
      end_time: end_time || null,
      location: location ? location.trim() : null,
      category: category || 'HOMEROOM',
      is_all_day: Boolean(is_all_day),
      priority: priority || 'NORMAL',
      class_id: class_id || null,
      linked_module: linked_module || null,
      linked_entity_id: linked_entity_id || null
    });

    return res.status(201).json({
      success: true,
      data: task,
      message: 'Tạo công việc cá nhân thành công.'
    });
  } catch (error: any) {
    console.error('[WORK-CENTER-TASK-CREATE-ERROR]', error);
    return res.status(500).json({
      success: false,
      errorCode: 'TASK_CREATE_FAILED',
      message: error?.message || 'Không thể tạo công việc cá nhân.'
    });
  }
});

const handleUpdateTask = (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const taskId = req.params.id;
    const updates = req.body;

    const updated = teacherWorkCenterRepository.updatePersonalTask(tenantId, taskId, updates);
    if (!updated) {
      return res.status(404).json({
        success: false,
        errorCode: 'TASK_NOT_FOUND',
        message: 'Không tìm thấy công việc cần cập nhật.'
      });
    }

    return res.json({
      success: true,
      data: updated,
      message: 'Cập nhật công việc thành công.'
    });
  } catch (error: any) {
    console.error('[WORK-CENTER-TASK-UPDATE-ERROR]', error);
    return res.status(500).json({
      success: false,
      errorCode: 'TASK_UPDATE_FAILED',
      message: error?.message || 'Không thể cập nhật công việc.'
    });
  }
};

/**
 * PUT & PATCH /api/v1/teacher-work-center/tasks/:id
 * Updates an existing personal task
 */
router.put('/tasks/:id', requireTenantAccess, handleUpdateTask);
router.patch('/tasks/:id', requireTenantAccess, handleUpdateTask);

/**
 * POST /api/v1/teacher-work-center/tasks/:id/toggle
 * Toggles task status between TODO and DONE
 */
router.post('/tasks/:id/toggle', requireTenantAccess, (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const taskId = req.params.id;

    const toggled = teacherWorkCenterRepository.toggleTaskStatus(tenantId, taskId);
    if (!toggled) {
      return res.status(404).json({
        success: false,
        errorCode: 'TASK_NOT_FOUND',
        message: 'Không tìm thấy công việc cần chuyển trạng thái.'
      });
    }

    return res.json({
      success: true,
      data: toggled,
      message: `Đã ${toggled.status === 'DONE' ? 'hoàn thành' : 'mở lại'} công việc.`
    });
  } catch (error: any) {
    console.error('[WORK-CENTER-TASK-TOGGLE-ERROR]', error);
    return res.status(500).json({
      success: false,
      errorCode: 'TASK_TOGGLE_FAILED',
      message: error?.message || 'Không thể chuyển trạng thái công việc.'
    });
  }
});

/**
 * DELETE /api/v1/teacher-work-center/tasks/:id
 * Deletes a personal task
 */
router.delete('/tasks/:id', requireTenantAccess, (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const taskId = req.params.id;

    teacherWorkCenterRepository.deletePersonalTask(tenantId, taskId);

    return res.json({
      success: true,
      message: 'Xóa công việc thành công.'
    });
  } catch (error: any) {
    console.error('[WORK-CENTER-TASK-DELETE-ERROR]', error);
    return res.status(500).json({
      success: false,
      errorCode: 'TASK_DELETE_FAILED',
      message: error?.message || 'Không thể xóa công việc.'
    });
  }
});

export const teacherWorkCenterRouter = router;
export default router;
