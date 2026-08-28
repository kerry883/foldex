import mammoth from "mammoth";
import Tesseract from "tesseract.js";
import JSZip from "jszip";
import { toast } from "sonner";

export type ExtractionResult = {
  text: string;
  method: "pdf" | "docx" | "ocr" | "pptx" | "plaintext";
};

// --- THE UNIVERSAL TEXT EXTRACTOR ---
export async function extractTextFromFilePart(filePart: { mediaType: string, url: string, filename?: string }): Promise<ExtractionResult> {
  const fileType = filePart.mediaType;
  const response = await fetch(filePart.url);
  const arrayBuffer = await response.arrayBuffer();

  let extractedData: ExtractionResult | null = null;

  try {
    // 1. Handle PDFs
    if (fileType === "application/pdf") {
        const pdfjs = await import("pdfjs-dist");
        
        // Use secure HTTPS Unpkg CDN to prevent module loading errors
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
        
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        let fullText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          fullText += textContent.items.map((item: any) => item.str).join(" ");
        }
        extractedData = { text: fullText, method: "pdf" };
    }

    // 2. Handle DOCX
    else if (fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const result = await mammoth.extractRawText({ arrayBuffer });
      extractedData = { text: result.value, method: "docx" };
    }

    // 3A. TRAP LEGACY PPT FILES
    else if (fileType === "application/vnd.ms-powerpoint") {
      toast.error("Legacy .ppt files are not supported. Please open it in PowerPoint and 'Save As' a modern .pptx file.")
      throw new Error("Legacy .ppt files are not supported. Please open it in PowerPoint and 'Save As' a modern .pptx file.");
    }

    // 3B. Handle Modern PPTX (PowerPoint)
    else if (fileType === "application/vnd.openxmlformats-officedocument.presentationml.presentation") {
      const zip = await JSZip.loadAsync(arrayBuffer);
      let fullText = "";
      
      const slideFiles = Object.keys(zip.files).filter(name => name.startsWith('ppt/slides/slide') && name.endsWith('.xml'));
      
      for (const slideName of slideFiles) {
          const content = await zip.file(slideName)?.async('string');
          if (content) {
              const matches = content.match(/<a:t>(.*?)<\/a:t>/g);
              if (matches) {
                  const slideText = matches.map(m => m.replace(/<a:t>/g, '').replace(/<\/a:t>/g, '')).join(' ');
                  fullText += slideText + "\n\n";
              }
          }
      }
      extractedData = { text: fullText, method: "pptx" };
    }

    // 4. Handle Images (OCR)
    else if (fileType.startsWith("image/")) {
      const result = await Tesseract.recognize(filePart.url, "eng", {
        logger: (m) => console.log("OCR Progress:", m.status, Math.round(m.progress * 100) + "%"), 
      });
      
      const text = result.data.text.trim();
      
      if (text.length < 10) {
        throw new Error("No readable text found in this image.");
      }
      extractedData = { text, method: "ocr" };
    }

    // 5. Handle plain text files
    else if (fileType.startsWith("text/")) {
        const decoder = new TextDecoder('utf-8');
        extractedData = { text: decoder.decode(arrayBuffer), method: "plaintext" };
    }

    // If we didn't match anything, throw unsupported
    if (!extractedData) {
        throw new Error("Unsupported file format");
    }

    // THE CONSOLE LOG: See exactly what the AI gets
    
    console.log(`\n==============================`);
    console.log(` PARSED FILE: ${filePart.filename || "Unknown"}`);
    console.log(`  METHOD: ${extractedData.method}`);
    console.log(` EXTRACTED TEXT:\n${extractedData.text.substring(0, 500)}${extractedData.text.length > 500 ? "\n\n...[TRUNCATED IN CONSOLE]..." : ""}`);
    console.log(`==============================\n`);

    return extractedData;

  } catch (error) {
    console.error(`Parsing error for ${filePart.filename}:`, error);
    throw error;
  }
}