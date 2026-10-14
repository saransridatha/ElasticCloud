// components/common/SearchInput.tsx
import React from 'react';
import { Search, X } from 'lucide-react';

interface SearchInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = 'Search...',
  className = '',
}) => {
  return (
    <div className={`relative flex items-center ${className}`}>
      <Search className="absolute left-3 w-4 h-4 text-console-text-muted pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-8 py-1.5 text-sm bg-console-surface border border-console-border rounded text-console-text placeholder-console-text-muted focus:outline-none focus:border-aws-orange transition-colors"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-2.5 p-0.5 text-console-text-muted hover:text-console-text"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
