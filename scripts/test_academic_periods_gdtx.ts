/**
 * Test script for verifying GDTX academic period score reading across 5 tabs:
 * - midterm_hk1 (Giữa HKI)
 * - final_hk1 (HKI)
 * - midterm_hk2 (Giữa HKII)
 * - final_hk2 (HKII)
 * - full_year (Cả năm)
 */

import { academicService } from '../src/services/AcademicService';
import { studentService } from '../src/services/StudentService';
import { StudentAcademicRecord, SubjectGrade } from '../src/types';

async function runTests() {
  console.log('================================================================');
  console.log('TEST SUITE: KIỂM THỬ ĐỌC ĐIỂM THEO TỪNG KỲ GDTX TRÊN CẢ 5 TAB');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, msg: string) {
    totalTests++;
    if (condition) {
      console.log(`[PASS] ${msg}`);
      passedTests++;
    } else {
      console.error(`[FAIL] ${msg}`);
      throw new Error(`Assertion failed: ${msg}`);
    }
  }

  // Chuẩn bị các môn học chuẩn GDTX cấp THPT (Toán, Văn, Sử bắt buộc + các môn lựa chọn)
  const gdtxSubjects = [
    { id: 'sub-toan', name: 'Toán học', subjectCode: 'TOAN', assessmentMode: 'SCORE_AND_COMMENT' as const, selected: true, active: true },
    { id: 'sub-van', name: 'Ngữ văn', subjectCode: 'VAN', assessmentMode: 'SCORE_AND_COMMENT' as const, selected: true, active: true },
    { id: 'sub-su', name: 'Lịch sử', subjectCode: 'SU', assessmentMode: 'SCORE_AND_COMMENT' as const, selected: true, active: true },
    { id: 'sub-ly', name: 'Vật lí', subjectCode: 'LY', assessmentMode: 'SCORE_AND_COMMENT' as const, selected: true, active: true },
    { id: 'sub-hoa', name: 'Hóa học', subjectCode: 'HOA', assessmentMode: 'SCORE_AND_COMMENT' as const, selected: true, active: true },
    { id: 'sub-sinh', name: 'Sinh học', subjectCode: 'SINH', assessmentMode: 'SCORE_AND_COMMENT' as const, selected: true, active: true },
    { id: 'sub-dia', name: 'Địa lí', subjectCode: 'DIA', assessmentMode: 'SCORE_AND_COMMENT' as const, selected: true, active: true }
  ];

  // --------------------------------------------------------------------------
  // TEST TAB 1: Giữa HKI (midterm_hk1)
  // --------------------------------------------------------------------------
  console.log('--- TAB 1: Giữa HKI (midterm_hk1) ---');
  {
    // 1.1 Kiểm tra đối chiếu trường điểm: tx + midterm / averageScore / diemTB
    const testGrade1: any = {
      subjectName: 'Toán học',
      regularScores: [8.0, 9.0],
      midtermScore: 8.5
    };
    const s1 = academicService.resolveSubjectPeriodScore(testGrade1, 'midterm_hk1');
    // TX (weight 1 each) = 8.0 + 9.0 = 17, Midterm (weight 2) = 17, total = 34 / 4 = 8.5
    assert(s1 === 8.5, 'Tab 1: Tính đúng ĐTB Giữa HKI từ TX và Midterm (8.5)');

    // 1.2 Kiểm tra trường diemTB / averageScore hợp lệ được đọc đúng
    const testGradeDirect: any = {
      subjectName: 'Ngữ văn',
      diemTB: 7.8,
      period: 'midterm_hk1'
    };
    const s2 = academicService.resolveSubjectPeriodScore(testGradeDirect, 'midterm_hk1');
    assert(s2 === 7.8, 'Tab 1: Đọc đúng trường diemTB=7.8 khi lưu sẵn cho Giữa HKI');

    // 1.3 Kiểm tra trường hợp thiếu điểm
    const testGradeEmpty: any = {
      subjectName: 'Lịch sử'
    };
    const s3 = academicService.resolveSubjectPeriodScore(testGradeEmpty, 'midterm_hk1');
    assert(s3 === undefined, 'Tab 1: Khi chưa nhập điểm, trả về undefined chính xác');

    // 1.4 Kiểm tra cô lập kỳ: không đọc nhầm tbHk1 hay tbCaNam cho Giữa HKI
    const testGradeBleed: any = {
      subjectName: 'Vật lí',
      tbHk1: 9.0,
      tbCaNam: 9.2
    };
    const s4 = academicService.resolveSubjectPeriodScore(testGradeBleed, 'midterm_hk1');
    assert(s4 === undefined, 'Tab 1: Không bị rò rỉ điểm tbHk1 hoặc tbCaNam vào Giữa HKI');
  }

  // --------------------------------------------------------------------------
  // TEST TAB 2: Cuối HKI (final_hk1)
  // --------------------------------------------------------------------------
  console.log('\n--- TAB 2: Cuối HKI (final_hk1) ---');
  {
    // 2.1 Đọc đúng trường tbHk1 / dtbHk1 đã lưu
    const testGradeHk1: any = {
      subjectName: 'Toán học',
      tbHk1: 8.4,
      tbCaNam: 8.8
    };
    const s1 = academicService.resolveSubjectPeriodScore(testGradeHk1, 'final_hk1');
    assert(s1 === 8.4, 'Tab 2: Đọc chính xác trường tbHk1=8.4 cho Cuối HKI');

    // 2.2 Tính từ điểm thành phần TX + GK + CK (hệ số 1, 2, 3)
    const testGradeCalc: any = {
      subjectName: 'Ngữ văn',
      regularScores: [8.0],
      midterm: 8.0,
      finalExam: 8.0
    };
    const s2 = academicService.resolveSubjectPeriodScore(testGradeCalc, 'final_hk1');
    assert(s2 === 8.0, 'Tab 2: Tính đúng ĐTB HKI từ TX(1) + GK(2) + CK(3)');

    // 2.3 Kiểm tra trường hợp thiếu điểm CK
    const testGradeIncomplete: any = {
      subjectName: 'Hóa học'
    };
    const s3 = academicService.resolveSubjectPeriodScore(testGradeIncomplete, 'final_hk1');
    assert(s3 === undefined, 'Tab 2: Khi chưa có điểm HKI, trả về undefined');

    // 2.4 Không đọc nhầm tbHk2 hay tbCaNam
    const testGradeBleed2: any = {
      subjectName: 'Sinh học',
      tbHk2: 9.5,
      tbCaNam: 9.0
    };
    const s4 = academicService.resolveSubjectPeriodScore(testGradeBleed2, 'final_hk1');
    assert(s4 === undefined, 'Tab 2: Không bị rò rỉ điểm tbHk2 vào Cuối HKI');
  }

  // --------------------------------------------------------------------------
  // TEST TAB 3: Giữa HKII (midterm_hk2)
  // --------------------------------------------------------------------------
  console.log('\n--- TAB 3: Giữa HKII (midterm_hk2) ---');
  {
    // 3.1 Tính đúng điểm Giữa HKII từ TX và Midterm HKII
    const testGradeM2: any = {
      subjectName: 'Toán học',
      regularScores: [9.0],
      midterm: 9.0
    };
    const s1 = academicService.resolveSubjectPeriodScore(testGradeM2, 'midterm_hk2');
    assert(s1 === 9.0, 'Tab 3: Tính đúng ĐTB Giữa HKII từ TX + GK (9.0)');

    // 3.2 Đọc đúng điểm trung bình lưu sẵn khi thuộc kỳ midterm_hk2
    const testGradeSavedM2: any = {
      subjectName: 'Lịch sử',
      averageScore: 8.2,
      period: 'midterm_hk2'
    };
    const s2 = academicService.resolveSubjectPeriodScore(testGradeSavedM2, 'midterm_hk2');
    assert(s2 === 8.2, 'Tab 3: Đọc đúng averageScore=8.2 cho Giữa HKII');

    // 3.3 Không lấy điểm HKI
    const testGradeBleedM2: any = {
      subjectName: 'Địa lí',
      tbHk1: 7.5
    };
    const s3 = academicService.resolveSubjectPeriodScore(testGradeBleedM2, 'midterm_hk2');
    assert(s3 === undefined, 'Tab 3: Tuyệt đối không lấy điểm HKI cho Giữa HKII');
  }

  // --------------------------------------------------------------------------
  // TEST TAB 4: Cuối HKII (final_hk2)
  // --------------------------------------------------------------------------
  console.log('\n--- TAB 4: Cuối HKII (final_hk2) ---');
  {
    // 4.1 Đọc đúng trường tbHk2 / dtbHk2
    const testGradeHk2: any = {
      subjectName: 'Toán học',
      tbHk2: 8.8,
      tbHk1: 8.0
    };
    const s1 = academicService.resolveSubjectPeriodScore(testGradeHk2, 'final_hk2');
    assert(s1 === 8.8, 'Tab 4: Đọc chính xác tbHk2=8.8 cho Cuối HKII');

    // 4.2 Tính từ điểm thành phần HKII
    const testGradeCalcHk2: any = {
      subjectName: 'Vật lí',
      regularScores: [7.0, 7.0],
      midterm: 7.0,
      finalExam: 7.0
    };
    const s2 = academicService.resolveSubjectPeriodScore(testGradeCalcHk2, 'final_hk2');
    assert(s2 === 7.0, 'Tab 4: Tính đúng ĐTB HKII từ TX + GK + CK (7.0)');

    // 4.3 Trường hợp thiếu điểm HKII
    const testGradeMissingHk2: any = {
      subjectName: 'Hóa học',
      tbHk1: 8.5
    };
    const s3 = academicService.resolveSubjectPeriodScore(testGradeMissingHk2, 'final_hk2');
    assert(s3 === undefined, 'Tab 4: Thiếu điểm HKII trả về undefined (không lấy nhầm HKI)');
  }

  // --------------------------------------------------------------------------
  // TEST TAB 5: Cả năm (full_year)
  // --------------------------------------------------------------------------
  console.log('\n--- TAB 5: Cả năm (full_year) ---');
  {
    // 5.1 Đọc trực tiếp tbCaNam / diemTBCaNam khi đã có
    const testGradeDirectCaNam: any = {
      subjectName: 'Toán học',
      tbCaNam: 8.6,
      tbHk1: 8.0,
      tbHk2: 8.9
    };
    const s1 = academicService.resolveSubjectPeriodScore(testGradeDirectCaNam, 'full_year');
    assert(s1 === 8.6, 'Tab 5: Đọc chính xác tbCaNam=8.6 đã lưu');

    // 5.2 Tính theo công thức TT43 khi đủ cả 2 học kỳ: (tbHk1 + 2*tbHk2)/3
    // Ví dụ: HK1 = 7.0, HK2 = 8.5 -> (7.0*1 + 8.5*2)/3 = 24/3 = 8.0
    const testGradeCalcCaNam: any = {
      subjectName: 'Ngữ văn',
      tbHk1: 7.0,
      tbHk2: 8.5
    };
    const s2 = academicService.resolveSubjectPeriodScore(testGradeCalcCaNam, 'full_year');
    assert(s2 === 8.0, 'Tab 5: Tính đúng ĐTB Cả năm theo công thức (7.0 + 2*8.5)/3 = 8.0');

    // 5.3 Trường hợp THIẾU điểm HK2: chỉ có HK1 -> BẮT BUỘC trả về undefined!
    const testGradeMissingHk2: any = {
      subjectName: 'Lịch sử',
      tbHk1: 8.5
      // tbHk2 is missing!
    };
    const s3 = academicService.resolveSubjectPeriodScore(testGradeMissingHk2, 'full_year');
    assert(s3 === undefined, 'Tab 5: Thiếu điểm HK2 -> Cả năm trả về undefined (không suy đoán, không để lọt)');

    // 5.4 Trường hợp THIẾU điểm HK1: chỉ có HK2 -> BẮT BUỘC trả về undefined!
    const testGradeMissingHk1: any = {
      subjectName: 'Địa lí',
      tbHk2: 8.5
      // tbHk1 is missing!
    };
    const s4 = academicService.resolveSubjectPeriodScore(testGradeMissingHk1, 'full_year');
    assert(s4 === undefined, 'Tab 5: Thiếu điểm HK1 -> Cả năm trả về undefined');
  }

  // --------------------------------------------------------------------------
  // TEST TÍNH NĂNG COMPOSITE RECORD & TỔNG HỢP CẢ NĂM TRONG findAcademicRecord
  // --------------------------------------------------------------------------
  console.log('\n--- TEST BẢN GHI TỔNG HỢP & TƯƠNG THÍCH LƯU TRỮ ---');
  {
    // Tạo 1 học sinh giả lập trong academicRecords
    const mockStudentId = 'test-gdtx-student-99';

    // Đưa 1 bản ghi composite lưu trữ dưới key studentId trực tiếp (không có hậu tố period)
    const compositeRecord: StudentAcademicRecord = {
      studentId: mockStudentId,
      period: 'full_year',
      semester: 'Cả năm' as any,
      grades: [
        { subjectName: 'Toán học', tbHk1: 8.0, tbHk2: 8.6, tbCaNam: 8.4 },
        { subjectName: 'Ngữ văn', tbHk1: 7.5, tbHk2: 8.1, tbCaNam: 7.9 },
        { subjectName: 'Lịch sử', tbHk1: 8.5, tbHk2: 8.5, tbCaNam: 8.5 },
        { subjectName: 'Vật lí', tbHk1: 8.0, tbHk2: 8.0, tbCaNam: 8.0 },
        { subjectName: 'Hóa học', tbHk1: 8.0, tbHk2: 8.0, tbCaNam: 8.0 },
        { subjectName: 'Sinh học', tbHk1: 8.0, tbHk2: 8.0, tbCaNam: 8.0 },
        { subjectName: 'Địa lí', tbHk1: 8.0, tbHk2: 8.0, tbCaNam: 8.0 }
      ]
    };

    // Lưu vào academicRecords của service
    (academicService as any).academicRecords[mockStudentId] = compositeRecord;

    // Tìm bản ghi cho final_hk1: phải tìm thấy từ composite record, KHÔNG tạo bản ghi rỗng
    const foundHk1 = academicService.findAcademicRecord(mockStudentId, undefined, 'final_hk1');
    assert(foundHk1 !== undefined, 'findAcademicRecord: Tìm thấy dữ liệu HK1 từ bản ghi tổng hợp');
    assert(Array.isArray(foundHk1?.grades) && foundHk1.grades.length === 7, 'findAcademicRecord: Bản ghi HK1 có đủ 7 môn, không rỗng');

    // Tìm bản ghi cho final_hk2:
    const foundHk2 = academicService.findAcademicRecord(mockStudentId, undefined, 'final_hk2');
    assert(foundHk2 !== undefined, 'findAcademicRecord: Tìm thấy dữ liệu HK2 từ bản ghi tổng hợp');

    // Tìm bản ghi cho full_year:
    const foundFull = academicService.findAcademicRecord(mockStudentId, undefined, 'full_year');
    assert(foundFull !== undefined, 'findAcademicRecord: Tìm thấy dữ liệu Cả năm từ bản ghi tổng hợp');

    // Đánh giá TT43 cho Cả năm:
    const evalFull = academicService.evaluateStudentTT43(foundFull!, gdtxSubjects);
    assert(evalFull.hasFullData === true, 'Đánh giá TT43 Cả năm: hasFullData = true (không còn báo thiếu dữ liệu sai lệch)');
    assert(evalFull.tier === 'TOT' || evalFull.tier === 'KHA', `Đánh giá TT43 Cả năm: xếp loại ${evalFull.label}`);

    // Dọn dẹp mock data
    delete (academicService as any).academicRecords[mockStudentId];
  }

  // --------------------------------------------------------------------------
  // TEST TỔNG HỢP CẢ NĂM TỪ 2 KỲ ĐỘC LẬP
  // --------------------------------------------------------------------------
  console.log('\n--- TEST TỔNG HỢP CẢ NĂM TỪ 2 KỲ ĐỘC LẬP (HK1 + HK2) ---');
  {
    const mockStudentId2 = 'test-gdtx-student-two-terms';

    // Tạo bản ghi HK1 độc lập
    const hk1Rec: StudentAcademicRecord = {
      studentId: mockStudentId2,
      period: 'final_hk1',
      semester: 'HK1' as any,
      grades: [
        { subjectName: 'Toán học', tbHk1: 8.0 },
        { subjectName: 'Ngữ văn', tbHk1: 7.0 },
        { subjectName: 'Lịch sử', tbHk1: 8.0 },
        { subjectName: 'Vật lí', tbHk1: 8.0 },
        { subjectName: 'Hóa học', tbHk1: 8.0 },
        { subjectName: 'Sinh học', tbHk1: 8.0 },
        { subjectName: 'Địa lí', tbHk1: 8.0 }
      ]
    };
    // Tạo bản ghi HK2 độc lập
    const hk2Rec: StudentAcademicRecord = {
      studentId: mockStudentId2,
      period: 'final_hk2',
      semester: 'HK2' as any,
      grades: [
        { subjectName: 'Toán học', tbHk2: 8.6 },
        { subjectName: 'Ngữ văn', tbHk2: 8.5 },
        { subjectName: 'Lịch sử', tbHk2: 8.0 },
        { subjectName: 'Vật lí', tbHk2: 8.0 },
        { subjectName: 'Hóa học', tbHk2: 8.0 },
        { subjectName: 'Sinh học', tbHk2: 8.0 },
        { subjectName: 'Địa lí', tbHk2: 8.0 }
      ]
    };

    (academicService as any).academicRecords[`${mockStudentId2}_final_hk1`] = hk1Rec;
    (academicService as any).academicRecords[`${mockStudentId2}_final_hk2`] = hk2Rec;

    // Tìm bản ghi Cả năm khi CHƯA có bản ghi full_year riêng:
    const fullRecSynthesized = academicService.findAcademicRecord(mockStudentId2, undefined, 'full_year');
    assert(fullRecSynthesized !== undefined, 'findAcademicRecord: Tự động tổng hợp bản ghi Cả năm khi đủ 2 học kỳ');
    
    // Toán học: HK1=8.0, HK2=8.6 -> (8.0 + 2*8.6)/3 = 25.2/3 = 8.4
    const toanGrade = (fullRecSynthesized?.grades as SubjectGrade[]).find(g => g.subjectName === 'Toán học');
    assert(toanGrade?.tbCaNam === 8.4, `Toán học Cả năm = 8.4 (thực tế: ${toanGrade?.tbCaNam})`);

    // Ngữ văn: HK1=7.0, HK2=8.5 -> (7.0 + 2*8.5)/3 = 24.0/3 = 8.0
    const vanGrade = (fullRecSynthesized?.grades as SubjectGrade[]).find(g => g.subjectName === 'Ngữ văn');
    assert(vanGrade?.tbCaNam === 8.0, `Ngữ văn Cả năm = 8.0 (thực tế: ${vanGrade?.tbCaNam})`);

    // Đánh giá TT43 cả năm:
    const evalRes = academicService.evaluateStudentTT43(fullRecSynthesized!, gdtxSubjects);
    assert(evalRes.hasFullData === true, 'Đánh giá TT43 Cả năm: hasFullData = true');
    assert(evalRes.missingSubjects.length === 0, 'Đánh giá TT43 Cả năm: không thiếu môn nào');

    // Trường hợp nếu XÓA bản ghi HK2: Cả năm phải lập tức báo thiếu dữ liệu!
    delete (academicService as any).academicRecords[`${mockStudentId2}_final_hk2`];
    const fullRecMissingHk2 = academicService.getStudentAcademicRecord(mockStudentId2, 'full_year');
    const evalMissingHk2 = academicService.evaluateStudentTT43(fullRecMissingHk2, gdtxSubjects);
    assert(evalMissingHk2.hasFullData === false, 'Khi thiếu HK2: Cả năm báo đúng hasFullData = false');
    assert(evalMissingHk2.tier === 'CHUA_DU_LIEU', 'Khi thiếu HK2: Xếp loại đúng "Chưa đủ dữ liệu đánh giá"');

    // Dọn dẹp mock data
    delete (academicService as any).academicRecords[`${mockStudentId2}_final_hk1`];
  }

  // --------------------------------------------------------------------------
  // TEST THỐNG KÊ, CHI TIẾT LỚP VÀ EXCEL TRÊN CẢ 5 TAB (ĐẦY ĐỦ ĐIỂM & THIẾU ĐIỂM)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST THỐNG KÊ, CHI TIẾT LỚP VÀ XUẤT EXCEL TRÊN CẢ 5 TAB ---');
  {
    const periods = ['midterm_hk1', 'final_hk1', 'midterm_hk2', 'final_hk2', 'full_year'] as const;
    const testStudentFull = 'student_full_data_5tabs';
    const testStudentMissing = 'student_missing_data_5tabs';

    // Tạo dữ liệu cho học sinh đủ điểm trên cả 5 kỳ
    // Kỳ 1: Giữa HKI
    (academicService as any).academicRecords[`${testStudentFull}_midterm_hk1`] = {
      studentId: testStudentFull,
      period: 'midterm_hk1',
      grades: gdtxSubjects.map(s => ({
        subjectName: s.name,
        average: 8.5
      }))
    };
    // Kỳ 2: Cuối HKI
    (academicService as any).academicRecords[`${testStudentFull}_final_hk1`] = {
      studentId: testStudentFull,
      period: 'final_hk1',
      grades: gdtxSubjects.map(s => ({
        subjectName: s.name,
        tbHk1: 8.4,
        average: 8.4
      }))
    };
    // Kỳ 3: Giữa HKII
    (academicService as any).academicRecords[`${testStudentFull}_midterm_hk2`] = {
      studentId: testStudentFull,
      period: 'midterm_hk2',
      grades: gdtxSubjects.map(s => ({
        subjectName: s.name,
        average: 8.6
      }))
    };
    // Kỳ 4: Cuối HKII
    (academicService as any).academicRecords[`${testStudentFull}_final_hk2`] = {
      studentId: testStudentFull,
      period: 'final_hk2',
      grades: gdtxSubjects.map(s => ({
        subjectName: s.name,
        tbHk2: 8.8,
        average: 8.8
      }))
    };
    // Kỳ 5: Cả năm (đã có đủ 2 kỳ để tổng hợp hoặc có tbCaNam)
    // Học sinh thiếu điểm: chỉ có 3 môn có điểm ở Giữa HKI, các kỳ khác trống
    (academicService as any).academicRecords[`${testStudentMissing}_midterm_hk1`] = {
      studentId: testStudentMissing,
      period: 'midterm_hk1',
      grades: [
        { subjectName: 'Toán học', average: 8.0 },
        { subjectName: 'Ngữ văn', average: 7.5 }
      ] // thiếu 5 môn còn lại!
    };

    for (const p of periods) {
      // 1. Kiểm tra đọc bản ghi của học sinh đủ điểm
      const recFull = academicService.getStudentAcademicRecord(testStudentFull, p);
      const evalFull = academicService.evaluateStudentTT43(recFull, gdtxSubjects);
      assert(evalFull.hasFullData === true, `Tab [${p}]: Học sinh đủ điểm -> hasFullData=true (không báo thiếu sai lệch)`);
      assert(evalFull.tier === 'TOT' || evalFull.tier === 'KHA', `Tab [${p}]: Học sinh đủ điểm -> xếp loại ${evalFull.label}`);

      // Kiểm tra mô phỏng hàng Excel
      const excelRowFull: Record<string, any> = { 'Họ và tên': 'Nguyễn Văn Đầy Đủ' };
      const gradesListFull = Array.isArray(recFull.grades) ? recFull.grades : [];
      gdtxSubjects.forEach(sub => {
        const g = gradesListFull.find(x => x.subjectName === sub.name);
        excelRowFull[sub.name] = g?.average !== undefined ? g.average : '-';
      });
      excelRowFull['Kết quả học tập (TT43)'] = evalFull.label;

      const hasAllScoresInExcel = gdtxSubjects.every(sub => typeof excelRowFull[sub.name] === 'number');
      assert(hasAllScoresInExcel, `Tab [${p}]: Hàng Excel của học sinh đủ điểm chứa đủ số điểm của tất cả ${gdtxSubjects.length} môn`);

      // 2. Kiểm tra đọc bản ghi của học sinh thiếu điểm
      const recMissing = academicService.getStudentAcademicRecord(testStudentMissing, p);
      const evalMissing = academicService.evaluateStudentTT43(recMissing, gdtxSubjects);
      assert(evalMissing.hasFullData === false, `Tab [${p}]: Học sinh thiếu điểm -> hasFullData=false chính xác`);
      assert(evalMissing.tier === 'CHUA_DU_LIEU', `Tab [${p}]: Học sinh thiếu điểm -> Xếp loại "Chưa đủ dữ liệu đánh giá"`);
    }

    // Dọn dẹp mock data
    for (const p of periods) {
      delete (academicService as any).academicRecords[`${testStudentFull}_${p}`];
      delete (academicService as any).academicRecords[`${testStudentMissing}_${p}`];
    }
  }

  console.log('\n================================================================');
  console.log(`KẾT QUẢ KIỂM THỬ: ${passedTests}/${totalTests} TESTS PASS (100%)`);
  console.log('================================================================');
}

runTests().catch(err => {
  console.error('[TEST-FAILED]', err);
  process.exit(1);
});
