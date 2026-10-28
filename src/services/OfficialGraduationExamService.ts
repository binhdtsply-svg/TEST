/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { OfficialGraduationArticle, GraduationArticleCategory, AttachedFile, UserRole, UserAccount } from '../types';
import { parseDateToTimestamp } from './SchoolYearDateNormalizer';

const STORAGE_KEY = 'kgcns_official_graduation_articles';

export const INITIAL_OFFICIAL_ARTICLES: OfficialGraduationArticle[] = [
  {
    id: 'art-01',
    title: 'Quy chế thi tốt nghiệp THPT theo Chương trình GDPT 2018 hiện hành',
    summary: 'Thông tư số 02/2024/TT-BGDĐT sửa đổi, bổ sung Quy chế thi tốt nghiệp THPT và hướng dẫn tổ chức kỳ thi tốt nghiệp THPT áp dụng dài hạn.',
    content: `Căn cứ Quy chế thi tốt nghiệp THPT hiện hành của Bộ Giáo dục và Đào tạo:
1. Thí sinh thi 04 môn gồm 02 môn bắt buộc (Toán, Ngữ văn) và 02 môn tự chọn trong số các môn: Vật lí, Hóa học, Sinh học, Lịch sử, Địa lí, GD Kinh tế và Pháp luật, Tin học, Công nghệ, Ngoại ngữ.
2. Điều kiện công nhận tốt nghiệp: Thí sinh đủ điều kiện dự thi, không bị kỷ luật hủy kết quả thi, tất cả các môn thi dùng để xét công nhận tốt nghiệp phải đạt TRÊN 1,0 điểm theo thang điểm 10, và Điểm xét tốt nghiệp (ĐXTN) đạt từ 5,00 điểm trở lên.
3. Điểm học bạ được tính theo ĐTB 3 năm học với trọng số Lớp 10 (hệ số 1), Lớp 11 (hệ số 2), Lớp 12 (hệ số 3).`,
    sourceName: 'Bộ Giáo dục và Đào tạo',
    sourceDomain: 'moet.gov.vn',
    sourceUrl: 'https://moet.gov.vn',
    publishedAt: '15/01/2026',
    fetchedAt: '23/08/2026',
    schoolYear: '2025-2026',
    admissionYear: '2026',
    examYear: '2026',
    category: 'Quy chế',
    scope: 'SYSTEM',
    status: 'ACTIVE',
    creatorRole: 'SUPER_ADMIN',
    isOfficial: true,
    isPinned: true,
    isImportant: true
  },
  {
    id: 'art-02',
    title: 'Kế hoạch thời gian và Mốc đăng ký dự thi tốt nghiệp THPT',
    summary: 'Lịch đăng ký trực tuyến trên Hệ thống Quản lý thi của Bộ GD&ĐT, thời gian chỉnh sửa nguyện vọng và lịch thi chính thức các môn.',
    content: `Các mốc thời gian quan trọng thí sinh và phụ huynh cần lưu ý:
- 01/04 - 15/04: Rà soát thông tin hồ sơ học sinh, cấp tài khoản dự thi.
- 02/05 - 12/05: Đăng ký dự thi trực tuyến trên Cổng thông tin của Bộ GD&ĐT.
- 13/05 - 19/05: Rà soát, chỉnh sửa dữ liệu đăng ký môn tự chọn và diện ưu tiên.
- 26/06 - 28/06: Kỳ thi tốt nghiệp THPT diễn ra trên toàn quốc.
- 16/07: Công bố kết quả thi và tiếp nhận đơn phúc khảo.`,
    sourceName: 'Cục Quản lý chất lượng - Bộ GD&ĐT',
    sourceDomain: 'qlcl.edu.vn',
    sourceUrl: 'https://moet.gov.vn',
    publishedAt: '20/02/2026',
    fetchedAt: '23/08/2026',
    schoolYear: '2025-2026',
    admissionYear: '2026',
    examYear: '2026',
    category: 'Lịch thi',
    scope: 'SYSTEM',
    status: 'ACTIVE',
    creatorRole: 'SUPER_ADMIN',
    isOfficial: true,
    isPinned: true,
    isImportant: true
  },
  {
    id: 'art-03',
    title: 'Hướng dẫn lựa chọn 02 Môn thi Tự chọn phù hợp với định hướng xét tuyển Đại học',
    summary: 'Quy tắc chọn 02 môn tự chọn trong 9 môn, nguyên tắc không trùng môn và kinh nghiệm chọn tổ hợp môn tối ưu cho các khối xét tuyển.',
    content: `Hướng dẫn dành cho học sinh lớp 12:
- Thí sinh được chọn đúng 02 môn tự chọn trong danh mục: Tiếng Anh, Vật lí, Hóa học, Sinh học, Lịch sử, Địa lí, GD Kinh tế và Pháp luật, Tin học, Công nghệ...
- Tuyệt đối không chọn trùng 02 môn tự chọn.
- Nên căn cứ vào năng lực học tập thực tế và yêu cầu tổ hợp xét tuyển đại học của ngành nghề mục tiêu.`,
    sourceName: 'Cổng Thông tin điện tử Chính phủ',
    sourceDomain: 'baochinhphu.vn',
    sourceUrl: 'https://baochinhphu.vn',
    publishedAt: '05/03/2026',
    fetchedAt: '23/08/2026',
    schoolYear: '2025-2026',
    admissionYear: '2026',
    examYear: '2026',
    category: 'Tuyển sinh',
    scope: 'SYSTEM',
    status: 'ACTIVE',
    creatorRole: 'SUPER_ADMIN',
    isOfficial: true,
    isPinned: false
  },
  {
    id: 'art-04',
    title: 'Chính sách miễn thi môn Ngoại ngữ trong xét công nhận tốt nghiệp THPT',
    summary: 'Danh mục các chứng chỉ ngoại ngữ hợp lệ (IELTS, TOEFL, HSK, JLPT, DELF...) được miễn thi và cách áp dụng trong công thức tính ĐXTN.',
    content: `Theo quy định của Bộ GD&ĐT:
- Thí sinh có một trong các chứng chỉ ngoại ngữ hợp lệ đạt ngưỡng quy định trước ngày thi theo hướng dẫn sẽ được miễn thi môn Ngoại ngữ trong xét công nhận tốt nghiệp THPT.
- Thí sinh được miễn thi Ngoại ngữ sẽ được tính điểm xét tốt nghiệp theo công thức quy định đối với các môn còn lại dùng để xét tốt nghiệp.
- Nếu thí sinh muốn dùng điểm Ngoại ngữ để xét tuyển Đại học thì vẫn có thể đăng ký dự thi bài thi môn Ngoại ngữ bình thường.`,
    sourceName: 'Bộ Giáo dục và Đào tạo',
    sourceDomain: 'moet.gov.vn',
    sourceUrl: 'https://moet.gov.vn',
    publishedAt: '12/03/2026',
    fetchedAt: '23/08/2026',
    schoolYear: '2025-2026',
    admissionYear: '2026',
    examYear: '2026',
    category: 'Hướng dẫn',
    scope: 'SYSTEM',
    status: 'ACTIVE',
    creatorRole: 'SUPER_ADMIN',
    isOfficial: true,
    isPinned: false
  },
  {
    id: 'art-05',
    title: 'Quy định chi tiết về Điểm Ưu tiên (Diện 1, 2, 3) và Điểm Khuyến khích (HSG, Nghề)',
    summary: 'Khung điểm cộng ưu tiên khu vực/đối tượng chính sách và mức cộng khuyến khích tối đa theo quy chế thi tốt nghiệp.',
    content: `Khung điểm cộng xét tốt nghiệp:
1. Điểm Ưu tiên:
- Diện 1: Không cộng (0 điểm).
- Diện 2: Cộng 0.25 điểm (Con thương binh 81% trở lên, người dân tộc thiểu số vùng 1, vùng sâu...).
- Diện 3: Cộng 0.50 điểm (Thí sinh khuyết tật nặng, con liệt sĩ...).
2. Điểm Khuyến khích:
- Đạt giải cá nhân kỳ thi HSG cấp tỉnh/quốc gia (Giải nhất: 2.0đ; Giải nhì: 1.5đ; Giải ba: 1.0đ).
- Chứng chỉ nghề phổ thông / Tin học - Ngoại ngữ theo quy định (Loại Giỏi: 2.0đ; Khá: 1.5đ; TB: 1.0đ).
- Tổng điểm khuyến khích tối đa được cộng không quá 4.0 điểm.`,
    sourceName: 'Sở Giáo dục và Đào tạo',
    sourceDomain: 'hanoi.edu.vn',
    sourceUrl: 'https://moet.gov.vn',
    publishedAt: '18/03/2026',
    fetchedAt: '23/08/2026',
    schoolYear: '2025-2026',
    admissionYear: '2026',
    examYear: '2026',
    category: 'Ưu tiên',
    scope: 'SYSTEM',
    status: 'ACTIVE',
    creatorRole: 'SUPER_ADMIN',
    isOfficial: true,
    isPinned: false
  }
];

