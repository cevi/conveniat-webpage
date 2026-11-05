'use client';

import type { ScanNotice } from '@/features/wristbands/hooks/use-band-scanner';
import { cn } from '@/utils/tailwindcss-override';
import { CircleAlert, RotateCcw } from 'lucide-react';
import type React from 'react';

/** What went wrong with the last band, right where the AVP looks. */
export const ScanNoticeBox: React.FC<{ notice: ScanNotice }> = ({ notice }) => {
  const refused = notice.kind === 'refused';
  const Icon = refused ? CircleAlert : RotateCcw;
  return (
    <div
      role={refused ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-3 rounded-xl p-3',
        refused ? 'bg-danger-soft border-danger-line border' : 'bg-quiet',
      )}
    >
      <Icon
        className={cn('mt-0.5 size-5 shrink-0', refused ? 'text-danger' : 'text-green-700')}
        aria-hidden
      />
      <div className="min-w-0">
        <p
          className={cn(
            'text-[15px] leading-snug font-semibold',
            refused ? 'text-danger-text' : 'text-green-900',
          )}
        >
          {notice.title}
        </p>
        {notice.description !== '' && (
          <p className="mt-0.5 text-[13px] leading-normal text-green-700">{notice.description}</p>
        )}
      </div>
    </div>
  );
};
