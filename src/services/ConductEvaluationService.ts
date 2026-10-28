/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ConductPeriodEvaluation,
  ConductStudentEvaluation,
  ConductEvaluationPeriodType,
  ConductEvaluationGrade,
  ConductMeetingMinutes,
  PointTransaction,
  Student,
  AcademicPeriod
} from '../types';
import { tenantService } from './TenantService';
import { classService } from './ClassService';
import { studentService } from './StudentService';
import { trainingService } from './TrainingService';
import { studentSurveyService } from './StudentSurveyService';
import { auditService } from './AuditService';
import { authService } from './AuthService';
import { surveyTemplateService } from './SurveyTemplateService';
import { academicService } from './AcademicService';
import { safeLocalStorageSet, safeLocalStorageGet } from '../utils/storageUtils';
import {
  unwrapAnswerValue,
  normalizeConductGrade,
  determineConductSemester,
  extractCleanAnswerText
} from '../utils/surveyAnswerUtils';

class ConductEvaluationService {
  private activeTenantId: string = 'tenant-lan-nguyen';
  private evaluationsMap: Map<string, ConductPeriodEvaluation> = new Map();
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.activeTenantId = tenantService.getActiveTenantId();
    this.loadFromStorage(this.activeTenantId);

    tenantService.subscribe(() => {
      const nextTenantId = tenantService.getActiveTenantId();
      if (nextTenantId !== this.activeTenantId) {
        this.activeTenantId = nextTenantId;
        this.loadFromStorage(nextTenantId);
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

  private loadFromStorage(tenantId: string): void {
    try {
      const storageKey = tenantService.getTenantStorageKey('conduct_period_evaluations', tenantId);
      const saved = safeLocalStorageGet(storageKey);
      this.evaluationsMap.clear();
      if (saved) {
        const list: ConductPeriodEvaluation[] = JSON.parse(saved);
        if (Array.isArray(list)) {
          list.forEach(item => {
            if (Array.isArray(item.evaluations)) {
              item.evaluations.forEach(ev => {
                const clean = normalizeConductGrade(ev.selfAssessment);
                if (clean) {
                  ev.selfAssessment = clean;
                } else if (ev.selfAssessment === '[object Object]' || ev.selfAssessment === '[object object]' || typeof ev.selfAssessment === 'object') {
                  ev.selfAssessment = '';
                }
                if (ev.teacherNote && (ev.teacherNote.includes('[object Object]') || ev.teacherNote.includes('[object object]'))) {
                  ev.teacherNote = ev.teacherNote.replace(/\[object Object\]/gi, '').replace(/\|\s*\|\s*/g, '| ').trim();
                }
              });
            }
            this.evaluationsMap.set(item.id, item);
          });
        }
      }
    } catch (e) {
      console.warn('Failed to load conduct evaluations from storage', e);
      this.evaluationsMap.clear();
    }
  }

  private saveToStorage(): void {
    try {
      const storageKey = tenantService.getTenantStorageKey('conduct_period_evaluations', this.activeTenantId);
      const list = Array.from(this.evaluationsMap.values());
      safeLocalStorageSet(storageKey, JSON.stringify(list));
      this.notify();
    } catch (e) {
      console.warn('Failed to save conduct evaluations to storage', e);
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach(fn => {
      try {
        fn();
      } catch (err) {
        console.error('Error in ConductEvaluationService listener', err);
      }
    });
  }

  /**
   * Helper to determine default date ranges for periods in current academic year
   */
  public getDefaultDateRange(periodType: ConductEvaluationPeriodType): { start: string; end: string } {
    const classSettings = classService.getSettings();
    const rawYear = classSettings.academicYear || '2025 - 2026';
    const firstYear = parseInt(rawYear.split('-')[0].trim(), 10) || 2025;
    const secondYear = firstYear + 1;

    switch (periodType) {
      case 'MID_SEMESTER_1':
        return {
          start: `${firstYear}-09-01`,
          end: `${firstYear}-11-15`
        };
      case 'SEMESTER_1':
        return {
          start: `${firstYear}-09-01`,
          end: `${secondYear}-01-15`
        };
      case 'MID_SEMESTER_2':
        return {
          start: `${secondYear}-01-16`,
          end: `${secondYear}-03-31`
        };
      case 'SEMESTER_2':
        return {
          start: `${secondYear}-01-16`,
          end: `${secondYear}-05-31`
        };
      case 'FULL_YEAR':
        return {
          start: `${firstYear}-09-01`,
          end: `${secondYear}-05-31`
        };
      case 'CUSTOM':
      default: {
        const today = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);
        return {
          start: thirtyDaysAgo.toISOString().split('T')[0],
          end: today.toISOString().split('T')[0]
        };
      }
    }
  }

  public getPeriodTitle(periodType: ConductEvaluationPeriodType, schoolYear?: string): string {
    const year = schoolYear || classService.getSettings().academicYear || '2025 - 2026';
    switch (periodType) {
      case 'MID_SEMESTER_1':
        return `Đánh giá, xếp loại Rèn luyện Giữa Học kỳ I (GHK I) — Năm học ${year}`;
      case 'SEMESTER_1':
        return `Đánh giá, xếp loại Rèn luyện Cuối Học kỳ I (HKI) — Năm học ${year}`;
      case 'MID_SEMESTER_2':
        return `Đánh giá, xếp loại Rèn luyện Giữa Học kỳ II (GHKII) — Năm học ${year}`;
      case 'SEMESTER_2':
        return `Đánh giá, xếp loại Rèn luyện Cuối Học kỳ II (HKII) — Năm học ${year}`;
      case 'FULL_YEAR':
        return `Đánh giá, xếp loại Rèn luyện Cả năm — Năm học ${year}`;
      case 'CUSTOM':
        return `Đánh giá, xếp loại Rèn luyện Đợt thi đua — Năm học ${year}`;
    }
  }

  private generateId(periodType: ConductEvaluationPeriodType, classId: string, schoolYear: string, customKey?: string): string {
    const cleanYear = (schoolYear || '2025-2026').replace(/\s+/g, '');
    if (periodType === 'CUSTOM' && customKey) {
      return `conduct-eval-${this.activeTenantId}-${classId}-${cleanYear}-custom-${customKey}`;
    }
    return `conduct-eval-${this.activeTenantId}-${classId}-${cleanYear}-${periodType}`;
  }

  /**
   * Filter approved transactions within period date range
   */
  public getTransactionsForPeriod(
    periodType: ConductEvaluationPeriodType,
    customDates?: { start: string; end: string }
  ): PointTransaction[] {
    const allApproved = trainingService.getAllTransactions().filter(
      t => t.status === 'approved' || t.reviewStatus === 'approved'
    );

    const range = customDates || this.getDefaultDateRange(periodType);
    const startTime = new Date(range.start).getTime();
    const endTime = new Date(range.end).getTime() + 86400000; // inclusive end of day

    return allApproved.filter(t => {
      let txTime = 0;
      if (t.eventDate) {
        txTime = new Date(t.eventDate).getTime();
      } else if (t.createdAt) {
        txTime = new Date(t.createdAt).getTime();
      } else if (t.timestamp) {
        txTime = new Date(t.timestamp).getTime();
      }
      if (!txTime || isNaN(txTime)) return true; // if no timestamp, include by default
      return txTime >= startTime && txTime <= endTime;
    });
  }

  /**
   * Suggest evaluation grade based on net points and violation count
   */
  public suggestGrade(netPoints: number, violationCount: number, minusPoints: number): ConductEvaluationGrade {
    if (violationCount === 0 && netPoints >= 15) {
      return 'Tốt';
    }
    if (netPoints >= 0 && violationCount <= 2 && minusPoints <= 10) {
      return 'Khá';
    }
    if (netPoints >= -20 && minusPoints <= 30) {
      return 'Đạt';
    }
    return 'Chưa đạt';
  }

  /**
   * Build automatic summary note from transactions and survey data
   */
  private buildAutoSummaryNote(
    studentId: string,
    plusPoints: number,
    minusPoints: number,
    praiseCount: number,
    violationCount: number,
    studentTransactions: PointTransaction[]
  ): string {
    const parts: string[] = [];

    if (praiseCount > 0) {
      const topPraise = studentTransactions
        .filter(t => t.points > 0)
        .slice(0, 2)
        .map(t => t.reason)
        .join('; ');
      parts.push(`+${plusPoints}đ (${praiseCount} lượt biểu dương: ${topPraise})`);
    } else {
      parts.push(`+0đ biểu dương`);
    }

    if (violationCount > 0) {
      const topViolations = studentTransactions
        .filter(t => t.points < 0)
        .slice(0, 2)
        .map(t => t.reason)
        .join('; ');
      parts.push(`-${minusPoints}đ (${violationCount} lượt nhắc nhở: ${topViolations})`);
    } else {
      parts.push(`Không có vi phạm kỷ luật`);
    }

    // Check survey self assessment if available
    const survey = studentSurveyService.getByStudent(studentId);
    if (survey?.answers?.academicSelfAssessment?.strongSubjects?.length) {
      parts.push(`Khảo sát: Thế mạnh [${survey.answers.academicSelfAssessment.strongSubjects.join(', ')}]`);
    }

    return parts.join(' | ');
  }

  /**
   * Match and retrieve the student's self-assessment response from the survey
   * titled "Tự đánh giá xếp loại rèn luyện - …" or "Tự đánh giá kết quả rèn luyện - …"
   * strictly belonging to the currently active teacher's class and matching period.
   * Preserves student's answered content; does not auto-infer official grades.
   */
  public getSurveySelfAssessment(
    studentId: string,
    periodType: ConductEvaluationPeriodType = 'SEMESTER_1'
  ): { grade: string; sourceTitle: string; submittedAt?: string; note?: string } | null {
    try {
      const classSettings = classService.getSettings();
      const classId = classSettings.id || 'class-12a1';
      const schoolYear = classSettings.academicYear || '2025 - 2026';

      // 1. Get templates strictly matching conduct self-evaluation for this period
      const allTemplates = surveyTemplateService.getAll();
      const conductTemplates = allTemplates.filter(t => {
        const titleLower = (t.title || '').toLowerCase();
        const hasKeyword =
          titleLower.includes('tự đánh giá') &&
          (titleLower.includes('rèn luyện') || titleLower.includes('xếp loại') || titleLower.includes('kết quả'));
        if (!hasKeyword && t.id !== 'template-conduct-hk1' && t.id !== 'template-conduct-hk2') return false;

        const templatePeriod = determineConductSemester(t);
        return templatePeriod === periodType;
      });

      const templateIds = new Set(conductTemplates.map(t => t.id));
      if (periodType === 'SEMESTER_1') {
        templateIds.add('template-conduct-hk1');
      } else if (periodType === 'SEMESTER_2') {
        templateIds.add('template-conduct-hk2');
      }

      // 2. Query survey responses strictly for this student in current class and current school year
      const allSurveys = studentSurveyService.getSurveysForStudent(studentId);
      const studentSurveys = allSurveys.filter(s => {
        if (s.studentId !== studentId) return false;
        if (s.classId && classId && s.classId !== classId) return false;
        if (s.schoolYear && schoolYear && s.schoolYear !== schoolYear) return false;
        if (s.status !== 'SUBMITTED' && s.status !== 'REVIEWED') return false;

        const sTemplate = s.surveyTemplateId ? surveyTemplateService.getById(s.surveyTemplateId) : null;

        // Strict Check 1: Must be a conduct self-evaluation survey
        const isConductTpl = sTemplate && (
          sTemplate.id === 'template-conduct-hk1' ||
          sTemplate.id === 'template-conduct-hk2' ||
          (
            (sTemplate.title || '').toLowerCase().includes('tự đánh giá') &&
            ((sTemplate.title || '').toLowerCase().includes('rèn luyện') || (sTemplate.title || '').toLowerCase().includes('xếp loại') || (sTemplate.title || '').toLowerCase().includes('kết quả') || (sTemplate.title || '').toLowerCase().includes('hạnh kiểm'))
          )
        );
        const sAns = s.answers as any;
        const hasConductAnswer = sAns && (
          sAns.conductSelfEvaluation !== undefined ||
          sAns['q-conduct-self-grade'] !== undefined ||
          sAns['conductSelfEvaluation.grade'] !== undefined ||
          sAns.tu_danh_gia_ren_luyen !== undefined ||
          sAns.xep_loai_ren_luyen !== undefined ||
          sAns.selfAssessment !== undefined
        );

        if (!isConductTpl && !hasConductAnswer) return false;
        if (s.surveyType === 'PARENT_NEEDS') return false;

        // Strict Check 2: Semester MUST match periodType explicitly. If semester is missing/ambiguous, return false (never guess!)
        const surveyPeriod = determineConductSemester(sTemplate, s);
        if (!surveyPeriod || surveyPeriod !== periodType) return false;

        return true;
      });

      // Strict isolation: if no survey specifically matches this period, return null
      // Never fall back to surveys from another semester!
      if (studentSurveys.length === 0) {
        return null;
      }

      // 3. Consistent selection: latest response by submittedAt or updatedAt
      studentSurveys.sort((a, b) => {
        const timeA = new Date(a.submittedAt || a.updatedAt || a.createdAt).getTime();
        const timeB = new Date(b.submittedAt || b.updatedAt || b.createdAt).getTime();
        return timeB - timeA;
      });

      const latestSurvey = studentSurveys[0];
      const answers: any = latestSurvey.answers || {};
      const targetTemplate =
        conductTemplates.find(t => t.id === latestSurvey.surveyTemplateId) ||
        surveyTemplateService.getById(latestSurvey.surveyTemplateId || '') ||
        { title: `Tự đánh giá xếp loại rèn luyện (${periodType === 'SEMESTER_2' ? 'HKII' : 'HKI'})` };

      // 4. Extract grade safely
      let rawGrade: any = '';
      if (answers.conductSelfEvaluation?.grade !== undefined) {
        rawGrade = answers.conductSelfEvaluation.grade;
      } else if (answers.conductSelfEvaluation?.selfAssessment !== undefined) {
        rawGrade = answers.conductSelfEvaluation.selfAssessment;
      } else if (answers.selfAssessment !== undefined) {
        rawGrade = answers.selfAssessment;
      } else if (answers.conductEvaluation?.grade !== undefined) {
        rawGrade = answers.conductEvaluation.grade;
      } else if (answers.conductEvaluation?.selfAssessment !== undefined) {
        rawGrade = answers.conductEvaluation.selfAssessment;
      } else if (answers.conductEvaluation !== undefined) {
        rawGrade = answers.conductEvaluation;
      } else if (typeof answers.conductSelfEvaluation === 'string' && answers.conductSelfEvaluation.trim()) {
        rawGrade = answers.conductSelfEvaluation;
      } else if (answers['q-conduct-self-grade'] !== undefined) {
        rawGrade = answers['q-conduct-self-grade'];
      } else if (answers['conductSelfEvaluation.grade'] !== undefined) {
        rawGrade = answers['conductSelfEvaluation.grade'];
      } else if (answers.tu_danh_gia_ren_luyen !== undefined) {
        rawGrade = answers.tu_danh_gia_ren_luyen;
      } else if (answers.xep_loai_ren_luyen !== undefined) {
        rawGrade = answers.xep_loai_ren_luyen;
      } else if (answers.hanh_kiem !== undefined) {
        rawGrade = answers.hanh_kiem;
      } else if (answers.conductSelfEvaluation !== undefined) {
        rawGrade = answers.conductSelfEvaluation;
      } else if (answers.otherText?.['q-conduct-self-grade']) {
        rawGrade = answers.otherText['q-conduct-self-grade'];
      } else if (Array.isArray((latestSurvey as any).responses)) {
        const respItem = (latestSurvey as any).responses.find(
          (r: any) =>
            r.questionTitle?.toLowerCase().includes('rèn luyện') ||
            r.questionTitle?.toLowerCase().includes('xếp loại') ||
            r.questionTitle?.toLowerCase().includes('tự đánh giá') ||
            r.questionId?.toLowerCase().includes('conduct') ||
            r.questionId?.toLowerCase().includes('grade')
        );
        if (respItem?.answer !== undefined) rawGrade = respItem.answer;
      }

      const cleanGrade = normalizeConductGrade(rawGrade);
      if (!cleanGrade) return null;

      let rawNote: any = answers.conductSelfEvaluation?.note ??
        answers.conductSelfEvaluation?.comment ??
        answers['conductSelfEvaluation.note'] ??
        answers['q-conduct-note'] ??
        answers.minh_chung_ren_luyen ??
        answers.ly_do_tu_nhan ??
        answers.note ??
        '';
      const cleanNote = extractCleanAnswerText(rawNote);

      return {
        grade: cleanGrade,
        note: cleanNote || '',
        sourceTitle: targetTemplate.title || `Khảo sát Tự đánh giá rèn luyện (${periodType === 'SEMESTER_2' ? 'HKII' : 'HKI'})`,
        submittedAt: latestSurvey.submittedAt || latestSurvey.updatedAt
      };
    } catch (e) {
      console.warn('Error fetching survey self assessment', e);
      return null;
    }
  }

  /**
   * Sync self-assessments from latest surveys for all students in an evaluation session.
   * Only updates selfAssessment (and source metadata). Does NOT modify teacherAssessment,
   * collectiveAssessment, or finalGrade!
   */
  public syncAllSurveysForPeriod(evaluationId: string): { syncedCount: number; notSubmittedCount: number } {
    const session = this.evaluationsMap.get(evaluationId);
    if (!session) return { syncedCount: 0, notSubmittedCount: 0 };

    let syncedCount = 0;
    let notSubmittedCount = 0;

    session.evaluations = session.evaluations.map(e => {
      const surveyResult = this.getSurveySelfAssessment(e.studentId, session.periodType);
      if (surveyResult) {
        syncedCount++;
        return {
          ...e,
          selfAssessment: surveyResult.grade,
          selfAssessmentSource: surveyResult.sourceTitle,
          selfAssessmentSubmittedAt: surveyResult.submittedAt,
          updatedAt: new Date().toISOString()
        };
      } else {
        notSubmittedCount++;
        // PRESERVE existing selfAssessment if student hasn't submitted a new survey!
        return e;
      }
    });

    session.updatedAt = new Date().toISOString();
    this.evaluationsMap.set(evaluationId, session);
    this.saveToStorage();

    auditService.log(
      'Đồng bộ khảo sát tự đánh giá',
      authService.getCurrentUser().role,
      session.periodTitle,
      `Đồng bộ kết quả khảo sát cho ${syncedCount}/${session.evaluations.length} học sinh`
    );

    return { syncedCount, notSubmittedCount };
  }

  /**
   * Get or initialize evaluation session for a period
   * (NO automatic grading - grades are left empty until GVCN enters or uploads)
   */
  public getOrCreateEvaluation(
    periodType: ConductEvaluationPeriodType,
    customDates?: { start: string; end: string }
  ): ConductPeriodEvaluation {
    const classSettings = classService.getSettings();
    const classId = classSettings.id || 'class-12a1';
    const schoolYear = classSettings.academicYear || '2025 - 2026';
    const dateRange = customDates || this.getDefaultDateRange(periodType);
    const customKey = periodType === 'CUSTOM' ? `${dateRange.start}_${dateRange.end}` : undefined;
    const evalId = this.generateId(periodType, classId, schoolYear, customKey);

    const existing = this.evaluationsMap.get(evalId);
    if (existing) {
      const activeStudents = studentService.getAll();
      const activeIds = new Set(activeStudents.map(s => s.id));
      const existingEvalMap = new Map(existing.evaluations.map(e => [e.studentId, e]));
      const syncedEvaluations: ConductStudentEvaluation[] = [];

      activeStudents.forEach(student => {
        const found = existingEvalMap.get(student.id);
        if (found) {
          syncedEvaluations.push({
            ...found,
            studentName: student.fullName,
            studentCode: student.code || found.studentCode,
            group: student.group || found.group
          });
        } else {
          // New student added to roster: sync self-assessment from survey if completed;
          // collectiveAssessment, teacherAssessment, finalGrade MUST be empty (NO auto-grading)!
          const surveySelf = this.getSurveySelfAssessment(student.id, periodType);
          syncedEvaluations.push({
            studentId: student.id,
            studentCode: student.code || 'HS',
            studentName: student.fullName,
            group: student.group || 1,
            plusPoints: 0,
            minusPoints: 0,
            netPoints: 0,
            violationCount: 0,
            praiseCount: 0,
            selfAssessment: surveySelf ? surveySelf.grade : '',
            selfAssessmentSource: surveySelf ? surveySelf.sourceTitle : undefined,
            selfAssessmentSubmittedAt: surveySelf ? surveySelf.submittedAt : undefined,
            collectiveAssessment: '',
            teacherAssessment: '',
            finalGrade: '',
            autoSummaryNote: 'Chưa có vi phạm ghi nhận.',
            teacherNote: '',
            status: 'DRAFT',
            updatedAt: new Date().toISOString(),
            updatedBy: 'Hệ thống'
          });
        }
      });

      existing.evaluations = syncedEvaluations;
      if (existing.meetingMinutes) {
        existing.meetingMinutes.attendeesCount = activeStudents.length;
      }
      return existing;
    }

    // Initialize fresh evaluation session
    const students = studentService.getAll();
    const periodTransactions = this.getTransactionsForPeriod(periodType, dateRange);

    const studentEvaluations: ConductStudentEvaluation[] = students.map(student => {
      const stuTxs = periodTransactions.filter(t => t.studentId === student.id);
      let plusPoints = 0;
      let minusPoints = 0;
      let praiseCount = 0;
      let violationCount = 0;

      stuTxs.forEach(t => {
        if (t.points > 0) {
          plusPoints += t.points;
          praiseCount++;
        } else {
          minusPoints += Math.abs(t.points);
          violationCount++;
        }
      });

      const netPoints = plusPoints - minusPoints;

      // Self assessment strictly from survey; if not submitted, left empty
      const surveySelf = this.getSurveySelfAssessment(student.id, periodType);
      const selfAssessment = surveySelf ? surveySelf.grade : '';
      const selfAssessmentSource = surveySelf ? surveySelf.sourceTitle : undefined;
      const selfAssessmentSubmittedAt = surveySelf ? surveySelf.submittedAt : undefined;

      const autoSummaryNote = this.buildAutoSummaryNote(
        student.id,
        plusPoints,
        minusPoints,
        praiseCount,
        violationCount,
        stuTxs
      );

      // Points and violations are REFERENCE EVIDENCE (minh chứng tham khảo) ONLY.
      // Collective, teacher assessment, and final grade are NOT auto-generated!
      return {
        studentId: student.id,
        studentCode: student.code || 'HS',
        studentName: student.fullName,
        group: student.group || 1,
        plusPoints,
        minusPoints,
        netPoints,
        violationCount,
        praiseCount,
        selfAssessment,
        selfAssessmentSource,
        selfAssessmentSubmittedAt,
        collectiveAssessment: '', // NO auto-grading
        teacherAssessment: '',    // NO auto-grading
        finalGrade: '',           // NO auto-grading
        autoSummaryNote,
        teacherNote: '',
        status: 'DRAFT',
        updatedAt: new Date().toISOString(),
        updatedBy: 'Hệ thống'
      };
    });

    const teacherName = classSettings.homeroomTeacherName || classSettings.teacherName || 'GVCN Mai Lan';

    const defaultMinutes: ConductMeetingMinutes = {
      meetingDate: dateRange.end || new Date().toISOString().split('T')[0],
      meetingTime: '15:30',
      meetingLocation: `Phòng học Lớp ${classSettings.className || '12A1'}`,
      presidedBy: teacherName,
      secretary: 'Bùi Tâm Anh (Lớp trưởng)',
      attendeesCount: students.length,
      absentCount: 0,
      absentReason: 'Không',
      meetingAgenda: `1. Quán triệt quy chế đánh giá, xếp loại rèn luyện học sinh.\n2. Ban cán sự báo cáo tổng hợp thi đua và nề nếp trong kỳ.\n3. Từng tổ và cá nhân tự đánh giá, đóng góp ý kiến.\n4. Tập thể lớp biểu quyết thống nhất.\n5. GVCN nhận xét, kết luận và chốt kết quả xếp loại.`,
      collectiveOpinion: 'Tập thể lớp 100% nhất trí với các số liệu ghi nhận nề nếp, biểu dương các bạn có đóng góp phong trào và động viên các bạn còn vi phạm nỗ lực khắc phục trong kỳ tới.',
      teacherConclusion: 'Biểu dương tinh thần tự giác, đoàn kết của tập thể lớp. Đề nghị Ban cán sự tiếp tục duy trì kỷ cương, hỗ trợ các bạn còn hạn chế.'
    };

    const newEvaluation: ConductPeriodEvaluation = {
      id: evalId,
      tenantId: this.activeTenantId,
      classId,
      schoolYear,
      periodType,
      periodTitle: this.getPeriodTitle(periodType, schoolYear),
      startDate: dateRange.start,
      endDate: dateRange.end,
      status: 'DRAFT',
      evaluations: studentEvaluations,
      meetingMinutes: defaultMinutes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.evaluationsMap.set(evalId, newEvaluation);
    this.saveToStorage();
    return newEvaluation;
  }

  /**
   * Recalculate auto metrics from transactions for all students in an evaluation
   */
  public recalculateFromTransactions(evaluationId: string): ConductPeriodEvaluation | null {
    const existing = this.evaluationsMap.get(evaluationId);
    if (!existing) return null;

    const periodTransactions = this.getTransactionsForPeriod(
      existing.periodType,
      existing.startDate && existing.endDate ? { start: existing.startDate, end: existing.endDate } : undefined
    );

    const students = studentService.getAll();
    const existingEvalMap = new Map(existing.evaluations.map(e => [e.studentId, e]));

    const updatedEvaluations: ConductStudentEvaluation[] = students.map(student => {
      const current = existingEvalMap.get(student.id);
      const stuTxs = periodTransactions.filter(t => t.studentId === student.id);

      let plusPoints = 0;
      let minusPoints = 0;
      let praiseCount = 0;
      let violationCount = 0;

      stuTxs.forEach(t => {
        if (t.points > 0) {
          plusPoints += t.points;
          praiseCount++;
        } else {
          minusPoints += Math.abs(t.points);
          violationCount++;
        }
      });

      const netPoints = plusPoints - minusPoints;

      const autoSummaryNote = this.buildAutoSummaryNote(
        student.id,
        plusPoints,
        minusPoints,
        praiseCount,
        violationCount,
        stuTxs
      );

      const surveySelf = !current?.selfAssessment ? this.getSurveySelfAssessment(student.id, existing.periodType) : null;

      return {
        studentId: student.id,
        studentCode: student.code || current?.studentCode || 'HS',
        studentName: student.fullName,
        group: student.group || current?.group || 1,
        plusPoints,
        minusPoints,
        netPoints,
        violationCount,
        praiseCount,
        selfAssessment: current?.selfAssessment !== undefined ? current.selfAssessment : (surveySelf?.grade || ''),
        selfAssessmentSource: current?.selfAssessmentSource || surveySelf?.sourceTitle,
        selfAssessmentSubmittedAt: current?.selfAssessmentSubmittedAt || surveySelf?.submittedAt,
        collectiveAssessment: current?.collectiveAssessment || '',
        teacherAssessment: current?.teacherAssessment || '',
        finalGrade: current?.finalGrade || '',
        autoSummaryNote,
        teacherNote: current?.teacherNote || '',
        status: current?.status || 'DRAFT',
        updatedAt: new Date().toISOString(),
        updatedBy: authService.getCurrentUser().name || 'GVCN'
      };
    });

    existing.evaluations = updatedEvaluations;
    existing.updatedAt = new Date().toISOString();

    this.evaluationsMap.set(evaluationId, existing);
    this.saveToStorage();

    auditService.log(
      'Cập nhật số liệu rèn luyện tự động',
      authService.getCurrentUser().role,
      existing.periodTitle,
      `Đồng bộ lại dữ liệu nề nếp và vi phạm cho ${students.length} học sinh`
    );

    return existing;
  }

  /**
   * Update student evaluation in current session
   */
  public updateStudentEvaluation(
    evaluationId: string,
    studentId: string,
    patch: Partial<ConductStudentEvaluation>
  ): boolean {
    const session = this.evaluationsMap.get(evaluationId);
    if (!session) return false;

    const idx = session.evaluations.findIndex(e => e.studentId === studentId);
    if (idx === -1) return false;

    session.evaluations[idx] = {
      ...session.evaluations[idx],
      ...patch,
      updatedAt: new Date().toISOString(),
      updatedBy: authService.getCurrentUser().name || 'GVCN'
    };

    session.updatedAt = new Date().toISOString();
    this.evaluationsMap.set(evaluationId, session);
    this.saveToStorage();
    return true;
  }

  /**
   * Batch update all student evaluations in current session
   */
  public batchUpdateEvaluations(
    evaluationId: string,
    evaluations: ConductStudentEvaluation[]
  ): boolean {
    const session = this.evaluationsMap.get(evaluationId);
    if (!session) return false;

    session.evaluations = evaluations;
    session.updatedAt = new Date().toISOString();
    this.evaluationsMap.set(evaluationId, session);
    this.saveToStorage();

    // Sync official conduct result to student profile and academic record
    this.syncToOfficialRecords(evaluationId);

    auditService.log(
      'Lưu bảng đánh giá rèn luyện định kỳ',
      authService.getCurrentUser().role,
      session.periodTitle,
      `Cập nhật kết quả đánh giá cho ${evaluations.length} học sinh`
    );

    return true;
  }

  /**
   * Sync official finalized or saved conduct results to student profiles & academic records
   */
  public syncToOfficialRecords(evaluationId: string): void {
    try {
      const session = this.evaluationsMap.get(evaluationId);
      if (!session) return;

      let academicPeriod: AcademicPeriod = 'final_hk1';
      if (session.periodType === 'MID_SEMESTER_1') academicPeriod = 'midterm_hk1';
      else if (session.periodType === 'SEMESTER_1') academicPeriod = 'final_hk1';
      else if (session.periodType === 'MID_SEMESTER_2') academicPeriod = 'midterm_hk2';
      else if (session.periodType === 'SEMESTER_2') academicPeriod = 'final_hk2';
      else if (session.periodType === 'FULL_YEAR') academicPeriod = 'full_year';

      session.evaluations.forEach(e => {
        const grade = e.finalGrade || e.teacherAssessment;
        if (grade) {
          // 1. Update StudentProfile conductRank
          studentService.updateStudentProfileByStudent(e.studentId, { conductRank: grade });

          // 2. Update Academic Record conductResult and conductSummary
          academicService.updateConductRecord(
            e.studentId,
            academicPeriod,
            grade,
            e.teacherNote || e.autoSummaryNote
          );

          if (session.periodType === 'SEMESTER_1') {
            academicService.updateConductRecord(
              e.studentId,
              'midterm_hk1',
              grade,
              e.teacherNote || e.autoSummaryNote
            );
          } else if (session.periodType === 'SEMESTER_2') {
            academicService.updateConductRecord(
              e.studentId,
              'midterm_hk2',
              grade,
              e.teacherNote || e.autoSummaryNote
            );
          }
        }
      });
    } catch (err) {
      console.warn('Failed to sync conduct to official records', err);
    }
  }

  /**
   * Batch auto-fill grades (e.g. apply suggested grade to teacher & final assessment)
   */
  public applyAutoSuggestionToAll(evaluationId: string): boolean {
    const session = this.evaluationsMap.get(evaluationId);
    if (!session) return false;

    session.evaluations = session.evaluations.map(e => {
      const suggested = this.suggestGrade(e.netPoints, e.violationCount, e.minusPoints);
      return {
        ...e,
        collectiveAssessment: suggested,
        teacherAssessment: suggested,
        finalGrade: suggested,
        updatedAt: new Date().toISOString(),
        updatedBy: authService.getCurrentUser().name || 'GVCN'
      };
    });

    session.updatedAt = new Date().toISOString();
    this.evaluationsMap.set(evaluationId, session);
    this.saveToStorage();

    auditService.log(
      'Tự động gợi ý xếp loại rèn luyện',
      authService.getCurrentUser().role,
      session.periodTitle,
      `Áp dụng chuẩn xếp loại tự động cho toàn bộ lớp`
    );

    return true;
  }

  /**
   * Copy teacher assessment to final result
   */
  public copyTeacherToFinal(evaluationId: string): boolean {
    const session = this.evaluationsMap.get(evaluationId);
    if (!session) return false;

    session.evaluations = session.evaluations.map(e => ({
      ...e,
      finalGrade: e.teacherAssessment,
      updatedAt: new Date().toISOString()
    }));

    session.updatedAt = new Date().toISOString();
    this.evaluationsMap.set(evaluationId, session);
    this.saveToStorage();
    return true;
  }

  /**
   * Sync student's self-assessment or notes from survey into conduct evaluation (idempotent)
   */
  public syncSurveyConductSelfAssessment(
    studentId: string,
    surveyId: string,
    selfAssessmentGrade?: any,
    conductNote?: string,
    options?: { periodType?: ConductEvaluationPeriodType; force?: boolean }
  ): boolean {
    const periodType = options?.periodType;
    if (!periodType || (periodType !== 'SEMESTER_1' && periodType !== 'SEMESTER_2')) {
      // Missing or ambiguous semester: strictly do not guess and do not overwrite data!
      return false;
    }
    const session = this.getOrCreateEvaluation(periodType);
    if (!session || session.status === 'FINALIZED') {
      return false;
    }

    const idx = session.evaluations.findIndex(e => e.studentId === studentId);
    let currentEval = idx !== -1 ? session.evaluations[idx] : undefined;
    const cleanGrade = normalizeConductGrade(selfAssessmentGrade) || normalizeConductGrade(currentEval?.selfAssessment) || '';
    const cleanNote = extractCleanAnswerText(conductNote);

    if (!cleanGrade && !cleanNote) {
      return false;
    }

    if (idx === -1 || !currentEval) {
      const student = studentService.getById(studentId);
      if (!student) return false;
      currentEval = {
        studentId: student.id,
        studentCode: student.code,
        studentName: student.fullName,
        group: student.group || 1,
        plusPoints: 0,
        minusPoints: 0,
        netPoints: 0,
        violationCount: 0,
        praiseCount: 0,
        selfAssessment: cleanGrade,
        collectiveAssessment: '',
        teacherAssessment: '',
        finalGrade: '',
        autoSummaryNote: '',
        teacherNote: cleanNote ? `Khảo sát: ${cleanNote}` : '',
        status: 'DRAFT',
        updatedAt: new Date().toISOString(),
        updatedBy: 'Khảo sát (Tự đánh giá)'
      };
      session.evaluations.push(currentEval);
    } else {
      let newTeacherNote = currentEval.teacherNote || '';
      if (cleanNote) {
        if (newTeacherNote.includes('Khảo sát:')) {
          newTeacherNote = newTeacherNote.replace(/Khảo sát:\s*[^|]+/, `Khảo sát: ${cleanNote}`).trim();
        } else {
          newTeacherNote = newTeacherNote ? `${newTeacherNote} | Khảo sát: ${cleanNote}` : `Khảo sát: ${cleanNote}`;
        }
      }

      session.evaluations[idx] = {
        ...currentEval,
        selfAssessment: cleanGrade || currentEval.selfAssessment || '',
        selfAssessmentSource: surveyId,
        selfAssessmentSubmittedAt: new Date().toISOString(),
        teacherNote: newTeacherNote,
        updatedAt: new Date().toISOString(),
        updatedBy: 'Khảo sát (Tự đánh giá)'
      };
    }

    session.updatedAt = new Date().toISOString();
    this.evaluationsMap.set(session.id, session);
    this.saveToStorage();
    return true;
  }

  /**
   * Update student self-assessment directly (from student manual entry or student survey sync)
   * Validates periodType (SEMESTER_1 | SEMESTER_2), ensures session exists and is not finalized.
   * Preserves existing teacher assessment, collective assessment, and final grade.
   */
  public updateStudentSelfAssessment(
    studentId: string,
    periodType: ConductEvaluationPeriodType,
    selfAssessment: string,
    note?: string,
    source?: string
  ): { success: boolean; message: string } {
    if (!periodType || (periodType !== 'SEMESTER_1' && periodType !== 'SEMESTER_2')) {
      return { success: false, message: 'Học kỳ không hợp lệ. Chỉ chấp nhận Học kỳ I (SEMESTER_1) hoặc Học kỳ II (SEMESTER_2).' };
    }
    const session = this.getOrCreateEvaluation(periodType);
    if (!session) {
      return { success: false, message: 'Không thể khởi tạo đợt đánh giá rèn luyện cho học kỳ này.' };
    }
    if (session.status === 'FINALIZED') {
      return { success: false, message: 'Đợt đánh giá rèn luyện học kỳ này đã được GVCN chốt chính thức (Finalized), không thể sửa đổi.' };
    }

    const cleanGrade = normalizeConductGrade(selfAssessment);
    if (!cleanGrade) {
      return { success: false, message: 'Mức xếp loại tự đánh giá không hợp lệ (phải là Tốt, Khá, Đạt hoặc Chưa đạt).' };
    }

    const cleanNote = extractCleanAnswerText(note);
    const idx = session.evaluations.findIndex(e => e.studentId === studentId);

    if (idx === -1) {
      const student = studentService.getById(studentId);
      if (!student) {
        return { success: false, message: 'Không tìm thấy thông tin học viên trong danh sách lớp.' };
      }
      session.evaluations.push({
        studentId: student.id,
        studentCode: student.code,
        studentName: student.fullName,
        group: student.group || 1,
        plusPoints: 0,
        minusPoints: 0,
        netPoints: 0,
        violationCount: 0,
        praiseCount: 0,
        selfAssessment: cleanGrade,
        selfAssessmentSource: source || 'Học viên tự nhận xét',
        selfAssessmentSubmittedAt: new Date().toISOString(),
        collectiveAssessment: '',
        teacherAssessment: '',
        finalGrade: '',
        autoSummaryNote: cleanNote ? `Tự nhận xét: ${cleanNote}` : '',
        teacherNote: '',
        status: 'DRAFT',
        updatedAt: new Date().toISOString(),
        updatedBy: authService.getCurrentUser().name || 'Học viên'
      });
    } else {
      const current = session.evaluations[idx];
      let newAutoSummary = current.autoSummaryNote || '';
      if (cleanNote) {
        if (newAutoSummary.includes('Tự nhận xét:')) {
          newAutoSummary = newAutoSummary.replace(/Tự nhận xét:\s*[^|;]+/, `Tự nhận xét: ${cleanNote}`).trim();
        } else {
          newAutoSummary = newAutoSummary ? `${newAutoSummary} | Tự nhận xét: ${cleanNote}` : `Tự nhận xét: ${cleanNote}`;
        }
      }

      session.evaluations[idx] = {
        ...current,
        selfAssessment: cleanGrade,
        selfAssessmentSource: source || 'Học viên tự nhận xét',
        selfAssessmentSubmittedAt: new Date().toISOString(),
        autoSummaryNote: newAutoSummary,
        updatedAt: new Date().toISOString(),
        updatedBy: authService.getCurrentUser().name || 'Học viên'
      };
    }

    session.updatedAt = new Date().toISOString();
    this.evaluationsMap.set(session.id, session);
    this.saveToStorage();
    return {
      success: true,
      message: `Đã lưu thành công tự nhận xét rèn luyện (${cleanGrade}) cho ${periodType === 'SEMESTER_1' ? 'Học kỳ I' : 'Học kỳ II'}.`
    };
  }

  /**
   * Update meeting minutes
   */
  public updateMeetingMinutes(evaluationId: string, minutes: ConductMeetingMinutes): boolean {
    const session = this.evaluationsMap.get(evaluationId);
    if (!session) return false;

    session.meetingMinutes = minutes;
    session.updatedAt = new Date().toISOString();
    this.evaluationsMap.set(evaluationId, session);
    this.saveToStorage();
    return true;
  }

  /**
   * Finalize evaluation session (Lock)
   */
  public finalizeEvaluation(evaluationId: string): boolean {
    const session = this.evaluationsMap.get(evaluationId);
    if (!session) return false;

    const user = authService.getCurrentUser();
    session.status = 'FINALIZED';
    session.finalizedAt = new Date().toISOString();
    session.finalizedBy = user.name || 'GVCN Mai Lan';
    session.updatedAt = new Date().toISOString();

    session.evaluations = session.evaluations.map(e => ({
      ...e,
      status: 'FINALIZED',
      updatedAt: new Date().toISOString()
    }));

    this.evaluationsMap.set(evaluationId, session);
    this.saveToStorage();

    // Sync official finalized grades to official student and academic records
    this.syncToOfficialRecords(evaluationId);

    auditService.log(
      'Khóa & Phê duyệt kết quả rèn luyện',
      user.role,
      session.periodTitle,
      `Chính thức phê duyệt biên bản và kết quả đánh giá rèn luyện`
    );

    return true;
  }

  /**
   * Reopen finalized evaluation session (Unlock to Draft)
   */
  public unlockEvaluation(evaluationId: string): boolean {
    const session = this.evaluationsMap.get(evaluationId);
    if (!session) return false;

    session.status = 'DRAFT';
    session.updatedAt = new Date().toISOString();
    session.evaluations = session.evaluations.map(e => ({
      ...e,
      status: 'SAVED'
    }));

    this.evaluationsMap.set(evaluationId, session);
    this.saveToStorage();
    return true;
  }

  /**
   * Delete evaluation session
   */
  public deleteEvaluation(evaluationId: string): boolean {
    const session = this.evaluationsMap.get(evaluationId);
    if (!session) return false;

    const title = session.periodTitle;
    this.evaluationsMap.delete(evaluationId);
    this.saveToStorage();

    auditService.log(
      'Xóa đợt đánh giá rèn luyện',
      authService.getCurrentUser().role,
      title,
      `Xóa dữ liệu đánh giá định kỳ`
    );

    return true;
  }

  /**
   * Reset / Re-initialize evaluation session with fresh raw data
   */
  public resetEvaluation(evaluationId: string): ConductPeriodEvaluation | null {
    const session = this.evaluationsMap.get(evaluationId);
    if (!session) return null;

    this.evaluationsMap.delete(evaluationId);
    return this.getOrCreateEvaluation(
      session.periodType,
      session.startDate && session.endDate ? { start: session.startDate, end: session.endDate } : undefined
    );
  }

  /**
   * Retrieve all periodical evaluations for a given student
   */
  public getStudentEvaluations(studentId: string): Array<{
    period: ConductPeriodEvaluation;
    evaluation: ConductStudentEvaluation;
  }> {
    const results: Array<{
      period: ConductPeriodEvaluation;
      evaluation: ConductStudentEvaluation;
    }> = [];

    // Ensure default periods exist
    this.getOrCreateEvaluation('SEMESTER_1');
    this.getOrCreateEvaluation('SEMESTER_2');
    this.getOrCreateEvaluation('FULL_YEAR');

    this.evaluationsMap.forEach(period => {
      const found = period.evaluations?.find(e => e.studentId === studentId);
      if (found) {
        results.push({
          period,
          evaluation: found
        });
      }
    });

    return results;
  }

  /**
   * Get single student evaluation for student view or parent view
   */
  public getStudentEvaluation(studentId: string, periodType: ConductEvaluationPeriodType = 'SEMESTER_1'): ConductStudentEvaluation | undefined {
    const evalSession = this.getOrCreateEvaluation(periodType);
    return evalSession.evaluations.find(e => e.studentId === studentId);
  }

  /**
   * Calculate summary statistics for an evaluation session
   */
  public getEvaluationStats(session: ConductPeriodEvaluation) {
    const total = session.evaluations.length;
    let countGood = 0; // Tốt
    let countFair = 0; // Khá
    let countPass = 0; // Đạt
    let countFail = 0; // Chưa đạt
    let countUnranked = 0; // Chưa xếp loại
    let totalNetPoints = 0;
    let totalViolations = 0;
    let totalPraises = 0;

    session.evaluations.forEach(e => {
      const g = e.finalGrade;
      if (g === 'Tốt') countGood++;
      else if (g === 'Khá') countFair++;
      else if (g === 'Đạt') countPass++;
      else if (g === 'Chưa đạt') countFail++;
      else countUnranked++;

      totalNetPoints += e.netPoints;
      totalViolations += e.violationCount;
      totalPraises += e.praiseCount;
    });

    const pctGood = total > 0 ? ((countGood / total) * 100).toFixed(1) : '0';
    const pctFair = total > 0 ? ((countFair / total) * 100).toFixed(1) : '0';
    const pctPass = total > 0 ? ((countPass / total) * 100).toFixed(1) : '0';
    const pctFail = total > 0 ? ((countFail / total) * 100).toFixed(1) : '0';
    const pctUnranked = total > 0 ? ((countUnranked / total) * 100).toFixed(1) : '0';
    const avgNet = total > 0 ? (totalNetPoints / total).toFixed(1) : '0';

    return {
      total,
      countGood,
      countFair,
      countPass,
      countFail,
      countUnranked,
      pctGood,
      pctFair,
      pctPass,
      pctFail,
      pctUnranked,
      avgNet,
      totalNetPoints,
      totalViolations,
      totalPraises
    };
  }
}

export const conductEvaluationService = new ConductEvaluationService();
