/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ActivityCategory,
  ActivityPost,
  ActivityRegistration,
  ParticipationEvaluationLevel,
  Comment,
  UserAccount,
  UserRole,
  AttachedFile,
  AlbumMediaItem
} from '../types';
import { auditService } from './AuditService';
import { classService } from './ClassService';
import { tenantService } from './TenantService';
import { inAppNotificationService } from './InAppNotificationService';
import { trainingService } from './TrainingService';
import { authService } from './AuthService';
import { parseDateToTimestamp } from './SchoolYearDateNormalizer';
import { classSettingsRepositoryClient } from './ClassSettingsRepositoryClient';

const STORAGE_KEY = 'kgcns_activities_posts_v2';

const INITIAL_ACTIVITIES: ActivityPost[] = [
  {
    id: 'act-001',
    organizationId: 'org-lhp-01',
    classId: 'class-11a1-2025',
    authorId: 'gv-01',
    authorName: 'Cô Nguyễn Thị Mai Lan',
    authorAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
    authorRole: 'TEACHER',
    title: 'Phát động Phong trào Thi đua "Hoa Điểm Tốt & Ngày Thứ Bảy Tình Nguyện"',
    content: 'Kế hoạch triển khai phong trào thi đua chào mừng tháng thanh niên và ngày truyền thống nhà trường. Toàn thể 11A1 cùng chung tay dọn dẹp khuôn viên, chăm sóc vườn hoa thanh niên và tích cực giành thật nhiều hoa điểm tốt trên Cây Nguyệt Quế!',
    category: 'Phong trào',
    startDate: '2025-11-20',
    startTime: '07:30',
    endDate: '2025-11-20',
    endTime: '11:30',
    isAllDay: false,
    location: 'Sân trường THPT Chuyên Lê Hồng Phong & Phòng học 11A1',
    registrationEnabled: true,
    registrationDeadline: '2025-11-19 21:00',
    maxParticipants: 40,
    registrations: [
      {
        id: 'reg-001',
        activityId: 'act-001',
        classId: 'class-11a1-2025',
        studentId: 'hs-01',
        studentName: 'Nguyễn Văn An',
        studentCode: 'HS-11A1-01',
        studentAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
        groupOrTeam: 'Tổ 1',
        registeredAt: '2025-11-10 09:30',
        status: 'attended',
        notes: 'Đăng ký mang chổi quét sân và xẻng nhỏ',
        evaluationLevel: 'XUAT_SAC',
        praiseOrReward: '🌸 Tuyên dương Trưởng nhóm tình nguyện xuất sắc',
        trainingBonusPoints: 5,
        teacherPrivateNote: 'Tổ chức tốt, dẫn dắt các bạn làm việc rất gương mẫu',
        evaluatedAt: '2025-11-20 12:00',
        evaluatedBy: 'Cô Nguyễn Thị Mai Lan'
      },
      {
        id: 'reg-002',
        activityId: 'act-001',
        classId: 'class-11a1-2025',
        studentId: 'hs-02',
        studentName: 'Trần Thị Bích',
        studentCode: 'HS-11A1-02',
        studentAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
        groupOrTeam: 'Tổ 2',
        registeredAt: '2025-11-10 10:15',
        status: 'attended',
        notes: 'Phụ trách nhóm tưới cây và trang trí chậu hoa',
        evaluationLevel: 'TICH_CUC',
        praiseOrReward: '✨ Tuyên dương Tinh thần trách nhiệm cao',
        trainingBonusPoints: 3,
        teacherPrivateNote: 'Nhiệt tình, làm việc đúng giờ',
        evaluatedAt: '2025-11-20 12:00',
        evaluatedBy: 'Cô Nguyễn Thị Mai Lan'
      },
      {
        id: 'reg-003',
        activityId: 'act-001',
        classId: 'class-11a1-2025',
        studentId: 'hs-03',
        studentName: 'Lê Hoàng Nam',
        studentCode: 'HS-11A1-03',
        studentAvatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80',
        groupOrTeam: 'Tổ 3',
        registeredAt: '2025-11-11 14:00',
        status: 'attended',
        notes: 'Đăng ký nhóm hậu cần',
        evaluationLevel: 'HOAN_THANH',
        praiseOrReward: '✔️ Hoàn thành nhiệm vụ tổ giao',
        trainingBonusPoints: 2,
        teacherPrivateNote: 'Đã hoàn thành công việc được phân công',
        evaluatedAt: '2025-11-20 12:00',
        evaluatedBy: 'Cô Nguyễn Thị Mai Lan'
      }
    ],
    images: [
      'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1000&q=80'
    ],
    media: [
      {
        type: 'image',
        url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1000&q=80',
        caption: 'Học sinh 11A1 tham gia phong trào'
      }
    ],
    attachments: [
      {
        id: 'att-act-01',
        name: 'Ke_hoach_thang_thanh_nien_11A1.pdf',
        url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        type: 'pdf',
        size: '1.2 MB'
      }
    ],
    createdAt: '2025-11-10 08:00',
    updatedAt: '2025-11-10 08:00',
    reactions: {
      love: ['hs-01', 'hs-02', 'ph-01'],
      applause: ['hs-03', 'gv-01'],
      celebrate: ['hs-02', 'hs-04'],
      like: ['hs-01', 'ph-02']
    },
    comments: [
      {
        id: 'c-act-01',
        postId: 'act-001',
        authorId: 'hs-01',
        authorName: 'Nguyễn Văn An (Lớp trưởng)',
        authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
        authorRole: 'CLASS_OFFICER',
        content: 'Ban cán sự đã phân công 4 tổ chuẩn bị dụng cụ đầy đủ cho sáng thứ Bảy rồi ạ!',
        createdAt: '2025-11-10 09:15',
        status: 'active'
      }
    ],
    pinnedToOverview: true
  },
  {
    id: 'act-002',
    organizationId: 'org-lhp-01',
    classId: 'class-11a1-2025',
    authorId: 'hs-01',
    authorName: 'Nguyễn Văn An (Lớp trưởng)',
    authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    authorRole: 'CLASS_OFFICER',
    title: 'Giải Bóng Đá Nam - Nữ Khối 11 Vòng Bảng: 11A1 vs 11A3',
    content: 'Trận đấu mở màn rực lửa của đội tuyển bóng đá lớp 11A1. Kính mời thầy cô, các bạn học sinh và quý phụ huynh cùng đến sân vận động cổ vũ tinh thần cho các cầu thủ!',
    category: 'Thể thao',
    startDate: '2025-11-25',
    startTime: '16:00',
    endDate: '2025-11-25',
    endTime: '17:30',
    isAllDay: false,
    location: 'Sân bóng đá liên trường LHP',
    registrationEnabled: true,
    registrationDeadline: '2025-11-24 12:00',
    maxParticipants: 16,
    registrations: [
      {
        id: 'reg-004',
        activityId: 'act-002',
        classId: 'class-11a1-2025',
        studentId: 'hs-01',
        studentName: 'Nguyễn Văn An',
        studentCode: 'HS-11A1-01',
        studentAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
        groupOrTeam: 'Tổ 1',
        registeredAt: '2025-11-12 15:00',
        status: 'attended',
        notes: 'Tiền đạo - Đội trưởng',
        evaluationLevel: 'XUAT_SAC',
        praiseOrReward: '🏆 Cầu thủ xuất sắc nhất trận đấu',
        trainingBonusPoints: 5,
        teacherPrivateNote: 'Thi đấu cống hiến, tinh thần thể thao đẹp',
        evaluatedAt: '2025-11-25 18:00',
        evaluatedBy: 'Cô Nguyễn Thị Mai Lan'
      },
      {
        id: 'reg-005',
        activityId: 'act-002',
        classId: 'class-11a1-2025',
        studentId: 'hs-03',
        studentName: 'Lê Hoàng Nam',
        studentCode: 'HS-11A1-03',
        studentAvatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80',
        groupOrTeam: 'Tổ 3',
        registeredAt: '2025-11-12 16:30',
        status: 'attended',
        notes: 'Thủ môn',
        evaluationLevel: 'TICH_CUC',
        praiseOrReward: '⚽ Thủ môn giữ sạch lưới',
        trainingBonusPoints: 3,
        teacherPrivateNote: 'Cứu thua xuất sắc nhiều pha bóng',
        evaluatedAt: '2025-11-25 18:00',
        evaluatedBy: 'Cô Nguyễn Thị Mai Lan'
      }
    ],
    images: [
      'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1000&q=80'
    ],
    media: [],
    attachments: [],
    createdAt: '2025-11-12 14:20',
    updatedAt: '2025-11-12 14:20',
    reactions: {
      love: ['hs-02', 'gv-01'],
      applause: ['hs-01', 'hs-03', 'ph-01'],
      celebrate: ['hs-01', 'hs-02', 'hs-03'],
      like: ['hs-04']
    },
    comments: [],
    pinnedToOverview: false
  },
  {
    id: 'act-003',
    organizationId: 'org-lhp-01',
    classId: 'class-11a1-2025',
    authorId: 'gv-01',
    authorName: 'Cô Nguyễn Thị Mai Lan',
    authorAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
    authorRole: 'TEACHER',
    title: 'Hội thi Tiếng Hát Học Đường & Giao Lưu Văn Nghệ Tri Ân',
    content: 'Đăng ký tiết mục dự thi đơn ca, song ca và tốp ca của lớp 11A1. Lớp chúng ta đã chọn bài hát "Bụi Phấn" và tiết mục nhảy flashmob tập thể. Buổi sơ duyệt sẽ diễn ra tại Hội trường A.',
    category: 'Văn nghệ',
    startDate: '2025-11-18',
    startTime: '14:00',
    endDate: '2025-11-18',
    endTime: '17:00',
    isAllDay: false,
    location: 'Hội trường A - Nhà Đa Năng',
    registrationEnabled: true,
    registrationDeadline: '2025-11-17 17:00',
    maxParticipants: 20,
    registrations: [
      {
        id: 'reg-006',
        activityId: 'act-003',
        classId: 'class-11a1-2025',
        studentId: 'hs-02',
        studentName: 'Trần Thị Bích',
        studentCode: 'HS-11A1-02',
        studentAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
        groupOrTeam: 'Tổ 2',
        registeredAt: '2025-11-06 09:00',
        status: 'attended',
        notes: 'Hát chính tiết mục Bụi Phấn',
        evaluationLevel: 'XUAT_SAC',
        praiseOrReward: '🎤 Giọng hát truyền cảm hứng toàn khối',
        trainingBonusPoints: 5,
        teacherPrivateNote: 'Tập luyện chăm chỉ, đóng góp lớn cho lớp',
        evaluatedAt: '2025-11-18 17:30',
        evaluatedBy: 'Cô Nguyễn Thị Mai Lan'
      }
    ],
    images: [],
    media: [],
    attachments: [],
    createdAt: '2025-11-05 10:00',
    updatedAt: '2025-11-05 10:00',
    reactions: {
      love: ['hs-01', 'hs-02', 'hs-03', 'gv-01', 'ph-01'],
      applause: ['hs-01', 'ph-02'],
      celebrate: ['hs-02', 'hs-03'],
      like: ['hs-04']
    },
    comments: [],
    pinnedToOverview: false
  }
];

