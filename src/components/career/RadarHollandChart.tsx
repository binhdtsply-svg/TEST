/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { RIASEC_INFO } from '../../data/onetQuestions';
import { RIASECCategory, CareerAssessment } from '../../types';
import { TrendingUp, Award, Layers } from 'lucide-react';

interface RadarHollandChartProps {
  currentAssessment: CareerAssessment | null;
  allAssessments?: CareerAssessment[];
  className?: string;
}

export const RadarHollandChart: React.FC<RadarHollandChartProps> = ({
  currentAssessment,
  allAssessments = [],
  className = ''
}) => {
  const categories: RIASECCategory[] = ['R', 'I', 'A', 'S', 'E', 'C'];
  const maxScore = 25;
  const size = 280;
  const center = size / 2;
  const radius = 100;

  // Calculate polygon points for a given set of RIASEC scores
  const getCoordinates = (index: number, score: number) => {
    const angle = (Math.PI * 2 / 6) * index - Math.PI / 2;
    const normalizedScore = Math.max(0, Math.min(score, maxScore));
    const r = (normalizedScore / maxScore) * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y };
  };

  // Get current assessment polygon points
  const currentPoints = useMemo(() => {
    if (!currentAssessment) return '';
    return categories
      .map((cat, idx) => {
        const score = currentAssessment.riasec?.[cat] || 0;
        const { x, y } = getCoordinates(idx, score);
        return `${x},${y}`;
      })
      .join(' ');
  }, [currentAssessment]);

  // Previous assessment for comparison (if available)
  const previousAssessment = useMemo(() => {
    if (allAssessments.length < 2) return null;
    return allAssessments.find(a => a.id !== currentAssessment?.id && a.status === 'completed') || null;
  }, [allAssessments, currentAssessment]);

  const previousPoints = useMemo(() => {
    if (!previousAssessment) return '';
    return categories
      .map((cat, idx) => {
        const score = previousAssessment.riasec?.[cat] || 0;
        const { x, y } = getCoordinates(idx, score);
        return `${x},${y}`;
      })
      .join(' ');
  }, [previousAssessment]);

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-5 space-y-4 w-full min-w-0 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
              Biểu đồ Radar Holland (RIASEC) 6 Chiều
            </h4>
            <p className="text-[11px] text-slate-500">
              Trực quan hóa độ lệch và ưu thế giữa 6 nhóm sở thích nghề nghiệp
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px] font-bold">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-amber-500 shadow-2xs" />
            <span className="text-slate-700">Lần hiện tại ({currentAssessment?.primaryCode || 'N/A'})</span>
          </div>
          {previousAssessment && (
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-indigo-400 opacity-60" />
              <span className="text-slate-500">Lần trước ({previousAssessment.primaryCode})</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-center min-w-0">
        {/* SVG Radar */}
        <div className="xl:col-span-6 flex justify-center py-2 overflow-x-auto max-w-full">
          <div className="relative">
            <svg width={size} height={size} className="overflow-visible">
              {/* Concentric Web Circles / Polygons */}
              {[0.2, 0.4, 0.6, 0.8, 1.0].map((level, i) => {
                const polyPoints = categories
                  .map((_, idx) => {
                    const angle = (Math.PI * 2 / 6) * idx - Math.PI / 2;
                    const r = radius * level;
                    const x = center + r * Math.cos(angle);
                    const y = center + r * Math.sin(angle);
                    return `${x},${y}`;
                  })
                  .join(' ');

                return (
                  <g key={i}>
                    <polygon
                      points={polyPoints}
                      fill="none"
                      stroke="#e2e8f0"
                      strokeWidth={i === 4 ? '1.5' : '1'}
                      strokeDasharray={i < 4 ? '2 2' : undefined}
                    />
                    <text
                      x={center + 4}
                      y={center - radius * level + 10}
                      fontSize="9"
                      fill="#94a3b8"
                      fontWeight="bold"
                    >
                      {Math.round(maxScore * level)}
                    </text>
                  </g>
                );
              })}

              {/* Axis lines */}
              {categories.map((_, idx) => {
                const angle = (Math.PI * 2 / 6) * idx - Math.PI / 2;
                const x = center + radius * Math.cos(angle);
                const y = center + radius * Math.sin(angle);
                return (
                  <line
                    key={idx}
                    x1={center}
                    y1={center}
                    x2={x}
                    y2={y}
                    stroke="#cbd5e1"
                    strokeWidth="1"
                  />
                );
              })}

              {/* Previous Attempt Polygon (if available) */}
              {previousPoints && (
                <polygon
                  points={previousPoints}
                  fill="rgba(99, 102, 241, 0.12)"
                  stroke="#818cf8"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
              )}

              {/* Current Assessment Polygon */}
              {currentPoints && (
                <polygon
                  points={currentPoints}
                  fill="rgba(245, 158, 11, 0.28)"
                  stroke="#d97706"
                  strokeWidth="2.5"
                  className="transition-all duration-500"
                />
              )}

              {/* Vertex Nodes & Category Labels */}
              {categories.map((cat, idx) => {
                const angle = (Math.PI * 2 / 6) * idx - Math.PI / 2;
                const score = currentAssessment?.riasec?.[cat] || 0;
                const { x, y } = getCoordinates(idx, score);
                const info = RIASEC_INFO[cat];

                // Label positioning slightly outside radius
                const labelRadius = radius + 26;
                const lx = center + labelRadius * Math.cos(angle);
                const ly = center + labelRadius * Math.sin(angle);

                const isTop = currentAssessment?.topInterestCodes?.includes(cat);

                return (
                  <g key={cat}>
                    {/* Node on current polygon */}
                    <circle
                      cx={x}
                      cy={y}
                      r={isTop ? 5 : 4}
                      fill={info.color}
                      stroke="#ffffff"
                      strokeWidth="2"
                    />

                    {/* Outer Category Tag */}
                    <text
                      x={lx}
                      y={ly}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="cursor-default select-none"
                    >
                      <tspan
                        x={lx}
                        dy="-0.3em"
                        fontSize="12"
                        fontWeight="900"
                        fill={isTop ? '#b45309' : '#334155'}
                      >
                        {cat} ({score})
                      </tspan>
                      <tspan
                        x={lx}
                        dy="1.2em"
                        fontSize="9.5"
                        fontWeight="700"
                        fill="#64748b"
                      >
                        {info.name}
                      </tspan>
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Breakdown details */}
        <div className="xl:col-span-6 space-y-3 min-w-0">
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
              <Award className="h-4 w-4 text-amber-600" />
              <span>Nhóm dẫn đầu: {currentAssessment?.primaryCode || 'Chưa xác định'}</span>
            </div>
            <p className="text-[11px] text-amber-900/80 leading-relaxed">
              {currentAssessment?.codeMeaning || 'Hoàn thành bài khảo sát để hiển thị phân tích nhóm tính cách.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {categories.map(cat => {
              const info = RIASEC_INFO[cat];
              const score = currentAssessment?.riasec?.[cat] || 0;
              const prevScore = previousAssessment?.riasec?.[cat];
              const diff = prevScore !== undefined ? score - prevScore : 0;
              const isTop = currentAssessment?.topInterestCodes?.includes(cat);

              return (
                <div
                  key={cat}
                  className={`rounded-xl border p-2.5 bg-white flex items-center justify-between text-xs ${
                    isTop ? 'border-amber-300 bg-amber-50/30' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="flex h-5 w-5 items-center justify-center rounded-md text-[11px] font-black text-white"
                      style={{ backgroundColor: info.color }}
                    >
                      {cat}
                    </span>
                    <span className="font-bold text-slate-800">{info.name}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="font-black text-slate-900">{score}/25</span>
                    {prevScore !== undefined && diff !== 0 && (
                      <span className={`text-[10px] font-bold ${diff > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        ({diff > 0 ? `+${diff}` : diff})
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {allAssessments.length > 1 && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-[11px] text-slate-600 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-slate-500 shrink-0" />
              <span>
                Học sinh đã thực hiện <strong>{allAssessments.length} lần khảo sát</strong>. Đường nét đứt thể hiện kết quả lần trước để theo dõi sự dịch chuyển sở thích.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
