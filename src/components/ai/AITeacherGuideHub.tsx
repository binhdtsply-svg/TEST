/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  BookOpen,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Lightbulb,
  FileCheck,
  ChevronDown,
  ChevronUp,
  Layers,
  Heart,
  Users,
  MessageSquare
} from 'lucide-react';

export const AITeacherGuideHub: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: '1. Sử dụng AI có cần phải trả phí hoặc mua tài khoản không?',
      a: 'Hoàn toàn không. Các công cụ lớn như Google Gemini, ChatGPT (bản 4o mini), Microsoft Copilot, Google NotebookLM và Canva for Education đều cung cấp phiên bản miễn phí rất mạnh mẽ, đáp ứng trọn vẹn 100% nhu cầu công tác chủ nhiệm, soạn kế hoạch và xử lý tình huống sư phạm của thầy/cô.'
    },
    {
      q: '2. Làm thế nào để đảm bảo tuyệt đối an toàn thông tin và bảo mật dữ liệu học sinh khi dùng AI?',
      a: 'Quy tắc vàng: Tuyệt đối KHÔNG đưa thông tin định danh cá nhân nhạy cảm (Họ tên đầy đủ + CCCD + Số điện thoại + Địa chỉ nhà riêng) lên các AI công cộng. Khi cần phân tích tình huống, hãy dùng bí danh như "Học sinh A", "Học sinh B", chỉ mô tả biểu hiện học tập/nề nếp khách quan.'
    },
    {
      q: '3. Khi AI đưa ra lời khuyên hoặc phương án kỷ luật, GVCN nên ứng xử thế nào?',
      a: 'AI chỉ đóng vai trò là một người trợ lý gợi ý (Assistant), không thể thay thế trái tim và tư duy sư phạm của người thầy. Mọi đề xuất của AI cần được GVCN kiểm chứng, đối chiếu với Quy chế nhà trường và hoàn cảnh thực tế trước khi đưa ra quyết định.'
    },
    {
      q: '4. Tại sao đôi khi AI trả lời chung chung, không đúng trọng tâm lớp học?',
      a: 'Nguyên nhân thường do câu lệnh (Prompt) quá ngắn hoặc thiếu bối cảnh cụ thể. Hãy áp dụng công thức 5 bước C-L-E-A-R dưới đây để cung cấp đủ bối cảnh (khối lớp 12, đặc điểm lớp, thời lượng 45 phút, định dạng mong muốn).'
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Header */}
      <div className="rounded-2xl border border-indigo-200/80 bg-linear-to-r from-blue-700 via-indigo-700 to-indigo-900 p-6 text-white shadow-sm">
        <div className="space-y-2 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-md">
            <BookOpen className="h-3.5 w-3.5 text-amber-300" />
            <span>Cẩm nang Sư phạm Số</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            Hướng Dẫn Ứng Dụng AI Hiệu Quả & Chuẩn Mực Cho GVCN
          </h2>
          <p className="text-xs sm:text-sm text-indigo-100 leading-relaxed">
            AI là trợ lý đắc lực giải phóng thầy/cô khỏi các công việc hành chính lặp lại để dành nhiều thời gian hơn cho việc lắng nghe, thấu cảm và đồng hành cùng từng học trò. Dưới đây là phương pháp viết lệnh chuẩn và các nguyên tắc đạo đức cốt lõi.
          </p>
        </div>
      </div>

      {/* 5 Steps CLEAR Formula */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Sparkles className="h-5 w-5 text-indigo-600" />
          <h3 className="text-sm sm:text-base font-bold text-slate-900">
            Quy Trình 5 Bước Viết Prompt Sư Phạm Chuẩn "C-L-E-A-R"
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-2">
          {/* C */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 font-black text-xs text-white">
                C
              </span>
              <span className="font-bold text-xs text-blue-900">Context (Bối cảnh)</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Mô tả rõ bối cảnh: Lớp 12, sĩ số 40, chương trình GDPT 2018, đặc thù cuối cấp.
            </p>
            <div className="rounded bg-white/90 p-2 text-[10px] font-mono text-blue-800 border border-blue-100">
              "Tôi là GVCN lớp 12 chuẩn bị thi Tốt nghiệp THPT..."
            </div>
          </div>

          {/* L */}
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 font-black text-xs text-white">
                L
              </span>
              <span className="font-bold text-xs text-emerald-900">Limits (Giới hạn)</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Đặt giới hạn cụ thể: Thời lượng tiết 45 phút, dưới 300 từ, không dùng đạo cụ.
            </p>
            <div className="rounded bg-white/90 p-2 text-[10px] font-mono text-emerald-800 border border-emerald-100">
              "Thời lượng 45 phút, không gian phòng học tiêu chuẩn..."
            </div>
          </div>

          {/* E */}
          <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-600 font-black text-xs text-white">
                E
              </span>
              <span className="font-bold text-xs text-amber-900">Expectation (Kỳ vọng)</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Chỉ rõ định dạng đầu ra: Bảng biểu, bullet point, có phần đúc kết thông điệp.
            </p>
            <div className="rounded bg-white/90 p-2 text-[10px] font-mono text-amber-800 border border-amber-100">
              "Trình bày dạng bảng gồm 3 cột: Hoạt động - Thời gian - Người thực hiện"
            </div>
          </div>

          {/* A */}
          <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-600 font-black text-xs text-white">
                A
              </span>
              <span className="font-bold text-xs text-purple-900">Action (Hành động)</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Sử dụng các động từ hành động mạnh mẽ: Soạn giáo án, Thiết kế kịch bản, Phân tích.
            </p>
            <div className="rounded bg-white/90 p-2 text-[10px] font-mono text-purple-800 border border-purple-100">
              "Hãy soạn kịch bản chi tiết từng lời thoại..."
            </div>
          </div>

          {/* R */}
          <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-600 font-black text-xs text-white">
                R
              </span>
              <span className="font-bold text-xs text-rose-900">Role (Vai trò AI)</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Giao vai trò chuyên gia: Chuyên gia tâm lý học đường, Quản trò sinh hoạt Đội.
            </p>
            <div className="rounded bg-white/90 p-2 text-[10px] font-mono text-rose-800 border border-rose-100">
              "Hãy đóng vai Chuyên gia tâm lý lứa tuổi 17-18..."
            </div>
          </div>
        </div>
      </div>

      {/* 3 Core Ethical & Privacy Rules */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-5 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
            <ShieldCheck className="h-5 w-5 text-rose-600" />
            <span>1. Bảo Vệ Dữ Liệu Học Sinh</span>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed">
            Tuyệt đối ẩn danh tên thật, số điện thoại, kết quả kiểm tra cụ thể gắn với định danh cá nhân khi đặt câu hỏi lên các công cụ AI công cộng.
          </p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
            <FileCheck className="h-5 w-5 text-amber-600" />
            <span>2. Kiểm Chứng Trước Khi Sử Dụng</span>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed">
            Luôn rà soát lại các quy định pháp luật, điểm số, thể lệ xét tuyển mà AI đề xuất để đảm bảo khớp 100% với hướng dẫn mới nhất của Bộ GD&ĐT.
          </p>
        </div>

        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-5 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-indigo-800 font-bold text-xs">
            <Heart className="h-5 w-5 text-indigo-600" />
            <span>3. Tôn Trọng Tính Nhân Văn</span>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed">
            Sử dụng AI với mục tiêu khích lệ, nâng đỡ, khai mở tiềm năng học sinh; không sử dụng AI để dán nhãn tiêu cực hay phán xét học trò.
          </p>
        </div>
      </div>

      {/* FAQs Section */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-3">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <HelpCircle className="h-5 w-5 text-indigo-600" />
          <h3 className="text-sm sm:text-base font-bold text-slate-900">
            Câu Hỏi Thường Gặp Của Thầy/Cô (FAQ)
          </h3>
        </div>

        <div className="divide-y divide-slate-100">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={idx} className="py-3">
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="flex w-full items-center justify-between text-left text-xs sm:text-sm font-bold text-slate-800 hover:text-indigo-600 transition-colors cursor-pointer"
                >
                  <span>{faq.q}</span>
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <p className="mt-2 text-xs text-slate-600 leading-relaxed pl-3 border-l-2 border-indigo-400 animate-fade-in">
                    {faq.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
