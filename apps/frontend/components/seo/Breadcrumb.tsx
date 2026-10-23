'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { JsonLd } from './JsonLd';
import { breadcrumbSchemaJsonLd } from '../../lib/seo';

export interface BreadcrumbItem {
  name: string;
  path: string;
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <>
      <JsonLd data={breadcrumbSchemaJsonLd(items)} />
      <nav aria-label="Breadcrumb" className="flex items-center space-x-1.5 text-xs text-gray-500 mb-4">
        {items.map((item, i) => (
          <span key={item.path} className="flex items-center space-x-1.5">
            {i > 0 && <ChevronRight className="w-3 h-3 text-gray-400" />}
            {i === items.length - 1 ? (
              <span className="text-gray-700 font-medium truncate max-w-[200px]" title={item.name}>
                {item.name}
              </span>
            ) : (
              <Link
                href={item.path}
                className="hover:text-gray-700 transition whitespace-nowrap"
              >
                {item.name}
              </Link>
            )}
          </span>
        ))}
      </nav>
    </>
  );
}
