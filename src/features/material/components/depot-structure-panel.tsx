'use client';

import { format, labels } from '@/features/material/components/material-labels';
import {
  EmptyState,
  Field,
  inputClass,
  MaterialButton,
  MaterialSheet,
  Panel,
  SheetFooter,
} from '@/features/material/components/material-ui';
import {
  materialQueryOptions,
  useInvalidateMaterial,
  useMaterialLocale,
} from '@/features/material/hooks/use-material';
import { trpc, type RouterOutputs } from '@/trpc/client';
import type { StaticTranslationString } from '@/types/types';
import { Pencil, Plus } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { toast } from 'sonner';

type MaterialCategory = RouterOutputs['material']['getCategoryList'][number];

const text = {
  title: {
    de: 'Kategorien und Höfe',
    en: 'Categories and Hofs',
    fr: 'Catégories et Hofs',
  },
  categories: { de: 'Kategorien', en: 'Categories', fr: 'Catégories' },
  hoefe: { de: 'Höfe', en: 'Hofs', fr: 'Hofs' },
  newCategory: { de: 'Neue Kategorie', en: 'New category', fr: 'Nouvelle catégorie' },
  name: { de: 'Name', en: 'Name', fr: 'Nom' },
  order: { de: 'Reihenfolge', en: 'Order', fr: 'Ordre' },
  hoefeSource: {
    de: 'Die Höfe kommen aus dem Cevi.DB-Abgleich im Adminbereich (Admin → Höfe).',
    en: 'The Hofs come from the Cevi.DB sync in the admin panel (Admin → Hofs).',
    fr: 'Les Hofs viennent de la synchronisation Cevi.DB dans l’administration (Admin → Hofs).',
  },
  event: { de: '1 Anlass', en: '1 event', fr: '1 événement' },
  events: { de: '{n} Anlässe', en: '{n} events', fr: '{n} événements' },
} satisfies Record<string, StaticTranslationString>;

const showError = (error: { message: string }): void => {
  toast.error(error.message);
};

/** Creates or renames a category and sets where it appears in the catalogue. */
const CategoryDialog: React.FC<{
  category?: MaterialCategory;
  nextOrder: number;
  onClose: () => void;
}> = ({ category, nextOrder, onClose }) => {
  const locale = useMaterialLocale();
  const invalidate = useInvalidateMaterial();
  const create = trpc.material.createCategory.useMutation();
  const update = trpc.material.updateCategory.useMutation();
  const [name, setName] = useState(category?.name ?? '');
  const [order, setOrder] = useState(String(category?.sortOrder ?? nextOrder));

  const save = (): void => {
    const data = { name, sortOrder: Number(order === '' ? '0' : order) };
    const options = {
      onSuccess: (): void => {
        toast.success(labels.saved[locale]);
        onClose();
        void invalidate();
      },
      onError: showError,
    };
    if (category === undefined) create.mutate(data, options);
    else update.mutate({ id: category.id, ...data }, options);
  };

  return (
    <MaterialSheet
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={
        category === undefined
          ? text.newCategory[locale]
          : `${labels.edit[locale]} · ${category.name}`
      }
    >
      <Field label={text.name[locale]}>
        <input
          className={inputClass}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </Field>
      <Field label={text.order[locale]}>
        <input
          className={inputClass}
          inputMode="numeric"
          value={order}
          onChange={(event) => setOrder(event.target.value.replaceAll(/\D/g, ''))}
        />
      </Field>
      <SheetFooter>
        <MaterialButton
          className="w-full"
          loading={create.isPending || update.isPending}
          disabled={name.trim() === ''}
          onClick={save}
        >
          {labels.save[locale]}
        </MaterialButton>
      </SheetFooter>
    </MaterialSheet>
  );
};

/**
 * The depot's structure as the material team keeps it up to date during camp. The admin
 * panel sets it up once; a shelf that turns up later is added here. The Höfe are only shown:
 * the Cevi.DB sync in the admin panel keeps them.
 */
export const DepotStructurePanel: React.FC = () => {
  const locale = useMaterialLocale();
  const categories = trpc.material.getCategoryList.useQuery(undefined, materialQueryOptions);
  const hoefe = trpc.material.getHofList.useQuery(undefined, materialQueryOptions);
  const [editing, setEditing] = useState<{ category?: MaterialCategory } | undefined>();
  const categoryList = categories.data ?? [];
  const hofList = hoefe.data ?? [];

  return (
    <Panel title={text.title[locale]}>
      <div className="grid gap-4 p-4 lg:grid-cols-2">
        <section className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-gray-800">{text.categories[locale]}</h3>
            <MaterialButton variant="secondary" onClick={() => setEditing({})}>
              <Plus aria-hidden />
              {text.newCategory[locale]}
            </MaterialButton>
          </div>
          {categoryList.length === 0 && <EmptyState text={labels.empty[locale]} />}
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100">
            {categoryList.map((category) => (
              <li key={category.id} className="flex items-center gap-2 py-0.5 pr-1 pl-3 text-sm">
                <span className="w-8 font-mono text-xs text-gray-400">{category.sortOrder}</span>
                <span className="min-w-0 flex-1 truncate font-semibold text-gray-900">
                  {category.name}
                </span>
                <MaterialButton
                  variant="ghost"
                  className="w-11 px-0"
                  aria-label={`${labels.edit[locale]} ${category.name}`}
                  onClick={() => setEditing({ category })}
                >
                  <Pencil aria-hidden />
                </MaterialButton>
              </li>
            ))}
          </ul>
        </section>
        <section className="min-w-0">
          <h3 className="mb-1 text-sm font-bold text-gray-800">{text.hoefe[locale]}</h3>
          <p className="mb-2 text-xs text-gray-500">{text.hoefeSource[locale]}</p>
          {hofList.length === 0 && <EmptyState text={labels.empty[locale]} />}
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100">
            {hofList.map((hof) => (
              <li key={hof.id} className="flex min-h-11 items-center gap-2 px-3 text-sm">
                <span className="min-w-0 flex-1 truncate font-semibold text-gray-900">
                  {hof.name}
                  {hof.groupId !== null && (
                    <span className="font-normal text-gray-400"> · #{hof.groupId}</span>
                  )}
                </span>
                <span className="shrink-0 text-xs text-gray-500">
                  {hof.eventCount === 1
                    ? text.event[locale]
                    : format(text.events, locale, { n: hof.eventCount })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
      {editing !== undefined && (
        <CategoryDialog
          {...(editing.category === undefined ? {} : { category: editing.category })}
          nextOrder={categoryList.length}
          onClose={() => setEditing(undefined)}
        />
      )}
    </Panel>
  );
};
