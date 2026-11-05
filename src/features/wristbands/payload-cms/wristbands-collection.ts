import { environmentVariables } from '@/config/environment-variables';
import {
  hasAdminOrWebAccess,
  isFullAdmin,
  shouldHideInAdminPanel,
} from '@/features/payload-cms/payload-cms/access-rules/roles';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import { LastEditedByUserField } from '@/features/payload-cms/payload-cms/shared-fields/last-edited-by-user-field';
import { getValidationMessage } from '@/features/payload-cms/payload-cms/utils/validation-messages';
import type {
  CollectionConfig,
  RelationshipFieldSingleValidation,
  TextFieldSingleValidation,
  Where,
} from 'payload';

/** A 7-byte NTAG21x UID, as the native bridge reports it: 14 uppercase hex characters. */
const UID_PATTERN = /^[0-9A-F]{14}$/;

/** Most reassignments a band keeps in its history. */
const MAX_VERSIONS = 50;

const normalizeUid = ({ value }: { value?: unknown }): unknown =>
  typeof value === 'string' ? value.replaceAll(/[\s:]/g, '').toUpperCase() : value;

/** Replaces Payload's text validation, so it rejects an empty value itself. */
const validateUid: TextFieldSingleValidation = (value, { req }) => {
  if (typeof value === 'string' && UID_PATTERN.test(value)) return true;
  return getValidationMessage(req.i18n.language, {
    en: 'A UID is 14 hex characters, e.g. 04A1B2C3D4E5F6.',
    de: 'Eine UID besteht aus 14 Hex-Zeichen, z.B. 04A1B2C3D4E5F6.',
    fr: 'Un UID comporte 14 caractères hexadécimaux, par ex. 04A1B2C3D4E5F6.',
  });
};

/**
 * A person wears one band at a time, or a read could name two bands for the same person and
 * the offline list would disagree with the server. A lost band is blocked before its
 * replacement is handed out.
 */
const validateOneActiveBandPerPerson: RelationshipFieldSingleValidation = async (
  value,
  { req, id, siblingData },
) => {
  if (value === null || value === undefined || value === '') return true;
  if ((siblingData as { status?: string }).status === 'revoked') return true;

  const where: Where = {
    and: [
      { participant: { equals: value } },
      { status: { equals: 'active' } },
      ...(id === undefined ? [] : [{ id: { not_equals: id } }]),
    ],
  };
  const { totalDocs } = await req.payload.count({
    collection: 'wristbands',
    where,
    overrideAccess: true,
    req,
  });
  if (totalDocs === 0) return true;
  return getValidationMessage(req.i18n.language, {
    en: 'This person already wears an active band. Block the old band first.',
    de: 'Diese Person trägt schon ein aktives Band. Sperre zuerst das alte Band.',
    fr: "Cette personne porte déjà un bracelet actif. Bloque d'abord l'ancien bracelet.",
  });
};

/**
 * The NFC wristbands of the camp. One entry per band, keyed by the UID the chip came with from
 * the factory, which the tag also mirrors into its URL (`/tag/{uid}`). The AVP of a Hof creates
 * the entry when programming a band in the app, and links it to one of the Hof's registrations
 * when handing it out. Who wears a band is decided here alone, so a band is reassigned or
 * blocked without touching the chip; the versions keep who wore it before.
 *
 * The app reaches the entries only through tRPC; the admin panel is where admin and web fix
 * what went wrong on the campsite.
 */
