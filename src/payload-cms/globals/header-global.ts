import { GlobalConfig } from 'payload';
import { GlobalGroups } from '@/payload-cms/globals/global-groups';

export const HeaderGlobal: GlobalConfig = {
  slug: 'header',
  label: 'Header Navigation',
  fields: [],
  admin: {
    group: GlobalGroups.UniqueContent,
    description: 'Settings for the header navigation',
  },
};
