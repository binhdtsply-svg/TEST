/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { authRepository } from './AuthRepository';
import { AttachedFile } from '../types';

export interface GuideLinkItem {
  id: string;
  title: string;
  url: string;
}

export interface AdminGuideArticle {
  id: string;
  categoryId: string;
  title: string;
  content: string;
  summary: string;
  estimatedReadMinutes?: number;
  order: number;
  isPublished: boolean;
  videoUrl?: string;
  attachments?: AttachedFile[];
  externalLinks?: GuideLinkItem[];
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface AdminGuideCategory {
  id: string;
  title: string;
  description: string;
  order: number;
  isPublished: boolean;
  iconName?: string;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface GuideContentPayload {
  success: boolean;
  isAdmin: boolean;
  categories: AdminGuideCategory[];
  articles: AdminGuideArticle[];
}

class GuideService {
  private static instance: GuideService;
  private cachedContent: GuideContentPayload | null = null;
  private fetchPromise: Promise<GuideContentPayload> | null = null;

  private constructor() {}

  public static getInstance(): GuideService {
    if (!GuideService.instance) {
      GuideService.instance = new GuideService();
    }
    return GuideService.instance;
  }

  private getHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    const token = authRepository.getSessionToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  public async getContent(forceRefresh: boolean = false): Promise<GuideContentPayload> {
    if (!forceRefresh && this.cachedContent) {
      return this.cachedContent;
    }

    if (this.fetchPromise && !forceRefresh) {
      return this.fetchPromise;
    }

    this.fetchPromise = (async () => {
      try {
        const resp = await fetch('/api/v1/guide/content', {
          headers: this.getHeaders()
        });

        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status}`);
        }

        const data: GuideContentPayload = await resp.json();
        this.cachedContent = data;
        return data;
      } catch (err: any) {
        console.warn('[GuideService] Failed to fetch guide content:', err?.message);
        if (this.cachedContent) return this.cachedContent;
        return {
          success: false,
          isAdmin: false,
          categories: [],
          articles: []
        };
      } finally {
        this.fetchPromise = null;
      }
    })();

    return this.fetchPromise;
  }

  public async getArticle(id: string): Promise<AdminGuideArticle | null> {
    try {
      const resp = await fetch(`/api/v1/guide/articles/${encodeURIComponent(id)}`, {
        headers: this.getHeaders()
      });
      if (!resp.ok) return null;
      const data = await resp.json();
      return data.article || null;
    } catch {
      return null;
    }
  }

  // --- ADMIN METHODS ---

  public async createCategory(category: Partial<AdminGuideCategory>): Promise<{ success: boolean; category?: AdminGuideCategory; message?: string }> {
    try {
      const resp = await fetch('/api/v1/guide/categories', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(category)
      });
      const data = await resp.json();
      if (resp.ok && data.success) {
        this.notifyChange();
        return { success: true, category: data.category };
      }
      return { success: false, message: data.message || 'Lỗi khi tạo nhóm hướng dẫn' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Lỗi kết nối' };
    }
  }

  public async updateCategory(id: string, category: Partial<AdminGuideCategory>): Promise<{ success: boolean; category?: AdminGuideCategory; message?: string }> {
    try {
      const resp = await fetch(`/api/v1/guide/categories/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(category)
      });
      const data = await resp.json();
      if (resp.ok && data.success) {
        this.notifyChange();
        return { success: true, category: data.category };
      }
      return { success: false, message: data.message || 'Lỗi khi cập nhật nhóm hướng dẫn' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Lỗi kết nối' };
    }
  }

  public async deleteCategory(id: string): Promise<{ success: boolean; message?: string; deletedArticlesCount?: number }> {
    try {
      const resp = await fetch(`/api/v1/guide/categories/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });
      const data = await resp.json();
      if (resp.ok && data.success) {
        this.notifyChange();
        return { success: true, message: data.message, deletedArticlesCount: data.deletedArticlesCount };
      }
      return { success: false, message: data.message || 'Lỗi khi xóa nhóm hướng dẫn' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Lỗi kết nối' };
    }
  }

  public async createArticle(article: Partial<AdminGuideArticle>): Promise<{ success: boolean; article?: AdminGuideArticle; message?: string }> {
    try {
      const resp = await fetch('/api/v1/guide/articles', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(article)
      });
      const data = await resp.json();
      if (resp.ok && data.success) {
        this.notifyChange();
        return { success: true, article: data.article };
      }
      return { success: false, message: data.message || 'Lỗi khi tạo bài viết hướng dẫn' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Lỗi kết nối' };
    }
  }

  public async updateArticle(id: string, article: Partial<AdminGuideArticle>): Promise<{ success: boolean; article?: AdminGuideArticle; message?: string }> {
    try {
      const resp = await fetch(`/api/v1/guide/articles/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(article)
      });
      const data = await resp.json();
      if (resp.ok && data.success) {
        this.notifyChange();
        return { success: true, article: data.article };
      }
      return { success: false, message: data.message || 'Lỗi khi cập nhật bài viết hướng dẫn' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Lỗi kết nối' };
    }
  }

  public async deleteArticle(id: string): Promise<{ success: boolean; message?: string }> {
    try {
      const resp = await fetch(`/api/v1/guide/articles/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });
      const data = await resp.json();
      if (resp.ok && data.success) {
        this.notifyChange();
        return { success: true, message: data.message };
      }
      return { success: false, message: data.message || 'Lỗi khi xóa bài viết hướng dẫn' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Lỗi kết nối' };
    }
  }

  public async reorder(type: 'categories' | 'articles', orderedIds: string[], categoryId?: string): Promise<{ success: boolean; message?: string }> {
    try {
      const resp = await fetch('/api/v1/guide/reorder', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ type, orderedIds, categoryId })
      });
      const data = await resp.json();
      if (resp.ok && data.success) {
        this.notifyChange();
        return { success: true, message: data.message };
      }
      return { success: false, message: data.message || 'Lỗi khi cập nhật thứ tự' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Lỗi kết nối' };
    }
  }

  private notifyChange(): void {
    this.cachedContent = null;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('guide-content-changed'));
    }
  }
}

export const guideService = GuideService.getInstance();
