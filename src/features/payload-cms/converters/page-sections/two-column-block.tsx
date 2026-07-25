import type { SectionRenderer } from '@/features/payload-cms/converters/page-sections/content-blocks';
import { errorMessageForType } from '@/features/payload-cms/converters/page-sections/content-blocks';
import { PageSectionsConverter } from '@/features/payload-cms/converters/page-sections/index';
import type { ContentBlock } from '@/features/payload-cms/converters/page-sections/section-wrapper';
import SectionWrapper from '@/features/payload-cms/converters/page-sections/section-wrapper';
import type { TwoColumnBlock } from '@/features/payload-cms/payload-types';
import { cn } from '@/utils/tailwindcss-override';

export const RenderTwoColumnBlock: SectionRenderer<TwoColumnBlock> = ({
  block,
  sectionClassName,
  sectionOverrides,
  locale,
}) => {
  const ratio = block.splitRatio;
  const verticalAlignment = block.verticalAlignment;

  return (
    <SectionWrapper
      block={block}
      sectionClassName={sectionClassName}
      sectionOverrides={sectionOverrides}
      errorFallbackMessage={errorMessageForType(
        {
          de: 'Der zweispaltige Block',
          en: 'two column block',
          fr: 'le bloc à deux colonnes',
        },
        locale,
      )}
      locale={locale}
    >
      <div
        className={cn('grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10 xl:gap-12', {
          'lg:items-start': verticalAlignment === 'top',
          'lg:items-center': verticalAlignment === 'center',
          'lg:items-end': verticalAlignment === 'bottom',
        })}
      >
        <div
          className={cn('[&>div>section:first-child_*:first-child]:mt-0!', {
            'lg:col-span-7': ratio === 'leftLarger',
            'lg:col-span-5': ratio === 'rightLarger',
            'lg:col-span-6': ratio === 'equal',
          })}
        >
          <PageSectionsConverter
            blocks={block.leftColumn as ContentBlock[]}
            locale={locale}
            sectionClassName="first:!mt-0 mt-8 mb-8 lg:mb-0" // first block top-aligned, subsequent blocks get mt-8 spacing
          />
        </div>
        <div
          className={cn('[&>div>section:first-child_*:first-child]:mt-0!', {
            'lg:col-span-5': ratio === 'leftLarger',
            'lg:col-span-7': ratio === 'rightLarger',
            'lg:col-span-6': ratio === 'equal',
          })}
        >
          <PageSectionsConverter
            blocks={block.rightColumn as ContentBlock[]}
            locale={locale}
            sectionClassName="first:!mt-0 mt-8" // first block top-aligned, subsequent blocks get mt-8 spacing
          />
        </div>
      </div>
    </SectionWrapper>
  );
};
