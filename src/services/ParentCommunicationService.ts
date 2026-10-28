/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ParentConversation, ParentMessage, AttachedFile, UserRole, ParentAnnouncement, Comment } from '../types';
import { initialParentConversations } from '../data/demoData';
import { studentService } from './StudentService';
import { tenantService } from './TenantService';
import { inAppNotificationService } from './InAppNotificationService';
import { authRepository } from './AuthRepository';

const initialAnnouncements: ParentAnnouncement[] = [
  {
    id: 'pa-01',
    title: 'Thư ngỏ của GVCN & Kế hoạch phối hợp giáo dục Học kỳ I năm học 2025 - 2026',
    category: 'Thư ngỏ',
    content: 'Kính gửi quý Phụ huynh học sinh,\n\nNăm học 2025 - 2026 đã chính thức bước vào chặng đường mới. Để tạo điều kiện tốt nhất cho các em phát triển toàn diện cả về phẩm chất lẫn năng lực học tập, GVCN xin gửi tới quý Cha mẹ học sinh kế hoạch phối hợp giáo dục giữa gia đình và nhà trường trong học kỳ này.\n\nKính mong quý phụ huynh thường xuyên theo dõi tình hình nề nếp, kết quả học tập của con trên Không gian Chủ nhiệm số và trao đổi kịp thời với cô qua mục Trao đổi riêng.',
    authorId: 'gv-01',
    authorName: 'Cô Nguyễn Thị Mai Lan (GVCN)',
    authorRole: 'TEACHER',
    createdAt: '15/09/2025',
    isPinned: true,
    allowComments: true,
    channels: ['IN_APP', 'ZALO'],
    attachments: [
      {
        id: 'att-pa-1',
        name: 'Thu_Ngo_Va_Ke_Hoach_Phoi_Hop_2025_2026.pdf',
        url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80',
        type: 'pdf',
        size: '1.2 MB'
      }
    ],
    comments: [
      {
        id: 'c-pa-1',
        authorId: 'ph-01',
        authorName: 'Nguyễn Văn Minh (PH em Bảo)',
        authorAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80',
        authorRole: 'PARENT',
        content: 'Gia đình đã đọc và hoàn toàn nhất trí với phương hướng của cô giáo chủ nhiệm. Cảm ơn cô!',
        createdAt: '16/09/2025'
      }
    ]
  },
  {
    id: 'pa-02',
    title: 'Thông báo Lịch Họp Ban Đại diện Cha Mẹ Học Sinh & Họp CMHS toàn lớp đầu năm',
    category: 'Lịch họp phụ huynh',
    content: 'Kính gửi toàn thể quý Cha mẹ học sinh,\n\nNhà trường và lớp tổ chức buổi họp phụ huynh đầu năm học vào lúc 08h00 sáng Chủ Nhật (21/09/2025) tại phòng học 12A1 (Tầng 2 - Dãy nhà B).\n\nNội dung chính:\n1. Báo cáo phương hướng nhiệm vụ năm học 2025 - 2026.\n2. Thảo luận các khoản thu chi bảo hiểm y tế và quỹ hoạt động lớp.\n3. Bầu Ban đại diện Cha mẹ học sinh nhiệm kỳ mới.\n\nKính mong quý phụ huynh sắp xếp thời gian tham dự đầy đủ và đúng giờ.',
    authorId: 'gv-01',
    authorName: 'Cô Nguyễn Thị Mai Lan (GVCN)',
    authorRole: 'TEACHER',
    createdAt: '18/09/2025',
    eventDate: '2025-09-21',
    eventTime: '08:00',
    location: 'Phòng học 12A1 (Tầng 2 - Dãy nhà B)',
    isPinned: true,
    allowComments: true,
    channels: ['IN_APP', 'ZALO', 'SMS']
  },
  {
    id: 'pa-03',
    title: 'Kế hoạch tổ chức Hoạt động trải nghiệm hướng nghiệp & Tham quan thực tế',
    category: 'Kế hoạch phối hợp',
    content: 'Kính gửi quý Phụ huynh,\n\nNhằm giúp các em định hướng nghề nghiệp và trải nghiệm thực tế sau kỳ thi giữa kỳ I, lớp dự kiến tổ chức buổi tham quan trải nghiệm tại Khu Công nghệ cao và Trường Đại học Quốc gia vào ngày 15/11/2025. Chi tiết chương trình và phiếu lấy ý kiến phụ huynh được đính kèm bên dưới.',
    authorId: 'gv-01',
    authorName: 'Cô Nguyễn Thị Mai Lan (GVCN)',
    authorRole: 'TEACHER',
    createdAt: '05/10/2025',
    eventDate: '2025-11-15',
    eventTime: '07:30',
    location: 'Khu Công nghệ cao',
    isPinned: false,
    allowComments: true,
    channels: ['IN_APP']
  }
];

