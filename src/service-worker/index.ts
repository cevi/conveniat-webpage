import {
  notificationClickHandler,
  pushNotificationHandler,
} from '@/service-worker/push-notifications';
import { offlineSupportInstallHandler } from '@/service-worker/offline-support';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';

/**
 * Declares the global `__SW_MANIFEST` property on the `WorkerGlobalScope`.
 *
 * Serwist's build process injects the precache manifest (a list of URLs and
 * their revisions to be cached) into the Service Worker using this global
 * variable. This declaration informs TypeScript about the existence and
 * expected type of `__SW_MANIFEST`.
 *
 * @remarks
 * The default injection point string used by Serwist is `"self.__SW_MANIFEST"`.
 * This type declaration ensures type safety when accessing this variable within
 * the Service Worker context.
 *
 * @see {@link https://serwist.pages.dev/docs/next/getting-started | Serwist Documentation}
 */
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

// Ensures the global `self` variable is correctly typed as `ServiceWorkerGlobalScope`.
declare const self: ServiceWorkerGlobalScope;

// offline support
//  » handled by serwist
self.addEventListener('install', offlineSupportInstallHandler(self.__SW_MANIFEST));

// push notifications
//  » has nothing to do with serwist
self.addEventListener('push', pushNotificationHandler(self));
self.addEventListener('pushsubscriptionchange', () => {});
self.addEventListener('notificationclick', notificationClickHandler(self));
self.addEventListener('notificationclose', () => {});
