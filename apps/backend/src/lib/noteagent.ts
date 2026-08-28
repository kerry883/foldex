import { z } from "zod";
import { blocksSchema, BlockContentSchema } from "./ai-block-parser";
import { generateText, Output, type LanguageModel } from "ai";

// Type for the blocks array
type BlockContent = z.infer<typeof BlockContentSchema>;

// ============================================
// SYSTEM PROMPTS
// ============================================

const NOTE_CONTENT_RULES = `
You are a specialized note content generator. You MUST output structured JSON blocks, NOT markdown.

### Block Types Available:

1. **Heading**: { "type": "heading", "level": "1"|"2"|"3", "text": "..." }
2. **Paragraph**: { "type": "paragraph", "text": "..." }
3. **Bullet List**: { "type": "bulletList", "items": ["item1", "item2"] }
4. **Numbered List**: { "type": "numberedList", "items": ["item1", "item2"] }
5. **Check List**: { "type": "checkList", "items": [{"text": "...", "checked": false}] }
6. **Code Block**: { "type": "codeBlock", "language": "python", "code": "..." }
7. **Quote**: { "type": "quote", "text": "..." }
8. **Divider**: { "type": "divider" }
9. **Table**: { "type": "table", "headers": ["Col 1", "Col 2"], "rows": [["Row 1 Col 1", "Row 1 Col 2"], ["Row 2 Col 1", "Row 2 Col 2"]] }
10. **YouTube**: { "type": "youtube", "url": "https://youtube.com/watch?v=..." }
11. **Quiz**: { "type": "quiz", "topic": "...", "questions": [{ "question": "...", "type": "single", "difficulty": "Easy", "options": ["A", "B"], "correctAnswers": ["A"], "explanation": "..." }] }
12. **Flashcard**: { "type": "flashcard", "topic": "...", "flashcards": [{ "question": "...", "answer": "...", "explanation": "...", "difficulty": "Easy" }] }
13. **Mermaid**: { "type": "mermaid", "mermaidCode": "..." }
14. **LaTeX**: { "type": "latex", "latex": "\\\\frac{a}{b}" }

### Inline Formatting in Text:
- Bold: **text**
- Italic: *text*
- Code: \`code\`
- Math: $formula$ (use LaTeX: $\\frac{a}{b}$, $x^2$, $\\sqrt{x}$)
- Use a dedicated latex block for standalone display equations that should appear on their own line

### Quiz Question Format:
{
  "question": "What is...?",
  "type": "single" | "multiple" | "frq",
  "difficulty": "Easy" | "Medium" | "Hard",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswers": ["Option B"],
  "explanation": "Because..."
}

### Flashcard Format:
{
  "question": "What is...?",
  "answer": "...",
  "explanation": "Because...",
  "difficulty": "Easy" | "Medium" | "Hard"
}

### Rules:
1. Always output an array of blocks in the correct structure
2. NO raw markdown syntax in the output structure
3. Text fields can use inline formatting: **bold**, *italic*, \`code\`, $math$
4. Quiz questions must have valid correctAnswers matching options exactly
5. YouTube URLs must be valid YouTube watch URLs
`;

// ============================================
// CREATE NOTE CONTENT
// ============================================

export interface CreateNoteContentParams {
  topic: string;
  context?: string;           // Web search results, additional info
  youtubeUrls?: string[];     // YouTube video URLs to include
  includeQuiz?: boolean;      // Whether to include a quiz at the end
  quizQuestionCount?: number; // Number of quiz questions (default: 3)
  includeMermaid?: boolean;   // Whether to include a mermaid diagram at the end
  model: LanguageModel;     // The AI model to use (user's selected model)
}

