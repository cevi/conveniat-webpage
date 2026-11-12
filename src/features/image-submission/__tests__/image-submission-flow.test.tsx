/**
 * @jest-environment jsdom
 */
import type { ImageSubmissionTexts } from '@/features/image-submission/api/image-submission-texts';
import { ImageSubmissionFlow } from '@/features/image-submission/image-submission-flow';
import type { OwnSubmittedImage } from '@/features/payload-cms/api/upload-router';
import type { ProcedureHandler } from '@/trpc/test-trpc';
import { createTestTrpc } from '@/trpc/test-trpc';
import { fireEvent, render as renderInto, screen, waitFor, within } from '@testing-library/react';
import type React from 'react';

jest.mock('@/hooks/use-current-locale', () => ({ useCurrentLocale: (): string => 'de' }));
jest.mock('@/components/header/header-actions', () => ({
  SetHeaderActions: ({ children }: { children?: React.ReactNode }): React.ReactNode => children,
}));
jest.mock(
  '@/trpc/client',
  () =>
    jest.requireActual<typeof import('@/trpc/test-trpc')>('@/trpc/test-trpc').mockTrpcClientModule,
);
jest.mock('@/features/payload-cms/hooks/use-user-upload', () => ({
  useUserUpload: (): object => ({ uploadImage: jest.fn(), isUploading: false }),
}));

const texts: ImageSubmissionTexts = {
  introTitle: 'Deine Fotos fürs conveniat27',
  introText: '',
  introSteps: [{ title: 'Eigene Fotos', text: 'Nur Bilder, die du selbst gemacht hast.' }],
  termsLead: 'Mit dem Einreichen erlaubst du conveniat27, deine Bilder zu verwenden.',
  termsSummary: [{ title: 'Du hast das Foto gemacht', text: '' }],
  termsFullText: 'Der ganze Text der Bedingungen.',
  photoTips: ['Originalfoto statt Screenshot.'],
  successText: '',
};

const chooseImages = (): HTMLElement => screen.getByRole('button', { name: 'Bilder auswählen' });

let ownImages: OwnSubmittedImage[] = [];
const withdraw = jest.fn<unknown, [unknown]>(() => {
  ownImages = [];
  return { withdrawn: true };
});

/** Renders with the user's own images answered from `ownImages`. */
const render = (element: React.ReactElement): ReturnType<typeof renderInto> => {
  const handlers: Record<string, ProcedureHandler> = {
    'upload.getOwnSubmittedImageList': () => ownImages,
    'upload.withdrawSubmittedImage': withdraw,
  };
  const { wrapper } = createTestTrpc(handlers);
  return renderInto(element, { wrapper });
};

beforeEach(() => {
  localStorage.clear();
  ownImages = [];
  withdraw.mockClear();
});

it('introduces the upload on the first visit, then asks for the terms before any image', () => {
  render(<ImageSubmissionFlow texts={texts} />);

  expect(screen.getByRole('heading', { name: texts.introTitle })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Weiter' }));

  expect(screen.getByText('Du hast das Foto gemacht')).toBeVisible();
  expect(screen.queryByLabelText(/Bilder auswählen/)).toBeNull();
  expect(chooseImages()).toBeDisabled();

  fireEvent.click(screen.getByRole('button', { name: 'Vollständige Bedingungen lesen' }));
  expect(screen.getByText(texts.termsFullText)).toBeVisible();

  fireEvent.click(screen.getByLabelText(/bin einverstanden/));
  fireEvent.click(chooseImages());

  expect(screen.getByLabelText(/Bilder auswählen/)).toBeInTheDocument();
  expect(screen.getByText('Originalfoto statt Screenshot.')).toBeVisible();
});

it('skips the introduction once this device has seen it, and offers it again', () => {
  const { unmount } = render(<ImageSubmissionFlow texts={texts} />);
  fireEvent.click(screen.getByRole('button', { name: 'Weiter' }));
  unmount();

  render(<ImageSubmissionFlow texts={texts} />);
  expect(screen.queryByRole('heading', { name: texts.introTitle })).toBeNull();
  expect(chooseImages()).toBeDisabled();

  fireEvent.click(screen.getByRole('button', { name: "So funktioniert's" }));
  expect(screen.getByRole('heading', { name: texts.introTitle })).toBeVisible();
});

it('stays closed while the editors have written no terms', () => {
  render(<ImageSubmissionFlow texts={{ ...texts, termsFullText: '' }} />);

  expect(screen.getByText('Bild-Upload noch nicht offen')).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Bilder auswählen' })).toBeNull();
});

it('lists the images handed in so far and withdraws one after asking', async () => {
  localStorage.setItem('image-submission-intro-seen', '1');
  ownImages = [
    {
      id: 'img-1',
      description: 'Züri 11 beim Znacht am Feuer',
      submittedAt: '2027-07-25T18:42:00.000Z',
      thumbnailUrl: undefined,
    },
  ];
  render(<ImageSubmissionFlow texts={texts} />);
  fireEvent.click(screen.getByLabelText(/bin einverstanden/));
  fireEvent.click(chooseImages());

  const description = await screen.findByText('Züri 11 beim Znacht am Feuer');
  const row = description.closest('li');
  expect(row).not.toBeNull();
  fireEvent.click(within(row as HTMLElement).getByRole('button', { name: 'Zurückziehen' }));

  const sheet = await screen.findByRole('dialog', { name: 'Bild zurückziehen?' });
  expect(withdraw).not.toHaveBeenCalled();
  fireEvent.click(within(sheet).getByRole('button', { name: 'Zurückziehen' }));

  await waitFor(() => expect(withdraw).toHaveBeenCalledWith({ id: 'img-1' }));
  // the list sits inside the upload form, which must not be sent along
  expect(screen.queryByText('Bitte wähle mindestens ein Bild aus')).toBeNull();
  await waitFor(() => expect(screen.queryByText('Züri 11 beim Znacht am Feuer')).toBeNull());
});
