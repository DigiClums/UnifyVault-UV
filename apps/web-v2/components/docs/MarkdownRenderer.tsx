'use client';

import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const parseInline = (text: string) => {
    // Process inline code, bold, links
    const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g);

    return parts.map((part, i) => {
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={i}
            className="px-1.5 py-0.5 rounded-md bg-white/10 text-[#BFFF00] font-mono text-[11px] border border-white/10"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-bold text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        return (
          <a
            key={i}
            href={linkMatch[2]}
            target="_blank"
            rel="noreferrer"
            className="text-[#BFFF00] hover:underline font-semibold"
          >
            {linkMatch[1]}
          </a>
        );
      }
      return part;
    });
  };

  const renderLines = () => {
    const rawLines = content.trim().split('\n');
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeContent: string[] = [];
    let tableRows: string[][] = [];

    const flushTable = (key: string) => {
      if (tableRows.length === 0) return;
      const headers = tableRows[0];
      const rows = tableRows.slice(2); // Skip separator

      elements.push(
        <div key={key} className="overflow-x-auto my-5 rounded-2xl border border-white/15 shadow-sm">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-white/10 text-white uppercase text-[10px] tracking-wider border-b border-white/15">
              <tr>
                {headers.map((h, i) => (
                  <th key={i} className="px-4 py-3 font-black">
                    {h.trim()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 bg-slate-950/60 text-white/80">
              {rows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-white/[0.04] transition-colors">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-4 py-3 leading-relaxed">
                      {parseInline(cell.trim())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
    };

    for (let idx = 0; idx < rawLines.length; idx++) {
      const line = rawLines[idx];

      // Code blocks
      if (line.startsWith('```')) {
        flushTable(`table-before-code-${idx}`);
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
        continue;
      }

      if (inCodeBlock) {
        codeContent.push(line);
        continue;
      }

      // Markdown Table Row
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        const cells = line
          .trim()
          .slice(1, -1)
          .split('|');
        tableRows.push(cells);
        continue;
      } else if (tableRows.length > 0) {
        flushTable(`table-${idx}`);
      }

      // Headings
      if (line.startsWith('# ')) {
        elements.push(
          <h1
            key={idx}
            className="text-2xl sm:text-4xl font-black text-white tracking-tight mb-4 mt-2"
          >
            {line.replace('# ', '')}
          </h1>
        );
      } else if (line.startsWith('## ')) {
        elements.push(
          <h2
            key={idx}
            className="text-lg sm:text-2xl font-black text-white tracking-tight mt-8 mb-3 pb-2 border-b border-white/10"
          >
            {line.replace('## ', '')}
          </h2>
        );
      } else if (line.startsWith('### ')) {
        elements.push(
          <h3 key={idx} className="text-base sm:text-lg font-bold text-[#BFFF00] tracking-tight mt-6 mb-2">
            {line.replace('### ', '')}
          </h3>
        );
      } else if (line.startsWith('> [!TIP]')) {
        elements.push(
          <div
            key={idx}
            className="p-4 rounded-2xl bg-[#BFFF00]/10 border-2 border-[#BFFF00]/40 text-[#d7ff66] text-xs font-mono my-4"
          >
            💡 <strong>TIP:</strong> Always interact with official verified contracts.
          </div>
        );
      } else if (line.startsWith('- ')) {
        elements.push(
          <li key={idx} className="text-xs sm:text-sm text-white/75 ml-4 list-disc my-1.5 leading-relaxed">
            {parseInline(line.replace('- ', ''))}
          </li>
        );
      } else if (/^\d+\.\s/.test(line)) {
        elements.push(
          <div key={idx} className="text-xs sm:text-sm text-white/80 my-2 leading-relaxed pl-1">
            {parseInline(line)}
          </div>
        );
      } else if (line.trim() === '---') {
        elements.push(<hr key={idx} className="my-6 border-white/10" />);
      } else if (line.trim().length > 0) {
        elements.push(
          <p key={idx} className="text-xs sm:text-sm text-white/70 leading-relaxed my-2.5">
            {parseInline(line)}
          </p>
        );
      }
    }

    flushTable('table-end');
    return elements;
  };

  return <div className="docs-content space-y-2">{renderLines()}</div>;
}
