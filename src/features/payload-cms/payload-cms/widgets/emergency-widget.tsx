'use client';
import { useAdminChatManagement } from '@/features/chat/hooks/use-admin-chat-management';
import { DashboardStatCard } from '@/features/payload-cms/payload-cms/widgets/dashboard-stat-card';
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
  const { code: locale } = useLocale();

  const { chats } = useAdminChatManagement({
    chatType: ChatType.EMERGENCY,
    showClosed: false,
    debouncedSearch: '',
    selectedChatId: undefined,
    locale,
  });

  const hasOpenAlerts = chats.length > 0;

  return (
    <DashboardStatCard
      title={title[locale as Locale]}
      stats={[{ value: chats.length, isAlert: hasOpenAlerts }]}
      isAlert={hasOpenAlerts}
      footer={<Link href="/admin/globals/alert-management">{actionButton[locale as Locale]}</Link>}
    />
  );
}

export default function EmergencyCounterWidget(): React.ReactElement {
  return (
    <TRPCProvider>
      <InternalEmergencyCounter />
    </TRPCProvider>
  );
}
