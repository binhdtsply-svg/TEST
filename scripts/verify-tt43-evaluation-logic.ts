/**
 * Verification Script: TT43/2021/TT-BGDĐT Evaluation Logic Test
 * 
 * Tests that:
 * 1. Each subject average is evaluated INDEPENDENTLY.
 * 2. General GPA average is NEVER used to substitute for individual subject criteria.
 * 3. Specific cases where GPA average >= 5.0 (or >= 6.5/7.0) but one or more subjects < 5.0 or < 3.5.
 * 4. Incomplete data returns "Chưa đủ dữ liệu đánh giá".
 * 5. Semester vs Full-year distinction is strictly maintained.
 */

import { academicService } from '../src/services/AcademicService';
import { StudentAcademicRecord, SubjectGrade } from '../src/types';

function createMockRecord(
  studentId: string,
  period: 'midterm_hk1' | 'final_hk1' | 'midterm_hk2' | 'final_hk2' | 'full_year',
  gradesConfig: Array<{ name: string; mode?: 'SCORE_AND_COMMENT' | 'COMMENT_ONLY'; average?: number; tbHk1?: number; tbHk2?: number; tbCaNam?: number; qual?: 'Đạt' | 'Chưa đạt' }>
): StudentAcademicRecord {
  const grades: SubjectGrade[] = gradesConfig.map((g, idx) => ({
    subjectId: `sub_${idx}`,
    subjectName: g.name,
    assessmentMode: g.mode || 'SCORE_AND_COMMENT',
    average: g.average,
    tbHk1: g.tbHk1,
    tbHk2: g.tbHk2,
    tbCaNam: g.tbCaNam,
    qualitativeResult: g.qual || (g.mode === 'COMMENT_ONLY' ? 'Đạt' : undefined)
  }));

  return {
    studentId,
    period,
    semester: period.includes('hk2') ? 'HK2' : 'HK1',
    grades,
    teacherComment: '',
    conductResult: 'Tốt'
  };
}

let passed = 0;
let total = 0;

function assert(description: string, condition: boolean, extraInfo?: any) {
  total++;
  if (condition) {
    passed++;
    console.log(`  [PASS] ${description}`);
  } else {
    console.error(`  [FAIL] ${description}`, extraInfo || '');
    throw new Error(`Assertion failed: ${description}`);
  }
}

console.log('=== BẮT ĐẦU KIỂM THỬ LOGIC ĐIỀU 9 THÔNG TƯ 43/2021/TT-BGDĐT ===\n');

// -------------------------------------------------------------
// TEST CASE 1: ĐTB chung = 6.75 (> 5.0 và > 6.5), nhưng 3 môn < 5.0 (không có môn nào < 3.5)
// Quy định TT43:
// - Mức Tốt: tất cả môn >= 6.5 (SAI vì có môn < 5.0) -> Không đạt Tốt
// - Mức Khá: tất cả môn >= 5.0 (SAI vì có môn < 5.0) -> Không đạt Khá
// - Mức Đạt: ít nhất 5 môn >= 5.0, không môn < 3.5 (ĐÚNG vì có 5 môn >= 8.0, 3 môn là 4.5, 4.0, 4.0 đều >= 3.5) -> Xếp MỨC ĐẠT!
// -------------------------------------------------------------
console.log('--- TEST 1: ĐTB chung 6.75 nhưng 3 môn < 5.0 (>= 3.5) -> Phải xếp MỨC ĐẠT (Không được xếp Khá/Tốt) ---');
const recCase1 = createMockRecord('student_case1', 'final_hk1', [
  { name: 'Toán', average: 9.0 },
  { name: 'Ngữ văn', average: 8.5 },
  { name: 'Tiếng Anh', average: 8.0 },
  { name: 'Khoa học tự nhiên', average: 8.0 },
  { name: 'Lịch sử và Địa lí', average: 8.0 },
  { name: 'Tin học', average: 4.5 }, // < 5.0
  { name: 'Công nghệ', average: 4.0 }, // < 5.0
  { name: 'Giáo dục công dân', average: 4.0 }, // < 5.0
  { name: 'Giáo dục thể chất', mode: 'COMMENT_ONLY', qual: 'Đạt' }
]);
const res1 = academicService.evaluateStudentTT43(recCase1);
console.log('  Kết quả Case 1:', { tier: res1.tier, label: res1.label, gpaEstimate: res1.gpaEstimate });
assert('Case 1: Tier phải là DAT', res1.tier === 'DAT');
assert('Case 1: Label phải là "Mức Đạt"', res1.label === 'Mức Đạt');
assert('Case 1: ĐTB chung tham khảo tính đúng 6.8', res1.gpaEstimate === 6.8);

