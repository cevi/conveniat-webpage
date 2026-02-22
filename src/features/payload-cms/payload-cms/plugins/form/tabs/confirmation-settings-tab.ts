import { environmentVariables } from '@/config/environment-variables';
import { minimalEditorFeatures } from '@/features/payload-cms/payload-cms/plugins/lexical-editor';
import { patchRichTextLinkHook } from '@/features/payload-cms/payload-cms/utils/link-field-logic';
import {
  defaultEditorLexicalConfig,
  HeadingFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical';
import type { Field, Tab } from 'payload';

const formSubmitButtonLabelField: Field = {
  name: 'submitButtonLabel',
  type: 'text',
  required: true,
  localized: true,
};

const formLexicalEditorSettings = lexicalEditor({
  features: [
    ...minimalEditorFeatures,
    HeadingFeature({
      enabledHeadingSizes: ['h3'],
    }),
  ],
  lexical: defaultEditorLexicalConfig,
});

const formConfirmationTypeField: Field = {
  name: 'confirmationType',
  type: 'radio',
  admin: {
    description:
      'Choose whether to display an on-page message or redirect to a different page after they submit the form.',
    layout: 'horizontal',
  },
  defaultValue: 'message',
  options: [
    { label: 'Message', value: 'message' },
    { label: 'Redirect', value: 'redirect' },
  ],
};

const formRedirectField: Field = {
  name: 'redirect',
  type: 'group',
  admin: {
    condition: (_, siblingData) => siblingData['confirmationType'] === 'redirect',
    hideGutter: true,
  },
  fields: [
    {
      name: 'url',
      type: 'text',
      label: 'URL to redirect to',
      required: true,
    },
  ],
};

const formEmailField: Field = {
  name: 'emails',
  type: 'array',
  access: {},
  admin: {
    description: {
      en: "Send custom emails when the form submits. Use comma separated lists to send the same email to multiple recipients. To reference a value from this form, wrap that field's name with double curly brackets, i.e. {{firstName}}. You can use a wildcard {{*}} to output all data and {{*:table}} to format it as an HTML table in the email.",
      de: 'Senden Sie benutzerdefinierte E-Mails, wenn das Formular übermittelt wird. Verwenden Sie durch Kommas getrennte Listen, um dieselbe E-Mail an mehrere Empfänger zu senden. Um auf einen Wert aus diesem Formular zu verweisen, schließen Sie den Namen dieses Felds in doppelte geschweifte Klammern ein, z. B. {{firstName}}. Sie können einen Platzhalter {{*}} verwenden, um alle Daten auszugeben, und {{*:table}}, um sie als HTML-Tabelle in der E-Mail zu formatieren.',
      fr: "Envoyez des e-mails personnalisés lorsque le formulaire est soumis. Utilisez des listes séparées par des virgules pour envoyer le même e-mail à plusieurs destinataires. Pour faire référence à une valeur de ce formulaire, entourez le nom de ce champ de doubles accolades, par exemple {{firstName}}. Vous pouvez utiliser un joker {{*}} pour afficher toutes les données et {{*:table}} pour les formater sous forme de tableau HTML dans l'e-mail.",
    },
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'emailTo',
          type: 'text',
          admin: { placeholder: '"Email Sender" <sender@email.com>', width: '100%' },
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
      defaultValue: "You've received a new message.",
      label: 'Subject',
      localized: true,
      required: true,
    },
    {
      name: 'message',
      type: 'richText',
      admin: { description: 'Enter the message that should be sent in this email.' },
      label: 'Message',
      localized: true,
      editor: formLexicalEditorSettings,
      hooks: patchRichTextLinkHook,
    },
  ],
};

const formConfirmationMessageField: Field = {
  name: 'confirmationMessage',
  type: 'richText',
  admin: {
    condition: (_, siblingData) => siblingData['confirmationType'] === 'message',
  },
  localized: true,
  required: true,
  editor: formLexicalEditorSettings,
  hooks: patchRichTextLinkHook,
};

export const confirmationSettingsTab: Tab = {
  label: {
    en: 'Confirmation Settings',
    de: 'Bestätigungs-Einstellungen',
    fr: 'Paramètres de confirmation',
  },
  fields: [
    formSubmitButtonLabelField,
    formConfirmationTypeField,
    formConfirmationMessageField,
    formRedirectField,
    formEmailField,
  ],
};
