'use client';

import { Card } from '@/components/ui/card';
import { LinkComponent } from '@/components/ui/link-component';
import { SettingsRow } from '@/features/settings/components/settings-row';
import { useNativeAppInfo } from '@/hooks/use-native-app-info';
import type { Locale, StaticTranslationString } from '@/types/types';
import { Calendar, ExternalLink, Heart, Laptop, Mail, Server, Smartphone } from 'lucide-react';
import React from 'react';

interface AboutSettingsProperties {
  locale: Locale;
  webBuild?:
    | {
        version: string;
        timestamp: string;
        git: {
          branch: string;
          hash: string;
        };
      }
    | undefined;
}

const aboutTitle: StaticTranslationString = {
  de: 'Über diese App',
  en: 'About this App',
  fr: 'À propos de cette application',
};

const authorTitle: StaticTranslationString = {
  de: 'Design & Technische Umsetzung',
  en: 'Design & Technical Implementation',
  fr: 'Design & mise en œuvre technique',
};

const contactTitle: StaticTranslationString = {
  de: 'Kontakt Cevi.Tools',
  en: 'Contact Cevi.Tools',
  fr: 'Contact Cevi.Tools',
};

const buildInfoTitle: StaticTranslationString = {
  de: 'Build-Informationen',
  en: 'Build Information',
  fr: 'Informations de Build',
};

const webBuildLabel: StaticTranslationString = {
  de: 'Web-Version',
  en: 'Web Version',
  fr: 'Version Web',
};

const nativeBuildLabel: StaticTranslationString = {
  de: 'App-Version',
  en: 'App Version',
  fr: 'Version App',
};

const buildDateLabel: StaticTranslationString = {
  de: 'Datum des Builds',
  en: 'Build Date',
  fr: 'Date de Build',
};

const renderAuthorDescription = (locale: Locale): React.ReactNode => {
  switch (locale) {
    case 'en': {
      return (
        <>
          The website{' '}
          <LinkComponent
            href="https://conveniat27.ch"
            className="inline-flex items-center gap-0.5 font-medium text-green-600 hover:underline"
            hideExternalIcon
            openInNewTab
          >
            conveniat27.ch
          </LinkComponent>{' '}
          and the associated conveniat27 app are developed on a voluntary basis by{' '}
          <LinkComponent
            href="https://cevi.tools"
            className="inline-flex items-center gap-0.5 font-medium text-green-600 hover:underline"
            hideExternalIcon
            openInNewTab
          >
            Cevi.Tools
          </LinkComponent>
          . The source code is freely available on{' '}
          <LinkComponent
            href="https://github.com/cevi"
            className="inline-flex items-center gap-0.5 font-medium text-green-600 hover:underline"
            hideExternalIcon
            openInNewTab
          >
            GitHub
          </LinkComponent>
          .
        </>
      );
    }
    case 'fr': {
      return (
        <>
          Le site web{' '}
          <LinkComponent
            href="https://conveniat27.ch"
            className="inline-flex items-center gap-0.5 font-medium text-green-600 hover:underline"
            hideExternalIcon
            openInNewTab
          >
            conveniat27.ch
          </LinkComponent>{' '}
          et l&apos;application conveniat27 associée sont développés bénévolement par{' '}
          <LinkComponent
            href="https://cevi.tools"
            className="inline-flex items-center gap-0.5 font-medium text-green-600 hover:underline"
            hideExternalIcon
            openInNewTab
          >
            Cevi.Tools
          </LinkComponent>
          . Le code source est disponible gratuitement sur{' '}
          <LinkComponent
            href="https://github.com/cevi"
            className="inline-flex items-center gap-0.5 font-medium text-green-600 hover:underline"
            hideExternalIcon
            openInNewTab
          >
            GitHub
          </LinkComponent>
          .
        </>
      );
    }
    default: {
      return (
        <>
          Die Webseite{' '}
          <LinkComponent
            href="https://conveniat27.ch"
            className="inline-flex items-center gap-0.5 font-medium text-green-600 hover:underline"
            hideExternalIcon
            openInNewTab
          >
            conveniat27.ch
          </LinkComponent>{' '}
          und die zugehörige conveniat27-App werden in ehrenamtlicher Arbeit von{' '}
          <LinkComponent
            href="https://cevi.tools"
            className="inline-flex items-center gap-0.5 font-medium text-green-600 hover:underline"
            hideExternalIcon
            openInNewTab
          >
            Cevi.Tools
          </LinkComponent>{' '}
          entwickelt. Der Quellcode steht auf{' '}
          <LinkComponent
            href="https://github.com/cevi"
            className="inline-flex items-center gap-0.5 font-medium text-green-600 hover:underline"
            hideExternalIcon
            openInNewTab
          >
            GitHub
          </LinkComponent>{' '}
          frei zur Verfügung.
        </>
      );
    }
  }
};

