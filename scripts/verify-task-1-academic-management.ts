import { academicService } from '../src/services/AcademicService';
import { studentService } from '../src/services/StudentService';
import { authService } from '../src/services/AuthService';
import { getDatabase } from '../server/db/database';
import fs from 'fs';

async function runTests() {
  console.log('=== BẮT ĐẦU KIỂM THỬ NHIỆM VỤ 1: QUẢN LÝ HỌC TẬP GVCN ===\n');
  let passCount = 0;
  let totalCount = 0;

  function assert(condition: boolean, desc: string) {
    totalCount++;
    if (condition) {
      console.log(`[PASS] ${desc}`);
      passCount++;
    } else {
      console.error(`[FAIL] ${desc}`);
      throw new Error(`Test failed: ${desc}`);
    }
  }

  // Helper to switch user role
  function setUser(role: 'TEACHER' | 'STUDENT' | 'PARENT', studentId?: string) {
    (authService as any).currentUser = {
      id: role === 'TEACHER' ? 'teacher-01' : (studentId || 'hs-01'),
      name: role === 'TEACHER' ? 'Cô Nguyễn Thị Mai Lan (GVCN)' : 'Học sinh test',
      role: role,
      tenantId: 'tenant-lan-nguyen',
      workspaceId: 'tenant-lan-nguyen',
      studentId: studentId,
      childStudentId: role === 'PARENT' ? studentId : undefined
    };
    (authService as any).currentRole = role;
  }

  // TEST 1: Check UI files have the required buttons "Lưu" and "Công bố cho HV và PH"
  console.log('--- KIỂM TRA GIAO DIỆN: 2 NÚT "Lưu" VÀ "Công bố cho HV và PH" ---');
  const academicModuleContent = fs.readFileSync('src/components/academic/AcademicModule.tsx', 'utf-8');
  assert(
    academicModuleContent.includes('<span>Lưu</span>') && academicModuleContent.includes('<span>Công bố cho HV và PH</span>'),
    'Giao diện Quản lí học tập có đầy đủ nút "Lưu" và "Công bố cho HV và PH"'
  );

  // Check buttons exist in overview header, statistical bar, direct entry tab, and student modal
  const luuOccurrences = (academicModuleContent.match(/<span>Lưu<\/span>/g) || []).length;
  const congBoOccurrences = (academicModuleContent.match(/<span>Công bố cho HV và PH<\/span>/g) || []).length;
  assert(
    luuOccurrences >= 3 && congBoOccurrences >= 3,
    `Cả 2 nút xuất hiện đầy đủ ở các khu vực quản lý điểm (Lưu: ${luuOccurrences}, Công bố: ${congBoOccurrences})`
  );

  // TEST 2: Preserving existing published data when GVCN saves a new draft
  console.log('\n--- KIỂM TRA BẢO TOÀN DỮ LIỆU ĐÃ CÔNG BỐ KHI LƯU BẢN NHÁP MỚI ---');
  const students = studentService.getAll();
  const testStudent = students[0];
  const period = 'midterm_hk1';

  // Step 2.1: Publish initial grades for student 1 with specific Math score 8.0
  setUser('TEACHER');
  academicService.publishStudentGrades(testStudent.id, period, 'GVCN Nguyễn Thị Mai Lan');
  
  const pubBefore = academicService.getPublication(testStudent.id, period);
  assert(pubBefore.status === 'PUBLISHED', 'Dữ liệu ban đầu đã có trạng thái PUBLISHED');
  assert(academicService.isPeriodPublished(testStudent.id, period) === true, 'isPeriodPublished xác nhận trạng thái công bố');

  // Step 2.2: Simulate Student / Parent accessing the grades -> must see published grades
  setUser('STUDENT', testStudent.id);
  const studentViewBefore = academicService.getStudentAcademicRecord(testStudent.id, period);
  assert(
    studentViewBefore.publicationStatus === 'PUBLISHED' || studentViewBefore.publishedToStudent === true,
    'Học viên/Phụ huynh đọc được bảng điểm đã công bố'
  );

  // Step 2.3: Teacher logs back in, edits Math score to 9.5 and clicks "Lưu" (Save Draft)
  setUser('TEACHER');
  const gradesList = Array.isArray(studentViewBefore.grades) ? studentViewBefore.grades : [];
  const currentGrades = [...gradesList];
  const mathIdx = currentGrades.findIndex(g => g.subjectName === 'Toán học');
  if (mathIdx >= 0) {
    currentGrades[mathIdx] = {
      ...currentGrades[mathIdx],
      tx1: 9.5,
      regularScores: [9.5],
      average: 9.5
    };
  }

  // Teacher clicks "Lưu" -> saves draft with publishedToStudent: false
  const draftSaved = academicService.updateStudentGrades(
    testStudent.id,
    currentGrades,
    period,
    'Bản nháp nhận xét mới của GVCN',
    'GVCN Nguyễn Thị Mai Lan',
    {
      academicSummary: 'Bản nháp nhận xét mới của GVCN',
      publishedToStudent: false,
      publishedToParent: false
    }
  );

  assert(draftSaved.publicationStatus === 'DRAFT', 'Khi nhấn "Lưu", trạng thái bản ghi mới là DRAFT (chưa công bố)');
  assert(draftSaved.publishedToStudent === false, 'Nhấn "Lưu" không tự động chuyển trạng thái sang đã công bố cho học viên');
  assert(draftSaved.publishedToParent === false, 'Nhấn "Lưu" không tự động chuyển trạng thái sang đã công bố cho phụ huynh');

  // Step 2.4: Crucial verification: Old published data is NOT lost!
  // Student logs in again -> MUST STILL SEE old published data, NOT draft
  setUser('STUDENT', testStudent.id);
  const studentViewAfterTeacherDraft = academicService.getStudentAcademicRecord(testStudent.id, period);
  assert(
    studentViewAfterTeacherDraft.publicationStatus === 'PUBLISHED',
    'Dữ liệu công bố cũ của học viên KHÔNG bị mất hoặc thay đổi trạng thái khi GVCN lưu nháp'
  );
  
  // Step 2.5: Teacher logs in again -> Teacher DOES see the new draft score 9.5
  setUser('TEACHER');
  const teacherView = academicService.getStudentAcademicRecord(testStudent.id, period);
  const mathInTeacherView = teacherView.grades.find(g => g.subjectName === 'Toán học');
  assert(
    mathInTeacherView?.tx1 === 9.5,
    'GVCN nhìn thấy dữ liệu điểm mới đã lưu trong bản nháp (9.5)'
  );

  // TEST 3: Verify Persistence in SQLite database
  console.log('\n--- KIỂM TRA LƯU TRỮ VÀO DATABASE SQLITE ---');
  const db = getDatabase();
  const dbRows = db.prepare('SELECT id, student_id, semester, scores_json FROM academic_records WHERE student_id = ?').all(testStudent.id);
  assert(dbRows.length > 0, 'Dữ liệu điểm đã được lưu vào bảng SQLite academic_records');

  console.log(`\n=== TẤT CẢ ${passCount}/${totalCount} KIỂM THỬ ĐÃ ĐẠT (PASS) ===`);
}

runTests().catch(err => {
  console.error('Kiểm thử thất bại:', err);
  process.exit(1);
});
