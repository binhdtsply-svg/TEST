import { StudentRecord } from '../repositories/StudentRepository';
import { ClassSettingsRecord } from '../repositories/ClassSettingsRepository';
import { credentialRepository } from '../repositories/CredentialRepository';

export interface AuthenticatedUser {
  userId: string;
  role: 'SUPER_ADMIN' | 'TEACHER' | 'CLASS_OFFICER' | 'STUDENT' | 'PARENT';
  tenantId: string;
  teacherId?: string | null;
  studentId?: string | null;
  childStudentId?: string | null;
  officerRoleTitle?: string | null;
}

export function sanitizeStudentRecord(record: StudentRecord, user: AuthenticatedUser): Record<string, unknown> {
  const isTeacher = user.role === 'TEACHER';
  
  // Format attention categories
  let attentionCategories: string[] = [];
  if (record.attention_categories) {
    try {
      attentionCategories = JSON.parse(record.attention_categories);
    } catch {
      attentionCategories = [];
    }
  }

  // Parse raw_metadata if any
  let metadata: Record<string, any> = {};
  if (record.raw_metadata) {
    try {
      metadata = JSON.parse(record.raw_metadata);
    } catch {
      metadata = {};
    }
  }

  // Base public fields
  const baseObject: Record<string, unknown> = {
    id: record.id,
    code: record.code,
    anonymousCode: record.anonymous_code || undefined,
    fullName: record.full_name,
    gender: record.gender,
    dob: record.dob,
    group: record.group_num,
    officerRole: record.officer_role || undefined,
    avatar: record.avatar || '',
    status: record.status,
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };

  const parent = {
    fatherName: record.father_name || '',
    fatherPhone: record.father_phone || '',
    fatherJob: record.father_job || '',
    motherName: record.mother_name || '',
    motherPhone: record.mother_phone || '',
    motherJob: record.mother_job || '',
    address: record.address || '',
    zaloConnected: true
  };

  if (isTeacher) {
    // Full teacher view with credential tokens & parent info
    const studentCred = credentialRepository.findByTenantAndOwner(record.tenant_id, record.id, 'STUDENT');
    const parentCred = credentialRepository.findByTenantAndOwner(record.tenant_id, record.id, 'PARENT');

    const studentToken = studentCred ? studentCred.lookup_identifier : undefined;
    const parentToken = parentCred ? parentCred.lookup_identifier : undefined;
    const tokenStudentStatus = studentCred ? (studentCred.status === 'ACTIVE' ? 'active' : 'revoked') : 'active';
    const tokenParentStatus = parentCred ? (parentCred.status === 'ACTIVE' ? 'active' : 'revoked') : 'active';
    const tokenRevoked = studentCred ? studentCred.status !== 'ACTIVE' : false;

    return {
      ...baseObject,
      parent,
      studentActivationToken: studentToken,
      parentActivationToken: parentToken,
      activationTokenStudent: studentToken,
      activationTokenParent: parentToken,
      tokenStudentStatus,
      tokenParentStatus,
      tokenRevoked,
      anonymousCode: record.anonymous_code || undefined,
      phone: record.phone || undefined,
      email: record.email || undefined,
      address: record.address || undefined,
      fatherName: record.father_name || undefined,
      fatherPhone: record.father_phone || undefined,
      fatherJob: record.father_job || undefined,
      motherName: record.mother_name || undefined,
      motherPhone: record.mother_phone || undefined,
      motherJob: record.mother_job || undefined,
      healthNotes: record.health_notes || undefined,
      talents: record.talents || undefined,
      privateTeacherNotes: record.private_teacher_notes || undefined,
      needsSpecialAttention: Boolean(record.needs_special_attention),
      attentionCategories,
      attentionNote: record.attention_note || undefined,
      supportMeasure: record.support_measure || undefined,
      attentionStatus: record.attention_status || undefined,
      attentionStartedAt: record.attention_started_at || undefined,
      attentionUpdatedAt: record.attention_updated_at || undefined,
      attentionUpdatedBy: record.attention_updated_by || undefined,
      attentionEndedAt: metadata.attentionEndedAt || undefined,
      attentionHistory: Array.isArray(metadata.attentionHistory) ? metadata.attentionHistory : [],
      violationHandlingRecords: Array.isArray(metadata.violationHandlingRecords) ? metadata.violationHandlingRecords : [],
      graduationSummary: metadata.graduationSummary || undefined
    };
  }

  const isOwnChild = user.role === 'PARENT' && user.childStudentId === record.id;
  const isOwnSelf = (user.role === 'STUDENT' || user.role === 'CLASS_OFFICER') && user.studentId === record.id;

  if (isOwnChild || isOwnSelf) {
    // Student own view or Parent own child view (NO teacher private notes or internal flags)
    let safeGradSummary = metadata.graduationSummary ? { ...metadata.graduationSummary } : undefined;
    if (safeGradSummary) {
      delete safeGradSummary.isFlagged;
      delete safeGradSummary.flagReasons;
    }
    return {
      ...baseObject,
      parent,
      phone: record.phone || undefined,
      email: record.email || undefined,
      address: record.address || undefined,
      fatherName: record.father_name || undefined,
      fatherPhone: record.father_phone || undefined,
      fatherJob: record.father_job || undefined,
      motherName: record.mother_name || undefined,
      motherPhone: record.mother_phone || undefined,
      motherJob: record.mother_job || undefined,
      healthNotes: record.health_notes || undefined,
      talents: record.talents || undefined,
      graduationSummary: safeGradSummary
    };
  }

  // Other classmate view (strictly public fields only)
  return baseObject;
}

