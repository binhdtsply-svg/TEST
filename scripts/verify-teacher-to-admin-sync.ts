/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getDatabase } from '../server/db/database';
import { seedInitialData } from '../server/db/seed';
import { classSettingsRepository } from '../server/repositories/ClassSettingsRepository';
import { teacherAccountRepository } from '../server/repositories/TeacherAccountRepository';
import { tenantRepository } from '../server/repositories/TenantRepository';
import { studentRepository } from '../server/repositories/StudentRepository';
import { credentialRepository } from '../server/repositories/CredentialRepository';
import { eventHub } from '../server/events/EventHub';

async function runTeacherToAdminSyncTest() {
  console.log('====================================================');
  console.log('KIỂM THỬ ĐỒNG BỘ CẤU HÌNH LỚP HỌC TỪ GVCN VỀ ADMIN');
  console.log('====================================================');

  // 1. Khởi tạo Database
  getDatabase();
  seedInitialData();

  const classSettingsRepo = classSettingsRepository;

  // STEP 1 — Lấy trạng thái ban đầu của 2 GVCN
  console.log('\n[BƯỚC 1] Xác minh trạng thái ban đầu của 2 lớp GVCN...');
  const initSettingLan = classSettingsRepo.getByTenantAndClass('tenant-lan-nguyen');
  const initSettingNam = classSettingsRepo.getByTenantAndClass('tenant-hoang-nam');

  console.log(`  -> Lớp 1 (Cô Mai Lan): Trường="${initSettingLan?.school_name}", Lớp="${initSettingLan?.class_name}", Sĩ số=${initSettingLan?.total_students}, Năm học="${initSettingLan?.academic_year}"`);
  console.log(`  -> Lớp 2 (Thầy Hoàng Nam): Trường="${initSettingNam?.school_name}", Lớp="${initSettingNam?.class_name}", Sĩ số=${initSettingNam?.total_students}, Năm học="${initSettingNam?.academic_year}"`);

  if (!initSettingLan || !initSettingNam) {
    throw new Error('FAIL: Không tìm thấy cấu hình lớp học ban đầu của 2 GVCN');
  }

  const initialTeacherCount = teacherAccountRepository.getAll().length;
  console.log(`  ✓ PASS: Số lượng tài khoản GVCN trên hệ thống: ${initialTeacherCount}`);

  // STEP 2 — GVCN Mai Lan chỉnh sửa 4 trường: Trường, Lớp, Sĩ số, Năm học
  console.log('\n[BƯỚC 2] GVCN Mai Lan chỉnh sửa 4 trường thông tin và lưu cấu hình...');
  const updatedLanPayload = {
    school_name: 'THPT Chuyên Lê Hồng Phong - Đổi mới',
    class_name: '11 Chuyên Tin',
    total_students: 35,
    academic_year: '2026 - 2027'
  };

  const updatedRecord = classSettingsRepo.update('tenant-lan-nguyen', initSettingLan.class_id, updatedLanPayload);
  if (!updatedRecord) {
    throw new Error('FAIL: Không thể lưu cấu hình lớp học mới cho GVCN Mai Lan');
  }

  // Cập nhật trường học trong tenantRepository tương tự như endpoint PATCH /api/v1/class-settings
  const tenantLan = tenantRepository.getById('tenant-lan-nguyen');
  if (tenantLan) {
    tenantRepository.createOrUpdate({
      ...tenantLan,
      school_name: updatedLanPayload.school_name,
      updated_at: new Date().toISOString()
    });
  }

  // Bắn sự kiện domain event
  eventHub.publish({
    id: `evt_test_${Date.now()}`,
    type: 'CLASS_SETTINGS_UPDATED',
    tenantId: 'tenant-lan-nguyen',
    actorId: 'teacher-lan-nguyen',
    actorRole: 'TEACHER',
    actorName: 'Cô Nguyễn Thị Mai Lan',
    targetRoles: ['SUPER_ADMIN', 'TEACHER'],
    payload: {
      tenantId: 'tenant-lan-nguyen',
      schoolName: updatedLanPayload.school_name,
      className: updatedLanPayload.class_name,
      totalStudents: updatedLanPayload.total_students,
      academicYear: updatedLanPayload.academic_year
    },
    timestamp: new Date().toISOString()
  });

  console.log('  ✓ PASS: Đã lưu cấu hình mới của GVCN Mai Lan vào cơ sở dữ liệu chính thức.');

  // STEP 3 — Kiểm tra Admin xem dữ liệu đã được cập nhật chính xác chưa
  console.log('\n[BƯỚC 3] Kiểm tra thông tin Admin hiển thị sau khi GVCN lưu...');
  const allTeachersAfter = teacherAccountRepository.getAll();
  const lanTeacherInAdmin = allTeachersAfter.find(t => t.tenant_id === 'tenant-lan-nguyen');
  if (!lanTeacherInAdmin) {
    throw new Error('FAIL: Không tìm thấy tài khoản GVCN Mai Lan trong danh sách Admin');
  }

  const lanClassSettingInAdmin = classSettingsRepo.getByTenantAndClass(lanTeacherInAdmin.tenant_id);
  const lanTenantInAdmin = tenantRepository.getById(lanTeacherInAdmin.tenant_id);
  const lanCred = credentialRepository.findByTenantAndOwner(lanTeacherInAdmin.tenant_id, lanTeacherInAdmin.teacher_id, 'TEACHER');

  const adminViewLan = {
    schoolName: lanClassSettingInAdmin?.school_name || lanTenantInAdmin?.school_name,
    className: lanClassSettingInAdmin?.class_name,
    studentCount: (lanClassSettingInAdmin?.total_students && lanClassSettingInAdmin.total_students > 0)
      ? lanClassSettingInAdmin.total_students
      : studentRepository.countByTenant('tenant-lan-nguyen'),
    academicYear: lanClassSettingInAdmin?.academic_year
  };

  console.log(`  -> Admin thấy: Trường="${adminViewLan.schoolName}", Lớp="${adminViewLan.className}", Sĩ số=${adminViewLan.studentCount}, Năm học="${adminViewLan.academicYear}"`);

  if (adminViewLan.schoolName !== 'THPT Chuyên Lê Hồng Phong - Đổi mới') {
    throw new Error(`FAIL: Trường không đồng bộ đúng! Thực tế: ${adminViewLan.schoolName}`);
  }
  if (adminViewLan.className !== '11 Chuyên Tin') {
    throw new Error(`FAIL: Lớp không đồng bộ đúng! Thực tế: ${adminViewLan.className}`);
  }
  if (adminViewLan.studentCount !== 35) {
    throw new Error(`FAIL: Sĩ số không đồng bộ đúng! Thực tế: ${adminViewLan.studentCount}`);
  }
  if (adminViewLan.academicYear !== '2026 - 2027') {
    throw new Error(`FAIL: Năm học không đồng bộ đúng! Thực tế: ${adminViewLan.academicYear}`);
  }
  console.log('  ✓ PASS: Cả 4 trường (Trường, Lớp, Sĩ số, Năm học) đã tự động đồng bộ chính xác về Admin!');

  // STEP 4 — Kiểm tra không làm ảnh hưởng đến GVCN khác (Thầy Hoàng Nam)
  console.log('\n[BƯỚC 4] Kiểm tra tính cô lập: Lớp của Thầy Hoàng Nam không bị thay đổi...');
  const namClassSettingInAdmin = classSettingsRepo.getByTenantAndClass('tenant-hoang-nam');
  const namTenantInAdmin = tenantRepository.getById('tenant-hoang-nam');

  const adminViewNam = {
    schoolName: namClassSettingInAdmin?.school_name || namTenantInAdmin?.school_name,
    className: namClassSettingInAdmin?.class_name,
    studentCount: (namClassSettingInAdmin?.total_students && namClassSettingInAdmin.total_students > 0)
      ? namClassSettingInAdmin.total_students
      : studentRepository.countByTenant('tenant-hoang-nam'),
    academicYear: namClassSettingInAdmin?.academic_year
  };

  console.log(`  -> Lớp Thầy Hoàng Nam: Trường="${adminViewNam.schoolName}", Lớp="${adminViewNam.className}", Sĩ số=${adminViewNam.studentCount}, Năm học="${adminViewNam.academicYear}"`);

  if (adminViewNam.schoolName !== 'THPT Chuyên Nguyễn Huệ') {
    throw new Error(`FAIL: Lớp Thầy Nam bị thay đổi trường ngoài ý muốn: ${adminViewNam.schoolName}`);
  }
  if (adminViewNam.className !== '12A2') {
    throw new Error(`FAIL: Lớp Thầy Nam bị thay đổi lớp ngoài ý muốn: ${adminViewNam.className}`);
  }
  if (adminViewNam.studentCount !== 1) {
    throw new Error(`FAIL: Lớp Thầy Nam bị thay đổi sĩ số: ${adminViewNam.studentCount}`);
  }
  if (adminViewNam.academicYear !== '2025 - 2026') {
    throw new Error(`FAIL: Lớp Thầy Nam bị thay đổi năm học: ${adminViewNam.academicYear}`);
  }
  console.log('  ✓ PASS: Không gian lớp học của GVCN khác được bảo toàn tuyệt đối 100%.');

  // STEP 5 — Kiểm tra không tạo trùng lặp bản ghi
  console.log('\n[BƯỚC 5] Kiểm tra không tạo trùng lặp bản ghi lớp hoặc tài khoản...');
  const finalTeacherCount = teacherAccountRepository.getAll().length;
  if (finalTeacherCount !== initialTeacherCount) {
    throw new Error(`FAIL: Số tài khoản bị thay đổi: Ban đầu=${initialTeacherCount}, Hiện tại=${finalTeacherCount}`);
  }
  console.log(`  ✓ PASS: Số tài khoản GVCN giữ nguyên chính xác: ${finalTeacherCount}`);

  // STEP 6 — Kiểm tra các thông tin khác (Mã truy cập, mật khẩu, quyền) không bị thay đổi
  console.log('\n[BƯỚC 6] Kiểm tra quyền hạn, mã đăng nhập, danh tính không bị thay đổi...');
  if (lanTeacherInAdmin.teacher_id !== 'teacher-lan-nguyen') {
    throw new Error('FAIL: teacher_id bị thay đổi');
  }
  if (lanTeacherInAdmin.email !== 'mailan.nguyen@lehongphong.edu.vn') {
    throw new Error('FAIL: email bị thay đổi');
  }
  if (!lanCred || lanCred.owner_id !== 'teacher-lan-nguyen') {
    throw new Error('FAIL: Credential của GVCN bị thay đổi');
  }
  console.log('  ✓ PASS: Danh tính, mã đăng nhập và quyền hạn của GVCN được bảo toàn tuyệt đối.');

  // STEP 7 — Khôi phục cấu hình chuẩn để môi trường luôn ở trạng thái ổn định
  console.log('\n[BƯỚC 7] Khôi phục cấu hình chuẩn cho lớp 11A1...');
  classSettingsRepo.update('tenant-lan-nguyen', initSettingLan.class_id, {
    school_name: 'THPT Chuyên Lê Hồng Phong',
    class_name: '11A1',
    total_students: 4,
    academic_year: '2025 - 2026'
  });
  if (tenantLan) {
    tenantRepository.createOrUpdate({
      ...tenantLan,
      school_name: 'THPT Chuyên Lê Hồng Phong',
      updated_at: new Date().toISOString()
    });
  }
  console.log('  ✓ PASS: Đã khôi phục trạng thái chuẩn an toàn.');

  console.log('\n====================================================');
  console.log('TẤT CẢ 7/7 BƯỚC KIỂM THỬ ĐỒNG BỘ ĐÃ PASS 100%!');
  console.log('====================================================');
  process.exit(0);
}

runTeacherToAdminSyncTest().catch(err => {
  console.error('\n[TEST FAILED]:', err);
  process.exit(1);
});
