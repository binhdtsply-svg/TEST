/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { authRepository } from './AuthRepository';

export interface AcademicApiResponse<T> {
  success: boolean;
  data?: T;
  errorCode?: string;
  message?: string;
}

export class AcademicRepositoryClient {
  private static instance: AcademicRepositoryClient;

  private constructor() {}

  public static getInstance(): AcademicRepositoryClient {
    if (!AcademicRepositoryClient.instance) {
      AcademicRepositoryClient.instance = new AcademicRepositoryClient();
    }
    return AcademicRepositoryClient.instance;
  }

  private getBaseUrl(): string {
    if (typeof window !== 'undefined') return '';
    return (typeof process !== 'undefined' && process.env?.TEST_API_URL) || 'http://127.0.0.1:3000';
  }

  private getAuthHeader(): Record<string, string> {
    const token = authRepository.getSessionToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  public async getRecords(): Promise<AcademicApiResponse<any[]>> {
    try {
      const response = await fetch(`${this.getBaseUrl()}/api/v1/academic/records`, {
        headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() }
      });
      return await response.json();
    } catch (err: any) {
      return { success: false, errorCode: 'NETWORK_ERROR', message: err?.message || 'Lỗi mạng khi tải kết quả học tập.' };
    }
  }

  public async saveRecord(payload: any): Promise<AcademicApiResponse<any>> {
    try {
      const response = await fetch(`${this.getBaseUrl()}/api/v1/academic/records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() },
        body: JSON.stringify(payload)
      });
      return await response.json();
    } catch (err: any) {
      return { success: false, errorCode: 'NETWORK_ERROR', message: err?.message || 'Lỗi mạng khi lưu bảng điểm học sinh.' };
    }
  }

  public async saveRecordsBatch(records: any[]): Promise<AcademicApiResponse<any> & { total?: number; savedCount?: number; failedCount?: number; failedDetails?: any[] }> {
    try {
      const response = await fetch(`${this.getBaseUrl()}/api/v1/academic/records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() },
        body: JSON.stringify({ records })
      });
      return await response.json();
    } catch (err: any) {
      return { success: false, errorCode: 'NETWORK_ERROR', message: err?.message || 'Lỗi mạng khi lưu danh sách bảng điểm.' };
    }
  }

  public async publishSnapshot(payload: any): Promise<AcademicApiResponse<any>> {
    try {
      const response = await fetch(`${this.getBaseUrl()}/api/v1/academic/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() },
        body: JSON.stringify(payload)
      });
      return await response.json();
    } catch (err: any) {
      return { success: false, errorCode: 'NETWORK_ERROR', message: err?.message || 'Lỗi mạng khi xuất bản bảng điểm.' };
    }
  }
}

export const academicRepositoryClient = AcademicRepositoryClient.getInstance();
