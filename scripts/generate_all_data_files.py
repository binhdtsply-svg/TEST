import json
import os

with open('server/db/system_persistence_backup.json') as f:
    backup = json.load(f)

tables = backup['tables']
os.makedirs('src/data', exist_ok=True)

# 1. onetQuestions.ts
onet_code = """/**
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
"""
with open('src/data/onetQuestions.ts', 'w', encoding='utf-8') as f:
    f.write(onet_code)

# 2. careerAssessmentData.ts
career_assess_code = """/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MBTIQuestion, MBTIResult, WorkValuesResult, WorkValuesQuestion } from '../types';

export const MBTI_QUESTIONS: MBTIQuestion[] = [
  {
    id: 1,
    dimension: 'EI',
    dimensionName: 'Xu hướng Năng lượng (Hướng ngoại E vs Hướng nội I)',
    text: 'Khi tham gia một buổi sinh hoạt tập thể hoặc câu lạc bộ mới:',
    optionA: { text: 'Chủ động làm quen nhiều bạn mới và cảm thấy tràn đầy năng lượng khi trò chuyện.', trait: 'E', value: 'E' },
    optionB: { text: 'Thích quan sát trước, chỉ trò chuyện sâu với một vài người quen thuộc để giữ năng lượng.', trait: 'I', value: 'I' }
  },
  {
    id: 2,
    dimension: 'EI',
    dimensionName: 'Xu hướng Năng lượng (Hướng ngoại E vs Hướng nội I)',
    text: 'Sau một tuần học tập căng thẳng, cách bạn nạp lại năng lượng hiệu quả nhất là:',
    optionA: { text: 'Đi chơi, tụ tập bạn bè xem phim hoặc tham gia các hoạt động sôi động ngoài trời.', trait: 'E', value: 'E' },
    optionB: { text: 'Ở một mình trong phòng đọc sách, nghe nhạc, chơi game hoặc suy ngẫm yên tĩnh.', trait: 'I', value: 'I' }
  },
  {
    id: 3,
    dimension: 'EI',
    dimensionName: 'Xu hướng Năng lượng (Hướng ngoại E vs Hướng nội I)',
    text: 'Trong giờ thảo luận nhóm trên lớp:',
    optionA: { text: 'Thường vừa nghĩ vừa nói, hào hứng phát biểu ý kiến ngay khi nảy ra ý tưởng.', trait: 'E', value: 'E' },
    optionB: { text: 'Thường suy nghĩ thấu đáo và sắp xếp câu chữ trong đầu trước khi cất lời.', trait: 'I', value: 'I' }
  },
  {
    id: 4,
    dimension: 'SN',
    dimensionName: 'Thu nhận Thông tin (Thực tế S vs Trực giác N)',
    text: 'Khi tiếp nhận một bài học hoặc dự án nghiên cứu mới:',
    optionA: { text: 'Chú trọng vào các chi tiết cụ thể, số liệu thực tế, các ví dụ rõ ràng và ứng dụng thực tiễn.', trait: 'S', value: 'S' },
    optionB: { text: 'Chú trọng vào bức tranh toàn cảnh, các ý tưởng lớn, mối liên hệ trừu tượng và khả năng tương lai.', trait: 'N', value: 'N' }
  },
  {
    id: 5,
    dimension: 'SN',
    dimensionName: 'Thu nhận Thông tin (Thực tế S vs Trực giác N)',
    text: 'Bạn đánh giá cao phong cách làm việc nào hơn:',
    optionA: { text: 'Thực tế, bám sát các phương pháp đã được chứng minh hiệu quả qua thời gian.', trait: 'S', value: 'S' },
    optionB: { text: 'Đổi mới sáng tạo, thử nghiệm những phương pháp hoàn toàn mới mẻ chưa ai từng làm.', trait: 'N', value: 'N' }
  },
  {
    id: 6,
    dimension: 'SN',
    dimensionName: 'Thu nhận Thông tin (Thực tế S vs Trực giác N)',
    text: 'Khi miêu tả một sự kiện bạn vừa chứng kiến:',
    optionA: { text: 'Kể chính xác những gì thực sự đã xảy ra theo đúng trình tự thời gian và chi tiết cụ thể.', trait: 'S', value: 'S' },
    optionB: { text: 'Nhấn mạnh vào ý nghĩa, cảm nhận và những thông điệp ẩn sau sự kiện đó.', trait: 'N', value: 'N' }
  },
  {
    id: 7,
    dimension: 'TF',
    dimensionName: 'Ra Quyết định (Lý trí T vs Cảm xúc F)',
    text: 'Khi đưa ra quyết định giải quyết một vụ việc tranh cãi:',
    optionA: { text: 'Dựa trên sự công bằng, nguyên tắc đúng sai khách quan và phân tích logic không thiên vị.', trait: 'T', value: 'T' },
    optionB: { text: 'Dựa trên sự thấu cảm, cảm xúc của những người liên quan và giữ gìn hòa khí mối quan hệ.', trait: 'F', value: 'F' }
  },
  {
    id: 8,
    dimension: 'TF',
    dimensionName: 'Ra Quyết định (Lý trí T vs Cảm xúc F)',
    text: 'Khi góp ý cho bạn bè về một bài thuyết trình còn thiếu sót:',
    optionA: { text: 'Chỉ rõ thẳng thắn các lỗi sai logic và điểm yếu để bạn sửa chữa nhanh chóng.', trait: 'T', value: 'T' },
    optionB: { text: 'Khen ngợi nỗ lực trước rồi khéo léo góp ý nhẹ nhàng để không làm bạn tổn thương.', trait: 'F', value: 'F' }
  },
  {
    id: 9,
    dimension: 'TF',
    dimensionName: 'Ra Quyết định (Lý trí T vs Cảm xúc F)',
    text: 'Điều gì mang lại cho bạn cảm giác thỏa mãn hơn:',
    optionA: { text: 'Tìm ra giải pháp logic giải quyết triệt để một vấn đề hóc búa.', trait: 'T', value: 'T' },
    optionB: { text: 'Giúp đỡ được một người đang gặp khó khăn và cảm nhận được sự ấm áp, gắn kết.', trait: 'F', value: 'F' }
  },
  {
    id: 10,
    dimension: 'JP',
    dimensionName: 'Phong cách Sống (Nguyên tắc J vs Linh hoạt P)',
    text: 'Khi chuẩn bị cho một chuyến tham quan dã ngoại hoặc kỳ thi học kỳ:',
    optionA: { text: 'Lập kế hoạch chi tiết, có danh sách việc cần làm (to-do list) và thời gian biểu cụ thể từ sớm.', trait: 'J', value: 'J' },
    optionB: { text: 'Để mọi việc diễn ra tự nhiên, tùy cơ ứng biến linh hoạt theo hoàn cảnh thực tế phát sinh.', trait: 'P', value: 'P' }
  },
  {
    id: 11,
    dimension: 'JP',
    dimensionName: 'Phong cách Sống (Nguyên tắc J vs Linh hoạt P)',
    text: 'Cách bạn tiếp cận bài tập lớn có hạn nộp dài hạn:',
    optionA: { text: 'Chia nhỏ bài tập thành từng phần và hoàn thành từng mốc trước thời hạn để không bị dồn việc.', trait: 'J', value: 'J' },
    optionB: { text: 'Chờ đến gần sát hạn nộp mới tập trung cao độ vì áp lực thời gian tạo nhiều cảm hứng sáng tạo hơn.', trait: 'P', value: 'P' }
  },
  {
    id: 12,
    dimension: 'JP',
    dimensionName: 'Phong cách Sống (Nguyên tắc J vs Linh hoạt P)',
    text: 'Không gian góc học tập và sinh hoạt của bạn thường:',
    optionA: { text: 'Gọn gàng, mọi đồ đạc để đúng vị trí quy định để khi cần tìm là thấy ngay.', trait: 'J', value: 'J' },
    optionB: { text: 'Có thể hơi lộn xộn theo cách riêng nhưng bạn vẫn biết mọi thứ ở đâu trong tầm tay.', trait: 'P', value: 'P' }
  }
];

export function calculateMBTIResult(
  answers: Record<number, 'A' | 'B'>,
  studentId?: string
): MBTIResult {
  let eCount = 0, iCount = 0;
  let sCount = 0, nCount = 0;
  let tCount = 0, fCount = 0;
  let jCount = 0, pCount = 0;

  MBTI_QUESTIONS.forEach(q => {
    const choice = answers[q.id];
    if (choice === 'A') {
      const trait = q.optionA.trait;
      if (trait === 'E') eCount++;
      if (trait === 'S') sCount++;
      if (trait === 'T') tCount++;
      if (trait === 'J') jCount++;
    } else if (choice === 'B') {
      const trait = q.optionB.trait;
      if (trait === 'I') iCount++;
      if (trait === 'N') nCount++;
      if (trait === 'F') fCount++;
      if (trait === 'P') pCount++;
    }
  });

  const eRatio = Math.round((eCount / Math.max(1, eCount + iCount)) * 100);
  const iRatio = 100 - eRatio;
  const sRatio = Math.round((sCount / Math.max(1, sCount + nCount)) * 100);
  const nRatio = 100 - sRatio;
  const tRatio = Math.round((tCount / Math.max(1, tCount + fCount)) * 100);
  const fRatio = 100 - tRatio;
  const jRatio = Math.round((jCount / Math.max(1, jCount + pCount)) * 100);
  const pRatio = 100 - jRatio;

  const letter1 = eCount >= iCount ? 'E' : 'I';
  const letter2 = sCount >= nCount ? 'S' : 'N';
  const letter3 = tCount >= fCount ? 'T' : 'F';
  const letter4 = jCount >= pCount ? 'J' : 'P';
  const code = `${letter1}${letter2}${letter3}${letter4}`;

  return {
    id: `mbti-${Date.now()}`,
    studentId: studentId || '',
    code,
    title: `Nhóm tính cách ${code}`,
    description: 'Tư duy logic sắc bén, độc lập, có tầm nhìn xa và chiến lược rõ ràng cho tương lai.',
    strengths: ['Tư duy phản biện', 'Tự chủ cao', 'Chiến lược dài hạn'],
    learningWorkEnvironments: ['Môi trường chuyên nghiệp, sáng tạo, đề cao tư duy logic và sự chủ động.'],
    recommendedCareers: ['Kỹ sư Phần mềm', 'Chuyên gia Trí tuệ Nhân tạo', 'Nhà Nghiên cứu Chiến lược', 'Kiến trúc sư Hệ thống'],
    recommendedMajors: ['Khoa học Máy tính', 'Kinh tế Quốc tế', 'Kỹ thuật Công nghệ', 'Tâm lý học Ứng dụng'],
    notesForGrowth: ['Cân bằng giữa tư duy cá nhân và lắng nghe phản hồi từ tập thể để phát triển toàn diện.'],
    dimensionScores: {
      E: eRatio, I: iRatio,
      S: sRatio, N: nRatio,
      T: tRatio, F: fRatio,
      J: jRatio, P: pRatio
    },
    percentages: {
      EI: { dominant: letter1 as any, percent: letter1 === 'E' ? eRatio : iRatio },
      SN: { dominant: letter2 as any, percent: letter2 === 'S' ? sRatio : nRatio },
      TF: { dominant: letter3 as any, percent: letter3 === 'T' ? tRatio : fRatio },
      JP: { dominant: letter4 as any, percent: letter4 === 'J' ? jRatio : pRatio }
    },
    testedAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };
}

export const WORK_VALUES_QUESTIONS: WorkValuesQuestion[] = [
  { id: 1, category: 'ACHIEVEMENT', categoryName: 'Thành tựu & Năng lực', text: 'Công việc cho phép tôi phát huy tối đa sở trường và cảm nhận được sự tiến bộ rõ rệt mỗi ngày.' },
  { id: 2, category: 'ACHIEVEMENT', categoryName: 'Thành tựu & Năng lực', text: 'Được nhìn thấy kết quả cụ thể, hữu hình từ những nỗ lực làm việc chăm chỉ của bản thân.' },
  { id: 3, category: 'AUTONOMY', categoryName: 'Tự chủ & Độc lập', text: 'Có quyền tự do sắp xếp thời gian biểu và tự quyết định phương pháp thực hiện nhiệm vụ.' },
  { id: 4, category: 'AUTONOMY', categoryName: 'Tự chủ & Độc lập', text: 'Được tự do sáng tạo, thử nghiệm các giải pháp mới mà không phải xin phép quá nhiều cấp trung gian.' },
  { id: 5, category: 'GROWTH', categoryName: 'Sự công nhận & Danh tiếng', text: 'Được xã hội và đồng nghiệp tôn trọng, ngưỡng mộ vì vị thế và tầm ảnh hưởng của công việc.' },
  { id: 6, category: 'GROWTH', categoryName: 'Sự công nhận & Danh tiếng', text: 'Có cơ hội thăng tiến rõ ràng lên các vị trí lãnh đạo và đạt mức thu nhập cao hàng đầu.' },
  { id: 7, category: 'CONTRIBUTION', categoryName: 'Mối quan hệ & Đồng nghiệp', text: 'Làm việc trong một tập thể thân thiện, đoàn kết, nơi mọi người giúp đỡ và đối xử chân thành với nhau.' },
  { id: 8, category: 'CONTRIBUTION', categoryName: 'Mối quan hệ & Đồng nghiệp', text: 'Công việc đóng góp trực tiếp cho sự phát triển của cộng đồng và giúp đỡ những hoàn cảnh khó khăn.' },
  { id: 9, category: 'STABILITY', categoryName: 'Môi trường & Hỗ trợ', text: 'Công ty có chính sách đãi ngộ tốt, trang bị cơ sở vật chất hiện đại và ban lãnh đạo công tâm.' },
  { id: 10, category: 'STABILITY', categoryName: 'Môi trường & Hỗ trợ', text: 'Được đào tạo bài bản, có người hướng dẫn (mentor) tận tâm chỉ dạy trong quá trình làm việc.' },
  { id: 11, category: 'STABILITY', categoryName: 'Điều kiện làm việc & Cân bằng', text: 'Có sự cân bằng lành mạnh giữa công việc và đời sống cá nhân, ít phải làm thêm giờ (OT).' },
  { id: 12, category: 'STABILITY', categoryName: 'Điều kiện làm việc & Cân bằng', text: 'Công việc ổn định lâu dài, ít rủi ro sa thải và có chế độ bảo hiểm y tế, phúc lợi toàn diện.' }
];

export function calculateWorkValuesResult(
  answers: Record<number, number>,
  studentId?: string
): WorkValuesResult {
  const scores: Record<string, number> = {
    'Thành tựu & Năng lực': 0,
    'Tự chủ & Độc lập': 0,
    'Sự công nhận & Danh tiếng': 0,
    'Mối quan hệ & Đồng nghiệp': 0,
    'Môi trường & Hỗ trợ': 0,
    'Điều kiện làm việc & Cân bằng': 0
  };

  WORK_VALUES_QUESTIONS.forEach(q => {
    const s = answers[q.id] || 3;
    const cat = q.categoryName || 'Thành tựu & Năng lực';
    scores[cat] = (scores[cat] || 0) + s;
  });

  const topValues = Object.entries(scores).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([key, score]) => ({
    key,
    name: key,
    score,
    maxScore: 10,
    description: `Ưu tiên cao giá trị ${key}`
  }));

  return {
    id: `wv-${Date.now()}`,
    studentId: studentId || '',
    scores,
    topValues,
    recommendedWorkStyles: ['Độc lập', 'Sáng tạo', 'Tự chủ'],
    recommendedCareers: ['Kỹ sư Công nghệ', 'Chuyên viên Tài chính', 'Chuyên gia Đào tạo & Phát triển', 'Quản lý Dự án'],
    recommendedMajors: ['Khoa học Máy tính', 'Kinh doanh Quốc tế'],
    disclaimer: 'Kết quả mang tính tham khảo hướng nghiệp theo thang đo O*NET Work Values.',
    testedAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };
}
"""
with open('src/data/careerAssessmentData.ts', 'w', encoding='utf-8') as f:
    f.write(career_assess_code)

