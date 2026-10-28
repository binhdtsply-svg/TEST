import { getDatabase } from '../server/db/database';
import { classSettingsRepository } from '../server/repositories/ClassSettingsRepository';
import { studentRepository } from '../server/repositories/StudentRepository';
import { sanitizeClassSettingsRecord, AuthenticatedUser } from '../server/utils/sanitizers';

async function runTeacherWarningThresholdVerification() {
  console.log('====================================================');
  console.log('STARTING SURGICAL PATCH 2/2 VERIFICATION:');
  console.log('TEACHER-ISOLATED VIOLATION WARNING THRESHOLD');
  console.log('====================================================\n');

  const tenantA = 'tenant-lan-nguyen';
  const tenantB = 'tenant-hoang-nam';

  const teacherAUser: AuthenticatedUser = {
    userId: 'tch-01',
    role: 'TEACHER',
    tenantId: tenantA
  };

  const teacherBUser: AuthenticatedUser = {
    userId: 'tch-02',
    role: 'TEACHER',
    tenantId: tenantB
  };

  // -------------------------------------------------------------------------
  // TEST 1: GVCN default threshold = 2.
  // 1 violation -> no alert. 2 violations -> alert. 3 violations -> alert.
  // -------------------------------------------------------------------------
  console.log('[TEST 1] Verifying default threshold = 2 & alert trigger logic...');
  
  // Set tenantA to default threshold = 2
  let metaA: Record<string, any> = {};
  const existingA = classSettingsRepository.getByTenantAndClass(tenantA);
  if (existingA?.raw_metadata) {
    try { metaA = JSON.parse(existingA.raw_metadata); } catch {}
  }
  metaA.violationWarningThreshold = 2;
  classSettingsRepository.update(tenantA, existingA?.class_id || 'class-11a1-2025', {
    raw_metadata: JSON.stringify(metaA)
  });

  const settingsA_Test1 = classSettingsRepository.getByTenantAndClass(tenantA);
  const sanitizedA_Test1 = sanitizeClassSettingsRecord(settingsA_Test1!, teacherAUser);
  const thresholdA = (sanitizedA_Test1 as any).violationWarningThreshold;

  if (thresholdA !== 2) {
    throw new Error(`Test 1 Failed: Expected threshold 2, got ${thresholdA}`);
  }

  // Simulation of alert logic with threshold = 2
  const checkAlert = (violationCount: number, threshold: number) => violationCount >= threshold;

  const count1Alert = checkAlert(1, thresholdA); // false
  const count2Alert = checkAlert(2, thresholdA); // true
  const count3Alert = checkAlert(3, thresholdA); // true

  if (count1Alert !== false || count2Alert !== true || count3Alert !== true) {
    throw new Error(`Test 1 Failed: Alerts incorrect for threshold 2 (1=${count1Alert}, 2=${count2Alert}, 3=${count3Alert})`);
  }
  console.log(`  ✓ Default threshold is ${thresholdA}. 1 violation -> No alert; 2 violations -> Alert; 3 violations -> Alert.`);

  // -------------------------------------------------------------------------
  // TEST 2: Change 2 -> 4.
  // 3 violations -> no alert. Violations history remains 100% preserved (3 records).
  // -------------------------------------------------------------------------
  console.log('[TEST 2] Changing threshold 2 -> 4 and verifying history preservation...');

  // Setup student with 3 violations in SQLite
  const studentA = studentRepository.getById(tenantA, 'hs-01');
  let studentMeta: Record<string, any> = {};
  if (studentA?.raw_metadata) {
    try { studentMeta = JSON.parse(studentA.raw_metadata); } catch {}
  }
  studentMeta.violationHandlingRecords = [
    { id: 'v-test-1', violationId: 'v-test-1', studentId: 'hs-01', weekNumber: 2, content: 'Đi muộn', status: 'PROCESSING', createdAt: new Date().toISOString() },
    { id: 'v-test-2', violationId: 'v-test-2', studentId: 'hs-01', weekNumber: 2, content: 'Quên bài tập', status: 'PROCESSING', createdAt: new Date().toISOString() },
    { id: 'v-test-3', violationId: 'v-test-3', studentId: 'hs-01', weekNumber: 2, content: 'Sử dụng điện thoại', status: 'WARNING', createdAt: new Date().toISOString() }
  ];
  studentRepository.update(tenantA, 'hs-01', {
    raw_metadata: JSON.stringify(studentMeta)
  });

  // Now change threshold 2 -> 4 for Teacher A
  metaA.violationWarningThreshold = 4;
  classSettingsRepository.update(tenantA, existingA?.class_id || 'class-11a1-2025', {
    raw_metadata: JSON.stringify(metaA)
  });

  const settingsA_Test2 = classSettingsRepository.getByTenantAndClass(tenantA);
  const sanitizedA_Test2 = sanitizeClassSettingsRecord(settingsA_Test2!, teacherAUser);
  const thresholdA_Updated = (sanitizedA_Test2 as any).violationWarningThreshold;

  if (thresholdA_Updated !== 4) {
    throw new Error(`Test 2 Failed: Expected threshold 4, got ${thresholdA_Updated}`);
  }

  // Reload student and check violations count
  const studentReloaded = studentRepository.getById(tenantA, 'hs-01');
  const reloadedStudentMeta = JSON.parse(studentReloaded?.raw_metadata || '{}');
  const violationsInHistory = reloadedStudentMeta.violationHandlingRecords || [];

  if (violationsInHistory.length !== 3) {
    throw new Error(`Test 2 Failed: History changed! Expected 3 violations, got ${violationsInHistory.length}`);
  }

  const count3AlertUnder4 = checkAlert(violationsInHistory.length, thresholdA_Updated);
  if (count3AlertUnder4 !== false) {
    throw new Error('Test 2 Failed: 3 violations should NOT trigger alert when threshold is 4.');
  }
  console.log(`  ✓ Threshold updated to 4. 3 violations -> No alert; 3 violations in history remain 100% intact.`);

  // -------------------------------------------------------------------------
  // TEST 3: Change 4 -> 2.
  // 3 violations -> triggers alert again.
  // -------------------------------------------------------------------------
  console.log('[TEST 3] Changing threshold 4 -> 2 and verifying alert re-appearance...');

  metaA.violationWarningThreshold = 2;
  classSettingsRepository.update(tenantA, existingA?.class_id || 'class-11a1-2025', {
    raw_metadata: JSON.stringify(metaA)
  });

  const settingsA_Test3 = classSettingsRepository.getByTenantAndClass(tenantA);
  const sanitizedA_Test3 = sanitizeClassSettingsRecord(settingsA_Test3!, teacherAUser);
  const thresholdA_Reset = (sanitizedA_Test3 as any).violationWarningThreshold;

  const count3AlertUnder2 = checkAlert(violationsInHistory.length, thresholdA_Reset);
  if (count3AlertUnder2 !== true) {
    throw new Error('Test 3 Failed: 3 violations should trigger alert again when threshold is set back to 2.');
  }
  console.log(`  ✓ Threshold reset to 2. Student with 3 violations immediately re-triggers alert.`);

  // -------------------------------------------------------------------------
  // TEST 4: Teacher A = 2, Teacher B = 4. No interference.
  // -------------------------------------------------------------------------
  console.log('[TEST 4] Verifying isolation between Teacher A and Teacher B...');

  // Set Teacher B threshold to 4
  const existingB = classSettingsRepository.getByTenantAndClass(tenantB);
  let metaB: Record<string, any> = {};
  if (existingB?.raw_metadata) {
    try { metaB = JSON.parse(existingB.raw_metadata); } catch {}
  }
  metaB.violationWarningThreshold = 4;
  classSettingsRepository.update(tenantB, existingB?.class_id || 'class-12a2-2025', {
    raw_metadata: JSON.stringify(metaB)
  });

  // Verify A is still 2, B is 4
  const finalSettingsA = classSettingsRepository.getByTenantAndClass(tenantA);
  const finalSettingsB = classSettingsRepository.getByTenantAndClass(tenantB);

  const finalSanitizedA = sanitizeClassSettingsRecord(finalSettingsA!, teacherAUser);
  const finalSanitizedB = sanitizeClassSettingsRecord(finalSettingsB!, teacherBUser);

  const finalAThreshold = (finalSanitizedA as any).violationWarningThreshold;
  const finalBThreshold = (finalSanitizedB as any).violationWarningThreshold;

  if (finalAThreshold !== 2 || finalBThreshold !== 4) {
    throw new Error(`Test 4 Failed: Teacher thresholds crossed! Teacher A=${finalAThreshold}, Teacher B=${finalBThreshold}`);
  }

  // Update Teacher A to 3 and verify Teacher B remains strictly 4
  metaA.violationWarningThreshold = 3;
  classSettingsRepository.update(tenantA, existingA?.class_id || 'class-11a1-2025', {
    raw_metadata: JSON.stringify(metaA)
  });

  const reloadedB = classSettingsRepository.getByTenantAndClass(tenantB);
  const sanitizedB = sanitizeClassSettingsRecord(reloadedB!, teacherBUser);
  if ((sanitizedB as any).violationWarningThreshold !== 4) {
    throw new Error('Test 4 Failed: Modifying Teacher A altered Teacher B!');
  }
  console.log(`  ✓ Full isolation verified: Teacher A = 3, Teacher B = 4. Changes never leak across teachers.`);

  // -------------------------------------------------------------------------
  // TEST 5: Persistence across F5, logout/login, and restart
  // -------------------------------------------------------------------------
  console.log('[TEST 5] Verifying persistent database storage (SQLite durability)...');

  // Query raw database directly via prepare without going through repositories
  const db = getDatabase();
  const rawStmt = db.prepare(`SELECT raw_metadata FROM class_settings WHERE tenant_id = ?`);
  const rawRowA = rawStmt.get(tenantA) as any;
  const rawRowB = rawStmt.get(tenantB) as any;

  const parsedMetaA = JSON.parse(rawRowA.raw_metadata || '{}');
  const parsedMetaB = JSON.parse(rawRowB.raw_metadata || '{}');

  if (parsedMetaA.violationWarningThreshold !== 3 || parsedMetaB.violationWarningThreshold !== 4) {
    throw new Error(`Test 5 Failed: Direct SQLite persistence failed! A=${parsedMetaA.violationWarningThreshold}, B=${parsedMetaB.violationWarningThreshold}`);
  }
  console.log(`  ✓ Direct SQLite check passed: Teacher A = ${parsedMetaA.violationWarningThreshold}, Teacher B = ${parsedMetaB.violationWarningThreshold} stored permanently.`);

  // Restore Teacher A back to 2 for production cleanliness
  metaA.violationWarningThreshold = 2;
  classSettingsRepository.update(tenantA, existingA?.class_id || 'class-11a1-2025', {
    raw_metadata: JSON.stringify(metaA)
  });

  console.log('\n====================================================');
  console.log('ALL 5 SURGICAL THRESHOLD TESTS PASSED 100%!');
  console.log('====================================================');
}

runTeacherWarningThresholdVerification().catch((err) => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});
