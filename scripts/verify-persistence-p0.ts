/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getDatabase } from '../server/db/database';
import { seedInitialData } from '../server/db/seed';
import { tenantRepository } from '../server/repositories/TenantRepository';
import { teacherAccountRepository } from '../server/repositories/TeacherAccountRepository';
import { credentialRepository } from '../server/repositories/CredentialRepository';
import { classSettingsRepository } from '../server/repositories/ClassSettingsRepository';
import { studentRepository } from '../server/repositories/StudentRepository';

async function runPersistenceP0Verification() {
  console.log('====================================================');
  console.log('STARTING P0 PERSISTENCE & LIFECYCLE RECOVERY VERIFICATION');
  console.log('====================================================\n');

  // Step 0: Ensure DB initialized
  const db = getDatabase();
  seedInitialData();

  const initialTenantCount = tenantRepository.getAll().length;
  const initialTeacherCount = teacherAccountRepository.getAll().length;
  const initialStudentCount = studentRepository.countAll();

  console.log(`[BASELINE] Tenants: ${initialTenantCount}, Teachers: ${initialTeacherCount}, Students: ${initialStudentCount}`);

  // TEST 1 — CREATE GVCN & WORKSPACE
  console.log('\n[TEST 1] Admin creates a new GVCN workspace and account...');
  const testTenantId = 'tenant-test-persist-gvcn';
  const testTeacherId = 'tch-test-persist-gvcn';
  const testClassId = 'class-11a3-persist';
  const testEmail = 'nguyenvanan.gv@thpt.edu.vn';
  const testCode = 'ACT-GVCN-TEST-2026';
  const testPassword = 'Password@123';
  const now = new Date().toISOString();

  // 1. Create Tenant
  tenantRepository.createOrUpdate({
    id: testTenantId,
    name: 'Không gian GVCN Nguyễn Văn An (11A3)',
    school_name: 'THPT Nguyễn Trãi',
    owner_id: testTeacherId,
    owner_email: testEmail,
    owner_name: 'Thầy Nguyễn Văn An',
    plan: 'PRO',
    status: 'ACTIVE',
    created_at: now,
    updated_at: now
  });

  // 2. Create Class Settings
  classSettingsRepository.upsert({
    tenant_id: testTenantId,
    class_id: testClassId,
    school_name: 'THPT Nguyễn Trãi',
    class_name: '11A3',
    grade: '11',
    stream: 'Tự nhiên',
    academic_year: '2025-2026',
    semester: 'HK1',
    teacher_name: 'Thầy Nguyễn Văn An',
    teacher_phone: '0912 888 999',
    teacher_email: testEmail,
    slogan: 'Đoàn kết - Sáng tạo - Thành công',
    cover_image: null,
    total_students: 0,
    theme_json: JSON.stringify({ primaryColor: '#0D9488' }),
    subjects_json: JSON.stringify([]),
    created_at: now,
    updated_at: now
  });

  // 3. Create Teacher Account
  teacherAccountRepository.createOrUpdate({
    id: testTeacherId,
    teacher_id: testTeacherId,
    tenant_id: testTenantId,
    full_name: 'Thầy Nguyễn Văn An',
    email: testEmail,
    phone: '0912 888 999',
    login_method: 'BOTH',
    status: 'ACTIVE',
    credential_version: 1,
    created_at: now,
    updated_at: now
  });

  // 4. Create Credential with Password
  credentialRepository.saveCredential({
    tenant_id: testTenantId,
    owner_id: testTeacherId,
    type: 'TEACHER',
    raw_code: testCode,
    is_test_credential: false,
    created_by: 'usr_super_admin'
  });

  credentialRepository.setPassword({
    tenantId: testTenantId,
    ownerId: testTeacherId,
    type: 'TEACHER',
    newPasswordPlain: testPassword,
    actorUserId: 'usr_super_admin'
  });

  console.log('  ✓ GVCN record, workspace, class settings, and hashed credentials created in SQLite.');

  // TEST 2 & 3 — AUTHENTICATION & LOGIN
  console.log('\n[TEST 2 & 3] Login authentication test with access code & password...');
  const authResult = credentialRepository.authenticate(testCode, testPassword, 'TEACHER');
  if (!authResult.success || !authResult.credential) {
    throw new Error(`Authentication failed for created GVCN: ${authResult.message}`);
  }
  console.log(`  ✓ Authenticated successfully as TEACHER: ${authResult.credential.owner_id}`);

  // TEST 4 & 5 — SERVER RESTART / MULTIPLE REBOOTS
  console.log('\n[TEST 4 & 5] Simulating Server Restart (re-running DB init & seed)...');
  // Re-run seedInitialData() to simulate server startup
  seedInitialData();
  seedInitialData();
  seedInitialData();

  const retrievedTenant = tenantRepository.getById(testTenantId);
  const retrievedTeacher = teacherAccountRepository.getByTeacherId(testTeacherId);
  const retrievedClass = classSettingsRepository.getByTenantAndClass(testTenantId);
  const retrievedCred = credentialRepository.findByLookupIdentifier(testCode);

  if (!retrievedTenant || !retrievedTeacher || !retrievedClass || !retrievedCred) {
    throw new Error('FAILED: Data was lost after simulated server restarts!');
  }

  if (retrievedTenant.id !== testTenantId || retrievedTeacher.teacher_id !== testTeacherId || retrievedClass.class_id !== testClassId) {
    throw new Error('FAILED: Identifiers changed after server restarts!');
  }

  console.log(`  ✓ Tenant survived restart: ${retrievedTenant.name} (ID: ${retrievedTenant.id})`);
  console.log(`  ✓ Teacher account survived restart: ${retrievedTeacher.full_name} (ID: ${retrievedTeacher.teacher_id})`);
  console.log(`  ✓ Class settings survived restart: ${retrievedClass.class_name} (ID: ${retrievedClass.class_id})`);
  console.log(`  ✓ Credential lookup survived restart: ${retrievedCred.lookup_identifier}`);

  // TEST 6 — AUTHENTICATE AFTER RESTART
  console.log('\n[TEST 6] Re-authenticating after multiple server restarts...');
  const authAfterRestart = credentialRepository.authenticate(testCode, testPassword, 'TEACHER');
  if (!authAfterRestart.success) {
    throw new Error(`Authentication failed after restart: ${authAfterRestart.message}`);
  }
  console.log('  ✓ Authentication verified after multiple server restarts.');

  // TEST 7 — INTEGRITY & BASELINE PRESERVATION
  console.log('\n[TEST 7] Verifying Baseline Data Preservation (11A1 & 12A2)...');
  const lanTenant = tenantRepository.getById('tenant-lan-nguyen');
  const namTenant = tenantRepository.getById('tenant-hoang-nam');
  const lanSettings = classSettingsRepository.getByTenantAndClass('tenant-lan-nguyen');
  const namSettings = classSettingsRepository.getByTenantAndClass('tenant-hoang-nam');
  const lanStudents = studentRepository.getAllByTenant('tenant-lan-nguyen');

  if (!lanTenant || !namTenant || !lanSettings || !namSettings) {
    throw new Error('FAILED: Baseline tenants/classes were altered or lost!');
  }

  console.log(`  ✓ 11A1 (Cô Mai Lan): ${lanTenant.name} - ${lanStudents.length} students preserved`);
  console.log(`  ✓ 12A2 (Thầy Hoàng Nam): ${namTenant.name} preserved`);

  // Clean up test record gracefully
  tenantRepository.deleteTenantPermanently(testTenantId);
  console.log('\n  ✓ Test workspace cleaned up cleanly via atomic tenant deletion.');

  console.log('\n====================================================');
  console.log('ALL P0 PERSISTENCE ACCEPTANCE TESTS PASSED (100%)');
  console.log('====================================================');
  process.exit(0);
}

runPersistenceP0Verification().catch((err) => {
  console.error('\n❌ P0 PERSISTENCE VERIFICATION FAILED:', err);
  process.exit(1);
});