# 3. occupationsAndAdmissionsData.ts
occupations_code = """/**
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
"""
with open('src/data/occupationsAndAdmissionsData.ts', 'w', encoding='utf-8') as f:
    f.write(occupations_code)

# 4. majorsAndBenchmarksData.ts
majors_code = """/**
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
"""
with open('src/data/majorsAndBenchmarksData.ts', 'w', encoding='utf-8') as f:
    f.write(majors_code)

# 5. demoData.ts
stus = tables.get('students', [])
lan_stus_records = [s for s in stus if s.get('tenant_id') == 'tenant-lan-nguyen']
nam_stus_records = [s for s in stus if s.get('tenant_id') == 'tenant-hoang-nam']

def student_record_to_student(r):
    raw_meta = {}
    if r.get('raw_metadata'):
        try:
            raw_meta = json.loads(r['raw_metadata'])
        except:
            pass
    
    return {
        "id": r["id"],
        "tenantId": r.get("tenant_id") or "tenant-lan-nguyen",
        "classId": r.get("class_id") or "class-11a1-2025",
        "code": r["code"],
        "anonymousCode": r.get("anonymous_code") or f"ANON-{r['code']}",
        "fullName": r["full_name"],
        "gender": r["gender"],
        "dob": r["dob"],
        "group": r.get("group_num", 1),
        "officerRole": r.get("officer_role") or "Thành viên",
        "avatar": r.get("avatar") or None,
        "phone": r.get("phone") or "",
        "email": r.get("email") or "",
        "address": r.get("address") or "",
        "fatherName": r.get("father_name") or "",
        "fatherPhone": r.get("father_phone") or "",
        "fatherJob": r.get("father_job") or "",
        "motherName": r.get("mother_name") or "",
        "motherPhone": r.get("mother_phone") or "",
        "motherJob": r.get("mother_job") or "",
        "healthNotes": r.get("health_notes") or "",
        "talents": r.get("talents") or "",
        "privateTeacherNotes": r.get("private_teacher_notes") or "",
        "needsSpecialAttention": bool(r.get("needs_special_attention")),
        "attentionCategories": json.loads(r["attention_categories"]) if r.get("attention_categories") else None,
        "attentionNote": r.get("attention_note") or None,
        "supportMeasure": r.get("support_measure") or None,
        "attentionStatus": r.get("attention_status") or "monitoring",
        "attentionStartedAt": r.get("attention_started_at") or None,
        "attentionUpdatedAt": r.get("attention_updated_at") or None,
        "attentionUpdatedBy": r.get("attention_updated_by") or None,
        "status": r.get("status") or "Đang học",
        "studentActivationToken": f"STU-{r['code']}",
        "parentActivationToken": f"PAR-{r['code']}",
        "violationHandlingRecords": raw_meta.get("violationHandlingRecords", [])
    }

