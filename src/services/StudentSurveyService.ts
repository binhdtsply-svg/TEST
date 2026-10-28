/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  StudentSurveyResponse,
  StudentSurveyStatus,
  StudentSurveyType,
  Grade12StartYearSurveyAnswers
} from '../types';
import { authService } from './AuthService';
import { tenantService } from './TenantService';
import { classService } from './ClassService';
import { studentService } from './StudentService';
import { surveyTemplateService } from './SurveyTemplateService';
import { surveyRepositoryClient } from './SurveyRepositoryClient';
import { inAppNotificationService } from './InAppNotificationService';
import { surveySyncService } from './SurveySyncService';
import { safeLocalStorageSet, safeLocalStorageGet } from '../utils/storageUtils';

export const createDefaultSurveyAnswers = (): Grade12StartYearSurveyAnswers => ({
  contact: {
    phone: '',
    emergencyContactName: '',
    emergencyContactRelationship: '',
    emergencyContactPhone: '',
    livingWith: ['Bố mẹ']
  },
  familyAndLearningConditions: {
    learningConditions: ['Có góc học tập riêng yên tĩnh', 'Có máy tính/laptop kết nối mạng tốt'],
    familyWorkSupportLevel: 'Rất thuận lợi, chỉ tập trung học',
    familySituation: 'Bình thường, bố mẹ đầy đủ',
    familyNote: ''
  },
  healthAndWellbeing: {
    healthStatus: ['Sức khỏe tốt'],
    healthSupportNote: '',
    emotionalStatus: 'Thoải mái, tự tin, sẵn sàng',
    teacherMeetingRequest: 'Không cần'
  },
  academicSelfAssessment: {
    strongSubjects: [],
    supportSubjects: [],
    difficulties: [],
    teacherSupportNeeds: []
  },
  goals: {
    academicGoal: 'Học lực Giỏi',
    personalImprovementGoal: '',
    actionAndSupportPlan: ''
  },
  graduationPlan: {
    electiveSubject1: 'Chưa xác định',
    electiveSubject2: 'Chưa xác định',
    confidence: 'Khá tự tin (6.5 - 8.0 điểm)',
    choiceFactors: ['Phù hợp với tổ hợp xét tuyển Đại học'],
    needTeacherAdvice: 'Không'
  },
  careerOrientation: {
    postHighSchoolPlan: 'Thi Đại học công lập',
    careerClarity: 'Có một vài lựa chọn đang cân nhắc',
    interestFields: [],
    targetCareerAndSchool: '',
    concerns: [],
    previousHollandCode: 'Chưa làm'
  },
  talentsAndDigitalSkills: {
    talents: [],
    willingToSupportActivities: 'Sẵn sàng khi được phân công',
    digitalSkillMatrix: {
      'Word / Soạn thảo tài liệu': 'Khá',
      'PowerPoint / Canva thuyết trình': 'Khá',
      'Tìm kiếm tài liệu & Tự học online': 'Tốt',
      'Sử dụng công cụ AI (ChatGPT, Gemini)': 'Khá'
    },
    digitalAiUses: ['Dùng AI học từ vựng và ngữ pháp Tiếng Anh'],
    aiVerificationHabit: 'Luôn kiểm tra lại đối chiếu với SGK và thầy cô',
    willingToJoinTechTeam: 'Cân nhắc'
  },
  classAndTeacherExpectations: {
    classExpectations: ['Lớp đoàn kết, giúp đỡ nhau cùng tiến bộ', 'Tạo môi trường học tập sôi nổi, không khí vui vẻ'],
    teacherExpectations: ['Lắng nghe, thấu hiểu tâm lý học sinh', 'Tư vấn nhiệt tình về định hướng tương lai']
  },
  leadershipProposal: {
    desiredPosition: 'Chỉ muốn là thành viên tích cực'
  },
  seatingPreference: {
    preference: 'Thầy cô xếp sao cũng đồng ý'
  },
  privateTeacherMessage: {
    content: ''
  },
  consent: {
    confirmed: false
  }
});

