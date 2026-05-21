import { RefreshRouteOnSave } from '@/components/utils/refresh-preview';
import { environmentVariables } from '@/config/environment-variables';
import { LexicalRichTextSection } from '@/features/payload-cms/components/content-blocks/lexical-rich-text-section';
import type { Announcement, AnnouncementChannel } from '@/features/payload-cms/payload-types';
import configPromise from '@/features/payload-cms/payload.config';
import type { Locale } from '@/types/types';
import { DesignCodes } from '@/utils/design-codes';
import {
  AlertCircle,
  Calendar,
  ChevronLeft,
  Megaphone,
  Radio,
  Shield,
  Smartphone,
  Users,
} from 'lucide-react';
import { notFound } from 'next/navigation';
import { getPayload } from 'payload';
import React from 'react';

// Static params for i18n locales and design systems
export function generateStaticParams(): { locale: string; design: string }[] {
  const designs = Object.values(DesignCodes);
  const locales = ['de', 'fr', 'en'];
  return designs.flatMap((design) => locales.map((locale) => ({ locale, design })));
}

const translations = {
  previewTitle: {
    de: 'Interaktive Live-Vorschau',
    en: 'Interactive Live Preview',
    fr: 'Aperçu Interactif en Direct',
  },
  previewSubtitle: {
    de: 'Simulierte Mobilansicht deiner Ankündigung in Echtzeit.',
    en: 'Real-time simulated mobile view of your announcement.',
    fr: 'Aperçu mobile simulé en temps réel de votre annonce.',
  },
  metaTitle: {
    de: 'Details zur Ankündigung',
    en: 'Announcement Details',
    fr: "Détails de l'annonce",
  },
  channelLabel: {
    de: 'Kanal',
    en: 'Channel',
    fr: 'Canal',
  },
  statusLabel: {
    de: 'Status',
    en: 'Status',
    fr: 'Statut',
  },
  scheduledAtLabel: {
    de: 'Geplant für',
    en: 'Scheduled for',
    fr: 'Planifié pour',
  },
  targetTypeLabel: {
    de: 'Zielgruppe',
    en: 'Target Group',
    fr: 'Groupe cible',
  },
  everyoneLabel: {
    de: 'Alle Teilnehmenden (Global)',
    en: 'Everyone (Global)',
    fr: 'Tout le monde (Global)',
  },
  rolesLabel: {
    de: 'Spezifische Rollen',
    en: 'Specific Roles',
    fr: 'Rôles spécifiques',
  },
  groupsLabel: {
    de: 'Spezifische Cevi-Gruppen',
    en: 'Specific Cevi Groups',
    fr: 'Groupes Cevi spécifiques',
  },
  rolesAndGroupsLabel: {
    de: 'Rolle + Cevi-Gruppe Kombination',
    en: 'Role + Cevi Group Combination',
    fr: 'Combinaison Rôle + Groupe Cevi',
  },
  readOnlyNotice: {
    de: 'Du kannst in diesem Kanal nicht antworten.',
    en: 'You cannot reply in this channel.',
    fr: 'Vous ne pouvez pas répondre à ce canal.',
  },
  previewDisclaimer: {
    de: 'Diese Simulation entspricht der echten Rendering-Engine der mobilen Klein-App. Updates aus dem CMS-Editor werden automatisch synchronisiert.',
    en: 'This simulation mirrors the actual rendering engine of the mobile Klein app. Updates from the CMS editor are automatically synchronized.',
    fr: "Cette simulation reproduit le moteur de rendu réel de l'application mobile Klein. Les mises à jour de l'éditeur CMS sont synchronisées automatiquement.",
  },
} as const;

interface PageProperties {
  params: Promise<{
    id: string;
    locale: Locale;
    design: string;
  }>;
}

