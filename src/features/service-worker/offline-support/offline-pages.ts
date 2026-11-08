/**
 * Configuration for pages that should be available offline.
 *
 * When the service worker activates, these pages will be prefetched
 * along with all their dependencies (CSS, JS, images, fonts).
 *
 * Download: Only when manually trigger the "Start Offline Download"
 * action (or whenever the code calls prefetchOfflinePages).
 *
 * Simply add page URLs to this array to make them work offline.
 *
 */
import { OFFLINE_CHAT_SHELL_ID } from '@/features/service-worker/offline-support/rsc-utils';

export const offlinePages = [
  // App entrypoint
  '/entrypoint',
  '/entrypoint?app-mode=true',
  '/entrypoint?force-app-mode=true',

  // Landing page
  '/',

  // Main application dashboard
  '/app/dashboard',

  // Chat page
  '/app/chat',

  // Generic shells for the client rendered chat routes. Both pages read the chat id from
  // the URL, so these payloads are replayed for every chat that was never opened online
  // (see findReplayableSiblingKey).
  `/app/chat/${OFFLINE_CHAT_SHELL_ID}`,
  `/app/chat/${OFFLINE_CHAT_SHELL_ID}/details`,

  // Forum, and the generic shell of a post, read from the URL like a chat
  '/app/forum',
  `/app/forum/${OFFLINE_CHAT_SHELL_ID}`,

  // Schedule page with local DB offline support
  '/app/schedule',

  // Helper Portal page
  '/app/helper-portal',

  // emergency information page
  '/app/emergency',

  // Map viewer with tile caching
  '/app/map',

  // Settings page
  '/app/settings',

  // Security and first aid read the NFC wristbands from the list kept on the phone. The page
  // is rendered signed in; who may read and the list come from the persisted query cache.
  // Deployments without the wristbands answer 404, which the download skips.
  '/app/wristbands/lesen',

  // The story and the challenges for Leitende, from the persisted query cache. Deployments
  // without them answer 404, which the download skips.
  '/app/story',
  '/app/challenges',

  // Offline pages
  '/~offline',
  '/~offline?app-mode=true',
] as const;
