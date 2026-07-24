'use client';

import { Badge } from '@/components/ui/badge';
import { trpc } from '@/trpc/client';
import {
  Award,
  CheckCircle2,
  Heart,
  Image as ImageIcon,
  Info,
  Plus,
  RefreshCw,
  Sparkles,
  Trophy,
  Upload,
  X,
} from 'lucide-react';
import Image from 'next/image';
import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';

interface PhotoContestViewProperties {
  initialContestSlug?: string;
  isAdminUser?: boolean;
}

function getBadgeVariant(
  status: 'DRAFT' | 'UPLOADING' | 'VOTING' | 'CLOSED',
): 'default' | 'secondary' | 'destructive' {
  if (status === 'VOTING') return 'default';
  if (status === 'UPLOADING') return 'secondary';
  return 'destructive';
}

function getBadgeClassName(status: 'DRAFT' | 'UPLOADING' | 'VOTING' | 'CLOSED'): string {
  if (status === 'VOTING') return 'bg-emerald-600 text-white';
  if (status === 'UPLOADING') return 'bg-blue-600 text-white';
  return '';
}

export const PhotoContestView: React.FC<PhotoContestViewProperties> = ({
  initialContestSlug = 'cevi-schweiz',
  isAdminUser = false,
}) => {
  const [activeSlug, setActiveSlug] = useState<string>(initialContestSlug);
  const [selectedImage, setSelectedImage] = useState<string>();
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newImageTitle, setNewImageTitle] = useState('');

  // tRPC Queries
  const contestsQuery = trpc.photoContest.getContests.useQuery();
  const currentContestQuery = trpc.photoContest.getContestBySlug.useQuery(
    { slug: activeSlug },
    { enabled: activeSlug.length > 0 },
  );

  // Mutations
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

  const adminAddImageMutation = trpc.photoContest.adminAddImage.useMutation({
    onSuccess: () => {
      toast.success('Bild erfolgreich hinzugefügt!');
      setNewImageUrl('');
      setNewImageTitle('');
      void currentContestQuery.refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const adminUpdateContestMutation = trpc.photoContest.adminUpdateContest.useMutation({
    onSuccess: () => {
      toast.success('Wettbewerbs-Status aktualisiert');
      void currentContestQuery.refetch();
      void contestsQuery.refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const seedDefaultsMutation = trpc.photoContest.adminSeedDefaultContests.useMutation({
    onSuccess: () => {
      toast.success('Standard-Wettbewerbe geladen!');
      void contestsQuery.refetch();
      void currentContestQuery.refetch();
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

  const handleAddPoint = (imageId: string): void => {
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
    if (!contest) return;

    const allocations = Object.entries(localVotes)
      .map(([imageId, points]) => ({ imageId, points }))
      .filter((a) => a.points > 0);

    castVotesMutation.mutate({
      contestId: contest.id,
      allocations,
    });
  };

  const handleAddLiveImage = (event_: React.FormEvent): void => {
    event_.preventDefault();
    if (!contest || newImageUrl.length === 0) return;

    adminAddImageMutation.mutate({
      contestId: contest.id,
      imageUrl: newImageUrl,
      ...(newImageTitle.length > 0 ? { title: newImageTitle } : {}),
    });
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {/* Header Banner */}
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-800 p-6 text-white shadow-xl">
        <div className="relative z-10 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-medium backdrop-blur-md">
              <Trophy className="size-4 text-amber-300" />
              <span>Konekta Foto-Wettbewerbe</span>
            </div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Abstimmung & Galerie</h1>
            <p className="mt-1 max-w-xl text-sm text-emerald-100">
              Wähle deine Favoriten! Du hast 2 Punkte: Vergabe von 2 Punkten an ein einziges Bild
              ODER je 1 Punkt an 2 verschiedene Bilder.
            </p>
          </div>

          {/* Points Status Widget */}
          {contest?.status === 'VOTING' && (
            <div className="flex min-w-[160px] flex-col items-center rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur-md">
              <span className="text-xs font-semibold tracking-wider text-emerald-200 uppercase">
                Verbleibend
              </span>
              <div className="my-1 text-3xl font-black text-amber-300">
                {pointsRemaining} / {maxPoints}
              </div>
              <span className="text-[11px] text-emerald-100">Punkte zu vergeben</span>
            </div>
          )}
        </div>
      </div>

      {/* Contest Selector Tabs */}
      <div className="mb-6 flex flex-wrap gap-3">
        {contestsQuery.data && contestsQuery.data.length > 0 ? (
          contestsQuery.data.map((contestItem) => (
            <button
              key={contestItem.id}
              onClick={() => {
                setActiveSlug(contestItem.slug);
                setLocalOverrides(undefined);
              }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition-all ${
                activeSlug === contestItem.slug
                  ? 'bg-emerald-700 text-white shadow-md ring-2 ring-emerald-500'
                  : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {contestItem.contestType === 'PRESELECTED' ? (
                <Award className="size-4 text-amber-500" />
              ) : (
                <Sparkles className="size-4 text-blue-500" />
              )}
              <span>{contestItem.title}</span>
              {contestItem.status === 'VOTING' && (
                <span className="ml-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                  Aktiv
                </span>
              )}
            </button>
          ))
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">Keine Wettbewerbe vorhanden.</span>
            <button
              onClick={() => seedDefaultsMutation.mutate()}
              disabled={seedDefaultsMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              <RefreshCw className="size-3.5" />
              Standard-Wettbewerbe erstellen
            </button>
          </div>
        )}
      </div>

      {/* Main Contest Info & Rules Card */}
      {contest && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <div className="flex items-center gap-2">
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
                <p className="mt-1 text-sm text-gray-600">{contest.description}</p>
              )}
            </div>

            {/* Voting Action Buttons */}
            {contest.status === 'VOTING' && (
              <div className="flex items-center gap-3">
                {currentPointsAllocated > 0 && (
                  <button
                    onClick={handleResetVotes}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Zurücksetzen
                  </button>
                )}
                <button
                  onClick={handleSaveVotes}
                  disabled={castVotesMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-emerald-700 disabled:opacity-50"
                >
                  <CheckCircle2 className="size-4" />
                  Stimmen Speichern ({currentPointsAllocated} Pkt)
                </button>
              </div>
            )}
          </div>

          {/* Voting Rules Info Box */}
          <div className="mt-4 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-900">
            <Info className="mt-0.5 size-4 shrink-0 text-emerald-600" />
            <div>
              <span className="font-bold">Regel zur Punktevergabe:</span> Jeder Teilnehmende hat 2
              Punkte. Du kannst entweder <strong>2 Punkte für 1 Bild</strong> vergeben oder{' '}
              <strong>je 1 Punkt für 2 verschiedene Bilder</strong>. Mehrfache Abstimmungen vom
              selben Account sind ausgeschlossen.
            </div>
          </div>
        </div>
      )}

      {/* Admin Control Bar & Live Upload Option */}
      {(isAdminUser || contest?.status === 'UPLOADING') && contest && (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50/50 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-blue-900">
            <Upload className="size-4 text-blue-600" />
            <span>Vor Ort Live-Upload & Administration ({contest.title})</span>
          </div>

          <form
            onSubmit={handleAddLiveImage}
            className="flex flex-col items-stretch gap-3 md:flex-row md:items-center"
          >
            <input
              type="url"
              placeholder="Bild-URL (https://...)"
              value={newImageUrl}
              onChange={(event_) => setNewImageUrl(event_.target.value)}
              className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            />
            <input
              type="text"
              placeholder="Titel / Beschreibung (optional)"
              value={newImageTitle}
              onChange={(event_) => setNewImageTitle(event_.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:outline-none md:w-64"
            />
            <button
              type="submit"
              disabled={adminAddImageMutation.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-blue-700 disabled:opacity-50"
            >
              <Plus className="size-4" />
              Bild Hinzufügen
            </button>
          </form>

          {isAdminUser && (
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-blue-200 pt-3">
              <span className="mr-2 text-xs font-semibold text-blue-900">Status ändern:</span>
              <button
                onClick={() =>
                  adminUpdateContestMutation.mutate({ id: contest.id, status: 'UPLOADING' })
                }
                className={`rounded px-2.5 py-1 text-xs font-medium ${
                  contest.status === 'UPLOADING'
                    ? 'bg-blue-700 text-white'
                    : 'border border-blue-300 bg-white text-blue-800'
                }`}
              >
                Uploads Aktiv
              </button>
              <button
                onClick={() =>
                  adminUpdateContestMutation.mutate({ id: contest.id, status: 'VOTING' })
                }
                className={`rounded px-2.5 py-1 text-xs font-medium ${
                  contest.status === 'VOTING'
                    ? 'bg-emerald-700 text-white'
                    : 'border border-emerald-300 bg-white text-emerald-800'
                }`}
              >
                Abstimmung Aktiv
              </button>
              <button
                onClick={() =>
                  adminUpdateContestMutation.mutate({ id: contest.id, status: 'CLOSED' })
                }
                className={`rounded px-2.5 py-1 text-xs font-medium ${
                  contest.status === 'CLOSED'
                    ? 'bg-gray-800 text-white'
                    : 'border border-gray-300 bg-white text-gray-800'
                }`}
              >
                Beenden
              </button>
            </div>
          )}
        </div>
      )}

      {/* Image Gallery & Point Allocation Grid */}
      {contest && contest.images.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {contest.images.map((img, index) => {
            const votesForThisImage = localVotes[img.id] ?? 0;
            const totalTally = contest.voteCounts[img.id];

            return (
              <div
                key={img.id}
                className={`group relative overflow-hidden rounded-2xl border shadow-sm transition-all ${
                  votesForThisImage > 0
                    ? 'border-emerald-500 bg-emerald-50/20 ring-2 ring-emerald-500/50'
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
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

                  <span className="absolute top-3 left-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-md">
                    #{index + 1}
                  </span>

                  {/* Allocated Points Badge */}
                  {votesForThisImage > 0 && (
                    <div className="animate-in zoom-in-50 absolute top-3 right-3 flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white shadow-lg">
                      <Heart className="size-3.5 fill-current" />
                      <span>
                        {votesForThisImage} {votesForThisImage === 1 ? 'Punkt' : 'Punkte'}
                      </span>
                    </div>
                  )}

                  {/* Total vote tally if closed/admin */}
                  {totalTally !== undefined && (
                    <div className="absolute bottom-3 left-3 rounded-md bg-amber-500 px-2 py-0.5 text-xs font-bold text-white shadow-md">
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
                    <p className="mt-1 line-clamp-2 text-xs text-gray-500">{img.description}</p>
                  )}

                  {contest.status === 'VOTING' && (
                    <div className="mt-4 flex items-center justify-between gap-2 border-t pt-3">
                      <div className="text-xs font-medium text-gray-500">
                        {votesForThisImage > 0 ? (
                          <span className="font-semibold text-emerald-700">
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
                            className="flex size-8 items-center justify-center rounded-lg border border-gray-300 bg-white font-bold text-gray-700 transition-all hover:bg-gray-100"
                            title="Punkt abziehen"
                          >
                            -
                          </button>
                        )}
                        <button
                          onClick={() => handleAddPoint(img.id)}
                          disabled={pointsRemaining <= 0}
                          className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold shadow-sm transition-all ${
                            votesForThisImage > 0
                              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                              : 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
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
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <ImageIcon className="size-12 text-gray-400" />
          <h3 className="mt-4 text-base font-semibold text-gray-900">
            Noch keine Bilder hochgeladen
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Bilder werden während dem Wettbewerb hochgeladen.
          </p>
        </div>
      )}

      {/* Lightbox Image Preview Modal */}
      {selectedImage !== undefined && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setSelectedImage(undefined)}
        >
          <div className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-2xl bg-black">
            <button
              onClick={() => setSelectedImage(undefined)}
              className="absolute top-4 right-4 z-10 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
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
