/**
 * @jest-environment jsdom
 */

import type { GenericPage } from '@/features/payload-cms/payload-types';
import { ScheduleStoryRows } from '@/features/schedule/components/schedule-story-rows';
import { createTestTrpc } from '@/trpc/test-trpc';
import { render, screen } from '@testing-library/react';

jest.mock(
  '@/trpc/client',
  () =>
    jest.requireActual<typeof import('@/trpc/test-trpc')>('@/trpc/test-trpc').mockTrpcClientModule,
);

let isLeader = false;
jest.mock('@/hooks/use-leader-access', () => ({ useLeaderAccess: (): boolean => isLeader }));

const page = { id: 'p1', seo: { urlSlug: 'ablauf-eroeffnung' } } as unknown as GenericPage;

const story = {
  events: [
    {
      id: 'e1',
      title: 'Das verschwundene Siegel',
      isPrologue: false,
      excerpt: '',
      isNew: true,
    },
  ],
  challenges: [{ id: 'c1', title: 'Höchste Menschenpyramide', isOver: false, isNew: false }],
};

describe('ScheduleStoryRows', () => {
  afterEach(() => {
    isLeader = false;
  });

  it('links everybody to the page the editors chose, under its label', () => {
    const testTrpc = createTestTrpc({});
    render(
      <ScheduleStoryRows
        entryIds={['s1']}
        furtherPage={page}
        furtherPageLabel="Ablauf Eröffnungsfeier"
        locale="de"
      />,
      { wrapper: testTrpc.wrapper },
    );

    expect(screen.getByRole('link', { name: /Ablauf Eröffnungsfeier/ })).toHaveAttribute(
      'href',
      '/ablauf-eroeffnung',
    );
    // a participant never asks for the story
    expect(testTrpc.calls).toEqual([]);
  });

  it('shows Leitende the story and the challenges of all slots of the block', async () => {
    isLeader = true;
    const testTrpc = createTestTrpc({ 'story.getStoryOfScheduleEntries': () => story });
    render(
      <ScheduleStoryRows
        entryIds={['s1', 's2']}
        furtherPage={undefined}
        furtherPageLabel={undefined}
        locale="de"
      />,
      { wrapper: testTrpc.wrapper },
    );

    expect(await screen.findByRole('link', { name: /Das verschwundene Siegel/ })).toHaveAttribute(
      'href',
      '/app/story?event=e1',
    );
    expect(screen.getByRole('link', { name: /Höchste Menschenpyramide/ })).toHaveAttribute(
      'href',
      '/app/challenges?id=c1',
    );
    expect(testTrpc.calls).toEqual([
      { path: 'story.getStoryOfScheduleEntries', input: { entryIds: ['s1', 's2'] } },
    ]);
  });
});
