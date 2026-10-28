/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Submission, SubmissionStatus, UserAccount, AttachedFile } from '../types';
import { trainingService } from './TrainingService';
import { auditService } from './AuditService';
import { tenantService } from './TenantService';
import { inAppNotificationService } from './InAppNotificationService';
import { postService } from './PostService';
import { classSettingsRepositoryClient } from './ClassSettingsRepositoryClient';
import { classService } from './ClassService';

const initialDemoSubmissions: Submission[] = [
  {
    id: 'sub-01',
    organizationId: 'org-lhp',
    classId: '11A1',
    studentId: 'hs-05',
    studentName: 'Vũ Đức Thịnh',
    studentGroup: 2,
    submissionType: 'good_deed',
    category: 'Việc tốt & Giúp bạn',
    description: 'Chủ động ở lại sau giờ học 45 phút để kèm bạn Phạm Minh Đức (môn Vật lí) và hỗ trợ quét dọn, lau bảng phòng học sạch sẽ.',
    proposedPoints: 5,
    eventDate: '24/11/2025',
    session: 'Chiều',
    evidence: [
      {
        id: 'ev-1',
        name: 'Bang-ghi-nhan-to-2.jpg',
        url: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=600&q=80',
        size: '1.2 MB',
        type: 'image'
      }
    ],
    proposedBy: 'Nguyễn Gia Huy (Lớp trưởng)',
    proposedById: 'hs-01',
    proposedByRole: 'CLASS_OFFICER',
    proposedAt: '24/11/2025 17:30',
    status: 'pending',
    parentVisible: true
  },
  {
    id: 'sub-02',
    organizationId: 'org-lhp',
    classId: '11A1',
    studentId: 'hs-03',
    studentName: 'Lê Hoàng Long',
    studentGroup: 1,
    submissionType: 'training_error',
    category: 'Đề xuất điều chỉnh điểm rèn luyện',
    description: 'Em có tham gia hỗ trợ dọn dẹp hội trường sau buổi lễ 20/11 cùng thầy Tổng phụ trách, kính nhờ Cô kiểm tra và cộng điểm rèn luyện ạ.',
    proposedPoints: 10,
    eventDate: '21/11/2025',
    session: 'Sáng',
    evidence: [],
    proposedBy: 'Lê Hoàng Long',
    proposedById: 'hs-03',
    proposedByRole: 'STUDENT',
    proposedAt: '21/11/2025 08:30',
    status: 'pending',
    parentVisible: true
  },
  {
    id: 'sub-03',
    organizationId: 'org-lhp',
    classId: '11A1',
    studentId: 'hs-08',
    studentName: 'Hoàng Thị Thảo',
    studentGroup: 3,
    submissionType: 'leave_permitted',
    category: 'Xin nghỉ học có phép',
    description: 'Em bị sốt xuất huyết nhập viện từ sáng thứ Hai, gia đình đã gửi giấy xác nhận của Bệnh viện Nhi Đồng.',
    proposedPoints: 0,
    eventDate: '24/11/2025',
    session: 'Cả ngày',
    evidence: [
      {
        id: 'ev-2',
        name: 'Giay-xac-nhan-benh-vien.pdf',
        url: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=600&q=80',
        size: '850 KB',
        type: 'pdf'
      }
    ],
    proposedBy: 'Bác Hoàng Văn Toàn (Phụ huynh)',
    proposedById: 'ph-hs-08',
    proposedByRole: 'PARENT',
    proposedAt: '24/11/2025 06:45',
    status: 'pending',
    parentVisible: true
  },
  {
    id: 'sub-04',
    organizationId: 'org-lhp',
    classId: '11A1',
    studentId: 'hs-07',
    studentName: 'Vũ Hải Nam',
    studentGroup: 2,
    submissionType: 'violation',
    category: 'Vi phạm trật tự',
    description: 'Đi học muộn 15 phút tiết 1 môn Toán thứ Ba ngày 18/11 không có lý do chính đáng.',
    proposedPoints: -3,
    eventDate: '18/11/2025',
    session: 'Sáng',
    evidence: [],
    proposedBy: 'Nguyễn Gia Huy (Lớp trưởng)',
    proposedById: 'hs-01',
    proposedByRole: 'CLASS_OFFICER',
    proposedAt: '18/11/2025 11:30',
    status: 'approved',
    reviewedBy: 'Cô Nguyễn Thị Mai Lan (GVCN)',
    reviewedAt: '18/11/2025 14:00',
    parentVisible: true
  },
  {
    id: 'sub-05',
    organizationId: 'org-lhp',
    classId: '11A1',
    studentId: 'hs-06',
    studentName: 'Lê Thùy Dung',
    studentGroup: 2,
    submissionType: 'progress',
    category: 'Tiến bộ vượt bậc',
    description: 'Đạt điểm 10 bài kiểm tra 1 tiết môn Hóa học (trước đó là 6.5), có nhiều đóng góp sôi nổi trong giờ thảo luận.',
    proposedPoints: 15,
    eventDate: '15/11/2025',
    session: 'Sáng',
    evidence: [],
    proposedBy: 'Trần Phương Linh (Lớp phó Học tập)',
    proposedById: 'hs-02',
    proposedByRole: 'CLASS_OFFICER',
    proposedAt: '15/11/2025 16:00',
    status: 'edited_and_approved',
    reviewedBy: 'Cô Nguyễn Thị Mai Lan (GVCN)',
    reviewedAt: '15/11/2025 18:30',
    originalData: { proposedPoints: 15, category: 'Tiến bộ vượt bậc' },
    approvedData: { proposedPoints: 10, category: 'Tiến bộ học tập môn Hóa' },
    reviewerNote: 'Cô ghi nhận nỗ lực rất lớn của Thùy Dung, cô điều chỉnh mức điểm cộng theo đúng thang điểm rèn luyện là +10đ nhé.',
    parentVisible: true
  }
];

