import { Router, Response } from 'express';
import { AuthenticatedRequest, authenticateToken, requireRole } from '../auth/middleware';
import { trainingRepository } from '../repositories/TrainingRepository';
import { studentRepository } from '../repositories/StudentRepository';
import { auditLogRepository } from '../repositories/AuditLogRepository';
import { eventHub } from '../events/EventHub';
import { persistenceSyncService } from '../services/PersistenceSyncService';

const router = Router();

router.use(authenticateToken);

// GET /api/v1/training/transactions
router.get('/transactions', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const allTx = trainingRepository.getTransactionsByTenant(user.tenantId);

  let filtered = allTx;
  if (user.role === 'STUDENT' || user.role === 'CLASS_OFFICER') {
    filtered = allTx.filter(t => t.student_id === user.studentId);
  } else if (user.role === 'PARENT') {
    filtered = allTx.filter(t => t.student_id === user.childStudentId);
  }

  return res.json({
    success: true,
    data: filtered.map(t => {
      const student = studentRepository.getById(user.tenantId, t.student_id) || studentRepository.getByCode(user.tenantId, t.student_id);
      return {
        id: t.id,
        studentId: t.student_id,
        studentName: student?.full_name || '',
        studentGroup: student?.group_num || 1,
        ruleId: t.rule_id,
        category: t.category,
        title: t.title,
        points: t.points,
        description: t.description,
        evidenceUrl: t.evidence_url,
        status: t.status,
        createdByRole: t.created_by_role,
        createdByUserId: t.created_by_user_id,
        approvedBy: t.approved_by,
        approvedAt: t.approved_at,
        createdAt: t.created_at
      };
    })
  });
});

// POST /api/v1/training/transactions - Add or propose point transaction
router.post('/transactions', requireRole('TEACHER', 'CLASS_OFFICER', 'SUPER_ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const body = req.body;

  if (!body.studentId || !body.title || body.points === undefined) {
    return res.status(400).json({ success: false, errorCode: 'INVALID_PAYLOAD', message: 'Thiếu thông tin điểm rèn luyện.' });
  }

  // Cross-tenant verification
  const student = studentRepository.getById(user.tenantId, body.studentId);
  if (!student) {
    const otherStudent = studentRepository.findAnywhere(body.studentId);
    if (otherStudent) {
      return res.status(403).json({
        success: false,
        errorCode: 'TENANT_ACCESS_DENIED',
        message: '403 TENANT ISOLATION ERROR: Bạn không có quyền ghi nhận điểm rèn luyện cho học sinh lớp khác.'
      });
    }
    return res.status(404).json({
      success: false,
      errorCode: 'STUDENT_NOT_FOUND',
      message: 'Không tìm thấy học sinh trong lớp.'
    });
  }

  const isTeacher = user.role === 'TEACHER' || user.role === 'SUPER_ADMIN';
  const status = isTeacher ? (body.status || 'APPROVED') : 'PROPOSED';
  const txId = body.id || `tx_${Date.now()}`;
  const now = new Date().toISOString();

  const saved = trainingRepository.upsertTransaction({
    id: txId,
    tenant_id: user.tenantId,
    student_id: body.studentId,
    rule_id: body.ruleId,
    category: body.category || 'Học tập',
    title: body.title,
    points: Number(body.points),
    description: body.description,
    evidence_url: body.evidenceUrl,
    status,
    created_by_role: user.role,
    created_by_user_id: user.userId,
    approved_by: status === 'APPROVED' ? user.userId : null,
    approved_at: status === 'APPROVED' ? now : null,
    created_at: body.createdAt || now
  });

  // If approved, update laurel tree summary
  if (status === 'APPROVED') {
    const studentTxs = trainingRepository.getTransactionsByStudent(user.tenantId, body.studentId);
    const approvedTotal = studentTxs
      .filter(t => t.status === 'APPROVED')
      .reduce((sum, t) => sum + t.points, 0);
    
    trainingRepository.saveLaurelTree({
      tenant_id: user.tenantId,
      student_id: body.studentId,
      total_points: Math.max(0, approvedTotal),
      current_rank_level: Math.floor(Math.max(0, approvedTotal) / 50) + 1,
      badges_json: JSON.stringify([]),
      updated_at: now
    });
  }

  auditLogRepository.createLog({
    actorUserId: user.userId,
    actorRole: user.role,
    actorTenantId: user.tenantId,
    action: status === 'APPROVED' ? 'TRAINING_POINT_ADDED' : 'TRAINING_POINT_PROPOSED',
    targetType: 'TRAINING_TRANSACTION',
    targetId: txId,
    details: `${user.role} ghi nhận ${body.points}đ cho học sinh ${body.studentId}: ${body.title}`
  });

  // Real-time Event Publication
  eventHub.publish({
    id: `evt_tx_${txId}_${Date.now()}`,
    type: 'TRAINING_POINT_RECORDED',
    tenantId: user.tenantId,
    actorId: user.userId,
    actorRole: user.role,
    targetRoles: ['TEACHER', 'STUDENT', 'CLASS_OFFICER', 'PARENT'],
    targetUserIds: [body.studentId],
    excludeUserIds: [user.userId],
    parentVisible: true,
    payload: {
      transaction: saved,
      studentId: body.studentId,
      points: body.points,
      status
    },
    notification: {
      title: `⭐ Điểm rèn luyện: ${body.points > 0 ? '+' : ''}${body.points} điểm`,
      message: `${body.title} - ${body.category || 'Học tập'}. Ghi nhận cho học sinh ${body.studentId}`,
      type: body.points >= 0 ? 'success' : 'warning',
      linkTo: 'training',
      category: 'academic'
    },
    timestamp: now
  });

  try {
    persistenceSyncService.scheduleDebouncedFlush(1000);
  } catch {}

  return res.json({ success: true, data: saved });
});

