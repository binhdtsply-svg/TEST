/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  SurveyTemplate,
  StudentSurveyResponse,
  SurveySyncState,
  SurveySyncProposal,
  SurveySyncAudit,
  SurveySyncedTarget,
  SurveyProposalCategory,
  SurveyProposalStatus,
  UserRole,
  Student
} from '../types';
import { tenantService } from './TenantService';
import { authService } from './AuthService';
import { studentService } from './StudentService';
import { careerService } from './CareerService';
import { classService } from './ClassService';
import { graduationService } from './GraduationService';
import { studentSurveyService } from './StudentSurveyService';
import { surveyTemplateService } from './SurveyTemplateService';
import { conductEvaluationService } from './ConductEvaluationService';
import { safeLocalStorageSet, safeLocalStorageGet } from '../utils/storageUtils';
import {
  unwrapAnswerValue,
  normalizeConductGrade,
  determineConductSemester,
  extractCleanAnswerText
} from '../utils/surveyAnswerUtils';

class SurveySyncService {
  private activeTenantId: string = 'tenant-lan-nguyen';
  private syncStates: Record<string, SurveySyncState> = {}; // surveyId -> SurveySyncState
  private proposals: SurveySyncProposal[] = [];
  private audits: SurveySyncAudit[] = [];
  private listeners: Array<() => void> = [];
  private channel: BroadcastChannel | null = null;

