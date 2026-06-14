'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CodeBlockProps {
  children?: React.ReactNode;
  className?: string;
}

export function CodeBlock({ children, ...props }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  // Extract raw text from nested children
  const extractText = (node: React.ReactNode): string => {
    if (typeof node === 'string') return node;
    if (Array.isArray(node)) return node.map(extractText).join('');
    if (typeof node === 'object' && node !== null && 'props' in (node as any)) {
      return extractText((node as any).props?.children);
    }
    return '';
  };

  const codeText = extractText(children);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(codeText.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-6">
      <pre
        className="bg-gray-50 border border-gray-200 rounded-xl p-5 overflow-x-auto text-sm font-mono text-gray-700 leading-relaxed"
        {...props}
      >
        {children}
      </pre>
      <button
        onClick={handleCopy}
        title="Copy code"
        className="absolute top-3 right-3 p-1.5 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-500 hover:text-gray-700 opacity-0 group-hover:opacity-100 transition-all duration-150"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}
