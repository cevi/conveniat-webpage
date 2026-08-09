'use client';
import { GenericChatManagementView } from '@/features/payload-cms/payload-cms/views/generic-chat-management-view';
import { ChatType } from '@/lib/prisma/client';
import { useLocale } from '@payloadcms/ui';
import React from 'react';

export const AlertManagementView: React.FC = () => {
  const { code: locale } = useLocale();
  let title = 'Emergency Alerts';
  if (locale === 'de') {
    title = 'Notfall Alarme';
  } else if (locale === 'fr') {
    title = "Alertes d'urgence";
  }

  return <GenericChatManagementView chatType={ChatType.EMERGENCY} title={title} />;
};

export default AlertManagementView;
