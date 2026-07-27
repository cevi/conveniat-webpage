'use client';

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/trpc/client';
import { Award, Camera, CheckCircle2, Heart, Info, LogIn, Sparkles, Trophy, X } from 'lucide-react';
import { signIn, useSession } from 'next-auth/react';
import Image from 'next/image';
import React, { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

interface PhotoContestViewProperties {
  initialContestSlug?: string;
}

function getBadgeVariant(
  status: 'DRAFT' | 'UPLOADING' | 'VOTING' | 'CLOSED',
): 'default' | 'secondary' | 'destructive' {
  if (status === 'VOTING') return 'default';
  if (status === 'UPLOADING') return 'secondary';
  return 'destructive';
}

function getBadgeClassName(status: 'DRAFT' | 'UPLOADING' | 'VOTING' | 'CLOSED'): string {
  if (status === 'VOTING') return 'bg-emerald-700 text-white font-bold';
  if (status === 'UPLOADING') return 'bg-blue-700 text-white font-bold';
  if (status === 'DRAFT') return 'bg-amber-600 text-white font-bold';
  return 'bg-slate-700 text-white font-bold';
}

export const PhotoContestView: React.FC<PhotoContestViewProperties> = ({
  initialContestSlug = 'cevi-schweiz',
}) => {
  const { status: authStatus } = useSession();
  const isAuthenticated = authStatus === 'authenticated';

  const [activeSlug, setActiveSlug] = useState<string>(initialContestSlug);
  const [selectedImage, setSelectedImage] = useState<string>();

  // tRPC Queries
  const contestsQuery = trpc.photoContest.getContests.useQuery();
  const currentContestQuery = trpc.photoContest.getContestBySlug.useQuery(
    { slug: activeSlug },
    { enabled: activeSlug.length > 0 },
  );

  // Voting Mutation
  const castVotesMutation = trpc.photoContest.castVotes.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      void currentContestQuery.refetch();
      void contestsQuery.refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const contest = currentContestQuery.data;
  const myVotes = contest?.myVotes;

  // Compute server votes map
  const serverVotesMap = useMemo(() => {
    if (!myVotes) return {};
    return myVotes.reduce(
      (accumulator, item) => {
        accumulator[item.imageId] = item.points;
        return accumulator;
      },
      {} as Record<string, number>,
    );
  }, [myVotes]);

  // Local user overrides for voting allocations
  const [localOverrides, setLocalOverrides] = useState<Record<string, number>>();

  const localVotes = localOverrides ?? serverVotesMap;

  const maxPoints = contest?.maxPointsPerUser ?? 2;
  const currentPointsAllocated = useMemo(() => {
    return Object.values(localVotes).reduce((sum, pts) => sum + pts, 0);
  }, [localVotes]);

  const pointsRemaining = maxPoints - currentPointsAllocated;

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

  const handleAddPoint = (imageId: string): void => {
    if (!isAuthenticated) {
      toast.error('Bitte melde dich an, um abzustimmen.');
      handleLogin();
      return;
    }

    const currentForImage = localVotes[imageId] ?? 0;
    if (pointsRemaining <= 0) {
      toast.error(`Du hast bereits alle ${maxPoints} Punkte verteilt!`);
      return;
    }
    if (currentForImage >= (contest?.maxPointsPerImage ?? 2)) {
      toast.error(`Maximal ${contest?.maxPointsPerImage ?? 2} Punkte pro Bild erlaubt.`);
      return;
    }
    setLocalOverrides({
      ...localVotes,
      [imageId]: currentForImage + 1,
    });
  };

  const handleRemovePoint = (imageId: string): void => {
    if (!isAuthenticated) return;

    const currentForImage = localVotes[imageId] ?? 0;
    if (currentForImage <= 0) return;

    const next = { ...localVotes };
    if (currentForImage === 1) {
      delete next[imageId];
    } else {
      next[imageId] = currentForImage - 1;
    }
    setLocalOverrides(next);
  };

  const handleResetVotes = (): void => {
    setLocalOverrides({});
  };

  const handleSaveVotes = (): void => {
    if (!isAuthenticated) {
      toast.error('Bitte melde dich an, um abzustimmen.');
      handleLogin();
      return;
    }

    if (!contest) return;

    const allocations = Object.entries(localVotes)
      .map(([imageId, points]) => ({ imageId, points }))
      .filter((a) => a.points > 0);

    castVotesMutation.mutate({
      contestId: contest.id,
      allocations,
    });
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {/* Header Banner */}
      <div className="relative mb-6 overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-xs">
        <div className="relative z-10 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="border-conveniat-green/20 bg-conveniat-green/10 text-conveniat-green inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-xs font-bold">
              <span className="bg-conveniat-green size-2 animate-pulse rounded-full" />
              <span>Konekta Foto-Wettbewerbe</span>
            </div>
            <h1 className="mt-2.5 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              Abstimmung & Galerie
            </h1>
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed font-medium text-gray-600">
              Wähle deine Favoriten! Du hast 2 Punkte: Vergabe von 2 Punkten an ein einziges Bild
              ODER je 1 Punkt an 2 verschiedene Bilder.
            </p>
          </div>

          {/* Points Status Widget / Auth Badge */}
          {contest?.status === 'VOTING' &&
            (isAuthenticated ? (
              <div className="border-conveniat-green/20 bg-conveniat-green/10 flex min-w-[160px] flex-col items-center rounded-xl border p-4 shadow-2xs">
                <span className="text-conveniat-green text-xs font-bold tracking-wider uppercase">
                  Verbleibend
                </span>
                <div className="text-conveniat-green my-1 text-3xl font-black">
                  {pointsRemaining} / {maxPoints}
                </div>
                <span className="text-[11px] font-medium text-gray-600">Punkte zu vergeben</span>
              </div>
            ) : (
              <button
                onClick={handleLogin}
                className="bg-conveniat-green flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-bold text-white shadow-xs transition-all hover:bg-green-700"
              >
                <LogIn className="size-4" />
                <span>Anmelden zum Abstimmen</span>
              </button>
            ))}
        </div>
      </div>

      {/* Contest Selector Tabs */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        {contestsQuery.data && contestsQuery.data.length > 0 ? (
          <div className="flex flex-wrap gap-2.5">
            {contestsQuery.data.map((contestItem) => (
              <button
                key={contestItem.id}
                onClick={() => {
                  setActiveSlug(contestItem.slug);
                  setLocalOverrides(undefined);
                }}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold shadow-xs transition-all ${
                  activeSlug === contestItem.slug
                    ? 'border border-emerald-600 bg-emerald-700 text-white shadow-md ring-2 ring-emerald-500'
                    : 'border border-gray-300 bg-white text-gray-800 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {contestItem.contestType === 'PRESELECTED' ? (
                  <Award className="size-4 text-amber-500" />
                ) : (
                  <Sparkles className="size-4 text-blue-500" />
                )}
                <span>{contestItem.title}</span>
                {contestItem.status === 'VOTING' && (
                  <span className="ml-1.5 rounded-full border border-emerald-300 bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">
                    Aktiv
                  </span>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex w-full flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-xs">
            <Trophy className="mb-2 size-10 text-emerald-600" />
            <h3 className="text-base font-bold text-gray-900">Keine Wettbewerbe verfügbar</h3>
            <p className="mt-1 max-w-md text-sm text-gray-600">
              Derzeit wurden noch keine aktiven Foto-Wettbewerbe freigeschaltet.
            </p>
          </div>
        )}
      </div>

      {/* Main Contest Info & Rules Card */}
      {contest && (
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-xl font-bold text-gray-900">{contest.title}</h2>
                <Badge
                  variant={getBadgeVariant(contest.status)}
                  className={getBadgeClassName(contest.status)}
                >
                  {contest.status === 'VOTING' && 'Abstimmung Aktiv'}
                  {contest.status === 'UPLOADING' && 'Live Uploads Aktiv'}
                  {contest.status === 'DRAFT' && 'Vorbereitung'}
                  {contest.status === 'CLOSED' && 'Abgeschlossen'}
                </Badge>
              </div>
              {contest.description !== null && contest.description.length > 0 && (
                <p className="mt-1.5 text-sm font-medium text-gray-600">{contest.description}</p>
              )}
            </div>

            {/* Voting Action Buttons */}
            {contest.status === 'VOTING' &&
              (isAuthenticated ? (
                <div className="flex items-center gap-3">
                  {currentPointsAllocated > 0 && (
                    <button
                      onClick={handleResetVotes}
                      className="rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 transition-all hover:bg-gray-100"
                    >
                      Zurücksetzen
                    </button>
                  )}
                  <button
                    onClick={handleSaveVotes}
                    disabled={castVotesMutation.isPending}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-emerald-800 disabled:opacity-50"
                  >
                    <CheckCircle2 className="size-4" />
                    Stimmen Speichern ({currentPointsAllocated} Pkt)
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleLogin}
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-amber-700"
                >
                  <LogIn className="size-4" />
                  Anmelden zum Abstimmen
                </button>
              ))}
          </div>

          {/* Voting Rules Info Box / Login Banner */}
          {!isAuthenticated && contest.status === 'VOTING' ? (
            <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-amber-300 bg-amber-50 p-4 font-medium text-amber-950 shadow-2xs">
              <div className="flex items-center gap-3">
                <LogIn className="size-5 shrink-0 text-amber-700" />
                <span className="text-xs font-semibold sm:text-sm">
                  Nur angemeldete Benutzer können an der Abstimmung teilnehmen.
                </span>
              </div>
              <button
                onClick={handleLogin}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition-all hover:bg-amber-700"
              >
                Jetzt Anmelden
              </button>
            </div>
          ) : (
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-950 sm:text-sm">
              <Info className="mt-0.5 size-4 shrink-0 text-emerald-700" />
              <div>
                <span className="font-bold">Regel zur Punktevergabe:</span> Jeder Teilnehmende hat 2
                Punkte. Du kannst entweder <strong>2 Punkte für 1 Bild</strong> vergeben oder{' '}
                <strong>je 1 Punkt für 2 verschiedene Bilder</strong>. Mehrfache Abstimmungen vom
                selben Account sind ausgeschlossen.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Image Gallery & Point Allocation Grid */}
      {contest !== undefined && contest.images.length > 0 && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {contest.images.map((img, index) => {
            const votesForThisImage = localVotes[img.id] ?? 0;
            const totalTally = contest.voteCounts[img.id];

            return (
              <div
                key={img.id}
                className={`group relative overflow-hidden rounded-2xl border shadow-xs transition-all ${
                  votesForThisImage > 0
                    ? 'border-emerald-600 bg-emerald-50/40 shadow-md ring-2 ring-emerald-500/50'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                }`}
              >
                {/* Image Container */}
                <div
                  className="relative aspect-4/3 cursor-pointer overflow-hidden bg-gray-100"
                  onClick={() => setSelectedImage(img.imageUrl)}
                >
                  <Image
                    src={img.imageUrl}
                    alt={img.title ?? `Foto ${index + 1}`}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />

                  <span className="absolute top-3 left-3 rounded-full bg-slate-900/80 px-2.5 py-1 text-xs font-bold text-white shadow-xs backdrop-blur-md">
                    #{index + 1}
                  </span>

                  {/* Allocated Points Badge */}
                  {votesForThisImage > 0 && (
                    <div className="animate-in zoom-in-50 absolute top-3 right-3 flex items-center gap-1 rounded-full border border-emerald-500 bg-emerald-700 px-3 py-1 text-xs font-extrabold text-white shadow-lg">
                      <Heart className="size-3.5 fill-current text-white" />
                      <span>
                        {votesForThisImage} {votesForThisImage === 1 ? 'Punkt' : 'Punkte'}
                      </span>
                    </div>
                  )}

                  {/* Total vote tally if closed */}
                  {totalTally !== undefined && (
                    <div className="absolute bottom-3 left-3 rounded-lg border border-amber-400 bg-amber-500 px-2.5 py-1 text-xs font-extrabold text-white shadow-md">
                      Gesamt: {totalTally} Pkt
                    </div>
                  )}
                </div>

                {/* Card Info & Voting Controls */}
                <div className="p-4">
                  {img.title !== null && img.title.length > 0 && (
                    <h3 className="text-sm font-bold text-gray-900">{img.title}</h3>
                  )}
                  {img.description !== null && img.description.length > 0 && (
                    <p className="mt-1 line-clamp-2 text-xs text-gray-600">{img.description}</p>
                  )}

                  {contest.status === 'VOTING' && (
                    <div className="mt-4 flex items-center justify-between gap-2 border-t border-gray-200 pt-3">
                      <div className="text-xs font-medium text-gray-600">
                        {votesForThisImage > 0 ? (
                          <span className="font-bold text-emerald-800">
                            {votesForThisImage} {votesForThisImage === 1 ? 'Punkt' : 'Punkte'}{' '}
                            zugewiesen
                          </span>
                        ) : (
                          'Keine Punkte'
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {votesForThisImage > 0 && (
                          <button
                            onClick={() => handleRemovePoint(img.id)}
                            className="flex size-8 items-center justify-center rounded-lg border border-gray-300 bg-white font-extrabold text-gray-800 transition-all hover:bg-gray-100"
                            title="Punkt abziehen"
                          >
                            -
                          </button>
                        )}
                        <button
                          onClick={() => handleAddPoint(img.id)}
                          disabled={isAuthenticated && pointsRemaining <= 0}
                          className={`flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold shadow-2xs transition-all ${
                            votesForThisImage > 0
                              ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                              : 'border border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
                          } disabled:cursor-not-allowed disabled:opacity-40`}
                        >
                          <Heart className="size-3.5 fill-current" />
                          +1 Pkt
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Redesigned Empty State (Non-Dashed, Clean Status Card) */}
      {contest?.images.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-xs sm:p-12">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-emerald-100/90 text-emerald-800 shadow-inner">
            <Camera className="size-8" />
          </div>
          <h3 className="mt-4 text-lg font-extrabold text-gray-900">
            Noch keine Wettbewerbsfotos vorhanden
          </h3>
          <p className="mt-1.5 max-w-md text-sm leading-relaxed font-medium text-gray-600">
            {contest.status === 'UPLOADING' &&
              'Fotos werden derzeit gesammelt und vorbereitet. Schau in Kürze wieder vorbei!'}
            {contest.status === 'DRAFT' &&
              'Vorbereitung läuft: Sobald der Wettbewerb freigeschaltet wird, erscheinen hier die Aufnahmen.'}
            {contest.status !== 'UPLOADING' &&
              contest.status !== 'DRAFT' &&
              'Sobald Fotos für diesen Wettbewerb freigeschaltet sind, werden sie in dieser Galerie angezeigt.'}
          </p>
          <div className="mt-6 flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-900">
            <Info className="size-4 shrink-0 text-emerald-700" />
            <span>
              Die Wettbewerbsfotos werden durch das Organisationsteam im Admin Panel verwaltet.
            </span>
          </div>
        </div>
      )}

      {/* Lightbox Image Preview Modal */}
      {selectedImage !== undefined && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md"
          onClick={() => setSelectedImage(undefined)}
        >
          <div className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-2xl border border-white/20 bg-black shadow-2xl">
            <button
              onClick={() => setSelectedImage(undefined)}
              className="absolute top-4 right-4 z-10 rounded-full bg-black/70 p-2 text-white transition-all hover:bg-black/90"
            >
              <X className="size-6" />
            </button>
            <div className="relative h-[80vh] w-[80vw]">
              <Image
                src={selectedImage}
                alt="Vorschau"
                fill
                unoptimized
                className="object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
