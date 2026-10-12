'use client';

import { useCurrentLocale } from '@/hooks/use-current-locale';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import type { PanInfo } from 'framer-motion';
import { motion, useDragControls, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import type React from 'react';
import { useRef } from 'react';

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
  /** before the title, e.g. the avatar of the chat a sheet of actions is about */
  leading?: React.ReactNode;
  /** a smaller line under the title, e.g. "Gruppe · stummgeschaltet" */
  description?: string;
  /**
   * names the sheet for screen readers only, where its content says what it is about, e.g. the
   * message a sheet of message actions shows at its top
   */
  hideTitle?: boolean;
  children: React.ReactNode;
}> = ({
  open,
  onOpenChange,
  title,
  showClose = true,
  footer,
  leading,
  description,
  hideTitle = false,
  children,
}) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const dragControls = useDragControls();
  const reduceMotion = useReducedMotion() ?? false;
  // Radix hands focus back to a Dialog.Trigger only, and these sheets open from a long press, a
  // row's button or a key, so the sheet remembers what had focus itself
  const openerReference = useRef<HTMLElement | undefined>(undefined);

  const onDragEnd = (_: unknown, info: PanInfo): void => {
    if (info.offset.y > CLOSE_OFFSET || info.velocity.y > CLOSE_VELOCITY) onOpenChange(false);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[200] bg-green-900/40" />
        <DialogPrimitive.Content
          asChild
          // the title names the sheet; a description is read with it where there is one
          {...(description === undefined ? { 'aria-describedby': undefined } : {})}
          onOpenAutoFocus={() => {
            const opener = document.activeElement;
            openerReference.current =
              opener instanceof HTMLElement && opener !== document.body ? opener : undefined;
          }}
          onCloseAutoFocus={(event) => {
            const opener = openerReference.current;
            if (opener?.isConnected !== true) return;
            event.preventDefault();
            opener.focus({ preventScroll: true });
          }}
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
              {hideTitle ? (
                <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
              ) : (
                <div className="flex min-h-11 items-center gap-3 px-5 pt-1 pb-2">
                  {leading}
                  <div className="min-w-0 flex-1">
                    <DialogPrimitive.Title
                      className={
                        description === undefined && leading === undefined
                          ? 'font-heading text-heading text-[22px] leading-7 font-extrabold'
                          : 'font-heading text-heading truncate text-[17px] leading-6 font-bold'
                      }
                    >
                      {title}
                    </DialogPrimitive.Title>
                    {description !== undefined && (
                      <DialogPrimitive.Description className="truncate text-[13px] text-green-700">
                        {description}
                      </DialogPrimitive.Description>
                    )}
                  </div>
                  {showClose && (
                    <DialogPrimitive.Close
                      aria-label={closeLabel[locale]}
                      className="bg-quiet hover:bg-chip flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-green-900 transition-colors"
                    >
                      <X className="h-5 w-5" aria-hidden="true" />
                    </DialogPrimitive.Close>
                  )}
                </div>
              )}
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
