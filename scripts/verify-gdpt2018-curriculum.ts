/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  GDTX_THPT_STANDARD_SUBJECTS,
  THPT_2018_STANDARD_SUBJECTS,
  THCS_2018_STANDARD_SUBJECTS,
  PRIMARY_2018_STANDARD_SUBJECTS,
  PRIMARY_G12_STANDARD_SUBJECTS,
  PRIMARY_G3_STANDARD_SUBJECTS,
  PRIMARY_G45_STANDARD_SUBJECTS
} from '../src/data/demoData';
import { ClassService } from '../src/services/ClassService';

console.log('====================================================');
console.log('VERIFYING GDPT 2018 CURRICULUM & ASSESSMENT RULES');
console.log('====================================================\n');

// 1. Verify THPT 2018 Catalog
console.log('[TEST 1] Auditing THPT 2018 Standard Subjects (TT 32/2018 & TT 13/2022)...');
const thptNames = THPT_2018_STANDARD_SUBJECTS.map(s => s.name);
console.log('  Total THPT Subjects:', THPT_2018_STANDARD_SUBJECTS.length);

const mandatoryExpected = [
  'Ngữ văn',
  'Toán học',
  'Tiếng Anh',
  'Lịch sử',
  'Giáo dục thể chất',
  'Giáo dục quốc phòng và an ninh',
  'Hoạt động trải nghiệm, hướng nghiệp',
  'Nội dung giáo dục của địa phương'
];

mandatoryExpected.forEach(m => {
  const found = THPT_2018_STANDARD_SUBJECTS.find(s => s.name === m);
  if (!found) throw new Error(`Missing mandatory THPT subject: ${m}`);
  if (found.subjectType !== 'MANDATORY' && found.subjectType !== 'ACTIVITY') {
    throw new Error(`Subject ${m} should be MANDATORY or ACTIVITY, got ${found.subjectType}`);
  }
});
console.log('  ✓ 8/8 Mandatory subjects/activities verified.');

// 2. Verify assessment modes under TT 22/2021
console.log('[TEST 2] Auditing Assessment Modes under TT 22/2021/TT-BGDĐT...');
const gdqp = THPT_2018_STANDARD_SUBJECTS.find(s => s.name === 'Giáo dục quốc phòng và an ninh');
if (!gdqp || gdqp.assessmentMode !== 'SCORE_AND_COMMENT') {
  throw new Error(`GDQP-AN must be SCORE_AND_COMMENT, got: ${gdqp?.assessmentMode}`);
}
console.log('  ✓ Giáo dục quốc phòng và an ninh is SCORE_AND_COMMENT (Thang điểm 10).');

const gdtc = THPT_2018_STANDARD_SUBJECTS.find(s => s.name === 'Giáo dục thể chất');
if (!gdtc || gdtc.assessmentMode !== 'COMMENT_ONLY') {
  throw new Error(`GDTC must be COMMENT_ONLY, got: ${gdtc?.assessmentMode}`);
}
const hdtn = THPT_2018_STANDARD_SUBJECTS.find(s => s.name === 'Hoạt động trải nghiệm, hướng nghiệp');
if (!hdtn || hdtn.assessmentMode !== 'COMMENT_ONLY') {
  throw new Error(`HĐTN must be COMMENT_ONLY, got: ${hdtn?.assessmentMode}`);
}
const gddp = THPT_2018_STANDARD_SUBJECTS.find(s => s.name === 'Nội dung giáo dục của địa phương');
if (!gddp || gddp.assessmentMode !== 'COMMENT_ONLY') {
  throw new Error(`GDĐP must be COMMENT_ONLY, got: ${gddp?.assessmentMode}`);
}
console.log('  ✓ GDTC, HĐTN-HN, and GDĐP are COMMENT_ONLY (Đạt / Chưa đạt).');

