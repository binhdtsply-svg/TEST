/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { authRepository } from './AuthRepository';

export interface ParentApiResponse<T> {
  success: boolean;
  data?: T;
  errorCode?: string;
  message?: string;
}

export class ParentCommunicationRepositoryClient {
  private static instance: ParentCommunicationRepositoryClient;

  private constructor() {}

  public static getInstance(): ParentCommunicationRepositoryClient {
    if (!ParentCommunicationRepositoryClient.instance) {
      ParentCommunicationRepositoryClient.instance = new ParentCommunicationRepositoryClient();
    }
    return ParentCommunicationRepositoryClient.instance;
  }

  private getAuthHeader(): Record<string, string> {
    const token = authRepository.getSessionToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  public async getConversations(): Promise<ParentApiResponse<any[]>> {
    try {
      const response = await fetch('/api/v1/parent-communication/conversations', {
        headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() }
      });
      return await response.json();
    } catch (err: any) {
      return { success: false, errorCode: 'NETWORK_ERROR', message: err?.message || 'Lỗi mạng khi tải hội thoại phụ huynh.' };
    }
  }

  public async sendConversationMessage(payload: any): Promise<ParentApiResponse<any>> {
    try {
      const response = await fetch('/api/v1/parent-communication/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() },
        body: JSON.stringify(payload)
      });
      return await response.json();
    } catch (err: any) {
      return { success: false, errorCode: 'NETWORK_ERROR', message: err?.message || 'Lỗi mạng khi gửi tin nhắn phụ huynh.' };
    }
  }

  public async getAnnouncements(): Promise<ParentApiResponse<any[]>> {
    try {
      const response = await fetch('/api/v1/parent-communication/announcements', {
        headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() }
      });
      return await response.json();
    } catch (err: any) {
      return { success: false, errorCode: 'NETWORK_ERROR', message: err?.message || 'Lỗi mạng khi tải thông báo phụ huynh.' };
    }
  }

  public async createAnnouncement(payload: any): Promise<ParentApiResponse<any>> {
    try {
      const response = await fetch('/api/v1/parent-communication/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() },
        body: JSON.stringify(payload)
      });
      return await response.json();
    } catch (err: any) {
      return { success: false, errorCode: 'NETWORK_ERROR', message: err?.message || 'Lỗi mạng khi tạo thông báo phụ huynh.' };
    }
  }
}

export const parentCommunicationRepositoryClient = ParentCommunicationRepositoryClient.getInstance();
