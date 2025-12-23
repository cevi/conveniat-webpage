export const toast = {
  error: (message: string, error?: unknown): void => {
    console.error(message, error);
    // Fallback since no toast library is installed
    // In a real app, replace this with sonner or react-hot-toast
    // alert(message);
  },
  success: (message: string): void => {
    console.log('Success:', message);
  },
};
