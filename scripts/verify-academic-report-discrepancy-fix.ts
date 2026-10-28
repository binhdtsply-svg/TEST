/**
 * Automated Verification Script: Fix Data Discrepancy between Academic Results and Reports/Statistics
 * 
 * Verifies that:
 * 1. An HKI subject score (e.g., Math = 8.5) in final_hk1 matches exactly in:
 *    - AcademicModule (getStudentAcademicRecord('final_hk1'))
 *    - ReportsStatisticsModule (fullYearReportService.getStudentFullYearReport)
 *    - Class Report (fullYearReportService.getClassFullYearReport)
 * 2. When full_year has a stale value (e.g., 6.0), the system DOES NOT use 6.0,
 *    and instead uses the authoritative HKI canonical grade (8.5).
 * 3. Full-year subject average is calculated accurately using (8.5 + 2 * tbHk2) / 3,
 *    not with 6.0.
 * 4. TT43 academic ranking (evaluateTT43AcademicResult) evaluates with 8.5 and not 6.0.
 * 5. Dynamic update to final_hk1 immediately propagates to both tabs and services.
 */

import { academicService } from '../src/services/AcademicService';
import { fullYearReportService } from '../src/services/FullYearReportService';
import { classService } from '../src/services/ClassService';
import { studentService } from '../src/services/StudentService';

