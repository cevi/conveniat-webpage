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
              <label
                htmlFor="rights-modal"
                className="border-line hover:bg-quiet flex cursor-pointer items-start gap-3 rounded-[14px] border p-3.5 transition-colors"
              >
                <span className="flex h-6 items-center">
                  <input
                    id="rights-modal"
                    type="checkbox"
                    checked={rightsTransferred}
                    onChange={(event) => setRightsTransferred(event.target.checked)}
                    className="accent-conveniat-green h-5 w-5 cursor-pointer"
                  />
                </span>
                <span className="select-none">
                  <span className="block text-[15px] font-semibold text-green-900">
                    {rightsTitle[locale]} <span className="text-green-700">*</span>
                  </span>
                  <span className="mt-1 block text-[13px] leading-relaxed text-green-700">
                    {rightsDescription[locale]}
                  </span>
                </span>
              </label>
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
