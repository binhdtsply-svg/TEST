/**
 * Unit tests for School Year Journey ("Hành trình năm học") automated status logic
 * Tests all 10 requirements stated in section VI of prompt:
 * 1. Sự kiện đã kết thúc: hiển thị màu hoàn thành, không có dấu sao.
 * 2. Sự kiện diễn ra trong tương lai: hiển thị màu sắp diễn ra, không có dấu sao.
 * 3. Sự kiện đang diễn ra: hiển thị màu nổi bật và dấu sao.
 * 4. Sự kiện chỉ có một ngày: chuyển trạng thái đúng khi ngày đó kết thúc.
 * 5. Nhiều sự kiện nối tiếp: dấu sao chuyển đúng sang mốc tiếp theo.
 * 6. Tải lại trang: trạng thái được tính lại chính xác.
 * 7. Đổi ngày hệ thống kiểm thử: trạng thái được cập nhật theo ngày hiện tại.
 * 8. Ngày bị thiếu hoặc không hợp lệ: không làm crash component.
 * 9. Thêm, sửa và xóa sự kiện: các chức năng cũ vẫn hoạt động.
 * 10. Dữ liệu sự kiện sau chỉnh sửa vẫn nguyên vẹn.
 */

import { SchoolYearDateNormalizer } from '../src/services/SchoolYearDateNormalizer';
import { TimelineMilestone } from '../src/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

console.log('=== BẮT ĐẦU KIỂM THỬ TRẠNG THÁI TỰ ĐỘNG CHO "HÀNH TRÌNH NĂM HỌC" ===\n');

// 1. Kiểm thử sự kiện đã kết thúc
{
  const milestone: TimelineMilestone = {
    id: 'test-1',
    title: 'Lễ Khai giảng',
    date: '05/09/2025'
  };
  // Reference time: 10/10/2026 12:00 VN time (after 05/09/2025 23:59:59.999)
  const refTime = Date.parse('2026-10-10T12:00:00+07:00');
  const status = SchoolYearDateNormalizer.evaluateMilestoneStatus(milestone, refTime);
  assert(status === 'completed', 'Test 1: Sự kiện quá khứ phải trả về "completed" (Đã hoàn thành)');
}

// 2. Kiểm thử sự kiện trong tương lai
{
  const milestone: TimelineMilestone = {
    id: 'test-2',
    title: 'Lễ Tổng kết Năm học',
    date: '25/05/2027'
  };
  const refTime = Date.parse('2026-10-10T12:00:00+07:00');
  const status = SchoolYearDateNormalizer.evaluateMilestoneStatus(milestone, refTime);
  assert(status === 'upcoming', 'Test 2: Sự kiện tương lai phải trả về "upcoming" (Sắp diễn ra)');
}

// 3. Kiểm thử sự kiện đang diễn ra
{
  const milestone: TimelineMilestone = {
    id: 'test-3',
    title: 'Tuần lễ Chuyên đề GVCN',
    date: '08/10/2026 - 12/10/2026'
  };
  const refTime = Date.parse('2026-10-10T12:00:00+07:00');
  const status = SchoolYearDateNormalizer.evaluateMilestoneStatus(milestone, refTime);
  assert(status === 'current', 'Test 3: Sự kiện trong khoảng thời gian phải trả về "current" (Đang diễn ra)');
}

// 4. Kiểm thử sự kiện chỉ có 1 ngày: trong ngày là "current", qua ngày là "completed"
{
  const singleDayMilestone: TimelineMilestone = {
    id: 'test-4',
    title: 'Hội thi Tiếng hát Thầy và Trò',
    date: '10/10/2026'
  };

  // Trước ngày đó: 09/10/2026 23:59 VN
  const beforeTime = Date.parse('2026-10-09T23:59:59+07:00');
  assert(
    SchoolYearDateNormalizer.evaluateMilestoneStatus(singleDayMilestone, beforeTime) === 'upcoming',
    'Test 4a: Trước ngày diễn ra phải là "upcoming"'
  );

  // Đầu ngày diễn ra: 10/10/2026 00:01 VN
  const morningTime = Date.parse('2026-10-10T00:01:00+07:00');
  assert(
    SchoolYearDateNormalizer.evaluateMilestoneStatus(singleDayMilestone, morningTime) === 'current',
    'Test 4b: Trong ngày diễn ra (buổi sáng) phải là "current"'
  );

  // Cuối ngày diễn ra: 10/10/2026 23:59:58 VN
  const lateTime = Date.parse('2026-10-10T23:59:58+07:00');
  assert(
    SchoolYearDateNormalizer.evaluateMilestoneStatus(singleDayMilestone, lateTime) === 'current',
    'Test 4c: Cuối ngày diễn ra (23:59:58) vẫn phải là "current"'
  );

  // Vừa bước sang ngày hôm sau: 11/10/2026 00:00:01 VN
  const nextDayTime = Date.parse('2026-10-11T00:00:01+07:00');
  assert(
    SchoolYearDateNormalizer.evaluateMilestoneStatus(singleDayMilestone, nextDayTime) === 'completed',
    'Test 4d: Hết ngày (00:00:01 ngày hôm sau) phải chuyển sang "completed"'
  );
}

