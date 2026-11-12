import {
  hasAdminOrWebAccess,
  shouldHideInAdminPanel,
} from '@/features/payload-cms/payload-cms/access-rules/roles';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import { flushPageCacheOnChangeGlobal } from '@/features/payload-cms/payload-cms/utils/flush-page-cache-on-change';
import type { StaticTranslationString } from '@/types/types';
import type { Field, GlobalConfig } from 'payload';

/** A row of a short list: a bold title and a line under it. */
const titledPoints = (
  name: string,
  label: StaticTranslationString,
  description: StaticTranslationString,
): Field => ({
  name,
  type: 'array',
  localized: true,
  maxRows: 5,
  label,
  labels: {
    singular: { en: 'Point', de: 'Punkt', fr: 'Point' },
    plural: { en: 'Points', de: 'Punkte', fr: 'Points' },
  },
  admin: { description, initCollapsed: false },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      label: { en: 'Title', de: 'Titel', fr: 'Titre' },
    },
    {
      name: 'text',
      type: 'textarea',
      label: { en: 'Text', de: 'Text', fr: 'Texte' },
    },
  ],
});

/**
 * What the image upload in the app says in its editors' words: the introduction a first-time
 * visitor sees, the terms a participant agrees to before choosing images, the tips for good
 * photos and the thanks after an upload. Buttons, limits and errors stay in the code.
 *
 * Not an `asLocalizedGlobal`: these are a handful of texts, and a draft of the terms that is
 * live in one language and not in another is worse than no drafts.
 */
export const ImageSubmissionGlobal: GlobalConfig = {
  slug: 'image-submission',
  label: { en: 'Image Upload', de: 'Bild-Upload', fr: "Envoi d'images" },
  access: {
    read: () => true,
    update: hasAdminOrWebAccess,
  },
  admin: {
    group: AdminPanelDashboardGroups.AppContent.label,
    hidden: shouldHideInAdminPanel,
    description: {
      en: 'The texts of the image upload in the app. Without terms the upload stays closed. French and English fall back to German.',
      de: 'Die Texte des Bild-Uploads in der App. Ohne Bedingungen bleibt der Upload geschlossen. Französisch und Englisch fallen auf Deutsch zurück.',
      fr: "Les textes de l'envoi d'images dans l'app. Sans conditions, l'envoi reste fermé. Le français et l'anglais se rabattent sur l'allemand.",
    },
  },
  hooks: {
    afterChange: [flushPageCacheOnChangeGlobal],
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: { en: 'Introduction', de: 'Einführung', fr: 'Introduction' },
          description: {
            en: 'Shown once, on the first visit, and again from the ⓘ in the header. Leave it empty to skip it.',
            de: 'Erscheint einmal beim ersten Besuch und wieder über das ⓘ im Header. Leer lassen, um sie wegzulassen.',
            fr: "Affichée une fois, lors de la première visite, puis via le ⓘ de l'en-tête. Laisser vide pour la sauter.",
          },
          fields: [
            {
              name: 'introTitle',
              type: 'text',
              localized: true,
              label: { en: 'Title', de: 'Titel', fr: 'Titre' },
            },
            {
              name: 'introText',
              type: 'textarea',
              localized: true,
              label: { en: 'Text', de: 'Text', fr: 'Texte' },
            },
            titledPoints(
              'introSteps',
              { en: 'Steps', de: 'Schritte', fr: 'Étapes' },
              {
                en: 'Numbered in this order, e.g. "Own photos", "Good quality", "Describe briefly".',
                de: 'In dieser Reihenfolge nummeriert, z.B. «Eigene Fotos», «Gute Qualität», «Kurz beschreiben».',
                fr: 'Numérotées dans cet ordre, p.ex. «Tes propres photos», «Bonne qualité», «Décris brièvement».',
              },
            ),
          ],
        },
        {
          label: { en: 'Terms', de: 'Bedingungen', fr: 'Conditions' },
          description: {
            en: 'Agreed to before choosing images. The summary is what people read; the full text has to say at least the same.',
            de: 'Wird vor der Bildauswahl bestätigt. Die Kurzfassung ist, was gelesen wird; der Volltext muss mindestens dasselbe sagen.',
            fr: 'Acceptées avant de choisir les images. Le résumé est ce qui est lu ; le texte complet doit dire au moins la même chose.',
          },
          fields: [
            {
              name: 'termsLead',
              type: 'textarea',
              localized: true,
              label: { en: 'Lead', de: 'Einleitung', fr: 'Introduction' },
              admin: {
                description: {
                  en: 'One sentence over the summary, e.g. "By submitting, you allow conveniat27 to use your images."',
                  de: 'Ein Satz über der Kurzfassung, z.B. «Mit dem Einreichen erlaubst du conveniat27, deine Bilder zu verwenden.»',
                  fr: 'Une phrase au-dessus du résumé, p.ex. «En envoyant, tu autorises conveniat27 à utiliser tes images.»',
                },
              },
            },
            titledPoints(
              'termsSummary',
              { en: 'Summary', de: 'Kurzfassung', fr: 'Résumé' },
              {
                en: 'The terms in plain words, one point each.',
                de: 'Die Bedingungen in Alltagssprache, ein Punkt pro Aussage.',
                fr: 'Les conditions en mots simples, un point par affirmation.',
              },
            ),
            {
              name: 'termsFullText',
              type: 'textarea',
              localized: true,
              label: { en: 'Full text', de: 'Volltext', fr: 'Texte complet' },
              admin: {
                rows: 10,
                description: {
                  en: 'Readable behind "Read the full terms" and from the upload page. Empty lines separate paragraphs.',
                  de: 'Aufklappbar unter «Vollständige Bedingungen lesen» und auf der Upload-Seite. Leerzeilen trennen Absätze.',
                  fr: "Accessible sous «Lire les conditions complètes» et depuis la page d'envoi. Les lignes vides séparent les paragraphes.",
                },
              },
            },
          ],
        },
        {
          label: { en: 'Upload', de: 'Upload', fr: 'Envoi' },
          fields: [
            {
              name: 'photoTips',
              type: 'array',
              localized: true,
              maxRows: 5,
              label: { en: 'Tips for good photos', de: 'Tipps für gute Fotos', fr: 'Conseils' },
              labels: {
                singular: { en: 'Tip', de: 'Tipp', fr: 'Conseil' },
                plural: { en: 'Tips', de: 'Tipps', fr: 'Conseils' },
              },
              admin: {
                description: {
                  en: 'Shown under the image picker, e.g. "The original photo, not a screenshot."',
                  de: 'Steht unter der Bildauswahl, z.B. «Das Originalfoto, kein Screenshot.»',
                  fr: "Affichés sous le choix d'images, p.ex. «La photo originale, pas une capture d'écran.»",
                },
              },
              fields: [
                {
                  name: 'text',
                  type: 'text',
                  required: true,
                  label: { en: 'Tip', de: 'Tipp', fr: 'Conseil' },
                },
              ],
            },
            {
              name: 'successText',
              type: 'textarea',
              localized: true,
              label: {
                en: 'After the upload',
                de: 'Nach dem Upload',
                fr: "Après l'envoi",
              },
              admin: {
                description: {
                  en: 'What happens next, and whom to contact to withdraw an image.',
                  de: 'Was jetzt passiert, und an wen man sich wendet, um ein Bild zurückzuziehen.',
                  fr: 'Ce qui se passe ensuite, et qui contacter pour retirer une image.',
                },
              },
            },
          ],
        },
      ],
    },
  ],
};
