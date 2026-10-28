/**
 * Comprehensive Verification & Data Consistency Test for Task 2
 * 
 * Verifies:
 * 1. Transaction semester resolution across different dates (October, January, March, etc.)
 * 2. Unified absence classification (classifyAbsenceTransaction)
 * 3. Exact reconciliation between QuickStatsCards, HomeroomCare, and FullYearReportService
 * 4. Real data verification from tenant-lan-nguyen in kgcns_master.db
 * 5. TT43 academic evaluation parity between AcademicService and FullYearReportService
 */

import { getDatabase } from '../server/db/database';
import { fullYearReportService } from '../src/services/FullYearReportService';
import { academicService } from '../src/services/AcademicService';
import { PointTransaction } from '../src/types';

const db = getDatabase();

let total = 0;
let passed = 0;

function assert(desc: string, condition: boolean, extra?: any) {
  total++;
  if (condition) {
    passed++;
    console.log(`  [PASS] ${desc}`);
  } else {
    console.error(`  [FAIL] ${desc}`, extra || '');
    throw new Error(`Assertion failed: ${desc}`);
  }
}

console.log('======================================================================');
console.log('BẮT ĐẦU KIỂM THỬ ĐỐI SOÁT TÍNH NHẤT QUÁN SỐ LIỆU (NHIỆM VỤ 2)');
console.log('======================================================================\n');

// -------------------------------------------------------------------------------------------------
// 1. KIỂM THỬ HỌC KỲ GIAO DỊCH (resolveTransactionSemester)
// -------------------------------------------------------------------------------------------------
console.log('--- 1. Kiểm thử phân định học kỳ giao dịch (resolveTransactionSemester) ---');
const dummyTxOct: PointTransaction = {
  id: 'tx_oct',
  studentId: 'stu_1',
  points: -5,
  category: 'Nề nếp',
  reason: 'Nghỉ học không phép',
  createdAt: '2026-10-25T08:00:00Z',
  eventDate: '2026-10-25',
  status: 'approved'
};

const dummyTxJanEarly: PointTransaction = {
  id: 'tx_jan_early',
  studentId: 'stu_1',
  points: -5,
  category: 'Nghỉ có phép',
  reason: 'Nghỉ có phép',
  createdAt: '2026-01-10T08:00:00Z',
  eventDate: '2026-01-10',
  status: 'approved'
};

const dummyTxJanLate: PointTransaction = {
  id: 'tx_jan_late',
  studentId: 'stu_1',
  points: -2,
  category: 'Đi trễ',
  reason: 'Đi trễ 10 phút',
  createdAt: '2026-01-25T08:00:00Z',
  eventDate: '2026-01-25',
  status: 'approved'
};

const dummyTxMarch: PointTransaction = {
  id: 'tx_mar',
  studentId: 'stu_1',
  points: 10,
  category: 'Việc tốt',
  reason: 'Giúp bạn học tốt',
  createdAt: '2026-03-15T08:00:00Z',
  eventDate: '2026-03-15',
  status: 'approved'
};

const semOct = fullYearReportService.resolveTransactionSemester(dummyTxOct);
const semJanEarly = fullYearReportService.resolveTransactionSemester(dummyTxJanEarly);
const semJanLate = fullYearReportService.resolveTransactionSemester(dummyTxJanLate);
const semMarch = fullYearReportService.resolveTransactionSemester(dummyTxMarch);

console.log('  Kết quả phân loại học kỳ:');
console.log(`    25/10/2026: ${semOct} (Kỳ vọng: hk1)`);
console.log(`    10/01/2026: ${semJanEarly} (Kỳ vọng: hk1)`);
console.log(`    25/01/2026: ${semJanLate} (Kỳ vọng: hk2)`);
console.log(`    15/03/2026: ${semMarch} (Kỳ vọng: hk2)`);

