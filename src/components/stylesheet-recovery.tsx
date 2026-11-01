import { STYLESHEET_RECOVERY_SCRIPT } from '@/utils/stylesheet-recovery';
import type React from 'react';

/**
 * Loads a stylesheet again that failed because the connection dropped, see
 * `@/utils/stylesheet-recovery`. Goes first into the `<head>` of every root layout that renders
 * the app's CSS.
 */
export const StylesheetRecovery: React.FC = () => (
  <script dangerouslySetInnerHTML={{ __html: STYLESHEET_RECOVERY_SCRIPT }} />
);
