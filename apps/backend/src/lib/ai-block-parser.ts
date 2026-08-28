
import { randomUUID } from "crypto";
import { z } from "zod";

const QuizQuestionSchema = z.object({
  question: z.string().describe("The question text"),
  type: z.enum(["single", "multiple","frq"]).describe("Single or multiple choice"),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  options: z.array(z.string()).min(1).max(6).describe("Answer options.one for frq"),
  correctAnswers: z.array(z.string()).describe("Correct answer(s) - must match options exactly"),
  explanation: z.string().describe("Detailed explanation of the correct answer")
});

const flashcardSchema=z.object({
  question:z.string(),
  answer:z.string(),
  explanation:z.string(),
  difficulty:z.enum(["Easy","Medium","Hard"]),
})
// Schema for block-level content
export const BlockContentSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("heading"),
    level: z.enum(["1", "2", "3"]),
    text: z.string()
  }),
  z.object({
    type: z.literal("paragraph"),
    text: z.string()
  }),
  z.object({
    type: z.literal("bulletList"),
    items: z.array(z.string())
  }),
  z.object({
    type: z.literal("numberedList"),
    items: z.array(z.string())
  }),
  z.object({
    type: z.literal("checkList"),
    items: z.array(z.object({
      text: z.string(),
      checked: z.boolean()
    }))
  }),
  z.object({
    type: z.literal("codeBlock"),
    language: z.string(),
    code: z.string()
  }),
  z.object({
    type: z.literal("quote"),
    text: z.string()
  }),
  z.object({
    type: z.literal("divider")
  }),
  z.object({
    type: z.literal("table"),
    headers: z.array(z.string()).describe("List of column header strings"),
    rows: z.array(z.array(z.string())).describe("List of rows. EACH row MUST be an array of strings (one string per column).")
  }),
  z.object({
    type: z.literal("youtube"),
    url: z.string().url().describe("YouTube video URL")
  }),
  z.object({
    type: z.literal("quiz"),
    topic: z.string(),
    questions: z.array(QuizQuestionSchema).describe("List of quiz question objects. MUST be objects, not strings.")
  }),
  z.object({
    type: z.literal("mermaid"),
    mermaidCode: z.string()
  }),
  z.object({
    type: z.literal("latex"),
    latex: z.string().describe("LaTeX expression for a standalone display math block")
  }),
  z.object({
    type:z.literal('flashcard'),
    topic:z.string(),
    flashcards:z.array(flashcardSchema).describe("List of flashcard objects. MUST be objects, not strings.")
  })
]);

// Schema for complete note structure
export const NoteStructureSchema = z.object({
  title: z.string().describe("Note title"),
  blocks: z.array(BlockContentSchema).describe("Array of content blocks in order")
});
export const blocksSchema = z.array(BlockContentSchema).describe("Array of content blocks in order")
// ========================================
// 2. CONVERSION FUNCTIONS: SCHEMA → BLOCKNOTE
// ========================================

export function parseInlineFormatting(text: string): any[] {
  const segments: any[] = [];
  let currentText = '';
  let i = 0;

  while (i < text.length) {
    // Math inline ($latex$)
    if (text[i] === '$' && text[i + 1] !== '$') {
      if (currentText) {
        segments.push({ type: 'text', text: currentText, styles: {} });
        currentText = '';
      }
      const endIndex = text.indexOf('$', i + 1);
      if (endIndex !== -1) {
        const latex = text.substring(i + 1, endIndex);
        segments.push({ type: 'math', props: { latex: latex.trim() } });
        i = endIndex + 1;
        continue;
      }
    }

    // Bold (**text**)
    if (text.substr(i, 2) === '**') {
      if (currentText) {
        segments.push({ type: 'text', text: currentText, styles: {} });
        currentText = '';
      }
      const endIndex = text.indexOf('**', i + 2);
      if (endIndex !== -1) {
        const boldText = text.substring(i + 2, endIndex);
        segments.push({ type: 'text', text: boldText, styles: { bold: true } });
        i = endIndex + 2;
        continue;
      }
    }

    // Italic (*text*)
    if (text[i] === '*' && text[i + 1] !== '*') {
      if (currentText) {
        segments.push({ type: 'text', text: currentText, styles: {} });
        currentText = '';
      }
      const endIndex = text.indexOf('*', i + 1);
      if (endIndex !== -1 && text[endIndex + 1] !== '*') {
        const italicText = text.substring(i + 1, endIndex);
        segments.push({ type: 'text', text: italicText, styles: { italic: true } });
        i = endIndex + 1;
        continue;
      }
    }

    // Inline code (`code`)
    if (text[i] === '`' && text[i + 1] !== '`') {
      if (currentText) {
        segments.push({ type: 'text', text: currentText, styles: {} });
        currentText = '';
      }
      const endIndex = text.indexOf('`', i + 1);
      if (endIndex !== -1) {
        const codeText = text.substring(i + 1, endIndex);
        segments.push({ type: 'text', text: codeText, styles: { code: true } });
        i = endIndex + 1;
        continue;
      }
    }

    currentText += text[i];
    i++;
  }

  if (currentText) {
    segments.push({ type: 'text', text: currentText, styles: {} });
  }

  return segments.length > 0 ? segments : [{ type: 'text', text: '', styles: {} }];
}