class StudentSurveyService {
  private activeTenantId: string = 'tenant-lan-nguyen';
  private surveys: StudentSurveyResponse[] = [];
  private listeners: Set<() => void> = new Set();
  private channel: BroadcastChannel | null = null;

  constructor() {
    this.activeTenantId = tenantService.getActiveTenantId();
    this.loadFromStorage(this.activeTenantId);

    // Reactive switch on tenant change
    tenantService.subscribe(() => {
      const nextTenantId = tenantService.getActiveTenantId();
      if (nextTenantId !== this.activeTenantId) {
        this.activeTenantId = nextTenantId;
        this.loadFromStorage(nextTenantId);
        this.notify();
      }
    });

    // Realtime Multi-tab BroadcastChannel
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel('kgcns_student_surveys_channel');
        this.channel.onmessage = (event) => {
          if (event.data?.type === 'SURVEYS_UPDATED' && event.data?.tenantId === this.activeTenantId) {
            this.loadFromStorage(this.activeTenantId);
            this.notify(false);
          }
        };
      } catch (err) {
        console.warn('BroadcastChannel not supported for surveys', err);
      }
    }

    // Cross-tab storage event
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        const expectedKey = tenantService.getTenantStorageKey('student_surveys', this.activeTenantId);
        if (e.key === expectedKey) {
          this.loadFromStorage(this.activeTenantId);
          this.notify(false);
        }
      });
    }
  }

  private loadFromStorage(tenantId: string) {
    const tId = tenantService.normalizeTenantId(tenantId);
    try {
      const storageKey = tenantService.getTenantStorageKey('student_surveys', tId);
      const saved = safeLocalStorageGet(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          this.surveys = parsed;
        } else {
          this.surveys = [];
        }
      } else {
        this.surveys = [];
      }
    } catch (e) {
      console.warn('Failed to load surveys from storage', e);
      this.surveys = [];
    }
  }

  private saveToStorage() {
    try {
      const storageKey = tenantService.getTenantStorageKey('student_surveys', this.activeTenantId);
      safeLocalStorageSet(storageKey, JSON.stringify(this.surveys));
      this.notify(true);
    } catch (e) {
      console.warn('Failed to save surveys to storage', e);
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(broadcast: boolean = true) {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.error('Error in StudentSurveyService listener', err);
      }
    });

    if (broadcast && this.channel) {
      try {
        this.channel.postMessage({
          type: 'SURVEYS_UPDATED',
          tenantId: this.activeTenantId,
          timestamp: Date.now()
        });
      } catch (e) {
        console.warn('Failed to broadcast survey update', e);
      }
    }
  }

  public refreshFromStorage(): void {
    this.loadFromStorage(this.activeTenantId);
    this.notify(false);
    this.fetchFromServer();
  }

  public async fetchFromServer(): Promise<void> {
    try {
      const res = await surveyRepositoryClient.getResponses();
      if (res.success && res.data && Array.isArray(res.data) && res.data.length > 0) {
        const serverSurveys: StudentSurveyResponse[] = res.data.map(r => ({
          id: r.id,
          tenantId: this.activeTenantId,
          classId: classService.getSettings().id || 'class-default',
          schoolYear: classService.getSettings().academicYear || '2025 - 2026',
          studentId: r.studentId,
          surveyType: 'GRADE12_START_YEAR' as StudentSurveyType,
          surveyTemplateId: r.templateId,
          surveyTemplateVersion: r.templateVersion || 1,
          status: r.status as StudentSurveyStatus,
          version: r.templateVersion || 1,
          answers: r.answers || createDefaultSurveyAnswers(),
          submittedAt: r.submittedAt,
          reviewedAt: r.reviewedAt,
          reviewedBy: r.reviewedBy,
          createdAt: r.submittedAt || new Date().toISOString(),
          updatedAt: r.submittedAt || new Date().toISOString(),
          source: 'APP'
        }));

        // Merge with existing local surveys by unique composite key (studentId + surveyTemplateId) and id
        const existingMap = new Map<string, StudentSurveyResponse>();
        serverSurveys.forEach(s => {
          const key = `${s.studentId}_${s.surveyTemplateId || 'template-grade12-default-v1'}`;
          existingMap.set(key, s);
          existingMap.set(s.id, s);
        });

        for (const local of this.surveys) {
          const key = `${local.studentId}_${local.surveyTemplateId || 'template-grade12-default-v1'}`;
          if (!existingMap.has(key) && !existingMap.has(local.id)) {
            serverSurveys.push(local);
          }
        }

        this.surveys = serverSurveys;
        this.saveToStorage();
        this.notify(false);
      }
    } catch (err) {
      console.warn('[StudentSurveyService] Server sync notice:', err);
    }
  }

  /**
   * Get all surveys for current tenant (Teacher only or internal)
   */
  public getAll(): StudentSurveyResponse[] {
    return [...this.surveys];
  }

  public getAllSurveys(): StudentSurveyResponse[] {
    return this.getAll();
  }

  public getAllSurveysForTeacher(): StudentSurveyResponse[] {
    return this.getAll();
  }

  public getSurveyById(id: string): StudentSurveyResponse | undefined {
    return this.surveys.find((s) => s.id === id);
  }

  /**
   * Get survey by student ID, survey type, and school year
   */
  public getByStudent(
    studentId: string,
    surveyType: StudentSurveyType = 'GRADE12_START_YEAR',
    schoolYear?: string,
    templateId?: string
  ): StudentSurveyResponse | undefined {
    const activeSchoolYear = schoolYear || classService.getSettings().academicYear || '2025 - 2026';
    if (templateId) {
      return this.surveys.find(
        (s) =>
          s.studentId === studentId &&
          (s.surveyTemplateId === templateId || (!s.surveyTemplateId && templateId === 'template-grade12-default-v1'))
      );
    }
    return this.surveys.find(
      (s) =>
        s.studentId === studentId &&
        s.surveyType === surveyType &&
        s.schoolYear === activeSchoolYear
    );
  }

  /**
   * Get all survey responses for a specific template
   */
  public getResponsesByTemplate(templateId: string): StudentSurveyResponse[] {
    return this.surveys.filter((s) => s.surveyTemplateId === templateId || (!s.surveyTemplateId && templateId === 'template-grade12-default-v1'));
  }

  /**
   * Get statistics summary for a specific survey template
   */
  public getSurveySummaryForTemplate(templateId: string, schoolYear?: string) {
    const activeSchoolYear = schoolYear || classService.getSettings().academicYear || '2025 - 2026';
    const allStudents = studentService.getAll().filter(
      (s) => s.status !== 'ARCHIVED' && (s.status as any) !== 'Nghỉ học' && (s.status as any) !== 'Chuyển trường'
    );
    const total = allStudents.length;

    const templateSurveys = this.getResponsesByTemplate(templateId);
    const submittedCount = templateSurveys.filter((s) => s.status === 'SUBMITTED' || s.status === 'REVIEWED').length;
    const reviewedCount = templateSurveys.filter((s) => s.status === 'REVIEWED').length;
    const draftCount = templateSurveys.filter((s) => s.status === 'DRAFT').length;
    const notStarted = Math.max(0, total - (submittedCount + draftCount));

    const completionRate = total > 0 ? Math.round((submittedCount / total) * 100) : 0;

    return {
      total,
      submitted: submittedCount,
      reviewed: reviewedCount,
      draft: draftCount,
      notStarted,
      completionRate
    };
  }

  /**
   * Get all survey responses for a specific student across all surveys
   */
  public getSurveysForStudent(studentId: string): StudentSurveyResponse[] {
    return this.surveys.filter((s) => s.studentId === studentId);
  }

  /**
   * Get latest survey for a student
   */
  public getLatestByStudent(
    studentId: string,
    surveyType: StudentSurveyType = 'GRADE12_START_YEAR',
    schoolYear?: string,
    templateId?: string
  ): StudentSurveyResponse | undefined {
    return this.getByStudent(studentId, surveyType, schoolYear, templateId);
  }

  /**
   * Create or retrieve existing draft for the currently authenticated student
   */
  public createDraft(
    surveyType: StudentSurveyType = 'GRADE12_START_YEAR',
    templateId?: string
  ): StudentSurveyResponse {
    const currentUser = authService.getCurrentUser();
    if (!currentUser || !currentUser.studentId) {
      throw new Error('STUDENT_SESSION_REQUIRED: Không xác định được hồ sơ học viên. Vui lòng đăng nhập lại.');
    }

    const studentId = currentUser.studentId;
    const classSettings = classService.getSettings();
    const classId = classSettings.id || (classSettings as any).classId || 'class-default';
    const schoolYear = classSettings.academicYear || '2025 - 2026';
    const tenantId = tenantService.getActiveTenantId();

    const existing = this.getByStudent(studentId, surveyType, schoolYear, templateId);
    if (existing) {
      return existing;
    }

    const targetTemplate = templateId
      ? surveyTemplateService.getById(templateId)
      : surveyTemplateService.getPublishedTemplate(surveyType, schoolYear);

    const isStartYear = surveyType === 'GRADE12_START_YEAR' || (targetTemplate?.id === 'template-grade12-default-v1');
    const isConduct = targetTemplate?.id === 'template-conduct-hk1' || (targetTemplate?.title?.toLowerCase().includes('rèn luyện'));
    const defaultAnswersForTemplate = isStartYear
      ? createDefaultSurveyAnswers()
      : isConduct
      ? { conductSelfEvaluation: { grade: '', note: '', commitment: '' } }
      : {};

    const newSurvey: StudentSurveyResponse = {
      id: `survey-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      tenantId,
      classId,
      schoolYear,
      studentId,
      surveyType,
      surveyTemplateId: targetTemplate?.id || templateId,
      surveyTemplateVersion: targetTemplate?.version || 1,
      status: 'DRAFT',
      version: targetTemplate?.version || 1,
      answers: defaultAnswersForTemplate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: 'APP'
    };

    this.surveys.unshift(newSurvey);
    this.saveToStorage();
    return newSurvey;
  }

  /**
   * Save draft answers for the currently authenticated student
   */
  public saveDraft(
    answers: Partial<Grade12StartYearSurveyAnswers> | any,
    surveyType: StudentSurveyType = 'GRADE12_START_YEAR',
    templateId?: string
  ): StudentSurveyResponse {
    const currentUser = authService.getCurrentUser();
    if (!currentUser || !currentUser.studentId) {
      throw new Error('STUDENT_SESSION_REQUIRED: Không xác định được hồ sơ học viên. Vui lòng đăng nhập lại.');
    }

    const studentId = currentUser.studentId;
    const classSettings = classService.getSettings();
    const classId = classSettings.id || (classSettings as any).classId || 'class-default';
    const schoolYear = classSettings.academicYear || '2025 - 2026';
    const tenantId = tenantService.getActiveTenantId();

    let target = this.getByStudent(studentId, surveyType, schoolYear, templateId);
    const targetTemplate = templateId
      ? surveyTemplateService.getById(templateId)
      : surveyTemplateService.getPublishedTemplate(surveyType, schoolYear);

    const isStartYear = surveyType === 'GRADE12_START_YEAR' || (targetTemplate?.id === 'template-grade12-default-v1');
    const isConduct = targetTemplate?.id === 'template-conduct-hk1' || (targetTemplate?.title?.toLowerCase().includes('rèn luyện'));
    const defaultAnswersForTemplate = isStartYear
      ? createDefaultSurveyAnswers()
      : isConduct
      ? { conductSelfEvaluation: { grade: '', note: '', commitment: '' } }
      : {};

    if (!target) {
      target = {
        id: `survey-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        tenantId,
        classId,
        schoolYear,
        studentId,
        surveyType,
        surveyTemplateId: targetTemplate?.id || templateId,
        surveyTemplateVersion: targetTemplate?.version || 1,
        status: 'DRAFT',
        version: targetTemplate?.version || 1,
        answers: {
          ...defaultAnswersForTemplate,
          ...answers
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: 'APP'
      };
      this.surveys.unshift(target);
    } else {
      if (!target.surveyTemplateId && targetTemplate) {
        target.surveyTemplateId = targetTemplate.id;
        target.surveyTemplateVersion = targetTemplate.version;
      }
      target.answers = {
        ...target.answers,
        ...answers
      };
      target.updatedAt = new Date().toISOString();
      this.surveys = this.surveys.map((s) => (s.id === target!.id ? target! : s));
    }

    this.saveToStorage();
    return target;
  }

  /**
   * Submit survey answers with validation
   */
  public submitSurvey(
    answers: Grade12StartYearSurveyAnswers | any,
    surveyType: StudentSurveyType = 'GRADE12_START_YEAR',
    templateId?: string
  ): StudentSurveyResponse {
    const currentUser = authService.getCurrentUser();
    if (!currentUser || !currentUser.studentId) {
      throw new Error('STUDENT_SESSION_REQUIRED: Không xác định được hồ sơ học viên. Vui lòng đăng nhập lại.');
    }

    const targetTemplate = templateId
      ? surveyTemplateService.getById(templateId)
      : surveyTemplateService.getPublishedTemplate(surveyType);

    // Validate consent only if consent field is defined in answers
    if (answers.consent && answers.consent.confirmed === false) {
      throw new Error('CONSENT_REQUIRED: Vui lòng tích chọn xác nhận và cam kết thông tin trước khi gửi khảo sát.');
    }

    // Validate elective subjects only if both are specified and not undefined
    const sub1 = answers.graduationPlan?.electiveSubject1;
    const sub2 = answers.graduationPlan?.electiveSubject2;
    if (sub1 && sub2 && sub1 !== 'Chưa xác định' && sub2 !== 'Chưa xác định' && sub1 === sub2) {
      throw new Error('DUPLICATE_ELECTIVES: Hai môn thi tốt nghiệp lựa chọn không được trùng nhau.');
    }

    const studentId = currentUser.studentId;
    const classSettings = classService.getSettings();
    const classId = classSettings.id || (classSettings as any).classId || 'class-default';
    const schoolYear = classSettings.academicYear || '2025 - 2026';
    const tenantId = tenantService.getActiveTenantId();

    const now = new Date().toISOString();
    let target = this.getByStudent(studentId, surveyType, schoolYear, templateId);

    if (!target) {
      target = {
        id: `survey-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        tenantId,
        classId,
        schoolYear,
        studentId,
        surveyType,
        surveyTemplateId: targetTemplate?.id || templateId,
        surveyTemplateVersion: targetTemplate?.version || 1,
        status: 'SUBMITTED',
        version: targetTemplate?.version || 1,
        answers,
        createdAt: now,
        updatedAt: now,
        submittedAt: now,
        source: 'APP'
      };
      this.surveys.unshift(target);
    } else {
      if (!target.surveyTemplateId && targetTemplate) {
        target.surveyTemplateId = targetTemplate.id;
        target.surveyTemplateVersion = targetTemplate.version;
      }
      target.answers = answers;
      target.status = 'SUBMITTED';
      target.submittedAt = now;
      target.updatedAt = now;
      this.surveys = this.surveys.map((s) => (s.id === target!.id ? target! : s));
    }

    this.saveToStorage();

    // Persist survey to server backend (triggers domain event for GVCN real-time notification)
    surveyRepositoryClient.submitResponse({
      id: target.id,
      templateId: target.surveyTemplateId || 'grade12_start_year',
      templateVersion: target.surveyTemplateVersion || 1,
      studentId: target.studentId,
      status: 'SUBMITTED',
      answers: target.answers,
      sensitiveAnswers: target.answers.privateTeacherMessage ? { privateMessage: target.answers.privateTeacherMessage.content } : undefined,
      submittedAt: target.submittedAt
    }).catch(err => console.warn('[StudentSurveyService] Server submit error:', err));

    // Process synchronization (auto-syncs conduct self-evaluation, contact info, health notes, etc.)
    try {
      surveySyncService.processSurvey(target.id);
    } catch (syncErr) {
      console.warn('[StudentSurveyService] SurveySync error:', syncErr);
    }

    // Dispatch in-app notification to GVCN
    try {
      const student = studentService.getById(studentId);
      const studentName = student?.fullName || currentUser.name || 'Học sinh';
      const templateTitle = targetTemplate?.title || 'Bài khảo sát';
      inAppNotificationService.addNotification(
        {
          eventId: `SURVEY_SUBMITTED:${target.id}:${Date.now()}`,
          tenantId,
          workspaceId: tenantId,
          classId,
          title: `📋 Học viên đã nộp khảo sát: ${studentName}`,
          desc: `Học viên ${studentName} vừa hoàn thành và nộp phiếu "${templateTitle}".`,
          category: 'survey' as any,
          targetRoles: ['TEACHER'],
          targetModule: 'surveys',
          targetTab: 'responses',
          meta: {
            surveyId: target.id,
            templateId: target.surveyTemplateId || templateId,
            surveyTemplateId: target.surveyTemplateId || templateId,
            surveyVersion: target.version,
            studentId: target.studentId,
            studentName
          },
          type: 'info'
        },
        currentUser
      );
    } catch (notifErr) {
      console.warn('[StudentSurveyService] Notification error:', notifErr);
    }

    return target;
  }

  /**
   * Mark survey as reviewed by Teacher
   */
  public markReviewed(surveyId: string): StudentSurveyResponse {
    const currentUser = authService.getCurrentUser();
    if (currentUser.role !== 'TEACHER' && currentUser.role !== 'SUPER_ADMIN') {
      throw new Error('TEACHER_ROLE_REQUIRED: Chỉ Giáo viên Chủ nhiệm mới có quyền xác nhận xem khảo sát.');
    }

    const target = this.surveys.find((s) => s.id === surveyId);
    if (!target) {
      throw new Error('SURVEY_NOT_FOUND: Không tìm thấy bản ghi khảo sát.');
    }

    const now = new Date().toISOString();
    target.status = 'REVIEWED';
    target.reviewedAt = now;
    target.reviewedBy = currentUser.name || 'Giáo viên Chủ nhiệm';
    target.updatedAt = now;

    this.surveys = this.surveys.map((s) => (s.id === target.id ? target : s));
    this.saveToStorage();
    return target;
  }

  /**
   * Get class-wide survey statistics
   */
  public getClassSurveySummary(schoolYear?: string) {
    const activeSchoolYear = schoolYear || classService.getSettings().academicYear || '2025 - 2026';
    const allStudents = studentService.getAll().filter(
      (s) => s.status !== 'ARCHIVED' && (s.status as any) !== 'Nghỉ học' && (s.status as any) !== 'Chuyển trường'
    );
    const total = allStudents.length;

    const classSurveys = this.surveys.filter((s) => s.schoolYear === activeSchoolYear);
    const submittedCount = classSurveys.filter((s) => s.status === 'SUBMITTED' || s.status === 'REVIEWED').length;
    const reviewedCount = classSurveys.filter((s) => s.status === 'REVIEWED').length;
    const draftCount = classSurveys.filter((s) => s.status === 'DRAFT').length;
    const notStarted = Math.max(0, total - (submittedCount + draftCount));

    const completionRate = total > 0 ? Math.round((submittedCount / total) * 100) : 0;

    return {
      total,
      submitted: submittedCount,
      reviewed: reviewedCount,
      draft: draftCount,
      notStarted,
      completionRate
    };
  }
}

export const studentSurveyService = new StudentSurveyService();
