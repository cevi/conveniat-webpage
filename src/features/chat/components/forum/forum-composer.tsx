'use client';

import { textInputClassName } from '@/components/ui/field';
import { segmentClassName, segmentedTrackClassName } from '@/components/ui/segmented-control';
import { forumText } from '@/features/chat/components/forum/forum-texts';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { chatErrorTexts } from '@/lib/chat-error-texts';
import { CHAT_IMAGE_MAX_BYTES, isChatImageContentType } from '@/lib/chat-images';
import { forumErrorTexts } from '@/lib/forum-error-texts';
import {
  FORUM_LIKE_EMOJI,
  FORUM_POST_MAX_IMAGES,
  FORUM_TEXT_MAX_LENGTH,
  FORUM_TITLE_MAX_LENGTH,
  forumStatusLabel,
} from '@/lib/forum-shared';
import { trpc } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { userErrorMessage } from '@/utils/user-error-message';
import { Camera, Loader2, Lock, MapPin, Search, ThumbsUp, Users, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useDeferredValue, useState } from 'react';

interface PickedLocation {
  longitude: number;
  latitude: number;
  annotationId?: string;
  label?: string;
}

/** The place the map handed over in the URL, see the map's "Hier etwas melden". */
const locationFromParameters = (parameters: URLSearchParams): PickedLocation | undefined => {
  const longitude = Number(parameters.get('lng'));
  const latitude = Number(parameters.get('lat'));
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude) || parameters.get('lng') === null) {
    return undefined;
  }
  const annotationId = parameters.get('annotation') ?? undefined;
  const label = parameters.get('label') ?? undefined;
  return {
    longitude,
    latitude,
    ...(annotationId === undefined ? {} : { annotationId }),
    ...(label === undefined ? {} : { label }),
  };
};

const DRAFT_KEY = 'conveniat:forum-composer-draft';

interface ComposerDraft {
  title: string;
  text: string;
  topicId?: string | undefined;
}

/**
 * The title and text while the map is open to pick a spot: picking leaves this page, and coming
 * back must not cost what was typed. Kept for the tab only; publishing clears it. Photos are not
 * kept, their previews live in this page.
 */
const readDraft = (): ComposerDraft | undefined => {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (raw === null) return undefined;
    const draft = JSON.parse(raw) as Partial<ComposerDraft>;
    return {
      title: typeof draft.title === 'string' ? draft.title : '',
      text: typeof draft.text === 'string' ? draft.text : '',
      topicId: typeof draft.topicId === 'string' ? draft.topicId : undefined,
    };
  } catch {
    return undefined;
  }
};

const saveDraft = (draft: ComposerDraft): void => {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // storage blocked: the draft is lost on the way to the map
  }
};

const clearDraft = (): void => {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // nothing to clear
  }
};

/** A photo picked for the post, uploaded on publishing: a private report's chat exists only then. */
interface PickedImage {
  file: File;
  preview: string;
}

/**
 * Writes a post. While the title is typed, and as soon as a place is chosen, the posts that may
 * already say the same are shown first, each with "Ich auch": a like there is worth more than a
 * second post the Zentrale has to read.
 */