// POST /api/v1/training/transactions/:id/approve - Teacher approve officer proposal
router.post('/transactions/:id/approve', requireRole('TEACHER', 'SUPER_ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const txId = req.params.id;

  const allTx = trainingRepository.getTransactionsByTenant(user.tenantId);
  const target = allTx.find(t => t.id === txId);
  if (!target) {
    return res.status(404).json({ success: false, errorCode: 'RESOURCE_NOT_FOUND', message: 'Không tìm thấy giao dịch điểm.' });
  }

  const now = new Date().toISOString();
  const updated = trainingRepository.upsertTransaction({
    ...target,
    status: 'APPROVED',
    approved_by: user.userId,
    approved_at: now
  });

  // Recalculate laurel tree
  const studentTxs = trainingRepository.getTransactionsByStudent(user.tenantId, target.student_id);
  const approvedTotal = studentTxs
    .filter(t => t.status === 'APPROVED')
    .reduce((sum, t) => sum + t.points, 0);

  trainingRepository.saveLaurelTree({
    tenant_id: user.tenantId,
    student_id: target.student_id,
    total_points: Math.max(0, approvedTotal),
    current_rank_level: Math.floor(Math.max(0, approvedTotal) / 50) + 1,
    badges_json: JSON.stringify([]),
    updated_at: now
  });

  auditLogRepository.createLog({
    actorUserId: user.userId,
    actorRole: user.role,
    actorTenantId: user.tenantId,
    action: 'TRAINING_APPROVED',
    targetType: 'TRAINING_TRANSACTION',
    targetId: txId,
    details: `Duyệt đề xuất điểm cho học sinh ${target.student_id}`
  });

  // Real-time Event Publication
  eventHub.publish({
    id: `evt_tx_appr_${txId}_${Date.now()}`,
    type: 'SUBMISSION_APPROVED',
    tenantId: user.tenantId,
    actorId: user.userId,
    actorRole: user.role,
    targetRoles: ['TEACHER', 'STUDENT', 'CLASS_OFFICER', 'PARENT'],
    targetUserIds: [target.student_id],
    excludeUserIds: [user.userId],
    parentVisible: true,
    payload: {
      transactionId: txId,
      studentId: target.student_id,
      points: target.points,
      status: 'APPROVED'
    },
    notification: {
      title: `✅ Đề xuất rèn luyện đã được GVCN phê duyệt`,
      message: `Đề xuất "${target.title}" (${target.points > 0 ? '+' : ''}${target.points}đ) đã được chấp thuận.`,
      type: 'success',
      linkTo: 'training',
      category: 'academic'
    },
    timestamp: now
  });

  try {
    persistenceSyncService.scheduleDebouncedFlush(1000);
  } catch {}

  return res.json({ success: true, data: updated });
});

