'use client';

import {
  deleteMaterialCategory,
  deleteMaterialDepartment,
  importMaterialCatalogue,
  saveMaterialCategory,
  saveMaterialDepartment,
} from '@/features/material/payload-cms/material-setup-actions';
import {
  setupMessages,
  type SetupResult,
} from '@/features/material/payload-cms/material-setup-messages';
import type { Locale, StaticTranslationString } from '@/types/types';
import { Banner, Button } from '@payloadcms/ui';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { useState, useTransition } from 'react';

export interface SetupCategory {
  id: string;
  name: string;
  sortOrder: number;
  itemCount: number;
}

export interface SetupDepartment {
  id: string;
  name: string;
  shortName: string;
  contactName: string | null;
  hitobitoGroupId: number | null;
  loanCount: number;
}

const text = {
  categories: { de: 'Kategorien', en: 'Categories', fr: 'Catégories' },
  departments: { de: 'Abteilungen', en: 'Departments', fr: 'Groupes' },
  catalogue: { de: 'Katalog importieren', en: 'Import catalogue', fr: 'Importer le catalogue' },
  name: { de: 'Name', en: 'Name', fr: 'Nom' },
  order: { de: 'Reihenfolge', en: 'Order', fr: 'Ordre' },
  items: { de: 'Artikel', en: 'Items', fr: 'Articles' },
  shortName: { de: 'Kürzel', en: 'Short name', fr: 'Abréviation' },
  contact: {
    de: 'Materialverantwortliche Person',
    en: 'Material contact',
    fr: 'Responsable matériel',
  },
  groupId: { de: 'Cevi.DB-Gruppe', en: 'Cevi.DB group', fr: 'Groupe Cevi.DB' },
  loans: { de: 'Ausleihen', en: 'Loans', fr: 'Prêts' },
  add: { de: 'Hinzufügen', en: 'Add', fr: 'Ajouter' },
  save: { de: 'Speichern', en: 'Save', fr: 'Enregistrer' },
  remove: { de: 'Löschen', en: 'Delete', fr: 'Supprimer' },
  confirmRemove: {
    de: '«{name}» wirklich löschen?',
    en: 'Really delete “{name}”?',
    fr: 'Vraiment supprimer « {name} » ?',
  },
  groupHint: {
    de: 'Mitglieder dieser Cevi.DB-Gruppe sehen die Ausleihen der Abteilung in der App.',
    en: 'Members of this Cevi.DB group see the department’s loans in the app.',
    fr: 'Les membres de ce groupe Cevi.DB voient les prêts du groupe dans l’app.',
  },
  importHint: {
    de: 'Zeilen aus einer Tabelle einfügen, getrennt durch Tabulator oder Semikolon. Spalten: code; name; category; total; max; unit; consumable (ja/nein); reservable (ja/nein); description; returnInstructions; imageUrl. Ein bestehender Code wird aktualisiert, Schäden und Reparaturen bleiben erhalten. Fehlende Kategorien werden angelegt.',
    en: 'Paste rows from a spreadsheet, separated by tabs or semicolons. Columns: code; name; category; total; max; unit; consumable (yes/no); reservable (yes/no); description; returnInstructions; imageUrl. An existing code is updated, damage and repairs are kept. Missing categories are created.',
    fr: 'Colle des lignes d’un tableur, séparées par tabulation ou point-virgule. Colonnes : code; name; category; total; max; unit; consumable (oui/non); reservable (oui/non); description; returnInstructions; imageUrl. Un code existant est mis à jour, dégâts et réparations sont conservés. Les catégories manquantes sont créées.',
  },
  runImport: { de: 'Importieren', en: 'Import', fr: 'Importer' },
} satisfies Record<string, StaticTranslationString>;

const fill = (template: string, values: Record<string, string | number> = {}): string =>
  Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template,
  );

const inputClass =
  'w-full rounded border border-[var(--theme-elevation-150)] bg-[var(--theme-input-bg)] px-2 py-1.5 text-sm';

/**
 * Runs a setup action, shows its outcome and reloads the server-rendered lists. The lists
 * come in as props of this admin view, so a refresh of the route is enough to show them.
 */
const useSetupAction = (
  locale: Locale,
): {
  run: (action: () => Promise<SetupResult>) => void;
  pending: boolean;
  banner: React.ReactNode;
} => {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<SetupResult | undefined>();

  const run = (action: () => Promise<SetupResult>): void => {
    startTransition(async () => {
      const outcome = await action();
      setResult(outcome);
      if (outcome.ok) router.refresh();
    });
  };

  const banner =
    result === undefined ? undefined : (
      <Banner type={result.ok ? 'success' : 'error'}>
        {fill(setupMessages[result.message][locale], result.values)}
      </Banner>
    );
  return { run, pending, banner };
};

