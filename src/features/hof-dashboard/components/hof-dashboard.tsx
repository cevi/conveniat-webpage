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
import type { HofOverviewRow } from '@/features/hof-dashboard/api/hof-overview';
import { AreaView } from '@/features/hof-dashboard/components/area-view';
import { DashboardTabList } from '@/features/hof-dashboard/components/dashboard-tabs';
import {
  AreaIcon,
  LABEL_CLASS,
  Panel,
  PRIMARY_BUTTON_CLASS,
  QUIET_BUTTON_CLASS,
  ResponsibleList,
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
import { useCurrentLocale } from '@/hooks/use-current-locale';
import { useReleasePushSubscriptions } from '@/hooks/use-release-push-subscriptions';
import { flushPersonalData } from '@/lib/flush-personal-data';
import { trpc } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { TabGroup, TabPanel, TabPanels } from '@headlessui/react';
import { ChevronLeft, FileText, LayoutGrid, LogOut } from 'lucide-react';
import { signIn, signOut, useSession } from 'next-auth/react';
import type React from 'react';
import { useCallback, useId, useMemo, useRef, useState } from 'react';

/** The sections of one Hof's dashboard. */
type Tab = 'overview' | HofDashboardArea | 'documents';

const TAB_IDS: readonly Tab[] = ['overview', ...HOF_DASHBOARD_AREAS, 'documents'];

/** What a reviewer can look at: every Hof, the material orders, or one Hof's sections. */
type ReviewerScreen = 'hoefe' | 'orders' | Tab;

const REVIEWER_SCREENS: readonly ReviewerScreen[] = ['hoefe', 'orders', ...TAB_IDS];

const LoadingState: React.FC<{ locale: Locale }> = ({ locale }) => (
  <div className="space-y-4" role="status">
    <span className="sr-only">{translate('loading', locale)}</span>
    <Skeleton className="h-11 w-full bg-gray-200" />
    <Skeleton className="h-32 w-full rounded-xl bg-gray-200" />
    <Skeleton className="h-48 w-full rounded-xl bg-gray-200" />
  </div>
);

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

/**
 * Who is signed in, and the way out: the dashboard shows one person's Höfe, so on a shared
 * phone the next person needs to see whose they are and switch.
 */
const SignedInLine: React.FC<{ name: string; locale: Locale }> = ({ name, locale }) => {
  const releasePushSubscriptions = useReleasePushSubscriptions();

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-green-700">
      <span>
        {translate('signedInAs', locale, { name: '' })}
        <span className="font-semibold text-green-900">{name}</span>
      </span>
      <button
        type="button"
        className={SECONDARY_BUTTON_CLASS}
        onClick={() => {
          void releasePushSubscriptions().then(() => {
            flushPersonalData({ clearCachedPages: true });
            return signOut({ redirectTo: globalThis.location.href });
          });
        }}
      >
        <LogOut aria-hidden />
        {translate('signOut', locale)}
      </button>
    </div>
  );
};

/**
 * The head of every screen: what it is, its title, a line about it, and who is signed in on
 * the right.
 */
const Header: React.FC<{
  eyebrow: string;
  title: React.ReactNode;
  intro?: string | undefined;
  back?: React.ReactNode;
  account: React.ReactNode;
}> = ({ eyebrow, title, intro, back, account }) => (
  <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4 @min-[900px]/dashboard:flex-nowrap">
    <div className="min-w-0 flex-1 space-y-1">
      {back}
      <p className={LABEL_CLASS}>{eyebrow}</p>
      {title}
      {intro !== undefined && (
        <p className="max-w-2xl pt-1 text-base text-pretty text-green-700">{intro}</p>
      )}
    </div>
    <div className="min-w-0 @min-[900px]/dashboard:shrink-0">{account}</div>
  </header>
);

/** A Hof's name as the title of its dashboard. */
const HofTitle: React.FC<{ name: string }> = ({ name }) => (
  <h2 className="font-heading text-heading text-3xl leading-tight font-extrabold text-balance @3xl:text-4xl">
    {name}
  </h2>
);

/**
 * One Hof's dashboard: its sections on the left, on a narrow screen a row above, with what is
 * open behind each and the Hof's responsible person under them, and the chosen section beside.
 */
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
        className="grid items-start gap-6 @min-[900px]/dashboard:grid-cols-[13rem_minmax(0,1fr)] @min-[900px]/dashboard:gap-8"
      >
        <aside className="space-y-6 @min-[900px]/dashboard:sticky @min-[900px]/dashboard:top-28">
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
          {/* whom to ask stays in view beside every section; a narrow screen shows it in the
              overview instead. A container of its own, so the list lays out for the column */}
          <div className="border-line @container hidden space-y-2 border-t px-4 pt-5 @min-[900px]/dashboard:block">
            <p className={LABEL_CLASS}>{translate('responsible', locale)}</p>
            <ResponsibleList people={data.responsible} locale={locale} />
          </div>
        </aside>
        {/* kept mounted, so what was typed into an open form survives a look at another tab;
            the sections lay out by the room beside the sidebar */}
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

