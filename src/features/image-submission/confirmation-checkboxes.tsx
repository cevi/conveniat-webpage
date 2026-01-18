'use client';

import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { useCurrentLocale } from 'next-i18n-router/client';
import type React from 'react';

interface ConfirmationCheckboxesProperties {
  rightsTransferred: boolean;
  onRightsChange: (checked: boolean) => void;
}

const requiredConfirmations: StaticTranslationString = {
  en: 'Required Confirmations',
  de: 'Erforderliche Bestätigungen',
  fr: 'Confirmations requises',
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
  rightsTransferred,
  onRightsChange,
}) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;

  return (
    <div className="space-y-4">
      <label className="block text-lg font-semibold text-gray-800">
        {requiredConfirmations[locale]}
      </label>

      {/* Rights Transfer Confirmation */}
      <div className="flex items-start rounded-xl border border-transparent p-3 transition-colors hover:bg-gray-50">
        <div className="flex h-6 items-center">
          <input
            id="rights"
            type="checkbox"
            checked={rightsTransferred}
            onChange={(event) => onRightsChange(event.target.checked)}
            className="h-5 w-5 rounded border-gray-300 text-blue-600 transition focus:ring-blue-500 focus:ring-offset-0"
          />
        </div>
        <div className="ml-4">
          <label htmlFor="rights" className="cursor-pointer text-sm font-semibold text-gray-800">
            {rightsTitle[locale]} <span className="text-cevi-red">*</span>
          </label>
          <p className="mt-1 text-xs leading-relaxed text-gray-500">{rightsDescription[locale]}</p>
        </div>
      </div>
    </div>
  );
};
