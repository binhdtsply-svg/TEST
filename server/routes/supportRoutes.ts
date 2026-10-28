import { Router, Response } from 'express';
import { supportRepository } from '../repositories/SupportRepository';
import { credentialRepository } from '../repositories/CredentialRepository';
import { sessionRepository } from '../repositories/SessionRepository';
import { auditLogRepository } from '../repositories/AuditLogRepository';
import { authenticateToken, requireRole, AuthenticatedRequest } from '../auth/middleware';
import { SupportTicketStatus, FeedbackStatus } from '../../src/types';

export const supportRouter = Router();

// ============================================================================
// 1. SUPPORT TICKETS
// ============================================================================

// 1.1 Create Support Ticket (All authenticated users: GVCN, Student, Parent)
supportRouter.post('/tickets', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { title, description, category, priority, relatedModule, userEmail, userPhone } = req.body;
  const user = req.user!;

  if (!title || !description) {
    return res.status(400).json({
      success: false,
      errorCode: 'MISSING_FIELDS',
      message: 'Vui lòng nhập đầy đủ tiêu đề và nội dung yêu cầu hỗ trợ.'
    });
  }

  // Determine user display name based on role
  let userName = user.userId;
  if (user.role === 'TEACHER') {
    userName = user.teacherId ? `Giáo viên (${user.teacherId})` : 'Giáo viên chủ nhiệm';
  } else if (user.role === 'STUDENT' || user.role === 'CLASS_OFFICER') {
    userName = user.studentId ? `Học sinh (${user.studentId})` : 'Học sinh';
  } else if (user.role === 'PARENT') {
    userName = user.childStudentId ? `Phụ huynh em (${user.childStudentId})` : 'Phụ huynh học sinh';
  } else if (user.role === 'SUPER_ADMIN') {
    userName = 'Quản trị viên Hệ thống';
  }

  const ticket = supportRepository.createTicket({
    title,
    description,
    category: category || 'OTHER',
    priority: priority || 'MEDIUM',
    userId: user.userId,
    userRole: user.role,
    userName: req.body.userName || userName,
    userEmail: userEmail || undefined,
    userPhone: userPhone || undefined,
    tenantId: user.tenantId,
    relatedModule: relatedModule || undefined
  });

  auditLogRepository.log({
    actorUserId: user.userId,
    actorRole: user.role,
    actorTenantId: user.tenantId,
    action: 'CREATE_SUPPORT_TICKET',
    targetType: 'SUPPORT_TICKET',
    targetId: ticket.id,
    details: { code: ticket.ticketCode, title: ticket.title, category: ticket.category }
  });

  res.status(201).json({
    success: true,
    message: 'Yêu cầu hỗ trợ đã được gửi thành công. Ban Quản trị sẽ tiếp nhận và phản hồi sớm nhất.',
    ticket
  });
});

// 1.2 Get My Support Tickets (Current user only)
supportRouter.get('/tickets/my', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const tickets = supportRepository.getTicketsByUser(user.userId);
  res.json({
    success: true,
    tickets
  });
});

// 1.3 Get All Support Tickets (Super Admin only with search & filters)
supportRouter.get('/tickets', authenticateToken, requireRole('SUPER_ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const { status, category, priority, search } = req.query;

  const tickets = supportRepository.getAllTickets({
    status: typeof status === 'string' ? status : undefined,
    category: typeof category === 'string' ? category : undefined,
    priority: typeof priority === 'string' ? priority : undefined,
    search: typeof search === 'string' ? search : undefined
  });

  res.json({
    success: true,
    tickets
  });
});

