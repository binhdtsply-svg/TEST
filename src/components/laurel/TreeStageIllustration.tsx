/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { LaurelStage } from '../../types';

interface TreeStageIllustrationProps {
  stage: LaurelStage;
  className?: string;
}

export const TreeStageIllustration: React.FC<TreeStageIllustrationProps> = ({ stage, className = 'h-24 w-24' }) => {
  switch (stage) {
    case 'seed':
      return (
        <div className={`flex flex-col items-center justify-center rounded-2xl bg-gradient-to-b from-amber-50 to-amber-100/70 border border-amber-200 p-2 shadow-2xs ${className}`}>
          <svg className="w-12 h-12 text-amber-700" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Mound of soil */}
            <path d="M12 48C18 40 46 40 52 48C54 50 10 50 12 48Z" fill="#78350F" opacity="0.4" />
            <path d="M16 52C22 46 42 46 48 52" stroke="#92400E" strokeWidth="2" strokeLinecap="round" />
            {/* Seed */}
            <ellipse cx="32" cy="40" rx="9" ry="12" transform="rotate(-15 32 40)" fill="#B45309" stroke="#78350F" strokeWidth="2" />
            <path d="M30 33C33 36 34 42 32 46" stroke="#FDE68A" strokeWidth="1.5" strokeLinecap="round" />
            {/* Tiny sprout hint */}
            <path d="M34 30C36 26 39 25 41 26" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="text-[11px] font-black text-amber-900 mt-1">1. Hạt giống</span>
        </div>
      );
    case 'sprout':
      return (
        <div className={`flex flex-col items-center justify-center rounded-2xl bg-gradient-to-b from-emerald-50 to-emerald-100/60 border border-emerald-200 p-2 shadow-2xs ${className}`}>
          <svg className="w-12 h-12" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Soil */}
            <path d="M10 50C18 44 46 44 54 50" stroke="#059669" strokeWidth="3" strokeLinecap="round" />
            {/* Sprout Stem */}
            <path d="M32 48V32C32 26 30 22 30 20" stroke="#10B981" strokeWidth="3" strokeLinecap="round" />
            {/* Left Leaf */}
            <path d="M31 28C24 26 20 18 25 14C30 18 31 24 31 28Z" fill="#34D399" stroke="#059669" strokeWidth="1.5" />
            {/* Right Leaf */}
            <path d="M31 24C38 22 42 14 37 10C32 14 31 20 31 24Z" fill="#10B981" stroke="#047857" strokeWidth="1.5" />
            {/* Dew drop */}
            <circle cx="27" cy="18" r="1.5" fill="#E0F2FE" />
          </svg>
          <span className="text-[11px] font-black text-emerald-900 mt-1">2. Nảy mầm</span>
        </div>
      );
    case 'sapling':
      return (
        <div className={`flex flex-col items-center justify-center rounded-2xl bg-gradient-to-b from-emerald-50 to-teal-100/60 border border-emerald-300 p-2 shadow-2xs ${className}`}>
          <svg className="w-12 h-12" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Stem / Trunk */}
            <path d="M32 52V24" stroke="#78350F" strokeWidth="3" strokeLinecap="round" />
            {/* Branches and leaves */}
            <path d="M32 42C24 38 20 30 26 26C31 30 32 37 32 42Z" fill="#34D399" stroke="#059669" strokeWidth="1.5" />
            <path d="M32 36C40 32 44 24 38 20C33 24 32 31 32 36Z" fill="#10B981" stroke="#047857" strokeWidth="1.5" />
            <path d="M32 26C26 20 25 12 30 8C34 12 33 21 32 26Z" fill="#6EE7B7" stroke="#059669" strokeWidth="1.5" />
            <path d="M32 22C38 16 39 8 34 4C30 8 31 17 32 22Z" fill="#10B981" stroke="#047857" strokeWidth="1.5" />
          </svg>
          <span className="text-[11px] font-black text-teal-900 mt-1">3. Cây con</span>
        </div>
      );
    case 'tree':
      return (
        <div className={`flex flex-col items-center justify-center rounded-2xl bg-gradient-to-b from-emerald-100 to-emerald-200/80 border border-emerald-400 p-2 shadow-2xs ${className}`}>
          <svg className="w-12 h-12" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Trunk */}
            <path d="M30 54V38C30 35 28 32 26 30" stroke="#78350F" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M34 54V36C34 33 36 30 38 28" stroke="#78350F" strokeWidth="3" strokeLinecap="round" />
            {/* Foliage / Laurel Canopy */}
            <circle cx="32" cy="24" r="16" fill="#10B981" />
            <circle cx="23" cy="26" r="11" fill="#059669" />
            <circle cx="41" cy="26" r="11" fill="#34D399" />
            <circle cx="32" cy="15" r="11" fill="#6EE7B7" />
            {/* Texture highlights */}
            <path d="M28 20C30 18 34 18 36 20" stroke="#ECFDF5" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M24 28C26 26 29 27 30 29" stroke="#064E3B" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span className="text-[11px] font-black text-emerald-950 mt-1">4. Cây lớn</span>
        </div>
      );
    case 'bloom':
      return (
        <div className={`flex flex-col items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-100 via-emerald-100 to-yellow-200 border-2 border-amber-400 p-2 shadow-md ring-2 ring-amber-300/60 animate-pulse ${className}`}>
          <svg className="w-12 h-12" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Glowing Aura */}
            <circle cx="32" cy="24" r="18" fill="#FEF08A" opacity="0.6" />
            {/* Trunk */}
            <path d="M32 54V36" stroke="#78350F" strokeWidth="3.5" strokeLinecap="round" />
            {/* Lush Canopy */}
            <circle cx="32" cy="24" r="14" fill="#10B981" />
            <circle cx="23" cy="26" r="10" fill="#059669" />
            <circle cx="41" cy="26" r="10" fill="#34D399" />
            {/* Golden Laurel Blossoms */}
            <circle cx="24" cy="22" r="3.5" fill="#FBBF24" stroke="#D97706" strokeWidth="1" />
            <circle cx="40" cy="20" r="3.5" fill="#FBBF24" stroke="#D97706" strokeWidth="1" />
            <circle cx="32" cy="14" r="4" fill="#FDE047" stroke="#D97706" strokeWidth="1.2" />
            <circle cx="32" cy="28" r="3" fill="#FBBF24" stroke="#D97706" strokeWidth="1" />
            {/* Sparkles */}
            <path d="M15 12L17 15L20 15L17.5 17L19 20L16 18L13 20L14.5 17L12 15L15 15Z" fill="#F59E0B" />
            <path d="M47 8L48 10L50 10L48.5 11.5L49.5 13.5L47.5 12L45.5 13.5L46.5 11.5L45 10L47 10Z" fill="#F59E0B" />
          </svg>
          <span className="text-[11px] font-black text-amber-950 mt-1">5. Trổ hoa rực rỡ 🌼</span>
        </div>
      );
    default:
      return null;
  }
};
