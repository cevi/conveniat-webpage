import { LOCALE } from '@/features/payload-cms/payload-cms/locales';
import type { ImageSubmission } from '@/features/payload-cms/payload-types';
import type { Payload } from 'payload';

/** Local stand-in texts for the image upload; the real terms are written by the editors. */
const IMAGE_SUBMISSION_DE: Omit<ImageSubmission, 'id'> = {
  introTitle: 'Deine Fotos fürs conveniat27',
  introText: 'Wir sammeln Fotos vom Lager für Website, App und Social Media. So geht’s:',
  introSteps: [
    { icon: 'camera', title: 'Eigene Fotos', text: 'Nur Bilder, die du selbst gemacht hast.' },
    { icon: 'size', title: 'Gute Qualität', text: 'Das Originalfoto in voller Grösse.' },
    {
      icon: 'pencil',
      title: 'Kurz beschreiben',
      text: 'Was ist zu sehen, welcher Hof? Zum Beispiel «Cevi Uster beim Seilbrückenbau».',
    },
  ],
  termsLead: 'Mit dem Einreichen erlaubst du conveniat27, deine Bilder zu verwenden. Das heisst:',
  termsSummary: [
    { icon: 'check', title: 'Du hast das Foto gemacht', text: 'und darfst es weitergeben.' },
    { icon: 'users', title: 'Abgebildete sind einverstanden', text: 'Niemand wird blossgestellt.' },
    {
      icon: 'globe',
      title: 'conveniat27 darf es nutzen',
      text: 'auf Website, App, Social Media und in Drucksachen, auch zugeschnitten.',
    },
  ],
  termsFullText:
    'Hiermit übertrage ich alle Rechte, Titel und Interessen an den hochgeladenen Bildern an das conveniat27-Team. Ich bestätige, dass ich der rechtmässige Eigentümer dieser Bilder bin und die Befugnis habe, diese Rechte zu übertragen.\n\nDas conveniat27-Team darf diese Bilder für jeden Zweck verwenden, ändern, verteilen und anzeigen.',
  photoTips: [
    { text: 'Originalfoto statt Screenshot oder WhatsApp-Kopie, die sind meist zu klein.' },
    { text: 'Action und Gesichter, die man gerne zeigt.' },
  ],
  successText:
    'Wir schauen uns deine Bilder an und wählen aus. Du hörst nur von uns, wenn es Fragen gibt.',
};

/** Fills the texts of the image upload in German, which French and English fall back to. */
export const seedImageSubmission = async (payload: Payload): Promise<void> => {
  await payload.updateGlobal({
    slug: 'image-submission',
    locale: LOCALE.DE,
    data: IMAGE_SUBMISSION_DE,
    context: { disableRevalidation: true },
  });
};
