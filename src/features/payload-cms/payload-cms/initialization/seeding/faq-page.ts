import { LOCALE } from '@/features/payload-cms/payload-cms/locales';
import type { Permission } from '@/features/payload-cms/payload-types';
import type { Locale } from '@/types/types';
import type { RequiredDataFromCollectionSlug } from 'payload';

export const faqPageContent = (
  publicPermission: Permission,
  locale: Locale = LOCALE.DE,
): RequiredDataFromCollectionSlug<'generic-page'> => {
  const content = {
    [LOCALE.DE]: {
      title: 'Häufig gestellte Fragen (FAQ)',
      heading: 'Alles, was du über conveniat27 wissen musst',
      accordionIntro:
        'Hier findest du Antworten auf die wichtigsten Fragen rund um das Nationale Cevi-Lager 2027.',
      metaTitle: 'FAQ | conveniat27',
      metaDesc: 'Häufig gestellte Fragen zum Nationalen Cevi-Lager conveniat27.',
      slug: 'faq',
      // Block 1 (Two Column)
      q1Title: 'Was ist das conveniat27?',
      q1Answer:
        'conveniat27 ist ein nationales Cevi-Lager, das im Sommer 2027 stattfinden wird. Es vereint lokale Gruppen aus allen Regionen, Sprachregionen und Altersgruppen der Schweiz unter dem Motto: WIR SIND CEVI! Im Zentrum stehen das Erlebnis, die Verbundenheit, Freundschaft und der Glaube.',
      q2Title: 'Wer organisiert das Lager?',
      q2Answer:
        'conveniat27 wird von einem unabhängigen, finanziell autonomen Verein gleichen Namens getragen. Seit 2022 arbeitet ein engagiertes Team aus der ganzen Schweiz an den Ideen und der Planung.',
      // Block 2 (One Column)
      q3Title: 'Wann und wo findet das Lager statt?',
      q3Answer:
        'Das Lager findet von Samstag, 24. Juli bis Montag, 2. August 2027 im Obergoms (VS) statt.',
      q4Title: 'Wer ist zum Lager eingeladen?',
      q4Answer:
        'Das Lager ist für Kinder und Jugendliche aus dem Cevi Schweiz sowie für internationale Gäste aus dem globalen YMCA/YWCA. Wir erwarten rund 5.000 Teilnehmende sowie Hunderte von Helfenden und jungen Leitungspersonen.',
    },
    [LOCALE.EN]: {
      title: 'Frequently Asked Questions (FAQ)',
      heading: 'Everything you need to know about conveniat27',
      accordionIntro:
        'Here you will find answers to the most important questions about the National YMCA/YWCA Camp 2027.',
      metaTitle: 'FAQ | conveniat27',
      metaDesc: 'Frequently asked questions about the National YMCA/YWCA Camp conveniat27.',
      slug: 'faq',
      // Block 1 (Two Column)
      q1Title: 'What is conveniat27?',
      q1Answer:
        'conveniat27 is a national YMCA/YWCA camp taking place in the summer of 2027. It brings together local groups from all regions, language areas, and age groups in Switzerland under the motto: WE ARE CEVI! The focus is on adventure, solidarity, friendship, and faith.',
      q2Title: 'Who organizes the camp?',
      q2Answer:
        'conveniat27 is supported by an independent, financially autonomous organization of the same name. Since 2022, a dedicated team from across Switzerland has been working on ideas and planning.',
      // Block 2 (One Column)
      q3Title: 'When and where does the camp take place?',
      q3Answer:
        'The camp will take place from Saturday, July 24 to Monday, August 2, 2027 in Obergoms (VS).',
      q4Title: 'Who is invited to the camp?',
      q4Answer:
        'The camp is for young people from YMCA/YWCA Switzerland and international guests from the global YMCA/YWCA. Around 5,000 participants are expected, alongside hundreds of volunteers and young leaders.',
    },
    [LOCALE.FR]: {
      title: 'Foire aux questions (FAQ)',
      heading: 'Tout ce que vous devez savoir sur conveniat27',
      accordionIntro:
        'Vous trouverez ici les réponses aux questions les plus importantes concernant le Camp National des UCJG/Unions Chrétiennes de 2027.',
      metaTitle: 'FAQ | conveniat27',
      metaDesc: 'Foire aux questions sur le Camp National des UCJG/Unions Chrétiennes conveniat27.',
      slug: 'faq',
      // Block 1 (Two Column)
      q1Title: "Qu'est-ce que conveniat27 ?",
      q1Answer:
        "conveniat27 est un camp national des UCJG/Unions Chrétiennes qui aura lieu au cours de l'été 2027. Il rassemble des groupes locaux de toutes les régions, zones linguistiques et groupes d'âge en Suisse sous la devise : NOUS SOMMES CEVI ! L'accent est mis sur l'aventure, la solidarité, l'amitié et la foi.",
      q2Title: 'Qui organise le camp ?',
      q2Answer:
        'conveniat27 est soutenu par une organisation indépendante et financièrement autonome du même nom. Depuis 2022, une équipe dévouée de toute la Suisse travaille sur des idées et la planification.',
      // Block 2 (One Column)
      q3Title: 'Quand et où a lieu le camp ?',
      q3Answer: 'Le camp aura lieu du samedi 24 juillet au lundi 2 août 2027 à Obergoms (VS).',
      q4Title: 'Qui est invité au camp ?',
      q4Answer:
        "Le camp s'adresse aux enfants et jeunes des UCJG/Unions Chrétiennes en Suisse ainsi qu'aux invités internationaux des UCJG mondiales. Environ 5 000 participants sont attendus, ainsi que des centaines de bénévoles et de jeunes leaders.",
    },
  };

  const t = content[locale];

  return {
    internalPageName: 'faq',
    authors: [],
    internalStatus: 'approved',
    _status: 'published',
    content: {
      permissions: publicPermission,
      pageTitle: t.title,
      releaseDate: '2025-01-01T01:00:00.000Z',
      mainContent: [
        {
          blockType: 'richTextSection' as const,
          richTextSection: {
            root: {
              type: 'root',
              children: [
                {
                  type: 'heading',
                  children: [
                    {
                      type: 'text',
                      detail: 0,
                      format: 0,
                      mode: 'normal',
                      style: '',
                      text: t.heading,
                      version: 1,
                    },
                  ],
                  direction: 'ltr',
                  format: '',
                  indent: 0,
                  tag: 'h3',
                  version: 1,
                },
              ],
              direction: 'ltr',
              format: '',
              indent: 0,
              version: 1,
            },
          },
        },
        // Two Column Block containing the introductory text and the Accordion Block
        {
          blockType: 'twoColumnBlock' as const,
          splitRatio: 'rightLarger',
          leftColumn: [
            {
              blockType: 'richTextSection' as const,
              richTextSection: {
                root: {
                  children: [
                    {
                      children: [
                        {
                          detail: 0,
                          format: 0,
                          mode: 'normal',
                          style: '',
                          text: 'Das Lager',
                          type: 'text',
                          version: 1,
                        },
                      ],
                      direction: 'ltr',
                      format: '',
                      indent: 0,
                      tag: 'h2',
                      type: 'heading',
                      version: 1,
                    },
                    {
                      children: [
                        {
                          detail: 0,
                          format: 0,
                          mode: 'normal',
                          style: '',
                          text: t.accordionIntro,
                          type: 'text',
                          version: 1,
                        },
                      ],
                      direction: 'ltr',
                      format: '',
                      indent: 0,
                      type: 'paragraph',
                      version: 1,
                      textFormat: 0,
                      textStyle: '',
                    },
                  ],
                  direction: 'ltr',
                  format: '',
                  indent: 0,
                  type: 'root',
                  version: 1,
                },
              },
            },
          ],
          rightColumn: [
            {
              blockType: 'accordion' as const,
              accordionBlocks: [
                {
                  titleOrPortrait: 'title',
                  title: t.q1Title,
                  valueBlocks: [
                    {
                      blockType: 'accordionPlainTextBlock',
                      value: {
                        root: {
                          children: [
                            {
                              children: [
                                {
                                  detail: 0,
                                  format: 0,
                                  mode: 'normal',
                                  style: '',
                                  text: t.q1Answer,
                                  type: 'text',
                                  version: 1,
                                },
                              ],
                              direction: 'ltr',
                              format: '',
                              indent: 0,
                              type: 'paragraph',
                              version: 1,
                              textFormat: 0,
                              textStyle: '',
                            },
                          ],
                          direction: 'ltr',
                          format: '',
                          indent: 0,
                          type: 'root',
                          version: 1,
                        },
                      },
                    },
                  ],
                },
                {
                  titleOrPortrait: 'title',
                  title: t.q2Title,
                  valueBlocks: [
                    {
                      blockType: 'accordionPlainTextBlock',
                      value: {
                        root: {
                          children: [
                            {
                              children: [
                                {
                                  detail: 0,
                                  format: 0,
                                  mode: 'normal',
                                  style: '',
                                  text: t.q2Answer,
                                  type: 'text',
                                  version: 1,
                                },
                              ],
                              direction: 'ltr',
                              format: '',
                              indent: 0,
                              type: 'paragraph',
                              version: 1,
                              textFormat: 0,
                              textStyle: '',
                            },
                          ],
                          direction: 'ltr',
                          format: '',
                          indent: 0,
                          type: 'root',
                          version: 1,
                        },
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
        // Single Column Accordion Block
        {
          blockType: 'accordion' as const,
          accordionBlocks: [
            {
              titleOrPortrait: 'portrait',
              teamLeaderGroup: {
                name: 'Leonie Loher',
                ceviname: 'Vivace',
              },
              valueBlocks: [
                {
                  blockType: 'accordionPlainTextBlock',
                  value: {
                    root: {
                      children: [
                        {
                          children: [
                            {
                              detail: 0,
                              format: 0,
                              mode: 'normal',
                              style: '',
                              text: t.q3Answer,
                              type: 'text',
                              version: 1,
                            },
                          ],
                          direction: 'ltr',
                          format: '',
                          indent: 0,
                          type: 'paragraph',
                          version: 1,
                          textFormat: 0,
                          textStyle: '',
                        },
                      ],
                      direction: 'ltr',
                      format: '',
                      indent: 0,
                      type: 'root',
                      version: 1,
                    },
                  },
                },
              ],
            },
            {
              titleOrPortrait: 'title',
              title: t.q4Title,
              valueBlocks: [
                {
                  blockType: 'nestedAccordion',
                  accordionBlocks: [
                    {
                      title: 'Teil 1',
                      valueBlocks: [
                        {
                          blockType: 'accordionPlainTextBlock',
                          value: {
                            root: {
                              children: [
                                {
                                  children: [
                                    {
                                      detail: 0,
                                      format: 0,
                                      mode: 'normal',
                                      style: '',
                                      text: t.q4Answer,
                                      type: 'text',
                                      version: 1,
                                    },
                                  ],
                                  direction: 'ltr',
                                  format: '',
                                  indent: 0,
                                  type: 'paragraph',
                                  version: 1,
                                  textFormat: 0,
                                  textStyle: '',
                                },
                              ],
                              direction: 'ltr',
                              format: '',
                              indent: 0,
                              type: 'root',
                              version: 1,
                            },
                          },
                        },
                      ],
                    },
                    {
                      title: 'Teil 2',
                      valueBlocks: [
                        {
                          blockType: 'accordionPlainTextBlock',
                          value: {
                            root: {
                              children: [
                                {
                                  children: [
                                    {
                                      detail: 0,
                                      format: 0,
                                      mode: 'normal',
                                      style: '',
                                      text: 'Zusatzinformationen zum zweiten Teil',
                                      type: 'text',
                                      version: 1,
                                    },
                                  ],
                                  direction: 'ltr',
                                  format: '',
                                  indent: 0,
                                  type: 'paragraph',
                                  version: 1,
                                  textFormat: 0,
                                  textStyle: '',
                                },
                              ],
                              direction: 'ltr',
                              format: '',
                              indent: 0,
                              type: 'root',
                              version: 1,
                            },
                          },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    seo: {
      urlSlug: t.slug,
      metaTitle: t.metaTitle,
      metaDescription: t.metaDesc,
      keywords: 'conveniat27, faq, questions',
    },
    _localized_status: {
      published: true,
    },
    _locale: locale,
  };
};
