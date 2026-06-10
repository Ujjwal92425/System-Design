'use client';

import { MDXRemote } from 'next-mdx-remote';
import { serialize } from 'next-mdx-remote/serialize';
import { useEffect, useState } from 'react';
import { CalloutBlock } from './CalloutBlock';
import { CodeBlock } from './CodeBlock';
import { DiagramEmbed } from './DiagramEmbed';

const COMPONENTS = {
  Callout: CalloutBlock,
  Diagram: DiagramEmbed,
  pre: (props: any) => <CodeBlock {...props} />,
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
        <div className="h-4 bg-zinc-800 rounded w-3/4" />
        <div className="h-4 bg-zinc-800 rounded w-full" />
        <div className="h-4 bg-zinc-800 rounded w-5/6" />
        <div className="h-4 bg-zinc-800 rounded w-2/3" />
      </div>
    );
  }

  return (
    <div className="prose prose-invert prose-zinc max-w-none
      prose-headings:font-black prose-headings:tracking-tight
      prose-h1:text-2xl prose-h2:text-xl prose-h2:mt-10 prose-h3:text-lg
      prose-p:text-zinc-300 prose-p:leading-relaxed
      prose-a:text-indigo-400 prose-a:no-underline hover:prose-a:underline
      prose-strong:text-zinc-100
      prose-code:text-indigo-300 prose-code:bg-zinc-900 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
      prose-blockquote:border-l-indigo-500 prose-blockquote:text-zinc-400
      prose-ul:text-zinc-300 prose-ol:text-zinc-300
      prose-li:marker:text-indigo-400
      prose-hr:border-zinc-800
    ">
      <MDXRemote {...compiled} components={COMPONENTS} />
    </div>
  );
}
