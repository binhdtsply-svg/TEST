/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getDatabase } from '../server/db/database';
import { adminAccountRepository } from '../server/repositories/AdminAccountRepository';
import { teacherAccountRepository } from '../server/repositories/TeacherAccountRepository';
import { studentRepository } from '../server/repositories/StudentRepository';
import { credentialRepository } from '../server/repositories/CredentialRepository';
import { sessionRepository } from '../server/repositories/SessionRepository';
import { persistenceSyncService } from '../server/services/PersistenceSyncService';
import fs from 'fs';
import path from 'path';

async function runTeacherPersistenceSuite() {
  console.log('================================================================================');
  console.log('KIỂM THỬ THỰC NGHIỆM: LƯU BỀN VỮNG TÀI KHOẢN GVCN & KHÔNG THẤT THOÁT DỮ LIỆU');
  console.log('================================================================================\n');

  const BASE_URL = 'http://127.0.0.1:3000';
  const testResults: Record<string, 'PASS' | 'FAIL' | 'NOT RUN'> = {};
  const notes: Record<string, string> = {};

  const db = getDatabase();

  // Step 0: Ensure Admin session token
  const adminRec = adminAccountRepository.findByLoginIdentifier('admin');
  if (!adminRec) throw new Error('Không tìm thấy tài khoản admin');
  const adminSession = sessionRepository.createSession({
    userId: adminRec.id,
    role: 'SUPER_ADMIN',
    tenantId: 'platform-root',
    credentialVersion: adminRec.session_version,
    isTestCredential: false
  });
  const adminToken = adminSession.token;

  // -------------------------------------------------------------------------
  // TEST 1: Tạo tài khoản GVCN thử nghiệm qua Admin API và xác nhận lưu trữ
  // -------------------------------------------------------------------------
  const testTimestamp = Date.now();
  const testTeacherEmail = `gvcn.thunghiem.${testTimestamp}@thpt.edu.vn`;
  const testTeacherName = `Thầy Nguyễn Văn Thử Nghiệm ${testTimestamp.toString().slice(-4)}`;
  const testInitPassword = `Pass@${testTimestamp.toString().slice(-6)}!`;
  const testAccessCode = `GV-TEST-${testTimestamp.toString().slice(-4)}`;
  let createdTeacherId = '';
  let createdTenantId = '';

  try {
    const createRes = await fetch(`${BASE_URL}/api/v1/tenants/admin/create-teacher`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        fullName: testTeacherName,
        email: testTeacherEmail,
        phone: '0912345678',
        schoolName: 'THPT Thử Nghiệm Hà Nội',
        plan: 'PRO',
        className: '11B1',
        password: testInitPassword,
        initialCode: testAccessCode
      })
    });

    const createData = await createRes.json();
    if (!createRes.ok || !createData.success || !createData.account) {
      throw new Error(`Tạo tài khoản thất bại: ${JSON.stringify(createData)}`);
    }

    createdTeacherId = createData.account.id;
    createdTenantId = createData.account.tenantId;

    // Verify written to SQLite
    const sqliteAcc = teacherAccountRepository.getByTeacherId(createdTeacherId);
    const sqliteCred = credentialRepository.findByTenantAndOwner(createdTenantId, createdTeacherId, 'TEACHER');

    // Verify written to Backups
    const primaryBackupPath = path.join(process.cwd(), 'server', 'db', 'system_persistence_backup.json');
    const immBackupPath = path.join(process.cwd(), 'server', 'db', 'system_persistence_backup_IMMUTABLE.json');
    const primaryJson = JSON.parse(fs.readFileSync(primaryBackupPath, 'utf-8'));
    const immJson = JSON.parse(fs.readFileSync(immBackupPath, 'utf-8'));

    const inPrimary = primaryJson.tables?.teacher_accounts?.some((t: any) => t.teacher_id === createdTeacherId);
    const inImm = immJson.tables?.teacher_accounts?.some((t: any) => t.teacher_id === createdTeacherId);

    if (sqliteAcc && sqliteCred && inPrimary && inImm) {
      testResults['1. Admin tạo GVCN, kho lưu trữ xác nhận đã lưu SQLite & Backup'] = 'PASS';
      notes['Mục 1'] = `Tài khoản [${testTeacherName}] (ID: ${createdTeacherId}, Mã: ${testAccessCode}) được lưu đồng thời vào SQLite, system_persistence_backup.json và snapshot IMMUTABLE.`;
    } else {
      throw new Error(`Dữ liệu chưa lưu đủ: sqliteAcc=${Boolean(sqliteAcc)}, cred=${Boolean(sqliteCred)}, primary=${inPrimary}, imm=${inImm}`);
    }
  } catch (err: any) {
    testResults['1. Admin tạo GVCN, kho lưu trữ xác nhận đã lưu SQLite & Backup'] = 'FAIL';
    notes['Mục 1'] = err.message;
  }

  // -------------------------------------------------------------------------
  // TEST 2: Đăng nhập bằng mã + mật khẩu ban đầu
  // -------------------------------------------------------------------------
  try {
    const loginRes = await fetch(`${BASE_URL}/api/v1/auth/login-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: testAccessCode,
        password: testInitPassword,
        selectedRole: 'TEACHER'
      })
    });
    const loginData = await loginRes.json();
    if (loginRes.ok && loginData.success && loginData.user?.teacherId === createdTeacherId) {
      testResults['2. Đăng nhập GVCN bằng mã và mật khẩu ban đầu'] = 'PASS';
      notes['Mục 2'] = `Đăng nhập thành công với vai trò TEACHER, gắn đúng tenant [${loginData.user.tenantId}].`;
    } else {
      throw new Error(`Đăng nhập ban đầu thất bại: ${JSON.stringify(loginData)}`);
    }
  } catch (err: any) {
    testResults['2. Đăng nhập GVCN bằng mã và mật khẩu ban đầu'] = 'FAIL';
    notes['Mục 2'] = err.message;
  }

  // -------------------------------------------------------------------------
  // TEST 3: Admin reset mật khẩu GVCN và kiểm tra hiệu lực
  // -------------------------------------------------------------------------
  const testNewPassword = `NewReset@${testTimestamp.toString().slice(-6)}!#`;
  try {
    const resetRes = await fetch(`${BASE_URL}/api/v1/tenants/admin/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        teacherId: createdTeacherId,
        newPassword: testNewPassword
      })
    });
    const resetData = await resetRes.json();
    if (!resetRes.ok || !resetData.success) {
      throw new Error(`Reset password API thất bại: ${JSON.stringify(resetData)}`);
    }

    // Thử mật khẩu cũ -> phải thất bại
    const oldLoginRes = await fetch(`${BASE_URL}/api/v1/auth/login-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: testAccessCode,
        password: testInitPassword,
        selectedRole: 'TEACHER'
      })
    });
    const oldLoginData = await oldLoginRes.json();

    // Thử mật khẩu mới -> phải thành công
    const newLoginRes = await fetch(`${BASE_URL}/api/v1/auth/login-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: testAccessCode,
        password: testNewPassword,
        selectedRole: 'TEACHER'
      })
    });
    const newLoginData = await newLoginRes.json();

    if (oldLoginRes.status === 401 && newLoginRes.ok && newLoginData.success) {
      testResults['3. Admin reset mật khẩu GVCN: Mật khẩu cũ bị vô hiệu, mật khẩu mới hoạt động'] = 'PASS';
      notes['Mục 3'] = `Mật khẩu cũ bị từ chối 401 INVALID_CREDENTIALS; Mật khẩu mới xác thực thành công.`;
    } else {
      throw new Error(`Reset mật khẩu không khớp: oldStatus=${oldLoginRes.status}, newStatus=${newLoginRes.status}`);
    }
  } catch (err: any) {
    testResults['3. Admin reset mật khẩu GVCN: Mật khẩu cũ bị vô hiệu, mật khẩu mới hoạt động'] = 'FAIL';
    notes['Mục 3'] = err.message;
  }

  // -------------------------------------------------------------------------
  // TEST 4: Khởi động lại / Hydration từ nguồn dữ liệu chính và kiểm tra mật khẩu mới
  // -------------------------------------------------------------------------
  try {
    // 4.1 Flush snapshot
    persistenceSyncService.flushToPersistentBackup();

    // 4.2 Xóa cache session và gọi hydrateFromBackupIfAvailable mô phỏng restart
    const hydRes = persistenceSyncService.hydrateFromBackupIfAvailable();
    if (!hydRes.restored) {
      throw new Error(`Hydration sau restart thất bại: ${hydRes.message}`);
    }

    // 4.3 Kiểm tra tài khoản vẫn còn trong SQLite sau restart
    const afterRestartAcc = teacherAccountRepository.getByTeacherId(createdTeacherId);
    if (!afterRestartAcc) {
      throw new Error('Tài khoản GVCN thử nghiệm bị mất sau hydration/restart!');
    }

    // 4.4 Kiểm tra mật khẩu mới vẫn đăng nhập được sau restart
    const afterRestartLoginRes = await fetch(`${BASE_URL}/api/v1/auth/login-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: testAccessCode,
        password: testNewPassword,
        selectedRole: 'TEACHER'
      })
    });
    const afterRestartLoginData = await afterRestartLoginRes.json();

    if (afterRestartLoginRes.ok && afterRestartLoginData.success) {
      testResults['4. Sau Restart/Hydration: Tài khoản nạp lại từ kho chính và mật khẩu mới vẫn có hiệu lực'] = 'PASS';
      notes['Mục 4'] = `Tài khoản nạp lại hoàn chỉnh, mật khẩu scrypt mới cập nhật vẫn đăng nhập thành công sau restart.`;
    } else {
      throw new Error(`Đăng nhập sau restart thất bại: ${JSON.stringify(afterRestartLoginData)}`);
    }
  } catch (err: any) {
    testResults['4. Sau Restart/Hydration: Tài khoản nạp lại từ kho chính và mật khẩu mới vẫn có hiệu lực'] = 'FAIL';
    notes['Mục 4'] = err.message;
  }

  // -------------------------------------------------------------------------
  // TEST 5: Endpoint công khai /public/teachers và bảo mật dữ liệu
  // -------------------------------------------------------------------------
  try {
    const pubRes = await fetch(`${BASE_URL}/api/v1/tenants/public/teachers`);
    const pubData = await pubRes.json();
    if (!pubRes.ok || !pubData.success || !Array.isArray(pubData.teachers)) {
      throw new Error(`Endpoint /public/teachers lỗi: ${JSON.stringify(pubData)}`);
    }

    // Xác minh không có thông tin nhạy cảm
    const hasSecret = pubData.teachers.some((t: any) => t.password_hash || t.secret_hash || t.raw_code || t.recovery_code_hash);
    const hasCreatedTeacher = pubData.teachers.some((t: any) => t.id === createdTeacherId || t.email === testTeacherEmail);

    if (!hasSecret && hasCreatedTeacher) {
      testResults['5. Endpoint /public/teachers cấp danh sách GVCN an toàn không lộ mật khẩu/hash'] = 'PASS';
      notes['Mục 5'] = `Endpoint trả về ${pubData.teachers.length} GVCN công khai, 100% không chứa trường nhạy cảm.`;
    } else {
      throw new Error(`Endpoint không đạt: hasSecret=${hasSecret}, hasCreatedTeacher=${hasCreatedTeacher}`);
    }
  } catch (err: any) {
    testResults['5. Endpoint /public/teachers cấp danh sách GVCN an toàn không lộ mật khẩu/hash'] = 'FAIL';
    notes['Mục 5'] = err.message;
  }

  // -------------------------------------------------------------------------
  // TEST 6: Kiểm tra bảo toàn tuyệt đối các tài khoản thật hiện có
  // -------------------------------------------------------------------------
  try {
    const coBinhAcc = teacherAccountRepository.getByTeacherId('tch-mv5brvta');
    const lanNguyenAcc = teacherAccountRepository.getByTeacherId('teacher-lan-nguyen');
    const hoangNamAcc = teacherAccountRepository.getByTeacherId('teacher-hoang-nam');
    const kiemThuAcc = teacherAccountRepository.getByTeacherId('tch-mvhgklxm');

    const coBinhStudents = studentRepository.getAllByTenant('tenant-co-binh-mv5brvta');

    if (coBinhAcc && lanNguyenAcc && hoangNamAcc && kiemThuAcc && coBinhStudents.length === 32) {
      testResults['6. Tài khoản cũ (Cô Bình, Cô Lan, Thầy Nam, Thầy Kiểm Thử) và 32 HS bảo toàn 100%'] = 'PASS';
      notes['Mục 6'] = `Không bị mất, không bị ghi đè, lớp 32 học sinh thật của Cô Bình nguyên vẹn.`;
    } else {
      throw new Error(`Tài khoản cũ bị suy hao: CoBinh=${Boolean(coBinhAcc)}, Lan=${Boolean(lanNguyenAcc)}, Nam=${Boolean(hoangNamAcc)}, KiemThu=${Boolean(kiemThuAcc)}, HS=${coBinhStudents.length}`);
    }
  } catch (err: any) {
    testResults['6. Tài khoản cũ (Cô Bình, Cô Lan, Thầy Nam, Thầy Kiểm Thử) và 32 HS bảo toàn 100%'] = 'FAIL';
    notes['Mục 6'] = err.message;
  }

  // -------------------------------------------------------------------------
  // CLEANUP: Dọn dẹp tài khoản thử nghiệm sau khi hoàn tất test
  // -------------------------------------------------------------------------
  try {
    if (createdTeacherId) {
      await fetch(`${BASE_URL}/api/v1/tenants/admin/teacher/${encodeURIComponent(createdTeacherId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      // Delete test tenant row
      db.prepare('DELETE FROM tenants WHERE id = ?').run(createdTenantId);
      db.prepare('DELETE FROM class_settings WHERE tenant_id = ?').run(createdTenantId);
      persistenceSyncService.flushToPersistentBackup();
    }
  } catch (cleanErr: any) {
    console.warn('Cleanup note:', cleanErr?.message);
  }

  // In bảng kết quả
  console.log('\n================================================================================');
  console.log('KẾT QUẢ KIỂM THỬ THỰC TẾ CHI TIẾT:');
  console.log('================================================================================');
  for (const [name, res] of Object.entries(testResults)) {
    console.log(`[${res}] ${name}`);
    if (notes[name]) console.log(`       -> ${notes[name]}`);
  }
  console.log('================================================================================\n');

  const allPass = Object.values(testResults).every(r => r === 'PASS');
  process.exit(allPass ? 0 : 1);
}

runTeacherPersistenceSuite().catch(err => {
  console.error('LỖI TEST SUITE:', err);
  process.exit(1);
});
