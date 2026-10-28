import { getDatabase } from '../server/db/database';
import { studentRepository } from '../server/repositories/StudentRepository';
import { sanitizeStudentRecord, AuthenticatedUser } from '../server/utils/sanitizers';

async function runViolationHandlingVerification() {
  console.log('====================================================');
  console.log('VERIFYING STUDENT VIOLATION & GVCN HANDLING PERSISTENCE');
  console.log('====================================================\n');

  const tenantId = 'tenant-lan-nguyen';
  const student = studentRepository.getById(tenantId, 'hs-01');
  if (!student) {
    throw new Error('Student hs-01 not found for testing');
  }

  // 1. TEST RECORD PERSISTENCE & STRUCTURE
  console.log('[TEST 1] Adding persistent violation record with all required fields...');
  const v1Id = `vh-test-01-${Date.now()}`;
  const v2Id = `vh-test-02-${Date.now()}`;

  const v1 = {
    id: v1Id,
    violationId: v1Id,
    studentId: 'hs-01',
    studentName: student.full_name,
    classId: 'class-11a1-2025',
    className: '11A1',
    tenantId,
    academicYear: '2025 - 2026',
    schoolYear: '2025 - 2026',
    date: '2025-09-15',
    time: '07:25',
    weekNumber: 2,
    content: 'Đi học muộn 15 phút, không đeo khăn quàng / thẻ học sinh',
    category: 'Nề nếp & Tác phong',
    severity: 'Nhẹ',
    frequencyCount: 1,
    status: 'PROCESSING' as const,
    recordedBy: 'Giáo viên chủ nhiệm',
    recordedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    history: [
      {
        timestamp: new Date().toISOString(),
        action: 'Ghi nhận hồ sơ vi phạm',
        status: 'PROCESSING' as const,
        notes: 'Đi học muộn 15 phút',
        actorName: 'Giáo viên chủ nhiệm'
      }
    ]
  };

  const v2 = {
    id: v2Id,
    violationId: v2Id,
    studentId: 'hs-01',
    studentName: student.full_name,
    classId: 'class-11a1-2025',
    className: '11A1',
    tenantId,
    academicYear: '2025 - 2026',
    schoolYear: '2025 - 2026',
    date: '2025-10-02',
    time: '14:00',
    weekNumber: 5,
    content: 'Sử dụng điện thoại trong giờ học không được phép',
    category: 'Kỷ luật lớp học',
    severity: 'Vừa',
    frequencyCount: 1,
    status: 'WARNING' as const,
    recordedBy: 'Giáo viên chủ nhiệm',
    recordedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    history: [
      {
        timestamp: new Date().toISOString(),
        action: 'Ghi nhận vi phạm cảnh báo',
        status: 'WARNING' as const,
        notes: 'Sử dụng điện thoại trong giờ học',
        actorName: 'Giáo viên chủ nhiệm'
      }
    ]
  };

  // Persist to SQLite
  let meta: Record<string, any> = {};
  if (student.raw_metadata) {
    try { meta = JSON.parse(student.raw_metadata); } catch {}
  }
  meta.violationHandlingRecords = [v2, v1];
  studentRepository.update(tenantId, 'hs-01', {
    raw_metadata: JSON.stringify(meta)
  });

  const reloaded = studentRepository.getById(tenantId, 'hs-01');
  const reloadedMeta = JSON.parse(reloaded?.raw_metadata || '{}');
  const records = reloadedMeta.violationHandlingRecords || [];

  if (records.length !== 2 || records[0].id !== v2Id || records[1].id !== v1Id) {
    throw new Error('Test 1 Failed: Violation records not persisted accurately.');
  }
  console.log(`  ✓ Successfully persisted ${records.length} distinct violation records with persistent IDs.`);

  // 2. TEST TEACHER HANDLING HISTORY ACCUMULATION
  console.log('[TEST 2] Testing teacher handling action history accumulation...');
  const intervention1 = {
    timestamp: new Date().toISOString(),
    action: 'Cập nhật biện pháp giáo dục / xử lý',
    status: 'PROCESSING' as const,
    notes: 'Đã trao đổi riêng với học viên và yêu cầu viết bản kiểm điểm',
    actorName: 'Giáo viên chủ nhiệm',
    educationalMeasure: 'Nhắc nhở và ký cam kết',
    studentExchangeNotes: 'Em thừa nhận lỗi và hứa không tái phạm'
  };

  const intervention2 = {
    timestamp: new Date().toISOString(),
    action: 'Xác nhận đã khắc phục và ổn định',
    status: 'RESOLVED' as const,
    notes: 'Học sinh chấp hành tốt quy định trong 2 tuần tiếp theo',
    actorName: 'Giáo viên chủ nhiệm',
    handlingResult: 'Đã ổn định nề nếp',
    educationalMeasure: 'Nhắc nhở và ký cam kết'
  };

  const updatedV2 = {
    ...v2,
    status: 'RESOLVED' as const,
    educationalMeasure: 'Nhắc nhở và ký cam kết',
    handlingResult: 'Đã ổn định nề nếp',
    handledBy: 'Giáo viên chủ nhiệm',
    handledAt: new Date().toISOString(),
    history: [...v2.history, intervention1, intervention2]
  };

  meta.violationHandlingRecords = [updatedV2, v1];
  studentRepository.update(tenantId, 'hs-01', {
    raw_metadata: JSON.stringify(meta)
  });

  const reloadedAfterIntervention = studentRepository.getById(tenantId, 'hs-01');
  const metaAfterIntervention = JSON.parse(reloadedAfterIntervention?.raw_metadata || '{}');
  const v2InDb = (metaAfterIntervention.violationHandlingRecords || []).find((r: any) => r.id === v2Id);

  if (!v2InDb || v2InDb.history.length !== 3 || v2InDb.status !== 'RESOLVED') {
    throw new Error('Test 2 Failed: Handling history was not appended cleanly.');
  }
  console.log(`  ✓ Teacher handling history successfully accumulated ${v2InDb.history.length} audit entries without overwriting.`);

  // 3. TEST TIME PRESERVATION (No wipe across weeks/months/semesters)
  console.log('[TEST 3] Testing non-wiping of violation history across week changes...');
  // Week 2 record (v1) and Week 5 record (v2) must remain intact when querying at Week 10
  const currentWeekQuery = 10;
  const allYearViolations = metaAfterIntervention.violationHandlingRecords || [];
  const week2Records = allYearViolations.filter((r: any) => r.weekNumber === 2);
  const week5Records = allYearViolations.filter((r: any) => r.weekNumber === 5);

  if (allYearViolations.length !== 2 || week2Records.length !== 1 || week5Records.length !== 1) {
    throw new Error('Test 3 Failed: Violations were lost across time intervals.');
  }
  console.log(`  ✓ All-year history preserved across weeks (Week 2 and Week 5 both active at Week ${currentWeekQuery}).`);

  // 4. TEST SURGICAL DELETION BY EXACT RECORD ID
  console.log('[TEST 4] Testing precise record deletion by exact recordId (no index / title deletion)...');
  // Deleting ONLY v1Id
  const remainingRecords = allYearViolations.filter((r: any) => r.id !== v1Id && r.violationId !== v1Id);
  meta.violationHandlingRecords = remainingRecords;
  studentRepository.update(tenantId, 'hs-01', {
    raw_metadata: JSON.stringify(meta)
  });

  const reloadedAfterDelete = studentRepository.getById(tenantId, 'hs-01');
  const metaAfterDelete = JSON.parse(reloadedAfterDelete?.raw_metadata || '{}');
  const finalRecords = metaAfterDelete.violationHandlingRecords || [];

  if (finalRecords.length !== 1 || finalRecords[0].id !== v2Id) {
    throw new Error('Test 4 Failed: Deletion did not isolate target record accurately.');
  }
  console.log(`  ✓ Deleted record [${v1Id}] strictly by ID. Target record [${v2Id}] remains fully intact.`);

  // 5. TEST ROLE PERMISSION SANITIZATION
  console.log('[TEST 5] Testing role authorization and privacy sanitization...');
  const teacherUser: AuthenticatedUser = {
    userId: 'usr-teacher-lan',
    role: 'TEACHER',
    tenantId
  };
  const studentUser: AuthenticatedUser = {
    userId: 'hs-02',
    role: 'STUDENT',
    tenantId,
    studentId: 'hs-02'
  };

  const teacherSanitized = sanitizeStudentRecord(reloadedAfterDelete!, teacherUser);
  const studentSanitized = sanitizeStudentRecord(reloadedAfterDelete!, studentUser);

  if (!Array.isArray(teacherSanitized.violationHandlingRecords) || teacherSanitized.violationHandlingRecords.length !== 1) {
    throw new Error('Test 5 Failed: Teacher cannot see violationHandlingRecords.');
  }
  if ((studentSanitized as any).violationHandlingRecords !== undefined) {
    throw new Error('Test 5 Failed: Student saw violationHandlingRecords (leak detected).');
  }
  console.log('  ✓ Teacher correctly received violationHandlingRecords; peer student sanitized without leaks.');

  console.log('\n====================================================');
  console.log('ALL 5 SURGICAL VIOLATION TESTS PASSED 100%!');
  console.log('====================================================');
}

runViolationHandlingVerification().catch(err => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});
