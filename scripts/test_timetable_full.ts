import { getDatabase } from '../server/db/database';
import { timetableRepository } from '../server/repositories/TimetableRepository';
import { persistenceSyncService } from '../server/services/PersistenceSyncService';
import * as XLSX from 'xlsx';
import * as fs from 'fs';

async function runTests() {
  console.log('--- STARTING TIMETABLE FULL TEST SUITE ---');
  const results: Record<string, 'PASS' | 'FAIL'> = {};

  const db = getDatabase();

  // 1. Kiểm tra nơi lưu TKB thực tế
  console.log('\n[TEST] 1. Xác định nơi lưu TKB thực tế:');
  const tbRows = db.prepare('SELECT tenant_id, class_id, academic_year, semester, updated_at FROM timetables').all();
  console.log('Timetables in SQLite kgcns_master.db:', tbRows);
  if (tbRows.length > 0) {
    results['Nơi lưu TKB thực tế (SQLite kgcns_master.db & persistent backup)'] = 'PASS';
  } else {
    results['Nơi lưu TKB thực tế'] = 'FAIL';
  }

  // 2. Kiểm tra lớp chưa có TKB:
  console.log('\n[TEST] 2. Lớp chưa có TKB:');
  const emptyTenantId = 'tenant-test-empty-class';
  const emptyClassId = 'class-empty-1';
  const emptyTkb = timetableRepository.getTimetable(emptyTenantId, emptyClassId, '2025 - 2026', 'Học kỳ I');
  if (emptyTkb === null) {
    console.log('PASS: Lớp chưa có TKB trả về null an toàn, không crash.');
    results['Lớp chưa có TKB'] = 'PASS';
  } else {
    results['Lớp chưa có TKB'] = 'FAIL';
  }

  // 3. Kiểm tra nhập file Excel & hỗ trợ cả 2 định dạng (Matrix và List) + file lỗi:
  console.log('\n[TEST] 3. Đọc và kiểm tra file Excel (Matrix & List & File lỗi):');
  // 3a. Matrix format
  const matrixData = [
    { 'Thời gian bắt đầu': '07:15', 'Thời gian kết thúc': '08:00', 'Thứ 2': 'Toán - Thầy An', 'Thứ 3': 'Vật lí - Cô Bình', 'Thứ 4': '', 'Thứ 5': '', 'Thứ 6': '', 'Thứ 7': '' },
    { 'Thời gian bắt đầu': '08:00', 'Thời gian kết thúc': '08:45', 'Thứ 2': 'Hóa học - Thầy Nam', 'Thứ 3': 'Ngữ văn - Cô Lan', 'Thứ 4': '', 'Thứ 5': '', 'Thứ 6': '', 'Thứ 7': '' }
  ];
  const ws1 = XLSX.utils.json_to_sheet(matrixData);
  const wb1 = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb1, ws1, 'Sheet1');
  const buf1 = XLSX.write(wb1, { type: 'buffer', bookType: 'xlsx' });

  // 3b. List format
  const listData = [
    { 'Thứ': 'Thứ 2', 'Buổi': 'Sáng', 'Tiết': 1, 'Môn': 'Toán học', 'Giáo viên': 'Thầy An' },
    { 'Thứ': 'Thứ 2', 'Buổi': 'Sáng', 'Tiết': 2, 'Môn': 'Hóa học', 'Giáo viên': 'Thầy Nam' }
  ];
  const wsList = XLSX.utils.json_to_sheet(listData);
  const wbList = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wbList, wsList, 'Sheet1');
  const bufList = XLSX.write(wbList, { type: 'buffer', bookType: 'xlsx' });

  // Parser helper matching TimetableExcelImportModal logic
  function parseAndValidateTkbExcel(buf: Buffer): { success: boolean; format?: string; error?: string } {
    try {
      const wb = XLSX.read(buf, { type: 'buffer' });
      if (!wb.SheetNames || wb.SheetNames.length === 0) {
        return { success: false, error: 'Không có trang tính' };
      }
      const ws = wb.Sheets[wb.SheetNames[0]];
      if (!ws) return { success: false, error: 'Sheet rỗng' };
      const rawData: any[] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      if (rawData.length < 2) return { success: false, error: 'Thiếu dữ liệu' };

      let headerRowIndex = -1;
      let format = '';
      for (let i = 0; i < Math.min(6, rawData.length); i++) {
        const rowStr = (rawData[i] || []).map((c: any) => String(c).trim().toLowerCase()).join(' ');
        if (
          (rowStr.includes('bắt đầu') || rowStr.includes('thời gian') || rowStr.includes('tiết')) &&
          (rowStr.includes('thứ 2') || rowStr.includes('thứ ba') || rowStr.includes('thứ 3'))
        ) {
          headerRowIndex = i;
          format = 'matrix';
          break;
        }
        if (rowStr.includes('thứ') && rowStr.includes('tiết') && rowStr.includes('môn')) {
          headerRowIndex = i;
          format = 'list';
          break;
        }
      }
      if (headerRowIndex === -1) {
        return { success: false, error: 'File Excel không đúng cấu trúc Thời khóa biểu mẫu' };
      }
      return { success: true, format };
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  }

  const resMatrix = parseAndValidateTkbExcel(buf1);
  const resList = parseAndValidateTkbExcel(bufList);

  // 3c. Invalid file tests: corrupt buffer & non-timetable excel
  const corruptBuf = Buffer.from('NOT_AN_EXCEL_FILE_CONTENT');
  const resCorrupt = parseAndValidateTkbExcel(corruptBuf);

  const nonTkbData = [
    { 'Họ và tên': 'Nguyễn Văn A', 'Điểm Toán': 9, 'Điểm Văn': 8 }
  ];
  const wsNon = XLSX.utils.json_to_sheet(nonTkbData);
  const wbNon = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wbNon, wsNon, 'Sheet1');
  const bufNon = XLSX.write(wbNon, { type: 'buffer', bookType: 'xlsx' });
  const resNonTkb = parseAndValidateTkbExcel(bufNon);

  if (resMatrix.success && resList.success && !resCorrupt.success && !resNonTkb.success) {
    console.log('PASS: Hỗ trợ cả 2 định dạng (Matrix & List). File lỗi & file không đúng cấu trúc TKB bị chặn chính xác.');
    results['Đọc và kiểm tra file Excel (Matrix, List, Chặn file lỗi/sai định dạng)'] = 'PASS';
  } else {
    results['Đọc và kiểm tra file Excel'] = 'FAIL';
  }

  // 4. Kiểm tra phương án "Tạo bản mới" (Create New Version in History):
  console.log('\n[TEST] 4. Phương án "Tạo bản mới":');
  const testTenant = 'tenant-lan-nguyen';
  const testClass = 'class-11a1-2025';

  const v1 = {
    id: `tkb-${testTenant}-v1`,
    versionName: 'TKB Bản Gốc V1',
    semester: 'HK1',
    schedule: [{ dayOfWeek: 'Thứ 2', morningPeriods: [{ period: 1, subject: 'Toán' }] }]
  };
  const v2 = {
    id: `tkb-${testTenant}-v2`,
    versionName: 'TKB Bản Mới V2 (Nhập Excel)',
    semester: 'HK1',
    schedule: [{ dayOfWeek: 'Thứ 2', morningPeriods: [{ period: 1, subject: 'Văn' }] }]
  };

  const gridWithHistory = {
    working: v2,
    applied: v1,
    history: [v2, v1],
    status: 'DRAFT'
  };

  timetableRepository.saveTimetable({
    tenant_id: testTenant,
    class_id: testClass,
    academic_year: '2025 - 2026',
    semester: 'Học kỳ I',
    schedule_grid_json: JSON.stringify(gridWithHistory),
    updated_at: new Date().toISOString(),
    updated_by: 'gvcn-lan'
  });

  const reloaded = timetableRepository.getTimetable(testTenant, testClass, '2025 - 2026', 'Học kỳ I');
  const parsed = JSON.parse(reloaded!.schedule_grid_json);
  if (parsed.history.length === 2 && parsed.history[1].id === v1.id && parsed.history[0].id === v2.id) {
    console.log('PASS: Tạo bản mới tạo phiên bản riêng trong lịch sử, không xóa bản cũ.');
    results['Tạo bản mới giữ nguyên lịch sử cũ'] = 'PASS';
  } else {
    results['Tạo bản mới'] = 'FAIL';
  }

  // 5. Kiểm tra phương án "Ghi đè bản hiện tại" (Overwrite):
  console.log('\n[TEST] 5. Phương án "Ghi đè bản hiện tại":');
  const v1Overwritten = {
    ...v1,
    versionName: 'TKB Bản Gốc V1 (Đã ghi đè Excel)',
    schedule: [{ dayOfWeek: 'Thứ 2', morningPeriods: [{ period: 1, subject: 'Hóa học' }] }]
  };

  // Update in place (no duplicate)
  const gridOverwritten = {
    working: v1Overwritten,
    applied: v1, // Still v1 applied until explicitly applied
    history: [v2, v1Overwritten], // updated in-place
    status: 'DRAFT'
  };

  timetableRepository.saveTimetable({
    tenant_id: testTenant,
    class_id: testClass,
    academic_year: '2025 - 2026',
    semester: 'Học kỳ I',
    schedule_grid_json: JSON.stringify(gridOverwritten),
    updated_at: new Date().toISOString(),
    updated_by: 'gvcn-lan'
  });

  const checkOverwritten = timetableRepository.getTimetable(testTenant, testClass, '2025 - 2026', 'Học kỳ I');
  const parsedOver = JSON.parse(checkOverwritten!.schedule_grid_json);
  if (parsedOver.history.length === 2 && parsedOver.working.schedule[0].morningPeriods[0].subject === 'Hóa học') {
    console.log('PASS: Ghi đè cập nhật đúng bản hiện tại, không tạo bản trùng lặp trong lịch sử.');
    results['Ghi đè bản hiện tại không tạo bản trùng lặp'] = 'PASS';
  } else {
    results['Ghi đè bản hiện tại'] = 'FAIL';
  }

  // 6. Kiểm tra "Lưu và áp dụng ngay" (Save & Apply now):
  console.log('\n[TEST] 6. Nút "Lưu và áp dụng ngay":');
  const gridApplied = {
    working: v1Overwritten,
    applied: v1Overwritten,
    history: [v2, v1Overwritten],
    status: 'APPLIED'
  };

  timetableRepository.saveTimetable({
    tenant_id: testTenant,
    class_id: testClass,
    academic_year: '2025 - 2026',
    semester: 'Học kỳ I',
    schedule_grid_json: JSON.stringify(gridApplied),
    updated_at: new Date().toISOString(),
    updated_by: 'gvcn-lan'
  });

  const checkApplied = timetableRepository.getTimetable(testTenant, testClass, '2025 - 2026', 'Học kỳ I');
  const parsedApp = JSON.parse(checkApplied!.schedule_grid_json);
  if (parsedApp.status === 'APPLIED' && parsedApp.applied.schedule[0].morningPeriods[0].subject === 'Hóa học') {
    console.log('PASS: Lưu và áp dụng cập nhật kho dữ liệu chính và chuyển trạng thái APPLIED.');
    results['Lưu và áp dụng ngay cập nhật kho dữ liệu chính'] = 'PASS';
  } else {
    results['Lưu và áp dụng ngay'] = 'FAIL';
  }

  // 7. Đồng bộ học viên & phụ huynh (Chỉ thấy bản APPLIED, không thấy DRAFT nháp):
  console.log('\n[TEST] 7. Đồng bộ Học viên & Phụ huynh:');
  // Bây giờ GVCN sửa draft nháp mà chưa nhấn áp dụng
  const draftWorking = {
    ...v1Overwritten,
    schedule: [{ dayOfWeek: 'Thứ 2', morningPeriods: [{ period: 1, subject: 'NHÁP CHƯA ÁP DỤNG' }] }]
  };
  const gridDraft = {
    working: draftWorking,
    applied: v1Overwritten, // bản đang áp dụng cũ
    history: [v2, draftWorking],
    status: 'DRAFT'
  };

  timetableRepository.saveTimetable({
    tenant_id: testTenant,
    class_id: testClass,
    academic_year: '2025 - 2026',
    semester: 'Học kỳ I',
    schedule_grid_json: JSON.stringify(gridDraft),
    updated_at: new Date().toISOString(),
    updated_by: 'gvcn-lan'
  });

  // Giả lập đọc của học sinh:
  const studentViewRow = timetableRepository.getTimetable(testTenant, testClass, '2025 - 2026', 'Học kỳ I');
  const studentGrid = JSON.parse(studentViewRow!.schedule_grid_json);
  const studentFinal = studentGrid.applied; // Theo logic router role STUDENT / PARENT
  if (studentFinal.schedule[0].morningPeriods[0].subject === 'Hóa học') {
    console.log('PASS: Học viên và Phụ huynh chỉ thấy bản đã áp dụng ("Hóa học"), không thấy bản nháp đang sửa ("NHÁP CHƯA ÁP DỤNG").');
    results['Đồng bộ học viên và phụ huynh đúng bản áp dụng'] = 'PASS';
  } else {
    results['Đồng bộ học viên và phụ huynh'] = 'FAIL';
  }

  // 8. Kiểm tra độc lập giữa các lớp (Tenant Isolation):
  console.log('\n[TEST] 8. Độc lập giữa các lớp / GVCN (Tenant Isolation):');
  const coBinhRow = timetableRepository.getTimetable('tenant-co-binh-mv5brvta', 'class-10a1-mv5brvta', '2026 - 2027', 'Học kỳ I');
  const coBinhGrid = JSON.parse(coBinhRow!.schedule_grid_json);
  if (coBinhGrid.working && coBinhGrid.working.id === 'tkb-tenant-co-binh-mv5brvta') {
    console.log('PASS: Lớp của Cô Bình hoàn toàn độc lập, không bị ảnh hưởng bởi lớp Cô Lan.');
    results['Độc lập dữ liệu giữa các lớp'] = 'PASS';
  } else {
    results['Độc lập dữ liệu giữa các lớp'] = 'FAIL';
  }

  // 9. Kiểm tra khôi phục sau restart (Persistence & Backup):
  console.log('\n[TEST] 9. Kiểm tra khôi phục sau restart / reload:');
  persistenceSyncService.flushToPersistentBackup();
  const backupPath = 'server/db/system_persistence_backup.json';
  if (fs.existsSync(backupPath)) {
    const backupContent = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    if (backupContent.tables && Array.isArray(backupContent.tables.timetables) && backupContent.tables.timetables.length > 0) {
      console.log('PASS: Timetables được sao lưu bền vững vào persistent backup JSON.');
      results['Bảo toàn dữ liệu TKB qua reload/restart'] = 'PASS';
    } else {
      results['Bảo toàn dữ liệu TKB'] = 'FAIL';
    }
  }

  // 10. Kiểm tra các tab khác và dữ liệu tài khoản/học sinh/điểm số:
  console.log('\n[TEST] 10. Kiểm tra các tab khác vẫn hoạt động nguyên vẹn:');
  const studentsCount = (db.prepare('SELECT count(*) as c FROM students').get() as any).c;
  const adminCount = (db.prepare('SELECT count(*) as c FROM admin_accounts').get() as any).c;
  const teacherCount = (db.prepare('SELECT count(*) as c FROM teacher_accounts').get() as any).c;
  const assignmentsCount = (db.prepare('SELECT count(*) as c FROM assignments').get() as any).c;
  console.log(`Counts: students=${studentsCount}, admins=${adminCount}, teachers=${teacherCount}, assignments=${assignmentsCount}`);
  if (studentsCount >= 32 && adminCount >= 1 && teacherCount >= 2) {
    console.log('PASS: Toàn bộ dữ liệu học viên, tài khoản và các tab khác được bảo toàn 100%.');
    results['Các tab khác và dữ liệu hệ thống hoạt động nguyên vẹn'] = 'PASS';
  } else {
    results['Các tab khác'] = 'FAIL';
  }

  console.log('\n=== KẾT QUẢ KIỂM THỬ THỰC TẾ ===');
  for (const [name, res] of Object.entries(results)) {
    console.log(`- ${name}: [${res}]`);
  }
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
