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
  MessageSquare,
  Heart,
  Gamepad2,
  FileCheck,
  Lightbulb,
  CheckCircle2,
  Smile,
  ShieldAlert
} from 'lucide-react';
import { PromptTemplate } from './GeminiPromptHub';

const CHATGPT_PROMPTS: PromptTemplate[] = [
  {
    id: 'chatgpt-p1',
    category: 'phu_huynh',
    categoryLabel: 'Giao tiếp Phụ huynh',
    badge: 'Tâm lý & Tế nhị',
    title: 'Thư ngỏ chân thành gửi Phụ huynh học sinh cần nâng đỡ',
    description: 'Soạn tin nhắn/thư ngỏ chia sẻ tình hình học tập và tâm lý của học sinh một cách tế nhị, tạo sự đồng cảm.',
    prompt: `Bạn là Giáo viên Chủ nhiệm có kỹ năng giao tiếp sư phạm khéo léo và giàu lòng nhân ái.

Hãy giúp tôi soạn một Bức thư ngỏ gửi riêng cho Cha mẹ của một em học sinh với hoàn cảnh sau:
- Tình trạng: [Nhập tình trạng: Ví dụ "Gần đây em hay mệt mỏi trong giờ, chưa hoàn thành bài tập về nhà và có phần khép kín với bạn bè"]
- Mục đích: Không phải để trách phạt hay than phiền, mà là để gửi lời quan tâm, hỏi thăm sức khỏe/tâm lý của em ở nhà và cùng cha mẹ tìm cách đồng hành, động viên em.

Yêu cầu về văn phong:
1. Chân thành, ấm áp, thể hiện sự trân trọng và đồng cảm sâu sắc với sự vất vả của phụ huynh.
2. Nêu bật trước 1-2 điểm mạnh/ưu điểm của em để tạo niềm tin (ví dụ: em rất lễ phép, có năng khiếu vẽ/thể thao).
3. Chia sẻ nhẹ nhàng những điều thầy/cô quan sát thấy trong lớp và đề xuất một buổi trao đổi ngắn qua điện thoại vào thời gian phụ huynh thuận tiện nhất.
4. Dung lượng vừa phải, phù hợp để gửi qua Zalo hoặc thư tay.`,
    usageTips: 'Hãy thay đổi phần mô tả tình trạng và gửi ChatGPT để nhận 2 phiên bản (ngắn gọn và chi tiết).'
  },
  {
    id: 'chatgpt-p2',
    category: 'sinh_hoat',
    categoryLabel: 'Hoạt động Lớp',
    badge: 'Khuấy động không khí',
    title: '5 Trò chơi Sinh hoạt lớp 15 phút không cần đạo cụ',
    description: 'Bộ trò chơi gắn kết tinh thần đồng đội, giúp học sinh giải tỏa căng thẳng sau tuần học vất vả.',
    prompt: `Bạn là Quản trò và Chuyên gia Hoạt động Đội - Đoàn học đường.

Hãy thiết kế cho tôi 5 trò chơi tập thể ngắn (10 - 15 phút) dùng trong tiết Sinh hoạt lớp hoặc 15 phút đầu giờ:
- Đối tượng: Học sinh lớp 12 (đang chịu nhiều áp lực ôn thi)
- Không gian: Trong phòng học tiêu chuẩn, bàn ghế kê theo dãy, không có sân rộng
- Đạo cụ: Hoàn toàn KHÔNG cần đạo cụ hoặc chỉ dùng giấy nháp và bút có sẵn

Với mỗi trò chơi, hãy trình bày rõ:
1. TÊN TRÒ CHƠI (Ấn tượng, trẻ trung)
2. Ý NGHĨA / MỤC TIÊU (Gắn kết, rèn phản xạ, tạo tiếng cười, rèn trí nhớ...)
3. LUẬT CHƠI CHI TIẾT (Dễ hiểu, ai cũng tham gia được)
4. CÁCH PHẠT VUI VẺ (Hát 1 câu, làm điệu bộ hài hước, trả lời câu đố vui...)`,
    usageTips: 'Các trò chơi này đặc biệt hiệu quả để xả stress cho học sinh cuối cấp.'
  },
  {
    id: 'chatgpt-p3',
    category: 'hoc_sinh',
    categoryLabel: 'Nhận xét Học bạ',
    badge: 'Cá nhân hóa & Sâu sắc',
    title: 'Ngân hàng 20 Lời nhận xét Học bạ & Sổ liên lạc cuối kỳ',
    description: 'Các mẫu nhận xét đa dạng theo từng nhóm học sinh, mang tính khích lệ, tránh trùng lặp máy móc.',
    prompt: `Bạn là Giáo viên Chủ nhiệm lâu năm, có khả năng thấu hiểu tâm lý từng học sinh.

Hãy viết giúp tôi 20 mẫu Lời nhận xét Học bạ / Sổ liên lạc cuối kỳ cho học sinh lớp 12 theo chương trình GDPT 2018.

Hãy phân loại thành các nhóm học sinh cụ thể:
- Nhóm 1 (5 mẫu): Học sinh xuất sắc, gương mẫu, tích cực giúp đỡ bạn bè và hoạt động phong trào.
- Nhóm 2 (5 mẫu): Học sinh có học lực khá nhưng có tiến bộ vượt bậc về ý thức và nề nếp.
- Nhóm 3 (5 mẫu): Học sinh học lực trung bình nhưng có năng khiếu đặc biệt (văn nghệ, thể thao, hội họa, tin học).
- Nhóm 4 (5 mẫu): Học sinh còn trầm tính, rụt rè hoặc đôi lúc còn chưa tập trung, cần khích lệ tự tin bứt phá trong kỳ tới.

Yêu cầu:
- Mỗi nhận xét từ 3-4 câu, súc tích, ấm áp, giàu tính giáo dục.
- Tuyệt đối không dùng những câu sáo rỗng vô hồn. Mỗi lời nhận xét phải mở ra một hướng phát triển cụ thể.`,
    usageTips: 'Copy các câu nhận xét ưng ý để lưu vào sổ chủ nhiệm hoặc phần mềm quản lý điểm.'
  },
  {
    id: 'chatgpt-p4',
    category: 'hoc_sinh',
    categoryLabel: 'Xử lý Sư phạm',
    badge: 'Nghệ thuật ứng xử',
    title: 'Xử lý tình huống: Học sinh mâu thuẫn hoặc hiểu lầm trên mạng xã hội',
    description: 'Các bước sư phạm giải quyết mâu thuẫn nội bộ lớp học hòa nhã, giữ gìn đoàn kết.',
    prompt: `Bạn là Chuyên gia Tư vấn Tâm lý Học đường và Giáo viên Chủ nhiệm dày dạn kinh nghiệm.

Tôi đang gặp tình huống sư phạm cần xử lý:
- Tình huống: [Ví dụ: 2 nhóm học sinh trong lớp xảy ra tranh cãi, bóng gió nhau trên mạng xã hội dẫn đến không khí trong lớp căng thẳng, chia bè phái]

Hãy tư vấn cho tôi các bước giải quyết chuẩn mực sư phạm:
1. BƯỚC 1: Thu thập thông tin và lắng nghe riêng từng bên (Những câu hỏi cần hỏi, thái độ cần giữ).
2. BƯỚC 2: Buổi gặp mặt hòa giải kín (Quy tắc buổi gặp, cách giúp các em nhận ra cái sai của mình mà không bị mất mặt trước bạn bè).
3. BƯỚC 3: Hoạt động chung để hàn gắn và gắn kết lại tình cảm trong lớp.
4. BƯỚC 4: Kế hoạch theo dõi sau hòa giải (Tránh tái diễn).
5. LƯU Ý ĐẶC BIỆT: Khi nào cần thông báo cho Phụ huynh và cách trao đổi để phụ huynh hợp tác tích cực.`,
    usageTips: 'Điền chi tiết tình huống bạn đang gặp để nhận các bước tư vấn cụ thể.'
  },
  {
    id: 'chatgpt-p5',
    category: 'sinh_hoat',
    categoryLabel: 'Chuyên đề Kỹ năng',
    badge: 'Kỹ năng sống & Tự chủ',
    title: 'Kịch bản Chuyên đề: Kỹ năng Quản lý Thời gian & Vượt qua Áp lực Thi cử',
    description: 'Buổi sinh hoạt chuyên đề thực chiến giúp học sinh lập kế hoạch học tập khoa học.',
    prompt: `Bạn là Chuyên gia Đào tạo Kỹ năng sống cho học sinh THPT.

Hãy xây dựng Kịch bản Buổi Sinh hoạt Chuyên đề thời lượng 40 phút với chủ đề:
"BÍ QUYẾT QUẢN LÝ THỜI GIAN & ĐÁNH BAY ÁP LỰC TRƯỚC KỲ THI LỚN"

Nội dung kịch bản gồm:
1. HOẠT ĐỘNG KHỞI ĐỘNG (5 phút): Trắc nghiệm nhanh "Bạn đang ở mức độ căng thẳng nào?".
2. NỘI DUNG CHÍNH (25 phút):
   - Kỹ thuật chia nhỏ mục tiêu (Phương pháp Pomodoro & Ma trận Eisenhower áp dụng cho ôn thi).
   - Cách sắp xếp thời gian biểu học - nghỉ ngơi - thể thao hợp lý.
   - 3 bài tập thở và giải tỏa căng thẳng cấp tốc tại bàn học (Kỹ thuật thở 4-7-8).
3. THỰC HÀNH TẠI CHỖ (10 phút): Mỗi học sinh tự điền bảng cam kết "Kế hoạch 7 ngày tới của tôi".
4. TÀI LIỆU PHÁT TAY (Handout): Tóm tắt 5 nguyên tắc vàng gửi học sinh.`,
    usageTips: 'Có thể dùng làm chuyên đề sinh hoạt lớp đầu tháng hoặc trước các đợt thi lớn.'
  }
];