class ParentCommunicationService {
  private activeTenantId: string = 'tenant-lan-nguyen';
  private conversations: ParentConversation[] = [...initialParentConversations];
  private announcements: ParentAnnouncement[] = [...initialAnnouncements];
  private listeners: Array<() => void> = [];

  constructor() {
    this.activeTenantId = tenantService.getActiveTenantId();
    this.loadFromStorage(this.activeTenantId);
    this.fetchFromServer().catch(() => {});

    tenantService.subscribe(() => {
      const nextTenantId = tenantService.getActiveTenantId();
      if (nextTenantId !== this.activeTenantId) {
        this.activeTenantId = nextTenantId;
        this.loadFromStorage(nextTenantId);
        this.fetchFromServer().catch(() => {});
        this.notify();
      }
    });

    queueMicrotask(() => {
      if (typeof studentService !== 'undefined' && studentService?.subscribe) {
        studentService.subscribe(() => {
          this.notify();
        });
      }
    });
  }

  private getAuthHeaders(): Record<string, string> {
    const token = authRepository.getSessionToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  }

  public async fetchFromServer(): Promise<void> {
    const token = authRepository.getSessionToken();
    if (!token) return;

    try {
      const [convResp, annResp] = await Promise.all([
        fetch('/api/v1/parent-communication/conversations', { headers: this.getAuthHeaders() }),
        fetch('/api/v1/parent-communication/announcements', { headers: this.getAuthHeaders() })
      ]);

      let changed = false;

      if (convResp.ok) {
        const convJson = await convResp.json();
        if (convJson.success && Array.isArray(convJson.data) && convJson.data.length > 0) {
          const serverConvs: ParentConversation[] = convJson.data.map((row: any) => {
            const stu = studentService.getById(row.studentId);
            const msgs: ParentMessage[] = Array.isArray(row.messages) ? row.messages : [];
            const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
            return {
              studentId: row.studentId,
              studentName: stu?.fullName || row.studentName || 'Học sinh',
              studentAvatar: stu?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
              parentName: row.parentName || stu?.parentName || `Phụ huynh em ${stu?.fullName || ''}`,
              parentPhone: row.parentPhone || stu?.parentPhone || '0908 xxx xxx',
              unreadCount: Number(row.unreadTeacher || 0),
              lastMessage: lastMsg ? (lastMsg.isRecalled ? 'Tin nhắn đã được thu hồi' : lastMsg.content) : 'Chưa có trao đổi nào.',
              lastMessageTime: lastMsg?.timestamp || row.lastMessageAt || 'Mới tạo',
              messages: msgs
            };
          });

          const byStudent = new Map<string, ParentConversation>(this.conversations.map(c => [c.studentId, c]));
          for (const sc of serverConvs) {
            byStudent.set(sc.studentId, sc);
          }
          this.conversations = Array.from(byStudent.values());
          changed = true;
        }
      }

      if (annResp.ok) {
        const annJson = await annResp.json();
        if (annJson.success && Array.isArray(annJson.data) && annJson.data.length > 0) {
          this.announcements = annJson.data.map((row: any) => ({
            id: row.id,
            title: row.title,
            category: row.category || 'Thư ngỏ',
            content: row.content,
            authorId: row.sentBy || 'gv-01',
            authorName: row.authorName || 'GVCN',
            authorRole: 'TEACHER',
            createdAt: row.createdAt || row.sentAt || new Date().toLocaleDateString('vi-VN'),
            eventDate: row.eventDate,
            eventTime: row.eventTime,
            location: row.location,
            isPinned: Boolean(row.isPinned),
            allowComments: row.allowComments !== undefined ? Boolean(row.allowComments) : true,
            channels: Array.isArray(row.channels) ? row.channels : ['IN_APP'],
            attachments: Array.isArray(row.attachments) ? row.attachments : [],
            comments: Array.isArray(row.comments) ? row.comments : []
          }));
          changed = true;
        }
      }

      if (changed) {
        this.saveToStorage(this.activeTenantId);
      }
    } catch {
      // fallback to local cache silently
    }
  }

