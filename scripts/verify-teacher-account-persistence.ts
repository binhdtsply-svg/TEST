/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

async function runTeacherPersistenceVerification() {
  console.log('================================================================');
  console.log('BÀI KIỂM THỬ XÁC MINH BỀN VỮNG TÀI KHOẢN GVCN (TEST PERSISTENCE)');
  console.log('================================================================');

  const BASE_URL = 'http://localhost:3000';
  const dbPath = path.join(process.cwd(), 'data', 'kgcns_master.db');

  // Test 1: Lấy danh sách tài khoản hiện hữu trước khi kiểm thử
  console.log('\n[PHÉP THỬ 1] Đối chiếu tài khoản ban đầu trong cơ sở dữ liệu SQLite...');
  const dbBefore = new DatabaseSync(dbPath);
  const teachersBefore = dbBefore.prepare('SELECT id, teacher_id, tenant_id, full_name, email FROM teacher_accounts').all() as any[];
  console.log(`  -> Số lượng tài khoản GVCN ban đầu: ${teachersBefore.length}`);
  teachersBefore.forEach((t, i) => {
    console.log(`     [${i + 1}] ID=${t.teacher_id} | Tên=${t.full_name} | Email=${t.email}`);
  });

  if (teachersBefore.length < 2) {
    throw new Error('FAIL: Không tìm thấy tài khoản GVCN mẫu ban đầu');
  }
  console.log('  ✓ ĐẠT (PASS): Đã ghi nhận tài khoản ban đầu an toàn.');

  // Test 2: Đăng nhập Super Admin để lấy session token
  console.log('\n[PHÉP THỬ 2] Đăng nhập Admin và lấy token xác thực phiên...');
  const adminLoginRes = await fetch(`${BASE_URL}/api/v1/auth/login-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: 'ADM-MASTER-2025', selectedRole: 'ADMIN' })
  });
  const adminLoginData = await adminLoginRes.json();
  if (!adminLoginRes.ok || !adminLoginData.success || !adminLoginData.token) {
    throw new Error(`FAIL: Không thể đăng nhập Admin (${JSON.stringify(adminLoginData)})`);
  }
  const adminToken = adminLoginData.token;
  console.log(`  ✓ ĐẠT (PASS): Admin đăng nhập thành công. Token: ${adminToken.substring(0, 25)}...`);

  // Test 3: Tạo tài khoản GVCN thử nghiệm riêng
  console.log('\n[PHÉP THỬ 3] Tạo tài khoản GVCN thử nghiệm riêng qua API chính thức...');
  const testEmail = `gvcn.kiemthu.${Date.now()}@thpt.edu.vn`;
  const testFullName = 'Thầy Vũ Đình Kiểm Thử';
  const testSchool = 'THPT Chuyên Thực Nghiệm Sư Phạm';
  const testClass = '11A8';
  const testCode = `GV-KT-${Date.now().toString(36).toUpperCase()}`;
  const testPassword = 'PasswordTest@2026';

  const createRes = await fetch(`${BASE_URL}/api/v1/tenants/admin/create-teacher`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      fullName: testFullName,
      email: testEmail,
      phone: '0912987654',
      schoolName: testSchool,
      className: testClass,
      initialCode: testCode,
      password: testPassword,
      plan: 'PRO'
    })
  });
  const createData = await createRes.json();
  if (!createRes.ok || !createData.success || !createData.account) {
    throw new Error(`FAIL: Không thể tạo tài khoản GVCN qua API (${JSON.stringify(createData)})`);
  }
  const createdTeacherId = createData.account.id;
  const createdTenantId = createData.account.tenantId;
  console.log(`  ✓ ĐẠT (PASS): Tạo tài khoản GVCN thành công.`);
  console.log(`     -> ID: ${createdTeacherId}`);
  console.log(`     -> Tenant ID: ${createdTenantId}`);
  console.log(`     -> Mã đăng nhập: ${testCode}`);
  console.log(`     -> Email: ${testEmail}`);

  // Test 4: Xác nhận ghi dữ liệu trực tiếp trong SQLite
  console.log('\n[PHÉP THỬ 4] Xác nhận ghi dữ liệu trực tiếp trong CSDL SQLite vật lý (kgcns_master.db)...');
  const dbVerify = new DatabaseSync(dbPath);
  const foundTeacher = dbVerify.prepare('SELECT * FROM teacher_accounts WHERE email = ?').get(testEmail) as any;
  const foundTenant = dbVerify.prepare('SELECT * FROM tenants WHERE id = ?').get(createdTenantId) as any;
  const foundCred = dbVerify.prepare('SELECT * FROM credentials WHERE tenant_id = ? AND lookup_identifier = ?').get(createdTenantId, testCode) as any;
  const foundClass = dbVerify.prepare('SELECT * FROM class_settings WHERE tenant_id = ?').get(createdTenantId) as any;

  if (!foundTeacher) throw new Error('FAIL: Không tìm thấy teacher_account trong bảng SQLite');
  if (!foundTenant) throw new Error('FAIL: Không tìm thấy tenant trong bảng SQLite');
  if (!foundCred) throw new Error('FAIL: Không tìm thấy credential trong bảng SQLite');
  if (!foundClass) throw new Error('FAIL: Không tìm thấy class_setting trong bảng SQLite');

  console.log(`  ✓ ĐẠT (PASS): Xác nhận dữ liệu đã được ghi vào 4 bảng SQLite:`);
  console.log(`     + teacher_accounts: teacher_id=${foundTeacher.teacher_id}, email=${foundTeacher.email}`);
  console.log(`     + tenants: id=${foundTenant.id}, school_name=${foundTenant.school_name}`);
  console.log(`     + credentials: lookup_identifier=${foundCred.lookup_identifier}, has_hash=${Boolean(foundCred.password_hash)}`);
  console.log(`     + class_settings: class_name=${foundClass.class_name}, school_name=${foundClass.school_name}`);

  // Test 5: Mô phỏng tải lại trang (Re-fetch danh sách từ server)
  console.log('\n[PHÉP THỬ 5] Mô phỏng tải lại trang (Gọi lại GET /api/v1/tenants/admin/teachers)...');
  const teachersListRes = await fetch(`${BASE_URL}/api/v1/tenants/admin/teachers`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const teachersListData = await teachersListRes.json();
  if (!teachersListRes.ok || !teachersListData.success || !Array.isArray(teachersListData.teachers)) {
    throw new Error('FAIL: Không thể lấy danh sách giáo viên từ server');
  }
  const matchedInList = teachersListData.teachers.find((t: any) => t.email === testEmail);
  if (!matchedInList) {
    throw new Error('FAIL: Tài khoản vừa tạo không xuất hiện trong danh sách khi tải lại');
  }
  console.log(`  ✓ ĐẠT (PASS): Danh sách GVCN từ máy chủ hiển thị tài khoản vừa tạo: ${matchedInList.fullName} (${matchedInList.email})`);

  // Test 6: Đăng xuất Admin và Đăng nhập lại Admin
  console.log('\n[PHÉP THỬ 6] Đăng xuất Admin, xóa phiên và đăng nhập lại Admin...');
  await fetch(`${BASE_URL}/api/v1/auth/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  console.log('  -> Đã đăng xuất session cũ.');

  const reLoginRes = await fetch(`${BASE_URL}/api/v1/auth/login-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: 'ADM-MASTER-2025', selectedRole: 'ADMIN' })
  });
  const reLoginData = await reLoginRes.json();
  const newAdminToken = reLoginData.token;

  const reListRes = await fetch(`${BASE_URL}/api/v1/tenants/admin/teachers`, {
    headers: { Authorization: `Bearer ${newAdminToken}` }
  });
  const reListData = await reListRes.json();
  const reMatched = reListData.teachers.find((t: any) => t.email === testEmail);
  if (!reMatched) {
    throw new Error('FAIL: Tài khoản bị mất sau khi Admin đăng xuất và đăng nhập lại');
  }
  console.log(`  ✓ ĐẠT (PASS): Tài khoản vẫn tồn tại nguyên vẹn sau khi đăng xuất/đăng nhập lại: ${reMatched.fullName}`);

  // Test 7: Đăng nhập bằng chính tài khoản GVCN vừa tạo qua Cổng Người Dùng
  console.log('\n[PHÉP THỬ 7] Đăng nhập bằng chính tài khoản GVCN vừa tạo qua Cổng Người Dùng (Mã + Mật khẩu)...');
  const teacherLoginRes = await fetch(`${BASE_URL}/api/v1/auth/login-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: testCode,
      password: testPassword,
      selectedRole: 'TEACHER'
    })
  });
  const teacherLoginData = await teacherLoginRes.json();
  if (!teacherLoginRes.ok || !teacherLoginData.success || !teacherLoginData.user) {
    throw new Error(`FAIL: GVCN không thể đăng nhập bằng thông tin đã cấp: ${JSON.stringify(teacherLoginData)}`);
  }
  console.log(`  ✓ ĐẠT (PASS): GVCN đăng nhập thành công vào Không gian lớp học.`);
  console.log(`     -> Vai trò: ${teacherLoginData.user.role}`);
  console.log(`     -> Tên: ${teacherLoginData.user.fullName}`);
  console.log(`     -> Tenant ID: ${teacherLoginData.user.tenantId}`);

  // Test 8: Kiểm tra trạng thái tồn tại sau khi re-read DB đĩa
  console.log('\n[PHÉP THỬ 8] Xác nhận độc lập trực tiếp từ CSDL đĩa...');
  const dbFinal = new DatabaseSync(dbPath);
  const finalTeacher = dbFinal.prepare('SELECT * FROM teacher_accounts WHERE email = ?').get(testEmail) as any;
  if (!finalTeacher) {
    throw new Error('FAIL: Tài khoản không tìm thấy trong DB đĩa');
  }
  console.log(`  ✓ ĐẠT (PASS): Tài khoản GVCN ${finalTeacher.full_name} (${finalTeacher.email}) tồn tại bền vững trên đĩa.`);

  // Test 9: Dọn dẹp tài khoản kiểm thử và bảo toàn dữ liệu thật
  console.log('\n[PHÉP THỬ 9] Dọn dẹp tài khoản thử nghiệm riêng & đối chiếu tài khoản gốc...');
  dbFinal.prepare('DELETE FROM credentials WHERE tenant_id = ?').run(createdTenantId);
  dbFinal.prepare('DELETE FROM class_settings WHERE tenant_id = ?').run(createdTenantId);
  dbFinal.prepare('DELETE FROM teacher_accounts WHERE tenant_id = ?').run(createdTenantId);
  dbFinal.prepare('DELETE FROM tenants WHERE id = ?').run(createdTenantId);

  const teachersAfter = dbFinal.prepare('SELECT id, teacher_id, tenant_id, full_name, email FROM teacher_accounts').all() as any[];
  console.log(`  -> Số lượng tài khoản GVCN sau khi dọn dẹp: ${teachersAfter.length}`);
  teachersAfter.forEach((t, i) => {
    console.log(`     [${i + 1}] ID=${t.teacher_id} | Tên=${t.full_name} | Email=${t.email}`);
  });

  // Verify accounts match before and after
  if (teachersBefore.length !== teachersAfter.length) {
    throw new Error(`FAIL: Số lượng tài khoản trước (${teachersBefore.length}) và sau (${teachersAfter.length}) không khớp!`);
  }
  for (let i = 0; i < teachersBefore.length; i++) {
    if (teachersBefore[i].teacher_id !== teachersAfter[i].teacher_id) {
      throw new Error(`FAIL: Tài khoản ${teachersBefore[i].teacher_id} bị thay đổi!`);
    }
  }
  console.log('  ✓ ĐẠT (PASS): 100% tài khoản gốc (Cô Mai Lan, Thầy Hoàng Nam) được bảo toàn nguyên vẹn.');

  console.log('\n================================================================');
  console.log('TẤT CẢ 9 PHÉP THỬ ĐỀU ĐẠT CHUẨN XÁC — DỮ LIỆU ĐƯỢC BẢO TOÀN TUYỆT ĐỐI');
  console.log('================================================================');
}

runTeacherPersistenceVerification().catch(err => {
  console.error('\nLỖI TRONG QUÁ TRÌNH KIỂM THỬ:', err);
  process.exit(1);
});
