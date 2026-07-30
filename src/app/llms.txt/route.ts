import { cachedLlmsGenerator } from '@/features/payload-cms/utils/generate-llms';
import { forceDynamicOnBuild } from '@/utils/is-pre-rendering';

/**
 * Route handler for dynamic /llms.txt serving.
 * Complies with Next.js App Router Route Handler specification.
 */
export const GET = async (): Promise<Response> => {
  if (await forceDynamicOnBuild()) {
    return new Response('', {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  }

  const content = await cachedLlmsGenerator();

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400',
    },
  });
};
