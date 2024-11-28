import React from 'react';
import { getPayload } from 'payload';
import config from '@payload-config';
import { getBuildInfo } from '@/utils/get-build-info';

type Arguments = {
  children: React.ReactNode;
};

const FooterCopyrightText: React.FC<Arguments> = ({ children }) => {
  return <span className="mb-4 font-semibold">{children}</span>;
};

const FooterBuildInfoText: React.FC<Arguments> = ({ children }: Arguments) => {
  return <span className="text-[8px] font-light">{children}</span>;
};

export const FooterCopyrightArea: React.FC = async () => {
  const year = new Date().getFullYear();
  const copyright = `© ${year} · Conveniat · Cevi Schweiz`;

  const payload = await getPayload({ config });
  const { footerClaim } = await payload.findGlobal({
    slug: 'footer',
  });

  const build = await getBuildInfo();

  return (
    <div className="flex h-[120px] w-full flex-col items-center justify-center bg-conveniat-green-500 text-white">
      <FooterCopyrightText>{footerClaim}</FooterCopyrightText>
      <FooterCopyrightText>{copyright}</FooterCopyrightText>

      {
        /* The build info may not be available in (local) development mode */
        build !== undefined && (
          <>
            <FooterBuildInfoText>Version {build.version} </FooterBuildInfoText>
            <FooterBuildInfoText>
              Build {build.git.hash} vom {build.timestamp}
            </FooterBuildInfoText>
          </>
        )
      }
    </div>
  );
};
