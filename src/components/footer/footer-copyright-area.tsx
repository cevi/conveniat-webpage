import React from 'react';
import { getPayload } from 'payload';
import config from '@payload-config';

const fs = require('fs');
const path = require('path');
const packageJsonPath = path.resolve(process.cwd(), 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

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

  const buildDate = '05.10.2024 11:32:28';
  const commitHash = 'af10879';
  const buildInfo = `Build ${commitHash} vom ${buildDate}`;

  return (
    <div className="flex h-[120px] w-full flex-col items-center justify-center bg-conveniat-green-500 text-white">
      <FooterCopyrightText>{footerClaim}</FooterCopyrightText>
      <FooterCopyrightText>{copyright}</FooterCopyrightText>
      <FooterBuildInfoText>Version {packageJson.version} </FooterBuildInfoText>
      <FooterBuildInfoText>({buildInfo})</FooterBuildInfoText>
    </div>
  );
};