export async function createNoteContent(params: CreateNoteContentParams): Promise<BlockContent[]> {
  const {
    topic,
    context = "",
    youtubeUrls = [],
    includeQuiz = true,
    quizQuestionCount = 3,
    includeMermaid = true,
    model,
  } = params;

  // Build the prompt
  const youtubeSection = youtubeUrls.length > 0
    ? `\n\nYouTube Videos to Include:\n${youtubeUrls.map((url, i) => `${i + 1}. ${url}`).join('\n')}\nYou MUST include these as "youtube" blocks in appropriate places in the note.`
    : '';

  const contextSection = context
    ? `\n\nAdditional Context/Research:\n${context}`
    : '';

  const quizSection = includeQuiz
    ? `\n\nIMPORTANT: End the note with a "quiz" and "flashcard" block containing ${quizQuestionCount} questions each to test understanding of the topic.`
    : '';

  const mermaidSection = includeMermaid
    ? `\n\nIMPORTANT:  add a "mermaid" block containing a mermaid diagram to visualize the topic.`
    : '';

  const prompt = `
${NOTE_CONTENT_RULES}

Create comprehensive study notes about: "${topic}"
${contextSection}
${youtubeSection}
${quizSection}
${mermaidSection}

Structure your notes with:
1. A main heading (level 1) as the title
2. Clear section headings (level 2) for different aspects
3. Explanatory paragraphs
4. Code examples where relevant (with proper language tags)
5. Bullet/numbered lists for key points
6. Tables for comparisons if applicable
${youtubeUrls.length > 0 ? '7. YouTube video blocks in relevant sections' : ''}
${includeQuiz ? `8. A quiz section at the end with ${quizQuestionCount} questions` : ''}
${includeMermaid ? `9. Add a mermaid diagram` : ''}

Generate the blocks array now:
`;

  console.log('=== NOTES AGENT: Creating note content ===');
  console.log('Topic:', topic);
  console.log('YouTube URLs:', youtubeUrls);
  console.log('Include Quiz:', includeQuiz);

  const { output } = await generateText({
    model,
    output: Output.object({schema:blocksSchema}),
    prompt: prompt,
  });

  console.log('=== NOTES AGENT: Generated blocks ===');
  console.log('Block count:', output.length);

  return output;
}

// ============================================
// UPDATE NOTE CONTENT
// ============================================

export interface UpdateNoteContentParams {
  existingMarkdown: string;   // Current note content as markdown
  updateInstructions: string; // What the user wants to change/add
  newContext?: string;        // Additional context for the update
  youtubeUrls?: string[];     // New YouTube videos to add
  includeQuiz?: boolean;
  quizQuestionCount?: number;
  includeMermaid?: boolean;
  model: LanguageModel;     // The AI model to use (user's selected model)
}

export async function updateNoteContent(params: UpdateNoteContentParams): Promise<BlockContent[]> {
  const {
    existingMarkdown,
    updateInstructions,
    newContext = "",
    youtubeUrls = [],
    includeQuiz = true,
    quizQuestionCount = 5,
    includeMermaid = true,
    model,
  } = params;

  // Special markers explanation for the LLM
  const markersExplanation = `
Note: The existing content uses special markers:
- @youtube[URL] represents a YouTube video block
- @quiz[topic]{JSON} represents a quiz block
- @flashcard[topic]{JSON} represents a flashcard block
- @latex[expression] represents a standalone LaTeX block
These should be preserved or converted to the proper block format in your output.
`;

  const youtubeSection = youtubeUrls.length > 0
    ? `\n\nNew YouTube Videos to Include:\n${youtubeUrls.map((url, i) => `${i + 1}. ${url}`).join('\n')}`
    : '';

  const contextSection = newContext
    ? `\n\nAdditional Context for Update:\n${newContext}`
    : '';
   const quizSection = includeQuiz
    ? `\n\nIMPORTANT: End the note with a "quiz" and "flashcard" block containing ${quizQuestionCount} questions each to test understanding of the topic.`
    : '';

  const mermaidSection = includeMermaid
    ? `\n\nIMPORTANT:  add a "mermaid" block containing a mermaid diagram to visualize the topic.`
    : '';
  const prompt = `
${NOTE_CONTENT_RULES}

You are updating an existing note. Here is the current content:

=== EXISTING NOTE (Markdown Format) ===
${existingMarkdown}
=== END EXISTING NOTE ===

${markersExplanation}

User's Update Request: "${updateInstructions}"
${contextSection}
${youtubeSection}
${quizSection}
${mermaidSection}

Instructions:
1. PRESERVE all existing content that the user didn't ask to change
2. APPLY the user's requested changes/additions
3. MAINTAIN the original structure and organization
4. If adding new sections, place them in logical positions
5. Convert all content (existing + new) to the structured block format
6. If there are @youtube[] markers, convert them to proper youtube blocks
7. If there are @quiz[] markers, convert them to proper quiz blocks
8. If there are @flashcard[] markers, convert them to proper flashcard blocks
9. If there are @latex[] markers, convert them to proper latex blocks
Generate the COMPLETE updated blocks array (not just the changes):
`;

  console.log('=== NOTES AGENT: Updating note content ===');
  console.log('Update instructions:', updateInstructions);
  console.log('Existing content length:', existingMarkdown.length);

  const { output } = await generateText({
    model,
    output: Output.object({schema:blocksSchema}),
    prompt: prompt,
  });

  console.log('=== NOTES AGENT: Updated blocks ===');
  console.log('Block count:', output.length);

  return output;
}