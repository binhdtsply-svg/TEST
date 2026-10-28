import { Router, Response } from 'express';
import { AuthenticatedRequest, authenticateToken } from '../auth/middleware';
import { notificationRepository } from '../repositories/NotificationRepository';

const router = Router();

router.use(authenticateToken);

// GET /api/v1/notifications
router.get('/', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const notifs = notificationRepository.getForUser(user.tenantId, user.userId);
  return res.json({
    success: true,
    data: notifs.map(n => ({
      id: n.id,
      userId: n.user_id,
      role: n.role,
      type: n.type,
      title: n.title,
      message: n.message,
      linkTo: n.link_to,
      isRead: Boolean(n.is_read),
      createdAt: n.created_at
    }))
  });
});

// POST /api/v1/notifications/:id/read
router.post('/:id/read', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  notificationRepository.markAsRead(user.tenantId, user.userId, req.params.id);
  return res.json({ success: true });
});

// POST /api/v1/notifications/read-all
router.post('/read-all', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  notificationRepository.markAllAsRead(user.tenantId, user.userId);
  return res.json({ success: true });
});

export default router;
