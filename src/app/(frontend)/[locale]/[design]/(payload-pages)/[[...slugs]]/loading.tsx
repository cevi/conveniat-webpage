import { SearchSkeleton } from '@/features/payload-cms/components/search/search-skeleton';
import { headers } from 'next/headers';

const GenericSkeleton = (): React.JSX.Element => (
  <div className="flex min-h-[400px] w-full animate-pulse items-center justify-center">
    <div className="flex w-full max-w-2xl flex-col items-center gap-6 px-8">
      <div className="h-12 w-1/2 rounded bg-gray-200" />
      <div className="h-4 w-full rounded bg-gray-100" />
      <div className="h-4 w-5/6 rounded bg-gray-100" />
      <div className="h-4 w-4/6 rounded bg-gray-100" />
      <div className="mt-8 flex w-full gap-4">
        <div className="h-32 w-full rounded bg-gray-100" />
        <div className="h-32 w-full rounded bg-gray-100" />
      </div>
    </div>
  </div>
);

/**
 * Global loading component for dynamic routes.
 * Displays a skeleton screen matched to the route.
 */
const Loading = async (): Promise<React.JSX.Element> => {
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || '';

  // Note: We detect 'suche', 'search', or 'recherche' in the path to show the tailored skeleton
  const isSearchPath =
    pathname.includes('/suche') || pathname.includes('/search') || pathname.includes('/recherche');

  if (isSearchPath) {
    return <SearchSkeleton />;
  }

  return <GenericSkeleton />;
};

export default Loading;
