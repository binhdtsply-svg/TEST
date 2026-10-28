/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Request, Response } from 'express';
import { eventHub } from '../events/EventHub';
import { DomainEvent } from '../events/DomainEvent';
import { sessionRepository } from '../repositories/SessionRepository';

export const eventRouter = Router();

// Helper to authenticate token from header or query param
function extractUserFromRequest(req: Request) {
  let token = '';
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.query.token) {
    token = req.query.token as string;
  }

  if (!token) {
    // Return explicit unauthenticated guest context if no token
    const tenantId = (req.headers['x-tenant-id'] || req.query.tenantId || '') as string;
    const role = (req.headers['x-user-role'] || req.query.role || 'GUEST') as string;
    const userId = (req.headers['x-user-id'] || req.query.userId || 'guest') as string;
    const studentId = (req.headers['x-student-id'] || req.query.studentId) as string | undefined;

    return {
      userId,
      role,
      tenantId,
      studentId,
      childStudentId: studentId
    };
  }

  const session = sessionRepository.getSessionByToken(token);
  if (session) {
    return {
      userId: session.user_id,
      role: session.role,
      tenantId: session.tenant_id,
      studentId: session.student_id || undefined,
      childStudentId: session.child_student_id || undefined
    };
  }

  return null;
}

// 1. GET /api/v1/events/stream - Real-time SSE Stream
eventRouter.get('/stream', (req: Request, res: Response) => {
  const user = extractUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Unauthorized: Invalid or missing token' });
  }

  // Set SSE HTTP Headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': '*'
  });
  res.flushHeaders?.();

  const clientId = `sse_${user.userId}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

  const client = {
    id: clientId,
    tenantId: user.tenantId,
    userId: user.userId,
    role: user.role,
    studentId: user.studentId,
    childStudentId: user.childStudentId,
    res,
    connectedAt: Date.now()
  };

  eventHub.registerClient(client);

  req.on('close', () => {
    eventHub.unregisterClient(clientId);
  });
});

// 2. GET /api/v1/events/poll - Fallback polling endpoint
eventRouter.get('/poll', (req: Request, res: Response) => {
  const user = extractUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const since = (req.query.since as string) || '';
  const events = eventHub.getEventsSince(user.tenantId, since);

  return res.json({
    success: true,
    data: events,
    timestamp: new Date().toISOString()
  });
});

// 3. POST /api/v1/events/publish - Client event dispatch
eventRouter.post('/publish', (req: Request, res: Response) => {
  const user = extractUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const body = req.body;
  if (!body.type || !body.payload) {
    return res.status(400).json({ success: false, message: 'Missing event type or payload' });
  }

  const event: DomainEvent = {
    id: body.id || `evt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    type: body.type,
    tenantId: user.tenantId,
    actorId: user.userId,
    actorRole: user.role,
    actorName: body.actorName || user.userId,
    targetRoles: body.targetRoles,
    targetUserIds: body.targetUserIds,
    excludeUserIds: body.excludeUserIds || [user.userId],
    parentVisible: body.parentVisible !== undefined ? body.parentVisible : true,
    payload: body.payload,
    notification: body.notification,
    timestamp: body.timestamp || new Date().toISOString()
  };

  eventHub.publish(event);

  return res.json({
    success: true,
    data: { eventId: event.id }
  });
});

export default eventRouter;
