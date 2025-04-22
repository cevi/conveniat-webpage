import type { ReactNode } from 'react';
import React from 'react';

// These styles apply to every route in the application
import { HeaderComponent } from '@/components/header/header-component';
import { CeviLogo } from '@/components/svg-logos/cevi-logo';
import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';
import { renderInAppDesign } from '@/utils/render-in-app-design';
import { cn } from '@/utils/tailwindcss-override';
import { Inter, Montserrat } from 'next/font/google';
import '../globals.scss';

interface LayoutProperties {
  children: ReactNode;
}

const montserrat = Montserrat({
  subsets: ['latin'],
});
const inter = Inter({
  subsets: ['latin'],
});

const RootLayout: React.FC<LayoutProperties> = async ({ children }) => {
  const locale = await getLocaleFromCookies();
  const isInAppDesign = await renderInAppDesign();

  return (
    <html
      className={cn(`${montserrat.className} ${inter.className}`, {
        'overscroll-y-none': isInAppDesign,
      })}
      lang={locale}
    >
      <body
        className={cn('flex h-screen w-screen flex-col overflow-x-hidden bg-[#f8fafc]', {
          'overscroll-y-none': isInAppDesign,
        })}
      >
        <HeaderComponent />

        <div className="absolute top-0 z-[-999] h-screen w-full p-[56px]">
          <CeviLogo className="mx-auto h-full max-h-[60vh] w-full max-w-[384px] opacity-10 blur-md" />
        </div>

        {children}
      </body>
    </html>
  );
};

export default RootLayout;

// configure the viewport and metadata
export { generateMetadata } from '@/utils/generate-metadata';
export { generateViewport } from '@/utils/generate-viewport';