initial_students = [student_record_to_student(r) for r in lan_stus_records]
if len(initial_students) < 14:
    additional_needed = [
        {"id": "hs-03", "code": "HS03", "fullName": "Lê Hoàng Long", "gender": "Nam", "dob": "2008-05-15", "group": 1, "officerRole": "Bí thư Chi đoàn"},
        {"id": "hs-04", "code": "HS04", "fullName": "Phạm Quỳnh Anh", "gender": "Nữ", "dob": "2008-09-12", "group": 2, "officerRole": "Thành viên"},
        {"id": "hs-05", "code": "HS05", "fullName": "Đỗ Minh Khang", "gender": "Nam", "dob": "2008-03-24", "group": 2, "officerRole": "Tổ trưởng Tổ 1"},
        {"id": "hs-06", "code": "HS06", "fullName": "Vũ Thu Trang", "gender": "Nữ", "dob": "2008-11-05", "group": 2, "officerRole": "Thành viên"},
        {"id": "hs-07", "code": "HS07", "fullName": "Bùi Đức Trọng", "gender": "Nam", "dob": "2008-07-18", "group": 3, "officerRole": "Tổ trưởng Tổ 2"},
        {"id": "hs-08", "code": "HS08", "fullName": "Hoàng Lan Hương", "gender": "Nữ", "dob": "2008-02-28", "group": 3, "officerRole": "Thành viên"},
        {"id": "hs-09", "code": "HS09", "fullName": "Đinh Quang Hải", "gender": "Nam", "dob": "2008-10-10", "group": 3, "officerRole": "Tổ trưởng Tổ 3"},
        {"id": "hs-10", "code": "HS10", "fullName": "Ngô Thùy Chi", "gender": "Nữ", "dob": "2008-12-03", "group": 4, "officerRole": "Thành viên"},
        {"id": "hs-11", "code": "HS11", "fullName": "Dương Bảo Nam", "gender": "Nam", "dob": "2008-06-22", "group": 4, "officerRole": "Tổ trưởng Tổ 4"},
        {"id": "hs-12", "code": "HS12", "fullName": "Trịnh Mỹ Duyên", "gender": "Nữ", "dob": "2008-04-09", "group": 4, "officerRole": "Thành viên"},
        {"id": "hs-13", "code": "HS13", "fullName": "Lý Gia Bảo", "gender": "Nam", "dob": "2008-01-17", "group": 1, "officerRole": "Thành viên"},
        {"id": "hs-14", "code": "HS14", "fullName": "Mai Cẩm Vân", "gender": "Nữ", "dob": "2008-08-30", "group": 2, "officerRole": "Thành viên"}
    ]
    existing_ids = {s['id'] for s in initial_students}
    for add in additional_needed:
        if add['id'] not in existing_ids:
            initial_students.append({
                "id": add["id"],
                "tenantId": "tenant-lan-nguyen",
                "classId": "class-11a1-2025",
                "code": add["code"],
                "anonymousCode": f"ANON-{add['id']}",
                "fullName": add["fullName"],
                "gender": add["gender"],
                "dob": add["dob"],
                "group": add["group"],
                "officerRole": add["officerRole"],
                "avatar": None,
                "phone": "0912 345 678",
                "email": f"{add['id']}@lhp.edu.vn",
                "address": "TP. Hồ Chí Minh",
                "status": "Đang học",
                "studentActivationToken": f"STU-{add['code']}-11A1",
                "parentActivationToken": f"PAR-{add['code']}-11A1"
            })

