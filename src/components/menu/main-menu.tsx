import { SafeErrorBoundary } from '@/components/error-boundary/safe-error-boundary';
import { FooterBuildInfoText } from '@/components/footer/footer-copyright-area';
import { MainMenuLanguageSwitcher } from '@/components/menu/main-menu-language-switcher';
import { MenuEntryLabel, MenuLinks, visibleChildren } from '@/components/menu/menu-links';
import { PreviewMenuSwitcher } from '@/components/menu/preview-menu-switcher';
import { SearchComponent } from '@/components/menu/search';
import { NativeAppVersionInfo } from '@/components/native-app-version-info';
import { LinkComponent } from '@/components/ui/link-component';
import { getHeaderCached } from '@/features/payload-cms/api/cached-globals';
import type { LinkFieldDataType } from '@/features/payload-cms/payload-cms/shared-fields/link-field';
import {
  getURLForLinkField,
  hasPermissionsForLinkField,
  openURLInNewTab,
} from '@/features/payload-cms/payload-cms/utils/link-field-logic';
import type { Header } from '@/features/payload-cms/payload-types';
import { specialPagesTable } from '@/features/payload-cms/special-pages-table';
import type { Locale, StaticTranslationString } from '@/types/types';
import { getBuildInfo } from '@/utils/get-build-info';
import { isAdminSession } from '@/utils/is-admin-session';
import { isRoutableURL } from '@/utils/is-routable-url';
import { cn } from '@/utils/tailwindcss-override';
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import { ChevronDown } from 'lucide-react';
import { cacheLife, cacheTag } from 'next/cache';
import React from 'react';

import { AppFeatures } from '@/components/menu/app-features';

/**
 * The main menu, cached across requests — for the draft view as well as the published one.
 *
 * Both variants stay cached. A header read is expensive (`queryHeader` populates every
 * `linkField.reference` in a four-level menu, ~33 Mongo round-trips, ~170ms), and `MainMenu`
 * renders on every page, so making the admin view uncached would put that on every page load for
 * editors. Freshness comes from invalidation instead.
 *
 * The tags are what makes that work, and the previous `cacheTag('header')` was the bug: nothing in
 * this repo ever calls `revalidateTag('header')`. The published variant survived that mistake by
 * accident — a nested `'use cache'` propagates its tags outwards
 * (`propagateCacheLifeAndTagsToRevalidateStore` in Next's `use-cache-wrapper.js` unions the inner
 * entry's tags into the outer one), so it inherited `payload` / `global:header` from `readHeader`.
 * The draft variant has no inner cached call to inherit from — `getHeaderCached` short-circuits
 * straight to `queryHeader` for drafts — so it carried only the dead tag and went stale for a full
 * `cacheLife('hours')`. That is what pinned admin previews to hour-old drafts.
 *
 * Declaring the real tags here fixes the draft variant and makes the published one explicit rather
 * than dependent on propagation. `flushPageCacheOnChangeGlobal` fires both on every save of the
 * header global, and Payload runs global `afterChange` hooks unconditionally — the draft/autosave
 * path is not excluded (`payload/dist/globals/operations/update.js`) — so an editor's keystroke
 * evicts this entry and the next render rebuilds it.
 */
export const getMainMenuFromPayloadCached = async (
  locale: Locale,
  showPreviewForMainMenu: boolean,
): Promise<NonNullable<Header['mainMenu']>> => {
  'use cache';
  cacheLife('hours');
  cacheTag('payload', 'header', 'global:header');

  const header = await getHeaderCached(locale, showPreviewForMainMenu);
  const mainMenu = header.mainMenu;
  return Array.isArray(mainMenu) ? mainMenu : [];
};

const webContentTitle: StaticTranslationString = {
  en: 'Web Content',
  de: 'Web Inhalte',
  fr: 'Contenu Web',
};

const isLinkConfigured = (linkFieldData?: LinkFieldDataType): boolean => {
  if (!linkFieldData) return false;
  const { type } = linkFieldData;
  if (type === 'custom') {
    // Not merely "the editor typed something": an unfinished URL is no more a
    // destination than an empty one, so the entry renders as a plain label
    // rather than a link to nowhere.
    // See https://github.com/cevi/conveniat-webpage/issues/1670
    return typeof linkFieldData.url === 'string' && isRoutableURL(linkFieldData.url);
  }
  if (type === 'email') {
    return typeof linkFieldData.email === 'string' && linkFieldData.email.trim() !== '';
  }
  if (type === 'reference') {
    return linkFieldData.reference?.value !== undefined;
  }
  return false;
};

