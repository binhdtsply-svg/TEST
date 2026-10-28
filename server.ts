/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { aiProviderRouter } from './server/ai/AIProviderRouter';
import { getDatabase } from './server/db/database';
import { seedInitialData } from './server/db/seed';
import { authRouter } from './server/routes/authRoutes';
import { credentialRouter } from './server/routes/credentialRoutes';
import { tenantRouter } from './server/routes/tenantRoutes';
import { studentRouter } from './server/routes/studentRoutes';
import { classSettingsRouter } from './server/routes/classSettingsRoutes';
import surveyRouter from './server/routes/surveyRoutes';
import academicRouter from './server/routes/academicRoutes';
import timetableRouter from './server/routes/timetableRoutes';
import trainingRouter from './server/routes/trainingRoutes';
import graduationRouter from './server/routes/graduationRoutes';
import careerRouter from './server/routes/careerRoutes';
import parentRouter from './server/routes/parentRoutes';
import notificationRouter from './server/routes/notificationRoutes';
import postRouter from './server/routes/postRoutes';
import eventRouter from './server/routes/eventRoutes';
import teacherWorkCenterRouter from './server/routes/teacherWorkCenterRoutes';
import { supportRouter } from './server/routes/supportRoutes';
import { guideRouter } from './server/routes/guideRoutes';
import { sessionRepository } from './server/repositories/SessionRepository';
import { persistenceSyncService } from './server/services/PersistenceSyncService';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Initialize SQLite Database, hydrate from Cloud Firestore + local backup, and seed missing initial records
  try {
    getDatabase();

    let isCloudFirestoreHealthy = false;
    // 1. Verify Cloud Firestore connection and server authentication
    try {
      const connTest = await persistenceSyncService.verifyFirestoreConnection();
      if (connTest.connected) {
        isCloudFirestoreHealthy = true;
        console.log('[FIRESTORE-VERIFY] Cloud Firestore connection and server authentication OK.');
      } else {
        console.warn('[FIRESTORE-VERIFY-NOTE]', connTest.errorMessage, connTest.details);
      }
    } catch (e: any) {
      console.warn('[FIRESTORE-VERIFY-ERROR]', e?.message);
    }

    // 2. Hydrate authoritative records from Cloud Firestore FIRST (including SUPER_ADMIN state)
    if (isCloudFirestoreHealthy) {
      try {
        const fireRes = await Promise.race([
          persistenceSyncService.hydrateFromFirestoreIfAvailableAsync(),
          new Promise<{ restored: boolean; count: number; message: string }>((_, reject) =>
            setTimeout(() => reject(new Error('Firestore hydration timeout (15s)')), 15000)
          )
        ]);
        if (fireRes?.restored) {
          console.log('[DB-FIRESTORE-HYDRATION]', fireRes.message);
        } else if (fireRes?.message) {
          console.log('[DB-FIRESTORE-HYDRATION]', fireRes.message);
        }
      } catch (err: any) {
        console.warn('[DB-FIRESTORE-HYDRATION-NOTE]', err?.message);
      }
    }

    // 3. Hydrate any remaining fallback records from local backup WITHOUT overwriting Cloud Firestore records
    const hydrationRes = persistenceSyncService.hydrateFromBackupIfAvailable({ skipFirestoreSync: true });
    if (hydrationRes.restored) {
      console.log('[DB-HYDRATION]', hydrationRes.message);
    }

    // 4. Seed initial data (strictly idempotent, never overwrites existing or hydrated data)
    seedInitialData();

    // 5. Flush local backup snapshot and synchronize incremental diff to Cloud Firestore (strictly allowDeletes: false on boot)
    if (isCloudFirestoreHealthy) {
      const initialCloudSync = await persistenceSyncService.flushAndSyncToCloudAsync({
        forceFullSync: false,
        allowDeletes: false
      });
      if (initialCloudSync.ok) {
        console.log(`[DB-INIT] Master database initialized, hydrated, and synced to Cloud Firestore (${initialCloudSync.syncedCount} docs).`);
      } else {
        console.error('[DB-INIT-CLOUD-SYNC-ERROR] Failed to sync initial state to Cloud Firestore:', initialCloudSync.error);
      }
    } else {
      console.warn('[DB-INIT-OFFLINE] Skipping initial cloud sync because Firestore is not verified healthy. Local data preserved safely.');
    }
  } catch (dbErr) {
    console.error('[DB-INIT-ERROR]', dbErr);
  }

  app.use(express.json({ limit: '10mb' }));

  // Durable Persistence Middleware: Ensure all mutating /api/v1/* requests flush to local JSON backup
  // and synchronize with Cloud Firestore without failing local SQLite commits on transient cloud errors.
  app.use('/api/v1', (req, res, next) => {
    const isMutatingMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method.toUpperCase());
    if (!isMutatingMethod) {
      return next();
    }

    // Skip read-only verification POST endpoints from triggering DB writes
    const nonMutatingPostPaths = [
      '/api/v1/auth/admin/verify-recovery-code',
      '/api/v1/auth/recovery-code/verify',
      '/api/v1/auth/verify-route-access',
      '/api/v1/auth/route-guard',
      '/api/v1/auth/admin/verify-firebase',
      '/api/v1/ai/test'
    ];
    if (nonMutatingPostPaths.some(p => req.originalUrl.startsWith(p))) {
      return next();
    }

    const originalJson = res.json.bind(res);
    (res as any).json = (body: any) => {
      const isSuccessStatus = res.statusCode >= 200 && res.statusCode < 300;
      const isLogicalFailure = body && typeof body === 'object' && body.success === false;

      if (!isSuccessStatus || isLogicalFailure) {
        return originalJson(body);
      }

      const allowCloudDeletes =
        req.method.toUpperCase() === 'DELETE' &&
        persistenceSyncService.isInitialCloudHydrationComplete();

      persistenceSyncService
        .flushAndSyncToCloudAsync({ allowDeletes: allowCloudDeletes })
        .then((syncResult) => {
          if (!syncResult.ok) {
            const isBlockedOrPermDenied =
              persistenceSyncService.isPermissionDeniedOrQuotaError(syncResult.error) ||
              !persistenceSyncService.isInitialCloudHydrationComplete();
            if (!isBlockedOrPermDenied) {
              console.warn(
                `[DURABLE-SYNC-DEFERRED] Local SQLite & JSON backup succeeded for ${req.method} ${req.originalUrl}; scheduling background Cloud Firestore retry:`,
                syncResult.error
              );
              persistenceSyncService.scheduleDebouncedFlush(5000);
            } else {
              console.warn(
                `[DURABLE-SYNC-PENDING] Local SQLite & JSON backup saved for ${req.method} ${req.originalUrl}; Cloud Firestore sync pending (${syncResult.error}).`
              );
            }
            if (body && typeof body === 'object' && !Array.isArray(body)) {
              return originalJson({
                ...body,
                cloudSyncPending: true
              });
            }
          }
          return originalJson(body);
        })
        .catch((err: any) => {
          console.warn(
            `[DURABLE-SYNC-DEFERRED-EXCEPTION] Local SQLite & JSON backup saved for ${req.method} ${req.originalUrl}; Cloud Firestore sync pending:`,
            err?.message || err
          );
          if (body && typeof body === 'object' && !Array.isArray(body)) {
            return originalJson({
              ...body,
              cloudSyncPending: true
            });
          }
          return originalJson(body);
        });

      return res;
    };

    next();
  });

  // Mount API v1 Routes
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/credentials', credentialRouter);
  app.use('/api/v1/tenants', tenantRouter);
  app.use('/api/v1/students', studentRouter);
  app.use('/api/v1/class-settings', classSettingsRouter);
  app.use('/api/v1/surveys', surveyRouter);
  app.use('/api/v1/academic', academicRouter);
  app.use('/api/v1/timetable', timetableRouter);
  app.use('/api/v1/training', trainingRouter);
  app.use('/api/v1/graduation', graduationRouter);
  app.use('/api/v1/career', careerRouter);
  app.use('/api/v1/parent-communication', parentRouter);
  app.use('/api/v1/notifications', notificationRouter);
  app.use('/api/v1/posts', postRouter);
  app.use('/api/v1/events', eventRouter);
  app.use('/api/v1/teacher-work-center', teacherWorkCenterRouter);
  app.use('/api/v1/support', supportRouter);
  app.use('/api/v1/guide', guideRouter);

  // Helper to extract session token from authorization header, x-session-token, query, or cookie
  function extractSessionTokenFromRequest(req: express.Request): string | null {
    const authHeader = req.headers['authorization'];
    let token = (authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null)
      || (req.headers['x-session-token'] as string)
      || (req.query?.token as string)
      || (req as any).cookies?.kgcns_session;

    if (!token && req.headers.cookie) {
      const match = req.headers.cookie.match(/(?:^|;\s*)kgcns_session=([^;]+)/);
      if (match) {
        token = decodeURIComponent(match[1]);
      }
    }

    return token ? token.trim() : null;
  }

  // 1.0 Dedicated Server-Side Route Guard for /quan-tri & /quan-tri-x7k9 (Admin Only)
  app.all(['/quan-tri', '/quantri', '/quan-tri/*', '/quan-tri-x7k9', '/quan-tri-x7k9/*'], (req, res, next) => {
    const token = extractSessionTokenFromRequest(req);
    const isBrowserHtml = req.headers.accept?.includes('text/html');

    if (!token) {
      // Browser navigation without session -> serve SPA entry so user sees Admin Login Screen directly at /quan-tri
      if (isBrowserHtml && !req.headers['authorization'] && !req.headers['x-session-token'] && !req.xhr && req.headers['sec-fetch-dest'] === 'document') {
        return next();
      }

      return res.status(401).json({
        success: false,
        allowed: false,
        errorCode: 'AUTH_REQUIRED',
        route: '/quan-tri',
        message: 'Từ chối truy cập: Cổng Quản trị viên (/quan-tri) yêu cầu đăng nhập Super Admin.'
      });
    }

    const session = sessionRepository.getSessionByToken(token);
    if (!session) {
      return res.status(401).json({
        success: false,
        allowed: false,
        errorCode: 'SESSION_EXPIRED',
        route: '/quan-tri',
        message: 'Phiên làm việc Quản trị viên đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.'
      });
    }

    if (session.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        allowed: false,
        errorCode: 'ROLE_ACCESS_DENIED',
        route: '/quan-tri',
        role: session.role,
        message: `Từ chối truy cập: Cổng Quản trị viên (/quan-tri) chỉ dành riêng cho Admin. Vai trò [${session.role}] không được phép.`
      });
    }

    // Role is SUPER_ADMIN -> PASS
    if (!isBrowserHtml || req.headers.accept?.includes('application/json') || req.xhr || req.query.format === 'json') {
      return res.json({
        success: true,
        allowed: true,
        route: '/quan-tri',
        role: 'SUPER_ADMIN',
        user: {
          id: session.user_id,
          role: 'SUPER_ADMIN'
        }
      });
    }

    return next();
  });

  // 1.01 Dedicated Server-Side Route Guard for /app (GVCN, Học viên, Phụ huynh, User Roles)
  app.all(['/app', '/app/*'], (req, res, next) => {
    const token = extractSessionTokenFromRequest(req);
    const isBrowserHtml = req.headers.accept?.includes('text/html');

    if (token) {
      const session = sessionRepository.getSessionByToken(token);
      if (!session) {
        return res.status(401).json({
          success: false,
          allowed: false,
          errorCode: 'SESSION_EXPIRED',
          route: '/app',
          message: 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.'
        });
      }

      const validUserRoles = ['TEACHER', 'STUDENT', 'PARENT', 'CLASS_OFFICER', 'SUPER_ADMIN'];
      if (!validUserRoles.includes(session.role)) {
        return res.status(403).json({
          success: false,
          allowed: false,
          errorCode: 'ROLE_ACCESS_DENIED',
          route: '/app',
          role: session.role,
          message: `Từ chối truy cập: Vai trò [${session.role}] không được phép truy cập /app.`
        });
      }

      if (!isBrowserHtml || req.headers.accept?.includes('application/json') || req.xhr || req.query.format === 'json') {
        return res.json({
          success: true,
          allowed: true,
          route: '/app',
          role: session.role,
          user: {
            id: session.user_id,
            role: session.role
          }
        });
      }
    }

    return next();
  });

  // 1. Health check & Diagnostics API
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // 1.1 Activity Summary & Evaluation Server API with 403 Forbidden Role Guards
  app.get('/api/activity-summary/export', (req, res) => {
    const role = (req.headers['x-user-role'] || req.query.role || '').toString();
    if (role !== 'TEACHER' && role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        error: '403 Forbidden',
        message: 'Chỉ Giáo viên chủ nhiệm mới có quyền xuất dữ liệu đánh giá hoạt động.'
      });
    }
    return res.json({ success: true, message: 'Export allowed' });
  });

  app.post('/api/activity-praise', (req, res) => {
    const role = (req.headers['x-user-role'] || req.body.role || '').toString();
    if (role !== 'TEACHER' && role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        error: '403 Forbidden',
        message: 'Chỉ Giáo viên chủ nhiệm mới có quyền tuyên dương hoạt động.'
      });
    }
    return res.json({ success: true, message: 'Praise toggled' });
  });

  app.patch('/api/activity-evaluation', (req, res) => {
    const role = (req.headers['x-user-role'] || req.body.role || '').toString();
    if (role !== 'TEACHER' && role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        error: '403 Forbidden',
        message: 'Chỉ Giáo viên chủ nhiệm mới có quyền cập nhật đánh giá hoạt động.'
      });
    }
    return res.json({ success: true, message: 'Evaluation updated' });
  });

  // AI Health Check Endpoint (Runs real provider test)
  app.get('/api/ai/health', async (_req, res) => {
    try {
      const result = await aiProviderRouter.healthCheck();
      if (!result.ok) {
        return res.status(500).json(result);
      }
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({
        ok: false,
        provider: 'none',
        status: 'ERROR',
        message: err?.message || 'Lỗi kiểm tra hệ thống AI.',
        openaiPresent: Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim()),
        geminiPresent: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()),
        code: 'SERVER_ERROR',
        details: String(err)
      });
    }
  });

  // Connection Test API (Called by 'Kiểm tra AI' button)
  app.post('/api/ai/test', async (req, res) => {
    const startTime = Date.now();
    try {
      const personalKey = (req.headers['x-personal-gemini-key'] as string) || req.body?.personalApiKey;
      const isPersonal = req.body?.sourceType === 'personal_gemini' || Boolean(personalKey && personalKey.trim());

      let result;
      if (isPersonal) {
        if (!personalKey || !personalKey.trim()) {
          return res.status(400).json({
            success: false,
            message: 'Chưa cấu hình khóa Gemini API cá nhân.',
            provider: 'gemini',
            sourceType: 'personal_gemini',
            code: 'PERSONAL_KEY_MISSING'
          });
        }
        result = await aiProviderRouter.healthCheckPersonal(personalKey.trim());
      } else {
        result = await aiProviderRouter.healthCheck();
      }

      const latencyMs = result.latencyMs || (Date.now() - startTime);

      if (!result.ok) {
        return res.status(500).json({
          success: false,
          message: result.message,
          provider: result.provider,
          model: result.model,
          sourceType: isPersonal ? 'personal_gemini' : 'system',
          latencyMs,
          code: result.code,
          details: result.details
        });
      }

      return res.json({
        success: true,
        message: isPersonal
          ? '✓ Kết nối Gemini cá nhân thành công.'
          : result.status === 'DEGRADED'
          ? '● AI đang hoạt động bằng hệ thống dự phòng.'
          : '✓ AI Trợ lý GVCN (Hệ thống) đã sẵn sàng.',
        provider: result.provider,
        model: result.model,
        status: result.status,
        sourceType: isPersonal ? 'personal_gemini' : 'system',
        latencyMs
      });
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      return res.status(500).json({
        success: false,
        message: err?.message || 'Lỗi kết nối máy chủ AI.',
        latencyMs
      });
    }
  });

  // AI Chat API
  app.post('/api/ai/chat', async (req, res) => {
    try {
      const {
        messages = [],
        systemInstruction,
        temperature,
        thinkingLevel,
        responseSchema,
        sourceType = 'system'
      } = req.body;

      const personalKey = (req.headers['x-personal-gemini-key'] as string) || req.body?.personalApiKey;
      const isPersonal = sourceType === 'personal_gemini' || Boolean(req.headers['x-personal-gemini-key']);

      let response;
      if (isPersonal) {
        if (!personalKey || !personalKey.trim()) {
          return res.status(400).json({
            success: false,
            error: 'Nguồn AI được chọn là "Gemini cá nhân" nhưng chưa cung cấp khóa API.',
            code: 'PERSONAL_KEY_MISSING'
          });
        }
        response = await aiProviderRouter.chatPersonal(personalKey.trim(), {
          messages,
          systemInstruction,
          temperature,
          thinkingLevel,
          responseSchema
        });
      } else {
        response = await aiProviderRouter.chat({
          messages,
          systemInstruction,
          temperature,
          thinkingLevel,
          responseSchema
        });
      }

      return res.json({
        success: true,
        text: response.text,
        provider: response.provider,
        model: response.model,
        sourceType: isPersonal ? 'personal_gemini' : 'system',
        latencyMs: response.latencyMs
      });
    } catch (err: any) {
      console.error('[AI-CHAT-ERROR]', err);
      const errMsg = err?.message || String(err);
      const isRate = errMsg.includes('Rate limit') || errMsg.includes('hạn mức') || errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('hạ nhiệt');
      const statusCode = isRate ? 429 : 500;
      return res.status(statusCode).json({
        success: false,
        error: errMsg || 'Đã có lỗi khi xử lý yêu cầu AI.',
        code: isRate ? 'RATE_LIMITED' : 'SERVER_ERROR',
        details: errMsg
      });
    }
  });

  // Streaming Chat API (SSE)
  app.post('/api/ai/chat-stream', async (req, res) => {
    try {
      const {
        messages = [],
        systemInstruction,
        temperature,
        thinkingLevel,
        sourceType = 'system'
      } = req.body;

      const personalKey = (req.headers['x-personal-gemini-key'] as string) || req.body?.personalApiKey;
      const isPersonal = sourceType === 'personal_gemini' || Boolean(req.headers['x-personal-gemini-key']);

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      let response;
      if (isPersonal) {
        if (!personalKey || !personalKey.trim()) {
          res.write(`data: ${JSON.stringify({ error: 'Nguồn AI được chọn là "Gemini cá nhân" nhưng chưa cung cấp khóa API.' })}\n\n`);
          res.end();
          return;
        }
        response = await aiProviderRouter.chatPersonal(personalKey.trim(), {
          messages,
          systemInstruction,
          temperature,
          thinkingLevel
        });
      } else {
        response = await aiProviderRouter.chat({
          messages,
          systemInstruction,
          temperature,
          thinkingLevel
        });
      }

      const text = response.text || '';
      // Stream chunks for responsive UX
      const words = text.split(' ');
      for (let i = 0; i < words.length; i += 4) {
        const chunk = words.slice(i, i + 4).join(' ') + (i + 4 < words.length ? ' ' : '');
        res.write(`data: ${JSON.stringify({ text: chunk, provider: response.provider, model: response.model, sourceType: isPersonal ? 'personal_gemini' : 'system' })}\n\n`);
        await new Promise((r) => setTimeout(r, 20));
      }

      res.write(`data: [DONE]\n\n`);
      res.end();
    } catch (err: any) {
      console.error('[AI-STREAM-ERROR]', err);
      const errMsg = err?.message || String(err);
      res.write(`data: ${JSON.stringify({ error: errMsg })}\n\n`);
      res.end();
    }
  });

  // Dedicated API 404 JSON handler - prevents SPA fallback from returning HTML for invalid API requests
  app.all(['/api', '/api/*'], (_req, res) => {
    res.status(404).json({
      success: false,
      errorCode: 'API_ENDPOINT_NOT_FOUND',
      message: 'API endpoint không tồn tại hoặc sai đường dẫn.'
    });
  });

  // Vite middleware for development vs static dist for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    console.log(`[AI-INIT] OPENAI_API_KEY_PRESENT = ${Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim())}`);
    console.log(`[AI-INIT] GEMINI_API_KEY_PRESENT = ${Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim())}`);
  });

  // Graceful shutdown: ensures WAL checkpoint and persistent JSON snapshots are saved cleanly and synced to cloud
  const handleShutdown = async (signal: string) => {
    console.log(`[SHUTDOWN] Received ${signal}. Flushing persistent data to backup files & Cloud Firestore...`);
    try {
      await persistenceSyncService.flushAndSyncToCloudAsync({ allowDeletes: false });
      console.log('[SHUTDOWN] Persistent backup flushed and synced to Cloud Firestore successfully.');
    } catch (err) {
      console.error('[SHUTDOWN-ERROR] Failed to flush backup on shutdown:', err);
    }
    server.close(() => {
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 3000);
  };

  process.on('SIGTERM', () => { handleShutdown('SIGTERM'); });
  process.on('SIGINT', () => { handleShutdown('SIGINT'); });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
