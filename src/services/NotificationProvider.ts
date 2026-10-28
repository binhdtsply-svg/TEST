/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface NotificationPayload {
  recipientId: string;
  recipientPhone?: string;
  title: string;
  content: string;
  channel: 'ZALO' | 'SMS' | 'EMAIL' | 'IN_APP';
  meta?: Record<string, string>;
}

export interface NotificationResponse {
  success: boolean;
  messageId: string;
  channel: string;
  timestamp: string;
  message: string;
}

class NotificationProvider {
  public async sendNotification(payload: NotificationPayload): Promise<NotificationResponse> {
    // Simulated multi-channel notification dispatch
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      success: true,
      messageId: `msg-${Date.now()}`,
      channel: payload.channel,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      message: `[${payload.channel}] Đã gửi thông báo thành công đến ${payload.recipientPhone || payload.recipientId}!`
    };
  }

  public async sendMultiChannelNotification(title: string, content: string, channels: Array<'IN_APP' | 'ZALO' | 'SMS' | 'EMAIL'> = ['IN_APP', 'ZALO']): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 400));
    return true;
  }

  public copyShareableContent(title: string, text: string): boolean {
    try {
      const fullText = `📢 [KHÔNG GIAN CHỦ NHIỆM SỐ]\n📌 ${title}\n\n${text}`;
      navigator.clipboard.writeText(fullText);
      return true;
    } catch {
      return false;
    }
  }
}

export const notificationProvider = new NotificationProvider();
