/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CareerOccupation, CareerInstitution, CareerAdmissionUpdate } from '../types';

export const OCCUPATIONS_DATABASE: CareerOccupation[] = [
  {
    id: 'occ-01',
    name: 'Kỹ sư Phần mềm (Software Engineer)',
    group: 'Công nghệ thông tin',
    description: 'Thiết kế, lập trình, kiểm thử và bảo trì các hệ thống phần mềm, ứng dụng web và di động cho hàng triệu người dùng.',
    hollandTraits: ['I', 'R', 'C'],
    relatedHolland: ['I', 'R', 'C'],
    salaryRange: '15.000.000 - 45.000.000 VNĐ',
    academicTrackRecommendations: 'Ban Khoa học Tự nhiên (Toán, Tin, Vật lí, Tiếng Anh)',
    careerProspects: 'Nhu cầu tuyển dụng rất cao trong kỷ nguyên số hóa và trí tuệ nhân tạo.',
    mainTasks: [
      'Phát triển tính năng và giải quyết bài toán thuật toán tối ưu hệ thống.',
      'Viết mã nguồn sạch, tài liệu kỹ thuật và tham gia đánh giá mã (Code Review).',
      'Phối hợp với đội ngũ Sản phẩm (Product) và UI/UX Designer để tạo trải nghiệm mượt mà.'
    ],
    requiredSkills: ['Lập trình (TypeScript, Python, Java)', 'Cấu trúc dữ liệu & Thuật toán', 'Làm việc nhóm', 'Tiếng Anh chuyên ngành']
  },
  {
    id: 'occ-02',
    name: 'Bác sĩ Đa khoa (General Practitioner)',
    group: 'Y Dược & Sức khỏe',
    description: 'Khám bệnh, chẩn đoán, điều trị và chăm sóc sức khỏe toàn diện cho bệnh nhân tại các bệnh viện, phòng khám.',
    hollandTraits: ['I', 'S', 'R'],
    relatedHolland: ['I', 'S', 'R'],
    salaryRange: '18.000.000 - 50.000.000 VNĐ',
    academicTrackRecommendations: 'Ban Khoa học Tự nhiên (Toán, Hóa học, Sinh học, Tiếng Anh)',
    careerProspects: 'Nghề nghiệp cao quý với nhu cầu bền vững và luôn được xã hội kính trọng.',
    mainTasks: [
      'Thăm khám lâm sàng, đọc kết quả xét nghiệm và chẩn đoán hình ảnh.',
      'Kê đơn thuốc, lên phác đồ điều trị và theo dõi hồi phục của bệnh nhân.',
      'Tư vấn chế độ dinh dưỡng, phòng ngừa dịch bệnh cho gia đình và cộng đồng.'
    ],
    requiredSkills: ['Y đức và lòng thấu cảm', 'Kiến thức y khoa chuẩn xác', 'Chịu áp lực cao', 'Giao tiếp thấu hiểu']
  },
  {
    id: 'occ-03',
    name: 'Nhà Thiết kế Đồ họa & UI/UX (UI/UX Designer)',
    group: 'Nghệ thuật & Thiết kế',
    description: 'Nghiên cứu hành vi người dùng, phác thảo wireframe và thiết kế giao diện thị giác trực quan cho các sản phẩm công nghệ.',
    hollandTraits: ['A', 'I', 'S'],
    relatedHolland: ['A', 'I', 'S'],
    salaryRange: '12.000.000 - 35.000.000 VNĐ',
    academicTrackRecommendations: 'Tổ hợp các môn Mỹ thuật, Tin học, Tiếng Anh, Ngữ văn',
    careerProspects: 'Bùng nổ mạnh mẽ khi mọi ứng dụng và website đều cần trải nghiệm người dùng tinh tế.',
    mainTasks: [
      'Nghiên cứu chân dung người dùng (User Persona) và hành trình trải nghiệm (User Journey).',
      'Thiết kế Design System, Iconography, Typography và bảng màu thương hiệu.',
      'Xây dựng Prototype tương tác trên Figma để kiểm thử tính khả dụng.'
    ],
    requiredSkills: ['Figma / Adobe Creative Suite', 'Tư duy thẩm mỹ và bố cục', 'Lắng nghe và thấu cảm', 'Kể chuyện bằng hình ảnh']
  },
  {
    id: 'occ-04',
    name: 'Chuyên viên Phân tích Tài chính (Financial Analyst)',
    group: 'Kinh tế & Quản lý',
    description: 'Thu thập, tổng hợp và mô hình hóa dữ liệu tài chính doanh nghiệp để tư vấn các quyết định đầu tư và quản trị rủi ro.',
    hollandTraits: ['C', 'E', 'I'],
    relatedHolland: ['C', 'E', 'I'],
    salaryRange: '16.000.000 - 40.000.000 VNĐ',
    academicTrackRecommendations: 'Tổ hợp môn Toán, Tiếng Anh, Giáo dục kinh tế & pháp luật',
    careerProspects: 'Rất phát triển tại các quỹ đầu tư, ngân hàng thương mại và công ty chứng khoán.',
    mainTasks: [
      'Phân tích báo cáo tài chính, dòng tiền và chỉ số định giá doanh nghiệp.',
      'Xây dựng mô hình tài chính dự báo doanh thu và chi phí dự án.',
      'Viết báo cáo khuyến nghị đầu tư gửi hội đồng quản trị hoặc khách hàng.'
    ],
    requiredSkills: ['Tư duy định lượng & Excel nâng cao', 'Hiểu biết thị trường vốn', 'Tính cẩn trọng, bảo mật', 'Tiếng Anh tài chính']
  },
  {
    id: 'occ-05',
    name: 'Giảng viên / Giáo viên Trung học (High School Teacher)',
    group: 'Sư phạm & Giáo dục',
    description: 'Giảng dạy kiến thức bộ môn, định hướng nhân cách và đồng hành cùng học sinh trên hành trình trưởng thành.',
    hollandTraits: ['S', 'A', 'E'],
    relatedHolland: ['S', 'A', 'E'],
    salaryRange: '10.000.000 - 25.000.000 VNĐ',
    academicTrackRecommendations: 'Các môn chuyên sâu theo phân môn giảng dạy (Toán, Văn, Anh...)',
    careerProspects: 'Môi trường sư phạm nhân văn, bền vững và được tôn vinh trong xã hội.',
    mainTasks: [
      'Soạn giáo án điện tử, thiết kế hoạt động trải nghiệm tương tác sinh động.',
      'Tổ chức lớp học tích cực, đánh giá vì sự tiến bộ của người học theo TT 22.',
      'Phối hợp chặt chẽ với cha mẹ học sinh để hỗ trợ học sinh toàn diện.'
    ],
    requiredSkills: ['Phương pháp sư phạm tích cực', 'Truyền cảm hứng', 'Ứng dụng công nghệ giáo dục', 'Kiên nhẫn và bao dung']
  }
];

