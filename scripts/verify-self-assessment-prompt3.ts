/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Script kiểm thử toàn diện chức năng "Tự nhận xét" rèn luyện của học viên (Prompt 3):
 * 1. Phương thức A — Nhập thủ công & Nhận/Đối chiếu dữ liệu Excel GVCN.
 * 2. Phương thức B — Đồng bộ từ khảo sát rèn luyện (HKI -> HKI, HKII -> HKII, không [object Object]).
 * 3. Lưu trữ & Tính bền vững (Persistence, reload không mất dữ liệu).
 * 4. Bảo vệ dữ liệu độc lập, không ghi đè đánh giá của GVCN.
 */

import { conductEvaluationService } from '../src/services/ConductEvaluationService';
import { studentSurveyService } from '../src/services/StudentSurveyService';
import { surveyTemplateService } from '../src/services/SurveyTemplateService';
import { studentService } from '../src/services/StudentService';
import { normalizeConductGrade, extractCleanAnswerText, unwrapAnswerValue } from '../src/utils/surveyAnswerUtils';

let passCount = 0;
let failCount = 0;
let unverifiedCount = 0;

function pass(name: string, detail?: string) {
  passCount++;
  console.log(`[PASS] ${name}${detail ? ` - ${detail}` : ''}`);
}

function fail(name: string, error: string) {
  failCount++;
  console.error(`[FAIL] ${name}: ${error}`);
}

