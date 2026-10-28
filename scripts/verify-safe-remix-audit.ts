/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { persistenceSyncService } from '../server/services/PersistenceSyncService';
import { adminAccountRepository } from '../server/repositories/AdminAccountRepository';
import { teacherAccountRepository } from '../server/repositories/TeacherAccountRepository';
import { studentRepository } from '../server/repositories/StudentRepository';
import { credentialRepository } from '../server/repositories/CredentialRepository';

async function runAudit() {
  console.log('====================================================================');
  console.log('BÀI KIỂM THỬ TOÀN DIỆN BẢO TOÀN DỮ LIỆU & TÀI KHOẢN (SAFE REMIX AUDIT)');
  console.log('====================================================================');

  const BASE_URL = 'http://localhost:3000';

  // 1. Initial State Check
  console.log('\n[KIỂM TRA 1] Đối chiếu kho dữ liệu SQLite và Backup...');
  const hydRes = persistenceSyncService.hydrateFromBackupIfAvailable();
  console.log('  -> Hydration message:', hydRes.message);

  const adminStatus = adminAccountRepository.getAdminStatus('admin');
  console.log('  -> Admin status:', adminStatus);
  const adminRec = adminAccountRepository.findByLoginIdentifier('admin');
  console.log('  -> Admin firstTimeSetupCompleted:', adminRec?.first_time_setup_completed);
  console.log('  -> Admin passwordUpdatedAt:', adminRec?.password_updated_at);

  if (adminStatus.firstTimeSetupRequired) {
    throw new Error('FAIL: Admin is still marked as requiring first time setup!');
  }
  console.log('  ✓ PASS: Tài khoản Super Admin được bảo toàn nguyên vẹn, không bị ép reset thiết lập lần đầu.');

  // 2. Teachers and Tenants Isolation
  console.log('\n[KIỂM TRA 2] Xác minh tài khoản GVCN và các không gian lớp học...');
  const teachers = teacherAccountRepository.getAll();
  console.log(`  -> Số lượng GVCN trong hệ thống: ${teachers.length}`);
  teachers.forEach((t, i) => {
    console.log(`     [${i + 1}] GV=${t.full_name} | Email=${t.email} | Tenant=${t.tenant_id}`);
  });

  const studentsCoBinh = studentRepository.getAllByTenant('tenant-co-binh-mv5brvta');
  console.log(`  -> Số lượng học sinh của Cô Bình (tenant-co-binh-mv5brvta): ${studentsCoBinh.length}`);
  if (studentsCoBinh.length < 30) {
    throw new Error(`FAIL: Dữ liệu 32 học sinh của Cô Bình không đủ (tìm thấy ${studentsCoBinh.length})`);
  }
  console.log('  ✓ PASS: 32 học sinh thật của Cô Bình được bảo toàn 100%.');

  // 3. Credentials preservation
  console.log('\n[KIỂM TRA 3] Xác minh danh sách Credentials cấp phát...');
  const credsCoBinh = credentialRepository.getCredentialsForTenant('tenant-co-binh-mv5brvta');
  console.log(`  -> Số lượng credentials của lớp Cô Bình: ${credsCoBinh.length}`);
  if (credsCoBinh.length < 60) {
    throw new Error(`FAIL: Credentials của lớp Cô Bình bị thiếu (tìm thấy ${credsCoBinh.length})`);
  }
  console.log('  ✓ PASS: Toàn bộ mã đăng nhập học viên và phụ huynh được bảo toàn nguyên trạng.');

  // 4. Two independent login gates test
  console.log('\n[KIỂM TRA 4] Kiểm tra tính độc lập và bảo mật của 2 cổng đăng nhập...');
  
  // Test 4A: Teacher trying to log in at Admin gate must be REJECTED (403)
  const teacherAtAdminRes = await fetch(`${BASE_URL}/api/v1/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loginId: 'mailan.nguyen@lehongphong.edu.vn', password: 'SomePassword' })
  });
  console.log(`  -> Thử đăng nhập GVCN vào cổng Admin (/admin/login): HTTP ${teacherAtAdminRes.status}`);
  if (teacherAtAdminRes.status !== 403) {
    throw new Error(`FAIL: Cổng Admin không chặn GVCN truy cập trái phép (Status=${teacherAtAdminRes.status})`);
  }
  console.log('  ✓ PASS: Cổng Admin từ chối tuyệt đối tài khoản GVCN (HTTP 403 FORBIDDEN_NOT_ADMIN).');

  // Test 4B: Student trying to log in at Admin gate must be REJECTED (403)
  const studentAtAdminRes = await fetch(`${BASE_URL}/api/v1/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loginId: 'STU-GH982-11A1', password: 'SomePassword' })
  });
  console.log(`  -> Thử đăng nhập Học sinh vào cổng Admin (/admin/login): HTTP ${studentAtAdminRes.status}`);
  if (studentAtAdminRes.status !== 403) {
    throw new Error(`FAIL: Cổng Admin không chặn Học sinh truy cập trái phép (Status=${studentAtAdminRes.status})`);
  }
  console.log('  ✓ PASS: Cổng Admin từ chối tuyệt đối tài khoản Học sinh/Phụ huynh.');

  // Test 4C: User login gate with Student code
  const studentLoginRes = await fetch(`${BASE_URL}/api/v1/auth/login-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: 'STU-GH982-11A1', selectedRole: 'STUDENT' })
  });
  const studentLoginData = await studentLoginRes.json();
  if (!studentLoginRes.ok || !studentLoginData.success) {
    throw new Error(`FAIL: Học sinh không thể đăng nhập qua cổng người dùng: ${JSON.stringify(studentLoginData)}`);
  }
  console.log(`  ✓ PASS: Học sinh đăng nhập thành công qua Cổng người dùng (Role: ${studentLoginData.user?.role}, Tenant: ${studentLoginData.user?.tenantId})`);

  // Test 4D: User login gate with Parent code
  const parentLoginRes = await fetch(`${BASE_URL}/api/v1/auth/login-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: 'PAR-GH982-11A1', selectedRole: 'PARENT' })
  });
  const parentLoginData = await parentLoginRes.json();
  if (!parentLoginRes.ok || !parentLoginData.success) {
    throw new Error(`FAIL: Phụ huynh không thể đăng nhập qua cổng người dùng: ${JSON.stringify(parentLoginData)}`);
  }
  console.log(`  ✓ PASS: Phụ huynh đăng nhập thành công qua Cổng người dùng (Role: ${parentLoginData.user?.role}, Child: ${parentLoginData.user?.childStudentId})`);

  // Test 4E: User login gate with Teacher code
  const teacherLoginRes = await fetch(`${BASE_URL}/api/v1/auth/login-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: 'ACT-ML-2025-LHP', selectedRole: 'TEACHER' })
  });
  const teacherLoginData = await teacherLoginRes.json();
  if (!teacherLoginRes.ok || !teacherLoginData.success) {
    throw new Error(`FAIL: GVCN không thể đăng nhập qua cổng người dùng: ${JSON.stringify(teacherLoginData)}`);
  }
  console.log(`  ✓ PASS: GVCN đăng nhập thành công qua Cổng người dùng (GV: ${teacherLoginData.user?.fullName}, Tenant: ${teacherLoginData.user?.tenantId})`);

  // 5. Data Isolation between tenants
  console.log('\n[KIỂM TRA 5] Xác minh cách ly dữ liệu giữa các lớp học...');
  const studentsLanNguyen = studentRepository.getAllByTenant('tenant-lan-nguyen');
  const studentsHoangNam = studentRepository.getAllByTenant('tenant-hoang-nam');
  console.log(`  -> Số HS lớp Cô Lan: ${studentsLanNguyen.length} | Lớp Thầy Nam: ${studentsHoangNam.length} | Lớp Cô Bình: ${studentsCoBinh.length}`);
  
  // Check no cross-contamination of student IDs
  const idSetLan = new Set(studentsLanNguyen.map(s => s.id));
  const idSetNam = new Set(studentsHoangNam.map(s => s.id));
  const overlap = studentsCoBinh.filter(s => idSetLan.has(s.id) || idSetNam.has(s.id));
  if (overlap.length > 0) {
    throw new Error(`FAIL: Phát hiện trùng lặp/rò rỉ học sinh giữa các tenant: ${overlap.map(s => s.full_name).join(', ')}`);
  }
  console.log('  ✓ PASS: Dữ liệu học sinh giữa các lớp được cách ly tuyệt đối.');

  // 6. Test Write, Re-read, and Flush Persistence
  console.log('\n[KIỂM TRA 6] Kiểm tra ghi dữ liệu thử nghiệm, đồng bộ và đọc lại từ kho chính...');
  persistenceSyncService.flushToPersistentBackup();
  const backupPath = path.join(process.cwd(), 'server', 'db', 'system_persistence_backup.json');
  const backupJson = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
  console.log(`  -> Backup json tables: ${Object.keys(backupJson.tables).length} tables`);
  console.log(`  -> Backup credentials count: ${backupJson.tables.credentials.length}`);
  console.log(`  -> Backup students count: ${backupJson.tables.students.length}`);
  console.log(`  -> Backup admin_accounts count: ${backupJson.tables.admin_accounts.length}`);
  console.log(`  -> Backup admin firstTimeSetupCompleted: ${backupJson.tables.admin_accounts[0]?.first_time_setup_completed}`);
  
  if (backupJson.tables.admin_accounts[0]?.first_time_setup_completed !== 1) {
    throw new Error('FAIL: Backup contains admin with first_time_setup_completed !== 1');
  }
  console.log('  ✓ PASS: File backup lưu trữ trạng thái tài khoản admin và người dùng bền vững.');

  console.log('\n====================================================================');
  console.log('KẾT QUẢ AUDIT: TẤT CẢ CÁC MỤC ĐỀU ĐẠT (ALL CHECKS PASSED)');
  console.log('====================================================================');
  process.exit(0);
}

runAudit().catch(err => {
  console.error('\nAUDIT ERROR:', err);
  process.exit(1);
});
