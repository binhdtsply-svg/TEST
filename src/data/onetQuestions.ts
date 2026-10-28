/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RIASECCategory } from '../types';

export interface RIASECDetail {
  code: RIASECCategory;
  name: string;
  vietnameseName: string;
  color: string;
  bgColor?: string;
  borderColor?: string;
  description: string;
  traits?: string[];
  sampleJobs?: string[];
  typicalMajors: string[];
  typicalCareers: string[];
  suggestedExamCombinations: string[];
}

export const RIASEC_INFO: Record<RIASECCategory, RIASECDetail> = {
  R: {
    code: 'R',
    name: 'Kỹ thuật',
    vietnameseName: 'Thực tế / Kỹ thuật (Realistic)',
    color: '#ef4444',
    bgColor: '#fee2e2',
    borderColor: '#fca5a5',
    description: 'Thích làm việc với máy móc, công cụ, vật liệu cụ thể, thiết bị công nghệ hoặc hoạt động thực tế ngoài trời.',
    traits: ['Thực tế', 'Khéo léo', 'Thích hành động', 'Yêu thiên nhiên', 'Kiên trì'],
    sampleJobs: ['Kỹ sư Cơ khí', 'Kỹ sư Xây dựng', 'Kỹ thuật viên IT', 'Kiến trúc sư cảnh quan', 'Phi công'],
    typicalMajors: ['Kỹ thuật Cơ khí', 'Kỹ thuật Xây dựng', 'Kỹ thuật Ô tô', 'Khoa học Cây trồng', 'Kỹ thuật Điện tử'],
    typicalCareers: ['Kỹ sư Cơ điện tử', 'Kỹ sư Xây dựng', 'Kỹ thuật viên Phần cứng', 'Phi công', 'Kỹ sư Nông nghiệp'],
    suggestedExamCombinations: ['A00 (Toán, Lý, Hóa)', 'A01 (Toán, Lý, Anh)', 'B00 (Toán, Hóa, Sinh)']
  },
  I: {
    code: 'I',
    name: 'Nghiên cứu',
    vietnameseName: 'Nghiên cứu / Học thuật (Investigative)',
    color: '#3b82f6',
    bgColor: '#dbeafe',
    borderColor: '#93c5fd',
    description: 'Thích quan sát, tìm hiểu, phân tích dữ liệu, nghiên cứu khoa học và giải quyết các bài toán trừu tượng, logic.',
    traits: ['Tò mò khoa học', 'Tư duy logic', 'Độc lập', 'Phân tích sâu', 'Thích giải đố'],
    sampleJobs: ['Nhà khoa học dữ liệu', 'Bác sĩ y khoa', 'Kỹ sư AI/Machine Learning', 'Nhà nghiên cứu sinh học', 'Chuyên gia kinh tế'],
    typicalMajors: ['Khoa học Máy tính', 'Y đa khoa', 'Công nghệ Sinh học', 'Khoa học Dữ liệu', 'Hóa dược'],
    typicalCareers: ['Chuyên gia Khoa học Dữ liệu', 'Kỹ sư Trí tuệ Nhân tạo', 'Bác sĩ Đa khoa', 'Nhà Nghiên cứu', 'Dược sĩ R&D'],
    suggestedExamCombinations: ['A00 (Toán, Lý, Hóa)', 'B00 (Toán, Hóa, Sinh)', 'A01 (Toán, Lý, Anh)']
  },
  A: {
    code: 'A',
    name: 'Nghệ thuật',
    vietnameseName: 'Nghệ thuật / Sáng tạo (Artistic)',
    color: '#8b5cf6',
    bgColor: '#ede9fe',
    borderColor: '#c4b5fd',
    description: 'Thích sáng tạo nghệ thuật, thẩm mỹ, trực giác, tự do biểu đạt ý tưởng cá nhân và không bị gò bó bởi quy tắc cứng nhắc.',
    traits: ['Sáng tạo', 'Trực giác nhạy bén', 'Cảm xúc phong phú', 'Thẩm mỹ cao', 'Tự do'],
    sampleJobs: ['Nhà thiết kế UI/UX', 'Đạo diễn truyền thông', 'Kiến trúc sư', 'Nhà văn / Biên kịch', 'Nhiếp ảnh gia'],
    typicalMajors: ['Thiết kế Đồ họa', 'Kiến trúc', 'Truyền thông Đa phương tiện', 'Thanh nhạc', 'Thời trang'],
    typicalCareers: ['UI/UX Designer', 'Đạo diễn Nghệ thuật', 'Kiến trúc sư Nội thất', 'Biên kịch', 'Nhiếp ảnh gia'],
    suggestedExamCombinations: ['V00 (Toán, Lý, Vẽ)', 'H00 (Văn, Năng khiếu Vẽ)', 'D01 (Toán, Văn, Anh)']
  },
  S: {
    code: 'S',
    name: 'Xã hội',
    vietnameseName: 'Xã hội / Giúp đỡ (Social)',
    color: '#10b981',
    bgColor: '#d1fae5',
    borderColor: '#6ee7b7',
    description: 'Thích giao tiếp, giảng dạy, hướng dẫn, tư vấn, chăm sóc, lắng nghe và đồng hành phát triển cộng đồng.',
    traits: ['Thân thiện', 'Đồng cảm', 'Thấu hiểu', 'Thích chia sẻ', 'Kiên nhẫn'],
    sampleJobs: ['Giáo viên / Giảng viên', 'Chuyên viên tư vấn tâm lý', 'Bác sĩ / Điều dưỡng', 'Quản lý nhân sự', 'Điều phối viên xã hội'],
    typicalMajors: ['Sư phạm Toán', 'Sư phạm Tiếng Anh', 'Tâm lý học', 'Công tác Xã hội', 'Điều dưỡng'],
    typicalCareers: ['Giáo viên Trung học', 'Chuyên gia Tâm lý Học đường', 'Chuyên viên Nhân sự', 'Điều dưỡng Trưởng'],
    suggestedExamCombinations: ['D01 (Toán, Văn, Anh)', 'C00 (Văn, Sử, Địa)', 'B00 (Toán, Hóa, Sinh)']
  },
  E: {
    code: 'E',
    name: 'Quản lý',
    vietnameseName: 'Doanh nghiệp / Lãnh đạo (Enterprising)',
    color: '#f59e0b',
    bgColor: '#fef3c7',
    borderColor: '#fcd34d',
    description: 'Thích dẫn dắt đội ngũ, thuyết phục người khác, kinh doanh, đàm phán, chấp nhận thử thách để đạt mục tiêu tổ chức.',
    traits: ['Tự tin', 'Thuyết phục tốt', 'Dám nghĩ dám làm', 'Quyết đoán', 'Tầm nhìn chiến lược'],
    sampleJobs: ['Giám đốc điều hành', 'Trưởng phòng Marketing', 'Luật sư', 'Doanh nhân khởi nghiệp', 'Quản lý dự án'],
    typicalMajors: ['Quản trị Kinh doanh', 'Kinh doanh Quốc tế', 'Marketing', 'Luật Kinh tế', 'Tài chính - Ngân hàng'],
    typicalCareers: ['Giám đốc Kinh doanh', 'Quản lý Dự án (PM)', 'Luật sư Doanh nghiệp', 'Chuyên gia Marketing'],
    suggestedExamCombinations: ['A01 (Toán, Lý, Anh)', 'D01 (Toán, Văn, Anh)', 'A00 (Toán, Lý, Hóa)']
  },
  C: {
    code: 'C',
    name: 'Nghiệp vụ',
    vietnameseName: 'Quy củ / Chi tiết (Conventional)',
    color: '#6366f1',
    bgColor: '#e0e7ff',
    borderColor: '#a5b4fc',
    description: 'Thích sự ngăn nắp, làm việc chi tiết với số liệu, quy trình chuẩn mực, hệ thống dữ liệu và tuân thủ kỷ luật cao.',
    traits: ['Cẩn thận', 'Ngăn nắp', 'Tỉ mỉ', 'Đúng giờ', 'Bảo mật tốt'],
    sampleJobs: ['Kiểm toán viên', 'Kế toán trưởng', 'Chuyên viên phân tích tài chính', 'Quản trị cơ sở dữ liệu', 'Chuyên viên hải quan'],
    typicalMajors: ['Kế toán - Kiểm toán', 'Tài chính Doanh nghiệp', 'Hệ thống Thông tin Quản lý', 'Logistics'],
    typicalCareers: ['Kiểm toán viên (CPA)', 'Kế toán trưởng', 'Chuyên viên Phân tích Tài chính', 'Quản trị CSDL'],
    suggestedExamCombinations: ['A00 (Toán, Lý, Hóa)', 'A01 (Toán, Lý, Anh)', 'D01 (Toán, Văn, Anh)']
  }
};

