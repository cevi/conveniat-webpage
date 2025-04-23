import { CallToAction } from '@/components/ui/buttons/call-to-action';
import { TeaserText } from '@/components/ui/typography/teaser-text';
import React from 'react';

export interface HeroSectionType {
  blockName?: string;
  blockType?: 'heroSection';
  pageTeaser: string;
  callToAction: {
    link: string;
    linkLabel: string;
  };
}

export const HeroSection: React.FC<HeroSectionType> = async ({ ...block }) => {
  return (
    <>
      <TeaserText>{block.pageTeaser}</TeaserText>
      <CallToAction href={block.callToAction.link}>{block.callToAction.linkLabel}</CallToAction>
    </>
  );
};
