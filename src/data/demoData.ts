/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Student,
  ClassSettings,
  SubjectConfig,
  DayTimetable,
  TimetableVersion,
  Post,
  PointRuleConfig,
  PointTransaction,
  LaurelTree,
  AcademicRecord,
  UserAccount,
  LessonAssignment,
  ExamSchedule,
  CareerProfile,
  AlbumPost,
  ParentConversation,
  TimelineMilestone,
  ClassGoal,
  PersonalGoal,
  PinnedItem,
  AuditLog,
  AdjustmentReport
} from '../types';

export const initialStudents: Student[] = [
  {
    "id": "hs-01",
    "tenantId": "tenant-lan-nguyen",
    "classId": "class-11a1-2025",
    "code": "GH982",
    "anonymousCode": "ANON-HZGE2",
    "fullName": "Nguyễn Gia Huy",
    "gender": "Nam",
    "dob": "2008-04-12",
    "group": 1,
    "officerRole": "Lớp trưởng",
    "avatar": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "phone": "0912 345 001",
    "email": "giahuy.nguyen@lhp.edu.vn",
    "address": "128 Nguyễn Trãi, Phường 3, Quận 5, TP.HCM",
    "fatherName": "Nguyễn Gia Hùng",
    "fatherPhone": "0903 123 456",
    "fatherJob": "Kỹ sư Xây dựng",
    "motherName": "Trần Thị Thu Hà",
    "motherPhone": "0903 654 321",
    "motherJob": "Dược sĩ",
    "healthNotes": "Cận thị 2.5 độ, cần ngồi 3 bàn đầu",
    "talents": "Lập trình Web, Thuyết trình Tiếng Anh",
    "privateTeacherNotes": "Học sinh có tố chất lãnh đạo, học lực xuất sắc, gương mẫu.",
    "needsSpecialAttention": false,
    "attentionCategories": null,
    "attentionNote": null,
    "supportMeasure": null,
    "attentionStatus": "monitoring",
    "attentionStartedAt": null,
    "attentionUpdatedAt": null,
    "attentionUpdatedBy": null,
    "status": "Đang học",
    "studentActivationToken": "STU-GH982",
    "parentActivationToken": "PAR-GH982",
    "violationHandlingRecords": []
  },
  {
    "id": "hs-02",
    "tenantId": "tenant-lan-nguyen",
    "classId": "class-11a1-2025",
    "code": "TT415",
    "anonymousCode": "ANON-HWWLM",
    "fullName": "Trần Thị Mai",
    "gender": "Nữ",
    "dob": "2008-08-20",
    "group": 1,
    "officerRole": "Lớp phó Học tập",
    "avatar": null,
    "phone": "0912 345 002",
    "email": "thimai.tran@lhp.edu.vn",
    "address": "45 An Dương Vương, Phường 8, Quận 5, TP.HCM",
    "fatherName": "Trần Văn Bình",
    "fatherPhone": "0908 111 222",
    "fatherJob": "Bác sĩ",
    "motherName": "Lê Thị Mỹ Hạnh",
    "motherPhone": "0908 333 444",
    "motherJob": "Giáo viên",
    "healthNotes": "Sức khỏe tốt",
    "talents": "Viết văn, Thuyết trình văn học, Vẽ tranh",
    "privateTeacherNotes": "Chăm chỉ, học đều các môn, hỗ trợ lớp phó học tập chu đáo.",
    "needsSpecialAttention": false,
    "attentionCategories": null,
    "attentionNote": null,
    "supportMeasure": null,
    "attentionStatus": "monitoring",
    "attentionStartedAt": null,
    "attentionUpdatedAt": null,
    "attentionUpdatedBy": null,
    "status": "Đang học",
    "studentActivationToken": "STU-TT415",
    "parentActivationToken": "PAR-TT415",
    "violationHandlingRecords": []
  },
  {
    "id": "hs-04",
    "tenantId": "tenant-lan-nguyen",
    "classId": "class-11a1-2025",
    "code": "MD104",
    "anonymousCode": "ANON-G2WQU",
    "fullName": "Phạm Minh Đức",
    "gender": "Nam",
    "dob": "2008-01-15",
    "group": 2,
    "officerRole": "Thành viên",
    "avatar": null,
    "phone": "0912 345 004",
    "email": "minhduc.pham@lhp.edu.vn",
    "address": "89 Hùng Vương, Phường 4, Quận 5, TP.HCM",
    "fatherName": "Phạm Văn Long",
    "fatherPhone": "0913 777 888",
    "fatherJob": "Kinh doanh",
    "motherName": "Phạm Hồng Nhung",
    "motherPhone": "0913 999 000",
    "motherJob": "Kế toán",
    "healthNotes": "Thể lực tốt",
    "talents": "Bóng đá, Đàn guitar, Hoạt náo viên",
    "privateTeacherNotes": "Năng nổ, nhiệt tình trong mọi hoạt động.",
    "needsSpecialAttention": false,
    "attentionCategories": null,
    "attentionNote": null,
    "supportMeasure": null,
    "attentionStatus": "monitoring",
    "attentionStartedAt": null,
    "attentionUpdatedAt": null,
    "attentionUpdatedBy": null,
    "status": "Đang học",
    "studentActivationToken": "STU-MD104",
    "parentActivationToken": "PAR-MD104",
    "violationHandlingRecords": []
  },
  {
    "id": "hs-05",
    "tenantId": "tenant-lan-nguyen",
    "classId": "class-11a1-2025",
    "code": "HN921",
    "anonymousCode": "ANON-VAR6S",
    "fullName": "Hoàng Nam",
    "gender": "Nam",
    "dob": "2008-11-05",
    "group": 3,
    "officerRole": "Thành viên",
    "avatar": null,
    "phone": "0912 345 005",
    "email": "hoangnam.hn@lhp.edu.vn",
    "address": "210 Trần Hưng Đạo, Quận 1, TP.HCM",
    "fatherName": "Hoàng Văn Thắng",
    "fatherPhone": "0909 555 666",
    "fatherJob": "Cán bộ công chức",
    "motherName": "Vũ Bích Ngọc",
    "motherPhone": "0909 777 888",
    "motherJob": "Giáo viên",
    "healthNotes": "Sức khỏe ổn định",
    "talents": "Cờ vua, Lập trình Robotics",
    "privateTeacherNotes": "Ngoan ngoãn, ham học hỏi, cần thêm tự tin phát biểu trước lớp.",
    "needsSpecialAttention": false,
    "attentionCategories": null,
    "attentionNote": null,
    "supportMeasure": null,
    "attentionStatus": "monitoring",
    "attentionStartedAt": null,
    "attentionUpdatedAt": null,
    "attentionUpdatedBy": null,
    "status": "Đang học",
    "studentActivationToken": "STU-HN921",
    "parentActivationToken": "PAR-HN921",
    "violationHandlingRecords": []
  },
  {
    "id": "hs-03",
    "tenantId": "tenant-lan-nguyen",
    "classId": "class-11a1-2025",
    "code": "HS03",
    "anonymousCode": "ANON-V47TE",
    "fullName": "Lê Hoàng Long",
    "gender": "Nam",
    "dob": "2008-05-15",
    "group": 1,
    "officerRole": "Bí thư Chi đoàn",
    "avatar": null,
    "phone": "0912 345 678",
    "email": "hs-03@lhp.edu.vn",
    "address": "TP. Hồ Chí Minh",
    "fatherName": "",
    "fatherPhone": "",
    "fatherJob": "",
    "motherName": "",
    "motherPhone": "",
    "motherJob": "",
    "healthNotes": "",
    "talents": "",
    "privateTeacherNotes": "",
    "needsSpecialAttention": false,
    "attentionCategories": null,
    "attentionNote": null,
    "supportMeasure": null,
    "attentionStatus": "monitoring",
    "attentionStartedAt": null,
    "attentionUpdatedAt": null,
    "attentionUpdatedBy": null,
    "status": "Đang học",
    "studentActivationToken": "STU-HS03",
    "parentActivationToken": "PAR-HS03",
    "violationHandlingRecords": []
  },
  {
    "id": "hs-06",
    "tenantId": "tenant-lan-nguyen",
    "classId": "class-11a1-2025",
    "code": "HS06",
    "anonymousCode": "ANON-YSV6T",
    "fullName": "Vũ Thu Trang",
    "gender": "Nữ",
    "dob": "2008-11-05",
    "group": 2,
    "officerRole": "Thành viên",
    "avatar": null,
    "phone": "0912 345 678",
    "email": "hs-06@lhp.edu.vn",
    "address": "TP. Hồ Chí Minh",
    "fatherName": "",
    "fatherPhone": "",
    "fatherJob": "",
    "motherName": "",
    "motherPhone": "",
    "motherJob": "",
    "healthNotes": "",
    "talents": "",
    "privateTeacherNotes": "",
    "needsSpecialAttention": false,
    "attentionCategories": null,
    "attentionNote": null,
    "supportMeasure": null,
    "attentionStatus": "monitoring",
    "attentionStartedAt": null,
    "attentionUpdatedAt": null,
    "attentionUpdatedBy": null,
    "status": "Đang học",
    "studentActivationToken": "STU-HS06",
    "parentActivationToken": "PAR-HS06",
    "violationHandlingRecords": []
  },
  {
    "id": "hs-07",
    "tenantId": "tenant-lan-nguyen",
    "classId": "class-11a1-2025",
    "code": "HS07",
    "anonymousCode": "ANON-RXKYA",
    "fullName": "Bùi Đức Trọng",
    "gender": "Nam",
    "dob": "2008-07-18",
    "group": 3,
    "officerRole": "Tổ trưởng Tổ 2",
    "avatar": null,
    "phone": "0912 345 678",
    "email": "hs-07@lhp.edu.vn",
    "address": "TP. Hồ Chí Minh",
    "fatherName": "",
    "fatherPhone": "",
    "fatherJob": "",
    "motherName": "",
    "motherPhone": "",
    "motherJob": "",
    "healthNotes": "",
    "talents": "",
    "privateTeacherNotes": "",
    "needsSpecialAttention": false,
    "attentionCategories": null,
    "attentionNote": null,
    "supportMeasure": null,
    "attentionStatus": "monitoring",
    "attentionStartedAt": null,
    "attentionUpdatedAt": null,
    "attentionUpdatedBy": null,
    "status": "Đang học",
    "studentActivationToken": "STU-HS07",
    "parentActivationToken": "PAR-HS07",
    "violationHandlingRecords": []
  },
  {
    "id": "hs-08",
    "tenantId": "tenant-lan-nguyen",
    "classId": "class-11a1-2025",
    "code": "HS08",
    "anonymousCode": "ANON-YQS3S",
    "fullName": "Hoàng Lan Hương",
    "gender": "Nữ",
    "dob": "2008-02-28",
    "group": 3,
    "officerRole": "Thành viên",
    "avatar": null,
    "phone": "0912 345 678",
    "email": "hs-08@lhp.edu.vn",
    "address": "TP. Hồ Chí Minh",
    "fatherName": "",
    "fatherPhone": "",
    "fatherJob": "",
    "motherName": "",
    "motherPhone": "",
    "motherJob": "",
    "healthNotes": "",
    "talents": "",
    "privateTeacherNotes": "",
    "needsSpecialAttention": false,
    "attentionCategories": null,
    "attentionNote": null,
    "supportMeasure": null,
    "attentionStatus": "monitoring",
    "attentionStartedAt": null,
    "attentionUpdatedAt": null,
    "attentionUpdatedBy": null,
    "status": "Đang học",
    "studentActivationToken": "STU-HS08",
    "parentActivationToken": "PAR-HS08",
    "violationHandlingRecords": []
  },
  {
    "id": "hs-09",
    "tenantId": "tenant-lan-nguyen",
    "classId": "class-11a1-2025",
    "code": "HS09",
    "anonymousCode": "ANON-8U8PP",
    "fullName": "Đinh Quang Hải",
    "gender": "Nam",
    "dob": "2008-10-10",
    "group": 3,
    "officerRole": "Tổ trưởng Tổ 3",
    "avatar": null,
    "phone": "0912 345 678",
    "email": "hs-09@lhp.edu.vn",
    "address": "TP. Hồ Chí Minh",
    "fatherName": "",
    "fatherPhone": "",
    "fatherJob": "",
    "motherName": "",
    "motherPhone": "",
    "motherJob": "",
    "healthNotes": "",
    "talents": "",
    "privateTeacherNotes": "",
    "needsSpecialAttention": false,
    "attentionCategories": null,
    "attentionNote": null,
    "supportMeasure": null,
    "attentionStatus": "monitoring",
    "attentionStartedAt": null,
    "attentionUpdatedAt": null,
    "attentionUpdatedBy": null,
    "status": "Đang học",
    "studentActivationToken": "STU-HS09",
    "parentActivationToken": "PAR-HS09",
    "violationHandlingRecords": []
  },
  {
    "id": "hs-10",
    "tenantId": "tenant-lan-nguyen",
    "classId": "class-11a1-2025",
    "code": "HS10",
    "anonymousCode": "ANON-BBRRD",
    "fullName": "Ngô Thùy Chi",
    "gender": "Nữ",
    "dob": "2008-12-03",
    "group": 4,
    "officerRole": "Thành viên",
    "avatar": null,
    "phone": "0912 345 678",
    "email": "hs-10@lhp.edu.vn",
    "address": "TP. Hồ Chí Minh",
    "fatherName": "",
    "fatherPhone": "",
    "fatherJob": "",
    "motherName": "",
    "motherPhone": "",
    "motherJob": "",
    "healthNotes": "",
    "talents": "",
    "privateTeacherNotes": "",
    "needsSpecialAttention": false,
    "attentionCategories": null,
    "attentionNote": null,
    "supportMeasure": null,
    "attentionStatus": "monitoring",
    "attentionStartedAt": null,
    "attentionUpdatedAt": null,
    "attentionUpdatedBy": null,
    "status": "Đang học",
    "studentActivationToken": "STU-HS10",
    "parentActivationToken": "PAR-HS10",
    "violationHandlingRecords": []
  },
  {
    "id": "hs-11",
    "tenantId": "tenant-lan-nguyen",
    "classId": "class-11a1-2025",
    "code": "HS11",
    "anonymousCode": "ANON-CZT66",
    "fullName": "Dương Bảo Nam",
    "gender": "Nam",
    "dob": "2008-06-22",
    "group": 4,
    "officerRole": "Tổ trưởng Tổ 4",
    "avatar": null,
    "phone": "0912 345 678",
    "email": "hs-11@lhp.edu.vn",
    "address": "TP. Hồ Chí Minh",
    "fatherName": "",
    "fatherPhone": "",
    "fatherJob": "",
    "motherName": "",
    "motherPhone": "",
    "motherJob": "",
    "healthNotes": "",
    "talents": "",
    "privateTeacherNotes": "",
    "needsSpecialAttention": false,
    "attentionCategories": null,
    "attentionNote": null,
    "supportMeasure": null,
    "attentionStatus": "monitoring",
    "attentionStartedAt": null,
    "attentionUpdatedAt": null,
    "attentionUpdatedBy": null,
    "status": "Đang học",
    "studentActivationToken": "STU-HS11",
    "parentActivationToken": "PAR-HS11",
    "violationHandlingRecords": []
  },
  {
    "id": "hs-12",
    "tenantId": "tenant-lan-nguyen",
    "classId": "class-11a1-2025",
    "code": "HS12",
    "anonymousCode": "ANON-4V43R",
    "fullName": "Trịnh Mỹ Duyên",
    "gender": "Nữ",
    "dob": "2008-04-09",
    "group": 4,
    "officerRole": "Thành viên",
    "avatar": null,
    "phone": "0912 345 678",
    "email": "hs-12@lhp.edu.vn",
    "address": "TP. Hồ Chí Minh",
    "fatherName": "",
    "fatherPhone": "",
    "fatherJob": "",
    "motherName": "",
    "motherPhone": "",
    "motherJob": "",
    "healthNotes": "",
    "talents": "",
    "privateTeacherNotes": "",
    "needsSpecialAttention": false,
    "attentionCategories": null,
    "attentionNote": null,
    "supportMeasure": null,
    "attentionStatus": "monitoring",
    "attentionStartedAt": null,
    "attentionUpdatedAt": null,
    "attentionUpdatedBy": null,
    "status": "Đang học",
    "studentActivationToken": "STU-HS12",
    "parentActivationToken": "PAR-HS12",
    "violationHandlingRecords": []
  },
  {
    "id": "hs-13",
    "tenantId": "tenant-lan-nguyen",
    "classId": "class-11a1-2025",
    "code": "HS13",
    "anonymousCode": "ANON-SR9G5",
    "fullName": "Lý Gia Bảo",
    "gender": "Nam",
    "dob": "2008-01-17",
    "group": 1,
    "officerRole": "Thành viên",
    "avatar": null,
    "phone": "0912 345 678",
    "email": "hs-13@lhp.edu.vn",
    "address": "TP. Hồ Chí Minh",
    "fatherName": "",
    "fatherPhone": "",
    "fatherJob": "",
    "motherName": "",
    "motherPhone": "",
    "motherJob": "",
    "healthNotes": "",
    "talents": "",
    "privateTeacherNotes": "",
    "needsSpecialAttention": false,
    "attentionCategories": null,
    "attentionNote": null,
    "supportMeasure": null,
    "attentionStatus": "monitoring",
    "attentionStartedAt": null,
    "attentionUpdatedAt": null,
    "attentionUpdatedBy": null,
    "status": "Đang học",
    "studentActivationToken": "STU-HS13",
    "parentActivationToken": "PAR-HS13",
    "violationHandlingRecords": []
  },
  {
    "id": "hs-14",
    "tenantId": "tenant-lan-nguyen",
    "classId": "class-11a1-2025",
    "code": "HS14",
    "anonymousCode": "ANON-WB7NL",
    "fullName": "Mai Cẩm Vân",
    "gender": "Nữ",
    "dob": "2008-08-30",
    "group": 2,
    "officerRole": "Thành viên",
    "avatar": null,
    "phone": "0912 345 678",
    "email": "hs-14@lhp.edu.vn",
    "address": "TP. Hồ Chí Minh",
    "fatherName": "",
    "fatherPhone": "",
    "fatherJob": "",
    "motherName": "",
    "motherPhone": "",
    "motherJob": "",
    "healthNotes": "",
    "talents": "",
    "privateTeacherNotes": "",
    "needsSpecialAttention": false,
    "attentionCategories": null,
    "attentionNote": null,
    "supportMeasure": null,
    "attentionStatus": "monitoring",
    "attentionStartedAt": null,
    "attentionUpdatedAt": null,
    "attentionUpdatedBy": null,
    "status": "Đang học",
    "studentActivationToken": "STU-HS14",
    "parentActivationToken": "PAR-HS14",
    "violationHandlingRecords": []
  }
];

