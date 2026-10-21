// Not in `menu-link.tsx`: a value exported from a 'use client' module reaches a server
// component as a client reference, not as the string.

/** A top-level row of the main menu: 44px high, the label in the primary text colour. */
export const menuRowClassName =
  'flex min-h-11 items-center gap-3 rounded-[10px] px-3 py-2 text-[15px] font-semibold text-green-900 hover:bg-quiet';
