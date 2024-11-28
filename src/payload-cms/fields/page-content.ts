import { BlocksField } from 'payload';
import { subheadingH2 } from '@/payload-cms/blocks/subheading-h2-block';
import { paragraph } from '@/payload-cms/blocks/paragraph-block';
import { formBlock } from '@/payload-cms/blocks/form-block';

export const pageContent: BlocksField = {
  name: 'pageContent',
  label: 'Page Content',
  type: 'blocks',
  admin: {
    description: 'The content of the landing page',
  },
  blocks: [subheadingH2, paragraph, formBlock],
};
