import {
  hasAdminOrWebAccess,
  shouldHideInAdminPanelIfNotAdmin,
} from '@/features/payload-cms/payload-cms/access-rules/roles';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import { DEFAULT_EMAIL_SIGNATURE } from '@/features/payload-cms/payload-cms/utils/email-body';
import type { GlobalConfig } from 'payload';

/**
 * The official signature every mail of the system can end with, written as `{{signatur}}` in a
 * form's email or a billing text. The contact lines live here so they change in one place.
 */
export const EmailSignatureGlobal: GlobalConfig = {
  slug: 'email-signature',
  typescript: { interface: 'EmailSignatureSetting' },
  label: { de: 'E-Mail-Signatur', en: 'Email signature', fr: 'Signature des e-mails' },
  admin: {
    group: AdminPanelDashboardGroups.BackofficeSystem.label,
    hidden: shouldHideInAdminPanelIfNotAdmin,
    description: {
      en: 'Write {{signatur}} in an email to end it with this signature, or {{signatur :: Ressort Finanzen}} to add a line under the name. Works in the emails of the forms and in the billing texts. A field left empty uses the official value.',
      de: 'Mit {{signatur}} in einer E-Mail endet sie mit dieser Signatur, mit {{signatur :: Ressort Finanzen}} steht zusätzlich eine Zeile unter dem Namen. Funktioniert in den E-Mails der Formulare und in den Texten der Rechnungsstellung. Ein leeres Feld verwendet den offiziellen Wert.',
      fr: 'Écrire {{signatur}} dans un e-mail le termine par cette signature, {{signatur :: Ressort Finanzen}} ajoute une ligne sous le nom. Fonctionne dans les e-mails des formulaires et dans les textes de la facturation. Un champ vide utilise la valeur officielle.',
    },
  },
  access: {
    read: hasAdminOrWebAccess,
    update: hasAdminOrWebAccess,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      defaultValue: DEFAULT_EMAIL_SIGNATURE.name,
      label: { en: 'Name', de: 'Name', fr: 'Nom' },
    },
    {
      name: 'whatsapp',
      type: 'text',
      defaultValue: DEFAULT_EMAIL_SIGNATURE.whatsapp,
      label: { en: 'WhatsApp', de: 'WhatsApp', fr: 'WhatsApp' },
      admin: {
        description: {
          en: 'Only in the emails, never on the website.',
          de: 'Nur in den E-Mails, nie auf der Webseite.',
          fr: 'Seulement dans les e-mails, jamais sur le site web.',
        },
      },
    },
    {
      name: 'email',
      type: 'text',
      defaultValue: DEFAULT_EMAIL_SIGNATURE.email,
      label: { en: 'Email', de: 'E-Mail', fr: 'E-mail' },
    },
    {
      name: 'website',
      type: 'text',
      defaultValue: DEFAULT_EMAIL_SIGNATURE.website,
      label: { en: 'Website', de: 'Webseite', fr: 'Site web' },
    },
  ],
};
