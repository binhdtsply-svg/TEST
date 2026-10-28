/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'SUPER_ADMIN' | 'TEACHER' | 'CLASS_OFFICER' | 'STUDENT' | 'PARENT';

export type TenantPlan = 'STANDARD' | 'PRO' | 'ENTERPRISE';
export type TenantStatus = 'ACTIVE' | 'SUSPENDED' | 'TRIAL';

export interface TenantQuota {
  maxClasses: number;
  maxStudentsPerClass: number;
  storageMb: number;
  aiCreditsMonthly: number;
}

export interface Tenant {
  id: string; // e.g. 'tenant-lan-nguyen'
  name: string; // Tên đơn vị / Không gian e.g. 'Không gian GVCN Mai Lan'
  schoolName: string;
  ownerEmail: string;
  ownerName: string;
  ownerPhone?: string;
  status: TenantStatus;
  plan: TenantPlan;
  quota: TenantQuota;
  classIds: string[];
  currentClassId: string;
  createdAt: string;
  updatedAt: string;
  isDemo?: boolean;
}

export interface AdminContactInfo {
  organizationName?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  workingHours?: string;
  notes?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface SystemConfig {
  schemaVersion: number;
  platformName: string;
  version: string;
  maintenanceMode: boolean;
  supportBreakGlassActive: boolean;
  featureFlags: FeatureFlagConfig;
  adminContact?: AdminContactInfo;
}

export interface PlatformSettings {
  id: string;
  appName: string;
  appVersion: string;
  globalFeatureFlags: FeatureFlagConfig;
  updatedByAdmin?: string;
  updatedAt?: string;
}

export interface WorkspaceSettings extends ClassSettings {
  organizationId: string;
  workspaceId: string;
  ownerTeacherId: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface FeatureFlagConfig {
  aiAssistant: boolean;
  googleSync: boolean;
  zaloIntegration: boolean;
  hollandTest: boolean;
  graduationEstimator: boolean;
  parentBridge: boolean;
  laurelGamification: boolean;
  excelImportExport: boolean;
  pwaOfflineSync: boolean;
  customThemes: boolean;
}

export interface MigrationHistoryItem {
  migrationId: string;
  fromVersion: number;
  toVersion: number;
  startedAt: string;
  completedAt: string;
  status: 'SUCCESS' | 'FAILED' | 'ROLLED_BACK';
  affectedTenants: number;
  notes?: string;
}

export type TeacherLoginMethod = 'GOOGLE' | 'ACCESS_CODE' | 'BOTH';
export type TeacherAccountStatus = 'ACTIVE' | 'LOCKED' | 'REVOKED';
export type AccessCredentialStatus = 'ACTIVE' | 'LOCKED' | 'REVOKED' | 'PENDING';

export interface StudentAccessCredential {
  credentialId: string;
  tenantId: string;
  classId?: string;
  studentId: string;
  studentName: string;
  studentCode: string;
  accessCode: string;
  status: AccessCredentialStatus;
  createdAt: string;
  lastLoginAt?: string;
  revokedAt?: string;
}

export interface ParentAccessCredential {
  credentialId: string;
  tenantId: string;
  classId?: string;
  childStudentId: string;
  childStudentName: string;
  childStudentCode: string;
  accessCode: string;
  status: AccessCredentialStatus;
  createdAt: string;
  lastLoginAt?: string;
  revokedAt?: string;
}

export interface TeacherAccountItem {
  id: string;
  tenantId: string;
  email: string;
  fullName: string;
  phone?: string;
  schoolName: string;
  workspaceName?: string;
  loginMethod?: TeacherLoginMethod;
  allowedGoogleEmail?: string;
  googleSub?: string;
  classesCount: number;
  className?: string;
  academicYear?: string;
  totalStudentsCount: number;
  status: TeacherAccountStatus;
  createdAt: string;
  createdBy?: string;
  lastLoginAt?: string;
  activationToken?: string;
  accessCodeHash?: string;
  hasPassword?: boolean;
  passwordHash?: string;
}

export interface SetupWizardData {
  schoolName: string;
  teacherName: string;
  teacherEmail: string;
  teacherPhone: string;
  className: string;
  academicYear: string;
  semester: 'HK1' | 'HK2' | 'Học kỳ I' | 'Học kỳ II';
  grade: string;
  stream: string;
  slogan: string;
  studentsCount: number;
  students: Partial<Student>[];
  subjects: SubjectConfig[];
  pointRules: PointRuleConfig[];
  theme: ThemeConfig;
}

export interface SupportAccessLog {
  id: string;
  superAdminEmail: string;
  tenantId: string;
  teacherName: string;
  reason: string;
  accessedAt: string;
  expiresAt: string;
}

export interface OfficerPermissions {
  manageAssignments?: boolean;
  manageTests?: boolean;
  manageActivities?: boolean;
  manageTimetable?: boolean;
  publishPosts?: boolean;
  publishAlbum?: boolean;
  submitStudentEvent?: boolean;
  submitAttendance?: boolean;
  canManageAttendance?: boolean;
  canManagePoints?: boolean;
  canPostAnnouncements?: boolean;
  canManageStudySchedule?: boolean;
  quickReport?: boolean;
  [key: string]: boolean | undefined;
}

export interface UserAccount {
  id: string;
  userId?: string;
  teacherId?: string;
  name: string;
  fullName?: string;
  role: UserRole;
  avatar: string;
  tenantId?: string;
  workspaceId?: string;
  currentClassId?: string;
  studentId?: string; // linked student if student or parent
  childStudentId?: string; // linked child student if parent
  officerRoleTitle?: string;
  officerRole?: string;
  permissions?: OfficerPermissions;
  email?: string;
  phone?: string;
  loginMethod?: 'GOOGLE' | 'ACCESS_CODE' | 'DIRECT' | 'BOTH';
  googleSub?: string;
  issuedAt?: number;
  expiresAt?: number;
  token?: string;
  isTestCredential?: boolean;
  mustChangePassword?: boolean;
  hasPassword?: boolean;
}

export interface ThemeGradient {
  color1: string;
  color2: string;
  direction: 'to right' | 'to bottom' | 'to bottom right' | 'to bottom left';
}

export interface ThemeConfig {
  primaryColor: string;
  backgroundColor?: string;
  textColor?: string;
  secondaryTextColor?: string;

  backgroundType?: 'solid' | 'gradient' | 'image';
  backgroundImage?: string;
  overlayOpacity?: number; // 0 to 100

  gradient?: ThemeGradient;
  fontFamily: string;

  cardBackground?: string;
  cardBorder?: string;
  cardRadius?: number; // e.g. 16
  cardShadow?: 'none' | 'sm' | 'md' | 'lg';
  cardOpacity?: number; // 0 to 100

  displayDensity?: 'compact' | 'standard' | 'comfortable';

  // Compatibility aliases
  pageBackground?: string;
  accentColor?: string;
  sidebarBackground?: string;
  sidebarActiveColor?: string;
  primaryButton?: string;
  secondaryButton?: string;
  primaryText?: string;
  secondaryText?: string;
  cardBorderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  borderRadius?: string;
  [key: string]: any;
}

export interface InteractionSettings {
  studentCanPost: boolean;
  studentCanComment: boolean;
  studentCanPostAlbum: boolean;
  studentCanCommentAlbum: boolean;
  parentCanInteract: boolean;
  reactionsEnabled: boolean;
}

export interface GoogleIntegrationConfig {
  formUrl?: string;
  spreadsheetUrl?: string;
  driveFolderId?: string;
  appsScriptEndpoint?: string;
}

export const AI_CONFIG = {
  provider: 'gemini' as const,
  defaultModel: 'gemini-3.7-flash',
  thinkingLevel: 'medium' as 'low' | 'medium' | 'high'
};

export interface AIDataPermissions {
  academicGrades: boolean;
  conductResults: boolean;
  pointsPlusMinus: boolean;
  attendance: boolean;
  violations: boolean;
  rewards: boolean;
  schoolYearGoals: boolean;
  journeyMilestones: boolean;
  activities: boolean;
  laurelGarden: boolean;
  careerRiasec: boolean;
  graduationExam: boolean;
  includeSensitiveInternalInfo: boolean;
}

export type AISourceType = 'system' | 'personal_gemini';

export interface AIWorkspaceConfig {
  workspaceId: string;
  sourceType?: AISourceType; // 'system' (Mặc định) | 'personal_gemini' (Gemini cá nhân)
  provider: 'gemini' | 'openai' | 'custom';
  model: string;
  apiKey?: string;
  personalApiKeyInMemory?: string; // In-memory/session only, never plaintext in DB
  hasPersonalKeyConfigured?: boolean;
  customEndpoint?: string;
  personalAiUrl?: string;
  customAuthHeader?: string;
  systemPrompt?: string;
  temperature?: number;
  enabled: boolean;
  monthlyQuota?: number;
  usedQuota?: number;
  lastTestedAt?: string;
  connectionStatus?: 'connected' | 'untested' | 'error' | 'disabled';
  lastErrorMessage?: string;
}

export interface AIMessage {
  id: string;
  conversationId?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  suggestedActions?: string[];
  isError?: boolean;
  thinkingLevel?: 'low' | 'medium' | 'high';
  documentData?: any;
}

export interface AIConversation {
  id: string;
  workspaceId: string;
  teacherId: string;
  classId?: string;
  title: string;
  messages: AIMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface ExcludedPeriod {
  id: string;
  name: string; // e.g. "Nghỉ Tết Nguyên Đán", "Nghỉ giữa học kỳ"
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  reason?: string;
  countAsStudyWeek?: boolean;
}

export interface SchoolYearTimelineConfig {
  startDateHK1: string; // e.g. '2025-09-05'
  endDateHK1: string; // e.g. '2026-01-16'
  startDateHK2: string; // e.g. '2026-01-19'
  endDateHK2: string; // e.g. '2026-05-30'
  firstStudyWeekStartDate?: string;
  schoolYearLabel?: string;
  timezone?: string;
  excludedPeriods?: ExcludedPeriod[];
  excludedRanges?: ExcludedPeriod[]; // alias
  totalWeeksHK1?: number; // 18 weeks
  totalWeeksHK2?: number; // 17 weeks
  totalWeeks?: number; // alias (totalWeeksHK1 + totalWeeksHK2 = 35)
  academicYearStart?: string; // alias for startDateHK1
  academicYearEnd?: string; // alias for endDateHK2
  semester1Start?: string; // alias for startDateHK1
  semester1End?: string; // alias for endDateHK1
  semester2Start?: string; // alias for startDateHK2
  semester2End?: string; // alias for endDateHK2
  semester1Weeks?: number; // alias for totalWeeksHK1
  semester2Weeks?: number; // alias for totalWeeksHK2
  currentWeekOverride?: number;
  migratedFromLegacyTimeline?: boolean;
  migratedAt?: string;
}

export interface ClassSettings {
  id: string;
  organizationId?: string;
  workspaceId?: string;
  classId?: string;

