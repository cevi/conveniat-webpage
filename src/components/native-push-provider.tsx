'use client';

import { useNativePush } from '@/hooks/use-native-push';
import type React from 'react';

export function NativePushProvider({ children }: { children: React.ReactNode }): React.ReactNode {
  // Initialize the hook so it listens to events
  useNativePush();

  return <>{children}</>;
}
