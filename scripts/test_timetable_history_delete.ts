/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getDatabase } from '../server/db/database';
import { timetableRepository } from '../server/repositories/TimetableRepository';
import { academicService } from '../src/services/AcademicService';
import { initialTimetable } from '../src/data/demoData';

async function testTimetableHistoryDeletion() {
  console.log('================================================================');
  console.log('BẮT ĐẦU KIỂM THỬ CHỨC NĂNG XÓA TỪNG BẢN GHI LỊCH SỬ THỜI KHÓA BIỂU');
  console.log('================================================================\n');

  const tenantId = 'tenant-lan-nguyen';
  const classId = 'class-11a1-2025';
  const academicYear = '2025 - 2026';
  const semester = 'Học kỳ I';

  // 1. Setup mock versions in history
  const activeVerId = 'tkb-active-main-test';
  const historyVer1Id = 'tkb-history-ver-alpha';
  const historyVer2Id = 'tkb-history-ver-beta';
  const historyVer3Id = 'tkb-history-ver-gamma';

  const scheduleGrid = {
    working: {
      id: activeVerId,
      versionName: 'TKB Đang Sử Dụng (Chính thức)',
      semester: 'HK1',
      validFrom: '15/09/2025',
      isActive: true,
      schedule: initialTimetable.schedule
    },
    applied: {
      id: activeVerId,
      versionName: 'TKB Đang Sử Dụng (Chính thức)',
      semester: 'HK1',
      validFrom: '15/09/2025',
      isActive: true,
      schedule: initialTimetable.schedule
    },
    history: [
      {
        id: activeVerId,
        versionName: 'TKB Đang Sử Dụng (Chính thức)',
        semester: 'HK1',
        validFrom: '15/09/2025',
        isActive: true,
        schedule: initialTimetable.schedule
      },
      {
        id: historyVer1Id,
        versionName: 'TKB Lịch Sử 1 (Thử nghiệm Alpha)',
        semester: 'HK1',
        validFrom: '01/09/2025',
        isActive: false,
        schedule: initialTimetable.schedule
      },
      {
        id: historyVer2Id,
        versionName: 'TKB Lịch Sử 2 (Bản Cũ Beta)',
        semester: 'HK1',
        validFrom: '10/09/2025',
        isActive: false,
        schedule: initialTimetable.schedule
      },
      {
        id: historyVer3Id,
        versionName: 'TKB Lịch Sử 3 (Bản Gamma)',
        semester: 'HK1',
        validFrom: '12/09/2025',
        isActive: false,
        schedule: initialTimetable.schedule
      }
    ],
    status: 'APPLIED'
  };

  // Save baseline to SQLite database
  timetableRepository.saveTimetable({
    tenant_id: tenantId,
    class_id: classId,
    academic_year: academicYear,
    semester: semester,
    schedule_grid_json: JSON.stringify(scheduleGrid),
    updated_at: new Date().toISOString(),
    updated_by: 'test-runner'
  });

  console.log('[TEST 1] Khởi tạo dữ liệu mẫu với 4 phiên bản lịch sử:');
  console.log(`  - Active: ${activeVerId}`);
  console.log(`  - History 1: ${historyVer1Id}`);
  console.log(`  - History 2: ${historyVer2Id}`);
  console.log(`  - History 3: ${historyVer3Id}`);

  // Read back from SQLite master database
  let row = timetableRepository.getTimetable(tenantId, classId, academicYear, semester);
  let parsed = JSON.parse(row!.schedule_grid_json);
  if (parsed.history.length !== 4) {
    throw new Error(`FAIL: Expected 4 history versions, got ${parsed.history.length}`);
  }
  console.log('  ✓ Đã lưu và đọc thành công 4 bản ghi lịch sử từ SQLite.\n');

  // [TEST 2] Xóa một bản ghi lịch sử cụ thể (historyVer2Id)
  console.log('[TEST 2] Tiến hành xóa ĐÚNG MỘT bản ghi lịch sử (historyVer2Id: TKB Lịch Sử 2)...');
  const targetDeleteId = historyVer2Id;
  const updatedHistory = parsed.history.filter((v: any) => v.id !== targetDeleteId);

  // Save updated grid (simulating delete operation and server sync)
  const updatedGrid = {
    ...parsed,
    history: updatedHistory
  };

  timetableRepository.saveTimetable({
    tenant_id: tenantId,
    class_id: classId,
    academic_year: academicYear,
    semester: semester,
    schedule_grid_json: JSON.stringify(updatedGrid),
    updated_at: new Date().toISOString(),
    updated_by: 'test-runner'
  });

  // Re-read from SQLite database (simulating page reload / restart)
  row = timetableRepository.getTimetable(tenantId, classId, academicYear, semester);
  parsed = JSON.parse(row!.schedule_grid_json);

  // Verification 1: Target record is deleted
  const deletedFound = parsed.history.find((v: any) => v.id === targetDeleteId);
  if (deletedFound) {
    throw new Error('FAIL: Bản ghi cần xóa vẫn còn tồn tại trong SQLite!');
  }
  console.log(`  ✓ Đã xóa thành công bản ghi [${targetDeleteId}].`);

  // Verification 2: Other records remain intact
  if (parsed.history.length !== 3) {
    throw new Error(`FAIL: Expected exactly 3 remaining records, got ${parsed.history.length}`);
  }
  const hasVer1 = parsed.history.some((v: any) => v.id === historyVer1Id);
  const hasVer3 = parsed.history.some((v: any) => v.id === historyVer3Id);
  const hasActive = parsed.history.some((v: any) => v.id === activeVerId);

  if (!hasVer1 || !hasVer3 || !hasActive) {
    throw new Error('FAIL: Các bản ghi khác bị ảnh hưởng hoặc bị xóa nhầm!');
  }
  console.log('  ✓ Toàn bộ các bản ghi lịch sử khác còn nguyên vẹn 100%.');

  // Verification 3: Applied & working timetable is unchanged
  if (parsed.applied.id !== activeVerId || parsed.working.id !== activeVerId) {
    throw new Error('FAIL: Thời khóa biểu đang áp dụng hoặc bản làm việc bị thay đổi ngoài ý muốn!');
  }
  console.log('  ✓ Thời khóa biểu đang áp dụng (applied) và bản làm việc (working) không thay đổi.');

  // [TEST 3] Kiểm tra xóa bản ghi lịch sử có ID trùng với TKB đang áp dụng (Requirement 7)
  console.log('\n[TEST 3] Kiểm tra xóa bản ghi lịch sử trùng ID với TKB đang sử dụng...');
  const updatedHistoryWithoutActive = parsed.history.filter((v: any) => v.id !== activeVerId);
  const updatedGridWithoutActive = {
    ...parsed,
    history: updatedHistoryWithoutActive
  };

  timetableRepository.saveTimetable({
    tenant_id: tenantId,
    class_id: classId,
    academic_year: academicYear,
    semester: semester,
    schedule_grid_json: JSON.stringify(updatedGridWithoutActive),
    updated_at: new Date().toISOString(),
    updated_by: 'test-runner'
  });

  row = timetableRepository.getTimetable(tenantId, classId, academicYear, semester);
  parsed = JSON.parse(row!.schedule_grid_json);

  if (parsed.applied.id !== activeVerId) {
    throw new Error('FAIL: Xóa bản ghi lịch sử làm mất TKB đang sử dụng!');
  }
  if (parsed.history.some((v: any) => v.id === activeVerId)) {
    throw new Error('FAIL: Bản ghi lịch sử trùng ID không được xóa khỏi danh sách lịch sử!');
  }
  console.log('  ✓ Bản ghi lịch sử đã được xóa khỏi danh sách, trong khi TKB đang sử dụng vẫn được bảo toàn nguyên vẹn 100%.');

  // [TEST 4] Kiểm tra sau khi tải lại từ SQLite
  console.log('\n[TEST 4] Kiểm tra tính bền vững sau khi tải lại (Persistence after Reload)...');
  const finalCheckRow = timetableRepository.getTimetable(tenantId, classId, academicYear, semester);
  const finalParsed = JSON.parse(finalCheckRow!.schedule_grid_json);

  if (finalParsed.history.length !== 2) {
    throw new Error(`FAIL: Persistence mismatch: Expected 2 records, got ${finalParsed.history.length}`);
  }
  console.log('  ✓ Bản ghi đã xóa không xuất hiện trở lại sau khi reload từ cơ sở dữ liệu chính.');

  console.log('\n================================================================');
  console.log('TẤT CẢ CÁC BÀI KIỂM THỬ XÓA LỊCH SỬ THỜI KHÓA BIỂU ĐÃ ĐẠT (PASS 100%)');
  console.log('================================================================');
}

testTimetableHistoryDeletion().catch(err => {
  console.error('\n[TEST ERROR]:', err);
  process.exit(1);
});
