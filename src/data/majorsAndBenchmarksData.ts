/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CareerMajorItem, BenchmarkRecord } from '../types';

export const MAJOR_GROUPS = [
  'Tất cả nhóm ngành',
  'Công nghệ thông tin & Khoa học máy tính',
  'Kỹ thuật & Công nghệ',
  'Kinh tế & Quản trị kinh doanh',
  'Y Dược & Chăm sóc sức khỏe',
  'Sư phạm & Khoa học giáo dục',
  'Khoa học Xã hội & Nhân văn',
  'Nghệ thuật & Thiết kế'
];

export const EXAM_COMBINATIONS = [
  'Tất cả tổ hợp',
  'A00 (Toán, Vật lí, Hóa học)',
  'A01 (Toán, Vật lí, Tiếng Anh)',
  'B00 (Toán, Hóa học, Sinh học)',
  'C00 (Ngữ văn, Lịch sử, Địa lí)',
  'D01 (Ngữ văn, Toán, Tiếng Anh)',
  'D07 (Toán, Hóa học, Tiếng Anh)'
];

export const BENCHMARK_TIERS = [
  'Tất cả mức điểm',
  'Dưới 20 điểm',
  '20 - 24 điểm',
  '24 - 27 điểm',
  'Trên 27 điểm'
];

export const REGIONS = [
  'Tất cả khu vực',
  'Miền Bắc',
  'Miền Trung',
  'Miền Nam'
];