initial_teacher2_students = [student_record_to_student(r) for r in nam_stus_records]
if len(initial_teacher2_students) == 0:
    initial_teacher2_students = [
        {
            "id": "tch2-stu-01",
            "tenantId": "tenant-hoang-nam",
            "classId": "class-12a2-2025",
            "code": "12A2-01",
            "fullName": "Phan Hoàng Yến",
            "gender": "Nữ",
            "dob": "2007-03-12",
            "group": 1,
            "officerRole": "Lớp trưởng",
            "avatar": None,
            "status": "Đang học",
            "studentActivationToken": "STU-12A2-01",
            "parentActivationToken": "PAR-12A2-01"
        }
    ]

# Subjects according to GDPT 2018
thpt_subjects = [
  { "id": "sub-van", "code": "VAN", "subjectCode": "VAN", "name": "Ngữ văn", "subjectType": "MANDATORY", "assessmentMode": "SCORE_AND_COMMENT", "coefficient": 2, "periodsPerWeek": 4, "selected": True },
  { "id": "sub-toan", "code": "TOAN", "subjectCode": "TOAN", "name": "Toán học", "subjectType": "MANDATORY", "assessmentMode": "SCORE_AND_COMMENT", "coefficient": 2, "periodsPerWeek": 4, "selected": True },
  { "id": "sub-eng", "code": "ENG", "subjectCode": "ENG", "name": "Tiếng Anh", "subjectType": "MANDATORY", "assessmentMode": "SCORE_AND_COMMENT", "coefficient": 2, "periodsPerWeek": 3, "selected": True },
  { "id": "sub-su", "code": "SU", "subjectCode": "SU", "name": "Lịch sử", "subjectType": "MANDATORY", "assessmentMode": "SCORE_AND_COMMENT", "coefficient": 1, "periodsPerWeek": 2, "selected": True },
  { "id": "sub-gdtc", "code": "GDTC", "subjectCode": "GDTC", "name": "Giáo dục thể chất", "subjectType": "MANDATORY", "assessmentMode": "COMMENT_ONLY", "coefficient": 1, "periodsPerWeek": 2, "selected": True },
  { "id": "sub-gdqp", "code": "GDQP", "subjectCode": "GDQP", "name": "Giáo dục quốc phòng và an ninh", "subjectType": "MANDATORY", "assessmentMode": "SCORE_AND_COMMENT", "coefficient": 1, "periodsPerWeek": 1, "selected": True },
  { "id": "sub-hdtn", "code": "HDTN", "subjectCode": "HDTN", "name": "Hoạt động trải nghiệm, hướng nghiệp", "subjectType": "ACTIVITY", "assessmentMode": "COMMENT_ONLY", "coefficient": 1, "periodsPerWeek": 3, "selected": True },
  { "id": "sub-gddp", "code": "GDDP", "subjectCode": "GDDP", "name": "Nội dung giáo dục của địa phương", "subjectType": "MANDATORY", "assessmentMode": "COMMENT_ONLY", "coefficient": 1, "periodsPerWeek": 1, "selected": True },
  { "id": "sub-ly", "code": "LY", "subjectCode": "LY", "name": "Vật lí", "subjectType": "ELECTIVE", "assessmentMode": "SCORE_AND_COMMENT", "coefficient": 1, "periodsPerWeek": 2, "selected": True },
  { "id": "sub-hoa", "code": "HOA", "subjectCode": "HOA", "name": "Hóa học", "subjectType": "ELECTIVE", "assessmentMode": "SCORE_AND_COMMENT", "coefficient": 1, "periodsPerWeek": 2, "selected": True },
  { "id": "sub-sinh", "code": "SINH", "subjectCode": "SINH", "name": "Sinh học", "subjectType": "ELECTIVE", "assessmentMode": "SCORE_AND_COMMENT", "coefficient": 1, "periodsPerWeek": 2, "selected": True },
  { "id": "sub-dia", "code": "DIA", "subjectCode": "DIA", "name": "Địa lí", "subjectType": "ELECTIVE", "assessmentMode": "SCORE_AND_COMMENT", "coefficient": 1, "periodsPerWeek": 2, "selected": True },
  { "id": "sub-ktpl", "code": "KTPL", "subjectCode": "KTPL", "name": "Giáo dục kinh tế và pháp luật", "subjectType": "ELECTIVE", "assessmentMode": "SCORE_AND_COMMENT", "coefficient": 1, "periodsPerWeek": 2, "selected": True },
  { "id": "sub-tin", "code": "TIN", "subjectCode": "TIN", "name": "Tin học", "subjectType": "ELECTIVE", "assessmentMode": "SCORE_AND_COMMENT", "coefficient": 1, "periodsPerWeek": 2, "selected": True },
  { "id": "sub-cn", "code": "CN", "subjectCode": "CN", "name": "Công nghệ", "subjectType": "ELECTIVE", "assessmentMode": "SCORE_AND_COMMENT", "coefficient": 1, "periodsPerWeek": 2, "selected": True },
  { "id": "sub-an", "code": "AN", "subjectCode": "AN", "name": "Âm nhạc", "subjectType": "ELECTIVE", "assessmentMode": "COMMENT_ONLY", "coefficient": 1, "periodsPerWeek": 1, "selected": False },
  { "id": "sub-mt", "code": "MT", "subjectCode": "MT", "name": "Mĩ thuật", "subjectType": "ELECTIVE", "assessmentMode": "COMMENT_ONLY", "coefficient": 1, "periodsPerWeek": 1, "selected": False }
]

