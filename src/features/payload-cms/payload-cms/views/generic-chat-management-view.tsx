'use client';

import { ChatManagementHeader } from '@/features/chat/components/admin/chat-management-header';
import { ChatManagementInput } from '@/features/chat/components/admin/chat-management-input';
import { ChatManagementMessages } from '@/features/chat/components/admin/chat-management-messages';
import { ChatManagementSidebar } from '@/features/chat/components/admin/chat-management-sidebar';
import { ChatIdProvider } from '@/features/chat/context/chat-id-context';
import { useAdminChatManagement } from '@/features/chat/hooks/use-admin-chat-management';
import { LocationMap } from '@/features/map/components/location-map';
import { ConfirmationModal } from '@/features/payload-cms/payload-cms/components/multi-lang-publishing/confirmation-modal';
import type { Config } from '@/features/payload-cms/payload-types';
import { ChatStatus } from '@/lib/chat-shared';
import { ChatType } from '@/lib/prisma/client';
import { TRPCProvider } from '@/trpc/client';
import { useLocale } from '@payloadcms/ui';
import React, { useEffect, useState } from 'react';

interface LocationPayload {
  location?: {
    latitude?: number;
    longitude?: number;
  };
  latitude?: number;
  longitude?: number;
}

interface GenericChatManagementViewProperties {
  chatType: ChatType;
  title: string;
}

