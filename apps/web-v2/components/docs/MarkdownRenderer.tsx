'use client';

import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  // Simple clean markdown parser for docs formatting
  const renderLines = () => {
    const lines = content.trim().split('\n');
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeContent: string[] = [];

    lines.forEach((line, idx) => {
      // Code blocks
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          elements.push(
            <pre
              key={`code-${idx}`}
              className="p-4 rounded-2xl bg-slate-900 border border-white/10 font-mono text-xs text-[#BFFF00] overflow-x-auto my-4 shadow-inner"
            >
              <code>{codeContent.join('\n')}</code>
            </pre>
          );
          codeContent = [];
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
        }
        return;
      }

      if (inCodeBlock) {
        codeContent.push(line);
        return;
      }

      // Headings
      if (line.startsWith('# ')) {
        elements.push(
          <h1
            key={idx}
            className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-4 mt-2"
          >
            {line.replace('# ', '')}
          </h1>
        );
      } else if (line.startsWith('## ')) {
        elements.push(
          <h2
            key={idx}
            className="text-xl sm:text-2xl font-black text-white tracking-tight mt-8 mb-3 pb-2 border-b border-white/10"
          >
            {line.replace('## ', '')}
          </h2>
        );
      } else if (line.startsWith('### ')) {
        elements.push(
          <h3 key={idx} className="text-lg font-bold text-[#BFFF00] tracking-tight mt-6 mb-2">
            {line.replace('### ', '')}
          </h3>
        );
      } else if (line.startsWith('> [!TIP]')) {
        elements.push(
          <div
            key={idx}
            className="p-4 rounded-2xl bg-[#BFFF00]/10 border-2 border-[#BFFF00]/40 text-[#d7ff66] text-xs font-mono my-4"
          >
            💡 <strong>TIP:</strong>
          </div>
        );
      } else if (line.startsWith('- ')) {
        elements.push(
          <li key={idx} className="text-sm text-white/75 ml-4 list-disc my-1 leading-relaxed">
            {line.replace('- ', '')}
          </li>
        );
      } else if (line.trim() === '---') {
        elements.push(<hr key={idx} className="my-6 border-white/10" />);
      } else if (line.trim().length > 0) {
        elements.push(
          <p key={idx} className="text-sm sm:text-base text-white/70 leading-relaxed my-2.5">
            {line}
          </p>
        );
      }
    });

    return elements;
  };

  return <div className="docs-content space-y-2">{renderLines()}</div>;
}
