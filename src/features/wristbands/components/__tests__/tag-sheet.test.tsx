/**
 * @jest-environment jsdom
 */

import { TagSheet } from '@/features/wristbands/components/tag-sheet';
import { fireEvent, render, screen } from '@testing-library/react';

const back = jest.fn();
const replace = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: (): unknown => ({ back, replace }) }));
jest.mock('@/hooks/use-current-locale', () => ({ useCurrentLocale: (): string => 'de' }));

beforeEach(() => {
  back.mockClear();
  replace.mockClear();
});

const closeSheet = (): void => {
  fireEvent.click(screen.getByRole('button', { name: 'Schliessen' }));
};

describe('the sheet a tapped band opens', () => {
  it('shows the band over the open page and closes back to it', () => {
    render(
      <TagSheet closeTo="back">
        <p>Fuchs</p>
      </TagSheet>,
    );
    expect(screen.getByRole('dialog', { name: 'Armband' })).toHaveTextContent('Fuchs');
    closeSheet();
    expect(back).toHaveBeenCalledTimes(1);
    expect(replace).not.toHaveBeenCalled();
  });

  it('closes a band loaded cold to Home', () => {
    render(
      <TagSheet closeTo="home">
        <p>Fuchs</p>
      </TagSheet>,
    );
    closeSheet();
    expect(replace).toHaveBeenCalledWith('/app/dashboard');
    expect(back).not.toHaveBeenCalled();
  });
});
