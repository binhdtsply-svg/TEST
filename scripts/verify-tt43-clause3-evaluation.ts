/**
 * Comprehensive Verification Suite for TT43/2021/TT-BGDĐT Clause 3 Article 9
 * 
 * Kiểm tra các tình huống pháp lý:
 * 1. Đủ điều kiện Tốt nhưng chỉ 1 môn khiến kết quả giảm xuống Đạt (giảm 2 mức) -> Điều chỉnh lên Mức Khá.
 * 2. Đủ điều kiện Tốt nhưng chỉ 1 môn khiến kết quả giảm xuống Chưa đạt (giảm 3 mức) -> Điều chỉnh lên Mức Đạt.
 * 3. Đủ điều kiện Khá nhưng chỉ 1 môn khiến kết quả giảm xuống Chưa đạt (giảm 2 mức) -> Điều chỉnh lên Mức Đạt.
 * 4. Có từ 2 môn trở lên gây giảm mức -> Không điều chỉnh theo khoản 3.
 * 5. Thiếu điểm hoặc thiếu kết quả môn nhận xét -> Giữ nguyên trạng thái Chưa đủ dữ liệu đánh giá.
 * 6. Giảm chỉ 1 mức (Tốt -> Khá, hoặc Khá -> Đạt) -> Không thuộc diện điều chỉnh (giữ nguyên Khoản 2).
 */

import { academicService } from '../src/services/AcademicService';
import { StudentAcademicRecord, SubjectGrade } from '../src/types';

function createRecord(
  studentId: string,
  period: 'midterm_hk1' | 'final_hk1' | 'midterm_hk2' | 'final_hk2' | 'full_year',
  grades: Array<{ name: string; score?: number; mode?: 'SCORE_AND_COMMENT' | 'COMMENT_ONLY'; qual?: 'Đạt' | 'Chưa đạt' }>
): StudentAcademicRecord {
  const gList: SubjectGrade[] = grades.map((g, idx) => ({
    subjectId: `sub_${idx}`,
    subjectName: g.name,
    assessmentMode: g.mode || 'SCORE_AND_COMMENT',
    average: g.score,
    qualitativeResult: g.qual || (g.mode === 'COMMENT_ONLY' ? 'Đạt' : undefined)
  }));

  return {
    studentId,
    period,
    semester: period.includes('hk2') ? 'HK2' : 'HK1',
    grades: gList,
    teacherComment: '',
    conductResult: 'Tốt'
  };
}

let passed = 0;
let total = 0;

function assert(description: string, condition: boolean, extra?: any) {
  total++;
  if (condition) {
    passed++;
    console.log(`  [PASS] ${description}`);
  } else {
    console.error(`  [FAIL] ${description}`, extra || '');
    throw new Error(`Assertion failed: ${description}`);
  }
}

console.log('======================================================================');
console.log('KIỂM THỬ ĐIỀU 9 KHOẢN 3 THÔNG TƯ 43/2021/TT-BGDĐT: ĐIỀU CHỈNH MỨC ĐÁNH GIÁ');
console.log('======================================================================\n');