class ActivityService {
  private activeTenantId: string = 'tenant-lan-nguyen';
  private activities: ActivityPost[] = [];
  private listeners: Array<() => void> = [];
  private isFetching = false;

  constructor() {
    this.activeTenantId = tenantService.getActiveTenantId();
    this.loadFromStorage(this.activeTenantId);
    this.syncFromServer(this.activeTenantId);

    tenantService.subscribe(() => {
      const nextTenantId = tenantService.getActiveTenantId();
      if (nextTenantId !== this.activeTenantId) {
        this.activeTenantId = nextTenantId;
        this.loadFromStorage(nextTenantId);
        this.notify();
        this.syncFromServer(nextTenantId);
      }
    });
  }

  public async syncFromServer(tenantId?: string): Promise<void> {
    if (this.isFetching) return;
    this.isFetching = true;
    const tId = tenantService.normalizeTenantId(tenantId || this.activeTenantId);
    try {
      const serverItems = await classSettingsRepositoryClient.getActivities(tId);
      if (Array.isArray(serverItems)) {
        if (serverItems.length > 0) {
          this.activities = serverItems.map((a: any) => ({
            ...a,
            registrations: Array.isArray(a.registrations) ? a.registrations : []
          }));
          this.saveToStorage(tId);
        } else if (tId !== 'tenant-lan-nguyen') {
          this.activities = [];
          this.saveToStorage(tId);
        }
      }
    } catch (err) {
      console.warn('[ActivityService] Sync notice:', err);
    } finally {
      this.isFetching = false;
    }
  }

