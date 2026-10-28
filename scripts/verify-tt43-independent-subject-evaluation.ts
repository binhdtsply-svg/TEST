/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { academicService } from '../src/services/AcademicService';
import { fullYearReportService } from '../src/services/FullYearReportService';
import { StudentAcademicRecord, SubjectGrade } from '../src/types';

async function runTT43IndependentSubjectEvaluationTests() {
  console.log('========================================================================');
  console.log('KIỂM THỬ XÉT ĐIỂM ĐỘC LẬP TỪNG MÔN THEO ĐIỀU 9 THÔNG TƯ 43/2021/TT-BGDĐT');
  console.log('========================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`[PASS] ${testName}`);
      console.log(`       Chi tiết: ${detail}\n`);
    } else {
      console.error(`[FAIL] ${testName}`);
      console.error(`       Chi tiết: ${detail}\n`);
      process.exitCode = 1;
    }
  }

  // Môn nhận xét chuẩn: 'Đạt'
  const baseCommentGrades: SubjectGrade[] = [
    { subjectName: 'Giáo dục thể chất', assessmentMode: 'COMMENT_ONLY', qualitativeResult: 'Đạt' },
    { subjectName: 'Hoạt động trải nghiệm, hướng nghiệp', assessmentMode: 'COMMENT_ONLY', qualitativeResult: 'Đạt' },
    { subjectName: 'Nội dung giáo dục địa phương', assessmentMode: 'COMMENT_ONLY', qualitativeResult: 'Đạt' }
  ];

  function createTestRecord(period: any, scoredAverages: number[], commentResults: ('Đạt' | 'Chưa đạt' | undefined)[] = ['Đạt', 'Đạt', 'Đạt']): StudentAcademicRecord {
    const scoredGrades: SubjectGrade[] = [
      'Toán học', 'Ngữ văn', 'Tiếng Anh', 'Vật lí', 'Hóa học', 'Sinh học', 'Lịch sử', 'Địa lí'
    ].slice(0, scoredAverages.length).map((name, i) => ({
      subjectName: name,
      assessmentMode: 'SCORE_AND_COMMENT',
      average: scoredAverages[i]
    }));

    const commentGrades: SubjectGrade[] = [
      'Giáo dục thể chất', 'Hoạt động trải nghiệm, hướng nghiệp', 'Nội dung giáo dục địa phương'
    ].map((name, i) => ({
      subjectName: name,
      assessmentMode: 'COMMENT_ONLY',
      qualitativeResult: commentResults[i]
    }));

    return {
      studentId: 'test-student-id',
      period,
      semester: 'HK1',
      grades: [...scoredGrades, ...commentGrades],
      conductResult: 'Tốt'
    };
  }

  // Test 1: Mức Tốt chuẩn (tất cả môn >= 6.5, có >= 5 môn >= 8.0, môn nhận xét Đạt)
  {
    const rec = createTestRecord('midterm_hk1', [9.0, 8.5, 8.2, 8.0, 8.0, 7.5, 7.0, 6.5]);
    const res = academicService.evaluateStudentTT43(rec);
    assert(
      res.tier === 'TOT' && res.label === 'Mức Tốt',
      'Test 1: Mức Tốt khi tất cả môn >= 6.5 và có ít nhất 5 môn >= 8.0',
      `ĐTB các môn: [9.0, 8.5, 8.2, 8.0, 8.0, 7.5, 7.0, 6.5]. Kết quả: ${res.label} (${res.tier})`
    );
  }

  // Test 2: ĐTB chung 9.3 rất cao, nhưng 1 môn 6.4 (< 6.5) -> KHÔNG ĐƯỢC TỐT, xuống KHÁ
  {
    const rec = createTestRecord('midterm_hk1', [10.0, 10.0, 10.0, 10.0, 10.0, 9.0, 9.0, 6.4]);
    const res = academicService.evaluateStudentTT43(rec);
    assert(
      res.tier === 'KHA' && res.label === 'Mức Khá',
      'Test 2: ĐTB chung 9.3 nhưng 1 môn 6.4 (< 6.5) -> Xếp loại KHÁ (không dùng ĐTB chung xét Tốt)',
      `ĐTB các môn: [10, 10, 10, 10, 10, 9, 9, 6.4], ĐTB chung: 9.3. Kết quả: ${res.label} (${res.tier})`
    );
  }

  // Test 3: ĐTB chung 8.3 rất cao, nhưng 1 môn 4.8 (< 5.0) -> KHÔNG ĐƯỢC KHÁ, xuống ĐẠT
  {
    const rec = createTestRecord('final_hk1', [10.0, 10.0, 10.0, 9.0, 9.0, 7.0, 6.5, 4.8]);
    const res = academicService.evaluateStudentTT43(rec);
    assert(
      res.tier === 'DAT' && res.label === 'Mức Đạt',
      'Test 3: ĐTB chung 8.3 nhưng 1 môn 4.8 (< 5.0) -> Xếp loại ĐẠT (không dùng ĐTB chung xét Khá)',
      `ĐTB các môn: [10, 10, 10, 9, 9, 7, 6.5, 4.8], ĐTB chung: 8.3. Kết quả: ${res.label} (${res.tier})`
    );
  }

  // Test 4: ĐTB chung 8.9 rất cao, nhưng 1 môn 3.2 (< 3.5) -> KHÔNG ĐƯỢC ĐẠT, xuống CHƯA ĐẠT
  {
    const rec = createTestRecord('final_hk1', [10.0, 10.0, 10.0, 10.0, 10.0, 9.0, 9.0, 3.2]);
    const res = academicService.evaluateStudentTT43(rec);
    assert(
      res.tier === 'CHUA_DAT' && res.label === 'Mức Chưa đạt',
      'Test 4: ĐTB chung 8.9 nhưng 1 môn 3.2 (< 3.5) -> Xếp loại CHƯA ĐẠT (vi phạm điều kiện không môn dưới 3.5)',
      `ĐTB các môn: [10, 10, 10, 10, 10, 9, 9, 3.2], ĐTB chung: 8.9. Kết quả: ${res.label} (${res.tier})`
    );
  }

  // Test 5 (YÊU CẦU 6): ĐTB chung đạt 5.3 (>= 5.0), nhưng chỉ có 4 môn >= 5.0 (4 môn < 5.0)
  // [8.0, 7.0, 6.0, 5.5, 4.5, 4.0, 3.8, 3.6] -> Tổng 42.4 / 8 = 5.3
  {
    const rec = createTestRecord('final_hk1', [8.0, 7.0, 6.0, 5.5, 4.5, 4.0, 3.8, 3.6]);
    const res = academicService.evaluateStudentTT43(rec);
    assert(
      res.tier === 'CHUA_DAT' && res.label === 'Mức Chưa đạt',
      'Test 5 (Theo Yêu Cầu 6): ĐTB chung 5.3 (>= 5.0) nhưng chỉ có 4 môn >= 5.0 -> CHƯA ĐẠT',
      `ĐTB các môn: [8.0, 7.0, 6.0, 5.5, 4.5, 4.0, 3.8, 3.6], ĐTB chung: 5.3. Số môn >= 5.0 là 4 (< 5 môn tối thiểu). Kết quả: ${res.label} (${res.tier})`
    );
  }

  // Test 6: ĐTB chung 5.0, đủ 5 môn >= 5.0, không môn nào < 3.5 -> ĐẠT
  {
    const rec = createTestRecord('final_hk1', [6.0, 5.5, 5.5, 5.0, 5.0, 4.5, 4.5, 4.0]);
    const res = academicService.evaluateStudentTT43(rec);
    assert(
      res.tier === 'DAT' && res.label === 'Mức Đạt',
      'Test 6: ĐTB chung 5.0, có 5 môn >= 5.0, không môn < 3.5 -> Xếp loại ĐẠT',
      `ĐTB các môn: [6.0, 5.5, 5.5, 5.0, 5.0, 4.5, 4.5, 4.0]. Có đúng 5 môn >= 5.0, min = 4.0 (>= 3.5). Kết quả: ${res.label} (${res.tier})`
    );
  }

  // Test 7: Thiếu điểm 1 môn tính điểm -> Giữ trạng thái "Chưa đủ dữ liệu đánh giá"
  {
    const rec = createTestRecord('final_hk1', [8.0, 8.5, 7.0, 6.5, 8.0, 7.5, 8.0]);
    // Thêm 1 môn chưa nhập điểm
    rec.grades.push({ subjectName: 'Hóa học', assessmentMode: 'SCORE_AND_COMMENT', average: undefined });
    const res = academicService.evaluateStudentTT43(rec);
    assert(
      res.tier === 'CHUA_DU_LIEU' && res.label === 'Chưa đủ dữ liệu đánh giá' && res.missingSubjects.includes('Hóa học'),
      'Test 7: Môn bắt buộc chưa có điểm -> "Chưa đủ dữ liệu đánh giá" (không tự xếp loại)',
      `Môn Hóa học chưa có điểm. Kết quả: ${res.label} (missing: ${res.missingSubjects.join(', ')})`
    );
  }

  // Test 8: Thiếu đánh giá môn nhận xét -> Giữ trạng thái "Chưa đủ dữ liệu đánh giá"
  {
    const rec = createTestRecord('final_hk1', [8.0, 8.5, 7.0, 6.5, 8.0, 7.5, 8.0, 8.0], ['Đạt', undefined, 'Đạt']);
    const res = academicService.evaluateStudentTT43(rec);
    assert(
      res.tier === 'CHUA_DU_LIEU' && res.label === 'Chưa đủ dữ liệu đánh giá',
      'Test 8: Môn nhận xét chưa đánh giá -> "Chưa đủ dữ liệu đánh giá"',
      `Môn Hoạt động trải nghiệm chưa có nhận xét. Kết quả: ${res.label}`
    );
  }

  // Test 9: Phân biệt kỳ Cả năm (full_year) khi chỉ có điểm HK1, thiếu điểm HK2 -> Giữ trạng thái "Chưa đủ dữ liệu đánh giá"
  {
    const fullYearRec: StudentAcademicRecord = {
      studentId: 'test-full-year-incomplete',
      period: 'full_year',
      semester: 'HK1',
      grades: [
        { subjectName: 'Toán học', assessmentMode: 'SCORE_AND_COMMENT', tbHk1: 8.0, tbHk2: undefined, tbCaNam: undefined },
        { subjectName: 'Ngữ văn', assessmentMode: 'SCORE_AND_COMMENT', tbHk1: 7.5, tbHk2: undefined, tbCaNam: undefined },
        { subjectName: 'Tiếng Anh', assessmentMode: 'SCORE_AND_COMMENT', tbHk1: 8.5, tbHk2: undefined, tbCaNam: undefined },
        { subjectName: 'Vật lí', assessmentMode: 'SCORE_AND_COMMENT', tbHk1: 7.0, tbHk2: undefined, tbCaNam: undefined },
        { subjectName: 'Hóa học', assessmentMode: 'SCORE_AND_COMMENT', tbHk1: 8.0, tbHk2: undefined, tbCaNam: undefined },
        { subjectName: 'Sinh học', assessmentMode: 'SCORE_AND_COMMENT', tbHk1: 6.5, tbHk2: undefined, tbCaNam: undefined },
        { subjectName: 'Lịch sử', assessmentMode: 'SCORE_AND_COMMENT', tbHk1: 8.0, tbHk2: undefined, tbCaNam: undefined },
        { subjectName: 'Địa lí', assessmentMode: 'SCORE_AND_COMMENT', tbHk1: 8.0, tbHk2: undefined, tbCaNam: undefined },
        { subjectName: 'Giáo dục thể chất', assessmentMode: 'COMMENT_ONLY', qualitativeResult: 'Đạt' }
      ]
    };
    const res = academicService.evaluateStudentTT43(fullYearRec);
    assert(
      res.tier === 'CHUA_DU_LIEU' && res.label === 'Chưa đủ dữ liệu đánh giá',
      'Test 9: Kỳ Cả năm khi thiếu HK2 -> "Chưa đủ dữ liệu đánh giá" (không lấy HK1 gán làm cả năm)',
      `Kỳ full_year chỉ có tbHk1. Kết quả: ${res.label}`
    );
  }

  // Test 10: Kỳ Cả năm khi đã đủ cả HK1 và HK2 -> Xếp loại chuẩn xác theo từng môn cả năm
  {
    const fullYearCompleteRec: StudentAcademicRecord = {
      studentId: 'test-full-year-complete',
      period: 'full_year',
      semester: 'HK2',
      grades: [
        // Toán: (8*1 + 9*2)/3 = 8.7
        { subjectName: 'Toán học', assessmentMode: 'SCORE_AND_COMMENT', tbHk1: 8.0, tbHk2: 9.0, tbCaNam: 8.7 },
        // Văn: (7.5*1 + 8.5*2)/3 = 8.2
        { subjectName: 'Ngữ văn', assessmentMode: 'SCORE_AND_COMMENT', tbHk1: 7.5, tbHk2: 8.5, tbCaNam: 8.2 },
        // Anh: (8*1 + 8*2)/3 = 8.0
        { subjectName: 'Tiếng Anh', assessmentMode: 'SCORE_AND_COMMENT', tbHk1: 8.0, tbHk2: 8.0, tbCaNam: 8.0 },
        // Lý: (8*1 + 8*2)/3 = 8.0
        { subjectName: 'Vật lí', assessmentMode: 'SCORE_AND_COMMENT', tbHk1: 8.0, tbHk2: 8.0, tbCaNam: 8.0 },
        // Hóa: (8*1 + 8*2)/3 = 8.0
        { subjectName: 'Hóa học', assessmentMode: 'SCORE_AND_COMMENT', tbHk1: 8.0, tbHk2: 8.0, tbCaNam: 8.0 },
        // Sinh: (7*1 + 7*2)/3 = 7.0
        { subjectName: 'Sinh học', assessmentMode: 'SCORE_AND_COMMENT', tbHk1: 7.0, tbHk2: 7.0, tbCaNam: 7.0 },
        // Sử: (7*1 + 7*2)/3 = 7.0
        { subjectName: 'Lịch sử', assessmentMode: 'SCORE_AND_COMMENT', tbHk1: 7.0, tbHk2: 7.0, tbCaNam: 7.0 },
        // Địa: (6.5*1 + 6.5*2)/3 = 6.5
        { subjectName: 'Địa lí', assessmentMode: 'SCORE_AND_COMMENT', tbHk1: 6.5, tbHk2: 6.5, tbCaNam: 6.5 },
        { subjectName: 'Giáo dục thể chất', assessmentMode: 'COMMENT_ONLY', qualitativeResult: 'Đạt' }
      ]
    };
    const res = academicService.evaluateStudentTT43(fullYearCompleteRec);
    assert(
      res.tier === 'TOT' && res.label === 'Mức Tốt',
      'Test 10: Kỳ Cả năm khi đủ điểm HK1 và HK2 -> Xếp loại Tốt chính xác',
      `ĐTB cả năm từng môn: [8.7, 8.2, 8.0, 8.0, 8.0, 7.0, 7.0, 6.5]. Kết quả: ${res.label}`
    );
  }

  // Test 11: Kiểm tra đồng bộ FullYearReportService.evaluateTT43AcademicResult
  {
    const rows = [
      { subjectName: 'Toán', assessmentMode: 'SCORE_AND_COMMENT' as const, tbHk1: 8.0, tbHk2: 5.5, tbCaNam: 4.5 },
      { subjectName: 'Văn', assessmentMode: 'SCORE_AND_COMMENT' as const, tbHk1: 8.0, tbHk2: 5.5, tbCaNam: 4.0 },
      { subjectName: 'Anh', assessmentMode: 'SCORE_AND_COMMENT' as const, tbHk1: 8.0, tbHk2: 5.5, tbCaNam: 3.8 },
      { subjectName: 'Lý', assessmentMode: 'SCORE_AND_COMMENT' as const, tbHk1: 8.0, tbHk2: 5.5, tbCaNam: 3.6 },
      { subjectName: 'Hóa', assessmentMode: 'SCORE_AND_COMMENT' as const, tbHk1: 8.0, tbHk2: 8.0, tbCaNam: 8.0 },
      { subjectName: 'Sinh', assessmentMode: 'SCORE_AND_COMMENT' as const, tbHk1: 7.0, tbHk2: 7.0, tbCaNam: 7.0 },
      { subjectName: 'Sử', assessmentMode: 'SCORE_AND_COMMENT' as const, tbHk1: 6.0, tbHk2: 6.0, tbCaNam: 6.0 },
      { subjectName: 'Địa', assessmentMode: 'SCORE_AND_COMMENT' as const, tbHk1: 5.5, tbHk2: 5.5, tbCaNam: 5.5 }
    ] as any;
    const resReport = fullYearReportService.evaluateTT43AcademicResult(rows, 'full_year');
    assert(
      resReport === 'Chưa đạt',
      'Test 11: FullYearReportService đồng bộ chuẩn xác với evaluateStudentTT43 (chỉ có 4 môn >= 5.0 -> Chưa đạt)',
      `ĐTB cả năm các môn: [4.5, 4.0, 3.8, 3.6, 8.0, 7.0, 6.0, 5.5]. Kết quả: ${resReport}`
    );
  }

  console.log('========================================================================');
  console.log(`KẾT QUẢ TỔNG HỢP: ${passedTests}/${totalTests} KIỂM THỬ THÀNH CÔNG (PASS 100%)`);
  console.log('========================================================================');
}

runTT43IndependentSubjectEvaluationTests().catch(err => {
  console.error('Lỗi khi chạy kiểm thử:', err);
  process.exit(1);
});
