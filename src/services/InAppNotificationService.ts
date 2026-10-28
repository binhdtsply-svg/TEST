/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { InAppNotification, UserAccount, UserRole, Post, Comment, Submission, ExamSchedule, AcademicPeriod, TimetableVersion } from '../types';
import { tenantService } from './TenantService';
import { classService } from './ClassService';
import { authService } from './AuthService';

const INITIAL_NOTIFICATIONS: InAppNotification[] = [
  // System / Admin scoped notifications
  {
    id: 'notif-admin-001',
    eventId: 'INIT:notif-admin-001',
    tenantId: 'tenant-lan-nguyen',
    workspaceId: 'tenant-lan-nguyen',
    title: '🛡️ Hệ thống Quản trị sẵn sàng',
    desc: 'Cơ sở dữ liệu, phân quyền tài khoản và hạ tầng Không Gian Chủ Nhiệm Số đang vận hành ổn định.',
    category: 'system',
    targetRoles: ['SUPER_ADMIN'],
    targetModule: 'admin',
    createdAt: 'Hôm nay lúc 07:00',
    createdAtTimestamp: Date.now() - 7200000,
    readBy: [],
    type: 'success'
  },
  {
    id: 'notif-admin-002',
    eventId: 'INIT:notif-admin-002',
    tenantId: 'tenant-lan-nguyen',
    workspaceId: 'tenant-lan-nguyen',
    title: '📩 Trung tâm Hỗ trợ & Tiếp nhận',
    desc: 'Hệ thống đã sẵn sàng tiếp nhận yêu cầu hỗ trợ, đánh giá và đề xuất chức năng từ GVCN, Học sinh và Phụ huynh.',
    category: 'system',
    targetRoles: ['SUPER_ADMIN'],
    targetModule: 'admin',
    createdAt: 'Hôm qua lúc 09:15',
    createdAtTimestamp: Date.now() - 86400000,
    readBy: [],
    type: 'info'
  },
  // Class-scoped notifications (For Teacher, Student, Parent, Officer only)
  {
    id: 'notif-001',
    eventId: 'INIT:notif-001',
    tenantId: 'tenant-lan-nguyen',
    workspaceId: 'tenant-lan-nguyen',
    classId: 'class-11a1-2025',
    title: '📊 Đã công bố kết quả học tập Giữa Học kỳ I',
    desc: 'GVCN đã cập nhật đầy đủ bảng điểm, nhận xét môn học và đánh giá rèn luyện theo đúng Thông tư của Bộ GD&ĐT.',
    category: 'academic',
    targetRoles: ['TEACHER', 'STUDENT', 'PARENT', 'CLASS_OFFICER'],
    targetModule: 'student_results',
    createdAt: 'Hôm nay lúc 08:30',
    createdAtTimestamp: Date.now() - 3600000,
    readBy: [],
    type: 'success'
  },
  {
    id: 'notif-002',
    eventId: 'INIT:notif-002',
    tenantId: 'tenant-lan-nguyen',
    workspaceId: 'tenant-lan-nguyen',
    classId: 'class-11a1-2025',
    title: '🎯 Hoạt động: Ngày Thứ Bảy Tình Nguyện & Hoa Điểm Tốt',
    desc: 'Đã phát động phong trào và mở đăng ký tham gia cho toàn thể học viên lớp 11A1.',
    category: 'activity',
    targetRoles: ['TEACHER', 'STUDENT', 'PARENT', 'CLASS_OFFICER'],
    targetModule: 'activities',
    createdAt: 'Hôm qua lúc 15:45',
    createdAtTimestamp: Date.now() - 86400000,
    readBy: [],
    type: 'info'
  },
  {
    id: 'notif-003',
    eventId: 'INIT:notif-003',
    tenantId: 'tenant-lan-nguyen',
    workspaceId: 'tenant-lan-nguyen',
    classId: 'class-11a1-2025',
    title: '🌼 Vườn Nguyệt Quế: Nguyễn Gia Huy sắp nở hoa',
    desc: 'Học sinh chỉ còn 5 điểm rèn luyện nữa để hoàn thành chu kỳ cây Nguyệt Quế thứ 3.',
    category: 'laurel',
    targetRoles: ['TEACHER', 'STUDENT', 'PARENT', 'CLASS_OFFICER'],
    targetModule: 'laurel',
    createdAt: '2 ngày trước',
    createdAtTimestamp: Date.now() - 172800000,
    readBy: [],
    type: 'warning'
  },
  {
    id: 'notif-004',
    eventId: 'INIT:notif-004',
    tenantId: 'tenant-lan-nguyen',
    workspaceId: 'tenant-lan-nguyen',
    classId: 'class-11a1-2025',
    title: '📝 Báo bài và dặn dò tiết học ngày mai',
    desc: 'Môn Toán và Hóa học có bài tập luyện tập nhóm cần hoàn thành trước tiết 1.',
    category: 'test',
    targetRoles: ['STUDENT', 'PARENT', 'CLASS_OFFICER'],
    targetModule: 'schedule',
    createdAt: '3 ngày trước',
    createdAtTimestamp: Date.now() - 259200000,
    readBy: [],
    type: 'info'
  }
];

