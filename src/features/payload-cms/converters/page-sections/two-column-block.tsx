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
        className={cn('min-[1632px]:grid min-[1632px]:gap-8', {
          'min-[1632px]:grid-cols-[1fr_1.618fr]': ratio === 'rightLarger',
          'min-[1632px]:grid-cols-[1.618fr_1fr]': ratio === 'leftLarger',
          'min-[1632px]:grid-cols-2': ratio === 'equal',
          'min-[1632px]:items-start': verticalAlignment === 'top',
          'min-[1632px]:items-center': verticalAlignment === 'center',
          'min-[1632px]:items-end': verticalAlignment === 'bottom',
        })}
      >
        <div>
          <PageSectionsConverter
            blocks={block.leftColumn as ContentBlock[]}
            locale={locale}
            sectionClassName="!mt-0 mb-8 min-[1632px]:mb-0" // removing top margin for inner blocks and adding bottom margin for mobile
          />
        </div>
        <div className="min-[1632px]:mt-2">
          <PageSectionsConverter
            blocks={block.rightColumn as ContentBlock[]}
            locale={locale}
            sectionClassName="!mt-0" // removing top margin for inner blocks
          />
        </div>
      </div>
    </SectionWrapper>
  );
};
