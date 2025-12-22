import React from 'react';

const CardSkeleton = ({ hasImage = false }) => (
    <div className="flex basis-1 flex-col rounded-md border-2 border-gray-200 bg-white p-6 lg:max-w-96">
        <div className="mb-2 h-3 w-1/3 rounded bg-gray-50" /> {/* Date */}
        <div className="mb-6 h-5 w-full rounded bg-gray-100" /> {/* Headline */}
        {hasImage && <div className="mb-4 aspect-video w-full rounded bg-gray-50" />} {/* Image */}
        <div className="flex flex-col gap-y-2">
            <div className="h-4 w-full rounded bg-gray-50" />
            <div className="h-4 w-5/6 rounded bg-gray-50" />
        </div>
    </div>
);

export const SearchSkeleton: React.FC = () => {
    return (
        <article className="my-8 w-full max-w-2xl px-8 max-xl:mx-auto animate-pulse">
            {/* Headline Skeleton - Matching HeadlineH1 spacing */}
            <div className="mt-8 mb-4 pt-8 md:pt-20">
                <div className="h-8 w-3/4 rounded bg-gray-100" />
            </div>

            {/* Search Bar Skeleton - Matching SearchBar spacing and layout */}
            <div className="mt-6 flex gap-2 mb-8">
                <div className="h-10 w-full rounded border border-gray-300 bg-gray-50" />
                <div className="flex min-w-[100px] items-center justify-center rounded bg-gray-200 h-10" />
            </div>

            {/* Results Grid - Matching SearchPage layout exactly */}
            <div className="mx-auto my-8 grid gap-y-10 min-[1200px]:grid-cols-2 gap-x-8">
                {/* Pages Section Skeleton */}
                <div className="col-span-2 flex flex-col gap-y-4">
                    <div className="h-8 w-32 rounded bg-gray-100 mb-2" />
                    <div className="flex flex-col gap-y-4">
                        <CardSkeleton />
                        <CardSkeleton />
                    </div>
                </div>

                {/* Blog Section Skeleton */}
                <div className="col-span-2 flex flex-col gap-y-4">
                    <div className="h-8 w-40 rounded bg-gray-100 mb-2" />
                    <div className="flex flex-col gap-y-4">
                        <CardSkeleton hasImage />
                        <CardSkeleton hasImage />
                    </div>
                </div>
            </div>
        </article>
    );
};