export const initialTeacher2Students: Student[] = [
  {
    "id": "hs-12a2-01",
    "tenantId": "tenant-hoang-nam",
    "classId": "class-12a2-2025",
    "code": "HMT12",
    "anonymousCode": "ANON-S54H5",
    "fullName": "Hoàng Minh Tuấn",
    "gender": "Nam",
    "dob": "2007-05-10",
    "group": 1,
    "officerRole": "Lớp trưởng",
    "avatar": null,
    "phone": "0988 123 456",
    "email": "minhtuan.hoang@nguyenhue.edu.vn",
    "address": "56 Quang Trung, Hà Đông, Hà Nội",
    "fatherName": "Hoàng Văn Dũng",
    "fatherPhone": "0988 666 777",
    "fatherJob": "Kỹ sư viễn thông",
    "motherName": "Nguyễn Thu Thủy",
    "motherPhone": "0988 888 999",
    "motherJob": "Bác sĩ",
    "healthNotes": "Tốt",
    "talents": "Toán học Olympic, Bóng rổ",
    "privateTeacherNotes": "Lớp trưởng gương mẫu lớp 12A2, năng lực học tập vững vàng.",
    "needsSpecialAttention": false,
    "attentionCategories": null,
    "attentionNote": null,
    "supportMeasure": null,
    "attentionStatus": "monitoring",
    "attentionStartedAt": null,
    "attentionUpdatedAt": null,
    "attentionUpdatedBy": null,
    "status": "Đang học",
    "studentActivationToken": "STU-HMT12",
    "parentActivationToken": "PAR-HMT12",
    "violationHandlingRecords": []
  },
  {
    "id": "tch2-stu-01",
    "tenantId": "tenant-hoang-nam",
    "classId": "class-12a2-2025",
    "code": "12A2-01",
    "anonymousCode": "ANON-CPAR3",
    "fullName": "Phan Hoàng Yến",
    "gender": "Nữ",
    "dob": "2007-03-12",
    "group": 1,
    "officerRole": "Lớp trưởng",
    "avatar": null,
    "phone": "",
    "email": "",
    "address": "",
    "fatherName": "",
    "fatherPhone": "",
    "fatherJob": "",
    "motherName": "",
    "motherPhone": "",
    "motherJob": "",
    "healthNotes": "",
    "talents": "",
    "privateTeacherNotes": "",
    "needsSpecialAttention": false,
    "attentionCategories": null,
    "attentionNote": null,
    "supportMeasure": null,
    "attentionStatus": "monitoring",
    "attentionStartedAt": null,
    "attentionUpdatedAt": null,
    "attentionUpdatedBy": null,
    "status": "Đang học",
    "studentActivationToken": "STU-12A2-01",
    "parentActivationToken": "PAR-12A2-01",
    "violationHandlingRecords": []
  }
];

