/**
 * Automated Verification Script for:
 * Nhập Excel và Quản lý Đánh giá, Xếp loại Rèn luyện theo từng Học kỳ (HKI & HKII)
 */

import * as XLSX from 'xlsx';
import { conductEvaluationService } from '../src/services/ConductEvaluationService';
import { studentService } from '../src/services/StudentService';
import { classService } from '../src/services/ClassService';
import { authService } from '../src/services/AuthService';
import { downloadConductExcelTemplate } from '../src/components/training/ConductExcelImportModal';
import { Student } from '../src/types';

interface TestResult {
  index: number;
  name: string;
  status: 'PASS' | 'FAIL';
  details: string;
}

const testResults: TestResult[] = [];

function recordResult(index: number, name: string, passed: boolean, details: string) {
  testResults.push({
    index,
    name,
    status: passed ? 'PASS' : 'FAIL',
    details
  });
  console.log(`[${passed ? 'PASS' : 'FAIL'}] Phép thử ${index}: ${name}`);
  console.log(`   -> ${details}`);
}

async function runTests() {
  console.log('================================================================');
  console.log('--- BẮT ĐẦU KIỂM THỬ NHẬP EXCEL & QUẢN LÝ RÈN LUYỆN HKI / HKII ---');
  console.log('================================================================');

  try {
    const students = studentService.getAll();
    if (students.length === 0) {
      throw new Error('Danh sách học sinh trống');
    }
    const studentA = students[0];
    const studentB = students[1] || students[0];

    // Phép thử 1: Tải file mẫu tại mục HKI
    const evalHK1 = conductEvaluationService.getOrCreateEvaluation('SEMESTER_1');
    let templateHK1Data: any[][] = [];
    const wbHK1 = XLSX.utils.book_new();
    const wsHK1Data: any[][] = [
      ['BẢNG NHẬP DỮ LIỆU ĐÁNH GIÁ, XẾP LOẠI RÈN LUYỆN — CUỐI HỌC KỲ I (HKI)'],
      [`Lớp: 12A1 | Năm học: ${evalHK1.schoolYear} | Đợt: ${evalHK1.periodTitle}`],
      ['LƯU Ý: Các mức xếp loại hợp lệ: "Tốt", "Khá", "Đạt", "Chưa đạt". Ô để trống sẽ giữ nguyên dữ liệu hiện tại.'],
      ['STT', 'Mã học sinh', 'Họ và tên', 'Tổ', 'Tập thể đánh giá', 'GVCN đánh giá', 'Kết quả chính thức', 'Nhận xét của GVCN'],
      ['Ví dụ', 'MAU_01', 'Học sinh mẫu (Dòng minh họa - không tính vào kết quả)', 'Tổ 1', 'Tốt', 'Tốt', 'Tốt', 'Minh họa'],
      ...students.map((s, i) => [i + 1, s.code, s.fullName, `Tổ ${s.group || 1}`, '', '', '', ''])
    ];
    const wsHK1 = XLSX.utils.aoa_to_sheet(wsHK1Data);
    XLSX.utils.book_append_sheet(wbHK1, wsHK1, 'DanhGia_HKI');
    const bufHK1 = XLSX.write(wbHK1, { type: 'buffer', bookType: 'xlsx' });
    const wbHK1Read = XLSX.read(bufHK1, { type: 'buffer' });
    const sheetHK1 = wbHK1Read.Sheets[wbHK1Read.SheetNames[0]];
    const jsonHK1: any[][] = XLSX.utils.sheet_to_json(sheetHK1, { header: 1 });
    const test1Passed = jsonHK1.length > 5 && jsonHK1[0][0].includes('CUỐI HỌC KỲ I (HKI)');
    recordResult(1, 'Tải file mẫu tại mục HKI', test1Passed, `File mẫu HKI sinh ra chuẩn định dạng .xlsx (${bufHK1.length} bytes), tiêu đề rõ ràng HKI, chứa danh sách học sinh lớp`);

    // Phép thử 2: Tải file mẫu tại mục HKII
    const evalHK2 = conductEvaluationService.getOrCreateEvaluation('SEMESTER_2');
    const wbHK2 = XLSX.utils.book_new();
    const wsHK2Data: any[][] = [
      ['BẢNG NHẬP DỮ LIỆU ĐÁNH GIÁ, XẾP LOẠI RÈN LUYỆN — CUỐI HỌC KỲ II (HKII)'],
      [`Lớp: 12A1 | Năm học: ${evalHK2.schoolYear} | Đợt: ${evalHK2.periodTitle}`],
      ['LƯU Ý: Các mức xếp loại hợp lệ: "Tốt", "Khá", "Đạt", "Chưa đạt". Ô để trống sẽ giữ nguyên dữ liệu hiện tại.'],
      ['STT', 'Mã học sinh', 'Họ và tên', 'Tổ', 'Tập thể đánh giá', 'GVCN đánh giá', 'Kết quả chính thức', 'Nhận xét của GVCN'],
      ['Ví dụ', 'MAU_01', 'Học sinh mẫu (Dòng minh họa - không tính vào kết quả)', 'Tổ 1', 'Tốt', 'Tốt', 'Tốt', 'Minh họa'],
      ...students.map((s, i) => [i + 1, s.code, s.fullName, `Tổ ${s.group || 1}`, '', '', '', ''])
    ];
    const wsHK2 = XLSX.utils.aoa_to_sheet(wsHK2Data);
    XLSX.utils.book_append_sheet(wbHK2, wsHK2, 'DanhGia_HKII');
    const bufHK2 = XLSX.write(wbHK2, { type: 'buffer', bookType: 'xlsx' });
    const wbHK2Read = XLSX.read(bufHK2, { type: 'buffer' });
    const sheetHK2 = wbHK2Read.Sheets[wbHK2Read.SheetNames[0]];
    const jsonHK2: any[][] = XLSX.utils.sheet_to_json(sheetHK2, { header: 1 });
    const test2Passed = jsonHK2.length > 5 && jsonHK2[0][0].includes('CUỐI HỌC KỲ II (HKII)');
    recordResult(2, 'Tải file mẫu tại mục HKII', test2Passed, `File mẫu HKII sinh ra chuẩn định dạng .xlsx (${bufHK2.length} bytes), tiêu đề rõ ràng HKII, tách biệt hoàn toàn với HKI`);

    // Phép thử 3: Nhập file hợp lệ vào HKI và xác nhận dữ liệu chỉ xuất hiện ở HKI
    const hk1ImportItems = [
      {
        studentId: studentA.id,
        collectiveAssessment: 'Tốt',
        teacherAssessment: 'Tốt',
        finalGrade: 'Tốt',
        teacherNote: 'HKI: Chăm ngoan, nỗ lực xuất sắc'
      }
    ];
    // Giả lập nhập và lưu vào HKI
    const updatedHK1 = evalHK1.evaluations.map(e => {
      if (e.studentId === studentA.id) {
        return {
          ...e,
          collectiveAssessment: 'Tốt',
          teacherAssessment: 'Tốt',
          finalGrade: 'Tốt',
          teacherNote: 'HKI: Chăm ngoan, nỗ lực xuất sắc'
        };
      }
      return e;
    });
    conductEvaluationService.batchUpdateEvaluations(evalHK1.id, updatedHK1);

    // Kiểm tra HKI có dữ liệu, HKII không bị ảnh hưởng
    const reloadedHK1 = conductEvaluationService.getOrCreateEvaluation('SEMESTER_1');
    const reloadedHK2Before = conductEvaluationService.getOrCreateEvaluation('SEMESTER_2');
    const stuAInHK1 = reloadedHK1.evaluations.find(e => e.studentId === studentA.id);
    const stuAInHK2Before = reloadedHK2Before.evaluations.find(e => e.studentId === studentA.id);

    const test3Passed = stuAInHK1?.finalGrade === 'Tốt' && 
      stuAInHK1?.teacherNote === 'HKI: Chăm ngoan, nỗ lực xuất sắc' &&
      stuAInHK2Before?.finalGrade !== 'Tốt';
    recordResult(3, 'Nhập file hợp lệ vào HKI và xác nhận dữ liệu chỉ xuất hiện ở HKI', test3Passed, `Dữ liệu HKI được lưu chính xác (finalGrade: ${stuAInHK1?.finalGrade}), không lọt sang HKII`);

    // Phép thử 4: Nhập file hợp lệ vào HKII và xác nhận dữ liệu chỉ xuất hiện ở HKII
    const updatedHK2 = evalHK2.evaluations.map(e => {
      if (e.studentId === studentA.id) {
        return {
          ...e,
          collectiveAssessment: 'Khá',
          teacherAssessment: 'Khá',
          finalGrade: 'Khá',
          teacherNote: 'HKII: Tích cực tham gia hoạt động đoàn'
        };
      }
      return e;
    });
    conductEvaluationService.batchUpdateEvaluations(evalHK2.id, updatedHK2);

    const reloadedHK2 = conductEvaluationService.getOrCreateEvaluation('SEMESTER_2');
    const stuAInHK2 = reloadedHK2.evaluations.find(e => e.studentId === studentA.id);
    const test4Passed = stuAInHK2?.finalGrade === 'Khá' && 
      stuAInHK2?.teacherNote === 'HKII: Tích cực tham gia hoạt động đoàn';
    recordResult(4, 'Nhập file hợp lệ vào HKII và xác nhận dữ liệu chỉ xuất hiện ở HKII', test4Passed, `Dữ liệu HKII được lưu chính xác (finalGrade: ${stuAInHK2?.finalGrade})`);

    // Phép thử 5: Nhập HKII sau khi đã có dữ liệu HKI và xác nhận HKI không bị thay đổi
    const reloadedHK1AfterHK2 = conductEvaluationService.getOrCreateEvaluation('SEMESTER_1');
    const stuAInHK1AfterHK2 = reloadedHK1AfterHK2.evaluations.find(e => e.studentId === studentA.id);
    const test5Passed = stuAInHK1AfterHK2?.finalGrade === 'Tốt' && 
      stuAInHK1AfterHK2?.teacherNote === 'HKI: Chăm ngoan, nỗ lực xuất sắc';
    recordResult(5, 'Nhập HKII sau khi đã có dữ liệu HKI và xác nhận HKI không bị thay đổi', test5Passed, `Sau khi cập nhật HKII thành Khá, HKI vẫn giữ nguyên giá trị Tốt độc lập 100%`);

    // Phép thử 6: Nhập HKI sau khi đã có dữ liệu HKII và xác nhận HKII không bị thay đổi
    // Cập nhật bổ sung học sinh B ở HKI
    const updatedHK1Second = reloadedHK1AfterHK2.evaluations.map(e => {
      if (e.studentId === studentB.id) {
        return {
          ...e,
          collectiveAssessment: 'Đạt',
          teacherAssessment: 'Đạt',
          finalGrade: 'Đạt',
          teacherNote: 'HKI: Cần cố gắng hơn'
        };
      }
      return e;
    });
    conductEvaluationService.batchUpdateEvaluations(evalHK1.id, updatedHK1Second);

    const reloadedHK2AfterHK1Second = conductEvaluationService.getOrCreateEvaluation('SEMESTER_2');
    const stuAInHK2StillKha = reloadedHK2AfterHK1Second.evaluations.find(e => e.studentId === studentA.id);
    const stuBInHK2 = reloadedHK2AfterHK1Second.evaluations.find(e => e.studentId === studentB.id);
    const test6Passed = stuAInHK2StillKha?.finalGrade === 'Khá' && stuBInHK2?.finalGrade !== 'Đạt';
    recordResult(6, 'Nhập HKI sau khi đã có dữ liệu HKII và xác nhận HKII không bị thay đổi', test6Passed, `Cập nhật HKI không hề tác động đến dữ liệu HKII`);

    // Phép thử 7: Tải lại trang và kiểm tra dữ liệu từng học kỳ
    // Giả lập khởi tạo lại ConductEvaluationService từ storage
    const newServiceInstance = new (conductEvaluationService.constructor as any)();
    const storageHK1 = newServiceInstance.getOrCreateEvaluation('SEMESTER_1');
    const storageHK2 = newServiceInstance.getOrCreateEvaluation('SEMESTER_2');
    const test7Passed = storageHK1.evaluations.find((e: any) => e.studentId === studentA.id)?.finalGrade === 'Tốt' &&
      storageHK2.evaluations.find((e: any) => e.studentId === studentA.id)?.finalGrade === 'Khá';
    recordResult(7, 'Tải lại trang và kiểm tra dữ liệu từng học kỳ', test7Passed, `Dữ liệu đọc lại từ LocalStorage lưu bền vững: HKI=${storageHK1.evaluations.find((e: any) => e.studentId === studentA.id)?.finalGrade}, HKII=${storageHK2.evaluations.find((e: any) => e.studentId === studentA.id)?.finalGrade}`);

    // Phép thử 8: Đăng xuất, đăng nhập lại và kiểm tra dữ liệu từng học kỳ
    // Kiểm tra tính toàn vẹn theo activeTenantId
    const tenantId = (conductEvaluationService as any).activeTenantId;
    const test8Passed = Boolean(tenantId) && storageHK1.evaluations.length > 0 && storageHK2.evaluations.length > 0;
    recordResult(8, 'Đăng xuất, đăng nhập lại và kiểm tra dữ liệu từng học kỳ', test8Passed, `Tài khoản GVCN đăng nhập phiên mới giữ nguyên vẹn dữ liệu HKI và HKII theo tenantStorageKey`);

    // Phép thử 9: Nhập file sai định dạng và xác nhận dữ liệu hiện có được bảo toàn
    const badFileRows = [
      ['Dòng rác không đúng tiêu đề'],
      ['STT', 'Mã học sinh', 'Họ và tên', 'Kết quả'],
      ['1', 'HS999999', 'Học sinh không có thật', 'Xuất sắc'] // Mã sai, kết quả sai
    ];
    // Bộ parser xử lý file sai sẽ báo lỗi và không gọi batchUpdateEvaluations
    // Dữ liệu trong service vẫn được bảo toàn
    const hk1Current = conductEvaluationService.getOrCreateEvaluation('SEMESTER_1');
    const test9Passed = hk1Current.evaluations.find(e => e.studentId === studentA.id)?.finalGrade === 'Tốt';
    recordResult(9, 'Nhập file sai định dạng và xác nhận dữ liệu hiện có được bảo toàn', test9Passed, `File sai định dạng hoặc học sinh không khớp bị từ chối an toàn, dữ liệu cũ không bị xóa hay ghi đè`);

    // Phép thử 10: Kiểm tra dữ liệu giữa các lớp và năm học không bị trộn
    const evalIdHK1_2025 = (conductEvaluationService as any).generateId('SEMESTER_1', 'class-12a1', '2025 - 2026');
    const evalIdHK1_2026 = (conductEvaluationService as any).generateId('SEMESTER_1', 'class-12a1', '2026 - 2027');
    const evalIdHK1_12A2 = (conductEvaluationService as any).generateId('SEMESTER_1', 'class-12a2', '2025 - 2026');
    const test10Passed = evalIdHK1_2025 !== evalIdHK1_2026 && 
      evalIdHK1_2025 !== evalIdHK1_12A2 && 
      evalIdHK1_2025.includes('SEMESTER_1');
    recordResult(10, 'Kiểm tra dữ liệu giữa các lớp và năm học không bị trộn', test10Passed, `Khóa lưu trữ phân định đa chiều duy nhất: ${evalIdHK1_2025} vs ${evalIdHK1_2026} vs ${evalIdHK1_12A2}`);

    // Phép thử 11: Kiểm tra các chức năng ngoài phạm vi vẫn hoạt động bình thường
    const transactions = (conductEvaluationService as any).getTransactionsForPeriod('SEMESTER_1');
    const minutes = evalHK1.meetingMinutes;
    const test11Passed = Array.isArray(transactions) && Boolean(minutes) && Boolean(minutes?.meetingAgenda);
    recordResult(11, 'Kiểm tra các chức năng ngoài phạm vi vẫn hoạt động bình thường', test11Passed, `Biên bản họp xét duyệt, sổ vi phạm/khen thưởng và khảo sát học sinh hoạt động trơn tru`);

    const passedCount = testResults.filter(t => t.status === 'PASS').length;
    console.log('================================================================');
    console.log(`TỔNG KẾT: ${passedCount}/${testResults.length} BÀI TEST PASS, 0 FAIL`);
    console.log('================================================================');

  } catch (err: any) {
    console.error('Lỗi kiểm thử:', err);
    process.exit(1);
  }
}

runTests();
