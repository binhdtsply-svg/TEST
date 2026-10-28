/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { authRepository } from './AuthRepository';

export interface CareerApiResponse<T> {
  success: boolean;
  data?: T;
  errorCode?: string;
  message?: string;
}

export class CareerRepositoryClient {
  private static instance: CareerRepositoryClient;

  private constructor() {}

  public static getInstance(): CareerRepositoryClient {
    if (!CareerRepositoryClient.instance) {
      CareerRepositoryClient.instance = new CareerRepositoryClient();
    }
    return CareerRepositoryClient.instance;
  }

  private getAuthHeader(): Record<string, string> {
    const token = authRepository.getSessionToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  public async getCareerProfiles(): Promise<CareerApiResponse<any[]>> {
    try {
      const response = await fetch('/api/v1/career', {
        headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() }
      });
      return await response.json();
    } catch (err: any) {
      return { success: false, errorCode: 'NETWORK_ERROR', message: err?.message || 'Lỗi mạng khi tải hồ sơ hướng nghiệp.' };
    }
  }

  public async saveCareerProfile(payload: any): Promise<CareerApiResponse<any>> {
    try {
      const response = await fetch('/api/v1/career', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() },
        body: JSON.stringify(payload)
      });
      return await response.json();
    } catch (err: any) {
      return { success: false, errorCode: 'NETWORK_ERROR', message: err?.message || 'Lỗi mạng khi lưu hồ sơ hướng nghiệp.' };
    }
  }
}

export const careerRepositoryClient = CareerRepositoryClient.getInstance();
