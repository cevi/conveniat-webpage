'use client';

import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { useField, useTranslation } from '@payloadcms/ui';
import {
  BriefcaseMedical,
  Flag,
  GlassWater,
  HelpCircle,
  type LucideIcon,
  MapPin,
  Recycle,
  Tent,
  Toilet,
  Utensils,
} from 'lucide-react';
import type { SelectFieldClientComponent } from 'payload';
import { useEffect, useMemo, useState } from 'react';

type LocalizedLabel = Record<string, string>;

interface SelectOption {
  label: string | LocalizedLabel;
  value: string;
}

const ICON_MAP: Record<string, LucideIcon> = {
  MapPin,
  Tent,
  Utensils,
  Flag,
  HelpCircle,
  Recycle,
  GlassWater,
  Toilet,
  BriefcaseMedical,
};

export const IconSelectField: SelectFieldClientComponent = ({ path, field }) => {
  const { value, setValue } = useField<string>({ path });
  const { i18n } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);
  const options = field.options;

  const getLabel = (option: string | SelectOption): string => {
    if (typeof option === 'string') return option;
    if (typeof option.label === 'string') return option.label;
    if (typeof option.label === 'object') {
      const lang = i18n.language || 'de';
      return option.label[lang] || option.label['en'] || Object.values(option.label)[0] || '';
    }
    return option.value;
  };

  const renderIcon = (iconName: string, size = 18): React.ReactNode => {
    const IconComponent = ICON_MAP[iconName];
    if (!IconComponent) return undefined;
    return <IconComponent size={size} />;
  };

  const selectedOption = useMemo(() => {
    return options.find((opt) => (typeof opt === 'string' ? opt : opt.value) === value);
  }, [options, value]);

  if (!mounted) {
    return (
      <div className="h-[40px] w-full animate-pulse rounded-md border border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-800" />
    );
  }

  return (
    <div className="field-type select">
      <label className="field-label">
        {typeof field.label === 'string'
          ? field.label
          : (field.label as LocalizedLabel)[i18n.language || 'de'] ||
            (field.label as LocalizedLabel)['en'] ||
            field.name}
        {field.required && <span className="ml-1 text-red-500">*</span>}
      </label>

      <Select value={value || ''} onValueChange={(val: string) => setValue(val)}>
        <SelectTrigger className="h-[40px] w-full border-gray-300 bg-[var(--theme-bg)] focus:ring-blue-500 dark:border-gray-700">
          <div className="flex items-center overflow-hidden">
            {value ? (
              <>
                <div className="mr-3 flex-shrink-0 text-blue-500">{renderIcon(value)}</div>
                <span className="truncate">
                  {selectedOption ? getLabel(selectedOption as string | SelectOption) : value}
                </span>
              </>
            ) : (
              <span className="text-gray-400">
                {i18n.t('general:selectValue') || 'Wert auswählen'}
              </span>
            )}
          </div>
        </SelectTrigger>
        <SelectContent className="z-[9999] bg-[var(--theme-bg)]">
          <div className="max-h-[300px] overflow-y-auto">
            {(options as unknown as (string | SelectOption)[]).map((option) => {
              const val = typeof option === 'string' ? option : option.value;
              const label = getLabel(option);
              return (
                <SelectItem key={val} value={val} className="cursor-pointer">
                  <div className="flex items-center">
                    <div className="mr-3 flex-shrink-0 text-gray-400">{renderIcon(val, 18)}</div>
                    <span className="truncate">{label}</span>
                  </div>
                </SelectItem>
              );
            })}
          </div>
        </SelectContent>
      </Select>

      {field.admin?.description && (
        <div className="field-description">
          {typeof field.admin.description === 'string'
            ? field.admin.description
            : (field.admin.description as LocalizedLabel)[i18n.language || 'de']}
        </div>
      )}
    </div>
  );
};

export default IconSelectField;
