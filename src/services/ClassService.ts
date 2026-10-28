/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ClassSettings,
  TimelineMilestone,
  ClassGoal,
  PersonalGoal,
  PinnedItem,
  AuditLog,
  SubjectConfig
} from '../types';
import {
  initialClassSettings,
  initialTimelineMilestones,
  initialClassGoals,
  initialPersonalGoals,
  initialPinnedItems,
  initialAuditLogs,
  initialSubjects,
  GDTX_THPT_STANDARD_SUBJECTS,
  THPT_2018_STANDARD_SUBJECTS,
  THCS_2018_STANDARD_SUBJECTS,
  PRIMARY_2018_STANDARD_SUBJECTS,
  PRIMARY_G12_STANDARD_SUBJECTS,
  PRIMARY_G3_STANDARD_SUBJECTS,
  PRIMARY_G45_STANDARD_SUBJECTS,
  initialTeacher2ClassSettings
} from '../data/demoData';
import { tenantService } from './TenantService';
import { studentService } from './StudentService';
import { SchoolYearDateNormalizer } from './SchoolYearDateNormalizer';
import { classSettingsRepositoryClient } from './ClassSettingsRepositoryClient';
import { safeLocalStorageGet, safeLocalStorageSet } from '../utils/storageUtils';
import { getVietnameseSubjectFullName } from '../utils/subjectHelpers';

export class ClassService {
  private activeTenantId: string = 'tenant-lan-nguyen';
  private settings: ClassSettings = { ...initialClassSettings };
  private milestones: TimelineMilestone[] = [...initialTimelineMilestones];
  private classGoals: ClassGoal[] = [...initialClassGoals];
  private personalGoals: PersonalGoal[] = [...initialPersonalGoals];
  private pinnedItems: PinnedItem[] = [...initialPinnedItems];
  private auditLogs: AuditLog[] = [...initialAuditLogs];
  private listeners: Array<() => void> = [];
  private isFetching: boolean = false;

  constructor() {
    this.activeTenantId = tenantService.getActiveTenantId();
    this.loadFromStorage(this.activeTenantId);
    this.fetchFromServer();

    // Reactively reload whenever the active workspace/tenant switches
    tenantService.subscribe(() => {
      const nextTenantId = tenantService.getActiveTenantId();
      if (nextTenantId !== this.activeTenantId) {
        this.activeTenantId = nextTenantId;
        this.loadFromStorage(nextTenantId);
        this.notify();
        this.fetchFromServer();
      }
    });

    // Reactively notify listeners when student count/roster changes
    queueMicrotask(() => {
      if (typeof studentService !== 'undefined' && studentService?.subscribe) {
        studentService.subscribe(() => {
          this.notify();
        });
      }
    });
  }

  public refresh(): void {
    this.loadFromStorage(this.activeTenantId);
    this.notify();
    this.fetchFromServer();
  }

  public async fetchFromServer(tenantIdOverride?: string): Promise<void> {
    if (this.isFetching) return;
    this.isFetching = true;
    const targetTenant = tenantIdOverride || this.activeTenantId;
    try {
      const res = await classSettingsRepositoryClient.getClassSettings(targetTenant);
      if (res.success && res.data) {
        const serverSettings = res.data;
        if (serverSettings.schoolYearTimeline) {
          serverSettings.schoolYearTimeline = SchoolYearDateNormalizer.normalizeTimeline(
            serverSettings.schoolYearTimeline,
            serverSettings.academicYear || serverSettings.schoolYearLabel
          );
        }
        const defaults = this.getDefaultSettingsForTenant(targetTenant);
        const resolvedSubjects = (Array.isArray(serverSettings.subjects) && serverSettings.subjects.length > 0)
          ? serverSettings.subjects
          : ((this.settings.subjects && this.settings.subjects.length > 0) ? this.settings.subjects : defaults.subjects);

        this.settings = {
          ...defaults,
          ...serverSettings,
          subjects: resolvedSubjects
        };
        if (Array.isArray((serverSettings as any).milestones)) {
          this.milestones = (serverSettings as any).milestones;
        }
        if (Array.isArray((serverSettings as any).classGoals)) {
          this.classGoals = (serverSettings as any).classGoals;
        }
        if (Array.isArray((serverSettings as any).personalGoals)) {
          this.personalGoals = (serverSettings as any).personalGoals;
        }
        if (Array.isArray((serverSettings as any).pinnedItems)) {
          this.pinnedItems = (serverSettings as any).pinnedItems;
        }
        this.saveToStorage(targetTenant);
        this.notify();
      }
    } catch (err) {
      console.warn('[ClassService] Server sync notice:', err);
    } finally {
      this.isFetching = false;
    }
  }

  private getDefaultSettingsForTenant(tenantId: string): ClassSettings {
    const normId = tenantService.normalizeTenantId(tenantId);
    if (normId === 'tenant-hoang-nam') {
      return { ...initialTeacher2ClassSettings };
    }
    if (normId === 'tenant-lan-nguyen') {
      return { ...initialClassSettings };
    }

    const tenant = tenantService.getTenantById(tenantId);
    const teacherAcc = tenantService.getTeacherAccounts().find(a => a.tenantId === tenantId);
    const ownerName = teacherAcc?.fullName || tenant?.ownerName || 'Giáo viên Chủ nhiệm';
    const schoolName = teacherAcc?.schoolName || tenant?.schoolName || 'Trường THPT';
    const className = teacherAcc?.className || (tenant as any)?.className || '10A1';
    const teacherId = teacherAcc?.id || (tenant as any)?.ownerId || (tenant as any)?.teacherId || `tch-${tenantId}`;

    return {
      ...initialClassSettings,
      id: tenant?.currentClassId || tenant?.classIds?.[0] || `class-${tenantId}`,
      classId: tenant?.currentClassId || tenant?.classIds?.[0] || `class-${tenantId}`,
      workspaceId: tenantId,
      organizationId: `org-${tenantId}`,
      schoolName: schoolName,
      className: className,
      name: className,
      grade: className.replace(/[^0-9]/g, '') ? `Khối ${className.replace(/[^0-9]/g, '')}` : 'Khối 10',
      gradeLevel: className.replace(/[^0-9]/g, '') || '10',
      stream: 'Ban KHTN',
      classTrack: 'KHTN',
      academicYear: '2025 - 2026',
      schoolYearLabel: '2025 - 2026',
      semester: 'Học kỳ I',
      currentSemester: 'Học kỳ I',
      teacherId: teacherId,
      homeroomTeacherName: ownerName,
      teacherName: ownerName,
      homeroomTeacher: ownerName,
      teacherPhone: teacherAcc?.phone || tenant?.ownerPhone || '',
      teacherEmail: teacherAcc?.email || tenant?.ownerEmail || '',
      slogan: `Không gian Chủ nhiệm Lớp ${className} - ${schoolName}`,
      totalStudents: 0,
      subjects: [...initialSubjects],
      theme: {
        ...initialClassSettings.theme,
        primaryColor: '#0D9488',
        accentColor: '#0D9488',
        primaryButton: '#0D9488'
      }
    };
  }

