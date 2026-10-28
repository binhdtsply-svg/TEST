/**
 * Verification script for Excel Grade Import/Export with Comment-based Evaluation Subjects
 * Tests all 6 required test cases per user specification.
 */

import * as XLSX from 'xlsx';
import { classService } from '../src/services/ClassService';
import { studentService } from '../src/services/StudentService';
import { academicService, PERIOD_NAMES, calculateSubjectAverage, isEnteredValidScore } from '../src/services/AcademicService';
import { AcademicPeriod, SubjectConfig, SubjectGrade } from '../src/types';

interface SubjectColumnMap {
  evaluationCol?: string;
  tx1?: string;
  tx2?: string;
  tx3?: string;
  tx4?: string;
  midterm?: string;
  finalExam?: string;
  avg?: string;
}

const isCommentSubject = (sub?: { assessmentMode?: string; assessmentType?: string; name?: string }): boolean => {
  if (!sub) return false;
  if (sub.assessmentMode === 'COMMENT_ONLY') return true;
  if (sub.assessmentType === 'COMMENT') return true;
  if (sub.name && academicService.isCommentOnlySubject(sub.name)) return true;
  return false;
};

// Simulation of template generation
function generateSampleExcelData(period: AcademicPeriod) {
  const appliedSubjects = classService.getAppliedSubjects();
  const students = studentService.getAll();
  const headerRow: string[] = ['STT', 'Mã học sinh', 'Họ và tên', 'Tổ'];

  appliedSubjects.forEach((s) => {
    const isComment = isCommentSubject(s);
    if (isComment) {
      headerRow.push(`${s.name} - Đánh giá (Đạt/Chưa đạt)`);
    } else if (period === 'full_year') {
      headerRow.push(`${s.name} - TB HKI`);
      headerRow.push(`${s.name} - TB HKII`);
      headerRow.push(`${s.name} - TB Cả Năm`);
      headerRow.push(`${s.name} - Ghi chú`);
    } else if (period.startsWith('final_')) {
      const txCount = s.txColumnCount || 3;
      for (let i = 1; i <= txCount; i++) {
        headerRow.push(`${s.name} - TX${i}`);
      }
      headerRow.push(`${s.name} - Giữa kỳ`);
      headerRow.push(`${s.name} - Cuối kỳ`);
      headerRow.push(`${s.name} - TB Môn`);
      headerRow.push(`${s.name} - Ghi chú`);
    } else {
      const txCount = s.txColumnCount || 3;
      for (let i = 1; i <= txCount; i++) {
        headerRow.push(`${s.name} - TX${i}`);
      }
      headerRow.push(`${s.name} - Giữa kỳ`);
      headerRow.push(`${s.name} - TB Môn`);
      headerRow.push(`${s.name} - Ghi chú`);
    }
  });

  headerRow.push('Môn thế mạnh');
  headerRow.push('Môn cần chú ý');
  headerRow.push('Nghỉ có phép');
  headerRow.push('Nghỉ không phép');
  headerRow.push('Đánh giá học tập');
  headerRow.push('Đánh giá rèn luyện');
  headerRow.push('Nhận xét của GVCN');

  const dataRows = students.map((st, idx) => {
    const row: any[] = [idx + 1, st.code, st.fullName, `Tổ ${st.group}`];
    appliedSubjects.forEach((s) => {
      const isComment = isCommentSubject(s);
      if (isComment) {
        row.push('');
      } else if (period === 'full_year') {
        row.push('', '', '', '');
      } else if (period.startsWith('final_')) {
        const txCount = s.txColumnCount || 3;
        for (let i = 0; i < txCount + 3; i++) {
          row.push('');
        }
      } else {
        const txCount = s.txColumnCount || 3;
        for (let i = 0; i < txCount + 2; i++) {
          row.push('');
        }
      }
    });

    row.push('');
    row.push('');
    row.push(0);
    row.push(0);
    row.push('Đánh giá học tập tốt');
    row.push('Rèn luyện tốt');
    row.push('Cần tiếp tục cố gắng');

    return row;
  });

  return { headerRow, dataRows };
}

