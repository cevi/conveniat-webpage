'use client';

import { Button } from '@/components/ui/buttons/button';
import { Card } from '@/components/ui/card';
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
import { DocumentsView } from '@/features/hof-dashboard/components/documents-view';
import { MaterialOrderForm } from '@/features/hof-dashboard/components/material-order-form';
import { OverviewView } from '@/features/hof-dashboard/components/overview-view';
import { translate, type TextKey } from '@/features/hof-dashboard/components/texts';
import type { HofDashboardArea, HofSubmissionType } from '@/features/hof-dashboard/constants';
import { useScrollToSubmission } from '@/features/hof-dashboard/hooks/use-scroll-to-submission';
import {
  getSubmissionProgress,
  type SubmissionProgress,
} from '@/features/hof-dashboard/utils/submission-progress';
import { trpc } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { signIn, useSession } from 'next-auth/react';
import { useCurrentLocale } from 'next-i18n-router/client';
import type React from 'react';
import { useCallback, useMemo, useState } from 'react';

type Tab = 'overview' | HofDashboardArea | 'orders' | 'documents';

const TABS: { tab: Tab; label: TextKey }[] = [
  { tab: 'overview', label: 'tabOverview' },
  { tab: 'infrastructure', label: 'tabInfrastructure' },
  { tab: 'program', label: 'tabProgram' },
  { tab: 'orders', label: 'tabOrders' },
  { tab: 'documents', label: 'tabDocuments' },
];

const LoadingState: React.FC = () => (
  <div className="space-y-4" aria-busy>
    <Skeleton className="h-10 w-full max-w-md rounded-full" />
    <Skeleton className="h-32 w-full rounded-xl" />
    <Skeleton className="h-48 w-full rounded-xl" />
  </div>
);

const Message: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Card className="border border-gray-100" contentClassName="space-y-4 p-6 text-sm text-gray-600">
    {children}
  </Card>
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

const DashboardForHof: React.FC<{ hofId: string; locale: Locale }> = ({ hofId, locale }) => {
  const [tab, setTab] = useState<Tab>('overview');
  const [scrollTarget, setScrollTarget] = useState<HofSubmissionType>();
  const clearScrollTarget = useCallback(() => setScrollTarget(undefined), []);
  useScrollToSubmission(scrollTarget, clearScrollTarget);

  const dashboard = trpc.hofDashboard.getHofDashboard.useQuery(
    { hofId },
    // what the Ressorts write back should show without a reload
    { refetchOnMount: 'always' },
  );
  const progress = useProgress(dashboard.data);

  if (dashboard.isLoading) return <LoadingState />;
  if (dashboard.data === undefined || progress === undefined) {
    return (
      <Message>
        <p>{translate('loadError', locale)}</p>
        <Button type="button" variant="outline" onClick={() => void dashboard.refetch()}>
          {translate('retry', locale)}
        </Button>
      </Message>
    );
  }
  const data = dashboard.data;

  return (
    <div className="space-y-6">
      <div>
        <div className="inline-flex flex-wrap gap-y-1 rounded-3xl bg-gray-100 p-1" role="tablist">
          {TABS.map(({ tab: candidate, label }) => (
            <button
              key={candidate}
              type="button"
              role="tab"
              aria-selected={tab === candidate}
              onClick={() => setTab(candidate)}
              className={cn(
                'cursor-pointer rounded-full px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2 @xl:px-5',
                tab === candidate
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900',
              )}
            >
              {translate(label, locale)}
            </button>
          ))}
        </div>
      </div>

      <div role="tabpanel">
        {tab === 'overview' && (
          <OverviewView
            data={data}
            progress={progress}
            locale={locale}
            onOpen={(area, type) => {
              setTab(area);
              setScrollTarget(type);
            }}
          />
        )}
        {(tab === 'infrastructure' || tab === 'program') && (
          <AreaView area={tab} data={data} progress={progress} locale={locale} />
        )}
        {tab === 'orders' && (
          <div className="space-y-6">
            <MaterialOrderForm
              key={`infrastructure-${data.orders.infrastructure.updatedAt ?? 'new'}`}
              hofId={data.hof.id}
              order={data.orders.infrastructure}
              locale={locale}
            />
            <MaterialOrderForm
              key={`stadtleben-${data.orders.stadtleben.updatedAt ?? 'new'}`}
              hofId={data.hof.id}
              order={data.orders.stadtleben}
              locale={locale}
            />
          </div>
        )}
        {tab === 'documents' && <DocumentsView data={data} locale={locale} />}
      </div>
    </div>
  );
};

const DashboardForUser: React.FC<{ locale: Locale }> = ({ locale }) => {
  const hoefe = trpc.hofDashboard.getMyHofList.useQuery();
  const [selectedHofId, setSelectedHofId] = useState<string>();

  if (hoefe.isLoading) return <LoadingState />;
  if (hoefe.data === undefined) {
    return (
      <Message>
        <p>{translate('loadError', locale)}</p>
        <Button type="button" variant="outline" onClick={() => void hoefe.refetch()}>
          {translate('retry', locale)}
        </Button>
      </Message>
    );
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
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <p className="text-sm text-gray-500">{translate('hof', locale)}</p>
          <h2 className="font-heading text-conveniat-green text-2xl font-extrabold">{hof.name}</h2>
        </div>
        {hoefe.data.length > 1 && (
          <Select value={hof.id} onValueChange={setSelectedHofId}>
            <SelectTrigger className="w-64 bg-white" aria-label={translate('hof', locale)}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white">
              {hoefe.data.map((candidate) => (
                <SelectItem key={candidate.id} value={candidate.id}>
                  {candidate.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      <DashboardForHof key={hof.id} hofId={hof.id} locale={locale} />
    </div>
  );
};

const HofDashboardContent: React.FC = () => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const { status } = useSession();

  if (status === 'loading') return <LoadingState />;
  if (status === 'unauthenticated') {
    return (
      <Message>
        <p>{translate('loginRequired', locale)}</p>
        <Button type="button" onClick={() => void signInWithCeviDatabase()}>
          {translate('login', locale)}
        </Button>
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
