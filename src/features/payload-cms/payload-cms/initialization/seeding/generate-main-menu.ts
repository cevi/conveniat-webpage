import type { LinkFieldDataType } from '@/features/payload-cms/payload-cms/shared-fields/link-field';
import { fakerDE as faker } from '@faker-js/faker';

export const generateMainMenu = (
  count: number = 3,
  blogIds: string[] = [],
): {
  label: string;
  linkField?: LinkFieldDataType;
  subMenu: { label: string; linkField: LinkFieldDataType }[];
}[] => {
  const menuItems = [];
  for (let index = 0; index < count; index++) {
    const hasSubMenu = faker.datatype.boolean();
    const menuItem = {
      label: faker.lorem.words(faker.number.int({ min: 1, max: 3 })),
      linkField: hasSubMenu
        ? {}
        : ({
            type: 'reference',
            reference: {
              relationTo: 'blog',
              value: blogIds[faker.number.int({ min: 0, max: blogIds.length - 1 })],
            },
            value: '',
            openInNewTab: false,
          } as LinkFieldDataType),
      subMenu: hasSubMenu
        ? Array.from({ length: faker.number.int({ min: 1, max: 2 }) }).map(() => ({
            label: faker.lorem.words(faker.number.int({ min: 1, max: 3 })),
            linkField: {
              type: 'reference',
              reference: {
                relationTo: 'blog',
                value: blogIds[faker.number.int({ min: 0, max: blogIds.length - 1 })],
              },
              value: '',
              openInNewTab: false,
            } as LinkFieldDataType,
          }))
        : [],
    };
    menuItems.push(menuItem);
  }
  return menuItems;
};
