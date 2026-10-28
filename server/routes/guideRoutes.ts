/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Response } from 'express';
import { guideRepository } from '../repositories/GuideRepository';
import { authenticateToken, requireRole, AuthenticatedRequest } from '../auth/middleware';
import { sessionRepository } from '../repositories/SessionRepository';

export const guideRouter = Router();

// Helper to extract session token optionally for public/GVCN GET requests
function checkIsAdminFromRequest(req: any): boolean {
  try {
    const authHeader = req.headers['authorization'];
    const token = (authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null)
      || (req.headers['x-session-token'] as string)
      || (req.query?.token as string);

    if (token) {
      const session = sessionRepository.getSessionByToken(token);
      return session?.role === 'SUPER_ADMIN';
    }
  } catch {}
  return false;
}

// ============================================================================
// 1. PUBLIC & TEACHER CONTENT ENDPOINT
// ============================================================================

guideRouter.get('/content', (req, res: Response) => {
  const isAdmin = checkIsAdminFromRequest(req);
  const data = guideRepository.getFullContent(isAdmin);
  return res.json({
    success: true,
    isAdmin,
    categories: data.categories,
    articles: data.articles
  });
});

guideRouter.get('/categories', (req, res: Response) => {
  const isAdmin = checkIsAdminFromRequest(req);
  const categories = guideRepository.getCategories(isAdmin);
  return res.json({
    success: true,
    categories
  });
});

guideRouter.get('/articles', (req, res: Response) => {
  const isAdmin = checkIsAdminFromRequest(req);
  const categoryId = typeof req.query.categoryId === 'string' ? req.query.categoryId : undefined;
  const articles = guideRepository.getArticles(categoryId, isAdmin);
  return res.json({
    success: true,
    articles
  });
});

guideRouter.get('/articles/:id', (req, res: Response) => {
  const isAdmin = checkIsAdminFromRequest(req);
  const article = guideRepository.getArticleById(req.params.id, isAdmin);
  if (!article) {
    return res.status(404).json({
      success: false,
      errorCode: 'ARTICLE_NOT_FOUND',
      message: 'Không tìm thấy bài viết hướng dẫn.'
    });
  }
  return res.json({
    success: true,
    article
  });
});

// ============================================================================
// 2. ADMIN CATEGORY MANAGEMENT (SUPER_ADMIN ONLY)
// ============================================================================

guideRouter.post('/categories', authenticateToken, requireRole('SUPER_ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const { title, description, order, isPublished, iconName, id } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({
      success: false,
      errorCode: 'MISSING_TITLE',
      message: 'Vui lòng nhập tên nhóm hướng dẫn.'
    });
  }

  const category = guideRepository.createCategory(
    { title, description, order, isPublished, iconName, id },
    req.user!.userId
  );

  return res.status(201).json({
    success: true,
    message: 'Tạo nhóm hướng dẫn thành công.',
    category
  });
});

guideRouter.put('/categories/:id', authenticateToken, requireRole('SUPER_ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const { title, description, order, isPublished, iconName } = req.body;
  const updated = guideRepository.updateCategory(
    req.params.id,
    { title, description, order, isPublished, iconName },
    req.user!.userId
  );

  if (!updated) {
    return res.status(404).json({
      success: false,
      errorCode: 'CATEGORY_NOT_FOUND',
      message: 'Không tìm thấy nhóm hướng dẫn cần cập nhật.'
    });
  }

  return res.json({
    success: true,
    message: 'Cập nhật nhóm hướng dẫn thành công.',
    category: updated
  });
});

guideRouter.delete('/categories/:id', authenticateToken, requireRole('SUPER_ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const result = guideRepository.deleteCategory(req.params.id, req.user!.userId);
  if (!result.success) {
    return res.status(404).json({
      success: false,
      errorCode: 'CATEGORY_NOT_FOUND',
      message: 'Không tìm thấy nhóm hướng dẫn cần xóa.'
    });
  }

  return res.json({
    success: true,
    message: `Đã xóa nhóm hướng dẫn thành công (kèm ${result.deletedArticlesCount} bài hướng dẫn con).`,
    deletedArticlesCount: result.deletedArticlesCount
  });
});

