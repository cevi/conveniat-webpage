import { SafeErrorBoundary } from '@/components/error-boundary/safe-error-boundary';
import { FooterBuildInfoText } from '@/components/footer/footer-copyright-area';
import { MainMenuLanguageSwitcher } from '@/components/menu/main-menu-language-switcher';
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
import { ChevronDown, OctagonAlert } from 'lucide-react';
import { cacheLife, cacheTag } from 'next/cache';
import React from 'react';

import { AppFeatures } from '@/components/menu/app-features';

const DeletedMenuEntry: React.FC<{ message: string; className?: string }> = ({
  message,
  className,
}) => {
  return (
    <>
      <div
        className={cn(
          'closeNavOnClick flex cursor-pointer items-center gap-2 rounded-lg py-2 pr-3 text-sm/7 font-semibold text-gray-500 hover:bg-gray-50',
          className,
        )}
      >
        {message} <OctagonAlert className="size-4" color="red" />
      </div>
    </>
  );
};

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
  linkField?: LinkFieldDataType | undefined;
  hasPerm: boolean;
  isVisible: boolean;
  itemLink?: string | undefined;
  openInNewTab: boolean;
}

export interface ProcessedSubSubMenuItem {
  id: string;
  label: string;
  linkField?: LinkFieldDataType | undefined;
  hasPerm: boolean;
  isVisible: boolean;
  itemLink?: string | undefined;
  openInNewTab: boolean;
  subMenu?: ProcessedSubSubSubMenuItem[] | undefined;
}

export interface ProcessedSubMenuItem {
  id: string;
  label: string;
  linkField?: LinkFieldDataType | undefined;
  hasPerm: boolean;
  isVisible: boolean;
  itemLink?: string | undefined;
  openInNewTab: boolean;
  subMenu?: ProcessedSubSubMenuItem[] | undefined;
}

