/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { authRepository } from './AuthRepository';

export interface SurveyApiResponse<T> {
  success: boolean;
  data?: T;
  errorCode?: string;
  message?: string;
}

export class SurveyRepositoryClient {
  private static instance: SurveyRepositoryClient;

  private constructor() {}

  public static getInstance(): SurveyRepositoryClient {
    if (!SurveyRepositoryClient.instance) {
      SurveyRepositoryClient.instance = new SurveyRepositoryClient();
    }
    return SurveyRepositoryClient.instance;
  }

  private getAuthHeader(): Record<string, string> {
    const token = authRepository.getSessionToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  public async getTemplates(): Promise<SurveyApiResponse<any[]>> {
    try {
      const response = await fetch('/api/v1/surveys/templates', {
        headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() }
      });
      return await response.json();
    } catch (err: any) {
      return { success: false, errorCode: 'NETWORK_ERROR', message: err?.message || 'Lỗi mạng khi tải biểu mẫu khảo sát.' };
    }
  }

  public async saveTemplate(templateData: any): Promise<SurveyApiResponse<any>> {
    try {
      const response = await fetch('/api/v1/surveys/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() },
        body: JSON.stringify(templateData)
      });
      return await response.json();
    } catch (err: any) {
      return { success: false, errorCode: 'NETWORK_ERROR', message: err?.message || 'Lỗi mạng khi lưu biểu mẫu khảo sát.' };
    }
  }

  public async renameTemplate(templateId: string, title: string): Promise<SurveyApiResponse<any>> {
    try {
      const response = await fetch(`/api/v1/surveys/templates/${encodeURIComponent(templateId)}/rename`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() },
        body: JSON.stringify({ title })
      });
      return await response.json();
    } catch (err: any) {
      return { success: false, errorCode: 'NETWORK_ERROR', message: err?.message || 'Lỗi mạng khi đổi tên bài khảo sát.' };
    }
  }

  public async deleteTemplate(templateId: string): Promise<SurveyApiResponse<any>> {
    try {
      const response = await fetch(`/api/v1/surveys/templates/${encodeURIComponent(templateId)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() }
      });
      return await response.json();
    } catch (err: any) {
      return { success: false, errorCode: 'NETWORK_ERROR', message: err?.message || 'Lỗi mạng khi xóa bài khảo sát.' };
    }
  }

  public async archiveTemplate(templateId: string): Promise<SurveyApiResponse<any>> {
    try {
      const response = await fetch(`/api/v1/surveys/templates/${encodeURIComponent(templateId)}/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() }
      });
      return await response.json();
    } catch (err: any) {
      return { success: false, errorCode: 'NETWORK_ERROR', message: err?.message || 'Lỗi mạng khi lưu trữ bài khảo sát.' };
    }
  }

  public async getResponses(): Promise<SurveyApiResponse<any[]>> {
    try {
      const response = await fetch('/api/v1/surveys/responses', {
        headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() }
      });
      return await response.json();
    } catch (err: any) {
      return { success: false, errorCode: 'NETWORK_ERROR', message: err?.message || 'Lỗi mạng khi tải câu trả lời khảo sát.' };
    }
  }

  public async submitResponse(payload: any): Promise<SurveyApiResponse<any>> {
    try {
      const response = await fetch('/api/v1/surveys/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() },
        body: JSON.stringify(payload)
      });
      return await response.json();
    } catch (err: any) {
      return { success: false, errorCode: 'NETWORK_ERROR', message: err?.message || 'Lỗi mạng khi gửi câu trả lời khảo sát.' };
    }
  }
}

export const surveyRepositoryClient = SurveyRepositoryClient.getInstance();
