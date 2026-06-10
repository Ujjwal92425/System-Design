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
        className="bg-zinc-950 border border-zinc-800/60 rounded-xl p-5 overflow-x-auto text-sm font-mono text-zinc-300 leading-relaxed"
        {...props}
      >
        {children}
      </pre>
      <button
        onClick={handleCopy}
        title="Copy code"
        className="absolute top-3 right-3 p-1.5 rounded-lg bg-zinc-800/60 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100 opacity-0 group-hover:opacity-100 transition-all duration-150"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}
