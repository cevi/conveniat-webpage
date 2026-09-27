'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import type { HofDashboardData } from '@/features/hof-dashboard/api/hof-dashboard-data';
import { AreaView } from '@/features/hof-dashboard/components/area-view';
import { DashboardTabList } from '@/features/hof-dashboard/components/dashboard-tabs';
import {
  Panel,
  PRIMARY_BUTTON_CLASS,
  SECONDARY_BUTTON_CLASS,
} from '@/features/hof-dashboard/components/dashboard-ui';
import { DocumentsView } from '@/features/hof-dashboard/components/documents-view';
import { OverviewView } from '@/features/hof-dashboard/components/overview-view';
import {
  HOF_DASHBOARD_AREA_LABELS,
  type HofDashboardArea,
} from '@/features/hof-dashboard/constants';
import { useRememberedHofId } from '@/features/hof-dashboard/hooks/use-remembered-hof-id';
import { useScrollToForm } from '@/features/hof-dashboard/hooks/use-scroll-to-form';
import { useTabInAddress } from '@/features/hof-dashboard/hooks/use-tab-in-address';
import { hasUnsavedWork } from '@/features/hof-dashboard/hooks/use-warn-before-leaving';
import { text, translate } from '@/features/hof-dashboard/texts';
import {
  getSubmissionProgress,
  type SubmissionProgress,
} from '@/features/hof-dashboard/utils/submission-progress';
import { flushPersonalData } from '@/lib/flush-personal-data';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { TabGroup, TabPanel, TabPanels } from '@headlessui/react';
import { LogOut } from 'lucide-react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { useCurrentLocale } from 'next-i18n-router/client';
import type React from 'react';
import { useCallback, useId, useMemo, useRef, useState } from 'react';

type Tab = 'overview' | HofDashboardArea | 'documents';

const TABS: { id: Tab; label: StaticTranslationString }[] = [
  { id: 'overview', label: text.tabOverview },
  { id: 'infrastructure', label: HOF_DASHBOARD_AREA_LABELS.infrastructure },
  { id: 'program', label: HOF_DASHBOARD_AREA_LABELS.program },
  { id: 'material', label: HOF_DASHBOARD_AREA_LABELS.material },
  { id: 'documents', label: text.tabDocuments },
];

const TAB_IDS = TABS.map(({ id }) => id);

const LoadingState: React.FC<{ locale: Locale }> = ({ locale }) => (
  <div className="space-y-4" role="status">
    <span className="sr-only">{translate('loading', locale)}</span>
    <Skeleton className="h-11 w-full bg-gray-200" />
    <Skeleton className="h-32 w-full rounded-xl bg-gray-200" />
    <Skeleton className="h-48 w-full rounded-xl bg-gray-200" />
  </div>
);

const Message: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Panel className="space-y-4 text-sm text-gray-700">{children}</Panel>
);

const signInWithCeviDatabase = async (): Promise<void> => {
  const response = await signIn('cevi-db', {
    redirect: false,
    callbackUrl: globalThis.location.href,
  });
  if (typeof response.url === 'string') globalThis.location.href = response.url;
};

/** Where every form stands today, by form id. */
const useProgress = (
  data: HofDashboardData | undefined,
): Record<string, SubmissionProgress> | undefined =>
  useMemo(() => {
    if (data === undefined) return;
    const now = new Date();
    return Object.fromEntries(
      data.forms.map((form) => [
        form.id,
        getSubmissionProgress(
          {
            mode: form.mode,
            deadline: form.deadline,
            statuses: form.entries.map((entry) => entry.status),
          },
          now,
        ),
      ]),
    );
  }, [data]);

const RetryMessage: React.FC<{ locale: Locale; onRetry: () => void }> = ({ locale, onRetry }) => (
  <Message>
    <p>{translate(globalThis.navigator.onLine ? 'loadError' : 'offline', locale)}</p>
    <button type="button" className={SECONDARY_BUTTON_CLASS} onClick={onRetry}>
      {translate('retry', locale)}
    </button>
  </Message>
);

const DashboardForHof: React.FC<{ hofId: string; locale: Locale }> = ({ hofId, locale }) => {
  const [tab, setTab] = useTabInAddress(TAB_IDS, 'overview');
  const [scrollTarget, setScrollTarget] = useState<string>();
  const clearScrollTarget = useCallback(() => setScrollTarget(undefined), []);
  const root = useRef<HTMLDivElement>(null);
  useScrollToForm(root, scrollTarget, clearScrollTarget);

  const dashboard = trpc.hofDashboard.getHofDashboard.useQuery(
    { hofId, locale },
    {
      // a reviewer's answer should reach the Hof within a look away; the app's defaults
      // would keep showing what was loaded until the next full reload
      staleTime: 30_000,
      refetchOnMount: true,
      refetchOnWindowFocus: true,
      // nothing here works offline, and yesterday's shape of it must not render after a deploy
      meta: { persist: false },
    },
  );
  const progress = useProgress(dashboard.data);

  if (dashboard.isLoading) return <LoadingState locale={locale} />;
  if (dashboard.data === undefined || progress === undefined) {
    return <RetryMessage locale={locale} onRetry={() => void dashboard.refetch()} />;
  }
  const data = dashboard.data;

  const panels: Record<Tab, React.ReactNode> = {
    overview: (
      <OverviewView
        data={data}
        progress={progress}
        locale={locale}
        onOpen={(area, formId) => {
          setTab(area);
          setScrollTarget(formId);
        }}
      />
    ),
    infrastructure: (
      <AreaView area="infrastructure" data={data} progress={progress} locale={locale} />
    ),
    program: <AreaView area="program" data={data} progress={progress} locale={locale} />,
    material: <AreaView area="material" data={data} progress={progress} locale={locale} />,
    documents: <DocumentsView data={data} progress={progress} locale={locale} />,
  };

  return (
    <div ref={root}>
      <TabGroup
        selectedIndex={TABS.findIndex(({ id }) => id === tab)}
        onChange={(index) => setTab(TABS[index]?.id ?? 'overview')}
        className="space-y-6"
      >
        <DashboardTabList
          tabs={TABS.map(({ id, label }) => {
            // what the Hof still has to hand in or revise behind an area's tab
            const open = data.forms.filter(
              (form) => form.area === id && progress[form.id]?.state !== 'done',
            ).length;
            return {
              label: label[locale],
              open,
              openLabel: translate('openCount', locale, { n: open }),
            };
          })}
          label={translate('tabs', locale)}
        />
        {/* kept mounted, so what was typed into an open form survives a look at another tab */}
        <TabPanels>
          {TABS.map(({ id }) => (
            <TabPanel key={id} unmount={false}>
              {panels[id]}
            </TabPanel>
          ))}
        </TabPanels>
      </TabGroup>
    </div>
  );
};