  schoolName: string;
  className: string;
  name?: string; // alias for className
  grade: string; // Khối e.g. "Khối 11"
  stream: string; // Ban e.g. "Ban KHTN (Khoa học Tự nhiên)"
  gradeLevel?: string; // e.g. "11"
  classTrack?: string; // e.g. "KHTN"
  educationTrack?: string; // Khối / Ban đào tạo

  schoolYearId?: string;
  schoolYearLabel?: string; // e.g. "2025 - 2026"
  academicYear: string; // e.g. "2025 - 2026"
  schoolYear?: string; // alias

  currentSemester?: string; // e.g. "Học kỳ I" or "HK1"
  semester: 'HK1' | 'HK2' | 'Học kỳ I' | 'Học kỳ II';

  // School Year Timeline (35 study weeks)
  schoolYearTimeline?: SchoolYearTimelineConfig;

  teacherId?: string;
  homeroomTeacherName?: string;
  teacherName: string;
  homeroomTeacher?: string; // alias
  teacherPhone: string;
  teacherEmail: string;

  slogan: string;
  coverImage?: string;
  coverImageUrl?: string;
  coverPositionY?: number; // 0 (top) to 100 (bottom)
  coverPosition?: string; // e.g. "center 50%"
  coverZoom?: number; // 100 to 200 percentage
  totalStudents?: number;
  confirmedTotalStudents?: number;
  studentIdentityMode?: 'IDENTIFIED' | 'ANONYMOUS';
  theme?: ThemeConfig;
  subjects?: SubjectConfig[];
  interactionSettings?: InteractionSettings;
  googleIntegration?: GoogleIntegrationConfig;
  zaloSettings?: ZaloClassSettings;
  aiConfig?: AIWorkspaceConfig;
  activeTimetableId?: string;
  curriculumType?: 'GDTX' | 'THPT' | 'GDTX_THPT' | string;
  educationProgram?: 'GDTX' | 'THPT' | 'GDTX_THPT' | string;
  violationWarningThreshold?: number; // Ngưỡng cảnh báo vi phạm của GVCN (Mặc định: 2 lượt)
  updatedAt?: string;
  updatedBy?: string;
}

export interface CareerAIMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  quickPromptUsed?: string;
  isError?: boolean;
}

export interface CareerAIConversation {
  id: string;
  organizationId?: string;
  classId?: string;
  studentId: string;
  studentName?: string;
  title?: string;
  messages: CareerAIMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface RightSidebarItem {
  id: string;
  itemType: 'assignment' | 'exam' | 'academic_published' | 'training' | 'proposal' | 'notice' | 'attendance';
  title: string;
  subtitle?: string;
  badge?: string;
  targetRoute: string;
  targetTab?: string;
  entityType?: string;
  entityId?: string;
  studentId?: string;
  assessmentPeriod?: AcademicPeriod;
  classId?: string;
}

export interface TimelineMilestone {
  id: string;
  title: string;
  date: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  status?: 'completed' | 'current' | 'upcoming';
  category?: 'academic' | 'activity' | 'ceremony' | 'exam' | 'EVENT' | 'MEETING' | 'ACTIVITY' | 'EXAM' | string;
  isCompleted?: boolean;
  completed?: boolean;
  images?: string[];
  files?: AttachedFile[];
}

export interface AttachedFile {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'pdf' | 'doc' | 'sheet' | 'video' | 'other';
  size: string;
}

export interface ClassGoal {
  id: string;
  title: string;
  category?: 'Học tập' | 'Rèn luyện' | 'Nề nếp' | 'Hoạt động' | 'Đoàn kết tập thể' | 'Khác' | 'Tập thể' | 'CONDUCT' | 'COLLECTIVE' | 'ACTIVITY' | string;
  description?: string;
  startDate?: string;
  deadline?: string;
  progress?: number; // 0 - 100
  targetMetric?: string;
  currentMetric?: string;
  targetPercentage?: number;
  currentPercentage?: number;
  current?: number;
  target?: number;
  unit?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'paused' | 'behind';
  notes?: string;
}

export interface PersonalGoal {
  id: string;
  studentId: string;
  studentName?: string;
  title: string;
  category?: 'Học tập' | 'Rèn luyện' | 'Kỹ năng' | 'Thói quen' | 'Khác';
  target?: string;
  description?: string;
  progress?: number;
  startDate?: string;
  deadline?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'paused';
  notes?: string;
  semester?: 'HK1' | 'HK2';
  teacherFeedback?: string;
  parentVisible?: boolean;
  source?: string;
  sourceSurveyId?: string;
  plan?: string;
  isCompleted?: boolean;
  createdAt?: string;
}

export interface PinnedItem {
  id: string;
  title: string;
  category?: 'Nội quy' | 'Thời khóa biểu' | 'Thông báo' | 'Kiểm tra' | 'Hoạt động' | 'Lịch thi' | 'notice' | 'rule' | 'schedule' | string;
  type?: string;
  content: string;
  pinnedAt?: string;
  createdAt?: string;
  pinnedBy?: string;
  files?: AttachedFile[];
  linkModule?: string;
}

export type PostCategory =
  | 'Tất cả'
  | 'Thông báo'
  | 'Báo bài'
  | 'Kiểm tra'
  | 'Hoạt động'
  | 'Học tập'
  | 'Khen thưởng'
  | 'Phong trào'
  | 'Nhắc nhở'
  | 'Khác';

export interface Comment {
  id: string;
  postId?: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorRole: UserRole;
  content: string;
  createdAt: string;
  updatedAt?: string;
  parentCommentId?: string;
  status?: 'active' | 'hidden';
}

export interface PostReaction {
  postId: string;
  userId: string;
  reactionType: 'love' | 'applause' | 'plant' | 'like';
  createdAt: string;
}

export interface AlbumMediaItem {
  id?: string;
  type: 'image' | 'video';
  url: string;
  name?: string;
  caption?: string;
}

export interface AlbumPost {
  id: string;
  organizationId?: string;
  classId?: string;
  category?: string;
  author?: string;

  authorId: string;
  authorName: string;
  authorAvatar: string;
  authorRole: UserRole;

  title: string;
  content: string;

  createdAt: string;
  updatedAt?: string;

  media: AlbumMediaItem[];
  images?: string[]; // for backward compatibility
  videoUrl?: string; // for backward compatibility
  attachments?: AttachedFile[];

  tags?: string[];
  hashtags?: string[]; // for backward compatibility

  reactions?: {
    love?: string[];
    applause?: string[];
    plant?: string[];
    like?: string[];
    celebrate?: string[];
    [key: string]: string[] | undefined;
  };
  commentsCount?: number;
  likes?: number;
  likesCount?: number;
  sharesCount?: number;
  pinned?: boolean;
  parentVisible?: boolean;

  visibility?: 'public' | 'class_only' | 'private';

  isPinned?: boolean;
  status?: 'published' | 'pending' | 'draft';

  createdBy?: string;
  comments?: any[];
  commentsList?: any[];
  description?: string; // alias for content
  date?: string; // alias for createdAt
}

export type ActivityCategory =
  | 'Phong trào'
  | 'Thể thao'
  | 'Văn nghệ'
  | 'Tình nguyện'
  | 'Thi đua'
  | 'Học thuật'
  | 'Khác'
  | string;

export type ParticipationEvaluationLevel =
  | 'XUAT_SAC' // Xuất sắc
  | 'TICH_CUC' // Tích cực
  | 'HOAN_THANH' // Hoàn thành
  | 'CHUA_HOAN_THANH' // Chưa hoàn thành
  | 'VANG_MAT' // Vắng mặt
  | 'CHUA_DANH_GIA'; // Chưa đánh giá

export interface ActivityRegistration {
  id: string;
  activityId: string;
  tenantId?: string;
  workspaceId?: string;
  classId: string;
  studentId: string;
  studentName: string;
  studentCode?: string;
  studentAvatar?: string;
  groupOrTeam?: string; // Tổ 1, Tổ 2, Tổ 3, Tổ 4
  registeredAt: string;
  status: 'registered' | 'cancelled' | 'attended' | 'absent';
  notes?: string;

