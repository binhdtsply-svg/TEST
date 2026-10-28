/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ExternalLink,
  BookOpen,
  Sparkles,
  Presentation,
  CheckCircle2,
  FileQuestion,
  Search,
  Palette,
  FileText,
  Brain,
  ShieldCheck,
  ArrowUpRight
} from 'lucide-react';

interface OtherTool {
  id: string;
  name: string;
  provider: string;
  url: string;
  icon: string;
  badge: string;
  badgeColor: string;
  description: string;
  bestFor: string;
  keyFeatures: string[];
}

const OTHER_AI_TOOLS: OtherTool[] = [
  {
    id: 'notebooklm',
    name: 'Google NotebookLM',
    provider: 'Google',
    url: 'https://notebooklm.google.com',
    icon: '📚',
    badge: 'Tra cứu tài liệu 100% chuẩn xác',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    description: 'Sổ tay AI thông minh cho phép tải lên toàn bộ Sổ chủ nhiệm, Quy chế thi, Sách giáo khoa, Kế hoạch giáo dục nhà trường và hỏi đáp chỉ dựa trên tài liệu tải lên mà không sợ AI bịa thông tin.',
    bestFor: 'GVCN tra cứu quy chế, tổng hợp nội dung biên bản họp, làm podcast tổng kết năm.',
    keyFeatures: [
      'Không bịa đặt thông tin (Grounded AI)',
      'Tải lên file PDF, Google Docs, Slide',
      'Tạo Audio Overview (Podcast tóm tắt bài học)',
      'Miễn phí hoàn toàn với tài khoản Google'
    ]
  },
  {
    id: 'copilot',
    name: 'Microsoft Copilot',
    provider: 'Microsoft',
    url: 'https://copilot.microsoft.com',
    icon: '🚀',
    badge: 'Tích hợp Bing & DALL-E 3',
    badgeColor: 'bg-sky-50 text-sky-700 border-sky-200',
    description: 'Trợ lý AI đa năng tích hợp công cụ tìm kiếm Bing Web và tạo hình ảnh minh họa DALL-E 3 miễn phí, thích hợp tạo tư liệu minh họa cho bài học và bảng tin lớp.',
    bestFor: 'Tạo hình ảnh minh họa bảng tin, slide sinh hoạt lớp, tìm kiếm tài liệu mới.',
    keyFeatures: [
      'Tạo hình ảnh minh họa với DALL-E 3',
      'Tìm kiếm web thời gian thực',
      'Tích hợp tốt với hệ sinh thái Word/Excel/PowerPoint',
      'Đọc và tóm tắt trang web ngay trên Microsoft Edge'
    ]
  },
  {
    id: 'claude',
    name: 'Claude AI',
    provider: 'Anthropic',
    url: 'https://claude.ai',
    icon: '✍️',
    badge: 'Văn phong tự nhiên & Xử lý văn bản lớn',
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
    description: 'Nổi tiếng với văn phong tự nhiên, ấm áp, chuẩn mực và khả năng đọc các văn bản dung lượng cực lớn như toàn bộ chương trình giáo dục môn học hoặc tài liệu hướng dẫn.',
    bestFor: 'Soạn thảo báo cáo thành tích lớp, viết bài tham luận sư phạm, nghị quyết đại hội chi đoàn.',
    keyFeatures: [
      'Hành văn tiếng Việt trau chuốt, tự nhiên',
      'Đọc tài liệu lên tới 200.000 tokens',
      'Phân tích cấu trúc câu chữ rất tinh tế',
      'Giao diện tối giản, tập trung làm việc'
    ]
  },
  {
    id: 'deepseek',
    name: 'DeepSeek AI',
    provider: 'DeepSeek',
    url: 'https://chat.deepseek.com',
    icon: '🧠',
    badge: 'Suy luận logic & Phân tích ma trận',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    description: 'Mô hình AI suy luận mã nguồn mở với khả năng tư duy từng bước cực mạnh, hỗ trợ phân tích điểm số, tính toán thống kê và xây dựng ma trận phân hóa.',
    bestFor: 'Phân tích số liệu học tập, ma trận đề kiểm tra, thuật toán xếp thời khóa biểu/tổ chức nhóm.',
    keyFeatures: [
      'Tư duy chuỗi suy luận (Chain of Thought)',
      'Miễn phí, tốc độ phản hồi nhanh',
      'Rất mạnh về toán học và phân tích dữ liệu',
      'Giải thích từng bước chi tiết, mạch lạc'
    ]
  },
  {
    id: 'canva_edu',
    name: 'Canva Magic Education',
    provider: 'Canva',
    url: 'https://www.canva.com/education/',
    icon: '🎨',
    badge: 'Thiết kế Slide & Infographic',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    description: 'Bộ công cụ thiết kế đồ họa với tính năng AI Magic Design: tự động tạo slide sinh hoạt lớp, thiệp chúc mừng sinh nhật học sinh, poster phong trào và giấy khen chỉ từ mô tả ngắn.',
    bestFor: 'Thiết kế slide sinh hoạt lớp, infographic sơ kết tháng, giấy chứng nhận thành tích.',
    keyFeatures: [
      'Miễn phí 100% cho Giáo viên (Canva for Education)',
      'Tạo slide bài giảng / sinh hoạt lớp chỉ trong vài giây',
      'Hàng triệu mẫu thiết kế học đường đẹp mắt',
      'Xuất file PowerPoint, PDF in ấn sắc nét'
    ]
  },
  {
    id: 'gamma',
    name: 'Gamma App',
    provider: 'Gamma Tech',
    url: 'https://gamma.app',
    icon: '📊',
    badge: 'Tạo Bài thuyết trình AI trong 1 phút',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
    description: 'Công cụ AI tự động tạo bài thuyết trình hoàn chỉnh (gồm cấu trúc slide, nội dung văn bản và hình ảnh minh họa) chỉ từ 1 câu lệnh chủ đề sinh hoạt lớp.',
    bestFor: 'Chuẩn bị slide chuyên đề sinh hoạt lớp, thuyết trình họp phụ huynh khi gấp gáp.',
    keyFeatures: [
      'Tạo slide từ 1 câu lệnh chủ đề',
      'Tùy biến giao diện và màu sắc chuyên nghiệp',
      'Xuất sang PowerPoint hoặc trình chiếu trực tiếp trên web',
      'Tiết kiệm 90% thời gian làm slide'
    ]
  },
  {
    id: 'quizizz_ai',
    name: 'Quizizz AI',
    provider: 'Quizizz Inc.',
    url: 'https://quizizz.com',
    icon: '🎮',
    badge: 'Trò chơi trắc nghiệm & Minigame',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    description: 'Tự động tạo bộ câu hỏi trắc nghiệm, câu đố vui kiến thức và trò chơi tương tác trực tiếp trên điện thoại/máy tính cho học sinh trong các tiết sinh hoạt lớp.',
    bestFor: 'Tổ chức minigame đố vui cuối tuần, thi tìm hiểu pháp luật, an toàn giao thông.',
    keyFeatures: [
      'Tạo câu hỏi từ văn bản hoặc video YouTube',
      'Học sinh chơi trực tiếp sôi nổi, hào hứng',
      'Thống kê bảng xếp hạng người chơi tức thì',
      'Thư viện hàng triệu câu hỏi có sẵn từ giáo viên'
    ]
  },
  {
    id: 'perplexity',
    name: 'Perplexity AI',
    provider: 'Perplexity AI',
    url: 'https://www.perplexity.ai',
    icon: '🔍',
    badge: 'Tra cứu thông tin có nguồn dẫn',
    badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    description: 'Công cụ tìm kiếm AI kèm trích dẫn nguồn chuẩn xác, hỗ trợ tìm các bài báo khoa học giáo dục, số liệu tuyển sinh đại học mới nhất và văn bản hướng dẫn của Bộ GD&ĐT.',
    bestFor: 'Tra cứu số liệu tuyển sinh, điểm chuẩn các trường đại học, văn bản pháp quy.',
    keyFeatures: [
      'Kèm nguồn dẫn (citations) cho từng câu trả lời',
      'Tìm kiếm thông tin cập nhật tức thời',
      'Tóm tắt đa nguồn đáng tin cậy',
      'Hỗ trợ tra cứu tiếng Việt rất tốt'
    ]
  }
];

