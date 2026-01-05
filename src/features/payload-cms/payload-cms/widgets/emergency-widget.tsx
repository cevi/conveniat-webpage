'use client';
import { useAdminChatManagement } from '@/features/chat/hooks/use-admin-chat-management';
import { ChatType } from '@/lib/prisma';
import { TRPCProvider } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { useLocale } from '@payloadcms/ui';
import Link from 'next/link';

const title: StaticTranslationString = {
  en: 'Emergency Alerts',
  de: 'Notfall Alarme',
  fr: "Alertes d'urgence",
};

const actionButton: StaticTranslationString = {
  en: 'View',
  de: 'Ansehen',
  fr: 'Voir',
};

function InternalEmergencyCounter(): React.ReactElement {
  const { chats } = useAdminChatManagement({
    chatType: ChatType.EMERGENCY,
    showClosed: false,
    debouncedSearch: '',
    selectedChatId: undefined,
  });

  const { code: locale } = useLocale();

  return (
    <div className={`card ${chats.length > 0 ? 'bg-red-300' : ''}`}>
      <h3>{title[locale as Locale]}</h3>
      <p className="font-bold">{chats.length}</p>
      <Link href="/admin/globals/alert-management">{actionButton[locale as Locale]}</Link>
    </div>
  );
}

export default function EmergencyCounterWidget(): React.ReactElement {
  return (
    <TRPCProvider>
      <InternalEmergencyCounter />
    </TRPCProvider>
  );
}
