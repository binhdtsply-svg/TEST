/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SharePayload, UserAccount } from '../types';
import { safeLocalStorageGet, safeLocalStorageSet } from '../utils/storageUtils';
import { classService } from './ClassService';
import { surveyTemplateService } from './SurveyTemplateService';
import { postService } from './PostService';

export interface PublicSharedResource {
  token: string;
  resourceType: string;
  resourceId: string;
  tenantId?: string;
  title: string;
  summary?: string;
  content?: string;
  authorName?: string;
  authorRole?: string;
  className?: string;
  schoolYear?: string;
  createdAt: string;
  expiresAt?: string;
  isRevoked?: boolean;
  mediaUrls?: string[];
  metadata?: Record<string, any>;
  tags?: string[];
}

export interface ShareResolveResult {
  status: 'SUCCESS' | 'REVOKED_OR_EXPIRED' | 'NOT_FOUND';
  resource?: PublicSharedResource;
  message?: string;
}

const STORAGE_KEY = 'kgcns_public_shares_registry';

class PublicShareService {
  private shares: Map<string, PublicSharedResource> = new Map();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const saved = safeLocalStorageGet(STORAGE_KEY);
      if (saved) {
        const list: PublicSharedResource[] = JSON.parse(saved);
        if (Array.isArray(list)) {
          this.shares.clear();
          list.forEach((item) => {
            if (item.token) {
              this.shares.set(item.token, item);
            }
          });
        }
      }
    } catch (e) {
      console.warn('[PublicShareService] Failed to load shares', e);
    }
  }

  private saveToStorage() {
    try {
      const list = Array.from(this.shares.values());
      safeLocalStorageSet(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('[PublicShareService] Failed to save shares', e);
    }
  }

  /**
   * Generate a secure, unguessable share token
   */
  private generateSecureToken(): string {
    const randomHex = Array.from(
      typeof crypto !== 'undefined' && crypto.getRandomValues
        ? crypto.getRandomValues(new Uint8Array(12))
        : [Math.floor(Math.random() * 256), Math.floor(Math.random() * 256)]
    )
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return `sh_${randomHex}_${Date.now().toString(36)}`;
  }

  /**
   * Register a new public share and return its permanent public URL
   */
  public registerShare(payload: SharePayload, user?: UserAccount): string {
    const classSettings = classService.getSettings();
    const token = this.generateSecureToken();
    const now = new Date().toISOString();

    const resource: PublicSharedResource = {
      token,
      resourceType: payload.type || 'general',
      resourceId: payload.id,
      tenantId: user?.tenantId,
      title: payload.title || 'Nội dung chia sẻ từ lớp học',
      summary: payload.summary,
      content: payload.content || payload.summary,
      authorName: user?.name || 'Giáo viên Chủ nhiệm',
      authorRole: user?.role || 'TEACHER',
      className: classSettings.className ? `Lớp ${classSettings.className}` : 'Lớp 12A1',
      schoolYear: classSettings.academicYear || '2025 - 2026',
      createdAt: now,
      mediaUrls: payload.mediaUrls || (payload.imageUrl ? [payload.imageUrl] : []),
      metadata: payload.metadata || {},
      tags: payload.tags || []
    };

    // If payload is a survey, attach rich section info if available
    if (payload.type === 'survey' || payload.id?.startsWith('template-')) {
      const tmpl = surveyTemplateService.getById(payload.id);
      if (tmpl) {
        resource.title = tmpl.title;
        resource.summary = tmpl.description;
        resource.metadata = {
          ...resource.metadata,
          surveyType: tmpl.surveyType,
          version: tmpl.version,
          sections: tmpl.sections,
          totalSections: tmpl.sections?.length || 0,
          totalQuestions: tmpl.sections?.reduce((acc, s) => acc + (s.questions?.length || 0), 0) || 0
        };
      }
    }

    this.shares.set(token, resource);
    this.saveToStorage();

    return this.buildShareUrl(token);
  }

  /**
   * Build the public share URL
   */
  public buildShareUrl(token: string): string {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/#share/${token}`;
  }

  /**
   * Detect if the current browser window location is requesting a public share route
   */
  public detectShareUrl(): string | null {
    if (typeof window === 'undefined') return null;

    // 1. Check hash e.g. #share/TOKEN or #/share/TOKEN or #share/post/ID
    const hash = window.location.hash || '';
    if (hash.startsWith('#share/') || hash.startsWith('#/share/')) {
      const clean = hash.replace(/^#\/?share\//, '').trim();
      if (clean) return clean;
    }

    // 2. Check pathname e.g. /share/TOKEN or /share/post/ID
    const pathname = window.location.pathname || '';
    if (pathname.startsWith('/share/')) {
      const clean = pathname.replace(/^\/share\//, '').trim();
      if (clean) return clean;
    }

    // 3. Check query param e.g. ?share=TOKEN
    const params = new URLSearchParams(window.location.search || '');
    const queryShare = params.get('share');
    if (queryShare) return queryShare.trim();

    return null;
  }

  /**
   * Resolve a share token or legacy ID into a PublicSharedResource
   */
  public resolveShare(rawTokenOrPath: string): ShareResolveResult {
    this.loadFromStorage();

    const cleanToken = (rawTokenOrPath || '').trim();
    if (!cleanToken) {
      return {
        status: 'NOT_FOUND',
        message: 'Liên kết chia sẻ không hợp lệ.'
      };
    }

    // 1. Direct match in registry
    const exact = this.shares.get(cleanToken);
    if (exact) {
      if (exact.isRevoked) {
        return {
          status: 'REVOKED_OR_EXPIRED',
          message: 'Liên kết chia sẻ đã bị thu hồi bởi người tạo.'
        };
      }
      if (exact.expiresAt && new Date(exact.expiresAt).getTime() < Date.now()) {
        return {
          status: 'REVOKED_OR_EXPIRED',
          message: 'Liên kết chia sẻ đã hết hạn sử dụng.'
        };
      }
      return {
        status: 'SUCCESS',
        resource: exact
      };
    }

    // 2. Check if token is in format "post/ID", "survey/ID", "activity/ID" or a raw ID
    let resourceType: 'post' | 'survey' | 'activity' | 'general' = 'general';
    let targetId = cleanToken;

    if (cleanToken.startsWith('post/')) {
      resourceType = 'post';
      targetId = cleanToken.replace(/^post\//, '');
    } else if (cleanToken.startsWith('survey/')) {
      resourceType = 'survey';
      targetId = cleanToken.replace(/^survey\//, '');
    } else if (cleanToken.startsWith('activity/')) {
      resourceType = 'activity';
      targetId = cleanToken.replace(/^activity\//, '');
    }

    const classSettings = classService.getSettings();

    // Fallback: Check if targetId is a published SurveyTemplate
    if (resourceType === 'survey' || targetId.startsWith('template-')) {
      const survey = surveyTemplateService.getById(targetId) || surveyTemplateService.getPublishedTemplate();
      if (survey && survey.status !== 'ARCHIVED') {
        return {
          status: 'SUCCESS',
          resource: {
            token: cleanToken,
            resourceType: 'survey',
            resourceId: survey.id,
            title: survey.title,
            summary: survey.description,
            content: survey.description,
            authorName: survey.publishedBy || survey.createdBy || 'Giáo viên Chủ nhiệm',
            authorRole: 'TEACHER',
            className: classSettings.className ? `Lớp ${classSettings.className}` : 'Lớp 12A1',
            schoolYear: survey.schoolYear || classSettings.academicYear || '2025 - 2026',
            createdAt: survey.publishedAt || survey.createdAt,
            metadata: {
              surveyType: survey.surveyType,
              version: survey.version,
              sections: survey.sections,
              totalSections: survey.sections?.length || 0,
              totalQuestions: survey.sections?.reduce((acc, s) => acc + (s.questions?.length || 0), 0) || 0
            }
          }
        };
      }
    }

    // Fallback: Check if targetId is a Post
    const allPosts = postService.getAll ? postService.getAll() : [];
    const foundPost = allPosts.find((p: any) => p.id === targetId);
    if (foundPost) {
      return {
        status: 'SUCCESS',
        resource: {
          token: cleanToken,
          resourceType: 'post',
          resourceId: foundPost.id,
          title: foundPost.title || 'Bài đăng từ lớp học',
          summary: foundPost.content?.substring(0, 200),
          content: foundPost.content,
          authorName: foundPost.authorName || 'GVCN',
          authorRole: foundPost.authorRole || 'TEACHER',
          className: classSettings.className ? `Lớp ${classSettings.className}` : 'Lớp 12A1',
          schoolYear: classSettings.academicYear || '2025 - 2026',
          createdAt: foundPost.createdAt || new Date().toISOString(),
          mediaUrls: foundPost.images || [],
          tags: foundPost.category ? [foundPost.category] : []
        }
      };
    }

    return {
      status: 'NOT_FOUND',
      message: 'Không tìm thấy nội dung được chia sẻ hoặc liên kết không còn khả dụng.'
    };
  }

  /**
   * Revoke a shared resource by token (Author / Teacher only)
   */
  public revokeShare(token: string): boolean {
    const existing = this.shares.get(token);
    if (!existing) return false;
    existing.isRevoked = true;
    this.shares.set(token, existing);
    this.saveToStorage();
    return true;
  }
}

export const publicShareService = new PublicShareService();
