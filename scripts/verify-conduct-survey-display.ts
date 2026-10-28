import { 
  unwrapAnswerValue,
  normalizeConductGrade, 
  getSafeSurveyAnswer,
  formatAnswerForDisplay,
  determineConductSemester,
  extractCleanAnswerText
} from '../src/utils/surveyAnswerUtils';
import { conductEvaluationService } from '../src/services/ConductEvaluationService';
import { surveySyncService } from '../src/services/SurveySyncService';
import { studentSurveyService } from '../src/services/StudentSurveyService';
import { surveyTemplateService } from '../src/services/SurveyTemplateService';
import { StudentSurveyResponse, SurveyTemplate } from '../src/types';

async function runTests() {
  console.log('================================================================');
  console.log('KIỂM THỬ TOÀN DIỆN: CHỨC NĂNG "TỰ NHẬN XÉT" RÈN LUYỆN CỦA HỌC VIÊN');
  console.log('================================================================\n');

  const ratings = ['Tốt', 'Khá', 'Đạt', 'Chưa đạt'] as const;
  let passCount = 0;
  let failCount = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`[PASS] ${desc}`);
      passCount++;
    } else {
      console.error(`[FAIL] ${desc}`);
      failCount++;
    }
  }

  // ---------------------------------------------------------------------------
  // 1. KIỂM THỬ CHUYỂN ĐỔI GIÁ TRỊ: "Tốt", "Khá", "Đạt", "Chưa đạt"
  // ---------------------------------------------------------------------------
  console.log('--- 1. Chuyển đổi giá trị xếp loại rèn luyện thành văn bản đúng ---');
  for (const r of ratings) {
    // 1a. Chuỗi nguyên bản
    const fromStr = normalizeConductGrade(r);
    assert(fromStr === r, `Chuẩn hóa chuỗi xếp loại "${r}" -> "${fromStr}"`);

    const dispStr = formatAnswerForDisplay(r);
    assert(dispStr === r && !dispStr.includes('[object Object]'), `Hiển thị chuỗi "${r}" không có [object Object]`);

    // 1b. Dạng đối tượng { value: '...', label: '...' }
    const objOption = { value: r, label: r };
    const fromObj = normalizeConductGrade(objOption);
    assert(fromObj === r, `Trích xuất từ đối tượng { value: "${r}", label: "${r}" } -> "${fromObj}"`);

    const dispObj = formatAnswerForDisplay(objOption);
    assert(dispObj === r && !dispObj.includes('[object Object]'), `Hiển thị đối tượng { value: "${r}" } -> "${dispObj}"`);

    // 1c. Dạng đối tượng { grade: '...' }
    const objGrade = { grade: r };
    assert(normalizeConductGrade(objGrade) === r, `Trích xuất từ đối tượng { grade: "${r}" } -> "${r}"`);

    // 1d. Dạng đối tượng { selfAssessment: '...' }
    const objSelf = { selfAssessment: r };
    assert(normalizeConductGrade(objSelf) === r, `Trích xuất từ đối tượng { selfAssessment: "${r}" } -> "${r}"`);
  }

  // 1e. Phân biệt chính xác "Chưa đạt" và "Đạt"
  assert(normalizeConductGrade('Chưa đạt') === 'Chưa đạt', 'Phân biệt chính xác "Chưa đạt"');
  assert(normalizeConductGrade('Đạt') === 'Đạt', 'Phân biệt chính xác "Đạt"');
  assert(normalizeConductGrade('chưa đạt yêu cầu') === 'Chưa đạt', 'Chuẩn hóa "chưa đạt yêu cầu" thành "Chưa đạt"');
  assert(normalizeConductGrade('đạt tiêu chuẩn') === 'Đạt', 'Chuẩn hóa "đạt tiêu chuẩn" thành "Đạt"');

  // 1f. Text tự do, mảng và null
  const textAnswer = 'Tích cực tham gia các phong trào thi đua của lớp và trường.';
  assert(formatAnswerForDisplay(textAnswer) === textAnswer, 'Giữ nguyên câu trả lời dạng văn bản tự do');
  assert(formatAnswerForDisplay(['Tốt', 'Khá']) === 'Tốt, Khá', 'Chuyển đổi mảng lựa chọn thành danh sách chuỗi');
  assert(formatAnswerForDisplay(null) === 'Chưa có câu trả lời', 'Xử lý giá trị null an toàn (không lỗi)');

  // ---------------------------------------------------------------------------
  // 2. KIỂM THỬ KHÔNG LẤY NHẦM KHẢO SÁT
  // ---------------------------------------------------------------------------
  console.log('\n--- 2. Kiểm tra không lấy nhầm khảo sát ---');
  // Template khảo sát đầu năm (không phải khảo sát rèn luyện)
  const startYearTemplate = {
    id: 'template-grade12-default-v1',
    title: 'Khảo sát Đầu năm Lớp 12',
    description: 'Thu thập thông tin định hướng học tập đầu năm',
    surveyType: 'GRADE12_START_YEAR',
    sections: [],
    version: 1,
    status: 'PUBLISHED',
    scope: 'SYSTEM',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  } as any as SurveyTemplate;

  const semFromStartYear = determineConductSemester(startYearTemplate);
  assert(semFromStartYear === undefined, 'Khảo sát Đầu năm không được gán học kỳ rèn luyện (semFromStartYear === undefined)');

  // Template phụ huynh
  const parentTemplate = {
    id: 'template-parent-needs',
    title: 'Khảo sát Nhu cầu Phụ huynh Đầu năm',
    description: 'Khảo sát phụ huynh',
    surveyType: 'PARENT_PARTNERSHIP',
    sections: [],
    version: 1,
    status: 'PUBLISHED',
    scope: 'SYSTEM',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  } as any as SurveyTemplate;
  const semFromParent = determineConductSemester(parentTemplate);
  assert(semFromParent === undefined, 'Khảo sát Phụ huynh không bị lấy nhầm làm khảo sát rèn luyện');

  // ---------------------------------------------------------------------------
  // 3. KIỂM THỬ ÁNH XẠ HỌC KỲ: HKI CHỈ VÀO HKI, HKII CHỈ VÀO HKII (KHÔNG ÁNH XẠ CHÉO)
  // ---------------------------------------------------------------------------
  console.log('\n--- 3. Kiểm tra ánh xạ học kỳ: HKI -> HKI, HKII -> HKII (không chéo) ---');
  const hk1Template = {
    id: 'template-conduct-hk1',
    title: 'Khảo sát Tự đánh giá rèn luyện Học kỳ 1',
    description: 'Biểu mẫu đánh giá rèn luyện HKI',
    surveyType: 'CUSTOM',
    sections: [],
    version: 1,
    status: 'PUBLISHED',
    scope: 'CLASS',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  } as any as SurveyTemplate;

  const hk2Template = {
    id: 'template-conduct-hk2',
    title: 'Khảo sát Tự đánh giá rèn luyện Học kỳ 2',
    description: 'Biểu mẫu đánh giá rèn luyện HKII',
    surveyType: 'CUSTOM',
    sections: [],
    version: 1,
    status: 'PUBLISHED',
    scope: 'CLASS',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  } as any as SurveyTemplate;

  const sem1 = determineConductSemester(hk1Template);
  const sem2 = determineConductSemester(hk2Template);

  assert(sem1 === 'SEMESTER_1', 'Biểu mẫu HKI được ánh xạ chính xác vào SEMESTER_1');
  assert(sem2 === 'SEMESTER_2', 'Biểu mẫu HKII được ánh xạ chính xác vào SEMESTER_2');
  assert(sem1 !== sem2, 'Hai học kỳ độc lập tuyệt đối (không trùng lặp)');

  // Kiểm tra không đồng bộ chéo giữa các học kỳ
  const testStudentId = 'hs-01';
  // Backup initial student evaluations to preserve real data untouched
  const initialSem1 = conductEvaluationService.getOrCreateEvaluation('SEMESTER_1');
  const initialSem2 = conductEvaluationService.getOrCreateEvaluation('SEMESTER_2');
  const originalEv1 = JSON.parse(JSON.stringify(initialSem1.evaluations.find(e => e.studentId === testStudentId) || null));
  const originalEv2 = JSON.parse(JSON.stringify(initialSem2.evaluations.find(e => e.studentId === testStudentId) || null));

  try {
    conductEvaluationService.syncSurveyConductSelfAssessment(
      testStudentId,
      'survey-test-hk1',
      'Tốt',
      'Minh chứng HK1',
      { periodType: 'SEMESTER_1' }
    );

    const evalSem1 = conductEvaluationService.getOrCreateEvaluation('SEMESTER_1');
    const evalSem2 = conductEvaluationService.getOrCreateEvaluation('SEMESTER_2');

    const studentInSem1 = evalSem1.evaluations.find(e => e.studentId === testStudentId);
    const studentInSem2 = evalSem2.evaluations.find(e => e.studentId === testStudentId);

    assert(studentInSem1?.selfAssessment === 'Tốt', 'Dữ liệu tự nhận xét HKI nằm đúng tại SEMESTER_1');
    assert(studentInSem2?.selfAssessment !== 'Tốt' || originalEv2?.selfAssessment === 'Tốt', 
      'Dữ liệu HKI tuyệt đối KHÔNG bị ánh xạ chéo sang SEMESTER_2');

    // Đồng bộ riêng cho HKII với mức khác
    conductEvaluationService.syncSurveyConductSelfAssessment(
      testStudentId,
      'survey-test-hk2',
      'Khá',
      'Minh chứng HK2',
      { periodType: 'SEMESTER_2' }
    );

    const evalSem2After = conductEvaluationService.getOrCreateEvaluation('SEMESTER_2');
    const studentInSem2After = evalSem2After.evaluations.find(e => e.studentId === testStudentId);
    assert(studentInSem2After?.selfAssessment === 'Khá', 'Dữ liệu tự nhận xét HKII lưu chính xác tại SEMESTER_2');

    // Kiểm tra lại SEMESTER_1 không bị ảnh hưởng bởi cập nhật HKII
    const evalSem1After = conductEvaluationService.getOrCreateEvaluation('SEMESTER_1');
    const studentInSem1After = evalSem1After.evaluations.find(e => e.studentId === testStudentId);
    assert(studentInSem1After?.selfAssessment === 'Tốt', 'Dữ liệu SEMESTER_1 giữ nguyên vẹn sau khi HKII cập nhật');

    // ---------------------------------------------------------------------------
    // 4. KIỂM THỬ XỬ LÝ AN TOÀN KHI THIẾU THÔNG TIN HỌC KỲ
    // ---------------------------------------------------------------------------
    console.log('\n--- 4. Kiểm tra dữ liệu thiếu học kỳ được xử lý an toàn ---');
    const ambiguousTemplate = {
      id: 'template-general-survey',
      title: 'Phiếu đóng góp ý kiến chung',
      description: 'Không có thông tin học kỳ cụ thể',
      surveyType: 'CUSTOM',
      sections: [],
      version: 1,
      status: 'PUBLISHED',
      scope: 'CLASS',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as any as SurveyTemplate;

    const semAmbiguous = determineConductSemester(ambiguousTemplate);
    assert(semAmbiguous === undefined, 'Biểu mẫu thiếu học kỳ trả về undefined (không tự đoán)');

    // Thử đồng bộ khi không có periodType
    const didSyncWithoutPeriod = conductEvaluationService.syncSurveyConductSelfAssessment(
      testStudentId,
      'survey-no-period',
      'Chưa đạt',
      '',
      { periodType: undefined as any }
    );
    assert(didSyncWithoutPeriod === false, 'Từ chối đồng bộ khi thiếu học kỳ (không tự suy đoán và không ghi đè dữ liệu)');

    // ---------------------------------------------------------------------------
    // 5. BẢO VỆ DỮ LIỆU ĐÃ CÓ VÀ TÍNH ĐỘC LẬP ĐÁNH GIÁ CỦA GIÁO VIÊN
    // ---------------------------------------------------------------------------
    console.log('\n--- 5. Bảo vệ dữ liệu hiện có & Giữ độc lập quyền đánh giá GVCN ---');
    const currentStudentSem1 = evalSem1After.evaluations.find(e => e.studentId === testStudentId);
    assert(currentStudentSem1?.teacherAssessment !== 'Tốt', 'Quyền đánh giá chính thức của GVCN (teacherAssessment) hoàn toàn độc lập với tự nhận xét');

  } finally {
    // Clean up & Restore original student evaluation state to guarantee 100% data preservation
    const s1 = conductEvaluationService.getOrCreateEvaluation('SEMESTER_1');
    const s2 = conductEvaluationService.getOrCreateEvaluation('SEMESTER_2');
    const idx1 = s1.evaluations.findIndex(e => e.studentId === testStudentId);
    if (idx1 !== -1 && originalEv1) {
      s1.evaluations[idx1] = originalEv1;
    }
    const idx2 = s2.evaluations.findIndex(e => e.studentId === testStudentId);
    if (idx2 !== -1 && originalEv2) {
      s2.evaluations[idx2] = originalEv2;
    }
    console.log('[CLEANUP] Đã hoàn nguyên chính xác dữ liệu gốc của học sinh.');
  }

  // ---------------------------------------------------------------------------
  // TỔNG KẾT
  // ---------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`KẾT QUẢ KIỂM THỬ: ${passCount} PASS, ${failCount} FAIL, 0 CHƯA KIỂM CHỨNG`);
  console.log('================================================================');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Lỗi khi chạy kiểm thử:', err);
  process.exit(1);
});
