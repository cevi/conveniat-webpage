'use client';
import { Button } from '@/components/ui/buttons/button';
import { toast } from '@/lib/toast';
import { trpc } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { Loader2, MessageSquare, Settings } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import Link from 'next/link';
import type React from 'react';

const labels = {
  admin: { de: 'Administration', en: 'Administration', fr: 'Administration' },
  participants: { de: 'Teilnehmer', en: 'Participants', fr: 'Participants' },
  management: { de: 'Verwaltung', en: 'Management', fr: 'Gestion' },
  createChat: {
    de: 'Gruppenchat erstellen',
    en: 'Create Group Chat',
    fr: 'Créer un chat de groupe',
  },
  viewChat: {
    de: 'Gruppenchat öffnen',
    en: 'View Group Chat',
    fr: 'Voir le chat de groupe',
  },
  noParticipants: {
    de: 'Noch keine Teilnehmer',
    en: 'No participants yet',
    fr: 'Pas encore de participants',
  },
} as const;

interface CourseStatus {
  enrolledCount: number;
  maxParticipants: number | undefined;
  isEnrolled: boolean;
  isAdmin: boolean;
  enableEnrolment: boolean | null | undefined;
  hideList: boolean | null | undefined;
  chatId: string | undefined;
  participants: { uuid: string; name: string }[];
  descriptionMarkdown: string | undefined;
  targetGroupMarkdown: string | undefined;
}

interface WorkshopAdminActionsProperties {
  courseId: string;
  courseTitle: string;
  isAdmin?: boolean;
  courseStatus?: CourseStatus | undefined;
}

export const WorkshopAdminActions: React.FC<WorkshopAdminActionsProperties> = ({
  courseId,
  courseTitle,
  isAdmin: isAdminProperty,
  courseStatus: courseStatusProperty,
}) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const utils = trpc.useUtils();

  // Use passed props or fetch if not provided
  const { data: fetchedStatus, isLoading } = trpc.schedule.getCourseStatus.useQuery(
    { courseId },
    { enabled: isAdminProperty === undefined || courseStatusProperty === undefined },
  );

  const status = courseStatusProperty ?? fetchedStatus;
  const isAdmin = isAdminProperty ?? status?.isAdmin ?? false;

  const createChat = trpc.schedule.createWorkshopChat.useMutation({
    onSuccess: (data) => {
      // Invalidate the status query to update the UI
      void utils.schedule.getCourseStatus.invalidate({ courseId });
      globalThis.location.href = `/app/chat/${data.chatId}`;
    },
    onError: (error) => toast.error(error.message),
  });

  // Don't render if not admin or still loading
  if (isLoading && !status) return;
  if (!isAdmin || !status) return;

  const hasChatCreated = Boolean(status.chatId);

  return (
    <div className="mt-10 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      {/* Header */}
      <h2 className="mb-5 flex items-center gap-2 text-base font-semibold text-gray-900">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
          <Settings className="h-4 w-4" />
        </div>
        {labels.admin[locale]}
      </h2>

      <div className="space-y-5">
        {/* Management Section */}
        <div>
          <h3 className="mb-2 text-xs font-semibold text-gray-500">{labels.management[locale]}</h3>
          {hasChatCreated ? (
            <Button variant="outline" size="sm" className="gap-2" asChild>
              <Link href={`/app/chat/${status.chatId}`}>
                <MessageSquare className="h-4 w-4" />
                {labels.viewChat[locale]}
              </Link>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => {
                createChat.mutate({ courseId, chatName: `Workshop: ${courseTitle}` });
              }}
              disabled={createChat.isPending}
            >
              {createChat.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MessageSquare className="h-4 w-4" />
              )}
              {labels.createChat[locale]}
            </Button>
          )}
        </div>

        {/* Participant List Section */}
        <div>
          <h3 className="mb-2 text-xs font-semibold text-gray-500">
            {labels.participants[locale]} ({status.participants.length})
          </h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {status.participants.map((p: { uuid: string; name: string }) => (
              <div
                key={p.uuid}
                className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-700"
              >
                <div className="bg-conveniat-green h-2 w-2 rounded-full" />
                {p.name}
              </div>
            ))}
            {status.participants.length === 0 && (
              <div className="col-span-2 text-sm text-gray-400 italic">
                {labels.noParticipants[locale]}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
