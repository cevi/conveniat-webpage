import { LinkComponent } from '@/components/ui/link-component';
import type { ContentBlock } from '@/features/payload-cms/converters/page-sections/section-wrapper';
import { extractTextContent } from '@/features/payload-cms/payload-cms/utils/extract-rich-text';
import type { GenericPage } from '@/features/payload-cms/payload-types';
import type { Locale } from '@/types/types';

const PageDisplayClient: React.FC<{
  page: GenericPage;
  locale: Locale;
}> = ({ page, locale }): React.JSX.Element => {
  const contentExcerpt = extractTextContent(page.content.mainContent as ContentBlock[]);
  const contentExcerptTrimmed =
    contentExcerpt.length > 150 ? contentExcerpt.slice(0, 150) + '...' : contentExcerpt;

  const url = `/${page.seo.urlSlug}`;

  return (
    <LinkComponent href={url}>
      <div className="flex basis-1 flex-col rounded-md border-2 border-gray-200 bg-white p-6 transition duration-200 hover:shadow-md lg:max-w-96">
        <div>
          <span className="font-body text-[12px] font-bold text-gray-500">
            {new Date(page.createdAt).toLocaleDateString(locale, {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              timeZone: 'Europe/Zurich',
            })}
          </span>
          <h4 className="font-heading text-conveniat-green mb-6 line-clamp-3 min-h-[1.5rem] text-base font-extrabold text-ellipsis">
            {page.content.pageTitle}
          </h4>
        </div>
        <div>
          <p className="text-sm text-gray-500">{contentExcerptTrimmed}</p>
        </div>
      </div>
    </LinkComponent>
  );
};

export default PageDisplayClient;
