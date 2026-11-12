/**
 * @jest-environment jsdom
 */
import type { ImageSubmissionTexts } from '@/features/image-submission/api/image-submission-texts';
import { ImageSubmissionFlow } from '@/features/image-submission/image-submission-flow';
import { fireEvent, render, screen } from '@testing-library/react';

jest.mock('@/hooks/use-current-locale', () => ({ useCurrentLocale: (): string => 'de' }));
jest.mock('@/components/header/header-actions', () => ({
  SetHeaderActions: ({ children }: { children?: React.ReactNode }): React.ReactNode => children,
}));
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

beforeEach(() => localStorage.clear());

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
