'use client';

import { labels } from '@/features/material/components/material-labels';
import {
  EmptyState,
  Field,
  inputClass,
  MaterialButton,
  MaterialSheet,
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
  categories: { de: 'Kategorien', en: 'Categories', fr: 'Catégories' },
  newCategory: { de: 'Neue Kategorie', en: 'New category', fr: 'Nouvelle catégorie' },
  name: { de: 'Name', en: 'Name', fr: 'Nom' },
  order: { de: 'Reihenfolge', en: 'Order', fr: 'Ordre' },
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
 * The inventory's shelves as the material team keeps them during camp. The admin panel sets
 * them up once; a shelf that turns up later is added here. The Höfe are kept in the admin
 * panel, by the Cevi.DB sync.
 */
export const CategoriesSheet: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const locale = useMaterialLocale();
  const categories = trpc.material.getCategoryList.useQuery(undefined, materialQueryOptions);
  const [editing, setEditing] = useState<{ category?: MaterialCategory } | undefined>();
  const categoryList = categories.data ?? [];

  // the edit sheet takes the place of the list rather than stacking a second dialog on it
  return (
    <>
      <MaterialSheet
        open={editing === undefined}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        title={text.categories[locale]}
      >
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
        <SheetFooter>
          <MaterialButton variant="secondary" className="w-full" onClick={() => setEditing({})}>
            <Plus aria-hidden />
            {text.newCategory[locale]}
          </MaterialButton>
        </SheetFooter>
      </MaterialSheet>
      {editing !== undefined && (
        <CategoryDialog
          {...(editing.category === undefined ? {} : { category: editing.category })}
          nextOrder={categoryList.length}
          onClose={() => setEditing(undefined)}
        />
      )}
    </>
  );
};