  public reloadForActiveTenant(): void {
    this.activeTenantId = tenantService.getActiveTenantId();
    this.loadFromStorage(this.activeTenantId);
    this.notify();
    this.syncFromServer(this.activeTenantId);
  }

  private loadFromStorage(tenantId: string) {
    const tId = tenantService.normalizeTenantId(tenantId);
    try {
      const key = tenantService.getTenantStorageKey('activities_posts_v2', tId);
      const saved = localStorage.getItem(key);
      if (saved) {
        this.activities = JSON.parse(saved);
        this.activities = this.activities.map((a) => ({
          ...a,
          registrations: a.registrations || []
        }));
      } else {
        if (tId === 'tenant-lan-nguyen') {
          const legacy = localStorage.getItem(STORAGE_KEY);
          if (legacy) {
            this.activities = JSON.parse(legacy);
            localStorage.setItem(key, legacy);
          } else {
            this.activities = [...INITIAL_ACTIVITIES];
          }
        } else {
          this.activities = [];
        }
      }
    } catch {
      this.activities = tId === 'tenant-lan-nguyen' ? [...INITIAL_ACTIVITIES] : [];
    }
  }

  private saveToStorage(tenantId?: string) {
    const tId = tenantService.normalizeTenantId(tenantId || this.activeTenantId);
    try {
      localStorage.setItem(tenantService.getTenantStorageKey('activities_posts_v2', tId), JSON.stringify(this.activities));
    } catch {
      // ignore
    }
    this.notify();
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    this.syncFromServer(this.activeTenantId);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  public getAll(): ActivityPost[] {
    return [...this.activities].sort((a, b) => {
      const diff = parseDateToTimestamp(b.createdAt) - parseDateToTimestamp(a.createdAt);
      if (diff !== 0) return diff;
      return (b.id || '').localeCompare(a.id || '');
    });
  }

  public getById(id: string): ActivityPost | undefined {
    return this.activities.find((a) => a.id === id);
  }

  public createActivity(
    data: Omit<ActivityPost, 'id' | 'createdAt' | 'reactions' | 'comments'>,
    author: UserAccount
  ): ActivityPost {
    const classSettings = classService.getSettings();
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);

    const newActivity: ActivityPost = {
      ...data,
      id: `act-${Date.now()}`,
      classId: classSettings.id || 'class-11a1-2025',
      organizationId: 'org-lhp-01',
      authorId: author.id,
      authorName: author.name,
      authorAvatar: author.avatar,
      authorRole: author.role,
      createdAt: nowStr,
      updatedAt: nowStr,
      registrationEnabled: data.registrationEnabled ?? true,
      registrationDeadline: data.registrationDeadline || '',
      maxParticipants: data.maxParticipants || 0,
      registrations: [],
      reactions: {
        love: [],
        applause: [],
        celebrate: [],
        like: []
      },
      comments: []
    };

    this.activities = [newActivity, ...this.activities];
    this.saveToStorage();

    classSettingsRepositoryClient.createActivity(newActivity).catch(err =>
      console.warn('[ActivityService] Create sync notice:', err)
    );

    // Trigger in-app notification
    inAppNotificationService.addNotification(
      {
        title: `🎯 Hoạt động mới: ${newActivity.title}`,
        desc: `[${newActivity.category}] ${newActivity.content.substring(0, 100)}... Hãy xem chi tiết và đăng ký tham gia!`,
        category: 'activity',
        targetRoles: ['TEACHER', 'STUDENT', 'PARENT', 'CLASS_OFFICER'],
        targetModule: 'activities',
        type: 'info'
      },
      author
    );

    auditService.logEvent(
      'CONTENT_CREATED',
      author,
      newActivity.title,
      `Đăng hoạt động phong trào mới: [${newActivity.category}] ${newActivity.title}`,
      { activityId: newActivity.id }
    );

    return newActivity;
  }