  // Evaluation & Assessment details
  evaluationLevel?: ParticipationEvaluationLevel;
  praiseOrReward?: string; // Khen thưởng / Tuyên dương
  trainingBonusPoints?: number; // Điểm rèn luyện cộng thêm (+2, +5...)
  teacherPrivateNote?: string; // Ghi chú nội bộ dành riêng cho GVCN (role-gated)
  evaluatedAt?: string;
  evaluatedBy?: string;
}

export interface InAppNotification {
  id: string;
  tenantId: string;
  workspaceId: string;
  classId?: string;
  title: string;
  desc: string;
  category: 'academic' | 'activity' | 'test' | 'training' | 'comment' | 'registration' | 'laurel' | 'system' | 'post' | 'submission' | 'support' | 'feedback' | 'suggestion' | 'admin' | 'security' | 'survey';
  targetRoles: UserRole[];
  targetUserIds?: string[];
  excludeUserIds?: string[];
  authorId?: string;
  authorRole?: UserRole;
  targetModule: string; // e.g. 'posts', 'activities', 'academic', 'student_results', 'training', 'laurel', 'schedule', 'approvals', 'management'
  targetTab?: string;
  meta?: any;
  createdAt: string;
  createdAtTimestamp?: number;
  readBy: string[]; // List of user IDs who read it
  type: 'info' | 'success' | 'warning' | 'error';
  eventId?: string;
  read?: boolean;
  time?: string;
  link?: string;
  parentVisible?: boolean;
}

export interface ActivityPost {
  id: string;
  organizationId?: string;
  tenantId?: string;
  workspaceId?: string;
  classId?: string;

  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorRole: UserRole;

  title: string;
  content: string;
  category: ActivityCategory;

  startDate: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  isAllDay?: boolean;
  location?: string;

  // Registration extension
  registrationEnabled?: boolean;
  registrationDeadline?: string;
  maxParticipants?: number;
  registrations?: ActivityRegistration[];

  images?: string[];
  media?: AlbumMediaItem[];
  attachments?: AttachedFile[];

  createdAt: string;
  updatedAt?: string;