const renderHosttechDescription = (locale: Locale): React.ReactNode => {
  switch (locale) {
    case 'en': {
      return (
        <>
          Many thanks also to{' '}
          <LinkComponent
            href="https://www.hosttech.ch"
            className="font-medium text-green-600 hover:underline"
            hideExternalIcon
            openInNewTab
          >
            hosttech
          </LinkComponent>
          , which provides the server resources for running the website and app free of charge.
        </>
      );
    }
    case 'fr': {
      return (
        <>
          Un grand merci également à{' '}
          <LinkComponent
            href="https://www.hosttech.ch"
            className="font-medium text-green-600 hover:underline"
            hideExternalIcon
            openInNewTab
          >
            hosttech
          </LinkComponent>
          , qui met gratuitement à disposition les ressources serveur pour le fonctionnement du site
          web et de l&apos;application.
        </>
      );
    }
    default: {
      return (
        <>
          Danke an dieser Stelle auch an{' '}
          <LinkComponent
            href="https://www.hosttech.ch"
            className="font-medium text-green-600 hover:underline"
            hideExternalIcon
            openInNewTab
          >
            hosttech
          </LinkComponent>
          , welche die Serverressourcen für den Betrieb von Webseite und App kostenlos zur Verfügung
          stellt.
        </>
      );
    }
  }
};

export const AboutSettings: React.FC<AboutSettingsProperties> = ({ locale, webBuild }) => {
  const nativeApp = useNativeAppInfo();

  let platformName = nativeApp?.platform;
  if (nativeApp?.platform.toLowerCase() === 'ios') {
    platformName = 'iOS';
  } else if (nativeApp?.platform.toLowerCase() === 'android') {
    platformName = 'Android';
  }

  return (
    <div className="space-y-6">
      <Card title={aboutTitle[locale]} divided>
        {/* Author & Contribution Row */}
        <div className="px-6 py-5">
          <div className="flex items-start gap-3">
            <Heart className="mt-1 h-5 w-5 shrink-0 fill-red-500/20 text-red-500" />
            <div className="space-y-2">
              <h4 className="font-semibold text-gray-900">{authorTitle[locale]}</h4>
              <p className="text-sm leading-relaxed text-gray-600">
                {renderAuthorDescription(locale)}
              </p>
            </div>
          </div>
        </div>

        {/* Hosting Sponsor Row */}
        <div className="px-6 py-5">
          <div className="flex items-start gap-3">
            <Server className="mt-1 h-5 w-5 shrink-0 text-blue-500" />
            <div className="space-y-1">
              <p className="text-sm leading-relaxed text-gray-600">
                {renderHosttechDescription(locale)}
              </p>
            </div>
          </div>
        </div>

        {/* Contact Row */}
        <div className="px-6 py-4">
          <LinkComponent
            href="mailto:info@cevi.tools"
            className="-mx-3 block rounded-lg px-3 py-1 transition-colors hover:bg-gray-50"
            hideExternalIcon
          >
            <SettingsRow
              icon={Mail}
              title={contactTitle[locale]}
              subtitle="Fachgruppe Informatik (info@cevi.tools)"
              subtitleClassName="text-sm text-gray-600 font-normal mt-0.5"
              action={<ExternalLink className="h-4 w-4 text-gray-400" />}
            />
          </LinkComponent>
        </div>
      </Card>

      {/* Build Information Card */}
      <Card title={buildInfoTitle[locale]} divided>
        {webBuild && (
          <div className="px-6 py-4">
            <SettingsRow
              icon={Laptop}
              title={webBuildLabel[locale]}
              subtitle={`v${webBuild.version} (${webBuild.git.hash})`}
              subtitleClassName="font-mono"
            />
          </div>
        )}

        {nativeApp && (
          <div className="px-6 py-4">
            <SettingsRow
              icon={Smartphone}
              title={`${nativeBuildLabel[locale]} (${platformName})`}
              subtitle={`v${nativeApp.version} (${nativeApp.buildNumber})`}
              subtitleClassName="font-mono"
            />
          </div>
        )}

        {webBuild?.timestamp && (
          <div className="px-6 py-4">
            <SettingsRow
              icon={Calendar}
              title={buildDateLabel[locale]}
              subtitle={webBuild.timestamp}
            />
          </div>
        )}
      </Card>
    </div>
  );
};
