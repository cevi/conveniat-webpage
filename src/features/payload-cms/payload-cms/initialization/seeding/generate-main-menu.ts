import { fakerDE as faker } from '@faker-js/faker';

export const generateMainMenu = (
  count: number = 3,
): {
  label: string;
  link: string;
  isExternal: boolean;
  subMenu: { label: string; link: string; isExternal: boolean }[];
}[] => {
  const menuItems = [];
  for (let index = 0; index < count; index++) {
    const hasSubMenu = faker.datatype.boolean();
    const menuItem = {
      label: faker.lorem.words(faker.number.int({ min: 1, max: 3 })),
      link: hasSubMenu ? '' : `/${faker.lorem.slug()}`,
      isExternal: false,
      subMenu: hasSubMenu
        ? Array.from({ length: faker.number.int({ min: 1, max: 2 }) }).map(() => ({
            label: faker.lorem.words(faker.number.int({ min: 1, max: 3 })),
            link: `/${faker.lorem.slug()}`,
            isExternal: false,
          }))
        : [],
    };
    menuItems.push(menuItem);
  }
  return menuItems;
};
