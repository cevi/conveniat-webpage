'use client';

import type { PublishingStatusType } from '@/features/payload-cms/payload-cms/components/multi-lang-publishing/type';
import type { Config } from '@/features/payload-cms/payload-types';
import { useDocumentInfo, useFormModified, useLocale } from '@payloadcms/ui';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

interface PublishingData {
    publishingStatus?: PublishingStatusType;
    _disable_unpublishing?: boolean;
}

export const usePublishingStatus = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { id, collectionSlug, globalSlug, updatedAt } = useDocumentInfo() as any;
    const modified = useFormModified();
    const { code } = useLocale() as { code: Config['locale'] };

    const queryKey = ['publishingStatus', collectionSlug, globalSlug, id];

    const queryFn = async (): Promise<PublishingData | undefined> => {
        if (collectionSlug === undefined && globalSlug === undefined) {
            return undefined;
        }

        const url = globalSlug !== undefined
            ? `/api/globals/${globalSlug}?depth=0&draft=false&locale=all`
            : `/api/${collectionSlug}/${id}?depth=0&draft=false&locale=all`;

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Failed to fetch publishing status');
        }
        const data = await response.json() as PublishingData;
        return data;
    };

    const { data, isLoading, error, refetch } = useQuery({
        queryKey,
        queryFn,
        enabled: (collectionSlug !== undefined && id !== undefined) || globalSlug !== undefined,
        // Cache data for 30 seconds to prevent duplicate fetches during initial render
        staleTime: 30_000,
        // Keep data in cache for 5 minutes
        gcTime: 5 * 60 * 1000,
        // Disable automatic refetching - we manually refetch after save operations
        refetchInterval: false,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
    });

    const wasModified = useRef(false);
    const [isSyncing, setIsSyncing] = useState(false);

    // Refetch when the document is updated (saved)
    useEffect(() => {
        void refetch();
    }, [updatedAt, refetch]);

    // Refetch when modified state changes from true to false (autosave)
    useEffect(() => {
        if (modified) {
            wasModified.current = true;
        } else if (wasModified.current) {
            wasModified.current = false;
            setIsSyncing(true);
            void refetch().finally(() => {
                setIsSyncing(false);
            });
        }
    }, [modified, refetch]);

    // Apply optimistic updates
    let publishingStatus = data?.publishingStatus;

    if ((modified || isSyncing) && publishingStatus && code) {
        publishingStatus = {
            ...publishingStatus,
            [code]: {
                published: publishingStatus[code]?.published ?? false,
                pendingChanges: true,
            },
        };
    }

    // canUnpublish is true unless _disable_unpublishing is explicitly true
    const canUnpublish = data?._disable_unpublishing !== true;

    return {
        publishingStatus,
        canUnpublish,
        isLoading,
        error,
        refetch,
    };
};
