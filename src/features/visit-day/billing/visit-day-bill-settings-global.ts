import { environmentVariables } from '@/config/environment-variables';
import {
  BILLING_ROLES,
  canAccessBilling,
  getUserGroups,
  hasAccessToThisUser,
} from '@/features/payload-cms/payload-cms/access-rules/roles';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import type { GlobalConfig } from 'payload';

/** Shown in the admin panel next to the texts that take placeholders. */
const placeholderHelp = {
  en: 'Placeholders: {{firstName}}, {{lastName}}, {{fullName}}, {{amount}}, {{invoiceNumber}}, {{registrationNumber}}, {{visitDay}}, {{dueDate}}.',
  de: 'Platzhalter: {{firstName}}, {{lastName}}, {{fullName}}, {{amount}}, {{invoiceNumber}}, {{registrationNumber}}, {{visitDay}}, {{dueDate}}.',
  fr: 'Variables : {{firstName}}, {{lastName}}, {{fullName}}, {{amount}}, {{invoiceNumber}}, {{registrationNumber}}, {{visitDay}}, {{dueDate}}.',
};

/**
 * What a Besuchstag bill costs and says. Only what differs from the camp bills lives here: the
 * creditor and the QR-IBAN are those of the camp bill settings, because both are paid into the
 * same account.
 *
 * The texts are localized: a bill goes out in the language of the registration, and a text left
 * empty in French falls back to German.
 */
