import { LinkComponent } from '@/components/ui/link-component';
import type { SearchResultCard as SearchResultCardData } from '@/features/payload-cms/components/search/search-results';
import type { Locale } from '@/types/types';
import type React from 'react';

const SearchResultCard: React.FC<{
  result: SearchResultCardData;
  locale: Locale;
}> = ({ result, locale }): React.JSX.Element => {
  return (
    <LinkComponent href={result.url}>
      <div className="flex basis-1 flex-col rounded-md border-2 border-gray-200 bg-white p-6 transition duration-200 hover:shadow-md lg:max-w-96">
        <div>
          <span className="font-body text-[12px] font-bold text-gray-500">
            {new Date(result.createdAt).toLocaleDateString(locale, {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              timeZone: 'Europe/Zurich',
            })}
          </span>
          <h4 className="font-heading text-conveniat-green mb-6 line-clamp-3 min-h-[1.5rem] text-base font-extrabold text-ellipsis">
            {result.title}
          </h4>
        </div>
        <div>
          <p className="text-sm text-gray-500">{result.excerpt}</p>
        </div>
      </div>
    </LinkComponent>
  );
};

export default SearchResultCard;
