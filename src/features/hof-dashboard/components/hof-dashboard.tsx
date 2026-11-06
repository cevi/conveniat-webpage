'use client';
import { segmentClassName, segmentedTrackClassName } from '@/components/ui/segmented-control';
import type { HofDashboardData } from '@/features/hof-dashboard/api/hof-dashboard-data';
import type { HofOverviewRow } from '@/features/hof-dashboard/api/hof-overview';
import { AreaView } from '@/features/hof-dashboard/components/area-view';
import {
  AccountButton,
  DashboardHeader,
  HofSwitch,
  ResponsibleLine,
  type Crumb,
} from '@/features/hof-dashboard/components/dashboard-header';
import {
  DashboardSkeleton,
  HofSkeleton,
  ResponsibleLineSkeleton,
} from '@/features/hof-dashboard/components/dashboard-skeleton';
import { DashboardTabList } from '@/features/hof-dashboard/components/dashboard-tabs';
import {
  AreaIcon,
  Panel,
  PRIMARY_BUTTON_CLASS,
  SECONDARY_BUTTON_CLASS,
} from '@/features/hof-dashboard/components/dashboard-ui';
import { DocumentsView } from '@/features/hof-dashboard/components/documents-view';
import { HofOverviewTable } from '@/features/hof-dashboard/components/hof-overview-table';
import { MaterialOrdersView } from '@/features/hof-dashboard/components/material-orders-view';
import { OverviewView } from '@/features/hof-dashboard/components/overview-view';
import {
  HOF_DASHBOARD_AREA_LABELS,
  HOF_DASHBOARD_AREAS,
  type HofDashboardArea,
} from '@/features/hof-dashboard/constants';
import { useRememberedHofId } from '@/features/hof-dashboard/hooks/use-remembered-hof-id';
import { useScrollToForm } from '@/features/hof-dashboard/hooks/use-scroll-to-form';
import { useTabInAddress } from '@/features/hof-dashboard/hooks/use-tab-in-address';
import { hasUnsavedWork } from '@/features/hof-dashboard/hooks/use-warn-before-leaving';
import { translate } from '@/features/hof-dashboard/texts';
import {
  getSubmissionProgress,
  isOpen,
  type SubmissionProgress,
} from '@/features/hof-dashboard/utils/submission-progress';
import { useAuthStatus } from '@/hooks/use-auth-status';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import { useTRPC } from '@/trpc/client';
import { HitobitoNextAuthUserSchema } from '@/types/hitobito-next-auth-user';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { TabGroup, TabPanel, TabPanels } from '@headlessui/react';
import { FileText, LayoutGrid } from 'lucide-react';
import { signIn, useSession } from 'next-auth/react';
import type React from 'react';
import { useCallback, useMemo, useRef, useState } from 'react';

import { useQuery } from '@tanstack/react-query';

/** The sections of one Hof's dashboard. */
type Tab = 'overview' | HofDashboardArea | 'documents';

const TAB_IDS: readonly Tab[] = ['overview', ...HOF_DASHBOARD_AREAS, 'documents'];

/** What a reviewer can look at: every Hof, the material orders, or one Hof's sections. */
type ReviewerScreen = 'hoefe' | 'orders' | Tab;

const REVIEWER_SCREENS: readonly ReviewerScreen[] = ['hoefe', 'orders', ...TAB_IDS];

const Message: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Panel className="space-y-4 text-base text-green-800">{children}</Panel>
);

