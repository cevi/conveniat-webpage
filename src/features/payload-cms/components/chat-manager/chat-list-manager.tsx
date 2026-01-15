'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/buttons/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ChatCapability } from '@/lib/chat-shared';
import { ChatType } from '@/lib/prisma/client';
import { trpc } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { useTranslation } from '@payloadcms/ui';
import { format } from 'date-fns';
import { RefreshCw, Search, Users } from 'lucide-react';
import React, { useState } from 'react';

interface Translation {
  title: string;
  description: string;
  refresh: string;
  searchPlaceholder: string;
  typeFilter: string;
  chatName: string;
  members: string;
  type: string;
  status: string;
  capabilities: string;
  actions: string;
  noChats: string;
  loading: string;
  open: string;
  closed: string;
  unknown: string;
  viewDetails: string;
  closeChat: string;
  reopenChat: string;
  previous: string;
  next: string;
  pageOf: string;
  showing: string;
  capabilityLabels: Record<ChatCapability, string>;
  one_to_one: string;
}

const translations: Record<Locale, Translation> = {
  en: {
    title: 'Chat Management',
    description: 'Manage all chats, members, and capabilities.',
    refresh: 'Refresh',
    searchPlaceholder: 'Search chats or members...',
    typeFilter: 'All Types',
    chatName: 'Chat Name',
    members: 'Members',
    type: 'Type',
    status: 'Status',
    capabilities: 'Capabilities',
    actions: 'Actions',
    noChats: 'No chats found.',
    loading: 'Loading chats...',
    open: 'Open',
    closed: 'Closed',
    unknown: 'Unknown',
    viewDetails: 'View',
    closeChat: 'Close',
    reopenChat: 'Reopen',
    previous: 'Previous',
    next: 'Next',
    pageOf: 'Page {page} of {total}',
    showing: 'Showing {count} of {total} chats',
    capabilityLabels: {
      [ChatCapability.CAN_SEND_MESSAGES]: 'Messages',
      [ChatCapability.PICTURE_UPLOAD]: 'Pictures',
      [ChatCapability.THREADS]: 'Threads',
    },
    one_to_one: 'One-To-One',
  },
  de: {
    title: 'Chat-Verwaltung',
    description: 'Alle Chats, Mitglieder und Funktionen verwalten.',
    refresh: 'Aktualisieren',
    searchPlaceholder: 'Chats oder Mitglieder suchen...',
    typeFilter: 'Alle Typen',
    chatName: 'Chat-Name',
    members: 'Mitglieder',
    type: 'Typ',
    status: 'Status',
    capabilities: 'Funktionen',
    actions: 'Aktionen',
    noChats: 'Keine Chats gefunden.',
    loading: 'Chats werden geladen...',
    open: 'Offen',
    closed: 'Geschlossen',
    unknown: 'Unbekannt',
    viewDetails: 'Ansehen',
    closeChat: 'Schliessen',
    reopenChat: 'Wiederöffnen',
    previous: 'Zurück',
    next: 'Weiter',
    pageOf: 'Seite {page} von {total}',
    showing: '{count} von {total} Chats angezeigt',
    capabilityLabels: {
      [ChatCapability.CAN_SEND_MESSAGES]: 'Nachrichten',
      [ChatCapability.PICTURE_UPLOAD]: 'Bilder',
      [ChatCapability.THREADS]: 'Threads',
    },
    one_to_one: 'Eins-zu-Eins',
  },
  fr: {
    title: 'Gestion des chats',
    description: 'Gérez tous les chats, membres et fonctionnalités.',
    refresh: 'Rafraîchir',
    searchPlaceholder: 'Rechercher des chats ou des membres...',
    typeFilter: 'Tous les types',
    chatName: 'Nom du chat',
    members: 'Membres',
    type: 'Type',
    status: 'Statut',
    capabilities: 'Fonctionnalités',
    actions: 'Actions',
    noChats: 'Aucun chat trouvé.',
    loading: 'Chargement des chats...',
    open: 'Ouvert',
    closed: 'Fermé',
    unknown: 'Inconnu',
    viewDetails: 'Voir',
    closeChat: 'Fermer',
    reopenChat: 'Rouvrir',
    previous: 'Précédent',
    next: 'Suivant',
    pageOf: 'Page {page} sur {total}',
    showing: '{count} sur {total} chats affichés',
    capabilityLabels: {
      [ChatCapability.CAN_SEND_MESSAGES]: 'Messages',
      [ChatCapability.PICTURE_UPLOAD]: 'Images',
      [ChatCapability.THREADS]: 'Threads',
    },
    one_to_one: 'Un-à-un',
  },
};

