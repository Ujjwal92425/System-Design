import { useState, useMemo } from 'react';
import { Copy, Check, FileCode, Network } from 'lucide-react';
import { Mermaid } from './Mermaid';

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

  // Check if language is mermaid
  const isMermaid = useMemo(() => {
    if (typeof children === 'object' && children !== null) {
      if ('props' in (children as any)) {
        const className = (children as any).props?.className;
        if (typeof className === 'string' && className.includes('language-mermaid')) {
          return true;
        }
      }
    }
    return false;
  }, [children]);

  // Detect if the code block represents an ASCII diagram
  const isAsciiDiagram = useMemo(() => {
    if (isMermaid) return false;
    const lines = codeText.split('\n');
    let matchesCount = 0;
    for (const line of lines) {
      if (
        line.includes('+--') ||
        line.includes('|  ') ||
        line.includes('-->') ||
        line.includes('===>') ||
        line.includes('+==') ||
        (line.includes('-') && line.includes('|') && line.includes('+')) ||
        line.includes('+-')
      ) {
        matchesCount++;
      }
    }
    return matchesCount >= 2;
  }, [codeText, isMermaid]);

  if (isMermaid) {
    return <Mermaid chart={codeText} />;
  }

  if (isAsciiDiagram) {
    return (
      <div style={{
        position: 'relative',
        margin: '24px 0',
        background: '#FAF9F5', // Warm paper color
        border: '2px solid var(--border)',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
      }} className="group">
        {/* Title / Badge */}
        <div style={{
          padding: '8px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-elevated)',
        }}>
          <span className="mono animate-pulse-edge" style={{
            fontSize: '9px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: '#FF6600',
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            <Network style={{ width: '12px', height: '12px' }} /> System Flow Diagram
          </span>
          <span className="mono" style={{
            fontSize: '9px',
            color: 'var(--text-muted)',
          }}>
            ASCII Blueprint
          </span>
        </div>

        {/* Grid Background Area */}
        <div style={{
          padding: '24px',
          overflowX: 'auto',
          backgroundImage: 'radial-gradient(var(--border) 1px, transparent 1px)',
          backgroundSize: '16px 16px',
          backgroundPosition: 'center',
        }}>
          <pre
            style={{
              margin: 0,
              fontFamily: 'var(--font-mono)',
              fontSize: '12.5px',
              lineHeight: '1.45',
              color: 'var(--text-primary)',
              letterSpacing: '0px',
              whiteSpace: 'pre',
            }}
          >
            {codeText.trim()}
          </pre>
        </div>

        {/* Copy button */}
        <button
          onClick={handleCopy}
          title="Copy diagram"
          className="absolute top-2 right-2 p-1.5 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-500 hover:text-gray-700 opacity-0 group-hover:opacity-100 transition-all duration-150"
          style={{ zIndex: 10 }}
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
    );
  }

  return (
    <div className="relative group my-6">
      <div style={{
        padding: '6px 16px',
        borderTopLeftRadius: '10px',
        borderTopRightRadius: '10px',
        border: '1px solid var(--border)',
        borderBottom: 'none',
        background: 'var(--bg-elevated)',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}>
        <FileCode style={{ width: '12px', height: '12px', color: 'var(--text-muted)' }} />
        <span className="mono" style={{ fontSize: '9px', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
          SOURCE CODE
        </span>
      </div>
      <pre
        className="bg-gray-50 border border-gray-200 rounded-b-xl p-5 overflow-x-auto text-sm font-mono text-gray-700 leading-relaxed"
        style={{
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          borderColor: 'var(--border)',
          background: 'var(--bg-surface)',
        }}
        {...props}
      >
        {children}
      </pre>
      <button
        onClick={handleCopy}
        title="Copy code"
        className="absolute top-10 right-3 p-1.5 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-500 hover:text-gray-700 opacity-0 group-hover:opacity-100 transition-all duration-150"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}