class SubmissionService {
  private activeTenantId: string = 'tenant-lan-nguyen';
  private submissions: Submission[] = [];
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
      const serverItems = await classSettingsRepositoryClient.getSubmissions(tId);
      if (Array.isArray(serverItems)) {
        if (serverItems.length > 0) {
          this.submissions = serverItems as Submission[];
          this.saveToStorage(tId);
        } else if (tId !== 'tenant-lan-nguyen') {
          this.submissions = [];
          this.saveToStorage(tId);
        }
      }
    } catch (err) {
      console.warn('[SubmissionService] Sync notice:', err);
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

  public refresh(): void {
    this.loadFromStorage(this.activeTenantId);
    this.notify();
    this.syncFromServer(this.activeTenantId);
  }

  private loadFromStorage(tenantId: string) {
    const tId = tenantService.normalizeTenantId(tenantId);
    try {
      const key = tenantService.getTenantStorageKey('submissions_v1', tId);
      const saved = localStorage.getItem(key);
      if (saved) {
        this.submissions = JSON.parse(saved);
      } else {
        if (tId === 'tenant-lan-nguyen') {
          const legacy = localStorage.getItem('kgcns_submissions_v1');
          if (legacy) {
            this.submissions = JSON.parse(legacy);
            localStorage.setItem(key, legacy);
          } else {
            this.submissions = [...initialDemoSubmissions];
          }
        } else {
          this.submissions = [];
        }
      }
    } catch {
      this.submissions = tId === 'tenant-lan-nguyen' ? [...initialDemoSubmissions] : [];
    }
  }

  private saveToStorage(tenantId?: string) {
    const tId = tenantService.normalizeTenantId(tenantId || this.activeTenantId);
    try {
      localStorage.setItem(tenantService.getTenantStorageKey('submissions_v1', tId), JSON.stringify(this.submissions));
    } catch {
      // ignore
    }
    this.notify();
  }

  public getAll(): Submission[] {
    return [...this.submissions];
  }

  public getPending(): Submission[] {
    return this.submissions.filter(s => String(s.status || '').toLowerCase() === 'pending');
  }

  public getPendingSubmissions(): Submission[] {
    return this.getPending();
  }

  public getPendingCount(): number {
    return this.getPending().length;
  }

  public getSubmissionsForStudent(studentId: string): Submission[] {
    return this.submissions.filter(s => s.studentId === studentId);
  }

  public getSubmissionsBySender(senderId: string): Submission[] {
    return this.submissions.filter(s => s.proposedById === senderId);
  }

  // 1. Tạo đề xuất mới (Học sinh, Ban cán sự, Phụ huynh)
  // BẮT BUỘC: Không tự động duyệt, không cho người gửi tự duyệt
  public createSubmission(
    payload: {
      studentId: string;
      studentName: string;
      studentGroup?: number;
      submissionType: string;
      category: string;
      description: string;
      proposedPoints?: number;
      eventDate?: string;
      session?: string;
      evidence?: AttachedFile[];
      parentVisible?: boolean;
      postId?: string;
      originalData?: any;
    },
    user: UserAccount
  ): { success: boolean; submission?: Submission; error?: string } {
    if (!payload.studentId || !payload.description.trim()) {
      return { success: false, error: 'Vui lòng chọn học viên và nhập nội dung đề xuất!' };
    }

    const normDesc = payload.description.trim().toLowerCase();
    const normCat = (payload.category || 'Đề xuất chung').trim().toLowerCase();
    const dupPending = this.submissions.find(
      s =>
        String(s.status || '').toLowerCase() === 'pending' &&
        s.studentId === payload.studentId &&
        String(s.category || '').trim().toLowerCase() === normCat &&
        String(s.description || '').trim().toLowerCase() === normDesc
    );
    if (dupPending) {
      return { success: true, submission: dupPending };
    }

    const now = new Date();
    const formattedDate = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + now.toLocaleDateString('vi-VN');
    const currentClassName = classService.getSettings()?.className || '11A1';

    const newSub: Submission = {
      id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      organizationId: 'org-lhp',
      classId: currentClassName,
      studentId: payload.studentId,
      studentName: payload.studentName,
      studentGroup: payload.studentGroup || 1,
      submissionType: payload.submissionType || 'good_deed',
      category: payload.category || 'Đề xuất chung',
      description: payload.description.trim(),
      proposedPoints: payload.proposedPoints !== undefined ? payload.proposedPoints : 0,
      eventDate: payload.eventDate || now.toLocaleDateString('vi-VN'),
      session: payload.session || 'Sáng',
      evidence: payload.evidence || [],
      evidenceFiles: payload.evidence || [],
      proposedBy: user.name || 'Thành viên lớp',
      proposedById: user.id,
      proposedByRole: user.role,
      proposedAt: formattedDate,
      status: 'pending', // Luôn ở trạng thái chờ GVCN duyệt
      parentVisible: payload.parentVisible !== undefined ? payload.parentVisible : true,
      originalData: payload.originalData || (payload.postId ? { postId: payload.postId } : undefined)
    };
    if (payload.postId) {
      (newSub as any).postId = payload.postId;
      if (!newSub.originalData) newSub.originalData = {};
      newSub.originalData.postId = payload.postId;
    }

    this.submissions.unshift(newSub);
    this.saveToStorage();

    classSettingsRepositoryClient.createSubmission(newSub).catch(err =>
      console.warn('[SubmissionService] Create sync notice:', err)
    );

    // Trigger in-app notification to GVCN
    inAppNotificationService.notifySubmissionCreated(newSub, user);

    auditService.logEvent(
      'SUBMISSION_CREATED',
      user,
      `${payload.studentName} (${payload.category})`,
      `Gửi đề xuất mới (${newSub.proposedPoints > 0 ? `+${newSub.proposedPoints}đ` : `${newSub.proposedPoints}đ`}): ${newSub.description}`,
      { targetId: newSub.id, studentId: payload.studentId }
    );

    return { success: true, submission: newSub };
  }

  // 2. Ghi nhận trực tiếp bởi GVCN (Không cần duyệt, tự động thành công)
  public teacherDirectRecord(
    payload: {
      studentIds: string[];
      category: string;
      description: string;
      points: number;
      parentVisible?: boolean;
      eventDate?: string;
    },
    teacher: UserAccount
  ): { success: boolean; count: number } {
    if (teacher.role !== 'TEACHER') {
      return { success: false, count: 0 };
    }

    const now = new Date();
    const formattedDate = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + now.toLocaleDateString('vi-VN');
    const currentClassName = classService.getSettings()?.className || '11A1';

    payload.studentIds.forEach(sId => {
      const subId = `sub-dir-${Date.now()}-${sId}`;
      const newSub: Submission = {
        id: subId,
        organizationId: 'org-lhp',
        classId: currentClassName,
        studentId: sId,
        studentName: 'Học sinh ' + sId,
        submissionType: payload.points >= 0 ? 'point_plus' : 'point_minus',
        category: payload.category,
        description: payload.description,
        proposedPoints: payload.points,
        eventDate: payload.eventDate || now.toLocaleDateString('vi-VN'),
        evidence: [],
        proposedBy: teacher.name,
        proposedById: teacher.id,
        proposedByRole: 'TEACHER',
        proposedAt: formattedDate,
        status: 'approved',
        reviewedBy: teacher.name,
        reviewedAt: formattedDate,
        parentVisible: payload.parentVisible !== undefined ? payload.parentVisible : true
      };

      this.submissions.unshift(newSub);

      classSettingsRepositoryClient.createSubmission(newSub).catch(err =>
        console.warn('[SubmissionService] Direct record sync notice:', err)
      );

      // Ghi nhận trực tiếp vào giao dịch điểm Cây Nguyệt Quế (ID định danh chống trùng)
      trainingService.addTransaction({
        id: `tx-sub-${subId}`,
        studentId: sId,
        studentName: newSub.studentName,
        studentGroup: 1,
        classId: currentClassName,
        points: payload.points,
        category: payload.category as any,
        reason: payload.description,
        proposedByName: teacher.name,
        proposedByRole: 'TEACHER',
        status: 'approved',
        approvedBy: teacher.name,
        parentVisible: payload.parentVisible !== undefined ? payload.parentVisible : true
      });
    });

    this.saveToStorage();

    auditService.logEvent(
      'SUBMISSION_APPROVED',
      teacher,
      `${payload.studentIds.length} học viên`,
      `GVCN ghi nhận trực tiếp: ${payload.category} (${payload.points >= 0 ? `+${payload.points}đ` : `${payload.points}đ`})`
    );

    return { success: true, count: payload.studentIds.length };
  }

  // 3. GVCN Hành động 1: [DUYỆT]
  public approveSubmission(
    submissionId: string,
    teacher: UserAccount
  ): { success: boolean; error?: string } {
    if (teacher.role !== 'TEACHER') {
      return { success: false, error: 'Chỉ GVCN mới có quyền duyệt đề xuất!' };
    }

    const sub = this.submissions.find(s => s.id === submissionId);
    if (!sub) return { success: false, error: 'Không tìm thấy đề xuất!' };

    // Idempotent guard: do not re-award points if already approved
    if (sub.status === 'approved' || sub.status === 'edited_and_approved') {
      return { success: true };
    }

    const now = new Date();
    const formattedDate = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + now.toLocaleDateString('vi-VN');

    sub.status = 'approved';
    sub.reviewedBy = teacher.name;
    sub.reviewedAt = formattedDate;

    // Kích hoạt đồng bộ bài đăng Bảng tin nếu là đề xuất bài đăng
    const postId = sub.originalData?.postId || (sub as any).postId;
    let targetPost = postId ? postService.getPostById(postId) : postService.findPostForSubmission(sub);
    if (!targetPost && (sub.submissionType === 'post_approval' || (typeof sub.category === 'string' && sub.category.startsWith('Bảng tin')))) {
      targetPost = postService.findPostForSubmission(sub);
    }
    if (targetPost) {
      postService.approvePost(targetPost.id, teacher);
    }

    // Kích hoạt giao dịch điểm nếu có (ID định danh tx-sub-${sub.id} chống cộng điểm trùng)
    if (sub.proposedPoints !== undefined && sub.proposedPoints !== 0) {
      trainingService.addTransaction({
        id: `tx-sub-${sub.id}`,
        studentId: sub.studentId,
        studentName: sub.studentName,
        studentGroup: sub.studentGroup || 1,
        classId: sub.classId || classService.getSettings()?.className || '11A1',
        points: sub.proposedPoints,
        category: sub.category as any,
        reason: sub.description,
        proposedByName: sub.proposedBy,
        proposedByRole: sub.proposedByRole,
        status: 'approved',
        approvedBy: teacher.name,
        parentVisible: sub.parentVisible
      });
    }

    this.saveToStorage();

    classSettingsRepositoryClient.updateSubmission(sub.id, {
      status: sub.status,
      reviewedBy: sub.reviewedBy,
      reviewedAt: sub.reviewedAt
    }).catch(err => console.warn('[SubmissionService] Approve sync notice:', err));

    // Trigger in-app notification to Student and Parent
    inAppNotificationService.notifySubmissionApproved(sub, teacher);

    auditService.logEvent(
      'SUBMISSION_APPROVED',
      teacher,
      `${sub.studentName} (${sub.category})`,
      `GVCN duyệt đề xuất của ${sub.proposedBy}: ${sub.description}`,
      { targetId: sub.id, studentId: sub.studentId }
    );

    return { success: true };
  }

  // 4. GVCN Hành động 2: [CHỈNH SỬA & DUYỆT]
  public editAndApproveSubmission(
    submissionId: string,
    teacher: UserAccount,
    editedData: {
      category?: string;
      description?: string;
      proposedPoints?: number;
      reviewerNote?: string;
      parentVisible?: boolean;
    }
  ): { success: boolean; error?: string } {
    if (teacher.role !== 'TEACHER') {
      return { success: false, error: 'Chỉ GVCN mới có quyền chỉnh sửa & duyệt đề xuất!' };
    }

    const sub = this.submissions.find(s => s.id === submissionId);
    if (!sub) return { success: false, error: 'Không tìm thấy đề xuất!' };

    if (sub.status === 'approved' || sub.status === 'edited_and_approved') {
      return { success: true };
    }

    const now = new Date();
    const formattedDate = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + now.toLocaleDateString('vi-VN');

    // Lưu phiên bản gốc trước khi sửa
    sub.originalData = {
      ...(sub.originalData || {}),
      category: sub.category,
      description: sub.description,
      proposedPoints: sub.proposedPoints,
      parentVisible: sub.parentVisible
    };

    // Áp dụng dữ liệu mới
    if (editedData.category !== undefined) sub.category = editedData.category;
    if (editedData.description !== undefined) sub.description = editedData.description;
    if (editedData.proposedPoints !== undefined) sub.proposedPoints = editedData.proposedPoints;
    if (editedData.parentVisible !== undefined) sub.parentVisible = editedData.parentVisible;
    if (editedData.reviewerNote !== undefined) sub.reviewerNote = editedData.reviewerNote;

    sub.approvedData = {
      category: sub.category,
      description: sub.description,
      proposedPoints: sub.proposedPoints,
      parentVisible: sub.parentVisible
    };

    sub.status = 'edited_and_approved';
    sub.reviewedBy = teacher.name;
    sub.reviewedAt = formattedDate;

    // Kích hoạt đồng bộ bài đăng Bảng tin nếu là đề xuất bài đăng
    const editPostId = sub.originalData?.postId || (sub as any).postId;
    let postToEdit = editPostId ? postService.getPostById(editPostId) : postService.findPostForSubmission(sub);
    if (!postToEdit && (sub.submissionType === 'post_approval' || (typeof sub.category === 'string' && sub.category.startsWith('Bảng tin')))) {
      postToEdit = postService.findPostForSubmission(sub);
    }
    if (postToEdit) {
      postService.editAndApprovePost(postToEdit.id, teacher, {
        title: editedData.description?.includes(']') ? editedData.description.split(']')[0].replace('[', '').trim() : undefined,
        content: editedData.description,
        parentVisible: editedData.parentVisible
      });
    }

    // Ghi nhận điểm sau khi đã điều chỉnh (ID định danh tx-sub-${sub.id} chống cộng điểm trùng)
    if (sub.proposedPoints !== undefined && sub.proposedPoints !== 0) {
      trainingService.addTransaction({
        id: `tx-sub-${sub.id}`,
        studentId: sub.studentId,
        studentName: sub.studentName,
        studentGroup: sub.studentGroup || 1,
        classId: sub.classId || classService.getSettings()?.className || '11A1',
        points: sub.proposedPoints,
        category: sub.category as any,
        reason: `${sub.description} (GVCN đã hiệu chỉnh)`,
        proposedByName: sub.proposedBy,
        proposedByRole: sub.proposedByRole,
        status: 'approved',
        approvedBy: teacher.name,
        parentVisible: sub.parentVisible
      });
    }

    this.saveToStorage();

    classSettingsRepositoryClient.updateSubmission(sub.id, {
      category: sub.category,
      description: sub.description,
      proposedPoints: sub.proposedPoints,
      parentVisible: sub.parentVisible,
      reviewerNote: sub.reviewerNote,
      originalData: sub.originalData,
      approvedData: sub.approvedData,
      status: sub.status,
      reviewedBy: sub.reviewedBy,
      reviewedAt: sub.reviewedAt
    }).catch(err => console.warn('[SubmissionService] EditAndApprove sync notice:', err));

    // Trigger in-app notification to Student and Parent
    inAppNotificationService.notifySubmissionApproved(sub, teacher);

    auditService.logEvent(
      'SUBMISSION_EDITED',
      teacher,
      `${sub.studentName} (${sub.category})`,
      `GVCN chỉnh sửa và duyệt đề xuất từ ${sub.originalData.proposedPoints}đ → ${sub.proposedPoints}đ. Ghi chú: ${sub.reviewerNote || 'Không có'}`,
      { targetId: sub.id, studentId: sub.studentId }
    );

    return { success: true };
  }

  // 5. GVCN Hành động 3: [TỪ CHỐI]
  public rejectSubmission(
    submissionId: string,
    teacher: UserAccount,
    reason: string,
    reviewerNote?: string
  ): { success: boolean; error?: string } {
    if (teacher.role !== 'TEACHER') {
      return { success: false, error: 'Chỉ GVCN mới có quyền từ chối đề xuất!' };
    }

    if (!reason.trim()) {
      return { success: false, error: 'Bắt buộc phải chọn hoặc nhập lý do từ chối!' };
    }

    const sub = this.submissions.find(s => s.id === submissionId);
    if (!sub) return { success: false, error: 'Không tìm thấy đề xuất!' };

    const now = new Date();
    const formattedDate = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + now.toLocaleDateString('vi-VN');

    sub.status = 'rejected';
    sub.rejectionReason = reason.trim();
    sub.reviewerNote = (reviewerNote || '').trim();
    sub.reviewedBy = teacher.name;
    sub.reviewedAt = formattedDate;

    // Kích hoạt từ chối bài đăng Bảng tin nếu là đề xuất bài đăng
    const rejectPostId = sub.originalData?.postId || (sub as any).postId;
    let postToReject = rejectPostId ? postService.getPostById(rejectPostId) : postService.findPostForSubmission(sub);
    if (!postToReject && (sub.submissionType === 'post_approval' || (typeof sub.category === 'string' && sub.category.startsWith('Bảng tin')))) {
      postToReject = postService.findPostForSubmission(sub);
    }
    if (postToReject) {
      postService.rejectPost(postToReject.id, teacher, reason, reviewerNote);
    }

    this.saveToStorage();

    classSettingsRepositoryClient.updateSubmission(sub.id, {
      status: sub.status,
      rejectionReason: sub.rejectionReason,
      reviewerNote: sub.reviewerNote,
      reviewedBy: sub.reviewedBy,
      reviewedAt: sub.reviewedAt
    }).catch(err => console.warn('[SubmissionService] Reject sync notice:', err));

    auditService.logEvent(
      'SUBMISSION_REJECTED',
      teacher,
      `${sub.studentName} (${sub.category})`,
      `GVCN từ chối đề xuất của ${sub.proposedBy}. Lý do: ${reason}. Ghi chú: ${reviewerNote || 'Không có'}`,
      { targetId: sub.id, studentId: sub.studentId }
    );

    return { success: true };
  }

  public deleteSubmission(submissionId: string): boolean {
    const idx = this.submissions.findIndex(s => s.id === submissionId);
    if (idx === -1) return false;
    this.submissions.splice(idx, 1);
    this.saveToStorage();
    classSettingsRepositoryClient.deleteSubmission(submissionId).catch(err =>
      console.warn('[SubmissionService] Delete sync notice:', err)
    );
    return true;
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.push(callback);
    this.syncFromServer(this.activeTenantId);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }
}

export const submissionService = new SubmissionService();

