/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  FileText,
  Users,
  Compass,
  Award,
  BookOpen,
  Calendar,
  Layers,
  HelpCircle,
  Lightbulb,
  CheckCircle2,
  Share2
} from 'lucide-react';

export interface PromptTemplate {
  id: string;
  category: 'sinh_hoat' | 'phu_huynh' | 'hoc_sinh' | 'ke_hoach' | 'huong_nghiep';
  categoryLabel: string;
  title: string;
  description: string;
  prompt: string;
  usageTips?: string;
  badge?: string;
}

const GEMINI_PROMPTS: PromptTemplate[] = [
  {
    id: 'gemini-p1',
    category: 'sinh_hoat',
    categoryLabel: 'Sinh hoạt lớp',
    badge: 'Chương trình GDPT 2018',
    title: 'Kế hoạch tiết Sinh hoạt lớp 45 phút theo chủ đề',
    description: 'Thiết kế giáo án sinh hoạt lớp sinh động, phát huy tinh thần tự quản của Ban cán sự lớp.',
    prompt: `Bạn là Cố vấn Giáo dục và Giáo viên Chủ nhiệm THPT giàu kinh nghiệm trong chương trình GDPT 2018.

Hãy soạn cho tôi Kế hoạch chi tiết tiết Sinh hoạt lớp (thời lượng 45 phút) với các thông tin sau:
- Chủ đề: [Nhập chủ đề: ví dụ "Xây dựng tình bạn đẹp & Phòng chống bạo lực học đường" hoặc "Kỹ năng quản lý thời gian ôn thi Tốt nghiệp THPT"]
- Khối lớp: 12
- Quy mô lớp: 40 học sinh

Kế hoạch cần có cấu trúc:
1. MỤC TIÊU TIẾT SINH HOẠT (Phẩm chất, năng lực cần đạt)
2. CÔNG TÁC CHUẨN BỊ (GVCN và Ban cán sự lớp chuẩn bị gì)
3. TIẾN TRÌNH CHI TIẾT (45 phút):
   - Phần 1 (10 phút): Ban cán sự sơ kết nề nếp, học tập tuần qua & tuyên dương gương sáng.
   - Phần 2 (25 phút): Hoạt động sinh hoạt chuyên đề theo chủ đề (có 1 minigame/hoạt động nhóm tương tác).
   - Phần 3 (10 phút): GVCN tổng kết, định hướng trọng tâm tuần tới và thông điệp truyền cảm hứng.
4. CÂU HỎI THẢO LUẬN & THÔNG ĐIỆP ĐÚC KẾT.`,
    usageTips: 'Thay đổi phần [Nhập chủ đề] theo chủ đề thực tế của tuần này rồi gửi cho Gemini.'
  },
  {
    id: 'gemini-p2',
    category: 'phu_huynh',
    categoryLabel: 'Họp Phụ huynh',
    badge: 'Tương tác & Gắn kết',
    title: 'Kịch bản & Bài phát biểu Họp Cha Mẹ Học Sinh',
    description: 'Xây dựng bài phát biểu ấm áp, cởi mở, chuyển từ "báo cáo điểm số" sang "đồng hành cùng con".',
    prompt: `Bạn là Giáo viên Chủ nhiệm tâm huyết. Hãy soạn cho tôi Kịch bản và Bài phát biểu hoàn chỉnh cho buổi Họp Cha Mẹ Học Sinh [Đầu năm / Giữa kỳ I / Sơ kết Học kỳ I / Cuối năm].

Thông tin lớp:
- Lớp: 12 (Năm cuối cấp chuẩn bị thi Tốt nghiệp THPT và xét tuyển Đại học)
- Định hướng buổi họp: Ấm áp, tôn trọng, thấu hiểu, cùng phụ huynh gỡ bỏ áp lực cho các em.

Nội dung cần bao gồm:
1. LỜI MỞ ĐẦU CHÀO MỪNG (Ấm áp, tri ân sự hiện diện của quý phụ huynh).
2. TỔNG QUAN ĐẶC ĐIỂM TÂM SINH LÝ LỨA TUỔI 17-18 VÀ ÁP LỰC CUỐI CẤP.
3. BÁO CÁO TÌNH HÌNH CHUNG CỦA LỚP (Nhấn mạnh sự tiến bộ, tinh thần đoàn kết, nề nếp kỷ cương).
4. NHỮNG THÔNG TIN QUAN TRỌNG VỀ KỲ THI TỐT NGHIỆP THPT (Chương trình mới, tổ hợp môn thi, phương thức xét tuyển).
5. GỢI Ý ĐỒNG HÀNH DÀNH CHO PHỤ HUYNH (Cách lắng nghe con, dinh dưỡng mùa thi, không tạo áp lực so sánh).
6. PHẦN TÂM TƯ CỦA HỌC SINH (Kịch bản để học sinh gửi thư tay/video ngắn nhắn gửi đến cha mẹ).
7. LỜI KẾT & CAM KẾT ĐỒNG HÀNH CỦA GVCN.`,
    usageTips: 'Gemini rất mạnh về việc tạo văn phong ấm áp, phù hợp môi trường giáo dục Việt Nam.'
  },
  {
    id: 'gemini-p3',
    category: 'hoc_sinh',
    categoryLabel: 'Phân tích Học sinh',
    badge: 'Sư phạm cá nhân hóa',
    title: 'Kế hoạch sư phạm hỗ trợ Học sinh cần nâng đỡ',
    description: 'Đề xuất giải pháp giúp đỡ học sinh có dấu hiệu sa sút học tập hoặc vi phạm nề nếp.',
    prompt: `Bạn là Chuyên gia Tâm lý Giáo dục THPT. 

Tôi có một học sinh lớp 12 cần sự hỗ trợ đặc biệt từ GVCN:
- Tình trạng học tập: [Ví dụ: Điểm kiểm tra Toán và Tiếng Anh bị giảm mạnh trong 3 tuần gần đây]
- Nề nếp / Chuyên cần: [Ví dụ: Hay đi muộn vào thứ Hai, trong giờ học hay gục mặt xuống bàn, ít tương tác với bạn bè]
- Hoàn cảnh / Tâm lý ghi nhận: [Ví dụ: Gia đình có biến động nhỏ, em lo lắng về việc chọn ngành đại học]

Hãy giúp tôi xây dựng:
1. PHÂN TÍCH NGUYÊN NHÂN CỐT LÕI (Từ góc độ tâm lý tuổi học trò, áp lực thi cử và môi trường lớp học).
2. KỊCH BẢN TRÒ CHUYỆN RIÊNG 1:1 CỦA GVCN VỚI HỌC SINH (Cách mở lời tế nhị, tạo niềm tin, các câu hỏi lắng nghe không phán xét).
3. KẾ HOẠCH HÀNH ĐỘNG 3 TUẦN ĐỂ NÂNG ĐỠ EM (Phân công bạn học kèm theo mô hình đôi bạn cùng tiến, khích lệ điểm mạnh).
4. CÁCH PHỐI HỢP VỚI PHỤ HUYNH (Soạn tin nhắn/lời trao đổi khéo léo để gia đình đồng hành mà không mắng mỏ em).`,
    usageTips: 'Không đưa tên thật của học sinh vào prompt để bảo mật thông tin cá nhân.'
  },
  {
    id: 'gemini-p4',
    category: 'huong_nghiep',
    categoryLabel: 'Hướng nghiệp',
    badge: 'Mô hình RIASEC & GDPT',
    title: 'Tư vấn Tổ hợp môn & Định hướng nghề nghiệp cho học sinh',
    description: 'Phân tích tổ hợp môn thi Tốt nghiệp THPT gắn với nhóm ngành nghề và xu hướng xã hội.',
    prompt: `Bạn là Chuyên gia Tư vấn Hướng nghiệp THPT.

Hãy giúp tôi tư vấn chọn ngành nghề và định hướng xét tuyển cho học sinh có đặc điểm:
- Các môn thế mạnh: [Ví dụ: Toán, Vật lí, Tin học hoặc Ngữ văn, Lịch sử, Ngoại ngữ]
- Sở thích / Tính cách: [Ví dụ: Thích công nghệ, máy móc, làm việc độc lập hoặc Thích giao tiếp, hoạt động xã hội, viết lách]
- Kết quả trắc nghiệm RIASEC sơ bộ: [Ví dụ: Nhóm Kỹ thuật (R) - Nghiên cứu (I) hoặc Nhóm Xã hội (S) - Quản lý (E)]

Hãy phân tích và đưa ra:
1. CÁC TỔ HỢP MÔN THI TỐT NGHIỆP THPT PHÙ HỢP (Theo cấu trúc 2 môn bắt buộc Toán + Văn và 2 môn tự chọn).
2. TOP 5 NHÓM NGÀNH NGHỀ PHÙ HỢP NHẤT TRONG 5 NĂM TỚI (Mô tả công việc, cơ hội phát triển).
3. CÁC TRƯỜNG ĐẠI HỌC / CAO ĐẲNG ĐÀO TẠO UY TÍN TẠI VIỆT NAM.
4. LỜI KHUYÊN PHÁT TRIỂN NĂNG LỰC NGAY TỪ LỚP 12 (Kỹ năng mềm, ngoại ngữ, chứng chỉ cần chuẩn bị).`,
    usageTips: 'Điền thông tin sở thích và môn thế mạnh của học sinh để nhận tư vấn cụ thể.'
  },
  {
    id: 'gemini-p5',
    category: 'ke_hoach',
    categoryLabel: 'Kế hoạch năm học',
    badge: 'Quản trị lớp học',
    title: 'Xây dựng Phong trào Thi đua & Vườn Nguyệt Quế 4 tuần',
    description: 'Thiết kế chiến dịch thi đua tạo động lực cho học sinh tiến bộ toàn diện.',
    prompt: `Bạn là Giáo viên Chủ nhiệm sáng tạo.

Hãy thiết kế cho tôi một Chiến dịch Thi đua ngắn hạn trong 4 tuần cho lớp 12:
- Tên chiến dịch: [Gợi ý tên truyền cảm hứng, ví dụ "Chinh Phục Nguyệt Quế - Về Đích Tự Hào"]
- Mục tiêu: Khắc phục tình trạng đi muộn, tăng số tiết học tốt, giúp đỡ các bạn học lực trung bình bứt phá.

Kế hoạch bao gồm:
1. TIÊU CHÍ TÍCH ĐIỂM HOA NGUYỆT QUẾ (Quy đổi điểm cộng cho việc tốt, điểm 9-10, đi học đúng giờ, giúp đỡ bạn).
2. HÌNH THỨC THI ĐUA THEO TỔ / NHÓM HỌC TẬP (Mỗi tổ là một đội thuyền cùng vượt sóng).
3. HÌNH THỨC VINH DANH VÀ TRAO THƯỞNG CUỐI THÁNG (Ý nghĩa tinh thần, danh hiệu vui vẻ, không tốn kém kinh phí).
4. THÔNG ĐIỆP PHÁT ĐỘNG TRONG BUỔI ĐẦU TUẦN ĐỂ TẠO KHÔNG KHÍ HÀO HỨNG.`,
    usageTips: 'Chiến dịch thi đua gắn liền với Cây Nguyệt Quế trên Không Gian Chủ Nhiệm Số.'
  }
];

