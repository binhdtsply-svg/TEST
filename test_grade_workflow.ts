import { calculateSubjectAverage, isEnteredValidScore } from './src/services/AcademicCalculationService';
import { academicService } from './src/services/AcademicService';
import { studentService } from './src/services/StudentService';

console.log('--- TEST 1: EMPTY CELLS VS ZERO IN AVERAGE CALCULATION ---');
// Student has 2 regular scores (8.0, 7.0) and TX3 is empty (undefined)
// Midterm = 8.0, FinalExam = 9.0
const avgWithEmptyTx = calculateSubjectAverage({
  tx1: 8.0,
  tx2: 7.0,
  tx3: undefined,
  midterm: 8.0,
  finalExam: 9.0,
  period: 'final_hk1'
});
// Numerator: 8.0*1 + 7.0*1 + 8.0*2 + 9.0*3 = 8 + 7 + 16 + 27 = 58
// Denominator: 1 + 1 + 2 + 3 = 7
// Expected: 58 / 7 = 8.2857... -> 8.3
console.log('Average with empty TX3:', avgWithEmptyTx, 'Expected: 8.3');
if (avgWithEmptyTx !== 8.3) {
  throw new Error(`FAIL: Expected 8.3 but got ${avgWithEmptyTx}`);
}

// Student enters genuine 0 for TX3
const avgWithZeroTx = calculateSubjectAverage({
  tx1: 8.0,
  tx2: 7.0,
  tx3: 0,
  midterm: 8.0,
  finalExam: 9.0,
  period: 'final_hk1'
});
// Numerator: 8*1 + 7*1 + 0*1 + 8*2 + 9*3 = 58
// Denominator: 1 + 1 + 1 + 2 + 3 = 8
// Expected: 58 / 8 = 7.25 -> 7.3
console.log('Average with genuine 0 in TX3:', avgWithZeroTx, 'Expected: 7.3');
if (avgWithZeroTx !== 7.3) {
  throw new Error(`FAIL: Expected 7.3 but got ${avgWithZeroTx}`);
}

console.log('--- TEST 2: MIDTERM PRESERVATION IN FINAL_HK1 ---');
// Setup a student in midterm_hk1 with known midterm and TX scores
const students = studentService.getAll();
const testStudent = students[0];
console.log('Test student:', testStudent.id, testStudent.fullName);

// Save midterm_hk1 scores: Math has tx1=8, tx2=9, midterm=8.5
academicService.updateStudentGrades(
  testStudent.id,
  [
    {
      subjectName: 'Toán học',
      tx1: 8,
      tx2: 9,
      midterm: 8.5,
      finalExam: undefined,
      comment: 'Tốt'
    }
  ],
  'midterm_hk1'
);

// Now query final_hk1 record for this student
const recFinalHk1 = academicService.getStudentAcademicRecord(testStudent.id, 'final_hk1');
const mathFinal1 = recFinalHk1.grades.find(g => g.subjectName === 'Toán học');
console.log('Math in final_hk1:', mathFinal1);

if (mathFinal1?.midterm !== 8.5) {
  throw new Error(`FAIL: Midterm score not preserved! Expected 8.5, got ${mathFinal1?.midterm}`);
}
if (mathFinal1?.tx1 !== 8 || mathFinal1?.tx2 !== 9) {
  throw new Error(`FAIL: Regular scores not preserved! Expected tx1=8, tx2=9, got tx1=${mathFinal1?.tx1}, tx2=${mathFinal1?.tx2}`);
}

// Now simulate GVCN entering missing TX3 (10) and finalExam (9) in final_hk1
academicService.updateStudentGrades(
  testStudent.id,
  [
    {
      ...mathFinal1,
      tx3: 10,
      finalExam: 9
    }
  ],
  'final_hk1'
);

const recFinalHk1AfterSave = academicService.getStudentAcademicRecord(testStudent.id, 'final_hk1');
const mathSaved = recFinalHk1AfterSave.grades.find(g => g.subjectName === 'Toán học');
console.log('Math after final_hk1 entry:', mathSaved);

if (mathSaved?.midterm !== 8.5) {
  throw new Error(`FAIL: Midterm overwritten! Expected 8.5, got ${mathSaved?.midterm}`);
}
if (mathSaved?.tx1 !== 8 || mathSaved?.tx2 !== 9 || mathSaved?.tx3 !== 10) {
  throw new Error(`FAIL: TX scores mismatch! Expected 8, 9, 10, got ${mathSaved?.tx1}, ${mathSaved?.tx2}, ${mathSaved?.tx3}`);
}
if (mathSaved?.finalExam !== 9) {
  throw new Error(`FAIL: Final exam mismatch! Expected 9, got ${mathSaved?.finalExam}`);
}

// Numerator: 8*1 + 9*1 + 10*1 + 8.5*2 + 9*3 = 8 + 9 + 10 + 17 + 27 = 71
// Denominator: 1 + 1 + 1 + 2 + 3 = 8
// Expected average: 71 / 8 = 8.875 -> 8.9
console.log('Calculated average in final_hk1:', mathSaved?.average, 'Expected: 8.9');
if (mathSaved?.average !== 8.9) {
  throw new Error(`FAIL: Expected average 8.9, got ${mathSaved?.average}`);
}

// Verify midterm_hk1 is STILL 8.5 and unchanged
const recMidterm1Check = academicService.getStudentAcademicRecord(testStudent.id, 'midterm_hk1');
const mathMidtermCheck = recMidterm1Check.grades.find(g => g.subjectName === 'Toán học');
if (mathMidtermCheck?.midterm !== 8.5 || mathMidtermCheck?.finalExam !== undefined) {
  throw new Error('FAIL: midterm_hk1 was modified!');
}

console.log('--- TEST 3: NO BLEEDING TO HK2 ---');
// Verify final_hk2 does NOT inherit HKI midterm
const recHk2 = academicService.getStudentAcademicRecord(testStudent.id, 'final_hk2');
const mathHk2 = recHk2.grades.find(g => g.subjectName === 'Toán học');
console.log('Math in final_hk2 (should NOT have HKI midterm):', mathHk2?.midterm);
if (mathHk2?.midterm === 8.5) {
  throw new Error('FAIL: HKI midterm bled into HKII!');
}

console.log('ALL TESTS PASSED SUCCESSFULLY! 100% PRESERVATION & ACCURACY VERIFIED.');