export const INSTITUTIONS_DATABASE: CareerInstitution[] = [
  {
    id: 'inst-01',
    code: 'QSK',
    name: 'Trường Đại học Bách khoa - ĐHQG TP.HCM',
    type: 'Đại học',
    province: 'TP. Hồ Chí Minh',
    region: 'Miền Nam',
    officialWebsite: 'https://hcmut.edu.vn',
    admissionWebsite: 'https://tuyensinh.hcmut.edu.vn',
    isVerified: true,
    checkedAt: '2025-09-01',
    description: 'Cái nôi đào tạo kỹ sư hàng đầu khu vực phía Nam với chất lượng kiểm định quốc tế ABET, AUN-QA.'
  },
  {
    id: 'inst-02',
    code: 'QST',
    name: 'Trường Đại học Khoa học Tự nhiên - ĐHQG TP.HCM',
    type: 'Đại học',
    province: 'TP. Hồ Chí Minh',
    region: 'Miền Nam',
    officialWebsite: 'https://hcmus.edu.vn',
    admissionWebsite: 'https://tuyensinh.hcmus.edu.vn',
    isVerified: true,
    checkedAt: '2025-09-01',
    description: 'Trung tâm đào tạo và nghiên cứu khoa học cơ bản, công nghệ thông tin và khoa học dữ liệu danh tiếng.'
  },
  {
    id: 'inst-03',
    code: 'KSA',
    name: 'Đại học Kinh tế TP. Hồ Chí Minh (UEH)',
    type: 'Đại học',
    province: 'TP. Hồ Chí Minh',
    region: 'Miền Nam',
    officialWebsite: 'https://ueh.edu.vn',
    admissionWebsite: 'https://tuyensinh.ueh.edu.vn',
    isVerified: true,
    checkedAt: '2025-09-01',
    description: 'Top trường đại học kinh tế hàng đầu đào tạo lãnh đạo, chuyên gia tài chính và kinh doanh quốc tế.'
  },
  {
    id: 'inst-04',
    code: 'YDS',
    name: 'Đại học Y Dược TP. Hồ Chí Minh',
    type: 'Đại học',
    province: 'TP. Hồ Chí Minh',
    region: 'Miền Nam',
    officialWebsite: 'https://ump.edu.vn',
    admissionWebsite: 'https://tuyensinh.ump.edu.vn',
    isVerified: true,
    checkedAt: '2025-09-01',
    description: 'Ngọn cờ đầu trong đào tạo y bác sĩ, dược sĩ và cán bộ y tế tinh hoa của cả nước.'
  },
  {
    id: 'inst-05',
    code: 'SPH',
    name: 'Trường Đại học Sư phạm TP. Hồ Chí Minh',
    type: 'Đại học',
    province: 'TP. Hồ Chí Minh',
    region: 'Miền Nam',
    officialWebsite: 'https://hcmue.edu.vn',
    admissionWebsite: 'https://tuyensinh.hcmue.edu.vn',
    isVerified: true,
    checkedAt: '2025-09-01',
    description: 'Đào tạo đội ngũ nhà giáo chuẩn mực, đổi mới sáng tạo theo chương trình GDPT 2018.'
  }
];

