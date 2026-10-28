import { getDatabase } from './database';
import { tenantRepository } from '../repositories/TenantRepository';
import { teacherAccountRepository } from '../repositories/TeacherAccountRepository';
import { credentialRepository } from '../repositories/CredentialRepository';
import { studentRepository, StudentRecord } from '../repositories/StudentRepository';
import { classSettingsRepository, ClassSettingsRecord } from '../repositories/ClassSettingsRepository';
import { backupRepository } from '../repositories/BackupRepository';
import { surveyRepository } from '../repositories/SurveyRepository';
import { academicRepository } from '../repositories/AcademicRepository';
import { timetableRepository } from '../repositories/TimetableRepository';
import { trainingRepository } from '../repositories/TrainingRepository';
import { graduationRepository } from '../repositories/GraduationRepository';
import { careerRepository } from '../repositories/CareerRepository';
import { parentCommunicationRepository } from '../repositories/ParentCommunicationRepository';
import { notificationRepository } from '../repositories/NotificationRepository';
import { postRepository } from '../repositories/PostRepository';
import {
  initialStudents,
  initialClassSettings,
  initialTeacher2Students,
  initialTeacher2ClassSettings,
  initialSubjects,
  initialLaurelTrees,
  initialAcademicRecords,
  initialTimetable,
  initialPosts
} from '../../src/data/demoData';

