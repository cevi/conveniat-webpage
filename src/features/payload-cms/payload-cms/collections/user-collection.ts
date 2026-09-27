import { environmentVariables } from '@/config/environment-variables';
import {
  hasAccessToThisHelper,
  hasAdminOrWebAccess,
  Roles,
} from '@/features/payload-cms/payload-cms/access-rules/roles';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import { LastEditedByUserField } from '@/features/payload-cms/payload-cms/shared-fields/last-edited-by-user-field';
import {
  findFunktionIdsOfPerson,
  toFunktionIds,
} from '@/features/payload-cms/payload-cms/utils/funktionen';
import {
  findRegisteredHofIds,
  toHofIds,
} from '@/features/payload-cms/payload-cms/utils/hof-membership';
import type { User } from '@/features/payload-cms/payload-types';
import prisma from '@/lib/db/prisma';
import { getAuthenticateUsingCeviDB } from '@/utils/auth-helpers';
import { formatUserFullName } from '@/utils/format-user-name';
import type { CollectionConfig } from 'payload';

const GROUPS_WITH_API_ACCESS = new Set(environmentVariables.GROUPS_WITH_API_ACCESS);

const syncUserToPostgres: NonNullable<
  NonNullable<CollectionConfig['hooks']>['afterChange']
>[number] = async ({ doc, previousDoc, req }): Promise<void> => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const uuid = doc.id as string | undefined | null;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const fullName = doc.fullName as string | undefined;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const nickname = doc.nickname as string | undefined | null;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const hidden = doc.hidden as boolean | undefined | null;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const description = doc.description as string | undefined | null;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const presentAtCamp = (doc.presentAtCamp as boolean | undefined | null) ?? false;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const hofIds = toHofIds(doc.hoefe);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const funktionIds = toFunktionIds(doc.funktionen);

  if (uuid === undefined || uuid === null || uuid === '') {
    throw new Error('UUID is required to update the user in the database.');
  }

  const name = formatUserFullName(fullName, nickname);

  try {
    /**
     * Postgres is the source of truth for the presence state: the presence slider, the dashboard
     * widget and the density plot all read it from there. Editing the checkbox in the admin panel
     * only writes to Payload, so without mirroring it here the two stores drift apart and the
     * dashboard keeps reporting users that were already checked out in the admin panel.
     */
    const knownUser = await prisma.user.findUnique({
      where: { uuid },
      select: { presentAtCamp: true },
    });

    await prisma.user.upsert({
      where: { uuid },
      update: {
        name: name,
        // eslint-disable-next-line unicorn/no-null
        description: description ?? null,
        hidden: hidden ?? false,
        hofIds,
        funktionIds,
      },
      create: {
        uuid: uuid,
        name: name,
        // eslint-disable-next-line unicorn/no-null
        description: description ?? null,
        hidden: hidden ?? false,
        hofIds,
        funktionIds,
        presentAtCamp: presentAtCamp,
        // set date to 1970-01-01 to avoid null values
        lastSeen: new Date('1970-01-01T00:00:00Z'),
      },
    });

    // The presence mutation writes Postgres before it writes Payload, so a difference here only
    // ever originates from the admin panel — the slider never produces a duplicate entry.
    // Only a write that changed the flag is a check-in or check-out from the admin panel. Other
    // writes, like the background refreshes of the Höfe and functions, carry the Mongo value
    // along and would otherwise undo a presence mutation that has reached Postgres but not yet
    // Payload, logging a transition nobody made.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const previousPresent = (previousDoc?.presentAtCamp as boolean | undefined | null) ?? false;
    const writeChangedPresence = previousDoc === undefined || previousPresent !== presentAtCamp;
    if (writeChangedPresence && knownUser !== null && knownUser.presentAtCamp !== presentAtCamp) {
      const timestamp = new Date();

      /**
       * The flag is written last, and together with its log entry: the density plot and the
       * evaluation are built from the logs, so a flag that is stored without its entry would
       * corrupt them permanently — the next save would compare against the already updated flag
       * and never log the transition again. This way a failed write leaves the old flag in place
       * and the next save retries the whole transition.
       */
      const payloadLog = await req.payload.create({
        collection: 'presence-logs',
        data: {
          user: uuid,
          isPresent: presentAtCamp,
          timestamp: timestamp.toISOString(),
        },
      });

      try {
        await prisma.$transaction([
          prisma.user.update({ where: { uuid }, data: { presentAtCamp: presentAtCamp } }),
          prisma.presenceLog.create({
            data: { userUuid: uuid, isPresent: presentAtCamp, timestamp },
          }),
        ]);
      } catch (error) {
        try {
          await req.payload.delete({ collection: 'presence-logs', id: payloadLog.id });
        } catch (revertError: unknown) {
          req.payload.logger.error(
            { error: revertError, 'user.id': uuid },
            'Failed to revert the Payload presence log while syncing a user to postgres',
          );
        }
        throw error;
      }
    }
  } catch (error) {
    req.payload.logger.error({ error }, 'Non-fatal error while syncing a user to postgres');
  }
};

