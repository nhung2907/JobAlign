import { parseJdHeuristic } from "./extract/jd-heuristic";
import { SAMPLE_JDS } from "./samples";
import type { Job, JobExtraction } from "./schema";
import { contentHash, uid } from "./text";

export function makeJob(
  extraction: JobExtraction,
  opts: { rawText: string; source: Job["source"]; url?: string | null; extractedBy: Job["extractedBy"]; createdAt?: string },
): Job {
  const at = opts.createdAt ?? new Date().toISOString();
  return {
    ...extraction,
    id: uid("job"),
    source: opts.source,
    url: opts.url ?? null,
    rawText: opts.rawText,
    contentHash: contentHash(opts.rawText),
    extractedBy: opts.extractedBy,
    editedAt: null,
    saved: false,
    suggestions: {},
    scoreHistory: [],
    createdAt: at,
    updatedAt: at,
  };
}

/** 5 JD mẫu, bóc tách bằng bộ quy tắc để kết quả luôn giống nhau. */
export function sampleJobs(now = new Date()): Job[] {
  return SAMPLE_JDS.map((s) => {
    const createdAt = new Date(now.getTime() - s.daysAgo * 86_400_000).toISOString();
    const job = makeJob(parseJdHeuristic(s.text, { title: s.title, company: s.company }), {
      rawText: s.text,
      source: "sample",
      extractedBy: "heuristic",
      createdAt,
    });
    return { ...job, saved: s.daysAgo === 0 ? false : true };
  });
}
