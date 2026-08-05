import type React from 'react';
import type { ReactNode } from 'react';
import { Suspense } from 'react';

// These styles apply to every route in the application
import '@/app/globals.scss';
import { ServiceWorkerManager } from '@/components/service-worker/service-worker-manager';
import { CeviLogo } from '@/components/svg-logos/cevi-logo';
import { environmentVariables } from '@/config/environment-variables';
import { PostHogProvider } from '@/providers/post-hog-provider';
import { TRPCProvider } from '@/trpc/client';
import { sharedFontClassName } from '@/utils/fonts';
import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';
import { SessionProvider } from 'next-auth/react';

interface LayoutProperties {
  children: ReactNode;
}

/**
 * This is the root layout for the app entrypoint.
 * This root layout is not localized and not in the app design as those cookies
 * are not set on the first rendering of the app.
 *
 * @constructor
 */
const AppEntrypointLayout: React.FC<LayoutProperties> = async ({ children }) => {
  const locale = await getLocaleFromCookies();

  return (
    <html
      suppressHydrationWarning
      className={`${sharedFontClassName} overscroll-y-none`}
      lang={locale}
    >
      <head>
        {!environmentVariables.NEXT_PUBLIC_DISABLE_SERWIST && (
          <link rel="manifest" href="/manifest.webmanifest" />
        )}
      </head>
      <body
        suppressHydrationWarning
        className="flex h-svh w-screen flex-col overflow-x-hidden overflow-y-hidden overscroll-y-none bg-[#f8fafc]"
      >
        {/*
          Early capture script for native push notification clicks on cold start.
          When the app is killed and a push notification is tapped, the native shell
          dispatches 'native-push-open' before React hydrates. This inline script
          captures that event and stores the target URL so the onboarding flow can
          redirect to it once completed.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
  function extractUrl(p){
    if(!p||typeof p!=='object')return;
    var cs=[p,p.data,p.notification,p.aps,p.userInfo];
    if(p.notification)cs.push(p.notification.data,p.notification.aps,p.notification.userInfo);
    for(var i=0;i<cs.length;i++){
      var c=cs[i];if(!c||typeof c!=='object')continue;
      var cid=c.chatId;
      if(typeof cid==='string'&&cid.trim())return'/app/chat/'+cid.trim();
      if(typeof cid==='number')return'/app/chat/'+cid;
    }
    for(var j=0;j<cs.length;j++){
      var c2=cs[j];if(!c2||typeof c2!=='object')continue;
      var ks=['redirectTo','url','path','link','target'];
      for(var k=0;k<ks.length;k++){
        var v=c2[ks[k]];
        if(typeof v==='string'&&v.trim())return v.trim();
      }
    }
  }
  window.addEventListener('app-webview-native-push-event',function(e){
    try{
      var d=e.detail||{};
      if(d.type==='native-push-open'){
        var u=extractUrl(d.payload||{});
        if(u){
          try{sessionStorage.setItem('pending_push_redirect',u)}catch(x){}
          try{localStorage.setItem('pending_push_redirect',u)}catch(x){}
        }
      }
    }catch(err){}
  });
})();`,
          }}
        />
        <PostHogProvider>
          <div className="absolute top-0 z-[-999] h-svh w-full p-[56px]">
            <CeviLogo className="mx-auto h-full w-full max-w-[384px] opacity-10 blur-md" />
          </div>
          {children}
        </PostHogProvider>
      </body>
    </html>
  );
};

const AppEntrypointRootLayout: React.FC<LayoutProperties> = ({ children }) => {
  return (
    <Suspense>
      <AppEntrypointLayout>
        <ServiceWorkerManager>
          <TRPCProvider>
            <SessionProvider>{children}</SessionProvider>
          </TRPCProvider>
        </ServiceWorkerManager>
      </AppEntrypointLayout>
    </Suspense>
  );
};

export default AppEntrypointRootLayout;

// configure the viewport and metadata
export { generateMetadata } from '@/utils/generate-metadata';
export { generateViewport } from '@/utils/generate-viewport';
