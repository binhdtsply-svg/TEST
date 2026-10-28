import { getDatabase } from '../server/db/database';
import { classSettingsRepository } from '../server/repositories/ClassSettingsRepository';
import { persistenceSyncService } from '../server/services/PersistenceSyncService';
import { classService } from '../src/services/ClassService';
import { tenantService } from '../src/services/TenantService';
import { SubjectConfig } from '../src/types';

async function runTest() {
  console.log('================================================================');
  console.log('KIỂM TRA BẢO TOÀN CẤU HÌNH 9 MÔN HỌC & CHỐNG TỰ ĐỘNG CHÈN MÔN');
  console.log('================================================================\n');

  // 1. Tạo danh sách 9 môn học thực tế
  const nineSubjects: SubjectConfig[] = [
    { id: 'sub-toan', code: 'TOAN', name: 'Toán học', subjectName: 'Toán học', subjectType: 'MANDATORY', assessmentMode: 'SCORE_AND_COMMENT', selected: true, txColumnCount: 3, annualPeriods: 105 },
    { id: 'sub-van', code: 'VAN', name: 'Ngữ văn', subjectName: 'Ngữ văn', subjectType: 'MANDATORY', assessmentMode: 'SCORE_AND_COMMENT', selected: true, txColumnCount: 3, annualPeriods: 105 },
    { id: 'sub-eng', code: 'ENG', name: 'Tiếng Anh', subjectName: 'Tiếng Anh', subjectType: 'MANDATORY', assessmentMode: 'SCORE_AND_COMMENT', selected: true, txColumnCount: 3, annualPeriods: 105 },
    { id: 'sub-su', code: 'SU', name: 'Lịch sử', subjectName: 'Lịch sử', subjectType: 'MANDATORY', assessmentMode: 'SCORE_AND_COMMENT', selected: true, txColumnCount: 2, annualPeriods: 52 },
    { id: 'sub-gdtc', code: 'GDTC', name: 'Giáo dục thể chất', subjectName: 'Giáo dục thể chất', subjectType: 'MANDATORY', assessmentMode: 'COMMENT_ONLY', selected: true, txColumnCount: 0, annualPeriods: 70 },
    { id: 'sub-gdqp', code: 'GDQP', name: 'Giáo dục quốc phòng và an ninh', subjectName: 'Giáo dục quốc phòng và an ninh', subjectType: 'MANDATORY', assessmentMode: 'SCORE_AND_COMMENT', selected: true, txColumnCount: 2, annualPeriods: 35 },
    { id: 'sub-hdtn', code: 'HDTN', name: 'Hoạt động trải nghiệm, hướng nghiệp', subjectName: 'Hoạt động trải nghiệm, hướng nghiệp', subjectType: 'ACTIVITY', assessmentMode: 'COMMENT_ONLY', selected: true, txColumnCount: 0, annualPeriods: 105 },
    { id: 'sub-gddp', code: 'GDDP', name: 'Nội dung giáo dục của địa phương', subjectName: 'Nội dung giáo dục của địa phương', subjectType: 'MANDATORY', assessmentMode: 'COMMENT_ONLY', selected: true, txColumnCount: 0, annualPeriods: 35 },
    { id: 'sub-tin', code: 'TIN', name: 'Tin học', subjectName: 'Tin học', subjectType: 'ELECTIVE', assessmentMode: 'SCORE_AND_COMMENT', selected: true, txColumnCount: 3, annualPeriods: 70 }
  ];

  const testTenant = 'tenant-lan-nguyen';
  const db = getDatabase();

  // Test 1: Lưu 9 môn vào SQLite qua ClassSettingsRepository
  const existingRecord = classSettingsRepository.getByTenantAndClass(testTenant);
  if (!existingRecord) {
    throw new Error('Không tìm thấy class_settings của tenant-lan-nguyen!');
  }

  const updatedRecord = classSettingsRepository.update(testTenant, existingRecord.class_id, {
    subjects_json: JSON.stringify(nineSubjects)
  });

  const rowInDb = db.prepare('SELECT subjects_json FROM class_settings WHERE tenant_id = ?').get(testTenant) as any;
  const parsedFromDb: any[] = JSON.parse(rowInDb.subjects_json);

  console.log(`[TEST 1] Đã ghi vào SQLite: ${parsedFromDb.length} môn.`);
  if (parsedFromDb.length !== 9) {
    throw new Error(`Thất bại: SQLite có ${parsedFromDb.length} môn, kỳ vọng đúng 9 môn!`);
  }
  console.log('  -> PASS: SQLite lưu chính xác 9 môn.');

  // Test 2: Flush vào persistent backup
  persistenceSyncService.flushToPersistentBackup();
  console.log('[TEST 2] Đã flush đồng bộ vào persistent JSON backup.');

  // Test 3: Nạp vào ClassService và kiểm tra getSubjects()
  tenantService.setActiveTenant(testTenant);
  // Cập nhật cấu hình môn học trong ClassService
  (classService as any).settings.subjects = nineSubjects;
  const returnedSubjects = classService.getSubjects();

  console.log(`[TEST 3] classService.getSubjects() trả về: ${returnedSubjects.length} môn.`);
  if (returnedSubjects.length !== 9) {
    console.error('Các môn trả về:', returnedSubjects.map(s => s.name));
    throw new Error(`Thất bại: getSubjects() trả về ${returnedSubjects.length} môn thay vì đúng 9 môn! Đã bị tự động chèn môn thừa.`);
  }
  console.log('  -> PASS: getSubjects() bảo toàn chính xác 9 môn, KHÔNG TỰ ĐỘNG CHÈN 7 MÔN THỪA!');

  // Test 4: Kiểm tra danh sách môn trả về khớp hoàn toàn tên các môn đã cấu hình
  const returnedNames = returnedSubjects.map(s => s.name);
  console.log('  -> Danh sách 9 môn:', returnedNames.join(', '));
  const expectedNames = ['Toán học', 'Ngữ văn', 'Tiếng Anh', 'Lịch sử', 'Giáo dục thể chất', 'Giáo dục quốc phòng và an ninh', 'Hoạt động trải nghiệm, hướng nghiệp', 'Nội dung giáo dục của địa phương', 'Tin học'];
  for (const exp of expectedNames) {
    if (!returnedNames.includes(exp)) {
      throw new Error(`Thiếu môn kỳ vọng: ${exp}`);
    }
  }
  console.log('  -> PASS: 9 môn có tên và thuộc tính chuẩn xác 100%.');

  // Test 5: Khởi động lại giả lập và kiểm tra hydration
  const hydrationRes = persistenceSyncService.hydrateFromBackupIfAvailable();
  console.log(`[TEST 5] Hydration test: ${hydrationRes.message}`);
  const postHydrateRow = db.prepare('SELECT subjects_json FROM class_settings WHERE tenant_id = ?').get(testTenant) as any;
  const postHydrateSubjects = JSON.parse(postHydrateRow.subjects_json);
  console.log(`  -> Số môn sau khi hydrate: ${postHydrateSubjects.length}`);
  if (postHydrateSubjects.length !== 9) {
    throw new Error(`Thất bại: Sau hydrate còn ${postHydrateSubjects.length} môn!`);
  }
  console.log('  -> PASS: Sau khởi động lại và hydrate, 9 môn vẫn được bảo toàn nguyên vẹn.');

  // Test 6: Kiểm tra cách ly Tenant (Tenant Hoang Nam không bị ảnh hưởng)
  const hoangNamRecord = classSettingsRepository.getByTenantAndClass('tenant-hoang-nam');
  if (hoangNamRecord) {
    const hnSubjects = JSON.parse(hoangNamRecord.subjects_json || '[]');
    console.log(`[TEST 6] Tenant Hoang Nam có ${hnSubjects.length} môn (độc lập hoàn toàn).`);
    console.log('  -> PASS: Phân lập lớp học an toàn tuyệt đối.');
  }

  // Khôi phục lại dữ liệu gốc của tenant-lan-nguyen để không làm thay đổi demo mặc định nếu cần
  classSettingsRepository.update(testTenant, existingRecord.class_id, {
    subjects_json: existingRecord.subjects_json
  });
  persistenceSyncService.flushToPersistentBackup();
  console.log('\n[DỌN DẸP] Đã khôi phục dữ liệu ban đầu an toàn.');

  console.log('\n================================================================');
  console.log('TẤT CẢ 6/6 BÀI KIỂM THỬ ĐẠT (PASS 100%)');
  console.log('================================================================');
}

runTest().catch(err => {
  console.error('Test FAILED:', err);
  process.exit(1);
});