export const ChatListManager: React.FC = () => {
  const { i18n } = useTranslation();

  const t = translations[i18n.language as Locale];

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const limit = 10;

  const utils = trpc.useUtils();
  const { data, isLoading, refetch, isRefetching } = trpc.admin.getChatList.useQuery({
    search: search || undefined,
    type: typeFilter === 'ALL' ? undefined : (typeFilter as ChatType),
    page,
    limit,
  });

  const chats = data?.chats || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const toggleCapabilityMutation = trpc.admin.toggleChatCapability.useMutation({
    onSuccess: () => void utils.admin.getChatList.invalidate(),
  });

  const closeChatMutation = trpc.admin.closeChat.useMutation({
    onSuccess: () => void utils.admin.getChatList.invalidate(),
  });

  const reopenChatMutation = trpc.admin.reopenChat.useMutation({
    onSuccess: () => void utils.admin.getChatList.invalidate(),
  });

  const onSearchChange = (value: string): void => {
    setSearch(value);
    setPage(1);
  };

  const onTypeFilterChange = (value: string): void => {
    setTypeFilter(value);
    setPage(1);
  };

  const handleToggleCapability = async (
    chatId: string,
    capability: string,
    isEnabled: boolean,
  ): Promise<void> => {
    await toggleCapabilityMutation.mutateAsync({
      chatId,
      capability,
      isEnabled,
    });
  };

  const renderStatusBadge = (status: string): React.ReactNode => {
    const isOpen = status === 'OPEN';
    return (
      <Badge
        variant={isOpen ? 'secondary' : 'outline'}
        className={
          isOpen
            ? 'border-green-200 bg-green-100 text-green-700 dark:border-green-800/50 dark:bg-green-900/30 dark:text-green-400'
            : 'border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-800 dark:bg-gray-900/50 dark:text-gray-400'
        }
      >
        {isOpen ? t.open : t.closed}
      </Badge>
    );
  };

  const renderBadgeColors: Record<ChatType, string> = {
    [ChatType.EMERGENCY]:
      'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50',
    [ChatType.SUPPORT_GROUP]:
      'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50',
    [ChatType.COURSE_GROUP]:
      'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800/50',
    [ChatType.GROUP]:
      'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800/50',
    [ChatType.ONE_TO_ONE]:
      'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800/50',
  };

  const renderTypeBadge = (type: ChatType): React.ReactNode => {
    return (
      <Badge variant="outline" className={renderBadgeColors[type]}>
        {type}
      </Badge>
    );
  };

  const getChatDisplayName = (chat: (typeof chats)[0]): string => {
    if (chat.name) return chat.name;
    if (chat.type === ChatType.ONE_TO_ONE) return t.one_to_one;
    return t.unknown;
  };

  const renderTableBody = (): React.ReactNode => {
    if (isLoading) {
      return Array.from({ length: 5 }).map((_, index) => (
        <TableRow key={index}>
          <TableCell>
            <Skeleton className="h-5 w-32" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-24" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-40" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-16" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-32" />
          </TableCell>
          <TableCell className="text-right">
            <Skeleton className="ml-auto h-8 w-16" />
          </TableCell>
        </TableRow>
      ));
    }

    if (chats.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={6} className="text-muted-foreground h-32 text-center italic">
            {t.noChats}
          </TableCell>
        </TableRow>
      );
    }

    return chats.map((chat) => (
      <TableRow key={chat.id}>
        <TableCell className="font-medium">
          <div className="flex flex-col">
            <span>{getChatDisplayName(chat)}</span>
            <span className="text-muted-foreground text-xs">
              {chat.messageCount} messages • Updated {format(new Date(chat.lastUpdate), 'MMM d')}
            </span>
          </div>
        </TableCell>
        <TableCell>{renderTypeBadge(chat.type)}</TableCell>
        <TableCell>
          <div className="text-muted-foreground flex items-start gap-1 text-xs">
            <Users className="mt-0.5 h-3 w-3 shrink-0" />
            <div className="flex flex-row flex-wrap gap-x-1.5 gap-y-0.5">
              {chat.members.map((m, index) => (
                <span key={m.uuid} className="whitespace-nowrap">
                  {m.name}
                  {index < chat.members.length - 1 ? ',' : ''}
                </span>
              ))}
            </div>
          </div>
        </TableCell>
        <TableCell>{renderStatusBadge(chat.status)}</TableCell>
        <TableCell>
          <div className="flex flex-col gap-2">
            {Object.values(ChatCapability).map((cap) => (
              <div key={cap} className="flex items-center justify-between gap-4">
                <span className="text-xs">{t.capabilityLabels[cap]}</span>
                <Switch
                  checked={chat.capabilities.includes(cap)}
                  onCheckedChange={(checked) => {
                    void handleToggleCapability(chat.id, cap, checked);
                  }}
                  disabled={toggleCapabilityMutation.isPending}
                  aria-label={`${t.capabilityLabels[cap]} – ${getChatDisplayName(chat)}`}
                />
              </div>
            ))}
          </div>
        </TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-2">{renderActionButtons(chat)}</div>
        </TableCell>
      </TableRow>
    ));
  };

  const renderActionButtons = (chat: (typeof chats)[0]): React.ReactNode => {
    if (chat.status === 'OPEN') {
      return (
        <Button
          variant="outline"
          size="sm"
          className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-900/50 dark:hover:text-red-200"
          onClick={() => {
            void closeChatMutation.mutateAsync({ chatId: chat.id });
          }}
          disabled={closeChatMutation.isPending}
        >
          {t.closeChat}
        </Button>
      );
    }

    return (
      <Button
        variant="outline"
        size="sm"
        className="border-green-200 text-green-600 hover:bg-green-50 hover:text-green-700 dark:border-green-900/50 dark:bg-green-950/30 dark:text-green-300 dark:hover:bg-green-900/50 dark:hover:text-green-200"
        onClick={() => {
          void reopenChatMutation.mutateAsync({ chatId: chat.id });
        }}
        disabled={reopenChatMutation.isPending}
      >
        {t.reopenChat}
      </Button>
    );
  };

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-bold tracking-tight">{t.title}</h1>
          <p className="text-muted-foreground">{t.description}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void refetch()}
          disabled={isRefetching}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
          {t.refresh}
        </Button>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder={t.searchPlaceholder}
            value={search}
            onChange={(event_) => onSearchChange(event_.target.value)}
            className="pl-10"
          />
        </div>
        <div className="w-full md:w-48">
          <Select value={typeFilter} onValueChange={(value) => onTypeFilterChange(value)}>
            <SelectTrigger>
              <SelectValue placeholder={t.typeFilter} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t.typeFilter}</SelectItem>
              {Object.values(ChatType).map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-black/20">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.chatName}</TableHead>
              <TableHead>{t.type}</TableHead>
              <TableHead>{t.members}</TableHead>
              <TableHead>{t.status}</TableHead>
              <TableHead className="min-w-[150px]">{t.capabilities}</TableHead>
              <TableHead className="text-right">{t.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{renderTableBody()}</TableBody>
        </Table>

        {total > 0 && (
          <div className="flex flex-col items-center justify-between gap-4 border-t border-gray-200 p-4 sm:flex-row dark:border-gray-800">
            <div className="text-muted-foreground text-sm">
              {t.showing
                .replace('{count}', chats.length.toString())
                .replace('{total}', total.toString())}
            </div>
            <div className="flex items-center gap-4">
              <div className="text-muted-foreground text-sm whitespace-nowrap">
                {t.pageOf
                  .replace('{page}', page.toString())
                  .replace('{total}', totalPages.toString())}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || isLoading}
                >
                  {t.previous}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || isLoading}
                >
                  {t.next}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
