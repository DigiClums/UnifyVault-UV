'use client';

import React from 'react';
import { getDocItemBySlug } from '../../lib/docs/docsData';
import { MarkdownRenderer } from '../../components/docs/MarkdownRenderer';

export default function DocsMainPage() {
  const doc = getDocItemBySlug('introduction');

  if (!doc) return <div>Document not found.</div>;

  return (
    <article className="space-y-6">
      <div className="space-y-2">
        <span className="text-xs font-mono font-bold text-[#BFFF00] uppercase tracking-wider">
          {doc.category}
        </span>
        <p className="text-sm text-white/50">{doc.description}</p>
      </div>

      <MarkdownRenderer content={doc.content} />
    </article>
  );
}