  reactions: {
    love: string[];
    applause: string[];
    celebrate: string[];
    like: string[];
    [key: string]: string[] | undefined;
  };
  comments: Comment[];
  pinnedToOverview?: boolean;
  status?: 'pending' | 'approved' | 'rejected' | 'completed';
  isCompleted?: boolean;
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  authorRole: UserRole;
  category: PostCategory;
  customBadgeIcon?: string;
  icon?: string;
  title?: string;
  content: string;
  images?: string[];
  attachments?: AttachedFile[];
  reactions: {
    like?: string[];
    love?: string[];
    applause?: string[];
    celebrate?: string[];
    plant?: string[];
    insightful?: string[];
    laurel?: string[];
    idea?: string[];
    [key: string]: string[] | undefined;
  };
  comments: Comment[];
  parentVisible?: boolean;
  isPinned?: boolean;
  pinned?: boolean; // alias
  pinnedToOverview?: boolean;
  status?: 'pending' | 'approved' | 'rejected';
  requiresApproval?: boolean;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  submissionId?: string;
  createdAt: string;
  [key: string]: any;
}

export interface ParentInfo {
  fatherName?: string;
  fatherPhone?: string;
  fatherJob?: string;
  motherName?: string;
  motherPhone?: string;
  motherJob?: string;
  address?: string;
  zaloConnected?: boolean;
}

export type AttentionStatus = 'monitoring' | 'supporting' | 'improving' | 'resolved' | 'ended' | 'stable' | 'continued_support' | 'stopped';

export interface AttentionHistoryEntry {
  id: string;
  startDate?: string;
  weekNumber?: number;
  weekLabel?: string;
  schoolYear?: string;
  recordedAt: string;
  signsAndCauses?: string;
  evidenceData?: string;
  teacherAnalysis?: string;
  aiAnalysis?: string;
  violationsCount?: number;
  violationDetails?: Array<{
    date: string;
    category?: string;
    reason: string;
    points?: number;
  }>;
  teacherNote?: string;
  categories: string[];
  supportMeasure?: string;
  weeklyReview?: string;
  evaluationResult?: string;
  status: AttentionStatus;
  recordedBy?: string;
  nextReviewDate?: string;
  endedAt?: string;
}

export type ViolationHandlingStatus = 'WARNING' | 'PROCESSING' | 'RESOLVED';

export interface ViolationHandlingHistoryEntry {
  timestamp: string;
  action: string;
  notes?: string;
  status: ViolationHandlingStatus;
  actorName?: string;
  handledAt?: string;
  educationalMeasure?: string;
  handlingResult?: string;
  studentExchangeNotes?: string;
  parentCoordinationNotes?: string;
  teacherNotes?: string;
}

export interface ViolationHandlingRecord {
  id: string;
  violationId?: string;
  studentId: string;
  studentName?: string;
  classId?: string;
  className?: string; // Tên lớp (e.g. "11A1")
  tenantId?: string;
  schoolYear?: string; // Năm học (e.g. "2025 - 2026")
  academicYear?: string; // Năm học đồng bộ
  date: string; // Ngày vi phạm (YYYY-MM-DD hoặc DD/MM/YYYY)
  time?: string; // Giờ vi phạm (HH:mm)
  weekNumber?: number;
  content: string; // Nội dung vi phạm
  category: string; // Loại/Nhóm vi phạm
  violationType?: string; // Phân loại chi tiết nếu có
  severity: 'Nhẹ' | 'Vừa' | 'Nặng' | 'Nghiêm trọng' | string;
  frequencyCount?: number;
  educationalMeasure?: string;
  studentExchangeNotes?: string;
  parentCoordinationNotes?: string;
  handlingResult?: string;
  handlingContent?: string;
  status: ViolationHandlingStatus; // WARNING | PROCESSING | RESOLVED
  teacherNotes?: string;
  recordedBy?: string; // Người ghi nhận (mặc định GVCN / Cán sự)
  recordedAt?: string; // Thời điểm ghi nhận
  handledBy?: string; // Người xử lý (GVCN)
  handledAt?: string; // Thời điểm xử lý
  isResolved?: boolean;
  createdAt: string;
  updatedAt?: string;
  updatedBy?: string;
  history?: ViolationHandlingHistoryEntry[];
}

export interface StudentSpecialAttention {
  needsSpecialAttention: boolean;
  attentionCategories: string[];
  attentionNote: string;
  supportMeasure?: string;
  attentionStatus: AttentionStatus;
  attentionStartedAt?: string;
  attentionUpdatedAt?: string;
  attentionUpdatedBy?: string;
  attentionEndedAt?: string;
  attentionWeekNumber?: number;
  attentionHistory?: AttentionHistoryEntry[];
}

export interface Student {
  id: string;
  tenantId?: string;
  classId?: string;
  code: string; // e.g. "HV001" or "HS11A1-01"
  anonymousCode?: string;
  fullName: string;
  gender: 'Nam' | 'Nữ';
  dob: string;
  group: number; // Tổ 1, 2, 3, 4
  officerRole?: string;
  officerPosition?: string;
  conductRank?: string;
  avatar?: string;
  phone?: string;
  email?: string;
  ethnicity?: string; // Dân tộc e.g. "Kinh", "Tày", "Thái", "Mường", ...
  isUnionMember?: boolean; // Đoàn viên Đoàn TNCS Hồ Chí Minh
  unionJoinDate?: string;
  address?: string;
  fatherName?: string;
  fatherPhone?: string;
  fatherJob?: string;
  motherName?: string;
  motherPhone?: string;
  motherJob?: string;
  healthNotes?: string;
  talents?: string;
  privateTeacherNotes?: string;
  academicSummary?: any;
  laurelGarden?: any;
  graduationSummary?: any;
  // Theo dõi nội bộ của GVCN (Special Attention - Teacher Only)
  needsSpecialAttention?: boolean;
  attentionCategories?: string[];
  attentionNote?: string;
  supportMeasure?: string;
  attentionStatus?: AttentionStatus;
  attentionStartedAt?: string;
  attentionUpdatedAt?: string;
  attentionUpdatedBy?: string;
  attentionEndedAt?: string;
  attentionWeekNumber?: number;
  attentionHistory?: AttentionHistoryEntry[];
  // Theo dõi & Xử lý vi phạm của GVCN (Teacher Only)
  violationHandlingRecords?: ViolationHandlingRecord[];
  parentName?: string;
  parentPhone?: string;
  parent?: ParentInfo;
  status?: 'Đang học' | 'Nghỉ học' | 'Chuyển trường' | 'ARCHIVED';
  studentActivationToken?: string;
  parentActivationToken?: string;
  activationTokenStudent?: string;
  activationTokenParent?: string;
  tokenStudentStatus?: 'active' | 'pending' | 'revoked';
  tokenParentStatus?: 'active' | 'pending' | 'revoked';
  tokenRevoked?: boolean;
}

export type TrainingCategory = 
  | 'Đi trễ'
  | 'Nghỉ có phép'
  | 'Nghỉ không phép'
  | 'Vi phạm nội quy'
  | 'Việc tốt'
  | 'Tiến bộ'
  | 'Khen thưởng'
  | 'Học tập'
  | 'Nề nếp & Kỷ luật'
  | 'Phong trào & Hoạt động'
  | 'Việc tốt & Giúp đỡ'
  | 'Khác';

export interface PointTransaction {
  id: string;
  studentId?: string;
  studentIds?: string[];
  studentName?: string;
  studentGroup?: number;
  classId?: string;
  ruleId?: string;
  ruleTitle?: string;
  points: number; // positive or negative
  category?: TrainingCategory | string;
  title?: string;
  reason?: string;
  description?: string;
  proposedByRole?: UserRole;
  proposedByName?: string;
  recordedBy?: string;
  approvedBy?: string;
  approvedAt?: string;
  approved?: boolean;
  rejectedReason?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'APPROVED' | 'PENDING' | 'REJECTED';
  reviewStatus?: 'pending' | 'approved' | 'rejected';
  parentNotificationStatus?: 'NOT_NOTIFIED' | 'PREPARED' | 'SENT';
  parentNotifiedAt?: string;
  parentNotifiedBy?: string;
  evidenceFiles?: AttachedFile[];
  eventDate?: string;
  eventTime?: string;
  createdByRole?: UserRole | string;
  createdByUserId?: string;
  createdAt?: string;
  timestamp?: string;
  date?: string;
  parentVisible?: boolean;
  sourceType?: 'ACTIVITY_EVALUATION' | 'MANUAL' | 'DISCIPLINE' | 'STUDY' | 'SYSTEM';
  sourceId?: string;
  sourceEventKey?: string;
  reversalOfTransactionId?: string;
  isReversal?: boolean;
  isReversed?: boolean;
}

export interface CurrentStudyPeriodResult {
  status: 'BEFORE_SCHOOL_YEAR' | 'STUDY_WEEK' | 'BREAK' | 'AFTER_SCHOOL_YEAR';
  weekNumber?: number;
  semester?: 'HKI' | 'HKII';
  schoolYearLabel: string;
  weekStart?: Date;
  weekEnd?: Date;
  breakName?: string;
  badgeText: string;
  statusText: string;
  dateRangeFormatted?: string;
  isHoliday?: boolean;
}

export type TrainingTransaction = PointTransaction;

export interface PointRuleConfig {
  id: string;
  title: string;
  points?: number;
  defaultPoints?: number;
  active?: boolean;
  category: TrainingCategory | string;
  icon?: string;
  description?: string;
  isCustom?: boolean;
  [key: string]: any;
}

export type LaurelStage = 'seed' | 'sprout' | 'sapling' | 'tree' | 'bloom' | 'SEED' | 'SPROUT' | 'SAPLING' | 'BIG_TREE' | 'BLOOMING';

export interface LaurelTree {
  studentId: string;
  studentName?: string;
  studentAvatar?: string;
  studentGroup?: number;
  group?: number;
  currentPoints: number; // 0 - 99 for current cycle
  totalPoints?: number;
  currentStage?: string;
  leavesCount?: number;
  flowersCount?: number;
  updatedBy?: string;
  currentCyclePoints?: number;
  completedTrees?: number;
  stage?: LaurelStage;
  stageName?: string;
  icon?: string;
  totalLifetimePoints?: number;
  totalPointsEarned?: number;
  pointsInCurrentTree?: number;
  pointsRequiredPerTree?: number;
  currentLevel?: number;
  currentRankLevel?: number;
  levelName?: string;
  badges?: string[];
  history?: any[];
}

export type StudentLaurelTree = LaurelTree;

export type AssessmentMode = 'COMMENT_ONLY' | 'SCORE_AND_COMMENT';

export interface SubjectGrade {
  subjectId?: string;
  subjectName: string;
  subjectCode?: string;
  assessmentMode?: AssessmentMode;
  qualitativeResult?: 'Đạt' | 'Chưa đạt' | string; // Đánh giá bằng nhận xét
  comment?: string; // Nhận xét môn học
  regularScores?: (number | undefined)[];
  tx1?: number;
  tx2?: number;
  tx3?: number;
  tx4?: number;
  tx5?: number;
  tx6?: number;
  tx7?: number;
  tx8?: number;
  midterm?: number;
  finalExam?: number;
  average?: number;
  tbHk1?: number;
  tbHk2?: number;
  tbCaNam?: number;
  note?: string;
  _overwrittenByImport?: boolean;
  _importedTxCount?: number;
}

export type StudentGrade = SubjectGrade;

export type AcademicPeriod = 'midterm_hk1' | 'final_hk1' | 'midterm_hk2' | 'final_hk2' | 'full_year';

export interface AcademicPublication {
  id?: string;
  organizationId?: string;
  classId?: string;
  studentId: string;
  schoolYearId?: string;
  assessmentPeriod?: AcademicPeriod;
  period?: AcademicPeriod;
  status: 'DRAFT' | 'PUBLISHED';
  publishedAt?: string; // e.g. "30/08/2026 lúc 16:42" or "30/08/2026 • 16:42"
  publishedBy?: string;
  publicationVersion: number;
  snapshot?: StudentAcademicRecord;
}

export interface SubjectConfig {
  id: string;
  organizationId?: string;
  classId?: string;
  schoolYear?: string;
  code?: string;
  subjectCode?: string; // e.g. "TOAN", "VAN", "ENG"
  name: string;
  subjectName?: string; // alias
  shortName?: string; // alias
  category?: string;
  subjectType?: 'MANDATORY' | 'ELECTIVE' | 'ACTIVITY' | string;
  assessmentType?: 'SCORE' | 'COMMENT' | string;
  coefficient?: number;
  selected?: boolean; // Tích chọn áp dụng cho lớp trong năm học
  annualPeriods?: number; // Số tiết/Năm (ví dụ: 105, 70, 52, 35...)
  txColumnCount?: number; // 0 to 6 (hoặc 8)
  regularColumnsCount?: number; // alias
  assessmentMode?: AssessmentMode; // 'COMMENT_ONLY' | 'SCORE_AND_COMMENT'
  active?: boolean;
  isActive?: boolean; // alias
  periodsPerWeek?: number; // 1 to 5
  weeklyPeriods?: number;
  educationProgram?: 'GDTX' | 'THPT' | 'GDTX_THPT' | string;
  curriculumType?: 'GDTX' | 'THPT' | 'GDTX_THPT' | string;
  displayOrder?: number;
  timetableColor?: { bg: string; border: string; text: string; label: string } | string;
  color?: any;
  teacherName?: string;
  isCustom?: boolean;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
  [key: string]: any;
}

export interface SubjectConfigItem {
  id?: string;
  subjectName: string;
  name?: string;
  regularColumnsCount: number; // 1 to 6
  periodsPerWeek: number; // 1 to 5
  isActive: boolean;
  color?: { bg: string; border: string; text: string; label: string };
}

export interface StudentAcademicRecord {
  id?: string;
  studentId: string;
  studentName?: string;
  period: AcademicPeriod | string;
  semester?: 'HK1' | 'HK2' | string;
  grades: SubjectGrade[] | Record<string, any>;
  teacherComment?: string; // Nhận xét của GVCN
  teacherEvaluation?: string; // alias
  academicSummary?: string; // Tổng kết Kết quả học tập
  conductSummary?: string; // Tổng kết Kết quả rèn luyện
  conductResult?: 'Tốt' | 'Khá' | 'Đạt' | 'Chưa đạt' | string; // Kết quả rèn luyện chính thức
  academicClassification?: string;
  conductClassification?: string;
  overallAverage?: number;
  strongestSubject?: string; // Môn thế mạnh (VD: "Toán học", "Tiếng Anh")
  improvementSubject?: string; // Môn cần chú ý / bồi dưỡng
  excusedAbsences?: number; // Số buổi nghỉ có phép
  unexcusedAbsences?: number; // Số buổi nghỉ không phép
  publishedToStudent?: boolean; // Công bố cho Học viên
  publishedToParent?: boolean; // Công bố cho Phụ huynh
  publishedAt?: string;
  publishedBy?: string;
  publicationVersion?: number;
  publicationStatus?: 'DRAFT' | 'PUBLISHED';
  commentUpdatedAt?: string;
  commentUpdatedBy?: string;
  highestSubject?: { name: string; score: number };
  lowestSubject?: { name: string; score: number };
  updatedAt?: string;
  parentVisible?: boolean;
  // Legacy fields retained for migration safety but cleared of GPA / rank / classification
  gpa?: number;
  conduct?: string;
  rankInClass?: number;
  learningTitle?: string;
  [key: string]: any;
}

export type AcademicRecord = StudentAcademicRecord;

export interface SharedGradeFile {
  id: string;
  title: string;
  description?: string;
  file: AttachedFile;
  period?: AcademicPeriod;
  semester?: 'HK1' | 'HK2';
  schoolYear: string;
  targetType: 'class' | 'student';
  studentId?: string;
  studentName?: string;
  teacherVisible?: boolean;
  parentVisible: boolean;
  studentVisible: boolean;
  uploadedBy: string;
  uploadedAt: string;
}

export interface PeriodTimeConfig {
  period: number;
  session: 'morning' | 'afternoon';
  startTime: string;
  endTime: string;
}

export interface TimetableSlot {
  id?: string;
  dayOfWeek: number; // 2 -> 7
  period: number; // 1 to 5
  subject: string;
  teacherName: string;
  room: string;
}

export interface Assignment {
  id: string;
  subject: string;
  title: string;
  description: string;
  dueDate: string;
  status: 'pending' | 'completed';
}

export interface TimetablePeriod {
  period: number; // 1 to 5
  subject: string;
  teacher: string;
  room?: string;
  note?: string;
  assignment?: LessonAssignment;
}

export interface DayTimetable {
  dayOfWeek: 'Thứ 2' | 'Thứ 3' | 'Thứ 4' | 'Thứ 5' | 'Thứ 6' | 'Thứ 7';
  morningPeriods: TimetablePeriod[];
  afternoonPeriods: TimetablePeriod[];
}

export interface TimetableVersion {
  id?: string;
  versionName?: string;
  semester?: 'HK1' | 'HK2';
  validFrom?: string;
  validTo?: string;
  isActive?: boolean;
  isApplied?: boolean;
  appliedAt?: string;
  updatedAt?: string;
  schedule?: DayTimetable[];
  academicYear?: string;
  classId?: string;
  [key: string]: any;
}

export interface TimetableSchedule {
  id?: string;
  versionName?: string;
  semester?: 'HK1' | 'HK2';
  validFrom?: string;
  validTo?: string;
  isActive?: boolean;
  schedule?: any;
  activeVersionId?: string;
  versions?: any[];
  [key: string]: any;
}

export interface LessonAssignment {
  id: string;
  dayOfWeek?: string;
  period?: number;
  subject?: string;
  title?: string;
  content?: string;
  description?: string;
  date?: string;
  assigned_date?: string;
  homework?: string;
  preparation?: string;
  suppliesNeeded?: string;
  deadline?: string;
  dueDate?: string;
  notes?: string;
  attachments?: AttachedFile[];
  pinnedToOverview?: boolean;
  isPinned?: boolean;
  bgColor?: string;
  textColor?: string;
  bg_color?: string;
  text_color?: string;
  authorId?: string;
  authorName?: string;
  createdByName?: string;
  createdByRole?: UserRole;
  authorRole?: UserRole;
  status?: 'approved' | 'pending' | 'rejected' | 'completed';
  createdAt?: string;
  updatedAt?: string;
  comments?: Comment[];
  tenantId?: string;
  tenant_id?: string;
  classId?: string;
  class_id?: string;
  submissionCount?: number;
  [key: string]: any;
}

export interface ExamSchedule {
  id: string;
  title?: string;
  examTitle?: string;
  subject?: string;
  examDate?: string;
  date?: string;
  period?: string | number; // e.g. "Tiết 2-3" or 1
  startTime?: string;
  durationMinutes?: number;
  duration?: string;
  format?: 'Trắc nghiệm' | 'Tự luận' | 'Kết hợp' | 'Thực hành' | 'Vấn đáp' | string;
  examType?: '15min' | '1period' | '45min' | 'midterm' | 'final' | string;
  scope?: string;
  room?: string;
  notes?: string;
  attachments?: AttachedFile[];
  pinnedToOverview?: boolean;
  pinnedToFeed?: boolean;
  isPublished?: boolean;