// 1.4 Get Ticket Detail by ID (Owner or Super Admin only)
supportRouter.get('/tickets/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const ticket = supportRepository.getTicketById(req.params.id);

  if (!ticket) {
    return res.status(404).json({
      success: false,
      errorCode: 'TICKET_NOT_FOUND',
      message: 'Không tìm thấy thông tin yêu cầu hỗ trợ.'
    });
  }

  // Access Control: Only ticket owner or Super Admin can view
  if (user.role !== 'SUPER_ADMIN' && ticket.userId !== user.userId) {
    return res.status(403).json({
      success: false,
      errorCode: 'FORBIDDEN',
      message: 'Bạn không có quyền xem yêu cầu hỗ trợ của người dùng khác.'
    });
  }

  res.json({
    success: true,
    ticket
  });
});

// 1.5 Update Ticket Status & Response (Super Admin only)
supportRouter.patch('/tickets/:id/status', authenticateToken, requireRole('SUPER_ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const { status, adminResponse, adminNotes } = req.body;
  const user = req.user!;

  if (!status) {
    return res.status(400).json({
      success: false,
      errorCode: 'MISSING_STATUS',
      message: 'Vui lòng cung cấp trạng thái mới cho yêu cầu hỗ trợ.'
    });
  }

  const updated = supportRepository.updateTicketStatus({
    ticketId: req.params.id,
    status: status as SupportTicketStatus,
    actorId: user.userId,
    actorName: 'Ban Quản Trị Hệ Thống',
    actorRole: 'SUPER_ADMIN',
    adminResponse,
    adminNotes
  });

  if (!updated) {
    return res.status(404).json({
      success: false,
      errorCode: 'TICKET_NOT_FOUND',
      message: 'Không tìm thấy yêu cầu hỗ trợ để cập nhật.'
    });
  }

  auditLogRepository.log({
    actorUserId: user.userId,
    actorRole: 'SUPER_ADMIN',
    actorTenantId: 'platform-root',
    action: 'UPDATE_SUPPORT_TICKET_STATUS',
    targetType: 'SUPPORT_TICKET',
    targetId: updated.id,
    details: { code: updated.ticketCode, newStatus: status, response: adminResponse }
  });

  res.json({
    success: true,
    message: 'Cập nhật trạng thái và phản hồi yêu cầu hỗ trợ thành công.',
    ticket: updated
  });
});

// ============================================================================
// 2. USER FEEDBACK & FEATURE SUGGESTIONS
// ============================================================================

// 2.1 Submit Feedback / Suggestion (All users)
supportRouter.post('/feedbacks', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { type, rating, category, relatedModule, title, content, isAnonymous, userName, userEmail } = req.body;
  const user = req.user!;

  if (!content || !content.trim()) {
    return res.status(400).json({
      success: false,
      errorCode: 'MISSING_CONTENT',
      message: 'Vui lòng nhập nội dung đánh giá hoặc góp ý.'
    });
  }

  const feedback = supportRepository.createFeedback({
    type: type || 'RATING_FEEDBACK',
    rating: rating ? Number(rating) : undefined,
    category: category || 'OTHER',
    relatedModule: relatedModule || undefined,
    title: title || undefined,
    content: content.trim(),
    isAnonymous: Boolean(isAnonymous),
    userId: user.userId,
    userRole: user.role,
    userName: userName || user.userId,
    userEmail: userEmail || undefined,
    tenantId: user.tenantId
  });

  auditLogRepository.log({
    actorUserId: user.userId,
    actorRole: user.role,
    actorTenantId: user.tenantId,
    action: 'SUBMIT_FEEDBACK',
    targetType: 'FEEDBACK',
    targetId: feedback.id,
    details: { type: feedback.type, category: feedback.category, anonymous: feedback.isAnonymous }
  });

  res.status(201).json({
    success: true,
    message: feedback.type === 'FEATURE_SUGGESTION'
      ? 'Đề xuất chức năng mới đã được ghi nhận. Cảm ơn bạn đã đóng góp ý kiến xây dựng hệ thống!'
      : 'Ý kiến đánh giá/góp ý của bạn đã được gửi thành công. Cảm ơn phản hồi quý báu của bạn!',
    feedback
  });
});

