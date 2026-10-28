/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AttachedFile } from '../types';

class FileStorageService {
  private files: AttachedFile[] = [
    {
      id: 'f-sample-pdf',
      name: 'Quy_Dinh_Khen_Thuong_2025.pdf',
      url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      type: 'pdf',
      size: '280 KB'
    },
    {
      id: 'f-sample-doc',
      name: 'De_Cuong_On_Tap_HK1.docx',
      url: '#',
      type: 'doc',
      size: '420 KB'
    },
    {
      id: 'f-sample-sheet',
      name: 'Bang_Diem_Chuyen_Can_Thang11.xlsx',
      url: '#',
      type: 'sheet',
      size: '150 KB'
    }
  ];

  public async uploadLocalFile(file: File): Promise<AttachedFile> {
    const fileId = `file-${Date.now()}`;
    
    let type: AttachedFile['type'] = 'other';
    if (file.type.startsWith('image/')) type = 'image';
    else if (file.type === 'application/pdf') type = 'pdf';
    else if (file.name.endsWith('.doc') || file.name.endsWith('.docx')) type = 'doc';
    else if (file.name.endsWith('.xls') || file.name.endsWith('.xlsx') || file.name.endsWith('.csv')) type = 'sheet';
    else if (file.type.startsWith('video/')) type = 'video';

    const sizeFormatted = file.size > 1024 * 1024
      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.round(file.size / 1024)} KB`;

    // Convert to base64 Data URL for persistent storage if size is reasonable (< 8MB)
    let url: string;
    if (file.size <= 8 * 1024 * 1024) {
      url = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.onerror = () => {
          resolve(URL.createObjectURL(file));
        };
        reader.readAsDataURL(file);
      });
    } else {
      url = URL.createObjectURL(file);
    }

    const newFile: AttachedFile = {
      id: fileId,
      name: file.name,
      url,
      type,
      size: sizeFormatted
    };

    this.files.unshift(newFile);
    return newFile;
  }

  public getFiles(): AttachedFile[] {
    return [...this.files];
  }
}

export const fileStorageService = new FileStorageService();