const DashboardForUser: React.FC<{ locale: Locale }> = ({ locale }) => {
  const hoefe = trpc.hofDashboard.getMyHofList.useQuery(undefined, {
    // a Hof the user was given or lost since the last visit
    refetchOnMount: true,
    meta: { persist: false },
  });
  const [selectedHofId, setSelectedHofId] = useRememberedHofId();
  const selectId = useId();

  if (hoefe.isLoading) return <LoadingState locale={locale} />;
  if (hoefe.data === undefined) {
    return <RetryMessage locale={locale} onRetry={() => void hoefe.refetch()} />;
  }
  if (hoefe.data.length === 0) {
    return (
      <Message>
        <p>{translate('noAccess', locale)}</p>
      </Message>
    );
  }

  const hof = hoefe.data.find((candidate) => candidate.id === selectedHofId) ?? hoefe.data[0];
  if (hof === undefined) return <></>;

  return (
    <div className="space-y-6">
      {hoefe.data.length === 1 ? (
        <h2 className="font-heading text-conveniat-green text-2xl font-extrabold">{hof.name}</h2>
      ) : (
        <div className="space-y-1">
          {/* the select shows the name; the heading keeps the outline of the page intact */}
          <h2 className="sr-only">{hof.name}</h2>
          <label htmlFor={selectId} className="text-sm font-medium text-gray-600">
            {translate('hof', locale)}
          </label>
          <Select
            value={hof.id}
            onValueChange={(hofId) => {
              // the other Hof's dashboard replaces this one, and with it what was not saved
              if (hasUnsavedWork() && !globalThis.confirm(translate('discardUnsaved', locale))) {
                return;
              }
              setSelectedHofId(hofId);
            }}
          >
            <SelectTrigger
              id={selectId}
              className="font-heading text-conveniat-green h-12 w-full max-w-sm bg-white text-lg font-extrabold focus-visible:ring-2 focus-visible:ring-green-600"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-w-(--radix-select-content-available-width) bg-white">
              {hoefe.data.map((candidate) => (
                <SelectItem
                  key={candidate.id}
                  value={candidate.id}
                  className="min-h-11 whitespace-normal"
                >
                  {candidate.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <DashboardForHof key={hof.id} hofId={hof.id} locale={locale} />
    </div>
  );
};

/**
 * Who is signed in, and the way out: the dashboard shows one person's Höfe, so on a shared
 * phone the next person needs to see whose they are and switch.
 */
const SignedInLine: React.FC<{ name: string; locale: Locale }> = ({ name, locale }) => (
  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm text-gray-600">
    <span>{translate('signedInAs', locale, { name })}</span>
    <button
      type="button"
      className="text-conveniat-green inline-flex min-h-10 cursor-pointer items-center gap-1.5 font-semibold underline-offset-2 hover:underline"
      onClick={() => {
        flushPersonalData();
        void signOut({ redirectTo: globalThis.location.href });
      }}
    >
      <LogOut className="h-4 w-4" aria-hidden />
      {translate('signOut', locale)}
    </button>
  </div>
);

const HofDashboardContent: React.FC = () => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const { status, data: session } = useSession();

  if (status === 'loading') return <LoadingState locale={locale} />;
  if (status === 'unauthenticated') {
    return (
      <Message>
        <p>{translate('loginRequired', locale)}</p>
        <button
          type="button"
          className={PRIMARY_BUTTON_CLASS}
          onClick={() => void signInWithCeviDatabase()}
        >
          {translate('login', locale)}
        </button>
      </Message>
    );
  }
  const user = session?.user;
  const name = user?.name ?? user?.email ?? '';
  return (
    <div className="space-y-6">
      {name !== '' && <SignedInLine name={name} locale={locale} />}
      <DashboardForUser locale={locale} />
    </div>
  );
};

/**
 * The Hof dashboard as an editor places it on a page: the address administrators of a Hof
 * hand in its plans, order material and follow what the Ressorts say. Signed-out visitors are
 * asked to sign in; nothing is fetched for them, since the tRPC client answers a 401 with a
 * sign out and a redirect.
 *
 * Laid out by container queries: the block sits in a content column far narrower than the
 * viewport, and possibly in a two-column block.
 */
export const HofDashboard: React.FC = () => (
  <div className="@container">
    <HofDashboardContent />
  </div>
);