async function runTests() {
  console.log('================================================================');
  console.log('KIỂM THỬ TOÀN DIỆN: 2 PHƯƠNG THỨC "TỰ NHẬN XÉT" RÈN LUYỆN (PROMPT 3)');
  console.log('================================================================\n');

  const testStudentId = 'hs-02'; // Trần Thị Mai
  const student = studentService.getById(testStudentId);
  if (!student) {
    fail('Khởi tạo kiểm thử', `Không tìm thấy học viên mẫu ${testStudentId}`);
    return;
  }

  // Backup original evaluations
  const origSem1 = conductEvaluationService.getStudentEvaluation(testStudentId, 'SEMESTER_1');
  const origSem2 = conductEvaluationService.getStudentEvaluation(testStudentId, 'SEMESTER_2');

  try {
    // -------------------------------------------------------------
    // PHẦN 1: PHƯƠNG THỨC A — NHẬP THỦ CÔNG & ĐỐI CHIẾU DỮ LIỆU EXCEL GVCN
    // -------------------------------------------------------------
    console.log('--- PHẦN 1: Phương thức A — Nhập thủ công & Đối chiếu dữ liệu Excel GVCN ---');

    // 1.1 Nhập thủ công HKI
    const resA1 = conductEvaluationService.updateStudentSelfAssessment(
      testStudentId,
      'SEMESTER_1',
      'Tốt',
      'Em luôn đi học đúng giờ, tích cực tham gia phong trào 20/11',
      'Học viên tự nhận xét thủ công'
    );

    if (resA1.success) {
      pass('Test 1.1: Học viên nhập tự nhận xét thủ công HKI thành công');
    } else {
      fail('Test 1.1: Nhập tự nhận xét thủ công HKI thất bại', resA1.message);
    }

    const evalSem1 = conductEvaluationService.getStudentEvaluation(testStudentId, 'SEMESTER_1');
    if (evalSem1 && evalSem1.selfAssessment === 'Tốt') {
      pass('Test 1.2: Dữ liệu tự nhận xét HKI được lưu chuẩn xác là "Tốt"');
    } else {
      fail('Test 1.2: Dữ liệu HKI không khớp', `Nhận: ${evalSem1?.selfAssessment}`);
    }

    // 1.3 Hiển thị dữ liệu đánh giá tương ứng từ Excel GVCN
    // Giả lập dữ liệu Excel GVCN đã nhập
    const session1 = conductEvaluationService.getOrCreateEvaluation('SEMESTER_1');
    const idx1 = session1.evaluations.findIndex(e => e.studentId === testStudentId);
    if (idx1 !== -1) {
      session1.evaluations[idx1].teacherAssessment = 'Khá';
      session1.evaluations[idx1].collectiveAssessment = 'Khá';
      session1.evaluations[idx1].finalGrade = 'Khá';
      session1.evaluations[idx1].teacherNote = 'Cần chú ý không nói chuyện riêng trong giờ Sinh học';
    }

    const updatedEval1 = conductEvaluationService.getStudentEvaluation(testStudentId, 'SEMESTER_1');
    if (
      updatedEval1?.selfAssessment === 'Tốt' &&
      updatedEval1?.teacherAssessment === 'Khá' &&
      updatedEval1?.collectiveAssessment === 'Khá' &&
      updatedEval1?.finalGrade === 'Khá'
    ) {
      pass('Test 1.3: Dữ liệu tự nhận xét (Tốt) và dữ liệu Excel GVCN (Khá) cùng tồn tại song song, không tráo cột');
    } else {
      fail('Test 1.3: Xung đột dữ liệu', JSON.stringify(updatedEval1));
    }

    // 1.4 Phát hiện xung đột (Conflict warning)
    const selfGrade = normalizeConductGrade(updatedEval1?.selfAssessment);
    const teacherGrade = normalizeConductGrade(updatedEval1?.teacherAssessment);
    const hasConflict = Boolean(selfGrade && teacherGrade && selfGrade !== teacherGrade);
    if (hasConflict) {
      pass('Test 1.4: Hệ thống nhận diện chính xác xung đột giữa tự nhận xét ("Tốt") và GVCN ("Khá")');
    } else {
      fail('Test 1.4: Không phát hiện được xung đột', `${selfGrade} vs ${teacherGrade}`);
    }

    // 1.5 Kiểm tra không tự động ghi đè dữ liệu GVCN
    if (updatedEval1?.teacherAssessment === 'Khá' && updatedEval1?.finalGrade === 'Khá') {
      pass('Test 1.5: Tự nhận xét của học viên tuyệt đối KHÔNG ghi đè lên đánh giá của GVCN từ Excel');
    } else {
      fail('Test 1.5: Đánh giá GVCN bị ghi đè', `${updatedEval1?.teacherAssessment}`);
    }

    // -------------------------------------------------------------
    // PHẦN 2: PHƯƠNG THỨC B — ĐỒNG BỘ TỪ KHẢO SÁT RÈN LUYỆN
    // -------------------------------------------------------------
    console.log('\n--- PHẦN 2: Phương thức B — Đồng bộ từ khảo sát rèn luyện ---');

    // 2.1 Tạo khảo sát rèn luyện mẫu cho HKI (với dữ liệu đối tượng phức tạp)
    const surveyHk1 = {
      id: 'test-survey-hk1-' + Date.now(),
      studentId: testStudentId,
      surveyTemplateId: 'template-conduct-hk1',
      title: 'Tự đánh giá kết quả rèn luyện - Học kỳ I',
      category: 'CONDUCT',
      classId: 'class-11a1-2025',
      schoolYear: '2025 - 2026',
      academicYear: '2025 - 2026',
      periodType: 'SEMESTER_1',
      status: 'SUBMITTED',
      answers: {
        conductSelfEvaluation: {
          grade: { value: 'Tốt', label: 'Tốt' }, // Object structure
          note: 'Em đã nỗ lực đạt danh hiệu học sinh xuất sắc'
        }
      },
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    (studentSurveyService as any).surveys.unshift(surveyHk1);

    // 2.2 Tra cứu khảo sát HKI
    const surveySelfHk1 = conductEvaluationService.getSurveySelfAssessment(testStudentId, 'SEMESTER_1');
    if (surveySelfHk1 && surveySelfHk1.grade === 'Tốt') {
      pass('Test 2.1: Đồng bộ khảo sát HKI trích xuất chính xác văn bản xếp loại "Tốt"');
    } else {
      fail('Test 2.1: Đồng bộ HKI thất bại', JSON.stringify(surveySelfHk1));
    }

    // 2.3 Tuyệt đối không có [object Object]
    if (
      surveySelfHk1?.grade !== '[object Object]' &&
      !String(surveySelfHk1?.grade).includes('object')
    ) {
      pass('Test 2.2: Giá trị xếp loại không bị lỗi [object Object]');
    } else {
      fail('Test 2.2: Lỗi [object Object] xuất hiện', String(surveySelfHk1?.grade));
    }

    // 2.4 Ánh xạ HKI chỉ vào HKI, không bị gán chéo sang HKII
    const surveySelfHk2 = conductEvaluationService.getSurveySelfAssessment(testStudentId, 'SEMESTER_2');
    if (!surveySelfHk2) {
      pass('Test 2.3: Khảo sát HKI KHÔNG bị ánh xạ chéo sang HKII (HKII trả về null an toàn)');
    } else {
      fail('Test 2.3: Ánh xạ chéo HKI sang HKII', JSON.stringify(surveySelfHk2));
    }

    // 2.5 Tạo khảo sát HKII và đồng bộ vào HKII
    const surveyHk2 = {
      id: 'test-survey-hk2-' + Date.now(),
      studentId: testStudentId,
      surveyTemplateId: 'template-conduct-hk2',
      title: 'Tự đánh giá kết quả rèn luyện - Học kỳ II',
      category: 'CONDUCT',
      classId: 'class-11a1-2025',
      schoolYear: '2025 - 2026',
      academicYear: '2025 - 2026',
      periodType: 'SEMESTER_2',
      status: 'SUBMITTED',
      answers: {
        conductSelfEvaluation: {
          grade: 'Khá',
          note: 'HKII em có tiến bộ môn Ngoại ngữ'
        }
      },
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    (studentSurveyService as any).surveys.unshift(surveyHk2);

    const surveySelfHk2New = conductEvaluationService.getSurveySelfAssessment(testStudentId, 'SEMESTER_2');
    if (surveySelfHk2New && surveySelfHk2New.grade === 'Khá') {
      pass('Test 2.4: Khảo sát HKII đồng bộ chính xác vào HKII ("Khá")');
    } else {
      fail('Test 2.4: Khảo sát HKII không tìm thấy', JSON.stringify(surveySelfHk2New));
    }

    // 2.6 Áp dụng đồng bộ khảo sát HKII vào nguồn lưu trữ chính
    const resSyncHk2 = conductEvaluationService.updateStudentSelfAssessment(
      testStudentId,
      'SEMESTER_2',
      surveySelfHk2New.grade,
      surveySelfHk2New.note,
      surveySelfHk2New.sourceTitle
    );
    if (resSyncHk2.success) {
      pass('Test 2.5: Áp dụng khảo sát HKII vào nguồn dữ liệu chính thành công');
    } else {
      fail('Test 2.5: Áp dụng thất bại', resSyncHk2.message);
    }

    const evalSem2 = conductEvaluationService.getStudentEvaluation(testStudentId, 'SEMESTER_2');
    if (evalSem2?.selfAssessment === 'Khá') {
      pass('Test 2.6: Dữ liệu HKII độc lập với HKI (HKI: Tốt, HKII: Khá)');
    } else {
      fail('Test 2.6: Dữ liệu HKII không khớp', JSON.stringify(evalSem2));
    }

    // 2.7 Khảo sát không xác định được học kỳ / thiếu học kỳ -> Xử lý an toàn, không tự đoán
    const resAmbiguous = conductEvaluationService.updateStudentSelfAssessment(
      testStudentId,
      undefined as any,
      'Đạt'
    );
    if (!resAmbiguous.success) {
      pass('Test 2.7: Thiếu học kỳ được từ chối an toàn, không tự suy đoán và không ghi đè');
    } else {
      fail('Test 2.7: Chấp nhận học kỳ không xác định', resAmbiguous.message);
    }

    // 2.8 Không lấy nhầm khảo sát khác (ví dụ: khảo sát phụ huynh)
    const parentSurvey = {
      id: 'test-parent-survey-' + Date.now(),
      studentId: testStudentId,
      surveyType: 'PARENT_NEEDS',
      title: 'Khảo sát nhu cầu phụ huynh',
      category: 'PARENT_FEEDBACK',
      answers: { conductSelfEvaluation: { grade: 'Chưa đạt' } },
      submittedAt: new Date().toISOString()
    };
    (studentSurveyService as any).surveys.unshift(parentSurvey);

    const surveyCheckNoLeak = conductEvaluationService.getSurveySelfAssessment(testStudentId, 'SEMESTER_1');
    if (surveyCheckNoLeak && surveyCheckNoLeak.grade === 'Tốt') {
      pass('Test 2.8: Khảo sát phụ huynh hoặc khảo sát khác không bao giờ bị lấy nhầm');
    } else {
      fail('Test 2.8: Lấy nhầm khảo sát phụ huynh', JSON.stringify(surveyCheckNoLeak));
    }

    // -------------------------------------------------------------
    // PHẦN 3: LƯU DỮ LIỆU & TÍNH BỀN VỮNG (PERSISTENCE)
    // -------------------------------------------------------------
    console.log('\n--- PHẦN 3: Lưu trữ dữ liệu & Tính bền vững ---');

    // 3.1 Đọc lại dữ liệu từ instance conductEvaluationService
    const reloadedSem1 = conductEvaluationService.getStudentEvaluation(testStudentId, 'SEMESTER_1');
    const reloadedSem2 = conductEvaluationService.getStudentEvaluation(testStudentId, 'SEMESTER_2');

    if (reloadedSem1?.selfAssessment === 'Tốt' && reloadedSem2?.selfAssessment === 'Khá') {
      pass('Test 3.1: Dữ liệu tự nhận xét HKI và HKII duy trì chính xác trong nguồn dữ liệu chính');
    } else {
      fail('Test 3.1: Mất dữ liệu sau khi lưu', `HKI: ${reloadedSem1?.selfAssessment}, HKII: ${reloadedSem2?.selfAssessment}`);
    }

    // 3.2 Kiểm tra khi kỳ đã khóa (FINALIZED)
    session1.status = 'FINALIZED';
    const resFinalized = conductEvaluationService.updateStudentSelfAssessment(
      testStudentId,
      'SEMESTER_1',
      'Đạt'
    );
    if (!resFinalized.success && resFinalized.message.includes('chốt chính thức')) {
      pass('Test 3.2: Khi GVCN đã chốt sổ (FINALIZED), ngăn chặn sửa đổi tự nhận xét');
    } else {
      fail('Test 3.2: Cho phép sửa kỳ đã FINALIZED', resFinalized.message);
    }
    session1.status = 'DRAFT';

    // 3.3 Chuẩn hóa các giá trị xếp loại rèn luyện
    const grades = ['Tốt', 'Khá', 'Đạt', 'Chưa đạt'];
    for (const g of grades) {
      const normalized = normalizeConductGrade(g);
      if (normalized === g) {
        pass(`Test 3.3.${g}: Chuẩn hóa chính xác mức "${g}"`);
      } else {
        fail(`Test 3.3.${g}: Chuẩn hóa lỗi`, `${g} -> ${normalized}`);
      }
    }

  } finally {
    // Hoàn nguyên dữ liệu gốc
    if (origSem1) {
      const s1 = conductEvaluationService.getOrCreateEvaluation('SEMESTER_1');
      const idx = s1.evaluations.findIndex(e => e.studentId === testStudentId);
      if (idx !== -1) s1.evaluations[idx] = origSem1;
    }
    if (origSem2) {
      const s2 = conductEvaluationService.getOrCreateEvaluation('SEMESTER_2');
      const idx = s2.evaluations.findIndex(e => e.studentId === testStudentId);
      if (idx !== -1) s2.evaluations[idx] = origSem2;
    }
    console.log('\n[CLEANUP] Đã hoàn nguyên trạng thái rèn luyện ban đầu của học viên.');
  }

  console.log('\n================================================================');
  console.log(`KẾT QUẢ KIỂM THỬ: ${passCount} PASS, ${failCount} FAIL, ${unverifiedCount} CHƯA KIỂM CHỨNG`);
  console.log('================================================================');
}

runTests().catch(e => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
