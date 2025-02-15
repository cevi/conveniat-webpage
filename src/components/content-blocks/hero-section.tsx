import React from 'react';
import { TeaserText } from '@/components/typography/teaser-text';
import { CallToAction } from '@/components/buttons/call-to-action';

export type HeroSectionType = {
  blockName?: string;
  blockType?: 'formBlock';
  pageTeaser: string;
  callToAction: {
    link: string;
    linkLabel: string;
  };
};

export const HeroSection: React.FC<HeroSectionType> = async ({ ...block }) => {
  return (
    <>
      <TeaserText>{block.pageTeaser}</TeaserText>
      <CallToAction href={block.callToAction.link}>{block.callToAction.linkLabel}</CallToAction>
    </>
  );
};
