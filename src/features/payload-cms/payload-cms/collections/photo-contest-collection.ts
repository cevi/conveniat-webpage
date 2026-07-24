/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, unicorn/no-null, unicorn/prefer-ternary */
import { hasAdminOrWebAccess } from '@/features/payload-cms/payload-cms/access-rules/roles';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import { getValidationMessage } from '@/features/payload-cms/payload-cms/utils/validation-messages';
import prisma from '@/lib/db/prisma';
import type { CollectionConfig } from 'payload';

export const PhotoContestCollection: CollectionConfig = {
  slug: 'photo-contests',
  admin: {
    useAsTitle: 'title',
    group: AdminPanelDashboardGroups.AppContent,
    defaultColumns: ['title', 'slug', 'status', 'contestType', 'maxPointsPerUser'],
  },
  access: {
    read: (): boolean => true,
    create: hasAdminOrWebAccess,
    update: hasAdminOrWebAccess,
    delete: hasAdminOrWebAccess,
  },
  hooks: {
    afterChange: [
      async ({ doc, req }): Promise<void> => {
        try {
          const contest = await prisma.photoContest.upsert({
            where: { slug: doc.slug },
            update: {
              title: doc.title,
              description: doc.description ?? null,
              contestType: doc.contestType ?? 'PRESELECTED',
              status: doc.status ?? 'DRAFT',
              maxPointsPerUser: doc.maxPointsPerUser ?? 2,
              maxPointsPerImage: doc.maxPointsPerImage ?? 2,
            },
            create: {
              slug: doc.slug,
              title: doc.title,
              description: doc.description ?? null,
              contestType: doc.contestType ?? 'PRESELECTED',
              status: doc.status ?? 'DRAFT',
              maxPointsPerUser: doc.maxPointsPerUser ?? 2,
              maxPointsPerImage: doc.maxPointsPerImage ?? 2,
            },
          });

          if (Array.isArray(doc.images)) {
            const currentImages = await prisma.photoContestImage.findMany({
              where: { contestId: contest.id },
            });

            const resolvedItems: {
              imageUrl: string;
              title: string | null;
              description: string | null;
              order: number;
            }[] = [];

            let hasResolutionError = false;

            for (let index = 0; index < doc.images.length; index += 1) {
              const item = doc.images[index];
              let resolvedUrl: string | null = null;

              if (Boolean(item.image)) {
                if (typeof item.image === 'object' && item.image !== null) {
                  const mediaObject = item.image as {
                    url?: string;
                    sizes?: { large?: { url?: string } };
                  };
                  resolvedUrl = mediaObject.url ?? mediaObject.sizes?.large?.url ?? null;
                } else if (typeof item.image === 'string' || typeof item.image === 'number') {
                  try {
                    const mediaDocument = await req.payload.findByID({
                      collection: 'images',
                      id: item.image,
                    });
                    const mediaObject = mediaDocument as unknown as {
                      url?: string;
                      sizes?: { large?: { url?: string } };
                    };
                    resolvedUrl = mediaObject.url ?? mediaObject.sizes?.large?.url ?? null;
                  } catch (error) {
                    console.error('Could not fetch image from media library:', error);
                    hasResolutionError = true;
                  }
                }
              }

              if (
                resolvedUrl === null &&
                typeof item.imageUrl === 'string' &&
                item.imageUrl.trim() !== ''
              ) {
                resolvedUrl = item.imageUrl.trim();
              }

              if (typeof resolvedUrl === 'string' && resolvedUrl !== '') {
                resolvedItems.push({
                  imageUrl: resolvedUrl,
                  title: typeof item.title === 'string' ? item.title : null,
                  description: typeof item.description === 'string' ? item.description : null,
                  order: typeof item.order === 'number' ? item.order : index,
                });
              }
            }

            const validImageUrls = new Set(resolvedItems.map((img) => img.imageUrl));

            if (hasResolutionError) {
              console.warn(
                'Skipping deletion of missing photo contest images due to media library resolution errors.',
              );
            } else {
              for (const img of currentImages) {
                if (!validImageUrls.has(img.imageUrl)) {
                  await prisma.photoContestImage.delete({ where: { id: img.id } });
                }
              }
            }

            for (const item of resolvedItems) {
              const existingImage = currentImages.find((img) => img.imageUrl === item.imageUrl);
              if (existingImage) {
                await prisma.photoContestImage.update({
                  where: { id: existingImage.id },
                  data: {
                    title: item.title,
                    description: item.description,
                    order: item.order,
                  },
                });
              } else {
                await prisma.photoContestImage.create({
                  data: {
                    contestId: contest.id,
                    imageUrl: item.imageUrl,
                    title: item.title,
                    description: item.description,
                    order: item.order,
                  },
                });
              }
            }
          }
        } catch (error) {
          console.error('Failed to sync photo contest to database:', error);
        }
      },
    ],
    afterDelete: [
      async ({ doc }): Promise<void> => {
        try {
          if (typeof doc.slug === 'string' && doc.slug.length > 0) {
            await prisma.photoContest.delete({
              where: { slug: doc.slug },
            });
          }
        } catch (error) {
          console.error('Failed to delete photo contest from database:', error);
        }
      },
    ],
  },
  labels: {
    singular: {
      de: 'Foto-Wettbewerb',
      en: 'Photo Contest',
      fr: 'Concours Photo',
    },
    plural: {
      de: 'Foto-Wettbewerbe',
      en: 'Photo Contests',
      fr: 'Concours Photo',
    },
  },
  fields: [
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      label: {
        de: 'Slug (z.B. "cevi-schweiz")',
        en: 'Slug (e.g. "cevi-schweiz")',
        fr: 'Slug',
      },
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      label: {
        de: 'Titel',
        en: 'Title',
        fr: 'Titre',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      label: {
        de: 'Beschreibung',
        en: 'Description',
        fr: 'Description',
      },
    },
    {
      name: 'contestType',
      type: 'select',
      defaultValue: 'PRESELECTED',
      options: [
        { label: 'Preselected (Vorausgewählt)', value: 'PRESELECTED' },
        { label: 'Live Event (Vor Ort Uploads)', value: 'LIVE_EVENT' },
      ],
      label: {
        de: 'Wettbewerbs-Typ',
        en: 'Contest Type',
        fr: 'Type de concours',
      },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'DRAFT',
      options: [
        { label: 'Entwurf (Draft)', value: 'DRAFT' },
        { label: 'Live Uploads Aktiv (Uploading)', value: 'UPLOADING' },
        { label: 'Abstimmung Aktiv (Voting)', value: 'VOTING' },
        { label: 'Abgeschlossen (Closed)', value: 'CLOSED' },
      ],
      label: {
        de: 'Status',
        en: 'Status',
        fr: 'Statut',
      },
    },
    {
      name: 'maxPointsPerUser',
      type: 'number',
      defaultValue: 2,
      label: {
        de: 'Max. Punkte pro Benutzer',
        en: 'Max Points Per User',
        fr: 'Points max par utilisateur',
      },
    },
    {
      name: 'maxPointsPerImage',
      type: 'number',
      defaultValue: 2,
      label: {
        de: 'Max. Punkte pro Bild',
        en: 'Max Points Per Image',
        fr: 'Points max par image',
      },
    },
    {
      name: 'images',
      type: 'array',
      label: {
        de: 'Wettbewerbs-Bilder',
        en: 'Contest Images',
        fr: 'Images du concours',
      },
      validate: (value, { req }): string | true => {
        if (Array.isArray(value)) {
          for (const [index, itemRaw] of value.entries()) {
            const item = itemRaw as {
              image?: unknown;
              imageUrl?: unknown;
            };
            const hasImage = Boolean(item.image);
            const hasImageUrl = typeof item.imageUrl === 'string' && item.imageUrl.trim() !== '';

            if (!hasImage && !hasImageUrl) {
              return getValidationMessage(req.i18n.language, {
                en: `Image entry #${index + 1} requires at least one of 'Image from Media Library' or 'Image URL'.`,
                de: `Bildeintrag #${index + 1} benötigt mindestens ein 'Bild aus Mediathek' oder eine 'Bild URL'.`,
                fr: `L'entrée d'image #${index + 1} nécessite au moins une 'Image de la médiathèque' ou une 'URL d'image'.`,
              });
            }
          }
        }
        return true;
      },
      fields: [
        {
          name: 'image',
          type: 'relationship',
          relationTo: 'images',
          hasMany: false,
          label: {
            de: 'Bild aus Mediathek',
            en: 'Image from Media Library',
            fr: 'Image de la médiathèque',
          },
        },
        {
          name: 'imageUrl',
          type: 'text',
          required: false,
          label: {
            de: 'Bild URL (falls nicht aus Mediathek)',
            en: 'Image URL (if not from Media Library)',
            fr: "URL de l'image (si pas de la médiathèque)",
          },
        },
        {
          name: 'title',
          type: 'text',
          label: {
            de: 'Titel',
            en: 'Title',
            fr: 'Titre',
          },
        },
        {
          name: 'description',
          type: 'textarea',
          label: {
            de: 'Beschreibung',
            en: 'Description',
            fr: 'Description',
          },
        },
        {
          name: 'order',
          type: 'number',
          defaultValue: 0,
          label: {
            de: 'Sortierung',
            en: 'Order',
            fr: 'Ordre',
          },
        },
      ],
    },
  ],
};
