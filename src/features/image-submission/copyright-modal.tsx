'use client';

/* eslint-disable import/no-restricted-paths -- alert dialog shared component used across features */
import {
  ChatAlertDialog,
  ChatAlertDialogAction,
  ChatAlertDialogCancel,
  ChatAlertDialogContent,
  ChatAlertDialogDescription,
  ChatAlertDialogFooter,
  ChatAlertDialogHeader,
  ChatAlertDialogTitle,
} from '@/features/chat/components/ui/chat-alert-dialog';
/* eslint-enable import/no-restricted-paths */
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { Loader2 } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import type React from 'react';
import { useState } from 'react';

interface CopyrightModalProperties {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isUploading: boolean;
}

const requiredConfirmations: StaticTranslationString = {
  en: 'Required Confirmations',
  de: 'Erforderliche Bestätigungen',
  fr: 'Confirmations requises',
};

const rightsTitle: StaticTranslationString = {
  en: 'Rights Transfer',
  de: 'Rechteübertragung',
  fr: 'Transfert de droits',
};

const rightsDescription: StaticTranslationString = {
  en: 'I hereby transfer all rights, title, and interest in the uploaded images to the conveniat27 team. I confirm that I am the rightful owner of these images and have the authority to transfer these rights. The conveniat27 team may use, modify, distribute, and display these images for any purpose.',
  de: 'Hiermit übertrage ich alle Rechte, Titel und Interessen an den hochgeladenen Bildern an das conveniat27-Team. Ich bestätige, dass ich der rechtmäßige Eigentümer dieser Bilder bin und die Befugnis habe, diese Rechte zu übertragen. Das conveniat27-Team darf diese Bilder für jeden Zweck verwenden, ändern, verteilen und anzeigen.',
  fr: "Je transfère par les présentes tous les droits, titres et intérêts dans les images téléchargées à l'équipe conveniat27. Je confirme que je suis le propriétaire légitime de ces images et que j'ai l'autorité de transférer ces droits. L'équipe conveniat27 peut utiliser, modifier, distribuer et afficher ces images à toute fin.",
};

const confirmButton: StaticTranslationString = {
  en: 'Confirm & Upload',
  de: 'Bestätigen & Hochladen',
  fr: 'Confirmer & Télécharger',
};

const cancelButton: StaticTranslationString = {
  en: 'Cancel',
  de: 'Abbrechen',
  fr: 'Annuler',
};

export const CopyrightModal: React.FC<CopyrightModalProperties> = ({
  open,
  onOpenChange,
  onConfirm,
  isUploading,
}) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const [rightsTransferred, setRightsTransferred] = useState(false);

  const handleConfirm = (event: React.MouseEvent): void => {
    event.preventDefault();
    if (rightsTransferred) {
      onConfirm();
    }
  };

  return (
    <ChatAlertDialog open={open} onOpenChange={onOpenChange}>
      <ChatAlertDialogContent className="bg-white">
        <ChatAlertDialogHeader>
          <ChatAlertDialogTitle>{requiredConfirmations[locale]}</ChatAlertDialogTitle>
          <ChatAlertDialogDescription asChild>
            <div className="pt-4 text-left">
              <div
                className="flex cursor-pointer items-start rounded-xl border border-gray-200 p-3 transition-colors hover:bg-gray-50"
                onClick={() => setRightsTransferred(!rightsTransferred)}
              >
                <div className="flex h-6 items-center">
                  <input
                    id="rights-modal"
                    type="checkbox"
                    checked={rightsTransferred}
                    onChange={(event) => setRightsTransferred(event.target.checked)}
                    className="h-5 w-5 cursor-pointer rounded border-gray-300 text-blue-600 transition focus:ring-blue-500 focus:ring-offset-0"
                    onClick={(event) => event.stopPropagation()}
                  />
                </div>
                <div className="ml-4 select-none">
                  <label
                    htmlFor="rights-modal"
                    className="cursor-pointer text-sm font-semibold text-gray-800"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {rightsTitle[locale]} <span className="text-cevi-red">*</span>
                  </label>
                  <p className="mt-1 text-xs leading-relaxed text-gray-500">
                    {rightsDescription[locale]}
                  </p>
                </div>
              </div>
            </div>
          </ChatAlertDialogDescription>
        </ChatAlertDialogHeader>
        <ChatAlertDialogFooter>
          <ChatAlertDialogCancel disabled={isUploading}>
            {cancelButton[locale]}
          </ChatAlertDialogCancel>
          <ChatAlertDialogAction
            onClick={handleConfirm}
            disabled={!rightsTransferred || isUploading}
            className="bg-conveniat-green hover:bg-conveniat-green-dark text-white"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {confirmButton[locale]}
              </>
            ) : (
              confirmButton[locale]
            )}
          </ChatAlertDialogAction>
        </ChatAlertDialogFooter>
      </ChatAlertDialogContent>
    </ChatAlertDialog>
  );
};