// -------------------------------------------------------------
// TEST CASE 2A: ĐTB chung = 7.1, 5 môn 9.0 nhưng có 2 môn vi phạm (Tin 4.5 < 5.0 và GDCD 3.0 < 3.5)
// Quy định TT43:
// - Có 2 môn cùng vi phạm tiêu chuẩn Mức Khá/Tốt -> Khoản 3 không áp dụng -> Phải xếp MỨC CHƯA ĐẠT!
// -------------------------------------------------------------
console.log('\n--- TEST 2A: ĐTB chung 7.1, 5 môn 9.0 nhưng 2 môn vi phạm (Tin 4.5, GDCD 3.0) -> MỨC CHƯA ĐẠT ---');
const recCase2A = createMockRecord('student_case2a', 'final_hk1', [
  { name: 'Toán', average: 9.0 },
  { name: 'Ngữ văn', average: 9.0 },
  { name: 'Tiếng Anh', average: 9.0 },
  { name: 'Khoa học tự nhiên', average: 9.0 },
  { name: 'Lịch sử và Địa lí', average: 9.0 },
  { name: 'Tin học', average: 4.5 }, // Vi phạm < 5.0
  { name: 'Công nghệ', average: 5.0 },
  { name: 'Giáo dục công dân', average: 3.0 }, // Vi phạm < 3.5
  { name: 'Giáo dục thể chất', mode: 'COMMENT_ONLY', qual: 'Đạt' }
]);
const res2A = academicService.evaluateStudentTT43(recCase2A);
console.log('  Kết quả Case 2A:', { tier: res2A.tier, label: res2A.label, gpaEstimate: res2A.gpaEstimate });
assert('Case 2A: Tier phải là CHUA_DAT (2 môn vi phạm)', res2A.tier === 'CHUA_DAT');
assert('Case 2A: Label phải là "Mức Chưa đạt"', res2A.label === 'Mức Chưa đạt');

// -------------------------------------------------------------
// TEST CASE 2B: ĐTB chung 7.25, đủ chuẩn Khá nhưng DUY NHẤT 1 môn GDCD 3.0 (< 3.5)
// Quy định TT43:
// - Theo Khoản 2: Bị rớt xuống Chưa đạt do GDCD 3.0 < 3.5.
// - Theo Khoản 3: Hạ 2 mức từ Khá xuống Chưa đạt chỉ do 1 môn -> Điều chỉnh lên MỨC ĐẠT!
// -------------------------------------------------------------
console.log('\n--- TEST 2B: Đủ chuẩn Khá nhưng duy nhất 1 môn GDCD 3.0 (< 3.5) -> Điều chỉnh lên MỨC ĐẠT theo K3 ---');
const recCase2B = createMockRecord('student_case2b', 'final_hk1', [
  { name: 'Toán', average: 9.0 },
  { name: 'Ngữ văn', average: 9.0 },
  { name: 'Tiếng Anh', average: 9.0 },
  { name: 'Khoa học tự nhiên', average: 9.0 },
  { name: 'Lịch sử và Địa lí', average: 9.0 },
  { name: 'Tin học', average: 5.0 },
  { name: 'Công nghệ', average: 5.0 },
  { name: 'Giáo dục công dân', average: 3.0 }, // Duy nhất 1 môn < 3.5
  { name: 'Giáo dục thể chất', mode: 'COMMENT_ONLY', qual: 'Đạt' }
]);
const res2B = academicService.evaluateStudentTT43(recCase2B);
console.log('  Kết quả Case 2B:', { tier: res2B.tier, label: res2B.label, reason: res2B.reason });
assert('Case 2B: Tier phải được điều chỉnh lên DAT theo K3', res2B.tier === 'DAT');
assert('Case 2B: Label phải là "Mức Đạt"', res2B.label === 'Mức Đạt');
assert('Case 2B: Có ghi chú điều chỉnh viện dẫn K3 Đ9 TT43', Boolean(res2B.reason && res2B.reason.includes('K3 Đ9 TT43')));

