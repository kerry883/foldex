import type { BlockNoteContent } from "./api-types";

interface BlockNoteBlock {
  id: string;
  type: string;
  props: Record<string, any>;
  content?: any; // Can be array or object (for tables)
  children: BlockNoteBlock[];
}

export function blockNoteToMarkdown(blocks: BlockNoteContent): string {
  try {
    if (!blocks || !Array.isArray(blocks)) {
      return '';
    }

    const docBlocks = blocks as unknown as BlockNoteBlock[];
    const lines: string[] = [];

    for (const block of docBlocks) {
      const line = blockToMarkdown(block);
      if (line !== null) {
        lines.push(line);
      }
    }

    return lines.join('\n');
  } catch (error) {
    console.error('Error converting BlockNote to Markdown:', error);
    return '';
  }
}

function blockToMarkdown(block: BlockNoteBlock): string | null {
  switch (block.type) {
    case 'heading': {
      const level = block.props.level || 1;
      const hashes = '#'.repeat(level);
      const content = contentToMarkdown(block.content);
      return `${hashes} ${content}`;
    }

    case 'paragraph': {
      return contentToMarkdown(block.content) || '';
    }

    case 'quote': {
      const content = contentToMarkdown(block.content);
      return `> ${content}`;
    }

    case 'bulletListItem': {
      return `- ${contentToMarkdown(block.content)}`;
    }

    case 'numberedListItem': {
      return `1. ${contentToMarkdown(block.content)}`;
    }

    case 'checkListItem': {
      const checked = block.props.checked ? 'x' : ' ';
      return `- [${checked}] ${contentToMarkdown(block.content)}`;
    }

    case 'codeBlock': {
      const language = block.props.language || '';
      const code = Array.isArray(block.content) ? block.content.map(c => c.text).join('') : '';
      return `\`\`\`${language}\n${code}\n\`\`\``;
    }

    case 'divider': {
      return '---';
    }

    case 'mermaid': {
      return `\`\`\`mermaid\n${block.props.mermaidCode}\n\`\`\``;
    }

    case 'latex': {
      return `@latex[${block.props.latex}]`;
    }

    case 'flashcard': {
      return `@flashcard[${block.props.topic}]{${block.props.flashcardData}}`;
    }

    case 'youtubeVideo': {
      return `@youtube[${block.props.videoUrl}]`;
    }

    case 'quiz': {
      return `@quiz[${block.props.topic}]{${block.props.quizzesData}}`;
    }

    case 'table': {
      if (!block.content || !block.content.rows) return null;
      
      const rows = block.content.rows;
      const tableLines: string[] = [];

      rows.forEach((row: any, idx: number) => {
        const cells = row.cells.map((cell: any) => {
          return contentToMarkdown(cell.content);
        });
        tableLines.push(`| ${cells.join(' | ')} |`);

        if (idx === 0) {
          const separator = cells.map(() => '---').join(' | ');
          tableLines.push(`| ${separator} |`);
        }
      });

      return tableLines.join('\n');
    }

    default: {
      return contentToMarkdown(block.content || []) || '';
    }
  }
}

function contentToMarkdown(content: any[]): string {
  if (!content || content.length === 0) return '';

  return content.map(segment => {
    if (segment.type === 'math') {
      return `$${segment.props.latex}$`;
    }

    if (segment.type === 'text') {
      let text = segment.text || '';
      const styles = segment.styles || {};

      if (styles.code) return `\`${text}\``;
      if (styles.strike) text = `~~${text}~~`;
      if (styles.bold && styles.italic) return `***${text}***`;
      if (styles.bold) return `**${text}**`;
      if (styles.italic) return `*${text}*`;

      return text;
    }

    return '';
  }).join('');
}

// Utility functions
export function isValidBlockNoteJSON(json: string): boolean {
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return false;
    return parsed.every((block: any) =>
      block.id &&
      block.type &&
      block.props &&
      Array.isArray(block.children)
    );
  } catch {
    return false;
  }
}

export function blockNoteToPlainText(blocks: BlockNoteContent): string {
  try {
    if (!blocks || !Array.isArray(blocks)) return '';
    const texts = blocks.map(block => {
      if (Array.isArray(block.content)) {
        return block.content
          .filter(c => c.type === 'text')
          .map(c => c.text)
          .join('')
          .trim();
      }
      return '';
    }).filter(Boolean);
    return texts.join(' ');
  } catch {
    return '';
  }
}

export function getBlockNoteWordCount(blocks: BlockNoteContent): number {
  const plainText = blockNoteToPlainText(blocks);
  if (!plainText) return 0;
  return plainText.split(/\s+/).filter(Boolean).length;
}