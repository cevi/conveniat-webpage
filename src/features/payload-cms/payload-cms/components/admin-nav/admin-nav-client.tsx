'use client';

import type { AdminNavGroup } from '@/features/payload-cms/payload-cms/components/admin-nav/admin-nav-groups';
import { Link, NavGroup } from '@payloadcms/ui';
import { usePathname } from 'next/navigation';
import type { NavPreferences } from 'payload';
import type React from 'react';

/**
 * The sidebar groups with their links, marked up like Payload's own nav so its styles, the
 * collapse state of a group and the marker on the open entry all carry over.
 */
export const AdminNavClient: React.FC<{
  groups: AdminNavGroup[];
  navPreferences: NavPreferences | undefined;
}> = ({ groups, navPreferences }) => {
  const pathname = usePathname();

  return (
    <>
      {groups.map(({ label: groupLabel, links }) => (
        <NavGroup
          key={groupLabel}
          label={groupLabel}
          {...(navPreferences?.groups[groupLabel] === undefined
            ? {}
            : { isOpen: navPreferences.groups[groupLabel].open })}
        >
          {links.map(({ id, href, label }) => {
            const isActive =
              pathname.startsWith(href) && ['/', undefined].includes(pathname[href.length]);
            const content = (
              <>
                {isActive && <div className="nav__link-indicator" />}
                <span className="nav__link-label">{label}</span>
              </>
            );

            // the open page is no link to itself
            if (pathname === href) {
              return (
                <div className="nav__link" id={id} key={id}>
                  {content}
                </div>
              );
            }
            return (
              <Link className="nav__link" href={href} id={id} key={id} prefetch={false}>
                {content}
              </Link>
            );
          })}
        </NavGroup>
      ))}
    </>
  );
};
