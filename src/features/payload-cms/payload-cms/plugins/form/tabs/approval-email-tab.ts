import { environmentVariables } from '@/config/environment-variables';
import { minimalEditorFeatures } from '@/features/payload-cms/payload-cms/plugins/lexical-editor';
import { patchRichTextLinkHook } from '@/features/payload-cms/payload-cms/utils/link-field-logic';
import {
  defaultEditorLexicalConfig,
  HeadingFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical';
import type { Field, Tab } from 'payload';

const formLexicalEditorSettings = lexicalEditor({
  features: [
    ...minimalEditorFeatures,
    HeadingFeature({
      enabledHeadingSizes: ['h3'],
    }),
  ],
  lexical: defaultEditorLexicalConfig,
});

const formApprovalEmailField: Field = {
  name: 'approvalEmails',
  type: 'array',
  access: {},
  admin: {
    description: {
      en: "Send custom emails when a form submission is approved (set to Freigegeben). Use comma separated lists to send the same email to multiple recipients. To reference a value from this form, wrap that field's name with double curly brackets, i.e. {{firstName}}. You can use a wildcard {{*}} to output all data and {{*:table}} to format it as an HTML table in the email.",
      de: 'Senden Sie benutzerdefinierte E-Mails, wenn eine Formular-Antwort freigegeben wird. Verwenden Sie durch Kommas getrennte Listen, um dieselbe E-Mail an mehrere Empfänger zu senden. Um auf einen Wert aus diesem Formular zu verweisen, schließen Sie den Namen dieses Felds in doppelte geschweifte Klammern ein, z. B. {{firstName}}. Sie können einen Platzhalter {{*}} verwenden, um alle Daten auszugeben, und {{*:table}}, um sie als HTML-Tabelle in der E-Mail zu formatieren.',
      fr: "Envoyez des e-mails personnalisés lorsqu'une soumission de formulaire est approuvée (marquée comme Freigegeben). Utilisez des listes séparées par des virgules pour envoyer le même e-mail à plusieurs destinataires. Pour faire référence à une valeur de ce formulaire, entourez le nom de ce champ de doubles accolades, par exemple {{firstName}}. Vous pouvez utiliser un joker {{*}} pour afficher toutes les données et {{*:table}} pour les formater sous forme de tableau HTML.",
    },
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'emailTo',
          type: 'text',
          admin: { placeholder: '"Email Recipient" <recipient@email.com>', width: '100%' },
          label: 'Email To',
        },
        { name: 'cc', type: 'text', admin: { style: { maxWidth: '50%' } }, label: 'CC' },
        {
          name: 'bcc',
          type: 'text',
          admin: { style: { maxWidth: '50%' } },
          label: 'BCC',
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'replyTo',
          type: 'text',
          admin: { placeholder: '"Reply To" <reply-to@email.com>', width: '50%' },
          label: 'Reply To',
        },
        {
          name: 'emailFrom',
          type: 'text',
          admin: {
            placeholder: '"Email From" <email-from@email.com>',
            width: '50%',
            components: {
              afterInput: [
                {
                  path: '@/features/payload-cms/payload-cms/components/fields/email-from-warning',
                  clientProps: {
                    smtpDomain:
                      typeof environmentVariables.SMTP_USER === 'string' &&
                      (environmentVariables.SMTP_USER.split('@')[1] ?? '').length > 0
                        ? environmentVariables.SMTP_USER.split('@')[1]
                        : 'cevi.tools',
                  },
                },
              ],
            },
          },
          label: 'Email From',
        },
      ],
    },
    {
      name: 'subject',
      type: 'text',
      defaultValue: 'Your form submission has been approved.',
      label: 'Subject',
      localized: true,
      required: true,
    },
    {
      name: 'attachFiles',
      type: 'checkbox',
      defaultValue: false,
      label: {
        en: 'Attach Uploaded Files',
        de: 'Hochgeladene Dateien als Anhang mitsenden',
        fr: 'Joindre les fichiers téléversés',
      },
      admin: {
        description: {
          en: 'If checked, files uploaded in this form submission will be attached to this approval email.',
          de: 'Wenn aktiviert, werden mit diesem Formular hochgeladene Dateien an diese Freigabe-E-Mail angehängt.',
          fr: 'Si cette option est cochée, les fichiers téléversés dans ce formulaire seront joints à cet e-mail d’approbation.',
        },
      },
    },
    {
      name: 'message',
      type: 'richText',
      admin: { description: 'Enter the message that should be sent in this approval email.' },
      label: 'Message',
      localized: true,
      editor: formLexicalEditorSettings,
      hooks: patchRichTextLinkHook,
    },
  ],
};

export const approvalEmailTab: Tab = {
  label: {
    en: 'Approval Emails',
    de: 'Freigabe E-Mails',
    fr: "E-mails d'approbation",
  },
  fields: [formApprovalEmailField],
};