export function seedInitialData() {
  // 1. Seed Tenants (Idempotent - never overwrite existing tenant)
  if (!tenantRepository.getById('platform-root')) {
    tenantRepository.createOrUpdate({
      id: 'platform-root',
      name: 'Không Gian Chủ Nhiệm - Nền Tảng',
      school_name: 'Hệ Thống Không Gian Chủ Nhiệm Số',
      owner_id: 'usr_sa_google_official',
      owner_email: 'binhdtsply@gmail.com',
      owner_name: 'Nguyễn Đức Bình (Super Admin)',
      plan: 'ENTERPRISE',
      status: 'ACTIVE',
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z'
    });
  }

  if (!tenantRepository.getById('tenant-lan-nguyen')) {
    tenantRepository.createOrUpdate({
      id: 'tenant-lan-nguyen',
      name: 'Không Gian Chủ Nhiệm - Cô Mai Lan',
      school_name: 'THPT Chuyên Lê Hồng Phong',
      owner_id: 'teacher-lan-nguyen',
      owner_email: 'mailan.nguyen@lehongphong.edu.vn',
      owner_name: 'Cô Nguyễn Thị Mai Lan',
      plan: 'PRO',
      status: 'ACTIVE',
      created_at: '2025-08-15T08:00:00.000Z',
      updated_at: '2025-08-15T08:00:00.000Z'
    });
  }

  if (!tenantRepository.getById('tenant-hoang-nam')) {
    tenantRepository.createOrUpdate({
      id: 'tenant-hoang-nam',
      name: 'Không Gian Chủ Nhiệm - Thầy Hoàng Nam',
      school_name: 'THPT Chuyên Nguyễn Huệ',
      owner_id: 'teacher-hoang-nam',
      owner_email: 'hoangnam.tran@nguyenhue.edu.vn',
      owner_name: 'Thầy Trần Hoàng Nam',
      plan: 'PRO',
      status: 'ACTIVE',
      created_at: '2025-08-20T08:00:00.000Z',
      updated_at: '2025-08-20T08:00:00.000Z'
    });
  }

  if (!tenantRepository.getById('tenant-co-binh-mv5brvta')) {
    tenantRepository.createOrUpdate({
      id: 'tenant-co-binh-mv5brvta',
      name: 'Không Gian Chủ Nhiệm - Cô Bình',
      school_name: 'Trường THPT',
      owner_id: 'tch-mv5brvta',
      owner_email: 'binhdtsply@gmail.com',
      owner_name: 'Cô Bình',
      plan: 'PRO',
      status: 'ACTIVE',
      created_at: '2026-10-12T14:06:10.126Z',
      updated_at: '2026-10-12T14:06:10.126Z'
    });
  }

  // 2. Seed Teacher Accounts (Idempotent - never overwrite existing teacher account)
  if (!teacherAccountRepository.getByTeacherId('teacher-lan-nguyen')) {
    teacherAccountRepository.createOrUpdate({
      id: 'acc-lan-nguyen',
      teacher_id: 'teacher-lan-nguyen',
      tenant_id: 'tenant-lan-nguyen',
      full_name: 'Cô Nguyễn Thị Mai Lan',
      email: 'mailan.nguyen@lehongphong.edu.vn',
      phone: '0912 345 678',
      login_method: 'BOTH',
      status: 'ACTIVE',
      credential_version: 1,
      created_at: '2025-08-15T08:00:00.000Z',
      updated_at: '2025-08-15T08:00:00.000Z'
    });
  }

  if (!teacherAccountRepository.getByTeacherId('teacher-hoang-nam')) {
    teacherAccountRepository.createOrUpdate({
      id: 'acc-hoang-nam',
      teacher_id: 'teacher-hoang-nam',
      tenant_id: 'tenant-hoang-nam',
      full_name: 'Thầy Trần Hoàng Nam',
      email: 'hoangnam.tran@nguyenhue.edu.vn',
      phone: '0988 777 666',
      login_method: 'BOTH',
      status: 'ACTIVE',
      credential_version: 1,
      created_at: '2025-08-20T08:00:00.000Z',
      updated_at: '2025-08-20T08:00:00.000Z'
    });
  }

  if (!teacherAccountRepository.getByTeacherId('tch-mv5brvta')) {
    teacherAccountRepository.createOrUpdate({
      id: 'tch-mv5brvta',
      teacher_id: 'tch-mv5brvta',
      tenant_id: 'tenant-co-binh-mv5brvta',
      full_name: 'Cô Bình',
      email: 'binhdtsply@gmail.com',
      phone: '0912 987 654',
      login_method: 'BOTH',
      status: 'ACTIVE',
      credential_version: 1,
      created_at: '2026-10-12T14:06:10.126Z',
      updated_at: '2026-10-12T14:08:56.644Z'
    });
  }

  // 3. Seed Credentials (Idempotent - never regenerate or overwrite existing credentials)
  if (!credentialRepository.findByTenantAndOwner('platform-root', 'super-admin-dev', 'TEACHER')) {
    credentialRepository.saveCredential({
      type: 'TEACHER',
      tenant_id: 'platform-root',
      owner_id: 'super-admin-dev',
      raw_code: 'ADM-MASTER-2025',
      is_test_credential: true,
      created_by: 'system_bootstrap'
    });
  }

  if (!credentialRepository.findByTenantAndOwner('tenant-lan-nguyen', 'teacher-lan-nguyen', 'TEACHER')) {
    credentialRepository.saveCredential({
      type: 'TEACHER',
      tenant_id: 'tenant-lan-nguyen',
      owner_id: 'teacher-lan-nguyen',
      raw_code: 'ACT-ML-2025-LHP',
      is_test_credential: true,
      created_by: 'system_bootstrap'
    });
  }

  if (!credentialRepository.findByTenantAndOwner('tenant-hoang-nam', 'teacher-hoang-nam', 'TEACHER')) {
    credentialRepository.saveCredential({
      type: 'TEACHER',
      tenant_id: 'tenant-hoang-nam',
      owner_id: 'teacher-hoang-nam',
      raw_code: 'ACT-HN-2025-NH',
      is_test_credential: true,
      created_by: 'system_bootstrap'
    });
  }

  if (!credentialRepository.findByTenantAndOwner('tenant-co-binh-mv5brvta', 'tch-mv5brvta', 'TEACHER')) {
    credentialRepository.saveCredential({
      type: 'TEACHER',
      tenant_id: 'tenant-co-binh-mv5brvta',
      owner_id: 'tch-mv5brvta',
      raw_code: 'ACT-CB-MV5BRVTA',
      is_test_credential: true,
      created_by: 'system_bootstrap'
    });
  }

  if (!credentialRepository.findByTenantAndOwner('tenant-lan-nguyen', 'hs-01', 'STUDENT')) {
    credentialRepository.saveCredential({
      type: 'STUDENT',
      tenant_id: 'tenant-lan-nguyen',
      owner_id: 'hs-01',
      raw_code: 'STU-GH982-11A1',
      is_officer: true,
      officer_role_title: 'Lớp trưởng',
      is_test_credential: true,
      created_by: 'system_bootstrap'
    });
  }

  if (!credentialRepository.findByTenantAndOwner('tenant-lan-nguyen', 'hs-01', 'PARENT')) {
    credentialRepository.saveCredential({
      type: 'PARENT',
      tenant_id: 'tenant-lan-nguyen',
      owner_id: 'hs-01',
      raw_code: 'PAR-GH982-11A1',
      is_test_credential: true,
      created_by: 'system_bootstrap'
    });
  }

  // 4. PHASE B: Seed Students & ClassSettings for Tenant Lan Nguyen (11A1)
  if (!classSettingsRepository.getByTenantAndClass('tenant-lan-nguyen')) {
    const classSettings11A1: ClassSettingsRecord = {
      tenant_id: 'tenant-lan-nguyen',
      class_id: initialClassSettings.id || 'class-11a1-2025',
      school_name: initialClassSettings.schoolName,
      class_name: initialClassSettings.className,
      grade: initialClassSettings.grade,
      stream: initialClassSettings.stream,
      academic_year: initialClassSettings.academicYear,
      semester: initialClassSettings.semester,
      teacher_name: initialClassSettings.teacherName,
      teacher_phone: initialClassSettings.teacherPhone,
      teacher_email: initialClassSettings.teacherEmail,
      slogan: initialClassSettings.slogan || null,
      cover_image: initialClassSettings.coverImage || null,
      total_students: initialStudents.length,
      theme_json: JSON.stringify(initialClassSettings.theme || { primaryColor: '#0D9488', fontFamily: 'Inter' }),
      subjects_json: JSON.stringify(initialClassSettings.subjects || initialSubjects),
      interaction_settings_json: JSON.stringify(initialClassSettings.interactionSettings || null),
      google_integration_json: JSON.stringify(initialClassSettings.googleIntegration || null),
      zalo_settings_json: JSON.stringify(initialClassSettings.zaloSettings || null),
      ai_config_json: JSON.stringify(initialClassSettings.aiConfig || null),
      school_year_timeline_json: JSON.stringify(initialClassSettings.schoolYearTimeline || null),
      raw_metadata: null,
      created_at: '2025-08-15T08:00:00.000Z',
      updated_at: '2025-08-15T08:00:00.000Z'
    };
    classSettingsRepository.upsert(classSettings11A1);
  }

  // 4. Seed 14 students for 11A1 (idempotent, only insert if not already present)
  for (const s of initialStudents) {
    if (!studentRepository.getById('tenant-lan-nguyen', s.id)) {
      const isOfficer = Boolean(s.officerRole && s.officerRole !== 'Thành viên');
      const studentRecord: StudentRecord = {
        id: s.id,
        tenant_id: 'tenant-lan-nguyen',
        class_id: 'class-11a1-2025',
        code: s.code,
        full_name: s.fullName,
        gender: s.gender === 'Nữ' ? 'Nữ' : 'Nam',
        dob: s.dob,
        group_num: s.group || 1,
        officer_role: s.officerRole || null,
        avatar: s.avatar || null,
        phone: s.phone || null,
        email: s.email || null,
        address: s.address || s.parent?.address || null,
        father_name: s.fatherName || s.parent?.fatherName || null,
        father_phone: s.fatherPhone || s.parent?.fatherPhone || null,
        father_job: s.fatherJob || s.parent?.fatherJob || null,
        mother_name: s.motherName || s.parent?.motherName || null,
        mother_phone: s.motherPhone || s.parent?.motherPhone || null,
        mother_job: s.motherJob || s.parent?.motherJob || null,
        health_notes: s.healthNotes || null,
        talents: s.talents || null,
        private_teacher_notes: s.privateTeacherNotes || null,
        needs_special_attention: s.needsSpecialAttention ? 1 : 0,
        attention_categories: s.attentionCategories ? JSON.stringify(s.attentionCategories) : null,
        attention_note: s.attentionNote || null,
        support_measure: s.supportMeasure || null,
        attention_status: s.attentionStatus || 'monitoring',
        attention_started_at: s.attentionStartedAt || null,
        attention_updated_at: s.attentionUpdatedAt || null,
        attention_updated_by: s.attentionUpdatedBy || null,
        status: s.status || 'Đang học',
        raw_metadata: null,
        created_at: '2025-08-15T08:00:00.000Z',
        updated_at: '2025-08-15T08:00:00.000Z'
      };
      studentRepository.upsert(studentRecord);

      const stuToken = s.studentActivationToken || `STU-${s.code}`;
      const parToken = s.parentActivationToken || `PAR-${s.code}`;

      credentialRepository.saveCredential({
        type: 'STUDENT',
        tenant_id: 'tenant-lan-nguyen',
        owner_id: s.id,
        raw_code: stuToken,
        is_officer: isOfficer,
        officer_role_title: isOfficer ? s.officerRole : undefined,
        is_test_credential: true,
        created_by: 'teacher-lan-nguyen'
      });

      credentialRepository.saveCredential({
        type: 'PARENT',
        tenant_id: 'tenant-lan-nguyen',
        owner_id: s.id,
        raw_code: parToken,
        is_test_credential: true,
        created_by: 'teacher-lan-nguyen'
      });

      if (s.id === 'hs-01') {
        credentialRepository.saveCredential({
          type: 'STUDENT',
          tenant_id: 'tenant-lan-nguyen',
          owner_id: 'hs-01',
          raw_code: 'STU-GH982-11A1',
          is_officer: isOfficer,
          officer_role_title: isOfficer ? s.officerRole : undefined,
          is_test_credential: true,
          created_by: 'teacher-lan-nguyen'
        });

        credentialRepository.saveCredential({
          type: 'PARENT',
          tenant_id: 'tenant-lan-nguyen',
          owner_id: 'hs-01',
          raw_code: 'PAR-GH982-11A1',
          is_test_credential: true,
          created_by: 'teacher-lan-nguyen'
        });
      }
    }
  }

  // 5. PHASE B: Seed Students & ClassSettings for Tenant Hoang Nam (12A2)
  if (!classSettingsRepository.getByTenantAndClass('tenant-hoang-nam')) {
    const classSettings12A2: ClassSettingsRecord = {
      tenant_id: 'tenant-hoang-nam',
      class_id: initialTeacher2ClassSettings.id || 'class-12a2-2025',
      school_name: initialTeacher2ClassSettings.schoolName,
      class_name: initialTeacher2ClassSettings.className,
      grade: initialTeacher2ClassSettings.grade,
      stream: initialTeacher2ClassSettings.stream,
      academic_year: initialTeacher2ClassSettings.academicYear,
      semester: initialTeacher2ClassSettings.semester,
      teacher_name: initialTeacher2ClassSettings.teacherName,
      teacher_phone: initialTeacher2ClassSettings.teacherPhone,
      teacher_email: initialTeacher2ClassSettings.teacherEmail,
      slogan: initialTeacher2ClassSettings.slogan || null,
      cover_image: initialTeacher2ClassSettings.coverImage || null,
      total_students: initialTeacher2Students.length,
      theme_json: JSON.stringify(initialTeacher2ClassSettings.theme || { primaryColor: '#2563EB', fontFamily: 'Inter' }),
      subjects_json: JSON.stringify(initialTeacher2ClassSettings.subjects || initialSubjects),
      interaction_settings_json: JSON.stringify(initialTeacher2ClassSettings.interactionSettings || null),
      google_integration_json: JSON.stringify(initialTeacher2ClassSettings.googleIntegration || null),
      zalo_settings_json: JSON.stringify(initialTeacher2ClassSettings.zaloSettings || null),
      ai_config_json: JSON.stringify(initialTeacher2ClassSettings.aiConfig || null),
      school_year_timeline_json: JSON.stringify(initialTeacher2ClassSettings.schoolYearTimeline || null),
      raw_metadata: null,
      created_at: '2025-08-20T08:00:00.000Z',
      updated_at: '2025-08-20T08:00:00.000Z'
    };
    classSettingsRepository.upsert(classSettings12A2);
  }

  for (const s of initialTeacher2Students) {
    if (!studentRepository.getById('tenant-hoang-nam', s.id)) {
      const isOfficer = Boolean(s.officerRole && s.officerRole !== 'Thành viên');
      const studentRecord: StudentRecord = {
        id: s.id,
        tenant_id: 'tenant-hoang-nam',
        class_id: 'class-12a2-2025',
        code: s.code,
        full_name: s.fullName,
        gender: s.gender === 'Nữ' ? 'Nữ' : 'Nam',
        dob: s.dob,
        group_num: s.group || 1,
        officer_role: s.officerRole || null,
        avatar: s.avatar || null,
        phone: s.phone || null,
        email: s.email || null,
        address: s.address || s.parent?.address || null,
        father_name: s.fatherName || s.parent?.fatherName || null,
        father_phone: s.fatherPhone || s.parent?.fatherPhone || null,
        father_job: s.fatherJob || s.parent?.fatherJob || null,
        mother_name: s.motherName || s.parent?.motherName || null,
        mother_phone: s.motherPhone || s.parent?.motherPhone || null,
        mother_job: s.motherJob || s.parent?.motherJob || null,
        health_notes: s.healthNotes || null,
        talents: s.talents || null,
        private_teacher_notes: s.privateTeacherNotes || null,
        needs_special_attention: s.needsSpecialAttention ? 1 : 0,
        attention_categories: s.attentionCategories ? JSON.stringify(s.attentionCategories) : null,
        attention_note: s.attentionNote || null,
        support_measure: s.supportMeasure || null,
        attention_status: s.attentionStatus || 'monitoring',
        attention_started_at: s.attentionStartedAt || null,
        attention_updated_at: s.attentionUpdatedAt || null,
        attention_updated_by: s.attentionUpdatedBy || null,
        status: s.status || 'Đang học',
        raw_metadata: null,
        created_at: '2025-08-20T08:00:00.000Z',
        updated_at: '2025-08-20T08:00:00.000Z'
      };
      studentRepository.upsert(studentRecord);

      const stuToken = s.studentActivationToken || `STU-${s.code}`;
      const parToken = s.parentActivationToken || `PAR-${s.code}`;

      credentialRepository.saveCredential({
        type: 'STUDENT',
        tenant_id: 'tenant-hoang-nam',
        owner_id: s.id,
        raw_code: stuToken,
        is_officer: isOfficer,
        officer_role_title: isOfficer ? s.officerRole : undefined,
        is_test_credential: true,
        created_by: 'teacher-hoang-nam'
      });

      credentialRepository.saveCredential({
        type: 'PARENT',
        tenant_id: 'tenant-hoang-nam',
        owner_id: s.id,
        raw_code: parToken,
        is_test_credential: true,
        created_by: 'teacher-hoang-nam'
      });
    }
  }

  const rawDb = getDatabase();

  // 6. PHASE C: Seed Survey Template & Responses (Idempotent: never overwrite existing records)
  const defaultSurveySections = [
    {
      id: 'sec_personal',
      title: 'Thông tin cá nhân & Liên lạc',
      questions: [
        { id: 'q_nickname', type: 'text', label: 'Biệt danh / Tên thường gọi', syncTarget: 'nickname', syncCategory: 'AUTO_SYNC' },
        { id: 'q_talents', type: 'text', label: 'Sở thích & Năng khiếu đặc biệt', syncTarget: 'talents', syncCategory: 'REVIEW_REQUIRED' }
      ]
    },
    {
      id: 'sec_sensitive',
      title: 'Chia sẻ riêng với Giáo viên chủ nhiệm (Bảo mật GVCN)',
      questions: [
        { id: 'q_health', type: 'text', label: 'Tình trạng sức khỏe cần lưu ý', syncTarget: 'healthNotes', syncCategory: 'TEACHER_ONLY' },
        { id: 'q_private_note', type: 'textarea', label: 'Tâm tư / Nguyện vọng kín', syncTarget: 'privateNotes', syncCategory: 'TEACHER_ONLY' }
      ]
    }
  ];

  const existingSurveyTpl = rawDb.prepare('SELECT 1 FROM survey_templates WHERE tenant_id = ? AND id = ?').get('tenant-lan-nguyen', 'survey-dau-nam-2025');
  if (!existingSurveyTpl) {
    surveyRepository.upsertTemplate({
      id: 'survey-dau-nam-2025',
      tenant_id: 'tenant-lan-nguyen',
      title: 'Khảo sát Đặc điểm Học sinh Đầu năm học 2025 - 2026',
      description: 'Thu thập thông tin tâm lý, nguyện vọng và đặc điểm cá nhân đầu năm học.',
      target_type: 'STUDENT',
      academic_year: '2025 - 2026',
      semester: 'Học kỳ I',
      current_version: 1,
      status: 'PUBLISHED',
      is_default: 1,
      sections_json: JSON.stringify(defaultSurveySections)
    });
  }

  // Seed sample response for hs-01 only if not existing
  const existingSurveyResp = rawDb.prepare('SELECT 1 FROM survey_responses WHERE tenant_id = ? AND id = ?').get('tenant-lan-nguyen', 'resp_hs-01_survey-dau-nam-2025');
  if (!existingSurveyResp) {
    surveyRepository.upsertResponse({
      id: 'resp_hs-01_survey-dau-nam-2025',
      tenant_id: 'tenant-lan-nguyen',
      template_id: 'survey-dau-nam-2025',
      template_version: 1,
      student_id: 'hs-01',
      status: 'SUBMITTED',
      raw_answers_json: JSON.stringify({
        q_nickname: 'Huy Coder',
        q_talents: 'Lập trình Web, Thuyết trình Tiếng Anh'
      }),
      sensitive_answers_json: JSON.stringify({
        q_health: 'Cận thị 2.5 độ, cần ngồi 3 bàn đầu',
        q_private_note: 'Em muốn tham gia đội tuyển HSG Tin học cấp trường'
      }),
      submitted_at: '2025-09-05T10:30:00.000Z'
    });
  }

  // 7. PHASE D: Seed Academic Records & Timetable (Idempotent)
  for (const [studentId, recordItem] of Object.entries(initialAcademicRecords)) {
    const acadId = `acad_${studentId}_2025_HK1`;
    const existingAcad = rawDb.prepare('SELECT 1 FROM academic_records WHERE tenant_id = ? AND id = ?').get('tenant-lan-nguyen', acadId);
    if (!existingAcad) {
      const record = recordItem as any;
      academicRepository.upsert({
        id: acadId,
        tenant_id: 'tenant-lan-nguyen',
        student_id: studentId,
        academic_year: '2025 - 2026',
        semester: 'Học kỳ I',
        scores_json: JSON.stringify(record.grades || []),
        conduct_score: 95,
        conduct_evaluation: 'Tốt',
        academic_rank: 'Giỏi',
        gpa: 9.2,
        attendance_summary_json: JSON.stringify({ present: 88, excused: 1, unexcused: 0 }),
        teacher_evaluation: record.teacherComment || ''
      });
    }
  }

  // Seed Timetable only if not existing
  const existingTimetable = rawDb.prepare(
    'SELECT 1 FROM timetables WHERE tenant_id = ? AND class_id = ? AND academic_year = ? AND semester = ?'
  ).get('tenant-lan-nguyen', 'class-11a1-2025', '2025 - 2026', 'Học kỳ I');
  if (!existingTimetable) {
    timetableRepository.saveTimetable({
      tenant_id: 'tenant-lan-nguyen',
      class_id: 'class-11a1-2025',
      academic_year: '2025 - 2026',
      semester: 'Học kỳ I',
      schedule_grid_json: JSON.stringify(initialTimetable.schedule || []),
      updated_at: '2025-09-15T08:00:00.000Z',
      updated_by: 'teacher-lan-nguyen'
    });
  }

  // Seed published academic snapshot only if not existing
  const existingSnap = rawDb.prepare('SELECT 1 FROM published_academic_snapshots WHERE id = ?').get('snap_hk1_midterm_2025');
  if (!existingSnap) {
    academicRepository.publishSnapshot({
      id: 'snap_hk1_midterm_2025',
      tenant_id: 'tenant-lan-nguyen',
      academic_year: '2025 - 2026',
      semester: 'Học kỳ I',
      period_label: 'Bảng điểm Giữa Học kỳ I',
      published_at: '2025-11-15T10:00:00.000Z',
      published_by: 'teacher-lan-nguyen',
      snapshot_data_json: JSON.stringify(initialAcademicRecords),
      status: 'PUBLISHED'
    });
  }

  // 8. PHASE E: Seed Training & Laurel Tree & Graduation & Career (Idempotent)
  for (const tree of initialLaurelTrees) {
    const existingTree = rawDb.prepare('SELECT 1 FROM laurel_trees WHERE tenant_id = ? AND student_id = ?').get('tenant-lan-nguyen', tree.studentId);
    if (!existingTree) {
      trainingRepository.saveLaurelTree({
        tenant_id: 'tenant-lan-nguyen',
        student_id: tree.studentId,
        total_points: tree.currentPoints,
        current_rank_level: tree.completedTrees + 1,
        badges_json: JSON.stringify(['Gương mẫu', 'Tiến bộ']),
        updated_at: '2025-10-01T08:00:00.000Z'
      });
    }

    const txId = `tx_${tree.studentId}_init`;
    const existingTx = rawDb.prepare('SELECT 1 FROM training_transactions WHERE tenant_id = ? AND id = ?').get('tenant-lan-nguyen', txId);
    if (!existingTx) {
      trainingRepository.upsertTransaction({
        id: txId,
        tenant_id: 'tenant-lan-nguyen',
        student_id: tree.studentId,
        rule_id: 'rule_1',
        category: 'Học tập',
        title: 'Đạt điểm 10 kiểm tra 15 phút môn Toán',
        points: 10,
        description: 'Làm bài xuất sắc, trình bày mạch lạc',
        status: 'APPROVED',
        created_by_role: 'TEACHER',
        created_by_user_id: 'teacher-lan-nguyen',
        approved_by: 'teacher-lan-nguyen',
        approved_at: '2025-09-20T08:00:00.000Z',
        created_at: '2025-09-20T08:00:00.000Z'
      });
    }
  }

  // Tab Thi tốt nghiệp THPT: Không tự tạo bản ghi mẫu khi seed; hiển thị trạng thái trống cho tới khi người dùng chủ động tạo và lưu.

  // Seed Career Holland Profile for hs-01 only if not existing
  const existingCareer = rawDb.prepare('SELECT 1 FROM career_profiles WHERE tenant_id = ? AND id = ?').get('tenant-lan-nguyen', 'career_hs-01');
  if (!existingCareer) {
    careerRepository.upsert({
      id: 'career_hs-01',
      tenant_id: 'tenant-lan-nguyen',
      student_id: 'hs-01',
      riasec_scores_json: JSON.stringify({ R: 75, I: 95, A: 60, S: 45, E: 55, C: 80 }),
      primary_traits_json: JSON.stringify(['Nghiên cứu (Investigative)', 'Quy củ (Conventional)']),
      recommended_careers_json: JSON.stringify(['Kỹ sư Phần mềm', 'Chuyên gia Trí tuệ Nhân tạo', 'Nhà phân tích dữ liệu']),
      student_aspirations: 'Muốn nghiên cứu chuyên sâu về AI và xây dựng hệ thống phần mềm lớn.',
      holland_history_json: JSON.stringify([
        { testedAt: '2025-09-12T09:00:00.000Z', primary: 'Investigative' }
      ])
    });
  }

  // 9. PHASE F: Seed Parent Communication & Notifications (Idempotent)
  const existingConv = rawDb.prepare('SELECT 1 FROM parent_conversations WHERE tenant_id = ? AND id = ?').get('tenant-lan-nguyen', 'conv_hs-01');
  if (!existingConv) {
    parentCommunicationRepository.upsertConversation({
      id: 'conv_hs-01',
      tenant_id: 'tenant-lan-nguyen',
      student_id: 'hs-01',
      parent_name: 'Bác Nguyễn Gia Hùng',
      parent_phone: '0903 123 456',
      topic: 'Trao đổi về việc tham gia đội tuyển HSG Tin học',
      messages_json: JSON.stringify([
        {
          id: 'msg_1',
          senderRole: 'PARENT',
          senderName: 'Bác Nguyễn Gia Hùng',
          content: 'Chào cô Lan, gia đình hoàn toàn ủng hộ cháu Huy tham gia đội tuyển HSG Tin học ạ.',
          sentAt: '2025-09-25T14:20:00.000Z'
        },
        {
          id: 'msg_2',
          senderRole: 'TEACHER',
          senderName: 'Cô Nguyễn Thị Mai Lan (GVCN)',
          content: 'Dạ chào anh Hùng, cảm ơn gia đình đã tạo điều kiện. Cô sẽ theo sát và hỗ trợ em Huy ôn tập tốt nhất.',
          sentAt: '2025-09-25T15:00:00.000Z'
        }
      ]),
      last_message_at: '2025-09-25T15:00:00.000Z',
      unread_teacher: 0,
      unread_parent: 0,
      created_at: '2025-09-25T14:20:00.000Z',
      updated_at: '2025-09-25T15:00:00.000Z'
    });
  }

  const existingNotif = rawDb.prepare('SELECT 1 FROM notifications WHERE tenant_id = ? AND id = ?').get('tenant-lan-nguyen', 'notif_welcome_teacher');
  if (!existingNotif) {
    notificationRepository.create({
      id: 'notif_welcome_teacher',
      tenant_id: 'tenant-lan-nguyen',
      user_id: 'teacher-lan-nguyen',
      role: 'TEACHER',
      type: 'SYSTEM',
      title: 'Chào mừng đến với Không Gian Chủ Nhiệm Số',
      message: 'Dữ liệu lớp 11A1 đã sẵn sàng và được đồng bộ bảo mật trên máy chủ.',
      link_to: '/dashboard',
      is_read: 0,
      created_at: '2025-08-15T08:00:00.000Z'
    });
  }

  // Seed Initial Classroom Feed Posts only if not existing
  if (Array.isArray(initialPosts)) {
    for (const post of initialPosts) {
      const tId = post.tenantId || 'tenant-lan-nguyen';
      const existingPost = rawDb.prepare('SELECT 1 FROM posts WHERE tenant_id = ? AND id = ?').get(tId, post.id);
      if (!existingPost) {
        postRepository.upsertPost({
          id: post.id,
          tenant_id: tId,
          author_id: post.authorId || 'teacher-lan-nguyen',
          author_name: post.authorName || 'Cô Nguyễn Thị Mai Lan (GVCN)',
          author_role: post.authorRole || 'TEACHER',
          author_avatar: post.authorAvatar || null,
          category: post.category || 'Thông báo',
          title: post.title,
          content: post.content,
          images_json: JSON.stringify(post.images || []),
          attachments_json: JSON.stringify((post as any).attachments || []),
          pinned_to_overview: post.pinnedToOverview || post.isPinned ? 1 : 0,
          parent_visible: post.parentVisible ? 1 : 0,
          reactions_json: JSON.stringify(post.reactions || { like: [], love: [], applause: [], celebrate: [], idea: [] }),
          comments_json: JSON.stringify(post.comments || []),
          created_at: post.createdAt || '2025-11-12T08:00:00.000Z',
          updated_at: post.updatedAt || '2025-11-12T08:00:00.000Z'
        });
      }
    }
  }

  // 10. Record Master Pre-Migration Backups only if not already recorded
  const existingBackupLan = rawDb.prepare('SELECT 1 FROM server_backups WHERE tenant_id = ? AND backup_type = ? LIMIT 1').get('tenant-lan-nguyen', 'MASTER_MIGRATION_BACKUP_ALL_PHASES');
  if (!existingBackupLan) {
    backupRepository.createBackup({
      tenantId: 'tenant-lan-nguyen',
      backupType: 'MASTER_MIGRATION_BACKUP_ALL_PHASES',
      migrationVersion: 'master_release_v1',
      recordCounts: {
        students: initialStudents.length,
        classSettings: 1,
        surveys: 1,
        academic: Object.keys(initialAcademicRecords).length,
        laurelTrees: initialLaurelTrees.length,
        parentConversations: 1
      },
      dataPayload: {
        students: initialStudents,
        classSettings: initialClassSettings,
        academic: initialAcademicRecords
      },
      createdBy: 'system_bootstrap'
    });
  }

  const existingBackupNam = rawDb.prepare('SELECT 1 FROM server_backups WHERE tenant_id = ? AND backup_type = ? LIMIT 1').get('tenant-hoang-nam', 'MASTER_MIGRATION_BACKUP_ALL_PHASES');
  if (!existingBackupNam) {
    backupRepository.createBackup({
      tenantId: 'tenant-hoang-nam',
      backupType: 'MASTER_MIGRATION_BACKUP_ALL_PHASES',
      migrationVersion: 'master_release_v1',
      recordCounts: {
        students: initialTeacher2Students.length,
        classSettings: 1
      },
      dataPayload: {
        students: initialTeacher2Students,
        classSettings: initialTeacher2ClassSettings
      },
      createdBy: 'system_bootstrap'
    });
  }
}

