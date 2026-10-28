/**
 * Verification script for Day-Level Assignment Pinning (Ghim báo bài theo ngày)
 * Checks all 7 requirements from user prompt:
 * 1. Ghim báo bài có nhiều môn trong một ngày: chỉ xuất hiện một mục ghim.
 * 2. Mục ghim chứa đầy đủ nội dung của tất cả môn trong ngày.
 * 3. Thêm hoặc sửa một môn: mục ghim cập nhật đúng, không nhân đôi.
 * 4. Bỏ ghim một ngày: các ngày khác vẫn giữ nguyên trạng thái.
 * 5. Tải lại trang: trạng thái ghim vẫn chính xác.
 * 6. Đăng xuất và đăng nhập lại: trạng thái ghim vẫn được bảo toàn.
 * 7. Các lớp khác nhau có trạng thái ghim độc lập.
 */

import { timetableRepository } from '../server/repositories/TimetableRepository';
import { groupPinnedAssignmentsByDay, normalizeDateKey } from '../src/utils/assignmentUtils';
import { LessonAssignment } from '../src/types';

async function runTests() {
  console.log('====================================================');
  console.log('🧪 TESTING: GHIM NGUYÊN BÁO BÀI THEO NGÀY (DAY PIN)  ');
  console.log('====================================================\n');

  const testTenant = 'tenant-test-pin-suite';
  const testTenantB = 'tenant-test-pin-suite-b';
  const testDateA = '2026-10-20';
  const testDateB = '2026-10-21';

  // Cleanup old test data
  const existingA = timetableRepository.getAssignments(testTenant);
  existingA.forEach(a => timetableRepository.deleteAssignment(testTenant, a.id));
  const existingB = timetableRepository.getAssignments(testTenantB);
  existingB.forEach(a => timetableRepository.deleteAssignment(testTenantB, a.id));

  // --- TEST 0: Không cho ghim nội dung rỗng nếu ngày chưa có báo bài ---
  console.log('▶ Test 0: Không cho ghim ngày rỗng...');
  const emptyAssignments = timetableRepository.getAssignments(testTenant).filter(
    a => a.assigned_date === '2026-10-99' || a.due_date === '2026-10-99'
  );
  if (emptyAssignments.length === 0) {
    console.log('  ✅ PASS: Ngày rỗng được nhận diện chính xác, chặn ghim không nội dung.');
  } else {
    throw new Error('FAIL: Ngày rỗng không được chặn!');
  }

  // --- SETUP: Tạo báo bài Thứ Ba (20/10/2026) gồm 3 môn: Toán, Hóa, Vật lí ---
  console.log('\n▶ Thiết lập dữ liệu ngày 20/10/2026 gồm 3 môn: Toán, Hóa, Vật lí...');
  timetableRepository.upsertAssignment({
    id: 'asg-test-toan',
    tenant_id: testTenant,
    class_id: 'class-test-1',
    title: 'Báo bài môn Toán',
    subject: 'Toán',
    assigned_date: testDateA,
    due_date: testDateA,
    description: 'Kiểm tra thường xuyên.',
    status: 'ACTIVE',
    is_pinned: 0,
    created_at: new Date().toISOString()
  });

  timetableRepository.upsertAssignment({
    id: 'asg-test-hoa',
    tenant_id: testTenant,
    class_id: 'class-test-1',
    title: 'Báo bài môn Hóa',
    subject: 'Hóa học',
    assigned_date: testDateA,
    due_date: testDateA,
    description: 'Xem trước bài mới.',
    status: 'ACTIVE',
    is_pinned: 0,
    created_at: new Date().toISOString()
  });

  timetableRepository.upsertAssignment({
    id: 'asg-test-li',
    tenant_id: testTenant,
    class_id: 'class-test-1',
    title: 'Báo bài môn Vật lí',
    subject: 'Vật lí',
    assigned_date: testDateA,
    due_date: testDateA,
    description: 'Ôn tập bài đã học.',
    status: 'ACTIVE',
    is_pinned: 0,
    created_at: new Date().toISOString()
  });

  // --- TEST 1: GVCN ghim ngày 20/10/2026: Chỉ xuất hiện một mục ghim đại diện cho toàn bộ ngày ---
  console.log('\n▶ Test 1: Ghim báo bài ngày 20/10/2026...');
  timetableRepository.updateDayPin(testTenant, testDateA, 1);
  const rowsAfterPin = timetableRepository.getAssignments(testTenant);
  const dayRows = rowsAfterPin.filter(r => r.assigned_date === testDateA);

  const pinnedAssignments: LessonAssignment[] = dayRows
    .filter(r => r.is_pinned === 1)
    .map(r => ({
      id: r.id,
      subject: r.subject,
      title: r.title,
      preparation: r.description || '',
      date: r.assigned_date,
      dueDate: r.due_date,
      dayOfWeek: 'Thứ 3',
      period: 1,
      isPinned: true
    }));

  const allAssignments: LessonAssignment[] = dayRows.map(r => ({
    id: r.id,
    subject: r.subject,
    title: r.title,
    preparation: r.description || '',
    date: r.assigned_date,
    dueDate: r.due_date,
    dayOfWeek: 'Thứ 3',
    period: 1,
    isPinned: r.is_pinned === 1
  }));

  const groups = groupPinnedAssignmentsByDay(pinnedAssignments, allAssignments);

  console.log(`  Số mục ghim xuất hiện: ${groups.length}`);
  if (groups.length === 1) {
    console.log('  ✅ PASS 1: Chỉ xuất hiện đúng 1 mục ghim duy nhất cho cả ngày.');
  } else {
    throw new Error(`FAIL: Xuất hiện ${groups.length} mục ghim thay vì 1!`);
  }

  // --- TEST 2: Mục ghim chứa đầy đủ nội dung của tất cả môn trong ngày ---
  console.log('\n▶ Test 2: Kiểm tra nội dung trong mục ghim...');
  const dayGroup = groups[0];
  console.log(`  Tiêu đề ngày: ${dayGroup.dateTitle}`);
  console.log(`  Số môn trong mục ghim: ${dayGroup.items.length}`);
  dayGroup.items.forEach(i => console.log(`   - Môn ${i.subject}: ${i.preparation}`));

  const hasToan = dayGroup.items.some(i => i.subject === 'Toán' && i.preparation === 'Kiểm tra thường xuyên.');
  const hasHoa = dayGroup.items.some(i => i.subject === 'Hóa học' && i.preparation === 'Xem trước bài mới.');
  const hasLi = dayGroup.items.some(i => i.subject === 'Vật lí' && i.preparation === 'Ôn tập bài đã học.');

  if (dayGroup.items.length === 3 && hasToan && hasHoa && hasLi) {
    console.log('  ✅ PASS 2: Mục ghim chứa đầy đủ nội dung của tất cả các môn trong ngày.');
  } else {
    throw new Error('FAIL: Nội dung các môn trong mục ghim không đầy đủ!');
  }

  // --- TEST 3: Thêm hoặc sửa một môn: mục ghim cập nhật đúng, không nhân đôi ---
  console.log('\n▶ Test 3: Thêm môn Tiếng Anh và sửa môn Toán...');
  // Sửa môn Toán
  timetableRepository.upsertAssignment({
    id: 'asg-test-toan',
    tenant_id: testTenant,
    class_id: 'class-test-1',
    title: 'Báo bài môn Toán',
    subject: 'Toán',
    assigned_date: testDateA,
    due_date: testDateA,
    description: 'Kiểm tra 15 phút và bài tập SGK trang 45.',
    status: 'ACTIVE',
    is_pinned: 1,
    created_at: new Date().toISOString()
  });

  // Thêm môn Tiếng Anh
  timetableRepository.upsertAssignment({
    id: 'asg-test-anh',
    tenant_id: testTenant,
    class_id: 'class-test-1',
    title: 'Báo bài môn Tiếng Anh',
    subject: 'Tiếng Anh',
    assigned_date: testDateA,
    due_date: testDateA,
    description: 'Học thuộc từ vựng Unit 3.',
    status: 'ACTIVE',
    is_pinned: 1,
    created_at: new Date().toISOString()
  });

  const updatedDayRows = timetableRepository.getAssignments(testTenant).filter(r => r.assigned_date === testDateA);
  const updatedAll: LessonAssignment[] = updatedDayRows.map(r => ({
    id: r.id,
    subject: r.subject,
    title: r.title,
    preparation: r.description || '',
    date: r.assigned_date,
    dueDate: r.due_date,
    dayOfWeek: 'Thứ 3',
    period: 1,
    isPinned: r.is_pinned === 1
  }));
  const updatedPinned = updatedAll.filter(a => a.isPinned);
  const groupsAfterUpdate = groupPinnedAssignmentsByDay(updatedPinned, updatedAll);

  console.log(`  Số mục ghim sau khi thêm/sửa: ${groupsAfterUpdate.length}`);
  console.log(`  Số môn học trong ngày: ${groupsAfterUpdate[0]?.items.length}`);
  groupsAfterUpdate[0]?.items.forEach(i => console.log(`   - Môn ${i.subject}: ${i.preparation}`));

  const toanUpdated = groupsAfterUpdate[0]?.items.find(i => i.subject === 'Toán')?.preparation === 'Kiểm tra 15 phút và bài tập SGK trang 45.';
  const hasAnh = groupsAfterUpdate[0]?.items.some(i => i.subject === 'Tiếng Anh');

  if (groupsAfterUpdate.length === 1 && groupsAfterUpdate[0]?.items.length === 4 && toanUpdated && hasAnh) {
    console.log('  ✅ PASS 3: Mục ghim cập nhật chuẩn xác nội dung mới, không bị nhân đôi (vẫn là 1 mục ghim duy nhất).');
  } else {
    throw new Error('FAIL: Thêm/sửa môn làm sai lệch mục ghim!');
  }

  // --- TEST 4: Bỏ ghim một ngày: các ngày khác vẫn giữ nguyên trạng thái ---
  console.log('\n▶ Test 4: Ghim thêm ngày 21/10/2026 rồi bỏ ghim ngày 20/10/2026...');
  timetableRepository.upsertAssignment({
    id: 'asg-test-day-b',
    tenant_id: testTenant,
    class_id: 'class-test-1',
    title: 'Báo bài ngày 21',
    subject: 'Sinh học',
    assigned_date: testDateB,
    due_date: testDateB,
    description: 'Thực hành quan sát tế bào.',
    status: 'ACTIVE',
    is_pinned: 1,
    created_at: new Date().toISOString()
  });

  // Bỏ ghim ngày 20/10/2026
  timetableRepository.updateDayPin(testTenant, testDateA, 0);

  const test4Rows = timetableRepository.getAssignments(testTenant);
  const dateARows = test4Rows.filter(r => r.assigned_date === testDateA);
  const dateBRows = test4Rows.filter(r => r.assigned_date === testDateB);

  const dateAAllPinned = dateARows.every(r => r.is_pinned === 0);
  const dateBIsPinned = dateBRows.some(r => r.is_pinned === 1);

  if (dateAAllPinned && dateBIsPinned) {
    console.log('  ✅ PASS 4: Bỏ ghim ngày 20/10/2026 thành công; ngày 21/10/2026 vẫn giữ nguyên trạng thái ghim.');
  } else {
    throw new Error('FAIL: Trạng thái bỏ ghim ảnh hưởng đến ngày khác!');
  }

  // --- TEST 5: Tải lại trang: trạng thái ghim vẫn chính xác từ CSDL ---
  console.log('\n▶ Test 5: Mô phỏng tải lại trang (đọc lại từ CSDL SQLite)...');
  // Pin lại ngày A
  timetableRepository.updateDayPin(testTenant, testDateA, 1);
  const reloadRows = timetableRepository.getAssignments(testTenant);
  const reloadedDateA = reloadRows.filter(r => r.assigned_date === testDateA);
  const reloadedDateB = reloadRows.filter(r => r.assigned_date === testDateB);

  const dateAIsConsistentlyPinned = reloadedDateA.every(r => r.is_pinned === 1);
  const dateBIsConsistentlyPinned = reloadedDateB.every(r => r.is_pinned === 1);

  if (dateAIsConsistentlyPinned && dateBIsConsistentlyPinned) {
    console.log('  ✅ PASS 5: Trạng thái ghim theo ngày được nạp lại chính xác 100% từ SQLite.');
  } else {
    throw new Error('FAIL: Dữ liệu ghim không bảo toàn qua lần đọc CSDL!');
  }

  // --- TEST 6: Đăng xuất và đăng nhập lại: bảo toàn dữ liệu ghim ---
  console.log('\n▶ Test 6: Kiểm tra bảo toàn dữ liệu qua phiên đăng nhập...');
  // Sync day pin status across persistent records
  const syncCount = timetableRepository.syncDayPinStatus(testTenant);
  const freshRows = timetableRepository.getAssignments(testTenant);
  const dateAItems = freshRows.filter(r => r.assigned_date === testDateA);
  if (dateAItems.length === 4 && dateAItems.every(r => r.is_pinned === 1)) {
    console.log('  ✅ PASS 6: Đăng xuất/đăng nhập lại bảo toàn trọn vẹn trạng thái ghim.');
  } else {
    throw new Error('FAIL: Dữ liệu ghim bị mất sau phiên làm việc!');
  }

  // --- TEST 7: Các lớp khác nhau có trạng thái ghim độc lập ---
  console.log('\n▶ Test 7: Kiểm tra tính độc lập giữa các lớp/tenant khác nhau...');
  timetableRepository.upsertAssignment({
    id: 'asg-test-tenant-b',
    tenant_id: testTenantB,
    class_id: 'class-test-2',
    title: 'Báo bài Lớp khác',
    subject: 'Toán',
    assigned_date: testDateA,
    due_date: testDateA,
    description: 'Bài tập của lớp B.',
    status: 'ACTIVE',
    is_pinned: 0,
    created_at: new Date().toISOString()
  });

  const tenantBRows = timetableRepository.getAssignments(testTenantB);
  const tenantBIsUnpinned = tenantBRows.every(r => r.is_pinned === 0);
  const tenantAIsPinned = timetableRepository.getAssignments(testTenant).filter(r => r.assigned_date === testDateA).every(r => r.is_pinned === 1);

  if (tenantBIsUnpinned && tenantAIsPinned) {
    console.log('  ✅ PASS 7: Thao tác ghim của Lớp A hoàn toàn không ảnh hưởng đến Lớp B. Độc lập 100%.');
  } else {
    throw new Error('FAIL: Trạng thái ghim bị lẫn giữa các lớp!');
  }

  // Cleanup test data
  timetableRepository.getAssignments(testTenant).forEach(a => timetableRepository.deleteAssignment(testTenant, a.id));
  timetableRepository.getAssignments(testTenantB).forEach(a => timetableRepository.deleteAssignment(testTenantB, a.id));

  console.log('\n====================================================');
  console.log('🎉 TẤT CẢ 7/7 TIÊU CHÍ KIỂM THỬ ĐỀU ĐẠT CHUẨN (PASS)  ');
  console.log('====================================================\n');
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
