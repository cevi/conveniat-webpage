import {
  canWriteStory,
  getUserGroups,
  isEditor,
} from '@/features/payload-cms/payload-cms/access-rules/roles';
import { generateImageName } from '@/features/payload-cms/payload-cms/collections/image-collection';
import { isLeader } from '@/features/payload-cms/payload-cms/utils/is-leader';
import { storyAdminGroup } from '@/features/story/payload-cms/story-fields';
import type { Access, CollectionBeforeOperationHook, CollectionConfig } from 'payload';

/**
 * A picture is read, and its file served, to the editors always, and to Leitende once the figure
 * it shows is visible. `visibleFrom` is copied from the figures by `syncStoryImageVisibility`;
 * a picture no figure uses yet has none and stays hidden.
 */
export const readStoryImage: Access = async ({ req }) => {
  if (isEditor({ req })) return true;
  if (req.user === null) return false;
  const viewer = { uuid: String(req.user.id), group_ids: getUserGroups(req.user).map((g) => g.id) };
  if (!(await isLeader(req.payload, viewer))) return false;
  return { visibleFrom: { less_than_equal: new Date().toISOString() } };
};

/**
 * Names the stored file at random: the name an editor uploads, like `schattenhand.jpg`, would
 * tell the story before it happens to whoever lists the bucket or guesses a URL.
 */
const randomizeFilename: CollectionBeforeOperationHook = ({ args, operation, req }) => {
  if (operation !== 'create' && operation !== 'update') return args;
  const file = req.file;
  if (file === undefined) return args;
  const extension = file.name.includes('.') ? file.name.split('.').pop() : undefined;
  file.name = `story-${crypto.randomUUID()}${extension === undefined ? '' : `.${extension}`}`;
  return args;
};

/** The pictures of the story's figures, apart from the public images of the website. */
export const StoryImagesCollection: CollectionConfig = {
  slug: 'story-images',
  labels: {
    singular: { de: 'Story-Bild', en: 'Story picture', fr: 'Image de l’histoire' },
    plural: { de: 'Story-Bilder', en: 'Story pictures', fr: 'Images de l’histoire' },
  },
  admin: {
    group: storyAdminGroup,
    // the stored file name is random, see `randomizeFilename`; the description says who it shows
    useAsTitle: 'alt',
    defaultColumns: ['filename', 'alt', 'visibleFrom'],
  },
  access: {
    read: readStoryImage,
    update: isEditor,
    create: canWriteStory,
    delete: canWriteStory,
  },
  hooks: {
    beforeOperation: [randomizeFilename],
  },
  fields: [
    {
      name: 'alt',
      label: { de: 'Beschreibung', en: 'Description', fr: 'Description' },
      type: 'text',
      localized: true,
      // the picture's title in pickers and lists, where a missing one reads «Untitled»
      required: true,
      admin: {
        description: {
          de: 'Für Screenreader, z.B. «Der Champion in Rüstung».',
          en: 'For screen readers.',
          fr: 'Pour les lecteurs d’écran.',
        },
      },
    },
    {
      name: 'visibleFrom',
      label: { de: 'Sichtbar ab', en: 'Visible from', fr: 'Visible dès' },
      type: 'date',
      index: true,
      admin: {
        readOnly: true,
        date: { pickerAppearance: 'dayAndTime', displayFormat: 'EEE dd.MM.yyyy HH:mm' },
        description: {
          de: 'Wird von der Figur übernommen, die das Bild zeigt. Ohne Figur bleibt es verborgen.',
          en: 'Taken from the figure that shows the picture. Without one it stays hidden.',
          fr: 'Repris du personnage qui montre l’image. Sans personnage, elle reste cachée.',
        },
      },
    },
  ],
  upload: {
    mimeTypes: ['image/*'],
    adminThumbnail: 'tiny',
    disableLocalStorage: true,
    imageSizes: [
      {
        name: 'tiny',
        fit: 'cover',
        width: 140,
        height: 140,
        formatOptions: { format: 'webp' },
        withoutEnlargement: true,
        generateImageName,
      },
      {
        name: 'portrait',
        fit: 'cover',
        width: 720,
        height: 720,
        formatOptions: { format: 'webp' },
        withoutEnlargement: true,
        generateImageName,
      },
    ],
  },
};