export function convertSchemaToBlockNote(content: z.infer<typeof blocksSchema>) {
  const blocks: any[] = [];

  for (const block of content) {
    switch (block.type) {
      case 'heading':
        blocks.push({
          id: randomUUID(),
          type: 'heading',
          props: {
            backgroundColor: 'default',
            textColor: 'default',
            textAlignment: 'left',
            level: parseInt(block.level),
            isToggleable: false
          },
          content: parseInlineFormatting(block.text),
          children: []
        });
        break;

      case 'paragraph':
        blocks.push({
          id: randomUUID(),
          type: 'paragraph',
          props: {
            backgroundColor: 'default',
            textColor: 'default',
            textAlignment: 'left'
          },
          content: parseInlineFormatting(block.text),
          children: []
        });
        break;

      case 'bulletList':
        block.items.forEach(item => {
          blocks.push({
            id: randomUUID(),
            type: 'bulletListItem',
            props: {
              backgroundColor: 'default',
              textColor: 'default',
              textAlignment: 'left'
            },
            content: parseInlineFormatting(item),
            children: []
          });
        });
        break;

      case 'numberedList':
        block.items.forEach(item => {
          blocks.push({
            id: randomUUID(),
            type: 'numberedListItem',
            props: {
              backgroundColor: 'default',
              textColor: 'default',
              textAlignment: 'left'
            },
            content: parseInlineFormatting(item),
            children: []
          });
        });
        break;

      case 'checkList':
        block.items.forEach(item => {
          blocks.push({
            id: randomUUID(),
            type: 'checkListItem',
            props: {
              backgroundColor: 'default',
              textColor: 'default',
              textAlignment: 'left',
              checked: item.checked
            },
            content: parseInlineFormatting(item.text),
            children: []
          });
        });
        break;

      case 'codeBlock':
        blocks.push({
          id: randomUUID(),
          type: 'codeBlock',
          props: {
            language: block.language
          },
          content: [{ type: 'text', text: block.code, styles: {} }],
          children: []
        });
        break;

      case 'quote':
        blocks.push({
          id: randomUUID(),
          type: 'quote',
          props: {
            backgroundColor: 'default',
            textColor: 'default'
          },
          content: parseInlineFormatting(block.text),
          children: []
        });
        break;

      case 'divider':
        blocks.push({
          id: randomUUID(),
          type: 'divider',
          props: {},
          children: []
        });
        break;

      case 'table':
        const tableContent = {
          type: 'tableContent',
          columnWidths: Array(block.headers.length).fill(null),
          rows: [
            {
              cells: block.headers.map(header => ({
                type: 'tableCell',
                content: parseInlineFormatting(header),
                props: {
                  colspan: 1,
                  rowspan: 1,
                  backgroundColor: 'default',
                  textColor: 'default',
                  textAlignment: 'left'
                }
              }))
            },
            ...block.rows.map(row => ({
              cells: row.map(cell => ({
                type: 'tableCell',
                content: parseInlineFormatting(cell),
                props: {
                  colspan: 1,
                  rowspan: 1,
                  backgroundColor: 'default',
                  textColor: 'default',
                  textAlignment: 'left'
                }
              }))
            }))
          ]
        };
        blocks.push({
          id: randomUUID(),
          type: 'table',
          props: { textColor: 'default' },
          content: tableContent,
          children: []
        });
        break;

      case 'youtube':
        let videoUrl = block.url;
        // Convert to embed format
        if (videoUrl.includes('youtube.com/watch?v=')) {
          const videoId = new URL(videoUrl).searchParams.get('v');
          videoUrl = `https://www.youtube.com/embed/${videoId}`;
        } else if (videoUrl.includes('youtu.be/')) {
          const videoId = videoUrl.split('youtu.be/')[1].split('?')[0];
          videoUrl = `https://www.youtube.com/embed/${videoId}`;
        }
        blocks.push({
          id: randomUUID(),
          type: 'youtubeVideo',
          props: {
            backgroundColor: 'default',
            textColor: 'default',
            textAlignment: 'left',
            videoUrl: videoUrl
          },
          children: []
        });
        break;

      case 'quiz':
        blocks.push({
          id: randomUUID(),
          type: 'quiz',
          props: {
            topic: block.topic,
            quizzesData: JSON.stringify(block.questions),
            isGeneratingInitial: false
          },
          children: []
        });
        break;
      case 'mermaid':
        blocks.push({
          id:randomUUID(),
          type:'mermaid',
          props:{
            mermaidCode:block.mermaidCode
          },
          children:[]
        })
        break;
      case 'latex':
        blocks.push({
          id: randomUUID(),
          type: 'latex',
          props: {
            latex: block.latex
          },
          children: []
        });
        break;
      case 'flashcard':
        blocks.push({
          id:randomUUID(),
          type:'flashcard',
          props:{
            topic:block.topic,
            flashcardData:JSON.stringify(block.flashcards),
            isGeneratingInitial:false
          },
          children:[]
        })
        break;
    }
  }

  return blocks;
}

interface BlockNoteBlock {
  id: string;
  type: string;
  props: Record<string, any>;
  content?: any; // Can be array or object (for tables)
  children: BlockNoteBlock[];
}
export type BlockNoteContent = Record<string, unknown>[] | null;
export function blockNoteToMarkdown(blocks:BlockNoteContent): string {
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