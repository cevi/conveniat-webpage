import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

export const AppSearchBar: React.FC<{
  placeholder: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ placeholder, value, onChange }) => {
  return (
    <div className="relative">
      <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="font-body focus:border-conveniat-green focus:ring-conveniat-green border-gray-300 bg-white pl-10"
      />
    </div>
  );
};