export const THPT_2018_STANDARD_SUBJECTS: SubjectConfig[] = [
  {
    "id": "sub-van",
    "code": "VAN",
    "subjectCode": "VAN",
    "name": "Ngữ văn",
    "subjectType": "MANDATORY",
    "assessmentMode": "SCORE_AND_COMMENT",
    "coefficient": 2,
    "periodsPerWeek": 4,
    "selected": true
  },
  {
    "id": "sub-toan",
    "code": "TOAN",
    "subjectCode": "TOAN",
    "name": "Toán học",
    "subjectType": "MANDATORY",
    "assessmentMode": "SCORE_AND_COMMENT",
    "coefficient": 2,
    "periodsPerWeek": 4,
    "selected": true
  },
  {
    "id": "sub-eng",
    "code": "ENG",
    "subjectCode": "ENG",
    "name": "Tiếng Anh",
    "subjectType": "MANDATORY",
    "assessmentMode": "SCORE_AND_COMMENT",
    "coefficient": 2,
    "periodsPerWeek": 3,
    "selected": true
  },
  {
    "id": "sub-su",
    "code": "SU",
    "subjectCode": "SU",
    "name": "Lịch sử",
    "subjectType": "MANDATORY",
    "assessmentMode": "SCORE_AND_COMMENT",
    "coefficient": 1,
    "periodsPerWeek": 2,
    "selected": true
  },
  {
    "id": "sub-gdtc",
    "code": "GDTC",
    "subjectCode": "GDTC",
    "name": "Giáo dục thể chất",
    "subjectType": "MANDATORY",
    "assessmentMode": "COMMENT_ONLY",
    "coefficient": 1,
    "periodsPerWeek": 2,
    "selected": true
  },
  {
    "id": "sub-gdqp",
    "code": "GDQP",
    "subjectCode": "GDQP",
    "name": "Giáo dục quốc phòng và an ninh",
    "subjectType": "MANDATORY",
    "assessmentMode": "SCORE_AND_COMMENT",
    "coefficient": 1,
    "periodsPerWeek": 1,
    "selected": true
  },
  {
    "id": "sub-hdtn",
    "code": "HDTN",
    "subjectCode": "HDTN",
    "name": "Hoạt động trải nghiệm, hướng nghiệp",
    "subjectType": "ACTIVITY",
    "assessmentMode": "COMMENT_ONLY",
    "coefficient": 1,
    "periodsPerWeek": 3,
    "selected": true
  },
  {
    "id": "sub-gddp",
    "code": "GDDP",
    "subjectCode": "GDDP",
    "name": "Nội dung giáo dục của địa phương",
    "subjectType": "MANDATORY",
    "assessmentMode": "COMMENT_ONLY",
    "coefficient": 1,
    "periodsPerWeek": 1,
    "selected": true
  },
  {
    "id": "sub-ly",
    "code": "LY",
    "subjectCode": "LY",
    "name": "Vật lí",
    "subjectType": "ELECTIVE",
    "assessmentMode": "SCORE_AND_COMMENT",
    "coefficient": 1,
    "periodsPerWeek": 2,
    "selected": true
  },
  {
    "id": "sub-hoa",
    "code": "HOA",
    "subjectCode": "HOA",
    "name": "Hóa học",
    "subjectType": "ELECTIVE",
    "assessmentMode": "SCORE_AND_COMMENT",
    "coefficient": 1,
    "periodsPerWeek": 2,
    "selected": true
  },
  {
    "id": "sub-sinh",
    "code": "SINH",
    "subjectCode": "SINH",
    "name": "Sinh học",
    "subjectType": "ELECTIVE",
    "assessmentMode": "SCORE_AND_COMMENT",
    "coefficient": 1,
    "periodsPerWeek": 2,
    "selected": true
  },
  {
    "id": "sub-dia",
    "code": "DIA",
    "subjectCode": "DIA",
    "name": "Địa lí",
    "subjectType": "ELECTIVE",
    "assessmentMode": "SCORE_AND_COMMENT",
    "coefficient": 1,
    "periodsPerWeek": 2,
    "selected": true
  },
  {
    "id": "sub-ktpl",
    "code": "KTPL",
    "subjectCode": "KTPL",
    "name": "Giáo dục kinh tế và pháp luật",
    "subjectType": "ELECTIVE",
    "assessmentMode": "SCORE_AND_COMMENT",
    "coefficient": 1,
    "periodsPerWeek": 2,
    "selected": true
  },
  {
    "id": "sub-tin",
    "code": "TIN",
    "subjectCode": "TIN",
    "name": "Tin học",
    "subjectType": "ELECTIVE",
    "assessmentMode": "SCORE_AND_COMMENT",
    "coefficient": 1,
    "periodsPerWeek": 2,
    "selected": true
  },
  {
    "id": "sub-cn",
    "code": "CN",
    "subjectCode": "CN",
    "name": "Công nghệ",
    "subjectType": "ELECTIVE",
    "assessmentMode": "SCORE_AND_COMMENT",
    "coefficient": 1,
    "periodsPerWeek": 2,
    "selected": true
  },
  {
    "id": "sub-an",
    "code": "AN",
    "subjectCode": "AN",
    "name": "Âm nhạc",
    "subjectType": "ELECTIVE",
    "assessmentMode": "COMMENT_ONLY",
    "coefficient": 1,
    "periodsPerWeek": 1,
    "selected": false
  },
  {
    "id": "sub-mt",
    "code": "MT",
    "subjectCode": "MT",
    "name": "Mĩ thuật",
    "subjectType": "ELECTIVE",
    "assessmentMode": "COMMENT_ONLY",
    "coefficient": 1,
    "periodsPerWeek": 1,
    "selected": false
  }
];

