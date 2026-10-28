import nodemailer from 'nodemailer';

export interface EmailSendResult {
  success: boolean;
  message: string;
  errorCode?: string;
  messageId?: string;
}

export class EmailService {
  private static instance: EmailService;

  private constructor() {}

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  /**
   * Check if SMTP settings are fully provided in environment
   */
  public isConfigured(): boolean {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS;
    return Boolean(host && host.trim() && user && user.trim() && pass && pass.trim());
  }

  public getStatus(): {
    configured: boolean;
    host: string;
    port: number;
    userMasked: string;
    fromAddress: string;
  } {
    const host = process.env.SMTP_HOST || '';
    const port = Number(process.env.SMTP_PORT) || 587;
    const user = process.env.SMTP_USER || '';
    const from = process.env.MAIL_FROM || process.env.SMTP_FROM || (user ? `Không Gian Chủ Nhiệm Số <${user}>` : 'Không Gian Chủ Nhiệm Số');

    let userMasked = 'Chưa cấu hình';
    if (user && user.includes('@')) {
      const [u, d] = user.split('@');
      userMasked = `${u.slice(0, 3)}***@${d}`;
    }

    return {
      configured: this.isConfigured(),
      host: host ? `${host.slice(0, 3)}***` : 'Chưa cấu hình',
      port,
      userMasked,
      fromAddress: from
    };
  }

  /**
   * Send Admin Password Reset Email with single-use 6-digit verification token
   */
  public async sendAdminResetTokenEmail(
    toEmail: string,
    resetToken: string,
    adminFullName?: string
  ): Promise<EmailSendResult> {
    const cleanTo = (toEmail || '').trim().toLowerCase();
    if (!cleanTo || !cleanTo.includes('@')) {
      return {
        success: false,
        errorCode: 'INVALID_RECIPIENT',
        message: 'Địa chỉ email người nhận không hợp lệ.'
      };
    }

    if (!this.isConfigured()) {
      return {
        success: false,
        errorCode: 'SMTP_NOT_CONFIGURED',
        message: 'Máy chủ chưa được cấu hình dịch vụ gửi email (SMTP). Vui lòng sử dụng Mã Khôi Phục Bí Mật (Secret Recovery Code) để đặt lại mật khẩu ngay lập tức.'
      };
    }

    const host = process.env.SMTP_HOST!.trim();
    const port = Number(process.env.SMTP_PORT) || 587;
    const user = process.env.SMTP_USER!.trim();
    const pass = (process.env.SMTP_PASSWORD || process.env.SMTP_PASS)!.trim();
    const isSecure = port === 465 || process.env.SMTP_SECURE === 'true';
    const fromAddress = process.env.MAIL_FROM || process.env.SMTP_FROM || `"Không Gian Chủ Nhiệm Số" <${user}>`;

    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: isSecure,
        auth: {
          user,
          pass
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      const recipientName = adminFullName || 'Quản trị viên';
      const mailOptions = {
        from: fromAddress,
        to: cleanTo,
        subject: '[Không Gian Chủ Nhiệm Số] Mã xác thực đặt lại mật khẩu Quản trị viên',
        text: `Kính gửi ${recipientName},\n\nMã xác thực đặt lại mật khẩu của bạn là: ${resetToken}\n\nMã này có hiệu lực trong 15 phút và chỉ được sử dụng 1 lần.\nNếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.\n\nTrân trọng,\nBan Quản trị Không Gian Chủ Nhiệm Số`,
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h2 style="color: #0f172a; margin: 0; font-size: 20px; font-weight: 800;">KHÔNG GIAN CHỦ NHIỆM SỐ</h2>
              <p style="color: #64748b; font-size: 13px; margin-top: 4px;">Hệ thống Quản lý Giáo dục & Cố vấn Lớp học</p>
            </div>
            
            <div style="background-color: #ffffff; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
              <p style="font-size: 14px; color: #334155; margin-top: 0;">Xin chào <strong>${recipientName}</strong>,</p>
              <p style="font-size: 14px; color: #334155; line-height: 1.6;">
                Hệ thống nhận được yêu cầu đặt lại mật khẩu cho tài khoản <strong>Quản trị viên (Super Admin)</strong>.
              </p>
              
              <div style="background: linear-gradient(135deg, #fef3c7, #fde68a); border: 1px solid #f59e0b; border-radius: 12px; padding: 18px; text-align: center; margin: 20px 0;">
                <span style="font-size: 12px; font-weight: bold; color: #92400e; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 6px;">Mã xác thực đặt lại mật khẩu</span>
                <span style="font-family: monospace; font-size: 32px; font-weight: 900; color: #78350f; letter-spacing: 6px;">${resetToken}</span>
                <span style="font-size: 11px; color: #b45309; display: block; margin-top: 6px;">Hiệu lực trong vòng 15 phút (Sử dụng 1 lần duy nhất)</span>
              </div>

              <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
                Vui lòng nhập mã trên vào màn hình đặt lại mật khẩu để hoàn tất thiết lập mật khẩu mới.
              </p>
              <p style="font-size: 12px; color: #ef4444; margin-bottom: 0;">
                * Tuyệt đối không chia sẻ mã này cho bất kỳ ai để đảm bảo an toàn tài khoản hệ thống.
              </p>
            </div>

            <div style="text-align: center; font-size: 11px; color: #94a3b8;">
              <p style="margin: 0;">Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email.</p>
              <p style="margin: 4px 0 0 0;">© 2025–2026 Không Gian Chủ Nhiệm Số. All rights reserved.</p>
            </div>
          </div>
        `
      };

      const info = await transporter.sendMail(mailOptions);
      return {
        success: true,
        messageId: info.messageId,
        message: `Mã xác thực đặt lại mật khẩu đã được gửi thành công đến ${cleanTo}. Vui lòng kiểm tra hộp thư đến.`
      };
    } catch (err: any) {
      console.error('[EmailService] SMTP error sending reset email:', err?.message || err);
      return {
        success: false,
        errorCode: 'SMTP_SEND_FAILED',
        message: `Không thể gửi email qua dịch vụ SMTP (${err?.message || 'Lỗi kết nối máy chủ thư'}). Vui lòng sử dụng Mã Khôi Phục Bí Mật.`
      };
    }
  }
}

export const emailService = EmailService.getInstance();
