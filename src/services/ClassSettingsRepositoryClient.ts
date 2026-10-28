/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ClassSettings } from '../types';
import { authRepository } from './AuthRepository';

export interface ClassSettingsApiResponse<T> {
  success: boolean;
  data?: T;
  errorCode?: string;
  message?: string;
}

export class ClassSettingsRepositoryClient {
  private static instance: ClassSettingsRepositoryClient;

  private constructor() {}

  public static getInstance(): ClassSettingsRepositoryClient {
    if (!ClassSettingsRepositoryClient.instance) {
      ClassSettingsRepositoryClient.instance = new ClassSettingsRepositoryClient();
    }
    return ClassSettingsRepositoryClient.instance;
  }

  private getBaseUrl(): string {
    if (typeof window !== 'undefined') return '';
    return (typeof process !== 'undefined' && process.env?.TEST_API_URL) || 'http://127.0.0.1:3000';
  }

  private getAuthHeader(): Record<string, string> {
    const token = authRepository.getSessionToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  public async getClassSettings(tenantId?: string): Promise<ClassSettingsApiResponse<ClassSettings>> {
    try {
      const url = tenantId ? `${this.getBaseUrl()}/api/v1/class-settings?tenantId=${encodeURIComponent(tenantId)}` : `${this.getBaseUrl()}/api/v1/class-settings`;
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader()
        }
      });