thcs_subjects = [
  { "id": "thcs-van", "name": "Ngữ văn", "subjectType": "MANDATORY", "assessmentMode": "SCORE_AND_COMMENT" },
  { "id": "thcs-toan", "name": "Toán học", "subjectType": "MANDATORY", "assessmentMode": "SCORE_AND_COMMENT" },
  { "id": "thcs-eng", "name": "Tiếng Anh", "subjectType": "MANDATORY", "assessmentMode": "SCORE_AND_COMMENT" },
  { "id": "thcs-khtn", "name": "Khoa học tự nhiên", "subjectType": "MANDATORY", "assessmentMode": "SCORE_AND_COMMENT" },
  { "id": "thcs-lsdl", "name": "Lịch sử và Địa lí", "subjectType": "MANDATORY", "assessmentMode": "SCORE_AND_COMMENT" },
  { "id": "thcs-gdcd", "name": "Giáo dục công dân", "subjectType": "MANDATORY", "assessmentMode": "SCORE_AND_COMMENT" },
  { "id": "thcs-tin", "name": "Tin học", "subjectType": "MANDATORY", "assessmentMode": "SCORE_AND_COMMENT" },
  { "id": "thcs-cn", "name": "Công nghệ", "subjectType": "MANDATORY", "assessmentMode": "SCORE_AND_COMMENT" },
  { "id": "thcs-gdtc", "name": "Giáo dục thể chất", "subjectType": "MANDATORY", "assessmentMode": "COMMENT_ONLY" },
  { "id": "thcs-nt", "name": "Nghệ thuật", "subjectType": "MANDATORY", "assessmentMode": "COMMENT_ONLY" },
  { "id": "thcs-hdtn", "name": "Hoạt động trải nghiệm, hướng nghiệp", "subjectType": "ACTIVITY", "assessmentMode": "COMMENT_ONLY" },
  { "id": "thcs-gddp", "name": "Nội dung giáo dục của địa phương", "subjectType": "MANDATORY", "assessmentMode": "COMMENT_ONLY" }
]

pri_g12_subjects = [
  { "id": "pri-tv", "name": "Tiếng Việt", "subjectType": "MANDATORY", "assessmentMode": "COMMENT_ONLY" },
  { "id": "pri-toan", "name": "Toán học", "subjectType": "MANDATORY", "assessmentMode": "COMMENT_ONLY" },
  { "id": "pri-dd", "name": "Đạo đức", "subjectType": "MANDATORY", "assessmentMode": "COMMENT_ONLY" },
  { "id": "pri-tnxh", "name": "Tự nhiên và Xã hội", "subjectType": "MANDATORY", "assessmentMode": "COMMENT_ONLY" },
  { "id": "pri-gdtc", "name": "Giáo dục thể chất", "subjectType": "MANDATORY", "assessmentMode": "COMMENT_ONLY" },
  { "id": "pri-nt", "name": "Nghệ thuật (Âm nhạc, Mĩ thuật)", "subjectType": "MANDATORY", "assessmentMode": "COMMENT_ONLY" },
  { "id": "pri-hdtn", "name": "Hoạt động trải nghiệm", "subjectType": "ACTIVITY", "assessmentMode": "COMMENT_ONLY" },
  { "id": "pri-eng", "name": "Tiếng Anh", "subjectType": "MANDATORY", "assessmentMode": "COMMENT_ONLY" }
]

