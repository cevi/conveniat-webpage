import { Button } from '@/components/ui/buttons/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/utils/tailwindcss-override';
import { Search, X } from 'lucide-react';

interface AppSearchBarProperties {
  placeholder: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClear?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  className?: string;
}

export const AppSearchBar: React.FC<AppSearchBarProperties> = ({
  placeholder,
  value,
  onChange,
  onClear,
  onFocus,
  onBlur,
  className,
}) => {
  return (
    <div className="relative">
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        className={cn(
          'h-14 rounded-2xl border-gray-200 bg-white pr-12 text-base shadow-sm focus-visible:border-gray-300 focus-visible:ring-0',
          className,
        )}
      />
      {value !== '' && onClear ? (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-1/2 right-3 -translate-y-1/2 transform text-gray-500 hover:bg-transparent"
          onClick={onClear}
          type="button"
        >
          <X size={24} />
        </Button>
      ) : (
        <Search
          className="absolute top-1/2 right-4 -translate-y-1/2 transform text-gray-500"
          size={24}
        />
      )}
    </div>
  );
};
