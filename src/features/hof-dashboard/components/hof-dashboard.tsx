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
import { MaterialOrderForm } from '@/features/hof-dashboard/components/material-order-form';
import { OverviewView } from '@/features/hof-dashboard/components/overview-view';
import {
  HOF_DASHBOARD_AREA_LABELS,
  type HofDashboardArea,
  type HofSubmissionType,
} from '@/features/hof-dashboard/constants';
import { useRememberedHofId } from '@/features/hof-dashboard/hooks/use-remembered-hof-id';
import { useScrollToSubmission } from '@/features/hof-dashboard/hooks/use-scroll-to-submission';
import { useTabInAddress } from '@/features/hof-dashboard/hooks/use-tab-in-address';
import { hasUnsavedWork } from '@/features/hof-dashboard/hooks/use-warn-before-leaving';
import { text, translate } from '@/features/hof-dashboard/texts';
import {
  getSubmissionProgress,
  type SubmissionProgress,
} from '@/features/hof-dashboard/utils/submission-progress';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { TabGroup, TabPanel, TabPanels } from '@headlessui/react';
import { signIn, useSession } from 'next-auth/react';
import { useCurrentLocale } from 'next-i18n-router/client';
import type React from 'react';
import { useCallback, useId, useMemo, useRef, useState } from 'react';

type Tab = 'overview' | HofDashboardArea | 'orders' | 'documents';

const TABS: { id: Tab; label: StaticTranslationString }[] = [
  { id: 'overview', label: text.tabOverview },
  { id: 'infrastructure', label: HOF_DASHBOARD_AREA_LABELS.infrastructure },
  { id: 'program', label: HOF_DASHBOARD_AREA_LABELS.program },
  { id: 'orders', label: text.tabOrders },
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

/** Where every submission stands today. */
const useProgress = (
  data: HofDashboardData | undefined,
): Record<HofSubmissionType, SubmissionProgress> | undefined =>
  useMemo(() => {
    if (data === undefined) return;
    const now = new Date();
    return Object.fromEntries(
      data.submissions.map((submission) => [
        submission.type,
        getSubmissionProgress(
          {
            hasPlan: submission.files.some((file) => file.kind === 'plan'),
            hasSafetyConcept: submission.files.some((file) => file.kind === 'safetyConcept'),
            elevatedSafetyRisk: submission.elevatedSafetyRisk,
            status: submission.status,
            deadlines: submission.deadlines,
          },
          now,
        ),
      ]),
    ) as Record<HofSubmissionType, SubmissionProgress>;
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
  const [scrollTarget, setScrollTarget] = useState<HofSubmissionType>();
  const clearScrollTarget = useCallback(() => setScrollTarget(undefined), []);
  const root = useRef<HTMLDivElement>(null);
  useScrollToSubmission(root, scrollTarget, clearScrollTarget);

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
        onOpen={(area, type) => {
          setTab(area);
          setScrollTarget(type);
        }}
      />
    ),
    infrastructure: (
      <AreaView area="infrastructure" data={data} progress={progress} locale={locale} />
    ),
    program: <AreaView area="program" data={data} progress={progress} locale={locale} />,
    orders: (
      <div className="space-y-6">
        {[data.orders.infrastructure, data.orders.stadtleben].map((order) => (
          <MaterialOrderForm
            key={order.type}
            hofId={data.hof.id}
            order={order}
            isReviewer={data.isReviewer}
            locale={locale}
          />
        ))}
      </div>
    ),
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
          labels={TABS.map(({ label }) => label[locale])}
          label={translate('tabs', locale)}
        />
        {/* kept mounted, so what was typed into an order survives a look at another tab */}
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

const HofDashboardContent: React.FC = () => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const { status } = useSession();

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
  return <DashboardForUser locale={locale} />;
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
