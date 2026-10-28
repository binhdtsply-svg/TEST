import React from 'react';

interface EducationIllustrationProps {
  className?: string;
}

export const EducationIllustration: React.FC<EducationIllustrationProps> = ({ className = '' }) => {
  return (
    <div className={`w-full overflow-hidden rounded-3xl bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 p-5 text-white shadow-lg border border-indigo-800/40 relative select-none ${className}`}>
      {/* Soft Glow Circles */}
      <div className="absolute -top-12 -left-12 w-48 h-48 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />

      {/* SVG Educational & Digital Classroom Scene */}
      <svg
        viewBox="0 0 540 260"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto max-h-[220px] sm:max-h-[260px] mx-auto drop-shadow-md"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="boardGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
          <linearGradient id="screenAccent" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
          <linearGradient id="teacherGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
          <linearGradient id="deskGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
          <linearGradient id="cardGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.04" />
          </linearGradient>
        </defs>

        {/* Background Grid Floor & Classroom Perspective */}
        <path d="M 0 240 L 540 240" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />
        <path d="M 40 240 L 80 180" stroke="#334155" strokeWidth="0.75" strokeOpacity="0.5" />
        <path d="M 500 240 L 460 180" stroke="#334155" strokeWidth="0.75" strokeOpacity="0.5" />

        {/* Central Smart Interactive Board */}
        <rect x="130" y="24" width="280" height="150" rx="14" fill="url(#boardGrad)" stroke="#475569" strokeWidth="2" />
        <rect x="140" y="34" width="260" height="130" rx="10" fill="#090d16" />
        
        {/* Smart Board Header Bar */}
        <rect x="140" y="34" width="260" height="24" rx="10" fill="#1e293b" />
        <circle cx="152" cy="46" r="3.5" fill="#ef4444" />
        <circle cx="163" cy="46" r="3.5" fill="#f59e0b" />
        <circle cx="174" cy="46" r="3.5" fill="#10b981" />
        <text x="195" y="49" fill="#94a3b8" fontSize="9" fontWeight="600" fontFamily="sans-serif">
          SỔ CHỦ NHIỆM SỐ • LỚP 12A1
        </text>
        <rect x="345" y="40" width="45" height="12" rx="6" fill="#2563eb" />
        <text x="353" y="49" fill="#ffffff" fontSize="7.5" fontWeight="bold" fontFamily="sans-serif">
          TT22 / 2018
        </text>

        {/* Dashboard Panels on Smart Board */}
        {/* Panel 1: Sĩ số & Điểm danh */}
        <rect x="150" y="66" width="72" height="42" rx="6" fill="url(#cardGrad)" stroke="#38bdf8" strokeWidth="0.75" strokeOpacity="0.5" />
        <text x="156" y="77" fill="#38bdf8" fontSize="7.5" fontWeight="bold" fontFamily="sans-serif">SĨ SỐ & NỀ NẾP</text>
        <text x="156" y="93" fill="#ffffff" fontSize="13" fontWeight="900" fontFamily="sans-serif">42 / 42</text>
        <text x="156" y="103" fill="#10b981" fontSize="7" fontWeight="bold" fontFamily="sans-serif">✓ 100% Hiện diện</text>

        {/* Panel 2: Biểu đồ Tiến độ Khảo sát */}
        <rect x="230" y="66" width="80" height="42" rx="6" fill="url(#cardGrad)" stroke="#818cf8" strokeWidth="0.75" strokeOpacity="0.5" />
        <text x="236" y="77" fill="#a5b4fc" fontSize="7.5" fontWeight="bold" fontFamily="sans-serif">KHẢO SÁT SỐ</text>
        {/* Mini Bar Chart */}
        <rect x="236" y="92" width="8" height="12" rx="2" fill="#38bdf8" />
        <rect x="248" y="86" width="8" height="18" rx="2" fill="#60a5fa" />
        <rect x="260" y="82" width="8" height="22" rx="2" fill="#818cf8" />
        <rect x="272" y="80" width="8" height="24" rx="2" fill="#34d399" />
        <text x="286" y="94" fill="#34d399" fontSize="8" fontWeight="bold" fontFamily="sans-serif">96%</text>

        {/* Panel 3: Cố vấn & Học tập */}
        <rect x="318" y="66" width="72" height="42" rx="6" fill="url(#cardGrad)" stroke="#f472b6" strokeWidth="0.75" strokeOpacity="0.5" />
        <text x="324" y="77" fill="#f472b6" fontSize="7.5" fontWeight="bold" fontFamily="sans-serif">CỐ VẤN HỌC TẬP</text>
        <text x="324" y="91" fill="#ffffff" fontSize="11" fontWeight="bold" fontFamily="sans-serif">Khá - Giỏi</text>
        <text x="324" y="103" fill="#fbbf24" fontSize="7" fontWeight="bold" fontFamily="sans-serif">★ 88.5% Đạt chuẩn</text>

        {/* Smart Board Bottom Metric Strip */}
        <rect x="150" y="116" width="240" height="38" rx="6" fill="#131d31" stroke="#334155" strokeWidth="0.5" />
        {/* Progress Line */}
        <line x1="160" y1="135" x2="380" y2="135" stroke="#334155" strokeWidth="4" strokeLinecap="round" />
        <line x1="160" y1="135" x2="330" y2="135" stroke="url(#screenAccent)" strokeWidth="4" strokeLinecap="round" />
        <circle cx="330" cy="135" r="4.5" fill="#34d399" stroke="#ffffff" strokeWidth="1.5" />
        <text x="160" y="126" fill="#94a3b8" fontSize="7.5" fontFamily="sans-serif">Kế hoạch Giáo dục Tuần 24 • Đã hoàn thành 85%</text>

        {/* Stand for Smart Board */}
        <rect x="264" y="174" width="12" height="44" fill="#334155" />
        <path d="M 235 218 L 305 218 L 295 214 L 245 214 Z" fill="#475569" />

        {/* TEACHER CHARACTER (Left) */}
        {/* Body & Coat */}
        <ellipse cx="92" cy="132" rx="14" ry="15" fill="#fbcfe8" /> {/* Head */}
        <path d="M 82 124 C 84 116, 100 116, 102 124 C 104 130, 102 135, 92 135 C 82 135, 80 130, 82 124 Z" fill="#1e293b" /> {/* Hair */}
        <path d="M 76 148 C 76 142, 108 142, 108 148 L 112 215 L 72 215 Z" fill="url(#teacherGrad)" /> {/* Suit */}
        <polygon points="92,150 86,168 98,168" fill="#ffffff" /> {/* Collar */}
        <polygon points="90,166 94,166 93,184 91,184" fill="#f59e0b" /> {/* Tie */}
        {/* Teacher Arm & Tablet */}
        <path d="M 104 156 L 126 170 L 120 180 L 98 168 Z" fill="#2563eb" />
        <rect x="122" y="160" width="22" height="30" rx="3" transform="rotate(15 122 160)" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.2" />
        <rect x="125" y="164" width="16" height="20" rx="1.5" transform="rotate(15 125 164)" fill="#1e293b" />
        <line x1="128" y1="168" x2="136" y2="170" stroke="#38bdf8" strokeWidth="1" />
        <line x1="129" y1="173" x2="138" y2="175" stroke="#34d399" strokeWidth="1" />

        {/* STUDENT DESK & STUDENTS (Right) */}
        {/* Desk */}
        <rect x="420" y="180" width="85" height="10" rx="3" fill="url(#deskGrad)" stroke="#475569" strokeWidth="1" />
        <rect x="426" y="190" width="6" height="32" fill="#334155" />
        <rect x="492" y="190" width="6" height="32" fill="#334155" />
        {/* Laptop on Student Desk */}
        <polygon points="445,180 475,180 478,170 448,170" fill="#64748b" />
        <rect x="448" y="156" width="28" height="16" rx="2" fill="#1e293b" stroke="#38bdf8" strokeWidth="1" />
        <rect x="450" y="158" width="24" height="12" fill="#0284c7" />

        {/* Student 1 */}
        <circle cx="438" cy="142" r="11" fill="#fde68a" />
        <path d="M 428 138 C 428 130, 448 130, 448 138 C 448 143, 444 146, 438 146 C 432 146, 428 143, 428 138 Z" fill="#334155" />
        <path d="M 426 154 C 426 150, 450 150, 450 154 L 452 195 L 424 195 Z" fill="#10b981" />

        {/* Student 2 */}
        <circle cx="490" cy="144" r="11" fill="#fed7aa" />
        <path d="M 480 140 C 480 132, 500 132, 500 140 C 500 145, 496 148, 490 148 C 484 148, 480 145, 480 140 Z" fill="#475569" />
        <path d="M 478 156 C 478 152, 502 152, 502 156 L 504 195 L 476 195 Z" fill="#6366f1" />

        {/* FLOATING EDUCATIONAL BADGES */}
        {/* Badge 1: Graduation / Cap (Top Left) */}
        <g transform="translate(48, 40)" className="animate-pulse">
          <circle cx="16" cy="16" r="16" fill="#1e293b" stroke="#38bdf8" strokeWidth="1" />
          <path d="M 8 16 L 16 11 L 24 16 L 16 20 Z" fill="#38bdf8" />
          <path d="M 11 18 L 11 22 C 11 23.5, 21 23.5, 21 22 L 21 18" stroke="#38bdf8" strokeWidth="1" fill="none" />
          <line x1="24" y1="16" x2="24" y2="23" stroke="#f59e0b" strokeWidth="1.2" />
        </g>

        {/* Badge 2: AI Assistant & Analytics (Top Right) */}
        <g transform="translate(450, 36)">
          <circle cx="16" cy="16" r="16" fill="#1e293b" stroke="#a855f7" strokeWidth="1" />
          <path d="M 16 9 L 18 13 L 22 14 L 19 17 L 20 21 L 16 19 L 12 21 L 13 17 L 10 14 L 14 13 Z" fill="#c084fc" />
        </g>

        {/* Badge 3: Verified TT22 Shield (Bottom Left) */}
        <g transform="translate(30, 160)">
          <circle cx="14" cy="14" r="14" fill="#0f172a" stroke="#10b981" strokeWidth="1" />
          <path d="M 14 7 L 20 10 L 20 15 C 20 19, 14 21, 14 21 C 14 21, 8 19, 8 15 L 8 10 Z" fill="#065f46" stroke="#34d399" strokeWidth="0.8" />
          <path d="M 11 14 L 13 16 L 17 12" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>

      {/* Modern Caption Overlay */}
      <div className="mt-3 flex items-center justify-between border-t border-indigo-800/40 pt-3 text-[11px] text-slate-300">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="font-semibold text-white">Số Hóa Toàn Diện Lớp Chủ Nhiệm</span>
        </div>
        <span className="text-slate-400">Chuẩn Thông tư 22/2021 & 2018</span>
      </div>
    </div>
  );
};
