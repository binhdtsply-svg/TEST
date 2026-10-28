/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

const COMMON_ICONS = [
  '📢', '📚', '📝', '📅', '🎯', 
  '🏆', '🌱', '❤️', '👏', '✨', 
  '🎉', '📌', '💡', '🤝', '🎂',
  '🌳', '🚀', '🔥', '⭐', '🔔'
];

interface IconPickerProps {
  selectedIcon: string;
  onSelect: (icon: string) => void;
  onClose?: () => void;
}

export const IconPicker: React.FC<IconPickerProps> = ({ selectedIcon, onSelect, onClose }) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
      <div className="mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Chọn biểu tượng</div>
      <div className="grid grid-cols-5 gap-2">
        {COMMON_ICONS.map((icon) => (
          <button
            key={icon}
            type="button"
            onClick={() => {
              onSelect(icon);
              if (onClose) onClose();
            }}
            className={`flex h-10 w-10 items-center justify-center rounded-lg text-xl transition-transform hover:scale-110 hover:bg-slate-100 ${
              selectedIcon === icon ? 'bg-blue-50 border border-blue-400' : 'bg-slate-50'
            }`}
          >
            {icon}
          </button>
        ))}
      </div>
    </div>
  );
};