const CategoryRow: React.FC<{
  category: SetupCategory;
  locale: Locale;
  run: (action: () => Promise<SetupResult>) => void;
  pending: boolean;
}> = ({ category, locale, run, pending }) => {
  const [name, setName] = useState(category.name);
  const [sortOrder, setSortOrder] = useState(String(category.sortOrder));
  return (
    <tr className="border-b border-[var(--theme-elevation-100)]">
      <td className="py-1 pr-2">
        <input
          className={inputClass}
          aria-label={text.name[locale]}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </td>
      <td className="w-24 py-1 pr-2">
        <input
          className={inputClass}
          aria-label={text.order[locale]}
          inputMode="numeric"
          value={sortOrder}
          onChange={(event) => setSortOrder(event.target.value.replaceAll(/\D/g, ''))}
        />
      </td>
      <td className="py-1 pr-2 text-right tabular-nums">{category.itemCount}</td>
      <td className="flex justify-end gap-2 py-1">
        <Button
          size="small"
          buttonStyle="secondary"
          disabled={pending}
          onClick={() =>
            run(() => saveMaterialCategory({ id: category.id, name, sortOrder: Number(sortOrder) }))
          }
        >
          {text.save[locale]}
        </Button>
        <Button
          size="small"
          buttonStyle="error"
          disabled={pending || category.itemCount > 0}
          onClick={() => {
            if (globalThis.confirm(fill(text.confirmRemove[locale], { name: category.name }))) {
              run(() => deleteMaterialCategory(category.id));
            }
          }}
        >
          {text.remove[locale]}
        </Button>
      </td>
    </tr>
  );
};

const CategorySection: React.FC<{ categories: SetupCategory[]; locale: Locale }> = ({
  categories,
  locale,
}) => {
  const { run, pending, banner } = useSetupAction(locale);
  const [name, setName] = useState('');
  return (
    <section className="mb-10">
      <h2 className="mb-2 text-xl font-bold">{text.categories[locale]}</h2>
      {banner}
      <table className="w-full max-w-3xl border-collapse text-sm">
        <thead>
          <tr className="border-b border-[var(--theme-elevation-150)] text-left">
            <th className="py-2 pr-2 font-semibold">{text.name[locale]}</th>
            <th className="py-2 pr-2 font-semibold">{text.order[locale]}</th>
            <th className="py-2 pr-2 text-right font-semibold">{text.items[locale]}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {categories.map((category) => (
            <CategoryRow
              key={`${category.id}-${category.name}-${category.sortOrder}`}
              category={category}
              locale={locale}
              run={run}
              pending={pending}
            />
          ))}
        </tbody>
      </table>
      <div className="mt-3 flex max-w-3xl items-center gap-2">
        <input
          className={inputClass}
          aria-label={text.name[locale]}
          placeholder={text.name[locale]}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <Button
          size="small"
          disabled={pending || name.trim() === ''}
          onClick={() => {
            run(() => saveMaterialCategory({ name, sortOrder: categories.length }));
            setName('');
          }}
        >
          {text.add[locale]}
        </Button>
      </div>
    </section>
  );
};

interface DepartmentDraft {
  name: string;
  shortName: string;
  contactName: string;
  hitobitoGroupId: string;
}

const toDraft = (department?: SetupDepartment): DepartmentDraft => ({
  name: department?.name ?? '',
  shortName: department?.shortName ?? '',
  contactName: department?.contactName ?? '',
  hitobitoGroupId:
    department?.hitobitoGroupId === null || department?.hitobitoGroupId === undefined
      ? ''
      : String(department.hitobitoGroupId),
});

/* eslint-disable unicorn/no-null -- the actions take null to clear a column */
const fromDraft = (
  draft: DepartmentDraft,
): {
  name: string;
  shortName: string;
  contactName: string | null;
  hitobitoGroupId: number | null;
} => ({
  name: draft.name,
  shortName: draft.shortName,
  contactName: draft.contactName.trim() === '' ? null : draft.contactName,
  hitobitoGroupId: draft.hitobitoGroupId === '' ? null : Number(draft.hitobitoGroupId),
});
/* eslint-enable unicorn/no-null */

const DepartmentFields: React.FC<{
  draft: DepartmentDraft;
  onChange: (draft: DepartmentDraft) => void;
  locale: Locale;
}> = ({ draft, onChange, locale }) => (
  <>
    <td className="py-1 pr-2">
      <input
        className={inputClass}
        aria-label={text.name[locale]}
        placeholder={text.name[locale]}
        value={draft.name}
        onChange={(event) => onChange({ ...draft, name: event.target.value })}
      />
    </td>
    <td className="w-28 py-1 pr-2">
      <input
        className={inputClass}
        aria-label={text.shortName[locale]}
        placeholder={text.shortName[locale]}
        value={draft.shortName}
        onChange={(event) => onChange({ ...draft, shortName: event.target.value })}
      />
    </td>
    <td className="py-1 pr-2">
      <input
        className={inputClass}
        aria-label={text.contact[locale]}
        placeholder={text.contact[locale]}
        value={draft.contactName}
        onChange={(event) => onChange({ ...draft, contactName: event.target.value })}
      />
    </td>
    <td className="w-32 py-1 pr-2">
      <input
        className={inputClass}
        aria-label={text.groupId[locale]}
        placeholder={text.groupId[locale]}
        inputMode="numeric"
        value={draft.hitobitoGroupId}
        onChange={(event) =>
          onChange({ ...draft, hitobitoGroupId: event.target.value.replaceAll(/\D/g, '') })
        }
      />
    </td>
  </>
);

