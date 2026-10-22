'use client';

import { Button } from '@/components/ui/buttons/button';
import { EmptyState } from '@/components/ui/empty-state';
import { segmentClassName, segmentedTrackClassName } from '@/components/ui/segmented-control';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import {
  Camera,
  Check,
  Heart,
  Info,
  Loader2,
  Lock,
  LogIn,
  Minus,
  Plus,
  Trophy,
  X,
} from 'lucide-react';
import { signIn, useSession } from 'next-auth/react';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

type ContestStatus = 'HIDDEN' | 'ACTIVE' | 'CLOSED_HIDDEN' | 'CLOSED';

/** Coalesces a burst of taps into a single vote write. */
const AUTOSAVE_DELAY_MS = 600;

const translations = {
  eyebrow: {
    de: 'Foto-Wettbewerb',
    en: 'Photo contest',
    fr: 'Concours photo',
  },
  pointsLeftLabel: {
    de: 'Noch zu vergeben',
    en: 'Still to give',
    fr: 'Encore à donner',
  },
  statusActive: {
    de: 'Abstimmung offen',
    en: 'Voting open',
    fr: 'Vote ouvert',
  },
  statusClosed: {
    de: 'Abstimmung beendet',
    en: 'Voting closed',
    fr: 'Vote terminé',
  },
  statusResults: {
    de: 'Resultate',
    en: 'Results',
    fr: 'Résultats',
  },
  statusHidden: {
    de: 'Versteckt – nur für Admins sichtbar',
    en: 'Hidden – only visible to admins',
    fr: 'Masqué – visible seulement pour les admins',
  },
  rulesTitle: {
    de: 'So funktioniert’s',
    en: 'How it works',
    fr: 'Comment ça marche',
  },
  rulesBody: {
    de: 'Du hast {max} Punkte. Verteile sie auf ein einzelnes Foto oder auf mehrere Fotos – höchstens {perImage} Punkte pro Foto. Deine Stimmen werden automatisch gespeichert und lassen sich ändern, solange die Abstimmung offen ist.',
    en: 'You have {max} points. Give them to a single photo or spread them across several – at most {perImage} points per photo. Your votes are saved automatically and can be changed while voting is open.',
    fr: 'Tu as {max} points. Donne-les à une seule photo ou répartis-les sur plusieurs – au maximum {perImage} points par photo. Tes votes sont enregistrés automatiquement et peuvent être modifiés tant que le vote est ouvert.',
  },
  resultsHidden: {
    de: 'Die Abstimmung ist beendet. Die Resultate werden später veröffentlicht.',
    en: 'Voting has ended. The results will be published later.',
    fr: 'Le vote est terminé. Les résultats seront publiés plus tard.',
  },
  loginHint: {
    de: 'Melde dich an, um für deine Lieblingsfotos abzustimmen.',
    en: 'Sign in to vote for your favourite photos.',
    fr: 'Connecte-toi pour voter pour tes photos préférées.',
  },
  login: {
    de: 'Anmelden',
    en: 'Sign in',
    fr: 'Se connecter',
  },
  saving: {
    de: 'Wird gespeichert …',
    en: 'Saving …',
    fr: 'Enregistrement …',
  },
  allSaved: {
    de: 'Stimmen gespeichert',
    en: 'Votes saved',
    fr: 'Votes enregistrés',
  },
  noVote: {
    de: 'Noch nicht bewertet',
    en: 'Not rated yet',
    fr: 'Pas encore noté',
  },
  yourVote: {
    de: 'Deine Stimme',
    en: 'Your vote',
    fr: 'Ton vote',
  },
  point: {
    de: 'Punkt',
    en: 'point',
    fr: 'point',
  },
  points: {
    de: 'Punkte',
    en: 'points',
    fr: 'points',
  },
  addPoint: {
    de: 'Punkt hinzufügen',
    en: 'Add point',
    fr: 'Ajouter un point',
  },
  removePoint: {
    de: 'Punkt abziehen',
    en: 'Remove point',
    fr: 'Retirer un point',
  },
  totalPoints: {
    de: '{n} Punkte total',
    en: '{n} points in total',
    fr: '{n} points au total',
  },
  rank: {
    de: 'Platz {n}',
    en: 'Rank {n}',
    fr: 'Rang {n}',
  },
  photoAlt: {
    de: 'Foto {n}',
    en: 'Photo {n}',
    fr: 'Photo {n}',
  },
  closePreview: {
    de: 'Vorschau schliessen',
    en: 'Close preview',
    fr: 'Fermer l’aperçu',
  },
  emptyTitle: {
    de: 'Noch keine Fotos',
    en: 'No photos yet',
    fr: 'Pas encore de photos',
  },
  emptyBody: {
    de: 'Sobald die Fotos freigeschaltet sind, erscheinen sie hier.',
    en: 'The photos will appear here as soon as they are released.',
    fr: 'Les photos apparaîtront ici dès qu’elles seront publiées.',
  },
  noContestsTitle: {
    de: 'Kein Wettbewerb aktiv',
    en: 'No contest running',
    fr: 'Aucun concours en cours',
  },
  noContestsBody: {
    de: 'Zurzeit läuft kein Foto-Wettbewerb. Schau später nochmals vorbei!',
    en: 'There is no photo contest running right now. Check back later!',
    fr: 'Aucun concours photo n’est en cours. Reviens plus tard !',
  },
  loginRequiredToast: {
    de: 'Bitte melde dich an, um abzustimmen.',
    en: 'Please sign in to vote.',
    fr: 'Connecte-toi pour voter.',
  },
  noPointsLeftToast: {
    de: 'Du hast bereits alle {max} Punkte vergeben. Ziehe zuerst einen Punkt ab.',
    en: 'You have already given away all {max} points. Remove a point first.',
    fr: 'Tu as déjà donné tes {max} points. Retire d’abord un point.',
  },
  maxPerImageToast: {
    de: 'Pro Foto sind höchstens {perImage} Punkte möglich.',
    en: 'A photo can receive at most {perImage} points.',
    fr: 'Une photo peut recevoir au maximum {perImage} points.',
  },
} satisfies Record<string, StaticTranslationString>;