pri_g3_subjects = [
  *pri_g12_subjects,
  { "id": "pri-tincn", "name": "Tin học và Công nghệ", "subjectType": "MANDATORY", "assessmentMode": "COMMENT_ONLY" }
]

pri_g45_subjects = [
  { "id": "pri-tv", "name": "Tiếng Việt", "subjectType": "MANDATORY", "assessmentMode": "SCORE_AND_COMMENT" },
  { "id": "pri-toan", "name": "Toán học", "subjectType": "MANDATORY", "assessmentMode": "SCORE_AND_COMMENT" },
  { "id": "pri-eng", "name": "Tiếng Anh", "subjectType": "MANDATORY", "assessmentMode": "SCORE_AND_COMMENT" },
  { "id": "pri-kh", "name": "Khoa học", "subjectType": "MANDATORY", "assessmentMode": "SCORE_AND_COMMENT" },
  { "id": "pri-lsdl", "name": "Lịch sử và Địa lí", "subjectType": "MANDATORY", "assessmentMode": "SCORE_AND_COMMENT" },
  { "id": "pri-dd", "name": "Đạo đức", "subjectType": "MANDATORY", "assessmentMode": "COMMENT_ONLY" },
  { "id": "pri-tincn", "name": "Tin học và Công nghệ", "subjectType": "MANDATORY", "assessmentMode": "COMMENT_ONLY" },
  { "id": "pri-gdtc", "name": "Giáo dục thể chất", "subjectType": "MANDATORY", "assessmentMode": "COMMENT_ONLY" },
  { "id": "pri-nt", "name": "Nghệ thuật", "subjectType": "MANDATORY", "assessmentMode": "COMMENT_ONLY" },
  { "id": "pri-hdtn", "name": "Hoạt động trải nghiệm", "subjectType": "ACTIVITY", "assessmentMode": "COMMENT_ONLY" }
]

primary_subjects = pri_g45_subjects

gdtx_subjects = [
  { "id": "gdtx-van", "name": "Ngữ văn", "subjectType": "MANDATORY", "assessmentMode": "SCORE_AND_COMMENT" },
  { "id": "gdtx-toan", "name": "Toán học", "subjectType": "MANDATORY", "assessmentMode": "SCORE_AND_COMMENT" },
  { "id": "gdtx-su", "name": "Lịch sử", "subjectType": "MANDATORY", "assessmentMode": "SCORE_AND_COMMENT" },
  { "id": "gdtx-dia", "name": "Địa lí", "subjectType": "ELECTIVE", "assessmentMode": "SCORE_AND_COMMENT" },
  { "id": "gdtx-ly", "name": "Vật lí", "subjectType": "ELECTIVE", "assessmentMode": "SCORE_AND_COMMENT" },
  { "id": "gdtx-hoa", "name": "Hóa học", "subjectType": "ELECTIVE", "assessmentMode": "SCORE_AND_COMMENT" },
  { "id": "gdtx-sinh", "name": "Sinh học", "subjectType": "ELECTIVE", "assessmentMode": "SCORE_AND_COMMENT" }
]

