import { Router, Response } from 'express';
import { AuthenticatedRequest, authenticateToken, requireRole } from '../auth/middleware';
import { parentCommunicationRepository } from '../repositories/ParentCommunicationRepository';
import { studentRepository } from '../repositories/StudentRepository';
import { auditLogRepository } from '../repositories/AuditLogRepository';
import { eventHub } from '../events/EventHub';

const router = Router();

router.use(authenticateToken);

// GET /api/v1/parent-communication/conversations
router.get('/conversations', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const allConv = parentCommunicationRepository.getConversations(user.tenantId);

  let filtered = allConv;
  if (user.role === 'PARENT') {
    if (!user.childStudentId) {
      return res.json({ success: true, data: [] });
    }
    filtered = allConv.filter(c => c.student_id === user.childStudentId);
  } else if (user.role === 'STUDENT' || user.role === 'CLASS_OFFICER') {
    return res.status(403).json({ success: false, errorCode: 'ROLE_ACCESS_DENIED', message: 'Học sinh không có quyền truy cập kênh trao đổi của Phụ huynh.' });
  }

  return res.json({
    success: true,
    data: filtered.map(c => ({
      id: c.id,
      studentId: c.student_id,
      parentName: c.parent_name,
      parentPhone: c.parent_phone,
      topic: c.topic,
      messages: JSON.parse(c.messages_json),
      lastMessageAt: c.last_message_at,
      unreadTeacher: c.unread_teacher,
      unreadParent: c.unread_parent,
      updatedAt: c.updated_at
    }))
  });
});

// GET /api/v1/parent-communication/conversations/:id - Single conversation
router.get('/conversations/:id', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { id } = req.params;

  if (user.role === 'STUDENT' || user.role === 'CLASS_OFFICER') {
    return res.status(403).json({ success: false, errorCode: 'ROLE_ACCESS_DENIED', message: 'Học sinh không có quyền truy cập kênh trao đổi của Phụ huynh.' });
  }

  const conv = parentCommunicationRepository.getConversationById(user.tenantId, id);
  if (!conv) {
    return res.status(404).json({ success: false, errorCode: 'CONVERSATION_NOT_FOUND', message: 'Không tìm thấy cuộc trò chuyện.' });
  }

  if (user.role === 'PARENT' && conv.student_id !== user.childStudentId) {
    return res.status(403).json({
      success: false,
      errorCode: 'FORBIDDEN_OTHER_FAMILY',
      message: 'Bạn không có quyền xem cuộc trao đổi của gia đình khác.'
    });
  }

  return res.json({
    success: true,
    data: {
      id: conv.id,
      studentId: conv.student_id,
      parentName: conv.parent_name,
      parentPhone: conv.parent_phone,
      topic: conv.topic,
      messages: JSON.parse(conv.messages_json),
      lastMessageAt: conv.last_message_at,
      unreadTeacher: conv.unread_teacher,
      unreadParent: conv.unread_parent,
      updatedAt: conv.updated_at
    }
  });
});