      const result = await response.json();
      return result;
    } catch (err: any) {
      return {
        success: false,
        errorCode: 'NETWORK_ERROR',
        message: err?.message || 'Không thể kết nối đến máy chủ để lấy cấu hình lớp.'
      };
    }
  }

  public async updateClassSettings(updates: Partial<ClassSettings>, tenantId?: string): Promise<ClassSettingsApiResponse<ClassSettings>> {
    try {
      const url = tenantId ? `${this.getBaseUrl()}/api/v1/class-settings?tenantId=${encodeURIComponent(tenantId)}` : `${this.getBaseUrl()}/api/v1/class-settings`;
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader()
        },
        body: JSON.stringify(updates)
      });

      const result = await response.json();
      return result;
    } catch (err: any) {
      return {
        success: false,
        errorCode: 'NETWORK_ERROR',
        message: err?.message || 'Không thể kết nối đến máy chủ để cập nhật cấu hình lớp.'
      };
    }
  }

  private getHeadersWithJson(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      ...this.getAuthHeader()
    };
  }

  // --- Submissions (Trung tâm Phê duyệt Đề xuất) ---
  public async getSubmissions(tenantId?: string): Promise<any[] | null> {
    const token = authRepository.getSessionToken();
    if (!token) return null;
    try {
      const url = tenantId
        ? `/api/v1/class-settings/submissions?tenantId=${encodeURIComponent(tenantId)}`
        : '/api/v1/class-settings/submissions';
      const res = await fetch(url, { headers: this.getHeadersWithJson() });
      if (!res.ok) return null;
      const json = await res.json();
      return json.success && Array.isArray(json.data) ? json.data : null;
    } catch {
      return null;
    }
  }

  public async createSubmission(data: any): Promise<any | null> {
    const token = authRepository.getSessionToken();
    if (!token) return null;
    try {
      const res = await fetch('/api/v1/class-settings/submissions', {
        method: 'POST',
        headers: this.getHeadersWithJson(),
        body: JSON.stringify(data)
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json.success ? json.data : null;
    } catch {
      return null;
    }
  }

  public async updateSubmission(id: string, updates: any): Promise<{ data: any | null; alreadyApproved?: boolean }> {
    const token = authRepository.getSessionToken();
    if (!token) return { data: null };
    try {
      const res = await fetch(`/api/v1/class-settings/submissions/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: this.getHeadersWithJson(),
        body: JSON.stringify(updates)
      });
      if (!res.ok) return { data: null };
      const json = await res.json();
      return { data: json.success ? json.data : null, alreadyApproved: json.alreadyApproved };
    } catch {
      return { data: null };
    }
  }

  public async deleteSubmission(id: string): Promise<boolean> {
    const token = authRepository.getSessionToken();
    if (!token) return false;
    try {
      const res = await fetch(`/api/v1/class-settings/submissions/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: this.getHeadersWithJson()
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  // --- Activities (Hoạt động Phong trào) ---
  public async getActivities(tenantId?: string): Promise<any[] | null> {
    const token = authRepository.getSessionToken();
    if (!token) return null;
    try {
      const url = tenantId
        ? `/api/v1/class-settings/activities?tenantId=${encodeURIComponent(tenantId)}`
        : '/api/v1/class-settings/activities';
      const res = await fetch(url, { headers: this.getHeadersWithJson() });
      if (!res.ok) return null;
      const json = await res.json();
      return json.success && Array.isArray(json.data) ? json.data : null;
    } catch {
      return null;
    }
  }

  public async createActivity(data: any): Promise<any | null> {
    const token = authRepository.getSessionToken();
    if (!token) return null;
    try {
      const res = await fetch('/api/v1/class-settings/activities', {
        method: 'POST',
        headers: this.getHeadersWithJson(),
        body: JSON.stringify(data)
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json.success ? json.data : null;
    } catch {
      return null;
    }
  }

  public async updateActivity(id: string, updates: any): Promise<any | null> {
    const token = authRepository.getSessionToken();
    if (!token) return null;
    try {
      const res = await fetch(`/api/v1/class-settings/activities/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: this.getHeadersWithJson(),
        body: JSON.stringify(updates)
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json.success ? json.data : null;
    } catch {
      return null;
    }
  }

  public async deleteActivity(id: string): Promise<boolean> {
    const token = authRepository.getSessionToken();
    if (!token) return false;
    try {
      const res = await fetch(`/api/v1/class-settings/activities/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: this.getHeadersWithJson()
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  // --- Album (Album Kỷ niệm) ---
  public async getAlbumPosts(tenantId?: string): Promise<any[] | null> {
    const token = authRepository.getSessionToken();
    if (!token) return null;
    try {
      const url = tenantId
        ? `/api/v1/class-settings/album?tenantId=${encodeURIComponent(tenantId)}`
        : '/api/v1/class-settings/album';
      const res = await fetch(url, { headers: this.getHeadersWithJson() });
      if (!res.ok) return null;
      const json = await res.json();
      return json.success && Array.isArray(json.data) ? json.data : null;
    } catch {
      return null;
    }
  }

  public async createAlbumPost(data: any): Promise<any | null> {
    const token = authRepository.getSessionToken();
    if (!token) return null;
    try {
      const res = await fetch('/api/v1/class-settings/album', {
        method: 'POST',
        headers: this.getHeadersWithJson(),
        body: JSON.stringify(data)
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json.success ? json.data : null;
    } catch {
      return null;
    }
  }

  public async updateAlbumPost(id: string, updates: any): Promise<any | null> {
    const token = authRepository.getSessionToken();
    if (!token) return null;
    try {
      const res = await fetch(`/api/v1/class-settings/album/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: this.getHeadersWithJson(),
        body: JSON.stringify(updates)
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json.success ? json.data : null;
    } catch {
      return null;
    }
  }

  public async deleteAlbumPost(id: string): Promise<boolean> {
    const token = authRepository.getSessionToken();
    if (!token) return false;
    try {
      const res = await fetch(`/api/v1/class-settings/album/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: this.getHeadersWithJson()
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  // --- Conduct Evaluations (Đánh giá rèn luyện định kỳ) ---
  public async getConductEvaluations(tenantId?: string): Promise<any[] | null> {
    const token = authRepository.getSessionToken();
    if (!token) return null;
    try {
      const url = tenantId
        ? `/api/v1/class-settings/conduct-evaluations?tenantId=${encodeURIComponent(tenantId)}`
        : '/api/v1/class-settings/conduct-evaluations';
      const res = await fetch(url, { headers: this.getHeadersWithJson() });
      if (!res.ok) return null;
      const json = await res.json();
      return json.success && Array.isArray(json.data) ? json.data : null;
    } catch {
      return null;
    }
  }

  public async saveConductEvaluation(id: string, data: any): Promise<any | null> {
    const token = authRepository.getSessionToken();
    if (!token) return null;
    try {
      const res = await fetch(`/api/v1/class-settings/conduct-evaluations/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: this.getHeadersWithJson(),
        body: JSON.stringify(data)
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json.success ? json.data : null;
    } catch {
      return null;
    }
  }

  public async deleteConductEvaluation(id: string): Promise<boolean> {
    const token = authRepository.getSessionToken();
    if (!token) return false;
    try {
      const res = await fetch(`/api/v1/class-settings/conduct-evaluations/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: this.getHeadersWithJson()
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

export const classSettingsRepositoryClient = ClassSettingsRepositoryClient.getInstance();