export const THCS_2018_STANDARD_SUBJECTS: SubjectConfig[] = [
  {
    "id": "thcs-van",
    "name": "Ngữ văn",
    "subjectType": "MANDATORY",
    "assessmentMode": "SCORE_AND_COMMENT"
  },
  {
    "id": "thcs-toan",
    "name": "Toán học",
    "subjectType": "MANDATORY",
    "assessmentMode": "SCORE_AND_COMMENT"
  },
  {
    "id": "thcs-eng",
    "name": "Tiếng Anh",
    "subjectType": "MANDATORY",
    "assessmentMode": "SCORE_AND_COMMENT"
  },
  {
    "id": "thcs-khtn",
    "name": "Khoa học tự nhiên",
    "subjectType": "MANDATORY",
    "assessmentMode": "SCORE_AND_COMMENT"
  },
  {
    "id": "thcs-lsdl",
    "name": "Lịch sử và Địa lí",
    "subjectType": "MANDATORY",
    "assessmentMode": "SCORE_AND_COMMENT"
  },
  {
    "id": "thcs-gdcd",
    "name": "Giáo dục công dân",
    "subjectType": "MANDATORY",
    "assessmentMode": "SCORE_AND_COMMENT"
  },
  {
    "id": "thcs-tin",
    "name": "Tin học",
    "subjectType": "MANDATORY",
    "assessmentMode": "SCORE_AND_COMMENT"
  },
  {
    "id": "thcs-cn",
    "name": "Công nghệ",
    "subjectType": "MANDATORY",
    "assessmentMode": "SCORE_AND_COMMENT"
  },
  {
    "id": "thcs-gdtc",
    "name": "Giáo dục thể chất",
    "subjectType": "MANDATORY",
    "assessmentMode": "COMMENT_ONLY"
  },
  {
    "id": "thcs-nt",
    "name": "Nghệ thuật",
    "subjectType": "MANDATORY",
    "assessmentMode": "COMMENT_ONLY"
  },
  {
    "id": "thcs-hdtn",
    "name": "Hoạt động trải nghiệm, hướng nghiệp",
    "subjectType": "ACTIVITY",
    "assessmentMode": "COMMENT_ONLY"
  },
  {
    "id": "thcs-gddp",
    "name": "Nội dung giáo dục của địa phương",
    "subjectType": "MANDATORY",
    "assessmentMode": "COMMENT_ONLY"
  }
];