// ============================================================================
// 3. ADMIN ARTICLE MANAGEMENT (SUPER_ADMIN ONLY)
// ============================================================================

guideRouter.post('/articles', authenticateToken, requireRole('SUPER_ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const {
    categoryId,
    title,
    content,
    summary,
    estimatedReadMinutes,
    order,
    isPublished,
    videoUrl,
    attachments,
    externalLinks,
    tags
  } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({
      success: false,
      errorCode: 'MISSING_TITLE',
      message: 'Vui lòng nhập tiêu đề bài viết hướng dẫn.'
    });
  }

  if (!categoryId) {
    return res.status(400).json({
      success: false,
      errorCode: 'MISSING_CATEGORY',
      message: 'Vui lòng chọn nhóm hướng dẫn.'
    });
  }

  const article = guideRepository.createArticle(
    {
      categoryId,
      title,
      content,
      summary,
      estimatedReadMinutes,
      order,
      isPublished,
      videoUrl,
      attachments,
      externalLinks,
      tags
    },
    req.user!.userId
  );

  return res.status(201).json({
    success: true,
    message: 'Tạo bài viết hướng dẫn thành công.',
    article
  });
});

guideRouter.put('/articles/:id', authenticateToken, requireRole('SUPER_ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const {
    categoryId,
    title,
    content,
    summary,
    estimatedReadMinutes,
    order,
    isPublished,
    videoUrl,
    attachments,
    externalLinks,
    tags
  } = req.body;

  const updated = guideRepository.updateArticle(
    req.params.id,
    {
      categoryId,
      title,
      content,
      summary,
      estimatedReadMinutes,
      order,
      isPublished,
      videoUrl,
      attachments,
      externalLinks,
      tags
    },
    req.user!.userId
  );

  if (!updated) {
    return res.status(404).json({
      success: false,
      errorCode: 'ARTICLE_NOT_FOUND',
      message: 'Không tìm thấy bài viết hướng dẫn cần cập nhật.'
    });
  }

  return res.json({
    success: true,
    message: 'Cập nhật bài viết hướng dẫn thành công.',
    article: updated
  });
});

guideRouter.delete('/articles/:id', authenticateToken, requireRole('SUPER_ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const success = guideRepository.deleteArticle(req.params.id, req.user!.userId);
  if (!success) {
    return res.status(404).json({
      success: false,
      errorCode: 'ARTICLE_NOT_FOUND',
      message: 'Không tìm thấy bài viết hướng dẫn cần xóa.'
    });
  }

  return res.json({
    success: true,
    message: 'Đã xóa bài viết hướng dẫn thành công.'
  });
});

// ============================================================================
// 4. REORDERING (SUPER_ADMIN ONLY)
// ============================================================================

guideRouter.post('/reorder', authenticateToken, requireRole('SUPER_ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const { type, orderedIds, categoryId } = req.body;

  if (!Array.isArray(orderedIds)) {
    return res.status(400).json({
      success: false,
      errorCode: 'INVALID_ORDER_LIST',
      message: 'Danh sách thứ tự không hợp lệ.'
    });
  }

  if (type === 'categories') {
    guideRepository.reorderCategories(orderedIds, req.user!.userId);
  } else if (type === 'articles') {
    if (!categoryId) {
      return res.status(400).json({
        success: false,
        errorCode: 'MISSING_CATEGORY_ID',
        message: 'Thiếu categoryId khi sắp xếp bài viết.'
      });
    }
    guideRepository.reorderArticles(categoryId, orderedIds, req.user!.userId);
  } else {
    return res.status(400).json({
      success: false,
      errorCode: 'INVALID_TYPE',
      message: 'Loại sắp xếp phải là "categories" hoặc "articles".'
    });
  }

  return res.json({
    success: true,
    message: 'Cập nhật thứ tự hiển thị thành công.'
  });
});
