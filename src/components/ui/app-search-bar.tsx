import { Input } from '@/components/ui/input';
import { cn } from '@/utils/tailwindcss-override';
import { Search } from 'lucide-react';

interface AppSearchBarProperties {
  placeholder: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  className?: string;
}

export const AppSearchBar: React.FC<AppSearchBarProperties> = ({
  placeholder,
  value,
  onChange,
  onFocus,
  onBlur,
  className,
}) => {
  return (
    <div className="relative">
      <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        className={cn(
          'font-body focus:border-conveniat-green focus:ring-conveniat-green h-12 rounded-lg border-gray-200 bg-white pl-10',
          className,
        )}
      />
    </div>
  );
};