// -------------------------------------------------------------------------------------------------
// TÌNH HUỐNG 1: Đủ chuẩn Tốt nhưng chỉ 1 môn khiến kết quả giảm xuống Đạt (giảm 2 mức) -> Lên Khá
// Chi tiết điểm:
// - 5 môn >= 8.0: Toán 8.5, Văn 8.0, Anh 8.2, KHTN 8.0, Sử Địa 8.0
// - 2 môn >= 6.5: Tin học 7.0, Công nghệ 6.8
// - Duy nhất 1 môn < 5.0 (nhưng >= 3.5): GDCD 4.0
// - Môn nhận xét: Thể chất "Đạt"
// Theo K2: Do có môn GDCD 4.0 (< 5.0) nên không đạt Khá; nhưng có 7 môn >= 5.0 và không môn nào < 3.5 nên xếp MỨC ĐẠT.
// Phân tích K3: So với Mức Tốt, bị hạ 2 mức (Tốt -> Khá -> Đạt) chỉ do duy nhất môn GDCD 4.0 làm hạ mức.
// Kỳ vọng K3: Được điều chỉnh lên mức liền kề của Đạt -> MỨC KHÁ ('KHA').
// -------------------------------------------------------------------------------------------------
console.log('--- TEST 1: Đủ chuẩn Tốt, 1 môn GDCD 4.0 làm giảm xuống Đạt -> Điều chỉnh lên MỨC KHÁ ---');
const rec1 = createRecord('student_t1', 'final_hk1', [
  { name: 'Toán', score: 8.5 },
  { name: 'Ngữ văn', score: 8.0 },
  { name: 'Tiếng Anh', score: 8.2 },
  { name: 'Khoa học tự nhiên', score: 8.0 },
  { name: 'Lịch sử và Địa lí', score: 8.0 },
  { name: 'Tin học', score: 7.0 },
  { name: 'Công nghệ', score: 6.8 },
  { name: 'Giáo dục công dân', score: 4.0 }, // Duy nhất 1 môn < 6.5 và < 5.0
  { name: 'Giáo dục thể chất', mode: 'COMMENT_ONLY', qual: 'Đạt' }
]);
const res1 = academicService.evaluateStudentTT43(rec1);
console.log('  Kết quả Test 1:', { tier: res1.tier, label: res1.label, reason: res1.reason });
assert('Test 1: Tier sau điều chỉnh phải là KHA', res1.tier === 'KHA');
assert('Test 1: Label sau điều chỉnh phải là "Mức Khá"', res1.label === 'Mức Khá');
assert('Test 1: Phải có lý do điều chỉnh viện dẫn K3 Đ9 TT43', Boolean(res1.reason && res1.reason.includes('K3 Đ9 TT43')));

// -------------------------------------------------------------------------------------------------
// TÌNH HUỐNG 2: Đủ chuẩn Tốt nhưng chỉ 1 môn khiến kết quả giảm xuống Chưa đạt (giảm 3 mức) -> Lên Đạt
// Chi tiết điểm:
// - 5 môn >= 8.0: Toán 8.5, Văn 8.0, Anh 8.2, KHTN 8.0, Sử Địa 8.0
// - 2 môn >= 6.5: Tin học 7.0, Công nghệ 6.8
// - Duy nhất 1 môn < 3.5: GDCD 3.0
// - Môn nhận xét: Thể chất "Đạt"
// Theo K2: Do có môn GDCD 3.0 (< 3.5) nên bị loại khỏi Mức Đạt -> Xếp MỨC CHƯA ĐẠT.
// Phân tích K3: So với Mức Tốt, bị hạ 3 mức (Tốt -> Khá -> Đạt -> Chưa đạt) chỉ do duy nhất môn GDCD 3.0 làm hạ mức.
// Kỳ vọng K3: Được điều chỉnh lên mức liền kề của Chưa đạt -> MỨC ĐẠT ('DAT').
// -------------------------------------------------------------------------------------------------
console.log('\n--- TEST 2: Đủ chuẩn Tốt, 1 môn GDCD 3.0 (< 3.5) làm giảm xuống Chưa đạt -> Điều chỉnh lên MỨC ĐẠT ---');
const rec2 = createRecord('student_t2', 'final_hk1', [
  { name: 'Toán', score: 8.5 },
  { name: 'Ngữ văn', score: 8.0 },
  { name: 'Tiếng Anh', score: 8.2 },
  { name: 'Khoa học tự nhiên', score: 8.0 },
  { name: 'Lịch sử và Địa lí', score: 8.0 },
  { name: 'Tin học', score: 7.0 },
  { name: 'Công nghệ', score: 6.8 },
  { name: 'Giáo dục công dân', score: 3.0 }, // Duy nhất 1 môn < 3.5
  { name: 'Giáo dục thể chất', mode: 'COMMENT_ONLY', qual: 'Đạt' }
]);
const res2 = academicService.evaluateStudentTT43(rec2);
console.log('  Kết quả Test 2:', { tier: res2.tier, label: res2.label, reason: res2.reason });
assert('Test 2: Tier sau điều chỉnh phải là DAT', res2.tier === 'DAT');
assert('Test 2: Label sau điều chỉnh phải là "Mức Đạt"', res2.label === 'Mức Đạt');
assert('Test 2: Phải có lý do điều chỉnh viện dẫn K3 Đ9 TT43', Boolean(res2.reason && res2.reason.includes('K3 Đ9 TT43')));

