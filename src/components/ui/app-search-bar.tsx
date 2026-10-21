import { cn } from '@/utils/tailwindcss-override';
import { Search, X } from 'lucide-react';

interface AppSearchBarProperties {
  placeholder: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClear?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  /** a name for screen readers, when the placeholder alone would not say what is searched */
  label?: string;
  className?: string;
}

/**
 * The app's search field: 44px, white on the page with a line around it, the magnifier in
 * front. A real search input with a label, and a clear button once there is something to clear.
 */
export const AppSearchBar: React.FC<AppSearchBarProperties> = ({
  placeholder,
  value,
  onChange,
  onClear,
  onFocus,
  onBlur,
  label,
  className,
}) => (
  <label
    className={cn(
      'border-line flex h-11 items-center gap-2.5 rounded-xl border bg-white pl-3.5 transition-colors focus-within:border-green-300',
      className,
    )}
  >
    <Search className="h-[18px] w-[18px] shrink-0 text-green-500" aria-hidden="true" />
    <span className="sr-only">{label ?? placeholder}</span>
    <input
      type="search"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onFocus={onFocus}
      onBlur={onBlur}
      className="h-full min-w-0 flex-1 bg-transparent pr-3.5 text-[15px] text-green-900 outline-hidden placeholder:text-green-500 [&::-webkit-search-cancel-button]:hidden"
    />
    {value !== '' && onClear !== undefined && (
      <button
        type="button"
        onClick={onClear}
        aria-label={placeholder}
        className="-ml-3.5 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center text-green-500"
      >
        <X className="h-[18px] w-[18px]" />
      </button>
    )}
  </label>
);