// next-auth navigates to Cevi.DB itself. With `redirect: false` it answers `undefined` whenever
// it cannot load its providers, a second tap during the first redirect for one, so there is no
// response to read a URL from.
const signInWithCeviDatabase = async (): Promise<void> => {
  await signIn('cevi-db', { callbackUrl: globalThis.location.href });
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
            closed: form.closed || form.finalized,
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

/** One Hof's dashboard data, shared by its sections and the line under its name. */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- tRPC's query result
const useHofDashboard = (hofId: string, locale: Locale) => {
  const trpc = useTRPC();
  return useQuery(
    trpc.hofDashboard.getHofDashboard.queryOptions(
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
    ),
  );
};

/** The Hof's responsible people under its name, once its dashboard has loaded. */
const HofResponsible: React.FC<{ hofId: string; locale: Locale }> = ({ hofId, locale }) => {
  const dashboard = useHofDashboard(hofId, locale);
  if (dashboard.isLoading) return <ResponsibleLineSkeleton />;
  if (dashboard.data === undefined) return <></>;
  return <ResponsibleLine people={dashboard.data.responsible} locale={locale} />;
};

/** One Hof's dashboard: its sections as a row of tabs, with what is open behind each. */
const DashboardForHof: React.FC<{
  hofId: string;
  tab: Tab;
  onTab: (tab: Tab) => void;
  locale: Locale;
}> = ({ hofId, tab, onTab, locale }) => {
  const [scrollTarget, setScrollTarget] = useState<string>();
  // the form an area shows, by area, so a look at another section keeps the choice
  const [chosenForms, setChosenForms] = useState<Partial<Record<HofDashboardArea, string>>>({});
  const clearScrollTarget = useCallback(() => setScrollTarget(undefined), []);
  const root = useRef<HTMLDivElement>(null);
  useScrollToForm(root, scrollTarget, clearScrollTarget);

  const dashboard = useHofDashboard(hofId, locale);
  const progress = useProgress(dashboard.data);

  if (dashboard.isLoading) return <HofSkeleton locale={locale} />;
  if (dashboard.data === undefined || progress === undefined) {
    return <RetryMessage locale={locale} onRetry={() => void dashboard.refetch()} />;
  }
  const data = dashboard.data;

  const openForm = (area: HofDashboardArea, formId: string): void => {
    setChosenForms((chosen) => ({ ...chosen, [area]: formId }));
    onTab(area);
    setScrollTarget(formId);
  };
  const areaView = (area: HofDashboardArea): React.ReactNode => (
    <AreaView
      area={area}
      data={data}
      progress={progress}
      selectedFormId={chosenForms[area]}
      onSelect={(formId) => openForm(area, formId)}
      locale={locale}
    />
  );
  const panels: Record<Tab, React.ReactNode> = {
    overview: (
      <OverviewView
        data={data}
        progress={progress}
        locale={locale}
        onOpen={openForm}
        onOpenArea={onTab}
        onOpenDocuments={() => onTab('documents')}
      />
    ),
    infrastructure: areaView('infrastructure'),
    program: areaView('program'),
    material: areaView('material'),
    documents: <DocumentsView data={data} progress={progress} locale={locale} />,
  };
  const tabLabel = (id: Tab): string => {
    if (id === 'overview') return translate('tabOverview', locale);
    if (id === 'documents') return translate('tabDocuments', locale);
    return HOF_DASHBOARD_AREA_LABELS[id][locale];
  };
  const marker = (id: Tab): React.ReactNode => {
    if (id === 'overview') return <LayoutGrid className="h-4 w-4" aria-hidden />;
    if (id === 'documents') return <FileText className="h-4 w-4" aria-hidden />;
    return <AreaIcon area={id} />;
  };

  return (
    <div ref={root}>
      <TabGroup
        selectedIndex={TAB_IDS.indexOf(tab)}
        onChange={(index) => onTab(TAB_IDS[index] ?? 'overview')}
        className="space-y-6"
      >
        <DashboardTabList
          tabs={TAB_IDS.map((id) => {
            // what the Hof still has to hand in or revise behind an area's tab
            const open = data.forms.filter((form) => {
              const formProgress = progress[form.id];
              return form.area === id && formProgress !== undefined && isOpen(formProgress);
            }).length;
            return {
              label: tabLabel(id),
              marker: marker(id),
              open,
              openLabel: translate('openCount', locale, { n: open }),
            };
          })}
          label={translate('tabs', locale)}
        />
        {/* kept mounted, so what was typed into an open form survives a look at another tab */}
        <TabPanels className="@container min-w-0">
          {TAB_IDS.map((id) => (
            <TabPanel key={id} unmount={false}>
              {panels[id]}
            </TabPanel>
          ))}
        </TabPanels>
      </TabGroup>
    </div>
  );
};

/** Whether the other Hof may replace this one's dashboard, and with it what was not saved. */
const maySwitch = (locale: Locale): boolean =>
  !hasUnsavedWork() || globalThis.confirm(translate('discardUnsaved', locale));

/** The last step of the path to a Hof: its name, or the switch where there is more than one. */
const hofCrumb = (
  hof: { id: string; name: string },
  hoefe: { id: string; name: string }[],
  onSwitch: (hofId: string) => void,
  locale: Locale,
): Crumb => ({
  label: hof.name,
  control:
    hoefe.length > 1 ? (
      <HofSwitch
        hoefe={hoefe}
        value={hof.id}
        onChange={(hofId) => {
          if (maySwitch(locale)) onSwitch(hofId);
        }}
        locale={locale}
      />
    ) : undefined,
});

/** The dashboard of a Hof's own people: their Hof, or a choice of theirs. */
const DashboardForAdministrator: React.FC<{
  hoefe: { id: string; name: string }[];
  account: React.ReactNode;
  locale: Locale;
}> = ({ hoefe, account, locale }) => {
  const [tab, setTab] = useTabInAddress(TAB_IDS, 'overview');
  const [selectedHofId, setSelectedHofId] = useRememberedHofId();
  const hof = hoefe.find((candidate) => candidate.id === selectedHofId) ?? hoefe[0];
  if (hof === undefined) return <></>;

  return (
    <div className="space-y-6">
      <DashboardHeader
        crumbs={[hofCrumb(hof, hoefe, setSelectedHofId, locale)]}
        subline={<HofResponsible hofId={hof.id} locale={locale} />}
        isReviewer={false}
        account={account}
        locale={locale}
      />
      <DashboardForHof key={hof.id} hofId={hof.id} tab={tab} onTab={setTab} locale={locale} />
    </div>
  );
};

/** The two views of the Ressort over every Hof, as a segmented control under its header. */
const ReviewerTabs: React.FC<{
  screen: 'hoefe' | 'orders';
  onScreen: (screen: 'hoefe' | 'orders') => void;
  locale: Locale;
}> = ({ screen, onScreen, locale }) => (
  <nav
    aria-label={translate('reviewerViews', locale)}
    className={cn(segmentedTrackClassName, 'w-fit max-w-full overflow-x-auto')}
  >
    {(['hoefe', 'orders'] as const).map((candidate) => (
      <button
        key={candidate}
        type="button"
        aria-current={candidate === screen ? 'page' : undefined}
        className={cn(
          segmentClassName(candidate === screen),
          'shrink-0 px-4 text-sm font-semibold',
        )}
        onClick={() => onScreen(candidate)}
      >
        {translate(candidate === 'hoefe' ? 'allHoefe' : 'materialOrders', locale)}
      </button>
    ))}
  </nav>
);

/**
 * The dashboard of the Ressorts: every Hof and the material orders, and from there one Hof's
 * dashboard, where they answer what it handed in. The address names the screen, so the back
 * button returns from a Hof to the list.
 */
const DashboardForReviewer: React.FC<{
  hoefe: { id: string; name: string }[];
  rows: HofOverviewRow[];
  account: React.ReactNode;
  locale: Locale;
}> = ({ hoefe, rows, account, locale }) => {
  const [screen, setScreen] = useTabInAddress(REVIEWER_SCREENS, 'hoefe');
  const [selectedHofId, setSelectedHofId] = useRememberedHofId();
  const hof = hoefe.find((candidate) => candidate.id === selectedHofId) ?? hoefe[0];

  const openHof = (hofId: string, area?: HofDashboardArea): void => {
    setSelectedHofId(hofId);
    setScreen(area ?? 'overview');
    globalThis.scrollTo({ top: 0 });
  };
  const toList = (): void => {
    if (maySwitch(locale)) setScreen('hoefe');
  };

  if (screen === 'hoefe' || screen === 'orders' || hof === undefined) {
    const list = screen === 'orders' ? 'orders' : 'hoefe';
    const title = translate(list === 'orders' ? 'materialOrders' : 'allHoefe', locale);
    return (
      <div className="space-y-6">
        <DashboardHeader crumbs={[{ label: title }]} isReviewer account={account} locale={locale} />
        <ReviewerTabs screen={list} onScreen={setScreen} locale={locale} />
        {list === 'orders' ? (
          <MaterialOrdersView onOpenHof={(hofId) => openHof(hofId, 'material')} locale={locale} />
        ) : (
          <HofOverviewTable hoefe={rows} onOpen={openHof} locale={locale} />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        crumbs={[
          { label: translate('allHoefe', locale), onClick: toList },
          hofCrumb(hof, hoefe, setSelectedHofId, locale),
        ]}
        subline={<HofResponsible hofId={hof.id} locale={locale} />}
        isReviewer
        account={account}
        locale={locale}
      />
      <DashboardForHof key={hof.id} hofId={hof.id} tab={screen} onTab={setScreen} locale={locale} />
    </div>
  );
};

const DashboardForUser: React.FC<{ account: React.ReactNode; locale: Locale }> = ({
  account,
  locale,
}) => {
  const trpc = useTRPC();
  const hoefe = useQuery(
    trpc.hofDashboard.getMyHofList.queryOptions(undefined, {
      // a Hof the user was given or lost since the last visit
      refetchOnMount: true,
      meta: { persist: false },
    }),
  );
  // for the reviewers every Hof at a glance; empty for a Hof's own people
  const overview = useQuery(
    trpc.hofDashboard.getHofOverview.queryOptions(undefined, {
      staleTime: 30_000,
      refetchOnMount: true,
      refetchOnWindowFocus: true,
      meta: { persist: false },
    }),
  );

  if (hoefe.isLoading || overview.isLoading) return <DashboardSkeleton locale={locale} />;
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
  // without the overview a reviewer still reaches every Hof, through the choice of Höfe
  return overview.data?.isReviewer === true ? (
    <DashboardForReviewer
      hoefe={hoefe.data}
      rows={overview.data.hoefe}
      account={account}
      locale={locale}
    />
  ) : (
    <DashboardForAdministrator hoefe={hoefe.data} account={account} locale={locale} />
  );
};

const HofDashboardContent: React.FC = () => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const { data: session } = useSession();
  const status = useAuthStatus();

  if (status === 'loading') return <DashboardSkeleton locale={locale} />;
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
  const user = HitobitoNextAuthUserSchema.safeParse(session?.user).data;
  const name = user?.name ?? user?.email ?? '';
  return (
    <DashboardForUser
      account={
        user !== undefined && name !== '' ? (
          <AccountButton userId={user.uuid} name={name} locale={locale} />
        ) : undefined
      }
      locale={locale}
    />
  );
};

/**
 * The Hof dashboard as an editor places it on a page: the address administrators of a Hof
 * hand in its plans, order material and follow what the Ressorts say; the Ressorts see every
 * Hof and answer them. Signed-out visitors are asked to sign in; nothing is fetched for them,
 * since the tRPC client answers a 401 with a sign out and a redirect.
 *
 * Laid out by container queries: the block may sit in a content column narrower than the
 * viewport, or in a two-column block.
 */
export const HofDashboard: React.FC = () => (
  <div className="@container/dashboard">
    <HofDashboardContent />
  </div>
);
