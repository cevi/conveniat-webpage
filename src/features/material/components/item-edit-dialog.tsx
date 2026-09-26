'use client';

import { labels } from '@/features/material/components/material-labels';
import {
  Field,
  inputClass,
  MaterialButton,
  MaterialSheet,
  NativeSelect,
  NumberInput,
} from '@/features/material/components/material-ui';
import {
  materialQueryOptions,
  useInvalidateMaterial,
  useMaterialLocale,
  type MaterialItem,
} from '@/features/material/hooks/use-material';
import { getItemFormProblems, type ItemFormProblem } from '@/features/material/utils/item-form';
import { trpc } from '@/trpc/client';
import type { StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { useState } from 'react';
import { toast } from 'sonner';

const text = {
  titleNew: { de: 'Neuer Artikel', en: 'New item', fr: 'Nouvel article' },
  name: { de: 'Bezeichnung', en: 'Name', fr: 'Désignation' },
  code: { de: 'Code (QR-Etikett)', en: 'Code (QR label)', fr: 'Code (étiquette QR)' },
  codeHint: {
    de: 'Grossbuchstaben, Ziffern und Bindestrich, z. B. JS-WOLL',
    en: 'Capitals, digits and dashes, e.g. JS-WOLL',
    fr: 'Majuscules, chiffres et tirets, p. ex. JS-WOLL',
  },
  unit: { de: 'Einheit', en: 'Unit', fr: 'Unité' },
  lowStock: {
    de: 'Warnen ab (frei)',
    en: 'Warn at (free)',
    fr: 'Alerter à (libres)',
  },
  imageUrl: { de: 'Bild-URL', en: 'Image URL', fr: 'URL de l’image' },
  reservable: {
    de: 'Kann im Voraus reserviert werden',
    en: 'Can be reserved ahead',
    fr: 'Peut être réservé à l’avance',
  },
  disabled: {
    de: 'Gesperrt (nicht verfügbar)',
    en: 'Blocked (not available)',
    fr: 'Bloqué (indisponible)',
  },
} satisfies Record<string, StaticTranslationString>;

const problemText: Record<ItemFormProblem, StaticTranslationString> = {
  code: {
    de: '2 bis 24 Zeichen: Grossbuchstaben, Ziffern und Bindestrich.',
    en: '2 to 24 characters: capitals, digits and dashes.',
    fr: '2 à 24 caractères : majuscules, chiffres et tirets.',
  },
  imageUrl: {
    de: 'Das ist keine gültige Adresse, z. B. https://…',
    en: 'This is not a valid address, e.g. https://…',
    fr: 'Ce n’est pas une adresse valide, p. ex. https://…',
  },
  maxLoanQuantity: {
    de: 'Mindestens 1.',
    en: 'At least 1.',
    fr: 'Au moins 1.',
  },
};

interface FormState {
  name: string;
  code: string;
  categoryId: string;
  description: string;
  usageNotes: string;
  returnInstructions: string;
  imageUrl: string;
  unit: string;
  totalQuantity: number;
  maxLoanQuantity: number;
  lowStockThreshold: number;
  isConsumable: boolean;
  isReservable: boolean;
  isDisabled: boolean;
}

const fromItem = (item: MaterialItem | undefined): FormState => ({
  name: item?.name ?? '',
  code: item?.code ?? '',
  categoryId: item?.category.id ?? '',
  description: item?.description ?? '',
  usageNotes: item?.usageNotes ?? '',
  returnInstructions: item?.returnInstructions ?? '',
  imageUrl: item?.imageUrl ?? '',
  unit: item?.unit ?? 'Stück',
  totalQuantity: item?.totalQuantity ?? 0,
  maxLoanQuantity: item?.maxLoanQuantity ?? 1,
  lowStockThreshold: item?.lowStockThreshold ?? 0,
  isConsumable: item?.isConsumable ?? false,
  isReservable: item?.isReservable ?? true,
  isDisabled: item?.isDisabled ?? false,
});

const showError = (error: { message: string }): void => {
  toast.error(error.message);
};

/** Creates an article, or edits one; every field an article has is on this form. */
export const ItemEditDialog: React.FC<{
  item?: MaterialItem;
  onClose: () => void;
}> = ({ item, onClose }) => {
  const locale = useMaterialLocale();
  const router = useRouter();
  const invalidate = useInvalidateMaterial();
  const categories = trpc.material.getCategoryList.useQuery(undefined, materialQueryOptions);
  const [form, setForm] = useState<FormState>(() => fromItem(item));
  const create = trpc.material.createItem.useMutation();
  const update = trpc.material.updateItem.useMutation();

  const set = <K extends keyof FormState>(key: K, value: FormState[K]): void =>
    setForm((current) => ({ ...current, [key]: value }));

  const numberInput = (
    key: 'totalQuantity' | 'maxLoanQuantity' | 'lowStockThreshold',
  ): React.ReactNode => (
    <NumberInput
      min={key === 'maxLoanQuantity' ? 1 : 0}
      value={form[key]}
      onChange={(value) => set(key, value)}
    />
  );

  const problems = getItemFormProblems(form);
  const problem = (key: ItemFormProblem): string | undefined =>
    problems.has(key) ? problemText[key][locale] : undefined;
  // the code only complains once something was typed, a fresh form is not an error yet
  const codeProblem = form.code.trim() === '' ? undefined : problem('code');

  const save = (): void => {
    const data = {
      ...form,
      code: form.code.trim().toUpperCase(),
      // eslint-disable-next-line unicorn/no-null
      usageNotes: form.usageNotes.trim() === '' ? null : form.usageNotes,
      // eslint-disable-next-line unicorn/no-null
      imageUrl: form.imageUrl.trim() === '' ? null : form.imageUrl.trim(),
    };
    const onSuccess = (): void => {
      toast.success(labels.saved[locale]);
      // closed first, so the button is gone before it could be tapped a second time
      onClose();
      void invalidate();
      // the code is the address of the article page
      if (item?.code !== data.code) {
        router.replace(`/app/material/catalog?item=${encodeURIComponent(data.code)}`);
      }
    };
    const options = { onSuccess, onError: showError };
    if (item === undefined) create.mutate(data, options);
    else update.mutate({ id: item.id, ...data }, options);
  };

  return (
    <MaterialSheet
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={item === undefined ? text.titleNew[locale] : `${labels.edit[locale]} · ${item.name}`}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label={text.name[locale]} className="col-span-2">
          <input
            className={inputClass}
            value={form.name}
            onChange={(event) => set('name', event.target.value)}
          />
        </Field>
        <Field label={text.code[locale]} hint={text.codeHint[locale]} error={codeProblem}>
          <input
            className={cn(inputClass, 'font-mono uppercase')}
            value={form.code}
            onChange={(event) => set('code', event.target.value)}
          />
        </Field>
        <Field label={labels.category[locale]}>
          <NativeSelect
            value={form.categoryId}
            onChange={(event) => set('categoryId', event.target.value)}
          >
            <option value="">…</option>
            {categories.data?.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label={labels.total[locale]}>{numberInput('totalQuantity')}</Field>
        <Field label={labels.maxPerLoan[locale]} error={problem('maxLoanQuantity')}>
          {numberInput('maxLoanQuantity')}
        </Field>
        <Field label={text.unit[locale]}>
          <input
            className={inputClass}
            value={form.unit}
            onChange={(event) => set('unit', event.target.value)}
          />
        </Field>
        <Field label={text.lowStock[locale]}>{numberInput('lowStockThreshold')}</Field>
        <Field label={labels.description[locale]} className="col-span-2">
          <textarea
            className={cn(inputClass, 'h-24 py-2')}
            value={form.description}
            onChange={(event) => set('description', event.target.value)}
          />
        </Field>
        <Field
          label={`${labels.usageNotes[locale]} (${labels.optional[locale]})`}
          className="col-span-2"
        >
          <textarea
            className={cn(inputClass, 'h-16 py-2')}
            value={form.usageNotes}
            onChange={(event) => set('usageNotes', event.target.value)}
          />
        </Field>
        <Field label={labels.returnInstructions[locale]} className="col-span-2">
          <textarea
            className={cn(inputClass, 'h-16 py-2')}
            value={form.returnInstructions}
            onChange={(event) => set('returnInstructions', event.target.value)}
          />
        </Field>
        <Field
          label={`${text.imageUrl[locale]} (${labels.optional[locale]})`}
          className="col-span-2"
          error={problem('imageUrl')}
        >
          <input
            type="url"
            className={inputClass}
            value={form.imageUrl}
            onChange={(event) => set('imageUrl', event.target.value)}
          />
        </Field>
      </div>
      <div className="space-y-2 text-sm">
        {(
          [
            ['isConsumable', labels.consumable[locale]],
            ['isReservable', text.reservable[locale]],
            ['isDisabled', text.disabled[locale]],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="flex items-center gap-3">
            <input
              type="checkbox"
              className="size-5 accent-[#47564c]"
              checked={form[key]}
              onChange={(event) => set(key, event.target.checked)}
            />
            {label}
          </label>
        ))}
      </div>
      <MaterialButton
        className="w-full"
        loading={create.isPending || update.isPending}
        disabled={
          form.name.trim() === '' ||
          form.categoryId === '' ||
          form.unit.trim() === '' ||
          problems.size > 0
        }
        onClick={save}
      >
        {labels.save[locale]}
      </MaterialButton>
    </MaterialSheet>
  );
};
