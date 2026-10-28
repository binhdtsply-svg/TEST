import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

let dbInstance: DatabaseSync | null = null;

export function getDatabase(): DatabaseSync {
  if (dbInstance) {
    return dbInstance;
  }

  const dbDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const dbPath = process.env.NODE_ENV === 'test' 
    ? ':memory:' 
    : path.join(dbDir, 'kgcns_master.db');

  dbInstance = new DatabaseSync(dbPath);

  // Enable foreign keys, WAL mode, and busy timeout for concurrent safety
  dbInstance.exec('PRAGMA foreign_keys = ON;');
  dbInstance.exec('PRAGMA busy_timeout = 10000;');
  if (dbPath !== ':memory:') {
    dbInstance.exec('PRAGMA journal_mode = WAL;');
  }

  initializeSchema(dbInstance);
  return dbInstance;
}

export const getDb = getDatabase;


function initializeSchema(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      school_name TEXT NOT NULL,
      owner_id TEXT,
      owner_email TEXT,
      owner_name TEXT,
      plan TEXT NOT NULL DEFAULT 'PRO',
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS teacher_accounts (
      id TEXT PRIMARY KEY,
      teacher_id TEXT NOT NULL UNIQUE,
      tenant_id TEXT NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      google_sub TEXT,
      google_email TEXT,
      login_method TEXT NOT NULL DEFAULT 'ACCESS_CODE',
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      credential_version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS credentials (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL, /* 'TEACHER' | 'STUDENT' | 'PARENT' */
      tenant_id TEXT NOT NULL,
      owner_id TEXT NOT NULL, /* teacher_id, student_id, or child_student_id */
      lookup_identifier TEXT NOT NULL UNIQUE, /* Normalized access code for lookup index */
      secret_hash TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE', /* 'ACTIVE' | 'LOCKED' | 'REVOKED' */
      credential_version INTEGER NOT NULL DEFAULT 1,
      is_officer INTEGER NOT NULL DEFAULT 0,
      officer_role_title TEXT,
      is_test_credential INTEGER NOT NULL DEFAULT 0,
      password_hash TEXT,
      password_updated_at TEXT,
      last_issued_at TEXT,
      created_at TEXT NOT NULL,
      created_by TEXT,
      last_login_at TEXT,
      locked_at TEXT,
      locked_by TEXT,
      revoked_at TEXT,
      revoked_by TEXT,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_credentials_lookup ON credentials(lookup_identifier);
    CREATE INDEX IF NOT EXISTS idx_credentials_tenant_owner ON credentials(tenant_id, owner_id);

    CREATE TABLE IF NOT EXISTS credential_audits (
      id TEXT PRIMARY KEY,
      credential_id TEXT,
      tenant_id TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      role TEXT NOT NULL,
      action TEXT NOT NULL, /* 'CREATE' | 'REGENERATE' | 'LOCK' | 'UNLOCK' | 'REVOKE' | 'PASSWORD_SET' | 'PASSWORD_CHANGE' | 'PASSWORD_RESET' | 'LOGIN_SUCCESS' | 'LOGIN_FAILED' */
      actor_user_id TEXT NOT NULL,
      actor_role TEXT,
      credential_version INTEGER NOT NULL DEFAULT 1,
      reason TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_cred_audits_tenant ON credential_audits(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_cred_audits_owner ON credential_audits(owner_id);

    CREATE TABLE IF NOT EXISTS auth_sessions (
      id TEXT PRIMARY KEY,
      token TEXT NOT NULL UNIQUE,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      tenant_id TEXT NOT NULL,
      teacher_id TEXT,
      student_id TEXT,
      child_student_id TEXT,
      officer_role_title TEXT,
      credential_version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      last_activity_at TEXT NOT NULL,
      is_test_credential INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_token ON auth_sessions(token);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON auth_sessions(user_id);

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      actor_user_id TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      actor_tenant_id TEXT,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      details TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(actor_tenant_id);

    /* PHASE B: STUDENTS TABLE */
    CREATE TABLE IF NOT EXISTS students (
      id TEXT NOT NULL,
      tenant_id TEXT NOT NULL,
      class_id TEXT NOT NULL DEFAULT '',
      code TEXT NOT NULL,
      full_name TEXT NOT NULL,
      gender TEXT NOT NULL DEFAULT 'Nam',
      dob TEXT NOT NULL DEFAULT '',
      group_num INTEGER NOT NULL DEFAULT 1,
      officer_role TEXT,
      avatar TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      father_name TEXT,
      father_phone TEXT,
      father_job TEXT,
      mother_name TEXT,
      mother_phone TEXT,
      mother_job TEXT,
      health_notes TEXT,
      talents TEXT,
      private_teacher_notes TEXT,
      needs_special_attention INTEGER NOT NULL DEFAULT 0,
      attention_categories TEXT,
      attention_note TEXT,
      support_measure TEXT,
      attention_status TEXT DEFAULT 'monitoring',
      attention_started_at TEXT,
      attention_updated_at TEXT,
      attention_updated_by TEXT,
      status TEXT NOT NULL DEFAULT 'Đang học',
      raw_metadata TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (tenant_id, id),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_students_tenant ON students(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_students_tenant_code ON students(tenant_id, code);

    /* PHASE B: CLASS SETTINGS TABLE */
    CREATE TABLE IF NOT EXISTS class_settings (
      tenant_id TEXT NOT NULL,
      class_id TEXT NOT NULL,
      school_name TEXT NOT NULL,
      class_name TEXT NOT NULL,
      grade TEXT NOT NULL,
      stream TEXT NOT NULL,
      academic_year TEXT NOT NULL,
      semester TEXT NOT NULL DEFAULT 'HK1',
      teacher_name TEXT NOT NULL,
      teacher_phone TEXT NOT NULL,
      teacher_email TEXT NOT NULL,
      slogan TEXT,
      cover_image TEXT,
      total_students INTEGER NOT NULL DEFAULT 0,
      theme_json TEXT NOT NULL,
      subjects_json TEXT NOT NULL,
      interaction_settings_json TEXT,
      google_integration_json TEXT,
      zalo_settings_json TEXT,
      ai_config_json TEXT,
      school_year_timeline_json TEXT,
      raw_metadata TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (tenant_id, class_id),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_class_settings_tenant ON class_settings(tenant_id);

    /* PHASE B: SERVER BACKUPS TABLE */
    CREATE TABLE IF NOT EXISTS server_backups (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      backup_type TEXT NOT NULL,
      migration_version TEXT NOT NULL,
      record_counts TEXT NOT NULL,
      data_payload TEXT NOT NULL,
      created_at TEXT NOT NULL,
      created_by TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_backups_tenant ON server_backups(tenant_id);

    /* PHASE C: SURVEY MODULE */
    CREATE TABLE IF NOT EXISTS survey_templates (
      id TEXT NOT NULL,
      tenant_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      target_type TEXT NOT NULL DEFAULT 'STUDENT',
      academic_year TEXT NOT NULL,
      semester TEXT NOT NULL,
      current_version INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'PUBLISHED', /* DRAFT | PUBLISHED | ARCHIVED */
      is_default INTEGER NOT NULL DEFAULT 0,
      sections_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (tenant_id, id),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS survey_template_versions (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      template_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      snapshot_json TEXT NOT NULL,
      published_at TEXT NOT NULL,
      published_by TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS survey_responses (
      id TEXT NOT NULL,
      tenant_id TEXT NOT NULL,
      template_id TEXT NOT NULL,
      template_version INTEGER NOT NULL DEFAULT 1,
      student_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'SUBMITTED', /* DRAFT | SUBMITTED | REVIEWED */
      raw_answers_json TEXT NOT NULL,
      sensitive_answers_json TEXT, /* TEACHER_ONLY private fields */
      submitted_at TEXT,
      reviewed_at TEXT,
      reviewed_by TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (tenant_id, id),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_survey_responses_student ON survey_responses(tenant_id, student_id);

    CREATE TABLE IF NOT EXISTS survey_sync_proposals (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      template_id TEXT,
      response_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      target_field TEXT NOT NULL,
      field_category TEXT NOT NULL, /* AUTO_SYNC | REVIEW_REQUIRED | TEACHER_ONLY */
      old_value TEXT,
      new_value TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING', /* PENDING | APPROVED | REJECTED | AUTO_APPLIED */
      reviewed_by TEXT,
      reviewed_at TEXT,
      created_at TEXT NOT NULL
    );

    /* PHASE D: ACADEMIC & TIMETABLE */
    CREATE TABLE IF NOT EXISTS academic_records (
      id TEXT NOT NULL,
      tenant_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      academic_year TEXT NOT NULL,
      semester TEXT NOT NULL,
      scores_json TEXT NOT NULL, /* SubjectScore[] */
      conduct_score REAL,
      conduct_evaluation TEXT,
      academic_rank TEXT,
      gpa REAL,
      attendance_summary_json TEXT,
      teacher_evaluation TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (tenant_id, id),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_academic_student ON academic_records(tenant_id, student_id);

    CREATE TABLE IF NOT EXISTS published_academic_snapshots (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      academic_year TEXT NOT NULL,
      semester TEXT NOT NULL,
      period_label TEXT NOT NULL,
      published_at TEXT NOT NULL,
      published_by TEXT NOT NULL,
      snapshot_data_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PUBLISHED'
    );

    CREATE TABLE IF NOT EXISTS timetables (
      tenant_id TEXT NOT NULL,
      class_id TEXT NOT NULL,
      academic_year TEXT NOT NULL,
      semester TEXT NOT NULL,
      schedule_grid_json TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      updated_by TEXT NOT NULL,
      PRIMARY KEY (tenant_id, class_id, academic_year, semester)
    );

    CREATE TABLE IF NOT EXISTS exam_schedules (
      id TEXT NOT NULL,
      tenant_id TEXT NOT NULL,
      class_id TEXT NOT NULL,
      exam_title TEXT NOT NULL,
      subject TEXT NOT NULL,
      exam_date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      room TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      PRIMARY KEY (tenant_id, id)
    );

    CREATE TABLE IF NOT EXISTS assignments (
      id TEXT NOT NULL,
      tenant_id TEXT NOT NULL,
      class_id TEXT NOT NULL,
      title TEXT NOT NULL,
      subject TEXT NOT NULL,
      assigned_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      is_pinned INTEGER NOT NULL DEFAULT 0,
      bg_color TEXT,
      text_color TEXT,
      author_role TEXT,
      author_name TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT,
      PRIMARY KEY (tenant_id, id)
    );

    /* PHASE E: TRAINING, GRADUATION, CAREER */
    CREATE TABLE IF NOT EXISTS training_transactions (
      id TEXT NOT NULL,
      tenant_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      rule_id TEXT,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      points REAL NOT NULL,
      description TEXT,
      evidence_url TEXT,
      status TEXT NOT NULL DEFAULT 'APPROVED', /* PROPOSED | APPROVED | REJECTED */
      created_by_role TEXT NOT NULL,
      created_by_user_id TEXT NOT NULL,
      approved_by TEXT,
      approved_at TEXT,
      created_at TEXT NOT NULL,
      PRIMARY KEY (tenant_id, id)
    );

    CREATE INDEX IF NOT EXISTS idx_training_student ON training_transactions(tenant_id, student_id);

    CREATE TABLE IF NOT EXISTS training_rule_configs (
      id TEXT NOT NULL,
      tenant_id TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      default_points REAL NOT NULL,
      description TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY (tenant_id, id)
    );

    CREATE TABLE IF NOT EXISTS laurel_trees (
      tenant_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      total_points REAL NOT NULL DEFAULT 0,
      current_rank_level INTEGER NOT NULL DEFAULT 1,
      badges_json TEXT NOT NULL DEFAULT '[]',
      updated_at TEXT NOT NULL,
      PRIMARY KEY (tenant_id, student_id)
    );

    CREATE TABLE IF NOT EXISTS attendance_records (
      id TEXT NOT NULL,
      tenant_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      date TEXT NOT NULL,
      status TEXT NOT NULL, /* PRESENT | EXCUSED_ABSENCE | UNEXCUSED_ABSENCE | LATE */
      reason TEXT,
      recorded_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (tenant_id, id)
    );

    CREATE TABLE IF NOT EXISTS graduation_choices (
      id TEXT NOT NULL,
      tenant_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      initial_choice_json TEXT NOT NULL, /* Immutable historical survey choice */
      current_choice_json TEXT NOT NULL, /* Mutable student current choice */
      history_json TEXT NOT NULL DEFAULT '[]', /* Track modification timeline */
      mock_exam_results_json TEXT DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (tenant_id, id)
    );

    CREATE INDEX IF NOT EXISTS idx_grad_choices_student ON graduation_choices(tenant_id, student_id);

    CREATE TABLE IF NOT EXISTS career_profiles (
      id TEXT NOT NULL,
      tenant_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      riasec_scores_json TEXT NOT NULL,
      primary_traits_json TEXT NOT NULL,
      recommended_careers_json TEXT NOT NULL,
      student_aspirations TEXT,
      holland_history_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (tenant_id, id)
    );

    CREATE INDEX IF NOT EXISTS idx_career_student ON career_profiles(tenant_id, student_id);

    /* PHASE F: PARENT COMMUNICATION & NOTIFICATIONS */
    CREATE TABLE IF NOT EXISTS parent_conversations (
      id TEXT NOT NULL,
      tenant_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      parent_name TEXT NOT NULL,
      parent_phone TEXT,
      topic TEXT NOT NULL,
      messages_json TEXT NOT NULL,
      last_message_at TEXT NOT NULL,
      unread_teacher INTEGER NOT NULL DEFAULT 0,
      unread_parent INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (tenant_id, id)
    );

    CREATE INDEX IF NOT EXISTS idx_parent_conv_student ON parent_conversations(tenant_id, student_id);

    CREATE TABLE IF NOT EXISTS parent_announcements (
      id TEXT NOT NULL,
      tenant_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      target_type TEXT NOT NULL DEFAULT 'ALL', /* ALL | SPECIFIC_STUDENTS */
      target_student_ids_json TEXT,
      sent_at TEXT NOT NULL,
      sent_by TEXT NOT NULL,
      requires_acknowledgement INTEGER NOT NULL DEFAULT 0,
      acknowledgements_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      PRIMARY KEY (tenant_id, id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT NOT NULL,
      tenant_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      link_to TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      PRIMARY KEY (tenant_id, id)
    );

    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(tenant_id, user_id);

    /* CLASSROOM FEED & POSTS WITH RBAC */
    CREATE TABLE IF NOT EXISTS posts (
      id TEXT NOT NULL,
      tenant_id TEXT NOT NULL,
      author_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      author_role TEXT NOT NULL,
      author_avatar TEXT,
      category TEXT NOT NULL DEFAULT 'Thông báo',
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      images_json TEXT NOT NULL DEFAULT '[]',
      attachments_json TEXT NOT NULL DEFAULT '[]',
      pinned_to_overview INTEGER NOT NULL DEFAULT 0,
      parent_visible INTEGER NOT NULL DEFAULT 1,
      reactions_json TEXT NOT NULL DEFAULT '{"like":[],"love":[],"applause":[],"celebrate":[],"idea":[]}',
      comments_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (tenant_id, id)
    );

    CREATE INDEX IF NOT EXISTS idx_posts_tenant ON posts(tenant_id);

    /* PHASE G: TEACHER WORK CENTER & PERSONAL TASKS */
    CREATE TABLE IF NOT EXISTS teacher_personal_tasks (
      id TEXT NOT NULL,
      tenant_id TEXT NOT NULL,
      teacher_id TEXT NOT NULL,
      class_id TEXT,
      title TEXT NOT NULL,
      notes TEXT,
      due_date TEXT,
      priority TEXT NOT NULL DEFAULT 'NORMAL', /* URGENT | HIGH | NORMAL | LOW */
      status TEXT NOT NULL DEFAULT 'TODO',     /* TODO | IN_PROGRESS | DONE | OVERDUE */
      linked_module TEXT,
      linked_entity_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      completed_at TEXT,
      PRIMARY KEY (tenant_id, id)
    );

    CREATE INDEX IF NOT EXISTS idx_teacher_tasks_lookup ON teacher_personal_tasks(tenant_id, teacher_id);

    /* SYSTEM SETTINGS & ADMIN CONFIGURATION */
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      updated_by TEXT
    );

    /* SUPER ADMIN ACCOUNTS & CREDENTIALS */
    CREATE TABLE IF NOT EXISTS admin_accounts (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      recovery_email TEXT,
      full_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      password_updated_at TEXT,
      reset_token_hash TEXT,
      reset_token_expires_at TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      last_login_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_admin_accounts_email ON admin_accounts(email);

    /* USER SUPPORT TICKETS */
    CREATE TABLE IF NOT EXISTS support_tickets (
      id TEXT PRIMARY KEY,
      ticket_code TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'MEDIUM',
      status TEXT NOT NULL DEFAULT 'NEW',
      user_id TEXT NOT NULL,
      user_role TEXT NOT NULL,
      user_name TEXT NOT NULL,
      user_email TEXT,
      user_phone TEXT,
      tenant_id TEXT,
      related_module TEXT,
      admin_response TEXT,
      admin_notes TEXT,
      assigned_admin_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      resolved_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id);
    CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
    CREATE INDEX IF NOT EXISTS idx_support_tickets_tenant ON support_tickets(tenant_id);

    /* SUPPORT TICKET HISTORY / AUDIT */
    CREATE TABLE IF NOT EXISTS support_ticket_history (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL,
      actor_id TEXT NOT NULL,
      actor_name TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      action TEXT NOT NULL,
      old_status TEXT,
      new_status TEXT,
      message TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_support_history_ticket ON support_ticket_history(ticket_id);

    /* USER FEEDBACK & FEATURE SUGGESTIONS */
    CREATE TABLE IF NOT EXISTS user_feedbacks (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL, /* 'RATING_FEEDBACK' | 'BUG_REPORT' | 'FEATURE_SUGGESTION' */
      rating INTEGER,
      category TEXT NOT NULL,
      related_module TEXT,
      title TEXT,
      content TEXT NOT NULL,
      is_anonymous INTEGER NOT NULL DEFAULT 0,
      user_id TEXT,
      user_role TEXT NOT NULL,
      user_name TEXT,
      user_email TEXT,
      tenant_id TEXT,
      status TEXT NOT NULL DEFAULT 'NEW',
      admin_notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_user_feedbacks_user ON user_feedbacks(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_feedbacks_type ON user_feedbacks(type);
    CREATE INDEX IF NOT EXISTS idx_user_feedbacks_status ON user_feedbacks(status);

    /* PERSISTENT USER AVATARS */
    CREATE TABLE IF NOT EXISTS user_avatars (
      user_key TEXT PRIMARY KEY,
      avatar TEXT NOT NULL,
      user_id TEXT,
      role TEXT,
      tenant_id TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_user_avatars_uid ON user_avatars(user_id);
  `);

  // Safe migration checks for schema updates
  try {
    db.exec(`ALTER TABLE posts ADD COLUMN status TEXT DEFAULT 'approved';`);
  } catch {}
  try {
    db.exec(`ALTER TABLE posts ADD COLUMN reviewed_by TEXT;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE posts ADD COLUMN reviewed_at TEXT;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE assignments ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE assignments ADD COLUMN bg_color TEXT;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE assignments ADD COLUMN text_color TEXT;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE assignments ADD COLUMN author_role TEXT;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE assignments ADD COLUMN author_name TEXT;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE assignments ADD COLUMN updated_at TEXT;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE teacher_accounts ADD COLUMN avatar TEXT;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE credentials ADD COLUMN initial_password TEXT;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE credentials ADD COLUMN password_hash TEXT;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE credentials ADD COLUMN password_updated_at TEXT;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE credentials ADD COLUMN last_issued_at TEXT;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE credentials ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE students ADD COLUMN anonymous_code TEXT;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE class_settings ADD COLUMN student_identity_mode TEXT NOT NULL DEFAULT 'IDENTIFIED';`);
  } catch {}
  try {
    db.exec(`ALTER TABLE survey_sync_proposals ADD COLUMN template_id TEXT;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE survey_responses ADD COLUMN template_id TEXT;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE survey_responses ADD COLUMN template_version INTEGER NOT NULL DEFAULT 1;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE survey_templates ADD COLUMN class_id TEXT;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE survey_templates ADD COLUMN created_by TEXT;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE survey_templates ADD COLUMN creator_role TEXT;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE survey_templates ADD COLUMN scope TEXT DEFAULT 'CLASS';`);
  } catch {}
  try {
    db.exec(`ALTER TABLE survey_templates ADD COLUMN survey_type TEXT DEFAULT 'CUSTOM';`);
  } catch {}
  try {
    db.exec(`ALTER TABLE survey_templates ADD COLUMN target_audience_json TEXT;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE teacher_personal_tasks ADD COLUMN start_time TEXT;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE teacher_personal_tasks ADD COLUMN end_time TEXT;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE teacher_personal_tasks ADD COLUMN location TEXT;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE teacher_personal_tasks ADD COLUMN category TEXT DEFAULT 'HOMEROOM';`);
  } catch {}
  try {
    db.exec(`ALTER TABLE teacher_personal_tasks ADD COLUMN is_all_day INTEGER DEFAULT 0;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE career_profiles ADD COLUMN mbti_result_json TEXT DEFAULT '{}';`);
  } catch {}
  try {
    db.exec(`ALTER TABLE career_profiles ADD COLUMN work_values_result_json TEXT DEFAULT '{}';`);
  } catch {}
  try {
    db.exec(`ALTER TABLE career_profiles ADD COLUMN assessments_history_json TEXT DEFAULT '[]';`);
  } catch {}

  // Safe migration for persistent admin account login_id, recovery_code, and session_version
  try {
    db.exec(`ALTER TABLE admin_accounts ADD COLUMN login_id TEXT;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE admin_accounts ADD COLUMN firebase_uid TEXT;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE admin_accounts ADD COLUMN recovery_code_hash TEXT;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE admin_accounts ADD COLUMN recovery_code_used INTEGER DEFAULT 0;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE admin_accounts ADD COLUMN recovery_code_created_at TEXT;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE admin_accounts ADD COLUMN session_version INTEGER DEFAULT 1;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE admin_accounts ADD COLUMN first_time_setup_completed INTEGER DEFAULT 0;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE admin_accounts ADD COLUMN bootstrap_token_hash TEXT;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE admin_accounts ADD COLUMN bootstrap_token_expires_at TEXT;`);
  } catch {}
  try {
    db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_accounts_login_id ON admin_accounts(login_id);`);
  } catch {}
  try {
    db.exec(`UPDATE admin_accounts SET login_id = 'admin' WHERE login_id IS NULL;`);
  } catch {}
  try {
    db.exec(`UPDATE admin_accounts SET session_version = 1 WHERE session_version IS NULL;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE admin_accounts ADD COLUMN failed_attempts INTEGER DEFAULT 0;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE admin_accounts ADD COLUMN locked_until TEXT;`);
  } catch {}

  // Safe index creation after all columns exist
  try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_survey_proposals_lookup ON survey_sync_proposals(tenant_id, template_id, response_id);`);
  } catch {}
  try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_survey_responses_student ON survey_responses(tenant_id, student_id);`);
  } catch {}

  // Ensure default tenants exist so foreign keys never fail
  try {
    db.exec(`
      INSERT OR IGNORE INTO tenants (id, name, school_name, plan, status, created_at, updated_at) VALUES 
        ('platform-root', 'Không Gian Chủ Nhiệm - Nền Tảng', 'Hệ Thống Không Gian Chủ Nhiệm Số', 'ENTERPRISE', 'ACTIVE', '2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z'),
        ('tenant-lan-nguyen', 'Không Gian Chủ Nhiệm - Cô Mai Lan', 'THPT Chuyên Lê Hồng Phong', 'PRO', 'ACTIVE', '2025-08-15T08:00:00.000Z', '2025-08-15T08:00:00.000Z'),
        ('tenant-hoang-nam', 'Không Gian Chủ Nhiệm - Thầy Hoàng Nam', 'THPT Chuyên Nguyễn Huệ', 'PRO', 'ACTIVE', '2025-08-20T08:00:00.000Z', '2025-08-20T08:00:00.000Z'),
        ('class-11a1-2025', 'Lớp 11A1 - THPT Chuyên Lê Hồng Phong', 'THPT Chuyên Lê Hồng Phong', 'PRO', 'ACTIVE', '2025-08-15T08:00:00.000Z', '2025-08-15T08:00:00.000Z'),
        ('default', 'Không Gian Mặc Định', 'Trường THPT', 'PRO', 'ACTIVE', '2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z');
    `);
  } catch {}
}
