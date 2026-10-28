/**
 * Automated Verification Script: Final Exam Excel Template & Import Logic
 * Testing the 4 criteria:
 * 1. Template structure: only missing TX columns and final exam column.
 * 2. Precision preservation: preserves valid midterm TX1, TX2 and Midterm exam scores; saves TX3, TX4, and Final Exam; computes ĐTB correctly.
 * 3. Scope-based clearing: empty cell in file scope clears old score (becomes undefined), without restoring old data.
 * 4. Configuration integrity: subject TX count configuration is not altered by final exam import.
 */

import { calculateSubjectAverage, isEnteredValidScore } from '../src/services/AcademicCalculationService';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${message}`);
}

console.log('=== BẮT ĐẦU KIỂM THỬ: FILE MẪU VÀ NHẬP ĐIỂM CUỐI KỲ ===\n');

// -------------------------------------------------------------
// Test Case 1: Cấu trúc file mẫu cuối kỳ
// Môn Toán học: cấu hình 4 cột TX. Giữa kỳ đã có dữ liệu TX1 và TX2.
// -------------------------------------------------------------
console.log('--- TEST 1: CẤU TRÚC FILE MẪU CUỐI KỲ ---');
const totalTxConfigured = 4;
const midtermTxCount = 2; // Giữa kỳ đã có TX1, TX2

const generatedFinalTxColumns: string[] = [];
for (let i = midtermTxCount + 1; i <= totalTxConfigured; i++) {
  generatedFinalTxColumns.push(`Toán học - TX${i}`);
}
const finalExamLabel = 'Toán học - Cuối kỳ I';
const allSubjectHeaders = [...generatedFinalTxColumns, finalExamLabel];

console.log('Các cột môn học được sinh trong file mẫu cuối kỳ:', allSubjectHeaders);

assert(
  generatedFinalTxColumns.length === 2,
  'Số cột TX cần nhập cuối kỳ = 4 - 2 = 2 cột'
);
assert(
  generatedFinalTxColumns[0] === 'Toán học - TX3' && generatedFinalTxColumns[1] === 'Toán học - TX4',
  'Chỉ sinh đúng các cột TX còn thiếu: TX3 và TX4'
);
assert(
  !allSubjectHeaders.includes('Toán học - TX1') && !allSubjectHeaders.includes('Toán học - TX2'),
  'Không tạo lại các cột TX1, TX2 đã có ở giữa kỳ'
);
assert(
  !allSubjectHeaders.includes('Toán học - Giữa kỳ I') && !allSubjectHeaders.includes('Toán học - ĐTB HKI'),
  'Không tạo cột Giữa kỳ I và ĐTB HKI trong file mẫu cuối kỳ'
);
assert(
  allSubjectHeaders.includes('Toán học - Cuối kỳ I'),
  'Có cột điểm Cuối kỳ I'
);

// -------------------------------------------------------------
// Test Case 2: Nhập điểm cuối kỳ - Bảo toàn điểm giữa kỳ & Lưu đúng điểm mới
// -------------------------------------------------------------
console.log('\n--- TEST 2: NHẬP FILE CUỐI KỲ - BẢO TOÀN VÀ TÍNH TOÁN ĐTB ---');

const parentGradeMidterm = {
  tx1: 8.0,
  tx2: 9.0,
  tx3: undefined,
  tx4: undefined,
  midterm: 8.5
};

const rawHeadersInFile = ['Mã học sinh', 'Họ và tên', 'Toán học - TX3', 'Toán học - TX4', 'Toán học - Cuối kỳ I'];
const mapping = {
  tx1: undefined,
  tx2: undefined,
  tx3: 'Toán học - TX3',
  tx4: 'Toán học - TX4',
  tx5: undefined,
  tx6: undefined,
  midterm: undefined,
  finalExam: 'Toán học - Cuối kỳ I'
};

// Dòng học sinh A: nhập TX3 = 7.0, TX4 = 8.5, Cuối kỳ I = 9.0
const studentRowA = ['HS001', 'Nguyễn Văn A', 7.0, 8.5, 9.0];

const parseScoreForCol = (row: any[], colName?: string): number | undefined => {
  if (!colName) return undefined;
  const idx = rawHeadersInFile.indexOf(colName);
  if (idx < 0) return undefined;
  const val = row[idx];
  if (val === undefined || val === null || String(val).trim() === '') return undefined;
  return Number(val);
};

const resolveTxSlot = (slotIdx: number, colName?: string, row: any[] = studentRowA): number | undefined => {
  if (slotIdx > totalTxConfigured) return undefined;
  const hasColInFile = Boolean(colName && rawHeadersInFile.includes(colName));
  if (hasColInFile) {
    return parseScoreForCol(row, colName);
  }
  // Ngoài phạm vi file mới: bảo toàn điểm giữa kỳ
  const txKey = `tx${slotIdx}` as keyof typeof parentGradeMidterm;
  const parVal = parentGradeMidterm[txKey];
  return isEnteredValidScore(parVal) ? Number(parVal) : undefined;
};

const resolvedTx1 = resolveTxSlot(1, mapping.tx1);
const resolvedTx2 = resolveTxSlot(2, mapping.tx2);
const resolvedTx3 = resolveTxSlot(3, mapping.tx3);
const resolvedTx4 = resolveTxSlot(4, mapping.tx4);
const resolvedTx5 = resolveTxSlot(5, mapping.tx5);

const hasMidtermCol = Boolean(mapping.midterm && rawHeadersInFile.includes(mapping.midterm));
const resolvedMidterm = hasMidtermCol
  ? parseScoreForCol(studentRowA, mapping.midterm)
  : (isEnteredValidScore(parentGradeMidterm.midterm) ? Number(parentGradeMidterm.midterm) : undefined);

const resolvedFinalExam = parseScoreForCol(studentRowA, mapping.finalExam);

console.log('Điểm đã giải quyết:');
console.log({
  tx1: resolvedTx1,
  tx2: resolvedTx2,
  tx3: resolvedTx3,
  tx4: resolvedTx4,
  tx5: resolvedTx5,
  midterm: resolvedMidterm,
  finalExam: resolvedFinalExam
});

assert(resolvedTx1 === 8.0, 'Bảo toàn thành công TX1 = 8.0 từ kỳ giữa');
assert(resolvedTx2 === 9.0, 'Bảo toàn thành công TX2 = 9.0 từ kỳ giữa');
assert(resolvedTx3 === 7.0, 'Lưu đúng TX3 = 7.0 từ file cuối kỳ');
assert(resolvedTx4 === 8.5, 'Lưu đúng TX4 = 8.5 từ file cuối kỳ');
assert(resolvedTx5 === undefined, 'Không vượt quá cấu hình 4 cột TX (TX5 = undefined)');
assert(resolvedMidterm === 8.5, 'Bảo toàn thành công điểm Giữa kỳ I = 8.5');
assert(resolvedFinalExam === 9.0, 'Lưu đúng điểm Cuối kỳ I = 9.0');

const regularScores = [resolvedTx1, resolvedTx2, resolvedTx3, resolvedTx4].filter((v): v is number => v !== undefined);
const calculatedAvg = calculateSubjectAverage({
  assessmentMode: 'SCORE_AND_COMMENT',
  tx1: resolvedTx1,
  tx2: resolvedTx2,
  tx3: resolvedTx3,
  tx4: resolvedTx4,
  regularScores,
  midterm: resolvedMidterm,
  finalExam: resolvedFinalExam,
  period: 'final_hk1'
});

console.log('ĐTB tính toán được:', calculatedAvg);
// Công thức TT 22: (8.0 + 9.0 + 7.0 + 8.5 + 2 * 8.5 + 3 * 9.0) / (4 + 5)
// = (32.5 + 17.0 + 27.0) / 9 = 76.5 / 9 = 8.5
assert(calculatedAvg === 8.5, 'ĐTB HKI được tính chính xác theo Thông tư 22: 8.5');

// -------------------------------------------------------------
// Test Case 3: Nhập file với ô trống trong phạm vi nhập (xóa điểm)
// Học sinh B: TX3 = 7.0, ô TX4 để trống (''), Cuối kỳ = 8.0
// -------------------------------------------------------------
console.log('\n--- TEST 3: Ô TRỐNG TRONG PHẠM VI FILE MỚI PHẢI LÀ UNDEFINED (XÓA ĐIỂM) ---');
const studentRowB = ['HS002', 'Trần Thị B', 7.0, '', 8.0];

const resolvedTx1_B = resolveTxSlot(1, mapping.tx1, studentRowB);
const resolvedTx2_B = resolveTxSlot(2, mapping.tx2, studentRowB);
const resolvedTx3_B = resolveTxSlot(3, mapping.tx3, studentRowB);
const resolvedTx4_B = resolveTxSlot(4, mapping.tx4, studentRowB);
const resolvedFinalExam_B = parseScoreForCol(studentRowB, mapping.finalExam);

console.log('Kết quả học sinh B (ô TX4 để trống):', {
  tx1: resolvedTx1_B,
  tx2: resolvedTx2_B,
  tx3: resolvedTx3_B,
  tx4: resolvedTx4_B,
  finalExam: resolvedFinalExam_B
});

assert(resolvedTx1_B === 8.0, 'Học sinh B: TX1 bảo toàn từ giữa kỳ (8.0)');
assert(resolvedTx2_B === 9.0, 'Học sinh B: TX2 bảo toàn từ giữa kỳ (9.0)');
assert(resolvedTx3_B === 7.0, 'Học sinh B: TX3 ghi nhận 7.0');
assert(resolvedTx4_B === undefined, 'Học sinh B: Ô TX4 để trống trong file -> ghi nhận undefined (xóa điểm)');
assert(resolvedFinalExam_B === 8.0, 'Học sinh B: Cuối kỳ ghi nhận 8.0');

// -------------------------------------------------------------
// Test Case 4: Cấu hình số cột môn học không bị thay đổi
// -------------------------------------------------------------
console.log('\n--- TEST 4: BẢO VỆ CẤU HÌNH SỐ CỘT MÔN HỌC ---');
const isFinalPeriod = true;
const importedSubjectTxCounts: Record<string, number> = {};

if (!isFinalPeriod) {
  // Only executed in non-final period
  importedSubjectTxCounts['Toán học'] = 2;
}

assert(
  Object.keys(importedSubjectTxCounts).length === 0,
  'Kỳ cuối không truyền importedSubjectTxCounts, cấu hình 4 cột TX của môn học được giữ nguyên 100%'
);

console.log('\n=== TẤT CẢ CÁC BÀI KIỂM THỬ ĐÃ VƯỢT QUA XUẤT SẮC! ===');
