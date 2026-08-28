import { useState, useCallback } from "react";
import type { FileUIPart } from "ai";
import { extractTextFromFilePart } from "@/lib/ai/file-parser";

export type ParseStatus = "idle" | "parsing" | "done" | "error";

export type ParsedAttachment = {
  fileId: string;
  status: ParseStatus;
  extractedText?: string;
  method?: string;
  filename?:string;
  error?: string;
};

export function useFileParser() {
  const [state, setState] = useState<Map<string, ParsedAttachment>>(new Map());

  const parse = useCallback(async (
    fileId: string,
    filePart: FileUIPart  // pass the FileUIPart directly
  ) => {
    setState(prev => new Map(prev).set(fileId, { fileId, status: "parsing" }));

    try {
      const result = await extractTextFromFilePart(
        {
            url:filePart.url,
            mediaType:filePart.mediaType,
            filename:filePart.filename
        }
      );

      setState(prev => new Map(prev).set(fileId, {
        fileId,
        status: "done",
        extractedText: result.text,
        method: result.method,
        filename:filePart.filename
      }));

    } catch (err: any) {
      setState(prev => new Map(prev).set(fileId, {
        fileId,
        status: "error",
        error: err.message ?? "Could not read file",
      }));
    }
  }, []);

  const remove = useCallback((fileId: string) => {
    setState(prev => { const n = new Map(prev); n.delete(fileId); return n; });
  }, []);

  const clear = useCallback(() => setState(new Map()), []);

  const isParsing = [...state.values()].some(f => f.status === "parsing");
  const hasErrors = [...state.values()].some(f => f.status === "error");

  const buildContext = useCallback((): string => {
    return [...state.values()]
      .filter(f => f.status === "done" && f.extractedText)
      .map(f => `--- File: ${f.fileId} name${f.filename}---\n${f.extractedText}`)
      .join("\n\n");
  }, [state]);

  return { state, parse, remove, clear, isParsing, hasErrors, buildContext };
}