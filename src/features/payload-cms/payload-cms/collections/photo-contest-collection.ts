/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, unicorn/no-null, unicorn/prefer-ternary */
import { hasAdminOrWebAccess } from '@/features/payload-cms/payload-cms/access-rules/roles';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
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
      async ({ doc }): Promise<void> => {
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
            // Delete images not present in payload doc
            const currentImages = await prisma.photoContestImage.findMany({
              where: { contestId: contest.id },
            });
            const validImageUrls = new Set(
              doc.images.map((img: { imageUrl: string }) => img.imageUrl),
            );

            for (const img of currentImages) {
              if (!validImageUrls.has(img.imageUrl)) {
                await prisma.photoContestImage.delete({ where: { id: img.id } });
              }
            }

            // Sync images from payload doc
            for (let index = 0; index < doc.images.length; index += 1) {
              const item = doc.images[index];
              const existingImage = currentImages.find((img) => img.imageUrl === item.imageUrl);
              if (existingImage) {
                await prisma.photoContestImage.update({
                  where: { id: existingImage.id },
                  data: {
                    title: item.title ?? null,
                    description: item.description ?? null,
                    order: item.order ?? index,
                  },
                });
              } else {
                await prisma.photoContestImage.create({
                  data: {
                    contestId: contest.id,
                    imageUrl: item.imageUrl,
                    title: item.title ?? null,
                    description: item.description ?? null,
                    order: item.order ?? index,
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
      fields: [
        {
          name: 'imageUrl',
          type: 'text',
          required: true,
          label: {
            de: 'Bild URL',
            en: 'Image URL',
            fr: "URL de l'image",
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
