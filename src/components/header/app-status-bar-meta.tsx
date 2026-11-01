import type React from 'react';

/**
 * Tells the native app that the page leaves room for the status bar itself, with
 * `--status-bar-height` from globals.scss, so the app lets it draw under the status bar. A page
 * without it, like an older deployment or the offline page, stays padded below the status bar.
 */
export const AppStatusBarMeta: React.FC = () => <meta name="app-status-bar" content="overlay" />;