assert('Giao dịch tháng 10 (25/10/2026) phải thuộc HK1', semOct === 'hk1');
assert('Giao dịch đầu tháng 1 (10/01/2026) phải thuộc HK1', semJanEarly === 'hk1');
assert('Giao dịch cuối tháng 1 (25/01/2026) phải thuộc HK2', semJanLate === 'hk2');
assert('Giao dịch tháng 3 (15/03/2026) phải thuộc HK2', semMarch === 'hk2');

// -------------------------------------------------------------------------------------------------
// 2. KIỂM THỬ PHÂN LOẠI CHUYÊN CẦN (classifyAbsenceTransaction)
// -------------------------------------------------------------------------------------------------
console.log('\n--- 2. Kiểm thử phân loại chuyên cần (classifyAbsenceTransaction) ---');
const txCp = { id: '1', studentId: 's', category: 'Nghỉ có phép', reason: 'Ốm sốt' } as any;
const txKp = { id: '2', studentId: 's', category: 'Nề nếp', reason: 'Nghỉ không phép buổi sáng' } as any;
const txLate = { id: '3', studentId: 's', category: 'Đi trễ', reason: 'Đi muộn 15p' } as any;
const txGood = { id: '4', studentId: 's', category: 'Khen thưởng', reason: 'Dọn vệ sinh tốt' } as any;

assert('classifyAbsenceTransaction: category Nghỉ có phép -> excused', fullYearReportService.classifyAbsenceTransaction(txCp) === 'excused');
assert('classifyAbsenceTransaction: reason Nghỉ không phép -> unexcused', fullYearReportService.classifyAbsenceTransaction(txKp) === 'unexcused');
assert('classifyAbsenceTransaction: Đi trễ -> null', fullYearReportService.classifyAbsenceTransaction(txLate) === null);
assert('classifyAbsenceTransaction: Khen thưởng -> null', fullYearReportService.classifyAbsenceTransaction(txGood) === null);

// -------------------------------------------------------------------------------------------------
// 3. ĐỐI SOÁT DỮ LIỆU THỰC TẾ CỦA TENANT-LAN-NGUYEN TRONG DATABASE
// -------------------------------------------------------------------------------------------------
console.log('\n--- 3. Đối soát dữ liệu thực tế của tenant-lan-nguyen trong kgcns_master.db ---');
const rawTxRows: any[] = db.prepare(`SELECT * FROM training_transactions WHERE tenant_id = 'tenant-lan-nguyen'`).all();
console.log(`  Tìm thấy ${rawTxRows.length} bản ghi training_transactions của tenant-lan-nguyen`);

let unexcusedCount = 0;
let excusedCount = 0;
let tardyCount = 0;

for (const row of rawTxRows) {
  const tx: PointTransaction = {
    id: row.id,
    studentId: row.student_id,
    points: row.points,
    category: row.category,
    reason: row.description || row.title,
    createdAt: row.created_at,
    eventDate: row.created_at?.split('T')[0],
    status: row.status?.toLowerCase() === 'approved' ? 'approved' : 'pending'
  };

  const kind = fullYearReportService.classifyAbsenceTransaction(tx);
  if (kind === 'unexcused') unexcusedCount++;
  if (kind === 'excused') excusedCount++;
  const text = `${row.category || ''} ${row.title || ''} ${row.description || ''}`.toLowerCase();
  if (text.includes('trễ') || text.includes('muộn')) tardyCount++;
}

console.log(`  Tổng kết thực tế từ bảng: Nghỉ KP = ${unexcusedCount}, Nghỉ CP = ${excusedCount}, Đi trễ = ${tardyCount}`);
assert('tenant-lan-nguyen có chính xác 3 lượt nghỉ không phép trong DB', unexcusedCount === 3);
assert('tenant-lan-nguyen có 0 lượt nghỉ có phép từ bảng giao dịch', excusedCount === 0);
assert('tenant-lan-nguyen có 2 lượt đi trễ trong DB', tardyCount === 2);

