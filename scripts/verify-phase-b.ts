import { getDatabase } from '../server/db/database';
import { seedInitialData } from '../server/db/seed';
import { studentRepository } from '../server/repositories/StudentRepository';
import { classSettingsRepository } from '../server/repositories/ClassSettingsRepository';
import { backupRepository } from '../server/repositories/BackupRepository';
import { credentialRepository } from '../server/repositories/CredentialRepository';
import { sessionRepository } from '../server/repositories/SessionRepository';
import { sanitizeStudentRecord, sanitizeClassSettingsRecord } from '../server/utils/sanitizers';

async function runPhaseBVerification() {
  console.log('====================================================');
  console.log('BẮT ĐẦU KIỂM THỬ TỔNG THỂ PHASE B — STUDENTS & CLASS SETTINGS');
  console.log('====================================================\n');

  // Step 1: Database & Seed
  const db = getDatabase();
  seedInitialData();

  console.log('[TEST 1] Kiểm tra Database Tables & Schema...');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as any[];
  const tableNames = tables.map(t => t.name);
  ['students', 'class_settings', 'server_backups', 'credentials', 'auth_sessions', 'audit_logs'].forEach(tbl => {
    if (!tableNames.includes(tbl)) {
      throw new Error(`Table ${tbl} is missing from SQLite database!`);
    }
  });
  console.log('  -> PASS: Đã khởi tạo đầy đủ các bảng.');

  // Step 2: Idempotency test (re-running seed should not create duplicates or wipe data)
  console.log('[TEST 2] Kiểm tra Tính Bất Biến (Idempotency) khi Seed/Re-run...');
  seedInitialData();
  const countLan1 = studentRepository.getAllByTenant('tenant-lan-nguyen').length;
  const countNam1 = studentRepository.getAllByTenant('tenant-hoang-nam').length;
  if (countLan1 !== 4 || countNam1 !== 1) {
    throw new Error(`Idempotency check failed! Expected Lan=4, Nam=1, got Lan=${countLan1}, Nam=${countNam1}`);
  }
  console.log(`  -> PASS: Idempotent thành công (Lan: ${countLan1} học sinh, Nam: ${countNam1} học sinh).`);

  // Step 3: Stable IDs verification
  console.log('[TEST 3] Kiểm tra Bảo Toàn Stable IDs...');
  const studentHs01 = studentRepository.getById('tenant-lan-nguyen', 'hs-01');
  if (!studentHs01 || (studentHs01.full_name !== 'Nguyễn Văn An' && studentHs01.full_name !== 'Nguyễn Gia Huy')) {
    throw new Error('Stable ID hs-01 not found or corrupted!');
  }
  const studentHsNam01 = studentRepository.getById('tenant-hoang-nam', 'hs-12a2-01');
  if (!studentHsNam01 || (studentHsNam01.full_name !== 'Hoàng Minh Tuấn' && studentHsNam01.full_name !== 'Trần Văn Minh')) {
    throw new Error('Stable ID hs-12a2-01 not found or corrupted!');
  }
  console.log(`  -> PASS: Stable IDs giữ nguyên vẹn 100% (hs-01 -> ${studentHs01.full_name}, hs-12a2-01 -> ${studentHsNam01.full_name}).`);

  // Step 4: Strict Tenant Isolation
  console.log('[TEST 4] Kiểm tra Cô Lập Dữ Liệu Đa Không Gian (Tenant Isolation)...');
  // Tenant Lan trying to get Nam's student
  const crossTenantGet = studentRepository.getById('tenant-lan-nguyen', 'hs-12a2-01');
  if (crossTenantGet !== null) {
    throw new Error('FAIL: Tenant Lan was able to query Tenant Nam student!');
  }
  // Tenant Nam trying to get Lan's class settings
  const crossTenantSettings = classSettingsRepository.getByTenantAndClass('tenant-hoang-nam', 'class-11a1-2025');
  if (crossTenantSettings !== null) {
    throw new Error('FAIL: Tenant Nam was able to query Tenant Lan class settings!');
  }
  console.log('  -> PASS: Cô lập tenant ở tầng Database & Repository hoạt động tuyệt đối.');

  // Step 5: Multi-Role Sanitization (Teacher vs Student vs Parent vs Classmate)
  console.log('[TEST 5] Kiểm tra Phân Quyền & Làm Sạch Dữ Liệu (Role Sanitization)...');
  
  // Set private notes & special attention on hs-01
  studentRepository.update('tenant-lan-nguyen', 'hs-01', {
    private_teacher_notes: 'Học sinh có tố chất lãnh đạo, cần hỗ trợ học bổng.',
    needs_special_attention: 1,
    attention_note: 'Theo dõi tiến độ học tập'
  });

  const rawHs01 = studentRepository.getById('tenant-lan-nguyen', 'hs-01')!;

  // 5.1 Teacher View
  const teacherView = sanitizeStudentRecord(rawHs01, {
    userId: 'tch-lan',
    role: 'TEACHER',
    tenantId: 'tenant-lan-nguyen'
  });
  if (!teacherView.privateTeacherNotes || !teacherView.needsSpecialAttention) {
    throw new Error('FAIL: Teacher should see privateTeacherNotes and special attention!');
  }

  // 5.2 Own Student View
  const studentView = sanitizeStudentRecord(rawHs01, {
    userId: 'stu-hs-01',
    role: 'STUDENT',
    tenantId: 'tenant-lan-nguyen',
    studentId: 'hs-01'
  });
  if (studentView.privateTeacherNotes || studentView.needsSpecialAttention) {
    throw new Error('SECURITY BREACH: Student saw privateTeacherNotes or special attention!');
  }

  // 5.3 Other Classmate View (e.g. hs-02 looking at hs-01)
  const classmateView = sanitizeStudentRecord(rawHs01, {
    userId: 'stu-hs-02',
    role: 'STUDENT',
    tenantId: 'tenant-lan-nguyen',
    studentId: 'hs-02'
  });
  if (classmateView.privateTeacherNotes || classmateView.phone || classmateView.fatherPhone) {
    throw new Error('SECURITY BREACH: Classmate saw private phone or parent phone of other student!');
  }

  console.log('  -> PASS: Role Sanitization bảo vệ thông tin nhạy cảm chính xác 100%.');

  // Step 6: Officer Status Mutation & Credential Version Invalidation
  console.log('[TEST 6] Bổ Nhiệm Cán Sự & Cập Nhật Phiên...');
  const initialCred = credentialRepository.findByTenantAndOwner('tenant-lan-nguyen', 'hs-04', 'STUDENT');
  const initialVer = initialCred?.credential_version || 1;

  credentialRepository.updateOfficerStatus('tenant-lan-nguyen', 'hs-04', true, 'Tổ phó');
  const updatedCred = credentialRepository.findByTenantAndOwner('tenant-lan-nguyen', 'hs-04', 'STUDENT');
  if (updatedCred?.credential_version !== initialVer + 1 || updatedCred?.is_officer !== 1) {
    throw new Error('FAIL: Credential version was not incremented upon officer update!');
  }
  console.log(`  -> PASS: Credential version bumped from ${initialVer} to ${updatedCred.credential_version}.`);

  // Step 7: Class Settings CRUD & Sanitization
  console.log('[TEST 7] Kiểm Tra Cập Nhật Cấu Hình Lớp (ClassSettings)...');
  const initialLanSettings = classSettingsRepository.getByTenantAndClass('tenant-lan-nguyen')!;
  classSettingsRepository.update('tenant-lan-nguyen', initialLanSettings.class_id, {
    slogan: 'Đoàn kết - Sáng tạo - Vững bước tương lai 11A1!',
    cover_image: 'https://example.com/new-cover.jpg'
  });

  const updatedLanSettings = classSettingsRepository.getByTenantAndClass('tenant-lan-nguyen')!;
  if (updatedLanSettings.slogan !== 'Đoàn kết - Sáng tạo - Vững bước tương lai 11A1!') {
    throw new Error('FAIL: Class settings slogan not updated!');
  }

  // Verify that student view does not expose googleIntegration or third-party sensitive keys
  const studentSettingsView = sanitizeClassSettingsRecord(updatedLanSettings, {
    userId: 'stu-hs-01',
    role: 'STUDENT',
    tenantId: 'tenant-lan-nguyen',
    studentId: 'hs-01'
  });
  if (studentSettingsView.googleIntegration) {
    throw new Error('SECURITY BREACH: Student received googleIntegration settings!');
  }
  console.log('  -> PASS: ClassSettings cập nhật thành công và được sanitize an toàn.');

  // Step 8: Backup Snapshots
  console.log('[TEST 8] Kiểm Tra Hệ Thống Backup Tự Động...');
  const backups = backupRepository.getBackupsByTenant('tenant-lan-nguyen');
  if (backups.length === 0) {
    throw new Error('FAIL: Pre-migration backup was not created!');
  }
  console.log(`  -> PASS: Đã ghi nhận ${backups.length} bản backup cho tenant-lan-nguyen.`);

  console.log('\n====================================================');
  console.log('TẤT CẢ CÁC BƯỚC KIỂM THỬ PHASE B ĐÃ VƯỢT QUA 100% (ALL TESTS PASSED)');
  console.log('====================================================');
}

runPhaseBVerification().catch(err => {
  console.error('[VERIFICATION FAILED]', err);
  process.exit(1);
});
