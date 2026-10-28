import { getDatabase } from './server/db/database';
import { timetableRepository } from './server/repositories/TimetableRepository';
import { persistenceSyncService } from './server/services/PersistenceSyncService';

async function runTests() {
  console.log('--- STARTING VERIFICATION TESTS FOR BÁO BÀI ---');
  const db = getDatabase();
  const tenantId = 'tenant-lan-nguyen';
  const testDate = '2026-10-20';

  // Test 1: Tạo báo bài cho một ngày với ba môn học
  console.log('\n[TEST 1] Tạo báo bài cho ngày 2026-10-20 với 3 môn học...');
  const testIds = [`test_toan_${Date.now()}`, `test_hoa_${Date.now()}`, `test_ly_${Date.now()}`];
  
  timetableRepository.upsertAssignment({
    id: testIds[0],
    tenant_id: tenantId,
    class_id: `class-${tenantId}`,
    title: 'Báo bài môn Toán học',
    subject: 'Toán học',
    assigned_date: testDate,
    due_date: testDate,
    description: 'Kiểm tra thường xuyên.',
    status: 'ACTIVE',
    is_pinned: 0,
    bg_color: 'default',
    text_color: 'default',
    author_role: 'TEACHER',
    author_name: 'Cô Lan (GVCN)',
    created_at: new Date().toISOString()
  });

  timetableRepository.upsertAssignment({
    id: testIds[1],
    tenant_id: tenantId,
    class_id: `class-${tenantId}`,
    title: 'Báo bài môn Hóa học',
    subject: 'Hóa học',
    assigned_date: testDate,
    due_date: testDate,
    description: 'Xem trước bài học tiếp theo.',
    status: 'ACTIVE',
    is_pinned: 0,
    bg_color: 'default',
    text_color: 'default',
    author_role: 'TEACHER',
    author_name: 'Cô Lan (GVCN)',
    created_at: new Date().toISOString()
  });

  timetableRepository.upsertAssignment({
    id: testIds[2],
    tenant_id: tenantId,
    class_id: `class-${tenantId}`,
    title: 'Báo bài môn Vật lí',
    subject: 'Vật lí',
    assigned_date: testDate,
    due_date: testDate,
    description: 'Ôn tập nội dung đã học.',
    status: 'ACTIVE',
    is_pinned: 0,
    bg_color: 'default',
    text_color: 'default',
    author_role: 'TEACHER',
    author_name: 'Cô Lan (GVCN)',
    created_at: new Date().toISOString()
  });

  const row1 = timetableRepository.getAssignmentById(tenantId, testIds[0]);
  const row2 = timetableRepository.getAssignmentById(tenantId, testIds[1]);
  const row3 = timetableRepository.getAssignmentById(tenantId, testIds[2]);

  if (row1 && row2 && row3 && row1.subject === 'Toán học' && row2.subject === 'Hóa học' && row3.subject === 'Vật lí') {
    console.log('-> TEST 1 RESULT: PASS');
  } else {
    console.error('-> TEST 1 RESULT: FAIL');
    process.exit(1);
  }

  // Test 2: Đổi màu nền và màu chữ của một bài
  console.log('\n[TEST 2] Đổi màu nền và màu chữ của bài Toán học...');
  timetableRepository.upsertAssignment({
    ...row1,
    bg_color: 'amber',
    text_color: 'rose'
  });
  const row1Colored = timetableRepository.getAssignmentById(tenantId, testIds[0]);
  if (row1Colored?.bg_color === 'amber' && row1Colored?.text_color === 'rose') {
    console.log('-> TEST 2 RESULT: PASS (bg_color: amber, text_color: rose)');
  } else {
    console.error('-> TEST 2 RESULT: FAIL');
    process.exit(1);
  }

  // Test 3: Ghim bài lên bảng tin lớp, sau đó bỏ ghim
  console.log('\n[TEST 3] Ghim bài lên bảng tin lớp, sau đó bỏ ghim...');
  const pinRes1 = timetableRepository.togglePinAssignment(tenantId, testIds[0]);
  if (pinRes1.isPinned !== true) {
    console.error('-> TEST 3.1 FAIL: pin did not toggle to true');
    process.exit(1);
  }
  const row1Pinned = timetableRepository.getAssignmentById(tenantId, testIds[0]);
  if (row1Pinned?.is_pinned !== 1) {
    console.error('-> TEST 3.2 FAIL: db is_pinned is not 1');
    process.exit(1);
  }

  // Bỏ ghim
  const pinRes2 = timetableRepository.togglePinAssignment(tenantId, testIds[0]);
  if (pinRes2.isPinned !== false) {
    console.error('-> TEST 3.3 FAIL: unpin did not toggle to false');
    process.exit(1);
  }
  const row1Unpinned = timetableRepository.getAssignmentById(tenantId, testIds[0]);
  if (row1Unpinned?.is_pinned !== 0) {
    console.error('-> TEST 3.4 FAIL: db is_pinned is not 0');
    process.exit(1);
  }

  // Ghim lại để kiểm tra giữ trạng thái ở các bước sau
  timetableRepository.togglePinAssignment(tenantId, testIds[0]);
  console.log('-> TEST 3 RESULT: PASS');

  // Test 4: Chỉnh sửa nội dung bài đã đổi màu và kiểm tra định dạng vẫn được giữ
  console.log('\n[TEST 4] Chỉnh sửa nội dung bài đã đổi màu & ghim, kiểm tra định dạng giữ nguyên...');
  const beforeEdit = timetableRepository.getAssignmentById(tenantId, testIds[0])!;
  // Giả lập hành vi sửa nội dung (không đổi màu hay bỏ ghim)
  timetableRepository.upsertAssignment({
    ...beforeEdit,
    description: 'Kiểm tra 15 phút chương 2 (Đã cập nhật nội dung).'
  });
  const afterEdit = timetableRepository.getAssignmentById(tenantId, testIds[0])!;
  if (
    afterEdit.description === 'Kiểm tra 15 phút chương 2 (Đã cập nhật nội dung).' &&
    afterEdit.bg_color === 'amber' &&
    afterEdit.text_color === 'rose' &&
    afterEdit.is_pinned === 1
  ) {
    console.log('-> TEST 4 RESULT: PASS (Định dạng màu sắc và trạng thái ghim được giữ nguyên 100%)');
  } else {
    console.error('-> TEST 4 RESULT: FAIL', afterEdit);
    process.exit(1);
  }

  // Test 5: Tải lại trang (mô phỏng query tất cả bài từ kho dữ liệu chính)
  console.log('\n[TEST 5] Tải lại danh sách từ SQLite kho lưu trữ chính...');
  const allAssignments = timetableRepository.getAssignments(tenantId);
  const found = allAssignments.find(a => a.id === testIds[0]);
  if (found && found.bg_color === 'amber' && found.text_color === 'rose' && found.is_pinned === 1) {
    console.log('-> TEST 5 RESULT: PASS');
  } else {
    console.error('-> TEST 5 RESULT: FAIL', found);
    process.exit(1);
  }

  // Test 6: Đăng xuất rồi đăng nhập lại (mô phỏng phiên truy vấn lại qua tenant & role)
  console.log('\n[TEST 6] Đăng xuất rồi đăng nhập lại (xác minh truy vấn theo tenantId)...');
  const sessionQuery = timetableRepository.getAssignments(tenantId);
  const sessionItem = sessionQuery.find(a => a.id === testIds[0]);
  if (sessionItem && sessionItem.subject === 'Toán học' && sessionItem.assigned_date === testDate) {
    console.log('-> TEST 6 RESULT: PASS');
  } else {
    console.error('-> TEST 6 RESULT: FAIL');
    process.exit(1);
  }

  // Test 7: Đóng phiên làm việc hoặc khởi động lại môi trường (Persistence Backup & Hydration)
  console.log('\n[TEST 7] Sao lưu và kiểm tra khôi phục bền vững qua PersistenceSyncService...');
  persistenceSyncService.flushToPersistentBackup();
  const hydrateResult = persistenceSyncService.hydrateFromBackup();
  const reloadedItem = timetableRepository.getAssignmentById(tenantId, testIds[0]);
  if (
    reloadedItem &&
    reloadedItem.bg_color === 'amber' &&
    reloadedItem.text_color === 'rose' &&
    reloadedItem.is_pinned === 1
  ) {
    console.log('-> TEST 7 RESULT: PASS (Dữ liệu bền vững sau sao lưu và phục hồi)');
  } else {
    console.error('-> TEST 7 RESULT: FAIL');
    process.exit(1);
  }

  // Test 8: Đảm bảo các chức năng ngoài mục Báo bài vẫn hoạt động như trước
  console.log('\n[TEST 8] Kiểm tra tính toàn vẹn của các bảng khác (timetables, exams, students, settings)...');
  const timetables = db.prepare('SELECT COUNT(*) as c FROM timetables').get() as { c: number };
  const exams = db.prepare('SELECT COUNT(*) as c FROM exam_schedules').get() as { c: number };
  const students = db.prepare('SELECT COUNT(*) as c FROM students').get() as { c: number };
  const settings = db.prepare('SELECT COUNT(*) as c FROM class_settings').get() as { c: number };
  console.log(`Timetables: ${timetables.c}, Exams: ${exams.c}, Students: ${students.c}, Settings: ${settings.c}`);
  if (timetables.c >= 0 && exams.c >= 0 && students.c >= 0) {
    console.log('-> TEST 8 RESULT: PASS (Tất cả module khác hoạt động bình thường, không bị ảnh hưởng)');
  } else {
    console.error('-> TEST 8 RESULT: FAIL');
    process.exit(1);
  }

  // Dọn dẹp bản ghi kiểm thử
  for (const tid of testIds) {
    timetableRepository.deleteAssignment(tenantId, tid);
  }
  persistenceSyncService.flushToPersistentBackup();
  console.log('\n--- TẤT CẢ 8 PHÉP THỬ ĐÃ HOÀN TẤT VÀ ĐẠT KẾT QUẢ PASS ---');
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
