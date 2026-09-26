'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { LoanDialogMode } from '@/features/material/components/loan-detail-dialog';
import { format, labels } from '@/features/material/components/material-labels';
import {
  focusRing,
  MaterialButton,
  MaterialSheet,
} from '@/features/material/components/material-ui';
import { useInvalidateMaterial, type MaterialLoan } from '@/features/material/hooks/use-material';
import { loanRowActions, type LoanRowAction } from '@/features/material/utils/list-view';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import {
  AlertTriangle,
  Check,
  Eye,
  MoreHorizontal,
  PackageCheck,
  PackageOpen,
  Pencil,
  QrCode,
  type LucideIcon,
} from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { toast } from 'sonner';

/** Steps that move a loan along at the counter, and so may be a row's one button. */
const COUNTER_STEPS = new Set<LoanRowAction>(['confirm', 'issue', 'return']);

const actionIcon: Record<LoanRowAction, LucideIcon> = {
  confirm: Check,
  issue: PackageOpen,
  return: PackageCheck,
  view: Eye,
  edit: Pencil,
  incident: AlertTriangle,
  qr: QrCode,
};

const actionLabel = (action: LoanRowAction, loan: MaterialLoan): StaticTranslationString => {
  switch (action) {
    case 'confirm': {
      return labels.confirm;
    }
    case 'issue': {
      return labels.handOut;
    }
    case 'return': {
      return labels.recordReturn;
    }
    case 'view': {
      return labels.details;
    }
    case 'edit': {
      return loan.status === 'ISSUED' ? labels.extend : labels.edit;
    }
    case 'incident': {
      return labels.reportDamage;
    }
    case 'qr': {
      return labels.showQr;
    }
  }
};

/** Every action but a confirmation opens the loan's dialog at that step. */
export type OpenLoan = (loan: MaterialLoan, mode: LoanDialogMode) => void;

/**
 * Confirms a request straight from a list, without opening it. The button stays off after a
 * success until the refetch moves the row on; a second tap would only fail.
 */
const useConfirmLoan = (
  loan: MaterialLoan,
): { run: () => void; isPending: boolean; isDone: boolean } => {
  const invalidate = useInvalidateMaterial();
  const confirm = trpc.material.confirmLoan.useMutation();
  return {
    run: () =>
      confirm.mutate(
        { id: loan.id },
        {
          onSuccess: () => void invalidate(),
          onError: (error) => toast.error(error.message),
        },
      ),
    isPending: confirm.isPending,
    isDone: confirm.isSuccess,
  };
};

/** A row's actions: the counter's next step as its button, the rest in a menu. */
export const splitLoanActions = (
  loan: MaterialLoan,
  isMaterialTeam: boolean,
): { primary: LoanRowAction | undefined; rest: LoanRowAction[] } => {
  const actions = loanRowActions(loan, isMaterialTeam);
  const first = actions[0];
  if (first !== undefined && COUNTER_STEPS.has(first)) {
    return { primary: first, rest: actions.slice(1) };
  }
  return { primary: undefined, rest: actions };
};

/**
 * The one button of a loan row, when the counter has a next step for it. On a card it spans
 * the row; in a table it keeps its label, since an icon alone would not say "hand out".
 */
export const LoanPrimaryAction: React.FC<{
  loan: MaterialLoan;
  action: LoanRowAction;
  locale: Locale;
  onOpen: OpenLoan;
  className?: string;
  /** a table column is narrow: "Rücknahme" instead of "Rückgabe erfassen" */
  short?: boolean;
}> = ({ loan, action, locale, onOpen, className, short = false }) => {
  const confirm = useConfirmLoan(loan);
  const Icon = actionIcon[action];
  const label = actionLabel(action, loan)[locale];
  const shortLabel = short && action === 'return' ? labels.recordReturnShort[locale] : label;
  return (
    <MaterialButton
      className={className}
      {...(shortLabel === label ? {} : { 'aria-label': label, title: label })}
      variant={action === 'issue' ? 'secondary' : 'primary'}
      loading={action === 'confirm' && confirm.isPending}
      disabled={action === 'confirm' && confirm.isDone}
      onClick={(event) => {
        event.stopPropagation();
        if (action === 'confirm') confirm.run();
        else onOpen(loan, action === 'return' || action === 'issue' ? action : 'view');
      }}
    >
      <Icon aria-hidden />
      <span className="truncate">{shortLabel}</span>
    </MaterialButton>
  );
};

const menuTrigger = cn(
  'flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50',
  focusRing,
);

const runAction = (
  action: LoanRowAction,
  loan: MaterialLoan,
  onOpen: OpenLoan,
  confirm: () => void,
): void => {
  if (action === 'confirm') confirm();
  else onOpen(loan, action);
};

/**
 * The rest of a row's actions behind "…". A table opens a menu next to the button; a phone
 * opens a bottom sheet, whose buttons a thumb hits without aiming.
 */
export const LoanActionMenu: React.FC<{
  loan: MaterialLoan;
  actions: LoanRowAction[];
  locale: Locale;
  onOpen: OpenLoan;
  variant: 'menu' | 'sheet';
}> = ({ loan, actions, locale, onOpen, variant }) => {
  const confirm = useConfirmLoan(loan);
  const [sheetOpen, setSheetOpen] = useState(false);
  if (actions.length === 0) return <></>;
  const triggerLabel = `${labels.moreActions[locale]}: ${format(labels.loanNumber, locale, { n: loan.number })}`;

  if (variant === 'sheet') {
    return (
      <>
        <button
          type="button"
          aria-label={triggerLabel}
          aria-haspopup="dialog"
          className={menuTrigger}
          onClick={(event) => {
            event.stopPropagation();
            setSheetOpen(true);
          }}
        >
          <MoreHorizontal className="size-5" aria-hidden />
        </button>
        <MaterialSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          title={format(labels.loanNumber, locale, { n: loan.number })}
          description={`${loan.issuedQuantity ?? loan.quantity} × ${loan.item.name}`}
        >
          <div className="grid gap-2">
            {actions.map((action) => {
              const Icon = actionIcon[action];
              return (
                <MaterialButton
                  key={action}
                  variant={action === 'incident' ? 'danger' : 'secondary'}
                  className="h-12 justify-start"
                  onClick={() => {
                    setSheetOpen(false);
                    runAction(action, loan, onOpen, confirm.run);
                  }}
                >
                  <Icon aria-hidden />
                  {actionLabel(action, loan)[locale]}
                </MaterialButton>
              );
            })}
          </div>
        </MaterialSheet>
      </>
    );
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        aria-label={triggerLabel}
        className={menuTrigger}
        onClick={(event) => event.stopPropagation()}
      >
        <MoreHorizontal className="size-5" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="z-[9999] min-w-52 border-gray-200 bg-white p-1 text-gray-900 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        {actions.map((action) => {
          const Icon = actionIcon[action];
          return (
            <DropdownMenuItem
              key={action}
              className={cn(
                'min-h-11 cursor-pointer rounded-md px-3 font-medium focus:bg-gray-100',
                action === 'incident' && 'text-red-700 focus:text-red-800',
              )}
              onSelect={() => runAction(action, loan, onOpen, confirm.run)}
            >
              <Icon aria-hidden />
              {actionLabel(action, loan)[locale]}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