export const PRIMARY_G12_STANDARD_SUBJECTS: SubjectConfig[] = [
  {
    "id": "pri-tv",
    "name": "Tiếng Việt",
    "subjectType": "MANDATORY",
    "assessmentMode": "COMMENT_ONLY"
  },
  {
    "id": "pri-toan",
    "name": "Toán học",
    "subjectType": "MANDATORY",
    "assessmentMode": "COMMENT_ONLY"
  },
  {
    "id": "pri-dd",
    "name": "Đạo đức",
    "subjectType": "MANDATORY",
    "assessmentMode": "COMMENT_ONLY"
  },
  {
    "id": "pri-tnxh",
    "name": "Tự nhiên và Xã hội",
    "subjectType": "MANDATORY",
    "assessmentMode": "COMMENT_ONLY"
  },
  {
    "id": "pri-gdtc",
    "name": "Giáo dục thể chất",
    "subjectType": "MANDATORY",
    "assessmentMode": "COMMENT_ONLY"
  },
  {
    "id": "pri-nt",
    "name": "Nghệ thuật (Âm nhạc, Mĩ thuật)",
    "subjectType": "MANDATORY",
    "assessmentMode": "COMMENT_ONLY"
  },
  {
    "id": "pri-hdtn",
    "name": "Hoạt động trải nghiệm",
    "subjectType": "ACTIVITY",
    "assessmentMode": "COMMENT_ONLY"
  },
  {
    "id": "pri-eng",
    "name": "Tiếng Anh",
    "subjectType": "MANDATORY",
    "assessmentMode": "COMMENT_ONLY"
  }
];

export const PRIMARY_G3_STANDARD_SUBJECTS: SubjectConfig[] = [
  {
    "id": "pri-tv",
    "name": "Tiếng Việt",
    "subjectType": "MANDATORY",
    "assessmentMode": "COMMENT_ONLY"
  },
  {
    "id": "pri-toan",
    "name": "Toán học",
    "subjectType": "MANDATORY",
    "assessmentMode": "COMMENT_ONLY"
  },
  {
    "id": "pri-dd",
    "name": "Đạo đức",
    "subjectType": "MANDATORY",
    "assessmentMode": "COMMENT_ONLY"
  },
  {
    "id": "pri-tnxh",
    "name": "Tự nhiên và Xã hội",
    "subjectType": "MANDATORY",
    "assessmentMode": "COMMENT_ONLY"
  },
  {
    "id": "pri-gdtc",
    "name": "Giáo dục thể chất",
    "subjectType": "MANDATORY",
    "assessmentMode": "COMMENT_ONLY"
  },
  {
    "id": "pri-nt",
    "name": "Nghệ thuật (Âm nhạc, Mĩ thuật)",
    "subjectType": "MANDATORY",
    "assessmentMode": "COMMENT_ONLY"
  },
  {
    "id": "pri-hdtn",
    "name": "Hoạt động trải nghiệm",
    "subjectType": "ACTIVITY",
    "assessmentMode": "COMMENT_ONLY"
  },
  {
    "id": "pri-eng",
    "name": "Tiếng Anh",
    "subjectType": "MANDATORY",
    "assessmentMode": "COMMENT_ONLY"
  },
  {
    "id": "pri-tincn",
    "name": "Tin học và Công nghệ",
    "subjectType": "MANDATORY",
    "assessmentMode": "COMMENT_ONLY"
  }
];

export const PRIMARY_G45_STANDARD_SUBJECTS: SubjectConfig[] = [
  {
    "id": "pri-tv",
    "name": "Tiếng Việt",
    "subjectType": "MANDATORY",
    "assessmentMode": "SCORE_AND_COMMENT"
  },
  {
    "id": "pri-toan",
    "name": "Toán học",
    "subjectType": "MANDATORY",
    "assessmentMode": "SCORE_AND_COMMENT"
  },
  {
    "id": "pri-eng",
    "name": "Tiếng Anh",
    "subjectType": "MANDATORY",
    "assessmentMode": "SCORE_AND_COMMENT"
  },
  {
    "id": "pri-kh",
    "name": "Khoa học",
    "subjectType": "MANDATORY",
    "assessmentMode": "SCORE_AND_COMMENT"
  },
  {
    "id": "pri-lsdl",
    "name": "Lịch sử và Địa lí",
    "subjectType": "MANDATORY",
    "assessmentMode": "SCORE_AND_COMMENT"
  },
  {
    "id": "pri-dd",
    "name": "Đạo đức",
    "subjectType": "MANDATORY",
    "assessmentMode": "COMMENT_ONLY"
  },
  {
    "id": "pri-tincn",
    "name": "Tin học và Công nghệ",
    "subjectType": "MANDATORY",
    "assessmentMode": "COMMENT_ONLY"
  },
  {
    "id": "pri-gdtc",
    "name": "Giáo dục thể chất",
    "subjectType": "MANDATORY",
    "assessmentMode": "COMMENT_ONLY"
  },
  {
    "id": "pri-nt",
    "name": "Nghệ thuật",
    "subjectType": "MANDATORY",
    "assessmentMode": "COMMENT_ONLY"
  },
  {
    "id": "pri-hdtn",
    "name": "Hoạt động trải nghiệm",
    "subjectType": "ACTIVITY",
    "assessmentMode": "COMMENT_ONLY"
  }
];

export const PRIMARY_2018_STANDARD_SUBJECTS: SubjectConfig[] = [
  {
    "id": "pri-tv",
    "name": "Tiếng Việt",
    "subjectType": "MANDATORY",
    "assessmentMode": "SCORE_AND_COMMENT"
  },
  {
    "id": "pri-toan",
    "name": "Toán học",
    "subjectType": "MANDATORY",
    "assessmentMode": "SCORE_AND_COMMENT"
  },
  {
    "id": "pri-eng",
    "name": "Tiếng Anh",
    "subjectType": "MANDATORY",
    "assessmentMode": "SCORE_AND_COMMENT"
  },
  {
    "id": "pri-kh",
    "name": "Khoa học",
    "subjectType": "MANDATORY",
    "assessmentMode": "SCORE_AND_COMMENT"
  },
  {
    "id": "pri-lsdl",
    "name": "Lịch sử và Địa lí",
    "subjectType": "MANDATORY",
    "assessmentMode": "SCORE_AND_COMMENT"
  },
  {
    "id": "pri-dd",
    "name": "Đạo đức",
    "subjectType": "MANDATORY",
    "assessmentMode": "COMMENT_ONLY"
  },
  {
    "id": "pri-tincn",
    "name": "Tin học và Công nghệ",
    "subjectType": "MANDATORY",
    "assessmentMode": "COMMENT_ONLY"
  },
  {
    "id": "pri-gdtc",
    "name": "Giáo dục thể chất",
    "subjectType": "MANDATORY",
    "assessmentMode": "COMMENT_ONLY"
  },
  {
    "id": "pri-nt",
    "name": "Nghệ thuật",
    "subjectType": "MANDATORY",
    "assessmentMode": "COMMENT_ONLY"
  },
  {
    "id": "pri-hdtn",
    "name": "Hoạt động trải nghiệm",
    "subjectType": "ACTIVITY",
    "assessmentMode": "COMMENT_ONLY"
  }
];

