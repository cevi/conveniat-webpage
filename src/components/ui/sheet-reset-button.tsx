import type React from 'react';

/**
 * The "Zurücksetzen" of a filter sheet, beside its title in `BottomSheet`'s `trailing` slot. It is
 * always there and only greyed out while nothing is set, so the sheet keeps its height and the
 * reset sits where it sits in every other filter of the app.
 */
export const SheetResetButton: React.FC<{
  label: string;
  disabled: boolean;
  onClick: () => void;
}> = ({ label, disabled, onClick }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className="focus-visible:focus-surface hover:bg-quiet flex h-11 shrink-0 cursor-pointer items-center rounded-xl px-2 text-[14px] font-semibold text-green-800 disabled:cursor-default disabled:text-green-500 disabled:hover:bg-transparent"
  >
    {label}
  </button>
);