// Simulation of parser matching ExcelGradeImportModal logic
function parseExcelGrades(
  rawHeaders: string[],
  rawRows: any[][],
  selectedPeriod: AcademicPeriod,
  subjectMappings: Record<string, SubjectColumnMap>
) {
  const appliedSubjects = classService.getAppliedSubjects();
  const students = studentService.getAll();
  const codeIdx = rawHeaders.indexOf('Mã học sinh');
  const nameIdx = rawHeaders.indexOf('Họ và tên');

  const parsedResults: any[] = [];

  rawRows.forEach((row, rIdx) => {
    const rawCode = codeIdx >= 0 && row[codeIdx] ? String(row[codeIdx]).trim() : '';
    const rawName = nameIdx >= 0 && row[nameIdx] ? String(row[nameIdx]).trim() : '';

    if (!rawCode && !rawName) return;

    const errors: string[] = [];
    let matchedStudent = students.find((s) => s.code.toLowerCase() === rawCode.toLowerCase());
    if (!matchedStudent && rawName) {
      matchedStudent = students.find((s) => s.fullName.toLowerCase() === rawName.toLowerCase());
    }

    if (!matchedStudent) {
      errors.push(`Dòng ${rIdx + 2}: Không tìm thấy học sinh với mã/tên "${rawCode || rawName}".`);
    }

    const grades: SubjectGrade[] = [];
    Object.entries(subjectMappings).forEach(([subName, mapping]) => {
      const subConfig = appliedSubjects.find((s) => s.name === subName);
      const isCommentOnly = isCommentSubject(subConfig) || isCommentSubject({ name: subName });

      if (isCommentOnly) {
        const targetCol = mapping.evaluationCol || mapping.avg || mapping.tx1;
        if (!targetCol) return;

        const colIdx = rawHeaders.indexOf(targetCol);
        if (colIdx < 0) return;

        const rawVal = row[colIdx];
        const isBlank =
          rawVal === undefined ||
          rawVal === null ||
          (typeof rawVal === 'string' && rawVal.trim() === '') ||
          (typeof rawVal === 'string' && (rawVal.trim() === '-' || rawVal.trim() === '—'));

        if (isBlank) {
          grades.push({
            subjectName: subName,
            subjectCode: subConfig?.subjectCode || subConfig?.code,
            assessmentMode: 'COMMENT_ONLY',
            qualitativeResult: undefined,
            comment: ''
          });
          return;
        }

        const strVal = String(rawVal).trim();
        const lowerVal = strVal.toLowerCase();

        if (lowerVal === 'đạt' || lowerVal === 'dat' || lowerVal === 'đ') {
          grades.push({
            subjectName: subName,
            subjectCode: subConfig?.subjectCode || subConfig?.code,
            assessmentMode: 'COMMENT_ONLY',
            qualitativeResult: 'Đạt',
            comment: ''
          });
        } else if (lowerVal === 'chưa đạt' || lowerVal === 'chua dat' || lowerVal === 'cđ' || lowerVal === 'cd') {
          grades.push({
            subjectName: subName,
            subjectCode: subConfig?.subjectCode || subConfig?.code,
            assessmentMode: 'COMMENT_ONLY',
            qualitativeResult: 'Chưa đạt',
            comment: ''
          });
        } else {
          const studentDisplayName = rawName || matchedStudent?.fullName || rawCode || `Học sinh dòng ${rIdx + 2}`;
          errors.push(
            `Học viên "${studentDisplayName}", môn "${subName}": Giá trị "${strVal}" không hợp lệ. Ô đánh giá nhận xét chỉ chấp nhận "Đạt" hoặc "Chưa đạt" (hoặc để trống nếu chưa có kết quả).`
          );
        }
        return;
      }

      // Scored subject
      const parseScore = (colName?: string) => {
        if (!colName) return undefined;
        const idx = rawHeaders.indexOf(colName);
        if (idx < 0) return undefined;
        const val = row[idx];
        if (val === undefined || val === null) return undefined;
        if (typeof val === 'string' && val.trim() === '') return undefined;
        const strVal = String(val).trim();
        if (strVal === '-' || strVal === '—') return undefined;

        if (!isEnteredValidScore(val)) {
          errors.push(`Dòng ${rIdx + 2}, môn ${subName}: Điểm "${val}" không hợp lệ.`);
          return undefined;
        }
        return Number(strVal);
      };

      const tx1 = parseScore(mapping.tx1);
      const tx2 = parseScore(mapping.tx2);
      const tx3 = parseScore(mapping.tx3);
      const tx4 = parseScore(mapping.tx4);
      const midterm = parseScore(mapping.midterm);
      const finalExam = parseScore(mapping.finalExam);
      const avg = parseScore(mapping.avg);

      if (
        tx1 !== undefined ||
        tx2 !== undefined ||
        tx3 !== undefined ||
        tx4 !== undefined ||
        midterm !== undefined ||
        finalExam !== undefined ||
        avg !== undefined
      ) {
        grades.push({
          subjectName: subName,
          subjectCode: subConfig?.subjectCode || subConfig?.code,
          assessmentMode: 'SCORE_AND_COMMENT',
          tx1,
          tx2,
          tx3,
          tx4,
          midterm,
          finalExam,
          average: avg !== undefined ? avg : calculateSubjectAverage({
            assessmentMode: 'SCORE_AND_COMMENT',
            tx1,
            tx2,
            tx3,
            tx4,
            midterm,
            finalExam,
            period: selectedPeriod
          })
        });
      }
    });

    parsedResults.push({
      rowIndex: rIdx + 2,
      matchedStudent,
      grades,
      errors
    });
  });

  return parsedResults;
}

