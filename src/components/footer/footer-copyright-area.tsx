import React from 'react';
import { getBuildInfo } from '@/utils/get-build-info';
import { CeviSchweiz } from '@/components/svg-logos/cevi-schweiz';

type Arguments = {
  children: React.ReactNode;
};

const FooterCopyrightText: React.FC<Arguments> = ({ children }) => {
  return (
    <span className="mt-[32px] font-heading text-[12px] font-bold leading-[16px]">{children}</span>
  );
};

const FooterBuildInfoText: React.FC<Arguments> = ({ children }: Arguments) => {
  return <span className="text-[8px] font-light leading-[10px]">{children}</span>;
};

export const FooterCopyrightArea: React.FC = async () => {
  const year = new Date().getFullYear();
  const copyright = `© ${year} · conveniat27`;

  const build = await getBuildInfo();

  return (
    <div className="flex w-full flex-col items-center justify-center bg-green-600 text-green-200">
      <FooterCopyrightText>{copyright}</FooterCopyrightText>
      <div className="mb-[16px]">
        <CeviSchweiz />
      </div>
      {
        /* The build info may not be available in (local) development mode */
        build !== undefined && (
          <div className="mb-[16px] flex flex-col text-center">
            <FooterBuildInfoText>Version {build.version} </FooterBuildInfoText>
            <FooterBuildInfoText>
              Build {build.git.hash} vom {build.timestamp}
            </FooterBuildInfoText>
          </div>
        )
      }
    </div>
  );
};