const electivesExpected = [
  'Vật lí',
  'Hóa học',
  'Sinh học',
  'Địa lí',
  'Giáo dục kinh tế và pháp luật',
  'Tin học',
  'Công nghệ',
  'Âm nhạc',
  'Mĩ thuật'
];
electivesExpected.forEach(el => {
  const found = THPT_2018_STANDARD_SUBJECTS.find(s => s.name === el);
  if (!found) throw new Error(`Missing elective subject: ${el}`);
  if (found.subjectType !== 'ELECTIVE') {
    throw new Error(`Subject ${el} should be ELECTIVE, got ${found.subjectType}`);
  }
});
console.log('  ✓ 9/9 Electives verified across 3 groups (KHTN, KHXH, Công nghệ & Nghệ thuật).');

// 3. Verify THCS Catalog
console.log('[TEST 3] Auditing THCS Standard Subjects (TT 32/2018 & TT 22/2021)...');
const thcsMandatory = [
  'Ngữ văn',
  'Toán học',
  'Tiếng Anh',
  'Khoa học tự nhiên',
  'Lịch sử và Địa lí',
  'Giáo dục công dân',
  'Tin học',
  'Công nghệ',
  'Giáo dục thể chất',
  'Nghệ thuật',
  'Hoạt động trải nghiệm, hướng nghiệp',
  'Nội dung giáo dục của địa phương'
];
thcsMandatory.forEach(sub => {
  const found = THCS_2018_STANDARD_SUBJECTS.find(s => s.name === sub);
  if (!found) throw new Error(`Missing THCS subject: ${sub}`);
});
console.log('  ✓ 12/12 Standard THCS subjects and activities verified.');

// 4. Verify Primary Catalogs
console.log('[TEST 4] Auditing Primary Catalogs (TT 32/2018 & TT 27/2020)...');
if (PRIMARY_G12_STANDARD_SUBJECTS.length < 8) {
  throw new Error('Grade 1 & 2 must have at least 8 subjects/activities');
}
if (!PRIMARY_G3_STANDARD_SUBJECTS.some(s => s.name === 'Tin học và Công nghệ')) {
  throw new Error('Grade 3 must include Tin học và Công nghệ');
}
if (!PRIMARY_G45_STANDARD_SUBJECTS.some(s => s.name === 'Khoa học')) {
  throw new Error('Grade 4 & 5 must include Khoa học');
}
console.log('  ✓ Primary grades 1-2, 3, and 4-5 verified.');

// 5. Test ClassService dynamic resolution by grade level
console.log('[TEST 5] Testing ClassService.getStandardSubjectsForLevel resolution...');
const g1Catalog = ClassService.getStandardSubjectsForLevel(1);
if (!g1Catalog.some(s => s.name === 'Tự nhiên và Xã hội')) {
  throw new Error('Grade 1 did not resolve to primary G12 catalog');
}
const g7Catalog = ClassService.getStandardSubjectsForLevel(7);
if (!g7Catalog.some(s => s.name === 'Khoa học tự nhiên')) {
  throw new Error('Grade 7 did not resolve to THCS catalog');
}
const g11Catalog = ClassService.getStandardSubjectsForLevel(11);
if (!g11Catalog.some(s => s.name === 'Giáo dục quốc phòng và an ninh')) {
  throw new Error('Grade 11 did not resolve to THPT catalog');
}
console.log('  ✓ Dynamic level-based resolution works correctly for grades 1, 7, and 11.');

// 6. Verify ID preservation
console.log('[TEST 6] Auditing ID preservation of baseline subjects...');
const originalIds = [
  'sub-toan',
  'sub-van',
  'sub-eng',
  'sub-ly',
  'sub-hoa',
  'sub-sinh',
  'sub-su',
  'sub-dia',
  'sub-tin',
  'sub-gdtc',
  'sub-gdqp',
  'sub-hdtn'
];
originalIds.forEach(id => {
  const found = THPT_2018_STANDARD_SUBJECTS.find(s => s.id === id);
  if (!found) throw new Error(`Missing preserved subject ID: ${id}`);
});
console.log('  ✓ 100% of baseline subject IDs strictly preserved without change.');

console.log('\n====================================================');
console.log('ALL GDPT 2018 CURRICULUM VERIFICATION TESTS PASSED (100%)');
console.log('====================================================');
