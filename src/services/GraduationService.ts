/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GraduationRegistration, GraduationRuleConfig, GraduationScores, GraduationExamComment, GraduationChoiceHistory, UserRole } from '../types';
import { studentService } from './StudentService';
import { tenantService } from './TenantService';
import { authService } from './AuthService';
import { inAppNotificationService } from './InAppNotificationService';
import { graduationRepositoryClient } from './GraduationRepositoryClient';
import { safeLocalStorageSet, safeLocalStorageGet } from '../utils/storageUtils';

const GRADUATION_STORAGE_KEY = 'kgcns_graduation_registrations';
const GRADUATION_CONFIG_KEY = 'kgcns_graduation_rule_config';
const GRADUATION_COMMENTS_KEY = 'kgcns_graduation_comments';
const GRADUATION_HISTORY_KEY = 'kgcns_graduation_choice_history';

export const ELECTIVE_SUBJECTS_LIST = [
  'Tiếng Anh',
  'Vật lí',
  'Hóa học',
  'Sinh học',
  'Lịch sử',
  'Địa lí',
  'Giáo dục kinh tế và pháp luật',
  'Tin học',
  'Công nghệ',
  'Tiếng Pháp',
  'Tiếng Trung',
  'Tiếng Nhật',
  'Tiếng Hàn'
];

export const DEFAULT_GRADUATION_RULE_CONFIG: GraduationRuleConfig = {
  schoolYear: '2025-2026',
  ruleVersion: '2025.1-GDPT2018',
  effectiveFrom: '01/09/2025',
  officialSourceUrl: 'https://moet.gov.vn',
  officialDocumentName: 'Quy chế thi tốt nghiệp THPT hiện hành của Bộ Giáo dục và Đào tạo (Thông tư 02/2024/TT-BGDĐT)',
  compulsorySubjects: ['Toán', 'Ngữ văn'],
  electiveSubjectCount: 2,
  minimumSubjectScore: 1.0, // Điểm liệt: <= 1.0 (điều kiện đạt: > 1.0)
  minimumGraduationScore: 5.0,
  grade10Weight: 1,
  grade11Weight: 2,
  grade12Weight: 3,
  examWeight: 0.5, // 50% Điểm thi
  transcriptWeight: 0.5, // 50% Điểm học bạ 3 năm
  foreignLanguageExemptionRule: 'Thí sinh có chứng chỉ ngoại ngữ hợp lệ theo quy định được miễn thi bài thi Ngoại ngữ trong xét công nhận tốt nghiệp THPT (ĐXTN được tính theo các môn thi thực tế còn lại).',
  graduationFormula: 'ĐXTN = [((Tổng điểm các bài thi + Điểm KK/4) ÷ Số bài thi) × 0.5 + (ĐTB các năm học) × 0.5] + Điểm Ưu tiên',
  roundingPrecision: 2,
  priorityRules: [
    { code: 'D1', label: 'Diện 1 (Thí sinh bình thường)', bonus: 0 },
    { code: 'D2', label: 'Diện 2 (Ưu tiên con thương binh, vùng sâu, DTTS...)', bonus: 0.25 },
    { code: 'D3', label: 'Diện 3 (Ưu tiên con liệt sĩ, khuyết tật nặng...)', bonus: 0.5 }
  ],
  incentiveRules: [
    { code: 'HSG', label: 'Học sinh giỏi cấp tỉnh / quốc gia (1.0đ - 2.0đ)', maxBonus: 2.0 },
    { code: 'NGHE', label: 'Chứng chỉ nghề phổ thông / Tin học (1.0đ - 2.0đ)', maxBonus: 2.0 }
  ],
  updatedAt: '23/08/2026'
};

class GraduationService {
  private activeTenantId: string = 'tenant-lan-nguyen';
  private registrations: GraduationRegistration[] = [];
  private ruleConfig: GraduationRuleConfig = { ...DEFAULT_GRADUATION_RULE_CONFIG };
  private comments: GraduationExamComment[] = [];
  private choiceHistory: GraduationChoiceHistory[] = [];
  private listeners: Array<() => void> = [];

  constructor() {
    this.activeTenantId = tenantService.getActiveTenantId();
    this.loadAllForTenant(this.activeTenantId);

    tenantService.subscribe(() => {
      const nextTenantId = tenantService.getActiveTenantId();
      if (nextTenantId !== this.activeTenantId) {
        this.activeTenantId = nextTenantId;
        this.loadAllForTenant(nextTenantId);
        this.notify();
      }
    });

    queueMicrotask(() => {
      try {
        for (const reg of this.registrations) {
          studentService.updateStudentGraduationSummary(reg.studentId, reg, false);
        }
      } catch {}
      if (typeof studentService !== 'undefined' && studentService?.subscribe) {
        studentService.subscribe(() => {
          this.syncRegistrationsWithStudents();
          this.notify();
        });
      }
      if (typeof authService !== 'undefined' && authService?.subscribe) {
        authService.subscribe(() => {
          const nextTenantId = tenantService.getActiveTenantId();
          this.activeTenantId = nextTenantId;
          this.loadAllForTenant(nextTenantId);
          this.fetchFromServer();
        });
      }
    });

    this.fetchFromServer();
  }

  public reloadForActiveTenant(): void {
    this.activeTenantId = tenantService.getActiveTenantId();
    this.loadAllForTenant(this.activeTenantId);
    this.fetchFromServer();
    this.notify();
  }