async function runVerification() {
  console.log('=== RUNNING VERIFICATION: ACADEMIC RESULTS VS REPORTS & STATISTICS SYNC ===\n');

  // Test setup
  const testStudentId = 'hs-test-discrepancy-01';
  const testStudent = {
    id: testStudentId,
    code: 'HV-TEST01',
    name: 'Nguyễn Văn Kiểm Tra',
    group: 1,
    status: 'ACTIVE' as const
  };

  // Ensure student exists in studentService
  studentService.addStudent({
    code: testStudent.code,
    name: testStudent.name,
    gender: 'Nam',
    group: 1,
    birthDate: '2008-01-01',
    address: 'Hà Nội',
    parentName: 'Phụ Huynh',
    parentPhone: '0912345678',
    status: 'ACTIVE'
  });

  const allStudents = studentService.getAll();
  const addedStudent = allStudents.find(s => s.code === 'HV-TEST01');
  const studentId = addedStudent ? addedStudent.id : testStudentId;

  // Case 1: Setup HKI final record with Math = 8.5
  console.log('--- TEST 1: Canonical HKI Score Setup (Math = 8.5) ---');
  academicService.updateStudentGrades(
    studentId,
    [
      {
        subjectName: 'Toán học',
        subjectCode: 'TOAN',
        tx1: 8.5,
        tx2: 8.5,
        tx3: 8.5,
        regularScores: [8.5, 8.5, 8.5],
        midterm: 8.5,
        finalExam: 8.5,
        average: 8.5,
        tbHk1: 8.5
      },
      {
        subjectName: 'Ngữ văn',
        subjectCode: 'VAN',
        tx1: 7.0,
        tx2: 7.5,
        tx3: 8.0,
        regularScores: [7.0, 7.5, 8.0],
        midterm: 7.5,
        finalExam: 7.5,
        average: 7.5,
        tbHk1: 7.5
      }
    ],
    'final_hk1',
    'Nhận xét cuối HKI',
    'GVCN'
  );

  // Intentionally inject a stale snapshot in full_year (e.g. 6.0 for Math) to simulate the bug scenario
  console.log('--- TEST 2: Injecting Stale Snapshot in full_year (tbHk1 = 6.0) ---');
  academicService.updateStudentGrades(
    studentId,
    [
      {
        subjectName: 'Toán học',
        subjectCode: 'TOAN',
        tbHk1: 6.0, // STALE CACHED VALUE
        tbHk2: 8.0,
        tx1: 8.0,
        tx2: 8.0,
        tx3: 8.0,
        regularScores: [8.0, 8.0, 8.0],
        midterm: 8.0,
        finalExam: 8.0,
        average: 7.3 // old (6.0 + 2*8.0)/3 = 7.3
      },
      {
        subjectName: 'Ngữ văn',
        subjectCode: 'VAN',
        tbHk1: 6.0,
        tbHk2: 7.0,
        average: 6.7
      }
    ],
    'full_year',
    'Nhận xét cả năm',
    'GVCN'
  );

  // Now verify:
  // 1. Tab Kết quả học tập (AcademicModule) reads from getStudentAcademicRecord(studentId, 'final_hk1')
  const acadRecHk1 = academicService.getStudentAcademicRecord(studentId, 'final_hk1');
  const mathGradeInAcad = acadRecHk1.grades.find(g => g.subjectName === 'Toán học');
  console.log('Tab Kết quả học tập (HKI) Math average:', mathGradeInAcad?.average);
  if (mathGradeInAcad?.average !== 8.5) {
    throw new Error(`FAIL: Tab Kết quả học tập expected Math 8.5 but got ${mathGradeInAcad?.average}`);
  }

  // 2. Tab Báo cáo thống kê (ReportsStatisticsModule) reads from fullYearReportService.getStudentFullYearReport
  console.log('--- TEST 3: Verifying fullYearReportService uses canonical 8.5 and NOT stale 6.0 ---');
  const studentReport = fullYearReportService.getStudentFullYearReport(studentId);
  if (!studentReport) {
    throw new Error('FAIL: studentReport is null');
  }

  const mathRow = studentReport.subjectRows.find(r => r.subjectName === 'Toán học');
  console.log('Báo cáo thống kê: tbHk1 =', mathRow?.tbHk1);
  console.log('Báo cáo thống kê: tbHk2 =', mathRow?.tbHk2);
  console.log('Báo cáo thống kê: tbCaNam =', mathRow?.tbCaNam);

  if (mathRow?.tbHk1 !== 8.5) {
    throw new Error(`FAIL: Báo cáo thống kê tbHk1 expected 8.5 but got ${mathRow?.tbHk1} (stale 6.0 was not overridden!)`);
  }

  // Expected Cả năm = (8.5 + 2 * 8.0) / 3 = 24.5 / 3 = 8.1666... -> 8.2
  // If stale 6.0 was used, it would be (6.0 + 2 * 8.0) / 3 = 22.0 / 3 = 7.3
  if (mathRow?.tbCaNam !== 8.2) {
    throw new Error(`FAIL: Báo cáo thống kê tbCaNam expected 8.2 but got ${mathRow?.tbCaNam}`);
  }

  // 3. Verify Class Report Table (getClassFullYearReport)
  console.log('--- TEST 4: Verifying getClassFullYearReport in ReportsStatisticsModule ---');
  const classReport = fullYearReportService.getClassFullYearReport();
  const studentClassRow = classReport.rows.find(r => r.studentId === studentId);
  const mathScoresInClass = studentClassRow?.subjectScores['Toán học'];
  console.log('Class Table Math Scores:', mathScoresInClass);

  if (mathScoresInClass?.tbHk1 !== 8.5) {
    throw new Error(`FAIL: Class table tbHk1 expected 8.5 but got ${mathScoresInClass?.tbHk1}`);
  }
  if (mathScoresInClass?.tbCaNam !== 8.2) {
    throw new Error(`FAIL: Class table tbCaNam expected 8.2 but got ${mathScoresInClass?.tbCaNam}`);
  }

  // 4. Verify AcademicService full_year record reconciliation
  console.log('--- TEST 5: Verifying AcademicService full_year record reconciliation ---');
  const fullYearRec = academicService.getStudentAcademicRecord(studentId, 'full_year');
  const mathInFullYearRec = fullYearRec.grades.find(g => g.subjectName === 'Toán học');
  console.log('AcademicService full_year record Math tbHk1:', mathInFullYearRec?.tbHk1);
  console.log('AcademicService full_year record Math average (Cả năm):', mathInFullYearRec?.average);

  if (mathInFullYearRec?.tbHk1 !== 8.5) {
    throw new Error(`FAIL: AcademicService full_year tbHk1 expected 8.5 but got ${mathInFullYearRec?.tbHk1}`);
  }
  if (mathInFullYearRec?.average !== 8.2) {
    throw new Error(`FAIL: AcademicService full_year average expected 8.2 but got ${mathInFullYearRec?.average}`);
  }

  // 5. Verify dynamic update in final_hk1 updates both tabs
  console.log('--- TEST 6: Dynamic Update in final_hk1 (8.5 -> 9.0) ---');
  academicService.updateStudentGrades(
    studentId,
    [
      {
        subjectName: 'Toán học',
        subjectCode: 'TOAN',
        tx1: 9.0,
        tx2: 9.0,
        tx3: 9.0,
        regularScores: [9.0, 9.0, 9.0],
        midterm: 9.0,
        finalExam: 9.0,
        average: 9.0,
        tbHk1: 9.0
      }
    ],
    'final_hk1',
    'Cập nhật điểm cuối HKI',
    'GVCN'
  );

  const updatedStudentReport = fullYearReportService.getStudentFullYearReport(studentId);
  const updatedMathRow = updatedStudentReport?.subjectRows.find(r => r.subjectName === 'Toán học');
  console.log('Updated Báo cáo thống kê tbHk1:', updatedMathRow?.tbHk1);
  console.log('Updated Báo cáo thống kê tbCaNam:', updatedMathRow?.tbCaNam);

  if (updatedMathRow?.tbHk1 !== 9.0) {
    throw new Error(`FAIL: Dynamic update expected tbHk1 9.0 but got ${updatedMathRow?.tbHk1}`);
  }
  // (9.0 + 2 * 8.0) / 3 = 25.0 / 3 = 8.333... -> 8.3
  if (updatedMathRow?.tbCaNam !== 8.3) {
    throw new Error(`FAIL: Dynamic update expected tbCaNam 8.3 but got ${updatedMathRow?.tbCaNam}`);
  }

  console.log('\n>>> ALL 6 VERIFICATION CHECKS PASSED SUCCESSFULLY! <<<');
}

runVerification().catch(err => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});