/** The dashboard of a Hof's own people: their Hof, or a choice of theirs. */
const DashboardForAdministrator: React.FC<{
  hoefe: { id: string; name: string }[];
  account: React.ReactNode;
  locale: Locale;
}> = ({ hoefe, account, locale }) => {
  const [tab, setTab] = useTabInAddress(TAB_IDS, 'overview');
  const [selectedHofId, setSelectedHofId] = useRememberedHofId();
  const selectId = useId();
  const hof = hoefe.find((candidate) => candidate.id === selectedHofId) ?? hoefe[0];
  if (hof === undefined) return <></>;

  const title =
    hoefe.length === 1 ? (
      <HofTitle name={hof.name} />
    ) : (
      <div className="space-y-1">
        {/* the select shows the name; the heading keeps the outline of the page intact */}
        <h2 className="sr-only">{hof.name}</h2>
        <label htmlFor={selectId} className="sr-only">
          {translate('hof', locale)}
        </label>
        <Select
          value={hof.id}
          onValueChange={(hofId) => {
            if (maySwitch(locale)) setSelectedHofId(hofId);
          }}
        >
          <SelectTrigger
            id={selectId}
            className="font-heading text-heading h-14 w-full max-w-md bg-white text-2xl font-extrabold focus-visible:ring-2 focus-visible:ring-green-600"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-w-(--radix-select-content-available-width) bg-white">
            {hoefe.map((candidate) => (
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
    );

  return (
    <div className="space-y-8">
      <Header
        eyebrow={translate('eyebrow', locale)}
        title={title}
        intro={tab === 'overview' ? translate('intro', locale) : undefined}
        account={account}
      />
      <DashboardForHof key={hof.id} hofId={hof.id} tab={tab} onTab={setTab} locale={locale} />
    </div>
  );
};

/** The two views of the Ressort over every Hof, as tabs under its header. */
const ReviewerTabs: React.FC<{
  screen: 'hoefe' | 'orders';
  onScreen: (screen: 'hoefe' | 'orders') => void;
  locale: Locale;
}> = ({ screen, onScreen, locale }) => (
  <nav aria-label={translate('reviewerViews', locale)} className="border-line flex gap-6 border-b">
    {(['hoefe', 'orders'] as const).map((candidate) => (
      <button
        key={candidate}
        type="button"
        aria-current={candidate === screen ? 'page' : undefined}
        className={cn(
          '-mb-px min-h-11 cursor-pointer border-b-2 px-1 text-base font-semibold transition',
          candidate === screen
            ? 'border-conveniat-green text-green-900'
            : 'border-transparent text-green-700 hover:text-green-900',
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

  if (screen === 'hoefe' || screen === 'orders' || hof === undefined) {
    const list = screen === 'orders' ? 'orders' : 'hoefe';
    return (
      <div className="space-y-6">
        <Header
          eyebrow={translate('reviewerEyebrow', locale)}
          title={
            <h2 className="font-heading text-heading text-3xl leading-tight font-extrabold @3xl:text-4xl">
              {translate(list === 'orders' ? 'materialOrders' : 'allHoefe', locale)}
            </h2>
          }
          intro={list === 'hoefe' ? translate('reviewerIntro', locale) : undefined}
          account={account}
        />
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
    <div className="space-y-8">
      <Header
        eyebrow={translate('reviewerEyebrow', locale)}
        back={
          <button
            type="button"
            className={cn(QUIET_BUTTON_CLASS, '-ml-3')}
            onClick={() => {
              if (maySwitch(locale)) setScreen('hoefe');
            }}
          >
            <ChevronLeft aria-hidden />
            {translate('allHoefe', locale)}
          </button>
        }
        title={<HofTitle name={hof.name} />}
        account={account}
      />
      <DashboardForHof key={hof.id} hofId={hof.id} tab={screen} onTab={setScreen} locale={locale} />
    </div>
  );
};

const DashboardForUser: React.FC<{ account: React.ReactNode; locale: Locale }> = ({
  account,
  locale,
}) => {
  const hoefe = trpc.hofDashboard.getMyHofList.useQuery(undefined, {
    // a Hof the user was given or lost since the last visit
    refetchOnMount: true,
    meta: { persist: false },
  });
  // for the reviewers every Hof at a glance; empty for a Hof's own people
  const overview = trpc.hofDashboard.getHofOverview.useQuery(undefined, {
    staleTime: 30_000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    meta: { persist: false },
  });

  if (hoefe.isLoading || overview.isLoading) return <LoadingState locale={locale} />;
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
    <DashboardForUser
      account={name === '' ? undefined : <SignedInLine name={name} locale={locale} />}
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