  // Centralized exam fields (Kiểm tra tập trung giữa kỳ / cuối kỳ)
  isCentralized?: boolean;
  semester?: string;
  examSlot?: string;
  studentIdRange?: string;
  startDate?: string;
  endDate?: string;
  announcementTitle?: string;
  contentNotes?: string;
  scheduleImages?: string[];
  schedulePdfUrl?: string;
  createdAt?: string;
  createdBy?: string;
  [key: string]: any;
}

export interface ClassActivity {
  id: string;
  title: string;
  category: 'Văn nghệ' | 'Thể thao' | 'Tình nguyện' | 'Kỹ năng sống' | 'Chào cờ' | 'Ngoại khóa';
  date: string;
  time: string;
  location: string;
  inCharge: string;
  description: string;
  images: string[];
  attachments?: AttachedFile[];
  pinnedToOverview: boolean;
  hasReminder: boolean;
}

export interface ZaloClassSettings {
  classId: string;
  groupName: string;
  groupLink: string;
  zaloOAConfigured: boolean;
  notificationMode: 'manual' | 'auto_oa' | 'native_sheet';
}

export interface SharePayload {
  id: string;
  title: string;
  summary?: string;
  content?: string;
  category?: string;
  type?: 'post' | 'album' | 'notice' | 'exam' | 'activity' | 'student_achievement' | 'survey' | 'schedule' | 'general' | string;
  url?: string;
  isSensitive?: boolean;
  parentVisible?: boolean;
  classId?: string;
  mediaUrls?: string[];
  imageUrl?: string;
  metadata?: Record<string, any>;
  tags?: string[];
}

export interface ShareResult {
  success: boolean;
  method: 'native' | 'zalo' | 'copy_link' | 'zalo_group';
  message: string;
}

export type SubmissionStatus = 'pending' | 'approved' | 'edited_and_approved' | 'rejected';

export interface Submission {
  id: string;
  organizationId?: string;
  classId: string;
  studentId: string;
  studentName: string;
  studentGroup?: number;

  submissionType: 
    | 'point_plus' 
    | 'point_minus' 
    | 'good_deed' 
    | 'progress' 
    | 'reward' 
    | 'late' 
    | 'leave_permitted' 
    | 'leave_unpermitted' 
    | 'violation' 
    | 'data_adjustment' 
    | 'academic_error' 
    | 'training_error'
    | 'officer_report'
    | string;

  category: string;
  description: string;

  proposedPoints?: number;
  eventDate?: string;
  session?: string;

  evidence: AttachedFile[];
  evidenceFiles?: AttachedFile[]; // alias

  proposedBy: string;
  proposedById: string;
  proposedByRole: UserRole;
  proposedAt: string;

  status: SubmissionStatus;

  reviewedBy?: string;
  reviewedAt?: string;

  originalData?: any;
  approvedData?: any;

  rejectionReason?: string;
  reviewerNote?: string;