export const OtherAIToolsHub: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTools = OTHER_AI_TOOLS.filter(
    (t) =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.bestFor.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Header */}
      <div className="rounded-2xl border border-slate-200 bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              <span>Hệ sinh thái Công cụ AI Giáo dục Tuyển chọn</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              Danh mục Công cụ AI Hàng Đầu cho Giáo Viên
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Tổng hợp các nền tảng AI giáo dục chuyên sâu hỗ trợ đắc lực cho công tác chủ nhiệm: từ đọc tài liệu không bịa đặt (NotebookLM), tạo bài thuyết trình siêu tốc (Gamma), thiết kế đồ họa (Canva Edu) đến tổ chức trò chơi tương tác (Quizizz).
            </p>
          </div>

          <div className="shrink-0">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm kiếm công cụ AI..."
                className="w-full sm:w-64 rounded-xl border border-slate-700 bg-slate-800/90 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTools.map((tool) => (
          <div
            key={tool.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between hover:border-indigo-300 hover:shadow-md transition-all group"
          >
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-2xl shadow-inner group-hover:scale-105 transition-transform">
                    {tool.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {tool.name}
                      </h3>
                      <span className="text-[11px] text-slate-400">({tool.provider})</span>
                    </div>
                    <span className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold border mt-0.5 ${tool.badgeColor}`}>
                      {tool.badge}
                    </span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-slate-600 leading-relaxed">
                {tool.description}
              </p>

              {/* Best for */}
              <div className="rounded-xl bg-slate-50 p-2.5 text-xs text-slate-700 border border-slate-100">
                <span className="font-bold text-indigo-700">Ứng dụng phù hợp nhất: </span>
                <span>{tool.bestFor}</span>
              </div>

              {/* Key Features List */}
              <div className="space-y-1 pt-1">
                {tool.keyFeatures.map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-[11px] text-slate-600">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Footer */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">Mở trong tab mới</span>
              <a
                href={tool.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-indigo-600 transition-colors shadow-xs cursor-pointer"
              >
                <span>Truy cập {tool.name}</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
