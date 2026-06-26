import { trpc } from '@/trpc/client';
import React, { useEffect, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';

interface AddMemberModalProperties {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  locale: string;
}

const translations = {
  de: {
    title: 'Mitglied hinzufügen',
    searchPlaceholder: 'Nach Name, Ceviname oder E-Mail suchen...',
    hofLabel: 'Hof (Filter)',
    quartierLabel: 'Quartier (Filter)',
    roleLabel: 'Cevi-Rolle (Filter)',
    allRoles: 'Alle Rollen',
    fullAdmin: 'Full Admin',
    webCoreTeam: 'Web Core Team',
    translationTeam: 'Translation Team',
    programTeam: 'Program Team',
    noResults: 'Keine Benutzer gefunden.',
    addSuccess: 'Mitglied erfolgreich hinzugefügt!',
    addBtn: 'Hinzufügen',
    addingBtn: 'Wird hinzugefügt...',
    cancelBtn: 'Abbrechen',
    fullName: 'Name',
    nickname: 'Ceviname',
    email: 'E-Mail',
    hof: 'Hof',
    quartier: 'Quartier',
    action: 'Aktion',
  },
  en: {
    title: 'Add Member',
    searchPlaceholder: 'Search by name, nickname, or email...',
    hofLabel: 'Hof (Filter)',
    quartierLabel: 'Quartier (Filter)',
    roleLabel: 'Cevi Role (Filter)',
    allRoles: 'All Roles',
    fullAdmin: 'Full Admin',
    webCoreTeam: 'Web Core Team',
    translationTeam: 'Translation Team',
    programTeam: 'Program Team',
    noResults: 'No users found.',
    addSuccess: 'Member successfully added!',
    addBtn: 'Add',
    addingBtn: 'Adding...',
    cancelBtn: 'Cancel',
    fullName: 'Name',
    nickname: 'Nickname',
    email: 'Email',
    hof: 'Hof',
    quartier: 'Quartier',
    action: 'Action',
  },
} as const;

export const AddMemberModal: React.FC<AddMemberModalProperties> = ({
  isOpen,
  onClose,
  chatId,
  locale,
}) => {
  const isDe = locale === 'de';
  const t = isDe ? translations.de : translations.en;

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [hof, setHof] = useState<string>('');
  const [quartier, setQuartier] = useState<string>('');
  const [role, setRole] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [, startTransition] = useTransition();

  // Debounce search input
  useEffect((): (() => void) => {
    const timer = setTimeout((): void => {
      startTransition((): void => {
        setDebouncedSearch(search);
      });
    }, 300);
    return (): void => clearTimeout(timer);
  }, [search, startTransition]);

  const parsedHof = hof === '' ? undefined : Number.parseInt(hof, 10);
  const parsedQuartier = quartier === '' ? undefined : Number.parseInt(quartier, 10);

  // Query users from tRPC
  const { data: users = [], isLoading } = trpc.admin.searchUsers.useQuery(
    {
      search: debouncedSearch === '' ? undefined : debouncedSearch,
      hof: Number.isNaN(parsedHof) ? undefined : parsedHof,
      quartier: Number.isNaN(parsedQuartier) ? undefined : parsedQuartier,
      role: role === '' ? undefined : role,
    },
    {
      enabled: isOpen,
    },
  );

  const trpcUtils = trpc.useUtils();
  const addMutation = trpc.admin.addMemberToChat.useMutation({
    onSuccess: async (): Promise<void> => {
      setSuccessMessage(t.addSuccess);
      setErrorMessage(undefined);
      // Invalidate both chat list and current chat messages to trigger refetching
      await trpcUtils.admin.getChatList.invalidate();
      await trpcUtils.admin.getChatMessages.invalidate({ chatId });
      setTimeout((): void => {
        setSuccessMessage(undefined);
      }, 3000);
    },
    onError: (error): void => {
      setErrorMessage(error.message);
      setSuccessMessage(undefined);
    },
  });

  const handleAdd = (userId: string): void => {
    addMutation.mutate({ chatId, userId });
  };

  if (isOpen === false) return <></>;

  let resultsContent: React.ReactNode;
  if (isLoading) {
    resultsContent = (
      <div className="flex h-full items-center justify-center py-10">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-(--theme-success-500) border-t-transparent" />
      </div>
    );
  } else if (users.length === 0) {
    resultsContent = (
      <div className="flex h-full items-center justify-center py-10 text-(--theme-elevation-400)">
        {t.noResults}
      </div>
    );
  } else {
    resultsContent = (
      <table className="w-full border-collapse text-left text-sm text-(--theme-elevation-900)">
        <thead className="sticky top-0 border-b border-(--theme-border-color) bg-(--theme-elevation-100)">
          <tr>
            <th className="px-4 py-3 font-semibold">{t.fullName}</th>
            <th className="px-4 py-3 font-semibold">{t.nickname}</th>
            <th className="px-4 py-3 font-semibold">{t.email}</th>
            <th className="px-4 py-3 text-center font-semibold">{t.hof}</th>
            <th className="px-4 py-3 text-center font-semibold">{t.quartier}</th>
            <th className="px-4 py-3 text-right font-semibold">{t.action}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-(--theme-border-color)">
          {users.map((item) => {
            const isMutatingThisUser =
              addMutation.isPending && addMutation.variables.userId === item.id;
            const nickname = item.nickname as string | null;
            return (
              <tr key={item.id} className="transition-colors hover:bg-(--theme-elevation-50)">
                <td className="px-4 py-3 font-medium whitespace-nowrap">
                  <div>
                    <div>{item.fullName}</div>
                    {item.description && (
                      <div className="text-xs font-normal text-(--theme-elevation-400)">
                        {item.description}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {nickname === null || nickname === '' ? (
                    <span className="text-(--theme-elevation-300)">—</span>
                  ) : (
                    nickname
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">{item.email}</td>
                <td className="px-4 py-3 text-center">
                  {item.hof ?? <span className="text-(--theme-elevation-300)">—</span>}
                </td>
                <td className="px-4 py-3 text-center">
                  {item.quartier ?? <span className="text-(--theme-elevation-300)">—</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={(): void => handleAdd(item.id)}
                    disabled={addMutation.isPending}
                    className="inline-flex min-w-[85px] cursor-pointer items-center justify-center gap-1.5 rounded bg-(--theme-success-500) px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-(--theme-success-600) focus:outline-none disabled:opacity-50"
                  >
                    {isMutatingThisUser ? (
                      <>
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>{t.addingBtn}</span>
                      </>
                    ) : (
                      t.addBtn
                    )}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  }

  const modalContent = (
    <div className="fixed inset-0 z-900 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]">
      <div className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-(--theme-border-color) bg-(--theme-elevation-0) p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-4 flex shrink-0 items-center justify-between border-b border-(--theme-border-color) pb-4">
          <h3 className="text-xl font-semibold text-(--theme-elevation-900)">{t.title}</h3>
          <button
            onClick={onClose}
            className="cursor-pointer text-xl font-bold text-(--theme-elevation-400) transition-colors hover:text-(--theme-elevation-600)"
          >
            ✕
          </button>
        </div>

        {/* Success/Error Alerts */}
        {successMessage !== undefined && (
          <div className="mb-4 shrink-0 rounded-md border border-(--theme-success-200) bg-(--theme-success-50) p-3 text-sm text-(--theme-success-700)">
            {successMessage}
          </div>
        )}
        {errorMessage !== undefined && (
          <div className="mb-4 shrink-0 rounded-md border border-(--theme-error-200) bg-(--theme-error-50) p-3 text-sm text-(--theme-error-700)">
            {errorMessage}
          </div>
        )}

        {/* Filters */}
        <div className="mb-4 grid shrink-0 grid-cols-1 gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <input
              type="text"
              value={search}
              onChange={(event): void => setSearch(event.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full rounded border border-(--theme-border-color) bg-(--theme-elevation-50) px-3 py-2 text-sm text-(--theme-elevation-900) placeholder-(--theme-elevation-400) focus:ring-1 focus:ring-(--theme-success-500) focus:outline-none"
            />
          </div>
          <div>
            <input
              type="number"
              value={hof}
              onChange={(event): void => setHof(event.target.value)}
              placeholder={t.hofLabel}
              className="w-full rounded border border-(--theme-border-color) bg-(--theme-elevation-50) px-3 py-2 text-sm text-(--theme-elevation-900) placeholder-(--theme-elevation-400) focus:ring-1 focus:ring-(--theme-success-500) focus:outline-none"
            />
          </div>
          <div>
            <input
              type="number"
              value={quartier}
              onChange={(event): void => setQuartier(event.target.value)}
              placeholder={t.quartierLabel}
              className="w-full rounded border border-(--theme-border-color) bg-(--theme-elevation-50) px-3 py-2 text-sm text-(--theme-elevation-900) placeholder-(--theme-elevation-400) focus:ring-1 focus:ring-(--theme-success-500) focus:outline-none"
            />
          </div>
        </div>

        <div className="mb-4 grid shrink-0 grid-cols-1 gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <select
              value={role}
              onChange={(event): void => setRole(event.target.value)}
              className="w-full cursor-pointer rounded border border-(--theme-border-color) bg-(--theme-elevation-50) px-3 py-2 text-sm text-(--theme-elevation-900) focus:ring-1 focus:ring-(--theme-success-500) focus:outline-none"
            >
              <option value="">{t.allRoles}</option>
              <option value="full-admin">{t.fullAdmin}</option>
              <option value="web-core-team">{t.webCoreTeam}</option>
              <option value="translation-team">{t.translationTeam}</option>
              <option value="program-team">{t.programTeam}</option>
            </select>
          </div>
        </div>

        {/* Results Area */}
        <div className="min-h-[200px] flex-1 overflow-y-auto rounded border border-(--theme-border-color)">
          {resultsContent}
        </div>

        {/* Footer */}
        <div className="mt-4 flex shrink-0 justify-end border-t border-(--theme-border-color) pt-4">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded border border-(--theme-border-color) bg-(--theme-elevation-50) px-4 py-2 text-sm font-medium text-(--theme-elevation-800) hover:bg-(--theme-elevation-100) focus:outline-none"
          >
            {t.cancelBtn}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return modalContent;
  return createPortal(modalContent, document.body);
};