export const ForumComposer: React.FC = () => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const router = useRouter();
  const parameters = useSearchParams();
  const isOnline = useOnlineStatus();
  const utils = trpc.useUtils();

  const topics = trpc.forum.getForumTopicList.useQuery({});
  const [draft] = useState(readDraft);
  const [chosenTopicId, setChosenTopicId] = useState<string | undefined>(
    parameters.get('topic') ?? draft?.topicId,
  );
  const topicId = chosenTopicId ?? topics.data?.[0]?.id;
  const topic = topics.data?.find((candidate) => candidate.id === topicId);

  const [postId] = useState(() => crypto.randomUUID());
  const [title, setTitle] = useState(draft?.title ?? '');
  const [text, setText] = useState(draft?.text ?? '');
  const [location, setLocation] = useState(() => locationFromParameters(parameters));
  // The composer stays mounted while the map is open to pick a spot, so the spot the picker
  // hands back in the address arrives as a change, not as a new page: take it then.
  const spotParameters = ['lng', 'lat', 'annotation', 'label']
    .map((name) => parameters.get(name) ?? '')
    .join('|');
  const [handledSpot, setHandledSpot] = useState(spotParameters);
  if (handledSpot !== spotParameters) {
    setHandledSpot(spotParameters);
    const handedBack = locationFromParameters(parameters);
    if (handedBack !== undefined) setLocation(handedBack);
  }
  const [images, setImages] = useState<PickedImage[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  // what the user chose on the toggle; until then the map's private link, or, for someone in no
  // topic, private, since a public post needs a topic
  const [choice, setChoice] = useState<'public' | 'private' | undefined>(
    parameters.get('private') === '1' ? 'private' : undefined,
  );
  // without a topic of their own, a report can only go privately to the Zentrale
  const canPostPublic = topics.data === undefined || topics.data.length > 0;
  const isPrivate = choice === undefined ? !canPostPublic : choice === 'private';
  const deferredTitle = useDeferredValue(title);

  const suggestions = trpc.forum.getForumPostSuggestionList.useQuery(
    {
      title: deferredTitle,
      ...(location === undefined
        ? {}
        : { near: { longitude: location.longitude, latitude: location.latitude } }),
    },
    { enabled: deferredTitle.trim().length >= 3 || location !== undefined },
  );
  const like = trpc.chat.toggleReaction.useMutation({
    onSettled: () => void utils.forum.getForumPostSuggestionList.invalidate(),
  });
  const uploadUrl = trpc.chat.getUploadUrl.useMutation();
  const create = trpc.forum.createForumPost.useMutation();
  const report = trpc.chat.reportProblem.useMutation();
  const sendMessage = trpc.chat.sendMessage.useMutation();

  const addImage = (file: File | undefined): void => {
    if (file === undefined) return;
    if (!isChatImageContentType(file.type) || file.size > CHAT_IMAGE_MAX_BYTES) {
      setError(forumText.changeFailed[locale]);
      return;
    }
    setImages((previous) => [...previous, { file, preview: URL.createObjectURL(file) }]);
  };

  /** Uploads the picked photos into a chat, the topic or the private report, by their keys. */
  const uploadImagesTo = async (chatId: string): Promise<string[]> => {
    const keys: string[] = [];
    for (const { file } of images) {
      const { url, key } = await uploadUrl.mutateAsync({
        chatId,
        contentType: file.type as Parameters<typeof uploadUrl.mutateAsync>[0]['contentType'],
        contentLength: file.size,
      });
      const response = await fetch(url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });
      if (!response.ok) throw new Error('Upload failed');
      keys.push(key);
    }
    return keys;
  };

  /**
   * A public post goes into its topic. A private report opens a support chat with the piket on
   * duty, as the map's report always did: what the reporter wrote is its first message, the
   * photos follow it, and the reporter lands in that chat.
   */
  const publish = async (): Promise<void> => {
    setError(undefined);
    setIsBusy(true);
    try {
      if (isPrivate) {
        const chat = await report.mutateAsync({
          title: title.trim(),
          ...(text.trim() === '' ? {} : { text: text.trim() }),
          ...(location === undefined ? {} : { location: [location.longitude, location.latitude] }),
        });
        for (const key of await uploadImagesTo(chat.uuid)) {
          await sendMessage.mutateAsync({
            chatId: chat.uuid,
            content: key,
            type: 'IMAGE_MSG',
            timestamp: new Date(),
            messageId: crypto.randomUUID(),
          });
        }
        clearDraft();
        router.replace(`/app/chat/${chat.uuid}`);
        return;
      }
      if (topicId === undefined) return;
      const keys = await uploadImagesTo(topicId);
      const { id } = await create.mutateAsync({
        topicId,
        postId,
        title: title.trim(),
        text: text.trim(),
        images: keys,
        ...(location === undefined
          ? {}
          : {
              location: {
                longitude: location.longitude,
                latitude: location.latitude,
                ...(location.annotationId === undefined
                  ? {}
                  : { annotationId: location.annotationId }),
              },
            }),
      });
      clearDraft();
      void utils.forum.invalidate();
      router.replace(`/app/forum/${id}`);
    } catch (error_) {
      setError(
        isPrivate
          ? userErrorMessage(error_, locale, chatErrorTexts, forumText.changeFailed)
          : userErrorMessage(error_, locale, forumErrorTexts, forumText.changeFailed),
      );
    } finally {
      setIsBusy(false);
    }
  };

  // the picker opens at the spot already chosen, so "Ändern" moves the pin from there
  const mapPickHref = `/app/map?${new URLSearchParams({
    pickForum: '1',
    ...(topicId === undefined ? {} : { topic: topicId }),
    // back from the map, the composer is still on "Privat"
    ...(isPrivate ? { private: '1' } : {}),
    ...(location === undefined
      ? {}
      : { lng: location.longitude.toFixed(6), lat: location.latitude.toFixed(6) }),
  }).toString()}`;
  const keepDraft = (): void => saveDraft({ title, text, topicId });
  const canPublish =
    isOnline && title.trim() !== '' && !isBusy && (isPrivate || topicId !== undefined);
  const matching = (suggestions.data ?? []).slice(0, 3);
  let publishHint = forumText.publishHint;
  if (!isOnline) publishHint = forumText.offlinePublish;
  else if (isPrivate) publishHint = forumText.privateHint;
  else if (!canPostPublic) publishHint = forumText.publicNeedsTopic;
  else if (topic?.isAdmin === true) publishHint = forumText.publishHintKernteam;

  return (
    <div className="bg-page min-h-dvh pb-10">
      <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 pt-3">
        <div className="flex flex-col gap-1.5">
          <div className={segmentedTrackClassName}>
            {([false, true] as const).map((value) => (
              <button
                key={String(value)}
                type="button"
                aria-pressed={isPrivate === value}
                onClick={() => setChoice(value ? 'private' : 'public')}
                className={cn(
                  segmentClassName(isPrivate === value),
                  'flex-1 gap-1.5 text-[14px] font-semibold',
                )}
              >
                {value ? (
                  <Lock className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Users className="h-4 w-4" aria-hidden="true" />
                )}
                {value ? forumText.private[locale] : forumText.public[locale]}
              </button>
            ))}
          </div>
          <p className="text-[13px] text-green-700">
            {isPrivate ? forumText.privateExplain[locale] : forumText.publicExplain[locale]}
          </p>
        </div>

        {!isPrivate && (topics.data?.length ?? 0) > 1 && (
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 text-[13px] font-semibold text-green-800">
              {forumText.topic[locale]}
            </legend>
            <div className="flex flex-wrap gap-1.5">
              {topics.data?.map((candidate) => (
                <button
                  key={candidate.id}
                  type="button"
                  aria-pressed={candidate.id === topicId}
                  onClick={() => setChosenTopicId(candidate.id)}
                  className="focus-visible:focus-surface flex h-11 cursor-pointer items-center"
                >
                  <span
                    className={cn(
                      'rounded-md px-2.5 py-1.5 text-[13px] font-semibold',
                      candidate.id === topicId
                        ? 'bg-conveniat-green text-white'
                        : 'bg-chip text-green-800',
                    )}
                  >
                    {candidate.name}
                  </span>
                </button>
              ))}
            </div>
          </fieldset>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-green-800">
            {forumText.postTitle[locale]}
          </span>
          <input
            value={title}
            maxLength={FORUM_TITLE_MAX_LENGTH}
            placeholder={forumText.postTitlePlaceholder[locale]}
            onChange={(event) => setTitle(event.target.value)}
            className={textInputClassName}
          />
        </label>

        {location !== undefined && (
          <div className="border-line flex min-h-14 items-center gap-3 rounded-[14px] border bg-white px-3 py-2">
            <MapPin className="text-conveniat-green h-5 w-5 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold text-green-900">
                {location.label ?? forumText.pickedSpot[locale]}
              </span>
              <span className="text-[12px] text-green-700">
                {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
              </span>
            </span>
            <Link
              href={mapPickHref}
              onClick={keepDraft}
              className="focus-visible:focus-surface hover:bg-quiet flex h-11 items-center rounded-xl px-2 text-[13px] font-semibold text-green-800"
            >
              {forumText.changeLocation[locale]}
            </Link>
            <button
              type="button"
              onClick={() => setLocation(undefined)}
              aria-label={forumText.removeLocation[locale]}
              className="focus-visible:focus-surface hover:bg-quiet flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-green-700"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        )}

        {matching.length > 0 && (
          <section className="bg-quiet flex flex-col gap-2 rounded-[14px] p-3">
            <p className="flex items-center gap-1.5 text-[13px] font-semibold text-green-800">
              <Search className="h-4 w-4" aria-hidden="true" />
              {location === undefined
                ? forumText.alreadyReported[locale]
                : forumText.nearbyReported[locale]}
            </p>
            <ul className="flex flex-col gap-1.5">
              {matching.map((post) => (
                <li
                  key={post.id}
                  className="border-line flex items-center gap-2 rounded-xl border bg-white px-3 py-2"
                >
                  <Link
                    href={`/app/forum/${post.id}`}
                    className="focus-visible:focus-surface min-w-0 flex-1"
                  >
                    <span className="text-heading block truncate text-[14px] font-semibold">
                      {post.title}
                    </span>
                    <span className="text-[12px] text-green-700">
                      {forumStatusLabel[post.status][locale]} · {post.likeCount} 👍
                      {post.distanceMetres === undefined ? '' : ` · ${post.distanceMetres} m`}
                    </span>
                  </Link>
                  <button
                    type="button"
                    aria-pressed={post.likedByMe}
                    disabled={like.isPending}
                    onClick={() => like.mutate({ messageId: post.id, emoji: FORUM_LIKE_EMOJI })}
                    className={cn(
                      'focus-visible:focus-surface flex h-11 shrink-0 cursor-pointer items-center gap-1 rounded-xl border px-3 text-[13px] font-bold',
                      post.likedByMe
                        ? 'bg-conveniat-green border-conveniat-green text-white'
                        : 'border-tint-line bg-tint text-conveniat-green',
                    )}
                  >
                    <ThumbsUp
                      className={cn('h-4 w-4', post.likedByMe && 'fill-current')}
                      aria-hidden="true"
                    />
                    {forumText.likeShort[locale]}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-green-800">
            {forumText.description[locale]}
          </span>
          <textarea
            value={text}
            rows={4}
            maxLength={FORUM_TEXT_MAX_LENGTH}
            placeholder={forumText.descriptionPlaceholder[locale]}
            onChange={(event) => setText(event.target.value)}
            className={textInputClassName}
          />
        </label>

        {images.length > 0 && (
          <ul className="grid grid-cols-4 gap-2">
            {images.map((image) => (
              <li key={image.preview} className="relative aspect-square overflow-hidden rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element -- a local preview blob */}
                <img src={image.preview} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setImages((previous) => previous.filter((item) => item !== image))}
                  aria-label={forumText.removePhoto[locale]}
                  className="absolute top-1 right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/90 text-green-900"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex gap-2">
          <label
            className={cn(
              'border-line focus-within:ring-conveniat-green hover:bg-quiet flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border bg-white text-[14px] font-semibold text-green-900 focus-within:ring-2',
              images.length >= FORUM_POST_MAX_IMAGES && 'pointer-events-none opacity-50',
            )}
          >
            <Camera className="h-5 w-5" aria-hidden="true" />
            {forumText.photo[locale]}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => {
                addImage(event.target.files?.[0]);
                event.target.value = '';
              }}
            />
          </label>
          {location === undefined && (
            <Link
              href={mapPickHref}
              onClick={keepDraft}
              className="border-line focus-visible:focus-surface hover:bg-quiet flex h-11 flex-[1.4] items-center justify-center gap-2 rounded-xl border bg-white text-[14px] font-semibold text-green-900"
            >
              <MapPin className="h-5 w-5" aria-hidden="true" />
              {forumText.addLocation[locale]}
            </Link>
          )}
        </div>

        {error !== undefined && (
          <p
            role="alert"
            className="bg-danger-soft text-danger-text rounded-xl px-3 py-2 text-[13px] font-medium"
          >
            {error}
          </p>
        )}

        <div className="flex flex-col gap-2 pt-2">
          <button
            type="button"
            disabled={!canPublish}
            onClick={() => void publish()}
            className="bg-conveniat-green focus-visible:focus-surface-filled flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl text-[15px] font-bold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isBusy && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />}
            {isPrivate ? forumText.sendPrivately[locale] : forumText.publish[locale]}
          </button>
          <p className="text-center text-[12px] text-green-700">{publishHint[locale]}</p>
        </div>
      </div>
    </div>
  );
};