class OfficialGraduationExamService {
  private articles: OfficialGraduationArticle[] = [];
  private listeners: Array<() => void> = [];

  constructor() {
    this.load();
  }

  private load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.articles = parsed;
        } else {
          this.articles = [...INITIAL_OFFICIAL_ARTICLES];
          this.save();
        }
      } else {
        this.articles = [...INITIAL_OFFICIAL_ARTICLES];
        this.save();
      }
    } catch {
      this.articles = [...INITIAL_OFFICIAL_ARTICLES];
    }
  }

  private save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.articles));
    } catch (e) {
      console.error('Error saving graduation articles', e);
    }
    this.notify();
  }

  public getAll(includeArchived = false): OfficialGraduationArticle[] {
    const list = includeArchived
      ? this.articles
      : this.articles.filter(a => a.status !== 'ARCHIVED');

    return [...list].sort((a, b) => {
      // Pinned articles always come first
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      // Then sort by publishedAt date descending (newest first)
      const timeA = parseDateToTimestamp(a.publishedAt);
      const timeB = parseDateToTimestamp(b.publishedAt);
      const diff = timeB - timeA;
      if (diff !== 0) return diff;

      return (b.id || '').localeCompare(a.id || '');
    });
  }

  public getArticles(params?: {
    category?: string;
    query?: string;
    year?: string;
    statusFilter?: 'ALL' | 'ACTIVE' | 'ARCHIVED';
  }): OfficialGraduationArticle[] {
    const { category, query, year, statusFilter = 'ACTIVE' } = params || {};
    
    let list = this.getAll(statusFilter === 'ALL' || statusFilter === 'ARCHIVED');

    if (statusFilter === 'ACTIVE') {
      list = list.filter(a => a.status !== 'ARCHIVED');
    } else if (statusFilter === 'ARCHIVED') {
      list = list.filter(a => a.status === 'ARCHIVED');
    }

    if (category && category !== 'Tất cả') {
      list = list.filter(a => a.category === category);
    }

    if (year && year !== 'ALL' && year !== 'Tất cả') {
      list = list.filter(a => a.admissionYear === year || a.examYear === year || a.schoolYear?.includes(year));
    }

    if (query && query.trim()) {
      const q = query.toLowerCase().trim();
      list = list.filter(
        a =>
          a.title.toLowerCase().includes(q) ||
          a.summary.toLowerCase().includes(q) ||
          (a.content && a.content.toLowerCase().includes(q)) ||
          a.sourceName.toLowerCase().includes(q) ||
          (a.admissionYear && a.admissionYear.toLowerCase().includes(q)) ||
          (a.examYear && a.examYear.toLowerCase().includes(q))
      );
    }

    return list;
  }

  public getAvailableYears(): string[] {
    const set = new Set<string>(['2027', '2026', '2025']);
    this.articles.forEach(a => {
      if (a.admissionYear) set.add(a.admissionYear);
      if (a.examYear) set.add(a.examYear);
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }

  public createArticle(data: Omit<OfficialGraduationArticle, 'id' | 'fetchedAt'>): OfficialGraduationArticle {
    const newArt: OfficialGraduationArticle = {
      ...data,
      id: `grad-art-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      fetchedAt: new Date().toLocaleDateString('vi-VN'),
      publishedAt: data.publishedAt || new Date().toLocaleDateString('vi-VN'),
      status: data.status || 'ACTIVE',
      scope: data.scope || (data.creatorRole === 'SUPER_ADMIN' ? 'SYSTEM' : 'CLASS'),
      admissionYear: data.admissionYear || data.examYear || '2026',
      examYear: data.examYear || data.admissionYear || '2026'
    };
    this.articles = [newArt, ...this.articles];
    this.save();
    return newArt;
  }

  public updateArticle(id: string, updates: Partial<OfficialGraduationArticle>) {
    const idx = this.articles.findIndex(a => a.id === id);
    if (idx === -1) return;
    this.articles[idx] = {
      ...this.articles[idx],
      ...updates,
      fetchedAt: new Date().toLocaleDateString('vi-VN')
    };
    this.save();
  }

  public deleteArticle(id: string) {
    this.articles = this.articles.filter(a => a.id !== id);
    this.save();
  }

  public toggleArchive(id: string) {
    const item = this.articles.find(a => a.id === id);
    if (!item) return;
    item.status = item.status === 'ARCHIVED' ? 'ACTIVE' : 'ARCHIVED';
    this.save();
  }

  public togglePin(id: string) {
    const item = this.articles.find(a => a.id === id);
    if (!item) return;
    item.isPinned = !item.isPinned;
    this.save();
  }

  /**
   * Check if the current user can edit/delete/archive the given article
   */
  public canEditArticle(user: UserAccount | null | undefined, article: OfficialGraduationArticle): boolean {
    if (!user) return false;
    const isSuperAdmin = user.role === 'SUPER_ADMIN' || (user as any).role === 'ADMIN';
    if (isSuperAdmin) return true;

    if (user.role === 'TEACHER') {
      // GVCN can edit class-level articles or articles created by themselves/teachers
      if (article.scope === 'SYSTEM' || article.creatorRole === 'SUPER_ADMIN') {
        return false;
      }
      return true;
    }

    return false;
  }

  public syncFromOfficialSources() {
    INITIAL_OFFICIAL_ARTICLES.forEach(init => {
      const existing = this.articles.find(a => a.id === init.id);
      if (!existing) {
        this.articles.push(init);
      }
    });
    this.save();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }
}

export const officialGraduationExamService = new OfficialGraduationExamService();

