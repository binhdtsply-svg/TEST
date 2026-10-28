import { getDatabase } from '../server/db/database';
import { userAvatarRepository } from '../server/repositories/UserAvatarRepository';
import { studentRepository } from '../server/repositories/StudentRepository';
import { credentialRepository } from '../server/repositories/CredentialRepository';
import { sessionRepository } from '../server/repositories/SessionRepository';

async function runAvatarIsolationTests() {
  console.log('=== BẮT ĐẦU KIỂM THỬ ĐỘC LẬP ẢNH ĐẠI DIỆN HỌC VIÊN VÀ PHỤ HUYNH ===\n');
  const db = getDatabase();
  let allPassed = true;

  // Initial state check
  const student01 = studentRepository.getById('tenant-lan-nguyen', 'hs-01');
  const student02 = studentRepository.getById('tenant-lan-nguyen', 'hs-02');
  if (!student01 || !student02) {
    throw new Error('Không tìm thấy học sinh hs-01 hoặc hs-02 để kiểm thử!');
  }

  const initialStudent01Avatar = student01.avatar;
  const initialStudent02Avatar = student02.avatar;
  console.log('1. Dữ liệu ban đầu:');
  console.log('   - HS-01 (Nguyễn Gia Huy):', initialStudent01Avatar);
  console.log('   - HS-02 (Trần Thị Mai):', initialStudent02Avatar);

  const initialParent01Avatar = userAvatarRepository.getAvatarForUser({
    userId: 'usr_par_hs-01',
    childStudentId: 'hs-01',
    role: 'PARENT',
    tenantId: 'tenant-lan-nguyen'
  });
  console.log('   - Phụ huynh HS-01:', initialParent01Avatar || '(Chưa có avatar riêng)');

  // TEST 1: Học viên đổi ảnh -> Chỉ ảnh học viên thay đổi, phụ huynh và học sinh khác KHÔNG thay đổi
  console.log('\n--- TEST 1: Học viên đổi ảnh ---');
  const newStudentAvatar: string = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='; // valid test base64 1x1 image

  // Save student avatar
  userAvatarRepository.saveAvatar({
    avatar: newStudentAvatar,
    userId: 'usr_stu_hs-01',
    studentId: 'hs-01',
    role: 'CLASS_OFFICER',
    tenantId: 'tenant-lan-nguyen'
  });
  studentRepository.update('tenant-lan-nguyen', 'hs-01', { avatar: newStudentAvatar });

  // Read back
  const readStudent01 = userAvatarRepository.getAvatarForUser({
    userId: 'usr_stu_hs-01',
    studentId: 'hs-01',
    role: 'CLASS_OFFICER',
    tenantId: 'tenant-lan-nguyen'
  });
  const readParent01AfterStudentChange = userAvatarRepository.getAvatarForUser({
    userId: 'usr_par_hs-01',
    childStudentId: 'hs-01',
    role: 'PARENT',
    tenantId: 'tenant-lan-nguyen'
  });
  const readStudent02AfterStudentChange = userAvatarRepository.getAvatarForUser({
    userId: 'usr_stu_hs-02',
    studentId: 'hs-02',
    role: 'STUDENT',
    tenantId: 'tenant-lan-nguyen'
  });

  const test1Pass = readStudent01 === newStudentAvatar &&
                    readParent01AfterStudentChange !== newStudentAvatar &&
                    readStudent02AfterStudentChange !== newStudentAvatar;
  console.log(`[TEST 1] Kết quả: ${test1Pass ? 'PASS' : 'FAIL'}`);
  console.log('   - Ảnh HS-01 sau khi đổi:', readStudent01?.slice(0, 50) + '...');
  console.log('   - Ảnh PH HS-01 sau khi HS-01 đổi:', readParent01AfterStudentChange || '(Không bị đổi theo HS)');
  console.log('   - Ảnh HS-02 sau khi HS-01 đổi:', readStudent02AfterStudentChange || '(Không bị ảnh hưởng)');
  if (!test1Pass) allPassed = false;

  // TEST 2: Phụ huynh đổi ảnh -> Chỉ ảnh phụ huynh thay đổi, học viên KHÔNG thay đổi
  console.log('\n--- TEST 2: Phụ huynh đổi ảnh ---');
  const newParentAvatar: string = 'data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  userAvatarRepository.saveAvatar({
    avatar: newParentAvatar,
    userId: 'usr_par_hs-01',
    childStudentId: 'hs-01',
    role: 'PARENT',
    tenantId: 'tenant-lan-nguyen'
  });

  const readParent01AfterParentChange = userAvatarRepository.getAvatarForUser({
    userId: 'usr_par_hs-01',
    childStudentId: 'hs-01',
    role: 'PARENT',
    tenantId: 'tenant-lan-nguyen'
  });
  const readStudent01AfterParentChange = userAvatarRepository.getAvatarForUser({
    userId: 'usr_stu_hs-01',
    studentId: 'hs-01',
    role: 'CLASS_OFFICER',
    tenantId: 'tenant-lan-nguyen'
  });
  const student01InDb = studentRepository.getById('tenant-lan-nguyen', 'hs-01');

  const test2Pass = readParent01AfterParentChange === newParentAvatar &&
                    readStudent01AfterParentChange === newStudentAvatar &&
                    student01InDb?.avatar === newStudentAvatar &&
                    readStudent01AfterParentChange !== newParentAvatar;

  console.log(`[TEST 2] Kết quả: ${test2Pass ? 'PASS' : 'FAIL'}`);
  console.log('   - Ảnh PH HS-01 sau khi PH đổi:', readParent01AfterParentChange?.slice(0, 50) + '...');
  console.log('   - Ảnh HS-01 sau khi PH đổi:', readStudent01AfterParentChange?.slice(0, 50) + '...');
  console.log('   - Ảnh HS-01 trong bảng students:', student01InDb?.avatar?.slice(0, 50) + '...');
  if (!test2Pass) allPassed = false;

  // TEST 3: Đăng xuất, đăng nhập lại và tải lại trang: ảnh vẫn đúng
  console.log('\n--- TEST 3: Giả lập đăng xuất, đăng nhập lại & tải lại trang ---');
  // Create sessions for both
  const sessionStudent = sessionRepository.createSession({
    userId: 'usr_stu_hs-01',
    role: 'CLASS_OFFICER',
    tenantId: 'tenant-lan-nguyen',
    studentId: 'hs-01'
  });
  const sessionParent = sessionRepository.createSession({
    userId: 'usr_par_hs-01',
    role: 'PARENT',
    tenantId: 'tenant-lan-nguyen',
    childStudentId: 'hs-01'
  });

  // Verify retrieval via session tokens
  const retrievedStudentSession = sessionRepository.getSessionByToken(sessionStudent.token);
  const retrievedParentSession = sessionRepository.getSessionByToken(sessionParent.token);

  const studentAvatarAfterReauth = userAvatarRepository.getAvatarForUser({
    userId: retrievedStudentSession?.user_id,
    studentId: retrievedStudentSession?.student_id || undefined,
    role: retrievedStudentSession?.role,
    tenantId: retrievedStudentSession?.tenant_id
  });

  const parentAvatarAfterReauth = userAvatarRepository.getAvatarForUser({
    userId: retrievedParentSession?.user_id,
    childStudentId: retrievedParentSession?.child_student_id || undefined,
    role: retrievedParentSession?.role,
    tenantId: retrievedParentSession?.tenant_id
  });

  const test3Pass = Boolean(retrievedStudentSession && retrievedParentSession &&
                            studentAvatarAfterReauth === newStudentAvatar &&
                            parentAvatarAfterReauth === newParentAvatar &&
                            studentAvatarAfterReauth !== parentAvatarAfterReauth);

  console.log(`[TEST 3] Kết quả: ${test3Pass ? 'PASS' : 'FAIL'}`);
  console.log('   - Học viên sau đăng nhập lại:', studentAvatarAfterReauth === newStudentAvatar ? 'Chính xác' : 'Sai');
  console.log('   - Phụ huynh sau đăng nhập lại:', parentAvatarAfterReauth === newParentAvatar ? 'Chính xác' : 'Sai');
  if (!test3Pass) allPassed = false;

  // TEST 4: Ảnh mới được upload thành công, mở xem được và đọc lại được từ nguồn lưu trữ chính thức
  console.log('\n--- TEST 4: Đọc lại từ nguồn lưu trữ chính thức SQLite user_avatars ---');
  const studentRow = db.prepare('SELECT avatar, role, user_id FROM user_avatars WHERE user_key = ?').get('student_hs-01') as any;
  const parentRow = db.prepare('SELECT avatar, role, user_id FROM user_avatars WHERE user_key = ?').get('parent_child_hs-01') as any;

  const test4Pass = Boolean(studentRow && studentRow.avatar === newStudentAvatar &&
                            parentRow && parentRow.avatar === newParentAvatar &&
                            studentRow.avatar.startsWith('data:image/') &&
                            parentRow.avatar.startsWith('data:image/'));

  console.log(`[TEST 4] Kết quả: ${test4Pass ? 'PASS' : 'FAIL'}`);
  console.log('   - Đọc trực tiếp dòng student_hs-01:', studentRow ? 'Tồn tại bền vững' : 'Không tìm thấy');
  console.log('   - Đọc trực tiếp dòng parent_child_hs-01:', parentRow ? 'Tồn tại bền vững' : 'Không tìm thấy');
  if (!test4Pass) allPassed = false;

  // TEST 5: Tài khoản và dữ liệu cũ vẫn được bảo toàn
  console.log('\n--- TEST 5: Bảo toàn toàn bộ tài khoản và dữ liệu cũ ---');
  const adminAcc = db.prepare('SELECT email, status FROM admin_accounts LIMIT 1').get() as any;
  const teacherCount = (db.prepare('SELECT COUNT(*) as count FROM teacher_accounts').get() as any).count;
  const studentCount = (db.prepare('SELECT COUNT(*) as count FROM students').get() as any).count;
  const credCount = (db.prepare('SELECT COUNT(*) as count FROM credentials').get() as any).count;

  const test5Pass = Boolean(adminAcc && adminAcc.email === 'binhdtsply@gmail.com' &&
                            teacherCount >= 3 &&
                            studentCount >= 37 &&
                            credCount >= 81);

  console.log(`[TEST 5] Kết quả: ${test5Pass ? 'PASS' : 'FAIL'}`);
  console.log(`   - Super Admin: ${adminAcc?.email} (Bảo toàn)`);
  console.log(`   - GVCN: ${teacherCount} tài khoản (Bảo toàn)`);
  console.log(`   - Học viên: ${studentCount} hồ sơ (Bảo toàn)`);
  console.log(`   - Mã đăng nhập/Credentials: ${credCount} tài khoản (Bảo toàn)`);
  if (!test5Pass) allPassed = false;

  // Restore HS-01 & Parent HS-01 to clean defaults if needed, or leave cleanly partitioned
  console.log('\n======================================================');
  console.log(`TỔNG KẾT: ${allPassed ? 'ALL 5/5 TESTS PASSED' : 'SOME TESTS FAILED'}`);
  console.log('======================================================');
  if (!allPassed) {
    process.exit(1);
  }
}

runAvatarIsolationTests().catch(err => {
  console.error('Lỗi khi chạy kiểm thử:', err);
  process.exit(1);
});