  constructor() {
    this.activeTenantId = tenantService.getActiveTenantId();
    this.loadFromStorage(this.activeTenantId);

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel('kgcns_survey_sync_channel');
        this.channel.onmessage = (event) => {
          if (event.data?.type === 'SYNC_UPDATED' && event.data?.tenantId === this.activeTenantId) {
            this.loadFromStorage(this.activeTenantId);
            this.notify();
          }
        };
      } catch {
        // ignore
      }
    }

    tenantService.subscribe(() => {
      const nextTenantId = tenantService.getActiveTenantId();
      if (nextTenantId !== this.activeTenantId) {
        this.activeTenantId = nextTenantId;
        this.loadFromStorage(nextTenantId);
        this.notify();
      }
    });
  }

  public reloadForActiveTenant(): void {
    this.activeTenantId = tenantService.getActiveTenantId();
    this.loadFromStorage(this.activeTenantId);
    this.notify();
  }

  private loadFromStorage(tenantId: string): void {
    const tId = tenantService.normalizeTenantId(tenantId);
    try {
      const stateKey = tenantService.getTenantStorageKey('survey_sync_states', tId);
      const savedStates = safeLocalStorageGet(stateKey);
      this.syncStates = savedStates ? JSON.parse(savedStates) : {};

      const propKey = tenantService.getTenantStorageKey('survey_sync_proposals', tId);
      const savedProps = safeLocalStorageGet(propKey);
      if (savedProps) {
        const parsed: SurveySyncProposal[] = JSON.parse(savedProps);
        this.proposals = parsed
          .map(p => {
            let resolvedTpl = p.templateId;
            if (!resolvedTpl || resolvedTpl.startsWith('survey-')) {
              const parent = studentSurveyService.getSurveyById(p.surveyId);
              resolvedTpl = parent?.surveyTemplateId || (parent as any)?.templateId ||
                (parent?.surveyType === 'GRADE12_START_YEAR' ? 'template-grade12-default-v1' : undefined);
            }
            return { ...p, templateId: resolvedTpl || p.templateId };
          })
          .filter(p => {
            // Prune illegal cross-contaminated proposals
            const tpl = p.templateId || '';
            if (p.category === 'CONDUCT_SELF_EVALUATION') {
              if (tpl === 'template-grade12-default-v1' || tpl.includes('grade12') || tpl.includes('parent')) {
                return false;
              }
            }
            if (tpl === 'template-conduct-hk1' || tpl.includes('conduct')) {
              if (
                p.category === 'GRADUATION_ELECTIVES' ||
                p.category === 'CONTACT_UPDATE' ||
                p.category === 'SEATING_PREFERENCE' ||
                p.category === 'CLASS_OFFICER_CANDIDACY' ||
                p.category === 'HEALTH_SENSITIVE' ||
                p.category === 'FAMILY_DIFFICULTY'
              ) {
                return false;
              }
            }
            return true;
          });
      } else {
        this.proposals = [];
      }

      const auditKey = tenantService.getTenantStorageKey('survey_sync_audits', tId);
      const savedAudits = safeLocalStorageGet(auditKey);
      this.audits = savedAudits ? JSON.parse(savedAudits) : [];
    } catch {
      this.syncStates = {};
      this.proposals = [];
      this.audits = [];
    }
  }

  private saveToStorage(notifyChannel: boolean = true): void {
    const tId = tenantService.normalizeTenantId(this.activeTenantId);
    try {
      const stateKey = tenantService.getTenantStorageKey('survey_sync_states', tId);
      safeLocalStorageSet(stateKey, JSON.stringify(this.syncStates));

      const propKey = tenantService.getTenantStorageKey('survey_sync_proposals', tId);
      safeLocalStorageSet(propKey, JSON.stringify(this.proposals));

      const auditKey = tenantService.getTenantStorageKey('survey_sync_audits', tId);
      safeLocalStorageSet(auditKey, JSON.stringify(this.audits));

      if (notifyChannel && this.channel) {
        this.channel.postMessage({ type: 'SYNC_UPDATED', tenantId: tId });
      }
    } catch (e) {
      console.warn('Error saving SurveySync data:', e);
    }
    this.notify();
  }

  // =========================================================================
  // INTELLIGENT QUESTION & ANSWER EXTRACTOR ACROSS ALL SURVEY TEMPLATES
  // =========================================================================

  /**
   * Universal extractor that safely resolves answers across all surveys:
   * 1. Nested objects (answers.contact.phone)
   * 2. Flat question keys (answers['contact.phone'] or answers['q-contact-phone'])
   * 3. Template-defined questions matching key, id, or Vietnamese title keywords
   * 4. Dynamic responses array [(survey as any).responses]
   * 5. Other text inputs (answers.otherText[key])
   * 6. Fuzzy key lookup
   */
  public extractValue(
    answers: any,
    survey: StudentSurveyResponse,
    targetTemplate: SurveyTemplate | null | undefined,
    keys: string[],
    titleKeywords: string[][]
  ): any {
    if (!answers && !survey) return undefined;

    // 1. Direct key lookup in answers (nested or flat)
    for (const k of keys) {
      if (answers) {
        if (answers[k] !== undefined && answers[k] !== null && answers[k] !== '') {
          return answers[k];
        }
        if (k.includes('.')) {
          const parts = k.split('.');
          let curr = answers;
          let found = true;
          for (const p of parts) {
            if (curr === undefined || curr === null || typeof curr !== 'object') {
              found = false;
              break;
            }
            curr = curr[p];
          }
          if (found && curr !== undefined && curr !== null && curr !== '') {
            return curr;
          }
        }
      }
    }

    // 2. Check answers.otherText
    if (answers?.otherText && typeof answers.otherText === 'object') {
      for (const k of keys) {
        if (answers.otherText[k]) return answers.otherText[k];
      }
    }

    // 3. Match against targetTemplate questions by titleKeywords or id/key
    if (targetTemplate && Array.isArray(targetTemplate.sections)) {
      for (const sec of targetTemplate.sections) {
        if (Array.isArray(sec.questions)) {
          for (const q of sec.questions) {
            const qTitle = (q.title || '').toLowerCase();
            const qKey = (q.key || '').toLowerCase();
            const qId = (q.id || '').toLowerCase();

            const isKeyMatch = keys.some(k => {
              const lk = k.toLowerCase();
              return qKey === lk || qId === lk || qKey.endsWith(lk) || qId.endsWith(lk);
            });

            const isTitleMatch = titleKeywords.some(keywordGroup =>
              keywordGroup.every(kw => qTitle.includes(kw.toLowerCase()))
            );

            if (isKeyMatch || isTitleMatch) {
              if (answers) {
                if (answers[q.key] !== undefined && answers[q.key] !== null && answers[q.key] !== '') return answers[q.key];
                if (answers[q.id] !== undefined && answers[q.id] !== null && answers[q.id] !== '') return answers[q.id];
                if (q.key && q.key.includes('.')) {
                  const parts = q.key.split('.');
                  let curr = answers;
                  let found = true;
                  for (const p of parts) {
                    if (curr === undefined || curr === null || typeof curr !== 'object') {
                      found = false;
                      break;
                    }
                    curr = curr[p];
                  }
                  if (found && curr !== undefined && curr !== null && curr !== '') return curr;
                }
              }
              if (answers?.otherText?.[q.id]) return answers.otherText[q.id];
              if (answers?.otherText?.[q.key]) return answers.otherText[q.key];
            }
          }
        }
      }
    }

    // 4. Match against (survey as any).responses array
    const responses = (survey as any).responses;
    if (Array.isArray(responses)) {
      for (const r of responses) {
        const rTitle = (r.questionTitle || '').toLowerCase();
        const rId = (r.questionId || '').toLowerCase();
        const isKeyMatch = keys.some(k => rId === k.toLowerCase() || rId.endsWith(k.toLowerCase()));
        const isTitleMatch = titleKeywords.some(keywordGroup =>
          keywordGroup.every(kw => rTitle.includes(kw.toLowerCase()))
        );
        if (isKeyMatch || isTitleMatch) {
          if (r.answer !== undefined && r.answer !== null && r.answer !== '') {
            return r.answer;
          }
        }
      }
    }

    // 5. Exact match on top-level keys in answers
    if (answers && typeof answers === 'object') {
      for (const [k, v] of Object.entries(answers)) {
        if (v === undefined || v === null || v === '') continue;
        const lowerK = k.toLowerCase();
        for (const targetKey of keys) {
          const lTarget = targetKey.toLowerCase();
          if (lowerK === lTarget) {
            if (typeof v === 'string' || typeof v === 'number' || Array.isArray(v)) {
              return v;
            }
          }
        }
      }
    }

    return undefined;
  }

  // =========================================================================
  // CORE SELECTIVE SYNC PROCESSING
  // =========================================================================

  /**
   * Process and selectively synchronize a survey response.
   * STRICT IDEMPOTENCY: Re-running multiple times does not duplicate records.
   * STRICT INTEGRITY: Never mutates raw StudentSurveyResponse.
   * STRICT ROLE GUARD: Teachers/Admins can sync any student survey; Students only their own.
   */
  public async processSurvey(
    surveyId: string,
    options?: { force?: boolean }
  ): Promise<SurveySyncState> {
    const activeTenantId = tenantService.getActiveTenantId();
    const tId = tenantService.normalizeTenantId(activeTenantId);

    // 1. Role Guard & Session check
    const currentUser = authService.getCurrentUser();
    const role = currentUser?.role;
    const isTeacherOrAdmin = role === 'TEACHER' || role === 'SUPER_ADMIN';

    // 2. Validate survey existence
    const survey = studentSurveyService.getSurveyById(surveyId);
    if (!survey) {
      throw new Error('Không tìm thấy bản khảo sát trong hệ thống.');
    }

    // 3. Validate tenant match
    if (survey.tenantId && tenantService.normalizeTenantId(survey.tenantId) !== tId) {
      throw new Error('Bản khảo sát không thuộc không gian làm việc / tenant hiện tại.');
    }

    // 4. Validate permissions for non-teachers
    if (!isTeacherOrAdmin) {
      if (!currentUser?.studentId || currentUser.studentId !== survey.studentId) {
        throw new Error('Bạn không có quyền đồng bộ khảo sát của học viên khác.');
      }
    }

    // 5. Derive studentId strictly from survey record
    const targetStudentId = survey.studentId;
    if (!targetStudentId) {
      throw new Error('Bản khảo sát không có thông tin mã học viên hợp lệ.');
    }

    // 6. Validate student profile exists in StudentService
    const student = studentService.getById(targetStudentId);
    if (!student) {
      throw new Error(`Không tìm thấy hồ sơ học viên (ID: ${targetStudentId}) trong danh sách lớp.`);
    }

    const templateId = survey.surveyTemplateId || (survey as any).templateId || (survey.surveyType as string) || 'template-grade12-default-v1';
    let targetTemplate = surveyTemplateService.getById(templateId);
    if (!targetTemplate) {
      targetTemplate = surveyTemplateService.getTemplateById(templateId);
    }
    const templateTitle = targetTemplate?.title || 'Khảo sát';

    const templateQuestionKeys = new Set<string>();
    const templateQuestionIds = new Set<string>();
    const templateQuestionTitles = new Set<string>();
    if (targetTemplate && Array.isArray(targetTemplate.sections)) {
      for (const sec of targetTemplate.sections) {
        if (Array.isArray(sec.questions)) {
          for (const q of sec.questions) {
            if (q.key) templateQuestionKeys.add(q.key.toLowerCase());
            if (q.id) templateQuestionIds.add(q.id.toLowerCase());
            if (q.title) templateQuestionTitles.add(q.title.toLowerCase());
          }
        }
      }
    }

    const isConductTemplate = templateId === 'template-conduct-hk1' || 
      templateId.includes('conduct') || 
      (targetTemplate as any)?.type === 'CONDUCT_EVALUATION' ||
      (templateTitle.toLowerCase().includes('rèn luyện') || templateTitle.toLowerCase().includes('hạnh kiểm'));

    const isStartYearTemplate = templateId === 'template-grade12-default-v1' || 
      templateId === 'grade12_start_year' || 
      (targetTemplate as any)?.type === 'START_YEAR' ||
      (templateTitle.toLowerCase().includes('đầu năm'));

    const isParentTemplate = templateId.includes('parent') ||
      (targetTemplate?.targetAudience && targetTemplate.targetAudience.includes('PARENT')) ||
      templateTitle.toLowerCase().includes('phụ huynh');

    const answers = survey.answers || {};
    const syncedTargets: SurveySyncedTarget[] = [];
    const errors: string[] = [];
    const nowStr = new Date().toISOString();

    // Helper: Determine if this specific survey template contains questions for this domain
    const hasQuestionInTemplate = (fieldKeys: string[], titleKeywords: string[][]): boolean => {
      if (templateQuestionKeys.size > 0 || templateQuestionIds.size > 0 || templateQuestionTitles.size > 0) {
        const keyFound = fieldKeys.some(k => {
          const lk = k.toLowerCase();
          return templateQuestionKeys.has(lk) || templateQuestionIds.has(lk) ||
            Array.from(templateQuestionKeys).some(tk => tk.endsWith(lk) || lk.endsWith(tk)) ||
            Array.from(templateQuestionIds).some(tid => tid.endsWith(lk) || lk.endsWith(tid));
        });
        if (keyFound) return true;

        const titleFound = titleKeywords.some(keywordGroup =>
          Array.from(templateQuestionTitles).some(qt =>
            keywordGroup.every(kw => qt.includes(kw.toLowerCase()))
          )
        );
        return titleFound;
      }
      return false;
    };

    // -----------------------------------------------------------------------
    // GROUP A: AUTO_SYNC (Safe, student-owned fields only)
    // -----------------------------------------------------------------------

    // 1. Talents -> Student.talents (whitelisted patch only)
    const rawTalents = hasQuestionInTemplate(
      ['talentsAndDigitalSkills.talents', 'talents', 'nang_khieu', 'so_thich', 'the_manh_ca_nhan'],
      [['năng khiếu'], ['sở thích'], ['thế mạnh cá nhân']]
    ) ? this.extractValue(
      answers, survey, targetTemplate,
      ['talentsAndDigitalSkills.talents', 'talents', 'nang_khieu', 'so_thich', 'the_manh_ca_nhan'],
      [['năng khiếu'], ['sở thích'], ['thế mạnh cá nhân']]
    ) : undefined;
    if (rawTalents) {
      try {
        let talentsStr = '';
        if (Array.isArray(rawTalents) && rawTalents.length > 0) {
          talentsStr = rawTalents.filter(t => t && String(t).trim() !== '').join(', ');
        } else if (typeof rawTalents === 'string' && rawTalents.trim() !== '') {
          talentsStr = rawTalents.trim();
        }

        if (talentsStr) {
          studentService.updateStudentProfileByStudent(student.id, { talents: talentsStr });
          this.logAudit({
            surveyId,
            studentId: student.id,
            studentName: student.fullName,
            action: 'AUTO_SYNC_TALENTS',
            fieldGroup: 'talentsAndDigitalSkills',
            oldValue: student.talents || '',
            newValue: talentsStr,
            details: `Tự động đồng bộ năng khiếu từ bài khảo sát "${templateTitle}"`
          });
          syncedTargets.push({
            fieldGroup: 'talents',
            mode: 'AUTO_SYNC',
            targetModule: 'StudentService',
            targetId: student.id,
            status: 'SYNCED',
            message: `Đã cập nhật năng khiếu: ${talentsStr}`,
            syncedAt: nowStr
          });
        }
      } catch (err: any) {
        errors.push(`Lỗi đồng bộ năng khiếu: ${err?.message || 'Không rõ'}`);
        syncedTargets.push({
          fieldGroup: 'talents',
          mode: 'AUTO_SYNC',
          status: 'FAILED',
          message: err?.message
        });
      }
    }

    if (!isConductTemplate) {
      // 2. Career Orientation -> CareerProfile (semantic patch, no fake ONET assessment)
      const postHighSchoolPlan = this.extractValue(
        answers, survey, targetTemplate,
        ['careerOrientation.postHighSchoolPlan', 'postHighSchoolPlan', 'q-career-plan', 'du_dinh_sau_tot_nghiep'],
        [['dự định', 'tốt nghiệp'], ['sau tốt nghiệp']]
      );
    const targetCareerAndSchool = this.extractValue(
      answers, survey, targetTemplate,
      ['careerOrientation.targetCareerAndSchool', 'targetCareerAndSchool', 'q-career-target', 'nganh_nghe_mo_uoc', 'truong_mo_uoc'],
      [['ngành nghề', 'mơ ước'], ['trường', 'mơ ước'], ['định hướng nghề']]
    );
    const previousHollandCode = this.extractValue(
      answers, survey, targetTemplate,
      ['careerOrientation.previousHollandCode', 'previousHollandCode', 'ma_holland'],
      [['mã holland']]
    );
    const careerClarity = this.extractValue(
      answers, survey, targetTemplate,
      ['careerOrientation.careerClarity', 'careerClarity'],
      [['mức độ rõ ràng', 'nghề nghiệp']]
    );
    const interestFields = this.extractValue(
      answers, survey, targetTemplate,
      ['careerOrientation.interestFields', 'interestFields'],
      [['lĩnh vực quan tâm']]
    );
    const careerConcerns = this.extractValue(
      answers, survey, targetTemplate,
      ['careerOrientation.concerns', 'careerConcerns'],
      [['băn khoăn', 'hướng nghiệp']]
    );

    if (postHighSchoolPlan || targetCareerAndSchool || previousHollandCode || careerClarity) {
      try {
        careerService.patchProfileFromSurvey(student.id, {
          postHighSchoolPlan: postHighSchoolPlan ? String(postHighSchoolPlan) : undefined,
          careerClarity: careerClarity ? String(careerClarity) : undefined,
          interestFields: Array.isArray(interestFields) ? interestFields : undefined,
          targetCareerAndSchool: targetCareerAndSchool ? String(targetCareerAndSchool) : undefined,
          careerConcerns: Array.isArray(careerConcerns) ? careerConcerns : undefined,
          selfReportedHollandCode: previousHollandCode ? String(previousHollandCode) : undefined,
          sourceSurveyId: survey.id
        });

        this.logAudit({
          surveyId,
          studentId: student.id,
          studentName: student.fullName,
          action: 'AUTO_SYNC_CAREER',
          fieldGroup: 'careerOrientation',
          newValue: {
            postHighSchoolPlan,
            targetCareerAndSchool,
            selfReportedHollandCode: previousHollandCode
          },
          details: `Tự động đồng bộ định hướng nghề nghiệp từ bài khảo sát "${templateTitle}"`
        });

        syncedTargets.push({
          fieldGroup: 'careerOrientation',
          mode: 'AUTO_SYNC',
          targetModule: 'CareerService',
          targetId: student.id,
          status: 'SYNCED',
          message: 'Đã đồng bộ hồ sơ hướng nghiệp và mã Holland tự khai',
          syncedAt: nowStr
        });
      } catch (err: any) {
        errors.push(`Lỗi đồng bộ hướng nghiệp: ${err?.message || 'Không rõ'}`);
        syncedTargets.push({
          fieldGroup: 'careerOrientation',
          mode: 'AUTO_SYNC',
          status: 'FAILED',
          message: err?.message
        });
      }
    }

    // 3. Goals -> PersonalGoals in ClassService (Idempotent: matches sourceSurveyId, progress = 0)
    const academicGoal = this.extractValue(
      answers, survey, targetTemplate,
      ['goals.academicGoal', 'academicGoal', 'muc_tieu_hoc_tap'],
      [['mục tiêu học tập']]
    );
    const personalImprovementGoal = this.extractValue(
      answers, survey, targetTemplate,
      ['goals.personalImprovementGoal', 'personalImprovementGoal', 'muc_tieu_ren_luyen'],
      [['mục tiêu rèn luyện'], ['phát triển bản thân']]
    );
    const actionPlan = this.extractValue(
      answers, survey, targetTemplate,
      ['goals.actionAndSupportPlan', 'actionAndSupportPlan', 'ke_hoach_hanh_dong'],
      [['kế hoạch hành động']]
    );

    if (academicGoal || personalImprovementGoal) {
      try {
        const existingStudentGoals = classService.getPersonalGoals(student.id);

        if (academicGoal && String(academicGoal).trim() !== '') {
          const strAcad = String(academicGoal).trim();
          const existingAcademic = existingStudentGoals.find(
            g => g.sourceSurveyId === survey.id && g.category === 'Học tập'
          );
          if (existingAcademic) {
            classService.updatePersonalGoal(existingAcademic.id, {
              target: strAcad,
              description: actionPlan ? `Kế hoạch hành động: ${String(actionPlan).trim()}` : existingAcademic.description
            });
          } else {
            classService.savePersonalGoal({
              studentId: student.id,
              studentName: student.fullName,
              title: `Mục tiêu học tập (${templateTitle})`,
              category: 'Học tập',
              target: strAcad,
              description: actionPlan ? `Kế hoạch hành động: ${String(actionPlan).trim()}` : undefined,
              progress: 0,
              semester: isConductTemplate ? 'HK2' : 'HK1',
              source: 'SURVEY_SYNC',
              sourceSurveyId: survey.id,
              status: 'in_progress',
              parentVisible: false
            });
          }
        }

        if (personalImprovementGoal && String(personalImprovementGoal).trim() !== '') {
          const strSkill = String(personalImprovementGoal).trim();
          const existingSkill = existingStudentGoals.find(
            g => g.sourceSurveyId === survey.id && (g.category === 'Kỹ năng' || g.category === 'Thói quen')
          );
          if (existingSkill) {
            classService.updatePersonalGoal(existingSkill.id, {
              target: strSkill
            });
          } else {
            classService.savePersonalGoal({
              studentId: student.id,
              studentName: student.fullName,
              title: `Mục tiêu rèn luyện & phát triển (${templateTitle})`,
              category: 'Kỹ năng',
              target: strSkill,
              progress: 0,
              semester: isConductTemplate ? 'HK2' : 'HK1',
              source: 'SURVEY_SYNC',
              sourceSurveyId: survey.id,
              status: 'in_progress',
              parentVisible: false
            });
          }
        }

        syncedTargets.push({
          fieldGroup: 'goals',
          mode: 'AUTO_SYNC',
          targetModule: 'ClassService.PersonalGoals',
          targetId: student.id,
          status: 'SYNCED',
          message: 'Đã tạo/cập nhật mục tiêu năm học (tiến độ 0%)',
          syncedAt: nowStr
        });
      } catch (err: any) {
        errors.push(`Lỗi đồng bộ mục tiêu: ${err?.message || 'Không rõ'}`);
        syncedTargets.push({
          fieldGroup: 'goals',
          mode: 'AUTO_SYNC',
          status: 'FAILED',
          message: err?.message
        });
      }
    }

    // -----------------------------------------------------------------------
    // GROUP B: REVIEW_REQUIRED (Proposals created for GVCN review)
    // -----------------------------------------------------------------------

    // 4. Contact Update Proposal (phone, parent phone, emergency contact, living with)
    // 4. Contact Update Proposal (phone, parent phone, emergency contact, living with, address)
    const hasContactQuestions = !isConductTemplate && hasQuestionInTemplate(
      ['contact.phone', 'contact.emergencyContactPhone', 'contact.emergencyContactName', 'contact.livingWith', 'contact.address', 'address', 'dia_chi', 'q-contact-phone', 'q-contact-emerg-phone'],
      [['số điện thoại'], ['người liên hệ khẩn cấp'], ['sinh sống cùng ai'], ['địa chỉ'], ['nơi ở']]
    );

    const proposedPhone = hasContactQuestions ? this.extractValue(
      answers, survey, targetTemplate,
      ['contact.phone', 'contact.personalPhone', 'phone', 'studentPhone', 'sdt', 'so_dien_thoai', 'q-contact-phone'],
      [['số điện thoại', 'cá nhân'], ['số điện thoại', 'học sinh'], ['số điện thoại', 'zalo'], ['sđt', 'học sinh'], ['điện thoại cá nhân']]
    ) : undefined;
    const proposedEmergPhone = hasContactQuestions ? this.extractValue(
      answers, survey, targetTemplate,
      ['contact.emergencyContactPhone', 'emergencyContactPhone', 'parentPhone', 'sdt_phu_huynh', 'so_dien_thoai_phu_huynh', 'q-contact-emerg-phone'],
      [['số điện thoại', 'khẩn cấp'], ['số điện thoại', 'phụ huynh'], ['số điện thoại', 'bố'], ['số điện thoại', 'mẹ'], ['số điện thoại', 'người giám hộ'], ['sđt', 'phụ huynh']]
    ) : undefined;
    const proposedEmergName = hasContactQuestions ? this.extractValue(
      answers, survey, targetTemplate,
      ['contact.emergencyContactName', 'emergencyContactName', 'parentName', 'ho_ten_phu_huynh', 'nguoi_giam_ho', 'q-contact-emerg-name'],
      [['người liên hệ khẩn cấp'], ['họ và tên phụ huynh'], ['họ tên bố'], ['họ tên mẹ'], ['người giám hộ']]
    ) : undefined;
    const proposedEmergRel = hasContactQuestions ? this.extractValue(
      answers, survey, targetTemplate,
      ['contact.emergencyContactRelationship', 'emergencyContactRelationship', 'moi_quan_he', 'q-contact-emerg-rel'],
      [['mối quan hệ với học sinh'], ['quan hệ với học sinh']]
    ) : undefined;
    const proposedLivingWith = hasContactQuestions ? this.extractValue(
      answers, survey, targetTemplate,
      ['contact.livingWith', 'livingWith', 'dang_song_cung_ai', 'nguoi_truc_tiep_cham_soc', 'q-contact-living'],
      [['sinh sống cùng ai'], ['sống cùng ai'], ['người trực tiếp chăm sóc']]
    ) : undefined;
    const proposedAddress = hasContactQuestions ? this.extractValue(
      answers, survey, targetTemplate,
      ['contact.address', 'contact.currentAddress', 'address', 'currentAddress', 'dia_chi', 'noi_o_hien_tai', 'q-contact-address'],
      [['địa chỉ'], ['nơi ở hiện tại'], ['thường trú'], ['chỗ ở hiện nay']]
    ) : undefined;

    if (proposedPhone || proposedEmergPhone || proposedEmergName || proposedLivingWith || proposedAddress) {
      const currentPhone = student.phone || '';
      const currentParentPhone = student.parentPhone || student.motherPhone || student.fatherPhone || '';
      const currentAddress = student.address || '';
      const strProposedPhone = proposedPhone ? String(proposedPhone).trim() : '';
      const strProposedEmergPhone = proposedEmergPhone ? String(proposedEmergPhone).trim() : '';
      const strEmergName = proposedEmergName ? String(proposedEmergName).trim() : '';
      const strEmergRel = proposedEmergRel ? String(proposedEmergRel).trim() : 'Người thân';
      const strProposedAddress = proposedAddress ? String(proposedAddress).trim() : '';

      const isPhoneChanged = !!(strProposedPhone && strProposedPhone !== currentPhone);
      const isEmergChanged = !!(strProposedEmergPhone && strProposedEmergPhone !== currentParentPhone);
      const isNameProvided = !!(strEmergName && strEmergName !== student.parentName);
      const isLivingProvided = !!(proposedLivingWith && (!Array.isArray(proposedLivingWith) || proposedLivingWith.length > 0));
      const isAddressChanged = !!(strProposedAddress && strProposedAddress !== currentAddress);

      if (isPhoneChanged || isEmergChanged || isNameProvided || isLivingProvided || isAddressChanged) {
        const proposedEmergStr = `${strEmergName} (${strEmergRel}): ${strProposedEmergPhone}`.trim();
        const diffSummaryParts: string[] = [];
        if (isPhoneChanged) diffSummaryParts.push(`SĐT HS mới: ${strProposedPhone} (Số đã lưu: ${currentPhone || 'Chưa có'})`);
        if (isEmergChanged) diffSummaryParts.push(`SĐT Phụ huynh/Khẩn cấp mới: ${strProposedEmergPhone} (Số đã lưu: ${currentParentPhone || 'Chưa có'})`);
        if (isAddressChanged) diffSummaryParts.push(`Địa chỉ mới: ${strProposedAddress} (Đã lưu: ${currentAddress || 'Chưa có'})`);
        if (isLivingProvided) diffSummaryParts.push(`Nơi cư trú: ${Array.isArray(proposedLivingWith) ? proposedLivingWith.join(', ') : proposedLivingWith}`);

        this.upsertProposal({
          surveyId: survey.id,
          templateId,
          studentId: student.id,
          studentName: student.fullName,
          studentCode: student.code,
          category: 'CONTACT_UPDATE',
          title: `Cập nhật thông tin liên hệ / Người liên hệ khẩn cấp (${templateTitle})`,
          currentValue: {
            phone: currentPhone || 'Chưa có',
            emergency: currentParentPhone ? `${student.parentName || 'Phụ huynh'}: ${currentParentPhone}` : 'Chưa có',
            address: currentAddress || 'Chưa có'
          },
          proposedValue: {
            phone: strProposedPhone || currentPhone,
            emergencyContactName: strEmergName || student.parentName,
            emergencyContactRelationship: strEmergRel,
            emergencyContactPhone: strProposedEmergPhone || currentParentPhone,
            livingWith: proposedLivingWith,
            address: strProposedAddress || currentAddress
          },
          details: `Đối chiếu hồ sơ: ${diffSummaryParts.join('; ') || `Học sinh khai báo: SĐT ${strProposedPhone || '(không đổi)'}, Khẩn cấp: ${proposedEmergStr}`}`,
          visibility: 'TEACHER_ONLY',
          actionType: 'UPDATE_CONTACT'
        });

        syncedTargets.push({
          fieldGroup: 'contact',
          mode: 'REVIEW_REQUIRED',
          status: 'PENDING_REVIEW',
          message: 'Đã tạo đề xuất cập nhật thông tin liên hệ chờ GVCN đối chiếu & duyệt',
          syncedAt: nowStr
        });
      }
    }

    // 5. Graduation Electives (Sync to Graduation Module with separation & idempotency)
    const hasGradQuestions = !isConductTemplate && !isParentTemplate && hasQuestionInTemplate(
      ['graduationPlan.electiveSubject1', 'graduationPlan.electiveSubject2', 'graduationPlan.electiveSubjects', 'q-grad-sub1', 'q-grad-sub2', 'q-grad-subs'],
      [['môn thi tự chọn'], ['môn thi tốt nghiệp'], ['môn tự chọn']]
    );

    let rawSubject1 = hasGradQuestions ? this.extractValue(
      answers, survey, targetTemplate,
      ['graduationPlan.electiveSubject1', 'q-grad-sub1', 'electiveSubject1', 'mon_thi_tu_chon_1', 'mon_tu_chon_1'],
      [['môn thi tự chọn 1'], ['môn tự chọn 1']]
    ) : undefined;
    let rawSubject2 = hasGradQuestions ? this.extractValue(
      answers, survey, targetTemplate,
      ['graduationPlan.electiveSubject2', 'q-grad-sub2', 'electiveSubject2', 'mon_thi_tu_chon_2', 'mon_tu_chon_2'],
      [['môn thi tự chọn 2'], ['môn tự chọn 2']]
    ) : undefined;

    // Support multi-choice questions where subjects are in an array
    const rawSubjectList = hasGradQuestions ? this.extractValue(
      answers, survey, targetTemplate,
      ['graduationPlan.electiveSubjects', 'electiveSubjects', 'mon_thi_tu_chon', 'mon_tu_chon', 'q-grad-subs'],
      [['môn thi tự chọn'], ['môn tự chọn thi tốt nghiệp']]
    ) : undefined;

    if (Array.isArray(rawSubjectList) && rawSubjectList.length > 0) {
      if (!rawSubject1) rawSubject1 = rawSubjectList[0];
      if (!rawSubject2 && rawSubjectList.length > 1) rawSubject2 = rawSubjectList[1];
    } else if (Array.isArray(rawSubject1) && rawSubject1.length > 0) {
      if (!rawSubject2 && rawSubject1.length > 1) rawSubject2 = rawSubject1[1];
      rawSubject1 = rawSubject1[0];
    }

    const gradConfidence = hasGradQuestions ? this.extractValue(
      answers, survey, targetTemplate,
      ['graduationPlan.confidence', 'confidence'],
      [['tự tin', 'môn thi'], ['mức độ tự tin']]
    ) : undefined;
    const gradFactors = hasGradQuestions ? this.extractValue(
      answers, survey, targetTemplate,
      ['graduationPlan.choiceFactors', 'choiceFactors'],
      [['yếu tố lựa chọn']]
    ) : undefined;
    const gradAdvice = hasGradQuestions ? this.extractValue(
      answers, survey, targetTemplate,
      ['graduationPlan.needTeacherAdvice', 'needTeacherAdvice'],
      [['cần tư vấn', 'môn thi'], ['tư vấn của thầy cô']]
    ) : undefined;

    if (hasGradQuestions && (rawSubject1 || rawSubject2)) {
      const sub1 = String(rawSubject1 || '').trim();
      const sub2 = String(rawSubject2 || '').trim();
      const isValidPair = sub1 && sub2 && sub1 !== 'Chưa xác định' && sub2 !== 'Chưa xác định' && sub1 !== sub2;

      if (isValidPair) {
        const didSync = graduationService.syncSurveyGraduationPlan(
          student.id,
          survey.id,
          sub1,
          sub2,
          { force: options?.force }
        );

        this.upsertProposal({
          surveyId: survey.id,
          templateId,
          studentId: student.id,
          studentName: student.fullName,
          studentCode: student.code,
          category: 'GRADUATION_ELECTIVES',
          title: `Đăng ký dự kiến môn thi tốt nghiệp THPT (${templateTitle})`,
          currentValue: `${sub1} + ${sub2}`,
          proposedValue: {
            electiveSubject1: sub1,
            electiveSubject2: sub2,
            confidence: gradConfidence,
            choiceFactors: gradFactors,
            needTeacherAdvice: gradAdvice
          },
          details: `Môn tự chọn 1: ${sub1}, Môn 2: ${sub2}. Tự tin: ${gradConfidence || 'Vừa phải'}. Cần tư vấn: ${gradAdvice || 'Không'}`,
          visibility: 'TEACHER_ONLY',
          actionType: 'ADVICE_SESSION'
        });

        syncedTargets.push({
          fieldGroup: 'graduationPlan',
          mode: 'AUTO_SYNC',
          status: 'SYNCED',
          targetModule: 'GraduationService',
          targetId: `grad-reg-${student.id}`,
          message: didSync 
            ? `Đã cập nhật môn thi dự kiến: ${sub1}, ${sub2}`
            : `Đã duy trì lựa chọn hiện tại của học viên trong module tốt nghiệp`,
          syncedAt: nowStr
        });
      } else {
        this.upsertProposal({
          surveyId: survey.id,
          templateId,
          studentId: student.id,
          studentName: student.fullName,
          studentCode: student.code,
          category: 'GRADUATION_ELECTIVES',
          title: `Đăng ký dự kiến môn thi tốt nghiệp THPT (${templateTitle})`,
          currentValue: 'Chưa chốt chính thức',
          proposedValue: {
            electiveSubject1: sub1 || 'Chưa chọn',
            electiveSubject2: sub2 || 'Chưa chọn',
            confidence: gradConfidence,
            choiceFactors: gradFactors,
            needTeacherAdvice: gradAdvice
          },
          details: `Môn tự chọn 1: ${sub1 || 'Chưa chọn'}, Môn 2: ${sub2 || 'Chưa chọn'}. Tự tin: ${gradConfidence || 'Vừa phải'}. Cần tư vấn: ${gradAdvice || 'Không'}`,
          visibility: 'TEACHER_ONLY',
          actionType: 'ADVICE_SESSION'
        });

        syncedTargets.push({
          fieldGroup: 'graduationPlan',
          mode: 'REVIEW_REQUIRED',
          status: 'PENDING_REVIEW',
          message: 'Đã ghi nhận nguyện vọng môn thi dự kiến chờ GVCN tham vấn',
          syncedAt: nowStr
        });
      }
    }

    // 6. Leadership Proposal (Candidacy for class officer - DOES NOT auto-grant permissions!)
    const desiredPosition = this.extractValue(
      answers, survey, targetTemplate,
      ['leadershipProposal.desiredPosition', 'leadershipProposal', 'desiredPosition', 'ban_can_su', 'ung_cu_ban_can_su', 'de_cu_ban_can_su', 'to_truong', 'q-lead-pos'],
      [['ban cán sự'], ['ứng cử', 'lớp trưởng'], ['ứng cử', 'lớp phó'], ['tổ trưởng'], ['nguyện vọng tham gia ban cán sự']]
    );

    if (desiredPosition && String(desiredPosition).trim() !== '' && String(desiredPosition).trim() !== 'Chỉ muốn là thành viên tích cực') {
      const posStr = String(desiredPosition).trim();
      this.upsertProposal({
        surveyId: survey.id,
        templateId,
        studentId: student.id,
        studentName: student.fullName,
        studentCode: student.code,
        category: 'CLASS_OFFICER_CANDIDACY',
        title: `Tự ứng cử / Đề cử Ban cán sự lớp (${templateTitle}): ${posStr}`,
        currentValue: student.officerRole || 'Học viên (Không giữ chức vụ)',
        proposedValue: {
          desiredPosition: posStr
        },
        details: `Học sinh tình nguyện ứng cử vào vị trí: "${posStr}". GVCN xem xét trong đợt kiện toàn ban cán sự lớp (không tự động cấp quyền).`,
        visibility: 'TEACHER_ONLY',
        actionType: 'OFFICER_NOTE'
      });

      syncedTargets.push({
        fieldGroup: 'leadershipProposal',
        mode: 'REVIEW_REQUIRED',
        status: 'PENDING_REVIEW',
        message: `Đã tạo đề xuất ứng cử vị trí "${posStr}" chờ GVCN xem xét`,
        syncedAt: nowStr
      });
    }

    // 7. Seating Preference Proposal (DOES NOT auto-change official seating chart)
    const seatingPref = this.extractValue(
      answers, survey, targetTemplate,
      ['seatingPreference.preference', 'seatingPreference', 'preference', 'cho_ngoi', 'nguyen_vong_cho_ngoi', 'vi_tri_ngoi', 'q-seating'],
      [['nguyện vọng', 'chỗ ngồi'], ['nhu cầu', 'chỗ ngồi'], ['vị trí ngồi'], ['ngồi bàn']]
    );

    if (seatingPref && String(seatingPref).trim() !== '' && String(seatingPref).trim() !== 'Thầy cô xếp sao cũng đồng ý') {
      const seatStr = String(seatingPref).trim();
      this.upsertProposal({
        surveyId: survey.id,
        templateId,
        studentId: student.id,
        studentName: student.fullName,
        studentCode: student.code,
        category: 'SEATING_PREFERENCE',
        title: `Nguyện vọng vị trí ngồi học (${templateTitle}): ${seatStr}`,
        currentValue: 'Theo sơ đồ lớp hiện tại',
        proposedValue: {
          preference: seatStr
        },
        details: `Học sinh mong muốn sắp xếp chỗ ngồi: "${seatStr}". GVCN duyệt để lưu nguyện vọng vào sổ tay chủ nhiệm (không tự thay đổi sơ đồ lớp chính thức).`,
        visibility: 'TEACHER_ONLY',
        actionType: 'SEATING'
      });

      syncedTargets.push({
        fieldGroup: 'seatingPreference',
        mode: 'REVIEW_REQUIRED',
        status: 'PENDING_REVIEW',
        message: 'Đã tạo ghi chú nguyện vọng chỗ ngồi cho GVCN',
        syncedAt: nowStr
      });
    }

    // -----------------------------------------------------------------------
    // GROUP C: TEACHER_ONLY (Sensitive Intakes & Urgent Support Requests)
    // -----------------------------------------------------------------------

    // 8. Health Status & Support Notes (NEVER auto-set needsSpecialAttention)
    const healthStatus = this.extractValue(
      answers, survey, targetTemplate,
      ['healthAndWellbeing.healthStatus', 'healthStatus', 'suc_khoe', 'tinh_trang_suc_khoe', 'benh_ly', 'q-health-status'],
      [['tình trạng sức khỏe'], ['vấn đề sức khỏe'], ['bệnh lý', 'lưu ý']]
    );
    const healthSupportNote = this.extractValue(
      answers, survey, targetTemplate,
      ['healthAndWellbeing.healthSupportNote', 'healthSupportNote', 'ho_tro_suc_khoe'],
      [['hỗ trợ thể chất'], ['lưu ý sức khỏe']]
    );

    if (healthStatus || healthSupportNote) {
      const statusArr: string[] = Array.isArray(healthStatus) ? healthStatus : (healthStatus ? [String(healthStatus)] : []);
      const hasHealthCondition = statusArr.some(h => h && h !== 'Bình thường' && h !== 'Khỏe mạnh' && h !== 'Sức khỏe tốt' && h !== 'Tốt');
      const hasSupportNote = !!(healthSupportNote && String(healthSupportNote).trim() !== '');

      if (hasHealthCondition || hasSupportNote) {
        this.upsertProposal({
          surveyId: survey.id,
          templateId,
          studentId: student.id,
          studentName: student.fullName,
          studentCode: student.code,
          category: 'HEALTH_SENSITIVE',
          title: `Ghi nhận tình trạng sức khỏe / Yêu cầu hỗ trợ thể chất (${templateTitle})`,
          currentValue: student.needsSpecialAttention ? 'Đang trong danh sách theo dõi' : 'Bình thường',
          proposedValue: {
            healthStatus: statusArr,
            healthSupportNote: healthSupportNote ? String(healthSupportNote).trim() : ''
          },
          details: `Tình trạng sức khỏe khai báo: ${statusArr.join(', ') || 'Cần lưu ý'}. Ghi chú: ${healthSupportNote || 'Không có'}`,
          visibility: 'TEACHER_ONLY',
          actionType: 'SPECIAL_ATTENTION'
        });

        syncedTargets.push({
          fieldGroup: 'healthAndWellbeing',
          mode: 'TEACHER_ONLY',
          status: 'PENDING_REVIEW',
          message: 'Đã tạo phiếu tiếp nhận sức khỏe bảo mật cho GVCN',
          syncedAt: nowStr
        });
      } else if (statusArr.length > 0) {
        syncedTargets.push({
          fieldGroup: 'healthAndWellbeing',
          mode: 'AUTO_SYNC',
          status: 'SYNCED',
          message: 'Tình trạng sức khỏe: Bình thường (không có vấn đề cần lưu ý)',
          syncedAt: nowStr
        });
      }
    }

    // 9. Psychological / Emotional Status
    const emotionalStatus = this.extractValue(
      answers, survey, targetTemplate,
      ['healthAndWellbeing.emotionalStatus', 'emotionalStatus', 'tam_ly', 'cam_xuc', 'lo_lang', 'q-emotional-status'],
      [['trạng thái tâm lý'], ['cảm xúc'], ['áp lực', 'lo lắng']]
    );

    if (emotionalStatus && String(emotionalStatus).trim() !== '') {
      const strEmo = String(emotionalStatus).trim();
      const isSensitiveEmotion = strEmo !== 'Bình thường' && strEmo !== 'Ổn định, vui vẻ' && strEmo !== 'Tốt' && strEmo !== 'Ổn định' && strEmo !== 'Thoải mái, tự tin, sẵn sàng';

      if (isSensitiveEmotion) {
        this.upsertProposal({
          surveyId: survey.id,
          templateId,
          studentId: student.id,
          studentName: student.fullName,
          studentCode: student.code,
          category: 'PSYCHOLOGICAL_SENSITIVE',
          title: `Ghi nhận trạng thái tâm lý / Cảm xúc (${templateTitle})`,
          currentValue: 'Chưa có ghi nhận',
          proposedValue: {
            emotionalStatus: strEmo
          },
          details: `Trạng thái cảm xúc học sinh khai báo: ${strEmo}. GVCN chủ động quan sát và động viên kịp thời.`,
          visibility: 'TEACHER_ONLY',
          actionType: 'SPECIAL_ATTENTION'
        });

        syncedTargets.push({
          fieldGroup: 'emotionalStatus',
          mode: 'TEACHER_ONLY',
          status: 'PENDING_REVIEW',
          message: 'Đã tạo phiếu tiếp nhận tâm lý bảo mật cho GVCN',
          syncedAt: nowStr
        });
      } else {
        syncedTargets.push({
          fieldGroup: 'emotionalStatus',
          mode: 'AUTO_SYNC',
          status: 'SYNCED',
          message: `Trạng thái cảm xúc: ${strEmo} (bình thường)`,
          syncedAt: nowStr
        });
      }
    }

    // 10. Family Difficulties & Learning Conditions
    const familySituation = this.extractValue(
      answers, survey, targetTemplate,
      ['familyAndLearningConditions.familySituation', 'familySituation', 'hoan_canh_gia_dinh', 'dien_chinh_sach', 'hoan_canh_kho_khan', 'q-family-conditions'],
      [['hoàn cảnh gia đình'], ['diện chính sách'], ['hoàn cảnh khó khăn'], ['điều kiện gia đình']]
    );
    const familyNote = this.extractValue(
      answers, survey, targetTemplate,
      ['familyAndLearningConditions.familyNote', 'familyNote', 'ghi_chu_hoan_canh', 'kho_khan_gia_dinh'],
      [['ghi chú hoàn cảnh'], ['khó khăn cần hỗ trợ']]
    );
    const learningConditions = this.extractValue(
      answers, survey, targetTemplate,
      ['familyAndLearningConditions.learningConditions', 'learningConditions', 'dieu_kien_hoc_tap'],
      [['điều kiện học tập']]
    );
    const familyWorkSupportLevel = this.extractValue(
      answers, survey, targetTemplate,
      ['familyAndLearningConditions.familyWorkSupportLevel', 'familyWorkSupportLevel'],
      [['mức độ hỗ trợ', 'việc học']]
    );

    if (familySituation || familyNote || learningConditions) {
      const strSit = familySituation ? String(familySituation).trim() : '';
      const strNote = familyNote ? String(familyNote).trim() : '';
      const hasDiff = (strSit && strSit !== 'Bình thường' && strSit !== 'Đầy đủ điều kiện' && strSit !== 'Ổn định' && strSit !== 'Bình thường, bố mẹ đầy đủ') || (strNote !== '');

      if (hasDiff) {
        this.upsertProposal({
          surveyId: survey.id,
          templateId,
          studentId: student.id,
          studentName: student.fullName,
          studentCode: student.code,
          category: 'FAMILY_DIFFICULTY',
          title: `Hoàn cảnh gia đình & Điều kiện cần lưu ý (${templateTitle})`,
          currentValue: student.privateTeacherNotes ? 'Đã có ghi chú nội bộ trước đó' : 'Chưa có ghi chú đặc biệt',
          proposedValue: {
            familySituation: strSit,
            familyNote: strNote,
            learningConditions,
            familyWorkSupportLevel
          },
          details: `Hoàn cảnh khai báo: ${strSit || 'Chưa ghi'}. Ghi chú: ${strNote || 'Không có'}. Điều kiện: ${Array.isArray(learningConditions) ? learningConditions.join(', ') : (learningConditions || 'Bình thường')}`,
          visibility: 'TEACHER_ONLY',
          actionType: 'SPECIAL_ATTENTION'
        });

        syncedTargets.push({
          fieldGroup: 'familyAndLearningConditions',
          mode: 'TEACHER_ONLY',
          status: 'PENDING_REVIEW',
          message: 'Đã tạo phiếu tiếp nhận hoàn cảnh gia đình cho GVCN',
          syncedAt: nowStr
        });
      } else if (strSit || learningConditions) {
        syncedTargets.push({
          fieldGroup: 'familyAndLearningConditions',
          mode: 'AUTO_SYNC',
          status: 'SYNCED',
          message: 'Hoàn cảnh & điều kiện học tập: Bình thường',
          syncedAt: nowStr
        });
      }
    }
  }

    // 11. Private Teacher Message / Urgent Support Request
    const privateMessage = this.extractValue(
      answers, survey, targetTemplate,
      ['privateTeacherMessage.content', 'privateMessage', 'loi_nhan_rieng', 'trao_doi_rieng', 'q-private-msg'],
      [['lời nhắn', 'chủ nhiệm'], ['lời nhắn', 'thầy cô'], ['nhắn nhủ', 'thầy cô']]
    );
    const teacherMeetingRequest = this.extractValue(
      answers, survey, targetTemplate,
      ['healthAndWellbeing.teacherMeetingRequest', 'teacherMeetingRequest', 'hen_gap_gvcn'],
      [['hẹn gặp', 'thầy cô'], ['trao đổi riêng', 'gvcn']]
    );

    const strMsg = privateMessage ? String(privateMessage).trim() : '';
    const strMeeting = teacherMeetingRequest ? String(teacherMeetingRequest).trim() : '';
    const hasMeetingReq = strMeeting && strMeeting.includes('Có') && (strMeeting.includes('sớm') || strMeeting.includes('trao đổi'));
    const hasPrivateMsg = strMsg !== '';

    if (hasMeetingReq || hasPrivateMsg) {
      this.upsertProposal({
        surveyId: survey.id,
        templateId,
        studentId: student.id,
        studentName: student.fullName,
        studentCode: student.code,
        category: 'PRIVATE_SUPPORT_REQUEST',
        title: `Yêu cầu hẹn trao đổi riêng & Lời nhắn bảo mật (${templateTitle})`,
        currentValue: 'Không có cuộc hẹn đang chờ',
        proposedValue: {
          teacherMeetingRequest: strMeeting,
          privateMessage: strMsg
        },
        details: `Yêu cầu trao đổi: ${strMeeting || 'Không yêu cầu'}. Lời nhắn riêng gửi cô/thầy: "${strMsg || '(Học sinh không để lại tin nhắn chi tiết)'}"`,
        visibility: 'TEACHER_ONLY',
        actionType: 'ADVICE_SESSION'
      });

      syncedTargets.push({
        fieldGroup: 'privateTeacherMessage',
        mode: 'TEACHER_ONLY',
        status: 'PENDING_REVIEW',
        message: 'Đã chuyển yêu cầu trao đổi riêng vào mục Cần xử lý sớm của GVCN',
        syncedAt: nowStr
      });
    }

    // 12. Conduct Self-Evaluation (HK1, HK2, giữa kỳ, cuối kỳ)
    // Strictly isolate: NEVER extract conduct self-evaluation from Start-Year survey or Parent survey!
    const shouldExtractConduct = !isStartYearTemplate && !isParentTemplate && (isConductTemplate || hasQuestionInTemplate(
      ['conductSelfEvaluation.grade', 'conductSelfEvaluation', 'q-conduct-self-grade', 'tu_danh_gia_ren_luyen'],
      [['tự đánh giá', 'rèn luyện'], ['xếp loại', 'rèn luyện'], ['tự xếp loại', 'hạnh kiểm']]
    ));

    const selfGrade = shouldExtractConduct ? this.extractValue(
      answers, survey, targetTemplate,
      ['conductSelfEvaluation.grade', 'conductSelfEvaluation', 'q-conduct-self-grade', 'tu_danh_gia_ren_luyen', 'xep_loai_ren_luyen', 'hanh_kiem', 'selfAssessment'],
      [['tự đánh giá', 'rèn luyện'], ['xếp loại', 'rèn luyện'], ['tự xếp loại', 'hạnh kiểm'], ['mức xếp loại rèn luyện']]
    ) : undefined;
    const conductNote = shouldExtractConduct ? this.extractValue(
      answers, survey, targetTemplate,
      ['conductSelfEvaluation.note', 'q-conduct-note', 'minh_chung_ren_luyen', 'ly_do_tu_nhan'],
      [['minh chứng', 'rèn luyện'], ['lý do', 'xếp loại']]
    ) : undefined;

    const normalizedGrade = normalizeConductGrade(selfGrade);

    if (normalizedGrade) {
      const detectedPeriod = determineConductSemester(targetTemplate, survey);
      if (detectedPeriod === 'SEMESTER_1' || detectedPeriod === 'SEMESTER_2') {
        const periodType = detectedPeriod;
        const isSem2 = periodType === 'SEMESTER_2';
        const rawNote = conductNote || (typeof selfGrade === 'object' && selfGrade !== null ? (selfGrade.note || selfGrade.conductNote) : '');
        const strConductNote = extractCleanAnswerText(rawNote);

        // Auto-sync directly to ConductEvaluationService -> "Tự xếp loại" (without altering official finalGrade)
        conductEvaluationService.syncSurveyConductSelfAssessment(
          student.id,
          survey.id,
          normalizedGrade,
          strConductNote,
          { periodType }
        );

        this.upsertProposal({
          surveyId: survey.id,
          templateId,
          studentId: student.id,
          studentName: student.fullName,
          studentCode: student.code,
          category: 'CONDUCT_SELF_EVALUATION',
          title: `Tự đánh giá kết quả rèn luyện (${isSem2 ? 'HK2' : 'HK1'})`,
          currentValue: 'Đã tự động cập nhật vào sổ rèn luyện',
          proposedValue: {
            selfAssessment: normalizedGrade,
            conductNote: strConductNote
          },
          details: `Học sinh tự đánh giá xếp loại rèn luyện: "${normalizedGrade}". Ghi chú: "${strConductNote || 'Không có'}"`,
          visibility: 'TEACHER_ONLY',
          actionType: 'CONDUCT_SYNC'
        });

        syncedTargets.push({
          fieldGroup: 'conductSelfEvaluation',
          mode: 'AUTO_SYNC',
          status: 'SYNCED',
          message: `Đã tự động đồng bộ kết quả tự xếp loại rèn luyện (${normalizedGrade}) vào mục Tự xếp loại của học viên trong tab Rèn luyện và kỷ luật`,
          syncedAt: nowStr
        });
      }
      // If semester info is missing or ambiguous, do NOT guess and do NOT overwrite data!
    }

    // 13. Parent Survey Feedback & Preferred Communication (Nhóm 1 / Nhóm 2)
    const parentFeedback = this.extractValue(
      answers, survey, targetTemplate,
      ['partnership.feedback', 'y_kien_phu_huynh', 'dong_gop_y_kien'],
      [['ý kiến đóng góp'], ['nguyện vọng gia đình']]
    );
    const parentContactPref = this.extractValue(
      answers, survey, targetTemplate,
      ['parentInfo.contactPreference', 'kenh_lien_lac_mong_muon'],
      [['kênh liên lạc']]
    );

    if (isParentTemplate && (parentFeedback || parentContactPref)) {
      const strFeedback = parentFeedback ? String(parentFeedback).trim() : '';
      const strPref = parentContactPref ? String(parentContactPref).trim() : '';

      if (strFeedback || strPref) {
        this.upsertProposal({
          surveyId: survey.id,
          templateId,
          studentId: student.id,
          studentName: student.fullName,
          studentCode: student.code,
          category: 'PRIVATE_SUPPORT_REQUEST',
          title: `Ý kiến & Kênh liên lạc Phụ huynh (${templateTitle})`,
          currentValue: 'Chưa có ghi nhận ý kiến phụ huynh đợt này',
          proposedValue: {
            privateMessage: strFeedback,
            contactPreference: strPref
          },
          details: `Phụ huynh gửi phản hồi: "${strFeedback || '(Không có lời nhắn)'}". Kênh liên lạc mong muốn: ${strPref || 'Chưa chọn'}. GVCN xem xét đồng bộ vào sổ tay chủ nhiệm.`,
          visibility: 'TEACHER_ONLY',
          actionType: 'ADVICE_SESSION'
        });

        syncedTargets.push({
          fieldGroup: 'parentPartnership',
          mode: 'TEACHER_ONLY',
          status: 'PENDING_REVIEW',
          message: 'Đã tạo đề xuất tiếp nhận phản hồi phụ huynh chờ GVCN duyệt',
          syncedAt: nowStr
        });
      }
    }

    // -----------------------------------------------------------------------
    // GROUP D: KEEP_IN_SURVEY (Analytical, Satisfaction & Unmapped Questions)
    // -----------------------------------------------------------------------
    syncedTargets.push({
      fieldGroup: 'generalSurveyFeedback',
      mode: 'KEEP_IN_SURVEY',
      status: 'SKIPPED',
      message: 'Các câu hỏi tham khảo (kỳ vọng lớp, thói quen AI, sự hài lòng...) được lưu trữ nguyên vẹn trong kết quả khảo sát để phục vụ thống kê tổng hợp'
    });

    // -----------------------------------------------------------------------
    // FINALIZE SYNC STATE
    // -----------------------------------------------------------------------
    const hasFailures = errors.length > 0;
    const hasPendingProposals = syncedTargets.some(t => t.status === 'PENDING_REVIEW');

    let overallStatus: SurveySyncState['status'] = 'SYNCED';
    if (hasFailures && syncedTargets.some(t => t.status === 'SYNCED')) {
      overallStatus = 'PARTIAL';
    } else if (hasFailures) {
      overallStatus = 'FAILED';
    } else if (hasPendingProposals) {
      overallStatus = 'REVIEW_REQUIRED';
    }

    const previousState = this.syncStates[surveyId];
    const syncVersion = (previousState?.syncVersion || 0) + 1;

    const finalState: SurveySyncState = {
      id: surveyId,
      tenantId: tId,
      surveyId,
      studentId: student.id,
      status: overallStatus,
      lastSyncAt: nowStr,
      syncVersion,
      errors,
      syncedTargets
    };

    this.syncStates[surveyId] = finalState;
    this.saveToStorage();
    return finalState;
  }

  // =========================================================================
  // PROPOSAL MANAGEMENT & TEACHER APPROVAL
  // =========================================================================

  private upsertProposal(data: Omit<SurveySyncProposal, 'id' | 'tenantId' | 'status' | 'createdAt' | 'updatedAt'>): void {
    const tId = tenantService.normalizeTenantId(this.activeTenantId);
    let resolvedTemplateId = data.templateId;
    if (!resolvedTemplateId || resolvedTemplateId.startsWith('survey-')) {
      const parent = studentSurveyService.getSurveyById(data.surveyId);
      resolvedTemplateId = parent?.surveyTemplateId || (parent as any)?.templateId ||
        (parent?.surveyType === 'GRADE12_START_YEAR' ? 'template-grade12-default-v1' : 'template-custom');
    }

    const existingIndex = this.proposals.findIndex(
      p => p.surveyId === data.surveyId && p.category === data.category && (!p.tenantId || tenantService.normalizeTenantId(p.tenantId) === tId)
    );

    const now = new Date().toISOString();

    if (existingIndex >= 0) {
      // Maintain previous review status and any teacher edits
      const current = this.proposals[existingIndex];
      this.proposals[existingIndex] = {
        ...current,
        ...data,
        status: current.status, // Always preserve previous review status (APPROVED, REVIEWED_NO_ACTION, REJECTED)
        reviewedAt: current.reviewedAt,
        reviewedBy: current.reviewedBy,
        reviewNote: current.reviewNote,
        isEditedByTeacher: current.isEditedByTeacher,
        proposedValue: current.isEditedByTeacher ? current.proposedValue : data.proposedValue,
        originalValue: current.originalValue !== undefined ? current.originalValue : data.proposedValue,
        templateId: resolvedTemplateId || current.templateId,
        updatedAt: now
      };
    } else {
      const newProposal: SurveySyncProposal = {
        ...data,
        templateId: resolvedTemplateId,
        id: `prop-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        tenantId: tId,
        status: 'PENDING',
        originalValue: data.proposedValue,
        isEditedByTeacher: false,
        createdAt: now,
        updatedAt: now
      };
      this.proposals.unshift(newProposal);
    }
  }

  /**
   * Edit proposal value and approve/sync to profile in one atomic operation.
   * Keeps originalValue untouched and marks isEditedByTeacher = true.
   */
  public updateAndApproveProposal(
    proposalId: string,
    editedValue: any,
    reviewNote?: string,
    options?: {
      addToSpecialAttention?: boolean;
      specialAttentionCategories?: string[];
      specialAttentionNote?: string;
    }
  ): boolean {
    const currentUser = authService.getCurrentUser();
    const role = currentUser?.role;

    if (role !== 'TEACHER' && role !== 'SUPER_ADMIN') {
      throw new Error('Chỉ Giáo viên chủ nhiệm mới có quyền chỉnh sửa và duyệt đề xuất.');
    }

    const tId = tenantService.normalizeTenantId(this.activeTenantId);
    const proposal = this.proposals.find(
      p => p.id === proposalId && (!p.tenantId || tenantService.normalizeTenantId(p.tenantId) === tId)
    );
    if (!proposal) {
      throw new Error('Không tìm thấy đề xuất cần chỉnh sửa.');
    }

    // Preserve original student response before modification
    if (proposal.originalValue === undefined) {
      proposal.originalValue = proposal.proposedValue;
    }

    proposal.proposedValue = editedValue;
    proposal.isEditedByTeacher = true;
    proposal.updatedAt = new Date().toISOString();

    return this.approveProposal(
      proposalId,
      reviewNote || 'GVCN đã chỉnh sửa giá trị và đồng bộ vào hồ sơ',
      options
    );
  }

  /**
   * Approve a proposal (TEACHER / SUPER_ADMIN role-gated).
   * Calls target service and records immutable audit log.
   */
  public approveProposal(
    proposalId: string,
    reviewNote?: string,
    options?: {
      addToSpecialAttention?: boolean;
      specialAttentionCategories?: string[];
      specialAttentionNote?: string;
    }
  ): boolean {
    const currentUser = authService.getCurrentUser();
    const role = currentUser?.role;

    if (role !== 'TEACHER' && role !== 'SUPER_ADMIN') {
      throw new Error('Chỉ Giáo viên chủ nhiệm hoặc Quản trị viên mới có quyền phê duyệt đề xuất đồng bộ.');
    }

    const tId = tenantService.normalizeTenantId(this.activeTenantId);
    const proposal = this.proposals.find(
      p => p.id === proposalId && (!p.tenantId || tenantService.normalizeTenantId(p.tenantId) === tId)
    );
    if (!proposal) {
      throw new Error('Không tìm thấy đề xuất cần duyệt.');
    }

    if (proposal.status !== 'PENDING') {
      throw new Error('Đề xuất này đã được xử lý trước đó.');
    }

    const student = studentService.getById(proposal.studentId);
    if (!student) {
      throw new Error('Học sinh không tồn tại.');
    }

    const nowStr = new Date().toISOString();

    // 1. Only handle Special Attention if explicitly requested by teacher in options
    if (options?.addToSpecialAttention === true) {
      const cats = (options.specialAttentionCategories && options.specialAttentionCategories.length > 0)
        ? options.specialAttentionCategories
        : (proposal.category === 'HEALTH_SENSITIVE' ? ['Sức khỏe / Thể chất'] : proposal.category === 'PSYCHOLOGICAL_SENSITIVE' ? ['Tâm lý / Cảm xúc'] : ['Gia cảnh đặc biệt / Khó khăn']);
      const note = options.specialAttentionNote || proposal.details || 'Được đưa vào diện quan tâm đặc biệt từ khảo sát đầu năm';
      studentService.updateStudentSpecialAttention(proposal.studentId, {
        needsSpecialAttention: true,
        attentionCategories: cats,
        attentionNote: note,
        supportMeasure: note,
        attentionStatus: 'supporting'
      });
    }

    // 2. Perform specific domain action based on category
    switch (proposal.category) {
      case 'CONTACT_UPDATE': {
        const pVal = proposal.proposedValue;
        if (pVal) {
          const updates: Partial<Student> = {};
          if (pVal.phone && String(pVal.phone).trim() !== '') {
            updates.phone = String(pVal.phone).trim();
          }
          if (pVal.address && String(pVal.address).trim() !== '') {
            updates.address = String(pVal.address).trim();
          }

          const rel = (pVal.emergencyContactRelationship || '').trim().toLowerCase();
          const emergPhone = pVal.emergencyContactPhone ? String(pVal.emergencyContactPhone).trim() : '';
          const emergName = pVal.emergencyContactName ? String(pVal.emergencyContactName).trim() : '';

          if (emergPhone) {
            updates.parentPhone = emergPhone;
          }

          if (rel === 'bố' || rel === 'cha' || rel === 'ba') {
            if (emergName) updates.fatherName = emergName;
            if (emergPhone) updates.fatherPhone = emergPhone;
          } else if (rel === 'mẹ' || rel === 'má') {
            if (emergName) updates.motherName = emergName;
            if (emergPhone) updates.motherPhone = emergPhone;
          } else {
            if (emergName) {
              updates.parentName = pVal.emergencyContactRelationship
                ? `${emergName} (${pVal.emergencyContactRelationship})`
                : emergName;
            }
          }

          if (pVal.livingWith) {
            const livingStr = Array.isArray(pVal.livingWith) ? pVal.livingWith.join(', ') : String(pVal.livingWith);
            if (livingStr && livingStr.trim() !== '') {
              const livingNote = `[Nơi ở / Sinh sống cùng]: ${livingStr.trim()}`;
              if (!student.privateTeacherNotes?.includes(livingNote)) {
                updates.privateTeacherNotes = student.privateTeacherNotes
                  ? `${student.privateTeacherNotes}\n${livingNote}`
                  : livingNote;
              }
            }
          }

          studentService.updateStudent(proposal.studentId, updates);
        }
        break;
      }

      case 'CONDUCT_SELF_EVALUATION': {
        const pVal = proposal.proposedValue;
        if (pVal) {
          const parentSurvey = studentSurveyService.getSurveyById(proposal.surveyId);
          const tpl = parentSurvey?.surveyTemplateId ? surveyTemplateService.getTemplateById(parentSurvey.surveyTemplateId) : undefined;
          
          // Strict semester mapping: HKI only to HKI, HKII only to HKII. If missing/ambiguous, do NOT guess and do NOT overwrite data!
          const detectedPeriod = determineConductSemester(tpl, parentSurvey);
          if (!detectedPeriod || (detectedPeriod !== 'SEMESTER_1' && detectedPeriod !== 'SEMESTER_2')) {
            console.warn(`[SurveySyncService] Cannot determine conduct evaluation period for survey ${proposal.surveyId}. Skipping sync to protect data.`);
            break;
          }
          const periodType = detectedPeriod;

          const cleanGrade = normalizeConductGrade(pVal.selfAssessment);
          const cleanNote = pVal.conductNote ? extractCleanAnswerText(pVal.conductNote) : '';

          if (!cleanGrade && !cleanNote) {
            break;
          }

          conductEvaluationService.syncSurveyConductSelfAssessment(
            proposal.studentId,
            proposal.surveyId,
            cleanGrade,
            cleanNote,
            { periodType }
          );
        }
        break;
      }

      case 'HEALTH_SENSITIVE': {
        const pVal = proposal.proposedValue;
        if (pVal) {
          const noteToAdd = pVal.healthSupportNote || (Array.isArray(pVal.healthStatus) ? pVal.healthStatus.join(', ') : '');
          if (noteToAdd) {
            const currentHealth = student.healthNotes ? `${student.healthNotes}; ${noteToAdd}` : noteToAdd;
            studentService.updateStudent(proposal.studentId, {
              healthNotes: currentHealth
            });
          }
        }
        break;
      }

      case 'FAMILY_DIFFICULTY': {
        const pVal = proposal.proposedValue;
        if (pVal) {
          const sitDesc = pVal.familySituation ? `Hoàn cảnh: ${pVal.familySituation}` : '';
          const noteDesc = pVal.familyNote ? `Ghi chú: ${pVal.familyNote}` : '';
          const combined = [sitDesc, noteDesc].filter(Boolean).join(' - ');
          if (combined) {
            const currentNote = student.privateTeacherNotes ? `${student.privateTeacherNotes}\n[Khảo sát gia đình]: ${combined}` : `[Khảo sát gia đình]: ${combined}`;
            studentService.updateStudent(proposal.studentId, {
              privateTeacherNotes: currentNote
            });
          }
        }
        break;
      }

      case 'SEATING_PREFERENCE': {
        const pVal = proposal.proposedValue;
        if (pVal && pVal.preference) {
          const seatNote = `[Nguyện vọng chỗ ngồi]: ${pVal.preference}`;
          const currentNote = student.privateTeacherNotes ? `${student.privateTeacherNotes}\n${seatNote}` : seatNote;
          studentService.updateStudent(proposal.studentId, {
            privateTeacherNotes: currentNote
          });
        }
        break;
      }

      case 'CLASS_OFFICER_CANDIDACY': {
        const pVal = proposal.proposedValue;
        if (pVal && pVal.desiredPosition) {
          const officerNote = `[Nguyện vọng ứng cử cán sự]: ${pVal.desiredPosition}`;
          const currentNote = student.privateTeacherNotes ? `${student.privateTeacherNotes}\n${officerNote}` : officerNote;
          studentService.updateStudent(proposal.studentId, {
            privateTeacherNotes: currentNote
          });
        }
        break;
      }

      case 'GRADUATION_ELECTIVES': {
        const pVal = proposal.proposedValue;
        if (pVal && pVal.electiveSubject1 && pVal.electiveSubject2) {
          graduationService.syncSurveyGraduationPlan(
            proposal.studentId,
            proposal.surveyId,
            pVal.electiveSubject1,
            pVal.electiveSubject2,
            { force: true }
          );
        }
        break;
      }

      case 'PSYCHOLOGICAL_SENSITIVE':
      case 'PRIVATE_SUPPORT_REQUEST':
      default:
        // Recorded and approved in proposal registry without forcing special attention
        break;
    }

    // Mark proposal approved
    proposal.status = 'APPROVED';
    proposal.reviewedAt = nowStr;
    proposal.reviewedBy = currentUser.name;
    proposal.reviewNote = reviewNote || (options?.addToSpecialAttention ? 'Đã duyệt và đưa vào diện quan tâm đặc biệt' : 'Đã duyệt và ghi nhận');
    proposal.updatedAt = nowStr;

    this.logAudit({
      surveyId: proposal.surveyId,
      studentId: proposal.studentId,
      studentName: proposal.studentName,
      action: 'APPROVE_PROPOSAL',
      fieldGroup: proposal.category,
      oldValue: proposal.currentValue,
      newValue: proposal.proposedValue,
      details: `GVCN ${currentUser.name} đã duyệt đề xuất "${proposal.title}". Ghi chú: ${proposal.reviewNote}`
    });

    this.saveToStorage();
    return true;
  }

  /**
   * Reject a proposal
   */
  public rejectProposal(proposalId: string, reviewNote?: string): boolean {
    const currentUser = authService.getCurrentUser();
    const role = currentUser?.role;

    if (role !== 'TEACHER' && role !== 'SUPER_ADMIN') {
      throw new Error('Chỉ Giáo viên chủ nhiệm mới có quyền từ chối đề xuất.');
    }

    const tId = tenantService.normalizeTenantId(this.activeTenantId);
    const proposal = this.proposals.find(
      p => p.id === proposalId && (!p.tenantId || tenantService.normalizeTenantId(p.tenantId) === tId)
    );
    if (!proposal) return false;

    const nowStr = new Date().toISOString();
    proposal.status = 'REJECTED';
    proposal.reviewedAt = nowStr;
    proposal.reviewedBy = currentUser.name;
    proposal.reviewNote = reviewNote || 'Đã từ chối đồng bộ';
    proposal.updatedAt = nowStr;

    this.logAudit({
      surveyId: proposal.surveyId,
      studentId: proposal.studentId,
      studentName: proposal.studentName,
      action: 'REJECT_PROPOSAL',
      fieldGroup: proposal.category,
      details: `GVCN ${currentUser.name} đã từ chối đề xuất "${proposal.title}". Lý do: ${proposal.reviewNote}`
    });

    this.saveToStorage();
    return true;
  }

  /**
   * Mark as reviewed with no action needed (e.g. noted)
   */
  public markReviewedNoAction(proposalId: string, reviewNote?: string): boolean {
    const currentUser = authService.getCurrentUser();
    const role = currentUser?.role;

    if (role !== 'TEACHER' && role !== 'SUPER_ADMIN') {
      throw new Error('Chỉ Giáo viên chủ nhiệm mới có quyền xử lý đề xuất.');
    }

    const tId = tenantService.normalizeTenantId(this.activeTenantId);
    const proposal = this.proposals.find(
      p => p.id === proposalId && (!p.tenantId || tenantService.normalizeTenantId(p.tenantId) === tId)
    );
    if (!proposal) return false;

    const nowStr = new Date().toISOString();
    proposal.status = 'REVIEWED_NO_ACTION';
    proposal.reviewedAt = nowStr;
    proposal.reviewedBy = currentUser.name;
    proposal.reviewNote = reviewNote || 'Đã ghi nhận thông tin, không cần thay đổi hồ sơ';
    proposal.updatedAt = nowStr;

    this.logAudit({
      surveyId: proposal.surveyId,
      studentId: proposal.studentId,
      studentName: proposal.studentName,
      action: 'REVIEW_PROPOSAL_NO_ACTION',
      fieldGroup: proposal.category,
      details: `GVCN ${currentUser.name} đã đánh dấu đã xem đề xuất "${proposal.title}".`
    });

    this.saveToStorage();
    return true;
  }

  // =========================================================================
  // QUERY & ACCESS CONTROL
  // =========================================================================

  /**
   * Get all proposals with strict role-based filtering.
   * Student/Parent can NEVER see teacher proposals or internal sensitive intakes.
   */
  public getProposals(filter?: {
    studentId?: string;
    templateId?: string;
    surveyId?: string;
    category?: SurveyProposalCategory | string;
    status?: SurveyProposalStatus | string;
  }): SurveySyncProposal[] {
    const currentUser = authService.getCurrentUser();
    const role = currentUser?.role || 'STUDENT';
    const tId = tenantService.normalizeTenantId(this.activeTenantId);

    // Non-teachers cannot view proposal lists
    if (role !== 'TEACHER' && role !== 'SUPER_ADMIN') {
      return [];
    }

    let list = this.proposals.filter(p => !p.tenantId || tenantService.normalizeTenantId(p.tenantId) === tId);

    if (filter?.templateId) {
      list = list.filter(p => {
        if (p.templateId) {
          return p.templateId === filter.templateId;
        }
        const parentSurvey = studentSurveyService.getSurveyById(p.surveyId);
        const pTemplateId = parentSurvey?.surveyTemplateId || (parentSurvey as any)?.templateId;
        if (pTemplateId) {
          return pTemplateId === filter.templateId;
        }
        return false;
      });
    }
    if (filter?.surveyId) {
      list = list.filter(p => p.surveyId === filter.surveyId);
    }
    if (filter?.studentId) {
      list = list.filter(p => p.studentId === filter.studentId);
    }
    if (filter?.category && filter.category !== 'ALL') {
      list = list.filter(p => p.category === filter.category);
    }
    if (filter?.status && filter.status !== 'ALL') {
      list = list.filter(p => p.status === filter.status);
    }

    return [...list];
  }

  public getSyncState(surveyId: string): SurveySyncState | undefined {
    return this.syncStates[surveyId];
  }

  public getAllSyncStates(): SurveySyncState[] {
    const tId = tenantService.normalizeTenantId(this.activeTenantId);
    return Object.values(this.syncStates).filter(s => s.tenantId === tId);
  }

  public getAudits(surveyId?: string): SurveySyncAudit[] {
    const currentUser = authService.getCurrentUser();
    const role = currentUser?.role;
    if (role !== 'TEACHER' && role !== 'SUPER_ADMIN') {
      return [];
    }

    const tId = tenantService.normalizeTenantId(this.activeTenantId);
    let list = this.audits.filter(a => a.tenantId === tId);
    if (surveyId) {
      list = list.filter(a => a.surveyId === surveyId);
    }
    return [...list];
  }

  /**
   * Aggregate stats for class and teacher expectations across all submitted surveys
   */
  public getAggregateExpectations(): {
    classExpectations: Record<string, number>;
    teacherExpectations: Record<string, number>;
    electivePairs: Record<string, number>;
    electiveSubjects: Record<string, number>;
    leadershipCandidacy: Record<
      string,
      Array<{
        studentId: string;
        studentName: string;
        studentCode?: string;
        group?: number;
        desiredPosition: string;
        experience?: string;
        plan?: string;
      }>
    >;
    totalResponses: number;
    pendingProposalsCount: number;
    urgentRequestsCount: number;
  } {
    const tId = tenantService.normalizeTenantId(this.activeTenantId);
    const surveys = studentSurveyService.getAllSurveysForTeacher();

    const classExpMap: Record<string, number> = {};
    const teacherExpMap: Record<string, number> = {};
    const electivePairs: Record<string, number> = {};
    const electiveSubjects: Record<string, number> = {};
    const leadershipMap: Record<
      string,
      Array<{
        studentId: string;
        studentName: string;
        studentCode?: string;
        group?: number;
        desiredPosition: string;
        experience?: string;
        plan?: string;
      }>
    > = {};

    let totalResponses = 0;
    surveys.forEach(s => {
      if (s.status === 'SUBMITTED' || s.status === 'REVIEWED') {
        totalResponses++;
        const ce = s.answers.classAndTeacherExpectations?.classExpectations || [];
        ce.forEach(item => {
          if (item) classExpMap[item] = (classExpMap[item] || 0) + 1;
        });

        const te = s.answers.classAndTeacherExpectations?.teacherExpectations || [];
        te.forEach(item => {
          if (item) teacherExpMap[item] = (teacherExpMap[item] || 0) + 1;
        });

        const gp = s.answers.graduationPlan;
        if (gp?.electiveSubject1) {
          electiveSubjects[gp.electiveSubject1] = (electiveSubjects[gp.electiveSubject1] || 0) + 1;
        }
        if (gp?.electiveSubject2) {
          electiveSubjects[gp.electiveSubject2] = (electiveSubjects[gp.electiveSubject2] || 0) + 1;
        }
        if (gp?.electiveSubject1 && gp?.electiveSubject2) {
          const pair = [gp.electiveSubject1, gp.electiveSubject2].sort().join(' + ');
          electivePairs[pair] = (electivePairs[pair] || 0) + 1;
        }

        // Aggregate Leadership Candidacy
        const lp = s.answers.leadershipProposal;
        if (lp && lp.desiredPosition && lp.desiredPosition.trim() !== '') {
          const pos = lp.desiredPosition.trim();
          if (!leadershipMap[pos]) {
            leadershipMap[pos] = [];
          }
          const student = studentService.getById(s.studentId);
          leadershipMap[pos].push({
            studentId: s.studentId,
            studentName: student?.fullName || 'Học viên',
            studentCode: student?.code,
            group: student?.group,
            desiredPosition: pos
          });
        }
      }
    });

    const tenantProps = this.proposals.filter(p => p.tenantId === tId && p.status === 'PENDING');
    const pendingProposalsCount = tenantProps.length;
    const urgentRequestsCount = tenantProps.filter(
      p => p.category === 'PRIVATE_SUPPORT_REQUEST' || p.category === 'PSYCHOLOGICAL_SENSITIVE' || p.category === 'HEALTH_SENSITIVE'
    ).length;

    return {
      classExpectations: classExpMap,
      teacherExpectations: teacherExpMap,
      electivePairs,
      electiveSubjects,
      leadershipCandidacy: leadershipMap,
      totalResponses,
      pendingProposalsCount,
      urgentRequestsCount
    };
  }

  private logAudit(entry: {
    surveyId: string;
    studentId: string;
    studentName?: string;
    action: string;
    fieldGroup: string;
    oldValue?: any;
    newValue?: any;
    details?: string;
  }): void {
    const tId = tenantService.normalizeTenantId(this.activeTenantId);
    const currentUser = authService.getCurrentUser();
    const newAudit: SurveySyncAudit = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      tenantId: tId,
      surveyId: entry.surveyId,
      studentId: entry.studentId,
      studentName: entry.studentName,
      action: entry.action,
      fieldGroup: entry.fieldGroup,
      oldValue: entry.oldValue,
      newValue: entry.newValue,
      performedBy: currentUser?.name || 'Hệ thống tự động',
      performedByRole: currentUser?.role || 'STUDENT',
      performedAt: new Date().toLocaleString('vi-VN'),
      details: entry.details
    };

    this.audits.unshift(newAudit);
    if (this.audits.length > 100) {
      this.audits = this.audits.slice(0, 100);
    }
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notify(): void {
    this.listeners.forEach(l => {
      try {
        l();
      } catch (err) {
        console.error('SurveySyncService listener error:', err);
      }
    });
  }
}

export const surveySyncService = new SurveySyncService();