export interface ProcessedSubSubSubMenuItem {
  id: string;
  label: string;
  hasLink: boolean;
  hasPerm: boolean;
  isVisible: boolean;
  itemLink?: string | undefined;
  openInNewTab: boolean;
}

export interface ProcessedSubSubMenuItem {
  id: string;
  label: string;
  hasLink: boolean;
  hasPerm: boolean;
  isVisible: boolean;
  itemLink?: string | undefined;
  openInNewTab: boolean;
  subMenu?: ProcessedSubSubSubMenuItem[] | undefined;
}

export interface ProcessedSubMenuItem {
  id: string;
  label: string;
  hasLink: boolean;
  hasPerm: boolean;
  isVisible: boolean;
  itemLink?: string | undefined;
  openInNewTab: boolean;
  subMenu?: ProcessedSubSubMenuItem[] | undefined;
}

export interface ProcessedMainMenuItem {
  id: string;
  label: string;
  hasLink: boolean;
  hasPerm: boolean;
  isVisible: boolean;
  itemLink?: string | undefined;
  openInNewTab: boolean;
  /** shown in the header bar on large screens as well as in the menu */
  isPinned: boolean;
  subMenu?: ProcessedSubMenuItem[] | undefined;
}

/**
 * Resolves the raw header menu into what the menus render: the URL, whether there is a
 * link at all, and whether the current user may see it.
 *
 * The items go to the client `DesktopNav` as props, so they carry the resolved result
 * and never the raw `linkField`, whose `reference.value` is the populated document the
 * link points to.
 */