  public updateActivity(id: string, updates: Partial<ActivityPost>, user: UserAccount): boolean {
    const idx = this.activities.findIndex((a) => a.id === id);
    if (idx === -1) return false;

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
    this.activities[idx] = {
      ...this.activities[idx],
      ...updates,
      updatedAt: nowStr
    };
    this.saveToStorage();

    classSettingsRepositoryClient.updateActivity(id, this.activities[idx]).catch(err =>
      console.warn('[ActivityService] Update sync notice:', err)
    );

    auditService.logEvent(
      'CONTENT_UPDATED',
      user,
      this.activities[idx].title,
      `Cập nhật hoạt động phong trào: ${this.activities[idx].title}`,
      { activityId: id }
    );

    return true;
  }

  public deleteActivity(id: string, user: UserAccount): boolean {
    const act = this.activities.find((a) => a.id === id);
    if (!act) return false;

    this.activities = this.activities.filter((a) => a.id !== id);
    this.saveToStorage();

    classSettingsRepositoryClient.deleteActivity(id).catch(err =>
      console.warn('[ActivityService] Delete sync notice:', err)
    );

    auditService.logEvent(
      'CONTENT_DELETED',
      user,
      act.title,
      `Xóa hoạt động phong trào: ${act.title}`,
      { activityId: id }
    );

    return true;
  }

  // Activity Registrations
  public registerStudentForActivity(
    activityId: string,
    student: {
      id: string;
      fullName?: string;
      name?: string;
      avatar?: string;
      groupOrTeam?: string;
      studentCode?: string;
      code?: string;
    },
    notes?: string
  ): { success: boolean; message: string } {
    const act = this.activities.find((a) => a.id === activityId);
    if (!act) {
      return { success: false, message: 'Hoạt động không tồn tại.' };
    }

    if (act.registrationEnabled === false) {
      return { success: false, message: 'Hoạt động này hiện không mở đăng ký.' };
    }

    // Check deadline
    if (act.registrationDeadline) {
      const deadlineTime = new Date(act.registrationDeadline).getTime();
      if (!isNaN(deadlineTime) && Date.now() > deadlineTime) {
        return { success: false, message: 'Đã hết hạn đăng ký tham gia hoạt động này.' };
      }
    }

    act.registrations = act.registrations || [];

    // Check max participants
    const activeRegs = act.registrations.filter((r) => r.status !== 'cancelled');
    if (act.maxParticipants && act.maxParticipants > 0 && activeRegs.length >= act.maxParticipants) {
      const existing = act.registrations.find((r) => r.studentId === student.id);
      if (!existing || existing.status === 'cancelled') {
        return { success: false, message: `Hoạt động đã đủ số lượng tối đa (${act.maxParticipants} học viên).` };
      }
    }

    const existingIdx = act.registrations.findIndex((r) => r.studentId === student.id);
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);

