'use client';
import { Button } from '@/components/ui/buttons/button';
import { toast } from '@/lib/toast';
import { trpc } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { Edit, Loader2, MessageSquare, Save, Settings, Users, X } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import React, { useState } from 'react';

const labels = {
  admin: { de: 'Administration', en: 'Administration', fr: 'Administration' },
  participants: { de: 'Teilnehmer', en: 'Participants', fr: 'Participants' },
  createChat: {
    de: 'Gruppenchat erstellen',
    en: 'Create Group Chat',
    fr: 'Créer un chat de groupe',
  },
  editDetails: { de: 'Details bearbeiten', en: 'Edit details', fr: 'Modifier les détails' },
  save: { de: 'Speichern', en: 'Save', fr: 'Enregistrer' },
  cancel: { de: 'Abbrechen', en: 'Cancel', fr: 'Annuler' },
  enrolled: { de: 'Teilnehmer', en: 'Participants', fr: 'Participants' },
  targetGroup: { de: 'Zielgruppe', en: 'Target Group', fr: 'Groupe cible' },
  noParticipants: {
    de: 'Noch keine Teilnehmer',
    en: 'No participants yet',
    fr: 'Pas encore de participants',
  },
} as const;

export const WorkshopAdminActions: React.FC<{
  courseId: string;
  courseTitle: string;
}> = ({ courseId, courseTitle }) => {
  const trpcUtils = trpc.useUtils();
  const [isEditing, setIsEditing] = useState(false);
  const [targetGroupText, setTargetGroupText] = useState('');

  const locale = useCurrentLocale(i18nConfig) as Locale;
  const { data: status, isLoading } = trpc.schedule.getCourseStatus.useQuery({ courseId });

  const createChat = trpc.schedule.createWorkshopChat.useMutation({
    onSuccess: (data) => {
      globalThis.location.href = `/app/chat/${data.chatId}`;
    },
    onError: (error) => toast.error(error.message),
  });

  const updateCourse = trpc.schedule.updateCourseDetails.useMutation({
    onSuccess: () => {
      setIsEditing(false);
      void trpcUtils.schedule.getCourseStatus.invalidate({ courseId });
    },
    onError: (error) => toast.error(error.message),
  });

  if (isLoading || !status?.isAdmin) return;

  const handleSave = (): void => {
    updateCourse.mutate({
      courseId,
      targetGroup: targetGroupText,
    });
  };

  const startEditing = (): void => {
    setTargetGroupText('');
    setIsEditing(true);
  };

  return (
    <div className="mt-12 rounded-2xl border-2 border-dashed border-gray-200 bg-white p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
          <Settings className="h-5 w-5 text-gray-400" />
          {labels.admin[locale]}
        </h2>
        <div className="flex gap-2">
          {isEditing ? (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                <X className="mr-1 h-4 w-4" />
                {labels.cancel[locale]}
              </Button>
              <Button
                variant="default"
                size="sm"
                className="bg-conveniat-green hover:bg-conveniat-green-dark gap-2 text-white"
                onClick={handleSave}
                disabled={updateCourse.isPending}
              >
                {updateCourse.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {labels.save[locale]}
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" className="gap-2" onClick={startEditing}>
              <Edit className="h-4 w-4" />
              {labels.editDetails[locale]}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => {
              createChat.mutate({ courseId, chatName: `Workshop: ${courseTitle}` });
            }}
            disabled={createChat.isPending || status.participants.length === 0}
          >
            {createChat.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MessageSquare className="h-4 w-4" />
            )}
            {labels.createChat[locale]}
          </Button>
        </div>
      </div>

      {isEditing && (
        <div className="animate-in fade-in slide-in-from-top-2 mb-8 space-y-4 duration-200">
          <div>
            <label className="mb-2 block text-xs font-bold tracking-wider text-gray-400 uppercase">
              {labels.targetGroup[locale]}
            </label>
            <textarea
              className="focus:border-conveniat-green focus:ring-conveniat-green w-full rounded-xl border-gray-200 bg-gray-50 p-4 text-sm"
              rows={3}
              value={targetGroupText}
              onChange={(event_) => setTargetGroupText(event_.target.value)}
              placeholder="Enter target group description..."
            />
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Participant List */}
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold tracking-wider text-gray-400 uppercase">
            <Users className="h-4 w-4" />
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