  private syncConversationToServer(conv: ParentConversation) {
    const token = authRepository.getSessionToken();
    if (!token) return;
    const lastMsg = conv.messages.length > 0 ? conv.messages[conv.messages.length - 1] : null;
    fetch('/api/v1/parent-communication/conversations', {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        id: `conv_${conv.studentId}`,
        studentId: conv.studentId,
        parentName: conv.parentName,
        parentPhone: conv.parentPhone,
        topic: 'Trao đổi GVCN - Phụ huynh',
        messages: conv.messages,
        lastMessageContent: lastMsg?.content || conv.lastMessage || '',
        unreadTeacher: conv.unreadCount || 0,
        unreadParent: 0
      })
    }).catch(() => {});
  }

  public reloadForActiveTenant(): void {
    this.activeTenantId = tenantService.getActiveTenantId();
    this.loadFromStorage(this.activeTenantId);
    this.fetchFromServer().catch(() => {});
    this.notify();
  }

  public refresh(): void {
    this.reloadForActiveTenant();
  }

  private loadFromStorage(tenantId: string) {
    const tId = tenantService.normalizeTenantId(tenantId);
    try {
      const convKey = tenantService.getTenantStorageKey('parent_conversations', tId);
      const savedConv = localStorage.getItem(convKey);
      if (savedConv) {
        this.conversations = JSON.parse(savedConv);
      } else {
        if (tId === 'tenant-lan-nguyen') {
          const legacyConv = localStorage.getItem('kgcns_parent_conversations');
          if (legacyConv) {
            this.conversations = JSON.parse(legacyConv);
            localStorage.setItem(convKey, legacyConv);
          } else {
            this.conversations = [...initialParentConversations];
          }
        } else {
          this.conversations = [];
        }
      }

      const annKey = tenantService.getTenantStorageKey('parent_announcements', tId);
      const savedAnn = localStorage.getItem(annKey);
      if (savedAnn) {
        this.announcements = JSON.parse(savedAnn);
      } else {
        if (tId === 'tenant-lan-nguyen') {
          const legacyAnn = localStorage.getItem('kgcns_parent_announcements');
          if (legacyAnn) {
            this.announcements = JSON.parse(legacyAnn);
            localStorage.setItem(annKey, legacyAnn);
          } else {
            this.announcements = [...initialAnnouncements];
          }
        } else {
          this.announcements = [];
        }
      }
    } catch {
      // ignore
    }
  }

  private saveToStorage(tenantId?: string) {
    const tId = tenantService.normalizeTenantId(tenantId || this.activeTenantId);
    try {
      localStorage.setItem(tenantService.getTenantStorageKey('parent_conversations', tId), JSON.stringify(this.conversations));
      localStorage.setItem(tenantService.getTenantStorageKey('parent_announcements', tId), JSON.stringify(this.announcements));
    } catch {
      // ignore
    }
    this.notify();
  }

  // ================= Announcements (Thông tin chung) =================
  public getAnnouncements(): ParentAnnouncement[] {
    return [...this.announcements];
  }

  public addAnnouncement(announcement: ParentAnnouncement) {
    this.announcements.unshift(announcement);
    this.saveToStorage();

    if (authRepository.getSessionToken()) {
      fetch('/api/v1/parent-communication/announcements', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(announcement)
      }).catch(() => {});
    }
  }

  public updateAnnouncement(id: string, updates: Partial<ParentAnnouncement>) {
    this.announcements = this.announcements.map(a => a.id === id ? { ...a, ...updates, updatedAt: new Date().toLocaleDateString('vi-VN') } : a);
    this.saveToStorage();

    const updated = this.announcements.find(a => a.id === id);
    if (updated && authRepository.getSessionToken()) {
      fetch(`/api/v1/parent-communication/announcements/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(updated)
      }).catch(() => {});
    }
  }

  public deleteAnnouncement(id: string) {
    this.announcements = this.announcements.filter(a => a.id !== id);
    this.saveToStorage();

    if (authRepository.getSessionToken()) {
      fetch(`/api/v1/parent-communication/announcements/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      }).catch(() => {});
    }
  }

  public togglePinAnnouncement(id: string) {
    this.announcements = this.announcements.map(a => a.id === id ? { ...a, isPinned: !a.isPinned } : a);
    this.saveToStorage();

    const updated = this.announcements.find(a => a.id === id);
    if (updated && authRepository.getSessionToken()) {
      fetch(`/api/v1/parent-communication/announcements/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ isPinned: updated.isPinned })
      }).catch(() => {});
    }
  }

  public addCommentToAnnouncement(announcementId: string, comment: Comment) {
    const ann = this.announcements.find(a => a.id === announcementId);
    if (ann) {
      if (!ann.comments) ann.comments = [];
      ann.comments.push(comment);
      this.saveToStorage();

      if (authRepository.getSessionToken()) {
        fetch(`/api/v1/parent-communication/announcements/${encodeURIComponent(announcementId)}`, {
          method: 'PATCH',
          headers: this.getAuthHeaders(),
          body: JSON.stringify({ comments: ann.comments })
        }).catch(() => {});
      }
    }
  }

  // ================= Conversations (Trao đổi riêng) =================
  public getConversationsForTeacher(): ParentConversation[] {
    // Ensure all active students have a conversation entry and only active students are returned
    const students = studentService.getAll();
    const activeStudentIds = new Set(students.map(s => s.id));
    const existingMap = new Map(this.conversations.map(c => [c.studentId, c]));

    students.forEach(s => {
      if (!existingMap.has(s.id)) {
        const newConv: ParentConversation = {
          studentId: s.id,
          studentName: s.fullName,
          studentAvatar: s.avatar,
          parentName: s.parentName || `Phụ huynh em ${s.fullName}`,
          parentPhone: s.parentPhone || '0908 xxx xxx',
          unreadCount: 0,
          lastMessage: 'Chưa có trao đổi nào.',
          lastMessageTime: 'Mới tạo',
          messages: []
        };
        this.conversations.push(newConv);
      } else {
        const conv = existingMap.get(s.id)!;
        conv.studentName = s.fullName;
        conv.studentAvatar = s.avatar;
        if (s.parentName) conv.parentName = s.parentName;
        if (s.parentPhone) conv.parentPhone = s.parentPhone;
      }
    });

    return this.conversations.filter(c => activeStudentIds.has(c.studentId));
  }

  public getConversationForStudent(studentId: string): ParentConversation {
    let conv = this.conversations.find(c => c.studentId === studentId);
    if (!conv) {
      const stu = studentService.getById(studentId);
      conv = {
        studentId,
        studentName: stu?.fullName || 'Học sinh',
        studentAvatar: stu?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
        parentName: stu?.parentName || `Phụ huynh em ${stu?.fullName || ''}`,
        parentPhone: stu?.parentPhone || '0908 xxx xxx',
        unreadCount: 0,
        lastMessage: 'Chưa có trao đổi nào.',
        lastMessageTime: 'Mới tạo',
        messages: []
      };
      this.conversations.push(conv);
      this.saveToStorage();
    }
    return conv;
  }

  public sendMessage(
    studentId: string,
    payload: {
      senderRole: 'TEACHER' | 'PARENT';
      senderName: string;
      content: string;
      attachments?: AttachedFile[];
      channel?: 'IN_APP' | 'ZALO' | 'SMS' | 'EMAIL';
    }
  ): ParentMessage {
    const conv = this.getConversationForStudent(studentId);
    const now = new Date();
    const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + now.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });

    const newMsg: ParentMessage = {
      id: `msg-${Date.now()}`,
      studentId,
      senderRole: payload.senderRole,
      senderName: payload.senderName,
      content: payload.content,
      timestamp: timeStr,
      attachments: payload.attachments || [],
      channel: payload.channel || 'IN_APP'
    };

    conv.messages.push(newMsg);
    conv.lastMessage = payload.content;
    conv.lastMessageTime = timeStr;
    if (payload.senderRole === 'PARENT') {
      conv.unreadCount += 1;
    }

    this.saveToStorage();
    this.syncConversationToServer(conv);

    // Trigger in-app notification
    const student = studentService.getStudentById(studentId);
    inAppNotificationService.notifyParentMessage(
      studentId,
      student ? student.fullName || (student as any).name : 'Học sinh',
      payload.senderRole,
      payload.senderName,
      payload.content
    );

    return newMsg;
  }

  public deleteMessageForMe(studentId: string, messageId: string, role: 'TEACHER' | 'PARENT'): boolean {
    const conv = this.conversations.find(c => c.studentId === studentId);
    if (!conv) return false;

    const msg = conv.messages.find(m => m.id === messageId);
    if (!msg) return false;

    if (role === 'TEACHER') {
      msg.deletedForTeacher = true;
    } else {
      msg.deletedForParent = true;
    }

    // Refresh last message if necessary
    const visibleMessages = conv.messages.filter(m => role === 'TEACHER' ? !m.deletedForTeacher : !m.deletedForParent);
    if (visibleMessages.length > 0) {
      const last = visibleMessages[visibleMessages.length - 1];
      conv.lastMessage = last.isRecalled ? 'Tin nhắn đã được thu hồi' : last.content;
      conv.lastMessageTime = last.timestamp;
    } else {
      conv.lastMessage = 'Chưa có trao đổi nào.';
      conv.lastMessageTime = 'Mới tạo';
    }

    this.saveToStorage();
    this.syncConversationToServer(conv);
    return true;
  }

  public recallMessage(studentId: string, messageId: string, role: 'TEACHER' | 'PARENT'): boolean {
    const conv = this.conversations.find(c => c.studentId === studentId);
    if (!conv) return false;

    const msg = conv.messages.find(m => m.id === messageId);
    if (!msg) return false;

    // Strict Authorization: Only the sender can recall their own message
    if (msg.senderRole !== role) {
      throw new Error('403 Forbidden: Chỉ người gửi mới có quyền thu hồi tin nhắn này.');
    }

    // Mark as recalled, replace text and completely revoke/wipe original attachments
    msg.isRecalled = true;
    msg.recalledAt = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('vi-VN');
    msg.recalledByRole = role;
    msg.content = 'Tin nhắn đã được thu hồi';
    msg.attachments = []; // Wipe attachments for security

    conv.lastMessage = 'Tin nhắn đã được thu hồi';
    conv.lastMessageTime = msg.recalledAt;

    this.saveToStorage();
    this.syncConversationToServer(conv);
    return true;
  }

  public markAsRead(studentId: string) {
    const conv = this.conversations.find(c => c.studentId === studentId);
    if (conv && conv.unreadCount > 0) {
      conv.unreadCount = 0;
      this.saveToStorage();
      this.syncConversationToServer(conv);
    }
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

export const parentCommunicationService = new ParentCommunicationService();
