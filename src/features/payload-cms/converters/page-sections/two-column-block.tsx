import type { SectionRenderer } from '@/features/payload-cms/converters/page-sections/content-blocks';
import { errorMessageForType } from '@/features/payload-cms/converters/page-sections/content-blocks';
import { PageSectionsConverter } from '@/features/payload-cms/converters/page-sections/index';
import type { ContentBlock } from '@/features/payload-cms/converters/page-sections/section-wrapper';
import SectionWrapper from '@/features/payload-cms/converters/page-sections/section-wrapper';

interface TwoColumnBlockType {
  leftColumn: ContentBlock[];
  rightColumn: ContentBlock[];
}

export const RenderTwoColumnBlock: SectionRenderer<TwoColumnBlockType> = ({
  block,
  sectionClassName,
  sectionOverrides,
  locale,
}) => {
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
      <div className="min-[1632px]:grid min-[1632px]:grid-cols-[1fr_1.618fr] min-[1632px]:gap-8">
        <div>
          <PageSectionsConverter
            blocks={block.leftColumn}
            locale={locale}
            sectionClassName="!mt-0 mb-8 min-[1632px]:mb-0" // removing top margin for inner blocks and adding bottom margin for mobile
          />
        </div>
        <div className="min-[1632px]:mt-2">
          <PageSectionsConverter
            blocks={block.rightColumn}
            locale={locale}
            sectionClassName="!mt-0" // removing top margin for inner blocks
          />
        </div>
      </div>
    </SectionWrapper>
  );
};
