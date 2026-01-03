export const isSafariOnAppleDevice = (): boolean => {
  // Safety check for SSR or environments without navigator
  if (typeof navigator === 'undefined') return false;

  const { userAgent, platform, maxTouchPoints } = navigator;

  // Base Safari Check: Must contain "Safari" but NOT be a masquerader.
  // We exclude Chrome (Chrome/CriOS), Firefox (FxiOS), Edge (Edg/EdgiOS), and Opera (OPR).
  const isSafari = /Safari/.test(userAgent);
  const isNotOtherBrowser = !/Chrome|CriOS|FxiOS|Edg|EdgiOS|OPR/.test(userAgent);

  // iOS (iPhone, iPod, or iPad in "Mobile" view)
  const isIosMobile = /iP(ad|hone|od)/.test(userAgent);

  // macOS (Desktop Safari)
  const isMac = platform === 'MacIntel' || /Macintosh/.test(userAgent);

  // iPadOS (Desktop View)
  // iPads running iPadOS 13+ request the desktop site by default.
  // They appear as macOS (MacIntel) but have a touch screen.
  const isIpadDesktopMode = isMac && maxTouchPoints > 1;
  return isSafari && isNotOtherBrowser && (isIosMobile || isMac || isIpadDesktopMode);
};