export const ADMISSION_UPDATES_DATABASE: CareerAdmissionUpdate[] = [
  {
    id: 'adm-01',
    institutionId: 'inst-01',
    institutionName: 'Trường Đại học Bách khoa - ĐHQG TP.HCM',
    academicYear: '2025 - 2026',
    title: 'Phương án Thi và Tuyển sinh Đại học theo Chương trình GDPT 2018',
    contentUrl: 'https://moet.gov.vn',
    publishedDate: '2025-10-15',
    checkedAt: '2025-10-15',
    sourceType: 'Chính thức',
    summary: 'Bộ GD&ĐT công bố cấu trúc đề thi tốt nghiệp THPT mới với 2 môn bắt buộc (Toán, Ngữ văn) và 2 môn tự chọn.',
    status: 'active',
    verifiedSource: true
  },
  {
    id: 'adm-02',
    institutionId: 'inst-02',
    institutionName: 'Đại học Quốc gia TP.HCM',
    academicYear: '2025 - 2026',
    title: 'ĐHQG TP.HCM Công bố Lịch Thi Đánh Giá Năng Lực (ĐGNL) 2026',
    contentUrl: 'https://cete.vnuhcm.edu.vn',
    publishedDate: '2025-11-01',
    checkedAt: '2025-11-01',
    sourceType: 'Chính thức',
    summary: 'Kỳ thi dự kiến tổ chức 2 đợt vào tháng 4 và tháng 5 với hơn 100 trường đại học, cao đẳng sử dụng kết quả để xét tuyển.',
    status: 'active',
    verifiedSource: true
  },
  {
    id: 'adm-03',
    institutionId: 'inst-03',
    institutionName: 'Đại học Kinh tế TP. Hồ Chí Minh (UEH)',
    academicYear: '2025 - 2026',
    title: 'Quy chế Xét tuyển Thẳng và Ưu tiên Xét tuyển Học sinh Giỏi Quốc gia',
    contentUrl: 'https://ueh.edu.vn',
    publishedDate: '2025-08-20',
    checkedAt: '2025-08-20',
    sourceType: 'Chính thức',
    summary: 'Chính sách cộng điểm ưu tiên và học bổng tài năng dành cho học sinh đoạt giải trong các kỳ thi học sinh giỏi.',
    status: 'active',
    verifiedSource: true
  }
];