// POST /api/v1/parent-communication/conversations
router.post('/conversations', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const body = req.body;

  if (user.role === 'STUDENT' || user.role === 'CLASS_OFFICER') {
    return res.status(403).json({
      success: false,
      errorCode: 'ROLE_ACCESS_DENIED',
      message: 'Học sinh không có quyền gửi tin nhắn trong kênh trao đổi Phụ huynh.'
    });
  }

  let targetStudentId = body.studentId;
  if (user.role === 'PARENT') {
    if (!user.childStudentId) {
      return res.status(403).json({ success: false, errorCode: 'CHILD_NOT_LINKED', message: 'Tài khoản phụ huynh chưa được liên kết với học viên.' });
    }
    targetStudentId = user.childStudentId;

    if (body.id) {
      const existingConv = parentCommunicationRepository.getConversationById(user.tenantId, body.id);
      if (existingConv && existingConv.student_id !== user.childStudentId) {
        return res.status(403).json({
          success: false,
          errorCode: 'FORBIDDEN_OTHER_FAMILY',
          message: 'Bạn không có quyền sửa đổi cuộc trò chuyện của gia đình khác.'
        });
      }
    }
  } else if (user.role === 'TEACHER') {
    if (!targetStudentId) {
      return res.status(400).json({ success: false, errorCode: 'INVALID_PAYLOAD', message: 'Thiếu studentId.' });
    }
    const student = studentRepository.getById(user.tenantId, targetStudentId);
    if (!student) {
      const other = studentRepository.findAnywhere(targetStudentId);
      if (other) {
        return res.status(403).json({
          success: false,
          errorCode: 'TENANT_ACCESS_DENIED',
          message: '403 TENANT ISOLATION ERROR: Bạn không có quyền trao đổi với phụ huynh học sinh lớp khác.'
        });
      }
      return res.status(404).json({ success: false, errorCode: 'STUDENT_NOT_FOUND', message: 'Không tìm thấy học sinh.' });
    }
  }

  const convId = body.id || `conv_${targetStudentId}`;
  const now = new Date().toISOString();

  const saved = parentCommunicationRepository.upsertConversation({
    id: convId,
    tenant_id: user.tenantId,
    student_id: targetStudentId,
    parent_name: body.parentName || 'Phụ huynh',
    parent_phone: body.parentPhone || '',
    topic: body.topic || 'Trao đổi chung',
    messages_json: JSON.stringify(body.messages || []),
    last_message_at: now,
    unread_teacher: user.role === 'PARENT' ? (body.unreadTeacher || 1) : 0,
    unread_parent: user.role === 'TEACHER' ? (body.unreadParent || 1) : 0,
    created_at: body.createdAt || now,
    updated_at: now
  });

  auditLogRepository.createLog({
    actorUserId: user.userId,
    actorRole: user.role,
    actorTenantId: user.tenantId,
    action: 'PARENT_MESSAGE_SENT',
    targetType: 'PARENT_CONVERSATION',
    targetId: convId,
    details: `${user.role} gửi tin nhắn trao đổi phụ huynh cho học sinh ${targetStudentId}`
  });

  const lastMsg = (body.messages || []).slice(-1)[0]?.text || 'Có tin nhắn mới trong cuộc trao đổi.';
  const isFromParent = user.role === 'PARENT';

  // Publish Real-time Event
  eventHub.publish({
    id: `evt_msg_${convId}_${Date.now()}`,
    type: 'PARENT_MESSAGE_SENT',
    tenantId: user.tenantId,
    actorId: user.userId,
    actorRole: user.role,
    targetRoles: isFromParent ? ['TEACHER', 'SUPER_ADMIN'] : ['PARENT'],
    targetUserIds: isFromParent ? undefined : [targetStudentId],
    excludeUserIds: [user.userId],
    parentVisible: true,
    payload: {
      conversationId: convId,
      studentId: targetStudentId,
      lastMessage: lastMsg,
      conversation: saved
    },
    notification: {
      title: isFromParent ? `💬 Tin nhắn từ Phụ huynh (${body.parentName || 'Học sinh ' + targetStudentId})` : `💬 GVCN đã gửi tin nhắn trao đổi`,
      message: `"${lastMsg.substring(0, 80)}"`,
      type: 'info',
      linkTo: 'parent-bridge',
      category: 'social'
    },
    timestamp: now
  });

  return res.json({ success: true, data: saved });
});

