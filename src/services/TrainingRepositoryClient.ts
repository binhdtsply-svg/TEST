/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { authRepository } from './AuthRepository';

export interface TrainingApiResponse<T> {
  success: boolean;
  data?: T;
  errorCode?: string;
  message?: string;
}

export class TrainingRepositoryClient {
  private static instance: TrainingRepositoryClient;

  private constructor() {}

  public static getInstance(): TrainingRepositoryClient {
    if (!TrainingRepositoryClient.instance) {
      TrainingRepositoryClient.instance = new TrainingRepositoryClient();
    }
    return TrainingRepositoryClient.instance;
  }

  private getAuthHeader(): Record<string, string> {
    const token = authRepository.getSessionToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  public async getTransactions(): Promise<TrainingApiResponse<any[]>> {
    try {
      const response = await fetch('/api/v1/training/transactions', {
        headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() }
      });
      return await response.json();
    } catch (err: any) {
      return { success: false, errorCode: 'NETWORK_ERROR', message: err?.message || 'Lỗi mạng khi tải điểm rèn luyện.' };
    }
  }

  public async createTransaction(payload: any): Promise<TrainingApiResponse<any>> {
    try {
      const response = await fetch('/api/v1/training/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() },
        body: JSON.stringify(payload)
      });
      return await response.json();
    } catch (err: any) {
      return { success: false, errorCode: 'NETWORK_ERROR', message: err?.message || 'Lỗi mạng khi ghi nhận điểm rèn luyện.' };
    }
  }

  public async approveTransaction(id: string): Promise<TrainingApiResponse<any>> {
    try {
      const response = await fetch(`/api/v1/training/transactions/${encodeURIComponent(id)}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() }
      });
      return await response.json();
    } catch (err: any) {
      return { success: false, errorCode: 'NETWORK_ERROR', message: err?.message || 'Lỗi mạng khi duyệt đề xuất điểm.' };
    }
  }

  public async updateTransaction(id: string, payload: Record<string, any>): Promise<TrainingApiResponse<any>> {
    try {
      const response = await fetch(`/api/v1/training/transactions/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() },
        body: JSON.stringify(payload)
      });
      return await response.json();
    } catch (err: any) {
      return { success: false, errorCode: 'NETWORK_ERROR', message: err?.message || 'Lỗi mạng khi cập nhật giao dịch điểm.' };
    }
  }

  public async deleteTransaction(id: string): Promise<TrainingApiResponse<any>> {
    try {
      const response = await fetch(`/api/v1/training/transactions/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() }
      });
      return await response.json();
    } catch (err: any) {
      return { success: false, errorCode: 'NETWORK_ERROR', message: err?.message || 'Lỗi mạng khi xóa giao dịch điểm.' };
    }
  }

  public async getLaurelTree(studentId?: string): Promise<TrainingApiResponse<any>> {
    try {
      const query = studentId ? `?studentId=${encodeURIComponent(studentId)}` : '';
      const response = await fetch(`/api/v1/training/laurel-tree${query}`, {
        headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() }
      });
      return await response.json();
    } catch (err: any) {
      return { success: false, errorCode: 'NETWORK_ERROR', message: err?.message || 'Lỗi mạng khi tải thông tin Cây Nguyệt Quế.' };
    }
  }
}

export const trainingRepositoryClient = TrainingRepositoryClient.getInstance();