demo_data_content = f"""/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {{
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
}} from '../types';

export const initialStudents: Student[] = {json.dumps(initial_students, indent=2, ensure_ascii=False)};

export const initialTeacher2Students: Student[] = {json.dumps(initial_teacher2_students, indent=2, ensure_ascii=False)};

export const THPT_2018_STANDARD_SUBJECTS: SubjectConfig[] = {json.dumps(thpt_subjects, indent=2, ensure_ascii=False)};

export const THCS_2018_STANDARD_SUBJECTS: SubjectConfig[] = {json.dumps(thcs_subjects, indent=2, ensure_ascii=False)};

export const PRIMARY_G12_STANDARD_SUBJECTS: SubjectConfig[] = {json.dumps(pri_g12_subjects, indent=2, ensure_ascii=False)};

export const PRIMARY_G3_STANDARD_SUBJECTS: SubjectConfig[] = {json.dumps(pri_g3_subjects, indent=2, ensure_ascii=False)};

export const PRIMARY_G45_STANDARD_SUBJECTS: SubjectConfig[] = {json.dumps(pri_g45_subjects, indent=2, ensure_ascii=False)};

export const PRIMARY_2018_STANDARD_SUBJECTS: SubjectConfig[] = {json.dumps(primary_subjects, indent=2, ensure_ascii=False)};

export const GDTX_THPT_STANDARD_SUBJECTS: SubjectConfig[] = {json.dumps(gdtx_subjects, indent=2, ensure_ascii=False)};

export const initialSubjects: SubjectConfig[] = THPT_2018_STANDARD_SUBJECTS;

export const initialClassSettings: ClassSettings = {{
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
  theme: {{ primaryColor: '#0D9488', fontFamily: 'Inter' }},
  subjects: initialSubjects,
  curriculumType: 'THPT',
  educationProgram: 'THPT',
  schoolYearTimeline: {{
    startDateHK1: '2025-09-05',
    endDateHK1: '2026-01-16',
    startDateHK2: '2026-01-19',
    endDateHK2: '2026-05-30',
    schoolYearLabel: '2025 - 2026',
    totalWeeksHK1: 18,
    totalWeeksHK2: 17,
    totalWeeks: 35
  }}
}};

export const initialTeacher2ClassSettings: ClassSettings = {{
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
  theme: {{ primaryColor: '#2563EB', fontFamily: 'Inter' }},
  subjects: initialSubjects,
  curriculumType: 'THPT',
  educationProgram: 'THPT'
}};

export const initialTimelineMilestones: TimelineMilestone[] = [
  {{
    id: 'm1',
    title: 'Khai giảng Năm học Mới',
    date: '2025-09-05',
    category: 'EVENT',
    description: 'Lễ khai giảng trang trọng toàn trường.'
  }},
  {{
    id: 'm2',
    title: 'Kiểm tra Giữa Học kỳ I',
    date: '2025-11-03',
    category: 'EXAM',
    description: 'Tập trung ôn tập và thi các môn văn hóa.'
  }},
  {{
    id: 'm3',
    title: 'Kiểm tra Cuối Học kỳ I',
    date: '2025-12-22',
    category: 'EXAM',
    description: 'Thi học kỳ I toàn khối.'
  }}
];

export const initialClassGoals: ClassGoal[] = [
  {{
    id: 'cg-1',
    title: '100% Học sinh Đạt Hạnh kiểm Tốt / Khá',
    targetMetric: '100%',
    currentMetric: '95%',
    target: 100,
    current: 95,
    category: 'Nề nếp',
    status: 'in_progress'
  }},
  {{
    id: 'cg-2',
    title: 'Đạt danh hiệu Tập thể Lớp Xuất sắc Cấp trường',
    targetMetric: 'Hạng Nhất',
    currentMetric: 'Hạng Nhì',
    target: 1,
    current: 2,
    category: 'Hoạt động',
    status: 'in_progress'
  }}
];

export const initialPersonalGoals: PersonalGoal[] = [];

export const initialPinnedItems: PinnedItem[] = [
  {{
    id: 'pin-1',
    title: 'Nội quy Lớp học & Tiêu chí Thi đua 11A1 Năm học 2025 - 2026',
    category: 'Nội quy',
    pinnedAt: '05/09/2025',
    content: 'Tất cả học sinh thực hiện nghiêm túc đồng phục, chuyên cần và nề nếp truy bài.'
  }}
];

export const initialAuditLogs: AuditLog[] = [
  {{
    id: 'log-1',
    action: 'Khởi tạo Không gian',
    performedBy: 'Hệ thống',
    role: 'SUPER_ADMIN',
    target: 'Lớp 11A1',
    details: 'Khởi tạo không gian chủ nhiệm số lớp 11A1 THPT Chuyên Lê Hồng Phong',
    timestamp: '15/08/2025 08:00:00'
  }}
];

export const initialPointRules: PointRuleConfig[] = [
  {{ id: 'rule_1', title: 'Điểm 10 kiểm tra hoặc phát biểu xuất sắc', points: 10, defaultPoints: 10, category: 'Học tập', active: true }},
  {{ id: 'rule_2', title: 'Đạt giải Học sinh Giỏi cấp Trường / Thành phố', points: 20, defaultPoints: 20, category: 'Học tập', active: true }},
  {{ id: 'rule_3', title: 'Tham gia tích cực phong trào tình nguyện / văn nghệ', points: 10, defaultPoints: 10, category: 'Phong trào & Hoạt động', active: true }},
  {{ id: 'rule_4', title: 'Giúp đỡ bạn tiến bộ trong học tập', points: 10, defaultPoints: 10, category: 'Việc tốt', active: true }},
  {{ id: 'rule_5', title: 'Đi học muộn hoặc không mang phù hiệu', points: -5, defaultPoints: -5, category: 'Vi phạm nội quy', active: true }},
  {{ id: 'rule_6', title: 'Không làm bài tập về nhà', points: -5, defaultPoints: -5, category: 'Học tập', active: true }}
];

export const initialPointTransactions: PointTransaction[] = [
  {{
    id: 'tx_hs-01_init',
    studentId: 'hs-01',
    ruleId: 'rule_1',
    category: 'Học tập',
    title: 'Đạt điểm 10 kiểm tra 15 phút môn Toán',
    points: 10,
    description: 'Làm bài xuất sắc, trình bày mạch lạc',
    status: 'APPROVED',
    createdAt: '2025-09-10T10:00:00.000Z'
  }}
];

export const initialAdjustmentReports: AdjustmentReport[] = [];

export const initialLaurelTrees: LaurelTree[] = [
  {{
    studentId: 'hs-01',
    studentName: 'Nguyễn Gia Huy',
    currentPoints: 45,
    completedTrees: 1,
    totalPoints: 145,
    currentStage: 'tree',
    leavesCount: 8,
    flowersCount: 2
  }},
  {{
    studentId: 'hs-02',
    studentName: 'Trần Thị Mai',
    currentPoints: 35,
    completedTrees: 0,
    totalPoints: 35,
    currentStage: 'sapling',
    leavesCount: 6,
    flowersCount: 0
  }}
];

export const initialAcademicRecords: Record<string, AcademicRecord> = {{
  'hs-01': {{
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
      {{ subjectName: 'Toán học', regularScores: [9.5, 9.0, 10.0], midtermScore: 9.5, finalScore: 9.5, averageScore: 9.5 }},
      {{ subjectName: 'Ngữ văn', regularScores: [8.0, 8.5, 8.0], midtermScore: 8.5, finalScore: 8.5, averageScore: 8.3 }},
      {{ subjectName: 'Tiếng Anh', regularScores: [9.0, 9.5, 9.5], midtermScore: 9.5, finalScore: 9.5, averageScore: 9.4 }}
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
  }}
}};

export const initialTimetable: TimetableVersion = {{
  id: 'tkb-11a1-hk1-2025',
  versionName: 'Thời khóa biểu Chính thức Áp dụng HK1',
  semester: 'HK1',
  academicYear: '2025 - 2026',
  isActive: true,
  isApplied: true,
  schedule: [
    {{
      dayOfWeek: 'Thứ 2',
      morningPeriods: [
        {{ period: 1, subject: 'Chào cờ', teacher: 'BGH & GVCN', room: 'Sân trường' }},
        {{ period: 2, subject: 'Toán học', teacher: 'Thầy Trần Văn An', room: 'Phòng 204' }},
        {{ period: 3, subject: 'Toán học', teacher: 'Thầy Trần Văn An', room: 'Phòng 204' }},
        {{ period: 4, subject: 'Ngữ văn', teacher: 'Cô Mai Lan (GVCN)', room: 'Phòng 204' }},
        {{ period: 5, subject: 'Tiếng Anh', teacher: 'Cô Lê Thu Hà', room: 'Phòng 204' }}
      ],
      afternoonPeriods: []
    }},
    {{
      dayOfWeek: 'Thứ 3',
      morningPeriods: [
        {{ period: 1, subject: 'Vật lí', teacher: 'Thầy Đỗ Minh Tuấn', room: 'Phòng 204' }},
        {{ period: 2, subject: 'Hóa học', teacher: 'Cô Phạm Thị Mai', room: 'Phòng 204' }},
        {{ period: 3, subject: 'Sinh học', teacher: 'Cô Vũ Bích Ngọc', room: 'Phòng 204' }},
        {{ period: 4, subject: 'Lịch sử', teacher: 'Thầy Hoàng Quốc Bảo', room: 'Phòng 204' }},
        {{ period: 5, subject: 'Giáo dục thể chất', teacher: 'Thầy Bùi Văn Dũng', room: 'Nhà thi đấu' }}
      ],
      afternoonPeriods: []
    }},
    {{
      dayOfWeek: 'Thứ 4',
      morningPeriods: [
        {{ period: 1, subject: 'Toán học', teacher: 'Thầy Trần Văn An', room: 'Phòng 204' }},
        {{ period: 2, subject: 'Ngữ văn', teacher: 'Cô Mai Lan (GVCN)', room: 'Phòng 204' }},
        {{ period: 3, subject: 'Ngữ văn', teacher: 'Cô Mai Lan (GVCN)', room: 'Phòng 204' }},
        {{ period: 4, subject: 'Tiếng Anh', teacher: 'Cô Lê Thu Hà', room: 'Phòng 204' }},
        {{ period: 5, subject: 'Tin học', teacher: 'Thầy Nguyễn Trí Dũng', room: 'Lab Tin học' }}
      ],
      afternoonPeriods: []
    }},
    {{
      dayOfWeek: 'Thứ 5',
      morningPeriods: [
        {{ period: 1, subject: 'Vật lí', teacher: 'Thầy Đỗ Minh Tuấn', room: 'Phòng 204' }},
        {{ period: 2, subject: 'Hóa học', teacher: 'Cô Phạm Thị Mai', room: 'Phòng 204' }},
        {{ period: 3, subject: 'Địa lí', teacher: 'Cô Trần Thùy Dung', room: 'Phòng 204' }},
        {{ period: 4, subject: 'GDQP-AN', teacher: 'Thầy Võ Thành Đạt', room: 'Sân quân sự' }},
        {{ period: 5, subject: 'Công nghệ', teacher: 'Thầy Trịnh Văn Hải', room: 'Phòng 204' }}
      ],
      afternoonPeriods: []
    }},
    {{
      dayOfWeek: 'Thứ 6',
      morningPeriods: [
        {{ period: 1, subject: 'Toán học', teacher: 'Thầy Trần Văn An', room: 'Phòng 204' }},
        {{ period: 2, subject: 'Tiếng Anh', teacher: 'Cô Lê Thu Hà', room: 'Phòng 204' }},
        {{ period: 3, subject: 'Hoạt động trải nghiệm, hướng nghiệp', teacher: 'Cô Mai Lan (GVCN)', room: 'Phòng 204' }},
        {{ period: 4, subject: 'Hoạt động trải nghiệm, hướng nghiệp', teacher: 'Cô Mai Lan (GVCN)', room: 'Phòng 204' }},
        {{ period: 5, subject: 'Sinh hoạt lớp', teacher: 'Cô Mai Lan (GVCN)', room: 'Phòng 204' }}
      ],
      afternoonPeriods: []
    }},
    {{
      dayOfWeek: 'Thứ 7',
      morningPeriods: [],
      afternoonPeriods: []
    }}
  ]
}};

export const initialPosts: Post[] = [
  {{
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
    reactions: {{ love: ['hs-01', 'hs-02'] }},
    comments: []
  }}
];

export const initialAlbumPosts: AlbumPost[] = [
  {{
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
      {{
        type: 'image',
        url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80',
        name: 'Tập thể 11A1',
        caption: 'Toàn thể lớp 11A1 trong lễ khai giảng'
      }}
    ]
  }}
];

export const initialParentConversations: ParentConversation[] = [
  {{
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
      {{
        id: 'msg-1',
        senderId: 'teacher-lan-nguyen',
        senderName: 'Cô Nguyễn Thị Mai Lan (GVCN)',
        senderRole: 'TEACHER',
        content: 'Chào anh Hùng, em gửi anh kế hoạch học tập của cháu Huy tháng này ạ.',
        timestamp: '15/09/2025 09:00'
      }},
      {{
        id: 'msg-2',
        senderId: 'par-hs-01',
        senderName: 'Nguyễn Gia Hùng',
        senderRole: 'PARENT',
        content: 'Gia đình đã nắm rõ kế hoạch của cô giáo ạ. Cảm ơn cô!',
        timestamp: '15/09/2025 10:15'
      }}
    ]
  }}
];

export const initialAssignments: LessonAssignment[] = [
  {{
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
  }}
];

export const initialExamSchedules: ExamSchedule[] = [];

export const initialCareerProfiles: Record<string, CareerProfile> = {{
  'hs-01': {{
    id: 'career_hs-01',
    tenant_id: 'tenant-lan-nguyen',
    studentId: 'hs-01',
    riasecScores: {{ R: 75, I: 95, A: 60, S: 45, E: 55, C: 80 }},
    primaryTraits: ['Nghiên cứu (Investigative)', 'Quy củ (Conventional)'],
    recommendedCareers: ['Kỹ sư Phần mềm', 'Chuyên gia Khoa học Dữ liệu', 'Kỹ sư Trí tuệ Nhân tạo'],
    interests: ['Lập trình máy tính', 'Toán ứng dụng', 'Hệ thống tự động'],
    strengths: ['Tư duy phân tích', 'Học tập độc lập', 'Khả năng tập trung cao'],
    updatedAt: '2025-09-15T08:00:00.000Z'
  }}
}};

export const demoAccounts: Record<string, UserAccount> = {{
  teacher: {{
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
  }},
  officer: {{
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
    permissions: {{
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
    }}
  }},
  student: {{
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
  }},
  parent: {{
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
  }}
}};
"""
with open('src/data/demoData.ts', 'w', encoding='utf-8') as f:
    f.write(demo_data_content)

print("Generated all 5 files successfully!")