/**
 * Looks up the Höfe and the functions of a person the moment the user learns their Cevi.DB
 * id, on the first login or when a manually created user is linked. Later changes come from
 * the registrations, the Höfe and the functions sync, which refresh the users they touch.
 */
const fillCampDataOfNewPerson: NonNullable<
  NonNullable<CollectionConfig['hooks']>['beforeChange']
>[number] = async ({ data, originalDoc, req }): Promise<Partial<User>> => {
  const next = data as Partial<User>;
  const ceviId = next.cevi_db_uuid;
  if (typeof ceviId !== 'number') return next;
  if ((originalDoc as Partial<User> | undefined)?.cevi_db_uuid === ceviId) return next;
  try {
    const [hoefe, funktionen] = await Promise.all([
      findRegisteredHofIds(req.payload, ceviId, req),
      findFunktionIdsOfPerson(req.payload, ceviId, req),
    ]);
    return { ...next, hoefe, funktionen };
  } catch (error: unknown) {
    // Never fail a login over this: the next start and the next functions sync fill it in.
    req.payload.logger.error(
      { err: error },
      'Could not look up the Höfe and functions of a new user; the login goes on without them',
    );
    return next;
  }
};

export const UserCollection: CollectionConfig = {
  slug: 'users',
  trash: true,
  labels: {
    singular: {
      en: 'User',
      de: 'Benutzer',
      fr: 'Utilisateur',
    },
    plural: {
      en: 'Users',
      de: 'Benutzer',
      fr: 'Utilisateurs',
    },
  },

  hooks: {
    beforeChange: [fillCampDataOfNewPerson],
    afterChange: [syncUserToPostgres],
  },

  access: {
    // All roles must be able to log into the admin dashboard; the material team for the
    // depot setup, every collection still denies it
    admin: hasAccessToThisHelper({
      requiredRoles: [
        Roles.FullAdmin,
        Roles.WebCoreTeam,
        Roles.ProgramTeam,
        Roles.TranslationTeam,
        Roles.MaterialTeam,
      ],
    }),
    read: hasAdminOrWebAccess,
    create: () => false,
    delete: () => false,
    update: hasAdminOrWebAccess,
  },
  /**
   * What a user becomes when another document populates it. The local API skips access checks,
   * so without this every `depth >= 1` read of an `organiser`, `authors` or `lastEditedByUser`
   * field carried the whole user, email, Cevi.DB id and groups included, into props and tRPC
   * responses that reach the browser, for anonymous visitors too. Code that needs more of a
   * user should read it from `users` directly, not through a relationship.
   */
  defaultPopulate: {
    fullName: true,
    nickname: true,
  },
  admin: {
    description:
      'Represents a user. Data gets automatically synced from Cevi.DB whenever the user logs in. Users can also be created manually or imported via CSV.',
    useAsTitle: 'displayName',
    group: AdminPanelDashboardGroups.BackofficePeople.label,
    groupBy: true,
    /** this is broken with our localized versions */
    disableCopyToLocale: true,
    defaultColumns: ['nickname', 'fullName', 'email', 'presentAtCamp', 'adminPanelAccess'],
    listSearchableFields: ['nickname', 'fullName', 'email'],
  },
  auth: {
    disableLocalStrategy: true,
    loginWithUsername: false,
    strategies: [
      {
        name: 'CeviDB',
        authenticate: getAuthenticateUsingCeviDB,
      },
    ],
  },
  fields: [
    {
      name: 'displayName',
      type: 'text',
      admin: {
        hidden: true,
      },
      hooks: {
        beforeChange: [
          ({ data, siblingData }): string => {
            const rawData = siblingData as Record<string, unknown> | undefined;
            const fallbackData = data as Record<string, unknown> | undefined;
            const userData = rawData ?? fallbackData ?? {};
            const email = typeof userData['email'] === 'string' ? userData['email'] : undefined;
            const fullName =
              typeof userData['fullName'] === 'string' ? userData['fullName'] : undefined;
            const nickname =
              typeof userData['nickname'] === 'string' ? userData['nickname'] : undefined;

            const nameString = formatUserFullName(fullName, nickname);
            if (typeof email === 'string' && email !== '') {
              return nameString === '' ? email : `${nameString} (${email})`;
            }
            return nameString === '' ? 'Unnamed User' : nameString;
          },
        ],
        afterRead: [
          async ({ value, data, req }): Promise<string> => {
            if (typeof value === 'string' && value !== '') {
              return value;
            }
            if (!data) return 'Unnamed User';

            const user = data as Record<string, unknown>;
            const email = typeof user['email'] === 'string' ? user['email'] : undefined;
            const fullName = typeof user['fullName'] === 'string' ? user['fullName'] : undefined;
            const nickname = typeof user['nickname'] === 'string' ? user['nickname'] : undefined;

            if ('email' in user || 'fullName' in user || 'nickname' in user) {
              const nameString = formatUserFullName(fullName, nickname);
              if (typeof email === 'string' && email !== '') {
                return nameString === '' ? email : `${nameString} (${email})`;
              }
              if (nameString !== '') return nameString;
            }

            const id = user['id'];
            if (typeof id === 'string' && id !== '') {
              try {
                const fullUser = await req.payload.findByID({
                  collection: 'users',
                  id: id,
                  depth: 0,
                });
                const dbEmail = fullUser.email as string | undefined;
                const dbFullName = fullUser.fullName as string | undefined;
                const dbNickname = fullUser.nickname as string | undefined;
                const nameString = formatUserFullName(dbFullName, dbNickname);
                if (typeof dbEmail === 'string' && dbEmail !== '') {
                  return nameString === '' ? dbEmail : `${nameString} (${dbEmail})`;
                }
                if (nameString !== '') return nameString;
              } catch {
                // Fall back if user not found or db error
              }
              return `User ${id}`;
            }

            return 'Unnamed User';
          },
        ],
      },
    },
    {
      name: 'cevi_db_uuid',
      label: 'UserID inside Cevi.DB',
      type: 'number',
      required: false,
      access: {
        update: () => false,
      },
      admin: {
        readOnly: true,
        description:
          'The ID of the user in Cevi.DB. Set automatically when the user logs in via Cevi.DB. Leave empty for manually created users.',
      },
      unique: true,
    },
    {
      name: 'adminPanelAccess',
      label: 'Admin Panel Access',
      type: 'checkbox',
      virtual: true,
      defaultValue: false,
      admin: {
        readOnly: true,
        description:
          'Whether the user has access to the admin panel. This is set automatically based on the user groups.',
      },
      hooks: {
        afterRead: [
          ({ data }): boolean => {
            if (!data) return false;
            const groups = (data as User).groups;
            if (!Array.isArray(groups)) return false;
            return groups.some((group) => GROUPS_WITH_API_ACCESS.has(group.id));
          },
        ],
      },
    },
    {
      name: 'email',
      label: 'Email',
      type: 'email',
      required: true,
      access: {
        update: () => false,
      },
      admin: {
        readOnly: true,
        description:
          'The email address of the user. Used for matching when the user logs in via Cevi.DB.',
      },
      unique: true,
    },
    {
      name: 'fullName',
      label: 'Full Name',
      type: 'text',
      required: true,
      access: {
        update: () => false,
      },
      admin: {
        readOnly: true,
        description: 'The full name of the user, as it will be displayed publicly.',
      },
    },
    {
      name: 'nickname',
      label: 'Ceviname',
      type: 'text',
      required: false,
      access: {
        update: () => false,
      },
      admin: {
        readOnly: true,
        description: 'The Ceviname of the user.',
      },
    },
    {
      name: 'groups',
      label: 'Groups of the User',
      type: 'json',
      required: false,
      defaultValue: [],
      access: {
        update: () => false,
      },
      admin: {
        readOnly: true,
        description: 'The groups the user is in. Updated automatically from Cevi.DB on login.',
      },
      jsonSchema: {
        schema: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: {
                type: 'integer',
                title: 'The ID of the group',
                description: 'The ID of the group as used in Cevi.DB.',
              },
              name: {
                title: 'The name of the group',
                description: 'The name of the group as used in Cevi.DB.',
                type: 'string',
              },
              role_name: {
                title: 'The name of the role',
                description: 'The name of the role the user has in the group.',
                type: 'string',
              },
              role_class: {
                title: 'The class of the role',
                description: 'The class of the role the user has in the group.',
                type: 'string',
              },
            },
            required: ['id', 'name', 'role_class', 'role_name'],
          },
          title: 'Groups of the User',
          description: 'The groups the user is in as extracted from the Cevi.DB profile.',
        },
        // the following are random but unique identifiers for the schema
        uri: 'https://conveniat27.ch/hitobito-groups.schema.json',
        fileMatch: ['https://conveniat27.ch/hitobito-groups.schema.json'],
      },
    },
    {
      name: 'hoefe',
      type: 'relationship',
      relationTo: 'hoefe',
      hasMany: true,
      label: { en: 'Höfe', de: 'Höfe', fr: 'Hofs' },
      access: {
        update: () => false,
      },
      admin: {
        readOnly: true,
        description: {
          en: 'The Höfe this user is registered at, from the registrations synced from Cevi.DB. Kept up to date automatically; the Quartier follows from the Hof.',
          de: 'Die Höfe, an denen diese Person angemeldet ist, aus den von der Cevi.DB abgeglichenen Anmeldungen. Wird automatisch nachgeführt; das Quartier ergibt sich aus dem Hof.',
          fr: "Les Hofs auxquels cette personne est inscrite, d'après les inscriptions synchronisées depuis Cevi.DB. Mis à jour automatiquement ; le quartier découle du Hof.",
        },
      },
    },
    {
      name: 'funktionen',
      type: 'relationship',
      relationTo: 'funktionen',
      hasMany: true,
      label: { en: 'Functions', de: 'Funktionen', fr: 'Fonctions' },
      access: {
        update: () => false,
      },
      admin: {
        readOnly: true,
        description: {
          en: 'The functions this user holds in the camp organisation, synced from their leader roles in Cevi.DB.',
          de: 'Die Funktionen dieser Person in der Lagerorganisation, aus ihren Leitungsrollen in der Cevi.DB abgeglichen.',
          fr: "Les fonctions de cette personne dans l'organisation du camp, synchronisées à partir de ses rôles de responsable dans Cevi.DB.",
        },
      },
    },
    {
      name: 'description',
      label: 'Description',
      type: 'text',
      required: false,
      admin: {
        description: 'An additional description of the user shown in the chat.',
      },
    },
    {
      name: 'hidden',
      label: {
        en: 'Hidden from Chat Selection',
        de: 'Aus Chat-Auswahl ausblenden',
        fr: 'Masquer de la sélection de chat',
      },
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Hide this user from the chat creation selection.',
      },
    },
    {
      name: 'presentAtCamp',
      label: {
        en: 'Present at Campsite',
        de: 'Auf dem Lagerplatz anwesend',
        fr: 'Présent sur le terrain de camp',
      },
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Whether the user is currently present on the campsite.',
      },
    },
    {
      name: 'presenceLogs',
      type: 'join',
      collection: 'presence-logs',
      on: 'user',
      admin: {
        description: 'Verlauf der Anwesenheit auf dem Lagerplatz (Check-in / Check-out).',
      },
    },
    LastEditedByUserField,
  ],
};