export interface ONETQuestion {
  id: number;
  category: RIASECCategory;
  text: string;
  activityText?: string;
  prompt?: string;
  exampleJob?: string;
}

export const ONET_MINI_QUESTIONS: ONETQuestion[] = [
  { id: 1, category: 'R', text: 'Lắp ráp, sửa chữa thiết bị điện thoại, máy vi tính hoặc bo mạch điện tử', activityText: 'Lắp ráp, sửa chữa thiết bị điện thoại, máy vi tính hoặc bo mạch điện tử', exampleJob: 'Kỹ sư Phần cứng / Cơ điện tử' },
  { id: 2, category: 'R', text: 'Vận hành máy bay, tàu hỏa hoặc điều khiển máy thi công công trình tự động', activityText: 'Vận hành máy bay, tàu hỏa hoặc điều khiển máy thi công công trình tự động', exampleJob: 'Kỹ sư Xây dựng / Giao thông' },
  { id: 3, category: 'R', text: 'Chăm sóc cây trồng, thiết kế cảnh quan hoặc làm việc tại nông trường công nghệ cao', activityText: 'Chăm sóc cây trồng, thiết kế cảnh quan hoặc làm việc tại nông trường công nghệ cao', exampleJob: 'Kỹ sư Nông nghiệp Công nghệ cao' },
  { id: 4, category: 'R', text: 'Lắp đặt, cấu hình hệ thống mạng máy tính cáp quang và máy chủ an ninh', activityText: 'Lắp đặt, cấu hình hệ thống mạng máy tính cáp quang và máy chủ an ninh', exampleJob: 'Kỹ sư Hạ tầng Mạng (Network)' },
  { id: 5, category: 'R', text: 'Thiết kế bản vẽ cơ khí 3D và gia công tạo mẫu sản phẩm bằng máy in 3D / CNC', activityText: 'Thiết kế bản vẽ cơ khí 3D và gia công tạo mẫu sản phẩm bằng máy in 3D / CNC', exampleJob: 'Kỹ sư Thiết kế Cơ khí' },

  { id: 6, category: 'I', text: 'Nghiên cứu cấu trúc phân tử DNA, vi khuẩn hoặc các phản ứng sinh học mới', activityText: 'Nghiên cứu cấu trúc phân tử DNA, vi khuẩn hoặc các phản ứng sinh học mới', exampleJob: 'Nhà Công nghệ Sinh học' },
  { id: 7, category: 'I', text: 'Phân tích số liệu thống kê lớn để tìm quy luật và đưa ra mô hình dự báo tương lai', activityText: 'Phân tích số liệu thống kê lớn để tìm quy luật và đưa ra mô hình dự báo tương lai', exampleJob: 'Chuyên gia Khoa học Dữ liệu (Data Scientist)' },
  { id: 8, category: 'I', text: 'Nghiên cứu thuật toán học máy (Machine Learning) và mạng nơ-ron nhân tạo', activityText: 'Nghiên cứu thuật toán học máy (Machine Learning) và mạng nơ-ron nhân tạo', exampleJob: 'Kỹ sư Trí tuệ Nhân tạo (AI Engineer)' },
  { id: 9, category: 'I', text: 'Tìm kiếm tài liệu khoa học và chứng minh các định lý toán học hoặc thuật toán logic', activityText: 'Tìm kiếm tài liệu khoa học và chứng minh các định lý toán học hoặc thuật toán logic', exampleJob: 'Nhà Toán tin Ứng dụng' },
  { id: 10, category: 'I', text: 'Thực hiện các thí nghiệm chuẩn độ hóa học để kiểm nghiệm chất lượng dược phẩm', activityText: 'Thực hiện các thí nghiệm chuẩn độ hóa học để kiểm nghiệm chất lượng dược phẩm', exampleJob: 'Dược sĩ Nghiên cứu & Phát triển' },

  { id: 11, category: 'A', text: 'Thiết kế giao diện ứng dụng di động (UI/UX) và sáng tạo bộ nhận diện thương hiệu', activityText: 'Thiết kế giao diện ứng dụng di động (UI/UX) và sáng tạo bộ nhận diện thương hiệu', exampleJob: 'Nhà thiết kế Đồ họa & UI/UX' },
  { id: 12, category: 'A', text: 'Sáng tác truyện tranh, viết kịch bản phim ảnh hoặc sản xuất nội dung video sáng tạo', activityText: 'Sáng tác truyện tranh, viết kịch bản phim ảnh hoặc sản xuất nội dung video sáng tạo', exampleJob: 'Biên kịch / Nhà sáng tạo Nội dung (Content Creator)' },
  { id: 13, category: 'A', text: 'Chụp ảnh nghệ thuật, quay phim điện ảnh và xử lý kỹ xảo hiệu ứng thị giác (VFX)', activityText: 'Chụp ảnh nghệ thuật, quay phim điện ảnh và xử lý kỹ xảo hiệu ứng thị giác (VFX)', exampleJob: 'Nhiếp ảnh gia / Kỹ thuật viên VFX' },
  { id: 14, category: 'A', text: 'Thiết kế thời trang, phối cảnh kiến trúc nội thất theo phong cách độc đáo', activityText: 'Thiết kế thời trang, phối cảnh kiến trúc nội thất theo phong cách độc đáo', exampleJob: 'Kiến trúc sư Nội thất' },
  { id: 15, category: 'A', text: 'Sáng tác bản nhạc, phối khí âm thanh hoặc biểu diễn nhạc cụ trên sân khấu', activityText: 'Sáng tác bản nhạc, phối khí âm thanh hoặc biểu diễn nhạc cụ trên sân khấu', exampleJob: 'Nhạc sĩ / Nhà sản xuất Âm nhạc' },

  { id: 16, category: 'S', text: 'Giảng dạy kiến thức, truyền cảm hứng học tập và rèn luyện kỹ năng cho người khác', activityText: 'Giảng dạy kiến thức, truyền cảm hứng học tập và rèn luyện kỹ năng cho người khác', exampleJob: 'Giáo viên / Giảng viên' },
  { id: 17, category: 'S', text: 'Tư vấn tâm lý, lắng nghe và hỗ trợ người khác tháo gỡ bế tắc trong cuộc sống', activityText: 'Tư vấn tâm lý, lắng nghe và hỗ trợ người khác tháo gỡ bế tắc trong cuộc sống', exampleJob: 'Chuyên viên Tư vấn Tâm lý' },
  { id: 18, category: 'S', text: 'Chăm sóc người bệnh, tư vấn sức khỏe dinh dưỡng và hướng dẫn phục hồi thể chất', activityText: 'Chăm sóc người bệnh, tư vấn sức khỏe dinh dưỡng và hướng dẫn phục hồi thể chất', exampleJob: 'Bác sĩ / Điều dưỡng viên' },
  { id: 19, category: 'S', text: 'Tổ chức các phong trào thiện nguyện cộng đồng và hoạt động xã hội phi lợi nhuận', activityText: 'Tổ chức các phong trào thiện nguyện cộng đồng và hoạt động xã hội phi lợi nhuận', exampleJob: 'Điều phối viên Dự án Phát triển' },
  { id: 20, category: 'S', text: 'Tư vấn hướng nghiệp, tuyển dụng nhân sự và tổ chức đào tạo kỹ năng làm việc', activityText: 'Tư vấn hướng nghiệp, tuyển dụng nhân sự và tổ chức đào tạo kỹ năng làm việc', exampleJob: 'Chuyên viên Đào tạo & Tuyển dụng (HR)' },

  { id: 21, category: 'E', text: 'Thành lập công ty khởi nghiệp, điều hành dự án và xây dựng chiến lược kinh doanh', activityText: 'Thành lập công ty khởi nghiệp, điều hành dự án và xây dựng chiến lược kinh doanh', exampleJob: 'Giám đốc Điều hành (CEO)' },
  { id: 22, category: 'E', text: 'Thuyết phục khách hàng, đàm phán hợp đồng thương mại và mở rộng doanh số', activityText: 'Thuyết phục khách hàng, đàm phán hợp đồng thương mại và mở rộng doanh số', exampleJob: 'Giám đốc Kinh doanh (Sales Director)' },
  { id: 23, category: 'E', text: 'Thuyết trình trước hội nghị đông người, tham gia tranh biện và bảo vệ luận điểm', activityText: 'Thuyết trình trước hội nghị đông người, tham gia tranh biện và bảo vệ luận điểm', exampleJob: 'Luật sư / Diễn giả truyền thông' },
  { id: 24, category: 'E', text: 'Tổ chức chiến dịch tiếp thị (Marketing), quảng bá thương hiệu trên các kênh truyền thông', activityText: 'Tổ chức chiến dịch tiếp thị (Marketing), quảng bá thương hiệu trên các kênh truyền thông', exampleJob: 'Trưởng phòng Marketing (CMO)' },
  { id: 25, category: 'E', text: 'Lập kế hoạch phân bổ nguồn lực, theo dõi tiến độ và thúc đẩy các thành viên đạt KPI', activityText: 'Lập kế hoạch phân bổ nguồn lực, theo dõi tiến độ và thúc đẩy các thành viên đạt KPI', exampleJob: 'Quản lý Dự án (Project Manager)' },

  { id: 26, category: 'C', text: 'Kiểm toán báo cáo tài chính, hạch toán sổ sách chứng từ kế toán theo đúng luật thuế', activityText: 'Kiểm toán báo cáo tài chính, hạch toán sổ sách chứng từ kế toán theo đúng luật thuế', exampleJob: 'Kiểm toán viên / Kế toán trưởng' },
  { id: 27, category: 'C', text: 'Thiết kế bảng biểu tính toán, quản lý cơ sở dữ liệu hồ sơ nhân sự chuẩn chỉ', activityText: 'Thiết kế bảng biểu tính toán, quản lý cơ sở dữ liệu hồ sơ nhân sự chuẩn chỉ', exampleJob: 'Chuyên viên Quản trị Cơ sở Dữ liệu' },
  { id: 28, category: 'C', text: 'Kiểm tra chất lượng quy trình (QA/QC) và rà soát sai sót văn bản pháp quy nghiêm ngặt', activityText: 'Kiểm tra chất lượng quy trình (QA/QC) và rà soát sai sót văn bản pháp quy nghiêm ngặt', exampleJob: 'Chuyên viên Pháp chế / Kiểm soát Chất lượng' },
  { id: 29, category: 'C', text: 'Lập thời khóa biểu, sắp xếp lịch thi và theo dõi tiến độ công việc theo thời gian biểu', activityText: 'Lập thời khóa biểu, sắp xếp lịch thi và theo dõi tiến độ công việc theo thời gian biểu', exampleJob: 'Trợ lý Điều hành / Thư ký' },
  { id: 30, category: 'C', text: 'Thực hiện thủ tục hải quan, kê khai chứng từ kho bãi và giám sát luồng vận tải logistics', activityText: 'Thực hiện thủ tục hải quan, kê khai chứng từ kho bãi và giám sát luồng vận tải logistics', exampleJob: 'Chuyên viên Khai báo Hải quan & Logistics' }
];
