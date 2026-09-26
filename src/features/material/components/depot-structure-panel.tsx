'use client';

import { labels } from '@/features/material/components/material-labels';
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
  type MaterialDepartment,
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
    de: 'Kategorien und Abteilungen',
    en: 'Categories and departments',
    fr: 'Catégories et groupes',
  },
  categories: { de: 'Kategorien', en: 'Categories', fr: 'Catégories' },
  departments: { de: 'Abteilungen', en: 'Departments', fr: 'Groupes' },
  newCategory: { de: 'Neue Kategorie', en: 'New category', fr: 'Nouvelle catégorie' },
  newDepartment: { de: 'Neue Abteilung', en: 'New department', fr: 'Nouveau groupe' },
  name: { de: 'Name', en: 'Name', fr: 'Nom' },
  order: { de: 'Reihenfolge', en: 'Order', fr: 'Ordre' },
  shortName: { de: 'Kürzel', en: 'Short name', fr: 'Abréviation' },
  contact: {
    de: 'Materialverantwortliche Person',
    en: 'Material contact',
    fr: 'Responsable matériel',
  },
  groupId: { de: 'Cevi.DB-Gruppen-ID', en: 'Cevi.DB group id', fr: 'ID du groupe Cevi.DB' },
  groupIdHint: {
    de: 'Mitglieder dieser Gruppe sehen die Ausleihen der Abteilung in der App und können für sie reservieren.',
    en: 'Members of this group see the department’s loans in the app and can book for it.',
    fr: 'Les membres de ce groupe voient les prêts du groupe dans l’app et peuvent réserver pour lui.',
  },
  noGroup: { de: 'keine Cevi.DB-Gruppe', en: 'no Cevi.DB group', fr: 'aucun groupe Cevi.DB' },
} satisfies Record<string, StaticTranslationString>;

const showError = (error: { message: string }): void => {
  toast.error(error.message);
};

/** Creates a department, or edits one: name, contact and the Cevi.DB group behind it. */
const DepartmentDialog: React.FC<{ department?: MaterialDepartment; onClose: () => void }> = ({
  department,
  onClose,
}) => {
  const locale = useMaterialLocale();
  const invalidate = useInvalidateMaterial();
  const create = trpc.material.createDepartment.useMutation();
  const update = trpc.material.updateDepartment.useMutation();
  const [name, setName] = useState(department?.name ?? '');
  const [shortName, setShortName] = useState(department?.shortName ?? '');
  const [contactName, setContactName] = useState(department?.contactName ?? '');
  const [groupId, setGroupId] = useState(
    department?.hitobitoGroupId === null || department?.hitobitoGroupId === undefined
      ? ''
      : String(department.hitobitoGroupId),
  );

  const save = (): void => {
    const data = {
      name,
      shortName,
      // eslint-disable-next-line unicorn/no-null -- the server clears the column with null
      contactName: contactName.trim() === '' ? null : contactName,
      // eslint-disable-next-line unicorn/no-null -- the server clears the column with null
      hitobitoGroupId: groupId === '' ? null : Number(groupId),
    };
    const options = {
      onSuccess: (): void => {
        toast.success(labels.saved[locale]);
        // closed first, so the button is gone before it could be tapped again
        onClose();
        void invalidate();
      },
      onError: showError,
    };
    if (department === undefined) create.mutate(data, options);
    else update.mutate({ id: department.id, ...data }, options);
  };

  return (
    <MaterialSheet
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={
        department === undefined
          ? text.newDepartment[locale]
          : `${labels.edit[locale]} · ${department.shortName}`
      }
    >
      <Field label={text.name[locale]}>
        <input
          className={inputClass}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </Field>
      <Field label={text.shortName[locale]}>
        <input
          className={inputClass}
          value={shortName}
          onChange={(event) => setShortName(event.target.value)}
        />
      </Field>
      <Field label={`${text.contact[locale]} (${labels.optional[locale]})`}>
        <input
          className={inputClass}
          value={contactName}
          onChange={(event) => setContactName(event.target.value)}
        />
      </Field>
      <Field
        label={`${text.groupId[locale]} (${labels.optional[locale]})`}
        hint={text.groupIdHint[locale]}
      >
        <input
          className={inputClass}
          inputMode="numeric"
          value={groupId}
          onChange={(event) => setGroupId(event.target.value.replaceAll(/\D/g, ''))}
        />
      </Field>
      <SheetFooter>
        <MaterialButton
          className="w-full"
          loading={create.isPending || update.isPending}
          disabled={name.trim().length < 2 || shortName.trim() === ''}
          onClick={save}
        >
          {labels.save[locale]}
        </MaterialButton>
      </SheetFooter>
    </MaterialSheet>
  );
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

type Editing =
  | { kind: 'category'; category?: MaterialCategory }
  | { kind: 'department'; department?: MaterialDepartment };

/**
 * The depot's structure as the material team keeps it up to date during camp. The admin
 * panel sets it up once; a department or shelf that turns up later is added here.
 */
export const DepotStructurePanel: React.FC = () => {
  const locale = useMaterialLocale();
  const categories = trpc.material.getCategoryList.useQuery(undefined, materialQueryOptions);
  const departments = trpc.material.getDepartmentList.useQuery(undefined, materialQueryOptions);
  const [editing, setEditing] = useState<Editing | undefined>();
  const categoryList = categories.data ?? [];
  const departmentList = departments.data ?? [];

  return (
    <Panel title={text.title[locale]}>
      <div className="grid gap-4 p-4 lg:grid-cols-2">
        <section className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-gray-800">{text.categories[locale]}</h3>
            <MaterialButton variant="secondary" onClick={() => setEditing({ kind: 'category' })}>
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
                  onClick={() => setEditing({ kind: 'category', category })}
                >
                  <Pencil aria-hidden />
                </MaterialButton>
              </li>
            ))}
          </ul>
        </section>
        <section className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-gray-800">{text.departments[locale]}</h3>
            <MaterialButton variant="secondary" onClick={() => setEditing({ kind: 'department' })}>
              <Plus aria-hidden />
              {text.newDepartment[locale]}
            </MaterialButton>
          </div>
          {departmentList.length === 0 && <EmptyState text={labels.empty[locale]} />}
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100">
            {departmentList.map((department) => (
              <li key={department.id} className="flex items-center gap-2 py-0.5 pr-1 pl-3 text-sm">
                <span className="w-12 font-bold text-gray-900">{department.shortName}</span>
                <span className="min-w-0 flex-1 truncate text-gray-700">
                  {department.name}
                  <span className="text-gray-400">
                    {' · '}
                    {department.hitobitoGroupId === null
                      ? text.noGroup[locale]
                      : `#${department.hitobitoGroupId}`}
                  </span>
                </span>
                <MaterialButton
                  variant="ghost"
                  className="w-11 px-0"
                  aria-label={`${labels.edit[locale]} ${department.shortName}`}
                  onClick={() => setEditing({ kind: 'department', department })}
                >
                  <Pencil aria-hidden />
                </MaterialButton>
              </li>
            ))}
          </ul>
        </section>
      </div>
      {editing?.kind === 'category' && (
        <CategoryDialog
          {...(editing.category === undefined ? {} : { category: editing.category })}
          nextOrder={categoryList.length}
          onClose={() => setEditing(undefined)}
        />
      )}
      {editing?.kind === 'department' && (
        <DepartmentDialog
          {...(editing.department === undefined ? {} : { department: editing.department })}
          onClose={() => setEditing(undefined)}
        />
      )}
    </Panel>
  );
};