// 2.2 Get My Feedbacks & Suggestions (Current user only)
supportRouter.get('/feedbacks/my', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const feedbacks = supportRepository.getFeedbacksByUser(user.userId);
  res.json({
    success: true,
    feedbacks
  });
});

// 2.3 Get All Feedbacks & Suggestions (Super Admin only with search & filters)
supportRouter.get('/feedbacks', authenticateToken, requireRole('SUPER_ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const { type, category, status, module, search } = req.query;

  const feedbacks = supportRepository.getAllFeedbacks({
    type: typeof type === 'string' ? type : undefined,
    category: typeof category === 'string' ? category : undefined,
    status: typeof status === 'string' ? status : undefined,
    module: typeof module === 'string' ? module : undefined,
    search: typeof search === 'string' ? search : undefined
  });

  res.json({
    success: true,
    feedbacks
  });
});

// 2.4 Update Feedback / Suggestion Status (Super Admin only)
supportRouter.patch('/feedbacks/:id/status', authenticateToken, requireRole('SUPER_ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const { status, adminNotes } = req.body;
  const user = req.user!;

  if (!status) {
    return res.status(400).json({
      success: false,
      errorCode: 'MISSING_STATUS',
      message: 'Vui lòng chọn trạng thái mới cho phản hồi.'
    });
  }

  const updated = supportRepository.updateFeedbackStatus(req.params.id, status as FeedbackStatus, adminNotes);

  if (!updated) {
    return res.status(404).json({
      success: false,
      errorCode: 'FEEDBACK_NOT_FOUND',
      message: 'Không tìm thấy phản hồi để cập nhật.'
    });
  }

  auditLogRepository.log({
    actorUserId: user.userId,
    actorRole: 'SUPER_ADMIN',
    actorTenantId: 'platform-root',
    action: 'UPDATE_FEEDBACK_STATUS',
    targetType: 'FEEDBACK',
    targetId: updated.id,
    details: { newStatus: status, adminNotes }
  });

  res.json({
    success: true,
    message: 'Cập nhật trạng thái phản hồi/đề xuất thành công.',
    feedback: updated
  });
});

// ============================================================================
// 3. STATS & ANALYTICS (REAL DATABASE METRICS)
// ============================================================================

supportRouter.get('/stats', authenticateToken, requireRole('SUPER_ADMIN'), (_req: AuthenticatedRequest, res: Response) => {
  const stats = supportRepository.getStats();
  res.json({
    success: true,
    stats
  });
});

// ============================================================================
// 4. ACCOUNT SUPPORT DESK (Super Admin search & password reset across tenants)
// ============================================================================

supportRouter.get('/accounts', authenticateToken, requireRole('SUPER_ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const { query, role, status } = req.query;

  const accounts = credentialRepository.searchAllCredentials({
    query: typeof query === 'string' ? query : undefined,
    role: typeof role === 'string' ? role : undefined,
    status: typeof status === 'string' ? status : undefined
  });

  res.json({
    success: true,
    accounts
  });
});

// 4.1 Reset Password for any user (Super Admin support)
supportRouter.post('/accounts/reset-password', authenticateToken, requireRole('SUPER_ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const { tenantId, ownerId, type } = req.body;
  const user = req.user!;

  if (!tenantId || !ownerId || !type) {
    return res.status(400).json({
      success: false,
      errorCode: 'MISSING_PARAMS',
      message: 'Thiếu thông tin tenantId, ownerId hoặc type.'
    });
  }

  const result = credentialRepository.resetPasswordByAdmin({
    tenantId,
    ownerId,
    type,
    actorUserId: user.userId
  });

  if (!result.success) {
    return res.status(404).json(result);
  }

  // Invalidate any active sessions for the targeted user
  if (result.credentialVersion) {
    sessionRepository.invalidateSessionsByCredentialVersion(tenantId, ownerId, result.credentialVersion);
  }

  res.json(result);
});