  parentVisible?: boolean;
}

export interface ParentMessage {
  id: string;
  studentId?: string;
  senderRole: 'TEACHER' | 'PARENT' | string;
  senderName: string;
  content: string;
  timestamp?: string;
  sentAt?: string;
  attachments?: AttachedFile[];
  channel?: 'IN_APP' | 'ZALO' | 'SMS' | 'EMAIL' | string;
  deletedForTeacher?: boolean;
  deletedForParent?: boolean;
  isRecalled?: boolean;
  recalledAt?: string;
  recalledByRole?: 'TEACHER' | 'PARENT' | string;
  [key: string]: any;
}

export type ParentNoticeCategory =
  | 'Thông báo'
  | 'Thư ngỏ'
  | 'Lịch họp phụ huynh'
  | 'Kế hoạch phối hợp'
  | 'Dặn dò PH'
  | 'Thông báo CMHS'
  | 'Hồ sơ cần chuẩn bị'
  | 'Lịch tư vấn'
  | 'Cần PH xác nhận'
  | 'Khác';

export interface ParentAnnouncement {
  id: string;
  title: string;
  category: ParentNoticeCategory;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorRole: UserRole;
  attachments?: AttachedFile[];
  createdAt: string;
  updatedAt?: string;
  isPinned?: boolean;
  allowComments?: boolean;
  comments?: Comment[];
  reactions?: {
    like?: string[];
    love?: string[];
    applause?: string[];
    [key: string]: string[] | undefined;
  };
  channels?: ('IN_APP' | 'ZALO' | 'SMS')[];
  eventDate?: string;
  eventTime?: string;
  location?: string;
  isCompleted?: boolean;
}

export interface ParentConversation {
  id?: string;
  studentId: string;
  studentName: string;
  studentAvatar?: string;
  parentName: string;
  parentPhone?: string;
  unreadCount?: number;
  lastMessage?: string;
  lastMessageTime?: string;
  messages: ParentMessage[];
  [key: string]: any;
}

export interface AdjustmentReport {
  id: string;
  studentId: string;
  studentName: string;
  category: 'Học tập' | 'Rèn luyện' | 'Khen thưởng' | 'Vi phạm/Kỷ luật' | 'Khác';
  description: string;
  evidenceFiles?: AttachedFile[];
  status: 'pending' | 'approved' | 'rejected';
  teacherReply?: string;
  createdAt: string;
}

export interface HollandScore {
  realistic?: number;     // R
  investigative?: number; // I
  artistic?: number;      // A
  social?: number;        // S
  enterprising?: number;  // E
  conventional?: number;  // C
  R?: number;
  I?: number;
  A?: number;
  S?: number;
  E?: number;
  C?: number;
}

export type RIASECCategory = 'R' | 'I' | 'A' | 'S' | 'E' | 'C';

export interface ONetQuestion {
  id: number;
  category: RIASECCategory;
  categoryName: string; // Thực tế, Nghiên cứu, Nghệ thuật, Xã hội, Quản lý, Nghiệp vụ
  activityText: string;
  exampleJob?: string;
}

export interface ParentCareerFeedback {
  id: string;
  parentName: string;
  parentPhone?: string;
  content: string;
  expectations?: string;
  createdAt: string;
}

export interface AICareerAnalysis {
  strengthsSummary: string;
  recommendedWorkEnvironments: string[];
  recommendedCareerClusters: string[];
  focusSchoolSubjects: string[];
  selfExplorationQuestions: string[];
  roadmap1to3Months: string[];
  fullAiText?: string;
  analyzedAt: string;
  disclaimer: string;
}

export interface CareerAssessment {
  id: string;
  workspaceId?: string;
  classId?: string;
  studentId: string;
  studentName: string;
  studentCode?: string;
  studentAvatar?: string;
  provider: 'ONET_MINI_INTEREST_PROFILER' | 'HOLLAND_RIASEC' | string;
  assessmentType: 'mini_30' | 'standard_60' | 'standard_holland' | 'radar_holland' | string;
  assessmentVersion: string;
  status: 'draft' | 'completed';
  startedAt: string;
  completedAt?: string;
  rawAnswers: Record<number, number>; // questionId -> 1..5
  scores: HollandScore;
  riasec: {
    R: number;
    I: number;
    A: number;
    S: number;
    E: number;
    C: number;
  };
  topInterestCodes: string[]; // e.g. ["S", "E", "C"]
  primaryCode: string; // e.g. "SEC"
  codeMeaning?: string; // "Xã hội - Quản lý - Nghiệp vụ"
  suggestedMajors: string[];
  suggestedCareers: string[];
  targetUniversities?: string[];
  expectedExamCombinations?: string[]; // Tổ hợp môn (A00, D01...)
  parentFeedbacks?: ParentCareerFeedback[];
  aiAnalysis?: AICareerAnalysis;
  source: string; // "O*NET Interest Profiler Short Form - US Department of Labor"
  attemptNumber: number;
  answers?: Record<number, number>;
  rawScores?: Record<string, number>;
  normalizedScores?: Record<string, number>;
  resultSummary?: string;
  topResults?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CareerProfile {
  studentId: string;
  hollandScores?: HollandScore;
  hollandResult?: any; // backward compatibility
  primaryCode?: string; // e.g. "SEC"
  suggestedMajors?: string[];
  targetUniversities?: string[];
  examGroups?: string[]; // e.g. ["A00 (Toán, Lý, Hóa)", "D01 (Toán, Văn, Anh)"]
  notes?: string;
  latestAssessmentId?: string;
  assessmentsCount?: number;
  postHighSchoolPlan?: string;
  careerClarity?: string;
  interestFields?: string[];
  targetCareerAndSchool?: string;
  careerConcerns?: string[];
  selfReportedHollandCode?: string;
  sourceSurveyId?: string;
  mbtiResult?: MBTIResult;
  workValuesResult?: WorkValuesResult;
  mbtiHistory?: MBTIResult[];
  workValuesHistory?: WorkValuesResult[];
  hollandHistory?: CareerAssessment[];
  savedItems?: CareerSavedItem[];
  [key: string]: any;
}

// =========================================================================
// MBTI CAREER ORIENTATION TYPES (FRAMEWORK REFERENCE - NON-DIAGNOSTIC)
// =========================================================================
export interface MBTIQuestion {
  id: number;
  dimension: 'EI' | 'SN' | 'TF' | 'JP' | string;
  dimensionName?: string;
  prompt?: string;
  text?: string;
  optionA: {
    text: string;
    trait?: 'E' | 'S' | 'T' | 'J' | string;
    value?: 'E' | 'S' | 'T' | 'J' | string;
  };
  optionB: {
    text: string;
    trait?: 'I' | 'N' | 'F' | 'P' | string;
    value?: 'I' | 'N' | 'F' | 'P' | string;
  };
}

export interface MBTITypeInfo {
  code: string;
  title: string;
  description: string;
  strengths: string[];
  learningWorkEnvironments: string[];
  recommendedCareers: string[];
  notesForGrowth: string[];
  recommendedMajors: string[];
}

export interface MBTIResult {
  id?: string;
  studentId?: string;
  classId?: string;
  assessmentType?: string;
  attemptNumber?: number;
  startedAt?: string;
  completedAt?: string;
  version?: string;
  answers?: Record<number, 'A' | 'B'>;
  rawAnswers?: Record<number, 'A' | 'B'>;
  code: string;
  title: string;
  description: string;
  rawScores?: Record<string, number>;
  normalizedScores?: Record<string, number>;
  resultSummary?: string;
  topResults?: string[];
  dimensionScores: {
    E: number;
    I: number;
    S: number;
    N: number;
    T: number;
    F: number;
    J: number;
    P: number;
  };
  percentages?: {
    EI: { dominant: 'E' | 'I'; percent: number };
    SN: { dominant: 'S' | 'N'; percent: number };
    TF: { dominant: 'T' | 'F'; percent: number };
    JP: { dominant: 'J' | 'P'; percent: number };
  };
  strengths?: string[];
  learningWorkEnvironments?: string[];
  recommendedCareers?: string[];
  notesForGrowth?: string[];
  recommendedMajors?: string[];
  disclaimer?: string;
  testedAt: string;
  createdAt?: string;
}

// =========================================================================
// WORK VALUES & INTERESTS ASSESSMENT TYPES (6 STANDARD VALUE DIMENSIONS)
// =========================================================================
export type WorkValueCategoryKey =
  | 'STABILITY'     // 1. Ổn định và an toàn
  | 'ACHIEVEMENT'   // 2. Thu nhập và thành tựu
  | 'AUTONOMY'      // 3. Tự chủ
  | 'GROWTH'         // 4. Phát triển và học hỏi
  | 'CONTRIBUTION'  // 5. Cống hiến và đóng góp xã hội
  | 'CREATIVITY'    // 6. Sáng tạo và đổi mới
  | 'PEOPLE'        // Backward-compat
  | 'DATA'          // Backward-compat
  | 'TECH'          // Backward-compat
  | 'CHALLENGE'     // Backward-compat
  | 'COLLABORATION';// Backward-compat

export interface WorkValuesQuestion {
  id: number;
  category: WorkValueCategoryKey;
  categoryName: string;
  text: string;
}

export interface WorkValuesResult {
  id?: string;
  studentId?: string;
  classId?: string;
  assessmentType?: string;
  attemptNumber?: number;
  startedAt?: string;
  completedAt?: string;
  version?: string;
  answers?: Record<number, number>;
  rawAnswers?: Record<number, number>;
  scores: Record<string, number>;
  rawScores?: Record<string, number>;
  normalizedScores?: Record<string, number>;
  resultSummary?: string;
  topResults?: string[];
  topInterests?: Array<{ key: string; name: string; score: number; maxScore: number; description: string }>;
  topValues: Array<{ key: string; name: string; score: number; maxScore: number; description: string }>;
  recommendedWorkStyles: string[];
  recommendedCareers: string[];
  recommendedMajors: string[];
  testedAt: string;
  createdAt?: string;
  disclaimer: string;
}

// =========================================================================
// CAREER OCCUPATIONS, INSTITUTIONS, ADMISSION UPDATES & SAVED ITEMS
// =========================================================================
export interface CareerOccupation {
  id: string;
  name: string;
  group: string;
  description: string;
  hollandTraits?: string[];
  dailyTasks?: string[];
  academicTrackRecommendations?: string;
  careerProspects?: string;
  salaryRange?: string;
  mainTasks?: string[];
  workEnvironment?: string;
  requiredSkills?: string[];
  relatedSubjects?: string[];
  relatedHolland?: RIASECCategory[];
  relatedWorkValues?: string[];
  relatedMajors?: string[];
  trainingRoadmap?: string;
  notes?: string;
  [key: string]: any;
}

export interface CareerInstitution {
  id: string;
  code: string;
  name: string;
  type: TrainingLevel;
  province: string;
  region: RegionType;
  officialWebsite: string;
  admissionWebsite: string;
  isVerified: boolean;
  checkedAt: string;
  description?: string;
  phone?: string;
  address?: string;
}

export interface CareerAdmissionUpdate {
  id: string;
  institutionId: string;
  institutionName: string;
  title: string;
  academicYear: string;
  contentUrl: string;
  publishedDate: string;
  checkedAt: string;
  sourceType: string;
  summary?: string;
  status?: 'active' | 'archived';
  verifiedSource?: boolean;
}

export type SavedItemType = 'occupation' | 'major' | 'institution';
export type SavedItemStatus = 'exploring' | 'reviewed' | 'need_info' | 'decided';

export interface CareerSavedItem {
  id: string;
  studentId: string;
  itemType: SavedItemType;
  itemId: string;
  itemTitle: string;
  itemSubtitle?: string;
  status: SavedItemStatus;
  notes?: string;
  savedAt: string;
  data?: any;
}

// =========================================================================
// MAJORS & BENCHMARKS TYPES FOR GDTX
// =========================================================================
export type TrainingLevel = 'Đại học' | 'Cao đẳng' | 'Giáo dục nghề nghiệp' | 'dai_hoc' | 'cao_dang' | 'nghe' | 'all';
export type BenchmarkTier = 'Cao' | 'Khá' | 'Trung bình' | 'Thấp hơn' | 'Xét tuyển học bạ/Tốt nghiệp' | 'top_tier' | 'high_tier' | 'mid_tier' | 'standard_tier' | 'all' | 'Top đầu (> 26 điểm)' | 'Khá giỏi (22 - 26 điểm)' | 'Trung bình khá (18 - 22 điểm)' | 'Cơ hội rộng mở (< 18 điểm)' | string;
export type RegionType = 'TP.HCM' | 'Hà Nội' | 'Miền Nam' | 'Miền Trung' | 'Miền Bắc' | 'Toàn quốc' | 'mien_bac' | 'mien_trung' | 'mien_nam' | 'all' | 'Miền Trung & Tây Nguyên' | string;

export interface MajorSchoolOption {
  schoolName: string;
  schoolCode?: string;
  tier?: 'Mức điểm cao' | 'Mức điểm trung bình' | 'Mức điểm vừa sức' | 'Cao đẳng' | 'Giáo dục nghề nghiệp' | string;
  benchmark?: string;
  region: string;
  admissionNote?: string;
  score?: number;
  [key: string]: any;
}

export type TypicalInstitution = MajorSchoolOption;

export interface CareerMajorItem {
  id: string;
  code: string;
  name: string;
  group: string;
  trainingLevels?: TrainingLevel[];
  examGroups?: string[];
  admissionMethods?: string[];
  suitableHolland?: string[];
  suitableMbti?: string[];
  description?: string;
  prospects?: string;
  benchmarkTier?: BenchmarkTier;
  scoreRangeDescription?: string;
  typicalInstitutions?: MajorSchoolOption[];
  dataYear?: string | number;
  dataSource?: string;
  region?: string;
  examCombinations?: string[];
  benchmarkRange?: string;
  featuredInstitutions?: string[];
  careerProspects?: string | string[];
  pros?: string;
  cons?: string;
  [key: string]: any;
}

export interface BenchmarkRecord {
  id: string;
  institutionCode: string;
  institutionName: string;
  institutionType?: TrainingLevel;
  majorCode: string;
  majorName: string;
  trainingLevel?: TrainingLevel;
  benchmarkScore: string;
  benchmarkTier?: BenchmarkTier;
  examGroups?: string[];
  admissionMethod?: string;
  region?: RegionType | string;
  city?: string;
  website?: string;
  dataYear?: string;
  dataSource?: string;
  note?: string;
  year?: number | string;
  examCombination?: string;
  totalQuota?: number;
  level?: string;
  tier?: string;
  [key: string]: any;
}

export interface GoogleIntegrationSettings {
  forms: Array<{
    id: string;
    name: string;
    url: string;
    description: string;
    target: 'Học sinh' | 'Phụ huynh' | 'Cả hai';
    sheetUrl?: string;
    lastSynced?: string;
  }>;
  connectedSheetUrl?: string;
  isDriveConnected: boolean;
  isCalendarConnected: boolean;
}

export interface AuditLog {
  id: string;
  actorId?: string;
  userId?: string; // alias
  userName?: string; // alias
  actorRole?: UserRole;
  action: 
    | 'SUBMISSION_CREATED'
    | 'SUBMISSION_APPROVED'
    | 'SUBMISSION_EDITED'
    | 'SUBMISSION_REJECTED'
    | 'ALBUM_POST_CREATED'
    | 'ALBUM_POST_DELETED'
    | 'COMMENT_CREATED'
    | 'COMMENT_DELETED'
    | 'CONTENT_SHARED'
    | 'ZALO_SHARE_REQUESTED'
    | string;
  targetId?: string;
  classId?: string;
  timestamp: string;
  metadata?: any;
  performedBy?: string; // alias
  role?: UserRole; // alias
  target?: string; // alias
  details?: string; // alias
  [key: string]: any;
}

export interface GraduationScores {
  math?: number;
  literature?: number;
  elective1?: number;
  elective2?: number;
}

export interface GraduationExamComment {
  id: string;
  studentId: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  authorAvatar?: string;
  content: string;
  parentCommentId?: string; // For 1-level nested replies
  createdAt: string;
  updatedAt?: string;
}

export interface GraduationRegistration {
  id: string;
  studentId: string;
  studentName: string;
  studentCode: string;
  studentGroup: number;
  compulsorySubjects: string[]; // ['Toán', 'Ngữ văn']
  electiveSubject1: string; // e.g. "Vật lí"
  electiveSubject2: string; // e.g. "Hóa học"
  scores: GraduationScores;
  gpa10?: number; // Điểm trung bình cả năm lớp 10
  gpa11?: number; // Điểm trung bình cả năm lớp 11
  gpa12: number; // Điểm trung bình cả năm lớp 12
  gpaAllYears?: number; // ĐTB các năm học = (10*1 + 11*2 + 12*3) / 6
  isForeignLanguageExempt?: boolean; // Được miễn thi ngoại ngữ
  priorityBonus: number; // Điểm ưu tiên (0 - 2.0)
  encouragementBonus: number; // Điểm khuyến khích (0 - 4.0)
  calculatedScore?: number; // Điểm xét tốt nghiệp THPT (làm tròn 2 chữ số)
  status: 'qualified' | 'at_risk' | 'unqualified' | 'pending';
  statusReason?: string;
  isFlagged?: boolean; // Học viên CẦN CHÚ Ý (Teacher flagged)
  flagReasons?: string[]; // Lý do theo dõi
  teacherNote?: string; // Ghi chú theo dõi của GVCN (TEACHER_ONLY)
  parentFeedback?: string; // Góp ý / Lời nhắn động viên của Phụ huynh cho con
  schoolYear?: string;
  source?: string; // e.g. "GRADE12_START_YEAR_SURVEY" | "STUDENT_MANUAL"
  sourceSurveyId?: string;
  initialSurveyChoice?: boolean;
  hasStudentCustomizedChoice?: boolean; // Set to true if student manually saved in Graduation tab
  registeredAt: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface GraduationChoiceHistory {
  id: string;
  tenantId?: string;
  classId?: string;
  schoolYear?: string;
  studentId: string;
  electiveSubject1: string;
  electiveSubject2: string;
  source: 'START_YEAR_SURVEY' | 'STUDENT_UPDATE' | 'SYSTEM_MIGRATION';
  sourceSurveyId?: string;
  note?: string;
  changedAt: string;
  changedBy?: string;
}

export interface GraduationRuleConfig {
  schoolYear: string;
  ruleVersion: string;
  effectiveFrom: string;
  effectiveTo?: string;
  officialSourceUrl: string;
  officialDocumentName: string;
  compulsorySubjects: string[];
  electiveSubjectCount: number;
  minimumSubjectScore: number; // 1.0 (strict > 1.0)
  minimumGraduationScore: number; // 5.0
  grade10Weight: number; // 1
  grade11Weight: number; // 2
  grade12Weight: number; // 3
  examWeight: number; // 0.5 (50%)
  transcriptWeight: number; // 0.5 (50%)
  foreignLanguageExemptionRule: string;
  graduationFormula: string;
  roundingPrecision: number; // 2
  priorityRules?: Array<{ code: string; label: string; bonus: number }>;
  incentiveRules?: Array<{ code: string; label: string; maxBonus: number }>;
  updatedAt: string;
}

export type GraduationArticleCategory =
  | 'Quy chế'
  | 'Lịch thi'
  | 'Đăng ký dự thi'
  | 'Hướng dẫn'
  | 'Ưu tiên'
  | 'Khuyến khích'
  | 'Tuyển sinh'
  | 'Thông báo'
  | 'Khác';

export interface OfficialGraduationArticle {
  id: string;
  title: string;
  summary: string;
  content?: string;
  sourceName: string;
  sourceDomain: string;
  sourceUrl: string;
  publishedAt: string;
  fetchedAt: string;
  schoolYear?: string;
  admissionYear?: string;
  examYear?: string;
  category: GraduationArticleCategory;
  isOfficial: boolean;
  isPinned: boolean;
  isImportant?: boolean;
  effectiveDate?: string;
  createdBy?: string;
  creatorRole?: UserRole;
  authorName?: string;
  authorRole?: UserRole;
  scope?: 'SYSTEM' | 'CLASS';
  classId?: string;
  status?: 'ACTIVE' | 'ARCHIVED';
  attachments?: AttachedFile[];
}

export interface SubjectColorSetting {
  subject: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
}

// ==========================================
// STUDENT SURVEY MODULE (GRADE 12 START YEAR & TEMPLATES)
// ==========================================

export type StudentSurveyStatus = 'DRAFT' | 'SUBMITTED' | 'REVIEWED';

export type StudentSurveyType = 'GRADE12_START_YEAR' | 'CUSTOM' | string;

export type SurveyTemplateStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type SurveyQuestionType =
  | 'SHORT_TEXT'
  | 'LONG_TEXT'
  | 'SINGLE_CHOICE'
  | 'MULTI_CHOICE'
  | 'DROPDOWN'
  | 'SCALE'
  | 'GRID'
  | 'GRID_SINGLE'
  | 'GRID_MULTI'
  | 'DATE'
  | 'TIME'
  | 'DURATION';

export interface SurveyQuestion {
  id: string;
  key: string;
  title: string;
  description?: string;
  type: SurveyQuestionType;
  required: boolean;
  options?: string[];
  allowOther?: boolean;
  maxSelections?: number;
  scaleMin?: number;
  scaleMax?: number;
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
  scaleMode?: 'NUMERIC' | 'CUSTOM';
  gridRows?: string[];
  gridColumns?: string[];
  rows?: string[];
  columns?: string[];
  dateIncludeYear?: boolean;
  visibility?: 'NORMAL' | 'TEACHER_ONLY';
  order: number;
  needsReview?: boolean;
  reviewReason?: string;
  externalSourceId?: string;
}

export interface SurveySection {
  id: string;
  title: string;
  description?: string;
  order: number;
  questions: SurveyQuestion[];
}

export interface SurveyExternalSource {
  provider: 'GOOGLE_FORMS' | 'WORD' | 'AI';
  formId?: string;
  url?: string;
  responderUri?: string;
  revisionId?: string;
  importedAt?: string;
  lastSyncAt?: string;
}

export interface SurveyTemplate {
  id: string;
  tenantId: string;
  classId?: string;
  schoolYear?: string;
  title: string;
  description?: string;
  surveyType: string;
  version: number;
  status: SurveyTemplateStatus;
  sections: SurveySection[];
  targetAudience?: ('TEACHER' | 'STUDENT' | 'PARENT')[];
  scope?: 'SYSTEM' | 'WORKSPACE' | 'CLASS';
  creatorRole?: 'SUPER_ADMIN' | 'TEACHER';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  publishedAt?: string;
  publishedBy?: string;
  source?: 'MANUAL' | 'AI_PASTE' | 'WORD_PASTE' | 'DOCX_IMPORT' | 'GOOGLE_FORM_IMPORT' | 'SYSTEM_DEFAULT';
  externalSource?: SurveyExternalSource;
}

export interface Grade12StartYearSurveyAnswers {
  contact: {
    phone?: string;
    emergencyContactName?: string;
    emergencyContactRelationship?: string;
    emergencyContactPhone?: string;
    livingWith?: string[];
  };

