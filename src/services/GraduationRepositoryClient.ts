/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { authRepository } from './AuthRepository';

export interface GraduationApiResponse<T> {
  success: boolean;
  data?: T;
  errorCode?: string;
  message?: string;
}

export class GraduationRepositoryClient {
  private static instance: GraduationRepositoryClient;

  private constructor() {}

  public static getInstance(): GraduationRepositoryClient {
    if (!GraduationRepositoryClient.instance) {
      GraduationRepositoryClient.instance = new GraduationRepositoryClient();
    }
    return GraduationRepositoryClient.instance;
  }

  private getAuthHeader(): Record<string, string> {
    const token = authRepository.getSessionToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  public async getGraduationChoices(): Promise<GraduationApiResponse<any[]>> {
    try {
      const response = await fetch('/api/v1/graduation', {
        headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() }
      });
      return await response.json();
    } catch (err: any) {
      return { success: false, errorCode: 'NETWORK_ERROR', message: err?.message || 'Lỗi mạng khi tải định hướng thi tốt nghiệp.' };
    }
  }

  public async saveGraduationChoice(payload: any): Promise<GraduationApiResponse<any>> {
    try {
      const response = await fetch('/api/v1/graduation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() },
        body: JSON.stringify(payload)
      });
      return await response.json();
    } catch (err: any) {
      return { success: false, errorCode: 'NETWORK_ERROR', message: err?.message || 'Lỗi mạng khi lưu định hướng thi tốt nghiệp.' };
    }
  }

  public async deleteGraduationChoice(studentId: string): Promise<GraduationApiResponse<any>> {
    try {
      const response = await fetch(`/api/v1/graduation/${studentId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() }
      });
      return await response.json();
    } catch (err: any) {
      return { success: false, errorCode: 'NETWORK_ERROR', message: err?.message || 'Lỗi mạng khi xóa định hướng thi tốt nghiệp.' };
    }
  }
}

export const graduationRepositoryClient = GraduationRepositoryClient.getInstance();