// -------------------------------------------------------------------------------------------------
// TÌNH HUỐNG 3: Đủ chuẩn Khá nhưng chỉ 1 môn khiến kết quả giảm xuống Chưa đạt (giảm 2 mức) -> Lên Đạt
// Chi tiết điểm:
// - 5 môn >= 6.5: Toán 7.5, Văn 7.0, Anh 6.8, KHTN 6.5, Sử Địa 6.5
// - 2 môn >= 5.0: Tin học 5.5, Công nghệ 5.0
// - Duy nhất 1 môn < 3.5: GDCD 3.0
// - Môn nhận xét: Thể chất "Đạt"
// Theo K2: Do có môn GDCD 3.0 (< 3.5) nên bị loại khỏi Mức Đạt -> Xếp MỨC CHƯA ĐẠT.
// Phân tích K3: So với Mức Khá, bị hạ 2 mức (Khá -> Đạt -> Chưa đạt) chỉ do duy nhất môn GDCD 3.0 làm hạ mức.
// Kỳ vọng K3: Được điều chỉnh lên mức liền kề của Chưa đạt -> MỨC ĐẠT ('DAT').
// -------------------------------------------------------------------------------------------------
console.log('\n--- TEST 3: Đủ chuẩn Khá, 1 môn GDCD 3.0 (< 3.5) làm giảm xuống Chưa đạt -> Điều chỉnh lên MỨC ĐẠT ---');
const rec3 = createRecord('student_t3', 'final_hk1', [
  { name: 'Toán', score: 7.5 },
  { name: 'Ngữ văn', score: 7.0 },
  { name: 'Tiếng Anh', score: 6.8 },
  { name: 'Khoa học tự nhiên', score: 6.5 },
  { name: 'Lịch sử và Địa lí', score: 6.5 },
  { name: 'Tin học', score: 5.5 },
  { name: 'Công nghệ', score: 5.0 },
  { name: 'Giáo dục công dân', score: 3.0 }, // Duy nhất 1 môn < 3.5
  { name: 'Giáo dục thể chất', mode: 'COMMENT_ONLY', qual: 'Đạt' }
]);
const res3 = academicService.evaluateStudentTT43(rec3);
console.log('  Kết quả Test 3:', { tier: res3.tier, label: res3.label, reason: res3.reason });
assert('Test 3: Tier sau điều chỉnh phải là DAT', res3.tier === 'DAT');
assert('Test 3: Label sau điều chỉnh phải là "Mức Đạt"', res3.label === 'Mức Đạt');
assert('Test 3: Phải có lý do điều chỉnh viện dẫn K3 Đ9 TT43', Boolean(res3.reason && res3.reason.includes('K3 Đ9 TT43')));

// -------------------------------------------------------------------------------------------------
// TÌNH HUỐNG 4: Có từ hai môn trở lên gây giảm mức -> KHÔNG ÁP DỤNG điều chỉnh Khoản 3
// 4A: 2 môn < 5.0 (Tin 4.5 và GDCD 4.0), các môn khác >= 8.0
// Theo K2: Xếp Mức Đạt.
// Vi phạm Mức Tốt: 2 môn (Tin, GDCD). Vi phạm Mức Khá: 2 môn (Tin, GDCD).
// Do có 2 môn gây giảm mức -> Không thỏa mãn "chỉ do duy nhất 01 môn" -> GIỮ NGUYÊN MỨC ĐẠT.
// -------------------------------------------------------------------------------------------------
console.log('\n--- TEST 4A: Có 2 môn < 5.0 (Tin 4.5, GDCD 4.0) -> KHÔNG điều chỉnh, giữ MỨC ĐẠT ---');
const rec4a = createRecord('student_t4a', 'final_hk1', [
  { name: 'Toán', score: 8.5 },
  { name: 'Ngữ văn', score: 8.0 },
  { name: 'Tiếng Anh', score: 8.2 },
  { name: 'Khoa học tự nhiên', score: 8.0 },
  { name: 'Lịch sử và Địa lí', score: 8.0 },
  { name: 'Tin học', score: 4.5 }, // Môn vi phạm 1
  { name: 'Công nghệ', score: 6.8 },
  { name: 'Giáo dục công dân', score: 4.0 }, // Môn vi phạm 2
  { name: 'Giáo dục thể chất', mode: 'COMMENT_ONLY', qual: 'Đạt' }
]);
const res4a = academicService.evaluateStudentTT43(rec4a);
console.log('  Kết quả Test 4A:', { tier: res4a.tier, label: res4a.label, reason: res4a.reason });
assert('Test 4A: Tier phải giữ nguyên DAT', res4a.tier === 'DAT');
assert('Test 4A: Label phải giữ nguyên "Mức Đạt"', res4a.label === 'Mức Đạt');
assert('Test 4A: Không có lý do điều chỉnh K3', !res4a.reason || !res4a.reason.includes('K3 Đ9 TT43'));

