// components/common/CopyButton.tsx
import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyButtonProps {
  text: string;
  className?: string;
  label?: string;
}

export const CopyButton: React.FC<CopyButtonProps> = ({ text, className = '', label }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 p-1 text-xs text-console-text-secondary hover:text-console-text hover:bg-console-surface-alt rounded transition-colors ${className}`}
      title={copied ? 'Copied!' : 'Copy to clipboard'}
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      {label && <span>{copied ? 'Copied' : label}</span>}
    </button>
  );
};
