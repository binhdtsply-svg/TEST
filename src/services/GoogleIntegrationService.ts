/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleIntegrationSettings } from '../types';

class GoogleIntegrationService {
  private settings: GoogleIntegrationSettings = {
    forms: [
      {
        id: 'gf-1',
        name: 'Phiếu Thông tin Học sinh & Phụ huynh Đầu năm',
        url: 'https://forms.google.com/example/phieu-dau-nam-11a1',
        description: 'Thu thập thông tin liên lạc, nghề nghiệp PH, tình trạng sức khỏe và năng khiếu học sinh.',
        target: 'Cả hai',
        sheetUrl: 'https://docs.google.com/spreadsheets/d/example-phieu-dau-nam',
        lastSynced: '15/09/2025 09:30'
      },
      {
        id: 'gf-2',
        name: 'Khảo sát Nguyện vọng Hướng nghiệp & Khối thi ĐH (Holland)',
        url: 'https://forms.google.com/example/khao-sat-huong-nghiep',
        description: 'Khảo sát lựa chọn ngành nghề ưu tiên và các trường ĐH mục tiêu.',
        target: 'Học sinh',
        sheetUrl: 'https://docs.google.com/spreadsheets/d/example-huong-nghiep',
        lastSynced: '10/10/2025 14:15'
      }
    ],
    connectedSheetUrl: 'https://docs.google.com/spreadsheets/d/11a1-master-data-2025',
    isDriveConnected: false,
    isCalendarConnected: false
  };

  private listeners: Array<() => void> = [];

  constructor() {
    try {
      const saved = localStorage.getItem('kgcns_google_settings');
      if (saved) this.settings = JSON.parse(saved);
    } catch {
      // ignore
    }
  }

  private saveToStorage() {
    localStorage.setItem('kgcns_google_settings', JSON.stringify(this.settings));
    this.notify();
  }

  public getSettings(): GoogleIntegrationSettings {
    return { ...this.settings };
  }

  public addForm(form: Omit<GoogleIntegrationSettings['forms'][0], 'id' | 'lastSynced'>) {
    this.settings.forms.push({
      ...form,
      id: `gf-${Date.now()}`,
      lastSynced: 'Vừa thêm'
    });
    this.saveToStorage();
  }

  public removeForm(id: string) {
    this.settings.forms = this.settings.forms.filter(f => f.id !== id);
    this.saveToStorage();
  }

  public updateForm(id: string, updates: Partial<GoogleIntegrationSettings['forms'][0]>) {
    this.settings.forms = this.settings.forms.map(f => f.id === id ? { ...f, ...updates } : f);
    this.saveToStorage();
  }

  public syncFormResponses(formId: string): Promise<{ success: boolean; rowsSynced: number; message: string }> {
    return new Promise(resolve => {
      setTimeout(() => {
        const form = this.settings.forms.find(f => f.id === formId);
        if (form) {
          form.lastSynced = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('vi-VN');
          this.saveToStorage();
        }
        resolve({
          success: true,
          rowsSynced: 14,
          message: 'Đã kết nối và đồng bộ 14 bản ghi phản hồi mới nhất vào hệ thống!'
        });
      }, 1000);
    });
  }

  public setConnectedSheet(url: string) {
    this.settings.connectedSheetUrl = url;
    this.saveToStorage();
  }

  public toggleDrive(status: boolean) {
    this.settings.isDriveConnected = status;
    this.saveToStorage();
  }

  public toggleCalendar(status: boolean) {
    this.settings.isCalendarConnected = status;
    this.saveToStorage();
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }
}

export const googleIntegrationService = new GoogleIntegrationService();
