import { LinkComponent } from '@/components/ui/link-component';
import type { LinkFieldDataType } from '@/features/payload-cms/payload-cms/shared-fields/link-field';
import { getImageAltInLocale } from '@/features/payload-cms/payload-cms/utils/images-meta-fields';
import {
  getURLForLinkField,
  openURLInNewTab,
} from '@/features/payload-cms/payload-cms/utils/link-field-logic';
import type { Image } from '@/features/payload-cms/payload-types';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import {
  ArrowRight,
  Backpack,
  Bell,
  Calendar,
  Camera,
  ClipboardList,
  Compass,
  Flame,
  HandHelping,
  Heart,
  House,
  type LucideIcon,
  MapPin,
  MessageCircle,
  Music,
  Star,
  Target,
  Tent,
  TreePine,
  Trees,
  Users,
} from 'lucide-react';
import ImageNode from 'next/image';
import React from 'react';

export interface CardGridCard {
  id?: string | null;
  iconType?: 'icon' | 'image';
  icon: string;
  customImage?: Image;
  title: string;
  description: string;
  linkLabel: string;
  linkField?: LinkFieldDataType;
}

export interface CardGridType {
  cards: CardGridCard[];
  locale: Locale;
}

const iconMap: Record<string, LucideIcon> = {
  users: Users,
  handHelping: HandHelping,
  family: Users, // lucide-react doesn't have a "family" icon; use Users as a fallback
  tent: Tent,
  tentTree: Trees,
  clipboardList: ClipboardList,
  target: Target,
  mapPin: MapPin,
  calendar: Calendar,
  messageCircle: MessageCircle,
  bell: Bell,
  star: Star,
  heart: Heart,
  house: House,
  music: Music,
  camera: Camera,
  treePine: TreePine,
  flame: Flame,
  compass: Compass,
  backpack: Backpack,
};

const CardGridItem: React.FC<{
  card: CardGridCard;
  locale: Locale;
}> = ({ card, locale }) => {
  const IconComponent = iconMap[card.icon] ?? Users;
  const url = getURLForLinkField(card.linkField, locale) ?? '';

  const renderIcon = (): React.ReactNode => {
    if (card.iconType === 'image' && card.customImage?.url) {
      return (
        <ImageNode
          src={card.customImage.url}
          alt={getImageAltInLocale(locale, card.customImage)}
          width={48}
          height={48}
          className="size-full object-contain"
        />
      );
    }
    return <IconComponent className="size-6" strokeWidth={1.5} />;
  };

  const cardContent = (
    <div className="group flex h-full flex-col justify-between rounded-lg border-2 border-gray-200 bg-white p-6 shadow-xs transition-transform duration-300 hover:scale-[1.01]">
      <div>
        <div
          className={cn(
            'bg-conveniat-green/5 text-conveniat-green mb-4 inline-flex size-12 items-center justify-center overflow-hidden rounded-xl',
            card.iconType === 'image' && card.customImage?.url ? 'p-0' : 'p-3',
          )}
        >
          {renderIcon()}
        </div>
        <h3 className="font-heading text-conveniat-green mb-2 text-lg font-bold">{card.title}</h3>
        <p className="font-body mb-4 text-sm leading-relaxed text-gray-500">{card.description}</p>
      </div>
      {url ? (
        <div className="text-conveniat-green font-body flex items-center gap-1 text-sm font-medium">
          {card.linkLabel}
          <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
        </div>
      ) : undefined}
    </div>
  );

  if (card.linkField && url) {
    return (
      <LinkComponent
        href={url}
        openInNewTab={openURLInNewTab(card.linkField)}
        hideExternalIcon
        className="no-underline"
      >
        {cardContent}
      </LinkComponent>
    );
  }

  return cardContent;
};

export const CardGrid: React.FC<CardGridType> = ({ cards, locale }) => {
  return (
    <div className="@container">
      <div className="grid grid-cols-1 gap-4 @lg:grid-cols-2 @2xl:grid-cols-3">
        {cards.map((card, index) => (
          <CardGridItem key={card.id ?? String(index)} card={card} locale={locale} />
        ))}
      </div>
    </div>
  );
};
