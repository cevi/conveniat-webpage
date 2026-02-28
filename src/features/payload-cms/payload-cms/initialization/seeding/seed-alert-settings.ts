/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, unicorn/no-null, @typescript-eslint/no-unnecessary-condition */
import { LOCALE } from '@/features/payload-cms/payload-cms/locales';
import type { Payload } from 'payload';

// 1. Define content in a single structure
const ALERT_DATA = {
  [LOCALE.DE]: {
    questions: [
      {
        key: 'injured',
        question: 'Sind Sie verletzt?',
        // the following line sets nextQuestionKey for the full type
        options: [
          { option: 'Ja', nextQuestionKey: 'ambulance' },
          { option: 'Nein' },
          { option: 'Unbekannt' },
        ],
      },
      {
        key: 'ambulance',
        question: 'Brauchen Sie einen Krankenwagen?',
        options: [{ option: 'Ja' }, { option: 'Nein' }],
      },
      {
        key: 'can_move',
        question: 'Können Sie sich bewegen?',
        options: [{ option: 'Ja' }, { option: 'Mit Hilfe' }, { option: 'Nein' }],
      },
    ],
    finalResponseMessage:
      'Hilfe ist unterwegs. Bitte kontaktieren Sie die folgende Nummer für weitere Organisation:',
    emergencyPhoneNumber: '+41 44 123 45 67',
  },
  [LOCALE.EN]: {
    questions: [
      {
        key: 'injured',
        question: 'Are you injured?',
        options: [{ option: 'Yes' }, { option: 'No' }, { option: 'Unknown' }],
      },
      {
        key: 'ambulance',
        question: 'Do you need an ambulance?',
        options: [{ option: 'Yes' }, { option: 'No' }],
      },
      {
        key: 'can_move',
        question: 'Can you move?',
        options: [{ option: 'Yes' }, { option: 'With help' }, { option: 'No' }],
      },
    ],
    finalResponseMessage:
      'Help is on the way. Please contact the following number for further organization:',
    emergencyPhoneNumber: '+41 44 123 45 67',
  },
  [LOCALE.FR]: {
    questions: [
      {
        key: 'injured',
        question: 'Êtes-vous blessé?',
        options: [{ option: 'Oui' }, { option: 'Non' }, { option: 'Inconnu' }],
      },
      {
        key: 'ambulance',
        question: "Avez-vous besoin d'une ambulance?",
        options: [{ option: 'Oui' }, { option: 'Non' }],
      },
      {
        key: 'can_move',
        question: 'Pouvez-vous bouger?',
        options: [{ option: 'Oui' }, { option: "Avec de l'aide" }, { option: 'Non' }],
      },
    ],
    finalResponseMessage:
      'Les secours arrivent. Veuillez contacter le numéro suivant pour une organisation ultérieure:',
    emergencyPhoneNumber: '+41 44 123 45 67',
  },
};

export const seedAlertSettings = async (payload: Payload): Promise<void> => {
  // 2. Quick check to avoid re-seeding
  const existing = await payload.findGlobal({ slug: 'alert_settings' });
  if (existing.questions && existing.questions.length > 0) return;

  // 3. Seed the Base Locale (DE) to generate Row IDs
  await payload.updateGlobal({
    slug: 'alert_settings',
    locale: LOCALE.DE,
    data: {
      questions: (ALERT_DATA[LOCALE.DE].questions as any[]).map((q: any) => ({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        question: q.question,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        options: q.options,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        key: q.key,
      })),
      finalResponseMessage: ALERT_DATA[LOCALE.DE].finalResponseMessage,
      emergencyPhoneNumber: ALERT_DATA[LOCALE.DE].emergencyPhoneNumber,
    },
  });

  // 4. Fetch the newly created structure (to get the generated IDs)
  const created = await payload.findGlobal({ slug: 'alert_settings', locale: LOCALE.DE });
  if (!created.questions) return;

  // 5. Loop through other locales and update using the reference IDs
  const otherLocales = [LOCALE.EN, LOCALE.FR];

  for (const locale of otherLocales) {
    const localeData = ALERT_DATA[locale as keyof typeof ALERT_DATA];
    if (!localeData) continue;

    // Use the created-with-links structure to preserve ids and any nextQuestionKey values
    await payload.updateGlobal({
      slug: 'alert_settings',
      locale,
      data: {
        questions: created.questions.map((q, index) => {
          const questionData = localeData.questions[index];
          return {
            id: q.id ?? null,
            key: q.key ?? null,
            question: questionData?.question ?? '',
            options: q.options?.map((opt, optIndex) => ({
              id: opt.id ?? null,
              option: questionData?.options[optIndex]?.option ?? '',
              nextQuestionKey: opt.nextQuestionKey ?? null,
            })),
          };
        }) as any,
        finalResponseMessage: localeData.finalResponseMessage,
        emergencyPhoneNumber: localeData.emergencyPhoneNumber,
      },
    });
  }

  console.log('Seeded Alert Settings');
};
