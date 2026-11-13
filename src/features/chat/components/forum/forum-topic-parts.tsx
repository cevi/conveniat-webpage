'use client';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/buttons/button';
import { Card } from '@/components/ui/card';
import { ListRow } from '@/components/ui/list-row';
import { Switch } from '@/components/ui/switch';
import type { ForumTopic } from '@/features/chat/api/forum/forum-queries';
import { forumText } from '@/features/chat/components/forum/forum-texts';
import { ForumTopicIconView } from '@/features/chat/components/forum/forum-topic-icon';
import { useTRPC } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, History, Lock } from 'lucide-react';
import Link from 'next/link';
import type React from 'react';
import type { RefObject } from 'react';

/**
 * The head of a topic's feed: what it is for, who answers there, and the way to write its
 * Kernteam privately where editors allow it.
 */
export const TopicCard: React.FC<{
  topic: ForumTopic;
  locale: Locale;
  /** the bell of a participant or the settings of the Kernteam, top right */
  action?: React.ReactNode;
}> = ({ topic, locale, action }) => {
  const kernteam = topic.kernteamLabels ?? [];
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-start gap-3">
        <ForumTopicIconView icon={topic.icon} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h1 className="font-heading text-heading text-[20px] leading-tight font-extrabold">
            {topic.name}
          </h1>
          {topic.description !== null && topic.description !== '' && (
            <p className="text-[14px] text-green-700">{topic.description}</p>
          )}
          {kernteam.length > 0 && (
            <p className="text-[13px] text-green-700">
              <span className="font-semibold text-green-800">{forumText.kernteam[locale]}:</span>{' '}
              {kernteam.join(', ')}
            </p>
          )}
        </div>
        {action}
      </div>
      {topic.allowsPrivateConversations === true && (
        <Button asChild variant="outlined" size="touch">
          <Link href={`/app/forum/new?conversation=1&topic=${topic.id}`}>
            <Lock aria-hidden="true" />
            {forumText.privateReport[locale]}
          </Link>
        </Button>
      )}
    </Card>
  );
};

/**
 * What the Kernteam of a topic sets for itself: which pushes it gets, and the way to the
 * topic's protocol. Flags always push to the Kernteam and have no switch.
 */
export const TopicSettingsSheet: React.FC<{
  topic: ForumTopic;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  anchor: RefObject<HTMLElement | null>;
  locale: Locale;
}> = ({ topic, open, onOpenChange, anchor, locale }) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const refresh = (): void =>
    void queryClient.invalidateQueries(trpc.forum.getForumTopicList.pathFilter());
  const posts = useMutation(
    trpc.forum.updateForumTopicSubscription.mutationOptions({ onSettled: refresh }),
  );
  const conversations = useMutation(
    trpc.forum.updateForumTopicConversationPush.mutationOptions({ onSettled: refresh }),
  );
  const conversationPush = topic.conversationPushOff !== true;

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={forumText.topicSettings[locale]}
      anchor={anchor}
    >
      <div className="flex flex-col gap-3 pb-2">
        <Card as="ul" divided>
          <li className="flex min-h-14 items-center gap-3 px-4 py-2.5">
            <span className="flex-1 text-[15px] font-semibold text-green-900">
              {forumText.newPostsPush[locale]}
            </span>
            <Switch
              checked={topic.subscribed}
              loading={posts.isPending}
              aria-label={forumText.newPostsPush[locale]}
              onCheckedChange={(checked) =>
                posts.mutate({ topicId: topic.id, subscribed: checked })
              }
            />
          </li>
          {topic.allowsPrivateConversations === true && (
            <li className="flex min-h-14 items-center gap-3 px-4 py-2.5">
              <span className="flex flex-1 flex-col">
                <span className="text-[15px] font-semibold text-green-900">
                  {forumText.conversationPush[locale]}
                </span>
                <span className="text-[13px] text-green-700">
                  {forumText.conversationPushExplain[locale]}
                </span>
              </span>
              <Switch
                checked={conversationPush}
                loading={conversations.isPending}
                aria-label={forumText.conversationPush[locale]}
                onCheckedChange={(checked) =>
                  conversations.mutate({ topicId: topic.id, enabled: checked })
                }
              />
            </li>
          )}
        </Card>
        <Card as="ul" divided>
          <li>
            <ListRow href={`/app/forum/topic/${topic.id}/protocol`}>
              <History className="h-5 w-5 text-green-700" aria-hidden="true" />
              <span className="flex-1 text-[15px] font-semibold text-green-900">
                {forumText.protocol[locale]}
              </span>
              <ChevronRight className="h-5 w-5 text-green-600" aria-hidden="true" />
            </ListRow>
          </li>
        </Card>
      </div>
    </BottomSheet>
  );
};