    if (existingIdx >= 0) {
      // Re-activate if was cancelled
      act.registrations[existingIdx].status = 'registered';
      act.registrations[existingIdx].registeredAt = nowStr;
      if (notes) act.registrations[existingIdx].notes = notes;
    } else {
      const newReg: ActivityRegistration = {
        id: `reg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        activityId,
        classId: act.classId || 'class-11a1-2025',
        studentId: student.id,
        studentName: student.fullName || student.name || 'Học viên',
        studentCode: student.studentCode || student.code || '',
        studentAvatar: student.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
        groupOrTeam: student.groupOrTeam || 'Tổ 1',
        registeredAt: nowStr,
        status: 'registered',
        notes: notes || '',
        evaluationLevel: 'CHUA_DANH_GIA'
      };
      act.registrations.push(newReg);
    }

    this.saveToStorage();
    classSettingsRepositoryClient.updateActivity(act.id, { registrations: act.registrations }).catch(err =>
      console.warn('[ActivityService] Register sync notice:', err)
    );

    // Notify teacher and class officers
    const studentUser = authService.getCurrentUser();
    inAppNotificationService.addNotification({
      eventId: `ACTIVITY_REG:${activityId}:${student.id}:${Date.now()}`,
      title: `📝 Học sinh đăng ký hoạt động: ${student.fullName || student.name}`,
      desc: `${student.fullName || student.name} đã đăng ký tham gia "${act.title}"`,
      category: 'registration',
      targetRoles: ['TEACHER', 'CLASS_OFFICER'],
      excludeUserIds: [student.id, studentUser?.id].filter(Boolean) as string[],
      authorId: studentUser?.id || student.id,
      targetModule: 'activities',
      meta: { activityId: act.id, studentId: student.id },
      type: 'info'
    }, studentUser);

    return { success: true, message: 'Đăng ký tham gia thành công!' };
  }

  public cancelActivityRegistration(activityId: string, studentId: string): boolean {
    const act = this.activities.find((a) => a.id === activityId);
    if (!act || !act.registrations) return false;

    const reg = act.registrations.find((r) => r.studentId === studentId);
    if (!reg) return false;

    reg.status = 'cancelled';
    this.saveToStorage();
    classSettingsRepositoryClient.updateActivity(act.id, { registrations: act.registrations }).catch(err =>
      console.warn('[ActivityService] Cancel reg sync notice:', err)
    );

    // Trigger notification
    const studentUser = authService.getCurrentUser();
    inAppNotificationService.notifyActivityRegistrationCancelled(
      act.title,
      act.id,
      reg.studentName,
      studentUser
    );

    return true;
  }

  public updateRegistrationStatus(
    activityId: string,
    registrationId: string,
    status: ActivityRegistration['status']
  ): boolean {
    const act = this.activities.find((a) => a.id === activityId);
    if (!act || !act.registrations) return false;

    const reg = act.registrations.find((r) => r.id === registrationId);
    if (!reg) return false;

    reg.status = status;
    this.saveToStorage();
    classSettingsRepositoryClient.updateActivity(act.id, { registrations: act.registrations }).catch(err =>
      console.warn('[ActivityService] Reg status sync notice:', err)
    );
    return true;
  }

  /**
   * Toggle Praise for an activity registration (GVCN Only)
   * Automatically adds/reverses +5 training bonus points in ledger for Laurel Tree calculation
   */
  public toggleActivityPraise(
    activityId: string,
    registrationId: string,
    user: UserAccount
  ): { success: boolean; isPraised: boolean; message: string } {
    if (user.role !== 'TEACHER' && user.role !== 'SUPER_ADMIN') {
      throw new Error('403 Forbidden: Chỉ Giáo viên chủ nhiệm mới có quyền tuyên dương hoạt động.');
    }

    const act = this.activities.find((a) => a.id === activityId);
    if (!act || !act.registrations) {
      return { success: false, isPraised: false, message: 'Hoạt động không tồn tại.' };
    }

    const reg = act.registrations.find((r) => r.id === registrationId);
    if (!reg) {
      return { success: false, isPraised: false, message: 'Học sinh chưa đăng ký hoạt động này.' };
    }

    const isCurrentlyPraised =
      reg.evaluationLevel === 'XUAT_SAC' ||
      Boolean(reg.praiseOrReward && reg.praiseOrReward.includes('Tuyên dương')) ||
      trainingService.isActivityPraisedInLedger(activityId, reg.studentId);

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
    let nextPraisedState = false;

    if (!isCurrentlyPraised) {
      // Award praise
      reg.evaluationLevel = 'XUAT_SAC';
      reg.praiseOrReward = `⭐ Tuyên dương tích cực trong hoạt động: ${act.title}`;
      reg.trainingBonusPoints = 5;
      reg.evaluatedAt = nowStr;
      reg.evaluatedBy = user.name;
      reg.status = 'attended';
      nextPraisedState = true;

      const groupNum = parseInt(reg.groupOrTeam?.replace(/\D/g, '') || '1', 10);
      trainingService.awardActivityPraisePoints({
        activityId,
        activityTitle: act.title,
        studentId: reg.studentId,
        studentName: reg.studentName,
        studentGroup: groupNum,
        classId: act.classId,
        teacherName: user.name,
        teacherRole: user.role
      });

      inAppNotificationService.addNotification({
        title: `⭐ Tuyên dương xuất sắc: ${reg.studentName}`,
        desc: `GVCN đã tuyên dương em trong hoạt động "${act.title}" (+5 điểm rèn luyện Cây Nguyệt Quế)`,
        category: 'activity',
        targetRoles: ['STUDENT', 'PARENT', 'TEACHER'],
        targetUserIds: [reg.studentId],
        targetModule: 'activities',
        type: 'success'
      });

      auditService.logEvent(
        'SUBMISSION_APPROVED',
        user,
        reg.studentName,
        `Tuyên dương học sinh ${reg.studentName} trong hoạt động "${act.title}" (+5 điểm rèn luyện)`,
        { activityId, registrationId }
      );
    } else {
      // Remove / Revert praise
      reg.evaluationLevel = 'HOAN_THANH';
      reg.praiseOrReward = '';
      reg.trainingBonusPoints = 2;
      reg.evaluatedAt = nowStr;
      reg.evaluatedBy = user.name;
      nextPraisedState = false;

      trainingService.removeActivityPraisePoints({
        activityId,
        activityTitle: act.title,
        studentId: reg.studentId,
        teacherName: user.name,
        teacherRole: user.role
      });

      auditService.logEvent(
        'CONTENT_UPDATED',
        user,
        reg.studentName,
        `Hủy tuyên dương học sinh ${reg.studentName} trong hoạt động "${act.title}" (-5 điểm rèn luyện)`,
        { activityId, registrationId }
      );
    }

    this.saveToStorage();
    classSettingsRepositoryClient.updateActivity(act.id, { registrations: act.registrations }).catch(err =>
      console.warn('[ActivityService] Praise sync notice:', err)
    );
    return {
      success: true,
      isPraised: nextPraisedState,
      message: nextPraisedState
        ? `Đã tuyên dương ${reg.studentName} và tự động +5 điểm rèn luyện!`
        : `Đã hủy tuyên dương và hoàn điểm rèn luyện cho ${reg.studentName}.`
    };
  }

  /**
   * Update evaluation, praise/reward, training bonus points, and private notes for a single registration
   */
  public updateRegistrationEvaluation(
    activityId: string,
    registrationId: string,
    evaluation: {
      evaluationLevel?: ParticipationEvaluationLevel;
      praiseOrReward?: string;
      trainingBonusPoints?: number;
      teacherPrivateNote?: string;
      status?: ActivityRegistration['status'];
    },
    user: UserAccount
  ): boolean {
    if (user.role !== 'TEACHER' && user.role !== 'SUPER_ADMIN') {
      throw new Error('403 Forbidden: Chỉ Giáo viên chủ nhiệm mới có quyền đánh giá và lưu kết quả.');
    }

    const act = this.activities.find((a) => a.id === activityId);
    if (!act || !act.registrations) return false;

    const reg = act.registrations.find((r) => r.id === registrationId);
    if (!reg) return false;

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const wasPraised =
      reg.evaluationLevel === 'XUAT_SAC' ||
      Boolean(reg.praiseOrReward && reg.praiseOrReward.includes('Tuyên dương')) ||
      (reg.trainingBonusPoints || 0) >= 5;

    if (evaluation.evaluationLevel !== undefined) reg.evaluationLevel = evaluation.evaluationLevel;
    if (evaluation.praiseOrReward !== undefined) reg.praiseOrReward = evaluation.praiseOrReward;
    if (evaluation.trainingBonusPoints !== undefined) reg.trainingBonusPoints = evaluation.trainingBonusPoints;
    if (evaluation.teacherPrivateNote !== undefined) reg.teacherPrivateNote = evaluation.teacherPrivateNote;
    if (evaluation.status !== undefined) reg.status = evaluation.status;

    reg.evaluatedAt = nowStr;
    reg.evaluatedBy = user.name;

    const isNowPraised =
      reg.evaluationLevel === 'XUAT_SAC' ||
      Boolean(reg.praiseOrReward && reg.praiseOrReward.includes('Tuyên dương')) ||
      (reg.trainingBonusPoints || 0) >= 5;

    // Sync with Training Ledger
    if (isNowPraised && !wasPraised) {
      const groupNum = parseInt(reg.groupOrTeam?.replace(/\D/g, '') || '1', 10);
      trainingService.awardActivityPraisePoints({
        activityId,
        activityTitle: act.title,
        studentId: reg.studentId,
        studentName: reg.studentName,
        studentGroup: groupNum,
        classId: act.classId,
        teacherName: user.name,
        teacherRole: user.role
      });
    } else if (!isNowPraised && wasPraised) {
      trainingService.removeActivityPraisePoints({
        activityId,
        activityTitle: act.title,
        studentId: reg.studentId,
        teacherName: user.name,
        teacherRole: user.role
      });
    }

    this.saveToStorage();
    classSettingsRepositoryClient.updateActivity(act.id, { registrations: act.registrations }).catch(err =>
      console.warn('[ActivityService] Eval sync notice:', err)
    );

    // Trigger notification to student and parent if praised
    if (reg.praiseOrReward || reg.evaluationLevel === 'XUAT_SAC' || reg.evaluationLevel === 'TICH_CUC') {
      inAppNotificationService.addNotification({
        title: `🎖️ Đánh giá & Tuyên dương phong trào: ${reg.studentName}`,
        desc: `Hoạt động "${act.title}": ${reg.praiseOrReward || 'Được đánh giá ' + (reg.evaluationLevel === 'XUAT_SAC' ? 'Xuất sắc' : 'Tích cực')}`,
        category: 'activity',
        targetRoles: ['STUDENT', 'PARENT', 'TEACHER'],
        targetUserIds: [reg.studentId],
        targetModule: 'activities',
        type: 'success'
      });
    }

    auditService.logEvent(
      'SUBMISSION_APPROVED',
      user,
      reg.studentName,
      `Đánh giá hoạt động "${act.title}" cho ${reg.studentName}: ${reg.evaluationLevel || 'Đạt'}`,
      { activityId, registrationId }
    );

    return true;
  }

  /**
   * Batch update evaluations for an entire activity
   */
  public batchUpdateEvaluations(
    activityId: string,
    evaluations: Array<{
      registrationId: string;
      evaluationLevel?: ParticipationEvaluationLevel;
      praiseOrReward?: string;
      trainingBonusPoints?: number;
      teacherPrivateNote?: string;
      status?: ActivityRegistration['status'];
    }>,
    user: UserAccount
  ): boolean {
    if (user.role !== 'TEACHER' && user.role !== 'SUPER_ADMIN') {
      throw new Error('403 Forbidden: Chỉ Giáo viên chủ nhiệm mới có quyền đánh giá và lưu kết quả.');
    }

    const act = this.activities.find((a) => a.id === activityId);
    if (!act || !act.registrations) return false;

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);

    evaluations.forEach((item) => {
      const reg = act.registrations?.find((r) => r.id === item.registrationId);
      if (reg) {
        const wasPraised =
          reg.evaluationLevel === 'XUAT_SAC' ||
          Boolean(reg.praiseOrReward && reg.praiseOrReward.includes('Tuyên dương')) ||
          (reg.trainingBonusPoints || 0) >= 5;

        if (item.evaluationLevel !== undefined) reg.evaluationLevel = item.evaluationLevel;
        if (item.praiseOrReward !== undefined) reg.praiseOrReward = item.praiseOrReward;
        if (item.trainingBonusPoints !== undefined) reg.trainingBonusPoints = item.trainingBonusPoints;
        if (item.teacherPrivateNote !== undefined) reg.teacherPrivateNote = item.teacherPrivateNote;
        if (item.status !== undefined) reg.status = item.status;
        reg.evaluatedAt = nowStr;
        reg.evaluatedBy = user.name;

        const isNowPraised =
          reg.evaluationLevel === 'XUAT_SAC' ||
          Boolean(reg.praiseOrReward && reg.praiseOrReward.includes('Tuyên dương')) ||
          (reg.trainingBonusPoints || 0) >= 5;

        if (isNowPraised && !wasPraised) {
          const groupNum = parseInt(reg.groupOrTeam?.replace(/\D/g, '') || '1', 10);
          trainingService.awardActivityPraisePoints({
            activityId,
            activityTitle: act.title,
            studentId: reg.studentId,
            studentName: reg.studentName,
            studentGroup: groupNum,
            classId: act.classId,
            teacherName: user.name,
            teacherRole: user.role
          });
        } else if (!isNowPraised && wasPraised) {
          trainingService.removeActivityPraisePoints({
            activityId,
            activityTitle: act.title,
            studentId: reg.studentId,
            teacherName: user.name,
            teacherRole: user.role
          });
        }
      }
    });

    this.saveToStorage();
    classSettingsRepositoryClient.updateActivity(act.id, { registrations: act.registrations }).catch(err =>
      console.warn('[ActivityService] Batch eval sync notice:', err)
    );

    inAppNotificationService.addNotification({
      title: `📊 Đã hoàn tất đánh giá hoạt động: ${act.title}`,
      desc: `GVCN đã tổng hợp và công bố kết quả đánh giá cho ${evaluations.length} học viên tham gia.`,
      category: 'activity',
      targetRoles: ['STUDENT', 'PARENT', 'TEACHER', 'CLASS_OFFICER'],
      targetModule: 'activities',
      type: 'success'
    });

    return true;
  }

  /**
   * Get all registrations joined with activity metadata for cross-activity summary table
   */
  public getAllRegistrationsWithActivity(filter?: {
    activityId?: string;
    groupOrTeam?: string;
    evaluationLevel?: string;
    search?: string;
  }): Array<
    ActivityRegistration & {
      activityTitle: string;
      activityCategory: string;
      activityStartDate: string;
      activityEndDate?: string;
      activityLocation?: string;
    }
  > {
    const allItems: Array<
      ActivityRegistration & {
        activityTitle: string;
        activityCategory: string;
        activityStartDate: string;
        activityEndDate?: string;
        activityLocation?: string;
      }
    > = [];

    this.activities.forEach((act) => {
      if (filter?.activityId && filter.activityId !== 'ALL' && act.id !== filter.activityId) {
        return;
      }

      (act.registrations || []).forEach((reg) => {
        // Exclude cancelled unless needed
        if (reg.status === 'cancelled') return;

        if (filter?.groupOrTeam && filter.groupOrTeam !== 'ALL' && reg.groupOrTeam !== filter.groupOrTeam) {
          return;
        }

        if (filter?.evaluationLevel && filter.evaluationLevel !== 'ALL') {
          const currentLevel = reg.evaluationLevel || 'CHUA_DANH_GIA';
          if (currentLevel !== filter.evaluationLevel) {
            return;
          }
        }

        if (filter?.search) {
          const query = filter.search.toLowerCase().trim();
          const matchName = reg.studentName.toLowerCase().includes(query);
          const matchCode = (reg.studentCode || '').toLowerCase().includes(query);
          const matchAct = act.title.toLowerCase().includes(query);
          if (!matchName && !matchCode && !matchAct) return;
        }

        allItems.push({
          ...reg,
          activityTitle: act.title,
          activityCategory: act.category,
          activityStartDate: act.startDate,
          activityEndDate: act.endDate,
          activityLocation: act.location
        });
      });
    });

    return allItems.sort((a, b) => {
      const diff = parseDateToTimestamp(b.activityStartDate) - parseDateToTimestamp(a.activityStartDate);
      if (diff !== 0) return diff;
      return (b.id || '').localeCompare(a.id || '');
    });
  }

  /**
   * Get student specific activity statistics
   */
  public getStudentActivityStats(studentId: string) {
    let totalJoined = 0;
    let totalPraised = 0;
    let totalPoints = 0;
    const history: Array<ActivityRegistration & { activityTitle: string; activityCategory: string; activityDate: string }> = [];

    this.activities.forEach((act) => {
      const reg = (act.registrations || []).find((r) => r.studentId === studentId && r.status !== 'cancelled');
      if (reg) {
        totalJoined += 1;
        if (reg.evaluationLevel === 'XUAT_SAC' || reg.evaluationLevel === 'TICH_CUC' || reg.praiseOrReward) {
          totalPraised += 1;
        }
        totalPoints += reg.trainingBonusPoints || 0;
        history.push({
          ...reg,
          activityTitle: act.title,
          activityCategory: act.category,
          activityDate: act.startDate
        });
      }
    });

    return {
      totalJoined,
      totalPraised,
      totalPoints,
      history
    };
  }

  /**
   * Get class-wide overall activity summary statistics
   */
  public getClassActivitySummaryStats() {
    let totalActivities = this.activities.length;
    let totalRegistrations = 0;
    let totalAttended = 0;
    let totalPraises = 0;
    let totalBonusPoints = 0;
    let levelCounts: Record<string, number> = {
      XUAT_SAC: 0,
      TICH_CUC: 0,
      HOAN_THANH: 0,
      CHUA_HOAN_THANH: 0,
      VANG_MAT: 0,
      CHUA_DANH_GIA: 0
    };

    this.activities.forEach((act) => {
      (act.registrations || []).forEach((reg) => {
        if (reg.status !== 'cancelled') {
          totalRegistrations += 1;
          if (reg.status === 'attended') totalAttended += 1;
          if (reg.praiseOrReward) totalPraises += 1;
          totalBonusPoints += reg.trainingBonusPoints || 0;

          const lvl = reg.evaluationLevel || 'CHUA_DANH_GIA';
          levelCounts[lvl] = (levelCounts[lvl] || 0) + 1;
        }
      });
    });

    return {
      totalActivities,
      totalRegistrations,
      totalAttended,
      totalPraises,
      totalBonusPoints,
      levelCounts
    };
  }

  public getRegistrationsForActivity(activityId: string): ActivityRegistration[] {
    const act = this.activities.find((a) => a.id === activityId);
    return act?.registrations || [];
  }

  public toggleReaction(
    activityId: string,
    reactionType: 'love' | 'applause' | 'celebrate' | 'like',
    userId: string
  ): void {
    const act = this.activities.find((a) => a.id === activityId);
    if (!act) return;

    if (!act.reactions) {
      act.reactions = { love: [], applause: [], celebrate: [], like: [] };
    }
    if (!act.reactions[reactionType]) {
      act.reactions[reactionType] = [];
    }

    const arr = act.reactions[reactionType]!;
    const idx = arr.indexOf(userId);

    if (idx >= 0) {
      arr.splice(idx, 1);
    } else {
      arr.push(userId);
    }

    this.saveToStorage();
    classSettingsRepositoryClient.updateActivity(act.id, { reactions: act.reactions }).catch(err =>
      console.warn('[ActivityService] Reaction sync notice:', err)
    );
  }

  public addComment(activityId: string, content: string, user: UserAccount): Comment | null {
    const act = this.activities.find((a) => a.id === activityId);
    if (!act) return null;

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const newComment: Comment = {
      id: `c-${Date.now()}`,
      postId: activityId,
      authorId: user.id,
      authorName: user.name,
      authorAvatar: user.avatar,
      authorRole: user.role,
      content,
      createdAt: nowStr,
      status: 'active'
    };

    if (!act.comments) act.comments = [];
    act.comments.push(newComment);
    this.saveToStorage();
    classSettingsRepositoryClient.updateActivity(act.id, { comments: act.comments }).catch(err =>
      console.warn('[ActivityService] Comment sync notice:', err)
    );

    return newComment;
  }

  public deleteComment(activityId: string, commentId: string): boolean {
    const act = this.activities.find((a) => a.id === activityId);
    if (!act || !act.comments) return false;

    act.comments = act.comments.filter((c) => c.id !== commentId);
    this.saveToStorage();
    classSettingsRepositoryClient.updateActivity(act.id, { comments: act.comments }).catch(err =>
      console.warn('[ActivityService] Delete comment sync notice:', err)
    );
    return true;
  }
}

export const activityService = new ActivityService();