  public async fetchFromServer(): Promise<void> {
    try {
      const res = await graduationRepositoryClient.getGraduationChoices();
      if (res.success && Array.isArray(res.data)) {
        if (res.data.length === 0) {
          if (this.registrations.length > 0) {
            this.registrations = [];
            this.saveRegistrations();
            this.notify();
          }
          return;
        }

        const serverMap = new Map<string, any>();
        const newServerHistories: GraduationChoiceHistory[] = [];
        res.data.forEach(item => {
          if (item.studentId && item.currentChoice) {
            if (Array.isArray(item.history) && item.history.length > 0) {
              item.history.forEach((h: any, idx: number) => {
                const sub1 = h.data?.electiveSubject1 || h.electiveSubject1 || '';
                const sub2 = h.data?.electiveSubject2 || h.electiveSubject2 || '';
                if (!sub1 && !sub2) return;
                const histId = h.id || `hist-${item.studentId}-${idx}-${h.changedAt || ''}`;
                newServerHistories.push({
                  id: histId,
                  studentId: item.studentId,
                  electiveSubject1: sub1,
                  electiveSubject2: sub2,
                  source: h.role === 'TEACHER' ? 'EXCEL_IMPORT' : (h.source || 'STUDENT_UPDATE'),
                  note: h.note || (h.role === 'TEACHER' ? 'GVCN cập nhật môn thi tự chọn' : 'Cập nhật định hướng tốt nghiệp'),
                  changedAt: h.changedAt ? (isNaN(Date.parse(h.changedAt)) ? String(h.changedAt) : new Date(h.changedAt).toLocaleString('vi-VN')) : '',
                  changedBy: h.changedBy || (h.role === 'TEACHER' ? 'Giáo viên chủ nhiệm' : 'Học viên')
                });
              });
            }
            serverMap.set(item.studentId, item.currentChoice);
          }
        });

        if (newServerHistories.length > 0) {
          const histById = new Map<string, GraduationChoiceHistory>();
          for (const h of this.choiceHistory) {
            histById.set(h.id, h);
          }
          for (const sh of newServerHistories) {
            histById.set(sh.id, sh);
          }
          this.choiceHistory = Array.from(histById.values());
        }

        const students = studentService.getAll();
        const studentById = new Map(students.map(s => [s.id, s]));

        // Merge with existing registrations: if logged in as STUDENT/PARENT, server only returns 1 student;
        // if logged in as TEACHER, server returns all registered students in the tenant.
        const currentRole = authService.getCurrentUser()?.role;
        const baseMap = new Map<string, GraduationRegistration>();
        if (currentRole === 'STUDENT' || currentRole === 'CLASS_OFFICER' || currentRole === 'PARENT') {
          for (const r of this.registrations) {
            baseMap.set(r.studentId, r);
          }
        }

        for (const [studentId, rawChoice] of serverMap.entries()) {
          const st = studentById.get(studentId);
          const rawPrio = rawChoice.priorityBonus !== undefined && rawChoice.priorityBonus !== null && rawChoice.priorityBonus !== ''
            ? Number(rawChoice.priorityBonus)
            : (st?.graduationSummary?.priorityBonus ?? 0);
          const rawEnc = rawChoice.encouragementBonus !== undefined && rawChoice.encouragementBonus !== null && rawChoice.encouragementBonus !== ''
            ? Number(rawChoice.encouragementBonus)
            : (st?.graduationSummary?.encouragementBonus ?? 0);

          const normalizedChoice: GraduationRegistration = {
            ...rawChoice,
            id: rawChoice.id || `grad-reg-${studentId}`,
            studentId,
            studentName: st?.fullName || rawChoice.studentName || 'Học viên',
            studentCode: st?.code || rawChoice.studentCode || '',
            studentGroup: st?.group || rawChoice.studentGroup || 1,
            compulsorySubjects: ['Toán', 'Ngữ văn'],
            electiveSubject1: rawChoice.electiveSubject1 || '',
            electiveSubject2: rawChoice.electiveSubject2 || '',
            isForeignLanguageExempt: Boolean(rawChoice.isForeignLanguageExempt),
            scores: {
              math: rawChoice.scores?.math,
              literature: rawChoice.scores?.literature,
              elective1: rawChoice.scores?.elective1,
              elective2: rawChoice.scores?.elective2
            },
            priorityBonus: !isNaN(rawPrio) ? rawPrio : 0,
            encouragementBonus: !isNaN(rawEnc) ? rawEnc : 0,
            schoolYear: rawChoice.schoolYear || this.ruleConfig.schoolYear || '2025-2026',
            isFlagged: Boolean(
              rawChoice.isFlagged ||
                (typeof rawChoice.teacherNote === 'string' && rawChoice.teacherNote.trim().length > 0) ||
                (Array.isArray(rawChoice.flagReasons) && rawChoice.flagReasons.length > 0)
            ),
            flagReasons: Array.isArray(rawChoice.flagReasons) ? rawChoice.flagReasons : [],
            teacherNote: typeof rawChoice.teacherNote === 'string' ? rawChoice.teacherNote : '',
            gpaAllYears: this.calculateGpaAllYears(rawChoice.gpa10, rawChoice.gpa11, rawChoice.gpa12, this.ruleConfig)
          };
          const resScore = this.calculateResult(normalizedChoice, this.ruleConfig);
          normalizedChoice.calculatedScore = resScore.score;
          normalizedChoice.status = resScore.status;
          normalizedChoice.statusReason = resScore.reason;
          baseMap.set(studentId, normalizedChoice);
        }

        const updatedRegistrations = Array.from(baseMap.values());
        this.registrations = updatedRegistrations;
        this.saveRegistrations();
        this.saveChoiceHistory();

        // Sync to studentService profiles in memory/localStorage
        try {
          for (const reg of updatedRegistrations) {
            studentService.updateStudentGraduationSummary(reg.studentId, reg, false);
          }
        } catch {}

        this.notify();
      }
    } catch (e) {
      console.warn('[GraduationService] fetchFromServer error:', e);
    }
  }

  private loadAllForTenant(tenantId: string) {
    const tId = tenantService.normalizeTenantId(tenantId);
    this.loadConfig(tId);
    this.loadRegistrations(tId);
    this.loadComments(tId);
    this.loadChoiceHistory(tId);
  }

  private loadChoiceHistory(tenantId?: string) {
    const tId = tenantService.normalizeTenantId(tenantId || this.activeTenantId);
    try {
      const key = tenantService.getTenantStorageKey('graduation_choice_history', tId);
      const saved = safeLocalStorageGet(key);
      if (saved) {
        this.choiceHistory = JSON.parse(saved);
      } else {
        this.choiceHistory = [];
      }
    } catch {
      this.choiceHistory = [];
    }
  }

  private initDefaultChoiceHistory(tenantId?: string) {
    this.choiceHistory = [];
  }

  private saveChoiceHistory(tenantId?: string) {
    const tId = tenantService.normalizeTenantId(tenantId || this.activeTenantId);
    try {
      safeLocalStorageSet(
        tenantService.getTenantStorageKey('graduation_choice_history', tId),
        JSON.stringify(this.choiceHistory)
      );
    } catch (e) {
      console.warn('Error saving graduation choice history', e);
    }
    this.notify();
  }

  private loadComments(tenantId?: string) {
    const tId = tenantService.normalizeTenantId(tenantId || this.activeTenantId);
    try {
      const key = tenantService.getTenantStorageKey('graduation_comments', tId);
      const saved = safeLocalStorageGet(key);
      if (saved) {
        this.comments = JSON.parse(saved);
      } else {
        this.comments = [];
      }
    } catch {
      this.comments = [];
    }
  }

  private initDefaultComments() {
    this.comments = [];
  }

  private saveComments(tenantId?: string) {
    const tId = tenantService.normalizeTenantId(tenantId || this.activeTenantId);
    try {
      safeLocalStorageSet(tenantService.getTenantStorageKey('graduation_comments', tId), JSON.stringify(this.comments));
    } catch (e) {
      console.warn('Error saving graduation comments', e);
    }
    this.notify();
  }

  public getComments(studentId: string): GraduationExamComment[] {
    return this.comments.filter(c => c.studentId === studentId);
  }

