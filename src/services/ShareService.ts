/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SharePayload, ShareResult, ZaloClassSettings, UserAccount, UserRole } from '../types';
import { auditService } from './AuditService';
import { classService } from './ClassService';
import { publicShareService } from './PublicShareService';

export interface ShareProvider {
  share(payload: SharePayload, user?: UserAccount): Promise<ShareResult>;
}

export function getOrCreateShareUrl(payload: SharePayload, user?: UserAccount): string {
  if (payload.url && payload.url.includes('#share/')) {
    return payload.url;
  }
  return publicShareService.registerShare(payload, user);
}

// 1. Native Web Share Provider (Trình duyệt di động / Tablet chia sẻ vào app Zalo / Messenger v.v.)
export class NativeShareProvider implements ShareProvider {
  public async share(payload: SharePayload, user?: UserAccount): Promise<ShareResult> {
    const shareUrl = getOrCreateShareUrl(payload, user);
    const safeContent = formatSafeShareMessage(payload, shareUrl);

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: payload.title,
          text: safeContent,
          url: shareUrl
        });

        if (user) {
          auditService.logEvent(
            'CONTENT_SHARED',
            user,
            payload.title,
            `Chia sẻ native (${payload.type || 'nội dung'})`,
            { targetId: payload.id }
          );
        }

        return {
          success: true,
          method: 'native',
          message: 'Đã mở bảng chia sẻ hệ thống thành công!'
        };
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          return { success: false, method: 'native', message: 'Đã hủy thao tác chia sẻ' };
        }
      }
    }

    // Fallback if not supported
    return copyLink(shareUrl, payload, user);
  }
}

// 2. Copy Link Provider
export class CopyLinkProvider implements ShareProvider {
  public async share(payload: SharePayload, user?: UserAccount): Promise<ShareResult> {
    const shareUrl = getOrCreateShareUrl(payload, user);
    return copyLink(shareUrl, payload, user);
  }
}

// 3. Zalo Share Provider (An toàn dữ liệu, ưu tiên Native / Group Link / Zalo Web)
export class ZaloShareProvider implements ShareProvider {
  public async share(payload: SharePayload, user?: UserAccount): Promise<ShareResult> {
    const shareUrl = getOrCreateShareUrl(payload, user);
    const safeContent = formatSafeShareMessage(payload, shareUrl);

    if (user) {
      auditService.logEvent(
        'ZALO_SHARE_REQUESTED',
        user,
        payload.title,
        `Yêu cầu chia sẻ Zalo (${payload.type || 'nội dung'})`,
        { targetId: payload.id }
      );
    }

    // Nếu đang ở mobile và có Web Share, mở native share để người dùng chọn Zalo
    if (typeof navigator !== 'undefined' && navigator.share && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      try {
        await navigator.share({
          title: payload.title,
          text: safeContent,
          url: shareUrl
        });
        return {
          success: true,
          method: 'zalo',
          message: 'Đã mở bảng chia sẻ để chọn Zalo!'
        };
      } catch {
        // user aborted or fallback
      }
    }

    // Fallback: Tự động sao chép văn bản an toàn 4 dòng kèm link để dán vào Zalo
    try {
      await navigator.clipboard.writeText(safeContent);
      return {
        success: true,
        method: 'zalo',
        message: 'Đã sao chép thông điệp chuẩn 4 dòng kèm link để dán vào Zalo!'
      };
    } catch {
      return {
        success: false,
        method: 'zalo',
        message: 'Không thể sao chép tự động. Vui lòng thử sao chép liên kết.'
      };
    }
  }
}

// Helper copy link
async function copyLink(url: string, payload: SharePayload, user?: UserAccount): Promise<ShareResult> {
  try {
    await navigator.clipboard.writeText(url);
    if (user) {
      auditService.logEvent(
        'CONTENT_SHARED',
        user,
        payload.title,
        `Sao chép liên kết chia sẻ`,
        { targetId: payload.id }
      );
    }
    return {
      success: true,
      method: 'copy_link',
      message: 'Đã sao chép liên kết chia sẻ vào bộ nhớ tạm!'
    };
  } catch {
    return {
      success: false,
      method: 'copy_link',
      message: 'Không thể sao chép liên kết vào clipboard.'
    };
  }
}

