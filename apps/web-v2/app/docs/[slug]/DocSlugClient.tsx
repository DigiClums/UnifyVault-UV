'use client';

import React from 'react';
import { getDocItemBySlug } from '../../../lib/docs/docsData';
import { MarkdownRenderer } from '../../../components/docs/MarkdownRenderer';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function DocSlugClient({ slug }: { slug: string }) {
  const doc = getDocItemBySlug(slug || 'introduction');

  if (!doc) {
    return (
      <div className="py-12 text-center space-y-4">
        <h2 className="text-2xl font-bold text-white">Documentation Page Not Found</h2>
        <p className="text-sm text-white/50">The requested guide or spec could not be found.</p>
        <Link
          href="/docs"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#BFFF00] text-black font-bold text-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Documentation</span>
        </Link>
      </div>
    );
  }

  return (
    <article className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-[#BFFF00] uppercase tracking-wider">
            {doc.category}
          </span>
          {doc.badge && (
            <span className="text-[9px] font-mono font-black px-1.5 py-0.5 rounded bg-[#BFFF00]/15 text-[#BFFF00] border border-[#BFFF00]/30">
              {doc.badge}
            </span>
          )}
        </div>
        <p className="text-sm text-white/50">{doc.description}</p>
      </div>

      <MarkdownRenderer content={doc.content} />
    </article>
  );
}
