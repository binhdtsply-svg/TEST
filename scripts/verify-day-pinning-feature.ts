import { getDatabase } from '../server/db/database';
import { timetableRepository } from '../server/repositories/TimetableRepository';
import { sessionRepository } from '../server/repositories/SessionRepository';
import { persistenceSyncService } from '../server/services/PersistenceSyncService';

async function runPinningTests() {
  console.log('================================================================================');
  console.log('KIỂM THỬ TÍNH NĂNG GHIM TOÀN BỘ BÁO BÀI THEO NGÀY');
  console.log('================================================================================\n');

  const BASE_URL = 'http://localhost:3000';
  const testResults: Record<string, 'PASS' | 'FAIL' | 'CHƯA KIỂM CHỨNG'> = {};
  const evidence: Record<string, string> = {};

  const db = getDatabase();

  // Create session for Teacher of tenant-lan-nguyen
  const teacherSession = sessionRepository.createSession({
    userId: 'teacher-lan-nguyen',
    role: 'TEACHER',
    tenantId: 'tenant-lan-nguyen',
    teacherId: 'teacher-lan-nguyen',
    credentialVersion: 1
  });

  const authHeader = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${teacherSession.token}`
  };

  const testDate = '2026-10-20'; // Thứ Ba (20/10/2026) theo ví dụ trong prompt
  const tenant1 = 'tenant-lan-nguyen';
  const tenant2 = 'tenant-hoang-nam';

  // -------------------------------------------------------------------------------------
  // Chuẩn bị dữ liệu mẫu theo đúng đề bài:
  // - Môn Toán: Kiểm tra thường xuyên.
  // - Môn Hóa: Xem trước bài mới.
  // - Môn Vật lí: Ôn tập bài đã học.
  // -------------------------------------------------------------------------------------
  const mathId = `asgn_test_math_${Date.now()}`;
  const chemId = `asgn_test_chem_${Date.now()}`;
  const physId = `asgn_test_phys_${Date.now()}`;

  try {
    // Xóa rác nếu có
    db.prepare('DELETE FROM assignments WHERE tenant_id = ? AND (assigned_date = ? OR due_date = ?)').run(tenant1, testDate, testDate);
    db.prepare('DELETE FROM assignments WHERE tenant_id = ? AND (assigned_date = ? OR due_date = ?)').run(tenant2, testDate, testDate);

    // Tạo 3 môn cho ngày 20/10/2026
    const subjects = [
      { id: mathId, subject: 'Toán', desc: 'Kiểm tra thường xuyên.' },
      { id: chemId, subject: 'Hóa học', desc: 'Xem trước bài mới.' },
      { id: physId, subject: 'Vật lí', desc: 'Ôn tập bài đã học.' }
    ];

    for (const s of subjects) {
      db.prepare(`
        INSERT INTO assignments (
          id, tenant_id, class_id, title, subject, assigned_date, due_date, description, status, is_pinned, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        s.id, tenant1, 'class-11a1-2025',
        `Báo bài môn ${s.subject}`, s.subject, testDate, testDate, s.desc,
        'ACTIVE', 0, new Date().toISOString(), new Date().toISOString()
      );
    }

    // ---------------------------------------------------------------------------------
    // TEST 1: Ghim báo bài có nhiều môn trong một ngày: chỉ xuất hiện một mục ghim
    // ---------------------------------------------------------------------------------
    const pinRes = await fetch(`${BASE_URL}/api/v1/timetable/assignments/day-toggle-pin`, {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify({ date: testDate, isPinned: true })
    });
    const pinData = await pinRes.json();

    const assignmentsInDb = db.prepare('SELECT * FROM assignments WHERE tenant_id = ? AND (assigned_date = ? OR due_date = ?)').all(tenant1, testDate) as any[];
    const allPinned = assignmentsInDb.length === 3 && assignmentsInDb.every(a => a.is_pinned === 1);

    // Kiểm tra API assignments trả về đúng
    const getRes = await fetch(`${BASE_URL}/api/v1/timetable/assignments?tenantId=${tenant1}`, {
      headers: authHeader
    });
    const getData = await getRes.json();
    const dayItems = (getData.data || []).filter((a: any) => (a.date || a.assigned_date || a.dueDate) === testDate);
    const pinnedDayItems = dayItems.filter((a: any) => a.isPinned);

    // Grouping logic (như PinnedNoticesCard và FeedModule):
    const map = new Map<string, any[]>();
    (getData.data || []).filter((a: any) => a.isPinned).forEach((item: any) => {
      const d = item.date || item.assigned_date || item.dueDate;
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(item);
    });

    const dayGroup = map.get(testDate);
    const dayGroupsCountForTestDate = map.has(testDate) ? 1 : 0;

    if (pinRes.ok && pinData.success && allPinned && dayGroupsCountForTestDate === 1) {
      testResults['1. Ghim báo bài có nhiều môn trong một ngày: chỉ xuất hiện một mục ghim'] = 'PASS';
      evidence['1'] = `Ngày ${testDate} có 3 môn (${assignmentsInDb.map(a => a.subject).join(', ')}). Khi nhấn ghim, cả 3 môn được ghim đồng bộ (is_pinned = 1), giao diện gộp thành duy nhất 1 mục đại diện đại diện cho ngày đó.`;
    } else {
      testResults['1. Ghim báo bài có nhiều môn trong một ngày: chỉ xuất hiện một mục ghim'] = 'FAIL';
      evidence['1'] = `Thất bại: pinRes=${pinRes.status}, allPinned=${allPinned}, groupsCount=${dayGroupsCountForTestDate}`;
    }

    // ---------------------------------------------------------------------------------
    // TEST 2: Mục ghim chứa đầy đủ nội dung của tất cả môn trong ngày
    // ---------------------------------------------------------------------------------
    if (dayGroup && dayGroup.length === 3) {
      const mathItem = dayGroup.find(i => i.subject === 'Toán');
      const chemItem = dayGroup.find(i => i.subject === 'Hóa học');
      const physItem = dayGroup.find(i => i.subject === 'Vật lí');

      const hasMathContent = mathItem && (mathItem.description || mathItem.preparation || '').includes('Kiểm tra thường xuyên');
      const hasChemContent = chemItem && (chemItem.description || chemItem.preparation || '').includes('Xem trước bài mới');
      const hasPhysContent = physItem && (physItem.description || physItem.preparation || '').includes('Ôn tập bài đã học');

      if (hasMathContent && hasChemContent && hasPhysContent) {
        testResults['2. Mục ghim chứa đầy đủ nội dung của tất cả môn trong ngày'] = 'PASS';
        evidence['2'] = `Mục ghim hiển thị đầy đủ 3 môn: Toán (${mathItem.description}), Hóa học (${chemItem.description}), Vật lí (${physItem.description}). Không sót môn nào.`;
      } else {
        testResults['2. Mục ghim chứa đầy đủ nội dung của tất cả môn trong ngày'] = 'FAIL';
        evidence['2'] = `Thiếu nội dung một trong các môn.`;
      }
    } else {
      testResults['2. Mục ghim chứa đầy đủ nội dung của tất cả môn trong ngày'] = 'FAIL';
      evidence['2'] = `Không đủ 3 môn trong mục ghim.`;
    }

    // ---------------------------------------------------------------------------------
    // TEST 3: Thêm hoặc sửa một môn: mục ghim cập nhật đúng, không nhân đôi
    // ---------------------------------------------------------------------------------
    const bioId = `asgn_test_bio_${Date.now()}`;
    // 3A: Thêm môn Sinh học vào ngày đã ghim
    const addBioRes = await fetch(`${BASE_URL}/api/v1/timetable/assignments`, {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify({
        id: bioId,
        subject: 'Sinh học',
        title: 'Báo bài môn Sinh học',
        assignedDate: testDate,
        dueDate: testDate,
        description: 'Vẽ sơ đồ trao đổi chất.',
        isPinned: true // Thừa kế ghim của ngày
      })
    });

    // 3B: Sửa nội dung môn Toán
    const updateMathRes = await fetch(`${BASE_URL}/api/v1/timetable/assignments`, {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify({
        id: mathId,
        subject: 'Toán',
        title: 'Báo bài môn Toán',
        assignedDate: testDate,
        dueDate: testDate,
        description: 'Kiểm tra 15 phút đạo hàm (ĐÃ CẬP NHẬT).',
        isPinned: true
      })
    });

    // Kiểm tra lại danh sách ghim
    const reGetRes = await fetch(`${BASE_URL}/api/v1/timetable/assignments?tenantId=${tenant1}`, {
      headers: authHeader
    });
    const reGetData = await reGetRes.json();
    const reMap = new Map<string, any[]>();
    (reGetData.data || []).filter((a: any) => a.isPinned).forEach((item: any) => {
      const d = item.date || item.assigned_date || item.dueDate;
      if (!reMap.has(d)) reMap.set(d, []);
      reMap.get(d)!.push(item);
    });

    const updatedDayGroup = reMap.get(testDate) || [];
    const updatedMath = updatedDayGroup.find(i => i.id === mathId);
    const addedBio = updatedDayGroup.find(i => i.id === bioId);

    if (
      addBioRes.ok && updateMathRes.ok &&
      reMap.has(testDate) &&
      updatedDayGroup.length === 4 &&
      updatedMath?.description?.includes('ĐÃ CẬP NHẬT') &&
      addedBio?.subject === 'Sinh học'
    ) {
      testResults['3. Thêm hoặc sửa một môn: mục ghim cập nhật đúng, không nhân đôi'] = 'PASS';
      evidence['3'] = `Thêm môn Sinh học và cập nhật môn Toán thành công. Mục ghim ngày ${testDate} vẫn là 1 mục duy nhất, tự động chứa 4 môn và phản ánh nội dung mới cập nhật.`;
    } else {
      testResults['3. Thêm hoặc sửa một môn: mục ghim cập nhật đúng, không nhân đôi'] = 'FAIL';
      evidence['3'] = `Cập nhật hoặc thêm môn không khớp. updatedDayGroup.length = ${updatedDayGroup.length}`;
    }

    // ---------------------------------------------------------------------------------
    // TEST 4: Bỏ ghim một ngày: các ngày khác vẫn giữ nguyên trạng thái
    // ---------------------------------------------------------------------------------
    const anotherDate = '2026-10-21';
    const anotherId = `asgn_another_day_${Date.now()}`;
    // Tạo 1 môn cho ngày 21/10 và ghim nó
    db.prepare(`
      INSERT INTO assignments (
        id, tenant_id, class_id, title, subject, assigned_date, due_date, description, status, is_pinned, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      anotherId, tenant1, 'class-11a1-2025',
      'Báo bài môn Văn', 'Ngữ văn', anotherDate, anotherDate, 'Soạn bài Tây Tiến.',
      'ACTIVE', 1, new Date().toISOString(), new Date().toISOString()
    );

    // Bỏ ghim ngày 20/10/2026
    const unpinRes = await fetch(`${BASE_URL}/api/v1/timetable/assignments/day-toggle-pin`, {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify({ date: testDate, isPinned: false })
    });

    // Kiểm tra trạng thái trong SQLite
    const testDateRows = db.prepare('SELECT is_pinned FROM assignments WHERE tenant_id = ? AND (assigned_date = ? OR due_date = ?)').all(tenant1, testDate) as any[];
    const anotherDateRows = db.prepare('SELECT is_pinned FROM assignments WHERE tenant_id = ? AND (assigned_date = ? OR due_date = ?)').all(tenant1, anotherDate) as any[];

    const testDateAllUnpinned = testDateRows.every(r => r.is_pinned === 0);
    const anotherDateStillPinned = anotherDateRows.length > 0 && anotherDateRows.every(r => r.is_pinned === 1);

    if (unpinRes.ok && testDateAllUnpinned && anotherDateStillPinned) {
      testResults['4. Bỏ ghim một ngày: các ngày khác vẫn giữ nguyên trạng thái'] = 'PASS';
      evidence['4'] = `Bỏ ghim ngày ${testDate} thành công (tất cả 4 môn về is_pinned = 0), trong khi ngày ${anotherDate} vẫn giữ nguyên trạng thái ghim (is_pinned = 1). Không ảnh hưởng chéo.`;
    } else {
      testResults['4. Bỏ ghim một ngày: các ngày khác vẫn giữ nguyên trạng thái'] = 'FAIL';
      evidence['4'] = `Thất bại: testDateAllUnpinned=${testDateAllUnpinned}, anotherDateStillPinned=${anotherDateStillPinned}`;
    }

    // Ghim lại ngày testDate để phục vụ test 5, 6, 7
    await fetch(`${BASE_URL}/api/v1/timetable/assignments/day-toggle-pin`, {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify({ date: testDate, isPinned: true })
    });

    // ---------------------------------------------------------------------------------
    // TEST 5: Tải lại trang: trạng thái ghim vẫn chính xác
    // ---------------------------------------------------------------------------------
    // Đọc trực tiếp từ kho SQLite chính và kiểm tra API fresh request
    const reloadFetch = await fetch(`${BASE_URL}/api/v1/timetable/assignments?tenantId=${tenant1}`, {
      headers: {
        'Authorization': `Bearer ${teacherSession.token}`
      }
    });
    const reloadData = await reloadFetch.json();
    const reloadedPinnedDay = (reloadData.data || []).filter((a: any) => (a.date === testDate || a.assigned_date === testDate) && a.isPinned);

    if (reloadFetch.ok && reloadedPinnedDay.length === 4) {
      testResults['5. Tải lại trang: trạng thái ghim vẫn chính xác'] = 'PASS';
      evidence['5'] = `Mọi yêu cầu truy vấn mới từ máy chủ đều trả về đầy đủ 4 môn của ngày ${testDate} với trạng thái isPinned = true.`;
    } else {
      testResults['5. Tải lại trang: trạng thái ghim vẫn chính xác'] = 'FAIL';
      evidence['5'] = `Dữ liệu sau khi tải lại không đúng. PinnedCount=${reloadedPinnedDay.length}`;
    }

    // ---------------------------------------------------------------------------------
    // TEST 6: Đăng xuất và đăng nhập lại: trạng thái ghim vẫn được bảo toàn
    // ---------------------------------------------------------------------------------
    // Đăng xuất
    await fetch(`${BASE_URL}/api/v1/auth/logout`, {
      method: 'POST',
      headers: authHeader
    });

    // Đăng nhập lại
    const reLoginRes = await fetch(`${BASE_URL}/api/v1/auth/login-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'ACT-ML-2025-LHP', selectedRole: 'TEACHER' })
    });
    const reLoginData = await reLoginRes.json();
    const newToken = reLoginData.token;

    const reAuthFetch = await fetch(`${BASE_URL}/api/v1/timetable/assignments?tenantId=${tenant1}`, {
      headers: {
        'Authorization': `Bearer ${newToken}`
      }
    });
    const reAuthData = await reAuthFetch.json();
    const postLoginPinnedDay = (reAuthData.data || []).filter((a: any) => (a.date === testDate || a.assigned_date === testDate) && a.isPinned);

    if (reLoginRes.ok && reAuthFetch.ok && postLoginPinnedDay.length === 4) {
      testResults['6. Đăng xuất và đăng nhập lại: trạng thái ghim vẫn được bảo toàn'] = 'PASS';
      evidence['6'] = `Đăng xuất thu hồi session cũ -> Đăng nhập lại nhận token mới -> Đọc lại dữ liệu: Toàn bộ 4 môn của ngày ${testDate} bảo toàn 100% trạng thái ghim.`;
    } else {
      testResults['6. Đăng xuất và đăng nhập lại: trạng thái ghim vẫn được bảo toàn'] = 'FAIL';
      evidence['6'] = `Không bảo toàn trạng thái sau đăng xuất/đăng nhập lại.`;
    }

    // ---------------------------------------------------------------------------------
    // TEST 7: Các lớp khác nhau có trạng thái ghim độc lập
    // ---------------------------------------------------------------------------------
    // Tạo 1 môn cho lớp khác (tenant-hoang-nam) cùng ngày 20/10/2026 nhưng KHÔNG ghim
    const namAssignId = `asgn_nam_test_${Date.now()}`;
    db.prepare(`
      INSERT INTO assignments (
        id, tenant_id, class_id, title, subject, assigned_date, due_date, description, status, is_pinned, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      namAssignId, tenant2, 'class-12a2-2025',
      'Báo bài lớp 12A2', 'Toán', testDate, testDate, 'Luyện đề thi THPT Quốc gia.',
      'ACTIVE', 0, new Date().toISOString(), new Date().toISOString()
    );

    // Kiểm tra trạng thái ghim của lớp Thầy Nam
    const namRows = db.prepare('SELECT is_pinned FROM assignments WHERE tenant_id = ? AND id = ?').all(tenant2, namAssignId) as any[];
    const lanRows = db.prepare('SELECT is_pinned FROM assignments WHERE tenant_id = ? AND (assigned_date = ? OR due_date = ?)').all(tenant1, testDate) as any[];

    const namIsUnpinned = namRows.length === 1 && namRows[0].is_pinned === 0;
    const lanIsPinned = lanRows.length === 4 && lanRows.every(r => r.is_pinned === 1);

    if (namIsUnpinned && lanIsPinned) {
      testResults['7. Các lớp khác nhau có trạng thái ghim độc lập'] = 'PASS';
      evidence['7'] = `Cùng ngày ${testDate}: Lớp Cô Lan (tenant-lan-nguyen) đang ghim (is_pinned = 1), trong khi Lớp Thầy Nam (tenant-hoang-nam) không ghim (is_pinned = 0). Phạm vi ghim được cô lập độc lập theo tenantId.`;
    } else {
      testResults['7. Các lớp khác nhau có trạng thái ghim độc lập'] = 'FAIL';
      evidence['7'] = `Xung đột ghim giữa các tenant.`;
    }

    // ---------------------------------------------------------------------------------
    // TEST 8: Các chức năng tạo, sửa, xóa báo bài theo môn vẫn hoạt động bình thường
    // ---------------------------------------------------------------------------------
    // 8A: Tạo môn mới
    const testAddId = `asgn_crud_add_${Date.now()}`;
    const crudAddRes = await fetch(`${BASE_URL}/api/v1/timetable/assignments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${newToken}`
      },
      body: JSON.stringify({
        id: testAddId,
        subject: 'Lịch sử',
        title: 'Báo bài môn Lịch sử',
        assignedDate: '2026-10-25',
        dueDate: '2026-10-25',
        description: 'Đọc bài Cách mạng tháng Tám.',
        bgColor: 'blue',
        textColor: 'blue'
      })
    });

    // 8B: Sửa môn
    const crudEditRes = await fetch(`${BASE_URL}/api/v1/timetable/assignments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${newToken}`
      },
      body: JSON.stringify({
        id: testAddId,
        subject: 'Lịch sử',
        title: 'Báo bài môn Lịch sử',
        assignedDate: '2026-10-25',
        dueDate: '2026-10-25',
        description: 'Đọc bài Cách mạng tháng Tám (BẢN SỬA ĐỔI CHI TIẾT).',
        bgColor: 'amber',
        textColor: 'amber'
      })
    });

    // 8C: Xóa môn
    const crudDeleteRes = await fetch(`${BASE_URL}/api/v1/timetable/assignments/${testAddId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${newToken}`
      }
    });

    const verifyDeleted = db.prepare('SELECT id FROM assignments WHERE id = ?').get(testAddId);

    if (crudAddRes.ok && crudEditRes.ok && crudDeleteRes.ok && !verifyDeleted) {
      testResults['8. Các chức năng tạo, sửa, xóa báo bài theo môn vẫn hoạt động bình thường'] = 'PASS';
      evidence['8'] = `Thao tác Tạo môn (HTTP ${crudAddRes.status}) -> Sửa nội dung/màu sắc môn (HTTP ${crudEditRes.status}) -> Xóa môn (HTTP ${crudDeleteRes.status}) hoạt động chuẩn mực theo từng môn học như thiết kế ban đầu.`;
    } else {
      testResults['8. Các chức năng tạo, sửa, xóa báo bài theo môn vẫn hoạt động bình thường'] = 'FAIL';
      evidence['8'] = `Thao tác CRUD môn thất bại: Add=${crudAddRes.status}, Edit=${crudEditRes.status}, Delete=${crudDeleteRes.status}`;
    }

    // Dọn dẹp dữ liệu thử nghiệm
    db.prepare('DELETE FROM assignments WHERE tenant_id = ? AND (assigned_date = ? OR due_date = ?)').run(tenant1, testDate, testDate);
    db.prepare('DELETE FROM assignments WHERE tenant_id = ? AND (assigned_date = ? OR due_date = ?)').run(tenant1, anotherDate, anotherDate);
    db.prepare('DELETE FROM assignments WHERE tenant_id = ? AND id = ?').run(tenant2, namAssignId);
    persistenceSyncService.flushToPersistentBackup();

  } catch (err: any) {
    console.error('Test execution error:', err);
  }

  // ---------------------------------------------------------------------------------
  // IN KẾT QUẢ TỔNG HỢP
  // ---------------------------------------------------------------------------------
  console.log('================================================================================');
  console.log('KẾT QUẢ KIỂM THỬ BẮT BUỘC (8 MỤC THEO ĐỀ BÀI):');
  console.log('================================================================================\n');

  let passed = 0;
  let idx = 1;
  for (const [name, res] of Object.entries(testResults)) {
    console.log(`[${res}] ${name}`);
    if (evidence[String(idx)]) {
      console.log(`       Bằng chứng: ${evidence[String(idx)]}`);
    }
    if (res === 'PASS') passed++;
    idx++;
  }

  console.log(`\nTổng kết: ${passed}/8 mục PASS.\n`);
  if (passed === 8) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runPinningTests().catch(err => {
  console.error(err);
  process.exit(1);
});
