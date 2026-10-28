/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Student } from '../types';
import { authRepository } from './AuthRepository';

export interface StudentApiResponse<T> {
  success: boolean;
  data?: T;
  total?: number;
  errorCode?: string;
  message?: string;
}

export class StudentRepositoryClient {
  private static instance: StudentRepositoryClient;

  private constructor() {}

  public static getInstance(): StudentRepositoryClient {
    if (!StudentRepositoryClient.instance) {
      StudentRepositoryClient.instance = new StudentRepositoryClient();
    }
    return StudentRepositoryClient.instance;
  }

  private getAuthHeader(): Record<string, string> {
    const token = authRepository.getSessionToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  public async getStudents(): Promise<StudentApiResponse<Student[]>> {
    try {
      const response = await fetch('/api/v1/students', {
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
        message: err?.message || 'Không thể kết nối đến máy chủ để lấy danh sách học sinh.'
      };
    }
  }

  public async getStudentById(studentId: string): Promise<StudentApiResponse<Student>> {
    try {
      const response = await fetch(`/api/v1/students/${encodeURIComponent(studentId)}`, {
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
        message: err?.message || 'Không thể kết nối đến máy chủ để lấy hồ sơ học sinh.'
      };
    }
  }

  public async createStudent(student: Partial<Student>): Promise<StudentApiResponse<Student>> {
    try {
      const response = await fetch('/api/v1/students', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader()
        },
        body: JSON.stringify(student)
      });

      const result = await response.json();
      return result;
    } catch (err: any) {
      return {
        success: false,
        errorCode: 'NETWORK_ERROR',
        message: err?.message || 'Không thể kết nối đến máy chủ để tạo học sinh.'
      };
    }
  }

  public async updateStudent(studentId: string, updates: Partial<Student>): Promise<StudentApiResponse<Student>> {
    try {
      const response = await fetch(`/api/v1/students/${encodeURIComponent(studentId)}`, {
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
        message: err?.message || 'Không thể kết nối đến máy chủ để cập nhật học sinh.'
      };
    }
  }

  public async assignOfficer(studentId: string, officerRole: string): Promise<StudentApiResponse<Student>> {
    try {
      const response = await fetch(`/api/v1/students/${encodeURIComponent(studentId)}/assign-officer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader()
        },
        body: JSON.stringify({ officerRole })
      });

      const result = await response.json();
      return result;
    } catch (err: any) {
      return {
        success: false,
        errorCode: 'NETWORK_ERROR',
        message: err?.message || 'Không thể kết nối đến máy chủ để bổ nhiệm cán sự.'
      };
    }
  }

  public async revokeOfficer(studentId: string): Promise<StudentApiResponse<Student>> {
    try {
      const response = await fetch(`/api/v1/students/${encodeURIComponent(studentId)}/revoke-officer`, {
        method: 'POST',
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
        message: err?.message || 'Không thể kết nối đến máy chủ để thu hồi cán sự.'
      };
    }
  }

  public async archiveStudent(studentId: string, status: string = 'ARCHIVED'): Promise<StudentApiResponse<Student>> {
    try {
      const response = await fetch(`/api/v1/students/${encodeURIComponent(studentId)}/archive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader()
        },
        body: JSON.stringify({ status })
      });

      const result = await response.json();
      return result;
    } catch (err: any) {
      return {
        success: false,
        errorCode: 'NETWORK_ERROR',
        message: err?.message || 'Không thể kết nối đến máy chủ để lưu trữ học sinh.'
      };
    }
  }

  public async batchImportStudents(students: Array<Partial<Student>>): Promise<{
    success: boolean;
    addedCount?: number;
    duplicateCount?: number;
    errorCount?: number;
    added?: Student[];
    duplicates?: Array<{ code: string; fullName: string; reason: string }>;
    errors?: Array<{ row: number; reason: string }>;
    message?: string;
    errorCode?: string;
  }> {
    try {
      const response = await fetch('/api/v1/students/batch-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader()
        },
        body: JSON.stringify({ students })
      });

      const result = await response.json();
      return result;
    } catch (err: any) {
      return {
        success: false,
        errorCode: 'NETWORK_ERROR',
        message: err?.message || 'Không thể kết nối đến máy chủ để nhập danh sách học sinh.'
      };
    }
  }
}

export const studentRepositoryClient = StudentRepositoryClient.getInstance();