type TranslationKey = keyof typeof translations;

const interpolate = (template: string, values: Record<string, number | string>): string => {
  let result = template;
  for (const [key, value] of Object.entries(values)) {
    result = result.replaceAll(`{${key}}`, String(value));
  }
  return result;
};

const statusLabelKey: Record<ContestStatus, TranslationKey> = {
  HIDDEN: 'statusHidden',
  ACTIVE: 'statusActive',
  CLOSED_HIDDEN: 'statusClosed',
  CLOSED: 'statusResults',
};

const statusBadgeClassName: Record<ContestStatus, string> = {
  HIDDEN: 'bg-chip text-green-900',
  ACTIVE: 'bg-tint text-green-900',
  CLOSED_HIDDEN: 'bg-chip text-green-900',
  CLOSED: 'bg-tint text-green-900',
};

interface PhotoContestViewProperties {
  initialContestSlug?: string;
}

export const PhotoContestView: React.FC<PhotoContestViewProperties> = ({ initialContestSlug }) => {
  const { locale: localeParameter } = useParams<{ locale: Locale }>();
  const locale: Locale = localeParameter in translations.eyebrow ? localeParameter : 'de';
  const t = useCallback(
    (key: TranslationKey, values?: Record<string, number | string>): string =>
      values === undefined
        ? translations[key][locale]
        : interpolate(translations[key][locale], values),
    [locale],
  );

  const { status: authStatus } = useSession();
  const isAuthenticated = authStatus === 'authenticated';

  const [selectedSlug, setSelectedSlug] = useState<string | undefined>(initialContestSlug);
  const [selectedImage, setSelectedImage] = useState<string>();
  const [localOverrides, setLocalOverrides] = useState<Record<string, number>>();

  // A contest that is switched to ACTIVE has to appear on the next visit, even one within the
  // five minutes the default `refetchOnMount` would still trust the persisted list. The cached
  // value still renders instantly; it is only revalidated in the background.
  const contestsQuery = trpc.photoContest.getContests.useQuery(undefined, {
    refetchOnMount: 'always',
  });
  const contests = contestsQuery.data ?? [];

  // Without an explicit slug from the CMS block the page simply shows the newest contest.
  const activeSlug = selectedSlug ?? contests[0]?.slug;

  const currentContestQuery = trpc.photoContest.getContestBySlug.useQuery(
    { slug: activeSlug ?? '' },
    { enabled: activeSlug !== undefined, refetchOnMount: 'always' },
  );

  // Votes save themselves, so the last acknowledged allocation — not a refetch — is what the
  // local draft is compared against. Refetching here would briefly replace the tapped state
  // with the pre-save server state and make the gallery flicker on every tap.
  const [lastSavedVotes, setLastSavedVotes] = useState<Record<string, number>>();

  const castVotesMutation = trpc.photoContest.castVotes.useMutation();

  const contest = currentContestQuery.data;
  const status = contest?.status;
  const isVotingOpen = status === 'ACTIVE';
  const showResults = status === 'CLOSED';

  const serverVotesMap = useMemo(() => {
    const votes = contest?.myVotes;
    if (!votes) return {};
    return votes.reduce<Record<string, number>>((accumulator, item) => {
      accumulator[item.imageId] = item.points;
      return accumulator;
    }, {});
  }, [contest?.myVotes]);

  const localVotes = localOverrides ?? serverVotesMap;

  const maxPoints = contest?.maxPointsPerUser ?? 2;
  const maxPointsPerImage = contest?.maxPointsPerImage ?? 2;

  const pointsAllocated = useMemo(
    () => Object.values(localVotes).reduce((sum, points) => sum + points, 0),
    [localVotes],
  );
  const pointsRemaining = Math.max(0, maxPoints - pointsAllocated);

  const savedVotes = lastSavedVotes ?? serverVotesMap;

  const hasUnsavedChanges = useMemo(() => {
    const imageIds = new Set([...Object.keys(savedVotes), ...Object.keys(localVotes)]);
    for (const imageId of imageIds) {
      if ((savedVotes[imageId] ?? 0) !== (localVotes[imageId] ?? 0)) return true;
    }
    return false;
  }, [savedVotes, localVotes]);

  const handleLogin = useCallback((): void => {
    void signIn('cevi-db', { callbackUrl: globalThis.location.href });
  }, []);

  const contestId = contest?.id;

  // Every tap writes through. The short delay coalesces a burst of taps into one request
  // instead of firing a full vote replacement per button press.
  const saveTimerReference = useRef<ReturnType<typeof setTimeout>>(undefined);
  const latestSaveReference = useRef(0);

  // castVotes replaces the user's whole allocation for the contest, so two writes in flight at
  // once can commit in either order and leave the older allocation in the database while the UI
  // reports the newer one as saved. Writes are therefore chained rather than fired in parallel:
  // at most one is ever outstanding, and the next one starts only once it has committed.
  const saveQueueReference = useRef<Promise<void>>(Promise.resolve());

  useEffect(
    () => (): void => {
      clearTimeout(saveTimerReference.current);
    },
    [],
  );

  const applyVotes = useCallback(
    (nextVotes: Record<string, number>): void => {
      setLocalOverrides(nextVotes);

      if (contestId === undefined) return;

      clearTimeout(saveTimerReference.current);
      saveTimerReference.current = setTimeout(() => {
        latestSaveReference.current += 1;
        const saveId = latestSaveReference.current;

        saveQueueReference.current = saveQueueReference.current.then(async (): Promise<void> => {
          // Another tap landed while this one waited for its turn, so this allocation is already
          // obsolete. Skipping it entirely — rather than only ignoring its reply — is what keeps
          // a superseded write from reaching the database at all.
          if (saveId !== latestSaveReference.current) return;

          try {
            await castVotesMutation.mutateAsync({
              contestId,
              allocations: Object.entries(nextVotes)
                .map(([imageId, points]) => ({ imageId, points }))
                .filter((allocation) => allocation.points > 0),
            });
            setLastSavedVotes(nextVotes);
          } catch (error) {
            toast.error(error instanceof Error ? error.message : String(error));
            // Fall back to what the server actually holds rather than leaving a lie on screen.
            setLocalOverrides(undefined);
            setLastSavedVotes(undefined);
            void currentContestQuery.refetch();
          }
        });
      }, AUTOSAVE_DELAY_MS);
    },
    [contestId, castVotesMutation, currentContestQuery],
  );

  const handleAddPoint = (imageId: string): void => {
    if (!isAuthenticated) {
      toast.error(t('loginRequiredToast'));
      handleLogin();
      return;
    }

    const currentForImage = localVotes[imageId] ?? 0;
    if (pointsRemaining <= 0) {
      toast.error(t('noPointsLeftToast', { max: maxPoints }));
      return;
    }
    if (currentForImage >= maxPointsPerImage) {
      toast.error(t('maxPerImageToast', { perImage: maxPointsPerImage }));
      return;
    }

    applyVotes({ ...localVotes, [imageId]: currentForImage + 1 });
  };

  const handleRemovePoint = (imageId: string): void => {
    const currentForImage = localVotes[imageId] ?? 0;
    if (currentForImage <= 0) return;

    const next = { ...localVotes };
    if (currentForImage === 1) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete next[imageId];
    } else {
      next[imageId] = currentForImage - 1;
    }
    applyVotes(next);
  };

  // In a closed contest the gallery becomes a ranking.
  const orderedImages = useMemo(() => {
    const images = contest?.images ?? [];
    if (!showResults) return images.map((image, index) => ({ image, rank: index + 1 }));

    return [...images]
      .sort((a, b) => (contest?.voteCounts[b.id] ?? 0) - (contest?.voteCounts[a.id] ?? 0))
      .map((image, index) => ({ image, rank: index + 1 }));
  }, [contest?.images, contest?.voteCounts, showResults]);

  // "Saving" covers both the queued debounce window and the request itself, so the label never
  // claims the votes are stored while a write is still outstanding.
  const isSaving = hasUnsavedChanges || castVotesMutation.isPending;

  const showStickyBar = isVotingOpen && isAuthenticated && contest !== undefined;
  // isFetching, not just isPending: a persisted empty result would otherwise flash the
  // "no contest" card while the revalidation that finds the live contest is still in flight.
  const isEverythingLoaded =
    !contestsQuery.isPending &&
    !contestsQuery.isFetching &&
    (activeSlug === undefined ||
      (!currentContestQuery.isPending && !currentContestQuery.isFetching));

  return (
    <div className={cn('mx-auto max-w-3xl px-4 pt-4 pb-6', showStickyBar && 'pb-28')}>
      {/* ---- Contest switcher ---- sits above the intro card, because the description, the
           rules and the point budget below it all belong to the selected contest. ---- */}
      {contests.length > 1 && (
        <div className={cn(segmentedTrackClassName, 'mb-4 w-full items-stretch overflow-x-auto')}>
          {contests.map((contestItem) => {
            const isSelected = activeSlug === contestItem.slug;

            return (
              <button
                key={contestItem.id}
                type="button"
                onClick={() => {
                  // A contest switch must not carry the draft of the previous contest over.
                  setLocalOverrides(undefined);
                  setLastSavedVotes(undefined);
                  setSelectedSlug(contestItem.slug);
                }}
                aria-pressed={isSelected}
                className={cn(segmentClassName(isSelected), 'flex-1 px-3 whitespace-nowrap')}
              >
                <span className="text-sm font-semibold">{contestItem.title}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ---- Intro ---- */}
      {contest !== undefined && (
        <div className="border-line rounded-[14px] border bg-white p-4">
          <span className="text-xs font-bold tracking-[0.08em] text-green-700 uppercase">
            {t('eyebrow')}
          </span>
          <h1 className="font-heading text-heading mt-1 text-[28px] leading-[1.15] font-extrabold">
            {contest.title}
          </h1>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'rounded-md px-1.5 py-0.5 text-xs font-bold',
                statusBadgeClassName[status ?? 'HIDDEN'],
              )}
            >
              {t(statusLabelKey[status ?? 'HIDDEN'])}
            </span>
          </div>

          {contest.description !== null && contest.description.length > 0 && (
            <p className="mt-3 text-[15px] leading-relaxed text-green-700">{contest.description}</p>
          )}

          {/* Points meter — the single place that answers "how many votes do I have left?" */}
          {isVotingOpen && isAuthenticated && (
            <div className="bg-tint mt-4 flex items-center gap-4 rounded-xl px-4 py-3">
              <div className="flex items-center gap-1.5">
                {Array.from({ length: maxPoints }, (_, index) => (
                  <Heart
                    key={index}
                    className={cn(
                      'size-5',
                      index < pointsAllocated
                        ? 'text-conveniat-green fill-current'
                        : 'fill-none text-green-500',
                    )}
                  />
                ))}
              </div>
              <div className="text-sm leading-tight">
                <div className="text-[15px] font-bold text-green-900 tabular-nums">
                  {pointsRemaining} / {maxPoints}
                </div>
                <div className="text-[13px] text-green-700">{t('pointsLeftLabel')}</div>
              </div>
            </div>
          )}

          {isVotingOpen && !isAuthenticated && (
            <div className="bg-tint mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2.5 text-sm text-green-900">
                <LogIn className="text-conveniat-green size-4 shrink-0" />
                <span>{t('loginHint')}</span>
              </div>
              <Button type="button" variant="primary" size="touch" onClick={handleLogin}>
                {t('login')}
              </Button>
            </div>
          )}

          {isVotingOpen && (
            <div className="mt-3 flex items-start gap-2.5 text-[13px] leading-relaxed text-green-700">
              <Info className="mt-0.5 size-4 shrink-0 text-green-500" aria-hidden="true" />
              <p>
                <span className="font-bold text-green-900">{t('rulesTitle')}: </span>
                {t('rulesBody', { max: maxPoints, perImage: maxPointsPerImage })}
              </p>
            </div>
          )}

          {status === 'CLOSED_HIDDEN' && (
            <div className="bg-quiet mt-4 flex items-start gap-2.5 rounded-[14px] px-4 py-3 text-[13px] leading-relaxed text-green-900">
              <Lock className="mt-0.5 size-4 shrink-0 text-green-700" aria-hidden="true" />
              <p>{t('resultsHidden')}</p>
            </div>
          )}
        </div>
      )}

      {/* ---- Gallery ---- */}
      {contest !== undefined && contest.images.length > 0 && (
        <div className="mt-4 flex flex-col gap-4">
          {orderedImages.map(({ image, rank }) => {
            const myPoints = localVotes[image.id] ?? 0;
            const isVoted = myPoints > 0;
            const totalPoints = contest.voteCounts[image.id] ?? 0;

            return (
              <div
                key={image.id}
                className={cn(
                  'overflow-hidden rounded-[14px] border bg-white transition-colors',
                  isVoted ? 'border-conveniat-green ring-conveniat-green ring-1' : 'border-line',
                )}
              >
                <button
                  type="button"
                  onClick={() => setSelectedImage(image.imageUrl)}
                  className="bg-quiet relative block w-full cursor-zoom-in"
                >
                  <Image
                    src={image.imageUrl}
                    alt={image.title ?? t('photoAlt', { n: rank })}
                    width={1200}
                    height={900}
                    sizes="(max-width: 768px) 100vw, 768px"
                    className="h-auto w-full object-cover"
                  />

                  {/* The voted marker is the loudest thing on the card on purpose. */}
                  {isVoted && (
                    <span className="bg-conveniat-green absolute top-3 right-3 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold text-white shadow-md">
                      <Heart className="size-4 fill-current" />
                      {myPoints}
                    </span>
                  )}

                  {showResults && rank <= 3 && (
                    <span className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-sm font-bold text-green-900 shadow-md backdrop-blur-xs">
                      <Trophy className="size-4" />
                      {t('rank', { n: rank })}
                    </span>
                  )}
                </button>

                {/* ---- Card footer ---- */}
                <div
                  className={cn(
                    'flex items-center justify-between gap-3 px-4 py-3 transition-colors',
                    isVoted ? 'bg-tint' : 'bg-white',
                  )}
                >
                  <div className="min-w-0">
                    {image.title !== null && image.title.length > 0 && (
                      <p className="truncate text-[15px] font-semibold text-green-900">
                        {image.title}
                      </p>
                    )}
                    {isVotingOpen && (
                      <p
                        className={cn(
                          'text-[13px] font-medium',
                          isVoted ? 'text-green-900' : 'text-green-700',
                        )}
                      >
                        {isVoted
                          ? `${myPoints} ${myPoints === 1 ? t('point') : t('points')}`
                          : t('noVote')}
                      </p>
                    )}
                    {/* Once voting is over the user keeps seeing what they voted for, in both
                        closed states — only the overall tally is held back until CLOSED. */}
                    {!isVotingOpen && isVoted && (
                      <p className="text-[13px] font-medium text-green-900">
                        {t('yourVote')}: {myPoints} {myPoints === 1 ? t('point') : t('points')}
                      </p>
                    )}
                    {showResults && (
                      <p className="text-[13px] font-bold text-green-700">
                        {t('totalPoints', { n: totalPoints })}
                      </p>
                    )}
                  </div>

                  {isVotingOpen && (
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleRemovePoint(image.id)}
                        disabled={myPoints === 0}
                        aria-label={t('removePoint')}
                        className="border-rail hover:bg-quiet flex size-11 cursor-pointer items-center justify-center rounded-full border bg-white text-green-900 transition-colors disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <Minus className="size-4" />
                      </button>

                      <span
                        className={cn(
                          'flex min-w-11 items-center justify-center gap-1 text-base font-bold tabular-nums',
                          isVoted ? 'text-conveniat-green' : 'text-green-500',
                        )}
                      >
                        <Heart className={cn('size-5', isVoted && 'fill-current')} />
                        {myPoints}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleAddPoint(image.id)}
                        disabled={
                          isAuthenticated &&
                          (pointsRemaining === 0 || myPoints >= maxPointsPerImage)
                        }
                        aria-label={t('addPoint')}
                        className="bg-conveniat-green flex size-11 cursor-pointer items-center justify-center rounded-full text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <Plus className="size-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ---- Empty states ---- */}
      {contest?.images.length === 0 && (
        <EmptyState
          icon={Camera}
          title={t('emptyTitle')}
          description={t('emptyBody')}
          className="mt-4"
        />
      )}

      {isEverythingLoaded && contest === undefined && (
        <EmptyState icon={Trophy} title={t('noContestsTitle')} description={t('noContestsBody')} />
      )}

      {/* ---- Sticky status bar, above the app nav bar ---- */}
      {showStickyBar && (
        <div className="border-line fixed bottom-20 left-0 z-30 w-full border-t bg-white/95 px-4 py-3 backdrop-blur-sm xl:left-[480px] xl:w-[calc(100%-480px)]">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <div className="text-[15px] font-bold text-green-900 tabular-nums">
              {pointsAllocated} / {maxPoints} {t('points')}
            </div>

            {/* Votes write themselves through, so this only reports the state — never asks. */}
            <div
              className={cn(
                'flex shrink-0 items-center gap-1.5 text-[13px] font-semibold',
                isSaving ? 'text-green-700' : 'text-conveniat-green',
              )}
            >
              {isSaving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              {isSaving ? t('saving') : t('allSaved')}
            </div>
          </div>
        </div>
      )}

      {/* ---- Lightbox ---- */}
      {selectedImage !== undefined && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/90 p-4"
          onClick={() => setSelectedImage(undefined)}
        >
          <button
            type="button"
            aria-label={t('closePreview')}
            onClick={() => setSelectedImage(undefined)}
            className="absolute top-4 right-4 flex size-11 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <X className="size-6" />
          </button>
          <div className="relative h-full max-h-[85vh] w-full max-w-4xl">
            <Image src={selectedImage} alt="" fill unoptimized className="object-contain" />
          </div>
        </div>
      )}
    </div>
  );
};
