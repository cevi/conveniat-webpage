import type { Block } from 'payload';

export const fileDownloadBlock: Block = {
  slug: 'fileDownload',
  imageURL: '/admin-block-images/file-download-block.png',
  imageAltText: 'File Download Block',
  fields: [
    {
      name: 'file',
      label: 'File',
      type: 'relationship',
      relationTo: 'documents',
      required: true,
    },
    {
      name: 'openInNewTab',
      label: 'Open in new tab',
      type: 'checkbox',
      defaultValue: false,
    },
  ],
};