export const processMenuTree = async (
  rawMenu: Header['mainMenu'],
  locale: Locale,
  showPreview: boolean,
): Promise<ProcessedMainMenuItem[]> => {
  if (!rawMenu) return [];

  const processedItems: ProcessedMainMenuItem[] = [];

  for (const item of rawMenu) {
    const itemLinkField = item.linkField as LinkFieldDataType | undefined;
    const hasLink = isLinkConfigured(itemLinkField);
    const hasPerm = hasLink ? await hasPermissionsForLinkField(itemLinkField) : true;
    const itemLink = getURLForLinkField(itemLinkField, locale);
    const openInNewTab = openURLInNewTab(itemLinkField);

    const subMenuItems: ProcessedSubMenuItem[] = [];
    if (item.subMenu && item.subMenu.length > 0) {
      for (const subItem of item.subMenu) {
        const subLinkField = subItem.linkField as LinkFieldDataType | undefined;
        const subHasLink = isLinkConfigured(subLinkField);
        const subHasPerm = subHasLink ? await hasPermissionsForLinkField(subLinkField) : true;
        const subItemLink = getURLForLinkField(subLinkField, locale);
        const subOpenInNewTab = openURLInNewTab(subLinkField);

        const subSubMenuItems: ProcessedSubSubMenuItem[] = [];
        if (subItem.subMenu && subItem.subMenu.length > 0) {
          for (const subSubItem of subItem.subMenu) {
            const subSubLinkField = subSubItem.linkField as LinkFieldDataType | undefined;
            const subSubHasLink = isLinkConfigured(subSubLinkField);
            const subSubHasPerm = subSubHasLink
              ? await hasPermissionsForLinkField(subSubLinkField)
              : true;
            const subSubItemLink = getURLForLinkField(subSubLinkField, locale);
            const subSubOpenInNewTab = openURLInNewTab(subSubLinkField);

            const subSubSubMenuItems: ProcessedSubSubSubMenuItem[] = [];
            if (subSubItem.subMenu && subSubItem.subMenu.length > 0) {
              for (const subSubSubItem of subSubItem.subMenu) {
                const subSubSubLinkField = subSubSubItem.linkField as LinkFieldDataType | undefined;
                const subSubSubHasLink = isLinkConfigured(subSubSubLinkField);
                const subSubSubHasPerm = subSubSubHasLink
                  ? await hasPermissionsForLinkField(subSubSubLinkField)
                  : true;
                const subSubSubItemLink = getURLForLinkField(subSubSubLinkField, locale);
                const subSubSubOpenInNewTab = openURLInNewTab(subSubSubLinkField);

                const subSubSubIsVisible = subSubSubHasLink ? subSubSubHasPerm : true;

                subSubSubMenuItems.push({
                  id: subSubSubItem.id || Math.random().toString(),
                  label: subSubSubItem.label,
                  hasLink: subSubSubHasLink,
                  hasPerm: subSubSubHasPerm,
                  isVisible: subSubSubIsVisible,
                  itemLink: subSubSubItemLink,
                  openInNewTab: subSubSubOpenInNewTab,
                });
              }
            }

            const hasVisibleSubSubSubItems = subSubSubMenuItems.some(
              (s) => s.isVisible || showPreview,
            );
            const hasSubSubSub = subSubSubMenuItems.length > 0;

            let subSubIsVisible = false;
            if (subSubHasLink) {
              subSubIsVisible = subSubHasPerm;
            } else if (hasSubSubSub) {
              subSubIsVisible = hasVisibleSubSubSubItems;
            } else {
              subSubIsVisible = true;
            }

            subSubMenuItems.push({
              id: subSubItem.id || Math.random().toString(),
              label: subSubItem.label,
              hasLink: subSubHasLink,
              hasPerm: subSubHasPerm,
              isVisible: subSubIsVisible,
              itemLink: subSubItemLink,
              openInNewTab: subSubOpenInNewTab,
              subMenu: subSubSubMenuItems,
            });
          }
        }

        const hasVisibleSubSubItems = subSubMenuItems.some((s) => s.isVisible || showPreview);
        const hasSubSub = subSubMenuItems.length > 0;

        let subIsVisible = false;
        if (subHasLink) {
          subIsVisible = subHasPerm;
        } else if (hasSubSub) {
          subIsVisible = hasVisibleSubSubItems;
        } else {
          subIsVisible = true;
        }

        subMenuItems.push({
          id: subItem.id || Math.random().toString(),
          label: subItem.label,
          hasLink: subHasLink,
          hasPerm: subHasPerm,
          isVisible: subIsVisible,
          itemLink: subItemLink,
          openInNewTab: subOpenInNewTab,
          subMenu: subSubMenuItems,
        });
      }
    }

    const hasVisibleSubItems = subMenuItems.some((s) => s.isVisible || showPreview);
    const hasSub = subMenuItems.length > 0;

    let isVisible = false;
    if (hasLink) {
      isVisible = hasPerm;
    } else if (hasSub) {
      isVisible = hasVisibleSubItems;
    } else {
      isVisible = true;
    }

    processedItems.push({
      id: item.id || Math.random().toString(),
      label: item.label,
      hasLink,
      hasPerm: hasPerm,
      isVisible: isVisible,
      itemLink: itemLink,
      openInNewTab: openInNewTab,
      isPinned: item.pinnedToHeader === true,
      subMenu: subMenuItems,
    });
  }

  return processedItems;
};

const MenuItemsList = async ({
  locale,
  mainMenuWithFallback,
  showPreviewForMainMenu,
}: {
  locale: Locale;
  mainMenuWithFallback: NonNullable<Header['mainMenu']>;
  showPreviewForMainMenu: boolean;
}): Promise<React.ReactNode> => {
  const processedMenu = await processMenuTree(mainMenuWithFallback, locale, showPreviewForMainMenu);
  const topLevelClassName =
    'flex min-h-12 flex-1 items-center py-2 pl-3 text-base font-semibold text-gray-700';

  return (
    <>
      {showPreviewForMainMenu && (
        <div className="closeNavOnClick block cursor-pointer rounded-lg bg-orange-500 py-2 pr-3 pl-6 text-sm/7 font-semibold text-white">
          Preview Menu
        </div>
      )}
      <ul className="divide-line -mx-3 divide-y">
        {processedMenu
          .filter((item) => item.isVisible || showPreviewForMainMenu)
          .map((item) => {
            const children = visibleChildren(item, showPreviewForMainMenu);

            if (children.length === 0) {
              return (
                <li key={item.id} className="flex">
                  <MenuEntryLabel
                    node={item}
                    className={cn(topLevelClassName, 'rounded-lg', item.hasLink && 'hover:bg-tint')}
                  />
                </li>
              );
            }

            // One level folds, the rest of the column shows at once: a fold per level made the
            // third and fourth level three taps away on a phone.
            return (
              <li key={item.id}>
                <SafeErrorBoundary fallback={<></>}>
                  <Disclosure>
                    <div className="flex items-center">
                      {item.hasLink ? (
                        <MenuEntryLabel
                          node={item}
                          className={cn(topLevelClassName, 'hover:bg-tint rounded-lg')}
                        />
                      ) : (
                        <DisclosureButton
                          className={cn(topLevelClassName, 'cursor-pointer text-left')}
                        >
                          {item.label}
                        </DisclosureButton>
                      )}
                      <DisclosureButton
                        aria-label={item.label}
                        className="group hover:bg-tint hover:text-heading flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-gray-500"
                      >
                        <ChevronDown
                          aria-hidden="true"
                          className="size-5 transition-transform group-data-open:rotate-180"
                        />
                      </DisclosureButton>
                    </div>
                    <DisclosurePanel className="pb-3 pl-1">
                      <MenuLinks nodes={children} showPreview={showPreviewForMainMenu} />
                    </DisclosurePanel>
                  </Disclosure>
                </SafeErrorBoundary>
              </li>
            );
          })}
      </ul>
    </>
  );
};

