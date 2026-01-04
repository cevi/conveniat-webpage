/**
 * Simple toast utility that logs to console.
 * Error messages are shown using console.error.
 *
 * Note: For user-facing error messages, consider using the AlertDialog
 * component from @/components/ui/alert-dialog.tsx instead.
 */
export const toast = {
  /**
   * Log an error message to the console.
   * For user-facing errors, use an AlertDialog component instead.
   */
  error: (message: string, error?: unknown): void => {
    console.error('[Error]', message, error);
  },

  /**
   * Log a success message to the console.
   */
  success: (message: string): void => {
    console.log('[Success]', message);
  },

  /**
   * Log a warning message to the console.
   */
  warning: (message: string): void => {
    console.warn('[Warning]', message);
  },

  /**
   * Log an info message to the console.
   */
  info: (message: string): void => {
    console.info('[Info]', message);
  },
};
