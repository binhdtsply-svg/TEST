/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { calculateSubjectAverage, isEnteredValidScore, parseEnteredScore } from '../src/services/AcademicCalculationService';
import { academicService } from '../src/services/AcademicService';
import { SubjectGrade } from '../src/types';

async function runSubjectAverageTests() {
  console.log('================================================================================');
  console.log('KIỂM THỬ TÍNH ĐIỂM TRUNG BÌNH MÔN — THEO 5 YÊU CẦU BẮT BUỘC TRONG PROMPT');
  console.log('================================================================================\n');

  let passedCount = 0;
  const totalTests = 5;

  // -------------------------------------------------------------------------
  // CA 1: Điểm thành phần 8 và 6, các ô còn lại trống
  // -------------------------------------------------------------------------
  console.log('[CA 1] Điểm thành phần 8 và 6, các ô còn lại trống:');
  const test1A = calculateSubjectAverage({
    assessmentMode: 'SCORE_AND_COMMENT',
    tx1: 8,
    tx2: 6,
    tx3: undefined,
    tx4: undefined,
    midterm: undefined,
    finalExam: undefined,
    period: 'final_hk1'
  });
  console.log(`  - 1A. TX1=8, TX2=6, các ô còn lại trống -> ĐTB: ${test1A} (kỳ vọng: 7.0)`);

  const test1B = calculateSubjectAverage({
    assessmentMode: 'SCORE_AND_COMMENT',
    tx1: 8,
    midterm: 6,
    tx2: undefined,
    tx3: undefined,
    finalExam: undefined,
    period: 'final_hk1'
  });
  console.log(`  - 1B. TX1=8 (hệ số 1), GK=6 (hệ số 2), các ô còn lại trống -> ĐTB: ${test1B} (kỳ vọng: 6.7)`);

  const test1C = calculateSubjectAverage({
    assessmentMode: 'SCORE_AND_COMMENT',
    midterm: 8,
    finalExam: 6,
    period: 'final_hk1'
  });
  console.log(`  - 1C. GK=8 (hệ số 2), CK=6 (hệ số 3), TX trống -> ĐTB: ${test1C} (kỳ vọng: 6.8)`);

  if (test1A === 7.0 && test1B === 6.7 && test1C === 6.8) {
    console.log('  -> KẾT QUẢ CA 1: PASS (Chỉ tính tử số và trọng số các ô hợp lệ, ô trống không bị tính là 0)\n');
    passedCount++;
  } else {
    console.error(`  -> KẾT QUẢ CA 1: FAIL (1A=${test1A}, 1B=${test1B}, 1C=${test1C})\n`);
  }

  // -------------------------------------------------------------------------
  // CA 2: Điểm thành phần 8, 0 và ô trống
  // -------------------------------------------------------------------------
  console.log('[CA 2] Điểm thành phần 8, 0 và ô trống:');
  const test2A = calculateSubjectAverage({
    assessmentMode: 'SCORE_AND_COMMENT',
    tx1: 8,
    tx2: 0,
    tx3: undefined,
    midterm: undefined,
    finalExam: undefined,
    period: 'final_hk1'
  });
  console.log(`  - 2A. TX1=8, TX2=0 (điểm 0 hợp lệ), các ô khác trống -> ĐTB: ${test2A} (kỳ vọng: 4.0)`);

  const test2B = calculateSubjectAverage({
    assessmentMode: 'SCORE_AND_COMMENT',
    tx1: 8,
    midterm: 0,
    period: 'final_hk1'
  });
  console.log(`  - 2B. TX1=8, GK=0, các ô khác trống -> ĐTB: ${test2B} (kỳ vọng: 2.7)`);

  const test2C = calculateSubjectAverage({
    assessmentMode: 'SCORE_AND_COMMENT',
    midterm: 8,
    finalExam: 0,
    period: 'final_hk1'
  });
  console.log(`  - 2C. GK=8, CK=0, TX trống -> ĐTB: ${test2C} (kỳ vọng: 3.2)`);

  if (test2A === 4.0 && test2B === 2.7 && test2C === 3.2) {
    console.log('  -> KẾT QUẢ CA 2: PASS (Điểm 0 thực tế được giữ hợp lệ, ô trống được bỏ qua)\n');
    passedCount++;
  } else {
    console.error(`  -> KẾT QUẢ CA 2: FAIL (2A=${test2A}, 2B=${test2B}, 2C=${test2C})\n`);
  }

  // -------------------------------------------------------------------------
  // CA 3: Tất cả ô điểm trống
  // -------------------------------------------------------------------------
  console.log('[CA 3] Tất cả ô điểm trống:');
  const test3A = calculateSubjectAverage({
    assessmentMode: 'SCORE_AND_COMMENT',
    tx1: undefined,
    tx2: null,
    tx3: '',
    midterm: undefined,
    finalExam: undefined,
    period: 'final_hk1'
  });
  console.log(`  - 3A. Tất cả ô undefined, null, chuỗi rỗng "" -> ĐTB: ${test3A} (kỳ vọng: undefined)`);

  const test3B = calculateSubjectAverage({
    assessmentMode: 'SCORE_AND_COMMENT',
    regularScores: [undefined, null, '   '],
    period: 'midterm_hk1'
  });
  console.log(`  - 3B. regularScores chứa chuỗi khoảng trắng và null -> ĐTB: ${test3B} (kỳ vọng: undefined)`);

  if (test3A === undefined && test3B === undefined) {
    console.log('  -> KẾT QUẢ CA 3: PASS (Không tự sinh ĐTB bằng 0 khi các ô điểm trống)\n');
    passedCount++;
  } else {
    console.error(`  -> KẾT QUẢ CA 3: FAIL (3A=${test3A}, 3B=${test3B})\n`);
  }

  // -------------------------------------------------------------------------
  // CA 4: Thêm điểm vào một ô trước đó trống
  // -------------------------------------------------------------------------
  console.log('[CA 4] Thêm điểm vào một ô trước đó trống:');
  // Bước 1: Chỉ có TX1 = 8
  const step1 = calculateSubjectAverage({
    tx1: 8,
    period: 'final_hk1'
  });
  console.log(`  - Bước 1: Chỉ có TX1=8 -> ĐTB: ${step1} (kỳ vọng: 8.0)`);

  // Bước 2: Thêm TX2 = 6 vào ô trống
  const step2 = calculateSubjectAverage({
    tx1: 8,
    tx2: 6,
    period: 'final_hk1'
  });
  console.log(`  - Bước 2: Thêm TX2=6 -> ĐTB: ${step2} (kỳ vọng: 7.0)`);

  // Bước 3: Thêm GK = 10 vào ô trống
  const step3 = calculateSubjectAverage({
    tx1: 8,
    tx2: 6,
    midterm: 10,
    period: 'final_hk1'
  });
  console.log(`  - Bước 3: Thêm GK=10 -> ĐTB: ${step3} (kỳ vọng: 8.5)`);

  // Bước 4: Thêm CK = 9 vào ô trống
  const step4 = calculateSubjectAverage({
    tx1: 8,
    tx2: 6,
    midterm: 10,
    finalExam: 9,
    period: 'final_hk1'
  });
  console.log(`  - Bước 4: Thêm CK=9 -> ĐTB: ${step4} (kỳ vọng: 8.7)`);

  if (step1 === 8.0 && step2 === 7.0 && step3 === 8.5 && step4 === 8.7) {
    console.log('  -> KẾT QUẢ CA 4: PASS (ĐTB tự động cập nhật chính xác theo từng bước nhập điểm)\n');
    passedCount++;
  } else {
    console.error(`  -> KẾT QUẢ CA 4: FAIL (step1=${step1}, step2=${step2}, step3=${step3}, step4=${step4})\n`);
  }

  // -------------------------------------------------------------------------
  // CA 5: Kiểm tra dữ liệu sau khi lưu, tải lại và chuyển giữa các tab kỳ học
  // -------------------------------------------------------------------------
  console.log('[CA 5] Kiểm tra dữ liệu sau khi lưu, tải lại và chuyển giữa các tab kỳ học:');
  const mockStudentId = `mock_stu_calc_test_${Date.now()}`;
  const mockGradesHk1: SubjectGrade[] = [
    {
      subjectName: 'Toán học',
      assessmentMode: 'SCORE_AND_COMMENT',
      tx1: 8,
      tx2: 6,
      tx3: undefined,
      tx4: undefined,
      midterm: undefined,
      finalExam: undefined,
      average: 7.0
    },
    {
      subjectName: 'Vật lí',
      assessmentMode: 'SCORE_AND_COMMENT',
      tx1: undefined,
      tx2: undefined,
      midterm: undefined,
      finalExam: undefined,
      average: undefined
    }
  ];

  // Lưu bảng điểm cho mock student ở kỳ final_hk1
  academicService.updateStudentGrades(mockStudentId, mockGradesHk1, 'final_hk1', 'Nhận xét thử nghiệm');

  // Đọc lại từ academicService cho final_hk1
  const recHk1 = academicService.getStudentAcademicRecord(mockStudentId, 'final_hk1');
  const toanHk1 = recHk1.grades.find(g => g.subjectName === 'Toán học');
  const lyHk1 = recHk1.grades.find(g => g.subjectName === 'Vật lí');

  console.log(`  - Đọc lại môn Toán (final_hk1): TX1=${toanHk1?.tx1}, TX2=${toanHk1?.tx2}, TX3=${toanHk1?.tx3}, TB=${toanHk1?.average}`);
  console.log(`  - Đọc lại môn Vật lí (final_hk1): TX1=${lyHk1?.tx1}, TB=${lyHk1?.average}`);

  // Chuyển sang tab midterm_hk2 (chưa có điểm cho học sinh này)
  const recHk2 = academicService.getStudentAcademicRecord(mockStudentId, 'midterm_hk2');
  const toanHk2 = recHk2.grades.find(g => g.subjectName === 'Toán học');
  console.log(`  - Chuyển tab midterm_hk2: Toán TB=${toanHk2?.average}`);

  // Chuyển sang tab full_year (chưa có đủ điểm 2 kỳ)
  const recCaNam = academicService.getStudentAcademicRecord(mockStudentId, 'full_year');
  const toanCaNam = recCaNam.grades.find(g => g.subjectName === 'Toán học');
  console.log(`  - Chuyển tab full_year: Toán ĐTB Cả năm=${toanCaNam?.average}`);

  const checkToanHk1 = toanHk1?.tx1 === 8 && toanHk1?.tx2 === 6 && toanHk1?.tx3 === undefined && toanHk1?.average === 7.0;
  const checkLyHk1 = lyHk1?.tx1 === undefined && lyHk1?.average === undefined;
  const checkToanHk2 = toanHk2?.average === undefined;
  const checkToanCaNam = toanCaNam?.average === undefined;

  // Dọn dẹp bản ghi mock
  delete (academicService as any).academicRecords[`${mockStudentId}_final_hk1`];
  delete (academicService as any).academicRecords[`${mockStudentId}_midterm_hk2`];
  delete (academicService as any).academicRecords[`${mockStudentId}_full_year`];

  if (checkToanHk1 && checkLyHk1 && checkToanHk2 && checkToanCaNam) {
    console.log('  -> KẾT QUẢ CA 5: PASS (Dữ liệu sau khi lưu và chuyển tab bảo toàn 100%, không bị biến đổi thành 0)\n');
    passedCount++;
  } else {
    console.error(`  -> KẾT QUẢ CA 5: FAIL (checkToanHk1=${checkToanHk1}, checkLyHk1=${checkLyHk1}, checkToanHk2=${checkToanHk2}, checkToanCaNam=${checkToanCaNam})\n`);
  }

  // -------------------------------------------------------------------------
  // TỔNG KẾT
  // -------------------------------------------------------------------------
  console.log('================================================================================');
  console.log(`KẾT QUẢ TỔNG HỢP: ${passedCount}/${totalTests} CA KIỂM THỬ ĐẠT (PASS)`);
  console.log('================================================================================');

  if (passedCount === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runSubjectAverageTests().catch(err => {
  console.error('Lỗi khi chạy kiểm thử:', err);
  process.exit(1);
});
