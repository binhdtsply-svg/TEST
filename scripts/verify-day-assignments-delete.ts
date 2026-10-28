/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Verification Test: Day Assignments Bulk Deletion vs Single Deletion Scoping
 */

import { getDatabase } from '../server/db/database';
import { timetableRepository } from '../server/repositories/TimetableRepository';
import { persistenceSyncService } from '../server/services/PersistenceSyncService';

async function runVerification() {
  console.log('========================================================================');
  console.log('BẮT ĐẦU KIỂM THỬ XÓA TỔNG BÁO BÀI THEO NGÀY & CÔ LẬP DỮ LIỆU');
  console.log('========================================================================\n');

  const db = getDatabase();
  const tenantId = 'tenant-lan-nguyen';
  const now = new Date().toISOString();

  const day1Date = '2026-11-10'; // Ngày kiểm thử 1 (có nhiều môn)
  const day2Date = '2026-11-11'; // Ngày kế tiếp (ngày kiểm thử 2)

  // 1. Tạo 3 dòng báo bài cho Day 1 và 2 dòng báo bài cho Day 2
  const day1Id1 = `test_d1_m1_${Date.now()}`;
  const day1Id2 = `test_d1_m2_${Date.now()}`;
  const day1Id3 = `test_d1_m3_${Date.now()}`;

  const day2Id1 = `test_d2_m1_${Date.now()}`;
  const day2Id2 = `test_d2_m2_${Date.now()}`;

  // Ghi vào Day 1
  timetableRepository.upsertAssignment({
    id: day1Id1,
    tenant_id: tenantId,
    class_id: `class-${tenantId}`,
    title: 'Báo bài môn Toán học',
    subject: 'Toán học',
    assigned_date: day1Date,
    due_date: day1Date,
    description: 'Làm bài tập hình học 1, 2, 3.',
    status: 'ACTIVE',
    is_pinned: 0,
    bg_color: 'default',
    text_color: 'default',
    author_role: 'TEACHER',
    author_name: 'Cô Mai Lan (GVCN)',
    created_at: now
  });

  timetableRepository.upsertAssignment({
    id: day1Id2,
    tenant_id: tenantId,
    class_id: `class-${tenantId}`,
    title: 'Báo bài môn Ngữ văn',
    subject: 'Ngữ văn',
    assigned_date: day1Date,
    due_date: day1Date,
    description: 'Đọc trước văn bản mới.',
    status: 'ACTIVE',
    is_pinned: 0,
    bg_color: 'default',
    text_color: 'default',
    author_role: 'TEACHER',
    author_name: 'Cô Mai Lan (GVCN)',
    created_at: now
  });

  timetableRepository.upsertAssignment({
    id: day1Id3,
    tenant_id: tenantId,
    class_id: `class-${tenantId}`,
    title: 'Báo bài môn Tiếng Anh',
    subject: 'Tiếng Anh',
    assigned_date: day1Date,
    due_date: day1Date,
    description: 'Học thuộc 10 từ vựng Unit 3.',
    status: 'ACTIVE',
    is_pinned: 0,
    bg_color: 'default',
    text_color: 'default',
    author_role: 'TEACHER',
    author_name: 'Cô Mai Lan (GVCN)',
    created_at: now
  });

  // Ghi vào Day 2 (ngày kế tiếp)
  timetableRepository.upsertAssignment({
    id: day2Id1,
    tenant_id: tenantId,
    class_id: `class-${tenantId}`,
    title: 'Báo bài môn Vật lí',
    subject: 'Vật lí',
    assigned_date: day2Date,
    due_date: day2Date,
    description: 'Làm thí nghiệm ảo bài 5.',
    status: 'ACTIVE',
    is_pinned: 0,
    bg_color: 'default',
    text_color: 'default',
    author_role: 'TEACHER',
    author_name: 'Cô Mai Lan (GVCN)',
    created_at: now
  });

  timetableRepository.upsertAssignment({
    id: day2Id2,
    tenant_id: tenantId,
    class_id: `class-${tenantId}`,
    title: 'Báo bài môn Hóa học',
    subject: 'Hóa học',
    assigned_date: day2Date,
    due_date: day2Date,
    description: 'Viết phương trình hóa học.',
    status: 'ACTIVE',
    is_pinned: 0,
    bg_color: 'default',
    text_color: 'default',
    author_role: 'TEACHER',
    author_name: 'Cô Mai Lan (GVCN)',
    created_at: now
  });

  // Snapshot số lượng dữ liệu ban đầu
  const initialTimetables = (db.prepare('SELECT COUNT(*) as c FROM timetables').get() as any).c;
  const initialExams = (db.prepare('SELECT COUNT(*) as c FROM exam_schedules').get() as any).c;
  const initialStudents = (db.prepare('SELECT COUNT(*) as c FROM students').get() as any).c;

  console.log('[BƯỚC 1] Khởi tạo dữ liệu kiểm thử an toàn:');
  console.log(`  -> Ngày 1 (${day1Date}): 3 môn học (Toán, Văn, Anh)`);
  console.log(`  -> Ngày 2 (${day2Date}): 2 môn học (Vật lí, Hóa học)`);

  // [TEST 1] Kiểm tra Xóa lẻ 1 dòng môn học
  console.log('\n[TEST 1] Kiểm tra xóa riêng 1 dòng môn học (Môn Tiếng Anh của Ngày 1)...');
  timetableRepository.deleteAssignment(tenantId, day1Id3);
  const checkDay1M3 = timetableRepository.getAssignmentById(tenantId, day1Id3);
  const checkDay1M1 = timetableRepository.getAssignmentById(tenantId, day1Id1);
  const checkDay1M2 = timetableRepository.getAssignmentById(tenantId, day1Id2);

  if (!checkDay1M3 && checkDay1M1 && checkDay1M2) {
    console.log('  ✓ PASS [TEST 1]: Xóa riêng từng dòng hoạt động chính xác (chỉ xóa đúng môn Tiếng Anh, môn Toán và Văn vẫn còn nguyên).');
  } else {
    throw new Error('FAIL [TEST 1]: Xóa lẻ môn học bị lỗi.');
  }

  // [TEST 2] Thêm lại môn để Ngày 1 đủ nhiều môn, sau đó thực hiện XÓA TỔNG TOÀN BỘ NGÀY 1
  console.log('\n[TEST 2] Thực hiện XÓA TỔNG TOÀN BỘ BÁO BÀI NGÀY 1...');
  // Lấy toàn bộ items của Ngày 1
  const allAssignments = timetableRepository.getAssignments(tenantId);
  const day1Items = allAssignments.filter(a => (a.assigned_date || a.due_date) === day1Date);
  const day1Ids = day1Items.map(i => i.id);

  console.log(`  -> Tìm thấy ${day1Ids.length} môn học thuộc Ngày 1: ${day1Items.map(i => i.subject).join(', ')}`);
  
  // Thực thi logic xóa tổng ngày (lặp xóa toàn bộ IDs của ngày đang chọn)
  for (const id of day1Ids) {
    timetableRepository.deleteAssignment(tenantId, id);
  }

  // Xác minh Ngày 1 không còn môn nào
  const afterDeleteDay1 = timetableRepository.getAssignments(tenantId).filter(a => (a.assigned_date || a.due_date) === day1Date);
  if (afterDeleteDay1.length === 0) {
    console.log(`  ✓ PASS [TEST 2]: Xóa tổng đã xóa sạch 100% các dòng báo bài của Ngày 1 (còn lại: ${afterDeleteDay1.length} môn).`);
  } else {
    throw new Error(`FAIL [TEST 2]: Ngày 1 vẫn còn sót ${afterDeleteDay1.length} môn.`);
  }

  // [TEST 3] Kiểm tra Ngày kế tiếp (Ngày 2) BẢO TOÀN NGUYÊN VẸN
  console.log('\n[TEST 3] Kiểm tra báo bài Ngày kế tiếp (Ngày 2: 2026-11-11)...');
  const day2Items = timetableRepository.getAssignments(tenantId).filter(a => (a.assigned_date || a.due_date) === day2Date);
  if (day2Items.length === 2 && day2Items.some(i => i.subject === 'Vật lí') && day2Items.some(i => i.subject === 'Hóa học')) {
    console.log(`  ✓ PASS [TEST 3]: Dữ liệu Ngày kế tiếp được BẢO TOÀN NGUYÊN VẸN (${day2Items.length} môn: Vật lí, Hóa học). Không bị xóa nhầm!`);
  } else {
    throw new Error(`FAIL [TEST 3]: Dữ liệu Ngày 2 bị ảnh hưởng hoặc thất thoát!`);
  }

  // [TEST 4] Kiểm tra Thời khóa biểu và dữ liệu các module khác không bị ảnh hưởng
  console.log('\n[TEST 4] Kiểm tra tính bất biến của Thời khóa biểu, Lịch thi, Học sinh...');
  const currentTimetables = (db.prepare('SELECT COUNT(*) as c FROM timetables').get() as any).c;
  const currentExams = (db.prepare('SELECT COUNT(*) as c FROM exam_schedules').get() as any).c;
  const currentStudents = (db.prepare('SELECT COUNT(*) as c FROM students').get() as any).c;

  if (currentTimetables === initialTimetables && currentExams === initialExams && currentStudents === initialStudents) {
    console.log(`  ✓ PASS [TEST 4]: Thời khóa biểu (${currentTimetables}), Lịch thi (${currentExams}), Học sinh (${currentStudents}) bất biến 100%.`);
  } else {
    throw new Error('FAIL [TEST 4]: Dữ liệu ngoài phạm vi bị thay đổi ngoài ý muốn.');
  }

  // [TEST 5] Kiểm tra Cơ chế lưu trữ bền vững & Tải lại (Persistence & Reload)
  console.log('\n[TEST 5] Kiểm tra lưu trữ đĩa & phục hồi qua PersistenceSyncService...');
  persistenceSyncService.flushToPersistentBackup();
  const hydrationCheck = persistenceSyncService.hydrateFromBackup();
  const reloadedDay2 = timetableRepository.getAssignments(tenantId).filter(a => (a.assigned_date || a.due_date) === day2Date);
  const reloadedDay1 = timetableRepository.getAssignments(tenantId).filter(a => (a.assigned_date || a.due_date) === day1Date);

  if (hydrationCheck.restored && reloadedDay1.length === 0 && reloadedDay2.length === 2) {
    console.log(`  ✓ PASS [TEST 5]: Sau khi tải lại từ bản lưu bền vững: Ngày 1 đã xóa hoàn toàn, Ngày 2 tồn tại chính xác.`);
  } else {
    throw new Error('FAIL [TEST 5]: Kiểm tra lưu trữ sau tải lại thất bại.');
  }

  // Dọn dẹp bản ghi kiểm thử Ngày 2
  for (const item of day2Items) {
    timetableRepository.deleteAssignment(tenantId, item.id);
  }
  persistenceSyncService.flushToPersistentBackup();
  console.log('\n  ✓ Đã dọn dẹp dữ liệu kiểm thử an toàn.');

  console.log('\n========================================================================');
  console.log('TẤT CẢ 5 TIÊU CHÍ KIỂM THỬ XÓA TỔNG BÁO BÀI ĐÃ PASS 100%!');
  console.log('========================================================================\n');
  process.exit(0);
}

runVerification().catch(err => {
  console.error('\n❌ VERIFICATION ERROR:', err);
  process.exit(1);
});
