import jsPDF from 'jspdf';
import type { BlockNoteContent } from './api-types';

interface BlockNoteBlock {
  id: string;
  type: string;
  props: Record<string, any>;
  content?: any;
  children: BlockNoteBlock[];
}

interface PDFOptions {
  fontSize?: number;
  lineHeight?: number;
  margin?: number;
  includeHeader?: boolean;
  includeFooter?: boolean;
  returnBuffer?: boolean;
}

/**
 * Export BlockNote content as a well-formatted PDF
 */
export async function exportBlockNoteToPDF(
  noteTitle: string,
  blocks: BlockNoteContent,
  options: PDFOptions = {}
): Promise<ArrayBuffer |void> {
  const {
    fontSize = 11,
    lineHeight = 7,
    margin = 15,
    includeHeader = true,
    includeFooter = true,
  } = options;

  try {
    if (!blocks || !Array.isArray(blocks)) {
        throw new Error('Invalid or empty content');
    }
    
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const contentWidth = pageWidth - (margin * 2);
    
    let currentY = margin;
    let currentPage = 1;

    // Helper to add new page
    const addNewPage = () => {
      doc.addPage();
      currentPage++;
      currentY = margin;
      
      if (includeHeader) {
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text(noteTitle, margin, margin - 5);
        doc.setTextColor(0);
      }
    };

    // Check if we need a new page
    const checkPageBreak = (requiredSpace: number) => {
      if (currentY + requiredSpace > pageHeight - margin) {
        addNewPage();
      }
    };

    // Add Title
    if (includeHeader) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(0, 0, 0);
      doc.text(noteTitle, margin, currentY);
      currentY += 12;
      
      // Add date
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text(`Exported on ${new Date().toLocaleDateString()}`, margin, currentY);
      doc.setTextColor(0);
      currentY += 10;
      
      // Add separator line
      doc.setDrawColor(200);
      doc.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 10; // Increased spacing after separator
    }

    const docBlocks = blocks as unknown as BlockNoteBlock[];

    // Process each block
    for (let i = 0; i < docBlocks.length; i++) {
      const block = docBlocks[i];
      
      // IMPORTANT: Check page break BEFORE rendering block
      const estimatedHeight = estimateBlockHeight(block, lineHeight);
      if (currentY + estimatedHeight > pageHeight - margin - 20) {
        addNewPage();
      }
      
      const blockContent = await formatBlock(doc, block, {
        currentY,
        margin,
        contentWidth,
        fontSize,
        lineHeight,
        pageHeight,
      });

      currentY = blockContent.newY;
      
      // Add small spacing between blocks
      currentY += 2;
    }

    // Add footer with page numbers
    if (includeFooter) {
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text(
          `Page ${i} of ${totalPages}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }
    }

    if (options.returnBuffer) {
      return doc.output('arraybuffer');
    }

    // Save the PDF
    const filename = `${noteTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
    doc.save(filename);
    
  } catch (error) {
    console.error('PDF Export Error:', error);
    throw new Error('Failed to export PDF');
  }
}

/**
 * Estimate block height to prevent page breaks mid-block
 */
function estimateBlockHeight(block: BlockNoteBlock, lineHeight: number): number {
  switch (block.type) {
    case 'heading':
      return 15;
    case 'paragraph':
      const text = extractTextContent(block.content);
      return Math.ceil(text.length / 80) * lineHeight + 5;
    case 'codeBlock':
      const code = extractTextContent(block.content);
      return code.split('\n').length * (lineHeight - 1) + 15;
    case 'quiz':
      try {
        const quizzesData = JSON.parse(block.props.quizzesData || '[]');
        return quizzesData.length * 65 + 20;
      } catch {
        return 30;
      }
    case 'flashcard':
      try {
        const flashcardData = JSON.parse(block.props.flashcardData || '[]');
        return flashcardData.length * 25 + 20;
      } catch {
        return 30;
      }
    case 'youtubeVideo':
      return 25;
    case 'table':
      if (!block.content?.rows) return 20;
      return block.content.rows.length * 10 + 15;
    case 'mermaid':
      return 25;
    case 'divider':
      return 10;
    default:
      return lineHeight * 3;
  }
}

/**
 * Format individual block types
 */
async function formatBlock(
  doc: jsPDF,
  block: BlockNoteBlock,
  context: {
    currentY: number;
    margin: number;
    contentWidth: number;
    fontSize: number;
    lineHeight: number;
    pageHeight: number;
  }
): Promise<{ newY: number; requiresNewPage: boolean }> {
  const checkSpace = (requiredSpace: number) => {
    if (currentY + requiredSpace > pageHeight - margin - 20) {
      requiresNewPage = true;
      currentY = margin;
    }
  };
  let { currentY, margin, contentWidth, fontSize, lineHeight, pageHeight } = context;
  let requiresNewPage = false;

  // Reset font to defaults at start of each block
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(fontSize);
  doc.setTextColor(0, 0, 0);

  switch (block.type) {
    case 'heading': {
      const level = block.props.level || 1;
      const sizes = { 1: 18, 2: 15, 3: 13 };
      const headingSize = sizes[level as keyof typeof sizes];
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(headingSize);
      
      const text = extractTextContent(block.content);
      const lines = doc.splitTextToSize(text, contentWidth);
      
      lines.forEach((line: string) => {
        doc.text(line, margin, currentY);
        currentY += headingSize * 0.4; // 👉 TIGHTER line height for headings
      });
      
      currentY += 2; // 👉 Less gap before the paragraph starts
      break;
    }

    case 'paragraph': {
      const text = extractTextContent(block.content);
      
      if (text.trim()) {
        const lines = doc.splitTextToSize(text, contentWidth);
        lines.forEach((line: string) => {
          doc.text(line, margin, currentY);
          currentY += lineHeight;
        });
        currentY += 2; // Small spacing after paragraph
      }
      break;
    }

    case 'bulletListItem':
    case 'numberedListItem': {
      checkSpace(lineHeight * 2);
      const text = extractTextContent(block.content);
      const bullet = block.type === 'bulletListItem' ? '•' : '1.';
      
      doc.text(bullet, margin, currentY);
      const lines = doc.splitTextToSize(text, contentWidth - 10);
      
      lines.forEach((line: string, idx: number) => {
        doc.text(line, margin + 7, currentY);
        if (idx < lines.length - 1) {
          currentY += lineHeight;
        }
      });
      currentY += lineHeight + 1;
      break;
    }

    case 'checkListItem': {
      checkSpace(lineHeight * 2);
      const text = extractTextContent(block.content);
      const checkbox = block.props.checked ? '☑' : '☐';
      
      doc.text(checkbox, margin, currentY);
      const lines = doc.splitTextToSize(text, contentWidth - 10);
      
      lines.forEach((line: string, idx: number) => {
        doc.text(line, margin + 7, currentY);
        if (idx < lines.length - 1) {
          currentY += lineHeight;
        }
      });
      currentY += lineHeight + 1;
      break;
    }

    case 'quote': {
      checkSpace(lineHeight * 3);
      const text = extractTextContent(block.content);
      
      // Draw left border
      doc.setDrawColor(100, 100, 200);
      doc.setLineWidth(1);
      const quoteHeight = Math.ceil(text.length / 80) * lineHeight + 4;
      doc.line(margin, currentY - 3, margin, currentY + quoteHeight);
      
      doc.setTextColor(80, 80, 80);
      doc.setFont('helvetica', 'italic');
      
      const lines = doc.splitTextToSize(text, contentWidth - 15);
      lines.forEach((line: string) => {
        doc.text(line, margin + 8, currentY);
        currentY += lineHeight;
      });
      
      doc.setTextColor(0);
      doc.setFont('helvetica', 'normal');
      currentY += 3;
      break;
    }

    case 'codeBlock':
    case 'mermaid': {
      const code = block.type === 'mermaid' ? (block.props.mermaidCode || '') : extractTextContent(block.content);
      const language = block.type === 'mermaid' ? 'mermaid' : (block.props.language || 'code');
      
      // Wrap long lines instead of truncating them!
      let wrappedLines: string[] = [];
      code.split('\n').forEach((line:any) => {
         const split = doc.splitTextToSize(line, contentWidth - 6);
         wrappedLines.push(...split);
      });

      const requiredHeight = (wrappedLines.length + 2) * (lineHeight - 1) + 10;
      checkSpace(requiredHeight);
      
      // Background box
      doc.setFillColor(245, 245, 245);
      doc.rect(margin, currentY - 5, contentWidth, requiredHeight, 'F');
      
      // Language label
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(language.toUpperCase(), margin + 3, currentY);
      currentY += lineHeight;
      
      // Code content
      doc.setFont('courier', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(0);
      
      wrappedLines.forEach((line) => {
        doc.text(line, margin + 3, currentY);
        currentY += lineHeight - 1;
      });
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(fontSize);
      currentY += 5;
      break;
    }

    case 'divider': {
      checkSpace(10);
      doc.setDrawColor(180);
      doc.setLineWidth(0.5);
      doc.line(margin + 20, currentY + 3, contentWidth + margin - 20, currentY + 3);
      currentY += 10;
      break;
    }

    case 'youtubeVideo': {
      checkSpace(25);
      const videoUrl = block.props.videoUrl;
      
      // Extract video ID
      let videoId = '';
      if (videoUrl.includes('embed/')) {
        videoId = videoUrl.split('embed/')[1]?.split('?')[0];
      }
      
      const watchUrl = videoId ? `https://youtube.com/watch?v=${videoId}` : videoUrl;
      
      // Box for YouTube
      doc.setFillColor(255, 245, 245);
      doc.rect(margin, currentY - 3, contentWidth, 20, 'F');
      
      // YouTube icon (red square)
      doc.setFillColor(255, 0, 0);
      doc.rect(margin + 3, currentY, 8, 6, 'F');
      doc.setFillColor(255, 255, 255);
      doc.triangle(
        margin + 5, currentY + 1.5,
        margin + 5, currentY + 4.5,
        margin + 8, currentY + 3,
        'F'
      );
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(0);
      doc.text('YouTube Video', margin + 14, currentY + 4);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 255);
      doc.textWithLink('Watch: ' + watchUrl, margin + 3, currentY + 12, { url: watchUrl });
      
      doc.setTextColor(0);
      doc.setFontSize(fontSize);
      currentY += 23;
      break;
    }

    case 'quiz': {
      const topic = block.props.topic || 'Quiz';
      let quizzesData = [];
      
      try {
        quizzesData = JSON.parse(block.props.quizzesData || '[]');
      } catch (e) {
        console.error('Invalid quiz data:', e);
        break; // Skip this block if data is invalid
      }
      
      if (!Array.isArray(quizzesData) || quizzesData.length === 0) {
        break; // Skip if no questions
      }
      
      // Quiz header
      doc.setFillColor(250, 250, 255);
      doc.rect(margin, currentY - 3, contentWidth, 12, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(` Quiz: ${topic}`, margin + 3, currentY + 4);
      
      currentY += 15;
      
      // Questions
      quizzesData.forEach((quiz: any, idx: number) => {
        // Ensure we don't page break in the middle of a question
        checkSpace(40);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(fontSize);
        doc.setTextColor(0, 0, 0);
        
        // Include difficulty if available
        const difficulty = quiz.difficulty ? ` [${quiz.difficulty}]` : '';
        const questionText = `Q${idx + 1}${difficulty}: ${quiz.question || 'No question'}`;
        const questionLines = doc.splitTextToSize(questionText, contentWidth - 6);
        
        questionLines.forEach((line: string) => {
          doc.text(line, margin + 3, currentY);
          currentY += lineHeight;
        });
        
        // Handle FRQ (Free Response) differently than Multiple Choice
        if (quiz.type === 'frq') {
           doc.setFont('helvetica', 'bold');
           doc.setFontSize(9);
           doc.setTextColor(0, 120, 0); // Dark Green
           
           const ansText = `Answer: ${quiz.correctAnswers?.[0] || 'See explanation'}`;
           const ansLines = doc.splitTextToSize(ansText, contentWidth - 12);
           ansLines.forEach((line: string) => {
             doc.text(line, margin + 6, currentY);
             currentY += lineHeight - 1;
           });
        } 
        // Handle Single/Multiple Choice Options
        else if (quiz.options && Array.isArray(quiz.options)) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          
          quiz.options.forEach((option: string) => {
            const isCorrect = quiz.correctAnswers && quiz.correctAnswers.includes(option);
            
            // CRITICAL FIX: Use standard ASCII characters instead of Unicode ✓/○
            const prefix = isCorrect ? '[X]' : '[  ]';
            
            if (isCorrect) {
              doc.setTextColor(0, 120, 0); // Dark Green
              doc.setFont('helvetica', 'bold');
            } else {
              doc.setTextColor(50, 50, 50); // Dark Gray
              doc.setFont('helvetica', 'normal');
            }
            
            // Wrap long options
            const optionText = `${prefix} ${option}`;
            const optLines = doc.splitTextToSize(optionText, contentWidth - 12);
            
            optLines.forEach((line: string) => {
              doc.text(line, margin + 6, currentY);
              currentY += lineHeight - 1;
            });
          });
        }

        // Add the Explanation below the answers
        if (quiz.explanation) {
           currentY += 2;
           doc.setFont('helvetica', 'italic');
           doc.setFontSize(8);
           doc.setTextColor(100, 100, 100); // Light Gray
           
           const expLines = doc.splitTextToSize(`Explanation: ${quiz.explanation}`, contentWidth - 12);
           expLines.forEach((line: string) => {
             doc.text(line, margin + 6, currentY);
             currentY += lineHeight - 2; // Slightly tighter line height for explanations
           });
        }
        
        currentY += 8; // Extra space between full questions
      });
      
      currentY += 5;
      break;
    }

    case 'flashcard': {
      const topic = block.props.topic || 'Flashcards';
      let flashcardData = [];
      
      try {
        flashcardData = JSON.parse(block.props.flashcardData || '[]');
      } catch (e) {
        console.error('Invalid flashcard data:', e);
        break; // Skip this block if data is invalid
      }
      
      if (!Array.isArray(flashcardData) || flashcardData.length === 0) {
        break; // Skip if no cards
      }
      
      // Flashcard header
      doc.setFillColor(255, 250, 240);
      doc.rect(margin, currentY - 3, contentWidth, 12, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(` Flashcards: ${topic}`, margin + 3, currentY + 4);
      
      currentY += 15;
      
      // Cards
      flashcardData.forEach((card: any, idx: number) => {
        // Card box
        doc.setDrawColor(220);
        doc.setLineWidth(0.3);
        doc.rect(margin + 3, currentY - 3, contentWidth - 6, 18);
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        
        const questionText = `Q: ${card.question || 'No question'}`;
        const qLines = doc.splitTextToSize(questionText, contentWidth - 12);
        doc.text(qLines[0], margin + 6, currentY + 2);
        
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 100, 0);
        
        const answerText = `A: ${card.answer || 'No answer'}`;
        const aLines = doc.splitTextToSize(answerText, contentWidth - 12);
        doc.text(aLines[0], margin + 6, currentY + 9);
        
        currentY += 22;
      });
      
      currentY += 5;
      break;
    }

    case 'table': {
      if (!block.content?.rows) break;
      
      const rows = block.content.rows;
      const requiredHeight = rows.length * 10 + 10;
      
      checkSpace(requiredHeight);
      
      const colCount = rows[0]?.cells.length || 1;
      const colWidth = contentWidth / colCount;
      
      rows.forEach((row: any, rowIdx: number) => {
        row.cells.forEach((cell: any, colIdx: number) => {
          const text = extractTextContent(cell.content);
          const x = margin + (colIdx * colWidth);
          
          // Header row
          if (rowIdx === 0) {
            doc.setFillColor(240, 240, 240);
            doc.rect(x, currentY - 5, colWidth, 8, 'F');
            doc.setFont('helvetica', 'bold');
          }
          
          doc.setFontSize(9);
          doc.text(text.substring(0, 30), x + 2, currentY);
          
          if (rowIdx === 0) {
            doc.setFont('helvetica', 'normal');
          }
        });
        
        currentY += 8;
      });
      
      doc.setFontSize(fontSize);
      currentY += 5;
      break;
    }


    default: {
      // Generic block handling
      if (block.content) {
        const text = extractTextContent(block.content);
        if (text.trim()) {
          checkSpace(lineHeight * 2);
          const lines = doc.splitTextToSize(text, contentWidth);
          lines.forEach((line: string) => {
            doc.text(line, margin, currentY);
            currentY += lineHeight;
          });
        }
      }
    }
  }

  return { newY: currentY, requiresNewPage };
}

/**
 * Extract plain text from BlockNote content array
 */
function extractTextContent(content: any[]): string {
  if (!content || !Array.isArray(content)) return '';
  
  return content.map(item => {
    if (item.type === 'text') {
      return item.text || '';
    }
    if (item.type === 'math') {
      return item.props?.latex || '';
    }
    return '';
  }).join('');
}

export async function exportNoteToPDF(
  noteTitle: string,
  blocks: BlockNoteContent,
  returnBuffer?:boolean
): Promise<ArrayBuffer |void> {
  return exportBlockNoteToPDF(noteTitle, blocks, {
    fontSize: 11,
    lineHeight: 7,
    margin: 15,
    includeHeader: true,
    includeFooter: true,
    returnBuffer:returnBuffer
  });
}