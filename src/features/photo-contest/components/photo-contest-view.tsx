'use client';

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
  HIDDEN: 'border-gray-300 bg-gray-100 text-gray-700',
  ACTIVE: 'border-green-300 bg-green-100 text-conveniat-green',
  CLOSED_HIDDEN: 'border-gray-300 bg-gray-100 text-gray-700',
  CLOSED: 'border-green-300 bg-green-100 text-conveniat-green',
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

  // The global query client sets refetchOnMount: false and keeps the persisted cache for 72h.
  // A contest that is switched to ACTIVE would therefore stay invisible for days to anyone who
  // had opened this page before. The cached value still renders instantly; it is only revalidated
  // in the background.
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
    void (async (): Promise<void> => {
      const response = await signIn('cevi-db', {
        redirect: false,
        callbackUrl: globalThis.location.href,
      });
      if (typeof response.url === 'string') {
        globalThis.location.href = response.url;
      }
    })();
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
    <div className={cn('mx-auto max-w-3xl px-4 py-6', showStickyBar && 'pb-28')}>
      {/* ---- Contest switcher ---- sits above the intro card, because the description, the
           rules and the point budget below it all belong to the selected contest. ---- */}
      {contests.length > 1 && (
        <div className="mb-4 flex w-full items-center gap-1 overflow-x-auto rounded-2xl border border-gray-100 bg-white p-1.5 shadow-xs">
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
                className={cn(
                  'flex-1 cursor-pointer rounded-xl px-3 py-2 whitespace-nowrap transition-all',
                  isSelected
                    ? 'bg-conveniat-green scale-102 text-white shadow-xs'
                    : 'text-gray-600 hover:bg-gray-100/70 hover:text-gray-900',
                )}
              >
                <span className="font-heading text-xs leading-none font-bold">
                  {contestItem.title}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ---- Intro ---- */}
      {contest !== undefined && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
          <span className="text-conveniat-green text-xs font-bold tracking-wider uppercase">
            {t('eyebrow')}
          </span>
          <h1 className="font-heading text-conveniat-green mt-1 text-2xl font-bold tracking-tight">
            {contest.title}
          </h1>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'rounded-full border px-2.5 py-0.5 text-xs font-bold',
                statusBadgeClassName[status ?? 'HIDDEN'],
              )}
            >
              {t(statusLabelKey[status ?? 'HIDDEN'])}
            </span>
          </div>

          {contest.description !== null && contest.description.length > 0 && (
            <p className="mt-3 text-sm leading-relaxed text-gray-600">{contest.description}</p>
          )}

          {/* Points meter — the single place that answers "how many votes do I have left?" */}
          {isVotingOpen && isAuthenticated && (
            <div className="mt-4 flex items-center gap-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
              <div className="flex items-center gap-1.5">
                {Array.from({ length: maxPoints }, (_, index) => (
                  <Heart
                    key={index}
                    className={cn(
                      'size-5',
                      index < pointsAllocated
                        ? 'text-cevi-red fill-current'
                        : 'fill-none text-green-300',
                    )}
                  />
                ))}
              </div>
              <div className="text-sm leading-tight">
                <div className="text-conveniat-green font-bold">
                  {pointsRemaining} / {maxPoints}
                </div>
                <div className="text-xs text-gray-600">{t('pointsLeftLabel')}</div>
              </div>
            </div>
          )}

          {isVotingOpen && !isAuthenticated && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
              <div className="flex items-center gap-2.5 text-sm text-gray-700">
                <LogIn className="text-conveniat-green size-4 shrink-0" />
                <span>{t('loginHint')}</span>
              </div>
              <button
                type="button"
                onClick={handleLogin}
                className="bg-conveniat-green cursor-pointer rounded-lg px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-green-700"
              >
                {t('login')}
              </button>
            </div>
          )}

          {isVotingOpen && (
            <div className="mt-3 flex items-start gap-2.5 text-xs leading-relaxed text-gray-600">
              <Info className="mt-0.5 size-4 shrink-0 text-gray-400" />
              <p>
                <span className="font-bold text-gray-700">{t('rulesTitle')}: </span>
                {t('rulesBody', { max: maxPoints, perImage: maxPointsPerImage })}
              </p>
            </div>
          )}

          {status === 'CLOSED_HIDDEN' && (
            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs leading-relaxed text-gray-600">
              <Lock className="mt-0.5 size-4 shrink-0 text-gray-400" />
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
                  'overflow-hidden rounded-2xl border bg-white transition-colors',
                  isVoted
                    ? 'border-conveniat-green ring-conveniat-green/20 shadow-md ring-2'
                    : 'border-gray-200 shadow-xs',
                )}
              >
                <button
                  type="button"
                  onClick={() => setSelectedImage(image.imageUrl)}
                  className="relative block w-full cursor-zoom-in bg-gray-100"
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
                    <span className="bg-cevi-red absolute top-3 right-3 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold text-white shadow-lg">
                      <Heart className="size-4 fill-current" />
                      {myPoints}
                    </span>
                  )}

                  {showResults && rank <= 3 && (
                    <span className="text-conveniat-green absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-sm font-bold shadow-md backdrop-blur-xs">
                      <Trophy className="size-4" />
                      {t('rank', { n: rank })}
                    </span>
                  )}
                </button>

                {/* ---- Card footer ---- */}
                <div
                  className={cn(
                    'flex items-center justify-between gap-3 px-4 py-3 transition-colors',
                    isVoted ? 'bg-green-50' : 'bg-white',
                  )}
                >
                  <div className="min-w-0">
                    {image.title !== null && image.title.length > 0 && (
                      <p className="truncate text-sm font-bold text-gray-900">{image.title}</p>
                    )}
                    {isVotingOpen && (
                      <p
                        className={cn(
                          'text-xs font-medium',
                          isVoted ? 'text-conveniat-green' : 'text-gray-500',
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
                      <p className="text-conveniat-green text-xs font-medium">
                        {t('yourVote')}: {myPoints} {myPoints === 1 ? t('point') : t('points')}
                      </p>
                    )}
                    {showResults && (
                      <p className="text-xs font-bold text-gray-700">
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
                        className="flex size-10 cursor-pointer items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <Minus className="size-4" />
                      </button>

                      <span
                        className={cn(
                          'flex min-w-11 items-center justify-center gap-1 text-base font-bold',
                          isVoted ? 'text-cevi-red' : 'text-gray-300',
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
                        className="bg-conveniat-green flex size-10 cursor-pointer items-center justify-center rounded-full text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-30"
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
        <div className="mt-4 flex flex-col items-center rounded-2xl border border-gray-200 bg-white px-6 py-12 text-center shadow-xs">
          <Camera className="text-conveniat-green size-10" />
          <h2 className="mt-3 text-base font-bold text-gray-900">{t('emptyTitle')}</h2>
          <p className="mt-1 max-w-sm text-sm text-balance text-gray-600">{t('emptyBody')}</p>
        </div>
      )}

      {isEverythingLoaded && contest === undefined && (
        <div className="mt-4 flex flex-col items-center rounded-2xl border border-gray-200 bg-white px-6 py-12 text-center shadow-xs">
          <Trophy className="text-conveniat-green size-10" />
          <h2 className="mt-3 text-base font-bold text-gray-900">{t('noContestsTitle')}</h2>
          <p className="mt-1 max-w-sm text-sm text-balance text-gray-600">{t('noContestsBody')}</p>
        </div>
      )}

      {/* ---- Sticky status bar, above the app nav bar ---- */}
      {showStickyBar && (
        <div className="fixed bottom-20 left-0 z-30 w-full border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur-sm xl:left-[480px] xl:w-[calc(100%-480px)]">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <div className="text-conveniat-green text-sm font-bold">
              {pointsAllocated} / {maxPoints} {t('points')}
            </div>

            {/* Votes write themselves through, so this only reports the state — never asks. */}
            <div
              className={cn(
                'flex shrink-0 items-center gap-1.5 text-xs font-bold',
                isSaving ? 'text-gray-500' : 'text-conveniat-green',
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
            className="absolute top-4 right-4 cursor-pointer rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
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