// PATCH /api/v1/training/transactions/:id - Teacher update or reject transaction
router.patch('/transactions/:id', requireRole('TEACHER', 'SUPER_ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const txId = req.params.id;
  const body = req.body || {};

  const target = trainingRepository.getTransactionById(user.tenantId, txId);
  if (!target) {
    return res.status(404).json({ success: false, errorCode: 'RESOURCE_NOT_FOUND', message: 'Không tìm thấy giao dịch điểm.' });
  }

  const now = new Date().toISOString();
  const nextStatus = body.status || target.status;
  const nextPoints = body.points !== undefined ? Number(body.points) : target.points;

  const updated = trainingRepository.upsertTransaction({
    ...target,
    rule_id: body.ruleId !== undefined ? body.ruleId : target.rule_id,
    category: body.category !== undefined ? body.category : target.category,
    title: body.title !== undefined ? body.title : target.title,
    points: nextPoints,
    description: body.description !== undefined ? body.description : target.description,
    evidence_url: body.evidenceUrl !== undefined ? body.evidenceUrl : target.evidence_url,
    status: nextStatus,
    approved_by: nextStatus === 'APPROVED' ? (target.approved_by || user.userId) : target.approved_by,
    approved_at: nextStatus === 'APPROVED' ? (target.approved_at || now) : target.approved_at
  });

  // Recalculate laurel tree for the student
  const studentTxs = trainingRepository.getTransactionsByStudent(user.tenantId, target.student_id);
  const approvedTotal = studentTxs
    .filter(t => t.status === 'APPROVED')
    .reduce((sum, t) => sum + t.points, 0);

  trainingRepository.saveLaurelTree({
    tenant_id: user.tenantId,
    student_id: target.student_id,
    total_points: Math.max(0, approvedTotal),
    current_rank_level: Math.floor(Math.max(0, approvedTotal) / 50) + 1,
    badges_json: JSON.stringify([]),
    updated_at: now
  });

  auditLogRepository.createLog({
    actorUserId: user.userId,
    actorRole: user.role,
    actorTenantId: user.tenantId,
    action: nextStatus === 'REJECTED' ? 'TRAINING_REJECTED' : 'TRAINING_UPDATED',
    targetType: 'TRAINING_TRANSACTION',
    targetId: txId,
    details: `Cập nhật giao dịch điểm cho học sinh ${target.student_id} (${updated.title}, trạng thái: ${nextStatus})`
  });

  try {
    persistenceSyncService.scheduleDebouncedFlush(1000);
  } catch {}

  return res.json({ success: true, data: updated });
});

// DELETE /api/v1/training/transactions/:id - Teacher delete transaction
router.delete('/transactions/:id', requireRole('TEACHER', 'SUPER_ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const txId = req.params.id;

  const target = trainingRepository.getTransactionById(user.tenantId, txId);
  if (!target) {
    return res.status(404).json({ success: false, errorCode: 'RESOURCE_NOT_FOUND', message: 'Không tìm thấy giao dịch điểm.' });
  }

  const deleted = trainingRepository.deleteTransaction(user.tenantId, txId);
  if (!deleted) {
    return res.status(404).json({ success: false, errorCode: 'RESOURCE_NOT_FOUND', message: 'Không thể xóa giao dịch điểm.' });
  }

  const now = new Date().toISOString();
  const studentTxs = trainingRepository.getTransactionsByStudent(user.tenantId, target.student_id);
  const approvedTotal = studentTxs
    .filter(t => t.status === 'APPROVED')
    .reduce((sum, t) => sum + t.points, 0);

  trainingRepository.saveLaurelTree({
    tenant_id: user.tenantId,
    student_id: target.student_id,
    total_points: Math.max(0, approvedTotal),
    current_rank_level: Math.floor(Math.max(0, approvedTotal) / 50) + 1,
    badges_json: JSON.stringify([]),
    updated_at: now
  });

  auditLogRepository.createLog({
    actorUserId: user.userId,
    actorRole: user.role,
    actorTenantId: user.tenantId,
    action: 'TRAINING_DELETED',
    targetType: 'TRAINING_TRANSACTION',
    targetId: txId,
    details: `Xóa giao dịch điểm của học sinh ${target.student_id}: ${target.title}`
  });

  try {
    persistenceSyncService.scheduleDebouncedFlush(1000);
  } catch {}

  return res.json({ success: true, data: { id: txId, deleted: true } });
});

// GET /api/v1/training/laurel-tree
router.get('/laurel-tree', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  let targetStudentId = (req.query.studentId as string) || '';
  if (user.role === 'STUDENT' || user.role === 'CLASS_OFFICER') {
    targetStudentId = user.studentId!;
  } else if (user.role === 'PARENT') {
    targetStudentId = user.childStudentId!;
  }

  const row = trainingRepository.getLaurelTree(user.tenantId, targetStudentId);
  return res.json({
    success: true,
    data: row ? {
      studentId: row.student_id,
      totalPoints: row.total_points,
      currentRankLevel: row.current_rank_level,
      badges: JSON.parse(row.badges_json || '[]')
    } : {
      studentId: targetStudentId,
      totalPoints: 0,
      currentRankLevel: 1,
      badges: []
    }
  });
});

export default router;