export const GDTX_THPT_STANDARD_SUBJECTS: SubjectConfig[] = [
  {
    "id": "gdtx-van",
    "name": "Ngữ văn",
    "subjectType": "MANDATORY",
    "assessmentMode": "SCORE_AND_COMMENT"
  },
  {
    "id": "gdtx-toan",
    "name": "Toán học",
    "subjectType": "MANDATORY",
    "assessmentMode": "SCORE_AND_COMMENT"
  },
  {
    "id": "gdtx-su",
    "name": "Lịch sử",
    "subjectType": "MANDATORY",
    "assessmentMode": "SCORE_AND_COMMENT"
  },
  {
    "id": "gdtx-dia",
    "name": "Địa lí",
    "subjectType": "ELECTIVE",
    "assessmentMode": "SCORE_AND_COMMENT"
  },
  {
    "id": "gdtx-ly",
    "name": "Vật lí",
    "subjectType": "ELECTIVE",
    "assessmentMode": "SCORE_AND_COMMENT"
  },
  {
    "id": "gdtx-hoa",
    "name": "Hóa học",
    "subjectType": "ELECTIVE",
    "assessmentMode": "SCORE_AND_COMMENT"
  },
  {
    "id": "gdtx-sinh",
    "name": "Sinh học",
    "subjectType": "ELECTIVE",
    "assessmentMode": "SCORE_AND_COMMENT"
  }
];

export const initialSubjects: SubjectConfig[] = THPT_2018_STANDARD_SUBJECTS;

export const initialClassSettings: ClassSettings = {
  id: 'class-11a1-2025',
  organizationId: 'org-lhp',
  workspaceId: 'tenant-lan-nguyen',
  classId: 'class-11a1-2025',
  schoolName: 'THPT Chuyên Lê Hồng Phong',
  className: '11A1',
  name: '11A1',
  grade: '11',
  stream: 'Ban KHTN (Khoa học Tự nhiên)',
  gradeLevel: '11',
  classTrack: 'KHTN',
  educationTrack: 'Ban KHTN',
  academicYear: '2025 - 2026',
  schoolYear: '2025 - 2026',
  schoolYearLabel: '2025 - 2026',
  semester: 'Học kỳ I',
  teacherName: 'Cô Nguyễn Thị Mai Lan',
  homeroomTeacherName: 'Cô Nguyễn Thị Mai Lan',
  teacherPhone: '0912 345 678',
  teacherEmail: 'mailan.nguyen@lehongphong.edu.vn',
  slogan: 'Tập thể 11A1 - Đoàn kết, Sáng tạo, Bứt phá!',
  totalStudents: 14,
  confirmedTotalStudents: 14,
  studentIdentityMode: 'IDENTIFIED',
  theme: { primaryColor: '#0D9488', fontFamily: 'Inter' },
  subjects: initialSubjects,
  curriculumType: 'THPT',
  educationProgram: 'THPT',
  schoolYearTimeline: {
    startDateHK1: '2025-09-05',
    endDateHK1: '2026-01-16',
    startDateHK2: '2026-01-19',
    endDateHK2: '2026-05-30',
    schoolYearLabel: '2025 - 2026',
    totalWeeksHK1: 18,
    totalWeeksHK2: 17,
    totalWeeks: 35
  }
};

export const initialTeacher2ClassSettings: ClassSettings = {
  id: 'class-12a2-2025',
  organizationId: 'org-cnh',
  workspaceId: 'tenant-hoang-nam',
  classId: 'class-12a2-2025',
  schoolName: 'THPT Chuyên Nguyễn Huệ',
  className: '12A2',
  name: '12A2',
  grade: '12',
  stream: 'Ban KHXH (Khoa học Xã hội)',
  gradeLevel: '12',
  classTrack: 'KHXH',
  educationTrack: 'Ban KHXH',
  academicYear: '2025 - 2026',
  schoolYear: '2025 - 2026',
  schoolYearLabel: '2025 - 2026',
  semester: 'Học kỳ I',
  teacherName: 'Thầy Trần Hoàng Nam',
  homeroomTeacherName: 'Thầy Trần Hoàng Nam',
  teacherPhone: '0988 777 666',
  teacherEmail: 'hoangnam.tran@nguyenhue.edu.vn',
  slogan: '12A2 Vươn tầm cao mới',
  totalStudents: 1,
  confirmedTotalStudents: 1,
  studentIdentityMode: 'IDENTIFIED',
  theme: { primaryColor: '#2563EB', fontFamily: 'Inter' },
  subjects: initialSubjects,
  curriculumType: 'THPT',
  educationProgram: 'THPT'
};

export const initialTimelineMilestones: TimelineMilestone[] = [
  {
    id: 'm1',
    title: 'Khai giảng Năm học Mới',
    date: '2025-09-05',
    category: 'EVENT',
    description: 'Lễ khai giảng trang trọng toàn trường.'
  },
  {
    id: 'm2',
    title: 'Kiểm tra Giữa Học kỳ I',
    date: '2025-11-03',
    category: 'EXAM',
    description: 'Tập trung ôn tập và thi các môn văn hóa.'
  },
  {
    id: 'm3',
    title: 'Kiểm tra Cuối Học kỳ I',
    date: '2025-12-22',
    category: 'EXAM',
    description: 'Thi học kỳ I toàn khối.'
  }
];

export const initialClassGoals: ClassGoal[] = [
  {
    id: 'cg-1',
    title: '100% Học sinh Đạt Hạnh kiểm Tốt / Khá',
    targetMetric: '100%',
    currentMetric: '95%',
    target: 100,
    current: 95,
    category: 'Nề nếp',
    status: 'in_progress'
  },
  {
    id: 'cg-2',
    title: 'Đạt danh hiệu Tập thể Lớp Xuất sắc Cấp trường',
    targetMetric: 'Hạng Nhất',
    currentMetric: 'Hạng Nhì',
    target: 1,
    current: 2,
    category: 'Hoạt động',
    status: 'in_progress'
  }
];

export const initialPersonalGoals: PersonalGoal[] = [];

export const initialPinnedItems: PinnedItem[] = [
  {
    id: 'pin-1',
    title: 'Nội quy Lớp học & Tiêu chí Thi đua 11A1 Năm học 2025 - 2026',
    category: 'Nội quy',
    pinnedAt: '05/09/2025',
    content: 'Tất cả học sinh thực hiện nghiêm túc đồng phục, chuyên cần và nề nếp truy bài.'
  }
];

export const initialAuditLogs: AuditLog[] = [
  {
    id: 'log-1',
    action: 'Khởi tạo Không gian',
    performedBy: 'Hệ thống',
    role: 'SUPER_ADMIN',
    target: 'Lớp 11A1',
    details: 'Khởi tạo không gian chủ nhiệm số lớp 11A1 THPT Chuyên Lê Hồng Phong',
    timestamp: '15/08/2025 08:00:00'
  }
];

