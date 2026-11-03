'use client';
import { Button } from '@/components/ui/buttons/button';
import { SectionLabel } from '@/components/ui/section-label';
import { scheduleErrorTexts } from '@/features/schedule/error-texts';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import { trpc } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { userErrorMessage } from '@/utils/user-error-message';
import { Loader2, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import type React from 'react';
import { toast } from 'sonner';

const labels = {
  admin: { de: 'Administration', en: 'Administration', fr: 'Administration' },
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
  createChatFailed: {
    de: 'Der Gruppenchat konnte nicht erstellt werden.',
    en: 'The group chat could not be created.',
    fr: 'Le chat de groupe n’a pas pu être créé.',
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
    {
      enabled: isAdminProperty === undefined || courseStatusProperty === undefined,

      staleTime: 1000 * 60 * 5,
    },
  );

  const status = courseStatusProperty ?? fetchedStatus;
  const isAdmin = isAdminProperty ?? status?.isAdmin ?? false;

  const createChat = trpc.schedule.createWorkshopChat.useMutation({
    onSuccess: (data) => {
      // Invalidate the status query to update the UI
      void utils.schedule.getCourseStatus.invalidate({ courseId });
      globalThis.location.href = `/app/chat/${data.chatId}`;
    },
    onError: (error) =>
      toast.error(userErrorMessage(error, locale, scheduleErrorTexts, labels.createChatFailed)),
  });

  // Don't render if not admin or still loading
  if (isLoading && !status) return;
  if (!isAdmin || !status) return;

  const hasChatCreated = Boolean(status.chatId);

  // The roster itself lives in `ParticipantList`, rendered as its own section on the detail page.
  return (
    <section>
      <SectionLabel>{labels.admin[locale]}</SectionLabel>
      <div className="mt-2">
        {hasChatCreated ? (
          <Button variant="outlined" size="touch" className="gap-2" asChild>
            <Link href={`/app/chat/${status.chatId}`}>
              <MessageSquare aria-hidden="true" />
              {labels.viewChat[locale]}
            </Link>
          </Button>
        ) : (
          <Button
            variant="outlined"
            size="touch"
            className="gap-2"
            onClick={() => {
              createChat.mutate({ courseId, chatName: `Workshop: ${courseTitle}` });
            }}
            disabled={createChat.isPending}
          >
            {createChat.isPending ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <MessageSquare aria-hidden="true" />
            )}
            {labels.createChat[locale]}
          </Button>
        )}
      </div>
    </section>
  );
};