export const MainMenu: React.FC<{
  locale: Locale;
  inAppDesign: boolean;
}> = async ({ locale, inAppDesign }) => {
  const build = await getBuildInfo(locale);
  const actionURL = specialPagesTable['search']?.alternatives[locale] ?? '/suche';

  // Start the published-menu read before the session read, not after it. This is not a latency
  // win — both are sequential awaits either way — it is about which one gets *initiated*. A
  // prerender's cache-warming pass stops at `cacheSignal.cacheReady()`, which waits for cache
  // reads that are in flight but not for ones that have not started yet. Behind
  // `await isAdminSession()` this read could still be unstarted at that point and so never warm;
  // in front of it, it is always in flight. It needs no session data, so nothing is lost.
  const publishedMenu = await getMainMenuFromPayloadCached(locale, false);

  // if the user is logged in as admin, we fetch both preview and published menus
  const isAdmin = !inAppDesign && (await isAdminSession());

  let draftMenu = publishedMenu;
  if (isAdmin) {
    draftMenu = await getMainMenuFromPayloadCached(locale, true);
  }

  return (
    <div
      className={cn(
        'mt-8 flex h-[calc(100%-100px)] w-full flex-col justify-between divide-gray-100 overflow-x-hidden overflow-y-auto px-4 xl:px-8',
        { 'pb-16': inAppDesign },
      )}
    >
      <div>
        <span className="text-conveniat-green hidden w-full font-['Montserrat'] text-[24px] leading-normal font-extrabold xl:block">
          <LinkComponent key="home" href="/">
            conveniat27
          </LinkComponent>
        </span>

        {inAppDesign && <AppFeatures locale={locale} />}

        <div className="py-6">
          {inAppDesign && (
            <h3 className="text-conveniat-green mb-2 font-bold">{webContentTitle[locale]}</h3>
          )}

          {isAdmin ? (
            <PreviewMenuSwitcher
              publishedMenu={
                <MenuItemsList
                  locale={locale}
                  mainMenuWithFallback={publishedMenu}
                  showPreviewForMainMenu={false}
                />
              }
              draftMenu={
                <MenuItemsList
                  locale={locale}
                  mainMenuWithFallback={draftMenu}
                  showPreviewForMainMenu
                />
              }
            />
          ) : (
            <MenuItemsList
              locale={locale}
              mainMenuWithFallback={publishedMenu}
              showPreviewForMainMenu={false}
            />
          )}
        </div>
      </div>

      <hr className="border-t-2 bg-gray-100 xl:hidden" />

      <div className="divide-y-2 divide-gray-100 pb-4">
        <MainMenuLanguageSwitcher locale={locale} />
        <SearchComponent locale={locale} actionURL={actionURL} />

        {inAppDesign && build && (
          <div className="flex flex-col py-6 text-center">
            <FooterBuildInfoText>
              Version {build.version}
              <NativeAppVersionInfo />
            </FooterBuildInfoText>
            <FooterBuildInfoText>
              Build {build.git.hash} vom {build.timestamp}
            </FooterBuildInfoText>
          </div>
        )}
      </div>
    </div>
  );
};
