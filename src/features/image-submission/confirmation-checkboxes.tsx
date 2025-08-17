'use client';

import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { useCurrentLocale } from 'next-i18n-router/client';
import type React from 'react';

interface ConfirmationCheckboxesProperties {
  privacyAccepted: boolean;
  rightsTransferred: boolean;
  onPrivacyChange: (checked: boolean) => void;
  onRightsChange: (checked: boolean) => void;
}

const requiredConfirmations: StaticTranslationString = {
  en: 'Required Confirmations',
  de: 'Erforderliche Bestätigungen',
  fr: 'Confirmations requises',
};

const privacyTitle: StaticTranslationString = {
  en: 'Data Privacy Agreement',
  de: 'Datenschutzvereinbarung',
  fr: 'Accord de confidentialité des données',
};

const privacyDescription: StaticTranslationString = {
  en: 'I acknowledge that my uploaded images will be processed and stored securely. I understand that my data will be handled in accordance with applicable privacy laws and will not be shared with third parties without my explicit consent.',
  de: 'Ich bestätige, dass meine hochgeladenen Bilder sicher verarbeitet und gespeichert werden. Ich verstehe, dass meine Daten gemäß den geltenden Datenschutzgesetzen behandelt werden und nicht ohne meine ausdrückliche Zustimmung an Dritte weitergegeben werden.',
  fr: 'Je reconnais que mes images téléchargées seront traitées et stockées en toute sécurité. Je comprends que mes données seront traitées conformément aux lois applicables sur la confidentialité et ne seront pas partagées avec des tiers sans mon consentement explicite.',
};

const rightsTitle: StaticTranslationString = {
  en: 'Rights Transfer to conveniat27 Team',
  de: 'Rechteübertragung an das conveniat27-Team',
  fr: "Transfert de droits à l'équipe conveniat27",
};

const rightsDescription: StaticTranslationString = {
  en: 'I hereby transfer all rights, title, and interest in the uploaded images to the conveniat27 team. I confirm that I am the rightful owner of these images and have the authority to transfer these rights. The conveniat27 team may use, modify, distribute, and display these images for any purpose.',
  de: 'Hiermit übertrage ich alle Rechte, Titel und Interessen an den hochgeladenen Bildern an das conveniat27-Team. Ich bestätige, dass ich der rechtmäßige Eigentümer dieser Bilder bin und die Befugnis habe, diese Rechte zu übertragen. Das conveniat27-Team darf diese Bilder für jeden Zweck verwenden, ändern, verteilen und anzeigen.',
  fr: "Je transfère par les présentes tous les droits, titres et intérêts dans les images téléchargées à l'équipe conveniat27. Je confirme que je suis le propriétaire légitime de ces images et que j'ai l'autorité de transférer ces droits. L'équipe conveniat27 peut utiliser, modifier, distribuer et afficher ces images à toute fin.",
};

export const ConfirmationCheckboxes: React.FC<ConfirmationCheckboxesProperties> = ({
  privacyAccepted,
  rightsTransferred,
  onPrivacyChange,
  onRightsChange,
}) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;

  return (
    <div className="space-y-4">
      <label className="block text-base font-medium text-gray-700">
        {requiredConfirmations[locale]}
      </label>

      {/* Data Privacy Confirmation */}
      <div className="flex items-start space-x-3">
        <div className="flex h-5 items-center">
          <input
            id="privacy"
            type="checkbox"
            checked={privacyAccepted}
            onChange={(event) => onPrivacyChange(event.target.checked)}
            className="h-4 w-4 rounded border-gray-300 bg-gray-100 text-blue-600 transition-colors focus:outline-none"
          />
        </div>
        <div className="ml-3 text-sm">
          <label htmlFor="privacy" className="cursor-pointer font-medium text-gray-700">
            {privacyTitle[locale]} <span className="text-cevi-red">*</span>
          </label>
          <p className="mt-1 text-xs leading-relaxed text-gray-500">{privacyDescription[locale]}</p>
        </div>
      </div>

      {/* Rights Transfer Confirmation */}
      <div className="flex items-start space-x-3">
        <div className="flex h-5 items-center">
          <input
            id="rights"
            type="checkbox"
            checked={rightsTransferred}
            onChange={(event) => onRightsChange(event.target.checked)}
            className="h-4 w-4 rounded border-gray-300 bg-gray-100 text-blue-600 transition-colors focus:outline-none"
          />
        </div>
        <div className="ml-3 text-sm">
          <label htmlFor="rights" className="cursor-pointer font-medium text-gray-700">
            {rightsTitle[locale]} <span className="text-cevi-red">*</span>
          </label>
          <p className="mt-1 text-xs leading-relaxed text-gray-500">{rightsDescription[locale]}</p>
        </div>
      </div>
    </div>
  );
};
