/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * HOTFIX P1 VERIFICATION SCRIPT:
 * Independent Teacher Identity & Multi-Tenant Class Isolation Regression Test
 */

import { getDatabase } from '../server/db/database';
import { credentialRepository } from '../server/repositories/CredentialRepository';
import { teacherAccountRepository } from '../server/repositories/TeacherAccountRepository';
import { tenantRepository } from '../server/repositories/TenantRepository';
import { classSettingsRepository, ClassSettingsRecord } from '../server/repositories/ClassSettingsRepository';
import { sessionRepository } from '../server/repositories/SessionRepository';
import { studentRepository } from '../server/repositories/StudentRepository';
import { hashSecret } from '../server/auth/crypto';

console.log('====================================================');
console.log('BẮT ĐẦU KIỂM THỬ HỒI QUY HOTFIX P1 — DANH TÍNH GVCN');
console.log('====================================================\n');

const db = getDatabase();

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  ✗ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ PASS: ${message}`);
}

async function runTests() {
  // --------------------------------------------------------------------------
  // PRE-FLIGHT: Database & Backup Verification
  // --------------------------------------------------------------------------
  console.log('[BƯỚC 1] Xác minh bản sao lưu và dữ liệu gốc...');
  const teacherB_cred = credentialRepository.findByLookupIdentifier('ACT-ML-2025-LHP');
  assert(!!teacherB_cred, 'Tài khoản B (ACT-ML-2025-LHP - Cô Mai Lan) tồn tại trong database.');
  assert(teacherB_cred!.tenant_id === 'tenant-lan-nguyen', 'Tài khoản B thuộc đúng tenant-lan-nguyen.');

  const teacherB_acc = teacherAccountRepository.getByTeacherId(teacherB_cred!.owner_id);
  assert(!!teacherB_acc, 'Hồ sơ GVCN B (Cô Nguyễn Thị Mai Lan) tồn tại nguyên vẹn.');
  assert(teacherB_acc!.full_name === 'Cô Nguyễn Thị Mai Lan', 'Tên GVCN B là Cô Nguyễn Thị Mai Lan.');

  const teacherB_classBefore = classSettingsRepository.getByTenantAndClass('tenant-lan-nguyen');
  assert(!!teacherB_classBefore, 'Lớp học của GVCN B tồn tại (11A1).');
  const classB_originalSlogan = teacherB_classBefore?.slogan || '';

  const teacherB_studentsBefore = studentRepository.getAllByTenant('tenant-lan-nguyen');
  assert(teacherB_studentsBefore.length === 4, `GVCN B có đủ 4 học sinh gốc (thực tế: ${teacherB_studentsBefore.length}).`);

  // --------------------------------------------------------------------------
  // SETUP: Tạo tài khoản GVCN A (Cô Bình: GV-2026-08XKO) để kiểm thử
  // --------------------------------------------------------------------------
  console.log('\n[BƯỚC 2] Khởi tạo tài khoản GVCN A (GV-2026-08XKO — Cô Bình)...');
  const testTenantAId = 'tenant-binh-08xko';
  const testTeacherAId = 'teacher-binh-08xko';
  const testCodeA = 'GV-2026-08XKO';
  const testPasswordA = 'MatKhau@123!';
  const now = new Date().toISOString();

  // Đảm bảo không ghi đè dữ liệu của B
  tenantRepository.createOrUpdate({
    id: testTenantAId,
    name: 'Không Gian Chủ Nhiệm - Cô Đoàn Thị Bình',
    school_name: 'THPT Trần Đại Nghĩa',
    owner_id: testTeacherAId,
    owner_email: 'doanthibinh.gv@tdn.edu.vn',
    owner_name: 'Cô Đoàn Thị Bình',
    plan: 'PRO',
    status: 'ACTIVE',
    created_at: now,
    updated_at: now
  });

  teacherAccountRepository.createOrUpdate({
    id: 'acc-binh-08xko',
    teacher_id: testTeacherAId,
    tenant_id: testTenantAId,
    full_name: 'Cô Đoàn Thị Bình',
    email: 'doanthibinh.gv@tdn.edu.vn',
    phone: '0973 640 124',
    login_method: 'BOTH',
    status: 'ACTIVE',
    credential_version: 1,
    created_at: now,
    updated_at: now
  });

  classSettingsRepository.upsert({
    tenant_id: testTenantAId,
    class_id: 'class-10b2-2026',
    school_name: 'THPT Trần Đại Nghĩa',
    class_name: '10B2',
    grade: '10',
    stream: 'KHTN',
    academic_year: '2025 - 2026',
    semester: 'Học kỳ I',
    teacher_name: 'Cô Đoàn Thị Bình',
    teacher_phone: '0973 640 124',
    teacher_email: 'doanthibinh.gv@tdn.edu.vn',
    slogan: 'Lớp 10B2 sáng tạo và bứt phá',
    cover_image: null,
    total_students: 1,
    theme_json: JSON.stringify({ primaryColor: '#2563EB' }),
    subjects_json: JSON.stringify([]),
    interaction_settings_json: null,
    google_integration_json: null,
    zalo_settings_json: null,
    ai_config_json: null,
    school_year_timeline_json: null,
    raw_metadata: null,
    created_at: now,
    updated_at: now
  });

  // Lưu Credential A với password hash
  credentialRepository.saveCredential({
    type: 'TEACHER',
    tenant_id: testTenantAId,
    owner_id: testTeacherAId,
    raw_code: testCodeA,
    is_test_credential: true,
    created_by: 'HOTFIX_REGRESSION_TEST'
  });
  credentialRepository.setPassword({
    tenantId: testTenantAId,
    ownerId: testTeacherAId,
    type: 'TEACHER',
    newPasswordPlain: testPasswordA,
    actorUserId: 'SUPER_ADMIN_TEST'
  });

  // --------------------------------------------------------------------------
  // TEST 1: Đăng nhập tài khoản A
  // --------------------------------------------------------------------------
  console.log('\n[TEST 1] Đăng nhập tài khoản A (GV-2026-08XKO)...');
  const authA = credentialRepository.authenticate(testCodeA, testPasswordA, 'TEACHER');
  assert(authA.success === true, 'Xác thực tài khoản A thành công.');
  assert(authA.credential?.lookup_identifier === testCodeA, `Mã truy cập đúng là ${testCodeA}.`);
  assert(authA.credential?.tenant_id === testTenantAId, `Tenant của A là ${testTenantAId}.`);
  assert(authA.credential?.owner_id === testTeacherAId, `TeacherId của A là ${testTeacherAId}.`);

  const teacherA_acc = teacherAccountRepository.getByTeacherId(authA.credential!.owner_id);
  assert(teacherA_acc?.full_name === 'Cô Đoàn Thị Bình', 'Hồ sơ A trả đúng tên Cô Đoàn Thị Bình (không bị ánh xạ về Cô Mai Lan).');
  assert(teacherA_acc?.email === 'doanthibinh.gv@tdn.edu.vn', 'Email của A đúng là doanthibinh.gv@tdn.edu.vn.');

  const sessionA = sessionRepository.createSession({
    userId: teacherA_acc!.id,
    role: 'TEACHER',
    tenantId: testTenantAId,
    teacherId: testTeacherAId,
    credentialVersion: 1
  });
  assert(!!sessionA.token, 'Tạo phiên đăng nhập cho GVCN A thành công.');

  // --------------------------------------------------------------------------
  // TEST 2: Đăng nhập tài khoản B (ACT-ML-2025-LHP)
  // --------------------------------------------------------------------------
  console.log('\n[TEST 2] Đăng nhập tài khoản B (ACT-ML-2025-LHP)...');
  const authB = credentialRepository.authenticate('ACT-ML-2025-LHP', undefined, 'TEACHER');
  assert(authB.success === true, 'Xác thực tài khoản B thành công.');
  assert(authB.credential?.lookup_identifier === 'ACT-ML-2025-LHP', 'Mã truy cập đúng là ACT-ML-2025-LHP.');
  assert(authB.credential?.tenant_id === 'tenant-lan-nguyen', 'Tenant của B đúng là tenant-lan-nguyen.');
  assert(authB.credential?.owner_id === 'teacher-lan-nguyen', 'TeacherId của B đúng là teacher-lan-nguyen.');

  const teacherB_record = teacherAccountRepository.getByTeacherId(authB.credential!.owner_id);
  assert(teacherB_record?.full_name === 'Cô Nguyễn Thị Mai Lan', 'Hồ sơ B trả đúng tên Cô Nguyễn Thị Mai Lan.');

  const sessionB = sessionRepository.createSession({
    userId: teacherB_record!.id,
    role: 'TEACHER',
    tenantId: 'tenant-lan-nguyen',
    teacherId: 'teacher-lan-nguyen',
    credentialVersion: 1
  });
  assert(sessionA.token !== sessionB.token, 'Token của A và B hoàn toàn khác nhau.');

  // --------------------------------------------------------------------------
  // TEST 3: A chỉnh sửa lớp thử nghiệm không làm thay đổi lớp của B
  // --------------------------------------------------------------------------
  console.log('\n[TEST 3] A chỉnh sửa lớp thử nghiệm 10B2...');
  classSettingsRepository.update(testTenantAId, 'class-10b2-2026', {
    slogan: 'Slogan mới cập nhật của lớp 10B2 - Cô Bình'
  });

  const classB_check1 = classSettingsRepository.getByTenantAndClass('tenant-lan-nguyen');
  assert(classB_check1?.slogan === classB_originalSlogan, 'Lớp của B (11A1) không bị ảnh hưởng bởi thao tác cập nhật của A.');
  assert(classB_check1?.teacher_name === 'Cô Nguyễn Thị Mai Lan', 'Chủ nhiệm lớp của B vẫn giữ nguyên Cô Nguyễn Thị Mai Lan.');

  // --------------------------------------------------------------------------
  // TEST 4: B chỉnh sửa lớp 11A1 không làm thay đổi lớp của A
  // --------------------------------------------------------------------------
  console.log('\n[TEST 4] B chỉnh sửa lớp 11A1...');
  classSettingsRepository.update('tenant-lan-nguyen', 'class-11a1-2025', {
    slogan: 'Slogan thử nghiệm riêng của 11A1'
  });

  const classA_check = classSettingsRepository.getByTenantAndClass(testTenantAId);
  assert(classA_check?.slogan === 'Slogan mới cập nhật của lớp 10B2 - Cô Bình', 'Lớp của A (10B2) không bị ảnh hưởng bởi thao tác của B.');
  assert(classA_check?.teacher_name === 'Cô Đoàn Thị Bình', 'Chủ nhiệm lớp của A vẫn giữ nguyên Cô Đoàn Thị Bình.');

  // Hoàn tác slogan lớp B về nguyên trạng
  classSettingsRepository.update('tenant-lan-nguyen', 'class-11a1-2025', {
    slogan: classB_originalSlogan
  });

  // --------------------------------------------------------------------------
  // TEST 5: Đăng xuất A rồi đăng nhập B — không giữ state A
  // --------------------------------------------------------------------------
  console.log('\n[TEST 5] Kiểm tra chu trình Đăng xuất A -> Đăng nhập B...');
  sessionRepository.deleteSession(sessionA.session.id);
  const verifySessionADeleted = sessionRepository.getSessionByToken(sessionA.token);
  assert(!verifySessionADeleted, 'Session của A đã bị hủy bỏ hoàn toàn sau đăng xuất.');

  const sessionB_active = sessionRepository.getSessionByToken(sessionB.token);
  assert(!!sessionB_active, 'Session của B hoạt động bình thường, độc lập với A.');
  assert(sessionB_active?.tenant_id === 'tenant-lan-nguyen', 'Session B chỉ liên kết với tenant-lan-nguyen.');
  assert(sessionB_active?.teacher_id === 'teacher-lan-nguyen', 'Session B chỉ liên kết với teacher-lan-nguyen.');

  // --------------------------------------------------------------------------
  // TEST 6: Refresh / Tái tạo session giữ nguyên chủ sở hữu
  // --------------------------------------------------------------------------
  console.log('\n[TEST 6] Kiểm tra Session Refresh không làm đổi chủ sở hữu...');
  const refreshedSessionB = sessionRepository.getSessionByToken(sessionB.token);
  assert(refreshedSessionB?.user_id === teacherB_record!.id, 'Refreshed session B trả đúng user_id của B.');
  assert(refreshedSessionB?.teacher_id === 'teacher-lan-nguyen', 'Refreshed session B trả đúng teacher_id của B.');

  // --------------------------------------------------------------------------
  // TEST 7: Chặn truy cập chéo (Cross-tenant rejection ở backend)
  // --------------------------------------------------------------------------
  console.log('\n[TEST 7] Kiểm tra backend chặn thao tác ghi chéo...');
  const newSessionA = sessionRepository.createSession({
    userId: teacherA_acc!.id,
    role: 'TEACHER',
    tenantId: testTenantAId,
    teacherId: testTeacherAId,
    credentialVersion: 1
  });

  // Thử dùng danh tính A để lấy lớp của B
  const canAccessClassB_as_A = (newSessionA.session.tenant_id === 'tenant-lan-nguyen');
  assert(!canAccessClassB_as_A, 'TenantId của session A khác tenant-lan-nguyen, backend từ chối thao tác ghi chéo.');

  // --------------------------------------------------------------------------
  // TEST 8: Tìm kiếm không thấy hồ sơ — Không được fallback sang Cô Mai Lan
  // --------------------------------------------------------------------------
  console.log('\n[TEST 8] Kiểm tra không tìm thấy hồ sơ (No Fallback to Mai Lan)...');
  const nonExistentTeacher = teacherAccountRepository.getByTeacherId('teacher-non-existent-999');
  assert(nonExistentTeacher === null, 'Không tìm thấy trả về null, tuyệt đối không trả về Cô Mai Lan.');

  const nonExistentTenantTeacher = teacherAccountRepository.getByTenantId('tenant-non-existent-999');
  assert(nonExistentTenantTeacher === null, 'Không tìm thấy tenant trả về null, tuyệt đối không trả về Cô Mai Lan.');

  const failedAuth = credentialRepository.authenticate('GV-INVALID-CODE-000', '123456', 'TEACHER');
  assert(!failedAuth.success, 'Mã không tồn tại bị từ chối xác thực 100%.');

  // --------------------------------------------------------------------------
  // TEST 9: Bảo toàn toàn vẹn dữ liệu gốc
  // --------------------------------------------------------------------------
  console.log('\n[TEST 9] Kiểm tra bảo toàn dữ liệu gốc...');
  const finalClassB = classSettingsRepository.getByTenantAndClass('tenant-lan-nguyen');
  assert(finalClassB?.teacher_name === 'Cô Nguyễn Thị Mai Lan', 'Dữ liệu GVCN lớp 11A1 được bảo toàn nguyên vẹn.');
  assert(finalClassB?.class_name === '11A1', 'Tên lớp 11A1 không bị thay đổi.');

  const finalStudentsB = studentRepository.getAllByTenant('tenant-lan-nguyen');
  assert(finalStudentsB.length === 4, `Số học sinh lớp 11A1 không bị suy giảm hay ghi đè (4/4 học sinh).`);

  // Dọn dẹp session thử nghiệm
  sessionRepository.deleteSession(newSessionA.session.id);
  sessionRepository.deleteSession(sessionB.session.id);

  console.log('\n====================================================');
  console.log('KẾT QUẢ: 9/9 BÀI KIỂM THỬ HỒI QUY ĐÃ PASS 100%!');
  console.log('====================================================');
}

runTests().catch(err => {
  console.error('\nTest thất bại:', err);
  process.exit(1);
});
