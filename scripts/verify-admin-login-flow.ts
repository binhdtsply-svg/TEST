/**
 * Automated Verification Script: Admin Dual-Credential Authentication & Preservation
 */
import { DatabaseSync } from 'node:sqlite';
import { hashSecret, verifySecret } from '../server/auth/crypto';
import { AdminAccountRepository } from '../server/repositories/AdminAccountRepository';
import { sessionRepository } from '../server/repositories/SessionRepository';
import { teacherAccountRepository } from '../server/repositories/TeacherAccountRepository';
import { credentialRepository } from '../server/repositories/CredentialRepository';
import { persistenceSyncService } from '../server/services/PersistenceSyncService';

const BASE_URL = 'http://localhost:3000';

async function runVerification() {
  console.log('====================================================================');
  console.log('KIỂM THỬ XÁC THỰC ADMIN: RECOVERY CODE + MẬT KHẨU & BẢO TOÀN DỮ LIỆU');
  console.log('====================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}${detail ? ` - ${detail}` : ''}`);
      failed++;
    }
  }

  // 1. Kiểm tra cấu hình khởi tạo Admin
  const repo = new AdminAccountRepository();
  const adminRec = repo.findByLoginIdentifier('admin');
  assert(Boolean(adminRec), 'Tài khoản Super Admin tồn tại trong database');
  assert(verifySecret('123456@', adminRec!.password_hash), 'Mật khẩu khởi tạo 123456@ khớp với password_hash');
  assert(repo.isRecoveryCodeValid(adminRec!, 'KHONGGIANCHUNHIEMSO2026'), 'Recovery Code khởi tạo KHONGGIANCHUNHIEMSO2026 hợp lệ');
  assert(adminRec!.first_time_setup_completed === 1, 'first_time_setup_completed = 1 (không bắt buộc đổi mật khẩu lần đầu)');

  // 2. Kiểm thử đăng nhập đúng cả 2 trường: Recovery Code + Password qua HTTP endpoint
  const loginSuccessRes = await fetch(`${BASE_URL}/api/v1/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      loginId: 'admin',
      password: '123456@',
      recoveryCode: 'KHONGGIANCHUNHIEMSO2026',
      rememberDevice: true
    })
  });
  const loginSuccessData = await loginSuccessRes.json();
  assert(
    loginSuccessRes.status === 200 && loginSuccessData.success === true && Boolean(loginSuccessData.token),
    'Đăng nhập Admin thành công với Recovery Code và Mật khẩu (HTTP 200, có JWT session token)'
  );
  assert(
    loginSuccessData.user?.role === 'SUPER_ADMIN',
    'Session trả về đúng role SUPER_ADMIN'
  );
  assert(
    loginSuccessData.firstTimeSetupRequired !== true,
    'Không bắt buộc đổi mật khẩu khi đăng nhập lần đầu (firstTimeSetupRequired = false)'
  );

  const adminToken = loginSuccessData.token;

  // 3. Kiểm thử sai mật khẩu nhưng đúng Recovery Code
  const wrongPassRes = await fetch(`${BASE_URL}/api/v1/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      loginId: 'admin',
      password: 'WrongPassword!@#123',
      recoveryCode: 'KHONGGIANCHUNHIEMSO2026'
    })
  });
  const wrongPassData = await wrongPassRes.json();
  assert(
    wrongPassRes.status === 401 && wrongPassData.errorCode === 'INVALID_CREDENTIALS',
    'Thử sai Mật khẩu bị từ chối với HTTP 401 và INVALID_CREDENTIALS'
  );

  // 4. Kiểm thử đúng mật khẩu nhưng sai Recovery Code
  const wrongRcRes = await fetch(`${BASE_URL}/api/v1/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      loginId: 'admin',
      password: '123456@',
      recoveryCode: 'WRONG-RC-CODE-9999'
    })
  });
  const wrongRcData = await wrongRcRes.json();
  assert(
    wrongRcRes.status === 401 && wrongRcData.errorCode === 'INVALID_CREDENTIALS',
    'Thử sai Recovery Code bị từ chối với HTTP 401 và INVALID_CREDENTIALS'
  );

  // 5. Kiểm thử thiếu Recovery Code
  const missingRcRes = await fetch(`${BASE_URL}/api/v1/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      loginId: 'admin',
      password: '123456@'
    })
  });
  assert(
    missingRcRes.status === 401,
    'Thiếu Recovery Code bị từ chối với HTTP 401'
  );

  // 6. Kiểm thử chặn tài khoản phi Admin (Giáo viên, Học sinh)
  const teacherRes = await fetch(`${BASE_URL}/api/v1/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      loginId: 'mailan.nguyen@lehongphong.edu.vn',
      password: '123456@',
      recoveryCode: 'KHONGGIANCHUNHIEMSO2026'
    })
  });
  assert(
    teacherRes.status === 403,
    'Tài khoản Giáo viên bị chặn nghiêm ngặt tại cổng Admin (/admin/login) với HTTP 403 FORBIDDEN_NOT_ADMIN'
  );

  // 7. Kiểm thử Đổi mật khẩu Admin trong chức năng quản lý bảo mật
  const changePassRes = await fetch(`${BASE_URL}/api/v1/auth/admin/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      oldPassword: '123456@',
      newPassword: 'NewAdminPassword@2026'
    })
  });
  const changePassData = await changePassRes.json();
  assert(
    changePassRes.status === 200 && changePassData.success === true,
    'Đổi mật khẩu thành công sau khi xác minh đúng mật khẩu hiện hành (HTTP 200)'
  );

  // Thử đăng nhập lại bằng mật khẩu mới
  const loginNewPassRes = await fetch(`${BASE_URL}/api/v1/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      loginId: 'admin',
      password: 'NewAdminPassword@2026',
      recoveryCode: 'KHONGGIANCHUNHIEMSO2026'
    })
  });
  const loginNewPassData = await loginNewPassRes.json();
  assert(
    loginNewPassRes.status === 200 && loginNewPassData.success === true,
    'Đăng nhập thành công với Mật khẩu mới vừa đổi'
  );

  // Đổi lại về 123456@ để giữ cấu hình mặc định chuẩn
  const revertPassRes = await fetch(`${BASE_URL}/api/v1/auth/admin/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${loginNewPassData.token}`
    },
    body: JSON.stringify({
      oldPassword: 'NewAdminPassword@2026',
      newPassword: '123456@'
    })
  });
  assert(revertPassRes.status === 200, 'Khôi phục mật khẩu về 123456@ thành công');

  // 8. Kiểm thử Đổi Recovery Code trong chức năng quản lý bảo mật
  const setRcRes = await fetch(`${BASE_URL}/api/v1/auth/admin/set-recovery-code`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${loginNewPassData.token}`
    },
    body: JSON.stringify({
      currentPassword: '123456@',
      newRecoveryCode: 'CUSTOM-RECOVERY-CODE-2026',
      confirmRecoveryCode: 'CUSTOM-RECOVERY-CODE-2026'
    })
  });
  const setRcData = await setRcRes.json();
  assert(
    setRcRes.status === 200 && setRcData.success === true,
    'Đổi Recovery Code mới thành công sau khi xác minh mật khẩu hiện hành (HTTP 200)'
  );

  // Kiểm thử đăng nhập với Recovery Code mới
  const loginNewRcRes = await fetch(`${BASE_URL}/api/v1/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      loginId: 'admin',
      password: '123456@',
      recoveryCode: 'CUSTOM-RECOVERY-CODE-2026'
    })
  });
  assert(
    loginNewRcRes.status === 200,
    'Đăng nhập thành công với Recovery Code tùy chỉnh mới'
  );

  // Đổi lại Recovery Code về mặc định KHONGGIANCHUNHIEMSO2026
  const revertRcRes = await fetch(`${BASE_URL}/api/v1/auth/admin/set-recovery-code`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${loginNewPassData.token}`
    },
    body: JSON.stringify({
      currentPassword: '123456@',
      newRecoveryCode: 'KHONGGIANCHUNHIEMSO2026',
      confirmRecoveryCode: 'KHONGGIANCHUNHIEMSO2026'
    })
  });
  assert(revertRcRes.status === 200, 'Khôi phục Recovery Code về KHONGGIANCHUNHIEMSO2026 thành công');

  // 9. Kiểm thử Mô phỏng Restart Backend (đọc lại từ database/backup không bị reset)
  const repoAfterRestart = new AdminAccountRepository();
  repoAfterRestart.ensureDefaultAdminAccount();
  const adminAfter = repoAfterRestart.findByLoginIdentifier('admin');
  assert(
    verifySecret('123456@', adminAfter!.password_hash),
    'Sau khi khởi động lại backend, mật khẩu 123456@ vẫn được lưu bền vững (không tự động reset)'
  );
  assert(
    repoAfterRestart.isRecoveryCodeValid(adminAfter!, 'KHONGGIANCHUNHIEMSO2026'),
    'Sau khi khởi động lại backend, Recovery Code KHONGGIANCHUNHIEMSO2026 vẫn được lưu bền vững'
  );

  // 10. Kiểm thử Bảo toàn dữ liệu (không suy suyển tài khoản GVCN, Học sinh, Phụ huynh, Lớp học)
  const db = new DatabaseSync('data/kgcns_master.db');
  const countStudents: any = db.prepare('SELECT COUNT(*) as c FROM students').get();
  const countTeachers: any = db.prepare('SELECT COUNT(*) as c FROM teacher_accounts').get();
  const countTenants: any = db.prepare('SELECT COUNT(*) as c FROM tenants').get();
  const countCredentials: any = db.prepare('SELECT COUNT(*) as c FROM credentials').get();

  assert(countStudents.c === 48, `Bảo toàn 100% học viên (48 học viên, hiện có ${countStudents.c})`);
  assert(countTeachers.c >= 3, `Bảo toàn 100% tài khoản GVCN (3 GVCN, hiện có ${countTeachers.c})`);
  assert(countTenants.c >= 6, `Bảo toàn 100% không gian lớp/tenant (6 tenants, hiện có ${countTenants.c})`);
  assert(countCredentials.c >= 100, `Bảo toàn 100% mã truy cập credentials (100 mã, hiện có ${countCredentials.c})`);

  console.log('\n====================================================================');
  console.log(`KẾT QUẢ TỔNG HỢP: ${passed} PASS, ${failed} FAIL`);
  console.log('====================================================================');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runVerification().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