export const CAREER_MAJORS_DATABASE: CareerMajorItem[] = [
  {
    id: 'maj-01',
    name: 'Khoa học Máy tính (Computer Science)',
    code: '7480101',
    group: 'Công nghệ thông tin & Khoa học máy tính',
    description: 'Nghiên cứu nền tảng lý thuyết thông tin, thuật toán, kiến trúc hệ thống máy tính và trí tuệ nhân tạo.',
    examGroups: ['A00', 'A01', 'D01', 'D07'],
    suitableMbti: ['INTJ', 'INTP', 'ENTJ', 'ISTP'],
    suitableHolland: ['I', 'R', 'C'],
    benchmarkTier: 'Top đầu (> 26 điểm)',
    benchmarkRange: '27.5 - 29.2 điểm',
    careerProspects: 'Mức lương khởi điểm hấp dẫn, cơ hội làm việc toàn cầu tại các tập đoàn công nghệ lớn.',
    typicalInstitutions: [
      { schoolName: 'ĐH Bách khoa TP.HCM', schoolCode: 'QSK', region: 'Miền Nam', score: 28.5 },
      { schoolName: 'ĐH Khoa học Tự nhiên TP.HCM', schoolCode: 'QST', region: 'Miền Nam', score: 27.8 }
    ]
  },
  {
    id: 'maj-02',
    name: 'Kỹ thuật Phần mềm (Software Engineering)',
    code: '7480103',
    group: 'Công nghệ thông tin & Khoa học máy tính',
    description: 'Quy trình kỹ nghệ phát triển phần mềm chuẩn mực từ thu thập yêu cầu, thiết kế kiến trúc đến kiểm thử chất lượng.',
    examGroups: ['A00', 'A01', 'D01'],
    suitableMbti: ['INTJ', 'INTP', 'ISTJ', 'ENTP'],
    suitableHolland: ['I', 'R', 'E'],
    benchmarkTier: 'Top đầu (> 26 điểm)',
    benchmarkRange: '26.8 - 28.5 điểm',
    careerProspects: 'Cực kỳ khát nhân lực chất lượng cao trong các lĩnh vực Cloud, FinTech, E-Commerce.',
    typicalInstitutions: [
      { schoolName: 'ĐH Bách khoa TP.HCM', schoolCode: 'QSK', region: 'Miền Nam', score: 28.2 },
      { schoolName: 'ĐH Công nghệ Thông tin - ĐHQG TP.HCM', schoolCode: 'QSG', region: 'Miền Nam', score: 27.6 }
    ]
  },
  {
    id: 'maj-03',
    name: 'Y khoa (General Medicine)',
    code: '7720101',
    group: 'Y Dược & Chăm sóc sức khỏe',
    description: 'Đào tạo bác sĩ đa khoa có y đức vững vàng, kiến thức y học uyên thâm và kỹ năng khám chữa bệnh tận tụy.',
    examGroups: ['B00'],
    suitableMbti: ['INFJ', 'ISFJ', 'INTJ', 'ISTJ'],
    suitableHolland: ['I', 'S', 'R'],
    benchmarkTier: 'Top đầu (> 26 điểm)',
    benchmarkRange: '27.2 - 28.8 điểm',
    careerProspects: 'Nghề nghiệp bền vững cả đời, phục vụ chăm sóc sức khỏe nhân dân tại hệ thống y tế toàn quốc.',
    typicalInstitutions: [
      { schoolName: 'ĐH Y Dược TP.HCM', schoolCode: 'YDS', region: 'Miền Nam', score: 28.3 },
      { schoolName: 'Khoa Y - ĐHQG TP.HCM', schoolCode: 'QSY', region: 'Miền Nam', score: 27.4 }
    ]
  },
  {
    id: 'maj-04',
    name: 'Kinh doanh Quốc tế & Logistics',
    code: '7340120',
    group: 'Kinh tế & Quản trị kinh doanh',
    description: 'Quản trị chuỗi cung ứng toàn cầu, đàm phán xuất nhập khẩu, thanh toán quốc tế và thương mại xuyên biên giới.',
    examGroups: ['A01', 'D01', 'A00'],
    suitableMbti: ['ENTJ', 'ESTJ', 'ENFJ', 'ENTP'],
    suitableHolland: ['E', 'C', 'S'],
    benchmarkTier: 'Top đầu (> 26 điểm)',
    benchmarkRange: '26.0 - 27.8 điểm',
    careerProspects: 'Việt Nam là trung tâm logistics Đông Nam Á, mở ra cơ hội thăng tiến lớn tại các hãng tàu, tập đoàn đa quốc gia.',
    typicalInstitutions: [
      { schoolName: 'ĐH Kinh tế TP.HCM (UEH)', schoolCode: 'KSA', region: 'Miền Nam', score: 27.2 },
      { schoolName: 'ĐH Ngoại thương CS2', schoolCode: 'NTS', region: 'Miền Nam', score: 28.1 }
    ]
  },
  {
    id: 'maj-05',
    name: 'Sư phạm Tiếng Anh (English Language Teacher Education)',
    code: '7140231',
    group: 'Sư phạm & Khoa học giáo dục',
    description: 'Năng lực ngôn ngữ chuẩn C1-C2 và phương pháp sư phạm hiện đại để giảng dạy Tiếng Anh tại các trường phổ thông.',
    examGroups: ['D01', 'D07'],
    suitableMbti: ['ENFJ', 'INFJ', 'ESFJ', 'ENFP'],
    suitableHolland: ['S', 'A', 'E'],
    benchmarkTier: 'Top đầu (> 26 điểm)',
    benchmarkRange: '25.5 - 27.2 điểm',
    careerProspects: 'Nhu cầu phổ cập ngoại ngữ cao, miễn học phí sư phạm và được cấp sinh hoạt phí theo Nghị định 116.',
    typicalInstitutions: [
      { schoolName: 'ĐH Sư phạm TP.HCM', schoolCode: 'SPH', region: 'Miền Nam', score: 26.8 }
    ]
  }
];

