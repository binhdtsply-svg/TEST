/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { authRepository } from './AuthRepository';

export interface PostApiResponse<T> {
  success: boolean;
  data?: T;
  errorCode?: string;
  message?: string;
}

export class PostRepositoryClient {
  private static instance: PostRepositoryClient;

  private constructor() {}

  public static getInstance(): PostRepositoryClient {
    if (!PostRepositoryClient.instance) {
      PostRepositoryClient.instance = new PostRepositoryClient();
    }
    return PostRepositoryClient.instance;
  }

  private getAuthHeader(): Record<string, string> {
    const token = authRepository.getSessionToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  public async getPosts(): Promise<PostApiResponse<any[]>> {
    try {
      const response = await fetch('/api/v1/posts', {
        headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() }
      });
      return await response.json();
    } catch (err: any) {
      return { success: false, errorCode: 'NETWORK_ERROR', message: err?.message || 'Lỗi mạng khi tải bài viết.' };
    }
  }

  public async createPost(postData: any): Promise<PostApiResponse<any>> {
    try {
      const response = await fetch('/api/v1/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() },
        body: JSON.stringify(postData)
      });
      return await response.json();
    } catch (err: any) {
      return { success: false, errorCode: 'NETWORK_ERROR', message: err?.message || 'Lỗi mạng khi đăng bài viết.' };
    }
  }

  public async approvePost(postId: string, postData?: any): Promise<PostApiResponse<any>> {
    try {
      const response = await fetch(`/api/v1/posts/${encodeURIComponent(postId)}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() },
        body: JSON.stringify(postData || {})
      });
      return await response.json();
    } catch (err: any) {
      return { success: false, errorCode: 'NETWORK_ERROR', message: err?.message || 'Lỗi mạng khi duyệt bài viết.' };
    }
  }

  public async rejectPost(postId: string, reason?: string): Promise<PostApiResponse<any>> {
    try {
      const response = await fetch(`/api/v1/posts/${encodeURIComponent(postId)}/reject`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() },
        body: JSON.stringify({ reason })
      });
      return await response.json();
    } catch (err: any) {
      return { success: false, errorCode: 'NETWORK_ERROR', message: err?.message || 'Lỗi mạng khi từ chối bài viết.' };
    }
  }

  public async addComment(postId: string, payload: { content: string; authorName?: string; authorAvatar?: string }): Promise<PostApiResponse<any>> {
    try {
      const response = await fetch(`/api/v1/posts/${encodeURIComponent(postId)}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() },
        body: JSON.stringify(payload)
      });
      return await response.json();
    } catch (err: any) {
      return { success: false, errorCode: 'NETWORK_ERROR', message: err?.message || 'Lỗi mạng khi gửi bình luận.' };
    }
  }

  public async toggleReaction(postId: string, reactionType: string): Promise<PostApiResponse<any>> {
    try {
      const response = await fetch(`/api/v1/posts/${encodeURIComponent(postId)}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() },
        body: JSON.stringify({ reactionType })
      });
      return await response.json();
    } catch (err: any) {
      return { success: false, errorCode: 'NETWORK_ERROR', message: err?.message || 'Lỗi mạng khi thả tương tác.' };
    }
  }

  public async togglePin(postId: string, pinned?: boolean, postData?: any): Promise<PostApiResponse<{ isPinned: boolean; pinnedToOverview: boolean }>> {
    try {
      const response = await fetch(`/api/v1/posts/${encodeURIComponent(postId)}/pin`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() },
        body: JSON.stringify({ pinned, post: postData })
      });
      return await response.json();
    } catch (err: any) {
      return { success: false, errorCode: 'NETWORK_ERROR', message: err?.message || 'Lỗi mạng khi ghim bài viết.' };
    }
  }

  public async deletePost(postId: string): Promise<PostApiResponse<any>> {
    try {
      const response = await fetch(`/api/v1/posts/${encodeURIComponent(postId)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() }
      });
      return await response.json();
    } catch (err: any) {
      return { success: false, errorCode: 'NETWORK_ERROR', message: err?.message || 'Lỗi mạng khi xóa bài viết.' };
    }
  }
}

export const postRepositoryClient = PostRepositoryClient.getInstance();
