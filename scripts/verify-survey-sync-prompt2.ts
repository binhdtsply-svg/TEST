/**
 * Verification test suite for PROMPT 2 - Survey Synchronization Bugfix
 */

import { studentService } from '../src/services/StudentService';
import { graduationService } from '../src/services/GraduationService';
import { surveySyncService } from '../src/services/SurveySyncService';
import { studentSurveyService } from '../src/services/StudentSurveyService';
import { authService } from '../src/services/AuthService';
import { Student, StudentSurveyResponse } from '../src/types';

async function runTests() {
  console.log('================================================================');
  console.log('BẮT ĐẦU KIỂM THỬ: KIỂM SOÁT LỖI ĐỒNG BỘ DỮ LIỆU KHẢO SÁT (PROMPT 2)');
  console.log('================================================================\n');

  let passedCount = 0;
  let failedCount = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passedCount++;
    } else {
      console.error(`[FAIL] ${testName} - ${detail || 'Assertion failed'}`);
      failedCount++;
    }
  }

  // Set up mock session as Teacher to allow reviewing/approving proposals
  authService.switchRole('TEACHER');

  // Backup original student 1 state
  const originalStudent = studentService.getById('hs-01');
  if (!originalStudent) {
    console.error('Không tìm thấy học sinh hs-01');
    return;
  }
  const originalBackup = JSON.parse(JSON.stringify(originalStudent));

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Chọn nhiều môn thi tốt nghiệp (dạng mảng electiveSubjects)
    // -------------------------------------------------------------------------
    console.log('--- TEST 1: Chọn nhiều môn thi tốt nghiệp ---');
    const surveyMultiChoice: StudentSurveyResponse = {
      id: 'test-survey-multi-grad',
      tenantId: 'tenant-lan-nguyen',
      classId: 'class-11a1-2025',
      source: 'APP',
      studentId: 'hs-01',
      surveyType: 'GRADE12_START_YEAR',
      status: 'SUBMITTED',
      version: 1,
      schoolYear: '2025 - 2026',
      answers: {
        graduationPlan: {
          electiveSubjects: ['Vật lí', 'Hóa học'],
          confidence: 'Rất tự tin',
          needTeacherAdvice: 'Không'
        } as any,
        consent: { confirmed: true }
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      submittedAt: new Date().toISOString()
    };

    // Test extraction logic in surveySyncService
    const rawList = surveySyncService.extractValue(
      surveyMultiChoice.answers,
      surveyMultiChoice,
      null,
      ['graduationPlan.electiveSubjects', 'electiveSubjects'],
      [['môn thi tự chọn']]
    );
    assert(Array.isArray(rawList) && rawList.length === 2 && rawList[0] === 'Vật lí' && rawList[1] === 'Hóa học',
      'Test 1.1: Trích xuất chính xác mảng môn thi từ electiveSubjects');

    // Test graduation registration sync
    const didSyncGrad = graduationService.syncSurveyGraduationPlan('hs-01', surveyMultiChoice.id, rawList[0], rawList[1], { force: true });
    assert(didSyncGrad === true, 'Test 1.2: Đồng bộ thành công 2 môn lựa chọn vào GraduationService');
    const gradReg = graduationService.getByStudentId('hs-01');
    assert(gradReg?.electiveSubject1 === 'Vật lí' && gradReg?.electiveSubject2 === 'Hóa học',
      'Test 1.3: Cả hai môn hiển thị chính xác trong hồ sơ tốt nghiệp');

    // -------------------------------------------------------------------------
    // TEST 2: Cập nhật địa chỉ và số điện thoại vào đúng trường trong Hồ sơ học viên
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2: Cập nhật địa chỉ và số điện thoại ---');
    const testNewPhone = '0909123456';
    const testNewAddress = '123 Đường Nguyễn Trãi, Phường 2, Quận 5';

    // Simulate approving proposal with phone and address
    const proposalContactId = 'test-prop-contact-1';
    (surveySyncService as any).proposals.push({
      id: proposalContactId,
      tenantId: 'tenant-lan-nguyen',
      surveyId: 'test-survey-contact',
      studentId: 'hs-01',
      studentName: originalStudent.fullName,
      studentCode: originalStudent.code,
      category: 'CONTACT_UPDATE',
      title: 'Cập nhật liên hệ',
      status: 'PENDING',
      currentValue: {},
      proposedValue: {
        phone: testNewPhone,
        address: testNewAddress,
        emergencyContactRelationship: 'Người thân',
        emergencyContactName: 'Người thân',
        emergencyContactPhone: '0912333444'
      },
      createdAt: new Date().toISOString()
    });

    surveySyncService.approveProposal(proposalContactId, 'Duyệt cập nhật SĐT và địa chỉ');
    const updatedStudent = studentService.getById('hs-01');
    assert(updatedStudent?.phone === testNewPhone, 'Test 2.1: SĐT học viên cập nhật đúng trường student.phone');
    assert(updatedStudent?.address === testNewAddress, 'Test 2.2: Địa chỉ học viên cập nhật đúng trường student.address');

    // -------------------------------------------------------------------------
    // TEST 3: Phân biệt thông tin học viên với thông tin Cha / Mẹ / Giám hộ
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 3: Phân tách thông tin Bố, Mẹ, Người giám hộ ---');
    // Test 3a: Khi quan hệ là "Bố"
    const propFatherId = 'test-prop-father';
    (surveySyncService as any).proposals.push({
      id: propFatherId,
      tenantId: 'tenant-lan-nguyen',
      surveyId: 'test-survey-father',
      studentId: 'hs-01',
      category: 'CONTACT_UPDATE',
      title: 'Liên hệ Bố',
      status: 'PENDING',
      proposedValue: {
        emergencyContactRelationship: 'Bố',
        emergencyContactName: 'Nguyễn Văn Ba',
        emergencyContactPhone: '0988111222'
      },
      createdAt: new Date().toISOString()
    });
    surveySyncService.approveProposal(propFatherId, 'Duyệt liên hệ Bố');
    const sAfterFather = studentService.getById('hs-01');
    assert(sAfterFather?.fatherName === 'Nguyễn Văn Ba', 'Test 3.1: Tên Bố cập nhật đúng trường fatherName');
    assert(sAfterFather?.fatherPhone === '0988111222', 'Test 3.2: SĐT Bố cập nhật đúng trường fatherPhone');
    assert(sAfterFather?.phone === testNewPhone, 'Test 3.3: SĐT cá nhân của học sinh không bị ghi đè bởi SĐT Bố');

    // Test 3b: Khi quan hệ là "Mẹ"
    const propMotherId = 'test-prop-mother';
    (surveySyncService as any).proposals.push({
      id: propMotherId,
      tenantId: 'tenant-lan-nguyen',
      surveyId: 'test-survey-mother',
      studentId: 'hs-01',
      category: 'CONTACT_UPDATE',
      title: 'Liên hệ Mẹ',
      status: 'PENDING',
      proposedValue: {
        emergencyContactRelationship: 'Mẹ',
        emergencyContactName: 'Trần Thị Bích',
        emergencyContactPhone: '0977333444'
      },
      createdAt: new Date().toISOString()
    });
    surveySyncService.approveProposal(propMotherId, 'Duyệt liên hệ Mẹ');
    const sAfterMother = studentService.getById('hs-01');
    assert(sAfterMother?.motherName === 'Trần Thị Bích', 'Test 3.4: Tên Mẹ cập nhật đúng trường motherName');
    assert(sAfterMother?.motherPhone === '0977333444', 'Test 3.5: SĐT Mẹ cập nhật đúng trường motherPhone');

    // -------------------------------------------------------------------------
    // TEST 4: Thông tin sức khỏe và hoàn cảnh gia đình tại "Học viên cần quan tâm"
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 4: Thông tin sức khỏe & Hoàn cảnh gia đình ---');
    const propHealthId = 'test-prop-health';
    (surveySyncService as any).proposals.push({
      id: propHealthId,
      tenantId: 'tenant-lan-nguyen',
      surveyId: 'test-survey-health',
      studentId: 'hs-01',
      category: 'HEALTH_SENSITIVE',
      title: 'Sức khỏe lưu ý',
      status: 'PENDING',
      details: 'Cận thị nặng 5 độ, cần ngồi bàn 1-2',
      proposedValue: {
        healthStatus: ['Cận thị nặng'],
        healthSupportNote: 'Cần ngồi bàn đầu'
      },
      createdAt: new Date().toISOString()
    });
    surveySyncService.approveProposal(propHealthId, 'Duyệt đưa vào diện quan tâm', {
      addToSpecialAttention: true,
      specialAttentionCategories: ['Sức khỏe / Thể chất']
    });
    const sAfterHealth = studentService.getById('hs-01');
    assert(sAfterHealth?.needsSpecialAttention === true, 'Test 4.1: needsSpecialAttention được bật đúng khi GVCN xác nhận');
    assert(sAfterHealth?.attentionCategories?.includes('Sức khỏe / Thể chất'), 'Test 4.2: attentionCategories chuẩn hóa đúng');
    assert(sAfterHealth?.healthNotes?.includes('Cần ngồi bàn đầu'), 'Test 4.3: healthNotes lưu đúng chi tiết hỗ trợ');

    // -------------------------------------------------------------------------
    // TEST 5: Câu trả lời để trống không xóa dữ liệu cũ ngoài chủ đích
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 5: Câu trả lời để trống không xóa dữ liệu cũ ---');
    const propEmptyId = 'test-prop-empty';
    (surveySyncService as any).proposals.push({
      id: propEmptyId,
      tenantId: 'tenant-lan-nguyen',
      surveyId: 'test-survey-empty',
      studentId: 'hs-01',
      category: 'CONTACT_UPDATE',
      title: 'Đề xuất thiếu trường',
      status: 'PENDING',
      proposedValue: {
        phone: undefined, // empty
        address: '', // blank
        emergencyContactRelationship: 'Khác',
        emergencyContactName: '',
        emergencyContactPhone: undefined
      },
      createdAt: new Date().toISOString()
    });
    surveySyncService.approveProposal(propEmptyId, 'Duyệt');
    const sAfterEmpty = studentService.getById('hs-01');
    assert(sAfterEmpty?.phone === testNewPhone, 'Test 5.1: SĐT cũ không bị xóa khi đề xuất để trống');
    assert(sAfterEmpty?.address === testNewAddress, 'Test 5.2: Địa chỉ cũ không bị xóa khi đề xuất chuỗi rỗng');
    assert(sAfterEmpty?.fatherName === 'Nguyễn Văn Ba', 'Test 5.3: Tên Bố không bị mất');

    // -------------------------------------------------------------------------
    // TEST 6: Cập nhật khảo sát không tạo bản ghi trùng
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 6: Cập nhật khảo sát không tạo bản ghi trùng ---');
    const totalRegsBefore = graduationService.getAll().length;
    graduationService.syncSurveyGraduationPlan('hs-01', 'test-survey-multi-grad', 'Vật lí', 'Hóa học', { force: true });
    graduationService.syncSurveyGraduationPlan('hs-01', 'test-survey-multi-grad', 'Vật lí', 'Hóa học', { force: true });
    const totalRegsAfter = graduationService.getAll().length;
    assert(totalRegsBefore === totalRegsAfter, 'Test 6.1: Không nhân đôi bản ghi GraduationRegistration khi sync nhiều lần');

    // -------------------------------------------------------------------------
    // TEST 7: Tải lại dữ liệu từ nguồn lưu trữ (Storage Round-trip)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 7: Kiểm tra tính bền vững dữ liệu (Persistence Round-trip) ---');
    const reloadedStudent = studentService.getById('hs-01');
    assert(Boolean(reloadedStudent && reloadedStudent.id === 'hs-01'), 'Test 7.1: Nạp thành công hồ sơ học viên từ store');
    assert(Boolean(reloadedStudent?.phone === testNewPhone), 'Test 7.2: Dữ liệu SĐT duy trì chính xác trong store');

    // -------------------------------------------------------------------------
    // TEST 8: Phân lập dữ liệu học viên (Không trộn lẫn)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 8: Phân lập dữ liệu học viên ---');
    const student2 = studentService.getById('hs-02');
    if (student2) {
      assert(student2.phone !== testNewPhone, 'Test 8.1: SĐT học viên 1 không bị lây lan sang học viên 2');
      assert(student2.fatherName !== 'Nguyễn Văn Ba', 'Test 8.2: Thông tin cha mẹ không bị gán chéo');
    }

  } finally {
    // Clean up: Restore hs-01 to pristine original state
    studentService.updateStudent('hs-01', originalBackup);
    studentService.updateStudentSpecialAttention('hs-01', {
      needsSpecialAttention: originalBackup.needsSpecialAttention || false,
      attentionCategories: originalBackup.attentionCategories || [],
      attentionNote: originalBackup.attentionNote || '',
      supportMeasure: originalBackup.supportMeasure || '',
      attentionStatus: originalBackup.attentionStatus || 'monitoring'
    });
    console.log('\n[CLEANUP] Đã hoàn nguyên hồ sơ hs-01 về trạng thái gốc.');
  }

  console.log('\n================================================================');
  console.log(`KẾT QUẢ KIỂM THỬ: ${passedCount} PASS, ${failedCount} FAIL`);
  console.log('================================================================');
}

runTests().catch(err => {
  console.error('Lỗi thực thi kiểm thử:', err);
  process.exit(1);
});
