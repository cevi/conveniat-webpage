import type { Footer } from '@/features/payload-cms/payload-types';
import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';
import config from '@payload-config';
import Link from 'next/link';
import { getPayload } from 'payload';
import React from 'react';

type FooterMenuSection = NonNullable<Footer['footerMenu']>[number];
type FooterMenuItem = NonNullable<FooterMenuSection['menuItem']>[number];

const renderMenuItem = (menuItem: FooterMenuItem): React.JSX.Element => {
  if (menuItem.link === undefined || menuItem.link === null)
    return (
      <span
        key={menuItem.id}
        className="font-inter text-[14px] font-normal leading-[24px] text-green-600"
      >
        {menuItem.label}
      </span>
    );

  return (
    <Link href={menuItem.link} className="leading-[24px]">
      <span className="font-inter text-[14px] font-normal leading-[24px] text-green-600">
        {menuItem.label}
      </span>
    </Link>
  );
};

const renderMenuSection = (menu: FooterMenuSection): React.JSX.Element => {
  return (
    <div key={menu.id} className="flex flex-col items-center justify-center">
      <span className="font-heading text-[14px] font-extrabold text-green-600">
        {menu.menuSubTitle}
      </span>
      {menu.menuItem?.map((link) => renderMenuItem(link))}
    </div>
  );
};

export const FooterMenuArea: React.FC = async () => {
  const payload = await getPayload({ config });
  const locale = await getLocaleFromCookies();

  const { footerMenu } = await payload.findGlobal({ slug: 'footer', locale });
  if (footerMenu === undefined || footerMenu === null || footerMenu.length === 0) return;

  return (
    <div className="flex h-[260px] w-full flex-col items-center justify-center space-y-8 border-t-2 border-gray-200 bg-white">
      {footerMenu.map((menuSection) => (
        <React.Fragment key={menuSection.id}>
          {renderMenuSection(menuSection as unknown as FooterMenuSection)}
        </React.Fragment>
      ))}
    </div>
  );
};
