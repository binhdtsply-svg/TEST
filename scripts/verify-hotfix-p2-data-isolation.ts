/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * HOTFIX P2 REGRESSION SUITE:
 * Complete Data Isolation, Role Ownership, and Cross-Tenant Rejection Verification
 */

import { adminAccountRepository } from '../server/repositories/AdminAccountRepository';
import { credentialRepository } from '../server/repositories/CredentialRepository';
import { sessionRepository } from '../server/repositories/SessionRepository';
import { postRepository } from '../server/repositories/PostRepository';
import { studentRepository } from '../server/repositories/StudentRepository';
import { classSettingsRepository } from '../server/repositories/ClassSettingsRepository';
import { parentCommunicationRepository } from '../server/repositories/ParentCommunicationRepository';

const BASE_URL = 'http://localhost:3000';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  ✗ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ PASS: ${message}`);
}

async function api(path: string, options: {
  method?: string;
  token?: string;
  body?: any;
} = {}): Promise<{ status: number; data: any }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data };
}

async function runHotfixP2Verification() {
  console.log('====================================================');
  console.log('HOTFIX P2 — KIỂM THỬ VÀ HOÀN THIỆN CÔ LẬP DỮ LIỆU');
  console.log('====================================================\n');

  // --------------------------------------------------------------------------
  // SETUP TEST IDENTITIES & TOKENS
  // --------------------------------------------------------------------------
  console.log('[CHUẨN BỊ FIXTURE & PHIÊN LÀM VIỆC THEO MA TRẬN VAI TRÒ]');

  // 1. Admin
  const adminAcc = adminAccountRepository.findById('usr-super-admin')!;
  const adminSession = sessionRepository.createSession({
    userId: adminAcc.id,
    role: 'SUPER_ADMIN',
    tenantId: 'platform-root',
    credentialVersion: adminAcc.session_version || 1
  });

  // 2. GVCN 1 (Cô Mai Lan - lớp 11A1, tenant-lan-nguyen)
  const teacher1Session = sessionRepository.createSession({
    userId: 'teacher-lan-nguyen',
    role: 'TEACHER',
    tenantId: 'tenant-lan-nguyen',
    teacherId: 'teacher-lan-nguyen',
    credentialVersion: 1
  });

  // 3. GVCN 2 (Thầy Hoàng Nam - lớp 12A2, tenant-hoang-nam)
  const teacher2Session = sessionRepository.createSession({
    userId: 'usr-teacher-2',
    role: 'TEACHER',
    tenantId: 'tenant-hoang-nam',
    teacherId: 'teacher-hoang-nam',
    credentialVersion: 1
  });

  // 4. Ban cán sự lớp 11A1 (hs-01 - Trịnh Hoàng Nam, tenant-lan-nguyen)
  const credOff = credentialRepository.findByTenantAndOwner('tenant-lan-nguyen', 'hs-01', 'STUDENT');
  const officerSession = sessionRepository.createSession({
    userId: 'hs-01',
    role: 'CLASS_OFFICER',
    tenantId: 'tenant-lan-nguyen',
    studentId: 'hs-01',
    officerRoleTitle: 'Lớp trưởng',
    credentialVersion: credOff?.credential_version || 1
  });

  // 5. Học viên lớp 11A1 (hs-02 - Trần Thị Mai Anh, tenant-lan-nguyen)
  const credS1 = credentialRepository.findByTenantAndOwner('tenant-lan-nguyen', 'hs-02', 'STUDENT');
  const student1Session = sessionRepository.createSession({
    userId: 'hs-02',
    role: 'STUDENT',
    tenantId: 'tenant-lan-nguyen',
    studentId: 'hs-02',
    credentialVersion: credS1?.credential_version || 1
  });

  // 6. Học viên lớp 12A2 (hs-12a2-01 - Hoàng Minh Tuấn, tenant-hoang-nam)
  const credS2 = credentialRepository.findByTenantAndOwner('tenant-hoang-nam', 'hs-12a2-01', 'STUDENT');
  const student2Session = sessionRepository.createSession({
    userId: 'hs-12a2-01',
    role: 'STUDENT',
    tenantId: 'tenant-hoang-nam',
    studentId: 'hs-12a2-01',
    credentialVersion: credS2?.credential_version || 1
  });

  // 7. Phụ huynh học sinh hs-01 (Lớp 11A1, tenant-lan-nguyen)
  const credP1 = credentialRepository.findByTenantAndOwner('tenant-lan-nguyen', 'hs-01', 'PARENT');
  const parent1Session = sessionRepository.createSession({
    userId: 'par-hs-01',
    role: 'PARENT',
    tenantId: 'tenant-lan-nguyen',
    childStudentId: 'hs-01',
    credentialVersion: credP1?.credential_version || 1
  });

  // 8. Phụ huynh học sinh hs-12a2-01 (Lớp 12A2, tenant-hoang-nam)
  const credP2 = credentialRepository.findByTenantAndOwner('tenant-hoang-nam', 'hs-12a2-01', 'PARENT');
  const parent2Session = sessionRepository.createSession({
    userId: 'par-hs-12a2-01',
    role: 'PARENT',
    tenantId: 'tenant-hoang-nam',
    childStudentId: 'hs-12a2-01',
    credentialVersion: credP2?.credential_version || 1
  });

  console.log('  ✓ Đã khởi tạo 8 phiên làm việc độc lập cho 5 vai trò trên 2 lớp học.');

  let passedScenarios = 0;

  // --------------------------------------------------------------------------
  // KỊCH BẢN 1: Đăng nhập từng tài khoản và xác minh đúng userId, role và lớp
  // --------------------------------------------------------------------------
  console.log('\n[KỊCH BẢN 1] Xác minh định danh, role và lớp cho từng tài khoản...');
  const resSessT1 = await api('/api/v1/auth/session', { token: teacher1Session.token });
  assert(resSessT1.status === 200 && resSessT1.data.user.role === 'TEACHER' && resSessT1.data.user.tenantId === 'tenant-lan-nguyen', 'GVCN 1 định danh đúng Cô Mai Lan (11A1).');

  const resSessT2 = await api('/api/v1/auth/session', { token: teacher2Session.token });
  assert(resSessT2.status === 200 && resSessT2.data.user.role === 'TEACHER' && resSessT2.data.user.tenantId === 'tenant-hoang-nam', 'GVCN 2 định danh đúng Thầy Hoàng Nam (12A2).');

  const resSessOff = await api('/api/v1/auth/session', { token: officerSession.token });
  assert(resSessOff.status === 200 && resSessOff.data.user.role === 'CLASS_OFFICER' && resSessOff.data.user.studentId === 'hs-01', 'Ban cán sự định danh đúng hs-01 (Lớp trưởng 11A1).');

  const resSessS2 = await api('/api/v1/auth/session', { token: student2Session.token });
  assert(resSessS2.status === 200 && resSessS2.data.user.role === 'STUDENT' && resSessS2.data.user.studentId === 'hs-12a2-01', 'Học viên 2 định danh đúng hs-12a2-01 (Lớp 12A2).');

  const resSessP1 = await api('/api/v1/auth/session', { token: parent1Session.token });
  assert(resSessP1.status === 200 && resSessP1.data.user.role === 'PARENT' && resSessP1.data.user.childStudentId === 'hs-01', 'Phụ huynh 1 liên kết đúng con hs-01 (11A1).');

  const resSessP2 = await api('/api/v1/auth/session', { token: parent2Session.token });
  assert(resSessP2.status === 200 && resSessP2.data.user.role === 'PARENT' && resSessP2.data.user.childStudentId === 'hs-12a2-01', 'Phụ huynh 2 liên kết đúng con hs-12a2-01 (12A2).');

  passedScenarios++;

  // --------------------------------------------------------------------------
  // KỊCH BẢN 2: Đăng xuất, đăng nhập tài khoản khác, xác minh không giữ dữ liệu
  // --------------------------------------------------------------------------
  console.log('\n[KỊCH BẢN 2] Đăng xuất tài khoản A, xác minh token A bị thu hồi...');
  const tempSess = sessionRepository.createSession({
    userId: 'temp-user',
    role: 'TEACHER',
    tenantId: 'tenant-lan-nguyen',
    credentialVersion: 1
  });
  // Logout temp session
  const resLogout = await api('/api/v1/auth/logout', { method: 'POST', token: tempSess.token });
  assert(resLogout.status === 200, 'Đăng xuất thành công.');
  // Thử dùng lại token đã đăng xuất
  const resCheckOldToken = await api('/api/v1/auth/session', { token: tempSess.token });
  assert(resCheckOldToken.status === 401, 'Token cũ sau đăng xuất bị từ chối 401 Unauthorized.');
  passedScenarios++;

  // --------------------------------------------------------------------------
  // KỊCH BẢN 3: Refresh trang và khôi phục session, xác minh đúng danh tính
  // --------------------------------------------------------------------------
  console.log('\n[KỊCH BẢN 3] Tái tạo / khôi phục session qua token...');
  const resVerifyAgain = await api('/api/v1/auth/session', { token: teacher2Session.token });
  assert(resVerifyAgain.status === 200 && resVerifyAgain.data.user.userId === 'usr-teacher-2', 'Phiên làm việc khôi phục chính xác userId usr-teacher-2.');
  assert(resVerifyAgain.data.user.tenantId === 'tenant-hoang-nam', 'Phiên làm việc khôi phục giữ đúng tenant-hoang-nam.');
  passedScenarios++;

  // --------------------------------------------------------------------------
  // KỊCH BẢN 4: Tạo/sửa bài đăng ở lớp A, xác minh lớp B không thay đổi
  // --------------------------------------------------------------------------
  console.log('\n[KỊCH BẢN 4] Đăng bài ở lớp A, kiểm tra lớp B hoàn toàn độc lập...');
  const testPostIdA = `post_test_isolation_${Date.now()}`;
  const resPostCreateA = await api('/api/v1/posts', {
    method: 'POST',
    token: teacher1Session.token,
    body: {
      id: testPostIdA,
      title: 'Thông báo kiểm tra lớp 11A1 duy nhất',
      content: 'Nội dung bài đăng thử nghiệm của lớp 11A1',
      category: 'Thông báo',
      parentVisible: true
    }
  });
  assert(resPostCreateA.status === 200, 'Tạo bài đăng ở lớp A thành công.');

  // Lớp B (Thầy Hoàng Nam) query danh sách bài đăng
  const resPostsB = await api('/api/v1/posts', { token: teacher2Session.token });
  assert(resPostsB.status === 200, 'Lấy danh sách bài đăng lớp B thành công.');
  const postFoundInB = (resPostsB.data.data as any[]).some(p => p.id === testPostIdA || p.title.includes('lớp 11A1 duy nhất'));
  assert(!postFoundInB, 'Bài đăng của lớp A tuyệt đối KHÔNG xuất hiện trong bảng tin lớp B.');
  passedScenarios++;

  // --------------------------------------------------------------------------
  // KỊCH BẢN 5: Tạo/sửa thời khóa biểu lớp A, xác minh lớp B không thay đổi
  // --------------------------------------------------------------------------
  console.log('\n[KỊCH BẢN 5] Cập nhật thời khóa biểu lớp A, kiểm tra lớp B...');
  const resTkbA = await api('/api/v1/timetable', {
    method: 'POST',
    token: teacher1Session.token,
    body: {
      academicYear: '2025 - 2026',
      semester: 'Học kỳ I',
      scheduleGrid: { note: 'TKB Thử nghiệm riêng lớp 11A1' }
    }
  });
  assert(resTkbA.status === 200, 'Cập nhật TKB lớp A thành công.');

  // Lớp B query thời khóa biểu của mình
  const resTkbB = await api('/api/v1/timetable?academicYear=2025%20-%202026&semester=H%E1%BB%8Dc%20k%E1%BB%B3%20I', {
    token: teacher2Session.token
  });
  assert(resTkbB.status === 200, 'Đọc TKB lớp B thành công.');
  const tkbBGrid = JSON.stringify(resTkbB.data.data || {});
  assert(!tkbBGrid.includes('TKB Thử nghiệm riêng lớp 11A1'), 'TKB lớp B không bị ảnh hưởng bởi thay đổi của lớp A.');
  passedScenarios++;

  // --------------------------------------------------------------------------
  // KỊCH BẢN 6: Công bố dữ liệu học tập lớp A, xác minh chỉ đối tượng lớp A nhận
  // --------------------------------------------------------------------------
  console.log('\n[KỊCH BẢN 6] Công bố bảng điểm lớp A...');
  const resPublishA = await api('/api/v1/academic/publish', {
    method: 'POST',
    token: teacher1Session.token,
    body: {
      academicYear: '2025 - 2026',
      semester: 'Học kỳ I',
      periodLabel: 'Kỳ thi Giữa kỳ I - Lớp 11A1 Test',
      data: { summary: 'Kết quả giữa kỳ 11A1' }
    }
  });
  assert(resPublishA.status === 200, 'GVCN 1 xuất bản bảng điểm lớp A thành công.');

  // Học sinh lớp A query snapshots
  const resSnapStuA = await api('/api/v1/academic/snapshots', { token: student1Session.token });
  assert(resSnapStuA.status === 200, 'Học sinh lớp A truy vấn bảng điểm thành công.');
  const foundInStuA = (resSnapStuA.data.data as any[]).some(s => s.periodLabel === 'Kỳ thi Giữa kỳ I - Lớp 11A1 Test');
  assert(foundInStuA, 'Học sinh lớp A nhận được bảng điểm đã công bố.');

  // Học sinh lớp B query snapshots
  const resSnapStuB = await api('/api/v1/academic/snapshots', { token: student2Session.token });
  assert(resSnapStuB.status === 200, 'Học sinh lớp B gọi API snapshots.');
  const foundInStuB = (resSnapStuB.data.data as any[]).some(s => s.periodLabel === 'Kỳ thi Giữa kỳ I - Lớp 11A1 Test');
  assert(!foundInStuB, 'Học sinh lớp B KHÔNG nhận được bảng điểm của lớp A.');
  passedScenarios++;

  // --------------------------------------------------------------------------
  // KỊCH BẢN 7: Học viên A cố đọc dữ liệu học viên B: backend phải từ chối
  // --------------------------------------------------------------------------
  console.log('\n[KỊCH BẢN 7] Học viên A cố đọc hồ sơ của học viên khác (hs-02 đọc hs-01 và hs-12a2-01)...');
  // hs-02 cố đọc hs-01
  const resStudentReadOther = await api('/api/v1/students/hs-01', { token: student1Session.token });
  assert(resStudentReadOther.status === 403, 'Học sinh đọc hồ sơ học sinh khác trong cùng lớp bị từ chối 403 Forbidden.');

  // hs-02 cố đọc hs-12a2-01 (lớp khác)
  const resStudentReadOtherClass = await api('/api/v1/students/hs-12a2-01', { token: student1Session.token });
  assert(resStudentReadOtherClass.status === 403, 'Học sinh đọc hồ sơ học sinh lớp khác bị từ chối 403 Forbidden.');

  // hs-02 đọc chính mình: được chấp thuận
  const resStudentReadSelf = await api('/api/v1/students/hs-02', { token: student1Session.token });
  assert(resStudentReadSelf.status === 200 && resStudentReadSelf.data.data.id === 'hs-02', 'Học sinh đọc hồ sơ của chính mình thành công (200 OK).');
  passedScenarios++;

  // --------------------------------------------------------------------------
  // KỊCH BẢN 8: Phụ huynh A cố đọc dữ liệu gia đình B: backend phải từ chối
  // --------------------------------------------------------------------------
  console.log('\n[KỊCH BẢN 8] Phụ huynh A (con hs-01) cố đọc trao đổi của gia đình khác...');
  // Tạo 1 cuộc trao đổi của hs-02
  parentCommunicationRepository.upsertConversation({
    id: 'conv_hs-02_private',
    tenant_id: 'tenant-lan-nguyen',
    student_id: 'hs-02',
    parent_name: 'Bác Mai Anh',
    topic: 'Trao đổi riêng tư gia đình hs-02',
    messages_json: JSON.stringify([{ text: 'Thông tin bảo mật của gia đình hs-02' }]),
    last_message_at: new Date().toISOString(),
    unread_teacher: 0,
    unread_parent: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  // Phụ huynh hs-01 cố đọc conv_hs-02_private
  const resParReadOther = await api('/api/v1/parent-communication/conversations/conv_hs-02_private', {
    token: parent1Session.token
  });
  assert(resParReadOther.status === 403, 'Phụ huynh đọc trao đổi của gia đình khác bị từ chối 403 FORBIDDEN_OTHER_FAMILY.');

  // Phụ huynh hs-01 lấy danh sách cuộc trò chuyện: chỉ thấy con mình
  const resParList = await api('/api/v1/parent-communication/conversations', {
    token: parent1Session.token
  });
  assert(resParList.status === 200, 'Lấy danh sách trao đổi phụ huynh thành công.');
  const hasOtherFamilyMsg = (resParList.data.data as any[]).some(c => c.studentId === 'hs-02');
  assert(!hasOtherFamilyMsg, 'Danh sách cuộc trao đổi phụ huynh không chứa tin nhắn của gia đình khác.');
  passedScenarios++;

  // --------------------------------------------------------------------------
  // KỊCH BẢN 9: GVCN A cố cập nhật bản ghi thuộc GVCN B: backend phải từ chối
  // --------------------------------------------------------------------------
  console.log('\n[KỊCH BẢN 9] GVCN A cố cập nhật bản ghi thuộc lớp của GVCN B...');
  // GVCN A gửi điểm cho học sinh hs-12a2-01 thuộc lớp B
  const resCrossGrade = await api('/api/v1/academic/records', {
    method: 'POST',
    token: teacher1Session.token,
    body: {
      studentId: 'hs-12a2-01',
      scores: { 'Toán': [10] }
    }
  });
  assert(resCrossGrade.status === 403, 'GVCN A ghi điểm cho học sinh lớp B bị từ chối 403 TENANT_ACCESS_DENIED.');

  // GVCN A ghi điểm rèn luyện cho học sinh hs-12a2-01 thuộc lớp B
  const resCrossTraining = await api('/api/v1/training/transactions', {
    method: 'POST',
    token: teacher1Session.token,
    body: {
      studentId: 'hs-12a2-01',
      title: 'Điểm cộng chéo lớp trái phép',
      points: 10
    }
  });
  assert(resCrossTraining.status === 403, 'GVCN A ghi điểm rèn luyện cho học sinh lớp B bị từ chối 403 TENANT_ACCESS_DENIED.');

  // GVCN A cố sửa cấu hình lớp B
  const resCrossSettings = await api('/api/v1/class-settings', {
    method: 'PATCH',
    token: teacher1Session.token,
    body: {
      tenantId: 'tenant-hoang-nam',
      slogan: 'Xâm nhập trái phép lớp 12A2'
    }
  });
  assert(resCrossSettings.status === 403, 'GVCN A sửa cấu hình lớp B bị từ chối 403 TENANT_ACCESS_DENIED.');
  passedScenarios++;

  // --------------------------------------------------------------------------
  // KỊCH BẢN 10: Ban cán sự A cố ghim hoặc sửa bài lớp B: backend phải từ chối
  // --------------------------------------------------------------------------
  console.log('\n[KỊCH BẢN 10] Ban cán sự A cố ghim/sửa bài lớp B...');
  // Tạo 1 bài đăng ở lớp B
  const postB_Id = `post_class_b_${Date.now()}`;
  postRepository.upsertPost({
    id: postB_Id,
    tenant_id: 'tenant-hoang-nam',
    author_id: 'usr-teacher-2',
    author_name: 'Thầy Hoàng Nam',
    author_role: 'TEACHER',
    category: 'Thông báo',
    title: 'Bài đăng chính thức lớp 12A2',
    content: 'Nội dung thông báo lớp 12A2',
    images_json: '[]',
    attachments_json: '[]',
    pinned_to_overview: 0,
    parent_visible: 1,
    reactions_json: '{}',
    comments_json: '[]',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  // Ban cán sự A cố ghim bài postB_Id của lớp B
  const resOfficerPinCross = await api(`/api/v1/posts/${postB_Id}/pin`, {
    method: 'PATCH',
    token: officerSession.token,
    body: { pinned: true }
  });
  assert(resOfficerPinCross.status === 403, 'Ban cán sự A ghim bài của lớp B bị từ chối 403 TENANT_ACCESS_DENIED.');

  // Ban cán sự A cố sửa bài postB_Id của lớp B
  const resOfficerEditCross = await api(`/api/v1/posts/${postB_Id}`, {
    method: 'PUT',
    token: officerSession.token,
    body: { title: 'Tiêu đề bị sửa đổi trái phép' }
  });
  assert(resOfficerEditCross.status === 403, 'Ban cán sự A sửa bài của lớp B bị từ chối 403 TENANT_ACCESS_DENIED.');

  // Ban cán sự A cố sửa bài do GVCN A đăng trong lớp mình
  const resOfficerEditTeacherPost = await api(`/api/v1/posts/${testPostIdA}`, {
    method: 'PUT',
    token: officerSession.token,
    body: { title: 'Cán sự cố sửa bài của GVCN' }
  });
  assert(resOfficerEditTeacherPost.status === 403, 'Ban cán sự sửa bài không phải của mình trong cùng lớp bị từ chối 403 ROLE_ACCESS_DENIED.');
  passedScenarios++;

  // --------------------------------------------------------------------------
  // KỊCH BẢN 11: Kiểm tra thông báo và dữ liệu được đồng bộ đúng lớp
  // --------------------------------------------------------------------------
  console.log('\n[KỊCH BẢN 11] Xác minh thông báo định tuyến chính xác theo người dùng và lớp...');
  const resNotifT1 = await api('/api/v1/notifications', { token: teacher1Session.token });
  assert(resNotifT1.status === 200, 'Lấy danh sách thông báo của GVCN 1 thành công.');

  const resNotifT2 = await api('/api/v1/notifications', { token: teacher2Session.token });
  assert(resNotifT2.status === 200, 'Lấy danh sách thông báo của GVCN 2 thành công.');

  // Không có thông báo của T1 lọt sang T2
  const notifLeak = (resNotifT2.data.data as any[]).some(n => n.userId === 'teacher-lan-nguyen');
  assert(!notifLeak, 'Thông báo của GVCN 1 không bao giờ phát tán sang GVCN 2.');
  passedScenarios++;

  // --------------------------------------------------------------------------
  // KỊCH BẢN 12: Kiểm tra xuất báo cáo chỉ bao gồm lớp mà tài khoản có quyền
  // --------------------------------------------------------------------------
  console.log('\n[KỊCH BẢN 12] Xác minh trích xuất danh sách lớp học...');
  const resStudentsT1 = await api('/api/v1/students', { token: teacher1Session.token });
  assert(resStudentsT1.status === 200, 'GVCN 1 lấy danh sách học sinh.');
  assert(resStudentsT1.data.data.length === 4, `Lớp 11A1 trả đúng 4 học sinh của lớp 11A1 (thực tế: ${resStudentsT1.data.data.length}).`);

  const resStudentsT2 = await api('/api/v1/students', { token: teacher2Session.token });
  assert(resStudentsT2.status === 200, 'GVCN 2 lấy danh sách học sinh.');
  assert(resStudentsT2.data.data.length === 1, `Lớp 12A2 trả đúng 1 học sinh của lớp 12A2 (thực tế: ${resStudentsT2.data.data.length}).`);
  assert(resStudentsT2.data.data[0].id === 'hs-12a2-01', 'Học sinh lớp 12A2 đúng là hs-12a2-01.');
  passedScenarios++;

  // --------------------------------------------------------------------------
  // KỊCH BẢN 13: Xử lý an toàn 401/403/404, không chuyển sang tài khoản mặc định
  // --------------------------------------------------------------------------
  console.log('\n[KỊCH BẢN 13] Kiểm tra xử lý lỗi 401/403/404...');
  // 401 khi không gửi token
  const resNoAuth = await api('/api/v1/students');
  assert(resNoAuth.status === 401, 'Truy cập không token nhận mã 401 AUTH_REQUIRED.');

  // 404 khi query ID không tồn tại
  const resNotFound = await api('/api/v1/students/hs-non-existent-999', { token: teacher1Session.token });
  assert(resNotFound.status === 404, 'Học sinh không tồn tại nhận đúng mã 404 STUDENT_NOT_FOUND (không trả fallback).');

  // Phụ huynh query danh sách toàn lớp bị giới hạn chỉ thấy con mình
  const resParentRoster = await api('/api/v1/students', { token: parent1Session.token });
  assert(resParentRoster.status === 200 && resParentRoster.data.data.length === 1, 'Phụ huynh chỉ nhận được đúng 1 bản ghi của con mình.');
  assert(resParentRoster.data.data[0].id === 'hs-01', 'Bản ghi con đúng là hs-01.');
  passedScenarios++;

  // --------------------------------------------------------------------------
  // KỊCH BẢN 14: Xác minh Admin quản lý toàn hệ thống ở backend theo quyền hợp lệ
  // --------------------------------------------------------------------------
  console.log('\n[KỊCH BẢN 14] Xác minh quyền quản trị Admin ở Backend...');
  const resAdminStats = await api('/api/v1/tenants/admin/stats', { token: adminSession.token });
  assert(resAdminStats.status === 200 && resAdminStats.data.success === true, 'Admin truy cập thống kê hệ thống thành công (200 OK).');
  assert(resAdminStats.data.stats.totalTenants >= 3, `Tổng số tenants trên hệ thống được tổng hợp đúng: ${resAdminStats.data.stats.totalTenants}.`);

  // Người dùng thường gọi admin stats bị từ chối 403
  const resNonAdminStats = await api('/api/v1/tenants/admin/stats', { token: teacher1Session.token });
  assert(resNonAdminStats.status === 403, 'Tài khoản không phải Admin gọi endpoint Admin bị từ chối 403 ROLE_ACCESS_DENIED.');
  passedScenarios++;

  // --------------------------------------------------------------------------
  // CLEANUP FIXTURES
  // --------------------------------------------------------------------------
  console.log('\n[DỌN DẸP FIXTURE KIỂM THỬ]');
  postRepository.deletePost('tenant-lan-nguyen', testPostIdA);
  postRepository.deletePost('tenant-hoang-nam', postB_Id);
  sessionRepository.deleteSession(adminSession.session.id);
  sessionRepository.deleteSession(teacher1Session.session.id);
  sessionRepository.deleteSession(teacher2Session.session.id);
  sessionRepository.deleteSession(officerSession.session.id);
  sessionRepository.deleteSession(student1Session.session.id);
  sessionRepository.deleteSession(student2Session.session.id);
  sessionRepository.deleteSession(parent1Session.session.id);
  sessionRepository.deleteSession(parent2Session.session.id);
  console.log('  ✓ Đã hoàn tất dọn dẹp các session và bài đăng thử nghiệm.');

  console.log('\n====================================================');
  console.log(`HOÀN THÀNH KIỂM THỬ HOTFIX P2: ${passedScenarios}/14 KỊCH BẢN ĐÃ PASS 100%!`);
  console.log('====================================================');
}

runHotfixP2Verification().catch(err => {
  console.error('\nKiểm thử P2 thất bại:', err);
  process.exit(1);
});
