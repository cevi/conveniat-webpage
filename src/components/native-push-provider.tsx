'use client';

import { useNativePush } from '@/hooks/use-native-push';

export function NativePushProvider({ children }: { children: React.ReactNode }) {
  // Initialize the hook so it listens to events
  useNativePush();

  return <>{children}</>;
}
