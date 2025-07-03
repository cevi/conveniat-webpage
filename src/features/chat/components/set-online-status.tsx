'use client';

import { useOnlinePing } from '@/features/chat/hooks/use-online-ping';
import React from 'react';

/**
 * SetOnlineStatus component is responsible for pinging the server to keep the user's online status updated.
 * @constructor
 */
export const SetOnlineStatus: React.FC = () => {
  useOnlinePing();
  return <></>;
};