export const ChatGPTPromptHub: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const categories = [
    { id: 'ALL', label: 'Tất cả Prompt' },
    { id: 'phu_huynh', label: 'Thư & Tin nhắn Phụ huynh' },
    { id: 'sinh_hoat', label: 'Trò chơi & Sinh hoạt' },
    { id: 'hoc_sinh', label: 'Nhận xét & Xử lý sư phạm' }
  ];

  const filteredPrompts = selectedCategory === 'ALL'
    ? CHATGPT_PROMPTS
    : CHATGPT_PROMPTS.filter((p) => p.category === selectedCategory);

  const handleCopy = (promptText: string, id: string) => {
    navigator.clipboard.writeText(promptText);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleCopyAndOpenChatGPT = (promptText: string, id: string) => {
    navigator.clipboard.writeText(promptText);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
    window.open('https://chatgpt.com', '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Header Card */}
      <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-r from-emerald-600 via-teal-700 to-slate-900 p-6 text-white shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-emerald-300" />
              <span>OpenAI ChatGPT • Thế mạnh suy luận tâm lý & văn phong sư phạm truyền cảm</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              Mở OpenAI ChatGPT cùng Kho Prompts Tình huống Sư phạm
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100 leading-relaxed">
              ChatGPT xuất sắc trong việc soạn thư ngỏ chạm đến cảm xúc phụ huynh, thiết kế các minigame lớp học sôi nổi, xử lý tình huống tâm lý học đường và viết lời nhận xét học bạ giàu tính nhân văn. Bấm nút để sao chép lệnh và mở thẳng ChatGPT mà không cần API key!
            </p>
          </div>

          <div className="shrink-0 flex flex-col sm:flex-row gap-3">
            <a
              href="https://chatgpt.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-xs sm:text-sm font-bold text-teal-900 shadow-md hover:bg-emerald-50 transition-all cursor-pointer"
            >
              <span>Mở OpenAI ChatGPT</span>
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>

        {/* Feature Pill Tags */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-4 border-t border-white/15 text-[11px]">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-300 shrink-0" />
            <span>Văn phong sâu sắc, ấm áp</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-300 shrink-0" />
            <span>Không yêu cầu API Key</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-300 shrink-0" />
            <span>Xử lý tình huống tâm lý lớp</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-300 shrink-0" />
            <span>Minigame & Hoạt động lớp</span>
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
                ? 'bg-teal-700 text-white shadow-xs'
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
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between hover:border-teal-300 hover:shadow-md transition-all group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="rounded-md bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-800 border border-teal-200/60">
                        {item.categoryLabel}
                      </span>
                      {item.badge && (
                        <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200/60">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-slate-800 group-hover:text-teal-700 transition-colors">
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
                  <div className="flex items-start gap-1.5 text-[11px] text-teal-800 bg-teal-50/70 rounded-lg p-2 border border-teal-200/60">
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
                  onClick={() => handleCopyAndOpenChatGPT(item.prompt, item.id)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 shadow-xs transition-all cursor-pointer"
                >
                  <span>Mở trong ChatGPT</span>
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