export const BENCHMARK_RECORDS_DATABASE: BenchmarkRecord[] = [
  {
    id: 'bm-01',
    institutionCode: 'QSK',
    institutionName: 'Trường Đại học Bách khoa - ĐHQG TP.HCM',
    majorCode: '7480101',
    majorName: 'Khoa học Máy tính',
    trainingLevel: 'Đại học',
    benchmarkScore: '28.5',
    benchmarkTier: 'Top đầu (> 26 điểm)',
    examGroups: ['A00', 'A01'],
    admissionMethod: 'Điểm thi THPT',
    region: 'Miền Nam',
    city: 'TP. Hồ Chí Minh',
    website: 'https://hcmut.edu.vn',
    dataYear: '2025',
    year: '2025',
    dataSource: 'Cổng thông tin tuyển sinh',
    note: 'Tiêu chí phụ: Điểm Toán >= 9.0'
  },
  {
    id: 'bm-02',
    institutionCode: 'QST',
    institutionName: 'Trường Đại học Khoa học Tự nhiên - ĐHQG TP.HCM',
    majorCode: '7480103',
    majorName: 'Kỹ thuật Phần mềm',
    trainingLevel: 'Đại học',
    benchmarkScore: '27.8',
    benchmarkTier: 'Top đầu (> 26 điểm)',
    examGroups: ['A00', 'A01'],
    admissionMethod: 'Điểm thi THPT',
    region: 'Miền Nam',
    city: 'TP. Hồ Chí Minh',
    website: 'https://hcmus.edu.vn',
    dataYear: '2025',
    year: '2025',
    dataSource: 'Cổng thông tin tuyển sinh',
    note: 'Chương trình chuẩn quốc tế'
  },
  {
    id: 'bm-03',
    institutionCode: 'YDS',
    institutionName: 'Đại học Y Dược TP. Hồ Chí Minh',
    majorCode: '7720101',
    majorName: 'Y khoa (Bác sĩ Đa khoa)',
    trainingLevel: 'Đại học',
    benchmarkScore: '28.3',
    benchmarkTier: 'Top đầu (> 26 điểm)',
    examGroups: ['B00'],
    admissionMethod: 'Điểm thi THPT',
    region: 'Miền Nam',
    city: 'TP. Hồ Chí Minh',
    website: 'https://ump.edu.vn',
    dataYear: '2025',
    year: '2025',
    dataSource: 'Cổng thông tin tuyển sinh',
    note: 'Tiêu chí phụ: Thứ tự nguyện vọng 1'
  },
  {
    id: 'bm-04',
    institutionCode: 'KSA',
    institutionName: 'Đại học Kinh tế TP. Hồ Chí Minh (UEH)',
    majorCode: '7340120',
    majorName: 'Kinh doanh Quốc tế',
    trainingLevel: 'Đại học',
    benchmarkScore: '27.2',
    benchmarkTier: 'Top đầu (> 26 điểm)',
    examGroups: ['A01', 'D01'],
    admissionMethod: 'Điểm thi THPT',
    region: 'Miền Nam',
    city: 'TP. Hồ Chí Minh',
    website: 'https://ueh.edu.vn',
    dataYear: '2025',
    year: '2025',
    dataSource: 'Cổng thông tin tuyển sinh',
    note: 'Tiếng Anh nhân hệ số 1'
  },
  {
    id: 'bm-05',
    institutionCode: 'SPH',
    institutionName: 'Trường Đại học Sư phạm TP. Hồ Chí Minh',
    majorCode: '7140231',
    majorName: 'Sư phạm Tiếng Anh',
    trainingLevel: 'Đại học',
    benchmarkScore: '26.8',
    benchmarkTier: 'Top đầu (> 26 điểm)',
    examGroups: ['D01'],
    admissionMethod: 'Điểm thi THPT',
    region: 'Miền Nam',
    city: 'TP. Hồ Chí Minh',
    website: 'https://hcmue.edu.vn',
    dataYear: '2025',
    year: '2025',
    dataSource: 'Cổng thông tin tuyển sinh',
    note: 'Tiếng Anh nhân hệ số 2'
  }
];
