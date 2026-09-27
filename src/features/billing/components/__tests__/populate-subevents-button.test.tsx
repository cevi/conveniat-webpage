/**
 * @jest-environment jsdom
 */
import { PopulateSubeventsButton } from '@/features/billing/components/populate-subevents-button';
import { render, screen } from '@testing-library/react';
import React from 'react';

let mockHoefePermissions: { create?: boolean; update?: boolean } = {};

jest.mock('@payloadcms/ui', () => ({
  useAuth: (): unknown => ({ permissions: { collections: { hoefe: mockHoefePermissions } } }),
  useListQuery: (): unknown => ({ query: {}, refineListData: jest.fn() }),
  useLocale: (): unknown => ({ code: 'de' }),
}));
jest.mock('@/features/billing/hooks/use-populate-subevents', () => ({
  usePopulateSubevents: (): unknown => ({
    state: {
      phase: 'idle',
      processedGroups: 0,
      totalGroups: 0,
      foundEvents: [],
      newEventIds: new Set(),
      error: undefined,
    },
    isRunning: false,
    start: jest.fn(),
  }),
}));
jest.mock('@/features/payload-cms/payload-cms/components/shared/confirmation-modal', () => ({
  ConfirmationModal: (): React.ReactNode => undefined,
}));

describe('PopulateSubeventsButton', () => {
  it('offers the sync to whoever may update the Höfe, though nobody may create one by hand', () => {
    mockHoefePermissions = { create: false, update: true };
    render(<PopulateSubeventsButton />);
    expect(screen.getByText('Anlässe automatisch aus Cevi.DB laden')).toBeInTheDocument();
  });

  it('hides it from everyone else', () => {
    mockHoefePermissions = { create: false, update: false };
    const { container } = render(<PopulateSubeventsButton />);
    expect(container).toBeEmptyDOMElement();
  });
});