export const VisitDayBillSettingsGlobal: GlobalConfig = {
  slug: 'visit-day-bill-settings',
  typescript: { interface: 'VisitDayBillSetting' },
  label: {
    de: 'Besuchstag · Rechnungseinstellungen',
    en: 'Visiting day · Billing settings',
    fr: 'Journée des visites · Réglages des factures',
  },
  admin: {
    group: AdminPanelDashboardGroups.BackofficeBilling.label,
    hidden: ({ user }): boolean =>
      !environmentVariables.FEATURE_ENABLE_VISIT_DAY ||
      !hasAccessToThisUser({ user: { groups: getUserGroups(user) }, requiredRoles: BILLING_ROLES }),
    description: {
      en: 'Prices, VAT and texts of the Besuchstag bills. Creditor and QR-IBAN come from the camp billing settings.',
      de: 'Preise, MWST und Texte der Besuchstag-Rechnungen. Kreditor und QR-IBAN stammen aus den Lager-Rechnungseinstellungen.',
      fr: 'Prix, TVA et textes des factures de la journée des visites. Créancier et QR-IBAN viennent des réglages des factures du camp.',
    },
  },
  access: {
    read: canAccessBilling,
    update: canAccessBilling,
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: { en: 'Prices', de: 'Preise', fr: 'Prix' },
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'priceWithLunch',
                  type: 'number',
                  required: true,
                  min: 0,
                  defaultValue: 0,
                  label: {
                    en: 'Ticket with lunch (CHF)',
                    de: 'Ticket mit Mittagessen (CHF)',
                    fr: 'Billet avec repas de midi (CHF)',
                  },
                  admin: {
                    width: '33%',
                    description: {
                      en: 'Per person, VAT included.',
                      de: 'Pro Person, inklusive MWST.',
                      fr: 'Par personne, TVA comprise.',
                    },
                  },
                },
                {
                  name: 'priceWithoutLunch',
                  type: 'number',
                  required: true,
                  min: 0,
                  defaultValue: 0,
                  label: {
                    en: 'Ticket without lunch (CHF)',
                    de: 'Ticket ohne Mittagessen (CHF)',
                    fr: 'Billet sans repas de midi (CHF)',
                  },
                  admin: {
                    width: '33%',
                    description: {
                      en: 'Per person, VAT included.',
                      de: 'Pro Person, inklusive MWST.',
                      fr: 'Par personne, TVA comprise.',
                    },
                  },
                },
                {
                  name: 'vatRate',
                  type: 'number',
                  required: true,
                  min: 0,
                  max: 100,
                  defaultValue: 0,
                  label: { en: 'VAT (%)', de: 'MWST (%)', fr: 'TVA (%)' },
                  admin: {
                    width: '34%',
                    description: {
                      en: 'One rate for every Besuchstag bill. 0 prints no VAT. Changed prices and rates apply to bills issued from now on.',
                      de: 'Ein Satz für alle Besuchstag-Rechnungen. Bei 0 wird keine MWST ausgewiesen. Geänderte Preise und Sätze gelten für Rechnungen, die ab jetzt ausgestellt werden.',
                      fr: 'Un taux pour toutes les factures. À 0, aucune TVA n’est indiquée. Les prix et taux modifiés valent pour les factures émises dès maintenant.',
                    },
                  },
                },
              ],
            },
          ],
        },
        {
          label: { en: 'Bill & email', de: 'Rechnung & E-Mail', fr: 'Facture & e-mail' },
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'invoiceNumberPrefix',
                  type: 'text',
                  required: true,
                  defaultValue: 'BT{{year}}-',
                  label: {
                    en: 'Bill number prefix',
                    de: 'Präfix der Rechnungsnummer',
                    fr: 'Préfixe du numéro de facture',
                  },
                  admin: {
                    width: '50%',
                    description: {
                      en: '{{year}} is the year of issue, e.g. BT2027-0042.',
                      de: '{{year}} ist das Jahr der Ausstellung, z.B. BT2027-0042.',
                      fr: '{{year}} est l’année d’émission, p. ex. BT2027-0042.',
                    },
                  },
                },
                {
                  name: 'paymentDeadlineDays',
                  type: 'number',
                  required: true,
                  min: 1,
                  defaultValue: 30,
                  label: {
                    en: 'Payable within (days)',
                    de: 'Zahlbar innert (Tagen)',
                    fr: 'Payable dans (jours)',
                  },
                  admin: { width: '50%' },
                },
              ],
            },
            {
              name: 'documentTitle',
              type: 'text',
              localized: true,
              required: true,
              defaultValue: 'Rechnung Besuchstag conveniat27',
              label: {
                en: 'Title of the bill',
                de: 'Titel der Rechnung',
                fr: 'Titre de la facture',
              },
            },
            {
              name: 'letterText',
              type: 'textarea',
              localized: true,
              label: { en: 'Letter text', de: 'Brieftext', fr: 'Texte de la lettre' },
              defaultValue:
                'Vielen Dank für deine Anmeldung zum Besuchstag. Dein Ticket ist gültig, sobald diese Rechnung bezahlt ist. Eine Rückerstattung nach einer Abmeldung erfolgt von Hand; bitte melde dich dafür per E-Mail.',
              admin: {
                description: {
                  en: `Printed above the lines of the bill. ${placeholderHelp.en}`,
                  de: `Steht über den Positionen der Rechnung. ${placeholderHelp.de}`,
                  fr: `Imprimé au-dessus des lignes de la facture. ${placeholderHelp.fr}`,
                },
              },
            },
            {
              name: 'emailSubject',
              type: 'text',
              localized: true,
              required: true,
              defaultValue: 'Deine Rechnung für den Besuchstag am conveniat27',
              label: { en: 'Email subject', de: 'Betreff der E-Mail', fr: 'Objet de l’e-mail' },
              admin: { description: placeholderHelp },
            },
            {
              name: 'emailBody',
              type: 'textarea',
              localized: true,
              required: true,
              defaultValue:
                'Hallo {{firstName}}\n\nIm Anhang findest du die Rechnung {{invoiceNumber}} über {{amount}} für deine Anmeldung {{registrationNumber}} zum Besuchstag am {{visitDay}}. Bitte bezahle sie bis am {{dueDate}} mit dem QR-Einzahlungsschein.\n\nDein Ticket ist gültig, sobald die Rechnung bezahlt ist. Möchtest du dich abmelden, schreib uns bitte; eine Rückerstattung erfolgt von Hand.\n\nBis bald am conveniat27!',
              label: { en: 'Email text', de: 'Text der E-Mail', fr: 'Texte de l’e-mail' },
              admin: { rows: 10, description: placeholderHelp },
            },
          ],
        },
        {
          label: {
            en: 'Report & accounting',
            de: 'Bericht & Buchhaltung',
            fr: 'Rapport & comptabilité',
          },
          fields: [
            {
              name: 'revenueAccount',
              type: 'text',
              label: {
                en: 'Revenue account in Banana',
                de: 'Ertragskonto in Banana',
                fr: 'Compte de produits dans Banana',
              },
              admin: {
                description: {
                  en: 'Credited for every Besuchstag bill in the finance export. Empty uses the account of the camp bills.',
                  de: 'Wird im Finanzexport für jede Besuchstag-Rechnung im Haben gebucht. Leer: das Konto der Lager-Rechnungen.',
                  fr: 'Crédité pour chaque facture dans l’export financier. Vide : le compte des factures du camp.',
                },
              },
            },
            {
              name: 'weeklyReport',
              type: 'group',
              label: {
                en: 'Weekly report',
                de: 'Wöchentlicher Bericht',
                fr: 'Rapport hebdomadaire',
              },
              fields: [
                {
                  name: 'recipients',
                  type: 'array',
                  label: { en: 'Recipients', de: 'Empfänger', fr: 'Destinataires' },
                  labels: {
                    singular: { en: 'Recipient', de: 'Empfänger', fr: 'Destinataire' },
                    plural: { en: 'Recipients', de: 'Empfänger', fr: 'Destinataires' },
                  },
                  admin: {
                    description: {
                      en: 'Receive the Besuchstag report as a PDF. Without recipients no report is sent.',
                      de: 'Erhalten den Besuchstag-Bericht als PDF. Ohne Empfänger wird kein Bericht verschickt.',
                      fr: 'Reçoivent le rapport en PDF. Sans destinataire, aucun rapport n’est envoyé.',
                    },
                  },
                  fields: [{ name: 'email', type: 'email', required: true }],
                },
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'weekday',
                      type: 'select',
                      defaultValue: '1',
                      label: { en: 'Weekday', de: 'Wochentag', fr: 'Jour' },
                      options: [
                        { value: '1', label: { en: 'Monday', de: 'Montag', fr: 'Lundi' } },
                        { value: '2', label: { en: 'Tuesday', de: 'Dienstag', fr: 'Mardi' } },
                        { value: '3', label: { en: 'Wednesday', de: 'Mittwoch', fr: 'Mercredi' } },
                        { value: '4', label: { en: 'Thursday', de: 'Donnerstag', fr: 'Jeudi' } },
                        { value: '5', label: { en: 'Friday', de: 'Freitag', fr: 'Vendredi' } },
                        { value: '6', label: { en: 'Saturday', de: 'Samstag', fr: 'Samedi' } },
                        { value: '0', label: { en: 'Sunday', de: 'Sonntag', fr: 'Dimanche' } },
                      ],
                      admin: { width: '50%' },
                    },
                    {
                      name: 'hour',
                      type: 'number',
                      min: 0,
                      max: 23,
                      defaultValue: 7,
                      label: {
                        en: 'Hour (Europe/Zurich)',
                        de: 'Stunde (Europe/Zurich)',
                        fr: 'Heure (Europe/Zurich)',
                      },
                      admin: { width: '50%' },
                    },
                  ],
                },
                {
                  name: 'lastSentAt',
                  type: 'date',
                  label: { en: 'Last sent', de: 'Zuletzt verschickt', fr: 'Dernier envoi' },
                  admin: {
                    readOnly: true,
                    date: { pickerAppearance: 'dayAndTime', displayFormat: 'dd.MM.yyyy HH:mm' },
                  },
                },
              ],
            },
          ],
        },
        {
          label: { en: 'PDF preview', de: 'PDF-Vorschau', fr: 'Aperçu PDF' },
          fields: [
            {
              name: 'pdfPreview',
              type: 'ui',
              admin: {
                components: {
                  Field:
                    '@/features/visit-day/billing/components/visit-day-bill-preview#VisitDayBillPreview',
                },
              },
            },
          ],
        },
      ],
    },
  ],
};
