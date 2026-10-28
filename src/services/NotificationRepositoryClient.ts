/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { authRepository } from './AuthRepository';

export interface NotificationApiResponse<T> {
  success: boolean;
  data?: T;
  errorCode?: string;
  message?: string;
}

export class NotificationRepositoryClient {
  private static instance: NotificationRepositoryClient;

  private constructor() {}

  public static getInstance(): NotificationRepositoryClient {
    if (!NotificationRepositoryClient.instance) {
      NotificationRepositoryClient.instance = new NotificationRepositoryClient();
    }
    return NotificationRepositoryClient.instance;
  }

  private getAuthHeader(): Record<string, string> {
    const token = authRepository.getSessionToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  public async getNotifications(): Promise<NotificationApiResponse<any[]>> {
    try {
      const response = await fetch('/api/v1/notifications', {
        headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() }
      });
      return await response.json();
    } catch (err: any) {
      return { success: false, errorCode: 'NETWORK_ERROR', message: err?.message || 'Lỗi mạng khi tải thông báo.' };
    }
  }

  public async markAsRead(id: string): Promise<NotificationApiResponse<any>> {
    try {
      const response = await fetch(`/api/v1/notifications/${encodeURIComponent(id)}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() }
      });
      return await response.json();
    } catch (err: any) {
      return { success: false, errorCode: 'NETWORK_ERROR', message: err?.message || 'Lỗi mạng khi đánh dấu thông báo.' };
    }
  }

  public async markAllAsRead(): Promise<NotificationApiResponse<any>> {
    try {
      const response = await fetch('/api/v1/notifications/read-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() }
      });
      return await response.json();
    } catch (err: any) {
      return { success: false, errorCode: 'NETWORK_ERROR', message: err?.message || 'Lỗi mạng khi đánh dấu tất cả thông báo.' };
    }
  }
}

export const notificationRepositoryClient = NotificationRepositoryClient.getInstance();
