'use client';

import { MDXRemote } from 'next-mdx-remote';
import { serialize } from 'next-mdx-remote/serialize';
import { useEffect, useState } from 'react';
import { CalloutBlock } from './CalloutBlock';
import { CodeBlock } from './CodeBlock';
import { DiagramEmbed } from './DiagramEmbed';
import { RoughDiagram } from './RoughDiagram';

const COMPONENTS = {
  Callout: CalloutBlock,
  Diagram: DiagramEmbed,
  RoughDiagram: RoughDiagram,
  pre: (props: any) => <CodeBlock {...props} />,
  h1: (props: any) => (
    <h1
      style={{
        fontSize: '24px',
        fontWeight: 800,
        color: 'var(--text-primary)',
        marginTop: '28px',
        marginBottom: '12px',
        letterSpacing: '-0.02em',
        lineHeight: '1.3',
      }}
      {...props}
    />
  ),
  h2: (props: any) => (
    <h2
      style={{
        fontSize: '19px',
        fontWeight: 700,
        color: 'var(--text-primary)',
        marginTop: '26px',
        marginBottom: '10px',
        borderBottom: '1px solid var(--border)',
        paddingBottom: '6px',
        lineHeight: '1.4',
      }}
      {...props}
    />
  ),
  h3: (props: any) => (
    <h3
      style={{
        fontSize: '16px',
        fontWeight: 700,
        color: 'var(--text-primary)',
        marginTop: '20px',
        marginBottom: '8px',
      }}
      {...props}
    />
  ),
  p: (props: any) => (
    <p
      style={{
        fontSize: '14.5px',
        lineHeight: '1.75',
        color: 'var(--text-secondary)',
        marginTop: '0',
        marginBottom: '14px',
      }}
      {...props}
    />
  ),
  ul: (props: any) => (
    <ul
      style={{
        paddingLeft: '22px',
        marginTop: '0',
        marginBottom: '14px',
        listStyleType: 'disc',
      }}
      {...props}
    />
  ),
  ol: (props: any) => (
    <ol
      style={{
        paddingLeft: '22px',
        marginTop: '0',
        marginBottom: '14px',
        listStyleType: 'decimal',
      }}
      {...props}
    />
  ),
  li: (props: any) => (
    <li
      style={{
        fontSize: '14.5px',
        lineHeight: '1.7',
        color: 'var(--text-secondary)',
        marginBottom: '6px',
      }}
      {...props}
    />
  ),
  strong: (props: any) => (
    <strong
      style={{
        fontWeight: 700,
        color: 'var(--text-primary)',
      }}
      {...props}
    />
  ),
  code: (props: any) => (
    <code
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '12px',
        background: 'var(--bg-elevated)',
        padding: '2px 5px',
        borderRadius: '4px',
        color: '#FF6600',
        border: '1px solid var(--border)',
        fontWeight: 600,
      }}
      {...props}
    />
  ),
  hr: (props: any) => (
    <hr
      style={{
        border: 'none',
        borderTop: '1px solid var(--border)',
        margin: '32px 0',
      }}
      {...props}
    />
  ),
  a: (props: any) => (
    <a
      style={{
        color: '#FF6600',
        textDecoration: 'underline',
        fontWeight: 500,
      }}
      {...props}
    />
  ),
};

interface LessonRendererProps {
  mdxSource: string;
}

export function LessonRenderer({ mdxSource }: LessonRendererProps) {
  const [compiled, setCompiled] = useState<any>(null);

  useEffect(() => {
    serialize(mdxSource, {
      mdxOptions: {
        development: process.env.NODE_ENV === 'development',
      },
    }).then(setCompiled);
  }, [mdxSource]);

  if (!compiled) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-5/6" />
        <div className="h-4 bg-gray-200 rounded w-2/3" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 'none' }}>
      <MDXRemote {...compiled} components={COMPONENTS} />
    </div>
  );
}