// GET /api/v1/parent-communication/announcements
router.get('/announcements', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const announcements = parentCommunicationRepository.getAnnouncements(user.tenantId);

  let filtered = announcements;
  if (user.role === 'PARENT') {
    filtered = announcements.filter(a => {
      if (a.target_type === 'ALL') return true;
      const targetIds: string[] = a.target_student_ids_json ? JSON.parse(a.target_student_ids_json) : [];
      return Boolean(user.childStudentId && targetIds.includes(user.childStudentId));
    });
  } else if (user.role === 'STUDENT' || user.role === 'CLASS_OFFICER') {
    filtered = announcements.filter(a => {
      if (a.target_type === 'ALL') return true;
      const targetIds: string[] = a.target_student_ids_json ? JSON.parse(a.target_student_ids_json) : [];
      return Boolean(user.studentId && targetIds.includes(user.studentId));
    });
  }

  return res.json({
    success: true,
    data: filtered.map(a => {
      let parsedAck: any = [];
      try {
        parsedAck = JSON.parse(a.acknowledgements_json || '[]');
      } catch {
        parsedAck = [];
      }
      const ackList = Array.isArray(parsedAck)
        ? parsedAck
        : Array.isArray(parsedAck?.items)
          ? parsedAck.items
          : [];
      const meta = (!Array.isArray(parsedAck) && parsedAck?.meta && typeof parsedAck.meta === 'object')
        ? parsedAck.meta
        : {};

      const targetIds = a.target_student_ids_json ? JSON.parse(a.target_student_ids_json) : [];
      return {
        id: a.id,
        title: a.title,
        content: a.content,
        category: meta.category || 'Học tập',
        createdAt: meta.createdAt || a.sent_at,
        authorName: meta.authorName || 'GVCN',
        targetType: a.target_type,
        targetIds,
        targetStudentIds: targetIds,
        channels: Array.isArray(meta.channels) ? meta.channels : ['In-app'],
        isPinned: Boolean(meta.isPinned),
        allowComments: meta.allowComments !== undefined ? Boolean(meta.allowComments) : true,
        sentAt: a.sent_at,
        sentBy: a.sent_by,
        requiresAcknowledgement: Boolean(a.requires_acknowledgement),
        acknowledgements: ackList,
        attachments: Array.isArray(meta.attachments) ? meta.attachments : [],
        comments: Array.isArray(meta.comments) ? meta.comments : [],
        eventDate: meta.eventDate,
        eventTime: meta.eventTime,
        location: meta.location
      };
    })
  });
});

// POST /api/v1/parent-communication/announcements
router.post('/announcements', requireRole('TEACHER', 'SUPER_ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const body = req.body || {};

  const annId = body.id || `ann_${Date.now()}`;
  const now = new Date().toISOString();
  const targetIds = Array.isArray(body.targetIds)
    ? body.targetIds
    : Array.isArray(body.targetStudentIds)
      ? body.targetStudentIds
      : [];

  const ackEnvelope = {
    items: Array.isArray(body.acknowledgements) ? body.acknowledgements : [],
    meta: {
      category: body.category || 'Học tập',
      createdAt: body.createdAt || now,
      authorName: body.authorName || 'GVCN',
      channels: Array.isArray(body.channels) ? body.channels : ['In-app'],
      isPinned: Boolean(body.isPinned),
      allowComments: body.allowComments !== undefined ? Boolean(body.allowComments) : true,
      attachments: Array.isArray(body.attachments) ? body.attachments : [],
      comments: Array.isArray(body.comments) ? body.comments : [],
      eventDate: body.eventDate,
      eventTime: body.eventTime,
      location: body.location
    }
  };

  parentCommunicationRepository.upsertAnnouncement({
    id: annId,
    tenant_id: user.tenantId,
    title: body.title || '',
    content: body.content || '',
    target_type: body.targetType || 'ALL',
    target_student_ids_json: targetIds.length > 0 ? JSON.stringify(targetIds) : null,
    sent_at: now,
    sent_by: user.userId,
    requires_acknowledgement: body.requiresAcknowledgement ? 1 : 0,
    acknowledgements_json: JSON.stringify(ackEnvelope),
    created_at: now
  });

  // Publish Real-time Event
  eventHub.publish({
    id: `evt_ann_${annId}_${Date.now()}`,
    type: 'PARENT_ANNOUNCEMENT_SENT',
    tenantId: user.tenantId,
    actorId: user.userId,
    actorRole: user.role,
    targetRoles: ['PARENT', 'STUDENT'],
    targetUserIds: targetIds.length > 0 ? targetIds : undefined,
    excludeUserIds: [user.userId],
    parentVisible: true,
    payload: {
      announcementId: annId,
      title: body.title,
      content: body.content,
      targetType: body.targetType || 'ALL'
    },
    notification: {
      title: `📢 Thông báo từ GVCN: ${body.title}`,
      message: `${(body.content || '').substring(0, 90)}...`,
      type: 'warning',
      linkTo: 'parent-bridge',
      category: 'social'
    },
    timestamp: now
  });

  return res.json({ success: true, annId });
});