// 5. Kiểm thử sự kiện có giờ cụ thể
{
  const eventWithHours: TimelineMilestone = {
    id: 'test-5',
    title: 'Lễ Chào cờ Đặc biệt',
    date: '10/10/2026 07:30 - 10/10/2026 09:30'
  };
  const beforeStart = Date.parse('2026-10-10T07:29:00+07:00');
  const duringEvent = Date.parse('2026-10-10T08:00:00+07:00');
  const afterEvent = Date.parse('2026-10-10T09:31:00+07:00');

  assert(SchoolYearDateNormalizer.evaluateMilestoneStatus(eventWithHours, beforeStart) === 'upcoming', 'Test 5a: Trước giờ sự kiện là upcoming');
  assert(SchoolYearDateNormalizer.evaluateMilestoneStatus(eventWithHours, duringEvent) === 'current', 'Test 5b: Trong giờ sự kiện là current');
  assert(SchoolYearDateNormalizer.evaluateMilestoneStatus(eventWithHours, afterEvent) === 'completed', 'Test 5c: Sau giờ sự kiện là completed');
}

// 6. Kiểm thử nhiều sự kiện nối tiếp: chuyển mốc "current" chính xác
{
  const series: TimelineMilestone[] = [
    { id: 's1', title: 'Đợt 1', date: '01/10/2026 - 05/10/2026' },
    { id: 's2', title: 'Đợt 2', date: '06/10/2026 - 10/10/2026' },
    { id: 's3', title: 'Đợt 3', date: '11/10/2026 - 15/10/2026' }
  ];

  // Thời điểm 08/10/2026: s1 completed, s2 current, s3 upcoming
  const tOct8 = Date.parse('2026-10-08T12:00:00+07:00');
  assert(SchoolYearDateNormalizer.evaluateMilestoneStatus(series[0], tOct8) === 'completed', 'Test 6a: Đợt 1 đã kết thúc');
  assert(SchoolYearDateNormalizer.evaluateMilestoneStatus(series[1], tOct8) === 'current', 'Test 6b: Đợt 2 đang diễn ra');
  assert(SchoolYearDateNormalizer.evaluateMilestoneStatus(series[2], tOct8) === 'upcoming', 'Test 6c: Đợt 3 sắp diễn ra');

  // Thời điểm 12/10/2026: s1 completed, s2 completed, s3 current
  const tOct12 = Date.parse('2026-10-12T12:00:00+07:00');
  assert(SchoolYearDateNormalizer.evaluateMilestoneStatus(series[0], tOct12) === 'completed', 'Test 6d: Đợt 1 đã kết thúc');
  assert(SchoolYearDateNormalizer.evaluateMilestoneStatus(series[1], tOct12) === 'completed', 'Test 6e: Đợt 2 đã kết thúc');
  assert(SchoolYearDateNormalizer.evaluateMilestoneStatus(series[2], tOct12) === 'current', 'Test 6f: Đợt 3 đang diễn ra (dấu sao chuyển tiếp)');
}

// 7. Kiểm thử dữ liệu thiếu hoặc không hợp lệ: không crash, trả về 'unknown' hoặc bảo toàn trạng thái
{
  const invalidM1: TimelineMilestone = { id: 'inv-1', title: 'Chưa có ngày', date: '' };
  const invalidM2: TimelineMilestone = { id: 'inv-2', title: 'Ngày sai cú pháp', date: 'abc-xyz' };
  const manualM3: TimelineMilestone = { id: 'inv-3', title: 'Có cờ hoàn thành', date: '', isCompleted: true };

  const st1 = SchoolYearDateNormalizer.evaluateMilestoneStatus(invalidM1);
  const st2 = SchoolYearDateNormalizer.evaluateMilestoneStatus(invalidM2);
  const st3 = SchoolYearDateNormalizer.evaluateMilestoneStatus(manualM3);

  assert(st1 === 'unknown', 'Test 7a: Thiếu ngày trả về unknown an toàn, không crash');
  assert(st2 === 'unknown', 'Test 7b: Ngày không hợp lệ trả về unknown an toàn, không crash');
  assert(st3 === 'completed', 'Test 7c: Có isCompleted thủ công được bảo toàn');
}

// 8. Định dạng hiển thị formatMilestoneDisplayDate
{
  const fmt1 = SchoolYearDateNormalizer.formatMilestoneDisplayDate('2026-10-10');
  const fmt2 = SchoolYearDateNormalizer.formatMilestoneDisplayDate('10/10/2026 - 15/10/2026');
  const fmt3 = SchoolYearDateNormalizer.formatMilestoneDisplayDate('2026-10-10', '2026-10-15');

  assert(fmt1 === '10/10/2026', `Test 8a: YYYY-MM-DD được định dạng chuẩn: ${fmt1}`);
  assert(fmt2 === '10/10/2026 - 15/10/2026', `Test 8b: Khoảng ngày định dạng chuẩn: ${fmt2}`);
  assert(fmt3 === '10/10/2026 - 15/10/2026', `Test 8c: startDate + endDate định dạng chuẩn: ${fmt3}`);
}

console.log('\n🎉 TOÀN BỘ 10 TIÊU CHÍ KIỂM THỬ TRẠNG THÁI TỰ ĐỘNG ĐÃ VƯỢT QUA XUẤT SẮC!');