// 4B: 1 môn < 3.5 (GDCD 3.0) và 1 môn < 5.0 (Tin 4.5), các môn khác >= 8.0
// Theo K2: Xếp Mức Chưa đạt (do môn GDCD 3.0 < 3.5).
// Vi phạm Mức Khá: 2 môn (Tin, GDCD). Vi phạm Mức Tốt: 2 môn (Tin, GDCD).
// Do có 2 môn cùng vi phạm -> GIỮ NGUYÊN MỨC CHƯA ĐẠT.
console.log('\n--- TEST 4B: 1 môn 3.0 (< 3.5) và 1 môn 4.5 (< 5.0) -> KHÔNG điều chỉnh, giữ MỨC CHƯA ĐẠT ---');
const rec4b = createRecord('student_t4b', 'final_hk1', [
  { name: 'Toán', score: 8.5 },
  { name: 'Ngữ văn', score: 8.0 },
  { name: 'Tiếng Anh', score: 8.2 },
  { name: 'Khoa học tự nhiên', score: 8.0 },
  { name: 'Lịch sử và Địa lí', score: 8.0 },
  { name: 'Tin học', score: 4.5 }, // Vi phạm chuẩn Khá/Tốt
  { name: 'Công nghệ', score: 6.8 },
  { name: 'Giáo dục công dân', score: 3.0 }, // Vi phạm < 3.5
  { name: 'Giáo dục thể chất', mode: 'COMMENT_ONLY', qual: 'Đạt' }
]);
const res4b = academicService.evaluateStudentTT43(rec4b);
console.log('  Kết quả Test 4B:', { tier: res4b.tier, label: res4b.label });
assert('Test 4B: Tier phải giữ nguyên CHUA_DAT', res4b.tier === 'CHUA_DAT');
assert('Test 4B: Label phải giữ nguyên "Mức Chưa đạt"', res4b.label === 'Mức Chưa đạt');

// -------------------------------------------------------------------------------------------------
// TÌNH HUỐNG 5: Thiếu điểm hoặc thiếu kết quả môn nhận xét -> Giữ nguyên "Chưa đủ dữ liệu đánh giá"
// -------------------------------------------------------------------------------------------------
console.log('\n--- TEST 5: Thiếu điểm 1 môn -> Phải giữ trạng thái "Chưa đủ dữ liệu đánh giá" ---');
const rec5 = createRecord('student_t5', 'final_hk1', [
  { name: 'Toán', score: 8.5 },
  { name: 'Ngữ văn', score: 8.0 },
  { name: 'Tiếng Anh', score: 8.2 },
  { name: 'Khoa học tự nhiên', score: undefined }, // Thiếu điểm!
  { name: 'Giáo dục thể chất', mode: 'COMMENT_ONLY', qual: 'Đạt' }
]);
const res5 = academicService.evaluateStudentTT43(rec5);
console.log('  Kết quả Test 5:', { tier: res5.tier, label: res5.label, hasFullData: res5.hasFullData });
assert('Test 5: Tier phải là CHUA_DU_LIEU', res5.tier === 'CHUA_DU_LIEU');
assert('Test 5: hasFullData phải là false', res5.hasFullData === false);
assert('Test 5: Label là "Chưa đủ dữ liệu đánh giá"', res5.label === 'Chưa đủ dữ liệu đánh giá');

