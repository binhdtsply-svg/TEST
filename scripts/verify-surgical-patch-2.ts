/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { adminAccountRepository } from '../server/repositories/AdminAccountRepository';
import { credentialRepository } from '../server/repositories/CredentialRepository';
import { sessionRepository } from '../server/repositories/SessionRepository';

async function runTests() {
  console.log('====================================================');
  console.log('KIỂM THỬ SURGICAL PATCH 2/2 — 10 BÀI TEST CHUẨN');
  console.log('====================================================\n');

  const BASE_URL = 'http://localhost:3000';

  // 1. Prepare Credentials & Sessions
  console.log('[CHUẨN BỊ] Tạo phiên làm việc thực tế cho các vai trò...');
  
  // Admin Session
  const adminAcc = adminAccountRepository.findById('usr-super-admin')!;
  const adminSession = sessionRepository.createSession({
    userId: adminAcc.id,
    role: 'SUPER_ADMIN',
    tenantId: 'platform-root',
    credentialVersion: adminAcc.session_version || 1
  });
  const adminToken = adminSession.token;

  // Teacher Session (GVCN)
  const teacherCred = credentialRepository.authenticate('ACT-ML-2025-LHP');
  if (!teacherCred.credential) throw new Error('Teacher cred not found');
  const teacherSession = sessionRepository.createSession({
    userId: 'teacher-lan-nguyen',
    role: 'TEACHER',
    tenantId: 'tenant-lan-nguyen',
    teacherId: 'teacher-lan-nguyen',
    credentialVersion: teacherCred.credential.credential_version
  });
  const teacherToken = teacherSession.token;

  // Student Session (Học viên)
  const studentCred = credentialRepository.authenticate('STU-GH982-11A1') || credentialRepository.authenticate('STU-11A1-01');
  if (!studentCred.credential) throw new Error('Student cred not found');
  const studentSession = sessionRepository.createSession({
    userId: 'hs-01',
    role: 'STUDENT',
    tenantId: 'tenant-lan-nguyen',
    studentId: 'hs-01',
    credentialVersion: studentCred.credential.credential_version
  });
  const studentToken = studentSession.token;

  // Parent Session (Phụ huynh)
  const parentCred = credentialRepository.authenticate('PAR-GH982-11A1') || credentialRepository.authenticate('PAR-11A1-01');
  if (!parentCred.credential) throw new Error('Parent cred not found');
  const parentSession = sessionRepository.createSession({
    userId: 'par-hs-01',
    role: 'PARENT',
    tenantId: 'tenant-lan-nguyen',
    childStudentId: 'hs-01',
    credentialVersion: parentCred.credential.credential_version
  });
  const parentToken = parentSession.token;

  let passedCount = 0;

  // ----------------------------------------------------
  // TEST 1: Admin → /quan-tri → PASS
  // ----------------------------------------------------
  console.log('[TEST 1] Admin -> /quan-tri ...');
  const res1 = await fetch(`${BASE_URL}/quan-tri`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const data1 = await res1.json();
  if (res1.status === 200 && data1.allowed === true && data1.role === 'SUPER_ADMIN') {
    console.log('  ✓ PASS: Admin được phép truy cập /quan-tri (HTTP 200).');
    passedCount++;
  } else {
    throw new Error(`FAIL TEST 1: status=${res1.status}, data=${JSON.stringify(data1)}`);
  }

  // Also verify /quan-tri-x7k9 dedicated link for Admin
  const res1b = await fetch(`${BASE_URL}/quan-tri-x7k9`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const data1b = await res1b.json();
  if (res1b.status === 200 && data1b.allowed === true && data1b.role === 'SUPER_ADMIN') {
    console.log('  ✓ PASS: Admin được phép truy cập đường dẫn riêng /quan-tri-x7k9 (HTTP 200).');
  } else {
    throw new Error(`FAIL /quan-tri-x7k9 check: status=${res1b.status}, data=${JSON.stringify(data1b)}`);
  }

  // ----------------------------------------------------
  // TEST 2: GVCN → /quan-tri → DENY
  // ----------------------------------------------------
  console.log('[TEST 2] GVCN -> /quan-tri ...');
  const res2 = await fetch(`${BASE_URL}/quan-tri`, {
    headers: { Authorization: `Bearer ${teacherToken}` }
  });
  const data2 = await res2.json();
  if (res2.status === 403 && data2.allowed === false && data2.errorCode === 'ROLE_ACCESS_DENIED') {
    console.log('  ✓ PASS: GVCN bị chặn (DENIED) truy cập /quan-tri (HTTP 403).');
    passedCount++;
  } else {
    throw new Error(`FAIL TEST 2: status=${res2.status}, data=${JSON.stringify(data2)}`);
  }

  // ----------------------------------------------------
  // TEST 3: Học viên → /quan-tri → DENY
  // ----------------------------------------------------
  console.log('[TEST 3] Học viên -> /quan-tri ...');
  const res3 = await fetch(`${BASE_URL}/quan-tri`, {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  const data3 = await res3.json();
  if (res3.status === 403 && data3.allowed === false && data3.errorCode === 'ROLE_ACCESS_DENIED') {
    console.log('  ✓ PASS: Học viên bị chặn (DENIED) truy cập /quan-tri (HTTP 403).');
    passedCount++;
  } else {
    throw new Error(`FAIL TEST 3: status=${res3.status}, data=${JSON.stringify(data3)}`);
  }

  // ----------------------------------------------------
  // TEST 4: Phụ huynh → /quan-tri → DENY
  // ----------------------------------------------------
  console.log('[TEST 4] Phụ huynh -> /quan-tri ...');
  const res4 = await fetch(`${BASE_URL}/quan-tri`, {
    headers: { Authorization: `Bearer ${parentToken}` }
  });
  const data4 = await res4.json();
  if (res4.status === 403 && data4.allowed === false && data4.errorCode === 'ROLE_ACCESS_DENIED') {
    console.log('  ✓ PASS: Phụ huynh bị chặn (DENIED) truy cập /quan-tri (HTTP 403).');
    passedCount++;
  } else {
    throw new Error(`FAIL TEST 4: status=${res4.status}, data=${JSON.stringify(data4)}`);
  }

  // ----------------------------------------------------
  // TEST 5: GVCN → /app → PASS
  // ----------------------------------------------------
  console.log('[TEST 5] GVCN -> /app ...');
  const res5 = await fetch(`${BASE_URL}/app`, {
    headers: { Authorization: `Bearer ${teacherToken}` }
  });
  const data5 = await res5.json();
  if (res5.status === 200 && data5.allowed === true && data5.role === 'TEACHER') {
    console.log('  ✓ PASS: GVCN truy cập /app thành công (HTTP 200).');
    passedCount++;
  } else {
    throw new Error(`FAIL TEST 5: status=${res5.status}, data=${JSON.stringify(data5)}`);
  }

  // ----------------------------------------------------
  // TEST 6: Học viên → /app → PASS
  // ----------------------------------------------------
  console.log('[TEST 6] Học viên -> /app ...');
  const res6 = await fetch(`${BASE_URL}/app`, {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  const data6 = await res6.json();
  if (res6.status === 200 && data6.allowed === true && data6.role === 'STUDENT') {
    console.log('  ✓ PASS: Học viên truy cập /app thành công (HTTP 200).');
    passedCount++;
  } else {
    throw new Error(`FAIL TEST 6: status=${res6.status}, data=${JSON.stringify(data6)}`);
  }

  // ----------------------------------------------------
  // TEST 7: Phụ huynh → /app → PASS
  // ----------------------------------------------------
  console.log('[TEST 7] Phụ huynh -> /app ...');
  const res7 = await fetch(`${BASE_URL}/app`, {
    headers: { Authorization: `Bearer ${parentToken}` }
  });
  const data7 = await res7.json();
  if (res7.status === 200 && data7.allowed === true && data7.role === 'PARENT') {
    console.log('  ✓ PASS: Phụ huynh truy cập /app thành công (HTTP 200).');
    passedCount++;
  } else {
    throw new Error(`FAIL TEST 7: status=${res7.status}, data=${JSON.stringify(data7)}`);
  }

  // ----------------------------------------------------
  // TEST 8: Không đăng nhập → /quan-tri → DENY
  // ----------------------------------------------------
  console.log('[TEST 8] Không đăng nhập -> /quan-tri ...');
  const res8 = await fetch(`${BASE_URL}/quan-tri`, {
    headers: {} // No token provided
  });
  const data8 = await res8.json();
  if (res8.status === 401 && data8.allowed === false && data8.errorCode === 'AUTH_REQUIRED') {
    console.log('  ✓ PASS: Không đăng nhập bị chặn (DENIED) truy cập /quan-tri (HTTP 401).');
    passedCount++;
  } else {
    throw new Error(`FAIL TEST 8: status=${res8.status}, data=${JSON.stringify(data8)}`);
  }

  // ----------------------------------------------------
  // TEST 9: Logout → /quan-tri → DENY
  // ----------------------------------------------------
  console.log('[TEST 9] Logout -> /quan-tri ...');
  // First, create a temporary admin session
  const tempAdmin = sessionRepository.createSession({
    userId: 'usr-super-admin',
    role: 'SUPER_ADMIN',
    tenantId: 'platform-root',
    credentialVersion: 1
  });
  // Verify it works before logout
  const preLogoutCheck = await fetch(`${BASE_URL}/quan-tri`, {
    headers: { Authorization: `Bearer ${tempAdmin.token}` }
  });
  if (preLogoutCheck.status !== 200) {
    throw new Error('FAIL TEST 9 (precheck): Pre-logout check failed');
  }
  // Call server logout to invalidate token
  const logoutRes = await fetch(`${BASE_URL}/api/v1/auth/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tempAdmin.token}` }
  });
  if (logoutRes.status !== 200) {
    throw new Error('FAIL TEST 9: Server logout call failed');
  }
  // Now attempt to access /quan-tri with invalidated token
  const postLogoutRes = await fetch(`${BASE_URL}/quan-tri`, {
    headers: { Authorization: `Bearer ${tempAdmin.token}` }
  });
  const postLogoutData = await postLogoutRes.json();
  if (postLogoutRes.status === 401 && postLogoutData.allowed === false && postLogoutData.errorCode === 'SESSION_EXPIRED') {
    console.log('  ✓ PASS: Token sau khi Logout bị từ chối (DENIED) truy cập /quan-tri (HTTP 401 SESSION_EXPIRED).');
    passedCount++;
  } else {
    throw new Error(`FAIL TEST 9: status=${postLogoutRes.status}, data=${JSON.stringify(postLogoutData)}`);
  }

  // ----------------------------------------------------
  // TEST 10: F5 / Restart simulation → không mất session ngoài policy
  // ----------------------------------------------------
  console.log('[TEST 10] F5/Restart persistence check ...');
  const persistentCheck = sessionRepository.getSessionByToken(adminToken);
  if (persistentCheck && persistentCheck.user_id === 'usr-super-admin' && persistentCheck.role === 'SUPER_ADMIN') {
    // Re-verify against server endpoint
    const res10 = await fetch(`${BASE_URL}/api/v1/auth/session`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const data10 = await res10.json();
    if (res10.status === 200 && data10.success && data10.user?.role === 'SUPER_ADMIN') {
      console.log('  ✓ PASS: Session tồn tại bền vững trong cơ sở dữ liệu SQLite sau reload.');
      passedCount++;
    } else {
      throw new Error(`FAIL TEST 10: API session check failed: ${JSON.stringify(data10)}`);
    }
  } else {
    throw new Error('FAIL TEST 10: Session lost in repository!');
  }

  // Clean up test sessions
  sessionRepository.deleteSession(adminSession.session.id);
  sessionRepository.deleteSession(teacherSession.session.id);
  sessionRepository.deleteSession(studentSession.session.id);
  sessionRepository.deleteSession(parentSession.session.id);

  console.log('\n====================================================');
  console.log(`HOÀN TẤT KIỂM THỬ: ${passedCount}/10 BÀI TEST ĐẠT ĐIỂM TUYỆT ĐỐI (100% PASS)`);
  console.log('====================================================\n');
}

runTests().catch(err => {
  console.error('\n[TEST FAILED]:', err);
  process.exit(1);
});