  public addComment(comment: {
    studentId: string;
    authorId: string;
    authorName: string;
    authorRole: UserRole;
    authorAvatar?: string;
    content: string;
    parentCommentId?: string;
  }): GraduationExamComment {
    const newComment: GraduationExamComment = {
      id: `grad-cmt-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      studentId: comment.studentId,
      authorId: comment.authorId,
      authorName: comment.authorName,
      authorRole: comment.authorRole,
      authorAvatar: comment.authorAvatar,
      content: comment.content.trim(),
      parentCommentId: comment.parentCommentId,
      createdAt: new Date().toLocaleDateString('vi-VN') + ' ' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };

    this.comments.push(newComment);
    this.saveComments();
    return newComment;
  }

  public deleteComment(id: string) {
    this.comments = this.comments.filter(c => c.id !== id && c.parentCommentId !== id);
    this.saveComments();
  }

  private loadConfig(tenantId?: string) {
    const tId = tenantService.normalizeTenantId(tenantId || this.activeTenantId);
    try {
      const key = tenantService.getTenantStorageKey('graduation_rule_config', tId);
      const saved = safeLocalStorageGet(key);
      if (saved) {
        this.ruleConfig = { ...DEFAULT_GRADUATION_RULE_CONFIG, ...JSON.parse(saved) };
      } else {
        if (tId === 'tenant-lan-nguyen') {
          const legacy = safeLocalStorageGet(GRADUATION_CONFIG_KEY);
          if (legacy) {
            this.ruleConfig = { ...DEFAULT_GRADUATION_RULE_CONFIG, ...JSON.parse(legacy) };
            safeLocalStorageSet(key, legacy);
          } else {
            this.ruleConfig = { ...DEFAULT_GRADUATION_RULE_CONFIG };
          }
        } else {
          this.ruleConfig = { ...DEFAULT_GRADUATION_RULE_CONFIG };
        }
      }
    } catch {
      this.ruleConfig = { ...DEFAULT_GRADUATION_RULE_CONFIG };
    }
  }

  private loadRegistrations(tenantId?: string) {
    const tId = tenantService.normalizeTenantId(tenantId || this.activeTenantId);
    try {
      const key = tenantService.getTenantStorageKey('graduation_registrations', tId);
      const saved = safeLocalStorageGet(key);
      if (saved) {
        this.registrations = JSON.parse(saved);
      } else {
        this.registrations = [];
      }
    } catch {
      this.registrations = [];
    }
  }

  private initDefaultRegistrations() {
    this.registrations = [];
  }

  private saveRegistrations(tenantId?: string) {
    const tId = tenantService.normalizeTenantId(tenantId || this.activeTenantId);
    try {
      safeLocalStorageSet(tenantService.getTenantStorageKey('graduation_registrations', tId), JSON.stringify(this.registrations));
    } catch (e) {
      console.warn('Error saving graduation registrations', e);
    }
    this.notify();
  }

  private saveConfig(tenantId?: string) {
    const tId = tenantService.normalizeTenantId(tenantId || this.activeTenantId);
    try {
      safeLocalStorageSet(tenantService.getTenantStorageKey('graduation_rule_config', tId), JSON.stringify(this.ruleConfig));
    } catch (e) {
      console.warn('Error saving graduation config', e);
    }
    // Recalculate all registrations with new config
    this.registrations = this.registrations.map(r => {
      const gpaAll = this.calculateGpaAllYears(r.gpa10, r.gpa11, r.gpa12, this.ruleConfig);
      const res = this.calculateResult({ ...r, gpaAllYears: gpaAll }, this.ruleConfig);
      return {
        ...r,
        gpaAllYears: gpaAll,
        calculatedScore: res.score,
        status: res.status,
        statusReason: res.reason
      };
    });
    this.saveRegistrations(tId);
  }

  /**
   * Tính ĐTB các năm học theo trọng số: (Lớp 10 × 1 + Lớp 11 × 2 + Lớp 12 × 3) ÷ 6
   */
  public calculateGpaAllYears(
    gpa10: number | undefined,
    gpa11: number | undefined,
    gpa12: number | undefined,
    config: GraduationRuleConfig = this.ruleConfig
  ): number {
    const w10 = config.grade10Weight || 1;
    const w11 = config.grade11Weight || 2;
    const w12 = config.grade12Weight || 3;
    const totalWeight = w10 + w11 + w12;

    const s10 = typeof gpa10 === 'number' && !isNaN(gpa10) ? gpa10 : (gpa12 || 8.0);
    const s11 = typeof gpa11 === 'number' && !isNaN(gpa11) ? gpa11 : (gpa12 || 8.0);
    const s12 = typeof gpa12 === 'number' && !isNaN(gpa12) ? gpa12 : 8.0;

    const rawGpa = (s10 * w10 + s11 * w11 + s12 * w12) / totalWeight;
    const precision = config.roundingPrecision || 2;
    const factor = Math.pow(10, precision);
    return Math.round(rawGpa * factor) / factor;
  }

  /**
   * Tính ĐXTN theo Quy chế thi tốt nghiệp THPT hiện hành
   */
  public calculateResult(
    reg: GraduationRegistration,
    config: GraduationRuleConfig = this.ruleConfig
  ): {
    score: number | undefined;
    status: 'qualified' | 'at_risk' | 'unqualified' | 'pending';
    reason: string;
    hasDeadPoint: boolean;
    isPassGraduationScore: boolean;
    avgExamScore: number;
    gpaAllYears: number;
    calculationSteps?: {
      step1: string;
      step2: string;
      step3: string;
      finalFormula: string;
    };
  } {
    const safeScores = reg.scores || {};
    const { math, literature, elective1, elective2 } = safeScores;
    const isExempt = !!reg.isForeignLanguageExempt;

    // Check if enough scores entered
    const isMissingSubject =
      math === undefined ||
      literature === undefined ||
      elective1 === undefined ||
      (!isExempt && elective2 === undefined);

    if (isMissingSubject) {
      const gpaAll = this.calculateGpaAllYears(reg.gpa10, reg.gpa11, reg.gpa12, config);
      return {
        score: undefined,
        status: 'pending',
        reason: 'Chưa nhập đủ điểm các môn thi dự kiến',
        hasDeadPoint: false,
        isPassGraduationScore: false,
        avgExamScore: 0,
        gpaAllYears: gpaAll
      };
    }

    const minScoreExclusive = config.minimumSubjectScore ?? 1.0; // Điểm liệt: <= 1.0

    // Strict condition: Tất cả các môn thi dùng để xét tốt nghiệp phải đạt TRÊN 1.0 điểm (> 1.0)
    let deadReason = '';
    if (math !== undefined && math <= minScoreExclusive) {
      deadReason = `Môn Toán (${math}đ) ở mức điểm liệt (≤ 1.0đ)`;
    } else if (literature !== undefined && literature <= minScoreExclusive) {
      deadReason = `Môn Ngữ văn (${literature}đ) ở mức điểm liệt (≤ 1.0đ)`;
    } else if (elective1 !== undefined && elective1 <= minScoreExclusive) {
      deadReason = `Môn ${reg.electiveSubject1 || 'Tự chọn 1'} (${elective1}đ) ở mức điểm liệt (≤ 1.0đ)`;
    } else if (!isExempt && elective2 !== undefined && elective2 <= minScoreExclusive) {
      deadReason = `Môn ${reg.electiveSubject2 || 'Tự chọn 2'} (${elective2}đ) ở mức điểm liệt (≤ 1.0đ)`;
    }

    // Step 1: Điểm trung bình các môn thi
    let examSubjectsCount = isExempt ? 3 : 4;
    let totalExamScores = (math || 0) + (literature || 0) + (elective1 || 0);
    if (!isExempt) {
      totalExamScores += elective2 || 0;
    }
    const avgExamScoreRaw = totalExamScores / examSubjectsCount;

    // Step 2: ĐTB các năm học
    const gpaAll = this.calculateGpaAllYears(reg.gpa10, reg.gpa11, reg.gpa12, config);

    // Step 3: ĐXTN = [((Tổng điểm các bài thi + Điểm KK/4) ÷ Số bài thi) × Trọng số thi + (ĐTB các năm) × Trọng số học bạ] + Điểm Ưu tiên
    const encBonus = Math.min(reg.encouragementBonus || 0, 4.0); // max 4.0đ
    const prioBonus = Math.min(reg.priorityBonus || 0, 2.0); // max 2.0đ

    const examPartWithBonus = (totalExamScores + encBonus / 4) / examSubjectsCount;
    const examWeight = config.examWeight ?? 0.5;
    const transcriptWeight = config.transcriptWeight ?? 0.5;

    const rawFinalScore = examPartWithBonus * examWeight + gpaAll * transcriptWeight + prioBonus;
    const precision = config.roundingPrecision || 2;
    const factor = Math.pow(10, precision);
    const score = Math.round(rawFinalScore * factor) / factor;

    const isPassScore = score >= config.minimumGraduationScore;
    const hasDeadPoint = !!deadReason;

    const step1Text = isExempt
      ? `(${math} + ${literature} + ${elective1}) ÷ 3 = ${(totalExamScores / 3).toFixed(2)} đ`
      : `(${math} + ${literature} + ${elective1} + ${elective2}) ÷ 4 = ${(totalExamScores / 4).toFixed(2)} đ`;

    const step2Text = `(${reg.gpa10 || reg.gpa12 || 8.0} × 1 + ${reg.gpa11 || reg.gpa12 || 8.0} × 2 + ${reg.gpa12 || 8.0} × 3) ÷ 6 = ${gpaAll.toFixed(2)} đ`;

    const step3Text = `[ ((${totalExamScores} + ${encBonus}/4) ÷ ${examSubjectsCount}) × ${examWeight} + ${gpaAll.toFixed(2)} × ${transcriptWeight} ] + ${prioBonus} = ${score.toFixed(2)} đ`;

    const calculationSteps = {
      step1: step1Text,
      step2: step2Text,
      step3: step3Text,
      finalFormula: config.graduationFormula
    };

    if (hasDeadPoint) {
      return {
        score,
        status: 'unqualified',
        reason: `Có môn thi ở mức điểm liệt theo điều kiện xét công nhận tốt nghiệp: ${deadReason}.`,
        hasDeadPoint: true,
        isPassGraduationScore: isPassScore,
        avgExamScore: Math.round(avgExamScoreRaw * factor) / factor,
        gpaAllYears: gpaAll,
        calculationSteps
      };
    }

    if (!isPassScore) {
      return {
        score,
        status: 'unqualified',
        reason: `Điểm xét tốt nghiệp dự kiến (${score.toFixed(2)}đ) chưa đạt mức quy định tối thiểu ${config.minimumGraduationScore.toFixed(2)} điểm.`,
        hasDeadPoint: false,
        isPassGraduationScore: false,
        avgExamScore: Math.round(avgExamScoreRaw * factor) / factor,
        gpaAllYears: gpaAll,
        calculationSteps
      };
    }

    if (score < config.minimumGraduationScore + 0.8) {
      return {
        score,
        status: 'at_risk',
        reason: `Đạt điểm xét tốt nghiệp dự kiến (${score.toFixed(2)}đ) nhưng thuộc nhóm cận ngưỡng an toàn. Cần tiếp tục bồi dưỡng.`,
        hasDeadPoint: false,
        isPassGraduationScore: true,
        avgExamScore: Math.round(avgExamScoreRaw * factor) / factor,
        gpaAllYears: gpaAll,
        calculationSteps
      };
    }

    return {
      score,
      status: 'qualified',
      reason: `Đủ điều kiện dự kiến công nhận tốt nghiệp THPT (ĐXTN: ${score.toFixed(2)} / 10).`,
      hasDeadPoint: false,
      isPassGraduationScore: true,
      avgExamScore: Math.round(avgExamScoreRaw * factor) / factor,
      gpaAllYears: gpaAll,
      calculationSteps
    };
  }

  public syncRegistrationsWithStudents(): void {
    const students = studentService.getAll();
    const existingMap = new Map(this.registrations.map(r => [r.studentId, r]));

    let hasChanges = false;
    students.forEach((s) => {
      const existing = existingMap.get(s.id);
      if (existing) {
        if (existing.studentName !== s.fullName || existing.studentCode !== s.code || existing.studentGroup !== s.group) {
          existing.studentName = s.fullName;
          existing.studentCode = s.code;
          existing.studentGroup = s.group;
          hasChanges = true;
        }
      }
      // CRITICAL: DO NOT synthesize fake registrations for students who have not registered!
    });

    if (hasChanges) {
      this.saveRegistrations();
    }
  }

  public getAll(): GraduationRegistration[] {
    const students = studentService.getAll();
    const activeStudentIds = new Set(students.map(s => s.id));
    this.syncRegistrationsWithStudents();
    return this.registrations.filter(r => activeStudentIds.has(r.studentId));
  }

  public getAllForClass(): GraduationRegistration[] {
    const students = studentService.getAll();
    this.syncRegistrationsWithStudents();
    const regMap = new Map<string, GraduationRegistration>(this.registrations.map(r => [r.studentId, r]));

    return students.map((s) => {
      const existing = regMap.get(s.id);
      if (existing) {
        existing.studentName = s.fullName;
        existing.studentCode = s.code;
        existing.studentGroup = s.group || 1;
        existing.isFlagged = Boolean(
          existing.isFlagged ||
            (existing.teacherNote && existing.teacherNote.trim().length > 0) ||
            (Array.isArray(existing.flagReasons) && existing.flagReasons.length > 0)
        );
        return existing;
      }

      const summary = s.graduationSummary;
      const summaryReasons = Array.isArray(summary?.flagReasons) ? summary!.flagReasons! : [];
      const summaryNote = summary?.teacherNote || '';
      const summaryFlagged = Boolean(
        summary?.isFlagged ||
          summaryNote.trim().length > 0 ||
          summaryReasons.length > 0
      );

      const emptyReg: GraduationRegistration = {
        id: `grad-reg-${s.id}`,
        studentId: s.id,
        studentName: s.fullName,
        studentCode: s.code,
        studentGroup: s.group || 1,
        compulsorySubjects: ['Toán', 'Ngữ văn'],
        electiveSubject1: summary?.electiveSubject1 || '',
        electiveSubject2: summary?.electiveSubject2 || '',
        scores: {
          math: summary?.scores?.math,
          literature: summary?.scores?.literature,
          elective1: summary?.scores?.elective1,
          elective2: summary?.scores?.elective2
        },
        gpa10: summary?.gpa10,
        gpa11: summary?.gpa11,
        gpa12: summary?.gpa12,
        gpaAllYears: summary?.gpaAllYears,
        isForeignLanguageExempt: Boolean(summary?.isForeignLanguageExempt),
        priorityBonus: summary?.priorityBonus ?? 0,
        encouragementBonus: summary?.encouragementBonus ?? 0,
        calculatedScore: summary?.calculatedScore,
        status: summary?.status || 'pending',
        statusReason: summary?.statusReason,
        isFlagged: summaryFlagged,
        flagReasons: summaryReasons,
        teacherNote: summaryNote,
        schoolYear: this.ruleConfig.schoolYear || '2025-2026',
        registeredAt: summary?.updatedAt || '',
        updatedAt: summary?.updatedAt || '',
        updatedBy: summary?.updatedBy
      };
      return emptyReg;
    });
  }

  public getByStudentId(studentId: string): GraduationRegistration | undefined {
    if (!studentId) return undefined;
    const cleanId = studentId.replace('grad-reg-', '').replace('grad_', '').trim();
    const students = studentService.getAll();
    const matchedStudent = students.find(
      s => s.id === cleanId || s.code?.toLowerCase() === cleanId.toLowerCase()
    );
    const targetId = matchedStudent ? matchedStudent.id : cleanId;
    const found = this.registrations.find(
      r => r.studentId === targetId || (matchedStudent?.code && r.studentCode?.toLowerCase() === matchedStudent.code.toLowerCase())
    );
    if (found) {
      found.isFlagged = Boolean(
        found.isFlagged ||
          (found.teacherNote && found.teacherNote.trim().length > 0) ||
          (Array.isArray(found.flagReasons) && found.flagReasons.length > 0)
      );
      return found;
    }
    if (matchedStudent?.graduationSummary) {
      const summary = matchedStudent.graduationSummary;
      const summaryReasons = Array.isArray(summary.flagReasons) ? summary.flagReasons : [];
      const summaryNote = summary.teacherNote || '';
      return {
        id: `grad-reg-${matchedStudent.id}`,
        studentId: matchedStudent.id,
        studentName: matchedStudent.fullName,
        studentCode: matchedStudent.code,
        studentGroup: matchedStudent.group || 1,
        compulsorySubjects: ['Toán', 'Ngữ văn'],
        electiveSubject1: summary.electiveSubject1 || '',
        electiveSubject2: summary.electiveSubject2 || '',
        isForeignLanguageExempt: Boolean(summary.isForeignLanguageExempt),
        scores: summary.scores || {},
        gpa10: summary.gpa10,
        gpa11: summary.gpa11,
        gpa12: summary.gpa12,
        gpaAllYears: summary.gpaAllYears,
        priorityBonus: summary.priorityBonus ?? 0,
        encouragementBonus: summary.encouragementBonus ?? 0,
        calculatedScore: summary.calculatedScore,
        status: summary.status || 'pending',
        statusReason: summary.statusReason,
        isFlagged: Boolean(summary.isFlagged || summaryNote.trim().length > 0 || summaryReasons.length > 0),
        flagReasons: summaryReasons,
        teacherNote: summaryNote,
        schoolYear: this.ruleConfig.schoolYear || '2025-2026',
        registeredAt: summary.updatedAt || '',
        updatedAt: summary.updatedAt || '',
        updatedBy: summary.updatedBy
      };
    }
    return undefined;
  }

  public async syncToServer(reg: GraduationRegistration): Promise<boolean> {
    try {
      const res = await graduationRepositoryClient.saveGraduationChoice({
        id: reg.id || `grad_${reg.studentId}`,
        studentId: reg.studentId,
        currentChoice: reg
      });
      return !!res.success;
    } catch (e) {
      console.warn('[GraduationService] syncToServer error:', e);
      return false;
    }
  }

  public async deleteRegistration(studentId: string): Promise<boolean> {
    try {
      this.registrations = this.registrations.filter(r => r.studentId !== studentId);
      this.choiceHistory = this.choiceHistory.filter(h => h.studentId !== studentId);
      this.comments = this.comments.filter(c => c.studentId !== studentId);
      this.saveRegistrations();
      this.saveChoiceHistory();
      this.saveComments();
      await graduationRepositoryClient.deleteGraduationChoice(studentId);
      this.notify();
      return true;
    } catch (e) {
      console.warn('[GraduationService] deleteRegistration error:', e);
      return false;
    }
  }

  public async updateRegistration(id: string, updates: Partial<GraduationRegistration>): Promise<GraduationRegistration | undefined> {
    let currentUserRole = 'TEACHER';
    try {
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        currentUserRole = currentUser.role;
        if (currentUser.role === 'PARENT') {
          throw new Error('Phụ huynh chỉ có quyền xem, không được chỉnh sửa thông tin xét tốt nghiệp.');
        }
      }
    } catch (err: any) {
      if (err?.message?.includes('Phụ huynh')) throw err;
    }

    const VALID_PRIORITY_BONUSES = [0, 0.25, 0.5];
    const VALID_ENCOURAGEMENT_BONUSES = [0, 1, 1.5, 2];

    if (updates.priorityBonus !== undefined) {
      const prioNum = Number(updates.priorityBonus);
      if (isNaN(prioNum) || !VALID_PRIORITY_BONUSES.includes(prioNum)) {
        throw new Error('Điểm Ưu tiên không hợp lệ. Chỉ chấp nhận các mức theo quy định: 0, 0.25 hoặc 0.5 điểm.');
      }
      updates = { ...updates, priorityBonus: prioNum };
    }

    if (updates.encouragementBonus !== undefined) {
      const encNum = Number(updates.encouragementBonus);
      if (isNaN(encNum) || !VALID_ENCOURAGEMENT_BONUSES.includes(encNum)) {
        throw new Error('Điểm Khuyến khích không hợp lệ. Chỉ chấp nhận một mức điểm của giải cao nhất theo quy định: 0, 1.0, 1.5 hoặc 2.0 điểm.');
      }
      updates = { ...updates, encouragementBonus: encNum };
    }

    const rawId = (updates.studentId || id || '').replace('grad-reg-', '').replace('grad_', '').trim();
    const allStudents = studentService.getAll();

    // Resolve student deterministically by stable studentId first, then by stable studentCode
    let student = allStudents.find(s => s.id === rawId);
    if (!student && updates.studentCode) {
      const codeNorm = updates.studentCode.trim().toLowerCase();
      student = allStudents.find(s => s.code?.trim().toLowerCase() === codeNorm);
    }
    if (!student && rawId) {
      const idNorm = rawId.toLowerCase();
      student = allStudents.find(s => s.code?.trim().toLowerCase() === idNorm);
    }

    const canonicalStudentId = student ? student.id : rawId;
    if (!canonicalStudentId) {
      throw new Error('Không xác định được mã định danh học viên (studentId) để lưu dữ liệu.');
    }

    let idx = this.registrations.findIndex(
      r =>
        r.studentId === canonicalStudentId ||
        r.id === id ||
        (student?.code && r.studentCode?.trim().toLowerCase() === student.code.trim().toLowerCase())
    );
    let updated: GraduationRegistration;
    const isTeacherActor =
      currentUserRole === 'TEACHER' ||
      (updates.updatedBy || '').toLowerCase().includes('giáo viên') ||
      (updates.updatedBy || '').toLowerCase().includes('gvcn');

    if (idx === -1) {
      // TRƯỜNG HỢP B: Chưa có bản ghi trong this.registrations -> Khởi tạo từ graduationSummary (nếu có) để không mất trường hiện có
      const summary = student?.graduationSummary;
      const mergedScores = {
        math: updates.scores?.math !== undefined ? updates.scores.math : summary?.scores?.math,
        literature: updates.scores?.literature !== undefined ? updates.scores.literature : summary?.scores?.literature,
        elective1: updates.scores?.elective1 !== undefined ? updates.scores.elective1 : summary?.scores?.elective1,
        elective2: updates.scores?.elective2 !== undefined ? updates.scores.elective2 : summary?.scores?.elective2
      };
      const gpa10 = updates.gpa10 !== undefined ? updates.gpa10 : summary?.gpa10;
      const gpa11 = updates.gpa11 !== undefined ? updates.gpa11 : summary?.gpa11;
      const gpa12 = updates.gpa12 !== undefined ? updates.gpa12 : summary?.gpa12;

      const newReg: GraduationRegistration = {
        ...updates,
        id: `grad-reg-${canonicalStudentId}`,
        studentId: canonicalStudentId,
        studentName: student?.fullName || updates.studentName || 'Học viên',
        studentCode: student?.code || updates.studentCode || '',
        studentGroup: student?.group || updates.studentGroup || 1,
        compulsorySubjects: ['Toán', 'Ngữ văn'],
        electiveSubject1: updates.electiveSubject1 !== undefined ? updates.electiveSubject1 : (summary?.electiveSubject1 || ''),
        electiveSubject2: updates.electiveSubject2 !== undefined ? updates.electiveSubject2 : (summary?.electiveSubject2 || ''),
        scores: mergedScores,
        gpa10,
        gpa11,
        gpa12,
        gpaAllYears: this.calculateGpaAllYears(gpa10, gpa11, gpa12, this.ruleConfig),
        isForeignLanguageExempt: updates.isForeignLanguageExempt ?? summary?.isForeignLanguageExempt ?? false,
        priorityBonus: updates.priorityBonus ?? summary?.priorityBonus ?? 0,
        encouragementBonus: updates.encouragementBonus ?? summary?.encouragementBonus ?? 0,
        status: 'pending',
        isFlagged: updates.isFlagged ?? summary?.isFlagged ?? false,
        flagReasons: updates.flagReasons !== undefined ? updates.flagReasons : (summary?.flagReasons || []),
        teacherNote: updates.teacherNote !== undefined ? updates.teacherNote : (summary?.teacherNote || ''),
        schoolYear: updates.schoolYear || this.ruleConfig.schoolYear || '2025-2026',
        registeredAt: summary?.updatedAt || new Date().toLocaleDateString('vi-VN'),
        updatedAt: new Date().toLocaleDateString('vi-VN'),
        updatedBy: updates.updatedBy || (isTeacherActor ? 'Giáo viên chủ nhiệm' : 'Học viên')
      };

      const res = this.calculateResult(newReg, this.ruleConfig);
      newReg.calculatedScore = res.score;
      newReg.status = res.status;
      newReg.statusReason = res.reason;

      updated = newReg;
    } else {
      // TRƯỜNG HỢP A: Đã có bản ghi -> UPDATE đúng bản ghi hiện tại (không ghi đè các trường không liên quan)
      const current = this.registrations[idx];

      const mergedScores = updates.scores
        ? { ...(current.scores || {}), ...updates.scores }
        : (current.scores || {});

      updated = {
        ...current,
        ...updates,
        id: current.id || `grad-reg-${canonicalStudentId}`,
        studentId: canonicalStudentId,
        electiveSubject1: updates.electiveSubject1 !== undefined ? updates.electiveSubject1 : (current.electiveSubject1 || ''),
        electiveSubject2: updates.electiveSubject2 !== undefined ? updates.electiveSubject2 : (current.electiveSubject2 || ''),
        priorityBonus: updates.priorityBonus !== undefined ? updates.priorityBonus : (current.priorityBonus ?? 0),
        encouragementBonus: updates.encouragementBonus !== undefined ? updates.encouragementBonus : (current.encouragementBonus ?? 0),
        schoolYear: updates.schoolYear || current.schoolYear || this.ruleConfig.schoolYear || '2025-2026',
        scores: mergedScores,
        updatedAt: new Date().toLocaleDateString('vi-VN'),
        updatedBy: updates.updatedBy || current.updatedBy || (isTeacherActor ? 'Giáo viên chủ nhiệm' : 'Học viên')
      };

      if (student) {
        updated.studentName = student.fullName;
        updated.studentCode = student.code;
        updated.studentGroup = student.group || 1;
      }

      updated.gpaAllYears = this.calculateGpaAllYears(updated.gpa10, updated.gpa11, updated.gpa12, this.ruleConfig);

      const res = this.calculateResult(updated, this.ruleConfig);
      updated.calculatedScore = res.score;
      updated.status = res.status;
      updated.statusReason = res.reason;
    }

    // If user is authenticated against backend, require server persistence to succeed BEFORE mutating local state/statistics
    const isAuthenticated = typeof authService !== 'undefined' && authService.isAuthenticated();
    const saveRes = await graduationRepositoryClient.saveGraduationChoice({
      id: updated.id || `grad_${updated.studentId}`,
      studentId: updated.studentId,
      currentChoice: updated
    });
    const serverSynced = !!saveRes.success;
    if (isAuthenticated && !serverSynced) {
      throw new Error(
        saveRes.message ||
          `Lỗi đồng bộ Máy chủ (/api/v1/graduation) cho học viên ${updated.studentName} (${updated.studentCode}): Không thể lưu dữ liệu vào cơ sở dữ liệu máy chủ. Vui lòng kiểm tra kết nối và thử lại.`
      );
    }

    // Commit to in-memory registrations only after server save succeeds (or in local offline mode)
    if (idx === -1) {
      this.registrations.push(updated);
      if (updated.electiveSubject1 && updated.electiveSubject2 && updates.source !== 'GRADE12_START_YEAR_SURVEY') {
        this.recordChoiceHistory({
          classId: updated.studentGroup ? `group-${updated.studentGroup}` : 'class-12a1',
          schoolYear: updated.schoolYear || this.ruleConfig.schoolYear || '2025-2026',
          studentId: updated.studentId,
          electiveSubject1: updated.electiveSubject1,
          electiveSubject2: updated.electiveSubject2,
          source: 'STUDENT_UPDATE',
          note: isTeacherActor ? 'GVCN khởi tạo / cập nhật môn thi tự chọn tại Phần 4' : 'Học viên đăng ký môn thi tự chọn',
          changedAt: new Date().toLocaleDateString('vi-VN') + ' ' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          changedBy: updated.updatedBy || (isTeacherActor ? 'Giáo viên chủ nhiệm' : 'Học viên')
        });
      }
    } else {
      const current = this.registrations[idx];
      const oldSub1 = current?.electiveSubject1;
      const oldSub2 = current?.electiveSubject2;
      this.registrations[idx] = updated;

      const newSub1 = updated.electiveSubject1;
      const newSub2 = updated.electiveSubject2;
      if (newSub1 && newSub2 && (newSub1 !== oldSub1 || newSub2 !== oldSub2)) {
        if (updates.source !== 'GRADE12_START_YEAR_SURVEY') {
          this.recordChoiceHistory({
            classId: updated.studentGroup ? `group-${updated.studentGroup}` : 'class-12a1',
            schoolYear: updated.schoolYear || this.ruleConfig.schoolYear || '2025-2026',
            studentId: updated.studentId,
            electiveSubject1: newSub1,
            electiveSubject2: newSub2,
            source: 'STUDENT_UPDATE',
            note: isTeacherActor ? 'GVCN cập nhật môn thi tự chọn tại Phần 4' : 'Học viên cập nhật lại môn thi tự chọn',
            changedAt: new Date().toLocaleDateString('vi-VN') + ' ' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            changedBy: updated.updatedBy || (isTeacherActor ? 'Giáo viên chủ nhiệm' : 'Học viên')
          });
        }
      }
    }

    // Deduplicate in-memory registrations by canonical studentId
    const dedupMap = new Map<string, GraduationRegistration>();
    for (const r of this.registrations) {
      dedupMap.set(r.studentId, r);
    }
    this.registrations = Array.from(dedupMap.values());

    this.saveRegistrations();

    let profileSynced = false;
    try {
      // POST /api/v1/graduation already synchronizes graduationSummary in SQLite on the server
      profileSynced = studentService.updateStudentGraduationSummary(updated.studentId, updated, !serverSynced);
    } catch (e) {
      console.warn('[GraduationService] sync to studentService warning:', e);
    }

    this.notify();

    if (student && !profileSynced) {
      throw new Error(
        `Lỗi đồng bộ Hồ sơ cá nhân cho học viên ${updated.studentName} (${updated.studentCode}): Đã lưu bảng theo dõi nhưng chưa cập nhật được vào Hồ sơ cá nhân học viên.`
      );
    }

    return updated;
  }

  public getChoiceHistory(studentId: string, schoolYear?: string): GraduationChoiceHistory[] {
    const list = this.choiceHistory.filter(h => {
      if (h.studentId !== studentId) return false;
      if (schoolYear && h.schoolYear && h.schoolYear !== schoolYear) return false;
      return true;
    });

    // Sort newest first
    return [...list].reverse();
  }

  public recordChoiceHistory(entry: Omit<GraduationChoiceHistory, 'id' | 'tenantId'>): GraduationChoiceHistory {
    const tId = tenantService.normalizeTenantId(this.activeTenantId);
    const existing = this.choiceHistory.filter(h => h.studentId === entry.studentId);

    // If START_YEAR_SURVEY, ensure only 1 record per student
    if (entry.source === 'START_YEAR_SURVEY') {
      const existingSurvey = existing.find(h => h.source === 'START_YEAR_SURVEY' && (!entry.schoolYear || h.schoolYear === entry.schoolYear));
      if (existingSurvey) {
        return existingSurvey;
      }
    }

    // Check if the latest record for this student is identical (idempotency)
    const latest = existing[existing.length - 1];
    if (
      latest &&
      latest.electiveSubject1 === entry.electiveSubject1 &&
      latest.electiveSubject2 === entry.electiveSubject2 &&
      latest.source === entry.source
    ) {
      return latest;
    }

    const newRecord: GraduationChoiceHistory = {
      id: `grad-hist-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      tenantId: tId,
      classId: entry.classId || 'class-12a1',
      schoolYear: entry.schoolYear || this.ruleConfig.schoolYear || '2025-2026',
      studentId: entry.studentId,
      electiveSubject1: entry.electiveSubject1,
      electiveSubject2: entry.electiveSubject2,
      source: entry.source,
      sourceSurveyId: entry.sourceSurveyId,
      note: entry.note,
      changedAt: entry.changedAt || (new Date().toLocaleDateString('vi-VN') + ' ' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })),
      changedBy: entry.changedBy
    };

    this.choiceHistory.push(newRecord);
    this.saveChoiceHistory(tId);
    return newRecord;
  }

  public updateElectiveSubjects(studentId: string, sub1: string, sub2: string, updatedBy?: string) {
    const reg = this.getByStudentId(studentId);
    if (!reg) return;
    this.updateRegistration(reg.id, {
      electiveSubject1: sub1,
      electiveSubject2: sub2,
      hasStudentCustomizedChoice: true,
      source: 'STUDENT_MANUAL',
      updatedBy: updatedBy || 'Học sinh'
    });
  }

  /**
   * Đồng bộ môn thi tốt nghiệp THPT từ khảo sát
   * Đảm bảo: CURRENT STUDENT CHOICE > INITIAL SURVEY CHOICE (Idempotent)
   */
  public syncSurveyGraduationPlan(
    studentId: string,
    surveyId: string,
    sub1: string,
    sub2: string,
    options?: { force?: boolean }
  ): boolean {
    if (!studentId || !sub1 || !sub2 || sub1 === 'Chưa xác định' || sub2 === 'Chưa xác định' || sub1 === sub2) {
      return false;
    }

    // Always record or verify the initial survey history record (idempotent)
    this.recordChoiceHistory({
      classId: 'class-12a1',
      schoolYear: this.ruleConfig.schoolYear || '2025-2026',
      studentId,
      electiveSubject1: sub1,
      electiveSubject2: sub2,
      source: 'START_YEAR_SURVEY',
      sourceSurveyId: surveyId,
      note: 'Nguyện vọng ghi nhận từ khảo sát',
      changedAt: '05/09/2025',
      changedBy: 'Khảo sát'
    });

    const reg = this.getByStudentId(studentId);
    if (!reg) {
      const student = studentService.getById(studentId);
      if (!student) return false;

      const newReg: GraduationRegistration = {
        id: `grad-reg-${student.id}`,
        studentId: student.id,
        studentName: student.fullName,
        studentCode: student.code,
        studentGroup: student.group || 1,
        compulsorySubjects: ['Toán', 'Ngữ văn'],
        electiveSubject1: sub1,
        electiveSubject2: sub2,
        scores: { math: 8.0, literature: 7.5, elective1: 8.0, elective2: 8.0 },
        gpa12: 8.0,
        priorityBonus: 0,
        encouragementBonus: 0,
        status: 'pending',
        schoolYear: '2025-2026',
        source: 'GRADE12_START_YEAR_SURVEY',
        sourceSurveyId: surveyId,
        initialSurveyChoice: true,
        hasStudentCustomizedChoice: false,
        registeredAt: new Date().toLocaleDateString('vi-VN'),
        updatedAt: new Date().toLocaleDateString('vi-VN'),
        updatedBy: 'Khảo sát'
      };
      const res = this.calculateResult(newReg, this.ruleConfig);
      newReg.calculatedScore = res.score;
      newReg.status = res.status;
      newReg.statusReason = res.reason;
      this.registrations.push(newReg);
      this.saveRegistrations();
      return true;
    }

    // If registration exists:
    // If student has already manually customized their choice in the graduation tab, do NOT overwrite unless force is set!
    if (reg.hasStudentCustomizedChoice && !options?.force) {
      // Keep student's manual choice!
      return false;
    }

    // Update with survey choices
    const idx = this.registrations.findIndex(r => r.id === reg.id);
    if (idx !== -1) {
      const updated: GraduationRegistration = {
        ...reg,
        electiveSubject1: sub1,
        electiveSubject2: sub2,
        source: 'GRADE12_START_YEAR_SURVEY',
        sourceSurveyId: surveyId,
        initialSurveyChoice: true,
        updatedAt: new Date().toLocaleDateString('vi-VN'),
        updatedBy: 'Khảo sát'
      };
      const res = this.calculateResult(updated, this.ruleConfig);
      updated.calculatedScore = res.score;
      updated.status = res.status;
      updated.statusReason = res.reason;
      this.registrations[idx] = updated;
      this.saveRegistrations();
      return true;
    }
    return false;
  }

  public async toggleStudentFlag(
    studentId: string,
    isFlagged: boolean,
    flagReasons?: string[],
    teacherNote?: string
  ): Promise<GraduationRegistration | undefined> {
    const reg = this.getByStudentId(studentId);
    const nextReasons = flagReasons !== undefined
      ? flagReasons.map(r => r.trim()).filter(Boolean)
      : (reg?.flagReasons || []);
    const nextNote = teacherNote !== undefined
      ? teacherNote.trim()
      : (reg?.teacherNote || '').trim();
    const effectiveIsFlagged = Boolean(isFlagged && (nextNote.length > 0 || nextReasons.length > 0));

    if (!reg) {
      const student = studentService.getById(studentId);
      const studentName = student?.fullName || 'Học viên';
      const studentCode = student?.code || '';
      const studentGroup = student?.group || 1;

      return await this.updateRegistration(`grad-reg-${studentId}`, {
        studentId,
        studentName,
        studentCode,
        studentGroup,
        isFlagged: effectiveIsFlagged,
        flagReasons: effectiveIsFlagged ? nextReasons : [],
        teacherNote: effectiveIsFlagged ? nextNote : '',
        updatedBy: 'Giáo viên chủ nhiệm'
      });
    }

    return await this.updateRegistration(reg.id, {
      studentId: reg.studentId,
      isFlagged: effectiveIsFlagged,
      flagReasons: effectiveIsFlagged ? nextReasons : [],
      teacherNote: effectiveIsFlagged ? nextNote : '',
      updatedBy: 'Giáo viên chủ nhiệm'
    });
  }

  public getRuleConfig(): GraduationRuleConfig {
    return { ...this.ruleConfig };
  }

  public updateRuleConfig(newConfig: Partial<GraduationRuleConfig>) {
    this.ruleConfig = { ...this.ruleConfig, ...newConfig, updatedAt: new Date().toLocaleDateString('vi-VN') };
    this.saveConfig();
  }

  public resetRuleConfig() {
    this.ruleConfig = { ...DEFAULT_GRADUATION_RULE_CONFIG };
    this.saveConfig();
  }

  public async exportToExcel(options?: {
    className?: string;
    filterType?: 'all' | 'flagged' | 'group' | 'elective1' | 'elective2';
    filterValue?: string | number;
    selectedStudentIds?: string[];
  }) {
    const XLSX = await import('xlsx');
    const className = options?.className || '12A1';
    let exportList = [...this.registrations];

    if (options?.selectedStudentIds && options.selectedStudentIds.length > 0) {
      exportList = exportList.filter(r => options.selectedStudentIds!.includes(r.studentId));
    } else if (options?.filterType === 'flagged') {
      exportList = exportList.filter(r => r.isFlagged);
    } else if (options?.filterType === 'group' && options.filterValue) {
      exportList = exportList.filter(r => r.studentGroup === Number(options.filterValue));
    } else if (options?.filterType === 'elective1' && options.filterValue) {
      exportList = exportList.filter(r => r.electiveSubject1 === String(options.filterValue));
    } else if (options?.filterType === 'elective2' && options.filterValue) {
      exportList = exportList.filter(r => r.electiveSubject2 === String(options.filterValue));
    }

    const data = exportList.map((r, i) => ({
      STT: i + 1,
      'Mã học sinh': r.studentCode,
      'Họ và tên': r.studentName,
      Tổ: `Tổ ${r.studentGroup}`,
      'Môn bắt buộc 1': 'Toán',
      'Môn bắt buộc 2': 'Ngữ văn',
      'Môn tự chọn 1': r.electiveSubject1,
      'Môn tự chọn 2': r.electiveSubject2,
      'Điểm Toán': r.scores.math ?? '',
      'Điểm Ngữ văn': r.scores.literature ?? '',
      [`Điểm ${r.electiveSubject1}`]: r.scores.elective1 ?? '',
      [`Điểm ${r.electiveSubject2}`]: r.scores.elective2 ?? '',
      'ĐTB Lớp 10': r.gpa10 ?? '',
      'ĐTB Lớp 11': r.gpa11 ?? '',
      'ĐTB Lớp 12': r.gpa12 ?? '',
      'ĐTB các năm học (hệ số 1-2-3)': r.gpaAllYears ?? '',
      'Điểm Ưu tiên': r.priorityBonus ?? 0,
      'Điểm Khuyến khích': r.encouragementBonus ?? 0,
      'Điểm Xét Tốt Nghiệp Dự Kiến': r.calculatedScore !== undefined ? r.calculatedScore.toFixed(2) : '',
      'Cần chú ý': r.isFlagged ? 'CÓ (⚠️)' : 'Không',
      'Lý do theo dõi': r.flagReasons && r.flagReasons.length > 0 ? r.flagReasons.join(', ') : '',
      'Ghi chú GVCN': r.teacherNote || '',
      'Dự Báo Điều Kiện':
        r.status === 'qualified'
          ? 'Đủ điều kiện'
          : r.status === 'at_risk'
          ? 'Nguy cơ / Cận điểm chuẩn'
          : r.status === 'unqualified'
          ? 'Chưa đạt điều kiện'
          : 'Chưa đủ dữ liệu',
      'Đánh giá chi tiết': r.statusReason || ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Xet_Tot_Nghiep_THPT');
    XLSX.writeFile(wb, `DanhSach_Xet_Tot_Nghiep_THPT_Lop_${className}.xlsx`);
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }
}

export const graduationService = new GraduationService();
