/** Smooth scrolling, unless the user asked their device for less motion. */
export const scrollBehavior = (): ScrollBehavior =>
  globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