export interface ProcessedMainMenuItem {
  id: string;
  label: string;
  linkField?: LinkFieldDataType | undefined;
  hasPerm: boolean;
  isVisible: boolean;
  itemLink?: string | undefined;
  openInNewTab: boolean;
  subMenu?: ProcessedSubMenuItem[] | undefined;
}

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
                  linkField: subSubSubLinkField,
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
              linkField: subSubLinkField,
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
          linkField: subLinkField,
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
      linkField: itemLinkField,
      hasPerm: hasPerm,
      isVisible: isVisible,
      itemLink: itemLink,
      openInNewTab: openInNewTab,
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

  return (
    <>
      {showPreviewForMainMenu && (
        <div className="closeNavOnClick block cursor-pointer rounded-lg bg-orange-500 py-2 pr-3 pl-6 text-sm/7 font-semibold text-white">
          Preview Menu
        </div>
      )}
      {processedMenu
        .filter((item) => item.isVisible || showPreviewForMainMenu)
        .map((item) => {
          const hasSub = item.subMenu && item.subMenu.length > 0;

          if (hasSub) {
            return (
              <SafeErrorBoundary fallback={<></>} key={item.id}>
                <Disclosure as="div" className="-mx-3">
                  {isLinkConfigured(item.linkField) ? (
                    <div className="flex w-full items-center justify-between rounded-lg hover:bg-gray-50">
                      {item.hasPerm ? (
                        <LinkComponent
                          href={item.itemLink ?? '/'}
                          openInNewTab={item.openInNewTab}
                          className="closeNavOnClick flex-grow py-2 pl-3 text-base/7 font-semibold text-gray-700"
                          prefetch
                        >
                          {item.label}
                        </LinkComponent>
                      ) : (
                        <DeletedMenuEntry message={item.label} className="flex-grow pl-3" />
                      )}
                      <DisclosureButton className="group p-2 text-gray-500 hover:text-gray-700">
                        <ChevronDown
                          aria-hidden="true"
                          className="size-5 flex-none group-data-open:rotate-180"
                        />
                      </DisclosureButton>
                    </div>
                  ) : (
                    <DisclosureButton className="group flex w-full cursor-pointer items-center justify-between rounded-lg py-2 pr-3.5 pl-3 text-base/7 font-semibold text-gray-700 hover:bg-gray-50">
                      {item.label}
                      <ChevronDown
                        aria-hidden="true"
                        className="size-5 flex-none group-data-open:rotate-180"
                      />
                    </DisclosureButton>
                  )}
                  <DisclosurePanel className="border-conveniat-green/30 mt-2 mb-4 ml-2.5 space-y-2 border-l-2 pl-3">
                    {item.subMenu
                      ?.filter((subItem) => subItem.isVisible || showPreviewForMainMenu)
                      .map((subItem) => {
                        const hasSubSub = subItem.subMenu && subItem.subMenu.length > 0;

                        if (hasSubSub) {
                          return (
                            <SafeErrorBoundary fallback={<></>} key={subItem.id}>
                              <Disclosure as="div" className="pl-1">
                                {isLinkConfigured(subItem.linkField) ? (
                                  <div className="flex w-full items-center justify-between rounded-lg hover:bg-gray-50">
                                    {subItem.hasPerm ? (
                                      <LinkComponent
                                        href={subItem.itemLink ?? '/'}
                                        openInNewTab={subItem.openInNewTab}
                                        className="closeNavOnClick flex-grow py-2 pl-2 text-sm/7 font-semibold text-gray-600"
                                        prefetch
                                      >
                                        {subItem.label}
                                      </LinkComponent>
                                    ) : (
                                      <DeletedMenuEntry
                                        message={subItem.label}
                                        className="flex-grow pl-2"
                                      />
                                    )}
                                    <DisclosureButton className="group p-2 text-gray-400 hover:text-gray-600">
                                      <ChevronDown
                                        aria-hidden="true"
                                        className="size-4 flex-none group-data-open:rotate-180"
                                      />
                                    </DisclosureButton>
                                  </div>
                                ) : (
                                  <DisclosureButton className="group flex w-full cursor-pointer items-center justify-between rounded-lg py-2 pr-3.5 pl-2 text-sm/7 font-semibold text-gray-600 hover:bg-gray-50">
                                    {subItem.label}
                                    <ChevronDown
                                      aria-hidden="true"
                                      className="size-4 flex-none group-data-open:rotate-180"
                                    />
                                  </DisclosureButton>
                                )}
                                <DisclosurePanel className="border-conveniat-green/20 mt-1 mb-2 ml-2 space-y-1 border-l-2 pl-2.5">
                                  {subItem.subMenu
                                    ?.filter(
                                      (subSubItem) =>
                                        subSubItem.isVisible || showPreviewForMainMenu,
                                    )
                                    .map((subSubItem) => {
                                      const hasSubSubSub =
                                        subSubItem.subMenu && subSubItem.subMenu.length > 0;

                                      if (hasSubSubSub) {
                                        return (
                                          <SafeErrorBoundary fallback={<></>} key={subSubItem.id}>
                                            <Disclosure as="div" className="pl-3">
                                              {isLinkConfigured(subSubItem.linkField) ? (
                                                <div className="flex w-full items-center justify-between rounded-lg hover:bg-gray-50">
                                                  {subSubItem.hasPerm ? (
                                                    <LinkComponent
                                                      href={subSubItem.itemLink ?? '/'}
                                                      openInNewTab={subSubItem.openInNewTab}
                                                      className="closeNavOnClick flex-grow py-2 pl-3 text-xs/7 font-semibold text-gray-500"
                                                      prefetch
                                                    >
                                                      {subSubItem.label}
                                                    </LinkComponent>
                                                  ) : (
                                                    <DeletedMenuEntry
                                                      message={subSubItem.label}
                                                      className="flex-grow pl-3"
                                                    />
                                                  )}
                                                  <DisclosureButton className="group p-2 text-gray-400 hover:text-gray-600">
                                                    <ChevronDown
                                                      aria-hidden="true"
                                                      className="size-3.5 flex-none group-data-open:rotate-180"
                                                    />
                                                  </DisclosureButton>
                                                </div>
                                              ) : (
                                                <DisclosureButton className="group flex w-full cursor-pointer items-center justify-between rounded-lg py-2 pr-3.5 pl-3 text-xs/7 font-semibold text-gray-500 hover:bg-gray-50">
                                                  {subSubItem.label}
                                                  <ChevronDown
                                                    aria-hidden="true"
                                                    className="size-3.5 flex-none group-data-open:rotate-180"
                                                  />
                                                </DisclosureButton>
                                              )}
                                              <DisclosurePanel className="mt-1 mb-2 space-y-1">
                                                {subSubItem.subMenu
                                                  ?.filter(
                                                    (subSubSubItem) =>
                                                      subSubSubItem.isVisible ||
                                                      showPreviewForMainMenu,
                                                  )
                                                  .map((subSubSubItem) => {
                                                    if (isLinkConfigured(subSubSubItem.linkField)) {
                                                      return subSubSubItem.hasPerm ? (
                                                        <LinkComponent
                                                          key={subSubSubItem.id}
                                                          href={subSubSubItem.itemLink ?? '/'}
                                                          openInNewTab={subSubSubItem.openInNewTab}
                                                          className="closeNavOnClick block rounded-lg py-2 pr-3 pl-9 text-xs/7 font-semibold text-gray-400 hover:bg-gray-50"
                                                          prefetch
                                                        >
                                                          {subSubSubItem.label}
                                                        </LinkComponent>
                                                      ) : (
                                                        <DeletedMenuEntry
                                                          key={subSubSubItem.id}
                                                          message={subSubSubItem.label}
                                                          className="pl-9"
                                                        />
                                                      );
                                                    }

                                                    return (
                                                      <span
                                                        key={subSubSubItem.id}
                                                        className="closeNavOnClick block rounded-lg py-2 pr-3 pl-9 text-xs/7 font-semibold text-gray-400"
                                                      >
                                                        {subSubSubItem.label}
                                                      </span>
                                                    );
                                                  })}
                                              </DisclosurePanel>
                                            </Disclosure>
                                          </SafeErrorBoundary>
                                        );
                                      }

                                      if (isLinkConfigured(subSubItem.linkField)) {
                                        return subSubItem.hasPerm ? (
                                          <LinkComponent
                                            key={subSubItem.id}
                                            href={subSubItem.itemLink ?? '/'}
                                            openInNewTab={subSubItem.openInNewTab}
                                            className="closeNavOnClick block rounded-lg py-2 pr-3 pl-9 text-xs/7 font-semibold text-gray-500 hover:bg-gray-50"
                                            prefetch
                                          >
                                            {subSubItem.label}
                                          </LinkComponent>
                                        ) : (
                                          <DeletedMenuEntry
                                            key={subSubItem.id}
                                            message={subSubItem.label}
                                            className="pl-9"
                                          />
                                        );
                                      }

                                      return (
                                        <span
                                          key={subSubItem.id}
                                          className="closeNavOnClick block rounded-lg py-2 pr-3 pl-9 text-xs/7 font-semibold text-gray-400"
                                        >
                                          {subSubItem.label}
                                        </span>
                                      );
                                    })}
                                </DisclosurePanel>
                              </Disclosure>
                            </SafeErrorBoundary>
                          );
                        }

                        if (isLinkConfigured(subItem.linkField)) {
                          return subItem.hasPerm ? (
                            <LinkComponent
                              key={subItem.id}
                              href={subItem.itemLink ?? '/'}
                              openInNewTab={subItem.openInNewTab}
                              className="closeNavOnClick block rounded-lg py-2 pr-3 pl-6 text-sm/7 font-semibold text-gray-500 hover:bg-gray-50"
                              prefetch
                            >
                              {subItem.label}
                            </LinkComponent>
                          ) : (
                            <DeletedMenuEntry
                              key={subItem.id}
                              message={subItem.label}
                              className="pl-6"
                            />
                          );
                        }

                        return (
                          <span
                            key={subItem.id}
                            className="closeNavOnClick block rounded-lg py-2 pr-3 pl-6 text-sm/7 font-semibold text-gray-400"
                          >
                            {subItem.label}
                          </span>
                        );
                      })}
                  </DisclosurePanel>
                </Disclosure>
              </SafeErrorBoundary>
            );
          }

          if (isLinkConfigured(item.linkField)) {
            return item.hasPerm ? (
              <LinkComponent
                key={item.id}
                href={item.itemLink ?? '/'}
                openInNewTab={item.openInNewTab}
                prefetch
              >
                <span className="closeNavOnClick -mx-3 block rounded-lg px-3 py-2 text-base/7 font-semibold text-gray-700 hover:bg-gray-50">
                  {item.label}
                </span>
              </LinkComponent>
            ) : (
              <DeletedMenuEntry key={item.id} message={item.label} className="-mx-3 px-3" />
            );
          }

          return (
            <span
              key={item.id}
              className="closeNavOnClick -mx-3 block rounded-lg px-3 py-2 text-base/7 font-semibold text-gray-400"
            >
              {item.label}
            </span>
          );
        })}
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
