'use client';

import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import type { PanInfo } from 'framer-motion';
import { motion, useDragControls, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import type React from 'react';

const closeLabel: StaticTranslationString = {
  de: 'Schliessen',
  en: 'Close',
  fr: 'Fermer',
};

/** how far, or how fast, the sheet has to be pulled down before it lets go */
const CLOSE_OFFSET = 96;
const CLOSE_VELOCITY = 500;

/**
 * A sheet that slides up from the bottom, for a choice or a set of filters that belongs to the
 * page underneath: the page stays in sight, dimmed. It closes with its ✕, a tap on the dimmed
 * page, Escape, or by pulling it down at its grabber. Focus stays inside while it is open and
 * returns to what opened it.
 */
export const BottomSheet: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** a ✕ beside the title; a sheet that ends in its own "Abbrechen" can leave it out */
  showClose?: boolean;
  /** stays at the foot of the sheet while its content scrolls, e.g. the action it ends in */
  footer?: React.ReactNode;
  children: React.ReactNode;
}> = ({ open, onOpenChange, title, showClose = true, footer, children }) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const dragControls = useDragControls();
  const reduceMotion = useReducedMotion() ?? false;

  const onDragEnd = (_: unknown, info: PanInfo): void => {
    if (info.offset.y > CLOSE_OFFSET || info.velocity.y > CLOSE_VELOCITY) onOpenChange(false);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[200] bg-green-900/40" />
        <DialogPrimitive.Content
          asChild
          // the title names the sheet; it has no separate description
          aria-describedby={undefined}
        >
          <motion.div
            className="fixed inset-x-0 bottom-0 z-[201] mx-auto flex max-h-[90dvh] w-full max-w-xl flex-col rounded-t-[24px] bg-white pb-[env(safe-area-inset-bottom)] focus:outline-none"
            initial={reduceMotion ? false : { y: '100%' }}
            animate={{ y: 0 }}
            transition={{ type: 'tween', duration: reduceMotion ? 0 : 0.24, ease: 'easeOut' }}
            drag="y"
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={onDragEnd}
          >
            {/* the grabber and the title row are where a thumb pulls the sheet down */}
            <div
              className="shrink-0 touch-none"
              onPointerDown={(event) => dragControls.start(event)}
            >
              <div className="flex justify-center pt-2 pb-1">
                <span aria-hidden="true" className="bg-rail h-1 w-9 rounded-full" />
              </div>
              <div className="flex min-h-11 items-center gap-3 px-5 pt-1 pb-2">
                <DialogPrimitive.Title className="text-heading min-w-0 flex-1 font-['Montserrat'] text-[22px] leading-7 font-extrabold">
                  {title}
                </DialogPrimitive.Title>
                {showClose && (
                  <DialogPrimitive.Close
                    aria-label={closeLabel[locale]}
                    className="bg-quiet flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-green-900"
                  >
                    <X className="h-5 w-5" aria-hidden="true" />
                  </DialogPrimitive.Close>
                )}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5">
              {children}
            </div>

            {footer !== undefined && (
              <div className="border-line shrink-0 border-t px-5 py-3">{footer}</div>
            )}
          </motion.div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