class InAppNotificationService {
  private activeTenantId: string = 'tenant-lan-nguyen';
  private notifications: InAppNotification[] = [];
  private listeners: Array<() => void> = [];
  private broadcastChannel: BroadcastChannel | null = null;

  constructor() {
    this.activeTenantId = tenantService.getActiveTenantId();
    this.loadFromStorage(this.activeTenantId);

    // Subscribe to tenant workspace switches
    tenantService.subscribe(() => {
      const nextTenantId = tenantService.getActiveTenantId();
      if (nextTenantId !== this.activeTenantId) {
        this.activeTenantId = nextTenantId;
        this.loadFromStorage(nextTenantId);
        this.notify();
      }
    });

    // Realtime Cross-tab synchronization via BroadcastChannel
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('kgcns_notifications_sync');
        this.broadcastChannel.onmessage = (event) => {
          if (event.data && event.data.type === 'SYNC_NOTIFICATIONS') {
            this.loadFromStorage(this.activeTenantId);
            this.notify();
          }
        };
      } catch (err) {
        console.warn('BroadcastChannel not initialized:', err);
      }
    }

    // Realtime Cross-tab synchronization via Storage Event & Focus
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        const storageKey = tenantService.getTenantStorageKey('in_app_notifications_v1', this.activeTenantId);
        if (e.key === storageKey) {
          this.loadFromStorage(this.activeTenantId);
          this.notify();
        }
      });

      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.loadFromStorage(this.activeTenantId);
          this.notify();
        }
      });

      window.addEventListener('focus', () => {
        this.loadFromStorage(this.activeTenantId);
        this.notify();
      });
    }
  }

  private loadFromStorage(tenantId: string) {
    const tId = tenantService.normalizeTenantId(tenantId);
    try {
      const key = tenantService.getTenantStorageKey('in_app_notifications_v1', tId);
      const saved = localStorage.getItem(key);
      if (saved) {
        this.notifications = JSON.parse(saved);
      } else {
        this.notifications = tId === 'tenant-lan-nguyen' ? [...INITIAL_NOTIFICATIONS] : [];
        this.saveToStorage(tId, false);
      }
    } catch {
      this.notifications = tId === 'tenant-lan-nguyen' ? [...INITIAL_NOTIFICATIONS] : [];
    }
  }

  private saveToStorage(tenantId?: string, broadcast: boolean = true) {
    const tId = tenantService.normalizeTenantId(tenantId || this.activeTenantId);
    try {
      const key = tenantService.getTenantStorageKey('in_app_notifications_v1', tId);
      localStorage.setItem(key, JSON.stringify(this.notifications));
    } catch {
      // ignore
    }
    this.notify();

    if (broadcast && this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({ type: 'SYNC_NOTIFICATIONS', timestamp: Date.now() });
      } catch {
        // ignore
      }
    }
  }

  private notify() {
    this.listeners.forEach((l) => {
      try {
        l();
      } catch (err) {
        console.error('InAppNotificationService listener error:', err);
      }
    });
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Get all notifications visible to a specific authenticated user account
   */
  public getNotificationsForUser(
    userOrRole?: UserAccount | UserRole | string,
    studentId?: string
  ): InAppNotification[] {
    let role: UserRole = 'TEACHER';
    let currentUserId = 'u-gvcn';
    let targetStudentId = studentId;

    if (typeof userOrRole === 'object' && userOrRole) {
      role = userOrRole.role;
      currentUserId = userOrRole.id;
      targetStudentId = userOrRole.studentId || userOrRole.childStudentId || studentId;
    } else if (typeof userOrRole === 'string') {
      if (['SUPER_ADMIN', 'TEACHER', 'CLASS_OFFICER', 'STUDENT', 'PARENT'].includes(userOrRole)) {
        role = userOrRole as UserRole;
      }
      try {
        const authUser = authService.getCurrentUser();
        if (authUser) {
          currentUserId = authUser.id;
          if (!targetStudentId) {
            targetStudentId = authUser.studentId || authUser.childStudentId;
          }
        }
      } catch {
        // fallback
      }
    }

    return this.notifications
      .filter((n) => {
        // 1. Exclude author / actor from receiving their own actions (No Self-Notification)
        if (n.excludeUserIds && n.excludeUserIds.includes(currentUserId)) {
          return false;
        }
        if (n.authorId && n.authorId === currentUserId) {
          return false;
        }

        // 2. Parent Visibility Rule: If parentVisible is false, hide from PARENT
        if (n.parentVisible === false && role === 'PARENT') {
          return false;
        }

        // 3. Role & Isolation check
        if (role === 'SUPER_ADMIN') {
          // SUPER_ADMIN: ONLY view admin-level notifications (system alerts, support tickets, feedback/suggestions, security)
          // STRICTLY EXCLUDE homeroom/class-specific notifications (grades, attendance, laurels, tests, homework)
          const isExplicitAdminTarget = n.targetRoles?.includes('SUPER_ADMIN') || n.targetUserIds?.includes(currentUserId);
          const isAdminCategory = ['system', 'support', 'feedback', 'suggestion', 'admin', 'security'].includes(n.category as string);
          const isClassSpecific = Boolean(n.classId) || ['academic', 'activity', 'laurel', 'test', 'conduct', 'registration'].includes(n.category as string);
          
          if (!isExplicitAdminTarget && (!isAdminCategory || isClassSpecific)) {
            return false;
          }
        } else {
          // Standard roles (TEACHER, STUDENT, PARENT, CLASS_OFFICER)
          if (n.targetRoles && n.targetRoles.length > 0) {
            if (!n.targetRoles.includes(role)) {
              return false;
            }
          }
        }

        // 4. Specific user/student target check if specified
        if (n.targetUserIds && n.targetUserIds.length > 0) {
          const matchUserId = n.targetUserIds.includes(currentUserId);
          const matchStudentId = targetStudentId ? n.targetUserIds.includes(targetStudentId) : false;
          if (!matchUserId && !matchStudentId) {
            return false;
          }
        }

        return true;
      })
      .map((n) => ({
        ...n,
        read: (n.readBy || []).includes(currentUserId),
        time: n.time || n.createdAt,
        link: n.link || n.targetModule
      }));
  }

  /**
   * Get total unread count for user
   */
  public getUnreadCount(userOrRole?: UserAccount | UserRole | string, studentId?: string): number {
    const userNotifs = this.getNotificationsForUser(userOrRole, studentId);
    return userNotifs.filter((n) => !n.read).length;
  }

  /**
   * Mark a specific notification as read by user
   */
  public markAsRead(notificationId: string, userId?: string): void {
    let effectiveUserId = userId;
    if (!effectiveUserId) {
      try {
        effectiveUserId = authService.getCurrentUser().id;
      } catch {
        effectiveUserId = 'u-gvcn';
      }
    }

    let changed = false;
    this.notifications = this.notifications.map((n) => {
      const readByList = n.readBy || [];
      if (n.id === notificationId && !readByList.includes(effectiveUserId!)) {
        changed = true;
        return {
          ...n,
          readBy: [...readByList, effectiveUserId!]
        };
      }
      return n;
    });

    if (changed) {
      this.saveToStorage();
    }
  }

  /**
   * Mark all visible notifications as read for a user
   */
  public markAllAsRead(userOrRole?: UserAccount | UserRole | string, studentId?: string): void {
    let effectiveUserId = 'u-gvcn';
    let targetUser: UserAccount | undefined;

    if (typeof userOrRole === 'object' && userOrRole) {
      effectiveUserId = userOrRole.id;
      targetUser = userOrRole;
    } else {
      try {
        targetUser = authService.getCurrentUser();
        effectiveUserId = targetUser.id;
      } catch {
        // fallback
      }
    }

    const visibleNotifs = this.getNotificationsForUser(targetUser || userOrRole, studentId);
    const visibleIds = new Set(visibleNotifs.map((n) => n.id));

    let changed = false;
    this.notifications = this.notifications.map((n) => {
      const readByList = n.readBy || [];
      if (visibleIds.has(n.id) && !readByList.includes(effectiveUserId)) {
        changed = true;
        return {
          ...n,
          readBy: [...readByList, effectiveUserId]
        };
      }
      return n;
    });

    if (changed) {
      this.saveToStorage();
    }
  }

  /**
   * Emit a new real-time in-app notification with deduplication / idempotency
   */
  public addNotification(
    data: Omit<InAppNotification, 'id' | 'createdAt' | 'readBy' | 'tenantId' | 'workspaceId' | 'classId'> &
      Partial<Pick<InAppNotification, 'tenantId' | 'workspaceId' | 'classId'>>,
    author?: UserAccount
  ): InAppNotification {
    const classSettings = classService.getSettings();
    const now = new Date();
    const nowStr = now.toLocaleDateString('vi-VN') + ' lúc ' + now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    // Idempotency check via eventId
    if (data.eventId) {
      const existing = this.notifications.find((n) => n.eventId === data.eventId);
      if (existing) {
        return existing;
      }
    }

    const authorId = author?.id || data.authorId;
    const excludeList = data.excludeUserIds || (authorId ? [authorId] : []);

    const newNotif: InAppNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      eventId: data.eventId,
      tenantId: data.tenantId || this.activeTenantId,
      workspaceId: data.workspaceId || this.activeTenantId,
      classId: data.classId || classSettings.id || 'class-11a1-2025',
      title: data.title,
      desc: data.desc,
      category: data.category || 'system',
      targetRoles: data.targetRoles || ['TEACHER', 'STUDENT', 'PARENT', 'CLASS_OFFICER'],
      targetUserIds: data.targetUserIds,
      excludeUserIds: excludeList,
      authorId: authorId,
      authorRole: author?.role || data.authorRole,
      targetModule: data.targetModule || 'activities',
      targetTab: data.targetTab,
      meta: data.meta,
      createdAt: nowStr,
      createdAtTimestamp: Date.now(),
      readBy: authorId ? [authorId] : [],
      type: data.type || 'info',
      parentVisible: data.parentVisible !== undefined ? data.parentVisible : true
    };

    // Keep up to 60 recent notifications
    this.notifications = [newNotif, ...this.notifications.slice(0, 59)];
    this.saveToStorage();

    return newNotif;
  }

  /**
   * Delete a notification
   */
  public deleteNotification(id: string): void {
    this.notifications = this.notifications.filter((n) => n.id !== id);
    this.saveToStorage();
  }

  // ==========================================
  // DOMAIN EVENT EMITTERS (STANDARD BUSINESS ACTIONS)
  // ==========================================

  /**
   * 1. GVCN Đăng bài viết mới
   */
  public notifyPostPublished(post: Post, author: UserAccount): InAppNotification {
    const isParentVisible = post.parentVisible !== false;
    const targetRoles: UserRole[] = isParentVisible
      ? ['STUDENT', 'PARENT', 'CLASS_OFFICER']
      : ['STUDENT', 'CLASS_OFFICER'];

    return this.addNotification(
      {
        eventId: `POST_PUBLISHED:${post.id}`,
        title: `📢 ${post.category || 'Thông báo'}: ${post.title}`,
        desc: `${post.authorName} đã đăng bài viết mới: "${post.content.substring(0, 90)}..."`,
        category: 'post',
        targetRoles,
        targetModule: 'feed',
        targetTab: post.category,
        meta: { postId: post.id, category: post.category },
        parentVisible: isParentVisible,
        type: 'info'
      },
      author
    );
  }

  /**
   * 2. Bình luận bài viết mới
   */
  public notifyPostComment(post: Post, comment: Comment, commenter: UserAccount): InAppNotification {
    // Notify teacher/post author
    const targetRoles: UserRole[] = post.authorRole ? [post.authorRole] : ['TEACHER'];
    const targetUserIds = post.authorId ? [post.authorId] : undefined;

    return this.addNotification(
      {
        eventId: `COMMENT_CREATED:${comment.id}`,
        title: `💬 Bình luận mới từ ${comment.authorName}`,
        desc: `"${comment.content.substring(0, 80)}" trên bài viết "${post.title}"`,
        category: 'comment',
        targetRoles,
        targetUserIds,
        excludeUserIds: [commenter.id],
        authorId: commenter.id,
        targetModule: 'feed',
        meta: { postId: post.id, commentId: comment.id },
        type: 'info'
      },
      commenter
    );
  }

  /**
   * 3. Phản hồi bình luận (GVCN Reply Student hoặc ngược lại)
   */
  public notifyPostReply(post: Post, parentComment: Comment, reply: Comment, replier: UserAccount): InAppNotification {
    const targetUserIds = [parentComment.authorId];
    const targetRoles: UserRole[] = parentComment.authorRole ? [parentComment.authorRole] : ['STUDENT', 'TEACHER'];

    return this.addNotification(
      {
        eventId: `COMMENT_REPLY:${reply.id}`,
        title: `💬 ${replier.name} đã phản hồi bình luận của bạn`,
        desc: `"${reply.content.substring(0, 80)}" trong bài viết "${post.title}"`,
        category: 'comment',
        targetRoles,
        targetUserIds,
        excludeUserIds: [replier.id],
        authorId: replier.id,
        targetModule: 'feed',
        meta: { postId: post.id, commentId: reply.id },
        type: 'info'
      },
      replier
    );
  }

  /**
   * 4. Gửi Báo cáo nhanh / Đề xuất mới
   */
  public notifySubmissionCreated(sub: Submission, author: UserAccount): InAppNotification {
    const isViolation =
      sub.submissionType === 'violation' ||
      sub.proposedPoints < 0 ||
      ['vi phạm', 'trễ', 'muộn', 'vắng', 'kỷ luật', 'nghỉ không phép'].some((k) =>
        sub.category.toLowerCase().includes(k) || sub.description.toLowerCase().includes(k)
      );

    const title = isViolation
      ? `⚠️ Có đề xuất / báo cáo vi phạm mới: ${sub.studentName}`
      : `📝 Đề xuất / Báo cáo mới: ${sub.studentName}`;

    const authorRoleLabel =
      author.role === 'CLASS_OFFICER'
        ? 'Ban cán sự'
        : author.role === 'PARENT'
        ? 'Phụ huynh'
        : 'Học sinh';

    const desc = isViolation
      ? `${author.name} (${authorRoleLabel}) đã gửi báo cáo vi phạm: "${sub.category} - ${sub.description.substring(0, 80)}". Cần GVCN xem xét.`
      : `${author.name} (${authorRoleLabel}) đã gửi đề xuất: "${sub.category} - ${sub.description.substring(0, 80)}"`;

    return this.addNotification(
      {
        eventId: `SUBMISSION_CREATED:${sub.id}`,
        title,
        desc,
        category: 'submission',
        targetRoles: ['TEACHER'],
        targetModule: 'approvals',
        targetTab: 'pending',
        meta: { submissionId: sub.id, reportId: sub.id, studentId: sub.studentId, isViolation },
        type: isViolation ? 'warning' : 'info'
      },
      author
    );
  }

  /**
   * 4.1. Học sinh / Ban cán sự gửi Báo cáo nhanh (Quick Report Event: QUICK_REPORT_CREATED)
   */
  public notifyQuickReportCreated(
    report: {
      id: string;
      studentId: string;
      studentName: string;
      studentGroup?: number;
      category: string;
      reason: string;
      points: number;
      classId?: string;
      tenantId?: string;
      isViolation?: boolean;
    },
    author: UserAccount
  ): InAppNotification {
    const isViolation =
      report.isViolation ||
      report.points < 0 ||
      ['Đi trễ', 'Nghỉ không phép', 'Vi phạm nội quy', 'Kỷ luật', 'Trật tự', 'Gian lận', 'Bạo lực'].some((v) =>
        report.category.toLowerCase().includes(v.toLowerCase())
      ) ||
      report.reason.toLowerCase().includes('vi phạm') ||
      report.reason.toLowerCase().includes('đi muộn') ||
      report.reason.toLowerCase().includes('đi trễ');

    const classSettings = classService.getSettings();
    const className = report.classId || classSettings.className || '11A1';

    const title = isViolation
      ? `⚠️ Có báo cáo vi phạm mới: ${report.studentName}`
      : `⚡ Báo cáo nhanh mới: ${report.studentName}`;

    const authorRoleLabel =
      author.role === 'CLASS_OFFICER'
        ? 'Ban cán sự'
        : author.role === 'PARENT'
        ? 'Phụ huynh'
        : 'Học sinh';

    const desc = isViolation
      ? `${author.name} (${authorRoleLabel}) đã gửi báo cáo vi phạm của ${report.studentName} [${report.category}: "${report.reason.substring(0, 75)}..."]. Cần GVCN xem xét.`
      : `${author.name} (${authorRoleLabel}) đã gửi báo cáo nhanh/đề xuất cho ${report.studentName} [${report.category} (${report.points > 0 ? `+${report.points}đ` : `${report.points}đ`}): "${report.reason.substring(0, 75)}..."].`;

    return this.addNotification(
      {
        eventId: `QUICK_REPORT_CREATED:${report.id}`,
        tenantId: report.tenantId || this.activeTenantId,
        workspaceId: report.tenantId || this.activeTenantId,
        classId: className,
        title,
        desc,
        category: 'submission',
        targetRoles: ['TEACHER'],
        targetModule: 'approvals',
        targetTab: 'pending',
        meta: {
          reportId: report.id,
          submissionId: report.id,
          studentId: report.studentId,
          studentName: report.studentName,
          category: report.category,
          points: report.points,
          isViolation
        },
        authorId: author.id,
        authorRole: author.role,
        excludeUserIds: [author.id],
        type: isViolation ? 'warning' : 'info'
      },
      author
    );
  }

  /**
   * 5. GVCN Phê duyệt đề xuất
   */
  public notifySubmissionApproved(sub: Submission, teacher: UserAccount): InAppNotification {
    return this.addNotification(
      {
        eventId: `SUBMISSION_APPROVED:${sub.id}`,
        title: `✅ Đề xuất đã được GVCN phê duyệt: ${sub.studentName}`,
        desc: `GVCN ${teacher.name} đã duyệt đề xuất "${sub.category}" (${sub.proposedPoints > 0 ? `+${sub.proposedPoints}đ` : `${sub.proposedPoints}đ`}) của ${sub.studentName}.`,
        category: 'laurel',
        targetRoles: ['STUDENT', 'PARENT', 'CLASS_OFFICER'],
        targetUserIds: [sub.studentId, sub.proposedById],
        excludeUserIds: [teacher.id],
        authorId: teacher.id,
        targetModule: 'laurel',
        meta: { submissionId: sub.id, studentId: sub.studentId },
        type: 'success'
      },
      teacher
    );
  }

  /**
   * 6. GVCN Công bố bảng điểm học tập
   */
  public notifyGradesPublished(
    period: AcademicPeriod,
    periodLabel: string,
    studentId?: string,
    teacher?: UserAccount
  ): InAppNotification {
    if (studentId) {
      return this.addNotification(
        {
          eventId: `ACADEMIC_PUB:${period}:${studentId}`,
          title: `📊 Đã công bố kết quả học tập ${periodLabel}`,
          desc: `GVCN đã công bố bảng điểm và nhận xét môn học của em. Hãy kiểm tra kết quả ngay!`,
          category: 'academic',
          targetRoles: ['STUDENT', 'PARENT'],
          targetUserIds: [studentId],
          targetModule: 'student_results',
          meta: { period, studentId },
          type: 'success'
        },
        teacher
      );
    }

    return this.addNotification(
      {
        eventId: `ACADEMIC_PUB_ALL:${period}:${Date.now()}`,
        title: `📊 Đã công bố kết quả học tập ${periodLabel} toàn lớp`,
        desc: `GVCN đã hoàn tất cập nhật và công bố bảng tổng hợp kết quả học tập ${periodLabel}.`,
        category: 'academic',
        targetRoles: ['STUDENT', 'PARENT', 'CLASS_OFFICER'],
        targetModule: 'student_results',
        meta: { period },
        type: 'success'
      },
      teacher
    );
  }

  /**
   * 6a. GVCN Công bố điểm riêng cho Học sinh
   */
  public notifyGradesPublishedForStudents(
    period: AcademicPeriod,
    periodLabel: string,
    teacher?: UserAccount
  ): InAppNotification {
    const classSettings = classService.getSettings();
    return this.addNotification(
      {
        eventId: `ACADEMIC_PUB_STUDENTS:${period}:${Date.now()}`,
        title: `📊 Đã công bố kết quả học tập ${periodLabel} cho Học viên`,
        desc: `GVCN đã công bố bảng điểm và nhận xét môn học ${periodLabel} lớp ${classSettings.className}. Các em học sinh hãy kiểm tra kết quả ngay!`,
        category: 'academic',
        targetRoles: ['STUDENT', 'CLASS_OFFICER'],
        targetModule: 'student_results',
        meta: { period },
        type: 'success'
      },
      teacher
    );
  }

  /**
   * 6b. GVCN Công bố điểm riêng cho Phụ huynh
   */
  public notifyGradesPublishedForParents(
    period: AcademicPeriod,
    periodLabel: string,
    teacher?: UserAccount
  ): InAppNotification {
    const classSettings = classService.getSettings();
    return this.addNotification(
      {
        eventId: `ACADEMIC_PUB_PARENTS:${period}:${Date.now()}`,
        title: `📊 Đã công bố kết quả học tập ${periodLabel} cho Phụ huynh`,
        desc: `GVCN đã công bố kết quả học tập và rèn luyện ${periodLabel} lớp ${classSettings.className}. Kính mời Quý Phụ huynh xem chi tiết tại Sổ liên lạc điện tử.`,
        category: 'academic',
        targetRoles: ['PARENT'],
        targetModule: 'student_results',
        meta: { period },
        type: 'success'
      },
      teacher
    );
  }

  /**
   * 7. Lịch kiểm tra mới / cập nhật
   */
  public notifyExamScheduleSaved(exam: ExamSchedule, author?: UserAccount): InAppNotification {
    return this.addNotification(
      {
        eventId: `EXAM_SAVED:${exam.id}:${exam.date}`,
        title: `📝 Lịch kiểm tra: Môn ${exam.subject} (${exam.examType || 'Định kỳ'})`,
        desc: `Ngày ${exam.date} (Tiết ${exam.period}, ${exam.durationMinutes} phút). Phòng: ${exam.room || 'Lớp học'}. Hãy ôn tập tốt!`,
        category: 'test',
        targetRoles: ['STUDENT', 'PARENT', 'CLASS_OFFICER'],
        targetModule: 'schedule',
        targetTab: 'exams',
        meta: { examId: exam.id },
        type: 'info'
      },
      author
    );
  }

  /**
   * 7.1. GVCN Áp dụng Thời khóa biểu chính thức cho lớp
   */
  public notifyTimetableApplied(version: TimetableVersion, author?: UserAccount): InAppNotification {
    const classSettings = classService.getSettings();
    const className = classSettings.className || '11A1';
    const versionName = version.versionName || 'Thời khóa biểu mới';

    return this.addNotification(
      {
        eventId: `TIMETABLE_APPLIED:${version.id}:${Date.now()}`,
        title: `📅 Thời khóa biểu mới được áp dụng - Lớp ${className}`,
        desc: `GVCN đã cập nhật và chính thức áp dụng ${versionName} cho ${className}. Kính mời Quý phụ huynh và các em học sinh xem chi tiết.`,
        category: 'test',
        targetRoles: ['STUDENT', 'PARENT', 'CLASS_OFFICER'],
        targetModule: 'schedule',
        meta: { timetableId: version.id, semester: version.semester },
        type: 'success',
        parentVisible: true
      },
      author
    );
  }

  /**
   * 8. Học sinh hủy đăng ký hoạt động
   */
  public notifyActivityRegistrationCancelled(
    activityTitle: string,
    activityId: string,
    studentName: string,
    student: UserAccount | { id: string; name: string }
  ): InAppNotification {
    return this.addNotification(
      {
        eventId: `ACTIVITY_CANCEL:${activityId}:${student.id}:${Date.now()}`,
        title: `⚠️ Hủy đăng ký hoạt động: ${studentName}`,
        desc: `${studentName} đã hủy đăng ký tham gia hoạt động "${activityTitle}".`,
        category: 'registration',
        targetRoles: ['TEACHER', 'CLASS_OFFICER'],
        targetModule: 'activities',
        meta: { activityId, studentId: student.id },
        type: 'warning'
      },
      student as UserAccount
    );
  }

  /**
   * 9. Tin nhắn Cầu nối Phụ huynh
   */
  public notifyParentMessage(
    studentId: string,
    studentName: string,
    senderRole: 'TEACHER' | 'PARENT',
    senderName: string,
    content: string
  ): InAppNotification {
    if (senderRole === 'PARENT') {
      return this.addNotification({
        eventId: `MSG_PARENT:${studentId}:${Date.now()}`,
        title: `💬 Tin nhắn từ Phụ huynh (${senderName})`,
        desc: `Phụ huynh em ${studentName}: "${content.substring(0, 80)}"`,
        category: 'system',
        targetRoles: ['TEACHER'],
        targetModule: 'parents',
        targetTab: 'chat',
        meta: { studentId },
        type: 'info'
      });
    }

    return this.addNotification({
      eventId: `MSG_TEACHER:${studentId}:${Date.now()}`,
      title: `💬 Tin nhắn từ GVCN (${senderName})`,
      desc: `GVCN gửi phụ huynh em ${studentName}: "${content.substring(0, 80)}"`,
      category: 'system',
      targetRoles: ['PARENT'],
      targetUserIds: [studentId],
      targetModule: 'parents',
      targetTab: 'chat',
      meta: { studentId },
      type: 'info'
    });
  }

  /**
   * 10. Công bố / Phát hành bài khảo sát mới (GVCN hoặc ADMIN)
   */
  public notifySurveyPublished(
    template: {
      id: string;
      title: string;
      description?: string;
      surveyType?: string;
      targetAudience?: Array<'TEACHER' | 'STUDENT' | 'PARENT'>;
      scope?: string;
    },
    publisher: UserAccount
  ): InAppNotification {
    const isPublisherAdmin = publisher.role === 'SUPER_ADMIN';
    const audience = template.targetAudience && template.targetAudience.length > 0
      ? template.targetAudience
      : ['STUDENT', 'PARENT'];

    const targetRoles: UserRole[] = [];
    if (audience.includes('TEACHER')) targetRoles.push('TEACHER');
    if (audience.includes('STUDENT')) {
      targetRoles.push('STUDENT');
      targetRoles.push('CLASS_OFFICER');
    }
    if (audience.includes('PARENT')) targetRoles.push('PARENT');

    const senderTitle = isPublisherAdmin ? 'Ban Quản trị Hệ thống' : `GVCN ${publisher.name}`;

    return this.addNotification(
      {
        eventId: `SURVEY_PUB:${template.id}:${Date.now()}`,
        title: `📋 Bài khảo sát mới: ${template.title}`,
        desc: `${senderTitle} đã phát hành bài khảo sát "${template.title}". Vui lòng truy cập để hoàn thành phiếu khảo sát.`,
        category: 'system',
        targetRoles,
        targetModule: 'survey',
        meta: { surveyId: template.id, surveyType: template.surveyType, scope: template.scope },
        authorId: publisher.id,
        type: 'info'
      },
      publisher
    );
  }

  /**
   * 11. Yêu cầu hỗ trợ mới gửi tới ADMIN
   */
  public notifySupportTicketCreated(ticket: {
    id: string;
    ticketCode?: string;
    title: string;
    userName?: string;
    userRole?: string;
    category?: string;
  }): InAppNotification {
    return this.addNotification({
      eventId: `SUPPORT_TICKET:${ticket.id}:${Date.now()}`,
      title: `📩 Yêu cầu hỗ trợ mới [${ticket.ticketCode || ticket.id.slice(0, 6)}]`,
      desc: `${ticket.userName || 'Người dùng'} (${ticket.userRole || 'GVCN'}): "${ticket.title}"`,
      category: 'support',
      targetRoles: ['SUPER_ADMIN'],
      targetModule: 'admin',
      targetTab: 'support_feedback',
      meta: { ticketId: ticket.id },
      type: 'warning'
    });
  }

  /**
   * 12. Đánh giá & Góp ý mới gửi tới ADMIN
   */
  public notifyFeedbackSubmitted(feedback: {
    id: string;
    title?: string;
    content: string;
    userName?: string;
    rating?: number;
    type?: string;
  }): InAppNotification {
    const isSuggestion = feedback.type === 'FEATURE_SUGGESTION';
    const titlePrefix = isSuggestion ? '💡 Đề xuất chức năng mới' : '⭐ Đánh giá & Góp ý mới';
    return this.addNotification({
      eventId: `FEEDBACK:${feedback.id}:${Date.now()}`,
      title: `${titlePrefix}${feedback.rating ? ` (${feedback.rating}★)` : ''}`,
      desc: `${feedback.userName || 'Người dùng'}: "${(feedback.title || feedback.content).substring(0, 90)}"`,
      category: 'feedback',
      targetRoles: ['SUPER_ADMIN'],
      targetModule: 'admin',
      targetTab: 'support_feedback',
      meta: { feedbackId: feedback.id },
      type: 'info'
    });
  }
}

export const inAppNotificationService = new InAppNotificationService();