const GenericChatManagementContent: React.FC<GenericChatManagementViewProperties> = ({
  chatType,
  title,
}) => {
  const { code: locale } = useLocale() as { code: Config['locale'] };
  const [selectedChatId, setSelectedChatId] = useState<string | undefined>(() => {
    if (typeof globalThis !== 'undefined') {
      const params = new URLSearchParams(globalThis.location.search);
      return params.get('selectedChatId') || undefined;
    }
    return;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showClosed, setShowClosed] = useState(false);
  const [isMapMaximized, setIsMapMaximized] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);

  // Sync to URL
  useEffect((): void => {
    if (typeof globalThis !== 'undefined') {
      const url = new URL(globalThis.location.href);
      if (selectedChatId) {
        url.searchParams.set('selectedChatId', selectedChatId);
      } else {
        url.searchParams.delete('selectedChatId');
      }
      globalThis.history.pushState({}, '', url.toString());
    }
  }, [selectedChatId]);

  // Debounce search
  useEffect((): (() => void) => {
    const timer = setTimeout((): void => setDebouncedSearch(searchQuery), 300);
    return (): void => clearTimeout(timer);
  }, [searchQuery]);

  const {
    chats,
    messages,
    loadingChats,
    loadingMessages,
    sending,
    isClosing,
    isReopening,
    fetchChats,
    sendMessage,
    closeChat,
    reopenChat,
  } = useAdminChatManagement({
    chatType,
    selectedChatId,
    showClosed,
    debouncedSearch,
  });

  const selectedChat = chats.find((c) => c.id === selectedChatId);

  // Extract location from messages for the mini map
  const locationMessage = messages.find((m) => {
    const payload = m.messagePayload as unknown as LocationPayload;
    return payload.location ?? (payload.latitude !== undefined && payload.longitude !== undefined);
  });
  const locationPayload = locationMessage?.messagePayload as unknown as LocationPayload | undefined;
  const locationData = locationPayload?.location ?? locationPayload;
  // Ensure we have valid numbers
  const latitude = locationData?.latitude;
  const longitude = locationData?.longitude;
  const hasValidLocation = typeof latitude === 'number' && typeof longitude === 'number';

  const handleCloseConfirm = async (): Promise<void> => {
    await closeChat();
    setIsModalOpen(false);
  };

  const handleReopenConfirm = async (): Promise<void> => {
    await reopenChat();
    setIsReopenModalOpen(false);
  };

  const isEmergency = chatType === ChatType.EMERGENCY;
  const isDe = locale === 'de';

  let closeTitle = '';
  let closeMessage = '';
  let closeConfirmLabel = '';
  let reopenTitle = '';
  let reopenMessage = '';

  if (isEmergency) {
    closeTitle = isDe ? 'Notfallmeldung abschliessen' : 'Complete Emergency Alert';
    closeMessage = isDe
      ? 'Sind Sie sicher, dass Sie diese Notfallmeldung als abgeschlossen markieren möchten? Der Chat wird für alle Benutzer gesperrt.'
      : 'Are you sure you want to mark this emergency alert as completed? This will lock the chat for all users.';
    closeConfirmLabel = isDe ? 'Abschliessen' : 'Complete';

    reopenTitle = isDe ? 'Notfallmeldung wiederöffnen' : 'Reopen Emergency Alert';
    reopenMessage = isDe
      ? 'Möchten Sie diese Notfallmeldung wiederöffnen? Der Benutzer kann dann wieder Nachrichten senden.'
      : 'Do you want to reopen this emergency alert? This will allow the user to send messages again.';
  } else {
    closeTitle = isDe ? 'Problem abschliessen' : 'Close Ticket';
    closeMessage = isDe
      ? 'Sind Sie sicher, dass Sie dieses Problem als gelöst markieren möchten? Der Chat wird für alle Benutzer gesperrt.'
      : 'Are you sure you want to mark this issue as resolved? This will lock the chat for all users.';
    closeConfirmLabel = isDe ? 'Abschliessen' : 'Close Ticket';

    reopenTitle = isDe ? 'Problem wiederöffnen' : 'Reopen Ticket';
    reopenMessage = isDe
      ? 'Möchten Sie dieses Problem wiederöffnen? Der Benutzer kann dann wieder Nachrichten senden.'
      : 'Do you want to reopen this ticket? This will allow the user to send messages again.';
  }

  return (
    <>
      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={() => void handleCloseConfirm()}
        isSubmitting={isClosing}
        locale={locale}
        title={closeTitle}
        message={closeMessage}
        confirmLabel={closeConfirmLabel}
        submittingText={locale === 'de' ? 'Wird abgeschlossen...' : 'Closing...'}
        confirmVariant="danger"
      />
      <ConfirmationModal
        isOpen={isReopenModalOpen}
        onClose={() => setIsReopenModalOpen(false)}
        onConfirm={() => void handleReopenConfirm()}
        isSubmitting={isReopening}
        locale={locale}
        title={reopenTitle}
        message={reopenMessage}
        confirmLabel={locale === 'de' ? 'Wiederöffnen' : 'Reopen'}
        submittingText={locale === 'de' ? 'Wird geöffnet...' : 'Reopening...'}
        confirmVariant="primary"
      />
      <div className="flex h-[calc(100vh-140px)] overflow-hidden bg-[var(--theme-bg)] text-[var(--theme-text)]">
        <ChatManagementSidebar
          title={title}
          chats={chats}
          // eslint-disable-next-line unicorn/no-null
          selectedChatId={selectedChatId ?? null}
          onSelectChat={(id) => setSelectedChatId(id || undefined)}
          loadingChats={loadingChats}
          loadingMessages={loadingMessages}
          onRefresh={() => void fetchChats()}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          showClosed={showClosed}
          onShowClosedChange={setShowClosed}
        />

        {/* Right Column: Chat Details */}
        <div className="relative flex flex-1 flex-col overflow-hidden">
          {/* Maximized Map Overlay */}
          {isMapMaximized && hasValidLocation && (
            <LocationMap
              latitude={latitude}
              longitude={longitude}
              isMaximized
              onToggleMaximize={setIsMapMaximized}
              title={selectedChat?.name ?? ''}
              locale={locale}
            />
          )}

          {selectedChat ? (
            <ChatIdProvider chatId={selectedChat.id}>
              <ChatManagementHeader
                selectedChat={selectedChat}
                chatType={chatType}
                locale={locale}
                onCloseChat={() => setIsModalOpen(true)}
                onReopenChat={() => setIsReopenModalOpen(true)}
              />

              {/* Content Area */}
              <div className="flex flex-1 flex-col space-y-4 overflow-y-auto p-4">
                {/* Mini Map if location exists */}
                {hasValidLocation && (
                  <LocationMap
                    latitude={latitude}
                    longitude={longitude}
                    isMaximized={false}
                    onToggleMaximize={setIsMapMaximized}
                    title={selectedChat.name}
                    locale={locale}
                  />
                )}

                <ChatManagementMessages
                  messages={messages}
                  loading={loadingMessages}
                  locale={locale}
                  chatType={chatType}
                />
              </div>

              {/* Input Area */}
              <div className="border-t border-[var(--theme-elevation-150)] bg-[var(--theme-elevation-50)] p-4">
                <ChatManagementInput
                  chatId={selectedChat.id}
                  onSendMessage={sendMessage}
                  sending={sending}
                  disabled={selectedChat.status !== ChatStatus.OPEN}
                  locale={locale}
                />
              </div>
            </ChatIdProvider>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center opacity-30">
              <div className="mb-4 text-6xl">💬</div>
              <div className="text-xl font-bold">Select a chat to view details</div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export const GenericChatManagementView: React.FC<GenericChatManagementViewProperties> = (props) => {
  return (
    <TRPCProvider>
      <GenericChatManagementContent {...props} />
    </TRPCProvider>
  );
};