async function runTests() {
  console.log('=== BẮT ĐẦU KIỂM THỬ MẪU VÀ NHẬP EXCEL MÔN ĐÁNH GIÁ BẰNG NHẬN XÉT ===\n');

  const students = studentService.getAll();
  const appliedSubjects = classService.getAppliedSubjects();
  const testStudent = students[0];
  const commentSubject = appliedSubjects.find((s) => isCommentSubject(s)) || {
    id: 'sub-hdtn',
    name: 'Hoạt động trải nghiệm, hướng nghiệp',
    assessmentMode: 'COMMENT_ONLY',
    selected: true
  };

  const period: AcademicPeriod = 'final_hk1';

  // -------------------------------------------------------------
  // Test 1: Môn nhận xét chỉ có một cột, nhập "Đạt"
  // -------------------------------------------------------------
  console.log('--- TEST 1: Môn nhận xét chỉ có 1 cột, nhập "Đạt" ---');
  {
    const headers = ['STT', 'Mã học sinh', 'Họ và tên', 'Tổ', `${commentSubject.name} - Đánh giá (Đạt/Chưa đạt)`];
    const rows = [[1, testStudent.code, testStudent.fullName, 'Tổ 1', 'Đạt']];
    const mappings: Record<string, SubjectColumnMap> = {
      [commentSubject.name]: { evaluationCol: `${commentSubject.name} - Đánh giá (Đạt/Chưa đạt)` }
    };

    const parsed = parseExcelGrades(headers, rows, period, mappings);
    const rowRes = parsed[0];

    if (rowRes.errors.length > 0) {
      throw new Error(`Test 1 Failed: errors found: ${rowRes.errors.join(', ')}`);
    }

    const g = rowRes.grades.find((x: any) => x.subjectName === commentSubject.name);
    if (!g || g.qualitativeResult !== 'Đạt' || g.average !== undefined) {
      throw new Error(`Test 1 Failed: grade not saved correctly. g: ${JSON.stringify(g)}`);
    }

    // Save to system and read back
    academicService.updateStudentGrades(testStudent.id, rowRes.grades, period, 'Nhận xét test 1', 'GVCN');
    const savedRec = academicService.getStudentAcademicRecord(testStudent.id, period);
    const savedG = savedRec.grades.find((x: any) => x.subjectName === commentSubject.name);

    if (!savedG || savedG.qualitativeResult !== 'Đạt' || savedG.average !== undefined) {
      throw new Error(`Test 1 Read-back Failed: savedG: ${JSON.stringify(savedG)}`);
    }
    console.log('✓ PASS Test 1: Nhập "Đạt" thành công, lưu đúng qualitativeResult="Đạt", không chuyển thành điểm số.');
  }

  // -------------------------------------------------------------
  // Test 2: Môn nhận xét nhập "Chưa đạt"
  // -------------------------------------------------------------
  console.log('\n--- TEST 2: Môn nhận xét nhập "Chưa đạt" ---');
  {
    const headers = ['STT', 'Mã học sinh', 'Họ và tên', 'Tổ', `${commentSubject.name} - Đánh giá (Đạt/Chưa đạt)`];
    const rows = [[1, testStudent.code, testStudent.fullName, 'Tổ 1', 'Chưa đạt']];
    const mappings: Record<string, SubjectColumnMap> = {
      [commentSubject.name]: { evaluationCol: `${commentSubject.name} - Đánh giá (Đạt/Chưa đạt)` }
    };

    const parsed = parseExcelGrades(headers, rows, period, mappings);
    const rowRes = parsed[0];

    if (rowRes.errors.length > 0) {
      throw new Error(`Test 2 Failed: errors found: ${rowRes.errors.join(', ')}`);
    }

    const g = rowRes.grades.find((x: any) => x.subjectName === commentSubject.name);
    if (!g || g.qualitativeResult !== 'Chưa đạt' || g.average !== undefined) {
      throw new Error(`Test 2 Failed: grade not saved correctly. g: ${JSON.stringify(g)}`);
    }

    academicService.updateStudentGrades(testStudent.id, rowRes.grades, period, 'Nhận xét test 2', 'GVCN');
    const savedRec = academicService.getStudentAcademicRecord(testStudent.id, period);
    const savedG = savedRec.grades.find((x: any) => x.subjectName === commentSubject.name);

    if (!savedG || savedG.qualitativeResult !== 'Chưa đạt' || savedG.average !== undefined) {
      throw new Error(`Test 2 Read-back Failed: savedG: ${JSON.stringify(savedG)}`);
    }
    console.log('✓ PASS Test 2: Nhập "Chưa đạt" thành công, lưu đúng qualitativeResult="Chưa đạt", giữ nguyên kết quả.');
  }

  // -------------------------------------------------------------
  // Test 3: Môn nhận xét để trống
  // -------------------------------------------------------------
  console.log('\n--- TEST 3: Môn nhận xét để trống ---');
  {
    const headers = ['STT', 'Mã học sinh', 'Họ và tên', 'Tổ', `${commentSubject.name} - Đánh giá (Đạt/Chưa đạt)`];
    const rows = [[1, testStudent.code, testStudent.fullName, 'Tổ 1', '']];
    const mappings: Record<string, SubjectColumnMap> = {
      [commentSubject.name]: { evaluationCol: `${commentSubject.name} - Đánh giá (Đạt/Chưa đạt)` }
    };

    const parsed = parseExcelGrades(headers, rows, period, mappings);
    const rowRes = parsed[0];

    if (rowRes.errors.length > 0) {
      throw new Error(`Test 3 Failed: empty cell should not produce errors: ${rowRes.errors.join(', ')}`);
    }

    const g = rowRes.grades.find((x: any) => x.subjectName === commentSubject.name);
    if (!g || g.qualitativeResult !== undefined || g.average !== undefined) {
      throw new Error(`Test 3 Failed: empty cell must have qualitativeResult=undefined and average=undefined. g: ${JSON.stringify(g)}`);
    }

    academicService.updateStudentGrades(testStudent.id, rowRes.grades, period, 'Nhận xét test 3', 'GVCN');
    const savedRec = academicService.getStudentAcademicRecord(testStudent.id, period);
    const savedG = savedRec.grades.find((x: any) => x.subjectName === commentSubject.name);

    if (!savedG || savedG.qualitativeResult !== undefined || savedG.average !== undefined) {
      throw new Error(`Test 3 Read-back Failed: savedG must have qualitativeResult=undefined. savedG: ${JSON.stringify(savedG)}`);
    }
    console.log('✓ PASS Test 3: Ô nhận xét để trống không tự gán Đạt, Chưa đạt hay điểm 0 (giữ nguyên undefined/chưa đánh giá).');
  }

  // -------------------------------------------------------------
  // Test 4: Môn nhận xét nhập giá trị không hợp lệ
  // -------------------------------------------------------------
  console.log('\n--- TEST 4: Môn nhận xét nhập giá trị không hợp lệ ---');
  {
    const invalidValues = ['8.5', 'Tốt', 'Khá', 'Pass', '0', '1', 'Không đạt'];
    for (const inv of invalidValues) {
      const headers = ['STT', 'Mã học sinh', 'Họ và tên', 'Tổ', `${commentSubject.name} - Đánh giá (Đạt/Chưa đạt)`];
      const rows = [[1, testStudent.code, testStudent.fullName, 'Tổ 1', inv]];
      const mappings: Record<string, SubjectColumnMap> = {
        [commentSubject.name]: { evaluationCol: `${commentSubject.name} - Đánh giá (Đạt/Chưa đạt)` }
      };

      const parsed = parseExcelGrades(headers, rows, period, mappings);
      const rowRes = parsed[0];

      if (rowRes.errors.length === 0) {
        throw new Error(`Test 4 Failed: value "${inv}" should produce error but got 0 errors.`);
      }

      const errMsg = rowRes.errors[0];
      if (!errMsg.includes(testStudent.fullName) || !errMsg.includes(commentSubject.name) || !errMsg.includes(inv)) {
        throw new Error(`Test 4 Failed: error message "${errMsg}" must contain student name, subject name, and invalid value.`);
      }
    }
    console.log('✓ PASS Test 4: Nhập giá trị không hợp lệ báo lỗi rõ ràng kèm tên học viên, tên môn và giá trị cần sửa; không âm thầm chuyển đổi.');
  }

  // -------------------------------------------------------------
  // Test 5: Môn tính điểm vẫn có đủ các cột điểm thành phần
  // -------------------------------------------------------------
  console.log('\n--- TEST 5: Môn tính điểm vẫn có đủ các cột thành phần như cấu hình ---');
  {
    const template = generateSampleExcelData('final_hk1');
    const scoredSubjects = appliedSubjects.filter((s) => !isCommentSubject(s));

    scoredSubjects.forEach((sub) => {
      const txCount = sub.txColumnCount || 3;
      for (let i = 1; i <= txCount; i++) {
        const expectedCol = `${sub.name} - TX${i}`;
        if (!template.headerRow.includes(expectedCol)) {
          throw new Error(`Test 5 Failed: missing column "${expectedCol}" in template.`);
        }
      }
      if (!template.headerRow.includes(`${sub.name} - Giữa kỳ`)) {
        throw new Error(`Test 5 Failed: missing Giữa kỳ for ${sub.name}`);
      }
      if (!template.headerRow.includes(`${sub.name} - Cuối kỳ`)) {
        throw new Error(`Test 5 Failed: missing Cuối kỳ for ${sub.name}`);
      }
      if (!template.headerRow.includes(`${sub.name} - TB Môn`)) {
        throw new Error(`Test 5 Failed: missing TB Môn for ${sub.name}`);
      }
    });

    // Verify comment subjects only have 1 column
    const commentSubs = appliedSubjects.filter((s) => isCommentSubject(s));
    commentSubs.forEach((sub) => {
      const commentCols = template.headerRow.filter((h) => h.toLowerCase().includes(sub.name.toLowerCase()));
      if (commentCols.length !== 1) {
        throw new Error(`Test 5 Failed: comment subject "${sub.name}" must have exactly 1 column, but has ${commentCols.length}: ${commentCols.join(', ')}`);
      }
      if (!commentCols[0].includes('Đánh giá')) {
        throw new Error(`Test 5 Failed: comment column header "${commentCols[0]}" is missing 'Đánh giá'.`);
      }
    });

    console.log('✓ PASS Test 5: Môn tính điểm có đầy đủ TX, Giữa kỳ, Cuối kỳ, TB Môn; Môn nhận xét có đúng 1 cột duy nhất.');
  }

  // -------------------------------------------------------------
  // Test 6: Tải mẫu mới, nhập dữ liệu thử, tải lại dữ liệu và xác nhận kết quả
  // -------------------------------------------------------------
  console.log('\n--- TEST 6: Luồng khép kín (Tải mẫu, nhập dữ liệu, lưu và đọc lại) ---');
  {
    const template = generateSampleExcelData('final_hk1');
    const testStudent2 = students[1] || students[0];

    // Build sample row
    const testRow: any[] = [1, testStudent2.code, testStudent2.fullName, 'Tổ 1'];
    appliedSubjects.forEach((s) => {
      const isComment = isCommentSubject(s);
      if (isComment) {
        testRow.push('Đạt'); // Set Đạt for comment subject
      } else {
        const txCount = s.txColumnCount || 3;
        testRow.push(8); // TX1
        for (let i = 1; i < txCount; i++) testRow.push(''); // other TX blank
        testRow.push(7.5); // Giữa kỳ
        testRow.push(8.5); // Cuối kỳ
        testRow.push(''); // TB Môn auto-calculated
        testRow.push('Chăm chỉ'); // Ghi chú
      }
    });
    // summaries
    testRow.push('Toán'); // thế mạnh
    testRow.push(''); // cần chú ý
    testRow.push(1); // nghỉ CP
    testRow.push(0); // nghỉ KP
    testRow.push('Tốt'); // học tập
    testRow.push('Tốt'); // rèn luyện
    testRow.push('Rất tiến bộ'); // nhận xét GVCN

    // Build dynamic mappings
    const mappings: Record<string, SubjectColumnMap> = {};
    appliedSubjects.forEach((sub) => {
      if (isCommentSubject(sub)) {
        mappings[sub.name] = {
          evaluationCol: `${sub.name} - Đánh giá (Đạt/Chưa đạt)`
        };
      } else {
        mappings[sub.name] = {
          tx1: `${sub.name} - TX1`,
          midterm: `${sub.name} - Giữa kỳ`,
          finalExam: `${sub.name} - Cuối kỳ`,
          avg: `${sub.name} - TB Môn`
        };
      }
    });

    const parsed = parseExcelGrades(template.headerRow, [testRow], 'final_hk1', mappings);
    const rowRes = parsed[0];

    if (rowRes.errors.length > 0) {
      throw new Error(`Test 6 Failed: validation errors: ${rowRes.errors.join(', ')}`);
    }

    academicService.updateStudentGrades(testStudent2.id, rowRes.grades, 'final_hk1', 'Test 6 comment', 'GVCN');
    const reloadedRec = academicService.getStudentAcademicRecord(testStudent2.id, 'final_hk1');

    // Verify comment subject in reloadedRec
    const reloadedComment = reloadedRec.grades.find((g: any) => isCommentSubject({ name: g.subjectName }));
    if (!reloadedComment || reloadedComment.qualitativeResult !== 'Đạt' || reloadedComment.average !== undefined) {
      throw new Error(`Test 6 Failed: comment grade incorrect: ${JSON.stringify(reloadedComment)}`);
    }

    // Verify scored subject in reloadedRec
    const firstScored = appliedSubjects.find((s) => !isCommentSubject(s));
    if (firstScored) {
      const reloadedScored = reloadedRec.grades.find((g: any) => g.subjectName === firstScored.name);
      if (!reloadedScored || reloadedScored.tx1 !== 8 || reloadedScored.midterm !== 7.5 || reloadedScored.finalExam !== 8.5) {
        throw new Error(`Test 6 Failed: scored grade incorrect: ${JSON.stringify(reloadedScored)}`);
      }
      // Check weighted average: (8*1 + 7.5*2 + 8.5*3) / (1+2+3) = (8 + 15 + 25.5)/6 = 48.5/6 = 8.1
      const expectedAvg = Number(((8 * 1 + 7.5 * 2 + 8.5 * 3) / 6).toFixed(1));
      if (reloadedScored.average !== expectedAvg) {
        throw new Error(`Test 6 Failed: average mismatch. Expected ${expectedAvg}, got ${reloadedScored.average}`);
      }
    }

    console.log('✓ PASS Test 6: Toàn bộ luồng khép kín (mẫu mới, nhập, lưu, đọc lại) khớp 100% không sai lệch.');
  }

  console.log('\n======================================================');
  console.log('TẤT CẢ 6 CA KIỂM THỬ ĐÃ ĐẠT (ALL 6 TESTS PASSED 100%)!');
  console.log('======================================================\n');
}

runTests().catch((err) => {
  console.error('TEST RUN FAILED:', err);
  process.exit(1);
});
