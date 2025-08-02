import { Search } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

interface SearchBarProperties {
  onSearch: (searchTerm: string) => void;
}

export const SearchBar: React.FC<SearchBarProperties> = ({ onSearch }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputReference = useRef<HTMLInputElement>(null);

  const handleToggleExpand = useCallback(() => {
    setIsExpanded((previous) => {
      if (previous) {
        // If collapsing, clear search term
        setInputValue('');
        onSearch('');
      }
      return !previous;
    });
  }, [onSearch]);

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && inputReference.current) {
      inputReference.current.focus();
    }
  }, [isExpanded]);

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setInputValue(value);
      onSearch(value);
    },
    [onSearch],
  );

  return (
    <div
      className={`absolute top-12 left-4 z-50 flex items-center rounded-full border-2 border-gray-100 bg-white transition-all duration-300 ease-in-out ${isExpanded ? 'w-80 p-2' : 'h-10 w-10 p-2'} `}
    >
      <button
        onClick={handleToggleExpand}
        className="flex h-6 w-6 items-center justify-center text-gray-600 focus:outline-none"
        aria-label={isExpanded ? 'Collapse search bar' : 'Expand search bar'}
      >
        <Search className="h-5 w-5" />
      </button>
      {isExpanded && (
        <input
          ref={inputReference}
          type="text"
          placeholder="Search annotations..."
          value={inputValue}
          onChange={handleChange}
          className="ml-2 flex-grow border-none text-gray-800 focus:outline-none"
        />
      )}
    </div>
  );
};
