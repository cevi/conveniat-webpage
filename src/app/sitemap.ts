export { generateSitemap as default } from '@/features/payload-cms/utils/generate-sitemap';

// TODO: bring back caching, e.g. to two hours
//  currently the issue is that without 'force-dynamic' the page
//  gets pre-rendered at build time which does not work as
//  payload is not available at build time
export const dynamic = 'force-dynamic';
