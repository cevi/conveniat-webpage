import { canAccessAdminPanel } from '@/features/payload-cms/payload-cms/access-rules/can-access-admin-panel';
import {
  hasAdminOrWebAccess,
  isFullAdmin,
} from '@/features/payload-cms/payload-cms/access-rules/roles';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import { DEFAULT_QUEUE } from '@/features/payload-cms/payload-cms/tasks/cleanup-stale-jobs';
import { refreshUserFunktionen } from '@/features/payload-cms/payload-cms/utils/funktionen';
import type { CollectionAfterDeleteHook, CollectionConfig, PayloadHandler } from 'payload';
import { countRunnableOrActiveJobsForQueue } from 'payload';

/**
 * Everything but the label and the order comes from Cevi.DB through the sync, which writes
 * over the local API: in the admin panel it can be read, not changed.
 */
const syncedFromCeviDatabase = { create: (): boolean => false, update: (): boolean => false };

/**
 * Queues a sync now instead of waiting for the night, unless one is already queued or
 * running: each walks the whole Cevi.DB tree, and two at once would race on the same groups.
 */
const queueSyncHandler: PayloadHandler = async (request) => {
  if (!hasAdminOrWebAccess({ req: request })) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  const pending = await countRunnableOrActiveJobsForQueue({
    queue: DEFAULT_QUEUE,
    req: request,
    taskSlug: 'syncFunktionen',
    onlyScheduled: false,
  });
  const { logger } = request.payload;
  if (pending > 0) {
    logger.debug('A camp functions sync is already queued or running, not queuing another');
    return Response.json({ queued: false }, { status: 200 });
  }
  try {
    await request.payload.jobs.queue({ task: 'syncFunktionen', input: {}, queue: DEFAULT_QUEUE });
  } catch (error: unknown) {
    logger.error(
      { err: error },
      'Could not queue a camp functions sync started from the admin panel',
    );
    return Response.json({ error: 'Could not queue the sync' }, { status: 500 });
  }
  logger.info(
    { 'user.id': request.user?.id },
    'Queued a camp functions sync started from the admin panel',
  );
  return Response.json({ queued: true }, { status: 202 });
};

/** A deleted function leaves the users that held it; the next sync brings it back if needed. */
const refreshUsersOfDeletedFunktion: CollectionAfterDeleteHook = async ({ doc, req }) => {
  try {
    await refreshUserFunktionen(req.payload, req);
  } catch (error: unknown) {
    req.payload.logger.error(
      { err: error, 'funktion.id': (doc as { id?: string }).id },
      'Could not refresh the functions of the users after a function was deleted',
    );
  }
  return doc as unknown;
};

/**
 * The functions people hold in the camp organisation, e.g. "Ressortleitung Infrastruktur".
 *
 * One document per Cevi.DB group below the configured root group that has a leader. The
 * nightly sync keeps the groups and their leaders; the editors give each function its label
 * in all three languages and its place in the order.
 */
export const FunktionenCollection: CollectionConfig = {
  slug: 'funktionen',
  typescript: { interface: 'Funktion' },
  labels: {
    singular: { en: 'Function', de: 'Funktion', fr: 'Fonction' },
    plural: { en: 'Functions', de: 'Funktionen', fr: 'Fonctions' },
  },
  admin: {
    useAsTitle: 'label',
    group: AdminPanelDashboardGroups.BackofficePeople.label,
    defaultColumns: ['label', 'groupName', 'order', 'holders'],
    description: {
      en: 'Functions in the camp organisation, synced every night from the leaders of the Cevi.DB groups. Set the label and the order here; who holds a function is changed in Cevi.DB.',
      de: 'Funktionen in der Lagerorganisation, jede Nacht aus den Leitungen der Cevi.DB-Gruppen abgeglichen. Bezeichnung und Reihenfolge werden hier gesetzt; wer eine Funktion innehat, wird in der Cevi.DB geändert.',
      fr: "Fonctions dans l'organisation du camp, synchronisées chaque nuit à partir des responsables des groupes Cevi.DB. Le libellé et l'ordre se définissent ici ; qui occupe une fonction se modifie dans Cevi.DB.",
    },
    components: {
      beforeListTable: [
        '@/features/payload-cms/payload-cms/components/funktionen-sync-button#FunktionenSyncButton',
      ],
    },
  },
  defaultSort: 'order',
  endpoints: [{ path: '/sync', method: 'post', handler: queueSyncHandler }],
  hooks: { afterDelete: [refreshUsersOfDeletedFunktion] },
  access: {
    // the labels reach every participant through the chat, which reads them server-side;
    // the collection itself is for the editors
    read: canAccessAdminPanel,
    // only the sync creates a function
    create: (): boolean => false,
    update: hasAdminOrWebAccess,
    // the sync removes a function whose group lost its leaders; by hand only the admins
    delete: isFullAdmin,
  },
  fields: [
    {
      name: 'label',
      type: 'text',
      localized: true,
      label: { en: 'Label', de: 'Bezeichnung', fr: 'Libellé' },
      admin: {
        description: {
          en: 'Shown next to the person in the chat, e.g. "Ressortleitung Infrastruktur". Suggested in German by the sync; falls back to German where a language has none.',
          de: 'Wird im Chat neben der Person angezeigt, z.B. "Ressortleitung Infrastruktur". Vom Abgleich auf Deutsch vorgeschlagen; fehlt eine Sprache, wird Deutsch angezeigt.',
          fr: "Affiché à côté de la personne dans le chat, par ex. « Ressortleitung Infrastruktur ». Proposé en allemand par la synchronisation ; si une langue manque, l'allemand est affiché.",
        },
      },
    },
    {
      name: 'order',
      type: 'number',
      defaultValue: 100,
      label: { en: 'Order', de: 'Reihenfolge', fr: 'Ordre' },
      admin: {
        position: 'sidebar',
        description: {
          en: 'Lower comes first, e.g. the Projektleitung before the Ressortleitungen.',
          de: 'Kleiner kommt zuerst, z.B. die Projektleitung vor den Ressortleitungen.',
          fr: 'Plus petit vient en premier, par ex. la Projektleitung avant les Ressortleitungen.',
        },
      },
    },
    {
      name: 'groupName',
      type: 'text',
      label: { en: 'Cevi.DB group', de: 'Cevi.DB-Gruppe', fr: 'Groupe Cevi.DB' },
      access: syncedFromCeviDatabase,
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'groupId',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      label: { en: 'Cevi.DB group ID', de: 'Cevi.DB-Gruppen-ID', fr: 'ID du groupe Cevi.DB' },
      access: syncedFromCeviDatabase,
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'personIds',
      type: 'text',
      hasMany: true,
      index: true,
      label: {
        en: 'Leaders (Cevi.DB person IDs)',
        de: 'Leitung (Cevi.DB-Personen-IDs)',
        fr: 'Responsables (ID de personnes Cevi.DB)',
      },
      access: syncedFromCeviDatabase,
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: {
          en: 'Everyone with the leader role in the group, including people who have not logged in yet.',
          de: 'Alle mit der Leitungsrolle in der Gruppe, auch wer sich noch nie angemeldet hat.',
          fr: 'Toutes les personnes ayant le rôle de responsable dans le groupe, y compris celles qui ne se sont pas encore connectées.',
        },
      },
    },
    {
      name: 'holders',
      type: 'join',
      collection: 'users',
      on: 'funktionen',
      label: { en: 'Held by', de: 'Inhaber/-innen', fr: 'Occupée par' },
      admin: { defaultColumns: ['fullName', 'nickname'] },
    },
  ],
};