  familyAndLearningConditions: {
    learningConditions?: string[];
    familyWorkSupportLevel?: string;
    familySituation?: string;
    familyNote?: string;
  };

  healthAndWellbeing: {
    healthStatus?: string[];
    healthSupportNote?: string;
    emotionalStatus?: string;
    teacherMeetingRequest?: string;
  };

  academicSelfAssessment: {
    strongSubjects?: string[];
    supportSubjects?: string[];
    difficulties?: string[];
    teacherSupportNeeds?: string[];
  };

  goals: {
    academicGoal?: string;
    personalImprovementGoal?: string;
    actionAndSupportPlan?: string;
  };

  graduationPlan: {
    electiveSubject1?: string;
    electiveSubject2?: string;
    confidence?: string;
    choiceFactors?: string[];
    needTeacherAdvice?: string;
  };

  careerOrientation: {
    postHighSchoolPlan?: string;
    careerClarity?: string;
    interestFields?: string[];
    targetCareerAndSchool?: string;
    concerns?: string[];
    previousHollandCode?: string;
  };

  talentsAndDigitalSkills: {
    talents?: string[];
    willingToSupportActivities?: string;
    digitalSkillMatrix?: Record<string, string>;
    digitalAiUses?: string[];
    aiVerificationHabit?: string;
    willingToJoinTechTeam?: string;
  };

  classAndTeacherExpectations: {
    classExpectations?: string[];
    teacherExpectations?: string[];
  };

  leadershipProposal: {
    desiredPosition?: string;
  };

  seatingPreference: {
    preference?: string;
  };

  privateTeacherMessage: {
    content?: string;
  };

  consent: {
    confirmed: boolean;
  };