export default async function AnnouncementPreviewPage({
  params,
}: PageProperties): Promise<React.JSX.Element> {
  const { id, locale } = await params;
  const validatedLocale: Locale = ['de', 'fr', 'en'].includes(locale) ? locale : 'de';

  const payload = await getPayload({ config: configPromise });

  let announcement: Announcement | undefined;
  try {
    announcement = await payload.findByID({
      collection: 'announcements',
      id,
      depth: 2,
      draft: true, // Fetch drafts or autosaved edits to power the live preview
    });
  } catch (error) {
    console.error('Failed to load announcement for live preview:', error);
  }

  if (announcement === undefined) {
    notFound();
  }

  const channel = announcement.channel as AnnouncementChannel | undefined;
  const channelName = channel?.name ?? 'Ankündigungskanal';
  const status = announcement.status;

  // Formatting target group description
  const targetType = channel?.targetType ?? 'all';
  let targetSummary: string = translations.everyoneLabel[validatedLocale];
  if (targetType === 'roles') {
    targetSummary = `${translations.rolesLabel[validatedLocale]}: ${(channel?.targetRoles ?? []).join(', ')}`;
  } else if (targetType === 'cevi_groups') {
    targetSummary = `${translations.groupsLabel[validatedLocale]}: ${(
      (channel?.targetCeviGroups as unknown[] | undefined) ?? []
    )
      .map((group) =>
        typeof group === 'string'
          ? group
          : (((group as Record<string, unknown>)['name'] as string | undefined) ?? ''),
      )
      .filter((n) => n !== '')
      .join(', ')}`;
  }

  const statusColors = {
    draft: 'bg-blue-100 text-blue-800 border-blue-200',
    scheduled: 'bg-amber-100 text-amber-800 border-amber-200',
    published: 'bg-green-100 text-green-800 border-green-200',
  }[status];

  const formattedDate = announcement.scheduledAt
    ? new Date(announcement.scheduledAt).toLocaleString(validatedLocale, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : undefined;

  const simulatedTime = announcement.publishedAt
    ? new Date(announcement.publishedAt).toLocaleTimeString(validatedLocale, {
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date().toLocaleTimeString(validatedLocale, {
        hour: '2-digit',
        minute: '2-digit',
      });

  return (
    <div className="flex min-h-screen flex-col bg-slate-900 font-sans text-slate-100">
      {/* Payload CMS Live Preview Route Syncer */}
      <RefreshRouteOnSave serverURL={environmentVariables.APP_HOST_URL} />

      {/* Top Banner Header */}
      <header className="flex items-center justify-between border-b border-slate-800 bg-slate-950/50 px-6 py-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-linear-to-tr from-rose-500 to-amber-500 p-2 text-white">
            <Radio className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">
              {translations.previewTitle[validatedLocale]}
            </h1>
            <p className="text-xs text-slate-400">
              {translations.previewSubtitle[validatedLocale]}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold">
          <Smartphone className="h-4 w-4 text-emerald-400" />
          <span>Simulated Klein App v3</span>
        </div>
      </header>

      {/* Main Suite Workspace */}
      <main className="mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 items-start gap-8 p-6 lg:grid-cols-12">
        {/* Left Side: Mockup Metadata Info Panel */}
        <section className="space-y-6 lg:col-span-5">
          <div className="space-y-6 rounded-2xl border border-slate-800 bg-slate-950/40 p-6 backdrop-blur">
            <h2 className="text-md flex items-center gap-2 border-b border-slate-800 pb-3 font-semibold tracking-wider text-white">
              <Shield className="h-4 w-4 text-rose-400" />
              {translations.metaTitle[validatedLocale]}
            </h2>

            <div className="space-y-4">
              {/* Channel */}
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-400">
                  {translations.channelLabel[validatedLocale]}
                </span>
                <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
                  <Megaphone className="h-4 w-4 shrink-0 text-rose-500" />
                  {channelName}
                </span>
              </div>

              {/* Status */}
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-400">
                  {translations.statusLabel[validatedLocale]}
                </span>
                <div>
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wider uppercase ${statusColors}`}
                  >
                    {status}
                  </span>
                </div>
              </div>

              {/* Scheduled Date */}
              {formattedDate && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-slate-400">
                    {translations.scheduledAtLabel[validatedLocale]}
                  </span>
                  <span className="flex items-center gap-1.5 text-sm text-slate-200">
                    <Calendar className="h-4 w-4 shrink-0 text-amber-400" />
                    {formattedDate}
                  </span>
                </div>
              )}

              {/* Target Audience */}
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-400">
                  {translations.targetTypeLabel[validatedLocale]}
                </span>
                <span className="flex items-center gap-1.5 text-sm text-slate-200">
                  <Users className="h-4 w-4 shrink-0 text-sky-400" />
                  {targetSummary}
                </span>
              </div>
            </div>
          </div>

          {/* User Guide Box */}
          <div className="flex gap-3 rounded-2xl border border-slate-800/80 bg-slate-950/20 p-5 text-xs text-slate-400">
            <AlertCircle className="h-5 w-5 shrink-0 text-indigo-400" />
            <p>{translations.previewDisclaimer[validatedLocale]}</p>
          </div>
        </section>

        {/* Right Side: Simulated Smartphone Shell Mockup */}
        <section className="flex justify-center lg:col-span-7">
          <div className="relative h-[760px] w-[375px] overflow-hidden rounded-[52px] border-12 border-slate-950 bg-slate-900 shadow-2xl ring-4 ring-slate-800">
            {/* Top Screen Dynamic Island Speaker Notch */}
            <div className="absolute top-3 left-1/2 z-50 flex h-6 w-32 -translate-x-1/2 transform items-center justify-between rounded-full bg-black px-4">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-800"></span>
              <span className="h-1 w-8 rounded-full bg-slate-900"></span>
              <span className="h-1.5 w-1.5 rounded-full bg-blue-900"></span>
            </div>

            {/* Screen Content Wrapper */}
            <div className="relative flex h-full flex-col bg-slate-950">
              {/* Simulated Status Bar */}
              <div className="z-40 flex h-10 items-center justify-between bg-slate-900 px-6 pt-4 text-[11px] font-semibold text-slate-300">
                <span>09:41</span>
                <div className="flex items-center gap-1.5">
                  {/* Wifi Sign */}
                  <svg className="h-3 w-3 fill-current" viewBox="0 0 24 24">
                    <path d="M12 21a2 2 0 0 1-1.41-.59l-10-10A2 2 0 0 1 .59 9a11 11 0 0 1 15.56 0 2 2 0 0 1 0 2.82l-10 10A2 2 0 0 1 12 21z" />
                  </svg>
                  {/* Battery */}
                  <div className="flex h-2.5 w-5 items-center rounded-sm border border-slate-400 p-0.5">
                    <div className="rounded-2xs h-full w-4 bg-slate-300"></div>
                  </div>
                </div>
              </div>

              {/* Chat View Header Bar */}
              <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-900 px-4 py-3">
                <div className="flex items-center gap-3">
                  <ChevronLeft className="h-5 w-5 cursor-pointer text-rose-500" />
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-tr from-rose-500 to-rose-600 text-white shadow-lg shadow-rose-500/20">
                      <Megaphone className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h3 className="text-xs leading-tight font-bold text-slate-100">
                        {channelName}
                      </h3>
                      <p className="text-[9px] font-medium text-rose-500">Official Channel</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Simulated Chat Feed */}
              <div className="flex flex-1 flex-col justify-end space-y-6 overflow-y-auto bg-linear-to-b from-slate-950 to-slate-900 p-4">
                {/* Date stamp separator */}
                <div className="flex justify-center">
                  <span className="rounded-full border border-slate-800/60 bg-slate-900/60 px-3 py-1 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                    {announcement.publishedAt
                      ? new Date(announcement.publishedAt).toLocaleDateString(validatedLocale, {
                          dateStyle: 'medium',
                        })
                      : 'Heute'}
                  </span>
                </div>

                {/* Simulated Megaphone Announcement Message Bubble */}
                <div className="flex max-w-[92%] items-end gap-2">
                  {/* Sender Avatar */}
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white">
                    K
                  </div>

                  {/* Bubble body */}
                  <div className="relative rounded-2xl rounded-bl-sm border border-slate-700/80 bg-slate-800 p-4 text-slate-100 shadow-md">
                    {/* Megaphone announcement label banner */}
                    <div className="mb-2 flex items-center gap-1.5 border-b border-slate-700 pb-1.5 text-[10px] font-semibold tracking-wider text-rose-400 uppercase">
                      <Megaphone className="h-3 w-3" />
                      <span>{translations.channelLabel[validatedLocale]}</span>
                    </div>

                    {/* Announcement Title */}
                    <h4 className="mb-2 text-sm leading-snug font-bold text-white">
                      {announcement.title}
                    </h4>

                    {/* Rich text body parsed through standard Lexical renderer */}
                    <div className="prose prose-invert prose-xs text-xs leading-relaxed text-slate-200">
                      <LexicalRichTextSection
                        richTextSection={announcement.content}
                        locale={validatedLocale}
                      />
                    </div>

                    {/* Timestamp & checkmarks */}
                    <div className="mt-2 flex items-center justify-end gap-1 text-[9px] text-slate-500">
                      <span>{simulatedTime}</span>
                      <svg className="h-3.5 w-3.5 fill-current text-rose-500" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Input Area Mock (Read-Only Announcement Notice) */}
              <div className="flex items-center justify-center border-t border-slate-800/80 bg-slate-900 px-4 py-3 pb-6">
                <div className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-800/60 bg-slate-950 px-4 py-2.5 text-center">
                  <AlertCircle className="h-4 w-4 shrink-0 text-slate-500" />
                  <span className="text-[10px] font-medium text-slate-400">
                    {translations.readOnlyNotice[validatedLocale]}
                  </span>
                </div>
              </div>

              {/* Simulated Home Indicator Bar */}
              <div className="absolute bottom-1.5 left-1/2 h-1 w-32 -translate-x-1/2 transform rounded-full bg-slate-800"></div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