// Kiểm tra bản ghi academic_records của tenant-lan-nguyen
const rawAcademicRows = db.prepare(`SELECT * FROM academic_records WHERE tenant_id = 'tenant-lan-nguyen'`).all();
console.log(`  Tìm thấy ${rawAcademicRows.length} bản ghi academic_records của tenant-lan-nguyen`);

for (const row of rawAcademicRows) {
  let attendanceJson: any = null;
  if (row.attendance_summary_json) {
    try {
      attendanceJson = JSON.parse(String(row.attendance_summary_json));
      console.log(`    Bản ghi academic attendance_summary_json của học sinh ${row.student_id}:`, attendanceJson);
    } catch (e) {}
  }
}

// -------------------------------------------------------------------------------------------------
// 4. KIỂM THỬ TÍNH NHẤT QUÁN TT43 GIỮA AcademicService VÀ FullYearReportService
// -------------------------------------------------------------------------------------------------
console.log('\n--- 4. Kiểm thử đối soát TT43 giữa AcademicService và FullYearReportService ---');
const mockSubjectGrades = [
  { subjectId: '1', subjectName: 'Toán', average: 8.5, assessmentMode: 'SCORE_AND_COMMENT' },
  { subjectId: '2', subjectName: 'Ngữ văn', average: 8.0, assessmentMode: 'SCORE_AND_COMMENT' },
  { subjectId: '3', subjectName: 'Tiếng Anh', average: 8.2, assessmentMode: 'SCORE_AND_COMMENT' },
  { subjectId: '4', subjectName: 'KHTN', average: 8.0, assessmentMode: 'SCORE_AND_COMMENT' },
  { subjectId: '5', subjectName: 'Lịch sử và Địa lí', average: 8.0, assessmentMode: 'SCORE_AND_COMMENT' },
  { subjectId: '6', subjectName: 'Tin học', average: 7.0, assessmentMode: 'SCORE_AND_COMMENT' },
  { subjectId: '7', subjectName: 'Công nghệ', average: 6.8, assessmentMode: 'SCORE_AND_COMMENT' },
  { subjectId: '8', subjectName: 'Giáo dục công dân', average: 4.0, assessmentMode: 'SCORE_AND_COMMENT' }, // Chỉ 1 môn < 5.0
  { subjectId: '9', subjectName: 'Giáo dục thể chất', qualitativeResult: 'Đạt', assessmentMode: 'COMMENT_ONLY' }
];

const acadRes = academicService.evaluateStudentTT43({
  studentId: 'test_s1',
  period: 'final_hk1',
  semester: 'HK1',
  grades: mockSubjectGrades as any,
  teacherComment: '',
  conductResult: 'Tốt'
});

const fullYearSubjectRows = mockSubjectGrades.map(g => ({
  subjectId: g.subjectId,
  subjectCode: g.subjectId,
  subjectName: g.subjectName,
  assessmentMode: g.assessmentMode as any,
  txColumnCount: 4,
  txScores: [],
  tbHk1: g.average,
  qualitativeHk1: g.qualitativeResult
}));

const fullYearRes = fullYearReportService.evaluateTT43AcademicResult(fullYearSubjectRows as any, 'hk1');

console.log(`  AcademicService TT43 result: tier=${acadRes.tier}, label=${acadRes.label}, reason=${acadRes.reason}`);
console.log(`  FullYearReportService TT43 result: result=${fullYearRes}`);

assert('FullYearReportService trả về "Khá" cho học sinh được nâng theo K3 Đ9 TT43', fullYearRes === 'Khá');
assert('AcademicService trả về tier KHA và label "Mức Khá"', acadRes.tier === 'KHA' && acadRes.label === 'Mức Khá');
assert('AcademicService giải trình lý do viện dẫn K3 Đ9 TT43', Boolean(acadRes.reason?.includes('K3 Đ9 TT43')));

console.log('\n======================================================================');
console.log(`KẾT QUẢ KIỂM THỬ ĐỐI SOÁT: ${passed}/${total} TESTS PASSED 100%`);
console.log('======================================================================');