// -------------------------------------------------------------------------------------------------
// TÌNH HUỐNG 6: Trường hợp chỉ giảm 1 mức -> KHÔNG áp dụng Khoản 3 (giữ nguyên kết quả Khoản 2)
// 6A: Giảm từ Tốt xuống Khá: 5 môn >= 8.0, 2 môn >= 6.5, duy nhất 1 môn 6.0 (< 6.5 nhưng >= 5.0)
// Theo K2: Xếp Mức Khá. Mức Khá chỉ thấp hơn Mức Tốt 1 mức (không phải từ 2 mức trở lên).
// Kỳ vọng: Giữ nguyên MỨC KHÁ, không nâng lên Tốt.
// -------------------------------------------------------------------------------------------------
console.log('\n--- TEST 6A: Giảm 1 mức từ Tốt xuống Khá (môn 6.0) -> Giữ nguyên MỨC KHÁ ---');
const rec6a = createRecord('student_t6a', 'final_hk1', [
  { name: 'Toán', score: 8.5 },
  { name: 'Ngữ văn', score: 8.0 },
  { name: 'Tiếng Anh', score: 8.2 },
  { name: 'Khoa học tự nhiên', score: 8.0 },
  { name: 'Lịch sử và Địa lí', score: 8.0 },
  { name: 'Tin học', score: 7.0 },
  { name: 'Công nghệ', score: 6.8 },
  { name: 'Giáo dục công dân', score: 6.0 }, // Thuộc [5.0, 6.5) -> Đạt chuẩn Khá
  { name: 'Giáo dục thể chất', mode: 'COMMENT_ONLY', qual: 'Đạt' }
]);
const res6a = academicService.evaluateStudentTT43(rec6a);
console.log('  Kết quả Test 6A:', { tier: res6a.tier, label: res6a.label });
assert('Test 6A: Tier phải giữ nguyên KHA', res6a.tier === 'KHA');
assert('Test 6A: Label phải là "Mức Khá"', res6a.label === 'Mức Khá');

// 6B: Giảm 1 mức từ Khá xuống Đạt: 5 môn >= 6.5, 2 môn >= 5.0, duy nhất 1 môn 4.5 (< 5.0 nhưng >= 3.5)
// Theo K2: Xếp Mức Đạt. Mức Đạt chỉ thấp hơn Mức Khá 1 mức (không phải từ 2 mức trở lên).
// Kỳ vọng: Giữ nguyên MỨC ĐẠT, không nâng lên Khá.
console.log('\n--- TEST 6B: Giảm 1 mức từ Khá xuống Đạt (môn 4.5) -> Giữ nguyên MỨC ĐẠT ---');
const rec6b = createRecord('student_t6b', 'final_hk1', [
  { name: 'Toán', score: 7.5 },
  { name: 'Ngữ văn', score: 7.0 },
  { name: 'Tiếng Anh', score: 6.8 },
  { name: 'Khoa học tự nhiên', score: 6.5 },
  { name: 'Lịch sử và Địa lí', score: 6.5 },
  { name: 'Tin học', score: 5.5 },
  { name: 'Công nghệ', score: 5.0 },
  { name: 'Giáo dục công dân', score: 4.5 }, // Thuộc [3.5, 5.0) -> Đạt chuẩn Đạt
  { name: 'Giáo dục thể chất', mode: 'COMMENT_ONLY', qual: 'Đạt' }
]);
const res6b = academicService.evaluateStudentTT43(rec6b);
console.log('  Kết quả Test 6B:', { tier: res6b.tier, label: res6b.label });
assert('Test 6B: Tier phải giữ nguyên DAT', res6b.tier === 'DAT');
assert('Test 6B: Label phải là "Mức Đạt"', res6b.label === 'Mức Đạt');

console.log('\n======================================================================');
console.log(`KẾT QUẢ KIỂM THỬ: ${passed}/${total} TESTS PASSED 100%`);
console.log('======================================================================\n');