export const initialPointRules: PointRuleConfig[] = [
  { id: 'rule_1', title: 'Điểm 10 kiểm tra hoặc phát biểu xuất sắc', points: 10, defaultPoints: 10, category: 'Học tập', active: true },
  { id: 'rule_2', title: 'Đạt giải Học sinh Giỏi cấp Trường / Thành phố', points: 20, defaultPoints: 20, category: 'Học tập', active: true },
  { id: 'rule_3', title: 'Tham gia tích cực phong trào tình nguyện / văn nghệ', points: 10, defaultPoints: 10, category: 'Phong trào & Hoạt động', active: true },
  { id: 'rule_4', title: 'Giúp đỡ bạn tiến bộ trong học tập', points: 10, defaultPoints: 10, category: 'Việc tốt', active: true },
  { id: 'rule_5', title: 'Đi học muộn hoặc không mang phù hiệu', points: -5, defaultPoints: -5, category: 'Vi phạm nội quy', active: true },
  { id: 'rule_6', title: 'Không làm bài tập về nhà', points: -5, defaultPoints: -5, category: 'Học tập', active: true }
];

export const initialPointTransactions: PointTransaction[] = [
  {
    id: 'tx_hs-01_init',
    studentId: 'hs-01',
    ruleId: 'rule_1',
    category: 'Học tập',
    title: 'Đạt điểm 10 kiểm tra 15 phút môn Toán',
    points: 10,
    description: 'Làm bài xuất sắc, trình bày mạch lạc',
    status: 'APPROVED',
    createdAt: '2025-09-10T10:00:00.000Z'
  }
];

export const initialAdjustmentReports: AdjustmentReport[] = [];

export const initialLaurelTrees: LaurelTree[] = [
  {
    studentId: 'hs-01',
    studentName: 'Nguyễn Gia Huy',
    currentPoints: 45,
    completedTrees: 1,
    totalPoints: 145,
    currentStage: 'tree',
    leavesCount: 8,
    flowersCount: 2
  },
  {
    studentId: 'hs-02',
    studentName: 'Trần Thị Mai',
    currentPoints: 35,
    completedTrees: 0,
    totalPoints: 35,
    currentStage: 'sapling',
    leavesCount: 6,
    flowersCount: 0
  }
];

export const initialAcademicRecords: Record<string, AcademicRecord> = {
  'hs-01': {
    id: 'acad_hs-01_2025_HK1',
    tenant_id: 'tenant-lan-nguyen',
    studentId: 'hs-01',
    student_id: 'hs-01',
    period: 'midterm_hk1',
    academicYear: '2025 - 2026',
    academic_year: '2025 - 2026',
    semester: 'Học kỳ I',
    grades: [],
    scores: [
      { subjectName: 'Toán học', regularScores: [9.5, 9.0, 10.0], midtermScore: 9.5, finalScore: 9.5, averageScore: 9.5 },
      { subjectName: 'Ngữ văn', regularScores: [8.0, 8.5, 8.0], midtermScore: 8.5, finalScore: 8.5, averageScore: 8.3 },
      { subjectName: 'Tiếng Anh', regularScores: [9.0, 9.5, 9.5], midtermScore: 9.5, finalScore: 9.5, averageScore: 9.4 }
    ],
    overallAverage: 9.1,
    conductClassification: 'Tốt',
    strongestSubject: 'Toán học',
    improvementSubject: 'Ngữ văn',
    excusedAbsences: 0,
    unexcusedAbsences: 0,
    publishedToStudent: true,
    publishedToParent: true,
    publicationStatus: 'PUBLISHED'
  }
};

export const initialTimetable: TimetableVersion = {
  id: 'tkb-11a1-hk1-2025',
  versionName: 'Thời khóa biểu Chính thức Áp dụng HK1',
  semester: 'HK1',
  academicYear: '2025 - 2026',
  isActive: true,
  isApplied: true,
  schedule: [
    {
      dayOfWeek: 'Thứ 2',
      morningPeriods: [
        { period: 1, subject: 'Chào cờ', teacher: 'BGH & GVCN', room: 'Sân trường' },
        { period: 2, subject: 'Toán học', teacher: 'Thầy Trần Văn An', room: 'Phòng 204' },
        { period: 3, subject: 'Toán học', teacher: 'Thầy Trần Văn An', room: 'Phòng 204' },
        { period: 4, subject: 'Ngữ văn', teacher: 'Cô Mai Lan (GVCN)', room: 'Phòng 204' },
        { period: 5, subject: 'Tiếng Anh', teacher: 'Cô Lê Thu Hà', room: 'Phòng 204' }
      ],
      afternoonPeriods: []
    },
    {
      dayOfWeek: 'Thứ 3',
      morningPeriods: [
        { period: 1, subject: 'Vật lí', teacher: 'Thầy Đỗ Minh Tuấn', room: 'Phòng 204' },
        { period: 2, subject: 'Hóa học', teacher: 'Cô Phạm Thị Mai', room: 'Phòng 204' },
        { period: 3, subject: 'Sinh học', teacher: 'Cô Vũ Bích Ngọc', room: 'Phòng 204' },
        { period: 4, subject: 'Lịch sử', teacher: 'Thầy Hoàng Quốc Bảo', room: 'Phòng 204' },
        { period: 5, subject: 'Giáo dục thể chất', teacher: 'Thầy Bùi Văn Dũng', room: 'Nhà thi đấu' }
      ],
      afternoonPeriods: []
    },
    {
      dayOfWeek: 'Thứ 4',
      morningPeriods: [
        { period: 1, subject: 'Toán học', teacher: 'Thầy Trần Văn An', room: 'Phòng 204' },
        { period: 2, subject: 'Ngữ văn', teacher: 'Cô Mai Lan (GVCN)', room: 'Phòng 204' },
        { period: 3, subject: 'Ngữ văn', teacher: 'Cô Mai Lan (GVCN)', room: 'Phòng 204' },
        { period: 4, subject: 'Tiếng Anh', teacher: 'Cô Lê Thu Hà', room: 'Phòng 204' },
        { period: 5, subject: 'Tin học', teacher: 'Thầy Nguyễn Trí Dũng', room: 'Lab Tin học' }
      ],
      afternoonPeriods: []
    },
    {
      dayOfWeek: 'Thứ 5',
      morningPeriods: [
        { period: 1, subject: 'Vật lí', teacher: 'Thầy Đỗ Minh Tuấn', room: 'Phòng 204' },
        { period: 2, subject: 'Hóa học', teacher: 'Cô Phạm Thị Mai', room: 'Phòng 204' },
        { period: 3, subject: 'Địa lí', teacher: 'Cô Trần Thùy Dung', room: 'Phòng 204' },
        { period: 4, subject: 'GDQP-AN', teacher: 'Thầy Võ Thành Đạt', room: 'Sân quân sự' },
        { period: 5, subject: 'Công nghệ', teacher: 'Thầy Trịnh Văn Hải', room: 'Phòng 204' }
      ],
      afternoonPeriods: []
    },
    {
      dayOfWeek: 'Thứ 6',
      morningPeriods: [
        { period: 1, subject: 'Toán học', teacher: 'Thầy Trần Văn An', room: 'Phòng 204' },
        { period: 2, subject: 'Tiếng Anh', teacher: 'Cô Lê Thu Hà', room: 'Phòng 204' },
        { period: 3, subject: 'Hoạt động trải nghiệm, hướng nghiệp', teacher: 'Cô Mai Lan (GVCN)', room: 'Phòng 204' },
        { period: 4, subject: 'Hoạt động trải nghiệm, hướng nghiệp', teacher: 'Cô Mai Lan (GVCN)', room: 'Phòng 204' },
        { period: 5, subject: 'Sinh hoạt lớp', teacher: 'Cô Mai Lan (GVCN)', room: 'Phòng 204' }
      ],
      afternoonPeriods: []
    },
    {
      dayOfWeek: 'Thứ 7',
      morningPeriods: [],
      afternoonPeriods: []
    }
  ]
};

