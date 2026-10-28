/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Share2 } from 'lucide-react';
import { SharePayload, UserAccount } from '../../types';
import { ShareDialog } from './ShareDialog';

interface ShareButtonProps {
  payload: SharePayload;
  currentUser: UserAccount;
  variant?: 'icon' | 'outline' | 'solid' | 'subtle';
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
  onShared?: () => void;
}

export const ShareButton: React.FC<ShareButtonProps> = ({
  payload,
  currentUser,
  variant = 'subtle',
  size = 'md',
  label = 'Chia sẻ',
  className = '',
  onShared
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const getVariantStyles = () => {
    switch (variant) {
      case 'icon':
        return 'p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors';
      case 'outline':
        return 'px-3 py-1.5 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-600 hover:bg-blue-50/50 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs';
      case 'solid':
        return 'px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs';
      case 'subtle':
      default:
        return 'px-3 py-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50/80 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors';
    }
  };

  return (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(true);
          if (onShared) onShared();
        }}
        className={`${getVariantStyles()} ${className} cursor-pointer`}
        title="Chia sẻ nội dung này"
      >
        <Share2 className={size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'} />
        {variant !== 'icon' && <span>{label}</span>}
      </button>

      <ShareDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        payload={payload}
        currentUser={currentUser}
      />
    </>
  );
};