  public reloadForActiveTenant(): void {
    this.activeTenantId = tenantService.getActiveTenantId();
    this.loadFromStorage(this.activeTenantId);
    this.notify();
    this.fetchFromServer();
  }

  private loadFromStorage(tenantId: string) {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }
    const tId = tenantService.normalizeTenantId(tenantId);
    try {
      const settingsKey = tenantService.getTenantStorageKey('class_settings', tId);
      const savedSettings = localStorage.getItem(settingsKey);

      if (savedSettings) {
        this.settings = JSON.parse(savedSettings);
        if (!this.settings.subjects || this.settings.subjects.length === 0) {
          const defaults = this.getDefaultSettingsForTenant(tId);
          this.settings.subjects = [...(defaults.subjects || initialSubjects)];
        }
      } else {
        // Migration check for legacy un-scoped key (only for tenant-lan-nguyen)
        if (tId === 'tenant-lan-nguyen') {
          const legacy = localStorage.getItem('kgcns_class_settings');
          if (legacy) {
            try {
              this.settings = JSON.parse(legacy);
              if (!this.settings.subjects || this.settings.subjects.length === 0) {
                this.settings.subjects = [...initialSubjects];
              }
              localStorage.setItem(settingsKey, JSON.stringify(this.settings));
            } catch {
              this.settings = this.getDefaultSettingsForTenant(tId);
            }
          } else {
            this.settings = this.getDefaultSettingsForTenant(tId);
          }
        } else {
          this.settings = this.getDefaultSettingsForTenant(tId);
        }
      }

      // Load milestones
      const milestonesKey = tenantService.getTenantStorageKey('milestones', tId);
      const savedMilestones = localStorage.getItem(milestonesKey);
      if (savedMilestones) {
        this.milestones = JSON.parse(savedMilestones);
      } else {
        this.milestones = tId === 'tenant-lan-nguyen' ? [...initialTimelineMilestones] : [];
      }
      this.milestones.sort((a, b) => {
        const diff = SchoolYearDateNormalizer.parseEventDateToTimestamp(a.date) - SchoolYearDateNormalizer.parseEventDateToTimestamp(b.date);
        if (diff !== 0) return diff;
        return (a.id || '').localeCompare(b.id || '');
      });

      // Load class goals
      const goalsKey = tenantService.getTenantStorageKey('class_goals', tId);
      const savedGoals = localStorage.getItem(goalsKey);
      if (savedGoals) {
        this.classGoals = JSON.parse(savedGoals);
      } else {
        this.classGoals = tId === 'tenant-lan-nguyen' ? [...initialClassGoals] : [];
      }

      // Load personal goals
      const pGoalsKey = tenantService.getTenantStorageKey('personal_goals', tId);
      const savedPersonalGoals = localStorage.getItem(pGoalsKey);
      if (savedPersonalGoals) {
        this.personalGoals = JSON.parse(savedPersonalGoals);
      } else {
        this.personalGoals = tId === 'tenant-lan-nguyen' ? [...initialPersonalGoals] : [];
      }

      // Load pinned items
      const pinsKey = tenantService.getTenantStorageKey('pinned_items', tId);
      const savedPins = localStorage.getItem(pinsKey);
      if (savedPins) {
        this.pinnedItems = JSON.parse(savedPins);
      } else {
        this.pinnedItems = tId === 'tenant-lan-nguyen' ? [...initialPinnedItems] : [];
      }

      // Load audit logs
      const auditKey = tenantService.getTenantStorageKey('audit_logs', tId);
      const savedAudit = localStorage.getItem(auditKey);
      if (savedAudit) {
        this.auditLogs = JSON.parse(savedAudit);
      } else {
        this.auditLogs = tId === 'tenant-lan-nguyen' ? [...initialAuditLogs] : [];
      }
    } catch (err) {
      console.error('ClassService load error:', err);
      this.settings = this.getDefaultSettingsForTenant(tId);
    }
  }

  private saveToStorage(tenantId?: string) {
    const tId = tenantService.normalizeTenantId(tenantId || this.activeTenantId);
    try {
      localStorage.setItem(tenantService.getTenantStorageKey('class_settings', tId), JSON.stringify(this.settings));
      localStorage.setItem(tenantService.getTenantStorageKey('milestones', tId), JSON.stringify(this.milestones));
      localStorage.setItem(tenantService.getTenantStorageKey('class_goals', tId), JSON.stringify(this.classGoals));
      localStorage.setItem(tenantService.getTenantStorageKey('personal_goals', tId), JSON.stringify(this.personalGoals));
      localStorage.setItem(tenantService.getTenantStorageKey('pinned_items', tId), JSON.stringify(this.pinnedItems));
      localStorage.setItem(tenantService.getTenantStorageKey('audit_logs', tId), JSON.stringify(this.auditLogs));
    } catch {
      // ignore
    }
    this.notify();
  }

  public getSettings(): ClassSettings {
    const defaults = this.getDefaultSettingsForTenant(this.activeTenantId);
    const teacherName = this.settings.homeroomTeacherName || this.settings.teacherName || this.settings.homeroomTeacher || defaults.teacherName;
    
    // Normalized Single Source of Truth for School Year Timeline
    const rawTimeline = this.settings.schoolYearTimeline || defaults.schoolYearTimeline || {
      startDateHK1: '2025-09-05',
      endDateHK1: '2026-01-16',
      startDateHK2: '2026-01-19',
      endDateHK2: '2026-05-30',
      totalWeeksHK1: 18,
      totalWeeksHK2: 17,
      totalWeeks: 35,
      firstStudyWeekStartDate: '2025-09-05',
      schoolYearLabel: '2025 - 2026',
      timezone: 'Asia/Ho_Chi_Minh',
      excludedPeriods: [
        {
          id: 'break-tet',
          name: 'Nghỉ Tết Nguyên Đán',
          startDate: '2026-02-12',
          endDate: '2026-02-23',
          reason: 'Nghỉ Tết theo quy định',
          countAsStudyWeek: false
        }
      ]
    };

    const normalizedTimeline = SchoolYearDateNormalizer.normalizeTimeline(
      rawTimeline,
      this.settings.academicYear || this.settings.schoolYearLabel
    );

    const academicYear = normalizedTimeline.schoolYearLabel || this.settings.academicYear || defaults.academicYear || '2025 - 2026';
    const semester = this.settings.semester || (this.settings.currentSemester as any) || defaults.semester || 'Học kỳ I';
    const className = this.settings.className || this.settings.name || defaults.className || '11A1';
    const schoolName = this.settings.schoolName || defaults.schoolName || 'THPT Chuyên Lê Hồng Phong';
    const studentCount = studentService.getStudents() ? studentService.getStudents().length : 0;
    const confirmedTotalStudents = this.settings.confirmedTotalStudents !== undefined && this.settings.confirmedTotalStudents > 0
      ? this.settings.confirmedTotalStudents
      : undefined;
    const totalStudents = confirmedTotalStudents || studentCount;

    return {
      ...defaults,
      ...this.settings,
      totalStudents,
      confirmedTotalStudents,
      id: this.settings.id || defaults.id || `class-${this.activeTenantId}`,
      organizationId: this.settings.organizationId || (this.activeTenantId === 'tenant-hoang-nam' ? 'org-nh-hanoi' : (this.activeTenantId === 'tenant-lan-nguyen' ? 'org-lhp-tphcm' : `org-${this.activeTenantId}`)),
      workspaceId: this.activeTenantId,
      classId: this.settings.classId || this.settings.id || defaults.id,
      schoolYearId: this.settings.schoolYearId || `sy-${academicYear.replace(/\s+/g, '')}`,
      schoolYearLabel: academicYear,
      academicYear: academicYear,
      schoolYear: academicYear,
      currentSemester: semester,
      semester: semester,
      className: className,
      name: className,
      schoolName: schoolName,
      schoolYearTimeline: normalizedTimeline,
      grade: this.settings.grade || defaults.grade || (this.activeTenantId === 'tenant-hoang-nam' ? 'Khối 12' : (this.activeTenantId === 'tenant-lan-nguyen' ? 'Khối 11' : 'Khối 10')),
      stream: this.settings.stream || defaults.stream || 'Ban KHTN',
      gradeLevel: this.settings.gradeLevel || (this.settings.grade ? this.settings.grade.replace(/[^0-9]/g, '') : (this.activeTenantId === 'tenant-hoang-nam' ? '12' : (this.activeTenantId === 'tenant-lan-nguyen' ? '11' : '10'))),
      classTrack: this.settings.classTrack || (this.settings.stream ? (this.settings.stream.includes('KHTN') ? 'KHTN' : (this.settings.stream.includes('KHXH') ? 'KHXH' : this.settings.stream)) : 'KHTN'),
      teacherId: this.settings.teacherId || (this.activeTenantId === 'tenant-hoang-nam' ? 'tch-02' : (this.activeTenantId === 'tenant-lan-nguyen' ? 'tch-01' : (tenantService.getTeacherAccounts().find(a => a.tenantId === this.activeTenantId)?.id || defaults.teacherId || `tch-${this.activeTenantId}`))),
      homeroomTeacher: teacherName,
      homeroomTeacherName: teacherName,
      teacherName: teacherName,
      coverImage: this.settings.coverImage || defaults.coverImage,
      coverImageUrl: this.settings.coverImageUrl || this.settings.coverImage || defaults.coverImage,
      coverPositionY: this.settings.coverPositionY !== undefined ? this.settings.coverPositionY : 50,
      coverPosition: this.settings.coverPosition || `center ${this.settings.coverPositionY !== undefined ? this.settings.coverPositionY : 50}%`,
      coverZoom: this.settings.coverZoom || 100,
      subjects: this.settings.subjects && this.settings.subjects.length > 0 ? this.settings.subjects : [...(defaults.subjects || initialSubjects)],
      educationTrack: this.settings.educationTrack !== undefined ? this.settings.educationTrack : (this.settings.grade && this.settings.stream ? `${this.settings.grade} - ${this.settings.stream}` : ''),
      violationWarningThreshold: typeof this.settings.violationWarningThreshold === 'number' && this.settings.violationWarningThreshold >= 1
        ? this.settings.violationWarningThreshold
        : (defaults.violationWarningThreshold || 2),
      theme: {
        ...defaults.theme,
        ...(this.settings.theme || {})
      },
      interactionSettings: {
        ...defaults.interactionSettings,
        ...(this.settings.interactionSettings || {})
      },
      googleIntegration: {
        ...defaults.googleIntegration,
        ...(this.settings.googleIntegration || {})
      },
      zaloSettings: {
        ...defaults.zaloSettings,
        ...(this.settings.zaloSettings || {
          classId: this.settings.id || `class-${this.activeTenantId}`,
          groupName: `Lớp ${className} - Phụ huynh & Học sinh`,
          groupLink: `https://zalo.me/g/lop${className.toLowerCase()}`,
          zaloOAConfigured: false,
          notificationMode: 'manual'
        })
      }
    };
  }

  public getWorkspaceScope() {
    const s = this.getSettings();
    return {
      organizationId: s.organizationId || (this.activeTenantId === 'tenant-hoang-nam' ? 'org-nh-hanoi' : 'org-lhp-tphcm'),
      workspaceId: this.activeTenantId,
      classId: s.classId || s.id || `class-${this.activeTenantId}`,
      schoolYearId: s.schoolYearId || 'sy-2025-2026',
      schoolYearLabel: s.schoolYearLabel || s.academicYear || '2025 - 2026',
      currentSemester: s.currentSemester || s.semester || 'Học kỳ I',
      className: s.className || (this.activeTenantId === 'tenant-hoang-nam' ? '12A2' : '11A1')
    };
  }

  // Single Source of Truth for Subjects across the active workspace
  public getSubjects(): SubjectConfig[] {
    const s = this.getSettings().subjects;
    const settings = this.getSettings();
    const isGDTX = settings.curriculumType === 'GDTX' || 
                   settings.curriculumType === 'GDTX_THPT' || 
                   settings.educationProgram === 'GDTX' ||
                   settings.educationProgram === 'GDTX_THPT' ||
                   settings.schoolName?.toLowerCase().includes('gdtx') || 
                   settings.schoolName?.toLowerCase().includes('gdnn');
    
    const gradeNum = parseInt(settings.gradeLevel || settings.grade || (settings.className?.match(/\d+/)?.[0] || '11'), 10);
    
    let standardCatalog: SubjectConfig[];
    if (isGDTX) {
      standardCatalog = GDTX_THPT_STANDARD_SUBJECTS;
    } else if (gradeNum >= 1 && gradeNum <= 2) {
      standardCatalog = PRIMARY_G12_STANDARD_SUBJECTS;
    } else if (gradeNum === 3) {
      standardCatalog = PRIMARY_G3_STANDARD_SUBJECTS;
    } else if (gradeNum >= 4 && gradeNum <= 5) {
      standardCatalog = PRIMARY_G45_STANDARD_SUBJECTS;
    } else if (settings.educationProgram === 'TIỂU HỌC' || settings.curriculumType === 'PRIMARY') {
      standardCatalog = PRIMARY_2018_STANDARD_SUBJECTS;
    } else if ((gradeNum >= 6 && gradeNum <= 9) || settings.educationProgram === 'THCS' || settings.curriculumType === 'THCS') {
      standardCatalog = THCS_2018_STANDARD_SUBJECTS;
    } else {
      standardCatalog = THPT_2018_STANDARD_SUBJECTS;
    }
    // 1. Canonical normalization helper
    const normCanonical = (str?: string) => {
      if (!str) return '';
      const canonical = getVietnameseSubjectFullName(str.trim());
      return canonical.toLowerCase().replace(/,/g, '').trim();
    };

    // 2. Deduplicate incoming subjects list by ID and canonical name, preserving existing IDs & configurations
    const deduplicatedExisting: SubjectConfig[] = [];
    const seenIds = new Set<string>();
    const seenCanonicalNames = new Set<string>();

    if (s && s.length > 0) {
      for (const sub of s) {
        if (!sub) continue;
        const subId = (sub.id || '').trim();
        const rawName = sub.name || (sub as any).subjectName || '';
        const canonicalName = getVietnameseSubjectFullName(rawName);
        const canonKey = canonicalName.toLowerCase();

        // If duplicate id or duplicate canonical name, merge/skip
        if (subId && seenIds.has(subId)) continue;
        if (canonKey && seenCanonicalNames.has(canonKey)) continue;

        if (subId) seenIds.add(subId);
        if (canonKey) seenCanonicalNames.add(canonKey);

        deduplicatedExisting.push({
          ...sub,
          name: canonicalName || sub.name,
          subjectName: canonicalName || sub.name
        });
      }
    }

    // 3. Single Source of Truth Preservation:
    // If the class already has a configured subject list (e.g. GVCN selected 9 subjects),
    // NEVER forcibly re-insert missing standard subjects from standardCatalog.
    // That was the root cause of deleted/unselected subjects unexpectedly reappearing ("tự xuất hiện môn khác").
    // Only when no subjects exist at all (initial blank state) do we initialize from standardCatalog.
    const existingList: SubjectConfig[] = deduplicatedExisting.length > 0 
      ? deduplicatedExisting 
      : [...standardCatalog];

    return existingList.map(sub => {
      const subName = (sub && (sub.name || (sub as any).subjectName)) || 'Môn học';
      const isDef = subName.toLowerCase().includes('quốc phòng') || 
        (sub?.code && sub.code.toUpperCase() === 'GDQP') || 
        (sub?.subjectCode && sub.subjectCode.toUpperCase() === 'GDQP');

      // Đánh giá bằng nhận xét theo Thông tư 22/2021 và Thông tư 27/2020:
      // GDTC, Nghệ thuật (Âm nhạc, Mĩ thuật), HĐTN-HN, Nội dung giáo dục địa phương, Chào cờ, Sinh hoạt lớp
      const isComment = !isDef && (sub?.assessmentMode === 'COMMENT_ONLY' || 
        sub?.assessmentType === 'COMMENT' ||
        subName.toLowerCase().includes('trải nghiệm') || 
        subName.toLowerCase().includes('hướng nghiệp') ||
        subName.toLowerCase().includes('thể chất') ||
        subName.toLowerCase().includes('địa phương') ||
        subName.toLowerCase().includes('âm nhạc') ||
        subName.toLowerCase().includes('mĩ thuật') ||
        subName.toLowerCase().includes('mỹ thuật') ||
        subName.toLowerCase().includes('chào cờ') ||
        subName.toLowerCase().includes('sinh hoạt'));

      const isActivity = isComment && (subName.toLowerCase().includes('trải nghiệm') || subName.toLowerCase().includes('địa phương'));
      
      // Môn bắt buộc THPT theo TT 32/2018 & TT 13/2022: Toán, Ngữ văn, Ngoại ngữ 1, Lịch sử, GDTC, GDQP-AN, HĐTN-HN, GDĐP
      const isMandatory = sub?.subjectType === 'MANDATORY' || 
        (!sub?.subjectType && (
          subName.includes('Toán') || 
          subName.includes('Văn') || 
          subName.includes('Sử') || 
          isDef ||
          (!isGDTX && (subName.includes('Ngoại ngữ') || subName.includes('Tiếng Anh') || subName.includes('Thể chất')))
        ));

      return {
        ...sub,
        name: subName,
        subjectName: subName,
        subjectCode: sub?.subjectCode || sub?.code || subName.substring(0, 4).toUpperCase(),
        code: sub?.code || sub?.subjectCode || subName.substring(0, 4).toUpperCase(),
        subjectType: sub?.subjectType || (isActivity ? 'ACTIVITY' : (isMandatory ? 'MANDATORY' : 'ELECTIVE')),
        assessmentType: isComment ? 'COMMENT' : (isDef ? 'SCORE' : (sub?.assessmentType || 'SCORE')),
        category: sub?.category || (isActivity ? 'Hoạt động giáo dục bắt buộc' : (isMandatory ? 'Môn học bắt buộc' : 'Môn học lựa chọn')),
        selected: sub?.selected !== undefined ? sub.selected : true,
        annualPeriods: sub?.annualPeriods !== undefined ? sub.annualPeriods : (isDef ? 35 : (sub?.periodsPerWeek ? sub.periodsPerWeek * 35 : 70)),
        weeklyPeriods: sub?.weeklyPeriods !== undefined ? sub.weeklyPeriods : (sub?.periodsPerWeek || (isDef ? 1 : 2)),
        txColumnCount: isComment ? 0 : (sub?.txColumnCount !== undefined ? sub.txColumnCount : (isDef ? 2 : 3)),
        assessmentMode: isComment ? 'COMMENT_ONLY' : (sub?.assessmentMode || (isDef ? 'SCORE_AND_COMMENT' : 'SCORE_AND_COMMENT')),
        active: sub?.active !== undefined ? sub.active : true,
        curriculumType: isGDTX ? 'GDTX_THPT' : 'THPT'
      };
    });
  }

  public getCurriculumType(): 'GDTX_THPT' | 'THPT' {
    const settings = this.getSettings();
    if (settings.curriculumType === 'THPT' || settings.educationProgram === 'THPT') {
      return 'THPT';
    }
    if (settings.curriculumType === 'GDTX' || settings.curriculumType === 'GDTX_THPT' || settings.educationProgram === 'GDTX') {
      return 'GDTX_THPT';
    }
    return 'THPT';
  }

  public static getStandardSubjectsForLevel(gradeLevel?: string | number, educationProgram?: string): SubjectConfig[] {
    const num = typeof gradeLevel === 'number' ? gradeLevel : parseInt(String(gradeLevel || '').replace(/\D/g, '') || '11', 10);
    const prog = (educationProgram || '').toUpperCase();
    if (prog.includes('GDTX')) return GDTX_THPT_STANDARD_SUBJECTS;
    if (num >= 1 && num <= 2) return PRIMARY_G12_STANDARD_SUBJECTS;
    if (num === 3) return PRIMARY_G3_STANDARD_SUBJECTS;
    if (num >= 4 && num <= 5) return PRIMARY_G45_STANDARD_SUBJECTS;
    if ((num >= 1 && num <= 5) || prog.includes('TIỂU HỌC') || prog.includes('PRIMARY')) return PRIMARY_2018_STANDARD_SUBJECTS;
    if ((num >= 6 && num <= 9) || prog.includes('THCS')) return THCS_2018_STANDARD_SUBJECTS;
    return THPT_2018_STANDARD_SUBJECTS;
  }

  public setCurriculumType(type: 'GDTX_THPT' | 'THPT') {
    const newCatalog = type === 'GDTX_THPT' ? GDTX_THPT_STANDARD_SUBJECTS : THPT_2018_STANDARD_SUBJECTS;
    this.updateSettings({
      curriculumType: type,
      educationProgram: type,
      subjects: [...newCatalog]
    });
    this.logAudit('Cài đặt lớp', `Chuyển chương trình đào tạo: ${type === 'GDTX_THPT' ? 'GDTX cấp THPT' : 'GDPT 2018 cấp THPT'}`);
  }

  public resetSubjectsToGDTX() {
    this.updateSettings({
      subjects: [...GDTX_THPT_STANDARD_SUBJECTS],
      curriculumType: 'GDTX_THPT',
      educationProgram: 'GDTX_THPT'
    });
    this.logAudit('Cấu hình môn học', 'Khôi phục danh mục môn học chuẩn GDTX cấp THPT (TT 12/2022)');
  }

  public resetSubjectsToStandardGDPT() {
    const settings = this.getSettings();
    const gradeNum = parseInt(settings.gradeLevel || settings.grade || (settings.className?.match(/\d+/)?.[0] || '11'), 10);
    const catalog = ClassService.getStandardSubjectsForLevel(gradeNum, settings.educationProgram);
    const targetCurriculum = (gradeNum >= 1 && gradeNum <= 5) ? 'PRIMARY' : (gradeNum >= 6 && gradeNum <= 9) ? 'THCS' : 'THPT';
    this.updateSettings({
      subjects: [...catalog],
      curriculumType: targetCurriculum as any,
      educationProgram: targetCurriculum as any
    });
    this.logAudit('Cấu hình môn học', `Khôi phục danh mục môn học chuẩn GDPT 2018 (${targetCurriculum} - TT 32/2018 & TT 13/2022)`);
  }

  public getAppliedSubjects(): SubjectConfig[] {
    return this.getSubjects().filter(s => s && s.selected !== false && s.active !== false);
  }

  public getSubjectNames(): string[] {
    return this.getAppliedSubjects().map(s => s?.name || '').filter(Boolean);
  }

  public getSubjectById(subjectId: string): SubjectConfig | undefined {
    return this.getSubjects().find(s => s.id === subjectId || s.code === subjectId || s.subjectCode === subjectId);
  }

  public getSubjectByName(name: string): SubjectConfig | undefined {
    const norm = (str: string) => str.toLowerCase().replace(/,/g, '').trim();
    const target = norm(name);
    return this.getSubjects().find(s => norm(s.name) === target || (s.subjectName && norm(s.subjectName) === target));
  }

  public isSubjectEnabled(subjectIdOrName: string): boolean {
    const applied = this.getAppliedSubjects();
    const norm = (str: string) => str.toLowerCase().replace(/,/g, '').trim();
    const target = norm(subjectIdOrName);
    return applied.some(s => s.id === subjectIdOrName || s.code === subjectIdOrName || s.subjectCode === subjectIdOrName || norm(s.name) === target);
  }

  public updateSubject(id: string, updates: Partial<SubjectConfig>) {
    const currentSubjects = this.getSubjects();
    const updated = currentSubjects.map(sub => {
      if (sub.id === id || sub.name === id) {
        return {
          ...sub,
          ...updates,
          name: updates.name || sub.name,
          subjectName: updates.name || sub.name,
          subjectCode: updates.subjectCode || updates.code || sub.subjectCode || sub.code
        };
      }
      return sub;
    });
    this.updateSettings({ subjects: updated });
    this.logAudit('Cấu hình môn học', `Cập nhật cấu hình môn ${updates.name || id}`);
  }

  public async updateSubjectList(newList: SubjectConfig[]): Promise<{ success: boolean; data?: ClassSettings; error?: string }> {
    this.logAudit('Cấu hình môn học', `Lưu danh sách ${newList.length} môn học của lớp`);
    return await this.updateSettings({ subjects: newList });
  }

  public selectAllSubjects(selected: boolean) {
    const currentSubjects = this.getSubjects();
    const updated = currentSubjects.map(s => ({ ...s, selected }));
    this.updateSettings({ subjects: updated });
  }


  public updateSubjectName(idOrOldName: string, newName: string) {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const currentSubjects = this.getSubjects();
    const updated = currentSubjects.map(sub => {
      if (sub.id === idOrOldName || sub.name === idOrOldName) {
        return { ...sub, name: trimmed, subjectName: trimmed };
      }
      return sub;
    });
    this.updateSettings({ subjects: updated });
  }

  public addSubject(sub: Omit<SubjectConfig, 'id'>) {
    const currentSubjects = this.getSubjects();
    const safeSubName = sub?.name || (sub as any)?.subjectName || 'Môn mới';
    const generatedCode = sub.subjectCode || sub.code || safeSubName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '').substring(0, 6).toUpperCase() || 'SUB';
    const newSub: SubjectConfig = {
      ...sub,
      name: safeSubName,
      subjectName: safeSubName,
      id: `sub-${Date.now()}`,
      code: generatedCode,
      subjectCode: generatedCode,
      selected: sub.selected !== undefined ? sub.selected : true,
      annualPeriods: sub.annualPeriods !== undefined ? sub.annualPeriods : 70,
      txColumnCount: sub.txColumnCount !== undefined ? sub.txColumnCount : 3,
      assessmentMode: sub.assessmentMode || 'SCORE_AND_COMMENT',
      active: sub.active !== undefined ? sub.active : true,
      displayOrder: currentSubjects.length + 1,
      timetableColor: sub.timetableColor || { bg: 'bg-slate-50', border: 'border-slate-300', text: 'text-slate-900', label: 'Xám pastel' }
    };
    this.updateSettings({ subjects: [...currentSubjects, newSub] });
    this.logAudit('Thêm môn học', `Thêm môn ${newSub.name} (${newSub.subjectCode})`);
  }

  public deleteSubject(id: string) {
    const currentSubjects = this.getSubjects();
    if (currentSubjects.length <= 1) return;
    const toDelete = currentSubjects.find(s => s && (s.id === id || s.name === id));
    const updated = currentSubjects.filter(s => s && s.id !== id && s.name !== id);
    this.updateSettings({ subjects: updated });
    if (toDelete && toDelete.name) {
      this.logAudit('Xóa môn học', `Xóa môn ${toDelete.name}`);
    }
  }

  public getClassInfo() {
    return this.getSettings();
  }

  public updateClassInfo(updates: any) {
    const mapped: Partial<ClassSettings> = { ...updates };
    if (updates.name) mapped.className = updates.name;
    if (updates.schoolYear) mapped.academicYear = updates.schoolYear;
    if (updates.homeroomTeacher) {
      mapped.teacherName = updates.homeroomTeacher;
      mapped.homeroomTeacherName = updates.homeroomTeacher;
    }
    this.updateSettings(mapped);
  }

  public getGoals(): ClassGoal[] {
    return this.getClassGoals();
  }

  public addGoal(goal: Omit<ClassGoal, 'id'>) {
    this.addClassGoal(goal);
  }

  public updateGoalProgress(id: string, progress: number) {
    this.updateClassGoal(id, { progress, status: progress >= 100 ? 'completed' : 'in_progress' });
  }

  public getViolationWarningThreshold(targetTenantId?: string): number {
    const tId = tenantService.normalizeTenantId(targetTenantId || this.activeTenantId);
    
    // Check direct teacher-isolated storage key first
    try {
      const directKey = `kgcns_teacher_threshold_${tId}`;
      const directSaved = safeLocalStorageGet(directKey);
      if (directSaved) {
        const p = parseInt(directSaved, 10);
        if (!isNaN(p) && p >= 1) return p;
      }
    } catch {}

    const s = this.getSettings();
    const val = s.violationWarningThreshold;
    if (typeof val === 'number' && !isNaN(val) && val >= 1) {
      return Math.floor(val);
    }
    return 2;
  }

  public async setViolationWarningThreshold(threshold: number, targetTenantId?: string): Promise<{ success: boolean; data?: ClassSettings; error?: string }> {
    const tId = tenantService.normalizeTenantId(targetTenantId || this.activeTenantId);
    const valid = Math.max(1, Math.floor(threshold || 2));
    
    // Save to direct teacher-isolated key immediately
    try {
      safeLocalStorageSet(`kgcns_teacher_threshold_${tId}`, String(valid));
    } catch {}

    return this.updateSettings({ violationWarningThreshold: valid });
  }

  public async updateSettings(newSettings: Partial<ClassSettings>): Promise<{ success: boolean; data?: ClassSettings; error?: string }> {
    const updated: ClassSettings = { ...this.settings, ...newSettings };
    
    // Normalize schoolYearTimeline if provided
    if (newSettings.schoolYearTimeline) {
      const normalizedTimeline = SchoolYearDateNormalizer.normalizeTimeline(
        newSettings.schoolYearTimeline,
        newSettings.academicYear || newSettings.schoolYearLabel || updated.academicYear
      );
      updated.schoolYearTimeline = normalizedTimeline;
      updated.academicYear = normalizedTimeline.schoolYearLabel;
      updated.schoolYear = normalizedTimeline.schoolYearLabel;
      updated.schoolYearLabel = normalizedTimeline.schoolYearLabel;
    } else {
      // Sync academic year / school year aliases
      const yr = newSettings.schoolYearLabel || newSettings.academicYear || newSettings.schoolYear;
      if (yr) {
        updated.academicYear = yr;
        updated.schoolYear = yr;
        updated.schoolYearLabel = yr;
      }
    }

    // Sync class name aliases
    const clsName = newSettings.className || newSettings.name;
    if (clsName) {
      updated.className = clsName;
      updated.name = clsName;
    }

    // Sync educationTrack, grade, stream
    if (newSettings.educationTrack !== undefined) {
      const rawTrack = String(newSettings.educationTrack).trim();
      updated.educationTrack = rawTrack;
      if (rawTrack) {
        const gradeMatch = rawTrack.match(/(?:Khối\s*)?(10|11|12)/i);
        if (gradeMatch) {
          const gNum = gradeMatch[1];
          updated.gradeLevel = gNum;
          if (!newSettings.grade) {
            updated.grade = `Khối ${gNum}`;
          }
        }
        const parts = rawTrack.split(/[-·|/]/);
        if (parts.length > 1 && !newSettings.stream) {
          const streamPart = parts.slice(1).join(' - ').trim();
          updated.stream = streamPart;
          updated.classTrack = streamPart.includes('KHTN') ? 'KHTN' : (streamPart.includes('KHXH') ? 'KHXH' : streamPart);
        }
      }
    }
    if (newSettings.grade !== undefined) {
      updated.grade = String(newSettings.grade).trim();
      const gNum = updated.grade.replace(/[^0-9]/g, '');
      if (gNum) updated.gradeLevel = gNum;
    }
    if (newSettings.stream !== undefined) {
      updated.stream = String(newSettings.stream).trim();
      updated.classTrack = updated.stream.includes('KHTN') ? 'KHTN' : (updated.stream.includes('KHXH') ? 'KHXH' : updated.stream);
    }

    // Sync semester
    const sem = newSettings.currentSemester || newSettings.semester;
    if (sem) {
      updated.semester = sem as any;
      updated.currentSemester = sem;
    }

    // Sync teacher naming aliases
    const teacherName = newSettings.homeroomTeacherName || newSettings.teacherName || newSettings.homeroomTeacher;
    if (teacherName) {
      updated.teacherName = teacherName;
      updated.homeroomTeacherName = teacherName;
      updated.homeroomTeacher = teacherName;

      // Sync to session profile if teacher
      try {
        const sessionStr = safeLocalStorageGet('kgcns_auth_session');
        if (sessionStr) {
          const session = JSON.parse(sessionStr);
          session.name = teacherName;
          if (newSettings.teacherPhone) session.phone = newSettings.teacherPhone;
          if (newSettings.teacherEmail) session.email = newSettings.teacherEmail;
          safeLocalStorageSet('kgcns_auth_session', JSON.stringify(session));
        }
      } catch {
        // ignore
      }
    }

    if (newSettings.coverImage || newSettings.coverImageUrl) {
      const img = newSettings.coverImage || newSettings.coverImageUrl;
      updated.coverImage = img!;
      updated.coverImageUrl = img!;
    }

    if (newSettings.theme) {
      updated.theme = { ...this.settings.theme, ...newSettings.theme };
    }
    if (newSettings.interactionSettings) {
      updated.interactionSettings = { ...this.settings.interactionSettings, ...newSettings.interactionSettings };
    }
    if (newSettings.googleIntegration) {
      updated.googleIntegration = { ...this.settings.googleIntegration, ...newSettings.googleIntegration };
    }
    if (newSettings.confirmedTotalStudents !== undefined) {
      updated.confirmedTotalStudents = (newSettings.confirmedTotalStudents !== null && newSettings.confirmedTotalStudents >= 0)
        ? newSettings.confirmedTotalStudents
        : undefined;
      if (updated.confirmedTotalStudents !== undefined) {
        updated.totalStudents = updated.confirmedTotalStudents;
      }
    }

    const previousSettings = { ...this.settings };
    this.settings = updated;
    this.logAudit('Cập nhật Cài đặt Lớp', `Thay đổi thông tin lớp ${this.settings.className}`);

    // Sync to server
    try {
      const res = await classSettingsRepositoryClient.updateClassSettings(updated, this.activeTenantId);
      if (res && res.success && res.data) {
        const serverData = res.data;
        if (serverData.schoolYearTimeline) {
          serverData.schoolYearTimeline = SchoolYearDateNormalizer.normalizeTimeline(
            serverData.schoolYearTimeline,
            serverData.academicYear || serverData.schoolYearLabel
          );
        }
        if (Array.isArray(serverData.subjects) && serverData.subjects.length === 0 && updated.subjects && updated.subjects.length > 0) {
          serverData.subjects = updated.subjects;
        }
        this.settings = { ...this.settings, ...serverData };
        this.saveToStorage(this.activeTenantId);

        // Synchronize updated configuration to Admin management: schoolName, className, totalStudents, academicYear
        const effectiveSize = (this.settings.confirmedTotalStudents !== undefined && this.settings.confirmedTotalStudents !== null && this.settings.confirmedTotalStudents >= 0)
          ? this.settings.confirmedTotalStudents
          : (this.settings.totalStudents !== undefined && this.settings.totalStudents !== null ? this.settings.totalStudents : 0);

        tenantService.syncClassroomConfiguration(this.activeTenantId, {
          schoolName: this.settings.schoolName,
          className: this.settings.className,
          totalStudentsCount: effectiveSize,
          academicYear: this.settings.academicYear
        });

        this.notify();
        return { success: true, data: this.settings };
      } else {
        // Rollback on server failure
        this.settings = previousSettings;
        return {
          success: false,
          error: res?.message || 'Không thể đồng bộ cấu hình lớp lên máy chủ. Vui lòng thử lại.'
        };
      }
    } catch (err: any) {
      this.settings = previousSettings;
      console.warn('[ClassService] Error updating class settings on server:', err);
      return { success: false, error: err?.message || 'Lỗi kết nối khi đồng bộ lên máy chủ.' };
    }
  }

  public updateCoverImage(imageUrl: string, options?: { positionY?: number; position?: string; zoom?: number }) {
    this.settings.coverImage = imageUrl;
    this.settings.coverImageUrl = imageUrl;
    if (options?.positionY !== undefined) {
      this.settings.coverPositionY = options.positionY;
      this.settings.coverPosition = options.position || `center ${options.positionY}%`;
    }
    if (options?.zoom !== undefined) {
      this.settings.coverZoom = options.zoom;
    }
    this.logAudit('Thay ảnh bìa lớp', 'Đã cập nhật ảnh bìa và căn chỉnh vị trí');
    this.saveToStorage();

    classSettingsRepositoryClient.updateClassSettings({
      coverImage: imageUrl,
      ...(this.settings.coverPositionY !== undefined ? { coverPositionY: this.settings.coverPositionY } : {}),
      ...(this.settings.coverPosition ? { coverPosition: this.settings.coverPosition } : {}),
      ...(this.settings.coverZoom !== undefined ? { coverZoom: this.settings.coverZoom } : {})
    }).catch(err => {
      console.warn('[ClassService] Error updating cover image on server:', err);
    });
  }

  public resetCoverImage() {
    const defaults = this.getDefaultSettingsForTenant(this.activeTenantId);
    this.settings.coverImage = defaults.coverImage;
    this.settings.coverImageUrl = defaults.coverImage;
    this.settings.coverPositionY = 50;
    this.settings.coverPosition = 'center 50%';
    this.settings.coverZoom = 100;
    this.saveToStorage();

    classSettingsRepositoryClient.updateClassSettings({
      coverImage: defaults.coverImage,
      coverPositionY: 50,
      coverPosition: 'center 50%',
      coverZoom: 100
    }).catch(err => {
      console.warn('[ClassService] Error resetting cover image on server:', err);
    });
  }

  public updateTheme(themeUpdates: Partial<ClassSettings['theme']>) {
    this.settings.theme = { ...this.settings.theme, ...themeUpdates };
    this.logAudit('Cập nhật Giao diện', 'Đã thay đổi cấu hình giao diện');
    this.saveToStorage();

    classSettingsRepositoryClient.updateClassSettings({ theme: this.settings.theme }).catch(err => {
      console.warn('[ClassService] Error updating theme on server:', err);
    });
  }

  public resetTheme() {
    const defaults = this.getDefaultSettingsForTenant(this.activeTenantId);
    this.settings.theme = { ...defaults.theme };
    this.logAudit('Đặt lại giao diện', 'Đã khôi phục giao diện mặc định');
    this.saveToStorage();

    classSettingsRepositoryClient.updateClassSettings({ theme: defaults.theme }).catch(err => {
      console.warn('[ClassService] Error resetting theme on server:', err);
    });
  }

  // Milestones
  public getMilestones(): TimelineMilestone[] {
    return [...this.milestones].sort((a, b) => {
      const diff = SchoolYearDateNormalizer.parseEventDateToTimestamp(a.date) - SchoolYearDateNormalizer.parseEventDateToTimestamp(b.date);
      if (diff !== 0) return diff;
      return (a.id || '').localeCompare(b.id || '');
    });
  }

  public addMilestone(milestone: Omit<TimelineMilestone, 'id'>) {
    const newM: TimelineMilestone = {
      ...milestone,
      id: `tl-${Date.now()}`
    };
    this.milestones.push(newM);
    this.milestones.sort((a, b) => {
      const diff = SchoolYearDateNormalizer.parseEventDateToTimestamp(a.date) - SchoolYearDateNormalizer.parseEventDateToTimestamp(b.date);
      if (diff !== 0) return diff;
      return (a.id || '').localeCompare(b.id || '');
    });
    this.logAudit('Thêm mốc thời gian', newM.title);
    this.saveToStorage();
    classSettingsRepositoryClient.updateClassSettings({ milestones: this.milestones } as any).catch(() => {});
  }

  public updateMilestone(id: string, updates: Partial<TimelineMilestone>) {
    this.milestones = this.milestones.map(m => m.id === id ? { ...m, ...updates } : m);
    this.milestones.sort((a, b) => {
      const diff = SchoolYearDateNormalizer.parseEventDateToTimestamp(a.date) - SchoolYearDateNormalizer.parseEventDateToTimestamp(b.date);
      if (diff !== 0) return diff;
      return (a.id || '').localeCompare(b.id || '');
    });
    this.saveToStorage();
    classSettingsRepositoryClient.updateClassSettings({ milestones: this.milestones } as any).catch(() => {});
  }

  public deleteMilestone(id: string) {
    this.milestones = this.milestones.filter(m => m.id !== id);
    this.saveToStorage();
    classSettingsRepositoryClient.updateClassSettings({ milestones: this.milestones } as any).catch(() => {});
  }

  // Class Goals
  public getClassGoals(): ClassGoal[] {
    return [...this.classGoals];
  }

  public addClassGoal(goal: Omit<ClassGoal, 'id'>) {
    const newGoal: ClassGoal = {
      ...goal,
      id: `goal-${Date.now()}`
    };
    this.classGoals.push(newGoal);
    this.saveToStorage();
    classSettingsRepositoryClient.updateClassSettings({ classGoals: this.classGoals } as any).catch(() => {});
  }

  public updateClassGoal(id: string, updates: Partial<ClassGoal>) {
    this.classGoals = this.classGoals.map(g => g.id === id ? { ...g, ...updates } : g);
    this.saveToStorage();
    classSettingsRepositoryClient.updateClassSettings({ classGoals: this.classGoals } as any).catch(() => {});
  }

  public deleteClassGoal(id: string) {
    this.classGoals = this.classGoals.filter(g => g.id !== id);
    this.saveToStorage();
    classSettingsRepositoryClient.updateClassSettings({ classGoals: this.classGoals } as any).catch(() => {});
  }

  // Personal Goals
  public getPersonalGoals(studentId?: string): PersonalGoal[] {
    if (!studentId) return [...this.personalGoals];
    return this.personalGoals.filter(p => p.studentId === studentId);
  }

  public getPersonalGoalsForStudent(studentId: string): PersonalGoal[] {
    return this.getPersonalGoals(studentId);
  }

  public savePersonalGoal(goal: Omit<PersonalGoal, 'id'> & { id?: string }) {
    if (goal.id) {
      this.personalGoals = this.personalGoals.map(p => p.id === goal.id ? { ...p, ...goal } : p);
    } else {
      this.personalGoals.push({
        ...goal,
        id: `pg-${Date.now()}`
      });
    }
    this.saveToStorage();
    classSettingsRepositoryClient.updateClassSettings({ personalGoals: this.personalGoals } as any).catch(() => {});
  }

  public updatePersonalGoal(id: string, updates: Partial<PersonalGoal>) {
    this.personalGoals = this.personalGoals.map(p => p.id === id ? { ...p, ...updates } : p);
    this.saveToStorage();
    classSettingsRepositoryClient.updateClassSettings({ personalGoals: this.personalGoals } as any).catch(() => {});
  }

  public deletePersonalGoal(id: string) {
    this.personalGoals = this.personalGoals.filter(p => p.id !== id);
    this.saveToStorage();
    classSettingsRepositoryClient.updateClassSettings({ personalGoals: this.personalGoals } as any).catch(() => {});
  }

  public addTeacherFeedbackToGoal(goalId: string, feedback: string) {
    this.personalGoals = this.personalGoals.map(p => p.id === goalId ? { ...p, teacherFeedback: feedback } : p);
    this.saveToStorage();
    classSettingsRepositoryClient.updateClassSettings({ personalGoals: this.personalGoals } as any).catch(() => {});
  }

  // Pinned items
  public getPinnedItems(): PinnedItem[] {
    return [...this.pinnedItems].sort((a, b) => {
      const diff = SchoolYearDateNormalizer.parseDateToTimestamp(b.pinnedAt) - SchoolYearDateNormalizer.parseDateToTimestamp(a.pinnedAt);
      if (diff !== 0) return diff;
      return (b.id || '').localeCompare(a.id || '');
    });
  }

  public addPinnedItem(item: Omit<PinnedItem, 'id' | 'pinnedAt'>) {
    const newItem: PinnedItem = {
      ...item,
      id: `pin-${Date.now()}`,
      pinnedAt: new Date().toLocaleDateString('vi-VN')
    };
    this.pinnedItems.unshift(newItem);
    this.saveToStorage();
    classSettingsRepositoryClient.updateClassSettings({ pinnedItems: this.pinnedItems } as any).catch(() => {});
  }

  public removePinnedItem(id: string) {
    this.pinnedItems = this.pinnedItems.filter(p => p.id !== id);
    this.saveToStorage();
    classSettingsRepositoryClient.updateClassSettings({ pinnedItems: this.pinnedItems } as any).catch(() => {});
  }

  // Audit Logs
  public getAuditLogs(): AuditLog[] {
    return [...this.auditLogs];
  }

  public logAudit(action: string, details: string, target: string = 'Hệ thống') {
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      action,
      performedBy: this.settings.teacherName,
      role: 'TEACHER',
      target,
      details,
      timestamp: new Date().toLocaleString('vi-VN')
    };
    this.auditLogs.unshift(newLog);
  }

  public resetToDefault() {
    const defaults = this.getDefaultSettingsForTenant(this.activeTenantId);
    this.settings = { ...defaults };
    this.milestones = this.activeTenantId === 'tenant-lan-nguyen' ? [...initialTimelineMilestones] : [];
    this.classGoals = this.activeTenantId === 'tenant-lan-nguyen' ? [...initialClassGoals] : [];
    this.personalGoals = this.activeTenantId === 'tenant-lan-nguyen' ? [...initialPersonalGoals] : [];
    this.pinnedItems = this.activeTenantId === 'tenant-lan-nguyen' ? [...initialPinnedItems] : [];
    this.saveToStorage();
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notify() {
    this.listeners.forEach(l => {
      try {
        l();
      } catch (err) {
        console.error('ClassService listener error:', err);
      }
    });
  }
}

export const classService = new ClassService();