export const initialPosts: Post[] = [
  {
    id: 'post-1',
    tenantId: 'tenant-lan-nguyen',
    authorId: 'teacher-lan-nguyen',
    authorName: 'Cô Nguyễn Thị Mai Lan (GVCN)',
    authorRole: 'TEACHER',
    authorAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&q=80',
    category: 'Thông báo',
    title: 'Chào mừng các em học sinh bước vào Năm học Mới 2025 - 2026',
    content: 'Chúc tập thể 11A1 thân yêu một năm học gặt hái thật nhiều thành tích rực rỡ, đoàn kết và luôn giữ vững tinh thần đam mê khám phá!',
    pinned: true,
    allowComments: true,
    createdAt: '2025-09-05T08:00:00.000Z',
    likesCount: 14,
    commentsCount: 2,
    reactions: { love: ['hs-01', 'hs-02'] },
    comments: []
  }
];

export const initialAlbumPosts: AlbumPost[] = [
  {
    id: 'alb-1',
    organizationId: 'org-lhp',
    classId: '11A1',
    authorId: 'teacher-lan-nguyen',
    authorName: 'Cô Nguyễn Thị Mai Lan (GVCN)',
    authorAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
    authorRole: 'TEACHER',
    title: 'Khoảnh khắc Rực rỡ Ngày Khai giảng 2025 - 2026',
    content: 'Lưu giữ những nụ cười trong trẻo và thanh xuân rực rỡ của tập thể 11A1 thân yêu.',
    createdAt: '05/09/2025 10:30',
    tags: ['#11A1Family', '#KhaiGiang2025'],
    media: [
      {
        type: 'image',
        url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80',
        name: 'Tập thể 11A1',
        caption: 'Toàn thể lớp 11A1 trong lễ khai giảng'
      }
    ]
  }
];

export const initialParentConversations: ParentConversation[] = [
  {
    id: 'conv-pa-1',
    studentId: 'hs-01',
    studentName: 'Nguyễn Gia Huy',
    parentName: 'Nguyễn Gia Hùng (PH em Gia Huy)',
    parentPhone: '0903 123 456',
    parentAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    unreadCount: 0,
    lastMessage: 'Gia đình đã nắm rõ kế hoạch của cô giáo ạ. Cảm ơn cô!',
    lastMessageTime: '15/09/2025',
    messages: [
      {
        id: 'msg-1',
        senderId: 'teacher-lan-nguyen',
        senderName: 'Cô Nguyễn Thị Mai Lan (GVCN)',
        senderRole: 'TEACHER',
        content: 'Chào anh Hùng, em gửi anh kế hoạch học tập của cháu Huy tháng này ạ.',
        timestamp: '15/09/2025 09:00'
      },
      {
        id: 'msg-2',
        senderId: 'par-hs-01',
        senderName: 'Nguyễn Gia Hùng',
        senderRole: 'PARENT',
        content: 'Gia đình đã nắm rõ kế hoạch của cô giáo ạ. Cảm ơn cô!',
        timestamp: '15/09/2025 10:15'
      }
    ]
  }
];

export const initialAssignments: LessonAssignment[] = [
  {
    id: 'as-01',
    tenant_id: 'tenant-lan-nguyen',
    class_id: 'class-11a1-2025',
    title: 'Bài tập Đại số: Đạo hàm và Khảo sát Hàm số',
    subject: 'Toán học',
    assigned_date: '2025-09-15',
    due_date: '2025-09-22',
    description: 'Làm bài tập từ bài 1 đến bài 5 trong sách bài tập nâng cao.',
    status: 'approved',
    submissionCount: 14
  }
];

export const initialExamSchedules: ExamSchedule[] = [];

export const initialCareerProfiles: Record<string, CareerProfile> = {
  'hs-01': {
    id: 'career_hs-01',
    tenant_id: 'tenant-lan-nguyen',
    studentId: 'hs-01',
    riasecScores: { R: 75, I: 95, A: 60, S: 45, E: 55, C: 80 },
    primaryTraits: ['Nghiên cứu (Investigative)', 'Quy củ (Conventional)'],
    recommendedCareers: ['Kỹ sư Phần mềm', 'Chuyên gia Khoa học Dữ liệu', 'Kỹ sư Trí tuệ Nhân tạo'],
    interests: ['Lập trình máy tính', 'Toán ứng dụng', 'Hệ thống tự động'],
    strengths: ['Tư duy phân tích', 'Học tập độc lập', 'Khả năng tập trung cao'],
    updatedAt: '2025-09-15T08:00:00.000Z'
  }
};

export const demoAccounts: Record<string, UserAccount> = {
  teacher: {
    id: 'teacher-lan-nguyen',
    userId: 'teacher-lan-nguyen',
    teacherId: 'teacher-lan-nguyen',
    name: 'Cô Nguyễn Thị Mai Lan (GVCN)',
    fullName: 'Cô Nguyễn Thị Mai Lan',
    role: 'TEACHER',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
    tenantId: 'tenant-lan-nguyen',
    workspaceId: 'tenant-lan-nguyen',
    currentClassId: 'class-11a1-2025',
    email: 'mailan.nguyen@lehongphong.edu.vn',
    phone: '0912 345 678',
    loginMethod: 'BOTH'
  },
  officer: {
    id: 'hs-01',
    userId: 'hs-01',
    studentId: 'hs-01',
    name: 'Nguyễn Gia Huy (Lớp trưởng)',
    fullName: 'Nguyễn Gia Huy',
    role: 'CLASS_OFFICER',
    officerRoleTitle: 'Lớp trưởng',
    officerRole: 'Lớp trưởng',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80',
    tenantId: 'tenant-lan-nguyen',
    workspaceId: 'tenant-lan-nguyen',
    currentClassId: 'class-11a1-2025',
    permissions: {
      manageAssignments: true,
      manageTests: true,
      manageActivities: true,
      manageTimetable: true,
      publishPosts: true,
      publishAlbum: true,
      submitStudentEvent: true,
      submitAttendance: true,
      canManageAttendance: true,
      canManagePoints: true,
      canPostAnnouncements: true,
      canManageStudySchedule: true,
      quickReport: true
    }
  },
  student: {
    id: 'hs-02',
    userId: 'hs-02',
    studentId: 'hs-02',
    name: 'Trần Thị Mai (Học viên)',
    fullName: 'Trần Thị Mai',
    role: 'STUDENT',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
    tenantId: 'tenant-lan-nguyen',
    workspaceId: 'tenant-lan-nguyen',
    currentClassId: 'class-11a1-2025'
  },
  parent: {
    id: 'par-hs-01',
    userId: 'par-hs-01',
    childStudentId: 'hs-01',
    studentId: 'hs-01',
    name: 'Nguyễn Gia Hùng (PH em Gia Huy)',
    fullName: 'Nguyễn Gia Hùng',
    role: 'PARENT',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    tenantId: 'tenant-lan-nguyen',
    workspaceId: 'tenant-lan-nguyen',
    currentClassId: 'class-11a1-2025'
  }
};