  otherText?: Record<string, string>;
}

export interface StudentSurveyResponse {
  id: string;
  tenantId: string;
  classId: string;
  schoolYear: string;
  studentId: string;
  surveyType: StudentSurveyType;
  surveyTemplateId?: string;
  surveyTemplateVersion?: number;
  status: StudentSurveyStatus;
  version: number;
  answers: Grade12StartYearSurveyAnswers | Record<string, any>;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  source: 'APP';
  syncState?: SurveySyncState;
}

// ==========================================
// PERIODICAL CONDUCT EVALUATION (ĐÁNH GIÁ RÈN LUYỆN ĐỊNH KỲ)
// ==========================================

export type ConductEvaluationPeriodType = 'MID_SEMESTER_1' | 'SEMESTER_1' | 'MID_SEMESTER_2' | 'SEMESTER_2' | 'FULL_YEAR' | 'CUSTOM';
export type ConductEvaluationGrade = 'Tốt' | 'Khá' | 'Đạt' | 'Chưa đạt';

export interface ConductStudentEvaluation {
  studentId: string;
  studentCode: string;
  studentName: string;
  group: number;
  plusPoints: number;
  minusPoints: number;
  netPoints: number;
  violationCount: number;
  praiseCount: number;
  selfAssessment: ConductEvaluationGrade | string;
  selfAssessmentSource?: string;
  selfAssessmentSubmittedAt?: string;
  collectiveAssessment: ConductEvaluationGrade | string;
  teacherAssessment: ConductEvaluationGrade | string;
  finalGrade: ConductEvaluationGrade | string;
  autoSummaryNote: string;
  teacherNote: string;
  status: 'DRAFT' | 'SAVED' | 'FINALIZED';
  updatedAt: string;
  updatedBy?: string;
}

export interface ConductMeetingMinutes {
  meetingDate: string;
  meetingTime?: string;
  meetingLocation: string;
  presidedBy: string; // Chủ trì: GVCN
  secretary: string;  // Thư ký: Lớp trưởng / Bí thư
  attendeesCount: number;
  absentCount: number;
  absentReason?: string;
  meetingAgenda?: string;
  collectiveOpinion?: string;
  teacherConclusion?: string;
}

export interface ConductPeriodEvaluation {
  id: string;
  tenantId: string;
  classId: string;
  schoolYear: string;
  periodType: ConductEvaluationPeriodType;
  periodTitle: string;
  startDate?: string;
  endDate?: string;
  status: 'DRAFT' | 'FINALIZED';
  evaluations: ConductStudentEvaluation[];
  meetingMinutes?: ConductMeetingMinutes;
  createdAt: string;
  updatedAt: string;
  finalizedAt?: string;
  finalizedBy?: string;
}


export type SurveySyncStatus = 'NOT_SYNCED' | 'PARTIAL' | 'SYNCED' | 'REVIEW_REQUIRED' | 'FAILED';

export type SurveySyncMode = 'AUTO_SYNC' | 'REVIEW_REQUIRED' | 'TEACHER_ONLY' | 'KEEP_IN_SURVEY';

export type SurveySyncTargetStatus = 'SYNCED' | 'PENDING_REVIEW' | 'SKIPPED' | 'FAILED' | 'APPROVED' | 'REJECTED';

export interface SurveySyncedTarget {
  fieldGroup: string;
  mode: SurveySyncMode;
  targetModule?: string;
  targetId?: string;
  status: SurveySyncTargetStatus;
  message?: string;
  syncedAt?: string;
}

export interface SurveySyncState {
  id: string; // usually surveyId
  tenantId: string;
  surveyId: string;
  studentId: string;
  status: SurveySyncStatus;
  lastSyncAt: string;
  syncVersion: number;
  errors: string[];
  syncedTargets: SurveySyncedTarget[];
}

export type SurveyProposalCategory =
  | 'CONTACT_UPDATE'
  | 'CLASS_OFFICER_CANDIDACY'
  | 'SEATING_PREFERENCE'
  | 'GRADUATION_ELECTIVES'
  | 'HEALTH_SENSITIVE'
  | 'PSYCHOLOGICAL_SENSITIVE'
  | 'FAMILY_DIFFICULTY'
  | 'PRIVATE_SUPPORT_REQUEST'
  | 'CONDUCT_SELF_EVALUATION';

export type SurveyProposalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVIEWED_NO_ACTION';

export interface SurveySyncProposal {
  id: string;
  tenantId: string;
  templateId?: string;
  surveyId: string;
  studentId: string;
  studentName: string;
  studentCode?: string;
  category: SurveyProposalCategory;
  title: string;
  currentValue?: any;
  proposedValue: any;
  originalValue?: any;
  isEditedByTeacher?: boolean;
  details?: string;
  visibility: 'TEACHER_ONLY' | 'STAFF_ONLY';
  status: SurveyProposalStatus;
  actionType?: 'SPECIAL_ATTENTION' | 'UPDATE_CONTACT' | 'ADVICE_SESSION' | 'SEATING' | 'OFFICER_NOTE' | 'GENERAL_NOTE' | 'CONDUCT_SYNC';
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SurveySyncAudit {
  id: string;
  tenantId: string;
  surveyId: string;
  studentId: string;
  studentName?: string;
  action: string;
  fieldGroup: string;
  oldValue?: any;
  newValue?: any;
  performedBy: string;
  performedByRole: UserRole;
  performedAt: string;
  details?: string;
}

/* =========================================================================
   SUPPORT CENTER, FEEDBACK & FEATURE SUGGESTION DOMAIN TYPES
   ========================================================================= */

export type SupportTicketCategory =
  | 'ACCOUNT'
  | 'LOGIN'
  | 'DATA'
  | 'FEATURE'
  | 'UI'
  | 'USABILITY'
  | 'OTHER';

export type SupportTicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type SupportTicketStatus =
  | 'NEW'
  | 'PROCESSING'
  | 'RESPONDED'
  | 'RESOLVED'
  | 'CLOSED';

export interface SupportTicketHistoryItem {
  id: string;
  ticketId: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: 'CREATE' | 'UPDATE_STATUS' | 'ADD_RESPONSE' | 'ADD_NOTE' | 'RESOLVE' | 'CLOSE';
  oldStatus?: SupportTicketStatus;
  newStatus?: SupportTicketStatus;
  message?: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  ticketCode: string;
  title: string;
  description: string;
  category: SupportTicketCategory;
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
  userId: string;
  userRole: UserRole;
  userName: string;
  userEmail?: string;
  userPhone?: string;
  tenantId?: string;
  relatedModule?: string;
  adminResponse?: string;
  adminNotes?: string;
  assignedAdminId?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  history?: SupportTicketHistoryItem[];
}

export type FeedbackType = 'RATING_FEEDBACK' | 'BUG_REPORT' | 'FEATURE_SUGGESTION';

export type FeedbackCategory =
  | 'BUG'
  | 'USABILITY'
  | 'FEATURE'
  | 'UI'
  | 'SPEED'
  | 'OTHER';

export type FeedbackStatus =
  | 'NEW'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'IN_DEVELOPMENT'
  | 'IMPLEMENTED'
  | 'REJECTED'
  | 'RESOLVED';

export interface UserFeedback {
  id: string;
  type: FeedbackType;
  rating?: number; // 1 to 5 stars
  category: FeedbackCategory;
  relatedModule?: string;
  title?: string;
  content: string;
  isAnonymous: boolean;
  userId?: string;
  userRole: UserRole;
  userName?: string;
  userEmail?: string;
  tenantId?: string;
  status: FeedbackStatus;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupportFeedbackStats {
  tickets: {
    total: number;
    new: number;
    processing: number;
    inProgress?: number;
    responded: number;
    resolved: number;
    closed: number;
    byCategory?: Record<string, number>;
  };
  feedbacks: {
    total: number;
    ratingsCount: number;
    ratings?: number;
    averageRating: number;
    bugsCount: number;
    bugs?: number;
    suggestionsCount: number;
    suggestions?: number;
    byRating: Record<number, number>; // 1: n, 2: n, ...
    byRole: Record<string, number>;
    byModule: Record<string, number>;
    byStatus: Record<string, number>;
  };
}

// =========================================================================
// BACKWARD COMPATIBILITY ALIASES & INTERFACES
// =========================================================================
export type PointRule = PointRuleConfig;

export interface ViolationRule {
  id: string;
  code?: string;
  name?: string;
  title?: string; // alias
  points?: number; // alias
  pointsDeducted?: number;
  category?: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  description?: string;
  [key: string]: any;
}

export interface AttendanceRule {
  id: string;
  name?: string;
  title?: string; // alias
  points?: number; // alias
  pointsDeducted?: number;
  category?: string;
  description?: string;
  type?: string;
  [key: string]: any;
}

export interface DisciplineRecord {
  id: string;
  studentId: string;
  studentName?: string;
  violationDate: string;
  ruleId?: string;
  pointsDeducted: number;
  reason: string;
  status?: string;
  reportedBy?: string;
  reportedByName?: string;
  evidence?: string[];
  [key: string]: any;
}

export interface Survey {
  id: string;
  title: string;
  description?: string;
  createdAt?: string;
  deadline?: string;
  status?: string;
  sections?: any[];
  [key: string]: any;
}

export interface SystemNotification {
  id: string;
  title: string;
  content: string;
  type?: string;
  createdAt: string;
  read?: boolean;
  targetRole?: string;
  link?: string;
  [key: string]: any;
}

export interface GraduationPreparationRecord {
  id: string;
  studentId: string;
  studentName?: string;
  targetMajor?: string;
  targetUniversity?: string;
  examGroup?: string;
  mockScores?: Record<string, number>;
  expectedScore?: number;
  status?: string;
  notes?: string;
  [key: string]: any;
}

export type NotificationItem = any;
export type TimetableData = any;
export type GraduationChoice = any;