// -------------------------------------------------------------
// TEST CASE 3: ĐTB chung = 5.4 (> 5.0), không môn nào < 3.5, nhưng chỉ có 4 môn >= 5.0
// 4 môn 6.0, 4 môn 4.8.
// Quy định TT43:
// - Mức Đạt yêu cầu ít nhất 5 môn >= 5.0. Ở đây chỉ có 4 môn >= 5.0 -> MỨC CHƯA ĐẠT!
// -------------------------------------------------------------
console.log('\n--- TEST 3: ĐTB chung 5.4 nhưng chỉ có 4 môn >= 5.0 -> Phải xếp MỨC CHƯA ĐẠT ---');
const recCase3 = createMockRecord('student_case3', 'final_hk1', [
  { name: 'Toán', average: 6.0 },
  { name: 'Ngữ văn', average: 6.0 },
  { name: 'Tiếng Anh', average: 6.0 },
  { name: 'Khoa học tự nhiên', average: 6.0 },
  { name: 'Lịch sử và Địa lí', average: 4.8 },
  { name: 'Tin học', average: 4.8 },
  { name: 'Công nghệ', average: 4.8 },
  { name: 'Giáo dục công dân', average: 4.8 },
  { name: 'Giáo dục thể chất', mode: 'COMMENT_ONLY', qual: 'Đạt' }
]);
const res3 = academicService.evaluateStudentTT43(recCase3);
console.log('  Kết quả Case 3:', { tier: res3.tier, label: res3.label, gpaEstimate: res3.gpaEstimate });
assert('Case 3: Tier phải là CHUA_DAT', res3.tier === 'CHUA_DAT');
assert('Case 3: Label phải là "Mức Chưa đạt"', res3.label === 'Mức Chưa đạt');

// -------------------------------------------------------------
// TEST CASE 4: MỨC TỐT chuẩn
// Tất cả môn tính điểm >= 6.5, trong đó có ít nhất 5 môn >= 8.0, môn nhận xét Đạt
// -------------------------------------------------------------
console.log('\n--- TEST 4: Mức Tốt chuẩn (tất cả môn >= 6.5, 5 môn >= 8.0, NX Đạt) ---');
const recCase4 = createMockRecord('student_case4', 'final_hk1', [
  { name: 'Toán', average: 8.5 },
  { name: 'Ngữ văn', average: 8.0 },
  { name: 'Tiếng Anh', average: 8.2 },
  { name: 'Khoa học tự nhiên', average: 8.0 },
  { name: 'Lịch sử và Địa lí', average: 8.0 },
  { name: 'Tin học', average: 7.0 },
  { name: 'Công nghệ', average: 6.8 },
  { name: 'Giáo dục công dân', average: 7.5 },
  { name: 'Giáo dục thể chất', mode: 'COMMENT_ONLY', qual: 'Đạt' }
]);
const res4 = academicService.evaluateStudentTT43(recCase4);
console.log('  Kết quả Case 4:', { tier: res4.tier, label: res4.label });
assert('Case 4: Tier phải là TOT', res4.tier === 'TOT');
assert('Case 4: Label phải là "Mức Tốt"', res4.label === 'Mức Tốt');

// -------------------------------------------------------------
// TEST CASE 5: MỨC KHÁ chuẩn
// Tất cả môn tính điểm >= 5.0, trong đó ít nhất 5 môn >= 6.5, môn nhận xét Đạt
// Nhưng có 1 môn 5.5 (< 6.5) nên không thể là Tốt
// -------------------------------------------------------------
console.log('\n--- TEST 5: Mức Khá chuẩn (tất cả môn >= 5.0, 5 môn >= 6.5, có 1 môn < 6.5) ---');
const recCase5 = createMockRecord('student_case5', 'final_hk1', [
  { name: 'Toán', average: 8.5 },
  { name: 'Ngữ văn', average: 8.0 },
  { name: 'Tiếng Anh', average: 7.0 },
  { name: 'Khoa học tự nhiên', average: 6.8 },
  { name: 'Lịch sử và Địa lí', average: 6.5 },
  { name: 'Tin học', average: 5.5 }, // < 6.5 -> Không thể Tốt
  { name: 'Công nghệ', average: 5.0 },
  { name: 'Giáo dục công dân', average: 5.2 },
  { name: 'Giáo dục thể chất', mode: 'COMMENT_ONLY', qual: 'Đạt' }
]);
const res5 = academicService.evaluateStudentTT43(recCase5);
console.log('  Kết quả Case 5:', { tier: res5.tier, label: res5.label });
assert('Case 5: Tier phải là KHA', res5.tier === 'KHA');
assert('Case 5: Label phải là "Mức Khá"', res5.label === 'Mức Khá');

// -------------------------------------------------------------
// TEST CASE 6: THIẾU ĐIỂM / CHƯA ĐỦ DỮ LIỆU
// Còn môn chưa có điểm -> Phải trả về "Chưa đủ dữ liệu đánh giá", hasFullData: false
// -------------------------------------------------------------
console.log('\n--- TEST 6: Thiếu điểm 1 môn -> Phải trả về "Chưa đủ dữ liệu đánh giá" ---');
const recCase6 = createMockRecord('student_case6', 'final_hk1', [
  { name: 'Toán', average: 8.5 },
  { name: 'Ngữ văn', average: 8.0 },
  { name: 'Tiếng Anh', average: 7.0 },
  { name: 'Khoa học tự nhiên', average: undefined }, // Chưa nhập điểm!
  { name: 'Giáo dục thể chất', mode: 'COMMENT_ONLY', qual: 'Đạt' }
]);
const res6 = academicService.evaluateStudentTT43(recCase6);
console.log('  Kết quả Case 6:', { tier: res6.tier, label: res6.label, hasFullData: res6.hasFullData, missing: res6.missingSubjects });
assert('Case 6: Tier phải là CHUA_DU_LIEU', res6.tier === 'CHUA_DU_LIEU');
assert('Case 6: hasFullData phải là false', res6.hasFullData === false);
assert('Case 6: missingSubjects chứa Khoa học tự nhiên', res6.missingSubjects.includes('Khoa học tự nhiên'));