// PATCH /api/v1/parent-communication/announcements/:id
router.patch('/announcements/:id', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const annId = req.params.id;
  const body = req.body || {};

  const existing = parentCommunicationRepository.getAnnouncements(user.tenantId).find(a => a.id === annId);
  if (!existing) {
    return res.status(404).json({ success: false, errorCode: 'RESOURCE_NOT_FOUND', message: 'Không tìm thấy thông báo.' });
  }

  let parsedAck: any = [];
  try {
    parsedAck = JSON.parse(existing.acknowledgements_json || '[]');
  } catch {
    parsedAck = [];
  }
  const existingAckList = Array.isArray(parsedAck)
    ? parsedAck
    : Array.isArray(parsedAck?.items)
      ? parsedAck.items
      : [];
  const existingMeta = (!Array.isArray(parsedAck) && parsedAck?.meta && typeof parsedAck.meta === 'object')
    ? parsedAck.meta
    : {};

  const isTeacherOrAdmin = user.role === 'TEACHER' || user.role === 'SUPER_ADMIN';

  const nextAckList = Array.isArray(body.acknowledgements) ? body.acknowledgements : existingAckList;
  const nextComments = Array.isArray(body.comments) ? body.comments : (existingMeta.comments || []);

  const nextMeta = isTeacherOrAdmin
    ? {
        ...existingMeta,
        category: body.category !== undefined ? body.category : existingMeta.category,
        createdAt: body.createdAt !== undefined ? body.createdAt : existingMeta.createdAt,
        authorName: body.authorName !== undefined ? body.authorName : existingMeta.authorName,
        channels: body.channels !== undefined ? body.channels : existingMeta.channels,
        isPinned: body.isPinned !== undefined ? Boolean(body.isPinned) : existingMeta.isPinned,
        allowComments: body.allowComments !== undefined ? Boolean(body.allowComments) : existingMeta.allowComments,
        attachments: body.attachments !== undefined ? body.attachments : existingMeta.attachments,
        comments: nextComments,
        eventDate: body.eventDate !== undefined ? body.eventDate : existingMeta.eventDate,
        eventTime: body.eventTime !== undefined ? body.eventTime : existingMeta.eventTime,
        location: body.location !== undefined ? body.location : existingMeta.location
      }
    : {
        ...existingMeta,
        comments: nextComments
      };

  const targetIds = isTeacherOrAdmin && (Array.isArray(body.targetIds) || Array.isArray(body.targetStudentIds))
    ? (body.targetIds || body.targetStudentIds)
    : (existing.target_student_ids_json ? JSON.parse(existing.target_student_ids_json) : []);

  parentCommunicationRepository.upsertAnnouncement({
    id: existing.id,
    tenant_id: user.tenantId,
    title: isTeacherOrAdmin && body.title !== undefined ? body.title : existing.title,
    content: isTeacherOrAdmin && body.content !== undefined ? body.content : existing.content,
    target_type: isTeacherOrAdmin && body.targetType !== undefined ? body.targetType : existing.target_type,
    target_student_ids_json: targetIds.length > 0 ? JSON.stringify(targetIds) : null,
    sent_at: existing.sent_at,
    sent_by: existing.sent_by,
    requires_acknowledgement: isTeacherOrAdmin && body.requiresAcknowledgement !== undefined
      ? (body.requiresAcknowledgement ? 1 : 0)
      : existing.requires_acknowledgement,
    acknowledgements_json: JSON.stringify({
      items: nextAckList,
      meta: nextMeta
    }),
    created_at: existing.created_at
  });

  return res.json({ success: true, annId });
});

// DELETE /api/v1/parent-communication/announcements/:id
router.delete('/announcements/:id', requireRole('TEACHER', 'SUPER_ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const annId = req.params.id;
  const deleted = parentCommunicationRepository.deleteAnnouncement(user.tenantId, annId);
  if (!deleted) {
    return res.status(404).json({ success: false, errorCode: 'RESOURCE_NOT_FOUND', message: 'Không tìm thấy thông báo cần xóa.' });
  }
  return res.json({ success: true, annId, deleted: true });
});

export default router;
