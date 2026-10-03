import "server-only";
import { extractCvWithGemini, extractJdWithGemini, GeminiError, geminiAvailable } from "../extract/gemini";
import { parseCvHeuristic } from "../extract/cv-heuristic";
import { parseJdHeuristic } from "../extract/jd-heuristic";
import type { CvExtraction, JobExtraction } from "../schema";
import { contentHash } from "../text";

export interface JdAnalysis {
  extraction: JobExtraction;
  extractedBy: "gemini" | "heuristic";
  contentHash: string;
  /** Có giá trị khi Gemini lỗi và đã chuyển sang bộ đọc dự phòng (NFR-8). */
  warning: string | null;
  cached: boolean;
}

/** Mỗi JD chỉ gọi LLM một lần (NFR-2): cache theo hash nội dung trong instance server. */
const cache = new Map<string, Omit<JdAnalysis, "cached">>();
const CACHE_LIMIT = 300;

export async function analyzeJdText(text: string, hints: { title?: string; company?: string }): Promise<JdAnalysis> {
  const hash = contentHash(text);
  const hit = cache.get(hash);
  if (hit) {
    const extraction = { ...hit.extraction, title: hints.title?.trim() || hit.extraction.title, company: hints.company?.trim() || hit.extraction.company };
    return { ...hit, extraction, cached: true };
  }
  let result: Omit<JdAnalysis, "cached">;
  if (geminiAvailable()) {
    try {
      result = { extraction: await extractJdWithGemini(text, hints), extractedBy: "gemini", contentHash: hash, warning: null };
    } catch (e) {
      result = {
        extraction: parseJdHeuristic(text, hints),
        extractedBy: "heuristic",
        contentHash: hash,
        warning: `${e instanceof GeminiError ? e.message : "Gemini lỗi."} Đã dùng bộ đọc dự phòng — hãy kiểm tra và sửa kết quả bóc tách.`,
      };
    }
  } else {
    result = { extraction: parseJdHeuristic(text, hints), extractedBy: "heuristic", contentHash: hash, warning: null };
  }
  // Chỉ cache kết quả của Gemini: bộ quy tắc chạy lại luôn ra cùng kết quả và không tốn chi phí.
  if (result.extractedBy === "gemini") {
    if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value!);
    cache.set(hash, result);
  }
  return { ...result, cached: false };
}

export async function analyzeCvText(text: string): Promise<{ cv: CvExtraction; parser: "gemini" | "heuristic"; warning: string | null }> {
  if (geminiAvailable()) {
    try {
      return { cv: await extractCvWithGemini(text), parser: "gemini", warning: null };
    } catch (e) {
      return {
        cv: parseCvHeuristic(text),
        parser: "heuristic",
        warning: `${e instanceof GeminiError ? e.message : "Gemini lỗi."} Đã dùng bộ đọc dự phòng — hãy kiểm tra kỹ từng mục.`,
      };
    }
  }
  return { cv: parseCvHeuristic(text), parser: "heuristic", warning: null };
}