export function sanitizeClassSettingsRecord(record: ClassSettingsRecord, user: AuthenticatedUser): Record<string, unknown> {
  let theme: unknown = {};
  let subjects: unknown[] = [];
  let interactionSettings: unknown = {};
  let googleIntegration: unknown = {};
  let zaloSettings: unknown = {};
  let aiConfig: unknown = {};
  let schoolYearTimeline: unknown = {};
  let rawMetadata: Record<string, unknown> = {};

  try { theme = JSON.parse(record.theme_json); } catch {}
  try { subjects = JSON.parse(record.subjects_json); } catch {}
  if (record.interaction_settings_json) {
    try { interactionSettings = JSON.parse(record.interaction_settings_json); } catch {}
  }
  if (record.google_integration_json) {
    try { googleIntegration = JSON.parse(record.google_integration_json); } catch {}
  }
  if (record.zalo_settings_json) {
    try { zaloSettings = JSON.parse(record.zalo_settings_json); } catch {}
  }
  if (record.ai_config_json) {
    try { aiConfig = JSON.parse(record.ai_config_json); } catch {}
  }
  if (record.school_year_timeline_json) {
    try { schoolYearTimeline = JSON.parse(record.school_year_timeline_json); } catch {}
  }
  if (record.raw_metadata) {
    try { rawMetadata = JSON.parse(record.raw_metadata); } catch {}
  }

  const isTeacher = user.role === 'TEACHER' || user.role === 'SUPER_ADMIN';

  const baseSettings: Record<string, unknown> = {
    ...rawMetadata,
    id: record.class_id,
    classId: record.class_id,
    workspaceId: record.tenant_id,
    organizationId: record.tenant_id,
    schoolName: record.school_name,
    className: record.class_name,
    name: record.class_name,
    grade: record.grade,
    stream: record.stream,
    gradeLevel: record.grade ? record.grade.replace(/[^0-9]/g, '') : '',
    classTrack: record.stream ? (record.stream.includes('KHTN') ? 'KHTN' : (record.stream.includes('KHXH') ? 'KHXH' : record.stream)) : 'KHTN',
    educationTrack: (rawMetadata.educationTrack as string) || `${record.grade} - ${record.stream}`,
    academicYear: record.academic_year,
    schoolYearLabel: record.academic_year,
    semester: record.semester,
    currentSemester: (record.semester === 'HK1' || record.semester === 'Học kỳ I') ? 'Học kỳ I' : ((record.semester === 'HK2' || record.semester === 'Học kỳ II') ? 'Học kỳ II' : record.semester),
    teacherName: record.teacher_name,
    homeroomTeacherName: record.teacher_name,
    teacherPhone: record.teacher_phone,
    teacherEmail: record.teacher_email,
    slogan: record.slogan || '',
    coverImage: record.cover_image || '',
    totalStudents: record.total_students,
    studentIdentityMode: record.student_identity_mode || 'IDENTIFIED',
    theme,
    subjects,
    interactionSettings,
    schoolYearTimeline,
    violationWarningThreshold: typeof rawMetadata.violationWarningThreshold === 'number' ? rawMetadata.violationWarningThreshold : 2,
    updatedAt: record.updated_at
  };

  if (isTeacher) {
    return {
      ...baseSettings,
      googleIntegration,
      zaloSettings,
      aiConfig
    };
  }

  // Student/Parent view: hide sensitive third-party integration keys or ai api keys
  return baseSettings;
}