export const GeminiPromptHub: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const categories = [
    { id: 'ALL', label: 'Tất cả Prompt' },
    { id: 'sinh_hoat', label: 'Sinh hoạt lớp' },
    { id: 'phu_huynh', label: 'Họp & Thư Phụ huynh' },
    { id: 'hoc_sinh', label: 'Phân tích Học sinh' },
    { id: 'huong_nghiep', label: 'Hướng nghiệp 2018' },
    { id: 'ke_hoach', label: 'Kế hoạch thi đua' }
  ];

  const filteredPrompts = selectedCategory === 'ALL'
    ? GEMINI_PROMPTS
    : GEMINI_PROMPTS.filter((p) => p.category === selectedCategory);

  const handleCopy = (promptText: string, id: string) => {
    navigator.clipboard.writeText(promptText);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleCopyAndOpenGemini = (promptText: string, id: string) => {
    navigator.clipboard.writeText(promptText);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
    window.open('https://gemini.google.com/app', '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Header Card */}
      <div className="rounded-2xl border border-indigo-200/80 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-800 p-6 text-white shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              <span>Google Gemini • Miễn phí & Xử lý tài liệu dài không giới hạn</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              Mở Google Gemini cùng Ngân hàng Prompt GVCN
            </h2>
            <p className="text-xs sm:text-sm text-indigo-100 leading-relaxed">
              Google Gemini sở hữu khả năng phân tích ngữ cảnh lớn, đọc toàn bộ tệp danh sách lớp, biên bản họp và tra cứu kiến thức thời gian thực. Bấm nút dưới đây để sao chép mẫu lệnh và mở thẳng Gemini để sử dụng ngay mà không cần API key!
            </p>
          </div>

          <div className="shrink-0 flex flex-col sm:flex-row gap-3">
            <a
              href="https://gemini.google.com/app"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-xs sm:text-sm font-bold text-indigo-900 shadow-md hover:bg-indigo-50 transition-all cursor-pointer"
            >
              <span>Mở Google Gemini</span>
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>

        {/* Feature Pill Tags */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-4 border-t border-white/15 text-[11px]">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-300 shrink-0" />
            <span>Đọc file Word / PDF lớp học</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-300 shrink-0" />
            <span>Không yêu cầu API Key</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-300 shrink-0" />
            <span>Tra cứu văn bản GDPT mới</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-300 shrink-0" />
            <span>Xuất sang Google Docs 1-click</span>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
              selectedCategory === cat.id
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Prompts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredPrompts.map((item) => {
          const isCopied = copiedId === item.id;
          return (
            <div
              key={item.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between hover:border-indigo-300 hover:shadow-md transition-all group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200/60">
                        {item.categoryLabel}
                      </span>
                      {item.badge && (
                        <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200/60">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                      {item.title}
                    </h3>
                  </div>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">
                  {item.description}
                </p>

                {/* Prompt Preview Box */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-[11px] font-mono text-slate-700 max-h-36 overflow-y-auto whitespace-pre-wrap leading-relaxed select-all">
                  {item.prompt}
                </div>

                {item.usageTips && (
                  <div className="flex items-start gap-1.5 text-[11px] text-amber-700 bg-amber-50/70 rounded-lg p-2 border border-amber-200/60">
                    <Lightbulb className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span><strong>Mẹo:</strong> {item.usageTips}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleCopy(item.prompt, item.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isCopied
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {isCopied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Đã sao chép!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-slate-500" />
                      <span>Sao chép Prompt</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => handleCopyAndOpenGemini(item.prompt, item.id)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition-all cursor-pointer"
                >
                  <span>Mở trong Gemini</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
