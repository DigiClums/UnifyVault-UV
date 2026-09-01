/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const docsDir = '/var/www/UnifyVault-UV/docs';
const outputDir = path.join(docsDir, 'pdf_export');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function sanitizeText(str) {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/\$/g, '\\$')
    .replace(/#/g, '\\#')
    .replace(/@/g, '\\@')
    .replace(/_/g, '\\_')
    .replace(/\*/g, '\\*')
    .replace(/`/g, '\\`')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function convertMdToTypst(mdContent, docTitle) {
  const lines = mdContent.split('\n');
  let body = '';
  let inCodeBlock = false;
  let codeLang = '';
  let codeBuffer = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        body += '```' + codeLang + '\n' + codeBuffer.join('\n') + '\n```\n\n';
        inCodeBlock = false;
        codeBuffer = [];
        codeLang = '';
      } else {
        inCodeBlock = true;
        codeLang = line.trim().replace(/^```/, '').trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    // Convert markdown table rows to neat bullet lines
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const cells = line
        .split('|')
        .slice(1, -1)
        .map((c) => c.trim());
      if (cells.every((c) => /^:?-+:?$/.test(c))) {
        continue;
      }
      body += `- *${sanitizeText(cells[0])}*: ${cells
        .slice(1)
        .map((c) => sanitizeText(c))
        .join(' | ')}\n`;
      continue;
    }

    if (line.startsWith('# ')) {
      body += `\n= ${sanitizeText(line.slice(2).trim())}\n\n`;
    } else if (line.startsWith('## ')) {
      body += `\n== ${sanitizeText(line.slice(3).trim())}\n\n`;
    } else if (line.startsWith('### ')) {
      body += `\n=== ${sanitizeText(line.slice(4).trim())}\n\n`;
    } else if (line.startsWith('#### ')) {
      body += `\n==== ${sanitizeText(line.slice(5).trim())}\n\n`;
    } else if (/^\s*[-*+]\s+/.test(line)) {
      const match = line.match(/^\s*[-*+]\s+(.*)$/);
      body += `- ${sanitizeText(match[1])}\n`;
    } else if (/^\s*\d+\.\s+/.test(line)) {
      const match = line.match(/^\s*\d+\.\s+(.*)$/);
      body += `+ ${sanitizeText(match[1])}\n`;
    } else if (line.startsWith('> ')) {
      body += `\n#rect(width: 100%, stroke: (left: 3pt + rgb("2563eb")), fill: rgb("eff6ff"), inset: 8pt)[\n  ${sanitizeText(line.slice(2).trim())}\n]\n\n`;
    } else if (line.trim() === '') {
      body += '\n';
    } else {
      body += `${sanitizeText(line)}\n\n`;
    }
  }

  const safeTitle = sanitizeText(docTitle);

  return `
#set page(
  paper: "a4",
  margin: (x: 2cm, top: 2.2cm, bottom: 2.2cm)
)

#set text(
  font: ("Liberation Sans", "DejaVu Sans"),
  size: 10pt,
  fill: rgb("1e293b")
)
#set par(justify: true)

#align(center)[
  #block(
    fill: rgb("0f172a"),
    inset: (x: 20pt, y: 15pt),
    radius: 6pt,
    width: 100%
  )[
    #text(fill: rgb("38bdf8"), size: 9pt, weight: "bold")[UNIFYVAULT PROTOCOL DOCUMENTATION] \
    #v(4pt)
    #text(fill: rgb("ffffff"), size: 16pt, weight: "bold")[${safeTitle}]
  ]
]

#v(12pt)

${body}
`;
}

const files = fs.readdirSync(docsDir).filter((f) => f.endsWith('.md'));

for (const file of files) {
  const filePath = path.join(docsDir, file);
  const title = file.replace(/\.md$/, '').replace(/_/g, ' ');
  const md = fs.readFileSync(filePath, 'utf8');
  const typstSrc = convertMdToTypst(md, title);

  const tempTyp = path.join('/tmp', `${path.basename(file, '.md')}.typ`);
  const targetPdf = path.join(outputDir, `${path.basename(file, '.md')}.pdf`);

  fs.writeFileSync(tempTyp, typstSrc);
  try {
    execSync(`typst compile "${tempTyp}" "${targetPdf}"`);
    console.log(`[OK] Generated: ${path.basename(targetPdf)}`);
  } catch (err) {
    console.error(`[FAIL] ${file}: ${err.message}`);
  }
}
console.log('Batch processing completed!');
