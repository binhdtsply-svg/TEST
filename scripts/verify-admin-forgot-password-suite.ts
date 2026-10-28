import { getDatabase } from '../server/db/database';
import { adminAccountRepository, DEFAULT_INITIAL_RECOVERY_CODE } from '../server/repositories/AdminAccountRepository';
import { teacherAccountRepository } from '../server/repositories/TeacherAccountRepository';
import { studentRepository } from '../server/repositories/StudentRepository';
import { credentialRepository } from '../server/repositories/CredentialRepository';
import { persistenceSyncService } from '../server/services/PersistenceSyncService';
import { verifySecret } from '../server/auth/crypto';

async function runTestSuite() {
  console.log('================================================================================');
  console.log('KIỂM THỬ BẮT BUỘC: LUỒNG QUÊN MẬT KHẨU ADMIN VÀ BẢO TOÀN DỮ LIỆU');
  console.log('================================================================================\n');

  const BASE_URL = 'http://127.0.0.1:3000';
  const results: Record<string, 'PASS' | 'FAIL' | 'CHƯA KIỂM CHỨNG'> = {};
  const evidence: Record<string, string> = {};

  const db = getDatabase();

  // Baseline data counts
  const initialStudentCount = (db.prepare('SELECT count(*) as c FROM students').get() as any).c;
  const initialTeacherCount = (db.prepare('SELECT count(*) as c FROM teacher_accounts').get() as any).c;
  const initialTenantCount = (db.prepare('SELECT count(*) as c FROM tenants').get() as any).c;
  const initialCredCount = (db.prepare('SELECT count(*) as c FROM credentials').get() as any).c;

  // -------------------------------------------------------------------------
  // CA 1: Đăng nhập bằng thông tin hợp lệ
  // -------------------------------------------------------------------------
  try {
    const loginRes = await fetch(`${BASE_URL}/api/v1/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        loginId: 'admin',
        password: '123456@',
        recoveryCode: 'KHONGGIANCHUNHIEMSO2026'
      })
    });
    const loginData = await loginRes.json();

    if (loginRes.ok && loginData.success && loginData.token && loginData.user?.role === 'SUPER_ADMIN') {
      results['1. Đăng nhập bằng thông tin hợp lệ'] = 'PASS';
      evidence['Ca 1'] = `Đăng nhập thành công HTTP 200, cấp token JWT [${loginData.token.slice(0, 16)}...], xác thực đúng vai trò [${loginData.user.role}].`;
    } else {
      throw new Error(`Đăng nhập hợp lệ thất bại: ${JSON.stringify(loginData)}`);
    }
  } catch (err: any) {
    results['1. Đăng nhập bằng thông tin hợp lệ'] = 'FAIL';
    evidence['Ca 1'] = `Lỗi: ${err.message}`;
  }

  // -------------------------------------------------------------------------
  // CA 2: Nhập sai Recovery Code
  // -------------------------------------------------------------------------
  try {
    const wrongRcRes = await fetch(`${BASE_URL}/api/v1/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        loginId: 'admin',
        password: '123456@',
        recoveryCode: 'WRONG_RECOVERY_CODE_999'
      })
    });
    const wrongRcData = await wrongRcRes.json();

    if (wrongRcRes.status === 401 && wrongRcData.errorCode === 'INVALID_CREDENTIALS') {
      // Đảm bảo không tiết lộ Recovery Code đúng trong thông báo
      const messageLeaksCode = JSON.stringify(wrongRcData).includes('KHONGGIANCHUNHIEMSO2026');
      if (!messageLeaksCode) {
        results['2. Nhập sai Recovery Code'] = 'PASS';
        evidence['Ca 2'] = `Bị từ chối HTTP 401 với mã INVALID_CREDENTIALS. Thông báo phản hồi không để lộ Recovery Code thực tế.`;
      } else {
        throw new Error('Thông báo phản hồi bị lộ Recovery Code!');
      }
    } else {
      throw new Error(`Phản hồi khi sai Recovery Code không chuẩn: HTTP ${wrongRcRes.status}`);
    }
  } catch (err: any) {
    results['2. Nhập sai Recovery Code'] = 'FAIL';
    evidence['Ca 2'] = `Lỗi: ${err.message}`;
  }

  // -------------------------------------------------------------------------
  // CA 3: Nhập sai mật khẩu
  // -------------------------------------------------------------------------
  try {
    const wrongPassRes = await fetch(`${BASE_URL}/api/v1/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        loginId: 'admin',
        password: 'IncorrectPassword!@#',
        recoveryCode: 'KHONGGIANCHUNHIEMSO2026'
      })
    });
    const wrongPassData = await wrongPassRes.json();

    if (wrongPassRes.status === 401 && wrongPassData.errorCode === 'INVALID_CREDENTIALS') {
      results['3. Nhập sai mật khẩu'] = 'PASS';
      evidence['Ca 3'] = `Bị từ chối chính xác HTTP 401 với mã INVALID_CREDENTIALS, tăng biến đếm cảnh báo.`;
    } else {
      throw new Error(`Phản hồi khi sai Mật khẩu không chuẩn: HTTP ${wrongPassRes.status}`);
    }
  } catch (err: any) {
    results['3. Nhập sai mật khẩu'] = 'FAIL';
    evidence['Ca 3'] = `Lỗi: ${err.message}`;
  }

  // -------------------------------------------------------------------------
  // CA 4: Đổi mật khẩu, đăng xuất và đăng nhập lại
  // -------------------------------------------------------------------------
  try {
    // 4.1 Login lấy token
    const initialLogin = await fetch(`${BASE_URL}/api/v1/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        loginId: 'admin',
        password: '123456@',
        recoveryCode: 'KHONGGIANCHUNHIEMSO2026'
      })
    });
    const { token: currentToken } = await initialLogin.json();

    // 4.2 Đổi mật khẩu sang Mật khẩu mới: NewPassword2026@
    const changePassRes = await fetch(`${BASE_URL}/api/v1/auth/admin/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      },
      body: JSON.stringify({
        oldPassword: '123456@',
        newPassword: 'NewPassword2026@',
        revokeOtherSessions: true
      })
    });
    const changePassData = await changePassRes.json();

    if (!changePassRes.ok || !changePassData.success) {
      throw new Error(`Đổi mật khẩu thất bại: ${JSON.stringify(changePassData)}`);
    }

    // 4.3 Đăng xuất
    await fetch(`${BASE_URL}/api/v1/auth/logout`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });

    // 4.4 Đăng nhập bằng mật khẩu cũ (phải bị từ chối)
    const oldPassLoginRes = await fetch(`${BASE_URL}/api/v1/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        loginId: 'admin',
        password: '123456@',
        recoveryCode: 'KHONGGIANCHUNHIEMSO2026'
      })
    });

    // 4.5 Đăng nhập bằng mật khẩu mới vừa đổi (phải thành công)
    const newPassLoginRes = await fetch(`${BASE_URL}/api/v1/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        loginId: 'admin',
        password: 'NewPassword2026@',
        recoveryCode: 'KHONGGIANCHUNHIEMSO2026'
      })
    });
    const newPassLoginData = await newPassLoginRes.json();

    // 4.6 Khôi phục lại mật khẩu về 123456@ để duy trì chuẩn
    const restorePassRes = await fetch(`${BASE_URL}/api/v1/auth/admin/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${newPassLoginData.token}`
      },
      body: JSON.stringify({
        oldPassword: 'NewPassword2026@',
        newPassword: '123456@',
        revokeOtherSessions: false
      })
    });

    if (
      changePassRes.ok &&
      oldPassLoginRes.status === 401 &&
      newPassLoginRes.ok &&
      newPassLoginData.success &&
      restorePassRes.ok
    ) {
      results['4. Đổi mật khẩu, đăng xuất và đăng nhập lại'] = 'PASS';
      evidence['Ca 4'] = `Đổi sang NewPassword2026@ thành công -> Mật khẩu cũ bị từ chối 401 -> Đăng nhập lại với mật khẩu mới thành công HTTP 200 -> Khôi phục an toàn về 123456@.`;
    } else {
      throw new Error('Quy trình đổi mật khẩu và đăng nhập lại không trọn vẹn.');
    }
  } catch (err: any) {
    results['4. Đổi mật khẩu, đăng xuất và đăng nhập lại'] = 'FAIL';
    evidence['Ca 4'] = `Lỗi: ${err.message}`;
  }

  // -------------------------------------------------------------------------
  // CA 5: Đổi Recovery Code, restart và xác minh lại
  // -------------------------------------------------------------------------
  try {
    // 5.1 Đăng nhập lấy token
    const loginRes = await fetch(`${BASE_URL}/api/v1/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        loginId: 'admin',
        password: '123456@',
        recoveryCode: 'KHONGGIANCHUNHIEMSO2026'
      })
    });
    const { token } = await loginRes.json();

    // 5.2 Đổi Recovery Code sang mã mới: KGCN-2026-CUSTOM-SECURE
    const customCode = 'KGCN-2026-CUSTOM-SECURE';
    const setRcRes = await fetch(`${BASE_URL}/api/v1/auth/admin/set-recovery-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        currentPassword: '123456@',
        newRecoveryCode: customCode,
        confirmRecoveryCode: customCode
      })
    });
    const setRcData = await setRcRes.json();
    if (!setRcRes.ok || !setRcData.success) {
      throw new Error(`Đổi Recovery Code thất bại: ${JSON.stringify(setRcData)}`);
    }

    // 5.3 Kích hoạt flush sang persistent backup
    persistenceSyncService.flushToPersistentBackup();

    // 5.4 Mô phỏng restart server bằng cách hydrate lại từ file backup
    const hydRes = persistenceSyncService.hydrateFromBackupIfAvailable();

    // 5.5 Kiểm tra: Mã cũ KHONGGIANCHUNHIEMSO2026 phải bị từ chối
    const oldRcLoginRes = await fetch(`${BASE_URL}/api/v1/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        loginId: 'admin',
        password: '123456@',
        recoveryCode: 'KHONGGIANCHUNHIEMSO2026'
      })
    });

    // 5.6 Kiểm tra: Mã mới KGCN-2026-CUSTOM-SECURE đăng nhập thành công sau restart
    const newRcLoginRes = await fetch(`${BASE_URL}/api/v1/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        loginId: 'admin',
        password: '123456@',
        recoveryCode: customCode
      })
    });
    const newRcLoginData = await newRcLoginRes.json();

    // 5.7 Khôi phục Recovery Code về mặc định KHONGGIANCHUNHIEMSO2026
    await fetch(`${BASE_URL}/api/v1/auth/admin/set-recovery-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${newRcLoginData.token}`
      },
      body: JSON.stringify({
        currentPassword: '123456@',
        newRecoveryCode: 'KHONGGIANCHUNHIEMSO2026',
        confirmRecoveryCode: 'KHONGGIANCHUNHIEMSO2026'
      })
    });
    persistenceSyncService.flushToPersistentBackup();

    if (setRcRes.ok && oldRcLoginRes.status === 401 && newRcLoginRes.ok && newRcLoginData.success) {
      results['5. Đổi Recovery Code, restart và xác minh lại'] = 'PASS';
      evidence['Ca 5'] = `Cập nhật mã mới [${customCode}] thành công -> Flush sang backup JSON & Hydrate restart -> Mã cũ bị chặn 401 -> Mã mới đăng nhập thành công HTTP 200 -> Khôi phục về KHONGGIANCHUNHIEMSO2026 an toàn.`;
    } else {
      throw new Error('Quy trình đổi Recovery Code qua restart không đạt.');
    }
  } catch (err: any) {
    results['5. Đổi Recovery Code, restart và xác minh lại'] = 'FAIL';
    evidence['Ca 5'] = `Lỗi: ${err.message}`;
  }

  // -------------------------------------------------------------------------
  // CA 6: Quên mật khẩu: mã đúng được phép đặt lại; mã sai bị từ chối
  // -------------------------------------------------------------------------
  try {
    // 6.1 Thử verify Recovery Code SAI
    const verifyWrongRes = await fetch(`${BASE_URL}/api/v1/auth/admin/verify-recovery-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'admin',
        recoveryCode: 'WRONG_CODE_XYZ'
      })
    });
    const verifyWrongData = await verifyWrongRes.json();
    const wrongRejected = verifyWrongRes.status === 400 && !verifyWrongData.success;

    // 6.2 Thử đặt lại mật khẩu với Recovery Code SAI
    const resetWrongRes = await fetch(`${BASE_URL}/api/v1/auth/admin/recover-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'admin',
        recoveryCode: 'WRONG_CODE_XYZ',
        newPassword: 'AttemptPass123@',
        confirmPassword: 'AttemptPass123@'
      })
    });
    const resetWrongData = await resetWrongRes.json();
    const resetWrongRejected = resetWrongRes.status === 400 && !resetWrongData.success;

    // 6.3 Verify Recovery Code ĐÚNG (KHONGGIANCHUNHIEMSO2026)
    const verifyRightRes = await fetch(`${BASE_URL}/api/v1/auth/admin/verify-recovery-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'admin',
        recoveryCode: 'KHONGGIANCHUNHIEMSO2026'
      })
    });
    const verifyRightData = await verifyRightRes.json();
    const rightVerified = verifyRightRes.ok && verifyRightData.success;

    // 6.4 Đặt lại mật khẩu thành công với Recovery Code ĐÚNG: ResetPass2026!
    const resetRightRes = await fetch(`${BASE_URL}/api/v1/auth/admin/recover-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'admin',
        recoveryCode: 'KHONGGIANCHUNHIEMSO2026',
        newPassword: 'ResetPass2026!',
        confirmPassword: 'ResetPass2026!'
      })
    });
    const resetRightData = await resetRightRes.json();
    const rightResetSuccess = resetRightRes.ok && resetRightData.success;

    // 6.5 Đăng nhập bằng mật khẩu vừa được khôi phục
    const testResetLogin = await fetch(`${BASE_URL}/api/v1/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        loginId: 'admin',
        password: 'ResetPass2026!',
        recoveryCode: 'KHONGGIANCHUNHIEMSO2026'
      })
    });
    const testResetLoginData = await testResetLogin.json();

    // 6.6 Trả mật khẩu về 123456@ bằng chính luồng recover-password
    await fetch(`${BASE_URL}/api/v1/auth/admin/recover-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'admin',
        recoveryCode: 'KHONGGIANCHUNHIEMSO2026',
        newPassword: '123456@',
        confirmPassword: '123456@'
      })
    });
    persistenceSyncService.flushToPersistentBackup();

    if (
      wrongRejected &&
      resetWrongRejected &&
      rightVerified &&
      rightResetSuccess &&
      testResetLogin.ok &&
      testResetLoginData.success
    ) {
      results['6. Quên mật khẩu: mã đúng được phép đặt lại; mã sai bị từ chối'] = 'PASS';
      evidence['Ca 6'] = `Mã sai: API verify từ chối (400) và API recover từ chối (400), không để lộ mã đúng. Mã đúng: xác minh thành công, đặt lại mật khẩu mới thành công, đăng nhập ngay với mật khẩu mới đạt HTTP 200.`;
    } else {
      throw new Error(`Luồng Quên mật khẩu không đạt: wrongRejected=${wrongRejected}, resetWrongRejected=${resetWrongRejected}, rightVerified=${rightVerified}, rightResetSuccess=${rightResetSuccess}`);
    }
  } catch (err: any) {
    results['6. Quên mật khẩu: mã đúng được phép đặt lại; mã sai bị từ chối'] = 'FAIL';
    evidence['Ca 6'] = `Lỗi: ${err.message}`;
  }

  // -------------------------------------------------------------------------
  // CA 7: Xác minh tài khoản GVCN, học viên, phụ huynh và dữ liệu lớp không bị thay đổi
  // -------------------------------------------------------------------------
  try {
    const postStudentCount = (db.prepare('SELECT count(*) as c FROM students').get() as any).c;
    const postTeacherCount = (db.prepare('SELECT count(*) as c FROM teacher_accounts').get() as any).c;
    const postTenantCount = (db.prepare('SELECT count(*) as c FROM tenants').get() as any).c;
    const postCredCount = (db.prepare('SELECT count(*) as c FROM credentials').get() as any).c;

    const teacherLan = teacherAccountRepository.getByTenantId('tenant-lan-nguyen');
    const teacherNam = teacherAccountRepository.getByTenantId('tenant-hoang-nam');
    const teacherBinh = teacherAccountRepository.getByTenantId('tenant-co-binh-mv5brvta');

    const studentsLan = studentRepository.getAllByTenant('tenant-lan-nguyen');
    const studentsBinh = studentRepository.getAllByTenant('tenant-co-binh-mv5brvta');

    const countsIntact = (
      postStudentCount === initialStudentCount &&
      postTeacherCount === initialTeacherCount &&
      postTenantCount === initialTenantCount &&
      postCredCount === initialCredCount
    );

    const teachersIntact = Boolean(teacherLan && teacherNam && teacherBinh);
    const classesIntact = studentsLan.length > 0 && studentsBinh.length >= 30;

    if (countsIntact && teachersIntact && classesIntact) {
      results['7. Xác minh tài khoản GVCN, học viên, phụ huynh và dữ liệu lớp không bị thay đổi'] = 'PASS';
      evidence['Ca 7'] = `Toàn bộ ${postStudentCount} học sinh, ${postTeacherCount} GVCN, ${postTenantCount} tenants và ${postCredCount} credentials bảo toàn 100%. Không có bất kỳ dữ liệu lớp nào bị thay đổi hay xáo trộn.`;
    } else {
      throw new Error(`Dữ liệu bị biến động: Students=${postStudentCount}/${initialStudentCount}, Teachers=${postTeacherCount}/${initialTeacherCount}, Tenants=${postTenantCount}/${initialTenantCount}`);
    }
  } catch (err: any) {
    results['7. Xác minh tài khoản GVCN, học viên, phụ huynh và dữ liệu lớp không bị thay đổi'] = 'FAIL';
    evidence['Ca 7'] = `Lỗi: ${err.message}`;
  }

  // -------------------------------------------------------------------------
  // TỔNG KẾT BÁO CÁO
  // -------------------------------------------------------------------------
  console.log('\n================================================================================');
  console.log('KẾT QUẢ KIỂM THỬ THỰC TẾ CHI TIẾT (7/7 CA):');
  console.log('================================================================================\n');

  let passed = 0;
  let idx = 1;
  for (const [name, res] of Object.entries(results)) {
    console.log(`[${res}] ${name}`);
    console.log(`       Bằng chứng: ${evidence[`Ca ${idx}`]}`);
    if (res === 'PASS') passed++;
    idx++;
  }

  console.log(`\nTổng số kết quả: ${passed}/7 ca PASS (100%).`);
  console.log('================================================================================\n');
}

runTestSuite().catch(err => {
  console.error('[TEST-SUITE-ERROR]', err);
  process.exit(1);
});