const DepartmentRow: React.FC<{
  department: SetupDepartment;
  locale: Locale;
  run: (action: () => Promise<SetupResult>) => void;
  pending: boolean;
}> = ({ department, locale, run, pending }) => {
  const [draft, setDraft] = useState(() => toDraft(department));
  return (
    <tr className="border-b border-[var(--theme-elevation-100)]">
      <DepartmentFields draft={draft} onChange={setDraft} locale={locale} />
      <td className="py-1 pr-2 text-right tabular-nums">{department.loanCount}</td>
      <td className="flex justify-end gap-2 py-1">
        <Button
          size="small"
          buttonStyle="secondary"
          disabled={pending}
          onClick={() =>
            run(() => saveMaterialDepartment({ id: department.id, ...fromDraft(draft) }))
          }
        >
          {text.save[locale]}
        </Button>
        <Button
          size="small"
          buttonStyle="error"
          disabled={pending || department.loanCount > 0}
          onClick={() => {
            if (globalThis.confirm(fill(text.confirmRemove[locale], { name: department.name }))) {
              run(() => deleteMaterialDepartment(department.id));
            }
          }}
        >
          {text.remove[locale]}
        </Button>
      </td>
    </tr>
  );
};

const DepartmentSection: React.FC<{ departments: SetupDepartment[]; locale: Locale }> = ({
  departments,
  locale,
}) => {
  const { run, pending, banner } = useSetupAction(locale);
  const [draft, setDraft] = useState(() => toDraft());
  return (
    <section className="mb-10">
      <h2 className="mb-1 text-xl font-bold">{text.departments[locale]}</h2>
      <p className="mb-2 text-sm opacity-70">{text.groupHint[locale]}</p>
      {banner}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--theme-elevation-150)] text-left">
              <th className="py-2 pr-2 font-semibold">{text.name[locale]}</th>
              <th className="py-2 pr-2 font-semibold">{text.shortName[locale]}</th>
              <th className="py-2 pr-2 font-semibold">{text.contact[locale]}</th>
              <th className="py-2 pr-2 font-semibold">{text.groupId[locale]}</th>
              <th className="py-2 pr-2 text-right font-semibold">{text.loans[locale]}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {departments.map((department) => (
              <DepartmentRow
                key={JSON.stringify(department)}
                department={department}
                locale={locale}
                run={run}
                pending={pending}
              />
            ))}
            <tr>
              <DepartmentFields draft={draft} onChange={setDraft} locale={locale} />
              <td />
              <td className="flex justify-end py-1">
                <Button
                  size="small"
                  disabled={pending || draft.name.trim() === '' || draft.shortName.trim() === ''}
                  onClick={() => {
                    run(() => saveMaterialDepartment(fromDraft(draft)));
                    setDraft(toDraft());
                  }}
                >
                  {text.add[locale]}
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
};

const CatalogueImport: React.FC<{ locale: Locale }> = ({ locale }) => {
  const { run, pending, banner } = useSetupAction(locale);
  const [rows, setRows] = useState('');
  return (
    <section className="mb-10 max-w-4xl">
      <h2 className="mb-1 text-xl font-bold">{text.catalogue[locale]}</h2>
      <p className="mb-2 text-sm opacity-70">{text.importHint[locale]}</p>
      {banner}
      <textarea
        className={`${inputClass} h-48 font-mono`}
        aria-label={text.catalogue[locale]}
        placeholder="JS-WOLL;Wolldecke;J+S-Material;300;80;Stück;nein;ja;…"
        value={rows}
        onChange={(event) => setRows(event.target.value)}
      />
      <Button
        disabled={pending || rows.trim() === ''}
        onClick={() => run(() => importMaterialCatalogue(rows))}
      >
        {text.runImport[locale]}
      </Button>
    </section>
  );
};

/** The editable parts of the depot setup page; the page itself is a server component. */
export const MaterialSetupForms: React.FC<{
  categories: SetupCategory[];
  departments: SetupDepartment[];
  locale: Locale;
}> = ({ categories, departments, locale }) => (
  <>
    <CategorySection categories={categories} locale={locale} />
    <DepartmentSection departments={departments} locale={locale} />
    <CatalogueImport locale={locale} />
  </>
);