export const WristbandsCollection: CollectionConfig = {
  slug: 'wristbands',
  labels: {
    singular: { en: 'Wristband', de: 'Armband', fr: 'Bracelet' },
    plural: { en: 'Wristbands', de: 'Armbänder', fr: 'Bracelets' },
  },
  admin: {
    useAsTitle: 'uid',
    group: AdminPanelDashboardGroups.BackofficeHoefeAndMaterial.label,
    hidden: ({ user }): boolean =>
      !environmentVariables.FEATURE_ENABLE_NFC_WRISTBANDS || shouldHideInAdminPanel({ user }),
    defaultColumns: ['uid', 'participant', 'hof', 'status', 'updatedAt'],
    listSearchableFields: ['uid'],
    description: {
      en: 'The NFC wristbands, one entry per band. The AVP programs a band in the app and links it to a person of their Hof; here a band is reassigned or blocked without touching the chip. Deleting a band, which only full admins may, resets it: it is unknown again and any Hof programs it anew.',
      de: 'Die NFC-Armbänder, ein Eintrag pro Band. Die AVP programmiert ein Band in der App und verknüpft es mit einer Person ihres Hofs; hier wird ein Band neu vergeben oder gesperrt, ohne den Chip anzufassen. Ein Band löschen, was nur Full Admins dürfen, setzt es zurück: Es ist wieder unbekannt und jeder Hof programmiert es neu.',
      fr: "Les bracelets NFC, une entrée par bracelet. L'AVP programme un bracelet dans l'app et le lie à une personne de son Hof ; ici, un bracelet est réattribué ou bloqué sans toucher à la puce. Supprimer un bracelet, ce que seuls les full admins peuvent faire, le réinitialise : il est de nouveau inconnu et n'importe quel Hof le reprogramme.",
    },
  },
  versions: { maxPerDoc: MAX_VERSIONS },
  access: {
    // Who wears which band is personal data about children. The app goes through tRPC, which
    // checks the AVP and the safety team itself; in the admin panel only admin and web.
    read: hasAdminOrWebAccess,
    create: hasAdminOrWebAccess,
    update: hasAdminOrWebAccess,
    // a deleted band is unknown again, as it came from the factory, and any Hof programs it
    // anew; that undoes a block too, so only the full admins do it
    delete: isFullAdmin,
  },
  fields: [
    {
      name: 'uid',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      label: { en: 'UID', de: 'UID', fr: 'UID' },
      hooks: { beforeValidate: [normalizeUid] },
      validate: validateUid,
      admin: {
        description: {
          en: 'Serial number of the chip, 14 hex characters, as the app shows it when reading the band. Set by the factory, it cannot change.',
          de: 'Seriennummer des Chips, 14 Hex-Zeichen, wie die App sie beim Lesen des Bands anzeigt. Ab Werk gesetzt und unveränderlich.',
          fr: "Numéro de série de la puce, 14 caractères hexadécimaux, tel que l'app l'affiche en lisant le bracelet. Fixé en usine, il ne change pas.",
        },
      },
    },
    {
      name: 'hof',
      type: 'relationship',
      relationTo: 'hoefe',
      required: true,
      index: true,
      label: { en: 'Hof', de: 'Hof', fr: 'Hof' },
      admin: {
        description: {
          en: 'The Hof that programmed the band. Its AVP may hand it out and reassign it.',
          de: 'Der Hof, der das Band programmiert hat. Seine AVP darf es vergeben und neu vergeben.',
          fr: "Le Hof qui a programmé le bracelet. Son AVP peut l'attribuer et le réattribuer.",
        },
      },
    },
    {
      name: 'participant',
      type: 'relationship',
      relationTo: 'bill-participants',
      index: true,
      label: { en: 'Worn by', de: 'Getragen von', fr: 'Porté par' },
      validate: validateOneActiveBandPerPerson,
      admin: {
        description: {
          en: 'The registration of the person wearing the band. Empty while the band is programmed but not handed out.',
          de: 'Die Anmeldung der Person, die das Band trägt. Leer, solange das Band programmiert, aber nicht vergeben ist.',
          fr: "L'inscription de la personne qui porte le bracelet. Vide tant que le bracelet est programmé mais pas attribué.",
        },
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      index: true,
      label: { en: 'Status', de: 'Status', fr: 'Statut' },
      options: [
        { value: 'active', label: { en: 'Active', de: 'Aktiv', fr: 'Actif' } },
        { value: 'revoked', label: { en: 'Blocked', de: 'Gesperrt', fr: 'Bloqué' } },
      ],
      admin: {
        position: 'sidebar',
        description: {
          en: 'Block a lost or stolen band. Reading a blocked band names nobody.',
          de: 'Ein verlorenes oder gestohlenes Band sperren. Ein gesperrtes Band nennt beim Lesen niemanden.',
          fr: 'Bloquer un bracelet perdu ou volé. Un bracelet bloqué ne nomme personne à la lecture.',
        },
      },
    },
    {
      name: 'note',
      type: 'textarea',
      label: { en: 'Note', de: 'Notiz', fr: 'Note' },
      admin: {
        description: {
          en: 'Why the band was blocked or reassigned, e.g. "lost at the lake on Tuesday".',
          de: 'Warum das Band gesperrt oder neu vergeben wurde, z.B. "am Dienstag am Badesee verloren".',
          fr: 'Pourquoi le bracelet a été bloqué ou réattribué, par ex. « perdu au lac mardi ».',
        },
      },
    },
    {
      name: 'programmedBy',
      type: 'relationship',
      relationTo: 'users',
      label: { en: 'Programmed by', de: 'Programmiert von', fr: 'Programmé par' },
      access: { update: () => false },
      admin: { readOnly: true, position: 'sidebar' },
    },
    LastEditedByUserField,
  ],
};