// -------------------------------------------------------------
// TEST CASE 7: KỲ CẢ NĂM (full_year) - Phân biệt ĐTB môn cả năm vs học kỳ
// 7a. Đang xét full_year nhưng môn mới có tbHk1, thiếu tbHk2 -> Chưa đủ dữ liệu!
// -------------------------------------------------------------
console.log('\n--- TEST 7a: Kỳ Cả năm, thiếu điểm HK2 -> "Chưa đủ dữ liệu đánh giá" ---');
const recCase7a = createMockRecord('student_case7a', 'full_year', [
  { name: 'Toán', tbHk1: 8.0, tbHk2: undefined }, // Thiếu HK2
  { name: 'Ngữ văn', tbHk1: 7.0, tbHk2: 8.0 },
  { name: 'Giáo dục thể chất', mode: 'COMMENT_ONLY', qual: 'Đạt' }
]);
const res7a = academicService.evaluateStudentTT43(recCase7a);
console.log('  Kết quả Case 7a:', { tier: res7a.tier, label: res7a.label, hasFullData: res7a.hasFullData });
assert('Case 7a: Tier phải là CHUA_DU_LIEU', res7a.tier === 'CHUA_DU_LIEU');
assert('Case 7a: hasFullData là false', res7a.hasFullData === false);

// 7b. Đang xét full_year có đủ tbHk1 và tbHk2, tính ĐTB cả năm = (tbHk1 + 2*tbHk2)/3 cho từng môn độc lập
console.log('\n--- TEST 7b: Kỳ Cả năm, tính đúng ĐTB cả năm từng môn độc lập ---');
// Toán: HK1=6.0, HK2=9.0 -> ĐTBcn = (6 + 18)/3 = 8.0
// Văn: HK1=7.0, HK2=8.5 -> ĐTBcn = (7 + 17)/3 = 8.0
// Anh: HK1=8.0, HK2=8.0 -> ĐTBcn = 8.0
// KHTN: HK1=8.0, HK2=8.0 -> ĐTBcn = 8.0
// Sử Địa: HK1=8.0, HK2=8.0 -> ĐTBcn = 8.0
// Tin: HK1=6.0, HK2=7.0 -> ĐTBcn = (6 + 14)/3 = 6.7
// CN: HK1=7.0, HK2=7.0 -> ĐTBcn = 7.0
// GDCD: HK1=7.0, HK2=7.0 -> ĐTBcn = 7.0
// -> 8 môn tính điểm đều >= 6.5 và 5 môn >= 8.0 -> Mức Tốt!
const recCase7b = createMockRecord('student_case7b', 'full_year', [
  { name: 'Toán', tbHk1: 6.0, tbHk2: 9.0 },
  { name: 'Ngữ văn', tbHk1: 7.0, tbHk2: 8.5 },
  { name: 'Tiếng Anh', tbHk1: 8.0, tbHk2: 8.0 },
  { name: 'Khoa học tự nhiên', tbHk1: 8.0, tbHk2: 8.0 },
  { name: 'Lịch sử và Địa lí', tbHk1: 8.0, tbHk2: 8.0 },
  { name: 'Tin học', tbHk1: 6.0, tbHk2: 7.0 },
  { name: 'Công nghệ', tbHk1: 7.0, tbHk2: 7.0 },
  { name: 'Giáo dục công dân', tbHk1: 7.0, tbHk2: 7.0 },
  { name: 'Giáo dục thể chất', mode: 'COMMENT_ONLY', qual: 'Đạt' }
]);
const res7b = academicService.evaluateStudentTT43(recCase7b);
console.log('  Kết quả Case 7b:', { tier: res7b.tier, label: res7b.label });
assert('Case 7b: Tier phải là TOT', res7b.tier === 'TOT');
assert('Case 7b: Label phải là "Mức Tốt"', res7b.label === 'Mức Tốt');

console.log(`\n=================================================`);
console.log(`KẾT QUẢ KIỂM THỬ: ${passed}/${total} TESTS PASSED 100%`);
console.log(`=================================================`);