/**
 * Định dạng chia sẻ chuẩn 4 dòng theo quy định hệ thống:
 * Dòng 1: [Tên lớp] – [Năm học]
 * Dòng 2: [Tiêu đề]
 * Dòng 3: [Tóm tắt / Nội dung]
 * Dòng 4: [Link xem chi tiết]
 */
export function formatSafeShareMessage(payload: SharePayload, shareUrl: string): string {
  const classSettings = classService.getSettings();
  const className = classSettings.className ? `Lớp ${classSettings.className}` : 'Lớp học';
  const academicYear = classSettings.academicYear || '2025 - 2026';

  const line1 = `📌 [${className}] – [Năm học: ${academicYear}]`;
  const line2 = `📢 ${payload.title || 'Thông tin mới từ lớp học'}`;
  
  let summaryText = payload.summary || payload.content || '';
  if (payload.isSensitive) {
    summaryText = 'Nội dung chứa dữ liệu cá nhân học sinh. Vui lòng mở hệ thống để xem chi tiết an toàn.';
  } else if (summaryText.length > 220) {
    summaryText = summaryText.substring(0, 220) + '...';
  }
  const line3 = `📝 ${summaryText}`;
  const line4 = `👉 Xem chi tiết tại: ${shareUrl}`;

  return `${line1}\n${line2}\n${line3}\n${line4}`;
}

export function formatSafeZaloMessage(payload: SharePayload, shareUrl: string): string {
  return formatSafeShareMessage(payload, shareUrl);
}

// 4. Access Checker Service
export class ShareAccessService {
  public static checkAccess(
    payload: { parentVisible?: boolean; visibility?: string; classId?: string },
    user: UserAccount
  ): { allowed: boolean; reason?: string } {
    if (!user) {
      return { allowed: false, reason: 'Yêu cầu đăng nhập vào Không gian lớp học' };
    }

    if (user.role === 'TEACHER') return { allowed: true };

    if (user.role === 'PARENT') {
      if (payload.parentVisible === false) {
        return { allowed: false, reason: 'Nội dung này không được cấp quyền hiển thị cho Phụ huynh.' };
      }
      return { allowed: true };
    }

    if (user.role === 'STUDENT' || user.role === 'CLASS_OFFICER') {
      if (payload.visibility === 'private') {
        return { allowed: false, reason: 'Nội dung này được đặt chế độ riêng tư của GVCN.' };
      }
      return { allowed: true };
    }

    return { allowed: true };
  }
}

// 5. Zalo Class Settings Service
class ZaloClassService {
  private settings: ZaloClassSettings = {
    classId: '11A1',
    groupName: 'Zalo Lớp 11A1 - THPT Chuyên Lê Hồng Phong',
    groupLink: 'https://zalo.me/g/lehongphong11a1',
    zaloOAConfigured: false,
    notificationMode: 'native_sheet'
  };

  private listeners: Array<() => void> = [];

  constructor() {
    try {
      const saved = localStorage.getItem('kgcns_zalo_settings');
      if (saved) {
        this.settings = JSON.parse(saved);
      }
    } catch {
      // ignore
    }
  }

  public getSettings(): ZaloClassSettings {
    return { ...this.settings };
  }

  public updateSettings(newSettings: Partial<ZaloClassSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    try {
      localStorage.setItem('kgcns_zalo_settings', JSON.stringify(this.settings));
    } catch {
      // ignore
    }
    this.listeners.forEach(l => l());
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }
}

export const zaloClassService = new ZaloClassService();
export const nativeShareProvider = new NativeShareProvider();
export const copyLinkProvider = new CopyLinkProvider();
export const zaloShareProvider = new ZaloShareProvider();
