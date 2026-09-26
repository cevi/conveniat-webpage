'use client';

import {
  deleteMaterialCategory,
  importMaterialCatalogue,
  saveMaterialCategory,
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

const text = {
  categories: { de: 'Kategorien', en: 'Categories', fr: 'Catégories' },
  catalogue: { de: 'Katalog importieren', en: 'Import catalogue', fr: 'Importer le catalogue' },
  name: { de: 'Name', en: 'Name', fr: 'Nom' },
  order: { de: 'Reihenfolge', en: 'Order', fr: 'Ordre' },
  items: { de: 'Artikel', en: 'Items', fr: 'Articles' },
  add: { de: 'Hinzufügen', en: 'Add', fr: 'Ajouter' },
  save: { de: 'Speichern', en: 'Save', fr: 'Enregistrer' },
  remove: { de: 'Löschen', en: 'Delete', fr: 'Supprimer' },
  confirmRemove: {
    de: '«{name}» wirklich löschen?',
    en: 'Really delete “{name}”?',
    fr: 'Vraiment supprimer « {name} » ?',
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
  locale: Locale;
}> = ({ categories, locale }) => (
  <>
    <CategorySection categories={categories} locale={locale} />
    <CatalogueImport locale={locale} />
  </>
);
