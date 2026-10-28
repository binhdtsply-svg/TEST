/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { systemSettingsRepository } from './SystemSettingsRepository';
import { auditLogRepository } from './AuditLogRepository';
import { AttachedFile } from '../../src/types';

export interface GuideLinkItem {
  id: string;
  title: string;
  url: string;
}

export interface AdminGuideArticle {
  id: string;
  categoryId: string;
  title: string;
  content: string;
  summary: string;
  estimatedReadMinutes?: number;
  order: number;
  isPublished: boolean;
  videoUrl?: string;
  attachments?: AttachedFile[];
  externalLinks?: GuideLinkItem[];
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface AdminGuideCategory {
  id: string;
  title: string;
  description: string;
  order: number;
  isPublished: boolean;
  iconName?: string;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
}

// 5 default core guide categories as explicitly specified in requirements
export const DEFAULT_GUIDE_CATEGORIES: AdminGuideCategory[] = [
  {
    id: 'group-1-intro',
    title: '1. Giới thiệu về trang web',
    description: 'Tổng quan nền tảng Không Gian Chủ Nhiệm Số, cơ cấu các phân hệ, nguyên tắc bảo mật và hướng dẫn bắt đầu.',
    order: 1,
    isPublished: true,
    iconName: 'Sparkles',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    updatedBy: 'SYSTEM'
  },
  {
    id: 'group-2-class-setup',
    title: '2. Hướng dẫn cài đặt cấu hình chung của lớp học',
    description: 'Thiết lập thông tin trường lớp, năm học, phân phối môn học GDPT 2018, tổ nhóm và phân quyền ban cán sự lớp.',
    order: 2,
    isPublished: true,
    iconName: 'Settings',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    updatedBy: 'SYSTEM'
  },
  {
    id: 'group-3-surveys',
    title: '3. Tạo các bài khảo sát',
    description: 'Xây dựng phiếu khảo sát đặc điểm học sinh đầu năm, nhập khảo sát từ biểu mẫu Google Forms hoặc Word và đồng bộ dữ liệu.',
    order: 3,
    isPublished: true,
    iconName: 'ClipboardList',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    updatedBy: 'SYSTEM'
  },
  {
    id: 'group-4-academic-activities',
    title: '4. Tạo các nội dung về học tập, phong trào của lớp',
    description: 'Thời khóa biểu, sổ điểm TT22, báo bài, hoạt động phong trào, đánh giá điểm rèn luyện và Cây Nguyệt Quế vinh danh.',
    order: 4,
    isPublished: true,
    iconName: 'BookOpen',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    updatedBy: 'SYSTEM'
  },
  {
    id: 'group-5-parents',
    title: '5. Tạo liên kết với phụ huynh',
    description: 'Kích hoạt tài khoản phụ huynh, sổ liên lạc điện tử 1-1 riêng tư, gửi thông báo họp và báo cáo kết quả rèn luyện.',
    order: 5,
    isPublished: true,
    iconName: 'Users',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    updatedBy: 'SYSTEM'
  }
];

// Rich, realistic initial articles for each group
export const DEFAULT_GUIDE_ARTICLES: AdminGuideArticle[] = [
  // Group 1: Giới thiệu
  {
    id: 'art-intro-overview',
    categoryId: 'group-1-intro',
    title: 'Tổng quan về Nền tảng Không Gian Chủ Nhiệm Số',
    summary: 'Giới thiệu vai trò, kiến trúc và các tính năng cốt lõi hỗ trợ Giáo viên chủ nhiệm nâng cao hiệu quả quản trị lớp học.',
    content: `### 1. Mục tiêu và Ý nghĩa Nền tảng
Không Gian Chủ Nhiệm Số là hệ thống số hóa toàn diện được thiết kế chuyên biệt cho công tác chủ nhiệm tại các trường THPT và Trung tâm GDNN - GDTX. Nền tảng giúp giáo viên:
- Số hóa toàn bộ hồ sơ lớp học và thông tin học viên.
- Quản lý sổ điểm theo Thông tư 22/2021/TT-BGDĐT một cách độc lập, minh bạch và chính xác.
- Theo dõi sát sao quá trình rèn luyện, chuyên cần và vinh danh gương sáng học trò thông qua Cây Nguyệt Quế.
- Kết nối thông suốt với Phụ huynh học sinh qua kênh liên lạc 1-1 riêng tư và bảo mật.

### 2. Các phân hệ chính
1. **Bảng tin & Thông báo lớp**: Truyền thông nội bộ, ghim thông báo quan trọng, lịch thi và báo bài.
2. **Quản lý học sinh & Hồ sơ**: Theo dõi học sinh theo tổ, ban cán sự, học sinh cần quan tâm đặc biệt.
3. **Học tập & Đánh giá**: Thời khóa biểu động, sổ điểm định kỳ, xếp loại học lực theo GDPT 2018.
4. **Rèn luyện & Nề nếp**: Cộng/trừ điểm rèn luyện, nhật ký kỷ luật, đánh giá kết quả hạnh kiểm tháng/kỳ.
5. **Cây Nguyệt Quế**: Không gian thi đua tích cực, khuyến khích học sinh nuôi dưỡng cây học tập.
6. **Nhịp cầu Phụ huynh**: Gửi thông báo, tin nhắn riêng tư với từng gia đình, tra cứu kết quả tức thời.
7. **Trợ lý AI Chủ nhiệm**: Hỗ trợ viết nhận xét học bạ, lên kế hoạch tuần và giải đáp nghiệp vụ.`,
    estimatedReadMinutes: 4,
    order: 1,
    isPublished: true,
    tags: ['Tổng quan', 'Giới thiệu', 'Bắt đầu'],
    externalLinks: [
      { id: 'link-1', title: 'Quy chế công tác chủ nhiệm Bộ GD&ĐT', url: 'https://moet.gov.vn' }
    ],
    attachments: [
      {
        id: 'att-intro-doc',
        name: 'So_Tay_Huong_Dan_Khong_Gian_Chu_Nhiem_So.pdf',
        url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        type: 'pdf',
        size: '1.2 MB'
      }
    ],
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    updatedBy: 'SYSTEM'
  },
  {
    id: 'art-intro-roles',
    categoryId: 'group-1-intro',
    title: 'Phân quyền và bảo mật trong Không Gian Chủ Nhiệm',
    summary: 'Tìm hiểu cơ chế phân quyền giữa Quản trị viên, GVCN, Ban cán sự lớp, Học sinh và Phụ huynh.',
    content: `### Cơ chế phân quyền đa người dùng (RBAC)
Hệ thống áp dụng chính sách bảo mật Zero-Trust với 5 cấp quyền phân định rõ:
- **SUPER_ADMIN**: Toàn quyền quản trị hệ thống, cấp mã trường, quản trị nội dung hướng dẫn và bảo trì.
- **TEACHER (GVCN)**: Quyền chủ nhiệm độc quyền trong không gian lớp của mình (sổ điểm, rèn luyện, phê duyệt).
- **CLASS_OFFICER (Ban cán sự)**: Hỗ trợ điểm danh, chấm điểm nề nếp và nhập lịch báo bài khi được phân quyền.
- **STUDENT (Học sinh)**: Xem kết quả học tập cá nhân, tự đánh giá rèn luyện, đăng ký phong trào.
- **PARENT (Phụ huynh)**: Xem kết quả học tập, rèn luyện của con em và trao đổi trực tiếp với GVCN.`,
    estimatedReadMinutes: 3,
    order: 2,
    isPublished: true,
    tags: ['Phân quyền', 'Bảo mật', 'Tài khoản'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    updatedBy: 'SYSTEM'
  },

  // Group 2: Cài đặt cấu hình chung
  {
    id: 'art-setup-class-info',
    categoryId: 'group-2-class-setup',
    title: 'Cài đặt thông tin lớp học và niên khóa',
    summary: 'Hướng dẫn thiết lập tên lớp, niên khóa, giáo viên chủ nhiệm, khẩu hiệu và ảnh bìa lớp.',
    content: `### Các bước thực hiện:
1. Vào phân hệ **Cài đặt** từ thanh điều hướng bên trái.
2. Chọn thẻ **Thông tin lớp & Niên khóa**.
3. Cập nhật các trường:
   - **Tên lớp**: Ví dụ "Lớp 11A1"
   - **Tên trường**: Tên đơn vị trường THPT hoặc Trung tâm GDTX.
   - **Niên khóa**: Chọn "2025 - 2026".
   - **Học kỳ hiện tại**: Học kỳ I hoặc Học kỳ II.
   - **Chương trình đào tạo**: GDPT 2018 (Chuẩn THPT hoặc GDTX).
4. Nhấn **Lưu thay đổi**. Dữ liệu được đồng bộ ngay lập tức và bảo lưu vĩnh viễn trên máy chủ.`,
    estimatedReadMinutes: 3,
    order: 1,
    isPublished: true,
    tags: ['Cài đặt', 'Cấu hình lớp', 'Niên khóa'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    updatedBy: 'SYSTEM'
  },
  {
    id: 'art-setup-subjects',
    categoryId: 'group-2-class-setup',
    title: 'Cấu hình danh mục môn học GDPT 2018',
    summary: 'Cách bật/tắt các môn bắt buộc, môn lựa chọn và cụm chuyên đề học tập theo ban KHTN/KHXH.',
    content: `### Cấu hình môn học theo Thông tư 22
Hệ thống hỗ trợ đầy đủ 14 môn học và hoạt động giáo dục:
- **Môn bắt buộc**: Toán, Ngữ văn, Tiếng Anh, Lịch sử, Giáo dục thể chất, GDQP&AN, Hoạt động trải nghiệm, Nội dung GD địa phương.
- **Môn lựa chọn**: Vật lý, Hóa học, Sinh học, Địa lý, GD Kinh tế & Pháp luật, Tin học, Công nghệ.
- GVCN có thể tùy chỉnh hệ số đánh giá (ĐGtx, ĐGgk, ĐGck) và màu sắc nhận diện môn học để thuận tiện theo dõi.`,
    estimatedReadMinutes: 4,
    order: 2,
    isPublished: true,
    tags: ['Môn học', 'GDPT 2018', 'TT22'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    updatedBy: 'SYSTEM'
  },

  // Group 3: Tạo khảo sát
  {
    id: 'art-survey-create',
    categoryId: 'group-3-surveys',
    title: 'Tạo phiếu khảo sát thông tin học sinh đầu năm',
    summary: 'Hướng dẫn sử dụng công cụ Khảo sát để thu thập đặc điểm tâm lý, hoàn cảnh gia đình và định hướng nghề nghiệp.',
    content: `### Lợi ích của khảo sát đầu năm
Phiếu khảo sát giúp GVCN nắm bắt nhanh:
- Hoàn cảnh kinh tế, điều kiện sinh hoạt và đi lại của học sinh.
- Nguyện vọng môn tự chọn và định hướng thi đại học/nghề nghiệp.
- Đặc điểm tính cách, sở trường nghệ thuật, thể thao và các vấn đề sức khỏe cần lưu ý.

### Các bước tạo khảo sát:
1. Vào phân hệ **Học sinh** -> chọn tab **Khảo sát học sinh**.
2. Nhấn nút **Tạo khảo sát mới** hoặc sử dụng **Mẫu khảo sát đầu năm chuẩn Bộ**.
3. Tùy chỉnh danh sách câu hỏi: Trắc nghiệm một lựa chọn, nhiều lựa chọn, thang điểm 1-5 hoặc tự luận.
4. Phát hành khảo sát: Học sinh đăng nhập tài khoản sẽ thấy thông báo khảo sát ngay trên trang tổng quan cá nhân.`,
    estimatedReadMinutes: 5,
    order: 1,
    isPublished: true,
    tags: ['Khảo sát', 'Đầu năm', 'Phiếu thu thập'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    updatedBy: 'SYSTEM'
  },
  {
    id: 'art-survey-import',
    categoryId: 'group-3-surveys',
    title: 'Nhập khảo sát từ Google Forms và tệp văn bản Word',
    summary: 'Cách nhập nhanh biểu mẫu câu hỏi từ tài liệu Word (.docx) hoặc đường dẫn Google Form.',
    content: `### Nhập tự động thông minh:
- **Nhập từ file Word (.docx)**: Hệ thống tự động phân tách câu hỏi theo mẫu "Câu 1, Câu 2... A, B, C, D" và tạo cấu trúc khảo sát trong 3 giây.
- **Nhập từ Google Forms**: Nhập link Google Form để đồng bộ các trường dữ liệu trực tiếp vào hệ thống.
- **Đồng bộ tự động**: Câu trả lời về hoàn cảnh, số điện thoại phụ huynh sẽ tự động đề xuất cập nhật vào Hồ sơ học sinh khi GVCN duyệt.`,
    estimatedReadMinutes: 4,
    order: 2,
    isPublished: true,
    tags: ['Google Forms', 'Word import', 'Đồng bộ'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    updatedBy: 'SYSTEM'
  },

  // Group 4: Học tập, phong trào
  {
    id: 'art-academic-gradebook',
    categoryId: 'group-4-academic-activities',
    title: 'Quản lý sổ điểm và xếp loại học tập Thông tư 22',
    summary: 'Nhập điểm Excel, tính điểm trung bình môn, xếp loại Tốt / Khá / Đạt / Chưa đạt chuẩn xác.',
    content: `### Tính toán điểm và xếp loại tự động:
1. **Điểm kiểm tra thường xuyên (ĐGtx)**: Cho phép nhập tối đa hệ số theo số tiết môn học.
2. **Điểm giữa kỳ (ĐGgk) & Cuối kỳ (ĐGck)**: Hệ số 2 và 3 theo quy định.
3. **Môn nhận xét**: Đánh giá Đạt (Đ) / Chưa đạt (CĐ).
4. **Nhập xuất Excel**: Tải file mẫu Excel chuẩn, nhập điểm hàng loạt và tải ngược lên chỉ với một thao tác.`,
    estimatedReadMinutes: 5,
    order: 1,
    isPublished: true,
    tags: ['Sổ điểm', 'TT22', 'Excel import'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    updatedBy: 'SYSTEM'
  },
  {
    id: 'art-laurel-garden',
    categoryId: 'group-4-academic-activities',
    title: 'Vận hành Cây Nguyệt Quế và phong trào thi đua',
    summary: 'Cách tích điểm khen thưởng, thăng cấp cây học tập từ Mầm non lên Đại thụ cho học sinh.',
    content: `### Ý nghĩa thi đua Cây Nguyệt Quế:
Cây Nguyệt Quế tạo động lực học tập tích cực, không gây áp lực điểm số tiêu cực:
- **Tích điểm**: Điểm tốt, việc tốt, phát biểu xây dựng bài, tham gia phong trào văn nghệ/thể thao.
- **Cấp độ cây**:
  - Hạt mầm (0 - 15 điểm)
  - Cây non (16 - 35 điểm)
  - Cây trưởng thành (36 - 60 điểm)
  - Cây Nguyệt Quế nở hoa (61 - 90 điểm)
  - Đại thụ Vinh quang (Trên 90 điểm)
- Bảng vàng danh dự hiển thị tự động trên trang chủ của lớp để động viên tập thể.`,
    estimatedReadMinutes: 4,
    order: 2,
    isPublished: true,
    tags: ['Cây Nguyệt Quế', 'Khen thưởng', 'Thi đua'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    updatedBy: 'SYSTEM'
  },

  // Group 5: Liên kết với phụ huynh
  {
    id: 'art-parents-bridge',
    categoryId: 'group-5-parents',
    title: 'Kích hoạt tài khoản và phát hành mã truy cập cho Phụ huynh',
    summary: 'Hướng dẫn xuất mã đăng nhập cho cha mẹ học sinh và quản lý trạng thái kết nối gia đình.',
    content: `### Quy trình cấp mã phụ huynh:
1. Vào phân hệ **Học sinh** -> chọn **Mã truy cập & Kích hoạt**.
2. Chọn tab **Phụ huynh học sinh**.
3. Nhấn **Xuất danh sách mã kết nối (Excel / PDF in sẵn phiếu gửi PH)**.
4. Gửi mã (dạng \`PAR-XXXXX\`) tới từng phụ huynh.
5. Phụ huynh truy cập trang web, chọn vai trò "Phụ huynh" và nhập mã để vào ngay trang thông tin của con em mà không cần thủ tục đăng ký rườm rà.`,
    estimatedReadMinutes: 4,
    order: 1,
    isPublished: true,
    tags: ['Phụ huynh', 'Mã truy cập', 'Sổ liên lạc'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    updatedBy: 'SYSTEM'
  },
  {
    id: 'art-parents-chat',
    categoryId: 'group-5-parents',
    title: 'Trao đổi riêng tư 1-1 và gửi phiếu báo rèn luyện',
    summary: 'Cách gửi báo cáo định kỳ về nề nếp, điểm danh và trao đổi bảo mật với từng gia đình.',
    content: `### Kênh liên lạc 1-1 văn minh, bảo mật:
- **Tin nhắn 1-1**: Tránh việc tranh luận trong nhóm Zalo chung, tôn trọng quyền riêng tư của từng học sinh.
- **Báo cáo định kỳ**: GVCN có thể nhấn "Gửi báo cáo rèn luyện tháng", hệ thống tự động tổng hợp chuyên cần, điểm thưởng/phạt và nhận xét của thầy cô vào hòm thư điện tử của phụ huynh.`,
    estimatedReadMinutes: 3,
    order: 2,
    isPublished: true,
    tags: ['Nhịp cầu', 'Trao đổi 1-1', 'Báo cáo tháng'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    updatedBy: 'SYSTEM'
  }
];

export class GuideRepository {
  private static instance: GuideRepository;

  private constructor() {
    this.ensureInitialized();
  }

  public static getInstance(): GuideRepository {
    if (!GuideRepository.instance) {
      GuideRepository.instance = new GuideRepository();
    }
    return GuideRepository.instance;
  }

  private ensureInitialized(): void {
    const categories = systemSettingsRepository.get<AdminGuideCategory[] | null>('admin_guide_categories', null);
    if (!categories || !Array.isArray(categories) || categories.length === 0) {
      systemSettingsRepository.set('admin_guide_categories', DEFAULT_GUIDE_CATEGORIES, 'SYSTEM_INIT');
    }

    const articles = systemSettingsRepository.get<AdminGuideArticle[] | null>('admin_guide_articles', null);
    if (!articles || !Array.isArray(articles) || articles.length === 0) {
      systemSettingsRepository.set('admin_guide_articles', DEFAULT_GUIDE_ARTICLES, 'SYSTEM_INIT');
    }
  }

  // --- CATEGORIES ---

  public getCategories(isAdmin: boolean = false): AdminGuideCategory[] {
    const list = systemSettingsRepository.get<AdminGuideCategory[]>('admin_guide_categories', DEFAULT_GUIDE_CATEGORIES);
    const sorted = [...list].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    if (isAdmin) {
      return sorted;
    }
    return sorted.filter((c) => c.isPublished);
  }

  public getCategoryById(id: string): AdminGuideCategory | null {
    const list = this.getCategories(true);
    return list.find((c) => c.id === id) || null;
  }

  public createCategory(data: Partial<AdminGuideCategory>, adminId: string): AdminGuideCategory {
    const list = this.getCategories(true);
    const now = new Date().toISOString();
    const newCategory: AdminGuideCategory = {
      id: data.id ? String(data.id).trim() : `group-${Date.now()}`,
      title: data.title ? String(data.title).trim() : 'Nhóm hướng dẫn mới',
      description: data.description ? String(data.description).trim() : '',
      order: typeof data.order === 'number' ? data.order : list.length + 1,
      isPublished: data.isPublished !== false,
      iconName: data.iconName || 'BookOpen',
      createdAt: now,
      updatedAt: now,
      updatedBy: adminId
    };

    list.push(newCategory);
    systemSettingsRepository.set('admin_guide_categories', list, adminId);

    auditLogRepository.log({
      actorUserId: adminId,
      actorRole: 'SUPER_ADMIN',
      actorTenantId: 'platform-root',
      action: 'CREATE_GUIDE_CATEGORY',
      targetType: 'GUIDE_CATEGORY',
      targetId: newCategory.id,
      details: { title: newCategory.title }
    });

    return newCategory;
  }

  public updateCategory(id: string, data: Partial<AdminGuideCategory>, adminId: string): AdminGuideCategory | null {
    const list = this.getCategories(true);
    const index = list.findIndex((c) => c.id === id);
    if (index === -1) return null;

    const existing = list[index];
    const updated: AdminGuideCategory = {
      ...existing,
      ...data,
      id: existing.id, // Immutable ID
      updatedAt: new Date().toISOString(),
      updatedBy: adminId
    };

    list[index] = updated;
    systemSettingsRepository.set('admin_guide_categories', list, adminId);

    auditLogRepository.log({
      actorUserId: adminId,
      actorRole: 'SUPER_ADMIN',
      actorTenantId: 'platform-root',
      action: 'UPDATE_GUIDE_CATEGORY',
      targetType: 'GUIDE_CATEGORY',
      targetId: id,
      details: { title: updated.title, isPublished: updated.isPublished }
    });

    return updated;
  }

  public deleteCategory(id: string, adminId: string): { success: boolean; deletedArticlesCount: number } {
    const list = this.getCategories(true);
    const index = list.findIndex((c) => c.id === id);
    if (index === -1) return { success: false, deletedArticlesCount: 0 };

    const removedCategory = list.splice(index, 1)[0];
    systemSettingsRepository.set('admin_guide_categories', list, adminId);

    // Also remove child articles of this category
    const articles = this.getArticles(undefined, true);
    const remainingArticles = articles.filter((a) => a.categoryId !== id);
    const deletedCount = articles.length - remainingArticles.length;
    if (deletedCount > 0) {
      systemSettingsRepository.set('admin_guide_articles', remainingArticles, adminId);
    }

    auditLogRepository.log({
      actorUserId: adminId,
      actorRole: 'SUPER_ADMIN',
      actorTenantId: 'platform-root',
      action: 'DELETE_GUIDE_CATEGORY',
      targetType: 'GUIDE_CATEGORY',
      targetId: id,
      details: { title: removedCategory.title, deletedArticlesCount: deletedCount }
    });

    return { success: true, deletedArticlesCount: deletedCount };
  }

  // --- ARTICLES ---

  public getArticles(categoryId?: string, isAdmin: boolean = false): AdminGuideArticle[] {
    const list = systemSettingsRepository.get<AdminGuideArticle[]>('admin_guide_articles', DEFAULT_GUIDE_ARTICLES);
    let filtered = list;
    if (categoryId && categoryId !== 'all') {
      filtered = filtered.filter((a) => a.categoryId === categoryId);
    }
    if (!isAdmin) {
      filtered = filtered.filter((a) => a.isPublished);
    }
    return [...filtered].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  public getArticleById(id: string, isAdmin: boolean = false): AdminGuideArticle | null {
    const list = this.getArticles(undefined, true);
    const art = list.find((a) => a.id === id);
    if (!art) return null;
    if (!isAdmin && !art.isPublished) return null;
    return art;
  }

  public createArticle(data: Partial<AdminGuideArticle>, adminId: string): AdminGuideArticle {
    const list = this.getArticles(undefined, true);
    const now = new Date().toISOString();
    const newArticle: AdminGuideArticle = {
      id: data.id ? String(data.id).trim() : `art-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      categoryId: data.categoryId || 'group-1-intro',
      title: data.title ? String(data.title).trim() : 'Bài hướng dẫn mới',
      content: data.content || '',
      summary: data.summary || '',
      estimatedReadMinutes: typeof data.estimatedReadMinutes === 'number' ? data.estimatedReadMinutes : 3,
      order: typeof data.order === 'number' ? data.order : list.length + 1,
      isPublished: data.isPublished !== false,
      videoUrl: data.videoUrl || undefined,
      attachments: Array.isArray(data.attachments) ? data.attachments : [],
      externalLinks: Array.isArray(data.externalLinks) ? data.externalLinks : [],
      tags: Array.isArray(data.tags) ? data.tags : [],
      createdAt: now,
      updatedAt: now,
      updatedBy: adminId
    };

    list.push(newArticle);
    systemSettingsRepository.set('admin_guide_articles', list, adminId);

    auditLogRepository.log({
      actorUserId: adminId,
      actorRole: 'SUPER_ADMIN',
      actorTenantId: 'platform-root',
      action: 'CREATE_GUIDE_ARTICLE',
      targetType: 'GUIDE_ARTICLE',
      targetId: newArticle.id,
      details: { title: newArticle.title, categoryId: newArticle.categoryId }
    });

    return newArticle;
  }

  public updateArticle(id: string, data: Partial<AdminGuideArticle>, adminId: string): AdminGuideArticle | null {
    const list = this.getArticles(undefined, true);
    const index = list.findIndex((a) => a.id === id);
    if (index === -1) return null;

    const existing = list[index];
    const updated: AdminGuideArticle = {
      ...existing,
      ...data,
      id: existing.id, // Immutable ID
      updatedAt: new Date().toISOString(),
      updatedBy: adminId
    };

    list[index] = updated;
    systemSettingsRepository.set('admin_guide_articles', list, adminId);

    auditLogRepository.log({
      actorUserId: adminId,
      actorRole: 'SUPER_ADMIN',
      actorTenantId: 'platform-root',
      action: 'UPDATE_GUIDE_ARTICLE',
      targetType: 'GUIDE_ARTICLE',
      targetId: id,
      details: { title: updated.title, isPublished: updated.isPublished }
    });

    return updated;
  }

  public deleteArticle(id: string, adminId: string): boolean {
    const list = this.getArticles(undefined, true);
    const index = list.findIndex((a) => a.id === id);
    if (index === -1) return false;

    const removed = list.splice(index, 1)[0];
    systemSettingsRepository.set('admin_guide_articles', list, adminId);

    auditLogRepository.log({
      actorUserId: adminId,
      actorRole: 'SUPER_ADMIN',
      actorTenantId: 'platform-root',
      action: 'DELETE_GUIDE_ARTICLE',
      targetType: 'GUIDE_ARTICLE',
      targetId: id,
      details: { title: removed.title, categoryId: removed.categoryId }
    });

    return true;
  }

  public reorderCategories(orderedIds: string[], adminId: string): void {
    const list = this.getCategories(true);
    const map = new Map(list.map((c) => [c.id, c]));
    const reordered: AdminGuideCategory[] = [];

    orderedIds.forEach((id, index) => {
      const c = map.get(id);
      if (c) {
        c.order = index + 1;
        reordered.push(c);
        map.delete(id);
      }
    });

    // Append any unmentioned categories
    map.forEach((c) => {
      c.order = reordered.length + 1;
      reordered.push(c);
    });

    systemSettingsRepository.set('admin_guide_categories', reordered, adminId);
  }

  public reorderArticles(categoryId: string, orderedIds: string[], adminId: string): void {
    const list = this.getArticles(undefined, true);
    const categoryArticles = list.filter((a) => a.categoryId === categoryId);
    const otherArticles = list.filter((a) => a.categoryId !== categoryId);
    const map = new Map(categoryArticles.map((a) => [a.id, a]));

    const reorderedInCat: AdminGuideArticle[] = [];
    orderedIds.forEach((id, index) => {
      const art = map.get(id);
      if (art) {
        art.order = index + 1;
        reorderedInCat.push(art);
        map.delete(id);
      }
    });

    map.forEach((art) => {
      art.order = reorderedInCat.length + 1;
      reorderedInCat.push(art);
    });

    const fullList = [...otherArticles, ...reorderedInCat];
    systemSettingsRepository.set('admin_guide_articles', fullList, adminId);
  }

  public getFullContent(isAdmin: boolean = false): {
    categories: AdminGuideCategory[];
    articles: AdminGuideArticle[];
  } {
    return {
      categories: this.getCategories(isAdmin),
      articles: this.getArticles(undefined, isAdmin)
    };
  }
}

export const guideRepository = GuideRepository.getInstance();
