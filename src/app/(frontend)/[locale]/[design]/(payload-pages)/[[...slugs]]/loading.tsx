import { SearchSkeleton } from '@/features/payload-cms/components/search/search-skeleton';
import { headers } from 'next/headers';

const GenericSkeleton = () => (
    <div className="flex min-h-[400px] w-full items-center justify-center animate-pulse">
        <div className="flex flex-col items-center gap-6 w-full max-w-2xl px-8">
            <div className="h-12 w-1/2 rounded bg-gray-200" />
            <div className="h-4 w-full rounded bg-gray-100" />
            <div className="h-4 w-5/6 rounded bg-gray-100" />
            <div className="h-4 w-4/6 rounded bg-gray-100" />
            <div className="mt-8 flex gap-4 w-full">
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
const Loading = async () => {
    const headersList = await headers();
    const pathname = headersList.get('x-pathname') || '';

    // Note: We detect 'suche', 'search', or 'recherche' in the path to show the tailored skeleton
    const isSearchPath = pathname.includes('/suche') || pathname.includes('/search') || pathname.includes('/recherche');

    if (isSearchPath) {
        return <SearchSkeleton />;
    }

    return <GenericSkeleton />;
};

export default Loading;
